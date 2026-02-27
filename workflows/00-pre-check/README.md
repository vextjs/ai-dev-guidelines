# 工作流 00 - 简化预检查 v2

> **版本**: v2.7.0  
> **核心改进**: 5 项必做检查 + Agent 标识 + 上次记忆 + 任务记忆加载 + 日期强制必填

---

## 🎯 设计理念

**之前的问题**:
- 检查 Node.js 版本、磁盘空间等对文档生成没有实际价值
- 增加不必要的执行开销
- 用户已在使用项目，环境通常没问题
- 多编辑器/多 Agent 场景下记忆文件共存混乱，无法区分来源
- 生成的报告缺少日期，无法判断新旧版本

**改进后**:
- 聚焦有价值的检查
- 快速完成，减少摩擦
- 按需加载项目规范
- Agent 标识解决多编辑器记忆归属问题
- 上次记忆输出让用户立即知道当前对话的上下文来源
- 日期强制必填确保文档可追溯

---

## 📋 简化预检查（5 项必做）

### ✅ 检查清单

```text
📋 预检查:
1. 工作区: [当前路径]
2. 任务类型: [需求/Bug/优化/分析/...]
3. 输出位置: [projects/<project>/...]
4. Agent: [zed-copilot / webstorm-copilot / cursor / vscode-copilot / ...]
5. 上次记忆: [.ai-memory/clients/<agent>/tasks/最新文件路径 + 状态] 或 [⚠️ 无]
```

### 检查项说明

| # | 检查项 | 获取方式 | 必要性 |
|---|-------|---------|-------|
| 1 | 工作区确认 | 自动识别当前目录 | ✅ 必须 |
| 2 | 任务类型识别 | 分析用户请求关键词 | ✅ 必须 |
| 3 | 输出位置确认 | 基于项目名构建路径 | ✅ 必须 |
| 4 | Agent 标识 | 自动检测编辑器+AI 组合 | ✅ 必须 |
| 5 | 上次记忆 | 扫描 .ai-memory/clients/\<agent\>/tasks/ 最新文件 | ✅ 必须 |

---

## 📋 按需检查（涉及代码时）

当任务涉及代码修改时，额外检查:

```text
🔍 扩展检查:
6. 项目规范: ✅ 已加载 / ⚠️ 未找到（使用默认规范）
7. 任务记忆: ✅ 已读取 / ⚠️ 无历史记忆（首次任务）
```

### 任务记忆加载逻辑

```yaml
加载入口: ai-dev-guidelines/projects/<project>/.ai-memory/SUMMARY.md
存在时: 读取最近任务摘要 + 未完成事项（注意 Agent 列，区分来源）
不存在时: 跳过（首次任务，不需要记忆）
```

### 项目规范加载逻辑

```yaml
加载入口: projects/<project>/profile/README.md
未找到时: 🔴 必须询问用户是否需要生成
```

---

## 🚀 执行流程

### Step 1: 工作区确认

```yaml
执行: 识别当前工作目录
输出: "1. 工作区: E:\Worker\user-service"
```

### Step 2: 任务类型识别

```yaml
执行: 分析用户请求，匹配任务类型

关键词映射:
  继续任务: ["继续", "接着", "上次", "恢复", "断点", "卡住了", "继续上次", "token"]
  需求开发: ["实现", "开发", "添加", "新增", "集成"]
  Bug修复: ["修复", "解决", "Bug", "报错", "异常"]
  性能优化: ["优化", "慢", "性能", "加速"]
  技术调研: ["调研", "选型", "对比"]
  架构重构: ["重构", "重写", "改造"]
  深度分析: ["分析", "审查", "评估", "深度分析", "架构分析"]

特殊处理 — 继续任务:
  识别到"继续任务"意图时，跳转到「继续任务恢复流程」（见下方 §继续任务）
  
输出: "2. 任务类型: 需求开发"
```

### Step 3: 输出位置确认

```yaml
执行: 基于项目名和任务类型构建路径

路径模式:
  需求: projects/<project>/requirements/<feature>/
  Bug: projects/<project>/bugs/<bug-id>/
  优化: projects/<project>/optimizations/<opt-id>/
  分析: projects/<project>/reports/analysis/
  
输出: "3. 输出位置: projects/user/requirements/20260212-xxx/"
```

### Step 4: Agent 标识（🆕 v2.5.0）

