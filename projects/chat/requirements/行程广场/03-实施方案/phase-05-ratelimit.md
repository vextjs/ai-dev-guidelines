---
标题: Phase 0.5 — flex-rate-limit 基础设施
项目: chat
类型: implementation
Phase: "0.5"
任务: T10-T12
依赖: 无（可与 Phase 0 并行执行）
Agent: vscode-copilot
日期: 2026-03-05
状态: ⬜ 待执行
---

# Phase 0.5 — flex-rate-limit 基础设施

> **上游文档**: [02-技术方案.md §六速率限制设计](../02-技术方案.md)  
> **实施计划**: [IMPLEMENTATION-PLAN.md Phase 0.5](../IMPLEMENTATION-PLAN.md)  
> **任务范围**: T10（package.json）、T11（flexRateLimit 中间件）、T12（Redis 配置）

---

## 一、Phase 概览

### 目标

为 chat 服务引入 `flex-rate-limit` 速率限制能力，供 Phase 3 点赞接口路由层挂载使用。本 Phase 只做基础设施搭建，不涉及业务逻辑。

### 任务清单

| 任务 | 操作 | 文件路径 | 状态 |
|:----:|:----:|---------|:----:|
| T10 | 修改 | `package.json` | ⬜ |
| T11 | 新建 | `app/middleware/flexRateLimit.ts` | ⬜ |
| T12 | 新建 | `config/config.flexratelimit.ts` | ⬜ |

### 完成标准

- `flex-rate-limit` 依赖已安装，`package.json` 版本锁定
- `app.middleware.flexRateLimit()` 可在路由层作为 Egg.js 路由中间件调用
- 中间件支持 Custom 类型 Key（userId + tripId + path 三维组合）
- Redis 配置完整，复用 chat 服务现有 Redis 实例
- Redis 不可用时中间件**降级放行**，不阻断业务

---

## 二、背景与依赖分析

### 2.1 user 服务现有实现

chat 服务无 `flex-rate-limit`，但 user 服务已有成熟实现（`user/app/middleware/flexRateLimit.ts`）。本 Phase 从 user 服务复制并做以下适配：

| 适配项 | user 服务 | chat 服务 |
|--------|---------|---------|
| Redis 配置 key | `user.redis.rateLimit` | 复用 chat 服务现有 Redis 配置 |
| 中间件注册方式 | 全局注册 | **路由级别**挂载（仅点赞接口） |
| Key 类型 | IP / UserId / Custom | 只需 Custom 类型 |
| 降级策略 | Redis 不可用时 pass | 保持一致：Redis 不可用时 pass |

### 2.2 为什么不全局注册

`flex-rate-limit` 在 chat 服务中**只用于点赞/取消点赞接口**，其他接口不需要限流。若全局注册会给所有接口增加无意义的 Redis 查询开销。Egg.js 支持路由级别中间件（通过 `router.get(path, middleware, controller)` 形式），在 Phase 3 路由文件中按需挂载。

### 2.3 限流规则复习

| 参数 | 值 |
|------|----|
| 作用接口 | `POST /home/trip_like/:tripId`（点赞）、`DELETE /home/trip_like/:tripId`（取消） |
| 时间窗口 | 60 秒 |
| 最大次数 | 10 次 |
| 算法 | Fixed Window |
| Key | `userId + ":" + tripId + ":" + ctx.path` |

> **`GET /home/trip_like/list` 和 `GET /home/trip_like/:tripId/status` 不挂载限流**，仅写操作受限。

---

## 三、逐任务变更说明

### T10 — 修改 `package.json`

**变更类型**: 新增依赖

**变更位置**: `dependencies` 字段

**新增内容**:

```
"flex-rate-limit": "<与 user 服务一致的版本>"
```

> ⚠️ **执行前检查**：先查看 `user/package.json` 中 `flex-rate-limit` 的版本号，chat 服务必须使用**相同版本**，避免 API 差异导致适配问题。

