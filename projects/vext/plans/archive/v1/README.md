# Hono App 架构方案

> **项目**: hono-app
> **日期**: 2026-02-25
> **状态**: 📝 草稿（待确认）

---

## 背景

基于 Hono 框架构建一套模块化的 Node.js 服务框架，核心目标：

- 文件路径即路由前缀，文件内注册子路径，两段拼接为最终路由
- 路由采用 `path, options, handler` 三段式声明（类似 hapi），支持中间件、校验、元信息配置
- 三层分离：`routes`（HTTP 层）→ `services`（业务层）→ `models`（数据层）
- 启动时自动扫描 services/schemas，构建为嵌套对象注入，路由文件用 `services.api.users` 点号访问
- `models` 按数据库类型 / 连接名分目录，支持同类型多连接池
- 中间件支持全局自动注册与路由级数组配置
- 路由 meta 元信息（description/tags/roles），可用于文档生成和权限控制
- TypeScript 全量类型安全，配置启动时 fail-fast
- 开发热重载，配置变更自动重启
- 优雅关闭，所有数据库连接统一释放

---

## 方案拆分索引

| 文件 | 内容 |
|------|------|
| [01-directory-structure.md](./01-directory-structure.md) | 完整目录结构 & 分层职责 |
| [02-routing.md](./02-routing.md) | 文件路由加载机制 & defineRoutes 实现 |
| [03-middleware.md](./03-middleware.md) | 全局中间件 & 路由级中间件 & 响应格式 & 错误处理 |
| [04-database.md](./04-database.md) | 多数据库连接池管理 & models 层设计 |
| [05-config-and-dev.md](./05-config-and-dev.md) | 配置管理 & 开发工具链 & 依赖清单 |

---

## 关于 Hono 原生 API 说明

Hono 是基于 Web Standards 构建的框架，其 API 设计与 Express/Koa 不同：

| 概念 | Express/Koa | Hono |
|------|-------------|------|
| 响应 JSON | `res.json(data)` | `c.json(data)` |
| 响应文本 | `res.send(text)` | `c.text(text)` |
| 获取参数 | `req.params.id` | `c.req.param('id')` |
| 获取 query | `req.query.page` | `c.req.query('page')` |
| 获取 body | `req.body` | `await c.req.json()` |
| 设置状态码 | `res.status(201).json()` | `c.json(data, 201)` |

> `c` 是 Hono 的 `Context` 对象，是 Hono 框架设计决定的标准写法。本方案中所有路由回调均使用 `c` 参数。

