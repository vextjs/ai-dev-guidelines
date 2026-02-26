# 01b - 路由级中间件（middlewares）

> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-26 P1 修复）
> **状态**: ✅ 已确认
> **所属模块**: 路由层 → `01-routes.md`

---

## 1. 核心机制

中间件分为两个关注点：

| 关注点 | 机制 |
|------|------|
| **哪些中间件被加载** | `config/default.ts` 声明白名单，只有声明的才进入 registry |
| **哪些路由使用** | 路由 `options.middlewares` 按名称引用 |

`middlewares/` 目录只放中间件文件，**不自动全量加载**，必须在 `config/default.ts` 中声明才生效。

> **全局能力分层**：
> - **框架内置**（cors / requestId / body-parser / rateLimit）→ 自动注册，通过 config 配置
> - **插件全局**（security headers / APM / tracing）→ `app.use()`，见 `04-plugins.md`
>
> 路由级中间件（`options.middlewares`）只处理认证/鉴权等**路由差异化逻辑**。
> **body 解析**（JSON / URL-encoded）→ 框架内置，非插件、非中间件，详见 `06-built-ins.md`。

---

## 2. 目录结构

```
src/middlewares/
├── auth.ts            ← 认证（只有 default.ts 声明后才加载）
├── rate-limit.ts      ← 速率限制（支持全局默认参数 + 路由级覆盖）
└── check-role.ts      ← 角色校验
```

> **废除 `global/` 子目录**：全局行为由插件负责，中间件只有路由级。

---

## 3. config/default.ts — 中间件白名单 + 默认参数

```typescript
// src/config/default.ts — 纯对象，无需任何 import
export default {
  // ...其他配置...
  middlewares: [
    'auth',        // → middlewares/auth.ts
    'check-role',  // → middlewares/check-role.ts
    // 速率限制已由框架内置（config.rateLimit），无需放这里
    // 如需路由级细粒度覆盖，在路由 override.rateLimit 配置即可
  ],
}
```

**名称即文件名（去掉 `.ts`），统一 kebab-case，无任何转换**：

| 元素写法 | 对应文件 | 含义 |
|---------|---------|------|
| `'auth'` | `middlewares/auth.ts` | 加载，无默认参数 |
| `{ name: 'check-role', options: { roles: ['admin'] } }` | `middlewares/check-role.ts` | 加载，带默认参数 |

**加载规则**：

| `default.ts` 声明 | `middlewares/` 有文件 | 结果 |
|------------------|-------------------|------|
| ✅ 有 | ✅ 有 | 正常加载进 registry |
| ✅ 有 | ❌ 无 | **启动报错** |
| ❌ 无 | ✅ 有 | **不加载**（静默跳过） |

---

## 4. 中间件文件写法

### 4.1 普通中间件（`defineMiddleware` 包装）

```typescript
// src/middlewares/auth.ts
import { defineMiddleware } from 'vextjs'

export default defineMiddleware(async (req, _res, next) => {
  const token = req.headers['authorization']
  if (!token) req.app.throw(401, 'Unauthorized')
  req.user = verifyToken(token)
  next()
})
```

引用：`middlewares: ['auth']`

### 4.2 工厂中间件（`defineMiddlewareFactory` 包装）

```typescript
// src/middlewares/rate-limit.ts
import { defineMiddlewareFactory } from 'vextjs'

export default defineMiddlewareFactory<{ max: number; window?: number }>(
  (options) => {
    return async (req, _res, next) => {
      // 按 options.max / options.window 执行限流逻辑
      // options 来自：路由覆盖值 > config/default.ts 默认值
      next()
    }
  }
)
```

### 4.3 `defineMiddleware` / `defineMiddlewareFactory` 实现

框架提供两个辅助函数，用于**显式声明**中间件类型（而非靠运行时推断）：

