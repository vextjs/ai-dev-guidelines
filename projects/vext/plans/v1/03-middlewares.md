# 03 - 中间件体系完整方案

> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-28 P1 修复）
> **状态**: ✅ 已确认
> **依赖**: 路由层（`01-routes.md` ✅）、配置层（`05-config.md` ✅）、插件系统（`04-plugins.md` ✅）

---

## 子文件索引

| 文件 | 内容 |
|------|------|
| `01b-middlewares.md` | 路由级中间件：注册、引用写法、白名单机制 |
| `03-middlewares.md` | 中间件完整体系：分层架构、类型定义、内置中间件、执行顺序 |

---

## 0. 概述

vextjs 中间件分为**三层**，职责清晰、互不干扰：

```
HTTP Request
  ↓
┌─────────────────────────────────────┐
│  层 1：框架内置中间件                 │  ← 用户无感知，框架自动注册
│  (requestId / cors / body-parser /  │
│   rateLimit / response-wrapper)     │
├─────────────────────────────────────┤
│  层 2：全局中间件（插件注册）          │  ← app.use()，插件专用
│  (security headers / APM / tracing) │
├─────────────────────────────────────┤
│  层 3：路由级中间件                   │  ← options.middlewares，路由专用
│  (auth / check-role / ...)          │
├─────────────────────────────────────┤
│  validate 中间件（内置）              │  ← schema-dsl 校验
├─────────────────────────────────────┤
│  handler                            │
├─────────────────────────────────────┤
│  出口包装（内置）                     │  ← { code: 0, data, requestId }
└─────────────────────────────────────┘
  ↓
HTTP Response
```

---

## 1. 层 1：框架内置中间件（自动注册，用户不感知）

框架启动时按固定顺序自动注册以下内置中间件，用户无需任何配置即可使用：

| 顺序 | 中间件 | 职责 | 配置项 | 可覆盖 |
|------|--------|------|--------|--------|
| 1 | **requestId** | 生成/透传请求 ID，注入 `req.requestId` | `config.requestId` | ✅ `app.setRequestIdGenerator()` |
| 2 | **cors** | 跨域处理（Preflight + 响应头注入） | `config.cors` | ✅ `cors.enabled = false` + 插件 |
| 3 | **body-parser** | JSON + URL-encoded body 解析，注入 `req.body` | `config.request.maxBodySize` | ✅ 插件扩展 multipart |
| 4 | **rateLimit** | 全局速率限制 | `config.rateLimit` | ✅ `app.setRateLimiter()` |
| 5 | **response-wrapper** | 出口包装（`{ code, data, requestId }`） | — | ❌ 核心机制 |
| 6 | **error-handler** | 全局错误捕获，格式化错误响应 | `config.response.hideInternalErrors` | ❌ 核心机制 |

### 1.1 requestId 中间件

```typescript
// vextjs/lib/middlewares/request-id.ts（框架内部）
export function createRequestIdMiddleware(config: VextConfig): VextMiddleware {
  return async (req, res, next) => {
    if (!config.requestId.enabled) {
      req.requestId = ''
      return next()
    }
    // 优先从请求头透传（网关注入）
    const fromHeader = req.headers[config.requestId.header.toLowerCase()]
    req.requestId = fromHeader || (config.requestId.generate ?? uuidv4)()
    // 写入响应头
    res.setHeader(config.requestId.responseHeader, req.requestId)
    next()
  }
}
```

### 1.2 body-parser 中间件

框架内置解析 `application/json` 和 `application/x-www-form-urlencoded`，multipart（文件上传）需通过插件扩展：

```typescript
// 内置支持的 Content-Type
'application/json'                  → req.body（对象）
'application/x-www-form-urlencoded' → req.body（对象）

// 需要插件的 Content-Type
'multipart/form-data'               → 安装 vextjs-plugin-upload
'application/octet-stream'          → 通过 req.raw 访问原始流
```

