# API 规范

> RESTful API 设计规范

---

## 📋 URL 设计

### 资源命名

```yaml
规则:
  - 使用名词，不使用动词
  - 使用复数形式
  - 使用 kebab-case

示例:
  ✅ /users
  ✅ /order-items
  ❌ /getUser
  ❌ /user_list
```

### 层级关系

```yaml
格式: /{resource}/{id}/{sub-resource}

示例:
  GET /users/123/orders
  GET /orders/456/items
```

---

## 🔧 HTTP 方法

| 方法 | 用途 | 幂等性 |
|-----|------|-------|
| GET | 获取资源 | ✅ |
| POST | 创建资源 | ❌ |
| PUT | 全量更新 | ✅ |
| PATCH | 部分更新 | ❌ |
| DELETE | 删除资源 | ✅ |

---

## 📊 状态码

| 状态码 | 含义 | 使用场景 |
|-------|------|---------|
| 200 | 成功 | GET、PUT、PATCH |
| 201 | 已创建 | POST |
| 204 | 无内容 | DELETE |
| 400 | 请求错误 | 参数验证失败 |
| 401 | 未认证 | 未登录 |
| 403 | 无权限 | 权限不足 |
| 404 | 未找到 | 资源不存在 |
| 500 | 服务器错误 | 内部错误 |

---

## 📝 响应格式

### 成功响应

```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "example"
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Email is required",
    "details": [
      { "field": "email", "message": "Required" }
    ]
  }
}
```

### 分页响应

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

---

## 🔢 错误码规范

### 错误码格式

```yaml
格式: <模块代码><错误类型><序号>

模块代码:
  10: 用户模块
  20: 订单模块
  30: 支付模块
  40: 通用模块

错误类型:
  0: 参数错误
  1: 业务错误
  2: 权限错误
  3: 系统错误

示例:
  10001: 用户参数错误（如邮箱格式）
  10101: 用户业务错误（如用户不存在）
  40301: 通用系统错误
```

### 常用错误码表

| 错误码 | 说明 | HTTP 状态码 | 分类 |
|--------|------|------------|------|
| 0 | 成功 | 200 | 成功 |
| 40001 | 参数验证失败 | 400 | 参数错误 |
| 40002 | 参数格式错误 | 400 | 参数错误 |
| 40003 | 参数缺失 | 400 | 参数错误 |
| 40101 | 未认证 | 401 | 认证错误 |
| 40102 | Token 过期 | 401 | 认证错误 |
| 40103 | Token 无效 | 401 | 认证错误 |
| 40301 | 无权限 | 403 | 权限错误 |
| 40302 | 账户被禁用 | 403 | 权限错误 |
| 40401 | 资源不存在 | 404 | 业务错误 |
| 40901 | 资源冲突 | 409 | 业务错误 |
| 42201 | 资源锁定 | 422 | 业务错误 |
| 42901 | 请求过于频繁 | 429 | 系统错误 |
| 50001 | 服务器内部错误 | 500 | 系统错误 |
| 50301 | 服务暂时不可用 | 503 | 系统错误 |

---

## 🔄 版本策略

### URL 版本化

```yaml
推荐方式: URL 路径版本化

格式: /api/v{major}/<resource>

示例:
  /api/v1/users
  /api/v2/users

版本升级时机:
  - 破坏性变更（字段删除、类型变更）
  - 行为变更（返回结构变更）
  - 废弃旧功能
```

### 版本兼容期

```yaml
规则:
  - 新版本发布后，旧版本至少维护 6 个月
  - 提前 3 个月通知废弃计划
  - 在响应头中添加废弃警告

响应头示例:
  Deprecation: true
  Sunset: 2026-12-31
  Link: </api/v2/users>; rel="successor-version"
```

---

## 🔐 认证方式

### Bearer Token

```yaml
推荐方式: JWT Bearer Token

请求头:
  Authorization: Bearer <token>

Token 结构:
  Header: {"alg": "HS256", "typ": "JWT"}
  Payload: {"userId": "123", "exp": 1735689600}
  Signature: HMACSHA256(...)
```

### Token 刷新

