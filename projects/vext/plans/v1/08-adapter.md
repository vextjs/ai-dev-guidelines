# 08 - Adapter 层详细方案

> **项目**: vext (vextjs)
> **日期**: 2026-02-26（最后更新: 2026-02-26 P0-1/P1-7/P2-2/P2-5/P2-6 修复）
> **状态**: ✅ 已确认
> **依赖**: 路由层（`01-routes.md` ✅）、响应规范（`01c-response.md` ✅）、配置层（`05-config.md` ✅）

---

## 0. 概述

Adapter 是 vextjs 与底层 HTTP 框架之间的**抽象层**，负责：

1. 将底层框架的请求/响应对象转换为 `VextRequest` / `VextResponse`
2. 注册路由到底层框架
3. 启动 HTTP 服务器并返回控制句柄
4. 提供优雅关闭能力

```
用户代码（routes / services / middlewares）
        ↓ 只接触 VextRequest / VextResponse
┌──────────────────────────────────┐
│         VextAdapter 抽象层        │
├──────────────────────────────────┤
│  Hono Adapter  │  Fastify Adapter │  ...
│  (内置，默认)   │  (第三方包)       │
└──────────────────────────────────┘
        ↓
底层 HTTP 框架（Hono / Fastify / Express ...）
        ↓
Node.js HTTP Server
```

**核心原则**：用户代码**永远不直接接触**底层框架 API，切换 adapter 时业务代码零改动。

---

## 1. VextAdapter 接口

```typescript
// vextjs/lib/adapter.ts

export interface VextAdapter {
  /** adapter 名称标识（用于日志和错误信息） */
  readonly name: string

  /**
   * 注册单条路由
   * router-loader 为每条路由调用此方法
   *
   * @param method  HTTP 方法（大写：GET / POST / PUT / PATCH / DELETE）
   * @param path    完整路径（含前缀，如 /api/v1/users/:id）
   * @param chain   中间件执行链（已组装完毕，含路由级中间件 + validate + handler）
   */
  registerRoute(
    method:  string,
    path:    string,
    chain:   VextMiddleware[],
  ): void

  /**
   * 注册全局中间件（在所有路由之前执行）
   * 用于框架内置中间件和插件 app.use() 注册的中间件
   *
   * @param middleware  标准 VextMiddleware
   */
  registerMiddleware(middleware: VextMiddleware): void

  /**
   * 注册全局错误处理
   * 框架在所有路由注册完成后调用
   *
   * @param handler  错误处理函数
   */
  registerErrorHandler(handler: VextErrorMiddleware): void

  /**
   * 注册 404 兜底
   * 框架在错误处理注册后调用
   *
   * @param handler  兜底处理函数
   */
  registerNotFound(handler: VextMiddleware): void

  /**
   * 启动 HTTP 服务器
   *
   * @param port  监听端口
   * @param host  监听地址（默认 '0.0.0.0'）
   * @returns     包含 close() 的服务器句柄
   */
  listen(port: number, host?: string): Promise<VextServerHandle>

  /**
   * 构建完整的请求处理函数（不启动 server）
   *
   * 在所有路由 / 中间件注册完成后调用。
   * 返回的 handler 接受原始 Node.js req/res，内部完成：
   *   - 请求/响应对象转换（如 HonoContext → VextRequest/VextResponse）
   *   - 路由匹配（如 Hono trie router）
   *   - 中间件链执行
   *   - 错误处理 + 404 兜底
   *
   * **用途**：dev 模式下 Hot Reload 每次创建 fresh adapter 后调用
   * `buildHandler()` 获取新 handler，由 HotSwappableHandler 原子替换。
   * `listen()` 内部也调用此方法。
   *
   * 详见 `11b-soft-reload.md` §5（Fresh Adapter 策略）。
   */
  buildHandler(): (req: import('http').IncomingMessage, res: import('http').ServerResponse) => void
}

/**
 * 服务器句柄（用于优雅关闭）
 */
export interface VextServerHandle {
  /** 停止接受新连接，等待飞行中请求完成后关闭 */
  close(): Promise<void>

  /** 实际监听的端口（当传入 port=0 时有用） */
  readonly port: number

  /** 实际监听的地址 */
  readonly host: string
}
```

