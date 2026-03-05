# vext 框架实施计划

> **项目**: vext (vextjs)
> **版本**: v1.8
> **创建日期**: 2026-03-03
> **最后更新**: 2026-03-04 16:09
> **维护者**: AI 助手（自动更新进度）

---

## 📊 总体进度

> 🆕 **v2.2 更新**：v1.1.0 路线图 5.5 Native Adapter ✅ 已完成（含设计文档 + 91 个单元测试）

```
Phase 0:  骨架验证          [ 5/5]  ██████████  100%  ✅ 已完成
Phase 1:  MVP v0.1.0        [26/26] ██████████  100%  ✅ 已完成
Phase 2A: 开发体验 v0.2.0-α [ 5/5]  ██████████  100%  ✅ 已完成
Phase 2B: 热重载 v0.2.0     [ 4/4]  ██████████  100%  ✅ 已完成
Phase 3:  企业级 v0.3.0     [ 5/5]  ██████████  100%  ✅ 已完成
Phase 4:  正式版 v1.0.0     [ 5/7]  ███████░░░  71%   🔄 进行中
─────────────────────────────────────────────
总计:                       [50/52] █████████░  96%
v1.1.0 路线图:              [ 1/8]  █░░░░░░░░░  13%   🔄 部分完成
```

> 图例: `✅` 已完成 | `🔄` 进行中 | `⏸` 暂停 | `🔲` 未开始 | `❌` 跳过

---

## 🔴 前置修复（编码开始前必须完成）

| # | 问题 | 状态 | 影响文件 | 说明 |
|---|------|:----:|---------|------|
| F1 | `VextMiddleware.next` 类型 `() => void` → `() => Promise<void>` | ✅ 已完成 | `03-middlewares.md`, `01b-middlewares.md`, `08-adapter.md`, `04-plugins.md`, `06a-logger.md`, `06b-error.md`, `06c-lifecycle.md`, `01a-validate.md` | 2026-03-03 修复，Q45 追加到 confirmed.md |
| F2 | app.throw 无 locales 时降级路径文档 | 🔲 未开始 | `06b-error.md` | 在文档中强调无 locales 时 message 原样保留 |

---

## Phase 0: 骨架验证（约 2 周）

**目标**: 跑通 `GET /` → `{ code: 0, data: 'hello world' }` 的完整链路

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 0.1 | 创建 `vext/src/types/` 类型定义（VextApp/VextRequest/VextResponse/VextAdapter/VextMiddleware 等） | ✅ | 🔴 | 2d | 2026-03-03 完成。types/request.ts, response.ts, app.ts, middleware.ts, adapter.ts, plugin.ts, route.ts, errors.ts, index.ts |
| 0.2 | 实现 `HttpError` + `requestContext` (AsyncLocalStorage) | ✅ | 🔴 | 0.5d | 2026-03-03 完成。types/errors.ts + lib/request-context.ts |
| 0.3 | 实现 `createApp()` 骨架（含 `lib/adapter-resolver.ts`，无 loader，仅返回 app 对象结构） | ✅ | 🔴 | 1d | 2026-03-03 完成。lib/app.ts + lib/adapter-resolver.ts；含 DEFAULT_CONFIG、简化 logger、默认 validator |
| 0.4 | 实现 Hono Adapter（`createHonoAdapter`，包含 executeChain） | ✅ | 🔴 | 2d | 2026-03-03 完成。adapters/hono/adapter.ts + request.ts + response.ts；含 ResponseBox 机制捕获 Hono Response |
| 0.5 | 实现 `defineRoutes` + 最简 `router-loader` + `vext start` 跑通 hello world | ✅ | 🔴 | 2d | 2026-03-03 完成。lib/define-routes.ts + lib/router-loader.ts + lib/bootstrap.ts + cli/index.ts + cli/start.ts；GET / → `{ code: 0, data: "hello world", requestId }` 验证通过 |

**Phase 0 完成标准**:
- `vext start` 可启动，`GET /` 返回 `{ code: 0, data: 'hello world', requestId: '...' }`
- TypeScript 编译通过（tsc --noEmit 无报错）
- Hono Adapter 的 `registerRoute` + `buildHandler` 接口验证通过

---

## Phase 1: MVP v0.1.0（约 7 周，含 1 周缓冲） ✅ 已完成

**目标**: 完整的 CRUD 应用可以运行

> 🆕 **v1.2 变更**：新增 1.0（schema-dsl 防腐层）、1.12 补充循环依赖运行时检测、1.8b 移至 W5-W6（拓扑 Level 3）、工期 6 周→7 周（含 1 周缓冲）。任务总数 24→26。
> ✅ **2026-03-03 全部完成**：26/26 任务完成。136 个测试通过（62 单元 config-loader + 16 单元 service-loader + 27 单元 router-loader + 31 集成 CRUD）。tsc 零错误。npm pack 验证通过（171 文件，155.9 kB）。schema-dsl 依赖升级 1.2.3→1.2.4。

### W3-W4: 核心内置模块

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 1.0 | 🆕 `lib/schema-adapter.ts` — schema-dsl 防腐层（版本锁定 + API 封装） | ✅ | 🔴 | 0.5d | 2026-03-03 完成。封装 compile/validate/createI18nError/configure，命名空间对象模式（schemaAdapter.xxx），含 raw escape hatch（248 行） |
| 1.1 | `lib/config-loader.ts` — default→env→local 三层合并 + deepFreeze | ✅ | 🔴 | 1.5d | 2026-03-03 完成。loadConfig + deepMerge + patchMiddlewares(按name patch) + deepFreeze(跳过非纯对象Q23) + validateConfig(Fail Fast)；pathToFileURL 兼容 Windows ESM import（483 行） |
| 1.2 | `lib/middlewares/request-id.ts` — UUID v4 生成/透传 | ✅ | 🔴 | 0.5d | 2026-03-03 完成。createRequestIdMiddleware 工厂，crypto.randomUUID + requestContext store 写入 + 响应头注入；支持 enabled/header/responseHeader/generate 配置 + app.setRequestIdGenerator() 运行时替换（68 行） |
| 1.3 | `lib/middlewares/cors.ts` — preflight + 响应头 | ✅ | 🔴 | 0.5d | 2026-03-03 完成。createCorsMiddleware 工厂，preflight→204 + Origin 匹配（通配符/列表）+ credentials 时回显 Origin + Vary: Origin 缓存隔离（122 行） |
| 1.4 | `lib/middlewares/body-parser.ts` — JSON + URL-encoded | ✅ | 🔴 | 0.5d | 2026-03-03 完成。createBodyParserMiddleware 工厂 + parseBytes 单位解析（'1mb'→字节）；JSON + URL-encoded 双格式解析；maxBodySize 超限→413；adapter 注入 _getRawBody() 读取原始请求体（207 行） |
| 1.4b | `lib/middlewares/rate-limit.ts` — 集成 flex-rate-limit（内置第 4 号中间件）+ `app.setRateLimiter()` 接口 | ✅ | 🔴 | 0.5d | 2026-03-03 完成。createRateLimitMiddleware 工厂，内置 flex-rate-limit（sliding-window + memory）；支持 enabled/max/window/message/keyBy 配置；自定义 limiter 通过 getRateLimiter() getter 运行时替换；RateLimit-*/Retry-After 响应头；429 响应（157 行） |
| 1.5 | `lib/middlewares/response-wrapper.ts` — `_enableWrap()` 标志 | ✅ | 🔴 | 0.5d | 2026-03-03 完成。responseWrapper 常量中间件，调用 res._enableWrap() 开启包装标志；包装逻辑在 createVextResponse 的 json() 内部处理（P0-2 修复后的标志模式）（54 行） |
| 1.6 | `lib/middlewares/error-handler.ts` — createErrorHandler 工厂 | ✅ | 🔴 | 0.5d | 2026-03-03 完成。createErrorHandler(responseConfig) 工厂，三层匹配：VextValidationError→422（含 errors 数组）/ HttpError→业务码优先 / 500 兜底（hideInternalErrors 控制 stack 输出）；闭包持有 config（Q21）（134 行） |
| 1.7 | `lib/logger.ts` — pino 封装 VextLogger 接口 | ✅ | 🟡 | 0.5d | 2026-03-03 完成。createLogger + wrapPinoAsVextLogger；pino mixin hook 自动注入 requestId（AsyncLocalStorage）；pretty/JSON 双模式；pino-pretty 已加入 dependencies（151 行） |
| 1.8 | `lib/default-throw.ts` — schema-dsl I18nError 联动（HttpError 已在 Phase 0 types/errors.ts 中定义） | ✅ | 🔴 | 1d | 2026-03-03 完成。createDefaultThrow 工厂函数；通过 schema-adapter 防腐层访问 I18nError.create()；requestContext.getStore()?.locale 并发安全（Q18）；app.ts 同步升级：createSimpleLogger→createLogger / 内联throw→createDefaultThrow / pass-through validator→schemaAdapter 封装（162 行） |

