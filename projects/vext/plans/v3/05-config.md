# 05 - 配置层（config/）详细方案（最后更新: 2026-02-28 P1 修复）

> **项目**: vext
> **日期**: 2026-02-26
> **状态**: ✅ 已确认
> **依赖**: 目录结构（`00-directory-structure.md` ✅）

---

## 0. 设计原则

- **纯对象导出**：所有配置文件直接 `export default { ... }`，零 import（除非用到第三方模块）
- **分环境覆盖**：`default.ts` 为基准，环境文件只写差异，框架自动合并
- **框架内部解析**：字符串标识（如 `adapter: 'hono'`）由框架识别，用户无需 import 框架模块

---

## 1. 配置文件结构

```
src/config/
├── default.ts       # 基准配置（必须存在，包含所有必填项）
├── development.ts   # 开发环境覆盖（可选）
├── production.ts    # 生产环境覆盖（可选）
└── local.ts         # 本地覆盖（可选，加入 .gitignore，最高优先级）
```

**合并优先级**：`local > production|development > default`

---

## 2. 完整配置项说明

### 2.1 config/default.ts 完整示例

```typescript
// src/config/default.ts
export default {

  // ── 服务器 ──────────────────────────────────────────────
  port:       3000,
  host:       '0.0.0.0',
  trustProxy: false,        // 是否信任反向代理的 X-Forwarded-* 头（nginx/caddy 前置时设 true）

  // ── 适配器 ──────────────────────────────────────────────
  adapter: 'hono',

  // ── 中间件白名单（速率限制已内置，无需放这里）────────────
  middlewares: [
    'auth',
    'check-role',
    // 环境文件可通过 { name: 'xxx', enabled: false } 禁用某个中间件
  ],

  // ── 速率限制（内置 flex-rate-limit，可通过 app.setRateLimiter() 替换）──
  rateLimit: {
    enabled:  true,
    max:      100,      // 每个窗口期最大请求数
    window:   60,       // 窗口期（秒）
    message:  'Too Many Requests',
    keyBy:    'ip',     // 限流维度：'ip' | 'user'（需 req.user）| 自定义函数
  },

  // ── 请求 ────────────────────────────────────────────────
  request: {
    maxBodySize: '1mb',
    timeout:     30000,
  },

  // ── 请求追踪（企业级必备）────────────────────────────────
  requestId: {
    enabled:        true,
    // 从此请求头读取 requestId（网关透传），不存在则调用 generate()
    header:         'x-request-id',
    // 将 requestId 写入响应头
    responseHeader: 'x-request-id',
    // 默认生成 UUID v4，插件可覆盖此函数（如 APM traceId 算法）
    generate:       undefined,     // undefined = 框架内置 UUID v4
  },

  // ── 响应 ────────────────────────────────────────────────
  response: {
    // 自定义 404 响应体（默认：{ code: 404, message: 'Not Found' }）
    notFound: undefined,    // 设为函数可完全自定义：(req) => ({ code: 404, message: '...' })

    // 生产环境是否在 500 响应中隐藏错误详情（默认：非 production 环境显示 stack）
    hideInternalErrors: process.env.NODE_ENV === 'production',
  },

  // ── 日志 ────────────────────────────────────────────────
  logger: {
    level:  'info',
    pretty: true,
  },

  // ── CORS ────────────────────────────────────────────────
  cors: {
    enabled:     true,
    origins:     ['*'],
    methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    headers:     ['Content-Type', 'Authorization'],
    credentials: false,
  },

  // ── 路由 ────────────────────────────────────────────────
  router: {
    prefix:      '',        // 全局路由前缀（如 '/api/v1'）
    strictSlash: false,
  },

  // ── 健康检查（企业级必备）────────────────────────────────
  healthCheck: {
    enabled:   true,
    path:      '/health',   // liveness probe：服务存活
    readyPath: '/ready',    // readiness probe：流量就绪（可选）
  },

  // ── 优雅关闭（企业级必备）────────────────────────────────
  shutdown: {
    timeout: 10000,         // 等待飞行中请求完成的最长时间（毫秒），超时强制退出
  },

  // ── HTTP 客户端（出站请求追踪，详见 06d-fetch.md）─────
  fetch: {
    timeout:          10_000,   // 默认请求超时（毫秒）
    retry:            0,        // 默认重试次数（仅幂等方法 GET/HEAD/OPTIONS/PUT/DELETE）
    retryDelay:       1000,     // 默认重试间隔（毫秒）
    propagateHeaders: [],       // 除 x-request-id 外还需自动传播的请求头
  },

  // ── 多语言（app.throw i18n）────────────────────────────
  locale: {
    default:   'zh-CN',             // 默认语言（Accept-Language 缺失时使用）
    supported: ['zh-CN', 'en-US'],  // 可选：限制支持的语言列表（不在列表中的 fallback 到 default）
  },

  // ── 开发 ────────────────────────────────────────────────
  dev: {
    hot:          true,       // 启用 Soft Reload（Tier 1/2）；false = 所有变更走冷重启
    poll:         false,      // polling 模式（Docker bind mount 兼容，也可通过 VEXT_DEV_POLL=1 开启）
    pollInterval: 1000,       // polling 间隔（毫秒），仅 poll: true 时生效
    debounce:     100,        // 防抖间隔（毫秒），窗口内多个变更合并为一次 reload
  },

  // ── 插件 ────────────────────────────────────────────────
  plugin: {
    setupTimeout: 30_000,   // 单个插件 setup() 最大等待时间（毫秒）
  },

  // ── 多进程 Cluster（详见 12-cluster.md）────────────────
  cluster: {
    enabled:     false,     // 是否启用 cluster 模式（也可通过 VEXT_CLUSTER=1 开启）
    workers:     'auto',    // Worker 数量：'auto' = CPU 核心数，'auto-1' = 核心数-1，number = 指定
    autoRestart: true,      // Worker 崩溃后自动重启
    pidFile:     '.vext.pid',
  },

}
```

