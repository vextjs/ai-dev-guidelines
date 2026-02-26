# 03 - 文件路由 & defineRoutes & 三段式声明

## 文件路由加载机制

规则与 v1 相同：`routes/` 下的文件路径 = 路由挂载前缀，文件内注册子路径，两段拼接为最终路由。

| 文件路径 | 内部注册 | 最终路由 |
|---------|---------|---------|
| `routes/api/users.ts` | `app.get('/list', ...)` | `GET /api/users/list` |
| `routes/api/users.ts` | `app.post('/', ...)` | `POST /api/users` |
| `routes/api/users.ts` | `app.get('/:id', ...)` | `GET /api/users/:id` |
| `routes/admin/users.ts` | `app.get('/list', ...)` | `GET /admin/users/list` |

---

## 路由文件写法

与 v1 相比，**唯一变化是 handler 参数从 `c` 改为 `ctx`**，其余三段式结构、options 配置项完全保持一致。

```typescript
// routes/api/users.ts
import { defineRoutes } from 'vext'
// services/schemas 类型由 defineRoutes 泛型推导，无需手动 import

export default defineRoutes(({ app, services, schemas }) => {

  // GET /api/users/list
  app.get('/list', {
    validate: { query: schemas.users.getUsersQuerySchema },
    docs: { summary: '用户列表', tags: ['users'] },
  }, async (ctx) => {
    const query = ctx.req.valid('query')
    const data  = await services.api.users.findAll(query)
    return ctx.res.json({ data })
  })

  // GET /api/users/:id
  app.get('/:id', {
    validate: { param: schemas.users.userIdParamSchema },
    docs: { summary: '用户详情', tags: ['users'] },
  }, async (ctx) => {
    const { id } = ctx.req.valid<{ id: string }>('param')
    const data   = await services.api.users.findById(id)
    return ctx.res.json({ data })
  })

  // POST /api/users
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
  }, async (ctx) => {
    const body = ctx.req.valid('json')
    const data = await services.api.users.create(body)
    return ctx.res.json({ data }, 201)
  })

  // PUT /api/users/:id
  app.put('/:id', {
    middlewares: ['auth'],
    validate: {
      param: schemas.users.userIdParamSchema,
      body:  schemas.users.updateUserSchema,
    },
    docs: { summary: '更新用户', tags: ['users'] },
  }, async (ctx) => {
    const { id } = ctx.req.valid<{ id: string }>('param')
    const body   = ctx.req.valid('json')
    const data   = await services.api.users.update(id, body)
    return ctx.res.json({ data })
  })

  // DELETE /api/users/:id
  app.delete('/:id', {
    middlewares: ['auth'],
    validate: { param: schemas.users.userIdParamSchema },
    meta: { roles: ['admin'] },
    docs: { summary: '删除用户', tags: ['users'] },
  }, async (ctx) => {
    const { id } = ctx.req.valid<{ id: string }>('param')
    await services.api.users.remove(id)
    return ctx.res.json({ data: null })
  })

})
```

---

## options 配置项（与 v1 完全一致）

| 字段 | 类型 | 说明 |
|------|------|------|
| `middlewares` | `Array<string \| { name, options }>` | 路由级中间件（引用注册名） |
| `validate` | `{ query?, body?, param?, header?, cookie? }` | Zod schema 按位置声明 |
| `rateLimit` | `{ max, window? }` | 速率限制（seconds，默认 60） |
| `meta` | `{ auth?, roles?, permissions? }` | 权限元信息 |
| `docs` | `{ summary?, description?, tags?, deprecated?, responses? }` | 文档配置 |

---

## defineRoutes 实现（v2 版）

