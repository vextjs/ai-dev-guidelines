# 01 - 路由层（routes/）详细方案

> **项目**: vext
> **日期**: 2026-02-26
> **状态**: ✅ 已确认
> **依赖确认**: 目录结构（`00-directory-structure.md` ✅）
> **响应格式**: 已确认 A1 — 出口中间件统一包装为 `{ code: 0, data: ... }`（见 `01c-response.md`）

---

## 子文件索引

| 文件 | 内容 |
|------|------|
| `01-routes.md` | 路由核心：前缀路由规则、`defineRoutes` API、内部实现、CRUD 示例、边界情况 |
| `01a-validate.md` | 校验体系：DSL 语法、处理流程、边界行为 |
| `01b-middlewares.md` | 路由级中间件：注册、引用写法、执行顺序、启动时验证 |
| `01c-response.md` | 响应规范：统一响应格式、`VextRequest`、`VextResponse`、出口包装实现 |
| `01d-router-loader.md` | router-loader 内部实现：扫描、排序、前缀提取、冲突检测 |

---

## 0. 概述

路由层是 vext 框架的 HTTP 入口层，**只负责接收请求、调用 service、返回响应**，不含业务逻辑。

```
HTTP Request
  → 框架内置中间件（requestId / cors / body-parser / rateLimit）
  → 全局中间件（插件通过 app.use() 注册，如 security-headers / APM）
  → 路由匹配（router-loader）
  → 路由级中间件（options.middlewares，来自 default.ts 白名单）
  → validate 中间件（options.validate）
  → handler → app.services.xxx
  → 出口包装中间件（{ code: 0, data, requestId }）
  → HTTP Response
```

**核心设计决策**：

| 决策 | 结论 |
|------|------|
| 路由组织方式 | 前缀路由：文件路径 = 挂载前缀，文件内代码注册子路径 |
| 路由写法 | 三段式 `app.method(path, options, handler)` |
| handler 参数 | `(req, res)` — `app` 通过 `defineRoutes(app => ...)` 闭包访问 |
| 校验写法 | 直接写 schema-dsl DSL 对象，框架内部调用 `dsl()` + `validate()`（见 `01a-validate.md`） |
| 第一期 options | `validate` + `middlewares` 立即实现；`docs` + `override` 类型定稳，后续启用 |
| 中间件加载方式 | `config/default.ts` 白名单声明，按需加载，不全量扫描（见 `01b-middlewares.md`） |
| 统一响应格式 | 出口中间件自动包装为 `{ code: 0, data: ... }`（见 `01c-response.md`） |
| 无编译阶段 | TS 项目用 `tsx` 直接运行，JS 项目用 `node`，均无需提前编译 |

---

## 1. 前缀路由规则

### 1.1 路径映射规则

路由文件放在 `src/routes/` 下，**文件路径 = 路由挂载前缀**，文件内用代码注册子路径，两段拼接为最终路由。

**转换规则**：

1. 取相对路径（去掉 `src/routes/` 前缀）
2. 去掉扩展名 `.ts`
3. `index` → 空字符串（使用上级目录路径）
4. `[param]` 段 → `:param`（动态段转换）
5. 拼接 `/` 作前缀

### 1.2 路径映射完整对照表

| 文件路径 | 挂载前缀 | 内部注册 | 最终路由 |
|---------|---------|---------|---------|
| `routes/index.ts` | `/` | `app.get('/')` | `GET /` |
| `routes/users.ts` | `/users` | `app.get('/list')` | `GET /users/list` |
| `routes/users.ts` | `/users` | `app.post('/')` | `POST /users` |
| `routes/users.ts` | `/users` | `app.get('/:id')` | `GET /users/:id` |
| `routes/api/users.ts` | `/api/users` | `app.get('/list')` | `GET /api/users/list` |
| `routes/api/index.ts` | `/api` | `app.get('/')` | `GET /api` |
| `routes/users/[id].ts` | `/users/:id` | `app.get('/posts')` | `GET /users/:id/posts` |
| `routes/users/[id]/posts/[postId].ts` | `/users/:id/posts/:postId` | `app.get('/')` | `GET /users/:id/posts/:postId` |
| `routes/admin/users.ts` | `/admin/users` | `app.delete('/:id')` | `DELETE /admin/users/:id` |

### 1.3 特殊文件命名约定

`routes/` 只有两种特殊文件名：

