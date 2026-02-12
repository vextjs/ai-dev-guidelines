# user-service 项目概况

> 用户服务项目的基本信息、依赖关系和环境配置  
> **版本**: v1.0.0  
> **最后更新**: 2026-02-12  
> **用途**: 示例项目，展示 dev-docs 项目规范的使用方式

---

## 📋 基本信息

```yaml
项目名称: user-service
项目描述: 用户中心服务，提供用户注册、登录、信息管理等功能
仓库地址: https://github.com/example/user-service
创建时间: 2026-01-01
主要负责人: @backend-team
技术栈: Node.js + Express + MongoDB + TypeScript
```

---

## 🔧 技术栈详情

```yaml
运行时:
  Node.js: ">=18.x"
  包管理器: pnpm

框架与库:
  Web框架: Express v4.x
  数据库: MongoDB v6.x + Mongoose v8.x
  缓存: Redis v7.x + ioredis
  认证: JWT + bcrypt

开发工具:
  语言: TypeScript v5.x
  构建: esbuild
  测试: Jest + Supertest
  代码检查: ESLint + Prettier

监控与日志:
  日志库: pino
  APM: 自研监控系统
```

---

## 🔴 MCP 配置（如使用 MCP 必填）

```yaml
# AI 助手可使用的 MCP 服务器配置

允许的 MCP 服务器: mongodb-user
数据库: user_db
用途: 测试数据查询和分析
限制:
  - 只读权限
  - 禁止删除操作
  - 禁止修改生产数据
  - 禁止查询敏感字段 (password, token)

# AI 助手必须先读取此配置才能调用 MCP 服务器
# 未配置则禁止调用任何 MCP
```

---

## ❌ 禁止项（必须 100% 遵守）

### 架构禁止项

```yaml
1. 禁止 Service 层:
   原因: 项目采用 Controller + Utils 轻量架构
   替代方案: Controller 直接调用 Model，复杂逻辑抽取到 utils/
   
2. 禁止 DTO 类:
   原因: TypeScript interface 已足够，不需要额外类
   替代方案: Zod schema 进行运行时验证

3. 禁止 Repository 层:
   原因: Mongoose 已提供足够的数据访问抽象
   替代方案: Model 静态方法 + 查询插件
```

### 依赖禁止项

```yaml
禁止的依赖:
  - class-validator: 使用 Zod 替代
  - moment.js: 使用 dayjs 替代
  - lodash: 使用原生方法或 es-toolkit
  - express-validator: 使用 Zod 替代
```

### 代码禁止项

```yaml
禁止:
  - 直接使用 console.log（使用 logger）
  - 硬编码配置值（使用环境变量）
  - 同步 I/O 操作（使用 async/await）
  - 裸 try-catch（必须有错误日志和上报）
  - any 类型（必须明确类型）
```

---

## 🔗 依赖服务

### 上游服务（本项目调用）
```yaml
服务列表:
  - auth-service:
      用途: Token 验证
      接口文档: /docs/auth-service-api.md
      超时配置: 3000ms
  
  - notification-service:
      用途: 发送短信/邮件验证码
      接口文档: /docs/notification-api.md
      超时配置: 5000ms
```

### 下游服务（调用本项目）
```yaml
服务列表:
  - order-service:
      调用接口: GET /api/users/:id
      用途: 获取订单归属用户信息
  
  - payment-service:
      调用接口: GET /api/users/:id/payment-methods
      用途: 获取用户支付方式
```

---

## 📁 关键目录结构

```
user-service/
├── src/
│   ├── controllers/     # 路由处理器
│   ├── models/          # Mongoose 模型
│   ├── middlewares/     # Express 中间件
│   ├── utils/           # 工具函数
│   ├── config/          # 配置文件
│   ├── types/           # TypeScript 类型定义
│   └── app.ts           # 应用入口
├── test/
│   ├── unit/            # 单元测试
│   └── integration/     # 集成测试
├── docs/                # 项目文档
└── scripts/             # 脚本文件
```

---

## 🚀 运行命令

```yaml
安装: pnpm install
开发: pnpm dev
构建: pnpm build
启动: pnpm start
测试: pnpm test
检查: pnpm lint
```

---

## ⚠️ 环境变量

```yaml
必需:
  - NODE_ENV: 运行环境 (development/staging/production)
  - PORT: 服务端口
  - MONGO_URI: MongoDB 连接字符串
  - REDIS_URI: Redis 连接字符串
  - JWT_SECRET: JWT 签名密钥

可选:
  - LOG_LEVEL: 日志级别 (默认: info)
  - RATE_LIMIT: 请求限流 (默认: 100/min)
```

---

## 📚 相关文档

> 注：以下文档为示例占位，实际项目中应创建对应文件

- 技术栈详情: `./TECH-STACK.md`
- 代码规范: `./CODE-STANDARDS.md`
- 测试规范: `./TESTING.md`
- 依赖版本: `./DEPENDENCIES-VERSION.md`

