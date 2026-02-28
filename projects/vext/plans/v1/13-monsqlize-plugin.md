# 13 - monSQLize 集成方案（`vextjs-plugin-monsqlize`）

> **项目**: vext (vextjs)
> **日期**: 2026-02-28
> **状态**: 📝 设计稿
> **优先级**: P1（ORM 集成 — 企业级五星路径 Phase 3 核心插件）
> **依赖**: 插件系统（`04-plugins.md` ✅）、配置层（`05-config.md` ✅）、服务层（`02-services.md` ✅）
> **预计工期**: 5-7 天
> **关联项目**: [monSQLize](../../../monSQLize/) — 轻量级 MongoDB ORM

---

## 0. 概述

`vextjs-plugin-monsqlize` 是 vext 框架的**默认且唯一的官方 ORM 集成插件**，基于 monSQLize（轻量级 MongoDB ORM）。不做多 ORM 适配层，用户如需使用其他 ORM（Drizzle / Prisma / TypeORM 等），自行编写插件扩展。

### 设计决策

| 决策 | 说明 | 原因 |
|------|------|------|
| **默认且仅支持 monSQLize** | 不引入 ORM 抽象层 | 减少复杂度；monSQLize 已具备多级缓存、Saga 事务、表达式系统等企业级能力 |
| **用户自行扩展其他 ORM** | 通过 `definePlugin` + `app.extend` 机制 | 插件系统已足够灵活，无需框架层面支持多 ORM |
| **共享 Model 包方案** | 微服务场景中 Model 定义独立为 shared 包 | 避免 model 重复定义、保证 schema 一致性 |
| **连接池配置共享** | 各服务引用相同的连接配置 | monSQLize 内置 pools 配置支持多连接池 |
| **暴露底层 Client** | 事务等高级场景可直接使用 MongoDB Client | monSQLize 支持 Saga 分布式事务 + 原生 session 事务 |

### monSQLize 核心能力回顾

| 能力 | 说明 |
|------|------|
| 多级缓存 | L1（内存 LRU）+ L2（Redis，可选）+ 精准失效 + 分布式失效 |
| 分布式事务 | Saga 编排器（SagaOrchestrator + SagaExecutor + SagaContext） |
| 表达式系统 | 122 个 MongoDB 操作符，类 SQL 语法编写聚合查询 |
| Model 层 | schema-dsl 验证、Hooks、关系（Populate / hasOne / hasMany / belongsTo） |
| 连接池 | 多连接池配置（pools[]）、策略选择（auto / round-robin 等） |
| Change Stream | 实时同步配置（sync） |
| 深分页 | 游标加密分页（cursorSecret） |
| 慢查询 | 自动检测 + 持久化日志 |

---

## 1. 插件基本结构

### 1.1 文件位置

插件作为 npm 包独立发布，同时提供用户项目内的快速集成方式：

```
方式 1 — npm 包（推荐生产使用）:
  npm install vextjs-plugin-monsqlize

方式 2 — 用户项目内插件（快速原型）:
  src/plugins/database.ts（用户自己写，参考本文档示例）
```

### 1.2 npm 包结构

```
vextjs-plugin-monsqlize/
├── src/
│   ├── index.ts              # 导出 definePlugin + 类型声明
│   ├── plugin.ts             # 插件 setup 实现
│   ├── connection.ts         # 连接管理（connect + onClose）
│   ├── model-loader.ts       # Model 自动加载（扫描 models/ 目录）
│   └── types.ts              # MonSQLize 配置类型扩展
├── test/
│   ├── plugin.test.ts        # 插件集成测试
│   ├── connection.test.ts    # 连接管理测试
│   └── model-loader.test.ts  # Model 加载测试
├── package.json
├── tsconfig.json
└── README.md
```

### 1.3 package.json

```json
{
  "name": "vextjs-plugin-monsqlize",
  "version": "0.1.0",
  "description": "Official MonSQLize (MongoDB ORM) plugin for VextJS",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "peerDependencies": {
    "vextjs": "^0.1.0",
    "monsqlize": "^1.1.6"
  },
  "devDependencies": {
    "vextjs": "^0.1.0",
    "monsqlize": "^1.1.6",
    "typescript": "^5.9.0"
  },
  "engines": {
    "node": ">= 22.0.0"
  },
  "license": "MIT"
}
```

> **注意**：`monsqlize` 是 `peerDependencies`，用户项目自行安装。这样不同服务可以锁定不同版本。

---

## 2. 插件实现

### 2.1 类型扩展

