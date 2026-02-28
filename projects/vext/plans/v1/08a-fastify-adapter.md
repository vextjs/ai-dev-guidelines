# 08a - Fastify Adapter 原型详细设计

> **项目**: vext (vextjs)
> **日期**: 2026-02-28
> **状态**: 📝 设计稿
> **优先级**: P0（验证 VextAdapter 接口完备性）
> **依赖**: Adapter 层（`08-adapter.md` ✅）、路由层（`01-routes.md` ✅）、响应规范（`01c-response.md` ✅）
> **预计工期**: 3-5 天
> **包名**: `@vext.js/adapter-fastify`

---

## 0. 概述

Fastify Adapter 是 VextAdapter 接口的**第二个实现**，用于验证 Adapter 抽象层的完备性。如果 Fastify 能够无缝替换 Hono 且所有路由/中间件/插件代码零改动，则证明 VextAdapter 接口设计正确。

### 为什么选 Fastify 作为验证目标

| 维度 | Hono | Fastify | 差异带来的验证价值 |
|------|------|---------|------------------|
| **路由** | Trie router（自研） | Radix tree（find-my-way） | 验证路由注册抽象是否独立于底层 router 实现 |
| **请求/响应** | Web API（Request/Response） | Node.js 原生（IncomingMessage/ServerResponse） | 验证 VextRequest/VextResponse 转换层的通用性 |
| **中间件** | Web 标准中间件 | Fastify 插件/Hook 体系 | 验证中间件链执行模型是否与底层解耦 |
| **性能** | 高（轻量级） | 极高（JSON 序列化优化） | 验证 Adapter 抽象层不阻碍性能优化 |
| **生态** | 较新，生态小 | 成熟，企业级生态 | 验证 Adapter 接口能对接主流框架 |
| **Server** | 基于 Node.js http（通过 @hono/node-server） | 内置 Node.js http server | 验证 listen/close 抽象的完备性 |

### 核心原则

```yaml
原则 1: 用户代码零改动 — 切换 adapter 只需改 config.adapter
原则 2: 完整实现 VextAdapter 接口 — 全部 7 个方法
原则 3: VextRequest / VextResponse 字段完整映射 — 无遗漏
原则 4: 独立包发布 — 不耦合到 vextjs 核心包
原则 5: 验证驱动 — 发现接口缺陷时优先修复接口，而非在 Adapter 层打补丁
```

---

## 1. 包结构

```
@vext.js/adapter-fastify/
├── src/
│   ├── index.ts              # 导出工厂函数 fastifyAdapter()
│   ├── adapter.ts            # VextAdapter 接口完整实现
│   ├── request.ts            # Fastify Request → VextRequest 转换
│   ├── response.ts           # Fastify Reply → VextResponse 转换
│   └── utils.ts              # 辅助函数（IP 解析、协议检测等）
├── test/
│   ├── adapter.test.ts       # Adapter 接口合规性测试
│   ├── request.test.ts       # 请求转换测试
│   ├── response.test.ts      # 响应转换测试
│   └── integration.test.ts   # 与 vextjs 集成测试
├── package.json
├── tsconfig.json
└── README.md
```

### 1.1 package.json

```json
{
  "name": "@vext.js/adapter-fastify",
  "version": "0.1.0",
  "description": "Fastify adapter for VextJS framework",
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
  "scripts": {
    "build": "tsc",
    "test": "node --test test/**/*.test.ts",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {
    "vextjs": "^0.1.0"
  },
  "dependencies": {
    "fastify": "^5.0.0"
  },
  "devDependencies": {
    "vextjs": "^0.1.0",
    "typescript": "^5.9.0"
  },
  "engines": {
    "node": ">= 22.0.0"
  },
  "license": "MIT"
}
```

---

## 2. 工厂函数

```typescript
// @vext.js/adapter-fastify/src/index.ts
import type { VextAdapter, VextApp } from 'vextjs'
import { createFastifyAdapter } from './adapter.js'

export interface FastifyAdapterOptions {
  /** Fastify 内置日志（默认 false，vext 有自己的 logger） */
  logger?: boolean

  /**
   * Fastify 插件超时（毫秒，默认 10000）
   * Fastify 内部 register 的超时，与 vext plugin-loader 超时独立
   */
  pluginTimeout?: number

  /**
   * 请求体大小限制（字节，默认 1MB）
   * 对应 Fastify 的 bodyLimit
   */
  bodyLimit?: number

  /**
   * 忽略尾部斜杠（默认 true）
   * /users 和 /users/ 视为相同路由
   */
  ignoreTrailingSlash?: boolean

  /**
   * 大小写不敏感（默认 false）
   * /Users 和 /users 视为相同路由
   */
  caseSensitive?: boolean
}

/**
 * 创建 Fastify Adapter 工厂函数
 *
 * 使用方式 1 — 零配置（推荐）:
 *   config.adapter = fastifyAdapter()
 *
 * 使用方式 2 — 自定义选项:
 *   config.adapter = fastifyAdapter({ bodyLimit: 5 * 1024 * 1024 })
 *
 * 使用方式 3 — 在 vext config 中直接引用:
 *   // src/config/default.ts
 *   import { fastifyAdapter } from '@vext.js/adapter-fastify'
 *   export default {
 *     adapter: fastifyAdapter(),
 *   }
 */
export function fastifyAdapter(options?: FastifyAdapterOptions): VextAdapter {
  // 延迟初始化：工厂函数返回 adapter 对象，Fastify 实例在首次调用时创建
  // 这样可以确保在 createApp() 阶段 adapter 已就绪
  return createFastifyAdapter(options ?? {})
}
```