**内存安全**：body-parser 对请求体大小有严格限制（`config.request.maxBodySize`），超出则返回 `413 Payload Too Large`，不会将超大请求体读入内存。

---

## 2. 层 2：全局中间件（插件通过 `app.use()` 注册）

插件可注册对**所有路由**生效的全局中间件，在层 1 之后、路由级中间件之前执行。

### 2.1 接口

```typescript
interface VextApp {
  /**
   * 注册全局 HTTP 中间件（插件专用）
   * - 按注册顺序执行（插件加载顺序决定中间件顺序）
   * - 只能在插件 setup() 中调用
   * - 路由注册完成后（步骤⑤之后）立即锁定，后续调用抛出 Error
   * - 对所有路由生效（包括 /health、/ready 端点，但框架内置端点除外）
   */
  use(middleware: VextMiddleware): void
}
```

> **锁定时机**：`app.use()` 在步骤⑤ router-loader 完成后立即锁定（而非 `_runReady` 阶段）。锁定后调用将抛出：`[vextjs] app.use() is locked after route registration. Global middleware must be registered in plugin setup().` 详见 `06c-lifecycle.md §3.2`。

### 2.2 典型用法

```typescript
// src/plugins/security.ts — Security Headers
export default definePlugin({
  name: 'security',
  setup(app) {
    app.use(async (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
      next()
    })
  },
})

// src/plugins/apm.ts — 分布式追踪
export default definePlugin({
  name: 'apm',
  setup(app) {
    app.use(async (req, _res, next) => {
      // 将 requestId 注入到 APM context，后续所有异步操作都能追踪
      apmSdk.setContext({ traceId: req.requestId })
      next()
    })
  },
})
```

---

## 3. 层 3：路由级中间件

详见 `01b-middlewares.md`，核心要点：

- 在 `config/default.ts` 的 `middlewares[]` 白名单中声明才会被加载
- 通过 `options.middlewares` 按名称引用
- 支持工厂模式传参 `{ name: 'check-role', options: { roles: ['admin'] } }`
- 中间件文件必须用 `defineMiddleware()` 或 `defineMiddlewareFactory()` 包装导出（显式声明类型）

---

## 4. 中间件类型定义

```typescript
// vextjs/lib/types.ts

/**
 * 标准中间件（同步或异步，无参数）
 */
export type VextMiddleware = (
  req:  VextRequest,
  res:  VextResponse,
  next: () => void,
) => Promise<void> | void

/**
 * 工厂函数（接收配置，返回中间件）
 */
export type VextMiddlewareFactory<TOptions = unknown> = (
  options: TOptions,
) => VextMiddleware

/**
 * 错误处理中间件（仅框架内部使用）
 */
export type VextErrorMiddleware = (
  err: unknown,
  req: VextRequest,
  res: VextResponse,
) => void

/**
 * 路由级中间件声明（白名单中的格式）
 */
export type MiddlewareDecl =
  | string
  | { name: string; options?: unknown }
```

### 4.1 辅助函数：`defineMiddleware` / `defineMiddlewareFactory`

框架提供两个辅助函数，用于**显式声明**中间件类型，避免运行时推断歧义：

```typescript
// vextjs/lib/define-middleware.ts
import type { VextMiddleware, VextMiddlewareFactory } from './types'

export function defineMiddleware(fn: VextMiddleware): VextMiddleware
export function defineMiddlewareFactory<T>(factory: VextMiddlewareFactory<T>): VextMiddlewareFactory<T>
```

**用法**：

```typescript
// 普通中间件
import { defineMiddleware } from 'vextjs'

export default defineMiddleware(async (req, _res, next) => {
  // ...
  next()
})

// 工厂中间件
import { defineMiddlewareFactory } from 'vextjs'

export default defineMiddlewareFactory<{ roles: string[] }>((options) => {
  return async (req, _res, next) => {
    if (!options.roles.includes(req.user.role)) req.app.throw(403, 'Forbidden')
    next()
  }
})
```

