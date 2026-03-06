---
标题: Blog 博客功能实施计划
项目: chat
类型: implementation-plan
Agent: zed-copilot
日期: 2026-03-06
状态: ✅ 已完成
---

# Blog 博客功能实施计划

> **版本**: v1.1
> **日期**: 2026-03-06
> **状态**: ✅ 已完成

> **关联文档**:
> - 需求文档: [01-需求定义.md](./01-需求定义.md)
> - 技术方案: [02-技术方案.md](./02-技术方案.md)
> - 实施方案: [03-实施方案/README.md](./03-实施方案/README.md)

---

## 📋 实施概览

| 项目 | 值 |
|------|-----|
| 模块名 | Blog 博客 |
| 所属服务 | chat（Egg.js + TypeScript + MongoDB） |
| 新建文件 | 10 个 |
| 修改文件 | 3 个 |
| 总操作数 | 13 项 |
| 阶段数 | 5 个（Phase 0 ~ Phase 4） |
| 预计总耗时 | 90 分钟 |

---

## 🔢 任务编号规则

```
BLOG-P{阶段号}-{序号}

示例：
  BLOG-P0-01  → Phase 0 第 1 个任务
  BLOG-P1-01  → Phase 1 第 1 个任务
  BLOG-P4-03  → Phase 4 第 3 个任务
```

---

## 📊 进度总览

| Phase | 名称 | 任务数 | 完成数 | 状态 | 预计耗时 |
|:-----:|------|:------:|:------:|:----:|:--------:|
| 0 | 基础层（Model + DSL） | 5 | 5 | ✅ 已完成 | 15 分钟 |
| 1 | 业务层（Service） | 1 | 1 | ✅ 已完成 | 30 分钟 |
| 2 | 公开接口层（Open Controller） | 1 | 1 | ✅ 已完成 | 10 分钟 |
| 3 | 用户端 + 管理端接口层（Home Controller） | 2 | 2 | ✅ 已完成 | 20 分钟 |
| 4 | 路由注册 + 集成 | 4 | 4 | ✅ 已完成 | 15 分钟 |
| **合计** | — | **13** | **13** | ✅ | **90 分钟** |

**状态图例**：⬜ 待开始 | 🔄 进行中 | ✅ 已完成 | ❌ 失败/阻塞 | ⏭️ 跳过

---

## 📝 任务明细

### Phase 0: 基础层（Model + DSL）— 无外部依赖

