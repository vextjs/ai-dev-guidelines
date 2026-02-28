# 10 - 测试策略（Testing）

> **项目**: vext
> **日期**: 2026-02-26
> **状态**: ✅ 已确认
> **依赖**: 路由层（`01-routes.md` ✅）、服务层（`02-services.md` ✅）、插件系统（`04-plugins.md` ✅）、内置模块（`06-built-ins.md` ✅）

---

## 0. 设计原则

- **零配置起步**：`createTestApp()` 一行创建测试用 app，无需手动组装
- **分层测试**：Service 单元测试 → 路由集成测试 → 端到端测试，逐层递进
- **与框架解耦**：测试工具不绑定特定 test runner，兼容 vitest / jest / node:test
- **确定性优先**：默认禁用外部 I/O（数据库 / Redis），通过 mock 或 test fixtures 注入

---

## 1. 测试目录结构

```
my-app/
├── src/
│   ├── routes/
│   ├── services/
│   ├── middlewares/
│   ├── plugins/
│   └── config/
│
├── test/                         # 测试根目录
│   ├── unit/                     # 单元测试（Service / 工具函数）
│   │   ├── services/
│   │   │   ├── user.test.ts
│   │   │   └── order.test.ts
│   │   └── utils/
│   │       └── helpers.test.ts
│   │
│   ├── integration/              # 集成测试（路由 + 中间件 + Service 联动）
│   │   ├── routes/
│   │   │   ├── users.test.ts
│   │   │   └── orders.test.ts
│   │   └── plugins/
│   │       └── database.test.ts
│   │
│   ├── e2e/                      # 端到端测试（完整启动 → HTTP 请求）
│   │   └── api.test.ts
│   │
│   ├── fixtures/                 # 测试数据 / mock 工厂
│   │   ├── users.ts
│   │   └── orders.ts
│   │
│   └── helpers/                  # 测试辅助函数
│       ├── setup.ts              # 全局 setup / teardown
│       └── mock-services.ts      # Service mock 工厂
│
├── vitest.config.ts              # 推荐 vitest（或 jest.config.ts）
└── package.json
```

**约定**：
- 测试文件统一使用 `.test.ts` / `.test.js` 后缀
- `test/` 目录不参与框架扫描（router-loader / service-loader / plugin-loader 自动排除）
- `src/` 内部不放测试文件（扫描器排除 `*.test.*` / `*.spec.*`，但推荐统一放 `test/`）

---

## 2. `createTestApp()` — 测试用 App 工厂

### 2.1 接口

```typescript
// vextjs/testing
import { createTestApp } from 'vextjs/testing'

interface CreateTestAppOptions {
  /**
   * 覆盖默认配置（深度合并到 test 默认配置之上）
   */
  config?: Partial<VextConfig>

  /**
   * 是否加载 src/plugins/（默认 false — 测试环境默认不加载插件）
   */
  plugins?: boolean

  /**
   * 手动注册插件（替代自动扫描，精确控制测试依赖）
   */
  setupPlugins?: (app: VextApp) => Promise<void> | void

  /**
   * 是否加载 src/services/（默认 true）
   */
  services?: boolean

  /**
   * 手动注入 mock services（覆盖 service-loader 扫描结果）
   */
  mockServices?: Partial<VextServices>

  /**
   * 是否加载 src/routes/（默认 true — 集成测试需要路由）
   */
  routes?: boolean

  /**
   * 是否加载 src/middlewares/（默认 true）
   */
  middlewares?: boolean
}

interface TestApp {
  /** 底层 VextApp 实例 */
  app: VextApp

  /**
   * 发送模拟 HTTP 请求（无需启动 HTTP 服务器）
   * 类似 supertest 的 API 风格
   */
  request: TestRequest

  /**
   * 关闭 test app（触发 onClose 钩子、清理资源）
   * 务必在 afterEach / afterAll 中调用
   */
  close(): Promise<void>
}

function createTestApp(options?: CreateTestAppOptions): Promise<TestApp>
```

### 2.2 默认行为

`createTestApp()` 的默认配置专为测试优化：

| 配置项 | 测试默认值 | 说明 |
|--------|-----------|------|
| `port` | `0`（随机端口） | 避免端口冲突 |
| `logger.level` | `'silent'` | 测试输出不被日志污染 |
| `logger.pretty` | `false` | — |
| `rateLimit.enabled` | `false` | 测试不需要限流 |
| `healthCheck.enabled` | `false` | 测试不需要健康检查端点 |
| `plugins` | `false` | 默认不加载用户插件（避免外部 I/O） |
| `shutdown.timeout` | `1000` | 快速关闭 |

