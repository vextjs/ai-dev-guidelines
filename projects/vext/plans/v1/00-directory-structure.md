# 00 - 目录结构方案

> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-26 框架 types 目录 + req.valid 类型修复）
> **状态**: ✅ 已确认
> **说明**: 后续每个目录模块的详细设计以本文件为基础展开

---

## 用户项目目录结构

```
my-app/
├── src/
│   ├── routes/              # 路由层
│   ├── services/            # 服务层
│   ├── middlewares/         # 路由级中间件（config/default.ts 白名单声明才加载）
│   ├── plugins/             # 插件（启动时自动扫描加载，无需配置声明）
│   ├── locales/             # 多语言错误码（app.throw i18n，按目录自动加载）
│   │   ├── zh-CN.ts         # 中文错误码 + 业务码
│   │   └── en-US.ts         # 英文错误码 + 业务码
│   ├── utils/               # 用户工具函数
│   ├── types/               # 类型声明目录（TS 项目使用；JS 项目可省略）
│   │   ├── app.d.ts         # VextApp / VextConfig 扩展（插件注入的 db、cache 等）
│   │   ├── services.d.ts    # VextServices 扩展（所有 service 的类型声明）
│   │   └── env.d.ts         # process.env 补充类型（可选）
│   ├── config/              # 配置层（分环境覆盖）
│   │   ├── default.ts       # 默认配置（所有配置项的基准值）  ← JS 项目用 default.js
│   │   ├── development.ts   # 开发环境覆盖（覆盖 default）   ← JS 项目用 development.js
│   │   ├── production.ts    # 生产环境覆盖（覆盖 default）   ← JS 项目用 production.js
│   │   └── local.ts         # 本地覆盖（最高优先级，不提交 git）
│   └── models/              # 数据层（后续开发）
│
├── .vext/                   # 框架运行时目录（自动生成，加入 .gitignore）
│   └── dev/                 # esbuild 编译产物（vext dev 模式，CJS .js + source map）
│       ├── routes/          # 编译后的路由文件
│       ├── services/        # 编译后的服务文件
│       └── ...              # 与 src/ 结构一一对应
│
├── public/                  # 静态资源（后续开发）
├── views/                   # 模板视图（后续开发）
├── .gitignore               # 应包含 .vext/
├── tsconfig.json            # TS 项目必须；JS 项目不需要
└── package.json
```

> `.vext/dev/` 目录由 `vext dev` 的 esbuild 预编译器自动生成（详见 `11a-dev-compiler.md`），所有用户源码编译为 CJS `.js` + source map。**必须加入 `.gitignore`**。

> **JS / TS 双语言支持**：框架扫描器（routes / services / plugins）自动识别 `.ts`、`.js`、`.mjs`、`.cjs`，无需额外配置。
> - **TS 项目**：`vext dev / start` 内部使用 `tsx` 直接运行，无需提前编译
> - **JS 项目**：内部使用 `node`（ESM 项目需在 `package.json` 设置 `"type": "module"`）
> - **类型提示**：TS 项目通过 `globals.d.ts` 获得全局类型；JS 项目运行时行为完全一致，无类型提示（可配合 JSDoc 获得部分提示）

---

## 配置合并优先级

```
local.ts  >  production.ts / development.ts  >  default.ts
```

框架 CLI 的 `config-loader` 按 `NODE_ENV` **自动读取并合并**，用户无需写 `index.ts`：

1. 加载 `config/default.ts`（必须存在，包含所有必填配置）
2. 按 `NODE_ENV` 加载 `config/development.ts` 或 `config/production.ts`（只写需要覆盖的字段）
3. 尝试加载 `config/local.ts`（不存在则静默跳过）
4. 三者深度合并，得到最终配置

所有配置文件统一使用**纯对象导出，零 import**（除非用到第三方模块）：

```bash
vext dev                         # NODE_ENV=development（默认）
NODE_ENV=production vext start   # 生产，自动加载 production.ts
```

---

## config/default.ts — 所有配置项的基准

```typescript
// src/config/default.ts — 纯对象，无需任何 import
export default {
  port:    3000,
  adapter: 'hono',          // 框架内置 adapter 用字符串标识

  middlewares: [
    'auth',
    { name: 'rate-limit', options: { max: 100, window: 60 } },
    'check-role',
  ],
}
```

---

## config/development.ts — 开发环境覆盖

```typescript
// src/config/development.ts — 只写需要覆盖的字段
export default {
  middlewares: [
    { name: 'rate-limit', options: { max: 9999 } },
  ],
}
```

---

## config/production.ts — 生产环境覆盖

```typescript
// src/config/production.ts
export default {
  port: 8080,
  middlewares: [
    { name: 'rate-limit', options: { max: 50, window: 60 } },
  ],
}
```

---

## locales/ — 多语言错误码文件示例

