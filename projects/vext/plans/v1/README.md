# vext 框架方案 v3 — 总览

> **项目**: vext (vextjs)
> **日期**: 2026-02-26（最后更新: 2026-02-28 P0/P1 设计文档追加）
> **状态**: ✅ 核心方案已确认（详见 `confirmed.md`）
> **变更说明**: 新增 `vext build`（P0）、Fastify Adapter（P0）、monSQLize 集成（P1）、OpenAPI 自动生成（P1）设计文档

---

## 一、设计理念

vextjs 是一个**约定优于配置**的 Node.js 后端框架，目标是让用户**只写业务代码**：

| 原则 | 说明 |
|------|------|
| 零样板文件 | 无 `app.ts` / `server.ts` / `.env` / `nodemon.json` / `vext.config.ts` |
| CLI 驱动 | `vext dev` / `vext start`，框架接管启动与热重载 |
| 文件即路由 | `routes/` 目录结构自动映射为 HTTP 路由 |
| 自动扫描加载 | routes / services / plugins 无需手动 import 或注册 |
| 分环境配置 | `config/default.ts` → `config/{env}.ts` → `config/local.ts` 三层合并 |
| 类型安全 | 全局类型声明 + `declare module` 扩展，TS / JS 双语言支持 |

---

## 二、用户项目目录结构

```
my-app/
├── src/
│   ├── routes/              # 路由层（文件路径 = 路由前缀）
│   ├── services/            # 服务层（class，自动注入 app.services）
│   ├── middlewares/         # 路由级中间件（config 白名单声明才加载）
│   ├── plugins/             # 插件（启动时自动扫描加载）
│   ├── locales/             # 多语言错误码（app.throw i18n，按目录自动加载）
│   │   ├── zh-CN.ts         # 中文错误码 + 业务码
│   │   └── en-US.ts         # 英文错误码 + 业务码
│   ├── utils/               # 用户工具函数
│   ├── types/               # 类型声明（TS 项目；JS 项目可省略）
│   ├── config/              # 配置层（分环境覆盖）
│   │   ├── default.ts       # 所有配置基准值
│   │   ├── development.ts   # 开发环境覆盖
│   │   ├── production.ts    # 生产环境覆盖
│   │   └── local.ts         # 本地覆盖（不提交 git）
│   └── models/              # 数据层（后续开发）
│
├── public/                  # 静态资源（后续开发）
├── views/                   # 模板视图（后续开发）
├── tsconfig.json            # TS 项目必须；JS 项目不需要
└── package.json
```

> 详细说明见 **[00-directory-structure.md](./00-directory-structure.md)**

---

## 三、启动流程

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

> 各步骤详见对应模块文档（`04-plugins.md`、`01d-router-loader.md`、`06-built-ins.md` 等）

---

## 四、核心写法预览

### 路由

```typescript
// src/routes/users.ts — 挂载前缀 /users
import { defineRoutes } from 'vextjs'

export default defineRoutes((app) => {
  app.get('/list', {
    validate: { query: { page: 'number:1-', limit: 'number:1-100' } },
    middlewares: ['auth'],
  }, async (req, res) => {
    const { page, limit } = req.valid('query')
    const data = await app.services.user.findAll({ page, limit })
    res.json(data)
    // → { code: 0, data: { ... }, requestId: "..." }
  })

  app.post('/', {
    validate: {
      body: { name: 'string:1-50!', email: 'email!', password: 'string:8-!' },
    },
    middlewares: ['auth', { name: 'rate-limit', options: { max: 5 } }],
  }, async (req, res) => {
    const body = req.valid('body')
    const data = await app.services.user.create(body)
    res.json(data, 201)
  })
})
```

### 服务

```typescript
// src/services/user.ts — 无强制基类，构造函数接收 app 即可
export default class UserService {
  constructor(private app: VextApp) {}

  async findAll(opts: { page: number; limit: number }) {
    // this.app.db 由数据库插件注入（后续开发）
    return { list: [], total: 0 }
  }
  async create(data: { name: string; email: string; password: string }) {
    return { id: 1, ...data }
  }
}
```

### 配置

```typescript
// src/config/default.ts — 纯对象，零 import
export default {
  port:    3000,
  adapter: 'hono',

  middlewares: [
    'auth',
    { name: 'rate-limit', options: { max: 100, window: 60 } },
  ],
}
```

### 插件

