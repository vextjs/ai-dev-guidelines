# 工作流 00 - 简化预检查 v2

> **版本**: v2.11.0  
> **核心改进**: 5 项必做检查 + Agent 标识 + 上次记忆 + 任务记忆加载 + 日期强制必填 + 每日记忆文件

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
6. 📝 记忆已创建: [.ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN (🔄)] ← 🔴 阶段0 硬性阻塞
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

🔴 路径锚点（NO EXCEPTIONS）:
  所有输出必须位于 ai-dev-guidelines/projects/<project>/
  ❌ 禁止写入项目源码目录（如 E:\Worker\chat\）
  ❌ 禁止写入工作区根目录（如 E:\Worker\.ai-memory\）
  
  构建路径前:
    Step A: list_dir("ai-dev-guidelines/projects/<project>") 确认锚点存在
    Step B: 拼接子路径
  
  写入前自检: 路径含 "ai-dev-guidelines/projects/" → ✅；不含 → ❌ 停止重建

🔴 双路径（预检查第 3 项必须同时输出）:
  1. 报告路径: reports/<子目录>/<agent>/YYYYMMDD/
  2. 任务产物路径: <任务类型>/<中文描述>/

  任务产物路径模式（目录名用中文描述，不带 ID 前缀）:
    需求: requirements/<中文描述>/
    Bug:  bugs/<中文描述>/
    优化: optimizations/<中文描述>/
    调研: research/<中文描述>/
    重构: refactoring/<中文描述>/

  详见各 core/workflows/ 的 §命名规范（如 core/workflows/03-optimization/README.md §命名规范）

🔴 命名语言:
  目录名和文件简述使用中文，固定前缀保留英文（如 NN-opt-）
  详见各工作流 §命名规范 + core/workflows/common/temp-reports.md §命名规范

输出格式:
  "3. 输出位置:
     报告: ai-dev-guidelines/projects/chat/reports/optimizations/webstorm-copilot/20260228/
     产物: ai-dev-guidelines/projects/chat/optimizations/创建项目AI标题异步化/"
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

### Step 5: 上次记忆（🆕 v2.7.0 / 更新 v2.10.0）

```yaml
执行: 扫描当前 Agent 的 .ai-memory 目录，找到最新记忆文件并输出

🔍 扫描逻辑（🆕 v2.10.0 — 每日一文件格式）:
  1. 确定当前 Agent 标识（Step 4 已获取）
  2. 🔴 使用 list_directory 逐层进入目录（绝对禁止 find_path / glob）:
     a. list_directory("projects/<project>/.ai-memory") → 确认 clients/ 存在
     b. list_directory("projects/<project>/.ai-memory/clients/<agent>") → 确认 tasks/ 和 SUMMARY.md 存在
     c. list_directory("projects/<project>/.ai-memory/clients/<agent>/tasks") → 获取文件列表
     ⚠️ 为什么禁止 glob/find_path：glob 引擎默认跳过 "." 开头的隐藏目录（如 .ai-memory/），
        会返回空结果导致误判"无记忆"（已发生过的事故）
  3. 🔴 list_directory 返回空时必须二次验证（🆕 v2.11.0 — BUG-047）:
     ⚠️ list_directory 在某些环境下首次调用可能因工具缓存/索引未就绪返回错误的空结果。
     a. 如果 list_directory 返回 "is empty" 或 "Path not found"，不可立即断定目录为空
     b. 必须尝试 read_file 该目录下的已知文件（如 SUMMARY.md）进行交叉验证
     c. 如果 read_file 成功 → 说明 list_directory 结果不可靠，再次调用 list_directory 获取真实列表
     d. 如果 read_file 也失败 → 确认目录确实为空或不存在
     e. 🔴 已发生事故：list_directory("clients/zed-copilot") 返回 "is empty"，
        但 SUMMARY.md 和 tasks/ 下的文件实际存在（§会话10 BUG-047）
  4. 从文件列表中找到最新日期的文件:
     - 新格式: YYYYMMDD.md（每天一文件，优先匹配）
     - 旧格式: YYYYMMDD-NN-TYPE-id.md（向后兼容）
  5. 按文件名日期排序，取最新日期文件
  6. 读取该文件:
     - 新格式（YYYYMMDD.md）→ 读取末尾最新会话段落（## 会话 NN），提取状态和会话数
     - 旧格式 → 读取头部提取状态字段
  7. 记录今天是否已有记忆文件（供阶段 0 判断创建 vs 追加）

输出格式（🔴 必须包含实际扫描路径，即使结果为空）:
  找到记忆（新格式）: "5. 上次记忆: projects/dev-docs/.ai-memory/clients/zed-copilot/tasks/20260227.md §会话03 (✅ 完成)（已扫描 tasks/ 目录）"
  找到记忆（旧格式）: "5. 上次记忆: projects/dev-docs/.ai-memory/clients/zed-copilot/tasks/20260226.md §会话11 (✅ 完成)（已扫描 tasks/ 目录）"
  无记忆:   "5. 上次记忆: ⚠️ 无（已扫描 projects/dev-docs/.ai-memory/clients/zed-copilot/tasks/ — 目录为空）"
  目录不存在: "5. 上次记忆: ⚠️ 无（projects/dev-docs/.ai-memory/clients/zed-copilot/tasks/ 目录不存在，将在阶段 0 创建）"

  ⚠️ 为什么必须输出扫描路径:
    - 用户可以立即判断 AI 是否扫描了正确的位置
    - 扫描路径错误时用户能及时纠正（如项目名、Agent 名不对）
    - 避免 AI 声称"无记忆"但实际是扫描了错误路径

💡 设计目的:
  - 用户立即知道当前对话基于哪条记忆延续
  - 快速跳转查看上次任务做了什么
  - 在多 Agent 场景下确认记忆归属
  - 判断今天是否已有记忆文件（创建 vs 追加）

🔴 禁止行为:
  - 上次记忆字段留空或不扫描就输出
  - 未实际扫描目录就声称"无记忆"
  - 使用 find_path / glob 扫描 .ai-memory（glob 跳过隐藏目录）
  - 输出"⚠️ 无"时不附带实际扫描路径
  - list_directory 返回空时不做二次验证就断定"无记忆"（🆕 BUG-047）
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
5. 上次记忆: projects/user/.ai-memory/clients/zed-copilot/tasks/20260226.md §会话02 (✅ 完成)
6. 📝 记忆已创建: .ai-memory/clients/zed-copilot/tasks/20260227.md §会话01 (🔄)
```