---

## 2. 请求/响应转换契约

Adapter 的核心职责是将底层框架的 context 转换为 `VextRequest` / `VextResponse`。

### 2.1 VextRequest 映射

adapter 必须保证以下字段正确填充（完整接口见 `01c-response.md` §3）：

| VextRequest 字段 | 来源 | 说明 |
|------------------|------|------|
| `query` | URL query string 解析 | `Record<string, string>` |
| `body` | body-parser 中间件注入 | 框架内置中间件负责，adapter 提供原始流 |
| `params` | 路由参数（`:id` 等） | 底层框架路由匹配结果 |
| `headers` | HTTP 请求头 | 全小写 key |
| `method` | HTTP 方法 | 大写（`GET` / `POST` 等） |
| `url` | 完整 URL | 含 query string |
| `path` | 路径部分 | 不含 query string |
| `ip` | 客户端 IP | 需处理 `trustProxy` 配置（见 §2.3） |
| `protocol` | 请求协议 | 需处理 `trustProxy` 配置 |
| `app` | VextApp 引用 | adapter 在转换时注入 |
| `requestId` | — | 由 requestId 中间件注入，非 adapter 职责 |

### 2.2 VextResponse 映射

adapter 必须实现以下方法（完整接口见 `01c-response.md` §4）：

| VextResponse 方法 | 底层映射 | 说明 |
|-------------------|---------|------|
| `json(data, status?)` | 设置 Content-Type + 序列化 + 发送 | 出口包装中间件会劫持此方法 |
| `rawJson(data, status?)` | 同 json 但不经过出口包装 | 仅框架内部错误处理使用 |
| `text(content, status?)` | 纯文本响应 | 不经过出口包装 |
| `stream(readable, contentType?)` | 流式响应 | pipe 到底层响应 |
| `download(readable, filename, contentType?)` | Content-Disposition 下载 | 触发浏览器下载 |
| `redirect(url, status?)` | 3xx 重定向 | 默认 302 |
| `status(code)` | 设置状态码 | 链式调用，返回 `this` |
| `setHeader(name, value)` | 设置响应头 | 链式调用，返回 `this` |

### 2.3 trustProxy 处理

当 `config.trustProxy = true` 时，adapter 必须：

| 字段 | trustProxy = false | trustProxy = true |
|------|-------------------|-------------------|
| `req.ip` | `socket.remoteAddress` | `X-Forwarded-For` 第一个 IP（不存在则降级到 socket） |
| `req.protocol` | 根据 socket 判断 | `X-Forwarded-Proto`（不存在则降级） |

```typescript
// adapter 内部示例
function resolveIp(rawReq: IncomingMessage, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = rawReq.headers['x-forwarded-for']
    if (typeof xff === 'string') return xff.split(',')[0].trim()
  }
  return rawReq.socket.remoteAddress ?? '127.0.0.1'
}
```

---

## 3. 中间件链执行模型

Adapter 负责按顺序执行中间件链。vextjs 采用 **洋葱模型**，`next()` 调用下一个中间件：

```typescript
// adapter 内部：执行中间件链
// P0-3 修复（2026-03-03）：next 为 async 函数，类型与 VextMiddleware 的 next: () => Promise<void> 对齐
// 用户中间件应 await next() 以支持洋葱模型的 after-middleware 逻辑
async function executeChain(
  chain: VextMiddleware[],
  req:   VextRequest,
  res:   VextResponse,
): Promise<void> {
  let index = 0

  const next = async (): Promise<void> => {
    if (index >= chain.length) return
    const middleware = chain[index++]
    await middleware(req, res, next)
  }

  await next()
}
```

**全局中间件 + 路由中间件的组装**：

```
[全局中间件 1] → [全局中间件 2] → ... → [路由级中间件] → [validate] → [handler]
 ↑ registerMiddleware()                  ↑ registerRoute() 的 chain 参数
```

