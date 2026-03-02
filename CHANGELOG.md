# 变更日志 (CHANGELOG)

> **说明**: 版本概览摘要，详细变更见 [changelogs/](./changelogs/) 目录  
> **最后更新**: 2026-02-27

---

## 📁 文件说明

| 文件/目录 | 用途 | 关系 |
|----------|------|------|
| `CHANGELOG.md` | 版本概览 | 本文件，提供快速浏览所有版本 |
| `changelogs/` | 详细变更 | 每个版本一个文件，包含完整变更内容 |

**设计理念**:
- 本文件（CHANGELOG.md）作为**索引**，快速了解版本历史
- `changelogs/vX.Y.Z.md` 作为**详情**，记录完整变更内容
- 两者互相引用，保持同步

---

## 版本概览

| 版本 | 日期 | 变更摘要 | 详细 |
|------|------|---------|------|
| [v2.11.0](./changelogs/v2.11.0.md) | 2026-02-27 | 🔧 入口瘦身 + 约束#20(文件过大拆分) + 审计修复16Bug(BUG-023~042) + 防复现机制(约束条数引用清单+自动触发场景8) | [查看](./changelogs/v2.11.0.md) |
| [v2.10.0](./changelogs/v2.10.0.md) | 2026-02-27 | 🔧 每日一文件记忆（YYYYMMDD.md）+ 报告/记忆序号独立 + 约束#19 + 对话记录4列表格 | [查看](./changelogs/v2.10.0.md) |
| [v2.9.0](./changelogs/v2.9.0.md) | 2026-02-27 | 🔧 记忆触发时机升级为"消息驱动5阶段"(阶段0~4) + 约束#18"消息驱动记忆触发" + 记忆模板新增§📨对话记录 | [查看](./changelogs/v2.9.0.md) |
| [v2.8.0](./changelogs/v2.8.0.md) | 2026-02-27 | 🔧 报告为主体+记忆为索引架构 + 约束#17"报告+记忆自动输出" | [查看](./changelogs/v2.8.0.md) |
| [v2.7.0](./changelogs/v2.7.0.md) | 2026-02-27 | 🔧 预检查第5项"上次记忆" + 约束#16"文件修改需确认" + P1修复7项 | [查看](./changelogs/v2.7.0.md) |
| [v2.6.0](./changelogs/v2.6.0.md) | 2026-02-27 | 🔧 精简入口 + 目录隔离 + 任务完成验证 | [查看](./changelogs/v2.6.0.md) |
| [v2.5.0](./changelogs/v2.5.0.md) | 2026-02-27 | 🔧 多编辑器策略调整 + 交叉验证清单 | [查看](./changelogs/v2.5.0.md) |
| [v2.4.0](./changelogs/v2.4.0.md) | 2026-02-27 | 🔧 约束体系扩展至 15 条 | [查看](./changelogs/v2.4.0.md) |
| [v2.3.0](./changelogs/v2.3.0.md) | 2026-02-27 | 🔧 预检查增强（4 项必做 + Agent 标识）+ 日期强制必填 | [查看](./changelogs/v2.3.0.md) |
| [v2.2.0](./changelogs/v2.2.0.md) | 2026-02-24 | 🔧 项目规范模块化重构 + 规范体系清理 | [查看](./changelogs/v2.2.0.md) |
| [v2.1.0](./changelogs/v2.1.0.md) | 2026-02-24 | 🔧 工作流统一升级：全部流程增加实施方案+CP确认点 + 新增约束#10/#11 | [查看](./changelogs/v2.1.0.md) |
| [v2.0.0](./changelogs/v2.0.0.md) | 2026-02-12 | 🎉 重大重构：快速/完整双模式 + 精简模板 + 工作流优化 | [查看](./changelogs/v2.0.0.md) |
| [v1.3.0](./changelogs/v1.3.0.md) | 2026-02-12 | 🔧 全面修复：6个规范文件补全 + 新增配置/工具规范 + 状态追踪 | [查看](./changelogs/v1.3.0.md) |
| [v1.2.0](./changelogs/v1.2.0.md) | 2026-02-12 | 🔧 优化：确认点机制增强 + 文档同步规范 + 模板优化 | [查看](./changelogs/v1.2.0.md) |
| [v1.1.0](./changelogs/v1.1.0.md) | 2026-02-12 | 🎉 重大功能：强制启动协议 + 三轮验证 + 确认点机制 | [查看](./changelogs/v1.1.0.md) |
| [v1.0.0](./changelogs/v1.0.0.md) | 2026-02-11 | 初始版本：核心工作流 + 文档模板 + 最佳实践 | [查看](./changelogs/v1.0.0.md) |

