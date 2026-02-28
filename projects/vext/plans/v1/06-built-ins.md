# 06 - 框架内置模块（Built-ins）总览（最后更新: 2026-02-28 P1 修复）
> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-27 P0 修复）
> **状态**: ✅ 已确认
> **依赖**: 目录结构（`00-directory-structure.md` ✅）、配置层（`05-config.md` ✅）
---
## 子文件索引
| 文件 | 内容 |
|------|------|
| `06-built-ins.md` | 总览：内置模块列表、全局类型、createApp 概览、边界表 |
| `06a-logger.md` | `app.logger`：VextLogger 接口、requestId 注入、插件覆盖 |
| `06b-error.md` | `app.throw`：HttpError 流转；`app.setValidator`：校验引擎替换 |
| `06c-lifecycle.md` | `app.extend`、`app.onClose`、`app.use`、`app.onReady` |
> **扩展原则**：新增可覆盖的内置方法时，按职责归入对应子文件（`06a` 日志、`06b` 错误/校验、`06c` 生命周期），或新建 `06d-xxx.md`。
---
## 0. 初始化顺序
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
⑤ router-loader    扫描 routes/ 注册路由
⑥ 注册出口包装中间件、全局错误处理、404 兜底
⑦ HTTP 开始监听
⑧ 执行所有 onReady 钩子
⑨ /ready → 200，打印启动日志
```

> 各步骤详见对应模块文档：`04-plugins.md`（②）、`01d-router-loader.md`（⑤）、`01c-response.md`（⑥）、`06c-lifecycle.md`（⑧）。
## 1. 内置模块总表

### 1.1 框架核心内置（启动即可用）

| 模块 | 挂载到 | 默认实现 | 插件可覆盖 | 详见 |
|------|--------|---------|-----------|------|
| 结构化日志 | `app.logger` | pino | ✅ | `06a-logger.md` |
| HTTP 错误抛出 | `app.throw` | schema-dsl I18nError | ✅ `app.setThrow()` | `06b-error.md` |
| 校验引擎 | `app.setValidator()` | schema-dsl | ✅ | `06b-error.md` |
| **速率限制** | 全局内置中间件 | flex-rate-limit | ✅ `app.setRateLimiter()` | `06b-error.md` |
| Body 解析 | 框架内置透明处理 | JSON + URL-encoded | ✅ 插件可扩展 multipart | — |
| requestId 生成 | `req.requestId` | UUID v4 | ✅ 插件可覆盖算法 | `05-config.md` |
| HTTP 客户端 | `app.fetch` | 封装 Node.js fetch | ✅ `app.setFetch()` | `06d-fetch.md` |
| 运行时配置 | `app.config` | 分环境合并只读 | ❌ | `05-config.md` |
| 服务集合 | `app.services` | service-loader 注入 | ❌ | `02-services.md` |

### 1.2 生命周期 API（框架内置方法）

| API | 说明 | 详见 |
|-----|------|------|
| `app.extend(key, value)` | 向 app 挂载自定义能力（插件专用） | `06c-lifecycle.md` |
| `app.onClose(fn)` | 注册优雅关闭钩子（LIFO） | `06c-lifecycle.md` |
| `app.onReady(fn)` | 注册就绪钩子（HTTP 监听后执行） | `06c-lifecycle.md` |
| `app.use(middleware)` | 注册全局 HTTP 中间件（插件专用） | `06c-lifecycle.md` |

### 1.3 插件扩展能力清单

通过 `app.extend()` + 插件注入，按**当前实现状态**分类：

**数据层（⏳ 待开发）**

| 能力 | 挂载到 | 说明 |
|------|--------|------|
| 数据库 ORM | `app.db` | drizzle / prisma 等适配 |
| Redis 缓存 | `app.cache` | ioredis 封装 |
| 对象存储 | `app.storage` | S3 / MinIO / OSS 适配 |

**通信层（⏳ 待开发）**

| 能力 | 挂载到 | 说明 |
|------|--------|------|
| SSE 推送 | `app.sse` | Server-Sent Events，单向推送，长连接 |
| WebSocket | `app.ws` | 双向实时通信（ws / socket.io 适配） |
| 邮件发送 | `app.mailer` | nodemailer 封装 |
| 消息队列 | `app.queue` | BullMQ / AMQP 适配，异步任务 |
| 定时任务 | `app.scheduler` | node-cron / agenda 适配 |

**能力增强（⏳ 待开发）**

| 能力 | 挂载到 | 说明 |
|------|--------|------|
| 文件上传 | `req.files`（中间件注入） | multipart 解析，本地 / 云存储 |
| 文件下载 | `res.download()` / `res.stream()` | 流式响应，大文件支持 |
| 国际化 | `app.i18n` / `req.t()` | 多语言支持 |
| 事件总线 | `app.events` | 内部 EventEmitter，解耦模块通信；**需调用 `app.events.setMaxListeners(n)` 避免 Node 警告；listener 不再使用时调用 `off()` 移除** |

> **约定**：上述能力均通过插件实现，用户按需安装对应插件包（如 `vextjs-plugin-redis`），详见后续各插件文档。
---
## 2. 全局类型声明（`globals.d.ts`）
框架通过 `vextjs/globals.d.ts` 将核心类型声明为全局类型，**service / route / middleware 无需任何 import**：
```typescript
// vextjs/globals.d.ts（tsconfig types: ['vextjs'] 自动包含）
declare global {
  type VextApp    = import('vextjs').VextApp
  type VextLogger = import('vextjs').VextLogger
}
```
---
## 3. 内置 vs 插件扩展 — 边界
| 能力 | 内置默认 | 插件操作 |
|------|---------|---------|
| `app.logger` | ✅ pino | 可完全替换（满足 VextLogger 接口） |
| `app.throw` | ✅ schema-dsl I18nError | `app.setThrow()` 包装或替换 |
| `app.setValidator()` | ✅ schema-dsl | 可替换为 Zod / Yup 等 |
| 速率限制 | ✅ flex-rate-limit | `app.setRateLimiter()` 替换 |
| `app.config` | ✅ 只读 | ❌ 不可覆盖 |
| `app.services` | ✅ service-loader 托管 | ❌ 不可覆盖 |
| `app.db` | ❌ 不内置 | `app.extend('db', ...)` 注入 |
| `app.cache` | ❌ 不内置 | `app.extend('cache', ...)` 注入 |
---
## 4. `createApp()` 内部概览
```typescript
// vextjs/lib/app.ts（简化示意）
import { defaultThrow }     from './http-error'
import { createLogger }     from './logger'
import { defaultValidator } from './validator'
import { requestContext }   from './request-context'   // AsyncLocalStorage（locale 等请求级数据）

