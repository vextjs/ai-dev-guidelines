# Dev-Docs - AI 开发执行手册

> **核心定位**: AI 执行开发任务的流程规范和文档模板库
> 
> **目标用户**: AI Agent（GitHub Copilot / Claude / GPT）
> 
> **核心价值**: 让 AI 理解开发流程，按标准化步骤执行任务，并生成结构化文档

---

## 🤖 AI 使用说明

### 当你（AI）收到用户请求时：

1. **识别任务类型** - 判断属于哪种开发场景
2. **读取对应流程** - 从 `workflows/` 目录找到执行流程
3. **按步骤执行** - 严格按照流程定义的步骤操作
4. **生成文档** - 使用 `templates/` 中的模板记录过程
5. **验证完成度** - 对照检查清单确认任务完成

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
│
├── projects/                          # 🗂️ 项目特定规范（关键）
│   ├── README.md                     # 项目规范说明
│   ├── _template/                    # 项目规范模板
│   │   ├── PROJECT-PROFILE.md        # 项目概况模板
│   │   ├── TECH-STACK.md             # 技术栈模板
│   │   └── CODE-STANDARDS.md         # 代码规范模板
│   ├── user-service/                 # 示例：用户服务项目
│   ├── payment-service/              # 示例：支付服务项目
│   └── ...                           # 其他项目
│
├── workflows/                         # 🤖 AI 执行流程（通用）
│   ├── 00-task-identification/       # 步骤0: 识别任务类型
│   │   ├── README.md                 # 识别流程主文档
│   │   ├── rules.md                  # 识别规则详解
│   │   └── examples.md               # 识别案例集
│   ├── 01-requirement-dev/           # 流程1: 需求开发
│   │   ├── README.md                 # 流程主文档
│   │   └── steps.md                  # 详细步骤说明
│   ├── 02-bug-fix/                   # 流程2: Bug 修复
│   ├── 03-optimization/              # 流程3: 性能优化
│   ├── 04-research/                  # 流程4: 技术调研
│   ├── 05-refactoring/               # 流程5: 架构重构
│   ├── 06-database/                  # 流程6: 数据库变更
│   ├── 07-security/                  # 流程7: 安全修复
│   └── 08-incident/                  # 流程8: 事故复盘
│
├── templates/                         # 📝 文档模板（结构化）
│   ├── README.md                     # 模板使用说明
│   ├── core/                         # 核心模板（Tier 1）
│   │   ├── requirement-template.md
│   │   ├── technical-template.md
│   │   ├── implementation-template.md
│   │   ├── bug-analysis-template.md
│   │   ├── optimization-template.md
│   │   └── integration-template.md
│   ├── extended/                     # 扩展模板（Tier 2）
│   │   ├── research-template.md
│   │   ├── refactoring-template.md
│   │   └── ...
│   └── common/                       # 通用组件
│       ├── header.md
│       ├── footer.md
│       └── checklist.md
│
├── outputs/                           # 📦 保留目录（历史原因，推荐使用 projects/）
│   └── README.md                     # 说明文档
│
├── projects/                          # 🗂️ 项目特定规范和输出（推荐）
│   ├── README.md                     # 项目规范说明
│   ├── _template/                    # 项目规范模板
│   │   └── ...                       # 各类模板文件
│   │
│   ├── <project-name>/               # 具体项目目录
│   │   ├── requirements/             # 需求开发输出
│   │   │   └── <task-id>/
│   │   │       ├── 01-requirement.md
│   │   │       ├── 02-technical.md
│   │   │       └── 03-implementation.md
│   │   │
│   │   ├── bugs/                     # Bug 修复输出
│   │   │   └── <bug-id>/
│   │   │       ├── 01-analysis.md
│   │   │       └── 02-solution.md
│   │   │
│   │   └── ...                       # 其他类型输出
│
├── tools/                             # 🔧 AI 可用工具说明
│   └── README.md                     # 工具使用手册（包含所有工具说明）
│
├── examples/                          # 📚 完整示例（供 AI 学习）
│   ├── README.md                     # 示例清单和学习路径
│   ├── requirement-example/          # 需求开发示例
│   │   ├── README.md                 # 示例说明
│   │   ├── user-input.md             # 用户输入
│   │   ├── ai-execution-log.md       # 执行日志
│   │   ├── outputs/                  # 生成文档
│   │   └── code-changes/             # 代码变更
│   ├── bug-fix-example/              # Bug 修复示例
│   └── ...                           # 其他示例
│
└── best-practices/                    # ⚡ 最佳实践和高级场景
    └── README.md                     # 边界处理、Token优化、大项目策略
