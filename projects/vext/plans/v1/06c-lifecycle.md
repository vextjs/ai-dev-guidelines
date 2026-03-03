# 06c - 生命周期 API（extend / onClose / use / onReady）

> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-28 P1 修复）
> **状态**: ✅ 已确认
> **所属模块**: 内置模块（`06-built-ins.md`）

---

## 1. `app.extend()` — 挂载自定义能力

### 1.1 接口

```typescript
interface VextApp {
  /**
   * 向 app 挂载自定义属性（插件专用）
   * 类型安全：配合 declare module 'vextjs' { interface VextApp { ... } }
   */
  extend<K extends string, V>(key: K, value: V): void
}
```

### 1.2 数据库插件示例（`app.db`）

```typescript
// src/plugins/database.ts
import { definePlugin } from 'vextjs'
import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool   } from 'pg'

declare module 'vextjs' {
  interface VextApp {
    db: ReturnType<typeof drizzle>
  }
}

export default definePlugin({
  name: 'database',
  async setup(app) {
    const pool = new Pool({ connectionString: app.config.database.url })

    // ✅ 先注册 onClose，再执行 I/O — 确保连接失败时也能清理资源
    app.onClose(async () => {
      await pool.end()
      app.logger.info('[database] 连接已关闭')
    })

    // Fail Fast：连接不通则启动失败，但 pool 已注册清理
    await pool.query('SELECT 1')
    app.logger.info('[database] 连接成功')

    app.extend('db', drizzle(pool))
  },
})
```

### 1.3 类型扩展汇总约定

所有插件对 `VextApp` 的扩展建议集中到 `src/types/app.d.ts`：

```typescript
// src/types/app.d.ts
import type { drizzle } from 'drizzle-orm/node-postgres'
import type { Redis }   from 'ioredis'

declare module 'vextjs' {
  interface VextApp {
    db:    ReturnType<typeof drizzle>
    cache: Redis
  }
  interface VextConfig {
    database: { url: string; poolSize: number }
    redis:    { url: string }
  }
}
```

---

## 2. `app.onClose()` — 优雅关闭钩子

### 2.1 接口

```typescript
interface VextApp {
  /**
   * 注册关闭钩子
   * 进程收到 SIGTERM / SIGINT 时按 LIFO 顺序执行
   *
   * **内存安全**：closeHooks 在 shutdown 执行完毕后自动清空（`closeHooks.length = 0`），
   * 释放 hooks 持有的闭包引用。在 shutdown 之前，hooks 持有的是外部资源引用
   * （连接池/Redis 等），这些引用本身就需要在整个应用生命周期存在，不存在泄漏问题。
   */
  onClose(handler: () => Promise<void> | void): void
}
```

### 2.2 执行流程

> 以下流程由 `internals.shutdown(serverHandle)` 实现（见 `06-built-ins.md` §4）。
> 信号处理由 bootstrap 层注册（`process.on` + guard），传入 server 引用。

```
SIGTERM / SIGINT
  ↓
_shuttingDown guard 检查（防止重复触发）
  ↓
app.logger.info('[vextjs] 开始优雅关闭...')
  ↓
步骤 1: server.close() — 停止接受新连接
  ↓
步骤 2: 等待飞行中请求完成
         ├── 所有请求正常完成 → 继续
         └── 超时（config.shutdown.timeout，默认 10s）→ 打印警告，强制继续
  ↓
步骤 3: 按 LIFO 顺序执行所有 onClose 钩子
         └── 单个钩子执行失败 → 记录错误日志，继续执行下一个（不中断关闭流程）
  ↓
步骤 4: closeHooks.length = 0 — 清空 hooks，释放闭包引用（与 readyHooks 一致）
  ↓
config._testMode ? 返回（不退出进程） : process.exit(0)
```

**关键改进**（P0/P1 修复）：
- ❌ 修正前：直接执行 onClose hooks，无等待飞行请求步骤
- ✅ 修正后：先 `server.close()` 等待飞行请求完成/超时，再执行 onClose hooks
- ✅ 信号处理从 `process.once` 改为 `process.on` + `_shuttingDown` guard（支持多实例/测试场景）
- ✅ onClose hook 执行失败时记录错误但不中断关闭流程
- ✅ closeHooks 执行后清空（`closeHooks.length = 0`），释放闭包持有的资源引用（与 readyHooks 行为一致）
- ✅ 增加 `config._testMode` 守卫：测试模式下 `shutdown()` 不调用 `process.exit(0)`，允许测试进程继续运行后续用例（见 `10-testing.md`）

### 2.3 示例

```typescript
export default definePlugin({
  name: 'redis',
  async setup(app) {
    const redis = new Redis(app.config.redis.url)
    app.extend('cache', redis)

    app.onClose(async () => {
      await redis.quit()
      app.logger.info('[redis] 连接已关闭')
    })
  },
})
```

---

