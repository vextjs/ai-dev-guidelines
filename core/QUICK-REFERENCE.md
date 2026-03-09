# 快速参考

> AI 执行任务时的速查手册

**版本**: v2.14.0  
**最后更新**: 2026-03-06

---

## 🔍 预检查 (每次必做)

```text
📋 预检查:
1. 工作区: [当前路径]
2. 任务类型: [需求/Bug/优化/分析/...]
3. 输出位置: [projects/<project>/...]
4. Agent: [zed-copilot / webstorm-copilot / cursor / vscode-copilot / ...]
5. 上次记忆: [projects/<project>/.ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN + 状态] 或 [⚠️ 无]
6. 📝 记忆已创建: [projects/<project>/.ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN (🔄)] ← 🔴 阶段0 硬性阻塞
```

### 💡 **会话的前三个 tool call 必须严格按以下顺序执行，完成前禁止执行任何分析性文件读取：**

1. `now()` — 获取真实日期时间
2. `list_directory(ai-dev-guidelines/projects/<project>/.ai-memory/clients/<agent>/tasks/)` — 扫描记忆目录
3. `edit_file(记忆文件)` — 创建/追加今日记忆文件（阶段0硬性阻塞）

> ❌ `read_file(QUICK-REFERENCE.md)` **不得作为前三个 tool call 之一**

### 🏷️ Agent 标识速查

> 🔴 **检测优先级**：结构特征检测（最可靠）→ 关键字检测（兜底）→ 用户明确提及 → `unknown-agent`

**第一优先：结构特征检测（优先于关键字，更可靠）**

| 检测目标 | 特征 | 结论 |
|---------|------|------|
| 编辑器 = Zed | 系统提示词含 `## System Information` + `## Model Information` 块（Zed Agent 面板独有注入格式） | 编辑器 → Zed |
| 编辑器 = Zed | 用户消息含 `@文件名` 引用语法（格式：`[@xxx](file:///...)`） | 编辑器 → Zed |
| 编辑器 = Zed | 用户消息含 `zed:///` URL scheme | 编辑器 → Zed |
| Service = Copilot | `.github/copilot-instructions.md` 内容被注入到系统提示词（无论底层模型是 GPT/Claude/Gemini） | Service → GitHub Copilot |
| Service = Cline | `.clinerules` 内容被注入到系统提示词 | Service → Cline |
| Service = Claude Code | `CLAUDE.md` 内容被注入到系统提示词 | Service → Claude Code |

> 编辑器 + Service 合并推断标识值，例：Zed + Copilot → `zed-copilot`

**第二优先：关键字检测（兜底，结构特征未命中时使用）**

| 编辑器 + AI | 标识值 | 关键字线索（兜底） |
|------------|--------|----------|
| Zed + GitHub Copilot | `zed-copilot` | 系统提示词含 "Zed" |
| WebStorm + GitHub Copilot | `webstorm-copilot` | 系统提示词含 "JetBrains" / "WebStorm" |
| VS Code + GitHub Copilot | `vscode-copilot` | 系统提示词含 "VS Code" / "Visual Studio Code" |
| Cursor | `cursor` | 系统提示词含 "Cursor" |
| VS Code + Cline | `vscode-cline` | 系统提示词含 "Cline" |
| Windsurf | `windsurf` | 系统提示词含 "Windsurf" |
| 其他 | `<editor>-<ai-provider>` | — |

> 🔴 **禁止默认猜测 Agent（FIX-012）**：必须通过结构特征或关键字检测、用户明确提及、或已有记忆目录来确定 Agent。
> **无法确定时必须使用 `unknown-agent` 并立即提示用户确认，禁止基于"VS Code 最常见"而默认推断。**
> 详见 [00-pre-check/README.md §Step 4](./workflows/00-pre-check/README.md) / [task-memory/multi-agent.md](./workflows/common/task-memory/multi-agent.md)

---

## 🔴 日期与必填字段（强制执行）

### 文件名日期前缀

所有输出文件**必须**以日期开头（报告和记忆格式不同）：

