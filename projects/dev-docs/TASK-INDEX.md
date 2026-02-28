# 任务索引

> **用途**: 追溯 ai-dev-guidelines 项目的所有历史任务  
> **更新时机**: 版本发布时运行 `node core/tools/update-task-index.js dev-docs` 自动更新（无需每次会话手动维护）  
> **最后更新**: 2026-02-27

---

## 🔧 自动维护说明

本文件支持 `core/tools/update-task-index.js` 自动维护：

| 维护方式 | 说明 |
|---------|------|
| **自动更新** | 运行 `node core/tools/update-task-index.js dev-docs` 扫描 reports/changelogs/.ai-memory 自动生成条目 |
| **手动维护** | 需求开发(REQ)、Bug修复(BUG)、架构重构(REF) 等分类表格仍可手动编辑 |
| **更新频率** | 🔴 ~~每次会话~~ → ✅ **版本发布时**运行一次即可（降低 AI token 开销） |
| **预览模式** | `node core/tools/update-task-index.js dev-docs --dry-run` 预览变更不写入 |

---

## ⚠️ 强关联文件

本文件与以下文件**强关联**，修改时需同步考虑：

| 关联文件 | 关联关系 |
|---------|---------|
| `../../core/workflows/01-08/` | 各工作流完成后更新本索引 |
| `../../QUICK-REFERENCE.md` | 定义追溯查询方式 |
| `../../STATUS.md` | 项目状态同步 |
| `.ai-memory/clients/zed-copilot/SUMMARY.md` | Agent 记忆摘要 |

---

## 📋 需求开发

| ID | 日期 | 标题 | 状态 | 路径 |
|----|------|------|------|------|
| REQ-001 | 2026-02-12 | v2.0 双模式设计 | ✅ 完成 | `changelogs/v2.0.0.md` |
| REQ-002 | 2026-02-12 | 精简模板补充（7个） | ✅ 完成 | `core/templates/lite/` |
| REQ-003 | 2026-02-12 | Bug修复示例添加 | ✅ 完成 | `core/examples/bug-fix-example/` |
| REQ-004 | 2026-02-12 | 工具脚本补充 | ✅ 完成 | `core/tools/doc-health-check.js` |
| REQ-005 | 2026-02-12 | 自我修复机制增强 | ✅ 完成 | `core/self-fix/repair/` |
| REQ-006 | 2026-02-12 | 开源项目初始化规范 | ✅ 完成 | `core/workflows/09-opensource-init/` |
| REQ-007 | 2026-02-24 | 项目规范模块化重构 | ✅ 完成 | `changelogs/v2.2.0.md` |
| REQ-008 | 2026-02-24 | 任务记忆机制 | ✅ 完成 | `core/workflows/common/task-memory.md` |
| REQ-009 | 2026-02-24 | 临时报告规范 | ✅ 完成 | `core/workflows/common/temp-reports.md` |
| REQ-010 | 2026-02-27 | 消息驱动 5 阶段记忆 | ✅ 完成 | `changelogs/v2.9.0.md` |

---

## 🐛 Bug 修复

