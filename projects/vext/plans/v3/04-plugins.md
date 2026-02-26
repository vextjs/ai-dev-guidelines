# 04 - 插件系统（plugins/）详细方案

> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-28 P0/P1 修复）
> **状态**: ✅ 已确认
> **依赖**: 目录结构（`00-directory-structure.md` ✅）、内置模块（`06-built-ins.md` ✅）

---

## 0. 概述

插件是 vextjs **扩展框架能力**的标准机制，运行在内置模块初始化之后、路由注册之前。

```
vext dev / start
  ↓
config-loader 加载配置（default → env → local 深度合并）
  ↓
createApp(finalConfig)
  ↓
① 内置模块初始化（logger、throw、setValidator、requestId…）
①+ i18n 语言包自动加载（src/locales/ 存在时，通过 dsl.config 扫描注册）
② plugin-loader    扫描 plugins/ 自动加载（可覆盖内置）  ← 插件在这里运行
③ middleware-loader 按 config.middlewares 白名单加载
④ service-loader   扫描 services/ 实例化，注入到 app.services
⑤ router-loader    扫描 routes/ 注册路由
⑥ 注册出口包装中间件、全局错误处理、404 兜底
⑦ HTTP 开始监听
⑧ 执行所有 onReady 钩子
⑨ /ready → 200，打印启动日志
```

**插件能做什么：**

| 能力 | 示例 |
|------|------|
| 挂载新能力到 `app` | `app.extend('db', drizzle(...))` |
| 覆盖内置模块 | `app.setThrow(...)` / `app.logger = winstonLogger` |
| 注册全局 HTTP 中间件 | `app.use(corsMiddleware)` |
| 注册关闭钩子 | `app.onClose(() => pool.end())` |
| 读取 & 扩展配置 | `app.config.redis.url` |

**插件不能做什么：**

| 限制 | 原因 |
|------|------|
| 覆盖 `app.config` | 只读，启动时已合并完毕 |
| 覆盖 `app.services` | 由 service-loader 托管 |
| 在 `setup` 完成后再修改 `app` 结构 | 路由注册时 app 已冻结 |

---

## 1. 插件文件写法

### 1.1 基本结构

```typescript
// src/plugins/my-plugin.ts
import { definePlugin } from 'vextjs'

export default definePlugin({
  name: 'my-plugin',          // 唯一名称，冲突时 Fail Fast
  async setup(app) {
    // 在这里扩展 app
  },
})
```

> **自动加载**：`plugins/` 目录下所有 `.ts` 文件（下划线开头除外）在启动时**全部自动加载**，无需手动注册。

### 1.2 `definePlugin` 接口

```typescript
// vextjs/lib/plugin.ts
export interface VextPlugin {
  /** 插件唯一名称（用于日志输出和冲突检测） */
  name: string

  /**
   * 声明本插件需要在哪些插件 setup() 完成后才运行（拓扑排序）
   * 循环依赖 → 启动时 Fail Fast
   */
  after?: string[]

  /**
   * 初始化函数
   * - 在内置模块就绪后、路由注册前执行
   * - 支持 async（框架顺序 await 所有插件）
   */
  setup(app: VextApp): Promise<void> | void
}

export function definePlugin(plugin: VextPlugin): VextPlugin {
  return plugin
}
```

---

## 2. 目录结构与加载规则

```
src/plugins/
├── database.ts       # 自动加载
├── redis.ts          # 自动加载
├── logger.ts         # 自动加载（覆盖内置 logger）
├── _helpers.ts       # 以 _ 开头 → 自动跳过，不作为插件加载
└── apm/
    ├── index.ts      # 自动加载
    └── _utils.ts     # 以 _ 开头 → 自动跳过
```

**加载规则**：

| 规则 | 说明 |
|------|------|
| 扫描路径 | `plugins/*.{ts,js,mjs,cjs}` + `plugins/**/*.{ts,js,mjs,cjs}` |
| 跳过文件 | `_*.ts`（下划线开头）、`*.d.ts`、`*.test.ts` |
| 加载顺序 | 按文件系统顺序（字母序），如需强制顺序见 §2.1 |
| 默认导出 | 必须是 `definePlugin(...)` 的返回值 |

