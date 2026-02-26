# Vext v3 — 热重载设计方案（总览）

> **文档编号**: 11-hot-reload.md  
> **状态**: 设计稿 v2.2（修复路径解析 / 嵌套 Service / FileWatcher / 并发保护）  
> **最后更新**: 2026-02-28  
> **关联文件**: `06c-lifecycle.md`, `09-cli.md`, `05-config.md`, `08-adapter.md`, `12-cluster.md`  
> **拆分自**: 原 `11-hot-reload.md` v2.1（2315 行 → 6 个子文档）

---

## 子文档索引

本方案已拆分为以下子文档，每个子文档聚焦一个模块：

| 文档 | 内容 | 关键类/函数 |
|------|------|------------|
| **[11-hot-reload.md](./11-hot-reload.md)**（本文） | 总览、架构、分类规则、性能对比、实施计划 | `classifyChange()` |
| **[11a-dev-compiler.md](./11a-dev-compiler.md)** | esbuild 预编译器 | `DevCompiler` |
| **[11b-soft-reload.md](./11b-soft-reload.md)** | Soft Reload 核心流程、缓存失效、服务/路由/i18n 重载 | `HotSwappableHandler`, `reloadServices()`, `reloadRoutes()` |
| **[11c-file-watcher.md](./11c-file-watcher.md)** | 文件监听器、变更分类器、Docker 兼容 | `VextFileWatcher`, `classifyChange()` |
| **[11d-bootstrap-cli.md](./11d-bootstrap-cli.md)** | Cold Restart、Bootstrap 改造、CLI 集成 | `ColdRestarter`, `devBootstrap()`, `devCommand()` |
| **[11e-edge-cases.md](./11e-edge-cases.md)** | 边界情况、安全措施、失败回退 | — |

---

## 目录