```typescript
// src/locales/zh-CN.ts — 中文错误码
export default {
  // 用户域 — 4xxxx
  'user.not_found':            { code: 40001, message: '用户不存在' },
  'user.email_taken':          { code: 40002, message: '邮箱已被注册' },
  'user.disabled':             { code: 40003, message: '账户已被禁用' },

  // 认证域 — 2xxxx
  'auth.token_expired':        { code: 20001, message: 'Token 已过期' },
  'auth.token_invalid':        { code: 20002, message: 'Token 无效' },
  'auth.forbidden':            { code: 20003, message: '无权访问该资源' },

  // 业务域 — 5xxxx（带参数插值）
  'balance.insufficient':      { code: 50001, message: '余额不足，当前 {{#balance}} 元，需要 {{#required}} 元' },
  'order.limit_exceeded':      { code: 50002, message: '订单数量超出限制，最多 {{#max}} 单' },
}
```

```typescript
// src/locales/en-US.ts — 英文错误码（code 必须与中文一致）
export default {
  'user.not_found':            { code: 40001, message: 'User not found' },
  'user.email_taken':          { code: 40002, message: 'Email already registered' },
  'user.disabled':             { code: 40003, message: 'Account has been disabled' },

  'auth.token_expired':        { code: 20001, message: 'Token expired' },
  'auth.token_invalid':        { code: 20002, message: 'Token invalid' },
  'auth.forbidden':            { code: 20003, message: 'Access denied' },

  'balance.insufficient':      { code: 50001, message: 'Insufficient balance: {{#balance}}, required {{#required}}' },
  'order.limit_exceeded':      { code: 50002, message: 'Order limit exceeded, max {{#max}}' },
}
```

> **约定**：同一 key 在所有语言文件中的 `code` 必须一致（前端按 `code` 判断错误类型，不依赖语言）。
> 文件格式支持 `.ts` / `.js` / `.mjs` / `.cjs`，`export default { ... }` 导出纯对象。
> 详细使用方式见 **[06b-error.md §1.7](./06b-error.md)**。

---

## 模块职责速览

| 目录 / 文件 | 职责 | 开发阶段 |
|------------|------|---------|
| `routes/` | 路由注册，HTTP 层，调用 service | 第一期 |
| `services/` | 业务逻辑，class 封装，注入到 `app.services` | 第一期 |
| `middlewares/` | 路由级中间件，白名单加载（`config/default.ts` 声明才生效） | 第一期 |
| `plugins/` | 全局能力挂载，**自动扫描加载**，无需配置声明 | 第一期 |
| `utils/` | 用户自定义工具函数 | 第一期 |
| `types/` | 类型声明：第三方模块补充 `.d.ts` + 共享业务类型（`User`、`ApiResponse` 等） | 第一期 |
| `config/default.ts` | 所有配置项基准值（port、adapter、middlewares 白名单等） | 第一期 |
| `config/development.ts` | 开发环境覆盖 default | 第一期 |
| `config/production.ts` | 生产环境覆盖 default | 第一期 |
| `config/local.ts` | 本地覆盖，最高优先级，加入 `.gitignore` | 按需 |
| `locales/` | 多语言错误码定义（`app.throw` i18n），按目录自动加载 | 第一期 |
| `models/` | 数据层，db 访问封装 | 后续开发 |

---

## vext 框架包内部目录结构

```
vext/src/
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
│   ├── define-routes.ts      # defineRoutes() + 三段式路由封装
│   ├── router-loader.ts      # routes/ 文件路由自动扫描加载
│   ├── middleware-loader.ts  # 按 config 白名单加载路由级中间件
│   ├── plugin-loader.ts      # plugins/ 目录自动扫描加载
│   ├── service-loader.ts     # services/ 自动扫描 + 构造函数注入
│   ├── request-id.ts         # requestId 生成/透传/注入（框架核心，非插件）
│   ├── response-wrapper.ts   # 出口包装中间件（_enableWrap 标志，非 monkey-patch）
│   ├── plugin.ts             # definePlugin() 实现
│   ├── request-context.ts    # AsyncLocalStorage 请求上下文
│   ├── logger.ts             # VextLogger 内置实现（pino，插件可替换）
│   ├── http-error.ts         # HttpError 类（app.throw 内置实现）+ VextValidationError
│   ├── fetch.ts              # app.fetch 内置 HTTP 客户端
│   └── dev/                  # 开发模式热重载（esbuild 预编译 + Soft Reload，详见 11-hot-reload.md）
│       ├── compiler.ts       # DevCompiler（esbuild 预编译器）
│       ├── cold-restart.ts   # ColdRestarter（Tier 3 进程替换）
│       ├── file-watcher.ts   # VextFileWatcher（fs.watch + polling 降级）
│       ├── cache-invalidator.ts  # require.cache 反向依赖图 + 精确清除
│       ├── service-reloader.ts   # 选择性 Service 重载
│       ├── route-reloader.ts     # Fresh Adapter 路由重载
│       └── dev-bootstrap.ts      # Dev 模式 bootstrap 入口
├── adapters/
│   └── hono/                 # Hono 适配器（当前实现）
│       ├── index.ts          # 导出 createHonoAdapter()
│       ├── adapter.ts        # VextAdapter 实现
│       ├── request.ts        # HonoContext → VextRequest 转换
│       └── response.ts       # HonoContext → VextResponse 转换（内建包装 + 延迟绑定）
├── cli/
│   ├── index.ts              # bin 入口（vext dev / start / stop / reload / status / create）
│   ├── dev.ts                # ColdRestarter + FileWatcher（详见 11-hot-reload.md）
│   ├── start.ts              # 生产模式（tsx 运行，含 cluster 分支）
│   └── create.ts             # vext create 脚手架（P0-3）
└── index.ts                  # 公共导出入口（re-export types/ 下的所有公共类型）
```