> **为什么需要显式标记？** 之前的设计靠 `finalOptions !== undefined` 推断是工厂还是普通中间件。当工厂以字符串声明（无 options）时会被误判为普通中间件，导致工厂函数本身被当作中间件执行。`defineMiddleware` / `defineMiddlewareFactory` 通过 Symbol 标记让作者意图显式化，框架检测零歧义。详见 `01b-middlewares.md §4.3`。

> **为什么中间件没有 `app` 参数？**
> vextjs 中间件签名是 `(req, res, next)` 三参数，通过 `req.app` 访问框架能力（`throw`/`logger`）。不采用四参数 `(req, res, next, app)` 是为了保持与 Node.js 中间件生态的兼容性，同时通过 `req.app` 命名空间避免与 `req.user` 等业务字段混淆。

---

## 5. 内置中间件详解

### 5.1 全局错误处理

```typescript
// vextjs/lib/middlewares/error-handler.ts（框架内部）
//
// ⚠️ 使用工厂函数模式，通过闭包持有 config 引用。
// 之前的写法直接引用了作用域外不存在的 app 变量（ReferenceError）。
// 工厂模式在 bootstrap 时调用一次 createErrorHandler(config)，
// 返回的闭包持有 config 引用，解决了作用域问题。
//
export function createErrorHandler(config: VextConfig): VextErrorMiddleware {
  const hideInternalErrors = config.response?.hideInternalErrors ?? true

  return (err, req, res) => {
    const requestId = req.requestId

    // 校验错误（422）
    if (err instanceof VextValidationError) {
      return res.status(422).rawJson({
        code:      422,
        message:   'Validation failed',
        errors:    err.errors,   // [{ field: 'email', message: '...' }]
        requestId,
      })
    }

    // HTTP 错误（app.throw 抛出）
    if (err instanceof HttpError) {
      return res.status(err.status).rawJson({
        code:      err.code ?? err.status,  // 有业务码用业务码，否则用 HTTP 状态码
        message:   err.message,
        requestId,
      })
    }

    // 未知错误（500）— 生产环境隐藏内部细节
    return res.status(500).rawJson({
      code:    500,
      message: 'Internal Server Error',
      requestId,
      ...(!hideInternalErrors && { stack: (err as Error).stack }),
    })
  }
}
```

> **bootstrap 注册方式**：`app.adapter.registerErrorHandler(createErrorHandler(config))`

### 5.2 出口包装中间件

```typescript
// vextjs/lib/middlewares/response-wrapper.ts（框架内部）
export const responseWrapper: VextMiddleware = async (req, res, next) => {
  const originalJson = res.json.bind(res)

  res.json = (data: unknown, status = 200) => {
    if (status === 204) {
      return originalJson(null, 204)   // No Content，无响应体
    }
    return originalJson(
      { code: 0, data, requestId: req.requestId },
      status
    )
  }

  next()
}
```

---

## 6. 中间件执行顺序（完整流程）

```
HTTP Request 进入
  ↓
[内置] requestId 中间件          req.requestId 注入
  ↓
[内置] cors 中间件               Preflight 处理 / CORS 头注入
  ↓
[内置] body-parser              req.body 注入
  ↓
[内置] rateLimit                限流检查（超出 → 429）
  ↓
[内置] response-wrapper         劫持 res.json 准备出口包装
  ↓
[插件] app.use() 中间件          按插件注册顺序执行（security / apm 等）
  ↓
路由匹配
  ↓
[路由级] options.middlewares     按声明顺序（auth → check-role → ...）
  ↓
[内置] validate 中间件           schema-dsl 校验（失败 → 422，跳过 handler）
  ↓
handler(req, res)               业务逻辑，调用 app.services.xxx
  ↓
res.json(data)                  触发出口包装 → { code: 0, data, requestId }
  ↓
HTTP Response 发出
```

**错误路径（任意层抛出）**：

```
throw / app.throw()
  ↓
全局错误处理中间件捕获
  ↓
res.rawJson({ code, message, requestId })   ← 绕过出口包装
  ↓
HTTP Response 发出（4xx / 5xx）
```