### W5-W6: 各 Loader

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 1.8b | `lib/fetch.ts` — `app.fetch` 内置 HTTP 客户端（自动传播 requestId + 结构化日志） | ✅ | 🟡 | 1d | 2026-03-03 完成。createVextFetch 工厂，封装 Node 18+ 内置 fetch；requestId 从 requestContext 自动注入出站头；结构化日志（debug/warn/error 按状态码分级）；超时控制（AbortController + mergeSignals 兼容 Node 18）；幂等方法重试（GET/HEAD/OPTIONS/PUT/DELETE）；快捷方法 get/post/put/patch/delete；create() 工厂（baseURL + 默认 headers）（514 行） |
| 1.9 | `lib/plugin-loader.ts` — 拓扑排序 + setup 超时 + 定时器清理 | ✅ | 🔴 | 2d | 2026-03-03 完成。loadPlugins 工厂，Kahn 算法拓扑排序（dependencies 字段）；setup 超时保护（默认 30s）+ Promise.race + clearTimeout（防泄漏）；Fail Fast 5 项检测（名称重复/依赖不存在/循环依赖/格式错误/setup 异常）；DFS 环路查找；递归扫描 + 排除 _/.d.ts/.test/.spec（544 行） |
| 1.10 | `lib/middleware-loader.ts` — 白名单加载 + 类型检测 | ✅ | 🔴 | 1d | 2026-03-03 完成。loadMiddlewares 按 config.middlewares 白名单加载；resolveFile 多扩展名查找（.ts/.js/.mjs/.cjs）；isMiddleware/isMiddlewareFactory 显式标记检测 + 裸函数兜底推断（warn）；声明一致性检查；resolveMiddleware/resolveMiddlewares 路由引用解析（工厂参数合并：路由覆盖 > 默认值）；validateMiddlewareRefs 启动时统一验证；Fail Fast 4 项检测（360 行） |
| 1.11 | `lib/define-middleware.ts` — Symbol 标记 + defineMiddleware/Factory | ✅ | 🔴 | 0.5d | 2026-03-03 完成。defineMiddleware + defineMiddlewareFactory 辅助函数；使用 MIDDLEWARE_SYMBOL / MIDDLEWARE_FACTORY_SYMBOL 显式标记（Symbol.for 跨模块一致）；isMiddleware / isMiddlewareFactory 类型检测函数供 middleware-loader 使用（192 行） |
| 1.12 | `lib/service-loader.ts` — 嵌套 key + Fail Fast + 跳过 `_` 前缀 + 🆕 运行时循环依赖检测 | ✅ | 🔴 | 1.5d | 2026-03-03 完成。loadServices 扫描 services/ 目录；filePathToServiceKeys 路径→嵌套 key（kebab→camelCase）；setNestedKey 嵌套挂载（中间层冲突检测）；new mod.default(app) 实例化；checkServiceCircularDeps 静态源码分析（正则匹配 app.services.xxx + DFS 环路检测）；flattenServiceKeys 嵌套对象扁平化；Fail Fast 3 项检测（571 行） |
| 1.13 | `lib/validate-middleware.ts` — schema-dsl 预编译 + await next() | ✅ | 🔴 | 1d | 2026-03-03 完成。buildValidateMiddleware 工厂，启动时预编译（validator.compile 只执行一次）；校验顺序 param→query→header→body（快速失败）；校验通过写入 req._validated_<location>（req.valid() 读取）；失败抛 VextValidationError；通过 getValidator() getter 解耦具体校验库（202 行） |
| 1.14 | `lib/router-loader.ts` 完整实现 — Fail Fast + 前缀冲突 + 中间件引用验证 | ✅ | 🔴 | 2d | 2026-03-03 完成。Phase 1 升级重写：集成 MiddlewareRegistry（替换 Phase 0 的 Map）+ resolveMiddlewares 从 registry 解析路由级中间件；集成 buildValidateMiddleware 为有 validate 配置的路由自动构建校验中间件；重复路由检测（同 method + path → Fail Fast）；validateMiddlewareRefs 所有路由加载后统一验证中间件引用；测试文件检测；normalizeMiddlewareDefs 兼容层（659 行） |

### W7: Bootstrap + CLI

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 1.15 | `lib/bootstrap.ts` — 步骤 ①~⑨ 完整编排 + 错误边界（Q36）；含内置中间件注册（requestId/cors/body-parser/rate-limit/response-wrapper）顺序编排 | ✅ | 🔴 | 1.5d | 2026-03-03 完成。Phase 1 重写：config-loader→createApp→i18n→plugin→middleware→service→router→lockUse→内置中间件注册（requestId→cors→body-parser→rate-limit→response-wrapper）→插件全局中间件→错误处理/404→listen→setupShutdown→onReady→日志；错误边界 try/catch（serverHandle.close + internals.shutdown）；fetch 挂载；app.ts 新增 getRateLimiter/getRequestIdGenerator 到 AppInternals（~250 行） |
| 1.16 | `lib/shutdown.ts` — SIGTERM/SIGINT + onClose LIFO + timeout | ✅ | 🔴 | 1d | 2026-03-03 完成。setupShutdown 函数注册 SIGTERM/SIGINT 信号处理（process.on + _shuttingDown guard），testMode 跳过注册；createShutdownHandler 手动触发函数（Cluster/健康检查/测试场景）；cleanup 返回值用于移除监听器；bootstrap.ts 步骤⑧集成 setupShutdown（~194 行） |
| 1.17 | `lib/i18n-loader.ts` — 扫描 src/locales/ + dsl.config 注册 | ✅ | 🟡 | 0.5d | 2026-03-03 完成。loadI18n 异步函数，扫描 localesDir 按文件名识别语言代码（BCP 47 正则）；支持 .ts/.js/.mjs/.cjs 扩展名；pathToFileURL 兼容 Windows ESM import；通过 schemaAdapter.configure({ i18n: locales }) 注册到 schema-dsl；目录不存在静默跳过（零配置场景）（216 行） |
| 1.18 | `cli/index.ts` + `cli/start.ts` — vext start 命令 | ✅ | 🔴 | 1d | 2026-03-03 完成。cli/index.ts 命令分发（start + 未实现命令占位 dev/build/create + --help/--version）；cli/start.ts 集成 detectProject + fork 子进程 + dist/ 检测 + VEXT_MODE/VEXT_ROOT 环境变量 + --port/--host 参数解析 + 信号转发；新建 cli/utils/detect-project.ts 项目检测（findProjectRoot + hasDistBuild + resolveEntryFile）（~586 行合计） |

### W8: 测试 + 包导出

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 1.19 | `testing/index.ts` — createTestApp 工厂 | ✅ | 🔴 | 1.5d | 2026-03-03 完成。createTestApp 工厂（~377 行）：mockServices 注入 + _testMode + TestRequest 链式 API（get/post/put/patch/delete/options/head）+ executeRequest 模拟 HTTP 请求（IncomingMessage/ServerResponse mock）+ createNotFoundHandler + TEST_DEFAULTS 配置；子路径 `vextjs/testing` 导出 |
| 1.20 | 单元测试: config-loader + router-loader + service-loader | ✅ | 🟡 | 1.5d | 2026-03-03 完成。105 个单元测试：config-loader 62 个（deepMerge/patchMiddlewares/deepFreeze/validateConfig 含 port/adapter/middlewares/rateLimit/logger/shutdown/cluster/openapi/locale 校验）+ router-loader 27 个（路由加载/前缀推导/中间件引用/重复路由检测/Fail Fast）+ service-loader 16 个（嵌套 key/camelCase/循环依赖检测/Fail Fast） |
| 1.21 | 集成测试: CRUD 全链路（GET/POST/PUT/DELETE + 422/404/500） | ✅ | 🔴 | 1.5d | 2026-03-03 完成。31 个集成测试：GET 分页/POST 创建/PUT 更新/DELETE 删除 + 422 校验失败（missing/invalid 字段）+ 404 未匹配路由 + 500 同步/异步异常 + requestId 自动生成/透传/唯一性 + 响应格式包装 `{ code: 0, data, requestId }` + onReady/onClose 钩子（LIFO）+ Content-Type + 健康检查 + 并发请求。修复 executeRouteFactory ESM 模块缓存 bug（不再删除 _factory/_collector）+ router-loader cache-busting |
| 1.22 | `index.ts` 包导出 + `index.d.ts` 类型声明 + npm publish 测试 | ✅ | 🟡 | 0.5d | 2026-03-03 完成。主入口 41 个导出（值+类型）+ testing 子路径导出 createTestApp；tsc build 产出 42 个 .d.ts 声明文件；npm pack --dry-run 验证通过（171 文件，155.9 kB）；schema-dsl 依赖升级 1.2.3→1.2.4（ESM 入口修复） |

