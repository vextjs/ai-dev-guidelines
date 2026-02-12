# Outputs Directory (已弃用)

> ⚠️ **重要提示**: 此目录已弃用，仅保留用于历史兼容性。  
> **所有新文档请使用 `projects/<project-name>/` 路径**

---

## 📌 弃用说明

**弃用日期**: 2026-02-12  
**原因**: 统一项目文档管理，采用更清晰的项目结构

### 新旧路径对比

| 旧路径（已弃用） | 新路径（推荐） |
|----------------|---------------|
| `outputs/<project-name>/requirements/` | `projects/<project-name>/requirements/` |
| `outputs/<project-name>/bugs/` | `projects/<project-name>/bugs/` |
| `outputs/<project-name>/optimizations/` | `projects/<project-name>/optimizations/` |
| `outputs/<project-name>/research/` | `projects/<project-name>/research/` |
| `outputs/<project-name>/refactoring/` | `projects/<project-name>/refactoring/` |
| `outputs/<project-name>/database/` | `projects/<project-name>/database/` |
| `outputs/<project-name>/security/` | `projects/<project-name>/security/` |
| `outputs/<project-name>/incidents/` | `projects/<project-name>/incidents/` |

---

## 🔄 迁移指南

### 如果你有现有文档在 outputs/

```bash
# 1. 创建新的项目目录（如果不存在）
mkdir -p projects/<project-name>

# 2. 移动文档到新位置
mv outputs/<project-name>/* projects/<project-name>/

# 3. 更新引用（如果有）
# 将代码中对 outputs/ 的引用改为 projects/
```

### AI 使用说明

```yaml
AI 执行任务时:
  - ❌ 不要将文档放到 outputs/ 目录
  - ✅ 所有文档统一放到 projects/<project-name>/ 下

路径规范:
  需求开发: projects/<project>/requirements/<YYYYMMDD-feature>/
  Bug 修复: projects/<project>/bugs/<BUG-project-id>/
  性能优化: projects/<project>/optimizations/<OPT-module-id>/
  技术调研: projects/<project>/research/<topic>/
  架构重构: projects/<project>/refactoring/<REF-module-date>/
  数据库变更: projects/<project>/database/<DB-change-date>/
  安全修复: projects/<project>/security/<SEC-vuln-date>/
  事故复盘: projects/<project>/incidents/<INC-date-level>/
```

---

## 📚 参考文档

- [项目目录结构](../projects/README.md)
- [根目录 README](../README.md) - 查看完整目录说明
- [快速参考卡](../QUICK-REFERENCE.md) - 输出路径规范

---

## ⏰ 历史兼容性

此目录保留至 **2026-06-30**，之后将被完全移除。请尽快迁移现有文档。

---

**最后更新**: 2026-02-12
