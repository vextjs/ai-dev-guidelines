---
标题: Phase 1 实施方案 — Model 层
项目: chat
类型: implementation
Phase: 1
任务: T13-T15
依赖: Phase 0（DSL 迁移完成）
Agent: vscode-copilot
日期: 2026-03-05
状态: ⬜ 待执行
---

# Phase 1 实施方案 — Model 层

> **上游**: [02-技术方案.md §二 数据模型设计](../02-技术方案.md)
> **计划**: [IMPLEMENTATION-PLAN.md §Phase 1](../IMPLEMENTATION-PLAN.md)
> **下游**: Phase 2（售卖配置修复）、Phase 3（点赞功能）均依赖本 Phase

---

## 一、概览

| 任务 | 操作 | 文件 | 说明 |
|:----:|:----:|------|------|
| T13 | 修改 | `app/model/trip.ts` | `sell_config` 新增 `listed_in_square`；price/credit_price min→0；顶层新增 `like_count`；新增广场查询复合索引 |
| T14 | 新建 | `app/model/trip_like.ts` | 事件日志模式点赞记录集合，含 `type` 字段和两个复合索引 |
| T15 | 新建 | `typings/entity/trip_like.d.ts` | `ITripLike` 接口 + `TripLikeTypeEnum` 枚举，供 Service/Controller 引用 |

**完成标准**:
- `trips` 集合包含 `sell_config.listed_in_square`（Boolean，默认 false）
- `trips` 集合包含 `like_count`（Number，默认 0）
- `trips` 集合 `price` / `credit_price` 最小值改为 0
- `trips` 集合新增广场查询复合索引
- `trip_likes` 集合存在，包含 `type` 字段，索引设计符合事件日志模式
- TypeScript 类型声明完整，无编译报错

---

## 二、T13 — 修改 `app/model/trip.ts`

### 2.1 变更位置

在 `sell_config` 内嵌 Schema 中进行以下修改。

### 2.2 `sell_config` 新增字段

在 `sell_config` 的 Schema 定义末尾（`enabled` 字段之后）新增：

| 字段名 | 类型 | 默认值 | 校验 | 说明 |
|--------|------|:------:|------|------|
| `listed_in_square` | Boolean | `false` | 无 | 是否上架到广场；只有 `enabled=true` 时此字段才有实际意义 |

### 2.3 `sell_config` 现有字段修改

| 字段名 | 原约束 | 新约束 | 改动原因 |
|--------|:------:|:------:|---------|
| `price` | `min: 0.99`（或 `min: 100` 分） | `min: 0` | 支持免费行程（price=0） |
| `credit_price` | `min: 1` | `min: 0` | 支持免费积分行程（credit_price=0） |

> ⚠️ **注意**：修改后 `price: 0` 是合法值。DSL 验证层（T16）也需要同步调整，否则 Controller 侧验证仍会拒绝 0 值。两者必须一致。

### 2.4 顶层新增字段

在 `trip` Schema 的顶层（与 `sell_config` 同级）新增：

| 字段名 | 类型 | 默认值 | 校验 | 说明 |
|--------|------|:------:|------|------|
| `like_count` | Number | `0` | `min: 0` | 点赞数冗余字段；由 `TripLikeService.like()` / `unlike()` 通过事务内 `$inc` 原子维护；不要求强一致，接受并发下的最终一致性 |

### 2.5 新增索引

在 `TripSchema.index(...)` 区域新增以下复合索引（降序排列，用于广场列表基础过滤 + 点赞量排序）：

| 索引字段 | 排序方向 | 用途 |
|---------|:--------:|------|
| `sell_config.enabled` | 1（升序） | 基础过滤：只查已启用售卖的行程 |
| `sell_config.listed_in_square` | 1（升序） | 基础过滤：只查已上架广场的行程 |
| `del_flag` | 1（升序） | 基础过滤：排除软删除记录 |
| `like_count` | -1（降序） | 广场默认排序：点赞量高的在前 |

> **索引命名建议**：`trip_square_list_idx`，便于 MongoDB 监控面板识别。

### 2.6 注意事项

- `like_count` 不要设置 `index: true` 单独索引，已包含在上方复合索引中
- `listed_in_square` 同理，已包含在复合索引中
- 不修改其他现有字段，避免影响 TripProjectController、TripController 等现有逻辑
- 现有数据中 `listed_in_square` 字段不存在时，MongoDB 读取为 `undefined`，`Boolean` 类型会默认读取为 `false`，与需求一致，**不需要数据迁移脚本**
- `like_count` 字段不存在的历史行程数据同理，读取为 `0`，行为符合预期

---

## 三、T14 — 新建 `app/model/trip_like.ts`

### 3.1 集合说明

**集合名**: `trip_likes`

**设计模式**: 事件日志（Append-Only）

> 每次点赞/取消点赞各插入一条新记录，**不删除、不更新**旧记录。判断某用户当前是否已点赞某行程，取该 `{user_id, trip_id}` 组合的**最新一条记录**的 `type` 值。

### 3.2 Schema 字段定义

| 字段名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|:----:|:------:|------|
| `trip_id` | ObjectId | ✅ | — | 关联行程 ID（`ref: 'Trip'`） |
| `user_id` | ObjectId | ✅ | — | 操作用户 ID（visitor 和 registered 均支持） |
| `type` | String | ✅ | — | 操作类型，枚举值：`'like'` / `'unlike'`（见 `TripLikeTypeEnum`） |
| `del_flag` | Number | ✅ | `0` | 软删除标记（与项目其他 Model 保持一致） |
| `created_at` | Date | — | 自动 | 操作时间，由 Mongoose `timestamps` 自动生成，**兼作事件时间戳** |
| `updated_at` | Date | — | 自动 | 更新时间，由 Mongoose `timestamps` 自动生成 |