### 2.1 控制加载顺序（可选）

```typescript
// src/plugins/database.ts
export default definePlugin({
  name: 'database',
  // 依赖 logger 插件先完成初始化
  after: ['logger'],   // ← 声明依赖，plugin-loader 自动拓扑排序
  async setup(app) { /* ... */ },
})
```

> `after` 字段可选，框架按拓扑排序决定加载顺序；循环依赖 → Fail Fast。

---

## 3. 典型插件示例

### 3.1 数据库插件（`app.db`）

```typescript
// src/plugins/database.ts
import { definePlugin } from 'vextjs'
import { drizzle }      from 'drizzle-orm/node-postgres'
import { Pool }         from 'pg'

declare module 'vextjs' {
  interface VextApp {
    db: ReturnType<typeof drizzle>
  }
}

export default definePlugin({
  name: 'database',
  async setup(app) {
    const pool = new Pool({ connectionString: app.config.database.url })

    // ✅ 先注册 onClose，再执行 I/O
    // 即使下方 pool.query 失败，pool 也能在 shutdown 时被正确清理
    app.onClose(async () => {
      await pool.end()
      app.logger.info('[database] 连接已关闭')
    })

    // 连接测试（Fail Fast：数据库不通则启动失败，但 pool 已注册清理）
    await pool.query('SELECT 1')
    app.logger.info('[database] 连接成功')

    app.extend('db', drizzle(pool))
  },
})
```

### 3.2 Redis / 缓存插件（`app.cache`）

```typescript
// src/plugins/redis.ts
import { definePlugin } from 'vextjs'
import { Redis }        from 'ioredis'

declare module 'vextjs' {
  interface VextApp {
    cache: Redis
  }
}

export default definePlugin({
  name: 'redis',
  async setup(app) {
    const redis = new Redis(app.config.redis.url)

    // ✅ 先注册 onClose，再暴露能力 — 确保连接异常时也能清理
    app.onClose(async () => {
      await redis.quit()
      app.logger.info('[redis] 连接已关闭')
    })

    redis.on('error', (err) => {
      app.logger.error('[redis] 连接错误', { error: err.message })
    })

    app.extend('cache', redis)
  },
})
```

### 3.3 覆盖内置 logger（Winston）

```typescript
// src/plugins/logger.ts
import { definePlugin } from 'vextjs'
import winston          from 'winston'

export default definePlugin({
  name: 'winston-logger',
  setup(app) {
    const w = winston.createLogger({
      level:      app.config.logger.level,
      transports: [
        new winston.transports.Console({
          format: app.config.logger.pretty
            ? winston.format.prettyPrint()
            : winston.format.json(),
        }),
      ],
    })

    // 完全替换 app.logger，满足 VextLogger 接口即可
    app.logger = {
      info:  (msg, meta) => w.info(msg, meta),
      warn:  (msg, meta) => w.warn(msg, meta),
      error: (msg, meta) => w.error(msg, meta),
      debug: (msg, meta) => w.debug(msg, meta),
      child: (bindings)  => app.logger, // 简化示意
    }
  },
})
```

### 3.4 覆盖 `app.throw`（错误监控上报）

```typescript
// src/plugins/error-reporter.ts
import { definePlugin } from 'vextjs'

export default definePlugin({
  name: 'error-reporter',
  setup(app) {
    // ✅ 推荐：使用 setThrow() 包装（类型安全，保留原始实现）
    app.setThrow((original) => (status, message, paramsOrCode?, code?) => {
      if (status >= 500) {
        monitor.captureException({ status, message })
      }
      return original(status, message, paramsOrCode, code)
    })
  },
})
```

### 3.5 注册全局 HTTP 中间件（CORS / Security Headers）

