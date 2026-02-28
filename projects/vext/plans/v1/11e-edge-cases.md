# Vext v3 — 边界情况与安全措施

> **文档编号**: 11e-edge-cases.md  
> **状态**: 设计稿 v2.2  
> **最后更新**: 2026-02-28  
> **父文档**: [11-hot-reload.md](./11-hot-reload.md)  
> **关联文件**: `11a-dev-compiler.md`, `11b-soft-reload.md`, `11c-file-watcher.md`, `11d-bootstrap-cli.md`

---

## 目录

- [1. Reload 失败回退](#1-reload-失败回退)
- [2. 循环依赖处理](#2-循环依赖处理)
- [3. TypeScript / ESM 支持](#3-typescript--esm-支持)
- [4. 内存泄漏防护](#4-内存泄漏防护)
- [5. 新文件 / 删除文件处理](#5-新文件--删除文件处理)
- [6. Service 副作用安全](#6-service-副作用安全)
- [7. 编辑器兼容性](#7-编辑器兼容性)
- [8. Source Map 与调试](#8-source-map-与调试)

---

## 1. Reload 失败回退

### 1.1 失败回退流程

```
Soft Reload 开始
    │
    ├── [阶段 1] esbuild 编译              ← 可能失败（语法错误）
    │   ├── 成功 → 继续
    │   └── 失败 → 输出编译错误，不替换 handler，旧版本继续服务
    │             （require.cache 未被清除，状态完好）
    │
    ├── [阶段 2] 清除 require.cache         ← 不可逆操作
    │
    ├── [阶段 3] 创建新 adapter + require 文件
    │   ├── 成功 → 继续
    │   └── 失败（运行时错误）
    │       │
    │       ├── require.cache 已被清除
    │       │   但旧 handler 闭包仍持有对旧模块的引用
    │       │
    │       ├── 不执行 hotHandler.swap()
    │       │   → 旧 handler 继续服务（使用内存中已有的闭包）
    │       │
    │       └── 输出错误信息，等待用户修复后再次保存
    │
    ├── [阶段 4] 选择性 service 重载
    │   ├── 成功 → 继续
    │   └── 失败 → 回滚受影响的 service 到旧实例（见 11b-soft-reload.md §4.2）
    │             旧 handler 继续服务
    │
    └── 成功 → hotHandler.swap(newHandler)
```

### 1.2 各阶段失败的安全保证

| 失败阶段 | require.cache 状态 | 旧 handler 可用？ | 数据一致性 | 用户操作 |
|---------|-------------------|-----------------|-----------|---------|
| 编译失败（语法错误） | ✅ 未被清除 | ✅ 完全正常 | ✅ 完整 | 修复错误，保存 |
| require 失败（运行时错误） | ⚠️ 已部分清除 | ✅ 闭包仍有效 | ⚠️ 下次 reload 自动修复 | 修复错误，保存 |
| service 重载失败 | ⚠️ 已清除 | ✅ 闭包仍有效 | ✅ service 已回滚 | 修复错误，保存 |
| adapter/route 注册失败 | ⚠️ 已清除 | ✅ 闭包仍有效 | ⚠️ 下次 reload 自动修复 | 修复错误，保存 |

**关键安全保证**：

1. **旧 handler 闭包的安全性**：即使 `require.cache` 被清除，旧的 handler 函数（包括它引用的所有 service、middleware 等）通过 JavaScript 闭包机制仍然持有对旧模块导出对象的引用。这些引用独立于 `require.cache`，GC 前一直有效。

2. **编译错误拦截优先**：esbuild 编译是整个流程的第一步。如果编译失败（语法错误、类型不兼容等），后续步骤完全不执行，系统状态完好无损。这是最常见的错误场景（用户打了一半字保存），也是恢复最干净的场景。

### 1.3 esbuild 编译错误展示

esbuild 产生的编译错误天然包含文件名和行号，且通过 `sourcefile` 参数指向原始 TS 源码路径：

```
[hot-reload] ❌ compile failed:

  src/routes/user.ts:15:4: error: Expected "}" but found "return"

    15 │     return res.json({ ok: true })
       ╵     ~~~~~~

  keeping previous version active. Fix the error and save again.
```

### 1.4 运行时错误展示

当编译通过但 `require()` 时出现运行时错误（如引用了不存在的变量）：

```
[hot-reload] ❌ failed after 18ms: ReferenceError: undeclaredVar is not defined
    at Object.<anonymous> (src/routes/user.ts:12:5)
    at Module._compile (node:internal/modules/cjs/loader:1376:14)

  keeping previous version active. Fix the error and save again.
```

> **source map 支持**：Node.js 20+ 默认启用 `--enable-source-maps`。错误堆栈会自动指向原始 TS 源码，而非 `.vext/dev/` 下的编译产物。

---

## 2. 循环依赖处理

### 2.1 级联爆炸检测

在复杂项目中，一个文件的变更可能通过依赖图级联传播到大量模块。如果失效集合过大，hot reload 的性能优势消失，甚至可能比 cold restart 更慢。

```ts
// lib/dev/cache-invalidator.ts（详见 11b-soft-reload.md §2.4）

/**
 * 在缓存失效时检测循环依赖导致的级联爆炸
 *
 * 策略：如果失效集合超过总缓存的 80%，认为是异常。
 * 此时 hot reload 几乎等价于全量重启，不如直接 cold restart 更干净。
 */
export function detectCircularInvalidation(invalidated: Set<string>): boolean {
  const totalCached = Object.keys(require.cache).length;
  if (invalidated.size > totalCached * 0.8) {
    console.warn(
      '[hot-reload] ⚠️ invalidation cascade too large ' +
      `(${invalidated.size}/${totalCached}), falling back to cold restart`
    );
    return true; // 建议 cold restart
  }
  return false;
}
```

### 2.2 触发 cold restart 的流程

当级联检测触发时，Worker 进程通过 IPC 请求主进程执行 cold restart：

```
Worker 进程:
  detectCircularInvalidation() → true
  → process.send({ type: 'request-cold-restart', reason: 'cascade too large' })
  → 放弃当前 soft reload，不替换 handler

主进程:
  收到 'request-cold-restart' 消息
  → restarter.restart('cascade too large')
  → kill + fork 新进程
```

### 2.3 什么情况会触发级联爆炸？

| 场景 | 原因 | 频率 |
|------|------|------|
| 修改了全局工具函数（如 `src/utils/index.ts`） | 几乎所有模块都依赖它 | 低 |
| 桶文件（barrel export）被修改 | `src/services/index.ts` 重导出所有 service | 中 |
| 循环依赖链 | A → B → C → A，修改任一个都传播到所有 | 极低 |

**建议**：

- 避免使用大型桶文件（barrel export），改为直接 import 具体文件
- 工具函数按功能拆分为独立文件，减少依赖扇出
- 如果频繁触发级联检测，考虑将热点文件归类为 cold restart

---

## 3. TypeScript / ESM 支持

### 3.1 esbuild 统一编译策略

Vext v3 使用 TypeScript，用户源码可以使用 ESM 或 CJS 语法。通过 esbuild 预编译方案彻底解决了模块格式问题：

| 用户写的 | esbuild 输出 | require.cache 清除 |
|---------|-------------|-------------------|
| `import x from 'y'` (ESM) | `const x = require('y')` (CJS) | ✅ 正常工作 |
| `export default ...` (ESM) | `module.exports = ...` (CJS) | ✅ 正常工作 |
| `const x = require('y')` (CJS) | `const x = require('y')` (CJS) | ✅ 正常工作 |
| TypeScript + 类型注解 | 纯 JavaScript | ✅ 正常工作 |
| `import type { T }` | 被完全擦除 | ✅ 无影响 |
| `export * from './sub'` (re-export) | `Object.assign(exports, require('./sub'))` | ✅ 正常工作 |
| 动态 `import()` | `Promise.resolve(require())` | ✅ 正常工作 |

### 3.2 不再需要 tsx / ts-node

- dev 子进程不需要 `--import tsx/esm` 或 `--loader ts-node/esm`
- 子进程加载的入口文件和所有业务模块都是 esbuild 编译后的纯 `.js`
- Node.js 以最原始、最干净的方式运行，零 loader hook

### 3.3 CJS 输出的边界 case

| 场景 | esbuild 行为 | 影响 |
|------|-------------|------|
| `export default class X {}` | `module.exports = X` | ✅ 无影响 |
| 同时有 `export default` + 具名 `export` | `module.exports.default = ...` + `module.exports.xxx = ...` | ⚠️ 消费方需用 `.default` |
| `import.meta.url` | 编译为 `__filename` 等价物 | ✅ esbuild 自动处理 |
| Top-level await | CJS 不支持 → 编译错误 | ❌ 需要用户修改代码 |
| `__dirname` / `__filename` | CJS 原生支持 | ✅ 无影响 |

> **Top-level await 限制**：由于编译目标是 CJS，不支持 top-level await。用户需要将其包裹在 async 函数中。这是 CJS 的固有限制，与 esbuild 无关。在实际服务端项目中，top-level await 使用频率极低。

### 3.4 第三方库的 ESM-only 包

某些 npm 包只提供 ESM 入口（package.json 中 `"type": "module"` 且无 CJS fallback）。

由于 Vext 编译时使用 `packages: 'external'`（不打包 node_modules），这些包仍通过 `require()` 加载。Node.js 20+ 对 `require()` ESM 包的支持有限。

**解决方案**：

1. **大多数场景无影响**：主流 npm 包（express、hono、drizzle、ioredis 等）都同时提供 CJS 和 ESM 入口
2. **ESM-only 包**：在 esbuild 配置中将该包标记为非 external（局部打包），让 esbuild 将其内联为 CJS
3. **极端情况**：使用动态 `import()` 加载该包（esbuild 会保留为异步 import）

---

## 4. 内存泄漏防护

### 4.1 泄漏来源

反复 soft reload 可能累积旧模块的副作用。esbuild 方案相比 tsx 有天然优势——编译产物在磁盘上，`require` 进来的模块在 `require.cache` 中有明确的条目可以精确清除。但仍需防护：

| 泄漏来源 | 说明 | 防护措施 |
|---------|------|---------|
| Service 未清理的定时器 | `setInterval` / `setTimeout` 持有旧 service 引用 | `dispose()` 约定 |
| Service 未关闭的连接 | DB client、Redis client 等 | `dispose()` 约定 |
| 事件监听器累积 | `process.on` / `EventEmitter.on` 重复注册 | `dispose()` 中 removeListener |
| 旧 handler 闭包 | 长连接请求持有旧 handler → 旧 adapter → 旧 service | 请求完成后 GC 自动回收 |
| 旧 adapter 实例 | 每次 reload 创建新 Hono 实例 | 旧实例无引用后 GC 回收 |

### 4.2 内存监控

```ts
// lib/dev/memory-monitor.ts

let lastMemoryReport = Date.now();
const MEMORY_REPORT_INTERVAL = 60_000; // 每分钟

/**
 * 定期报告内存使用
 * 在每次 soft reload 后调用
 */
export function reportMemoryIfNeeded(): void {
  if (Date.now() - lastMemoryReport < MEMORY_REPORT_INTERVAL) return;
  lastMemoryReport = Date.now();

  const usage = process.memoryUsage();
  const heapMB = Math.round(usage.heapUsed / 1024 / 1024);
  const rssMB = Math.round(usage.rss / 1024 / 1024);

  if (heapMB > 512) {
    console.warn(
      `[hot-reload] ⚠️ high memory usage: heap ${heapMB}MB, rss ${rssMB}MB\n` +
      '  This may indicate resource leaks from hot-reloaded services.\n' +
      '  Consider:\n' +
      '    - Adding dispose() to services with timers/connections\n' +
      '    - Pressing "r" for a cold restart to reclaim memory'
    );
  } else {
    console.log(`[hot-reload] 📊 memory: heap ${heapMB}MB, rss ${rssMB}MB`);
  }
}
```

### 4.3 Service dispose() 约定的重要性

`dispose()` 是热重载安全性的关键约定。没有 `dispose()` 的 service 不会导致功能错误，但会导致资源泄漏：

```ts
// ❌ 没有 dispose —— 每次 hot reload 泄漏一个 setInterval
export default class SchedulerService {
  constructor(app: VextApp) {
    setInterval(() => this.tick(), 60_000);
    // 旧实例被替换后，setInterval 仍在运行
    // 每次 reload 泄漏一个定时器
  }
}

// ✅ 有 dispose —— hot reload 时正确清理
export default class SchedulerService {
  private timer: NodeJS.Timeout;

  constructor(app: VextApp) {
    this.timer = setInterval(() => this.tick(), 60_000);
  }

  dispose() {
    clearInterval(this.timer);
  }
}
```

### 4.4 自动检测常见泄漏模式

未来可扩展的自动检测能力（Phase 2）：

| 检测项 | 方式 | 严重程度 |
|--------|------|---------|
| `process.on` 注册数增长 | `process.listenerCount()` 对比 | 🟡 |
| 全局定时器数增长 | Monkey-patch `setInterval` 追踪 | 🟡 |
| heap 持续增长趋势 | 多次采样回归分析 | 🔴 |
| require.cache 条目数异常 | 对比预期数量 | 🟡 |

---

## 5. 新文件 / 删除文件处理

### 5.1 新文件（add）

当用户创建新文件时（如 `src/routes/new-endpoint.ts`），FileWatcher 检测到 `add` 事件，触发 Tier 2 编译：

```
1. FileWatcher: rename 事件 + existsSync = true + 不在 knownFiles 中 → type: 'add'
2. IPC → Worker
3. compiler.rebuildWithNewEntryPoints()
   └── 重新扫描 src/ 获取 entryPoints（含新文件）
   └── 创建新 esbuild context → rebuild
4. 新文件的编译产物出现在 .vext/dev/
5. require.cache 清除（新文件不在缓存中，但其依赖可能需要刷新）
6. fresh adapter 加载所有路由（含新路由）
7. swap handler
```

**新路由自动注册**：由于每次 soft reload 都通过 `loadRouteFiles(routesDir)` 重新扫描路由目录，新文件会被自动发现并注册。无需任何额外配置。

### 5.2 删除文件（delete）

当用户删除文件时（如 `src/routes/old-endpoint.ts`），FileWatcher 检测到 `delete` 事件，触发 Tier 2 编译：

```
1. FileWatcher: rename 事件 + existsSync = false → type: 'delete'
2. IPC → Worker
3. compiler.rebuildWithNewEntryPoints()
   └── 重新扫描 src/ 获取 entryPoints（不含已删除文件）
   └── 创建新 esbuild context → rebuild
   └── 注意：.vext/dev/ 下可能残留旧编译产物（因为 rebuildWithNewEntryPoints 不清理输出目录）
4. require.cache 清除（旧文件在缓存中的条目被清除）
5. fresh adapter 加载路由（不含已删除路由）
6. swap handler
```

**残留编译产物处理**：

`rebuildWithNewEntryPoints()` 不会主动清理 `.vext/dev/` 中的旧文件（因为 esbuild 的 `outdir` 是增量写入的）。但这不影响正确性：

- 路由加载是通过 `loadRouteFiles()` 扫描 **源码目录** 驱动的，不是扫描编译产物目录
- 已删除文件不会被 require（即使编译产物还在，也不会被任何代码引用）
- 下次 cold restart（或 `compiler.start()` 中的 `rmSync`）会清理整个 `.vext/dev/`

### 5.3 文件重命名

文件重命名在 `fs.watch` 层面表现为两个事件：

```
原文件 rename 事件 → delete（existsSync = false）
新文件 rename 事件 → add（existsSync = true，不在 knownFiles 中）
```

100ms 防抖窗口内这两个事件会被合并为一次 Tier 2 reload，行为正确：
- 旧路由被移除
- 新路由被注册
- 旧编译产物残留但无影响

---

## 6. Service 副作用安全

### 6.1 不安全的 Service 模式

以下 service 模式在 hot reload 时存在风险，建议用户注意：

| 模式 | 风险 | 建议 |
|------|------|------|
| 构造函数中注册全局事件 | `process.on('uncaughtException', ...)` 累积 | 在 `dispose()` 中 `removeListener` |
| 构造函数中修改全局状态 | 修改 `global.xxx` 或单例对象 | 避免全局状态，或在 `dispose()` 中还原 |
| 构造函数中启动子进程 | `child_process.spawn()` 后旧实例无法清理 | 在 `dispose()` 中 `kill()` 子进程 |
| 构造函数中注册 cron job | 旧 job 继续运行 | 在 `dispose()` 中取消 job |
| 两个 service 之间的循环引用 | A 引用 B 的旧实例 | 通过 `app.services` 延迟访问而非构造时缓存 |

### 6.2 Service 间引用的正确模式

```ts
// ❌ 错误：在构造函数中缓存其他 service 的引用
export default class OrderService {
  private userService: UserService;

  constructor(app: VextApp) {
    // 这个引用在 hot reload 后指向旧实例！
    this.userService = app.services.user;
  }

  async create() {
    // 使用的是旧 userService 实例
    const user = await this.userService.findById(userId);
  }
}

// ✅ 正确：每次通过 app.services 动态访问
export default class OrderService {
  constructor(private app: VextApp) {}

  async create() {
    // 总是获取最新的 service 实例
    const user = await this.app.services.user.findById(userId);
  }
}
```

> **设计原则**：Service 之间应通过 `this.app.services.xxx` 延迟访问，而非在构造函数中缓存引用。这不仅对 hot reload 安全，也是良好的解耦实践。

### 6.3 Plugin 注入的资源安全性

Plugin 通过 `app.extend('db', ...)` 注入的资源（如 DB 连接池、Redis client）在 soft reload 时**保持不变**，因为 plugins 不参与 soft reload。这是安全的：

```
soft reload 前后:
  app.db          → 同一个 drizzle 实例     ✅
  app.cache       → 同一个 Redis 实例       ✅
  app.logger      → 同一个 logger 实例      ✅
  app.services.x  → 可能是新实例（如果被 invalidated）
  adapter         → 新实例（fresh adapter）
  handler         → 新函数（swap 后）
```

---

## 7. 编辑器兼容性

### 7.1 原子写入 vs 临时文件写入

| 编辑器 | 写入策略 | fs.watch 行为 | 影响 |
|--------|---------|-------------|------|
| VS Code | 直接写入 | `change` 事件 | ✅ 正常，type = `modify` |
| WebStorm | 直接写入 | `change` 事件 | ✅ 正常，type = `modify` |
| Vim (默认) | 写入临时文件 → 删除原文件 → 重命名 | `rename` × 2 | ⚠️ 触发 Tier 2 而非 Tier 1 |
| Vim (`set nobackup nowritebackup`) | 直接写入 | `change` 事件 | ✅ 正常，type = `modify` |
| Emacs | 写入临时文件 → 重命名 | `rename` × 2 | ⚠️ 触发 Tier 2 而非 Tier 1 |
| nano | 直接写入 | `change` 事件 | ✅ 正常，type = `modify` |

### 7.2 Vim 用户优化建议

如果频繁触发 Tier 2（控制台显示 `[T2:structural]`），可以在 `.vimrc` 中配置：

```vim
" 禁用备份文件写入策略，改为直接写入
set nobackup
set nowritebackup
```

> **未来优化**（见 [11c-file-watcher.md](./11c-file-watcher.md) 附录 FIX-6）：在 flush 时将同一文件的 `delete` + `add` 序列自动合并为 `modify`，从而避免 Vim/Emacs 写入策略不必要地触发 Tier 2。

---

## 8. Source Map 与调试

### 8.1 Source Map 生成

esbuild 为每个编译产物生成对应的 `.js.map` 文件（详见 [11a-dev-compiler.md](./11a-dev-compiler.md)）：

```
.vext/dev/routes/user.js      ← 运行时加载的 CJS
.vext/dev/routes/user.js.map  ← source map，指向 src/routes/user.ts
```

Node.js 20+ 默认启用 `--enable-source-maps`，错误堆栈自动映射：

```
Error: User not found
    at UserService.findById (src/services/user.ts:42:11)   ← 指向源码
    at GET /users/:id (src/routes/user.ts:18:24)           ← 指向源码
```

### 8.2 调试器支持

dev 子进程支持 `--inspect` 调试：

```bash
# 在 dev 子进程上启用调试器
vext dev --inspect

# 指定端口
vext dev --inspect=9230
```

**注意事项**：

- Hot reload 不会断开调试器连接（因为进程不重启）
- 断点在 reload 后可能失效（因为模块被重新加载，函数引用变了）
- 建议在 reload 后重新设置断点，或使用条件断点
- Cold restart 会断开调试器连接（进程被替换），需要重新附加

### 8.3 .vext/ 目录与 .gitignore

编译产物目录 `.vext/` 不应提交到版本控制：

```gitignore
# .gitignore
.vext/
```

用户可以直接检查 `.vext/dev/` 目录下的编译产物来调试编译问题（如确认 ESM → CJS 转换是否正确）。这是相比 tsx（内存中转译，不可查看）的优势之一。

---

## 附录：边界情况速查表

| 场景 | 行为 | 参考 |
|------|------|------|
| 语法错误保存 | 编译失败，旧版本继续服务 | §1.3 |
| 运行时错误保存 | require 失败，旧 handler 继续服务 | §1.4 |
| 循环依赖导致级联 > 80% | 降级为 cold restart | §2 |
| 新增路由文件 | Tier 2 → 自动注册新路由 | §5.1 |
| 删除路由文件 | Tier 2 → 路由自动移除 | §5.2 |
| 文件重命名 | delete + add → Tier 2 | §5.3 |
| Service 定时器泄漏 | 通过 `dispose()` 清理 | §6.1 |
| Service 间引用旧实例 | 通过 `app.services.xxx` 动态访问 | §6.2 |
| Vim 触发不必要 Tier 2 | 配置 `nobackup` 或等未来自动合并优化 | §7.2 |
| Top-level await | CJS 不支持 → 编译错误 | §3.3 |
| ESM-only npm 包 | 局部打包或 dynamic import | §3.4 |
| 内存 > 512MB | 警告日志 + 建议 cold restart | §4.2 |
| 快速连续保存 | 并发锁 + 队列（v2.2） | [11d-bootstrap-cli.md §3.1](./11d-bootstrap-cli.md#31-并发保护机制详解) |
| Docker bind mount | 自动降级 polling | [11c-file-watcher.md §4](./11c-file-watcher.md#4-docker-兼容性) |