---

## 3. 各配置项详解

### 3.1 `port` / `host` / `trustProxy`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `port` | `number` | `3000` | HTTP 监听端口 |
| `host` | `string` | `'0.0.0.0'` | 监听地址，`'127.0.0.1'` 只监听本地 |
| `trustProxy` | `boolean` | `false` | 信任反向代理的 `X-Forwarded-For` / `X-Forwarded-Proto` 头，影响 `req.ip`、`req.protocol`；nginx/caddy 前置时设 `true` |

```typescript
// production.ts — 生产环境，nginx 反向代理
export default {
  port:       8080,
  trustProxy: true,
}
```

---

### 3.2 `adapter`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `adapter` | `string \| object` | `'hono'` | 底层 HTTP 框架 |

内置 adapter 用字符串标识：

| 标识 | 说明 |
|------|------|
| `'hono'` | Hono（当前实现，默认） |

第三方 adapter（需 import）：

```typescript
// 需要第三方 adapter 时才 import
import { fastifyAdapter } from 'vext-adapter-fastify'

export default {
  adapter: fastifyAdapter({ /* fastify 选项 */ }),
}
```

---

### 3.3 `middlewares`

中间件白名单，详见 `01b-middlewares.md`。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `middlewares` | `MiddlewareDecl[]` | `[]` | 白名单声明，只有在此列出的才进入 registry |

`MiddlewareDecl` 完整类型：

```typescript
type MiddlewareDecl =
  | string                                          // 无参数，默认 enabled
  | {
      name:     string
      options?: Record<string, unknown>             // 默认参数（工厂中间件）
      enabled?: boolean                             // 默认 true；设为 false 可禁用
    }
```

示例：

```typescript
middlewares: [
  'auth',                                                    // 字符串：无默认参数
  { name: 'check-role', options: { roles: ['admin'] } },     // 对象：带全局默认参数
  // 速率限制已内置，通过 config.rateLimit 配置，无需放这里
]
```

**环境文件按 name patch 合并**：只写需要覆盖的中间件项，其余继承 default。

