# 02 - 服务层（services/）详细方案
> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-26 P1-1 types 自动生成设计）
> **状态**: ✅ 已确认
> **依赖**: 目录结构（`00-directory-structure.md` ✅）、路由层（`01-routes.md` ✅）
---
## 0. 概述
服务层是 vextjs 框架的**业务逻辑层**，路由 handler 只调用 service 方法，不写业务逻辑。
```
HTTP Request
  → 路由 handler
  → app.services.xxx.method()   ← 服务层
  → 数据库 / 外部 API / 缓存
  → 返回结果给 handler
```
**核心设计决策**：
| 决策 | 结论 |
|------|------|
| 组织形式 | Class，每个文件一个 Service |
| 注入方式 | 构造函数接收 `app: VextApp`，显式组合，无继承要求 |
| 访问方式 | `app.services.user`（文件路径即 key，自动注册） |
| 基类 | **无强制基类**，用户可自由继承自己的基类或不继承 |
| 加载时机 | 启动时 `service-loader` 自动扫描实例化，无需手动注册 |
| 扫描规则 | `services/*.{ts,js,mjs,cjs}` 和 `services/**/*.{ts,js,mjs,cjs}`，默认导出 class |
| 命名规则 | 文件路径转嵌套 key：目录+文件名均转 camelCase（`payment/stripe.ts` → `app.services.payment.stripe`） |
---
## 1. 目录结构
```
src/services/
├── user.ts              → app.services.user
├── order.ts             → app.services.order
├── user-profile.ts      → app.services.userProfile
└── payment/
    ├── stripe.ts        → app.services.payment.stripe
    └── alipay.ts        → app.services.payment.alipay
```
> 同名文件在不同子目录下不产生冲突：`payment/order.ts`（`payment.order`）和 `order.ts`（`order`）互不干扰。
---
## 2. Service 文件写法

### 2.1 基本写法

`VextApp` 由框架声明为全局类型（无需 import），构造函数接收 `app` 即可：

```typescript
// src/services/user.ts
export default class UserService {
  constructor(private app: VextApp) {}

  async findAll(query: { page: number; limit: number }) {
    const { page, limit } = query
    const offset = (page - 1) * limit
    // this.app.db 由 db 插件注入，第一期未实现，此处为示意
    const [list, total] = await Promise.all([
      this.app.db.query('SELECT * FROM users LIMIT ? OFFSET ?', [limit, offset]),
      this.app.db.query('SELECT COUNT(*) FROM users'),
    ])
    return { list, total: total[0].count, page, limit }
  }

  async findById(id: string) {
    const [user] = await this.app.db.query(
      'SELECT * FROM users WHERE id = ?', [id]
    )
    if (!user) this.app.throw(404, '用户不存在')
    return user
  }

  async create(data: { name: string; email: string; password: string }) {
    const [exists] = await this.app.db.query(
      'SELECT id FROM users WHERE email = ?', [data.email]
    )
    if (exists) this.app.throw(409, '邮箱已被注册')

    this.app.logger.info('创建用户', { email: data.email })
    return this.app.db.query(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [data.name, data.email, hashPassword(data.password)]
    )
  }

  async update(id: string, data: { name?: string; email?: string }) {
    await this.findById(id)
    return this.app.db.query('UPDATE users SET ? WHERE id = ?', [data, id])
  }

  async remove(id: string) {
    await this.findById(id)
    await this.app.db.query('DELETE FROM users WHERE id = ?', [id])
  }
}
```

> - **零 import**：`VextApp` 是框架声明的全局类型（`vextjs/globals.d.ts`），无需任何 import
> - `this.app.throw(status, message, bizCode?)` **框架内置**，插件可覆盖（见 `06b-error.md`）
> - `this.app.logger` **框架内置** pino，插件可替换为其他实现
> - `this.app.db` 由 db 插件注入，第一期未实现，可先直接 import 第三方 ORM

### 2.2 Service 调用其他 Service

