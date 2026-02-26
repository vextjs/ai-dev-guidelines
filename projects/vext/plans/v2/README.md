# vext 框架方案 v2

> **项目**: vext
> **日期**: 2026-02-25
> **状态**: 📝 草稿（待确认）
> **基于**: v1 方案完整继承 + 核心架构重构

---

## 背景与目标

在 v1 方案基础上，v2 解决以下核心问题：

1. **底层框架可替换**：现阶段基于 Hono，后期可完全重构为其他框架，业务代码不受影响
2. **插件系统**：第三方/内部模块以统一方式扩展框架能力
3. **请求上下文传递**：`requestId`/当前用户等请求级信息自动贯穿全链路
4. **TypeScript 类型安全**：services/schemas 注入时有完整类型提示

---

## 方案拆分索引

| 文件 | 内容 |
|------|------|
| [01-architecture.md](./01-architecture.md) | 整体架构 & Adapter 设计 & 包结构 |
| [02-context.md](./02-context.md) | VextContext 抽象 & 请求上下文传递（AsyncLocalStorage） |
| [03-routing.md](./03-routing.md) | 文件路由 & defineRoutes & 三段式声明（与 v1 对比） |
| [04-plugin.md](./04-plugin.md) | 插件系统 definePlugin & 生命周期 |
| [05-middleware.md](./05-middleware.md) | 全局/路由级中间件 & 响应格式 & 错误处理 |
| [06-services-schemas.md](./06-services-schemas.md) | services/schemas 自动注入 & 类型安全 |
| [07-database.md](./07-database.md) | 多数据库连接池（继承 v1，无结构变化） |
| [08-config-and-dev.md](./08-config-and-dev.md) | 配置管理 & 应用组装 & 开发工具链 |

---

## v1 → v2 核心变化速览

| 维度 | v1 | v2 |
|------|----|----|
| 底层绑定 | 直接依赖 Hono API（`c.json()`/`c.req.param()` 等） | 通过 Adapter 隔离，业务代码只用 VextContext |
| 路由 handler 参数 | Hono 原生 `c: Context` | `ctx: VextContext`（框架无关） |
| 插件系统 | ❌ 无 | ✅ definePlugin（onStart/onStop/扩展 ctx） |
| 请求上下文 | ❌ 手动透传 | ✅ AsyncLocalStorage 自动传递 |
| services 类型 | `any` | ✅ 泛型推导，完整类型提示 |
| 包结构 | 单包 | 单包 + adapter 作为配置项传入 |
| 底层框架替换 | ❌ 需改业务代码 | ✅ 只换 adapter，业务代码零修改 |

