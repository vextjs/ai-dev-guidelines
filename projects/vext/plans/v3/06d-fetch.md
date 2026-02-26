# 06d — app.fetch 内置 HTTP 客户端（请求追踪）

> **项目**: vext (vextjs)
> **日期**: 2026-02-26
> **状态**: 设计稿
> **依赖**: `06-built-ins.md`（内置模块总表）、`05-config.md`（requestId 配置）
> **定位**: 框架内置、默认可用、支持插件替换

---

## 0. 为什么需要内置 HTTP 客户端

| 痛点 | 说明 |
|------|------|
| **跨服务追踪断链** | 用户自行 `fetch()` 调用其他服务时，requestId / traceId 不会自动传播，排查链路断裂 |
| **日志断联** | 出站请求没有自动关联到当前请求的 requestId，日志无法串联 |
| **超时/重试无统一策略** | 每个 service 自己写超时和重试，行为不一致 |
| **企业级必备** | 微服务架构中，跨服务请求追踪是刚需 |

**设计原则**：
- 封装 Node.js 内置 `fetch`（Node 18+ 内置，零依赖）
- 自动注入 `X-Request-Id` 头（从 `requestContext` 获取）
- 自动记录出站请求日志
- 支持插件完全替换

---

## 1. 接口设计

### 1.1 `app.fetch`

```ts
// 挂载到 app 上，与 app.logger / app.throw 同级
interface VextApp {
  /** 内置 HTTP 客户端，自动传播 requestId + 结构化日志 */
  fetch: VextFetch
}
```

### 1.2 `VextFetch` 接口

```ts
type VextFetch = {
  /**
   * 发送 HTTP 请求（与原生 fetch 签名一致，但自动注入追踪头 + 日志）
   *
   * @param input  URL 字符串或 Request 对象
   * @param init   fetch 选项（headers、body、method 等）
   * @returns      标准 Response 对象
   */
  (input: string | URL | Request, init?: VextFetchInit): Promise<Response>

  /**
   * 创建带基础 URL 的客户端实例（适合调用固定服务）
   *
   * @example
   * const userApi = app.fetch.create({ baseURL: 'http://user-service:3000' })
   * const res = await userApi('/users/123')  // → GET http://user-service:3000/users/123
   */
  create(options: VextFetchClientOptions): VextFetch

  /**
   * 快捷方法
   */
  get(url: string, init?: VextFetchInit): Promise<Response>
  post(url: string, body?: unknown, init?: VextFetchInit): Promise<Response>
  put(url: string, body?: unknown, init?: VextFetchInit): Promise<Response>
  patch(url: string, body?: unknown, init?: VextFetchInit): Promise<Response>
  delete(url: string, init?: VextFetchInit): Promise<Response>
}
```

### 1.3 配置接口

```ts
interface VextFetchInit extends RequestInit {
  /** 请求超时（毫秒），默认使用全局配置 config.fetch.timeout */
  timeout?: number

  /** 重试次数（仅对幂等方法 GET/HEAD/OPTIONS/PUT/DELETE 生效），默认 0 */
  retry?: number

  /** 重试间隔（毫秒），默认 1000，支持指数退避 */
  retryDelay?: number | ((attempt: number) => number)

  /**
   * 是否自动注入 requestId 头
   * 默认 true；设为 false 可禁用（如调用不支持此头的外部 API）
   */
  propagateRequestId?: boolean

  /**
   * 自定义传播头（除 requestId 外还要传播的请求头）
   * 例如 ['x-trace-id', 'x-tenant-id']
   */
  propagateHeaders?: string[]
}

interface VextFetchClientOptions {
  /** 基础 URL，所有请求自动拼接 */
  baseURL: string

  /** 默认请求头 */
  headers?: Record<string, string>

  /** 默认超时 */
  timeout?: number

  /** 默认重试 */
  retry?: number

  /** 拦截器 */
  interceptors?: {
    request?: (init: VextFetchInit) => VextFetchInit | Promise<VextFetchInit>
    response?: (response: Response) => Response | Promise<Response>
  }
}
```

