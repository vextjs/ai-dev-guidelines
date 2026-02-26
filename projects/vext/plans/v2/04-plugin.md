# 04 - 插件系统

## 设计原则

插件是 vext v2 的扩展机制，用于将**可复用的框架级能力**打包为独立模块，与业务代码解耦。

**插件能做什么：**
- 注册全局中间件（如 CORS、日志、swagger UI）
- 扩展 `VextContext`（注入新方法/属性到 ctx）
- 声明生命周期钩子（onStart / onStop / onRequest）
- 注册路由（如 swagger UI 的 `/docs` 路由）

**插件不做什么：**
- 不替代业务中间件（不放业务逻辑）
- 不直接操作数据库（通过 service 层）

---

## definePlugin API

```typescript
// core/plugin.ts

export interface PluginHooks {
  /** 应用启动完成后调用（所有路由已加载） */
  onStart?: (app: VextApp) => void | Promise<void>
  /** 应用关闭时调用（执行清理） */
  onStop?: () => void | Promise<void>
  /** 每个请求进入时调用（全局请求钩子，早于路由中间件） */
  onRequest?: (ctx: VextContext) => void | Promise<void>
}

export interface PluginDefinition {
  name:        string
  setup:       (app: VextApp) => void | Promise<void>
  hooks?:      PluginHooks
}

/**
 * definePlugin — 定义一个插件
 * @example
 * export const corsPlugin = definePlugin({
 *   name: 'cors',
 *   setup(app) {
 *     app.useGlobal('*', corsMiddleware({ origin: '*' }))
 *   },
 * })
 */
export function definePlugin(definition: PluginDefinition): PluginDefinition {
  return definition
}
```

---

## VextApp 对象（插件 setup 的入参）

```typescript
// core/app.ts（VextApp 接口）

export interface VextApp {
  /** 注册全局中间件（所有路由之前执行） */
  useGlobal(path: string, ...middlewares: VextMiddleware[]): void
  /** 注册命名路由级中间件（供 defineRoutes 的 middlewares 配置引用） */
  registerMiddleware(name: string, handler: VextMiddleware | ((opts: any) => VextMiddleware)): void
  /** 注册路由（插件自己的路由，如 /docs） */
  addRoute(method: string, path: string, handler: VextHandler): void
  /** 访问底层 adapter（escape hatch） */
  adapter: VextAdapter
  /** 访问当前路由表（只读） */
  readonly routeTable: readonly RouteRecord[]
}
```

---

## 内置插件示例

### swagger 插件

```typescript
// plugins/swagger.ts
import { definePlugin } from 'vext'
import { getRouteTable } from 'vext/core/define-routes'

export const swaggerPlugin = definePlugin({
  name: 'swagger',

  setup(app) {
    // 在 onStart 钩子中生成，确保路由表已完整加载
  },

  hooks: {
    onStart(app) {
      const routes = app.routeTable
      const spec   = buildOpenAPISpec(routes)   // 根据 routeTable 生成 OpenAPI spec

      // 注册 swagger UI 路由
      app.addRoute('get', '/docs', async (ctx) => {
        return ctx.res.text(renderSwaggerUI('/docs/json'), 200)
      })
      app.addRoute('get', '/docs/json', async (ctx) => {
        return ctx.res.json(spec)
      })
    },
  },
})

function buildOpenAPISpec(routes: readonly RouteRecord[]) {
  const paths: Record<string, any> = {}
  for (const route of routes) {
    const p = route.path.replace(/:(\w+)/g, '{$1}')   // /users/:id → /users/{id}
    paths[p] = paths[p] ?? {}
    paths[p][route.method.toLowerCase()] = {
      summary:    route.docs?.summary,
      tags:       route.docs?.tags,
      deprecated: route.docs?.deprecated,
      responses:  route.docs?.responses ?? { 200: { description: 'OK' } },
    }
  }
  return {
    openapi: '3.0.0',
    info: { title: 'API', version: '1.0.0' },
    paths,
  }
}
```

### requestId 插件（内置，默认启用）

```typescript
// vext 内置，用户无需手动添加
import { definePlugin, runWithRequestContext } from 'vext'

export const requestContextPlugin = definePlugin({
  name: 'request-context',

  setup(app) {
    app.useGlobal('*', async (ctx, next) => {
      const requestId = crypto.randomUUID()
      await runWithRequestContext(
        { requestId, startedAt: Date.now() },
        next
      )
    })
  },
})
```

---

## 用户注册插件

```typescript
// app.ts
import { createApp } from 'vext'
import { honoAdapter } from 'vext/adapters/hono'
import { swaggerPlugin } from './plugins/swagger'

const app = await createApp({
  adapter:  honoAdapter(),
  plugins:  [swaggerPlugin],   // 按顺序执行 setup
  // ...其他配置
})
```

---

## 插件执行顺序

```
createApp() 调用
  ↓
1. 内置插件 setup()（requestContext、healthCheck 等）
  ↓
2. 用户插件 setup()（按 plugins 数组顺序）
  ↓
3. 全局中间件加载（middlewares/global/ 数字排序）
  ↓
4. 路由加载（routes/ 文件扫描）
  ↓
5. 触发所有插件 hooks.onStart()
  ↓
服务启动（adapter.listen）
  ↓
每次请求：触发 hooks.onRequest()
  ↓
SIGTERM/SIGINT：触发所有插件 hooks.onStop()
```

---

## 第三方插件规范

第三方插件包命名规范：`vext-plugin-<name>`

```typescript
// 第三方插件示例：vext-plugin-rate-limit
import { definePlugin, type VextMiddleware } from 'vext'

export function rateLimitPlugin(opts: { max: number; window: number }) {
  return definePlugin({
    name: 'rate-limit',
    setup(app) {
      app.registerMiddleware('rateLimit', (routeOpts) => {
        return makeRateLimitMiddleware({ ...opts, ...routeOpts })
      })
    },
  })
}

// 使用
plugins: [rateLimitPlugin({ max: 100, window: 60 })]
```

