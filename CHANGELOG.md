# 变更日志 (CHANGELOG)

> **说明**: 版本概览摘要，详细变更见 [changelogs/](./changelogs/) 目录  
> **最后更新**: 2026-02-12

---

## 版本概览

| 版本 | 日期 | 变更摘要 | 详细 |
|------|------|---------|------|
| [v1.2.0](./changelogs/v1.2.0.md) | 2026-02-12 | 🔧 优化：确认点机制增强 + 文档同步规范 + 模板优化 | [查看](./changelogs/v1.2.0.md) |
| [v1.1.0](./changelogs/v1.1.0.md) | 2026-02-12 | 🎉 重大功能：强制启动协议 + 三轮验证 + 确认点机制 | [查看](./changelogs/v1.1.0.md) |
| [v1.0.0](./changelogs/v1.0.0.md) | 2026-02-11 | 初始版本：核心工作流 + 文档模板 + 最佳实践 | [查看](./changelogs/v1.0.0.md) |

---

## 🚨 重要更新

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
