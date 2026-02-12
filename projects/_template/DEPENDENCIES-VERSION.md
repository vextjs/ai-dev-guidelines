# 项目依赖管理规范 - 版本策略和添加

> **版本**: v1.0  
> **最后更新**: 2026-02-11  
> **适用范围**: 所有 npm 项目

---

## 依赖分类

### 1. 生产依赖 (dependencies)

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "mongoose": "^7.0.0",
    "redis": "^4.6.0"
  }
}
```

**特点**:
- 应用运行时需要
- 会被打包到生产环境
- 应该保持稳定和成熟

**常见生产依赖**:
```yaml
Web 框架:
  - express (Node.js)
  - fastify (Node.js, 性能优先)
  - react (前端)
  - vue (前端)

数据库驱动:
  - mongoose (MongoDB)
  - pg (PostgreSQL)
  - mysql2 (MySQL)

缓存和消息:
  - redis (缓存)
  - ioredis (Redis 客户端)
  - amqplib (RabbitMQ)

工具库:
  - lodash (实用函数)
  - moment/dayjs (日期处理)
  - uuid (唯一标识)
```

### 2. 开发依赖 (devDependencies)

```json
{
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "typescript": "^5.0.0"
  }
}
```

**特点**:
- 仅在开发过程中使用
- 不会被打包到生产环境
- 可以更激进地更新版本

**常见开发依赖**:
```yaml
测试框架:
  - jest (单元测试)
  - mocha (单元测试)
  - cypress (端到端测试)

代码质量:
  - eslint (代码检查)
  - prettier (代码格式)
  - husky (Git hooks)

编译工具:
  - typescript (类型检查)
  - babel (转译)
  - webpack (打包)
  - vite (快速构建)

工具:
  - nodemon (开发自动重启)
  - dotenv (环境变量)
```

### 3. 可选依赖 (optionalDependencies)

```json
{
  "optionalDependencies": {
    "sqlite3": "^5.0.0"
  }
}
```

**特点**:
- 如果有 C++ 扩展，安装失败也不会中断
- 应用需要检查是否可用

### 4. 对等依赖 (peerDependencies)

```json
{
  "peerDependencies": {
    "react": ">=16.8.0",
    "react-dom": ">=16.8.0"
  }
}
```

**特点**:
- 声明与其他包的依赖关系
- 通常用于插件或库

---

## 版本策略

### 1. 语义化版本 (Semantic Versioning)

```
版本格式: MAJOR.MINOR.PATCH

MAJOR (主版本):
  定义: 包含不向后兼容的 API 变更
  增量: 从 1.0.0 → 2.0.0
  示例: Express 3.0 vs 4.0

MINOR (次版本):
  定义: 添加新功能，向后兼容
  增量: 从 1.0.0 → 1.1.0
  示例: Express 4.16 vs 4.17

PATCH (补丁版本):
  定义: 修复 bug，向后兼容
  增量: 从 1.0.0 → 1.0.1
  示例: Express 4.17.0 vs 4.17.1
```

### 2. 版本范围指定

#### Caret (^) - 允许兼容的版本

```javascript
"^4.18.0" 
  // 允许: 4.18.0, 4.18.1, 4.19.0, ..., 4.99.99
  // 不允许: 5.0.0
  // 含义: 允许 MINOR 和 PATCH 版本号更新
  // 推荐: 大多数依赖

"^0.18.0"
  // 允许: 0.18.0, 0.18.1
  // 不允许: 0.19.0
  // 含义: 0.x 版本特殊处理，不允许 MINOR 更新
```

#### Tilde (~) - 允许补丁更新

```javascript
"~4.18.0"
  // 允许: 4.18.0, 4.18.1, 4.18.2, ...
  // 不允许: 4.19.0
  // 含义: 仅允许 PATCH 版本号更新
  // 推荐: 关键依赖，希望更新更保守
```

#### 精确版本

```javascript
"4.18.0"
  // 只允许: 4.18.0
  // 含义: 确保团队所有人使用同一版本
  // 推荐: 生产环境锁定重要依赖
```

### 3. 版本策略选择表

```yaml
核心框架 (Express, React, Vue):
  策略: ^ (允许小版本) + package-lock.json 锁定
  原因: 框架经常发布新功能，但向后兼容

关键依赖 (数据库驱动、认证、支付 API):
  策略: ~ (仅允许补丁) + package-lock.json 锁定
  原因: 这些库的行为必须稳定

开发工具 (ESLint, Prettier, Jest):
  策略: ^ (允许小版本)
  原因: 工具更新频繁，通常向后兼容

实验功能 (Beta 或 Alpha):
  策略: 精确版本或 latest
  原因: 不稳定，需要锁定测试

已弃用的包:
  策略: 精确版本
  原因: 应该尽快迁移，不应自动更新
```

---

## 添加依赖

### 1. 添加前的检查清单

```yaml
□ 是否真的需要这个包?
  - 检查 npm.js 中的下载量和评分
  - 检查是否有内置替代方案
  - 检查是否已经有类似的依赖

□ 包是否活跃维护?
  - 检查最后更新时间 (应该 < 3 个月)
  - 检查 GitHub 下的 issue 处理速度
  - 检查维护者是否有多个人

□ 包的许可证是否兼容?
  - 我们项目的许可证是什么? (MIT/Apache/GPL)
  - 新包的许可证是什么?
  - 是否存在许可证冲突?

□ 包的大小和依赖关系?
  - 检查 bundlesize: https://bundlephobia.com
  - 检查总共会增加多少依赖
  - 是否值得这个开销?

□ 安全检查?
  - 在 https://snyk.io 中搜索已知漏洞
  - 检查是否有安全警告
```

### 2. 添加命令

```bash
# 添加生产依赖
npm install express@^4.18.0

# 添加开发依赖
npm install --save-dev jest@^29.0.0

# 添加可选依赖
npm install --save-optional sqlite3@^5.0.0

# 安装所有依赖
npm install

# 从 package.json 安装锁定的版本 (推荐用于 CI/生产)
npm ci
```

### 3. 添加后的验证

```bash
# 1. 检查 package.json 和 package-lock.json 是否更新
git diff package.json

# 2. 运行单元测试确保兼容
npm test

# 3. 检查构建是否成功
npm run build

# 4. 检查打包大小是否增长过多
npm run bundle-analyze

# 5. 提交更改
git add package.json package-lock.json
git commit -m "feat: add express-validator for input validation"
```

---

## 相关文档

- [DEPENDENCIES-UPDATES.md](./DEPENDENCIES-UPDATES.md) - 更新和安全
- [CI-CD.md](./CI-CD.md) - CI/CD 规范（包括依赖检查）

---

**最后更新**: 2026-02-11  
**维护者**: [需要项目团队确定]
