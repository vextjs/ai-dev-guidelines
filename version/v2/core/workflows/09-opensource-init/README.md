# 开源项目初始化规范

> **任务类型**: 开源项目初始化  
> **使用场景**: 创建新的开源 NPM 包/模块项目  
> **参考项目**: monSQLize, rate-limit, schema-dsl, jrpc  
> **最后更新**: 2026-03-04

---

## 🚨 强制执行规则（违反=规范失效）

```
❌ 绝对禁止的行为：
  - CP1 需求确认后直接创建全量文件（跳过 CP2/CP3）
  - 不输出技术方案（项目结构设计）就开始创建文件
  - 不生成 IMPLEMENTATION-PLAN.md 就开始执行
  - 会话报告/任务产物存放在非标准路径（如 reports/init/）

✅ 正确的执行顺序：
  收到需求 → 输出需求理解 → 等待 CP1 确认
           → 输出项目结构设计（技术方案） → 等待 CP2 确认
           → 输出文件创建计划（实施方案）+ IMPLEMENTATION-PLAN → 等待 CP3 确认
           → 按 PLAN 顺序逐批创建文件
```

---

## 📂 输出路径规范

> 🔴 所有路径以 `ai-dev-guidelines/projects/<project>/` 为根

```yaml
任务产物（正式归档，提交 git）:
  需求定义: projects/<project>/requirements/<中文描述>/01-需求定义.md
  技术方案: projects/<project>/requirements/<中文描述>/02-技术方案.md
  实施方案: projects/<project>/requirements/<中文描述>/03-实施方案/（文件数 >= 5 时）
  实施计划: projects/<project>/requirements/<中文描述>/IMPLEMENTATION-PLAN.md
  注意: <中文描述> 为项目初始化的简要描述，如"项目初始化"

会话报告（不提交 git）:
  路径: projects/<project>/reports/requirements/<agent>/YYYYMMDD/NN-req-<简述>.md
  遵循: temp-reports.md 统一命名规范

❌ 禁止:
  - reports/init/（非标准子目录）
  - 根目录直接放报告文件
  - 不按 agent/YYYYMMDD 目录隔离
```

> **注意**: 09-opensource-init 创建的是新项目，`projects/<project>/` 目录在阶段 1 后可能尚不存在。
> AI 在 CP1 确认后、进入阶段 2 之前，必须先创建 `projects/<project>/` 目录及 `profile/` 子目录。

---

## 📋 流程概览

```
阶段 1: 需求定义          →  CP1 确认
阶段 2: 项目结构设计      →  CP2 确认
阶段 3: 文件创建计划      →  CP3 确认（含 IMPLEMENTATION-PLAN）
阶段 4: 执行创建          →  按 PLAN 顺序逐批创建
阶段 5: 发布准备 + 报告   →  完成检查 + 会话报告
```

---

## 🎯 执行步骤

### 阶段 1: 需求定义

**目标**: 明确项目定位和核心功能

**执行步骤**:
1. 阅读用户需求描述
2. 分析项目定位、目标用户、核心功能
3. 确定技术栈（语言、运行环境、核心依赖）
4. 用一句话复述项目定位

**输出格式**:
```markdown
📋 需求理解:

- 项目名称: [如 my-awesome-lib]
- 一句话定位: [项目做什么]
- 目标用户: [谁会使用]
- 核心功能:
  1. [功能1]
  2. [功能2]
- 技术栈:
  - 语言: [JavaScript/TypeScript]
  - 运行环境: [Node.js 版本要求]
  - 核心依赖: [如有]
- NPM 包名: [如 @scope/package-name]

请确认以上理解是否正确？[确认/修改]
```

**⏸️ CP1 确认点（绝对强制）**:
> 🔴 **无论需求描述多清晰，都必须输出需求理解并等待用户明确回复"确认"后才能继续。**
> 🔴 **CP1 确认后，先创建 `projects/<project>/` 项目目录（如不存在），再进入阶段 2。**

---

### 阶段 2: 项目结构设计（技术方案）

**目标**: 设计项目目录结构、技术选型、模块划分（只描述方案，不创建文件）

