# 09 - CLI（vext dev / start / build / create）

> **项目**: vext (vextjs)
> **日期**: 2026-02-26（最后更新: 2026-02-28 P0 vext build 设计）
> **状态**: ✅ 已确认
> **依赖**: 目录结构（`00-directory-structure.md` ✅）、配置层（`05-config.md` ✅）、内置模块（`06-built-ins.md` ✅）

---

## 0. 概述

vextjs 通过 CLI 命令驱动项目启动，用户**无需编写 `app.ts` / `server.ts`**。

| 命令 | 用途 | 热重载 | 运行时 |
|------|------|--------|--------|
| `vext dev` | 开发模式 | ✅ 三层热重载（Soft Reload + Cold Restart） | esbuild 预编译 CJS |
| `vext build` | 编译 TS→JS | ❌ 一次性编译 | esbuild 全量编译到 `dist/` |
| `vext start` | 生产模式 | ❌ 无监听 | 有 `dist/` → `node`；无 `dist/` → TS 用 `tsx`、JS 用 `node` |

> **`vext build`**：通过 esbuild 将 TypeScript 编译为 JavaScript 输出到 `dist/`，移除生产模式对 tsx 的依赖。详见 [`09a-build.md`](./09a-build.md)。

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

## 1. CLI 入口

### 1.1 `package.json` bin 声明

```json
{
  "name": "vextjs",
  "bin": {
    "vext": "./dist/cli/index.js"
  }
}
```

### 1.2 命令解析

```typescript
// vextjs/cli/index.ts
import { parseArgs } from 'node:util'

const { positionals } = parseArgs({
  allowPositionals: true,
  strict: false,
})

const command = positionals[0]

switch (command) {
  case 'dev':
    await import('./dev.js').then(m => m.run())
    break
  case 'build':
    await import('./build.js').then(m => m.run())
    break
  case 'start':
    await import('./start.js').then(m => m.run())
    break
  case 'stop':
    await import('./stop.js').then(m => m.run())
    break
  case 'reload':
    await import('./reload.js').then(m => m.run())
    break
  case 'status':
    await import('./status.js').then(m => m.run())
    break
  default:
    console.error(
      `[vextjs] Unknown command: "${command}"\n` +
      `         Available commands: dev, build, start, stop, reload, status, create`
    )
    process.exit(1)
}
```

> **设计说明**：使用 Node.js 内置 `parseArgs`（v18.3+），不引入 commander / yargs 等第三方 CLI 库，保持零依赖。

---

## 2. `vext dev` — 开发模式

### 2.1 职责

1. 发现项目根目录和 `src/` 目录
2. 检测项目语言（TS / JS）
3. 启动子进程运行 dev-bootstrap（esbuild 预编译 + Soft Reload）
4. 启动 `fs.watch`（Node 内置）监听 `src/`，按文件类型分级处理：
   - **Tier 1**（代码修改，95%）：IPC 通知子进程 Soft Reload（~23ms）
   - **Tier 2**（文件增删，5%）：IPC 通知子进程全量增量编译（~100ms）
   - **Tier 3**（配置/插件/.env）：kill + fork 冷重启（~2000ms）
5. 转发子进程的 stdout / stderr

> **详细设计**见 `11-hot-reload.md` 及子文件（`11a` ~ `11e`）。

### 2.2 架构概览

```
╔══════════════════════════════════════════════════╗
║              vext dev（主进程）                    ║
║                                                  ║
║  ┌────────────┐  ┌───────────────┐               ║
║  │ FileWatcher │  │ ColdRestarter │               ║
║  │ (fs.watch)  │  │ (fork/kill)   │               ║
║  └──────┬─────┘  └───────┬───────┘               ║
║    soft │ cold           │                        ║
║    ┌────┴────┐           │                        ║
║    ▼         ▼           ▼                        ║
║  IPC msg   kill+fork                              ║
╚════╪═════════╪═══════════════════════════════════╝
     │         │
     ▼         ▼
╔══════════════════════════════════════════════════╗
║              Worker 子进程                        ║
║                                                  ║
║  DevCompiler (esbuild) → .vext/dev/ (CJS)        ║
║  HotSwappableHandler → 原子替换 requestHandler    ║
║  Server socket 保持不变                           ║
║  DB 连接池 / Plugin 实例 保持不变                  ║
╚══════════════════════════════════════════════════╝
```