#### 3.3.1 禁用中间件（`enabled: false`）

环境文件可通过 `enabled: false` 禁用 default 中声明的某个中间件，**无需从数组中删除**：

```typescript
// src/config/development.ts — 开发环境禁用 check-role
export default {
  middlewares: [
    { name: 'check-role', enabled: false },
  ],
}
```

合并结果：

```
default:     ['auth', { name: 'check-role', options: { roles: ['admin'] } }]
development: [{ name: 'check-role', enabled: false }]

合并结果:    ['auth', { name: 'check-role', options: { roles: ['admin'] }, enabled: false }]
```

**框架行为**：`middleware-loader` 在加载阶段跳过 `enabled: false` 的中间件，不加入 registry，也不查找对应文件：

```typescript
// middleware-loader 内部
for (const decl of declarations) {
  const name    = typeof decl === 'string' ? decl : decl.name
  const enabled = typeof decl === 'string' ? true : (decl.enabled ?? true)

  if (!enabled) {
    logger.debug(`[vextjs] Middleware "${name}" is disabled (enabled: false), skipping.`)
    continue
  }
  // ... 正常加载逻辑
}
```

**设计原则**：
- `enabled: false` 是唯一的禁用方式，不引入 `remove: true` 或 `replace: false` 等冗余语义
- 禁用后路由仍可引用该中间件名称 → 运行时抛错 `middleware "check-role" not registered`（Fail Fast，避免静默跳过）
- 重新启用只需在更高优先级配置中设 `enabled: true` 或省略 `enabled`（默认 true）

---

### 3.4 `request`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `request.maxBodySize` | `string \| number` | `'1mb'` | 请求体最大体积（可被路由 `override.maxBodySize` 覆盖） |
| `request.timeout` | `number` | `30000` | 请求超时（毫秒），`0` 不限制（可被路由 `override.timeout` 覆盖） |

支持的体积单位：`'512b'` `'1kb'` `'10mb'` `'1gb'` 或直接字节数（如 `1048576`）。

---

### 3.5 `requestId`（企业级必备）

框架内置请求追踪能力，每个请求自动生成或透传 `requestId`，注入到 `req.requestId`。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `requestId.enabled` | `boolean` | `true` | 是否启用请求 ID 追踪，设为 `false` 时 `req.requestId` 为空字符串 |
| `requestId.header` | `string` | `'x-request-id'` | 从哪个请求头读取（网关透传），不存在时调用 `generate()` |
| `requestId.responseHeader` | `string` | `'x-request-id'` | 将 requestId 写入响应头 |
| `requestId.generate` | `(() => string) \| undefined` | `undefined` | 自定义 ID 生成函数；`undefined` 时框架使用内置 UUID v4 |

**框架处理流程**：

```
请求进入
  ↓
requestId.enabled = true？
  ↓ 是
读取 req.headers[requestId.header]
  ├── 有值 → 直接使用（网关透传）
  └── 无值 → 调用 requestId.generate?.() ?? uuidv4()
  ↓
挂载到 req.requestId
  ↓
写入响应头 requestId.responseHeader
  ↓
注入到所有响应体（{ code, data/message, requestId }）
```

**插件覆盖 generate**（APM / 分布式追踪场景）：

```typescript
// src/plugins/apm.ts
import { definePlugin } from 'vextjs'

export default definePlugin({
  name: 'apm',
  setup(app) {
    // 通过专用 API 覆盖生成逻辑，不直接修改 app.config（config 只读）
    app.setRequestIdGenerator(() => apmSdk.createTraceId())
  },
})
```

> `app.setRequestIdGenerator(fn)` 是框架提供的专用覆盖 API，`app.config` 在运行时保持只读。

---

### 3.6 `healthCheck`（企业级必备）

框架内置健康检查端点，供 Kubernetes Probe / 负载均衡器 / 监控系统探测。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `healthCheck.enabled` | `boolean` | `true` | 是否注册健康检查端点 |
| `healthCheck.path` | `string` | `'/health'` | liveness probe：服务进程是否存活 |
| `healthCheck.readyPath` | `string \| null` | `'/ready'` | readiness probe：是否可以接收流量（`null` 禁用） |