---

## 3. Adapter 核心实现

```typescript
// @vext.js/adapter-fastify/src/adapter.ts
import Fastify, { type FastifyInstance, type FastifyRequest, type FastifyReply } from 'fastify'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import type {
  VextAdapter,
  VextServerHandle,
  VextMiddleware,
  VextErrorMiddleware,
  VextRequest,
  VextResponse,
} from 'vextjs'
import { createVextRequest }  from './request.js'
import { createVextResponse } from './response.js'
import type { FastifyAdapterOptions } from './index.js'

/** 中间件链执行器（与 Hono Adapter 共享逻辑） */
async function executeChain(
  chain: VextMiddleware[],
  req:   VextRequest,
  res:   VextResponse,
): Promise<void> {
  let index = 0

  const next = async (): Promise<void> => {
    if (index < chain.length) {
      const middleware = chain[index++]
      await middleware(req, res, next)
    }
  }

  await next()
}

export function createFastifyAdapter(options: FastifyAdapterOptions): VextAdapter {
  const fastify: FastifyInstance = Fastify({
    logger:               options.logger ?? false,
    pluginTimeout:        options.pluginTimeout ?? 10000,
    bodyLimit:            options.bodyLimit ?? 1048576,        // 1MB
    ignoreTrailingSlash:  options.ignoreTrailingSlash ?? true,
    caseSensitive:        options.caseSensitive ?? false,

    // 禁用 Fastify 内置的内容类型解析
    // vext 有自己的 body-parser 中间件
    // 通过 addContentTypeParser 接管 body 解析
  })

  const globalMiddlewares: VextMiddleware[] = []
  let errorHandler: VextErrorMiddleware | null = null
  let notFoundHandler: VextMiddleware | null = null

  // 全局 app 引用（在 registerRoute 时通过闭包获取）
  let _app: VextApp | null = null

  // ── 禁用 Fastify 内置 body 解析（交给 vext body-parser 中间件）──
  // Fastify 默认解析 application/json，会与 vext 的 body-parser 冲突
  // 传入 raw body 让 vext 中间件自行处理
  fastify.removeAllContentTypeParsers()
  fastify.addContentTypeParser(
    '*',
    { parseAs: 'buffer' },
    (_req: FastifyRequest, body: Buffer, done: (err: null, body: Buffer) => void) => {
      done(null, body)
    },
  )

  return {
    name: 'fastify',

    // ─── registerMiddleware ─────────────────────────────
    registerMiddleware(middleware: VextMiddleware): void {
      globalMiddlewares.push(middleware)
    },

    // ─── registerRoute ──────────────────────────────────
    registerRoute(
      method: string,
      path:   string,
      chain:  VextMiddleware[],
    ): void {
      const fastifyMethod = method.toLowerCase() as
        'get' | 'post' | 'put' | 'patch' | 'delete' | 'head' | 'options'

      // 转换 vext 路由参数格式到 Fastify 格式
      // vext: /users/:id  → Fastify: /users/:id（格式相同，无需转换）
      // vext: /files/*path → Fastify: /files/*（通配符语法差异处理）
      const fastifyPath = convertPathParams(path)

      fastify[fastifyMethod](fastifyPath, async (request: FastifyRequest, reply: FastifyReply) => {
        const req = createVextRequest(request, reply, _app!)
        const res = createVextResponse(reply, () => req.requestId)

        try {
          const fullChain = [...globalMiddlewares, ...chain]
          await executeChain(fullChain, req, res)
        } catch (err) {
          if (errorHandler) {
            try {
              errorHandler(err, req, res)
            } catch (handlerError) {
              try {
                res.rawJson({ code: 500, message: 'Internal Server Error' }, 500)
              } catch {
                throw handlerError
              }
            }
          } else {
            throw err
          }
        }
      })
    },

    // ─── registerErrorHandler ───────────────────────────
    registerErrorHandler(handler: VextErrorMiddleware): void {
      errorHandler = handler

      // 同时注册到 Fastify 的 setErrorHandler
      // 捕获 Fastify 内部抛出的错误（如路由匹配失败等）
      fastify.setErrorHandler(async (error, request, reply) => {
        const req = createVextRequest(request, reply, _app!)
        if (!req.requestId) {
          req.requestId = req.headers['x-request-id'] || crypto.randomUUID()
        }
        const res = createVextResponse(reply, () => req.requestId)

        try {
          handler(error, req, res)
        } catch (handlerError) {
          try {
            res.rawJson({ code: 500, message: 'Internal Server Error' }, 500)
          } catch {
            reply.status(500).send('Internal Server Error')
          }
        }
      })
    },

    // ─── registerNotFound ───────────────────────────────
    registerNotFound(handler: VextMiddleware): void {
      notFoundHandler = handler

      fastify.setNotFoundHandler(async (request: FastifyRequest, reply: FastifyReply) => {
        const req = createVextRequest(request, reply, _app!)
        // 内联生成 requestId（notFound 不走中间件链）
        if (!req.requestId) {
          req.requestId = req.headers['x-request-id'] || crypto.randomUUID()
        }
        const res = createVextResponse(reply, () => req.requestId)
        await handler(req, res, () => {})
      })
    },

    // ─── listen ─────────────────────────────────────────
    async listen(port: number, host: string = '0.0.0.0'): Promise<VextServerHandle> {
      // 在 listen 之前需要 await fastify.ready() 确保所有插件和路由注册完成
      await fastify.ready()

      const address = await fastify.listen({ port, host })

      return {
        port,
        host,
        async close(): Promise<void> {
          await fastify.close()
        },
      }
    },

    // ─── buildHandler ───────────────────────────────────
    buildHandler(): (req: IncomingMessage, res: ServerResponse) => void {
      // Fastify 提供 .routing() 方法，返回标准 Node.js 请求处理函数
      // 这在 dev 模式 Hot Reload 时用于原子替换 requestHandler
      //
      // 注意：需要先 await fastify.ready()
      // 由于 buildHandler 是同步签名，这里需要特殊处理
      //
      // Fastify 的 server.handler 内部就是 routing()
      // 直接返回 Fastify 的底层 Node.js handler

      // 使用 Fastify 的 inject 式路由分发
      return (nodeReq: IncomingMessage, nodeRes: ServerResponse) => {
        fastify.routing(nodeReq, nodeRes)
      }
    },
  }
}

/**
 * 转换路由路径参数格式
 *
 * vext 路径格式与 Fastify 基本一致（都使用 :param），
 * 主要差异在通配符：
 *   vext:    /files/*path   → 具名通配符
 *   Fastify: /files/*       → Fastify v5 支持 /files/*path
 */
function convertPathParams(path: string): string {
  // Fastify v5 支持具名通配符 *param，与 vext 格式一致
  // 无需转换
  return path
}
```

