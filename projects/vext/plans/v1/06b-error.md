# 06b - `app.throw` & `app.setValidator` — 错误与校验引擎

> **项目**: vext
> **日期**: 2026-02-26（最后更新: 2026-02-28 P0/P1 修复）
> **状态**: ✅ 已确认
> **所属模块**: 内置模块（`06-built-ins.md`）

---

## 1. `app.throw` — HTTP 错误抛出

### 1.1 设计原则

vextjs 的 `app.throw` 默认基于 **schema-dsl 的 `I18nError`** 实现，而非裸 `HttpError`。

**为什么用 schema-dsl I18nError？**

| 特性 | 裸 HttpError | schema-dsl I18nError |
|------|-------------|----------------------|
| 多语言支持 | ❌ | ✅ 根据 locale 自动翻译 message |
| 错误码映射 | 手动传 bizCode | ✅ 错误码 → message 自动映射 |
| 统一错误定义 | 散落在各处 | ✅ 集中在 error schema 文件 |
| 参数插值 | ❌ | ✅ 支持 `{{#balance}}` 等动态参数 |
| 插件可替换 | — | ✅ `app.setThrow()` 替换 |

### 1.1.1 schema-dsl 与 vext 的依赖方向

schema-dsl 和 vextjs 是**独立包**，依赖方向严格单向：

```
schema-dsl（独立，零依赖 vextjs）
    ↑
    │  vextjs 依赖 schema-dsl
    │
vextjs
    │  defaultThrow 调用 I18nError.create()
    │  → schema-dsl 完成 i18n 翻译、错误码查找
    │  → schema-dsl 返回 I18nError 实例（不抛出）
    │  → vextjs 从 I18nError 实例提取字段，构造 HttpError 并抛出
    ↓
HttpError（vextjs/lib/http-error.ts）
```

**职责边界**：

| 层 | 职责 | 包 |
|----|------|----|
| 翻译 + 错误码查找 | `I18nError.create(key, {}, statusCode)` → 根据 locale 翻译 message，查找 code | `schema-dsl` |
| HTTP 错误封装 | 将翻译后的 message 封装为 `HttpError` 实例 | `vextjs` |
| 错误响应格式化 | 捕获 `HttpError`，输出 `{ code, message, requestId }` | `vextjs` |

**关键约定**：
- schema-dsl **不** import/依赖 vextjs 的任何模块
- schema-dsl 的 `I18nError.create()` 返回 `I18nError` 实例（**不抛出**，由 vextjs 决定抛出时机）
- vextjs 的 `defaultThrow` 负责调用 schema-dsl 并将结果转换为 `HttpError`
- 若用户未配置 error schema（无 i18n 语言包），schema-dsl 退化为直接返回原始 message

### 1.1.2 schema-dsl I18nError 实际 API（类型签名）

> 以下签名摘自 `schema-dsl/index.d.ts`，确保 vext 方案与实际类型完全对齐。

```typescript
// schema-dsl 的 I18nError 类
class I18nError extends Error {
  readonly name: 'I18nError'
  message:     string                   // 已翻译的错误消息
  originalKey: string                   // 原始 i18n key（v1.1.5+）
  code:        string                   // 业务错误码（从 locale 配置提取，或使用 key）
  params:      Record<string, any>      // 插值参数
  statusCode:  number                   // HTTP 状态码（默认 400）
  locale:      string                   // 使用的语言

  // 创建实例（不抛出）
  static create(
    code: string,                                     // i18n key
    paramsOrLocale?: Record<string, any> | string,    // 参数对象 或 语言代码（智能识别）
    statusCode?: number,                              // HTTP 状态码
    locale?: string,                                  // 语言环境
  ): I18nError

  // 直接抛出
  static throw(
    code: string,
    paramsOrLocale?: Record<string, any> | string,
    statusCode?: number,
    locale?: string,
  ): never

  // 断言（条件为 falsy 时抛出）
  static assert(
    condition: any,
    code: string,
    paramsOrLocale?: Record<string, any> | string,
    statusCode?: number,
    locale?: string,
  ): asserts condition

  // 类型判断
  is(code: string): boolean

  // 序列化
  toJSON(): {
    error:       string           // 固定 'I18nError'
    originalKey: string           // 原始 key
    code:        string           // 业务码
    message:     string           // 已翻译消息
    params:      Record<string, any>
    statusCode:  number
    locale:      string
  }
}

// dsl.error 快捷方式（等价于 I18nError 的静态方法）
dsl.error.create(code, paramsOrLocale?, statusCode?, locale?): I18nError
dsl.error.throw(code, paramsOrLocale?, statusCode?, locale?): never
dsl.error.assert(condition, code, paramsOrLocale?, statusCode?, locale?): asserts condition
```