---

## 7. 路由级 vs 全局：决策指南

| 需求 | 推荐方式 | 理由 |
|------|---------|------|
| 认证（JWT 验证） | 路由级 `middlewares: ['auth']` | 并非所有路由都需要认证（如 /health、/login） |
| 角色权限 | 路由级 `middlewares: ['check-role']` | 不同路由权限不同 |
| CORS | 内置（`config.cors`） | 全局统一，路由级通过 `override.cors` 覆盖 |
| 速率限制（全局） | 内置（`config.rateLimit`） | 全局生效，路由级通过 `override.rateLimit` 覆盖 |
| 速率限制（细粒度） | 路由级 `override.rateLimit: { max: 5 }` | 特定路由更严格的限制 |
| Security Headers | 插件 `app.use()` | 全局安全头，对所有响应生效 |
| APM / Tracing | 插件 `app.use()` | 全局追踪，需要早于业务逻辑执行 |
| 日志记录 | 内置（`app.logger` + requestId） | 框架已内置，无需额外中间件 |
| 请求体解析 | 内置（body-parser） | 全局统一处理 |
| 文件上传 | 路由级（`vextjs-plugin-upload` 提供的中间件） | 只在上传路由启用，避免性能损耗 |

---

## 8. 错误处理规范

### 8.1 中间件中报错

```typescript
// ✅ 推荐：使用 req.app.throw()
import { defineMiddleware } from 'vextjs'

export default defineMiddleware(async (req, _res, next) => {
  const token = req.headers['authorization']
  if (!token) req.app.throw(401, 'Unauthorized')
  req.user = await verifyToken(token)
  next()
})

// ✅ 也可以：try-catch 后重抛
import { defineMiddleware } from 'vextjs'

export default defineMiddleware(async (req, _res, next) => {
  try {
    req.user = await authService.verify(req.headers['authorization'])
    next()
  } catch {
    req.app.throw(401, 'auth.token_invalid')
  }
})

// ❌ 禁止：next(err)（vextjs 不支持 Express 的错误传递模式）
// next(new Error('...'))   ← 不会被捕获，行为未定义
```

### 8.2 工厂中间件中报错

```typescript
// src/middlewares/check-role.ts
import { defineMiddlewareFactory } from 'vextjs'

export default defineMiddlewareFactory<{ roles: string[] }>((options) => {
  return async (req, _res, next) => {
    if (!req.user) req.app.throw(401, 'Unauthorized')
    if (!options.roles.includes(req.user.role)) {
      req.app.throw(403, 'Forbidden', 40301)  // 带业务错误码
    }
    next()
  }
})
```

---

## 9. Service 循环依赖说明

Service 之间通过 `this.app.services.xxx` 互相调用是运行时行为，框架**不做**循环依赖检测（构造阶段无法检测方法级循环）。

```typescript
// ⚠️ 运行时循环调用 —— 不是启动时问题，但业务逻辑可能死循环
class UserService {
  async findById(id: string) {
    const order = await this.app.services.order.findLatest(id)  // 调用 OrderService
  }
}
class OrderService {
  async findLatest(userId: string) {
    const user = await this.app.services.user.findById(userId)  // 调用 UserService → 死循环！
  }
}
```

**规范**：Service 方法应单向调用（A 调 B，B 不调 A）。如需双向交互，提取共享逻辑到第三个 Service 中。

---

## 10. 性能说明

| 机制 | 性能影响 | 说明 |
|------|---------|------|
| 路由级中间件 | 最小 | 仅在匹配路由时执行 |
| 全局中间件（`app.use()`）| 轻微 | 每次请求都执行，保持逻辑简单 |
| validate 中间件 | 极小 | schema 在路由注册时**预编译一次**，请求时只执行校验 |
| 出口包装 | 几乎零开销 | 仅对象组装，无 I/O |
| body-parser | 受限于请求体大小 | `maxBodySize` 保护，超出直接拒绝 |