```typescript
// src/plugins/database.ts
import { definePlugin } from 'vextjs'
import { drizzle }      from 'drizzle-orm/node-postgres'
import { Pool }         from 'pg'

declare module 'vextjs' {
  interface VextApp { db: ReturnType<typeof drizzle> }
}

export default definePlugin({
  name: 'database',
  async setup(app) {
    const pool = new Pool({ connectionString: app.config.database.url })
    await pool.query('SELECT 1')
    app.extend('db', drizzle(pool))
    app.onClose(() => pool.end())
  },
})
```

### package.json

```json
{
  "scripts": {
    "dev":   "vext dev",
    "build": "vext build",
    "start": "vext start"
  }
}
```

---

## 五、决策表

| # | 问题 | 确认结论 |
|---|------|---------|
| Q1 | validate 写法 | ✅ 直接写 DSL 对象，框架内部调 `dsl()` |
| Q2 | service 访问 db | ✅ 构造函数注入 `app`，通过 `this.app.db` 访问 |
| Q3 | handler 参数 | ✅ `(req, res)` 两参数，`app` 通过 `defineRoutes(app => ...)` 闭包访问 |
| Q4 | options 字段范围 | ✅ `validate` + `middlewares` + `override`（`01-routes.md`） |
| Q5 | app.db 结构 | ✅ 后续由 db 插件注入，第一期不实现 |
| Q6 | 热重载机制 | ✅ 三层热重载：Tier 1 Soft Reload（esbuild 单文件编译 + cache 清除 + handler 原子替换，~23ms），Tier 2 全量增量编译（~100ms），Tier 3 冷重启（配置/插件/.env）。Server socket、DB 连接池、Plugin 实例在 Soft Reload 后保持不变。仅 `vext dev` 模式生效 |
| Q7 | app.services 注入 | ✅ 启动时全量扫描，`new Service(app)` 自动注入 |
| Q8 | 响应格式 | ✅ `{ code: 0, data }` / `{ code: 404, message }` 出口包装 |
| Q9 | CLI 启动机制 | ✅ `vext dev` 使用 esbuild 预编译 + Soft Reload（三层热重载），`vext start` 中 TS 项目用 tsx、JS 项目用 node |
| Q10 | 框架配置入口 | ✅ 废除 `vext.config.ts`，配置统一放 `src/config/`（分环境合并） |
| Q11 | public/views 位置 | ✅ 放项目根目录（非源码，不参与编译） |
| Q12 | .env 文件 | ✅ 不需要，环境变量通过系统环境 / CI/CD 注入 |
| Q13 | 中间件加载 | ✅ 白名单机制，`config/default.ts` 的 `middlewares[]` 声明才生效 |
| Q14 | 插件加载 | ✅ `plugins/` 目录自动扫描，无需配置声明；`after` 字段控制顺序 |

---

## 六、中间件三层架构

```
请求进入
  ↓
层 1：框架内置中间件（requestId → cors → body-parser → rateLimit → response-wrapper）
  ↓
层 2：全局中间件（插件通过 app.use() 注册：security headers / APM 等）
  ↓
层 3：路由级中间件（options.middlewares：auth / check-role 等）
  ↓
validate 中间件（schema-dsl 校验）
  ↓
handler
  ↓
出口包装 → { code: 0, data, requestId }
  ↓
响应发出
```

> 详见 **[03-middlewares.md](./03-middlewares.md)**

---

## 七、框架包内部目录结构

