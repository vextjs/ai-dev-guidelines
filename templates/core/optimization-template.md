# 性能优化方案模板

> [一句话描述本次优化的核心目标]

- **项目**: <project-name>
- **类型**: 性能优化
- **优化编号**: <OPT-area-id>
- **创建日期**: YYYY-MM-DD
- **负责人**: [姓名]
- **优先级**: 🔴 P0-紧急 / 🟠 P1-重要 / 🟡 P2-一般
- **状态**: 🔵 待分析 / 🟡 优化中 / 🟢 已完成

---

## 📋 优化概述

### 优化目标
[明确描述本次优化要达成的目标]

示例:
> 优化用户查询接口的响应时间，将 P95 延迟从 800ms 降低到 100ms 以下。

### 业务背景
[描述为什么需要进行优化]

### 优化范围
- **涉及模块**: [列出相关模块]
- **涉及接口**: [列出相关接口]
- **影响范围**: [描述影响范围]

---

## 📊 性能基线

### 当前性能指标

#### 响应时间
| 接口 | P50 | P95 | P99 | 平均值 |
|------|-----|-----|-----|--------|
| GET /api/users | 200ms | 800ms | 1500ms | 350ms |
| GET /api/users/:id | 50ms | 200ms | 500ms | 80ms |

#### 吞吐量
| 接口 | 当前 QPS | 目标 QPS | 瓶颈 |
|------|---------|---------|------|
| GET /api/users | 100 | 500 | 数据库查询 |
| GET /api/users/:id | 200 | 1000 | 无缓存 |

#### 资源消耗
| 资源 | 当前值 | 期望值 | 说明 |
|------|--------|--------|------|
| CPU 使用率 | 60% | < 40% | 高峰期接近瓶颈 |
| 内存使用 | 1.2GB | < 1GB | 内存占用偏高 |
| 数据库连接 | 80 | < 50 | 连接数偏多 |
| 数据库慢查询 | 50个/分钟 | < 5个/分钟 | 存在大量慢查询 |

### 测试环境
```
操作系统: Ubuntu 20.04
Node.js: v18.20.5
数据库: MongoDB 6.0
内存: 8GB
CPU: 4 Core
网络: 1Gbps
```

### 测试方法
```bash
# 压测工具: Apache Bench
ab -n 10000 -c 100 http://localhost:3000/api/users

# 或使用 wrk
wrk -t4 -c100 -d30s http://localhost:3000/api/users
```

---

## 🔍 瓶颈分析

### 性能瓶颈识别

#### 瓶颈1: 数据库慢查询
- **定位方法**: MongoDB Profiler 分析
- **慢查询示例**:
  ```javascript
  // 查询耗时 800ms
  db.users.find({
    status: 'active',
    createdAt: { $gte: ISODate('2026-01-01') }
  }).sort({ createdAt: -1 })
  ```
- **根因**: 
  - 缺少复合索引 (status, createdAt)
  - 查询未覆盖索引
  - 返回数据量过大（未分页）

#### 瓶颈2: 无缓存机制
- **定位方法**: 应用日志分析
- **问题**: 每次请求都查询数据库，即使数据未变化
- **根因**: 
  - 未使用 Redis 缓存
  - 缺少缓存更新机制

#### 瓶颈3: N+1 查询问题
- **定位方法**: 代码审查
- **问题代码**:
  ```javascript
  // 获取所有用户
  const users = await User.find();
  
  // 对每个用户单独查询关联数据（N+1 问题）
  for (let user of users) {
    user.profile = await Profile.findOne({ userId: user._id });
  }
  ```
- **根因**: 未使用 JOIN 或批量查询

### 性能剖析数据

#### CPU Profiling
```
Top 10 热点函数:
1. UserService.findUsers()        - 35%
2. MongoDB.Query.exec()           - 28%
3. JSON.stringify()               - 12%
4. Authentication.verify()        - 10%
5. ...
```