---

## 2. 核心实现

```ts
// vextjs/lib/fetch.ts

import { requestContext } from './request-context'

export function createVextFetch(app: VextApp): VextFetch {
  const config = app.config.fetch ?? {}
  const defaultTimeout = config.timeout ?? 10_000
  const requestIdHeader = app.config.requestId?.header ?? 'x-request-id'

  async function vextFetch(
    input: string | URL | Request,
    init?: VextFetchInit,
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    const method = init?.method?.toUpperCase() ?? 'GET'
    const timeout = init?.timeout ?? defaultTimeout
    const propagate = init?.propagateRequestId !== false

    // ── 1. 注入追踪头 ─────────────────────────────────────
    const headers = new Headers(init?.headers)

    if (propagate) {
      const store = requestContext.getStore()
      if (store?.requestId && !headers.has(requestIdHeader)) {
        headers.set(requestIdHeader, store.requestId)
      }

      // 传播自定义头
      const extraHeaders = init?.propagateHeaders ?? config.propagateHeaders ?? []
      for (const h of extraHeaders) {
        const val = store?.[h]
        if (val && !headers.has(h)) {
          headers.set(h, val)
        }
      }
    }

    // ── 2. 超时控制 ────────────────────────────────────────
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const signal = init?.signal
      ? anySignal([init.signal, controller.signal])  // 合并用户 signal 和超时 signal
      : controller.signal

    const startTime = performance.now()

    try {
      // ── 3. 发送请求 ──────────────────────────────────────
      const response = await fetch(input, {
        ...init,
        headers,
        signal,
      })

      const duration = Math.round(performance.now() - startTime)

      // ── 4. 日志记录 ──────────────────────────────────────
      const level = response.ok ? 'debug' : response.status >= 500 ? 'error' : 'warn'
      app.logger[level](`→ ${method} ${url} ${response.status} ${duration}ms`, {
        type: 'outbound',
        method,
        url,
        status: response.status,
        duration,
        requestId: requestContext.getStore()?.requestId,
      })

      return response
    } catch (err: any) {
      const duration = Math.round(performance.now() - startTime)

      if (err.name === 'AbortError') {
        app.logger.error(`→ ${method} ${url} TIMEOUT ${duration}ms (limit: ${timeout}ms)`, {
          type: 'outbound',
          method,
          url,
          error: 'timeout',
          duration,
          requestId: requestContext.getStore()?.requestId,
        })
        throw new Error(`[app.fetch] ${method} ${url} timed out after ${timeout}ms`)
      }

      app.logger.error(`→ ${method} ${url} ERROR ${duration}ms: ${err.message}`, {
        type: 'outbound',
        method,
        url,
        error: err.message,
        duration,
        requestId: requestContext.getStore()?.requestId,
      })
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  // ── 快捷方法 ──────────────────────────────────────────
  vextFetch.get = (url: string, init?: VextFetchInit) =>
    vextFetch(url, { ...init, method: 'GET' })

  vextFetch.post = (url: string, body?: unknown, init?: VextFetchInit) =>
    vextFetch(url, {
      ...init,
      method: 'POST',
      body: body != null ? JSON.stringify(body) : undefined,
      headers: { 'content-type': 'application/json', ...init?.headers },
    })

  vextFetch.put = (url: string, body?: unknown, init?: VextFetchInit) =>
    vextFetch(url, {
      ...init,
      method: 'PUT',
      body: body != null ? JSON.stringify(body) : undefined,
      headers: { 'content-type': 'application/json', ...init?.headers },
    })

  vextFetch.patch = (url: string, body?: unknown, init?: VextFetchInit) =>
    vextFetch(url, {
      ...init,
      method: 'PATCH',
      body: body != null ? JSON.stringify(body) : undefined,
      headers: { 'content-type': 'application/json', ...init?.headers },
    })

  vextFetch.delete = (url: string, init?: VextFetchInit) =>
    vextFetch(url, { ...init, method: 'DELETE' })

  // ── create 工厂 ───────────────────────────────────────
  vextFetch.create = (options: VextFetchClientOptions): VextFetch => {
    const childFetch: any = (input: string | URL | Request, init?: VextFetchInit) => {
      const url = typeof input === 'string'
        ? `${options.baseURL.replace(/\/$/, '')}${input.startsWith('/') ? '' : '/'}${input}`
        : input
      return vextFetch(url, {
        timeout: options.timeout,
        ...init,
        headers: { ...options.headers, ...init?.headers },
      })
    }

    // 复制快捷方法到子实例
    childFetch.get = (url: string, init?: VextFetchInit) =>
      childFetch(url, { ...init, method: 'GET' })
    childFetch.post = (url: string, body?: unknown, init?: VextFetchInit) =>
      childFetch(url, {
        ...init, method: 'POST',
        body: body != null ? JSON.stringify(body) : undefined,
        headers: { 'content-type': 'application/json', ...init?.headers },
      })
    childFetch.put = (url: string, body?: unknown, init?: VextFetchInit) =>
      childFetch(url, {
        ...init, method: 'PUT',
        body: body != null ? JSON.stringify(body) : undefined,
        headers: { 'content-type': 'application/json', ...init?.headers },
      })
    childFetch.patch = (url: string, body?: unknown, init?: VextFetchInit) =>
      childFetch(url, {
        ...init, method: 'PATCH',
        body: body != null ? JSON.stringify(body) : undefined,
        headers: { 'content-type': 'application/json', ...init?.headers },
      })
    childFetch.delete = (url: string, init?: VextFetchInit) =>
      childFetch(url, { ...init, method: 'DELETE' })
    childFetch.create = vextFetch.create

    return childFetch as VextFetch
  }

  return vextFetch as VextFetch
}
```

