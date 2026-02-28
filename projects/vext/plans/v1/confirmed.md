# vext 框架方案 v3 — 已确认内容

> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-28 P0/P1 设计文档追加）
> **状态**: 🔄 部分确认，持续更新中

---

## ✅ 已确认：目录结构

> 详细方案已独立存档：**[00-directory-structure.md](./00-directory-structure.md)**
>
> 后续每个目录模块的详细设计均以该文件为基础展开。

---

## 🔄 待确认清单

以下决策已有建议方案，等待逐条确认：

| # | 问题 | 建议方案 | 状态 |
|---|------|---------|------|
| Q1 | validate 写法 | 直接写 DSL 对象，框架内部调 `dsl()` | ✅ 已确认（`01a-validate.md`）|
| Q2 | service 访问 db | 构造函数注入 `app`，通过 `this.app.db` 访问 | ✅ 已确认（`02-services.md`）|
| Q3 | handler 参数 | `(req, res)` 两个参数，`app` 通过闭包访问 | ✅ 已确认（`01-routes.md`）|
| Q4 | options 字段范围 | `validate` + `middlewares` + `override` | ✅ 已确认（`01-routes.md`）|
| Q5 | app.db 结构 | 后续由 db 插件注入，第一期不实现 | ✅ 已确认（`04-plugins.md`）|
| Q6 | 热重载机制 | 三层热重载：Tier 1 Soft Reload（esbuild 单文件编译 + cache 清除 + handler 原子替换，~23ms），Tier 2 全量增量编译（~100ms），Tier 3 冷重启（配置/插件/.env）。Server socket、DB 连接池、Plugin 实例在 Soft Reload 后保持不变。仅 `vext dev` 模式生效 | ✅ 已确认（`11-hot-reload.md`）|
| Q7 | app.services 注入 | 启动时全量扫描，框架自动 `new Service(app)` | ✅ 已确认（`02-services.md`）|
| Q8 | 响应格式 | `{ code: 0, data }` / `{ code: 404, message }` | ✅ 已确认（`01c-response.md`）|
| Q9 | CLI 启动机制 | `vext dev` 使用 esbuild 预编译 + Soft Reload（三层热重载），`vext start` 中 TS 项目用 tsx、JS 项目用 node | ✅ 已确认（`09-cli.md`、`11-hot-reload.md`）|
| Q10 | `app.use()` 锁定时机 | 步骤⑤ router-loader 完成后立即锁定（`_lockUse()`），而非 `_runReady` 阶段 | ✅ 已确认（`06-built-ins.md`、`06c-lifecycle.md`）|
| Q11 | 中间件类型声明 | `defineMiddleware()` / `defineMiddlewareFactory()` 显式 Symbol 标记，替代运行时推断 | ✅ 已确认（`01b-middlewares.md`、`03-middlewares.md`）|
| Q12 | 中间件禁用方式 | `{ name: 'xxx', enabled: false }` 为唯一禁用 API；不引入 `remove` / `replace` 语义 | ✅ 已确认（`05-config.md`）|
| Q13 | 插件 setup 安全模式 | 先注册 `app.onClose()` 再执行 I/O（确保失败时也能清理资源） | ✅ 已确认（`04-plugins.md`）|
| Q14 | schema-dsl ↔ HttpError 依赖方向 | 严格单向：vextjs 依赖 schema-dsl；vextjs 调用 `I18nError.create()` 获取翻译结果，再构造 HttpError 抛出（**P0 修正**：不再 try/catch `SchemaError`，改用 `I18nError.create()` 返回实例） | ✅ 已确认（`06b-error.md`）|
| Q15 | `app.throw` message 语义 | 同时兼容 i18n key 和原始文本：schema-dsl 查找 key，找到则翻译，未找到则原样保留 | ✅ 已确认（`06b-error.md`）|
| Q16 | 测试策略 | `createTestApp()` 工厂 + 分层测试（单元 / 集成 / E2E）；默认禁用插件和外部 I/O | ✅ 已确认（`10-testing.md`）|
| Q17 | `req.valid<T>()` 类型安全 | `<T>` 是纯 IDE 辅助，非运行时安全保证。schema-dsl 已保证数据正确性，JS 用户直接 `req.valid('body').xxx`，TS 用户可选加 `<T>` 或 `as any`。原 P0-2 降级为 P2（文档改善）。如需完整类型推导，通过 `app.setValidator()` 切换 Zod | ✅ 已确认（`01a-validate.md` §5 P0-2→P2 降级说明）|
| Q18 | Locale 并发安全 | `Locale.currentLocale` 是全局静态变量，并发请求互相覆盖（竞态 Bug）。改为通过 AsyncLocalStorage（`requestContext`）存储请求级 locale，`defaultThrow` 显式传 locale 给 `I18nError.create()` 第 4 参数。**禁止**在中间件中调用 `Locale.setLocale()` | ✅ 已确认（`06b-error.md` P0 修复）|
| Q19 | `app.throw` 参数插值 | `app.throw(status, message, paramsOrCode?, code?)` — 第三参数智能识别：`number` → 业务码，`object` → i18n 插值参数（`{{#xxx}}`）。与 schema-dsl 的 `paramsOrLocale` 智能识别模式一致 | ✅ 已确认（`06b-error.md` P1 改进）|
| Q20 | 多语言错误码加载方式 | 默认按目录加载（`src/locales/`），框架启动时自动扫描 `zh-CN.ts`、`en-US.ts` 等并通过 `dsl.config({ i18n })` 注册。用户零配置即可使用。编程式 `Locale.addLocale()` 作为可选覆盖方式（适合远程配置中心等动态场景） | ✅ 已确认（`06b-error.md` §1.7、`00-directory-structure.md`）|
| Q21 | 错误处理器作用域 | `globalErrorHandler` 改为工厂函数 `createErrorHandler(config)` → 通过闭包持有 `config` 引用。之前直接引用外部 `app` 变量会导致 ReferenceError | ✅ 已确认（`01c-response.md`、`03-middlewares.md` P0 修复）|
| Q22 | 插件超时定时器泄漏 | plugin-loader 的 `setTimeout` 必须在 `setup()` 完成后 `clearTimeout`，否则定时器持有的闭包引用无法被 GC 回收 | ✅ 已确认（`04-plugins.md` P1 修复）|
| Q23 | `deepFreeze` 非纯对象 | `deepFreeze` 跳过 `Date` / `RegExp` / `Map` / `Set` / `Buffer` / `TypedArray` 等非纯对象，冻结这些对象会破坏其内部 slot | ✅ 已确认（`05-config.md` P1 修复）|
| Q24 | `shutdown()` 测试兼容 | `shutdown()` 增加 `config._testMode` 守卫：测试模式下不调用 `process.exit(0)`，允许测试进程继续运行。`createTestApp` 默认设置 `_testMode: true` | ✅ 已确认（`06-built-ins.md`、`10-testing.md` P1 修复）|
| Q25 | `locale` 配置项 | 新增 `config.locale` 配置段：`default`（默认语言）+ `supported`（支持的语言列表）。请求的 locale 不在 `supported` 中时 fallback 到 `default` | ✅ 已确认（`05-config.md` §3.14、`06b-error.md` §1.7.3）|
| Q26 | Cluster 配置位置 | 配置位于 `config/default.ts` 的 `cluster` 字段（非独立文件），环境变量 `VEXT_CLUSTER` 可覆盖 | ✅ 已确认（`05-config.md` §3.15、`12-cluster.md`）|
| Q27 | Cluster CLI 命令 | 新增 `vext stop` / `vext reload` / `vext status` 三个命令 | ✅ 已确认（`09-cli.md` §10）|
| Q28 | 健康检查端点统一 | cluster 模式复用已有 `/health`（`05-config.md` §3.6），扩展响应字段（workerId/pid/memory），不另建 `/_health` | ✅ 已确认（`12e-observability.md`）|
| Q29 | Sticky IP hash 算法 | 使用 FNV-1a（轻量级，无 FIPS 限制），不用 MD5 | ✅ 已确认（`12d-deploy.md` §5）|
| Q30 | `--daemon` 模式 | 第一期不支持。Docker 部署无需 daemon，传统部署用 systemd 管理 | ✅ 已确认 |
| Q31 | Dev 模式编译方案 | esbuild 预编译统一输出 CJS .js 到 `.vext/dev/`，解决 ESM require.cache 无法清除问题。不再使用 tsx loader | ✅ 已确认（`11a-dev-compiler.md`）|
| Q32 | Dev 模式文件监听 | 使用 Node.js 内置 `fs.watch`（零依赖），不再使用 chokidar。Docker bind mount 自动降级 polling | ✅ 已确认（`11c-file-watcher.md`）|
| Q33 | VextAdapter.buildHandler() | 新增 `buildHandler()` 方法：构建 requestHandler 但不启动 server。dev 模式 Soft Reload 每次创建 fresh adapter 后调用 | ✅ 已确认（`08-adapter.md` §1、`11b-soft-reload.md` §5）|
| Q34 | `dev.hot` 配置项 | 原 `dev.hmr`（进程重启）已废弃。新 `dev.hot`（默认 `true`）= 启用 Soft Reload；`false` = 所有变更走冷重启。新增 `dev.poll` / `dev.pollInterval` / `dev.debounce` | ✅ 已确认（`05-config.md` §3.12）|
| Q35 | `app.fetch` 内置 HTTP 客户端 | 封装 Node.js fetch，自动传播 `x-request-id` + 结构化日志。支持 `create()` 工厂、超时、重试。插件可通过 `app.setFetch()` 替换 | ✅ 已确认（`06d-fetch.md`）|
| Q36 | bootstrap 错误边界 | try/catch 包裹步骤 0~⑧，失败时清理 serverHandle.close() + internals.shutdown()。修复 13-audit-report B-2 P0 | ✅ 已确认（`09-cli.md` §5.1）|
| Q37 | P0-1: `res.status(N).json(data)` 状态码丢失修复 | 采用「延迟绑定 + 内建包装」方案：(1) `createVextResponse(c, () => req.requestId)` 传 getter 函数，json() 实际调用时才取 requestId；(2) 包装逻辑内建于 `json()` 方法，通过 `_wrapEnabled` 标志控制；(3) response-wrapper 中间件仅调用 `res._enableWrap()`，**不再 monkey-patch** `res.json`；(4) 204 使用 `c.body(null)` 确保 RFC 9110 合规（P1-7 一并修复）。变更文件：`08-adapter.md` §4.2/§4.4/§9.2、`01c-response.md` §4/§5 | ✅ 已确认（`08-adapter.md`、`01c-response.md` P0-1 修复）|
| Q38 | P2-5/P2-6: `registerNotFound` + `errorHandler` 边界修复 | (1) `registerNotFound` 内联生成 requestId（从 `x-request-id` header 读取或 `crypto.randomUUID()`），确保 404 响应也有有效 requestId；(2) `errorHandler` 调用外包 try/catch 安全网，防止 handler 自身抛异常导致非 JSON 纯文本 500。变更文件：`08-adapter.md` §4.2 | ✅ 已确认（`08-adapter.md` P2-5/P2-6 修复）|
| Q39 | P1-6/P2-7: README.md 过期信息修正 | (1) 热重载描述从「chokidar + 进程重启」更新为「fs.watch + 三层 Soft Reload」；(2) 决策表 Q6/Q9 与 confirmed.md 对齐；(3) 框架内部目录结构从 `dev-watcher.ts` 更新为 `lib/dev/` 子目录（compiler/file-watcher/cache-invalidator 等）；(4) 关键约定 #6/#8 更新 | ✅ 已确认（`README.md` P1-6/P2-7 修复）|
| Q40 | P0: `vext build` 命令 | esbuild 全量编译 TS→JS 输出到 `dist/`；复用 DevCompiler 的 esbuild 管线（共享配置 `shared-esbuild-config.ts`）；`vext start` 检测到 `dist/` 时用 `node` 直接运行（无需 tsx），未 build 时降级为 tsx；支持 `--clean` / `--no-sourcemap` / `--minify` / `--typecheck` 参数；JS 项目跳过编译；Docker 多阶段构建推荐。变更文件：`09-cli.md`（概述/命令解析/扩展规划）、新增 `09a-build.md` | ✅ 已确认（`09a-build.md`）|
| Q41 | P0: Fastify Adapter 原型 | 独立包 `@vext.js/adapter-fastify`；完整实现 VextAdapter 7 个方法；禁用 Fastify 内置 body 解析（`removeAllContentTypeParsers`）交由 vext body-parser 处理；手动 `JSON.stringify` 避免 Fastify 自动序列化；`buildHandler()` 使用 `fastify.routing()`；发现 3 个潜在接口改进建议（`buildHandler` async 签名、`rawBody` 属性、`setApp()` 方法）。变更文件：新增 `08a-fastify-adapter.md` | ✅ 已确认（`08a-fastify-adapter.md`）|
| Q42 | P1: monSQLize 集成方案 | 默认且仅支持 monSQLize，不做多 ORM 适配层；用户如需其他 ORM 自行编写插件（`definePlugin` + `app.extend`）；微服务场景采用「共享 Model 包 + 连接配置共享」方案（A+C 混合）— Model 定义独立为 `@project/models` npm 包，所有服务引用同一包；各服务独立连接池（进程隔离 + 故障隔离），通过 `maxPoolSize` 控制连接数；事务支持 MongoDB 原生 Session（单服务内）+ monSQLize Saga 编排器（跨服务）；暴露 `app.db.client` 供高级场景使用。变更文件：新增 `13-monsqlize-plugin.md` | ✅ 已确认（`13-monsqlize-plugin.md`）|
| Q43 | P1: OpenAPI 自动生成 | 三段式路由 options 天然映射 OpenAPI；路由 options 新增 `docs` 字段（summary / description / tags / operationId / responses / deprecated / security / hidden）；router-loader 通过 `RouteMetadataCollector` 收集元信息；`SchemaConverter` 将 schema-dsl DSL→JSON Schema；`OpenAPIGenerator` 生成 OpenAPI 3.0 文档；内置 `/docs`（Swagger UI CDN）和 `/openapi.json` 端点；dev 模式默认启用，production 默认关闭（可配置覆盖）；响应自动包装为 `{ code: 0, data, requestId }` 格式。变更文件：新增 `14-openapi.md` | ✅ 已确认（`14-openapi.md`）|
| Q44 | P1: `docs.responses` 响应配置 | `docs.responses` 支持按 HTTP 状态码定义响应（`description` + `schema` + `headers` + `example` + `examples`）；schema 格式与 validate 一致（schema-dsl DSL 字符串对象）或 JSON Schema 对象或 `$ref` 引用字符串；成功响应（2xx）自动包装为 vext 标准格式 `{ code: 0, data: <schema>, requestId }`，错误响应（4xx/5xx）直接使用原始 schema；204 No Content 无响应体；未声明 responses 时默认添加 200 OK 引用 `SuccessResponse` schema。变更文件：`14-openapi.md` §1 | ✅ 已确认（`14-openapi.md` §1）|
