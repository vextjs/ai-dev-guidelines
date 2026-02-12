# 开源项目初始化规范

> **任务类型**: 开源项目初始化  
> **使用场景**: 创建新的开源 NPM 包/模块项目  
> **参考项目**: monSQLize, rate-limit, schema-dsl, jrpc  
> **输出目录**: 新项目根目录

---

## 📋 流程概览

```
需求定义 → 项目结构 → 核心文件 → 文档体系 → 工程配置 → 发布准备
```

---

## 🎯 执行步骤

### Step 1: 需求定义

**目标**: 明确项目定位和核心功能

**输出**:
```yaml
项目信息:
  名称: [项目名，如 my-awesome-lib]
  定位: [一句话描述]
  目标用户: [谁会使用]
  核心功能: 
    - [功能1]
    - [功能2]
  技术栈:
    语言: [JavaScript/TypeScript]
    运行环境: [Node.js 版本要求]
    依赖: [核心依赖]
```

---

### Step 2: 项目结构初始化

**标准目录结构**:

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

### Step 3: 创建核心文件

#### 3.1 package.json

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

#### 3.2 index.d.ts（类型定义模板）

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

#### 3.3 index.mjs（ESM 入口）

```javascript
// ESM wrapper
export * from './lib/index.js';
export { default } from './lib/index.js';
```

---

### Step 4: 创建文档体系

#### 4.1 README.md 结构

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
- [兼容性](#兼容��)
- [贡献指南](#贡献指南)
- [许可证](#许可证)

---

## 安装

\`\`\`bash
npm install <package-name>
\`\`\`

## 快速开始

\`\`\`javascript
const lib = require('<package-name>');

// 基础用法
const result = lib.doSomething();
\`\`\`

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

#### 4.2 CONTRIBUTING.md 模板

```markdown
# 贡献指南

感谢您对本项目的兴趣！

## 开发环境

\`\`\`bash
git clone <repo>
cd <project>
npm ci
npm test
\`\`\`

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

#### 4.3 SECURITY.md 模板

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

#### 4.4 STATUS.md 模板

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

### Step 5: 工程配置

#### 5.1 .gitignore

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

#### 5.2 .npmignore

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

#### 5.3 eslint.config.js

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

#### 5.4 GitHub Actions CI

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

### Step 6: 发布准备

**发布前检查清单**:

- [ ] package.json 版本号正确
- [ ] README.md 完整（安装、使用、API）
- [ ] CHANGELOG.md 已更新
- [ ] 所有测试通过
- [ ] 覆盖率达标（建议 ≥70%）
- [ ] TypeScript 类型定义完整
- [ ] ESM/CJS 双支持
- [ ] .npmignore 配置正确
- [ ] LICENSE 文件存在
- [ ] npm publish --dry-run 检查

**发布命令**:

```bash
# 检查将发布的文件
npm publish --dry-run

# 正式发布
npm publish
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

- [npm 发布指南](https://docs.npmjs.com/packages-and-modules)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [TypeScript 声明文件](https://www.typescriptlang.org/docs/handbook/declaration-files/introduction.html)

---

**版本**: v1.0  
**最后更新**: 2026-02-12  
**参考项目**: monSQLize, rate-limit, schema-dsl

