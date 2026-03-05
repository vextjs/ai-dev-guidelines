# Dev-Docs - AI 开发执行手册

> **版本**: v2.12.0  
> **最后更新**: 2026-03-05  
> **核心定位**: AI 工作操作系统 — 给 AI Agent 完整的工程任务执行框架
> 
> **目标用户**: AI Agent（GitHub Copilot / Claude / GPT）
> 
> **核心价值**: 全流程标准化 + 持久化记忆 + 多 Agent 协同 + 规范自修复

---

## 🎯 执行模式

### 快速模式 (默认)

| 项目 | 说明 |
|-----|------|
| 适用场景 | 简单需求、小改动、快速迭代 |
| 流程步骤 | 5 个阶段 |
| 输出文档 | 精简版（使用 `core/templates/lite/`） |
| 预计时间 | 15-30 分钟 |

### 完整模式

| 项目 | 说明 |
|-----|------|
| 适用场景 | 复杂需求、核心功能、正式交付 |
| 流程步骤 | 7 个阶段 |
| 输出文档 | 完整版（使用 `core/templates/core/`） |
| 预计时间 | 45-90 分钟 |

**模式切换**: 
- 默认使用快速模式
- 用户说"需要完整文档"、"详细"时切换到完整模式
- 用户说"只要代码"时跳过文档生成

---

## 🤖 AI 使用说明

### 当你（AI）收到用户请求时：

1. **预检查** - 执行 5 项必做检查（工作区、任务类型、输出位置、Agent 标识、上次记忆）
2. **评估合理性** - 有更好建议先提出，确认后再执行
3. **识别任务类型** - 判断属于哪种开发场景
4. **读取对应流程** - 从 `core/workflows/` 目录找到执行流程
5. **按步骤执行** - 严格按照流程定义的步骤操作
6. **关联文件检查** - 修改文件时自动扫描关联文件并同步
7. **验证完成度** - 对照检查清单确认任务完成

### 支持的任务类型（按优先级）

#### Tier 1: 核心场景（80% 的日常工作）
- 🎯 **需求开发** - 新功能开发（含系统对接场景）
- 🐛 **Bug 修复** - 问题定位、修复、验证
- ⚡ **性能优化** - 性能分析和优化实施

#### Tier 2: 扩展场景（20% 的特殊工作）
- 📋 **技术调研** - 技术选型、方案对比、POC 验证
- 🔧 **架构重构** - 大型代码重构、架构升级
- 🗄️ **数据库变更** - Schema 变更、数据迁移
- 🔒 **安全修复** - 漏洞修复、安全加固
- 🔥 **事故复盘** - 生产故障分析、改进措施

#### Tier 3: 专项场景
- 🚀 **开源项目初始化** - 创建开源 NPM 包项目（脚手架生成）
- 🔍 **深度分析** - 深度分析、审查、评估类任务
- 🏥 **规范自我审查** - 规范体系 15 维度全量深度自审

> **注意**: 系统对接不是独立任务类型，它是需求开发的一个子场景。当需求涉及第三方系统时，工作流会包含对接步骤。

---

## 📖 核心概念

### 什么是"工作流"（Workflow）？
- **定义**: AI 执行某类任务的标准化步骤序列
- **位置**: `core/workflows/<task-type>.md`
- **内容**: 步骤、工具、输出格式、验证标准
- **用途**: AI 的执行清单

### 什么是"模板"（Template）？
- **定义**: 文档的结构化框架
- **位置**: `core/templates/<task-type>-template.md`
- **内容**: 章节结构、必填字段、示例内容
- **用途**: AI 生成文档的骨架

### 什么是"输出"（Output）？
- **定义**: AI 执行任务后生成的文档
- **位置**: `projects/<project-name>/<task-type>/<task-id>/`
- **内容**: 基于模板填充的完整文档
- **用途**: 任务的永久记录

---

## 📂 项目结构（AI 视角）

```
ai-dev-guidelines/
├── README.md                          # 项目总说明（简洁入口）
├── CHANGELOG.md                       # 📜 版本变更索引
│
├── core/                              # 🤖 AI 规范内核（你正在阅读的文件所在目录）
│   ├── README.md                     # 👈 你正在阅读的文件（AI 入口）
│   ├── QUICK-REFERENCE.md            # 📖 速查手册（推荐首先阅读）
│   ├── CONSTRAINTS.md                # ⛔ 约束清单（21 条）
│   ├── STATUS.md                     # 📊 项目状态追踪
│   ├── META.yaml                     # 元数据（版本、约束条数）
│   ├── workflows/                    # 🤖 AI 执行流程（通用）
│   │   ├── 00-pre-check/            # 预检查（5 项必做）
│   │   ├── 00-task-identification/  # 步骤0: 识别任务类型
│   │   ├── 01-requirement-dev/      # 流程1: 需求开发
│   │   ├── 02-bug-fix/              # 流程2: Bug 修复
│   │   ├── 03-optimization/         # 流程3: 性能优化
│   │   ├── 04~08/                   # 调研/重构/数据库/安全/事故
│   │   ├── 09-opensource-init/      # 专项: 开源项目初始化
│   │   ├── 10-analysis/             # 流程10: 深度分析
│   │   ├── common/                  # 通用组件（确认点、断点续传等）
│   │   └── decision-tree.yaml       # 决策树配置
│   ├── standards/                    # 📏 开发规范（9 个文件）
│   ├── templates/                    # 📝 文档模板（lite/core/extended/common）
│   ├── best-practices/               # ⚡ 最佳实践和高级场景
│   ├── self-fix/                     # 🔧 规范自我修复机制
│   ├── tools/                        # 🔧 工具脚本（7 个）
│   └── examples/                     # 📚 完整示例（供 AI 学习）
│
├── docs/                              # 📖 用户视角文档（纯人类阅读）
│   ├── getting-started.md            # 5 分钟快速入门
│   ├── DESIGN-PHILOSOPHY.md          # 设计理念与架构哲学
│   ├── execution-workflow-guide/     # AI 执行流程指南
│   └── spec-self-fix-guide/          # 规范自修复机制指南
│
├── projects/                          # 🗂️ 项目特定规范（关键）
│   ├── _template/                    # 项目规范模板
│   ├── chat/                         # chat 项目
│   ├── dev-docs/                     # 本项目规范（ai-dev-guidelines）
│   ├── monSQLize/                    # 轻量级 MongoDB ORM
│   ├── user-service/                 # 用户服务项目（示例）
│   └── vext/                         # vext 项目
│
└── changelogs/                        # 📜 版本变更详情（v1.0~v2.11）
```

