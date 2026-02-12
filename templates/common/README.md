# 通用模板组件

> 可在任何文档中复用的通用组件

---

## 📋 组件清单

| 文件 | 用途 | 使用方式 |
|-----|------|---------|
| [header.md](./header.md) | 文档头部 | 包含标题、元数据、目录 |
| [footer.md](./footer.md) | 文档尾部 | 包含签名、版本信息 |
| [checklist.md](./checklist.md) | 检查清单 | 任务验收标准模板 |
| [STATUS-template.md](./STATUS-template.md) | 状态模板 | 项目状态追踪模板 |
| [CHANGELOG-template.md](./CHANGELOG-template.md) | 变更日志模板 | 版本变更记录模板 |
| [status-badge.md](./status-badge.md) | 状态徽章 | 文档状态标记 |
| [changelogs/](./changelogs/) | 变更日志子目录 | 详细变更模板 |

---

## 🎯 使用说明

### 文档头部

```markdown
# [文档标题]

> **项目**: [项目名]  
> **日期**: YYYY-MM-DD  
> **状态**: 📝 草稿 / ✅ 已确认

---
```

### 文档尾部

```markdown
---

**版本**: v1.0  
**最后更新**: YYYY-MM-DD
```

### 状态徽章

| 徽章 | 含义 |
|-----|------|
| 📝 草稿 | 初稿，待确认 |
| 🔄 进行中 | 正在执行 |
| ✅ 已完成 | 已验收通过 |
| ⚠️ 待验证 | 需要验证 |
| ❌ 已取消 | 任务取消 |

---

**最后更新**: 2026-02-12