| 命名规则 | 含义 | 示例 |
|---------|------|------|
| `index.ts` | 该目录的根前缀（挂载前缀为上级路径） | `routes/api/index.ts` → 前缀 `/api` |
| `[param].ts` | 含动态段的路由，`[param]` 转为 `:param` | `routes/users/[id].ts` → 前缀 `/users/:id`，文件内仍用 `defineRoutes` 注册子路由 |

**`routes/` 目录只放路由文件，不放其他任何文件**：

| 文件类型 | 正确位置 | 原因 |
|---------|---------|------|
| 工具函数 | `src/utils/` | vext 已有 `utils/` 目录约定 |
| 路由测试 | `test/routes/` | 测试统一放 `test/` 目录 |
| 共享逻辑 | `src/utils/` 或 `src/middlewares/` | 按职责归类 |

如果 router-loader 在 `routes/` 下扫描到非路由文件（如 `.test.ts`），**启动时报错**（见 `01d-router-loader.md`）。

> **禁止冲突**：`routes/users.ts` 和 `routes/users/index.ts` 不能同时存在，两者前缀均为 `/users`，加载器启动时报错。

### 1.4 注册顺序

**静态段优先于动态段**，防止 `/:id` 拦截静态路径：

```
注册顺序（从高到低优先级）：
1. 完全静态路径  /users/profile
2. 含动态段路径  /users/:id
3. 通配路径      /users/*
```

router-loader 按文件名字母序加载，动态段文件（含 `[`）统一排在同级静态文件之后（见 `01d-router-loader.md`）。

---

## 2. defineRoutes API 设计

### 2.1 函数签名

```typescript
function defineRoutes(factory: (app: VextApp) => void): RouteDefinition
```

- `factory`：接收完整 `VextApp` 对象，在其上注册路由并访问应用上下文
- 返回值 `RouteDefinition`：内部数据结构，由 router-loader 调用 `.register()` 注册到 adapter

> **时序保证**：`service-loader` 在 `router-loader` 之前执行，`factory(app)` 被调用时 `app.services` 已全量挂载完毕，handler 内访问 `app.services.xxx` 是安全的。

### 2.2 VextApp 接口

```typescript
interface VextApp {
  // ── HTTP 方法（三段式）────────────────────────────────
  get    (path: string, options: RouteOptions, handler: VextHandler): void
  post   (path: string, options: RouteOptions, handler: VextHandler): void
  put    (path: string, options: RouteOptions, handler: VextHandler): void
  patch  (path: string, options: RouteOptions, handler: VextHandler): void
  delete (path: string, options: RouteOptions, handler: VextHandler): void
  head   (path: string, options: RouteOptions, handler: VextHandler): void
  options(path: string, options: RouteOptions, handler: VextHandler): void

  // ── HTTP 方法（两段式，无 options）────────────────────
  get    (path: string, handler: VextHandler): void
  post   (path: string, handler: VextHandler): void
  put    (path: string, handler: VextHandler): void
  patch  (path: string, handler: VextHandler): void
  delete (path: string, handler: VextHandler): void

  // ── 内置模块（框架启动即可用，插件可覆盖）────────────
  /**
   * 结构化日志（内置 pino，插件可替换为其他实现）
   * 自动携带 requestId，支持 .child() 创建子 logger
   */
  logger: VextLogger

  /**
   * 抛出 HTTP 错误，框架统一转为 { code, message, requestId } 响应
   * @param status  HTTP 状态码（400/401/403/404/409/500…）
   * @param message 错误描述
   * @param code    业务错误码（可选；不传则响应 code = status；传入则响应 code = bizCode）
   *
   * @example app.throw(404, '用户不存在')          // { code: 404, ... }
   * @example app.throw(400, '邮箱已注册', 10001)   // { code: 10001, ... }
   */
  throw(status: number, message: string, code?: number): never

  // ── 运行时数据（框架注入，不可覆盖）─────────────────
  /** 最终合并后的运行时配置（见 05-config.md），只读 */
  config:   VextConfig

  /** service-loader 注入的所有 service 实例（见 02-services.md） */
  services: VextServices

  // ── 插件扩展（启动后由插件挂载，第一期未实现）────────
  // db: VextDb        ← db 插件注入
  // cache: VextCache  ← cache 插件注入

  // ── 框架扩展 API（详见 06-built-ins.md）──────────────
  /** 向 app 挂载自定义属性，供插件使用；配合 declare module 'vextjs' 获得类型提示 */
  extend<K extends string, V>(key: K, value: V): void
  /** 注册优雅关闭钩子，SIGTERM/SIGINT 时按 LIFO 顺序执行 */
  onClose(handler: () => Promise<void> | void): void
  /**
   * 注册全局 HTTP 中间件（插件专用）
   * - 对所有路由生效，在路由级 middlewares 之前执行
   * - 只能在插件 setup() 中调用，路由注册后不可再调用
   */
  use(middleware: VextMiddleware): void
  /**
   * 所有插件加载完成、HTTP 开始监听之后触发
   * 适合：预热缓存、检查外部依赖、打印启动信息
   */
  onReady(handler: () => Promise<void> | void): void
  /**
   * 替换全局校验引擎（插件专用）
   * 默认：schema-dsl；可替换为 Zod / Yup 等（见 01a-validate.md §9）
   */
  setValidator(validator: VextValidator): void
  /**
   * 包装或替换 app.throw 的实现（插件专用）
   * 默认：schema-dsl I18nError（支持多语言、错误码映射）
   * @param wrapper 接收原始实现，返回新实现（可在前后加逻辑）
   */
  setThrow(wrapper: (original: VextApp['throw']) => VextApp['throw']): void
  /**
   * 替换全局速率限制实现（插件专用）
   * 默认：flex-rate-limit（见 06b-error.md §3）
   */
  setRateLimiter(limiter: VextRateLimiter): void
  /**
   * 覆盖 requestId 生成算法（插件专用）
   * 默认：UUID v4；常见替换：APM traceId、Snowflake ID 等
   * 不直接修改 app.config（config 在运行时只读）
   */
  setRequestIdGenerator(generate: () => string): void
}
```

