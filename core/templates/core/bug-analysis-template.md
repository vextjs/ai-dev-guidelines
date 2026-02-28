# Bug 分析文档模板

> [一句话描述该 Bug 的核心问题]

- **项目**: <project-name>
- **类型**: Bug 修复
- **Bug 编号**: <BUG-project-id-description>
- **创建日期**: YYYY-MM-DD
- **发现人**: [姓名]
- **严重程度**: 🔴 P0-致命 / 🟠 P1-严重 / 🟡 P2-一般 / 🟢 P3-轻微
- **状态**: 🔵 待分析 / 🟡 分析中 / 🟢 已修复 / 🔴 无法修复

---

## 📋 问题概述

### 问题描述
[清晰、简洁地描述问题现象]

示例:
> 用户登录接口在高并发情况下出现超时，导致用户无法正常登录系统。

### 影响范围
- **影响模块**: [列出受影响的模块]
- **影响用户**: [估算受影响的用户数量或比例]
- **影响功能**: [列出受影响的功能]
- **业务影响**: [描述对业务的实际影响]

### 发现时间
- **首次发现**: YYYY-MM-DD HH:MM
- **发现环境**: 生产环境 / 测试环境 / 开发环境
- **发现方式**: 用户反馈 / 监控告警 / 测试发现

---

## 🔍 问题复现

### 复现环境
```
操作系统: [如: Ubuntu 20.04]
Node.js 版本: [如: v18.20.5]
数据库版本: [如: MongoDB 6.0]
相关依赖: [如: Redis 7.0]
```

### 复现步骤
1. **步骤1**: [详细描述第一步操作]
2. **步骤2**: [详细描述第二步操作]
3. **步骤3**: [详细描述第三步操作]
4. **结果**: [描述实际看到的错误现象]

### 复现条件
- **必要条件**:
  - [ ] 条件1: [如: 并发请求数 > 100]
  - [ ] 条件2: [如: 数据库连接数不足]
  
- **触发频率**: 
  - 稳定复现 / 偶尔出现 / 难以复现
  - 复现概率: [如: 80%]

### 复现脚本
```bash
# 复现测试脚本
# 使用 Apache Bench 模拟高并发
ab -n 1000 -c 100 http://localhost:3000/api/login \
   -p login-data.json \
   -T application/json
```

---

## 📊 问题数据

### 错误日志
```
[2026-02-11 12:00:00] ERROR: Database connection timeout
  at MongoDB.connect (node_modules/mongodb/lib/connection.js:123)
  at UserService.login (src/services/user.service.js:45)
  at LoginController.handleLogin (src/controllers/login.controller.js:20)
  
Error: Connection timeout after 5000ms
```

### 监控数据
| 指标 | 正常值 | 异常时的值 | 说明 |
|------|--------|-----------|------|
| 请求响应时间 | ~50ms | ~5000ms | 超时 |
| 数据库连接数 | 20 | 100 | 连接池耗尽 |
| CPU 使用率 | 30% | 85% | CPU 飙高 |
| 内存使用 | 500MB | 1.5GB | 内存泄漏 |

### 用户反馈
```
用户反馈内容:
- "点击登录按钮后一直转圈，超过 10 秒才提示超时"
- "早上 10 点左右经常登录失败"
- "有时能登录，有时不能登录"
```

---

## 🔬 原因分析

### 问题定位

#### 定位过程
1. **初步怀疑**: [描述最初的判断]
   - 分析依据: [说明]
   - 排查方法: [说明]
   - 结论: [是否是根因]

2. **深入排查**: [描述进一步的排查]
   - 分析工具: [使用的工具]
   - 关键发现: [发现的关键信息]
   - 结论: [是否是根因]

3. **根因确认**: [确认最终根因]
   - 证据: [支持结论的证据]
   - 验证: [如何验证]

#### 代码定位
```javascript
// 问题代码位置: src/services/user.service.js:45-60

async login(username, password) {
  // ❌ 问题: 没有复用数据库连接，每次都创建新连接
  const db = await MongoClient.connect(DB_URL);  // 问题行
  const user = await db.collection('users')
    .findOne({ username, password });
  
  if (user) {
    return { success: true, token: generateToken(user) };
  }
  return { success: false, message: 'Invalid credentials' };
  // ❌ 问题: 没有关闭数据库连接
}
```

### 根本原因
[详细描述问题的根本原因]

示例:
> **根因**: 登录服务每次请求都创建新的数据库连接，高并发时快速耗尽连接池，导致新请求等待连接超时。
> 
> **原理**: MongoDB 连接池默认最大 100 个连接，每个连接创建耗时约 50ms，释放耗时约 100ms。当并发超过 100 时，新请求必须等待旧连接释放，导致雪崩效应。

### 触发条件
- **条件1**: 并发请求数超过 100
- **条件2**: 每个请求都创建新的数据库连接
- **条件3**: 连接没有正确关闭和复用

### 影响链路
```
用户请求 → 登录接口 → UserService.login()
                          ↓
                    创建新 DB 连接（50ms）
                          ↓
                    查询用户数据（10ms）
                          ↓
                    ❌ 未关闭连接
                          ↓
                    连接池耗尽 → 后续请求超时
```