---

## 4. 请求转换

```typescript
// @vext.js/adapter-fastify/src/request.ts
import type { FastifyRequest, FastifyReply } from 'fastify'
import type { VextRequest, VextApp } from 'vextjs'
import { resolveIp, resolveProtocol } from './utils.js'

export function createVextRequest(
  request: FastifyRequest,
  reply:   FastifyReply,
  app:     VextApp,
): VextRequest {
  const trustProxy = app.config.trustProxy ?? false
  const closeHandlers: Array<() => void> = []

  const req: VextRequest = {
    // ── 原始数据 ────────────────────────────────────────
    query:   (request.query as Record<string, string>) ?? {},
    body:    undefined,            // body-parser 中间件负责填充
    params:  (request.params as Record<string, string>) ?? {},
    headers: request.headers as Record<string, string>,
    method:  request.method.toUpperCase(),
    url:     request.url,
    path:    request.routeOptions?.url ?? request.url.split('?')[0],

    // ── 元信息 ──────────────────────────────────────────
    app,
    requestId: '',                 // requestId 中间件负责填充
    ip:        resolveIp(request, trustProxy),
    protocol:  resolveProtocol(request, trustProxy),

    // ── 生命周期 ────────────────────────────────────────
    onClose(handler: () => void): void {
      closeHandlers.push(handler)
    },

    // ── 校验数据 ────────────────────────────────────────
    valid(location: string) {
      return (req as any)[`_validated_${location}`]
    },
  }

  // 请求结束时执行 onClose hooks
  // Fastify 提供 request.raw.on('close') 事件
  request.raw.on('close', () => {
    for (const h of closeHandlers) {
      try { h() } catch {}
    }
    closeHandlers.length = 0
  })

  return req
}
```

### 4.1 与 Hono Adapter 的转换对比

