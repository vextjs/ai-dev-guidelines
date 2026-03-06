# Phase 4 — 路由注册 + 集成

> **所属阶段**: Phase 4（路由注册 + 集成）
> **操作**: 新建 2 个文件 + 修改 2 个文件
> **依赖**: Phase 2（Open Controller 就绪）+ Phase 3（Home Controller 就绪）
> **关联**: [README.md](./README.md) → §3.5 / §4 Phase 4

---

## 说明

Phase 4 完成路由注册，将 Controller 方法绑定到具体的 HTTP 路径，并修改 `open/index.ts` 和 `home/index.ts` 引入 Blog 路由模块。

**设计要点**：

- 使用 `egg-router-group` 的 `groupRouter.group()` 嵌套分组，与项目现有路由文件（如 `trip_project.ts`、`article.ts`）保持一致
- 🔴 **路由注册顺序关键**：在 `app/routes/home/blog.ts` 中，管理端分组（`/blog/admin`，`dbToken` 中间件）必须**先于**用户端分组（`/blog`，`userAuth` 中间件）注册，避免 `/home/blog/admin/list` 中的 `admin` 被 `/home/blog/:blogId` 的 `:blogId` 匹配
- Open 路由无鉴权中间件，走 `/open` 路由组统一的 `openRequestValid` 中间件
- Home 路由的鉴权中间件（`userAuth` / `dbToken`）在 `blog.ts` 路由文件内部挂载，而非在 `index.ts` 路由组级别挂载
- Blog 路由在 `home/index.ts` 中注册到**第一个** `router.group` 回调中（无鉴权中间件的块），由 `blog.ts` 内部自行管理鉴权

**文件清单**：

| # | 文件路径 | 操作 |
|:-:|---------|:----:|
| 1 | `app/routes/open/blog.ts` | **新建** |
| 2 | `app/routes/home/blog.ts` | **新建** |
| 3 | `app/routes/open/index.ts` | **修改** |
| 4 | `app/routes/home/index.ts` | **修改** |

---

## 文件 1：`app/routes/open/blog.ts`（新建）

### 路由表

| HTTP | 路径 | Controller 方法 | 中间件 | 说明 |
|:----:|------|----------------|:------:|------|
| GET | `/open/blog` | `open/BlogController.index` | 无 | 文章列表（游标分页） |
| GET | `/open/blog/:blogId` | `open/BlogController.detail` | 无 | 文章详情 |

### 完整代码

```typescript
// app/routes/open/blog.ts

import { Application } from 'egg';
import { RouterGroup } from 'egg-router-group';

export default (app: Application, groupRouter: RouterGroup) => {
    const { controller } = app;

    groupRouter.group({
        name: 'blog',
        prefix: '/blog',
        middlewares: [],
    }, (sub: RouterGroup) => {
        const ctrl = controller.open.blogController;

        // GET /open/blog — 文章列表（游标分页，公开，无需鉴权）
        sub.get('/', ctrl.index);

        // GET /open/blog/:blogId — 文章详情（公开，无需鉴权）
        sub.get('/:blogId', ctrl.detail);
    });
};
```

### 设计说明

- 路由组前缀 `/blog`，挂载在 `/open` 路由组下，最终路径为 `/open/blog` 和 `/open/blog/:blogId`
- 无额外中间件（`middlewares: []`），走 open 路由组统一的 `openRequestValid` 中间件
- 与项目现有 `open/trip_project.ts` 模式完全一致

---

## 文件 2：`app/routes/home/blog.ts`（新建）

### 路由表

**管理端分组**（先注册）：

| HTTP | 路径 | Controller 方法 | 中间件 | 说明 |
|:----:|------|----------------|:------:|------|
| GET | `/home/blog/admin/list` | `home/BlogAdminController.index` | `dbToken` | 管理员文章列表 |
| PUT | `/home/blog/admin/:blogId/status` | `home/BlogAdminController.updateStatus` | `dbToken` | 管理员上下架 |

**用户端分组**（后注册）：

