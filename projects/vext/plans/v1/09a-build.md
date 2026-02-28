# 09a - `vext build` 命令详细设计

> **项目**: vext (vextjs)
> **日期**: 2026-02-28
> **状态**: 📝 设计稿
> **优先级**: P0（移除生产模式对 tsx 的依赖）
> **依赖**: CLI（`09-cli.md` ✅）、DevCompiler（`11a-dev-compiler.md` ✅）、Adapter（`08-adapter.md` ✅）、配置层（`05-config.md` ✅）
> **预计工期**: 2-3 天

---

## 0. 概述

`vext build` 将用户项目的 TypeScript 源码通过 esbuild 编译为 JavaScript，输出到 `dist/` 目录。编译完成后，`vext start` 检测到 `dist/` 存在时直接用 `node` 运行，**不再依赖 tsx 运行时**。

### 为什么需要 `vext build`

| 维度 | 现状（tsx 运行时） | 目标（esbuild 预编译） ✅ |
|------|------------------|--------------------------|
| **生产依赖** | tsx 是生产 `dependencies`（~12MB） | esbuild 仅在构建阶段使用（`devDependencies`） |
| **启动速度** | tsx 每次 require 都做内存转译 | 纯 JS，Node.js 原生加载，零开销 |
| **运行时干净度** | 进程内有 loader hook 拦截 | 无任何 hook，Node.js 原生执行 |
| **Docker 镜像** | 需包含 tsx + esbuild（tsx 底层） | 仅 `node_modules` 中的运行时依赖 |
| **与 dev 模式一致性** | dev 用 esbuild 编译 CJS，start 用 tsx | 统一 esbuild 编译管线 |
| **调试** | 内存中转译产物不可直接查看 | `dist/` 目录可直接检查编译产物 |
| **Source Map** | tsx 生成临时 source map | 编译产物自带 `.js.map` 文件 |

### 核心原则

```yaml
原则 1: 复用 DevCompiler 的 esbuild 管线（统一编译策略，减少维护成本）
原则 2: 产物目录为 dist/（Node.js 项目标准约定）
原则 3: 编译完成后 vext start 自动检测 dist/ 并使用 node 运行
原则 4: vext build 是可选步骤（不 build 也能 start，降级为 tsx 运行）
原则 5: 编译产物自包含（含 source map，可独立部署到无 TS 环境）
```

---

## 1. 命令接口

### 1.1 用法

```bash
# 基本编译
vext build

# 清理旧产物后编译
vext build --clean

# 指定输出目录（默认 dist/）
vext build --outdir build

# 不生成 source map
vext build --no-sourcemap

# 生产优化（minify + tree shaking）
vext build --minify
```

### 1.2 命令行参数

```typescript
interface BuildOptions {
  /** 输出目录（相对于项目根目录，默认 'dist'） */
  outdir?: string

  /** 编译前清理输出目录（默认 false） */
  clean?: boolean

  /** 生成 source map（默认 true） */
  sourcemap?: boolean

  /** 代码压缩（默认 false，生产可选开启） */
  minify?: boolean

  /** TypeScript 类型检查（默认 false，构建速度优先） */
  typecheck?: boolean
}
```

### 1.3 CLI 注册

```typescript
// vextjs/cli/index.ts（在已有 switch 中追加）
case 'build':
  await import('./build.js').then(m => m.run())
  break
```

### 1.4 package.json scripts

编译完成后，用户项目的 scripts 推荐写法：

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

## 2. 编译策略

### 2.1 与 DevCompiler 的关系

```
DevCompiler（vext dev）              BuildCompiler（vext build）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
输入:  src/                          输入:  src/
输出:  .vext/dev/ (临时，gitignore)   输出:  dist/ (持久，可部署)
格式:  CJS（方便 cache 清除）          格式:  CJS（Node.js 稳定运行）
增量:  ctx.rebuild() + 单文件编译     增量:  无（每次全量编译）
目标:  快速迭代（~23ms 热替换）       目标:  生产部署（一次性编译）
map:   inline source map              map:   外部 .js.map 文件
```

两者共享的 esbuild 配置：

