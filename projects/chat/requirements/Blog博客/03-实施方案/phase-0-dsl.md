# Phase 0 — Blog DSL 错误码（多语言子目录）

> **所属阶段**: Phase 0（基础层）
> **操作**: 新建 3 个文件 + 修改 1 个文件
> **关联**: [README.md](./README.md) → §3.1 / §4 Phase 0

---

## 说明

在 `config/dsl/` 下新建 `blog/` 子目录，创建三语言错误码文件（zh-CN / en-US / zh-HK），
并修改 `config/dsl/index.ts` 将 blog 错误码合并到现有 `dslLocales` 导出中。

**设计要点**：

- Blog 为**独立子目录**，不影响现有扁平文件（`zh.ts` / `en.ts` / `hk.ts`）
- 所有条目使用 `{ code, message }` 对象格式（非简单字符串）
- 三语言文件中同一 key 的 `code` 值**完全一致**，仅 `message` 不同
- code 码段：业务 40301-40399，系统 50301-50399，禁止与其他模块重复
- 当前行程广场 DSL 迁移（Phase 0）尚未执行，Blog 先独立创建子目录

**文件清单**：

| # | 文件路径 | 操作 |
|:-:|---------|:----:|
| 1 | `config/dsl/blog/zh-CN.ts` | **新建** |
| 2 | `config/dsl/blog/en-US.ts` | **新建** |
| 3 | `config/dsl/blog/zh-HK.ts` | **新建** |
| 4 | `config/dsl/index.ts` | **修改** |

---

## 错误码分配表

| 错误码 Key | code | 类型 | 触发场景 |
|-----------|:----:|:----:|---------|
| `BLOG_NOT_FOUND` | 40301 | 业务 | 文章不存在、已删除、非作者访问草稿 |
| `BLOG_FORBIDDEN` | 40302 | 业务 | 非文章作者尝试修改/删除 |
| `BLOG_TAGS_LIMIT` | 40303 | 业务 | 标签数量超过 10 个 |
| `BLOG_CREATE_FAILED` | 50301 | 系统 | 创建文章数据库写入异常（catch 块） |
| `BLOG_UPDATE_FAILED` | 50302 | 系统 | 更新文章数据库写入异常（catch 块） |
| `BLOG_DELETE_FAILED` | 50303 | 系统 | 删除文章数据库写入异常（catch 块） |
| `BLOG_LIST_FAILED` | 50304 | 系统 | 文章列表查询异常（catch 块） |
| `BLOG_QUERY_FAILED` | 50305 | 系统 | 文章详情查询异常（catch 块） |

---

## 文件 1：`config/dsl/blog/zh-CN.ts`（新建）

```typescript
// config/dsl/blog/zh-CN.ts
// Blog 博客模块 — 简体中文错误码
// code 段：业务 40301-40399，系统 50301-50399

export const zhCN = {
    // === Blog 博客业务错误 ===
    'BLOG_NOT_FOUND': {
        code: 40301,
        message: '文章不存在',
    },
    'BLOG_FORBIDDEN': {
        code: 40302,
        message: '无权操作此文章',
    },
    'BLOG_TAGS_LIMIT': {
        code: 40303,
        message: '标签数量不能超过10个',
    },

    // === Blog 博客系统错误 ===
    'BLOG_CREATE_FAILED': {
        code: 50301,
        message: '文章创建失败',
    },
    'BLOG_UPDATE_FAILED': {
        code: 50302,
        message: '文章更新失败',
    },
    'BLOG_DELETE_FAILED': {
        code: 50303,
        message: '文章删除失败',
    },
    'BLOG_LIST_FAILED': {
        code: 50304,
        message: '文章列表查询失败',
    },
    'BLOG_QUERY_FAILED': {
        code: 50305,
        message: '文章查询失败',
    },
};
```

---

## 文件 2：`config/dsl/blog/en-US.ts`（新建）