#### 内存剖析
```
内存泄漏点:
1. 未关闭的数据库连接        - 300MB
2. 缓存数据未清理            - 200MB
3. 大对象未及时释放          - 150MB
```

---

## 💡 优化方案

### 优化策略

#### 策略1: 数据库优化（优先级 P0）
- **添加索引**
  ```javascript
  // 创建复合索引
  db.users.createIndex({ status: 1, createdAt: -1 });
  
  // 创建覆盖索引
  db.users.createIndex({ 
    status: 1, 
    createdAt: -1, 
    username: 1, 
    email: 1 
  });
  ```

- **查询优化**
  ```javascript
  // 添加分页
  const users = await User.find({ status: 'active' })
    .sort({ createdAt: -1 })
    .limit(20)
    .skip(page * 20)
    .select('username email createdAt'); // 只返回必要字段
  ```

- **解决 N+1 问题**
  ```javascript
  // 使用 $lookup 进行 JOIN
  const users = await User.aggregate([
    { $match: { status: 'active' } },
    { $lookup: {
      from: 'profiles',
      localField: '_id',
      foreignField: 'userId',
      as: 'profile'
    }}
  ]);
  ```

**预期收益**: P95 延迟降低 60%（800ms → 320ms）

---

#### 策略2: 引入 Redis 缓存（优先级 P0）
- **缓存设计**
  ```javascript
  // 缓存热点数据
  async function getUserList(page) {
    const cacheKey = `users:list:${page}`;
    
    // 1. 先查缓存
    let data = await redis.get(cacheKey);
    if (data) return JSON.parse(data);
    
    // 2. 缓存未命中，查数据库
    data = await User.find()
      .limit(20)
      .skip(page * 20);
    
    // 3. 写入缓存，TTL 5分钟
    await redis.setex(cacheKey, 300, JSON.stringify(data));
    
    return data;
  }
  ```

- **缓存策略**
  - 缓存时间: 5 分钟
  - 缓存更新: 数据变更时主动删除缓存
  - 缓存预热: 启动时加载热点数据

**预期收益**: 缓存命中率 80%，延迟降低 80%（320ms → 64ms）

---

#### 策略3: 连接池优化（优先级 P1）
```javascript
// 优化连接池配置
mongoose.connect(DB_URL, {
  maxPoolSize: 50,        // 从 100 降低到 50
  minPoolSize: 10,        // 保持最少 10 个连接
  maxIdleTimeMS: 30000,   // 30秒空闲超时
  socketTimeoutMS: 45000  // 45秒 socket 超时
});
```

**预期收益**: 数据库连接数减少 40%

---

#### 策略4: 响应数据压缩（优先级 P2）
```javascript
// 启用 gzip 压缩
const compression = require('compression');
app.use(compression({
  level: 6,               // 压缩级别
  threshold: 1024         // 超过 1KB 才压缩
}));
```

**预期收益**: 响应体积减少 70%，传输时间减少 50%

---

### 优化收益预估

| 优化策略 | 延迟改善 | 吞吐量提升 | 资源节省 | 实施难度 |
|---------|---------|-----------|---------|---------|
| 数据库优化 | -60% | +100% | 数据库 CPU -30% | 低 |
| Redis 缓存 | -80% | +400% | 数据库连接 -50% | 中 |
| 连接池优化 | -5% | +10% | 连接数 -40% | 低 |
| 响应压缩 | -20% | +20% | 带宽 -70% | 低 |

---

## 🏗️ 实施计划

### 阶段1: 数据库优化（第1周）
- [ ] 分析慢查询日志
- [ ] 设计索引方案
- [ ] 创建索引（生产环境使用 background 模式）
- [ ] 优化查询语句
- [ ] 压测验证

### 阶段2: 缓存实施（第2周）
- [ ] 设计缓存架构
- [ ] 部署 Redis 集群
- [ ] 实现缓存层
- [ ] 实现缓存更新逻辑
- [ ] 压测验证