> **`type` 字段约束**：使用 `enum: ['like', 'unlike']`，拒绝非法值写入。

### 3.3 索引设计

| 索引字段组合 | 类型 | 命名建议 | 用途 |
|------------|------|---------|------|
| `{ user_id: 1, trip_id: 1, created_at: -1 }` | 普通复合索引 | `trip_like_user_trip_time_idx` | **核心索引**：支持「取某用户对某行程的最新一条记录」查询；`like()` / `unlike()` 幂等判断、`getStatus()` 均依赖此索引 |
| `{ user_id: 1, created_at: -1 }` | 普通复合索引 | `trip_like_user_time_idx` | 支持用户点赞列表聚合查询（`listByUser` 按用户过滤 + 时间排序） |

> ⚠️ **严禁添加 `{ user_id, trip_id }` 唯一联合索引**：事件日志模式下同一 `{user_id, trip_id}` 组合会存在多条记录（每次操作各一条），唯一索引会导致第二次操作写入失败。幂等性由 `TripLikeService` 的事务逻辑保证，不依赖数据库约束。

### 3.4 Mongoose 配置要点

| 配置项 | 值 | 说明 |
|--------|:--:|------|
| `timestamps` | `true` | 自动管理 `created_at` / `updated_at` |
| `versionKey` | `false` | 与项目其他 Model 保持一致，不生成 `__v` 字段 |
| `collection` | `'trip_likes'` | 显式指定集合名，防止 Mongoose 自动复数化出错 |

---

## 四、T15 — 新建 `typings/entity/trip_like.d.ts`

### 4.1 文件职责

为 `trip_likes` 集合提供完整的 TypeScript 类型声明，供以下文件 import 使用：

| 使用方 | 引用内容 |
|--------|---------|
| `app/model/trip_like.ts` | `ITripLike` 接口 |
| `app/service/trip/TripLikeService.ts` | `ITripLike`、`TripLikeTypeEnum` |
| `app/controller/home/TripLikeController.ts` | `ITripLike`（可选，按项目 Controller 惯例） |

### 4.2 `TripLikeTypeEnum` 枚举

| 枚举成员 | 值 | 说明 |
|---------|:--:|------|
| `Like` | `'like'` | 点赞操作 |
| `Unlike` | `'unlike'` | 取消点赞操作 |

### 4.3 `ITripLike` 接口字段清单

| 字段名 | TypeScript 类型 | 必填 | 说明 |
|--------|----------------|:----:|------|
| `_id` | `Types.ObjectId` | — | Mongoose 自动生成 |
| `trip_id` | `Types.ObjectId` | ✅ | 关联行程 |
| `user_id` | `Types.ObjectId` | ✅ | 操作用户 |
| `type` | `TripLikeTypeEnum` | ✅ | 操作类型枚举 |
| `del_flag` | `number` | ✅ | 软删除标记 |
| `created_at` | `Date` | — | 操作时间（事件时间戳） |
| `updated_at` | `Date` | — | 更新时间 |

### 4.4 Mongoose Document 类型扩展

按照项目 `typings/entity/` 目录下其他文件的惯例，同时导出 Mongoose Document 类型：

```
ITripLikeDocument = ITripLike & Document
ITripLikeModel = Model<ITripLikeDocument>
```

具体是否需要 Document/Model 扩展，以项目其他 entity 类型文件（如 `trip.d.ts`）的写法为准，保持一致。

---

## 五、执行检查清单

执行完 T13-T15 后，在进入 Phase 2 前逐项确认：

| # | 检查项 | 验证方式 |
|:-:|--------|---------|
| 1 | `trip.ts` 中 `sell_config.listed_in_square` 字段存在，默认 `false` | 查看文件 Schema 定义 |
| 2 | `trip.ts` 中 `price` / `credit_price` 的 `min` 已改为 `0` | 查看文件 Schema 定义 |
| 3 | `trip.ts` 中 `like_count` 字段存在，默认 `0` | 查看文件 Schema 定义 |
| 4 | `trip.ts` 中广场查询复合索引已添加 | 查看 `TripSchema.index(...)` |
| 5 | `trip_like.ts` 中 `type` 字段有 `enum` 约束 | 查看文件 Schema 定义 |
| 6 | `trip_like.ts` 中**没有** `{ user_id, trip_id }` 唯一索引 | 查看文件 index 定义 |
| 7 | `trip_like.ts` 中两个复合索引均存在 | 查看文件 index 定义 |
| 8 | `trip_like.ts` 的 `timestamps: true` 已配置 | 查看 Schema options |
| 9 | `trip_like.d.ts` 中 `TripLikeTypeEnum` 枚举值与 Schema `enum` 字符串一致 | 对比两个文件 |
| 10 | TypeScript 编译无报错（`tsc --noEmit`） | 执行编译检查 |

---

## 六、与其他 Phase 的接口约定

| 依赖方 | 依赖内容 | 备注 |
|--------|---------|------|
| Phase 2（T16） | `trip.ts` 中 `price` / `credit_price` min=0；`listed_in_square` 字段存在 | T16 的 DSL 验证范围调整依赖此 |
| Phase 3（T18） | `TripLike` Model（`ctx.model.TripLike`）可用；`ITripLike`、`TripLikeTypeEnum` 可 import | T18 `TripLikeService` 直接使用 |
| Phase 3（T18） | `Trip` Model 的 `like_count` 字段存在（`$inc` 目标字段） | T18 事务内原子更新依赖此字段 |
| Phase 4（T21） | `trip.ts` 中广场查询复合索引存在 | T21 `TripSquareService` 的查询性能依赖此索引 |

---

*文档创建时间: 2026-03-05 | Agent: vscode-copilot | Phase: 1 | 任务: T13-T15*