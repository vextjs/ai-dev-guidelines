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
