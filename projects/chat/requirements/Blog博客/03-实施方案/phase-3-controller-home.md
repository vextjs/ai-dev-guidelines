# Phase 3 — Home BlogController + BlogAdminController 完整实现

> **所属阶段**: Phase 3（用户端 + 管理端接口层）
> **操作**: 新建 2 个文件
> **依赖**: Phase 1（BlogService 就绪）
> **关联**: [README.md](./README.md) → §3.4 / §4 Phase 3

---

## 说明

Phase 3 包含两个 Controller 文件：

| # | 文件路径 | 鉴权 | 方法 |
|:-:|---------|:----:|------|
| 1 | `app/controller/home/BlogController.ts` | `userAuth({ level: 'basic' })` | `create()` / `update()` / `delete()` |
| 2 | `app/controller/home/BlogAdminController.ts` | `dbToken()` | `index()` / `updateStatus()` |

**设计要点**：

- 参数校验使用 `ctx.dsl()` + `ctx.validateDsl()` **内联完成**，不创建独立 Validator 文件
- Controller 层**不包含 try-catch**（由 `exceptions` 中间件统一捕获处理）
- Controller 层**不包含业务判断**（权限校验、存在性检查、tags 数量校验均在 Service 层）
- 响应统一使用 `ctx.success()`
- 用户 ID 通过 `ctx.state.user._id` 获取（`userAuth` 中间件注入）
- 管理端使用 `dbToken` 中间件鉴权（不依赖 `ctx.state.user`）
- `update()` 方法需要同时校验 params（`blogId`）和 body（可选字段），分两次 `validateDsl`

---

## 文件 1：`app/controller/home/BlogController.ts`（新建）

### 方法清单

| 方法 | 路由 | HTTP | 内联校验来源 | 说明 |
|------|------|:----:|:-----------:|------|
| `create()` | `/home/blog` | POST | body | 创建文章（草稿/发布） |
| `update()` | `/home/blog/:blogId` | PUT | params + body | 更新文章（仅作者可操作，Service 层校验） |
| `delete()` | `/home/blog/:blogId` | DELETE | params | 软删除文章（仅作者可操作，Service 层校验） |

### 完整代码