### 阶段3: 其他优化（第3周）
- [ ] 优化连接池配置
- [ ] 启用响应压缩
- [ ] 全面回归测试
- [ ] 监控部署

---

## 🧪 测试验证

### 性能测试方案

#### 测试场景1: 单接口压测
```bash
# 压测用户列表接口
wrk -t4 -c100 -d60s http://localhost:3000/api/users
```

#### 测试场景2: 混合压测
```bash
# 70% 读请求 + 30% 写请求
artillery run load-test.yml
```

#### 测试场景3: 长时间稳定性测试
```bash
# 持续 4 小时压测
ab -n 1000000 -c 200 -t 14400 http://localhost:3000/api/users
```

### 验收标准
- [ ] P95 延迟 < 100ms（当前 800ms）
- [ ] QPS ≥ 500（当前 100）
- [ ] CPU 使用率 < 40%（当前 60%）
- [ ] 内存使用 < 1GB（当前 1.2GB）
- [ ] 数据库慢查询 < 5个/分钟（当前 50个/分钟）
- [ ] 缓存命中率 ≥ 80%
- [ ] 无性能回退

---

## 📊 优化效果

### 性能对比

#### 响应时间对比
| 接口 | 优化前 P95 | 优化后 P95 | 提升 |
|------|-----------|-----------|------|
| GET /api/users | 800ms | 80ms | 90% ↓ |
| GET /api/users/:id | 200ms | 20ms | 90% ↓ |

#### 吞吐量对比
| 接口 | 优化前 QPS | 优化后 QPS | 提升 |
|------|-----------|-----------|------|
| GET /api/users | 100 | 600 | 500% ↑ |
| GET /api/users/:id | 200 | 1200 | 500% ↑ |

#### 资源消耗对比
| 资源 | 优化前 | 优化后 | 改善 |
|------|--------|--------|------|
| CPU 使用率 | 60% | 30% | 50% ↓ |
| 内存使用 | 1.2GB | 800MB | 33% ↓ |
| 数据库连接 | 80 | 40 | 50% ↓ |
| 慢查询数 | 50/分钟 | 2/分钟 | 96% ↓ |

### 成本收益
- **服务器成本**: 可减少 40% 的服务器实例
- **数据库成本**: 可降低 1 个规格
- **用户体验**: 页面加载时间减少 80%

---

## ⚠️ 风险与注意事项

### 技术风险
| 风险 | 影响 | 应对措施 |
|------|------|---------|
| 缓存雪崩 | 高 | 设置随机 TTL，缓存预热 |
| 缓存穿透 | 中 | 使用布隆过滤器 |
| 索引锁表 | 高 | 使用 background 创建索引 |
| 内存溢出 | 高 | 限制缓存大小，设置 LRU 策略 |

### 回滚方案
```bash
# 关闭缓存（配置开关）
config.cache.enabled = false

# 删除新创建的索引
db.users.dropIndex('status_1_createdAt_-1')

# 回滚代码
git checkout <previous-tag>
npm run deploy
```

---

## 📚 参考资料

- [MongoDB 索引最佳实践](https://docs.mongodb.com/manual/indexes/)
- [Redis 缓存设计模式](https://redis.io/topics/lru-cache)
- [Node.js 性能优化指南](https://nodejs.org/en/docs/guides/simple-profiling/)

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 变更人 |
|------|------|---------|--------|
| YYYY-MM-DD | v1.0 | 初始版本 | [姓名] |

---

## 💬 经验总结

### 关键经验
1. **索引优化是最直接有效的手段**
2. **缓存能极大降低数据库压力**
3. **必须在生产环境验证性能改善**

### 后续优化方向
- [ ] 考虑引入 CDN 加速静态资源
- [ ] 评估数据库分片方案
- [ ] 考虑异步任务队列优化
