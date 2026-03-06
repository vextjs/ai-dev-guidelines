---
标题: Blog 博客功能实施方案
项目: chat
类型: implementation
Agent: zed-copilot
日期: 2026-03-06
状态: 📝 CP3 待确认
---

# Blog 博客功能实施方案

> **版本**: v1.0
> **日期**: 2026-03-06
> **状态**: 📝 CP3 待确认

> **关联文档**:
> - 需求文档: [01-需求定义.md](../01-需求定义.md)
> - 技术方案: [02-技术方案.md](../02-技术方案.md)
> - 实施计划: [IMPLEMENTATION-PLAN.md](../IMPLEMENTATION-PLAN.md)

---

## 1. 实施概述

### 1.1 实施目标

基于已确认的 CP2 技术方案（v2 修正版），在 chat 服务中实现完整的 Blog 博客模块：

- ✅ 新建 blogs 集合 Mongoose Model（含 3 个复合索引）
- ✅ 新建 Blog DSL 错误码子目录（3 语言 × `{ code, message }` 格式）
- ✅ 实现 BlogService（7 个公开方法 + 2 个内部辅助，findPage 游标分页 + 缓存 + invalidateCache）
- ✅ 实现 3 个 Controller（open / home / admin，全部使用 Controller 内联参数校验）
- ✅ 注册路由（管理端先于用户端注册，避免 `:blogId` 路由冲突）
- ✅ 修改 `config/dsl/index.ts` 支持 blog 子目录合并导出

### 1.2 核心设计（引用 CP2 关键决策）

| # | 决策 | 来源 |
|:-:|------|:----:|
| 1 | 参数校验在 Controller 内联（`ctx.dsl()` + `ctx.validateDsl()`） | CP2 §四 |
| 2 | DSL 子目录 `config/dsl/blog/` + `{ code, message }` 格式 | CP2 §九 |
| 3 | code 码段：业务 40301-40399，系统 50301-50399 | CP2 §九 |
| 4 | 分页使用 monSQLize `findPage` 游标分页 | CP2 §五 |
| 5 | 响应格式 `{ items, pageInfo, totals }` | CP2 §三 |
| 6 | 路由注册顺序：admin 先于 user（方案 A） | CP2 §七 |
| 7 | DSL 迁移范围：Blog 独立，不同时迁移行程广场 | 用户确认 |

---

## 2. 实施前检查

- [ ] 确认 chat 服务可正常启动（`npm run dev` 无报错）
- [ ] 确认 MongoDB 连接正常（Nacos 配置）
- [ ] 确认 `schema-dsl` 版本 >= 1.2.3（支持 `dsl.config({ dirs })` 子目录扫描）
- [ ] 确认 `monSQLize` 已安装且 `ctx.msq.collection().findPage()` 可用
- [ ] 确认 `app/middleware/dbToken.ts` 存在（管理端鉴权）
- [ ] 确认 `app/middleware/userAuth.ts` 存在（用户端鉴权，level: basic）
- [ ] 确认 `config/dsl/index.ts` 当前为扁平结构（zh.ts / en.ts / hk.ts）
- [ ] 确认 `app/model/article.ts` 为已有的独立文章模块，Blog 为全新独立集合

---

## 3. 实施文件清单

### 3.1 Phase 0 — 基础层（Model + DSL）

