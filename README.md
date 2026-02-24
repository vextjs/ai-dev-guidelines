# Dev-Docs - AI 开发执行手册

> **版本**: v2.1.0  
> **最后更新**: 2026-02-24  
> **核心定位**: 轻量、灵活、实用的 AI 文档生成工具
> 
> **目标用户**: AI Agent（GitHub Copilot / Claude / GPT）
> 
> **核心价值**: 快速生成结构化文档，高效完成开发任务

---

## 🎯 执行模式（v2.1 新增）

### 快速模式 (默认)

| 项目 | 说明 |
|-----|------|
| 适用场景 | 简单需求、小改动、快速迭代 |
| 流程步骤 | 5 个阶段 |
| 输出文档 | 精简版（使用 `templates/lite/`） |
| 预计时间 | 15-30 分钟 |

### 完整模式

| 项目 | 说明 |
|-----|------|
| 适用场景 | 复杂需求、核心功能、正式交付 |
| 流程步骤 | 7 个阶段 |
| 输出文档 | 完整版（使用 `templates/core/`） |
| 预计时间 | 45-90 分钟 |

**模式切换**: 
- 默认使用快速模式
- 用户说"需要完整文档"、"详细"时切换到完整模式
- 用户说"只要代码"时跳过文档生成

---

## 🤖 AI 使用说明

### 当你（AI）收到用户请求时：

1. **预检查** - 执行 3 项必做检查
2. **评估合理性** - 有更好建议先提出，确认后再执行
3. **识别任务类型** - 判断属于哪种开发场景
4. **读取对应流程** - 从 `workflows/` 目录找到执行流程
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

> **注意**: 系统对接不是独立任务类型，它是需求开发的一个子场景。当需求涉及第三方系统时，工作流会包含对接步骤。

---

## 📖 核心概念

### 什么是"工作流"（Workflow）？
- **定义**: AI 执行某类任务的标准化步骤序列
- **位置**: `workflows/<task-type>.md`
- **内容**: 步骤、工具、输出格式、验证标准
- **用途**: AI 的执行清单