| HTTP | 路径 | Controller 方法 | 中间件 | 说明 |
|:----:|------|----------------|:------:|------|
| POST | `/home/blog` | `home/BlogController.create` | `userAuth basic` | 创建文章 |
| PUT | `/home/blog/:blogId` | `home/BlogController.update` | `userAuth basic` | 更新文章 |
| DELETE | `/home/blog/:blogId` | `home/BlogController.delete` | `userAuth basic` | 软删除文章 |

### 完整代码

```typescript
// app/routes/home/blog.ts

import { Application } from 'egg';
import { RouterGroup } from 'egg-router-group';

export default (app: Application, groupRouter: RouterGroup) => {
    const { controller, middleware } = app;

    // ================================================================
    // 🔴 管理端分组（先注册 — 避免 /blog/admin/list 被 /blog/:blogId 匹配）
    // ================================================================
    const dbToken = middleware.dbToken();

    groupRouter.group({
        name: 'blog_admin',
        prefix: '/blog/admin',
        middlewares: [dbToken],
    }, (sub: RouterGroup) => {
        const ctrl = controller.home.blogAdminController;

        // GET /home/blog/admin/list — 管理员文章列表（游标分页，全量数据）
        sub.get('/list', ctrl.index);

        // PUT /home/blog/admin/:blogId/status — 管理员强制上下架
        sub.put('/:blogId/status', ctrl.updateStatus);
    });

    // ================================================================
    // 用户端分组（后注册 — :blogId 动态路由不会截获 /admin/* 路径）
    // ================================================================
    const userAuth = middleware.userAuth({ level: 'basic' });

    const jwtType = app.config.custom.jwt.types.find((item: any) => {
        return item.name === 'user_login_token';
    });
    if (!jwtType) {
        throw new Error('config.custom.jwt config error');
    }
    const userJwt = middleware.jwt({
        property: jwtType.property,
        secret: app.config.custom.jwt.public_key,
    });

    const singleLogin = middleware.singleLogin({
        valid_entity: 'user',
    });

    groupRouter.group({
        name: 'blog_user',
        prefix: '/blog',
        middlewares: [userJwt, singleLogin],
    }, (sub: RouterGroup) => {
        const ctrl = controller.home.blogController;

        // POST /home/blog — 创建文章
        sub.post('/', ctrl.create);

        // PUT /home/blog/:blogId — 更新文章（仅作者）
        sub.put('/:blogId', ctrl.update);

        // DELETE /home/blog/:blogId — 软删除文章（仅作者）
        sub.delete('/:blogId', ctrl.delete);
    });
};
```

### 🔴 路由冲突与注册顺序说明

**问题**：`/home/blog/:blogId` 是动态路由，`:blogId` 会匹配任意字符串。如果用户端分组先注册，当请求 `GET /home/blog/admin/list` 时，`admin` 会被 `:blogId` 捕获，导致路由错误。

**解决方案（方案 A — 已确认）**：管理端分组（`/blog/admin`）**先于**用户端分组（`/blog`）注册。

**验证方式**：
1. 启动服务后请求 `GET /home/blog/admin/list`（携带 dbToken）→ 应返回管理列表数据
2. 请求 `PUT /home/blog/admin/65f1a2b3c4d5e6f7a8b9c0d1/status` → 应匹配管理端路由
3. 请求 `GET /home/blog/65f1a2b3c4d5e6f7a8b9c0d1` → 应**不**匹配任何已注册路由（用户端无 GET 详情路由，详情走 `/open/blog/:blogId`）

```
注册顺序示意：

router.group('/home', () => {
    // ✅ 第 1 个注册：管理端（/home/blog/admin/*）
    groupRouter.group({ prefix: '/blog/admin', middlewares: [dbToken] }, (sub) => {
        sub.get('/list', ...)           // → /home/blog/admin/list
        sub.put('/:blogId/status', ...) // → /home/blog/admin/:blogId/status
    });

    // ✅ 第 2 个注册：用户端（/home/blog/*）
    groupRouter.group({ prefix: '/blog', middlewares: [userJwt, singleLogin] }, (sub) => {
        sub.post('/', ...)              // → /home/blog
        sub.put('/:blogId', ...)        // → /home/blog/:blogId
        sub.delete('/:blogId', ...)     // → /home/blog/:blogId
    });
});

路由匹配时，/home/blog/admin/list 优先匹配第 1 个注册的管理端路由，
不会被第 2 个注册的 /home/blog/:blogId 截获。
```