```yaml
执行: 检测当前编辑器 + AI 组合，确定 Agent 标识

🏷️ Agent 标识表:
  | 编辑器 + AI        | 标识值              |
  |-------------------|---------------------|
  | Zed + Copilot     | zed-copilot         |
  | WebStorm + Copilot| webstorm-copilot    |
  | VS Code + Copilot | vscode-copilot      |
  | Cursor            | cursor              |
  | VS Code + Cline   | vscode-cline        |
  | Windsurf          | windsurf            |
  | 其他              | <editor>-<provider> |

检测优先级:
  1. 工具环境/系统信息推断（如 Zed Agent 面板、JetBrains IDE 特征）
  2. 用户在对话中提及的编辑器名称
  3. 无法确定时使用 unknown-agent 并提示用户确认

输出: "4. Agent: zed-copilot"

🔴 禁止行为:
  - Agent 字段留空或填占位符
  - 不做任何检测就跳过
```

### Step 5: 上次记忆（🆕 v2.7.0）

```yaml
执行: 扫描当前 Agent 的 .ai-memory 目录，找到最新记忆文件并输出

🔍 扫描逻辑:
  1. 确定当前 Agent 标识（Step 4 已获取）
  2. 扫描 ai-dev-guidelines/projects/*/.ai-memory/clients/<agent>/tasks/ 目录
  3. 按文件名日期+序号排序（YYYYMMDD-NN 自然排序即可）
  4. 取最新一条文件
  5. 读取该文件头部，提取状态字段（🔄 进行中 / ✅ 完成）

输出格式:
  找到记忆: "5. 上次记忆: projects/dev-docs/.ai-memory/clients/zed-copilot/tasks/20260227-01-OPT-spec-full-check.md (✅ 完成)"
  无记忆:   "5. 上次记忆: ⚠️ 无（首次任务 / 未找到记忆文件）"
  目录不存在: "5. 上次记忆: ⚠️ 无（.ai-memory 目录不存在）"

💡 设计目的:
  - 用户立即知道当前对话基于哪条记忆延续
  - 快速跳转查看上次任务做了什么
  - 在多 Agent 场景下确认记忆归属

🔴 禁止行为:
  - 上次记忆字段留空或不扫描就输出
  - 未实际扫描目录就声称"无记忆"
```

### Step 6: 项目规范加载（按需）

```yaml
条件: 任务涉及代码修改

执行:
  step1: 尝试读取 projects/<project>/profile/README.md
  step2_如失败:
    a: 输出 "⚠️ 未找到项目规范"
    b: 🔴 必须询问用户 "是否需要我分析项目并生成项目规范文件？[是/否]"
    c_用户同意: AI 分析项目(package.json、目录结构、tsconfig等)，按 profile/ 模块化结构生成（参考 chat 项目规范）
    d_用户拒绝: 使用默认规范继续

输出:
  成功: "6. 项目规范: ✅ 已加载 profile/（模块化 N 个文件）"
  失败: "6. 项目规范: ⚠️ 未找到 → 是否需要我分析项目并生成？[是/否]"

禁止行为:
  - 不实际检查文件就输出 "✅ 已加载"
  - 项目规范不存在时不提示用户、直接跳过
```

---

## 📝 输出格式

### 标准格式（快速模式）

```text
📋 预检查:
1. 工作区: E:\Worker\user-service
2. 任务类型: 需求开发
3. 输出位置: projects/user/requirements/20260212-rate-limit/
4. Agent: zed-copilot
5. 上次记忆: projects/user/.ai-memory/clients/zed-copilot/tasks/20260226-02-REQ-rate-limit-design.md (✅ 完成)
```

### 扩展格式（涉及代码时）

```text
# 已有项目规范:
📋 预检查:
1. 工作区: E:\Worker\user-service
2. 任务类型: 需求开发
3. 输出位置: projects/user/requirements/20260212-rate-limit/
4. Agent: webstorm-copilot
5. 上次记忆: projects/user/.ai-memory/clients/webstorm-copilot/tasks/20260226-01-REQ-user-auth.md (✅ 完成)
6. 项目规范: ✅ 已加载 profile/（模块化 5 个文件）
7. 任务记忆: ✅ 已读取（最近 3 条任务，含 2 条 webstorm-copilot + 1 条 zed-copilot）

# 未找到项目规范:
📋 预检查:
1. 工作区: E:\Worker\chat
2. 任务类型: 需求开发
3. 输出位置: projects/chat/requirements/20260224-xxx/
4. Agent: zed-copilot
5. 上次记忆: ⚠️ 无（首次任务 / 未找到记忆文件）
6. 项目规范: ⚠️ 未找到
   → 是否需要我分析 chat 项目并生成项目规范文件？[是/否]
7. 任务记忆: ⚠️ 无历史记忆（首次任务）
```