## 3. `app.use()` — 全局 HTTP 中间件（插件专用）

### 3.1 接口

```typescript
interface VextApp {
  /**
   * 注册全局 HTTP 中间件（插件专用）
   * - 对所有路由生效，在路由级 middlewares 之前执行
   * - 按注册顺序执行
   * - 只能在插件 setup() 中调用
   * - 路由注册完成后（步骤⑤之后）立即锁定，后续调用抛出 Error
   */
  use(middleware: VextMiddleware): void
}
```

### 3.2 锁定时机

`app.use()` 的可用窗口严格限定在 **步骤② plugin-loader** 阶段：

```
② plugin-loader（app.use() 可用）
  ↓
③ middleware-loader
④ service-loader
⑤ router-loader
  ↓
internals.lockUse()  ← 步骤⑤完成后由 bootstrap 显式调用
  ↓
⑥ 注册出口包装 / 错误处理 / 404
⑦ HTTP 监听
⑧ onReady 钩子  ← 此时 app.use() 已锁定，调用会抛错
```

> **P0 修复说明**：`lockUse()` 通过 `createApp()` 返回的 `internals` 对象暴露给 bootstrap，
> 确保在步骤⑤后被**显式调用**（而非仅在注释中标注）。详见 `06-built-ins.md` §4 bootstrap.ts 示例。
>
> **P1 补充**：`app.use()` 锁定后的错误信息明确指引用户将中间件注册移到 plugin `setup()` 中，
> 这是唯一合法的全局中间件注册时机。

**锁定后调用的错误信息**：

```
[vextjs] app.use() is locked after route registration.
Global middleware must be registered in plugin setup().
```

> **为什么在步骤⑤之后锁定？** 路由注册时框架会将全局中间件链快照绑定到路由处理链，步骤⑤完成意味着所有路由已注册，此后修改全局中间件链无法生效。提前锁定（而非等到 `internals.runReady()`）避免了 `onReady` 钩子中误调用 `app.use()` 却不生效的静默 bug。

### 3.3 执行顺序

```
请求进入
  ↓
全局中间件（app.use()，按插件注册顺序）
  ↓
路由级中间件（options.middlewares，来自 config 白名单）
  ↓
validate 中间件
  ↓
handler
  ↓
出口包装（{ code, data, requestId }）
```

### 3.4 Fail Fast 验证

| 检测项 | 时机 | 错误信息 |
|--------|------|----------|
| 路由注册后调用 `app.use()` | `internals.lockUse()` 之后 | `[vextjs] app.use() is locked after route registration. Global middleware must be registered in plugin setup().` |
| `onReady` 钩子中调用 `app.use()` | 步骤⑧ | 同上 |

### 3.5 典型用法

```typescript
// src/plugins/security.ts
export default definePlugin({
  name: 'security',
  setup(app) {
    app.use(async (_req, res, next) => {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('X-Frame-Options', 'DENY')
      res.setHeader('X-XSS-Protection', '1; mode=block')
      await next()
    })
  },
})
```

---

## 4. `app.onReady()` — 就绪钩子

### 4.1 接口

```typescript
interface VextApp {
  /**
   * 注册就绪钩子
   * 所有插件/中间件/service/路由加载完成、HTTP 开始监听后执行
   * 与 /ready 端点联动：全部完成前返回 503，完成后返回 200
   *
   * **内存安全**：框架在所有 onReady hooks 执行完毕后自动清空 hooks 数组，
   * 释放 hooks 持有的闭包引用，不会长期占用内存
   */
  onReady(handler: () => Promise<void> | void): void
}
```

### 4.2 执行时序

```
内置模块初始化
  ↓ 插件 setup() 全部完成
  ↓ 中间件 / service / 路由全部注册
  ↓ internals.lockUse() — 锁定 app.use()
  ↓ HTTP 服务器开始监听
  ↓ 注册信号处理（process.on SIGTERM/SIGINT → internals.shutdown(server)）
  ↓
internals.runReady() — 按注册顺序执行所有 onReady 钩子
  ↓
readyHooks.length = 0 — 释放闭包引用
  ↓
/ready → HTTP 200（Kubernetes readiness probe 就绪）
  ↓
打印：[vextjs] ready on http://localhost:3000
```

### 4.3 与 `/ready` 端点联动

| 时机 | `GET /ready` 响应 |
|------|-----------------|
| `onReady` 执行中 | `503 { "status": "starting" }` |
| `onReady` 全部完成 | `200 { "status": "ready" }` |

### 4.4 典型用法

```typescript
// src/plugins/cache-warmer.ts
export default definePlugin({
  name: 'cache-warmer',
  setup(app) {
    app.onReady(async () => {
      const hotUsers = await app.db.select().from(users).limit(100)
      await app.cache.set('hot_users', JSON.stringify(hotUsers), 'EX', 300)
      app.logger.info('[cache-warmer] 预热完成', { count: hotUsers.length })
    })
  },
})
```