**响应格式**：

```json
GET /health → HTTP 200
{ "status": "ok", "uptime": 12345 }

GET /ready  → HTTP 503（onReady 钩子执行中）
{ "status": "starting" }

GET /ready  → HTTP 200（onReady 钩子全部完成后）
{ "status": "ready" }
```

> - `/health` 和 `/ready` 端点**不经过出口包装**，也不经过用户中间件
> - `/ready` 与 `app.onReady()` 钩子联动：所有 `onReady` 钩子执行完成前持续返回 `503`，完成后才返回 `200`（见 `06-built-ins.md §6`）

---

### 3.7 `shutdown`（企业级必备）

进程收到 `SIGTERM` / `SIGINT` 时框架自动执行优雅关闭：停止接受新请求 → 等待飞行中请求完成 → 退出。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `shutdown.timeout` | `number` | `10000` | 等待飞行中请求完成的最长时间（毫秒），超时强制退出 |

```typescript
// production.ts — 给请求更多完成时间
export default {
  shutdown: { timeout: 30000 },
}
```

---

### 3.8 `response`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `response.notFound` | `((req) => object) \| undefined` | `undefined` | 自定义 404 响应体；`undefined` 时返回默认 `{ code: 404, message: 'Not Found' }` |
| `response.hideInternalErrors` | `boolean` | `NODE_ENV === 'production'` | `true` 时 500 响应隐藏 stack 信息 |

```typescript
// 自定义 404
export default {
  response: {
    notFound: (req) => ({ code: 404, message: `路径 ${req.path} 不存在` }),
  },
}
```

---

### 3.9 `logger`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `logger.level` | `string` | `'info'` | 日志级别：`'silent'` `'error'` `'warn'` `'info'` `'debug'` |
| `logger.pretty` | `boolean` | `true` | `true` = 格式化输出，`false` = JSON 输出 |

```typescript
// production.ts — 生产环境改为 JSON 日志
export default {
  logger: {
    level:  'warn',
    pretty: false,   // 适合日志收集系统解析
  },
}
```

---

### 3.10 `cors`