**执行步骤**:
1. 基于需求确定项目结构（CJS/ESM/TypeScript）
2. 设计目录层次和模块划分
3. 确定工程化配置（ESLint、CI、测试框架等）
4. 确定发布策略（npm files、exports map）

**输出格式**:
```markdown
📝 项目结构设计:

## 技术选型
| 项目 | 选型 | 理由 |
|------|------|------|
| 模块格式 | CJS + ESM 双支持 | 兼容性最佳 |
| 类型定义 | TypeScript 声明文件 | 类型安全 |
| 测试框架 | 原生 test runner / Jest | [理由] |
| 代码规范 | ESLint flat config | 最新标准 |
| CI | GitHub Actions | 社区标准 |

## 目录结构
[输出完整目录树]

## 模块划分
| 模块 | 职责 | 文件 |
|------|------|------|
| 核心模块 | [职责] | lib/core.js |
| ... | ... | ... |

## 发布配置
- exports map 设计
- files 字段
- TypeScript 类型导出

## 影响评估
- 预估文件数: [N 个]
- 预估工作量: [N 分钟]

请确认方案是否可行？[确认/修改]
```

**⏸️ CP2 确认点（绝对强制）**:
> 🔴 **项目结构设计必须输出完整，且等待用户明确回复"确认"后才能进入文件创建计划。**
> 🔴 **禁止在输出项目结构设计的同时就开始创建文件。**

---

### 阶段 3: 文件创建计划（实施方案）

**目标**: 生成所有需要创建的文件清单、每个文件的核心内容概要、创建顺序

**执行步骤**:
1. 基于项目结构设计，列出所有需要创建的文件
2. 为每个文件写明核心内容概要（不是完整代码，是"这个文件要包含什么"）
3. 按依赖顺序排列创建步骤
4. 生成 IMPLEMENTATION-PLAN.md

**🔴 IMPLEMENTATION-PLAN.md（强制生成）**:

> 详见 [01-requirement-dev §阶段 3 IMPLEMENTATION-PLAN 规则](../01-requirement-dev/README.md)

开源项目初始化通常涉及 15+ 个文件，属于大需求，IMPLEMENTATION-PLAN 必须包含：
1. 总体进度看板（批次/百分比/状态）
2. 任务编号表（编号/文件名/操作/内容概要/状态 🔲/✅）
3. 创建顺序（按依赖分批）
4. 完成标准

**推荐的创建批次**:

```yaml
批次划分（按依赖顺序）:
  批次 1 — 项目骨架:
    - package.json（项目配置核心）
    - .gitignore
    - .npmignore
    - LICENSE
    
  批次 2 — 核心源码:
    - lib/ 目录下的源代码文件
    - index.js / index.mjs（入口文件）
    - index.d.ts / types/（TypeScript 类型定义）

  批次 3 — 测试:
    - test/ 目录下的测试文件
    - test/run-tests.js（测试运行器）

  批次 4 — 文档体系:
    - README.md
    - CHANGELOG.md
    - CONTRIBUTING.md
    - SECURITY.md
    - STATUS.md
    - docs/ 目录

  批次 5 — 工程配置:
    - eslint.config.js
    - .github/workflows/ci.yml
    - .npmrc
    - codecov.yml（可选）
```

**输出格式**:
```markdown
📋 文件创建计划:

## IMPLEMENTATION-PLAN 概要
| # | 任务 | 文件 | 操作 | 状态 |
|---|------|------|------|:----:|
| 1.1 | 项目配置 | package.json | 新建 | 🔲 |
| 1.2 | Git 忽略 | .gitignore | 新建 | 🔲 |
| ... | ... | ... | ... | 🔲 |

创建顺序: 批次1(骨架) → 批次2(源码) → 批次3(测试) → 批次4(文档) → 批次5(工程)

## 每个文件的核心内容概要
### package.json
- name, version, description, main, module, exports, types, files
- scripts: test, lint, prepublishOnly
- devDependencies: eslint, nyc

### lib/index.js
- 主入口，导出核心 API
- [核心功能描述]

[...其他文件概要...]

## 完成标准
- [ ] 所有文件已创建
- [ ] npm test 可运行
- [ ] TypeScript 类型定义完整
- [ ] README 包含安装和基础用法

请确认文件创建计划？确认后开始逐批创建文件。[确认/修改]
```