```typescript
// vextjs-plugin-monsqlize/src/types.ts
import type { MonSQLize } from 'monsqlize'

// ── 扩展 VextApp ────────────────────────────────────────
declare module 'vextjs' {
  interface VextApp {
    /** MonSQLize 实例（已连接） */
    db: MonSQLizeConnection

    /**
     * 原始 MonSQLize 实例
     * 用于高级场景（事务、底层操作等）
     */
    monsqlize: MonSQLize
  }

  interface VextConfig {
    /** MonSQLize 数据库配置 */
    database: MonSQLizeDatabaseConfig
  }
}

// ── 连接对象（connect() 返回值的增强版）─────────────────
export interface MonSQLizeConnection {
  /** 获取集合操作对象 */
  collection: (name: string) => ReturnType<MonSQLize['collection']>

  /** 获取数据库实例 */
  db: (name?: string) => ReturnType<MonSQLize['db']>

  /** 获取 Model 操作对象（需先定义 Model） */
  model: (name: string) => ReturnType<MonSQLize['model']>

  /** 原始 MongoDB Client（事务等高级场景） */
  client: import('mongodb').MongoClient
}

// ── 配置类型 ────────────────────────────────────────────
export interface MonSQLizeDatabaseConfig {
  /**
   * MongoDB 连接类型
   * @default 'url'
   */
  type?: 'url' | 'replica' | 'srv'

  /**
   * 连接配置
   * - type='url' 时：{ url: string }
   * - type='replica' 时：{ hosts: string[], replicaSet: string }
   * - type='srv' 时：{ host: string }
   */
  config: {
    url?: string
    host?: string
    hosts?: string[]
    port?: number
    database?: string
    replicaSet?: string
    username?: string
    password?: string
    authSource?: string
    options?: Record<string, unknown>
  }

  /**
   * 缓存配置
   * L1 = 内存 LRU，L2 = Redis（可选）
   */
  cache?: {
    /** L1 内存缓存（默认开启） */
    memory?: {
      enabled?: boolean
      maxSize?: number       // 最大缓存条数（默认 1000）
      ttl?: number           // 默认 TTL 秒数（默认 300）
    }
    /** L2 Redis 缓存（可选） */
    redis?: {
      enabled?: boolean
      url?: string
      prefix?: string        // 缓存 key 前缀
      ttl?: number           // 默认 TTL 秒数
    }
  }

  /**
   * 多连接池配置
   * 微服务场景中用于读写分离或多库访问
   */
  pools?: Array<{
    name: string
    config: MonSQLizeDatabaseConfig['config']
    options?: Record<string, unknown>
  }>

  /**
   * 连接池选择策略
   * @default 'auto'
   */
  poolStrategy?: 'auto' | 'round-robin' | 'random' | 'least-connections'

  /**
   * 全局查询超时（毫秒）
   * @default 2000
   */
  maxTimeMS?: number

  /**
   * find 默认返回条数上限
   * @default 10
   */
  findLimit?: number

  /**
   * 分页最大 limit
   * @default 500
   */
  findPageMaxLimit?: number

  /**
   * 慢查询阈值（毫秒，-1 禁用）
   * @default 500
   */
  slowQueryMs?: number

  /**
   * 慢查询持久化存储配置
   */
  slowQueryLog?: {
    enabled?: boolean
    collection?: string     // 存储集合名
  }

  /**
   * 自动 ObjectId 转换
   */
  autoConvertObjectId?: boolean | {
    fields?: string[]
  }

  /**
   * Model 自动加载配置
   */
  models?: {
    /**
     * Model 定义文件目录（相对于 src/）
     * @default 'models'
     */
    dir?: string

    /**
     * 外部 shared Model 包名
     * 微服务场景中使用，从 npm 包加载 Model 定义
     * @example '@project/models'
     */
    sharedPackage?: string

    /**
     * 是否自动注册（扫描目录后自动 Model.define）
     * @default true
     */
    autoRegister?: boolean
  }

  /**
   * 命名空间（缓存隔离用）
   * @default { scope: 'database' }
   */
  namespace?: {
    scope?: string
  }

  /**
   * 深分页游标加密密钥
   */
  cursorSecret?: string

  /**
   * 内存数据库（测试用）
   * @default false
   */
  useMemoryServer?: boolean

  /**
   * 日志器（默认使用 app.logger）
   */
  logger?: 'app' | false
}
```

### 2.2 插件入口

```typescript
// vextjs-plugin-monsqlize/src/index.ts
import { definePlugin } from 'vextjs'
import { setupMonSQLize } from './plugin.js'

export { MonSQLizeConnection, MonSQLizeDatabaseConfig } from './types.js'

export default definePlugin({
  name: 'monsqlize',

  async setup(app) {
    await setupMonSQLize(app)
  },
})
```

### 2.3 插件核心实现

```typescript
// vextjs-plugin-monsqlize/src/plugin.ts
import type { VextApp } from 'vextjs'
import { createConnection } from './connection.js'
import { loadModels } from './model-loader.js'

export async function setupMonSQLize(app: VextApp): Promise<void> {
  const config = app.config.database

  if (!config) {
    throw new Error(
      '[vextjs-plugin-monsqlize] Missing "database" configuration.\n' +
      '  Add database config to src/config/default.ts:\n' +
      '  export default {\n' +
      '    database: {\n' +
      '      config: { url: "mongodb://localhost:27017/mydb" }\n' +
      '    }\n' +
      '  }'
    )
  }

  // ── 1. 构建 MonSQLize 配置 ────────────────────────────
  const monsqlizeConfig = buildMonSQLizeConfig(config, app)

  // ── 2. 创建 MonSQLize 实例 ────────────────────────────
  const { MonSQLize } = await import('monsqlize')
  const monsqlize = new MonSQLize(monsqlizeConfig)

  // ── 3. 先注册 onClose，再执行 I/O（安全模式）──────────
  app.onClose(async () => {
    try {
      await monsqlize.close()
      app.logger.info('[monsqlize] connection closed')
    } catch (err) {
      app.logger.error('[monsqlize] error closing connection', {
        error: (err as Error).message,
      })
    }
  })

  // ── 4. 连接数据库（Fail Fast）─────────────────────────
  const connection = await createConnection(monsqlize, app)
  app.logger.info('[monsqlize] connected successfully')

  // ── 5. 加载 Model 定义 ────────────────────────────────
  await loadModels(monsqlize, config.models, app)

  // ── 6. 挂载到 app ─────────────────────────────────────
  app.extend('db', connection)
  app.extend('monsqlize', monsqlize)

  app.logger.info('[monsqlize] plugin ready')
}

/**
 * 将 vext 配置格式转换为 MonSQLize 构造函数配置
 */
function buildMonSQLizeConfig(
  config: import('./types.js').MonSQLizeDatabaseConfig,
  app: VextApp,
): Record<string, unknown> {
  const result: Record<string, unknown> = {
    type:                config.type ?? 'url',
    config:              config.config,
    maxTimeMS:           config.maxTimeMS ?? 2000,
    findLimit:           config.findLimit ?? 10,
    findPageMaxLimit:    config.findPageMaxLimit ?? 500,
    slowQueryMs:         config.slowQueryMs ?? 500,
    autoConvertObjectId: config.autoConvertObjectId,
    namespace:           config.namespace ?? { scope: 'database' },
    cursorSecret:        config.cursorSecret,
  }

  // ── 缓存配置 ──────────────────────────────────────────
  if (config.cache) {
    const cacheConfig: Record<string, unknown> = {}

    if (config.cache.memory?.enabled !== false) {
      cacheConfig.memory = {
        maxSize: config.cache.memory?.maxSize ?? 1000,
        ttl:     config.cache.memory?.ttl ?? 300,
      }
    }

    if (config.cache.redis?.enabled) {
      cacheConfig.redis = {
        url:    config.cache.redis.url,
        prefix: config.cache.redis.prefix,
        ttl:    config.cache.redis.ttl,
      }
    }

    result.cache = cacheConfig
  }

  // ── 多连接池 ──────────────────────────────────────────
  if (config.pools && config.pools.length > 0) {
    result.pools = config.pools
    result.poolStrategy = config.poolStrategy ?? 'auto'
  }

  // ── 慢查询日志 ────────────────────────────────────────
  if (config.slowQueryLog?.enabled) {
    result.slowQueryLog = {
      collection: config.slowQueryLog.collection ?? '_slow_queries',
    }
  }

  // ── 日志器（使用 app.logger）───────────────────────────
  if (config.logger !== false) {
    result.logger = {
      info:  (msg: string, meta?: unknown) => app.logger.info(`[monsqlize] ${msg}`, meta),
      warn:  (msg: string, meta?: unknown) => app.logger.warn(`[monsqlize] ${msg}`, meta),
      error: (msg: string, meta?: unknown) => app.logger.error(`[monsqlize] ${msg}`, meta),
      debug: (msg: string, meta?: unknown) => app.logger.debug(`[monsqlize] ${msg}`, meta),
    }
  }

  // ── 内存数据库（测试用）───────────────────────────────
  if (config.useMemoryServer) {
    result.useMemoryServer = true
  }

  return result
}
```

