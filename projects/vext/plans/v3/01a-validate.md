
# 01a - 校验体系（validate）

> **项目**: vext
> **日期**: 2026-02-26
> **状态**: ✅ 已确认
> **所属模块**: 路由层 → `01-routes.md`
> **依赖**: schema-dsl（`dsl()` + `validate()`）

---

## 1. 用户写法（零 import）

用户直接在 `options.validate` 中写 schema-dsl DSL 对象，**无需 import schema-dsl**，框架内部统一处理编译与执行：

```typescript
app.post('/', {
  validate: {
    query: {
      page:  'number:1-',
      limit: 'number:1-100',
    },
    body: {
      name:     'string:1-50!',
      email:    'email!',
      password: 'string:8-!',
    },
    param: {
      id: 'string!',
    },
    header: {
      'x-request-id': 'string',
    },
  },
}, async (req, res) => { ... })
```

---

## 2. DSL 语法速查

| DSL 字符串 | 含义 |
|-----------|------|
| `'string'` | 可选字符串 |
| `'string!'` | 必填字符串 |
| `'string:1-50!'` | 必填，长度 1–50 |
| `'string:32-!'` | 必填，最少 32 字符 |
| `'number'` | 可选数字 |
| `'number!'` | 必填数字 |
| `'number:1-'` | 必填，最小值 1 |
| `'number:1-100'` | 必填，值范围 1–100 |
| `'number:1-65535'` | 必填，端口范围 |
| `'email!'` | 必填，邮箱格式 |
| `'url'` | 可选 URL 格式 |
| `'boolean'` | 可选布尔值 |
| `'boolean!'` | 必填布尔值 |
| `'array!'` | 必填数组 |

> 完整语法见 schema-dsl 文档，此处仅列路由场景常用规则。

---

## 3. validate 字段说明

| 字段 | 对应数据来源 | 典型使用场景 |
|------|------------|------------|
| `query` | URL 查询参数（`?page=1`） | 分页、过滤、排序 |
| `body` | 请求体 JSON | 创建、更新资源 |
| `param` | 路径动态参数（`/:id`） | 资源 ID、路由段 |
| `header` | 请求头 | Token、追踪 ID |

所有字段均为可选，按需配置。

---

## 4. 框架内部处理流程

```
路由注册阶段（启动时，非请求时）：
  收集 options.validate
  ↓
  对每个位置调用 dsl(rawSchema) 预编译 schema  ← 只执行一次，性能最优
  ↓
  生成 validateMiddleware 函数，挂入执行链

请求处理阶段：
  validateMiddleware 被调用
  ↓
  按 param → query → header → body 顺序依次校验
  ↓
  调用 validate(compiledSchema, rawData)
  ↓
  全部通过 → 写入 req._validatedData[location]，调用 next()
  校验失败 → 抛出 VextValidationError(422, errors)
  ↓
  全局错误处理捕获 → 返回 422 响应（见 01c-response.md）
```

**校验顺序**：`param → query → header → body`

> 原因：路径参数最简单（通常只校验格式），body 最复杂。顺序快速失败，越简单的越先检测。

---

## 5. 校验通过后的数据获取

校验通过的数据通过 `req.valid()` 获取（详见 `01c-response.md` VextRequest 定义）：

```typescript
// 泛型显式指定（推荐，IDE 类型提示完整）
const query = req.valid<{ page: number; limit: number }>('query')
const body  = req.valid<{ name: string; email: string }>('body')
const param = req.valid<{ id: string }>('param')
```

> `req.valid()` 读取的是经 schema-dsl 转换后的**类型化数据**（如 `'number:1-'` 校验后 query 中的 page 已是 `number` 类型，而非原始字符串）。

---

## 6. 校验失败响应格式

```json
HTTP 422 Unprocessable Entity

{
  "code": 422,
  "message": "Validation failed",
  "errors": [
    { "field": "email",    "message": "邮箱格式不正确" },
    { "field": "password", "message": "最少 8 个字符" }
  ]
}
```

> 422 响应**不经过**出口包装中间件（不会变成 `{ code: 0, data: ... }`），直接由全局错误处理返回。

---

## 7. 框架内部实现

