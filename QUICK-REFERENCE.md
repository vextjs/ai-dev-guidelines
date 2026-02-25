# 快速参考

> AI 执行任务时的速查手册

**版本**: v2.2.0  
**最后更新**: 2026-02-24

---

## 🔍 预检查 (每次必做)

```text
📋 预检查:
1. 工作区: [当前路径]
2. 任务类型: [需求/Bug/优化/...]
3. 输出位置: [projects/<project>/...]
```

---

## 🎯 任务类型映射

| 关键词 | 任务类型 | 工作流路径 |
|-------|---------|-----------|
| 实现、开发、添加、集成、新增 | 需求开发 | `workflows/01-requirement-dev/` |
| 修复、解决、Bug、报错、异常 | Bug 修复 | `workflows/02-bug-fix/` |
| 优化、慢、性能、加速 | 性能优化 | `workflows/03-optimization/` |
| 调研、选型、对比、POC | 技术调研 | `workflows/04-research/` |
| 重构、重写、改造、升级 | 架构重构 | `workflows/05-refactoring/` |
| 数据库、迁移、Schema | 数据库变更 | `workflows/06-database/` |
| 安全、漏洞、加固 | 安全修复 | `workflows/07-security/` |
| 事故、故障、复盘 | 事故复盘 | `workflows/08-incident/` |
| 新项目、开源、npm包、初始化 | 开源项目初始化 | `workflows/09-opensource-init/` 🆕 |

---

## 📝 执行模式

### 快速模式 (默认)

| 项目 | 说明 |
|-----|------|
| 适用 | 简单需求、小改动、< 5 个文件 |
| 流程 | 5 阶段（理解→方案→实施方案→执行→报告） |
| 模板 | `templates/lite/` |
| 时间 | 15-30 分钟 |

### 完整模式

| 项目 | 说明 |
|-----|------|
| 适用 | 复杂需求、核心功能、正式交付 |
| 流程 | 7 阶段（+生成文档+验证检查） |
| 模板 | `templates/core/` |
| 时间 | 45-90 分钟 |

### 模式切换

- 用户说 "快速"、"简单" → 快速模式
- 用户说 "完整"、"详细"、"需要文档" → 完整模式
- 用户说 "只要代码" → 跳过文档

---

## ✅ 确认点 (CP)

| 确认点 | 时机 | 必须等待用户 |
|-------|------|-------------|
| CP1 | 需求理解后 | ✅ 是 |
| CP2 | 技术方案后 | ✅ 是 |
| CP3 | 实施方案后（含实施前检查） | ✅ 是 - 确认所有变更内容后才执行 |

> **完整模式额外确认点**: CP4 (测试完成后)、CP5 (文档生成后)  
> 详见 [workflows/common/confirmation-points.md](./workflows/common/confirmation-points.md)

---

## 📂 输出路径

```
projects/<project-name>/
├── requirements/    # 需求开发输出
│   └── <YYYYMMDD-feature>/
├── bugs/           # Bug 修复输出
│   └── <BUG-xxx>/
├── optimizations/  # 性能优化输出
│   └── <OPT-xxx>/
├── research/       # 技术调研输出
│   └── <RES-xxx>/
├── refactoring/    # 架构重构输出
│   └── <REF-xxx>/
├── database/       # 数据库变更输出
│   └── <DB-xxx>/
├── security/       # 安全修复输出
│   └── <SEC-xxx>/
└── incidents/      # 事故复盘输出
    └── <INC-xxx>/
```

---

## 📋 模板选择

| 任务类型 | 快速模式 | 完整模式 |
|---------|---------|---------|
| 需求开发 | `lite/requirement-lite.md` | `core/requirement-template.md` |
| 技术方案 | `lite/technical-lite.md` | `core/technical-template.md` |
| 实施方案 | `lite/implementation-lite.md` | `core/implementation-template.md` |
| Bug 分析 | `lite/bug-analysis-lite.md` | `core/bug-analysis-template.md` |
| 性能优化 | `lite/optimization-lite.md` | `core/optimization-template.md` |
| 技术调研 | `lite/research-lite.md` | `extended/research-template.md` |
| 架构重构 | `lite/refactoring-lite.md` | `extended/refactoring-template.md` |
| 系统对接 | - | `core/integration-template.md` |

---

## 🔧 常用工具

| 场景 | 参考文档 |
|-----|---------|
| 文件太大读不完 | `best-practices/token-optimization.md` |
| 项目很复杂 | `best-practices/large-projects.md` |
| 操作出错回滚 | `best-practices/error-handling.md` |
| 代码不符合规范 | `best-practices/compliance-check.md` |
| 遇到异常情况 | `best-practices/edge-cases.md` |
| 跨会话继续 | `best-practices/memory-management.md` |

---

## 🔍 追溯历史任务

查找之前的方案/修复记录：
```
1. 读取 ai-dev-guidelines/projects/<project>/.ai-memory/SUMMARY.md（快速回忆）
2. 读取 projects/<project>/TASK-INDEX.md（正式索引）
3. 搜索关键词，定位任务 ID 和路径
4. 读取具体文档
```

> **⚠️ 强关联**: 此机制依赖各工作流（01-08）在任务完成时更新 TASK-INDEX.md + .ai-memory/  
> 模板位置: `projects/_template/TASK-INDEX.md`  
> 记忆机制: `workflows/common/task-memory.md`

---

## ⚠️ 核心约束 (11条)

1. **删除操作需确认** - 删除代码/文件前必须用户确认
2. **Git 操作需确认** - commit/push 前必须用户确认
3. **方案选择需确认** - 多方案时必须用户决策
4. **多任务需拆分** - 同时多个任务建议分开执行
5. **错误处理** - 所有代码必须有错误处理
6. **禁止硬编码** - 敏感信息必须用环境变量
7. **结构化输出** - 所有输出必须结构化
8. **报告需验证** - 分析报告必须逐项验证，按 🔴/🟡/💡/❌ 分类
9. **修复需扫描** - 修复后必须全局扫描同类问题+数据联动检查
10. **主动合理性分析** - 收到指令先评估合理性，有更好建议先提出
11. **自动关联文件检查** - 修改文件时自动扫描关联文件并同步

> 完整说明见 [CONSTRAINTS.md](./CONSTRAINTS.md)

---

## 🔗 相关文档

- [README.md](./README.md) - 项目入口
- [CONSTRAINTS.md](./CONSTRAINTS.md) - 完整约束
- [best-practices/WHEN-TO-USE.md](./best-practices/WHEN-TO-USE.md) - 问题速查
- [workflows/](./workflows/) - 工作流详情
- [templates/](./templates/) - 模板详情

---

**版本**: v2.2.0  
**最后更新**: 2026-02-24

