# permia 技术方案

> **项目**: permia
> **日期**: 2026-03-04
> **版本**: v2.5
> **状态**: 📝 草稿（待 CP2 确认）
> **关联**: [← 需求定义](../01-需求定义.md) | [→ 实施方案（待建）](../03-实施方案/README.md)
> **说明**: 本目录为技术方案，具体代码实现引用实施方案文件

---

## 变更记录

| 版本 | 日期 | 变更说明 |
|------|------|---------|
| v2.5 | 2026-03-04 | 🔴 修复 `matchResource('*:*', ...)` 返回 false 的 P0 Bug（wildcard.ts 接口分支条件改为 fallback）；tsup 构建配置改为数组分别输出 `dist/esm/` + `dist/cjs/`（对齐 package.json exports）；Express 示例增加认证中间件顺序 + 公共接口白名单；数据格式示例 admin 继承方向修正；API 示例补充字段级规则配置前提；资源路径模型增加 `*:/api/users/*` 踩坑标注；需求定义功能表补充用户↔角色多对多说明 |
| v2.4 | 2026-03-04 | README 重大改版：增加设计理念、鉴权流程图、架构分层图、接入指南、决策表、阅读指南；修复构建工具描述（统一为 tsup + tsc）；明确 monsqlize 为首选外部适配器 |
| v2.3 | 2026-03-04 | 项目改为 TypeScript 主体（ESM + CJS 双格式构建）；增加权限控制边界声明；增加 action 设计理据与 MongoDB 映射表；修复 write 双向语义；增加 db 权限完整使用流程示例；`lib/` → `src/`、移除独立 `types/`、Node.js >= 18 |
| v2.2 | 2026-03-04 | 深度分析修复：统一默认适配器为 FileAdapter、新增 NOT_INITIALIZED 错误码、明确 write 语义、标注 getResources 限制、strict=false 标记 experimental |
| v2.1 | 2026-03-03 | 技术方案拆分为目录结构；各章节独立文件；实施方案占位 |
| v2.0 | 2026-03-03 | 单文件版：目录导航、持久化格式、API 示例、多框架接入、三轮验证修复 |
| v1.6 | 2026-03-03 | 两轮共六次验证修复（31 处） |
| v1.0~v1.5 | 2026-03-03 | 初稿 → 资源路径 → 模块设计 → FileAdapter → 验证修复 |

---

## 一、设计理念

permia 是一个通用 Node.js 细粒度 RBAC 权限管理库，框架无关，使用 TypeScript 编写。

| 原则 | 说明 |
|------|------|
| **零依赖** | 核心包无任何强依赖，`FileAdapter` 磁盘 JSON 持久化开箱即用 |
| **框架无关** | 不绑定 Express / Koa / Fastify / vext，通过中间件模式接入任何框架 |
| **数据库无关** | 不绑定 MongoDB / MySQL / PostgreSQL，应用层 CRUD 语义（`read/write/create/update/delete/invoke/*`） |
| **两类权限统一** | 接口级权限（`GET:/api/users`）和数据库级权限（`db:users:email`）共用同一套引擎 |
| **白名单默认拒绝** | 未明确 `allow` 的操作一律拒绝（`strict=true` 时 deny 无条件优先） |
| **存储可插拔** | `StorageAdapter` 抽象接口，内置 `FileAdapter` + `MemoryAdapter`，后期 `MonSQLizeAdapter`（独立包） |
| **TypeScript 优先** | 源码即类型，`tsc --declaration` 自动生成 `.d.ts`，消费者零配置获得完整类型提示 |

---

## 二、权限控制边界

> ⚠️ **使用 permia 前必须理解的核心概念**

### permia 是什么 / 不是什么

| permia 是什么 | permia 不是什么 |
|--------------|----------------|
| 应用层 RBAC 权限**判断**引擎 | ❌ 不是数据库代理 — 不自动拦截数据库操作 |
| 通用库（框架 / 数据库无关） | ❌ 不是 ORM 插件 — 不依赖 Mongoose / monSQLize |
| 接口权限：中间件自动拦截 | ❌ 不是 UI 组件库 — 不直接控制前端渲染 |
| db 权限：Service/DAO 层**主动调用** | ❌ 不是数据库原生 RBAC — 与 MongoDB 内置权限无关 |

### 两类权限的执行方式

