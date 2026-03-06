# Phase 2 — Open BlogController 完整实现

> **文件路径**: `app/controller/open/BlogController.ts`
> **操作**: 新建
> **所属阶段**: Phase 2（公开接口层）
> **依赖**: Phase 1（BlogService 就绪）
> **关联**: [README.md](./README.md) → §3.3 / §4 Phase 2

---

## 说明

Open BlogController 提供无需鉴权的公开博客接口，包含文章列表（游标分页）和文章详情两个方法。

**设计要点**：

- 位于 `app/controller/open/` 目录，走 `/open` 路由前缀，无鉴权中间件
- 参数校验使用 `ctx.dsl()` + `ctx.validateDsl()` **内联完成**，不创建独立 Validator 文件
- Controller 层**不包含 try-catch**（由 `exceptions` 中间件统一捕获处理）
- Controller 层**不包含业务判断**（权限/存在性均在 Service 层）
- 响应统一使用 `ctx.success()`
- 校验通过后参数自动写入 `ctx.state.form`

**方法清单**：

| 方法 | 路由 | HTTP | 内联校验来源 | 说明 |
|------|------|:----:|:-----------:|------|
| `index()` | `/open/blog` | GET | query | 文章列表（游标分页），支持 keyword / tag / author_id 过滤 |
| `detail()` | `/open/blog/:blogId` | GET | params | 文章详情（含 content），异步 view_count +1 |

---

## 完整代码

```typescript
// app/controller/open/BlogController.ts

import { Controller } from 'egg';

export default class BlogController extends Controller {

    /**
     * 文章列表（游标分页）
     *
     * GET /open/blog
     *
     * query 参数：
     * - limit?: int (1-50, 默认 20) — 每页条数
     * - after?: string — 游标值，获取该游标之后的数据（下一页）
     * - before?: string — 游标值，获取该游标之前的数据（上一页）
     * - keyword?: string (0-100) — 关键词，同时模糊匹配 title + summary
     * - tag?: string (0-20) — 标签精确过滤
     * - author_id?: objectId — 按作者 ID 过滤
     *
     * 响应：{ code: 0, data: { items, pageInfo, totals } }
     */
    async index() {
        const { ctx } = this;

        // 内联参数校验
        const schema = ctx.dsl({
            limit: 'int:1-50',
            after: 'string',
            before: 'string',
            keyword: 'string:0-100',
            tag: 'string:0-20',
            author_id: 'objectId',
        });
        await ctx.validateDsl(schema, 'query');

        // 调用 Service（校验通过后参数在 ctx.state.form 中）
        const result = await ctx.service.blog.blogService.getBlogList(ctx.state.form);

        // 统一成功响应
        ctx.success(result);
    }

    /**
     * 文章详情
     *
     * GET /open/blog/:blogId
     *
     * params 参数：
     * - blogId: objectId (必填) — 文章 ID
     *
     * 响应：{ code: 0, data: { _id, title, content, summary, ... } }
     *
     * 说明：
     * - 仅返回 status=published + del_flag=0 的文章
     * - 每次访问异步 view_count +1（Service 层处理）
     * - 此为 open 接口，无 userId 传入；作者查看草稿需走 home 路由
     */
    async detail() {
        const { ctx } = this;

        // 内联参数校验
        const schema = ctx.dsl({
            blogId: 'objectId!',
        });
        await ctx.validateDsl(schema, 'params');

        const blogId = ctx.params.blogId;

        // 调用 Service（open 接口不传 userId，无法查看草稿）
        const result = await ctx.service.blog.blogService.getBlogDetail(blogId);

        // 统一成功响应
        ctx.success(result);
    }
}
```

---

## Controller 内联校验详解

### index() 校验规则

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `limit` | `int:1-50` | 否 | 整数，范围 1-50，不传时 Service 层默认 20 |
| `after` | `string` | 否 | 游标字符串，与 `before` 互斥（monSQLize 会校验互斥） |
| `before` | `string` | 否 | 游标字符串，与 `after` 互斥 |
| `keyword` | `string:0-100` | 否 | 搜索关键词，最长 100 字符 |
| `tag` | `string:0-20` | 否 | 标签名，最长 20 字符 |
| `author_id` | `objectId` | 否 | MongoDB ObjectId 格式校验 |

> **校验来源**: `'query'` — 从 `ctx.query` 中提取参数
> **校验通过后**: 参数自动写入 `ctx.state.form`，Controller 通过 `ctx.state.form` 传递给 Service

### detail() 校验规则

| 参数 | DSL 规则 | 必填 | 说明 |
|------|---------|:----:|------|
| `blogId` | `objectId!` | ✅ 是 | 必填，MongoDB ObjectId 格式，来自路由路径参数 |

> **校验来源**: `'params'` — 从 `ctx.params` 中提取参数
> **注意**: params 校验后参数也写入 `ctx.state.form`，但 `blogId` 同时可通过 `ctx.params.blogId` 获取

---

## 校验失败响应示例

当参数校验失败时，`ctx.validateDsl()` 自动返回多语言错误响应（由 schema-dsl 中间件处理），Controller 方法不会继续执行。

**示例 1 — limit 超出范围**：

```
GET /open/blog?limit=999

响应（zh-CN）:
{
    "code": -1,
    "message": "limit不能大于50"
}
```

**示例 2 — blogId 格式不合法**：

```
GET /open/blog/not-a-valid-id

响应（zh-CN）:
{
    "code": -1,
    "message": "blogId格式不正确"
}
```