```typescript
// src/plugins/security.ts
import { definePlugin } from 'vextjs'

export default definePlugin({
  name: 'security',
  setup(app) {
    // 注册全局中间件（在所有路由之前执行）
    app.use(async (req, _res, next) => {
      // Security Headers
      _res.setHeader('X-Content-Type-Options', 'nosniff')
      _res.setHeader('X-Frame-Options', 'DENY')
      _res.setHeader('X-XSS-Protection', '1; mode=block')
      next()
    })
  },
})
```

> **`app.use()` vs 路由级 `middlewares`**：
> - `app.use()`：插件注册全局中间件，对**所有路由**生效
> - 路由 `options.middlewares`：只对**单个路由**生效（`auth`、`rate-limit` 等）

### 3.6 APM / 分布式追踪（覆盖 requestId）

```typescript
// src/plugins/apm.ts
import { definePlugin } from 'vextjs'
import { trace }        from '@opentelemetry/api'

export default definePlugin({
  name: 'apm',
  setup(app) {
    // 通过 app.setRequestIdGenerator() 覆盖 requestId 生成算法
    // （不直接修改 app.config，保持配置只读）
    app.setRequestIdGenerator(() => {
      const span = trace.getActiveSpan()
      return span?.spanContext().traceId ?? crypto.randomUUID()
    })
  },
})
```

---

## 4. 框架内部：plugin-loader.ts

```typescript
// vextjs/lib/plugin-loader.ts（框架内部）
import { glob } from 'fast-glob'
import path     from 'path'

export async function loadPlugins(app: VextApp, pluginsDir: string): Promise<void> {
  const files = await glob('**/*.{ts,js,mjs,cjs}', {
    cwd:    pluginsDir,
    ignore: ['**/_*.{ts,js,mjs,cjs}', '**/*.d.ts', '**/*.test.{ts,js}', '**/*.spec.{ts,js}'],
  })

  const plugins: VextPlugin[] = []

  for (const file of files) {
    const mod = await import(path.join(pluginsDir, file))

    if (!mod.default || typeof mod.default !== 'object' || !mod.default.name) {
      throw new Error(
        `[vextjs] plugins/${file} must export default definePlugin({ name, setup })`
      )
    }

    plugins.push(mod.default as VextPlugin)
  }

  // 拓扑排序（按 after 依赖）
  const sorted = topoSort(plugins)

  // 依次初始化（含超时保护 + 定时器清理）
  const setupTimeout = app.config.plugin?.setupTimeout ?? 30_000
  for (const plugin of sorted) {
    app.logger.debug(`[plugin] loading: ${plugin.name}`)

    // ⚠️ 必须在 setup 完成后清理定时器，否则 setTimeout 引用会泄漏
    //    （定时器持有 reject 闭包 → 闭包持有 plugin/app 引用 → GC 无法回收）
    let timer: ReturnType<typeof setTimeout> | undefined
    await Promise.race([
      plugin.setup(app).then((result) => {
        clearTimeout(timer)
        return result
      }),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(
          new Error(`[vextjs] Plugin "${plugin.name}" setup() timed out after ${setupTimeout}ms.\n` +
                    `         Check for unresolved async operations (e.g. database connection without timeout).`)
        ), setupTimeout)
      }),
    ])

    app.logger.info(`[plugin] loaded:  ${plugin.name}`)
  }
}

function topoSort(plugins: VextPlugin[]): VextPlugin[] {
  // 按 after 字段做拓扑排序
  // 循环依赖 → throw Error('[vextjs] 插件循环依赖: a → b → a')
  // 简化版：实际实现用 Kahn 算法
  return plugins // 占位，实际含完整实现
}
```

---

## 5. 插件 setup 安全模式

### 5.1 原则：先注册 `onClose`，再执行 I/O

插件 `setup()` 中的推荐写法顺序：

```
1. 创建资源实例（new Pool / new Redis / ...）
2. app.onClose(() => 资源清理)             ← 先注册清理
3. 执行连接测试 / I/O（Fail Fast）          ← 再做 I/O
4. app.extend('key', ...)                  ← 最后暴露能力
```

