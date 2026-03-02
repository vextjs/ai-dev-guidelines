# 🔴 规范修改交叉验证清单

> **版本**: v2.11.0  
> **最后更新**: 2026-03-02  
> **来源**: 从 `QUICK-REFERENCE.md` 提取为独立文件，降低日常 token 加载量

> **何时触发**: 修改任何规范文件（`.github/copilot-instructions.md`、`core/workflows/`、`core/standards/`、`QUICK-REFERENCE.md`）后必须执行。
>
> **为什么**: 规范体系由 6+ 个文件组成，同一规则在多处引用。只改一处不改其他 = 不一致 = AI 执行混乱。

---

## 必须交叉检查的文件对

| 当你修改了... | 必须同步检查 | 检查什么 |
|-------------|------------|---------|
| `.github/copilot-instructions.md` | `00-pre-check/README.md`、`QUICK-REFERENCE.md` | 预检查项数、禁止行为、格式示例 |
| `core/workflows/00-pre-check/README.md` | `copilot-instructions.md`、`task-memory.md`（主文件） | 预检查项数、记忆写入路径、Agent 检测逻辑 |
| `core/workflows/common/task-memory.md`（主文件） | `copilot-instructions.md`、`00-pre-check/README.md`、`temp-reports.md` | 核心架构、自动输出规则、存储位置 |
| `core/workflows/common/task-memory/triggers.md` | `00-pre-check/README.md`、`CONSTRAINTS.md`（#18） | 5+1 阶段定义、任务完成验证、恢复流程 |
| `core/workflows/common/task-memory/templates.md` | `temp-reports.md`、`QUICK-REFERENCE.md` | 记忆模板、文件命名规范、序号独立规则、归档策略 |
| `core/workflows/common/task-memory/multi-agent.md` | `CONSTRAINTS.md`（#10）、`QUICK-REFERENCE.md` | Agent 方案（目录隔离）、读写规则、检测方法 |
| `core/workflows/common/temp-reports.md` | `copilot-instructions.md`、`QUICK-REFERENCE.md`、`task-memory.md`、`doc-standards.md` | 报告命名格式、报告与记忆关系、自动输出规则 |
| `QUICK-REFERENCE.md` | `copilot-instructions.md` | 约束条数、关键原则 |
| `CONSTRAINTS.md` | `QUICK-REFERENCE.md`、`copilot-instructions.md`、`decision-tree.yaml` | 约束条数、约束内容一致性 |
| `core/standards/doc-standards.md` | `temp-reports.md`、`QUICK-REFERENCE.md` | 文件命名规范 |
| `CHANGELOG.md` | `changelogs/v<当前版本>.md` | 版本概览条目是否存在 + 变更摘要一致 |
| `changelogs/v<新版本>.md` | `CHANGELOG.md` | 概览表是否已新增对应行 + 链接有效 |
| `META.yaml` | `bump-version.js` 同步的所有文件 | 运行 `node core/tools/bump-version.js` 验证 |
| **任何涉及版本号变更** | **先修改 `META.yaml`，再运行 `bump-version.js --apply`** | **版本号 + 最后更新日期（8 文件自动同步）** |
| **新增/删除约束** | **先修改 `META.yaml`，再运行 `bump-version.js --apply`** | **约束条数数值（11 文件自动同步）+ 标题/注释/描述一致** |

| 🔴 **`core/workflows/` 流程变更** | **`docs/execution-workflow-guide/` 对应章节** | **预检查/确认点/记忆机制/工作流步骤是否在用户指南中同步更新** |
| 🔴 **`core/self-fix/` 机制变更** | **`docs/spec-self-fix-guide/` 对应章节** | **检测规则/触发场景/修复模式/防复现机制是否在用户指南中同步更新** |
| **新增/删除工作流** | `docs/execution-workflow-guide/01-task-workflows.md`、`docs/execution-workflow-guide/README.md` §关键词映射表 | 新工作流是否已添加到用户指南的任务类型列表和关键词映射 |
| **新增/删除约束** | `docs/execution-workflow-guide/03-faq.md` | FAQ 中约束相关描述是否已更新 |
| 🔴 **预检查项数/工作流数量/约束条数/行数引用变更** | **`docs/DESIGN-PHILOSOPHY.md`** | **§架构全景图中的数据（预检查项数、工作流数量、约束条数、QUICK-REFERENCE 行数等）是否已同步更新** |

---

## 🔴 版本号文件清单（发布新版本时必须全部同步）

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

> ⚠️ 此清单新增文件时必须同步更新。子文件不再维护独立版本号（2026-03-02 起取消），版本历史统一由 Git + changelogs/ 管理。

---

## 🔴 约束条数引用清单（新增/删除约束时必须全部同步）

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

---

## 🔴 最后更新日期同步清单（修改规范文件后必须全部同步）

