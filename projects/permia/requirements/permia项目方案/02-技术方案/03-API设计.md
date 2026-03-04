# 技术方案 · API 设计

> [← 返回目录](./README.md)

---

## 一、生命周期

```typescript
import { Permia } from 'permia';

const permia = new Permia();    // 仅构造，不读文件（默认 FileAdapter）
await permia.init();             // 🔴 必须调用，否则所有 API 抛 NOT_INITIALIZED
// ... 使用 ...
await permia.close();            // 异步关闭（flush 写盘 + 清理定时器）
```

| 方法 | FileAdapter | MemoryAdapter |
|------|-------------|---------------|
| `init()` | 异步读磁盘 + 构建反向索引 + 设置 `_initialized=true` | no-op + 设置 `_initialized=true` |
| `close()` | 异步 flush 写盘 + 清理 timer | no-op |

> 🔴 **初始化保护**：所有公共 API（`can/assert/filterFields` 等）入口检查 `_initialized`，未调用 `init()` 时抛 `PermiaError(NOT_INITIALIZED, 'Must call await permia.init() before using any API')`，防止静默失败（忘记 init 导致所有鉴权默认返回 false）

---

## 二、模块架构

```
┌──────────────────────────────────────────────────────────────────┐
│  公共 API 层   src/core/permia.ts                                 │
│  init/close / can/cannot/assert / filterFields /                 │
│  getPermissions / getResources / for(userId) / invalidate(All)   │
├──────────────────────────────────────────────────────────────────┤
│  链式 API      src/core/context.ts   PermiaContext                │
├──────────────────────────────────────────────────────────────────┤
│  鉴权引擎层    src/check/                                          │
│  checker.ts（主流程）  resolver.ts（继承链）  wildcard.ts（匹配）  │
├───────────────────────────┬──────────────────────────────────────┤
│  RBAC 层  src/rbac/        │  错误层  src/core/errors.ts           │
│  role-manager.ts           │  类型层  src/types/index.ts           │
│  user-role.ts              │  工具层  src/utils/                   │
│                            │  constants / validation / merge       │
├───────────────────────────┴──────────────────────────────────────┤
│  缓存层    src/cache/permission-cache.ts                          │
├──────────────────────────────────────────────────────────────────┤
│  存储适配器层  src/storage/                                        │
│  adapter.ts（抽象基类）  file-adapter.ts（默认）  memory-adapter.ts│
└──────────────────────────────────────────────────────────────────┘
```

---

## 三、主类 Permia — 公共 API

### 3.1 构造器

```typescript
import type { PermiaOptions, StorageAdapter } from 'permia';

new Permia(options?: PermiaOptions)

interface PermiaOptions {
  storage?: StorageAdapter;           // 默认 new FileAdapter()
  cache?:   { enabled: boolean; ttl: number };  // 默认 { enabled: true, ttl: 300000 }
  strict?:  boolean;                  // 默认 true（deny 全局优先于 allow）
}

// 内部状态:
//   private _initialized: boolean = false;   // init() 成功后设为 true
//   所有公共 API 入口调用 this._checkInit()，未初始化时抛 NOT_INITIALIZED
```

### 3.2 完整 API 一览

| API | 签名 | 返回值 | 说明 |
|-----|------|--------|------|
| `init()` | `()` | `Promise<void>` | 异步初始化（设置 `_initialized=true`） |
| `close()` | `()` | `Promise<void>` | flush + 清理定时器 |
| `can` | `(userId: string, action: string, resource: string)` | `Promise<boolean>` | 鉴权，返回 true/false |
| `cannot` | `(userId: string, action: string, resource: string)` | `Promise<boolean>` | `!can(...)` |
| `assert` | `(userId: string, action: string, resource: string)` | `Promise<void>` | 无权限时抛 `PermiaError.PERMISSION_DENIED` |
| `filterFields` | `(userId: string, action: string, resource: string, data: Record<string, unknown>)` | `Promise<Partial<Record<string, unknown>>>` | 过滤对象字段（仅 `db:` 资源） |
| `getPermissions` | `(userId: string)` | `Promise<PermissionRule[]>` | 完整规则列表（含继承展开） |
| `getResources` | `(userId: string, action: string = 'invoke')` | `Promise<string[]>` | 有权资源路径（默认 `'invoke'` — 只返回接口资源） |
| `for` | `(userId: string)` | `PermiaContext` | 链式调用入口 |
| `invalidate` | `(userId: string)` | `Promise<void>` | 清除指定用户缓存 |
| `invalidateAll` | `()` | `Promise<void>` | 清除所有用户缓存 |
| `roles` | — | `RoleManager` | 角色管理子模块 |
| `users` | — | `UserRoleManager` | 用户角色绑定子模块 |

