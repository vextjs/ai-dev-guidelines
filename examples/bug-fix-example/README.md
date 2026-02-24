# Bug 修复示例

> 用户报告登录超时问题的完整修复流程

---

## 📋 示例概述

| 项目 | 内容 |
|-----|------|
| 项目名称 | user-service |
| 问题类型 | Bug 修复 |
| 严重程度 | P1 |
| 学习价值 | ⭐⭐⭐⭐⭐ |

---

## 👤 用户原始输入

```
用户登录后 session 经常丢失，导致需要重新登录，影响用户体验
```

---

## 🤖 AI 执行流程

### 预检查

```
📋 预检查:
1. 工作区: E:\Worker\user-service
2. 任务类型: Bug 修复
3. 输出位置: projects/user-service/bugs/BUG-001-session-loss/
4. 项目规范: ✅ 已加载 PROJECT.md
```

### 任务识别

- **关键词**: "丢失"、"问题"
- **任务类型**: Bug 修复
- **工作流**: `workflows/02-bug-fix/`

---

## 📁 生成的文档

```
outputs/
├── 01-analysis.md      # 问题分析
├── 02-solution.md      # 解决方案
└── 03-implementation.md # 实施方案
```

---

## 🎯 学习要点

1. **问题复现** - 先确认问题真实存在
2. **根因分析** - 不只修复表象，找到根本原因
3. **影响评估** - 评估修复的影响范围
4. **回滚方案** - 准备好失败时的回滚计划
5. **验证测试** - 确认问题已解决

---

## 📎 相关文档

- [workflows/02-bug-fix/](../../workflows/02-bug-fix/)
- [templates/core/bug-analysis-template.md](../../templates/core/bug-analysis-template.md)
- [templates/lite/bug-analysis-lite.md](../../templates/lite/bug-analysis-lite.md)

---

**创建日期**: 2026-02-12