---

## 🚨 重要更新

### v2.11.0 - 入口文件瘦身 + SUMMARY 精简 + 全面审计修复 🆕

**发布日期**: 2026-02-27  
**版本类型**: Minor Release

#### 核心变更

- ✅ **入口文件瘦身**: `copilot-instructions.md` 从 ~120 行精简至 ~36 行，仅保留 3 条绝对规则 + 入口表
- ✅ **SUMMARY.md 精简**: Agent SUMMARY 删除"最近任务"表，精简关键决策和待跟进内容
- ✅ **BUG-023 修复**: `README.md` 版本号 v2.9.0→v2.10.0，约束条数 18→19
- ✅ **BUG-024 修复**: `QUICK-REFERENCE.md` 记忆文件示例从旧格式 `YYYYMMDD-NN-TYPE.md` 改为 `YYYYMMDD.md`
- ✅ **BUG-025 修复**: `copilot-instructions.md` 入口表约束条数 18→19
- ✅ **BUG-026 修复**: `STATUS.md` 版本号、约束条数、路线图全部对齐 v2.10.0
- ✅ **BUG-027 修复**: `decision-tree.yaml` 版本号、`memory_filename_format`、约束 #19 补充
- ✅ **profile 文件对齐**: `01-项目信息.md`、`02-架构约束.md`、`profile/README.md` 约束条数 18→19
- ✅ **task-memory.md 标题修正**: 触发时机标题从 "v1.6" 更正为 "v1.7"
- ✅ **新增约束 #20**: "文件过大必须拆分"（AI 新创建的 .md 文件超过 500 行必须拆分，已有文件豁免）
- ✅ **约束扩展**: 从 19 条扩展至 20 条
- ✅ **BUG-032~042 修复**: 约束条数跨文件不一致（11 处 19→20）+ 幽灵版本号 v2.12.0 清除
- ✅ **防复现机制**: 新增约束条数引用清单（11 文件）+ 交叉验证清单升级为主动全量 + auto-triggers 场景 8（约束条数全量同步检测）
- ✅ **BUG-043 修复**: `QUICK-REFERENCE.md` 约束 #20 标注 v2.12.0 残留→v2.11.0
- ✅ **后续补丁 (2026-03-02)**: task-memory v1.8→v1.9 新增阶段 4.5（执行合规性回溯检查 — 出口门禁），与阶段 0 入口门禁形成对称闭环；auto-triggers v2.1→v2.3 新增场景 9（预检查第 6 行检测）+ 场景 10（合规回溯联动）；种子修复记录 2 份写入 records/

---

### v2.10.0 - 每日一文件记忆 + 报告/记忆序号独立 + 约束#19

**发布日期**: 2026-02-27  
**版本类型**: Minor Release

#### 核心变更

- ✅ **记忆命名改革**: 从"每会话一文件"（`YYYYMMDD-NN-TYPE-id.md`）改为"每天一文件"（`YYYYMMDD.md`），会话内以 `## 会话 NN` 分段追加
- ✅ **序号独立**: 报告 NN 仅扫描 `reports/` 目录计算，记忆文件无 NN 序号，两者完全解耦
- ✅ **新增约束 #19**: "报告/记忆序号独立"——禁止共享全局序号池
- ✅ **对话记录扩展**: 记忆模板对话记录表从 3 列扩展为 4 列（新增"关联引用"列，使用 📋📄🧠📑 标记）
- ✅ **旧记忆迁移**: 11 个旧格式记忆文件合并为 `20260226.md`
- ✅ **约束扩展**: 从 18 条扩展至 19 条
- ✅ **task-memory.md 升级**: v1.6 → v1.7（新模板 + 简化阶段 0 + 序号解耦）
- ✅ **temp-reports.md 升级**: v1.4 → v1.5（明确报告 NN 独立于记忆）

---

### v2.8.0 - 报告为主体+记忆为索引架构 + 约束#17"报告+记忆自动输出"

**发布日期**: 2026-02-27  
**版本类型**: Minor Release

#### 核心变更

