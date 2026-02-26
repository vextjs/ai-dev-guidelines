# 02 - VextContext 抽象 & 请求上下文传递

## VextContext 在业务代码中的写法

v1 使用 Hono 原生 `c` 参数，v2 统一使用 `ctx: VextContext`。底层框架对用户完全透明。

### 对比

```typescript
// ❌ v1：直接依赖 Hono API
app.get('/list', {}, async (c) => {
  const page = c.req.query('page')
  return c.json({ data })
})

// ✅ v2：使用 VextContext，框架无关
app.get('/list', {}, async (ctx) => {
  const page = ctx.req.query('page')
  return ctx.res.json({ data })
})
```

### VextContext API 速查

| v1（Hono） | v2（VextContext） | 说明 |
|-----------|-----------------|------|
| `c.req.method` | `ctx.req.method` | 请求方法 |
| `c.req.path` | `ctx.req.path` | 请求路径 |
| `c.req.param('id')` | `ctx.req.param('id')` | 路径参数 |
| `c.req.query('page')` | `ctx.req.query('page')` | Query 参数 |
| `c.req.header('x-token')` | `ctx.req.header('x-token')` | 请求头 |
| `await c.req.json()` | `await ctx.req.json()` | 请求体 |
| `c.req.valid('query')` | `ctx.req.valid('query')` | 验证后数据 |
| `c.json(data)` | `ctx.res.json(data)` | 返回 JSON |
| `c.json(data, 201)` | `ctx.res.json(data, 201)` | 带状态码 |
| `c.text('ok')` | `ctx.res.text('ok')` | 返回文本 |
| `c.redirect('/login')` | `ctx.res.redirect('/login')` | 重定向 |
| _(无)_ | `ctx.raw<HonoContext>()` | Escape hatch（不推荐） |

---

## 请求上下文（AsyncLocalStorage）

### 核心问题

v1 中，`requestId`/`userId` 等请求级信息必须手动从 route 透传到 service 再到 model，层层传参，繁琐且容易遗漏。

v2 通过 `AsyncLocalStorage` 在请求生命周期内自动传递，任何层级都可直接访问，无需传参。

### 实现

```typescript
// core/request-context.ts
import { AsyncLocalStorage } from 'node:async_hooks'

export interface RequestContext {
  requestId: string
  userId?:   string
  roles?:    string[]
  startedAt: number
  /** 自由扩展，供插件或中间件写入 */
  [key: string]: unknown
}

const storage = new AsyncLocalStorage<RequestContext>()

/** 启动请求上下文（在请求入口中间件中调用） */
export function runWithRequestContext<T>(
  ctx: RequestContext,
  fn: () => T
): T {
  return storage.run(ctx, fn)
}

/** 在任意层获取当前请求上下文（未在请求中调用时返回 undefined） */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore()
}

/** 更新当前请求上下文的部分字段 */
export function setRequestContextField(key: string, value: unknown): void {
  const store = storage.getStore()
  if (store) store[key] = value
}
```

### 使用方式

**① 在框架入口中间件初始化（自动，用户无需关心）**

```typescript
// core/app.ts（内部处理，用户不感知）
app.use('*', async (ctx, next) => {
  await runWithRequestContext(
    {
      requestId: crypto.randomUUID(),
      startedAt: Date.now(),
    },
    next
  )
})
```

**② 在任意层直接获取（无需传参）**

```typescript
// services/api/users.ts
import { getRequestContext, setRequestContextField } from 'vext'

class UsersService {
  async login(email: string, password: string) {
    const user = await UserModel.findByEmail(email)
    // 登录成功后，将 userId 写入当前请求上下文
    setRequestContextField('userId', user.id)
    return user
  }

  async findAll() {
    const { requestId, userId } = getRequestContext() ?? {}
    // 可用于日志、审计等
    console.log(`[${requestId}] findAll by user:${userId}`)
    return UserModel.paginate()
  }
}
```

**③ 在中间件中读取/写入**

```typescript
// middlewares/auth.ts（VextMiddleware 写法）
import { getRequestContext, setRequestContextField } from 'vext'
import type { VextMiddleware } from 'vext'

export const authMiddleware: VextMiddleware = async (ctx, next) => {
  const token = ctx.req.header('authorization')?.split(' ')[1]
  if (!token) throw new AppError(401, 'Unauthorized')

  const payload = verifyToken(token)
  // 写入请求上下文，后续所有层均可直接读取
  setRequestContextField('userId', payload.userId)
  setRequestContextField('roles',  payload.roles)

  await next()
}
```

**④ 在 model 层记录审计日志**

```typescript
// models/mysql/main/users.ts
import { getRequestContext } from 'vext'

export async function update(id: string, data: UpdateUserInput) {
  const { userId, requestId } = getRequestContext() ?? {}
  // 写操作自动记录操作人，无需业务层手动传入
  return db.query(
    'UPDATE users SET ?, updated_by = ?, request_id = ? WHERE id = ?',
    [data, userId, requestId, id]
  )
}
```

---

## VextContext.meta 字段

`ctx.meta` 是当前请求在 context 对象层面的元信息镜像，与 `getRequestContext()` 保持同步：

```typescript
// auth 中间件写入 requestContext 后，ctx.meta 自动反映
export const authMiddleware: VextMiddleware = async (ctx, next) => {
  // ...验证 token
  setRequestContextField('userId', payload.userId)
  // ctx.meta.userId 在后续中间件/handler 中可读（由 adapter 映射）
  await next()
}

// 路由 handler 中
app.get('/profile', { middlewares: ['auth'] }, async (ctx) => {
  // 两种方式等价
  const userId1 = ctx.meta.userId                // 从 VextContext 读
  const userId2 = getRequestContext()?.userId    // 从 AsyncLocalStorage 读
  return ctx.res.json({ userId: userId1 })
})
```

> `ctx.meta` 适合在 handler 内快速访问，`getRequestContext()` 适合在 service/model 层访问（无需依赖 ctx）。