| VextRequest 字段 | Hono 来源 | Fastify 来源 | 差异说明 |
|-----------------|-----------|-------------|---------|
| `query` | `new URL(c.req.url).searchParams` | `request.query` | Fastify 已解析好 query 对象 |
| `body` | `undefined`（body-parser 填充） | `undefined`（同） | 一致 |
| `params` | `c.req.param()` | `request.params` | Fastify 直接提供对象 |
| `headers` | `Object.fromEntries(c.req.raw.headers)` | `request.headers` | Fastify headers 已是对象 |
| `method` | `c.req.method.toUpperCase()` | `request.method.toUpperCase()` | 一致 |
| `url` | `c.req.url` | `request.url` | 一致 |
| `path` | `c.req.path` | `request.url.split('?')[0]` | Fastify 无直接 `.path`，需手动提取 |
| `app` | 闭包传入 | 闭包传入 | 一致 |
| `requestId` | `''`（中间件填充） | `''`（同） | 一致 |
| `ip` | `(c.env as any)?.incoming?.socket?.remoteAddress` | `request.ip` 或 `request.raw.socket.remoteAddress` | Fastify 有内置 `request.ip` |
| `protocol` | Header 推断 | Header 推断 | 一致 |
| `onClose` | `c.req.raw.signal?.addEventListener('abort')` | `request.raw.on('close')` | 事件 API 不同 |
| `valid` | `(req as any)['_validated_' + location]` | 同 | 一致 |

### 4.2 接口完备性验证清单

此对比表是 Fastify Adapter 的核心验证产物。每个字段标记验证状态：

```yaml
VextRequest 字段完备性:
  query:      ✅ 可映射（Fastify 原生支持）
  body:       ✅ 可映射（由 vext body-parser 填充，无关底层框架）
  params:     ✅ 可映射（Fastify 原生支持）
  headers:    ✅ 可映射（Node.js 原生 headers 对象）
  method:     ✅ 可映射
  url:        ✅ 可映射
  path:       ⚠️ 需手动提取（Fastify 无直接 .path 属性）
  app:        ✅ 闭包传入
  requestId:  ✅ 由 vext 中间件填充（不依赖底层框架）
  ip:         ✅ 可映射（Fastify 有内置 request.ip，含 trustProxy 支持）
  protocol:   ✅ 可映射
  onClose:    ✅ 可映射（request.raw.on('close')）
  valid:      ✅ 内部状态，不依赖底层框架
```

---

## 5. 响应转换

```typescript
// @vext.js/adapter-fastify/src/response.ts
import type { FastifyReply } from 'fastify'
import type { VextResponse } from 'vextjs'

/**
 * Fastify Reply → VextResponse 转换
 *
 * 与 Hono Adapter 的 response.ts 逻辑完全一致：
 * - 延迟绑定 requestId（getRequestId getter）
 * - _wrapEnabled 控制出口包装
 * - 重复发送保护（_sent 标志）
 * - 204 No Content RFC 9110 合规
 */
export function createVextResponse(
  reply:          FastifyReply,
  getRequestId:   () => string,
): VextResponse & { _enableWrap(): void } {
  let _status = 200
  const _headers: Record<string, string> = {}
  let _wrapEnabled = false
  let _sent = false

  const res: VextResponse & { _enableWrap(): void } = {
    json(data: unknown, status?: number) {
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
      reply.status(finalStatus)
      for (const [k, v] of Object.entries(_headers)) {
        reply.header(k, v)
      }

      if (_wrapEnabled) {
        // P1-7: 204 No Content 不能有消息体
        if (finalStatus === 204) {
          reply.send(null)
          return
        }
        // 出口包装：{ code: 0, data, requestId }
        reply.header('Content-Type', 'application/json; charset=utf-8')
        reply.send(JSON.stringify({ code: 0, data, requestId: getRequestId() }))
        return
      }

      // 未包装模式
      reply.header('Content-Type', 'application/json; charset=utf-8')
      reply.send(JSON.stringify(data))
    },

    rawJson(data: unknown, status?: number) {
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
      reply.status(finalStatus)
      for (const [k, v] of Object.entries(_headers)) {
        reply.header(k, v)
      }
      reply.header('Content-Type', 'application/json; charset=utf-8')
      reply.send(JSON.stringify(data))
    },

    text(content: string, status: number = _status) {
      if (_sent) return
      _sent = true
      reply.status(status)
      for (const [k, v] of Object.entries(_headers)) {
        reply.header(k, v)
      }
      reply.header('Content-Type', 'text/plain; charset=utf-8')
      reply.send(content)
    },

    stream(readable: NodeJS.ReadableStream, contentType: string = 'application/octet-stream') {
      if (_sent) return
      _sent = true
      reply.status(_status)
      reply.header('Content-Type', contentType)
      for (const [k, v] of Object.entries(_headers)) {
        reply.header(k, v)
      }
      reply.send(readable)
    },

    download(readable: NodeJS.ReadableStream, filename: string, contentType?: string) {
      if (_sent) return
      _sent = true
      const ct = contentType ?? 'application/octet-stream'
      reply.status(_status)
      reply.header('Content-Type', ct)
      reply.header('Content-Disposition', `attachment; filename="${filename}"`)
      for (const [k, v] of Object.entries(_headers)) {
        reply.header(k, v)
      }
      reply.send(readable)
    },

    redirect(url: string, status: number = 302) {
      if (_sent) return
      _sent = true
      reply.redirect(status, url)
    },

    status(code: number) {
      _status = code
      return res
    },

    setHeader(name: string, value: string) {
      _headers[name] = value
      return res
    },

    _enableWrap() {
      _wrapEnabled = true
    },
  }

  return res
}
```

