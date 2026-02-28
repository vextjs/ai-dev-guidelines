# 14 - OpenAPI 自动生成详细设计

> **项目**: vext (vextjs)
> **日期**: 2026-02-28
> **状态**: 📝 设计稿
> **优先级**: P1（企业级五星路径 Phase 2 — 三段式路由核心变现）
> **依赖**: 路由层（`01-routes.md` ✅）、校验体系（`01a-validate.md` ✅）、中间件（`01b-middlewares.md` ✅）、router-loader（`01d-router-loader.md` ✅）、配置层（`05-config.md` ✅）、AOP 分层（P1 Phase 1）
> **预计工期**: 5-7 天
> **关联**: 企业级五星路径报告 `02-analysis-self-fix-and-enterprise-upgrade.md` §Phase 2

---

## 0. 概述

vext 的三段式路由 `(path, options, handler)` 天然适配 OpenAPI：`options` 对象中已包含校验规则（`validate`）、中间件（`middlewares`）、文档配置（`docs`）等元信息，只需在 router-loader 扫描阶段收集这些元信息，再转换为 OpenAPI 3.0 规范文档。

### 为什么 OpenAPI 是五星必要条件

| 维度 | 没有 OpenAPI | 有 OpenAPI ✅ |
|------|-------------|--------------|
| **API 文档** | 手动维护 Markdown，容易过期 | 代码即文档，永不过期 |
| **前后端协作** | 口头/文档约定，联调效率低 | Swagger UI 在线调试 + 类型导出 |
| **客户端 SDK** | 手动编写 | openapi-generator 自动生成（TS / Java / Python 等） |
| **测试** | 手动构造请求 | 基于 OpenAPI spec 自动生成测试用例 |
| **企业合规** | 无标准化文档 | OpenAPI 是行业标准（ISO/IEC 标准化） |

### 核心优势：三段式路由的自然映射

```
app.post('/users', {                    ← OpenAPI operationId 自动推断
  validate: {
    body: { name: 'string:1-50!', ... } ← requestBody schema 自动生成
    query: { page: 'number:1-' }        ← parameters 自动生成
    params: { id: 'objectId!' }         ← path parameters 自动生成
  },
  middlewares: ['auth', 'rate-limit'],   ← security + x-rate-limit 从 middlewares 自动推断
  docs: {                               ← 增强元信息（新增配置）
    summary: '创建用户',
    tags: ['用户管理'],
    responses: { ... },
  },
}, handler)
```

**其他框架需要装饰器或注释才能生成的 OpenAPI 信息，vext 的 options 对象中已经全部具备。**

---

## 1. 路由 options 扩展：`docs` 字段

### 1.1 `docs` 配置接口

```typescript
// vextjs/types/route.ts（扩展 RouteOptions）

export interface RouteDocsConfig {
  /**
   * 接口摘要（一句话描述）
   * 映射到 OpenAPI operation.summary
   */
  summary?: string

  /**
   * 接口详细描述（支持 Markdown）
   * 映射到 OpenAPI operation.description
   */
  description?: string

  /**
   * 标签分组
   * 映射到 OpenAPI operation.tags
   * 默认从路由文件路径推断：routes/users.ts → ['users']
   */
  tags?: string[]

  /**
   * 操作标识（全局唯一）
   * 映射到 OpenAPI operation.operationId
   * 默认自动推断：POST /users → 'createUsers'
   */
  operationId?: string

  /**
   * 响应定义
   * 映射到 OpenAPI operation.responses
   */
  responses?: Record<number | string, ResponseConfig>

  /**
   * 是否已废弃
   * 映射到 OpenAPI operation.deprecated
   * @default false
   */
  deprecated?: boolean

  /**
   * 安全方案覆盖
   * 默认从 middlewares 推断（如 middlewares: ['auth'] → bearer token）
   * 此处可覆盖或清空（设为 [] 表示无需认证）
   */
  security?: Array<Record<string, string[]>>

  /**
   * 自定义扩展字段（x- 前缀）
   * 映射到 OpenAPI operation 的 x-* 字段
   */
  extensions?: Record<string, unknown>

  /**
   * 是否在 OpenAPI 文档中隐藏此路由
   * @default false
   */
  hidden?: boolean
}

export interface ResponseConfig {
  /** 响应描述 */
  description: string

  /**
   * 响应体 schema
   * 支持三种格式：
   * 1. schema-dsl 字符串对象（与 validate 格式一致）
   * 2. JSON Schema 对象
   * 3. 引用字符串（如 '#/components/schemas/User'）
   */
  schema?: Record<string, unknown> | string

  /**
   * 响应头
   */
  headers?: Record<string, {
    description?: string
    schema?: { type: string }
  }>

  /**
   * Content-Type
   * @default 'application/json'
   */
  contentType?: string

  /**
   * 响应示例
   */
  example?: unknown

  /**
   * 多个响应示例
   */
  examples?: Record<string, {
    summary?: string
    description?: string
    value: unknown
  }>
}
```

### 1.2 完整使用示例

```typescript
// src/routes/users.ts
import { defineRoutes } from 'vextjs'

export default defineRoutes((app) => {
  // ── GET /users/list — 获取用户列表 ────────────────────
  app.get('/list', {
    validate: {
      query: {
        page:   'number:1-',
        limit:  'number:1-100',
        search: 'string:0-100?',
        role:   'enum:admin,user,moderator?',
      },
    },
    middlewares: ['auth'],
    docs: {
      summary: '获取用户列表',
      description: '分页获取用户列表，支持按角色筛选和关键词搜索。',
      tags: ['用户管理'],
      responses: {
        200: {
          description: '查询成功',
          schema: {
            list: [{
              id:    'string',
              name:  'string',
              email: 'string',
              role:  'enum:admin,user,moderator',
            }],
            total: 'number',
            page:  'number',
            limit: 'number',
          },
          example: {
            list: [
              { id: '507f1f77bcf86cd799439011', name: '张三', email: 'zhang@example.com', role: 'admin' },
            ],
            total: 42,
            page: 1,
            limit: 20,
          },
        },
        401: { description: '未认证' },
        403: { description: '无权限' },
      },
    },
  }, async (req, res) => {
    const { page, limit, search, role } = req.valid('query')
    const data = await app.services.user.findAll({ page, limit, search, role })
    res.json(data)
  })

  // ── POST /users — 创建用户 ────────────────────────────
  app.post('/', {
    validate: {
      body: {
        name:     'string:1-50!',
        email:    'email!',
        password: 'string:8-128!',
        role:     'enum:admin,user,moderator?',
      },
    },
    middlewares: ['auth', { name: 'rate-limit', options: { max: 5 } }],
    docs: {
      summary: '创建用户',
      tags: ['用户管理'],
      responses: {
        201: {
          description: '创建成功',
          schema: {
            id:        'string',
            name:      'string',
            email:     'string',
            role:      'string',
            createdAt: 'string',
          },
        },
        409: {
          description: '邮箱已注册',
          schema: {
            code:      'number',
            message:   'string',
            requestId: 'string',
          },
        },
        422: {
          description: '参数校验失败',
          schema: {
            code:      'number',
            message:   'string',
            errors:    'array',
            requestId: 'string',
          },
        },
      },
    },
  }, async (req, res) => {
    const body = req.valid('body')
    const data = await app.services.user.create(body)
    res.json(data, 201)
  })

  // ── DELETE /users/:id — 删除用户 ──────────────────────
  app.delete('/:id', {
    validate: {
      params: { id: 'objectId!' },
    },
    middlewares: ['auth', 'admin'],
    docs: {
      summary: '删除用户',
      tags: ['用户管理'],
      responses: {
        204: { description: '删除成功' },
        404: { description: '用户不存在' },
      },
    },
  }, async (req, res) => {
    await app.services.user.delete(req.params.id)
    res.status(204).json(null)
  })

  // ── 隐藏的内部路由（不出现在 OpenAPI 文档中）──────────
  app.get('/_internal/health', {
    docs: { hidden: true },
  }, async (req, res) => {
    res.json({ status: 'ok' })
  })
})
```

