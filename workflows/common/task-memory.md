**最后更新**: 2026-02-26
**v1.1 变更**: 新增"先写后干"策略，解决 token 耗尽导致记忆丢失问题
**版本**: v1.1
# 任务记忆机制

> AI 任务完成后自动生成记忆摘要，实现跨会话上下文传递

---

## 🎯 解决的问题

- AI 会话断开后，新会话无法知道之前做了什么
- TASK-INDEX.md 只记录了任务编号和路径，缺少上下文
- 长期积累后 AI 无法快速回忆项目历史决策
- **多编辑器/多 Agent 场景下记忆文件共存混乱，无法区分来源**

---

## 📁 存储位置

```
ai-dev-guidelines/projects/<project>/          # 如 projects/chat/
└── .ai-memory/                       # 🔴 AI 任务记忆（gitignore 忽略）
    ├── SUMMARY.md                    # 📋 总摘要（AI 首先读取的文件）
    └── tasks/                        # 各任务的详细记忆
        ├── 20260224-zed-copilot-REQ-xxx.md       # 🆕 包含 Agent 标识
        ├── 20260224-webstorm-copilot-BUG-xxx.md  # 🆕 包含 Agent 标识
        ├── 20260226-cursor-ANALYSIS-xxx.md       # 🆕 包含 Agent 标识
        └── ...
```

> **为什么在 ai-dev-guidelines/projects/ 下而不在项目源码目录？**
> - 统一管理：与项目规范（profile/）、正式归档文档在同一目录树下
> - 不污染业务源码目录
> - .ai-memory/ 加入 ai-dev-guidelines/.gitignore 忽略即可

---

## 📋 SUMMARY.md 模板

```markdown
# AI 任务记忆 - [项目名]

> **最后更新**: YYYY-MM-DD ← 🔴 必须替换为真实日期
> **总任务数**: N

## 🔑 关键决策记录

| 日期 | Agent | 决策 | 原因 | 影响范围 |
|------|-------|------|------|---------|
| YYYY-MM-DD | zed-copilot | [决策内容] | [原因] | [文件/模块] |

## 📋 最近任务（最新 10 条）

| 日期 | Agent | 类型 | 标题 | 关键变更 | 详情 |
|------|-------|------|------|---------|------|
| YYYY-MM-DD | zed-copilot | REQ | [标题] | [一句话总结] | [tasks/xxx.md](./tasks/xxx.md) |
| YYYY-MM-DD | webstorm-copilot | ANALYSIS | [标题] | [一句话总结] | [tasks/xxx.md](./tasks/xxx.md) |

## ⚠️ 未完成 / 待跟进

| 日期 | Agent | 任务 | 待办 | 原因 |
|------|-------|------|------|------|
| YYYY-MM-DD | zed-copilot | [任务名] | [待办事项] | [为什么没完成] |
```

---

## 📋 单任务记忆模板

```markdown
# [日期]-[Agent]-[类型]-[标题]

## 📍 基本信息
- **类型**: 需求开发 / Bug修复 / 优化 / 深度分析 / ...
- **日期**: YYYY-MM-DD ← 🔴 必须替换为真实日期
- **Agent**: [zed-copilot / webstorm-copilot / cursor / ...] ← 🔴 必须标识
- **状态**: ✅ 完成 / ⚠️ 部分完成 / 🔄 进行中

## 🎯 做了什么（一段话总结）

[用 2-3 句话描述这次任务做了什么，为什么做，结果如何]

## 📝 关键变更

| 文件 | 操作 | 说明 |
|------|------|------|
| xxx.ts | 新增 | [说明] |

## 💡 关键决策

- [决策 1]: [选了什么，为什么]
- [决策 2]: [选了什么，为什么]

## ⚠️ 注意事项 / 待跟进

- [如有未完成事项]

## 🔗 关联

- TASK-INDEX: `REQ-xxx`
- 归档文档: `ai-dev-guidelines/projects/<project>/requirements/xxx/`（如有）
```