### 2.4 连接管理

```typescript
// vextjs-plugin-monsqlize/src/connection.ts
import type { MonSQLize } from 'monsqlize'
import type { VextApp } from 'vextjs'
import type { MonSQLizeConnection } from './types.js'

/**
 * 创建数据库连接
 *
 * 调用 monsqlize.connect() 建立连接，
 * 返回增强的连接对象（MonSQLizeConnection）
 */
export async function createConnection(
  monsqlize: MonSQLize,
  app: VextApp,
): Promise<MonSQLizeConnection> {
  // ── 连接（Fail Fast：失败则启动终止）──────────────────
  const connectResult = await monsqlize.connect()

  // ── 构建连接对象 ──────────────────────────────────────
  const connection: MonSQLizeConnection = {
    collection: (name: string) => monsqlize.collection(name),
    db:         (name?: string) => monsqlize.db(name),
    model:      (name: string) => monsqlize.model(name),

    // 暴露底层 MongoDB Client（事务等高级场景）
    get client() {
      return (monsqlize as any)._client
    },
  }

  return connection
}
```

### 2.5 Model 自动加载

```typescript
// vextjs-plugin-monsqlize/src/model-loader.ts
import path from 'node:path'
import { existsSync } from 'node:fs'
import type { MonSQLize } from 'monsqlize'
import type { VextApp } from 'vextjs'
import type { MonSQLizeDatabaseConfig } from './types.js'

/**
 * 加载 Model 定义
 *
 * 支持两种来源（可同时使用）：
 * 1. 本地 models/ 目录（src/models/*.ts）
 * 2. 共享 Model 包（@project/models）
 *
 * 加载顺序：先 shared 包 → 再本地目录（本地可覆盖 shared）
 */
export async function loadModels(
  monsqlize: MonSQLize,
  modelsConfig: MonSQLizeDatabaseConfig['models'] | undefined,
  app: VextApp,
): Promise<void> {
  const config = modelsConfig ?? { dir: 'models', autoRegister: true }

  if (config.autoRegister === false) {
    app.logger.debug('[monsqlize] model auto-register disabled')
    return
  }

  let modelCount = 0

  // ── 1. 加载共享 Model 包 ──────────────────────────────
  if (config.sharedPackage) {
    try {
      const sharedModels = await import(config.sharedPackage)

      if (sharedModels.default && typeof sharedModels.default === 'object') {
        // 共享包导出格式：export default { User: { ... }, Order: { ... } }
        for (const [name, definition] of Object.entries(sharedModels.default)) {
          monsqlize.model(name, definition as any)
          modelCount++
          app.logger.debug(`[monsqlize] model loaded from shared: ${name}`)
        }
      } else if (sharedModels.registerModels && typeof sharedModels.registerModels === 'function') {
        // 共享包导出格式：export function registerModels(monsqlize) { ... }
        await sharedModels.registerModels(monsqlize)
        app.logger.debug(`[monsqlize] models loaded via registerModels()`)
      }

      app.logger.info(`[monsqlize] shared models loaded from "${config.sharedPackage}"`)
    } catch (err) {
      throw new Error(
        `[vextjs-plugin-monsqlize] Failed to load shared model package "${config.sharedPackage}":\n` +
        `  ${(err as Error).message}\n` +
        `  Make sure the package is installed: npm install ${config.sharedPackage}`
      )
    }
  }

  // ── 2. 加载本地 models/ 目录 ──────────────────────────
  const modelsDir = path.join(process.cwd(), 'src', config.dir ?? 'models')

  if (!existsSync(modelsDir)) {
    if (!config.sharedPackage) {
      app.logger.debug('[monsqlize] no models/ directory found — skipping model loading')
    }
    if (modelCount > 0) {
      app.logger.info(`[monsqlize] ${modelCount} model(s) loaded (shared only)`)
    }
    return
  }

  // 扫描 models/ 目录
  const { glob } = await import('fast-glob')
  const files = await glob('**/*.{ts,js,mjs,cjs}', {
    cwd: modelsDir,
    ignore: ['**/_*.{ts,js,mjs,cjs}', '**/*.d.ts', '**/*.test.{ts,js}', '**/*.spec.{ts,js}'],
  })

  for (const file of files.sort()) {
    const mod = await import(path.join(modelsDir, file))
    const definition = mod.default

    if (!definition || typeof definition !== 'object') {
      app.logger.warn(
        `[monsqlize] models/${file} — invalid export (expected default object), skipped`
      )
      continue
    }

    // 从文件名推断 Model 名（驼峰化）
    // models/user.ts → 'User'
    // models/order-item.ts → 'OrderItem'
    // models/admin/role.ts → 'AdminRole'（目录前缀）
    const modelName = definition.name ?? deriveModelName(file)

    monsqlize.model(modelName, definition)
    modelCount++
    app.logger.debug(`[monsqlize] model loaded: ${modelName} (from ${file})`)
  }

  app.logger.info(`[monsqlize] ${modelCount} model(s) loaded`)
}

/**
 * 从文件路径推断 Model 名
 *
 * user.ts           → 'User'
 * order-item.ts     → 'OrderItem'
 * admin/role.ts     → 'AdminRole'
 * billing/invoice.ts → 'BillingInvoice'
 */
function deriveModelName(filePath: string): string {
  const withoutExt = filePath.replace(/\.\w+$/, '')
  const parts = withoutExt.split(/[/\\]/)

  return parts
    .map(part =>
      part
        .split(/[-_]/)
        .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join('')
    )
    .join('')
}
```

