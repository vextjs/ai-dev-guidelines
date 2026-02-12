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

## 📎 相关文档

- [代码规范](./code-standards.md)

---

**最后更新**: 2026-02-12

