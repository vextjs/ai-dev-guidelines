# 代码规范

> AI 生成代码时必须遵守的代码质量标准

---

## 📋 8 维度代码质量

| 维度 | 说明 | 检查点 |
|-----|------|-------|
| 命名规范 | 变量、函数、类的命名 | 5 项 |
| 格式规范 | 缩进、空格、换行 | 4 项 |
| 注释规范 | 注释内容和位置 | 4 项 |
| 错误处理 | 异常和边界处理 | 6 项 |
| 日志规范 | 日志格式和级别 | 4 项 |
| 导入规范 | import 顺序和格式 | 3 项 |
| 类型规范 | TypeScript 类型定义 | 4 项 |
| 性能规范 | 性能最佳实践 | 5 项 |

---

## 🔤 命名规范

### 变量命名

```yaml
规则:
  - 使用 camelCase
  - 名称应表达含义
  - 避免单字母变量（循环索引除外）
  - 布尔变量使用 is/has/can 前缀

示例:
  ✅ 正确:
    const userName = 'John';
    const isLoggedIn = true;
    const hasPermission = false;
    
  ❌ 错误:
    const u = 'John';           // 单字母
    const user_name = 'John';   // 下划线
    const logged = true;        // 缺少 is 前缀
```

### 函数命名

```yaml
规则:
  - 使用 camelCase
  - 动词开头表示操作
  - 名称应表达功能

常用前缀:
  - get: 获取数据
  - set: 设置数据
  - create: 创建对象
  - update: 更新数据
  - delete: 删除数据
  - handle: 处理事件
  - validate: 验证数据
  - format: 格式化数据

示例:
  ✅ 正确:
    function getUserById(id) { }
    function createOrder(data) { }
    function validateEmail(email) { }
    
  ❌ 错误:
    function user(id) { }       // 缺少动词
    function get_user(id) { }   // 下划线
```

### 类命名

```yaml
规则:
  - 使用 PascalCase
  - 名词表示实体
  - 避免缩写

示例:
  ✅ 正确:
    class UserService { }
    class OrderController { }
    class DatabaseConnection { }
    
  ❌ 错误:
    class userService { }       // 首字母小写
    class user_service { }      // 下划线
    class UsrSvc { }            // 过度缩写
```

### 常量命名

```yaml
规则:
  - 使用 UPPER_SNAKE_CASE
  - 配置值、枚举值使用常量

示例:
  ✅ 正确:
    const MAX_RETRY_COUNT = 3;
    const API_BASE_URL = 'https://api.example.com';
    const HTTP_STATUS_OK = 200;
    
  ❌ 错误:
    const maxRetryCount = 3;    // 未使用大写
```

### 文件命名

```yaml
规则:
  - 使用 kebab-case 或项目约定
  - 组件文件使用 PascalCase
  - 测试文件添加 .test 或 .spec 后缀

示例:
  ✅ 正确:
    user-service.ts
    rate-limit.middleware.ts
    UserController.ts          // 组件
    user-service.test.ts       // 测试
    
  ❌ 错误:
    userService.ts             // 混合命名
    user_service.ts            // 下划线
```

---

## 📐 格式规范

### 缩进

```yaml
规则:
  - 使用 2 空格或 4 空格（项目一致）
  - 不混用 Tab 和空格

配置:
  // .prettierrc
  {
    "tabWidth": 2,
    "useTabs": false
  }
```

### 行长度

```yaml
规则:
  - 最大 100-120 字符
  - 长语句换行
```

### 空行

```yaml
规则:
  - 函数之间空一行
  - 逻辑块之间空一行
  - 文件末尾空一行
```

### 括号

```yaml
规则:
  - 左括号不换行
  - 单行 if 也使用括号

示例:
  ✅ 正确:
    if (condition) {
      doSomething();
    }
    
  ❌ 错误:
    if (condition)
    {                          // 左括号换行
      doSomething();
    }
    
    if (condition) doSomething();  // 无括号
```

---

## 📝 注释规范

### 函数注释

```yaml
规则:
  - 公共函数必须有 JSDoc
  - 说明参数和返回值
  - 说明异常情况

示例:
  /**
   * 根据 ID 获取用户信息
   * @param {string} id - 用户 ID
   * @returns {Promise<User>} 用户对象
   * @throws {NotFoundError} 用户不存在时抛出
   */
  async function getUserById(id: string): Promise<User> {
    // ...
  }
```

### 行内注释

```yaml
规则:
  - 解释"为什么"而不是"是什么"
  - 复杂逻辑添加注释
  - 使用中文注释（除非项目要求英文）

示例:
  ✅ 正确:
    // 使用软删除以保留历史记录
    user.deletedAt = new Date();
    
  ❌ 错误:
    // 设置删除时间
    user.deletedAt = new Date();  // 显而易见，无需注释
```

### TODO 注释

```yaml
格式:
  // TODO: [描述] - [负责人] - [日期]

示例:
  // TODO: 添加缓存支持 - Rocky - 2026-02-12
```