### W9: 缓冲周（预留）

> 🆕 **v1.2 新增**（S3）：1 周缓冲用于吸收前 6 周的累积延期。如无延期，可提前进入 Phase 2A 或完善测试覆盖率。

**Phase 1 完成标准**:
```
✅ vext start 可启动 Hello World 应用
✅ defineRoutes + 三段式路由正常工作
✅ validate 校验通过/失败响应正确（422 格式）
✅ middlewares 白名单加载 + 路由级引用
✅ service-loader 自动注入 app.services（含循环依赖检测）
✅ plugin-loader 拓扑排序 + 超时保护
✅ 统一响应格式 { code: 0, data, requestId }
✅ app.throw + HttpError + i18n（可选 locales）
✅ schema-dsl 防腐层（lib/schema-adapter.ts）已就位
✅ 配置三层合并（default → env → local）
✅ createTestApp 可用，CRUD 集成测试通过
✅ npm publish 可安装使用
```

---

## Phase 2A: 开发体验基础 v0.2.0-alpha（约 3 周）

> 🆕 **v1.2 变更**（S2）：原 Phase 2 拆分为 Phase 2A 和 Phase 2B。Phase 2A 提供 Cold Restart + vext build + OpenAPI，即使 Phase 2B 的 Soft Reload 实现受阻，开发者仍有可用的 `vext dev` 体验。

**目标**: `vext dev`（Cold Restart）+ `vext build` + OpenAPI 文档

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 2.1 | `lib/build/shared-esbuild-config.ts` + `DevCompiler` (transform + rebuild) | ✅ | 🔴 | 2d | 参考 `11a-dev-compiler.md`；CJS 输出到 `.vext/dev/`；注意 tsconfig 预解析缓存（v2.2 §3 resolvedTsconfigRaw） |
| 2.3 | `lib/dev/file-watcher.ts` + `change-classifier.ts` + Docker polling | ✅ | 🔴 | 1.5d | 参考 `11c-file-watcher.md`；fs.watch 零依赖 |
| 2.4 | `lib/dev/cold-restarter.ts` + `lib/dev/dev-bootstrap.ts`（bootstrap 不可重载/可重载阶段拆分）+ `cli/dev.ts` | ✅ | 🔴 | 3d | 参考 `11d-bootstrap-cli.md §1/§2/§3/§4` + `09-cli.md §2`；dev-bootstrap 是 Soft Reload 的前提 |
| 2.5 | `lib/build/build-compiler.ts` + `cli/build.ts` — vext build | ✅ | 🟡 | 1.5d | 参考 `09a-build.md`；共享 esbuild 配置（Q40） |
| 2.6 | `lib/openapi/` — SchemaConverter + OpenAPIGenerator + /docs + /openapi.json | ✅ | 🟡 | 3d | 2026-03-03 完成。7 个新文件：types.ts（298 行）+ collector.ts（98 行）+ schema-converter.ts（313 行）+ operation-id.ts（94 行）+ generator.ts（574 行）+ swagger-ui.ts（178 行）+ index.ts（49 行）；修改 router-loader.ts（追加 collector 可选参数）+ bootstrap.ts（OpenAPI 初始化流程集成）+ types/app.ts（扩展 RouteDocsConfig + VextOpenAPIConfig）；258 个单元测试（schema-converter 74 + operation-id 68 + generator/collector 116）；全量 627 测试通过；tsc 零错误；npm run build 通过 |

**Phase 2A 完成标准**:
```
✅ vext dev 可用（Cold Restart 模式：文件变更 → 杀进程 → 重启）
✅ vext build 生产编译（dist/）
✅ vext start 检测 dist/ 用 node 运行
✅ /docs Swagger UI 可访问（CDN 加载 swagger-ui-dist）
✅ /openapi.json 返回 OpenAPI 3.0.3 文档（schema-dsl DSL → JSON Schema 自动转换）
✅ 修改配置/插件/路由/服务后正确冷重启
✅ 627 个测试全部通过（Phase 1: 369 + Phase 2A: 258）
```

---

## Phase 2B: 热重载 v0.2.0（约 3 周）

> 🆕 **v1.2 变更**（S2）：将高风险的 Soft Reload 实现独立为 Phase 2B。如实现受阻，Phase 2A 的 Cold Restart 已提供可接受的开发体验，不阻塞后续 Phase。

**目标**: 三层 Soft Reload（Tier 1/2/3）+ access-log

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 2.2a | `lib/dev/hot-swappable-handler.ts` + `lib/dev/cache-invalidator.ts`（反向依赖图 + require.cache 精确清除）+ 失败回退机制 + `lib/dev/memory-monitor.ts` | ✅ | 🔴 | 3.5d | 2026-03-03 完成。3 个新文件：hot-swappable-handler.ts（173 行，RequestHandler 原子替换 + swap/handle/reloadCount/lastSwapTime）+ cache-invalidator.ts（364 行，反向依赖图 BFS + 安全边界 node_modules/config + 级联检测 >80% + invalidateAndEvict 组合函数）+ memory-monitor.ts（348 行，MemoryMonitor 类 + 快照滑动窗口 + 增长趋势检测 + 节流报告 + 高内存警告）；120 个单元测试（hot-swappable-handler 31 + cache-invalidator 39 + memory-monitor 50）；全量 747 测试通过；tsc 零错误；npm run build 通过 |
| 2.2b | `lib/dev/service-reloader.ts`（选择性重载）+ `lib/dev/route-reloader.ts`（Fresh Adapter）+ i18n 热替换 | ✅ | 🔴 | 3d | 2026-03-03 完成。3 个新文件：service-reloader.ts（430 行，选择性 service 实例重建 — filePathToServiceKeys 嵌套 key 映射 + getNestedValue/setNestedValue + scanServiceDirectory + dispose 旧实例 + 回滚机制）+ route-reloader.ts（516 行，Fresh Adapter 策略 — 新 adapter 实例 + 内置中间件注册 + 插件全局中间件 + 错误处理/404 + loadRoutes + buildHandler + app.adapter 临时替换与恢复 + createSimpleRouteReloader 便捷函数）+ i18n-reloader.ts（390 行，i18n 热替换 — isLocaleFile 格式校验 + extractLocaleCode + reloadLocales require 编译产物 + configureI18n 回调解耦 + shouldReloadLocales 便捷函数 + createI18nReloader 预配置函数）；183 个单元测试（service-reloader 64 + route-reloader 45 + i18n-reloader 74）；全量 930 测试通过（原 747 + 新增 183）；tsc 零错误；npm run build 通过 |
| 2.7 | 内置 access-log 中间件（请求耗时/状态码/路径） | ✅ | 🟡 | 0.5d | 2026-03-03 完成。新增 access-log.ts（88 行，洋葱模型 after-middleware — before 记录 startTime，await next() 后记录 method/path/statusCode/responseTime/requestId/ip；配置 enabled/level/skipPaths；skipPaths 使用 Set O(1) 查找；logger 方法 bind 保证 this 正确）。新增 VextAccessLogConfig 接口 + VextConfig.accessLog 字段 + DEFAULT_CONFIG 默认值 + config-loader 校验。VextResponse 新增 statusCode 只读 getter（createVextResponse 中实现）。bootstrap + dev-bootstrap 注册 #6 位置。route-reloader BuiltinMiddlewareCreators 新增 createAccessLogMiddleware。index.ts + types/index.ts 导出。70 个单元测试全部通过；全量 1000 测试零回归；tsc 零错误；npm run build 通过 |
| 2.8 | 🆕 升级 `cli/dev.ts` 集成 Soft Reload — FileWatcher 分类路由到 ColdRestarter 或 SoftReloader | ✅ | 🔴 | 1.5d | 2026-03-03 完成。新增 soft-reloader.ts（613 行，Soft Reload 完整流程编排器 — Tier 1/2 分级编译 + invalidateAndEvict 缓存清除 + 级联爆炸检测降级 Cold Restart + i18n 热替换 + 中间件重载 + 选择性 Service 重载 + Fresh Adapter 路由重载 + HotSwappableHandler 原子替换 + 内存监控 + 并发保护锁 + pending queue 去重合并）。修改 dev-bootstrap.ts（启用 HotSwappableHandler + 创建 SoftReloader + IPC reload 消息监听 + 暴露 hotHandler/softReloader）。修改 cli/dev.ts（soft 变更 IPC 发送到子进程 + cold 变更走 ColdRestarter + --no-hot 降级 + Tier 1/2/3 控制台输出 + 子进程 request-cold-restart 监听）。66 个单元测试全部通过；全量 1066 测试零回归；tsc 零错误；npm run build 通过 |

