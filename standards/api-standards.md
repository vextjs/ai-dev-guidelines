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

| 错误码 | 说明 | HTTP 状态码 |
|--------|------|------------|
| 0 | 成功 | 200 |
| 40001 | 参数验证失败 | 400 |
| 40101 | 未认证 | 401 |
| 40301 | 无权限 | 403 |
| 40401 | 资源不存在 | 404 |
| 42901 | 请求过于频繁 | 429 |
| 50001 | 服务器内部错误 | 500 |

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

## 📎 相关文档

- [代码规范](./code-standards.md)
- [安全规范](./security-standards.md)

---

**最后更新**: 2026-02-12