### 鉴权中间件获取方式说明

Blog 路由文件内部自行获取鉴权中间件实例：

| 中间件 | 获取方式 | 用途 |
|--------|---------|------|
| `dbToken` | `app.middleware.dbToken()` | 管理端路由鉴权 |
| `userJwt` | `app.middleware.jwt({ property, secret })` | 用户端 JWT 解析 |
| `singleLogin` | `app.middleware.singleLogin({ valid_entity: 'user' })` | 用户端单点登录校验 |

> **为什么在 blog.ts 内部创建中间件实例？**
> 因为 Blog 路由需要在同一个文件中注册两个不同鉴权的路由组（管理端用 dbToken，用户端用 userJwt + singleLogin）。
> 将 Blog 路由注册到 `home/index.ts` 的**第一个** `router.group` 回调中（该回调无统一鉴权中间件），
> 由 `blog.ts` 内部的两个子 `groupRouter.group()` 分别挂载各自的鉴权中间件。
>
> 这与项目中 `article.ts` 的模式类似 — `article.ts` 在路由文件内部按需为特定路由挂载 `dbToken`。

---

## open/index.ts 修改

### 文件路径：`app/routes/open/index.ts`

### 修改内容

在现有 import 列表末尾追加 Blog 路由导入，并在 `router.group` 回调末尾追加调用。

### 变更对照（diff 视图）

```diff
 import { Application } from "egg";
 import { RouterGroup } from 'egg-router-group';
 import tripConfigRouteGroup from "./trip_config";
 import whatsappBindRouteGroup from "./whatsapp_bind";
 import modelToolGroup from "./model_tool";
 import tripProjectGroup from "./trip_project";
 import shareActivityRelationGroup from "./share_activity_relation";
 import shareOperationLogGroup from "./share_operation_log";
 import shareActivityGroup from "./share_activity";
+import blogGroup from "./blog";
 
 export default (app: Application) => {
     const {
         middleware,
         router,
         // controller,
     } = app;
 
     // 中间件
     const openMiddleware = middleware.openRequestValid()
 
     router.group({
         name: 'open路由组', // 路由组名称
         prefix: '/open',
         middlewares: [ // 中间件组
             openMiddleware,
         ],
     }, (_groupRouter: RouterGroup) => {
         tripConfigRouteGroup(app, _groupRouter)
 
         whatsappBindRouteGroup(app, _groupRouter)
 
         modelToolGroup(app, _groupRouter)
 
         tripProjectGroup(app, _groupRouter)
 
         shareActivityRelationGroup(app, _groupRouter)
 
         shareOperationLogGroup(app, _groupRouter)
 
         shareActivityGroup(app, _groupRouter)
+
+        // Blog 博客公开接口（列表 + 详情，无需鉴权）
+        blogGroup(app, _groupRouter)
     });
 
 
 }
```

### 修改要点

1. **追加 import**：在文件顶部 import 区域末尾追加 `import blogGroup from "./blog";`
2. **追加调用**：在 `router.group` 回调末尾追加 `blogGroup(app, _groupRouter)`
3. **位置**：添加在 `shareActivityGroup(app, _groupRouter)` 之后
4. **不修改**其他任何代码

---

## home/index.ts 修改

### 文件路径：`app/routes/home/index.ts`

### 修改内容

在现有 import 列表末尾追加 Blog 路由导入，并在**第一个** `router.group` 回调（无鉴权中间件块）中追加调用。

### 修改策略说明

`home/index.ts` 中有 **4 个** `router.group` 块，按顺序分别是：

| # | 中间件 | 用途 | Blog 操作 |
|:-:|--------|------|:---------:|
| 1 | 无（空 `middlewares: []`） | 公开/无鉴权的 home 路由 | ✅ **在此块追加 blogGroup** |
| 2 | `userJwt + singleLogin` | 部分需鉴权路由（含 trip_project create 等） | 不修改 |
| 3 | `userJwt + singleLogin` | 主要需鉴权路由 | 不修改 |
| 4 | `userJwt + singleLogin` | feedback 路由 | 不修改 |

