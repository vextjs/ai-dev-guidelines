# 08b - Native Adapter 详细设计

> **版本**: v1.0
> **创建日期**: 2026-03-04
> **最后更新**: 2026-03-04
> **前置文档**: [08-adapter.md](./08-adapter.md)（VextAdapter 接口定义）、[08a-fastify-adapter.md](./08a-fastify-adapter.md)（Fastify Adapter 参考实现）
> **关联报告**: `reports/requirements/zed-copilot/20260304/07-req-native-adapter.md`

---

## 0. 概述

Native Adapter 是 vext 的第五个 adapter 实现（Hono → Fastify → Express → Koa → **Native**），
也是唯一不依赖任何第三方 HTTP 框架的实现。

基于 Node.js 原生 `http.createServer` + `find-my-way`（radix trie 路由库），
跳过所有第三方框架的初始化、对象包装、中间件管道等开销，
直接操作 `IncomingMessage` / `ServerResponse`，是 vext 的**最高性能适配器选项**。

### 为什么需要 Native Adapter

| 问题 | 说明 |
|------|------|
| Fastify / Express / Koa 均有框架自身开销 | 框架的 request/reply 对象包装、lifecycle hooks、plugin 系统、content-type parser 管道等 |
| vext 已有自己的中间件执行器 | `executeChain`（洋葱模型）完全由 vext 控制，第三方框架的中间件系统是冗余的 |
| 性能瓶颈在框架转换层 | 深度分析显示 vext overhead 的 30-50% 来自第三方框架的对象构造和转换 |
| 用户代码零改动 | VextAdapter 接口抽象保证切换 adapter 只需改 `config.adapter`，无需修改路由/中间件/插件代码 |

### 核心原则

1. **完整实现 VextAdapter 接口** — 全部 6 个方法 + `name` 属性 + `buildHandler` 协议
2. **用户代码零改动** — 切换 adapter 只需改 `config.adapter = 'native'`
3. **VextRequest / VextResponse 字段完整映射** — 与其他 4 个 adapter 行为一致
4. **最短调用路径** — 每个环节追求最少的中间对象分配和函数调用
5. **零第三方 HTTP 框架** — 唯一依赖是 `find-my-way`（纯路由匹配库，非 HTTP 框架）

---

## 1. 依赖与包结构

### 1.1 依赖

| 包 | 版本 | 用途 | 说明 |
|----|------|------|------|
| `find-my-way` | `^9.5.0` | radix trie 路由匹配 | Fastify 内部使用的同一库，O(path_length) 匹配，生产验证 |
| `node:http` | Node.js 内置 | HTTP 服务器 | `createServer` + `IncomingMessage` + `ServerResponse` |

> **为什么选 find-my-way？**
> - Fastify 内部使用的同一路由库，已在大规模生产环境验证
> - Radix trie 算法，路由匹配复杂度 O(path_length)，与路由数量无关
> - 支持参数路由（`:param`）、通配符（`*`）、store 机制
> - 无 HTTP 框架耦合，纯路由匹配功能

### 1.2 文件位置

```
src/adapters/native/
├── adapter.ts     # 核心 — createNativeAdapter() + handleRequest + executeChain
├── request.ts     # IncomingMessage → VextRequest 转换
├── response.ts    # ServerResponse → VextResponse 转换
└── index.ts       # 导出入口 + nativeAdapter() 工厂函数
```

### 1.3 package.json 配置

```jsonc
// vext/package.json 相关字段
{
  "dependencies": {
    "find-my-way": "^9.5.0"
  },
  "exports": {
    "./adapters/native": {
      "types": "./dist/adapters/native/index.d.ts",
      "import": "./dist/adapters/native/index.js",
      "require": "./dist/adapters/native/index.cjs"
    }
  }
}
```

---

## 2. 工厂函数

### 2.1 NativeAdapterOptions 接口

```typescript
export interface NativeAdapterOptions {
  /**
   * 忽略尾部斜杠（默认 true）
   * /users 和 /users/ 视为相同路由
   */
  ignoreTrailingSlash?: boolean;

  /**
   * 大小写敏感（默认 false）
   * /Users 和 /users 视为相同路由
   */
  caseSensitive?: boolean;

  /**
   * 最大参数长度（默认 500）
   * 路由参数（如 :id）的最大字符数
   */
  maxParamLength?: number;
}
```

### 2.2 nativeAdapter() 工厂函数

```typescript
/**
 * nativeAdapter — 创建 Native 适配器工厂函数
 *
 * 返回一个「延迟工厂」函数，该函数在 adapter-resolver 调用时
 * 接收 VextApp 实例并创建完整的 VextAdapter。
 *
 * 两阶段初始化设计与 adapter-resolver 工作方式对齐：
 *   1. 用户调用 nativeAdapter(options) → 返回工厂函数（捕获 options）
 *   2. adapter-resolver 调用 factory(app) → 返回 VextAdapter 实例
 */
export function nativeAdapter(
  options?: NativeAdapterOptions,
): (app: VextApp) => VextAdapter {
  const opts = options ?? {};
  return (app: VextApp): VextAdapter => {
    return createNativeAdapter(opts, app);
  };
}
```

