---
标题: 行程广场实施方案索引
项目: chat
类型: implementation
Agent: zed-copilot
日期: 2026-03-05
状态: 📝 CP3 待确认
---

# 行程广场实施方案

> **上游文档**: [01-需求定义.md](../01-需求定义.md) → [02-技术方案.md](../02-技术方案.md) → 本目录
> **实施计划**: [IMPLEMENTATION-PLAN.md](../IMPLEMENTATION-PLAN.md)（任务编号 / 依赖拓扑 / 进度追踪）
> **总操作数**: 29 项（新建 16 + 修改 10 + 删除 3）
> **涉及服务**: chat + payment

---

## 目录结构

| 文件 | Phase | 任务编号 | 文件操作数 | 说明 |
|------|:-----:|:--------:|:----------:|------|
| [phase-0-dsl.md](./phase-0-dsl.md) | 0 | T01-T09 | 9 | DSL 多语言子目录迁移（schema-dsl v1.2.3） |
| [phase-1-model.md](./phase-1-model.md) | 1 | T10-T12 | 3 | Model 层：trip.ts 字段变更 + trip_like.ts 新建 |
| [phase-2-sell-config.md](./phase-2-sell-config.md) | 2 | T13-T14 | 2 | 售卖配置修复 + price=0 全内容预览 |
| [phase-3-like.md](./phase-3-like.md) | 3 | T15-T17 | 3 | 点赞功能完整链路（Service → Controller → Route） |
| [phase-4-square.md](./phase-4-square.md) | 4 | T18-T22 | 5 | 广场列表双端点 + 卖家信息 + 复合排序 |
| [phase-5-register.md](./phase-5-register.md) | 5 | T23-T25 | 3 | 路由注册 + payment 侧 price=0 拦截 |

---

## 阅读指南

每个 Phase 文件包含以下结构：

1. **变更概要** — 本 Phase 的目标和涉及文件清单
2. **逐文件变更** — 每个文件的具体代码变更（含变更前/变更后对比、新建文件完整代码）
3. **完成标准** — 验证本 Phase 完成的检查清单

---

## 执行约束

- 严格按 Phase 顺序执行（Phase 0 → 1 → 2 → 3 → 4 → 5）
- 每个 Phase 完成后在 `IMPLEMENTATION-PLAN.md` 中更新对应任务状态
- Phase 0（DSL 迁移）完成后需验证现有多语言功能无回归
- Phase 5 的 T25（payment 服务）可与 chat 服务独立部署

---

*文档创建时间: 2026-03-05 | Agent: zed-copilot | 状态: 📝 CP3 待确认*