- ✅ **新增约束 #17**: "报告+记忆自动输出"——每次会话必须自动写入报告文件+更新记忆，禁止询问用户
- ✅ **架构改进**: 报告文件（reports/）为主体（完整分析内容），记忆文件（.ai-memory/）为索引（摘要+报告链接）
- ✅ **报告升级**: 从"临时可选"升级为"每次会话必须输出"
- ✅ **记忆精简**: 记忆模板改为摘要+报告链接，不再堆砌分析细节
- ✅ **约束扩展**: 从 16 条扩展至 17 条
- ✅ **约束 #16 更新**: 例外列表增加报告文件的创建
- ✅ **task-memory.md 升级**: v1.4 → v1.5（新增"核心架构"和"自动输出"段落）
- ✅ **temp-reports.md 升级**: v1.3 → v1.4（新增"核心规则"和"报告与记忆的关系"段落）
- ✅ **预检查扫描修复**: .ai-memory 扫描改为 list_directory（禁止 glob 扫描隐藏目录）
- ✅ **Bug修复**: README.md lite 模板数量标注 7→8

---

### v2.7.0 - 预检查第5项"上次记忆" + 约束#16"文件修改需确认"

**发布日期**: 2026-02-27  
**版本类型**: Minor Release

#### 核心变更

- ✅ **预检查升级**: 从 4 项改为 5 项必做（新增第 5 项"上次记忆"——扫描 `.ai-memory/clients/<agent>/tasks/` 输出最新记忆路径和状态）
- ✅ **新增约束 #16**: "文件修改需确认"——涉及文件修改/删除操作必须先输出变更计划，等待用户确认后再执行（纯分析/只读/记忆写入除外）
- ✅ **约束扩展**: 从 15 条扩展至 16 条
- ✅ **CONSTRAINTS.md 重排**: 约束详细说明按 #1~#16 连续编排（消除之前的乱序问题）
- ✅ **项目列表对齐**: README.md 和 projects/README.md 的项目列表与实际目录结构统一
- ✅ **reports/ 子目录补全**: projects/README.md 补充 `analysis/` 和 `optimizations/` 子目录
- ✅ **templates 示例修正**: templates/README.md 文件名示例补充 NN 序号
- ✅ **记忆目录创建**: 为 ai-dev-guidelines 项目（dev-docs）创建 `.ai-memory/` 目录结构
- ✅ **copilot-instructions 入口表**: 补充 CONSTRAINTS.md 和 STATUS.md 入口行
- ✅ **版本号统一**: 全部文件版本号对齐 v2.7.0

---

### v2.6.0 - 精简入口 + 目录隔离 + 任务完成验证

**发布日期**: 2026-02-27  
**版本类型**: Minor Release

#### 核心变更

- ✅ **copilot-instructions.md 精简**: 入口文件从 141 行精简至 80 行，仅保留入口指引
- ✅ **多 Agent 目录隔离**: 记忆方案从"共享目录+文件名前缀"改回"目录隔离+全局摘要"（`clients/<agent>/`）
- ✅ **任务完成验证**: 新增约束 #15，声称完成前必须验证输出文件存在性+内容结构完整性+记忆已更新
- ✅ **Agent 规则集中**: Agent 详细检测规则移至 `task-memory.md`
- ✅ **版本号统一**: 全部文件版本号对齐 v2.6.0

---

### v2.5.0 - 多编辑器策略调整 + 交叉验证

**发布日期**: 2026-02-27  
**版本类型**: Minor Release

#### 核心变更

- ✅ **交叉验证清单**: QUICK-REFERENCE.md 新增"规范修改交叉验证清单"段落
- ✅ **新增约束 #14**: 规范修改需交叉验证（修改规范文件后必须检查所有引用处）
- ✅ **日期强制必填**: 所有输出文件名必须以 `YYYYMMDD-` 开头

---

### v2.4.0 - 约束体系扩展

**发布日期**: 2026-02-27  
**版本类型**: Minor Release

#### 核心变更

- ✅ **约束扩展**: 从 14 条扩展至 15 条
- ✅ **#9 调整**: 改为"文件名带日期+序号"（Agent 由目录隔离保证）
- ✅ **#10 调整**: 改为"多 Agent 目录隔离"
- ✅ **新增 #15**: 任务完成验证

---

### v2.3.0 - 预检查增强 + Agent 标识

**发布日期**: 2026-02-27  
**版本类型**: Minor Release

#### 核心变更