### 2.3 实现

```typescript
// vextjs/cli/dev.ts
import { fork, type ChildProcess } from 'node:child_process'
import path from 'node:path'
import { detectProject } from './utils/detect-project.js'
import { VextFileWatcher, type FileChangeEvent } from '../lib/dev/file-watcher.js'
import { ColdRestarter } from '../lib/dev/cold-restart.js'
import { shouldUsePolling } from '../lib/dev/detect-polling.js'

export async function run() {
  const project = detectProject(process.cwd())

  console.log(`[vextjs] dev mode — ${project.language === 'ts' ? 'TypeScript' : 'JavaScript'}`)
  console.log(`[vextjs] watching: ${project.srcDir}`)

  // dev 模式入口：子进程运行 dev-bootstrap（esbuild 预编译 + Soft Reload）
  const entryScript = path.join(
    project.rootDir, 'node_modules', 'vextjs', 'lib', 'dev', 'dev-entry.js'
  )

  // ── 1. 启动 ColdRestarter ────────────────────────────────
  const restarter = new ColdRestarter(entryScript)
  await restarter.restart('initial start')

  // ── 2. 启动 FileWatcher（fs.watch，零外部依赖）─────────────
  const watcher = new VextFileWatcher({
    root: project.rootDir,
    debounce: 100,
    usePolling: shouldUsePolling(),  // Docker 自动检测
  })

  watcher.on('change', async (event: FileChangeEvent) => {
    if (event.action === 'cold') {
      // Tier 3: 配置/插件/.env 变更 → 冷重启
      console.log('[vextjs] config change → cold restart...')
      await restarter.restart(event.files.map(f => f.path).join(', '))
    } else {
      // Tier 1/2: 业务代码变更 → IPC 通知子进程 Soft Reload
      restarter.sendToChild({ type: 'reload', files: event.files })
    }
  })

  await watcher.start()

  // ── 3. 优雅退出 ──────────────────────────────────────────
  const cleanup = async () => {
    watcher.stop()
    await restarter.kill()
    process.exit(0)
  }
  process.on('SIGINT', cleanup)
  process.on('SIGTERM', cleanup)

  // ── 4. 键盘交互（TTY 模式）──────────────────────────────
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', (key) => {
      const char = key.toString()
      if (char === 'r') { restarter.restart('manual') }
      if (char === 'c') { console.clear() }
      if (char === '\x03') { cleanup() }  // Ctrl+C
    })
  }
}
```

> **关键差异**（相比旧方案）：
> - ❌ 不再使用 chokidar（改为 Node.js 内置 `fs.watch`，零依赖）
> - ❌ 不再每次文件变更都重启进程（改为 IPC Soft Reload）
> - ❌ 子进程不再使用 tsx loader（改为 esbuild 预编译 CJS）
> - ✅ Server socket、DB 连接池、Plugin 实例在 Soft Reload 后保持不变
> - ✅ 仅配置/插件/.env 变更才冷重启

### 2.4 配置项

通过 `config/default.ts` 的 `dev` 块控制（详见 `05-config.md` §3.12）：

```typescript
export default {
  dev: {
    hot:          true,   // true = 启用 Soft Reload（Tier 1/2）；false = 所有变更走冷重启
    poll:         false,  // true = 使用 polling 模式（Docker bind mount 兼容）
    pollInterval: 1000,   // Polling 间隔（毫秒），仅 poll: true 时生效
    debounce:     100,    // 防抖间隔（毫秒），窗口内多个变更合并为一次 reload
  },
}
```

---

## 3. `vext start` — 生产模式

### 3.1 职责

1. 发现项目根目录和入口文件
2. 检测项目语言（TS / JS）
3. 直接运行应用（无文件监听）

### 3.2 实现