### 🔴 文件名命名规范（v1.2 更新）

```yaml
旧格式: <date>-<TYPE>-<id>.md
新格式: <date>-<agent>-<TYPE>-<id>.md

🔴 Agent 标识为强制要求（NO EXCEPTIONS）

✅ 正确示例:
  20260226-zed-copilot-ANALYSIS-v3-deep-review.md
  20260226-webstorm-copilot-REQ-user-auth.md
  20260227-cursor-BUG-memory-leak.md

❌ 错误示例:
  20260226-ANALYSIS-v3-deep-review.md    # 缺少 Agent 标识
  ANALYSIS-v3-deep-review.md             # 缺少日期和 Agent
  20260226-REQ-user-auth.md              # 缺少 Agent 标识
```

---

## 🔄 触发时机

### ⚡ 核心原则：先写后干（Write-First）

> **问题背景**：AI 无法感知自身剩余 token，输出中途截断时没有机会执行任何收尾动作。
> 如果只在"任务结束时"才写记忆，一旦 token 耗尽就会丢失整个上下文。
>
> **解决方案**：采用 **"先写后干"** 策略 —— 开始执行前先创建初始记忆，
> 过程中在关键节点增量更新，确保 token 耗尽时至少有最近一次快照可用。

### 触发时机 1：任务开始时（创建初始记忆）

```yaml
触发条件: 预检查完成后、开始实际执行前

AI 执行:
  1. 确定当前 Agent 标识（见 §多 Agent 支持）
  2. 获取当前真实日期
  3. 确保 .ai-memory/clients/<agent>/tasks/ 目录存在（不存在则创建）
  4. 扫描 tasks/ 目录，统计当天已有文件数量，确定序号 NN（max+1 或 01）
  5. 创建 .ai-memory/clients/<agent>/tasks/<YYYYMMDD>-<NN>-<TYPE>-<id>.md（状态 🔄）
  6. 写入已知信息 — 任务目标、涉及的项目/模块、预计变更范围
  7. 更新 .ai-memory/clients/<agent>/SUMMARY.md → 追加到最近任务（状态 🔄）

记忆文件命名格式:
  <YYYYMMDD>-<NN>-<TYPE>-<id>.md
    YYYYMMDD : 日期
    NN       : 2 位当日序号（01、02、03...），每天从 01 开始
    TYPE     : 任务类型（大写：ANALYSIS / FIX / REQ / OPT / BUG）
    id       : 简短描述

  示例:
    20260226-01-ANALYSIS-v3-deep-review.md   # 当天第 1 个会话
    20260226-02-FIX-arch-verification.md     # 当天第 2 个会话
    20260226-03-OPT-hot-reload.md            # 当天第 3 个会话

输出: "📝 初始记忆已创建 → .ai-memory/clients/<agent>/tasks/<filename>.md"
```

### 触发时机 2：关键节点时（增量更新）

```yaml
触发条件（满足任一即执行）:
  - 完成了一个重要阶段（如方案确认、核心代码编写完成）
  - 做出了关键决策（如技术选型、架构调整）
  - 已修改多个文件，积累了大量未记录的变更
  - 用户对话轮次较多，已产生较多上下文

AI 执行:
  1. 更新 .ai-memory/clients/<agent>/tasks/<当前任务>.md → 追加已完成的变更和决策
  2. 状态保持 🔄 进行中

注意: 增量更新应简洁高效，不要花大量 token 写冗长记录
```

### 触发时机 3：任务完成时（最终更新）

```yaml
触发条件: 工作流阶段 5（完成报告）执行完毕后

AI 执行:
  1. 执行完成验证（见下方 §任务完成验证）
  2. 最终更新 .ai-memory/clients/<agent>/tasks/<当前任务>.md → 状态改为 ✅ 完成
  3. 更新 clients/<agent>/SUMMARY.md → 更新状态 + 补充"关键决策"
  4. 同步关键决策到全局 .ai-memory/SUMMARY.md
  5. 更新 TASK-INDEX.md → 追加任务记录行（已有机制）
```