```yaml
# 报告文件（reports/<子目录>/<agent>/YYYYMMDD/ 下）— NN-<类型>-<简述>.md（🆕 v1.6）:
✅ 正确: reports/analysis/zed-copilot/20260226/01-analysis-v3-architecture-deep-review.md
✅ 正确: reports/bugs/webstorm-copilot/20260227/02-bug-login-timeout.md

# 记忆文件（.ai-memory/clients/<agent>/tasks/ 下）— YYYYMMDD.md（🆕 v1.7 每天一文件，无 NN）:
✅ 正确: 20260226.md
✅ 正确: 20260227.md

❌ 错误: reports/analysis/20260226-01-analysis-xxx.md  # 旧格式（缺少 agent/YYYYMMDD 目录层级）
❌ 错误: reports/analysis/zed-copilot/01-analysis-xxx.md  # 缺少日期目录
❌ 错误: reports/analysis/zed-copilot/20260227/20260227-01-analysis-xxx.md  # 文件名重复包含日期
❌ 错误: 20260227-01-REQ-user-auth.md               # 记忆文件不应有 NN（v1.6 旧格式）
```

### 文档头部必填字段

```yaml
🔴 每次生成文档前，AI 必须逐项确认:
  - [ ] 日期字段不包含 "YYYY" 占位符？（已替换为真实日期）
  - [ ] 日期通过 now() 工具获取？
  - [ ] Agent 字段已填写当前编辑器/AI 标识？
  - [ ] 文件名符合命名规范？（报告: `NN-<类型>-<简述>.md` 在日期目录下；记忆: `YYYYMMDD.md`）
  - [ ] 项目名称为真实项目名？
```

> 详见 [core/templates/common/header.md](./templates/common/header.md) 和 [core/templates/README.md §必填字段规范](./templates/README.md)

---

## 🎯 任务类型映射

| 关键词 | 任务类型 | 工作流路径 |
|-------|---------|-----------|
| 实现、开发、添加、集成、新增 | 需求开发 | `core/workflows/01-requirement-dev/` |
| 修复、解决、Bug、报错、异常 | Bug 修复 | `core/workflows/02-bug-fix/` |
| 优化、慢、性能、加速 | 性能优化 | `core/workflows/03-optimization/` |
| 调研、选型、对比、POC | 技术调研 | `core/workflows/04-research/` |
| 重构、重写、改造、升级 | 架构重构 | `core/workflows/05-refactoring/` |
| 数据库、迁移、Schema | 数据库变更 | `core/workflows/06-database/` |
| 安全、漏洞、加固 | 安全修复 | `core/workflows/07-security/` |
| 事故、故障、复盘 | 事故复盘 | `core/workflows/08-incident/` |
| 新项目、开源、npm包、初始化 | 开源项目初始化 | `core/workflows/09-opensource-init/` 🆕 |
| 分析、审查、评估、深度分析 | 深度分析 | `core/workflows/10-analysis/` 🆕 |
| 自我审查、规范审查、spec audit、全面体检、规范健康检查 | 规范自我审查 | `core/workflows/11-self-audit/` 🆕 |

> 🔴 **意图推断规则**（v2.13.0，FIX-010 升级为 Layer 3）：不依赖关键词列表判定，而是分析用户**最终目的**（Layer 3 三问：Q1 最终目的是变更还是获得结论？Q2 分析是手段还是目的？Q3 是否有具体执行事项？）。任一问题指向变更 → **需求开发**，必须走 CP1→CP2→CP3。三问全部指向纯分析才走 10-analysis。详见 `core/workflows/00-task-identification/rules.md §Layer 3 意图推断`（已修复 issue#2/#11 根因）

---

## 📝 执行流程（统一 7 阶段）

> 🔴 **v2.13.0 起移除快速/完整双模式，所有需求开发统一为 7 阶段流程**（issue#16 — 快速模式是多次流程跳过问题的温床 #11/#14/#15）

| 项目 | 说明 |
|-----|------|
| 流程 | 7 阶段（理解→方案→实施方案→执行→报告→归档文档→验证检查） |
| 确认点 | CP1→CP2→CP3（强制）+ CP4（测试，按需）+ CP5（文档，按需） |
| 模板 | 小需求用 `core/templates/lite/`，大需求用 `core/templates/core/` |
| 文档产物 | 所有需求均须生成归档文档（小需求可精简内容，但文件必须存在） |