**⏸️ CP3 确认点（绝对强制）**:
> 🔴 **用户确认 IMPLEMENTATION-PLAN + 文件创建计划后才开始执行。**
> 🔴 **确认后才创建实际文件，禁止在 CP3 之前创建任何业务文件。**

---

### 阶段 4: 执行创建

**目标**: 按 IMPLEMENTATION-PLAN 顺序，逐批创建文件

**前置条件**: CP3 已确认 + IMPLEMENTATION-PLAN 已生成

**执行步骤**:
1. 按批次顺序创建文件
2. 每完成一个批次，报告进度并更新 IMPLEMENTATION-PLAN 状态
3. 触发编码检查点（约束 #18），同步更新记忆文件

**批次执行顺序**:

```yaml
批次 1 — 项目骨架:
  创建: package.json、.gitignore、.npmignore、LICENSE
  完成后: 更新 PLAN 状态 + 📦 编码检查点

批次 2 — 核心源码:
  创建: lib/ 源代码、入口文件、类型定义
  完成后: 更新 PLAN 状态 + 📦 编码检查点

批次 3 — 测试:
  创建: test/ 测试文件、测试运行器
  完成后: 更新 PLAN 状态 + 📦 编码检查点

批次 4 — 文档体系:
  创建: README.md、CHANGELOG.md、CONTRIBUTING.md 等
  完成后: 更新 PLAN 状态 + 📦 编码检查点

批次 5 — 工程配置:
  创建: eslint.config.js、CI 配置等
  完成后: 更新 PLAN 状态 + 📦 编码检查点
```

**进度报告格式**:
```markdown
🔄 创建进度: [批次 2/5]
✅ 已完成: package.json, .gitignore, .npmignore, LICENSE
🔄 正在处理: lib/index.js, index.mjs, index.d.ts
⏳ 待处理: test/, docs/, eslint.config.js, CI
```

**Token 不够时**:
- 因编码检查点已在每批完成时同步更新记忆，中断后新会话可精确恢复
- 下次会话: 用户说"继续"时，读记忆 📦 编码检查点 → 读 IMPLEMENTATION-PLAN → 从断点续接

---

### 阶段 5: 发布准备 + 完成报告

**目标**: 验证项目完整性，生成完成报告

**发布前检查清单**:

- [ ] package.json 版本号正确
- [ ] README.md 完整（安装、使用、API）
- [ ] CHANGELOG.md 已更新
- [ ] TypeScript 类型定义完整
- [ ] ESM/CJS 双支持
- [ ] .npmignore 配置正确
- [ ] LICENSE 文件存在
- [ ] 至少 1 个测试文件存在

**发布命令提示**:

```bash
# 检查将发布的文件
npm publish --dry-run

# 正式发布
npm publish
```

**完成报告格式**:
```markdown
📋 项目初始化完成报告:

## 创建汇总
| 类别 | 文件数 | 说明 |
|------|:------:|------|
| 项目骨架 | 4 | package.json, .gitignore, .npmignore, LICENSE |
| 核心源码 | N | lib/ 下 N 个文件 |
| 测试 | N | test/ 下 N 个文件 |
| 文档 | N | README, CHANGELOG, CONTRIBUTING 等 |
| 工程配置 | N | eslint, CI, codecov 等 |
| **总计** | **N** | |

## 验证结果
- 项目结构: ✅ 完整
- 类型定义: ✅ 完整
- 文档体系: ✅ 完整
- 发布配置: ✅ 就绪

## 后续建议
1. 运行 `npm test` 验证测试
2. 运行 `npm publish --dry-run` 检查发布文件
3. 补充详细的 API 文档（docs/api/）
```

---

## 📝 核心文件模板

### package.json