### 2.3 handler 类型

```typescript
type VextHandler = (req: VextRequest, res: VextResponse) => Promise<void> | void
```

详见 `01c-response.md`。

### 2.4 两段式简写

无需 options 时可省略，直接传 handler：

```typescript
// 三段式（有 options）
app.get('/list', { validate: { query: { page: 'number:1-' } } }, async (req, res) => {
  // ...
})

// 两段式（无 options）
app.get('/health', async (req, res) => {
  res.json({ status: 'ok' })
})
```

### 2.5 path 规则

`path` 为**相对于文件挂载前缀的子路径**：

- `/list` → 追加 `/list` 到前缀后
- `/` 或 `''` → 与前缀完全一致（推荐用 `'/'`）
- `/:id` → 带动态段
- `/:id/posts` → 多段，支持嵌套

---

## 3. RouteOptions 类型定义

```typescript
interface RouteOptions {
  /**
   * 请求数据校验（schema-dsl DSL 对象）
   * 框架内部统一调用 dsl() + validate()，用户无需 import schema-dsl
   * 详见 01a-validate.md
   */
  validate?: {
    query?:  Record<string, string>
    body?:   Record<string, string>
    param?:  Record<string, string>
    header?: Record<string, string>
  }

  /**
   * 路由级中间件
   * 在 config/default.ts 的 middlewares[] 白名单中声明后才可引用
   * 详见 01b-middlewares.md
   */
  middlewares?: Array<
    | string
    | { name: string; options?: unknown }
  >


  /**
   * 路由级覆盖（覆盖 config/default.ts 中对应的全局配置）
   */
  override?: {
    /**
     * 覆盖该路由的速率限制
     * false = 禁用该路由的速率限制（如内部端点）
     * @example override: { rateLimit: { max: 10, window: 60 } }
     * @example override: { rateLimit: false }
     */
    rateLimit?: { max?: number; window?: number; keyBy?: string } | false

    /**
     * 覆盖该路由的请求超时（毫秒）
     * 典型场景：文件上传、耗时导出接口
     * @example override: { timeout: 120000 }  // 2 分钟
     */
    timeout?: number

    /**
     * 覆盖该路由允许的最大请求体体积
     * 典型场景：文件上传路由需要更大的 body
     * @example override: { maxBodySize: '50mb' }
     */
    maxBodySize?: string | number

    /**
     * 覆盖该路由的 CORS 策略
     * 典型场景：开放 API 接口需要允许所有 origin
     * @example override: { cors: { origins: ['*'] } }
     */
    cors?: {
      enabled?:     boolean
      origins?:     string[]
      methods?:     string[]
      headers?:     string[]
      credentials?: boolean
    }
  }
}
```

> 第一期**框架只处理** `validate` + `middlewares`，`override` 字段类型定稳但暂不实现。