```yaml
流程:
  1. Access Token 有效期: 15 分钟
  2. Refresh Token 有效期: 7 天
  3. Access Token 过期后使用 Refresh Token 获取新的
  4. Refresh Token 过期后需重新登录

刷新接口:
  POST /api/v1/auth/refresh
  Body: { "refreshToken": "xxx" }
```

---

## 🔄 请求频率限制 (Rate Limiting)

### 基础配置

```yaml
全局限制:
  - 单 IP: 1000 请求/小时
  - 单用户: 5000 请求/小时
  
端点级别:
  - 登录: 5 次/分钟
  - 注册: 3 次/小时
  - 发送验证码: 10 次/小时
  - 敏感操作: 10 次/分钟
```

### 响应头

```yaml
标准响应头:
  X-RateLimit-Limit: 1000      # 时间窗口内的请求上限
  X-RateLimit-Remaining: 950   # 剩余请求次数
  X-RateLimit-Reset: 1735689600 # 重置时间（Unix timestamp）

超限响应:
  HTTP/1.1 429 Too Many Requests
  Retry-After: 3600             # 重试等待时间（秒）
```

### 实现示例

```typescript
// Express 中间件示例
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 小时
  max: 1000,
  message: {
    success: false,
    error: {
      code: '42901',
      message: 'Too many requests, please try again later.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', apiLimiter);
```

---

## 🌐 CORS 配置规范

### 基础配置

```yaml
允许的源:
  开发环境: http://localhost:3000
  测试环境: https://test.example.com
  生产环境: https://example.com

允许的方法:
  - GET
  - POST
  - PUT
  - PATCH
  - DELETE
  - OPTIONS

允许的请求头:
  - Content-Type
  - Authorization
  - X-Requested-With

暴露的响应头:
  - X-RateLimit-Limit
  - X-RateLimit-Remaining
  - X-RateLimit-Reset

凭证支持:
  credentials: true  # 允许携带 Cookie
```

### 实现示例

```typescript
// Express CORS 配置
import cors from 'cors';

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://test.example.com',
      'https://example.com',
    ];
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  credentials: true,
  maxAge: 86400, // 预检请求缓存时间（秒）
};

app.use(cors(corsOptions));
```

---

## 📝 请求/响应日志规范

### 日志级别

```yaml
记录级别:
  - info: 正常请求（默认）
  - warn: 慢请求（>3秒）、客户端错误（4xx）
  - error: 服务器错误（5xx）
```

### 必须记录的字段

```yaml
请求日志:
  - requestId: 唯一请求标识
  - method: HTTP 方法
  - url: 请求路径（不含查询参数敏感信息）
  - ip: 客户端 IP
  - userAgent: 用户代理
  - userId: 用户 ID（已登录时）
  - timestamp: 请求时间

响应日志:
  - requestId: 关联请求 ID
  - statusCode: HTTP 状态码
  - duration: 响应时间（毫秒）
  - responseSize: 响应大小（字节）
  - timestamp: 响应时间
```

### 实现示例

```typescript
// Express 日志中间件
import { v4 as uuidv4 } from 'uuid';
import logger from './logger';

app.use((req, res, next) => {
  const requestId = uuidv4();
  const startTime = Date.now();
  
  req.requestId = requestId;
  
  // 请求日志
  logger.info('HTTP Request', {
    requestId,
    method: req.method,
    url: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });
  
  // 响应日志
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 500 ? 'error' 
                    : res.statusCode >= 400 ? 'warn'
                    : duration > 3000 ? 'warn'
                    : 'info';
    
    logger[logLevel]('HTTP Response', {
      requestId,
      statusCode: res.statusCode,
      duration,
      responseSize: res.get('Content-Length'),
    });
  });
  
  next();
});
```

### 敏感信息处理

```yaml
禁止记录:
  - 密码字段
  - Token 完整内容（可记录前6位）
  - 信用卡号
  - 身份证号

处理方式:
  - 使用白名单过滤查询参数
  - 对敏感字段进行脱敏（如：token: "sk-abc...xyz"）
  - 在日志工具中配置字段黑名单
```

---

## 📎 相关文档

- [代码规范](./code-standards.md)
- [安全规范](./security-standards.md)

---

**最后更新**: 2026-02-12
