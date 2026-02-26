# 02 - 路由 & defineRoutes & 分层

## 文件路由加载机制

**规则**：`routes/` 下的文件路径 = 路由挂载前缀，文件内注册子路径，两段拼接为最终路由。

| 文件路径 | 内部注册 | 最终路由 |
|---------|---------|---------|
| `routes/api/users.ts` | `app.get('/list', ...)` | `GET /api/users/list` |
| `routes/api/users.ts` | `app.post('/', ...)` | `POST /api/users` |
| `routes/api/users.ts` | `app.get('/:id', ...)` | `GET /api/users/:id` |
| `routes/api/ttt/tst.ts` | `app.put('/ttt', ...)` | `PUT /api/ttt/tst/ttt` |
| `routes/admin/users.ts` | `app.get('/list', ...)` | `GET /admin/users/list` |

---

## 路由文件写法

每个路由只有一行 `import { defineRoutes }`。

路由注册采用 **`path, options, handler`** 三段式，options 是声明式配置对象，描述这个接口的中间件、校验、元信息：

```typescript
// routes/api/users.ts
import { defineRoutes } from '@/lib/define-routes'

export default defineRoutes(({ app, services, schemas }) => {

  app.get('/list', {
    validate: { query: schemas.users.getUsersQuerySchema },
    docs: { summary: '用户列表', tags: ['users'] },
  }, async (c) => {
    const data = await services.api.users.findAll(c.req.valid('query'))
    return c.json({ data })
  })

  app.get('/:id', {
    validate: { param: schemas.users.userIdParamSchema },
    docs: { summary: '用户详情', tags: ['users'] },
  }, async (c) => {
    const data = await services.api.users.findById(c.req.valid('param').id)
    return c.json({ data })
  })

  app.post('/', {
    middlewares: ['auth'],
    validate: { body: schemas.users.createUserSchema },
    rateLimit: { max: 10, window: 60 },
    meta: { roles: ['admin'] },
    docs: {
      summary: '创建用户',
      tags: ['users'],
      responses: { 201: { description: '创建成功' }, 409: { description: '邮箱已存在' } },
    },
  }, async (c) => {
    const data = await services.api.users.create(c.req.valid('json'))
    return c.json({ data }, 201)
  })

  app.put('/:id', {
    middlewares: ['auth'],
    validate: {
      param: schemas.users.userIdParamSchema,
      body: schemas.users.updateUserSchema,
    },
    docs: { summary: '更新用户', tags: ['users'] },
  }, async (c) => {
    const data = await services.api.users.update(c.req.valid('param').id, c.req.valid('json'))
    return c.json({ data })
  })

  app.delete('/:id', {
    middlewares: ['auth'],
    validate: { param: schemas.users.userIdParamSchema },
    meta: { roles: ['admin'] },
    docs: { summary: '删除用户', tags: ['users'], responses: { 404: { description: '用户不存在' } } },
  }, async (c) => {
    await services.api.users.remove(c.req.valid('param').id)
    return c.json({ data: null })
  })

})
```

### options 配置项

| 字段 | 类型 | 说明 |
|------|------|------|
| `middlewares` | `Array<string \| { name, options }>` | 路由级中间件 |
| `validate` | `{ query?, body?, param?, header?, cookie? }` | Zod schema 按位置声明，框架自动挂载验证（见下方详情） |
| `rateLimit` | `{ max, window? }` | 速率限制，框架自动挂载限流中间件 |
| `meta` | `{ auth?, roles?, permissions? }` | 权限元信息，可用于鉴权中间件判断 |
| `docs` | `{ summary?, description?, tags?, deprecated?, responses? }` | 文档生成配置（可用于自动生成 OpenAPI spec） |

> options 为空时传 `{}` 即可，handler 始终是第三个参数，位置固定。

#### validate 详情

| 字段 | 校验位置 | 说明 |
|------|---------|------|
| `query` | URL 查询参数 `?page=1&limit=20` | `c.req.valid('query')` 获取 |
| `body` | 请求体 JSON | `c.req.valid('json')` 获取 |
| `param` | 路径参数 `/:id` | `c.req.valid('param')` 获取 |
| `header` | 请求头 | `c.req.valid('header')` 获取 |
| `cookie` | Cookie | `c.req.valid('cookie')` 获取 |

#### rateLimit 详情

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `max` | `number` | — | 窗口期内最大请求次数 |
| `window` | `number` | `60` | 窗口期（秒） |

#### docs 详情

| 字段 | 类型 | 说明 |
|------|------|------|
| `summary` | `string` | 接口简述（一行） |
| `description` | `string` | 接口详细描述 |
| `tags` | `string[]` | 分组标签，OpenAPI tags |
| `deprecated` | `boolean` | 标记废弃 |
| `responses` | `Record<number, { description }>` | 响应码描述 |

---

## services / schemas 访问方式

启动时扫描构建为**嵌套对象**，路由文件用点号访问：

