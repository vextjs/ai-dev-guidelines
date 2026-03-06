# Phase 1 — BlogService 完整实现

> **文件路径**: `app/service/blog/BlogService.ts`
> **操作**: 新建
> **所属阶段**: Phase 1（业务层）
> **依赖**: Phase 0（Model + DSL 就绪）
> **关联**: [README.md](./README.md) → §3.2 / §4 Phase 1

---

## 说明

BlogService 是 Blog 模块的核心业务层，负责全部 CRUD 逻辑、权限校验、缓存管理和游标分页查询。

**设计要点**：

- 继承 Egg.js `Service` 基类（不继承项目旧的 `MongoDataModel`，Blog 为新模块直接使用 `ctx.msq` + `ctx.model`）
- **读写分离**：查询使用 `ctx.msq.collection('blogs')`（monSQLize），写入使用 `ctx.model.Blog`（Mongoose）
- **缓存管理**：写操作完成后统一调用 `ctx.msq.collection('blogs').invalidateCache()`
- **游标分页**：列表接口使用 `findPage()`，返回 `{ items, pageInfo, totals }` 原生结构
- **view_count 异步更新**：详情接口中 view_count +1 采用 fire-and-forget，不 await、不调用 invalidateCache
- **错误处理**：业务错误用 `ctx.dsl.error.throw()`（try 块），系统错误用 `throw ctx.dsl.error.create()`（catch 块）
- **权限校验**：更新/删除操作在 Service 层校验 `author_id === userId`

**方法清单**：

| 方法 | 类型 | 数据访问 | 说明 |
|------|:----:|:-------:|------|
| `createBlog(form, authorId)` | 公开 | `ctx.model` | 创建文章 + invalidateCache |
| `getBlogList(params)` | 公开 | `ctx.msq` findPage | 公开列表（游标分页，cache 60s） |
| `getBlogDetail(blogId, userId?)` | 公开 | `ctx.msq` findOne | 详情（cache 120s）+ 异步 view_count |
| `updateBlog(blogId, form, userId)` | 公开 | `ctx.model` | 更新 + 权限校验 + invalidateCache |
| `deleteBlog(blogId, userId)` | 公开 | `ctx.model` | 软删除 + 权限校验 + invalidateCache |
| `adminGetBlogList(params)` | 公开 | `ctx.msq` findPage | 管理列表（无缓存） |
| `adminUpdateBlogStatus(blogId, status)` | 公开 | `ctx.model` | 管理上下架 + invalidateCache |
| `_buildListFilter(params)` | 内部 | — | 构建 filter（含 keyword 正则转义） |
| `_autoSummary(content)` | 内部 | — | 截取 content 前 200 字符 |

---

## 完整代码

