# 01 - 整体架构 & Adapter 设计 & 包结构

## 架构分层

```
┌─────────────────────────────────────────────┐
│           用户业务代码                         │
│   routes / services / models / schemas        │
│   只感知 VextContext，不感知底层框架            │
└──────────────┬──────────────────────────────┘
               │ 使用
┌──────────────▼──────────────────────────────┐
│           vext 核心（框架无关）                │
│   createApp / defineRoutes / definePlugin    │
│   VextContext / AppError / 生命周期           │
└──────────────┬──────────────────────────────┘
               │ 调用
┌──────────────▼──────────────────────────────┐
│           VextAdapter 接口                   │
│   router / middleware / listen / context映射 │
└──────────────┬──────────────────────────────┘
               │ 实现
┌──────────────▼──────────────────────────────┐
│     具体 Adapter（可替换）                    │
│   HonoAdapter（当前）/ ExpressAdapter（未来）  │
└─────────────────────────���───────────────────┘
```

**底层替换原则**：只换 adapter 实现，业务代码（routes/services/models）零修改。

---

## VextAdapter 接口

Adapter 是连接 vext 核心与底层框架的唯一桥梁，定义以下能力契约：

```typescript
// core/adapter.ts

/** 框架无关的请求对象 */
export interface VextRequest {
  method: string
  path: string
  /** 路径参数 /:id → param('id') */
  param(key: string): string
  param(): Record<string, string>
  /** Query 参数 ?page=1 → query('page') */
  query(key: string): string | undefined
  query(): Record<string, string>
  /** 请求头 */
  header(key: string): string | undefined
  /** 请求体（已解析 JSON） */
  json<T = unknown>(): Promise<T>
  /** 经过 validate 验证后的数据（按位置取） */
  valid<T = unknown>(target: 'query' | 'json' | 'param' | 'header' | 'cookie'): T
}

/** 框架无关的响应方法 */
export interface VextResponse {
  json(data: unknown, status?: number): Response | void
  text(data: string, status?: number): Response | void
  redirect(url: string, status?: number): Response | void
  status(code: number): VextResponse
}

/** 框架无关的请求上下文 */
export interface VextContext {
  req: VextRequest
  res: VextResponse
  /** 当前请求的元信息（由 auth 中间件等写入） */
  meta: {
    requestId: string
    userId?: string
    roles?: string[]
    [key: string]: unknown
  }
  /**
   * Escape hatch：访问底层框架原生 Context
   * 仅在 adapter 功能不足时使用，升级时需手动迁移
   */
  raw<T = unknown>(): T
}

/** 框架无关的中间件函数 */
export type VextMiddleware = (
  ctx: VextContext,
  next: () => Promise<void>
) => Promise<void> | void

/** 路由处理函数 */
export type VextHandler = (ctx: VextContext) => Promise<Response | void> | Response | void

/** Adapter 核心接口 */
export interface VextAdapter {
  /** 注册全局中间件 */
  use(path: string, ...middlewares: VextMiddleware[]): void
  /** 注册路由 */
  route(
    method: string,
    path: string,
    ...handlers: Array<VextMiddleware | VextHandler>
  ): void
  /** 挂载子路由 */
  mount(prefix: string, subRouter: VextRouter): void
  /** 启动监听 */
  listen(port: number, callback?: () => void): void
  /** 创建子路由实例（用于 defineRoutes） */
  createRouter(): VextRouter
}

/** 子路由接口（defineRoutes 内部使用） */
export interface VextRouter {
  get(path: string, ...handlers: Array<VextMiddleware | VextHandler>): void
  post(path: string, ...handlers: Array<VextMiddleware | VextHandler>): void
  put(path: string, ...handlers: Array<VextMiddleware | VextHandler>): void
  patch(path: string, ...handlers: Array<VextMiddleware | VextHandler>): void
  delete(path: string, ...handlers: Array<VextMiddleware | VextHandler>): void
}
```

---