### 2.3 基本用法

```typescript
import { describe, it, expect, afterAll } from 'vitest'
import { createTestApp } from 'vextjs/testing'

describe('GET /users', () => {
  const t = await createTestApp({
    routes: true,
    mockServices: {
      user: {
        findAll: async () => ({ list: [{ id: 1, name: 'Alice' }], total: 1 }),
      },
    },
  })

  afterAll(() => t.close())

  it('returns user list', async () => {
    const res = await t.request.get('/users/list').query({ page: 1, limit: 10 })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      code: 0,
      data: { list: [{ id: 1, name: 'Alice' }], total: 1 },
      requestId: expect.any(String),
    })
  })

  it('returns 422 on invalid query', async () => {
    const res = await t.request.get('/users/list').query({ page: -1 })

    expect(res.status).toBe(422)
    expect(res.body.code).toBe(422)
    expect(res.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: 'page' }),
      ])
    )
  })
})
```

---

## 3. Service 单元测试

Service 是纯业务逻辑，测试时只需注入 mock 的 `app` 对象。

### 3.1 直接实例化

```typescript
// test/unit/services/user.test.ts
import { describe, it, expect } from 'vitest'
import { UserService } from '../../../src/services/user'

describe('UserService', () => {
  // 构造最小化的 mock app
  const mockApp = {
    config: { database: { url: 'mock' } },
    logger: { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} },
    throw: (status: number, message: string) => {
      const err = new Error(message) as any
      err.status = status
      throw err
    },
    services: {},
    db: {
      select: () => ({ from: () => ({ where: () => Promise.resolve([]) }) }),
    },
  } as unknown as VextApp

  const service = new UserService(mockApp)

  it('findAll returns empty list', async () => {
    const result = await service.findAll({ page: 1, limit: 10 })
    expect(result).toEqual({ list: [], total: 0 })
  })

  it('create returns new user', async () => {
    const result = await service.create({
      name: 'Alice',
      email: 'alice@example.com',
      password: '12345678',
    })
    expect(result).toHaveProperty('id')
    expect(result.name).toBe('Alice')
  })
})
```

### 3.2 使用 `createTestApp` 获取真实 Service

```typescript
// test/unit/services/user.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { createTestApp } from 'vextjs/testing'

describe('UserService (via createTestApp)', () => {
  const t = await createTestApp({
    services: true,
    routes: false,         // 单元测试不需要路由
    middlewares: false,    // 单元测试不需要中间件
    setupPlugins: async (app) => {
      // 注入 mock db
      app.extend('db', createMockDb())
    },
  })

  afterAll(() => t.close())

  it('findAll delegates to db', async () => {
    const result = await t.app.services.user.findAll({ page: 1, limit: 10 })
    expect(result).toBeDefined()
  })
})
```

---

## 4. 路由集成测试

集成测试验证完整的请求链路：HTTP 请求 → 中间件 → validate → handler → Service → 响应。

### 4.1 使用 `t.request`

`t.request` 提供类 supertest 的 API，**无需启动真实 HTTP 服务器**（内部直接调用 adapter 的请求处理链）：

```typescript
// test/integration/routes/users.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createTestApp } from 'vextjs/testing'

describe('Users API', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>

  beforeAll(async () => {
    t = await createTestApp({
      routes: true,
      middlewares: true,
      mockServices: {
        user: {
          findAll: async () => ({ list: [], total: 0 }),
          create:  async (data: any) => ({ id: 1, ...data }),
          findById: async (id: string) => (id === '1' ? { id: '1', name: 'Alice' } : null),
        },
      },
    })
  })

  afterAll(() => t.close())

  describe('GET /users/list', () => {
    it('returns 200 with user list', async () => {
      const res = await t.request
        .get('/users/list')
        .query({ page: 1, limit: 10 })

      expect(res.status).toBe(200)
      expect(res.body.code).toBe(0)
      expect(res.body.data).toHaveProperty('list')
      expect(res.body).toHaveProperty('requestId')
    })

    it('returns 422 on missing required params', async () => {
      const res = await t.request.get('/users/list')
      // 取决于 validate schema 是否要求 page/limit
      expect([200, 422]).toContain(res.status)
    })
  })

  describe('POST /users', () => {
    it('creates user and returns 201', async () => {
      const res = await t.request
        .post('/users')
        .send({
          name: 'Bob',
          email: 'bob@example.com',
          password: '12345678',
        })

      expect(res.status).toBe(201)
      expect(res.body.code).toBe(0)
      expect(res.body.data).toMatchObject({ name: 'Bob' })
    })

    it('returns 422 on invalid email', async () => {
      const res = await t.request
        .post('/users')
        .send({ name: 'Bob', email: 'not-an-email', password: '12345678' })

      expect(res.status).toBe(422)
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
        ])
      )
    })
  })
})
```