---

## 🔄 继续任务（恢复上一个未完成任务）

> 当用户在新会话中表达"继续上次任务"意图时，进入此流程。
> 常见触发语句："继续"、"接着上次"、"恢复记忆"、"上次卡住了"、"继续上次任务"

### 恢复流程

```yaml
Step 1 — 扫描当前 Agent 的 .ai-memory:
  路径: ai-dev-guidelines/projects/*/.ai-memory/clients/<agent>/SUMMARY.md
  目标: 找到本 Agent 所有状态为 🔄 的未完成任务
  兜底: 如果 clients/<agent>/ 不存在，检查全局 SUMMARY.md（向后兼容）

Step 2 — 判断未完成任务数量:
  0 个（当前 Agent）:
    → 检查其他 Agent 是否有未完成任务
    → 如有: 提示用户 "当前编辑器 (<agent>) 没有未完成任务，
       但 <other-agent> 有 N 个未完成任务: [列表]。是否要继续其中某个？"
    → 如无: 告知用户"没有找到未完成的任务记忆"，询问要做什么
  1 个（当前 Agent）: 直接恢复该任务
  多个（当前 Agent）: 列出所有未完成任务，让用户选择

Step 3 — 加载任务上下文:
  1. 读取对应 tasks/<id>.md 获取完整记忆
  2. 提取关键信息（目标、已完成内容、待办、涉及文件、原 Agent）
  3. 如任务涉及代码 → 检查相关文件当前状态（可能被用户手动修改过）

Step 4 — 向用户确认恢复:
  输出摘要 + 询问是否从断点继续

Step 5 — 继续执行:
  从任务记忆中记录的断点处继续
  更新 .ai-memory/clients/<agent>/tasks/<id>.md 记录恢复信息

跨 Agent 恢复时:
  - 创建新记忆文件（当前 Agent 标识），标注"继承自 <原 Agent> 的 <原文件>"
  - 原 Agent 的记忆文件保持不变（不修改其他 Agent 的记忆）
```

### 预检查输出格式（继续任务）

```text
📋 预检查:
1. 工作区: E:\MySelf
2. 任务类型: 🔄 继续任务
3. 输出位置: projects/vext/...
4. Agent: zed-copilot
5. 上次记忆: projects/vext/.ai-memory/clients/zed-copilot/tasks/20260226-01-REQ-vext-analysis.md (🔄 进行中)

🔄 找到未完成任务:
  - 任务: 20260226-01-REQ-vext-analysis
  - 项目: vext
  - Agent: zed-copilot（当前编辑器 ✅）
  - 状态: 🔄 进行中
  - 目标: [任务目标摘要]
  - 已完成: [已完成的部分]
  - 待办: [剩余待做的部分]
  
是否从断点继续？[是/否/查看详情]
```

### 边界情况

```yaml
记忆文件存在但内容很少（只有初始记忆）:
  → 说明 token 在任务刚开始时就耗尽了
  → 恢复时需要重新理解任务需求，从头执行

记忆文件标记 ✅ 但用户说"继续":
  → 可能用户对结果不满意，想要调整
  → 读取记忆，询问用户具体要调整什么

找不到任何 .ai-memory 目录:
  → 该项目从未使用过任务记忆
  → 正常走新任务流程
  
用户指定了具体项目（如"继续 vext 的任务"）:
  → 只扫描该项目的 .ai-memory

其他 Agent 的未完成任务:
  → 不自动恢复，必须提示用户确认
  → 恢复时创建新文件（当前 Agent），不修改原 Agent 的文件
```

---

## ❌ 移除的检查项

以下检查项已移除（理由：对 AI 文档生成没有实际价值）:

| 移除项 | 原因 |
|-------|------|
| Node.js 版本检查 | 用户环境已可用 |
| npm/yarn 版本检查 | 用户环境已可用 |
| Git 版本检查 | 用户环境已可用 |
| 磁盘空间检查 | 极少遇到空间不足 |
| 网络连接检查 | 与文档生成无关 |

---

## 📤 任务记忆（消息驱动 5 阶段策略 — v1.6）

> **核心问题**：AI 无法感知剩余 token，输出截断时没有机会执行收尾动作。
> **解决方案**：以对话消息事件为锚点驱动记忆写入，开始前先创建记忆，每条用户消息、每次 AI 回复、每次执行完毕都增量更新。
> **详见**: [workflows/common/task-memory.md §触发时机](../common/task-memory.md)

### 5 阶段总览

