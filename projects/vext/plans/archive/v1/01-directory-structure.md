# 01 - 目录结构 & 分层职责

## 完整目录结构

```
hono-app/
├── src/
│   ├── routes/                       # 文件路径 = 路由挂载前缀
│   │   ├── api/                      # 对外 REST API
│   │   │   ├── users.ts              →  /api/users/*
│   │   │   └── posts.ts              →  /api/posts/*
│   │   └── admin/                    # 后台管理（可挂载独立鉴权）
│   │       └── users.ts              →  /admin/users/*
│   │
│   ├── services/                     # 与 routes 目录结构对应
│   │   ├── api/
│   │   │   ├── users.ts              ←  对应 routes/api/users.ts
│   │   │   └── posts.ts              ←  对应 routes/api/posts.ts
│   │   └── admin/
│   │       └── users.ts              ←  对应 routes/admin/users.ts
│   │
│   ├── models/                       # 三层：数据库类型 / 连接名 / 模型文件
│   │   ├── mysql/
│   │   │   ├── main/                 ← MYSQL_MAIN_*
│   │   │   │   ├── users.ts
│   │   │   │   └── posts.ts
│   │   │   └── orders/               ← MYSQL_ORDERS_*
│   │   │       ├── orders.ts
│   │   │       └── order-items.ts
│   │   ├── redis/
│   │   │   ├── default/              ← REDIS_DEFAULT_URL
│   │   │   │   └── session.ts
│   │   │   └── cache/                ← REDIS_CACHE_URL
│   │   │       └── cache.ts
│   │   └── mongo/
│   │       ├── main/                 ← MONGO_MAIN_URL
│   │       │   ├── users.ts
│   │       │   └── articles.ts
│   │       └── logs/                 ← MONGO_LOGS_URL
│   │           └── access-log.ts
│   │
│   ├── schemas/                      # Zod schema（按模块集中管理）
│   │   ├── users.ts
│   │   └── posts.ts
│   │
│   ├── middlewares/
│   │   ├── global/                   # 按文件名数字前缀排序自动注册
│   │   │   ├── 01.logger.ts
│   │   │   ├── 02.cors.ts
│   │   │   ├── 03.error.ts           # 错误兜底
│   │   │   └── 04.response-transform.ts  # 出口统一包装响应格式
│   │   ├── auth.ts                   # 路由级：注册为 'auth'
│   │   └── rate-limit.ts             # 路由级：工厂函数，注册为 'rateLimit'
│   │
│   ├── lib/
│   │   ├── db/                       # 各数据库连接（详见 04-database.md）
│   │   │   ├── registry.ts
│   │   │   ├── mysql.ts
│   │   │   ├── redis.ts
│   │   │   └── mongo.ts
│   │   ├── singleton.ts              # 通用单例工厂
│   │   ├── router-loader.ts          # 文件路由扫描加载器
│   │   ├── context-loader.ts         # 启动时扫描 services/schemas 构建全量 map
│   │   ├── define-routes.ts          # 路由定义工厂
│   │   └── errors.ts                 # AppError 统一错误类
│   │
│   ├── config/
│   │   ├── index.ts                  # zod 解析 .env，启动 fail-fast
│   │   └── watcher.ts                # 监听配置文件变更 → 触发重启
│   │
│   ├── types/
│   │   └── index.ts                  # 全局类型 & Hono AppEnv 扩展
│   │
│   ├── app.ts                        # 组装入口
│   └── server.ts                     # HTTP Server 启动
│
├── .env
├── .env.example
├── nodemon.json
├── tsconfig.json
└── package.json
```

---

## 分层职责

| 层 | 目录 | 做什么 | 不做什么 |
|---|------|--------|---------|
| HTTP 层 | `routes/` | 配置中间件、声明校验、调用 service、返回响应 | 不含业务规则，不操作数据库 |
| 业务层 | `services/` | 业务规则、跨 model/数据库组合、事务编排（class 封装导出单例） | 不处理 HTTP 细节 |
| 数据层 | `models/` | 数据库 CRUD 封装，按 `<db类型>/<连接名>/<表>.ts` 三层组织 | 不含业务判断 |
| 校验层 | `schemas/` | Zod schema 集中管理，导出 schema + TypeScript 类型 | 不含业务逻辑 |
| 中间件 | `middlewares/` | 全局横切关注点（日志、鉴权、错误、响应格式） | 不含业务逻辑 |
| 框架核心 | `lib/` | 路由加载、自动注入、数据库连接管理、错误类 | 不含业务逻辑 |

---

## 关键约定

1. **`services/` 与 `routes/` 目录结构一一对应**：`routes/api/users.ts` → `services/api/users.ts`
2. **`models/` 三层结构即使只有一个连接也不省略**：避免后期加第二个连接时批量改 import 路径
3. **`schemas/` 按业务模块命名**，不按 routes 路径，因为 schema 可跨多个 route 复用
4. **全局中间件按文件名数字前缀排序**：`01.xxx.ts` 先于 `02.xxx.ts` 注册

---

## 注意事项

- **路由文件命名 = 路径段**：文件名即 URL path，不支持 `[param]` 动态文件名，动态参数在文件内用 `app.get('/:id')` 实现
- **`index.ts` 处理**：`routes/api/users/index.ts` 等价于 `routes/api/users.ts`，前缀均为 `/api/users`
- **`admin/` 路由**：与 `api/` 共用同一套加载机制，`app.ts` 中对 `/admin/*` 统一挂载鉴权中间件
- **后期可升级为模块化聚合**：`routes/api/users.ts` + `services/api/users.ts` + `models/mysql/main/users.ts` → `modules/users/` 目录