---

## ⚠️ 错误处理

### async/await

```yaml
规则:
  - 所有 async 函数必须有 try-catch
  - 错误必须记录日志
  - 错误必须向上传播或处理

示例:
  async function fetchUser(id: string): Promise<User> {
    try {
      const user = await db.users.findById(id);
      if (!user) {
        throw new NotFoundError(`User ${id} not found`);
      }
      return user;
    } catch (error) {
      logger.error('fetchUser failed', { id, error: error.message });
      throw error;
    }
  }
```

### 边界检查

```yaml
规则:
  - 检查 null/undefined
  - 检查空字符串
  - 检查数组边界

示例:
  function getFirstItem<T>(items: T[]): T | null {
    if (!items || items.length === 0) {
      return null;
    }
    return items[0];
  }
```

### 错误类型

```yaml
建议:
  - 使用自定义错误类
  - 包含错误码
  - 包含上下文信息

示例:
  class AppError extends Error {
    constructor(
      public message: string,
      public code: string,
      public context?: Record<string, any>
    ) {
      super(message);
      this.name = this.constructor.name;
    }
  }
  
  class NotFoundError extends AppError {
    constructor(resource: string, id: string) {
      super(`${resource} not found`, 'NOT_FOUND', { resource, id });
    }
  }
```

---

## 📊 日志规范

### 日志级别

```yaml
级别:
  - error: 错误，需要关注
  - warn: 警告，可能的问题
  - info: 重要信息
  - debug: 调试信息

使用场景:
  error: 异常、失败
  warn: 降级、重试
  info: 请求开始/结束、重要操作
  debug: 详细数据、调试
```

### 日志内容

```yaml
必须包含:
  - 操作名称
  - 关键参数
  - 错误信息（如有）

示例:
  logger.info('createOrder start', { userId, productId });
  logger.info('createOrder success', { orderId });
  logger.error('createOrder failed', { userId, error: error.message });
```

### 敏感信息

```yaml
禁止记录:
  - 密码
  - Token
  - 信用卡号
  - 身份证号

处理方式:
  - 脱敏处理
  - 只记录 ID
```

---

## 📦 导入规范

### 导入顺序

```yaml
顺序:
  1. Node.js 内置模块
  2. 第三方模块
  3. 项目模块
  4. 相对路径模块

示例:
  // Node.js 内置
  import path from 'path';
  import fs from 'fs';
  
  // 第三方
  import express from 'express';
  import mongoose from 'mongoose';
  
  // 项目模块
  import { UserService } from '@/services';
  import { validateUser } from '@/utils';
  
  // 相对路径
  import { UserModel } from './models';
  import { config } from '../config';
```

### 导入格式

```yaml
规则:
  - 使用具名导入优于默认导入
  - 多个导入换行
  - 按字母排序

示例:
  ✅ 正确:
    import {
      createUser,
      deleteUser,
      getUserById,
      updateUser,
    } from './user-service';
    
  ❌ 错误:
    import { createUser, deleteUser, getUserById, updateUser } from './user-service';
```

---

## 🔷 TypeScript 类型规范

### 类型定义

```yaml
规则:
  - 优先使用 interface 定义对象
  - 使用 type 定义联合类型
  - 避免 any
  - 复杂类型抽取为独立定义

示例:
  interface User {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
  }
  
  type UserStatus = 'active' | 'inactive' | 'banned';
  
  interface CreateUserInput {
    name: string;
    email: string;
  }
```

### 函数类型

```yaml
规则:
  - 参数必须有类型
  - 返回值必须有类型
  - 使用泛型增加复用性

示例:
  async function findById<T>(
    collection: Collection<T>,
    id: string
  ): Promise<T | null> {
    return collection.findOne({ _id: id });
  }
```

---

## ⚡ 性能规范

### 避免 N+1 查询

```yaml
问题:
  // ❌ N+1 查询
  const users = await User.find();
  for (const user of users) {
    user.orders = await Order.find({ userId: user.id });
  }

解决:
  // ✅ 使用聚合或预加载
  const users = await User.aggregate([
    { $lookup: { from: 'orders', localField: '_id', foreignField: 'userId', as: 'orders' } }
  ]);
```

### 避免大循环中的 I/O

```yaml
问题:
  // ❌ 循环中的数据库操作
  for (const item of items) {
    await db.insert(item);
  }

解决:
  // ✅ 批量操作
  await db.insertMany(items);
```

### 使用缓存

```yaml
场景:
  - 频繁读取的配置
  - 不常变化的数据
  - 计算结果

示例:
  const cache = new Map();
  
  async function getConfig(key: string) {
    if (cache.has(key)) {
      return cache.get(key);
    }
    const value = await db.configs.findOne({ key });
    cache.set(key, value);
    return value;
  }
```

---

## 📎 相关文档

- [测试规范](./test-standards.md)
- [API 规范](./api-standards.md)
- [安全规范](./security-standards.md)

---

**最后更新**: 2026-02-12

