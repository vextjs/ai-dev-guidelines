# 代码规范

> 项目的编码风格、命名约定和最佳实践

---

## 📝 命名规范

### 变量命名
```typescript
// ✅ 使用 camelCase
const userId = 123;
const userName = 'John';
const isActive = true;

// ❌ 避免
const user_id = 123;        // snake_case
const UserName = 'John';    // PascalCase（保留给类）
const active = true;        // 不清晰的布尔值命名
```

### 常量命名
```typescript
// ✅ 使用 UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;
const API_BASE_URL = 'https://api.example.com';
const DEFAULT_PAGE_SIZE = 20;

// ❌ 避免
const maxRetryCount = 3;    // 普通变量风格
const apiBaseUrl = 'https://api.example.com';
```

### 函数命名
```typescript
// ✅ 使用动词开头的 camelCase
function getUserById(id: string) {}
function createUser(data: UserData) {}
function validateEmail(email: string) {}
function isValidUser(user: User) {}  // 布尔返回用 is/has/can 开头

// ❌ 避免
function user(id: string) {}         // 缺少动词
function GetUserById(id: string) {}  // PascalCase
function validate_email(email: string) {}  // snake_case
```

### 类命名
```typescript
// ✅ 使用 PascalCase
class UserService {}
class DatabaseConnection {}
class HttpClient {}

// ❌ 避免
class userService {}         // camelCase
class User_Service {}        // snake_case
class HTTPClient {}          // 缩写词全大写（应为 HttpClient）
```

### 接口/类型命名
```typescript
// ✅ 推荐方式（不加 I 前缀）
interface User {}
interface UserCreateRequest {}
type UserId = string;

// ⚠️ 可接受但不推荐
interface IUser {}          // 加 I 前缀（老式风格）

// ❌ 避免
interface user {}           // 首字母小写
type user_id = string;      // snake_case
```

### 文件命名
```typescript
// ✅ 使用 kebab-case
user-service.ts
rate-limiter.middleware.ts
user.controller.ts
database.config.ts

// ❌ 避免
UserService.ts              // PascalCase
user_service.ts             // snake_case
userservice.ts              // 无分隔符
```

---

## 📂 目录结构

### 标准目录结构
```
src/
├── config/                 # 配置文件
│   ├── database.ts
│   ├── redis.ts
│   └── app.ts
│
├── controllers/            # 控制器层
│   ├── user.controller.ts
│   └── auth.controller.ts
│
├── services/               # 业务逻辑层
│   ├── user.service.ts
│   └── auth.service.ts
│
├── models/                 # 数据模型
│   ├── user.model.ts
│   └── session.model.ts
│
├── middleware/             # 中间件
│   ├── auth.middleware.ts
│   ├── error.middleware.ts
│   └── rate-limiter.middleware.ts
│
├── utils/                  # 工具函数
│   ├── logger.ts
│   ├── validator.ts
│   └── crypto.ts
│
├── types/                  # 类型定义
│   ├── user.types.ts
│   ├── api.types.ts
│   └── index.d.ts
│
├── routes/                 # 路由定义
│   ├── user.routes.ts
│   └── auth.routes.ts
│
├── app.ts                  # 应用入口
└── server.ts               # 服务器启动
```

### 分层架构
```yaml
Controller 层:
  - 职责: 处理 HTTP 请求/响应
  - 禁止: 包含业务逻辑、直接访问数据库

Service 层:
  - 职责: 核心业务逻辑
  - 禁止: 依赖 HTTP 相关对象（req/res）

Model 层:
  - 职责: 数据访问和持久化
  - 禁止: 包含业务逻辑

依赖方向:
  Controller → Service → Model
  (单向依赖，不允许反向)
```

---

## 📥 导入顺序

### 标准导入顺序
```typescript
// 1. Node.js 内置模块
import fs from 'fs';
import path from 'path';

// 2. 第三方依赖
import express from 'express';
import { z } from 'zod';

// 3. 项目内部模块（按层级）
import { UserService } from './services/user.service';
import { UserModel } from './models/user.model';

// 4. 类型导入（分组放在最后）
import type { User, UserCreateRequest } from './types/user.types';
```

### 导入风格
```typescript
// ✅ 推荐：命名导入
import { UserService, AuthService } from './services';

// ✅ 推荐：类型导入单独标记
import type { User } from './types';

// ⚠️ 可接受：默认导入（当模块只导出一个默认值）
import express from 'express';

// ❌ 避免：通配符导入（除非必要）
import * as utils from './utils';  // 不清楚导入了什么
```

---

## 💬 注释规范

### 函数注释
```typescript
/**
 * 根据用户 ID 获取用户信息
 * 
 * @param userId - 用户唯一标识符
 * @returns 用户信息对象
 * @throws {NotFoundError} 当用户不存在时抛出
 * 
 * @example
 * ```typescript
 * const user = await getUserById('user-123');
 * console.log(user.name);
 * ```
 */
async function getUserById(userId: string): Promise<User> {
  // 实现...
}
```