```typescript
// vextjs/cli/start.ts
import { fork } from 'node:child_process'
import { detectProject } from './utils/detect-project.js'

export async function run() {
  const project = detectProject(process.cwd())

  // ⚠️ vext build 产物检测：当 dist/ 目录存在时，使用 node 直接运行编译后的 JS，
  //    无需 tsx。设置 VEXT_BUILT=1 环境变量，bootstrap 据此切换 srcDir。
  //    详见 09a-build.md §5.2
  const distDir = path.join(project.rootDir, 'dist')
  const hasBuilt = existsSync(distDir)
  const entryFile = hasBuilt
    ? path.join(distDir, project.entryFile.replace(/^src\//, '').replace(/\.ts$/, '.js'))
    : project.entryFile

  console.log(
    hasBuilt
      ? `[vextjs] start mode — built (node, from dist/)`
      : `[vextjs] start mode — ${project.language === 'ts' ? 'TypeScript (tsx)' : 'JavaScript (node)'}`,
  )

  const child = fork(entryFile, [], {
    cwd:      project.rootDir,
    execArgv: hasBuilt
      ? []   // dist/ 已编译为 JS，无需 tsx
      : project.language === 'ts'
        ? ['--import', 'tsx/esm']
        : [],
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || 'production',
      VEXT_MODE: 'start',
      ...(hasBuilt && { VEXT_BUILT: '1' }),
    },
  })

  child.on('exit', (code) => {
    process.exit(code ?? 0)
  })

  // 转发信号给子进程（触发 app 的优雅关闭）
  process.once('SIGTERM', () => child.kill('SIGTERM'))
  process.once('SIGINT',  () => child.kill('SIGINT'))
}
```

### 3.3 Cluster 分支

`vext start` 启动子进程后，`bootstrap.ts` 内部检查 cluster 配置决定运行模式：

```typescript
// bootstrap.ts 末尾（简化）
import cluster from 'node:cluster'

const config = await loadConfig(...)

const clusterEnabled =
  process.env.VEXT_CLUSTER === '1' ||
  (process.env.VEXT_CLUSTER !== '0' && config.cluster?.enabled === true)

if (clusterEnabled && cluster.isPrimary) {
  // Master 进程 — 不执行 createApp，只管理 Worker
  const { ClusterMaster } = await import('./cluster/master.js')
  const master = new ClusterMaster(config.cluster)
  await master.start()
} else {
  // 单进程模式 或 cluster Worker 进程 — 执行完整 bootstrap
  const { app, internals } = createApp(config)
  // ... 正常启动流程 ①-⑨
}
```

详见 `12-cluster.md`。

### 3.4 生产部署建议

```bash
# 单进程
NODE_ENV=production vext start

# Cluster 模式
VEXT_CLUSTER=1 vext start

# Docker
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .
CMD ["npx", "vext", "start"]
```

> `vext start` 不启动文件监听，生产环境无额外开销。

---

## 4. 项目检测工具

### 4.1 `detectProject()` — 自动发现项目结构