```typescript
// vextjs/lib/define-middleware.ts

const MIDDLEWARE_TAG        = Symbol.for('vextjs.middleware')
const MIDDLEWARE_FACTORY_TAG = Symbol.for('vextjs.middleware.factory')

/**
 * 标记一个函数为普通中间件
 */
export function defineMiddleware(fn: VextMiddleware): VextMiddleware & { __tag: symbol } {
  ;(fn as any).__tag = MIDDLEWARE_TAG
  return fn as VextMiddleware & { __tag: symbol }
}

/**
 * 标记一个函数为中间件工厂
 */
export function defineMiddlewareFactory<TOptions = unknown>(
  factory: VextMiddlewareFactory<TOptions>,
): VextMiddlewareFactory<TOptions> & { __tag: symbol } {
  ;(factory as any).__tag = MIDDLEWARE_FACTORY_TAG
  return factory as VextMiddlewareFactory<TOptions> & { __tag: symbol }
}

/**
 * 框架内部：检测中间件类型
 */
export function isMiddlewareFactory(fn: unknown): boolean {
  return (fn as any)?.__tag === MIDDLEWARE_FACTORY_TAG
}

export function isMiddleware(fn: unknown): boolean {
  return (fn as any)?.__tag === MIDDLEWARE_TAG
}
```

> **为什么用显式标记而非运行时推断？** 之前的设计靠 `finalOptions !== undefined` 判断是工厂还是普通中间件，当工厂以字符串声明（无 options）时会误判为普通中间件，导致将工厂函数本身当作中间件执行。`defineMiddleware` / `defineMiddlewareFactory` 通过 Symbol 标记让作者意图显式化，框架检测零歧义。

### 4.4 中间件错误处理

中间件中抛出错误有两种等价写法，均由全局错误处理捕获，返回统一格式响应：

```typescript
// 写法 1（推荐）：直接使用 req.app.throw，语义清晰
import { defineMiddleware } from 'vextjs'

export default defineMiddleware(async (req, _res, next) => {
  const token = req.headers['authorization']
  if (!token) req.app.throw(401, 'Unauthorized')   // 抛出 HttpError，终止执行链
  next()
})

// 写法 2：try-catch 捕获后重抛（适合调用第三方 SDK 的场景）
import { defineMiddleware } from 'vextjs'

export default defineMiddleware(async (req, _res, next) => {
  try {
    req.user = await authService.verify(req.headers['authorization'])
    next()
  } catch (err) {
    req.app.throw(401, 'Token 无效或已过期')
  }
})
```

> **注意**：vextjs 中间件**不使用 `next(err)`** 传递错误（Express 风格），统一使用 `req.app.throw()` 或直接 `throw`。`next` 只有一个职责：调用下一个中间件/handler。

### 4.5 文件导出规范

每个中间件文件使用 **`export default`**，必须用 `defineMiddleware()` 或 `defineMiddlewareFactory()` 包装：

| 导出方式 | `default.ts` 声明方式 | 路由引用方式 |
|---------|-------------------|------------|
| `defineMiddleware(fn)` | `'auth'` | `'auth'` |
| `defineMiddlewareFactory(fn)` | `{ name: 'rate-limit', options: { max: 100 } }` | `'rate-limit'`（用默认参数）或 `{ name: 'rate-limit', options: { max: 5 } }` |

> **兼容说明**：未使用 `defineMiddleware` / `defineMiddlewareFactory` 包装的裸 `export default` 仍可工作（框架退化为运行时推断），但会在启动时输出警告：`[vextjs] middlewares/auth.ts: export default without defineMiddleware() / defineMiddlewareFactory() is deprecated. Please wrap your middleware for explicit type declaration.`

---

## 5. 路由引用写法

```typescript
middlewares: ['auth']
middlewares: ['rate-limit']                                          // 使用默认 max: 100
middlewares: [{ name: 'rate-limit', options: { max: 5 } }]          // 覆盖为 max: 5
middlewares: ['auth', { name: 'rate-limit', options: { max: 5 } }]  // 混合
```