> adapter 在 `registerRoute` 时接收的 `chain` 已经是组装好的路由级链（含 validate + handler）。
> 全局中间件由 `registerMiddleware` 单独注册，adapter 在执行时将两者拼接。

---

## 4. 内置 Hono Adapter

### 4.1 文件位置

```
vextjs/src/adapters/hono/
├── index.ts          # 导出 createHonoAdapter()
├── adapter.ts        # VextAdapter 实现
├── request.ts        # HonoContext → VextRequest 转换
└── response.ts       # HonoContext → VextResponse 转换
```

### 4.2 实现概要

```typescript
// vextjs/src/adapters/hono/adapter.ts
import { Hono } from 'hono'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { toWebRequest, writeResponse } from './node-utils'
import type { VextAdapter, VextServerHandle, VextMiddleware, VextErrorMiddleware } from '../../lib/adapter'
import { createVextRequest }  from './request'
import { createVextResponse } from './response'

export function createHonoAdapter(app: VextApp): VextAdapter {
  const hono = new Hono()
  const globalMiddlewares: VextMiddleware[] = []
  let errorHandler: VextErrorMiddleware | null = null

  return {
    name: 'hono',

    registerMiddleware(middleware) {
      globalMiddlewares.push(middleware)
    },

    registerRoute(method, path, chain) {
      const honoMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete'

      hono[honoMethod](path, async (c) => {
        const req = createVextRequest(c, app)
        // P0-1 修复：延迟绑定 requestId（getter 函数）
        // requestId 在 executeChain 过程中由 requestIdMiddleware 设置，
        // 传入 getter 确保 json() 实际调用时才取值（此时 requestId 必然已生成）
        const res = createVextResponse(c, () => req.requestId)

        try {
          // 全局中间件 + 路由级链
          const fullChain = [...globalMiddlewares, ...chain]
          await executeChain(fullChain, req, res)
        } catch (err) {
          if (errorHandler) {
            // P2-6 修复：errorHandler 自身抛异常的边界保护
            // 防止 errorHandler 内部失败（如 logger 写入 DB transport 失败）
            // 导致异常传播到 Hono 的 catch，产生非 JSON 的纯文本 500
            try {
              errorHandler(err, req, res)
            } catch (handlerError) {
              try {
                res.rawJson({ code: 500, message: 'Internal Server Error' }, 500)
              } catch {
                // 完全放弃，让底层框架的 catch 处理
                throw handlerError
              }
            }
          } else {
            throw err
          }
        }
      })
    },

    registerErrorHandler(handler) {
      errorHandler = handler
    },

    registerNotFound(handler) {
      hono.notFound(async (c) => {
        const req = createVextRequest(c, app)
        // P2-5 修复：notFound 不经过中间件链，requestId 中间件不会执行。
        // 内联生成 requestId，确保 404 响应也有有效的 requestId
        if (!req.requestId) {
          req.requestId = req.headers['x-request-id'] || crypto.randomUUID()
        }
        const res = createVextResponse(c, () => req.requestId)
        await handler(req, res, () => {})
      })
    },

    async listen(port, host = '0.0.0.0') {
      const handler = this.buildHandler()
      return new Promise((resolve) => {
        const server = createServer(handler)
        server.listen(port, host, () => {
          resolve({
            port,
            host,
            async close() {
              server.close()
            },
          })
        })
      })
    },

    buildHandler() {
      // 将 Hono 的 fetch handler 转为 Node.js 的 (req, res) 形式
      // @hono/node-server 内部就是这样做的
      return (req: IncomingMessage, res: ServerResponse) => {
        const request = toWebRequest(req)
        hono.fetch(request)
          .then(response => writeResponse(res, response))
          .catch(() => {
            res.statusCode = 500
            res.end('Internal Server Error')
          })
      }
    },
  }
}
```

### 4.3 请求转换

