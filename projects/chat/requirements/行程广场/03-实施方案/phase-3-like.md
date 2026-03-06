---
标题: Phase 3 实施方案 — 点赞功能完整链路
项目: chat
类型: implementation
Phase: 3
任务: T18-T20
依赖: Phase 1（Model 层）、Phase 0.5（flexRateLimit 中间件）
Agent: vscode-copilot
日期: 2026-03-05
状态: ⬜ 待执行
---

# Phase 3 — 点赞功能完整链路

> **上游文档**: [02-技术方案.md §3.2-3.5 接口契约](../02-技术方案.md) | [§4.2 TripLikeService](../02-技术方案.md) | [§4.4 TripLikeController](../02-技术方案.md) | [§7.2 路由设计](../02-技术方案.md)
> **计划**: [IMPLEMENTATION-PLAN.md §Phase 3](../IMPLEMENTATION-PLAN.md)
> **依赖前置**: Phase 1 完成（`TripLike` Model 可用）+ Phase 0.5 完成（`flexRateLimit` 中间件可用）

---

## 一、概览

### 任务清单

| 任务 | 操作 | 文件路径 | 说明 |
|:----:|:----:|---------|------|
| T18 | 新建 | `app/service/trip/TripLikeService.ts` | 点赞业务逻辑：CRUD + 事务 + 批量查询 + 用户点赞列表 |
| T19 | 新建 | `app/controller/home/TripLikeController.ts` | 请求处理：参数校验 + 手动鉴权 + 调用 Service |
| T20 | 新建 | `app/routes/home/trip_like.ts` | 路由定义：挂载 flexRateLimit + 注册顺序 |

### 完成标准

- `POST /home/trip_like/:tripId`（点赞）可用，幂等，事务原子性
- `DELETE /home/trip_like/:tripId`（取消点赞）可用，幂等，事务原子性
- `GET /home/trip_like/:tripId/status`（查询状态）可用
- `GET /home/trip_like/list`（用户点赞列表）可用，分页，按时间倒序
- 点赞/取消接口挂载 flexRateLimit，60s/10次，Key = userId + tripId + path
- `TripLikeService.batchGetStatus()` 方法存在且可被 Phase 4 的 TripSquareController 调用
- 无 token 请求（ctx.state.user 为 null）返回 401
- `/trip_like/list` 路由注册在 `/:tripId` 系列路由之前

---

## 二、数据设计回顾

> 本节摘录 Phase 1 已建立的数据结构，供本 Phase 开发时快速查阅。

### trip_likes 集合（事件日志模式）

| 字段 | 类型 | 说明 |
|------|------|------|
| `trip_id` | ObjectId | 关联行程 |
| `user_id` | ObjectId | 操作用户 |
| `type` | `'like' \| 'unlike'` | 操作类型 |
| `del_flag` | Number（默认 0） | 软删除标记 |
| `created_at` | Date | 事件时间戳（自动） |

**核心索引**:
- `{ user_id: 1, trip_id: 1, created_at: -1 }` — 查最新操作记录
- `{ user_id: 1, created_at: -1 }` — 用户点赞列表聚合

**幂等判断逻辑**: 查询 `{user_id, trip_id}` 的最新一条记录（`sort: { created_at: -1 }`），检查其 `type` 值：
- 点赞时：最新 type 为 `'like'` → 已点赞，直接返回，不写入
- 点赞时：最新 type 为 `'unlike'` 或无记录 → 插入新记录 type=`'like'` + $inc like_count +1
- 取消时：最新 type 为 `'unlike'` 或无记录 → 已取消，直接返回，不写入
- 取消时：最新 type 为 `'like'` → 插入新记录 type=`'unlike'` + $inc like_count -1（加 `$gt: 0` 保护）

---

## 三、T18 — 新建 `app/service/trip/TripLikeService.ts`

### 3.1 文件定位

继承 Egg.js `Service` 基类（`this.ctx` 可用），放置于 `app/service/trip/` 目录（与其他行程相关 Service 并列）。

### 3.2 方法清单