> **文档生成**：vextjs 不在 RouteOptions 里放 `docs` 配置对象，而是通过**注释驱动**方式生成文档——插件扫描路由文件的 JSDoc 注释 + `validate` schema（已含完整参数类型）自动生成 OpenAPI 文档，零侵入业务代码：
>
> ```typescript
> /**
>  * @summary 获取用户列表
>  * @tags 用户
>  */
> app.get('/list', { validate: { query: { page: 'number:1-', limit: 'number:1-100' } } }, handler)
> ```

---

## 4. define-routes.ts 内部实现

### 4.1 职责

提供 `defineRoutes()` 函数，以**路由收集模式**收集路由定义，返回 `RouteDefinition` 对象（可被 router-loader 调用 `.register()` 注册）。

### 4.2 RouteDefinition 结构

```typescript
interface RouteRecord {
  method:  string
  path:    string          // 相对子路径（未含前缀）
  options: RouteOptions
  handler: VextHandler
}

interface RouteDefinition {
  routes:     RouteRecord[]
  sourceFile: string       // 来源文件路径（router-loader 注入，用于错误信息）
  register(adapter: VextAdapter, prefix: string): void
}
```

### 4.3 执行流程

```
defineRoutes(factory) 被调用
  ↓
创建内部 collector（实现 VextApp 接口）
  ↓
调用 factory(collector)  ← 执行用户代码，注册路由
  ↓
collector 将每条 app.get/post/... 调用推入 routes 数组
  ↓
返回 RouteDefinition { routes, register }
──────────────────────────────────────────────────
稍后，router-loader 调用 routeDef.register(adapter, prefix)
  ↓
对 routes 中每条路由：
  1. 拼接完整路径：fullPath = prefix + route.path
  2. 解析 middlewares → VextMiddleware[]（见 01b-middlewares.md）
  3. 构建 validate 中间件（若有 options.validate，见 01a-validate.md）
  4. 组装执行链：[...middlewares, validateMiddleware?, handler]
  5. adapter.register(method, fullPath, chain)
```

---

## 5. 完整 CRUD 示例

```typescript
// src/routes/users.ts — 挂载前缀：/users
import { defineRoutes } from 'vextjs'

export default defineRoutes((app) => {

  // GET /users  —— 用户列表（分页）
  app.get('/', {
    validate: {
      query: { page: 'number:1-', limit: 'number:1-100' },
    },
    middlewares: ['auth'],
  }, async (req, res) => {
    const query = req.valid<{ page: number; limit: number }>('query')
    const data  = await app.services.user.findAll(query)
    res.json(data)
    // 响应：{ code: 0, data: { list: [...], total: 100 } }
  })

  // GET /users/:id  —— 用户详情
  app.get('/:id', {
    validate: {
      param: { id: 'string!' },
    },
    middlewares: ['auth'],
  }, async (req, res) => {
    const { id } = req.valid<{ id: string }>('param')
    const data   = await app.services.user.findById(id)
    res.json(data)
    // 响应：{ code: 0, data: { id: '1', name: '...' } }
  })

  // POST /users  —— 创建用户
  app.post('/', {
    validate: {
      body: {
        name:     'string:1-50!',
        email:    'email!',
        password: 'string:8-!',
      },
    },
    middlewares: ['auth', { name: 'rate-limit', options: { max: 5 } }],
  }, async (req, res) => {
    const body = req.valid<{ name: string; email: string; password: string }>('body')
    const data = await app.services.user.create(body)
    res.json(data, 201)
    // 响应：HTTP 201  { code: 0, data: { id: '1', ... } }
  })

  // PUT /users/:id  —— 更新用户
  app.put('/:id', {
    validate: {
      param: { id: 'string!' },
      body:  { name: 'string:1-50', email: 'email' },
    },
    middlewares: ['auth'],
  }, async (req, res) => {
    const { id } = req.valid<{ id: string }>('param')
    const body   = req.valid<{ name?: string; email?: string }>('body')
    const data   = await app.services.user.update(id, body)
    res.json(data)
  })

  // DELETE /users/:id  —— 删除用户
  app.delete('/:id', {
    validate: {
      param: { id: 'string!' },
    },
    middlewares: ['auth'],
  }, async (req, res) => {
    const { id } = req.valid<{ id: string }>('param')
    await app.services.user.remove(id)
    res.status(204).json(null)
    // 响应：HTTP 204，无 body
  })

})
```

---

## 6. 边界情况与特殊处理