框架**内置 CORS 处理**，启动时根据 `config.cors` 自动注册全局 CORS 中间件，无需用户手动添加插件。

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cors.enabled` | `boolean` | `true` | 是否启用 CORS |
| `cors.origins` | `string[]` | `['*']` | 允许的 Origin |
| `cors.methods` | `string[]` | 全部常用方法 | 允许的 HTTP 方法 |
| `cors.headers` | `string[]` | `['Content-Type', 'Authorization']` | 允许的请求头 |
| `cors.credentials` | `boolean` | `false` | 是否允许携带 Cookie |

```typescript
// production.ts — 限制跨域来源
export default {
  cors: {
    origins:     ['https://app.example.com', 'https://admin.example.com'],
    credentials: true,
  },
}
```

> **路由级覆盖**：通过 `RouteOptions.override.cors` 可覆盖单条路由的 CORS 策略（见 `01-routes.md §3`）
>
> **插件完全自定义**：若需要更复杂的 CORS 逻辑（如动态 Origin 校验、按租户区分），可通过插件使用 `app.use()` 注册自定义 CORS 中间件并将 `cors.enabled` 设为 `false` 来禁用内置 CORS。

---

### 3.11 `router`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `router.prefix` | `string` | `''` | 全局路由前缀（如 `'/api/v1'`） |
| `router.strictSlash` | `boolean` | `false` | 是否严格区分末尾斜杠 |

```typescript
// 全局加 /api/v1 前缀
export default {
  router: { prefix: '/api/v1' },
}
// routes/users.ts → GET /api/v1/users
```

---

### 3.11b `fetch`（内置 HTTP 客户端）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `fetch.timeout` | `number` | `10000` | 全局默认请求超时（毫秒） |
| `fetch.retry` | `number` | `0` | 默认重试次数（仅幂等方法 GET/HEAD/OPTIONS/PUT/DELETE） |
| `fetch.retryDelay` | `number` | `1000` | 默认重试间隔（毫秒） |
| `fetch.propagateHeaders` | `string[]` | `[]` | 除 `x-request-id` 外还需自动传播的请求头（如 `x-trace-id`、`x-tenant-id`） |

```typescript
export default {
  fetch: {
    timeout: 5000,
    retry: 2,
    propagateHeaders: ['x-tenant-id'],
  },
}
```

> **超时优先级**：单次调用 `init.timeout` > `create()` 的 `options.timeout` > `config.fetch.timeout`
>
> `app.fetch` 会自动从 `requestContext` 中读取当前请求的 `requestId` 并注入到出站请求的 `x-request-id` 头，实现跨服务请求追踪。详见 `06d-fetch.md`。

---

### 3.12 `dev`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `dev.hot` | `boolean` | `true` | 启用 Soft Reload（Tier 1/2 热替换）；`false` = 所有变更走冷重启（等价 `--no-hot`） |
| `dev.poll` | `boolean` | `false` | 使用 polling 模式（Docker bind mount / 网络文件系统兼容）；也可通过 `VEXT_DEV_POLL=1` 开启 |
| `dev.pollInterval` | `number` | `1000` | Polling 间隔（毫秒），仅 `dev.poll: true` 时生效 |
| `dev.debounce` | `number` | `100` | 防抖间隔（毫秒），窗口内多个变更合并为一次 reload |

> **热重载机制说明**：`vext dev` 使用三层热重载架构（详见 `11-hot-reload.md`）：
> - **Tier 1**（代码修改，95%）：esbuild 单文件编译 → require.cache 精确清除 → fresh adapter 重建 → handler 原子替换。Server socket、DB 连接池、Plugin 实例**保持不变**。~23ms。
> - **Tier 2**（文件增删，5%）：esbuild 全量增量编译 → 同上。~100ms。
> - **Tier 3**（配置/插件/.env）：完整进程重启。~2000ms。
>
> `dev.hot: false` 时所有变更走 Tier 3（冷重启），作为降级手段。
> `vext start`（生产模式）无热重载。

---

### 3.13 `plugin`

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `plugin.setupTimeout` | `number` | `30000` | 单个插件 `setup()` 的最大等待时间（毫秒），超时则启动失败 |

```typescript
// 数据库连接超时较长时适当调整
export default {
  plugin: { setupTimeout: 60_000 },
}
```

---

### 3.14 `locale`（多语言错误码）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `locale.default` | `string` | `'zh-CN'` | 默认语言（请求头 `Accept-Language` 缺失时使用） |
| `locale.supported` | `string[]` | `['zh-CN', 'en-US']` | 支持的语言列表；请求的 locale 不在列表中时 fallback 到 `default` |

```typescript
export default {
  locale: {
    default:   'zh-CN',
    supported: ['zh-CN', 'en-US', 'ja-JP'],
  },
}
```

> **与 `app.throw` 的关系**：框架内置中间件从请求头 `Accept-Language` 提取 locale 并写入
> AsyncLocalStorage（`requestContext`），`defaultThrow` 从中读取 locale 传给 `I18nError.create()`。
> 语言包文件放在 `src/locales/` 目录下，框架启动时通过 `dsl.config({ i18n })` 自动加载。
> 详见 **[06b-error.md §1.7](./06b-error.md)**。

---

### 3.15 `cluster`（多进程）

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `cluster.enabled` | `boolean` | `false` | 是否启用多进程 cluster 模式（也可通过 `VEXT_CLUSTER=1` 开启） |
| `cluster.workers` | `'auto' \| 'auto-1' \| number` | `'auto'` | Worker 数量。`auto` = CPU 核心数（感知 Docker cgroups 限制） |
| `cluster.autoRestart` | `boolean` | `true` | Worker 崩溃后自动重启（带指数退避和频率保护） |
| `cluster.pidFile` | `string` | `'.vext.pid'` | PID 文件路径（Master PID） |

完整配置项及子字段（`healthCheck`、`reload`、`sticky` 等）详见 **[12-cluster.md §3](./12-cluster.md)**。

```typescript
// production.ts — 启用 cluster
export default {
  cluster: {
    enabled: true,
    workers: 'auto',
  },
}
```

> **环境变量覆盖**: `VEXT_CLUSTER=1` / `VEXT_WORKERS=4` / `VEXT_CLUSTER_PID=/var/run/app.pid`（优先级高于配置文件）。
> **K8s 部署**: 设 `VEXT_CLUSTER=0`，由 K8s HPA 控制副本数。

---

## 4. 典型环境配置示例

### development.ts

```typescript
// src/config/development.ts — 开发环境：宽松限制、详细日志
export default {
  logger: {
    level:  'debug',
    pretty: true,
  },
  rateLimit: {
    max: 9999,   // 开发环境实际上不限流
  },
}
```

### production.ts

```typescript
// src/config/production.ts — 生产环境：严格限制、JSON 日志
export default {
  port: 8080,
  logger: {
    level:  'warn',
    pretty: false,
  },
  cors: {
    origins:     ['https://app.example.com'],
    credentials: true,
  },
  rateLimit: {
    max:    50,
    window: 60,
  },
}
```

### local.ts（不提交 git）

```typescript
// src/config/local.ts — 本地调试：连接本地服务、关闭认证等
export default {
  port: 4000,
  logger: { level: 'debug' },
}
```

---

## 5. 配置合并规则（框架内部）

框架 `config-loader` 对不同类型字段采用不同合并策略：

| 字段类型 | 合并策略 | 示例 |
|---------|---------|------|
| 普通标量（`port`、`host`）| 覆盖（后者优先） | `production.port = 8080` 覆盖 `default.port = 3000` |
| 普通对象（`logger`、`cors`、`request`）| 深度合并 | 只覆盖写了的子字段，其余继承 default |
| `middlewares[]` 数组 | **按 name patch** | 只替换 name 匹配的项，未匹配的继承 default |

**`middlewares[]` patch 合并规则**：

1. 以 `default.ts` 的 `middlewares[]` 为基准数组
2. 环境文件中的每一项按 `name` 查找基准数组中的匹配项
3. 匹配到 → **浅合并**该项（`options` / `enabled` 等字段覆盖）
4. 未匹配到 → **追加**到数组末尾
5. 保持基准数组的**原始顺序**不变

**示例 1 — 覆盖 options**：

```
default:     ['auth', { name: 'check-role', options: { roles: ['admin'] } }]
production:  [{ name: 'check-role', options: { roles: ['admin', 'superadmin'] } }]