/**
 * 框架内部方法接口（不暴露给用户，仅 bootstrap 使用）
 */
export interface AppInternals {
  /** 锁定 app.use()，步骤⑤ router-loader 完成后调用 */
  lockUse(): void
  /** 执行所有 onReady 钩子，步骤⑧ HTTP 监听后调用 */
  runReady(): Promise<void>
  /** 获取全局中间件列表（router-loader 用于绑定到路由链） */
  getGlobalMiddlewares(): VextMiddleware[]
  /** 优雅关闭（传入 VextServerHandle 以等待飞行请求，见 08-adapter.md） */
  shutdown(serverHandle?: VextServerHandle): Promise<void>
}

export function createApp(config: VextConfig): { app: VextApp; internals: AppInternals } {
  const closeHooks:        Array<() => Promise<void> | void> = []
  const readyHooks:        Array<() => Promise<void> | void> = []
  const globalMiddlewares: VextMiddleware[] = []
  let   _validator = defaultValidator
  let   _locked    = false   // 路由注册完成后锁定（步骤⑤之后），禁止 app.use()
  let   _shuttingDown = false // 防止重复触发 shutdown

  const app: VextApp = {
    // ── 内置（插件可覆盖）
    logger:   createLogger(config.logger),
    throw:    defaultThrow,   // schema-dsl I18nError，(status, msg, paramsOrCode?, code?) → never
    // ── 运行时数据（不可覆盖）
    config,
    services: {} as VextServices,
    // ── 扩展 API
    extend(key, value)  { (this as Record<string, unknown>)[key] = value },
    setThrow(wrapper)   { this.throw = wrapper(this.throw.bind(this)) },
    setValidator(v)     { _validator = v },
    getValidator()      { return _validator },
    onClose(handler)    { closeHooks.push(handler) },
    onReady(handler)    { readyHooks.push(handler) },
    use(middleware) {
      if (_locked) {
        throw new Error(
          '[vextjs] app.use() is locked after route registration. ' +
          'Global middleware must be registered in plugin setup().'
        )
      }
      globalMiddlewares.push(middleware)
    },
  }

  // ── 框架内部方法（通过 internals 返回，不暴露在 VextApp 接口类型里）──

  const internals: AppInternals = {
    /**
     * 锁定 app.use()，在步骤⑤ router-loader 完成后立即调用。
     */
    lockUse() {
      _locked = true
    },

    /**
     * 执行 onReady 钩子，在步骤⑧ HTTP 监听后调用。
     */
    async runReady() {
      for (const h of readyHooks) await h()
      readyHooks.length = 0   // ← 执行完后清空，释放 hooks 持有的闭包引用
    },

    /**
     * 获取全局中间件列表（router-loader 组装路由链时使用）
     */
    getGlobalMiddlewares() {
      return globalMiddlewares
    },

    /**
     * 优雅关闭：
     * 1. 停止接受新请求（serverHandle.close()）
     * 2. 等待飞行中请求完成（config.shutdown.timeout，默认 10s）
     * 3. 按 LIFO 顺序执行所有 onClose 钩子
     * 4. process.exit(0)
     *
     * @param serverHandle  VextServerHandle（见 08-adapter.md），
     *                      其 close() 返回 Promise<void>，停止接受新连接并等待飞行请求完成
     */
    async shutdown(serverHandle?: VextServerHandle) {
      if (_shuttingDown) return     // guard：防止 SIGTERM + SIGINT 重复触发
      _shuttingDown = true

      app.logger.info('[vextjs] 开始优雅关闭...')

      const shutdownTimeout = (config.shutdown?.timeout ?? 10) * 1000

      // ── 步骤 1：停止接受新请求 + 等待飞行中请求完成 ──
      // VextServerHandle.close() 返回 Promise<void>（见 08-adapter.md §1）
      // adapter 负责在内部调用底层 server.close() 并等待飞行请求
      if (serverHandle) {
        await Promise.race([
          serverHandle.close(),
          new Promise<void>((resolve) => setTimeout(() => {
            app.logger.warn('[vextjs] 等待飞行请求超时，强制继续关闭')
            resolve()
          }, shutdownTimeout)),
        ])
      }

      // ── 步骤 2：按 LIFO 顺序执行 onClose 钩子 ──
      for (const h of [...closeHooks].reverse()) {
        try {
          await h()
        } catch (err) {
          app.logger.error('[vextjs] onClose hook 执行失败', { error: (err as Error).message })
        }
      }
      closeHooks.length = 0   // ← 执行完后清空，释放 hooks 持有的资源引用（与 readyHooks 一致）

      // ── 步骤 3：退出进程（测试模式下跳过，由 createTestApp 控制生命周期）──
      if (!config._testMode) {
        process.exit(0)
      }
    },
  }

  // ── 信号处理（使用 process.on + guard，支持多实例 / 测试场景）──
  // 注意：shutdown 需要 serverHandle，信号处理器中调用时 serverHandle
  // 由 bootstrap 通过闭包传入（见 bootstrap.ts 示例）
  // 信号注册由 bootstrap 层统一管理，createApp 不再直接注册

  return { app, internals }
}
```

**bootstrap.ts 完整调用顺序（含 `internals` 使用）**：

```typescript
// vextjs/lib/bootstrap.ts
import { createApp }            from './app'
import { loadConfig }           from './config-loader'
import { loadPlugins }          from './plugin-loader'
import { loadMiddlewares }      from './middleware-loader'
import { loadServices }         from './service-loader'
import { loadRoutes }           from './router-loader'
import { responseWrapperMiddleware } from './middlewares/response-wrapper'
import { createErrorHandler }   from './middlewares/error-handler'
import { notFoundHandler }      from './middlewares/not-found'
import { dsl }                  from 'schema-dsl'
import { existsSync }           from 'fs'
import path                     from 'path'