```typescript
// config/dsl/blog/en-US.ts
// Blog module — English error codes
// code range: business 40301-40399, system 50301-50399

export const enUS = {
    // === Blog business errors ===
    'BLOG_NOT_FOUND': {
        code: 40301,
        message: 'Blog not found',
    },
    'BLOG_FORBIDDEN': {
        code: 40302,
        message: 'No permission to operate this blog',
    },
    'BLOG_TAGS_LIMIT': {
        code: 40303,
        message: 'Tags cannot exceed 10',
    },

    // === Blog system errors ===
    'BLOG_CREATE_FAILED': {
        code: 50301,
        message: 'Failed to create blog',
    },
    'BLOG_UPDATE_FAILED': {
        code: 50302,
        message: 'Failed to update blog',
    },
    'BLOG_DELETE_FAILED': {
        code: 50303,
        message: 'Failed to delete blog',
    },
    'BLOG_LIST_FAILED': {
        code: 50304,
        message: 'Failed to query blog list',
    },
    'BLOG_QUERY_FAILED': {
        code: 50305,
        message: 'Failed to query blog',
    },
};
```

---

## 文件 3：`config/dsl/blog/zh-HK.ts`（新建）

```typescript
// config/dsl/blog/zh-HK.ts
// Blog 博客模組 — 繁體中文錯誤碼
// code 段：業務 40301-40399，系統 50301-50399

export const zhHK = {
    // === Blog 博客業務錯誤 ===
    'BLOG_NOT_FOUND': {
        code: 40301,
        message: '文章不存在',
    },
    'BLOG_FORBIDDEN': {
        code: 40302,
        message: '無權操作此文章',
    },
    'BLOG_TAGS_LIMIT': {
        code: 40303,
        message: '標籤數量不能超過10個',
    },

    // === Blog 博客系統錯誤 ===
    'BLOG_CREATE_FAILED': {
        code: 50301,
        message: '文章創建失敗',
    },
    'BLOG_UPDATE_FAILED': {
        code: 50302,
        message: '文章更新失敗',
    },
    'BLOG_DELETE_FAILED': {
        code: 50303,
        message: '文章刪除失敗',
    },
    'BLOG_LIST_FAILED': {
        code: 50304,
        message: '文章列表查詢失敗',
    },
    'BLOG_QUERY_FAILED': {
        code: 50305,
        message: '文章查詢失敗',
    },
};
```

---

## index.ts 修改

### 文件路径：`config/dsl/index.ts`

### 修改策略

现有 `index.ts` 使用扁平文件导入（`zh.ts` / `en.ts` / `hk.ts`），导出 `dslLocales` 对象。
因为行程广场 Phase 0 子目录迁移尚未执行，Blog 采用**增量追加**方式：

1. **保留**现有扁平文件导入（不改动 `zh.ts` / `en.ts` / `hk.ts`）
2. **追加** blog 子目录导入
3. **合并**导出：用 spread 将 blog 错误码合并到各语言对象中

### 修改后完整代码

```typescript
// config/dsl/index.ts
/**
 * schema-dsl 多语言配置统一导出
 *
 * 用于应用启动时加载所有语言包
 *
 * 注意：schema-dsl 使用的语言代码格式：
 * - 'zh-CN' 简体中文
 * - 'en-US' 英文
 * - 'zh-HK' 繁体中文
 *
 * 变更记录：
 * - 2026-03-06: 追加 blog 子目录错误码合并（Blog 模块独立先行）
 */

// === 现有扁平文件（历史遗留，待行程广场 Phase 0 迁移到 core/ 子目录） ===
import zh from './zh';
import en from './en';
import hk from './hk';

// === Blog 模块子目录（新增） ===
import { zhCN as blogZhCN } from './blog/zh-CN';
import { enUS as blogEnUS } from './blog/en-US';
import { zhHK as blogZhHK } from './blog/zh-HK';

export const dslLocales = {
  'zh-CN': { ...zh, ...blogZhCN },   // 简体中文：旧扁平 + Blog
  'en-US': { ...en, ...blogEnUS },   // 英文：旧扁平 + Blog
  'zh-HK': { ...hk, ...blogZhHK },  // 繁体中文：旧扁平 + Blog
};

module.exports = { dslLocales };
```

