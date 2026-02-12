# Workflows - 工作流定义

> AI 执行各类任务的标准化流程

---

## 📋 工作流目录

### 基础流程

| 编号 | 工作流 | 说明 |
|------|--------|------|
| 00-pre-check | [前置检查](./00-pre-check/) | 所有任务开始前的必要检查 |
| 00-task-identification | [任务识别](./00-task-identification/) | 识别任务类型和工作流 |

### 核心流程

| 编号 | 工作流 | 说明 |
|------|--------|------|
| 01 | [需求开发](./01-requirement-dev/) | 新功能开发流程 |
| 02 | [Bug 修复](./02-bug-fix/) | 问题排查和修复流程 |
| 03 | [性能优化](./03-optimization/) | 性能分析和优化流程 |
| 04 | [技术调研](./04-research/) | 技术选型和调研流程 |
| 05 | [架构重构](./05-refactoring/) | 代码重构和架构演进 |
| 06 | [数据库变更](./06-database/) | 数据库 Schema 变更流程 |
| 07 | [安全修复](./07-security/) | 安全漏洞修复流程 |
| 08 | [事故复盘](./08-incident/) | 故障分析和改进流程 |

### 专项流程

| 编号 | 工作流 | 说明 |
|------|--------|------|
| 09-opensource-init | [开源项目初始化](./09-opensource-init/) | 创建开源 NPM 包项目 🆕 |

### 通用组件

| 文件 | 说明 |
|------|------|
| [common/](./common/) | 通用组件（确认点、文档同步等） |
| [decision-tree.yaml](./decision-tree.yaml) | 决策树配置 |

### 通用文档（跨工作流）

| 文件 | 说明 |
|------|------|
| [09-COMPLETION-AND-DELIVERY.md](./09-COMPLETION-AND-DELIVERY.md) | 完成验证和交付规范（所有工作流通用） |
| [10-WORKFLOW-TRANSITIONS.md](./10-WORKFLOW-TRANSITIONS.md) | 工作流转移规则（跨工作流切换） |

> **说明**: 09/10 是单独文件而非目录，因为它们是**跨工作流通用文档**，不属于特定任务类型。

---

## 🔄 执行顺序

```
1. 前置检查 (00-pre-check)
   ↓
2. 任务识别 (00-task-identification)
   ↓
3. 选择对应工作流 (01-08)
   ↓
4. 执行工作流步骤
   ↓
5. 验证和交付
```

---

## 📎 相关文档

- [../README.md](../README.md) - 项目入口
- [../best-practices/WHEN-TO-USE.md](../best-practices/WHEN-TO-USE.md) - 快速索引
- [../templates/](../templates/) - 文档模板

---

**最后更新**: 2026-02-12

