# 临时报告规范

> AI 任务过程中产生的临时分析报告的存储和管理规范

---

## 🎯 解决的问题

- 各项目 `reports/` 目录下文件平铺无结构（如 payment 有 20+ 个平铺文件）
- 报告命名无规范，难以检索
- 没有定义哪些该保留、哪些该清理

---

## 📁 存储位置

```
dev-docs/projects/<project>/          # 如 projects/chat/
└── reports/                          # 🔴 AI 临时报告（gitignore 忽略）
    ├── diagnostics/                  # 诊断分析报告
    ├── bugs/                         # Bug 分析报告
    ├── requirements/                 # 需求分析报告
    ├── optimizations/                # 优化分析报告
    └── .temp/                        # 临时/中间过程文件（可随时清理）
```

> **注意**: `reports/` 在 dev-docs/.gitignore 中忽略，不提交到 git。

---

## 📝 命名规范

```yaml
格式: <日期>-<类型>-<简述>.md

类型前缀:
  diag-    : 诊断报告
  bug-     : Bug 分析
  req-     : 需求分析
  opt-     : 优化分析
  review-  : 代码审查

示例:
  20260224-bug-subscription-renewal-duplicate.md
  20260224-req-trip-title-optimization.md
  20260224-diag-memory-leak-analysis.md
```

---

## 🔄 与 dev-docs 的关系

```yaml
reports/ (dev-docs/projects/<project>/ 下):
  - 临时工作文件，不提交 git
  - AI 分析过程中随时写入
  - 可做参考但不是正式文档

dev-docs/projects/<project>/requirements/ 等 (归档文档):
  - 正式归档文档，提交 git
  - 完整模式下生成
  - 长期保存，可追溯
```

---

## ⚙️ AI 执行规范

```yaml
写入时机:
  - 分析代码时生成诊断报告 → reports/diagnostics/
  - Bug 定位时生成分析报告 → reports/bugs/
  - 需求分析时生成临时方案 → reports/requirements/
  - 中间过程文件 → reports/.temp/

清理策略:
  - .temp/ 下文件可随时清理
  - 其他目录保留 30 天
  - 用户可以说"清理临时报告"触发
```

---

**版本**: v1.0  
**创建日期**: 2026-02-24

