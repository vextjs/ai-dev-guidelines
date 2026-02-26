# 04 - 多数据库连接 & models 层

## 核心思路

同一数据库类型可注册多个命名连接池（如 `mysql:main`、`mysql:orders`），`models` 按 `<db类型>/<连接名>/<表或集合>.ts` 三层组织，连接名与 `.env` 命名段严格对应。

---

## models 目录结构

```
models/
├── mysql/
│   ├── main/               ← MYSQL_MAIN_*
│   │   ├── users.ts
│   │   └── posts.ts
│   └── orders/             ← MYSQL_ORDERS_*
│       ├── orders.ts
│       └── order-items.ts
├── redis/
│   ├── default/            ← REDIS_DEFAULT_URL
│   │   └── session.ts
│   └── cache/              ← REDIS_CACHE_URL
│       └── cache.ts
└── mongo/
    ├── main/               ← MONGO_MAIN_URL
    │   ├── users.ts
    │   └── articles.ts
    └── logs/               ← MONGO_LOGS_URL
        └── access-log.ts
```

---

## 连接池注册表

```typescript
// lib/db/registry.ts
const registry = new Map<string, unknown>()
const closerMap = new Map<string, () => Promise<void>>()

/**
 * 获取命名连接，首次调用时执行工厂函数初始化
 * key 格式：`<type>:<name>`，如 mysql:main、redis:cache
 */
export function getConnection<T>(
  key: string,
  factory: () => T,
  closer?: (instance: T) => Promise<void>
): T {
  if (!registry.has(key)) {
    const instance = factory()
    registry.set(key, instance)
    if (closer) closerMap.set(key, () => closer(instance))
  }
  return registry.get(key) as T
}

export function getAllClosers(): Array<() => Promise<void>> {
  return [...closerMap.values()]
}
```

---

## 数据库连接工厂

### MySQL

```typescript
// lib/db/mysql.ts
import mysql, { Pool } from 'mysql2/promise'
import { getConnection } from './registry'

interface MySQLOptions {
  host: string
  port: number
  user: string
  password: string
  database: string
  connectionLimit?: number
}

export function getMySQL(name: string, opts?: MySQLOptions): Pool {
  return getConnection(
    `mysql:${name}`,
    () => {
      if (!opts) throw new Error(`[MySQL] 连接 "${name}" 未提供配置`)
      const pool = mysql.createPool({ ...opts, connectionLimit: opts.connectionLimit ?? 10 })
      console.log(`[MySQL:${name}] pool created → ${opts.host}/${opts.database}`)
      return pool
    },
    (pool) => pool.end()
  )
}
```

### Redis

```typescript
// lib/db/redis.ts
import { createClient, RedisClientType } from 'redis'
import { getConnection } from './registry'

export function getRedis(name: string, url?: string): RedisClientType {
  return getConnection(
    `redis:${name}`,
    () => {
      if (!url) throw new Error(`[Redis] 连接 "${name}" 未提供 URL`)
      const client = createClient({ url }) as RedisClientType
      client.connect().then(() => console.log(`[Redis:${name}] connected → ${url}`))
      client.on('error', (err) => console.error(`[Redis:${name}] error:`, err))
      return client
    },
    (client) => client.quit()
  )
}
```

### MongoDB

```typescript
// lib/db/mongo.ts
import mongoose, { Connection } from 'mongoose'
import { getConnection } from './registry'

export function getMongo(name: string, url?: string): Connection {
  return getConnection(
    `mongo:${name}`,
    () => {
      if (!url) throw new Error(`[MongoDB] 连接 "${name}" 未提供 URL`)
      const conn = mongoose.createConnection(url)
      conn.on('connected', () => console.log(`[MongoDB:${name}] connected → ${url}`))
      conn.on('error', (err) => console.error(`[MongoDB:${name}] error:`, err))
      return conn
    },
    (conn) => conn.close()
  )
}
```

---

## 配置读取

```typescript
// config/index.ts（数据库配置部分）

/** 从 process.env 读取指定名称的 MySQL 配置 */
export function getMySQLConfig(name: string) {
  const upper = name.toUpperCase()
  const host = process.env[`MYSQL_${upper}_HOST`]
  if (!host) return null
  return {
    host,
    port: Number(process.env[`MYSQL_${upper}_PORT`] ?? 3306),
    user: process.env[`MYSQL_${upper}_USER`]!,
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

---

## models 示例

### MySQL model

```typescript
// models/mysql/main/users.ts
import { getMySQL } from '@/lib/db/mysql'
import { getMySQLConfig } from '@/config'

const db = getMySQL('main', getMySQLConfig('main') ?? undefined)

export async function findById(id: string) {
  const [rows] = await db.query('SELECT * FROM users WHERE id = ?', [id])
  return (rows as any[])[0] ?? null
}

export async function findByEmail(email: string) {
  const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email])
  return (rows as any[])[0] ?? null
}

export async function paginate(opts: { page: number; limit: number }) {
  const offset = (opts.page - 1) * opts.limit
  const [rows] = await db.query('SELECT * FROM users LIMIT ? OFFSET ?', [opts.limit, offset])
  return rows
}
```

### Redis model

```typescript
// models/redis/default/session.ts
import { getRedis } from '@/lib/db/redis'
import { getRedisConfig } from '@/config'

const client = getRedis('default', getRedisConfig('default') ?? undefined)

export const setSession = (key: string, value: string, ttl: number) =>
  client.set(key, value, { EX: ttl })
export const getSession = (key: string) => client.get(key)
export const delSession = (key: string) => client.del(key)
```

### MongoDB model

```typescript
// models/mongo/logs/access-log.ts
import { getMongo } from '@/lib/db/mongo'
import { getMongoConfig } from '@/config'
import { Schema } from 'mongoose'

const conn = getMongo('logs', getMongoConfig('logs') ?? undefined)

const accessLogSchema = new Schema({
  method: String,
  path: String,
  status: Number,
  ms: Number,
  ip: String,
  createdAt: { type: Date, default: Date.now },
})

const AccessLog = conn.model('AccessLog', accessLogSchema)

export async function insert(data: { method: string; path: string; status: number; ms: number; ip: string }) {
  return AccessLog.create(data)
}

export async function queryByPath(path: string, limit = 100) {
  return AccessLog.find({ path }).sort({ createdAt: -1 }).limit(limit).lean()
}
```

---

## 连接池总结

| 连接名 | 类型 | .env 配置 | models 目录 |
|--------|------|-----------|------------|
| `mysql:main` | MySQL Pool | `MYSQL_MAIN_*` | `models/mysql/main/` |
| `mysql:orders` | MySQL Pool | `MYSQL_ORDERS_*` | `models/mysql/orders/` |
| `redis:default` | Redis Client | `REDIS_DEFAULT_URL` | `models/redis/default/` |
| `redis:cache` | Redis Client | `REDIS_CACHE_URL` | `models/redis/cache/` |
| `mongo:main` | Mongoose Connection | `MONGO_MAIN_URL` | `models/mongo/main/` |
| `mongo:logs` | Mongoose Connection | `MONGO_LOGS_URL` | `models/mongo/logs/` |

- 未配置的连接（返回 `null`）不触发初始化，互相隔离
- `getConnection` 注册 closer，优雅关闭时统一释放

