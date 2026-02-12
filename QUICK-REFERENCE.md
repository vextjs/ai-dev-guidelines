# 🚀 快速参考卡

> AI 执行任务时的速查手册

---

## 📋 任务类型 → 工作流映射

| 任务类型 | 工作流文件 | 关键词 |
|---------|-----------|--------|
| 需求开发 | `workflows/01-requirement-dev/` | 实现、开发、添加、集成、对接 |
| Bug 修复 | `workflows/02-bug-fix/` | 修复、解决、Bug、报错 |
| 性能优化 | `workflows/03-optimization/` | 优化、慢、性能、加速 |
| 技术调研 | `workflows/04-research/` | 调研、选型、对比 |
| 架构重构 | `workflows/05-refactoring/` | 重构、重写、改造 |
| 数据库变更 | `workflows/06-database/` | 迁移、Schema、索引 |
| 安全修复 | `workflows/07-security/` | 漏洞、安全、注入 |
| 事故复盘 | `workflows/08-incident/` | 故障、复盘、宕机 |

---

## 🚨 四条底线（必须遵守）

```yaml
1. 先读工作流: 收到请求 → 先读 workflows/ → 再执行
2. 按模板生成: 使用 templates/ 的模板，不要自由发挥
3. 保存到 projects/: 所有输出放到 projects/<project-name>/
4. 验证后报告: 执行完验证步骤才能说"完成"
```

---

## 📁 输出路径规范

```
projects/<project-name>/
├── requirements/              # 需求开发输出
│   └── <YYYYMMDD-feature>/
├── bugs/                      # Bug 修复输出
│   └── <BUG-project-id>/
├── optimizations/             # 性能优化输出
├── refactoring/               # 重构输出
├── database/                  # 数据库变更输出
├── security/                  # 安全修复输出
└── research/                  # 技术调研输出
```

---

## 📝 文档编号规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 需求 | `YYYYMMDD-<feature>` | `20260212-rate-limit` |
| Bug | `BUG-<project>-<id>-<desc>` | `BUG-user-001-login-timeout` |
| 优化 | `OPT-<module>-<id>` | `OPT-payment-db-001` |
| 重构 | `REF-<module>-<date>` | `REF-user-auth-20260212` |

---

## ✅ 预检查清单（每次必做）

```
🔴 预检查清单:
✅ 1. 工作区: <项目路径>
✅ 2. 项目规范: 已加载 PROJECT-PROFILE.md
✅ 3. 任务类型: <识别结果>
✅ 4. 风险等级: P0/P1/P2
✅ 5. 输出目录: projects/<project>/...
```

---

## 🎯 确认点（必须等待用户）

| 确认点 | 时机 | 选项 |
|--------|------|------|
| CP1 | 需求理解后 | 确认/修改 |
| CP2 | 方案设计后 | 确认/修改/取消 |
| CP3 | 代码实现后 | 确认/修改/取消 |
| CP4 | 测试完成后 | 确认/重测/跳过 |
| CP5 | 文档生成后 | 确认/修改 |
| CP6 | 项目文档更新后 | 确认/修改/跳过 |

---

## 🔗 常用链接

- [预检查流程](./workflows/00-pre-check/README.md)
- [任务识别](./workflows/00-task-identification/README.md)
- [确认点机制](./workflows/common/confirmation-points.md)
- [三轮验证](./best-practices/validation/README.md)
- [禁止项清单](./CONSTRAINTS.md)

---

**最后更新**: 2026-02-12

