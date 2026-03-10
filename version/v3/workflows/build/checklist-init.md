# 项目初始化 Checklist

> `build` 工作流的场景变体（`RULES.md §10` dev 子类型：项目初始化）。
> 当 N04 意图识别将任务判定为 `dev > 项目初始化` 时，由路由表自动加载本 checklist，
> 叠加到 `build/README.md` 默认流程上执行。CP1→CP2→CP3 不变，每个阶段增加初始化专属步骤。

**版本**: v3.0.0
**最后更新**: 2026-03-10

---

## 适用场景

> 🔴 本 checklist 的加载由 `RULES.md §2` 意图识别系统驱动，**不依赖关键词匹配**。
> AI 基于语义理解判断用户需求属于"项目初始化"二级分类后，自动叠加本 checklist。

**典型场景示例**（仅供理解，非穷举触发词）：

| 场景 | 用户消息示例 |
|------|------------|
| 新项目创建 | "创建一个新的 Node.js 项目" |
| 脚手架搭建 | "搭建项目脚手架" |
| 从零开始构建 | "从零开始搭建一个 API 服务" |
| 开源包初始化 | "创建一个开源 npm 包" |
| Monorepo 搭建 | "搭建一个 monorepo 项目" |

---

## 核心原则

```text
🔴 项目初始化原则：骨架先行 → 核心源码 → 测试 → 文档 → 工程配置
```

| 原则 | 说明 |
|------|------|
| 批次化创建 | 按依赖顺序分批次创建文件，每批次完成后写入编码检查点 |
| 约定优于配置 | 优先采用社区约定的目录结构和配置方式 |
| 最小可运行 | 初始版本只包含核心功能，后续迭代增加特性 |
| 文档先行 | README / CHANGELOG / LICENSE 等文档在初始化时就创建 |
| 工程完整性 | lint · test · CI/CD 等工程化配置一步到位 |

---

## 阶段叠加规则

### 阶段1 — 需求理解（叠加：项目定位 + 技术选型）

在默认步骤 1.1~1.5 之后，追加：

| 步骤 | 执行内容 | 产出 |
|:----:|---------|------|
| 1.6 | 确定项目定位（应用 / 库 / CLI 工具 / 框架 / 插件） | 项目类型 |
| 1.7 | 确定目标运行环境（Node.js / 浏览器 / 通用 / Deno / Bun） | 运行环境 |
| 1.8 | 确定模块系统（ESM / CJS / 双模式） | 模块规格 |
| 1.9 | 确定是否需要 TypeScript | TS/JS 选择 |
| 1.10 | 确定包管理器（npm / pnpm / yarn） | 包管理器 |
| 1.11 | 确定许可证类型（MIT / Apache-2.0 / ISC / ...） | 许可证 |
| 1.12 | 确定发布目标（npm / 私有仓库 / 不发布） | 发布渠道 |

**CP1 追加输出：**

```text
📦 项目定位:
  类型: [应用 / 库 / CLI / 框架 / 插件]
  名称: [包名 / 项目名]
  描述: [一句话描述]
  运行环境: [Node.js >=XX / 浏览器 / 通用]
  模块系统: [ESM / CJS / 双模式]
  语言: [TypeScript / JavaScript]
  包管理器: [npm / pnpm / yarn]
  许可证: [MIT / Apache-2.0 / ...]
  发布目标: [npm / 私有 / 不发布]
```

### 阶段2 — 技术方案（叠加：目录结构设计 + 文件创建计划）

在默认步骤 2.1~2.5 之后，追加：

| 步骤 | 执行内容 | 产出 |
|:----:|---------|------|
| 2.6 | 设计目录结构（参考下方标准结构） | 目录树 |
| 2.7 | 确定核心依赖（生产依赖 + 开发依赖） | 依赖清单 |
| 2.8 | 确定 CI/CD 配置（GitHub Actions / GitLab CI / 无） | CI 方案 |
| 2.9 | 确定代码规范工具（ESLint / Prettier / Biome / 无） | lint 方案 |
| 2.10 | 确定测试框架（vitest / jest / mocha+nyc / node:test / 无） | 测试方案 |
| 2.11 | 列出完整的文件创建清单（按批次分组） | 文件清单 |

