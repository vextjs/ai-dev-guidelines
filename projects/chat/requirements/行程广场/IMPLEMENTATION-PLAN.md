---
标题: 行程广场实施计划
项目: chat
类型: implementation-plan
Agent: zed-copilot
日期: 2026-03-05
状态: 📝 CP3 待确认
---

# 行程广场实施计划

> **上游文档**: [02-技术方案.md](./02-技术方案.md) | [01-需求定义.md](./01-需求定义.md)
> **实施方案**: [03-实施方案/](./03-实施方案/)
> **总操作数**: 29 项（新建 16 + 修改 10 + 删除 3）
> **涉及服务**: chat + payment

---

## 一、Phase 总览

| Phase | 名称 | 任务数 | 依赖 | 说明 |
|:-----:|------|:------:|------|------|
| 0 | DSL 多语言子目录迁移 | 9 | 无 | schema-dsl v1.2.3 子目录结构迁移，基础设施变更 |
| 1 | Model 层 | 3 | Phase 0 | trip.ts 字段新增 + trip_like.ts 新建 + 类型声明 |
| 2 | 售卖配置 + 预览修复 | 2 | Phase 1 | DSL 验证规则 + price=0 全内容预览 |
| 3 | 点赞功能 | 3 | Phase 1 | Service → Controller → Route 完整链路 |
| 4 | 广场列表（双端点 + 卖家信息） | 5 | Phase 1, Phase 3 | Service → Controller(open+home) → Route 完整链路 |
| 5 | 路由注册 + 跨服务 | 3 | Phase 3, Phase 4 | index.ts 注册 + payment 侧 price=0 拦截 |

---

## 二、任务编号与依赖拓扑

```
Phase 0（DSL 迁移）         Phase 1（Model）
  T01 ─┐                     T10 ─┐
  T02  │                     T11  ├──→ Phase 2（售卖+预览）
  T03  │                     T12 ─┘      T13 ─┐
  T04  ├──→ T07 ──→ T08 ──→ T09              │
  T05  │    (index)  (del)   (import)    T14 ─┘
  T06 ─┘                                  │
                                           ├──→ Phase 3（点赞）
                              T10 ────────→│     T15 → T16 → T17
                                           │
                                           ├──→ Phase 4（广场）
                                           │     T18 → T19 ─┐
                                           │           T20 ─┤
                                           │           T21 ─┤
                                           │           T22 ─┘
                                           │
                                           └──→ Phase 5（注册+跨服务）
                                                 T23, T24, T25
```

---

## 三、任务进度表

### Phase 0 — DSL 多语言子目录迁移

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T01 | 新建 | `config/dsl/core/zh-CN.ts` | — | [03-实施方案/phase-0-dsl.md](./03-实施方案/phase-0-dsl.md) | ⬜ |
| T02 | 新建 | `config/dsl/core/en-US.ts` | — | 同上 | ⬜ |
| T03 | 新建 | `config/dsl/core/zh-HK.ts` | — | 同上 | ⬜ |
| T04 | 新建 | `config/dsl/trip_square/zh-CN.ts` | — | 同上 | ⬜ |
| T05 | 新建 | `config/dsl/trip_square/en-US.ts` | — | 同上 | ⬜ |
| T06 | 新建 | `config/dsl/trip_square/zh-HK.ts` | — | 同上 | ⬜ |
| T07 | 重写 | `config/dsl/index.ts` | T01-T06 | 同上 | ⬜ |
| T08 | 删除 | `config/dsl/zh.ts` + `en.ts` + `hk.ts` | T07 | 同上 | ⬜ |
| T09 | 修改 | `app.ts` + `app/utils/ex-error/error_catch.ts` | T07 | 同上 | ⬜ |

**Phase 0 完成标准**: DSL 多语言加载方式从对象传入改为路径自动扫描，`error_catch.ts` 从统一 index 导入合并后的 locale 对象，现有多语言 key 全部可用（无回归）。

---

### Phase 1 — Model 层（基础依赖）

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T10 | 修改 | `app/model/trip.ts` | Phase 0 | [03-实施方案/phase-1-model.md](./03-实施方案/phase-1-model.md) | ⬜ |
| T11 | 新建 | `app/model/trip_like.ts` | — | 同上 | ⬜ |
| T12 | 新建 | `typings/entity/trip_like.d.ts` | — | 同上 | ⬜ |

**Phase 1 完成标准**: `trips` 集合新增 `sell_config.listed_in_square` / `like_count` 字段 + 广场查询复合索引；`trip_likes` 集合已创建含联合唯一索引。

---

### Phase 2 — 售卖配置 + 预览修复

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T13 | 修改 | `app/controller/home/TripProjectController.ts` | T10 | [03-实施方案/phase-2-sell-config.md](./03-实施方案/phase-2-sell-config.md) | ⬜ |
| T14 | 修改 | `app/controller/open/TripProjectController.ts` | T10 | 同上 | ⬜ |

**Phase 2 完成标准**: `saveSellConfig` 支持 `listed_in_square` 参数 + price/credit_price 允许 0 + `form.price &&` Bug 已修复；`getPublicPreview` 在 price=0 时展示全部行程内容。

