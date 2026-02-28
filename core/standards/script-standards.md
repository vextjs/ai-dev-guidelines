# 脚本规范

> 脚本开发和文档规范

---

## 📋 脚本分类

| 类型 | 用途 | 目录 |
|-----|------|------|
| 安装脚本 | 依赖安装、环境配置 | scripts/install/ |
| 初始化脚本 | 数据初始化 | scripts/init/ |
| 测试脚本 | 功能验证 | scripts/test/ |
| 修复脚本 | 数据修复 | scripts/fix/ |
| 部署脚本 | 部署流程 | scripts/deploy/ |

---

## 📝 脚本文档要求

### 文件头部

```typescript
/**
 * 脚本名称: init-user-data.ts
 * 功能: 初始化用户测试数据
 * 作者: Rocky
 * 日期: 2026-02-12
 * 
 * 使用方法:
 *   npx ts-node scripts/init/init-user-data.ts
 * 
 * 环境变量:
 *   MONGODB_URI - 数据库连接
 *   NODE_ENV - 运行环境
 * 
 * 注意事项:
 *   - 仅在测试环境运行
 *   - 会清空现有数据
 */
```

### README 要求

```markdown
# scripts/init/README.md

## 初始化脚本

### 脚本列表

| 脚本 | 功能 | 运行环境 |
|-----|------|---------|
| init-user-data.ts | 初始化用户数据 | 测试 |
| init-config.ts | 初始化配置 | 所有 |

### 运行方法

\`\`\`bash
npx ts-node scripts/init/init-user-data.ts
\`\`\`

### 注意事项

1. 确认环境变量已配置
2. 确认数据库可访问
3. 部分脚本会清空数据
```

---

## 🔧 脚本代码规范

### 必须包含

```yaml
必须:
  - 入口函数
  - 错误处理
  - 日志输出
  - 退出码
```

### 模板

```typescript
async function main() {
  console.log('🚀 脚本开始执行...');
  
  try {
    // 连接数据库
    await connectDB();
    
    // 执行主要逻辑
    const result = await doSomething();
    
    console.log('✅ 执行成功:', result);
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    process.exit(1);
    
  } finally {
    // 清理资源
    await disconnectDB();
  }
}

main();
```

---

## 🔁 幂等性要求

### 原则

```yaml
定义: 脚本多次执行结果与单次执行相同

必须幂等的脚本:
  - 初始化脚本
  - 数据修复脚本
  - 部署脚本

实现方式:
  - 检查是否已执行（标记/状态检查）
  - 使用 upsert 而非 insert
  - 事务回滚支持
```

### 示例

```typescript
// ❌ 非幂等
async function initData() {
  await db.users.insertMany(testUsers);  // 重复执行会报错
}

// ✅ 幂等
async function initData() {
  for (const user of testUsers) {
    await db.users.updateOne(
      { email: user.email },
      { $set: user },
      { upsert: true }
    );
  }
}
```

### 实现方式

```yaml
方式 1: 使用 upsert
  说明: 插入或更新，存在则更新，不存在则插入
  示例:
    await db.users.updateOne(
      { email: user.email },
      { $set: user },
      { upsert: true }
    );

方式 2: 执行前检查状态
  说明: 检查是否已执行，已执行则跳过
  示例:
    const exists = await db.migrations.findOne({ version: '1.0.0' });
    if (exists) {
      console.log('⚠️ [WARN] 迁移已执行，跳过');
      return;
    }
    // 执行迁移...
    await db.migrations.insertOne({ version: '1.0.0', executedAt: new Date() });

方式 3: 使用幂等 key
  说明: 使用唯一标识防止重复执行
  示例:
    const idempotencyKey = `init-${Date.now()}`;
    const exists = await redis.get(idempotencyKey);
    if (exists) return;
    
    await redis.set(idempotencyKey, '1', 'EX', 3600);
    // 执行操作...

方式 4: 事务回滚支持
  说明: 失败时回滚，确保原子性
  示例:
    const session = await db.startSession();
    try {
      await session.withTransaction(async () => {
        // 执行多个操作...
      });
    } finally {
      await session.endSession();
    }
```

---

## 🔧 环境变量管理

### 必须使用环境变量

```yaml
必须使用环境变量的场景:
  - 数据库连接字符串
  - API 密钥和密钥
  - 第三方服务凭证
  - 环境标识（development/production）
  - 敏感配置参数

命名规范:
  - 使用 UPPER_SNAKE_CASE
  - 添加前缀表明模块（如 DB_HOST, REDIS_PORT）
  - 布尔值使用 true/false 字符串
```

### 环境变量加载

