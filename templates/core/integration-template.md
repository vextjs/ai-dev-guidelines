# 系统对接文档模板

> [一句话描述本次对接的核心内容]

- **项目**: <project-name>
- **类型**: 系统对接
- **对接系统**: <target-system-name>
- **创建日期**: YYYY-MM-DD
- **负责人**: [姓名]
- **版本**: v1.0
- **状态**: 🔵 设计中 / 🟡 联调中 / 🟢 已上线

---

## 📋 对接概述

### 对接目标
[描述本次对接要实现的目标]

### 业务场景
[描述对接的业务场景和价值]

### 对接方式
- **通信协议**: HTTP / WebSocket / gRPC / MQ
- **数据格式**: JSON / XML / Protobuf
- **认证方式**: API Key / JWT / OAuth2.0
- **调用方向**: 单向 / 双向

---

## 🔗 系统架构

### 系统拓扑图
```
┌─────────────┐         ┌─────────────┐
│  本系统      │ ───────>│  目标系统    │
│  (Client)   │ <───────│  (Server)   │
└─────────────┘         └─────────────┘
      │                        │
      │                        │
      ↓                        ↓
┌─────────────┐         ┌─────────────┐
│  数据库      │         │  数据库      │
└─────────────┘         └─────────────┘
```

### 调用流程
```
1. 本系统 → 目标系统: 发起请求
2. 目标系统: 验证请求
3. 目标系统: 处理业务
4. 目标系统 → 本系统: 返回响应
5. 本系统: 处理响应
```

---

## 🔌 API 接口文档

### 1. 用户查询接口

#### 基本信息
- **接口名称**: 查询用户信息
- **接口路径**: `/api/v1/users/:userId`
- **请求方法**: GET
- **请求频率**: 100次/分钟
- **超时时间**: 5秒

#### 请求参数

**路径参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|-------|------|------|------|------|
| userId | String | ✅ | 用户ID | "123456" |

**Query 参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|-------|------|------|------|------|
| fields | String | ❌ | 返回字段（逗号分隔） | "name,email" |
| lang | String | ❌ | 语言 | "zh-CN" |

**Header 参数**:
| 参数名 | 类型 | 必填 | 说明 | 示例 |
|-------|------|------|------|------|
| Authorization | String | ✅ | 认证令牌 | "Bearer xxx" |
| X-Request-Id | String | ✅ | 请求ID | "uuid" |

#### 请求示例
```http
GET /api/v1/users/123456?fields=name,email HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

#### 响应格式

**成功响应**:
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "userId": "123456",
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "status": "active",
    "createdAt": "2026-01-01T00:00:00Z",
    "updatedAt": "2026-02-11T00:00:00Z"
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1739260800000
}
```

**错误响应**:
```json
{
  "code": 404,
  "message": "用户不存在",
  "data": null,
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1739260800000
}
```

#### 响应字段说明
| 字段名 | 类型 | 说明 |
|-------|------|------|
| code | Number | 状态码（0表示成功） |
| message | String | 响应消息 |
| data | Object | 业务数据 |
| data.userId | String | 用户ID |
| data.name | String | 用户姓名 |
| data.email | String | 邮箱地址 |
| data.phone | String | 手机号码 |
| data.status | String | 用户状态: active, inactive, banned |
| data.createdAt | String | 创建时间（ISO 8601格式） |
| data.updatedAt | String | 更新时间（ISO 8601格式） |
| requestId | String | 请求ID（用于追踪） |
| timestamp | Number | 服务器时间戳 |

#### 错误码说明
| 错误码 | 说明 | 处理方式 |
|-------|------|---------|
| 0 | 成功 | - |
| 400 | 请求参数错误 | 检查参数格式 |
| 401 | 未授权 | 检查 Token |
| 403 | 无权限 | 联系管理员 |
| 404 | 资源不存在 | 检查 userId |
| 429 | 请求过于频繁 | 降低请求频率 |
| 500 | 服务器错误 | 联系技术支持 |
| 503 | 服务不可用 | 稍后重试 |

---

### 2. 用户创建接口

#### 基本信息
- **接口名称**: 创建用户
- **接口路径**: `/api/v1/users`
- **请求方法**: POST
- **请求频率**: 10次/分钟
- **超时时间**: 10秒

#### 请求参数

**Body 参数** (JSON):
```typescript
interface CreateUserRequest {
  name: string;           // 必填，用户姓名，2-50字符
  email: string;          // 必填，邮箱地址
  phone: string;          // 必填，手机号码
  password: string;       // 必填，密码，8-20字符
  avatar?: string;        // 可选，头像URL
  metadata?: object;      // 可选，扩展数据
}
```

#### 请求示例
```http
POST /api/v1/users HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "phone": "13800138000",
  "password": "Password123!",
  "avatar": "https://example.com/avatar.jpg",
  "metadata": {
    "source": "web",
    "referrer": "google"
  }
}
```

#### 响应格式
```json
{
  "code": 0,
  "message": "用户创建成功",
  "data": {
    "userId": "789012",
    "name": "张三",
    "email": "zhangsan@example.com",
    "phone": "13800138000",
    "avatar": "https://example.com/avatar.jpg",
    "status": "active",
    "createdAt": "2026-02-11T12:00:00Z"
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": 1739260800000
}
```

---

## 📤 数据格式规范

### 通用数据格式

#### 日期时间
- **格式**: ISO 8601
- **示例**: `"2026-02-11T12:00:00Z"`
- **时区**: UTC