```typescript
// vextjs/cli/utils/detect-project.ts
import fs from 'node:fs'
import path from 'node:path'

export interface ProjectInfo {
  rootDir:   string        // 项目根目录（package.json 所在位置）
  srcDir:    string        // 源码目录（rootDir/src）
  language:  'ts' | 'js'   // 项目语言
  entryFile: string        // 框架启动入口（vextjs 内部 bootstrap 文件）
}

export function detectProject(cwd: string): ProjectInfo {
  const rootDir = findProjectRoot(cwd)

  // ── 检测 src/ 目录 ──────────────────────────────────
  const srcDir = path.join(rootDir, 'src')
  if (!fs.existsSync(srcDir)) {
    throw new Error(
      `[vextjs] src/ directory not found in ${rootDir}\n` +
      `         vextjs requires a src/ directory with routes/, services/, etc.`
    )
  }

  // ── 检测语言 ────────────────────────────────────────
  const hasTsconfig = fs.existsSync(path.join(rootDir, 'tsconfig.json'))
  const language: 'ts' | 'js' = hasTsconfig ? 'ts' : 'js'

  // ── 检测 config/ 目录 ───────────────────────────────
  const configDir = path.join(srcDir, 'config')
  if (!fs.existsSync(configDir)) {
    throw new Error(
      `[vextjs] src/config/ directory not found.\n` +
      `         Create src/config/default.${language === 'ts' ? 'ts' : 'js'} with your configuration.`
    )
  }

  // ── 检测 config/default 文件 ────────────────────────
  const configExts = language === 'ts'
    ? ['default.ts']
    : ['default.js', 'default.mjs', 'default.cjs']
  const hasDefaultConfig = configExts.some(ext =>
    fs.existsSync(path.join(configDir, ext))
  )
  if (!hasDefaultConfig) {
    throw new Error(
      `[vextjs] src/config/default.${language === 'ts' ? 'ts' : 'js'} not found.\n` +
      `         This file is required and must contain your base configuration.`
    )
  }

  // ── 启动入口 ────────────────────────────────────────
  // 入口文件是 vextjs 框架内部的 bootstrap 文件，
  // 负责 config-loader → createApp → 启动流程
  const entryFile = path.join(
    rootDir, 'node_modules', 'vextjs', 'dist', 'lib', 'bootstrap.js'
  )

  return { rootDir, srcDir, language, entryFile }
}

/**
 * 从 cwd 向上查找 package.json 所在目录
 */
function findProjectRoot(cwd: string): string {
  let dir = cwd
  while (true) {
    if (fs.existsSync(path.join(dir, 'package.json'))) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir) {
      throw new Error(
        `[vextjs] Cannot find package.json.\n` +
        `         Run "vext" from your project root directory.`
      )
    }
    dir = parent
  }
}
```

### 4.2 检测结果示例

```
项目结构:
  my-app/
  ├── src/
  │   ├── config/default.ts   ← ✅ 找到
  │   ├── routes/
  │   └── services/
  ├── tsconfig.json            ← ✅ 找到 → language: 'ts'
  └── package.json             ← ✅ 找到 → rootDir

检测结果:
  rootDir:   /home/user/my-app
  srcDir:    /home/user/my-app/src
  language:  ts
  entryFile: /home/user/my-app/node_modules/vextjs/dist/lib/bootstrap.js
```

---

## 5. 框架启动入口（bootstrap）

### 5.1 bootstrap.ts — 框架内部启动文件

CLI 的 `vext dev` / `vext start` 最终 fork 的入口文件是框架内部的 `bootstrap.ts`。

**返回签名**（cluster Worker 使用）：

```typescript
interface BootstrapResult {
  app:          VextApp
  internals:    AppInternals     // 见 06-built-ins.md §4
  serverHandle: VextServerHandle // 见 08-adapter.md §1
}
```

**完整实现**：