Blog 路由注册到**第一个块**的原因：
- Blog 路由文件（`blog.ts`）**内部自行管理鉴权中间件**（管理端用 dbToken，用户端用 userJwt + singleLogin）
- 不应将其注册到已有 `userJwt + singleLogin` 的块中，否则管理端路由会被强制应用 userJwt 鉴权（与 dbToken 冲突）
- 这与 `article.ts` 的注册位置一致（也在第一个无鉴权块中注册，内部按需挂载 dbToken）

### 变更对照（diff 视图）

```diff
 import shareActivityGroup from "./share_activity";
 import shareGroup from "./share";
 import intentGroup from "./intent";
 import tripStandardCardGroup from "./trip_standard_card";
 import adviserConversationGroup from "./adviser_conversation";
 import articleGroup from './article'
 import featureModulesGroup from './feature_modules'
 import communityUserInfo from './community_user_info'
 import tripMetaGroup from './trip_meta'
 import dataAgentGroup from './data_agent'
+import blogGroup from './blog'
 
 export default (app: Application) => {
     /* ... 省略变量声明和中间件创建 ... */
 
     router.group({
         name: 'home路由组', // 路由组名称
         prefix: '/home',
         middlewares: [ // 中间件组
             // adminJwt,
             // singleLogin,
             // confidentiality
         ],
     }, (_groupRouter: RouterGroup) => {
         visitorTripGroup(app, _groupRouter)
 
         visitorMessageGroup(app, _groupRouter)
 
         visitorConversationGroup(app, _groupRouter)
 
         marketingActivityQuestionGroup(app, _groupRouter)
 
         visitorMarketingActivityGroup(app, _groupRouter)
 
         visitorTripProjectGroup(app, _groupRouter)
 
         visitorProposalGroup(app, _groupRouter)
 
         visitorProposalPoiGroup(app, _groupRouter)
 
         visitorProposalFlightGroup(app, _groupRouter)
 
         mediaGroup(app, _groupRouter)
 
         shareGroup(app, _groupRouter)
 
         intentGroup(app, _groupRouter)
 
         // 新增公开文章列表接口（无需鉴权）
         articleGroup(app, _groupRouter)
 
         // 功能模块相关（无需鉴权）
         featureModulesGroup(app, _groupRouter)
 
         // 行程元数据（list开放，add/delete 需 x-action-token）
         tripMetaGroup(app, _groupRouter)
 
         // 站群用户信息
         communityUserInfo(app,_groupRouter)
 
+        // Blog 博客（管理端 dbToken + 用户端 userJwt，鉴权在 blog.ts 内部管理）
+        blogGroup(app, _groupRouter)
+
     });
 
     /* ... 后续 3 个 router.group 块不修改 ... */
 }
```

### 修改要点

1. **追加 import**：在文件顶部 import 区域末尾追加 `import blogGroup from './blog'`
2. **追加调用**：在第一个 `router.group` 回调末尾（`communityUserInfo(app, _groupRouter)` 之后）追加 `blogGroup(app, _groupRouter)`
3. **不修改**其他 3 个 `router.group` 块
4. **不修改**中间件声明和变量定义

---

## 路由完整注册顺序（启动后生效）

### Open 路由

```
/open（openRequestValid 中间件）
  ├── /open/trip_config/*         ← 已有
  ├── /open/whatsapp_bind/*       ← 已有
  ├── /open/model_tool/*          ← 已有
  ├── /open/trip_project/*        ← 已有
  ├── /open/share_activity_relation/* ← 已有
  ├── /open/share_operation_log/* ← 已有
  ├── /open/share_activity/*      ← 已有
  └── /open/blog/*                ← 🆕 新增
       ├── GET  /open/blog                → open/BlogController.index
       └── GET  /open/blog/:blogId        → open/BlogController.detail
```

### Home 路由