**参数优先级**：路由 `options` 覆盖值 **>** `config/default.ts` 默认值

---

## 6. 执行顺序

```
框架内置中间件（requestId / cors / body-parser / rateLimit）
  ↓
插件注册的全局中间件（app.use()，security-headers / APM 等，见 04-plugins.md）
  ↓
options.middlewares 数组（按数组顺序）
  ↓
validate 中间件（options.validate，见 01a-validate.md）
  ↓
handler
```

---

## 7. 框架内部：middleware-loader.ts

```typescript
// vextjs/lib/middleware-loader.ts（框架内部，用户不感知）
import path from 'path'
import { existsSync } from 'fs'
import { isMiddleware, isMiddlewareFactory } from './define-middleware'

type MiddlewareDecl = string | { name: string; options?: Record<string, unknown> }

interface MiddlewareRegistryEntry {
  handler:        VextMiddleware | VextMiddlewareFactory
  defaultOptions: Record<string, unknown> | undefined
  kind:           'middleware' | 'factory'
}

export type MiddlewareRegistry = Record<string, MiddlewareRegistryEntry>

// 支持的文件扩展名（按优先级）
const EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs']

/**
 * 在 middlewaresDir 下查找指定 name 对应的文件。
 * 'rate-limit' → 尝试 rate-limit.ts / rate-limit.js / rate-limit.mjs / rate-limit.cjs
 * 返回完整路径或 null。
 */
function resolveFile(middlewaresDir: string, name: string): string | null {
  for (const ext of EXTENSIONS) {
    const full = path.join(middlewaresDir, `${name}${ext}`)
    if (existsSync(full)) return full
  }
  return null
}

export async function loadMiddlewares(
  middlewaresDir: string,
  declarations:   MiddlewareDecl[],
  logger:         VextLogger,
): Promise<MiddlewareRegistry> {
  const registry: MiddlewareRegistry = {}

  for (const decl of declarations) {
    const name           = typeof decl === 'string' ? decl : decl.name
    const defaultOptions = typeof decl === 'string' ? undefined : decl.options

    // ── 查找文件（JS/TS 双语言） ──────────────────────────
    const fullPath = resolveFile(middlewaresDir, name)

    if (!fullPath) {
      throw new Error(
        `[vextjs] Middleware "${name}" declared in config/default.ts\n` +
        `         but no matching file found in src/middlewares/.\n` +
        `         Searched: ${EXTENSIONS.map(e => `${name}${e}`).join(', ')}`
      )
    }

    // ── 动态 import ──────────────────────────────────────
    const mod = await import(fullPath)

    if (!mod.default) {
      throw new Error(
        `[vextjs] src/middlewares/${path.basename(fullPath)} has no default export.\n` +
        `         Must export default defineMiddleware(fn) or defineMiddlewareFactory(fn).`
      )
    }

    const handler = mod.default

    // ── 检测中间件类型（显式标记优先，运行时推断兜底） ────────
    let kind: 'middleware' | 'factory'

    if (isMiddlewareFactory(handler)) {
      kind = 'factory'
    } else if (isMiddleware(handler)) {
      kind = 'middleware'
    } else if (typeof handler === 'function') {
      // 兜底：未使用 defineMiddleware / defineMiddlewareFactory 包装
      // 退化为运行时推断（defaultOptions 存在 → factory，否则 → middleware）
      kind = defaultOptions !== undefined ? 'factory' : 'middleware'
      logger.warn(
        `[vextjs] middlewares/${path.basename(fullPath)}: export default without ` +
        `defineMiddleware() / defineMiddlewareFactory() is deprecated. ` +
        `Please wrap your middleware for explicit type declaration.`
      )
    } else {
      throw new Error(
        `[vextjs] src/middlewares/${path.basename(fullPath)} default export is not a function.\n` +
        `         Expected defineMiddleware(fn) or defineMiddlewareFactory(fn).`
      )
    }

    // ── 声明一致性检查 ───────────────────────────────────
    if (kind === 'middleware' && defaultOptions !== undefined) {
      throw new Error(
        `[vextjs] Middleware "${name}" is declared with options in config,\n` +
        `         but src/middlewares/${path.basename(fullPath)} exports defineMiddleware() (not a factory).\n` +
        `         Use defineMiddlewareFactory() if this middleware accepts options.`
      )
    }

    registry[name] = { handler, defaultOptions, kind }
  }

  return registry
}
```