## HonoAdapter 实现

```typescript
// adapters/hono/index.ts
import { Hono, type Context, type MiddlewareHandler } from 'hono'
import { serve } from '@hono/node-server'
import type { VextAdapter, VextRouter, VextContext, VextMiddleware, VextHandler } from '@/core/adapter'

/** 将 Hono Context 包装为 VextContext */
function wrapContext(c: Context): VextContext {
  return {
    req: {
      method: c.req.method,
      path:   c.req.path,
      param:  (key?: string) => key ? c.req.param(key) : c.req.param() as any,
      query:  (key?: string) => key ? c.req.query(key) : c.req.queries() as any,
      header: (key: string)  => c.req.header(key),
      json:   ()             => c.req.json(),
      valid:  (target: any)  => c.req.valid(target),
    },
    res: {
      json:     (data, status) => status ? c.json(data, status as any) : c.json(data),
      text:     (data, status) => status ? c.text(data, status as any) : c.text(data),
      redirect: (url, status)  => c.redirect(url, status as any),
      status:   (code)         => { /* chainable */ return this as any },
    },
    meta: {
      requestId: c.get('requestId') ?? '',
      userId:    c.get('userId'),
      roles:     c.get('roles'),
    },
    raw: () => c as unknown as any,
  }
}

/** 将 VextMiddleware 转换为 Hono MiddlewareHandler */
function toHonoMiddleware(mw: VextMiddleware): MiddlewareHandler {
  return async (c, next) => {
    const ctx = wrapContext(c)
    await mw(ctx, next)
  }
}

/** 将 VextHandler 转换为 Hono Handler */
function toHonoHandler(handler: VextHandler): MiddlewareHandler {
  return async (c) => {
    const ctx = wrapContext(c)
    return handler(ctx) as any
  }
}

class HonoRouter implements VextRouter {
  constructor(public _hono: Hono) {}

  private _register(method: string, path: string, ...handlers: Array<VextMiddleware | VextHandler>) {
    const honoHandlers = handlers.map(h => toHonoHandler(h as VextHandler))
    ;(this._hono as any)[method](path, ...honoHandlers)
  }

  get   (path: string, ...h: any[]) { this._register('get',    path, ...h) }
  post  (path: string, ...h: any[]) { this._register('post',   path, ...h) }
  put   (path: string, ...h: any[]) { this._register('put',    path, ...h) }
  patch (path: string, ...h: any[]) { this._register('patch',  path, ...h) }
  delete(path: string, ...h: any[]) { this._register('delete', path, ...h) }
}

export class HonoAdapter implements VextAdapter {
  private _app = new Hono()

  use(path: string, ...middlewares: VextMiddleware[]) {
    this._app.use(path, ...middlewares.map(toHonoMiddleware))
  }

  route(method: string, path: string, ...handlers: Array<VextMiddleware | VextHandler>) {
    const honoHandlers = handlers.map(h => toHonoHandler(h as VextHandler))
    ;(this._app as any)[method.toLowerCase()](path, ...honoHandlers)
  }

  mount(prefix: string, subRouter: VextRouter) {
    this._app.route(prefix, (subRouter as HonoRouter)._hono)
  }

  listen(port: number, callback?: () => void) {
    serve({ fetch: this._app.fetch, port }, callback)
  }

  createRouter(): VextRouter {
    return new HonoRouter(new Hono())
  }
}

/** 导出工厂函数 */
export function honoAdapter(): HonoAdapter {
  return new HonoAdapter()
}
```

---

## 包结构

采用**单包 + adapter 作为配置项传入**，不拆 monorepo（现阶段复杂度不高，且框架处于早期）：

