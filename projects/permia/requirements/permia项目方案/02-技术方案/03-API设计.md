# 技术方案 · API 设计

> [← 返回目录](./README.md)

---

## 一、生命周期

```javascript
const { Permia } = require('permia');

const permia = new Permia();    // 仅构造，不读文件
await permia.init();             // 异步初始化（FileAdapter 读磁盘）
// ... 使用 ...
await permia.close();            // 异步关闭（flush 写盘 + 清理定时器）
```

| 方法 | FileAdapter | MemoryAdapter |
|------|-------------|---------------|
| `init()` | 异步读磁盘 + 构建反向索引 | no-op（立即 resolve） |
| `close()` | 异步 flush 写盘 + 清理 timer | no-op（立即 resolve） |

> ⚠️ 使用 FileAdapter（默认）时**必须** `await permia.init()`，否则数据为空

---

## 二、模块架构

```
┌──────────────────────────────────────────────────────────────────┐
│  公共 API 层   lib/core/permia.js                                 │
│  init/close / can/cannot/assert / filterFields /                 │
│  getPermissions / getResources / for(userId) / invalidate(All)   │
├──────────────────────────────────────────────────────────────────┤
│  链式 API      lib/core/context.js   PermiaContext               │
├──────────────────────────────────────────────────────────────────┤
│  鉴权引擎层    lib/check/                                          │
│  checker.js（主流程）  resolver.js（继承链）  wildcard.js（匹配）  │
├───────────────────────────┬──────────────────────────────────────┤
│  RBAC 层  lib/rbac/        │  错误层  lib/core/errors.js           │
│  role-manager.js           │  工具层  lib/utils/                   │
│  user-role.js              │  constants / validation / merge       │
├───────────────────────────┴──────────────────────────────────────┤
│  缓存层    lib/cache/permission-cache.js                          │
├──────────────────────────────────────────────────────────────────┤
│  存储适配器层  lib/storage/                                        │
│  adapter.js（抽象基类）  file-adapter.js（默认）  memory-adapter.js│
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、主类 Permia — 公共 API

### 3.1 构造器

```
new Permia(options?)
  options.storage   StorageAdapter，默认 new FileAdapter()
  options.cache     { enabled: true, ttl: 300000 }
  options.strict    boolean，默认 true（deny 全局优先于 allow）
```

### 3.2 完整 API 一览

| API | 签名 | 返回值 | 说明 |
|-----|------|--------|------|
| `init()` | `()` | `Promise<void>` | 异步初始化 |
| `close()` | `()` | `Promise<void>` | flush + 清理定时器 |
| `can` | `(userId, action, resource)` | `Promise<boolean>` | 鉴权，返回 true/false |
| `cannot` | `(userId, action, resource)` | `Promise<boolean>` | `!can(...)` |
| `assert` | `(userId, action, resource)` | `Promise<void>` | 无权限时抛 `PermiaError.PERMISSION_DENIED` |
| `filterFields` | `(userId, resource, data, action?)` | `Promise<object>` | 过滤对象字段（仅 `db:` 资源，action 默认 `'read'`） |
| `getPermissions` | `(userId)` | `Promise<PermissionRule[]>` | 完整规则列表（含继承展开） |
| `getResources` | `(userId, action?)` | `Promise<string[]>` | 有权资源路径（action 默认 `'invoke'`） |
| `for` | `(userId)` | `PermiaContext` | 链式调用入口 |
| `invalidate` | `(userId)` | `Promise<void>` | 清除指定用户缓存 |
| `invalidateAll` | `()` | `Promise<void>` | 清除所有用户缓存 |
| `roles` | — | `RoleManager` | 角色管理子模块 |
| `users` | — | `UserRoleManager` | 用户角色绑定子模块 |

**`getPermissions` vs `getResources` 使用建议**：

| API | 返回内容 | 适合场景 | 写入 Token？ |
|-----|---------|---------|------------|
| `getPermissions` | 完整 `PermissionRule[]`（含 allow/deny/action） | 服务端二次判断 | ❌ 规则多时 Token 过大 |
| `getResources` | 有权资源路径 `string[]` | 前端菜单/按钮渲染 | ✅ 推荐 |

---

## 四、链式 API PermiaContext

```javascript
const ctx = permia.for('user-001');

await ctx.can('invoke', 'GET:/api/users');              // → boolean
await ctx.cannot('invoke', 'DELETE:/api/users/123');    // → boolean
await ctx.assert('invoke', 'DELETE:/api/users/123');    // → void | throw
await ctx.filterFields('db:users', record);              // → object（action 默认 'read'）
await ctx.getPermissions();                              // → PermissionRule[]
await ctx.getResources('invoke');                        // → string[]
```

---

## 五、角色管理 RoleManager（`permia.roles`）

| API | 签名 | 说明 |
|-----|------|------|
| `create` | `(id, { label, parent?, description? })` | 创建角色；父角色须先存在 |
| `update` | `(id, { label?, parent?, description? })` | 更新角色；改 parent 时检测循环继承 |
| `delete` | `(id)` | 删除角色；有子角色时拒绝（须先处理子角色） |
| `get` | `(id)` | 获取单个角色；不存在抛 `ROLE_NOT_FOUND` |
| `list` | `()` | 获取所有角色 |
| `allow` | `(roleId, actions, resource)` | 添加 allow 规则；actions 可为 string 或 string[] |
| `deny` | `(roleId, actions, resource)` | 添加 deny 规则 |
| `revokeRule` | `(roleId, actions, resource)` | 精确删除匹配的规则 |
| `clearRules` | `(roleId)` | 清空角色所有规则 |
| `getRules` | `(roleId)` | 获取角色自身规则（**不含继承链**） |

> ⚠️ **缓存失效策略**：所有规则变更（`allow/deny/revokeRule/clearRules/update/delete`）都触发 `invalidateAll()`  
> 原因：角色继承链上的下游用户都可能受影响，`getUsersByRole` 只能查到直接绑定用户，无法覆盖继承链  
> 性能取舍：v1.0.0 采用 `invalidateAll`（最简单最安全），后续版本可引入角色依赖图实现精准失效

---

## 六、用户角色绑定 UserRoleManager（`permia.users`）

| API | 签名 | 说明 |
|-----|------|------|
| `assign` | `(userId, roleId)` | 绑定角色；roleId 须存在，否则抛 `ROLE_NOT_FOUND` |
| `revoke` | `(userId, roleId)` | 解绑角色 |
| `getUserRoles` | `(userId)` | 获取用户角色列表；用户不存在返回 `[]` |
| `setUserRoles` | `(userId, roleIds)` | 批量覆盖；**先全量校验**所有 roleId 均存在，再写入（防止半写） |
| `clearUserRoles` | `(userId)` | 清空用户所有角色绑定 |

---

## 七、工具函数（模块级导出）

```javascript
const { matchResource } = require('permia');

// 判断 pattern 是否匹配 resource
matchResource('*:/api/users/*', 'GET:/api/users/123')   // → true
matchResource('db:users:*',     'db:users:email')        // → true
matchResource('GET:*',          'POST:/api/users')       // → false
matchResource('*',              'db:users:email')        // → true（全局通配）
```

> `matchResource` 仅从模块顶层导出，**不**作为 `Permia` 实例方法。  
> 前端场景：从 Token 中取出 `resources` 列表后，用此函数在客户端做权限判断。