```typescript
// src/services/order.ts
export default class OrderService {
  constructor(private app: VextApp) {}

  async create(userId: string, items: OrderItem[]) {
    const user = await this.app.services.user.findById(userId)
    const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)
    this.app.logger.info('创建订单', { userId, total })
    return this.app.db.query(
      'INSERT INTO orders (user_id, total) VALUES (?, ?)',
      [user.id, total]
    )
  }
}
```

> **时序保证**：`service-loader` 全量加载所有 service 后才注册路由，`this.app.services.xxx` 调用时对方 service 必然已实例化。

> **⚠️ Hot Reload 安全**：Service 之间应**始终通过 `this.app.services.xxx` 动态访问**，
> 不要在构造函数中缓存其他 service 的直接引用。`vext dev` 的 Soft Reload 会选择性重建 service 实例，
> 如果缓存了旧引用，hot reload 后将使用过时的实例。
>
> ```ts
> // ❌ 错误：构造函数中缓存引用 → hot reload 后指向旧实例
> export default class OrderService {
>   private userSvc: UserService
>   constructor(app: VextApp) {
>     this.userSvc = app.services.user  // 旧引用！
>   }
> }
>
> // ✅ 正确：每次通过 app.services 动态访问 → 始终获取最新实例
> export default class OrderService {
>   constructor(private app: VextApp) {}
>   async create() {
>     await this.app.services.user.findById(id)  // 总是最新
>   }
> }
> ```
>
> 同理，如果 service 在构造函数中注册了 `setInterval`、`process.on` 等副作用，
> 应实现可选的 `dispose()` 方法供 hot reload 时清理（详见 `11e-edge-cases.md` §6）。

### 2.3 用户自定义基类（可选）

```typescript
// src/services/_base.ts — 用户自己定义，完全可控
export abstract class AppService {
  constructor(protected app: VextApp) {}

  protected get logger() {
    return this.app.logger.child({ service: this.constructor.name })
  }
}
```

```typescript
// src/services/user.ts — 选择性继承
import { AppService } from './_base'

export default class UserService extends AppService {
  async findById(id: string) {
    const [user] = await this.app.db.query('SELECT * FROM users WHERE id = ?', [id])
    if (!user) this.app.throw(404, '用户不存在')
    return user
  }
}
```