```typescript
// vextjs/lib/build/shared-esbuild-config.ts
import type { BuildOptions } from 'esbuild'

export function createBaseEsbuildConfig(srcDir: string): Partial<BuildOptions> {
  return {
    platform:    'node',
    target:      'node22',       // 与 package.json engines 对齐
    format:      'cjs',          // CJS 保证 require.cache 可控
    bundle:      false,          // 不打包（保留 node_modules 外部依赖）
    treeShaking: true,
    keepNames:   true,           // 保留函数名（错误堆栈可读性）
    charset:     'utf8',

    // TypeScript 配置
    tsconfig:    'tsconfig.json',
    loader: {
      '.ts':  'ts',
      '.mts': 'ts',
      '.cts': 'ts',
      '.js':  'js',
      '.mjs': 'js',
      '.cjs': 'js',
      '.json': 'json',
    },
  }
}
```

### 2.2 BuildCompiler 实现

```typescript
// vextjs/lib/build/build-compiler.ts
import * as esbuild from 'esbuild'
import path from 'node:path'
import { glob } from 'fast-glob'
import { createBaseEsbuildConfig } from './shared-esbuild-config.js'

export interface BuildCompilerOptions {
  /** 项目根目录 */
  rootDir: string
  /** 源码目录（通常 src/） */
  srcDir: string
  /** 输出目录（默认 dist/） */
  outDir: string
  /** 是否生成 source map（默认 true） */
  sourcemap?: boolean
  /** 是否压缩（默认 false） */
  minify?: boolean
}

export class BuildCompiler {
  private options: Required<BuildCompilerOptions>

  constructor(options: BuildCompilerOptions) {
    this.options = {
      sourcemap: true,
      minify: false,
      ...options,
    }
  }

  /**
   * 执行全量编译
   * @returns 编译结果统计
   */
  async build(): Promise<BuildResult> {
    const { rootDir, srcDir, outDir, sourcemap, minify } = this.options
    const startTime = Date.now()

    // ── 1. 扫描源文件 ──────────────────────────────────
    const entryPoints = await this.scanEntryPoints()

    if (entryPoints.length === 0) {
      throw new Error(
        `[vextjs] No source files found in ${srcDir}.\n` +
        `         Expected .ts or .js files in src/ directory.`
      )
    }

    // ── 2. 构建 esbuild 配置 ────────────────────────────
    const baseConfig = createBaseEsbuildConfig(srcDir)

    const result = await esbuild.build({
      ...baseConfig,
      entryPoints: entryPoints.map(f => path.join(srcDir, f)),
      outdir:      outDir,
      outbase:     srcDir,          // 保持目录结构：src/routes/users.ts → dist/routes/users.js
      sourcemap:   sourcemap ? 'external' : false,
      minify,
      metafile:    true,            // 输出编译元信息（文件大小等）
      logLevel:    'warning',

      // 生产模式特有配置
      define: {
        'process.env.NODE_ENV': '"production"',
      },

      // 排除 node_modules（保留外部依赖）
      external: ['./node_modules/*'],
      packages: 'external',
    })

    const elapsed = Date.now() - startTime
    const outputFiles = Object.keys(result.metafile?.outputs ?? {})
    const jsFiles = outputFiles.filter(f => f.endsWith('.js'))

    return {
      success:     result.errors.length === 0,
      fileCount:   jsFiles.length,
      totalFiles:  entryPoints.length,
      elapsed,
      outDir,
      warnings:    result.warnings,
      errors:      result.errors,
      metafile:    result.metafile,
    }
  }

  /**
   * 扫描 src/ 下所有源文件
   */
  private async scanEntryPoints(): Promise<string[]> {
    return glob('**/*.{ts,js,mts,mjs,cts,cjs}', {
      cwd: this.options.srcDir,
      ignore: [
        '**/*.d.ts',
        '**/*.test.{ts,js}',
        '**/*.spec.{ts,js}',
        '**/test/**',
        '**/tests/**',
        '**/__tests__/**',
      ],
    })
  }
}

export interface BuildResult {
  success:    boolean
  fileCount:  number
  totalFiles: number
  elapsed:    number
  outDir:     string
  warnings:   esbuild.Message[]
  errors:     esbuild.Message[]
  metafile?:  esbuild.Metafile
}
```

---

## 3. CLI 入口实现

