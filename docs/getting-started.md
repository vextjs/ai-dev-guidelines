# 快速入门指南

> 第一次使用 ai-dev-guidelines？花 5 分钟读完这篇，你就能开始了。

**创建日期**: 2026-02-28

---

## 一、这是什么？

ai-dev-guidelines 是一套 **AI 工作操作系统** — 给 AI 开发助手（GitHub Copilot、Claude、GPT、Cursor 等）提供完整的任务执行框架。

**一句话概括**：装上这套规范后，AI 会像一个有记忆、有流程、会自检的工程师一样工作，而不是每次对话都从零开始。

**核心价值**：

| 没有规范时 | 有规范后 |
|-----------|---------|
| 每次对话 AI 都不记得上次做了什么 | AI 自动记忆，说"继续"就能恢复上下文 |
| AI 理解错了直接改代码，改错了很难追溯 | AI 必须先输出方案等你确认，每步都有记录 |
| 分析结果只在对话里，关掉就没了 | 每次分析自动写成报告文件，永久可查 |
| 多个编辑器的 AI 互不知道对方做了什么 | 多 Agent 目录隔离，各自独立又能看到关键决策 |
| AI 的规范文件改着改着自相矛盾 | 自修复机制自动检测并修正不一致 |

---

## 二、AI 能帮你做什么？

装上规范后，AI 可以执行以下 10 种任务，每种都有标准化流程：

| 你说的话 | AI 执行什么 | 举例 |
|---------|-----------|------|
| "实现 xxx 功能" | 需求开发 | 添加用户积分接口 |
| "修复 xxx 问题" | Bug 修复 | 修复登录超时 |
| "优化 xxx 性能" | 性能优化 | 加速查询接口 |
| "分析/审查 xxx" | 深度分析 | 架构一致性审查 |
| "调研 xxx 方案" | 技术调研 | Redis vs Memcached 选型 |
| "重构 xxx 模块" | 架构重构 | 单体拆微服务 |
| "数据库加个 xxx 字段" | 数据库变更 | 用户表加手机号 |
| "修复 xxx 漏洞" | 安全修复 | 修复 SQL 注入 |
| "复盘 xxx 事故" | 事故复盘 | P0 故障根因分析 |
| "初始化一个开源项目" | 开源项目初始化 | 创建 npm 库脚手架 |

你不需要记住这些映射关系 — AI 会通过你消息中的关键词自动识别任务类型，并在预检查中告诉你它识别为什么类型。识别错了直接纠正它就行。

---

## 三、3 步开始使用

### Step 1：确保规范文件已就位

你的项目仓库中应该有 `ai-dev-guidelines/` 目录和 `.github/copilot-instructions.md` 入口文件。如果是从模板仓库克隆的，这些已经有了。

### Step 2：在编辑器中向 AI 发一条消息

打开你的编辑器（Zed / VS Code / WebStorm / Cursor），向 AI 助手发送任何任务请求，比如：

> "分析一下这个项目的架构"

### Step 3：看到预检查就说明成功了

AI 的第一条回复会以这样的格式开头：

```
📋 预检查:
1. 工作区: E:\Worker\my-project
2. 任务类型: 深度分析
3. 输出位置: projects/my-project/reports/analysis/zed-copilot/20260228/
4. Agent: zed-copilot
5. 上次记忆: ⚠️ 无
6. 📝 记忆已创建: .ai-memory/clients/zed-copilot/tasks/20260228.md §会话01 (🔄)
```

看到这 6 行，说明 AI 已经成功加载了规范体系。接下来它会按标准流程执行你的任务。

> **没看到预检查？** 检查 `.github/copilot-instructions.md` 文件是否存在，以及你的编辑器是否支持自动加载该文件。

---

## 四、你需要做什么 / 不需要做什么

### ✅ 你需要做的

