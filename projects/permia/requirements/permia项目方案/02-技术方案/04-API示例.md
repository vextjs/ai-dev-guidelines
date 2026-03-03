# 技术方案 · API 使用示例

> [← 返回目录](./README.md)

---

## 一、初始化 → 配置角色 → 绑定用户

```javascript
const { Permia } = require('permia');

const permia = new Permia();
await permia.init();   // FileAdapter 默认，读取 ./permia-data.json

// ① 创建角色（父角色必须先创建）
await permia.roles.create('viewer', { label: '只读用户', description: '仅查看' });
await permia.roles.create('editor', { label: '编辑', parent: 'viewer' });  // 继承 viewer
await permia.roles.create('admin',  { label: '管理员' });

// ② 配置权限规则
// viewer 规则
await permia.roles.allow('viewer', 'invoke', 'GET:/api/articles');
await permia.roles.allow('viewer', 'read',   'db:articles');
await permia.roles.allow('viewer', 'read',   'db:users:name');
await permia.roles.allow('viewer', 'read',   'db:users:avatar');

// editor 规则（自动继承 viewer 的所有规则）
await permia.roles.allow('editor', 'invoke', 'POST:/api/articles');
await permia.roles.allow('editor', 'invoke', 'PUT:/api/articles/:id');
await permia.roles.allow('editor', 'write',  'db:articles');
await permia.roles.deny( 'editor', 'read',   'db:users:email');  // 覆盖：禁读邮箱

// admin 规则
await permia.roles.allow('admin', '*', '*');            // 全权
await permia.roles.deny( 'admin', 'delete', 'db:users'); // 但不允许删用户

// ③ 绑定用户
await permia.users.assign('user-001', 'admin');
await permia.users.assign('user-002', 'editor');  // editor 自动继承 viewer
await permia.users.assign('user-003', 'viewer');
await permia.users.setUserRoles('user-004', ['editor', 'viewer']);  // 多角色
```

---

## 二、鉴权操作

### 2.1 can / cannot

```javascript
// editor（user-002）自身有规则
await permia.can('user-002', 'invoke', 'POST:/api/articles');
// → true

// editor 继承 viewer 的规则
await permia.can('user-002', 'invoke', 'GET:/api/articles');
// → true（继承自 viewer）

// editor 无此规则，白名单默认拒绝
await permia.can('user-002', 'invoke', 'DELETE:/api/articles/123');
// → false

// viewer（user-003）无写权限
await permia.can('user-003', 'invoke', 'POST:/api/articles');
// → false

// cannot = !can
await permia.cannot('user-003', 'invoke', 'POST:/api/articles');
// → true

// 匿名用户（null/undefined）始终为 false
await permia.can(null, 'invoke', 'GET:/api/articles');
// → false
```

### 2.2 assert（失败抛异常）

```javascript
try {
  await permia.assert('user-003', 'invoke', 'POST:/api/articles');
} catch (e) {
  console.log(e.code);    // 'PERMISSION_DENIED'
  console.log(e.message); // 'User user-003 is not allowed to invoke POST:/api/articles'
  console.log(e.data);    // { userId: 'user-003', action: 'invoke', resource: 'POST:/api/articles' }
}
```

---

## 三、权限集查询

### 3.1 getPermissions（完整规则列表）

```javascript
// 适合服务端二次判断，不建议写入 JWT（规则多时 Token 过大）
await permia.getPermissions('user-002');
// → [
//   { type: 'deny',  action: 'read',   resource: 'db:users:email' },    ← deny 前置（strict=true）
//   { type: 'allow', action: 'invoke', resource: 'POST:/api/articles' }, ← editor 自身
//   { type: 'allow', action: 'invoke', resource: 'PUT:/api/articles/:id' },
//   { type: 'allow', action: 'write',  resource: 'db:articles' },
//   { type: 'allow', action: 'invoke', resource: 'GET:/api/articles' },  ← 继承自 viewer
//   { type: 'allow', action: 'read',   resource: 'db:articles' },
//   { type: 'allow', action: 'read',   resource: 'db:users:name' },
//   { type: 'allow', action: 'read',   resource: 'db:users:avatar' },
// ]
```

### 3.2 getResources（有权资源路径列表）

```javascript
// 适合写入 JWT / 前端菜单渲染（推荐）
await permia.getResources('user-002', 'invoke');
// → ['POST:/api/articles', 'PUT:/api/articles/:id', 'GET:/api/articles']

await permia.getResources('user-002', 'read');
// → ['db:articles', 'db:users:name', 'db:users:avatar']
// 注意：db:users:email 被 deny，不在列表中

await permia.getResources('user-001', 'invoke');
// → ['*']   （admin: allow * * 全通配）

await permia.getResources('user-003', 'invoke');
// → ['GET:/api/articles']  （viewer 只有此接口权限）
```

---

## 四、字段过滤

```javascript
const record = {
  _id: 'u-123',
  name: 'Alice',
  email: 'alice@example.com',
  phone: '13800000000',
  avatar: '/img/alice.png',
  salary: 50000
};

// editor（user-002）有 read db:users:name + db:users:avatar，deny db:users:email
await permia.filterFields('user-002', 'db:users', record);
// → { name: 'Alice', avatar: '/img/alice.png' }
// 过滤掉：_id（无规则）、email（deny）、phone（无规则）、salary（无规则）

// admin（user-001）有 allow * *，所有字段有权读
await permia.filterFields('user-001', 'db:users', record);
// → { _id: 'u-123', name: 'Alice', email: '...', phone: '...', avatar: '...', salary: 50000 }

// viewer（user-003）有 read db:users:name + db:users:avatar
await permia.filterFields('user-003', 'db:users', record);
// → { name: 'Alice', avatar: '/img/alice.png' }

// 空对象
await permia.filterFields('user-002', 'db:users', {});
// → {}

// 非法入参
await permia.filterFields('user-002', 'db:users', null);
// → throw PermiaError { code: 'INVALID_ARGUMENT', message: 'data must be a plain object' }

await permia.filterFields('user-002', 'GET:/api/users', record);
// → throw PermiaError { code: 'INVALID_RESOURCE_PATH', message: 'filterFields only supports db: resources' }
```

---

## 五、链式 API 示例

```javascript
const ctx = permia.for('user-002');

// 等价于 permia.can('user-002', ...)
const ok = await ctx.can('invoke', 'GET:/api/articles');

// 批量判断同一用户的多个权限
const [canRead, canWrite, canDelete] = await Promise.all([
  ctx.can('invoke', 'GET:/api/articles'),
  ctx.can('invoke', 'POST:/api/articles'),
  ctx.can('invoke', 'DELETE:/api/articles/1'),
]);
// → [true, true, false]

// 字段过滤（action 默认 'read'）
const safe = await ctx.filterFields('db:users', record);
```