**执行命令**:
```
npm install flex-rate-limit@<版本号> --save
```

安装完成后确认 `package-lock.json` 已同步更新。

---

### T11 — 新建 `app/middleware/flexRateLimit.ts`

**变更类型**: 新建文件

**来源**: 从 `user/app/middleware/flexRateLimit.ts` 复制，按以下要点适配

#### 文件职责

Egg.js 路由级中间件工厂函数，接收限流配置选项，返回一个 Koa 中间件。调用方式：

```
router.post('/home/trip_like/:tripId', app.middleware.flexRateLimit({...}), controller.like)
```

#### 关键实现要点

**1. 工厂函数签名**

```
export default function flexRateLimitMiddleware(
  options: FlexRateLimitOptions,
  app: Application
): Middleware
```

其中 `FlexRateLimitOptions` 包含：
- `windowMs`: 时间窗口（毫秒）
- `max`: 窗口内最大请求数
- `keyType`: `'IP' | 'UserId' | 'Custom'`
- `keyGenerator`: `(ctx: Context) => string`（keyType 为 Custom 时必填）
- `errorCode`: 触发限流时的 DSL 错误码（默认 `'rate_limit_exceeded'`）

**2. Custom Key 生成逻辑**

点赞接口的 Key 生成规则（由路由层传入 `keyGenerator`）：
```
key = ctx.state.user._id + ":" + ctx.params.tripId + ":" + ctx.path
```
三个维度缺一不可（见技术方案 §六速率限制设计）。

**3. 降级策略（核心）**

Redis 不可用时，中间件必须**静默放行**，不能抛出异常阻断业务：
- 捕获所有 Redis 操作异常
- 异常时记录 `ctx.logger.warn`，然后调用 `next()`
- 不向客户端暴露 Redis 错误

**4. 触发限流时的响应**

- HTTP 状态码：`429`
- 响应头：`X-RateLimit-Limit`、`X-RateLimit-Remaining`、`X-RateLimit-Reset`
- 响应体：通过 `ctx.fail()` 或等效方式抛出 DSL 错误码 `rate_limit_exceeded`（由 `error_catch.ts` 统一处理）

**5. Redis 客户端获取**

使用 chat 服务现有的 Redis 配置（`app.redis` 或 `app.config.redis`），不新建 Redis 连接。具体 key 参考 `config/config.flexratelimit.ts`（T12）中的配置项。

#### 与 user 服务实现的差异点

| 项目 | user 服务 | chat 服务（本文件） |
|------|---------|--------------|
| 注册方式 | 全局中间件（`config.middleware`） | 路由级别（工厂函数） |
| 支持的 keyType | 全部（IP/UserId/Custom） | 只需 Custom，但保留全部支持以备扩展 |
| 错误响应方式 | `ctx.fail(errorCode)` | 与 chat 服务统一，视 `error_catch.ts` 实现调整 |

---

### T12 — 新建 `config/config.flexratelimit.ts`

**变更类型**: 新建文件

**文件职责**: 将 flex-rate-limit 相关配置集中管理，供 `flexRateLimit.ts` 中间件读取。

#### 配置内容说明

| 配置项 | 值 | 说明 |
|--------|:--:|------|
| `redisKey` | `'rateLimit'`（或与 chat 现有 Redis 命名空间一致） | Redis key 前缀 |
| `defaultWindowMs` | `60000`（60 秒） | 默认时间窗口 |
| `defaultMax` | `10` | 默认最大次数 |
| `algorithm` | `'fixed-window'` | 限流算法 |
| `skipOnError` | `true` | Redis 不可用时放行 |

#### 导出结构

```
export const flexRateLimitConfig = {
  redis: {
    // 复用 chat 服务现有 Redis 配置 key，不新建连接
    // 例如 app.redis（若 chat 服务使用 egg-redis 插件）
  },
  defaultOptions: {
    windowMs: 60_000,
    max: 10,
    algorithm: 'fixed-window',
    skipOnError: true,
  },
}
```