### 5.1 VextResponse 接口完备性验证

```yaml
VextResponse 方法完备性:
  json(data, status?):                 ✅ reply.send(JSON.stringify(...))
  rawJson(data, status?):              ✅ reply.send(JSON.stringify(...))
  text(content, status?):              ✅ reply.send(content)
  stream(readable, contentType?):      ✅ reply.send(readable)
  download(readable, filename, ct?):   ✅ reply.send(readable) + Content-Disposition
  redirect(url, status?):              ✅ reply.redirect(status, url)
  status(code):                        ✅ 内部状态 _status
  setHeader(name, value):              ✅ 内部状态 _headers
  _enableWrap():                       ✅ 内部标志 _wrapEnabled

Fastify 特殊注意:
  - Fastify 默认自动序列化 JSON（reply.send(object)），需要绕过
  - 使用 reply.send(JSON.stringify(...)) 手动序列化，确保与 Hono Adapter 行为一致
  - Fastify 的 reply.redirect 参数顺序是 (status, url)，与标准 (url, status) 不同
```

---

## 6. 工具函数

```typescript
// @vext.js/adapter-fastify/src/utils.ts
import type { FastifyRequest } from 'fastify'

/**
 * 解析客户端 IP
 *
 * Fastify 内置 trustProxy 支持（通过 Fastify 配置项 trustProxy）
 * 但 vext 有自己的 trustProxy 逻辑（config.trustProxy），
 * 为保持 Adapter 间行为一致，此处自行解析
 */
export function resolveIp(request: FastifyRequest, trustProxy: boolean): string {
  if (trustProxy) {
    const xff = request.headers['x-forwarded-for']
    if (typeof xff === 'string') {
      return xff.split(',')[0].trim()
    }
    if (Array.isArray(xff) && xff.length > 0) {
      return xff[0].split(',')[0].trim()
    }
  }

  // Fastify 提供 request.ip，但这依赖 Fastify 自身的 trustProxy 配置
  // 为了行为一致性，直接从 socket 获取
  return request.raw.socket.remoteAddress ?? '127.0.0.1'
}

/**
 * 解析请求协议
 */
export function resolveProtocol(
  request: FastifyRequest,
  trustProxy: boolean,
): 'http' | 'https' {
  if (trustProxy) {
    const proto = request.headers['x-forwarded-proto']
    if (proto === 'https') return 'https'
  }

  // 检查 socket 是否为 TLS
  const encrypted = (request.raw.socket as any)?.encrypted
  return encrypted ? 'https' : 'http'
}
```

---

## 7. 配置集成

### 7.1 用户项目中使用 Fastify Adapter

```typescript
// src/config/default.ts
import { fastifyAdapter } from '@vext.js/adapter-fastify'

export default {
  port: 3000,

  // 方式 1: 零配置（推荐）
  adapter: fastifyAdapter(),

  // 方式 2: 自定义选项
  // adapter: fastifyAdapter({
  //   bodyLimit: 5 * 1024 * 1024,   // 5MB
  //   ignoreTrailingSlash: true,
  // }),
}
```

### 7.2 切换 Adapter 的用户体验

从 Hono（默认）切换到 Fastify 只需改一行配置：

```typescript
// 切换前（Hono，默认）
export default {
  adapter: 'hono',   // 或省略（默认就是 hono）
}

// 切换后（Fastify）
import { fastifyAdapter } from '@vext.js/adapter-fastify'

export default {
  adapter: fastifyAdapter(),
}
```

**用户代码（routes/services/middlewares/plugins）完全不变。**

---

## 8. 接口完备性验证矩阵

这是 Fastify Adapter 的核心验证产物 — VextAdapter 接口在 Fastify 场景下的逐项验证：

### 8.1 VextAdapter 方法验证