```typescript
services.api.users.findAll(...)
services.api.orders.create(...)
services.admin.users.list(...)

schemas.users.createUserSchema
schemas.orders.createOrderSchema
```

### key 规则

| 文件路径 | 访问方式 |
|---------|---------|
| `services/api/users.ts` | `services.api.users` |
| `services/api/orders.ts` | `services.api.orders` |
| `services/admin/users.ts` | `services.admin.users` |
| `schemas/users.ts` | `schemas.users` |
| `schemas/orders.ts` | `schemas.orders` |

---

## 跨 service 调用

`services` 是全量嵌套对象，所有 service 都在里面，直接点号取用：

```typescript
// routes/api/orders.ts
import { defineRoutes } from '@/lib/define-routes'

export default defineRoutes(({ app, services, schemas }) => {

  app.post('/', {
    middlewares: ['auth'],
    validate: { body: schemas.orders.createOrderSchema },
    docs: { summary: '创建订单', tags: ['orders'] },
  }, async (c) => {
    const body = c.req.valid('json')
    // 跨 service 调用
    await services.api.users.findById(body.userId)
    const data = await services.api.orders.create(body)
    return c.json({ data }, 201)
  })

})
```

---

## services 示例（class 封装）

```typescript
// services/api/users.ts
import * as UserModel from '@/models/mysql/main/users'
import * as SessionModel from '@/models/redis/default/session'
import { AppError } from '@/lib/errors'
import type { CreateUserInput, UpdateUserInput } from '@/schemas/users'

class UsersService {
  private user = UserModel
  private session = SessionModel

  async findAll(opts: { page: number; limit: number }) {
    return this.user.paginate(opts)
  }

  async findById(id: string) {
    const user = await this.user.findById(id)
    if (!user) throw new AppError(404, 'User not found')
    return user
  }

  async create(data: CreateUserInput) {
    const exists = await this.user.findByEmail(data.email)
    if (exists) throw new AppError(409, 'Email already exists')
    return this.user.create(data)
  }

  async update(id: string, data: UpdateUserInput) {
    await this.findById(id)
    return this.user.update(id, data)
  }

  async remove(id: string) {
    await this.findById(id)
    return this.user.remove(id)
  }

  async login(email: string, password: string) {
    const user = await this.user.findByEmail(email)
    if (!user) throw new AppError(401, 'Invalid credentials')
    // 验证密码...
    const token = generateToken(user)
    await this.session.setSession(`session:${user.id}`, token, 7200)
    return { user, token }
  }
}

export const usersService = new UsersService()
```

---

## schemas 示例

```typescript
// schemas/users.ts
import { z } from 'zod'

export const userIdParamSchema = z.object({
  id: z.string().min(1),
})

export const createUserSchema = z.object({
  name: z.string().min(1).max(50),
  email: z.string().email(),
  password: z.string().min(8),
})
export const updateUserSchema = createUserSchema.partial().omit({ password: true })
export const getUsersQuerySchema = z.object({
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

---

## lib 实现

### `lib/define-routes.ts`

```typescript
import { Hono, MiddlewareHandler } from 'hono'
import { zValidator } from '@hono/zod-validator'
import type { ZodSchema } from 'zod'

// ── 全局共享 context ──────────────────────────────────────
interface AppContext {
  services:    Record<string, any>
  schemas:     Record<string, any>
  middlewares: Map<string, MiddlewareHandler | ((options: any) => MiddlewareHandler)>
}

let _ctx: AppContext = {
  services:    {},
  schemas:     {},
  middlewares: new Map(),
}

export function setContext(ctx: Partial<AppContext>) {
  _ctx = { ..._ctx, ...ctx }
}

export function registerMiddleware(
  name: string,
  handler: MiddlewareHandler | ((options: any) => MiddlewareHandler)
) {
  _ctx.middlewares.set(name, handler)
}

// ── 路由元信息收集（用于自动生成文档等） ──────────────────
interface RouteRecord {
  method:  string
  path:    string
  meta?:   RouteOptions['meta']
  docs?:   RouteOptions['docs']
}

const _routeTable: RouteRecord[] = []

export function getRouteTable(): readonly RouteRecord[] {
  return _routeTable
}

// ── 中间件配置解析 ────────────────────────────────────────
type MiddlewareConfig = string | { name: string; options?: any }

function resolveMiddlewares(configs: MiddlewareConfig[]): MiddlewareHandler[] {
  return configs.map((cfg) => {
    const name    = typeof cfg === 'string' ? cfg : cfg.name
    const options = typeof cfg === 'string' ? undefined : cfg.options
    const handler = _ctx.middlewares.get(name)
    if (!handler) throw new Error(`[defineRoutes] middleware "${name}" not registered`)
    return options !== undefined
      ? (handler as (o: any) => MiddlewareHandler)(options)
      : handler as MiddlewareHandler
  })
}