| ID | 日期 | 标题 | 严重程度 | 状态 | 路径 |
|----|------|------|---------|------|------|
| BUG-001 | 2026-02-12 | 模板清单不完整 | P1 | ✅ 修复 | `core/templates/README.md` |
| BUG-002 | 2026-02-12 | decision-tree缺少mode_selection | P1 | ✅ 修复 | `core/workflows/decision-tree.yaml` |
| BUG-003 | 2026-02-12 | README-v2.md引用不存在 | P1 | ✅ 修复 | `STATUS.md`, `CHANGELOG.md` |
| BUG-004 | 2026-02-12 | 模板文件名不一致 | P1 | ✅ 修复 | `STATUS.md` |
| BUG-005 | 2026-02-12 | git-standards未被索引 | P1 | ✅ 修复 | `core/standards/README.md` |
| BUG-006 | 2026-02-12 | decision-tree版本号不一致 | P1 | ✅ 修复 | `core/workflows/decision-tree.yaml` |
| BUG-007 | 2026-02-12 | 预检查输出格式错误 | P1 | ✅ 修复 | `core/workflows/decision-tree.yaml` |
| BUG-008 | 2026-02-27 | 多文件版本号不一致（v2.5→v2.6统一） | P0 | ✅ 修复 | 多文件（见 20260227-01 记忆） |
| BUG-009 | 2026-02-27 | README.md lite 模板数量标注错误（7→8） | P1 | ✅ 修复 | `README.md` |
| BUG-010 | 2026-02-27 | 00-pre-check 日期示例缺序号 NN | P1 | ✅ 修复 | `core/workflows/00-pre-check/README.md` |
| BUG-011 | 2026-02-27 | changelogs/v2.3.0 日期示例缺序号 NN | P1 | ✅ 修复 | `changelogs/v2.3.0.md` |
| BUG-012 | 2026-02-27 | profile/README.md 版本落后 v2.1→v2.7 | P1 | ✅ 修复 | `projects/dev-docs/profile/README.md` |
| BUG-013 | 2026-02-27 | projects/README.md 中 vext 标注"待补充"但已有 profile/ | P1 | ✅ 修复 | `projects/README.md` |
| BUG-014 | 2026-02-27 | STATUS.md 旧路径 projects/ai-dev-guidelines/ 未同步 | P1 | ✅ 修复 | `STATUS.md` |
| BUG-015 | 2026-02-27 | glob 扫描隐藏目录失败致记忆序号冲突（01→07） | P0 | ✅ 修复 | `00-pre-check/README.md`, `task-memory.md` |
| BUG-016 | 2026-02-27 | 顶层 reports/ 空目录冗余（应仅在 projects/ 下） | P1 | ✅ 修复 | 已删除 `ai-dev-guidelines/reports/` |
| BUG-017 | 2026-02-27 | STATUS.md 版本路线图标注 v2.8.0 为当前版本（应为 v2.9.0） | P0 | ✅ 修复 | `STATUS.md` |
| BUG-018 | 2026-02-27 | decision-tree.yaml 第1行注释版本 v2.8.0（应为 v2.9.0） | P1 | ✅ 修复 | `core/workflows/decision-tree.yaml` |
| BUG-019 | 2026-02-27 | dev-docs/profile/ 缺少 P0 必需文件（01/02/03） | P1 | ✅ 修复 | `projects/dev-docs/profile/` |
| BUG-020 | 2026-02-27 | TASK-INDEX.md 严重过时（最后更新 2026-02-12） | P1 | ✅ 修复 | 本文件 |
| BUG-021 | 2026-02-27 | TASK-INDEX.md 中 VAL-001 报告路径失效 | P2 | ✅ 修复 | 本文件（见 VAL-001 备注） |
| BUG-022 | 2026-02-27 | copilot-instructions.md 入口文件"上次记忆检测方法"缺少 glob 禁令，AI 在预检查早期阶段仍用 find_path/glob 扫描 .ai-memory 导致误判"无记忆"（BUG-015 修复不彻底） | P0 | ✅ 修复 | `.github/copilot-instructions.md`, `core/workflows/decision-tree.yaml` |
| BUG-023 | 2026-02-27 | README.md 版本号 v2.9.0（应为 v2.10.0），约束条数 18（应为 19） | P0 | ✅ 修复 | `README.md` |
| BUG-024 | 2026-02-27 | QUICK-REFERENCE.md 记忆文件示例仍为旧格式 YYYYMMDD-NN-TYPE.md | P0 | ✅ 修复 | `QUICK-REFERENCE.md` |
| BUG-025 | 2026-02-27 | copilot-instructions.md 入口表约束条数 18（应为 19） | P0 | ✅ 修复 | `.github/copilot-instructions.md` |
| BUG-026 | 2026-02-27 | STATUS.md 版本号、约束条数、路线图未对齐 v2.10.0 | P1 | ✅ 修复 | `STATUS.md` |
| BUG-027 | 2026-02-27 | decision-tree.yaml 版本号、memory_filename_format、约束 #19 缺失 | P1 | ✅ 修复 | `core/workflows/decision-tree.yaml` |
| BUG-028~031 | 2026-02-27 | 版本号跨文件不一致（多处滞后于 v2.11.0） | P0 | ✅ 修复 | 多文件（见 changelogs/v2.11.0.md） |
| BUG-032 | 2026-02-27 | README.md 目录树注释约束条数 19（应为 20） | P0 | ✅ 修复 | `README.md` |
| BUG-033 | 2026-02-27 | STATUS.md 核心改进表约束条数 19（应为 20） | P0 | ✅ 修复 | `STATUS.md` |
| BUG-034 | 2026-02-27 | decision-tree.yaml 注释 19 条 + 缺少约束 #20 条目 | P0 | ✅ 修复 | `core/workflows/decision-tree.yaml` |
| BUG-035 | 2026-02-27 | profile/README.md 两处约束条数 19（应为 20） | P1 | ✅ 修复 | `projects/dev-docs/profile/README.md` |
| BUG-036 | 2026-02-27 | profile/01-项目信息.md 两处约束条数 19（应为 20） | P1 | ✅ 修复 | `projects/dev-docs/profile/01-项目信息.md` |
| BUG-037 | 2026-02-27 | profile/02-架构约束.md 链接描述约束条数 19（应为 20） | P1 | ✅ 修复 | `projects/dev-docs/profile/02-架构约束.md` |
| BUG-038 | 2026-02-27 | changelogs/v2.11.0.md 相关链接约束条数 19（应为 20） | P1 | ✅ 修复 | `changelogs/v2.11.0.md` |
| BUG-039 | 2026-02-27 | TASK-INDEX.md 约束扩展 15→19（应为 15→20） | P1 | ✅ 修复 | 本文件 |
| BUG-040 | 2026-02-27 | CONSTRAINTS.md 约束 #20 标注 v2.12.0（幽灵版本号，应为 v2.11.0） | P1 | ✅ 修复 | `CONSTRAINTS.md` |
| BUG-041 | 2026-02-27 | user-intent-detection.md 文件头版本号 v2.0（应为 v2.1） | P1 | ✅ 修复 | `core/self-fix/triggers/user-intent-detection.md` |
| BUG-042 | 2026-02-27 | conflict-detection.md 约束条数检测基准仍为 19（应为 20） | P1 | ✅ 修复 | `core/self-fix/detection/conflict-detection.md` |
| BUG-043 | 2026-02-27 | QUICK-REFERENCE.md 约束 #20 标注 v2.12.0 残留（BUG-040 修复不彻底） | P0 | ✅ 修复 | `QUICK-REFERENCE.md` |
| BUG-044 | 2026-02-27 | TASK-INDEX.md 记忆表 20260227.md 会话数过时（2→9） | P1 | ✅ 修复 | 本文件 |
| BUG-045 | 2026-02-27 | CHANGELOG.md 版本概览 v2.11.0 摘要不完整（遗漏约束#20+BUG-032~042） | P1 | ✅ 修复 | `CHANGELOG.md` |
| BUG-046 | 2026-02-27 | CHANGELOG.md 变更统计 v2.11.0 数据过时（修复5→16） | P1 | ✅ 修复 | `CHANGELOG.md` |

