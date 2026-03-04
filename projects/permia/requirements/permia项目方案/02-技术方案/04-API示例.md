# 技术方案 · API 使用示例

> [← 返回目录](./README.md)

---

## 一、初始化 → 配置角色 → 绑定用户

```typescript
import { Permia } from 'permia';

const permia = new Permia();       // 默认 FileAdapter（磁盘 JSON 持久化）
await permia.init();                // 🔴 必须调用，否则所有 API 抛 NOT_INITIALIZED

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
await permia.roles.allow('editor', 'write',  'db:articles');          // write = create + update
await permia.roles.deny( 'editor', 'read',   'db:users:email');      // 覆盖：禁读邮箱

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

```typescript
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

```typescript
import { PermiaError } from 'permia';

try {
  await permia.assert('user-003', 'invoke', 'POST:/api/articles');
} catch (e) {
  if (e instanceof PermiaError) {
    console.log(e.code);    // 'PERMISSION_DENIED'
    console.log(e.message); // 'User user-003 is not allowed to invoke POST:/api/articles'
    console.log(e.data);    // { userId: 'user-003', action: 'invoke', resource: 'POST:/api/articles' }
  }
}
```

### 2.3 write 双向语义

```typescript
// 场景 A — 规则中使用 write（OR 语义）
// editor 已配置 allow('editor', 'write', 'db:articles')
await permia.can('user-002', 'create', 'db:articles');  // → true（write 包含 create）
await permia.can('user-002', 'update', 'db:articles');  // → true（write 包含 update）
await permia.can('user-002', 'delete', 'db:articles');  // → false（write 不含 delete）

// 场景 B — 请求中使用 write（AND 语义）
// 假设某角色分别配置了 create 和 update
await permia.roles.create('contributor', { label: '贡献者' });
await permia.roles.allow('contributor', 'create', 'db:posts');
await permia.roles.allow('contributor', 'update', 'db:posts');
await permia.users.assign('user-005', 'contributor');

// can(userId, 'write', ...) 内部展开为 can('create') && can('update')
await permia.can('user-005', 'write', 'db:posts');   // → true（create ✅ + update ✅）

// 假设只有 create 没有 update
await permia.roles.create('submitter', { label: '提交者' });
await permia.roles.allow('submitter', 'create', 'db:posts');
await permia.users.assign('user-006', 'submitter');
await permia.can('user-006', 'write', 'db:posts');   // → false（create ✅ + update ❌ → false）
```

---

## 三、权限集查询

### 3.1 getPermissions（完整规则列表）

```typescript
import type { PermissionRule } from 'permia';

// 适合服务端二次判断，不建议写入 JWT（规则多时 Token 过大，通常受 HTTP header ~8KB 限制）
const rules: PermissionRule[] = await permia.getPermissions('user-002');
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

```typescript
// 适合写入 JWT / 前端菜单渲染（推荐）
// ⚠️ 假阳性限制：deny 精确匹配 + allow 通配符时，通配符不会被过滤，前端最终以 can() 为准
const invokeResources: string[] = await permia.getResources('user-002', 'invoke');
// → ['POST:/api/articles', 'PUT:/api/articles/:id', 'GET:/api/articles']

const readResources: string[] = await permia.getResources('user-002', 'read');
// → ['db:articles', 'db:users:name', 'db:users:avatar']
// 注意：db:users:email 被 deny，不在列表中

await permia.getResources('user-001', 'invoke');
// → ['*']   （admin: allow * * 全通配）

await permia.getResources('user-003', 'invoke');
// → ['GET:/api/articles']  （viewer 只有此接口权限）
```

---

## 四、字段过滤

### 4.1 读取场景（action = 'read'）

```typescript
const record = {
  _id: 'u-123',
  name: 'Alice',
  email: 'alice@example.com',
  phone: '13800000000',
  avatar: '/img/alice.png',
  salary: 50000,
};

// editor（user-002）有 read db:users:name + db:users:avatar，deny db:users:email
const safeRead = await permia.filterFields('user-002', 'read', 'db:users', record);
// → { name: 'Alice', avatar: '/img/alice.png' }
// 过滤掉：_id（无规则）、email（deny）、phone（无规则）、salary（无规则）

// admin（user-001）有 allow * *，所有字段有权读
const adminRead = await permia.filterFields('user-001', 'read', 'db:users', record);
// → { _id: 'u-123', name: 'Alice', email: '...', phone: '...', avatar: '...', salary: 50000 }

// viewer（user-003）有 read db:users:name + db:users:avatar
const viewerRead = await permia.filterFields('user-003', 'read', 'db:users', record);
// → { name: 'Alice', avatar: '/img/alice.png' }
```

### 4.2 写入场景（action = 'update' / 'create'）

> ⚠️ **前提**：本节示例需要在 §一 的基础上追加以下字段级规则配置：
> ```typescript
> // 补充 editor 的字段级写权限（§一 只配置了集合级 write db:articles）
> await permia.roles.allow('editor', 'update', 'db:articles:title');
> await permia.roles.allow('editor', 'update', 'db:articles:content');
> await permia.roles.allow('editor', 'create', 'db:articles:title');
> await permia.roles.allow('editor', 'create', 'db:articles:content');
> await permia.roles.deny( 'editor', 'update', 'db:articles:status');
> await permia.roles.deny( 'editor', 'update', 'db:articles:pinned');
> ```
> 💡 **集合级 vs 字段级**：§一 中 `allow('editor', 'write', 'db:articles')` 控制的是**集合级**权限（能否操作 articles 集合），
> 而字段级权限（能否操作具体字段）需要额外配置 `db:articles:<field>` 规则。`filterFields` 在过滤时逐字段调用 `can(userId, action, 'db:articles:<field>')`。

```typescript
// 场景：editor 提交更新请求，但只有部分字段有写权限
// editor 有 write db:articles（集合级）+ 字段级 allow/deny（见上方前提配置）
const updatePayload = {
  title: '新标题',
  content: '新内容',
  status: 'published',       // editor 无权修改 status（deny）
  pinned: true,              // editor 无权修改 pinned（deny）
};