---

## 8. 路由引用时的参数合并

```typescript
// vextjs/lib/middleware-resolver.ts（框架内部）
import { isMiddlewareFactory } from './define-middleware'

function resolveMiddlewares(
  configs:  MiddlewareConfig[],
  registry: MiddlewareRegistry
): VextMiddleware[] {
  return configs.map((cfg) => {
    const name           = typeof cfg === 'string' ? cfg : cfg.name
    const overrideOpts   = typeof cfg === 'string' ? undefined : cfg.options

    const entry = registry[name]
    if (!entry) throw new Error(`[vextjs] middleware "${name}" not registered`)

    // ── 根据显式标记判断类型 ───────────────────────────────
    if (entry.kind === 'factory') {
      // 工厂中间件：参数合并（路由覆盖 > default.ts 默认值）
      const finalOptions = overrideOpts ?? entry.defaultOptions
      if (finalOptions === undefined) {
        throw new Error(
          `[vextjs] Middleware factory "${name}" requires options,\n` +
          `         but no options provided in route or config/default.ts.`
        )
      }
      return (entry.handler as VextMiddlewareFactory)(finalOptions)
    }

    // 普通中间件：直接使用，忽略 options（已在 loader 阶段校验过一致性）
    if (overrideOpts !== undefined) {
      throw new Error(
        `[vextjs] Middleware "${name}" is not a factory and does not accept options.\n` +
        `         Remove the options or use defineMiddlewareFactory() in the middleware file.`
      )
    }
    return entry.handler as VextMiddleware
  })
}
```

---

## 9. 启动时 Fail Fast 验证汇总

| 检测项 | 错误示例 |
|-------|---------|
| `default.ts` 声明了但文件不存在 | `Middleware "auth" declared in config/default.ts but no matching file found in src/middlewares/. Searched: auth.ts, auth.js, auth.mjs, auth.cjs` |
| 中间件文件无 `export default` | `src/middlewares/auth.ts has no default export. Must export default defineMiddleware(fn) or defineMiddlewareFactory(fn).` |
| 默认导出不是函数 | `src/middlewares/auth.ts default export is not a function.` |
| 声明带 options 但导出为 `defineMiddleware`（类型不匹配） | `Middleware "auth" is declared with options in config, but exports defineMiddleware() (not a factory).` |
| 路由引用了未在 `default.ts` 声明的名称 | `middleware "auth" not registered` |
| 普通中间件在路由引用时传了 options | `Middleware "auth" is not a factory and does not accept options.` |
| 工厂中间件无 options（config 和路由均未提供） | `Middleware factory "rate-limit" requires options, but no options provided in route or config/default.ts.` |
| 未使用 `defineMiddleware` / `defineMiddlewareFactory`（兼容但警告） | `[warn] middlewares/auth.ts: export default without defineMiddleware() / defineMiddlewareFactory() is deprecated.` |

---

## 10. 全局能力 vs 路由级中间件

| 维度 | 全局能力 | 路由级中间件 |
|------|---------|------------|
| 典型场景 | logger、cors、security headers | auth、rate-limit、check-role |
| 机制 | 插件（`plugins/`），**自动扫描加载** | 中间件（`middlewares/`），白名单加载 |
| 配置位置 | 无需配置，放 `plugins/` 目录即生效 | `config/default.ts → middlewares[]` |
| 路由可覆盖 | ❌ | ✅（通过 `options.middlewares`） |
| 详细方案 | `04-plugins.md` | 本文档 |
