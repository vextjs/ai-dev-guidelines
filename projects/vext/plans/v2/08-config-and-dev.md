# 08 - 配置管理 & 应用组装 & 开发工具链

## 配置管理

### 类型安全配置（启动 fail-fast）

```typescript
// config/index.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT:     z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(32),
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('❌ 环境变量配置错误:', result.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = result.data
export type AppConfig = typeof config

// 数据库配置读取（动态 key）
export function getMySQLConfig(name: string) {
  const upper = name.toUpperCase()
  const host  = process.env[`MYSQL_${upper}_HOST`]
  if (!host) return null
  return {
    host,
    port:     Number(process.env[`MYSQL_${upper}_PORT`] ?? 3306),
    user:     process.env[`MYSQL_${upper}_USER`]!,
    password: process.env[`MYSQL_${upper}_PASSWORD`]!,
    database: process.env[`MYSQL_${upper}_DATABASE`]!,
  }
}

export function getRedisConfig(name: string): string | null {
  return process.env[`REDIS_${name.toUpperCase()}_URL`] ?? null
}

export function getMongoConfig(name: string): string | null {
  return process.env[`MONGO_${name.toUpperCase()}_URL`] ?? null
}
```

### 配置热重启

```typescript
// config/watcher.ts
import chokidar from 'chokidar'
import { resolve } from 'path'

export function startConfigWatcher() {
  chokidar
    .watch([resolve(process.cwd(), '.env'), resolve(process.cwd(), '.env.local')])
    .on('change', (path) => {
      console.log(`[Config] ${path} changed, restarting...`)
      process.exit(0)   // nodemon/pm2 自动重启
    })
}
```

---

## createApp API（v2 核心入口）

```typescript
// core/app.ts

export interface CreateAppOptions {
  /** 底层框架适配器（必填） */
  adapter: VextAdapter

  /** 用户项目根目录（默认 process.cwd()/src） */
  rootDir?: string

  /** 插件列表（按顺序执行 setup） */
  plugins?: PluginDefinition[]

  /** 健康检查配置 */
  healthCheck?: {
    path?:      string                    // 默认 /healthz
    readyPath?: string                    // 默认 /readyz
    check?:     () => boolean | Promise<boolean>
  }

  /** 是否开启开发模式（热重载等） */
  dev?: boolean
}

export async function createApp(options: CreateAppOptions): Promise<VextApp> {
  const { adapter, rootDir, plugins = [], healthCheck, dev } = options
  const srcDir = rootDir ?? resolve(process.cwd(), 'src')

  // 1. 初始化 adapter 到 defineRoutes 上下文
  setFrameworkContext({ createRouter: () => adapter.createRouter() })

  // 2. 内置插件（requestContext、healthCheck）
  await requestContextPlugin.setup(vextApp)
  await healthCheckPlugin(healthCheck).setup(vextApp)

  // 3. 用户插件 setup
  for (const plugin of plugins) {
    await plugin.setup?.(vextApp)
    console.log(`[Plugin] ${plugin.name} loaded`)
  }

  // 4. 扫描注入 services 和 schemas
  setFrameworkContext({
    services: scanModules(resolve(srcDir, 'services'), 'firstExport'),
    schemas:  scanModules(resolve(srcDir, 'schemas'),  'wholeModule'),
  })

  // 5. 注册全局中间件（middlewares/global/ 数字排序）
  const globalDir = resolve(srcDir, 'middlewares/global')
  if (existsSync(globalDir)) {
    for (const file of readdirSync(globalDir).sort()) {
      const mod = await import(resolve(globalDir, file))
      adapter.use('*', mod.default)
    }
  }

  // 6. admin 路由统一鉴权（约定：admin 目录下需鉴权）
  // （由 middlewares/global 的 auth 中间件或用户自定义处理，框架不强制）

  // 7. 加载文件路由
  const routesDir = resolve(srcDir, 'routes')
  if (existsSync(routesDir)) {
    await loadRoutes(adapter, routesDir)
  }

  // 8. 触发所有插件 onStart 钩子
  for (const plugin of [requestContextPlugin, ...plugins]) {
    await plugin.hooks?.onStart?.(vextApp)
  }

  return vextApp
}
```

---

## 应用组装示例（用户项目）

