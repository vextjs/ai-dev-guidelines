---
标题: Phase 4 实施方案 — 广场列表
项目: chat
类型: implementation
Phase: 4
任务: T21-T23
依赖: Phase 1（Model 层）、Phase 3（TripLikeService.batchGetStatus 可用）
Agent: vscode-copilot
日期: 2026-03-05
状态: ⬜ 待执行
---

# Phase 4 — 广场列表

> **上游文档**: [02-技术方案.md §3.1 接口契约](../02-技术方案.md) | [§4.1 TripSquareService](../02-技术方案.md) | [§4.3 TripSquareController](../02-技术方案.md) | [§7.1 路由设计](../02-技术方案.md)
> **计划**: [IMPLEMENTATION-PLAN.md §Phase 4](../IMPLEMENTATION-PLAN.md)
> **依赖前置**: Phase 1（`Trip` Model + 广场查询索引）+ Phase 3（`TripLikeService.batchGetStatus()` 已就绪）

---

## 一、概览

### 任务清单

| 任务 | 操作 | 文件路径 | 说明 |
|:----:|:----:|---------|------|
| T21 | 新建 | `app/service/trip/TripSquareService.ts` | 广场列表查询 + 复合排序 + 批量获取卖家信息 |
| T22 | 新建 | `app/controller/home/TripSquareController.ts` | 请求处理：参数校验 + liked 字段注入 |
| T23 | 新建 | `app/routes/home/trip_square.ts` | 路由定义（home 无鉴权分组） |

> ⚠️ **与 IMPLEMENTATION-PLAN.md 的差异说明**
>
> 实施计划（IMPLEMENTATION-PLAN.md）中 Phase 4 的旧描述包含 T21 修改 `userAuth.ts` 和 T23/T24 使用 `/open` 路径，这是**旧设计**，已在第三轮技术审查中废弃。
>
> **最终决策（技术方案 §2.3.4）**：
> - 广场列表路径改为 `GET /home/trip_square/list`，放在 home 无鉴权分组
> - 鉴权依赖全局 `visitorLimit` 中间件自动解析 token，无需修改 `userAuth.ts`
> - `userAuth(optional)` 设计、`parseOptionalToken` 中间件、对 `userAuth.ts` 的修改全部取消
>
> 本文档以最终决策为准。

### 完成标准

- `GET /home/trip_square/list` 接口可用，无 token 时正常返回列表（不含 liked 字段）
- 有有效 token（visitor 或 registered）时，列表每项包含 `liked: boolean` 字段
- 关键词搜索（标题 + 城市同时匹配）正常工作，结果按匹配评分排序
- 无关键词时按点赞量降序 → 创建时间降序排列
- 卖家信息（nick_name / portrait / introduction）正确填充
- 分页参数（page / page_size）生效，page_size 上限 50
- `keyword` 特殊正则字符已转义，不存在注入风险
- `app/middleware/userAuth.ts` **不做任何修改**

---

## 二、鉴权机制回顾（重要）

本 Phase 不涉及任何鉴权中间件修改，完全依赖已有的全局机制。

### 访客链路

```
前端（访客）
  → POST /open/visitor/register（user 服务）→ 获得永不过期 visitor token
  → 后续所有请求在 Authorization header 携带此 token

chat 服务全局 visitorLimit 中间件（config.middleware 中已注册）
  → ignore 列表：['/open', '/health', '/internal']
  → /home/trip_square/list 不在 ignore 列表 → 触发解析
  → JWT verify → ctx.state.user = { _id, user_type: 'visitor' }
  → /home/trip_square 路径不在 forbiddenPaths → 放行

home 路由第一分组（middlewares: []）
  → TripSquareController.list() 执行
  → ctx.state.user 已由 visitorLimit 设置好，直接读取
```

### 无 token 访问

```
visitorLimit 解析失败或无 Authorization header
  → ctx.state.user = null
  → 放行（visitorLimit 对非限制路径不阻断）

TripSquareController.list()
  → 检查 ctx.state.user → 为 null
  → 跳过 batchGetStatus 调用
  → 正常返回列表，每项不包含 liked 字段
```

### 与点赞接口的对比