**CP2 追加输出：**

```text
📂 目录结构:
  [完整目录树]

📋 文件创建清单（按批次）:
  批次1 — 项目骨架: [package.json, .gitignore, .npmignore, LICENSE]
  批次2 — 核心源码: [lib/*.js, index.d.ts, ...]
  批次3 — 测试: [test/*.test.js, ...]
  批次4 — 文档体系: [README.md, CHANGELOG.md, CONTRIBUTING.md, ...]
  批次5 — 工程配置: [eslint.config.js, .github/workflows/ci.yml, ...]

📦 依赖清单:
  生产依赖: [列出]
  开发依赖: [列出]
```

### 阶段3 — 代码实现（叠加：批次化创建 + 批次检查点）

项目初始化的代码实现阶段按以下批次顺序执行（对应 IMPLEMENTATION-PLAN 中的任务编号）：

#### 批次 1 — 项目骨架

| 文件 | 说明 |
|------|------|
| `package.json` | 包元信息 · scripts · 依赖 · exports |
| `.gitignore` | Git 忽略规则 |
| `.npmignore`（如发布 npm） | npm 发布忽略规则 |
| `LICENSE` | 许可证全文 |

> 完成后 → 更新 IMPL-PLAN 状态 + 📦 编码检查点

#### 批次 2 — 核心源码

| 文件 | 说明 |
|------|------|
| `lib/index.js`（或 `src/index.ts`） | 主入口 · 核心逻辑骨架 |
| `lib/index.mjs`（如双模式） | ESM 入口 |
| `index.d.ts`（如 JS 项目提供类型） | TypeScript 类型定义 |

> 完成后 → 更新 IMPL-PLAN 状态 + 📦 编码检查点

#### 批次 3 — 测试

| 文件 | 说明 |
|------|------|
| `test/*.test.js` | 核心功能测试 |
| 测试配置（如需要） | vitest.config.ts / jest.config.js 等 |

> 完成后 → 更新 IMPL-PLAN 状态 + 📦 编码检查点

#### 批次 4 — 文档体系

| 文件 | 说明 |
|------|------|
| `README.md` | 项目说明 · 安装 · 快速开始 · API · 贡献 · 许可证 |
| `CHANGELOG.md` | 变更日志（初始版本条目） |
| `CONTRIBUTING.md`（推荐） | 贡献指南 · 开发环境 · 提交规范 · PR 流程 |
| `SECURITY.md`（推荐） | 安全策略 · 报告安全问题 |

> 完成后 → 更新 IMPL-PLAN 状态 + 📦 编码检查点

#### 批次 5 — 工程配置

| 文件 | 说明 |
|------|------|
| `eslint.config.js`（或等效） | 代码规范配置 |
| `.github/workflows/ci.yml`（如使用 GitHub） | CI 流水线 |
| `.editorconfig`（推荐） | 编辑器统一配置 |
| `.nvmrc`（推荐） | Node.js 版本锁定 |

> 完成后 → 更新 IMPL-PLAN 状态 + 📦 编码检查点

**🔴 批次规则：**

| 规则 | 说明 |
|------|------|
| 按依赖顺序 | 批次1→2→3→4→5 严格顺序，后批次可能依赖前批次 |
| 每批次检查点 | 每个批次完成后必须写入编码检查点（约束 #9） |
| 每批次诊断 | 每个批次完成后运行 `diagnostics`（约束 #19） |
| 状态同步 | 每个批次完成后更新 IMPL-PLAN 中对应任务状态 |

### 阶段4 — 产物交付（叠加：发布准备 + 完整性验证）

在默认交付步骤之上，追加：

| 步骤 | 执行内容 | 产出 |
|:----:|---------|------|
| 4.X+1 | 验证 `npm pack --dry-run` 的文件列表是否正确（如发布 npm） | 发布文件检查 |
| 4.X+2 | 验证 README 中的安装命令和快速开始示例可运行 | 文档验证 |
| 4.X+3 | 生成项目创建汇总（文件清单 + 依赖清单 + 脚本清单） | 创建汇总 |

---

## 标准目录结构参考

### Node.js 库（npm 包）