```typescript
// app/controller/home/BlogController.ts

import { Controller } from 'egg';

export default class BlogController extends Controller {

    /**
     * 创建文章
     *
     * POST /home/blog
     * 鉴权：userAuth({ level: 'basic' })
     *
     * body 参数：
     * - title: string (1-200, 必填) — 文章标题
     * - content: string (1-50000, 必填) — 文章正文
     * - summary?: string (0-500) — 摘要，不填则 Service 层自动截取 content 前 200 字符
     * - cover_image?: url — 封面图 URL
     * - tags?: array — 标签数组（Service 层校验 ≤ 10 个）
     * - status?: string — 'draft'（默认）或 'published'
     *
     * 响应：{ code: 0, data: { _id, title, content, summary, ... } }
     */
    async create() {
        const { ctx } = this;

        // 内联参数校验
        const schema = ctx.dsl({
            title: 'string:1-200!',
            content: 'string:1-50000!',
            summary: 'string:0-500',
            cover_image: 'url',
            tags: 'array',
            status: 'string',
        });
        await ctx.validateDsl(schema, 'body');

        // 获取校验通过后的参数和当前用户 ID
        const form = ctx.state.form;
        const userId = ctx.state.user._id;

        // 调用 Service
        const result = await ctx.service.blog.blogService.createBlog(form, userId);

        // 统一成功响应
        ctx.success(result);
    }

    /**
     * 更新文章
     *
     * PUT /home/blog/:blogId
     * 鉴权：userAuth({ level: 'basic' })
     *
     * params 参数：
     * - blogId: objectId (必填) — 文章 ID
     *
     * body 参数（全部可选，仅更新传入的字段）：
     * - title?: string (1-200) — 文章标题
     * - content?: string (1-50000) — 文章正文
     * - summary?: string (0-500) — 摘要
     * - cover_image?: url — 封面图 URL
     * - tags?: array — 标签数组（Service 层校验 ≤ 10 个）
     * - status?: string — 'draft' 或 'published'
     *
     * 响应：{ code: 0, data: { _id, title, status, published_at, updated_at } }
     *
     * 说明：
     * - 仅文章作者可更新（Service 层校验 author_id === userId）
     * - draft → published 且首次发布时自动写入 published_at
     */
    async update() {
        const { ctx } = this;

        // 路径参数校验
        const paramsSchema = ctx.dsl({
            blogId: 'objectId!',
        });
        await ctx.validateDsl(paramsSchema, 'params');

        // 请求体校验（所有字段可选）
        const bodySchema = ctx.dsl({
            title: 'string:1-200',
            content: 'string:1-50000',
            summary: 'string:0-500',
            cover_image: 'url',
            tags: 'array',
            status: 'string',
        });
        await ctx.validateDsl(bodySchema, 'body');

        const blogId = ctx.params.blogId;
        const form = ctx.state.form;
        const userId = ctx.state.user._id;

        // 调用 Service（权限校验在 Service 层）
        const result = await ctx.service.blog.blogService.updateBlog(blogId, form, userId);

        // 统一成功响应
        ctx.success(result);
    }

    /**
     * 删除文章（软删除）
     *
     * DELETE /home/blog/:blogId
     * 鉴权：userAuth({ level: 'basic' })
     *
     * params 参数：
     * - blogId: objectId (必填) — 文章 ID
     *
     * 响应：{ code: 0, data: { success: true } }
     *
     * 说明：
     * - 仅文章作者可删除（Service 层校验 author_id === userId）
     * - 已删除文章重复调用时幂等返回成功
     */
    async delete() {
        const { ctx } = this;

        // 内联参数校验
        const schema = ctx.dsl({
            blogId: 'objectId!',
        });
        await ctx.validateDsl(schema, 'params');

        const blogId = ctx.params.blogId;
        const userId = ctx.state.user._id;

        // 调用 Service（权限校验在 Service 层）
        const result = await ctx.service.blog.blogService.deleteBlog(blogId, userId);

        // 统一成功响应
        ctx.success(result);
    }
}
```

---

## 文件 2：`app/controller/home/BlogAdminController.ts`（新建）

### 方法清单

| 方法 | 路由 | HTTP | 内联校验来源 | 说明 |
|------|------|:----:|:-----------:|------|
| `index()` | `/home/blog/admin/list` | GET | query | 管理员文章列表（游标分页，全量数据） |
| `updateStatus()` | `/home/blog/admin/:blogId/status` | PUT | params + body | 管理员强制上下架 |

### 完整代码