---

## 3. 用户使用方式

### 3.1 基础用法（单服务）

```typescript
// 安装
// npm install vextjs-plugin-monsqlize monsqlize

// src/config/default.ts
export default {
  port: 3000,

  database: {
    config: {
      url: 'mongodb://localhost:27017/myapp',
    },
    findLimit: 20,
    slowQueryMs: 500,
  },
}
```

```typescript
// src/plugins/database.ts（方式 1 — npm 包）
export { default } from 'vextjs-plugin-monsqlize'
```

```typescript
// src/plugins/database.ts（方式 2 — 内联写法，更灵活）
import { definePlugin } from 'vextjs'
import MonSQLize from 'monsqlize'

declare module 'vextjs' {
  interface VextApp {
    db: Awaited<ReturnType<MonSQLize['connect']>>
    monsqlize: MonSQLize
  }
  interface VextConfig {
    database: { config: { url: string } }
  }
}

export default definePlugin({
  name: 'monsqlize',
  async setup(app) {
    const monsqlize = new MonSQLize({
      config: app.config.database.config,
      logger: {
        info:  (msg, meta) => app.logger.info(`[db] ${msg}`, meta),
        error: (msg, meta) => app.logger.error(`[db] ${msg}`, meta),
        warn:  (msg, meta) => app.logger.warn(`[db] ${msg}`, meta),
        debug: (msg, meta) => app.logger.debug(`[db] ${msg}`, meta),
      },
    })

    app.onClose(async () => {
      await monsqlize.close()
      app.logger.info('[db] connection closed')
    })

    const connection = await monsqlize.connect()
    app.logger.info('[db] connected')

    app.extend('db', connection)
    app.extend('monsqlize', monsqlize)
  },
})
```

### 3.2 Model 定义

```typescript
// src/models/user.ts
export default {
  name: 'User',
  collection: 'users',
  schema: {
    name:      'string:1-100!',
    email:     'email!',
    password:  'string:8-!',
    role:      'enum:admin,user,moderator',
    status:    'enum:active,inactive,banned',
    profile: {
      avatar:  'url?',
      bio:     'string:0-500?',
    },
    createdAt: 'date',
    updatedAt: 'date',
  },
  indexes: [
    { email: 1, unique: true },
    { role: 1, status: 1 },
    { createdAt: -1 },
  ],
  hooks: {
    beforeCreate(doc) {
      doc.createdAt = new Date()
      doc.updatedAt = new Date()
      doc.status = doc.status ?? 'active'
    },
    beforeUpdate(update) {
      if (!update.$set) update.$set = {}
      update.$set.updatedAt = new Date()
    },
  },
}
```

```typescript
// src/models/order.ts
export default {
  name: 'Order',
  collection: 'orders',
  schema: {
    userId:    'objectId!',
    items: [{
      productId: 'objectId!',
      name:      'string!',
      price:     'number:0-!',
      quantity:  'integer:1-!',
    }],
    total:     'number:0-!',
    status:    'enum:pending,paid,shipped,delivered,cancelled',
    createdAt: 'date',
  },
  relations: {
    user: { type: 'belongsTo', model: 'User', foreignKey: 'userId' },
  },
}
```

### 3.3 Service 中使用

```typescript
// src/services/user.ts
export default class UserService {
  constructor(private app: VextApp) {}

  async findAll(opts: { page: number; limit: number }) {
    const users = await this.app.db.model('User')
      .find({})
      .page(opts.page, opts.limit)
      .select({ password: 0 })
      .sort({ createdAt: -1 })

    return users
  }

  async findById(id: string) {
    return this.app.db.model('User').findById(id, { password: 0 })
  }

  async create(data: { name: string; email: string; password: string }) {
    return this.app.db.model('User').create(data)
  }

  async update(id: string, data: Partial<{ name: string; email: string }>) {
    return this.app.db.model('User').updateById(id, { $set: data })
  }

  async delete(id: string) {
    return this.app.db.model('User').deleteById(id)
  }
}
```

### 3.4 Route 中使用

```typescript
// src/routes/users.ts
import { defineRoutes } from 'vextjs'

export default defineRoutes((app) => {
  app.get('/list', {
    validate: { query: { page: 'number:1-', limit: 'number:1-100' } },
    middlewares: ['auth'],
  }, async (req, res) => {
    const { page, limit } = req.valid('query')
    const data = await app.services.user.findAll({ page, limit })
    res.json(data)
  })

  app.get('/:id', {
    validate: { params: { id: 'objectId!' } },
  }, async (req, res) => {
    const user = await app.services.user.findById(req.params.id)
    if (!user) app.throw(404, 'user.not_found')
    res.json(user)
  })

  app.post('/', {
    validate: {
      body: { name: 'string:1-100!', email: 'email!', password: 'string:8-!' },
    },
    middlewares: ['auth', { name: 'rate-limit', options: { max: 5 } }],
  }, async (req, res) => {
    const body = req.valid('body')
    const data = await app.services.user.create(body)
    res.json(data, 201)
  })
})
```

---

## 4. 微服务架构：连接池共享与 Model 复用

### 4.1 问题分析

微服务场景中，多个服务可能访问同一个 MongoDB 数据库：

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ user-service │  │ order-service │  │ notify-service│
│              │  │              │  │              │
│ User Model ✗ │  │ User Model ✗ │  │ User Model ✗ │  ← 重复定义
│ Order Model  │  │ Order Model ✗│  │              │  ← 重复定义
│              │  │ Product Model│  │ Notification │
│  MonSQLize ✗ │  │  MonSQLize ✗ │  │  MonSQLize ✗ │  ← 各自独立连接池
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────────┬────┘                 │
                    ▼                      ▼
            ┌──────────────┐      ┌──────────────┐
            │  MongoDB      │      │  MongoDB      │
            │  (主库)       │      │  (通知库)     │
            └──────────────┘      └──────────────┘