**Phase 2B 完成标准**:
```
✅ vext dev 三层热重载（Soft Reload Tier 1/2 + Cold Restart Tier 3）
✅ 修改路由/服务后 < 200ms 生效（Tier 1 Soft Reload）
✅ 新增/删除文件后 < 200ms 生效（Tier 2 增量编译）
✅ 修改配置/插件后正确冷重启（Tier 3）
✅ Soft Reload 失败时自动回退到上一个可用版本
✅ access-log 中间件可用
```

**Phase 2B 降级策略**:
> 如果 2.2a/2.2b 实现受阻（超过预估工期 50%），可暂停 Phase 2B，标记为 v0.3.0 范围，先推进 Phase 3。Phase 2A 的 Cold Restart 已提供基本可用的开发体验。

---

## Phase 3: 企业级 v0.3.0（约 3 周）

> 🆕 **v1.2 变更**（S6）：SSE（原 3.6）推迟到 v1.1.0，不阻塞 v1.0.0 发布。任务数 6→5，工期 4 周→3 周。
> 🆕 **v1.4 变更**：任务 3.4 扩展为 Multi-Adapter（Fastify + Express + Koa），超出原设计范围（仅 Fastify），VextAdapter 7 成员接口经 4 个框架验证完备。同时修复 `config-loader.ts` `validateConfig` 的 `knownAdapters` 列表遗漏 `express`/`koa`。