---

## 3. Adapter 核心实现

### 3.1 架构概览

```
http.createServer(handleRequest)
         ↓
handleRequest(nodeReq, nodeRes)
         ↓
    find-my-way router.find(method, pathname)
         ↓ 匹配成功                    ↓ 匹配失败
    store.chain (预组装中间件链)     handleNotFound()
         ↓                              ↓
    createVextRequest(nodeReq)      createVextRequest(nodeReq)
    createVextResponse(nodeRes)     createVextResponse(nodeRes)
         ↓                              ↓ 内联 requestId
    requestContext.run({...}, () => {  requestContext.run({...}, () => {
        executeChain(chain, req, res)    notFoundHandler(req, res, noop)
    })                              })
         ↓ catch
    errorHandler(err, req, res)
         ↓ errorHandler 也失败
    sendFallbackError(nodeRes) → 500 JSON
```

### 3.2 createNativeAdapter() 实现

```typescript
export function createNativeAdapter(
  options: NativeAdapterOptions,
  app: VextApp,
): VextAdapter {
  // ── 创建 find-my-way 路由器 ──────────────────────
  const router = Router({
    ignoreTrailingSlash: options.ignoreTrailingSlash ?? true,
    caseSensitive: options.caseSensitive ?? false,
    maxParamLength: options.maxParamLength ?? 500,
  });

  // ── 全局状态 ─────────────────────────────────────
  const globalMiddlewares: VextMiddleware[] = [];
  let errorHandler: VextErrorMiddleware | null = null;
  let notFoundHandler: VextMiddleware | null = null;

  // ... handleRequest / handleNotFound / sendFallbackError 内部函数

  return {
    name: 'native',
    registerMiddleware(mw)   { globalMiddlewares.push(mw); },
    registerRoute(method, path, chain) { /* find-my-way on() + store */ },
    registerErrorHandler(h)  { errorHandler = h; },
    registerNotFound(h)      { notFoundHandler = h; },
    listen(port, host)       { /* http.createServer + server.listen */ },
    buildHandler()           { return handleRequest; },
  };
}
```

### 3.3 handleRequest — 请求处理核心

```typescript
function handleRequest(nodeReq: IncomingMessage, nodeRes: ServerResponse): void {
  // 1. 提取路径（indexOf('?') 比 new URL() 更轻量）
  const url = nodeReq.url ?? '/';
  const qIdx = url.indexOf('?');
  const pathname = qIdx === -1 ? url : url.slice(0, qIdx);

  // 2. 路由匹配（find-my-way find() 返回 handler + params + store）
  const found = router.find(nodeReq.method as HTTPMethod, pathname);

  if (!found) {
    handleNotFound(nodeReq, nodeRes);
    return;
  }

  // 3. 从 store 获取预组装的中间件链
  const store = found.store as RouteStore;
  if (store.chain === null) {
    store.chain = globalMiddlewares.concat(store.routeChain);
  }

  // 4. 构造 VextRequest / VextResponse
  const req = createVextRequest(nodeReq, app, found.params);
  const res = createVextResponse(nodeRes, () => req.requestId);

  // 5. 在 AsyncLocalStorage 请求上下文中执行
  requestContext.run({ requestId: '', locale: undefined }, async () => {
    try {
      await executeChain(store.chain!, req, res);
    } catch (err) {
      // ... errorHandler + sendFallbackError 兜底
    }
  });
}
```

### 3.4 executeChain — 中间件洋葱模型执行器

```typescript
async function executeChain(
  chain: VextMiddleware[],
  req: VextRequest,
  res: VextResponse,
): Promise<void> {
  const len = chain.length;

  async function dispatch(i: number): Promise<void> {
    if (i >= len) return;
    const middleware = chain[i]!;
    await middleware(req, res, () => dispatch(i + 1));
  }

  await dispatch(0);
}
```

**性能优化点**：
- `len` 提前缓存，避免每次 `dispatch` 访问 `chain.length`
- 使用参数化递归 `dispatch(i)` 替代每请求闭包链创建
- 与其他 4 个 adapter 的 `executeChain` 逻辑完全一致

### 3.5 registerRoute — 路由注册

```typescript
registerRoute(method: string, path: string, chain: VextMiddleware[]): void {
  const store: RouteStore = {
    chain: null,      // 延迟组装（首次请求时与 globalMiddlewares 合并）
    routeChain: chain, // 路由级中间件链（registerRoute 传入）
  };

  router.on(
    method.toUpperCase() as HTTPMethod,
    path,
    (_req, _res, _params) => {}, // noop handler（实际处理在 handleRequest 中）
    store,
  );
}
```

**关键设计**：
- find-my-way 的 `store` 机制允许将自定义数据关联到路由
- 预组装中间件链在首次请求时完成（`globalMiddlewares.concat(routeChain)`），后续复用缓存
- 注册路由时 `globalMiddlewares` 可能尚未完成收集（bootstrap 步骤⑥在⑤之后），因此延迟组装

### 3.6 handleNotFound — 404 处理