```typescript
// 使用 dotenv 加载环境变量
import dotenv from 'dotenv';

// 加载 .env 文件
dotenv.config();

// 验证必需的环境变量
const requiredEnvVars = [
  'MONGODB_URI',
  'NODE_ENV',
  'API_KEY',
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    console.error(`❌ 缺少环境变量: ${key}`);
    process.exit(1);
  }
}
```

### 环境变量文档

```yaml
每个脚本必须在头部注释中说明:
  - 必需的环境变量
  - 可选的环境变量及默认值
  - 环境变量的用途

示例:
  /**
   * 环境变量:
   *   MONGODB_URI - 数据库连接（必需）
   *   NODE_ENV - 运行环境（必需，development/production）
   *   BATCH_SIZE - 批处理大小（可选，默认 100）
   *   DRY_RUN - 是否模拟运行（可选，默认 false）
   */
```

---

## ✅ 脚本测试规范

### 测试分类

```yaml
必须测试:
  - 正常流程: 输入正确时的执行结果
  - 异常处理: 错误输入、连接失败等
  - 幂等性: 多次执行结果一致
  - 环境检查: 缺少环境变量时的行为

可选测试:
  - 性能测试: 大数据量下的执行时间
  - 回滚测试: 失败时的回滚机制
```

### 测试脚本示例

```typescript
// scripts/init/init-user-data.test.ts
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { initUserData } from './init-user-data';

describe('init-user-data', () => {
  beforeEach(async () => {
    // 创建测试数据库
    await setupTestDB();
  });

  afterEach(async () => {
    // 清理测试数据库
    await cleanupTestDB();
  });

  it('should create users successfully', async () => {
    const result = await initUserData();
    expect(result.success).toBe(true);
    expect(result.created).toBeGreaterThan(0);
  });

  it('should be idempotent', async () => {
    // 第一次执行
    const result1 = await initUserData();
    expect(result1.created).toBeGreaterThan(0);

    // 第二次执行
    const result2 = await initUserData();
    expect(result2.created).toBe(0); // 已存在，跳过
    expect(result2.skipped).toBe(result1.created);
  });

  it('should fail gracefully when DB is unavailable', async () => {
    await disconnectDB();
    
    await expect(initUserData()).rejects.toThrow();
  });
});
```

### 测试运行

```json
// package.json
{
  "scripts": {
    "test:scripts": "jest scripts/**/*.test.ts",
    "test:scripts:watch": "jest scripts/**/*.test.ts --watch"
  }
}
```

---

## 📝 日志输出规范

### 日志格式

```yaml
格式: [时间戳] [级别] 消息

级别:
  INFO  - 正常流程信息
  WARN  - 警告信息
  ERROR - 错误信息
  DEBUG - 调试信息（默认不输出）
```

### 推荐输出

```typescript
// 开始
console.log('🚀 [INFO] 脚本开始执行');
console.log(`📋 [INFO] 环境: ${process.env.NODE_ENV}`);

// 进度
console.log(`📊 [INFO] 处理进度: ${current}/${total} (${percent}%)`);

// 警告
console.warn('⚠️ [WARN] 数据已存在，跳过');

// 错误
console.error('❌ [ERROR] 执行失败:', error.message);

// 完成
console.log('✅ [INFO] 脚本执行完成');
console.log(`📊 [INFO] 统计: 成功=${success}, 失败=${failed}, 跳过=${skipped}`);
```

---

## 🔍 ESLint 配置

### 脚本专用配置

```javascript
// eslint.config.js (脚本目录)
module.exports = {
  rules: {
    // 允许 console
    'no-console': 'off',
    
    // 允许 process.exit
    'no-process-exit': 'off',
    
    // 要求顶层 await 包装
    'no-floating-promises': 'error',
    
    // 要求错误处理
    'no-unhandled-rejection': 'error',
  },
};
```

### package.json 脚本

```json
{
  "scripts": {
    "script:init": "ts-node scripts/init/index.ts",
    "script:fix": "ts-node scripts/fix/index.ts",
    "script:lint": "eslint scripts/ --fix"
  }
}
```

---

## 🛡️ 安全检查

### 执行前检查

```typescript
function preCheck() {
  // 1. 环境检查
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ 禁止在生产环境运行');
    process.exit(1);
  }
  
  // 2. 必要环境变量
  const required = ['MONGODB_URI', 'NODE_ENV'];
  for (const key of required) {
    if (!process.env[key]) {
      console.error(`❌ 缺少环境变量: ${key}`);
      process.exit(1);
    }
  }
  
  // 3. 用户确认（危险操作）
  if (isDangerous) {
    const answer = await confirm('⚠️ 此操作将删除数据，确认继续？');
    if (!answer) process.exit(0);
  }
}
```

---

## 📎 相关文档

- [代码规范](./code-standards.md)

---

**最后更新**: 2026-02-12