```text
<project>/
├── lib/                    # 源代码
│   ├── index.js            # CJS 主入口
│   └── index.mjs           # ESM 入口（双模式时）
├── test/                   # 测试文件
│   └── index.test.js
├── .github/                # GitHub 配置
│   └── workflows/
│       └── ci.yml          # CI 流水线
├── .gitignore
├── .npmignore
├── .editorconfig
├── .nvmrc
├── CHANGELOG.md
├── CONTRIBUTING.md
├── LICENSE
├── README.md
├── SECURITY.md
├── eslint.config.js
├── index.d.ts              # TypeScript 类型定义
└── package.json
```

### Node.js 应用

```text
<project>/
├── src/                    # 源代码
│   ├── app.js              # 应用入口
│   ├── config/             # 配置
│   ├── routes/             # 路由
│   ├── services/           # 业务逻辑
│   ├── models/             # 数据模型
│   └── utils/              # 工具函数
├── test/                   # 测试文件
├── docs/                   # 文档
├── scripts/                # 构建/部署脚本
├── .env.example            # 环境变量模板
├── .gitignore
├── CHANGELOG.md
├── LICENSE
├── README.md
├── eslint.config.js
└── package.json
```

### TypeScript 项目

```text
<project>/
├── src/                    # TypeScript 源码
│   ├── index.ts            # 主入口
│   └── types.ts            # 类型定义
├── dist/                   # 编译输出（gitignore）
├── test/                   # 测试文件
│   └── index.test.ts
├── .gitignore
├── .npmignore
├── CHANGELOG.md
├── LICENSE
├── README.md
├── eslint.config.js
├── package.json
└── tsconfig.json
```

---

## 核心文件要点

### package.json

| 字段 | 说明 | 必须 |
|------|------|:----:|
| `name` | 包名（npm 需要 scope 或唯一名） | ✅ |
| `version` | 初始版本 `0.1.0`（未发布）或 `1.0.0`（首发） | ✅ |
| `description` | 一句话描述 | ✅ |
| `main` | CJS 入口 | ✅ |
| `module` | ESM 入口（双模式时） | 🟡 |
| `exports` | 条件导出映射（现代 Node.js 推荐） | 🟡 |
| `types` | TypeScript 类型入口 | 🟡 |
| `files` | npm 发布包含的文件列表 | ✅ |
| `scripts` | test · lint · build 等脚本 | ✅ |
| `engines` | Node.js 版本要求 | 🟡 |
| `license` | 许可证标识 | ✅ |
| `repository` | 仓库地址 | 🟡 |
| `keywords` | 搜索关键词 | 🟡 |

**exports 字段示例（双模式）：**

```json
{
  "exports": {
    ".": {
      "require": "./lib/index.js",
      "import": "./lib/index.mjs",
      "types": "./index.d.ts"
    },
    "./package.json": "./package.json"
  }
}
```

### README.md 结构

| 章节 | 内容 | 必须 |
|------|------|:----:|
| 项目名 + 徽章 | 名称 · 版本 · CI 状态 · 许可证 · 覆盖率 | ✅ |
| 一句话描述 | 项目做什么 | ✅ |
| 目录 | 章节导航（长文档时） | 🟡 |
| 安装 | `npm install <包名>` | ✅ |
| 快速开始 | 最小可运行示例代码 | ✅ |
| 核心特性 | 功能列表 | ✅ |
| API 文档 | 主要 API 说明 | ✅ |
| 贡献指南 | 指向 CONTRIBUTING.md | 🟡 |
| 许可证 | 许可证类型 + 链接 | ✅ |

### .gitignore 基础内容

```text
node_modules/
dist/
coverage/
.nyc_output/
*.log
.env
.env.local
.DS_Store
Thumbs.db
```

---

## 归档文档补充

除 build 默认归档文档（01-需求定义 / 02-技术方案 / 03-实施方案 / IMPL-PLAN）外，
项目初始化任务的归档文档应在相应文件中包含以下专属内容：

| 归属文件 | 追加内容 |
|---------|---------|
| `01-需求定义.md` | 项目定位 + 技术选型 + 运行环境 + 模块系统 |
| `02-技术方案.md` | 目录结构设计 + 依赖清单 + CI/CD 方案 + lint 方案 + 测试方案 |
| 报告文件 | 文件创建汇总 + 验证结果 + 后续建议 |