```json
{
  "name": "<package-name>",
  "version": "1.0.0",
  "description": "<一句话描述>",
  "main": "lib/index.js",
  "module": "index.mjs",
  "type": "commonjs",
  "exports": {
    ".": {
      "require": "./lib/index.js",
      "import": "./index.mjs",
      "types": "./index.d.ts"
    },
    "./package.json": "./package.json"
  },
  "types": "./index.d.ts",
  "files": [
    "lib/",
    "types/",
    "index.d.ts",
    "index.mjs",
    "README.md",
    "LICENSE",
    "CHANGELOG.md"
  ],
  "keywords": ["<关键词1>", "<关键词2>"],
  "author": "<作者>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/<org>/<repo>.git"
  },
  "bugs": {
    "url": "https://github.com/<org>/<repo>/issues"
  },
  "homepage": "https://github.com/<org>/<repo>#readme",
  "engines": {
    "node": ">=16.0.0"
  },
  "scripts": {
    "test": "node test/run-tests.js",
    "test:coverage": "nyc --reporter=text --reporter=lcov node test/run-tests.js",
    "lint": "eslint lib/ test/",
    "lint:fix": "eslint lib/ test/ --fix",
    "prepublishOnly": "npm test && npm run lint"
  },
  "devDependencies": {
    "eslint": "^9.0.0",
    "nyc": "^15.1.0"
  }
}
```

### index.d.ts（类型定义模板）

```typescript
/**
 * <项目名> - <一句话描述>
 * @version 1.0.0
 */

export interface Options {
  // 配置选项
}

export interface Result {
  // 返回结果
}

/**
 * 主函数/类
 */
export function main(options?: Options): Result;

// 或导出类
export class MyClass {
  constructor(options?: Options);
  // 方法定义
}

export default MyClass;
```

### index.mjs（ESM 入口）

```javascript
// ESM wrapper
export * from './lib/index.js';
export { default } from './lib/index.js';
```

### README.md 结构

```markdown
<div align="center">

# 🚀 项目名

### 一句话描述

[![npm version](https://img.shields.io/npm/v/<package>.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)]()

</div>

---

## 📑 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [核心特性](#核心特性)
- [API 文档](#api-文档)
- [示例](#示例)
- [兼容性](#兼容性)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 安装

npm install <package-name>

## 快速开始

const lib = require('<package-name>');

// 基础用法
const result = lib.doSomething();

## 核心特性

| 特性 | 说明 |
|-----|------|
| ⚡ 特性1 | 描述 |
| 🔧 特性2 | 描述 |

## API 文档

详见 [docs/INDEX.md](./docs/INDEX.md)

## 贡献指南

详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

## 许可证

MIT License
```

### CONTRIBUTING.md 模板

```markdown
# 贡献指南

感谢您对本项目的兴趣！

## 开发环境

git clone <repo>
cd <project>
npm ci
npm test

## 提交规范

使用 Conventional Commits:
- feat: 新功能
- fix: 修复
- docs: 文档
- test: 测试
- refactor: 重构

## Pull Request 流程

1. Fork 项目
2. 创建分支 `git checkout -b feature/xxx`
3. 提交更改
4. 推送并创建 PR
```

### SECURITY.md 模板

```markdown
# Security Policy

## 支持版本

| 版本 | 支持状态 |
|------|---------|
| 1.x  | ✅ 支持 |

## 报告安全问题

请通过私信或邮件联系维护者。
- 提供可复现的最小示例
- 72 小时内响应
```

### STATUS.md 模板

```markdown
# 需求状态追踪

> **最后更新**: YYYY-MM-DD

## 发布计划

| 版本 | 状态 | 日期 | 进度 |
|------|------|------|------|
| v1.0.0 | 🔄 开发中 | - | 0/X |

## v1.0.0

**需求列表**:
- [ ] 功能1
- [ ] 功能2
```

---

## 📝 工程配置模板

### .gitignore

```
# Dependencies
node_modules/

# Build
dist/
build/

# Coverage
coverage/
.nyc_output/

# IDE
.idea/
.vscode/
*.swp

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*

# Environment
.env
.env.local

# Test
test-results/
```

### .npmignore

```
# Development
test/
tests/
__tests__/
*.test.js
*.spec.js
coverage/
.nyc_output/

# Config
.eslintrc*
eslint.config.js
.prettierrc*
tsconfig.json
.github/
.gitignore
codecov.yml

# Docs (optional - keep if needed)
# docs/

# Other
*.md
!README.md
!CHANGELOG.md
!LICENSE
```