```yaml
阶段 0: 会话初始化（首条消息时 — 预检查 + 创建记忆）
阶段 1: 用户发消息时（捕获用户输入 — 每条有实质内容的消息）  ← 🆕 v1.6
阶段 2: AI 回复时（写报告 + 更新记忆）
阶段 3: AI 执行完毕时（记录变更清单）
阶段 4: 任务结束时（最终状态更新 ✅）

典型执行顺序:
  首轮:   0 → 1 → 2+3
  后续轮: 1 → 2+3 → 1 → 2+3 → ...
  结束:   4
```

### 阶段 0：会话初始化（预检查完成后立即执行）

```yaml
触发条件: AI 收到本次会话的第一条用户消息，预检查完成后

AI 自动执行:
  1. 确定当前 Agent 标识（预检查第 4 项已获取）
  2. 确保 .ai-memory/clients/<agent>/tasks/ 目录存在（不存在则创建）
  3. 获取当前真实日期
  4. 扫描 tasks/ 目录，统计当天已有文件数量，确定序号 NN（max+1 或 01）
  5. 创建 .ai-memory/clients/<agent>/tasks/<YYYYMMDD>-<NN>-<TYPE>-<id>.md（状态 🔄）
     - 写入任务目标（来自用户首条消息）
     - 📨 对话记录 → 记录首条用户消息摘要（轮次 1, 👤→）
  6. 更新 .ai-memory/clients/<agent>/SUMMARY.md（追加到最近任务，状态 🔄）

输出: "📝 初始记忆已创建 → .ai-memory/clients/<agent>/tasks/<filename>.md"

文件名示例（在各 Agent 目录内）:
clients/zed-copilot/tasks/20260226-01-ANALYSIS-v3-deep-review.md
clients/zed-copilot/tasks/20260226-02-FIX-arch-verification.md
clients/webstorm-copilot/tasks/20260227-01-REQ-user-auth.md

注意: 下次新会话预检查时，第 5 项"上次记忆"将自动指向此文件
```

### 阶段 1：用户发消息时（捕获用户输入）🆕

```yaml
触发条件: 用户发送包含新意图/新需求/方向修正的消息（后续消息，非首条）
不触发: 纯确认（"好的"/"Y"）、流程控制（"继续"/"接着"）、情绪表达

AI 自动执行:
  1. 📨 对话记录 → 追加用户消息摘要（1 行）
  2. 如用户修正方向 → 更新 🎯 任务摘要
  3. 如用户补充需求 → 追加到 ⚠️ 待跟进

为什么: 用户消息是最有价值的原始输入，v1.5 缺少此阶段导致追加需求可能丢失
注意: 极轻量（~100 token），发生在 AI 开始分析之前
```

### 阶段 2+3：AI 回复 + 执行完毕时

```yaml
触发条件: AI 准备向用户输出结果 + 工具调用全部完成

AI 自动执行:
  阶段 2（写报告 + 更新记忆）:
    1. 写入报告文件到 reports/<子目录>/（完整分析内容）
    2. 📄 关联报告 → 追加报告链接
    3. 📨 对话记录 → 追加 AI 回复摘要（轮次 N, 🤖←）
    4. 对话中只输出结论摘要 + 报告路径

  阶段 3（记录变更清单）:
    1. 💡 关键决策 → 追加本轮决策
    2. ⚠️ 待跟进 → 更新已完成/新增项

注意:
  - 阶段 2+3 通常合并为一次记忆更新操作
  - 纯文字回复（无工具调用）→ 只触发阶段 2，不触发阶段 3
  - 只更新本 Agent 目录下的记忆文件
  - 不写入其他 Agent 的 clients/ 目录
```

### 阶段 4：任务结束时

```yaml
触发条件: 任务执行完毕（用户确认完成 / 所有修改已完成）

AI 自动执行:
  1. 执行完成验证（见 task-memory.md §任务完成验证）
  2. 最终更新 .ai-memory/clients/<agent>/tasks/<当前任务>.md（状态改为 ✅ 完成）
  3. 更新 .ai-memory/clients/<agent>/SUMMARY.md（更新状态 + 补充关键变更）
  4. 同步关键决策到全局 .ai-memory/SUMMARY.md（追加模式，标注 Agent 来源）
  5. 如有未完成事项 → 记录到 clients/<agent>/SUMMARY.md 的「待跟进」表

输出: "📤 任务记忆已保存 → .ai-memory/clients/<agent>/tasks/<filename>.md"
```

### Token 耗尽恢复

