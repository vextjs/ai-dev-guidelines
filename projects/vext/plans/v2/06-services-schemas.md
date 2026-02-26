# 06 - services & schemas 自动注入 & 类型安全

## 核心目标

v1 中 services/schemas 以 `Record<string, any>` 注入，路由文件无类型提示。
v2 通过 TypeScript 泛型推导，让 `services.api.users.findAll()` 有完整的类型提示。

---

## 自动扫描注入（与 v1 逻辑相同）

```typescript
// core/context-loader.ts（与 v1 保持一致）
import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'

export function scanModules(
  dir: string,
  mode: 'firstExport' | 'wholeModule' = 'firstExport'
): Record<string, any> {
  const result: Record<string, any> = {}

  for (const file of collectFiles(dir)) {
    const rel   = relative(dir, file).replace(/\\/g, '/').replace(/\.(ts|js|mjs)$/, '')
    const parts = rel.split('/')
    const mod   = require(file)
    const value = mode === 'wholeModule'
      ? mod
      : (mod.default ?? mod[Object.keys(mod)[0]] ?? {})

    let current = result
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = current[parts[i]] ?? {}
      current = current[parts[i]]
    }
    current[parts[parts.length - 1]] = value
  }

  return result
}

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    statSync(full).isDirectory()
      ? collectFiles(full, files)
      : /\.(ts|js|mjs)$/.test(name) && files.push(full)
  }
  return files
}
```

---

## 类型安全方案

### 方案：类型声明文件（推荐）

用户在项目中创建一个类型声明文件，一次声明，全局生效。

**步骤 1：在 `types/index.ts` 中声明模块类型**

```typescript
// src/types/index.ts
import type { UsersService }  from '@/services/api/users'
import type { PostsService }  from '@/services/api/posts'
import type * as UsersSchemas from '@/schemas/users'
import type * as PostsSchemas from '@/schemas/posts'

declare module 'vext' {
  interface AppServices {
    api: {
      users: UsersService
      posts: PostsService
    }
  }

  interface AppSchemas {
    users: typeof UsersSchemas
    posts: typeof PostsSchemas
  }
}
```

**步骤 2：vext 核心通过声明合并提供类型**

```typescript
// core/types.ts（vext 内部）

/** 用户通过 declare module 'vext' 扩展 */
export interface AppServices {}
export interface AppSchemas  {}

/** defineRoutes 的 RouteContext 使用合并后的类型 */
export type RouteContextTyped = {
  app:      WrappedRouter
  services: AppServices
  schemas:  AppSchemas
}
```

**步骤 3：defineRoutes 自动获得类型提示**

```typescript
// routes/api/users.ts
export default defineRoutes(({ app, services, schemas }) => {
  //                                  ^^^^^^^^ 类型：AppServices（含完整 api.users 类型）
  //                                                    ^^^^^^^ 类型：AppSchemas（含完整 users 类型）

  app.get('/list', {
    validate: { query: schemas.users.getUsersQuerySchema },
    //                 ^^^^^^^^^^^^  ✅ 有类型提示
  }, async (ctx) => {
    const data = await services.api.users.findAll(...)
    //                           ^^^^^    ✅ 有完整方法类型提示
    return ctx.res.json({ data })
  })
})
```

---

## services 示例（class 封装，与 v1 一致）

```typescript
// services/api/users.ts
import * as UserModel    from '@/models/mysql/main/users'
import * as SessionModel from '@/models/redis/default/session'
import { AppError, getRequestContext } from 'vext'
import type { CreateUserInput, UpdateUserInput } from '@/schemas/users'

export class UsersService {
  async findAll(opts: { page: number; limit: number }) {
    const { requestId } = getRequestContext() ?? {}
    console.log(`[${requestId}] findAll`)
    return UserModel.paginate(opts)
  }

  async findById(id: string) {
    const user = await UserModel.findById(id)
    if (!user) throw new AppError(404, 'User not found', 'USER_NOT_FOUND')
    return user
  }

  async create(data: CreateUserInput) {
    const exists = await UserModel.findByEmail(data.email)
    if (exists) throw new AppError(409, 'Email already exists', 'EMAIL_EXISTS')
    return UserModel.create(data)
  }

  async update(id: string, data: UpdateUserInput) {
    await this.findById(id)
    return UserModel.update(id, data)
  }

  async remove(id: string) {
    await this.findById(id)
    return UserModel.remove(id)
  }

  async login(email: string, password: string) {
    const user = await UserModel.findByEmail(email)
    if (!user) throw new AppError(401, 'Invalid credentials', 'INVALID_CREDENTIALS')
    const token = generateToken(user)
    await SessionModel.setSession(`session:${user.id}`, token, 7200)

    // 登录成功后写入请求上下文
    setRequestContextField('userId', user.id)
    return { user, token }
  }
}

// 导出单例（启动时自动扫描注入）
export default new UsersService()
```

---

## schemas 示例（与 v1 一致）

```typescript
// schemas/users.ts
import { z } from 'zod'

export const userIdParamSchema = z.object({
  id: z.string().min(1),
})

export const createUserSchema = z.object({
  name:     z.string().min(1).max(50),
  email:    z.string().email(),
  password: z.string().min(8),
})

export const updateUserSchema = createUserSchema.partial().omit({ password: true })

export const getUsersQuerySchema = z.object({
  page:  z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
})

export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
```

---

## 跨 service 调用

services 是全量嵌套对象，在路由文件中直接点号调用：

```typescript
// routes/api/orders.ts
export default defineRoutes(({ app, services, schemas }) => {

  app.post('/', {
    middlewares: ['auth'],
    validate: { body: schemas.orders.createOrderSchema },
    docs: { summary: '创建订单', tags: ['orders'] },
  }, async (ctx) => {
    const body = ctx.req.valid('json')

    // 跨 service 调用（services 包含所有模块）
    const user = await services.api.users.findById(body.userId)
    const data = await services.api.orders.create({ ...body, userName: user.name })

    return ctx.res.json({ data }, 201)
  })

})
```

service 内部跨调用（不通过 routes 注入，直接 import）：

```typescript
// services/api/orders.ts
import { usersService } from './users'   // 直接 import 单例，不通过注入

export class OrdersService {
  async create(data: CreateOrderInput) {
    // 直接使用，无需从 defineRoutes 注入
    const user = await usersService.findById(data.userId)
    // ...
  }
}
```