| 权限类型 | 资源格式 | 执行位置 | 执行方式 | 是否自动 |
|---------|---------|---------|---------|:-------:|
| **接口权限** | `<METHOD>:<path>` | HTTP 中间件 | `assert(userId, 'invoke', resource)` | ✅ 自动 |
| **db 集合权限** | `db:<collection>` | Service / DAO 层 | `can(userId, 'read', 'db:articles')` | ❌ 手动 |
| **db 字段权限** | `db:<collection>:<field>` | Service / DAO 层 | `filterFields(userId, 'read', 'db:articles', data)` | ❌ 手动 |

> 💡 **关键理解**：permia **完整支持** db 权限判断（集合级 + 字段级），只是执行方式是在业务代码中主动调用，而非自动拦截。接口权限则通过中间件实现自动拦截。

---

## 三、鉴权完整流程

### 3.1 整体数据流

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            permia 权限控制全景                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐     ┌──────────────┐     ┌─────────────────────────────────┐  │
│  │ 管理后台 │ ──→ │ 权限配置阶段 │     │ 运行时鉴权阶段                   │  │
│  └─────────┘     │              │     │                                 │  │
│                  │ roles.create │     │  HTTP 请求                      │  │
│                  │ roles.allow  │     │    ↓                            │  │
│                  │ roles.deny   │     │  中间件: assert('invoke', ...)  │  │
│                  │ users.assign │     │    ↓ ← 接口权限（自动）          │  │
│                  │              │     │  路由处理器                      │  │
│                  │      ↓       │     │    ↓                            │  │
│                  │  ┌────────┐  │     │  Service 层                     │  │
│                  │  │ 存储层 │  │     │    ├ assert('read', 'db:...')   │  │
│                  │  │ (JSON) │←─┼─────┤    ├ can('update', 'db:...')    │  │
│                  │  └────────┘  │     │    └ filterFields(...)          │  │
│                  └──────────────┘     │      ↑ ← db 权限（手动）        │  │
│                                      │    ↓                            │  │
│                                      │  数据库操作                      │  │
│                                      │    ↓                            │  │
│                                      │  返回响应                        │  │
│                                      └─────────────────────────────────┘  │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │ 前端渲染                                                             │   │
│  │  登录 → getResources → JWT → matchResource → 菜单/按钮显隐          │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 单次鉴权内部流程

