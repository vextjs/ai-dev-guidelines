# 变更日志 (CHANGELOG)

> **说明**: 版本概览摘要，详细变更见 [changelogs/](./changelogs/) 目录  
> **最后更新**: 2026-02-24

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
| v2.2.0 | 2026-02-24 | 🔧 项目规范模块化重构 + 规范体系清理 | 本次更新 |
| v2.1.0 | 2026-02-24 | 🔧 工作流统一升级：全部流程增加实施方案+CP确认点 + 新增约束#10/#11 | — |
| [v2.0.0](./changelogs/v2.0.0.md) | 2026-02-12 | 🎉 重大重构：快速/完整双模式 + 精简模板 + 工作流优化 | [查看](./changelogs/v2.0.0.md) |
| [v1.3.0](./changelogs/v1.3.0.md) | 2026-02-12 | 🔧 全面修复：6个规范文件补全 + 新增配置/工具规范 + 状态追踪 | [查看](./changelogs/v1.3.0.md) |
| [v1.2.0](./changelogs/v1.2.0.md) | 2026-02-12 | 🔧 优化：确认点机制增强 + 文档同步规范 + 模板优化 | [查看](./changelogs/v1.2.0.md) |
| [v1.1.0](./changelogs/v1.1.0.md) | 2026-02-12 | 🎉 重大功能：强制启动协议 + 三轮验证 + 确认点机制 | [查看](./changelogs/v1.1.0.md) |
| [v1.0.0](./changelogs/v1.0.0.md) | 2026-02-11 | 初始版本：核心工作流 + 文档模板 + 最佳实践 | [查看](./changelogs/v1.0.0.md) |

---

## 🚨 重要更新

### v2.2.0 - 项目规范模块化重构 + 规范体系清理 🆕

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
**最后更新**: 2026-02-12
