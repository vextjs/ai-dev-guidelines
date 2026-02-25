# REQ-001: monSQLize 全功能逐项验证

> **项目**: monSQLize v1.1.6  
> **日期**: 2026-02-25  
> **优先级**: P1

---

## 一、需求背景

monSQLize 已迭代到 v1.1.6，积累了 87 篇功能文档、120 个源码文件、152 个测试文件，但从未系统性地验证过 **代码 ↔ 文档 ↔ 测试 ↔ 类型定义** 四者的一致性。

**目标**：建立完整验证清单，按清单逐个执行验证。

---

## 二、验证维度

每个功能验证 4 个维度：

| 维度 | 说明 | 方式 |
|------|------|------|
| 代码 | 源码存在、导出正确、核心逻辑 | 读源码 |
| 文档 | API 签名、参数、返回值、示例与代码一致 | 逐条对照 |
| 测试 | 测试存在、通过、覆盖正常/异常/边界 | 运行测试 |
| 类型 | `index.d.ts` 签名与代码匹配（有类型定义的功能） | tsc 对照 |

---

## 三、验证清单

→ 见 [02-checklist.md](./02-checklist.md)（125 个功能项，16 个分类）

**覆盖统计**：源码 120/120 · 文档 87/87 · 测试 152/152

---

## 四、执行规范

### 4.1 验证顺序

A → B → C → E → F → D → G → H → I → J → K → L → M → N → O → A0

### 4.2 产出

每验证完一个功能：
1. 创建验证文档：`monSQLize/validation/checklists/{功能名}.md`（参考 `connect.md` 格式）
2. 有问题时产出报告：`monSQLize/validation/reports/{功能名}-report.md`
3. 更新清单中的 **状态** 列和 **验证文档** 列

### 4.3 问题处理

| 问题类型 | 处理 |
|---------|------|
| 文档与代码不一致 | 修复文档 |
| 类型定义不一致 | 修复 `index.d.ts` |
| 测试缺失 | 记录，不在本需求补 |
| 代码 bug | 单独创建 Bug 任务 |

### 4.4 路径约定

清单中使用中文简写定位测试文件：

| 前缀 | 路径 |
|------|------|
| 功能 `xxx` | `test/unit/features/xxx.test.js` |
| 基础设施 `xxx` | `test/unit/infrastructure/xxx.test.js` |
| Model `xxx` | `test/unit/model/xxx.test.js` |
| Saga `xxx` | `test/unit/saga/xxx.test.js` |
| 同步 `xxx` | `test/unit/sync/xxx.test.js` |
| 锁 `xxx` | `test/unit/lock/xxx.test.js` |
| 工具 `xxx` | `test/unit/utils/xxx.test.js` |
| 公共 `xxx` | `test/unit/common/xxx.test.js` |
| 查询 `xxx` | `test/unit/queries/xxx.test.js` |
| 写入 `xxx` | `test/unit/writes/xxx.test.js` |
| 单元 `xxx` | `test/unit/xxx.test.js` |
| 集成 `xxx` | `test/integration/xxx.test.js` |
| 兼容性 `xxx` | `test/compatibility/xxx.test.js` |
| 性能 `xxx` | `test/performance/xxx.test.js` |
| 验证 `xxx` | `test/verification/xxx.test.js` |
| 慢查询 `xxx` | `test/slow-query-log/xxx.test.js` |
| 根级 `xxx` | `test/xxx.test.js` |

代码路径相对于 `lib/`，文档路径相对于 `docs/`。

---

## 五、验收标准

| 验收项 | 标准 |
|-------|------|
| 清单覆盖 | 125 个功能全部有验证记录 |
| 文档修复 | 所有文档不一致全部修复 |
| 类型修复 | 所有类型不一致全部修复 |
| 验证文档 | 每个功能都有对应的 `validation/checklists/` 文件 |

---

## 六、相关文档

- 验证清单：[02-checklist.md](./02-checklist.md)
- 项目规范：`dev-docs/projects/monSQLize/profile/`
- 验证参考：`monSQLize/validation/checklists/connect.md`
- 文档索引：`monSQLize/docs/INDEX.md`
- 架构约束第 11 条：新功能必须加入验证清单
