# 工作流 00 - 简化预检查 v2

> **版本**: v2.5.0  
> **核心改进**: 4 项必做检查 + Agent 标识 + 任务记忆加载 + 日期强制必填

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
- 日期强制必填确保文档可追溯

---

## 📋 简化预检查（4 项必做）

### ✅ 检查清单

```text
📋 预检查:
1. 工作区: [当前路径]
2. 任务类型: [需求/Bug/优化/分析/...]
3. 输出位置: [projects/<project>/...]
4. Agent: [zed-copilot / webstorm-copilot / cursor / vscode-copilot / ...]
```

### 检查项说明

| # | 检查项 | 获取方式 | 必要性 |
|---|-------|---------|-------|
| 1 | 工作区确认 | 自动识别当前目录 | ✅ 必须 |
| 2 | 任务类型识别 | 分析用户请求关键词 | ✅ 必须 |
| 3 | 输出位置确认 | 基于项目名构建路径 | ✅ 必须 |
| 4 | Agent 标识 | 自动检测编辑器+AI 组合 | ✅ 必须 |

---

## 📋 按需检查（涉及代码时）

当任务涉及代码修改时，额外检查:

```text
🔍 扩展检查:
5. 项目规范: ✅ 已加载 / ⚠️ 未找到（使用默认规范）
6. 任务记忆: ✅ 已读取 / ⚠️ 无历史记忆（首次任务）
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

### Step 5: 项目规范加载（按需）

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
  成功: "5. 项目规范: ✅ 已加载 profile/（模块化 N 个文件）"
  失败: "5. 项目规范: ⚠️ 未找到 → 是否需要我分析项目并生成？[是/否]"

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
```

### 扩展格式（涉及代码时）

```text
# 已有项目规范:
📋 预检查:
1. 工作区: E:\Worker\user-service
2. 任务类型: 需求开发
3. 输出位置: projects/user/requirements/20260212-rate-limit/
4. Agent: webstorm-copilot
5. 项目规范: ✅ 已加载 profile/（模块化 5 个文件）
6. 任务记忆: ✅ 已读取（最近 3 条任务，含 2 条 webstorm-copilot + 1 条 zed-copilot）

# 未找到项目规范:
📋 预检查:
1. 工作区: E:\Worker\chat
2. 任务类型: 需求开发
3. 输出位置: projects/chat/requirements/20260224-xxx/
4. Agent: zed-copilot
5. 项目规范: ⚠️ 未找到
   → 是否需要我分析 chat 项目并生成项目规范文件？[是/否]
6. 任务记忆: ⚠️ 无历史记忆（首次任务）
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

🔄 找到未完成任务:
  - 任务: 20260226-zed-copilot-REQ-vext-analysis
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

## 📤 任务记忆（先写后干策略）

> **核心问题**：AI 无法感知剩余 token，输出截断时没有机会执行收尾动作。
> **解决方案**：开始执行前先创建记忆，过程中增量更新，而非只在结束时才写。

### 任务开始时（预检查完成后立即执行）

```yaml
触发条件: 预检查完成、开始实际执行前

AI 自动执行:
  1. 确定当前 Agent 标识（预检查第 4 项已获取）
  2. 确保 .ai-memory/clients/<agent>/tasks/ 目录存在（不存在则创建）
  3. 获取当前真实日期
  4. 扫描 tasks/ 目录，统计当天已有文件数量，确定序号 NN（max+1 或 01）
  5. 创建 .ai-memory/clients/<agent>/tasks/<YYYYMMDD>-<NN>-<TYPE>-<id>.md（状态 🔄）
  6. 更新 .ai-memory/clients/<agent>/SUMMARY.md（追加到最近任务，状态 🔄）

输出: "📝 初始记忆已创建 → .ai-memory/clients/<agent>/tasks/<filename>.md"

文件名示例（在各 Agent 目录内）:
  clients/zed-copilot/tasks/20260226-01-ANALYSIS-v3-deep-review.md
  clients/zed-copilot/tasks/20260226-02-FIX-arch-verification.md
  clients/webstorm-copilot/tasks/20260227-01-REQ-user-auth.md
```

### 过程中（关键节点增量更新）

```yaml
触发条件（满足任一）:
  - 完成一个重要阶段（方案确认 / 核心代码完成）
  - 做出关键决策
  - 已修改多个文件

AI 自动执行:
  1. 更新 .ai-memory/clients/<agent>/tasks/<当前任务>.md（追加变更和决策）
  2. 保持简洁，不浪费 token 写冗长记录

注意:
  - 只更新本 Agent 目录下的记忆文件
  - 不写入其他 Agent 的 clients/ 目录
```

### 任务完成时

```yaml
触发条件: 任务执行完毕（用户确认完成 / 所有修改已完成）

AI 自动执行:
  1. 最终更新 .ai-memory/clients/<agent>/tasks/<当前任务>.md（状态改为 ✅ 完成）
  2. 更新 .ai-memory/clients/<agent>/SUMMARY.md（更新状态 + 补充关键变更）
  3. 同步关键决策到全局 .ai-memory/SUMMARY.md（追加模式，标注 Agent 来源）
  4. 如有未完成事项 → 记录到 clients/<agent>/SUMMARY.md 的「待跟进」表

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
  4. 从断点继续执行
```

```yaml
❌ 禁止行为:
  - 跳过初始记忆创建直接开始执行（一旦 token 耗尽将丢失全部上下文）
  - 等任务全部完成才写记忆（违反"先写后干"原则）
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
所有输出文件必须以 YYYYMMDD- 开头:
  ✅ 正确: clients/zed-copilot/tasks/20260226-ANALYSIS-v3-architecture.md
  ✅ 正确: clients/webstorm-copilot/tasks/20260227-REQ-user-auth.md
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

**版本**: v2.6.0  
**更新日期**: 2026-02-27  
**变更记录**:
- v2.6.0: 多编辑器策略从"共享目录+Agent前缀"改回"目录隔离+全局摘要"；新增任务完成验证；对齐 copilot-instructions v2.6.0 / task-memory v1.3
- v2.5.0: 多编辑器策略改为共享目录+Agent前缀（已由 v2.6.0 替代）
- v2.2.0: 精简为 3 项必做 + 任务记忆加载 + "先写后干"策略