# 01d - router-loader 内部实现

> **项目**: vext
> **日期**: 2026-02-26
> **状态**: ✅ 已确认
> **所属模块**: 路由层 → `01-routes.md`
> **文件位置**: `vextjs/lib/router-loader.ts`

---

## 1. 职责

扫描用户项目的 `src/routes/` 目录，自动加载所有路由文件，提取挂载前缀，依次注册到底层 adapter。

**用户无需手动 import 或注册路由文件**，框架在启动时全量完成。

---

## 2. 启动流程总览

```
vext dev / start
  ↓
config-loader 加载配置（default → env → local 深度合并）
  ↓
createApp(finalConfig)
  ↓
① 内置模块初始化（logger、throw、setValidator、requestId…）
①+ i18n 语言包自动加载（src/locales/ 存在时，通过 dsl.config 扫描注册）
② plugin-loader    扫描 plugins/ 自动加载（可覆盖内置）
③ middleware-loader 按 config.middlewares 白名单加载
④ service-loader   扫描 services/ 实例化，注入到 app.services
⑤ router-loader    扫描 routes/ 注册路由                  ← 本文档
⑥ 注册出口包装中间件、全局错误处理、404 兜底
⑦ HTTP 开始监听
⑧ 执行所有 onReady 钩子
⑨ /ready → 200，打印启动日志
```

---

## 3. 扫描与加载流程

