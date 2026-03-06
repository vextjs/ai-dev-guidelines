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
> **总操作数**: 30 项（新建 17 + 修改 10 + 删除 3）
> **涉及服务**: chat + payment

---

## 一、Phase 总览

| Phase | 名称 | 任务数 | 依赖 | 说明 |
|:-----:|------|:------:|------|------|
| 0 | DSL 多语言子目录迁移 | 9 | 无 | schema-dsl v1.2.3 子目录结构迁移，基础设施变更 |
| 0.5 | flex-rate-limit 基础设施 | 3 | 无 | 安装依赖 + 复制中间件 + Redis 配置，与 Phase 0 并行可执行 |
| 1 | Model 层 | 3 | Phase 0 | trip.ts 字段新增 + trip_like.ts 新建 + 类型声明 |
| 2 | 售卖配置 + 预览修复 | 2 | Phase 1 | DSL 验证规则 + price=0 全内容预览 |
| 3 | 点赞功能 | 3 | Phase 1, Phase 0.5 | Service（含 batchGetStatus/listByUser）→ Controller（含 list）→ Route（注意注册顺序） |
| 4 | 广场列表（单端点 + 可选鉴权） | 4 | Phase 1, Phase 3 | userAuth 扩展 → Service → Controller → Route |
| 5 | 路由注册 + 跨服务 | 3 | Phase 3, Phase 4 | index.ts 注册 + payment 侧 price=0 拦截 |

---

## 二、任务编号与依赖拓扑