export async function bootstrap(rootDir: string) {
  // ── 配置加载 ──────────────────────────────────────────
  const config = await loadConfig(path.join(rootDir, 'src/config'))

  // ── 创建 app + 内部方法 ────────────────────────────────
  const { app, internals } = createApp(config)

  // ── ①+ i18n 语言包自动加载（目录方式，零配置）──────────
  const localesDir = path.join(rootDir, 'src/locales')
  if (existsSync(localesDir)) {
    dsl.config({ i18n: localesDir })   // 自动扫描 zh-CN.ts、en-US.ts 等
    app.logger.info(`[vextjs] i18n locales loaded from ${localesDir}`)
  }

  // ── ① 内置模块已就绪（createApp 内部初始化）─────────────

  // ── ② 加载插件（app.use() 可用）────────────────────────
  await loadPlugins(app, path.join(rootDir, 'src/plugins'))

  // ── ③ 加载中间件定义 ──────────────────────────────────
  const middlewareDefs = await loadMiddlewares(
    path.join(rootDir, 'src/middlewares'),
    config.middlewares,
  )

  // ── ④ 加载服务 ────────────────────────────────────────
  await loadServices(app, path.join(rootDir, 'src/services'))

  // ── ⑤ 加载路由 ────────────────────────────────────────
  await loadRoutes(app, path.join(rootDir, 'src/routes'), {
    middlewareDefs,
    globalMiddlewares: internals.getGlobalMiddlewares(),
  })

  // ── ⑤+ 锁定 app.use() ─────────────────────────────────
  internals.lockUse()   // ← 关键：路由注册后立即锁定

  // ── ⑥ 注册出口包装 / 错误处理 / 404 ───────────────────
  app.adapter.registerMiddleware(responseWrapperMiddleware)
  app.adapter.registerErrorHandler(createErrorHandler(config))  // ← 工厂函数，通过闭包持有 config
  app.adapter.registerNotFound(notFoundHandler)

  // ── ⑦ HTTP 开始监听（adapter.listen 返回 VextServerHandle）──
  const serverHandle = await app.adapter.listen(config.port, config.host)

  // ── 注册信号处理（传入 VextServerHandle）──────────────
  const handleSignal = () => internals.shutdown(serverHandle)
  process.on('SIGTERM', handleSignal)
  process.on('SIGINT',  handleSignal)

  // ── ⑧ 执行 onReady 钩子 ──────────────────────────────
  await internals.runReady()

  // ── ⑨ /ready → 200 ──────────────────────────────────
  app.logger.info(`[vextjs] ready on http://${serverHandle.host}:${serverHandle.port}`)
}
```

> **P0 修复说明**：
> - `createApp()` 返回 `{ app, internals }` 而非仅 `app`，`internals` 包含 `lockUse()`、`runReady()`、`shutdown()` 等框架内部方法
> - `internals.lockUse()` 在步骤⑤完成后**被 bootstrap 显式调用**，确保锁定实际生效
> - 优雅关闭增加**等待飞行请求**步骤：`serverHandle.close()` → 等待超时 → onClose hooks
>
> **P1 修复说明（2026-02-28）**：
> - bootstrap 新增步骤①+：i18n 语言包自动加载（`src/locales/` 目录存在时自动扫描）
> - 错误处理改为 `createErrorHandler(config)` 工厂函数（修复之前 `globalErrorHandler` 引用不存在的 `app` 变量导致 ReferenceError）
> - 移除重复的 `// ── ⑥` 注释
> - 补充完整的 import 声明
> - `shutdown()` 接受 `VextServerHandle`（见 `08-adapter.md` §1），其 `close()` 返回 `Promise<void>`
> - bootstrap 通过 `await app.adapter.listen()` 获取 `VextServerHandle`（而非直接操作底层 server）
> - 信号处理从 `process.once` 改为 `process.on` + `_shuttingDown` guard，支持多实例/测试场景
> - 信号注册由 bootstrap 层统一管理（传入 `VextServerHandle`），createApp 不再内部注册信号