### 6.1 根路由 `/`

```typescript
// src/routes/index.ts → 挂载前缀 /
export default defineRoutes((app) => {
  app.get('/', async (req, res) => {
    res.json({ name: 'vext', version: '1.0.0' })
    // 响应：{ code: 0, data: { name: 'vext', version: '1.0.0' } }
  })
})
```

### 6.2 嵌套路由冲突

`routes/users.ts` 和 `routes/users/index.ts` 同时存在 → 启动报错（见 `01d-router-loader.md`）。

### 6.3 动态段与静态段优先级

```
routes/users/profile.ts   → 前缀 /users/profile（静态，优先注册）
routes/users/[id].ts      → 前缀 /users/:id（动态，后注册）
```

`GET /users/profile` 命中静态路由，不会被 `/users/:id` 拦截。

### 6.4 404 处理

框架在所有路由注册完成后，注册兜底 404：

```json
HTTP 404 Not Found
{ "code": 404, "message": "Not Found" }
```

### 6.5 路由文件导出异常

| 情况 | 处理 |
|------|------|
| 无默认导出 | **启动报错**，提示缺少 `export default defineRoutes(...)` |
| 导出不是 `RouteDefinition` | **启动报错**，提示导出类型不正确 |
| `.test.ts` 出现在 `routes/` 下 | **启动报错**，提示移出到 `test/routes/` |
| `defineRoutes` 内部抛错 | 启动失败，打印文件路径和错误栈 |
| 空路由文件（未注册任何路由）| 合法，无操作 |

### 6.6 handler 内部抛出异常

```
app.throw(code, message) / service 内 this.app.throw(...)
  → 框架抛出 HttpError(code, message)
  → 全局错误中间件捕获
  → { code: xxx, message: 'xxx', requestId }，HTTP 状态码 = code

handler 抛出 VextValidationError
  → { code: 422, message: 'Validation failed', errors: [...], requestId }

handler 抛出普通 Error
  → { code: 500, message: 'Internal Server Error', requestId }
```
```

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|-------|---------|------|
| `VextApp` | `vextjs/lib/app.ts` | 应用对象（HTTP 方法 + services + config） |
| `VextConfig` | `vextjs/lib/config.ts` | 运行时配置类型（见 `05-config.md`） |
| `RouteOptions` | `vextjs/lib/define-routes.ts` | 路由 options 配置类型（含 validate / middlewares / docs） |
| `VextHandler` | `vextjs/lib/adapter.ts` | handler 函数类型 |
| `VextRequest` | `vextjs/lib/adapter.ts` | 请求对象（含 `valid()`，支持 declare module 扩展） |
| `VextResponse` | `vextjs/lib/adapter.ts` | 响应对象（含 `json()` / `status()`） |
| `RouteDefinition` | `vextjs/lib/define-routes.ts` | `defineRoutes` 返回值类型 |
| `VextValidationError` | `vextjs/lib/errors.ts` | 校验失败错误类型 |
| `MiddlewareConfig` | `vextjs/lib/define-routes.ts` | `middlewares` 数组元素类型 |

---

## 后续模块索引

| 文件 | 模块 | 状态 |
|------|------|------|
| `01-routes.md` | 路由层核心 | ✅ 本文档 |
| `01a-validate.md` | 校验体系 | ✅ 已拆分 |
| `01b-middlewares.md` | 路由级中间件 | ✅ 已拆分 |
| `01c-response.md` | 响应规范 | ✅ 已拆分 |
| `01d-router-loader.md` | router-loader 实现 | ✅ 已拆分 |
| `02-services.md` | 服务层 | ✅ 已输出 |
| `03-middlewares.md` | 中间件详细方案 | ✅ 已输出 |
| `04-plugins.md` | 插件系统 | ✅ 已输出 |
| `05-config.md` | 配置层（分环境合并机制） | ✅ 已输出 |
| `06-built-ins.md` | 框架内置模块总览（索引入口） | ✅ 已输出 |
| `06a-logger.md` | `app.logger` 详解 | ✅ 已输出 |
| `06b-error.md` | `app.throw` + `app.setValidator` 详解 | ✅ 已输出 |
| `06c-lifecycle.md` | `app.extend` / `onClose` / `use` / `onReady` 详解 | ✅ 已输出 |
| `08-adapter.md` | Adapter 层（VextAdapter 接口） | ✅ 已输出 |
| `09-cli.md` | CLI（vext dev / start） | ✅ 已输出 |