```
Phase 0（DSL 迁移）         Phase 0.5（限流基础设施）
  T01 ─┐                     T10 ─┐
  T02  │                     T11  ├──→ Phase 3 可用 flexRateLimit
  T03  │                     T12 ─┘
  T04  ├──→ T07 ──→ T08 ──→ T09
  T05  │    (index)  (del)   (import)
  T06 ─┘
       │
       ▼
  Phase 1（Model）
    T13 ─┐
    T14  ├──→ Phase 2（售卖+预览）
    T15 ─┘      T16 ─┐
                      │
                 T17 ─┘
                      │
                      ├──→ Phase 3（点赞）
                      │     T18 → T19 → T20
                      │       ↑
                      │    Phase 0.5（T10-T12）
                      │
                      └──→ Phase 4（广场）
                            T21 → T22 → T23 → T24
                                        │
                                    └──→ Phase 5（注册+跨服务）
                                          T25, T26, T27
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

**Phase 0 完成标准**: DSL 多语言加载方式从对象传入改为路径自动扫描，`error_catch.ts` 从统一 index 导入合并后的 locale 对象，现有多语言 key 全部可用（无回归）。新增 `rate_limit_exceeded` 错误码三语言配置。

---

### Phase 0.5 — flex-rate-limit 基础设施

> 可与 Phase 0 并行执行，互不依赖。

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T10 | 修改 | `package.json` | — | [03-实施方案/phase-05-ratelimit.md](./03-实施方案/phase-05-ratelimit.md) | ⬜ |
| T11 | 新建 | `app/middleware/flexRateLimit.ts` | T10 | 同上 | ⬜ |
| T12 | 新建 | `config/config.flexratelimit.ts` | T11 | 同上 | ⬜ |

**Phase 0.5 完成标准**: `flex-rate-limit` 依赖已安装；`app.middleware.flexRateLimit()` 可在路由层调用；Redis 连接配置就绪；降级策略（Redis 不可用时放行）已实现。

---

### Phase 1 — Model 层（基础依赖）

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T13 | 修改 | `app/model/trip.ts` | Phase 0 | [03-实施方案/phase-1-model.md](./03-实施方案/phase-1-model.md) | ⬜ |
| T14 | 新建 | `app/model/trip_like.ts` | — | 同上 | ⬜ |
| T15 | 新建 | `typings/entity/trip_like.d.ts` | — | 同上 | ⬜ |

**Phase 1 完成标准**: `trips` 集合新增 `sell_config.listed_in_square` / `like_count` 字段 + 广场查询复合索引；`trip_likes` 集合已创建（事件日志模式），含普通复合索引 `{ user_id, trip_id, created_at: -1 }` + `{ user_id, created_at: -1 }`，**不含唯一联合索引**。

---

### Phase 2 — 售卖配置 + 预览修复

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T16 | 修改 | `app/controller/home/TripProjectController.ts` | T13 | [03-实施方案/phase-2-sell-config.md](./03-实施方案/phase-2-sell-config.md) | ⬜ |
| T17 | 修改 | `app/controller/open/TripProjectController.ts` | T13 | 同上 | ⬜ |

**Phase 2 完成标准**: `saveSellConfig` 支持 `listed_in_square` 参数 + price/credit_price 允许 0 + `form.price &&` Bug 已修复；`getPublicPreview` 在 price=0 且 credit_price=0 时展示全部行程内容。

---

### Phase 3 — 点赞功能（完整链路）

> 依赖 Phase 1（Model）+ Phase 0.5（flexRateLimit 中间件已就绪）

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T18 | 新建 | `app/service/trip/TripLikeService.ts` | T14 | [03-实施方案/phase-3-like.md](./03-实施方案/phase-3-like.md) | ⬜ |
| T19 | 新建 | `app/controller/home/TripLikeController.ts` | T18 | 同上 | ⬜ |
| T20 | 新建 | `app/routes/home/trip_like.ts` | T19 | 同上 | ⬜ |

**Phase 3 完成标准**:
- `POST /home/trip_like/:tripId`（点赞）、`DELETE /home/trip_like/:tripId`（取消）、`GET /home/trip_like/:tripId/status`（查询）、`GET /home/trip_like/list`（用户点赞列表）四个接口可用
- 点赞/取消幂等；`like_count` 原子更新且不低于 0
- 点赞/取消接口挂载 flexRateLimit，Key = 用户 ID + 行程 ID + 路径
- `/trip_like/list` 路由注册在 `/:tripId` 路由之前（防止路由冲突）
- `TripLikeService` 包含 `batchGetStatus(tripIds, userId)` 方法，供 Phase 4 的 TripSquareController 调用

---

### Phase 4 — 广场列表（home 无鉴权分组 + visitorLimit）

> 依赖 Phase 1（Model）+ Phase 3（TripLikeService.batchGetStatus 已就绪）

> ⚠️ **设计变更说明**：原设计（T21 修改 userAuth.ts + T23/T24 使用 /open 路径）已废弃。  
> 最终决策（技术方案 §2.3.4）：广场列表改为 `/home/trip_square/list`，放 home 无鉴权分组，  
> 依赖全局 `visitorLimit` 中间件自动解析 token，无需修改 `userAuth.ts`。

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T21 | 新建 | `app/service/trip/TripSquareService.ts` | T13, T18 | [03-实施方案/phase-4-square.md](./03-实施方案/phase-4-square.md) | ⬜ |
| T22 | 新建 | `app/controller/home/TripSquareController.ts` | T21 | 同上 | ⬜ |
| T23 | 新建 | `app/routes/home/trip_square.ts` | T22 | 同上 | ⬜ |

**Phase 4 完成标准**:
- `app/middleware/userAuth.ts` **不做任何修改**（已移除 optional 级别扩展需求）
- `GET /home/trip_square/list` 放 home 无鉴权分组，依赖全局 `visitorLimit` 解析 token
- 无 token 时正常返回列表，不含 `liked` 字段；有 token 时额外返回 `liked: boolean`
- 复合排序算法（匹配评分→点赞量→时间）正确工作；`keyword` 同时匹配标题和城市
- 移除独立 `city` 参数，只保留 `keyword` 单搜索框
- 分页正常；`keyword` 特殊字符已转义

---

### Phase 5 — 路由注册 + 跨服务

> ⚠️ **设计变更说明**：原 T25（修改 open/index.ts）因广场路由已改至 /home，该任务取消。  
> T26 合并承担原 T25+T26 的职责（home/index.ts 同时注册 tripSquare 和 tripLike 两组路由）。  
> 原 T27 顺移为 T26，payment 侧任务编号不变（仍为最后一个任务）。

| 任务 | 操作 | 文件路径 | 依赖 | 详细方案 | 状态 |
|:----:|:----:|---------|:----:|:--------:|:----:|
| T25 | 修改 | `app/routes/home/index.ts` | T20, T23 | [03-实施方案/phase-5-register.md](./03-实施方案/phase-5-register.md) | ⬜ |
| T26 | 修改 | `payment: app/controller/home/OrderController.ts` | — | 同上 | ⬜ |

**Phase 5 完成标准**: home 路由第一分组中 `tripSquareGroup`（广场）和 `tripLikeGroup`（点赞）均已注册生效；`app/routes/open/index.ts` **无需修改**；payment 服务在 `createTripOrder` 中检测 `price === 0` 时返回 `FREE_TRIP_NO_PAYMENT_NEEDED` 错误。

---

## 四、进度汇总

| 指标 | 值 |
|------|:--:|
| 总任务数 | 26（T01-T26，原 T21/T25/T27 旧任务已废弃，重新编排） |
| 总文件操作 | 29（chat: 新建 17 + 修改 8 + 删除 3 = 28；payment: 修改 1） |
| 已完成 | 0 |
| 进行中 | 0 |
| 未开始 | 26 |
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

## 五、实施方案文件清单

> 各 Phase 的具体代码变更见 `03-实施方案/` 目录，CP3 阶段逐步生成。

| 文件 | Phase | 任务编号 | 状态 |
|------|:-----:|:--------:|:----:|
| [phase-0-dsl.md](./03-实施方案/phase-0-dsl.md) | 0 | T01-T09 | ✅ 已生成 |
| [phase-05-ratelimit.md](./03-实施方案/phase-05-ratelimit.md) | 0.5 | T10-T12 | ✅ 已生成 |
| [phase-1-model.md](./03-实施方案/phase-1-model.md) | 1 | T13-T15 | ✅ 已生成 |
| [phase-2-sell-config.md](./03-实施方案/phase-2-sell-config.md) | 2 | T16-T17 | ✅ 已生成 |
| [phase-3-like.md](./03-实施方案/phase-3-like.md) | 3 | T18-T20 | ✅ 已生成 |
| [phase-4-square.md](./03-实施方案/phase-4-square.md) | 4 | T21-T23 | ✅ 已生成 |
| [phase-5-register.md](./03-实施方案/phase-5-register.md) | 5 | T25-T26 | ✅ 已生成 |

---

## 六、跨服务上线顺序

```
1. chat 服务先上线（Phase 0 ~ Phase 5 的 T25/T26）
   执行顺序：
     Phase 0 + Phase 0.5（可并行）
       → Phase 1（Model）
       → Phase 2（售卖配置修复）
       → Phase 3（点赞功能）
       → Phase 4（广场列表）
       → Phase 5 T25/T26（路由注册）

   上线后状态：
   - price=0 行程在 chat 侧已支持全内容预览
   - 广场列表单端点可用（可选鉴权）
   - 点赞功能完整可用（含速率限制）
   - 即使 payment 侧未更新，price=0 行程前端判断后不跳转支付页