```typescript
// app/controller/home/BlogAdminController.ts

import { Controller } from 'egg';

export default class BlogAdminController extends Controller {

    /**
     * 管理员文章列表（游标分页）
     *
     * GET /home/blog/admin/list
     * 鉴权：dbToken()
     *
     * query 参数：
     * - limit?: int (1-100, 默认 20) — 每页条数
     * - after?: string — 游标值，获取该游标之后的数据（下一页）
     * - before?: string — 游标值，获取该游标之前的数据（上一页）
     * - status?: string — 按状态过滤（draft / published，不传则返回全部）
     * - del_flag?: int (0-1) — 按删除状态过滤（不传则返回全部）
     * - author_id?: objectId — 按作者 ID 过滤
     * - keyword?: string (0-100) — 标题关键词搜索
     *
     * 响应：{ code: 0, data: { items, pageInfo, totals } }
     *
     * 说明：
     * - 返回全量文章（含草稿、已删除），由查询参数控制过滤
     * - 不启用缓存（管理端需要实时数据）
     * - totals 使用 sync 模式（准确总数）
     */
    async index() {
        const { ctx } = this;

        // 内联参数校验
        const schema = ctx.dsl({
            limit: 'int:1-100',
            after: 'string',
            before: 'string',
            status: 'string',
            del_flag: 'int:0-1',
            author_id: 'objectId',
            keyword: 'string:0-100',
        });
        await ctx.validateDsl(schema, 'query');

        // 调用 Service
        const result = await ctx.service.blog.blogService.adminGetBlogList(ctx.state.form);

        // 统一成功响应
        ctx.success(result);
    }

    /**
     * 管理员强制修改文章状态（上架/下架）
     *
     * PUT /home/blog/admin/:blogId/status
     * 鉴权：dbToken()
     *
     * params 参数：
     * - blogId: objectId (必填) — 文章 ID
     *
     * body 参数：
     * - status: string (必填) — 目标状态：'published' 或 'draft'
     *
     * 响应：{ code: 0, data: { success: true } }
     *
     * 说明：
     * - 管理员可操作任意文章，不校验作者权限
     * - draft → published 且从未发布过时自动写入 published_at
     */
    async updateStatus() {
        const { ctx } = this;

        // 路径参数校验
        const paramsSchema = ctx.dsl({
            blogId: 'objectId!',
        });
        await ctx.validateDsl(paramsSchema, 'params');

        // 请求体校验
        const bodySchema = ctx.dsl({
            status: 'string!',
        });
        await ctx.validateDsl(bodySchema, 'body');

        const blogId = ctx.params.blogId;
        const { status } = ctx.state.form;

        // 调用 Service（管理员不校验作者权限）
        const result = await ctx.service.blog.blogService.adminUpdateBlogStatus(blogId, status);

        // 统一成功响应
        ctx.success(result);
    }
}
```

---

## 内联校验规则汇总

### Home BlogController

#### create() — body 校验

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `title` | `string:1-200!` | ✅ 是 | 文章标题，1-200 字符 |
| `content` | `string:1-50000!` | ✅ 是 | 文章正文，1-50000 字符 |
| `summary` | `string:0-500` | 否 | 文章摘要，0-500 字符 |
| `cover_image` | `url` | 否 | 封面图 URL 格式校验 |
| `tags` | `array` | 否 | 数组格式校验（数量由 Service 层校验 ≤ 10） |
| `status` | `string` | 否 | 字符串格式校验（枚举由 Service/Model 层限制） |

#### update() — params + body 双重校验

**params 校验**：

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `blogId` | `objectId!` | ✅ 是 | MongoDB ObjectId 格式 |

**body 校验**（全部可选）：

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `title` | `string:1-200` | 否 | 与 create 相同但非必填 |
| `content` | `string:1-50000` | 否 | 与 create 相同但非必填 |
| `summary` | `string:0-500` | 否 | — |
| `cover_image` | `url` | 否 | — |
| `tags` | `array` | 否 | — |
| `status` | `string` | 否 | — |

> **双重 validateDsl 说明**：`update()` 方法需要同时从 params 中提取 `blogId` 和从 body 中提取可选更新字段。
> 两次 `validateDsl` 调用的结果会**合并**写入 `ctx.state.form`，第二次调用不会覆盖第一次的结果。
> 但由于 `blogId` 来自路由路径，Controller 中直接使用 `ctx.params.blogId` 获取更清晰。

#### delete() — params 校验

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `blogId` | `objectId!` | ✅ 是 | MongoDB ObjectId 格式 |

### BlogAdminController

#### index() — query 校验

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `limit` | `int:1-100` | 否 | 管理端每页最大 100（公开端最大 50） |
| `after` | `string` | 否 | 游标值 |
| `before` | `string` | 否 | 游标值（与 after 互斥） |
| `status` | `string` | 否 | 按状态过滤（不传返回全部） |
| `del_flag` | `int:0-1` | 否 | 按删除状态过滤（不传返回全部） |
| `author_id` | `objectId` | 否 | 按作者 ID 过滤 |
| `keyword` | `string:0-100` | 否 | 标题关键词搜索 |

#### updateStatus() — params + body 双重校验

**params 校验**：

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `blogId` | `objectId!` | ✅ 是 | MongoDB ObjectId 格式 |

**body 校验**：

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `status` | `string!` | ✅ 是 | 目标状态：`published` 或 `draft` |

