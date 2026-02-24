# 通用工作流组件

> workflows 目录中的通用组件，可被所有工作流引用

---

## 📋 组件清单

| 文件 | 用途 | 使用场景 |
|-----|------|---------|
| [base-workflow.md](./base-workflow.md) | 基础工作流模板 | 所有工作流共用的基础结构 |
| [confirmation-points.md](./confirmation-points.md) | 确认点机制 | CP1-CP6 确认点定义 |
| [document-sync.md](./document-sync.md) | 文档同步规范 | 任务完成后更新相关文档 |
| [stop-and-save.md](./stop-and-save.md) | 中断保存机制 | 任务中断时保存上下文 |
| [task-memory.md](./task-memory.md) | 任务记忆机制 | 🆕 跨会话上下文传递 |
| [temp-reports.md](./temp-reports.md) | 临时报告规范 | 🆕 AI 临时分析报告管理 |

---

## 🎯 使用说明

### 确认点 (Confirmation Points)

所有工作流必须在关键节点设置确认点，等待用户确认后继续：

| 确认点 | 时机 | 必须等待 |
|-------|------|---------|
| CP1 | 需求理解后 | ✅ |
| CP2 | 方案设计后 | ✅ |
| CP3 | 实施方案后 | ✅ |
| CP4 | 测试完成后 | ✅ (完整模式) |
| CP5 | 文档生成后 | ✅ (完整模式) |
| CP6 | 项目文档更新后 | 可选 |

详见 [confirmation-points.md](./confirmation-points.md)

### 文档同步

任务完成后必须更新的文档：

1. `projects/<project>/TASK-INDEX.md` - 添加任务记录
2. `dev-docs/projects/<project>/.ai-memory/` - 生成任务记忆
3. `STATUS.md` / `CHANGELOG.md` - 如涉及版本变更

详见 [document-sync.md](./document-sync.md)

### 中断保存

当任务需要中断时，保存上下文以便后续恢复：

1. 记录当前进度
2. 保存未完成的工作
3. 生成恢复指引

详见 [stop-and-save.md](./stop-and-save.md)

---

## 📎 相关文档

- [../README.md](../README.md) - 工作流索引
- [../decision-tree.yaml](../decision-tree.yaml) - 决策树配置
- [../../CONSTRAINTS.md](../../CONSTRAINTS.md) - 约束清单

---

**最后更新**: 2026-02-24