**示例 3 — 文章不存在（Service 层错误）**：

```
GET /open/blog/65f1a2b3c4d5e6f7a8b9c0d1

响应（zh-CN）:
{
    "code": 40301,
    "message": "文章不存在"
}

响应（en-US）:
{
    "code": 40301,
    "message": "Blog not found"
}
```

---

## 数据流图

### index() 请求流

```
客户端
  │
  ▼
GET /open/blog?limit=20&keyword=旅行&tag=攻略
  │
  ▼
[openRequestValid 中间件] — open 路由通用中间件
  │
  ▼
open/BlogController.index()
  │
  ├── 1. ctx.dsl({ limit, after, before, keyword, tag, author_id })
  ├── 2. ctx.validateDsl(schema, 'query')
  │      ├── 校验失败 → 自动返回错误响应（方法终止）
  │      └── 校验通过 → 参数写入 ctx.state.form
  ├── 3. ctx.service.blog.blogService.getBlogList(ctx.state.form)
  │      └── → ctx.msq.collection('blogs').findPage({...})
  │          └── → { items, pageInfo, totals }
  └── 4. ctx.success(result)
         └── → { code: 0, data: { items, pageInfo, totals } }
```

### detail() 请求流

```
客户端
  │
  ▼
GET /open/blog/65f1a2b3c4d5e6f7a8b9c0d1
  │
  ▼
[openRequestValid 中间件]
  │
  ▼
open/BlogController.detail()
  │
  ├── 1. ctx.dsl({ blogId: 'objectId!' })
  ├── 2. ctx.validateDsl(schema, 'params')
  │      ├── 校验失败 → 自动返回错误响应
  │      └── 校验通过
  ├── 3. blogId = ctx.params.blogId
  ├── 4. ctx.service.blog.blogService.getBlogDetail(blogId)
  │      ├── ctx.msq.findOne() → 查询文章（缓存 120s）
  │      ├── 不存在 → ctx.dsl.error.throw('BLOG_NOT_FOUND')
  │      │              └── exceptions 中间件捕获 → { code: 40301, message: '...' }
  │      ├── 草稿且无 userId → ctx.dsl.error.throw('BLOG_NOT_FOUND')
  │      └── 异步 view_count +1（fire-and-forget）
  └── 5. ctx.success(result)
         └── → { code: 0, data: { _id, title, content, summary, ... } }
```

---

## 与 Home BlogController 的区别

| 对比项 | Open BlogController（本文件） | Home BlogController |
|--------|:---------------------------:|:-------------------:|
| 路由前缀 | `/open/blog` | `/home/blog` |
| 鉴权 | 无（open 路由组） | `userAuth({ level: 'basic' })` |
| 方法 | `index()` + `detail()` | `create()` + `update()` + `delete()` |
| userId | 不传（`getBlogDetail(blogId)` 无第二参数） | 从 `ctx.state.user._id` 获取 |
| 草稿访问 | 无法查看草稿（非作者返回 404） | 作者可通过权限校验查看自己的草稿 |
| 写操作 | 无 | 创建/更新/删除 |

> **注意**：open 接口的 `detail()` 不传 `userId`，因此 Service 层中 `getBlogDetail(blogId)` 
> 在检测到草稿文章时会直接抛出 `BLOG_NOT_FOUND`。作者查看自己的草稿需要通过 home 路由。

---

## Controller 约定检查清单

- [x] **无 try-catch**：错误由 `exceptions` 中间件统一处理
- [x] **无业务判断**：权限/存在性检查全部在 Service 层
- [x] **内联参数校验**：使用 `ctx.dsl()` + `ctx.validateDsl()`，无独立 Validator 文件
- [x] **统一响应**：使用 `ctx.success()` 返回，不直接操作 `ctx.body`
- [x] **不直接操作数据库**：仅通过 `ctx.service.blog.blogService` 调用 Service 层
- [x] **不使用 `throw new Error()`**：所有错误由 Service 层通过 DSL 抛出

---

## 验证要点

- [ ] `GET /open/blog` 无需任何鉴权即可访问
- [ ] `GET /open/blog` 参数校验失败时返回多语言格式校验错误
- [ ] `GET /open/blog` 校验通过后返回 `{ code: 0, data: { items, pageInfo, totals } }`
- [ ] `GET /open/blog?limit=0` 返回校验错误（limit 最小值为 1）
- [ ] `GET /open/blog?limit=51` 返回校验错误（limit 最大值为 50）
- [ ] `GET /open/blog?keyword=test` 关键词搜索正常
- [ ] `GET /open/blog?author_id=invalid` 返回 objectId 格式校验错误
- [ ] `GET /open/blog/:blogId` 合法 ObjectId 正常返回文章详情
- [ ] `GET /open/blog/:blogId` 不存在的 ID 返回 `BLOG_NOT_FOUND`（40301）
- [ ] `GET /open/blog/:blogId` 草稿文章返回 `BLOG_NOT_FOUND`（40301）
- [ ] `GET /open/blog/:blogId` 已删除文章返回 `BLOG_NOT_FOUND`（40301）
- [ ] `GET /open/blog/not-object-id` 返回参数格式校验错误
- [ ] Controller 中无 try-catch 代码
- [ ] Controller 中未 import 或实例化任何 Validator 类

---

**文档版本**: v1.0
**最后更新**: 2026-03-06
**Agent**: zed-copilot