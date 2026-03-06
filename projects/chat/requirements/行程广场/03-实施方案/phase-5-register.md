---
标题: Phase 5 实施方案 — 路由注册 + 跨服务
项目: chat
类型: implementation
Phase: 5
任务: T25-T27
依赖: Phase 3（tripLikeGroup 已定义）、Phase 4（tripSquareGroup 已定义）
Agent: vscode-copilot
日期: 2026-03-05
状态: ⬜ 待执行
---

# Phase 5 — 路由注册 + 跨服务

> **上游文档**: [02-技术方案.md §七路由设计](../02-技术方案.md) | [§九改动清单 §9.4](../02-技术方案.md)
> **实施计划**: [IMPLEMENTATION-PLAN.md §Phase 5](../IMPLEMENTATION-PLAN.md)
> **依赖**: Phase 3（`tripLikeGroup` 路由文件已存在）+ Phase 4（`tripSquareGroup` 路由文件已存在）

---

## 一、概览

| 任务 | 操作 | 服务 | 文件路径 | 说明 |
|:----:|:----:|:----:|---------|------|
| T25 | 修改 | chat | `app/routes/home/index.ts` | 在第一分组（无中间件）注册 `tripSquareGroup` 和 `tripLikeGroup` |
| T26 | 修改 | payment | `app/controller/home/OrderController.ts` | `createTripOrder` 新增 price=0 拦截 |

> **注意**：原 IMPLEMENTATION-PLAN.md 中 T25 为 `open/index.ts`，T26 为 `home/index.ts`，T27 为 payment——这是旧设计（广场在 open 路由）的产物。技术方案最终确认广场列表移至 `/home`，因此：
> - `app/routes/home/index.ts` 注册两组路由（tripSquare + tripLike）
> - `app/routes/open/index.ts` **无需修改**
> - payment 侧变更保持不变
>
> 本文档以技术方案最终设计为准。

**完成标准**:
- `GET /home/trip_square/list` 接口可通过 HTTP 访问（路由已注册生效）
- `POST/DELETE/GET /home/trip_like/:tripId` 系列接口可通过 HTTP 访问
- `GET /home/trip_like/list` 可通过 HTTP 访问
- payment 服务在 `price=0` 时拦截订单创建，返回 `FREE_TRIP_NO_PAYMENT_NEEDED`

---

## 二、T25 — 修改 `app/routes/home/index.ts`（chat 服务）

### 2.1 变更说明

`app/routes/home/index.ts` 是 chat 服务 home 路由的聚合入口文件，通过分组（Group）的方式将各功能模块的路由注册到 Egg.js Router。

本次需将 Phase 3、Phase 4 中新建的两个路由文件注册到**第一分组（无中间件分组）**，与现有的 `visitor_trip`、`article` 等无鉴权路由并列。

### 2.2 变更位置

**变更内容 1 — Import 新增**

在文件顶部的 import 区域，新增以下两行 import：

| 新增 import | 来源文件 | 说明 |
|------------|---------|------|
| `tripSquareGroup`（或与文件导出名一致） | `./trip_square` | Phase 4 新建的广场路由分组 |
| `tripLikeGroup`（或与文件导出名一致） | `./trip_like` | Phase 3 新建的点赞路由分组 |

> **命名一致性**：导入名称以 Phase 3（`trip_like.ts`）和 Phase 4（`trip_square.ts`）文件实际导出的函数/对象名为准，不要自行假设命名。

**变更内容 2 — 路由注册**

在第一分组（无中间件、无 `singleLogin`）的注册区域内，追加注册两个路由分组：

```
// 广场路由（home 无鉴权分组，依赖全局 visitorLimit 解析 token）
// 与 visitor_trip、article 等现有无鉴权路由并列
tripSquareGroup(router)    // 或 router.use(tripSquareGroup) 视项目约定

// 点赞路由（home 无鉴权分组，Controller 内部手动校验 token）
tripLikeGroup(router)      // 或 router.use(tripLikeGroup) 视项目约定
```

> **注册方式**：具体调用语法（是 `group(router)` 还是 `router.use(group)`）以文件中现有分组的注册方式为准，保持完全一致。

### 2.3 注册位置确认

**必须注册在第一分组（无中间件）**，不能错误地放入有 `singleLogin` 的分组：

| 分组类型 | 中间件 | 是否注册本次路由 |
|---------|--------|:--------------:|
| 第一分组（无鉴权） | `[]`（空数组） | ✅ 注册在此 |
| 第二分组（JWT 鉴权） | `[singleLogin]` 或类似 | ❌ 不在此 |
| 其他分组 | — | ❌ 不在此 |

**验证方法**：查看现有 `visitor_trip` 路由注册在哪个分组，本次两个路由与其注册在同一分组即可。

### 2.4 为什么不需要修改 `app/routes/open/index.ts`

原 IMPLEMENTATION-PLAN.md（旧设计）中广场列表路径为 `/open/trip_square/list`，需要修改 open/index.ts。