```typescript
function handleNotFound(nodeReq: IncomingMessage, nodeRes: ServerResponse): void {
  if (!notFoundHandler) {
    // 默认 404 JSON 响应
    nodeRes.statusCode = 404;
    nodeRes.setHeader('Content-Type', 'application/json; charset=utf-8');
    nodeRes.end(JSON.stringify({ code: 404, message: 'Not Found' }));
    return;
  }

  const req = createVextRequest(nodeReq, app, {});
  const res = createVextResponse(nodeRes, () => req.requestId);

  // 内联生成 requestId（notFound 不走中间件链，requestId 中间件不会执行）
  if (!req.requestId) {
    const headerName = app.config.requestId?.header ?? 'x-request-id';
    req.requestId = (req.headers[headerName] as string) || crypto.randomUUID();
  }

  requestContext.run({ requestId: req.requestId, locale: undefined }, async () => {
    try {
      await notFoundHandler!(req, res, async () => {});
    } catch {
      sendFallbackError(nodeRes);
    }
  });
}
```

### 3.7 listen / buildHandler

```typescript
// listen — 启动 HTTP 服务器
async listen(port: number, host: string = '0.0.0.0'): Promise<VextServerHandle> {
  const server = createServer(handleRequest);

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      const addr = server.address();
      resolve({
        port: addr.port,
        host: addr.address,
        close(): Promise<void> {
          return new Promise((resolveClose, rejectClose) => {
            server.close((err) => err ? rejectClose(err) : resolveClose());
          });
        },
      });
    });
  });
},

// buildHandler — dev 模式热重载用
buildHandler(): (req: IncomingMessage, res: ServerResponse) => void {
  return handleRequest;
}
```

**与 Fastify Adapter 的差异**：
- Fastify: `buildHandler` 内部需要 `fastify.ready()` + `fastify.routing`
- Native: 直接返回 `handleRequest` 函数，无需 ready 阶段

---

## 4. 请求转换

### 4.1 createVextRequest

```typescript
export function createVextRequest(
  incoming: IncomingMessage,
  app: VextApp,
  params: Record<string, string>,
): VextRequest
```

#### VextRequest 字段映射

| VextRequest 字段 | Native Adapter 数据来源 | Fastify 数据来源 | 差异说明 |
|-----------------|----------------------|----------------|---------|
| `query` | `URLSearchParams` 懒解析 getter | Fastify 原生 `request.query` | Native 用 defineProperty getter + 缓存 |
| `body` | `undefined`（body-parser 后续填充） | `undefined`（同上） | 一致 |
| `params` | find-my-way `found.params` | Fastify `request.params` | 一致（find-my-way 是 Fastify 内部路由库） |
| `headers` | `incoming.headers` 直接引用 | Fastify `request.headers` | Native 零拷贝 |
| `method` | `incoming.method.toUpperCase()` | `request.method` | 一致 |
| `url` | `incoming.url` | `request.url` | 一致 |
| `path` | `indexOf('?')` 手动分割 | Fastify 无直接 `.path`，需手动 | 一致（都需手动提取） |
| `app` | 闭包传入 | 闭包传入 | 一致 |
| `requestId` | `''`（中间件填充） | `''`（同上） | 一致 |
| `ip` | `socket.remoteAddress` 或 XFF | Fastify `request.ip` | Fastify 内置 trustProxy 支持 |
| `protocol` | `socket.encrypted` 或 XFP | Fastify `request.protocol` | 一致逻辑 |
| `onClose` | `incoming.on('close')` | `request.raw.on('close')` | 一致（都走 Node.js close 事件） |
| `valid` | `_validated_<location>` | 同上 | 一致 |
| `_getRawBody` | `incoming.on('data')` 流式 | Fastify content-type parser → Buffer | Native 直接读流，更轻量 |

#### query 懒解析 getter

```typescript
// 使用 Object.defineProperty getter + 缓存
let _queryCache: Record<string, string> | undefined;

function getQuery(): Record<string, string> {
  if (_queryCache !== undefined) return _queryCache;

  if (!rawQueryString) {
    _queryCache = {};
    return _queryCache;
  }

  const searchParams = new URLSearchParams(rawQueryString);
  const result: Record<string, string> = {};
  for (const [key, value] of searchParams) {
    result[key] = value;
  }
  _queryCache = result;
  return _queryCache;
}

Object.defineProperty(req, 'query', {
  get: getQuery,
  configurable: true,
  enumerable: true,
});
```

**优化效果**：GET /json 等无 query 场景完全零开销，不触发 URLSearchParams 解析。

#### _getRawBody 实现

```typescript
let _rawBodyPromise: Promise<string> | undefined;

function getRawBody(): Promise<string> {
  if (_rawBodyPromise !== undefined) return _rawBodyPromise;

  _rawBodyPromise = new Promise<string>((resolve, reject) => {
    // GET/HEAD/OPTIONS 快速返回
    const method = incoming.method?.toUpperCase();
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
      resolve('');
      return;
    }

    const chunks: Buffer[] = [];
    incoming.on('data', (chunk: Buffer) => chunks.push(chunk));
    incoming.on('end', () => {
      resolve(chunks.length === 0 ? '' : Buffer.concat(chunks).toString('utf-8'));
    });
    incoming.on('error', reject);
  });

  return _rawBodyPromise;
}
```