问题:
  1. User Model 在 3 个服务中重复定义 — schema 不一致风险
  2. 每个服务独立连接池 — 连接数膨胀（3 个服务 × 10 连接 = 30 连接）
  3. 跨服务修改 schema 需要同步更新多处 — 维护成本高
```

### 4.2 推荐方案：共享 Model 包 + 连接配置共享（方案 A+C 混合）

```
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ user-service │  │ order-service │  │ notify-service│
│              │  │              │  │              │
│ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │
│ │ @project │ │  │ │ @project │ │  │ │ @project │ │  ← 同一个 npm 包
│ │ /models  │ │  │ │ /models  │ │  │ │ /models  │ │     版本锁定
│ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │
│              │  │              │  │              │
│ 本地 Model:  │  │ 本地 Model:  │  │ 本地 Model:  │
│ (无/覆盖用)  │  │ Product      │  │ Notification │  ← 服务私有 Model
│              │  │              │  │              │
│  MonSQLize   │  │  MonSQLize   │  │  MonSQLize   │  ← 各自独立实例
│  (主库配置)  │  │  (主库配置)  │  │  (通知库配置)│     但连接配置统一
└──────┬───────┘  └──────┬───────┘  └──────┬───────┘
       │                 │                 │
       └────────────┬────┘                 │
                    ▼                      ▼
            ┌──────────────┐      ┌──────────────┐
            │  MongoDB      │      │  MongoDB      │
            │  (主库)       │      │  (通知库)     │
            └──────────────┘      └──────────────┘

解决:
  ✅ Model 定义一次（@project/models），所有服务引用同一包
  ✅ schema 变更只需更新 shared 包 + npm update
  ✅ 各服务仍可定义私有 Model（本地 models/ 目录）
  ✅ 连接配置统一管理（环境变量或配置中心）
  ✅ 每个服务仍是独立进程 — 不影响独立部署
```

### 4.3 共享 Model 包结构

```
@project/models/
├── src/
│   ├── index.ts              # 统一导出
│   ├── user.ts               # User Model 定义
│   ├── order.ts              # Order Model 定义
│   ├── product.ts            # Product Model 定义
│   └── shared/               # 共享 schema 片段（address、money 等）
│       ├── address.ts
│       └── money.ts
├── package.json
├── tsconfig.json
└── README.md
```

```typescript
// @project/models/src/index.ts
import User    from './user.js'
import Order   from './order.js'
import Product from './product.js'

// 导出方式 1：对象（插件自动遍历注册）
export default {
  User,
  Order,
  Product,
}

// 导出方式 2：函数（更灵活，可接收 monsqlize 实例做高级配置）
export function registerModels(monsqlize: any): void {
  monsqlize.model('User', User)
  monsqlize.model('Order', Order)
  monsqlize.model('Product', Product)
}
```

```typescript
// @project/models/src/user.ts
import { addressSchema } from './shared/address.js'

export default {
  name: 'User',
  collection: 'users',
  schema: {
    name:      'string:1-100!',
    email:     'email!',
    password:  'string:8-!',
    role:      'enum:admin,user,moderator',
    address:   addressSchema,            // 共享 schema 片段
    createdAt: 'date',
    updatedAt: 'date',
  },
  indexes: [
    { email: 1, unique: true },
    { role: 1 },
  ],
}
```

### 4.4 各服务配置

```typescript
// user-service/src/config/default.ts
export default {
  port: 3001,

  database: {
    config: {
      url: process.env.MONGO_URL ?? 'mongodb://localhost:27017/myapp',
    },
    models: {
      sharedPackage: '@project/models',    // ← 从 shared 包加载
      dir: 'models',                       // ← 本地 models/ 也扫描（可为空）
    },
  },
}
```

```typescript
// order-service/src/config/default.ts
export default {
  port: 3002,

  database: {
    config: {
      url: process.env.MONGO_URL ?? 'mongodb://localhost:27017/myapp',
    },
    models: {
      sharedPackage: '@project/models',    // ← 同一个 shared 包
      dir: 'models',                       // ← 可定义服务私有 Model
    },
  },
}
```

```typescript
// order-service/src/models/delivery-tracking.ts
// 服务私有 Model（不在 shared 包中）
export default {
  name: 'DeliveryTracking',
  collection: 'delivery_tracking',
  schema: {
    orderId:   'objectId!',
    status:    'enum:pending,in_transit,delivered',
    location:  { lat: 'number', lng: 'number' },
    updatedAt: 'date',
  },
}
```

### 4.5 Monorepo 推荐结构

```
my-platform/                        # monorepo 根目录
├── packages/
│   ├── models/                     # @project/models（共享 Model 包）
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── user.ts
│   │   │   ├── order.ts
│   │   │   └── product.ts
│   │   └── package.json            # name: "@project/models"
│   │
│   ├── shared-config/              # @project/config（可选：共享配置）
│   │   ├── src/
│   │   │   ├── database.ts         # 数据库连接配置
│   │   │   └── redis.ts            # Redis 配置
│   │   └── package.json
│   │
│   └── types/                      # @project/types（可选：共享类型）
│       ├── src/
│       │   └── index.ts
│       └── package.json
│
├── services/
│   ├── user-service/               # 用户服务（vext 项目）
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   ├── plugins/
│   │   │   ├── config/
│   │   │   └── models/             # 服务私有 Model（可选）
│   │   └── package.json
│   │
│   ├── order-service/              # 订单服务（vext 项目）
│   │   └── ...
│   │
│   └── notify-service/             # 通知服务（vext 项目）
│       └── ...
│
├── package.json                    # workspaces 配置
├── pnpm-workspace.yaml             # 或 npm workspaces
└── turbo.json                      # Turborepo（可选）
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'services/*'
```

```json
// services/user-service/package.json
{
  "name": "@project/user-service",
  "dependencies": {
    "vextjs": "^0.1.0",
    "vextjs-plugin-monsqlize": "^0.1.0",
    "monsqlize": "^1.1.6",
    "@project/models": "workspace:*"
  }
}
```

### 4.6 连接池共享策略

**每个服务独立管理自己的连接池**，不跨进程共享。原因：

| 考量 | 说明 |
|------|------|
| 进程隔离 | 微服务各自独立进程，无法共享内存中的连接池对象 |
| 故障隔离 | 一个服务的连接池耗尽不影响其他服务 |
| 独立扩缩 | 各服务可以根据负载独立调整连接池大小 |
| MongoDB 连接限制 | 通过 maxPoolSize 参数控制每个服务的连接数上限 |

**连接数优化建议**：

```typescript
// 共享配置包中的数据库连接配置
// @project/shared-config/src/database.ts
export const databaseConfig = {
  config: {
    url: process.env.MONGO_URL,
    options: {
      maxPoolSize: 10,         // 每个服务最多 10 个连接
      minPoolSize: 2,          // 最少保持 2 个连接
      maxIdleTimeMS: 30000,    // 空闲 30 秒后关闭
      waitQueueTimeoutMS: 5000,// 等待连接超时 5 秒
    },
  },
}
```

```typescript
// user-service/src/config/default.ts
import { databaseConfig } from '@project/shared-config'