---

## 3. 配置项

在 `config/default.ts` 中配置：

```ts
export default {
  // ── HTTP 客户端 ──────────────────────────────────────
  fetch: {
    timeout:          10_000,     // 默认超时（毫秒）
    retry:            0,          // 默认重试次数（仅幂等方法）
    retryDelay:       1000,       // 默认重试间隔（毫秒）
    propagateHeaders: [],         // 除 requestId 外还需传播的自定义头
  },
}
```

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fetch.timeout` | `number` | `10000` | 全局默认请求超时（毫秒） |
| `fetch.retry` | `number` | `0` | 默认重试次数（仅幂等方法 GET/HEAD/OPTIONS/PUT/DELETE） |
| `fetch.retryDelay` | `number` | `1000` | 默认重试间隔（毫秒） |
| `fetch.propagateHeaders` | `string[]` | `[]` | 除 `x-request-id` 外还需自动传播的请求头 |

> **超时配置优先级**：单次请求 `init.timeout` > `create()` 的 `options.timeout` > `config.fetch.timeout`

---

## 4. 使用示例

### 4.1 基本用法

```ts
// src/services/payment.ts
export default class PaymentService {
  constructor(private app: VextApp) {}

  async charge(userId: string, amount: number) {
    // app.fetch 自动传播当前请求的 x-request-id
    const res = await this.app.fetch.post('http://payment-service:3000/charges', {
      userId,
      amount,
    })

    if (!res.ok) {
      const error = await res.json()
      this.app.throw(502, `Payment failed: ${error.message}`)
    }

    return res.json()
  }
}
```

日志自动输出：
```
[DEBUG] → POST http://payment-service:3000/charges 200 45ms  requestId=abc-123  type=outbound
```

### 4.2 创建专用客户端

```ts
// src/services/user-api.ts
export default class UserApiService {
  private client: VextFetch