**智能参数识别（v1.1.8+）**：第 2 个参数 `paramsOrLocale` 自动判断类型：

| 传值类型 | 识别为 | 示例 |
|----------|--------|------|
| `string` | 语言代码 | `I18nError.create('user.notFound', 'zh-CN')` |
| `object` | 插值参数 | `I18nError.create('balance.low', { balance: 50 })` |
| `null/undefined` | 使用默认值 | `I18nError.create('user.notFound')` |

### 1.2 内置实现

```typescript
// vextjs/lib/http-error.ts
export class HttpError extends Error {
  constructor(
    public readonly status:  number,   // HTTP 状态码
    public readonly message: string,
    public readonly code?:   number,   // 业务错误码（不传则 code = status）
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

// 默认实现：基于 schema-dsl I18nError + AsyncLocalStorage 请求上下文
import { I18nError } from 'schema-dsl'
import { requestContext } from './request-context'   // AsyncLocalStorage

export const defaultThrow = (
  status:  number,
  message: string,
  paramsOrCode?: Record<string, any> | number,
  code?:   number,
): never => {
  // ── 智能参数识别 ──────────────────────────────────────
  //
  //   第三参数 paramsOrCode 自动判断类型：
  //     - number → 业务错误码（code）
  //     - object → i18n 插值参数（params），第四参数为 code
  //
  let params:   Record<string, any> = {}
  let bizCodeArg: number | undefined

  if (typeof paramsOrCode === 'number') {
    bizCodeArg = paramsOrCode
  } else if (typeof paramsOrCode === 'object' && paramsOrCode !== null) {
    params     = paramsOrCode
    bizCodeArg = code
  }

  // ── 从请求上下文获取 locale（线程安全，避免全局竞态）──
  //
  //   ⚠️ 为什么不用 Locale.currentLocale？
  //   Locale.currentLocale 是全局静态变量，Node.js 并发请求时
  //   一个请求的 setLocale() 会覆盖另一个请求的值——这是竞态 Bug。
  //
  //   正确做法：从 AsyncLocalStorage（requestContext）读取当前请求的 locale，
  //   并将其显式传给 I18nError.create() 的第 4 个参数。
  //
  const store  = requestContext.getStore()
  const locale = store?.locale   // 由请求级中间件写入（见 §1.7）

  // ── 核心流程 ──────────────────────────────────────────
  //
  //   1. 将 message 当作 i18n key + params 传给 I18nError.create()
  //      - schema-dsl 在已注册的语言包中查找该 key
  //      - 找到 → 根据 locale 翻译为本地化文本，并提取 locale 配置中的 code
  //      - 未找到 → 原样保留（退化为原始文本，不报错）
  //
  //   2. 从 I18nError 实例提取翻译后的信息
  //
  //   3. 用户显式传入的 code（业务码）优先级最高：
  //      用户传入 code > locale 配置中的 code > 默认使用 status
  //
  //   4. 构造 HttpError 并抛出
  //

  // 使用 I18nError.create()（不抛出），由 vextjs 统一控制抛出
  // 第 4 参数显式传 locale → 每个请求独立，不依赖全局 Locale.currentLocale
  const i18nErr = I18nError.create(message, params, status, locale)

  // 业务错误码优先级：用户显式传入 > locale 配置中的 code > undefined
  const localeCode = i18nErr.code !== i18nErr.originalKey
    ? Number(i18nErr.code) || undefined   // locale 配置中定义了 code（如 40001）
    : undefined                           // code 等于 key 本身，说明无独立 code 配置

  const finalCode = bizCodeArg ?? localeCode

  throw new HttpError(
    i18nErr.statusCode ?? status,
    i18nErr.message    ?? message,
    finalCode,
  )
}
```

> **🔴 并发安全说明**：`defaultThrow` 通过 `requestContext.getStore()?.locale` 获取当前请求的语言，
> **不依赖** `Locale.currentLocale`（全局静态变量，并发请求会互相覆盖）。
> 请求级 locale 由框架内置中间件写入 AsyncLocalStorage（见 §1.7.1）。