#### IP / Protocol 解析

```typescript
// trustProxy = true → X-Forwarded-For / X-Forwarded-Proto
// trustProxy = false → socket.remoteAddress / socket.encrypted

let ip: string;
if (trustProxy) {
  const xff = incoming.headers['x-forwarded-for'];
  // 取第一个 IP（最左边是原始客户端）
  ip = parseFirstIp(xff) ?? incoming.socket.remoteAddress ?? '127.0.0.1';
} else {
  ip = incoming.socket.remoteAddress ?? '127.0.0.1';
}

let protocol: 'http' | 'https';
if (trustProxy) {
  protocol = incoming.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
} else {
  protocol = (incoming.socket as any)?.encrypted ? 'https' : 'http';
}
```

### 4.2 接口完备性验证清单

```yaml
VextRequest 字段完备性:
  query:      ✅ 可映射（URLSearchParams 懒解析 getter + 缓存）
  body:       ✅ 由 body-parser 中间件填充（不依赖 adapter）
  params:     ✅ 可映射（find-my-way found.params）
  headers:    ✅ 零拷贝引用 incoming.headers
  method:     ✅ 可映射（incoming.method.toUpperCase()）
  url:        ✅ 可映射（incoming.url）
  path:       ✅ indexOf('?') 手动分割
  app:        ✅ 闭包传入
  requestId:  ✅ 由 requestId 中间件填充
  ip:         ✅ socket.remoteAddress + trustProxy 支持
  protocol:   ✅ socket.encrypted + trustProxy 支持
  onClose:    ✅ incoming.on('close') + handlers 数组
  valid:      ✅ _validated_<location> 内部状态
  _getRawBody: ✅ incoming.on('data') 流式读取 + Promise 缓存
```

---

## 5. 响应转换

### 5.1 createVextResponse

```typescript
export function createVextResponse(
  serverResponse: ServerResponse,
  getRequestId: () => string,
): VextResponse
```

#### VextResponse 方法映射

| VextResponse 方法 | Native Adapter 实现 | Fastify 实现 | 差异 |
|------------------|-------------------|-------------|------|
| `json(data, status?)` | `serverResponse.end(JSON.stringify(...))` | `reply.send(JSON.stringify(...))` | Native 更直接 |
| `rawJson(data, status?)` | 同上（不经过 wrap） | 同上 | 一致 |
| `text(content, status?)` | `serverResponse.end(content)` | `reply.send(content)` | 一致 |
| `stream(readable, ct?)` | `readable.pipe(serverResponse)` | `reply.send(readable)` | 一致 |
| `download(readable, fn, ct?)` | pipe + Content-Disposition | 同上 | 一致 |
| `redirect(url, status?)` | `serverResponse.setHeader('Location')` | `reply.redirect()` | 一致效果 |
| `status(code)` | 内部 `_status` 变量 | 同上 | 一致 |
| `setHeader(name, value)` | 内部 `_headers` 缓冲 | 同上 | 一致 |
| `statusCode` (getter) | 读取 `_status` | 同上 | 一致 |
| `_enableWrap()` | 设置 `_wrapEnabled` 标志 | 同上 | 一致 |

### 5.2 核心设计

#### sendJsonString — 共用 JSON 发送方法

```typescript
function sendJsonString(body: string, status: number): void {
  serverResponse.statusCode = status;
  serverResponse.setHeader('Content-Type', 'application/json; charset=utf-8');
  applyHeaders();
  serverResponse.end(body);
}
```

所有 JSON 发送路径（`json` / `rawJson`）最终都走此方法，减少代码重复。

#### 204 No Content 合规（RFC 9110 §15.3.5）

```typescript
function send204(): void {
  serverResponse.statusCode = 204;
  serverResponse.removeHeader('Content-Type');
  applyHeaders();
  serverResponse.end(); // 无消息体
}
```

无论出口包装是否开启，204 响应一律不发送消息体。

#### 重复发送保护

```typescript
let _sent = false;

function checkSent(methodName: string): boolean {
  if (_sent) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[vextjs] ⚠️ res.${methodName}() called after response already sent.`);
    }
    return true; // 已发送，调用方应终止
  }
  _sent = true;
  return false;
}
```

#### 出口包装（_enableWrap）

```typescript
json(data: unknown, status?: number): void {
  if (checkSent('json')) return;

  const finalStatus = status ?? _status;

  if (_wrapEnabled) {
    if (finalStatus === 204) { send204(); return; }

    sendJsonString(JSON.stringify({
      code: 0,
      data,
      requestId: getRequestId(),
    }), finalStatus);
    return;
  }

  if (finalStatus === 204) { send204(); return; }
  sendJsonString(JSON.stringify(data), finalStatus);
}
```

### 5.3 时序保证

```
createVextResponse(serverResponse, () => req.requestId)
  ↓ executeChain 开始
[requestIdMiddleware]        → req.requestId = 'a1b2c3d4...'
[responseWrapperMiddleware]  → res._enableWrap()
  ↓