```

### 🎯 目录说明（AI 必读）

| 目录 | 用途 | AI 使用频率 |
|------|------|------------|
| `projects/` | **项目规范** - 特定项目的技术约束和规范 | ⭐⭐⭐⭐⭐ 每次必读 |
| `workflows/` | **执行步骤** - AI 按此执行任务（通用流程） | ⭐⭐⭐⭐⭐ 每次必读 |
| `templates/` | **文档骨架** - AI 生成文档的基础 | ⭐⭐⭐⭐ 生成文档时读 |
| `outputs/` | **输出目录** - AI 把生成的文档放这里 | ⭐⭐⭐⭐ 每次写入 |
| `tools/` | **工具手册** - AI 可用的工具和使用方法 | ⭐⭐⭐ 需要时查阅 |
| `examples/` | **学习材料** - AI 参考的完整示例 | ⭐⭐ 不确定时学习 |
| `best-practices/` | **高级场景** - 边界处理、优化策略 | ⭐⭐ 遇到复杂问题时 |

---

## 🔄 AI 开发流程规范

请参阅 [AI-WORKFLOW.md](./AI-WORKFLOW.md)，包含：

### 核心流程
1. **需求开发流程** - 需求分析 → 技术方案 → 实施计划 → 脚本编写 → (对接文档)*
2. **Bug 修复流程** - 问题复现 → 原因分析 → 解决方案 → 验证测试 → 文档归档
3. **性能优化流程** - 性能基线 → 瓶颈识别 → 优化方案 → 效果验证 → 对比报告

> **说明**: *对接文档仅在需求涉及第三方系统时生成

### 扩展流程
4. **技术调研流程** - 背景分析 → 方案对比 → POC 验证 → 结论建议
5. **架构重构流程** - 现状分析 → 目标设计 → 分步实施 → 灰度上线
6. **数据库变更流程** - 变更设计 → 迁移脚本 → 灰度执行 → 验证回滚
7. **安全加固流程** - 漏洞识别 → 修复方案 → 测试验证 → 安全审计
8. **事故复盘流程** - 故障分析 → 根因定位 → 改进措施 → 复盘报告
10. **事故复盘流程** - 时间线梳理 → 根因分析 → 影响评估 → 改进措施

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

## 🚀 快速开始

### 创建新需求文档
```bash
# 1. 创建项目目录（如果不存在）
mkdir -p projects/<project-name>/requirements/<feature-name>/scripts

# 2. 复制模板
cp templates/core/requirement-template.md projects/<project-name>/requirements/<feature-name>/01-requirement.md
cp templates/core/technical-template.md projects/<project-name>/requirements/<feature-name>/02-technical.md
cp templates/core/implementation-template.md projects/<project-name>/requirements/<feature-name>/03-implementation.md

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
| `01-requirement-dev/` | 需求开发 | 分析→设计→实现→验证 | 3-4 个文档 | 40% |
| `02-bug-fix/` | Bug 修复 | 复现→分析→修复→验证 | 3 个文档 | 30% |
| `03-optimization/` | 性能优化 | 基线→优化→验证→对比 | 4 个文档 | 10% |

> **说明**: 需求开发如果涉及第三方系统对接，会多生成 `04-integration.md` 文档

#### Tier 2: 扩展工作流（可选掌握）

| 流程文件 | 任务类型 | 使用场景 | 使用频率 |
|---------|---------|---------|----------|
| `04-research/` | 技术调研 | 技术选型、方案对比 | 10% |
| `05-refactoring/` | 架构重构 | 大型代码重构 | 5% |
| `06-database/` | 数据库变更 | Schema 变更、迁移 | 3% |
| `07-security/` | 安全修复 | 漏洞修复、加固 | 1% |
| `08-incident/` | 事故复盘 | 生产故障分析 | 1% |

---

## 📚 输出示例

### 需求开发示例
```
projects/user-service/requirements/20260211-rate-limit-integration/
├── 01-requirement.md          # 需求: 集成限流功能
├── 02-technical.md            # 方案: 技术设计
├── 03-implementation.md       # 实施: 代码实现记录
├── 04-integration.md          # 对接: 第三方系统对接说明
└── scripts/
    ├── install.sh             # 安装脚本
    └── test-rate-limit.js     # 测试脚本
```

### Bug 修复示例
```
projects/chat-service/bugs/BUG-chat-001-message-loss/
├── 01-analysis.md             # 问题: 消息丢失原因分析
├── 02-solution.md             # 方案: 消息队列重构
├── 03-implementation.md       # 实施: 代码修复记录
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
├── 01-timeline.md             # 时间线: 故障发生到恢复
├── 02-rootcause.md            # 根因: 连接池耗尽
├── 03-impact.md               # 影响: 损失 10万订单
└── 04-action.md               # 措施: 监控+限流+扩容
```