**为什么？** 如果 I/O 在 `onClose` 之前执行且失败（如数据库连接超时），`setup()` 会抛错导致启动终止。此时框架会调用已注册的 `onClose` 钩子做优雅关闭。如果 `onClose` 尚未注册，已创建的连接池/客户端无法被清理，导致资源泄漏（进程退出前 TCP 连接挂起）。

### 5.2 反模式（❌ 避免）

```typescript
// ❌ 错误顺序：I/O 在 onClose 之前
export default definePlugin({
  name: 'database',
  async setup(app) {
    const pool = new Pool({ connectionString: app.config.database.url })
    await pool.query('SELECT 1')   // ← 如果这里失败...
    app.extend('db', drizzle(pool))
    app.onClose(() => pool.end())  // ← ...这里永远不会注册，pool 泄漏
  },
})
```

### 5.3 正确模式（✅ 推荐）

```typescript
// ✅ 正确顺序：onClose 在 I/O 之前
export default definePlugin({
  name: 'database',
  async setup(app) {
    const pool = new Pool({ connectionString: app.config.database.url })
    app.onClose(() => pool.end())  // ← 先注册清理
    await pool.query('SELECT 1')   // ← 再做 I/O（失败时 pool 仍能被清理）
    app.extend('db', drizzle(pool))
  },
})
```

---

## 6. 插件与其他层的交互

```
plugin
  ├── 可读写：app.logger（覆盖）
  ├── 可读写：app.throw（覆盖）
  ├── 可扩展：app.extend('db', ...)
  ├── 可注册：app.use(globalMiddleware)
  ├── 可注册：app.onClose(cleanupFn)
  ├── 只读：app.config
  └── 不可操作：app.services（service-loader 托管）
```

---

## 7. Fail Fast 验证

| 检测项 | 错误示例 |
|-------|---------|
| 文件无默认导出或格式错误 | `plugins/database.ts must export default definePlugin(...)` |
| 插件名重复 | `[vextjs] Plugin name "database" is already registered` |
| `after` 依赖不存在 | `[vextjs] Plugin "redis" depends on "database" which is not found` |
| 循环依赖 | `[vextjs] Circular dependency detected: redis → database → redis` |
| `setup` 抛出异常 | 启动终止，打印完整 stack |

---

## 8. 配置扩展（插件可扩展 `VextConfig`）

插件若需要自定义配置项，通过 `declare module 'vextjs'` 扩展 `VextConfig`：

```typescript
// src/plugins/database.ts
declare module 'vextjs' {
  interface VextConfig {
    database: {
      url:      string
      poolSize: number
    }
  }
}
```

用户在 `config/default.ts` 中补充对应配置：

```typescript
// src/config/default.ts
export default {
  // ...现有配置
  database: {
    url:      'postgres://localhost:5432/mydb',
    poolSize: 10,
  },
}
```

---

## 9. 推荐的 `src/types/app.d.ts` 汇总写法

项目中所有插件对 `VextApp` 的类型扩展建议统一汇总到一个文件，避免分散：

```typescript
// src/types/app.d.ts
import type { drizzle } from 'drizzle-orm/node-postgres'
import type { Redis }   from 'ioredis'
import type NodeMailer  from 'nodemailer'

declare module 'vextjs' {
  // ── 插件挂载到 app 的能力 ──────────────────────────────
  interface VextApp {
    db:     ReturnType<typeof drizzle>
    cache:  Redis
    mailer: ReturnType<typeof NodeMailer.createTransport>
  }

  // ── 插件扩展的配置项 ───────────────────────────────────
  interface VextConfig {
    database: { url: string; poolSize: number }
    redis:    { url: string }
  }
}
```

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|-------|---------|------|
| `VextPlugin` | `vextjs/lib/plugin.ts` | 插件接口（`name` + `setup` + 可选 `after`） |
| `definePlugin` | `vextjs/lib/plugin.ts` | 插件定义函数（提供类型推断） |
| `VextApp` | `vextjs/lib/app.ts` | 应用对象（插件在 `setup` 中接收此对象） |
| `VextConfig` | `vextjs/lib/config.ts` | 运行时配置（插件可通过 `declare module` 扩展） |

