# 快速参考

> AI 执行任务时的速查手册

**版本**: v2.11.0  
**最后更新**: 2026-02-27

---

## 🔍 预检查 (每次必做)

```text
📋 预检查:
1. 工作区: [当前路径]
2. 任务类型: [需求/Bug/优化/分析/...]
3. 输出位置: [projects/<project>/...]
4. Agent: [zed-copilot / webstorm-copilot / cursor / vscode-copilot / ...]
5. 上次记忆: [.ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN + 状态] 或 [⚠️ 无]
6. 📝 记忆已创建: [.ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN (🔄)] ← 🔴 阶段0 硬性阻塞
```

### 🏷️ Agent 标识速查

| 编辑器 + AI | 标识值 |
|------------|--------|
| Zed + GitHub Copilot | `zed-copilot` |
| WebStorm + GitHub Copilot | `webstorm-copilot` |
| VS Code + GitHub Copilot | `vscode-copilot` |
| Cursor | `cursor` |
| VS Code + Cline | `vscode-cline` |
| Windsurf | `windsurf` |
| 其他 | `<editor>-<ai-provider>` |

> **为什么需要 Agent？** 用户可能同时使用多个编辑器的 AI 助手，Agent 标识用于区分记忆来源，避免混乱。
> 详见 [core/workflows/common/task-memory.md §多 Agent 支持](./workflows/common/task-memory.md)

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

> 🔴 **混合意图规则**（FIX-010）：请求同时含"分析"和变更意图（调整/重构/修改/移动/拆分）时 → **需求开发**，不是深度分析。详见 `core/workflows/00-task-identification/rules.md §混合意图优先级规则`

---

## 📝 执行模式

### 快速模式 (默认)

| 项目 | 说明 |
|-----|------|
| 适用 | 简单需求、小改动、< 5 个文件 |
| 流程 | 5 阶段（理解→方案→实施方案→执行→报告） |
| 模板 | `core/templates/lite/` |
| 时间 | 15-30 分钟 |

### 完整模式

| 项目 | 说明 |
|-----|------|
| 适用 | 复杂需求、核心功能、正式交付 |
| 流程 | 7 阶段（+生成文档+验证检查） |
| 模板 | `core/templates/core/` |
| 时间 | 45-90 分钟 |

### 模式切换

- 用户说 "快速"、"简单" → 快速模式
- 用户说 "完整"、"详细"、"需要文档" → 完整模式
- 用户说 "只要代码" → 跳过文档

---

## ✅ 确认点 (CP)

| 确认点 | 时机 | 必须等待用户 |
|-------|------|-------------|
| CP1 | 需求理解后 | ✅ 是 |
| CP2 | 技术方案后 | ✅ 是 |
| CP3 | 实施方案后（含实施前检查） | ✅ 是 - 确认所有变更内容后才执行 |

> **完整模式额外确认点**: CP4 (测试完成后)、CP5 (文档生成后)  
> 详见 [core/workflows/common/confirmation-points.md](./workflows/common/confirmation-points.md)

---

## 📂 输出路径

> 🔴 所有路径以 `ai-dev-guidelines/projects/<project>/` 为根，**禁止写入项目源码目录**。详见 [00-pre-check Step 3](./workflows/00-pre-check/README.md)

```
ai-dev-guidelines/projects/<project-name>/
├── optimizations/<中文描述>/    # 任务产物（工作流交付物）
├── requirements/<中文描述>/
├── bugs/<中文描述>/
├── reports/<子目录>/<agent>/YYYYMMDD/  # 报告（会话分析载体）
└── .ai-memory/clients/<agent>/tasks/   # 记忆（索引）
```

> **任务产物** = 工作流交付物（文件名用中文，如 `01-性能基线.md`）。详见各 `core/workflows/` 的 §命名规范  
> **报告** = 会话分析载体（`NN-<类型>-<中文简述>.md`）。详见 [temp-reports.md](./workflows/common/temp-reports.md)  
> **产物 vs 报告缺一不可**，预检查 Step 3 必须同时构建两条路径

---

## 📋 模板选择

| 任务类型 | 快速模式 | 完整模式 |
|---------|---------|---------|
| 需求开发 | `lite/requirement-lite.md` | `core/requirement-template.md` |
| 技术方案 | `lite/technical-lite.md` | `core/technical-template.md` |
| 实施方案 | `lite/implementation-lite.md` | `core/implementation-template.md` |
| Bug 分析 | `lite/bug-analysis-lite.md` | `core/bug-analysis-template.md` |
| 性能优化 | `lite/optimization-lite.md` | `core/optimization-template.md` |
| 技术调研 | `lite/research-lite.md` | `extended/research-template.md` |
| 架构重构 | `lite/refactoring-lite.md` | `extended/refactoring-template.md` |
| 深度分析 | `lite/analysis-lite.md` 🆕 | - |
| 系统对接 | - | `core/integration-template.md` |