> ⚠️ **`filterFields` 签名调整（v2.3）**：`action` 参数从最后一个可选参数调整为第二个必填参数。原因：
> - 与 `can(userId, action, resource)` 参数顺序保持一致
> - 消除 `filterFields` 在 read 和 write 场景下 action 含义不同时的歧义
> - 写入过滤场景（`filterFields(userId, 'update', 'db:articles', payload)`）需要明确传 action

**`getPermissions` vs `getResources` 使用建议**：

| API | 返回内容 | 适合场景 | 写入 Token？ |
|-----|---------|---------|------------|
| `getPermissions` | 完整 `PermissionRule[]`（含 allow/deny/action） | 服务端二次判断 | ❌ 规则多时 Token 过大 |
| `getResources` | 有权资源路径 `string[]` | 前端菜单/按钮渲染 | ✅ 推荐（注意 JWT 大小限制，通常 8KB） |

> ⚠️ **`getResources` 限制**：返回的是 allow 规则的资源路径列表（排除被 deny 完全覆盖的），但无法排除"deny 精确匹配而 allow 为通配符"的情况（假阳性）。前端最终权限判断应以 `can()` 为准，`getResources` 仅用于粗粒度菜单渲染。

---

## 四、链式 API PermiaContext

```typescript
const ctx: PermiaContext = permia.for('user-001');

await ctx.can('invoke', 'GET:/api/users');              // → boolean
await ctx.cannot('invoke', 'DELETE:/api/users/123');    // → boolean
await ctx.assert('invoke', 'DELETE:/api/users/123');    // → void | throw
await ctx.filterFields('read', 'db:users', record);     // → Partial<Record<string, unknown>>
await ctx.getPermissions();                              // → PermissionRule[]
await ctx.getResources('invoke');                        // → string[]
```

> 💡 链式 API 的方法签名比主类少一个 `userId` 参数（已在 `for(userId)` 时绑定），其余参数顺序一致。

**参数对照表**：

| 操作 | 主类签名 | 链式签名 |
|------|---------|---------|
| 鉴权 | `permia.can(userId, action, resource)` | `ctx.can(action, resource)` |
| 断言 | `permia.assert(userId, action, resource)` | `ctx.assert(action, resource)` |
| 字段过滤 | `permia.filterFields(userId, action, resource, data)` | `ctx.filterFields(action, resource, data)` |
| 权限列表 | `permia.getPermissions(userId)` | `ctx.getPermissions()` |
| 资源列表 | `permia.getResources(userId, action?)` | `ctx.getResources(action?)` |

---

## 五、角色管理 RoleManager（`permia.roles`）

| API | 签名 | 说明 |
|-----|------|------|
| `create` | `(id: string, opts: { label: string; parent?: string; description?: string })` | 创建角色；父角色须先存在 |
| `update` | `(id: string, opts: { label?: string; parent?: string; description?: string })` | 更新角色；改 parent 时检测循环继承 |
| `delete` | `(id: string)` | 删除角色；有子角色时拒绝；成功时级联：清理规则 + 从所有已绑定用户中移除该角色 |
| `get` | `(id: string)` | 获取单个角色；不存在抛 `ROLE_NOT_FOUND` |
| `list` | `()` | 获取所有角色 |
| `allow` | `(roleId: string, actions: string \| string[], resource: string)` | 添加 allow 规则 |
| `deny` | `(roleId: string, actions: string \| string[], resource: string)` | 添加 deny 规则 |
| `revokeRule` | `(roleId: string, actions: string \| string[], resource: string)` | 精确删除匹配的规则 |
| `clearRules` | `(roleId: string)` | 清空角色所有规则 |
| `getRules` | `(roleId: string)` | 获取角色自身规则（**不含继承链**） |