| 方法签名 | 返回类型 | 说明 |
|---------|---------|------|
| `like(tripId: string, userId: string)` | `Promise<{ liked: true }>` | 点赞（事务，幂等） |
| `unlike(tripId: string, userId: string)` | `Promise<{ liked: false }>` | 取消点赞（事务，幂等） |
| `getStatus(tripId: string, userId: string)` | `Promise<{ liked: boolean }>` | 查询单行程点赞状态 |
| `batchGetStatus(tripIds: string[], userId: string)` | `Promise<Set<string>>` | 批量查询已点赞行程 ID 集合（供广场列表注入 liked 字段） |
| `listByUser(userId: string, page: number, pageSize: number)` | `Promise<{ total: number, list: TripLikeListItem[] }>` | 用户点赞列表（含行程详情+卖家信息） |

### 3.3 方法详细设计

---

#### `like(tripId, userId)` — 点赞

**步骤**:

1. **前置校验**（事务外，避免不必要的事务开销）
   - 查询 `trips` 集合：`{ _id: tripId, del_flag: 0 }` → 行程不存在则抛 `trip_not_found`
   - 检查 `sell_config.listed_in_square === true` → 未上架则抛 `trip_not_listed`
   - 使用 `this.ctx.msq.collection('trips').findOne(...)` 执行查询

2. **开启 MongoDB 事务**
   - `const session = await mongoose.startSession()`
   - `await session.withTransaction(async () => { ... })`

3. **事务内操作**（顺序严格）
   - 查最新一条 `{ user_id, trip_id }` 记录（含 `session` 选项，`sort: { created_at: -1 }`）
   - 若最新记录 type 为 `'like'` → **幂等退出**，事务内不写入，直接 return（事务提交但无变更）
   - 否则（无记录 或 最新 type 为 `'unlike'`）：
     - `this.ctx.model.TripLike.create([{ trip_id, user_id, type: 'like', del_flag: 0 }], { session })`
     - `this.ctx.model.Trip.updateOne({ _id: tripId }, { $inc: { like_count: 1 } }, { session })`

4. **返回** `{ liked: true }`

**查询工具说明**:
- 事务外前置校验 → `this.ctx.msq.collection('trips').findOne(...)`
- 事务内最新记录查询 → `this.ctx.model.TripLike.findOne(...).session(session)`（需传 session，msq 不支持 session 透传）
- 写入 → `this.ctx.model.TripLike.create()` + `this.ctx.model.Trip.updateOne()`

---

#### `unlike(tripId, userId)` — 取消点赞

**步骤**:

1. **前置校验**（事务外）
   - 只校验行程存在（`del_flag: 0`）即可，不校验 `listed_in_square`（取消点赞不需要行程在架）
   - 使用 `this.ctx.msq.collection('trips').findOne(...)` 执行查询

2. **开启 MongoDB 事务**

3. **事务内操作**
   - 查最新一条 `{ user_id, trip_id }` 记录
   - 若无记录 或 最新 type 为 `'unlike'` → **幂等退出**
   - 否则（最新 type 为 `'like'`）：
     - `this.ctx.model.TripLike.create([{ trip_id, user_id, type: 'unlike', del_flag: 0 }], { session })`
     - `this.ctx.model.Trip.updateOne({ _id: tripId }, { $inc: { like_count: -1 }, $set: {} }, { session })` — 需配合 `$max: { like_count: 0 }` 或在应用层保证 `$gt: 0`

   > ⚠️ **like_count 不为负保护**：MongoDB 不支持 `$inc` 带条件（如 `if like_count > 0`）。推荐方式：使用 `updateOne` 加 filter `{ like_count: { $gt: 0 } }`，若行程的 like_count 已为 0 则跳过 $inc（`$inc: { like_count: -1 }` 只在 like_count > 0 时执行）：
   > ```
   > // 更新条件中加入保护
   > { _id: tripId, like_count: { $gt: 0 } }
   > ```
   > 此方式不报错，`modifiedCount` 为 0 时静默跳过即可。

4. **返回** `{ liked: false }`

---

#### `getStatus(tripId, userId)` — 查询点赞状态

**步骤**:

1. 使用 `this.ctx.msq` 查询最新一条记录：
   - 集合：`trip_likes`
   - 过滤：`{ user_id: userId, trip_id: tripId, del_flag: 0 }`
   - 排序：`{ created_at: -1 }`
   - 取第一条

2. 判断：
   - 无记录 → `liked: false`
   - 最新记录 `type === 'like'` → `liked: true`
   - 最新记录 `type === 'unlike'` → `liked: false`

3. **返回** `{ liked: boolean }`

**查询工具**: `this.ctx.msq.collection('trip_likes').findOne(...)`（无事务场景，使用 msq）

---