### 1.3 签名

```typescript
interface VextApp {
  /**
   * 抛出 HTTP 错误（支持 i18n 翻译 + 参数插值）
   *
   * @param status       HTTP 状态码（400/401/403/404/409/500…）
   * @param message      错误描述 — 支持 i18n key 和原始文本（见下方 §1.3.1）
   * @param paramsOrCode 智能识别：number → 业务错误码；object → i18n 插值参数
   * @param code         当第三参数为 params 时，第四参数为业务错误码
   *
   * @example app.throw(404, 'user.not_found')                              // i18n key
   * @example app.throw(400, '邮箱已注册', 10001)                            // 原始文本 + bizCode
   * @example app.throw(400, 'balance.insufficient', { balance: 50, required: 100 })  // i18n + 参数插值
   * @example app.throw(400, 'balance.insufficient', { balance: 50 }, 50001)          // i18n + 参数 + bizCode
   */
  throw(status: number, message: string, code?: number): never
  throw(status: number, message: string, params?: Record<string, any>, code?: number): never
}
```

#### 1.3.1 message 参数语义

`message` 参数**同时兼容** i18n key 和原始文本，框架按以下规则判断：

| 写法 | 含义 | 处理流程 |
|------|------|----------|
| `app.throw(404, 'user.not_found')` | **i18n key** | schema-dsl 查找 key → 按 locale 翻译 → `"User not found"` / `"用户不存在"` |
| `app.throw(400, '邮箱已注册')` | **原始文本** | schema-dsl 未找到匹配 key → 原样保留 `"邮箱已注册"` |
| `app.throw(401, 'auth.token_expired', 20002)` | **i18n key + 业务码** | 翻译 key + 用户传入的业务码覆盖 locale 配置中的 code |
| `app.throw(400, 'Email already exists', 10001)` | **原始文本 + 业务码** | 原样保留 + 附带业务码 |
| `app.throw(400, 'balance.insufficient', { balance: 50, required: 100 })` | **i18n key + 参数插值** | 翻译 key + 参数替换 `{{#balance}}` `{{#required}}` |
| `app.throw(400, 'balance.insufficient', { balance: 50 }, 50001)` | **i18n key + 参数 + 业务码** | 翻译 + 参数替换 + 用户业务码覆盖 locale code |

**智能参数识别**（与 schema-dsl 一致）：

| 第三参数类型 | 识别为 | 第四参数 |
|-------------|--------|---------|
| `number` | 业务错误码 | — |
| `object` | i18n 插值参数 | 业务错误码（可选） |
| 不传 | 无 | — |

**判断规则**（schema-dsl 内部）：
1. 在已注册的 error schema（语言包）中查找 `message` 是否为已知 key
2. 找到 → 翻译后替换（含 `{{#xxx}}` 参数插值）
3. 未找到 → 原样保留（视为原始文本，不报错）

**推荐实践**：
- 面向用户的错误信息（需多语言）→ 使用 i18n key：`app.throw(404, 'user.not_found')`
- 带动态参数的错误 → 使用 i18n key + params：`app.throw(400, 'balance.insufficient', { balance: 50, required: 100 })`
- 内部/调试错误（无需多语言）→ 使用原始文本：`app.throw(500, 'Unexpected state')`
- 团队统一风格即可，框架不强制

### 1.4 HTTP 状态码 vs 业务错误码

| 场景 | 写法 | HTTP 状态 | 响应体 |
|------|------|-----------|--------|
| 纯 HTTP 语义（原始文本） | `app.throw(404, '用户不存在')` | 404 | `{ code: 404, message: '用户不存在', requestId }` |
| 多语言 key（locale 无 code） | `app.throw(404, 'user.not_found')` | 404 | `{ code: 404, message: 'User not found', requestId }` |
| 多语言 key（locale 有 code） | `app.throw(404, 'account.notFound')` | 404 | `{ code: 40001, message: '账户不存在', requestId }` |
| 原始文本 + 业务码 | `app.throw(400, '邮箱已注册', 10001)` | 400 | `{ code: 10001, message: '邮箱已注册', requestId }` |
| i18n key + 业务码（覆盖 locale code） | `app.throw(401, 'auth.token_expired', 20002)` | 401 | `{ code: 20002, message: 'Token 已过期', requestId }` |
| i18n key + 参数插值 | `app.throw(400, 'balance.insufficient', { balance: 50, required: 100 })` | 400 | `{ code: 50001, message: '余额不足，当前 50 元，需要 100 元', requestId }` |
| i18n key + 参数 + 覆盖 bizCode | `app.throw(400, 'balance.insufficient', { balance: 50 }, 99999)` | 400 | `{ code: 99999, message: '余额不足，当前 50 元，需要 100 元', requestId }` |