### 4.2 测试中间件行为

```typescript
describe('Auth middleware', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>

  beforeAll(async () => {
    t = await createTestApp({
      routes: true,
      middlewares: true,
      mockServices: {
        user: { findAll: async () => ({ list: [], total: 0 }) },
      },
    })
  })

  afterAll(() => t.close())

  it('returns 401 without Authorization header', async () => {
    const res = await t.request.get('/users/list')
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/unauthorized/i)
  })

  it('returns 200 with valid token', async () => {
    const res = await t.request
      .get('/users/list')
      .set('Authorization', 'Bearer valid-test-token')
      .query({ page: 1, limit: 10 })

    expect(res.status).toBe(200)
  })
})
```

### 4.3 测试自定义错误

```typescript
describe('Error handling', () => {
  let t: Awaited<ReturnType<typeof createTestApp>>

  beforeAll(async () => {
    t = await createTestApp({
      routes: true,
      mockServices: {
        user: {
          findById: async () => {
            // 模拟 Service 抛出业务错误
            throw Object.assign(new Error('用户不存在'), { status: 404 })
          },
        },
      },
    })
  })

  afterAll(() => t.close())

  it('returns formatted error response', async () => {
    const res = await t.request.get('/users/999')
    expect(res.status).toBe(404)
    expect(res.body).toMatchObject({
      code: 404,
      message: expect.any(String),
      requestId: expect.any(String),
    })
  })
})
```

---

## 5. 插件测试

### 5.1 测试自定义插件

```typescript
// test/integration/plugins/database.test.ts
import { describe, it, expect, afterAll } from 'vitest'
import { createTestApp } from 'vextjs/testing'

describe('Database plugin', () => {
  const t = await createTestApp({
    routes: false,
    services: false,
    config: {
      database: { url: 'postgres://localhost:5432/test_db' },
    },
    setupPlugins: async (app) => {
      // 加载真实的 database 插件
      const dbPlugin = (await import('../../../src/plugins/database')).default
      await dbPlugin.setup(app)
    },
  })

  afterAll(() => t.close())   // ← 触发 onClose，验证 pool.end() 被调用

  it('injects app.db', () => {
    expect(t.app.db).toBeDefined()
  })

  it('can query database', async () => {
    const result = await t.app.db.execute('SELECT 1 as n')
    expect(result).toBeDefined()
  })
})
```

### 5.2 验证插件 onClose 清理

```typescript
import { describe, it, expect, vi } from 'vitest'
import { createTestApp } from 'vextjs/testing'

describe('Plugin cleanup', () => {
  const mockEnd = vi.fn()

  it('calls onClose handlers on close()', async () => {
    const t = await createTestApp({
      routes: false,
      services: false,
      setupPlugins: async (app) => {
        app.onClose(mockEnd)
      },
    })

    await t.close()
    expect(mockEnd).toHaveBeenCalledOnce()
  })
})
```

---

## 6. `TestRequest` API

`t.request` 返回一个链式 API，支持以下方法：

```typescript
interface TestRequest {
  get(path: string):     TestRequestBuilder
  post(path: string):    TestRequestBuilder
  put(path: string):     TestRequestBuilder
  patch(path: string):   TestRequestBuilder
  delete(path: string):  TestRequestBuilder
  options(path: string): TestRequestBuilder
  head(path: string):    TestRequestBuilder
}

interface TestRequestBuilder {
  /** 设置请求头 */
  set(key: string, value: string): this

  /** 设置多个请求头 */
  headers(headers: Record<string, string>): this

  /** 设置 query 参数 */
  query(params: Record<string, string | number | boolean>): this

  /** 设置请求体（自动序列化为 JSON，设置 Content-Type） */
  send(body: unknown): this

  /** 设置 Content-Type */
  type(contentType: string): this

  /** 执行请求并返回响应（隐式 await） */
  then(resolve: (res: TestResponse) => void, reject?: (err: Error) => void): void
}

interface TestResponse {
  status:  number
  headers: Record<string, string>
  body:    any                     // 自动解析 JSON
  text:    string                  // 原始响应文本
}
```