| 方法 | Fastify 对应实现 | 状态 | 备注 |
|------|-----------------|:----:|------|
| `registerRoute(method, path, chain)` | `fastify[method](path, handler)` + 内部 executeChain | ✅ | 路由参数格式一致（`:param`） |
| `registerMiddleware(middleware)` | `globalMiddlewares.push(middleware)` | ✅ | 全局中间件在 executeChain 中前置 |
| `registerErrorHandler(handler)` | `fastify.setErrorHandler()` | ✅ | Fastify 原生支持 |
| `registerNotFound(handler)` | `fastify.setNotFoundHandler()` | ✅ | Fastify 原生支持 |
| `listen(port, host)` | `fastify.listen({ port, host })` | ✅ | 返回 VextServerHandle |
| `buildHandler()` | `fastify.routing(req, res)` | ⚠️ | 需要确保 `fastify.ready()` 已调用 |
| `name` | `'fastify'` | ✅ | — |

### 8.2 VextServerHandle 验证

| 属性/方法 | Fastify 对应实现 | 状态 |
|----------|-----------------|:----:|
| `close()` | `fastify.close()` | ✅ |
| `port` | 构造时传入 | ✅ |
| `host` | 构造时传入 | ✅ |

### 8.3 需要注意的差异

| 差异点 | Hono 行为 | Fastify 行为 | 影响 | 处理方式 |
|--------|----------|-------------|------|---------|
| Body 解析 | Hono 不自动解析 body | Fastify 默认解析 JSON | 与 vext body-parser 冲突 | 禁用 Fastify 内置解析器（`removeAllContentTypeParsers`） |
| JSON 序列化 | `c.json()` 内部序列化 | `reply.send(obj)` 自动序列化 | 双重序列化风险 | 使用 `reply.send(JSON.stringify(...))` 手动控制 |
| 路由参数 | `:param` 格式 | `:param` 格式 | 无差异 | 无需处理 |
| 通配符 | `*path` | `*path`（Fastify v5） | 无差异（v5） | 无需处理 |
| onClose 触发 | `c.req.raw.signal.addEventListener('abort')` | `request.raw.on('close')` | 事件 API 不同 | 各自适配 |
| buildHandler 时序 | 同步可用 | 需先 `await ready()` | `buildHandler()` 是同步签名 | `listen()` 内先调 `ready()`，`buildHandler()` 文档说明需在 `listen()` 后调用 |
| `req.path` | `c.req.path` 直接提供 | 无直接属性 | 需手动提取 | `request.url.split('?')[0]` |

### 8.4 发现的潜在接口改进

在实现 Fastify Adapter 过程中发现的 VextAdapter 接口可优化点：

| # | 改进建议 | 原因 | 影响范围 | 优先级 |
|---|---------|------|---------|:------:|
| 1 | `buildHandler()` 增加 `async` 签名或 `init()` 方法 | Fastify 需要 `await ready()` 才能使用 `routing()`，当前同步签名无法 await | VextAdapter 接口、dev 模式 hot-handler | P1 |
| 2 | VextRequest 增加 `rawBody` 属性 | Fastify `removeAllContentTypeParsers` 后 body 是 Buffer，需要暴露给 body-parser | VextRequest 接口 | P2 |
| 3 | 考虑在 VextAdapter 接口中增加 `setApp(app)` 方法 | 当前通过闭包传递 app 引用（Hono: createHonoAdapter(app)），第三方 Adapter 需要在 registerRoute 前获取 app | VextAdapter 接口、adapter-resolver | P2 |

> **⚠️ 重要**：以上改进建议需要在 Fastify Adapter 实际编码验证后确认。设计稿阶段仅为预判，实际编码时可能发现更多或更少的接口缺陷。

---

## 9. 测试策略

### 9.1 适配器合规性测试