---

### Phase 3 — 点赞功能（完整链路）

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T15 | 新建 | `app/service/trip/TripLikeService.ts` | T11 | [03-实施方案/phase-3-like.md](./03-实施方案/phase-3-like.md) | ⬜ |
| T16 | 新建 | `app/controller/home/TripLikeController.ts` | T15 | 同上 | ⬜ |
| T17 | 新建 | `app/routes/home/trip_like.ts` | T16 | 同上 | ⬜ |

**Phase 3 完成标准**: `POST /home/trip_like/:tripId`（点赞）、`DELETE /home/trip_like/:tripId`（取消）、`GET /home/trip_like/:tripId/status`（查询）三个接口可用；点赞/取消幂等；`like_count` 原子更新且不低于 0。

---

### Phase 4 — 广场列表（双端点 + 卖家信息）

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T18 | 新建 | `app/service/trip/TripSquareService.ts` | T10, T15 | [03-实施方案/phase-4-square.md](./03-实施方案/phase-4-square.md) | ⬜ |
| T19 | 新建 | `app/controller/open/TripSquareController.ts` | T18 | 同上 | ⬜ |
| T20 | 新建 | `app/controller/home/TripSquareController.ts` | T18 | 同上 | ⬜ |
| T21 | 新建 | `app/routes/open/trip_square.ts` | T19 | 同上 | ⬜ |
| T22 | 新建 | `app/routes/home/trip_square.ts` | T20 | 同上 | ⬜ |

**Phase 4 完成标准**: `GET /open/trip_square/list` 返回广场列表 + 卖家信息（免登录）；`GET /home/trip_square/list` 额外返回 `liked` 点赞状态（需登录）；复合排序算法（城市优先→标题→点赞量→时间）正确工作；分页正常。

---

### Phase 5 — 路由注册 + 跨服务

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T23 | 修改 | `app/routes/open/index.ts` | T21 | [03-实施方案/phase-5-register.md](./03-实施方案/phase-5-register.md) | ⬜ |
| T24 | 修改 | `app/routes/home/index.ts` | T17, T22 | 同上 | ⬜ |
| T25 | 修改 | `payment: app/controller/home/OrderController.ts` | — | 同上 | ⬜ |

**Phase 5 完成标准**: open/home 路由组中广场和点赞路由已注册生效；payment 服务在 `createTripOrder` 中检测 `credit_price === 0` 时返回 `FREE_TRIP_NO_PAYMENT_NEEDED` 错误。

---

## 四、进度汇总

| 指标 | 值 |
|------|:--:|
| 总任务数 | 25（T01-T25） |
| 总文件操作 | 29（含批量删除和批量修改） |
| 已完成 | 0 |
| 进行中 | 0 |
| 未开始 | 25 |
| 完成率 | 0% |

### 状态图例

| 图标 | 含义 |
|:----:|------|
| ⬜ | 未开始 |
| 🔄 | 进行中 |
| ✅ | 已完成 |
| ⚠️ | 已完成但有问题 |
| ❌ | 已取消 |

---

## 五、跨服务上线顺序

```
1. chat 服务先上线（Phase 0-4 + Phase 5 的 T23/T24）
   - DSL 迁移 → Model → 售卖配置修复 → 点赞 → 广场列表 → 路由注册
   - price=0 的行程在 chat 侧已支持全内容预览
   - 即使 payment 侧未更新，price=0 行程也不会被误购买
     （前端判断 price=0 直接展示，不跳转支付页）

2. payment 服务后上线（Phase 5 的 T25）
   - 仅增加 price=0 拦截（防御性编程），不影响现有支付逻辑
   - 可与 chat 服务上线间隔任意时间
```

---

## 六、验收标准（全局）

| # | 验收项 | 对应需求 | 对应 Phase |
|:-:|--------|:--------:|:----------:|
| V1 | `saveSellConfig` 支持 `listed_in_square` + price/credit_price=0 | REQ-1, REQ-2 | Phase 2 |
| V2 | price=0 行程公开预览展示全部内容 | REQ-2 | Phase 2 |
| V3 | `GET /open/trip_square/list` 免登录访问，返回卖家信息 | REQ-3 | Phase 4 |
| V4 | `GET /home/trip_square/list` 登录后返回卖家信息 + 点赞状态 | REQ-3 | Phase 4 |
| V5 | keyword 同时匹配标题和目的地，城市匹配优先排序 | REQ-5 | Phase 4 |
| V6 | 点赞/取消幂等，like_count 不为负 | REQ-4 | Phase 3 |
| V7 | payment 拦截 price=0 订单创建 | REQ-2 | Phase 5 |
| V8 | DSL 多语言迁移后现有功能无回归 | — | Phase 0 |

---

## 七、关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求定义 | [01-需求定义.md](./01-需求定义.md) | 做什么、验收标准 |
| 技术方案 | [02-技术方案.md](./02-技术方案.md) | 怎么做（架构/接口/数据模型） |
| 实施方案 | [03-实施方案/](./03-实施方案/) | 具体改什么（逐文件变更代码） |

---

*文档创建时间: 2026-03-05 | Agent: zed-copilot | 状态: 📝 CP3 待确认*