```typescript
// vextjs/cli/build.ts
import path from 'node:path'
import { parseArgs } from 'node:util'
import { rmSync, existsSync } from 'node:fs'
import { detectProject } from './utils/detect-project.js'
import { BuildCompiler } from '../lib/build/build-compiler.js'

export async function run() {
  // ── 解析参数 ──────────────────────────────────────────
  const { values } = parseArgs({
    options: {
      outdir:    { type: 'string',  default: 'dist' },
      clean:     { type: 'boolean', default: false },
      sourcemap: { type: 'boolean', default: true },
      minify:    { type: 'boolean', default: false },
      typecheck: { type: 'boolean', default: false },
    },
    strict: false,
  })

  const project = detectProject(process.cwd())

  if (project.language !== 'ts') {
    console.log('[vextjs] JavaScript project detected — no build step needed.')
    console.log('[vextjs] Use "vext start" directly.')
    return
  }

  const outDir = path.resolve(project.rootDir, values.outdir as string)

  console.log(`[vextjs] build — TypeScript → JavaScript`)
  console.log(`[vextjs] src:  ${project.srcDir}`)
  console.log(`[vextjs] out:  ${outDir}`)

  // ── 清理旧产物（--clean） ─────────────────────────────
  if (values.clean && existsSync(outDir)) {
    rmSync(outDir, { recursive: true })
    console.log(`[vextjs] cleaned: ${outDir}`)
  }

  // ── 类型检查（--typecheck，可选） ─────────────────────
  if (values.typecheck) {
    console.log('[vextjs] running type check...')
    const { execSync } = await import('node:child_process')
    try {
      execSync('npx tsc --noEmit', {
        cwd: project.rootDir,
        stdio: 'inherit',
      })
      console.log('[vextjs] type check passed ✓')
    } catch {
      console.error('[vextjs] type check failed — build aborted')
      process.exit(1)
    }
  }

  // ── 编译 ──────────────────────────────────────────────
  const compiler = new BuildCompiler({
    rootDir:   project.rootDir,
    srcDir:    project.srcDir,
    outDir,
    sourcemap: values.sourcemap as boolean,
    minify:    values.minify as boolean,
  })

  try {
    const result = await compiler.build()

    if (!result.success) {
      console.error(`[vextjs] build failed with ${result.errors.length} error(s)`)
      for (const err of result.errors) {
        console.error(`  ${err.location?.file}:${err.location?.line} — ${err.text}`)
      }
      process.exit(1)
    }

    // ── 输出编译报告 ────────────────────────────────────
    if (result.warnings.length > 0) {
      console.log(`[vextjs] ⚠️  ${result.warnings.length} warning(s):`)
      for (const w of result.warnings) {
        console.log(`  ${w.location?.file}:${w.location?.line} — ${w.text}`)
      }
    }

    console.log('')
    console.log(`[vextjs] ✅ build complete`)
    console.log(`[vextjs]    files:   ${result.fileCount}`)
    console.log(`[vextjs]    time:    ${result.elapsed}ms`)
    console.log(`[vextjs]    output:  ${result.outDir}/`)
    console.log('')
    console.log(`[vextjs] To start in production:`)
    console.log(`[vextjs]   NODE_ENV=production vext start`)

  } catch (err) {
    console.error('[vextjs] build failed:')
    console.error(err)
    process.exit(1)
  }
}
```

---

## 4. 编译产物目录结构

### 4.1 源码 → 产物映射

```
src/                              dist/
├── routes/                       ├── routes/
│   ├── index.ts                  │   ├── index.js
│   ├── users.ts          →      │   ├── users.js
│   └── users/                    │   └── users/
│       └── [id].ts               │       └── [id].js
├── services/                     ├── services/
│   └── user.ts                   │   └── user.js
├── middlewares/                  ├── middlewares/
│   └── auth.ts                   │   └── auth.js
├── plugins/                      ├── plugins/
│   └── database.ts               │   └── database.js
├── config/                       ├── config/
│   ├── default.ts                │   ├── default.js
│   ├── production.ts             │   └── production.js
│   └── development.ts            │   （development.ts 不编译到 dist — 见 §4.2）
├── locales/                      ├── locales/
│   ├── zh-CN.ts                  │   ├── zh-CN.js
│   └── en-US.ts                  │   └── en-US.js
├── utils/                        ├── utils/
│   └── hash.ts                   │   └── hash.js
└── types/                        └── （types/ 不输出 — 纯类型声明）
    └── app.d.ts
```

### 4.2 排除规则