### 模板选择规则

- 小需求（< 5 个文件、单模块）→ 使用 `lite/` 精简模板，归档文档内容可精简
- 大需求（>= 5 个文件、多模块协作）→ 使用 `core/` 完整模板，归档文档内容完整
- 用户说 "只要代码" → 归档文档仍须生成（精简版），但不做额外润色

---

## ✅ 确认点 (CP)

| 确认点 | 时机 | 必须等待用户 | 确认后的唯一合法下一步 |
|-------|------|-------------|----------------------|
| CP1 | 需求理解后 | ✅ 是 | 生成技术方案 → 输出并等待 CP2 |
| CP2 | 技术方案后 | ✅ 是 | 生成实施方案（⚠️ 不是执行代码）→ 输出并等待 CP3 |
| CP3 | 实施方案后（含实施前检查） | ✅ 是 - 🟢 代码执行授权点 | 按实施方案逐文件执行代码变更 |
| CP4 | 测试完成后（按需） | ✅ 是 | 进入归档文档生成 |
| CP5 | 归档文档生成后（按需） | ✅ 是 | 完成任务 |

> 🔴 **CP 间过渡防护（FIX-015）**：每个 CP 的"确认"仅代表该阶段产物被认可，不等于授权执行后续阶段操作。**只有 CP3 确认才构成代码执行授权**。禁止将 CP2 确认等同于 CP3 确认、合并或跳过任何确认点。  
> 详见 [core/workflows/common/confirmation-points.md](./workflows/common/confirmation-points.md)

---

## 📂 输出路径

> 🔴 所有路径以 `ai-dev-guidelines/projects/<project>/` 为根，**禁止写入项目源码目录**。详见 [00-pre-check Step 3](./workflows/00-pre-check/README.md)

```
ai-dev-guidelines/projects/<project-name>/
├── optimizations/<中文描述>/           # 任务产物（工作流交付物）
├── requirements/<中文描述>/
│   ├── 01-需求定义.md                  #   需求层（做什么）
│   ├── 02-技术方案.md 或 02-技术方案/   #   方案层（怎么做）
│   ├── 03-实施方案/                    #   实施层（具体改什么，>= 5 文件时生成目录）
│   └── IMPLEMENTATION-PLAN.md         #   🔴 实施计划（强制，任务编号+进度+中断恢复）
├── bugs/<中文描述>/
├── reports/<子目录>/<agent>/YYYYMMDD/  # 报告（会话分析载体）
└── .ai-memory/clients/<agent>/tasks/   # 记忆（索引）
```

> **任务产物** = 工作流交付物（文件名用中文，如 `01-性能基线.md`）。详见各 `core/workflows/` 的 §命名规范  
> **报告** = 会话分析载体（`NN-<类型>-<中文简述>.md`）。详见 [temp-reports.md](./workflows/common/temp-reports.md)  
> **产物 vs 报告缺一不可**，预检查 Step 3 必须同时构建两条路径

---

## 📋 模板选择

| 任务类型 | 精简模板（小需求） | 完整模板（大需求） |
|---------|---------|---------|
| 需求开发 | `lite/requirement-lite.md` | `core/requirement-template.md` |
| 技术方案 | `lite/technical-lite.md` | `core/technical-template.md` |
| 实施方案 | `lite/implementation-lite.md` | `core/implementation-template.md` |
| Bug 分析 | `lite/bug-analysis-lite.md` | `core/bug-analysis-template.md` |
| 性能优化 | `lite/optimization-lite.md` | `core/optimization-template.md` |
| 技术调研 | `lite/research-lite.md` | `extended/research-template.md` |
| 架构重构 | `lite/refactoring-lite.md` | `extended/refactoring-template.md` |
| 深度分析 | `lite/analysis-lite.md` | - |
| 系统对接 | - | `core/integration-template.md` |
| API 接口文档 | - | `core/api-doc-template.md` |
| 前端对接 | - | `core/frontend-integration-template.md` |