```typescript
// app/service/blog/BlogService.ts

import { Service } from 'egg';

export default class BlogService extends Service {

    // ============================================================
    // 公开方法
    // ============================================================

    /**
     * 创建文章
     *
     * - 校验 tags 数量（≤ 10）
     * - 自动生成 summary（如未填写）
     * - status=published 时写入 published_at
     * - 写入后调用 invalidateCache
     */
    async createBlog(form: any, authorId: string) {
        const { ctx } = this;
        try {
            // 业务校验：tags 数量
            if (form.tags && form.tags.length > 10) {
                ctx.dsl.error.throw('BLOG_TAGS_LIMIT');
            }

            // 自动摘要
            form.summary = form.summary || this._autoSummary(form.content);

            const now = new Date();
            const doc = {
                ...form,
                author_id: authorId,
                view_count: 0,
                del_flag: 0,
                published_at: form.status === 'published' ? now : null,
                created_at: now,
                updated_at: now,
            };

            const result = await ctx.model.Blog.create(doc);

            // 写操作后失效缓存
            await ctx.msq.collection('blogs').invalidateCache();

            return result;
        } catch (error: any) {
            // 业务错误直接抛出（已有 code 属性）
            if (error.code) throw error;
            // 系统错误包装
            ctx.logger.error('[BlogService] createBlog failed', { authorId, error });
            throw ctx.dsl.error.create('BLOG_CREATE_FAILED');
        }
    }

    /**
     * 公开文章列表（游标分页）
     *
     * - 固定过滤：status=published, del_flag=0
     * - 支持 keyword（模糊匹配 title + summary）、tag（精确）、author_id
     * - 排序：published_at 降序
     * - 缓存 60s
     * - 列表不返回 content 字段（通过 pipeline $project 排除）
     */
    async getBlogList(params: any) {
        const { ctx } = this;
        try {
            const filter = this._buildListFilter({
                ...params,
                status: 'published',
                del_flag: 0,
            });

            const result = await ctx.msq.collection('blogs').findPage({
                query: filter,
                sort: { published_at: -1 },
                limit: params.limit || 20,
                after: params.after,
                before: params.before,
                totals: { mode: 'async' },
                cache: 60000,
                pipeline: [
                    { $project: { content: 0 } },
                ],
            });

            return result; // { items, pageInfo, totals }
        } catch (error: any) {
            if (error.code) throw error;
            ctx.logger.error('[BlogService] getBlogList failed', { params, error });
            throw ctx.dsl.error.create('BLOG_LIST_FAILED');
        }
    }

    /**
     * 文章详情
     *
     * - 默认只返回 status=published, del_flag=0 的文章
     * - 如果传入 userId 且匹配 author_id，则允许查看自己的草稿
     * - 缓存 120s
     * - 异步 view_count +1（不 await，不 invalidateCache）
     */
    async getBlogDetail(blogId: string, userId?: string) {
        const { ctx } = this;
        try {
            // 先尝试查询已发布文章
            let blog = await ctx.msq.collection('blogs').findOne(
                { _id: blogId, status: 'published', del_flag: 0 },
                { cache: 120000 }
            );

            // 未找到已发布文章时，尝试查找作者自己的草稿
            if (!blog && userId) {
                blog = await ctx.msq.collection('blogs').findOne(
                    { _id: blogId, author_id: userId, del_flag: 0 },
                    { cache: 120000 }
                );
            }

            if (!blog) {
                ctx.dsl.error.throw('BLOG_NOT_FOUND');
            }

            // 非作者访问草稿 → 404（不暴露草稿存在）
            if (blog.status === 'draft') {
                if (!userId || blog.author_id.toString() !== userId.toString()) {
                    ctx.dsl.error.throw('BLOG_NOT_FOUND');
                }
            }

            // 异步更新 view_count（fire-and-forget，不触发缓存失效）
            ctx.model.Blog.updateOne(
                { _id: blogId },
                { $inc: { view_count: 1 } }
            ).catch((err: any) => {
                ctx.logger.error('[BlogService] view_count update failed', { blogId, err });
            });

            return blog;
        } catch (error: any) {
            if (error.code) throw error;
            ctx.logger.error('[BlogService] getBlogDetail failed', { blogId, error });
            throw ctx.dsl.error.create('BLOG_QUERY_FAILED');
        }
    }

    /**
     * 更新文章
     *
     * - 校验文章存在性 + 作者权限
     * - 校验 tags 数量（≤ 10）
     * - 处理 draft→published 状态变更（写入 published_at）
     * - 更新后调用 invalidateCache
     */
    async updateBlog(blogId: string, form: any, userId: string) {
        const { ctx } = this;
        try {
            // 查询文章（含已删除检查）
            const doc = await ctx.msq.collection('blogs').findOne(
                { _id: blogId, del_flag: 0 },
                { cache: 60000 }
            );

            if (!doc) {
                ctx.dsl.error.throw('BLOG_NOT_FOUND');
            }

            // 权限校验：仅作者可修改
            if (doc.author_id.toString() !== userId.toString()) {
                ctx.dsl.error.throw('BLOG_FORBIDDEN');
            }

            // 业务校验：tags 数量
            if (form.tags && form.tags.length > 10) {
                ctx.dsl.error.throw('BLOG_TAGS_LIMIT');
            }

            // 状态变更处理：draft → published 且首次发布
            if (form.status === 'published' && doc.status === 'draft' && !doc.published_at) {
                form.published_at = new Date();
            }

            // 自动刷新 updated_at
            form.updated_at = new Date();

            const result = await ctx.model.Blog.findOneAndUpdate(
                { _id: blogId },
                { $set: form },
                { new: true }
            );

            // 写操作后失效缓存
            await ctx.msq.collection('blogs').invalidateCache();

            return result;
        } catch (error: any) {
            if (error.code) throw error;
            ctx.logger.error('[BlogService] updateBlog failed', { blogId, error });
            throw ctx.dsl.error.create('BLOG_UPDATE_FAILED');
        }
    }

    /**
     * 软删除文章
     *
     * - 校验文章存在性
     * - 已删除文章幂等返回成功
     * - 校验作者权限
     * - 设置 del_flag=1 + deleted_at
     * - 删除后调用 invalidateCache
     */
    async deleteBlog(blogId: string, userId: string) {
        const { ctx } = this;
        try {
            const doc = await ctx.msq.collection('blogs').findOne(
                { _id: blogId },
                { cache: 60000 }
            );

            if (!doc) {
                ctx.dsl.error.throw('BLOG_NOT_FOUND');
            }

            // 幂等处理：已删除的文章直接返回成功
            if (doc.del_flag === 1) {
                return { success: true };
            }

            // 权限校验：仅作者可删除
            if (doc.author_id.toString() !== userId.toString()) {
                ctx.dsl.error.throw('BLOG_FORBIDDEN');
            }

            const now = new Date();
            await ctx.model.Blog.updateOne(
                { _id: blogId },
                {
                    $set: {
                        del_flag: 1,
                        deleted_at: now,
                        updated_at: now,
                    },
                }
            );

            // 写操作后失效缓存
            await ctx.msq.collection('blogs').invalidateCache();

            return { success: true };
        } catch (error: any) {
            if (error.code) throw error;
            ctx.logger.error('[BlogService] deleteBlog failed', { blogId, error });
            throw ctx.dsl.error.create('BLOG_DELETE_FAILED');
        }
    }

    /**
     * 管理员文章列表（游标分页）
     *
     * - 不固定过滤 status 和 del_flag（由查询参数决定）
     * - 支持 status、del_flag、author_id、keyword 过滤
     * - 排序：created_at 降序
     * - 不启用缓存（管理端需要实时数据）
     * - totals 使用 sync 模式（管理端需要准确总数）
     */
    async adminGetBlogList(params: any) {
        const { ctx } = this;
        try {
            const filter = this._buildListFilter(params);

            const result = await ctx.msq.collection('blogs').findPage({
                query: filter,
                sort: { created_at: -1 },
                limit: params.limit || 20,
                after: params.after,
                before: params.before,
                totals: { mode: 'sync' },
                // 不设置 cache — 管理端需要实时数据
            });

            return result; // { items, pageInfo, totals }
        } catch (error: any) {
            if (error.code) throw error;
            ctx.logger.error('[BlogService] adminGetBlogList failed', { params, error });
            throw ctx.dsl.error.create('BLOG_LIST_FAILED');
        }
    }

    /**
     * 管理员强制修改文章状态（上架/下架）
     *
     * - 不校验作者权限（管理员可操作任意文章）
     * - draft→published 且首次发布时写入 published_at
     * - 更新后调用 invalidateCache
     */
    async adminUpdateBlogStatus(blogId: string, status: string) {
        const { ctx } = this;
        try {
            const doc = await ctx.msq.collection('blogs').findOne(
                { _id: blogId },
                { cache: 60000 }
            );

            if (!doc) {
                ctx.dsl.error.throw('BLOG_NOT_FOUND');
            }

            const updateFields: any = {
                status,
                updated_at: new Date(),
            };

            // draft → published 且从未发布过
            if (status === 'published' && doc.status === 'draft' && !doc.published_at) {
                updateFields.published_at = new Date();
            }

            await ctx.model.Blog.updateOne(
                { _id: blogId },
                { $set: updateFields }
            );

            // 写操作后失效缓存
            await ctx.msq.collection('blogs').invalidateCache();

            return { success: true };
        } catch (error: any) {
            if (error.code) throw error;
            ctx.logger.error('[BlogService] adminUpdateBlogStatus failed', { blogId, status, error });
            throw ctx.dsl.error.create('BLOG_UPDATE_FAILED');
        }
    }

    // ============================================================
    // 内部辅助方法
    // ============================================================

    /**
     * 构建列表查询 filter 对象
     *
     * - keyword：同时模糊匹配 title + summary（正则转义防注入）
     * - tag：精确匹配 tags 数组字段
     * - author_id：精确匹配
     * - status：精确匹配（公开列表固定 published，管理端由参数决定）
     * - del_flag：精确匹配（公开列表固定 0，管理端由参数决定）
     */
    private _buildListFilter(params: any): Record<string, any> {
        const filter: Record<string, any> = {};

        // 状态过滤
        if (params.status !== undefined) {
            filter.status = params.status;
        }

        // 软删除过滤
        if (params.del_flag !== undefined) {
            filter.del_flag = params.del_flag;
        }

        // 作者过滤
        if (params.author_id) {
            filter.author_id = params.author_id;
        }

        // 标签精确过滤
        if (params.tag) {
            filter.tags = params.tag;
        }

        // 关键词模糊匹配（同时匹配 title + summary）
        if (params.keyword) {
            // 正则转义：防止用户输入正则特殊字符导致注入
            const escaped = params.keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(escaped, 'i');
            filter.$or = [
                { title: regex },
                { summary: regex },
            ];
        }

        return filter;
    }

    /**
     * 自动生成摘要
     *
     * 截取 content 前 200 个字符作为摘要
     */
    private _autoSummary(content: string): string {
        if (!content) return '';
        return content.slice(0, 200);
    }
}
```

