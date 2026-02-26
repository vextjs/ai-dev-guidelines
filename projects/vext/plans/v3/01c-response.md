# 01c - 响应规范（req / res / 统一响应格式）

> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-28 P1 修复）
> **状态**: ✅ 已确认（问题 A → A1：`{ code: 0, data: ... }` 出口包装）
> **所属模块**: 路由层 → `01-routes.md`

---

## 1. 统一响应格式（已确认：A1）

**所有 HTTP 响应**由框架出口中间件统一包装，用户在 handler 中只关心业务数据：

### 1.1 成功响应

```json
HTTP 200 OK

{
  "code": 0,
  "data": { ... },
  "requestId": "a1b2c3d4-e5f6-..."
}
```

### 1.2 错误响应

```json
HTTP 404 Not Found

{
  "code": 404,
  "message": "Not Found",
  "requestId": "a1b2c3d4-e5f6-..."
}
```

```json
HTTP 422 Unprocessable Entity

{
  "code": 422,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "邮箱格式不正确" }
  ],
  "requestId": "a1b2c3d4-e5f6-..."
}
```

```json
HTTP 500 Internal Server Error

{
  "code": 500,
  "message": "Internal Server Error",
  "requestId": "a1b2c3d4-e5f6-..."
}
```

### 1.3 包装规则

| 场景 | HTTP 状态码 | 响应体 |
|------|-----------|-------|
| `res.json(data)` | 200 | `{ code: 0, data, requestId }` |
| `res.json(data, 201)` | 201 | `{ code: 0, data, requestId }` |
| `res.json(null)` | 200 | `{ code: 0, data: null, requestId }` |
| `res.status(204).json(null)` | 204 | 无 body |
| `app.throw(404, 'Not found')` | 404 | `{ code: 404, message, requestId }` |
| `throw new VextValidationError(errors)` | 422 | `{ code: 422, message, errors, requestId }` |
| 未捕获的 `Error` | 500 | `{ code: 500, message, requestId }` |

**`null` / `204` 使用规范**：

| 场景 | 推荐写法 | 原因 |
|------|---------|------|
| 删除成功，无返回数据 | `res.status(204).json(null)` | 语义明确，客户端无需解析 body |
| 查询结果为空（非错误） | `res.json(null)` 或 `res.json([])` | `null` = 单个资源不存在但合法，`[]` = 列表为空 |
| 操作成功但无数据 | `res.json({ success: true })` | 避免客户端歧义 |

> `requestId` 由框架**自动注入**到所有响应体，用户无需手动处理。

---

## 2. handler 写法（出口包装透明）

用户在 handler 中**直接传业务数据**，无需手动包 `{ code: 0, data: ... }`：

```typescript
// ✅ 正确写法：只传业务数据
async (req, res) => {
  const data = await app.services.user.findAll(query)
  res.json({ users: data.list, total: data.total })
  // 框架自动包装为：{ code: 0, data: { users: [...], total: 100 } }
}

// ✅ 201 Created
async (req, res) => {
  const data = await app.services.user.create(body)
  res.json(data, 201)
  // 框架自动包装为：{ code: 0, data: { id: 1, name: '...' } }，HTTP 201
}

// ✅ 204 No Content（删除等操作）
async (req, res) => {
  await app.services.user.remove(id)
  res.status(204).json(null)
  // HTTP 204，无响应体
}

// ❌ 错误写法：不要手动包装
async (req, res) => {
  res.json({ code: 0, data: users })  // 会变成 { code: 0, data: { code: 0, data: [...] } }
}
```

---

## 3. VextRequest 接口