```typescript
// vextjs/src/adapters/hono/request.ts
import type { Context } from 'hono'

export function createVextRequest(c: Context, app: VextApp): VextRequest {
  const trustProxy = app.config.trustProxy ?? false
  const closeHandlers: Array<() => void> = []

  const req: VextRequest = {
    // ── 原始数据
    query:   Object.fromEntries(new URL(c.req.url).searchParams),
    body:    undefined,        // body-parser 中间件负责填充
    params:  c.req.param() as Record<string, string>,
    headers: Object.fromEntries(c.req.raw.headers),
    method:  c.req.method.toUpperCase(),
    url:     c.req.url,
    path:    c.req.path,

    // ── 元信息
    app,
    requestId: '',             // requestId 中间件负责填充
    ip:        resolveIp(c, trustProxy),
    protocol:  resolveProtocol(c, trustProxy),

    // ── 生命周期
    onClose(handler) {
      closeHandlers.push(handler)
    },

    // ── 校验数据
    valid(location) {
      return (req as any)[`_validated_${location}`]
    },
  }

  // 请求结束时执行 onClose hooks（内存安全：执行后清空）
  c.req.raw.signal?.addEventListener('abort', () => {
    for (const h of closeHandlers) h()
    closeHandlers.length = 0
  })

  return req
}

function resolveIp(c: Context, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = c.req.header('x-forwarded-for')
    if (xff) return xff.split(',')[0].trim()
  }
  // Hono node-server 通过 c.env.incoming 获取原始 socket
  return (c.env as any)?.incoming?.socket?.remoteAddress ?? '127.0.0.1'
}

function resolveProtocol(c: Context, trustProxy: boolean): 'http' | 'https' {
  if (trustProxy) {
    const proto = c.req.header('x-forwarded-proto')
    if (proto === 'https') return 'https'
  }
  return 'http'
}
```

### 4.4 响应转换

```typescript
// vextjs/src/adapters/hono/response.ts
import type { Context } from 'hono'

/**
 * P0-1 修复：延迟绑定 + 内建包装方案
 *
 * 核心变更：
 * 1. 新增 `getRequestId` getter 参数 — 延迟取值，解决 requestId 在创建时尚未生成的时序问题
 * 2. 新增 `_wrapEnabled` 内部状态 — 由 response-wrapper 中间件通过 `_enableWrap()` 开启
 * 3. json() 内部根据 `_wrapEnabled` 决定是否包装 `{ code: 0, data, requestId }`
 * 4. 204 使用 `c.body(null)` 而非 `c.json(null)`（P1-7: RFC 9110 §15.3.5 合规）
 * 5. rawJson() 独立实现，不受 `_wrapEnabled` 影响 — errorHandler 始终绕过包装
 *
 * 时序保证：
 *   createVextResponse(c, () => req.requestId)
 *     ↓ executeChain 开始
 *   [requestIdMiddleware]        → req.requestId = 'a1b2c3d4...'
 *   [responseWrapperMiddleware]  → res._enableWrap()
 *     ↓
 *   [handler] res.status(201).json(data)
 *     → _wrapEnabled = true
 *     → getRequestId() → 'a1b2c3d4...'（已设置）
 *     → HTTP 201 ✅
 */
export function createVextResponse(
  c: Context,
  getRequestId: () => string,
): VextResponse {
  let _status = 200
  const _headers: Record<string, string> = {}
  let _wrapEnabled = false
  let _sent = false       // P2-2: 重复发送保护标志

  const res: VextResponse & { _enableWrap(): void } = {
    json(data, status?: number) {
      // P2-2: 重复发送保护（dev 模式打印 WARN，生产模式静默忽略）
      if (_sent) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[vextjs] ⚠️ res.json() called after response already sent. ' +
            'This is a no-op. Check your handler for duplicate sends.'
          )
        }
        return
      }
      _sent = true

      const finalStatus = status ?? _status

      // 设置响应头
      c.status(finalStatus as any)
      for (const [k, v] of Object.entries(_headers)) c.header(k, v)

      if (_wrapEnabled) {
        // P1-7: 204 No Content 不能有消息体（RFC 9110 §15.3.5）
        if (finalStatus === 204) {
          return c.body(null)
        }
        // 出口包装：{ code: 0, data, requestId }
        return c.json({ code: 0, data, requestId: getRequestId() })
      }

      // 未包装模式（_enableWrap 未调用时的降级行为）
      return c.json(data)
    },

    rawJson(data, status?: number) {
      // P2-2: 重复发送保护
      if (_sent) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(
            '[vextjs] ⚠️ res.rawJson() called after response already sent. ' +
            'This is a no-op. Check your error handler for duplicate sends.'
          )
        }
        return
      }
      _sent = true

      const finalStatus = status ?? _status
      c.status(finalStatus as any)
      for (const [k, v] of Object.entries(_headers)) c.header(k, v)
      return c.json(data)
    },

    text(content, status = _status) {
      c.status(status as any)
      for (const [k, v] of Object.entries(_headers)) c.header(k, v)
      return c.text(content)
    },

    stream(readable, contentType = 'application/octet-stream') {
      c.status(_status as any)
      c.header('Content-Type', contentType)
      for (const [k, v] of Object.entries(_headers)) c.header(k, v)
      return c.body(readable as any)
    },

    download(readable, filename, contentType) {
      const ct = contentType ?? 'application/octet-stream'
      c.status(_status as any)
      c.header('Content-Type', ct)
      c.header('Content-Disposition', `attachment; filename="${filename}"`)
      for (const [k, v] of Object.entries(_headers)) c.header(k, v)
      return c.body(readable as any)
    },

    redirect(url, status = 302) {
      return c.redirect(url, status as any)
    },

    status(code) {
      _status = code
      return res
    },

    setHeader(name, value) {
      _headers[name] = value
      return res
    },

    /**
     * 开启出口包装（内部方法，仅 response-wrapper 中间件调用）
     * 用户代码不应直接调用此方法
     * TypeScript 中通过 Omit<VextResponse, '_enableWrap'> 从用户可见类型中排除
     */
    _enableWrap() {
      _wrapEnabled = true
    },
  }

  return res
}
```