---

## 🤖 多编辑器 / 多 Agent 速查

### 🔴 报告为主体、记忆为索引 + 消息驱动 5 阶段（v2.10.0）

```yaml
架构:
  报告文件（reports/）  = 完整分析内容（主体），存放于 <agent>/YYYYMMDD/，命名 NN-<类型>-<简述>.md（🆕 v1.6）
  记忆文件（.ai-memory/）= 摘要 + 报告链接 + 对话记录（索引），命名 YYYYMMDD.md（🆕 v1.7 每天一文件）
  对话输出             = 结论摘要 + 报告路径

🔴 序号独立规则（v2.10.0 / task-memory v1.8 / temp-reports v1.7）:
  - 报告 NN 序号: 仅扫描 reports/<子目录>/<agent>/YYYYMMDD/ 目录计算，与记忆无关
  - 记忆文件: 不再使用 NN 序号，直接以日期命名（YYYYMMDD.md）
  - 记忆内部会话编号: 文件内以 ## 会话 NN 分段（NN 为当天第几个会话）
  - ❌ 禁止报告和记忆共享全局序号（v1.6 及之前的设计缺陷，已废弃）

🔴 消息驱动 5 阶段触发时机（task-memory v1.8）:
  阶段 0: 会话初始化（首条消息时 — 预检查 + 🔴 第 6 行记忆写入硬性阻塞 — 创建/追加记忆 YYYYMMDD.md）
  阶段 1: 用户发消息时（捕获用户输入 — 新意图/需求/修正）
  阶段 2: AI 回复时（写报告 + 更新记忆 + 追加对话记录含关联引用）
  阶段 3: AI 执行完毕时（记录变更清单 + 🔴 实时更新报告中已完成问题项状态 — 与阶段 2 通常合并写入）
  阶段 4: 任务结束时（最终状态更新 ✅ — 含报告头部状态 📝→✅）

  典型顺序: 0 → 1 → 2+3 → 1 → 2+3 → ... → 4
  阶段 1 过滤: 纯确认（"好的"/"Y"）、流程控制（"继续"）不触发

❌ 绝对禁止询问用户是否写入报告/记忆（约束 #17）

下次会话恢复: 读记忆（最新日期文件末尾）→ 读📨对话记录（快速回忆脉络）→ 跟链接读报告 → 完整上下文
```

> 详见 [core/workflows/common/task-memory.md §触发时机](./workflows/common/task-memory.md)
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

> 详见 [core/workflows/common/task-memory.md §多 Agent 支持](./workflows/common/task-memory.md)

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

## ⚠️ 核心约束 (20条)

1. **删除操作需确认** - 删除代码/文件前必须用户确认
2. **Git 操作需确认** - commit/push 前必须用户确认
3. **方案选择需确认** - 多方案时必须用户决策
4. **多任务需拆分** - 同时多个任务建议分开执行
5. **错误处理** - 所有代码必须有错误处理
6. **禁止硬编码** - 敏感信息必须用环境变量
7. **结构化输出** - 所有输出必须结构化
8. **报告需验证** - 分析报告必须逐项验证，按 🔴/🟡/💡/❌ 分类
9. **🔴 文件名日期规则** - 报告文件在 `<agent>/YYYYMMDD/` 目录下命名 `NN-<类型>-<简述>.md`（NN 仅扫描该目录）；记忆文件必须 `YYYYMMDD.md`（每天一文件，无 NN）
10. **🔴 多 Agent 目录隔离** - 记忆写入 `clients/<agent>/`，不写入其他 Agent 目录
11. **修复需扫描** - 修复后必须全局扫描同类问题+数据联动检查
12. **主动合理性分析** - 收到指令先评估合理性，有更好建议先提出
13. **自动关联文件检查** - 修改文件时自动扫描关联文件并同步
14. **🔴 规范修改需交叉验证** - 修改任何规范文件后，必须逐个检查所有引用该规范的文件是否需要同步更新（见下方交叉验证清单）
15. **🔴 任务完成验证** - 声称任务完成前必须验证：输出文件存在性 + 内容结构完整性 + 记忆已更新（见 task-memory.md §任务完成验证）
16. **🔴 文件修改需确认** - 涉及文件修改/删除操作必须先输出变更计划，等待用户确认后再执行（纯分析/只读/报告/记忆写入除外）
17. **🔴 报告+记忆自动输出** - 每次会话必须：自动写入报告文件（reports/）+ 更新记忆（.ai-memory/），禁止询问用户
18. **🔴 消息驱动记忆触发** - 记忆写入以消息事件为锚点（阶段 0~4），用户发消息时捕获输入（阶段 1），AI 回复时写报告（阶段 2），执行完毕记录变更（阶段 3）
19. **🔴 报告/记忆序号独立** - 报告 NN 仅扫描 reports/ 目录；记忆使用 YYYYMMDD.md 无序号；禁止共享全局序号池（🆕 v2.10.0）
20. **🔴 文件过大必须拆分** - AI 新创建的 `.md` 文件超过 500 行必须拆分（已有文件豁免）（🆕 v2.11.0）