```typescript
// vextjs/lib/validate-middleware.ts（框架内部，用户不感知）
import { dsl, validate } from 'schema-dsl'
import type { RouteOptions } from './define-routes'
import type { VextMiddleware } from './adapter'
import { VextValidationError } from './errors'

export function buildValidateMiddleware(
  validateOptions: RouteOptions['validate']
): VextMiddleware | null {
  if (!validateOptions) return null

  // 启动时预编译所有 schema（非每次请求时编译）
  const compiled: Partial<Record<'query' | 'body' | 'param' | 'header', ReturnType<typeof dsl>>> = {}

  if (validateOptions.query)  compiled.query  = dsl(validateOptions.query)
  if (validateOptions.body)   compiled.body   = dsl(validateOptions.body)
  if (validateOptions.param)  compiled.param  = dsl(validateOptions.param)
  if (validateOptions.header) compiled.header = dsl(validateOptions.header)

  const locations = ['param', 'query', 'header', 'body'] as const

  return async (req, _res, next) => {
    const validated: Record<string, unknown> = {}

    for (const loc of locations) {
      if (!compiled[loc]) continue

      const rawData = getRawData(req, loc)
      const result  = validate(compiled[loc]!, rawData)

      if (!result.valid) {
        throw new VextValidationError(result.errors)
      }
      validated[loc] = result.data
    }

    req._validatedData = validated
    next()
  }
}

function getRawData(req: VextRequest, loc: 'query' | 'body' | 'param' | 'header') {
  switch (loc) {
    case 'query':  return req.query
    case 'body':   return req.body
    case 'param':  return req.params
    case 'header': return req.headers
  }
}
```

---

## 8. 边界行为

| 场景 | 行为 |
|------|------|
| 未配置 `validate` | 跳过校验，直接进 handler |
| `body` 缺失但 schema 有必填字段 | 422，errors 列出所有缺失字段 |
| `query` 字段为空字符串但要求非空 | 422 |
| `param` 中 `:id` 未匹配（路由不会命中）| 框架层已过滤，不会到达 validate |
| `validate` 某个位置 schema 为空对象 `{}` | 通过校验（无字段要求） |
| 多位置均有错误 | 第一个失败的位置立即抛出，后续位置不再校验 |

---

## 9. validator 插件覆盖（企业级扩展）

### 9.1 设计原则

vextjs 默认使用 **schema-dsl** 作为校验引擎，这是框架的**内置特色**：零 import、DSL 简洁、启动时预编译。

但企业级项目可能已有 Zod / Yup 等 schema 库，框架通过**插件覆盖 validator**机制支持替换，而不是强制迁移。

### 9.2 `VextValidator` 接口

> 完整接口定义见 **`06b-error.md §2`**，此处仅列关键方法：

```typescript
interface VextValidator {
  compile(rawSchema: unknown): unknown          // 路由注册时执行一次
  execute(compiled: unknown, data: unknown):
    | { valid: true;  data: unknown }
    | { valid: false; errors: Array<{ field: string; message: string }> }
}
```

### 9.3 框架内部默认实现

```typescript
// 框架内部默认 validator（基于 schema-dsl）
const defaultValidator: VextValidator = {
  compile: (rawSchema) => dsl(rawSchema as Record<string, string>),
  execute: (compiled, data) => validate(compiled, data),
}
```

### 9.4 插件覆盖为 Zod

```typescript
// src/plugins/zod-validator.ts
import { definePlugin } from 'vextjs'
import { z }            from 'zod'

export default definePlugin({
  name: 'zod-validator',
  setup(app) {
    app.setValidator({
      compile(rawSchema) {
        // rawSchema 此时是用户传入的 Zod schema 对象
        return rawSchema  // Zod schema 本身就是"编译好的"
      },
      execute(compiledSchema, data) {
        const result = (compiledSchema as z.ZodTypeAny).safeParse(data)
        if (result.success) {
          return { valid: true, data: result.data }
        }
        return {
          valid:  false,
          errors: result.error.errors.map(e => ({
            field:   e.path.join('.'),
            message: e.message,
          })),
        }
      },
    })
  },
})
```

覆盖后，路由 `validate` 选项直接传 Zod schema：

```typescript
// src/routes/users.ts — 覆盖 Zod 后的写法
import { z } from 'zod'

export default defineRoutes((app) => {
  app.post('/', {
    validate: {
      body: z.object({
        name:     z.string().min(1).max(50),
        email:    z.string().email(),
        password: z.string().min(8),
      }),
    },
  }, async (req, res) => {
    const body = req.valid<{ name: string; email: string; password: string }>('body')
    res.json(await app.services.user.create(body))
  })
})
```

### 9.5 `app.setValidator()` 接口

```typescript
// vextjs/lib/app.ts 补充
interface VextApp {
  /**
   * 替换全局 validator（插件专用，只能在 setup() 中调用）
   * 覆盖后对所有路由的 validate 选项生效
   * 默认：schema-dsl
   */
  setValidator(validator: VextValidator): void
}
```

> **设计取舍**：默认 schema-dsl 是 vextjs 的特色，`setValidator` 是逃生舱，让企业项目自由选择，而不是强迫用户放弃已有的 schema 生态。