### 什么是"模板"（Template）？
- **定义**: 文档的结构化框架
- **位置**: `templates/<task-type>-template.md`
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
dev-docs/
├── README.md                          # 👈 你正在阅读的文件（AI 入口）
├── QUICK-REFERENCE.md                 # 📖 速查手册（推荐首先阅读）
├── STATUS.md                          # 📊 项目状态追踪
├── CONSTRAINTS.md                     # ⛔ 约束清单（11 条）
├── CHANGELOG.md                       # 📜 版本变更索引
│
├── projects/                          # 🗂️ 项目特定规范（关键）
│   ├── README.md                     # 项目规范说明
│   ├── _template/                    # 项目规范模板
│   │   └── PROJECT.md                # 项目规范模板（统一版）
│   ├── dev-docs/                     # 本项目规范
│   └── user-service/                 # 示例：用户服务项目
│
├── workflows/                         # 🤖 AI 执行流程（通用）
│   ├── 00-pre-check/                 # 预检查（3 项必做）
│   ├── 00-task-identification/       # 步骤0: 识别任务类型
│   ├── 01-requirement-dev/           # 流程1: 需求开发
│   ├── 02-bug-fix/                   # 流程2: Bug 修复
│   ├── 03-optimization/              # 流程3: 性能优化
│   ├── 04-research/                  # 流程4: 技术调研
│   ├── 05-refactoring/               # 流程5: 架构重构
│   ├── 06-database/                  # 流程6: 数据库变更
│   ├── 07-security/                  # 流程7: 安全修复
│   ├── 08-incident/                  # 流程8: 事故复盘
│   ├── 09-opensource-init/           # 专项: 开源项目初始化
│   ├── common/                       # 通用组件（确认点、断点续传等）
│   └── decision-tree.yaml            # 决策树配置
│
├── standards/                         # 📏 开发规范（9 个文件）
│   ├── code-standards.md             # 代码规范
│   ├── test-standards.md             # 测试规范
│   ├── doc-standards.md              # 文档规范
│   ├── api-standards.md              # API 规范
│   ├── script-standards.md           # 脚本规范
│   ├── security-standards.md         # 安全规范（不可覆盖）
│   ├── config-standards.md           # 配置规范
│   ├── tool-standards.md             # 工具规范（不可覆盖）
│   └── git-standards.md              # Git 规范
│
├── templates/                         # 📝 文档模板（结构化）
│   ├── lite/                         # 精简模板（快速模式，7 个）
│   ├── core/                         # 核心模板（完整模式，8 个）
│   ├── extended/                     # 扩展模板（Tier 2，5 个）
│   └── common/                       # 通用组件（头部、尾部、清单等）
│
├── best-practices/                    # ⚡ 最佳实践和高级场景
│   └── README.md                     # 边界处理、Token优化、大项目策略
│
├── spec-self-fix/                     # 🔧 规范自我修复机制
│   ├── detection/                    # 检测模块
│   ├── repair/                       # 修复模块
│   ├── triggers/                     # 触发机制
│   └── records/                      # 修复记录
│
├── tools/                             # 🔧 工具脚本（4 个）
├── examples/                          # 📚 完整示例（供 AI 学习）
├── changelogs/                        # 📜 版本变更详情（v1.0~v2.0）
├── reports/                           # 📊 历史分析报告
└── outputs/                           # 📦 已弃用（历史兼容，使用 projects/）
```

### 🎯 目录说明（AI 必读）

| 目录 | 用途 | AI 使用频率 |
|------|------|------------|
| `projects/` | **项目规范+输出** - 特定项目的技术约束、规范和文档输出 | ⭐⭐⭐⭐⭐ 每次必读+写入 |
| `workflows/` | **执行步骤** - AI 按此执行任务（通用流程） | ⭐⭐⭐⭐⭐ 每次必读 |
| `templates/` | **文档骨架** - AI 生成文档的基础 | ⭐⭐⭐⭐ 生成文档时读 |
| `spec-self-fix/` | **规范自维护** - 检测和修复规范问题 | ⭐⭐⭐⭐ 用户抱怨/定期检查时 |
| `outputs/` | **保留目录** - 历史兼容，推荐使用 `projects/` | ⭐ 仅兼容 |
| `tools/` | **工具手册** - AI 可用的工具和使用方法 | ⭐⭐⭐ 需要时查阅 |
| `examples/` | **学习材料** - AI 参考的完整示例 | ⭐⭐ 不确定时学习 |
| `best-practices/` | **高级场景** - 边界处理、优化策略 | ⭐⭐ 遇到复杂问题时 |

---


## 📝 文档命名规范

### 项目命名
- 使用项目实际名称（小写字母+连字符）
- 示例: `user-service`, `payment-gateway`, `chat-system`

### 功能/需求命名
- 格式: `YYYYMMDD-<feature-name>`
- 示例: `20260211-rate-limit-integration`

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

### 预检查（每次必做）

```text
📋 预检查:
1. 工作区: [当前路径]
2. 任务类型: [需求/Bug/优化]
3. 输出位置: [projects/<project>/...]
```

### 任务类型映射

| 关键词 | 任务类型 | 工作流 |
|-------|---------|--------|
| 实现、开发、添加、集成 | 需求开发 | `01-requirement-dev/` |
| 修复、解决、Bug、报错 | Bug 修复 | `02-bug-fix/` |
| 优化、慢、性能 | 性能优化 | `03-optimization/` |
| 调研、选型、对比 | 技术调研 | `04-research/` |

### 确认点（必须等待用户）

| 确认点 | 时机 | 选项 |
|-------|------|------|
| CP1 | 需求理解后 | 确认/修改 |
| CP2 | 方案设计后 | 确认/修改/取消 |
| CP3 | 实施方案后 | 确认/修改/取消 |

### 输出路径

```
projects/<project-name>/
├── requirements/    # 需求开发
├── bugs/           # Bug 修复
├── optimizations/  # 性能优化
├── research/       # 技术调研
├── refactoring/    # 架构重构
├── database/       # 数据库变更
├── security/       # 安全修复
└── incidents/      # 事故复盘
```

---

## 📋 快速开始

### 创建新需求文档
```bash
# 1. 创建项目目录（如果不存在）
mkdir -p projects/<project-name>/requirements/<feature-name>/03-implementation
mkdir -p projects/<project-name>/requirements/<feature-name>/scripts

# 2. 复制模板
cp templates/core/requirement-template.md projects/<project-name>/requirements/<feature-name>/01-requirement.md
cp templates/core/technical-template.md projects/<project-name>/requirements/<feature-name>/02-technical.md
cp templates/core/implementation-template.md projects/<project-name>/requirements/<feature-name>/03-implementation/README.md

# 3. 开始编辑文档
```

### 创建 Bug 修复文档
```bash
# 1. 创建 Bug 目录
mkdir -p projects/<project-name>/bugs/<bug-id>/scripts

# 2. 复制模板
cp templates/core/bug-analysis-template.md projects/<project-name>/bugs/<bug-id>/01-analysis.md

# 3. 开始编辑文档
```

---

## 🤖 AI 执行流程

### 核心流程概述

```
用户输入
    ↓
读取 workflows/00-task-identification/README.md
    ↓
识别任务类型（需求/Bug/优化/调研/...）
    ↓
读取对应的 workflow 文件
    ↓
按步骤执行
    ↓