**业务错误码优先级**：

```
用户显式传入 code（第三参数）  >  locale 配置中的 code（如 40001）  >  HTTP status（兜底）
```

> **约定**：业务错误码由团队自行规划（如 `1xxxx` 用户域、`2xxxx` 认证域），框架负责透传。
> HTTP 状态码始终决定 HTTP 响应的 status code，`code` 字段在响应体中——有业务码时用业务码，无业务码时退化为 HTTP 状态码。

### 1.5 使用方式

```typescript
// ── service 中（最常见）──────────────────────────────────
this.app.throw(404, '用户不存在')                    // 原始文本
this.app.throw(409, '邮箱已被注册', 10001)            // 原始文本 + 业务码
this.app.throw(404, 'user.not_found')                // i18n key → 自动翻译
this.app.throw(400, 'balance.insufficient', {        // i18n key + 参数插值
  balance: account.balance,
  required: amount,
})
this.app.throw(400, 'balance.insufficient', {        // i18n key + 参数 + 业务码
  balance: account.balance,
}, 50001)

// ── 中间件中 ────────────────────────────────────────────
req.app.throw(401, 'auth.token_expired')

// ── handler 中（少见，一般由 service 抛出）──────────────
app.throw(503, '服务暂不可用')
```

### 1.6 错误流转

**完整流程（含 schema-dsl I18nError 交互边界 + requestContext locale）**：

```
用户代码: app.throw(404, 'user.not_found')
  ↓
vextjs defaultThrow(404, 'user.not_found')
  ↓
requestContext.getStore()?.locale → 'en-US'（从 AsyncLocalStorage 读取，线程安全）
  ↓
┌─────────────────────────────────────────────────────┐
│  schema-dsl（独立包）                                 │
│                                                     │
│  I18nError.create('user.not_found', {}, 404, 'en-US')│
│    → 查找 key 'user.not_found'                      │
│    → 按显式 locale 'en-US' 翻译: 'User not found'   │
│    → 返回 I18nError 实例 {                           │
│        name:        'I18nError',                    │
│        originalKey: 'user.not_found',               │
│        message:     'User not found',               │
│        code:        'user.not_found',  // 无独立码   │
│        statusCode:  404,                            │
│        locale:      'en-US',                        │
│      }                                              │
└─────────────────────────────────────────────────────┘
  ↓ vextjs 从 I18nError 实例提取字段
  ↓ code 未由 locale 配置定义 → bizCode = undefined
vextjs: throw new HttpError(404, 'User not found', undefined)
  ↓
全局错误处理（vextjs/lib/error-handler.ts）捕获
  ↓
res.status(404).rawJson({
  code:      404,                  // bizCode 为空 → 退化为 HTTP status
  message:   'User not found',
  requestId: req.requestId,
})
```

**带 locale code 配置 + 参数插值的流程**：

```
语言包配置（src/locales/zh-CN.ts）:
  'balance.insufficient': { code: 50001, message: '余额不足，当前 {{#balance}} 元，需要 {{#required}} 元' }

用户代码: app.throw(400, 'balance.insufficient', { balance: 50, required: 100 })
  ↓
vextjs defaultThrow(400, 'balance.insufficient', { balance: 50, required: 100 })
  ↓
requestContext.getStore()?.locale → 'zh-CN'
  ↓
┌──────────────────────────────────────────────────────────────────────┐
│  schema-dsl                                                          │
│                                                                      │
│  I18nError.create('balance.insufficient',                            │
│                   { balance: 50, required: 100 }, 400, 'zh-CN')      │
│    → 查找 key 'balance.insufficient'                                 │
│    → 翻译 + 插值: '余额不足，当前 50 元，需要 100 元'                  │
│    → 返回 I18nError 实例 {                                           │
│        originalKey: 'balance.insufficient',                          │
│        message:     '余额不足，当前 50 元，需要 100 元',               │
│        code:        '50001',                                         │
│        statusCode:  400,                                             │
│      }                                                               │
└──────────────────────────────────────────────────────────────────────┘
  ↓ vextjs 提取 code = 50001 → bizCode = 50001
vextjs: throw new HttpError(400, '余额不足，当前 50 元，需要 100 元', 50001)
  ↓
全局错误处理
  ↓
res.status(400).rawJson({
  code:      50001,
  message:   '余额不足，当前 50 元，需要 100 元',
  requestId: req.requestId,
})
```