---
## 附录：类型索引
| 类型名 | 文件位置 | 说明 |
|-------|---------|------|
| `VextApp` | `vextjs/lib/app.ts` | 应用对象完整接口（全局类型，无需 import） |
| `AppInternals` | `vextjs/lib/app.ts` | 框架内部方法接口（仅 bootstrap 使用） |
| `VextLogger` | `vextjs/lib/logger.ts` | 结构化日志接口 |
| `HttpError` | `vextjs/lib/http-error.ts` | HTTP 错误类 |
| `VextValidator` | `vextjs/lib/validator.ts` | 校验引擎接口 |
| `VextConfig` | `vextjs/lib/config.ts` | 运行时配置类型 |

---

## 附录 B：变更记录

| 日期 | 变更内容 |
|------|---------|
| 2026-02-26 | 初始版本 |
| 2026-02-27 | **P0 修复**：createApp 返回 internals、bootstrap 显式调用 lockUse()、优雅关闭等待飞行请求、信号处理改为 process.on + guard |
| 2026-02-28 | **P1 修复**：defaultThrow 签名支持 params 插值；shutdown 增加 `_testMode` 守卫避免测试时 process.exit；closeHooks 执行后清空（与 readyHooks 一致）；新增 requestContext import |

**P0 修复详情（2026-02-27）**：