> **为什么单独列出？** 日期遗漏已反复发生 5+ 次（copilot-instructions 停留在 2026-02-28、README/decision-tree/STATUS 尾部/ONBOARDING 停留在 2026-02-27 等），根因是**只有版本号和约束条数有自动同步工具，日期完全靠手动**。以下 8 个文件包含 `最后更新` 日期字段，修改规范文件后**必须全部同步到当天日期**：

| # | 文件路径 | 日期位置 | 说明 |
|:-:|---------|---------|------|
| 1 | `.github/copilot-instructions.md` | L2 `**最后更新**: YYYY-MM-DD` | 入口文件 |
| 2 | `README.md` | L4 `> **最后更新**: YYYY-MM-DD` + 尾部 `最后更新:` | 项目主入口（两处） |
| 3 | `QUICK-REFERENCE.md` | L6 + 尾部（两处） | 速查手册 |
| 4 | `CONSTRAINTS.md` | L6 + 尾部（两处） | 约束清单 |
| 5 | `STATUS.md` | L6 头部 + 尾部 `**最后更新**:`（两处） | 项目状态 |
| 6 | `core/workflows/decision-tree.yaml` | L5 `last_updated:` | 决策树配置 |
| 7 | `core/workflows/00-pre-check/README.md` | 尾部 `**最后更新**:` | 预检查工作流 |
| 8 | `core/ONBOARDING.md` | L5 `**最后更新**:` | 新 Agent 上手指南 |

> ⚠️ 此清单与 `META.yaml` §`date_sync_files` 保持一致。`bump-version.js --apply` 应同时同步日期（待实现）。
> ⚠️ `docs/DESIGN-PHILOSOPHY.md` 等非核心文件仅在内容实际变更时更新日期，不在自动同步范围。

---

## 检查清单（每次修改后逐条确认）

```yaml
□ 预检查项数: copilot-instructions.md / 00-pre-check / QUICK-REFERENCE 三处一致？
□ 文件命名: 报告在 `<agent>/YYYYMMDD/` 目录下使用 `NN-<类型>-<简述>.md` 格式（NN 独立）？记忆使用 YYYYMMDD.md 格式（无 NN）？
□ 多 Agent 方案: 目录隔离 clients/<agent>/（非共享目录+文件名前缀）？
□ 🔴 约束条数（主动全量）: 上方约束条数引用清单 11 个文件是否全部一致？（逐个 read_file 确认，禁止推断）（当前 20 条）
□ 🔴 最后更新日期（主动全量）: 上方日期同步清单 8 个文件的 `最后更新` 日期是否全部一致？（逐个 read_file 确认，禁止推断）
□ 🔴 版本号（主动全量）: 上方 8 个文件的主版本号是否全部一致？（逐个 read_file 确认，禁止推断）或运行 `node core/tools/bump-version.js` 自动检查
□ 🔴 CHANGELOG ↔ changelogs/ 同步: CHANGELOG.md 概览表是否包含当前版本？changelogs/v<当前版本>.md 是否存在？（bump-version.js 已含此检查）
□ 🔴 CHANGELOG 补丁记录: 本次修改了规范文件（core/workflows/、core/templates/、core/standards/ 等）但未升版本号？→ 必须在 `changelogs/v<当前版本>.md` 追加"后续补丁"段落（格式: `### 后续补丁 (YYYY-MM-DD)` + 变更条目）+ 更新 CHANGELOG.md 概览表中该版本的变更摘要（一行描述）。⚠️ CHANGELOG.md 只做索引，详细内容只写 changelogs/ 文件
□ 禁止行为: copilot-instructions.md 和 00-pre-check 的禁止清单对齐？
□ 交叉引用路径: 所有 [链接](./path) 指向的文件确实存在？§锚点引用指向的内容仍在目标文件中？（拆分后尤其注意）
□ 🔴 docs/ 用户指南同步: 本次修改涉及的流程/机制是否在 `docs/` 下有对应用户指南？如有，是否已同步更新？（execution-workflow-guide/ 和 spec-self-fix-guide/）
□ 🔴 docs/DESIGN-PHILOSOPHY.md 同步: 架构全景图中的数据（预检查项数/工作流数量/约束条数/行数引用等）是否与实际一致？
□ 🔴 约束优先级一致性: QUICK-REFERENCE.md ↔ CONSTRAINTS.md 速查表中每条约束的优先级标签（🔴P0/🟡P1/💡P2）是否逐条一致？（当前 P0=9 / P1=8 / P2=3）
```

---

## 🔗 相关文档

- [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) - 速查手册（日常加载）
- [CONSTRAINTS.md](./CONSTRAINTS.md) - 完整约束（§14 规范修改需交叉验证）
- [bump-version.js](./tools/bump-version.js) - 版本号 + 约束条数 + 日期自动同步工具