# API 接口文档模板

> [功能模块] API 接口文档

- **项目**: <project-name>
- **版本**: v1.0.0
- **基础路径**: `/api/v1`
- **创建日期**: YYYY-MM-DD
- **负责人**: [姓名]

---

## 📋 接口列表

| # | 接口 | 方法 | 说明 | 鉴权 |
|---|------|------|------|------|
| 1 | `/xxx` | POST | 创建 xxx | ✅ |
| 2 | `/xxx` | GET | 获取 xxx 列表 | ✅ |
| 3 | `/xxx/:id` | GET | 获取 xxx 详情 | ✅ |
| 4 | `/xxx/:id` | PUT | 更新 xxx | ✅ |
| 5 | `/xxx/:id` | DELETE | 删除 xxx | ✅ |

---

## 🔐 鉴权说明

### 认证方式
- **类型**: Bearer Token
- **Header**: `Authorization: Bearer <token>`

### 权限要求
| 接口 | 权限 | 说明 |
|------|------|------|
| POST /xxx | `xxx:create` | 创建权限 |
| GET /xxx | `xxx:read` | 读取权限 |
| PUT /xxx/:id | `xxx:update` | 更新权限 |
| DELETE /xxx/:id | `xxx:delete` | 删除权限 |

---

## 📝 接口详情

### 1. 创建 xxx

#### 基本信息
- **URL**: `POST /api/v1/xxx`
- **鉴权**: 需要
- **Content-Type**: `application/json`

#### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|------|
| field1 | body | string | ✅ | 字段1说明 | "value1" |
| field2 | body | number | ❌ | 字段2说明 | 100 |
| field3 | body | string[] | ❌ | 字段3说明 | ["a", "b"] |

#### 请求示例
```http
POST /api/v1/xxx HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "field1": "value1",
  "field2": 100,
  "field3": ["a", "b"]
}
```

#### 成功响应
```json
{
  "code": 0,
  "message": "创建成功",
  "data": {
    "id": "abc123",
    "field1": "value1",
    "field2": 100,
    "field3": ["a", "b"],
    "createdAt": "2026-02-12T10:00:00Z",
    "updatedAt": "2026-02-12T10:00:00Z"
  }
}
```

#### 错误响应
| 状态码 | code | 说明 |
|--------|------|------|
| 400 | 40001 | 参数错误 |
| 401 | 40101 | 未授权 |
| 403 | 40301 | 无权限 |
| 500 | 50001 | 服务器错误 |

```json
{
  "code": 40001,
  "message": "参数错误: field1 不能为空",
  "data": null
}
```

---

### 2. 获取 xxx 列表

#### 基本信息
- **URL**: `GET /api/v1/xxx`
- **鉴权**: 需要
- **Content-Type**: `application/json`

#### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|------|
| page | query | number | ❌ | 页码，默认 1 | 1 |
| pageSize | query | number | ❌ | 每页数量，默认 20 | 20 |
| keyword | query | string | ❌ | 搜索关键词 | "test" |
| sortBy | query | string | ❌ | 排序字段 | "createdAt" |
| sortOrder | query | string | ❌ | 排序方向 | "desc" |

#### 请求示例
```http
GET /api/v1/xxx?page=1&pageSize=20&keyword=test HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "list": [
      {
        "id": "abc123",
        "field1": "value1",
        "createdAt": "2026-02-12T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

---

### 3. 获取 xxx 详情

#### 基本信息
- **URL**: `GET /api/v1/xxx/:id`
- **鉴权**: 需要

#### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|------|
| id | path | string | ✅ | 资源 ID | "abc123" |

#### 请求示例
```http
GET /api/v1/xxx/abc123 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "abc123",
    "field1": "value1",
    "field2": 100,
    "field3": ["a", "b"],
    "createdAt": "2026-02-12T10:00:00Z",
    "updatedAt": "2026-02-12T10:00:00Z"
  }
}
```

#### 错误响应
| 状态码 | code | 说明 |
|--------|------|------|
| 404 | 40401 | 资源不存在 |

---

### 4. 更新 xxx

#### 基本信息
- **URL**: `PUT /api/v1/xxx/:id`
- **鉴权**: 需要
- **Content-Type**: `application/json`

#### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|------|
| id | path | string | ✅ | 资源 ID | "abc123" |
| field1 | body | string | ❌ | 字段1 | "new value" |
| field2 | body | number | ❌ | 字段2 | 200 |

#### 请求示例
```http
PUT /api/v1/xxx/abc123 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "field1": "new value",
  "field2": 200
}
```

---

### 5. 删除 xxx

#### 基本信息
- **URL**: `DELETE /api/v1/xxx/:id`
- **鉴权**: 需要

#### 请求参数

| 参数 | 位置 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|------|
| id | path | string | ✅ | 资源 ID | "abc123" |

#### 请求示例
```http
DELETE /api/v1/xxx/abc123 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

#### 成功响应
```json
{
  "code": 0,
  "message": "删除成功",
  "data": null
}
```

---

## 📊 错误码说明

### 通用错误码

| 错误码 | HTTP 状态码 | 说明 | 处理建议 |
|--------|------------|------|---------|
| 0 | 200 | 成功 | 正常处理 |
| 40001 | 400 | 参数错误 | 检查请求参数 |
| 40101 | 401 | 未授权 | 重新登录 |
| 40301 | 403 | 无权限 | 联系管理员 |
| 40401 | 404 | 资源不存在 | 检查资源 ID |
| 40901 | 409 | 资源冲突 | 检查重复数据 |
| 42901 | 429 | 请求过于频繁 | 稍后重试 |
| 50001 | 500 | 服务器错误 | 联系开发人员 |

### 业务错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|---------|
| 10001 | [业务错误1] | [处理建议] |
| 10002 | [业务错误2] | [处理建议] |

---

## 📝 更新记录

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0.0 | YYYY-MM-DD | 初始版本 | [姓名] |

---

**文档版本**: 1.0  
**模板来源**: ai-dev-guidelines/core/templates/core/api-doc-template.md