```
permia.can(userId, action, resource)
  │
  ├─ action === 'write' ?
  │   ├─ YES → 展开为 can('create') && can('update')  ← 请求侧 AND 语义
  │   └─ NO  → 进入 _canSingle()
  │
  ▼
_canSingle(userId, action, resource)
  │
  ├─ 查缓存 cache.get(userId)
  │   ├─ 命中 → 使用缓存的 rules
  │   └─ 未命中 ↓
  │
  ├─ storage.getUserRoles(userId)         → ['editor', 'viewer']
  ├─ resolver.resolveRoleChain(roleId)    → BFS 展开继承链
  ├─ resolver.mergeRules(roleIds)         → 合并 + 去重 + deny 前置
  ├─ cache.set(userId, rules)             → 写入缓存（TTL 5 分钟）
  │
  ▼
strict=true 模式（默认）:
  ├─ 遍历 deny 规则: matchRule(rule, action, resource) → 命中即 return false
  ├─ 遍历 allow 规则: matchRule(rule, action, resource) → 命中即 return true
  └─ 无命中 → return false（白名单默认拒绝）

matchRule(rule, action, resource):
  └─ matchAction(rule.action, action) && matchResource(rule.resource, resource)
      │
      ├─ matchAction('write', 'create') → true   ← 规则侧 OR 语义
      ├─ matchAction('write', 'delete') → false
      ├─ matchAction('*', 任意)         → true
      │
      └─ matchResource('*:/api/users/*', 'GET:/api/users/123') → true
         matchResource('*:*', 'GET:/api/users')                → true   ← 所有接口通配
         matchResource('db:users:*', 'db:users:email')         → true
         matchResource('*', 任意)                               → true

> ⚠️ `*:/api/users/*` 是**末段 `*` 通配**（按 `/` 分段，末段匹配剩余至少 1 段），不是前缀通配。
> 它匹配 `GET:/api/users/123` ✅，但**不匹配** `GET:/api/users` ❌（无剩余段）。
> 如需覆盖整个"用户管理"栏目，需同时配置 `*:/api/users` + `*:/api/users/*`。
> v1.0.0 不支持前缀通配（如 `*:/users*`），仅支持按 `/` 分段的末段 `*`。
```

### 3.3 完整接入流程（分步骤）

```
步骤 1 — 初始化
  const permia = new Permia();
  await permia.init();                    // 🔴 必须调用

步骤 2 — 配置角色体系
  await permia.roles.create('viewer',  { label: '只读用户' });
  await permia.roles.create('editor',  { label: '编辑', parent: 'viewer' });
  await permia.roles.create('admin',   { label: '管理员' });

步骤 3 — 配置权限规则
  // 接口权限
  await permia.roles.allow('viewer',  'invoke', 'GET:/api/articles');
  await permia.roles.allow('editor',  'invoke', 'POST:/api/articles');
  await permia.roles.allow('admin',   'invoke', '*:/api/*');
  // db 权限
  await permia.roles.allow('viewer',  'read',   'db:articles');
  await permia.roles.allow('editor',  'write',  'db:articles');        // write = create + update
  await permia.roles.allow('admin',   '*',      'db:*');
  // 黑名单
  await permia.roles.deny('admin',    'delete', 'db:users');

步骤 4 — 绑定用户
  await permia.users.assign('user-001', 'admin');
  await permia.users.assign('user-002', 'editor');                     // 自动继承 viewer

步骤 5 — 接口权限鉴权（HTTP 中间件 — 自动拦截）
  app.use(async (req, res, next) => {
    const resource = `${req.method}:${req.path}`;
    await permia.assert(req.userId, 'invoke', resource);               // 无权限抛 403
    next();
  });

步骤 6 — db 权限鉴权（Service 层 — 手动调用）
  async getArticle(userId, articleId) {
    await permia.assert(userId, 'read', 'db:articles');                // 集合级
    const article = await db.findOne(articleId);
    return permia.filterFields(userId, 'read', 'db:articles', article); // 字段级
  }

步骤 7 — 前端菜单/按钮（登录时拉取权限）
  const resources = await permia.getResources(userId, 'invoke');
  const token = jwt.sign({ userId, resources }, SECRET);
  // 前端: matchResource(pattern, 'DELETE:/api/users/123') → 按钮显隐

步骤 8 — 优雅关闭
  await permia.close();
```

---

## 四、架构分层

```
┌────────────────────────────────────────────────────────────────┐
│  公共 API 层  src/core/permia.ts                                │
│  init / close / can / cannot / assert / filterFields /          │
│  getPermissions / getResources / for(userId) / invalidate(All)  │
├────────────────────────────────────────────────────────────────┤
│  链式 API    src/core/context.ts    PermiaContext                │
├────────────────────────────────────────────────────────────────┤
│  鉴权引擎层  src/check/                                          │
│  checker.ts（主流程 + write AND 展开）                            │
│  resolver.ts（继承链 BFS + mergeRules 去重）                     │
│  wildcard.ts（通配符匹配 — 同时导出 permia/match 子路径）         │
├──────────────────────┬─────────────────────────────────────────┤
│  RBAC 层             │  错误层  src/core/errors.ts               │
│  src/rbac/           │  类型层  src/types/index.ts               │
│  role-manager.ts     │  工具层  src/utils/                       │
│  user-role.ts        │  constants / validation / merge           │
├──────────────────────┴─────────────────────────────────────────┤
│  缓存层  src/cache/permission-cache.ts                           │
│  TTL 缓存 + 单调时钟 performance.now() + invalidate / All        │
├────────────────────────────────────────────────────────────────┤
│  存储适配器层  src/storage/                                       │
│  adapter.ts（抽象基类 — 用户可自定义实现）                         │
│  file-adapter.ts（默认 — 磁盘 JSON，debounce 写盘 + 并发锁）     │
│  memory-adapter.ts（开发/测试 — 内存存储，no-op init/close）      │
│                                                                  │
│  🔮 后期独立包:                                                   │
│  permia-monsqlize-adapter（首选外部适配器 — 基于 monSQLize ORM）  │
└────────────────────────────────────────────────────────────────┘
```

---

## 五、核心写法预览

### 权限判断

```typescript
import { Permia } from 'permia';

const permia = new Permia();
await permia.init();                    // 🔴 必须调用，否则抛 NOT_INITIALIZED

// 鉴权
const ok = await permia.can('user-002', 'read', 'db:articles');     // → true
await permia.assert('user-003', 'delete', 'db:users');               // → 抛 PermiaError

// 字段过滤
const safe = await permia.filterFields('user-002', 'read', 'db:users', record);
// → { name: 'Alice', avatar: '/img/alice.png' }  — 仅包含有权字段

// 链式 API
const ctx = permia.for('user-002');
await ctx.can('invoke', 'GET:/api/articles');
await ctx.filterFields('read', 'db:users', record);
```

### 前端匹配（轻量子路径）

```typescript
import { matchResource } from 'permia/match';   // 仅打入纯 JS 匹配逻辑，无 Node.js 依赖

const resources = ['*:/api/users/*', 'GET:/api/articles'];
const canDelete = resources.some(p => matchResource(p, 'DELETE:/api/users/123'));  // → true
```

---

## 六、决策表

| # | 问题 | 确认结论 |
|---|------|---------|
| Q1 | 默认存储适配器 | ✅ `FileAdapter`（磁盘 JSON 持久化），零依赖开箱即用 |
| Q2 | 首选外部存储 | ✅ `permia-monsqlize-adapter`（独立包，基于 monSQLize ORM，适合多实例部署） |
| Q3 | db 权限支持方式 | ✅ 完整支持，在 Service/DAO 层手动调用 `can()` / `filterFields()`，不自动拦截 |
| Q4 | action 体系 | ✅ 应用层 CRUD 语义（`read/write/create/update/delete/invoke/*`），不绑定 MongoDB 原生 action |
| Q5 | `write` 语义 | ✅ 双向语义 — 规则侧 OR（`write` 包含 `create` 和 `update`），请求侧 AND（`can('write')` = `can('create') && can('update')`） |
| Q6 | 优先级模式 | ✅ `strict=true`（默认）deny 无条件优先；`strict=false` 标记为 experimental |
| Q7 | 初始化保护 | ✅ 所有公共 API 检查 `_initialized`，未调用 `init()` 抛 `NOT_INITIALIZED` |
| Q8 | 缓存策略 | ✅ TTL 缓存 + `performance.now()` 单调时钟 + 规则变更触发 `invalidateAll()` |
| Q9 | 继承模型 | ✅ v1.0.0 单继承（`parent: string \| null`），v2.0 考虑多继承 / 角色组 |
| Q10 | 构建工具 | ✅ `tsup`（基于 esbuild，快速构建 ESM + CJS 双格式）+ `tsc --noEmit`（类型检查） |
| Q11 | Node.js 版本 | ✅ `>= 18.0.0`（Node 16 已 EOL） |
| Q12 | TypeScript 版本 | ✅ `^5.4`，`strict: true` |
| Q13 | 测试框架 | ✅ `vitest ^3`（原生 TS 支持，零配置） |
| Q14 | 前端打包 | ✅ `permia/match` 子路径导出，仅包含纯 JS 匹配逻辑 |
| Q15 | `filterFields` 签名 | ✅ `filterFields(userId, action, resource, data)` — action 为第二个必填参数，与 `can()` 一致 |

---

## 七、阅读指南

> 💡 **如果你是第一次阅读本方案**，建议按以下顺序：

### 快速理解（10 分钟）

1. **本文件** — 阅读 §一 设计理念 + §二 权限边界 + §三 鉴权流程 + §五 核心写法预览
2. **[04-API示例.md](./04-API示例.md)** — 看完整代码示例，直观理解 API 用法

### 深入细节（30 分钟）

3. **[01-资源路径模型.md](./01-资源路径模型.md)** — 资源路径格式、通配符规则、action 设计理据
4. **[03-API设计.md](./03-API设计.md)** — 完整 API 签名、参数说明、链式 API
5. **[02-数据格式.md](./02-数据格式.md)** — 持久化 JSON 结构

### 实现层面（按需）

6. **[05-引擎与存储设计.md](./05-引擎与存储设计.md)** — 鉴权引擎、存储适配器、缓存、错误体系的代码级设计
7. **[06-跨框架接入.md](./06-跨框架接入.md)** — Express / Koa / vext 接入示例 + db 权限 Service 层完整示例 + 前端菜单/按钮
8. **[07-实施规划.md](./07-实施规划.md)** — 文件清单、依赖、构建配置、实施批次、注意事项

---

## 八、文档目录

| 文件 | 内容 | 关注重点 |
|------|------|---------|
| [01-资源路径模型.md](./01-资源路径模型.md) | 资源格式规范、通配符规则、两种优先级区分、action 设计理据、核心数据结构 | 资源路径怎么写、action 怎么选 |
| [02-数据格式.md](./02-数据格式.md) | FileAdapter 持久化 JSON 格式、完整数据示例、数据量估算 | `permia-data.json` 长什么样 |
| [03-API设计.md](./03-API设计.md) | 生命周期、模块架构、主类 + 链式 + 角色管理 + 用户绑定完整 API | 所有 API 签名和参数 |
| [04-API示例.md](./04-API示例.md) | 初始化 → 鉴权 → 权限查询 → 字段过滤 → write 双向语义 → db 权限示例 | 代码怎么写 |
| [05-引擎与存储设计.md](./05-引擎与存储设计.md) | 鉴权引擎、存储适配器、缓存层、错误体系、工具模块 | 实现者关注 |
| [06-跨框架接入.md](./06-跨框架接入.md) | Express / Koa / vext 接入、db 权限 Service 层示例、前端判断、接入决策指南 | 怎么接入我的项目 |
| [07-实施规划.md](./07-实施规划.md) | 文件清单、影响范围、构建配置、实施批次、注意事项 29 条 | 工程执行计划 |

---

## 九、存储适配器策略

| 适配器 | 包 | 默认 | 持久化 | 多进程 | 适用场景 |
|--------|-----|:---:|:------:|:------:|---------|
| `FileAdapter` | 内置 | ✅ | 磁盘 JSON | ❌ | 单实例生产（零依赖开箱即用） |
| `MemoryAdapter` | 内置 | — | ❌ | — | 开发/测试（进程重启数据清空） |
| `MonSQLizeAdapter` | `permia-monsqlize-adapter`（独立包，后期） | — | MongoDB | ✅ | 多实例部署（🔮 **首选外部适配器**） |
| 自定义 | 用户实现 `StorageAdapter` 接口 | — | 自定义 | 自定义 | 任意存储后端 |

> ⚠️ **FileAdapter 生产注意**：容器化部署需挂载数据卷；Serverless 环境不适用；多进程部署（PM2 cluster）各进程独立副本，需改用 `MonSQLizeAdapter`。
>
> 🔮 **后期首选**：`permia-monsqlize-adapter` 基于 [monSQLize](https://github.com/AkiraBit/monSQLize) ORM，支持 MongoDB 持久化 + 多实例部署，是生产环境多进程场景的首选方案。

---

## 十、核心目标速览

### 支持的资源权限类型

| 资源类型 | 格式 | 示例 | 关联 action |
|---------|------|------|------------|
| 数据库集合级 | `db:<collection>` | `db:users` | `read / write / create / update / delete / *` |
| 数据库字段级 | `db:<collection>:<field>` | `db:users:email` | `read / write / create / update / delete / *` |
| HTTP 接口级 | `<METHOD>:<path>` | `GET:/api/users` | `invoke / *` |
| 全局通配 | `*` | `*` | `*` |

### 核心设计要点

1. **TypeScript 源码** — `src/*.ts` 编写，`tsc --declaration` 自动生成 `.d.ts`，无需独立 `types/` 目录
2. **ESM + CJS 双格式** — `tsup` 构建 `dist/esm/` + `dist/cjs/`，`package.json` exports 配置双入口
3. 默认 **FileAdapter（磁盘 JSON）** 持久化，零依赖；后期 **MonSQLizeAdapter** 为首选外部适配器
4. 接口权限对应真实 HTTP `METHOD:/path`（METHOD 大写，与 `req.method` 一致）
5. **db 权限** 完整支持 — 在 Service/DAO 层主动调用 `can()` 和 `filterFields()`
6. `getPermissions` / `getResources` 返回完整权限集供跨框架接入
7. 所有公共 API 入口含 `init()` 初始化保护（未调用抛 `NOT_INITIALIZED`）
8. `write` action = `create + update` 快捷方式（含双向语义）
9. action 设计基于通用 CRUD 语义，不绑定特定数据库 — 详见 [资源路径模型 §四](./01-资源路径模型.md)
10. `permia/match` 子路径导出 — 前端场景推荐，避免打入 Node.js 专属代码