```typescript
// vextjs/lib/bootstrap.ts（框架内部，用户不感知）
import path from 'node:path'
import { existsSync }           from 'node:fs'
import { loadConfig }           from './config-loader.js'
import { createApp }            from './app.js'
import { loadPlugins }          from './plugin-loader.js'
import { loadMiddlewares }      from './middleware-loader.js'
import { loadServices }         from './service-loader.js'
import { loadRoutes }           from './router-loader.js'
import { responseWrapperMiddleware } from './middlewares/response-wrapper.js'
import { createErrorHandler }   from './middlewares/error-handler.js'
import { notFoundHandler }      from './middlewares/not-found.js'
import { dsl }                  from 'schema-dsl'

async function bootstrap() {
  const rootDir = process.cwd()
  const srcDir  = path.join(rootDir, 'src')

  // 资源引用（用于错误清理）
  let internals: AppInternals | null = null
  let serverHandle: VextServerHandle | null = null

  try {
    // ── config-loader（步骤 0）──────────────────────────
    const config = await loadConfig(path.join(srcDir, 'config'))

    // ── createApp（步骤 ①）────────────────────────────��
    const result = createApp(config)
    const app = result.app
    internals = result.internals
    app.logger.info('[vextjs] initializing...')

    // ── ①+ i18n 语言包自动加载（目录方式，零配置）──────
    const localesDir = path.join(srcDir, 'locales')
    if (existsSync(localesDir)) {
      dsl.config({ i18n: localesDir })
      app.logger.info(`[vextjs] i18n locales loaded from ${localesDir}`)
    }

    // ── plugin-loader（步骤 ②）── app.use() 可用 ───────
    await loadPlugins(app, path.join(srcDir, 'plugins'))

    // ── middleware-loader（步骤 ③）──────────────────────
    const middlewareDefs = await loadMiddlewares(
      path.join(srcDir, 'middlewares'),
      config.middlewares ?? [],
      app.logger,
    )

    // ── service-loader（步骤 ④）────────────────────────
    await loadServices(app, path.join(srcDir, 'services'))

    // ── router-loader（步骤 ⑤）─────────────────────────
    await loadRoutes(app, path.join(srcDir, 'routes'), {
      middlewareDefs,
      globalMiddlewares: internals.getGlobalMiddlewares(),
    })

    // ── ⑤+ 锁定 app.use() ─────────────────────────────
    internals.lockUse()

    // ── 注册出口中间件 + 错误处理 + 404（步骤 ⑥）──────
    app.adapter.registerMiddleware(responseWrapperMiddleware)
    app.adapter.registerErrorHandler(createErrorHandler(config))
    app.adapter.registerNotFound(notFoundHandler)

    // ── HTTP 监听（步骤 ⑦）─────────────────────────────
    serverHandle = await app.adapter.listen(config.port, config.host ?? '0.0.0.0')

    // ── 注册信号处理（传入 VextServerHandle）───────────
    const handleSignal = () => internals!.shutdown(serverHandle!)
    process.on('SIGTERM', handleSignal)
    process.on('SIGINT',  handleSignal)

    // ── onReady（步骤 ⑧⑨）─────────────────────────────
    await internals.runReady()

    app.logger.info(`[vextjs] ready on http://${serverHandle.host}:${serverHandle.port}`)
  } catch (err) {
    // ── 错误边界：清理已分配的资源 ─────────────────────
    // 如果端口已绑定，先关闭 server
    if (serverHandle) {
      try { await serverHandle.close() } catch {}
    }
    // 执行 onClose hooks（清理 DB 连接、缓存等插件资源）
    if (internals) {
      try { await internals.shutdown() } catch {}
    }
    throw err  // 重新抛出，让外层 .catch() 处理
  }
}
}

bootstrap().catch((err) => {
  console.error('[vextjs] startup failed:')
  console.error(err)
  process.exit(1)
})
```

### 5.2 与启动流程的对应关系

```
vext dev / start
  ↓
CLI fork(bootstrap.ts)
  ↓
config-loader 加载配置（default → env → local 深度合并 + deepFreeze）
  ↓
const { app, internals } = createApp(finalConfig)
  ↓
① 内置模块初始化（logger、throw、setValidator、requestId…）
② plugin-loader    扫描 plugins/ 自动加载（可覆盖内置，app.use() 可用）
③ middleware-loader 按 config.middlewares 白名单加载中间件定义
④ service-loader   扫描 services/ 实例化，注入到 app.services
⑤ router-loader    扫描 routes/ 注册路由
⑤+ internals.lockUse() — 锁定 app.use()
⑥ 注册出口包装中间件、全局错误处理、404 兜底
⑦ HTTP 开始监听，注册信号处理（process.on SIGTERM/SIGINT → internals.shutdown(server)）
⑧ internals.runReady() — 执行所有 onReady 钩子
⑨ /ready → 200，打印启动日志
```

---

## 6. 环境变量

CLI 自动设置以下环境变量供框架内部使用：

| 变量 | `vext dev` | `vext start` | 说明 |
|------|-----------|-------------|------|
| `NODE_ENV` | `development`（可覆盖） | `production`（可覆盖） | 决定 config-loader 加载哪个环境文件 |
| `VEXT_MODE` | `'dev'` | `'start'` | 框架内部区分 CLI 模式，用户一般不需要读取 |

用户可在 CLI 前手动设置 `NODE_ENV` 覆盖默认值：

```bash
# 开发模式但使用生产配置（调试用）
NODE_ENV=production vext dev

