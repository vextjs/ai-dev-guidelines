# 05 - 配置管理 & 开发工具链 & 依赖清单

## 配置管理

### 类型安全配置（启动 fail-fast）

```typescript
// config/index.ts
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  JWT_SECRET: z.string().min(32),
  // 数据库连接为动态 key，通过 getMySQLConfig/getRedisConfig/getMongoConfig 读取
})

const result = envSchema.safeParse(process.env)
if (!result.success) {
  console.error('❌ 环境变量配置错误:', result.error.flatten().fieldErrors)
  process.exit(1)
}

export const config = result.data
export type AppConfig = typeof config
```

### `.env.example`

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

# MySQL 订单库（可指向不同实例）
MYSQL_ORDERS_HOST=10.0.0.2
MYSQL_ORDERS_PORT=3306
MYSQL_ORDERS_USER=root
MYSQL_ORDERS_PASSWORD=secret
MYSQL_ORDERS_DATABASE=app_orders

# Redis Session（REDIS_<NAME>_URL）
REDIS_DEFAULT_URL=redis://127.0.0.1:6379/0

# Redis Cache
REDIS_CACHE_URL=redis://127.0.0.1:6379/1

# MongoDB 日志库（MONGO_<NAME>_URL）
MONGO_LOGS_URL=mongodb://127.0.0.1:27017/logs
```

### 配置热重启

```typescript
// config/watcher.ts
import chokidar from 'chokidar'
import { resolve } from 'path'

export function startConfigWatcher() {
  const watcher = chokidar.watch([
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '.env.local'),
  ])
  watcher.on('change', (path) => {
    console.log(`[Config] ${path} changed, restarting...`)
    process.exit(0)   // nodemon/pm2 自动重启
  })
}
```

---

## 应用组装

```typescript
// app.ts
import { Hono } from 'hono'
import { readdirSync } from 'fs'
import { resolve } from 'path'
import { setContext, registerMiddleware } from '@/lib/define-routes'
import { scanModules } from '@/lib/context-loader'
import { loadRoutes } from '@/lib/router-loader'
import { authMiddleware } from '@/middlewares/auth'
import { createRateLimitMiddleware } from '@/middlewares/rate-limit'

export async function createApp() {
  const app = new Hono()
  const srcDir = resolve(__dirname)

  // 1. 扫描注入 services 和 schemas（构建为嵌套对象，路由文件用 services.api.users 点号访问）
  setContext({
    services: scanModules(resolve(srcDir, 'services'), 'firstExport'),   // → { api: { users: UsersService, ... }, admin: { ... } }
    schemas:  scanModules(resolve(srcDir, 'schemas'),  'wholeModule'),   // → { users: { createUserSchema, ... }, orders: { ... } }
  })

  // 2. 注册路由级中间件
  registerMiddleware('auth',      authMiddleware)
  registerMiddleware('rateLimit', createRateLimitMiddleware)

  // 3. 加载全局中间件
  const globalDir = resolve(srcDir, 'middlewares/global')
  for (const file of readdirSync(globalDir).sort()) {
    const mod = await import(resolve(globalDir, file))
    app.use('*', mod.default)
  }

  // 4. admin 路由统一鉴权
  app.use('/admin/*', authMiddleware)

  // 5. 内置健康检查
  app.get('/healthz', (c) => c.json({ status: 'ok', uptime: process.uptime() }))
  app.get('/readyz',  async (c) => c.json({ status: 'ok' }))

  // 6. 加载文件路由
  await loadRoutes(app, resolve(srcDir, 'routes'))

  return app
}
```

```typescript
// server.ts
import { serve } from '@hono/node-server'
import { createApp } from './app'
import { config } from './config'
import { startConfigWatcher } from './config/watcher'
import { getAllClosers } from '@/lib/db/registry'

async function bootstrap() {
  const app = await createApp()

  serve({ fetch: app.fetch, port: config.PORT }, () => {
    console.log(`🚀 Server running → http://localhost:${config.PORT}`)
  })

  if (config.NODE_ENV === 'development') {
    startConfigWatcher()
  }

  // 优雅关闭
  const shutdown = async (signal: string) => {
    console.log(`[Server] ${signal} received, shutting down...`)
    await Promise.all(getAllClosers().map((fn) => fn()))
    process.exit(0)
  }
  process.on('SIGTERM', () => shutdown('SIGTERM'))
  process.on('SIGINT',  () => shutdown('SIGINT'))
}

bootstrap()
```

---

## 依赖清单

| 分类 | 包名 | 用途 |
|------|------|------|
| 核心 | `hono` | Web 框架 |
| 核心 | `@hono/node-server` | Node.js 适配器 |
| 验证 | `zod` | 配置 & 请求参数验证 |
| 验证 | `@hono/zod-validator` | Hono Zod 验证中间件 |
| 日志 | `pino` | 结构化日志 |
| 配置 | `chokidar` | .env 变更监听 |
| DB | `mysql2` | MySQL |
| DB | `redis` | Redis |
| DB | `mongoose` | MongoDB |
| 开发 | `tsx` | TypeScript 直接运行 |
| 开发 | `nodemon` | 热重载 |
| 构建 | `tsup` | 打包 |
| 测试 | `vitest` | 单测 |

---

## 开发脚本

```json
{
  "scripts": {
    "dev":   "nodemon",
    "build": "tsup src/server.ts --format cjs --dts",
    "start": "node dist/server.js",
    "test":  "vitest"
  }
}
```

`nodemon.json`：

```json
{
  "watch": ["src"],
  "ext": "ts",
  "ignore": ["src/**/*.test.ts"],
  "exec": "tsx src/server.ts"
}
```

`tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

