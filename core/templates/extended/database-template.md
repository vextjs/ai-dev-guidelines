# 数据库变更模板

> **变更ID**: [DB-XXX]  
> **变更类型**: Schema变更 / 数据迁移 / 索引优化  
> **影响表**: [表名]  
> **执行日期**: [YYYY-MM-DD]  

---

## 1. 变更概述

### 1.1 变更目的
[说明为什么要做这个变更]

### 1.2 影响范围
- 影响表: [表名列表]
- 影响行数: [预估]
- 影响服务: [服务列表]

### 1.3 预计停机时间
- 预计时长: [X分钟]
- 是否需要停机: 是/否

---

## 2. 变更设计

### 2.1 Schema 变更 (如适用)

#### 变更前
```sql
-- 当前表结构
CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50)
);
```

#### 变更后
```sql
-- 目标表结构
CREATE TABLE users (
  id INT PRIMARY KEY,
  username VARCHAR(50),
  email VARCHAR(100) -- 新增字段
);
```

### 2.2 数据迁移计划 (如适用)
[描述如何迁移数据]

---

## 3. SQL 脚本

### 3.1 迁移脚本
```sql
-- migration.sql

-- Step 1: 添加新字段
ALTER TABLE users ADD COLUMN email VARCHAR(100);

-- Step 2: 迁移数据 (如需要)
UPDATE users SET email = CONCAT(username, '@example.com');

-- Step 3: 添加索引 (如需要)
CREATE INDEX idx_email ON users(email);
```

### 3.2 回滚脚本
```sql
-- rollback.sql

-- 删除索引
DROP INDEX idx_email ON users;

-- 删除字段
ALTER TABLE users DROP COLUMN email;
```

### 3.3 验证脚本
```sql
-- verify.sql

-- 检查字段是否存在
SELECT COUNT(*) FROM information_schema.COLUMNS 
WHERE TABLE_NAME = 'users' AND COLUMN_NAME = 'email';

-- 检查数据完整性
SELECT COUNT(*) FROM users WHERE email IS NULL;

-- 检查索引是否存在
SHOW INDEX FROM users WHERE Key_name = 'idx_email';
```

---

## 4. 执行计划

### 4.1 执行步骤
1. 备份数据库
2. 在测试环境执行
3. 验证测试环境
4. 在生产环境执行
5. 验证生产环境
6. 监控应用运行

### 4.2 执行时间
- 推荐时间: [业务低峰期]
- 预计时长: [X分钟]

### 4.3 执行人员
- 主执行人: [姓名]
- 监控人: [姓名]
- 应急联系人: [姓名]

---

## 5. 风险评估

| 风险项 | 影响程度 | 缓解措施 |
|-------|---------|---------|
| 执行时间过长 | 高 | 分批执行 |
| 数据不一致 | 高 | 充分测试 |
| 应用报错 | 中 | 准备回滚脚本 |

---

## 6. 回滚方案

### 6.1 回滚条件
- 执行超时 (> X分钟)
- 数据验证失败
- 应用大量报错

### 6.2 回滚步骤
1. 停止应用访问
2. 执行回滚脚本
3. 验证回滚结果
4. 恢复应用访问

### 6.3 回滚时长
预计: [X分钟]

---

## 7. 验证清单

### 执行前验证
- [ ] 备份已完成
- [ ] 测试环境已验证
- [ ] 回滚脚本已准备
- [ ] 监控告警已配置

### 执行后验证
- [ ] SQL 执行成功
- [ ] 数据完整性检查通过
- [ ] 应用功能正常
- [ ] 性能指标正常

---

## 8. 执行记录

### 8.1 测试环境
- 执行时间: [YYYY-MM-DD HH:mm]
- 执行结果: 成功/失败
- 遇到的问题: [描述]
- 解决方案: [描述]

### 8.2 生产环境
- 执行时间: [YYYY-MM-DD HH:mm]
- 执行结果: 成功/失败
- 实际耗时: [X分钟]
- 备注: [说明]