```typescript
// vextjs/lib/router-loader.ts
import { glob } from 'fast-glob'
import path from 'path'
import { filePathToPrefix, sortRouteFiles, isRouteDefinition } from './utils'
import { validateMiddlewareRefs } from './middleware-resolver'

interface LoadRoutesOptions {
  /** 已加载的中间件定义（来自 middleware-loader） */
  middlewareDefs?: MiddlewareRegistry
  /** 全局中间件列表（来自 internals.getGlobalMiddlewares()） */
  globalMiddlewares?: VextMiddleware[]
  /** OpenAPI 元信息收集器（可选，未配置 openapi 时为 null/undefined）。详见 14-openapi.md §3 */
  collector?: RouteMetadataCollector | null
}

export async function loadRoutes(
  app: VextApp,
  routesDir: string,
  options: LoadRoutesOptions = {},
) {
  const { middlewareDefs = {}, globalMiddlewares = [] } = options

  // 1. 扫描路由文件（支持 TS / JS，排除类型声明文件）
  const ROUTE_EXTS = '{ts,js,mjs,cjs}'
  const files = await glob(`**/*.${ROUTE_EXTS}`, {
    cwd:    routesDir,
    ignore: ['**/*.d.ts'],
  })

  // 2. Fail Fast：检测路由目录内的非路由文件
  for (const file of files) {
    if (/\.(test|spec)\.(ts|js|mjs|cjs)$/.test(file)) {
      throw new Error(
        `[vext] Unexpected file in routes/: ${file}\n` +
        `       routes/ should only contain route files.\n` +
        `       Move test files to test/routes/ instead.`
      )
    }
  }

  // 3. 静态文件排在动态文件之前（保障注册顺序）
  const sorted = sortRouteFiles(files)

  // 4. 检测前缀冲突（如 users.ts 和 users/index.ts 同时存在）
  detectPrefixConflicts(sorted)

  // 5. 逐文件加载并注册
  const routeDefs: RouteDefinition[] = []
  const registeredRoutes = new Map<string, string>()  // 'METHOD /path' → sourceFile

  for (const file of sorted) {
    const fullPath = path.join(routesDir, file)
    const prefix   = filePathToPrefix(file)

    const mod = await import(fullPath)
    const routeDef = mod.default

    // Fail Fast：导出不合法则启动失败
    if (!isRouteDefinition(routeDef)) {
      throw new Error(
        `[vext] ${file} does not export a valid defineRoutes() result.\n` +
        `       Did you forget: export default defineRoutes(...)?`
      )
    }

    routeDef.sourceFile = file
    routeDefs.push(routeDef)

    // 重复路由检测：注册前检查同 method + path 是否已存在
    for (const route of routeDef.getRoutes(prefix)) {
      const key = `${route.method} ${route.path}`
      const existing = registeredRoutes.get(key)
      if (existing) {
        throw new Error(
          `[vext] Duplicate route: ${key}\n` +
          `       Already registered by: ${existing}\n` +
          `       Conflict in: ${file}\n` +
          `       Rename the route or use a different path/method.`
        )
      }
      registeredRoutes.set(key, file)
    }

    // 🆕 收集元信息（用于 OpenAPI 生成）
    if (options.collector) {
      for (const route of routeDef.getRoutes(prefix)) {
        options.collector.addRoute(route.method, route.path, route.options, file)
      }
    }

    routeDef.register(app.adapter, prefix, { middlewareDefs, globalMiddlewares })
  }

  // 6. 启动时统一验证所有中间件引用
  validateMiddlewareRefs(routeDefs, app.config.middlewares, middlewareDefs)
}
```

---

## 4. 前缀提取算法

```typescript
function filePathToPrefix(filePath: string): string {
  // 示例转换：
  // routes/api/users.ts          →  /api/users
  // routes/index.ts              →  /
  // routes/api/index.ts          →  /api
  // routes/users/[id].ts         →  /users/:id
  // routes/users/[id]/posts.ts   →  /users/:id/posts

  let p = filePath
    .replace(/\.(ts|js|mjs|cjs)$/, '')        // 去扩展名（支持 TS/JS）
    .replace(/\[([^\]]+)\]/g, ':$1')       // [param] → :param
    .replace(/\/index$/, '')               // /xxx/index → /xxx
    .replace(/^index$/, '')                // index → ''（根路由）

  return '/' + p.replace(/^\//, '')        // 确保以 / 开头，'' → '/'
}
```

---

## 5. 文件排序（静态优先于动态）

```typescript
function sortRouteFiles(files: string[]): string[] {
  return [...files].sort((a, b) => {
    const aIsDynamic = /\[/.test(a)
    const bIsDynamic = /\[/.test(b)

    // 动态段文件排在静态文件之后
    if (aIsDynamic && !bIsDynamic) return 1
    if (!aIsDynamic && bIsDynamic) return -1

    // 同类（都静态或都动态）按字母序
    return a.localeCompare(b)
  })
}
```

**排序示例**：

```
排序前（glob 返回顺序不定）：
  users/[id].ts
  users/profile.ts
  users.ts
  index.ts

排序后（静态优先）：
  index.ts
  users.ts
  users/profile.ts
  users/[id].ts      ← 动态段文件排最后
```

---

## 6. 前缀冲突检测

```typescript
function detectPrefixConflicts(files: string[]) {
  const prefixMap = new Map<string, string>()  // prefix → filePath

  for (const file of files) {
    const prefix = filePathToPrefix(file)
    if (prefixMap.has(prefix)) {
      throw new Error(
        `[vext] Route prefix conflict detected.\n` +
        `       "${prefixMap.get(prefix)}" and "${file}" both resolve to prefix "${prefix}".\n` +
        `       Remove one of them.`
      )
    }
    prefixMap.set(prefix, file)
  }
}
```

**触发示例**：`routes/users.ts`（`/users`）和 `routes/users/index.ts`（`/users`）同时存在：

```
[vext] Route prefix conflict detected.
       "users.ts" and "users/index.ts" both resolve to prefix "/users".
       Remove one of them.
```

---

## 7. Fail Fast 原则汇总

router-loader 的所有检测均在**启动阶段**完成，不等到运行时才暴露问题：

| 检测项 | 时机 | 错误示例 |
|-------|------|---------|
| 路由目录内非路由文件（如 `.test.ts`） | 扫描后 | `Unexpected file in routes/: users.test.ts` |
| 路由文件无默认导出 | import 后 | `users.ts does not export a valid defineRoutes() result` |
| 前缀冲突 | 扫描后 | `users.ts and users/index.ts both resolve to prefix "/users"` |
| 中间件名称未注册 | 全部路由加载后 | `middleware "auth" is not registered` |