---

## 2. 架构设计

### 2.1 整体流程

```
用户代码
  ↓
router-loader 扫描 routes/ 目录
  ↓
收集路由元信息（path + method + options）
  ↓
RouteMetadataCollector 汇总所有路由元信息
  ↓
SchemaConverter 将 schema-dsl → JSON Schema
  ↓
OpenAPIGenerator 生成 OpenAPI 3.0 文档（JSON / YAML）
  ↓
内置 /docs 端点（Swagger UI）+ /openapi.json 端点
```

### 2.2 模块划分

```
vextjs/src/lib/openapi/
├── index.ts                  # 统一导出
├── collector.ts              # RouteMetadataCollector — 路由元信息收集
├── schema-converter.ts       # SchemaConverter — schema-dsl DSL → JSON Schema
├── generator.ts              # OpenAPIGenerator — 生成 OpenAPI 3.0 文档
├── operation-id.ts           # OperationId 自动推断工具
├── swagger-ui.ts             # Swagger UI HTML 模板 + 静态资源路由
└── types.ts                  # OpenAPI 相关类型定义
```

### 2.3 与启动流程的集成

```
bootstrap.ts 启动流程:

① 内置模块初始化
②  plugin-loader
③  middleware-loader
④  service-loader
⑤  router-loader 扫描 routes/
⑤+ 🆕 RouteMetadataCollector.collect()        ← 收集路由元信息
⑤+ 🆕 OpenAPIGenerator.generate()             ← 生成 OpenAPI spec
⑤+ 🆕 注册 /docs 和 /openapi.json 路由        ← Swagger UI 端点
⑤+ internals.lockUse()
⑥  出口中间件 + 错误处理 + 404
⑦  HTTP 监听
⑧  onReady
⑨  /ready → 200
```

**关键时机**：OpenAPI 文档在所有路由注册完成后、`lockUse()` 之前生成。

---

## 3. RouteMetadataCollector — 路由元信息收集

### 3.1 收集的数据结构

```typescript
// vextjs/src/lib/openapi/types.ts

export interface RouteMetadata {
  /** HTTP 方法（大写） */
  method: string
  /** 完整路由路径（含前缀） */
  path: string
  /** 路由 options 原始对象 */
  options: RouteOptions
  /** 路由文件来源（用于 tag 推断） */
  sourceFile: string
}

export interface CollectedRoutes {
  /** 所有路由元信息 */
  routes: RouteMetadata[]
  /** 全局中间件列表（用于安全方案推断） */
  globalMiddlewares: string[]
}
```

### 3.2 收集器实现

```typescript
// vextjs/src/lib/openapi/collector.ts

export class RouteMetadataCollector {
  private routes: RouteMetadata[] = []

  /**
   * 由 router-loader 在注册每条路由时调用
   */
  addRoute(
    method:     string,
    path:       string,
    options:    RouteOptions,
    sourceFile: string,
  ): void {
    // 跳过隐藏路由
    if (options.docs?.hidden) return

    this.routes.push({ method, path, options, sourceFile })
  }

  /**
   * 获取所有收集到的路由元信息
   */
  getRoutes(): RouteMetadata[] {
    return [...this.routes]
  }

  /**
   * 清空（dev 模式热重载时重新收集）
   */
  clear(): void {
    this.routes = []
  }
}
```

### 3.3 与 router-loader 的集成

```typescript
// vextjs/src/lib/router-loader.ts（修改 — 追加元信息收集）

export async function loadRoutes(
  app:          VextApp,
  routesDir:    string,
  options:      LoadRoutesOptions,
  // 🆕 传入收集器实例（可选 — 未配置 openapi 时为 null）
  collector?:   RouteMetadataCollector | null,
): Promise<void> {

  // ... 原有扫描逻辑 ...

  for (const routeDef of routeDefinitions) {
    const { method, path, options: routeOptions, handler } = routeDef

    // 注册到 adapter（原有逻辑）
    app.adapter.registerRoute(method, fullPath, chain)

    // 🆕 收集元信息（用于 OpenAPI 生成）
    if (collector) {
      collector.addRoute(method, fullPath, routeOptions, sourceFile)
    }
  }
}
```

---

## 4. SchemaConverter — schema-dsl → JSON Schema

### 4.1 转换规则

schema-dsl DSL 字符串到 JSON Schema 的映射：

| schema-dsl DSL | JSON Schema | 示例 |
|----------------|-------------|------|
| `'string'` | `{ type: 'string' }` | — |
| `'string:1-50'` | `{ type: 'string', minLength: 1, maxLength: 50 }` | — |
| `'string:1-50!'` | `{ type: 'string', minLength: 1, maxLength: 50 }` + required | `!` 表示必填 |
| `'string:8-!'` | `{ type: 'string', minLength: 8 }` | 无上限 |
| `'number'` | `{ type: 'number' }` | — |
| `'number:1-'` | `{ type: 'number', minimum: 1 }` | — |
| `'number:1-100'` | `{ type: 'number', minimum: 1, maximum: 100 }` | — |
| `'integer'` | `{ type: 'integer' }` | — |
| `'integer:1-!'` | `{ type: 'integer', minimum: 1 }` | — |
| `'boolean'` | `{ type: 'boolean' }` | — |
| `'email'` | `{ type: 'string', format: 'email' }` | — |
| `'email!'` | `{ type: 'string', format: 'email' }` + required | — |
| `'url'` | `{ type: 'string', format: 'uri' }` | — |
| `'url?'` | `{ type: 'string', format: 'uri' }` (nullable) | `?` 表示可选 |
| `'date'` | `{ type: 'string', format: 'date-time' }` | — |
| `'objectId'` | `{ type: 'string', pattern: '^[0-9a-fA-F]{24}$' }` | — |
| `'objectId!'` | `{ type: 'string', pattern: '^[0-9a-fA-F]{24}$' }` + required | — |
| `'enum:a,b,c'` | `{ type: 'string', enum: ['a', 'b', 'c'] }` | — |
| `'enum:a,b,c!'` | `{ type: 'string', enum: ['a', 'b', 'c'] }` + required | — |
| `'array'` | `{ type: 'array' }` | — |
| `[{ ... }]` | `{ type: 'array', items: { type: 'object', properties: { ... } } }` | 嵌套数组 |
| `{ key: 'string' }` | `{ type: 'object', properties: { key: { type: 'string' } } }` | 嵌套对象 |

### 4.2 转换器实现

