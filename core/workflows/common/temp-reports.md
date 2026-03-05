# 会话报告规范

**最后更新**: 2026-03-02

> AI 每次会话必须输出报告文件，作为分析结果的持久化载体

---

## 🎯 解决的问题

- 对话中直接输出的分析结果，会话关闭后无法追溯
- 记忆文件为了保留上下文被迫塞入大量细节，偏离"索引"定位
- 各项目 `reports/` 目录下文件平铺无结构
- 报告命名无规范，难以检索
- 没有定义哪些该保留、哪些该清理
- **报告缺少日期，无法判断哪个是最新版本**

---

## 🔴 核心规则：每次会话必须输出报告（🆕 v1.4）

```yaml
🔴 强制规则（NO EXCEPTIONS）:

  报告文件是 AI 每次会话的必要输出，不是"可选的临时文件"。
  报告写入是 AI 的自动行为，绝不询问用户。

  每次用户提问 + AI 完成分析/执行后:
    1. 自动将完整分析内容写入报告文件（reports/ 下）
    2. 自动更新记忆文件，追加报告链接
    3. 对话中只输出结论摘要 + 报告文件路径

  ❌ 绝对禁止:
    - "需要我写入报告吗？"
    - "要不要我把分析结果保存？"
    - 在对话中堆砌大段分析内容而不写报告文件
    - 会话结束时没有任何报告文件产出

  ✅ 正确行为:
    - 分析完成 → 自动写入报告 → 对话输出摘要 + 报告路径
    - 对话中输出格式:
        AI: "[结论摘要 — 2-5 句话]

             📄 完整报告: reports/<子目录>/<agent>/YYYYMMDD/NN-<类型>-<简述>.md"

为什么报告是必须的:
  1. 可追溯性: 每次对话都有文件留存，不随会话丢失
  2. 跨会话恢复: 新会话读记忆→读报告，完整上下文不丢失
  3. 职责清晰: 报告=完整内容，记忆=索引+摘要
  4. 减少 token 浪费: 记忆文件不再重复写分析内容
```

---

## 📎 报告与记忆的关系（🆕 v1.4）

```yaml
架构:
  报告文件（reports/）  → 完整分析内容（主体）
  记忆文件（.ai-memory/）→ 摘要 + 报告链接（索引）

关系图:
  用户提问 → AI 分析 → 写入报告文件（完整内容）
                     → 更新记忆文件（追加报告链接）
                     → 对话输出结论摘要 + 报告路径

  下次会话 → 读记忆（快速回忆）→ 读报告（恢复详细上下文）

记忆文件中的报告引用格式:
  ## 📄 关联报告
  | 报告文件 | 类型 | 说明 |
  |----------|------|------|
  | [01-analysis-xxx.md](../../reports/analysis/zed-copilot/20260227/01-analysis-xxx.md) | 深度分析 | 完整分析 |

详见: core/workflows/common/task-memory.md §核心架构
```

---

## 📁 存储位置

```
ai-dev-guidelines/projects/<project>/          # 如 projects/chat/
└── reports/                          # 🔴 AI 会话报告（每次会话必须输出）
    ├── diagnostics/                  # 诊断分析报告
    │   └── <agent>/                  # 🆕 v1.6 按 Agent 隔离
    │       └── YYYYMMDD/             # 🆕 v1.6 按天分目录
    │           └── NN-diag-<简述>.md
    ├── bugs/                         # Bug 分析报告
    │   └── <agent>/YYYYMMDD/
    ├── requirements/                 # 需求分析报告
    │   └── <agent>/YYYYMMDD/
    ├── optimizations/                # 优化分析报告
    │   └── <agent>/YYYYMMDD/
    ├── analysis/                     # 深度分析/架构分析报告
    │   └── <agent>/YYYYMMDD/         # 如 analysis/zed-copilot/20260227/
    │       ├── 01-analysis-xxx.md
    │       ├── 02-bug-yyy.md
    │       └── ...
    └── .temp/                        # 临时/中间过程文件（可随时清理）
```

> **注意**: `reports/` 在 ai-dev-guidelines/.gitignore 中忽略，不提交到 git。
> 但报告文件在本地长期保留（30 天），供跨会话恢复上下文使用。

> **🆕 v1.6 目录隔离**：报告按 `<agent>/YYYYMMDD/` 两级目录组织，每个 Agent 每天独立编号。
> 日期信息由目录层级表达，文件名不再需要 `YYYYMMDD-` 前缀。

---

## 📝 命名规范

### 🔴 强制规则：报告按 Agent + 日期目录组织（🆕 v1.6）

