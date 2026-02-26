# 07 - 多数据库连接 & models 层

> 本章内容与 v1 方案完全一致，无结构变化。
> 唯一差异：models 层可通过 `getRequestContext()` 自动获取 requestId/userId，无需手动传参。

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
    │   └── articles.ts
    └── logs/               ← MONGO_LOGS_URL
        └── access-log.ts
```

---

## 连接池注册表

```typescript
// core/db/registry.ts
const registry  = new Map<string, unknown>()
const closerMap = new Map<string, () => Promise<void>>()

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
// core/db/mysql.ts
import mysql, { Pool } from 'mysql2/promise'
import { getConnection } from './registry'

interface MySQLOptions {
  host:             string
  port:             number
  user:             string
  password:         string
  database:         string
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
// core/db/redis.ts
import { createClient, type RedisClientType } from 'redis'
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
// core/db/mongo.ts
import mongoose, { type Connection } from 'mongoose'
import { getConnection } from './registry'

export function getMongo(name: string, url?: string): Connection {
  return getConnection(
    `mongo:${name}`,
    () => {
      if (!url) throw new Error(`[MongoDB] 连接 "${name}" 未提供 URL`)
      const conn = mongoose.createConnection(url)
      conn.on('connected', () => console.log(`[MongoDB:${name}] connected → ${url}`))
      conn.on('error',     (err) => console.error(`[MongoDB:${name}] error:`, err))
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

---

## models 示例

### MySQL model（v2 增加 requestContext 使用）

```typescript
// models/mysql/main/users.ts
import { getMySQL }          from 'vext/db/mysql'
import { getMySQLConfig }    from '@/config'
import { getRequestContext } from 'vext'

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
  const offset  = (opts.page - 1) * opts.limit
  const [rows]  = await db.query('SELECT * FROM users LIMIT ? OFFSET ?', [opts.limit, offset])
  return rows
}

export async function update(id: string, data: Record<string, unknown>) {
  // v2 新增：自动从请求上下文获取操作人，无需手动传参
  const { userId, requestId } = getRequestContext() ?? {}
  return db.query(
    'UPDATE users SET ?, updated_by = ?, request_id = ? WHERE id = ?',
    [data, userId, requestId, id]
  )
}
```

### Redis model

```typescript
// models/redis/default/session.ts
import { getRedis }       from 'vext/db/redis'
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
import { getMongo }       from 'vext/db/mongo'
import { getMongoConfig } from '@/config'
import { getRequestContext } from 'vext'
import { Schema }         from 'mongoose'

const conn = getMongo('logs', getMongoConfig('logs') ?? undefined)

const accessLogSchema = new Schema({
  method:    String,
  path:      String,
  status:    Number,
  ms:        Number,
  ip:        String,
  requestId: String,
  userId:    String,
  createdAt: { type: Date, default: Date.now },
})

const AccessLog = conn.model('AccessLog', accessLogSchema)

export async function insert(data: { method: string; path: string; status: number; ms: number; ip: string }) {
  // v2：自动附加 requestId/userId
  const { requestId, userId } = getRequestContext() ?? {}
  return AccessLog.create({ ...data, requestId, userId })
}
```

---

## 连接池总结

| 数据库 | key 格式 | env 变量前缀 | 示例 |
|--------|---------|-------------|------|
| MySQL | `mysql:<name>` | `MYSQL_<NAME>_*` | `MYSQL_MAIN_HOST` |
| Redis | `redis:<name>` | `REDIS_<NAME>_URL` | `REDIS_DEFAULT_URL` |
| MongoDB | `mongo:<name>` | `MONGO_<NAME>_URL` | `MONGO_LOGS_URL` |