---

## 关键实现说明

### 1. 读写分离模式

```
查询（ctx.msq — monSQLize）           写入（ctx.model — Mongoose）
├── findPage() → 列表游标分页          ├── create() → 创建文章
├── findOne()  → 详情/存在性查询       ├── findOneAndUpdate() → 更新文章
└── cache 参数控制缓存 TTL             ├── updateOne() → 软删除/状态变更/view_count
                                       └── 写入完成后 → invalidateCache()
```

> ⚠️ `ctx.model.Blog` 的写操作**不会**自动触发 monSQLize 缓存失效，
> 必须在每次写操作后手动调用 `ctx.msq.collection('blogs').invalidateCache()`。

### 2. view_count 异步更新策略

```
getBlogDetail() 执行流程：
  1. ctx.msq.findOne() → 查询文章（走缓存）
  2. 返回 blog 给 Controller
  3. ctx.model.Blog.updateOne({ $inc: { view_count: 1 } }) ← 异步，不 await
     └── .catch() → 仅记录日志，不影响响应

为什么不调用 invalidateCache：
  - view_count 更新频率高（每次访问都 +1）
  - 调用 invalidateCache 会导致缓存频繁失效（缓存抖动）
  - 允许缓存期间内 view_count 值偏差（最终一致，最多 120s 延迟）
```

