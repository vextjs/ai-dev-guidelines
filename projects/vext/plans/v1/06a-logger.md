# 06a - `app.logger` — 结构化日志

> **项目**: vext
> **日期**: 2026-02-26
> **状态**: ✅ 已确认
> **所属模块**: 内置模块（`06-built-ins.md`）

---

## 1. 内置实现

默认使用 **pino**（Node.js 生态最快的结构化日志库），日志输出格式由 `config.logger` 控制：

```
// 开发环境（config.logger.pretty = true）
[INFO]  2026-02-26 10:00:00  GET /users 200 12ms  requestId=a1b2c3d4
[ERROR] 2026-02-26 10:00:01  创建用户失败          requestId=a1b2c3d4

// 生产环境（config.logger.pretty = false，JSON 格式，适合日志收集系统）
{"level":"info","time":1740556800,"msg":"GET /users 200 12ms","requestId":"a1b2c3d4"}
```

---

## 2. `VextLogger` 接口

```typescript
// vextjs/lib/logger.ts
export interface VextLogger {
  info (message: string, meta?: Record<string, unknown>): void
  warn (message: string, meta?: Record<string, unknown>): void
  error(message: string, meta?: Record<string, unknown>): void
  /** 仅 config.logger.level = 'debug' 时输出 */
  debug(message: string, meta?: Record<string, unknown>): void
  /**
   * 创建子 logger，固定携带额外字段
   * @example app.logger.child({ service: 'UserService' })
   */
  child(bindings: Record<string, unknown>): VextLogger
}
```

---

## 3. requestId 自动注入

框架通过 `AsyncLocalStorage` 维护请求上下文，**每条日志自动携带当前请求的 `requestId`**，无需手动传入：

```typescript
// 框架内部（vextjs/lib/request-context.ts）
import { AsyncLocalStorage } from 'async_hooks'
export const requestContext = new AsyncLocalStorage<{ requestId: string }>()

// pino hook：每次写日志前自动读取当前 requestId 并附加到日志字段
// 输出：{"level":"info","msg":"创建用户","requestId":"a1b2c3d4","email":"foo@bar.com"}
```

---

## 4. 使用方式

```typescript
// service 中（通过 this.app）
export default class UserService {
  constructor(private app: VextApp) {}

  async create(data: { email: string }) {
    this.app.logger.info('创建用户', { email: data.email })
    this.app.logger.warn('邮箱已存在', { email: data.email })
  }
}

// 路由 handler 中（通过闭包 app）
export default defineRoutes((app) => {
  app.get('/users', async (req, res) => {
    app.logger.debug('查询用户列表', { query: req.query })
    res.json(await app.services.user.findAll())
  })
})

// 中间件中（通过 req.app）
export default (async (req, _res, next) => {
  req.app.logger.info('请求进入', { path: req.path, method: req.method })
  next()
}) satisfies VextMiddleware
```

---

## 5. 日志级别

| 级别 | 方法 | 启用条件 | 典型用途 |
|------|------|---------|---------|
| `debug` | `app.logger.debug()` | `config.logger.level = 'debug'` | 开发调试，细节追踪 |
| `info` | `app.logger.info()` | 默认启用 | 正常业务流程记录 |
| `warn` | `app.logger.warn()` | 默认启用 | 预期内的异常情况 |
| `error` | `app.logger.error()` | 默认启用 | 需要关注的错误 |

---

## 6. 插件覆盖

插件可以完全替换 `app.logger`，满足 `VextLogger` 接口即可：

```typescript
// src/plugins/logger.ts — 替换为 winston
import { definePlugin } from 'vextjs'
import winston from 'winston'

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

    app.logger = {
      info:  (msg, meta) => w.info(msg,  meta),
      warn:  (msg, meta) => w.warn(msg,  meta),
      error: (msg, meta) => w.error(msg, meta),
      debug: (msg, meta) => w.debug(msg, meta),
      child: (bindings)  => app.logger,  // 简化示意，实际应创建子 logger
    }
  },
})
```

> **覆盖时机**：插件在内置模块初始化之后、路由注册之前运行，覆盖后所有 service / 路由 / 中间件均使用新实现。