> **执行前检查**：查看 chat 服务 `config/config.default.ts` 中 Redis 相关配置，确认 Redis client 的获取方式（`app.redis` / `app.redis.get('name')` 等），在 `flexRateLimit.ts` 中使用一致的方式。

---

## 四、在路由层的使用方式（预告 Phase 3）

本 Phase 只建基础设施，实际挂载在 Phase 3 路由文件中完成。下面是 Phase 3 中 `trip_like.ts` 路由文件的挂载方式说明（供本 Phase 验证设计是否合理）：

**点赞路由挂载示例（文字描述）**：

在 `app/routes/home/trip_like.ts` 中，对 `POST /:tripId`（点赞）和 `DELETE /:tripId`（取消）两个路由，以**路由级别**方式挂载 `flexRateLimit` 中间件，传入以下配置：

```
{
  windowMs: 60_000,          // 60 秒
  max: 10,                   // 最多 10 次
  keyType: 'Custom',
  keyGenerator: (ctx) => {
    // 三维组合 Key：userId + tripId + path
    const userId = ctx.state.user?._id?.toString() ?? 'anonymous'
    const tripId = ctx.params.tripId ?? ''
    return `${userId}:${tripId}:${ctx.path}`
  },
  errorCode: 'rate_limit_exceeded',
}
```

`GET /trip_like/list` 和 `GET /trip_like/:tripId/status` **不挂载** flexRateLimit。

---

## 五、完成验证清单

执行完 T10-T12 后，逐项验证：

| # | 验证项 | 验证方式 |
|:-:|--------|---------|
| 1 | `flex-rate-limit` 依赖已安装 | `cat package.json` 确认 dependencies 中存在，`node_modules/flex-rate-limit` 目录存在 |
| 2 | `app/middleware/flexRateLimit.ts` 导出为工厂函数 | TypeScript 编译无报错；导出签名符合 Egg.js 路由级中间件规范 |
| 3 | `config/config.flexratelimit.ts` 配置正确 | 导入配置后 `defaultOptions.windowMs` 为 60000 |
| 4 | Redis 配置复用现有实例 | 不新增 Redis 连接配置；`app.redis` 路径与现有保持一致 |
| 5 | Redis 不可用时降级放行 | 单测 mock Redis 抛出异常，中间件调用 `next()` 不抛出 |
| 6 | TypeScript 编译通过 | `tsc --noEmit` 无报错 |

---

## 六、回滚方案

| 步骤 | 操作 |
|------|------|
| 1 | 从 `app/routes/home/trip_like.ts` 路由中移除 `flexRateLimit` 中间件（Phase 3 回滚时操作） |
| 2 | 删除 `app/middleware/flexRateLimit.ts` |
| 3 | 删除 `config/config.flexratelimit.ts` |
| 4 | `npm uninstall flex-rate-limit`，还原 `package.json` |

> 回滚不影响点赞功能本身，只是移除限流保护。

---

## 七、注意事项

1. **版本一致性**：`flex-rate-limit` 必须与 user 服务版本相同，避免 API 差异
2. **不全局注册**：`config/config.default.ts` 中的 `config.middleware` 数组**不添加** `flexRateLimit`，保持路由级别按需挂载
3. **Key 唯一性**：Redis 中的 key 需加服务命名空间前缀（如 `chat:ratelimit:`），避免与其他服务的限流 key 冲突
4. **anonymous 用户**：`keyGenerator` 中，若 `ctx.state.user` 为 null（无 token 请求），`userId` 部分用 `'anonymous'` 代替，但此类请求会被 Controller 手动鉴权拦截（401），实际上不会触发限流计数

---

*文档创建时间: 2026-03-05 | Agent: vscode-copilot | Phase: 0.5 | 状态: ⬜ 待执行*