---

## 项目初始化专属验证清单

在 N13 合规自检阶段，叠加以下检查：

### 必须项 ✅

| # | 检查项 | 通过标准 |
|:-:|--------|---------|
| P1 | package.json 完整 | name · version · description · main · scripts · license 齐全 |
| P2 | 入口文件存在 | main 指向的文件存在且可 require/import |
| P3 | .gitignore 存在 | node_modules/ 等必要规则已包含 |
| P4 | LICENSE 存在 | 许可证全文已写入，类型与 package.json 一致 |
| P5 | README.md 存在 | 包含安装 · 快速开始 · 核心特性 · API · 许可证 |
| P6 | 测试可运行 | `npm test` 可执行且通过 |
| P7 | 批次检查点完整 | 5 个批次的编码检查点均已写入记忆 |
| P8 | IMPL-PLAN 终态 | 所有任务状态已更新为 ✅ |

### 推荐项 ⭐

| # | 检查项 | 通过标准 |
|:-:|--------|---------|
| P9 | TypeScript 类型 | JS 项目有 index.d.ts · TS 项目有 tsconfig.json |
| P10 | ESM 支持 | exports 字段正确配置 · .mjs 入口存在（如双模式） |
| P11 | CI 配置 | GitHub Actions / GitLab CI 配置存在且正确 |
| P12 | lint 配置 | ESLint / 等效工具配置存在 |
| P13 | CHANGELOG.md | 初始版本条目已写入 |
| P14 | CONTRIBUTING.md | 贡献指南存在（开源项目） |

### 可选项 📋

| # | 检查项 | 通过标准 |
|:-:|--------|---------|
| P15 | SECURITY.md | 安全策略文件存在（开源项目） |
| P16 | .editorconfig | 编辑器配置存在 |
| P17 | .nvmrc | Node.js 版本锁定 |
| P18 | .npmignore | npm 发布忽略规则（发布 npm 时） |
| P19 | npm pack 验证 | `npm pack --dry-run` 文件列表正确 |

---

## 报告追加章节

项目初始化类任务的报告（使用 `templates/report-build.md`）追加以下章节：

| 章节 | 内容 |
|------|------|
| 项目定位 | 类型 + 运行环境 + 模块系统 + 语言 + 发布目标 |
| 技术选型 | 依赖清单 + 工具链选择理由 |
| 创建汇总 | 按批次列出所有创建的文件（路径 + 说明 + 状态） |
| 验证结果 | 必须项/推荐项/可选项检查结果 |
| 后续建议 | 功能开发优先级 · 文档完善方向 · CI/CD 增强建议 |

---

## 与默认 build 流程的差异

| 对比项 | 默认 build | 项目初始化（本 checklist） |
|--------|----------|------------------------|
| CP 流程 | CP1 → CP2 → CP3 | CP1 → CP2 → CP3（不变） |
| 阶段1 重点 | 需求范围 · 约束识别 | 项目定位 · 技术选型 · 模块系统 |
| 阶段2 重点 | 技术方案 · 修改清单 | 目录结构设计 · 批次化文件清单 |
| 阶段3 特点 | 按 IMPL-PLAN 逐文件执行 | 按 5 批次顺序创建，每批次有检查点 |
| 阶段4 特点 | 测试 + 文档 + 归档 | 测试 + 文档 + 发布验证 + 创建汇总 |
| 文件创建量 | 通常修改为主 | 大量新建（10~20+ 文件） |
| 编码检查点 | 每 3 文件或每任务 | 每批次 1 个（共 5 个） |

---

## 相关文档

- `workflows/build/README.md` — 父工作流（build 默认流程）
- `RULES.md§10` — 工作流路由表（dev 子类型：项目初始化）
- `RULES.md§4` — 核心约束（#9 编码检查点 · #19 编码后诊断）
- `RULES.md§5` — 记忆规则（编码检查点写入格式）
- `templates/report-build.md` — 开发报告模板

---

> **版本历史**: v3.0.0 (2026-03-10) — 从 v2 `core/workflows/09-opensource-init/` 重写为 build 变体 checklist