```
vextjs/src/
├── types/                    # 框架核心类型定义（集中管理，公共导出）
│   ├── request.ts            # VextRequest 接口（含 valid() 签名）
│   ├── response.ts           # VextResponse 接口（用户可见类型，Omit 排除内部方法）
│   ├── app.ts                # VextApp、VextServices、VextConfig 接口
│   ├── middleware.ts          # VextMiddleware、VextErrorMiddleware、VextMiddlewareFactory
│   ├── adapter.ts            # VextAdapter、VextServerHandle 接口
│   ├── plugin.ts             # VextPlugin、definePlugin 签名
│   ├── errors.ts             # HttpError、VextValidationError 类型
│   └── globals.d.ts          # 全局类型声明（VextApp 等，用户项目无需 import 即可使用）
├── lib/
│   ├── app.ts                # createApp() + VextApp 实现
│   ├── config.ts             # config-loader 合并逻辑
│   ├── define-routes.ts      # defineRoutes() 路由收集
│   ├── router-loader.ts      # routes/ 自动扫描注册
│   ├── middleware-loader.ts  # 按 config 白名单加载中间件
│   ├── plugin-loader.ts      # plugins/ 自动扫描加载
│   ├── service-loader.ts     # services/ 自动扫描注入
│   ├── request-id.ts         # requestId 生成/透传
│   ├── response-wrapper.ts   # 出口包装中间件（_enableWrap 标志，非 monkey-patch）
│   ├── plugin.ts             # definePlugin() 实现
│   ├── request-context.ts    # AsyncLocalStorage 请求上下文
│   ├── logger.ts             # VextLogger 内置实现（pino，插件可替换）
│   ├── http-error.ts         # HttpError + VextValidationError
│   ├── fetch.ts              # app.fetch 内置 HTTP 客户端
│   ├── build/                # vext build 编译（详见 09a-build.md）
│   │   ├── compiler.ts       # BuildCompiler（esbuild 编译 TS→CJS）
│   │   └── shared-esbuild-config.ts  # DevCompiler 和 BuildCompiler 共享的 esbuild 基础配置
│   ├── openapi/              # OpenAPI 自动生成（详见 14-openapi.md）
│   │   ├── index.ts          # 导出入口
│   │   ├── collector.ts      # RouteMetadataCollector — 路由元信息收集
│   │   ├── converter.ts      # SchemaConverter — schema-dsl → JSON Schema
│   │   ├── generator.ts      # OpenAPIGenerator — 文档生成器
│   │   ├── swagger-ui.ts     # Swagger UI HTML 生成
│   │   └── routes.ts         # /openapi.json 和 /docs 端点注册
│   └── dev/                  # 开发热重载（三层 Soft Reload）
│       ├── compiler.ts       # DevCompiler（esbuild 预编译 CJS → .vext/dev/）
│       ├── file-watcher.ts   # fs.watch 文件监听（零依赖，Docker polling 降级）
│       ├── cache-invalidator.ts  # require.cache 反向依赖图清除
│       ├── service-reloader.ts   # 选择性 service 重载
│       ├── route-reloader.ts     # Fresh Adapter 策略
│       ├── i18n-reloader.ts      # locale 热替换
│       └── hot-handler.ts        # HotSwappableHandler（原子替换 requestHandler）
├── adapters/
│   └── hono/                 # Hono 适配器（当前实现）
│       ├── index.ts          # 导出 createHonoAdapter()
│       ├── adapter.ts        # VextAdapter 实现
│       ├── request.ts        # HonoContext → VextRequest 转换
│       └── response.ts       # HonoContext → VextResponse 转换（内建包装 + 延迟绑定）
├── cli/
│   ├── index.ts              # bin 入口（vext dev / start / build / stop / reload / status / create）
│   ├── dev.ts                # ColdRestarter + FileWatcher（详见 11-hot-reload.md）
│   ├── build.ts              # vext build CLI 入口（详见 09a-build.md）
│   ├── start.ts              # 生产模式（tsx 运行，含 cluster 分支 + dist/ 检测）
│   └── create.ts             # vext create 脚手架（P0-3）
└── index.ts                  # 公共导出入口（re-export types/ 下的所有公共类型）
```

---

## 八、模块详细方案索引