---

## 鉴权差异对比

| 对比项 | Home BlogController | BlogAdminController |
|--------|:-------------------:|:-------------------:|
| 鉴权中间件 | `userAuth({ level: 'basic' })` | `dbToken()` |
| `ctx.state.user` | ✅ 可用（JWT 解析后注入） | ❌ 不可用（dbToken 不注入用户信息） |
| 用户 ID 获取 | `ctx.state.user._id` | 不需要（管理员操作不关联用户） |
| 权限校验 | Service 层校验 `author_id === userId` | Service 层**不校验**作者权限 |
| 操作范围 | 仅操作自己的文章 | 可操作任意文章 |
| 路由前缀 | `/home/blog` | `/home/blog/admin` |

> **关键区别**：Home BlogController 的三个方法都会将 `userId`（`ctx.state.user._id`）传递给 Service 层，
> Service 层通过比较 `doc.author_id === userId` 进行权限校验。
> BlogAdminController 不传 `userId`，Service 层的管理方法也不执行作者权限校验。

---

## 数据流图

### create() 请求流

```
客户端（携带 JWT）
  │
  ▼
POST /home/blog
  Body: { title: "我的博客", content: "正文...", status: "published" }
  │
  ▼
[userJwt 中间件] — JWT 解析，注入 ctx.state.user
  │
  ▼
[singleLogin 中间件] — 单点登录校验
  │
  ▼
home/BlogController.create()
  │
  ├── 1. ctx.dsl({ title: 'string:1-200!', content: 'string:1-50000!', ... })
  ├── 2. ctx.validateDsl(schema, 'body')
  │      ├── 校验失败 → 自动返回多语言格式校验错误（方法终止）
  │      └── 校验通过 → 参数写入 ctx.state.form
  ├── 3. form = ctx.state.form, userId = ctx.state.user._id
  ├── 4. ctx.service.blog.blogService.createBlog(form, userId)
  │      ├── tags > 10 → BLOG_TAGS_LIMIT (40303)
  │      ├── 自动生成 summary
  │      ├── status=published → 写入 published_at
  │      ├── ctx.model.Blog.create(doc)
  │      └── ctx.msq.collection('blogs').invalidateCache()
  └── 5. ctx.success(result)
         └── → { code: 0, data: { _id, title, content, summary, status, ... } }
```

### update() 请求流

```
客户端（携带 JWT）
  │
  ▼
PUT /home/blog/65f1a2b3c4d5e6f7a8b9c0d1
  Body: { title: "更新后的标题", status: "published" }
  │
  ▼
[userJwt + singleLogin 中间件]
  │
  ▼
home/BlogController.update()
  │
  ├── 1. ctx.validateDsl({ blogId: 'objectId!' }, 'params')
  ├── 2. ctx.validateDsl({ title, content, summary, ... }, 'body')
  ├── 3. blogId = ctx.params.blogId
  ├── 4. form = ctx.state.form, userId = ctx.state.user._id
  ├── 5. ctx.service.blog.blogService.updateBlog(blogId, form, userId)
  │      ├── ctx.msq.findOne({ _id: blogId, del_flag: 0 })
  │      ├── 不存在 → BLOG_NOT_FOUND (40301)
  │      ├── author_id !== userId → BLOG_FORBIDDEN (40302)
  │      ├── tags > 10 → BLOG_TAGS_LIMIT (40303)
  │      ├── draft→published 首次 → 写入 published_at
  │      ├── ctx.model.Blog.findOneAndUpdate(...)
  │      └── ctx.msq.collection('blogs').invalidateCache()
  └── 6. ctx.success(result)
```

### admin/index() 请求流