---

## 5. Adapter 解析（config → 实例）

框架在 `createApp()` 内部根据 `config.adapter` 创建 adapter 实例：

```typescript
// vextjs/lib/adapter-resolver.ts
import { createHonoAdapter } from '../adapters/hono'

/** 内置 adapter 映射表 */
const BUILT_IN_ADAPTERS: Record<string, (app: VextApp) => VextAdapter> = {
  hono: createHonoAdapter,
}

export function resolveAdapter(config: VextConfig, app: VextApp): VextAdapter {
  const adapterConfig = config.adapter ?? 'hono'

  // 字符串 → 内置 adapter
  if (typeof adapterConfig === 'string') {
    const factory = BUILT_IN_ADAPTERS[adapterConfig]
    if (!factory) {
      throw new Error(
        `[vextjs] config.adapter "${adapterConfig}" is not a built-in adapter. ` +
        `Did you mean 'hono'?\n` +
        `         Built-in adapters: ${Object.keys(BUILT_IN_ADAPTERS).join(', ')}\n` +
        `         For third-party adapters, pass an adapter object instead of a string.`
      )
    }
    return factory(app)
  }

  // 对象 → 第三方 adapter（必须满足 VextAdapter 接口）
  if (typeof adapterConfig === 'object' && adapterConfig !== null) {
    validateAdapterInterface(adapterConfig as VextAdapter)
    return adapterConfig as VextAdapter
  }

  throw new Error(
    `[vextjs] config.adapter must be a string (built-in) or an adapter object (third-party).`
  )
}

function validateAdapterInterface(adapter: unknown): asserts adapter is VextAdapter {
  const required = ['name', 'registerRoute', 'registerMiddleware', 'registerErrorHandler', 'registerNotFound', 'listen', 'buildHandler']
  const obj = adapter as Record<string, unknown>

  for (const method of required) {
    if (typeof obj[method] !== 'function' && typeof obj[method] !== 'string') {
      throw new Error(
        `[vextjs] Custom adapter is missing required ${typeof obj[method] === 'undefined' ? 'method' : 'valid'}: "${method}".\n` +
        `         Adapter must implement the VextAdapter interface (see 08-adapter.md).`
      )
    }
  }
}
```

