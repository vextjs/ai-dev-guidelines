---
标题: Phase 2 实施方案 — 售卖配置 + 预览修复
项目: chat
类型: implementation
Phase: 2
任务: T16-T17
依赖: Phase 1（Model 层完成）
Agent: vscode-copilot
日期: 2026-03-05
状态: ⬜ 待执行
---

# Phase 2 实施方案 — 售卖配置 + 预览修复

> **上游文档**: [02-技术方案.md §3.6 §3.7](../02-技术方案.md)
> **实施计划**: [IMPLEMENTATION-PLAN.md §Phase 2](../IMPLEMENTATION-PLAN.md)
> **任务范围**: T16（home TripProjectController）、T17（open TripProjectController）
> **依赖**: Phase 1 完成（`trip.ts` 中 `price`/`credit_price` min=0、`listed_in_square` 字段已存在）

---

## 一、概览

| 任务 | 操作 | 文件 | 核心变更 |
|:----:|:----:|------|---------|
| T16 | 修改 | `app/controller/home/TripProjectController.ts` | DSL 验证新增 `listed_in_square`；price/credit_price 验证范围改为支持 0；修复 `form.price &&` 赋值 Bug |
| T17 | 修改 | `app/controller/open/TripProjectController.ts` | `getPublicPreview` 在 price=0 且 credit_price=0 时跳过截断，返回全部内容 |

**完成标准**:
- 卖家可通过 `PUT /home/trip_project/trip/:tripId/sell-config` 传入 `listed_in_square: true` 将行程上架广场
- `price: 0` 和 `credit_price: 0` 可正常传入并写入数据库（原 Bug 修复）
- `GET /open/trip_project/trip/:tripId/preview` 在 price=0 且 credit_price=0 时返回行程全部 `trip_days`，不截断

---

## 二、T16 — 修改 `app/controller/home/TripProjectController.ts`

### 2.1 涉及方法

本次只修改 `saveSellConfig`（或项目中对应的保存售卖配置方法）。其他方法不涉及，不得修改。

### 2.2 变更一：DSL 验证 schema 新增 `listed_in_square`

**变更位置**: `saveSellConfig` 方法中的 DSL 验证 schema 定义处

**变更内容**: 在验证 schema 的字段列表中新增 `listed_in_square` 字段

| 字段 | DSL 规则 | 说明 |
|------|---------|------|
| `listed_in_square` | `boolean`，可选，默认 `false` | 控制是否上架到广场；`enabled=false` 时传 `true` 无意义，写入逻辑会强制置 `false`（见变更四） |

> **参考**：DSL boolean 类型验证写法以项目现有 `saveSellConfig` 中其他 boolean 字段（如 `enabled`）为准，保持风格一致。

### 2.3 变更二：price / credit_price 验证范围调整

**变更位置**: `saveSellConfig` 的 DSL 验证 schema 中 `price` 和 `credit_price` 字段定义

| 字段 | 原验证规则 | 新验证规则 | 说明 |
|------|:--------:|:--------:|------|
| `price` | `min: 0.99`（或 `min: 100`，视实现单位） | `min: 0` | 支持免费行程 |
| `credit_price` | `min: 1` | `min: 0` | 支持免费积分行程 |

> ⚠️ **与 Phase 1 的一致性**：`app/model/trip.ts` 中 `price`/`credit_price` 的 Schema min 已在 T13 改为 0，Controller DSL 侧必须同步修改，否则 Model 层接受但 Controller 层仍然拒绝 0 值，导致功能无法使用。

### 2.4 变更三：修复 `form.price &&` 赋值 Bug（⚠️ 重要）

**问题描述**:

现有代码在构建 `updateData` 时，对 `price` 和 `credit_price` 使用了类似以下的 truthy 判断：

```
// 原有逻辑（示意，以实际代码为准）
if (form.price && ...) {
  updateData['sell_config.price'] = form.price
}
if (form.credit_price && ...) {
  updateData['sell_config.credit_price'] = form.credit_price
}
```