> `_base.ts` 以 `_` 开头，`service-loader` **自动跳过**，不会注册为 service。
---
## 3. 路由层调用 Service
```typescript
// src/routes/users.ts
import { defineRoutes } from 'vextjs'
export default defineRoutes((app) => {
  app.get('/', {
    validate: { query: { page: 'number:1-', limit: 'number:1-100' } },
    middlewares: ['auth'],
  }, async (req, res) => {
    const query = req.valid<{ page: number; limit: number }>('query')
    const data = await app.services.user.findAll(query)
    res.json(data)
  })
  app.post('/', {
    validate: {
      body: { name: 'string:1-50!', email: 'email!', password: 'string:8-!' },
    },
    middlewares: ['auth'],
    override:    { rateLimit: { max: 5, window: 60 } },  // 注册接口限流更严格
  }, async (req, res) => {
    const body = req.valid<{ name: string; email: string; password: string }>('body')
    const data = await app.services.user.create(body)
    res.json(data, 201)
  })
})
```
---
## 4. 框架内部：service-loader.ts
```typescript
// vextjs/lib/service-loader.ts（框架内部，用户不感知）
import { glob } from 'fast-glob'
import path from 'path'
export async function loadServices(app: VextApp, servicesDir: string): Promise<void> {
  const files = await glob('**/*.{ts,js,mjs,cjs}', {
    cwd:    servicesDir,
    ignore: ['**/*.d.ts', '**/*.test.ts', '**/*.test.js', '**/*.spec.ts', '**/*.spec.js', '**/_*.{ts,js,mjs,cjs}'],
  })
  for (const file of files) {
    const fullPath = path.join(servicesDir, file)
    const mod      = await import(fullPath)
    if (typeof mod.default !== 'function') {
      throw new Error(
        `[vextjs] ${file} must export default a class.\n` +
        `         Example: export default class UserService { constructor(app: VextApp) {} }`
      )
    }
    const keys = filePathToServiceKeys(file)
    setNestedKey(app.services as Record<string, unknown>, keys, new mod.default(app))
  }
}
function filePathToServiceKeys(filePath: string): string[] {
  // payment/stripe.ts  → ['payment', 'stripe']
  // user-profile.ts    → ['userProfile']
  return filePath
    .replace(/\.(ts|js|mjs|cjs)$/, '')
    .split('/')
    .map(seg => seg.replace(/-([a-z])/g, (_, c) => c.toUpperCase()))
}
function setNestedKey(obj: Record<string, unknown>, keys: string[], value: unknown) {
  let cur = obj
  for (let i = 0; i < keys.length - 1; i++) {
    if (cur[keys[i]] === undefined) cur[keys[i]] = {}
    cur = cur[keys[i]] as Record<string, unknown>
  }
  const last = keys[keys.length - 1]
  if (cur[last] !== undefined) {
    throw new Error(
      `[vextjs] Service key "${keys.join('.')}" is already registered.\n` +
      `         Rename the file to resolve the conflict.`
    )
  }
  cur[last] = value
}
```
---
## 5. app.services 类型安全
```typescript
// src/types/services.d.ts
import type UserService        from '../services/user'
import type OrderService       from '../services/order'
import type UserProfileService from '../services/user-profile'
import type StripeService      from '../services/payment/stripe'
import type AlipayService      from '../services/payment/alipay'
declare module 'vextjs' {
  interface VextServices {
    user:        UserService
    order:       OrderService
    userProfile: UserProfileService
    payment: {
      stripe: StripeService
      alipay: AlipayService
    }
  }
}
```
```typescript
// vextjs/lib/app.ts（框架内部）
export interface VextServices {}   // 用户通过 declare module 扩展
```

> `VextApp` 完整接口定义、`globals.d.ts` 全局类型声明、`app.extend()` / `app.onClose()` 详解见 **`06-built-ins.md`**。

### 5.1 自动生成 `types/services.d.ts`（P1-1）

手动维护 `types/services.d.ts` 容易遗漏和出错。框架提供**两种自动生成方式**：

#### 方式 A：`vext dev` 自动生成（推荐，零操作）

`vext dev` 启动时和每次 service 文件变更时，自动扫描 `src/services/` 并重新生成 `src/types/services.d.ts`：

```
vext dev 启动
  ↓
service-loader 扫描 services/ 目录
  ↓
generateServiceTypes(servicesDir, typesDir)  ← 自动生成
  ↓
文件监听（Soft Reload）
  ↓ services/ 文件变更
再次调用 generateServiceTypes()  ← 自动更新
```

#### 方式 B：`vext generate:types` CLI 命令（手动触发）

```bash
# 一次性生成（CI/CD 或初始化时使用）
vext generate:types
```

#### 生成逻辑

```typescript
// vextjs/lib/generate-service-types.ts（框架内部）
import { glob } from 'fast-glob'
import path from 'path'
import fs from 'node:fs'

export async function generateServiceTypes(
  servicesDir: string,
  outputPath: string,
): Promise<void> {
  const files = await glob('**/*.{ts,js,mjs,cjs}', {
    cwd: servicesDir,
    ignore: ['**/*.d.ts', '**/*.test.*', '**/*.spec.*', '**/_*.*'],
  })

  if (files.length === 0) return

  const imports: string[] = []
  const fields: string[] = []

  for (const file of files.sort()) {
    const keys = filePathToServiceKeys(file)
    const className = inferClassName(file)
    const relativePath = '../services/' + file.replace(/\.(ts|js|mjs|cjs)$/, '')

    imports.push(`import type ${className} from '${relativePath}'`)
    buildNestedField(fields, keys, className)
  }

  const content = [
    '// Auto-generated by vext — DO NOT EDIT',
    '// Re-run: vext generate:types',
    '',
    ...imports,
    '',
    "declare module 'vextjs' {",
    '  interface VextServices {',
    ...fields.map(f => '    ' + f),
    '  }',
    '}',
    '',
  ].join('\n')

  // 仅在内容变更时写入（避免触发不必要的 TS 重编译）
  const existing = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, 'utf-8') : ''
  if (existing !== content) {
    fs.writeFileSync(outputPath, content, 'utf-8')
  }
}
```