| 排除项 | 原因 |
|--------|------|
| `**/*.d.ts` | 纯类型声明文件，运行时无用 |
| `**/*.test.{ts,js}` | 测试文件，不部署 |
| `**/*.spec.{ts,js}` | 测试文件，不部署 |
| `**/test/**`、`**/tests/**`、`**/__tests__/**` | 测试目录 |
| `src/types/` | 纯类型声明目录，esbuild 自动跳过（无 JS 输出） |
| `config/development.ts` | 开发配置，生产不需要（⚠️ 待讨论 — 见 §4.3） |
| `config/local.ts` | 本地覆盖，永远不部署 |

### 4.3 配置文件编译策略

配置文件需要特殊处理：

```yaml
config/default.ts:       ✅ 编译（基准配置，生产必须）
config/production.ts:    ✅ 编译（生产覆盖配置）
config/development.ts:   ❌ 不编译（开发环境专用，生产无意义）
config/local.ts:         ❌ 不编译（永远不提交和部署）
config/test.ts:          ❌ 不编译（测试环境专用）
```

BuildCompiler 在编译前自动排除开发/本地/测试配置：

```typescript
// BuildCompiler.scanEntryPoints() 追加排除
ignore: [
  // ... 已有排除规则
  '**/config/development.{ts,js}',
  '**/config/local.{ts,js}',
  '**/config/test.{ts,js}',
]
```

---

## 5. `vext start` 行为变更

### 5.1 新的启动逻辑

`vext start` 在启动时增加 `dist/` 检测逻辑：

```
vext start
  ↓
detectProject() — 检测项目信息
  ↓
检查 dist/ 是否存在？
  ├── ✅ 存在 → 使用 node 直接运行 dist/ 下的 bootstrap 入口
  └── ❌ 不存在 → 降级为现有逻辑（TS 项目用 tsx，JS 项目用 node）
```

### 5.2 修改后的 start.ts

```typescript
// vextjs/cli/start.ts（修改后）
import { fork } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { detectProject } from './utils/detect-project.js'

export async function run() {
  const project = detectProject(process.cwd())

  // ── 检测编译产物 ──────────────────────────────────────
  const distDir = path.join(project.rootDir, 'dist')
  const hasDistBuild = existsSync(path.join(distDir, 'config'))
    && existsSync(distDir)

  if (hasDistBuild) {
    // ✅ 编译产物存在 → 使用 node 直接运行（无 tsx 依赖）
    console.log(`[vextjs] start mode — pre-built JavaScript (dist/)`)

    const child = fork(project.entryFile, [], {
      cwd:      project.rootDir,
      execArgv: [],                // 无需 tsx loader
      stdio:    'inherit',
      env: {
        ...process.env,
        NODE_ENV:         process.env.NODE_ENV || 'production',
        VEXT_MODE:        'start',
        VEXT_BUILT:       '1',     // 标记为编译模式（bootstrap 据此加载 dist/）
        VEXT_DIST_DIR:    distDir, // 编译产物目录
      },
    })

    child.on('exit', (code) => process.exit(code ?? 0))
    process.once('SIGTERM', () => child.kill('SIGTERM'))
    process.once('SIGINT',  () => child.kill('SIGINT'))

  } else {
    // ❌ 无编译产物 → 降级为 tsx 运行时（兼容未执行 vext build 的场景）
    console.log(`[vextjs] start mode — ${project.language === 'ts' ? 'TypeScript (tsx)' : 'JavaScript (node)'}`)

    if (project.language === 'ts') {
      console.log(`[vextjs] ⚠️  Running TypeScript via tsx. For better performance, run "vext build" first.`)
    }

    const child = fork(project.entryFile, [], {
      cwd:      project.rootDir,
      execArgv: project.language === 'ts'
        ? ['--import', 'tsx/esm']
        : [],
      stdio: 'inherit',
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'production',
        VEXT_MODE: 'start',
      },
    })

    child.on('exit', (code) => process.exit(code ?? 0))
    process.once('SIGTERM', () => child.kill('SIGTERM'))
    process.once('SIGINT',  () => child.kill('SIGINT'))
  }
}
```

### 5.3 bootstrap.ts 加载路径切换

bootstrap 根据 `VEXT_BUILT` 环境变量决定加载源码目录还是编译产物目录：