export default {
  port: 3001,
  database: {
    ...databaseConfig,
    // 服务级别覆盖（用户服务需要更多连接）
    config: {
      ...databaseConfig.config,
      options: {
        ...databaseConfig.config.options,
        maxPoolSize: 20,       // 覆盖：用户服务连接数更多
      },
    },
  },
}
```

---

## 5. 事务支持

### 5.1 场景分类

| 场景 | 方案 | 适用范围 |
|------|------|---------|
| **单服务内事务** | MongoDB 原生 Session + Transaction | 同一数据库内的多个操作需要原子性 |
| **跨服务事务** | monSQLize Saga 分布式事务 | 跨微服务的业务流程（如：创建订单 + 扣减库存 + 发送通知） |
| **简单补偿** | 应用层补偿逻辑 | 失败率低、补偿逻辑简单的场景 |

### 5.2 单服务内事务（MongoDB Session）

通过 `app.monsqlize` 访问底层 MonSQLize 实例，或通过 `app.db.client` 获取原始 MongoDB Client：

```typescript
// src/services/order.ts
export default class OrderService {
  constructor(private app: VextApp) {}

  /**
   * 创建订单（事务：扣减库存 + 创建订单 + 更新用户统计）
   */
  async createOrder(userId: string, items: OrderItem[]): Promise<Order> {
    const client = this.app.db.client

    // ── MongoDB 原生 Session 事务 ────────────────────────
    const session = client.startSession()

    try {
      const result = await session.withTransaction(async () => {
        // 1. 检查并扣减库存
        for (const item of items) {
          const product = await this.app.db.collection('products').findOneAndUpdate(
            { _id: item.productId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } },
            { session, returnDocument: 'after' },
          )

          if (!product) {
            throw this.app.throw(409, 'product.insufficient_stock', {
              productId: item.productId,
            })
          }
        }

        // 2. 创建订单
        const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
        const order = await this.app.db.collection('orders').insertOne(
          {
            userId,
            items,
            total,
            status: 'pending',
            createdAt: new Date(),
          },
          { session },
        )

        // 3. 更新用户订单统计
        await this.app.db.collection('users').updateOne(
          { _id: userId },
          { $inc: { orderCount: 1, totalSpent: total } },
          { session },
        )

        return { orderId: order.insertedId, total, status: 'pending' }
      })

      return result as Order
    } finally {
      await session.endSession()
    }
  }
}
```

### 5.3 跨服务分布式事务（Saga）

monSQLize 内置 Saga 编排器（SagaOrchestrator），支持编排式 Saga 模式：

```typescript
// src/services/checkout.ts
import { SagaOrchestrator } from 'monsqlize'

export default class CheckoutService {
  constructor(private app: VextApp) {}

  /**
   * 结账流程（Saga：创建订单 → 扣款 → 发送通知）
   *
   * 每个步骤有对应的补偿操作（rollback）：
   *   创建订单 → 取消订单
   *   扣款     → 退款
   *   发送通知 → 无需补偿（幂等）
   */
  async checkout(userId: string, cartId: string): Promise<CheckoutResult> {
    const saga = new SagaOrchestrator()

    saga.define('checkout', [
      {
        name: 'create-order',
        async execute(ctx) {
          // 调用 order-service API
          const resp = await ctx.app.fetch.post(
            `${ctx.app.config.services.orderService}/orders`,
            { userId: ctx.data.userId, cartId: ctx.data.cartId },
          )
          ctx.set('orderId', resp.data.id)
          ctx.set('total', resp.data.total)
        },
        async compensate(ctx) {
          // 补偿：取消订单
          await ctx.app.fetch.delete(
            `${ctx.app.config.services.orderService}/orders/${ctx.get('orderId')}`,
          )
        },
      },
      {
        name: 'charge-payment',
        async execute(ctx) {
          // 调用支付服务
          const resp = await ctx.app.fetch.post(
            `${ctx.app.config.services.paymentService}/charge`,
            { userId: ctx.data.userId, amount: ctx.get('total') },
          )
          ctx.set('paymentId', resp.data.id)
        },
        async compensate(ctx) {
          // 补偿：退款
          await ctx.app.fetch.post(
            `${ctx.app.config.services.paymentService}/refund`,
            { paymentId: ctx.get('paymentId') },
          )
        },
      },
      {
        name: 'send-notification',
        async execute(ctx) {
          // 发送通知（幂等操作，无需补偿）
          await ctx.app.fetch.post(
            `${ctx.app.config.services.notifyService}/notifications`,
            {
              userId: ctx.data.userId,
              type: 'order_created',
              orderId: ctx.get('orderId'),
            },
          )
        },
        // 无 compensate — 通知是幂等的
      },
    ])

    const result = await saga.execute('checkout', {
      app: this.app,
      data: { userId, cartId },
    })

    if (!result.success) {
      this.app.logger.error('[checkout] saga failed', {
        failedStep: result.failedStep,
        error: result.error?.message,
        compensated: result.compensatedSteps,
      })
      this.app.throw(500, 'checkout.failed')
    }

    return {
      orderId:   result.context.get('orderId'),
      paymentId: result.context.get('paymentId'),
      status:    'completed',
    }
  }
}
```

### 5.4 monSQLize 事务能力需求

以下是 monSQLize 需要支持（或确认已支持）的事务相关能力：

| 能力 | monSQLize 现状 | 插件依赖 | 说明 |
|------|:-------------:|:--------:|------|
| MongoDB Client 暴露 | ✅ 已支持 | `app.db.client` | 通过实例内部属性获取 |
| Session 创建 | ✅ 已支持 | `client.startSession()` | 原生 MongoDB 驱动 |
| `withTransaction()` | ✅ 已支持 | `session.withTransaction()` | 原生 MongoDB 驱动 |
| Saga 编排器 | ✅ 已支持 | `SagaOrchestrator` | monSQLize 内置 |
| Saga 补偿回滚 | ✅ 已支持 | `SagaExecutor` | 失败时自动按逆序执行补偿 |
| Session 传入 collection 操作 | ⚠️ 需确认 | `{ session }` 选项 | monSQLize 的 collection 方法是否透传 session 参数 |
| Model 层 Session 传入 | ⚠️ 需确认 | `model.create(data, { session })` | Model 的 CRUD 方法是否支持 session 选项 |
| 连接池 Session 感知 | ⚠️ 需确认 | — | 多连接池场景下 session 必须使用创建它的连接 |

> **⚠️ 标记为"需确认"的项目**：在编码阶段需要逐一验证 monSQLize 的实际 API 支持情况。如有缺失，需要向 monSQLize 项目提 feature request 或 PR。

---

## 6. 缓存层配置

### 6.1 L1 内存缓存（默认开启）

```typescript
// src/config/default.ts
export default {
  database: {
    config: { url: 'mongodb://localhost:27017/myapp' },
    cache: {
      memory: {
        enabled: true,
        maxSize: 1000,       // 最大缓存 1000 条
        ttl: 300,            // 5 分钟 TTL
      },
    },
  },
}
```

### 6.2 L1 + L2 Redis 缓存

```typescript
// src/config/default.ts
export default {
  database: {
    config: { url: 'mongodb://localhost:27017/myapp' },
    cache: {
      memory: {
        enabled: true,
        maxSize: 500,
        ttl: 60,             // L1 短 TTL（1 分钟）
      },
      redis: {
        enabled: true,
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
        prefix: 'myapp:db:',
        ttl: 600,            // L2 长 TTL（10 分钟）
      },
    },
  },
}
```

### 6.3 微服务缓存隔离

```typescript
// user-service/src/config/default.ts
export default {
  database: {
    config: { url: process.env.MONGO_URL },
    namespace: { scope: 'user-service' },   // ← 缓存键前缀隔离
    cache: {
      redis: {
        enabled: true,
        url: process.env.REDIS_URL,
        prefix: 'user-svc:db:',             // ← Redis key 前缀隔离
      },
    },
  },
}