#### 生成结果示例

```typescript
// src/types/services.d.ts — Auto-generated by vext — DO NOT EDIT
// Re-run: vext generate:types

import type UserService from '../services/user'
import type OrderService from '../services/order'
import type UserProfileService from '../services/user-profile'
import type StripeService from '../services/payment/stripe'
import type AlipayService from '../services/payment/alipay'

declare module 'vextjs' {
  interface VextServices {
    user: UserService
    order: OrderService
    userProfile: UserProfileService
    payment: {
      stripe: StripeService
      alipay: AlipayService
    }
  }
}
```

#### 行为说明

| 场景 | 行为 |
|------|------|
| `vext dev` 启动 | 自动生成/更新 `types/services.d.ts` |
| service 文件新增/删除/重命名 | Soft Reload 时自动重新生成 |
| service 文件内容修改（不改文件名） | 不重新生成（类型声明不变） |
| `types/services.d.ts` 已存在且是手动维护的 | 覆盖（文件头注释标记为 auto-generated） |
| `services/` 目录为空 | 不生成文件 |
| JS 项目 | 不生成（JS 不需要类型声明） |

> **设计取舍**：自动生成只处理 service 的"key → class"映射，不深入分析 service 内部方法签名。
> 这是因为 TypeScript 的 `import type` 已经能获取完整的 class 方法签名，auto-gen 只需要解决"有哪些 service"的问题。

---
## 6. 错误处理

通过 `this.app.throw(status, message, bizCode?)` 抛出 HTTP 错误：

```typescript
this.app.throw(404, '用户不存在')            // { code: 404,   message, requestId }
this.app.throw(409, '邮箱已被注册')          // { code: 409,   message, requestId }
this.app.throw(403, '无权访问')             // { code: 403,   message, requestId }
this.app.throw(400, '邮箱已注册', 10001)    // { code: 10001, message, requestId }（业务码）
```

> `app.throw` **框架内置**（见 `06b-error.md`），第三个参数为可选业务错误码，不传则响应 `code = HTTP status`。

> `app.throw` **框架内置**（默认 `throw new HttpError(code, message)`），插件可覆盖来定制行为（如加业务错误码前缀、触发告警上报等）。

---
## 7. Fail Fast 验证
| 检测项 | 错误示例 |
|-------|---------|
| 文件无默认导出或导出非 class | `user.ts must export default a class` |
| key 冲突 | `Service key "user" is already registered` |
---
## 8. 与路由层的边界

| 职责 | 路由 handler | Service |
|------|-------------|---------|
| 读取请求数据 | ✅ `req.valid()` | ❌ |
| 调用 service | ✅ `app.services.xxx` | ❌ |
| 业务逻辑 | ❌ | ✅ |
| 数据库访问 | ❌ | ✅ `this.app.db` |
| 调用其他 service | ❌ | ✅ `this.app.services.xxx` |
| 返回响应 | ✅ `res.json()` | ❌ |
| 抛出业务错误 | ❌ | ✅ `this.app.throw()` |

---
## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|-------|---------|------|
| `VextApp` | `vextjs/lib/app.ts` | 应用对象（全局类型，无需 import），service 构造函数接收此类型 |
| `VextServices` | `vextjs/lib/app.ts` | `app.services` 类型（用户通过 `declare module` 扩展） |
| `VextLogger` | `vextjs/lib/logger.ts` | 结构化日志接口（`info/warn/error/debug/child`） |