---

## 🔧 解决方案

### 方案对比

#### 方案1: 使用连接池（推荐）
- **描述**: 使用 MongoDB 连接池，复用数据库连接
- **优点**: 
  - ✅ 高性能，避免频繁创建连接
  - ✅ 代码改动小
  - ✅ 符合最佳实践
- **缺点**: 
  - ⚠️ 需要配置连接池参数
- **成本**: 低
- **风险**: 低

#### 方案2: 限流保护
- **描述**: 在接口层添加限流，控制并发数
- **优点**: 
  - ✅ 保护后端服务
  - ✅ 快速实施
- **缺点**: 
  - ❌ 治标不治本
  - ❌ 影响用户体验
- **成本**: 低
- **风险**: 中

#### 方案3: 异步队列
- **描述**: 将登录请求放入队列，异步处理
- **优点**: 
  - ✅ 彻底解决并发问题
- **缺点**: 
  - ❌ 架构复杂度高
  - ❌ 实施周期长
- **成本**: 高
- **风险**: 中

### 最终方案
**选择方案1**，原因:
- 根本解决问题
- 实施简单快速
- 风险可控

---

## 💡 修复方案

### 技术实现

#### 修改点1: 初始化连接池
```javascript
// 文件: src/config/database.js
const { MongoClient } = require('mongodb');

let dbClient = null;

async function connectDB() {
  if (dbClient) return dbClient;
  
  dbClient = await MongoClient.connect(DB_URL, {
    maxPoolSize: 100,        // 最大连接数
    minPoolSize: 10,         // 最小连接数
    maxIdleTimeMS: 30000,    // 空闲连接超时
  });
  
  return dbClient;
}

module.exports = { connectDB };
```

#### 修改点2: 使用连接池
```javascript
// 文件: src/services/user.service.js
const { connectDB } = require('../config/database');

async login(username, password) {
  // ✅ 修复: 复用连接池中的连接
  const client = await connectDB();
  const db = client.db('myapp');
  
  const user = await db.collection('users')
    .findOne({ username, password });
  
  // ✅ 连接会自动归还到连接池
  
  if (user) {
    return { success: true, token: generateToken(user) };
  }
  return { success: false, message: 'Invalid credentials' };
}
```

### 配置调整
```javascript
// config/default.json
{
  "database": {
    "url": "mongodb://localhost:27017",
    "poolSize": {
      "min": 10,
      "max": 100
    },
    "timeout": {
      "connect": 5000,
      "operation": 3000
    }
  }
}
```

---

## ⚠️ 风险评估

### 修复风险
| 风险项 | 影响程度 | 可能性 | 应对措施 |
|-------|---------|--------|---------|
| 连接池配置不当 | 中 | 低 | 参考官方文档，在测试环境充分测试 |
| 连接泄漏 | 高 | 低 | 代码 review，添加监控 |
| 性能回退 | 低 | 低 | 性能测试对比 |

### 回滚方案
```bash
# 如果出现问题，立即回滚到上一个版本
git checkout <previous-tag>
npm run deploy

# 或者通过配置开关关闭新逻辑
# config: database.useConnectionPool = false
```

---

## 🧪 测试计划

### 单元测试
```javascript
describe('UserService.login with connection pool', () => {
  it('should reuse database connections', async () => {
    // 测试连接复用
  });
  
  it('should handle connection pool exhaustion', async () => {
    // 测试连接池耗尽场景
  });
});
```

### 压力测试
```bash
# 测试并发 500，持续 60 秒
ab -n 30000 -c 500 -t 60 http://localhost:3000/api/login \
   -p login-data.json \
   -T application/json
```

**预期结果**:
- ✅ 无超时错误
- ✅ P95 响应时间 < 100ms
- ✅ 数据库连接数稳定在 50 以内

---

## 📝 实施方案

### 修复时间线
| 时间 | 事件 | 负责人 |
|------|------|--------|
| YYYY-MM-DD 10:00 | 开始分析 | [姓名] |
| YYYY-MM-DD 12:00 | 定位根因 | [姓名] |
| YYYY-MM-DD 14:00 | 完成修复 | [姓名] |
| YYYY-MM-DD 16:00 | 测试完成 | [姓名] |
| YYYY-MM-DD 18:00 | 部署上线 | [姓名] |

### 验证结果
- [x] 问题不再复现
- [x] 性能指标恢复正常
- [x] 监控无异常告警
- [x] 用户反馈正常

---

## 📚 参考资料

- [MongoDB 连接池最佳实践](https://docs.mongodb.com/manual/administration/connection-pool-overview/)
- [Node.js MongoDB Driver 文档](https://mongodb.github.io/node-mongodb-native/)

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|---------|--------|
| YYYY-MM-DD | v1.0 | 初始版本 | [姓名] |

---

## 💬 经验总结

### 问题原因
[总结问题产生的深层次原因]

### 预防措施
- [ ] 措施1: 代码 review 检查数据库连接使用
- [ ] 措施2: 添加连接池监控
- [ ] 措施3: 压测覆盖高并发场景

### 知识沉淀
[记录本次问题的关键知识点，供团队学习]
