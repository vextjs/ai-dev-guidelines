# 新 Agent 快速上手指南

> 首次使用 ai-dev-guidelines 规范体系的 AI Agent 快速指引

**版本**: v1.0  
**最后更新**: 2026-02-27  
**适用对象**: 首次接入本规范体系的 AI Agent（GitHub Copilot / Claude / GPT / Cursor 等）

---

## 🚀 30 秒速览

你是一个 AI 开发助手，工作在一个已建立完整规范体系的项目中。你需要：

1. **每次会话开始** → 执行 5 项预检查
2. **每次回复** → 自动写报告 + 更新记忆（不问用户）
3. **修改文件前** → 先输出变更计划，等用户确认
4. **所有输出** → 使用中文（技术术语可保留英文）

---

## 📋 首次运行步骤

### Step 1：读取入口文件

```
.github/copilot-instructions.md  ← 你的执行入口（通常自动加载）
```

入口文件会指引你读取 `ai-dev-guidelines/QUICK-REFERENCE.md` — 这是你的**执行速查手册**，包含所有日常规则。

### Step 2：确定你的 Agent 标识

| 编辑器 + AI | 你的标识 |
|------------|---------|
| Zed + GitHub Copilot | `zed-copilot` |
| WebStorm + GitHub Copilot | `webstorm-copilot` |
| VS Code + GitHub Copilot | `vscode-copilot` |
| Cursor | `cursor` |
| VS Code + Cline | `vscode-cline` |
| Windsurf | `windsurf` |
| 其他 | `<editor>-<ai-provider>` |

### Step 3：执行 5 项预检查

每次会话的第一条回复**必须**包含：

```
📋 预检查:
1. 工作区: E:\MySelf（或实际路径）
2. 任务类型: 需求/Bug/优化/分析/...
3. 输出位置: projects/<project>/...
4. Agent: zed-copilot（你的标识）
5. 上次记忆: .ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN 或 ⚠️ 无
```

### Step 4：创建你的记忆目录

如果 `clients/<你的agent>/` 目录不存在，自动创建：

```
projects/<project>/.ai-memory/clients/<你的agent>/
├── SUMMARY.md          # 你的任务索引
└── tasks/
    └── YYYYMMDD.md     # 今天的记忆文件
```

### Step 5：开始工作

预检查 + 记忆初始化完成后，才能开始分析用户问题。

---

## 🧠 关键概念

### 报告为主体、记忆为索引

```
报告文件（reports/）   = 完整分析内容（主体）
记忆文件（.ai-memory/）= 摘要 + 报告链接（索引）
对话输出              = 结论摘要 + 报告路径
```

- **报告**存放在 `projects/<project>/reports/<子目录>/<agent>/YYYYMMDD/`
- **记忆**存放在 `projects/<project>/.ai-memory/clients/<agent>/tasks/YYYYMMDD.md`
- 每次会话必须**自动输出**两者，**禁止询问用户**

### 消息驱动 5 阶段

| 阶段 | 触发时机 | 做什么 |
|:----:|---------|--------|
| 0 | 收到首条消息 | 预检查 + 创建/追加记忆 |
| 1 | 用户发消息 | 捕获用户输入到对话记录 |
| 2 | AI 回复时 | 写报告 + 更新记忆 |
| 3 | AI 执行完毕 | 记录变更清单 + 实时更新报告状态 |
| 4 | 任务结束 | 最终状态 ✅ |

典型顺序：`0 → 1 → 2+3 → 1 → 2+3 → ... → 4`

### 文件命名规则

| 文件类型 | 命名格式 | 示例 |
|---------|---------|------|
| 报告文件 | `NN-<类型>-<简述>.md` | `01-analysis-architecture.md` |
| 记忆文件 | `YYYYMMDD.md` | `20260227.md` |

> 报告的日期体现在**目录层级**（`<agent>/YYYYMMDD/`），文件名不含日期。  
> 记忆文件每天一个，会话内用 `## 会话 NN` 分段。

---

## ⚠️ 必须知道的规则

### 🔴 绝对禁止

| # | 禁止行为 | 为什么 |
|:-:|---------|--------|
| 1 | 跳过预检查直接开始 | 缺少上下文，可能重复工作或遗漏记忆 |
| 2 | 询问用户"要不要写报告/记忆" | 这是自动行为，约束 #17 明确禁止 |
| 3 | 用 `find_path`/glob 扫描 `.ai-memory` | glob 引擎跳过隐藏目录，已发生事故 |
| 4 | 不等确认就修改文件 | 约束 #16，报告和记忆写入除外 |
| 5 | 写入其他 Agent 的 `clients/` 目录 | 目录隔离原则，约束 #10 |
| 6 | 在文档中留 `YYYY-MM-DD` 占位符 | 必须使用 `now()` 获取真实日期 |