// ── validate 配置解析 ─────────────────────────────────────
// 用户写 body，映射到 Hono 的 'json' target
const validateTargetMap: Record<string, string> = {
  query:  'query',
  body:   'json',     // body → json（Hono 的 target 名）
  param:  'param',
  header: 'header',
  cookie: 'cookie',
}

function resolveValidators(
  validate: Partial<Record<string, ZodSchema>>
): MiddlewareHandler[] {
  return Object.entries(validate).map(([key, schema]) => {
    const target = validateTargetMap[key]
    if (!target) throw new Error(`[defineRoutes] unknown validate target "${key}"`)
    return zValidator(target as any, schema!)
  })
}

// ── 路由 options 类型 ─────────────────────────────────────
interface RouteOptions {
  middlewares?: MiddlewareConfig[]
  validate?: Partial<Record<'query' | 'body' | 'param' | 'header' | 'cookie', ZodSchema>>
  rateLimit?: {
    max: number
    window?: number   // 秒，默认 60
  }
  meta?: {
    auth?:        boolean
    roles?:       string[]
    permissions?: string[]
  }
  docs?: {
    summary?:     string
    description?: string
    tags?:        string[]
    deprecated?:  boolean
    responses?:   Record<number, { description: string }>
  }
}

// ── 包装 Hono，拦截路由注册支持三段式 path, options, handler
function wrapApp(app: Hono, mountPrefix?: string): Hono {
  const methods = ['get', 'post', 'put', 'patch', 'delete'] as const
  return new Proxy(app, {
    get(target, prop) {
      if (!methods.includes(prop as any)) return (target as any)[prop]

      return (path: string, options: RouteOptions, handler: Function) => {
        const chains: MiddlewareHandler[] = []

        // 1. 解析中间件配置
        if (options.middlewares?.length) {
          chains.push(...resolveMiddlewares(options.middlewares))
        }

        // 2. 解析速率限制（自动从已注册的 'rateLimit' 中间件取工厂函数）
        if (options.rateLimit) {
          const rlFactory = _ctx.middlewares.get('rateLimit')
          if (rlFactory) {
            chains.push((rlFactory as Function)(options.rateLimit) as MiddlewareHandler)
          }
        }

        // 3. 解析验证配置
        if (options.validate) {
          chains.push(...resolveValidators(options.validate))
        }

        // 4. 收集路由元信息
        _routeTable.push({
          method: (prop as string).toUpperCase(),
          path:   (mountPrefix ?? '') + path,
          meta:   options.meta,
          docs:   options.docs,
        })

        return (target as any)[prop](path, ...chains, handler)
      }
    },
  }) as Hono
}

// ── RouteContext ──────────────────────────────────────────
type RouteContext = {
  app:      Hono
  services: AppContext['services']
  schemas:  AppContext['schemas']
}

// ── defineRoutes ──────────────────────────────────────────
export function defineRoutes(fn: (ctx: RouteContext) => void): Hono {
  const app = new Hono()
  fn({
    app:      wrapApp(app),
    services: _ctx.services,
    schemas:  _ctx.schemas,
  })
  return app
}
```

### `lib/context-loader.ts`

```typescript
import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

/**
 * 递归扫描目录，构建嵌套对象
 *   services/api/users.ts  →  { api: { users: UsersService 实例 } }
 *   schemas/users.ts       →  { users: schemas 模块 }
 */
export function scanModules(
  dir: string,
  mode: 'firstExport' | 'wholeModule' = 'firstExport'
): Record<string, any> {
  const result: Record<string, any> = {}

  for (const file of collectFiles(dir)) {
    const rel = relative(dir, file).replace(/\\/g, '/').replace(/\.(ts|js)$/, '')
    const parts = rel.split('/')
    const mod = require(file)
    const value = mode === 'wholeModule'
      ? mod
      : (mod.default ?? mod[Object.keys(mod)[0]] ?? {})

    // 构建嵌套对象：'api/users' → result.api.users = value
    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = current[parts[i]] || {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
  }

  return result
}

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    statSync(full).isDirectory()
      ? collectFiles(full, files)
      : (name.endsWith('.ts') || name.endsWith('.js')) && files.push(full)
  }
  return files
}
```

### `lib/router-loader.ts`

```typescript
import { Hono } from 'hono'
import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

function toPrefix(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/').replace(/\.ts$|\.js$/, '')
  const withoutIndex = normalized.replace(/\/index$/, '') || '/'
  return '/' + withoutIndex
}

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    statSync(full).isDirectory()
      ? collectFiles(full, files)
      : (name.endsWith('.ts') || name.endsWith('.js')) && files.push(full)
  }
  return files
}

export async function loadRoutes(app: Hono, routesDir: string) {
  for (const file of collectFiles(routesDir)) {
    const prefix = toPrefix(relative(routesDir, file))
    const mod = await import(file)
    if (mod.default) {
      app.route(prefix, mod.default)
      console.log(`[Router] mounted: ${prefix}`)
    }
  }
}
```