### 复杂逻辑注释
```typescript
// ✅ 解释为什么这样做
// 使用 WeakMap 避免内存泄漏，当对象被 GC 时自动清理
const cache = new WeakMap<object, string>();

// ✅ 解释业务背景
// 金融合规要求：所有交易金额必须保留 2 位小数
const amount = Math.round(rawAmount * 100) / 100;

// ❌ 避免：注释重复代码逻辑
// 设置 userId 为 123
const userId = 123;  // 无意义的注释
```

### TODO/FIXME 注释
```typescript
// TODO: 需要添加缓存以提升性能
// FIXME: 当前实现在高并发下有竞态条件
// HACK: 临时方案，等待上游服务修复 Bug
// NOTE: 此处逻辑与旧版本不兼容，迁移时需要注意
```

---

## 🔧 错误处理

### 错误类定义
```typescript
// ✅ 自定义错误类
export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

### 错误处理模式
```typescript
// ✅ 推荐：使用 try-catch
async function getUserById(userId: string): Promise<User> {
  try {
    const user = await userModel.findById(userId);
    if (!user) {
      throw new NotFoundError('User', userId);
    }
    return user;
  } catch (error) {
    logger.error('Failed to get user', { userId, error });
    throw error;
  }
}

// ❌ 避免：静默失败
async function getUserById(userId: string): Promise<User | null> {
  try {
    return await userModel.findById(userId);
  } catch (error) {
    return null;  // 吞掉错误，调用方不知道发生了什么
  }
}
```

---

## 📊 日志规范

### 日志级别
```typescript
// ERROR: 错误，需要立即关注
logger.error('Database connection failed', { error, retryCount });

// WARN: 警告，可能的问题
logger.warn('Cache miss rate high', { missRate: 0.8 });

// INFO: 重要信息
logger.info('User logged in', { userId, ip });

// DEBUG: 调试信息（仅开发环境）
logger.debug('Query executed', { sql, duration });
```

### 日志内容
```typescript
// ✅ 结构化日志
logger.info('User created', {
  userId: user.id,
  email: user.email,
  source: 'web',
  timestamp: Date.now()
});

// ❌ 避免：拼接字符串
logger.info(`User ${user.id} created with email ${user.email}`);
```

---

## 🎨 API 设计规范

### RESTful 路由
```typescript
// ✅ 推荐路由设计
GET    /api/users              # 获取用户列表
GET    /api/users/:id          # 获取单个用户
POST   /api/users              # 创建用户
PUT    /api/users/:id          # 更新用户（完整）
PATCH  /api/users/:id          # 更新用户（部分）
DELETE /api/users/:id          # 删除用户

// ❌ 避免：动词路由
GET    /api/getUsers
POST   /api/createUser
POST   /api/deleteUser/:id
```

### 响应格式
```typescript
// ✅ 统一响应格式
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page: number;
    pageSize: number;
    total: number;
  };
}

// 成功响应
{
  "success": true,
  "data": { "id": "user-123", "name": "John" }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found",
    "details": { "userId": "user-123" }
  }
}
```

---

## 🧪 测试规范

### 测试文件命名
```
src/services/user.service.ts
test/services/user.service.test.ts

或

src/services/user.service.ts
src/services/__tests__/user.service.test.ts
```

### 测试结构
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { UserService } from '../user.service';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
  });

  describe('getUserById', () => {
    it('should return user when user exists', async () => {
      // Arrange
      const userId = 'user-123';
      
      // Act
      const user = await userService.getUserById(userId);
      
      // Assert
      expect(user).toBeDefined();
      expect(user.id).toBe(userId);
    });

    it('should throw NotFoundError when user does not exist', async () => {
      // Arrange
      const userId = 'non-existent';
      
      // Act & Assert
      await expect(userService.getUserById(userId))
        .rejects.toThrow(NotFoundError);
    });
  });
});
```

---

## 🚨 代码检查清单

### 提交前检查
- [ ] 代码通过 ESLint 检查
- [ ] 代码通过 Prettier 格式化
- [ ] TypeScript 类型检查通过
- [ ] 单元测试通过
- [ ] 测试覆盖率 >= 80%
- [ ] 无 console.log（使用 logger）
- [ ] 无硬编码的配置（使用环境变量）
- [ ] 添加了必要的注释
- [ ] 更新了相关文档

---

## 🎯 AI 使用说明

### AI 必须遵守
```yaml
命名规范:
  - 变量/函数: camelCase
  - 类/接口: PascalCase
  - 常量: UPPER_SNAKE_CASE
  - 文件: kebab-case

目录结构:
  - 严格按照标准目录结构
  - 新文件放在正确的目录

导入顺序:
  - Node.js 内置 → 第三方 → 项目内部 → 类型

错误处理:
  - 使用自定义错误类
  - 不吞掉错误
  - 记录错误日志
```

### 代码生成检查
```typescript
// AI 生成代码后自动检查
function validateGeneratedCode(code: string): ValidationResult {
  return {
    naming: checkNamingConventions(code),
    imports: checkImportOrder(code),
    errors: checkErrorHandling(code),
    comments: checkCommentQuality(code),
  };
}
```

---

**模板说明**: 复制到具体项目后，根据团队实际规范调整