#### `batchGetStatus(tripIds, userId)` — 批量查询点赞状态

> 此方法由 Phase 4 的 `TripSquareController` 调用，用于在广场列表中批量注入 `liked` 字段。

**步骤**:

使用 `this.ctx.model.TripLike.aggregate()` 执行以下 Pipeline：

1. **$match**: `{ user_id: userId（ObjectId）, trip_id: { $in: tripIds（ObjectId[]）}, del_flag: 0 }`
2. **$sort**: `{ created_at: -1 }`
3. **$group**: 按 `trip_id` 分组，取每组第一条记录（`$first`）的 `type` 字段
4. **$match**: 过滤 `type === 'like'` 的分组
5. **$project**: 只输出 `trip_id`

将结果的 `trip_id` 字符串收集到 `Set<string>` 并返回。

**调用方使用方式**（Phase 4 中）:
```
const likedSet = await tripLikeService.batchGetStatus(
  list.map(item => item._id.toString()),
  ctx.state.user._id.toString()
)
// 注入 liked 字段
list.forEach(item => { item.liked = likedSet.has(item._id.toString()) })
```

**查询工具**: `this.ctx.model.TripLike.aggregate()`（涉及聚合 Pipeline，使用 model）

**性能约束**: `tripIds` 数组长度上限由广场列表 `page_size ≤ 50` 控制，单次聚合数据量可控。

---

#### `listByUser(userId, page, pageSize)` — 用户点赞列表

**步骤**:

使用 `this.ctx.model.TripLike.aggregate()` 执行以下 Pipeline：

**第一阶段（取用户最新点赞状态）**:
1. **$match**: `{ user_id: userId（ObjectId）, del_flag: 0 }`
2. **$sort**: `{ created_at: -1 }`
3. **$group**: 按 `trip_id` 分组，取第一条记录的 `type` 和 `created_at`（作为 `liked_at`）
4. **$match**: 过滤 `type === 'like'`（只保留当前已点赞的行程）

**第二阶段（count 分页）**:
5. **$count**: 获取总数（用于响应 `total` 字段）

**第三阶段（join 行程详情）**:
5. **$skip** + **$limit**（分页）
6. **$lookup**: join `trips` 集合，关联 `trip_id` → `_id`
7. **$unwind**: 展开 join 结果
8. **$lookup**: join `users`（或通过跨服务调用获取卖家信息，见下方说明）

> **卖家信息获取方式**: 与 `TripSquareService.list()` 保持一致 — 从聚合结果中提取所有 `owner_id`，然后调用 user 服务批量接口 `POST /internal/users/batch` 获取，不在聚合 Pipeline 内做跨服务 $lookup。

**响应 list 字段对齐**（与广场列表接口一致）:

| 字段 | 来源 |
|------|------|
| `_id` | `trip._id` |
| `trip_name` | `trip.trip_name` |
| `trip_cover` | `trip.trip_cover` |
| `trip_brief` | `trip.trip_brief` |
| `destination` | `trip.destination` |
| `start_date` | `trip.start_date`（ISO 字符串） |
| `end_date` | `trip.end_date`（ISO 字符串） |
| `like_count` | `trip.like_count` |
| `sell_config.price` | `trip.sell_config.price` |
| `sell_config.payment_type` | `trip.sell_config.payment_type` |
| `sell_config.credit_price` | `trip.sell_config.credit_price` |
| `seller_info.nick_name` | user 服务返回 |
| `seller_info.portrait` | user 服务返回 |
| `liked` | 恒为 `true`（点赞列表中的行程必然已点赞） |
| `liked_at` | 来自 `trip_likes.created_at`（聚合中的 `$first` 值），ISO 字符串 |

**查询工具**: `this.ctx.model.TripLike.aggregate()`

---

### 3.4 错误码清单

| 错误码 | 触发时机 | 在 DSL 中的配置 |
|--------|---------|----------------|
| `trip_not_found` | 点赞时行程不存在 | Phase 0 T04 已配置 |
| `trip_not_listed` | 对未上架行程点赞 | Phase 0 T04 已配置 |

---

## 四、T19 — 新建 `app/controller/home/TripLikeController.ts`

### 4.1 文件定位

继承 Egg.js `Controller` 基类，放置于 `app/controller/home/` 目录。

> **鉴权说明**: 点赞路由放在 home 无鉴权分组（`middlewares: []`），无 `singleLogin` 中间件。Controller 必须在**每个方法第一行**手动检查 `ctx.state.user`，为 null 时抛 401。