# 生产模式默认设置
vext start   # NODE_ENV=production
```

---

## 7. 错误处理与用户提示

### 7.1 Fail Fast 错误表

CLI 在启动前执行一系列检测，任何失败都立即终止并给出明确提示：

| 检测项 | 时机 | 错误消息 |
|-------|------|---------|
| `package.json` 不存在 | `detectProject` | `[vextjs] Cannot find package.json. Run "vext" from your project root directory.` |
| `src/` 目录不存在 | `detectProject` | `[vextjs] src/ directory not found in <rootDir>` |
| `src/config/` 目录不存在 | `detectProject` | `[vextjs] src/config/ directory not found.` |
| `config/default.ts` 不存在 | `detectProject` | `[vextjs] src/config/default.ts not found.` |
| 未知命令 | `cli/index.ts` | `[vextjs] Unknown command: "xxx". Available commands: dev, start` |
| 启动流程抛出异常 | `bootstrap` | `[vextjs] startup failed:` + 完整 stack |

### 7.2 子进程崩溃处理

| 场景 | `vext dev` 行为 | `vext start` 行为 |
|------|----------------|------------------|
| 子进程 exit code ≠ 0 | 打印错误，**不退出 CLI**，等待文件变更后重启 | 以相同 exit code 退出 |
| 子进程被 SIGTERM | 重启时正常杀死，忽略 | 转发信号，优雅关闭 |
| 子进程未响应 SIGTERM | 5 秒后发送 SIGKILL | 由 PM2 / Docker 处理 |

---

## 8. 与 config-loader 的关系

CLI 本身**不读取配置**，它只负责：

1. 检测项目结构（`detectProject`）
2. 设置环境变量（`NODE_ENV` / `VEXT_MODE`）
3. fork 子进程运行 `bootstrap.ts`

配置的加载、合并、验证全部在 `bootstrap.ts` 内通过 `config-loader` 完成（详见 `05-config.md`）：

```
CLI (vext dev)
  │
  ├── detectProject()    → 确认 src/ 和 config/ 存在
  ├── 设置 NODE_ENV
  ├── fork(bootstrap.ts)
  │     ↓
  │   config-loader
  │     ├── 加载 config/default.ts
  │     ├── 按 NODE_ENV 加载 config/development.ts 或 config/production.ts
  │     ├── 尝试加载 config/local.ts（不存在则静默跳过）
  │     └── 深度合并 → finalConfig
  │     ↓
  │   createApp(finalConfig) → 启动流程 ①-⑨
  │
  └── fs.watch 监听 src/（仅 dev 模式，详见 11-hot-reload.md）
```

---

## 9. 框架内部目录结构

```
vextjs/src/cli/
├── index.ts                  # bin 入口：命令解析（dev / build / start / stop / reload / status / create）
├── dev.ts                    # vext dev：ColdRestarter + FileWatcher（详见 11-hot-reload.md）
├── build.ts                  # vext build：esbuild 全量编译 TS→JS 到 dist/（详见 09a-build.md）
├── start.ts                  # vext start：子进程管理（含 dist/ 检测 + cluster 分支）
├── stop.ts                   # vext stop：读取 PID → SIGTERM
├── reload.ts                 # vext reload：读取 PID → SIGHUP（零停机重启）
├── status.ts                 # vext status：读取 PID + /health 探测
├── create.ts                 # vext create：项目脚手架（P0-3）
└── utils/
    └── detect-project.ts     # 项目检测（rootDir / srcDir / language / entryFile）