- ✅ **预检查升级**: 从 3 项改为 4 项必做（新增 Agent 标识）
- ✅ **日期强制必填规范**: 文件名和文档头部日期字段不允许留占位符
- ✅ **新增 analysis-lite 模板**: `templates/lite/analysis-lite.md` 深度分析精简模板
- ✅ **多 Agent 支持**: 对齐多编辑器/多 Agent 支持策略

---

### v2.2.0 - 项目规范模块化重构 + 规范体系清理

**发布日期**: 2026-02-24  
**版本类型**: Minor Release

#### 核心变更

- ✅ **项目规范模块化**: 所有项目规范统一为 `profile/` 子目录 + 模块化文件结构
- ✅ **TASK-INDEX.md**: 纳入标准项目结构（项目根目录）
- ✅ **任务记忆机制**: 新增 `workflows/common/task-memory.md`，通过 `.ai-memory/` 实现跨会话上下文传递
- ✅ **临时报告规范**: 新增 `workflows/common/temp-reports.md`，统一各项目 `reports/` 的存储和命名规范
- ✅ **copilot-instructions.md**: 精简为纯入口文件，不再包含规范细节
- ✅ **README.md 精简**: 删除与 QUICK-REFERENCE.md 重复的 ~180 行内容
- ✅ **清理旧文件**: 删除 `_template/` 下 13 个旧模板、`outputs/` 弃用目录、v1.x 过时工作流文件
- ✅ **全部项目统一**: chat/ai-dev-guidelines/user-service 全部迁移到新结构
- ✅ **版本号统一**: 所有文件版本号对齐 v2.2.0

---

### v2.0.0 - 重大重构：轻量化与灵活性 

**发布日期**: 2026-02-12  
**版本类型**: Major Release  
**重要性**: ⭐⭐⭐⭐⭐

#### 设计理念转变

| 之前 | 现在 |
|-----|------|
| 完整流程优先 | 快速模式优先 |
| 追求完整性 | 追求实用性 |
| 复杂模板 | 精简+完整双模板 |
| 形式化检查 | 聚焦有价值检查 |

#### 核心变更

- ✅ **执行模式**: 新增快速/完整两种模式，默认快速模式
- ✅ **精简模板**: 新增 `templates/lite/` 目录，4 个精简模板
- ✅ **工作流优化**: 重构需求开发流程，支持模式切换
- ✅ **预检查简化**: 从 5+ 项精简为 3 项必做检查
- ✅ **项目规范**: 新增统一的 PROJECT.md 模板（⚠️ v2.2.0 已被 `profile/` 模块化结构替代）
- ✅ **快速索引**: 新增 best-practices/WHEN-TO-USE.md

#### 新增文件

- `templates/lite/README.md` - 精简模板说明
- `templates/lite/technical-lite.md` - 精简技术方案
- `templates/lite/requirement-lite.md` - 精简需求文档
- `templates/lite/implementation-lite.md` - 精简实施记录
- `templates/lite/bug-analysis-lite.md` - 精简 Bug 分析
- `templates/lite/optimization-lite.md` - 精简性能优化
- `templates/lite/research-lite.md` - 精简技术调研
- `templates/lite/refactoring-lite.md` - 精简架构重构
- `projects/_template/PROJECT.md` - 统一项目规范模板（⚠️ v2.2.0 已删除，改为 `profile/`）
- `best-practices/WHEN-TO-USE.md` - 最佳实践快速索引
- `projects/ai-dev-guidelines/PROJECT.md` - ai-dev-guidelines 项目规范（⚠️ v2.2.0 已迁移至 `profile/README.md`）

---

### v1.3.0 - 全面修复与优化增强

**发布日期**: 2026-02-12  
**版本类型**: Enhancement + Fix  
**重要性**: ⭐⭐⭐⭐

#### 核心变更

- ✅ **P0 修复**: 补全 6 个规范文件（api/doc/script/test-standards）
- ✅ **路径规范**: 标注 outputs/ 已弃用，统一使用 projects/
- ✅ **新增规范**: config-standards.md（配置管理）+ tool-standards.md（工具调用）
- ✅ **状态追踪**: 新增 STATUS.md 追踪项目完成度（87%）
- ⚠️ **快速参考**: QUICK-REFERENCE.md 计划中（由 best-practices/WHEN-TO-USE.md 替代）

#### 新增文件

