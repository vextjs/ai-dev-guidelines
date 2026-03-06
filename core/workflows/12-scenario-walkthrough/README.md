# 场景化走查工作流

> 以用户视角模拟真实场景，验证规范体系的可执行性和 AI 行为合规性

**最后更新**: 2026-03-04  
**定位**: 质量保障工具（非用户任务类型工作流）

---

## 🔴 与现有机制的边界（必读）

```yaml
本工作流 ≠ 11-self-audit（规范自我审查）:
  11-self-audit: 审查规范文件自身的一致性、完整性、健康度（面向文档）
  12-walkthrough: 模拟用户场景，验证 AI 是否按规范执行（面向行为）

本工作流 ≠ self-fix（自修复）:
  self-fix:      反应式 — 发现问题后修复
  12-walkthrough: 预防式 — 在问题发生前通过场景模拟发现规范盲区

本工作流 ≠ 10-analysis（深度分析）:
  10-analysis:    通用分析工作流，面向任意目标
  12-walkthrough: 固定 36 个用例的结构化验证，面向规范行为

协作关系:
  11-self-audit   ←── 审查规范文档一致性（上游）
  12-walkthrough  ←── 验证规范执行合规性（下游）
  self-fix/       ←── 走查发现的问题交给 self-fix 修复

定位说明:
  本工作流是"质量保障工具"，不计入"11 种工作流"统计。
  类比操作系统中的"系统自检/诊断程序"，不属于用户进程调度。
```

---

## 🎯 触发条件

### 消息触发（用户主动）

```yaml
触发关键词:
  - "规范走查" / "场景验证" / "walkthrough"
  - "模拟用户" / "走查用例" / "场景化测试"
  - "验证规范执行" / "流程走查"

触发粒度（4 种）:
  完整走查: "完整规范走查" — 全部 36 个用例
  快速走查: "快速规范走查" — 核心 11 个用例（每个工作流 1 条）
  按组走查: "走查流程控制场景" — 指定分组（workflow / flow-control / edge-case）
  单用例走查: "走查 W01" — 指定用例 ID
```

### 建议触发时机

```yaml
推荐场景:
  - 规范版本升级后（major/minor）
  - 11-self-audit 完成后追加行为验证
  - 新增工作流/约束/机制后
  - 新 Agent 首次接入规范时
```

---

## 📋 用例文件索引

| 文件 | 用例数 | 覆盖范围 |
|------|:------:|---------|
| [01-workflow-scenarios.md](./01-workflow-scenarios.md) | 11 | 11 个工作流的正常路径 |
| [02-flow-control-scenarios.md](./02-flow-control-scenarios.md) | 13 | 预检查、记忆、确认点、统一流程、出口门禁等流程控制 |
| [03-edge-case-scenarios.md](./03-edge-case-scenarios.md) | 12 | 边界条件、异常处理、禁止行为 |
| **合计** | **36** | 规范中所有已定义场景 |

---

## 📊 用例格式规范

每个用例采用统一 YAML 结构：

```yaml
- id: "W01"                          # 用例 ID（W=workflow / F=flow / E=edge）
  name: "需求开发正常路径"              # 用例名称
  category: workflow                   # 分类: workflow / flow-control / edge-case
  source_ref: "01-requirement-dev"     # 规范来源文件（验证依据）
  simulated_input: "用户模拟输入"       # 模拟的用户消息
  expected_behavior:                   # 期望 AI 行为（有序列表）
    - "行为 1"
    - "行为 2"
  checkpoints:                         # 关键检查点
    - "检查点 1"
    - "检查点 2"
  pass_criteria: "通过标准"             # 一句话通过判定
  fail_indicators:                     # 失败信号（出现任一即失败）
    - "失败信号 1"
    - "失败信号 2"
```

---

## 🔄 执行流程（4 阶段）

### 阶段 1：确定走查范围

```yaml
输入: 用户的走查请求（含触发粒度）
输出: 确认执行的用例列表

步骤:
  1. 解析触发粒度（完整/快速/按组/单用例）
  2. 加载对应用例文件
  3. 向用户确认走查范围和用例数量
```

### 阶段 2：逐用例模拟执行

```yaml
输入: 用例列表
输出: 每个用例的通过/失败结论

步骤:
  1. 读取用例的 simulated_input
  2. AI 自检：如果收到这条消息，我会如何响应？
  3. 逐条对照 expected_behavior 和 checkpoints
  4. 判定 pass_criteria 是否满足
  5. 检查是否触发任何 fail_indicators
  6. 记录结论（✅ 通过 / ❌ 失败 / 🟡 部分通过）
```

### 阶段 3：输出走查报告

```yaml
输出路径: reports/analysis/<agent>/YYYYMMDD/NN-analysis-场景化走查.md

报告结构:
  1. 走查总览表（用例 ID × 状态 × 发现）
  2. 失败/部分通过用例的详细分析
  3. 发现的规范盲区或执行 gap
  4. 修复建议（如有）
```

### 阶段 4：问题衔接

```yaml
步骤:
  1. 失败用例中的规范问题 → 记录到 issue.md
  2. 可自动修复的问题 → 触发 self-fix
  3. 需人工判断的问题 → 标记待跟进
  4. 更新记忆文件
```

---

## 📎 相关文档

- [规范自我审查](../11-self-audit/README.md) — 文档一致性审查（上游）
- [决策树配置](../decision-tree.yaml) — 关键词映射
- [自动触发规则](../../self-fix/triggers/auto-triggers.md) — 自修复触发
- [约束清单](../../CONSTRAINTS.md) — 22 条执行约束
- [速查手册](../../QUICK-REFERENCE.md) — AI 执行速查

---

**最后更新**: 2026-03-04