```
vext/
├── src/
│   ├── core/                    # vext 核心（框架无关）
│   │   ├── adapter.ts           # VextAdapter / VextContext 接口定义
│   │   ├── app.ts               # createApp() 主入口
│   │   ├── define-routes.ts     # defineRoutes() & 三段式路由
│   │   ├── plugin.ts            # definePlugin()
│   │   ├── request-context.ts   # AsyncLocalStorage 请求级上下文
│   │   ├── context-loader.ts    # services/schemas 自动扫描注入
│   │   ├── router-loader.ts     # 文件路由扫描加载器
│   │   ├── middleware-registry.ts # 路由级中间件注册表
│   │   └── errors.ts            # AppError 统一错误类
│   │
│   ├── adapters/
│   │   └── hono/                # Hono 适配器（当前唯一实现）
│   │       └── index.ts
│   │
│   └── index.ts                 # 公共导出入口
│
├── template/                    # 用户项目模板（独立目录）
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── middlewares/
│   │   ├── plugins/
│   │   ├── config/
│   │   └── app.ts
│   ├── .env.example
│   └── package.json
│
├── index.d.ts
├── index.mjs
└── package.json
```

---

## 用户项目完整目录结构

```
my-app/
├── src/
│   ├── routes/                       # 文件路径 = 路由挂载前缀
│   │   ├── api/
│   │   │   ├── users.ts              →  /api/users/*
│   │   │   └── posts.ts              →  /api/posts/*
│   │   └── admin/
│   │       └── users.ts              →  /admin/users/*
│   │
│   ├── services/                     # 与 routes 目录结构对应
│   │   ├── api/
│   │   │   ├── users.ts
│   │   │   └── posts.ts
│   │   └── admin/
│   │       └── users.ts
│   │
│   ├── models/                       # <db类型>/<连接名>/<表>.ts
│   │   ├── mysql/
│   │   │   ├── main/
│   │   │   │   ��── users.ts
│   │   │   │   └── posts.ts
│   │   │   └── orders/
│   │   │       └── orders.ts
│   │   ├── redis/
│   │   │   └── default/
│   │   │       └── session.ts
│   │   └── mongo/
│   │       └── logs/
│   │           └── access-log.ts
│   │
│   ├── schemas/                      # Zod schema（按模块集中管理）
│   │   ├── users.ts
│   │   └── posts.ts
│   │
│   ├── middlewares/
│   │   ├── global/                   # 数字前缀排序自动注册
│   │   ��   ├── 01.logger.ts
│   │   │   ├── 02.cors.ts
│   │   │   ├── 03.error.ts
│   │   │   └── 04.response-transform.ts
│   │   ├── auth.ts                   # 路由级中间件
│   │   └── rate-limit.ts
│   │
│   ├── plugins/                      # 插件（可选）
│   │   └── swagger.ts
│   │
│   ├── config/
│   │   ├── index.ts                  # zod 解析 .env，启动 fail-fast
│   │   └── watcher.ts
│   │
│   ├── types/
│   │   └── index.ts                  # 全局类型扩展
│   │
│   ├── app.ts                        # 应用组装入口
│   └── server.ts                     # HTTP Server 启动
│
├── .env
├── .env.example
├── nodemon.json
├── tsconfig.json
└── package.json
```

---

## 分层职责

| 层 | 目录 | 做什么 | 不做什么 |
|---|------|--------|---------|
| HTTP 层 | `routes/` | 配置中间件、声明校验、调用 service、返回响应 | 不含业务规则，不操作数据库 |
| 业务层 | `services/` | 业务规则、跨 model 组合、事务编排 | 不处理 HTTP 细节 |
| 数据层 | `models/` | 数据库 CRUD 封装 | 不含业务判断 |
| 校验层 | `schemas/` | Zod schema 集中管理 | 不含业务逻辑 |
| 中间件 | `middlewares/` | 全局横切关注点 | 不含业务逻辑 |
| 插件 | `plugins/` | 可插拔扩展能力 | 不替代中间件职责 |
| 框架核心 | `vext/src/core/` | 路由加载、自动注入、adapter 调用 | 不含业务逻辑 |
| Adapter | `vext/src/adapters/` | 底层框架 API 映射 | 不含框架无关逻辑 |