| 接口 | ctx.state.user 为 null 时 | 行为 |
|------|:------------------------:|------|
| 广场列表 | 允许访问 | 正常返回，不含 liked |
| 点赞 / 取消 / 状态 / 我的列表 | 拒绝访问 | Controller 手动校验，返回 401 |

---

## 三、T21 — 新建 `app/service/trip/TripSquareService.ts`

### 3.1 文件定位

继承 Egg.js `Service` 基类（`this.ctx` 可用），放置于 `app/service/trip/` 目录，与 `TripLikeService.ts` 并列。

### 3.2 方法清单

| 方法签名 | 返回类型 | 说明 |
|---------|---------|------|
| `list(params: SquareListParams)` | `Promise<SquareListResult>` | 广场列表查询，含复合排序和卖家信息批量获取 |

其中：

```
SquareListParams = {
  keyword?: string   // 搜索关键词（可选）
  page: number       // 当前页码（默认 1）
  pageSize: number   // 每页数量（默认 20，上限 50）
}

SquareListResult = {
  total: number
  list: SquareListItem[]
}

SquareListItem = {
  _id: string
  trip_name: string
  trip_cover: string
  trip_brief: string
  destination: string
  start_date: string    // ISO 字符串
  end_date: string      // ISO 字符串
  like_count: number
  sell_config: {
    price: number
    payment_type: string
    credit_price: number
  }
  seller_info: {
    nick_name: string
    portrait: string
    introduction: string
  }
  created_at: string    // ISO 字符串
  // liked 字段不在此处注入，由 Controller 层根据 ctx.state.user 注入
}
```

### 3.3 `list()` 方法详细设计

#### 步骤一：构建基础过滤条件

所有广场列表查询必须满足以下三个基础条件：

| 字段 | 条件 | 说明 |
|------|------|------|
| `sell_config.enabled` | `true` | 售卖已启用 |
| `sell_config.listed_in_square` | `true` | 已上架广场 |
| `del_flag` | `0` | 未被软删除 |

#### 步骤二：keyword 处理

**有 keyword 时**（走聚合 Pipeline）：

1. **转义正则特殊字符**：在构建正则前，对 keyword 做转义处理，防止正则注入：
   ```
   escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
   ```

2. **匹配评分逻辑**（使用 `$addFields` + `$cond`）：

   | 条件 | 评分值 | 说明 |
   |------|:------:|------|
   | 标题和城市同时命中 | `3` | 最高优先级 |
   | 只有城市命中 | `2` | 城市命中优先于标题命中 |
   | 只有标题命中 | `1` | 最低优先级 |

   匹配判断使用大小写不敏感正则（`$regex`，`$options: 'i'`）：
   - 标题命中：`{ trip_name: { $regex: escapedKeyword, $options: 'i' } }`
   - 城市命中：`{ destination: { $regex: escapedKeyword, $options: 'i' } }`

3. **Pipeline 结构**：
   ```
   $match（基础过滤）
     → $match（标题或城市至少一个命中）
     → $addFields（_score: 匹配评分）
     → $sort（_score: -1, like_count: -1, created_at: -1）
     → $facet（count + data 分页）
   ```

4. **查询工具**：使用 `this.ctx.model.Trip.aggregate()`（涉及 addFields / facet）

**无 keyword 时**（走 msq 简单查询）：

1. 过滤条件：只有基础三条件
2. 排序：`{ like_count: -1, created_at: -1 }`
3. 分页：skip + limit
4. count 查询与 list 查询分开执行（或使用 `$facet`）
5. **查询工具**：使用 `this.ctx.msq.collection('trips').find(...)` + 排序 + 分页

> **为什么无 keyword 时用 msq**：msq（monSQLize）含查询缓存层，无 keyword 的广场列表是高频重复查询，可从缓存受益；有 keyword 时每次查询条件不同，聚合 Pipeline 无法有效缓存，直接用 model。

#### 步骤三：批量获取卖家信息

1. 从查询结果中提取所有唯一 `owner_id`（去重）
2. 调用 user 服务批量接口：`POST /internal/users/batch`，传入 `{ ids: ownerIds }`
3. 将返回的用户信息构建为 Map（`userId → userInfo`）
4. 遍历行程列表，从 Map 中取卖家信息填入 `seller_info`

