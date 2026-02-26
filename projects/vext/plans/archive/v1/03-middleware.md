# 03 - 中间件 & 响应 & 错误处理

## 中间件体系

### 全局中间件

放在 `middlewares/global/` 下，按文件名数字前缀排序自动注册：

```
middlewares/global/01.logger.ts            → 第一个注册
middlewares/global/02.cors.ts              → 第二个
middlewares/global/03.error.ts             → 错误兜底
middlewares/global/04.response-transform.ts → 出口响应格式
```

每个文件默认导出一个 Hono middleware：

```typescript
// middlewares/global/01.logger.ts
import { createMiddleware } from 'hono/factory'
import pino from 'pino'

const logger = pino({ level: 'info' })

export default createMiddleware(async (c, next) => {
  const start = Date.now()
  await next()
  logger.info({ method: c.req.method, path: c.req.path, ms: Date.now() - start })
})
```

### 路由级中间件

在 `app.ts` 启动时统一注册，路由文件通过 `{ middlewares: [...] }` 配置数组引用。

**注册**：

```typescript
// app.ts（启动时）
import { registerMiddleware } from '@/lib/define-routes'
import { authMiddleware } from '@/middlewares/auth'
import { createRateLimitMiddleware } from '@/middlewares/rate-limit'

registerMiddleware('auth',      authMiddleware)           // 普通中间件
registerMiddleware('rateLimit', createRateLimitMiddleware) // 工厂函数（带参数）
```

**使用（在路由文件中）**：

路由采用 `path, options, handler` 三段式，中间件在 `options.middlewares` 中声明：

```typescript
// 字符串 → 直接取注册的中间件
app.post('/', { middlewares: ['auth'] }, async (c) => { ... })

// 混合使用
app.put('/:id', {
  middlewares: ['auth', { name: 'customMw', options: { flag: true } }],
}, async (c) => { ... })

// 速率限制不在 middlewares 里，而是独立字段：
app.post('/register', {
  rateLimit: { max: 5, window: 60 },
  validate: { body: schemas.users.createUserSchema },
}, async (c) => { ... })
```

**配置格式**：

| 写法 | 说明 |
|------|------|
| `['auth']` | 取注册的 `authMiddleware` |
| `['auth', 'log']` | 多个中间件，按顺序执行 |
| `[{ name: 'rateLimit', options: { max: 10 } }]` | 工厂函数传参 |
| `['auth', { name: 'rateLimit', options: { max: 5 } }]` | 混合使用 |

---

## 响应格式

### 原则

路由内直接用 Hono 原生 `c.json()` 返回数据，**不封装 `ok()` / `fail()` 这类函数**。统一响应格式由全局出口中间件处理。

### 全局响应包装中间件

```typescript
// middlewares/global/04.response-transform.ts
import { createMiddleware } from 'hono/factory'

export default createMiddleware(async (c, next) => {
  await next()
  // 仅处理 /api 和 /admin 的 JSON 响应
  const isApi = c.req.path.startsWith('/api') || c.req.path.startsWith('/admin')
  const isJson = c.res.headers.get('content-type')?.includes('application/json')
  if (!isApi || !isJson) return

  const body = await c.res.json()
  // 已是标准格式（error 中间件已处理的异常）则不重复包装
  if ('code' in body) return

  return c.json({ code: 0, ...body })
})
```

### 路由文件写法

```typescript
return c.json({ data })           // → 出口包装为 { code: 0, data: ... }
return c.json({ data }, 201)      // → 201 状态码，格式同上
throw new AppError(404, 'Not Found')  // → error 中间件处理为 { code: 404, message: '...' }
```

---

## 错误处理

### AppError 类

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'AppError'
  }
}
```

### 全局错误中间件

```typescript
// middlewares/global/03.error.ts
import { createMiddleware } from 'hono/factory'
import { AppError } from '@/lib/errors'

export default createMiddleware(async (c, next) => {
  try {
    await next()
  } catch (err) {
    if (err instanceof AppError) {
      return c.json({ code: err.status, message: err.message }, err.status)
    }
    console.error(err)
    return c.json({ code: 500, message: 'Internal Server Error' }, 500)
  }
})
```

---

## 健康检查（框架内置）

在 `app.ts` 中直接注册，不走文件路由，不受业务中间件影响：

```typescript
app.get('/healthz', (c) => c.json({ status: 'ok', uptime: process.uptime() }))
app.get('/readyz',  async (c) => c.json({ status: 'ok' }))
```

---

## 优雅关闭（Graceful Shutdown）

`registry.ts` 维护关闭函数注册表，`server.ts` 在 `SIGTERM` / `SIGINT` 时统一调用：

```typescript
// server.ts
import { getAllClosers } from '@/lib/db/registry'

const shutdown = async (signal: string) => {
  console.log(`[Server] ${signal} received, shutting down...`)
  const closers = getAllClosers()
  await Promise.all(closers.map((fn) => fn()))
  console.log('[Server] All connections closed.')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT',  () => shutdown('SIGINT'))
```