### 4.2 手动鉴权模式（所有方法共用）

在每个方法入口处执行以下检查：
- `if (!this.ctx.state.user)` → 抛出 DSL 错误码 `LOGIN_REQUIRED`（或与项目现有 401 处理一致的方式）

> `ctx.state.user` 由全局 `visitorLimit` 中间件设置。有有效 token（visitor 或 registered）时为 `{ _id, user_type }`，无 token 或 token 无效时为 `null`。

### 4.3 方法说明

#### `like()` — 点赞

| 步骤 | 操作 |
|------|------|
| 1 | 校验 `ctx.state.user` 存在，否则抛 401 |
| 2 | 从路由参数取 `tripId`（`ctx.params.tripId`），DSL 校验为有效 ObjectId |
| 3 | 调用 `this.service.trip.tripLikeService.like(tripId, ctx.state.user._id)` |
| 4 | `ctx.success(result)` |

---

#### `unlike()` — 取消点赞

| 步骤 | 操作 |
|------|------|
| 1 | 校验 `ctx.state.user` 存在，否则抛 401 |
| 2 | 从路由参数取 `tripId`，DSL 校验为有效 ObjectId |
| 3 | 调用 `this.service.trip.tripLikeService.unlike(tripId, ctx.state.user._id)` |
| 4 | `ctx.success(result)` |

---

#### `status()` — 查询点赞状态

| 步骤 | 操作 |
|------|------|
| 1 | 校验 `ctx.state.user` 存在，否则抛 401 |
| 2 | 从路由参数取 `tripId`，DSL 校验为有效 ObjectId |
| 3 | 调用 `this.service.trip.tripLikeService.getStatus(tripId, ctx.state.user._id)` |
| 4 | `ctx.success(result)` |

---

#### `list()` — 用户点赞列表

| 步骤 | 操作 |
|------|------|
| 1 | 校验 `ctx.state.user` 存在，否则抛 401 |
| 2 | DSL 校验 Query 参数：`page`（integer，默认 1，min: 1）、`page_size`（integer，默认 20，min: 1，max: 50） |
| 3 | 调用 `this.service.trip.tripLikeService.listByUser(ctx.state.user._id, page, pageSize)` |
| 4 | `ctx.success(result)` |

### 4.4 DSL 校验规则汇总

| 接口 | 参数来源 | 字段 | 规则 |
|------|---------|------|------|
| like / unlike / status | `ctx.params` | `tripId` | `objectId`（有效 MongoDB ObjectId） |
| list | `ctx.query` | `page` | `integer`，可选，默认 1，min: 1 |
| list | `ctx.query` | `page_size` | `integer`，可选，默认 20，min: 1，max: 50 |

> DSL 校验方式以项目现有 Controller（如 `TripProjectController.ts`）的写法为准，保持风格一致。

---

## 五、T20 — 新建 `app/routes/home/trip_like.ts`

### 5.1 路由文件职责

定义并导出 `tripLikeGroup`（或与项目约定一致的分组函数名），在 Phase 5（T26）中被 `app/routes/home/index.ts` 第一分组 import 并注册。

### 5.2 路由注册顺序（⚠️ 关键）

**必须按以下顺序注册**，静态路径在动态路径之前：

| 顺序 | 方法 | 路径 | 中间件 | Controller 方法 |
|:----:|------|------|:------:|----------------|
| 1 | GET | `/home/trip_like/list` | 无（读操作，不限流） | `home.tripLikeController.list` |
| 2 | GET | `/home/trip_like/:tripId/status` | 无 | `home.tripLikeController.status` |
| 3 | POST | `/home/trip_like/:tripId` | `flexRateLimit(likeOptions)` | `home.tripLikeController.like` |
| 4 | DELETE | `/home/trip_like/:tripId` | `flexRateLimit(unlikeOptions)` | `home.tripLikeController.unlike` |

> ⚠️ **路由冲突说明**：`/trip_like/list` 是静态路径，`/trip_like/:tripId` 是动态路径。若动态路径先注册，`GET /trip_like/list` 会被匹配为 `tripId = 'list'`，导致 `getStatus` 方法接收到非法 ID。静态路径必须先注册。

### 5.3 flexRateLimit 中间件配置