[handler] res.status(201).json(data)
  → _wrapEnabled = true
  → getRequestId() → 'a1b2c3d4...'（已设置）
  → serverResponse.end(JSON.stringify({ code: 0, data, requestId }))
  → HTTP 201 ✅
```

---

## 6. 性能优化策略

### 6.1 优化点汇总

| # | 优化 | 省去的开销 | 影响范围 |
|---|------|----------|---------|
| 1 | 零第三方框架 | Fastify 初始化、plugin/hook 系统、request/reply 构造 | 全局 |
| 2 | query 懒解析 getter | GET /json 等无 query 场景完全跳过 URLSearchParams | request.ts |
| 3 | path 快速分割 | `indexOf('?')` 替代 `new URL()` 完整解析 | request.ts、adapter.ts |
| 4 | headers 零拷贝 | 直接引用 `incoming.headers`，无 Object.assign | request.ts |
| 5 | 预组装中间件链 | 首次请求 concat + store 缓存，消除每请求数组 spread | adapter.ts |
| 6 | 参数化递归 dispatch(i) | 避免每请求创建闭包链 | adapter.ts |
| 7 | sendJsonString 共用 | json / rawJson 统一最短路径 | response.ts |
| 8 | find-my-way store 机制 | 避免闭包捕获路由级中间件链 | adapter.ts |
| 9 | 直接 serverResponse.end() | 跳过 Fastify reply.send / Express res.json 管道 | response.ts |
| 10 | _getRawBody 流式 + 缓存 | 直接 req.on('data')，无 content-type parser 管道 | request.ts |

### 6.2 与 Fastify Adapter 的开销对比

```
Fastify Adapter 请求路径:
  http.createServer → Fastify 初始化
    → Fastify onRequest hooks
    → Fastify content-type parser（即使使用 parseAs: 'buffer'）
    → Fastify route handler
      → createVextRequest(fastifyRequest) → 属性复制
      → createVextResponse(fastifyReply) → 方法包装
      → executeChain(chain, req, res) → 中间件执行
      → reply.send(JSON.stringify(...)) → Fastify serialization 管道
    → Fastify onSend hooks
    → Fastify onResponse hooks

Native Adapter 请求路径:
  http.createServer → handleRequest
    → router.find(method, pathname) → O(path_length) radix trie
    → createVextRequest(nodeReq) → 直接引用属性
    → createVextResponse(nodeRes) → 直接操作 ServerResponse
    → executeChain(chain, req, res) → 中间件执行
    → serverResponse.end(JSON.stringify(...)) → 直接发送

省去的步骤:
  ❌ Fastify 框架初始化
  ❌ Fastify onRequest / onSend / onResponse hooks
  ❌ Fastify content-type parser 管道
  ❌ Fastify serialization 管道
  ❌ FastifyRequest / FastifyReply 对象构造
  ❌ Fastify plugin 系统调度
```

### 6.3 基准测试结果

> **测试环境**: Windows 11, Node.js 22, autocannon -c 100 -d 10

#### JSON 场景（最具代表性）

| 指标 | Raw Native | Vext Native | Raw Fastify | Vext Fastify |
|------|-----------|------------|------------|-------------|
| RPS | 80,148 | **50,806** | 75,825 | 40,058 |
| Latency P50 | 5ms | 8ms | 4ms | 8ms |
| Latency P99 | 34ms | 52ms | 35ms | 61ms |
| Overhead | — | 36.61% | — | 47.17% |

**Vext-Native vs Vext-Fastify: +26.8% RPS 提升** 🚀

#### 全场景数据

| 框架 | 场景 | Raw RPS | Vext RPS | Overhead |
|------|------|--------:|---------:|---------:|
| native | json | 80,148 | 50,806 | 36.61% |
| native | params | 82,894 | 31,023* | 62.57%* |
| native | chain | 25,107* | 16,421 | 34.59% |
| fastify | json | 75,825 | 40,058 | 47.17% |
| fastify | params | 84,372 | 42,856 | 49.21% |
| fastify | chain | 38,975 | 16,582 | 57.45% |

> \* 标记的数据受 Windows 平台 benchmark 波动影响较大，需在 Linux/CI 环境复验

#### 已知限制

- **Windows 波动**: params 和 chain 场景数据波动较大（Windows 网络栈 / 调度器已知问题），建议在 Linux/CI 环境运行以获取稳定对比数据
- **JSON 场景最有参考价值**: 因为最接近真实 API 请求场景（读取 headers → 业务逻辑 → JSON 响应）

---

## 7. 配置集成

### 7.1 用户配置方式

#### 方式 1: 字符串标识（零 import，最简）

```typescript
// src/config/default.ts
export default {
  adapter: 'native',
  port: 3000,
}
```

`adapter-resolver.ts` 中 `BUILT_IN_ADAPTERS` 映射表将 `'native'` 映射到 `createNativeAdapter`。

#### 方式 2: 工厂函数（自定义选项）

```typescript
// src/config/default.ts
import { nativeAdapter } from 'vextjs/adapters/native'