```typescript
// test/adapter.test.ts
import { describe, it, assert } from 'node:test'
import { fastifyAdapter } from '../src/index.js'

describe('Fastify Adapter — VextAdapter 接口合规性', () => {
  it('应实现所有 VextAdapter 必需方法', () => {
    const adapter = fastifyAdapter()

    assert.strictEqual(adapter.name, 'fastify')
    assert.strictEqual(typeof adapter.registerRoute, 'function')
    assert.strictEqual(typeof adapter.registerMiddleware, 'function')
    assert.strictEqual(typeof adapter.registerErrorHandler, 'function')
    assert.strictEqual(typeof adapter.registerNotFound, 'function')
    assert.strictEqual(typeof adapter.listen, 'function')
    assert.strictEqual(typeof adapter.buildHandler, 'function')
  })

  it('应注册路由并正确响应', async () => {
    const adapter = fastifyAdapter()
    // ... 注册路由 + listen + 发送请求 + 验证响应
  })

  it('应执行全局中间件 + 路由级中间件链', async () => {
    const adapter = fastifyAdapter()
    const order: string[] = []

    adapter.registerMiddleware(async (req, res, next) => {
      order.push('global')
      await next()
    })

    adapter.registerRoute('GET', '/test', [
      async (req, res, next) => {
        order.push('route')
        await next()
      },
      async (req, res) => {
        order.push('handler')
        res.json({ ok: true })
      },
    ])

    // ... listen + 发送请求
    assert.deepStrictEqual(order, ['global', 'route', 'handler'])
  })

  it('应正确处理错误', async () => {
    const adapter = fastifyAdapter()
    let caughtError: unknown = null

    adapter.registerErrorHandler((err, req, res) => {
      caughtError = err
      res.rawJson({ code: 500, message: 'handled' }, 500)
    })

    adapter.registerRoute('GET', '/error', [
      async () => { throw new Error('test error') },
    ])

    // ... listen + 发送请求
    assert.ok(caughtError instanceof Error)
  })

  it('应正确处理 404', async () => {
    const adapter = fastifyAdapter()
    let notFoundCalled = false

    adapter.registerNotFound(async (req, res) => {
      notFoundCalled = true
      res.rawJson({ code: 404, message: 'Not Found' }, 404)
    })

    // ... listen + 发送 /nonexistent 请求
    assert.strictEqual(notFoundCalled, true)
  })

  it('VextServerHandle.close() 应正确关闭服务器', async () => {
    const adapter = fastifyAdapter()
    adapter.registerRoute('GET', '/', [
      async (req, res) => res.json({ ok: true }),
    ])

    const handle = await adapter.listen(0) // 随机端口
    assert.ok(handle.port > 0)

    await handle.close()
    // 关闭后请求应失败
  })
})
```

### 9.2 跨 Adapter 一致性测试（未来）

```typescript
// 未来计划：通用适配器测试套件
// vextjs/test-utils/adapter-test-suite.ts
import type { VextAdapter } from 'vextjs'

export function adapterTestSuite(
  name: string,
  createAdapter: () => VextAdapter,
) {
  describe(`${name} — VextAdapter 标准测试套件`, () => {
    // 运行标准化的 100+ 测试用例
    // 覆盖所有 VextRequest 字段、VextResponse 方法、
    // 中间件链执行顺序、错误处理边界等
  })
}

// 使用示例
import { createHonoAdapter }    from 'vextjs/adapters/hono'
import { fastifyAdapter }       from '@vext.js/adapter-fastify'

adapterTestSuite('hono',    () => createHonoAdapter(mockApp))
adapterTestSuite('fastify', () => fastifyAdapter())
```

---

## 10. 性能考量

### 10.1 JSON 序列化

Fastify 最大的性能优势之一是 `fast-json-stringify`（基于 JSON Schema 预编译序列化函数）。但在 VextAdapter 中，vext 自行管理 JSON 序列化（`res.json()` 内部调用 `JSON.stringify`），无法利用此优势。

**权衡**：

| 方案 | 性能 | 一致性 |
|------|:----:|:------:|
| 使用 `reply.send(object)`（Fastify 自动序列化） | ⭐⭐⭐⭐⭐ | ❌ 行为与 Hono Adapter 不一致 |
| 使用 `reply.send(JSON.stringify(...))`（手动序列化） | ⭐⭐⭐⭐ | ✅ 与 Hono Adapter 一致 |

**结论**：选择手动序列化，保证跨 Adapter 行为一致性。性能差距在大多数场景下不显著（JSON.stringify 已足够快）。

### 10.2 后续优化方向

如果需要利用 Fastify 的高级序列化能力，可在**未来版本**中：

1. 在 VextAdapter 接口新增可选 `serializeJson(data)` 方法
2. Fastify Adapter 内部使用 `fast-json-stringify` 实现
3. 其他 Adapter 默认 fallback 到 `JSON.stringify`

> 当前版本（原型）不实现此优化。

---

## 11. Fastify 内置 Body 解析的处理

### 11.1 问题

Fastify 默认注册 `application/json` 和 `text/plain` 的 content-type parser，会在路由 handler 执行前自动解析请求体。但 vext 有自己的 `body-parser` 中间件（在中间件链中执行），两者会冲突。

### 11.2 解决方案

在 Adapter 初始化时禁用 Fastify 内置解析器：

```typescript
// 移除所有内置解析器
fastify.removeAllContentTypeParsers()

// 注册通用解析器，将 raw body（Buffer）传递给 vext 中间件
fastify.addContentTypeParser(
  '*',
  { parseAs: 'buffer' },
  (_req, body, done) => {
    done(null, body)
  },
)
```

vext 的 body-parser 中间件从 `request.body`（此时是 Buffer）中解析出结构化数据，填充到 `req.body`。

### 11.3 验证

```yaml
场景 1: POST application/json → body-parser 解析 Buffer → req.body = { ... }     ✅
场景 2: POST multipart/form-data → body-parser 解析 Buffer → req.body = FormData  ✅
场景 3: GET 无 body → request.body = undefined → req.body = undefined              ✅
场景 4: POST text/plain → body-parser 解析 Buffer → req.body = 'string'            ✅
```

