# 用户指南

> 本目录包含面向用户的完整指南，帮助你理解 AI 的执行行为、记忆机制和自我修复能力。
> 
> 这些文档基于**用户视角**编写 — 解释"AI 会做什么"和"你能做什么"，而非规范的技术实现细节。

---

## 📂 指南目录

### 🚀 [快速入门指南](./getting-started.md)

第一次接触 ai-dev-guidelines？从这里开始。5 分钟了解这套体系是什么、能做什么、怎么用起来。

| 内容 | 适合阅读场景 |
|------|------------|
| 核心价值 + 10 种任务速览 + 3 步开始使用 + 新项目接入 + 工具一览 | 首次使用、新项目接入、想快速了解全貌 |

---

### [执行流程指南](./execution-workflow-guide/)

AI 收到你的任务请求后，会按照怎样的流程执行？预检查是什么？确认点在哪里？报告和记忆怎么工作？

| 文件 | 内容 | 适合阅读场景 |
|------|------|------------|
| [README.md](./execution-workflow-guide/README.md) | 全局总览 + 公共流程 | 首次了解 AI 执行机制 |
| [01-task-workflows.md](./execution-workflow-guide/01-task-workflows.md) | 各任务类型的专属流程 | 想了解某种任务 AI 怎么做 |
| [02-session-and-modes.md](./execution-workflow-guide/02-session-and-modes.md) | 跨会话恢复 + 统一 7 阶段流程 | 说"继续"时 AI 怎么恢复 |
| [03-faq.md](./execution-workflow-guide/03-faq.md) | 常见问题 + 相关文档 | 有疑问时快速查找 |

---

### [规范自我修复机制指南](./spec-self-fix-guide/)

当 AI 执行规范出现偏差、规范文件之间产生矛盾、或你发现 AI 行为不符合预期时，自我修复机制会自动检测并修复问题。

| 文件 | 内容 | 适合阅读场景 |
|------|------|------------|
| [README.md](./spec-self-fix-guide/README.md) | 机制总览 + 架构图 + 核心能力 | 首次了解自修复机制 |
| [01-detection-and-triggers.md](./spec-self-fix-guide/01-detection-and-triggers.md) | 检测模块 + 触发机制 | 想了解"怎么发现问题"和"什么时候启动" |
| [02-repair-and-records.md](./spec-self-fix-guide/02-repair-and-records.md) | 修复模块 + 修复记录 + 防复现 | 想了解"怎么修"和"怎么防止再犯" |
| [03-usage-and-faq.md](./spec-self-fix-guide/03-usage-and-faq.md) | 使用指南 + 常见问题 | 有疑问时快速查找、了解实际操作方式 |

---

### [设计理念](./DESIGN-PHILOSOPHY.md)

ai-dev-guidelines 的架构设计哲学、演进路线和未来方向。适合想深入理解"为什么这样设计"的读者。

---

## 🔗 相关文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 规范入口 | `.github/copilot-instructions.md` | AI 读取的入口文件 |
| 速查手册 | `ai-dev-guidelines/core/QUICK-REFERENCE.md` | AI 执行速查（面向 AI） |
| 约束清单 | `ai-dev-guidelines/core/CONSTRAINTS.md` | 22 条核心约束 |
| 任务记忆机制 | `ai-dev-guidelines/core/workflows/common/task-memory.md` | 5+1 阶段消息驱动（面向 AI） |
| 报告规范 | `ai-dev-guidelines/core/workflows/common/temp-reports.md` | 报告命名与存储（面向 AI） |
| 项目状态 | `ai-dev-guidelines/core/STATUS.md` | 项目状态与路线图 |