技术方案最终决策将广场列表改为 `/home/trip_square/list`（见技术方案 §7.1、分析报告 §2.3.4），原因：
- `/open` 路径在 `visitorLimit` 的 ignore 列表中，token 不会被解析，`ctx.state.user` 永远为 null，导致无法注入 liked 字段
- `/home` 无鉴权分组中，`visitorLimit` 全局中间件会自动解析 token，`ctx.state.user` 按需注入

因此 `app/routes/open/index.ts` **无需修改**。

---

## 三、T26 — 修改 payment 服务 `app/controller/home/OrderController.ts`

### 3.1 背景

chat 服务支持 price=0 的免费行程后，前端理论上不应触发支付流程（price=0 直接使用，不需要下单）。但为了防御性编程——防止前端异常调用或未来逻辑变更导致无意义订单创建——payment 服务需在 `createTripOrder` 中增加 price=0 的校验拦截。

### 3.2 涉及方法

`OrderController.ts` 中的 `createTripOrder` 方法（或项目中对应的创建行程订单方法）。其他方法不涉及，不得修改。

### 3.3 变更位置

**变更位置**: `createTripOrder` 方法内，在构建订单对象之前（尽早拦截，避免后续无意义计算）

**变更逻辑**:

在已获取行程信息（`trip` 对象）之后，检查行程价格：

| 条件 | 处理方式 |
|------|---------|
| `trip.sell_config.price === 0` 且 `trip.sell_config.credit_price === 0` | 抛出错误码 `FREE_TRIP_NO_PAYMENT_NEEDED`，阻止订单创建 |
| 其他情况 | 保持原有逻辑，不做任何修改 |

> **两个字段都为 0 才拦截**：与 `getPublicPreview`（T17）的判断逻辑保持一致——只有「现金价格 = 0 且积分价格 = 0」才认定为完全免费，不应支付。

### 3.4 新增错误码

在 payment 服务的 DSL 多语言配置中，新增 `FREE_TRIP_NO_PAYMENT_NEEDED` 错误码的三语言配置：

| 语言 | 错误提示文案 |
|------|------------|
| zh-CN | 该行程为免费行程，无需支付 |
| en-US | This trip is free and does not require payment |
| zh-HK | 該行程為免費行程，無需付款 |

> **注意**：这是 **payment 服务**的 DSL 配置，不是 chat 服务。payment 服务的 DSL 配置文件路径需在实际开发时确认（参考 payment 服务的现有结构）。

### 3.5 注意事项

- **不修改**现有订单创建的任何其他逻辑（价格计算、库存检查、用户校验等）
- **不修改**其他类型订单（非行程订单）的处理逻辑
- **拦截时机**：在「获取行程信息」步骤之后、「构建订单对象」步骤之前，确保能读取到行程价格字段
- **降级考虑**：若调用 chat 服务获取行程价格的接口异常，payment 服务应走原有降级逻辑，不因新增判断而引入新的失败点

### 3.6 跨服务上线顺序说明

payment 服务的变更（T26）可以**晚于 chat 服务**上线：

```
上线顺序:
1. chat 服务（Phase 0 ~ Phase 5 T25）先上线
   - price=0 行程已支持
   - 前端逻辑判断 price=0 时不跳转支付页（不触发 createTripOrder）
   - 即使 payment 未更新，实际上也不会有 price=0 的订单请求

2. payment 服务（T26）后上线（防御性拦截）
   - 作为兜底保护，防止异常场景下无意义订单写入
   - 与 chat 服务上线间隔可以任意长
```

---

## 四、全功能连通性验证

T25 和 T26 完成后，进行全链路连通性验证（按接口逐一验证）：

### 4.1 广场列表端到端验证

| # | 验证场景 | 请求 | 预期结果 |
|:-:|---------|------|---------|
| 1 | 无 token 访问广场列表 | `GET /home/trip_square/list`（无 Authorization） | `{ code: 200, data: { total: N, list: [...] } }`，list 中无 `liked` 字段 |
| 2 | 携带访客 token 访问广场列表 | `GET /home/trip_square/list`（携带 visitor token） | list 中每项含 `liked: true/false` |
| 3 | 携带注册用户 token 访问广场列表 | `GET /home/trip_square/list`（携带 user token） | 同上 |
| 4 | keyword 搜索 | `GET /home/trip_square/list?keyword=xxx` | 返回标题或城市含 `xxx` 的行程，按匹配评分排序 |
| 5 | 分页 | `GET /home/trip_square/list?page=2&page_size=10` | 返回第 2 页，每页 10 条 |

### 4.2 点赞链路端到端验证

| # | 验证场景 | 请求 | 预期结果 |
|:-:|---------|------|---------|
| 6 | 无 token 点赞 | `POST /home/trip_like/:tripId`（无 Authorization） | `401` / `LOGIN_REQUIRED` |
| 7 | 访客 token 点赞 | `POST /home/trip_like/:tripId`（携带 visitor token） | `{ code: 200, data: { liked: true } }` |
| 8 | 重复点赞（幂等） | 同上再次请求 | `{ code: 200, data: { liked: true } }`，`like_count` 不变 |
| 9 | 取消点赞 | `DELETE /home/trip_like/:tripId`（携带 token） | `{ code: 200, data: { liked: false } }` |
| 10 | 查询点赞状态 | `GET /home/trip_like/:tripId/status`（携带 token） | `{ code: 200, data: { liked: false } }` |
| 11 | 用户点赞列表 | `GET /home/trip_like/list`（携带 token） | `{ code: 200, data: { total, list: [...] } }` |
| 12 | 速率限制触发 | 60s 内对同一行程 POST 超过 10 次 | `429` + `rate_limit_exceeded` |