```
客户端（携带 dbToken）
  │
  ▼
GET /home/blog/admin/list?status=draft&limit=50
  │
  ▼
[dbToken 中间件] — 管理后台 token 校验
  │
  ▼
home/BlogAdminController.index()
  │
  ├── 1. ctx.dsl({ limit: 'int:1-100', status: 'string', del_flag: 'int:0-1', ... })
  ├── 2. ctx.validateDsl(schema, 'query')
  ├── 3. ctx.service.blog.blogService.adminGetBlogList(ctx.state.form)
  │      ├── _buildListFilter({ status: 'draft', limit: 50 })
  │      └── ctx.msq.collection('blogs').findPage({
  │              query: filter,
  │              sort: { created_at: -1 },
  │              totals: { mode: 'sync' },
  │              // 不使用 cache
  │          })
  └── 4. ctx.success(result)
         └── → { code: 0, data: { items, pageInfo, totals } }
```

### admin/updateStatus() 请求流

```
客户端（携带 dbToken）
  │
  ▼
PUT /home/blog/admin/65f1a2b3c4d5e6f7a8b9c0d1/status
  Body: { status: "published" }
  │
  ▼
[dbToken 中间件]
  │
  ▼
home/BlogAdminController.updateStatus()
  │
  ├── 1. ctx.validateDsl({ blogId: 'objectId!' }, 'params')
  ├── 2. ctx.validateDsl({ status: 'string!' }, 'body')
  ├── 3. blogId = ctx.params.blogId, status = ctx.state.form.status
  ├── 4. ctx.service.blog.blogService.adminUpdateBlogStatus(blogId, status)
  │      ├── ctx.msq.findOne({ _id: blogId })
  │      ├── 不存在 → BLOG_NOT_FOUND (40301)
  │      ├── 不校验作者权限（管理员可操作任意文章）
  │      ├── draft→published 且首次 → 写入 published_at
  │      ├── ctx.model.Blog.updateOne(...)
  │      └── ctx.msq.collection('blogs').invalidateCache()
  └── 5. ctx.success(result)
         └── → { code: 0, data: { success: true } }
```

---

## 校验失败响应示例

### Home BlogController

**示例 1 — title 为空**：

```
POST /home/blog
Body: { content: "正文..." }

响应（zh-CN）:
{
    "code": -1,
    "message": "title为必填项"
}
```

**示例 2 — content 超长**：

```
POST /home/blog
Body: { title: "标题", content: "[超过50000字符的内容]" }

响应（zh-CN）:
{
    "code": -1,
    "message": "content长度不能超过50000个字符"
}
```

**示例 3 — blogId 格式不合法**：

```
PUT /home/blog/invalid-id
Body: { title: "新标题" }

响应（zh-CN）:
{
    "code": -1,
    "message": "blogId格式不正确"
}
```

**示例 4 — 非作者操作（Service 层错误）**：

```
PUT /home/blog/65f1a2b3c4d5e6f7a8b9c0d1
Body: { title: "新标题" }

响应（zh-CN）:
{
    "code": 40302,
    "message": "无权操作此文章"
}

响应（en-US）:
{
    "code": 40302,
    "message": "No permission to operate this blog"
}
```

### BlogAdminController

**示例 5 — status 必填缺失**：

```
PUT /home/blog/admin/65f1a2b3c4d5e6f7a8b9c0d1/status
Body: {}

响应（zh-CN）:
{
    "code": -1,
    "message": "status为必填项"
}
```

---

## 与 Open BlogController 的完整对比

| 对比项 | Open BlogController | Home BlogController | BlogAdminController |
|--------|:-------------------:|:-------------------:|:-------------------:|
| 路由前缀 | `/open/blog` | `/home/blog` | `/home/blog/admin` |
| 鉴权 | 无 | `userAuth basic` | `dbToken` |
| 读操作 | `index()` + `detail()` | — | `index()` |
| 写操作 | — | `create()` + `update()` + `delete()` | `updateStatus()` |
| userId 来源 | 不传 | `ctx.state.user._id` | 不传（管理员） |
| 权限校验 | — | Service 层：`author_id === userId` | Service 层：不校验 |
| 缓存 | 列表 60s / 详情 120s | — | 不启用 |
| limit 最大值 | 50 | — | 100 |
| totals 模式 | async | — | sync |
| 过滤条件 | 固定 `published + del_flag=0` | — | 全量（由参数决定） |