export default {
  adapter: nativeAdapter({
    ignoreTrailingSlash: true,
    caseSensitive: false,
    maxParamLength: 1000,
  }),
  port: 3000,
}
```

#### 方式 3: 零配置工厂（等价于字符串，但可后续添加选项）

```typescript
import { nativeAdapter } from 'vextjs/adapters/native'

export default {
  adapter: nativeAdapter(), // 等价于 adapter: 'native'
  port: 3000,
}
```

### 7.2 切换 Adapter 的用户体验

```typescript
// 从 Fastify 切换到 Native — 用户代码零改动
export default {
  // adapter: 'fastify',  // 之前
  adapter: 'native',       // 之后 — 路由/中间件/插件代码完全不变
  port: 3000,
}
```

### 7.3 adapter-resolver 注册

```typescript
// src/lib/adapter-resolver.ts
const BUILT_IN_ADAPTERS: Record<string, (app: VextApp) => VextAdapter> = {
  hono: (app) => createHonoAdapter(app),
  fastify: (app) => createFastifyAdapter({}, app),
  express: (app) => createExpressAdapter({}, app),
  koa: (app) => createKoaAdapter({}, app),
  native: (app) => createNativeAdapter({}, app),  // 🆕
};
```

### 7.4 config-loader 白名单

```typescript
// src/lib/config-loader.ts
const knownAdapters = ['hono', 'fastify', 'express', 'koa', 'native'];
```

---

## 8. 与其他 Adapter 的差异对比

### 8.1 请求处理流程对比

| 步骤 | Hono | Fastify | Express | Koa | Native |
|------|------|---------|---------|-----|--------|
| HTTP 层 | 内建 Node adapter | Fastify 框架 | Express 框架 | Koa 框架 | `http.createServer` |
| 路由匹配 | Hono trie router | find-my-way (内置) | path-to-regexp | 线性扫描 / find-my-way | find-my-way (直接) |
| 请求对象来源 | `c.req` (Hono Request) | `FastifyRequest` | `express.Request` | `ctx.request` | `IncomingMessage` |
| 响应对象来源 | `c.json()` 返回 Response | `FastifyReply` | `express.Response` | `ctx.response` | `ServerResponse` |
| Body 读取 | `c.req.text()` | content-type parser | `req.on('data')` | `raw-body` / `koa-body` | `req.on('data')` |
| JSON 发送 | ResponseBox 捕获 | `reply.send(str)` | `res.end(str)` | `ctx.body = str` | `res.end(str)` |
| 框架 hooks | ❌ | onRequest/onSend/... | ❌ | ❌ | ❌ |
| 框架 plugins | ❌ | Fastify plugin system | ❌ | ❌ | ❌ |

### 8.2 对象分配对比（单次请求）

| 对象 | Hono | Fastify | Express | Koa | Native |
|------|:----:|:-------:|:-------:|:---:|:------:|
| 框架 request 对象 | ✅ | ✅ | ✅ | ✅ | ❌ |
| 框架 response 对象 | ✅ | ✅ | ✅ | ✅ | ❌ |
| VextRequest | ✅ | ✅ | ✅ | ✅ | ✅ |
| VextResponse | ✅ | ✅ | ✅ | ✅ | ✅ |
| 中间件链数组 | ✅* | ✅* | ✅* | ✅* | ✅* |
| 闭包链 | ❌* | ❌* | ❌* | ❌* | ❌* |

> \* 中间件链首次请求组装后缓存在 store 中，后续请求复用（所有 adapter 优化后行为一致）
> \* 闭包链已由 dispatch(i) 参数化递归替代（所有 adapter 优化后行为一致）

### 8.3 功能完整性验证矩阵

| 功能 | Hono ✅ | Fastify ✅ | Express ✅ | Koa ✅ | Native ✅ |
|------|:------:|:---------:|:---------:|:-----:|:--------:|
| registerRoute | ✅ | ✅ | ✅ | ✅ | ✅ |
| registerMiddleware | ✅ | ✅ | ✅ | ✅ | ✅ |
| registerErrorHandler | ✅ | ✅ | ✅ | ✅ | ✅ |
| registerNotFound | ✅ | ✅ | ✅ | ✅ | ✅ |
| listen / close / port / host | ✅ | ✅ | ✅ | ✅ | ✅ |
| buildHandler | ✅ | ✅ | ✅ | ✅ | ✅ |
| 洋葱模型中间件 | ✅ | ✅ | ✅ | ✅ | ✅ |
| AsyncLocalStorage 上下文 | ✅ | ✅ | ✅ | ✅ | ✅ |
| requestId 生成/透传 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 出口包装 (wrap) | ✅ | ✅ | ✅ | ✅ | ✅ |
| 204 No Content 合规 | ✅ | ✅ | ✅ | ✅ | ✅ |
| 重复发送保护 | ✅ | ✅ | ✅ | ✅ | ✅ |
| trustProxy 支持 | ✅ | ✅ | ✅ | ✅ | ✅ |
| Body 读取（_getRawBody） | ✅ | ✅ | ✅ | ✅ | ✅ |
| validate 数据（req.valid） | ✅ | ✅ | ✅ | ✅ | ✅ |
| onClose 钩子 | ✅ | ✅ | ✅ | ✅ | ✅ |
| stream / download | ✅ | ✅ | ✅ | ✅ | ✅ |
| redirect | ✅ | ✅ | ✅ | ✅ | ✅ |
| dev 模式热重载 | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 9. 测试策略

### 9.1 单元测试

测试文件：`test/unit/adapters/native-adapter.test.ts`

参照 `fastify-adapter.test.ts` 的完整测试模式，覆盖 16 个测试分类、91 个测试用例：

| # | 测试分类 | 用例数 | 说明 |
|---|---------|:------:|------|
| 1 | 接口完整性 | 2 | name 属性 + 6 个必需方法 |
| 2 | 路由注册与响应 | 8 | GET/POST + 全 HTTP 方法 + 参数路由 + query + 懒解析缓存 |
| 3 | 中间件链执行 | 5 | 全局→路由顺序 + 洋葱模型 + req/res 修改 + 短路 + 多中间件顺序 |
| 4 | 错误处理 | 4 | errorHandler + 二次异常兜底 + 路由中间件抛错 + 无 handler 兜底 |
| 5 | 404 Not Found | 4 | notFoundHandler + requestId 内联生成 + x-request-id 透传 + 默认 404 |
| 6 | VextResponse 方法 | 14 | json/rawJson/text + 状态码 + 包装 + 204 + redirect + setHeader + statusCode + 重复发送 |
| 7 | VextRequest 字段 | 13 | method/path/url/headers/app/requestId/ip/protocol/valid/onClose + trustProxy |
| 8 | Body 解析兼容性 | 7 | POST/GET/HEAD/OPTIONS/PUT + 空 body + 缓存 |
| 9 | listen / close / port | 5 | 随机端口 + 端口释放 + 多次 close + 请求处理 + host |
| 10 | buildHandler | 4 | 返回函数 + 处理请求 + 中间件 + 404 |
| 11 | Native Adapter 选项 | 5 | ignoreTrailingSlash + caseSensitive + maxParamLength |
| 12 | 并发请求隔离 | 2 | 多并发不干扰 + 中间件状态独立 |
| 13 | 预组装中间件链缓存 | 1 | 首次组装后复用 |
| 14 | AsyncLocalStorage 请求上下文 | 1 | requestContext.run 验证 |
| 15 | nativeAdapter 工厂函数 | 3 | 返回工厂 + 创建 adapter + 传递选项 |
| 16 | 边界场景 | 8 | 空路径 + 深层嵌套 + 特殊字符 query + null/数组/空对象 JSON + 空文本 + 多路由 |

### 9.2 跨 Adapter 一致性测试

E2E 测试已覆盖 4 个 Adapter × 32 场景的一致性验证（`test/e2e/adapter-e2e.test.ts`），
待 Native Adapter 加入 E2E 测试矩阵后将自动覆盖。

### 9.3 基准测试

Native Adapter 已集成到 benchmark 基础设施：
- 裸跑服务器：`test/benchmark/servers/raw-native.mjs`（使用 `router.lookup()`）
- vext 集成：通过 `BENCH_ADAPTER=native` 环境变量切换
- 运行命令：`npm run test:bench -- --framework native`

---

## 10. 路由格式兼容性

### 10.1 find-my-way 与 vext 路由格式

| 特性 | vext 格式 | find-my-way 格式 | 兼容性 |
|------|----------|-----------------|--------|
| 参数路由 | `/users/:id` | `/users/:id` | ✅ 完全兼容 |
| 多参数 | `/orgs/:orgId/users/:userId` | `/orgs/:orgId/users/:userId` | ✅ 完全兼容 |
| 通配符 | `*` | `*` | ✅ 完全兼容 |
| 静态路由 | `/health` | `/health` | ✅ 完全兼容 |

> 与 Fastify Adapter 的 `convertPathParams` 不同，Native Adapter **无需路径格式转换**。
> find-my-way 直接支持 `:param` 格式（因为 Fastify 本身就使用 find-my-way）。

---

## 11. 边界与约束

### 11.1 Adapter 不负责的事项

与其他 4 个 Adapter 一致，Native Adapter **不**负责：
- Body 解析（由 `body-parser` 中间件负责）
- requestId 生成（由 `requestId` 中间件负责，404 场景内联生成例外）
- CORS 处理（由 `cors` 中间件负责）
- 限速（由 `rate-limit` 中间件负责）
- 出口包装决策（由 `response-wrapper` 中间件负责）
- 错误格式化（由 `error-handler` 中间件负责）

### 11.2 已知限制

| 限制 | 影响 | 说明 |
|------|------|------|
| 无 HTTP/2 支持 | 低 | `http.createServer` 仅支持 HTTP/1.1；HTTP/2 需要 `http2.createSecureServer`，可作为 v2.0 扩展 |
| 无内置 TLS | 低 | 生产环境通常在反向代理（Nginx / LB）层终止 TLS |
| 无内置压缩 | 低 | 可通过中间件或反向代理实现 |
| Windows benchmark 波动 | 中 | params/chain 场景数据不稳定，需 Linux/CI 复验 |
| `http.Server.close()` 多次调用 | 低 | Node.js 原生行为：第二次 close() 会抛 `ERR_SERVER_NOT_RUNNING`，用户应通过 handle 管理生命周期 |

### 11.3 未来扩展方向

| 扩展 | 优先级 | 说明 |
|------|:------:|------|
| HTTP/2 支持 | 低 | 使用 `http2.createSecureServer` 替换 `http.createServer` |
| 对象池化 VextRequest/VextResponse | 中 | 减少 GC 压力，需要仔细的生命周期管理 |
| fast-json-stringify 集成 | 中 | 已知 schema 时可提升 JSON 序列化性能 |
| 可配置 AsyncLocalStorage 开关 | 高 | 见 IMPLEMENTATION-PLAN v1.1.0 路线图 5.7 |
| 内置压缩（zlib） | 低 | 直接 pipe 到 zlib.createGzip() |

---

## 12. Tradeoff 分析

### 12.1 选择 Native Adapter 的理由

| 优势 | 说明 |
|------|------|
| 🚀 最高性能 | JSON 场景 +26.8% RPS vs Fastify Adapter |
| 📦 最少依赖 | 仅 `find-my-way`（纯路由库），无 HTTP 框架 |
| 🔍 最短调用路径 | 直接操作 IncomingMessage/ServerResponse，无中间包装层 |
| 🛠️ 完全可控 | 所有请求处理逻辑由 vext 自己掌控，无第三方框架行为差异 |
| 📐 零行为差异 | 与其他 Adapter 的 VextRequest/VextResponse 行为完全一致 |

### 12.2 选择其他 Adapter 的理由

| 场景 | 推荐 Adapter | 理由 |
|------|-------------|------|
| 需要 Fastify 生态（插件/hooks） | Fastify | Fastify 插件生态丰富 |
| 团队已熟悉 Express | Express | 低学习成本 |
| 需要 Koa 的 ctx 模型 | Koa | 团队偏好 |
| Web Standards API | Hono | Bun / Deno / edge runtime 兼容 |
| 纯性能追求 | **Native** | 最高 RPS + 最低 overhead |

### 12.3 风险评估

| 风险 | 概率 | 影响 | 缓解 |
|------|:----:|:----:|------|
| find-my-way 版本不兼容 | 低 | 中 | 锁定 `^9.5.0`，Fastify 依赖同一库确保维护 |
| Node.js 原生 API 变更 | 极低 | 高 | IncomingMessage/ServerResponse 是稳定 API |
| 性能优势被 V8 优化抹平 | 中 | 低 | 不影响功能，退化为与 Fastify 持平 |
| 缺少框架级安全防护 | 中 | 中 | vext 内置中间件（rate-limit/cors/error-handler）已提供等价防护 |

---

## 附录 A：类型索引

| 类型 / 接口 | 文件 | 说明 |
|-------------|------|------|
| `NativeAdapterOptions` | `adapter.ts` | 用户配置选项 |
| `RouteStore` | `adapter.ts` | find-my-way store 数据结构 |
| `VextAdapter` | `types/adapter.ts` | Adapter 统一接口 |
| `VextServerHandle` | `types/adapter.ts` | listen 返回的服务器句柄 |
| `VextRequest` | `types/request.ts` | 请求对象类型 |
| `VextResponse` | `types/response.ts` | 响应对象类型 |
| `VextMiddleware` | `types/middleware.ts` | 中间件签名 |
| `VextErrorMiddleware` | `types/middleware.ts` | 错误处理中间件签名 |

## 附录 B：文件清单

| 文件 | 行数 | 说明 |
|------|------|------|
| `src/adapters/native/adapter.ts` | ~482 | 核心实现：createNativeAdapter + handleRequest + executeChain |
| `src/adapters/native/request.ts` | ~251 | IncomingMessage → VextRequest 转换 |
| `src/adapters/native/response.ts` | ~335 | ServerResponse → VextResponse 转换 |
| `src/adapters/native/index.ts` | ~100 | 导出入口 + nativeAdapter() 工厂函数 |
| `test/unit/adapters/native-adapter.test.ts` | ~2166 | 91 个单元测试（16 个分类） |
| `test/benchmark/servers/raw-native.mjs` | ~121 | 裸跑基准测试服务器 |

## 附录 C：Benchmark 裸跑服务器设计

`test/benchmark/servers/raw-native.mjs` 使用 `router.lookup()` 而非 `router.find()`：

```javascript
// raw-native.mjs — 裸跑最高性能
const server = http.createServer((req, res) => {
  router.lookup(req, res); // lookup 直接调用 handler，跳过 find() 返回中间对象
});
```

**lookup vs find 差异**：
- `router.lookup(req, res)`：直接调用 handler(req, res, params)，零中间对象
- `router.find(method, path)`：返回 `{ handler, params, store }` 对象，需手动处理

Adapter 中使用 `find()` 因为需要访问 `store`（预组装中间件链）和自定义处理流程。
裸跑用 `lookup()` 因为不需要自定义流程，追求最高吞吐。