```yaml
目录结构: reports/<子目录>/<agent>/YYYYMMDD/
文件名格式: <NN>-<类型>-<简述>.md

  <agent>  : Agent 标识（如 zed-copilot、webstorm-copilot）
  YYYYMMDD : 8 位日期目录（强制，无分隔符）
  NN       : 2 位当日序号（从 01 开始递增，每个 Agent 每天独立编号）
  类型     : 报告类型前缀（见下方）
  简述     : 具体描述（使用中文 — 🆕 FIX-008 2026-02-28）

🔴 命名语言规则（🆕 FIX-008 2026-02-28）:
  <简述> 部分使用中文:
    ✅ 正确: 01-opt-创建项目AI标题异步化.md
    ✅ 正确: 02-bug-登录超时问题.md
    ❌ 错误: 01-opt-trip-project-async-title.md  ← 英文
  固定前缀保留英文: NN-<类型>-（如 01-opt-、02-bug-、01-analysis-）
  原因: copilot-instructions.md 入口声明"所有输出使用中文"

🔴 目录隔离规则（🆕 v1.6）:
  - 报告按 <agent>/YYYYMMDD/ 两级目录组织
  - 日期信息由目录层级表达，文件名不再需要 YYYYMMDD- 前缀
  - 每个 Agent 每天独立编号（NN 从 01 开始）
  - AI 绝不写入其他 Agent 的报告目录

🔴 报告 NN 序号独立规则（v1.5 → v1.6 更新）:
  - NN 仅扫描 reports/<子目录>/<agent>/YYYYMMDD/ 目录计算
  - 与记忆文件完全解耦（记忆使用 YYYYMMDD.md，无 NN）
  - ❌ 禁止报告和记忆共享同一个全局序号池

🔴 日期目录为强制要求（NO EXCEPTIONS）:
  - 必须使用真实日期创建 YYYYMMDD 目录
  - 日期必须是报告创建的实际日期
  - 禁止省略日期目录层级
  - 禁止使用其他日期格式（如 2026-02-26、26Feb 等）

🔴 当日序号为强制要求:
  - 每个 Agent 的每天目录内，序号从 01 开始递增
  - AI 生成报告前必须扫描目标目录，统计已有报告数量，取 max+1
  - 如果当天该 Agent 没有报告，序号为 01
  - 序号确保同一天的报告有明确的先后顺序

  获取序号的方法:
    1. 扫描 reports/<子目录>/<agent>/YYYYMMDD/ 目录下的文件
    2. 提取已有序号的最大值
    3. 新文件序号 = 最大值 + 1（目录不存在或为空则为 01）
    ⚠️ 不扫描 .ai-memory/（记忆文件无 NN 序号，与报告序号完全独立）
    ⚠️ 不扫描其他 Agent 的目录（每个 Agent 独立编号）

类型前缀（序号之后）:
  diag-    : 诊断报告
  bug-     : Bug 分析
  req-     : 需求分析
  opt-     : 优化分析
  review-  : 代码审查
  analysis-: 深度分析/架构分析
  research-: 技术调研
  verify-  : 验证报告（对已有报告的交叉验证）

✅ 正确示例（🆕 v1.6 新格式）:
  reports/analysis/zed-copilot/20260226/01-analysis-v3-architecture.md          # zed 当天第 1 个
  reports/analysis/zed-copilot/20260226/02-bug-subscription-renewal.md          # zed 当天第 2 个
  reports/analysis/webstorm-copilot/20260226/01-analysis-hot-reload.md          # webstorm 当天第 1 个（独立编号）
  reports/bugs/vscode-copilot/20260228/01-bug-login-timeout.md                 # 另一天、另一 Agent

❌ 错误示例:
  reports/analysis/20260226-01-analysis-xxx.md          # ❌ 旧格式（缺少 agent/YYYYMMDD 目录层级）
  reports/analysis/zed-copilot/01-analysis-xxx.md       # ❌ 缺少日期目录
  reports/analysis/zed-copilot/20260226/analysis-xxx.md # ❌ 缺少序号 NN
  reports/analysis/zed-copilot/20260226/20260226-01-analysis-xxx.md  # ❌ 文件名重复包含日期（日期已在目录中）
  v3-architecture-deep-analysis.md                      # ❌ 缺少全部结构
```

### 为什么按 Agent + 日期目录组织？

1. **Agent 隔离**: 多个 AI 助手的报告不会互相干扰，NN 编号独立
2. **版本识别**: 同一主题可能有多次分析，日期目录是判断新旧的依据
3. **快速排序**: 目录内按文件名排序即可按序号排序
4. **清理依据**: 基于日期目录可以快速识别和批量清理过期报告
5. **避免冲突**: 不同 Agent 同天生成的报告编号不会冲突

---

## 📋 报告内容必填字段

### 🔴 报告头部必须包含

每份报告的头部**必须**包含以下元信息，**禁止留占位符**：