> 完整说明见 [CONSTRAINTS.md](./CONSTRAINTS.md)

---

## 🔴 规范修改交叉验证清单

> **何时触发**: 修改任何规范文件（`.github/copilot-instructions.md`、`core/workflows/`、`core/standards/`、`QUICK-REFERENCE.md`）后必须执行。
>
> **为什么**: 规范体系由 6+ 个文件组成，同一规则在多处引用。只改一处不改其他 = 不一致 = AI 执行混乱。

### 必须交叉检查的文件对

| 当你修改了... | 必须同步检查 | 检查什么 |
|-------------|------------|---------|
| `.github/copilot-instructions.md` | `00-pre-check/README.md`、`QUICK-REFERENCE.md` | 预检查项数、禁止行为、格式示例 |
| `core/workflows/00-pre-check/README.md` | `copilot-instructions.md`、`task-memory.md` | 预检查项数、记忆写入路径、Agent 检测逻辑 |
| `core/workflows/common/task-memory.md` | `copilot-instructions.md`、`00-pre-check/README.md`、`temp-reports.md` | 文件名格式、Agent 方案（共享 vs 隔离）、报告与记忆关系、恢复流程 |
| `core/workflows/common/temp-reports.md` | `copilot-instructions.md`、`QUICK-REFERENCE.md`、`task-memory.md`、`doc-standards.md` | 报告命名格式、报告与记忆关系、自动输出规则 |
| `QUICK-REFERENCE.md` | `copilot-instructions.md` | 约束条数、关键原则 |
| `CONSTRAINTS.md` | `QUICK-REFERENCE.md`、`copilot-instructions.md`、`decision-tree.yaml` | 约束条数、约束内容一致性 |
| `core/standards/doc-standards.md` | `temp-reports.md`、`QUICK-REFERENCE.md` | 文件命名规范 |
| `CHANGELOG.md` | `changelogs/v<当前版本>.md` | 版本概览条目是否存在 + 变更摘要一致 |
| `changelogs/v<新版本>.md` | `CHANGELOG.md` | 概览表是否已新增对应行 + 链接有效 |
| `META.yaml` | `bump-version.js` 同步的所有文件 | 运行 `node core/tools/bump-version.js` 验证 |
| **任何涉及版本号变更** | **先修改 `META.yaml`，再运行 `bump-version.js --apply`** | **版本号 + 最后更新日期（8 文件自动同步）** |
| **新增/删除约束** | **先修改 `META.yaml`，再运行 `bump-version.js --apply`** | **约束条数数值（11 文件自动同步）+ 标题/注释/描述一致** |
| `core/workflows/common/task-memory.md` 版本号变更 | `META.yaml` `independent_versions`、`memory-and-rules.md` 标题、`QUICK-REFERENCE.md` 引用处、`CONSTRAINTS.md` #9 引用处 | 🔴 独立版本号必须同步到 META.yaml + 全文搜索旧版本号引用 |
| `core/workflows/common/temp-reports.md` 版本号变更 | `META.yaml` `independent_versions`、`QUICK-REFERENCE.md` 引用处、`CONSTRAINTS.md` #9 引用处 | 🔴 独立版本号必须同步到 META.yaml + 全文搜索旧版本号引用 |
| 🔴 **`core/workflows/` 流程变更** | **`docs/execution-workflow-guide/` 对应章节** | **预检查/确认点/记忆机制/工作流步骤是否在用户指南中同步更新** |
| 🔴 **`core/self-fix/` 机制变更** | **`docs/spec-self-fix-guide/` 对应章节** | **检测规则/触发场景/修复模式/防复现机制是否在用户指南中同步更新** |
| **新增/删除工作流** | `docs/execution-workflow-guide/01-task-workflows.md`、`docs/execution-workflow-guide/README.md` §关键词映射表 | 新工作流是否已添加到用户指南的任务类型列表和关键词映射 |
| **新增/删除约束** | `docs/execution-workflow-guide/03-faq.md` | FAQ 中约束相关描述是否已更新 |
| 🔴 **预检查项数/工作流数量/约束条数/行数引用变更** | **`docs/DESIGN-PHILOSOPHY.md`** | **§架构全景图中的数据（预检查项数、工作流数量、约束条数、QUICK-REFERENCE 行数等）是否已同步更新** |