```typescript
// vextjs/lib/bootstrap.ts（修改后 — 顶部新增）
const isBuilt = process.env.VEXT_BUILT === '1'
const distDir = process.env.VEXT_DIST_DIR

// 源码目录 vs 编译产物目录
const srcDir = isBuilt && distDir
  ? distDir                              // 编译模式：加载 dist/
  : path.join(process.cwd(), 'src')      // 源码模式：加载 src/

// 后续所有 loader 使用 srcDir（路径完全透明）
// loadPlugins(app, path.join(srcDir, 'plugins'))
// loadMiddlewares(path.join(srcDir, 'middlewares'), ...)
// loadServices(app, path.join(srcDir, 'services'))
// loadRoutes(app, path.join(srcDir, 'routes'), ...)
// loadConfig(path.join(srcDir, 'config'))
```

**关键设计**：所有 loader 已经使用相对路径扫描目录，只需将根路径从 `src/` 切换到 `dist/` 即可，**loader 代码无需修改**。

---

## 6. Source Map 支持

### 6.1 生产环境 Source Map

编译产物包含外部 source map 文件（`.js.map`），用于：

- 错误堆栈映射回原始 TypeScript 行号
- APM/Sentry 等工具源码定位
- 调试（`node --enable-source-maps`）

```
dist/
├── routes/
│   ├── users.js
│   └── users.js.map     ← 外部 source map
├── services/
│   ├── user.js
│   └── user.js.map
└── ...
```

### 6.2 启用 Source Map 运行

```bash
# 推荐：生产环境启用 source map（错误堆栈可读性）
NODE_OPTIONS="--enable-source-maps" vext start

# 或在 package.json scripts 中配置
{
  "scripts": {
    "start": "NODE_OPTIONS='--enable-source-maps' vext start"
  }
}
```

### 6.3 不需要 Source Map 的场景

```bash
# 不生成 source map（减小产物体积）
vext build --no-sourcemap
```

---

## 7. 与 Docker 的集成

### 7.1 推荐 Dockerfile（多阶段构建）

```dockerfile
# ── Stage 1: 构建阶段 ──────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci                        # 安装全部依赖（含 devDependencies）

COPY . .
RUN npx vext build --clean        # 编译 TS → JS

# ── Stage 2: 运行阶段 ──────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev             # 仅安装生产依赖（无 tsx、无 esbuild）

COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

CMD ["npx", "vext", "start"]
```

### 7.2 镜像体积对比

| 方案 | 需要的依赖 | 预估 node_modules 大小 |
|------|-----------|:---------------------:|
| **tsx 运行时**（现状） | tsx + esbuild + 运行时依赖 | ~45MB |
| **vext build**（预编译） | 仅运行时依赖 | ~15MB |

> **预估减少 30MB**（具体取决于项目依赖结构）。

### 7.3 CI/CD 集成

```yaml
# GitHub Actions 示例
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx vext build --clean --typecheck
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
```

---

## 8. `.gitignore` 建议

编译产物 `dist/` 推荐加入 `.gitignore`（与 `.vext/` 一致）：

```gitignore
# vext 编译产物
.vext/
dist/
```

> **可选保留**：如果用户希望将编译产物纳入版本控制（如简化部署流程），可以不 ignore。`vext build --clean` 会在下次编译前清理旧产物。

---

## 9. 配置项扩展

在 `config/default.ts` 中新增可选 `build` 配置段：

```typescript
// src/config/default.ts
export default {
  // ... 现有配置

  build: {
    outdir:    'dist',           // 输出目录（默认 'dist'）
    sourcemap: true,             // 生成 source map（默认 true）
    minify:    false,            // 代码压缩（默认 false）
    target:    'node22',         // esbuild target（默认 'node22'）
    exclude:   [],               // 额外排除的 glob 模式
  },
}
```

CLI 参数优先级高于配置文件：

```
CLI 参数 > config/default.ts 的 build 段 > 内置默认值
```

---

## 10. 边界与约束

### 10.1 不支持的场景

| 场景 | 说明 | 替代方案 |
|------|------|---------|
| Bundle 模式 | 不将 node_modules 打包进产物 | 保留 `npm ci --omit=dev` 安装生产依赖 |
| 前端资源编译 | 不处理 CSS/HTML/图片等前端资源 | 前端构建交给 Vite/Webpack |
| 动态 import 路径 | `import(\`./\${name}\`)` 无法静态分析 | 使用文件名枚举或 glob 模式 |
| 非标准 TypeScript | 如 `emitDecoratorMetadata`（reflect-metadata） | vext 不使用装饰器路由，无此需求 |

### 10.2 JS 项目行为

JavaScript 项目执行 `vext build` 时：