```markdown
# [报告标题]

> **项目**: [真实项目名]
> **类型**: [诊断/Bug分析/需求分析/优化/深度分析/...]
> **创建日期**: YYYY-MM-DD ← 🔴 必须替换为真实日期
> **Agent**: [zed-copilot / webstorm-copilot / cursor / ...] ← 🔴 必须标识
> **状态**: 📝 进行中 / ✅ 已完成

---
```

```yaml
❌ 绝对禁止:
  - 日期字段保留 "YYYY-MM-DD" 占位符
  - 日期字段留空
  - 不填写 Agent 标识
  - 报告文件不在 <agent>/YYYYMMDD/ 目录下

✅ AI 自检清单（生成报告前必须确认）:
  - [ ] 报告存放在 reports/<子目录>/<agent>/YYYYMMDD/ 目录下？
  - [ ] 文件名以 NN- 开头（2 位序号）？
  - [ ] 头部「创建日期」已替换为真实日期？
  - [ ] 头部「Agent」已标识当前编辑器/AI？
  - [ ] 🔴 正文中的问题/建议/方案表格是否包含「合理性 + 可实施性 + 收益/必要性」列？（约束 #8）
```

### 🔴 报告正文约束（约束 #8 落地 — 🆕 v2.11.0）

报告正文中凡涉及 **问题清单、建议方案、优化措施、行动项** 的表格，**必须**包含约束 #8 要求的三项验证列：

```yaml
🔴 强制规则（NO EXCEPTIONS）:

  报告中的每一条问题/建议/方案/行动项，必须附带以下三列:
    - 合理性: 是否真实存在？基于实际文件验证还是推断？
    - 可实施性: AI 或用户能否落地执行？已验证还是待验证？
    - 收益/必要性: 修复/采纳后的具体收益是什么？

  适用的表格类型:
    - 🔴 问题/风险表格（必须含: 合理性 + 可实施性 + 收益/必要性 + 建议）
    - 🟡 待改进/可优化表格（必须含: 合理性 + 可实施性 + 收益/必要性）
    - 📋 建议与行动项表格（必须含: 合理性 + 可实施性 + 收益/必要性）
    - 🔧 修复/优化措施表格（必须含: 合理性 + 可实施性 + 预期收益）

  ❌ 绝对禁止:
    - 问题/建议表格只有"问题 + 建议"两列，没有验证列
    - 列出问题但不标注验证方式（"✅ 已验证"还是"⚠️ 待验证"）
    - 基于推断输出问题而未实际读取文件验证

  参考模板: core/templates/lite/analysis-lite.md（验证列表格示范）
  详见: CONSTRAINTS.md 约束 #8（输出需验证）

已发生事故:
  - 多次会话中 AI 输出的报告缺少验证/合理性/收益列，用户反复指出
  - 根因: 报告规范自检清单仅检查头部字段，未检查正文验证列（已通过本规则修复）
```

---

## 🔄 与 ai-dev-guidelines 的关系

```yaml
reports/ (ai-dev-guidelines/projects/<project>/ 下):
  - 每次会话的分析内容载体，不提交 git
  - AI 每次会话自动写入（禁止询问）
  - 被记忆文件（.ai-memory/）引用，供跨会话恢复上下文
  - 本地保留 30 天，过期可清理

.ai-memory/ (ai-dev-guidelines/projects/<project>/ 下):
  - 记忆索引，存储摘要+报告链接
  - 与 reports/ 配合实现跨会话上下文传递
  - 详见: core/workflows/common/task-memory.md

ai-dev-guidelines/projects/<project>/requirements/ 等 (归档文档):
  - 正式归档文档，提交 git
  - 完整模式下生成
  - 长期保存，可追溯
```

---

## ⚙️ AI 执行规范