```typescript
interface VextRequest {
  // ── 原始数据 ──────────────────────────────────────────────
  query:   Record<string, string>
  body:    unknown
  params:  Record<string, string>
  headers: Record<string, string>

  method:   string                  // HTTP 方法（大写，如 'GET'）
  url:      string                  // 完整 URL
  path:     string                  // 路径部分（不含 query string）

  // ── 请求元信息 ────────────────────────────────────────────
  /**
   * 当前请求所属的 app 实例
   *
   * **设计说明**：路由 handler 通过 defineRoutes(app => ...) 闭包访问 app，
   * 不需要 req.app。但路由级中间件没有闭包，必须通过 req.app 访问
   * throw/logger 等能力。选择挂在 req.app 而非 req.throw/req.logger，
   * 是为了保持 VextRequest 接口职责清晰——业务扩展字段（req.user 等）
   * 和框架核心能力（app）通过命名空间隔离。
   */
  app: VextApp

  /**
   * 请求唯一标识
   * - 默认：从 x-request-id 请求头透传，不存在则框架自动生成 UUID v4
   * - 可选：插件通过覆盖 config.requestId.generate 替换生成算法
   * - 配置：config.requestId（见 05-config.md §3.5）
   */
  requestId: string

  /**
   * 客户端 IP（trustProxy=true 时从 X-Forwarded-For 读取）
   */
  ip: string

  /**
   * 请求协议（trustProxy=true 时从 X-Forwarded-Proto 读取）
   */
  protocol: 'http' | 'https'

  /**
   * 注册请求关闭钩子（连接断开时触发）
   * 主要用于 SSE / WebSocket：客户端断开时清理资源
   * **内存安全**：框架在 hooks 执行完毕后自动清空 hooks 数组，
   * 无需手动移除，不会因闭包引用造成内存泄漏
   * @example req.onClose(() => sseStream.close())
   */
  onClose(handler: () => void): void

  // ── 校验后数据 ────────────────────────────────────────────
  /**
   * 获取经过 validate 校验并类型转换后的数据
   * - 必须在 options.validate 配置了对应位置后调用
   * - 未配置对应位置时返回 undefined
   * - schema-dsl 会自动做类型转换（如 query 中的数字字符串 → number）
   */
  valid<T = unknown>(location: 'query' | 'body' | 'param' | 'header'): T

  // ── 中间件 / 插件扩展字段（通过 declare module 扩展类型）──

  // ── 文件上传（⏳ 待开发）──────────────────────────────────
  /**
   * **内存安全**：框架对文件上传采用流式处理（pipe 到存储驱动），
   * 不将文件内容全量读入内存 Buffer，大文件不会导致 OOM
   */
  // files?: UploadedFile[]   ← 文件上传中间件注入（流引用，非 Buffer）

  // ── 国际化（⏳ 待开发，需 vextjs-plugin-i18n）────────────
  /**
   * 翻译函数（i18n 插件注入）
   * @example req.t('user.not_found')        // → '用户不存在'
   * @example req.t('welcome', { name: 'Alice' })  // → '欢迎, Alice'
   */
  t?: (key: string, params?: Record<string, unknown>) => string

  [key: string]: unknown
}
```

### VextRequest 类型扩展

中间件或插件可以直接往 `req` 上挂载自定义字段，通过 `declare module` 让 TypeScript 识别：

```typescript
// src/middlewares/auth.ts
import type { VextMiddleware } from 'vextjs'

// 扩展 VextRequest，让 req.user 有类型
declare module 'vextjs' {
  interface VextRequest {
    user?: { id: string; role: string }
  }
}

export default (async (req, _res, next) => {
  const token = req.headers['authorization']
  if (!token) req.app.throw(401, 'Unauthorized')
  req.user = verifyToken(token)
  next()
}) satisfies VextMiddleware
```

```typescript
// 后续 handler 里直接读 req.user，有完整类型提示
app.get('/', { middlewares: ['auth'] }, async (req, res) => {
  const userId = req.user?.id   // ← string | undefined，类型安全
  res.json(await app.services.user.findById(userId!))
})
```

**使用示例**：

```typescript
const query = req.valid<{ page: number; limit: number }>('query')
const body  = req.valid<{ name: string; email: string }>('body')
const param = req.valid<{ id: string }>('param')
```

---

## 4. VextResponse 接口

