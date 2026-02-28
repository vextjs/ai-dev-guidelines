# 自动修复能力说明

> 哪些验证问题可以自动修复，哪些需要人工处理

---

## 📋 修复能力分级

### ✅ 自动修复并应用

```yaml
定义: 问题明确且修复方案标准化，直接修复并应用

适用验证项:
  - 边界处理
  - 错误处理
  - 逻辑完整
  - 代码规范
  - 安全检测
  - 依赖声明
  - 日志完整
  - 环境变量
  - 依赖锁定
  - 导入导出

行为:
  1. 检测到问题
  2. 自动生成修复代码
  3. 直接应用修复
  4. 在验证报告中记录

示例输出:
  ✅ 边界处理检查完成（自动修复 2 处）
  ✅ 错误处理检查完成（自动修复 1 处）
```

### ⚠️ 生成修复建议，等待确认

```yaml
定义: 问题明确但修复方案需要判断，生成建议等待用户确认

适用验证项:
  - 性能考量
  - 并发安全
  - 测试覆盖
  - 配置完整
  - 版本一致
  - 类型定义

行为:
  1. 检测到问题
  2. 分析可能的修复方案
  3. 生成修复建议
  4. 在确认点展示
  5. 等待用户选择

示例输出:
  ⚠️ 性能考量检查发现 1 个问题
     问题: N+1 查询风险
     位置: app/service/user.ts:45
     建议修复:
       [A] 使用 aggregate 聚合查询
       [B] 使用 populate 预加载
       [C] 保持现状（添加注释说明原因）
     请选择: [A/B/C]
```

### ❌ 仅报告问题，不提供修复

```yaml
定义: 问题复杂或需要人工判断，仅报告问题详情

适用验证项:
  - 需求覆盖
  - 流程正确
  - 返回值
  - 禁止删除
  - 文档关联
  - 文件完整
  - 回滚方案

行为:
  1. 检测到问题
  2. 报告问题详情
  3. 说明风险等级
  4. 在确认点等待用户决策

示例输出:
  ❌ 需求覆盖检查发现问题
     缺失: 用户认证功能未实现
     影响: 需求 3/4 未覆盖
     风险: P1（影响核心功能）
     
     请决定:
       [A] 补充实现
       [B] 标记为后续任务
       [C] 确认不需要
```

---

## 📊 各验证项修复能力

| # | 验证项 | 自动修复 | 说明 |
|---|-------|---------|------|
| 1 | 需求覆盖 | ❌ | 需要人工判断业务逻辑 |
| 2 | 边界处理 | ✅ | 标准化的边界检查代码 |
| 3 | 错误处理 | ✅ | 标准化的 try-catch |
| 4 | 逻辑完整 | ✅ | 补充 else/default |
| 5 | 流程正确 | ❌ | 需要人工确认业务流程 |
| 6 | 返回值 | ❌ | 需要人工确认返回值设计 |
| 7 | 代码规范 | ✅ | 使用 prettier/eslint 格式化 |
| 8 | 性能考量 | ⚠️ | 生成优化建议 |
| 9 | 安全检测 | ✅ | 自动转义和验证 |
| 10 | 并发安全 | ⚠️ | 生成锁/事务建议 |
| 11 | 依赖声明 | ✅ | 自动添加到 package.json |
| 12 | 测试覆盖 | ⚠️ | 生成测试用例建议 |
| 13 | 日志完整 | ✅ | 自动添加标准日志 |
| 14 | 文件完整 | ❌ | 需要人工创建文件 |
| 15 | 配置完整 | ⚠️ | 生成配置建议 |
| 16 | 禁止删除 | ❌ | 必须人工确认 |
| 17 | 文档关联 | ❌ | 需要人工更新文档 |
| 18 | 环境变量 | ✅ | 自动添加到 .env.example |
| 19 | 版本一致 | ⚠️ | 需确认目标版本 |
| 20 | 依赖锁定 | ✅ | 自动运行 npm install |
| 21 | 类型定义 | ⚠️ | 推断并建议类型 |
| 22 | 导入导出 | ✅ | 修复导入路径 |
| 23 | 回滚方案 | ❌ | 必须人工提供 |

---

## 🔧 自动修复示例

### 边界处理修复

```javascript
// 原代码
function getUser(id) {
  return users[id];
}

// 自动修复后
function getUser(id) {
  if (id == null || id === '') {
    return null;
  }
  return users[id];
}
```

### 错误处理修复

```javascript
// 原代码
async function fetchUser(id) {
  const user = await db.users.findById(id);
  return user;
}

// 自动修复后
async function fetchUser(id) {
  try {
    const user = await db.users.findById(id);
    return user;
  } catch (error) {
    logger.error('fetchUser failed', { id, error: error.message });
    throw error;
  }
}
```

### 日志添加修复

```javascript
// 原代码
async function createOrder(data) {
  const order = await db.orders.create(data);
  return order;
}

// 自动修复后
async function createOrder(data) {
  logger.info('createOrder start', { userId: data.userId });
  try {
    const order = await db.orders.create(data);
    logger.info('createOrder success', { orderId: order._id });
    return order;
  } catch (error) {
    logger.error('createOrder failed', { data, error: error.message });
    throw error;
  }
}
```

### 安全检测修复

```javascript
// 原代码（存在注入风险）
const query = { name: req.query.name };

// 自动修复后
const query = { 
  name: typeof req.query.name === 'string' 
    ? req.query.name.trim() 
    : '' 
};
```

---

## 📋 修复报告格式

### 验证完成后的修复报告

```text
📋 自动修复报告

修复数量: 5 处

详细修复:
1. [边界处理] app/service/user.ts:45
   - 添加 null 检查
   
2. [边界处理] app/service/order.ts:78
   - 添加空数组检查

3. [错误处理] app/controller/auth.ts:23
   - 添加 try-catch 包裹

4. [日志完整] app/service/payment.ts:156
   - 添加入口/出口日志

5. [安全检测] app/controller/search.ts:34
   - 添加输入转义

所有修复已自动应用 ✅
```

---

## ⚠️ 注意事项

### 1. 自动修复可能需要审查

```yaml
建议:
  - 代码审查时检查自动修复的内容
  - 确保修复符合业务逻辑
  - 测试修复后的代码
```

### 2. 某些修复可能影响性能

```yaml
注意:
  - 边界检查会增加少量开销
  - try-catch 在高频调用时有性能影响
  - 日志写入需要考虑 I/O
```

### 3. 禁止自动修复的场景

```yaml
禁止:
  - 涉及业务逻辑的修改
  - 删除现有代码
  - 修改配置值
  - 更改返回值结构
```

---

## 📎 相关文档

- [验证机制概述](./README.md)
- [三轮验证详细清单](./three-round-validation.md)
- [错误处理最佳实践](../error-handling.md)

---

**最后更新**: 2026-02-12