#### 货币金额
- **类型**: Number
- **单位**: 分（最小货币单位）
- **示例**: `10000` 表示 100.00 元

#### 布尔值
- **类型**: Boolean
- **值**: `true` / `false`
- **禁止**: 使用 0/1 或 "true"/"false" 字符串

#### 枚举值
- **类型**: String
- **格式**: 小写字母+下划线
- **示例**: `"active"`, `"pending"`, `"not_found"`

### 分页参数
```json
{
  "page": 1,          // 页码，从1开始
  "pageSize": 20,     // 每页数量，默认20，最大100
  "total": 100,       // 总记录数
  "totalPages": 5     // 总页数
}
```

### 响应封装
```json
{
  "code": 0,          // 业务状态码
  "message": "...",   // 响应消息
  "data": { ... },    // 业务数据
  "requestId": "...", // 请求追踪ID
  "timestamp": 0      // 服务器时间戳
}
```

---

## 🔐 认证与授权

### 认证方式: JWT Bearer Token

#### 获取 Token
```http
POST /api/v1/auth/token HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "appId": "your_app_id",
  "appSecret": "your_app_secret"
}
```

#### Token 响应
```json
{
  "code": 0,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 3600,        // 有效期（秒）
    "refreshToken": "..."      // 刷新令牌
  }
}
```

#### 使用 Token
```http
GET /api/v1/users/123456 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 权限说明
| 权限 | 说明 | 接口范围 |
|------|------|---------|
| user:read | 读取用户信息 | GET /api/v1/users/* |
| user:write | 创建/修改用户 | POST/PUT /api/v1/users/* |
| user:delete | 删除用户 | DELETE /api/v1/users/* |

---

## 🔄 业务流程

### 用户注册流程
```
1. 客户端提交注册信息
   ↓
2. 验证参数格式
   ↓
3. 检查邮箱/手机是否已存在
   ↓
4. 创建用户记录
   ↓
5. 发送欢迎邮件
   ↓
6. 返回用户信息和 Token
```

### 用户登录流程
```
1. 客户端提交账号密码
   ↓
2. 验证账号是否存在
   ↓
3. 验证密码是否正确
   ↓
4. 生成 JWT Token
   ↓
5. 记录登录日志
   ↓
6. 返回 Token 和用户信息
```

### 异常处理流程
```
1. 接收请求
   ↓
2. 参数校验失败? → 返回 400
   ↓
3. Token 无效? → 返回 401
   ↓
4. 无权限? → 返回 403
   ↓
5. 资源不存在? → 返回 404
   ↓
6. 限流? → 返回 429
   ↓
7. 业务处理
   ↓
8. 返回结果
```

---

## 🧪 测试用例

### 场景1: 正常查询用户
```bash
curl -X GET "https://api.example.com/api/v1/users/123456" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "X-Request-Id: $(uuidgen)"
```

**预期结果**: 返回 200，包含用户信息

### 场景2: 查询不存在的用户
```bash
curl -X GET "https://api.example.com/api/v1/users/999999" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**预期结果**: 返回 404，提示用户不存在

### 场景3: Token 过期
```bash
curl -X GET "https://api.example.com/api/v1/users/123456" \
  -H "Authorization: Bearer EXPIRED_TOKEN"
```

**预期结果**: 返回 401，提示 Token 过期

---

## ⚠️ 注意事项

### 请求限制
- **频率限制**: 100次/分钟（全局），特殊接口可能更严格
- **超时时间**: 默认 5 秒，写操作 10 秒
- **重试策略**: 失败后使用指数退避（1s, 2s, 4s）

### 安全要求
- ✅ 所有请求必须使用 HTTPS
- ✅ Token 必须安全存储，不要泄露
- ✅ 不要在 URL 中传递敏感信息
- ✅ 请求必须包含 X-Request-Id 用于追踪

### 最佳实践
- 💡 使用幂等性设计，支持重试
- 💡 使用分页避免一次性返回大量数据
- 💡 使用条件请求（If-None-Match）减少带宽
- 💡 使用批量接口减少请求次数

---

## 📞 技术支持

### 联系方式
- **技术负责人**: [姓名]
- **邮箱**: tech-support@example.com
- **钉钉群**: [群号]

### 故障处理
1. 记录完整的请求和响应
2. 提供 X-Request-Id
3. 联系技术支持团队

---

## 📝 变更记录

| 日期 | 版本 | 变更内容 | 负责人 |
|------|------|---------|--------|
| 2026-02-11 | v1.0 | 初始版本 | [姓名] |

---

## 📚 附录

### A. 环境信息
| 环境 | 地址 | 说明 |
|------|------|------|
| 开发环境 | https://dev-api.example.com | 开发测试使用 |
| 测试环境 | https://test-api.example.com | 集成测试使用 |
| 生产环境 | https://api.example.com | 正式环境 |

### B. 示例代码

#### Node.js
```javascript
const axios = require('axios');

async function getUser(userId) {
  const response = await axios.get(
    `https://api.example.com/api/v1/users/${userId}`,
    {
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'X-Request-Id': generateUUID()
      },
      timeout: 5000
    }
  );
  return response.data;
}
```

#### Python
```python
import requests
import uuid

def get_user(user_id):
    response = requests.get(
        f'https://api.example.com/api/v1/users/{user_id}',
        headers={
            'Authorization': f'Bearer {TOKEN}',
            'X-Request-Id': str(uuid.uuid4())
        },
        timeout=5
    )
    return response.json()
```
