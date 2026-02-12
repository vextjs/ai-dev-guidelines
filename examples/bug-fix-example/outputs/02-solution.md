# 解决方案: Session 丢失修复

> **Bug ID**: BUG-001  
> **项目**: user-service  
> **日期**: 2026-02-12

---

## 📋 方案概述

### 修复目标
1. 延长 Session 过期时间
2. 实现 Session 自动续期机制
3. 优化用户体验

### 修复方案

| # | 方案 | 优点 | 缺点 | 推荐 |
|---|-----|------|------|------|
| 1 | 延长过期时间 | 简单 | 安全性降低 | ❌ |
| 2 | 实现滑动过期 | 平衡安全和体验 | 需要代码修改 | ✅ |
| 3 | Token 刷新机制 | 最安全 | 改动较大 | ⚠️ 备选 |

**选择方案 2**: 实现滑动过期（Sliding Expiration）

---

## 🔧 技术方案

### 修改清单

| 文件 | 操作 | 说明 |
|-----|------|------|
| `config/session.js` | 修改 | 调整过期时间和配置 |
| `middleware/session-refresh.js` | 新增 | Session 续期中间件 |
| `app.js` | 修改 | 注册中间件 |

### 实现细节

#### 1. 修改 Session 配置

```javascript
// config/session.js
module.exports = {
  secret: process.env.SESSION_SECRET,
  resave: true,                    // 改为 true，允许重新保存
  saveUninitialized: false,
  rolling: true,                   // 🆕 启用滑动过期
  cookie: {
    maxAge: 1000 * 60 * 60 * 2     // 改为 2 小时
  }
};
```

#### 2. 新增 Session 续期中间件

```javascript
// middleware/session-refresh.js
module.exports = function sessionRefresh(req, res, next) {
  // 每次请求时刷新 session 过期时间
  if (req.session && req.session.user) {
    req.session.touch();
  }
  next();
};
```

---

## ⚠️ 风险评估

| 风险 | 等级 | 应对措施 |
|-----|------|---------|
| Session 劫持风险增加 | 中 | 保持 httpOnly 和 secure 配置 |
| Redis 存储压力增加 | 低 | 监控 Redis 内存使用 |

### 回滚方案

```bash
# 如果出现问题，恢复原配置
git checkout HEAD~1 -- config/session.js
git checkout HEAD~1 -- middleware/session-refresh.js
pm2 restart user-service
```

---

## ✅ 验收标准

- [ ] Session 过期时间延长到 2 小时
- [ ] 用户活动时 Session 自动续期
- [ ] 不影响现有功能
- [ ] 通过安全审查

---

## 📎 相关文档

- [01-analysis.md](./01-analysis.md) - 问题分析
- [../../README.md](../../README.md) - 示例说明