> 🔴 **第 6 行是阶段 0 硬性阻塞输出**：AI 必须在输出预检查结果时同步完成记忆文件的创建/追加，第 6 行未输出 = 预检查未完成，禁止开始分析用户问题。
> 这不是新增的"第 6 项必做检查"，而是将阶段 0 的记忆写入动作嵌入预检查输出格式，消除预检查完成与记忆写入之间的空隙（soft gate → hard gate 升级）。
> **根因**：已发生 2 次阶段 0 时序违规事故（§会话05 + vscode-copilot §会话01），AI 在预检查 5 项输出后认为"预检查完成"直接进入分析模式，跳过记忆写入。

### 扩展格式（涉及代码时）

```text
# 已有项目规范:
📋 预检查:
1. 工作区: E:\Worker\user-service
2. 任务类型: 需求开发
3. 输出位置: projects/user/requirements/20260212-rate-limit/
4. Agent: webstorm-copilot
5. 上次记忆: projects/user/.ai-memory/clients/webstorm-copilot/tasks/20260226.md §会话01 (✅ 完成)
6. 📝 记忆已创建: .ai-memory/clients/webstorm-copilot/tasks/20260227.md §会话01 (🔄)
7. 项目规范: ✅ 已加载 profile/（模块化 5 个文件）
8. 任务记忆: ✅ 已读取（最近 3 条任务，含 2 条 webstorm-copilot + 1 条 zed-copilot）

# 未找到项目规范:
📋 预检查:
1. 工作区: E:\Worker\chat
2. 任务类型: 需求开发
3. 输出位置: projects/chat/requirements/20260224-xxx/
4. Agent: zed-copilot
5. 上次记忆: ⚠️ 无（首次任务 / 未找到记忆文件）
6. 📝 记忆已创建: .ai-memory/clients/zed-copilot/tasks/20260224.md §会话01 (🔄)
7. 项目规范: ⚠️ 未找到
   → 是否需要我分析 chat 项目并生成项目规范文件？[是/否]
8. 任务记忆: ⚠️ 无历史记忆（首次任务）
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
5. 上次记忆: projects/vext/.ai-memory/clients/zed-copilot/tasks/20260226.md §会话01 (🔄 进行中)

🔄 找到未完成任务:
  - 任务: 20260226.md §会话01
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

## 📤 任务记忆 / 日期规则 / 多 Agent 策略

> 以下内容已拆分到独立文件，避免本文件超过 500 行（约束 #20）。

| 章节 | 详见 |
|------|------|
| 📤 任务记忆（消息驱动 5+1 阶段策略 v1.9） | [memory-and-rules.md §任务记忆](./memory-and-rules.md#-任务记忆消息驱动-51-阶段策略--v19) |
| 🔴 日期强制必填（v2.5.0 / v2.10.0） | [memory-and-rules.md §日期规则](./memory-and-rules.md#-日期强制必填v250-新增--v2100-更新) |
| 🤖 多 Agent / 多编辑器策略 | [memory-and-rules.md §多 Agent](./memory-and-rules.md#-多-agent--多编辑器策略) |

> 完整规范详见 [core/workflows/common/task-memory.md](../common/task-memory.md)

---

**版本**: v2.11.0  
**最后更新**: 2026-03-02