---

## Controller 约定检查清单

### Home BlogController

- [x] **无 try-catch**：错误由 `exceptions` 中间件统一处理
- [x] **无业务判断**：权限校验（author_id）在 Service 层执行
- [x] **内联参数校验**：`ctx.dsl()` + `ctx.validateDsl()`，无独立 Validator 文件
- [x] **统一响应**：`ctx.success()` 返回，不直接操作 `ctx.body`
- [x] **不直接操作数据库**：仅通过 `ctx.service.blog.blogService` 调用
- [x] **不使用 `throw new Error()`**：所有错误由 Service 层通过 DSL 抛出
- [x] **userId 传递**：所有方法将 `ctx.state.user._id` 传给 Service

### BlogAdminController

- [x] **无 try-catch**：错误由 `exceptions` 中间件统一处理
- [x] **无业务判断**：存在性检查在 Service 层执行
- [x] **内联参数校验**：`ctx.dsl()` + `ctx.validateDsl()`
- [x] **统一响应**：`ctx.success()` 返回
- [x] **不依赖 ctx.state.user**：使用 `dbToken` 鉴权，不获取用户 ID
- [x] **不传 userId**：管理方法不校验作者权限

---

## 验证要点

### Home BlogController

- [ ] `POST /home/blog` 无 JWT 返回 401
- [ ] `POST /home/blog` title 为空返回校验错误
- [ ] `POST /home/blog` content 为空返回校验错误
- [ ] `POST /home/blog` 合法参数创建成功，返回完整文章对象
- [ ] `POST /home/blog` status=published 时 published_at 有值
- [ ] `POST /home/blog` summary 不填时自动截取（Service 层）
- [ ] `POST /home/blog` tags 超过 10 个返回 `BLOG_TAGS_LIMIT`（40303）
- [ ] `PUT /home/blog/:blogId` 路径参数 blogId 格式校验
- [ ] `PUT /home/blog/:blogId` body 全部可选，仅更新传入字段
- [ ] `PUT /home/blog/:blogId` 作者可成功更新
- [ ] `PUT /home/blog/:blogId` 非作者返回 `BLOG_FORBIDDEN`（40302）
- [ ] `PUT /home/blog/:blogId` draft→published 首次发布写入 published_at
- [ ] `DELETE /home/blog/:blogId` 路径参数 blogId 格式校验
- [ ] `DELETE /home/blog/:blogId` 作者可成功软删除
- [ ] `DELETE /home/blog/:blogId` 非作者返回 `BLOG_FORBIDDEN`（40302）
- [ ] `DELETE /home/blog/:blogId` 已删除文章幂等返回 `{ success: true }`
- [ ] 所有方法中无 try-catch 代码
- [ ] 所有方法中未 import 或实例化任何 Validator 类

### BlogAdminController

- [ ] `GET /home/blog/admin/list` 无 dbToken 返回 403
- [ ] `GET /home/blog/admin/list` 合法 dbToken 返回全量列表
- [ ] `GET /home/blog/admin/list?status=draft` 按状态过滤正常
- [ ] `GET /home/blog/admin/list?del_flag=1` 按删除状态过滤正常
- [ ] `GET /home/blog/admin/list?keyword=xxx` 关键词搜索正常
- [ ] `GET /home/blog/admin/list?limit=100` limit 最大 100
- [ ] `GET /home/blog/admin/list?limit=101` 返回校验错误
- [ ] `PUT /home/blog/admin/:blogId/status` 路径参数 blogId 格式校验
- [ ] `PUT /home/blog/admin/:blogId/status` body status 为空返回校验错误
- [ ] `PUT /home/blog/admin/:blogId/status` 可操作任意文章（不校验作者）
- [ ] `PUT /home/blog/admin/:blogId/status` 文章不存在返回 `BLOG_NOT_FOUND`（40301）
- [ ] 所有方法中无 try-catch 代码

---

**文档版本**: v1.0
**最后更新**: 2026-03-06
**Agent**: zed-copilot