- [1. 问题分析](#1-问题分析)
- [2. 核心思路：三层重载架构](#2-核心思路三层重载架构)
- [3. 文件分类规则](#3-文件分类规则)
- [4. 性能预估](#4-性能预估)
- [5. 开发体验对比](#5-开发体验对比)
- [6. 实施计划](#6-实施计划)
- [附录 A: v2 → v2.2 变更摘要](#附录-a-v2--v22-变更摘要)
- [附录 B: 与 Node.js 内置 --watch 的对比](#附录-b-与-nodejs-内置---watch-的对比)
- [附录 C: ESM 兼容性说明](#附录-c-esm-兼容性说明)
- [附录 D: 替代方案评估（Lazy Proxy 模式）](#附录-d-替代方案评估lazy-proxy-模式)

---

## 1. 问题分析

### 1.1 当前方案的痛点

之前的 `vext dev` 设计采用 **子进程全量重启** 策略：

```
文件变更 → kill 子进程(SIGTERM/SIGKILL) → fork 新子进程 → 重新 bootstrap
```

**问题**：

| 痛点 | 影响 | 频率 |
|------|------|------|
| 每次修改都需完整 bootstrap（加载配置、插件、建立 DB 连接等） | 重启耗时 1-5s（含 DB 连接） | 每次保存 |
| 端口释放/重绑竞争 | 偶发 EADDRINUSE 错误 | ~5% |
| DB 连接池重建 | 浪费资源，可能触发连接数上限 | 每次保存 |
| WebSocket / SSE 长连接全部断开 | 前端需要重连逻辑 | 每次保存 |
| 内存中缓存全部丢失 | 开发时需反复构造测试状态 | 每次保存 |

### 1.2 目标

- **修改业务代码（路由/服务/中间件）时**：**不重启进程**，保持端口、DB 连接、缓存不变，200ms 内生效
- **修改配置文件时**：执行完整冷重启（这是正确且必要的）
- **零外部依赖**：仅使用 Node.js 内置模块（`fs`, `path`, `module`）+ `esbuild`（devDependency）
- **ESM 完整支持**：用户可自由使用 `import`/`export`，框架内部通过 esbuild 统一编译为 CJS
- **Docker 兼容**：不依赖 inotify 特殊配置（提供 polling 降级）
- **安全可靠**：reload 失败时自动回退到上一个可用版本
- **Dev/Prod 一致**：hot reload 走与生产环境完全一致的 adapter 代码路径

---

## 2. 核心思路：三层重载架构

```
┌──────────────────────────────────────────────────────────────────────┐
│                         vext dev (主进程)                             │
│                                                                      │
│  ┌─────────────┐     ┌──────────────────────────────────────────┐    │
│  │  FileWatcher │────▶│          Change Classifier               │    │
│  │  (fs.watch)  │     │                                          │    │
│  └─────────────┘     │  配置文件?  ──YES──▶ Tier 3: Cold Restart  │    │
│                      │     │                 (kill+fork)          │    │
│                      │     NO                                    │    │
│                      │     │                                     │    │
│                      │     ▼                                     │    │
│                      │  Soft Reload ──▶ IPC 通知子进程            │    │
│                      │  (携带变更类型: modify / add / delete)      │    │
│                      └──────────────────────────────────────────┘    │
│                                     │                                │
│                                     │ IPC: { type: 'reload',        │
│                                     │        files: [{ path, type }] │
│                                     │      }                         │
│                                     ▼                                │
│  ┌───────────────────────────────────────────────────────────────┐   │
│  │                    Worker 子进程                                │   │
│  │                                                               │   │
│  │  ┌──────┐  ┌────────┐  ┌──────────┐  ┌───────────────────┐   │   │
│  │  │Server│  │DB Pool │  │  Plugin   │  │   Soft Reload     │   │   │
│  │  │Socket│  │(保持)   │  │ Instances │  │    Handler        │   │   │
│  │  │(保持) │  │        │  │  (保持)   │  │                   │   │   │
│  │  └──────┘  └────────┘  └──────────┘  └────────┬──────────┘   │   │
│  │                                                │              │   │
│  │  ┌─────────────────────────────────────────────┘              │   │
│  │  │                                                            │   │
│  │  │  分级编译（v2.1+）:                                         │   │
│  │  │  ├─ Tier 1 (modify): transform() 单文件编译 (~3ms, O(1))   │   │
│  │  │  └─ Tier 2 (add/delete): rebuild() 全量增量 (~80ms)        │   │
│  │  │                                                            │   │
│  │  │  1. 清除 require.cache (编译产物及其依赖树)                  │   │
│  │  │  2. 选择性重载 service (仅 invalidated 的实例)              │   │
│  │  │  3. 创建新 adapter 实例，重新注册 routes/mw                 │   │
│  │  │     （未变更模块 require 命中缓存 ~0.01ms/个）               │   │
│  │  │  4. adapter.buildHandler() → 原子替换 requestHandler        │   │
│  │  │  5. 完成 → 新请求走新代码，旧请求走旧代码                    │   │
│  │  │                                                            │   │
│  └──┴────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

**核心原则**:

1. Server socket、DB 连接池、已加载的插件实例、app 对象 **在 soft reload 时全部保持不变**。只有路由注册表、变更的 service 实例、中间件定义被重新加载。
2. **分级编译**（v2.1 新增）：代码变更（95% 场景）使用 `esbuild.transform()` 单文件编译，耗时与项目大小无关（O(1)）。仅在新增/删除文件时才走 `ctx.rebuild()` 全量增量编译。
3. **选择性服务重载**（v2.1 新增）：仅重新实例化 invalidation set 中的 service，避免未变更 service 的构造函数副作用重复执行。
4. **esbuild 预编译**：用户源码（TS/ESM/CJS）统一编译为 CJS `.js`，`require.cache` 清除对所有文件一视同仁，ESM 问题彻底消失。详见 **[11a-dev-compiler.md](./11a-dev-compiler.md)**。
5. **Adapter 实例重建**：每次 soft reload 创建全新的 adapter 实例（如 Hono），确保 dev/prod 走同一条代码路径。未变更的路由文件 `require()` 命中缓存，实际 I/O 开销极低。详见 **[11b-soft-reload.md](./11b-soft-reload.md)**。

---

## 3. 文件分类规则

### 3.1 分类表

| 分类 | 路径模式 | 变更动作 | 原因 |
|------|----------|----------|------|
| **Cold（冷重启）** | `src/config/**` | 完整 kill + fork | 配置影响全局行为（端口、DB URI、插件开关等） |
| **Cold** | `package.json` | 完整 kill + fork | 依赖变更 |
| **Cold** | `.env`, `.env.*` | 完整 kill + fork | 环境变量影响全局 |
| **Cold** | `src/plugins/**` | 完整 kill + fork | 插件在启动时执行 setup，可能注册 app 属性、hook |
| **Cold** | `tsconfig.json` | 完整 kill + fork | 编译配置影响 esbuild 行为 |
| **Soft（热替换）** | `src/routes/**` | Soft Reload | 路由 handler 可安全重载 |
| **Soft** | `src/services/**` | Soft Reload | 服务类可安全重新实例化 |
| **Soft** | `src/middlewares/**` | Soft Reload | 中间件定义可安全重载 |
| **Soft** | `src/locales/**` | Soft Reload | i18n 文件可热替换 |
| **Soft** | `src/utils/**`, `src/lib/**`, `src/helpers/**` | Soft Reload | 工具函数被路由/服务依赖，级联刷新 |
| **Ignore（忽略）** | `node_modules/**` | 无动作 | — |
| **Ignore** | `dist/**`, `build/**`, `.vext/**` | 无动作 | 编译产物不触发二次重载 |
| **Ignore** | `.git/**` | 无动作 | — |
| **Ignore** | `test/**`, `tests/**` | 无动作 | — |
| **Ignore** | `*.md`, `*.txt`, `*.log` | 无动作 | — |

### 3.2 分类器实现

```ts
// lib/dev/change-classifier.ts

export interface ChangeClassification {
  action: 'cold' | 'soft' | 'ignore';
  reason: string;
}

const COLD_PATTERNS = [
  /^src\/config\//,
  /^package\.json$/,
  /^\.env(\..*)?$/,
  /^src\/plugins\//,
  /^tsconfig\.json$/,
];

const IGNORE_PATTERNS = [
  /^node_modules\//,
  /^dist\//,
  /^build\//,
  /^\.vext\//,
  /^\.git\//,
  /^test(s)?\//,
  /\.(md|txt|log|lock)$/,
  /^plans\//,
  /^docs\//,
];

export function classifyChange(relativePath: string): ChangeClassification {
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(relativePath)) {
      return { action: 'ignore', reason: `matched ignore pattern: ${pattern}` };
    }
  }

  for (const pattern of COLD_PATTERNS) {
    if (pattern.test(relativePath)) {
      return { action: 'cold', reason: `config/plugin change: ${pattern}` };
    }
  }

  // 默认：src/ 下的 .ts/.js/.mjs 文件走 soft reload
  if (/^src\/.*\.(ts|js|mjs|cjs)$/.test(relativePath)) {
    return { action: 'soft', reason: 'source code change' };
  }

  return { action: 'ignore', reason: 'unrecognized file type' };
}
```

### 3.3 用户自定义分类

用户可在 `config/default.ts` 的 `dev` 字段中覆盖默认分类：

```ts
// src/config/default.ts
export default {
  dev: {
    // 将某些文件强制归为 cold restart
    coldPatterns: [
      'src/lib/database-schema.ts',  // 数据库 schema 变更需要冷重启
    ],
    // 将某些文件强制归为 ignore
    ignorePatterns: [
      'src/generated/**',  // 自动生成的文件不触发 reload
    ],
  },
};
```

---

## 4. 性能预估

### 4.1 不同项目规模下的 Tier 1（代码变更）耗时预估

| 步骤 | 50 文件 | 200 文件 | 500 文件 | 2000 文件 |
|------|--------|---------|---------|----------|
| 编译 (`transform` 单文件) | ~3ms | ~3ms | ~3ms | ~3ms |
| 缓存清除 | ~1ms | ~1ms | ~1ms | ~2ms |
| 中间件加载 (缓存命中) | ~0.5ms | ~1ms | ~2ms | ~5ms |
| 服务选择性重载 | ~2ms | ~2ms | ~2ms | ~2ms |
| 路由加载+注册 (缓存命中) | ~5ms | ~15ms | ~35ms | ~120ms |
| 构建+替换 | ~1ms | ~1ms | ~1ms | ~1ms |
| **总计** | **~12ms** | **~23ms** | **~44ms** | **~133ms** |

> 注：2000 文件（~1000 路由）已是极大规模的 API 项目。即便如此，~133ms 仍远优于冷重启的 ~2000ms，
> 且保持了 socket/DB 连接/内存缓存。路由加载+注册中的 `require()` 对已缓存模块仅为 Map 查找（~0.01ms/个）。

### 4.2 两种编译路径对比

| 维度 | Tier 1: `compileSingle()` | Tier 2: `rebuildWithNewEntryPoints()` |
|------|--------------------------|--------------------------------------|
| 触发条件 | 文件内容修改（`modify`） | 新增文件（`add`）/ 删除文件（`delete`） |
| 频率 | ~95% | ~5% |
| 机制 | `esbuild.transform()` 逐文件 | `esbuild.context().rebuild()` 全量 |
| 扫描文件数 | 仅变更的 1-N 个文件 | 所有源文件 |
| 耗时（200 文件项目） | ~3ms | ~50-100ms |
| 耗时（2000 文件项目） | ~3ms | ~250-600ms |
| 与项目大小的关系 | **O(changed)** — 无关 | **O(all)** — 线性 |

---

## 5. 开发体验对比

### 5.1 全量重启 vs Soft Reload

| 指标 | 全量重启 (旧) | Soft Reload v2.2 (新) |
|------|-------------|----------------------|
| 修改路由 handler | ~2000ms | **~23ms** (T1) |
| 修改 service 方法 | ~2000ms | **~25ms** (T1) |
| 修改中间件实现 | ~2000ms | **~25ms** (T1) |
| 修改 i18n 文案 | ~2000ms | **~20ms** (T1) |
| 修改工具函数 | ~2000ms | **~35ms** (T1, 级联较多) |
| 新增路由文件 | ~2000ms | **~100ms** (T2) |
| 删除路由文件 | ~2000ms | **~100ms** (T2) |
| 修改 config | ~2000ms | ~2000ms (T3, cold) |
| 修改 plugin | ~2000ms | ~2000ms (T3, cold) |
| 端口中断 | ✅ 有 (EADDRINUSE 风险) | ❌ 无 |
| DB 连接中断 | ✅ 有 | ❌ 无 |
| 长连接断开 | ✅ 有 | ❌ 无 |
| 内存缓存保持 | ❌ 丢失 | ✅ 保持 |
| ESM 支持 | ✅ | ✅（esbuild 编译为 CJS） |
| Dev/Prod 一致性 | — | ✅（同一 adapter 代码路径） |

### 5.2 开发者控制台输出示例

```
╔══════════════════════════════════════════════╗
║             Vext Dev Server v2.2             ║
║──────────────────────────────────────────────║
║  🟢 T1 (code):   routes, services, i18n     ║
║  🟡 T2 (struct): new/delete files            ║
║  🔴 T3 (cold):   config, plugins, .env      ║
║  ⚪ Ignored:     tests, docs, node_modules   ║
╠══════════════════════════════════════════════╣
║  Press r=restart  h=reload  c=clear  ^C=quit║
╚══════════════════════════════════════════════╝

[vext dev] esbuild compiled 47 files in 62ms
[vext dev] watching E:\project\src for changes...
[vext dev] server ready at http://localhost:3000 (startup: 1234ms)

  🟢 src/routes/user.ts (modify)
[hot-reload] ✅ 23ms [T1:code] (compile:3ms cache:1ms i18n:0ms mw:1ms svc:0ms route:17ms swap:1ms) [4 modules evicted]

  🟢 src/services/auth.ts (modify)
  🟢 src/services/user.ts (modify)
[hot-reload] ✅ 31ms [T1:code] (compile:5ms cache:2ms i18n:0ms mw:1ms svc:8ms route:14ms swap:1ms) [7 modules evicted, 2 services reloaded]

  🔴 src/config/database.ts (cold)
[vext dev] config change detected → cold restart...
[vext dev] esbuild compiled 47 files in 58ms
[vext dev] cold restart complete (1156ms)

  🟢 src/locales/zh-CN.ts (modify)
[hot-reload] ✅ 15ms [T1:code] (compile:3ms cache:1ms i18n:6ms mw:1ms svc:0ms route:3ms swap:1ms) [1 modules evicted]

  🟢 src/routes/new-endpoint.ts (add) [NEW FILE]
[hot-reload] ✅ 95ms [T2:structural] (compile:68ms cache:2ms i18n:0ms mw:1ms svc:0ms route:23ms swap:1ms) [2 modules evicted]
```

---

## 6. 实施计划

本方案的实施建议按以下优先级分阶段进行：

**Phase 1 — 核心骨架（必须先完成）**：

1. 实现 `DevCompiler`（含 `start()` / `compileSingle()` / `compileFiles()` / `rebuild()` / `rebuildWithNewEntryPoints()`）→ **[11a-dev-compiler.md](./11a-dev-compiler.md)**
2. 实现 `HotSwappableHandler` + `softReload()` 分级编译流程 → **[11b-soft-reload.md](./11b-soft-reload.md)**
3. 实现选择性 `reloadServices()` + service `dispose()` 约定 → **[11b-soft-reload.md](./11b-soft-reload.md)**
4. 实现 `reloadRoutes()` (fresh adapter 策略) + `VextAdapter.buildHandler()` → **[11b-soft-reload.md](./11b-soft-reload.md)**
5. 实现 `VextFileWatcher` + `ChangeClassifier` + 防抖 → **[11c-file-watcher.md](./11c-file-watcher.md)**
6. 实现 `ColdRestarter` + dev bootstrap + CLI → **[11d-bootstrap-cli.md](./11d-bootstrap-cli.md)**

**Phase 2 — 边界与安全** → **[11e-edge-cases.md](./11e-edge-cases.md)**：

1. 编译失败回退（esbuild 错误展示）
2. 循环依赖级联检测
3. 内存监控与报警
4. Docker polling 降级
5. 并发 reload 保护

**Phase 3 — 体验优化**：

1. CLI 交互（r/h/c 快捷键）
2. 开发者控制台输出格式
3. `vext dev` 命令选项

---

## 附录 A: v2 → v2.2 变更摘要

### v2.1 变更（分级编译 + 选择性服务重载）

| 变更项 | v2 方案 | v2.1 方案 | 改进原因 |
|--------|--------|----------|---------|
| 编译策略 | 每次 `ctx.rebuild()` 全量增量 | 代码变更用 `transform()` 单文件，结构变更用 `rebuild()` | `ctx.rebuild()` 对大项目 O(N) 扫描，`transform()` 为 O(1) |
| 服务重载 | `reloadServices()` 重建全部 service | 选择性重载：仅重建 invalidation set 内的 service | 避免未变更 service 的构造函数副作用和资源浪费 |
| Service 清理 | 直接 `delete app.services[key]` | 调用可选的 `dispose()` 方法后替换 | 防止定时器/连接泄漏 |
| IPC 消息 | `files: string[]` | `files: FileChangeInfo[]`（含 path + type） | Worker 需要变更类型来选择编译策略 |
| 性能日志 | `✅ 28ms (compile:8ms ...)` | `✅ 23ms [T1:code] (compile:3ms ...)` | 区分 Tier 1/2，便于诊断 |

### v2.2 变更（Bug 修复 + 设计改进）

| 变更项 | v2.1 问题 | v2.2 修复 | 优先级 |
|--------|----------|----------|--------|
| **路径解析** | `softReload` 中 `path.resolve(srcDir, 'src/...')` 导致路径双重嵌套 | 使用 `path.resolve(projectRoot, f.path)` 正确解析 | P0 |
| **嵌套 Service** | `reloadServices` 用 `path.basename()` 获取 name，无法处理嵌套路径 `payment/stripe` | 复用 `filePathToServiceKeys()` + `getNestedValue()` / `setNestedValue()` | P0 |
| **FileWatcher 变更类型** | `fs.watch` 回调不传 `changeType`，所有变更默认为 `modify`，Tier 2 永远不触发 | 用 `fs.existsSync` 区分 rename 事件为 `add` 或 `delete` | P1 |
| **并发 Reload** | 无保护，快速连续保存可能导致两次 `softReload` 并行执行 | 加入 reload 锁 + 待处理队列 | P1 |
| **接口命名** | `setErrorHandler()` vs `08-adapter.md` 的 `registerErrorHandler()` | 统一为 `registerErrorHandler()` | P1 |
| **tsconfigRaw** | `compileSingle()` 的 `tsconfigRaw` 不解析 `extends` 链 | 初始化时预解析并缓存展平后的 tsconfig 内容 | P2 |

---

## 附录 B: 与 Node.js 内置 --watch 的对比

Node.js 22+ 提供了 `--watch` 标志，为什么不直接用？

| 特性 | `node --watch` | Vext Soft Reload v2.2 |
|------|---------------|----------------------|
| 重载方式 | 整个进程重启 | 模块级热替换 |
| 端口保持 | ❌ | ✅ |
| DB 连接保持 | ❌ | ✅ |
| 自定义分类 | ❌ | ✅ (T1/T2/T3 三层) |
| 文件过滤 | 有限 | 完全可控 |
| 代码变更速度 | ~1-5s | **~23ms** (T1, O(1)) |
| 结构变更速度 | ~1-5s | **~100ms** (T2) |
| Docker polling | ❌ | ✅ |
| 配置变更检测 | ❌ (全部重启) | ✅ (仅配置走 T3 cold) |
| ESM 支持 | ✅ (原生) | ✅ (esbuild 编译为 CJS) |
| TS 支持 | ❌ (需要 tsx) | ✅ (esbuild 内置) |
| Service 选择性重载 | ❌ | ✅ (仅变更的 service) |

**结论**: `node --watch` 等价于我们的 Tier 3 cold restart，而 Vext 的 Tier 1 soft reload 提供了约 **100x** 的速度改进。

---

## 附录 C: ESM 兼容性说明

### 为什么 ESM 热重载很难？

Node.js 的原生 ESM (`import`) 模块有自己独立的模块缓存，且应用层代码无法直接清除。

esbuild 预编译方案通过将所有源码统一编译为 CJS，从根本上绕过了这一限制。

| 用户写的 | esbuild 输出 | require.cache 清除 |
|---------|-------------|-------------------|
| `import x from 'y'` (ESM) | `const x = require('y')` (CJS) | ✅ 正常工作 |
| `export default ...` (ESM) | `module.exports = ...` (CJS) | ✅ 正常工作 |
| `const x = require('y')` (CJS) | `const x = require('y')` (CJS) | ✅ 正常工作 |
| TypeScript + 类型注解 | 纯 JavaScript | ✅ 正常工作 |
| `import type { T }` | 被完全擦除 | ✅ 无影响 |

详见 **[11a-dev-compiler.md](./11a-dev-compiler.md)**。

---

## 附录 D: 替代方案评估（Lazy Proxy 模式）

在 v2.1 设计过程中曾评估过 Lazy Proxy 方案（注册代理 handler 到 adapter，通过 `require()` 延迟加载最新代码，避免 fresh adapter 重建）。经过深度分析后决定**不采用**，原因如下：

| 问题 | 说明 |
|------|------|
| **中间件变更无法捕获** | 中间件链在注册时固化到 adapter 中，proxy 只能代理 handler，无法替换链条上的中间件函数 |
| **路由结构变更检测复杂** | 方法/路径/中间件列表变更需要对比新旧路由定义的 metadata，实现复杂且易出错 |
| **Service Proxy 不可靠** | 构造函数副作用在请求时触发、旧实例清理困难、`instanceof` 检查失效 |
| **请求时竞态条件** | 编译中的文件被请求时可能加载到写入一半的产物，而 fresh adapter 方案在全部就绪后才原子替换 |
| **收益有限** | Lazy proxy 节省的主要是路由 require+注册的 ~15-120ms，但 fresh adapter 方案中这部分已足够快 |

fresh adapter 策略在正确性、一致性、调试体验上的优势远超 lazy proxy 方案的边际性能收益。