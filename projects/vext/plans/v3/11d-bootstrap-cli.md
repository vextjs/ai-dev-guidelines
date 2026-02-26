# Vext v3 — Cold Restart、Bootstrap 改造与 CLI 集成

> **文档编号**: 11d-bootstrap-cli.md  
> **状态**: 设计稿 v2.2  
> **最后更新**: 2026-02-28  
> **父文档**: [11-hot-reload.md](./11-hot-reload.md)  
> **关联文件**: `11a-dev-compiler.md`, `11b-soft-reload.md`, `11c-file-watcher.md`, `09-cli.md`, `06c-lifecycle.md`

---

## 目录

- [1. Cold Restart 详细设计](#1-cold-restart-详细设计)
- [2. Bootstrap 改造](#2-bootstrap-改造)
- [3. createApp 新增 reload 能力](#3-createapp-新增-reload-能力)
- [4. Dev 模式 Bootstrap](#4-dev-模式-bootstrap)
- [5. CLI 集成](#5-cli-集成)
- [6. CLI 选项](#6-cli-选项)

---

## 1. Cold Restart 详细设计

当配置文件、插件、`.env`、`package.json` 或 `tsconfig.json` 变更时（Tier 3），执行完整的进程替换。这是必要的，因为这些文件影响全局行为（端口、DB URI、插件 `setup()` 副作用等），无法在进程内安全热替换。

### 1.1 ColdRestarter 实现

```ts
// lib/dev/cold-restart.ts

import { fork, ChildProcess } from 'child_process'

export class ColdRestarter {
  private child: ChildProcess | null = null;
  private isRestarting = false;
  private readonly entryScript: string;
  private readonly killTimeout: number;

  constructor(entryScript: string, killTimeout = 5000) {
    this.entryScript = entryScript;
    this.killTimeout = killTimeout;
  }

  async restart(reason: string): Promise<void> {
    if (this.isRestarting) {
      // 如果已经在重启中，合并（不重复执行）
      return;
    }

    this.isRestarting = true;
    console.log(`[vext dev] cold restart: ${reason}`);

    try {
      // 1. 安全终止旧进程
      if (this.child && !this.child.killed) {
        await this.safeKill(this.child);
      }

      // 2. Fork 新进程（注意：不需要 tsx loader，因为 esbuild 已编译为 CJS）
      this.child = fork(this.entryScript, {
        env: { ...process.env, VEXT_DEV_MODE: '1' },
        stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        // 无需 --import tsx/esm 或 --loader ts-node/esm
        // esbuild 编译后的入口文件是纯 .js
      });

      // 3. 等待新进程就绪
      await this.waitForReady(this.child);

      console.log('[vext dev] cold restart complete');
    } finally {
      this.isRestarting = false;
    }
  }

  /**
   * 向子进程发送 IPC 消息
   */
  sendToChild(msg: any): void {
    if (this.child && this.child.connected) {
      this.child.send(msg);
    }
  }

  /**
   * 安全终止: SIGTERM → 等待 → SIGKILL
   *
   * 流程：
   *   1. 发送 SIGTERM（触发子进程的优雅关闭流程，见 06c-lifecycle.md）
   *   2. 等待子进程退出（最多 killTimeout ms）
   *   3. 超时后发送 SIGKILL 强制终止
   */
  private async safeKill(child: ChildProcess): Promise<void> {
    return new Promise<void>((resolve) => {
      let resolved = false;
      const done = () => {
        if (!resolved) { resolved = true; resolve(); }
      };

      child.once('exit', done);

      // 第一步: SIGTERM（优雅关闭）
      child.kill('SIGTERM');

      // 第二步: 超时后 SIGKILL（强制终止）
      const timer = setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL');
        }
        done();
      }, this.killTimeout);

      // 如果正常退出，清除超时计时器
      child.once('exit', () => clearTimeout(timer));
    });
  }

  /**
   * 等待子进程发送 ready 消息
   * 超时 30s — 如果子进程在此时间内无法完成启动，认为失败
   */
  private async waitForReady(child: ChildProcess): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('[vext dev] worker startup timeout (30s)'));
      }, 30_000);

      child.once('message', (msg: any) => {
        if (msg?.type === 'ready') {
          clearTimeout(timeout);
          resolve();
        }
      });

      child.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      child.once('exit', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          reject(new Error(`[vext dev] worker exited with code ${code}`));
        }
      });
    });
  }

  /**
   * 终止子进程（用于进程退出清理）
   */
  async kill(): Promise<void> {
    if (this.child && !this.child.killed) {
      await this.safeKill(this.child);
    }
  }
}
```

### 1.2 Cold Restart 触发条件

| 文件模式 | 原因 |
|---------|------|
| `src/config/**` | 配置影响全局行为（端口、DB URI、插件开关等） |
| `package.json` | 依赖变更 |
| `.env`, `.env.*` | 环境变量影响全局 |
| `src/plugins/**` | 插件在启动时执行 `setup()`，可能注册 `app` 属性、hook |
| `tsconfig.json` | 编译配置影响 esbuild 行为 |

详见 [11-hot-reload.md §3](./11-hot-reload.md#3-文件分类规则) 完整分类表。

---

## 2. Bootstrap 改造

### 2.1 改造前 vs 改造后

当前 bootstrap 是一次性线性流程。为了支持 soft reload，需要将 bootstrap 拆分为 **不可重载阶段** 和 **可重载阶段**：

```
┌────────────────────────────────────────────────────────────────────┐
│                      Bootstrap 流程                                │
│                                                                    │
│  ╔══════════════════════════════════════╗  ← 不可重载（一次性）     │
│  ║ 1. DevCompiler.start()   → compiler  ║  ← dev 模式独有          │
│  ║ 2. loadConfig(outDir/config)→ config ║  ← 从编译产物加载        │
│  ║ 3. createApp(config)     → app, int  ║                          │
│  ║ 4. loadI18nLocales(outDir)           ║  ← soft reload 时可重载  │
│  ║ 5. loadPlugins(app, outDir)→ 插件    ║  ← 不可重载              │
│  ╚══════════════════════════════════════╝                          │
│                                                                    │
│  ╔══════════════════════════════════════╗  ← 可重载（soft reload）  │
│  ║ 6. loadMiddlewares()      → mwDefs   ║                          │
│  ║ 7. loadServices(app)     → services ║                          │
│  ║ 8. resolveAdapter(config)→ adapter  ║  ← 每次创建新实例        │
│  ║ 9. registerRoutes(adapter) → routes ║                          │
│  ║ 10. lockUse()                       ║                          │
│  ║ 11. adapter.buildHandler()→ handler ║                          │
│  ╚══════════════════════════════════════╝                          │
│                                                                    │
│  ╔══════════════════════════════════════╗  ← 不可重载（一次性）     │
│  ║ 12. server.listen(hotHandler.handle) ║  ← 绑定 hotHandler      │
│  ║ 13. registerSignals()               ║                          │
│  ║ 14. internals.runReady()            ║                          │
│  ╚══════════════════════════════════════╝                          │
└────────────────────────────────────────────────────────────────────┘
```

### 2.2 关键设计决策

1. **Config 从编译目录加载**: Dev 子进程不带 tsx loader，无法直接 require TS 文件。`compiler.start()` 会编译 `src/` 下所有文件（含 `config/`）到 `.vext/dev/`，所以 `loadConfig()` 从 `.vext/dev/config/` 加载编译后的 CJS 配置。

2. **Server socket 由框架控制**: Dev 模式下 HTTP server 不通过 `adapter.listen()` 创建，而是由框架直接用 `http.createServer(hotHandler.handle)` 创建。这样 adapter 可以自由重建，而 server socket 保持不变。

3. **生产模式无差异**: 生产模式仍然走 `adapter.listen()`，dev 模式是唯一的差异点。

---

## 3. createApp 新增 reload 能力

> **v2.2 关键新增**：并发 reload 保护（reload 锁 + 待处理队列）。

```ts
// lib/app.ts — createApp 改造

import path from 'path'
import { DevCompiler } from './dev/compiler'
import { HotSwappableHandler } from './core/server'
import { FileChangeInfo } from './dev/file-watcher'
import { computeInvalidationSet, evictModules, detectCircularInvalidation } from './dev/cache-invalidator'
import { reloadServices } from './dev/service-reloader'
import { reloadRoutes } from './dev/route-reloader'
import { reloadLocales } from './dev/i18n-reloader'

export function createApp(config: VextConfig) {
  const app = { /* ... 现有逻辑 ... */ };

  // 新增: HotSwappableHandler（仅在 dev 模式下启用）
  let hotHandler: HotSwappableHandler | null = null;

  // 新增: DevCompiler 引用
  let compiler: DevCompiler | null = null;

  /**
   * v2.2 新增：Reload 并发锁
   *
   * 防止多次 softReload 并行执行。如果在一次 reload 尚未完成时
   * 又收到新的变更事件，将变更文件暂存到待处理队列中，
   * 当前 reload 完成后自动处理队列。
   *
   * 这解决了快速连续保存（<100ms 间隔）时可能导致的问题：
   *   - 同时操作 require.cache（evict 和 require 交错）
   *   - 两个 fresh adapter 同时创建，只有后一个生效
   *   - service 的 dispose() 和 new 交错执行
   */
  let reloadLock = false;
  let pendingReload: FileChangeInfo[] | null = null;

  const internals = {
    lockUse() { /* 现有逻辑 */ },

    async runReady() { /* 现有逻辑 */ },

    getGlobalMiddlewares() { /* 现有逻辑 */ },

    async shutdown(serverHandle?: VextServerHandle) { /* 现有逻辑 */ },

    /**
     * 新增: 设置热替换 handler 容器
     * 仅在 dev 模式下调用
     */
    setHotHandler(handler: HotSwappableHandler): void {
      hotHandler = handler;
    },

    /**
     * 新增: 设置 DevCompiler 引用
     * 仅在 dev 模式下调用
     */
    setCompiler(c: DevCompiler): void {
      compiler = c;
    },

    /**
     * 新增: Soft Reload 入口（v2.2，含并发保护）
     *
     * 如果当前正在 reload，将变更暂存到队列中等待。
     * 当前 reload 完成后自动取出队列中的变更并执行。
     *
     * @param changedFiles 变更文件信息列表
     * @returns 是否成功
     */
    async softReload(changedFiles: FileChangeInfo[]): Promise<boolean> {
      // v2.2: 并发保护
      if (reloadLock) {
        // 合并到待处理队列（如果已有待处理变更，合并文件列表）
        if (pendingReload) {
          // 按 path 去重，保留最新的 type
          const map = new Map(pendingReload.map(f => [f.path, f]));
          for (const f of changedFiles) {
            map.set(f.path, f);
          }
          pendingReload = [...map.values()];
        } else {
          pendingReload = [...changedFiles];
        }
        app.logger.debug(
          `[hot-reload] reload in progress, queued ${changedFiles.length} file(s)`
        );
        return true; // 排队成功（不算失败）
      }

      reloadLock = true;
      try {
        const result = await internals._doSoftReload(changedFiles);

        // 处理待处理队列
        while (pendingReload !== null) {
          const next = pendingReload;
          pendingReload = null;
          app.logger.info(
            `[hot-reload] processing queued changes: ${next.length} file(s)`
          );
          await internals._doSoftReload(next);
        }

        return result;
      } finally {
        reloadLock = false;
      }
    },

    /**
     * 内部: 实际执行 Soft Reload（v2.2，含路径修复）
     *
     * 完整流程：
     *   0. 分级编译：modify → compileSingle() (Tier 1, O(1))
     *                add/delete → rebuildWithNewEntryPoints() (Tier 2, O(N))
     *   1. 清除 require.cache（编译产物及依赖者）
     *   2. 重载 i18n（如变更包含 locales/）
     *   3. 重载 middleware definitions
     *   4. 选择性重载 service（仅 invalidated 的实例）
     *   5. 创建新 adapter 实例 + 重载 routes + buildHandler
     *   6. adapter.buildHandler() → 原子替换
     *
     * 保持不变的：app、config、plugins、DB 连接、server socket、未变更的 service 实例
     *
     * @param changedFiles 变更文件信息列表（FileChangeInfo[]，含 path 和 type）
     * @returns 是否成功
     */
    async _doSoftReload(changedFiles: FileChangeInfo[]): Promise<boolean> {
      const startTime = Date.now();

      try {
        // ── Step 0: 分级编译 ────────────────────────────────────
        if (!compiler) {
          throw new Error('[hot-reload] DevCompiler not initialized');
        }

        const hasStructuralChange = changedFiles.some(
          f => f.type === 'add' || f.type === 'delete'
        );

        if (hasStructuralChange) {
          // Tier 2: 结构变更 → 重建 esbuild context + 全量增量编译
          await compiler.rebuildWithNewEntryPoints();
        } else {
          // Tier 1: 代码变更 → 单文件编译（O(1)，与项目大小无关）
          //
          // v2.2 修复：使用 compiler.getProjectRoot() 正确解析路径
          //   v2.1 Bug: path.resolve(srcDir, "src/routes/user.ts") → 双重嵌套
          //   v2.2 Fix: path.resolve(projectRoot, "src/routes/user.ts") → 正确路径
          const projectRoot = compiler.getProjectRoot();
          const srcFiles = changedFiles
            .filter(f => f.path.startsWith('src/'))
            .map(f => path.resolve(projectRoot, f.path));
          await compiler.compileFiles(srcFiles);
        }
        const t0 = Date.now();

        const outDir = compiler.getOutDir();

        // ── Step 1: 清除 require.cache ──────────────────────────
        const filePaths = changedFiles.map(f => f.path);
        const compiledFiles = filePaths.map(f => compiler!.resolveCompiled(f));
        const invalidated = computeInvalidationSet(compiledFiles, outDir);

        // 安全检查：级联是否过大
        if (detectCircularInvalidation(invalidated)) {
          app.logger.warn('[hot-reload] invalidation cascade too large, requesting cold restart');
          process.send?.({ type: 'request-cold-restart', reason: 'cascade too large' });
          return false;
        }

        const evictedCount = evictModules(invalidated);
        const t1 = Date.now();

        // ── Step 2: 重载 i18n ───────────────────────────────────
        const hasLocaleChange = filePaths.some(f => f.includes('locales/'));
        if (hasLocaleChange) {
          await reloadLocales(outDir);
        }
        const t2 = Date.now();

        // ── Step 3: 重载 middleware definitions ──────────────────
        const middlewareDefs = await loadMiddlewares(
          path.join(outDir, 'middlewares'),
          config.middlewares ?? [],
          app.logger,
        );
        const t3 = Date.now();

        // ── Step 4: 选择性重载 services ─────────────────────────
        await reloadServices(app, outDir, invalidated);
        const t4 = Date.now();

        // ── Step 5: 创建新 adapter + 重载 routes + buildHandler ─
        const globalMiddlewares = internals.getGlobalMiddlewares();
        const newHandler = await reloadRoutes(
          app, config, middlewareDefs, globalMiddlewares, outDir,
        );
        const t5 = Date.now();

        // ── Step 6: 原子替换 ────────────────────────────────────
        if (hotHandler) {
          hotHandler.swap(newHandler);
        }
        const t6 = Date.now();

        // ── 性能报告 ────────────────────────────────────────────
        const tier = hasStructuralChange ? 'T2:structural' : 'T1:code';
        app.logger.info(
          `[hot-reload] ✅ ${t6 - startTime}ms [${tier}] ` +
          `(compile:${t0 - startTime}ms ` +
          `cache:${t1 - t0}ms ` +
          `i18n:${t2 - t1}ms ` +
          `mw:${t3 - t2}ms ` +
          `svc:${t4 - t3}ms ` +
          `route:${t5 - t4}ms ` +
          `swap:${t6 - t5}ms) ` +
          `[${evictedCount} modules evicted]`
        );

        // 内存监控
        reportMemoryIfNeeded();

        return true;
      } catch (err) {
        const elapsed = Date.now() - startTime;
        app.logger.error(
          `[hot-reload] ❌ failed after ${elapsed}ms: ${(err as Error).message}`
        );
        app.logger.error(
          '[hot-reload] keeping previous version active. Fix the error and save again.'
        );

        // 不替换 handler — 旧版本继续服务
        return false;
      }
    },
  };

  return { app, internals };
}
```

### 3.1 并发保护机制详解

```
时间线:

  t=0ms    用户保存 file-A.ts
  t=50ms   debounce 合并中...
  t=100ms  flush → IPC → softReload([file-A]) 开始
  t=110ms  用户再次保存 file-B.ts
  t=150ms  编译中...
  t=210ms  flush → IPC → softReload([file-B])
           │
           └─ reloadLock = true → 放入 pendingReload
              （不阻塞 IPC 消息循环）

  t=220ms  softReload([file-A]) 完成 → swap handler
           │
           └─ 检查 pendingReload → [file-B]
              → 执行 _doSoftReload([file-B])

  t=245ms  softReload([file-B]) 完成 → swap handler
           │
           └─ pendingReload = null → 释放 reloadLock

整个过程中，旧 handler 直到第一次 swap 才被替换，
file-A 和 file-B 的变更按序生效，不会交叉污染。
```

**为什么不直接丢弃队列中已有的变更？**

因为用户可能在同一个防抖窗口外快速修改了多个文件。丢弃意味着需要用户再次保存才能看到效果，体验不好。合并方式（按 path 去重，保留最新 type）保证了最终状态正确。

---

## 4. Dev 模式 Bootstrap

```ts
// lib/dev/dev-bootstrap.ts

import path from 'path'
import { createServer } from 'http'
import { DevCompiler } from './compiler'
import { HotSwappableHandler } from '../core/server'
import { FileChangeInfo } from './file-watcher'

export async function devBootstrap(projectRoot: string) {
  const srcDir = path.join(projectRoot, 'src');
  const outDir = path.join(projectRoot, '.vext', 'dev');

  // ════════════════════════════════════════════════════════════════
  // 不可重载阶段
  // ════════════════════════════════════════════════════════════════

  // 0. 初始化 esbuild 编译器（首次全量编译 ~50-100ms）
  const compiler = new DevCompiler({
    srcDir,
    outDir,
    tsconfig: path.join(projectRoot, 'tsconfig.json'),
  });
  await compiler.start();

  // 1. 加载配置
  //    注意：从编译产物的 config 子目录加载，因为 dev 子进程
  //    不带 tsx loader，无法直接 require TS 文件。
  //    compiler.start() 已将 src/config/ 编译为 .vext/dev/config/ 下的 CJS .js
  //    与生产模式一致：loadConfig(configDir)，只是目录不同
  const config = loadConfig(path.join(outDir, 'config'));

  // 2. 创建 app
  const { app, internals } = createApp(config);

  // 3. 设置编译器引用（供 softReload 使用）
  internals.setCompiler(compiler);

  // 4. 加载 i18n 和 plugins（从编译目录加载）
  await autoLoadI18n(outDir);
  await loadPlugins(app, outDir);

  // ════════════════════════════════════════════════════════════════
  // 可重载阶段（首次执行）
  // ════════════════════════════════════════════════════════════════

  // 5. 加载中间件定义、服务
  const middlewareDefs = await loadMiddlewares(
    path.join(outDir, 'middlewares'),
    config.middlewares ?? [],
    app.logger,
  );
  await loadServices(app, outDir);

  // 6. 创建 adapter 实例 + 注册路由 + buildHandler
  const globalMiddlewares = internals.getGlobalMiddlewares();
  const initialHandler = await reloadRoutes(
    app, config, middlewareDefs, globalMiddlewares, outDir,
  );

  internals.lockUse();

  // ════════════════════════════════════════════════════════════════
  // 创建 HotSwappable 容器
  // ════════════════════════════════════════════════════════════════

  const hotHandler = new HotSwappableHandler(initialHandler);
  internals.setHotHandler(hotHandler);

  // ════════════════════════════════════════════════════════════════
  // 启动 Server
  // ════════════════════════════════════════════════════════════════
  //
  // 关键决策：dev 模式下不通过 adapter.listen() 创建 server，
  // 而是框架直接用 http.createServer(hotHandler.handle) 创建。
  //
  // 原因：
  //   1. Server socket 由框架控制，soft reload 时不受影响
  //   2. Adapter 可自由重建（每次 soft reload 创建新实例）
  //   3. hotHandler.handle 是 server 的唯一入口，swap 后新请求自动走新 adapter
  //
  // 生产模式仍走 adapter.listen()，dev 模式是唯一差异点。

  const server = createServer(hotHandler.handle);

  // 应用与生产模式一致的 server 配置
  const serverConfig = config.server || {};
  if (serverConfig.keepAliveTimeout) {
    server.keepAliveTimeout = serverConfig.keepAliveTimeout;
  }
  if (serverConfig.headersTimeout) {
    server.headersTimeout = serverConfig.headersTimeout;
  }
  if (serverConfig.requestTimeout) {
    server.requestTimeout = serverConfig.requestTimeout;
  }

  const serverHandle = await new Promise<VextServerHandle>((resolve) => {
    const { port = 3000, host = '0.0.0.0' } = serverConfig;
    server.listen(port, host, () => {
      resolve({
        port,
        host,
        async close() { server.close(); },
      });
    });
  });

  // ════════════════════════════════════════════════════════════════
  // 信号注册 & 就绪通知
  // ════════════════════════════════════════════════════════════════

  registerSignals(internals, serverHandle);
  await internals.runReady();

  // 通知主进程已就绪
  if (process.send) {
    process.send({ type: 'ready' });
  }

  // ════════════════════════════════════════════════════════════════
  // IPC 消息监听（接收 soft reload 指令）
  // ════════════════════════════════════════════════════════════════

  process.on('message', async (msg: any) => {
    if (msg?.type === 'reload' && Array.isArray(msg.files)) {
      // v2.2: softReload 内部有并发保护，无需在此层加锁
      await internals.softReload(msg.files as FileChangeInfo[]);
    }
  });

  // 子进程也可能收到 cold restart 请求（来自自身的级联检测）
  // 通知主进程执行 cold restart
  process.on('message', (msg: any) => {
    if (msg?.type === 'request-cold-restart') {
      // 由主进程的 ColdRestarter 处理
      process.send?.({ type: 'request-cold-restart', reason: msg.reason });
    }
  });

  // ════════════════════════════════════════════════════════════════
  // 进程退出清理
  // ════════════════════════════════════════════════════════════════

  process.on('beforeExit', async () => {
    await compiler.dispose();
  });
}
```

---

## 5. CLI 集成

### 5.1 `vext dev` 命令

```ts
// cli/commands/dev.ts

import path from 'path'
import { VextFileWatcher, FileChangeEvent } from '../../lib/dev/file-watcher';
import { ColdRestarter } from '../../lib/dev/cold-restart';
import { classifyChange } from '../../lib/dev/change-classifier';
import { shouldUsePolling } from '../../lib/dev/detect-polling';

export async function devCommand(options: DevCommandOptions) {
  const projectRoot = options.root || process.cwd();
  // dev 模式入口：启动 dev-bootstrap
  // 编译产物由 DevCompiler 在子进程内管理
  const entryScript = path.join(
    projectRoot, 'node_modules', 'vextjs', 'lib', 'dev', 'dev-entry.js'
  );

  // ── 1. 启动 cold restarter ────────────────────────────────────
  const restarter = new ColdRestarter(entryScript);

  // 首次启动
  await restarter.restart('initial start');

  // ── 2. 启动文件监听 ───────────────────────────────────────────
  // 监听 src/ 源码目录，不监听 .vext/dev/ 编译产物
  const watcher = new VextFileWatcher({
    root: projectRoot,
    debounce: options.debounce || 100,
    usePolling: options.poll || shouldUsePolling(),
    pollInterval: options.pollInterval || 1000,
  });

  watcher.on('change', async (event: FileChangeEvent) => {
    console.log(`\n[vext dev] ${event.files.length} file(s) changed:`);
    for (const f of event.files) {
      const cls = classifyChange(f.path);
      const icon = cls.action === 'cold' ? '🔴'
                 : cls.action === 'soft' ? '🟢'
                 : '⚪';
      console.log(`  ${icon} ${f.path} (${f.type})`);
    }

    if (event.action === 'cold') {
      // ── Tier 3: 配置变更 → 完整重启 ──────────────────────────
      console.log('[vext dev] config change detected → cold restart...');
      await restarter.restart(event.files.map(f => f.path).join(', '));
    } else {
      // ── Tier 1/2: 业务代码变更 → IPC 通知 soft reload ─────────
      const hasStructural = event.files.some(
        f => f.type === 'add' || f.type === 'delete'
      );
      console.log(
        `[vext dev] source change detected → soft reload ` +
        `[${hasStructural ? 'T2:structural' : 'T1:code'}]...`
      );
      restarter.sendToChild({
        type: 'reload',
        files: event.files,  // FileChangeInfo[]（含 path + type）
      });
    }
  });

  await watcher.start();

  // ── 3. 处理子进程的 cold restart 请求 ──────────────────────────
  // 子进程在级联检测过大时会请求 cold restart
  // （通过 process.send → 主进程 IPC）
  // 注意：这里需要监听子进程的 IPC 消息

  // ── 4. 优雅退出 ───────────────────────────────────────────────
  const cleanup = async () => {
    watcher.stop();
    await restarter.kill();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  // ── 5. 键盘交互 ───────────────────────────────────────────────
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', (key) => {
      const char = key.toString();
      switch (char) {
        case 'r':
          console.log('[vext dev] manual cold restart...');
          restarter.restart('manual');
          break;
        case 'h':
          console.log('[vext dev] manual soft reload (all files)...');
          restarter.sendToChild({
            type: 'reload',
            files: [{ path: '*', type: 'modify' as const }],
          });
          break;
        case 'c':
          console.clear();
          break;
        case '\x03': // Ctrl+C
          cleanup();
          break;
      }
    });
  }

  // ── 6. 欢迎信息 ───────────────────────────────────────────────
  console.log(`
╔══════════════════════════════════════════════╗
║           Vext Dev Server v2.2               ║
║──────────────────────────────────────────────║
║  🟢 T1 (code):   routes, services, i18n     ║
║  🟡 T2 (struct): new/delete files            ║
║  🔴 T3 (cold):   config, plugins, .env      ║
║  ⚪ Ignored:     tests, docs, node_modules   ║
╠══════════════════════════════════════════════╣
║  Press r=restart  h=reload  c=clear  ^C=quit║
╚══════════════════════════════════════════════╝
  `);
}
```

### 5.2 DevCommandOptions 接口

```ts
interface DevCommandOptions {
  /** 项目根目录（默认: cwd） */
  root?: string;
  /** 强制使用 polling 模式 */
  poll?: boolean;
  /** Polling 间隔毫秒数（默认: 1000） */
  pollInterval?: number;
  /** 防抖间隔毫秒数（默认: 100） */
  debounce?: number;
  /** 禁用 soft reload，所有变更都走 cold restart */
  noHot?: boolean;
  /** 每次 reload 后清空控制台 */
  clear?: boolean;
}
```

---

## 6. CLI 选项

```
vext dev [options]

Options:
  --root <path>       项目根目录（默认: cwd）
  --poll              强制使用 polling 模式（适用于 Docker）
  --poll-interval     Polling 间隔毫秒数（默认: 1000）
  --debounce          防抖间隔毫秒数（默认: 100）
  --no-hot            禁用 soft reload，所有变更都走 cold restart
  --clear             每次 reload 后清空控制台
```

### 6.1 `--no-hot` 模式

当 `--no-hot` 启用时，所有变更事件都走 cold restart：

```ts
watcher.on('change', async (event: FileChangeEvent) => {
  if (options.noHot) {
    // 所有变更都走 cold restart
    await restarter.restart(event.files.map(f => f.path).join(', '));
  } else {
    // 正常分级处理
    // ...
  }
});
```

这为以下场景提供了降级手段：
- 调试 hot reload 本身的问题时
- 项目使用了不兼容 hot reload 的模式时（如全局单例 + 副作用）
- 首次使用 Vext 不确定 hot reload 是否稳定时

### 6.2 环境变量覆盖

| 环境变量 | 效果 | 等价 CLI 选项 |
|---------|------|-------------|
| `VEXT_DEV_POLL=1` | 使用 polling 模式 | `--poll` |
| `VEXT_DEV_POLL=0` | 强制不用 polling | — |
| `VEXT_DEV_NO_HOT=1` | 禁用 soft reload | `--no-hot` |
| `VEXT_DEV_DEBOUNCE=200` | 防抖间隔 200ms | `--debounce 200` |

---

## 附录：进程架构总览

```
╔══════════════════════════════════════════════════════════════╗
║                    vext dev (主进程)                          ║
║                                                              ║
║  ┌──────────────┐  ┌───────────────┐  ┌──────────────────┐  ║
║  │ FileWatcher   │  │ ColdRestarter │  │ CLI 交互 (stdin) │  ║
║  │ (fs.watch)   │  │               │  │ r=restart         │  ║
║  │              │  │               │  │ h=reload          │  ║
║  └──────┬───────┘  └───────┬───────┘  │ c=clear           │  ║
║         │                  │          │ ^C=quit            │  ║
║         │ FileChangeEvent  │ fork()   └──────────────────┘  ║
║         ▼                  ▼                                 ║
║  ┌──────────────┐  ┌───────────────┐                        ║
║  │ Classifier   │  │   IPC 通道     │                        ║
║  │ soft/cold    │  │               │                        ║
║  └──────┬───────┘  └───────┬───────┘                        ║
║    cold │ soft            │                                  ║
║    ┌────┴────┐            │                                  ║
║    ▼         ▼            │                                  ║
║  kill+fork  sendToChild   │                                  ║
║              │            │                                  ║
╚══════════════╪════════════╪══════════════════════════════════╝
               │            │
               ▼            ▼
╔══════════════════════════════════════════════════════════════╗
║                    Worker 子进程                              ║
║                                                              ║
║  ┌──────────┐  ┌──────────────┐  ┌────────────────────────┐ ║
║  │ Server   │  │ DevCompiler  │  │  Soft Reload Handler   │ ║
║  │ Socket   │  │ (esbuild)    │  │  ├─ 并发锁 (v2.2)      │ ║
║  │ (保持)   │  │              │  │  ├─ 分级编译            │ ║
║  └──────────┘  └──────────────┘  │  ├─ cache 清除          │ ║
║                                  │  ├─ 选择性 service 重载 │ ║
║  ┌──────────┐  ┌──────────────┐  │  ├─ fresh adapter       │ ║
║  │ DB Pool  │  │ Plugin       │  │  └─ handler swap        │ ║
║  │ (保持)   │  │ Instances    │  └────────────────────────┘ ║
║  └──────────┘  │ (保持)       │                              ║
║                └──────────────┘                              ║
║                                                              ║
║  ┌──────────────────────────────────────────────────────┐    ║
║  │ HotSwappableHandler                                  │    ║
║  │                                                      │    ║
║  │  server.listen(hotHandler.handle)                     │    ║
║  │         ↓                                            │    ║
║  │  每个请求: handler = this.currentHandler              │    ║
║  │           handler(req, res)                          │    ║
║  │                                                      │    ║
║  │  swap 时: this.currentHandler = newHandler            │    ║
║  │          （JS 单线程保证原子性）                        │    ║
║  └──────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 附录：v2.2 修复清单（本文件涉及）

| 编号 | 优先级 | 问题描述 | 修复位置 |
|------|--------|---------|---------|
| FIX-7 | 🟡 P1 | 无并发 reload 保护，快速连续保存导致两次 `softReload` 并行执行 | §3 `createApp` — 加入 `reloadLock` + `pendingReload` 队列 |
| FIX-8 | 🔴 P0 | `softReload` 中 `path.resolve(srcDir, 'src/...')` 路径双重嵌套 | §3 `_doSoftReload` — 改用 `compiler.getProjectRoot()` |
| FIX-9 | 🟠 P2 | `loadConfig(projectRoot)` 语义不清，dev 子进程无 tsx 无法加载 TS config | §4 `devBootstrap` — 明确从 `outDir` 加载编译后的 CJS config |
| FIX-10 | 🟠 P2 | Dev server 缺少 keepAliveTimeout 等配置，与生产 server 不一致 | §4 `devBootstrap` — 从 config.server 读取并应用到 createServer |