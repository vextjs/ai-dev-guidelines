# 技术栈说明

> 项目使用的技术栈、版本要求和依赖约束

---

## 🎯 技术栈概览

```yaml
分类: 后端服务
语言: TypeScript 5.0+
运行时: Node.js 20.x
框架: Express 4.18+
数据库: MongoDB 6.0+
缓存: Redis 7.0+
测试: Vitest 1.0+
```

---

## 📦 核心依赖

### 运行时框架
```json
{
  "express": "^4.18.0",
  "typescript": "^5.0.0",
  "mongodb": "^6.0.0",
  "redis": "^4.6.0"
}
```

### 中间件
```json
{
  "cors": "^2.8.5",
  "helmet": "^7.0.0",
  "morgan": "^1.10.0",
  "compression": "^1.7.4"
}
```

### 工具库
```json
{
  "lodash": "^4.17.21",
  "dayjs": "^1.11.0",
  "zod": "^3.22.0",
  "winston": "^3.11.0"
}
```

### 开发依赖
```json
{
  "vitest": "^1.0.0",
  "eslint": "^8.55.0",
  "prettier": "^3.1.0",
  "@types/node": "^20.10.0",
  "@types/express": "^4.17.21"
}
```

---

## ✅ 必须使用的依赖

### 日志库
```yaml
库名: winston
版本: ^3.11.0
理由: 
  - 统一日志格式
  - 便于集中监控
  - 支持日志分级
  
使用示例:
  import logger from './utils/logger';
  logger.info('User logged in', { userId: 123 });
```

### 参数验证
```yaml
库名: zod
版本: ^3.22.0
理由:
  - 类型安全
  - 运行时验证
  - 自动生成类型

使用示例:
  import { z } from 'zod';
  const userSchema = z.object({
    name: z.string(),
    email: z.string().email()
  });
```

### 环境变量
```yaml
库名: dotenv
版本: ^16.3.0
理由:
  - 标准化环境配置
  - 支持多环境
  
使用示例:
  import 'dotenv/config';
  const port = process.env.PORT || 3000;
```

---

## ❌ 禁止使用的依赖

### 禁止列表
```yaml
1. moment.js:
   - 理由: 包体积过大，已过时
   - 替代: dayjs

2. request:
   - 理由: 已废弃
   - 替代: axios 或 node-fetch

3. body-parser:
   - 理由: Express 4.16+ 已内置
   - 替代: express.json()

4. lodash (全量):
   - 理由: 包体积大
   - 替代: lodash-es（按需导入）
```

---

## 🎨 推荐使用的依赖

### HTTP 客户端
```yaml
推荐: axios
版本: ^1.6.0
优势: 
  - 拦截器支持
  - 自动转换 JSON
  - 请求/响应拦截
```

### 数据校验
```yaml
推荐: zod
版本: ^3.22.0
优势:
  - TypeScript 原生
  - 类型推导
  - 链式 API
```

### 日期处理
```yaml
推荐: dayjs
版本: ^1.11.0
优势:
  - 轻量级（2KB）
  - API 与 moment 兼容
  - 支持插件
```

---

## 🔧 开发工具链

### TypeScript 配置
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

### ESLint 规则
```yaml
extends:
  - eslint:recommended
  - plugin:@typescript-eslint/recommended
  - prettier

rules:
  - no-console: warn
  - no-unused-vars: error
  - @typescript-eslint/no-explicit-any: error
```

### Prettier 配置
```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100
}
```

---

## 🗄️ 数据库版本

### MongoDB
```yaml
版本: 6.0+
驱动: mongodb (官方 Node.js 驱动)
ORM: monSQLize (自研)

连接配置:
  - maxPoolSize: 10
  - minPoolSize: 2
  - serverSelectionTimeoutMS: 5000
  - socketTimeoutMS: 45000
```

### Redis
```yaml
版本: 7.0+
客户端: redis (官方 Node.js 客户端)

配置:
  - maxRetriesPerRequest: 3
  - enableOfflineQueue: false
  - connectTimeout: 10000
```

---

## 🧪 测试框架

### 单元测试
```yaml
框架: Vitest
版本: ^1.0.0
配置:
  - 测试覆盖率要求: >= 80%
  - 超时时间: 5000ms
  - 并发执行: 启用
```

### 集成测试
```yaml
框架: Vitest
数据库: 测试专用 MongoDB 实例
策略: 每个测试独立数据库
清理: 测试后自动清理
```

### E2E 测试
```yaml
框架: Playwright (如有前端)
API 测试: Supertest
覆盖范围: 核心业务流程
```

---

## 📊 性能要求

### 运行时性能
```yaml
Node.js 版本: >= 20.x
内存限制: 512MB (开发), 2GB (生产)
启动时间: < 5s
热重载: 启用 (开发环境)
```

### 构建性能
```yaml
构建工具: esbuild / swc
构建时间: < 30s
增量编译: 启用
Tree shaking: 启用
```

---

## 🔄 版本升级策略

### 依赖更新原则
```yaml
主版本升级:
  - 需要技术评审
  - 需要全面测试
  - 需要更新文档

次版本升级:
  - 定期更新 (每月)
  - 回归测试
  
补丁版本:
  - 安全补丁立即更新
  - 其他补丁每周更新
```

### Node.js 版本策略
```yaml
当前版本: 20.x LTS
升级计划:
  - 跟随 LTS 版本
  - 新 LTS 发布后 3 个月内升级
  - 保持在 Active LTS 阶段
```

---

## 🚨 兼容性矩阵

### 支持的 Node.js 版本
```yaml
推荐: 20.x LTS
支持: >= 18.x
不支持: < 18.x
```

### 支持的操作系统
```yaml
开发环境:
  - macOS 12+
  - Windows 10+ (WSL2)
  - Linux (Ubuntu 20.04+)

生产环境:
  - Linux (Ubuntu 22.04 LTS)
  - Docker (Alpine Linux)
```

---

## 🎯 AI 使用说明

### AI 必读字段
```yaml
必须读取:
  - 核心依赖版本
  - 禁止使用的依赖
  - TypeScript/ESLint 配置

应用场景:
  - 选择依赖时检查是否在禁止列表
  - 添加依赖时使用推荐版本
  - 生成代码时遵守 ESLint 规则
```

### 依赖选择决策树
```yaml
添加新依赖前检查:
  1. 是否在禁止列表？
     - 是 → 使用替代方案
     - 否 → 继续
  
  2. 是否有推荐的同类库？
     - 是 → 优先使用推荐
     - 否 → 继续
  
  3. 是否与现有依赖冲突？
     - 是 → 寻找其他方案
     - 否 → 可以使用
  
  4. 包大小是否合理？
     - 否 → 考虑更轻量的替代
     - 是 → 可以使用
```

---

**模板说明**: 复制到具体项目后，根据实际技术栈填充内容