2. payment 服务后上线（Phase 5 的 T27）
   - 仅增加 price=0 订单创建拦截（防御性编程）
   - 不影响现有支付逻辑
   - 可与 chat 服务上线间隔任意时间
```

---

## 七、验收标准（全局）

| # | 验收项 | 对应需求 | 对应 Phase |
|:-:|--------|:--------:|:----------:|
| V1 | `saveSellConfig` 支持 `listed_in_square` + price/credit_price=0 | REQ-1, REQ-2 | Phase 2 |
| V2 | price=0 且 credit_price=0 时公开预览展示全部内容 | REQ-2 | Phase 2 |
| V3 | `GET /open/trip_square/list` 免登录可访问，返回卖家信息 | REQ-3 | Phase 4 |
| V4 | `GET /open/trip_square/list` 携带有效 Token 时返回 `liked` 字段 | REQ-3 | Phase 4 |
| V5 | `keyword` 同时匹配标题和城市，城市命中优先排序 | REQ-5 | Phase 4 |
| V6 | 无关键词时按点赞量降序 → 时间降序排列 | REQ-5 | Phase 4 |
| V7 | 点赞/取消幂等，`like_count` 不为负 | REQ-4 | Phase 3 |
| V8 | `GET /home/trip_like/list` 返回用户点赞列表，含 `liked_at` | REQ-4 | Phase 3 |
| V9 | 点赞/取消超频时返回 429 及 `rate_limit_exceeded` 错误码 | REQ-4 | Phase 3 |
| V10 | payment 拦截 price=0 订单创建 | REQ-2 | Phase 5 |
| V11 | DSL 多语言迁移后现有功能无回归 | — | Phase 0 |
| V12 | flex-rate-limit Redis 不可用时限流降级放行，不阻断业务 | — | Phase 0.5 |

---

## 八、关键注意事项

### 路由注册顺序（⚠️ 易错项）

`trip_like` 路由文件中，`/list` 路由必须注册在 `/:tripId` 系列路由之前：

```
✅ 正确顺序：
  GET  /home/trip_like/list          ← 先注册静态路径
  POST /home/trip_like/:tripId       ← 后注册动态路径
  DELETE /home/trip_like/:tripId
  GET  /home/trip_like/:tripId/status

❌ 错误顺序（list 会被匹配为 tripId）：
  POST /home/trip_like/:tripId
  GET  /home/trip_like/list          ← 被误匹配为 tripId="list"
```

### flex-rate-limit Key 构成（⚠️ 核心设计）

点赞/取消点赞的限流 Key 必须包含三个维度，在 `flexRateLimit` 中间件配置中使用 `Custom` 类型自定义：

| 维度 | 来源 | 必要性 |
|------|------|:------:|
| 用户 ID | `ctx.state.user._id` | ✅ 区分不同用户 |
| 行程 ID | 路由参数 `tripId` | ✅ 区分对不同行程的操作 |
| 请求路径 | `ctx.path` | ✅ 区分点赞和取消点赞 |

### userAuth optional 级别边界（⚠️ 安全约束）

`optional` 级别**仅用于**广场列表接口，不可用于其他任何接口：
- 点赞、取消、状态查询、用户点赞列表 → 必须使用 `basic` 级别（强制 401）
- 广场列表 → 使用 `optional` 级别（静默放行）

---

## 九、关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 需求定义 | [01-需求定义.md](./01-需求定义.md) | 做什么、验收标准 |
| 技术方案 | [02-技术方案.md](./02-技术方案.md) | 怎么做（架构/接口/数据模型） |
| 实施方案 | [03-实施方案/](./03-实施方案/) | 具体改什么（逐文件变更代码） |

---

*文档创建时间: 2026-03-05 | 最后更新: 2026-03-05（实施方案已全部生成）| Agent: vscode-copilot | 状态: ✅ CP3 实施方案已生成*