**带 locale code 配置的流程（无参数）**：

```
语言包配置（src/locales/zh-CN.ts）:
  'account.notFound': { code: 40001, message: '账户不存在' }

用户代码: app.throw(404, 'account.notFound')
  ↓
vextjs defaultThrow(404, 'account.notFound')
  ↓
requestContext.getStore()?.locale → 'zh-CN'
  ↓
┌─────────────────────────────────────────────────────┐
│  schema-dsl                                         │
│                                                     │
│  I18nError.create('account.notFound', {}, 404,      │
│                   'zh-CN')                           │
│    → 查找 key 'account.notFound'                    │
│    → 按 locale 翻译: '账户不存在'                     │
│    → 返回 I18nError 实例 {                           │
│        originalKey: 'account.notFound',             │
│        message:     '账户不存在',                     │
│        code:        '40001',       // locale 配置的码 │
│        statusCode:  404,                            │
│      }                                              │
└─────────────────────────────────────────────────────┘
  ↓ vextjs 提取 code = 40001 → bizCode = 40001
vextjs: throw new HttpError(404, '账户不存在', 40001)
  ↓
全局错误处理
  ↓
res.status(404).rawJson({
  code:      40001,                // locale 配置中的业务码
  message:   '账户不存在',
  requestId: req.requestId,
})
```

**原始文本流程（无 i18n 匹配时）**：

```
用户代码: app.throw(400, '邮箱已注册', 10001)
  ↓
vextjs defaultThrow(400, '邮箱已注册', 10001)
  ↓
┌─────────────────────────────────────────────────────┐
│  schema-dsl                                         │
│                                                     │
│  I18nError.create('邮箱已注册', {}, 400, locale)     │
│    → 未找到 key '邮箱已注册' → 原样返回               │
│    → 返回 I18nError 实例 {                           │
│        originalKey: '邮箱已注册',                     │
│        message:     '邮箱已注册',   // 原样保留       │
│        code:        '邮箱已注册',   // 等于 key 本身  │
│        statusCode:  400,                            │
│      }                                              │
└─────────────────────────────────────────────────────┘
  ↓ code === originalKey → localeCode = undefined
  ↓ 用户显式传入 code = 10001 → bizCode = 10001
vextjs: throw new HttpError(400, '邮箱已注册', 10001)
  ↓
全局错误处理
  ↓
res.status(400).rawJson({
  code:      10001,
  message:   '邮箱已注册',
  requestId: req.requestId,
})
```

### 1.7 多语言配置方式

`app.throw` 的多语言能力依赖 schema-dsl 的语言包配置。

#### 1.7.1 框架内置行为（零配置，自动加载）

vextjs **内置** i18n 加载逻辑，用户只需按约定在 `src/locales/` 目录放置语言文件，框架启动时自动完成：
1. 扫描 `src/locales/` 目录，按文件名识别语言代码（`zh-CN.ts` → `zh-CN`）
2. 通过 `dsl.config({ i18n })` 注册到 schema-dsl
3. 在内置中间件中从请求头 `Accept-Language` 提取 locale，写入 AsyncLocalStorage

```typescript
// ── 框架内部实现（用户无感知）────────────────────────────
// vextjs/lib/bootstrap.ts 中的 i18n 初始化部分

import { dsl } from 'schema-dsl'
import path from 'path'

// ① 启动时：按目录加载语言包
const localesDir = path.join(rootDir, 'src/locales')
if (existsSync(localesDir)) {
  dsl.config({ i18n: localesDir })   // 自动扫描 zh-CN.ts、en-US.ts 等
  app.logger.info(`[vextjs] i18n locales loaded from ${localesDir}`)
}

// ② 请求级：从 Accept-Language 提取 locale，写入 requestContext
//    （集成在内置 requestId 中间件之后，作为框架层 1 中间件的一部分）
const localeMiddleware: VextMiddleware = async (req, _res, next) => {
  const store = requestContext.getStore()
  if (store) {
    const accept = req.headers['accept-language'] ?? ''
    // 取第一个语言标签（如 'zh-CN,en-US;q=0.9' → 'zh-CN'）
    store.locale = accept.split(',')[0]?.trim() || app.config.locale?.default || 'zh-CN'
  }
  await next()
}
```

