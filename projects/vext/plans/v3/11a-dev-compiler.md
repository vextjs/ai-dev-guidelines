# Vext v3 — DevCompiler（esbuild 预编译器）

> **文档编号**: 11a-dev-compiler.md  
> **状态**: 设计稿 v2.2  
> **最后更新**: 2026-02-28  
> **父文档**: [11-hot-reload.md](./11-hot-reload.md)  
> **关联文件**: `11b-soft-reload.md`, `11e-edge-cases.md`

---

## 目录

- [1. 概述](#1-概述)
- [2. 为什么用 esbuild 而不是 tsx](#2-为什么用-esbuild-而不是-tsx)
- [3. DevCompiler 实现](#3-devcompiler-实现)
- [4. 编译产物目录结构](#4-编译产物目录结构)
- [5. 分级编译策略](#5-分级编译策略)
- [6. 路径映射](#6-路径映射)

---

## 1. 概述

DevCompiler 是热重载方案的核心组件。所有用户源码（TS、ESM、CJS）都通过 esbuild 统一编译为 CJS `.js` 文件，解决了 ESM `import` 无法清除缓存的根本问题。

**核心职责**：

| 职责 | 说明 |
|------|------|
| 首次全量编译 | `start()` — 扫描 `src/` 下所有源文件，编译到 `.vext/dev/` |
| Tier 1 单文件编译 | `compileSingle()` / `compileFiles()` — 代码修改时 O(1) 编译 |
| Tier 2 全量重编译 | `rebuildWithNewEntryPoints()` — 文件增删时重建 context |
| 路径映射 | `resolveCompiled()` / `resolveSource()` — 源文件 ↔ 编译产物 |

---

## 2. 为什么用 esbuild 而不是 tsx

| 维度 | tsx（运行时转译） | esbuild（预编译） ✅ |
|------|-----------------|---------------------|
| **原理** | Hook `Module._load`，拦截 require 做内存中转译 | 文件变更时先编译到磁盘，Node.js 加载纯 `.js` |
| **运行时干净度** | Node.js 进程内有 loader hook 在拦截每个 require | Node.js 进程加载的就是普通 `.js`，**零 hook** |
| **ESM 处理** | tsx 内部 patch ESM 让它走 CJS，偶有边界 case | 编译阶段转完，运行时不存在 ESM |
| **增量编译** | 按需 ~20-50ms/文件 | `ctx.rebuild()` ~5-15ms 全量增量 |
| **可调试性** | 转译产物在内存中，不可直接查看 | 编译产物在 `.vext/dev/` 目录，可直接检查 |
| **Dev/Prod 一致** | 生产环境通常不用 tsx | 生产同样可用 esbuild，同一管线 |
| **本质** | tsx 底层就是 esbuild + CJS wrapper | 直接用 esbuild，少一层封装 |

> **关键洞察**：tsx 本身底层就是 esbuild。用 esbuild 直接编译是砍掉中间人，架构更直接。

---

## 3. DevCompiler 实现

```ts
// lib/dev/compiler.ts
import * as esbuild from 'esbuild'
import { glob } from 'fast-glob'
import path from 'path'
import fs from 'fs'

export interface DevCompilerOptions {
  /** 源码目录 (绝对路径) */
  srcDir: string
  /** 编译输出目录 (绝对路径) */
  outDir: string
  /** tsconfig.json 路径 (可选) */
  tsconfig?: string
}

export class DevCompiler {
  private ctx: esbuild.BuildContext | null = null
  private readonly srcDir: string
  private readonly outDir: string
  private readonly tsconfig: string | undefined

  /**
   * v2.2 新增：预解析并展平的 tsconfig 内容（字符串形式）。
   *
   * esbuild.context() 的 `tsconfig` 参数接受文件路径，能自动解析 `extends` 链。
   * 但 esbuild.transform() 的 `tsconfigRaw` 只接受 JSON 字符串，不解析 `extends`。
   *
   * 为保证 Tier 1 (transform) 和 Tier 2 (context.rebuild) 行为一致，
   * 在 start() 时预解析 tsconfig（展平 extends 链），缓存结果供 compileSingle() 使用。
   */
  private resolvedTsconfigRaw: string | undefined

  constructor(options: DevCompilerOptions) {
    this.srcDir = options.srcDir
    this.outDir = options.outDir
    this.tsconfig = options.tsconfig
  }

  /**
   * 初始化 esbuild context（只调用一次）
   * 用于首次全量编译和结构变更时的全量重编译
   */
  async start(): Promise<void> {
    // 确保输出目录存在且干净
    if (fs.existsSync(this.outDir)) {
      fs.rmSync(this.outDir, { recursive: true, force: true })
    }
    fs.mkdirSync(this.outDir, { recursive: true })

    // v2.2: 预解析 tsconfig（展平 extends 链）
    await this.resolveTsconfig()

    const entryPoints = await glob('**/*.{ts,js,mjs,cjs}', {
      cwd: this.srcDir,
      ignore: ['**/*.d.ts', '**/*.test.*', '**/*.spec.*'],
    })

    this.ctx = await esbuild.context({
      entryPoints: entryPoints.map(f => path.join(this.srcDir, f)),
      outdir: this.outDir,
      outbase: this.srcDir,           // 保持目录结构 src/routes/user.ts → .vext/dev/routes/user.js
      format: 'cjs',                  // ✅ 统一输出 CJS — ESM 问题根治
      platform: 'node',
      target: 'node18',
      sourcemap: true,                // 错误堆栈指向原始 TS 源码
      sourceRoot: this.srcDir,
      packages: 'external',           // 不打包 node_modules（保持 require 外部包）
      tsconfig: this.tsconfig,
      logLevel: 'warning',
      // 注意：不使用 bundle: true — 逐文件编译，保持模块粒度
    })

    // 首次全量编译
    await this.ctx.rebuild()
  }

  /**
   * 全量增量重编译（Tier 2：结构变更时使用）
   *
   * 当新增/删除文件时需要使用此方法，因为 entry points 可能变化。
   * esbuild context 内部有缓存，未变更文件会跳过解析，但仍需检查所有 entry。
   *
   * 典型耗时：
   *   - 50 文件项目:  ~10-30ms
   *   - 500 文件项目: ~50-200ms
   *   - 2000 文件项目: ~200-500ms
   */
  async rebuild(): Promise<void> {
    if (!this.ctx) {
      throw new Error('[DevCompiler] not started. Call start() first.')
    }
    await this.ctx.rebuild()
  }

  /**
   * Tier 2：当检测到文件新增或删除时，需要重建 esbuild context
   * （因为 entryPoints 发生了变化）
   *
   * 典型耗时：
   *   - 50 文件项目:  ~20-50ms
   *   - 500 文件项目: ~80-250ms
   *   - 2000 文件项目: ~250-600ms
   *
   * 仅在文件增删时触发（约 5% 场景），95% 的代码变更走 compileSingle() 路径
   */
  async rebuildWithNewEntryPoints(): Promise<void> {
    await this.ctx?.dispose()

    const entryPoints = await glob('**/*.{ts,js,mjs,cjs}', {
      cwd: this.srcDir,
      ignore: ['**/*.d.ts', '**/*.test.*', '**/*.spec.*'],
    })

    this.ctx = await esbuild.context({
      entryPoints: entryPoints.map(f => path.join(this.srcDir, f)),
      outdir: this.outDir,
      outbase: this.srcDir,
      format: 'cjs',
      platform: 'node',
      target: 'node18',
      sourcemap: true,
      sourceRoot: this.srcDir,
      packages: 'external',
      tsconfig: this.tsconfig,
      logLevel: 'warning',
    })

    await this.ctx.rebuild()
  }

  /**
   * 单文件编译（Tier 1：代码变更时使用）⭐ v2.1 新增
   *
   * 使用 esbuild.transform() 只编译单个变更文件，不涉及其他文件。
   * 由于 Vext 不使用 bundle 模式（每个文件独立编译），transform() 的
   * 输出与 context.rebuild() 对同一文件的输出完全等价。
   *
   * 典型耗时：~1-5ms/文件，与项目总文件数无关（O(1) 编译）
   *
   * v2.2 修复：使用预解析的 resolvedTsconfigRaw 替代直接读取 tsconfig 文件，
   * 确保 extends 链被正确展平，与 context.rebuild() 行为一致。
   *
   * @param srcFile 变更的源文件绝对路径
   * @returns 编译产物的绝对路径
   */
  async compileSingle(srcFile: string): Promise<string> {
    const source = await fs.promises.readFile(srcFile, 'utf-8')
    const ext = path.extname(srcFile).slice(1) // ts, js, mjs, cjs

    const result = await esbuild.transform(source, {
      loader: (ext === 'mjs' || ext === 'cjs' ? 'js' : ext) as esbuild.Loader,
      format: 'cjs',
      platform: 'node',
      target: 'node18',
      sourcemap: true,
      sourcefile: srcFile,              // sourcemap 指回原始源文件
      // v2.2: 使用预解析的 tsconfig（已展平 extends），而非原始文件内容
      tsconfigRaw: this.resolvedTsconfigRaw,
    })

    const outFile = this.resolveCompiled(srcFile)
    await fs.promises.mkdir(path.dirname(outFile), { recursive: true })
    await fs.promises.writeFile(outFile, result.code)
    if (result.map) {
      await fs.promises.writeFile(outFile + '.map', result.map)
    }

    return outFile
  }

  /**
   * 批量单文件编译（多文件同时变更时并行编译）
   *
   * @param srcFiles 变更的源文件绝对路径列表
   * @returns 编译产物的绝对路径列表
   */
  async compileFiles(srcFiles: string[]): Promise<string[]> {
    return Promise.all(srcFiles.map(f => this.compileSingle(f)))
  }

  /**
   * 将源文件路径映射为编译后的路径
   *
   * 支持两种输入：
   *   - 相对于项目根目录的路径: src/routes/user.ts → .vext/dev/routes/user.js
   *   - 绝对路径: /project/src/routes/user.ts → .vext/dev/routes/user.js
   */
  resolveCompiled(srcFile: string): string {
    let absolute: string
    if (path.isAbsolute(srcFile)) {
      absolute = srcFile
    } else {
      // 相对于项目根目录（如 "src/routes/user.ts"）
      // projectRoot = srcDir 的父目录
      const projectRoot = path.resolve(this.srcDir, '..')
      absolute = path.resolve(projectRoot, srcFile)
    }

    const relative = path.relative(this.srcDir, absolute)
    const jsFile = relative.replace(/\.(ts|mjs|cjs)$/, '.js')
    return path.join(this.outDir, jsFile)
  }

  /**
   * 将编译目录路径映射回源文件路径（反向映射，用于错误堆栈等）
   */
  resolveSource(compiledFile: string): string {
    const relative = path.relative(this.outDir, compiledFile)
    return path.join(this.srcDir, relative)
  }

  /** 获取源码目录（绝对路径） */
  getSrcDir(): string {
    return this.srcDir
  }

  /** 获取编译输出目录（绝对路径） */
  getOutDir(): string {
    return this.outDir
  }

  /** 获取项目根目录（srcDir 的父目录） */
  getProjectRoot(): string {
    return path.resolve(this.srcDir, '..')
  }

  /** 释放 esbuild 资源 */
  async dispose(): Promise<void> {
    await this.ctx?.dispose()
    this.ctx = null
  }

  /**
   * v2.2 新增：预解析 tsconfig.json，展平 extends 链
   *
   * 读取 tsconfig.json，如果包含 extends，递归合并父配置，
   * 最终输出一个不含 extends 的纯 JSON 字符串。
   * 这样 esbuild.transform() 的 tsconfigRaw 能获得与 esbuild.context()
   * 的 tsconfig（路径参数）完全一致的编译行为。
   *
   * 注意：只提取 esbuild 实际使用的字段（compilerOptions 中的
   * target、jsx、jsxFactory、jsxFragment、useDefineForClassFields、
   * importsNotUsedAsValues、preserveValueImports、experimentalDecorators、
   * verbatimModuleSyntax 等），其他字段不影响 transform 行为。
   */
  private async resolveTsconfig(): Promise<void> {
    if (!this.tsconfig) {
      this.resolvedTsconfigRaw = undefined
      return
    }

    try {
      const resolved = await this.flattenTsconfig(this.tsconfig)
      this.resolvedTsconfigRaw = JSON.stringify(resolved)
    } catch {
      // tsconfig 不存在或解析失败，transform 将使用默认设置
      this.resolvedTsconfigRaw = undefined
    }
  }

  /**
   * 递归展平 tsconfig，合并 extends 链
   */
  private async flattenTsconfig(tsconfigPath: string): Promise<Record<string, any>> {
    const content = await fs.promises.readFile(tsconfigPath, 'utf-8')
    // 移除 JSON 中的注释（tsconfig 允许注释）
    const cleaned = content.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    const config = JSON.parse(cleaned)

    if (!config.extends) {
      return { compilerOptions: config.compilerOptions || {} }
    }

    // 解析 extends 路径
    const extendsPath = require.resolve(config.extends, {
      paths: [path.dirname(tsconfigPath)],
    })
    const parent = await this.flattenTsconfig(extendsPath)

    // 子配置覆盖父配置（浅合并 compilerOptions）
    return {
      compilerOptions: {
        ...parent.compilerOptions,
        ...(config.compilerOptions || {}),
      },
    }
  }
}
```

---

## 4. 编译产物目录结构

```
项目根/
├── src/                        ← 用户源码（TS/ESM，随便写）
│   ├── routes/
│   │   ├── user.ts             (export default defineRoutes(...))
│   │   └── post.ts
│   ├── services/
│   │   ├── auth.ts
│   │   └── payment/
│   │       └── stripe.ts
│   ├── middlewares/
│   │   └── cors.ts
│   ├── config/
│   │   ├── default.ts
│   │   └── development.ts
│   └── locales/
│       ├── en.ts
│       └── zh-CN.ts
│
├── .vext/dev/                  ← esbuild 编译产物（全部是 CJS .js）
│   ├── routes/
│   │   ├── user.js             ← module.exports = ...
│   │   ├── user.js.map         ← source map → 指向 src/routes/user.ts
│   │   ├── post.js
│   │   └── post.js.map
│   ├── services/
│   │   ├── auth.js
│   │   ├── auth.js.map
│   │   └── payment/
│   │       ├── stripe.js
│   │       └── stripe.js.map
│   ├── middlewares/
│   │   ├── cors.js
│   │   └── cors.js.map
│   ├── config/
│   │   ├── default.js          ← config 也被编译（cold restart 时重新加载）
│   │   └── development.js
│   └── locales/
│       ├── en.js
│       ├── en.js.map
│       ├── zh-CN.js
│       └── zh-CN.js.map
│
├── tsconfig.json
└── .gitignore                  ← 应包含 .vext/
```

> **注意**：`config/` 目录下的文件也会被编译（因为它们也在 `src/` 下），但 config 文件的变更会触发 Tier 3 cold restart，而非 soft reload。Dev bootstrap 从 `.vext/dev/config/` 加载编译后的 CJS 配置。

---

## 5. 分级编译策略

### 5.1 两种编译路径

| 维度 | Tier 1: `compileSingle()` | Tier 2: `rebuildWithNewEntryPoints()` |
|------|--------------------------|--------------------------------------|
| 触发条件 | 文件内容修改（`modify`） | 新增文件（`add`）/ 删除文件（`delete`） |
| 频率 | ~95% | ~5% |
| 机制 | `esbuild.transform()` 逐文件 | `esbuild.context().rebuild()` 全量 |
| 扫描文件数 | 仅变更的 1-N 个文件 | 所有源文件 |
| 耗时（200 文件项目） | ~3ms | ~50-100ms |
| 耗时（2000 文件项目） | ~3ms | ~250-600ms |
| 与项目大小的关系 | **O(changed)** — 无关 | **O(all)** — 线性 |

### 5.2 为什么 transform() 输出与 rebuild() 等价？

Vext 不使用 `bundle: true`（逐文件编译模式），因此 esbuild context 对每个文件的处理就是独立的 transform。两者使用相同的选项（format、platform、target、tsconfig），输出结果完全等价。

唯一的差异是 source map 中的 `sources` 字段格式可能略有不同，但不影响功能。

> **⚠️ tsconfig `paths` 限制**：
>
> `esbuild.transform()` 的 `tsconfigRaw` 参数**不解析** tsconfig 的 `paths` 映射（如 `"@/*": ["./src/*"]`）。
> 而 `esbuild.context()` 的 `tsconfig` 文件参数**也不解析 paths**（esbuild 在非 bundle 模式下不处理 paths）。
>
> 因此 Tier 1 和 Tier 2 在 paths 方面行为一致——**都不处理**。
> 如果用户使用了 tsconfig paths 别名，Node.js 运行时需要通过 `--import tsx/esm` 或
> `tsconfig-paths/register` 来解析。但 dev 模式不使用 tsx loader，**所以用户在 dev 模式下
> 不应依赖 tsconfig paths 别名**。建议直接使用相对路径 import。
>
> 如果项目必须使用 paths 别名，可以在 esbuild 配置中添加 `alias` 选项映射。
> 框架后续可考虑在 DevCompiler 中自动解析 tsconfig paths 并注入 `alias`。

### 5.3 选择编译策略的判断逻辑

由 `softReload()` 根据 `FileChangeInfo.type` 字段决定（详见 [11b-soft-reload.md](./11b-soft-reload.md)）：

```ts
const hasStructuralChange = changedFiles.some(
  f => f.type === 'add' || f.type === 'delete'
);

if (hasStructuralChange) {
  // Tier 2: 结构变更 → 重建 context（含新 entry points）
  await compiler.rebuildWithNewEntryPoints();
} else {
  // Tier 1: 代码变更 → 单文件编译（~1-5ms/文件，O(1)）
  // v2.2 修复：使用 projectRoot 正确解析路径
  const projectRoot = compiler.getProjectRoot();
  const srcFiles = changedFiles.map(f => path.resolve(projectRoot, f.path));
  await compiler.compileFiles(srcFiles);
}
```

---

## 6. 路径映射

### 6.1 映射规则

| 源文件路径（相对项目根） | 编译产物路径 |
|------------------------|------------|
| `src/routes/user.ts` | `.vext/dev/routes/user.js` |
| `src/services/auth.ts` | `.vext/dev/services/auth.js` |
| `src/services/payment/stripe.mjs` | `.vext/dev/services/payment/stripe.js` |
| `src/middlewares/cors.ts` | `.vext/dev/middlewares/cors.js` |
| `src/locales/zh-CN.ts` | `.vext/dev/locales/zh-CN.js` |
| `src/config/default.ts` | `.vext/dev/config/default.js` |
| `src/utils/hash.js` | `.vext/dev/utils/hash.js` |

### 6.2 映射函数

`resolveCompiled()` 支持两种输入形式：

```ts
// 相对于项目根目录
compiler.resolveCompiled('src/routes/user.ts')
// → /absolute/path/.vext/dev/routes/user.js

// 绝对路径
compiler.resolveCompiled('/project/src/routes/user.ts')
// → /absolute/path/.vext/dev/routes/user.js
```

`resolveSource()` 用于反向映射（错误堆栈等场景）：

```ts
compiler.resolveSource('/project/.vext/dev/routes/user.js')
// → /project/src/routes/user.js
```

> **v2.2 改进说明**：`resolveCompiled()` 现在显式区分绝对路径和相对路径的处理逻辑，
> 避免了 v2.1 中依赖 `path.resolve(srcDir, '..', srcFile)` 的隐式行为（对绝对路径
> 意外正确但代码意图不清晰）。