> 模板选择依据：小需求（< 5 个文件、单模块）用精简模板，大需求（>= 5 个文件、多模块）用完整模板。所有需求均须生成归档文档文件。

---

## 🤖 多编辑器 / 多 Agent 速查

### 🔴 报告为主体、记忆为索引 + 消息驱动 5+1 阶段（v2.11.0）

```yaml
架构:
  报告文件（reports/）  = 完整分析内容（主体），存放于 <agent>/YYYYMMDD/，命名 NN-<类型>-<简述>.md（🆕 v1.6）
  记忆文件（.ai-memory/）= 摘要 + 报告链接 + 对话记录（索引），命名 YYYYMMDD.md（🆕 v1.7 每天一文件）
  对话输出             = 结论摘要 + 报告路径

🔴 序号独立规则（v2.10.0）:
  - 报告 NN 序号: 仅扫描 reports/<子目录>/<agent>/YYYYMMDD/ 目录计算，与记忆无关
  - 记忆文件: 不再使用 NN 序号，直接以日期命名（YYYYMMDD.md）
  - 记忆内部会话编号: 文件内以 ## 会话 NN 分段（NN 为当天第几个会话）
  - ❌ 禁止报告和记忆共享全局序号（v1.6 及之前的设计缺陷，已废弃）

🔴 消息驱动 5+1 阶段触发时机:
  阶段 0:   会话初始化（首条消息时 — 预检查 + 🔴 第 6 行记忆写入硬性阻塞 — 创建/追加记忆 YYYYMMDD.md）  ← 入口门禁
  阶段 1:   用户发消息时（捕获用户输入 — 新意图/需求/修正）
  阶段 2:   AI 回复时（写报告 + 更新记忆 + 追加对话记录含关联引用 + 🆕 v2.12.0 open() 自动打开报告）
  阶段 3:   AI 执行完毕时（记录变更清单 + 🔴 实时更新报告中已完成问题项状态 — 与阶段 2 通常合并写入）
  阶段 4.5: 执行合规性回溯检查（任务结束前 — 🔴 出口门禁，验证流程合规性）  ← 🆕 v1.9
  阶段 4:   任务结束时（最终状态更新 ✅ — 含报告头部状态 📝→✅ + 🗺️ 下一阶段建议（条件：项目有 IMPLEMENTATION-PLAN）🆕 v2.12.0）

  典型顺序: 0 → 1 → 2+3 → 1 → 2+3 → ... → 4.5 → 4
  阶段 1 过滤: 纯确认（"好的"/"Y"）、流程控制（"继续"）不触发
  入口-出口闭环: 阶段 0（入口门禁）+ 阶段 4.5（出口门禁）对称覆盖起点和终点

❌ 绝对禁止询问用户是否写入报告/记忆（约束 #17）

下次会话恢复: 读记忆（最新日期文件末尾）→ 读📨对话记录（快速回忆脉络）→ 跟链接读报告 → 完整上下文
```

> 详见 [task-memory/triggers.md §触发时机](./workflows/common/task-memory/triggers.md)
> 详见 [core/workflows/common/temp-reports.md §核心规则](./workflows/common/temp-reports.md)

### 记忆目录结构

```
projects/<project>/
├── reports/                          # 🔴 AI 会话报告（每次会话必须输出）
│   ├── analysis/                     # 深度分析/架构分析报告
│   │   ├── zed-copilot/              # 🆕 v1.6 按 Agent 隔离
│   │   │   ├── 20260226/             # 按天分目录
│   │   │   │   ├── 01-analysis-xxx.md
│   │   │   │   └── 02-bug-yyy.md
│   │   │   └── 20260227/
│   │   └── webstorm-copilot/
│   │       └── 20260227/
│   ├── diagnostics/                  # 诊断分析报告
│   │   └── <agent>/YYYYMMDD/
│   ├── bugs/                         # Bug 分析报告
│   │   └── <agent>/YYYYMMDD/
│   └── ...
│
└── .ai-memory/                       # 🔴 记忆索引（摘要+报告链接）
    ├── SUMMARY.md                    # 全局只读摘要（关键决策汇总）
    └── clients/
        ├── webstorm-copilot/         # WebStorm 专属
        │   ├── SUMMARY.md
        │   └── tasks/
        │       └── 20260227.md       # 🆕 v1.7: 每天一个记忆文件
        └── zed-copilot/              # Zed 专属
            ├── SUMMARY.md
            └── tasks/
                ├── 20260226.md       # 每天一个文件，会话内以 ## 会话 NN 分段
                └── 20260227.md
```