**降级策略**：若 user 服务调用失败（超时 / 异常）：
- 记录 `this.ctx.logger.error`
- `seller_info` 降级为 `{ nick_name: '', portrait: '', introduction: '' }`
- 不阻断响应，继续返回列表

#### 步骤四：响应字段组装

| 字段 | 来源 | 格式 |
|------|------|------|
| `_id` | `trip._id.toString()` | 字符串 |
| `trip_name` | `trip.trip_name` | 字符串 |
| `trip_cover` | `trip.trip_cover` | 字符串（URL） |
| `trip_brief` | `trip.trip_brief` | 字符串 |
| `destination` | `trip.destination` | 字符串 |
| `start_date` | `trip.start_date` | ISO 字符串（`new Date(x).toISOString()`） |
| `end_date` | `trip.end_date` | ISO 字符串 |
| `like_count` | `trip.like_count ?? 0` | 数字（兜底 0，处理历史数据无此字段） |
| `sell_config.price` | `trip.sell_config.price` | 数字 |
| `sell_config.payment_type` | `trip.sell_config.payment_type` | `'cash' \| 'credit'` |
| `sell_config.credit_price` | `trip.sell_config.credit_price` | 数字 |
| `seller_info` | user 服务批量接口结果 | 对象 |
| `created_at` | `trip.created_at` | ISO 字符串 |

> `liked` 字段**不在此方法中处理**，由 Controller 层在调用 `batchGetStatus` 后注入。

---

## 四、T22 — 新建 `app/controller/home/TripSquareController.ts`

### 4.1 文件定位

继承 Egg.js `Controller` 基类，放置于 `app/controller/home/` 目录。

### 4.2 唯一方法：`list()`

**完整处理流程**：

| 步骤 | 操作 | 说明 |
|------|------|------|
| 1 | DSL 参数校验 | 校验 `keyword`（可选 string）、`page`（integer，默认 1，min: 1）、`page_size`（integer，默认 20，min: 1，max: 50） |
| 2 | 调用 Service | `this.service.trip.tripSquareService.list({ keyword, page, pageSize })` |
| 3 | 判断是否注入 liked | 检查 `this.ctx.state.user` 是否有值 |
| 4a | 有用户（visitor 或 registered） | 调用 `this.service.trip.tripLikeService.batchGetStatus(tripIds, userId)` |
| 4b | 无用户（null） | 跳过，不注入 liked 字段 |
| 5 | 注入 liked 字段 | 遍历 list，有用户时为每项设置 `liked = likedSet.has(item._id)` |
| 6 | 返回响应 | `this.ctx.success({ total, list })` |

### 4.3 liked 字段注入逻辑细节

```
// 伪代码描述
const { total, list } = await tripSquareService.list(params)

if (ctx.state.user) {
  const tripIds = list.map(item => item._id)
  const likedSet = await tripLikeService.batchGetStatus(tripIds, ctx.state.user._id)
  list.forEach(item => {
    item.liked = likedSet.has(item._id)
  })
}
// 若 ctx.state.user 为 null，list 中的每项不含 liked 字段
// 前端收到的字段结构因登录状态不同而有所差异（这是有意设计，见技术方案 §3.1）

ctx.success({ total, list })
```

### 4.4 DSL 校验规则

| 字段 | 来源 | 类型 | 必填 | 默认值 | 约束 |
|------|------|------|:----:|:------:|------|
| `keyword` | `ctx.query` | string | 否 | — | 无长度限制，Service 层做正则转义 |
| `page` | `ctx.query` | integer | 否 | `1` | min: 1 |
| `page_size` | `ctx.query` | integer | 否 | `20` | min: 1, max: 50 |

> DSL 校验写法以项目现有 Controller（如 `TripProjectController.ts`）的风格为准。

### 4.5 无需手动鉴权

> 与 `TripLikeController` 不同，广场列表 Controller **不需要**检查 `ctx.state.user` 是否存在，无 token 用户也可以正常访问，只是不返回 liked 字段。

---

## 五、T23 — 新建 `app/routes/home/trip_square.ts`