合并结果:    ['auth', { name: 'check-role', options: { roles: ['admin', 'superadmin'] } }]
```

**示例 2 — 禁用中间件**：

```
default:     ['auth', 'check-role']
development: [{ name: 'check-role', enabled: false }]

合并结果:    ['auth', { name: 'check-role', enabled: false }]
```

**示例 3 — 环境文件追加新中间件**：

```
default:     ['auth']
staging:     [{ name: 'request-logger', options: { verbose: true } }]

合并结果:    ['auth', { name: 'request-logger', options: { verbose: true } }]
```

> 速率限制通过 `rateLimit` 配置块覆盖，不走 middlewares 数组（已内置，见 `06b-error.md §3`）。

### 5.1 config-loader 实现（框架内部）

```typescript
// vextjs/lib/config-loader.ts（框架内部）
import path from 'path'
import { existsSync } from 'fs'

const EXTENSIONS = ['.ts', '.js', '.mjs', '.cjs']

/**
 * 在 configDir 下查找指定名称的配置文件。
 * 'default' → 尝试 default.ts / default.js / default.mjs / default.cjs
 */
function resolveConfigFile(configDir: string, name: string): string | null {
  for (const ext of EXTENSIONS) {
    const full = path.join(configDir, `${name}${ext}`)
    if (existsSync(full)) return full
  }
  return null
}