> **用户无需编写任何 plugin 或中间件**——只要 `src/locales/` 存在，框架自动处理。
> locale 通过 **AsyncLocalStorage** 存储，每个请求独立，不存在并发竞态问题。

**目录结构约定**：

**模式 A：平铺文件（默认，适合小型项目）**

```
src/locales/
├── zh-CN.ts         # export default { 'key': { code, message }, ... }
├── en-US.ts         # 同上，code 必须与 zh-CN 一致
├── ja-JP.ts         # 可选，按需添加
└── ...
```

**模式 B：子目录拆分（v1.2.3+，适合多人协作项目）** 🆕

> 依赖 schema-dsl ≥ v1.2.3 的 i18n 子目录合并功能。

```
src/locales/
├── core/               # 公共 code 段：1000-1999（框架层维护）
│   ├── zh-CN.ts
│   └── en-US.ts
├── account/            # 账户模块 code 段：10000-10999（开发者A）
│   ├── zh-CN.ts
│   └── en-US.ts
├── order/              # 订单模块 code 段：20000-20999（开发者B）
│   ├── zh-CN.ts
│   └── en-US.ts
└── payment/            # 支付模块 code 段：30000-30999（开发者C）
    ├── zh-CN.ts
    └── en-US.ts
```

子目录模式下，各模块独立维护自己的语言文件，启动时 schema-dsl 自动递归扫描并按语言合并。

**使用子目录模式**：通过插件将路径传给 `dsl.config({ i18n: path })`，利用 schema-dsl 内置的递归扫描能力：

```typescript
// src/plugins/i18n-subdir.ts
import { definePlugin } from 'vextjs'
import { dsl } from 'schema-dsl'
import path from 'path'

export default definePlugin({
  name: 'i18n-subdir',
  setup(app) {
    // 传路径给 schema-dsl，自动递归扫描子目录并按语言合并
    dsl.config({
      i18n: path.join(app.config.rootDir, 'src/locales'),
      strict: true,  // 推荐：同名 key 冲突时直接抛 Error（CI 环境）
    })
  },
})
```

> **注意**：子目录模式使用 schema-dsl 内置的文件扫描（仅支持 `.js` / `.json`），
> 不经过 vext 的 i18n-loader（后者支持 `.ts` 但仅扫描平铺文件）。
> 如果项目语言文件为 `.ts` 格式且需要子目录，建议使用 `vext build` 编译后以 `.js` 运行，
> 或在 locales 子目录中直接使用 `.js` / `.cjs` 格式。

**子目录模式关键特性**（schema-dsl v1.2.3）：

| 特性 | 说明 |
|------|------|
| 递归合并 | 同语言文件自动合并为一个完整语言包 |
| 冲突检测 | 默认 WARN 日志，`strict: true` 时抛 Error 阻断启动 |
| 文件名校验 | 只加载 BCP 47 格式文件名（`zh-CN.js`），自动跳过工具文件 |
| 100% 向后兼容 | 无子目录时行为与平铺模式完全一致 |

语言文件格式见 **[00-directory-structure.md](./00-directory-structure.md)** 的 locales 示例。

#### 1.7.2 可选：自定义加载方式

如果默认的目录加载不满足需求（如语言包来自远程配置中心），可通过插件覆盖：

**方式 A：`Locale.addLocale()`（编程式，适合动态场景）**

```typescript
// src/plugins/i18n-remote.ts — 从远程配置中心加载
import { definePlugin } from 'vextjs'
import { Locale } from 'schema-dsl'

export default definePlugin({
  name: 'i18n-remote',
  async setup(app) {
    // 从 Nacos / Apollo 等配置中心拉取语言包
    const zhMessages = await fetchRemoteLocale('zh-CN')
    const enMessages = await fetchRemoteLocale('en-US')

    Locale.addLocale('zh-CN', zhMessages)
    Locale.addLocale('en-US', enMessages)

    app.logger.info('[i18n-remote] 远程语言包加载完成')
  },
})
```

**方式 B：`dsl.config()` 指定自定义目录**

```typescript
// src/plugins/i18n-custom-path.ts
import { definePlugin } from 'vextjs'
import { dsl } from 'schema-dsl'
import path from 'path'

export default definePlugin({
  name: 'i18n-custom-path',
  setup(app) {
    // 覆盖默认的 locales 目录路径
    dsl.config({
      i18n: path.join(app.config.rootDir, 'i18n/errors')
    })
  },
})
```

