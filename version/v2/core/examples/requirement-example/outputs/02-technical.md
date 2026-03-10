# 技术方案: 集成限流功能

> **任务ID**: REQ-user-20260212-rate-limit  
> **项目**: user-service  
> **创建日期**: 2026-02-12
>
> **关联文档**:
> - 需求文档: [01-requirement.md](./01-requirement.md)
> - 实施方案: [03-implementation/](./03-implementation/README.md)

---

## 📋 方案概述

### 技术选型

| 选项 | 方案 | 优点 | 缺点 | 选择 |
|------|------|------|------|------|
| A | express-rate-limit | 简单易用 | 不支持分布式 | ❌ |
| B | flex-rate-limit | 支持 MongoDB | 需要配置 | ✅ |
| C | 自研限流 | 完全可控 | 开发成本高 | ❌ |

**选择方案 B**: flex-rate-limit，因为项目已有 MongoDB，可复用现有连接。

---

## 🔧 实现方案

### 架构设计

```
请求流程:
  
  Request → Rate Limit Middleware → Route Handler → Response
                    ↓
              MongoDB (限流计数)
                    ↓
            429 if exceeded
```

### 配置设计

```typescript
// config/rate-limit.ts
export const rateLimitConfig = {
  windowMs: 60 * 1000,        // 1 分钟窗口
  maxRequests: 100,           // 最大请求数
  keyGenerator: (req) => {    // 限流键
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {    // 超限处理
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests',
        retryAfter: 60
      }
    });
  }
};
```

### 中间件设计

```typescript
// src/middleware/rate-limiter.ts
import { createRateLimiter } from 'flex-rate-limit';
import { rateLimitConfig } from '../../config/rate-limit';

export const rateLimiter = createRateLimiter({
  store: 'mongodb',
  ...rateLimitConfig
});
```

---

## 📊 影响分析

### 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| package.json | 修改 | 添加依赖 |
| config/rate-limit.ts | 新增 | 配置文件 |
| src/middleware/rate-limiter.ts | 新增 | 中间件 |
| src/app.ts | 修改 | 注册中间件 |
| types/rate-limit.d.ts | 新增 | 类型定义 |
| test/middleware/rate-limiter.test.ts | 新增 | 测试用例 |

### 依赖变更

```diff
+ "flex-rate-limit": "^1.0.0"
```

---

## ✅ 测试计划

| 测试项 | 类型 | 预期结果 |
|--------|------|---------|
| 正常请求 | 单元测试 | 放行 |
| 超限请求 | 单元测试 | 返回 429 |
| 不同用户 | 单元测试 | 独立计数 |

---

**文档版本**: 1.0