```
/home（第一个 router.group — 无统一鉴权）
  ├── /home/visitor_trip/*        ← 已有
  ├── /home/visitor_message/*     ← 已有
  ├── /home/articles/*            ← 已有（Article 模块，含内部 dbToken）
  ├── /home/feature_modules/*     ← 已有
  ├── /home/trip_meta/*           ← 已有
  ├── /home/community_user_info/* ← 已有
  └── /home/blog/*                ← 🆕 新增（内部自行管理鉴权）
       │
       ├── 📦 管理端分组（先注册 — dbToken 鉴权）
       │    ├── GET /home/blog/admin/list              → BlogAdminController.index
       │    └── PUT /home/blog/admin/:blogId/status     → BlogAdminController.updateStatus
       │
       └── 📦 用户端分组（后注册 — userJwt + singleLogin 鉴权）
            ├── POST   /home/blog                      → BlogController.create
            ├── PUT    /home/blog/:blogId               → BlogController.update
            └── DELETE /home/blog/:blogId               → BlogController.delete

/home（第二个 router.group — userJwt + singleLogin）
  └── ... ← 已有，不修改

/home（第三个 router.group — userJwt + singleLogin）
  └── ... ← 已有，不修改

/home（第四个 router.group — userJwt + singleLogin）
  └── ... ← 已有，不修改
```

---

## Egg.js Controller 自动挂载路径

路由文件中引用的 Controller 通过 Egg.js 自动挂载机制映射：

| Controller 文件路径 | Egg.js 自动挂载路径 |
|--------------------|--------------------|
| `app/controller/open/BlogController.ts` | `controller.open.blogController` |
| `app/controller/home/BlogController.ts` | `controller.home.blogController` |
| `app/controller/home/BlogAdminController.ts` | `controller.home.blogAdminController` |

> **命名映射规则**：Egg.js 对文件名进行驼峰转换（`BlogController.ts` → `blogController`，首字母小写）。
> 目录层级直接映射到属性链（`open/` → `controller.open.`）。

---

## 验证要点

### 路由注册

- [ ] `npm run dev` 启动无路由冲突报错
- [ ] 启动日志中可看到 Blog 相关路由注册成功
- [ ] `GET /open/blog` 可正常访问（返回空列表或文章数据）
- [ ] `GET /open/blog/:blogId` 可正常访问
- [ ] `POST /home/blog` 无 JWT 返回 401
- [ ] `POST /home/blog` 携带 JWT 可正常创建
- [ ] `PUT /home/blog/:blogId` 无 JWT 返回 401
- [ ] `DELETE /home/blog/:blogId` 无 JWT 返回 401
- [ ] `GET /home/blog/admin/list` 无 dbToken 返回 403
- [ ] `GET /home/blog/admin/list` 携带 dbToken 可正常访问
- [ ] `PUT /home/blog/admin/:blogId/status` 无 dbToken 返回 403
- [ ] `PUT /home/blog/admin/:blogId/status` 携带 dbToken 可正常操作

### 路由冲突验证（🔴 关键）

- [ ] `GET /home/blog/admin/list` **不被** `/home/blog/:blogId` 匹配（`admin` 不作为 blogId）
- [ ] `PUT /home/blog/admin/65f.../status` **不被** `/home/blog/:blogId` 匹配
- [ ] `PUT /home/blog/65f...` 正常匹配用户端路由（非管理端）
- [ ] `DELETE /home/blog/65f...` 正常匹配用户端路由

### 与现有路由的隔离

- [ ] `/home/articles/*`（Article 模块）路由不受影响
- [ ] `/open/trip_project/*` 路由不受影响
- [ ] 其他已有路由正常工作

### import 检查

- [ ] `app/routes/open/index.ts` 新增 `import blogGroup from "./blog"` 编译无报错
- [ ] `app/routes/home/index.ts` 新增 `import blogGroup from './blog'` 编译无报错
- [ ] Blog 路由文件引用的 Controller 路径正确（`controller.open.blogController`、`controller.home.blogController`、`controller.home.blogAdminController`）

---

**文档版本**: v1.0
**最后更新**: 2026-03-06
**Agent**: zed-copilot