- 输出提示信息并跳过（JS 无需编译）
- `vext start` 直接使用 `node` 运行（现有行为不变）

```
$ vext build
[vextjs] JavaScript project detected — no build step needed.
[vextjs] Use "vext start" directly.
```

### 10.3 与热重载的关系

| 命令 | 编译方式 | 产物目录 | 热重载 |
|------|---------|---------|--------|
| `vext dev` | DevCompiler（增量） | `.vext/dev/` | ✅ 三层 Soft Reload |
| `vext build` | BuildCompiler（全量） | `dist/` | ❌ 无（一次性） |
| `vext start` | 无编译（加载已有产物或 tsx） | — | ❌ 无 |

`vext dev` 和 `vext build` 互不干扰：
- `vext dev` 的产物在 `.vext/dev/`，不影响 `dist/`
- `vext build` 的产物在 `dist/`，不影响 `.vext/dev/`

---

## 11. 错误处理

### 11.1 编译错误

```
$ vext build
[vextjs] build — TypeScript → JavaScript
[vextjs] src:  /app/src
[vextjs] out:  /app/dist

[vextjs] build failed with 2 error(s)
  src/routes/users.ts:15 — Cannot find module './missing'
  src/services/user.ts:8 — Property 'foo' does not exist on type 'VextApp'
```

> esbuild 的编译错误**不包含类型错误**（esbuild 只做转译）。如需类型检查，使用 `--typecheck` 参数（内部调用 `tsc --noEmit`）。

### 11.2 Fail Fast 错误表

| 错误 | 消息 | 退出码 |
|------|------|:------:|
| 无源文件 | `No source files found in src/` | 1 |
| esbuild 编译失败 | `build failed with N error(s)` | 1 |
| 类型检查失败 | `type check failed — build aborted` | 1 |
| 输出目录不可写 | `Cannot write to ${outdir}: permission denied` | 1 |

---

## 12. 实施步骤

### 12.1 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/lib/build/build-compiler.ts` | BuildCompiler 实现 |
| 新建 | `src/lib/build/shared-esbuild-config.ts` | 共享 esbuild 配置 |
| 新建 | `src/cli/build.ts` | CLI 入口 |
| 修改 | `src/cli/index.ts` | 追加 `build` 命令分支 |
| 修改 | `src/cli/start.ts` | 增加 `dist/` 检测逻辑 |
| 修改 | `src/lib/bootstrap.ts` | 增加 `VEXT_BUILT` 环境变量支持 |
| 修改 | `src/lib/dev/compiler.ts` | 抽取共享配置到 `shared-esbuild-config.ts` |

### 12.2 进度估算

| 阶段 | 工作量 | 说明 |
|------|:------:|------|
| BuildCompiler 实现 | 0.5 天 | 复用 DevCompiler esbuild 配置 |
| CLI 入口 + 参数解析 | 0.5 天 | 含输出格式化和错误处理 |
| start.ts 改造 | 0.5 天 | dist/ 检测 + bootstrap 路径切换 |
| DevCompiler 重构 | 0.5 天 | 抽取共享配置 |
| 测试 + 文档 | 0.5 天 | 编译正确性 + Docker 集成验证 |
| **合计** | **2-3 天** | — |

---

## 13. 与其他模块的交互

```
vext build
  ↓
detectProject()           → 09-cli.md §4（项目检测）
  ↓
BuildCompiler.build()     → 本文档 §2（编译策略）
  ├── shared-esbuild-config → 与 DevCompiler 共享
  └── glob 扫描 src/       → 00-directory-structure.md（目录约定）
  ↓
输出 dist/                → vext start §5（加载切换）
  ↓
bootstrap.ts 加载 dist/   → 09-cli.md §5（bootstrap）
  ├── loadConfig(dist/config)
  ├── loadPlugins(dist/plugins)
  ├── loadMiddlewares(dist/middlewares)
  ├── loadServices(dist/services)
  └── loadRoutes(dist/routes)
```

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|--------|---------|------|
| `BuildOptions` | `cli/build.ts` | CLI 命令参数 |
| `BuildCompilerOptions` | `lib/build/build-compiler.ts` | 编译器选项 |
| `BuildResult` | `lib/build/build-compiler.ts` | 编译结果统计 |

---

**版本记录**:
- v1.0.0 (2026-02-28): 初版设计 — esbuild 全量编译 + dist/ 输出 + vext start 自动检测