### 3. 错误处理模式

```
Service 层统一模式：

try {
    // 业务校验 → ctx.dsl.error.throw('BLOG_XXX')
    // 正常逻辑
} catch (error: any) {
    if (error.code) throw error;              // 业务错误直接抛出
    ctx.logger.error('[BlogService] ...', {});  // 记录系统错误日志
    throw ctx.dsl.error.create('BLOG_XXX_FAILED'); // 系统错误包装
}

关键区别：
  - ctx.dsl.error.throw()  → 在 try 块中使用，主动抛出业务错误
  - ctx.dsl.error.create() → 在 catch 块中使用，包装系统错误
  - 通过 error.code 判断是否为业务错误（已有 code 属性的直接 re-throw）
```

### 4. findPage 调用参数详解

```
ctx.msq.collection('blogs').findPage({
    query: filter,             // 查询条件（filter 对象）
    sort: { published_at: -1 },// 排序（findPage 自动追加 _id 确保稳定排序）
    limit: 20,                 // 每页条数
    after: 'cursor_string',    // 游标：获取此游标之后的数据（下一页）
    before: 'cursor_string',   // 游标：获取此游标之前的数据（上一页）
    totals: { mode: 'async' }, // 总数统计模式（async=异步/sync=同步）
    cache: 60000,              // 缓存 TTL（毫秒）
    pipeline: [                // 聚合管道（可选，用于字段投影等）
        { $project: { content: 0 } }
    ],
});

返回值结构：
{
    items: [...],                    // 当页数据
    pageInfo: {
        hasNext: boolean,            // 是否有下一页
        hasPrev: boolean,            // 是否有上一页
        startCursor: string,         // 当页第一条数据的游标
        endCursor: string,           // 当页最后一条数据的游标
    },
    totals: {                        // 总数统计（async 模式首次可能为 null）
        mode: 'async' | 'sync',
        total: number | null,
        totalPages: number | null,
        ts: number,
    },
}
```

