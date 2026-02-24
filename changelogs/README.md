# Changelogs 目录说明

本目录存放 dev-docs 各版本的详细变更文档。

---

## 📁 目录结构

```
changelogs/
├── README.md                              # 本说明文档
├── REFACTOR-SUMMARY.md                    # 重构摘要
├── v2.0.0.md                             # v2.0.0 详细变更
├── v1.3.0.md                             # v1.3.0 详细变更
├── v1.2.0.md                             # v1.2.0 详细变更
├── v1.1.0.md                             # v1.1.0 详细变更
├── v1.0.0.md                             # v1.0.0 详细变更
├── v1x-09-COMPLETION-AND-DELIVERY.md     # v1.x 存档（原 workflows/09）
└── v1x-10-WORKFLOW-TRANSITIONS.md        # v1.x 存档（原 workflows/10）
```

> **模板位置**: `templates/common/changelogs/TEMPLATE.md`  
> **说明**: v2.1.0 和 v2.2.0 为同日小版本更新，变更已记录在 CHANGELOG.md 主文件中，未单独建详情文件。

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