**实现说明**：`TestRequest` 内部不启动 HTTP 服务器，而是直接构造 `VextRequest` / `VextResponse` 对象并传入 adapter 的请求处理链。这比 supertest 更快（无网络 I/O），且可在 CI 中并行运行无端口冲突。

---

## 7. Mock 与 Fixture 最佳实践

### 7.1 Mock Service 工厂

```typescript
// test/helpers/mock-services.ts
import type { UserService } from '../../src/services/user'
import type { OrderService } from '../../src/services/order'

export function createMockUserService(overrides?: Partial<UserService>): UserService {
  return {
    findAll:  async () => ({ list: [], total: 0 }),
    findById: async () => null,
    create:   async (data) => ({ id: '1', ...data }),
    update:   async (id, data) => ({ id, ...data }),
    delete:   async () => {},
    ...overrides,
  } as UserService
}

export function createMockOrderService(overrides?: Partial<OrderService>): OrderService {
  return {
    findByUser: async () => [],
    create:     async (data) => ({ id: '1', ...data }),
    ...overrides,
  } as OrderService
}
```

### 7.2 Fixture 数据

```typescript
// test/fixtures/users.ts
export const validUser = {
  name: 'Alice',
  email: 'alice@example.com',
  password: 'securePassword123',
}

export const invalidUser = {
  name: '',           // 太短
  email: 'not-email', // 无效邮箱
  password: '123',    // 太短
}

export const existingUser = {
  id: '1',
  name: 'Alice',
  email: 'alice@example.com',
  createdAt: new Date('2026-01-01'),
}
```

### 7.3 全局 Setup / Teardown

```typescript
// test/helpers/setup.ts（vitest 全局 setup）
import { createTestApp } from 'vextjs/testing'

let testApp: Awaited<ReturnType<typeof createTestApp>>

export async function setup() {
  // 全局共享的 test app（适合大型项目减少初始化开销）
  testApp = await createTestApp({ routes: true, services: true })
  return testApp
}

export async function teardown() {
  await testApp?.close()
}
```

---

## 8. 推荐的 Test Runner 配置

### 8.1 Vitest（推荐）

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // 测试文件 glob
    include: ['test/**/*.test.{ts,js}'],

    // 全局 setup
    globalSetup: ['test/helpers/setup.ts'],

    // 超时（单个测试）
    testTimeout: 10_000,

    // 并行执行（Service 单元测试可并行，集成测试按需串行）
    pool: 'forks',

    // 环境
    env: {
      NODE_ENV: 'test',
    },
  },
})
```

```json
// package.json
{
  "scripts": {
    "test":       "vitest run",
    "test:watch": "vitest",
    "test:unit":  "vitest run test/unit",
    "test:int":   "vitest run test/integration",
    "test:e2e":   "vitest run test/e2e",
    "test:cov":   "vitest run --coverage"
  }
}
```

### 8.2 Jest（备选）

```typescript
// jest.config.ts
import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/**/*.test.ts'],
  setupFilesAfterSetup: ['<rootDir>/test/helpers/setup.ts'],
  testTimeout: 10_000,
}

export default config
```

### 8.3 Node.js 内置 Test Runner（轻量选择）

```typescript
// test/unit/services/user.test.ts
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { UserService } from '../../src/services/user.ts'

describe('UserService', () => {
  it('findAll returns empty list', async () => {
    const service = new UserService(mockApp)
    const result = await service.findAll({ page: 1, limit: 10 })
    assert.deepStrictEqual(result, { list: [], total: 0 })
  })
})
```

```json
{
  "scripts": {
    "test": "node --test --experimental-strip-types test/**/*.test.ts"
  }
}
```

---

## 9. CI 集成指南

### 9.1 GitHub Actions 示例

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [20, 22]

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - run: npm ci

      # 单元测试（无外部依赖，始终运行）
      - name: Unit tests
        run: npm run test:unit

      # 集成测试（无外部依赖，使用 mock）
      - name: Integration tests
        run: npm run test:int

      # 覆盖率报告
      - name: Coverage
        run: npm run test:cov
        if: matrix.node-version == 22

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        if: matrix.node-version == 22
        with:
          files: coverage/lcov.info
```

### 9.2 带数据库的 E2E 测试

```yaml
  e2e:
    runs-on: ubuntu-latest
    needs: test

    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: 'npm'
      - run: npm ci
      - name: E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgres://test:test@localhost:5432/test_db
          NODE_ENV: test
```