| 修正项 | 修正前（错误） | 修正后（正确） |
|--------|---------------|---------------|
| createApp 返回值 | `VextApp` | `{ app: VextApp; internals: AppInternals }` |
| _lockUse 可访问性 | 函数内部 const，外部无法调用 | 通过 `internals.lockUse()` 暴露给 bootstrap |
| _runReady 可访问性 | 函数内部 const，外部无法调用 | 通过 `internals.runReady()` 暴露给 bootstrap |
| bootstrap 调用 | 注释中提及但无实际代码 | 完整 bootstrap.ts 示例，显式调用所有 internals 方法 |
| 优雅关闭 | 直接执行 onClose hooks | 先 `serverHandle.close()`（Promise） → 等待飞行请求/超时 → 再执行 onClose hooks |
| shutdown 参数 | 无 server 引用 | 接受 `VextServerHandle`（`08-adapter.md` §1），`close()` 返回 `Promise<void>` |
| bootstrap listen | `app._listen()` | `await app.adapter.listen(port, host)` → 返回 `VextServerHandle` |
| 信号处理 | `process.once('SIGTERM', shutdown)` | `process.on('SIGTERM', handleSignal)` + `_shuttingDown` guard |
| 信号注册层级 | createApp 内部注册（无 server 引用） | bootstrap 层注册（传入 `VextServerHandle`） |
| schema-dsl 引用 | `schema-dsl error.throw` | `schema-dsl I18nError`（与 06b-error.md P0 修复对齐） |

**P1 修复详情（2026-02-28）**：

| 修正项 | 修正前（问题） | 修正后（正确） |
|--------|---------------|---------------|
| defaultThrow 签名 | `(status, message, code?)` | `(status, message, paramsOrCode?, code?)` 支持 i18n 参数插值（见 06b-error.md） |
| requestContext | 未 import | 新增 `import { requestContext }` — defaultThrow 从中读取请求级 locale |
| shutdown process.exit | 始终调用 `process.exit(0)` | 增加 `config._testMode` 守卫：测试模式下不退出进程（见 10-testing.md） |
| closeHooks 清空 | 执行后不清空（与 readyHooks 不一致） | 执行后 `closeHooks.length = 0` 释放引用（与 readyHooks 行为一致） |