### 配置写法

```typescript
// 内置 adapter（字符串标识，零 import）
export default {
  adapter: 'hono',    // 默认值，可省略
}

// 第三方 adapter（需 import）
import { fastifyAdapter } from 'vext-adapter-fastify'

export default {
  adapter: fastifyAdapter({ logger: true }),
}
```

---

## 6. 第三方 Adapter 开发指南

### 6.1 包结构

```
vext-adapter-fastify/
├── src/
│   ├── index.ts          # 导出工厂函数
│   ├── adapter.ts        # VextAdapter 实现
│   ├── request.ts        # Fastify Request → VextRequest
│   └── response.ts       # Fastify Reply → VextResponse
├── package.json
└── README.md
```

### 6.2 工厂函数签名

```typescript
// vext-adapter-fastify/src/index.ts
import type { VextAdapter } from 'vextjs'

export interface FastifyAdapterOptions {
  logger?: boolean
  // ...Fastify 特有配置
}

export function fastifyAdapter(options?: FastifyAdapterOptions): VextAdapter {
  // 返回满足 VextAdapter 接口的对象
  return createFastifyAdapter(options)
}
```

### 6.3 实现要求

第三方 adapter **必须**满足以下契约：

| 要求 | 说明 |
|------|------|
| 实现完整 `VextAdapter` 接口 | 所有方法均须实现，不可省略 |
| `VextRequest` 字段完整 | 所有必填字段正确映射（见 §2.1） |
| `VextResponse` 方法完整 | 所有方法正确映射（见 §2.2） |
| `trustProxy` 处理 | 通过 `app.config.trustProxy` 读取配置 |
| `listen()` 返回 `VextServerHandle` | 必须支持 `close()` 优雅关闭 |
| `registerErrorHandler` 捕获所有异常 | 包括同步 throw 和 Promise rejection |
| `req.onClose()` 正确触发 | 客户端断开连接时执行注册的钩子 |
| 无 adapter 特有 API 泄漏 | 用户代码不应接触底层框架对象 |

### 6.4 测试建议

第三方 adapter 应通过 vextjs 提供的适配器测试套件验证兼容性（⏳ 待开发）：

```typescript
// 未来计划
import { adapterTestSuite } from 'vextjs/test-utils'
import { fastifyAdapter }   from 'vext-adapter-fastify'

adapterTestSuite(fastifyAdapter())
```

---

## 7. 与启动流程的集成

```
const { app, internals } = createApp(finalConfig)
  ↓
① 内置模块初始化
  ↓ resolveAdapter(config, app) → app.adapter
② plugin-loader（插件可通过 app.adapter 访问，但一般不需要；app.use() 可用）
③ middleware-loader
④ service-loader
  ↓
⑤ router-loader
  ↓ 对每条路由调用 app.adapter.registerRoute(method, path, chain)
⑤+ internals.lockUse() — 锁定 app.use()
⑥ 注册出口/错误处理/404
  ↓ app.adapter.registerMiddleware(responseWrapperMiddleware)
  ↓ app.adapter.registerErrorHandler(globalErrorHandler)
  ↓ app.adapter.registerNotFound(notFoundHandler)
⑦ HTTP 开始监听
  ↓ const serverHandle = await app.adapter.listen(config.port, config.host)
  ↓ 注册信号处理（process.on SIGTERM/SIGINT → internals.shutdown(serverHandle)）
⑧ await internals.runReady()
⑨ /ready → 200
```