  constructor(private app: VextApp) {
    // 为固定服务创建专用客户端
    this.client = app.fetch.create({
      baseURL: 'http://user-service:3000/api/v1',
      timeout: 5000,
      headers: {
        'x-service-name': 'order-service',
      },
    })
  }

  async getUser(id: string) {
    const res = await this.client.get(`/users/${id}`)
    if (!res.ok) this.app.throw(502, 'User service unavailable')
    return res.json()
  }

  async listUsers(page: number) {
    const res = await this.client.get(`/users?page=${page}`)
    return res.json()
  }
}
```

### 4.3 重试 + 自定义超时

```ts
// 对外部 API 的不稳定调用
const res = await app.fetch.get('https://api.external.com/data', {
  timeout: 30_000,       // 外部 API 超时设长一点
  retry: 3,              // 失败重试 3 次
  retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),  // 指数退避
})
```

### 4.4 禁用 requestId 传播

```ts
// 调用第三方 API 时不传播内部 requestId
const res = await app.fetch.get('https://api.stripe.com/v1/charges', {
  propagateRequestId: false,
  headers: {
    'Authorization': `Bearer ${stripeKey}`,
  },
})
```

---

## 5. 插件替换

`app.fetch` 支持通过 `app.setFetch()` 替换（与 `app.setThrow()` 模式一致）：

```ts
// src/plugins/axios-fetch.ts
import { definePlugin } from 'vextjs'
import axios from 'axios'

export default definePlugin({
  name: 'axios-fetch',
  async setup(app) {
    // 替换 app.fetch 为 axios 实现
    app.setFetch(createAxiosFetch(app, axios))
  },
})
```

> **替换约定**：自定义实现必须满足 `VextFetch` 接口，包括自动传播 requestId 和日志记录。

---

## 6. 与现有模块的关系

| 模块 | 关系 |
|------|------|
| `requestContext` (AsyncLocalStorage) | `app.fetch` 从中读取 `requestId`、`locale` 等 |
| `app.logger` | `app.fetch` 通过它记录出站请求日志 |
| `config.requestId.header` | `app.fetch` 读取此配置决定传播哪个头 |
| `config.fetch` | `app.fetch` 读取全局默认超时/重试配置 |
| Hot Reload | `app.fetch` 挂载在 `app` 上，Soft Reload 不影响（app 保持不变） |
| Cluster | 每个 Worker 有独立的 `app.fetch`，无进程间状态 |

---

## 7. 与 `req.requestId` 的完整追踪链路

```
外部请求进入
  │
  ▼
[入站] Gateway → Vext Server
  │  请求头: X-Request-Id: gateway-req-001
  │
  ▼
requestId 中间件:
  req.requestId = headers['x-request-id'] || generate()
  → req.requestId = 'gateway-req-001'
  → requestContext.run({ requestId: 'gateway-req-001', ... })
  │
  ▼
handler 内调用 app.fetch:
  app.fetch.post('http://payment-service:3000/charges', { ... })
  │  自动注入: X-Request-Id: gateway-req-001  ← 从 requestContext 读取
  │
  ▼
[出站] Vext Server → Payment Service
  │  请求头: X-Request-Id: gateway-req-001
  │
  ▼
Payment Service 收到请求:
  req.requestId = 'gateway-req-001'  ← 同一个 ID，链路串联
  │
  ▼
日志串联:
  [Vext]    [gateway-req-001] GET /orders/123 → handler started
  [Vext]    [gateway-req-001] → POST http://payment:3000/charges 200 45ms
  [Payment] [gateway-req-001] POST /charges → charge success
```

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|-------|---------|------|
| `VextFetch` | `vextjs/lib/fetch.ts` | HTTP 客户端接口 |
| `VextFetchInit` | `vextjs/lib/fetch.ts` | 扩展的 RequestInit（timeout / retry / propagateRequestId） |
| `VextFetchClientOptions` | `vextjs/lib/fetch.ts` | `app.fetch.create()` 选项 |