当 `price = 0` 时，`form.price` 为 falsy，条件不成立，`price: 0` **永远不会被写入数据库**，导致免费行程功能无法正常保存。

**修复方案**:

将 truthy 判断改为 `!== undefined` 判断：

```
// 修复后逻辑（示意）
if (form.price !== undefined && ...) {
  updateData['sell_config.price'] = form.price
}
if (form.credit_price !== undefined && ...) {
  updateData['sell_config.credit_price'] = form.credit_price
}
```

> ⚠️ **执行前必须**：仔细阅读 `saveSellConfig` 方法的完整实现，找到所有对 `price` 和 `credit_price` 做赋值判断的位置，确保修复全部覆盖。某些项目用链式 `&&` 做了多重判断，需逐一检查。

### 2.5 变更四：写入 `listed_in_square` 字段

**变更位置**: `updateData` 对象构建区域

**逻辑规则**:

| 条件 | `listed_in_square` 写入值 | 说明 |
|------|:------------------------:|------|
| `form.enabled === true` | `form.listed_in_square`（取传入值，默认 `false`） | 只有售卖启用时，上架广场才有意义 |
| `form.enabled === false` | `false`（强制） | 售卖关闭时自动下架广场，防止无效上架状态 |
| `form.enabled` 未传入（只更新价格等） | 不写入该字段（不修改现有值） | 不影响现有上架状态 |

> **联动逻辑说明**：卖家在关闭售卖时，系统自动将 `listed_in_square` 置为 `false`，无需前端额外处理。这一行为应在接口响应中体现（返回最新的 `sell_config` 对象，含 `listed_in_square` 字段）。

### 2.6 变更五：响应中包含 `listed_in_square`

**变更位置**: `saveSellConfig` 方法的响应构建处

在返回的 `sell_config` 对象中新增 `listed_in_square` 字段，确保前端可以读取到最新状态。

响应结构示例（在现有 sell_config 响应字段基础上追加）：

```
sell_config: {
  enabled: boolean,
  price: number,
  credit_price: number,
  payment_type: string,
  // ... 其他现有字段
  listed_in_square: boolean   ← 新增
}
```

### 2.7 完整变更位置速查

| 变更 | 代码区域 | 改动类型 |
|------|---------|---------|
| DSL schema 新增 `listed_in_square` | DSL 验证 schema 定义 | 追加字段 |
| `price` min 改为 0 | DSL schema `price` 字段规则 | 修改值 |
| `credit_price` min 改为 0 | DSL schema `credit_price` 字段规则 | 修改值 |
| `form.price &&` → `form.price !== undefined` | updateData 构建逻辑 | 条件修改 |
| `form.credit_price &&` → `form.credit_price !== undefined` | updateData 构建逻辑 | 条件修改 |
| 写入 `sell_config.listed_in_square` | updateData 构建逻辑 | 新增字段写入 |
| 响应新增 `listed_in_square` | 响应构建 / ctx.success() 入参 | 追加字段 |

---

## 三、T17 — 修改 `app/controller/open/TripProjectController.ts`

### 3.1 涉及方法

本次只修改 `getPublicPreview`（或项目中对应的公开预览方法）。其他方法不涉及。

### 3.2 变更：price=0 时返回全部内容

**变更位置**: `getPublicPreview` 方法中截断 `trip_days` 的逻辑处

**原逻辑**（示意）：

```
// 根据 preview_days 截断行程天数
const previewDays = trip.sell_config.preview_days ?? 3
const visibleDays = trip.trip_days.slice(0, previewDays)
return ctx.success({ ...trip, trip_days: visibleDays })
```

**新逻辑**：

在执行截断前，先判断是否为免费行程。免费行程（`price === 0` 且 `credit_price === 0`）相当于完全公开，无需截断，直接返回全部 `trip_days`：