| 场景 | 你的操作 |
|------|---------|
| AI 输出方案后等你确认 | 看方案没问题就说"确认"，有问题就说"修改：xxx" |
| AI 识别错了任务类型 | 直接告诉它正确的类型 |
| AI 做得不对 | 正常表达不满就行，自修复机制会自动捕获你的反馈 |
| 跨会话恢复 | 新会话中说"继续" |

### ❌ 你不需要做的

| 事情 | 原因 |
|------|------|
| 手动写报告 | AI 每次分析后自动写入 `reports/` 目录 |
| 手动更新记忆 | AI 每次会话自动更新 `.ai-memory/` 目录 |
| 告诉 AI "记住这个" | 消息驱动 5+1 阶段记忆自动工作 |
| 清理临时文件 | 报告保留 30 天，过期可批量清理 |
| 学习规范细节 | 规范是给 AI 看的，你只需要看 `docs/` 下的用户指南 |

---

## 五、核心概念速览

### 确认点（CP）

AI 在执行涉及代码修改的任务时，会在 3 个关键节点暂停等你确认：

- **CP1**：理解需求后 → 你确认 AI 理解正确
- **CP2**：技术方案后 → 你确认方案可行
- **CP3**：实施方案后 → 你确认具体变更

AI **不会**跳过确认点直接改代码。你说"确认"它才继续。

### 报告与记忆

```
报告（reports/）  = 每次分析的完整内容，像工作日志
记忆（.ai-memory/）= 摘要 + 报告链接，像目录索引
```

下次说"继续"时，AI 读记忆（快速回忆）→ 跟链接读报告（恢复详细上下文）。

### 统一 7 阶段流程（v2.13.0 FIX-016）

> 🔴 所有需求开发统一为 7 阶段流程，不再区分快速/完整模式。

| 阶段 | 内容 | 确认点 |
|------|------|--------|
| 1. 理解需求 | 需求复述、改动点 | CP1（强制） |
| 2. 技术方案 | 架构设计、改动清单 | CP2（强制） |
| 3. 实施方案 | 每个文件的变更内容 + IMPLEMENTATION-PLAN | CP3（强制） |
| 4. 执行实现 | 对照实施方案逐文件执行 | — |
| 5. 完成报告 | 汇总修改 + 验证结果 | — |
| 6. 归档文档 | 01-需求定义.md + 02-技术方案.md 等 | CP5（按需） |
| 7. 验证检查 | 代码和文档质量检查 | — |

- **模板选择**：小需求（< 5 文件）用 `lite/` 精简模板，大需求（>= 5 文件）用 `core/` 完整模板
- **归档文档**：所有需求均须生成文件（小需求内容可精简，但文件必须存在）

---

## 六、给新项目接入规范

如果你有一个新项目想接入 AI 规范体系，只需两步：

### Step 1：创建项目规范目录

在 `ai-dev-guidelines/projects/` 下创建你的项目目录。最简方式是让 AI 帮你做：

> "为 payment 项目创建规范文档"

AI 会分析项目代码（package.json、目录结构等），自动生成：

```
projects/payment/
├── README.md                 ← 项目顶层索引
├── TASK-INDEX.md             ← 任务索引
└── profile/                  ← 项目规范
    ├── README.md             ← 规范入口
    ├── 01-项目信息.md         ← 技术栈、目录结构
    ├── 02-架构约束.md         ← 强制禁止项
    ├── 03-代码风格.md         ← 命名规范
    └── CHANGELOG.md          ← 变更日志
```

### Step 2：开始使用

创建完成后，下次你向 AI 发送关于该项目的任务，AI 会自动加载项目规范并按规范执行。

> **手动方式**：也可以从 `projects/_template/` 复制模板，手动填充内容。参考 `projects/chat/` 作为完整示例。

---

## 七、可用工具一览

ai-dev-guidelines 自带一组维护工具，在 `core/tools/` 目录下。你可以在终端中直接运行：