---

## 12. `buildHandler()` 时序问题

### 12.1 问题描述

VextAdapter 接口中 `buildHandler()` 是同步方法签名：

```typescript
buildHandler(): (req: IncomingMessage, res: ServerResponse) => void
```

但 Fastify 需要先调用 `await fastify.ready()` 才能使用 `fastify.routing()`（Fastify 的内部 Node.js handler）。

### 12.2 解决方案

在 `listen()` 方法中已经调用 `await fastify.ready()`。`buildHandler()` 只应在以下场景被调用：

1. **`listen()` 之后**：此时 `ready()` 已完成，可以安全使用
2. **dev 模式 Hot Reload**：创建 fresh adapter 后，框架应确保在调用 `buildHandler()` 前完成所有路由注册

**约定**：`buildHandler()` 的调用者必须确保所有 `registerRoute` / `registerMiddleware` / `registerErrorHandler` / `registerNotFound` 已完成。

对于 dev 模式，`HotSwappableHandler` 中的调用顺序应为：

```typescript
// dev 模式 Soft Reload
const adapter = createFastifyAdapter(options)
// ... 重新注册所有路由和中间件 ...
await (adapter as any)._fastify.ready()  // 确保 Fastify 就绪
const handler = adapter.buildHandler()   // 此时可安全调用
hotHandler.swap(handler)                 // 原子替换
```

### 12.3 接口改进建议

如果此时序问题频繁出现，建议在 VextAdapter 接口中新增：

```typescript
interface VextAdapter {
  // ... 现有方法 ...

  /**
   * 可选的异步初始化方法
   * 在所有 register* 调用完成后、buildHandler/listen 前调用
   * Fastify 在此处调用 ready()
   * Hono 可以空实现
   */
  finalize?(): Promise<void>
}
```

> 此改进为 **P1 建议**，当前原型阶段通过文档约定规避。

---

## 13. 实施步骤

### 13.1 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/index.ts` | 工厂函数导出 |
| 新建 | `src/adapter.ts` | VextAdapter 完整实现 |
| 新建 | `src/request.ts` | Fastify Request → VextRequest |
| 新建 | `src/response.ts` | Fastify Reply → VextResponse |
| 新建 | `src/utils.ts` | IP/协议解析辅助函数 |
| 新建 | `test/adapter.test.ts` | 接口合规性测试 |
| 新建 | `test/integration.test.ts` | 与 vextjs 集成测试 |
| 新建 | `package.json` | 包配置 |
| 新建 | `tsconfig.json` | TypeScript 配置 |
| 新建 | `README.md` | 使用说明 |

### 13.2 进度估算

| 阶段 | 工作量 | 说明 |
|------|:------:|------|
| 搭建包结构 + 工厂函数 | 0.5 天 | package.json / tsconfig / index.ts |
| adapter.ts 核心实现 | 1 天 | 7 个方法 + body 解析禁用 |
| request.ts + response.ts 转换 | 1 天 | 字段映射 + 边界处理 |
| 测试 + 接口验证 | 1 天 | 合规性测试 + 集成测试 |
| 文档 + 接口改进建议 | 0.5 天 | README + 验证矩阵 |
| **合计** | **3-5 天** | 含接口缺陷修复时间 |

### 13.3 验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | 所有 VextAdapter 接口方法均已实现 | 类型检查通过 |
| 2 | VextRequest 全部字段正确映射 | 单元测试 |
| 3 | VextResponse 全部方法正确映射 | 单元测试 |
| 4 | 用户代码零改动切换 Adapter | 集成测试：同一路由/服务/中间件代码在 Hono 和 Fastify 下均通过 |
| 5 | 中间件链执行顺序一致 | 对比测试 |
| 6 | 错误处理行为一致 | 边界测试（errorHandler 自身抛异常等） |
| 7 | trustProxy 行为一致 | IP/协议解析对比测试 |
| 8 | onClose hooks 正确触发 | 连接断开测试 |
| 9 | 优雅关闭正常工作 | close() 后端口释放测试 |
| 10 | 接口完备性验证矩阵完成 | 文档产出 §8 |

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|--------|---------|------|
| `FastifyAdapterOptions` | `src/index.ts` | 适配器选项 |
| `VextAdapter` | `vextjs/types/adapter.ts`（外部依赖） | 适配器接口 |
| `VextServerHandle` | `vextjs/types/adapter.ts`（外部依赖） | 服务器句柄 |
| `VextRequest` | `vextjs/types/request.ts`（外部依赖） | 请求对象 |
| `VextResponse` | `vextjs/types/response.ts`（外部依赖） | 响应对象 |

---

**版本记录**:
- v1.0.0 (2026-02-28): 初版设计 — Fastify Adapter 原型，VextAdapter 接口完备性验证