### 4.3 售卖配置端到端验证

| # | 验证场景 | 请求 | 预期结果 |
|:-:|---------|------|---------|
| 13 | 上架广场 | `PUT /home/trip_project/trip/:tripId/sell-config`，传 `listed_in_square: true` | MongoDB 中对应行程 `sell_config.listed_in_square === true` |
| 14 | price=0 写入 | 同上传 `price: 0` | MongoDB 中 `sell_config.price === 0`（不被 Bug 过滤） |
| 15 | 关闭售卖时自动下架 | 传 `enabled: false` | MongoDB 中 `sell_config.listed_in_square === false` |
| 16 | 免费行程预览 | `GET /open/trip_project/trip/:tripId/preview`（price=0 行程） | 返回完整 `trip_days`，不截断 |

### 4.4 payment 服务验证

| # | 验证场景 | 请求 | 预期结果 |
|:-:|---------|------|---------|
| 17 | 创建免费行程订单（被拦截） | `POST /home/order/trip`（price=0 行程） | `FREE_TRIP_NO_PAYMENT_NEEDED` 错误 |
| 18 | 创建正常行程订单（不受影响） | 同上（price>0 行程） | 正常创建订单，不触发拦截 |

---

## 五、执行检查清单

完成 T25、T26 后逐项确认：

| # | 检查项 | 验证方式 |
|:-:|--------|---------|
| 1 | `tripSquareGroup` 和 `tripLikeGroup` 均已在 `home/index.ts` 第一分组注册 | 查看 home/index.ts，确认 import 和注册语句 |
| 2 | 两个路由分组注册在无中间件分组（非 singleLogin 分组） | 对比 visitor_trip 的注册位置 |
| 3 | `GET /home/trip_square/list` HTTP 可访问，返回 200 | curl 或 Postman 验证 |
| 4 | `POST /home/trip_like/:tripId` HTTP 可访问（有 token 时） | curl 验证 |
| 5 | `app/routes/open/index.ts` 未被修改（无需修改） | git diff 确认 |
| 6 | payment 服务 `createTripOrder` 包含 price=0 拦截逻辑 | 代码审查 |
| 7 | payment 服务 DSL 中 `FREE_TRIP_NO_PAYMENT_NEEDED` 错误码已配置三语言 | 检查 payment 服务 DSL 文件 |
| 8 | payment 服务现有订单创建功能无回归（price>0 行程正常下单） | 回归测试 |
| 9 | TypeScript 编译通过（chat 服务 + payment 服务） | `tsc --noEmit` |

---

## 六、回滚方案

### chat 服务回滚（T25）

| 步骤 | 操作 | 影响 |
|------|------|------|
| 1 | 从 `home/index.ts` 第一分组中移除 `tripSquareGroup` 和 `tripLikeGroup` 的 import 和注册调用 | 路由立即下线，接口返回 404 |
| 2 | 无需修改其他文件 | Phase 3/4 的 Service/Controller/路由文件保留，不影响其他功能 |

> 回滚 T25 后，广场列表和点赞接口均不可访问，但不影响售卖配置、行程预览等已上线功能。

### payment 服务回滚（T26）

| 步骤 | 操作 | 影响 |
|------|------|------|
| 1 | 还原 `OrderController.ts` 的 `createTripOrder` 方法，移除 price=0 拦截逻辑 | 恢复允许 price=0 订单创建（但前端不会触发，无实际影响） |
| 2 | DSL 错误码 `FREE_TRIP_NO_PAYMENT_NEEDED` 保留无妨（不影响任何现有功能） | — |

---

## 七、关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 技术方案 §七路由设计 | [../02-技术方案.md](../02-技术方案.md) | /home 无鉴权分组注册规范 |
| 技术方案 §九改动清单 | [../02-技术方案.md](../02-技术方案.md) | T25/T26 文件操作说明 |
| 分析报告 §2.3.4 | [../../reports/analysis/vscode-copilot/20260305/01-analysis-trip-square-tech-review.md](../../reports/analysis/vscode-copilot/20260305/01-analysis-trip-square-tech-review.md) | 广场列表从 open 移到 home 的决策依据 |
| Phase 3 | [./phase-3-like.md](./phase-3-like.md) | tripLikeGroup 来源 |
| Phase 4 | [./phase-4-square.md](./phase-4-square.md) | tripSquareGroup 来源 |
| 实施计划 | [../IMPLEMENTATION-PLAN.md](../IMPLEMENTATION-PLAN.md) | T25-T27 任务概述 |

---

*文档创建时间: 2026-03-05 | Agent: vscode-copilot | Phase: 5 | 任务: T25-T26 | 状态: ⬜ 待执行*