### 🔴 任务完成验证（声称完成前必须执行）

```yaml
触发条件: AI 准备声称"任务完成"之前

验证清单:
  1. 输出文件存在性:
     - [ ] 所有声称创建的文件确实存在？（用工具验证，不要假设）
     - [ ] 文件路径正确？（在预期的目录下）
     - [ ] 文件名符合命名规范？（YYYYMMDD-<agent>-<描述>.md）

  2. 内容结构完整性:
     - [ ] 文档头部包含所有必填字段？（日期、Agent、状态）
     - [ ] 日期字段是真实日期，非 YYYY-MM-DD 占位符？
     - [ ] 报告/文档有完整的结构（标题→正文→结论）？
     - [ ] 没有中途截断的内容？

  3. 记忆文件完整性:
     - [ ] .ai-memory 中的任务记忆已更新？
     - [ ] SUMMARY.md 已追加/更新对应条目？

  4. 关联文件一致性（如修改了规范文件）:
     - [ ] 已执行交叉验证清单？
     - [ ] 所有引用处已同步更新？

输出格式:
  AI: "✅ 完成验证:
        - 输出文件: 3 个已确认存在
        - 内容结构: 完整
        - 记忆文件: 已更新
        - 关联检查: 已同步 2 个文件"

🔴 未通过验证项必须修复后才能声称完成。
```

### 手动触发

```yaml
用户可以说:
  - "总结一下这次任务"
  - "保存记忆"
  - "记录一下决策"
```

### ⚠️ 新会话继续任务（含 Token 耗尽恢复）

> 当用户在新会话中表达"继续"意图时，预检查流程自动识别并进入恢复模式。
> 完整恢复流程定义在 `workflows/00-pre-check/README.md §继续任务`。

```yaml
触发语句（任一匹配即触发）:
  - "继续" / "接着" / "继续上次任务"
  - "恢复记忆" / "恢复上下文"
  - "上次卡住了" / "上次断了"
  - "token 不够了继续" / "刚才没完成"

恢复流程摘要:
  1. 扫描 projects/*/.ai-memory/clients/<agent>/SUMMARY.md → 找状态 🔄 的任务
  2. 0个=没有未完成任务；1个=直接恢复；多个=让用户选
  3. 读取 clients/<agent>/tasks/<id>.md → 提取目标、已完成、待办、涉及文件
  4. 向用户输出摘要并确认
  5. 从断点继续执行，同时更新记忆文件

因为采用了"先写后干"策略，即使 token 耗尽，.ai-memory 中至少有:
  - 任务目标和范围（阶段 1 写入的）
  - 已完成的变更和决策（阶段 2 增量写入的）
  - 已修改的文件列表
```

---

## 🔍 使用方式

### 新会话开始时

```yaml
AI 收到任务请求后，预检查时:
  1. 读取 .ai-memory/SUMMARY.md（全局关键决策）
  2. 读取 .ai-memory/clients/<agent>/SUMMARY.md（本 Agent 任务列表）
  3. 如涉及之前任务，读取对应 clients/<agent>/tasks/<id>.md 获取详情
```

### 用户问"之前做了什么"

```yaml
AI 执行:
  1. 读取 .ai-memory/SUMMARY.md
  2. 列出最近 N 条任务记录
  3. 用户可以追问某条任务的详情 → 读取 tasks/<id>.md
```

---

## ⚙️ 维护

```yaml
清理策略:
  - 各 Agent 的 SUMMARY.md 保留最近 20 条，更早的只保留关键决策
  - clients/<agent>/tasks/ 下超过 30 天的文件可以清理
  - 用户可以说"清理旧记忆"触发

按 Agent 查看:
  - 用户可以说"只看 zed 的记忆" → 只读 clients/zed-copilot/SUMMARY.md
  - 用户可以说"清理 webstorm 的旧记忆" → 清理 clients/webstorm-copilot/tasks/
```

---

## 🤖 多 Agent / 多编辑器支持（v1.3）