生成文档并保存到 projects/
    ↓
向用户报告完成
```

### 工作流清单

#### Tier 1: 核心工作流（必须掌握）

| 流程文件 | 任务类型 | 关键步骤 | 输出文档 | 使用频率 |
|---------|---------|---------|---------|----------|
| `01-requirement-dev/` | 需求开发 | 分析→方案→实施方案→执行→验证 | 3-4 个文档 | 40% |
| `02-bug-fix/` | Bug 修复 | 分析→方案→实施方案→修复→验证 | 3 个文档 | 30% |
| `03-optimization/` | 性能优化 | 基线→方案→实施方案→优化→验证 | 5 个文档 | 10% |

> **说明**: 需求开发如果涉及第三方系统对接，会多生成 `04-integration.md` 文档

#### Tier 2: 扩展工作流（可选掌握）

| 流程文件 | 任务类型 | 使用场景 | 使用频率 |
|---------|---------|---------|----------|
| `04-research/` | 技术调研 | 技术选型、方案对比 | 10% |
| `05-refactoring/` | 架构重构 | 大型代码重构 | 5% |
| `06-database/` | 数据库变更 | Schema 变更、迁移 | 3% |
| `07-security/` | 安全修复 | 漏洞修复、加固 | 1% |
| `08-incident/` | 事故复盘 | 生产故障分析 | 1% |

#### 专项工作流

| 流程文件 | 任务类型 | 使用场景 | 使用频率 |
|---------|---------|---------|----------|
| `09-opensource-init/` | 开源项目初始化 | 创建新的开源 NPM 包 | 按需 |

---

## 📚 输出示例

### 需求开发示例
```
projects/user-service/requirements/20260211-rate-limit-integration/
├── 01-requirement.md          # 需求: 做什么、为什么做
├── 02-technical.md            # 方案: 怎么做（只描述，不写代码）
├── 03-implementation/         # 实施方案（执行前生成，确认后才执行）
│   ├── README.md              # 实施总索引（前检查+步骤+验证）
│   ├── RateLimitConfig.md     # 配置文件变更（完整代码）
│   ├── RateLimiter.md         # 中间件变更（完整代码）
│   └── AppIntegration.md      # 应用集成变更（完整代码）
├── 04-integration.md          # 对接: 第三方系统（可选）
└── scripts/
    └── install.sh             # 安装脚本
```

### Bug 修复示例
```
projects/chat-service/bugs/BUG-chat-001-message-loss/
├── 01-analysis.md             # 分析: 消息丢失原因
├── 02-solution.md             # 方案: 消息队列重构
├── 03-implementation.md       # 实施方案: 变更内容
└── scripts/
    └── fix-message-queue.sql  # 数据库修复脚本
```

### 技术调研示例
```
projects/payment-service/research/RES-cache-selection-20260211/
├── 01-background.md           # 背景: 为什么需要缓存
├── 02-comparison.md           # 对比: Redis vs Memcached
├── 03-poc.md                  # POC: 性能测试结果
└── 04-conclusion.md           # 结论: 选择 Redis
```

#### 事故复盘示例
```
projects/order-service/incidents/INC-20260210-P0-database-outage/
├── 01-incident-record.md      # 故障记录+时间线
├── 02-root-cause.md           # 根因: 连接池耗尽
├── 03-impact.md               # 影响: 损失 10万订单
├── 04-improvements.md         # 改进措施: 监控+限流+扩容
└── 05-summary.md              # 复盘报告
```

#### 架构重构示例
```
projects/user-service/refactoring/REF-user-auth-20260211/
├── 01-current-state.md        # 现状: 单体架构问题
├── 02-target-design.md        # 目标: 微服务拆分
├── 03-plan.md                 # 计划: 分 3 个阶段
├── 04-implementation/         # 实施方案（按阶段）
│   ├── phase-1/
│   └── phase-2/
└── 05-summary.md              # 完成总结
```


---

## 🔗 相关项目

- [guidelines](https://github.com/rockyshi1993/guidelines) - AI 开发规范主仓库（已由本项目重构替代）
- [specs](https://github.com/rockyshi1993/specs) - 产品需求与技术方案仓库

---

## 📌 注意事项

1. **文档编号**: 必须严格按照 `01-`, `02-`, `03-` 顺序命名
2. **脚本位置**: 所有脚本必须放在对应的 `scripts/` 目录下
3. **命名规范**: 使用小写字母+连字符，禁止使用空格和特殊字符
4. **版本控制**: 所有文档变更必须提交到 Git
5. **模板使用**: 新文档必须基于 `templates/` 目录的模板创建

---

## 📞 维护者

- 项目负责人: rockyshi1993
- 创建日期: 2026-02-11
- 最后更新: 2026-02-24
- 版本: v2.1.0