// order-service/src/config/default.ts
export default {
  database: {
    config: { url: process.env.MONGO_URL },
    namespace: { scope: 'order-service' },
    cache: {
      redis: {
        enabled: true,
        url: process.env.REDIS_URL,
        prefix: 'order-svc:db:',
      },
    },
  },
}
```

---

## 7. 测试支持

### 7.1 内存数据库（mongodb-memory-server）

monSQLize 内置支持 `useMemoryServer: true`，测试时无需外部 MongoDB：

```typescript
// src/config/test.ts（测试环境配置）
export default {
  database: {
    useMemoryServer: true,           // 使用内存 MongoDB
    cache: {
      memory: { enabled: false },    // 测试时关闭缓存（避免干扰）
      redis: { enabled: false },
    },
  },
}
```

### 7.2 createTestApp 集成

```typescript
// test/services/user.test.ts
import { createTestApp } from 'vextjs/test-utils'

describe('UserService', () => {
  let app: VextApp

  beforeAll(async () => {
    app = await createTestApp({
      plugins: ['monsqlize'],           // 启用 monsqlize 插件
      config: {
        database: {
          useMemoryServer: true,
          models: { dir: 'models' },
        },
      },
    })
  })

  afterAll(async () => {
    await app.close()
  })

  it('should create user', async () => {
    const user = await app.services.user.create({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
    })

    assert.ok(user._id)
    assert.strictEqual(user.name, 'Test User')
  })
})
```

---

## 8. 配置示例汇总

### 8.1 最小配置（开发环境）

```typescript
// src/config/default.ts
export default {
  database: {
    config: { url: 'mongodb://localhost:27017/myapp' },
  },
}
```

### 8.2 完整配置（生产环境）

```typescript
// src/config/production.ts
export default {
  database: {
    type: 'replica',
    config: {
      hosts: ['mongo1:27017', 'mongo2:27017', 'mongo3:27017'],
      database: 'myapp',
      replicaSet: 'rs0',
      username: process.env.MONGO_USER,
      password: process.env.MONGO_PASSWORD,
      authSource: 'admin',
      options: {
        maxPoolSize: 20,
        minPoolSize: 5,
        maxIdleTimeMS: 60000,
        readPreference: 'secondaryPreferred',
      },
    },
    cache: {
      memory: { enabled: true, maxSize: 2000, ttl: 120 },
      redis: {
        enabled: true,
        url: process.env.REDIS_URL,
        prefix: 'myapp:prod:db:',
        ttl: 900,
      },
    },
    maxTimeMS: 5000,
    findLimit: 20,
    findPageMaxLimit: 200,
    slowQueryMs: 200,
    slowQueryLog: { enabled: true, collection: '_slow_queries' },
    autoConvertObjectId: true,
    models: {
      sharedPackage: '@project/models',
      dir: 'models',
    },
    cursorSecret: process.env.CURSOR_SECRET,
  },
}
```

### 8.3 多连接池配置

```typescript
// src/config/default.ts
export default {
  database: {
    config: { url: 'mongodb://localhost:27017/myapp' },
    pools: [
      {
        name: 'primary',
        config: { url: 'mongodb://primary:27017/myapp' },
      },
      {
        name: 'analytics',
        config: {
          url: 'mongodb://analytics:27017/myapp',
          options: { readPreference: 'secondary' },
        },
      },
    ],
    poolStrategy: 'auto',   // 自动选择（写操作 → primary，读操作 → analytics）
  },
}
```

---

## 9. 边界与约束

### 9.1 不支持的场景

| 场景 | 说明 | 替代方案 |
|------|------|---------|
| 多 ORM 适配 | 不引入 ORM 抽象层 | 用户自行编写插件（`definePlugin` + `app.extend`） |
| SQL 数据库 | monSQLize 仅支持 MongoDB | 用户通过独立插件接入 Drizzle / Prisma |
| 跨进程连接池共享 | 微服务各自独立连接池 | 通过 maxPoolSize 控制总连接数 |
| Schema 迁移 | monSQLize 无 migration 机制 | MongoDB 本身 schema-less，需要时自行编写迁移脚本 |
| 多数据库实例 | 单个 MonSQLize 实例连接一个数据库 | 用户注册多个插件（`definePlugin({ name: 'db-primary' })`、`definePlugin({ name: 'db-analytics' })`） |

### 9.2 与其他插件的关系

```
vextjs-plugin-monsqlize
  ├── 需要：app.config.database（配置）
  ├── 需要：app.logger（日志）
  ├── 可选：app.cache（Redis 缓存 — 如已安装 vextjs-plugin-redis，可复用连接）
  ├── 产出：app.db（MonSQLizeConnection）
  ├── 产出：app.monsqlize（MonSQLize 原始实例）
  └── 注册：app.onClose（连接清理）