| 条件 | 处理方式 |
|------|---------|
| `sell_config.price === 0` 且 `sell_config.credit_price === 0` | 跳过截断，返回完整 `trip_days` |
| 其他情况（price > 0 或 credit_price > 0） | 保持原有 `preview_days` 截断逻辑，不变 |

**判断字段说明**:

| 字段 | 来源 | 说明 |
|------|------|------|
| `sell_config.price` | `trip.sell_config.price` | 现金价格，0 表示免费 |
| `sell_config.credit_price` | `trip.sell_config.credit_price` | 积分价格，0 表示免费 |

> **两个字段都必须为 0** 才认定为免费行程，防止「现金免费但积分收费」的情况被误判为完全免费。

### 3.3 注意事项

- **不修改**行程的获取逻辑，只在现有结果基础上加判断
- **不影响**已购买用户的完整查看逻辑（那是另一个接口）
- **不修改** `payment_type` 的判断，本次只关注 price 和 credit_price 的值
- 若 `sell_config` 为 null（行程未配置售卖），应做防御性判断，此时走原有截断逻辑即可

---

## 四、两个任务的独立性说明

T16 和 T17 修改不同文件，**可并行执行**，互不依赖。两个任务共同依赖 Phase 1（T13），因为：

- T16 依赖 `trip.ts` 中 `listed_in_square` 字段存在（才能写入）
- T17 依赖 `trip.ts` 中 `price` / `credit_price` min=0（才能查询到 price=0 的行程）

---

## 五、回归影响分析

| 受影响接口 | 变更前行为 | 变更后行为 | 回归风险 |
|-----------|---------|---------|:------:|
| `PUT /home/trip_project/trip/:tripId/sell-config` | price 不能传 0 | price 可传 0 | 低（放宽限制，不破坏旧行为） |
| `PUT /home/trip_project/trip/:tripId/sell-config` | 无 `listed_in_square` | 支持 `listed_in_square` | 低（新增可选字段） |
| `GET /open/trip_project/trip/:tripId/preview` | 始终按 preview_days 截断 | price=0 时返回全部 | 低（只影响 price=0 的行程，目前数据库中不存在） |
| 其他 TripProjectController 方法 | 不变 | 不变 | 无 |

---

## 六、执行检查清单

完成 T16、T17 后逐项确认，再进入 Phase 3：

| # | 检查项 | 验证方式 |
|:-:|--------|---------|
| 1 | `listed_in_square: true` 可正常传入并写入 `trips` 集合 | 调用接口后查 MongoDB，确认字段值 |
| 2 | `price: 0` 可正常写入数据库（不被 Bug 过滤） | 传 price=0，查 MongoDB 确认 `sell_config.price === 0` |
| 3 | `credit_price: 0` 可正常写入数据库 | 同上 |
| 4 | `enabled=false` 时 `listed_in_square` 被强制写为 `false` | 传 enabled=false + listed_in_square=true，查 MongoDB |
| 5 | 响应中包含 `listed_in_square` 字段 | 检查接口响应 JSON |
| 6 | price=0 且 credit_price=0 的行程预览返回完整 `trip_days` | 调用预览接口，确认返回天数等于行程总天数 |
| 7 | price=100 的行程预览仍按 `preview_days` 截断 | 调用现有收费行程预览，确认行为不变 |
| 8 | TypeScript 编译无报错 | `tsc --noEmit` |

---

## 七、与下游 Phase 的接口约定

| 下游 Phase | 依赖 T16/T17 的内容 |
|------------|-------------------|
| Phase 3（T18 TripLikeService） | `trip.sell_config.listed_in_square` 字段可写入，`TripLikeService.like()` 在校验行程是否上架时会读取此字段 |
| Phase 4（T21 TripSquareService） | 广场查询过滤条件 `sell_config.listed_in_square: true`，数据库中需有合法数据才能验证功能 |

---

*文档创建时间: 2026-03-05 | Agent: vscode-copilot | Phase: 2 | 任务: T16-T17*