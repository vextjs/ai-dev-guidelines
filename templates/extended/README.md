# 扩展模板 (Extended Templates)

> 用于 Tier 2 任务（使用频率约 20%）的完整文档模板

---

## 📋 模板清单

| 模板文件 | 用途 | 对应工作流 |
|---------|------|-----------|
| [research-template.md](./research-template.md) | 技术调研报告 | `workflows/04-research/` |
| [refactoring-template.md](./refactoring-template.md) | 架构重构计划 | `workflows/05-refactoring/` |
| [database-template.md](./database-template.md) | 数据库变更文档 | `workflows/06-database/` |
| [security-template.md](./security-template.md) | 安全修复报告 | `workflows/07-security/` |
| [incident-template.md](./incident-template.md) | 事故复盘报告 | `workflows/08-incident/` |

---

## 🎯 使用场景

### 技术调研 (research-template.md)

**适用于**:
- 技术选型（如：Redis vs Memcached）
- 方案对比
- POC 验证

### 架构重构 (refactoring-template.md)

**适用于**:
- 大型代码重构
- 架构升级
- 模块拆分

### 数据库变更 (database-template.md)

**适用于**:
- Schema 变更
- 数据迁移
- 索引优化

### 安全修复 (security-template.md)

**适用于**:
- 漏洞修复
- 安全加固
- 合规整改

### 事故复盘 (incident-template.md)

**适用于**:
- 生产故障分析
- 事故复盘
- 改进措施制定

---

## 📝 与 Lite 模板对比

| 对比项 | Extended (本目录) | Lite |
|-------|------------------|------|
| 章节数 | 8-15 个 | 4-5 个 |
| 详细程度 | 完整详细 | 精简扼要 |
| 适用场景 | 正式交付、复杂任务 | 快速迭代、简单任务 |
| 位置 | `templates/extended/` | `templates/lite/` |

---

## 📎 相关文档

- [../README.md](../README.md) - 模板总索引
- [../lite/](../lite/) - 精简模板目录
- [../core/](../core/) - 核心模板目录

---

**最后更新**: 2026-02-12

