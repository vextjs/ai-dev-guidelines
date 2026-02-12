# Changelogs 目录说明

本目录存放 dev-docs 各版本的详细变更文档。

---

## 📁 目录结构

```
changelogs/
├── README.md           # 本说明文档
├── TEMPLATE.md         # 变更文档模板
├── v1.2.0.md          # v1.2.0 详细变更
├── v1.1.0.md          # v1.1.0 详细变更
└── v1.0.0.md          # v1.0.0 详细变更
```

---

## 📝 如何创建新的变更文档

### 步骤1: 复制模板

```bash
cp templates/common/changelogs/TEMPLATE.md changelogs/v{版本号}.md
```

### 步骤2: 填写内容

根据模板章节填写变更信息

### 步骤3: 更新主 CHANGELOG

在项目根目录的 `CHANGELOG.md` 版本概览表中添加新行

### 步骤4: 提交变更

```bash
git add CHANGELOG.md changelogs/v{版本号}.md
git commit -m "docs: 发布 v{版本号}"
```

---

## 📎 相关文档

- [主 CHANGELOG](../CHANGELOG.md) - 版本概览
- [变更文档模板](../templates/common/changelogs/TEMPLATE.md) - 模板

---

**最后更新**: 2026-02-12