点赞和取消点赞各自挂载一个 `flexRateLimit` 实例，配置相同但 Key 中的 `ctx.path` 不同（`/home/trip_like/:tripId` vs `/home/trip_like/:tripId`，实际运行时 path 相同，靠 HTTP 方法区分接口，因此 Key 中需加入 method）。

**推荐 Key 设计**（在 `keyGenerator` 中实现）:

```
key = userId + ":" + tripId + ":" + ctx.method + ":" + ctx.path
```

加入 `ctx.method`（`POST` / `DELETE`）可以更精确地将点赞和取消点赞的限流计数分开。

> 若技术方案中 Key = userId + tripId + path（`ctx.path`），而点赞和取消的 path 相同（均为 `/home/trip_like/:tripId`），则两者共享同一个限流计数器——即点赞 5 次 + 取消 5 次 = 10 次触发限流。这可能是有意设计（共享配额），以实际业务需求为准，实施时与负责人确认后选择是否加入 method 维度。

**flexRateLimit 传入配置**:

```
{
  windowMs: 60_000,
  max: 10,
  keyType: 'Custom',
  keyGenerator: (ctx) => {
    const userId = ctx.state.user?._id?.toString() ?? 'anonymous'
    const tripId = ctx.params.tripId ?? ''
    const method = ctx.method        // 可选：加入 method 维度
    return `${userId}:${tripId}:${method}:${ctx.path}`
  },
  errorCode: 'rate_limit_exceeded',
  skipOnError: true,                 // Redis 不可用时降级放行
}
```

> `anonymous` userId 的请求在路由层执行限流后，会在 Controller 第一行被手动鉴权拦截（401），因此 anonymous 的限流计数不会堆积为有效拦截——但也不会造成问题，只是徒增少量 Redis 写入。如需优化，可在 `keyGenerator` 中检测 `ctx.state.user` 为 null 时直接 return `null`（需中间件支持 null key 时跳过限流），具体以 `flex-rate-limit` 实际 API 为准。

### 5.4 与 home/index.ts 的集成（预告 Phase 5）

本文件导出的 `tripLikeGroup` 在 Phase 5（T26）中按如下方式注册：

```
// app/routes/home/index.ts 第一分组（无中间件）
// 与 visitor_trip、article 等现有无鉴权路由并列
router.use(tripLikeGroup)
```

具体注册语法以项目 `app/routes/home/index.ts` 现有分组注册方式为准。

---

## 六、接口完整规格回顾

### 6.1 点赞 `POST /home/trip_like/:tripId`

| 项目 | 说明 |
|------|------|
| 鉴权 | 无强制（home 无鉴权分组）；Controller 内手动检查，无 token 返回 401 |
| 速率限制 | 60s/10次，Key = userId + tripId + method/path |
| 幂等 | 重复点赞不报错，不重复计数 |
| 事务 | ✅ MongoDB session.withTransaction() |
| 成功响应 | `{ code: 200, data: { liked: true } }` |
| 错误码 | `trip_not_found` / `trip_not_listed` / `rate_limit_exceeded` / `LOGIN_REQUIRED` |

### 6.2 取消点赞 `DELETE /home/trip_like/:tripId`

| 项目 | 说明 |
|------|------|
| 鉴权 | 同上 |
| 速率限制 | 同上 |
| 幂等 | 未点赞时取消不报错 |
| 事务 | ✅ |
| like_count 保护 | 使用 `{ like_count: { $gt: 0 } }` 过滤，不会减为负数 |
| 成功响应 | `{ code: 200, data: { liked: false } }` |
| 错误码 | `rate_limit_exceeded` / `LOGIN_REQUIRED` |

### 6.3 查询状态 `GET /home/trip_like/:tripId/status`

| 项目 | 说明 |
|------|------|
| 鉴权 | 同上 |
| 速率限制 | ❌ 不挂载 |
| 查询工具 | `ctx.msq`（非事务，使用 monSQLize） |
| 成功响应 | `{ code: 200, data: { liked: boolean } }` |

### 6.4 用户点赞列表 `GET /home/trip_like/list`

| 项目 | 说明 |
|------|------|
| 鉴权 | 同上 |
| 速率限制 | ❌ 不挂载 |
| 查询工具 | `ctx.model.TripLike.aggregate()`（聚合 Pipeline） |
| 分页 | page / page_size，默认 20，最大 50 |
| 排序 | 按 liked_at（点赞时间）倒序 |
| 成功响应 | `{ code: 200, data: { total, list: [...] } }` |