```typescript
// vextjs/src/lib/openapi/schema-converter.ts

export interface ConvertResult {
  /** JSON Schema 对象 */
  schema: JsonSchema
  /** 必填字段列表 */
  required: string[]
}

export interface JsonSchema {
  type?:        string
  format?:      string
  properties?:  Record<string, JsonSchema>
  items?:       JsonSchema
  required?:    string[]
  enum?:        string[]
  minimum?:     number
  maximum?:     number
  minLength?:   number
  maxLength?:   number
  pattern?:     string
  description?: string
  nullable?:    boolean
  example?:     unknown
  oneOf?:       JsonSchema[]
  [key: string]: unknown
}

export class SchemaConverter {
  /**
   * 将 schema-dsl 的 validate 对象转换为 JSON Schema
   *
   * 输入：{ name: 'string:1-50!', email: 'email!' }
   * 输出：{
   *   schema: { type: 'object', properties: { name: ..., email: ... }, required: ['name', 'email'] },
   *   required: ['name', 'email']
   * }
   */
  convertValidateObject(dslObj: Record<string, unknown>): ConvertResult {
    const properties: Record<string, JsonSchema> = {}
    const required: string[] = []

    for (const [key, value] of Object.entries(dslObj)) {
      if (typeof value === 'string') {
        // 字符串 DSL：'string:1-50!' / 'email!' / 'number:1-100'
        const { schema, isRequired } = this.convertDSLString(value)
        properties[key] = schema
        if (isRequired) required.push(key)

      } else if (Array.isArray(value)) {
        // 数组类型：[{ productId: 'objectId!', name: 'string!' }]
        if (value.length > 0 && typeof value[0] === 'object') {
          const itemResult = this.convertValidateObject(value[0] as Record<string, unknown>)
          properties[key] = {
            type:  'array',
            items: {
              type:       'object',
              properties: itemResult.schema.properties,
              ...(itemResult.required.length > 0 ? { required: itemResult.required } : {}),
            },
          }
        } else {
          properties[key] = { type: 'array' }
        }

      } else if (typeof value === 'object' && value !== null) {
        // 嵌套对象：{ avatar: 'url?', bio: 'string:0-500?' }
        const nested = this.convertValidateObject(value as Record<string, unknown>)
        properties[key] = {
          type:       'object',
          properties: nested.schema.properties,
          ...(nested.required.length > 0 ? { required: nested.required } : {}),
        }
      }
    }

    return {
      schema: {
        type: 'object',
        properties,
        ...(required.length > 0 ? { required } : {}),
      },
      required,
    }
  }

  /**
   * 转换单个 DSL 字符串
   *
   * 'string:1-50!' → { schema: { type: 'string', minLength: 1, maxLength: 50 }, isRequired: true }
   * 'email?'       → { schema: { type: 'string', format: 'email', nullable: true }, isRequired: false }
   * 'enum:a,b,c'   → { schema: { type: 'string', enum: ['a', 'b', 'c'] }, isRequired: false }
   */
  convertDSLString(dsl: string): { schema: JsonSchema; isRequired: boolean } {
    let isRequired = false
    let isNullable = false
    let cleanDsl = dsl.trim()

    // 解析后缀标记
    if (cleanDsl.endsWith('!')) {
      isRequired = true
      cleanDsl = cleanDsl.slice(0, -1)
    } else if (cleanDsl.endsWith('?')) {
      isNullable = true
      cleanDsl = cleanDsl.slice(0, -1)
    }

    const schema = this.parseDSLCore(cleanDsl)

    if (isNullable) {
      schema.nullable = true
    }

    return { schema, isRequired }
  }

  /**
   * 解析 DSL 核心部分（不含 ! / ? 后缀）
   */
  private parseDSLCore(dsl: string): JsonSchema {
    // ── enum:a,b,c ──────────────────────────────────────
    if (dsl.startsWith('enum:')) {
      const values = dsl.slice(5).split(',').map(v => v.trim())
      return { type: 'string', enum: values }
    }

    // ── 带范围的类型：string:1-50 / number:1-100 ────────
    const colonIndex = dsl.indexOf(':')
    if (colonIndex !== -1) {
      const baseType = dsl.slice(0, colonIndex)
      const range = dsl.slice(colonIndex + 1)
      return this.parseTypeWithRange(baseType, range)
    }

    // ── 纯类型名 ────────────────────────────────────────
    return this.parseBaseType(dsl)
  }

  /**
   * 解析基础类型名
   */
  private parseBaseType(type: string): JsonSchema {
    switch (type) {
      case 'string':    return { type: 'string' }
      case 'number':    return { type: 'number' }
      case 'integer':   return { type: 'integer' }
      case 'boolean':   return { type: 'boolean' }
      case 'email':     return { type: 'string', format: 'email' }
      case 'url':       return { type: 'string', format: 'uri' }
      case 'date':      return { type: 'string', format: 'date-time' }
      case 'objectId':  return { type: 'string', pattern: '^[0-9a-fA-F]{24}$' }
      case 'array':     return { type: 'array' }
      case 'object':    return { type: 'object' }
      case 'any':       return {}
      default:          return { type: 'string', description: `Unknown DSL type: ${type}` }
    }
  }

  /**
   * 解析带范围的类型
   *
   * 'string', '1-50'  → { type: 'string', minLength: 1, maxLength: 50 }
   * 'number', '1-'    → { type: 'number', minimum: 1 }
   * 'number', '1-100' → { type: 'number', minimum: 1, maximum: 100 }
   * 'string', '8-!'   → { type: 'string', minLength: 8 }
   */
  private parseTypeWithRange(baseType: string, range: string): JsonSchema {
    const schema = this.parseBaseType(baseType)
    const parts = range.split('-')

    if (parts.length !== 2) return schema

    const [minStr, maxStr] = parts
    const min = minStr ? Number(minStr) : undefined
    const max = (maxStr && maxStr !== '!' && maxStr !== '') ? Number(maxStr) : undefined

    if (baseType === 'string') {
      if (min !== undefined && !isNaN(min)) schema.minLength = min
      if (max !== undefined && !isNaN(max)) schema.maxLength = max
    } else if (baseType === 'number' || baseType === 'integer') {
      if (min !== undefined && !isNaN(min)) schema.minimum = min
      if (max !== undefined && !isNaN(max)) schema.maximum = max
    }

    return schema
  }

  /**
   * 将 docs.responses 中的 schema 也进行转换
   *
   * response schema 格式与 validate schema 格式一致（schema-dsl DSL 字符串对象）
   */
  convertResponseSchema(schema: Record<string, unknown> | string): JsonSchema {
    if (typeof schema === 'string') {
      // 引用字符串：'#/components/schemas/User'
      return { $ref: schema }
    }

    const result = this.convertValidateObject(schema)
    return result.schema
  }
}
```

---

## 5. OpenAPIGenerator — 文档生成器

### 5.1 生成器实现