### 变更对照（diff 视图）

```diff
 // config/dsl/index.ts

-import zh from './zh';
-import en from './en';
-import hk from './hk';
+// === 现有扁平文件（历史遗留，待行程广场 Phase 0 迁移到 core/ 子目录） ===
+import zh from './zh';
+import en from './en';
+import hk from './hk';
+
+// === Blog 模块子目录（新增） ===
+import { zhCN as blogZhCN } from './blog/zh-CN';
+import { enUS as blogEnUS } from './blog/en-US';
+import { zhHK as blogZhHK } from './blog/zh-HK';

 export const dslLocales = {
-  'zh-CN': zh,  // 简体中文
-  'en-US': en,  // 英文
-  'zh-HK': hk   // 繁体中文
+  'zh-CN': { ...zh, ...blogZhCN },   // 简体中文：旧扁平 + Blog
+  'en-US': { ...en, ...blogEnUS },   // 英文：旧扁平 + Blog
+  'zh-HK': { ...hk, ...blogZhHK },  // 繁体中文：旧扁平 + Blog
 };

 module.exports = { dslLocales };
```

---

## 后续迁移说明

当行程广场 Phase 0 执行时（将 `zh.ts` / `en.ts` / `hk.ts` 拆分迁移到 `core/` 子目录），
`index.ts` 的导入部分需要同步调整：

```typescript
// === 迁移完成后的 index.ts（参考，非本次变更） ===
import { zhCN as coreZhCN } from './core/zh-CN';
import { enUS as coreEnUS } from './core/en-US';
import { zhHK as coreZhHK } from './core/zh-HK';

import { zhCN as tripSquareZhCN } from './trip_square/zh-CN';
import { enUS as tripSquareEnUS } from './trip_square/en-US';
import { zhHK as tripSquareZhHK } from './trip_square/zh-HK';

import { zhCN as blogZhCN } from './blog/zh-CN';
import { enUS as blogEnUS } from './blog/en-US';
import { zhHK as blogZhHK } from './blog/zh-HK';

export const dslLocales = {
  'zh-CN': { ...coreZhCN, ...tripSquareZhCN, ...blogZhCN },
  'en-US': { ...coreEnUS, ...tripSquareEnUS, ...blogEnUS },
  'zh-HK': { ...coreZhHK, ...tripSquareZhHK, ...blogZhHK },
};
```

本次 Blog 实施**不需要**进行上述迁移，保持现有扁平文件 + blog 子目录增量追加即可。

---

## 验证要点

- [ ] `config/dsl/blog/` 目录存在且包含 `zh-CN.ts`、`en-US.ts`、`zh-HK.ts` 三个文件
- [ ] 三个文件的 key 完全一致（8 个 key），code 值完全一致
- [ ] `config/dsl/index.ts` 编译无报错（`import { zhCN } from './blog/zh-CN'` 路径正确）
- [ ] `npm run dev` 启动成功，DSL 模块加载无异常
- [ ] 在任意 Service/Controller 中 `ctx.dsl.error.throw('BLOG_NOT_FOUND')` 可正确抛出
- [ ] 切换语言后错误消息正确切换（如 en-US 下为 "Blog not found"）
- [ ] 现有扁平文件中的 key（如 `SELL_CONFIG_PROJECT_NOT_FOUND`）仍可正常使用
- [ ] grep 全局确认无 code 码冲突：`grep -rn "code: 403\|code: 503" config/dsl/`

---

**文档版本**: v1.0
**最后更新**: 2026-03-06
**Agent**: zed-copilot