#### 1.7.3 locale 配置项（`config/default.ts`）

```typescript
// src/config/default.ts
export default {
  locale: {
    default: 'zh-CN',         // 默认语言（Accept-Language 缺失时使用）
    supported: ['zh-CN', 'en-US'],  // 可选：限制支持的语言列表
  },
}
```

**locale 解析优先级**：

```
requestContext.locale（请求级，从 Accept-Language 提取）
  > config.locale.default（应用默认语言）
  > 'zh-CN'（框架硬编码兜底）
```

> **⚠️ 并发安全警告**：禁止在中间件中调用 `Locale.setLocale()` 设置全局语言——
> `Locale.currentLocale` 是全局静态变量，并发请求会互相覆盖（竞态 Bug）。
> vextjs 通过 AsyncLocalStorage + 显式 locale 参数传递到 `I18nError.create()` 确保并发安全。

### 1.8 插件覆盖

**覆盖方式一：`app.setThrow()`（推荐，类型安全）**

```typescript
// src/plugins/error-reporter.ts — 5xx 上报 + 保留原始行为
import { definePlugin } from 'vextjs'

export default definePlugin({
  name: 'error-reporter',
  setup(app) {
    app.setThrow((original) => (status, message, paramsOrCode?, code?) => {
      if (status >= 500) monitor.capture({ status, message })
      return original(status, message, paramsOrCode, code)
    })
  },
})
```

**覆盖方式二：直接赋值（完全替换）**

```typescript
app.throw = (status, message, paramsOrCode?, code?) => {
  throw new MyCustomError(status, message, paramsOrCode, code)
}
```

### 1.9 `VextApp` 补充 `setThrow()`

```typescript
type VextThrowFn = {
  (status: number, message: string, code?: number): never
  (status: number, message: string, params?: Record<string, any>, code?: number): never
}

interface VextApp {
  /**
   * 包装或替换 app.throw 的实现（插件专用）
   * @param wrapper 接收原始实现，返回新实现
   */
  setThrow(wrapper: (original: VextThrowFn) => VextThrowFn): void
}
```


---

## 2. `app.setValidator` — 校验引擎

### 2.1 设计原则

vextjs 默认使用 **schema-dsl** 作为校验引擎（零 import、DSL 简洁、启动时预编译）。企业项目已有 Zod / Yup 时，通过插件替换，而非强制迁移。

### 2.2 `VextValidator` 接口

```typescript
// vextjs/lib/validator.ts
export interface VextValidator {
  /**
   * 编译 schema（路由注册时执行一次，非每次请求）
   * @param rawSchema options.validate 中用户写的原始 schema
   */
  compile(rawSchema: unknown): unknown

  /**
   * 执行校验（每次请求时执行）
   */
  execute(
    compiledSchema: unknown,
    data: unknown,
  ): { valid: true; data: unknown }
     | { valid: false; errors: Array<{ field: string; message: string }> }
}
```

### 2.3 默认实现（schema-dsl）

```typescript
const defaultValidator: VextValidator = {
  compile: (rawSchema) => dsl(rawSchema as Record<string, string>),
  execute: (compiled, data) => validate(compiled, data),
}
```

### 2.4 插件替换为 Zod

```typescript
// src/plugins/zod-validator.ts
import { definePlugin } from 'vextjs'
import { z } from 'zod'

export default definePlugin({
  name: 'zod-validator',
  setup(app) {
    app.setValidator({
      compile:  (rawSchema) => rawSchema,  // Zod schema 直接用
      execute:  (schema, data) => {
        const result = (schema as z.ZodTypeAny).safeParse(data)
        if (result.success) return { valid: true, data: result.data }
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

覆盖后，路由 `validate` 直接传 Zod schema：

```typescript
import { z } from 'zod'

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
```

---

## 3. 速率限制（Rate Limit）— 内置默认

### 3.1 设计原则

速率限制是企业级 API 的**必需能力**，vextjs 将其内置而非依赖插件，开箱即用无需配置。

- **默认实现**：[`flex-rate-limit`](https://github.com/vextjs/flex-rate-limit)（vextjs 生态）
- **可替换**：通过 `app.setRateLimiter()` 替换为 express-rate-limit 等
- **三级配置**：全局默认 → 路由级 `override.rateLimit` → 路由级完全禁用

### 3.2 全局默认配置（`config/default.ts`）

```typescript
export default {
  rateLimit: {
    enabled:  true,
    max:      100,          // 每个窗口期最大请求数
    window:   60,           // 窗口期（秒）
    message:  'Too Many Requests',
    keyBy:    'ip',         // 限流维度：ip | user | custom
  },
}
```

### 3.3 路由级覆盖（`RouteOptions.override`）

```typescript
// 覆盖单个路由的速率限制
app.post('/upload', {
  override: { rateLimit: { max: 10, window: 60 } },   // 上传接口更严格
}, handler)