### 记忆文件命名（🆕 v1.7）

```yaml
格式: <YYYYMMDD>.md（在各 Agent 目录内，每天一个文件）

✅ 正确: clients/zed-copilot/tasks/20260226.md      # 纯日期命名
✅ 正确: clients/webstorm-copilot/tasks/20260227.md  # 纯日期命名
❌ 错误: clients/zed-copilot/tasks/20260226-01-ANALYSIS-v3-deep-review.md  # v1.6 旧格式（已废弃）

创建 vs 追加:
  - tasks/ 下不存在 YYYYMMDD.md → 创建新文件
  - tasks/ 下已存在 YYYYMMDD.md → 读取已有会话数 → 追加 ## 会话 NN+1
```

### 记忆文件中的对话记录（🆕 v2.10.0 — 4 列表格）

```yaml
对话记录使用 4 列表格（🆕 v1.7 新增"关联引用"列）:

  | 轮次 | 方向 | 摘要 | 关联引用 |
  |:----:|:----:|------|----------|
  | 1 | 👤→ | 分析 vext v3 的架构问题，重点看热重载 | 🧠 20260226.md, 📋 profile/README.md |
  | 1 | 🤖← | 完成架构分析，发现 3 个 P0 问题 | 📄 01-analysis-xxx |
  | 2 | 👤→ | 还要看集群部分的设计 | |
  | 2 | 🤖← | 完成集群分析，新增 2 个建议 | 📄 02-analysis-yyy |

  关联引用标记:
    📋 项目规范    📄 报告文件    🧠 记忆文件    📑 规范文件

  💡 对话记录关联引用列 = 时间线视角；§全天关联报告汇总 = 汇总视角，互补不重复
  💡 由阶段 1（用户发消息）和阶段 2（AI 回复）自动追加
  💡 纯确认性消息（"好的"/"Y"/"继续"）不记录
```

### 记忆文件中的报告引用

```yaml
记忆文件精简为摘要+报告链接+对话记录，不再堆砌分析细节:

  ## 📄 关联报告
  | 报告文件 | 类型 | 说明 |
  |----------|------|------|
  | [01-analysis-xxx.md](../../../../../reports/analysis/zed-copilot/20260227/01-analysis-xxx.md) | 深度分析 | 完整分析内容 |

  🆕 v1.6 链接路径说明:
    从 .ai-memory/clients/<agent>/tasks/YYYYMMDD.md 到 reports/<子目录>/<agent>/YYYYMMDD/ 的相对路径:
    ../../../../../reports/<子目录>/<agent>/YYYYMMDD/NN-<类型>-<简述>.md
```

### 恢复任务时的 Agent 过滤

```yaml
用户在 Zed 中说"继续":
  → 只扫描 clients/zed-copilot/tasks/ 下最新日期文件（YYYYMMDD.md）
  → 读取文件末尾最新会话的 📨 对话记录 → 快速回忆对话脉络
  → 读取记忆中的报告链接 → 读取报告文件恢复详细上下文
  → 全局 SUMMARY.md 中若有其他 Agent 未完成任务，提示用户确认后才恢复
```

### 预检查扫描注意事项

```yaml
🔴 扫描 .ai-memory 时必须使用 list_directory 逐层进入
🔴 禁止使用 find_path/glob 扫描（glob 引擎默认跳过 . 开头的隐藏目录）
🔴 list_directory 返回空时必须二次验证（🆕 v2.11.0 — BUG-047）:
   - list_directory 首次调用可能因工具缓存/索引未就绪返回错误的空结果
   - 返回 "is empty" 或 "Path not found" 时，尝试 read_file 已知文件（如 SUMMARY.md）交叉验证
   - read_file 成功 → list_directory 结果不可靠，再次调用获取真实列表
   - read_file 也失败 → 确认目录确实为空
   - 已发生事故: list_directory("clients/zed-copilot") 返回空，但文件实际存在
```