```typescript
// core/define-routes.ts
import type { ZodSchema } from 'zod'
import type { VextContext, VextMiddleware, VextHandler, VextRouter } from './adapter'

// ── 全局共享 context ──────────────────────────────────────
interface AppContext {
  services:    Record<string, any>
  schemas:     Record<string, any>
  middlewares: Map<string, VextMiddleware | ((options: any) => VextMiddleware)>
  /** 当前 adapter 提供的 createRouter 工厂（由 createApp 注入） */
  createRouter: () => VextRouter
}

let _ctx: AppContext = {
  services:    {},
  schemas:     {},
  middlewares: new Map(),
  createRouter: () => { throw new Error('[vext] createApp() must be called first') },
}

export function setFrameworkContext(ctx: Partial<AppContext>) {
  _ctx = { ..._ctx, ...ctx }
}

export function registerMiddleware(
  name: string,
  handler: VextMiddleware | ((options: any) => VextMiddleware)
) {
  _ctx.middlewares.set(name, handler)
}

// ── 路由元信息收集 ────────────────────────────────────────
export interface RouteRecord {
  method:  string
  path:    string
  meta?:   RouteOptions['meta']
  docs?:   RouteOptions['docs']
}
const _routeTable: RouteRecord[] = []
export function getRouteTable(): readonly RouteRecord[] { return _routeTable }

// ── 中间件配置解析 ─────────────────────────────────────────
type MiddlewareConfig = string | { name: string; options?: any }

function resolveMiddlewares(configs: MiddlewareConfig[]): VextMiddleware[] {
  return configs.map((cfg) => {
    const name    = typeof cfg === 'string' ? cfg : cfg.name
    const options = typeof cfg === 'string' ? undefined : cfg.options
    const handler = _ctx.middlewares.get(name)
    if (!handler) throw new Error(`[defineRoutes] middleware "${name}" not registered`)
    return options !== undefined
      ? (handler as (o: any) => VextMiddleware)(options)
      : handler as VextMiddleware
  })
}

// ── validate 配置解析 ──────────────────────────────────────
// 注意：validate 的实际执行由各 adapter 内部的 zValidator 等负责
// defineRoutes 只负责收集配置，adapter 在注册路由时处理验证

// ── 路由 options 类型 ─────────────────────────────────────
export interface RouteOptions {
  middlewares?: MiddlewareConfig[]
  validate?: Partial<Record<'query' | 'body' | 'param' | 'header' | 'cookie', ZodSchema>>
  rateLimit?: { max: number; window?: number }
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

// ── 包装 VextRouter，拦截路由注册支持三段式 ──────────────
function wrapRouter(router: VextRouter, mountPrefix?: string): WrappedRouter {
  const methods = ['get', 'post', 'put', 'patch', 'delete'] as const

  const wrapped: any = {}
  for (const method of methods) {
    wrapped[method] = (path: string, options: RouteOptions, handler: VextHandler) => {
      const chains: VextMiddleware[] = []

      // 1. 路由级中间件
      if (options.middlewares?.length) {
        chains.push(...resolveMiddlewares(options.middlewares))
      }

      // 2. 速率限制
      if (options.rateLimit) {
        const rlFactory = _ctx.middlewares.get('rateLimit')
        if (rlFactory) chains.push((rlFactory as Function)(options.rateLimit))
      }

      // 3. validate 包装（框架无关的验证中间件，实际验证由 adapter 负责）
      if (options.validate) {
        chains.push(makeValidateMiddleware(options.validate))
      }

      // 4. 收集路由元信息
      _routeTable.push({
        method: method.toUpperCase(),
        path:   (mountPrefix ?? '') + path,
        meta:   options.meta,
        docs:   options.docs,
      })

      // 5. 注册到底层 router
      ;(router as any)[method](path, ...chains, handler)
    }
  }
  return wrapped as WrappedRouter
}

type WrappedRouter = {
  [K in 'get' | 'post' | 'put' | 'patch' | 'delete']: (
    path: string,
    options: RouteOptions,
    handler: VextHandler
  ) => void
}

/**
 * 框架无关的 validate 中间件
 * 实现：在 ctx.req.valid() 调用前，将 validate schema 绑定到 ctx
 * 实际校验逻辑由 adapter 在 valid() 方法中执行
 */
function makeValidateMiddleware(
  validate: NonNullable<RouteOptions['validate']>
): VextMiddleware {
  return async (ctx, next) => {
    // 将 schema 注入 ctx，adapter 的 req.valid() 读取并执行验证
    ;(ctx as any)._validateSchemas = validate
    await next()
  }
}

// ── RouteContext 类型（含类型安全的 services/schemas） ───
type RouteContext = {
  app:      WrappedRouter
  services: AppContext['services']
  schemas:  AppContext['schemas']
}

// ── defineRoutes ──────────────────────────────────────────
export function defineRoutes(fn: (ctx: RouteContext) => void): VextRouter {
  const router = _ctx.createRouter()
  fn({
    app:      wrapRouter(router),
    services: _ctx.services,
    schemas:  _ctx.schemas,
  })
  return router
}
```

---

## router-loader 实现（v2 版）

```typescript
// core/router-loader.ts
import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import type { VextAdapter } from './adapter'

function toPrefix(relPath: string): string {
  const normalized = relPath.replace(/\\/g, '/').replace(/\.(ts|js|mjs)$/, '')
  const withoutIndex = normalized.replace(/\/index$/, '') || '/'
  return '/' + withoutIndex
}

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    statSync(full).isDirectory()
      ? collectFiles(full, files)
      : /\.(ts|js|mjs)$/.test(name) && files.push(full)
  }
  return files
}

export async function loadRoutes(adapter: VextAdapter, routesDir: string) {
  for (const file of collectFiles(routesDir)) {
    const prefix = toPrefix(relative(routesDir, file))
    const mod    = await import(file)
    if (mod.default) {
      adapter.mount(prefix, mod.default)
      console.log(`[Router] mounted: ${prefix}`)
    }
  }
}
```