// 禁用某路由的速率限制（如内部健康检查）
app.get('/internal/ping', {
  override: { rateLimit: false },
}, handler)
```

### 3.4 `RouteOptions.override` 补充 `rateLimit` 字段

```typescript
override?: {
  timeout?:     number
  maxBodySize?: string | number
  cors?:        { ... }
  /** 覆盖该路由的速率限制；false = 禁用 */
  rateLimit?:   { max?: number; window?: number; keyBy?: string } | false
}
```

### 3.5 `app.setRateLimiter()` — 替换实现

```typescript
interface VextApp {
  /**
   * 替换全局速率限制实现（插件专用）
   * 默认：flex-rate-limit
   */
  setRateLimiter(limiter: VextRateLimiter): void
}

export interface VextRateLimiter {
  /** 返回中间件，框架自动注册为全局中间件 */
  middleware(config: RateLimitConfig): VextMiddleware
}
```

```typescript
// 替换为自定义实现示例
app.setRateLimiter({
  middleware: (config) => async (req, _res, next) => {
    const key = `rl:${req.ip}`
    const count = await app.cache.incr(key)
    if (count === 1) await app.cache.expire(key, config.window)
    if (count > config.max) req.app.throw(429, 'Too Many Requests')
    await next()
  },
})
```

---

## 附录 A：变更记录

| 日期 | 变更内容 |
|------|---------|
| 2026-02-26 | 初始版本 |
| 2026-02-27 | **P0 修复**：修正 defaultThrow 实现，对齐 schema-dsl 实际 I18nError API |
| 2026-02-28 | **P0 修复**：解决 Locale 并发竞态问题（AsyncLocalStorage）；**P1 改进**：app.throw 支持 params 插值、目录加载为默认方式 |

**2026-02-28 修复详情**：

| 修正项 | 修正前（问题） | 修正后（正确） |
|--------|---------------|---------------|
| Locale 并发安全 | 中间件调用 `Locale.setLocale()` 修改全局静态变量，并发请求互相覆盖 | 通过 `requestContext.getStore()?.locale` 获取请求级 locale，显式传给 `I18nError.create()` 第 4 参数 |
| i18n 参数插值 | `app.throw(status, msg, code?)` 不支持 `{{#xxx}}` 参数 | `app.throw(status, msg, paramsOrCode?, code?)` 智能识别：number→code, object→params |
| 多语言配置方式 | `Locale.addLocale()` 为主推荐，目录加载为备选 | 框架内置目录自动加载（`src/locales/`）为默认，零配置；编程式为可选覆盖 |
| 插件示例 | `const { dsl } = require('schema-dsl')` 混用 CJS | 统一使用 `import { dsl } from 'schema-dsl'` |
| 流程图 | 未体现 requestContext locale 来源和 params 传递 | 补充 requestContext 读取 + 参数插值完整流程 |
| 新增 §1.7.1 | — | 框架内置零配置 i18n 加载行为说明 |
| 新增 §1.7.3 | — | `config.locale` 配置项说明 |

**2026-02-27 P0 修复详情**：

| 修正项 | 修正前（错误） | 修正后（正确） |
|--------|---------------|---------------|
| 调用方式 | `error.throw(status, message, code)` | `I18nError.create(message, {}, status)` |
| 错误类型 | `SchemaError` | `I18nError` |
| 状态码字段 | `schemaErr.status` | `i18nErr.statusCode` |
| 交互方式 | try/catch `error.throw()` | 调用 `I18nError.create()` 返回实例（不抛出） |
| 业务码来源 | 仅用户传入 | 用户传入 > locale 配置 code > HTTP status |
| 新增 §1.1.2 | — | 补充 schema-dsl I18nError 完整类型签名（避免再次脱节） |