### 5. 软删除幂等处理

```
deleteBlog() 幂等逻辑：

1. 查询文章（不限 del_flag，查全量）
2. 文章不存在 → BLOG_NOT_FOUND
3. del_flag === 1（已删除） → 直接返回 { success: true }（幂等）
4. author_id !== userId → BLOG_FORBIDDEN
5. 执行软删除（del_flag=1, deleted_at, updated_at）
6. invalidateCache()
7. 返回 { success: true }
```

---

## Egg.js Service 自动挂载

文件位于 `app/service/blog/BlogService.ts`，Egg.js 按目录结构自动挂载到：

```
ctx.service.blog.blogService
```

Controller 中调用示例：

```typescript
const result = await ctx.service.blog.blogService.createBlog(form, userId);
const list = await ctx.service.blog.blogService.getBlogList(params);
const detail = await ctx.service.blog.blogService.getBlogDetail(blogId, userId);
```

> **注意命名映射**：Egg.js 对 Service 文件名使用驼峰转换。
> `BlogService.ts` → `ctx.service.blog.blogService`（首字母小写）。

---

## 验证要点

- [ ] `ctx.service.blog.blogService` 可正常访问（Egg.js 自动挂载正确）
- [ ] `createBlog` → tags 超过 10 个时抛出 `BLOG_TAGS_LIMIT`（40303）
- [ ] `createBlog` → summary 不填时自动截取 content 前 200 字符
- [ ] `createBlog` → status=published 时 published_at 有值
- [ ] `createBlog` → 写入成功后 invalidateCache 被调用
- [ ] `getBlogList` → 返回 `{ items, pageInfo, totals }` 结构
- [ ] `getBlogList` → items 中不包含 content 字段
- [ ] `getBlogList` → keyword 含正则特殊字符时不报错
- [ ] `getBlogDetail` → 已发布文章正常返回
- [ ] `getBlogDetail` → 草稿文章非作者访问返回 `BLOG_NOT_FOUND`
- [ ] `getBlogDetail` → view_count 异步 +1，不阻塞响应
- [ ] `updateBlog` → 非作者操作返回 `BLOG_FORBIDDEN`（40302）
- [ ] `updateBlog` → draft→published 首次发布写入 published_at
- [ ] `deleteBlog` → 已删除文章幂等返回 `{ success: true }`
- [ ] `deleteBlog` → 非作者操作返回 `BLOG_FORBIDDEN`（40302）
- [ ] `adminGetBlogList` → 返回全量文章（含草稿、已删除）
- [ ] `adminGetBlogList` → 不使用缓存
- [ ] `adminUpdateBlogStatus` → 不校验作者权限
- [ ] 所有 catch 块正确判断 `error.code` 并 re-throw 业务错误

---

**文档版本**: v1.0
**最后更新**: 2026-03-06
**Agent**: zed-copilot