### 🔴 版本号文件清单（发布新版本时必须全部同步）

> **为什么单独列出？** 版本号遗漏已反复发生 3 次（BUG-023~031），根因是没有一份明确的"哪些文件含版本号"清单。以下 8 个文件包含版本号字段，发布新版本时**必须全部检查并更新**：

| # | 文件路径 | 版本号位置 | 说明 |
|:-:|---------|-----------|------|
| 1 | `.github/copilot-instructions.md` | L1 `**版本**: vX.Y.Z` | 入口文件 |
| 2 | `README.md` | L3 `> **版本**: vX.Y.Z` | 项目主入口 |
| 3 | `QUICK-REFERENCE.md` | L5 `**版本**: vX.Y.Z` | 速查手册 |
| 4 | `CONSTRAINTS.md` | L6 `**版本**: vX.Y.Z` | 约束清单 |
| 5 | `STATUS.md` | L5 `**当前版本**: vX.Y.Z` | 项目状态 |
| 6 | `CHANGELOG.md` | 版本概览表新增行 | 变更日志 |
| 7 | `core/workflows/decision-tree.yaml` | L1 注释 + L4 `version` 字段 + L82 注释 + L87 `mandatory_precheck.version` | 决策树配置 |
| 8 | `core/workflows/00-pre-check/README.md` | L3 `> **版本**: vX.Y.Z` + 文件末尾 `**版本**: vX.Y.Z`（两处） | 预检查工作流 |

> ⚠️ 此清单新增文件时必须同步更新。独立版本号文件（如 task-memory.md v1.8、temp-reports.md v1.7）不在此清单中，见下方独立版本号检查规则。

### 🔴 约束条数引用清单（新增/删除约束时必须全部同步）

> **为什么单独列出？** 约束条数遗漏与版本号遗漏属于同一类跨文件数值同步问题（BUG-032~042）。根因是没有一份"哪些文件引用了约束条数"的完整清单，每次新增约束只改了 CONSTRAINTS/QUICK-REFERENCE/copilot-instructions 三处，遗漏了其他 8+ 处。以下文件包含约束条数数值，新增或删除约束时**必须全部检查并更新**：

| # | 文件路径 | 引用位置 | 当前值 |
|:-:|---------|---------|:------:|
| 1 | `CONSTRAINTS.md` | §标题 `核心约束（20 条）` + §速查表 + §尾部变更 | 20 |
| 2 | `QUICK-REFERENCE.md` | §标题 `核心约束 (20条)` | 20 |
| 3 | `.github/copilot-instructions.md` | 入口表 `执行约束（20 条）` | 20 |
| 4 | `README.md` | 目录树注释 `约束清单（20 条）` | 20 |
| 5 | `STATUS.md` | v2.0 核心改进表 `约束体系 20 条` | 20 |
| 6 | `core/workflows/decision-tree.yaml` | 注释 `编号对齐 CONSTRAINTS.md 的 20 条约束` + constraints 条目数 | 20 |
| 7 | `projects/dev-docs/profile/README.md` | 目录树注释 + 关键文档表格（两处） | 20 |
| 8 | `projects/dev-docs/profile/01-项目信息.md` | 目录树注释 + 关键指标表格（两处） | 20 |
| 9 | `projects/dev-docs/profile/02-架构约束.md` | 相关文档链接描述 | 20 |
| 10 | `changelogs/v<当前>.md` | 相关链接描述 | 20 |
| 11 | `core/self-fix/detection/conflict-detection.md` | §规则 6 检测示例基准值 | 20 |

> ⚠️ 此清单新增引用文件时必须同步更新。与版本号清单独立维护（版本号 8 文件 ≠ 约束条数 11 文件）。