---

## ⚡ 性能优化

| ID | 日期 | 标题 | 提升效果 | 状态 | 路径 |
|----|------|------|---------|------|------|
| OPT-001 | 2026-02-12 | 预检查精简 | 5项→3项 | ✅ 完成 | `core/workflows/00-pre-check/` |
| OPT-002 | 2026-02-27 | 规范全面检查+流程优化 | 预检查3→5项、新增约束#16 | ✅ 完成 | `.ai-memory/clients/zed-copilot/tasks/20260226.md` §会话01 |
| OPT-003 | 2026-02-27 | 后续任务跟进（changelogs/vext规范化） | changelogs 补全、vext profile 创建 | ✅ 完成 | `.ai-memory/clients/zed-copilot/tasks/20260226.md` §会话02 |
| OPT-004 | 2026-02-27 | 验证修复+规范全面自检 | 修复2处日期示例缺序号NN | ✅ 完成 | `.ai-memory/clients/zed-copilot/tasks/20260226.md` §会话03 |
| OPT-005 | 2026-02-27 | 三轮深度检查 | 发现10个问题(1🔴+2🟡+7💡) | ✅ 完成 | `.ai-memory/clients/zed-copilot/tasks/20260226.md` §会话04 |

---

## 🔬 深度分析

| ID | 日期 | 标题 | 结论 | 状态 | 路径 |
|----|------|------|------|------|------|
| ANA-001 | 2026-02-27 | 记忆存储流程深度分析 | "先写后干"四阶段策略；预检查扫描记忆（禁止glob） | ✅ 完成 | `reports/analysis/zed-copilot/20260227/02-analysis-memory-storage-flow.md` |
| ANA-002 | 2026-02-27 | 记忆流程重设计 | 4阶段→消息驱动5阶段；v2.8.0→v2.9.0 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/03-analysis-memory-flow-redesign.md` |
| ANA-003 | 2026-02-27 | 全项目深度分析（8维度） | 综合评分7.5/10；发现4Bug+12建议 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/04-analysis-ai-dev-guidelines-deep-review.md` |
| ANA-004 | 2026-02-27 | 自修复分析（glob事故+阶段0违规） | glob跳过隐藏目录致序号冲突；规范防复现已落地 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/05-analysis-self-fix-memory-flow.md` |
| ANA-005 | 2026-02-27 | 三轮全方位深度验证 | 综合评分7.8/10；5🔴+6🟡+14💡 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/06-analysis-triple-deep-verification.md` |
| ANA-006 | 2026-02-27 | 5个Bug修复+三轮审计 | 修复B-1~B-5；全面审计 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/07-bugfix-five-bugs-triple-audit.md` |
| ANA-007 | 2026-02-27 | NN序号规范分析+每日记忆方案 | 共享NN不合理→每日一文件方案→规范落地 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/08-analysis-nn-sharing-and-daily-memory.md` |
| ANA-008 | 2026-02-27 | 全面规范审计（入口瘦身+SUMMARY优化+体系检查） | 5🔴Bug修复+入口瘦身+SUMMARY精简 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/10-analysis-full-spec-audit-three-issues.md` |
| ANA-009 | 2026-02-27 | 全面规范审计 v3 | 深度分析+流程优化 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/09-analysis-full-spec-audit-v3.md` |
| ANA-010 | 2026-02-27 | 继续深入分析+遗漏问题修复 | 2🔴+3🟡+4💡修复；报告输出前必须验证 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/11-analysis-continued-deep-review-and-fix.md` |
| ANA-011 | 2026-02-27 | 记忆规范执行自查+全面问题检查 | 版本号全量同步清单(8文件)+阶段0时序强制规则 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/12-analysis-memory-compliance-and-full-check.md` |
| ANA-012 | 2026-02-27 | 自修复：版本号同步+阶段0时序 | BUG-030/031修复；版本号8文件清单+时序规则落地 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/13-selffix-version-sync-and-stage0-timing.md` |
| ANA-013 | 2026-02-27 | 自修复：知识库回写 | spec-self-fix 6子模块v1.0→v2.0；闭环验证机制 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/14-selffix-knowledge-base-writeback.md` |
| ANA-014 | 2026-02-27 | 一致性审计（三项问题） | SUMMARY日期精度升级+文件拆分规范(约束#20)+自我修复模式6 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/15-analysis-consistency-audit-three-issues.md` |
| ANA-015 | 2026-02-27 | 约束条数跨文件同步审计 | BUG-032~042修复；防复现机制(约束条数引用清单11文件+auto-triggers场景8) | ✅ 完成 | `reports/analysis/zed-copilot/20260227/16-analysis-constraint-count-sync-audit.md` |
| ANA-016 | 2026-02-27 | 全面深度审计 v4 | BUG-043~046；综合评分8.4/10；6个优化建议 | ✅ 完成 | `reports/analysis/zed-copilot/20260227/17-analysis-full-depth-audit-v4.md` |

---

## 🏗️ 架构重构

| ID | 日期 | 标题 | 状态 | 路径 |
|----|------|------|------|------|
| REF-001 | 2026-02-12 | v2.0 架构升级（轻量化与灵活性） | ✅ 完成 | `changelogs/v2.0.0.md` |
| REF-002 | 2026-02-24 | v2.1 工作流统一升级（CP1/CP2/CP3） | ✅ 完成 | `changelogs/v2.1.0.md` |
| REF-003 | 2026-02-24 | v2.2 项目规范模块化重构 | ✅ 完成 | `changelogs/v2.2.0.md` |

---

## 📊 验证报告

| ID | 日期 | 标题 | 状态 | 路径 |
|----|------|------|------|------|
| VAL-001 | 2026-02-12 | 综合验证报告 | ✅ 完成 | ⚠️ 原路径 `reports/COMPREHENSIVE-VALIDATION-REPORT-20260212.md` 已失效（顶层 reports/ 已删除）。验证结果已归档至 `changelogs/v2.0.0.md` |
| VAL-002 | 2026-02-27 | 修复验证（6/6 通过） | ✅ 完成 | `reports/analysis/zed-copilot/20260227/06-analysis-triple-deep-verification.md` §1 |

---

## 📦 版本发布记录

| 版本 | 日期 | 主题 | 变更日志 |
|------|------|------|---------|
| v2.11.0 | 2026-02-27 | 入口瘦身+约束#20+审计修复16Bug+防复现机制 | `changelogs/v2.11.0.md` |
| v2.10.0 | 2026-02-27 | 每日一文件记忆+序号独立+约束#19 | — |
| v2.9.0 | 2026-02-27 | 消息驱动5阶段记忆 + 约束#18 | `changelogs/v2.9.0.md` |
| v2.8.0 | 2026-02-27 | 报告为主体+记忆为索引 + 约束#17 | `changelogs/v2.8.0.md` |
| v2.7.0 | 2026-02-27 | 预检查第5项 + 约束#16 | `changelogs/v2.7.0.md` |
| v2.6.0 | 2026-02-27 | 精简入口+目录隔离+任务完成验证 | `changelogs/v2.6.0.md` |
| v2.5.0 | 2026-02-27 | 多编辑器策略+交叉验证 | `changelogs/v2.5.0.md` |
| v2.4.0 | 2026-02-27 | 约束体系扩展 | `changelogs/v2.4.0.md` |
| v2.3.0 | 2026-02-27 | 预检查增强+Agent标识 | `changelogs/v2.3.0.md` |
| v2.2.0 | 2026-02-24 | 项目规范模块化重构 | `changelogs/v2.2.0.md` |
| v2.1.0 | 2026-02-24 | 工作流统一升级+AI行为约束 | `changelogs/v2.1.0.md` |
| v2.0.0 | 2026-02-12 | 轻量化与灵活性重构 | `changelogs/v2.0.0.md` |
| v1.3.0 | 2026-02-12 | 全面修复与优化增强 | `changelogs/v1.3.0.md` |
| v1.2.0 | - | 增量改进 | `changelogs/v1.2.0.md` |
| v1.1.0 | - | 增量改进 | `changelogs/v1.1.0.md` |
| v1.0.0 | - | 初始版本 | `changelogs/v1.0.0.md` |

---

## 🔍 快速检索

### 按关键词查找

如需查找特定功能的历史记录，可以：
1. 在本文件中搜索关键词
2. 查看对应路径下的详细文档
3. 查阅 `.ai-memory/clients/<agent>/SUMMARY.md` 获取任务记忆

### 按日期查找

| 日期 | 主要任务 |
|------|---------|
| 2026-02-12 | v2.0 发布、综合验证、项目规范创建、自修复机制增强 |
| 2026-02-24 | v2.1~v2.2 发布、工作流统一升级、项目规范模块化重构、任务记忆机制 |
| 2026-02-27 | v2.3~v2.11 发布、预检查增强(3→5项)、约束扩展(15→20条)、记忆流程重设计(4阶段→5阶段)、每日一文件记忆、入口文件瘦身、多轮深度分析与自修复 |

### 按记忆文件查找（v1.7 每日一文件格式）

> **说明**: v2.10.0 起记忆文件改为每天一个文件（`YYYYMMDD.md`），会话内以 `## 会话 NN` 分段。
> 旧格式文件（`YYYYMMDD-NN-TYPE-id.md`）已合并迁移至 `20260226.md`。

| 日期文件 | 会话数 | 涵盖内容 |
|---------|:------:|---------|
| `20260226.md` | 11 | §01 规范全面检查 / §02 后续任务跟进 / §03 验证修复 / §04 三轮深度检查 / §05 记忆存储分析 / §06 记忆流程重设计 / §07 全项目深度分析 / §08 修复验证+三轮分析 / §09 5Bug修复+审计 / §10 NN序号分析+每日记忆方案 / §11 规范落地执行 |
| `20260227.md` | 9 | §01 NN序号规范分析+每日记忆方案+规范落地 / §02 全面规范审计（入口瘦身+SUMMARY优化+体系检查） / §03 全方面深度分析规范项目 / §04 继续深入分析+自我修复+遗漏修复 / §05 记忆规范执行自查+全面问题检查 / §06 spec-self-fix知识库回写修复 / §07 规范一致性审计（文件拆分+SUMMARY时间精度+自我修复验证） / §08 约束条数跨文件同步审计+防复现机制 / §09 全面深度审计+合理优化建议 |

> 记忆文件存放于 `.ai-memory/clients/zed-copilot/tasks/` 目录下

---

**维护者**: AI 规范团队