```typescript
interface VextResponse {
  /**
   * 返回 JSON 响应（经出口包装 → { code: 0, data, requestId }）
   * @param data   业务数据，直接传，框架自动包装
   * @param status HTTP 状态码（默认 200）
   */
  json(data: unknown, status?: number): void

  /**
   * 返回原始 JSON（不经过出口包装）
   * 仅框架内部错误处理使用，用户代码不应直接调用
   */
  rawJson(data: unknown, status?: number): void

  /**
   * 返回纯文本（不经过出口包装）
   */
  text(content: string, status?: number): void

  /**
   * 流式响应（大文件传输、实时数据流）
   * @param readable Node.js Readable stream
   * @param contentType 默认 'application/octet-stream'
   */
  stream(readable: NodeJS.ReadableStream, contentType?: string): void

  /**
   * 文件下载（触发浏览器下载行为）
   * @param readable 文件流
   * @param filename 下载文件名（浏览器显示）
   * @param contentType MIME 类型，默认根据 filename 扩展名推断
   */
  download(readable: NodeJS.ReadableStream, filename: string, contentType?: string): void

  /**
   * 重定向
   */
  redirect(url: string, status?: 301 | 302 | 307 | 308): void

  /**
   * 设置 HTTP 状态码（链式调用）
   */
  status(code: number): this

  /**
   * 设置响应头（链式调用）
   */
  setHeader(name: string, value: string): this

  // ── 实时通信（⏳ 待开发，需安装对应插件）────────────────
  /**
   * 将当前请求升级为 SSE 连接（Server-Sent Events）
   * 需安装 vextjs-plugin-sse 插件
   * @example
   * app.get('/events', {}, async (req, res) => {
   *   const stream = res.sse()
   *   stream.send({ data: 'hello' })
   *   req.onClose(() => stream.close())
   * })
   */
  sse?(): SseStream   // 插件注入，可选

  /**
   * 将当前请求升级为 WebSocket 连接
   * 需安装 vextjs-plugin-ws 插件
   */
  upgrade?(): WebSocket   // 插件注入，可选
}
```

---

## 5. 出口包装中间件内部实现

```typescript
// vextjs/lib/response-wrapper.ts（框架内部，用户不感知）
import type { VextMiddleware } from './adapter'

export const responseWrapperMiddleware: VextMiddleware = async (req, res, next) => {
  const originalJson = res.json.bind(res)

  res.json = (data: unknown, status = 200) => {
    // 只有显式传 204 才无 body（如 res.status(204).json(null)）
    if (status === 204) {
      return originalJson(null, 204)
    }
    // res.json(null) → { code: 0, data: null, requestId }（合法的空结果）
    return originalJson({ code: 0, data, requestId: req.requestId }, status)
  }

  next()
}
```

**错误响应**由全局错误处理中间件统一格式化（绕过出口包装）：

```typescript
// vextjs/lib/error-handler.ts（框架内部）
//
// ⚠️ 使用工厂函数模式，通过闭包持有 config 引用。
// 不能直接写为 (err, req, res) => { ... } 然后引用外部 app，
// 因为错误处理函数作为独立模块导出，作用域中没有 app 变量。
// 另一种方式是通过 req.app.config 访问，但工厂模式更清晰。
//
export function createErrorHandler(config: VextConfig): VextErrorMiddleware {
  const hideInternalErrors = config.response?.hideInternalErrors ?? true

  return (err, req, res) => {
    const requestId = req.requestId

    if (err instanceof VextValidationError) {
      return res.status(422).rawJson({
        code:      422,
        message:   'Validation failed',
        errors:    err.errors,
        requestId,
      })
    }

    if (err instanceof HttpError) {
      // 业务错误码优先级：err.code（业务码）> err.status（HTTP 状态码）
      // 见 06b-error.md §1.4 — app.throw(400, '邮箱已注册', 10001) → code: 10001
      return res.status(err.status).rawJson({
        code:      err.code ?? err.status,
        message:   err.message,
        requestId,
      })
    }

    // 未知错误 — 生产环境隐藏内部细节（由 config.response.hideInternalErrors 控制）
    return res.status(500).rawJson({
      code:      500,
      message:   'Internal Server Error',
      requestId,
      ...(!hideInternalErrors && { stack: (err as Error).stack }),
    })
  }
}
```

> **设计说明**：`createErrorHandler` 是工厂函数，bootstrap 时调用一次 `createErrorHandler(config)` 获得闭包实例。
> 之前的写法 `const globalErrorHandler = (err, req, res) => { ... }` 直接引用了作用域外不存在的 `app` 变量，
> 会导致运行时 ReferenceError。工厂模式通过闭包持有 `config` 引用，解决了作用域问题。
>
> bootstrap 中的注册方式：
> ```typescript
> app.adapter.registerErrorHandler(createErrorHandler(config))
> ```

> `res.rawJson()` 是框架内部方法，绕过出口包装直接发送，仅供错误处理使用，用户不可访问。

---

## 6. 底层适配

`VextRequest` / `VextResponse` 由各 adapter 负责转换。当前使用 Hono Adapter，将 `HonoContext` 转换为 vext 的标准接口。

切换 adapter（如后续支持 Fastify）时，路由层代码**无需任何改动**。