- `STATUS.md` - 项目状态追踪（模块完成度、版本路线图）
- `standards/config-standards.md` - 配置规范（环境变量、分层、敏感配置）
- `standards/tool-standards.md` - 工具调用规范（权限边界、安全实践）
- `changelogs/v1.3.0.md` - 详细变更文档

#### 修复文件

- `standards/api-standards.md` - 补全 15 个错误码 + Rate Limiting + CORS + 日志规范
- `standards/doc-standards.md` - 补全 20+ 语言标识 + 链接 + 图片 + 中英文排版
- `standards/script-standards.md` - 补全 4 种幂等性实现 + 环境变量 + 测试规范
- `standards/test-standards.md` - 补全 8 种边界情况 + Mock + 覆盖率 + CI/CD
- `outputs/README.md` - 标注弃用 + 迁移指南

#### 增强文件

- `.aiignore` - 优化忽略规则（changelogs 详细文件）
- `standards/README.md` - 更新索引（8/8 规范文件）

---

### v1.2.0 - 优化增强

**发布日期**: 2026-02-12  
**版本类型**: Enhancement  
**重要性**: ⭐⭐⭐

#### 核心变更

- ✅ **确认点机制增强**: 新增 CP6 项目文档更新确认 + IP1/IP2 询问点
- ✅ **文档同步规范**: 参考 monSQLize 建立 changelogs/ 分层结构
- ✅ **模板优化**: 新增前端对接模板、API 文档模板
- ✅ **代码分析原则**: 强化代码分析优先原则

#### 新增文件

- `workflows/common/document-sync.md` - 文档同步机制
- `templates/common/STATUS-template.md` - STATUS 模板
- `templates/common/CHANGELOG-template.md` - CHANGELOG 模板
- `templates/common/changelogs/README.md` - changelogs 目录说明
- `templates/common/changelogs/TEMPLATE.md` - 变更文档模板
- `templates/core/frontend-integration-template.md` - 前端对接模板
- `templates/core/api-doc-template.md` - API 文档模板

---

### v1.1.0 - P0 关键缺失补充

**发布日期**: 2026-02-12  
**版本类型**: Feature  
**重要性**: ⭐⭐⭐⭐⭐

#### 核心变更

- ✅ **强制启动协议**: 5 项预检查清单
- ✅ **三轮验证机制**: 23 项验证清单
- ✅ **意图分类系统**: 13 种任务类型
- ✅ **禁止项清单**: 13 条约束
- ✅ **确认点机制**: 5 个核心确认点
- ✅ **Stop & Save 机制**: 优雅退出流程

---

### v1.0.0 - 初始版本

**发布日期**: 2026-02-11  
**版本类型**: Release  
**重要性**: ⭐⭐⭐

#### 核心变更

- 初始版本发布
- 核心工作流（需求开发、Bug 修复、性能优化）
- 文档模板（6 个核心模板）
- 最佳实践（边界处理、Token 优化、大项目策略）
- 项目规范结构

---

## 变更统计

| 版本 | 新增 | 变更 | 修复 | 移除 |
|------|------|------|------|------|
| v2.11.0 | 2 | 18 | 17 | 0 |
| v2.10.0 | 1 | 6 | 0 | 10 |
| v2.9.0 | 0 | 9 | 0 | 0 |
| v2.8.0 | 1 | 7 | 1 | 0 |
| v2.7.0 | 3 | 10 | 7 | 0 |
| v2.6.0 | 0 | 5 | 0 | 0 |
| v2.5.0 | 0 | 2 | 0 | 0 |
| v2.4.0 | 0 | 3 | 0 | 0 |
| v2.3.0 | 1 | 3 | 0 | 0 |
| v2.2.0 | 2 | 8 | 0 | 13 |
| v2.1.0 | 0 | 10 | 0 | 0 |
| v2.0.0 | 10 | 3 | 0 | 0 |
| v1.3.0 | 3 | 6 | 7 | 0 |
| v1.2.0 | 7 | 2 | 0 | 0 |
| v1.1.0 | 21 | 2 | 0 | 0 |
| v1.0.0 | 初始 | - | - | - |

---

## 维护说明

- **版本策略**: [语义化版本](https://semver.org/lang/zh-CN/)
- **详细变更**: 每个版本的详细变更见 `changelogs/vX.Y.Z.md`
- **快速定位**: 使用版本概览表的链接直接跳转

---

**维护者**: AI 规范团队  
**最后更新**: 2026-02-27