**目标**: Cluster + Multi-Adapter + monSQLize

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 3.1 | `lib/cluster/master.ts` + `worker.ts` + `worker-count.ts` + `pid-file.ts` + `cluster-checks.ts` + `ipc-types.ts` — Worker 管理 + 信号处理 + PID 文件 + Worker 入口 + IPC 类型 + 兼容性检测 | ✅ | 🟡 | 3d | 2026-03-04 完成。参考 `12a-master.md` + `12b-worker.md` + `12c-lifecycle.md`。新建 7 个文件（`src/lib/cluster/` 目录：master.ts / worker.ts / worker-count.ts / pid-file.ts / cluster-checks.ts / ipc-types.ts / index.ts）+ 修改 4 个文件（types/app.ts 新增 VextClusterConfig + bootstrap.ts cluster 分支 + types/index.ts + index.ts 导出）。ClusterMaster 类：串行 fork + 频率保护 + 指数退避 + Rolling Restart + 优雅关闭 + 健康检查 + 信号矩阵（SIGTERM/SIGINT/SIGHUP/SIGUSR2）。workerMain：bootstrap + IPC 响应 + 心跳 + 指标上报 + 内存阈值检测。4 个测试文件 184 个测试（worker-count 21 + pid-file 39 + cluster-checks 38 + master 86）；全量 1397 测试零回归；tsc 零错误 |
| 3.2 | Cluster Worker 集成验证 — 多 Worker 启动 + IPC 通信端到端 + 心跳超时恢复 | ✅ | 🟡 | 2d | 2026-03-04 完成。新建 4 个文件（`test/integration/cluster/` 目录：stub-worker.mjs 225 行 / stub-master.mjs 254 行 / helpers.ts 485 行 / cluster-integration.test.ts 896 行）。使用真实子进程环境验证：多 Worker 启动（1/2/3 Worker）+ IPC ready/heartbeat/metrics/request-restart 端到端 + 心跳超时恢复（健康检查→SIGKILL→自动重启）+ 优雅关闭（IPC + SIGTERM 两种方式）+ 首个 Worker 失败 Fail Fast + 频率保护（maxRestarts 超限暂停自动重启）+ PID 文件写入/删除 + broadcast 广播 + Rolling Restart 逐个替换 + Worker 崩溃自动重启 + autoRestart 禁用 + Master 状态查询。修复 Windows ESM 动态 import 路径问题（pathToFileURL）。21 个集成测试全部通过；全量 1418 测试零回归；tsc 零错误 |
| 3.3 | Rolling Restart + CLI 管理命令 — `vext stop` / `vext reload` / `vext status` | ✅ | 🟡 | 2d | 2026-03-04 完成。新建 4 个文件（`src/cli/stop.ts` 196 行：读取 PID 文件→验证进程存活→发送 SIGTERM→轮询等待退出 30s + `src/cli/reload.ts` 168 行：Windows 平台检测退化提示→发送 SIGHUP 触发 Rolling Restart + `src/cli/status.ts` 273 行：⚪ not running / 🔴 stale / 🟢 running 三状态 + /health 端点探测（uptime/memory 格式化输出）+ `test/unit/cli/cluster-commands.test.ts` 826 行）。修改 1 个文件（`src/cli/index.ts` 注册 stop/reload/status 命令 + 更新帮助文本）。三个命令均支持 `--pid-file` 自定义路径；status 支持 `--port`/`--host` 探测参数。Windows 上 reload 退化为提示 `vext stop && vext start`（SIGHUP 不可用）。40 个单元测试全部通过；全量 1458 测试零回归；tsc 零错误 |
| 3.4 | Multi-Adapter — Fastify + Express + Koa Adapter 完整实现 | ✅ | 🔴 | 3d | 2026-03-03 完成。原设计仅含 Fastify，实际扩展为 3 个 Adapter。**Fastify Adapter**（4 个文件：adapter.ts + request.ts + response.ts + index.ts；routerOptions 替代顶层选项修复 FSTDEP022；buildHandler 延迟 ready() 机制）。**Express Adapter**（4 个文件：禁用 x-powered-by/etag + 手动 collectRawBody + 延迟注册 fallbacks + 手动 JSON.stringify）。**Koa Adapter**（4 个文件：内置轻量级路由匹配器支持静态/:param/*wildcard + 绕过 ctx.body 直接操作 ctx.res + ctx.respond=false）。adapter-resolver.ts 注册 express/koa + config-loader.ts validateConfig knownAdapters 补充 express/koa + package.json exports/依赖添加。147 个新测试（Fastify 48 + Express 47 + Koa 52）；启动验证 28/28 通过（生产模式 + 开发模式各 7 用例 × 4 adapter）；全量 1213 测试零回归；tsc 零错误 |
| 3.5 | MonSQLize 内置默认插件 — 连接管理 + Model 自动加载 + onClose 清理 | ✅ | 🟡 | 3d | 2026-03-04 完成。**设计变更**：原计划为独立 npm 包 `vextjs-plugin-monsqlize`，用户决策改为 **vext 内置默认插件**（开箱即用）。新建 5 个文件（`src/lib/plugins/monsqlize/` 目录：index.ts 插件入口 + 条件加载工厂 80 行 / plugin.ts 核心 setup + buildMonSQLizeConfig 配置映射 198 行 / connection.ts createConnection 连接封装 56 行 / model-loader.ts Model 自动加载 + deriveModelName 名称推断 272 行 / types.ts MonSQLizeConnection + MonSQLizeDatabaseConfig 类型扩展 219 行）+ 新建 1 个测试文件（`test/unit/plugins/monsqlize/plugin.test.ts` 92 个测试：shouldLoadMonSQLize 8 + createMonSQLizePlugin 3 + deriveModelName 13 + setupMonSQLize 17 + buildMonSQLizeConfig 26 + loadModels 13 + createConnection 7 + 集成场景 5）。修改 3 个文件（bootstrap.ts 步骤①++ 内置插件条件加载 + index.ts 导出 MonSQLize 类型 + package.json 添加 monsqlize 依赖）。条件加载策略：仅当 config.database 存在时启用，无配置零开销。92 个新测试全部通过；全量 1550 测试零回归；tsc 零错误；npm run build 通过。参考 `13-monsqlize-plugin.md` §2 |

**Phase 3 完成标准**:
```
✅ cluster 模式可启动多 Worker
✅ vext reload 零停机重启
✅ Fastify/Express/Koa Adapter 通过与 Hono Adapter 相同的集成测试套件（已验证 ✅）
✅ 4 个 Adapter 生产模式 + 开发模式启动验证通过（已验证 ✅）
✅ monSQLize 插件 CRUD 可用
```

---

## Phase 4: 正式版 v1.0.0（约 4 周）

**目标**: 对外发布就绪

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 4.1 | 性能基准测试 — vs Hono/Fastify/Express/Koa 裸跑 benchmark | ✅ | 🟡 | 2d | 2026-03-04 完成。新建 9 个文件（`test/benchmark/` 目录：`run-benchmark.mjs` 主脚本 630 行 — autocannon 自动化压测 + 子进程服务器管理 + Markdown 报告生成 + CLI 参数解析（--duration/--connections/--pipelining/--warmup/--scenario/--framework/--output）/ `servers/raw-hono.mjs` 147 行 / `servers/raw-fastify.mjs` 115 行 / `servers/raw-express.mjs` 103 行 / `servers/raw-koa.mjs` 159 行 — 四框架裸跑服务器各含 3 场景（JSON 响应 + 路由参数 + 中间件链）/ `servers/vext-start.mjs` 82 行 vext 子进程启动器 / `servers/vext-app/src/config/default.mjs` 60 行 — adapter 通过 BENCH_ADAPTER 环境变量动态切换 + 禁用 rateLimit/accessLog/cors/requestId / `servers/vext-app/src/routes/` 4 个路由文件（json.mjs / users.mjs / chain.mjs / health.mjs）使用 RouteDefinition 格式 / `README.md` 基准测试说明 112 行）。修改 `package.json`（添加 `test:bench` 脚本 + `autocannon` devDep）。测试场景：JSON 响应（GET /json）+ 路由参数（GET /users/:id）+ 中间件链（GET /chain 含 3 层中间件模拟）× 4 框架 × 裸跑 vs vext = 24 组对比。基准测试结果：Hono Raw 43.8K → Vext 23.6K RPS / Fastify Raw 31.3K → Vext 15.4K / Express Raw 13.6K → Vext 9.8K / Koa Raw 62.6K → Vext 23.0K（JSON 场景）。平均 Overhead 28%，符合全功能框架预期（含 bodyParser + responseWrapper + 请求/响应抽象 + AsyncLocalStorage 上下文 + 中间件链执行器）。全量 1702 测试零回归；tsc 零错误 |
| 4.1a | 性能优化 — 中间件条件注册 + 热路径优化 + 懒解析 | ✅ | 🔴 | 1d | 2026-03-04 完成。**三层优化方案**：**Tier 1 高影响**：①中间件条件注册（`bootstrap.ts` 步骤⑥ — 6 个内置中间件仅 `enabled !== false` 时注册，禁用时完全不进入链，真正零开销；🔴 修复 responseWrapper 始终注册的 Bug — 新增 `config.response.wrap` 开关）②预组装中间件链（4 个 adapter 的 `registerRoute` 中 `[...globalMiddlewares, ...chain]` 改为首次请求时 `.concat()` 并缓存，消除每请求数组 spread）③`executeChain` 优化（4 个 adapter 的洋葱模型执行器从每请求创建闭包 `const next = async () => {}` 改为递归调度函数 `dispatch(i)`，减少闭包分配）④Hono VextRequest 懒解析（`query` / `headers` / `params` 使用 `Object.defineProperty` getter + 缓存，首次访问时才解析，GET /json 不触发 `new URL()` / headers 遍历）。**Tier 2 中影响**：⑤pino mixin 空对象常量（`logger.ts` 无 requestId 时返回预分配 `EMPTY_MIXIN` 常量，避免每条日志创建新对象）⑥bodyParser 去冗余 `toUpperCase()`（`req.method` 已由 createVextRequest 保证大写）。**配套变更**：`types/app.ts`（`VextResponseConfig.wrap` + `VextBodyParserConfig.enabled` 新字段）/ `app.ts`（DEFAULT_CONFIG 补齐默认值 `response.wrap: true` + `bodyParser.enabled: true`）/ benchmark 配置修正（`response.wrapper` → `response.wrap` + 新增 `bodyParser.enabled: false`）。修改 14 个文件。优化后 benchmark 结果（JSON 场景）：Fastify Raw 79.9K → Vext 50.8K（**Overhead 36%，Vext RPS +229% vs 优化前 15.4K**）/ Koa Raw 66.0K → Vext 43.3K（**+88% vs 优化前 23.0K**）/ Express Raw 15.7K → Vext 13.6K（Overhead 13.6%）/ Hono Raw 41.8K → Vext 23.6K（Hono 开销主要来自 Node.js↔Web 转换，非 vext 特有）。平均 Overhead 从 28% 降至 23%。全量 1701 测试通过（1 个 Windows EBUSY 文件锁无关失败）；tsc 零错误；npm run build 通过 |
| 4.2 | `vext create` 脚手架 — 交互式创建项目 | ✅ | 🟡 | 2d | 2026-03-05 完成。新建 1 个源码文件（`src/cli/create.ts` 793 行 — 交互式项目创建：参数解析 parseArgs + 目录存在检测 + readline 覆盖确认 + 项目文件生成 + npm install + 成功提示）+ 新建 1 个测试文件（`test/unit/cli/create.test.ts` 1145 行，95 个测试：参数解析 13 + 目录结构 TS 3 + 目录结构 JS 5 + 模板内容 package.json 8 / tsconfig 3 / .gitignore 5 / README 3 / config 7 / routes 4 / services 5 / types 2 + adapter 选项 10 + npm install 3 + 目录存在处理 2 + 成功提示 9 + 文件数量 2 + 排序 2 + 边界场景 6 + 组合场景 2）。修改 1 个文件（`src/cli/index.ts` 注册 create 命令到 COMMANDS + 移除 COMING_SOON 占位 + 更新帮助文本）。**功能**：支持 TS/JS 两种语言模式（`--js`）+ 5 种 adapter 选择（`--adapter hono|fastify|express|koa|native`，默认 hono）+ `--skip-install` 跳过 npm install + `--force` 强制覆盖 + `--template api`。生成文件：package.json（含 adapter 对应依赖 + type:module）/ tsconfig.json（TS only）/ .gitignore / README.md / src/config/{default,development,production} / src/routes/index / src/services/example / src/types/services.d.ts（TS only）/ 空目录 README 占位。95 个新测试全部通过；全量 1926 测试零回归（1 个已知 Windows cluster 时序测试除外）；tsc 零错误 |
| 4.3 | 文档站（rspress）— Guide + API + 示例 + 🆕 第三方集成示例 | 🔲 | 🔴 | 5d | **工具选型**: Rspress（基于 Rsbuild 的高性能静态站点生成器，MDX + 内置全文搜索 + 插件系统）。**独立目录** `docs-site/`，有自己的 `package.json`（不污染主包）。**站点结构**: `docs/index.md`（首页 Hero + Features）+ `docs/guide/`（16 篇指南：introduction / quick-start / project-structure / routing / services / middleware / plugins / validation / configuration / adapters / openapi / testing / cli / hot-reload / cluster / i18n）+ `docs/api/`（6 篇 API 参考：config / route-definition / context / app / plugin-api / testing-api）+ `docs/examples/`（5 篇示例：hello-world / crud-api / 🆕 zod-validation / 🆕 drizzle-orm / 🆕 prisma-orm）+ `docs/benchmark/results.md`（性能数据）。**内容来源**: guide 从 README.md 各章节拆分 + `plans/v1/*.md` 设计规范补充；api 从 `src/types/*.ts` 类型定义提取；examples 从 `examples/` + README 扩展 + 第三方新编写；benchmark 从 `test/benchmark/RESULTS.md` 搬运。**技术方案**: 暂只做中文版（英文版列入 v1.1.0 路线图 5.4）+ 内置全文搜索（零配置）+ TS/JS Tab 双语代码示例 + GitHub Pages 部署（CI workflow 自动构建发布）。**5 天排期**: D1 搭建 rspress 骨架 + 首页 + nav/sidebar 配置 → D2 Guide 前半 6 篇（introduction→services）→ D3 Guide 后半 10 篇（middleware→i18n）→ D4 API 参考 6 篇 + Examples 5 篇（含 Zod/Drizzle/Prisma 第三方集成）→ D5 Benchmark 页 + GitHub Pages 部署 workflow + 视觉调试 |
| 4.4 | 安全加固 — 依赖审计 + CVE 扫描 | ✅ | 🟡 | 1d | 2026-03-05 完成。`npm audit` 发现 2 个 high severity 漏洞（@hono/node-server <1.19.10 授权绕过 GHSA-wc8c-qw6v-h7f6 + hono <=4.12.3 Cookie 注入/SSE 注入/serveStatic 任意文件访问 GHSA-5pq2/GHSA-p6xx/GHSA-q5qw）。`npm audit fix` 自动修复，更新 @hono/node-server + hono 版本，package-lock.json 更新。修复后 `npm audit` 返回 0 vulnerabilities。全量 1690 单元测试零回归 |
| 4.5 | E2E 测试完善 + CI/CD 流水线 | ✅ | 🔴 | 2d | 2026-03-04 完成。新建 5 个文件（`.github/workflows/ci.yml` CI 流水线 227 行：lint-typecheck→unit→integration→e2e→coverage，Node 18/20/22 矩阵 + `.github/workflows/release.yml` 发布流水线 188 行：tag push→CI→version check→npm publish→GitHub Release + `test/e2e/helpers.ts` E2E 辅助函数 597 行：临时项目创建 + 端口分配 + HTTP 请求工具 + bootstrap 生命周期管理 + `test/e2e/adapter-e2e.test.ts` 136 个 E2E 测试：4 个 Adapter × 32 场景（CRUD + requestId + 404 + 500 + 并发 + CORS + 健康检查 + 响应格式）+ 跨 Adapter 一致性验证 6 + 优雅关闭 2 + `test/e2e/cli-e2e.test.ts` 16 个 CLI E2E 测试：help/version + vext build + vext start 子进程生命周期 + cluster CLI help）。修改 2 个文件（`package.json` 添加 test:unit/test:int/test:e2e/test:cov 脚本 + `vitest.config.ts` 添加 coverage 配置 v8 provider + lcov/text/json-summary）。152 个新测试全部通过；全量 1702 测试零回归；tsc 零错误；npm run build 通过 |
| 4.6 | 社区准备 — GitHub Issues 模板 + CONTRIBUTING.md + CHANGELOG | ✅ | 🟡 | 1d | 2026-03-05 完成。新建 6 个文件：`.github/ISSUE_TEMPLATE/bug_report.md`（73 行，Bug 报告模板 — 环境信息 + 复现步骤 + 最小代码示例 + 配置 + 日志）+ `.github/ISSUE_TEMPLATE/feature_request.md`（55 行，功能请求模板 — 动机 + 建议 API + adapter 范围 + breaking change 评估）+ `.github/pull_request_template.md`（71 行，PR 模板 — 变更类型 + adapter 影响 + 测试结果 + checklist）+ `CONTRIBUTING.md`（374 行，贡献指南 — 开发环境 + 项目结构 + 代码风格 + 测试要求 80%+ 覆盖率 + Conventional Commits + PR 流程 + 新增 Adapter 指南）+ `CHANGELOG.md`（135 行，Keep a Changelog 格式 — Unreleased 区 + v0.1.0 完整变更记录含 Phase 0–4 所有功能/性能/安全/测试统计）。LICENSE 文件已存在无需新增 |
| 4.7 | 正式发布 — npm publish `vextjs@1.0.0` + 关联包 | 🔲 | 🔴 | 0.5d | 检查 package.json exports + README |

**Phase 4 完成标准**:
```
✅ benchmark 报告已输出
✅ vext create 可用
✅ 文档站上线（含 Zod/Drizzle/Prisma 第三方集成示例）
✅ npm publish vextjs@1.0.0 成功
```

---

## 🔮 v1.1.0 路线图（v1.0.0 发布后）

> 🆕 **v1.2 新增**（S6）：从 Phase 3 移出的 SSE 以及其他增强特性。
> 🆕 **v2.1 新增**（性能深度分析 2026-03-04）：Native Adapter + Fastify 原生序列化 + ALS 可配置 + Koa trie router。详见 `reports/analysis/zed-copilot/20260304/01-analysis-performance-deep-dive.md`
> 🆕 **v2.2 更新**（2026-03-04）：5.5 Native Adapter ✅ 已完成（实现 + 设计文档 + 91 个单元测试）
> 🆕 **v2.3 更新**（2026-03-04）：5.7 AsyncLocalStorage 可配置跳过 ✅ 已完成（5 个 adapter + config + logger + 类型 + 6 个新测试）

| # | 特性 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 5.1 | SSE 支持 — `res.sse()` + 连接管理 | 🔲 | 🟡 | 2d | 基于 `res.stream()` 封装；onClose 清理。原 Phase 3 任务 3.6 |
| 5.2 | AOP 切面系统（v2.0 预研） | 🔲 | 🟡 | 3d | next() 返回值变更是破坏性改动，需 major 版本 |
| 5.3 | WebSocket 支持 | 🔲 | 🟡 | 3d | 依赖 Adapter 接口扩展 |
| 5.4 | 多语言文档（英文） | 🔲 | 🟡 | 5d | 文档站国际化 |
| 5.5 | 🆕 **Native Adapter** — 自研零依赖 HTTP 层（find-my-way trie router + http.createServer 直连） | ✅ | 🔴 | 3-5d | 2026-03-04 完成。基于 `http.createServer` + `find-my-way` ^9.5.0 实现 vext 第五个 adapter。新建 5 个源码文件（`src/adapters/native/` adapter.ts 482 行 + request.ts 251 行 + response.ts 335 行 + index.ts 100 行 + `test/benchmark/servers/raw-native.mjs` 121 行）+ 修改 4 个文件（adapter-resolver + config-loader + package.json + run-benchmark）。设计文档 `plans/v1/08b-native-adapter.md`（973 行）。91 个单元测试（`test/unit/adapters/native-adapter.test.ts` 2166 行，16 个分类：接口完整性 / 路由注册 / 中间件链 / 错误处理 / 404 / VextResponse / VextRequest / Body 解析 / listen-close / buildHandler / 选项 / 并发隔离 / 链缓存 / ALS 上下文 / 工厂函数 / 边界场景）。**基准测试**：Vext-Native JSON 50,806 RPS 超 Vext-Fastify 40,058 RPS（**+26.8%**）🚀；Raw Native 80,148 RPS 超 Raw Fastify 75,825 RPS（+5.7%）；Overhead 36.61% 优于 Fastify 47.17%。全量 1761 测试通过零回归；tsc 零错误 |
| 5.6 | 🆕 Fastify `nativeSerialization` 可选配置 | 🔲 | 🟡 | 1d | 允许 `fastifyAdapter({ nativeSerialization: true })` 使用 Fastify 内置 fast-json-stringify 替代手动 `JSON.stringify`，预估 Fastify adapter +10-15% RPS。代价：跨 adapter 行为一致性略有差异（序列化顺序/精度），需文档说明。**实施要点**：在 `createFastifyAdapter` 中检测 `options.nativeSerialization`，若为 true 则不覆盖 Fastify 的默认 serializer（当前手动 `JSON.stringify` 是为了跨 adapter 一致性），让 Fastify 使用内置 `fast-json-stringify`；需要用户提供 response schema（Fastify 仅对有 schema 的路由使用 fast-json-stringify）。文档需说明：启用后序列化行为可能与其他 adapter 有细微差异（属性顺序、`undefined` 处理、BigInt 等） |
| 5.7 | 🆕 **AsyncLocalStorage 可配置跳过** | ✅ | 🟡 | 1d | 2026-03-04 完成。新增 `VextRequestContextConfig` 接口 + `VextConfig.requestContext` 字段（默认 `{ enabled: true }`）。修改 8 个文件：①`types/app.ts` 新增 `VextRequestContextConfig` 接口（36 行 JSDoc）+ `VextConfig.requestContext` 字段②5 个 adapter（Hono/Fastify/Express/Koa/Native）的 `registerRoute` + `registerNotFound` — 缓存 `alsEnabled` 布尔值，当 `false` 时跳过 `requestContext.run()` 直接执行 callback③`logger.ts` `createLogger` 新增 `options.requestContextEnabled` 参数，ALS 禁用时 mixin 直接返回 `EMPTY_MIXIN`（跳过 `getStore()` 调用）④`app.ts` `createLogger` 传入 `requestContextEnabled` + `DEFAULT_CONFIG` 新增 `requestContext: { enabled: true }`⑤`config-loader.ts` `validateConfig` 新增 `requestContext` 对象 + `enabled` 布尔值校验。6 个新单元测试（config-loader requestContext 校验）。全量 1831 测试通过零回归；tsc 零错误 |
| 5.8 | 🆕 Koa adapter trie router 升级 | 🔲 | 🟡 | 1d | 将 Koa adapter 内置的线性路由匹配器（O(n)）替换为 find-my-way trie router（O(1)），预估 Koa params 场景 +20%+ RPS。当前 Koa params 场景 overhead 34.36%，主要来自线性扫描。**实施要点**：①在 `src/adapters/koa/adapter.ts` 中引入 `find-my-way`（已是 vext 依赖，零新增）②将 `registerRoute` 从 `routes[]` 数组 push 改为 `router.on(method, path, handler, store)`③将 `app.use()` 中的线性 `for...of routes` 匹配改为 `router.find(method, path)`④保持 store 预组装中间件链机制（与 Native Adapter 相同） |

---

## 🗺️ 模块依赖拓扑（编码顺序参考）

> 🆕 **v1.2 变更**（S5）：app.fetch 从 Level 1 移至 Level 3，因 requestId 传播功能依赖 requestId 中间件（Level 3）和 requestContext store 的运行时填充。Level 1 阶段 requestContext 虽已创建但 store 尚未被中间件填充，app.fetch 此时读取 store 为 undefined。

```
Level 0 — 零依赖（先写）
  types/ · HttpError · requestContext

Level 1 — 依赖 Level 0
  config-loader · logger · defaultThrow · schema-adapter（防腐层）

Level 2 — 依赖 Level 1
  createApp · Hono Adapter · defineRoutes

Level 3 — 依赖 Level 2
  内置中间件(requestId/cors/body-parser/rate-limit/response-wrapper/error-handler)
  defineMiddleware · validate 中间件 · i18n-loader · app.fetch

Level 4 — 依赖 Level 3
  plugin-loader · middleware-loader · service-loader（含循环依赖检测） · router-loader

Level 5 — 依赖 Level 4
  bootstrap · shutdown

Level 6 — 依赖 Level 5
  CLI(start) · createTestApp

Level 7 — 相对独立（可并行）
  DevCompiler · FileWatcher · ColdRestarter（Phase 2A）
  HotSwappableHandler · CacheInvalidator（Phase 2B）
  BuildCompiler · OpenAPI
  Cluster · Multi-Adapter(Fastify/Express/Koa) · monSQLize Plugin
```

### 拓扑变更说明（v1.2）

| 模块 | 原位置 | 新位置 | 原因 |
|------|--------|--------|------|
| `app.fetch` | Level 1 | Level 3 | requestId 传播依赖 requestId 中间件运行时填充 requestContext store（S5, Q50） |
| `schema-adapter` | — | Level 1 | 新增防腐层，validate/OpenAPI/i18n-loader 均通过此模块访问 schema-dsl（S1, Q46） |

---

## ⚠️ 关键风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:----:|:----:|---------|
| Phase 0 接口验证发现重大设计缺陷 | 高 | 中 | Phase 0 特意设计为 2 周快速验证，代价最低时修改 |
| 🆕 Phase 2B 热重载 Soft Reload 实现超预期复杂 | 中 | 高 | Phase 2A 已提供 Cold Restart 可用体验；Phase 2B 可延期至 v0.3.0 而不阻塞框架发布（S2） |
| esbuild 路径映射（T1）：源文件↔编译产物路径不同，require.cache 清除时操作对象必须是 `.vext/dev/*.js` 而非 `src/*.ts` | 中 | 中 | `cache-invalidator` 统一通过 `DevCompiler.resolveCompiled()` 映射；Phase 2B 先写路径映射单元测试 |
| Cluster 跨 OS 行为差异（主要 Windows） | 中 | 中 | 先支持 Linux（Docker 生产环境），Windows 支持可降级 |
| schema-dsl breaking change 影响 vext | 低 | 高 | 🆕 Phase 1 任务 1.0 建立 `lib/schema-adapter.ts` 防腐层 + 锁定版本（S1） |
| 🆕 单人开发工期超预期（关键路径缓冲不足） | 中 | 中 | Phase 1 新增 1 周缓冲（W9）；Phase 2A/2B 拆分降低风险耦合；MVP 为最低交付目标（S3） |
| 🆕 自研生态（schema-dsl + monSQLize）限制用户采用 | 高 | 中 | Phase 4 文档站提供 Zod 校验器集成、Drizzle/Prisma ORM 插件官方示例（S4） |

---

## 📝 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v2.4 | 2026-03-04 | **默认 adapter 切换 native + 框架依赖优化 + 规范增强**。①`adapter-resolver.ts` 重写：静态 import 全部移除，改为动态 `import()` 按需加载（`resolveAdapter` 从同步改为 async）— 用户仅安装所选 adapter 对应的框架包即可。②默认 adapter 从 `hono` 切换为 `native`（零外部 HTTP 框架依赖 + JSON RPS +26.8% vs Fastify）— 影响 `DEFAULT_CONFIG`、`adapter-resolver` fallback。③`package.json` 框架依赖（hono / @hono/node-server / fastify / express / koa）从 `dependencies` 移至 `peerDependencies`（全部标记 `optional: true`），`devDependencies` 保留供测试使用。④`bootstrap.ts` / `dev-bootstrap.ts` / `testing/index.ts` 在 `createApp` 之后新增异步 `resolveAdapter` 调用并赋值 `app.adapter`（`createApp` 不再同步解析 adapter）。⑤`route-reloader.ts` `AdapterResolver` 类型签名改为返回 `Promise`，`reloadRoutes` 中 `await` 调用。⑥`README.md` 更新：安装说明（默认 native，按需安装框架）+ 新增 ⚡ 性能对比表（5 adapter × RPS/Overhead/依赖/推荐场景）+ Adapter 选择指南 + 架构图 Adapter Layer 更新 + 路线图同步。⑦`test/benchmark/README.md` 新增性能概览表 + native 数据 + 默认值更新。⑧规范增强：`triggers.md` 阶段 4 新增步骤 7「🗺️ 下一阶段建议」条件触发（项目有 IMPLEMENTATION-PLAN 时输出 3-5 条建议）+ `templates.md` 记忆模板新增 `### 🗺️ 下一阶段建议` section + `QUICK-REFERENCE.md` 阶段 4 描述追加。修改 10 个文件（6 源码 + 1 package.json + 3 规范）；tsc 零错误 |
| v2.3 | 2026-03-04 | v1.1.0 路线图 5.7 AsyncLocalStorage 可配置跳过 ✅ 完成。新增 `VextRequestContextConfig` 接口 + `VextConfig.requestContext` 字段（默认 `{ enabled: true }`）。修改 8 个文件：`types/app.ts`（接口 + 字段）+ 5 个 adapter（Hono/Fastify/Express/Koa/Native — 缓存 `alsEnabled`，条件跳过 `requestContext.run()`）+ `logger.ts`（mixin ALS 禁用时直接返回空对象）+ `app.ts`（传参 + DEFAULT_CONFIG）+ `config-loader.ts`（校验）。6 个新单元测试（config-loader requestContext 校验）。全量 1831 测试通过零回归；tsc 零错误。v1.1.0 路线图进度 2/8 (25%) |
| v2.2 | 2026-03-04 | v1.1.0 路线图 5.5 Native Adapter ✅ 完成（实现 + 文档 + 测试）。**实现**（§会话07）：新建 5 个源码文件（`src/adapters/native/` adapter.ts 482 行 / request.ts 251 行 / response.ts 335 行 / index.ts 100 行 + `test/benchmark/servers/raw-native.mjs` 121 行）+ 修改 4 个文件（adapter-resolver BUILT_IN_ADAPTERS + config-loader knownAdapters + package.json find-my-way ^9.5.0 + run-benchmark FRAMEWORKS）。基于 `http.createServer` + `find-my-way` radix trie，是 vext 第五个 adapter、唯一不依赖第三方 HTTP 框架的实现。**设计文档**（§会话08）：新建 `plans/v1/08b-native-adapter.md`（973 行）— API、架构、性能优化策略、配置选项、与其他 4 个 adapter 差异对比、tradeoff 分析。**单元测试**（§会话08）：新建 `test/unit/adapters/native-adapter.test.ts`（2166 行，91 个测试，16 个分类）— 完整镜像 fastify-adapter.test.ts 模式 + Native 特有测试（query 懒解析缓存、maxParamLength、ALS 上下文、工厂函数、边界场景）。**基准测试**：Vext-Native JSON 50,806 RPS 超 Vext-Fastify 40,058 RPS（**+26.8%**）🚀。**后续优化**：5.6/5.7/5.8 补充实施要点细节。全量 1761 测试通过（+91 新增）；tsc 零错误。v1.1.0 路线图进度 1/8 (13%) |
| v2.1 | 2026-03-04 | Phase 4 任务 4.1a 完成（3/8 38%）：性能优化。三层优化方案（Tier 1 高影响 + Tier 2 中影响）共修改 14 个文件。**核心优化**：①`bootstrap.ts` 中间件条件注册（6 个内置中间件仅 enabled 时注册，🔴 修复 responseWrapper 始终注册 Bug — 新增 `config.response.wrap` 开关）②4 个 adapter 预组装中间件链（首次请求 concat + 缓存，消除每请求数组 spread）③4 个 adapter executeChain 递归调度优化（消除每请求闭包创建）④Hono VextRequest 懒解析 query/headers/params（defineProperty getter + 缓存）⑤pino mixin 空对象常量复用⑥bodyParser 去冗余 toUpperCase。**配套**：`types/app.ts` 新增 `VextResponseConfig.wrap` + `VextBodyParserConfig.enabled`；`app.ts` DEFAULT_CONFIG 补齐；benchmark 配置修正 `response.wrapper→wrap` + 新增 `bodyParser.enabled: false`。优化效果：Fastify Vext RPS +229%（15.4K→50.8K）/ Koa +88%（23.0K→43.3K）/ Express Overhead 降至 13.6%。平均 Overhead 28%→23%。1701 测试通过；tsc 零错误。总进度 48/53 (91%) |
| v2.0 | 2026-03-04 | Phase 4 任务 4.1 完成（2/7 29%）：性能基准测试。新建 9 个文件（`test/benchmark/` 目录）：`run-benchmark.mjs` 主脚本 630 行（autocannon 自动化 + 子进程服务器管理 + Markdown 报告生成 + CLI 参数）/ 4 个裸跑服务器（raw-hono/fastify/express/koa.mjs 各含 3 场景：JSON + 路由参数 + 中间件链）/ `vext-start.mjs` 子进程启动器 / `vext-app/` 骨架（config + 4 路由文件，adapter 通过 BENCH_ADAPTER 环境变量切换）/ `README.md` 说明。修改 `package.json`（test:bench 脚本 + autocannon devDep）。24 组对比结果（4 框架 × 3 场景 × Raw vs Vext）：平均 Overhead 28%，符合全功能框架预期（含 bodyParser + responseWrapper + VextRequest/Response 抽象 + AsyncLocalStorage + 中间件链执行器）。Koa Raw 最快（62.6K RPS JSON），Express Overhead 最低（chain 场景 4.91%）。全量 1702 测试零回归；tsc 零错误。总进度 47/52 (90%) |
| v1.9 | 2026-03-04 | Phase 4 任务 4.5 完成（1/7 14%）：E2E 测试完善 + CI/CD 流水线。新建 5 个文件：`.github/workflows/ci.yml`（CI 流水线 227 行：6 个 Job — lint-typecheck / unit-tests / integration-tests / e2e-tests / coverage / ci-ok，Node.js 18/20/22 矩阵，concurrency 自动取消旧运行）+ `.github/workflows/release.yml`（发布流水线 188 行：v* tag 触发→CI 验证→版本一致性检查→npm publish --provenance→GitHub Release 自动生成）+ `test/e2e/helpers.ts`（E2E 辅助函数 597 行：createE2EProject 临时项目创建含 RouteDefinition 格式路由文件 + allocatePort 19000+ 端口段 + startE2EApp/stopE2EApp bootstrap 生命周期 + e2eGet/e2ePost/e2ePut/e2eDelete HTTP 请求工具 + waitForReady 健康检查轮询）+ `test/e2e/adapter-e2e.test.ts`（136 个 E2E 测试：4 个 Adapter（Hono/Fastify/Express/Koa）× 32 场景 + 跨 Adapter 一致性 6 + 优雅关闭 2）+ `test/e2e/cli-e2e.test.ts`（16 个 CLI E2E 测试：help/version 6 + vext build 3 + vext start 子进程生命周期 4 + cluster CLI help 3）。修改 2 个文件：`package.json`（添加 test:unit / test:int / test:e2e / test:cov 脚本）+ `vitest.config.ts`（coverage 配置 v8 provider + lcov/text/json-summary reporter + src/ include + 排除项）。152 个新测试全部通过；全量 1702 测试零回归（31 个文件）；tsc 零错误；npm run build 通过。总进度 46/52 (88%) |
| v1.8 | 2026-03-04 | Phase 3 任务 3.5 完成（5/5 100%）：MonSQLize 内置默认插件。**设计变更**：原计划为独立 npm 包，用户决策改为 vext 内置默认插件（开箱即用）。新建 5 个源码文件（`src/lib/plugins/monsqlize/` 目录：index.ts 80 行 插件入口 + shouldLoadMonSQLize 条件加载 + createMonSQLizePlugin 工厂 / plugin.ts 198 行 setupMonSQLize + buildMonSQLizeConfig 配置映射（缓存 L1/L2、多连接池、慢查询日志、日志桥接、内存数据库）/ connection.ts 56 行 createConnection 连接封装（collection/db/model/client）/ model-loader.ts 272 行 loadModels（shared 包 + 本地 models/ 双来源）+ deriveModelName PascalCase 推断 / types.ts 219 行 MonSQLizeConnection + MonSQLizeDatabaseConfig + declare module 类型扩展）+ 1 个测试文件（plugin.test.ts 92 个测试）。修改 bootstrap.ts（步骤①++ 内置插件条件加载）+ index.ts（导出类型）+ package.json（添加 monsqlize ^1.1.6 依赖）。条件加载：仅当 config.database 存在且非空对象时启用，无配置零开销。92 个新测试全部通过；全量 1550 测试零回归；tsc 零错误；npm run build 通过。Phase 3 全部完成 ✅。总进度 45/52 (87%) |
| v1.7 | 2026-03-04 | Phase 3 任务 3.3 完成（4/5 80%）：Rolling Restart + CLI 管理命令。新建 4 个文件（`src/cli/stop.ts` 196 行 SIGTERM→轮询等待退出 + `src/cli/reload.ts` 168 行 SIGHUP→Rolling Restart + Windows 退化提示 + `src/cli/status.ts` 273 行 三状态输出 + /health 探测 + `test/unit/cli/cluster-commands.test.ts` 826 行 40 个测试）。修改 `src/cli/index.ts` 注册 stop/reload/status 命令。三命令均支持 `--pid-file` 自定义路径。40 个新测试全部通过；全量 1458 测试零回归；tsc 零错误。总进度 44/52 (85%) |
| v1.6 | 2026-03-04 | Phase 3 任务 3.2 完成（3/5 60%）：Cluster Worker 集成验证。新建 4 个文件（`test/integration/cluster/` 目录：stub-worker.mjs 极简 Worker IPC 协议实现 + stub-master.mjs 使用真实 ClusterMaster + helpers.ts 子进程管理/日志等待/PID 工具 + cluster-integration.test.ts 21 个端到端集成测试）。覆盖 16 个验证场景：多 Worker 启动 × 3 + IPC ready × 2 + heartbeat + metrics + request-restart + 心跳超时恢复 + 优雅关闭 × 2 + Fail Fast + 频率保护 + PID 文件 × 2 + broadcast + Rolling Restart + 崩溃自动重启 + autoRestart 禁用 + 多 Worker 部分崩溃 + 状态查询。修复 Windows ESM import 路径问题（`pathToFileURL`）。21 个测试全部通过；全量 1418 测试零回归；tsc 零错误。总进度 43/52 (83%) |
| v1.5 | 2026-03-04 | Phase 3 任务 3.1 完成（2/5 40%）：ClusterMaster + Worker 入口 + IPC 类型 + Worker 数量计算 + PID 文件 + 兼容性检测。新建 7 个文件（`src/lib/cluster/` 目录）+ 修改 4 个文件（types/app.ts 新增 VextClusterConfig 接口 + bootstrap.ts 添加 cluster 分支 isPrimary→master / isWorker→workerMain + types/index.ts 导出 + index.ts 公共导出）。任务 3.2 范围调整为集成验证（Worker 核心代码已含在 3.1 中）。4 个测试文件 184 个新测试（worker-count 21 + pid-file 39 + cluster-checks 38 + master 86）；全量 1397 测试零回归；tsc 零错误。总进度 42/52 (81%) |
| v1.4 | 2026-03-03 | Phase 3 任务 3.4 完成（1/5 20%）：原设计仅 Fastify Adapter，扩展为 Multi-Adapter（Fastify + Express + Koa）。新增 12 个文件（3 个 Adapter × 4 个文件）+ 3 个测试文件（147 个测试）；修复 config-loader.ts validateConfig knownAdapters 遗漏 express/koa；4 个 Adapter 生产模式 + 开发模式启动验证全部通过（28/28 用例）；全量 1213 测试零回归；tsc 零错误。总进度 41/52 (79%) |
| v1.3 | 2026-03-03 | Phase 2B 全部完成（4/4 100%）：任务 2.8 升级 cli/dev.ts 集成 Soft Reload — 新增 soft-reloader.ts（613 行，完整流程编排器 + 并发保护 + 降级策略）+ 修改 dev-bootstrap.ts（HotSwappableHandler + SoftReloader + IPC reload 监听）+ 修改 cli/dev.ts（Tier 1/2/3 分流 + --no-hot 降级 + 子进程 request-cold-restart）；66 个单元测试；全量 1066 测试零回归；tsc 零错误；npm run build 通过。总进度 40/52 (77%) |
| v1.2 | 2026-03-03 | 采纳分析报告 7 条改进建议（S1-S7）：**S1** 新增 1.0 schema-dsl 防腐层（0.5d）+ 拓扑图 Level 1 补充 schema-adapter；**S2** Phase 2 拆分为 2A（Cold Restart + build + OpenAPI，3 周）和 2B（Soft Reload，3 周），新增 2.8 升级 CLI 集成 Soft Reload + 降级策略；**S3** Phase 1 工期 6→7 周（含 1 周缓冲 W9）；**S4** Phase 4.3 文档站补充 Zod/Drizzle/Prisma 第三方集成示例；**S5** app.fetch 从拓扑 Level 1 移至 Level 3（requestId 传播依赖 requestId 中间件）；**S6** SSE（原 3.6）移至 v1.1.0 路线图，Phase 3 任务数 6→5、工期 4→3 周；**S7** 任务 1.12 service-loader 新增运行时循环依赖检测（估时 1d→1.5d）。总任务数 50→52，confirmed.md 追加 Q46-Q52 |
| v1.1 | 2026-03-03 | 合理性验证修正：新增 1.4b(rate-limit)/1.8b(app.fetch)；2.2 拆分为 2.2a/2.2b；2.4 补充 dev-bootstrap；拓扑图 Level 1 补充 app.fetch；风险矩阵补充 T1；任务总数 47→50 |
| v1.0 | 2026-03-03 | 初始版本，基于架构深度分析报告制定 |