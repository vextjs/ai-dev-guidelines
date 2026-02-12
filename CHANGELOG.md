# 变更日志 (CHANGELOG)

> **说明**: 版本概览摘要，详细变更见 [changelogs/](./changelogs/) 目录  
> **最后更新**: 2026-02-12

---

## 版本概览

| 版本 | 日期 | 变更摘要 | 详细 |
|------|------|---------|------|
| [v2.0.0](./changelogs/v2.0.0.md) | 2026-02-12 | 🎉 重大重构：快速/完整双模式 + 精简模板 + 工作流优化 | [查看](./changelogs/v2.0.0.md) |
| [v1.3.0](./changelogs/v1.3.0.md) | 2026-02-12 | 🔧 全面修复：6个规范文件补全 + 新增配置/工具规范 + 状态追踪 | [查看](./changelogs/v1.3.0.md) |
| [v1.2.0](./changelogs/v1.2.0.md) | 2026-02-12 | 🔧 优化：确认点机制增强 + 文档同步规范 + 模板优化 | [查看](./changelogs/v1.2.0.md) |
| [v1.1.0](./changelogs/v1.1.0.md) | 2026-02-12 | 🎉 重大功能：强制启动协议 + 三轮验证 + 确认点机制 | [查看](./changelogs/v1.1.0.md) |
| [v1.0.0](./changelogs/v1.0.0.md) | 2026-02-11 | 初始版本：核心工作流 + 文档模板 + 最佳实践 | [查看](./changelogs/v1.0.0.md) |

---

## 🚨 重要更新

### v2.0.0 - 重大重构：轻量化与灵活性 🆕

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
- ✅ **项目规范**: 新增统一的 PROJECT.md 模板
- ✅ **快速索引**: 新增 best-practices/WHEN-TO-USE.md

#### 新增文件

- `templates/lite/README.md` - 精简模板说明
- `templates/lite/technical-lite.md` - 精简技术方案
- `templates/lite/requirement-lite.md` - 精简需求文档
- `templates/lite/implementation-lite.md` - 精简实施记录
- `templates/lite/bug-analysis-lite.md` - 精简 Bug 分析
- `projects/_template/PROJECT.md` - 统一项目规范模板
- `workflows/01-requirement-dev/README-v2.md` - v2 需求开发流程
- `workflows/00-pre-check/README-v2.md` - v2 简化预检查
- `best-practices/WHEN-TO-USE.md` - 最佳实践快速索引

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
- ✅ **快速参考**: 增强 QUICK-REFERENCE.md（文档矩阵 + 验证速查）

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

- `QUICK-REFERENCE.md` - 新增文档矩阵 + 四条底线扩展 + 三轮验证速查
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