### 关键规则

- 每个 Agent 独立管理自己的 `clients/<agent>/` 目录
- 全局 `SUMMARY.md` 仅存放关键决策摘要，不存任务列表
- AI 绝不写入其他 Agent 的 `clients/` 目录
- 首次使用时自动创建 `clients/<agent>/` 目录结构
- 🔴 报告和记忆的写入是 AI 自动行为，**绝不询问用户**

> 详见 [task-memory/multi-agent.md §多 Agent 支持](./workflows/common/task-memory/multi-agent.md)

---

## 🔧 常用工具

| 场景 | 参考文档 |
|-----|---------|
| 文件太大读不完 | `core/best-practices/token-optimization.md` |
| 项目很复杂 | `core/best-practices/large-projects.md` |
| 操作出错回滚 | `core/best-practices/error-handling.md` |
| 代码不符合规范 | `core/best-practices/compliance-check.md` |
| 遇到异常情况 | `core/best-practices/edge-cases.md` |
| 跨会话继续 | `core/best-practices/memory-management.md` |

---

## 🔍 追溯历史任务

查找之前的方案/修复记录：
```
1. 读取 ai-dev-guidelines/projects/<project>/.ai-memory/SUMMARY.md（快速回忆）
2. 读取 projects/<project>/TASK-INDEX.md（正式索引）
3. 搜索关键词，定位任务 ID 和路径
4. 读取具体文档
```

> **⚠️ 强关联**: 此机制依赖各工作流（01-08）在任务完成时更新 TASK-INDEX.md + .ai-memory/  
> 模板位置: `projects/_template/TASK-INDEX.md`  
> 记忆机制: `core/workflows/common/task-memory.md`

---

## ⚠️ 核心约束 (22条)

> 💡 **分级说明**: 🔴P0 = 违反即事故（硬性阻塞）；🟡P1 = 必须执行（跳过会导致质量问题）；💡P2 = 推荐执行（提升规范性）
> ⚠️ **所有约束均为强制执行**，分级仅表示违反时的影响严重程度，不代表可以跳过

**🛡️ 操作安全（确认类）**

1. 🟡P1 **删除操作需确认** - 删除代码/文件前必须用户确认
2. 🟡P1 **Git 操作需确认** - commit/push 前必须用户确认；任务涉及源码变更时 AI 主动判断并提示提交；commit message 用中文（Conventional Commits 格式：`<type>(<scope>): <中文描述>`）
3. 💡P2 **方案选择需确认** - 多方案时必须用户决策
16. 🔴P0 **文件修改需确认** - 涉及文件修改/删除操作必须先输出变更计划，等待用户确认后再执行（纯分析/只读/报告/记忆写入除外）

**📐 代码质量**

4. 💡P2 **多任务需拆分** - 同时多个任务建议分开执行
5. 🟡P1 **错误处理** - 所有代码必须有错误处理
6. 🔴P0 **禁止硬编码** - 敏感信息必须用环境变量
7. 💡P2 **结构化输出** - 所有输出必须结构化
21. 🟡P1 **编码后诊断检查** - AI 完成代码生成/修改后必须运行 `diagnostics` 检查，发现 error 立即修复（最多 2 次），禁止遗留红色波浪线给用户（🆕 v2.12.0）

**📁 文件命名与规范**

9. 🔴P0 **文件名日期规则** - 报告文件在 `<agent>/YYYYMMDD/` 目录下命名 `NN-<类型>-<简述>.md`（NN 仅扫描该目录）；记忆文件必须 `YYYYMMDD.md`（每天一文件，无 NN）
10. 🔴P0 **多 Agent 目录隔离** - 记忆写入 `clients/<agent>/`，不写入其他 Agent 目录
20. 🟡P1 **文件过大必须拆分** - AI 新创建的 `.md` 文件超过 500 行必须拆分（已有文件豁免）（🆕 v2.11.0）