| 文件 | 模块 | 状态 |
|------|------|------|
| [00-directory-structure.md](./00-directory-structure.md) | 目录结构 | ✅ 已确认 |
| [01-routes.md](./01-routes.md) | 路由层 | ✅ 已确认 |
| [01a-validate.md](./01a-validate.md) | 校验体系 | ✅ 已确认 |
| [01b-middlewares.md](./01b-middlewares.md) | 路由级中间件 | ✅ 已确认 |
| [01c-response.md](./01c-response.md) | 响应规范（VextRequest / VextResponse） | ✅ 已确认 |
| [01d-router-loader.md](./01d-router-loader.md) | router-loader 实现 | ✅ 已确认 |
| [02-services.md](./02-services.md) | 服务层 | ✅ 已确认 |
| [03-middlewares.md](./03-middlewares.md) | 中间件完整体系 | ✅ 已确认 |
| [04-plugins.md](./04-plugins.md) | 插件系统 | ✅ 已确认 |
| [05-config.md](./05-config.md) | 配置层（分环境合并） | ✅ 已确认 |
| [06-built-ins.md](./06-built-ins.md) | 框架内置模块总览 | ✅ 已确认 |
| [06a-logger.md](./06a-logger.md) | `app.logger` 详解 | ✅ 已确认 |
| [06b-error.md](./06b-error.md) | `app.throw` + `app.setValidator` 详解 | ✅ 已确认 |
| [06c-lifecycle.md](./06c-lifecycle.md) | `app.extend` / `onClose` / `use` / `onReady` 详解 | ✅ 已确认 |
| `07-models.md` | 数据层 | ⏳ 后续开发 |
| [08-adapter.md](./08-adapter.md) | Adapter 层（VextAdapter 接口） | ✅ 已确认 |
| [08a-fastify-adapter.md](./08a-fastify-adapter.md) | Fastify Adapter 原型（P0 — 接口完备性验证） | 📝 设计稿 |
| [09-cli.md](./09-cli.md) | CLI（vext dev / build / start） | ✅ 已确认 |
| [09a-build.md](./09a-build.md) | `vext build` 命令（P0 — esbuild 编译 TS→JS） | 📝 设计稿 |
| [10-testing.md](./10-testing.md) | 测试策略（createTestApp / 分层测试） | ✅ 已确认 |
| [13-monsqlize-plugin.md](./13-monsqlize-plugin.md) | monSQLize 集成（P1 — 连接池共享 + Model 复用 + 事务） | 📝 设计稿 |
| [14-openapi.md](./14-openapi.md) | OpenAPI 自动生成（P1 — schema-dsl→JSON Schema + Swagger UI） | 📝 设计稿 |
| [confirmed.md](./confirmed.md) | 已确认决策清单 | 🔄 持续更新 |

---

## 九、关键约定速查

1. **配置纯对象**：所有 config 文件 `export default { ... }`，`adapter` 等内置选项用字符串标识
2. **`middlewares[]` 按 name patch 合并**：环境文件只写需覆盖的项，其余继承 default
3. **插件自动加载**：`plugins/` 目录全部加载（`_` 开头除外），条件加载在插件内判断
4. **中间件白名单**：`middlewares/` 有文件不代表生效，必须在 `config/default.ts` 声明
5. **多语言错误码按目录加载**：`src/locales/` 下按语言代码命名（`zh-CN.ts`、`en-US.ts`），框架启动时自动扫描加载，详见 `06b-error.md` §1.7
6. **热重载**：`vext dev` 使用三层 Soft Reload（Tier 1: esbuild 单文件编译 + cache 清除 + handler 原子替换 ~23ms / Tier 2: 全量增量编译 ~100ms / Tier 3: 冷重启）。使用 Node.js 内置 `fs.watch`（零依赖），Server socket、DB 连接池、Plugin 实例在 Soft Reload 后保持不变。生产无热重载。详见 `11-hot-reload.md`
7. **双语言**：`.ts` / `.js` / `.mjs` / `.cjs` 均可，扫描器自动识别
8. **`vext build` 可选编译**：`vext build` 使用 esbuild 将 TS 编译为 JS 输出到 `dist/`，`vext start` 检测到 `dist/` 时用 `node` 直接运行（无需 tsx）；未执行 `build` 时降级为 tsx 运行。`vext dev` 仍使用 esbuild 预编译 CJS 到 `.vext/dev/`（热重载专用）。详见 `09a-build.md`

---

## 十、类型索引

| 类型名 | 定义位置 | 说明 |
|--------|---------|------|
| `VextApp` | `types/app.ts` | 应用对象（全局类型，无需 import） |
| `VextConfig` | `types/app.ts` | 运行时配置（`declare module` 可扩展） |
| `VextLogger` | `types/app.ts` | 结构化日志接口 |
| `VextHandler` | `types/middleware.ts` | `(req: VextRequest, res: VextResponse) => void` |
| `VextRequest` | `types/request.ts` | 请求对象（含 `valid()`，`declare module` 可扩展） |
| `VextResponse` | `types/response.ts` | 响应对象（含 `json()` / `status()` / `stream()`） |
| `VextAdapter` | `types/adapter.ts` | 底层 HTTP 框架适配器接口 |
| `VextMiddleware` | `types/middleware.ts` | `(req, res, next) => void` |
| `VextMiddlewareFactory` | `types/middleware.ts` | `(options) => VextMiddleware` |
| `VextPlugin` | `types/plugin.ts` | `{ name, setup, after? }` |
| `HttpError` | `types/errors.ts` | HTTP 错误类 |
| `VextValidationError` | `types/errors.ts` | 校验错误类（422） |
| `VextServices` | `types/app.ts` | `app.services` 类型（用户通过 `declare module` 扩展） |