```typescript
// vextjs/src/lib/openapi/generator.ts

import type { RouteMetadata } from './types.js'
import { SchemaConverter }    from './schema-converter.js'
import { inferOperationId }   from './operation-id.js'

export interface OpenAPIConfig {
  /** API 标题 */
  title?: string
  /** API 描述 */
  description?: string
  /** API 版本 */
  version?: string
  /** 服务器地址列表 */
  servers?: Array<{ url: string; description?: string }>
  /** 全局安全方案 */
  securitySchemes?: Record<string, SecurityScheme>
  /** 全局标签定义 */
  tags?: Array<{ name: string; description?: string }>
  /** 联系信息 */
  contact?: { name?: string; email?: string; url?: string }
  /** 许可证 */
  license?: { name: string; url?: string }
  /**
   * Guard 到 Security Scheme 的映射
   * 例如: { auth: 'bearerAuth', apiKey: 'apiKeyAuth' }
   */
  guardSecurityMap?: Record<string, string>
}

interface SecurityScheme {
  type:    'http' | 'apiKey' | 'oauth2' | 'openIdConnect'
  scheme?: string
  bearerFormat?: string
  name?:   string
  in?:     'header' | 'query' | 'cookie'
  description?: string
}

export class OpenAPIGenerator {
  private converter = new SchemaConverter()
  private config: OpenAPIConfig

  constructor(config: OpenAPIConfig = {}) {
    this.config = config
  }

  /**
   * 生成完整的 OpenAPI 3.0 文档
   */
  generate(routes: RouteMetadata[]): OpenAPIDocument {
    const doc: OpenAPIDocument = {
      openapi: '3.0.3',
      info: {
        title:       this.config.title ?? 'VextJS API',
        description: this.config.description ?? 'Auto-generated API documentation',
        version:     this.config.version ?? '1.0.0',
        ...(this.config.contact ? { contact: this.config.contact } : {}),
        ...(this.config.license ? { license: this.config.license } : {}),
      },
      servers: this.config.servers ?? [
        { url: '/', description: 'Current server' },
      ],
      paths: {},
      components: {
        schemas:         {},
        securitySchemes: this.buildSecuritySchemes(),
      },
      tags: this.config.tags ?? this.inferTags(routes),
    }

    // ── 遍历路由，生成 paths ────────────────────────────
    for (const route of routes) {
      const openApiPath = this.convertPath(route.path)
      const method      = route.method.toLowerCase()

      if (!doc.paths[openApiPath]) {
        doc.paths[openApiPath] = {}
      }

      doc.paths[openApiPath][method] = this.buildOperation(route)
    }

    // ── 添加通用错误响应 schema ─────────────────────────
    doc.components!.schemas!['ErrorResponse'] = {
      type: 'object',
      properties: {
        code:      { type: 'integer', description: 'HTTP 状态码或业务错误码' },
        message:   { type: 'string',  description: '错误信息' },
        requestId: { type: 'string',  description: '请求追踪 ID' },
      },
      required: ['code', 'message', 'requestId'],
    }

    doc.components!.schemas!['SuccessResponse'] = {
      type: 'object',
      properties: {
        code:      { type: 'integer', description: '状态码（0 表示成功）', example: 0 },
        data:      { description: '响应数据' },
        requestId: { type: 'string',  description: '请求追踪 ID' },
      },
      required: ['code', 'data', 'requestId'],
    }

    return doc
  }

  /**
   * 生成 JSON 格式
   */
  generateJSON(routes: RouteMetadata[]): string {
    return JSON.stringify(this.generate(routes), null, 2)
  }

  /**
   * 构建单个路由的 Operation 对象
   */
  private buildOperation(route: RouteMetadata): OpenAPIOperation {
    const { options, method, path, sourceFile } = route
    const docs = options.docs ?? {}

    const operation: OpenAPIOperation = {
      summary:     docs.summary ?? `${method} ${path}`,
      operationId: docs.operationId ?? inferOperationId(method, path),
      tags:        docs.tags ?? [this.inferTagFromFile(sourceFile)],
      deprecated:  docs.deprecated ?? false,
      parameters:  [],
      responses:   {},
    }

    // ── 描述 ────────────────────────────────────────────
    if (docs.description) {
      operation.description = docs.description
    }

    // ── 路径参数（params） ──────────────────────────────
    if (options.validate?.params) {
      const params = options.validate.params as Record<string, string>
      for (const [name, dsl] of Object.entries(params)) {
        const { schema } = this.converter.convertDSLString(
          typeof dsl === 'string' ? dsl : 'string'
        )
        operation.parameters!.push({
          name,
          in:       'path',
          required: true,
          schema,
        })
      }
    }

    // ── 查询参数（query） ───────────────────────────────
    if (options.validate?.query) {
      const query = options.validate.query as Record<string, string>
      for (const [name, dsl] of Object.entries(query)) {
        if (typeof dsl !== 'string') continue
        const { schema, isRequired } = this.converter.convertDSLString(dsl)
        operation.parameters!.push({
          name,
          in:       'query',
          required: isRequired,
          schema,
        })
      }
    }

    // ── 请求体（body） ──────────────────────────────────
    if (options.validate?.body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      const bodyResult = this.converter.convertValidateObject(
        options.validate.body as Record<string, unknown>
      )
      operation.requestBody = {
        required: true,
        content: {
          'application/json': {
            schema: bodyResult.schema,
          },
        },
      }
    }

    // ── 响应（responses） ───────────────────────────────
    if (docs.responses) {
      for (const [statusCode, config] of Object.entries(docs.responses)) {
        const code = String(statusCode)
        const responseObj: OpenAPIResponse = {
          description: config.description,
        }

        if (config.schema) {
          const converted = this.converter.convertResponseSchema(config.schema)

          // 包装为 vext 标准响应格式 { code: 0, data: ..., requestId: ... }
          const wrappedSchema = this.wrapResponseSchema(Number(code), converted)

          responseObj.content = {
            [config.contentType ?? 'application/json']: {
              schema: wrappedSchema,
            },
          }

          if (config.example) {
            responseObj.content[config.contentType ?? 'application/json'].example =
              this.wrapResponseExample(Number(code), config.example)
          }

          if (config.examples) {
            responseObj.content[config.contentType ?? 'application/json'].examples = {}
            for (const [name, ex] of Object.entries(config.examples)) {
              responseObj.content[config.contentType ?? 'application/json'].examples![name] = {
                summary:     ex.summary,
                description: ex.description,
                value:       this.wrapResponseExample(Number(code), ex.value),
              }
            }
          }
        }

        if (config.headers) {
          responseObj.headers = config.headers
        }

        operation.responses[code] = responseObj
      }
    }

    // 如果没有任何 responses 定义，添加默认
    if (Object.keys(operation.responses).length === 0) {
      operation.responses['200'] = {
        description: 'OK',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/SuccessResponse' },
          },
        },
      }
    }

    // ── 安全方案（从 middlewares 推断） ─────────────────
    if (docs.security !== undefined) {
      // 显式指定 security（包括空数组 = 无需认证）
      operation.security = docs.security
    } else if (options.middlewares && (options.middlewares as unknown[]).length > 0) {
      // 从 middlewares 推断 security（检测 auth / api-key 等关键词）
      const inferred = this.inferSecurityFromMiddlewares(
        options.middlewares as Array<string | { name: string; options?: unknown }>,
      )
      if (inferred.length > 0) {
        operation.security = inferred
      }
    }

    // ── 自定义扩展 ──────────────────────────────────────
    if (docs.extensions) {
      for (const [key, value] of Object.entries(docs.extensions)) {
        const xKey = key.startsWith('x-') ? key : `x-${key}`
        ;(operation as any)[xKey] = value
      }
    }

    // ── 速率限制扩展（从 rate-limit 中间件推断）─────────
    if (options.middlewares) {
      const rateLimitMw = (options.middlewares as any[]).find(
        (mw: any) => (typeof mw === 'string' ? mw : mw.name) === 'rate-limit'
      )
      if (rateLimitMw && typeof rateLimitMw === 'object' && rateLimitMw.options) {
        ;(operation as any)['x-rate-limit'] = {
          max:    rateLimitMw.options.max,
          window: rateLimitMw.options.window,
        }
      }
    }

    // 清空空参数数组
    if (operation.parameters!.length === 0) {
      delete operation.parameters
    }

    return operation
  }

  /**
   * 包装响应 schema 为 vext 标准格式
   *
   * 成功响应（2xx）:  { code: 0, data: <原始schema>, requestId: string }
   * 错误响应（4xx/5xx）: 直接使用 ErrorResponse schema
   */
  private wrapResponseSchema(statusCode: number, dataSchema: JsonSchema): JsonSchema {
    if (statusCode === 204) {
      // 204 No Content — 无响应体
      return {}
    }

    if (statusCode >= 200 && statusCode < 300) {
      // 成功响应 — 包装为 { code: 0, data, requestId }
      return {
        type: 'object',
        properties: {
          code:      { type: 'integer', example: 0 },
          data:      dataSchema,
          requestId: { type: 'string', example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
        },
        required: ['code', 'data', 'requestId'],
      }
    }

    // 错误响应 — 直接使用原始 schema（通常是 ErrorResponse 格式）
    return dataSchema
  }

  /**
   * 包装响应示例为 vext 标准格式
   */
  private wrapResponseExample(statusCode: number, example: unknown): unknown {
    if (statusCode >= 200 && statusCode < 300 && statusCode !== 204) {
      return {
        code: 0,
        data: example,
        requestId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      }
    }
    return example
  }

  /**
   * 转换路由路径格式
   *
   * vext:    /users/:id     → OpenAPI: /users/{id}
   * vext:    /files/*path   → OpenAPI: /files/{path}
   */
  private convertPath(path: string): string {
    return path
      .replace(/:(\w+)/g, '{$1}')
      .replace(/\*(\w+)/g, '{$1}')
  }

  /**
   * 从 middlewares 推断 security
   *
   * P1-4 修复：移除不存在的 guards 字段，改为从 RouteOptions.middlewares 推断。
   * 检测 middleware 名称是否匹配 securityMap 中的 key（如 'auth' → bearerAuth）。
   * middlewares 可以是 string 或 { name, options } 对象，需统一提取 name。
   */
  private inferSecurityFromMiddlewares(
    middlewares: Array<string | { name: string; options?: unknown }>,
  ): Array<Record<string, string[]>> {
    const map = this.config.guardSecurityMap ?? {
      auth:      'bearerAuth',
      'api-key': 'apiKeyAuth',
    }

    return middlewares
      .map(m => typeof m === 'string' ? m : m.name)
      .filter(name => name in map)
      .map(name => ({ [map[name]]: [] }))
  }

  /**
   * 构建 securitySchemes
   */
  private buildSecuritySchemes(): Record<string, SecurityScheme> {
    if (this.config.securitySchemes) {
      return this.config.securitySchemes
    }

    // 默认方案：Bearer Token
    return {
      bearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
        description:  'JWT Bearer Token 认证',
      },
    }
  }

  /**
   * 从路由列表推断 tags
   */
  private inferTags(routes: RouteMetadata[]): Array<{ name: string; description?: string }> {
    const tagSet = new Set<string>()

    for (const route of routes) {
      if (route.options.docs?.tags) {
        for (const tag of route.options.docs.tags) {
          tagSet.add(tag)
        }
      } else {
        tagSet.add(this.inferTagFromFile(route.sourceFile))
      }
    }

    return Array.from(tagSet)
      .sort()
      .map(name => ({ name }))
  }

  /**
   * 从文件路径推断 tag
   *
   * routes/users.ts      → 'users'
   * routes/admin/roles.ts → 'admin-roles'
   * routes/index.ts       → 'default'
   */
  private inferTagFromFile(sourceFile: string): string {
    const relative = sourceFile
      .replace(/\\/g, '/')
      .replace(/^.*routes\//, '')
      .replace(/\.(ts|js|mts|mjs|cts|cjs)$/, '')

    if (relative === 'index' || relative === '') {
      return 'default'
    }

    return relative.replace(/\//g, '-').replace(/\/index$/, '')
  }
}

// ── OpenAPI 文档类型（简化版） ──────────────────────────
export interface OpenAPIDocument {
  openapi: string
  info: {
    title: string
    description?: string
    version: string
    contact?: { name?: string; email?: string; url?: string }
    license?: { name: string; url?: string }
  }
  servers?: Array<{ url: string; description?: string }>
  paths: Record<string, Record<string, OpenAPIOperation>>
  components?: {
    schemas?: Record<string, JsonSchema>
    securitySchemes?: Record<string, SecurityScheme>
  }
  tags?: Array<{ name: string; description?: string }>
}

export interface OpenAPIOperation {
  summary?: string
  description?: string
  operationId?: string
  tags?: string[]
  deprecated?: boolean
  parameters?: OpenAPIParameter[]
  requestBody?: {
    required?: boolean
    content: Record<string, { schema: JsonSchema }>
  }
  responses: Record<string, OpenAPIResponse>
  security?: Array<Record<string, string[]>>
}

export interface OpenAPIParameter {
  name: string
  in: 'path' | 'query' | 'header' | 'cookie'
  required?: boolean
  schema: JsonSchema
  description?: string
}

export interface OpenAPIResponse {
  description: string
  content?: Record<string, {
    schema?: JsonSchema
    example?: unknown
    examples?: Record<string, {
      summary?: string
      description?: string
      value: unknown
    }>
  }>
  headers?: Record<string, {
    description?: string
    schema?: { type: string }
  }>
}
```