> ⚠️ **缓存失效策略**：所有规则变更（`allow/deny/revokeRule/clearRules/update/delete`）都触发 `invalidateAll()`  
> 原因：角色继承链上的下游用户都可能受影响，`getUsersByRole` 只能查到直接绑定用户，无法覆盖继承链  
> 性能取舍：v1.0.0 采用 `invalidateAll`（最简单最安全），后续版本可引入角色依赖图实现精准失效

**`roles.delete(id)` 完整流程**：
1. 检查无子角色（有子角色时抛错拒绝）
2. 清理该角色的所有规则（`storage.deleteRules(id)`）
3. 从所有已绑定用户中移除该角色（`storage.getUsersByRole(id)` → 逐用户 `revoke`）
   > ⚠️ `getUsersByRole` 只能查到**直接绑定**该角色的用户。通过继承链间接拥有该角色的用户不受影响（也不需要清理，因为继承链上的父角色已不存在，`resolveRoleChain` 会跳过）
4. 删除角色数据（`storage.deleteRole(id)`）
5. `invalidateAll()`

---

## 六、用户角色绑定 UserRoleManager（`permia.users`）

| API | 签名 | 说明 |
|-----|------|------|
| `assign` | `(userId: string, roleId: string)` | 绑定角色；roleId 须存在，否则抛 `ROLE_NOT_FOUND` |
| `revoke` | `(userId: string, roleId: string)` | 解绑角色 |
| `getUserRoles` | `(userId: string)` | 获取用户角色列表；用户不存在返回 `[]` |
| `setUserRoles` | `(userId: string, roleIds: string[])` | 批量覆盖；**先全量校验**所有 roleId 均存在，再写入（防止半写） |
| `clearUserRoles` | `(userId: string)` | 清空用户所有角色绑定 |

---

## 七、工具函数（模块级导出）

```typescript
import { matchResource } from 'permia';
// 或使用子路径导入（前端场景推荐，避免打入 FileAdapter 等无用代码）
import { matchResource } from 'permia/match';

// 判断 pattern 是否匹配 resource
matchResource('*:/api/users/*', 'GET:/api/users/123');   // → true
matchResource('db:users:*',     'db:users:email');        // → true
matchResource('GET:*',          'POST:/api/users');       // → false
matchResource('*',              'db:users:email');        // → true（全局通配）
```

> `matchResource` 仅从模块顶层导出，**不**作为 `Permia` 实例方法。  
> 前端场景：从 Token 中取出 `resources` 列表后，用此函数在客户端做权限判断。  
> 🔴 **前端打包建议**：使用 `import { matchResource } from 'permia/match'` 子路径导入，避免 tree-shake 不完全时打入 Node.js 专属代码（FileAdapter 等）。`package.json` 的 `exports` 已配置此子路径。

---

## 八、action 语义层级

### 8.1 action 定义

```yaml
db: 资源的 action 语义:
  *       → 所有操作（含 read + write + delete）
  write   → create + update（写入类操作的快捷方式）
  read    → 只读查询
  create  → 新建记录
  update  → 修改现有记录
  delete  → 删除记录

接口资源的 action 语义:
  *       → 所有操作
  invoke  → 调用接口
```

### 8.2 matchAction 展开规则（规则中的 action 作为 pattern）

当 action 出现在**规则定义**中时（`allow/deny` 的 action 参数），`matchAction` 按以下逻辑展开：

```yaml
matchAction(pattern, requestAction):
  matchAction('*', 任意action)       → true
  matchAction('write', 'create')     → true（write 包含 create）
  matchAction('write', 'update')     → true（write 包含 update）
  matchAction('write', 'read')       → false
  matchAction('write', 'delete')     → false
  matchAction('read', 'read')        → true（精确匹配）
  matchAction('invoke', 'invoke')    → true（精确匹配）
```