```typescript
// src/app.ts
import { createApp }       from 'vext'
import { honoAdapter }     from 'vext/adapters/hono'
import { swaggerPlugin }   from './plugins/swagger'
import { authMiddleware }  from './middlewares/auth'
import { createRateLimitMiddleware } from './middlewares/rate-limit'

export async function buildApp() {
  const app = await createApp({
    adapter: honoAdapter(),
    plugins: [swaggerPlugin],
    dev: process.env.NODE_ENV === 'development',
  })

  // 注册路由级中间件（供 defineRoutes 的 middlewares 配置引用）
  app.registerMiddleware('auth',      authMiddleware)
  app.registerMiddleware('rateLimit', createRateLimitMiddleware)

  return app
}
```

```typescript
// src/server.ts
import { buildApp }          from './app'
import { config }            from './config'
import { startConfigWatcher } from './config/watcher'
import { getAllClosers }      from 'vext/db/registry'

async function bootstrap() {
  const app = await buildApp()

  app.adapter.listen(config.PORT, () => {
    console.log(`🚀 Server running → http://localhost:${config.PORT}`)
  })

  if (config.NODE_ENV === 'development') {
    startConfigWatcher()
  }

  // 优雅关闭
  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received, shutting down...`)

    // 触发插件 onStop 钩子
    // （内部由 createApp 统一管理，此处仅演示）

    // 关闭所有数据库连接
    await Promise.all(getAllClosers().map((fn) => fn()))
    console.log('[Server] All connections closed.')
    process.exit(0)
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap()
```

---

## .env.example

```ini
NODE_ENV=development
PORT=3000
JWT_SECRET=your-super-secret-key-at-least-32-chars!!

# MySQL 主业务库（MYSQL_<NAME>_*）
MYSQL_MAIN_HOST=127.0.0.1
MYSQL_MAIN_PORT=3306
MYSQL_MAIN_USER=root
MYSQL_MAIN_PASSWORD=secret
MYSQL_MAIN_DATABASE=app_main

# MySQL 订单库
MYSQL_ORDERS_HOST=127.0.0.1
MYSQL_ORDERS_PORT=3306
MYSQL_ORDERS_USER=root
MYSQL_ORDERS_PASSWORD=secret
MYSQL_ORDERS_DATABASE=app_orders

# Redis
REDIS_DEFAULT_URL=redis://127.0.0.1:6379/0
REDIS_CACHE_URL=redis://127.0.0.1:6379/1

# MongoDB
MONGO_LOGS_URL=mongodb://127.0.0.1:27017/logs
```

---

## 依赖清单

| 分类 | 包名 | 用途 |
|------|------|------|
| 核心适配器 | `hono` | 当前底层 Web 框架 |
| 核心适配器 | `@hono/node-server` | Hono Node.js 适配器 |
| 验证 | `zod` | 配置 & 请求参数验证 |
| 验证 | `@hono/zod-validator` | Hono Adapter 内部使用 |
| 日志 | `pino` | 结构化日志 |
| 配置 | `chokidar` | .env 变更监听 |
| DB | `mysql2` | MySQL |
| DB | `redis` | Redis |
| DB | `mongoose` | MongoDB |
| 开发 | `tsx` | TypeScript 直接运行 |
| 开发 | `nodemon` | 热重载 |
| 构建 | `tsup` | 打包（ESM + CJS + .d.ts） |
| 测试 | `vitest` | 单测 |

---

## 开发脚本

```json
{
  "scripts": {
    "dev":   "nodemon",
    "build": "tsup src/server.ts --format esm,cjs --dts",
    "start": "node dist/server.js",
    "test":  "vitest"
  }
}
```

`nodemon.json`：

```json
{
  "watch": ["src"],
  "ext":   "ts",
  "ignore": ["src/**/*.test.ts"],
  "exec":  "tsx src/server.ts"
}
```

`tsconfig.json`：

```json
{
  "compilerOptions": {
    "target":                        "ES2022",
    "module":                        "NodeNext",
    "moduleResolution":              "NodeNext",
    "lib":                           ["ES2022"],
    "outDir":                        "./dist",
    "rootDir":                       "./src",
    "strict":                        true,
    "esModuleInterop":               true,
    "skipLibCheck":                  true,
    "forceConsistentCasingInFileNames": true,
    "declaration":                   true,
    "sourceMap":                     true,
    "baseUrl":                       ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include":  ["src/**/*"],
  "exclude":  ["node_modules", "dist"]
}
```