---

## 6. OperationId 自动推断

```typescript
// vextjs/src/lib/openapi/operation-id.ts

/**
 * 从 HTTP 方法和路径推断 operationId
 *
 * GET    /users          → 'getUsers'
 * POST   /users          → 'createUsers'
 * GET    /users/:id      → 'getUsersById'
 * PUT    /users/:id      → 'updateUsersById'
 * DELETE /users/:id      → 'deleteUsersById'
 * GET    /users/list     → 'getUsersList'
 * POST   /users/:id/roles → 'createUsersIdRoles'
 * GET    /admin/dashboard → 'getAdminDashboard'
 */
export function inferOperationId(method: string, path: string): string {
  // HTTP 方法前缀映射
  const prefixMap: Record<string, string> = {
    GET:    'get',
    POST:   'create',
    PUT:    'update',
    PATCH:  'patch',
    DELETE: 'delete',
    HEAD:   'head',
    OPTIONS: 'options',
  }

  const prefix = prefixMap[method.toUpperCase()] ?? method.toLowerCase()

  // 路径转换：/users/:id/roles → UsersIdRoles
  const pathPart = path
    .replace(/^\//, '')           // 移除前导斜杠
    .replace(/\//g, '-')          // 斜杠转连字符
    .replace(/:(\w+)/g, 'By$1')  // :id → ById
    .replace(/\*(\w+)/g, '$1')   // *path → path
    .split('-')
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('')

  return prefix + pathPart
}
```