```yaml
当 AI 输出中途截断:
  用户在新会话说: "继续上次任务" / "恢复记忆"

新会话 AI:
  1. 确定当前 Agent 标识
  2. 读取 clients/<agent>/SUMMARY.md → 找到状态为 🔄 的任务
  3. 读取对应 clients/<agent>/tasks/<id>.md → 恢复上下文
  4. 读取 📨 对话记录 → 快速回忆对话脉络（🆕 v1.6）
  5. 读取关联报告文件 → 恢复详细上下文
  6. 从断点继续执行
```

```yaml
❌ 禁止行为:
  - 跳过初始记忆创建直接开始执行（一旦 token 耗尽将丢失全部上下文）
  - 等任务全部完成才写记忆（违反"先写后干"原则）
  - 用户追加消息后不记录到 📨 对话记录（v1.6 新增要求）
  - 增量更新写过于冗长的内容（浪费 token）
  - 记忆文件名不带日期前缀
  - 写入其他 Agent 的 clients/ 目录
  - 修改其他 Agent 创建的记忆文件
```

---

## 🔴 日期强制必填（v2.5.0 新增）

> 所有 AI 生成的文档/报告/记忆文件必须包含真实日期，禁止留占位符。

### 文件名日期前缀

```yaml
所有输出文件必须以 YYYYMMDD-NN- 开头:
  ✅ 正确: clients/zed-copilot/tasks/20260226-01-ANALYSIS-v3-architecture.md
  ✅ 正确: clients/webstorm-copilot/tasks/20260227-01-REQ-user-auth.md
  ❌ 错误: v3-architecture-deep-analysis.md     # 缺少日期前缀
  ❌ 错误: 2026-02-26-analysis-xxx.md           # 日期格式错误（有分隔符）
  ❌ 错误: analysis.md                          # 缺少日期前缀
```

### 文档头部日期字段

```yaml
🔴 每次生成文档前，AI 必须逐项确认:
  - [ ] 日期字段不包含 "YYYY" 占位符？（已替换为真实日期）
  - [ ] 日期通过 now() 工具获取？
  - [ ] Agent 字段已填写当前编辑器/AI 标识？
  - [ ] 文件名以 YYYYMMDD- 开头？
  - [ ] 项目名称为真实项目名？

获取真实日期:
  1. 优先使用 now() 工具（最准确）
  2. 从用户上下文推断
  3. 🔴 无法确定时必须询问用户，禁止留占位符
```

---

## 🤖 多 Agent / 多编辑器策略

> **设计原则**: 目录隔离 + 全局只读摘要。

### 存储结构

```
.ai-memory/
├── SUMMARY.md                          # 全局只读摘要（关键决策汇总）
└── clients/
    ├── webstorm-copilot/               # WebStorm 专属
    │   ├── SUMMARY.md                  # 任务列表
    │   └── tasks/
    └── zed-copilot/                    # Zed 专属
        ├── SUMMARY.md
        └── tasks/
```

### 关键规则

```yaml
规则 1 — 目录隔离:
  - 每个 Agent 在 clients/<agent>/ 下独立管理自己的 SUMMARY.md 和 tasks/
  - AI 绝不写入其他 Agent 的 clients/ 目录
  - 全局 SUMMARY.md 仅追加关键决策（标注来源 Agent），不存任务列表

规则 2 — 读取:
  - 先读全局 SUMMARY.md（跨编辑器关键决策视图）
  - 再读 clients/<agent>/SUMMARY.md（本 Agent 的任务上下文）
  - 恢复任务时只扫描本 Agent 目录

规则 3 — 向后兼容:
  - 已有的根目录 tasks/ 和 SUMMARY.md 保持不变（历史数据）
  - 新任务写入 clients/<agent>/ 目录
  - 首次使用时自动创建 clients/<agent>/ 目录结构
```

> 完整规范详见 [workflows/common/task-memory.md §多 Agent 支持](../common/task-memory.md)

---

**版本**: v2.7.0  
**更新日期**: 2026-02-27  
**变更记录**:
- v2.7.0: 预检查从 4 项改为 5 项必做（新增"上次记忆"）；按需检查编号调整为 6/7；输出格式全面更新
- v2.6.0: 多编辑器策略从"共享目录+Agent前缀"改回"目录隔离+全局摘要"；新增任务完成验证；对齐 copilot-instructions v2.6.0 / task-memory v1.3
- v2.5.0: 多编辑器策略改为共享目录+Agent前缀（已由 v2.6.0 替代）
- v2.2.0: 精简为 3 项必做 + 任务记忆加载 + "先写后干"策略