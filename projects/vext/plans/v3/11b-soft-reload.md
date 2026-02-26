# Vext v3 — Soft Reload 核心流程

> **文档编号**: 11b-soft-reload.md  
> **状态**: 设计稿 v2.2  
> **最后更新**: 2026-02-28  
> **父文档**: [11-hot-reload.md](./11-hot-reload.md)  
> **关联文件**: `11a-dev-compiler.md`, `11c-file-watcher.md`, `11d-bootstrap-cli.md`, `02-services.md`, `08-adapter.md`

---

## 目录

- [1. 核心流程概览](#1-核心流程概览)
- [2. require.cache 精确清除](#2-requirecache-精确清除)
- [3. requestHandler 原子替换（HotSwappableHandler）](#3-requesthandler-原子替换hotswappablehandler)
- [4. 服务实例重载（选择性重载）](#4-服务实例重载选择性重载)
- [5. 路由重载（Fresh Adapter 策略）](#5-路由重载fresh-adapter-策略)
- [6. i18n 热替换](#6-i18n-热替换)
- [7. 完整流程伪代码](#7-完整流程伪代码)
- [8. 时序图](#8-时序图)

---

## 1. 核心流程概览

> **v2.1 关键改动**：引入分级编译策略 + 选择性服务重载，避免每次修改都全量编译/重建所有服务。  
> **v2.2 关键修复**：修正路径解析 Bug（P0）、修正嵌套 Service 重载 Bug（P0）、统一 adapter 接口命名（P1）。

```
文件变更事件 (src/ 下的源码变更)
    │
    ▼
[1] 防抖合并（100ms 窗口内的多个变更合并为一次 reload）
    │
    ▼
[2] 收集变更文件列表 + 变更类型（modify/add/delete）
    → 主进程通过 IPC 发送给 Worker
    │
    ▼
[3] Worker 收到 reload 指令，获取 reload 锁（v2.2），进入 reload 流程：
    │
    ├─ [3a] 分级编译（根据变更类型选择编译策略）
    │        │
    │        ├─ 代码变更（modify，95% 场景）:
    │        │   → esbuild.transform() 逐文件编译（~1-5ms/文件，与项目大小无关）
    │        │
    │        └─ 结构变更（add/delete，5% 场景）:
    │            → ctx.rebuild() 全量增量编译（重建 entry points）
    │
    ├─ [3b] 构建依赖失效树（从编译产物向上追溯所有依赖者）
    │
    ├─ [3c] 从 require.cache 中删除失效模块（操作编译后的 .js 文件）
    │
    ├─ [3d] 创建全新 adapter 实例，重新执行加载流程：
    │        ├─ loadMiddlewares()          → 从 .vext/dev/ require（未变更的模块命中缓存 ~0.01ms/个）
    │        ├─ reloadServices(app)        → 选择性重载（仅重建 invalidation set 内的 service）
    │        ├─ loadRoutes(adapter, ...)   → 注册到新 adapter（未变更的路由 require 命中缓存）
    │        └─ adapter.buildHandler()     → 构建完整 requestHandler
    │
    ├─ [3e] 原子替换 requestHandler 引用
    │        （新请求走新 handler，旧请求走旧闭包）
    │
    ├─ [3f] 输出 reload 完成日志 + 耗时
    │
    └─ [3g] 释放 reload 锁，处理待处理队列（v2.2）
```

**性能关键点**：

- **编译层**：代码变更使用 `esbuild.transform()` 单文件编译（~1-5ms），不扫描其他文件。仅在新增/删除文件时才走 `ctx.rebuild()` 全量增量编译。
- **服务层**：只重新实例化 invalidation set 中包含的 service，其他 service 实例保持不变（避免构造函数副作用和资源浪费）。
- **路由层**：fresh adapter 策略保持不变。未变更的路由文件 `require()` 命中缓存（~0.01ms/个），实际 I/O 开销仅来自变更的文件。

---

## 2. require.cache 精确清除

**关键**: 不能清除所有缓存（那等于重启），必须只清除变更文件及其"上游依赖链"。

与 v1 方案不同的是，所有 `require.cache` 操作的对象都是 `.vext/dev/` 下的编译产物（纯 CJS `.js`），不再涉及 TS 文件或 ESM 模块。

### 2.1 反向依赖图

```ts
// lib/dev/cache-invalidator.ts

import path from 'path'

/**
 * 构建模块反向依赖图
 * key: 被依赖的模块路径
 * value: 依赖该模块的所有模块路径集合
 *
 * 由于所有模块都是 CJS .js（esbuild 编译产物），
 * require.cache 和 Module.children 完整可用。
 */
function buildReverseDependencyGraph(): Map<string, Set<string>> {
  const graph = new Map<string, Set<string>>();

  for (const [modulePath, mod] of Object.entries(require.cache)) {
    if (!mod || !mod.children) continue;
    for (const child of mod.children) {
      if (!graph.has(child.filename)) {
        graph.set(child.filename, new Set());
      }
      graph.get(child.filename)!.add(modulePath);
    }
  }

  return graph;
}
```

### 2.2 失效集合计算

```ts
/**
 * 给定变更文件列表（编译产物路径），计算需要失效的所有模块路径
 * 使用 BFS 沿反向依赖图向上传播
 *
 * 安全边界: 不越过 node_modules 和 config 目录
 *
 * @param compiledFiles 变更的编译产物绝对路径（.vext/dev/ 下的 .js 文件）
 * @param outDir 编译产物根目录（.vext/dev/ 的绝对路径）
 */
export function computeInvalidationSet(
  compiledFiles: string[],
  outDir: string,
): Set<string> {
  const reverseGraph = buildReverseDependencyGraph();
  const invalidated = new Set<string>();

  // 将编译产物路径解析为 require.resolve 能识别的绝对路径
  const queue = compiledFiles
    .map(f => {
      try { return require.resolve(f); }
      catch { return null; }
    })
    .filter((f): f is string => f !== null);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (invalidated.has(current)) continue;

    // 安全边界：不失效 node_modules
    if (current.includes('node_modules')) continue;

    // 安全边界：不失效 config 目录（config 变更走 cold restart）
    if (current.includes(path.join(outDir, 'config'))) continue;

    invalidated.add(current);

    // 向上传播到依赖它的模块
    const dependents = reverseGraph.get(current);
    if (dependents) {
      for (const dep of dependents) {
        if (!invalidated.has(dep)) {
          queue.push(dep);
        }
      }
    }
  }

  return invalidated;
}
```

### 2.3 缓存驱逐

```ts
/**
 * 从 require.cache 中删除指定模块集合
 */
export function evictModules(modulePaths: Set<string>): number {
  let evicted = 0;
  for (const modulePath of modulePaths) {
    if (require.cache[modulePath]) {
      delete require.cache[modulePath];
      evicted++;
    }
  }
  return evicted;
}
```

### 2.4 循环依赖级联检测

```ts
/**
 * 在缓存失效时检测循环依赖导致的级联爆炸
 * 如果失效集合超过总缓存的 80%，认为是异常，建议 cold restart
 */
export function detectCircularInvalidation(invalidated: Set<string>): boolean {
  const totalCached = Object.keys(require.cache).length;
  if (invalidated.size > totalCached * 0.8) {
    console.warn(
      '[hot-reload] ⚠️ invalidation cascade too large ' +
      `(${invalidated.size}/${totalCached}), falling back to cold restart`
    );
    return true;
  }
  return false;
}
```

---

## 3. requestHandler 原子替换（HotSwappableHandler）

这是实现"零中断"的关键。Server socket 绑定的是一个 **间接引用**，替换引用即可让新请求走新逻辑：

```ts
// lib/core/server.ts

import { IncomingMessage, ServerResponse } from 'http'

type RequestHandler = (req: IncomingMessage, res: ServerResponse) => void;

/**
 * HotSwappableHandler
 *
 * Server socket 始终调用 this.handle()
 * soft reload 时只需替换 this.currentHandler
 *
 * 正在处理中的请求使用的是旧闭包（已经在调用栈中），不受影响
 * 新请求调用时获取的是新 handler
 */
export class HotSwappableHandler {
  private currentHandler: RequestHandler;
  private reloadCount = 0;

  constructor(initialHandler: RequestHandler) {
    this.currentHandler = initialHandler;
  }

  /**
   * Server socket 绑定的入口函数
   * 每次请求都读取 currentHandler 的最新引用
   */
  handle = (req: IncomingMessage, res: ServerResponse) => {
    // 读取当前 handler 引用（原子操作，JS 单线程保证安全）
    const handler = this.currentHandler;
    handler(req, res);
  };

  /**
   * 原子替换 handler
   * 由于 JS 是单线程的，赋值操作天然是原子的
   * 不需要锁，不需要 CAS
   */
  swap(newHandler: RequestHandler): void {
    this.currentHandler = newHandler;
    this.reloadCount++;
  }

  getReloadCount(): number {
    return this.reloadCount;
  }
}
```

**为什么这是安全的？**

| 场景 | 行为 |
|------|------|
| 请求在 reload 之前到达 | 进入旧 handler 的调用栈，使用旧闭包，正常完成 |
| 请求在 swap() 之后到达 | 读取到新 handler 引用，走新代码路径 |
| 请求在 swap() 同时到达 | JS 单线程，不存在"同时"；要么读到旧的，要么读到新的 |
| 旧 handler 闭包中的模块引用 | 闭包持有的是对象引用（非 require.cache 条目），GC 前一直有效 |

---

## 4. 服务实例重载（选择性重载）

> **v2.1 关键改动**：只重新实例化 invalidation set 中包含的 service，其他 service 保持不变。  
> **v2.2 关键修复**：正确处理嵌套 service 路径（如 `payment/stripe` → `app.services.payment.stripe`）。

### 4.1 问题背景

Service 在 Vext v3 中是类实例，注入到 `app.services`。v2 方案每次 soft reload 都重建**全部** service，存在以下问题：

| 问题 | 影响 |
|------|------|
| 未变更的 service 被无意义地重新实例化 | 浪费 CPU 时间（100 个 service 的项目 ~50-100ms） |
| 构造函数副作用重复执行 | DB 连接池重建、定时器重复注册、事件监听器泄漏 |
| 旧实例的清理不完整 | `delete app.services[key]` 不会调用析构/清理逻辑 |

### 4.2 实现

```ts
// lib/dev/service-reloader.ts

import path from 'path'
import { scanDirectory } from '../utils'

/**
 * 将 service 文件路径转为嵌套 key 数组
 * 复用 service-loader 的路径转换逻辑（详见 02-services.md）
 *
 * 示例：
 *   "user.js"             → ["user"]
 *   "user-profile.js"     → ["userProfile"]
 *   "payment/stripe.js"   → ["payment", "stripe"]
 *   "payment/ali-pay.js"  → ["payment", "aliPay"]
 *
 * v2.2 修复：v2.1 使用 path.basename() 只取文件名，
 * 无法处理嵌套目录结构，导致 payment/stripe.js 被错误地
 * 映射为 app.services["stripe"] 而非 app.services.payment.stripe。
 */
function filePathToServiceKeys(filePath: string): string[] {
  return filePath
    .replace(/\.js$/, '')
    .split(/[/\\]/)
    .map(seg => seg.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase()))
}

/**
 * 从嵌套对象中读取值
 * getNestedValue(obj, ["payment", "stripe"]) → obj.payment.stripe
 */
function getNestedValue(obj: Record<string, any>, keys: string[]): any {
  let cur = obj
  for (const key of keys) {
    if (cur === undefined || cur === null) return undefined
    cur = cur[key]
  }
  return cur
}

/**
 * 向嵌套对象中设置值
 * setNestedValue(obj, ["payment", "stripe"], value) → obj.payment.stripe = value
 */
function setNestedValue(obj: Record<string, any>, keys: string[], value: any): void {
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] === undefined) cur[keys[i]] = {}
    cur = cur[keys[i]]
  }
  cur[keys[keys.length - 1]] = value
}

/**
 * 选择性重载 service（v2.2）
 *
 * 只重新实例化变更的 service，其他 service 实例保持不变。
 * 正确处理嵌套目录结构（如 payment/stripe → app.services.payment.stripe）。
 *
 * @param app VextApp 实例
 * @param outDir 编译产物目录（.vext/dev/）
 * @param invalidated require.cache 失效集合（绝对路径）
 */
export async function reloadServices(
  app: VextApp,
  outDir: string,
  invalidated: Set<string>,
): Promise<void> {
  const servicesDir = path.join(outDir, 'services');

  // 1. 筛选出需要重载的 service 文件（在 invalidation set 中的）
  const allServiceFiles = scanDirectory(servicesDir, /\.js$/);
  const affectedFiles = allServiceFiles.filter(file => {
    const resolved = require.resolve(file);
    return invalidated.has(resolved);
  });

  // 如果没有 service 被影响，直接跳过
  if (affectedFiles.length === 0) {
    app.logger.debug('[hot-reload] no services affected, skipping service reload');
    return;
  }

  // 2. 保存受影响 service 的旧引用（用于回退）
  // v2.2: 使用 filePathToServiceKeys 正确处理嵌套路径
  const previousServices: Array<{ keys: string[]; instance: any }> = [];
  for (const file of affectedFiles) {
    const relativePath = path.relative(servicesDir, file);
    const keys = filePathToServiceKeys(relativePath);
    const oldInstance = getNestedValue(app.services as Record<string, any>, keys);
    if (oldInstance !== undefined) {
      previousServices.push({ keys, instance: oldInstance });
    }
  }

  try {
    // 3. 仅重载受影响的 service
    for (const file of affectedFiles) {
      const relativePath = path.relative(servicesDir, file);
      const keys = filePathToServiceKeys(relativePath);
      const dotPath = keys.join('.');

      // 调用旧实例的清理方法（如果存在）
      const oldInstance = getNestedValue(app.services as Record<string, any>, keys);
      if (oldInstance && typeof oldInstance.dispose === 'function') {
        try {
          await oldInstance.dispose();
        } catch (e) {
          app.logger.warn(`[hot-reload] service "${dotPath}" dispose() failed: ${(e as Error).message}`);
        }
      }

      // require.cache 已被清除，require() 会加载新编译的 .js
      const ServiceClass = require(file);
      const Cls = ServiceClass.default || ServiceClass;

      // 如果是 class，实例化；如果是普通对象/函数，直接赋值
      let newInstance: any;
      if (typeof Cls === 'function' && /^\s*class\s/.test(Cls.toString())) {
        newInstance = new Cls(app);
      } else {
        newInstance = Cls;
      }

      // v2.2: 使用 setNestedValue 正确设置嵌套路径
      setNestedValue(app.services as Record<string, any>, keys, newInstance);
    }

    app.logger.info(
      `[hot-reload] services reloaded: ${affectedFiles.length} changed` +
      ` (${allServiceFiles.length - affectedFiles.length} unchanged, kept)`
    );
  } catch (err) {
    // 4. 回退：仅恢复受影响的 service
    for (const { keys, instance } of previousServices) {
      setNestedValue(app.services as Record<string, any>, keys, instance);
    }
    throw err; // 向上抛出，由 reload 总流程处理
  }
}
```

### 4.3 Service 清理约定

如果 service 类实现了可选的 `dispose()` 方法，hot reload 时会在销毁旧实例前调用。建议在 `dispose()` 中清理定时器、关闭连接等副作用资源：

```ts
// src/services/scheduler.ts — 用户代码示例
export default class SchedulerService {
  private timer: NodeJS.Timeout;

  constructor(app: VextApp) {
    this.timer = setInterval(() => this.tick(), 60_000);
  }

  /** 框架在 hot reload 时自动调用（可选实现） */
  dispose() {
    clearInterval(this.timer);
  }

  private tick() {
    // ...
  }
}
```

### 4.4 嵌套 Service 重载示例

```
目录结构:
  .vext/dev/services/
  ├── user.js                → app.services.user
  ├── order.js               → app.services.order
  └── payment/
      ├── stripe.js          → app.services.payment.stripe
      └── alipay.js          → app.services.payment.alipay

场景: 修改 src/services/payment/stripe.ts

  invalidated 包含: .vext/dev/services/payment/stripe.js

  reloadServices 行为:
    1. relativePath = "payment/stripe.js"
    2. keys = ["payment", "stripe"]
    3. oldInstance = app.services.payment.stripe
    4. 如果 oldInstance.dispose 存在 → 调用
    5. newInstance = new (require(".vext/dev/services/payment/stripe.js").default)(app)
    6. app.services.payment.stripe = newInstance ✅
    7. app.services.user / order / payment.alipay → 保持不变 ✅
```

---

## 5. 路由重载（Fresh Adapter 策略）

> **v2 关键改动**：不再使用 Vext 自建 router，改为创建全新的 adapter 实例。  
> **v2.2 修复**：统一使用 `registerErrorHandler()`（与 `08-adapter.md` 一致）。

### 5.1 为什么需要 Fresh Adapter

| 问题 | 影响 |
|------|------|
| hot reload 用 Vext 自建 router，prod 用 Hono trie router | 路由匹配行为可能不一致（优先级、通配符、参数提取） |
| 绕过 adapter 层直接构建 handler | Adapter 注入的逻辑丢失（VextRequest/VextResponse 转换、trustProxy 等） |
| Hono 不支持 clearRoutes/removeRoute | 无法在同一 Hono 实例上增量更新 |

**解决方案**：每次 soft reload 创建全新的 adapter 实例。

### 5.2 实现

```ts
// lib/dev/route-reloader.ts

import path from 'path'
import { resolveAdapter } from '../adapter'
import { loadRouteFiles, resolveMiddlewares } from '../router-loader'
import { createErrorHandler, createNotFoundHandler } from '../error-handler'

/**
 * 重载路由并构建新的 requestHandler
 *
 * 核心策略：创建全新的 adapter 实例
 * - Hono 等框架不支持清除路由 → 新建实例解决
 * - 新 adapter 走与生产环境完全一致的注册 + 构建流程
 * - 旧 adapter 实例由 GC 自动回收
 *
 * @param app VextApp 实例（保持不变）
 * @param config VextConfig（保持不变）
 * @param middlewareDefs 重新加载的中间件定义
 * @param globalMiddlewares 全局中间件列表（来自 plugins，保持不变）
 * @param outDir 编译产物目录（.vext/dev/）
 * @returns 新的 requestHandler（供 HotSwappableHandler.swap 使用）
 */
export async function reloadRoutes(
  app: VextApp,
  config: VextConfig,
  middlewareDefs: MiddlewareDefMap,
  globalMiddlewares: Middleware[],
  outDir: string,
): Promise<RequestHandler> {
  const routesDir = path.join(outDir, 'routes');

  // 1. ✅ 创建全新的 adapter 实例（不是复用旧的！）
  //    这样路由注册表是干净的，且与生产环境走同一条代码路径
  const freshAdapter = resolveAdapter(config);

  // 2. 注册全局中间件（来自 plugins，soft reload 时不变）
  for (const mw of globalMiddlewares) {
    freshAdapter.registerMiddleware(mw);
  }

  // 3. 设置错误处理器
  // v2.2 修复：统一使用 registerErrorHandler（与 08-adapter.md 接口一致）
  freshAdapter.registerErrorHandler(createErrorHandler(config));

  // 4. 设置 404 处理器
  freshAdapter.registerNotFound(createNotFoundHandler(config));

  // 5. 重新加载路由文件并注册到新 adapter
  //    require.cache 已被清除，require() 会从 .vext/dev/ 读取新编译的 .js
  const routeDefinitions = loadRouteFiles(routesDir);

  for (const routeDef of routeDefinitions) {
    const middlewareChain = resolveMiddlewares(routeDef.options, middlewareDefs);
    freshAdapter.registerRoute(
      routeDef.method,
      routeDef.path,
      [...middlewareChain, routeDef.handler],
    );
  }

  // 6. ✅ 从 adapter 构建完整的 requestHandler
  //    adapter 内部的所有逻辑（VextRequest/VextResponse 转换、
  //    Hono trie router、trustProxy 处理等）全部保持一致
  const requestHandler = freshAdapter.buildHandler();

  app.logger.info(`[hot-reload] routes reloaded via fresh adapter: ${routeDefinitions.length} routes`);

  return requestHandler;
}
```

### 5.3 VextAdapter 接口扩展

需要在 VextAdapter 接口上新增 `buildHandler()` 方法（同步更新 `08-adapter.md`）：

```ts
// lib/adapter.ts — VextAdapter 接口扩展

interface VextAdapter {
  name: string;

  registerMiddleware(middleware: VextMiddleware): void;
  registerRoute(method: string, path: string, chain: VextMiddleware[]): void;
  registerErrorHandler(handler: VextErrorMiddleware): void;
  registerNotFound(handler: VextMiddleware): void;

  /**
   * 构建完整的请求处理函数
   *
   * 在所有路由 / 中间件注册完成后调用。
   * 返回的 handler 接受原始 Node.js req/res，内部完成：
   *   - 请求/响应对象转换（如 HonoContext → VextRequest/VextResponse）
   *   - 路由匹配（如 Hono trie router）
   *   - 中间件链执行
   *   - 错误处理
   *   - 404 兜底
   *
   * listen() 内部也调用此方法。hot reload 时只需 buildHandler() 不需 listen()。
   */
  buildHandler(): RequestHandler;

  /**
   * 启动 HTTP 服务并监听端口
   * 内部调用 buildHandler() 并绑定到 server
   */
  listen(port: number, host?: string): Promise<VextServerHandle>;
}
```

### 5.4 Hono adapter 的 buildHandler() 实现

```ts
// adapters/hono/adapter.ts — buildHandler 实现

export function createHonoAdapter(appInstance: VextApp): VextAdapter {
  const hono = new Hono();
  // ... registerRoute / registerMiddleware 等现有逻辑 ...

  return {
    // ... 现有方法 ...

    buildHandler(): RequestHandler {
      // 将 Hono 的 fetch handler 转为 Node.js 的 (req, res) 形式
      // @hono/node-server 内部就是这样做的
      return (req: IncomingMessage, res: ServerResponse) => {
        const request = toWebRequest(req);
        hono.fetch(request)
          .then(response => writeResponse(res, response))
          .catch(err => {
            res.statusCode = 500;
            res.end('Internal Server Error');
          });
      };
    },

    async listen(port: number, host = '0.0.0.0'): Promise<VextServerHandle> {
      const handler = this.buildHandler();
      return new Promise((resolve) => {
        const server = createServer(handler);
        server.listen(port, host, () => {
          resolve({
            port,
            host,
            async close() { server.close(); },
          });
        });
      });
    },
  };
}
```

### 5.5 策略对比

| 对比项 | v1（自建 router） | v2+（新 adapter 实例）✅ |
|--------|------------------|------------------------|
| Dev/Prod 一致性 | ❌ 不同 router、不同中间件执行 | ✅ 完全一致的代码路径 |
| Adapter 功能保留 | ❌ VextRequest/VextResponse 转换可能丢失 | ✅ adapter 内部逻辑完整保留 |
| Hono 路由能力 | ❌ 用不到 trie router 优化 | ✅ 使用 Hono 原生路由 |
| 第三方 adapter 兼容 | ❌ 只兼容自建 router | ✅ 任何 adapter 都适用 |
| 内存开销 | 略低 | 旧实例被 GC 回收，几乎无差 |

---

## 6. i18n 热替换

```ts
// lib/dev/i18n-reloader.ts

import fs from 'fs'
import path from 'path'

/**
 * 重载 i18n 语言包
 *
 * @param outDir 编译产物目录（.vext/dev/）
 */
export async function reloadLocales(outDir: string): Promise<void> {
  const localesDir = path.join(outDir, 'locales');
  if (!fs.existsSync(localesDir)) return;

  const localeFiles = fs.readdirSync(localesDir)
    .filter(f => /\.js$/.test(f) && !f.endsWith('.js.map'));

  for (const file of localeFiles) {
    const locale = path.basename(file, '.js');  // e.g. 'zh-CN'
    const fullPath = path.join(localesDir, file);

    // require.cache 已在前面被清除，这里会重新加载编译后的 .js
    const messages = require(fullPath);
    Locale.addLocale(locale, messages.default || messages);
  }
}
```

---

## 7. 完整流程伪代码

```ts
// 完整 soft reload 流程（v2.2，含所有修复）

import path from 'path'
import { DevCompiler } from './compiler'
import { computeInvalidationSet, evictModules, detectCircularInvalidation } from './cache-invalidator'
import { reloadServices } from './service-reloader'
import { reloadRoutes } from './route-reloader'
import { reloadLocales } from './i18n-reloader'
import { HotSwappableHandler } from '../core/server'
import { FileChangeInfo } from './file-watcher'

async function handleSoftReload(
  changedFiles: FileChangeInfo[],
  app: VextApp,
  hotHandler: HotSwappableHandler,
  compiler: DevCompiler,
  config: VextConfig,
): Promise<void> {
  const t0 = performance.now();

  // ── Step 0: 分级编译 ────────────────────────────────────────

  const hasStructuralChange = changedFiles.some(
    f => f.type === 'add' || f.type === 'delete'
  );

  if (hasStructuralChange) {
    // Tier 2: 结构变更 → 重建 esbuild context + 全量增量编译
    await compiler.rebuildWithNewEntryPoints();
  } else {
    // Tier 1: 代码变更 → 单文件编译（O(1)，与项目大小无关）
    // v2.2 修复：使用 getProjectRoot() 正确解析路径
    //   v2.1 Bug: path.resolve(srcDir, "src/routes/user.ts") → srcDir/src/routes/user.ts (双重嵌套!)
    //   v2.2 Fix: path.resolve(projectRoot, "src/routes/user.ts") → projectRoot/src/routes/user.ts ✅
    const projectRoot = compiler.getProjectRoot();
    const srcFiles = changedFiles.map(
      f => path.resolve(projectRoot, f.path)
    );
    await compiler.compileFiles(srcFiles);
  }
  const t1 = performance.now();

  // ── Step 1: 清除 require.cache ──────────────────────────────

  const outDir = compiler.getOutDir();
  const filePaths = changedFiles.map(f => f.path);

  // 精确清除（操作编译产物 .js 文件）
  const compiledFiles = filePaths.map(f => compiler.resolveCompiled(f));
  const invalidationSet = computeInvalidationSet(compiledFiles, outDir);

  // 安全检查：级联是否过大
  if (detectCircularInvalidation(invalidationSet)) {
    process.send?.({ type: 'request-cold-restart', reason: 'cascade too large' });
    return;
  }

  const evicted = evictModules(invalidationSet);
  const t2 = performance.now();

  // ── Step 2: 重载 i18n ───────────────────────────────────────

  if (filePaths.some(f => f.includes('locales/'))) {
    await reloadLocales(outDir);
  }
  const t3 = performance.now();

  // ── Step 3: 重载 middleware definitions ──────────────────────

  const middlewareDefs = await loadMiddlewares(
    path.join(outDir, 'middlewares'),
    config.middlewares ?? [],
    app.logger,
  );
  const t4 = performance.now();

  // ── Step 4: 选择性重载 services ─────────────────────────────

  await reloadServices(app, outDir, invalidationSet);
  const t5 = performance.now();

  // ── Step 5: 创建新 adapter 实例 + 重载 routes ───────────────

  const globalMiddlewares = app._internals.getGlobalMiddlewares();
  const newHandler = await reloadRoutes(
    app, config, middlewareDefs, globalMiddlewares, outDir,
  );
  const t6 = performance.now();

  // ── Step 6: 原子替换 ────────────────────────────────────────

  hotHandler.swap(newHandler);
  const t7 = performance.now();

  // ── Step 7: 性能报告 ────────────────────────────────────────

  const tier = hasStructuralChange ? 'T2:structural' : 'T1:code';
  console.log(
    `[hot-reload] ✅ ${(t7 - t0).toFixed(0)}ms [${tier}] ` +
    `(compile:${(t1-t0).toFixed(0)}ms ` +
    `cache:${(t2-t1).toFixed(0)}ms ` +
    `i18n:${(t3-t2).toFixed(0)}ms ` +
    `mw:${(t4-t3).toFixed(0)}ms ` +
    `svc:${(t5-t4).toFixed(0)}ms ` +
    `route:${(t6-t5).toFixed(0)}ms ` +
    `swap:${(t7-t6).toFixed(0)}ms) ` +
    `[${evicted} modules evicted]`
  );

  // 8. 内存监控
  reportMemoryIfNeeded();
}
```

---

## 8. 时序图

### 8.1 Tier 1（代码变更 — 95% 场景）

```
Developer saves file (src/routes/user.ts)
         │
         ▼
   ┌──────────────────┐
   │   Main Process    │
   │   FileWatcher     │
   │                   │    100ms debounce
   │  ┌──────────────┐ │───────────────────┐
   │  │ fs.watch      │ │                   │
   │  │ (监听 src/)   │ │                   ▼
   │  └──────────────┘ │           ┌──────────────┐
   │                   │           │ flush()      │
   │  ┌──────────────┐ │           │ type=modify  │
   │  │  Classifier  │◀┼───────────┤              │
   │  └──────┬───────┘ │           └──────────────┘
   │         │         │
   │    soft │ cold    │
   │    ┌────┴────┐    │
   │    ▼         ▼    │
   │  IPC msg   kill   │
   │    │       +fork  │
   └────┼─────────┼────┘
        │         │
        ▼         ▼
   ┌──────────────────┐
   │  Worker Process   │
   │                   │
   │  0. acquire lock  │  ~0ms   ← v2.2: 并发保护
   │  1. transform()   │  ~3ms   ← 单文件编译，不扫描其他文件
   │  2. evict cache   │  ~1ms   (delete require.cache[...])
   │  3. load mw/svc   │  ~3ms   (仅重建 invalidated 的 service)
   │  4. require routes │  ~10ms  (199 个缓存命中 + 1 个新加载)
   │  5. new adapter   │  ~5ms   (新 Hono 实例 + 注册 200 路由)
   │  6. buildHandler  │  ~1ms   (adapter.buildHandler())
   │  7. swap handler  │  ~0ms   (hotHandler.swap())
   │  8. release lock  │  ~0ms
   │                   │
   │  Total: ~23ms     │  ← 与项目文件总数几乎无关
   └──────────────────┘
```

### 8.2 Tier 2（结构变更 — 5% 场景）

```
Developer creates file (src/routes/new-endpoint.ts)
         │
         ▼
   ┌──────────────────┐
   │  Worker Process   │
   │                   │
   │  0. acquire lock  │  ~0ms
   │  1. rebuild()     │  ~80ms   ← 重建 context，扫描全部 entry points
   │  2. evict cache   │  ~1ms
   │  3. load mw/svc   │  ~3ms
   │  4. require routes │  ~12ms  (200 个缓存命中 + 1 个新加载)
   │  5. new adapter   │  ~5ms   (新 Hono 实例 + 注册 201 路由)
   │  6. buildHandler  │  ~1ms
   │  7. swap handler  │  ~0ms
   │  8. release lock  │  ~0ms
   │                   │
   │  Total: ~102ms    │  ← 仅在新增/删除文件时触发
   └──────────────────┘
```

> **v2.1 关键改进**：95% 的代码变更走 Tier 1 路径（`transform()` 单文件编译），
> 耗时与项目大小几乎无关。只有新增/删除文件才走 Tier 2 路径（`ctx.rebuild()` 全量）。

---

## 附录：v2.2 修复清单

| 编号 | 优先级 | 问题描述 | 修复位置 |
|------|--------|---------|---------|
| FIX-1 | 🔴 P0 | `softReload` 中 `path.resolve(srcDir, 'src/...')` 导致路径双重嵌套 | §7 `handleSoftReload` — 改用 `compiler.getProjectRoot()` |
| FIX-2 | 🔴 P0 | `reloadServices` 用 `path.basename()` 获取 name，无法处理嵌套路径 `payment/stripe` | §4.2 `reloadServices` — 改用 `filePathToServiceKeys()` + `getNestedValue()` / `setNestedValue()` |
| FIX-3 | 🟡 P1 | `setErrorHandler()` 与 `08-adapter.md` 的 `registerErrorHandler()` 命名不一致 | §5.2 `reloadRoutes` — 统一为 `registerErrorHandler()` |