#### 架构重构示例
```
projects/user-service/refactoring/REF-user-auth-20260211/
├── 01-current.md              # 现状: 单体架构问题
├── 02-target.md               # 目标: 微服务拆分
├── 03-plan.md                 # 计划: 分 3 个阶段
└── 04-rollout.md              # 上线: 灰度 → 全量te.md projects/<project-name>/refactoring/<refactor-id>/01-current

# 2. 复制模板
cp templates/bug-analysis-template.md projects/<project-name>/bugs/<bug-id>/01-analysis.md
```

### 创建优化文档
```bash
# 1. 创建优化目录
mkdir -p projects/<project-name>/optimizations/<optimization-id>/scripts

# 2. 复制模板
cp templates/optimization-template.md projects/<project-name>/optimizations/<optimization-id>/01-baseline.md
```

---

## 📋 文档清单示例

### 完整需求开发示例
```
projects/user-service/requirements/20260211-rate-limit/
├── 01-requirement.md          # 需求: 接入 flex-rate-limit
├── 02-technical.md            # 技术方案: 中间件设计
├── 03-implementation.md       # 实施: 代码变更记录
├── 04-integration.md          # 对接: API 使用说明
└── scripts/
    ├── install.sh             # 安装脚本
    └── test-rate-limit.js     # 测试脚本
```

### Bug 修复示例
```⚠️ AI 必须遵守的规则

### 规则 1: 永远先读工作流
```
❌ 错误: 收到请求后直接开始写代码
✅ 正确: 先读 workflows/<task-type>.md，按步骤执行
```

### 规则 2: 严格按模板生成文档
```
❌ 错误� AI 学习路径

### Level 1: 基础（必须掌握）
1. ✅ 阅读 `README.md`（本文件）
2. ✅ 理解 `projects/` 和 `workflows/` 的区别
3. ✅ 阅读 `workflows/00-task-identification/`
4. ✅ 阅读 `workflows/01-requirement-dev/`
5. ✅ 学习 `examples/requirement-example/`

### Level 2: 进阶（推荐掌握）
6. ✅ 阅读特定项目规范（如 `projects/user-service/`）
7. ✅ 阅读 `workflows/02-bug-fix/`
8. ✅ 阅读 `workflows/03-optimization/`
9. ✅ 学习 `examples/bug-fix-example/`

### Level 3: 高级（可选掌握）
10. ✅ 阅读 `best-practices/` 边界处理
11. ✅ 阅读其他 `workflows/` 文件
12. ✅ 学习所有 `examples/` 示例
13. ✅ 理解 `tools/` 中的工具使用

---

## 📞 项目信息

- **目标用户**: AI Agent（GitHub Copilot / Claude / GPT）
- **核心价值**: 标准化 AI 开发流程，提升代码质量和文档完整性
- **创建日期**: 2026-02-11
- **版本**: v1.0
- **下一步**: 创建 `workflows/` 和 `examples/` 目录内容
```
❌ 错误: 生成一大段自然语言描述
✅ 正确: 使用表格、列表、代码块等结构化格式
```

### 规则 4: 任务 ID 必须唯一
```
❌ 错误: 使用模糊的名称如 "bug-fix"
✅ 正确: 生成唯一 ID 如 "BUG-user-20260211-login-timeout"
```

### 规则 5: 所有输出必须保存
```
❌ 错误: 只告诉用户答案，不生成文档
✅ 正确: 生成完整文档并保存到 outputs/ 目录
```

### 规则 6: 验证后再报告完成
```
❌ 错误: 代码写完就说"任务完成"
✅ 正确: 执行验证步骤，确认无错误才报告完成
```
    └── fix-message-queue.sql  # 数据库修复脚本
```

---

## 🔗 相关项目

- [guidelines](../guidelines/) - AI 开发规范主仓库
- [monSQLize](../monSQLize/) - MongoDB ORM 库
- [rate-limit](../rate-limit/) - 限流中间件
- [jrpc](../jrpc/) - JSON-RPC 协议库

---

## 📌 注意事项

1. **文档编号**: 必须严格按照 `01-`, `02-`, `03-` 顺序命名
2. **脚本位置**: 所有脚本必须放在对应的 `scripts/` 目录下
3. **命名规范**: 使用小写字母+连字符，禁止使用空格和特殊字符
4. **版本控制**: 所有文档变更必须提交到 Git
5. **模板使用**: 新文档必须基于 `templates/` 目录的模板创建

---

## 📞 维护者

- 项目负责人: [您的名字]
- 创建日期: 2026-02-11
- 最后更新: 2026-02-11