### 🎯 目录说明（AI 必读）

| 目录 | 用途 | AI 使用频率 |
|------|------|------------|
| `projects/` | **项目规范+输出** - 特定项目的技术约束、规范和文档输出 | ⭐⭐⭐⭐⭐ 每次必读+写入 |
| `core/workflows/` | **执行步骤** - AI 按此执行任务（通用流程） | ⭐⭐⭐⭐⭐ 每次必读 |
| `core/templates/` | **文档骨架** - AI 生成文档的基础 | ⭐⭐⭐⭐ 生成文档时读 |
| `core/self-fix/` | **规范自维护** - 检测和修复规范问题 | ⭐⭐⭐⭐ 用户抱怨/定期检查时 |
| `core/tools/` | **工具手册** - AI 可用的工具和使用方法 | ⭐⭐⭐ 需要时查阅 |
| `core/examples/` | **学习材料** - AI 参考的完整示例 | ⭐⭐ 不确定时学习 |
| `core/best-practices/` | **高级场景** - 边界处理、优化策略 | ⭐⭐ 遇到复杂问题时 |

---


## 📝 文档命名规范

### 项目命名
- 使用项目实际名称（小写字母+连字符）
- 示例: `user-service`, `payment-gateway`, `chat-system`

### 功能/需求命名
- 格式: `<中文描述>`（FIX-011 2026-02-28）
- 示例: `用户限流功能`、`退款功能集成`

### Bug 命名
- 格式: `BUG-<project>-<id>-<description>`
- 示例: `BUG-user-001-login-timeout`

### 调研命名
- 格式: `RES-<topic>-<YYYYMMDD>`
- 示例: `RES-cache-selection-20260211`

### 重构命名
- 格式: `REF-<project>-<module>-<YYYYMMDD>`
- 示例: `REF-user-auth-20260211`

### 事故命名
- 格式: `INC-<YYYYMMDD>-<severity>-<brief-desc>`
- 示例: `INC-20260211-P0-database-outage`

### 优化命名
- 格式: `OPT-<project>-<area>-<id>`
- 示例: `OPT-payment-db-001`

---

## 🚀 快速参考

> 以下内容已整合到独立文件，避免重复维护：

| 内容 | 位置 | 说明 |
|------|------|------|
| 预检查格式、任务映射、确认点、输出路径 | [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) | ⭐ 执行任务时首先阅读 |
| 设计理念与演进路线 | [docs/DESIGN-PHILOSOPHY.md](../docs/DESIGN-PHILOSOPHY.md) | 🆕 架构哲学 + Agent 化路线图 |
| 用户快速入门（首次使用必读） | [docs/getting-started.md](../docs/getting-started.md) | 🆕 5 分钟了解全貌 + 新项目接入 + 工具速览 |
| 用户指南（执行流程 + 自修复机制） | [docs/README.md](../docs/README.md) | 🆕 面向用户视角的完整指南入口 |
| 工作流清单、Tier 分级 | [core/workflows/README.md](./workflows/README.md) | 各类任务的执行流程 |
| 模板选择指南 | [core/templates/README.md](./templates/README.md) | 快速/完整模式模板 |
| 完整输出示例 | [core/examples/README.md](./examples/README.md) | 需求/Bug 修复等示例 |


---

## 🔗 相关说明

> 本项目（ai-dev-guidelines）是完全独立的 AI 开发执行手册，不依赖任何外部规范仓库。

---

## 📌 注意事项

1. **文档编号**: 必须严格按照 `01-`, `02-`, `03-` 顺序命名
2. **脚本位置**: 所有脚本必须放在对应的 `scripts/` 目录下
3. **命名规范**: 使用小写字母+连字符，禁止使用空格和特殊字符
4. **版本控制**: 所有文档变更必须提交到 Git
5. **模板使用**: 新文档必须基于 `core/templates/` 目录的模板创建

---

## 📞 维护者

- 项目负责人: rockyshi1993
- 创建日期: 2026-02-11
- 最后更新: 2026-03-05
- 版本: v2.12.0
- 详细变更记录见 [CHANGELOG.md](../CHANGELOG.md)
