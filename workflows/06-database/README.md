# 数据库变更流程

> **任务类型**: 数据库变更  
> **使用场景**: Schema 变更、数据迁移、索引优化  
> **输出目录**: `projects/<project-name>/database/<db-change-id>/`  

---

## 📋 流程概览

```
变更设计 → 脚本编写 → 测试验证 → 灰度执行 → 验证回滚
```

---

## 🎯 执行步骤

### Step 1: 变更设计
- 分析变更需求
- 设计 Schema 变更
- 评估影响范围

**输出**: `01-design.md`

### Step 2: 脚本编写
- 编写迁移脚本
- 编写回滚脚本
- 编写验证脚本

**输出**: `scripts/*.sql`

### Step 3: 测试验证
- 在测试环境执行
- 验证数据正确性
- 测试回滚流程

**输出**: `02-validation.md`

### Step 4: 生产执行
- 制定执行计划
- 灰度执行（如可能）
- 监控数据库性能

**输出**: `03-execution.md`

### Step 5: 执行后验证
- 验证数据完整性
- 检查应用功能
- 确认性能指标

**输出**: 更新 `03-execution.md`

---

## 📦 输出示例

```
projects/user-service/database/DB-add-user-index-20260211/
├── 01-design.md               # 变更设计
├── 02-validation.md           # 测试验证
├── 03-execution.md            # 执行记录
└── scripts/
    ├── migration.sql          # 迁移脚本
    ├── rollback.sql           # 回滚脚本
    └── verify.sql             # 验证脚本
```

---

## 🚨 高危操作警告

### 必须有回滚脚本
```sql
-- 任何数据库变更都必须有对应的回滚脚本
-- 示例: 添加字段的回滚
ALTER TABLE users DROP COLUMN new_field;
```

### 必须在测试环境验证
- 执行迁移脚本
- 执行回滚脚本
- 验证数据完整性

### 大表操作注意事项
- 避免锁表时间过长
- 考虑分批执行
- 准备降级方案

---

## ✅ 完成检查清单

- [ ] 变更设计已评审
- [ ] 迁移脚本已编写
- [ ] 回滚脚本已编写
- [ ] 测试环境已验证
- [ ] 执行计划已制定
- [ ] 监控告警已配置

---

**相关模板**: [数据库变更模板](../../templates/extended/database-template.md)

