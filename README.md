# ai-dev-guidelines

> **AI 工作操作系统** — 给 AI Agent 一个完整的工程任务执行框架

[![版本](https://img.shields.io/badge/版本-v3.0.0-blue)]()
[![约束](https://img.shields.io/badge/约束-22_条-red)]()
[![路由](https://img.shields.io/badge/路由-6_种-green)]()
[![模板](https://img.shields.io/badge/模板-8_个-orange)]()

---

## 它是什么？

就像操作系统给应用程序提供文件系统、内存管理、进程调度一样，`ai-dev-guidelines` 给 AI Agent 提供：

| 能力 | 说明 | 对应模块 |
|------|------|---------|
| **标准化工作流** | 6 种路由（dev/fix/analyze/audit/chat/resume），含子类型变体 | `version/v3/workflows/` |
| **持久化记忆** | 消息驱动 5+1 阶段跨会话记忆 + 多 Agent 协同 | `.ai-memory/` + `reports/` |
| **行为约束** | 22 条护栏规则（P0/P1 分级），防止 AI 未经确认执行破坏性操作 | `version/v3/RULES.md §4` |
| **文档模板** | 8 个结构化模板，输出格式统一 | `version/v3/templates/` |
| **规范自修复** | N13 双层合规检查（FC+SC），不通过则自动修复 | `version/v3/RULES.md §11` |
| **意图识别** | 三问判断法，语义理解驱动路由，不依赖关键词匹配 | `version/v3/RULES.md §2` |

## 它不是什么

- ❌ **不是提示词模板** — 不是几条规则让 AI 照做，而是完整的执行框架
- ❌ **不是编码规范** — 不是 ESLint/Prettier 那样约束代码风格
- ❌ **不是项目管理工具** — 不是 Jira/Linear 的替代品

## 核心特性

### 🔄 有状态执行

```
无状态模式（传统）:
  用户: "继续上次的工作"
  AI: "抱歉，我不记得上次做了什么"

ai-dev-guidelines:
  用户: "继续"
  AI: → 读取记忆 → 恢复上下文 → 无缝继续
```

### 🤝 多 Agent 协同

多个 AI（Copilot / Claude / GPT）可以在同一项目上并行工作，通过目录隔离和记忆共享避免冲突。

### 📐 单文件权威规范架构

v3 采用**单文件权威规范**设计，降低认知负担和 Token 成本：

```
RULES.md（~530 行，一次全文读取）
├── §1 消息管线（N01~N14 全流程 Mermaid 流程图）
├── §2 意图识别（三问判断法 + 多任务检测）
├── §3 确认点（CP1→CP2→CP3 + FIX-015 防护）
├── §4 核心约束（22 条，P0/P1 分级）
├── §5 记忆规则（消息驱动 5+1 阶段）
├── §6 报告规则（N12 四步闭环 + 自检清单）
├── §7 输出路径
├── §8 Agent 协同（标识检测 + 隔离规则）
├── §9 Token 管理（三级防护 · 上下文窗口）
├── §10 工作流路由表（dev/fix/analyze/audit/chat/resume）
└── §11 规范自修复（N13 双层合规检查）
```

工作流和模板按需加载，AI 日常只需读取 RULES.md 即可执行大部分任务。

---

## 📂 项目结构

```
ai-dev-guidelines/
├── .github/           # 🚪 入口文件
│   └── copilot-instructions.md  # AI 入口指引（v3.0.0）
├── version/           # 📦 版本化规范目录
│   ├── v3/            # 🤖 v3 规范体系（活跃）
│   │   ├── RULES.md   #    唯一权威规范（~530 行）
│   │   ├── workflows/ #    6 种路由的工作流定义
│   │   └── templates/ #    8 个文档模板
│   └── v2/            # 📦 v2 归档
│       ├── core/      #    v2 规范内核（22 条约束 + 13 种工作流 + 29 个模板）
│       └── docs/      #    v2 用户文档
├── tools/             # 🔧 自动化工具（bump-version.js 等）
├── changelogs/        # 📜 版本变更详情
├── CHANGELOG.md       # 📋 版本概览索引
└── README.md          # 📖 本文件
```

> 项目工作产出（记忆/报告/需求文档）存放在工作目录的 `projects/<project>/` 下，与规范仓库分离。

## 🚀 快速开始

### AI Agent 接入

1. 将 `ai-dev-guidelines/` 放入你的 workspace
2. 在 `.github/copilot-instructions.md` 中添加入口指引（参考本项目示例）
3. AI 会自动读取 `version/v3/RULES.md` 并按流程执行

### 新项目接入

```bash
# 1. 在工作目录创建项目产出目录
mkdir -p projects/<your-project>/profile

# 2. 复制项目模板
cp version/v3/templates/project-profile.md projects/<your-project>/profile/README.md

# 3. 编辑项目规范
# 填写 projects/<your-project>/profile/README.md

# 4. AI 自动识别
# AI 在收到任务时会自动读取对应项目规范
```

---

## 💡 设计理念

| 原则 | 说明 |
|------|------|
| **AI 是第一用户** | 所有设计以"AI 能否无歧义执行"为标准 |
| **有状态 > 无状态** | 消息驱动记忆，AI 拥有跨会话工作记忆 |
| **单文件 > 多文件** | 单文件权威规范消除交叉验证痛点 |
| **约束是护栏不是枷锁** | 22 条约束防止 AI 犯人类会犯的错 |
| **意图驱动 > 关键词匹配** | 三问判断法做语义理解，不依赖关键词触发 |

---

## 📊 项目状态

| 指标 | 数据 |
|------|------|
| 当前版本 | v3.0.0 |
| 核心规范 | RULES.md（~530 行） |
| 路由 | 6 种（含子类型变体） |
| 模板 | 8 个 |
| 约束 | 22 条（P0×13 / P1×9） |
| 接入项目 | 5+ 个 |

### 版本演进

| 版本 | 架构 | 特点 |
|------|------|------|
| v1.x | 基础框架 | 核心工作流 + 确认点机制 |
| v2.x | 多文件分散 | 三层递进架构 · 13 种工作流 · 29 个模板 · 22 条约束 |
| **v3.0** | **单文件权威** | **RULES.md 单文件 · 6 种路由 · 8 个模板 · 三问判断法 · 全流程 Mermaid 流程图** |

> 详见 [变更日志](./CHANGELOG.md)

## 📄 License

MIT