### 检查清单（每次修改后逐条确认）

```yaml
□ 预检查项数: copilot-instructions.md / 00-pre-check / QUICK-REFERENCE 三处一致？
□ 文件命名: 报告在 `<agent>/YYYYMMDD/` 目录下使用 `NN-<类型>-<简述>.md` 格式（NN 独立）？记忆使用 YYYYMMDD.md 格式（无 NN）？
□ 多 Agent 方案: 目录隔离 clients/<agent>/（非共享目录+文件名前缀）？
□ 🔴 约束条数（主动全量）: 上方约束条数引用清单 11 个文件是否全部一致？（逐个 read_file 确认，禁止推断）（当前 20 条）
□ 版本号（被动）: 修改的文件已更新版本号和最后更新日期？
□ 🔴 版本号（主动全量）: 上方 8 个文件的版本号是否全部一致？（逐个 read_file 确认，禁止推断）或运行 `node core/tools/bump-version.js` 自动检查
□ 🔴 独立版本号（主动）: META.yaml `independent_versions` 中的版本号与各文件头部实际版本号一致？（task-memory.md / temp-reports.md / core/self-fix/README.md）全文搜索旧版本号确认无残留引用？
□ 🔴 CHANGELOG ↔ changelogs/ 同步: CHANGELOG.md 概览表是否包含当前版本？changelogs/v<当前版本>.md 是否存在？（bump-version.js 已含此检查）
□ 禁止行为: copilot-instructions.md 和 00-pre-check 的禁止清单对齐？
□ 交叉引用路径: 所有 [链接](./path) 指向的文件确实存在？
□ 🔴 docs/ 用户指南同步: 本次修改涉及的流程/机制是否在 `docs/` 下有对应用户指南？如有，是否已同步更新？（execution-workflow-guide/ 和 spec-self-fix-guide/）
□ 🔴 docs/DESIGN-PHILOSOPHY.md 同步: 架构全景图中的数据（预检查项数/工作流数量/约束条数/行数引用等）是否与实际一致？
```

---

## 🔗 相关文档

- [README.md](./README.md) - 项目入口
- [CONSTRAINTS.md](./CONSTRAINTS.md) - 完整约束
- [core/best-practices/WHEN-TO-USE.md](./best-practices/WHEN-TO-USE.md) - 问题速查
- [core/workflows/](./workflows/) - 工作流详情
- [core/templates/](./templates/) - 模板详情
- [core/workflows/common/task-memory.md](./workflows/common/task-memory.md) - 记忆机制（含多 Agent）
- [core/workflows/common/temp-reports.md](./workflows/common/temp-reports.md) - 临时报告规范

---

**版本**: v2.11.0  
**最后更新**: 2026-02-27  
**v2.11.0 变更**: 入口文件瘦身（~120行→~36行）；SUMMARY.md 精简优化；全面审计修复5个Bug（BUG-023~027）；QUICK-REFERENCE/CONSTRAINTS 版本号对齐 v2.11.0  
**v2.10.0 变更**: 记忆从"每会话一文件"改为"每天一文件"（YYYYMMDD.md）；取消记忆 NN 序号；报告 NN 独立于记忆（仅扫描 reports/）；对话记录表格从 3 列→4 列（新增"关联引用"列）；新增约束 #19；约束从 18→19 条；task-memory v1.6→v1.7；temp-reports v1.4→v1.5  
**v2.9.0 变更**: 记忆触发时机从"AI 内部 4 阶段"升级为"消息驱动 5 阶段"（阶段 0~4）；新增阶段 1（用户发消息时捕获输入）；记忆模板新增 §📨 对话记录；新增约束 #18；约束从 17→18 条  
**v2.8.0 变更**: 新增约束 #17"报告+记忆自动输出"；新增"报告为主体、记忆为索引"架构说明；约束从 16→17 条；交叉验证对照表增加 CONSTRAINTS.md 和 temp-reports.md 关联；预检查扫描注意事项（禁止 glob 扫描隐藏目录）  
**v2.7.0 变更**: 预检查从 4 项改为 5 项必做（新增"上次记忆"）；约束从 15→16 条（新增 #16"文件修改需确认"）  
**v2.6.0 变更**: 版本号统一为 v2.6.0；多 Agent 策略改回目录隔离；新增任务完成验证  
**v2.3.0 变更**: 预检查新增 Agent 标识（第 4 项）、新增日期强制执行规范、新增 analysis-lite 模板条目、新增多编辑器/多 Agent 速查段落