```

### 9.3 用户自行接入其他 ORM 示例

```typescript
// src/plugins/drizzle-db.ts（用户自行编写）
import { definePlugin } from 'vextjs'
import { drizzle }      from 'drizzle-orm/node-postgres'
import { Pool }         from 'pg'

declare module 'vextjs' {
  interface VextApp {
    sqlDb: ReturnType<typeof drizzle>   // 注意：不覆盖 app.db（已被 monsqlize 占用）
  }
  interface VextConfig {
    postgres: { url: string; poolSize?: number }
  }
}

export default definePlugin({
  name: 'drizzle-db',
  async setup(app) {
    const pool = new Pool({
      connectionString: app.config.postgres.url,
      max: app.config.postgres.poolSize ?? 10,
    })

    app.onClose(() => pool.end())
    await pool.query('SELECT 1')

    app.extend('sqlDb', drizzle(pool))
    app.logger.info('[drizzle] PostgreSQL connected')
  },
})
```

---

## 10. 实施步骤

### 10.1 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/index.ts` | 插件入口 + 工厂导出 |
| 新建 | `src/plugin.ts` | 插件核心实现（setup） |
| 新建 | `src/connection.ts` | 连接管理 |
| 新建 | `src/model-loader.ts` | Model 自动加载（本地 + shared 包） |
| 新建 | `src/types.ts` | VextApp / VextConfig 类型扩展 |
| 新建 | `test/plugin.test.ts` | 插件集成测试 |
| 新建 | `test/model-loader.test.ts` | Model 加载测试 |
| 新建 | `test/transaction.test.ts` | 事务测试 |
| 新建 | `package.json` | 包配置 |
| 新建 | `README.md` | 使用说明 |

### 10.2 进度估算

| 阶段 | 工作量 | 说明 |
|------|:------:|------|
| 类型定义 + 插件骨架 | 0.5 天 | types.ts + index.ts + plugin.ts |
| 连接管理 + 配置映射 | 1 天 | connection.ts + buildMonSQLizeConfig |
| Model 自动加载 | 1 天 | 本地扫描 + shared 包加载 + 名称推断 |
| 事务 API 验证 | 1 天 | Session + Saga 在 monSQLize 上的实际验证 |
| 测试 | 1 天 | 插件集成 + Model 加载 + 事务 |
| 文档 + 示例 | 0.5 天 | README + 配置示例 |
| **合计** | **5-7 天** | 含 monSQLize API 验证时间 |

### 10.3 验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | 插件可正常加载并连接 MongoDB | 集成测试（mongodb-memory-server） |
| 2 | Model 定义文件自动扫描注册 | 单元测试 |
| 3 | 共享 Model 包可正常加载 | 集成测试（mock shared package） |
| 4 | 本地 Model 可覆盖 shared Model | 加载顺序测试 |
| 5 | MongoDB Session 事务正常工作 | 事务测试（插入 + 回滚） |
| 6 | 缓存配置（L1 / L2）正常生效 | 缓存命中率测试 |
| 7 | `app.onClose()` 正确关闭连接 | 连接关闭测试 |
| 8 | 配置缺失时 Fail Fast | 错误消息测试 |
| 9 | 与 `createTestApp` 集成 | 测试框架集成测试 |
| 10 | 类型声明完整（TS 类型检查通过） | `tsc --noEmit` |

---

## 附录 A：与 NestJS ORM 集成的对比

| 维度 | NestJS + TypeORM | vext + monSQLize |
|------|-----------------|-----------------|
| **ORM 绑定** | 多 ORM 适配（TypeORM / Prisma / Mongoose） | 单 ORM 默认（monSQLize），其他用户自扩展 |
| **Model 定义** | 装饰器（`@Entity() class User {}`） | 声明式对象（schema-dsl DSL 字符串） |
| **加载方式** | `TypeOrmModule.forRoot()` + `forFeature()` | 自动扫描 + shared 包 |
| **事务** | 手动 `queryRunner` / `DataSource.transaction()` | MongoDB Session / Saga 编排器 |
| **缓存** | 需额外集成 `@nestjs/cache-manager` | 内置多级缓存（L1 内存 + L2 Redis） |
| **微服务 Model 共享** | 手动维护 DTO | shared 包 + 自动加载 |
| **学习曲线** | 高（装饰器 + DI + Module 导入） | 低（配置对象 + 自动扫描） |

---

## 附录 B：类型索引

| 类型名 | 文件位置 | 说明 |
|--------|---------|------|
| `MonSQLizeConnection` | `src/types.ts` | 连接对象（collection / db / model / client） |
| `MonSQLizeDatabaseConfig` | `src/types.ts` | 数据库配置（VextConfig.database 扩展） |
| `MonSQLize` | `monsqlize`（外部依赖） | MonSQLize 主类 |
| `VextApp.db` | `src/types.ts`（类型扩展） | 挂载到 app 的连接对象 |
| `VextApp.monsqlize` | `src/types.ts`（类型扩展） | 挂载到 app 的原始实例 |

---

**版本记录**:
- v1.0.0 (2026-02-28): 初版设计 — 插件结构 + 连接管理 + Model 自动加载 + 微服务共享方案 + 事务支持 + 缓存层配置