---

## 7. Swagger UI 集成

### 7.1 实现

```typescript
// vextjs/src/lib/openapi/swagger-ui.ts

/**
 * 注册 Swagger UI 和 OpenAPI spec 端点
 *
 * 端点:
 *   GET /docs          → Swagger UI HTML 页面
 *   GET /openapi.json  → OpenAPI JSON spec
 */
export function registerOpenAPIRoutes(
  app:    VextApp,
  spec:   object,
  config: OpenAPIEndpointConfig,
): void {
  const docsPath = config.docsPath ?? '/docs'
  const specPath = config.specPath ?? '/openapi.json'

  // ── OpenAPI JSON spec 端点 ────────────────────────────
  app.adapter.registerRoute('GET', specPath, [
    async (req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.rawJson(spec)
    },
  ])

  // ── Swagger UI HTML 端点 ──────────────────────────────
  app.adapter.registerRoute('GET', docsPath, [
    async (req, res) => {
      const html = generateSwaggerHTML(specPath, config)
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      res.text(html)
    },
  ])

  app.logger.info(`[openapi] docs:     ${docsPath}`)
  app.logger.info(`[openapi] spec:     ${specPath}`)
}

export interface OpenAPIEndpointConfig {
  /** Swagger UI 路径 @default '/docs' */
  docsPath?: string
  /** OpenAPI spec 路径 @default '/openapi.json' */
  specPath?: string
  /** 页面标题 */
  title?: string
  /** Swagger UI CDN 版本 @default '5.18.2' */
  swaggerUIVersion?: string
  /** 是否启用 "Try it out" 功能 @default true */
  tryItOutEnabled?: boolean
  /** 默认展开级别 @default 'list' */
  docExpansion?: 'none' | 'list' | 'full'
  /** 深度链接 @default true */
  deepLinking?: boolean
}

/**
 * 生成 Swagger UI HTML
 *
 * 使用 CDN 加载 Swagger UI（无需本地静态资源）
 */
function generateSwaggerHTML(
  specUrl: string,
  config:  OpenAPIEndpointConfig,
): string {
  const title           = config.title ?? 'API Documentation'
  const version         = config.swaggerUIVersion ?? '5.18.2'
  const tryItOut        = config.tryItOutEnabled ?? true
  const docExpansion    = config.docExpansion ?? 'list'
  const deepLinking     = config.deepLinking ?? true

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${version}/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@${version}/swagger-ui-bundle.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url:            '${specUrl}',
        dom_id:         '#swagger-ui',
        deepLinking:    ${deepLinking},
        docExpansion:   '${docExpansion}',
        tryItOutEnabled: ${tryItOut},
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset,
        ],
        layout: 'StandaloneLayout',
      })
    }
  </script>
</body>
</html>`
}
```

---

## 8. 配置集成

### 8.1 vext 配置扩展

```typescript
// src/config/default.ts
export default {
  port: 3000,

  // 🆕 OpenAPI 配置
  openapi: {
    /** 是否启用 OpenAPI 文档生成 @default true (dev) / false (production) */
    enabled: true,

    /** API 信息 */
    info: {
      title:       'My API',
      description: 'API documentation for My App',
      version:     '1.0.0',
      contact: {
        name:  'API Support',
        email: 'support@example.com',
      },
    },

    /** 服务器地址 */
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
    ],

    /** Guard → Security Scheme 映射 */
    guardSecurityMap: {
      auth: 'bearerAuth',
    },

    /** 安全方案定义 */
    securitySchemes: {
      bearerAuth: {
        type:         'http',
        scheme:       'bearer',
        bearerFormat: 'JWT',
      },
    },

    /** 端点配置 */
    endpoint: {
      docsPath: '/docs',
      specPath: '/openapi.json',
      tryItOutEnabled: true,
      docExpansion: 'list',
    },
  },
}
```

### 8.2 生产环境默认关闭

```typescript
// src/config/production.ts
export default {
  openapi: {
    enabled: false,     // 生产环境默认关闭 Swagger UI
    // 如需在生产环境启用，显式设为 true
  },
}
```

### 8.3 配置类型声明

```typescript
// vextjs/types/config.ts（追加）

declare module 'vextjs' {
  interface VextConfig {
    openapi?: {
      enabled?: boolean
      info?: {
        title?:       string
        description?: string
        version?:     string
        contact?: { name?: string; email?: string; url?: string }
        license?: { name: string; url?: string }
      }
      servers?: Array<{ url: string; description?: string }>
      tags?: Array<{ name: string; description?: string }>
      guardSecurityMap?: Record<string, string>
      securitySchemes?: Record<string, {
        type:    'http' | 'apiKey' | 'oauth2' | 'openIdConnect'
        scheme?: string
        bearerFormat?: string
        name?:   string
        in?:     'header' | 'query' | 'cookie'
        description?: string
      }>
      endpoint?: {
        docsPath?: string
        specPath?: string
        title?: string
        swaggerUIVersion?: string
        tryItOutEnabled?: boolean
        docExpansion?: 'none' | 'list' | 'full'
        deepLinking?: boolean
      }
    }
  }
}
```

---

## 9. bootstrap.ts 集成

### 9.1 启动流程修改

```typescript
// vextjs/lib/bootstrap.ts（修改 — 在 router-loader 之后追加）

import { RouteMetadataCollector } from './openapi/collector.js'
import { OpenAPIGenerator }      from './openapi/generator.js'
import { registerOpenAPIRoutes } from './openapi/swagger-ui.js'

async function bootstrap() {
  // ... 步骤 ①-④（原有逻辑不变） ...

  // ── 步骤 ⑤: router-loader ────────────────────────────
  const openapiConfig = config.openapi
  const openapiEnabled = openapiConfig?.enabled ??
    (process.env.NODE_ENV !== 'production')    // 默认：dev 启用，production 关闭

  const collector = openapiEnabled
    ? new RouteMetadataCollector()
    : null

  await loadRoutes(app, path.join(srcDir, 'routes'), {
    middlewareDefs,
    globalMiddlewares: internals.getGlobalMiddlewares(),
  }, collector)    // 🆕 传入收集器

  // ── 步骤 ⑤+: OpenAPI 文档生成 ────────────────────────
  if (openapiEnabled && collector) {
    const generator = new OpenAPIGenerator({
      title:             openapiConfig?.info?.title,
      description:       openapiConfig?.info?.description,
      version:           openapiConfig?.info?.version,
      servers:           openapiConfig?.servers,
      tags:              openapiConfig?.tags,
      securitySchemes:   openapiConfig?.securitySchemes,
      guardSecurityMap:  openapiConfig?.guardSecurityMap,
      contact:           openapiConfig?.info?.contact,
      license:           openapiConfig?.info?.license,
    })

    const spec = generator.generate(collector.getRoutes())

    registerOpenAPIRoutes(app, spec, openapiConfig?.endpoint ?? {})

    app.logger.info(`[openapi] ${collector.getRoutes().length} route(s) documented`)
  }

  // ── 步骤 ⑤+: lockUse() ──────────────────────────────
  internals.lockUse()

  // ... 步骤 ⑥-⑨（原有逻辑不变） ...
}
```

### 9.2 dev 模式热重载支持

```yaml
热重载时的 OpenAPI 行为:
  Tier 1（代码修改）:
    - RouteMetadataCollector.clear()
    - 重新扫描 routes/ 收集元信息
    - 重新生成 OpenAPI spec
    - /docs 和 /openapi.json 立即反映最新路由

  Tier 3（配置变更）:
    - 冷重启后完全重新初始化
    - OpenAPI 配置变更生效

  优势:
    - 修改路由 options（如 docs.summary）后立即在 /docs 看到变化
    - 新增/删除路由文件后 /openapi.json 自动更新
    - 无需手动重新生成文档