> **类型组织原则**：所有公共类型定义集中在 `types/` 目录，`lib/` 目录仅包含实现代码。
> `index.ts` 统一 re-export `types/` 下的类型，用户通过 `import type { VextApp } from 'vextjs'` 访问。
> `types/globals.d.ts` 声明全局类型（如 `VextApp`），用户项目中无需 import 即可使用。

---

## 启动流程

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

---

## 关键约定

1. **`public/` `views/` 放项目根目录**：非 TypeScript 源码，运行时直接读取
2. **无 `app.ts` / `index.ts` / `env.ts`**：config 目录只有 `default.{ts,js}` + 环境文件，框架自动按 `NODE_ENV` 合并
3. **插件自动加载**：`plugins/` 目录里的文件启动时全部加载；需要条件性加载时，在插件内部自行判断 `process.env.NODE_ENV`
4. **中间件白名单**：`middlewares/` 里有文件不代表生效，必须在 `config/default.ts` 的 `middlewares[]` 中声明
5. **配置文件纯对象**：所有 config 文件直接 `export default { ... }`，零 import（除非用到第三方模块）；`adapter` 等内置选项用字符串标识，框架内部解析
6. **`middlewares[]` 按 name patch 合并**：环境文件只写需要覆盖的中间件项，其余继承 default；`default` 中不存在的 name 则追加
7. **多语言错误码按目录加载**：`src/locales/` 下按语言代码命名文件（`zh-CN.ts`、`en-US.ts`），框架内置插件启动时通过 `dsl.config({ i18n })` 自动扫描加载，详见 `06b-error.md` §1.7
8. **热重载（仅开发模式）**：`vext dev` 使用三层热重载架构（详见 `11-hot-reload.md`）——业务代码变更走 Soft Reload（~23ms，Server/DB/Plugin 保持不变），配置/插件/.env 变更走冷重启。编译产物输出到 `.vext/dev/`（须加入 `.gitignore`）。生产模式 `vext start` 无热重载
9. **CLI 驱动启动**：用户项目无需 `app.ts` / `server.ts`；`vext dev` 使用 esbuild 预编译，`vext start` 中 TS 项目用 `tsx` 运行，JS 项目用 `node` 运行
10. **双语言支持**：`.ts` / `.js` / `.mjs` / `.cjs` 均可，扫描器自动识别
11. **Dev 模式限制**：`vext dev` 将所有源码编译为 CJS，因此 **不支持 top-level await**（CJS 固有限制，需包裹在 async 函数中）。不支持 tsconfig `paths` 别名（建议使用相对路径 import）。这些限制仅影响 dev 模式，不影响生产模式（`vext start`）

---

## 后续模块详细方案索引

| 文件 | 模块 | 状态 |
|------|------|------|
| `01-routes.md` | 路由层 | ✅ 已输出 |
| `01a-validate.md` | 校验体系 | ✅ 已输出 |
| `01b-middlewares.md` | 路由级中间件 | ✅ 已输出 |
| `01c-response.md` | 响应规范 | ✅ 已输出 |
| `01d-router-loader.md` | router-loader 实现 | ✅ 已输出 |
| `02-services.md` | 服务层 | ✅ 已输出 |
| `03-middlewares.md` | 中间件完整体系 | ✅ 已输出 |
| `04-plugins.md` | 插件系统 | ✅ 已输出 |
| `05-config.md` | 配置层（分环境合并机制） | ✅ 已输出 |
| `06-built-ins.md` | 框架内置模块总览（索引入口） | ✅ 已输出 |
| `06a-logger.md` | `app.logger` 详解 | ✅ 已输出 |
| `06b-error.md` | `app.throw` + `app.setValidator` 详解 | ✅ 已输出 |
| `06c-lifecycle.md` | `app.extend` / `onClose` / `use` / `onReady` 详解 | ✅ 已输出 |
| `06d-fetch.md` | `app.fetch` 内置 HTTP 客户端（请求追踪） | ✅ 已输出 |
| `07-models.md` | 数据层 | ⏳ 后续开发 |
| `08-adapter.md` | Adapter 层（VextAdapter 接口） | ✅ 已输出 |
| `09-cli.md` | CLI（vext dev / start） | ✅ 已输出 |
| `10-testing.md` | 测试策略（createTestApp / 分层测试） | ✅ 已输出 |
| `11-hot-reload.md` | 热重载（dev 模式）| ✅ 已输出 |
| `12-cluster.md` | 多进程 Cluster（Master/Worker/Rolling Restart/Docker）| ✅ 已输出 |