### 5.1 路由文件职责

定义并导出 `tripSquareGroup`（或与项目约定一致的分组函数名），在 Phase 5（T26，`app/routes/home/index.ts`）中被注册到第一分组（无中间件）。

### 5.2 路由定义

| 方法 | 路径 | 中间件 | Controller 方法 |
|------|------|:------:|----------------|
| GET | `/home/trip_square/list` | 无 | `home.tripSquareController.list` |

> **无需任何中间件**：token 解析由全局 `visitorLimit` 处理，无需路由级鉴权或限流。

### 5.3 与 home/index.ts 的集成（预告 Phase 5）

在 Phase 5（T26）中，`tripSquareGroup` 注册到 `app/routes/home/index.ts` 的**第一分组（middlewares: []）**，与 `visitor_trip`、`visitor_trip_project`、`article` 等现有无鉴权路由并列。

具体注册语法以项目 `app/routes/home/index.ts` 现有分组注册方式为准。

---

## 六、搜索与排序规则详解

> 本节展开技术方案 §五 的排序规则，便于实施时对照。

### 6.1 无关键词排序

| 优先级 | 排序字段 | 方向 | 说明 |
|:------:|---------|:----:|------|
| 1 | `like_count` | 降序 | 点赞多的行程排在前面 |
| 2 | `created_at` | 降序 | 点赞数相同时，新发布的排在前面 |

### 6.2 有关键词排序

| 优先级 | 排序字段 | 方向 | 说明 |
|:------:|---------|:----:|------|
| 1 | `_score`（匹配评分） | 降序 | 同时命中(3) > 只命中城市(2) > 只命中标题(1) |
| 2 | `like_count` | 降序 | 评分相同时，点赞多的在前 |
| 3 | `created_at` | 降序 | 评分和点赞均相同时，新发布的在前 |

### 6.3 匹配评分计算（$addFields 实现）

```
_score = 
  if (标题命中 AND 城市命中) → 3
  else if (城市命中 AND NOT 标题命中) → 2
  else if (标题命中 AND NOT 城市命中) → 1
  else → 0（不应出现，$match 已过滤）
```

MongoDB `$addFields` + `$cond` + `$or` 嵌套实现此逻辑（具体写法在实施代码中展开，本文档只描述逻辑）。

### 6.4 注意事项

- `_score` 字段是临时聚合字段，**不返回给前端**，在 `$project` 阶段排除
- 正则转义必须在构建 `$regex` 之前执行，防止用户输入 `.*` 等导致全集合扫描
- 关键词长度建议在 Controller/DSL 层不做硬限制，但 Service 层可加软保护（如超过 100 字符截断）

---

## 七、跨服务调用：user 服务批量获取卖家信息

### 7.1 接口信息

| 项目 | 说明 |
|------|------|
| 路径 | `POST /internal/users/batch` |
| 服务 | user 服务 |
| 请求 body | `{ ids: string[] }` — owner_id 数组（字符串形式） |
| 响应 | `{ users: { _id, nick_name, portrait, introduction }[] }` |
| 调用方式 | 使用 chat 服务现有的内部 HTTP 调用工具（查看现有 Service 中调用 user 服务的方式，保持一致） |

### 7.2 调用时机

在 `TripSquareService.list()` 的数据库查询完成后，提取所有 `owner_id` 去重后批量调用。不在聚合 Pipeline 内做跨服务调用。

### 7.3 owner_id 的来源

`trips` 集合中存储卖家 ID 的字段名需在实施前确认（可能是 `owner_id` 或 `user_id` 或其他，以实际 `app/model/trip.ts` 为准）。

### 7.4 降级方案

| 异常情况 | 处理方式 |
|---------|---------|
| user 服务超时 | 记录 warn 日志，seller_info 填充空值，继续返回列表 |
| user 服务返回 500 | 同上 |
| 某个 userId 在 user 服务中不存在 | Map 中该 userId 对应值为 undefined，seller_info 填充空值 |

---

## 八、执行检查清单

完成 T21-T23 后逐项验证，再进入 Phase 5：