> adapter 实例化发生在 createApp 内部（①之后），挂载到 `app.adapter`。
> 路由注册（⑤）通过 `app.adapter.registerRoute()` 完成。
> `internals.lockUse()` 在⑤完成后由 bootstrap 显式调用（见 `06-built-ins.md` §4）。
> 优雅关闭通过 `internals.shutdown(serverHandle)` 触发，`serverHandle.close()` 返回 `Promise<void>`。

---

## 8. Fail Fast 验证

| 检测项 | 时机 | 错误示例 |
|-------|------|---------|
| `config.adapter` 为未知字符串 | createApp | `config.adapter "unknown" is not a built-in adapter. Did you mean 'hono'?` |
| 第三方 adapter 缺少必需方法 | createApp | `Custom adapter is missing required method: "registerRoute"` |
| `listen()` 端口被占用 | 启动阶段 | `EADDRINUSE: address already in use :::3000` |
| `listen()` 超时 | 启动阶段 | 由框架启动超时保护捕获 |

---

## 9. 边界与约束

### 9.1 adapter 不负责的事项

| 职责 | 负责模块 | 说明 |
|------|---------|------|
| body 解析 | 内置 body-parser 中间件 | adapter 仅提供原始请求，不解析 body |
| requestId 生成 | 内置 requestId 中间件 | adapter 不生成 requestId |
| 出口包装 | response-wrapper 中间件 | adapter 的 `res.json` 是原始版本 |
| 路由匹配逻辑 | router-loader + 底层框架 | adapter 依赖底层框架的路由匹配 |
| 校验 | validate 中间件 | adapter 不执行任何校验 |

### 9.2 出口包装内建模型（P0-1 修复后）

出口包装已从 monkey-patch 模式重构为**内建包装模型**。adapter 的 `createVextResponse` 内置包装逻辑：

1. `res.json()` 内部根据 `_wrapEnabled` 标志决定是否包装
2. `res.rawJson()` 独立于 `res.json()`，始终不包装（仅供错误处理使用）
3. `response-wrapper` 中间件仅调用 `res._enableWrap()` 开启包装标志，**不再 monkey-patch**
4. `_enableWrap()` 通过 `Omit<VextResponse, '_enableWrap'>` 从用户可见类型中排除

**链式调用场景验证**：

| 调用方式 | `_status` | `json()` 的 status 参数 | `finalStatus` | 行为 |
|---------|:---------:|:----------------------:|:------------:|------|
| `res.json(data)` | 200 | undefined | 200 | 包装 + HTTP 200 ✅ |
| `res.json(data, 201)` | 200 | 201 | 201 | 包装 + HTTP 201 ✅ |
| `res.status(201).json(data)` | 201 | undefined | 201 | 包装 + HTTP 201 ✅ |
| `res.status(204).json(null)` | 204 | undefined | 204 | 无 body + HTTP 204 ✅ |
| `res.json(null, 204)` | 200 | 204 | 204 | 无 body + HTTP 204 ✅ |

### 9.3 未来扩展

| 扩展方向 | 影响 |
|---------|------|
| HTTP/2 支持 | adapter 的 `listen()` 可扩展为接受 TLS 配置 |
| WebSocket 升级 | adapter 可增加 `registerUpgrade()` 方法 |
| SSE 支持 | 通过 `res.stream()` + 插件实现，adapter 无需改动 |

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|-------|---------|------|
| `VextAdapter` | `vextjs/lib/adapter.ts` | 适配器核心接口 |
| `VextServerHandle` | `vextjs/lib/adapter.ts` | 服务器句柄（close + port + host） |
| `VextRequest` | `vextjs/lib/adapter.ts` | 请求对象（见 `01c-response.md` §3） |
| `VextResponse` | `vextjs/lib/adapter.ts` | 响应对象（见 `01c-response.md` §4） |
| `VextHandler` | `vextjs/lib/adapter.ts` | `(req: VextRequest, res: VextResponse) => Promise<void> \| void` |
| `VextMiddleware` | `vextjs/lib/types.ts` | `(req, res, next: () => Promise<void>) => Promise<void> \| void` |
| `VextErrorMiddleware` | `vextjs/lib/types.ts` | `(err, req, res) => void` |