```

---

## 10. Cluster 管理命令

### 10.1 `vext stop`

读取 PID 文件，向 Master 发送 SIGTERM 触发优雅关闭：

```typescript
// cli/stop.ts
export async function run() {
  const pidFile = new PidFile('.vext.pid', process.cwd())
  const pid = pidFile.read()
  if (!pid) { console.error('[vextjs] no running instance (PID file not found)'); process.exit(1) }

  try { process.kill(pid, 0) } catch {
    console.error(`[vextjs] master process ${pid} not running`)
    pidFile.remove()
    process.exit(1)
  }

  process.kill(pid, 'SIGTERM')
  console.log(`[vextjs] SIGTERM sent to master (pid: ${pid})`)
}
```

### 10.2 `vext reload`

读取 PID 文件，向 Master 发送 SIGHUP 触发零停机重启（详见 `12c-lifecycle.md`）：

```typescript
// cli/reload.ts
export async function run() {
  const pidFile = new PidFile('.vext.pid', process.cwd())
  const pid = pidFile.read()
  if (!pid) { console.error('[vextjs] no running instance'); process.exit(1) }

  try { process.kill(pid, 0) } catch {
    console.error(`[vextjs] master ${pid} not running`); pidFile.remove(); process.exit(1)
  }

  process.kill(pid, 'SIGHUP')
  console.log(`[vextjs] reload signal sent to master (pid: ${pid})`)
}
```

### 10.3 `vext status`

```typescript
// cli/status.ts
export async function run() {
  const pidFile = new PidFile('.vext.pid', process.cwd())
  const pid = pidFile.read()

  if (!pid)                                    { console.log('Status: ⚪ not running'); return }
  try { process.kill(pid, 0) } catch {
    console.log('Status: 🔴 stale (PID file exists but process dead)'); return
  }

  console.log(`Status: 🟢 running (master pid: ${pid})`)

  // 探测 /health 获取 Worker 信息
  try {
    const resp = await fetch('http://localhost:3000/health')
    const data = await resp.json()
    console.log(`  Worker PID: ${data.pid}`)
    console.log(`  Uptime: ${Math.round(data.uptime)}s`)
    console.log(`  Memory: ${Math.round(data.memory?.heapUsed / 1024 / 1024)}MB`)
  } catch { console.log('  (health endpoint unreachable)') }
}
```

> `vext stop` / `vext reload` 仅在 cluster 模式下有意义（PID 文件由 Master 创建）。单进程模式下直接用 Ctrl+C 或 `kill <pid>`。

---

## 11. `vext create` — 项目脚手架（P0-3）

### 11.1 设计目标

兑现"零样板"承诺：一条命令创建可运行的 vext 项目，开箱即用。

```bash
# 创建 TypeScript 项目（默认）
vext create my-app

# 创建 JavaScript 项目
vext create my-app --js

# 指定模板（后续支持）
vext create my-app --template api    # REST API 模板（默认）
# vext create my-app --template ws   # WebSocket 模板（后续）
```

### 11.2 交互流程

```
vext create <project-name> [--js] [--template <name>]
  ↓
检查目标目录是否存在（存在则询问是否覆盖）
  ↓
生成项目文件
  ↓
npm install（可选，--skip-install 跳过）
  ↓
打印成功提示 + 下一步操作指引
```

### 11.3 生成的项目结构

```
<project-name>/
├── src/
│   ├── routes/
│   │   └── index.ts          # 示例路由：GET / → { message: 'Hello, Vext!' }
│   ├── services/
│   │   └── example.ts        # 示例 service
│   ├── middlewares/           # 空目录（附 README 说明）
│   ├── plugins/               # 空目录（附 README 说明）
│   ├── config/
│   │   ├── default.ts        # 基础配置（port: 3000, adapter: 'hono'）
│   │   ├── development.ts    # 开发环境覆盖（logger pretty: true）
│   │   └── production.ts     # 生产环境覆盖（logger pretty: false）
│   └── types/
│       └── services.d.ts     # VextServices 类型声明（含 example service）
├── .gitignore                # node_modules/ + .vext/ + config/local.ts
├── tsconfig.json             # TS 项目必须（targets: ESNext, module: ESNext）
├── package.json              # scripts: { dev, start }，dependencies: { vextjs }
└── README.md                 # 项目说明 + 常用命令
```

> JS 项目（`--js`）：省略 `tsconfig.json` 和 `types/`，所有 `.ts` 文件替换为 `.js`。

### 11.4 模板文件内容

#### package.json

```json
{
  "name": "<project-name>",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vext dev",
    "start": "vext start"
  },
  "dependencies": {
    "vextjs": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0"
  }
}
```

#### src/routes/index.ts

```typescript
import { defineRoutes } from 'vextjs'