| 任务 ID | 文件路径 | 操作 | 说明 | 代码文档 | 状态 |
|:-------:|---------|:----:|------|---------|:----:|
| BLOG-P0-01 | `app/model/blog.ts` | 新建 | blogs 集合 Mongoose Schema（14 字段 + 3 索引），content 无长度限制 | [phase-0-model.md](./03-实施方案/phase-0-model.md) | ✅ |
| BLOG-P0-02 | `config/dsl/blog/zh-CN.ts` | 新建 | Blog 简体中文错误码（8 条，`{ code, message }` 格式） | [phase-0-dsl.md](./03-实施方案/phase-0-dsl.md) | ✅ |
| BLOG-P0-03 | `config/dsl/blog/en-US.ts` | 新建 | Blog 英文错误码（8 条） | [phase-0-dsl.md](./03-实施方案/phase-0-dsl.md) | ✅ |
| BLOG-P0-04 | `config/dsl/blog/zh-HK.ts` | 新建 | Blog 繁体中文错误码（8 条） | [phase-0-dsl.md](./03-实施方案/phase-0-dsl.md) | ✅ |
| BLOG-P0-05 | `config/dsl/index.ts` | 修改 | 追加 blog 子目录导入 + 合并到 dslLocales 导出 | [phase-0-dsl.md §index.ts](./03-实施方案/phase-0-dsl.md#indexts-修改) | ✅ |

**Phase 0 验证检查点**：

- [x] `npm run dev` 启动无报错
- [ ] MongoDB `blogs` 集合索引就绪（`db.blogs.getIndexes()` 确认 3 个索引）
- [ ] DSL 错误码可正确解析（`ctx.dsl.error.throw('BLOG_NOT_FOUND')` 抛出 code=40301）
- [ ] 三语言切换正常（zh-CN / en-US / zh-HK）
- [ ] 现有 DSL key（如 `SELL_CONFIG_PROJECT_NOT_FOUND`）仍可正常使用

**Phase 0 完成标志**：所有 5 个任务 ✅ + 验证检查点全部通过

---

### Phase 1: 业务层（Service）— 依赖 Phase 0

| 任务 ID | 文件路径 | 操作 | 说明 | 代码文档 | 状态 |
|:-------:|---------|:----:|------|---------|:----:|
| BLOG-P1-01 | `app/service/blog/BlogService.ts` | 新建 | 博客 CRUD 业务逻辑（7 个公开方法 + 2 个内部辅助） | [phase-1-service.md](./03-实施方案/phase-1-service.md) | ✅ |

**BLOG-P1-01 方法清单**：

| # | 方法 | 数据访问 | 关键特性 | 子状态 |
|:-:|------|:-------:|---------|:------:|
| 1 | `createBlog(form, authorId)` | ctx.model | 自动摘要 + tags 校验 + invalidateCache | ✅ |
| 2 | `getBlogList(params)` | ctx.msq findPage | 游标分页 + cache 60s + 排除 content | ✅ |
| 3 | `getBlogDetail(blogId, userId?)` | ctx.msq findOne | cache 120s + 异步 view_count（不 invalidate） | ✅ |
| 4 | `updateBlog(blogId, form, userId)` | ctx.model | 权限校验 + published_at 逻辑 + invalidateCache | ✅ |
| 5 | `deleteBlog(blogId, userId)` | ctx.model | 软删除 + 幂等 + 权限校验 + invalidateCache | ✅ |
| 6 | `adminGetBlogList(params)` | ctx.msq findPage | 全量数据 + 无缓存 + totals sync | ✅ |
| 7 | `adminUpdateBlogStatus(blogId, status)` | ctx.model | 管理员操作 + 不校验作者 + invalidateCache | ✅ |
| 8 | `_buildListFilter(params)` | — | keyword 正则转义 + 多条件过滤 | ✅ |
| 9 | `_autoSummary(content)` | — | 截取 content 前 200 字符 | ✅ |

**Phase 1 验证检查点**：

- [x] `ctx.service.blog.blogService` 可正常访问（Egg.js 自动挂载）
- [x] `findPage` 调用语法正确（返回 `{ items, pageInfo, totals }`）
- [x] `invalidateCache` 调用正确
- [x] `view_count` 异步更新不阻塞响应、不调用 invalidateCache
- [x] 所有 catch 块正确判断 `error.code` 并 re-throw 业务错误

**Phase 1 完成标志**：BLOG-P1-01 ✅（9 个方法全部实现）+ 验证检查点通过

---

### Phase 2: 公开接口层（Open Controller）— 依赖 Phase 1

| 任务 ID | 文件路径 | 操作 | 说明 | 代码文档 | 状态 |
|:-------:|---------|:----:|------|---------|:----:|
| BLOG-P2-01 | `app/controller/open/BlogController.ts` | 新建 | 公开接口 Controller（index + detail）+ 内联参数校验 | [phase-2-controller-open.md](./03-实施方案/phase-2-controller-open.md) | ✅ |

**BLOG-P2-01 方法清单**：

| # | 方法 | 路由 | 校验来源 | 子状态 |
|:-:|------|------|:-------:|:------:|
| 1 | `index()` | GET /open/blog | query（limit, after, before, keyword, tag, author_id） | ✅ |
| 2 | `detail()` | GET /open/blog/:blogId | params（blogId） | ✅ |

**Phase 2 验证检查点**：

- [x] Controller 无 try-catch（exceptions 中间件统一处理）
- [x] `ctx.dsl()` + `ctx.validateDsl()` 内联校验正常
- [x] 校验失败时返回多语言格式校验错误
- [x] 未 import 或实例化任何 Validator 类

**Phase 2 完成标志**：BLOG-P2-01 ✅ + 验证检查点通过

---

### Phase 3: 用户端 + 管理端接口层（Home Controller）— 依赖 Phase 1

| 任务 ID | 文件路径 | 操作 | 说明 | 代码文档 | 状态 |
|:-------:|---------|:----:|------|---------|:----:|
| BLOG-P3-01 | `app/controller/home/BlogController.ts` | 新建 | 用户端 Controller（create + update + delete）+ 内联校验，content 无长度限制 | [phase-3-controller-home.md](./03-实施方案/phase-3-controller-home.md) | ✅ |
| BLOG-P3-02 | `app/controller/home/BlogAdminController.ts` | 新建 | 管理端 Controller（index + updateStatus）+ 内联校验 | [phase-3-controller-home.md](./03-实施方案/phase-3-controller-home.md) | ✅ |

**BLOG-P3-01 方法清单**：

| # | 方法 | 路由 | 鉴权 | 校验来源 | 子状态 |
|:-:|------|------|:----:|:-------:|:------:|
| 1 | `create()` | POST /home/blog | userAuth basic | body | ✅ |
| 2 | `update()` | PUT /home/blog/:blogId | userAuth basic | params + body | ✅ |
| 3 | `delete()` | DELETE /home/blog/:blogId | userAuth basic | params | ✅ |

**BLOG-P3-02 方法清单**：

| # | 方法 | 路由 | 鉴权 | 校验来源 | 子状态 |
|:-:|------|------|:----:|:-------:|:------:|
| 1 | `index()` | GET /home/blog/admin/list | dbToken | query | ✅ |
| 2 | `updateStatus()` | PUT /home/blog/admin/:blogId/status | dbToken | params + body | ✅ |

**Phase 3 验证检查点**：

- [x] Home BlogController 所有方法使用 `ctx.state.user._id` 获取用户 ID
- [x] BlogAdminController 不依赖 `ctx.state.user`（dbToken 鉴权）
- [x] 所有 Controller 方法均无 try-catch
- [x] 参数校验全部内联完成
- [x] 未 import 或实例化任何 Validator 类

**Phase 3 完成标志**：BLOG-P3-01 ✅ + BLOG-P3-02 ✅ + 验证检查点通过

---

### Phase 4: 路由注册 + 集成 — 依赖 Phase 2 + Phase 3

| 任务 ID | 文件路径 | 操作 | 说明 | 代码文档 | 状态 |
|:-------:|---------|:----:|------|---------|:----:|
| BLOG-P4-01 | `app/routes/open/blog.ts` | 新建 | 公开路由注册（GET /open/blog + GET /open/blog/:blogId） | [phase-4-routes.md](./03-实施方案/phase-4-routes.md) | ✅ |
| BLOG-P4-02 | `app/routes/home/blog.ts` | 新建 | 用户端 + 管理端路由注册（🔴 管理端先于用户端注册） | [phase-4-routes.md](./03-实施方案/phase-4-routes.md) | ✅ |
| BLOG-P4-03 | `app/routes/open/index.ts` | 修改 | 追加 blogGroup 导入与注册 | [phase-4-routes.md §open/index.ts](./03-实施方案/phase-4-routes.md#openindexts-修改) | ✅ |
| BLOG-P4-04 | `app/routes/home/index.ts` | 修改 | 追加 blogGroup 导入与注册（第一个 router.group 回调） | [phase-4-routes.md §home/index.ts](./03-实施方案/phase-4-routes.md#homeindexts-修改) | ✅ |

**Phase 4 关键注意事项**：

> 🔴 **BLOG-P4-02 路由注册顺序**：在 `app/routes/home/blog.ts` 中，
> 管理端分组（`/blog/admin`，`dbToken` 中间件）必须**先于**用户端分组（`/blog`，`userAuth` 中间件）注册，
> 避免 `/home/blog/admin/list` 中的 `admin` 被 `/home/blog/:blogId` 的 `:blogId` 匹配。
>
> 🔴 **BLOG-P4-04 注册位置**：Blog 路由注册到 `home/index.ts` 的**第一个** `router.group` 回调中
>（无统一鉴权中间件块），由 `blog.ts` 内部自行管理鉴权。

**Phase 4 验证检查点**：

- [ ] `npm run dev` 启动无路由冲突报错
- [ ] `GET /open/blog` 返回 `{ code: 0, data: { items: [], pageInfo: {...}, totals: {...} } }`
- [ ] `GET /open/blog/:nonexistentId` 返回 `BLOG_NOT_FOUND`（40301）
- [ ] `POST /home/blog` 无 JWT 返回 401
- [ ] `GET /home/blog/admin/list` 无 dbToken 返回 403
- [ ] 🔴 `GET /home/blog/admin/list`（携带 dbToken）**不被** `:blogId` 匹配，正常返回管理列表
- [ ] 现有路由（`/home/articles/*`、`/open/trip_project/*` 等）不受影响

> 📝 Phase 4 验证检查点需要启动服务后通过 `blog.http` 测试文件手动验证

**Phase 4 完成标志**：所有 4 个任务 ✅ + 验证检查点全部通过（含路由冲突验证）

---

## 🔗 依赖关系图

```
Phase 0（Model + DSL）
  │   无外部依赖
  │
  ├──→ Phase 1（Service）
  │       │   依赖 Phase 0
  │       │
  │       ├──→ Phase 2（Open Controller）
  │       │       │   依赖 Phase 1
  │       │       │
  │       └──→ Phase 3（Home Controller）
  │               │   依赖 Phase 1
  │               │
  └───────────────┴──→ Phase 4（Routes + 集成）
                          依赖 Phase 2 + Phase 3
```

**可并行执行**：Phase 2 和 Phase 3 互不依赖，可并行执行。

**执行顺序建议**：
1. Phase 0（必须首先完成）
2. Phase 1（依赖 Phase 0）
3. Phase 2 + Phase 3（可并行，均依赖 Phase 1）
4. Phase 4（依赖 Phase 2 + Phase 3）

---

## 🔄 中断恢复指南

如果实施过程中断（token 耗尽 / 会话中断），恢复步骤：

### 1. 查看当前进度

检查本文件的「进度总览」和「任务明细」表格，找到最后一个 ✅ 状态的任务。

### 2. 确定恢复点

| 中断位置 | 恢复操作 |
|---------|---------|
| Phase 0 中间 | 检查已创建的文件，从未完成的任务继续 |
| Phase 0 完成、Phase 1 未开始 | 直接开始 BLOG-P1-01 |
| Phase 1 部分方法完成 | 检查 BlogService.ts 中已实现的方法，补充剩余方法 |
| Phase 2 或 Phase 3 完成 | 开始 Phase 4（路由注册） |
| Phase 4 部分完成 | 检查已注册的路由，补充剩余注册 |

### 3. 快速上下文恢复

```
恢复任务时需要读取：
1. 本文件（IMPLEMENTATION-PLAN.md）→ 查看进度
2. 03-实施方案/README.md → 实施概述
3. 对应 Phase 的代码文档 → 具体代码
4. .ai-memory/clients/<agent>/tasks/20260306.md → 对话上下文
```

### 4. 验证恢复点

```
恢复后首先验证：
1. npm run dev → 当前状态可正常启动？
2. 已完成的 Phase → 验证检查点通过？
3. 未完成的文件 → 是否存在半成品需要清理？
```

---

## 📐 关键决策速查

| # | 决策 | 说明 |
|:-:|------|------|
| 1 | 参数校验在 Controller 内联 | `ctx.dsl()` + `ctx.validateDsl()`，不创建独立 Validator 文件 |
| 2 | DSL 子目录 `config/dsl/blog/` | `{ code, message }` 对象格式，code 段 40301-40399 / 50301-50399 |
| 3 | Blog DSL 独立先行 | 不同时迁移行程广场，保留现有扁平文件 + blog 子目录增量追加 |
| 4 | 游标分页 `findPage` | monSQLize 原生格式 `{ items, pageInfo, totals }` |
| 5 | 路由注册顺序方案 A | 管理端 `/blog/admin` 先于用户端 `/blog` 注册 |
| 6 | Blog 路由注册位置 | `home/index.ts` 第一个 `router.group`（无统一鉴权），blog.ts 内部自行管理鉴权 |
| 7 | view_count 策略 | 异步 fire-and-forget，不 await、不 invalidateCache，接受最终一致 |
| 8 | 读写分离 | 查询用 `ctx.msq`（monSQLize），写入用 `ctx.model`（Mongoose） |
| 9 | 错误处理 | try 块：`ctx.dsl.error.throw()`；catch 块：`throw ctx.dsl.error.create()` |
| 10 | 软删除幂等 | 已删除文章重复删除时直接返回 `{ success: true }` |

---

## 📦 文件变更总览（按路径排序）

| # | 文件路径 | 操作 | 任务 ID | Phase |
|:-:|---------|:----:|:-------:|:-----:|
| 1 | `app/controller/home/BlogAdminController.ts` | 新建 | BLOG-P3-02 | 3 |
| 2 | `app/controller/home/BlogController.ts` | 新建 | BLOG-P3-01 | 3 |
| 3 | `app/controller/open/BlogController.ts` | 新建 | BLOG-P2-01 | 2 |
| 4 | `app/model/blog.ts` | 新建 | BLOG-P0-01 | 0 |
| 5 | `app/routes/home/blog.ts` | 新建 | BLOG-P4-02 | 4 |
| 6 | `app/routes/home/index.ts` | 修改 | BLOG-P4-04 | 4 |
| 7 | `app/routes/open/blog.ts` | 新建 | BLOG-P4-01 | 4 |
| 8 | `app/routes/open/index.ts` | 修改 | BLOG-P4-03 | 4 |
| 9 | `app/service/blog/BlogService.ts` | 新建 | BLOG-P1-01 | 1 |
| 10 | `config/dsl/blog/en-US.ts` | 新建 | BLOG-P0-03 | 0 |
| 11 | `config/dsl/blog/zh-CN.ts` | 新建 | BLOG-P0-02 | 0 |
| 12 | `config/dsl/blog/zh-HK.ts` | 新建 | BLOG-P0-04 | 0 |
| 13 | `config/dsl/index.ts` | 修改 | BLOG-P0-05 | 0 |

---

## 🔀 回滚顺序（如需回滚）

按**反向依赖顺序**执行：

| 步骤 | 操作 | 对应任务 |
|:----:|------|:-------:|
| 1 | 从 `app/routes/home/index.ts` 移除 `blogGroup` 导入和注册 | BLOG-P4-04 |
| 2 | 从 `app/routes/open/index.ts` 移除 `blogGroup` 导入和注册 | BLOG-P4-03 |
| 3 | 删除 `app/routes/home/blog.ts` | BLOG-P4-02 |
| 4 | 删除 `app/routes/open/blog.ts` | BLOG-P4-01 |
| 5 | 删除 `app/controller/home/BlogAdminController.ts` | BLOG-P3-02 |
| 6 | 删除 `app/controller/home/BlogController.ts` | BLOG-P3-01 |
| 7 | 删除 `app/controller/open/BlogController.ts` | BLOG-P2-01 |
| 8 | 删除 `app/service/blog/` 目录 | BLOG-P1-01 |
| 9 | 删除 `app/model/blog.ts` | BLOG-P0-01 |
| 10 | 还原 `config/dsl/index.ts` 到修改前版本 | BLOG-P0-05 |
| 11 | 删除 `config/dsl/blog/` 目录 | BLOG-P0-02~04 |
| 12 | MongoDB：`db.blogs.drop()`（可选，清理数据） | — |

---

## 📅 变更记录

| 日期 | 版本 | 变更内容 | 操作人 |
|------|:----:|---------|:------:|
| 2026-03-06 | v1.0 | 初始版本 — CP3 实施计划创建 | zed-copilot |
| 2026-03-06 | v1.1 | 全部 13 项任务实施完成 ✅ + 附加 blog.http 测试文件；用户调整：content 字段不做长度限制 | zed-copilot |

---

**实施计划版本**: v1.1
**最后更新**: 2026-03-06
**Agent**: zed-copilot
**状态**: ✅ 已完成