---

## 10. 测试分层策略总结

| 层级 | 测试对象 | 外部依赖 | `createTestApp` 配置 | 运行速度 |
|------|---------|---------|----------------------|----------|
| **单元测试** | Service 方法、工具函数 | 无（全 mock） | `{ routes: false, mockServices: {...} }` 或直接 `new Service(mockApp)` | ⚡ 极快 |
| **集成测试** | 路由 → 中间件 → Service 链路 | 无（mock services） | `{ routes: true, middlewares: true, mockServices: {...} }` | ⚡ 快 |
| **E2E 测试** | 完整应用 + 真实数据库 | 数据库 / Redis | `{ plugins: true }` + 真实配置 | 🐢 较慢 |

**推荐比例**（测试金字塔）：

```
        /  E2E  \          ~10%
       /  集成   \         ~30%
      /  单元测试  \        ~60%
```

---

## 11. `createTestApp` 内部实现概览

```typescript
// vextjs/testing/index.ts（框架内部）
import { createApp }        from '../lib/app'
import { loadServices }     from '../lib/service-loader'
import { loadMiddlewares }  from '../lib/middleware-loader'
import { loadRoutes }       from '../lib/router-loader'

const TEST_DEFAULTS: Partial<VextConfig> = {
  port:        0,
  logger:      { level: 'silent', pretty: false },
  rateLimit:   { enabled: false },
  healthCheck: { enabled: false },
  shutdown:    { timeout: 1000 },
  _testMode:   true,   // ← 阻止 shutdown() 调用 process.exit(0)，见 06-built-ins.md §4
}

export async function createTestApp(options: CreateTestAppOptions = {}): Promise<TestApp> {
  const {
    config:        userConfig   = {},
    plugins:       loadPlugins  = false,
    setupPlugins,
    services:      loadSvc      = true,
    mockServices,
    routes:        loadRt       = true,
    middlewares:    loadMw       = true,
  } = options

  // ── 1. 合并测试默认配置 + 用户覆盖 ────────────────────
  const finalConfig = deepMerge(
    deepMerge(getDefaultConfig(), TEST_DEFAULTS),
    userConfig,
  ) as VextConfig

  // ── 2. 创建 app ──────────────────────────────────────
  const { app, internals } = createApp(finalConfig)

  // ── 3. 插件 ──────────────────────────────────────────
  if (setupPlugins) {
    await setupPlugins(app)
  } else if (loadPlugins) {
    const { loadPlugins: lp } = await import('../lib/plugin-loader')
    await lp(app, resolve('src/plugins'))
  }

  // ── 4. 中间件 ────────────────────────────────────────
  let middlewareRegistry
  if (loadMw && finalConfig.middlewares?.length) {
    middlewareRegistry = await loadMiddlewares(
      resolve('src/middlewares'),
      finalConfig.middlewares,
      app.logger,
    )
  }

  // ── 5. Services ──────────────────────────────────────
  if (loadSvc) {
    await loadServices(app, resolve('src/services'))
  }
  // mock services 覆盖（后执行，优先级更高）
  if (mockServices) {
    Object.assign(app.services, mockServices)
  }

  // ── 6. Routes ────────────────────────────────────────
  if (loadRt) {
    await loadRoutes(app, resolve('src/routes'), {
      middlewareDefs: middlewareRegistry,
      globalMiddlewares: internals.getGlobalMiddlewares(),
    })
    internals.lockUse()   // 测试环境也需锁定，保持行为一致
  }

  // ── 7. 构造 TestRequest ──────────────────────────────
  const request = createTestRequest(app)

  return {
    app,
    request,
    async close() {
      // 触发所有 onClose 钩子（测试环境无 server，不传 serverHandle）
      // ⚠️ 因为 config._testMode = true，shutdown() 内部不会调用 process.exit(0)，
      //    允许测试进程继续运行后续用例。详见 06-built-ins.md §4 createApp.shutdown()。
      await internals.shutdown()
    },
  }
}
```

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|-------|---------|------|
| `CreateTestAppOptions` | `vextjs/testing` | 测试 App 创建选项 |
| `TestApp` | `vextjs/testing` | 测试 App 实例（含 `request` 和 `close()`） |
| `TestRequest` | `vextjs/testing` | HTTP 请求模拟器 |
| `TestRequestBuilder` | `vextjs/testing` | 链式请求构造器 |
| `TestResponse` | `vextjs/testing` | 响应对象 |