> **问题背景**: 用户可能同时使用多个编辑器（如 Zed + WebStorm）安装不同的 AI 助手，
> 它们共享同一个文件系统上的 `.ai-memory/` 目录。

### 🔴 方案：目录隔离 + 全局摘要

```
.ai-memory/
├── SUMMARY.md                          # 全局只读摘要（所有 Agent 的关键决策）
└── clients/
    ├── webstorm-copilot/               # WebStorm Copilot 专属
    │   ├── SUMMARY.md                  # 该 Agent 的任务摘要
    │   └── tasks/
    │       └── 20260227-FIX-xxx.md
    ├── zed-copilot/                    # Zed Copilot 专属
    │   ├── SUMMARY.md
    │   └── tasks/
    │       └── 20260226-ANALYSIS-xxx.md
    └── unknown-agent/                  # 无法确定编辑器时的默认目录
        ├── SUMMARY.md
        └── tasks/
```

### 为什么目录隔离？

```yaml
❌ 共享目录+文件名前缀的问题（v1.2 已废弃）:
  - SUMMARY.md 被多个 Agent 并发写入，容易互相覆盖
  - 恢复任务需要解析文件名中的 Agent 前缀来过滤，复杂且脆弱
  - 文件名过长（日期+Agent+类型+描述）可读性差

✅ 目录隔离的优点:
  - 每个 Agent 完全独立读写自己的 SUMMARY.md 和 tasks/，零冲突
  - 恢复任务时只扫描自己的目录，无需过滤
  - 用户在文件管理器中一眼看出哪个编辑器产生了哪些记忆
  - 全局 SUMMARY.md 仅追加关键决策摘要，不存在并发问题
```

### 读写规则

```yaml
写入:
  1. 任务记忆写入 .ai-memory/clients/<agent>/tasks/ 和 clients/<agent>/SUMMARY.md
  2. 关键决策同步追加到全局 .ai-memory/SUMMARY.md（标注 Agent 来源）
  3. AI 绝不写入其他 Agent 的 clients/ 目录

读取:
  1. 先读取全局 .ai-memory/SUMMARY.md（了解跨编辑器的关键决策）
  2. 再读取 .ai-memory/clients/<agent>/SUMMARY.md（本 Agent 的任务列表）
  3. 恢复任务时只从本 Agent 目录查找 🔄 状态的任务

跨 Agent 恢复:
  - 读取全局 SUMMARY.md 发现其他 Agent 有未完成任务时，提示用户确认
  - 用户确认后，在本 Agent 目录创建新记忆文件，标注"继承自 <原 Agent>"
  - 不修改原 Agent 目录下的文件
```

### Agent 检测方法

```yaml
优先级:
  1. 系统信息/环境线索（如本次对话的 "JetBrains-WS editor" → webstorm-copilot）
  2. 用户在对话中提及的编辑器名称
  3. 无法确定时使用 unknown-agent，提示用户确认

常见映射:
  JetBrains IDE (WebStorm/IDEA) → webstorm-copilot
  Zed Agent 面板               → zed-copilot
  VS Code Copilot Chat         → vscode-copilot
  Cursor                       → cursor
  Windsurf                     → windsurf
```

### 向后兼容

```yaml
升级策略:
  - 已有的 .ai-memory/tasks/ 和 SUMMARY.md 保持不变（历史数据）
  - 新任务写入 clients/<agent>/ 目录
  - 读取时优先查 clients/<agent>/，同时兼容读取根目录下的旧数据
  - 首次使用时自动创建 clients/<agent>/ 目录结构
```

---

**版本**: v1.3
**创建日期**: 2026-02-24
**最后更新**: 2026-02-27
**v1.3 变更**: 多 Agent 方案从"共享目录+文件名前缀"改回"目录隔离+全局摘要"；新增任务完成验证段落
**v1.2 变更**: 新增多 Agent / 多编辑器支持（共享方案，已由 v1.3 替代）
**v1.1 变更**: 新增"先写后干"策略，解决 token 耗尽导致记忆丢失问题