| # | 检查项 | 验证方式 |
|:-:|--------|---------|
| 1 | 无 token 请求可正常访问，返回列表（不含 liked） | 不带 Authorization header 调用接口 |
| 2 | visitor token 请求返回列表，含 liked 字段 | 用 visitor token 调用接口 |
| 3 | registered token 请求返回列表，含 liked 字段 | 用注册用户 token 调用接口 |
| 4 | keyword 搜索标题命中，结果正确 | 传入行程标题关键词，确认有结果 |
| 5 | keyword 搜索城市命中，结果正确 | 传入目的地城市关键词，确认有结果 |
| 6 | 同时命中标题和城市的行程排在只命中一个的前面 | 构造测试数据验证排序 |
| 7 | 无 keyword 时按 like_count 降序排列 | 确认 like_count 高的行程排在前面 |
| 8 | keyword 含正则特殊字符（如 `.` `*`）时不报错 | 传入 `.*` 作为 keyword，接口正常返回 |
| 9 | `app/middleware/userAuth.ts` 未被修改 | git diff 确认该文件无变更 |
| 10 | 卖家信息正确填充，nick_name / portrait 有值 | 查看响应中 seller_info 字段 |
| 11 | user 服务异常时接口仍返回列表（seller_info 为空值） | mock user 服务返回 500，确认接口不崩溃 |
| 12 | page_size=50 正常，page_size=51 被 DSL 拒绝 | 边界值测试 |
| 13 | TypeScript 编译通过（`tsc --noEmit`） | 执行编译检查 |

---

## 九、回滚方案

| 步骤 | 操作 | 影响范围 |
|------|------|---------|
| 1 | Phase 5（T26）中移除 `tripSquareGroup` 注册 | 路由立即失效，不影响现有功能 |
| 2 | 删除 `app/routes/home/trip_square.ts` | — |
| 3 | 删除 `app/controller/home/TripSquareController.ts` | — |
| 4 | 删除 `app/service/trip/TripSquareService.ts` | — |

> 回滚不影响点赞功能（Phase 3）、Model 层（Phase 1）和任何现有接口。

---

## 十、注意事项

1. **`_score` 字段不返回前端**：在聚合 Pipeline 的最终 `$project` 阶段显式排除 `_score`，避免污染响应 JSON
2. **ObjectId 与字符串**：`batchGetStatus` 接收字符串数组，`list()` 返回的 `_id` 为字符串（`.toString()`），两者调用时类型需一致
3. **历史数据兼容**：`like_count` 字段在历史行程中可能不存在，读取时用 `?? 0` 兜底，排序时 MongoDB 会将 null 值排到 `-1` 之后（降序时排在末尾），行为符合预期
4. **聚合 $facet 用于分页 + count**：有 keyword 时推荐使用 `$facet` 在一次聚合中同时获取总数和分页数据，避免两次聚合开销：
   ```
   $facet: {
     metadata: [ { $count: 'total' } ],
     data: [ { $skip: offset }, { $limit: pageSize } ]
   }
   ```
5. **列表字段与用户点赞列表对齐**：`start_date`、`end_date` 必须包含在响应中（已在技术方案 §3.1 和 §3.5 中对齐），实施时不可遗漏

---

## 十一、关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 技术方案 §3.1 | [../02-技术方案.md](../02-技术方案.md) | 广场列表接口契约 |
| 技术方案 §4.1 | [../02-技术方案.md](../02-技术方案.md) | TripSquareService 模块设计 |
| 技术方案 §4.8 | [../02-技术方案.md](../02-技术方案.md) | visitorLimit 中间件说明 |
| 技术方案 §五 | [../02-技术方案.md](../02-技术方案.md) | 搜索与排序规则 |
| Phase 1 | [./phase-1-model.md](./phase-1-model.md) | Trip Model + 广场查询索引（前置依赖） |
| Phase 3 | [./phase-3-like.md](./phase-3-like.md) | TripLikeService.batchGetStatus（前置依赖） |
| Phase 5 | [./phase-5-register.md](./phase-5-register.md) | 路由注册（在 home/index.ts 中注册本 Phase 路由） |

---

*文档创建时间: 2026-03-05 | Agent: vscode-copilot | Phase: 4 | 任务: T21-T23 | 状态: ⬜ 待执行*