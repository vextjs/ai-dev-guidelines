# 05 - 中间件 & 响应格式 & 错误处理

## 中间件体系

v2 中间件统一使用 `VextMiddleware` 类型，不再使用 Hono 原生 `MiddlewareHandler`。

```typescript
type VextMiddleware = (ctx: VextContext, next: () => Promise<void>) => Promise<void> | void
```

### 全局中间件

与 v1 相同：放在 `middlewares/global/` 下，按文件名数字前缀排序自动注册。

```
middlewares/global/
├── 01.logger.ts              → 第一个注册
├── 02.cors.ts                → 第二个
├── 03.error.ts               → 错误兜底（捕获所有未处理异常）
└── 04.response-transform.ts  → 出口响应统一包装
```

每个文件默认导出一个 `VextMiddleware`：

```typescript
// middlewares/global/01.logger.ts
import type { VextMiddleware } from 'vext'
import pino from 'pino'

const logger = pino({ level: 'info' })

const loggerMiddleware: VextMiddleware = async (ctx, next) => {
  const start = Date.now()
  await next()
  logger.info({
    method:    ctx.req.method,
    path:      ctx.req.path,
    ms:        Date.now() - start,
    requestId: getRequestContext()?.requestId,
  })
}

export default loggerMiddleware
```

```typescript
// middlewares/global/02.cors.ts
import type { VextMiddleware } from 'vext'

const corsMiddleware: VextMiddleware = async (ctx, next) => {
  await next()
  // adapter 负责将 header 写入实际响应
  // 此处通过 ctx.raw() 访问底层（如确实需要框架特定能力）
  // 推荐：使用插件封装（corsPlugin），通过 adapter 统一处理
}

export default corsMiddleware
```

### 路由级中间件

在 `app.ts` 启动时注册，路由文件通过 `{ middlewares: [...] }` 引用：

```typescript
// app.ts（启动时注册）
import { authMiddleware }          from './middlewares/auth'
import { createRateLimitMiddleware } from './middlewares/rate-limit'

// 普通中间件
app.registerMiddleware('auth',      authMiddleware)
// 工厂函数（支持路由级参数传入）
app.registerMiddleware('rateLimit', createRateLimitMiddleware)
```

路由文件配置引用（与 v1 完全一致）：

```typescript
// 字符串 → 直接取注册的中间件
app.post('/', { middlewares: ['auth'] }, handler)

// 工厂函数传参
app.get('/admin', { middlewares: [{ name: 'rateLimit', options: { max: 5 } }] }, handler)

// 速率限制独立字段（等价于上面的写法，语法糖）
app.post('/register', { rateLimit: { max: 5, window: 60 } }, handler)
```

---

## 鉴权中间件

```typescript
// middlewares/auth.ts
import { AppError, setRequestContextField } from 'vext'
import type { VextMiddleware } from 'vext'
import { verifyToken } from '@/lib/jwt'

export const authMiddleware: VextMiddleware = async (ctx, next) => {
  const authHeader = ctx.req.header('authorization')
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

  if (!token) throw new AppError(401, 'Unauthorized')

  const payload = verifyToken(token)
  if (!payload) throw new AppError(401, 'Invalid token')

  // 写入请求上下文，后续所有层可通过 getRequestContext() 访问
  setRequestContextField('userId', payload.userId)
  setRequestContextField('roles',  payload.roles)

  await next()
}
```

---

## 响应格式

### 原则

路由 handler 内直接用 `ctx.res.json()` 返回数据，**不封装 `ok()` / `fail()` 工具函数**。统一格式由全局出口中间件处理。

### 出口响应包装中间件

```typescript
// middlewares/global/04.response-transform.ts
import type { VextMiddleware } from 'vext'

const responseTransformMiddleware: VextMiddleware = async (ctx, next) => {
  await next()

  const isApi  = ctx.req.path.startsWith('/api') || ctx.req.path.startsWith('/admin')
  if (!isApi) return

  // ⚠️ 注意：实际实现依赖 adapter 的响应拦截能力
  // HonoAdapter 通过 c.res 拦截；后续 adapter 各自实现
  // vext 核心不提供拦截 API，这块由 adapter 的 onAfterResponse hook 处理
  // 推荐通过 responseTransformPlugin 封装（adapter 注入）
}

export default responseTransformMiddleware
```

> **设计决策**：响应拦截（读取并修改已发出的响应）本质上是框架级能力，不同框架实现不同。
> v2 将此能力委托给 adapter，通过 `adapter.onAfterResponse` 钩子（由 HonoAdapter 实现）。
> 用户通过插件使用，无需关心底层差异。

### 响应格式规范

```typescript
// 成功响应（路由 handler 返回的原始数据）
ctx.res.json({ data: [...] })
// ↓ 经出口中间件包装后
// { "code": 0, "data": [...] }

// 成功响应（带自定义字段）
ctx.res.json({ data: {...}, total: 100 })
// ↓ 包装后
// { "code": 0, "data": {...}, "total": 100 }

// 错误响应（由错误中间件处理）
throw new AppError(404, 'User not found')
// ↓ 错误中间件处理后
// { "code": 404, "message": "User not found" }
```

---

## 错误处理

### AppError 类（v2 扩展版）

```typescript
// core/errors.ts
export class AppError extends Error {
  constructor(
    public status:  number,
    message:        string,
    public code?:   string,    // 业务错误码，如 'USER_NOT_FOUND'
    public data?:   unknown    // 额外错误数据（如校验失败详情）
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return {
      code:    this.code ?? this.status,
      message: this.message,
      ...(this.data ? { data: this.data } : {}),
    }
  }
}
```

### 全局错误中间件

```typescript
// middlewares/global/03.error.ts
import type { VextMiddleware } from 'vext'
import { AppError }           from 'vext'

const errorMiddleware: VextMiddleware = async (ctx, next) => {
  try {
    await next()
  } catch (err) {
    if (err instanceof AppError) {
      return ctx.res.json(err.toJSON(), err.status)
    }

    // Zod 验证错误（由 adapter validate 中间件抛出）
    if (isZodError(err)) {
      return ctx.res.json({
        code:    422,
        message: 'Validation failed',
        data:    err.errors,
      }, 422)
    }

    console.error('[Error]', err)
    return ctx.res.json({ code: 500, message: 'Internal Server Error' }, 500)
  }
}

export default errorMiddleware

function isZodError(err: unknown): err is { errors: unknown[] } {
  return typeof err === 'object' && err !== null && 'errors' in err
}
```

---

## 健康检查（内置路由）

由 vext 核心内置，通过 `createApp` 选项控制：

```typescript
// createApp 自动注册，无需用户手动添加
// GET /healthz → { status: 'ok', uptime: 123.45 }
// GET /readyz  → { status: 'ok' }

// 如需自定义（在 app.ts 中覆盖）：
const app = await createApp({
  healthCheck: {
    path: '/health',      // 默认 /healthz
    readyPath: '/ready',  // 默认 /readyz
    check: async () => {  // 自定义就绪检查（如检查数据库连接）
      await db.ping()
      return true
    },
  },
})
```