| # | 文件路径 | 操作 | 代码文档 |
|:-:|---------|:----:|---------|
| 1 | `app/model/blog.ts` | **新建** | [phase-0-model.md](./phase-0-model.md) |
| 2 | `config/dsl/blog/zh-CN.ts` | **新建** | [phase-0-dsl.md](./phase-0-dsl.md) |
| 3 | `config/dsl/blog/en-US.ts` | **新建** | [phase-0-dsl.md](./phase-0-dsl.md) |
| 4 | `config/dsl/blog/zh-HK.ts` | **新建** | [phase-0-dsl.md](./phase-0-dsl.md) |
| 5 | `config/dsl/index.ts` | **修改** | [phase-0-dsl.md §index.ts](./phase-0-dsl.md#indexts-修改) |

### 3.2 Phase 1 — 业务层（Service）

| # | 文件路径 | 操作 | 代码文档 |
|:-:|---------|:----:|---------|
| 6 | `app/service/blog/BlogService.ts` | **新建** | [phase-1-service.md](./phase-1-service.md) |

### 3.3 Phase 2 — 公开接口层（Open Controller）

| # | 文件路径 | 操作 | 代码文档 |
|:-:|---------|:----:|---------|
| 7 | `app/controller/open/BlogController.ts` | **新建** | [phase-2-controller-open.md](./phase-2-controller-open.md) |

### 3.4 Phase 3 — 用户端 + 管理端接口层（Home Controller）

| # | 文件路径 | 操作 | 代码文档 |
|:-:|---------|:----:|---------|
| 8 | `app/controller/home/BlogController.ts` | **新建** | [phase-3-controller-home.md](./phase-3-controller-home.md) |
| 9 | `app/controller/home/BlogAdminController.ts` | **新建** | [phase-3-controller-home.md](./phase-3-controller-home.md) |

### 3.5 Phase 4 — 路由注册 + 集成

| # | 文件路径 | 操作 | 代码文档 |
|:-:|---------|:----:|---------|
| 10 | `app/routes/open/blog.ts` | **新建** | [phase-4-routes.md](./phase-4-routes.md) |
| 11 | `app/routes/home/blog.ts` | **新建** | [phase-4-routes.md](./phase-4-routes.md) |
| 12 | `app/routes/open/index.ts` | **修改** | [phase-4-routes.md §open/index.ts](./phase-4-routes.md#openindexts-修改) |
| 13 | `app/routes/home/index.ts` | **修改** | [phase-4-routes.md §home/index.ts](./phase-4-routes.md#homeindexts-修改) |

### 3.6 文件统计

| 类型 | 数量 | 文件 |
|:----:|:----:|------|
| 新建 | 10 | model(1) + DSL(3) + service(1) + controller(3) + routes(2) |
| 修改 | 3 | dsl/index.ts(1) + routes/index.ts(2) |
| **合计** | **13** | — |

---

## 4. 实施步骤（按依赖顺序）

### Phase 0: 基础层（Model + DSL）— 无外部依赖

> **目标**: 创建 blogs 集合 Schema + 索引，创建 Blog DSL 错误码子目录，修改 dsl/index.ts 合并导出。
> **预计耗时**: 15 分钟

**步骤 0.1 — 创建 Blog Model**

```
新增文件: app/model/blog.ts
```

- blogs 集合 Mongoose Schema（14 个字段）
- 3 个复合索引：`idx_status_del_published`、`idx_author_del_created`、`idx_tags_status_del`
- 使用 `timestamps` 自动维护 `created_at` / `updated_at`

详见: [phase-0-model.md](./phase-0-model.md)

**步骤 0.2 — 创建 Blog DSL 错误码**

```
新增目录: config/dsl/blog/
新增文件: config/dsl/blog/zh-CN.ts
新增文件: config/dsl/blog/en-US.ts
新增文件: config/dsl/blog/zh-HK.ts
```

- 3 个业务错误码（40301-40303）+ 5 个系统错误码（50301-50305）
- 全部使用 `{ code, message }` 对象格式
- 三语言 code 值完全一致

详见: [phase-0-dsl.md](./phase-0-dsl.md)

**步骤 0.3 — 修改 DSL index.ts**

```
修改文件: config/dsl/index.ts
```

- 保留现有扁平文件导入（zh.ts / en.ts / hk.ts）
- 追加 blog 子目录导入
- 合并导出 `dslLocales`（旧 + blog）

详见: [phase-0-dsl.md §index.ts 修改](./phase-0-dsl.md#indexts-修改)

**Phase 0 验证**:

- [ ] `npm run dev` 启动无报错
- [ ] MongoDB 中自动创建 `blogs` 集合（或首次写入时创建）
- [ ] 3 个索引就绪（可通过 `db.blogs.getIndexes()` 确认）
- [ ] DSL 错误码可被 `ctx.dsl.error.throw('BLOG_NOT_FOUND')` 正确解析
- [ ] 三语言切换正常（zh-CN / en-US / zh-HK）

---

### Phase 1: 业务层（Service）— 依赖 Phase 0

> **目标**: 实现 BlogService 全部 7 个公开方法 + 2 个内部辅助方法。
> **预计耗时**: 30 分钟

**步骤 1.1 — 创建 BlogService**

```
新增目录: app/service/blog/
新增文件: app/service/blog/BlogService.ts
```

核心方法清单：

| 方法 | 数据访问 | 说明 |
|------|:-------:|------|
| `createBlog(form, authorId)` | `ctx.model` | 创建 + invalidateCache |
| `getBlogList(params)` | `ctx.msq` findPage | 公开列表（游标分页，cache 60s） |
| `getBlogDetail(blogId, userId?)` | `ctx.msq` findOne | 详情（cache 120s）+ 异步 view_count |
| `updateBlog(blogId, form, userId)` | `ctx.model` | 更新 + 权限校验 + invalidateCache |
| `deleteBlog(blogId, userId)` | `ctx.model` | 软删除 + 权限校验 + invalidateCache |
| `adminGetBlogList(params)` | `ctx.msq` findPage | 管理列表（无缓存） |
| `adminUpdateBlogStatus(blogId, status)` | `ctx.model` | 管理上下架 + invalidateCache |
| `_buildListFilter(params)` | — | 内部：构建 filter（含 keyword 正则转义） |
| `_autoSummary(content)` | — | 内部：截取前 200 字符 |

详见: [phase-1-service.md](./phase-1-service.md)

**Phase 1 验证**:

- [ ] BlogService 可通过 `ctx.service.blog.blogService` 访问（Egg.js 自动挂载）
- [ ] findPage 调用语法正确（`ctx.msq.collection('blogs').findPage({...})`）
- [ ] invalidateCache 调用正确（`ctx.msq.collection('blogs').invalidateCache()`）
- [ ] view_count 异步更新不阻塞响应、不调用 invalidateCache

---

### Phase 2: 公开接口层（Open Controller）— 依赖 Phase 1

> **目标**: 实现公开博客接口（列表 + 详情），无需鉴权。
> **预计耗时**: 10 分钟

**步骤 2.1 — 创建 Open BlogController**

```
新增文件: app/controller/open/BlogController.ts
```

| 方法 | 路由 | 内联校验 |
|------|------|---------|
| `index()` | GET /open/blog | `limit`, `after`, `before`, `keyword`, `tag`, `author_id` → query |
| `detail()` | GET /open/blog/:blogId | `blogId` → params |

详见: [phase-2-controller-open.md](./phase-2-controller-open.md)

**Phase 2 验证**:

- [ ] Controller 无 try-catch（由 exceptions 中间件处理）
- [ ] `ctx.dsl()` + `ctx.validateDsl()` 内联校验正常
- [ ] 校验失败时返回多语言错误消息

---

### Phase 3: 用户端 + 管理端接口层（Home Controller）— 依赖 Phase 1

> **目标**: 实现用户端 CRUD 接口 + 管理端列表和上下架接口。
> **预计耗时**: 20 分钟

**步骤 3.1 — 创建 Home BlogController**

```
新增文件: app/controller/home/BlogController.ts
```

| 方法 | 路由 | 鉴权 |
|------|------|:----:|
| `create()` | POST /home/blog | userAuth basic |
| `update()` | PUT /home/blog/:blogId | userAuth basic |
| `delete()` | DELETE /home/blog/:blogId | userAuth basic |

**步骤 3.2 — 创建 Home BlogAdminController**

```
新增文件: app/controller/home/BlogAdminController.ts
```

| 方法 | 路由 | 鉴权 |
|------|------|:----:|
| `index()` | GET /home/blog/admin/list | dbToken |
| `updateStatus()` | PUT /home/blog/admin/:blogId/status | dbToken |

详见: [phase-3-controller-home.md](./phase-3-controller-home.md)

**Phase 3 验证**:

- [ ] Home BlogController 所有方法使用 `ctx.state.user._id` 获取用户 ID
- [ ] BlogAdminController 不依赖 `ctx.state.user`（dbToken 鉴权）
- [ ] 所有 Controller 方法均无 try-catch
- [ ] 参数校验全部内联完成

---

### Phase 4: 路由注册 + 集成 — 依赖 Phase 2 + Phase 3

> **目标**: 创建路由文件并注册到 index.ts，确保管理端路由先于用户端注册。
> **预计耗时**: 15 分钟

**步骤 4.1 — 创建 Open Blog 路由**

```
新增文件: app/routes/open/blog.ts
```

**步骤 4.2 — 创建 Home Blog 路由**

```
新增文件: app/routes/home/blog.ts
```

> 🔴 **路由注册顺序关键点**：
> 在 `app/routes/home/blog.ts` 中，管理端分组（`/blog/admin`，dbToken 中间件）必须**先于**用户端分组（`/blog`，userAuth 中间件）注册，
> 避免 `/home/blog/admin/list` 被 `/home/blog/:blogId` 中的 `:blogId` 匹配为 `"admin"`。

**步骤 4.3 — 修改 Open Routes Index**

```
修改文件: app/routes/open/index.ts
```

- 追加 `import blogGroup from './blog'`
- 在 router.group 回调中追加 `blogGroup(app, _groupRouter)`

**步骤 4.4 — 修改 Home Routes Index**

```
修改文件: app/routes/home/index.ts
```

- 追加 `import blogGroup from './blog'`
- 在**第一个** router.group 回调中追加 `blogGroup(app, _groupRouter)`（无鉴权中间件块，blog.ts 内部自行挂载中间件）

详见: [phase-4-routes.md](./phase-4-routes.md)

**Phase 4 验证**:

- [ ] `npm run dev` 启动无路由冲突报错
- [ ] `GET /open/blog` 返回 `{ code: 0, data: { items: [], pageInfo: {...}, totals: {...} } }`
- [ ] `GET /open/blog/nonexistent` 返回 `BLOG_NOT_FOUND`（40301）
- [ ] `POST /home/blog` 无 JWT 返回 401
- [ ] `GET /home/blog/admin/list` 无 dbToken 返回 403
- [ ] `GET /home/blog/admin/list` 不被 `:blogId` 匹配（路由顺序正确）

---

## 5. 端到端验证清单

### 5.1 功能验证

**公开接口（无需鉴权）**:

- [ ] `GET /open/blog` — 空数据返回 `{ items: [], pageInfo: { hasNext: false, hasPrev: false } }`
- [ ] `GET /open/blog?limit=2` — 限制每页 2 条
- [ ] `GET /open/blog?keyword=旅行` — 关键词同时匹配 title 和 summary
- [ ] `GET /open/blog?keyword=[test]` — 正则特殊字符不报错
- [ ] `GET /open/blog?tag=攻略` — 标签精确过滤
- [ ] `GET /open/blog?after={endCursor}` — 游标翻页下一页
- [ ] `GET /open/blog?before={startCursor}` — 游标翻页上一页
- [ ] `GET /open/blog/:blogId` — 已发布文章返回完整内容（含 content）
- [ ] `GET /open/blog/:blogId` — 草稿文章返回 404
- [ ] `GET /open/blog/:blogId` — 已删除文章返回 404
- [ ] `GET /open/blog/:blogId` — view_count 每次 +1

**用户端接口（需 JWT）**:

- [ ] `POST /home/blog` — 创建草稿成功（status=draft）
- [ ] `POST /home/blog` — 创建并发布成功（status=published，published_at 有值）
- [ ] `POST /home/blog` — title 为空返回校验错误
- [ ] `POST /home/blog` — tags 超过 10 个返回 `BLOG_TAGS_LIMIT`（40303）
- [ ] `POST /home/blog` — summary 不填时自动截取 content 前 200 字符
- [ ] `PUT /home/blog/:blogId` — 作者更新成功
- [ ] `PUT /home/blog/:blogId` — 非作者返回 `BLOG_FORBIDDEN`（40302）
- [ ] `PUT /home/blog/:blogId` — draft→published 写入 published_at
- [ ] `DELETE /home/blog/:blogId` — 作者软删除成功（del_flag=1）
- [ ] `DELETE /home/blog/:blogId` — 非作者返回 `BLOG_FORBIDDEN`（40302）
- [ ] `DELETE /home/blog/:blogId` — 已删除文章幂等返回成功

**管理端接口（需 dbToken）**:

- [ ] `GET /home/blog/admin/list` — 返回全量文章（含草稿、已删除）
- [ ] `GET /home/blog/admin/list?status=draft` — 按状态过滤
- [ ] `GET /home/blog/admin/list?del_flag=1` — 按删除状态过滤
- [ ] `PUT /home/blog/admin/:blogId/status` — 管理员强制上架/下架

### 5.2 缓存验证

- [ ] 公开列表接口命中缓存（60s 内相同请求不查 DB）
- [ ] 详情接口命中缓存（120s 内相同请求不查 DB）
- [ ] 创建文章后列表缓存失效（新文章立即可见）
- [ ] 更新文章后详情缓存失效
- [ ] 删除文章后列表缓存失效
- [ ] view_count +1 不触发缓存失效（允许最终一致）
- [ ] 管理端列表不使用缓存

### 5.3 游标分页验证

- [ ] 首次请求不传 after/before 返回第一页
- [ ] 使用 endCursor 作为 after 获取下一页
- [ ] 使用 startCursor 作为 before 获取上一页
- [ ] 最后一页 `pageInfo.hasNext === false`
- [ ] 第一页 `pageInfo.hasPrev === false`
- [ ] `totals.total` 反映文章总数

### 5.4 错误码验证

- [ ] 所有 DSL 错误码可正确解析（`BLOG_NOT_FOUND` → 40301）
- [ ] 三语言切换正常（Accept-Language: zh-CN / en-US / zh-HK）
- [ ] 无 code 码冲突（grep 全局 DSL 文件确认）

### 5.5 回归验证

- [ ] 现有 Article 模块不受影响（`/home/articles/*` 正常）
- [ ] 现有行程相关接口不受影响
- [ ] `npm run dev` 编译无 TypeScript 错误
- [ ] 现有 DSL 错误码未被覆盖（扁平文件 key 与 blog 子目录 key 无重复）

---

## 6. 回滚方案

如需回滚，按以下顺序反向操作：

| 步骤 | 操作 |
|:----:|------|
| 1 | 从 `app/routes/open/index.ts` 移除 `blogGroup` 导入和注册 |
| 2 | 从 `app/routes/home/index.ts` 移除 `blogGroup` 导入和注册 |
| 3 | 删除 `app/routes/open/blog.ts` |
| 4 | 删除 `app/routes/home/blog.ts` |
| 5 | 删除 `app/controller/open/BlogController.ts` |
| 6 | 删除 `app/controller/home/BlogController.ts` |
| 7 | 删除 `app/controller/home/BlogAdminController.ts` |
| 8 | 删除 `app/service/blog/` 目录 |
| 9 | 删除 `app/model/blog.ts` |
| 10 | 还原 `config/dsl/index.ts` 到修改前版本 |
| 11 | 删除 `config/dsl/blog/` 目录 |
| 12 | MongoDB：`db.blogs.drop()`（如需清理数据） |

---

## 📦 附件说明

本实施方案包含以下代码文档：

| # | 文档 | 包含文件数 | 说明 |
|:-:|------|:---------:|------|
| 1 | [phase-0-model.md](./phase-0-model.md) | 1 | Blog Model（`app/model/blog.ts`） |
| 2 | [phase-0-dsl.md](./phase-0-dsl.md) | 4 | DSL 三语言 + index.ts 修改 |
| 3 | [phase-1-service.md](./phase-1-service.md) | 1 | BlogService 完整实现 |
| 4 | [phase-2-controller-open.md](./phase-2-controller-open.md) | 1 | Open BlogController |
| 5 | [phase-3-controller-home.md](./phase-3-controller-home.md) | 2 | Home BlogController + BlogAdminController |
| 6 | [phase-4-routes.md](./phase-4-routes.md) | 4 | 路由文件 + index.ts 修改 |

所有代码文件均可直接复制到项目对应路径使用。

---

**实施方案版本**: v1.0
**最后更新**: 2026-03-06
**Agent**: zed-copilot
**状态**: 📝 CP3 待确认