**🔍 验证与检查**

8. 🟡P1 **输出需验证** - AI 所有输出（问题、建议、方案）必须附带合理性、可实施性、必要性/收益验证；问题按 🔴/🟡/💡/❌ 分类
11. 🟡P1 **修复需扫描** - 修复后必须全局扫描同类问题+数据联动检查
12. 🟡P1 **主动合理性分析** - 收到指令先评估合理性，有更好建议先提出；🔴 任务完成后的后续建议必须在对话中直接输出摘要，禁止仅写入报告（🆕 v2.14.0）
13. 🟡P1 **自动关联文件检查** - 修改文件时自动扫描关联文件并同步
14. 🔴P0 **规范修改需交叉验证** - 修改任何规范文件后，必须逐个检查所有引用该规范的文件是否需要同步更新（见 [CROSS-VALIDATION.md](./CROSS-VALIDATION.md)）
15. 🔴P0 **任务完成验证** - 声称任务完成前必须验证：输出文件存在性 + 内容结构完整性 + 记忆已更新（见 task-memory/triggers.md §任务完成验证）

**📝 记忆与报告**

17. 🔴P0 **报告+记忆自动输出** - 每次会话必须：自动写入报告文件（reports/）+ 更新记忆（.ai-memory/），禁止询问用户
18. 🔴P0 **消息驱动记忆触发** - 记忆写入以消息事件为锚点（阶段 0~4），用户发消息时捕获输入（阶段 1），AI 回复时写报告（阶段 2），执行完毕记录变更（阶段 3）。🆕 编码任务（变更 ≥ 3 文件）触发**编码检查点**：有 IMPLEMENTATION-PLAN 按任务编号、无则每 3 文件写入 📦 检查点（详见 triggers.md §编码检查点）
19. 🔴P0 **报告/记忆序号独立** - 报告 NN 仅扫描 reports/ 目录；记忆使用 YYYYMMDD.md 无序号；禁止共享全局序号池（🆕 v2.10.0）
22. 🔴P0 **Token 耗尽防护** - AI 粗略估算 token 用量（中文1字≈2token），70% 预警（加密检查点+提示用户）、85% 防护（立即保存记忆+建议开新对话）、硬性兜底（≥15轮+≥5文件待改→强制防护）（🆕 v2.13.0）

> 完整说明见 [CONSTRAINTS.md](./CONSTRAINTS.md)

---

## 🔴 规范修改交叉验证清单

> 交叉验证清单已提取为独立文件，仅在修改规范文件时按需加载：
> 
> 👉 **[core/CROSS-VALIDATION.md](./CROSS-VALIDATION.md)** — 包含文件对照表、版本号清单（8 文件）、约束条数清单（11 文件）、🆕 日期同步清单（7 文件）、检查清单

---

## 🔗 相关文档

- [README.md](./README.md) - 项目入口
- [CONSTRAINTS.md](./CONSTRAINTS.md) - 完整约束
- [CROSS-VALIDATION.md](./CROSS-VALIDATION.md) - 规范修改交叉验证清单（修改规范时加载）
- [core/best-practices/WHEN-TO-USE.md](./best-practices/WHEN-TO-USE.md) - 问题速查
- [core/workflows/](./workflows/) - 工作流详情
- [core/templates/](./templates/) - 模板详情
- [core/workflows/common/task-memory.md](./workflows/common/task-memory.md) - 记忆机制（主文件：核心架构 + 自动输出）
  - [task-memory/triggers.md](./workflows/common/task-memory/triggers.md) - 触发时机（5+1 阶段）
  - [task-memory/templates.md](./workflows/common/task-memory/templates.md) - 模板 + 使用方式 + 维护
  - [task-memory/multi-agent.md](./workflows/common/task-memory/multi-agent.md) - 多 Agent 支持
- [core/workflows/common/temp-reports.md](./workflows/common/temp-reports.md) - 临时报告规范

---

**版本**: v2.13.0  
**最后更新**: 2026-03-06