| 工具 | 做什么 | 怎么用 |
|------|--------|--------|
| **bump-version.js** | 版本号 + 约束条数自动同步到所有引用文件 | `node core/tools/bump-version.js --apply` |
| **add-constraint.js** | 新增约束的自动化向导 | `node core/tools/add-constraint.js --interactive` |
| **validate-links.js** | 检查文档链接是否有效 | `node core/tools/validate-links.js` |
| **validate-structure.js** | 检查目录结构是否规范 | `node core/tools/validate-structure.js` |
| **doc-health-check.js** | 文档综合健康检查 | `node core/tools/doc-health-check.js .` |
| **spec-health-check.js** | 规范一致性健康检查 | `node core/tools/spec-health-check.js` |
| **update-task-index.js** | 自动更新项目的任务索引 | `node core/tools/update-task-index.js <项目名>` |

**最常用的两个**：

```bash
cd ai-dev-guidelines

# 改了版本号后，一键同步到所有文件
node core/tools/bump-version.js --apply

# 检查文档链接是否有断链
node core/tools/validate-links.js
```

> 你也可以让 AI 来运行这些工具 — 比如说"检查版本号是否一致"，AI 会自动执行对应的检查。

---

## 八、更详细的文档

| 想了解什么 | 去哪看 |
|-----------|-------|
| AI 执行流程的每一步细节 | [执行流程指南](./execution-workflow-guide/README.md) |
| 各任务类型的专属流程 | [任务类型流程](./execution-workflow-guide/01-task-workflows.md) |
| 跨会话恢复和输出格式 | [会话恢复与模式](./execution-workflow-guide/02-session-and-modes.md) |
| 自修复机制怎么工作 | [自修复机制指南](./spec-self-fix-guide/README.md) |
| 架构设计哲学和未来方向 | [设计理念](./DESIGN-PHILOSOPHY.md) |
| 日常使用常见问题 | [执行流程 FAQ](./execution-workflow-guide/03-faq.md) |
| 自修复常见问题 | [自修复 FAQ](./spec-self-fix-guide/03-usage-and-faq.md) |

---

## 九、常见问题

### Q1：我需要读完所有规范文件吗？

**不需要。** 规范文件是给 AI 看的（`core/workflows/`、`CONSTRAINTS.md`、`QUICK-REFERENCE.md` 等）。你只需要读 `docs/` 目录下的用户指南，也就是本文件和上面链接的那些。

### Q2：AI 会自动改我的代码吗？

**不会未经确认就改。** 涉及源码的修改必须先输出变更计划等你确认（确认点机制）。但报告和记忆的写入是自动的，不需要你确认 — 它们写在 `ai-dev-guidelines/projects/` 目录下，不影响你的源码。

### Q3：多个编辑器同时用会冲突吗？

**不会。** 每个编辑器有独立的 Agent 标识（如 `zed-copilot`、`webstorm-copilot`）和独立的 `clients/<agent>/` 目录。报告序号也独立编号。

### Q4：Token 耗尽了怎么办？

AI 遵循"先写后干"原则 — 开始前先创建记忆，过程中持续更新。即使 Token 中途耗尽，下次说"继续"时 AI 可以从最近的快照恢复。

### Q5：不想用了怎么关闭？

删除 `.github/copilot-instructions.md` 文件即可。AI 不再加载规范入口，就回到普通模式。`ai-dev-guidelines/` 目录可以保留（历史报告和记忆不会丢失）也可以删除。

---

## 相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 用户指南总览 | [docs/README.md](./README.md) | 所有用户指南入口 |
| 执行流程指南 | [docs/execution-workflow-guide/](./execution-workflow-guide/) | AI 执行流程详解 |
| 自修复机制指南 | [docs/spec-self-fix-guide/](./spec-self-fix-guide/) | 自修复机制详解 |
| 设计理念 | [docs/DESIGN-PHILOSOPHY.md](./DESIGN-PHILOSOPHY.md) | 架构哲学 |
| 项目规范模板 | `ai-dev-guidelines/projects/_template/` | 新项目接入模板 |
| 完整示例 | `ai-dev-guidelines/core/examples/` | 需求开发、Bug 修复示例 |