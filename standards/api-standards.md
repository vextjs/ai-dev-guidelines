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

## 📎 相关文档

- [代码规范](./code-standards.md)
- [安全规范](./security-standards.md)

---

**最后更新**: 2026-02-12