---

## 七、执行检查清单

完成 T18-T20 后逐项验证：

| # | 检查项 | 验证方式 |
|:-:|--------|---------|
| 1 | `TripLikeService` 已导出，Egg.js 可自动加载 | 检查文件命名符合 Egg.js Service 约定（驼峰或小写） |
| 2 | `batchGetStatus` 方法存在且返回 `Set<string>` | 代码审查 |
| 3 | `like()` / `unlike()` 使用 `session.withTransaction()` | 代码审查 |
| 4 | 事务内最新记录查询传入 `session` 选项 | 代码审查 |
| 5 | `unlike()` 中 `$inc: -1` 有 `like_count: { $gt: 0 }` 保护 | 代码审查 |
| 6 | `TripLikeController` 每个方法首行校验 `ctx.state.user` | 代码审查 |
| 7 | `list` 路由（静态路径）注册在 `:tripId` 路由（动态路径）之前 | 查看 trip_like.ts 路由定义顺序 |
| 8 | `POST /:tripId` 和 `DELETE /:tripId` 均挂载 flexRateLimit | 查看路由定义 |
| 9 | `GET /list` 和 `GET /:tripId/status` 无 flexRateLimit | 查看路由定义 |
| 10 | TypeScript 编译通过（`tsc --noEmit`） | 执行编译 |

---

## 八、回滚方案

| 步骤 | 操作 | 影响范围 |
|------|------|---------|
| 1 | Phase 5（T26）中移除 `tripLikeGroup` 注册 | 路由立即失效，不影响现有功能 |
| 2 | 删除 `app/routes/home/trip_like.ts` | — |
| 3 | 删除 `app/controller/home/TripLikeController.ts` | — |
| 4 | 删除 `app/service/trip/TripLikeService.ts` | — |
| 5 | `trip_likes` 集合数据保留，不影响其他功能 | 可后续手动清理 |

> 回滚不影响广场列表接口（Phase 4），因为广场列表判断 `ctx.state.user` 有值时才调用 `batchGetStatus`，若 `TripLikeService` 不存在则不调用，列表仍可返回（不含 liked 字段）。

---

## 九、注意事项

1. **Service 方法的 ObjectId 转换**：`tripId` 和 `userId` 从 Controller 传入时为 `string` 类型，在 Service 中使用时需转为 `Types.ObjectId`（`new mongoose.Types.ObjectId(tripId)`），否则 MongoDB 查询匹配不到。
2. **时间字段格式**：`liked_at` 返回时使用 `new Date(created_at).toISOString()`，与技术方案约定的 ISO 字符串格式一致。
3. **聚合 Pipeline 中的 ObjectId 类型**：`$match` 中的 `user_id` 和 `trip_id` 必须传 `ObjectId` 类型，不能直接用字符串，否则聚合结果为空。
4. **batchGetStatus 空数组处理**：若 `tripIds` 为空数组，直接返回 `new Set()` 不执行聚合，避免无意义的数据库请求。
5. **跨服务调用降级**：`listByUser` 调用 user 服务批量接口获取卖家信息时，若接口异常，降级策略为返回空的 `seller_info`（`nick_name: ''`，`portrait: ''`），不阻断整体响应，与 `TripSquareService` 保持一致。

---

## 十、关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 技术方案 §3.2-3.5 | [../02-技术方案.md](../02-技术方案.md) | 点赞相关接口契约 |
| 技术方案 §4.2 | [../02-技术方案.md](../02-技术方案.md) | TripLikeService 模块设计 |
| 技术方案 §7.2 | [../02-技术方案.md](../02-技术方案.md) | 路由分组与注册顺序 |
| Phase 0.5 | [./phase-05-ratelimit.md](./phase-05-ratelimit.md) | flexRateLimit 中间件（本 Phase 前置依赖） |
| Phase 1 | [./phase-1-model.md](./phase-1-model.md) | TripLike Model（本 Phase 前置依赖） |
| Phase 4 | [./phase-4-square.md](./phase-4-square.md) | 广场列表（依赖本 Phase 的 batchGetStatus） |
| Phase 5 | [./phase-5-register.md](./phase-5-register.md) | 路由注册（在 home/index.ts 中注册本 Phase 的路由） |

---

*文档创建时间: 2026-03-05 | Agent: vscode-copilot | Phase: 3 | 任务: T18-T20 | 状态: ⬜ 待执行*