### 8.3 write 双向语义（🆕 v2.3）

> ⚠️ **重要**：`write` 在规则中和在请求中有不同的语义

**场景 A — 规则中的 `write`（OR 语义）**：

```typescript
// 管理员配置：editor 角色拥有 write 权限
await permia.roles.allow('editor', 'write', 'db:articles');

// 效果：editor 可以 create 和 update（OR 关系）
await permia.can('user-002', 'create', 'db:articles');  // → true ✅
await permia.can('user-002', 'update', 'db:articles');  // → true ✅
await permia.can('user-002', 'delete', 'db:articles');  // → false
```

**场景 B — 请求中的 `write`（AND 语义）**：

```typescript
// 管理员分别配置了 create 和 update 规则
await permia.roles.allow('editor', 'create', 'db:articles');
await permia.roles.allow('editor', 'update', 'db:articles');

// 业务代码中检查 write — checker.can() 层面展开为 create AND update
await permia.can('user-002', 'write', 'db:articles');   // → true ✅
// 内部逻辑：can('write') → can('create') && can('update')

// 如果只有 create 没有 update
await permia.roles.allow('viewer', 'create', 'db:articles');
await permia.can('user-003', 'write', 'db:articles');   // → false ❌
// 内部逻辑：can('create')=true && can('update')=false → false
```

**设计总结**：

| write 出现位置 | 语义 | 逻辑 | 说明 |
|:---:|:---:|:---:|------|
| 规则中（`allow('role', 'write', ...)`） | OR | `matchAction('write', 'create') → true` | 授予 create 和 update 权限 |
| 请求中（`can(userId, 'write', ...)`） | AND | `can('create') && can('update')` | 需要 create 和 update 都有权限 |

> 💡 `write` 作为 `create + update` 的语法糖，在 `matchAction` 中实现规则侧展开（OR），在 `checker.can` 中实现请求侧展开（AND）。规则存储层仍然存储原始 action 值（不在存储时展开）。

---

## 九、公共类型定义（`src/types/index.ts`）

> 所有公共类型集中在 `src/types/index.ts` 中定义并导出，由 `src/index.ts` 统一 re-export。

```typescript
/** 权限规则（存储 + 运行时通用） */
export interface PermissionRule {
  type:     'allow' | 'deny';
  action:   string;
  resource: string;
}

/** 角色数据 */
export interface RoleData {
  id:          string;
  label:       string;
  parent:      string | null;
  description: string;
  createdAt:   number;    // timestamp ms
  updatedAt:   number;    // timestamp ms
}

/** Permia 构造器选项 */
export interface PermiaOptions {
  storage?: StorageAdapter;
  cache?:   CacheOptions;
  strict?:  boolean;
}

/** 缓存配置 */
export interface CacheOptions {
  enabled: boolean;
  ttl:     number;        // 单位 ms，默认 300000
}

/** 角色创建选项 */
export interface RoleCreateOptions {
  label:        string;
  parent?:      string;
  description?: string;
}

/** 角色更新选项 */
export interface RoleUpdateOptions {
  label?:       string;
  parent?:      string;
  description?: string;
}

/** 错误码枚举 */
export enum PermiaErrorCode {
  PERMISSION_DENIED     = 'PERMISSION_DENIED',
  ROLE_NOT_FOUND        = 'ROLE_NOT_FOUND',
  USER_NOT_FOUND        = 'USER_NOT_FOUND',
  ROLE_ALREADY_EXISTS   = 'ROLE_ALREADY_EXISTS',
  CIRCULAR_INHERITANCE  = 'CIRCULAR_INHERITANCE',
  INVALID_RESOURCE_PATH = 'INVALID_RESOURCE_PATH',
  INVALID_ACTION        = 'INVALID_ACTION',
  INVALID_ARGUMENT      = 'INVALID_ARGUMENT',
  STORAGE_ERROR         = 'STORAGE_ERROR',
  NOT_INITIALIZED       = 'NOT_INITIALIZED',
}
```