```

---

## 10. 完整示例：生成的 OpenAPI spec

基于 §1.2 的路由定义，生成的 OpenAPI 文档片段：

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "My API",
    "description": "API documentation for My App",
    "version": "1.0.0"
  },
  "paths": {
    "/users/list": {
      "get": {
        "summary": "获取用户列表",
        "description": "分页获取用户列表，支持按角色筛选和关键词搜索。",
        "operationId": "getUsersList",
        "tags": ["用户管理"],
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "required": false,
            "schema": { "type": "number", "minimum": 1 }
          },
          {
            "name": "limit",
            "in": "query",
            "required": false,
            "schema": { "type": "number", "minimum": 1, "maximum": 100 }
          },
          {
            "name": "search",
            "in": "query",
            "required": false,
            "schema": { "type": "string", "minLength": 0, "maxLength": 100, "nullable": true }
          },
          {
            "name": "role",
            "in": "query",
            "required": false,
            "schema": { "type": "string", "enum": ["admin", "user", "moderator"], "nullable": true }
          }
        ],
        "responses": {
          "200": {
            "description": "查询成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": { "type": "integer", "example": 0 },
                    "data": {
                      "type": "object",
                      "properties": {
                        "list": {
                          "type": "array",
                          "items": {
                            "type": "object",
                            "properties": {
                              "id":    { "type": "string" },
                              "name":  { "type": "string" },
                              "email": { "type": "string" },
                              "role":  { "type": "string", "enum": ["admin", "user", "moderator"] }
                            }
                          }
                        },
                        "total": { "type": "number" },
                        "page":  { "type": "number" },
                        "limit": { "type": "number" }
                      }
                    },
                    "requestId": { "type": "string" }
                  },
                  "required": ["code", "data", "requestId"]
                },
                "example": {
                  "code": 0,
                  "data": {
                    "list": [
                      { "id": "507f1f77bcf86cd799439011", "name": "张三", "email": "zhang@example.com", "role": "admin" }
                    ],
                    "total": 42,
                    "page": 1,
                    "limit": 20
                  },
                  "requestId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
                }
              }
            }
          },
          "401": {
            "description": "未认证"
          },
          "403": {
            "description": "无权限"
          }
        },
        "security": [{ "bearerAuth": [] }]
      }
    },
    "/users": {
      "post": {
        "summary": "创建用户",
        "operationId": "createUsers",
        "tags": ["用户管理"],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "name":     { "type": "string", "minLength": 1, "maxLength": 50 },
                  "email":    { "type": "string", "format": "email" },
                  "password": { "type": "string", "minLength": 8, "maxLength": 128 },
                  "role":     { "type": "string", "enum": ["admin", "user", "moderator"], "nullable": true }
                },
                "required": ["name", "email", "password"]
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "创建成功",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code": { "type": "integer", "example": 0 },
                    "data": {
                      "type": "object",
                      "properties": {
                        "id":        { "type": "string" },
                        "name":      { "type": "string" },
                        "email":     { "type": "string" },
                        "role":      { "type": "string" },
                        "createdAt": { "type": "string" }
                      }
                    },
                    "requestId": { "type": "string" }
                  },
                  "required": ["code", "data", "requestId"]
                }
              }
            }
          },
          "409": {
            "description": "邮箱已注册",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code":      { "type": "number" },
                    "message":   { "type": "string" },
                    "requestId": { "type": "string" }
                  }
                }
              }
            }
          },
          "422": {
            "description": "参数校验失败",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "code":      { "type": "number" },
                    "message":   { "type": "string" },
                    "errors":    { "type": "array" },
                    "requestId": { "type": "string" }
                  }
                }
              }
            }
          }
        },
        "security": [{ "bearerAuth": [] }],
        "x-rate-limit": { "max": 5 }
      }
    }
  },
  "components": {
    "schemas": {
      "ErrorResponse": {
        "type": "object",
        "properties": {
          "code":      { "type": "integer", "description": "HTTP 状态码或业务错误码" },
          "message":   { "type": "string",  "description": "错误信息" },
          "requestId": { "type": "string",  "description": "请求追踪 ID" }
        },
        "required": ["code", "message", "requestId"]
      },
      "SuccessResponse": {
        "type": "object",
        "properties": {
          "code":      { "type": "integer", "description": "状态码（0 表示成功）", "example": 0 },
          "data":      { "description": "响应数据" },
          "requestId": { "type": "string",  "description": "请求追踪 ID" }
        },
        "required": ["code", "data", "requestId"]
      }
    },
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT",
        "description": "JWT Bearer Token 认证"
      }
    }
  }
}
```

---

## 11. 边界与约束

### 11.1 不支持的场景

| 场景 | 说明 | 替代方案 |
|------|------|---------|
| 运行时类型推断 | 不从 handler 代码推断响应类型 | 在 `docs.responses` 中显式声明 |
| 装饰器注解 | vext 不使用装饰器 | options 对象中的声明式配置已足够 |
| GraphQL 文档 | 仅支持 REST API | GraphQL 有自己的内省机制 |
| YAML 输出 | 仅生成 JSON 格式 | 第三方工具可将 JSON 转 YAML |
| WebSocket 文档 | OpenAPI 3.0 不支持 WS | 使用 AsyncAPI 规范（未来扩展） |
| 文件上传（multipart） | 需要特殊 schema 处理 | 后续版本支持（`docs.requestBody.contentType: 'multipart/form-data'`） |

### 11.2 schema-dsl 覆盖范围

当前 SchemaConverter 支持的 schema-dsl 类型：

| DSL 类型 | 支持状态 | 说明 |
|----------|:--------:|------|
| `string` / `string:min-max` | ✅ | 含 `!`（必填）和 `?`（可选/nullable） |
| `number` / `number:min-max` | ✅ | — |
| `integer` / `integer:min-max` | ✅ | — |
| `boolean` | ✅ | — |
| `email` | ✅ | `format: 'email'` |
| `url` | ✅ | `format: 'uri'` |
| `date` | ✅ | `format: 'date-time'` |
| `objectId` | ✅ | `pattern: '^[0-9a-fA-F]{24}$'` |
| `enum:a,b,c` | ✅ | `enum: ['a', 'b', 'c']` |
| 嵌套对象 `{ ... }` | ✅ | 递归转换 |
| 数组 `[{ ... }]` | ✅ | `type: 'array'` + items |
| `any` | ✅ | 空 schema（允许任意类型） |
| 自定义验证函数 | ❌ | 无法自动转换为 JSON Schema |
| 正则表达式 | ❌ | 后续版本考虑支持 |

### 11.3 docs.responses 不声明时的默认行为