### eslint.config.js

```javascript
module.exports = [
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        // Node globals
        require: 'readonly',
        module: 'readonly',
        exports: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        setInterval: 'readonly',
        clearTimeout: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly'
      }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'semi': ['error', 'always'],
      'quotes': ['error', 'single']
    }
  }
];
```

### GitHub Actions CI

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          
      - run: npm ci
      - run: npm test
      - run: npm run lint
      
      - name: Upload coverage
        if: matrix.node-version == '20.x'
        uses: codecov/codecov-action@v3
```

---

## 📂 标准目录结构参考

```
<project-name>/
├── .github/                    # GitHub 配置
│   ├── workflows/              # CI/CD
│   │   └── ci.yml
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── lib/                        # 源代码（CommonJS）
│   ├── index.js                # 主入口
│   └── [modules]/              # 功能模块
│
├── types/                      # TypeScript 类型定义
│   └── [modules].d.ts
│
├── test/                       # 测试文件
│   ├── unit/                   # 单元测试
│   ├── integration/            # 集成测试
│   └── run-tests.js            # 测试运行器
│
├── docs/                       # 详细文档
│   ├── INDEX.md                # 文档索引
│   ├── getting-started.md      # 快速开始
│   ├── api/                    # API 文档
│   └── guides/                 # 使用指南
│
├── examples/                   # 示例代码
│   ├── basic/
│   └── advanced/
│
├── scripts/                    # 构建/发布脚本
│   └── release.js
│
├── changelogs/                 # 版本变更详情
│   └── v1.0.0.md
│
├── plans/                      # 开发计划（可选）
│   └── roadmap.md
│
├── coverage/                   # 测试覆盖率报告（gitignore）
│
├── index.js                    # CommonJS 入口（或 lib/index.js）
├── index.mjs                   # ESM 入口
├── index.d.ts                  # 主类型定义
│
├── package.json                # 项目配置
├── package-lock.json
├── tsconfig.json               # TypeScript 配置（如需要）
├── eslint.config.js            # ESLint 配置
├── .gitignore
├── .npmignore                  # NPM 发布忽略
├── .npmrc                      # NPM 配置
│
├── README.md                   # 项目说明（核心）
├── CHANGELOG.md                # 变更日志
├── CONTRIBUTING.md             # 贡献指南
├── SECURITY.md                 # 安全政策
├── STATUS.md                   # 需求状态追踪
├── LICENSE                     # 许可证
└── codecov.yml                 # 代码覆盖率配置
```

---

## ✅ 完成检查清单

### 必须项 ✅

- [ ] package.json 完整配置
- [ ] README.md 包含安装和基础用法
- [ ] LICENSE 文件（MIT）
- [ ] .gitignore 配置
- [ ] lib/ 源代码目录
- [ ] 至少 1 个测试文件
- [ ] IMPLEMENTATION-PLAN.md 已生成且全部 ✅

### 推荐项 ⭐

- [ ] TypeScript 类型定义
- [ ] ESM 支持（index.mjs）
- [ ] CONTRIBUTING.md
- [ ] CHANGELOG.md
- [ ] GitHub Actions CI
- [ ] 测试覆盖率 ≥70%
- [ ] docs/ 详细文档

### 可选项 📋

- [ ] STATUS.md 需求追踪
- [ ] SECURITY.md 安全政策
- [ ] examples/ 示例代码
- [ ] changelogs/ 版本详情
- [ ] codecov.yml 覆盖率配置

---

## 📎 相关文档

- [需求开发工作流](../01-requirement-dev/README.md) — CP1/CP2/CP3 确认点机制
- [确认点机制](../common/confirmation-points.md) — CP 详细定义
- [会话报告规范](../common/temp-reports.md) — 报告命名与存储
- [任务记忆机制](../common/task-memory.md) — 记忆写入规则
- [IMPLEMENTATION-PLAN 规则](../01-requirement-dev/README.md) — §阶段 3 IMPLEMENTATION-PLAN 强制生成规则
- [npm 发布指南](https://docs.npmjs.com/packages-and-modules)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript 声明文件](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

---

**最后更新**: 2026-03-04