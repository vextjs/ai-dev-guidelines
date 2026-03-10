# 开源项目初始化模板

> 用于快速创建开源 NPM 包项目的模板集合

---

## 📁 模板文件

| 模板 | 用途 | 必须 |
|-----|------|------|
| [package-template.json](#package-json) | package.json 模板 | ✅ |
| [readme-template.md](#readme) | README.md 模板 | ✅ |
| [contributing-template.md](#contributing) | 贡献指南模板 | ⭐ |
| [changelog-template.md](#changelog) | 变更日志模板 | ⭐ |
| [status-template.md](#status) | 需求追踪模板 | 📋 |

---

## package.json

```json
{
  "name": "{{PACKAGE_NAME}}",
  "version": "1.0.0",
  "description": "{{DESCRIPTION}}",
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
  "keywords": [{{KEYWORDS}}],
  "author": "{{AUTHOR}}",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/{{ORG}}/{{REPO}}.git"
  },
  "bugs": {
    "url": "https://github.com/{{ORG}}/{{REPO}}/issues"
  },
  "homepage": "https://github.com/{{ORG}}/{{REPO}}#readme",
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
  },
  "dependencies": {}
}
```

**占位符说明**:

| 占位符 | 说明 | 示例 |
|-------|------|------|
| `{{PACKAGE_NAME}}` | npm 包名 | `my-awesome-lib` |
| `{{DESCRIPTION}}` | 一句话描述 | `A lightweight utility library` |
| `{{KEYWORDS}}` | 关键词数组 | `"utility", "helper"` |
| `{{AUTHOR}}` | 作者信息 | `Your Name <email@example.com>` |
| `{{ORG}}` | GitHub 组织/用户名 | `your-org` |
| `{{REPO}}` | 仓库名 | `my-awesome-lib` |

---

## README

```markdown
<div align="center">

# 🚀 {{PROJECT_NAME}}

### {{TAGLINE}}

[![npm version](https://img.shields.io/npm/v/{{PACKAGE_NAME}}.svg)](https://www.npmjs.com/package/{{PACKAGE_NAME}})
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](./index.d.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-16%2B-brightgreen)](https://nodejs.org/)

\`\`\`bash
npm install {{PACKAGE_NAME}}
\`\`\`

[快速开始](#-快速开始) · [核心特性](#-核心特性) · [API 文档](./docs/INDEX.md)

</div>

---

## 📑 目录

- [安装](#-安装)
- [快速开始](#-快速开始)
- [核心特性](#-核心特性)
- [API 文档](#-api-文档)
- [兼容性](#-兼容性)
- [贡献指南](#-贡献指南)
- [许可证](#-许可证)

---

## 📦 安装

\`\`\`bash
npm install {{PACKAGE_NAME}}
\`\`\`

---

## 🚀 快速开始

\`\`\`javascript
const lib = require('{{PACKAGE_NAME}}');

// 基础用法示例
const result = lib.doSomething({
  option1: 'value1'
});

console.log(result);
\`\`\`

---

## 🌟 核心特性

| 特性 | 说明 |
|-----|------|
| ⚡ **特性1** | 描述特性1的价值 |
| 🔧 **特性2** | 描述特性2的价值 |
| 🛡️ **特性3** | 描述特性3的价值 |

---

## 📖 API 文档

### 主要方法

#### `lib.doSomething(options)`

描述这个方法的作用。

**参数**:

| 参数 | 类型 | 必须 | 描述 |
|-----|------|------|------|
| `options.option1` | `string` | 是 | 选项1说明 |
| `options.option2` | `number` | 否 | 选项2说明，默认 `10` |

**返回值**: `Result` 对象

**示例**:

\`\`\`javascript
const result = lib.doSomething({
  option1: 'hello',
  option2: 20
});
\`\`\`

完整 API 文档详见 [docs/INDEX.md](./docs/INDEX.md)

---

## 🌍 兼容性

| 环境 | 版本要求 |
|-----|---------|
| Node.js | >= 16.0.0 |
| TypeScript | >= 4.5 |

---

## 🤝 贡献指南

欢迎贡献！详见 [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## 📄 许可证

[MIT License](./LICENSE)

---

## 💬 社区与支持

- 📝 [Issues](https://github.com/{{ORG}}/{{REPO}}/issues) - 报告 Bug 或提出建议
- 🌟 如果有帮助，请给个 Star！
```

---

## CONTRIBUTING

```markdown
# ��献指南

感谢您对 {{PROJECT_NAME}} 项目的兴趣！

## 📋 开发环境

### 1. 克隆项目

\`\`\`bash
git clone https://github.com/{{ORG}}/{{REPO}}.git
cd {{REPO}}
\`\`\`

### 2. 安装依赖

\`\`\`bash
npm ci
\`\`\`

### 3. 运行测试

\`\`\`bash
npm test
npm run lint
\`\`\`

## 📝 提交规范

使用 [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: 新功能`
- `fix: Bug 修复`
- `docs: 文档更新`
- `test: 测试相关`
- `refactor: 代码重构`
- `perf: 性能优化`
- `ci: CI/CD 相关`

## 🔄 Pull Request 流程

1. Fork 项目
2. 创建分支: `git checkout -b feature/your-feature`
3. 提交更改: `git commit -m "feat: 添加某功能"`
4. 推送分支: `git push origin feature/your-feature`
5. 创建 Pull Request

## ✅ 检查清单

提交 PR 前请确认:

- [ ] 所有测试通过 (`npm test`)
- [ ] Lint 检查通过 (`npm run lint`)
- [ ] 更新了相关文档
- [ ] 添加了必要的测试

感谢您的贡献！
```

---

## CHANGELOG

```markdown
# 变更日志

所有重要变更都会记录在此文件中。

格式基于 [Keep a Changelog](https://keepachangelog.com/)，
版本号遵循 [Semantic Versioning](https://semver.org/)。

---

## [Unreleased]

### Added
- 待添加的新功能

### Changed
- 待修改的内容

### Fixed
- 待修复的问题

---

## [1.0.0] - YYYY-MM-DD

### Added
- 🎉 首次发布
- 功能1
- 功能2

---

[Unreleased]: https://github.com/{{ORG}}/{{REPO}}/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/{{ORG}}/{{REPO}}/releases/tag/v1.0.0
```

---

## STATUS

```markdown
# 需求状态追踪

> **最后更新**: YYYY-MM-DD

## 📑 目录

- [发布计划](#发布计划)
- [v1.0.0](#v100)

---

## 发布计划

| 版本 | 状态 | 发布日期 | 需求数 | 进度 |
|------|------|---------|--------|------|
| v1.0.0 | 🔄 开发中 | - | X | 0/X |

---

## v1.0.0

**主题**: 首次发布  
**目标日期**: YYYY-MM-DD  
**进度**: 0/X

### 需求列表

| # | 需求 | 状态 | 优先级 |
|---|------|------|-------|
| 1 | 核心功能1 | ⬜ 待开发 | P0 |
| 2 | 核心功能2 | ⬜ 待开发 | P0 |
| 3 | 文档完善 | ⬜ 待开发 | P1 |

### 状态说明

| 状态 | 说明 |
|------|------|
| ⬜ 待开发 | 未开始 |
| 🔄 开发中 | 正在开发 |
| ✅ 已完成 | 开发完成 |
| 🔍 测试中 | 正在测试 |
```

---

**最后更新**: 2026-02-12