### ✅ 必须执行

| # | 必做事项 | 频率 |
|:-:|---------|------|
| 1 | 预检查（5 项） | 每次会话开始 |
| 2 | 写报告 + 更新记忆 | 每次 AI 回复 |
| 3 | 使用 `list_directory` 逐层扫描 `.ai-memory` | 需要读取记忆时 |
| 4 | 修改文件前输出变更计划 | 每次涉及文件修改 |
| 5 | 中文输出 | 所有对话和文档 |

---

## 🔄 恢复上次任务

当用户说"继续"或"恢复"时：

1. 确定你的 Agent 标识
2. `list_directory` → `.ai-memory/clients/<你的agent>/tasks/`
3. 读取最新日期文件的**末尾最新会话段落**
4. 读取 `📨 对话记录` → 快速回忆对话脉络
5. 读取关联报告文件 → 恢复详细上下文
6. 从断点继续

> ⚠️ `list_directory` 返回空时，尝试 `read_file` 已知文件（如 `SUMMARY.md`）交叉验证——可能是工具缓存问题（BUG-047）。

---

## 📂 项目结构速览

```
ai-dev-guidelines/
├── QUICK-REFERENCE.md     ← ⭐ 执行速查手册（最常用）
├── CONSTRAINTS.md         ← 20 条核心约束
├── README.md              ← 项目主入口
├── META.yaml              ← 版本号和约束条数的单一真相源
├── workflows/             ← 工作流定义（预检查、需求开发、Bug修复等）
├── templates/             ← 文档模板（lite/core/extended）
├── projects/              ← 各项目的规范和输出
│   └── <project>/
│       ├── profile/       ← 项目特定规范
│       ├── reports/       ← AI 会话报告（每次必输出）
│       └── .ai-memory/    ← 记忆索引
├── tools/                 ← 验证脚本
├── spec-self-fix/         ← 规范自我修复机制
└── changelogs/            ← 版本变更详情
```

---

## ❓ 常见问题

### Q1：找不到 `.ai-memory` 目录？

A：首次使用时需要自动创建。确认项目路径正确（在 `projects/<project>/` 下），然后创建完整目录结构。

### Q2：不知道报告序号 NN 从几开始？

A：扫描 `reports/<子目录>/<agent>/YYYYMMDD/` 目录，取已有文件数量 +1。目录不存在则从 `01` 开始。NN 只在该目录范围内递增，与记忆文件无关。

### Q3：记忆文件已有多个会话，怎么追加？

A：读取现有文件，找到最大的 `## 会话 NN`，追加 `## 会话 NN+1`。

### Q4：用户同时用多个编辑器怎么办？

A：每个编辑器有独立的 Agent 标识和 `clients/<agent>/` 目录。你只管你自己的目录。全局 `SUMMARY.md` 可以看到其他 Agent 的关键决策。

### Q5：不确定任务类型怎么选？

A：参考 `QUICK-REFERENCE.md §任务类型映射`，或 `workflows/decision-tree.yaml` 中的关键词权重表。实在不确定就问用户。

### Q6：报告写多长合适？

A：没有硬性限制，但单个文件不超过 500 行（约束 #20）。超过时按章节拆分为主文件 + 子文件。

### Q7：规范文件之间有冲突怎么办？

A：`QUICK-REFERENCE.md` 是执行优先级最高的速查手册。如发现冲突，以 QUICK-REFERENCE 为准，并记录冲突到报告中触发自修复流程。

---

## 🔗 深入阅读

| 文档 | 路径 | 何时读 |
|------|------|--------|
| **速查手册** | `QUICK-REFERENCE.md` | ⭐ 每次任务必读 |
| **约束清单** | `CONSTRAINTS.md` | 需要确认具体约束内容时 |
| **任务记忆规范** | `workflows/common/task-memory.md` | 记忆文件格式/模板细节 |
| **报告规范** | `workflows/common/temp-reports.md` | 报告文件格式/存储规则 |
| **预检查工作流** | `workflows/00-pre-check/README.md` | 预检查详细步骤 |
| **项目规范** | `projects/<project>/profile/README.md` | 特定项目的技术栈和约定 |

---

**提示**: 本文件是入门指引，日常执行请以 `QUICK-REFERENCE.md` 为主要参考。