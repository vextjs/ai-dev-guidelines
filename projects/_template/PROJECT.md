# [项目名] 项目规范

> **最后更新**: YYYY-MM-DD  
> **维护者**: [负责人]

---

## 📋 基本信息

| 项目 | 说明 |
|-----|------|
| 项目名称 | [项目名] |
| 项目描述 | [一句话描述] |
| 代码仓库 | [仓库地址] |
| 技术栈 | Node.js 18 + TypeScript + MongoDB |
| 框架 | [Eggjs / Express / Koa / NestJS] |

---

## 🏗️ 技术栈详情

### 核心依赖

| 分类 | 技术 | 版本 | 说明 |
|-----|------|------|------|
| 运行时 | Node.js | 18.x | LTS 版本 |
| 语言 | TypeScript | 5.x | - |
| 框架 | [框架名] | [版本] | - |
| 数据库 | MongoDB | 6.x | - |
| 缓存 | Redis | 7.x | 可选 |

### 开发依赖

| 工具 | 版本 | 用途 |
|-----|------|------|
| ESLint | 8.x | 代码检查 |
| Prettier | 3.x | 代码格式化 |
| [测试框架] | [版本] | 单元测试 |

---

## 📁 目录结构

```
project-root/
├── src/              # 源代码
│   ├── controllers/  # 控制器
│   ├── services/     # 服务层（如有）
│   ├── models/       # 数据模型
│   ├── utils/        # 工具函数
│   └── config/       # 配置文件
├── test/             # 测试文件
├── docs/             # 文档
├── scripts/          # 脚本
└── package.json
```

---

## 📝 代码规范

### 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 文件名 | kebab-case | `user-service.ts` |
| 变量 | camelCase | `userName` |
| 常量 | UPPER_SNAKE_CASE | `MAX_RETRY` |
| 类名 | PascalCase | `UserService` |
| 函数 | camelCase | `getUserById` |

### 注释规范

- 语言: 中文 / 英文
- 公共函数必须有 JSDoc 注释
- 复杂逻辑需要行内注释

### 测试规范

| 项目 | 规范 |
|-----|------|
| 测试框架 | [Mocha / Jest / Vitest] |
| 断言库 | [Chai / expect] |
| 测试目录 | `test/` |
| 命名规则 | `*.test.ts` 或 `*.spec.ts` |
| 覆盖率要求 | [如: 80%+] |

---

## ⚠️ 重要约定

### 强制规则（必须遵守）

- [ ] [规则1: 如 "禁止直接操作数据库，必须通过 Model"]
- [ ] [规则2: 如 "所有 API 必须有参数校验"]
- [ ] [规则3: 如 "敏感数据禁止明文存储"]

### 推荐实践

- 💡 [建议1]
- 💡 [建议2]

### 禁止事项

- ❌ [禁止项1]
- ❌ [禁止项2]

---

## 🔧 开发指南

### 环境搭建

```bash
# 安装依赖
npm install

# 启动开发
npm run dev

# 运行测试
npm test
```

### 常用命令

| 命令 | 说明 |
|-----|------|
| `npm run dev` | 启动开发服务 |
| `npm run build` | 构建生产版本 |
| `npm test` | 运行测试 |
| `npm run lint` | 代码检查 |

---

## 📎 相关文档

- [API 文档](./API.md) - 如有
- [部署文档](./DEPLOYMENT.md) - 如有
- [变更日志](./CHANGELOG.md) - 如有

---

**注意**: 此文件为项目规范模板，请根据实际项目情况修改

