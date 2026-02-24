# 技术调研流程

> **任务类型**: 技术调研  
> **使用场景**: 技术选型、方案对比、POC 验证  
> **输出目录**: `projects/<project-name>/research/<research-id>/`  
> **版本**: v2.1.0

---

## 📋 流程概览

```
背景分析 → 方案收集 → 方案对比 → POC 验证 → 结论建议
```

---

## 🎯 执行步骤

### Step 1: 背景分析
- 收集调研需求和背景
- 明确调研目标
- 确定评估维度

**输出**: `01-background.md`

### Step 2: 方案收集
- 调研可选技术方案
- 收集官方文档和社区评价
- 列出候选方案清单

**输出**: 更新 `01-background.md`

### Step 3: 方案对比
- 从多个维度对比方案
- 列出各方案优劣
- 标注适用场景

**输出**: `02-comparison.md`

### Step 4: POC 验证
- 编写 POC 代码
- 测试关键功能
- 记录测试结果

**输出**: `03-poc.md` 和 `scripts/poc-*.js`

### Step 5: 结论建议
- 综合评估
- 给出推荐方案
- 说明选择理由
- **更新 `projects/<project>/TASK-INDEX.md`**
- **生成任务记忆** `dev-docs/projects/<project>/.ai-memory/`（详见 [common/task-memory.md](../common/task-memory.md)）

**输出**: `04-conclusion.md`

---

## 📦 输出示例

```
projects/payment-service/research/RES-cache-selection-20260211/
├── 01-background.md           # 背景: 为什么需要缓存
├── 02-comparison.md           # 对比: Redis vs Memcached
├── 03-poc.md                  # POC: 性能测试结果
├── 04-conclusion.md           # 结论: 选择 Redis
└── scripts/
    ├── redis-poc.js           # Redis POC
    └── memcached-poc.js       # Memcached POC
```

---

## ✅ 完成检查清单

- [ ] 调研背景已明确
- [ ] 至少对比 2 个方案
- [ ] POC 已完成
- [ ] 给出明确推荐
- [ ] 所有文档已生成

---

## ✅ 技术调研专属验证

完成调研后，执行以下验证：

```yaml
技术调研验证清单:
  完整性验证:
    ✅ 背景清晰: 调研目标和动机明确
    ✅ 方案完整: 至少对比 2-3 个候选方案
    ✅ 维度全面: 性能/成本/易用性/社区支持等维度覆盖
  
  客观性验证:
    ✅ 有数据支撑: 对比有具体数据/测试结果
    ✅ 无主观偏见: 客观评价各方案优劣
    ✅ POC 验证: 关键功能已通过 POC 验证
  
  可执行性验证:
    ✅ 结论明确: 有清晰的推荐方案
    ✅ 理由充分: 推荐理由有说服力
    ✅ 风险识别: 已识别潜在风险
```

---

**相关模板**: [研究调研模板](../../templates/extended/research-template.md)