/**
 * 深度合并两个对象（target 上叠加 source）。
 * - 普通对象：递归合并
 * - 数组：整体覆盖（非 middlewares，middlewares 走专用 patch 逻辑）
 * - 标量：source 覆盖 target
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: Partial<T>): T {
  const result = { ...target }
  for (const key of Object.keys(source) as (keyof T)[]) {
    const sv = source[key]
    const tv = target[key]
    if (
      sv !== null && typeof sv === 'object' && !Array.isArray(sv) &&
      tv !== null && typeof tv === 'object' && !Array.isArray(tv)
    ) {
      result[key] = deepMerge(tv as any, sv as any)
    } else {
      result[key] = sv as any
    }
  }
  return result
}

/**
 * middlewares 专用 patch 合并。
 * 按 name 匹配：匹配到则浅合并该项，未匹配到则追加。
 */
type MiddlewareDecl = string | { name: string; options?: unknown; enabled?: boolean }

function patchMiddlewares(base: MiddlewareDecl[], override: MiddlewareDecl[]): MiddlewareDecl[] {
  // 将 base 拷贝一份，统一为对象形式方便操作
  const result: MiddlewareDecl[] = base.map(d =>
    typeof d === 'string' ? d : { ...d }
  )

  for (const item of override) {
    const name = typeof item === 'string' ? item : item.name
    const idx  = result.findIndex(d =>
      (typeof d === 'string' ? d : d.name) === name
    )

    if (idx !== -1) {
      // 匹配到 → 浅合并
      const existing = result[idx]
      const base_    = typeof existing === 'string' ? { name: existing } : { ...existing }
      const override_= typeof item     === 'string' ? { name: item }    : { ...item }
      result[idx] = { ...base_, ...override_ }
    } else {
      // 未匹配到 → 追加
      result.push(item)
    }
  }

  return result
}

/**
 * 加载并合并配置文件。
 * 合并顺序：default → {NODE_ENV} → local
 */
export async function loadConfig(configDir: string): Promise<VextConfig> {
  // ── 1. 加载 default（必须存在）────────────────────────
  const defaultFile = resolveConfigFile(configDir, 'default')
  if (!defaultFile) {
    throw new Error(
      `[vextjs] src/config/default.ts not found.\n` +
      `         This file is required. It defines all configuration defaults.`
    )
  }
  const defaultConfig = (await import(defaultFile)).default

  // ── 2. 加载环境文件（可选）──────────────────────────────
  const env     = process.env.NODE_ENV || 'development'
  const envFile = resolveConfigFile(configDir, env)
  const envConfig = envFile ? (await import(envFile)).default : {}

  // ── 3. 加载 local（可选，不存在则静默跳过）──────────────
  const localFile   = resolveConfigFile(configDir, 'local')
  const localConfig = localFile ? (await import(localFile)).default : {}

  // ── 4. 合并 ────────────────────────────────────────────
  // 先合并 default + env
  let merged = deepMerge(defaultConfig, envConfig)
  // middlewares 走专用 patch
  if (envConfig.middlewares) {
    merged.middlewares = patchMiddlewares(
      defaultConfig.middlewares ?? [],
      envConfig.middlewares,
    )
  }

  // 再合并 local
  const beforeLocal = { ...merged }
  merged = deepMerge(merged, localConfig)
  if (localConfig.middlewares) {
    merged.middlewares = patchMiddlewares(
      beforeLocal.middlewares ?? [],
      localConfig.middlewares,
    )
  }

  // ── 5. Fail Fast 校验 ──────────────────────────────────
  validateConfig(merged)

  return deepFreeze(merged) as VextConfig  // 运行时只读（深冻结）
}