// editor 对 articles 的字段级规则（已在上方前提配置中声明）：
// allow('editor', 'update', 'db:articles:title')    ← 有权
// allow('editor', 'update', 'db:articles:content')  ← 有权
// deny('editor', 'update', 'db:articles:status')    ← 无权
// deny('editor', 'update', 'db:articles:pinned')    ← 无权

const safeUpdate = await permia.filterFields('user-002', 'update', 'db:articles', updatePayload);
// → { title: '新标题', content: '新内容' }
// status 和 pinned 被过滤，不会写入数据库

// 场景：创建文章时过滤无权提交的字段
const createPayload = {
  title: '我的文章',
  content: '内容...',
  status: 'draft',           // editor 无权指定 status
};

const safeCreate = await permia.filterFields('user-002', 'create', 'db:articles', createPayload);
// → { title: '我的文章', content: '内容...' }
```

### 4.3 边界情况

```typescript
// 空对象
await permia.filterFields('user-002', 'read', 'db:users', {});
// → {}

// 非法入参
await permia.filterFields('user-002', 'read', 'db:users', null as any);
// → throw PermiaError { code: 'INVALID_ARGUMENT', message: 'data must be a plain object' }

await permia.filterFields('user-002', 'read', 'GET:/api/users', record);
// → throw PermiaError { code: 'INVALID_RESOURCE_PATH', message: 'filterFields only supports db: resources' }
```

---

## 五、链式 API 示例

```typescript
import type { PermiaContext, PermissionRule } from 'permia';

const ctx: PermiaContext = permia.for('user-002');

// 等价于 permia.can('user-002', ...)
const ok: boolean = await ctx.can('invoke', 'GET:/api/articles');

// 批量判断同一用户的多个权限
const [canRead, canWrite, canDelete] = await Promise.all([
  ctx.can('invoke', 'GET:/api/articles'),
  ctx.can('invoke', 'POST:/api/articles'),
  ctx.can('invoke', 'DELETE:/api/articles/1'),
]);
// → [true, true, false]

// 字段过滤（read 场景）
const safeData = await ctx.filterFields('read', 'db:users', record);

// 字段过滤（update 场景）
const safePayload = await ctx.filterFields('update', 'db:articles', updatePayload);

// 获取权限列表
const permissions: PermissionRule[] = await ctx.getPermissions();
const resources: string[] = await ctx.getResources('invoke');
```

---

## 六、db 权限在 Service 层的完整使用示例

> 💡 permia 是**应用层权限判断引擎**，不会自动拦截数据库操作。db 权限需要在 Service/DAO 层主动调用 `can()` / `assert()` / `filterFields()`。详见 [跨框架接入 §db 权限使用流程](./06-跨框架接入.md)。

```typescript
import { Permia, PermiaError, PermiaErrorCode } from 'permia';

class ArticleService {
  constructor(private permia: Permia, private db: any) {}

  // 读取文章 — 集合级 + 字段级权限
  async getArticle(userId: string, articleId: string) {
    // ① 检查集合级读权限（无权限抛 PERMISSION_DENIED）
    await this.permia.assert(userId, 'read', 'db:articles');

    // ② 查询数据库（permia 不参与此步骤）
    const article = await this.db.collection('articles').findOne({ _id: articleId });
    if (!article) throw new Error('Article not found');

    // ③ 字段级过滤 — 只返回用户有权读取的字段
    return this.permia.filterFields(userId, 'read', 'db:articles', article);
  }

  // 更新文章 — 写入时字段过滤
  async updateArticle(userId: string, articleId: string, payload: Record<string, unknown>) {
    // ① 检查集合级更新权限
    await this.permia.assert(userId, 'update', 'db:articles');

    // ② 过滤用户无权修改的字段
    const safePayload = await this.permia.filterFields(userId, 'update', 'db:articles', payload);

    // ③ 执行更新（permia 不参与此步骤）
    await this.db.collection('articles').updateOne(
      { _id: articleId },
      { $set: safePayload }
    );
  }

  // 创建文章
  async createArticle(userId: string, data: Record<string, unknown>) {
    // ① 检查集合级创建权限
    await this.permia.assert(userId, 'create', 'db:articles');

    // ② 过滤无权写入的字段
    const safeData = await this.permia.filterFields(userId, 'create', 'db:articles', data);

    // ③ 插入数据库
    return this.db.collection('articles').insertOne(safeData);
  }

  // 删除文章
  async deleteArticle(userId: string, articleId: string) {
    await this.permia.assert(userId, 'delete', 'db:articles');
    await this.db.collection('articles').deleteOne({ _id: articleId });
  }
}
```
