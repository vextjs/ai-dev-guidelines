# vext 框架实施计划

> **项目**: vext (vextjs)
> **版本**: v1.0
> **创建日期**: 2026-03-03
> **最后更新**: 2026-03-03
> **维护者**: AI 助手（自动更新进度）

---

## 📊 总体进度

```
Phase 0: 骨架验证          [ 0/5]  ░░░░░░░░░░  0%    🔲 未开始
Phase 1: MVP v0.1.0        [ 0/24] ░░░░░░░░░░  0%    🔲 未开始
Phase 2: 开发体验 v0.2.0    [ 0/8]  ░░░░░░░░░░  0%    🔲 未开始
Phase 3: 企业级 v0.3.0      [ 0/6]  ░░░░░░░░░░  0%    🔲 未开始
Phase 4: 正式版 v1.0.0      [ 0/7]  ░░░░░░░░░░  0%    🔲 未开始
─────────────────────────────────────────
总计:                       [ 0/50] ░░░░░░░░░░  0%
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
| 0.1 | 创建 `vext/src/types/` 类型定义（VextApp/VextRequest/VextResponse/VextAdapter/VextMiddleware 等） | 🔲 | 🔴 | 2d | 参考 `00-directory-structure.md` §框架包内部目录 + `01c-response.md` §3/§4 + `08-adapter.md` §1 |
| 0.2 | 实现 `HttpError` + `requestContext` (AsyncLocalStorage) | 🔲 | 🔴 | 0.5d | 参考 `06b-error.md` §1.2 |
| 0.3 | 实现 `createApp()` 骨架（含 `lib/adapter-resolver.ts`，无 loader，仅返回 app 对象结构） | 🔲 | 🔴 | 1d | 参考 `06-built-ins.md` §4 + `08-adapter.md` §5；config.adapter 字符串/对象→实例解析 |
| 0.4 | 实现 Hono Adapter（`createHonoAdapter`，包含 executeChain） | 🔲 | 🔴 | 2d | 参考 `08-adapter.md` §4；注意 next 是 `() => Promise<void>` |
| 0.5 | 实现 `defineRoutes` + 最简 `router-loader` + `vext start` 跑通 hello world | 🔲 | 🔴 | 2d | 验证 VextAdapter 接口是否合理 |

**Phase 0 完成标准**:
- `vext start` 可启动，`GET /` 返回 `{ code: 0, data: 'hello world', requestId: '...' }`
- TypeScript 编译通过（tsc --noEmit 无报错）
- Hono Adapter 的 `registerRoute` + `buildHandler` 接口验证通过

---

## Phase 1: MVP v0.1.0（约 6 周）

**目标**: 完整的 CRUD 应用可以运行

### W3-W4: 核心内置模块

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 1.1 | `lib/config-loader.ts` — default→env→local 三层合并 + deepFreeze | 🔲 | 🔴 | 1.5d | 参考 `05-config.md` §2/§3；注意跳过非纯对象的 deepFreeze（Q23） |
| 1.2 | `lib/middlewares/request-id.ts` — UUID v4 生成/透传 | 🔲 | 🔴 | 0.5d | 参考 `03-middlewares.md` §1.1 |
| 1.3 | `lib/middlewares/cors.ts` — preflight + 响应头 | 🔲 | 🔴 | 0.5d | 参考 `05-config.md` §3.5 |
| 1.4 | `lib/middlewares/body-parser.ts` — JSON + URL-encoded | 🔲 | 🔴 | 0.5d | 参考 `03-middlewares.md` §1.2；maxBodySize 限制 |
| 1.4b | `lib/middlewares/rate-limit.ts` — 集成 flex-rate-limit（内置第 4 号中间件）+ `app.setRateLimiter()` 接口 | 🔲 | 🔴 | 0.5d | 参考 `06-built-ins.md` §1.1 + `06b-error.md` §3.5；flex-rate-limit 在 `E:\MySelf\flex-rate-limit` 已有实现，仅需集成 |
| 1.5 | `lib/middlewares/response-wrapper.ts` — `_enableWrap()` 标志 | 🔲 | 🔴 | 0.5d | 参考 `03-middlewares.md` §5.2；P0-2 修复后的内建包装模式 |
| 1.6 | `lib/middlewares/error-handler.ts` — createErrorHandler 工厂 | 🔲 | 🔴 | 0.5d | 参考 `03-middlewares.md` §5.1；闭包持有 config（Q21） |
| 1.7 | `lib/logger.ts` — pino 封装 VextLogger 接口 | 🔲 | 🟡 | 0.5d | 参考 `06a-logger.md` |
| 1.8 | `lib/http-error.ts` + `lib/default-throw.ts` — schema-dsl I18nError 联动 | 🔲 | 🔴 | 1d | 参考 `06b-error.md` §1；AsyncLocalStorage locale 注入（Q18） |
| 1.8b | `lib/fetch.ts` — `app.fetch` 内置 HTTP 客户端（自动传播 requestId + 结构化日志） | 🔲 | 🟡 | 1d | 参考 `06d-fetch.md` §1~§4；封装 Node 18+ 内置 fetch；依赖 requestContext（1.8 已完成 AsyncLocalStorage） |

### W5-W6: 各 Loader

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 1.9 | `lib/plugin-loader.ts` — 拓扑排序 + setup 超时 + 定时器清理 | 🔲 | 🔴 | 2d | 参考 `04-plugins.md` §2；循环依赖 Fail Fast；超时 clearTimeout（Q22） |
| 1.10 | `lib/middleware-loader.ts` — 白名单加载 + 类型检测 | 🔲 | 🔴 | 1d | 参考 `01b-middlewares.md` §7 |
| 1.11 | `lib/define-middleware.ts` — Symbol 标记 + defineMiddleware/Factory | 🔲 | 🔴 | 0.5d | 参考 `01b-middlewares.md` §4.3 |
| 1.12 | `lib/service-loader.ts` — 嵌套 key + Fail Fast + 跳过 `_` 前缀 | 🔲 | 🔴 | 1d | 参考 `02-services.md` §4 |
| 1.13 | `lib/validate-middleware.ts` — schema-dsl 预编译 + await next() | 🔲 | 🔴 | 1d | 参考 `01a-validate.md` §4；校验顺序 param→query→header→body |
| 1.14 | `lib/router-loader.ts` 完整实现 — Fail Fast + 前缀冲突 + 中间件引用验证 | 🔲 | 🔴 | 2d | 参考 `01d-router-loader.md` |

### W7: Bootstrap + CLI

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 1.15 | `lib/bootstrap.ts` — 步骤 ①~⑨ 完整编排 + 错误边界（Q36）；含内置中间件注册（requestId/cors/body-parser/rate-limit/response-wrapper）顺序编排 | 🔲 | 🔴 | 1.5d | 参考 `06-built-ins.md` §4 + `09-cli.md` §5.1；依赖 1.4b（rate-limit 注册在步骤①中）|
| 1.16 | `lib/shutdown.ts` — SIGTERM/SIGINT + onClose LIFO + timeout | 🔲 | 🔴 | 1d | 参考 `06c-lifecycle.md` §2；_testMode 守卫（Q24） |
| 1.17 | `lib/i18n-loader.ts` — 扫描 src/locales/ + dsl.config 注册 | 🔲 | 🟡 | 0.5d | 参考 `06b-error.md` §1.7 |
| 1.18 | `cli/index.ts` + `cli/start.ts` — vext start 命令 | 🔲 | 🔴 | 1d | 参考 `09-cli.md` §3 |

### W8: 测试 + 包导出

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 1.19 | `testing/index.ts` — createTestApp 工厂 | 🔲 | 🔴 | 1.5d | 参考 `10-testing.md` §2；mockServices + _testMode |
| 1.20 | 单元测试: config-loader + router-loader + service-loader | 🔲 | 🟡 | 1.5d | 参考 `10-testing.md` §3/§4 |
| 1.21 | 集成测试: CRUD 全链路（GET/POST/PUT/DELETE + 422/404/500） | 🔲 | 🔴 | 1.5d | 参考 `10-testing.md` §4 |
| 1.22 | `index.ts` 包导出 + `index.d.ts` 类型声明 + npm publish 测试 | 🔲 | 🟡 | 0.5d | 参考 `package.json` 现有结构 |

**Phase 1 完成标准**:
```
✅ vext start 可启动 Hello World 应用
✅ defineRoutes + 三段式路由正常工作
✅ validate 校验通过/失败响应正确（422 格式）
✅ middlewares 白名单加载 + 路由级引用
✅ service-loader 自动注入 app.services
✅ plugin-loader 拓扑排序 + 超时保护
✅ 统一响应格式 { code: 0, data, requestId }
✅ app.throw + HttpError + i18n（可选 locales）
✅ 配置三层合并（default → env → local）
✅ createTestApp 可用，CRUD 集成测试通过
✅ npm publish 可安装使用
```

---

## Phase 2: 开发体验 v0.2.0（约 4 周）

**目标**: vext dev 三层热重载 + vext build + OpenAPI

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 2.1 | `lib/build/shared-esbuild-config.ts` + `DevCompiler` (transform + rebuild) | 🔲 | 🔴 | 2d | 参考 `11a-dev-compiler.md`；CJS 输出到 `.vext/dev/`；注意 tsconfig 预解析缓存（v2.2 §3 resolvedTsconfigRaw） |
| 2.2a | `lib/dev/hot-swappable-handler.ts` + `lib/dev/cache-invalidator.ts`（反向依赖图 + require.cache 精确清除）+ 失败回退机制 | 🔲 | 🔴 | 3.5d | 参考 `11b-soft-reload.md §2/§3` + `11e-edge-cases.md §1/§4`；路径映射 `resolveCompiled()` 是关键（编码陷阱 T1） |
| 2.2b | `lib/dev/service-reloader.ts`（选择性重载）+ `lib/dev/route-reloader.ts`（Fresh Adapter）+ i18n 热替换 | 🔲 | 🔴 | 3d | 参考 `11b-soft-reload.md §4/§5/§6`；Service 重载需处理嵌套 key（11b §4.2 P0 修复） |
| 2.3 | `lib/dev/file-watcher.ts` + `change-classifier.ts` + Docker polling | 🔲 | 🔴 | 1.5d | 参考 `11c-file-watcher.md`；fs.watch 零依赖 |
| 2.4 | `lib/dev/cold-restarter.ts` + `lib/dev/dev-bootstrap.ts`（bootstrap 不可重载/可重载阶段拆分）+ `cli/dev.ts` | 🔲 | 🔴 | 3d | 参考 `11d-bootstrap-cli.md §1/§2/§3/§4` + `09-cli.md §2`；dev-bootstrap 是 Soft Reload 的前提（原估 1.5d → 3d） |
| 2.5 | `lib/build/build-compiler.ts` + `cli/build.ts` — vext build | 🔲 | 🟡 | 1.5d | 参考 `09a-build.md`；共享 esbuild 配置（Q40） |
| 2.6 | `lib/openapi/` — SchemaConverter + OpenAPIGenerator + /docs + /openapi.json | 🔲 | 🟡 | 3d | 参考 `14-openapi.md`；RouteMetadataCollector 集成到 router-loader |
| 2.7 | 内置 access-log 中间件（请求耗时/状态码/路径） | 🔲 | 🟡 | 0.5d | 利用洋葱模型 after-middleware（`await next()` 后记录） |

**Phase 2 完成标准**:
```
✅ vext dev 三层热重载（Soft Reload + Cold Restart）
✅ vext build 生产编译（dist/）
✅ vext start 检测 dist/ 用 node 运行
✅ /docs Swagger UI 可访问
✅ 修改路由/服务后 < 200ms 生效
✅ 修改配置/插件后正确冷重启
```

---

## Phase 3: 企业级 v0.3.0（约 4 周）

**目标**: Cluster + Fastify Adapter + monSQLize + SSE

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 3.1 | `lib/cluster/master.ts` — Worker 管理 + 信号处理 + PID 文件 | 🔲 | 🟡 | 3d | 参考 `12a-master.md` |
| 3.2 | `lib/cluster/worker.ts` — IPC 通信 + 心跳 + 健康检查 | 🔲 | 🟡 | 2d | 参考 `12b-worker.md`；cluster 内存 rate-limit 警告（Q28） |
| 3.3 | Rolling Restart + 优雅关闭 + `vext reload` / `vext stop` | 🔲 | 🟡 | 2d | 参考 `12c-lifecycle.md` + `09-cli.md` §10 |
| 3.4 | `@vext.js/adapter-fastify` — Fastify Adapter 完整实现 | 🔲 | 🔴 | 3d | 参考 `08a-fastify-adapter.md`；验证 VextAdapter 接口完备性 |
| 3.5 | `vextjs-plugin-monsqlize` — Model 自动加载 + onClose 清理 | 🔲 | 🟡 | 3d | 参考 `13-monsqlize-plugin.md` §2 |
| 3.6 | SSE 支持 — `res.sse()` + 连接管理 | 🔲 | 🟡 | 2d | 基于 `res.stream()` 封装；onClose 清理 |

**Phase 3 完成标准**:
```
✅ cluster 模式可启动多 Worker
✅ vext reload 零停机重启
✅ Fastify Adapter 通过与 Hono Adapter 相同的集成测试套件
✅ monSQLize 插件 CRUD 可用
✅ SSE 推送可用
```

---

## Phase 4: 正式版 v1.0.0（约 4 周）

**目标**: 对外发布就绪

| # | 任务 | 状态 | 优先级 | 估时 | 说明 |
|---|------|:----:|:------:|------|------|
| 4.1 | 性能基准测试 — vs Hono/Fastify 裸跑 benchmark | 🔲 | 🟡 | 2d | 量化框架开销，目标 overhead < 5% |
| 4.2 | `vext create` 脚手架 — 交互式创建项目 | 🔲 | 🟡 | 2d | TS/JS + monSQLize 可选；`09-cli.md` §11 |
| 4.3 | 文档站（rspress）— Guide + API + 示例 | 🔲 | 🔴 | 5d | 现有 `docs-site/` 目录可复用 rspress 配置 |
| 4.4 | 安全加固 — 依赖审计 + CVE 扫描 | 🔲 | 🟡 | 1d | npm audit fix |
| 4.5 | E2E 测试完善 + CI/CD 流水线 | 🔲 | 🔴 | 2d | GitHub Actions；多 Node.js 版本矩阵（18/20/22） |
| 4.6 | 社区准备 — GitHub Issues 模板 + CONTRIBUTING.md + CHANGELOG | 🔲 | 🟡 | 1d | 参考 `monSQLize/` 项目的同类文件 |
| 4.7 | 正式发布 — npm publish `vextjs@1.0.0` + 关联包 | 🔲 | 🔴 | 0.5d | 检查 package.json exports + README |

**Phase 4 完成标准**:
```
✅ benchmark 报告已输出
✅ vext create 可用
✅ 文档站上线
✅ npm publish vextjs@1.0.0 成功
```

---

## 🗺️ 模块依赖拓扑（编码顺序参考）

```
Level 0 — 零依赖（先写）
  types/ · HttpError · requestContext