/**
 * 递归深冻结对象。
 * - Object.freeze 只冻结顶层属性（浅冻结），嵌套对象仍可被修改
 * - deepFreeze 递归冻结所有层级，确保 config 完全只读
 * - 跳过 null / 非对象 / 已冻结对象，避免无意义递归
 * - 跳过 Date / RegExp / Buffer / Map / Set 等非纯对象，
 *   冻结这些对象会破坏其内部状态（如 Date.setTime() 失效）
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Object.isFrozen(obj)) {
    return obj
  }
  // 跳过非纯对象（Date / RegExp / Buffer / TypedArray / Map / Set 等）
  // 这些对象有内部 slot，冻结后其变异方法会静默失败或抛错
  if (
    obj instanceof Date    ||
    obj instanceof RegExp  ||
    obj instanceof Map     ||
    obj instanceof Set     ||
    ArrayBuffer.isView(obj)    // Buffer / TypedArray
  ) {
    return obj
  }
  Object.freeze(obj)
  for (const value of Object.values(obj)) {
    deepFreeze(value)
  }
  return obj
}

/**
 * 配置校验（启动时 Fail Fast）。
 */
function validateConfig(config: Record<string, unknown>): void {
  const port = config.port as number | undefined
  if (port !== undefined && (typeof port !== 'number' || port < 1 || port > 65535)) {
    throw new Error(`[vextjs] config.port must be a number between 1 and 65535, got: ${port}`)
  }

  const adapter = config.adapter as string | undefined
  const knownAdapters = ['hono']
  if (adapter && !knownAdapters.includes(adapter)) {
    throw new Error(
      `[vextjs] config.adapter "${adapter}" is not a built-in adapter.\n` +
      `         Available: ${knownAdapters.join(', ')}`
    )
  }

  const middlewares = config.middlewares as unknown[]
  if (middlewares) {
    for (let i = 0; i < middlewares.length; i++) {
      const m = middlewares[i]
      if (typeof m !== 'string' && (typeof m !== 'object' || m === null || !('name' in m))) {
        throw new Error(
          `[vextjs] config.middlewares[${i}] must be a string or { name, options?, enabled? } object.`
        )
      }
    }
  }
}
```

---

## 6. 运行时访问配置

合并后的最终配置通过 `app.config` 访问：

```typescript
// 在 handler 或 service 中访问
app.config.port            // 3000
app.config.router.prefix   // '/api/v1'
app.config.logger.level    // 'info'
```

---

## 7. Fail Fast 验证

`config-loader` 在启动时对合并后的配置做校验：

| 检测项 | 错误示例 |
|-------|---------|
| `config/default.ts` 不存在 | `[vextjs] src/config/default.ts not found. This file is required.` |
| `port` 不是合法端口 | `[vextjs] config.port must be a number between 1 and 65535` |
| `adapter` 未知标识 | `[vextjs] config.adapter "hono2" is not a built-in adapter. Available: hono` |
| `middlewares` 元素格式错误 | `[vextjs] config.middlewares[1] must be a string or { name, options?, enabled? } object` |

---

## 8. 路由级覆盖

部分全局配置可在**单个路由**的 `options.override` 中覆盖，优先级高于全局配置：

| 可覆盖字段 | 路由写法 | 典型场景 |
|-----------|---------|---------|
| `request.timeout` | `override: { timeout: 120000 }` | 文件上传、耗时导出 |
| `request.maxBodySize` | `override: { maxBodySize: '50mb' }` | 文件上传路由 |
| `cors` | `override: { cors: { origins: ['*'] } }` | 开放 API 接口 |

```typescript
// 文件上传路由 — 覆盖 timeout 和 maxBodySize
app.post('/upload', {
  override: {
    timeout:     120000,   // 2 分钟，全局是 30 秒
    maxBodySize: '50mb',   // 50MB，全局是 1MB
  },
}, async (req, res) => {
  // ...
})

// 开放 API — 覆盖 CORS 允许所有来源
app.get('/public/info', {
  override: {
    cors: { origins: ['*'], credentials: false },
  },
}, async (req, res) => {
  res.json({ version: '1.0.0' })
})
```

> `override` 字段第一期**类型定稳但暂不实现**，后续版本启用。详见 `01-routes.md` 中 `RouteOptions.override` 定义。
