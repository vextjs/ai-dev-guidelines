# 项目概况

> 项目的基本信息、依赖关系和环境配置

---

## 📋 基本信息

```yaml
项目名称: <project-name>
项目描述: <简短描述项目功能>
仓库地址: https://github.com/<org>/<repo>
创建时间: YYYY-MM-DD
主要负责人: @username
技术栈: Node.js + Express + MongoDB + TypeScript
```

---

## 🔴 MCP 配置（如使用 MCP 必填）

```yaml
# 配置 AI 助手可使用的 MCP 服务器

允许的 MCP 服务器: <服务器名称，如 mongodb-user>
数据库: <数据库名称>
用途: 测试数据查询和分析
限制:
  - 只读权限
  - 禁止删除操作
  - 禁止修改生产数据

# AI 助手必须先读取此配置才能调用 MCP 服务器
# 未配置则禁止调用任何 MCP
```

---

## ❌ 禁止项（必须 100% 遵守）

### 架构禁止项

```yaml
# 列出项目不允许的架构模式

1. 禁止 Service 层:
   原因: [说明原因]
   替代方案: Controller + Utils 模式
   
2. 禁止 DTO 类:
   原因: [说明原因]
   替代方案: Joi schema 验证

3. 禁止 Repository 层:
   原因: [说明原因]
   替代方案: 统一数据访问层
```

### 依赖禁止项

```yaml
# 列出禁止使用的依赖

禁止的依赖:
  - class-validator: 使用 Joi 替代
  - moment.js: 使用 dayjs 替代
  - lodash: 使用原生方法
```

### 代码禁止项

```yaml
# 列出禁止的代码模式

禁止:
  - 直接使用 console.log（使用 logger）
  - 硬编码配置值（使用环境变量）
  - 同步 I/O 操作（使用 async/await）
```

---

## 🔗 依赖服务

### 上游服务（本项目调用）
```yaml
服务列表:
  - auth-service:
      用途: 用户认证
      接口文档: https://docs.example.com/auth-service
      联系人: @auth-team
  
  - config-service:
      用途: 配置管理
      接口文档: https://docs.example.com/config-service
      联系人: @config-team
```

### 下游服务（调用本项目）
```yaml
服务列表:
  - order-service: 订单处理
  - notification-service: 通知推送
```

### 外部依赖
```yaml
第三方服务:
  - MongoDB Atlas: 数据库
  - Redis Cloud: 缓存
  - AWS S3: 文件存储
  - SendGrid: 邮件服务
```

---

## 🌍 环境清单

### 开发环境
```yaml
访问地址: http://localhost:3000
数据库: mongodb://localhost:27017/myapp-dev
Redis: localhost:6379
环境变量: .env.development
日志级别: debug
```

### 测试环境
```yaml
访问地址: https://test-api.example.com
数据库: mongodb+srv://test-cluster.mongodb.net/myapp-test
Redis: redis-test.example.com:6379
环境变量: .env.test
日志级别: info
监控: https://monitoring.example.com/test
```

### 生产环境
```yaml
访问地址: https://api.example.com
数据库: mongodb+srv://prod-cluster.mongodb.net/myapp-prod
Redis: redis-prod.example.com:6379
环境变量: .env.production
日志级别: warn
监控: https://monitoring.example.com/prod
告警: PagerDuty
```

---

## 📊 项目规模

```yaml
代码统计:
  - 总行数: ~50,000 行
  - 源文件: ~200 个
  - 测试文件: ~150 个
  - 测试覆盖率: 85%

性能指标:
  - QPS: 1000 req/s
  - 平均响应时间: 50ms
  - P99 响应时间: 200ms

用户规模:
  - 日活用户: 100,000
  - 月活用户: 500,000
  - 峰值 QPS: 5000 req/s
```

---

## 🚀 快速开始

### 本地开发
```bash
# 克隆代码
git clone https://github.com/<org>/<repo>.git
cd <repo>

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.development

# 启动数据库（Docker）
docker-compose up -d

# 启动开发服务器
npm run dev
```

### 运行测试
```bash
# 单元测试
npm test

# 集成测试
npm run test:integration

# E2E 测试
npm run test:e2e

# 测试覆盖率
npm run test:coverage
```

---

## 📞 联系方式

```yaml
团队:
  - 技术负责人: @tech-lead
  - 后端负责人: @backend-lead
  - 前端负责人: @frontend-lead
  - 测试负责人: @qa-lead

沟通渠道:
  - Slack: #project-name
  - 邮件: team@example.com
  - 文档: https://wiki.example.com/project-name
```

---

## 📝 变更历史

### v2.0.0 (2026-01-15)
- 升级到 Node.js 20
- 迁移到 TypeScript 5.0
- 重构认证模块

### v1.5.0 (2025-11-20)
- 添加限流功能
- 优化数据库查询性能

### v1.0.0 (2025-06-01)
- 初始版本发布

---

## 🎯 AI 使用说明

### AI 必读字段
```yaml
必须读取:
  - 项目名称和描述
  - 依赖服务列表
  - 技术栈
  - 环境清单

可选读取:
  - 项目规模
  - 变更历史
```

### AI 应用场景
```yaml
场景 1: 开发新功能
  - 读取依赖服务列表，了解可用的上游服务
  - 读取技术栈，选择兼容的技术方案

场景 2: 修复 Bug
  - 读取环境清单，确定在哪个环境复现
  - 读取监控地址，查看错误日志

场景 3: 性能优化
  - 读取性能指标，了解当前基线
  - 读取项目规模，评估优化收益
```

---

**模板说明**: 这是项目规范模板，复制到具体项目目录后填充真实内容