```yaml
未声明 docs.responses:
  - 自动添加 200 OK 响应（引用 SuccessResponse schema）
  - 不添加错误响应（需用户显式声明）

未声明 docs:
  - summary 默认为 "METHOD /path"
  - tags 从文件路径推断
  - operationId 自动生成
  - 无 requestBody/parameters（如果也没有 validate）
  - 仍会出现在 OpenAPI 文档中（除非设置 hidden: true）
```

---

## 12. 与其他模块的交互

```
openapi 模块依赖图:

RouteOptions.docs        ← 用户在路由 options 中声明
RouteOptions.validate    ← schema-dsl DSL 字符串
RouteOptions.middlewares ← 中间件配置（推断 security + rate-limit 等）
        ↓
router-loader            ← 扫描 routes/，每条路由调用 collector.addRoute()
        ↓
RouteMetadataCollector   ← 汇总所有路由元信息
        ↓
SchemaConverter          ← schema-dsl DSL → JSON Schema 转换
        ↓
OpenAPIGenerator         ← 生成 OpenAPI 3.0 文档
        ↓
registerOpenAPIRoutes    ← 注册 /docs + /openapi.json 端点
        ↓
VextAdapter              ← 这两个端点直接注册到 adapter（不走中间件链）
```

---

## 13. 实施步骤

### 13.1 文件清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `src/lib/openapi/index.ts` | 统一导出 |
| 新建 | `src/lib/openapi/types.ts` | RouteMetadata 等类型 |
| 新建 | `src/lib/openapi/collector.ts` | 路由元信息收集器 |
| 新建 | `src/lib/openapi/schema-converter.ts` | schema-dsl → JSON Schema |
| 新建 | `src/lib/openapi/generator.ts` | OpenAPI 3.0 文档生成 |
| 新建 | `src/lib/openapi/operation-id.ts` | operationId 推断 |
| 新建 | `src/lib/openapi/swagger-ui.ts` | Swagger UI HTML + 端点注册 |
| 修改 | `src/lib/router-loader.ts` | 追加 collector 参数 |
| 修改 | `src/lib/bootstrap.ts` | 追加 OpenAPI 初始化流程 |
| 修改 | `src/types/config.ts` | 追加 openapi 配置类型 |
| 修改 | `src/types/route.ts` | 追加 RouteDocsConfig 类型 |
| 新建 | `test/openapi/schema-converter.test.ts` | DSL → JSON Schema 测试 |
| 新建 | `test/openapi/generator.test.ts` | 文档生成测试 |
| 新建 | `test/openapi/operation-id.test.ts` | operationId 推断测试 |
| 新建 | `test/openapi/integration.test.ts` | 端到端集成测试 |

### 13.2 进度估算

| 阶段 | 工作量 | 说明 |
|------|:------:|------|
| 类型定义 + 收集器 | 0.5 天 | types.ts + collector.ts + router-loader 修改 |
| SchemaConverter | 1.5 天 | DSL 解析 + JSON Schema 转换 + 边界处理 |
| OpenAPIGenerator | 1.5 天 | 文档生成 + 响应包装 + security 推断 |
| Swagger UI + 端点注册 | 0.5 天 | HTML 模板 + 路由注册 |
| bootstrap 集成 + 配置 | 0.5 天 | 启动流程 + 配置类型 |
| 测试 | 1 天 | 单元测试 + 集成测试 |
| **合计** | **5-7 天** | 含 schema-dsl 边界 case 处理 |

### 13.3 验收标准

| # | 标准 | 验证方式 |
|---|------|---------|
| 1 | schema-dsl DSL 所有基础类型正确转换为 JSON Schema | 单元测试（20+ case） |
| 2 | 嵌套对象和数组正确转换 | 单元测试 |
| 3 | `!`（必填）和 `?`（可选）标记正确映射 | 单元测试 |
| 4 | operationId 自动推断正确（无重复） | 单元测试 |
| 5 | 路由 validate → parameters + requestBody 完整映射 | 集成测试 |
| 6 | docs.responses 正确映射到 OpenAPI responses | 集成测试 |
| 7 | 成功响应自动包装为 `{ code: 0, data, requestId }` 格式 | 集成测试 |
| 8 | middlewares → security 推断正确（auth / api-key 等） | 集成测试 |
| 9 | rate-limit → x-rate-limit 扩展正确 | 集成测试 |
| 10 | /docs 端点返回可用的 Swagger UI | 手动验证 |
| 11 | /openapi.json 返回合法的 OpenAPI 3.0 文档 | 使用 openapi-spec-validator 校验 |
| 12 | dev 模式热重载后文档自动更新 | 手动验证 |
| 13 | production 模式默认关闭 /docs 和 /openapi.json | 配置测试 |
| 14 | docs.hidden = true 的路由不出现在文档中 | 集成测试 |
| 15 | 生成的 OpenAPI spec 可被 openapi-generator 正确消费 | 使用 openapi-generator-cli 生成 TS client |

---

## 14. 后续扩展规划

| 扩展 | 说明 | 优先级 |
|------|------|:------:|
| **components/schemas 复用** | 允许用户定义共享 schema（如 `User`），在 responses 中用 `$ref` 引用 | P1 |
| **YAML 输出** | 支持 `/openapi.yaml` 端点 | P2 |
| **多版本 API 文档** | 结合 API 版本控制（Phase 4），生成版本化文档 | P2 |
| **代码生成集成** | 内置 `vext generate:client` 命令，基于 OpenAPI spec 生成 TS/Python 客户端 SDK | P2 |
| **自定义 UI 主题** | 支持替换 Swagger UI 为 ReDoc / Stoplight Elements 等 | P3 |
| **文件上传支持** | `multipart/form-data` 的 schema 自动生成 | P2 |
| **正则表达式 DSL** | schema-dsl 的正则类型（`'regex:/^[a-z]+$/'`）转换为 JSON Schema pattern | P3 |
| **请求/响应示例自动生成** | 基于 schema 自动生成合理的示例值 | P3 |

---

## 附录：类型索引

| 类型名 | 文件位置 | 说明 |
|--------|---------|------|
| `RouteDocsConfig` | `types/route.ts` | 路由 options.docs 配置 |
| `ResponseConfig` | `types/route.ts` | docs.responses 单条响应配置 |
| `RouteMetadata` | `lib/openapi/types.ts` | 收集到的路由元信息 |
| `CollectedRoutes` | `lib/openapi/types.ts` | 所有路由元信息汇总 |
| `JsonSchema` | `lib/openapi/schema-converter.ts` | JSON Schema 对象 |
| `ConvertResult` | `lib/openapi/schema-converter.ts` | DSL → JSON Schema 转换结果 |
| `OpenAPIConfig` | `lib/openapi/generator.ts` | OpenAPI 生成器配置 |
| `OpenAPIDocument` | `lib/openapi/generator.ts` | OpenAPI 3.0 文档结构 |
| `OpenAPIOperation` | `lib/openapi/generator.ts` | 单条路由的 Operation |
| `OpenAPIEndpointConfig` | `lib/openapi/swagger-ui.ts` | Swagger UI 端点配置 |

---

**版本记录**:
- v1.0.0 (2026-02-28): 初版设计 — 元信息收集 + schema-dsl→JSON Schema + OpenAPI 3.0 生成 + Swagger UI + 响应配置扩展 + 自动 operationId/tags/security 推断