Level 1 — 依赖 Level 0
  config-loader · logger · defaultThrow · app.fetch

Level 2 — 依赖 Level 1
  createApp · Hono Adapter · defineRoutes

Level 3 — 依赖 Level 2
  内置中间件(requestId/cors/body-parser/response-wrapper/error-handler)
  defineMiddleware · validate 中间件 · i18n-loader

Level 4 — 依赖 Level 3
  plugin-loader · middleware-loader · service-loader · router-loader

Level 5 — 依赖 Level 4
  bootstrap · shutdown

Level 6 — 依赖 Level 5
  CLI(start) · createTestApp

Level 7 — 相对独立
  DevCompiler · FileWatcher · HotSwappableHandler · BuildCompiler
  Cluster · OpenAPI · Fastify Adapter · monSQLize Plugin
```

---

## ⚠️ 关键风险与缓解

| 风险 | 概率 | 影响 | 缓解措施 |
|------|:----:|:----:|---------|
| Phase 0 接口验证发现重大设计缺陷 | 高 | 中 | Phase 0 特意设计为 2 周快速验证，代价最低时修改 |
| 热重载 Soft Reload 实现超预期复杂 | 中 | 高 | 可先上线「仅 Cold Restart」的 `vext dev`，后续迭代补 Tier 1/2 |
| esbuild 路径映射（T1）：源文件↔编译产物路径不同，require.cache 清除时操作对象必须是 `.vext/dev/*.js` 而非 `src/*.ts` | 中 | 中 | `cache-invalidator` 统一通过 `DevCompiler.resolveCompiled()` 映射；Phase 2 先写路径映射单元测试 |
| Cluster 跨 OS 行为差异（主要 Windows） | 中 | 中 | 先支持 Linux（Docker 生产环境），Windows 支持可降级 |
| schema-dsl breaking change 影响 vext | 低 | 高 | 锁定 schema-dsl 版本 + 编写 VextValidator 防腐层（Phase 1 内完成） |
| 单人开发工期超预期 | 中 | 中 | Phase 1 MVP 为最低交付目标，Phase 2-4 可视情况推迟 |

---

## 📝 变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.1 | 2026-03-03 | 合理性验证修正：新增 1.4b(rate-limit)/1.8b(app.fetch)；2.2 拆分为 2.2a/2.2b；2.4 补充 dev-bootstrap；拓扑图 Level 1 补充 app.fetch；风险矩阵补充 T1；任务总数 47→50 |
| v1.0 | 2026-03-03 | 初始版本，基于架构深度分析报告制定 |