export default defineRoutes((app) => {
  app.get('/', {}, async (req, res) => {
    res.json({ message: 'Hello, Vext!', timestamp: Date.now() })
  })

  app.get('/health', {}, async (req, res) => {
    res.json({ status: 'ok' })
  })
})
```

#### src/services/example.ts

```typescript
export default class ExampleService {
  constructor(private app: VextApp) {}

  async greeting(name: string) {
    this.app.logger.info('Generating greeting', { name })
    return { message: `Hello, ${name}!` }
  }
}
```

#### src/config/default.ts

```typescript
export default {
  port: 3000,
  adapter: 'hono',
  middlewares: [],
}
```

### 11.5 实现

```typescript
// vextjs/src/cli/create.ts
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

interface CreateOptions {
  name: string
  language: 'ts' | 'js'
  template: 'api'
  skipInstall: boolean
}

export async function runCreate(options: CreateOptions) {
  const targetDir = path.resolve(process.cwd(), options.name)

  // 1. 检查目录
  if (fs.existsSync(targetDir)) {
    // 交互式询问是否覆盖（使用 readline）
    throw new Error(`Directory "${options.name}" already exists`)
  }

  // 2. 创建目录结构
  const dirs = [
    'src/routes',
    'src/services',
    'src/middlewares',
    'src/plugins',
    'src/config',
    ...(options.language === 'ts' ? ['src/types'] : []),
  ]
  for (const dir of dirs) {
    fs.mkdirSync(path.join(targetDir, dir), { recursive: true })
  }

  // 3. 写入模板文件（内置模板，不依赖网络）
  const templates = getTemplates(options)
  for (const [filePath, content] of Object.entries(templates)) {
    const full = path.join(targetDir, filePath)
    fs.writeFileSync(full, content, 'utf-8')
  }

  // 4. npm install
  if (!options.skipInstall) {
    console.log('\n📦 Installing dependencies...\n')
    execSync('npm install', { cwd: targetDir, stdio: 'inherit' })
  }

  // 5. 成功提示
  console.log(`
✅ Project "${options.name}" created successfully!

  cd ${options.name}
  npm run dev

📖 Documentation: https://vextjs.dev
  `)
}
```

### 11.6 CLI 命令注册

```typescript
// cli/index.ts 中新增
case 'create': {
  const name = positionals[1]
  if (!name) {
    console.error('Usage: vext create <project-name> [--js] [--skip-install]')
    process.exit(1)
  }
  const { runCreate } = await import('./create')
  await runCreate({
    name,
    language: values.js ? 'js' : 'ts',
    template: (values.template as string) ?? 'api',
    skipInstall: !!values['skip-install'],
  })
  break
}
```

### 11.7 预计工期

| 子任务 | 预计 |
|--------|:----:|
| 模板文件设计与编写 | 1 天 |
| CLI create 命令实现 | 1 天 |
| 目录检测 + 交互式确认 | 0.5 天 |
| 测试（TS/JS 两种模式） | 0.5 天 |
| 文档 | 0.5 天 |
| **合计** | **3-4 天** |

---

## 12. 后续扩展规划

| 命令 | 说明 | 优先级 |
|------|------|--------|
| `vext build` | esbuild 编译 TS→JS 到 `dist/`，移除生产对 tsx 依赖 | ✅ 已设计（[`09a-build.md`](./09a-build.md)） |
| `vext generate` | 脚手架：生成 route / service / plugin 模板文件 | ⏳ 后续版本 |
| `vext generate:types` | 自动生成 `types/services.d.ts`（P1-1） | ⏳ Phase 1 |
| `vext typecheck` | 运行 `tsc --noEmit`，检查项目类型 | ⏳ 后续版本 |
| `vext routes` | 打印所有已注册路由表（调试用） | ⏳ 后续版本 |

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|-------|---------|------|
| `ProjectInfo` | `cli/utils/detect-project.ts` | 项目检测结果（rootDir / srcDir / language） |
| `CreateOptions` | `cli/create.ts` | `vext create` 命令选项 |