```yaml
🔴 写入时机（自动执行，禁止询问）:
  - 每次会话分析完成后 → 自动写入对应子目录
  - 分析代码时 → reports/diagnostics/<agent>/YYYYMMDD/
  - Bug 定位时 → reports/bugs/<agent>/YYYYMMDD/
  - 需求分析时 → reports/requirements/<agent>/YYYYMMDD/
  - 深度分析/架构分析 → reports/analysis/<agent>/YYYYMMDD/
  - 优化分析 → reports/optimizations/<agent>/YYYYMMDD/
  - 中间过程文件 → reports/.temp/

🔴 写入前必须:
  1. 获取当前真实日期（使用 now() 工具）
  2. 确定目标目录: reports/<子目录>/<agent>/YYYYMMDD/（如不存在则创建）
  3. 扫描该目录，统计已有报告数量，确定序号（max+1 或 01）
     ⚠️ 报告 NN 独立于记忆文件（不扫描 .ai-memory/）
     ⚠️ 只扫描当前 Agent 当天的目录（不扫描其他 Agent 或其他日期）
  4. 按命名规范组装文件名（NN-类型-简述.md）
  5. 使用标准头部模板并填充所有必填字段
  6. 自检: 目录包含 agent+日期、文件名包含序号、内容包含真实日期和 Agent

🔴 写入后必须:
  1. 更新记忆文件 → 追加报告链接到「📄 关联报告」表格
     链接格式: [NN-类型-简述.md](../../../../../reports/<子目录>/<agent>/YYYYMMDD/NN-类型-简述.md)
  2. 对话中输出结论摘要 + 报告文件路径
  3. 禁止在对话中重复输出报告中的大段内容
  4. 🆕 v2.12.0 调用 open(报告文件绝对路径) 自动打开报告文件（详见下方说明）

🔴 报告写入后自动打开（🆕 v2.12.0）:
  AI 写完报告文件后，必须立即调用 open() 工具打开该文件，无需询问用户。

  open() 调用规范:
    - 传入报告文件的绝对路径
    - 在"更新记忆文件"和"对话中输出摘要"之后调用（不阻塞其他写入步骤）
    - 每次会话只需 open() 最终报告文件（中间草稿/temp 文件不打开）

  实现限制（诚实说明）:
    - open() 以系统默认程序打开文件
    - .md 文件是否以"预览模式"打开，取决于用户系统的默认关联程序:
        ✅ Typora / Obsidian → 直接预览
        ✅ VS Code → 打开源码，用户可手动 Ctrl+Shift+V 切换预览
        ✅ Zed → 打开源码，用户可手动触发 Markdown Preview
        ⚠️ 记事本 / TextEdit → 打开源码（无预览）
    - AI 无法直接触发编辑器内置的"预览模式"命令
    - 推荐用户将系统默认 .md 打开程序设置为 Typora 或 Obsidian 以获得最佳体验

  ❌ 绝对禁止:
    - 询问用户"要不要打开报告？"
    - 忘记调用 open()（写完报告不打开）
    - 打开 .temp/ 目录下的中间过程文件

  ✅ 正确执行顺序:
    1. edit_file() 写入报告
    2. edit_file() 更新记忆文件（追加报告链接）
    3. open(报告绝对路径)           ← 自动打开
    4. 对话中输出摘要 + 报告路径

🔴 执行中实时更新报告状态（🆕 v1.7 — NO EXCEPTIONS）:
  报告中列出的待修复问题/待办项，每完成一个立即在报告中标记 ✅。
  不要等全部完成再批量更新 — 中途因 token 耗尽或其他原因中断时，
  报告本身就是进度的实时快照，下次恢复可直接看到哪些已完成、哪些待做。

  示例:
    报告列出 5 个 Bug 需要修复:
      - [x] BUG-001: xxx ✅        ← 修完立即更新
      - [x] BUG-002: yyy ✅        ← 修完立即更新
      - [x] BUG-003: zzz ✅        ← 修完立即更新
      - [ ] BUG-004: aaa           ← 还没修（此时中断，进度清晰）
      - [ ] BUG-005: bbb

  ❌ 错误做法: 修完 5 个 Bug 后才一次性把报告全部标 ✅（中途中断则全部丢失进度）
  ✅ 正确做法: 每修完一个就回到报告文件更新对应条目

🔴 任务完成时更新报告头部状态（🆕 v1.7）:
  任务全部完成后，将报告头部 **状态** 字段从 📝 进行中 改为 ✅ 已完成。
  如仍有未完成项 → 报告中明确标注遗留项，状态保持 📝 进行中。

清理策略:
  - .temp/ 下文件可随时清理
  - 其他目录保留 30 天
  - 用户可以说"清理临时报告"触发
```

---

## 📊 同主题多版本报告

当同一天产生多次报告时，序号自然区分先后顺序：

```yaml
示例 — zed-copilot 一天内做了 5 个报告（reports/analysis/zed-copilot/20260228/）:
  01-analysis-architecture.md          # 上午：架构总体分析
  02-analysis-hot-reload.md            # 上午：热重载专项分析
  03-verify-architecture.md            # 下午：对 01 的验证
  04-analysis-cluster.md               # 下午：集群分析
  05-verify-architecture-2nd.md        # 晚上：第二次验证

示例 — 同一天 webstorm-copilot 也做了 2 个报告（reports/analysis/webstorm-copilot/20260228/）:
  01-analysis-api-design.md            # 独立编号，从 01 开始
  02-bug-auth-flow.md

识别最新版本:
  - 同一 Agent 同一天：序号最大的即为最新
  - 跨天：日期目录最大的即为最新
  - 跨 Agent：按 Agent 目录分别查看
  - 目录内按文件名排序 = 按序号排序

建议:
  - 最新版本的报告可以在头部注明"替代: 20260228-01-analysis-architecture.md"
  - 旧版本不必删除，30 天后自动清理
```

---

**最后更新**: 2026-03-02
