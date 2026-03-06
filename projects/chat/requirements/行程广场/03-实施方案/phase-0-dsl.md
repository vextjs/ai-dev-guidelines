---
标题: Phase 0 实施方案 — DSL 多语言子目录迁移
项目: chat
类型: implementation
Agent: vscode-copilot
日期: 2026-03-05
状态: ⬜ 待执行
---

# Phase 0 — DSL 多语言子目录迁移

> **上游文档**: [02-技术方案.md §九改动清单](../02-技术方案.md) | [IMPLEMENTATION-PLAN.md](../IMPLEMENTATION-PLAN.md)
> **任务编号**: T01 ~ T09
> **可并行**: ✅ 与 Phase 0.5 无依赖，可同时执行
> **完成后解锁**: Phase 1（Model 层）

---

## 一、背景与目标

### 1.1 为什么要迁移

chat 服务当前 DSL 多语言配置为**扁平文件结构**：

```
config/dsl/
├── zh.ts       ← 所有中文 key 混在一个文件
├── en.ts       ← 所有英文 key 混在一个文件
├── hk.ts       ← 所有繁体 key 混在一个文件
└── index.ts    ← 以对象字面量方式传给 dsl.config()
```

行程广场功能需要新增若干 DSL 错误码（`trip_not_found`、`trip_not_listed`、`rate_limit_exceeded` 等），如果继续追加到现有扁平文件：
- 广场相关 key 分散在全局文件中，难以维护
- 新增删除功能时，不便于整体移除对应 key
- 不符合 schema-dsl v1.2.3 推荐的子目录结构

### 1.2 目标结构

迁移后形成**模块化子目录**结构：

```
config/dsl/
├── core/                   ← 原有通用 key（从旧扁平文件迁移）
│   ├── zh-CN.ts
│   ├── en-US.ts
│   └── zh-HK.ts
├── trip_square/            ← 行程广场专属 key（新增）
│   ├── zh-CN.ts
│   ├── en-US.ts
│   └── zh-HK.ts
└── index.ts                ← 重写：路径扫描 + 合并导出
```

旧文件 `zh.ts` / `en.ts` / `hk.ts` 在 T07（重写 index.ts）确认无误后由 T08 删除。

---

## 二、前置条件

| 条件 | 说明 |
|------|------|
| schema-dsl 版本 | v1.2.3+，支持 `dsl.config({ dir: [...] })` 多目录自动扫描 |
| 读取现有 DSL key | 执行前必须读取 `config/dsl/zh.ts`、`en.ts`、`hk.ts` 完整内容，确保迁移不遗漏 |
| Redis 无关 | 本 Phase 不涉及 Redis，与 Phase 0.5 完全独立 |

---

## 三、任务详情

### T01 — 新建 `config/dsl/core/zh-CN.ts`

**操作**: 新建文件  
**来源**: 将 `config/dsl/zh.ts` 的全部 key-value 原样迁移  
**注意**:
- 导出对象名改为 `zhCN`（或保持与项目现有约定一致）
- 不新增任何行程广场相关 key（广场 key 在 T04 处理）
- 保留注释（如有）

**文件格式参考**:

```
export const zhCN = {
  // —— 原 zh.ts 全部内容迁移至此，key/value 不变 ——
  LOGIN_REQUIRED: '请先登录',
  // ... 其余现有 key
}
```

---

### T02 — 新建 `config/dsl/core/en-US.ts`

**操作**: 新建文件  
**来源**: 将 `config/dsl/en.ts` 的全部 key-value 原样迁移  
**注意**: 同 T01，不新增广场相关 key

---

### T03 — 新建 `config/dsl/core/zh-HK.ts`

**操作**: 新建文件  
**来源**: 将 `config/dsl/hk.ts` 的全部 key-value 原样迁移  
**注意**: 同 T01，不新增广场相关 key

---

### T04 — 新建 `config/dsl/trip_square/zh-CN.ts`

**操作**: 新建文件  
**内容**: 行程广场模块专属 key，中文版

需新增的 key 清单：

| Key | 中文提示文案 | 触发场景 |
|-----|------------|---------|
| `trip_not_found` | 行程不存在或已被删除 | 点赞时行程 `del_flag != 0` 或查无此 ID |
| `trip_not_listed` | 该行程未上架到广场 | 对未上架（`listed_in_square=false`）的行程点赞 |
| `rate_limit_exceeded` | 操作过于频繁，请稍后再试 | 触发 flex-rate-limit 限流 |

> **关于 label（字段名提示）**：若项目现有 DSL 文件包含 label 类型的 key（用于表单字段名称），也需在此文件中为广场相关字段补充对应 label，具体以读取现有 `zh.ts` 格式为准。

---

### T05 — 新建 `config/dsl/trip_square/en-US.ts`

**操作**: 新建文件  
**内容**: 行程广场模块专属 key，英文版

| Key | 英文提示文案 |
|-----|------------|
| `trip_not_found` | Trip not found or has been deleted |
| `trip_not_listed` | This trip is not listed in the square |
| `rate_limit_exceeded` | Too many requests, please try again later |

---

### T06 — 新建 `config/dsl/trip_square/zh-HK.ts`

**操作**: 新建文件  
**内容**: 行程广场模块专属 key，繁体版

| Key | 繁体提示文案 |
|-----|------------|
| `trip_not_found` | 行程不存在或已被刪除 |
| `trip_not_listed` | 該行程未上架到廣場 |
| `rate_limit_exceeded` | 操作過於頻繁，請稍後再試 |

---

### T07 — 重写 `config/dsl/index.ts`

**操作**: 重写（不是追加，完全替换）  
**目标**: 同时满足两个消费方的需求

#### 消费方 1：`app.ts` 调用 `dsl.config()`

`app.ts` 通过 schema-dsl 的 `dsl.config()` 加载多语言配置。v1.2.3 支持传入目录路径数组，框架自动扫描目录下所有 `.ts` 文件并按语言合并。

新的 `dsl.config()` 调用方式需在 index.ts 中导出目录路径列表：

```
// 供 app.ts 使用的目录列表
export const dslDirs = [
  path.join(__dirname, 'core'),
  path.join(__dirname, 'trip_square'),
]
```

#### 消费方 2：`app/utils/ex-error/error_catch.ts` 直接 import locale 对象

`error_catch.ts` 在错误处理中需要直接访问合并后的 locale map，用于将 DSL 错误码转换为可读文案。需在 index.ts 中合并导出：

```
// 供 error_catch.ts 使用的合并 locale 对象
export const zhCNLocale = { ...coreZhCN, ...tripSquareZhCN }
export const enUSLocale = { ...coreEnUS, ...tripSquareEnUS }
export const zhHKLocale = { ...coreZhHK, ...tripSquareZhHK }
```

> **执行前提**: T01-T06 全部完成后才能重写 index.ts

---

### T08 — 删除旧扁平文件

**操作**: 删除以下 3 个文件  
**前提**: T07 完成且 `app.ts` + `error_catch.ts` 已改用新 index.ts 导出（T09 完成）

| 文件 | 说明 |
|------|------|
| `config/dsl/zh.ts` | 已迁移到 `core/zh-CN.ts` |
| `config/dsl/en.ts` | 已迁移到 `core/en-US.ts` |
| `config/dsl/hk.ts` | 已迁移到 `core/zh-HK.ts` |

> ⚠️ **必须在 T09 完成（调用方已切换）之后再删除**，否则会引发编译错误。

---

### T09 — 修改 `app.ts` + `app/utils/ex-error/error_catch.ts`

**操作**: 修改两个现有文件

#### `app.ts` 变更说明

| 变更点 | 原逻辑 | 新逻辑 |
|--------|--------|--------|
| `dsl.config()` 入参 | 传入包含 locale 对象的配置对象 | 改为传入 `dslDirs`（目录路径数组），由 framework 自动扫描合并 |
| import 来源 | 直接 import `zh.ts` / `en.ts` / `hk.ts` | 改为 `import { dslDirs } from './config/dsl'` |

**变更前后对比（逻辑层面，非代码）**:

```
// 变更前（示意）
import zh from './config/dsl/zh'
import en from './config/dsl/en'
import hk from './config/dsl/hk'
dsl.config({ zh, en, hk })

// 变更后（示意）
import { dslDirs } from './config/dsl'
dsl.config({ dirs: dslDirs })
```

> 具体 API 调用方式以 schema-dsl v1.2.3 文档为准，实际开发时先读取 user 服务 `app.ts` 中的调用方式作为参考。

#### `app/utils/ex-error/error_catch.ts` 变更说明

| 变更点 | 原逻辑 | 新逻辑 |
|--------|--------|--------|
| locale import 来源 | 直接 import 旧扁平文件 | 改为 `import { zhCNLocale, enUSLocale, zhHKLocale } from '../../config/dsl'` |
| 使用方式 | 不变（仍通过 key 查找文案） | 不变 |

---

## 四、执行顺序与依赖关系

```
T01 ──┐
T02   │ 可并行，互不依赖
T03   │
T04   ├──→ T07（重写 index.ts）──→ T09（更新调用方）──→ T08（删除旧文件）
T05   │
T06 ──┘
```

**最短执行路径**: 同时创建 T01~T06 → 完成后执行 T07 → 执行 T09 → 执行 T08

---

## 五、完成标准

| 验收项 | 检查方式 |
|--------|---------|
| 所有现有 DSL key 已完整迁移到 `core/` 子目录 | diff 对比旧文件与新 core/ 文件，key/value 一一对应 |
| 广场模块三语言错误码已在 `trip_square/` 子目录中配置 | 检查 T04~T06 三个文件，确认三个 key 均存在 |
| `dsl.config()` 仍能正常加载所有 locale | 启动 chat 服务，无报错 |
| `error_catch.ts` 仍能正确将错误码转换为文案 | 触发一个现有 DSL 错误，确认响应 message 正常 |
| 旧扁平文件已删除，无残留 import | 全局搜索 `from.*dsl/zh`、`from.*dsl/en`、`from.*dsl/hk`，无命中 |
| TypeScript 编译通过，无类型错误 | `tsc --noEmit` 无报错 |

---

## 六、回滚方案

Phase 0 涉及基础设施变更，回滚步骤：
1. 恢复 `config/dsl/zh.ts` / `en.ts` / `hk.ts`（从 Git 还原）
2. 恢复 `config/dsl/index.ts` 旧版本
3. 恢复 `app.ts` + `error_catch.ts` 旧 import 语句
4. 删除 `config/dsl/core/` 和 `config/dsl/trip_square/` 目录

> 回滚不影响 Model 层，Phase 1 可独立执行。但 Phase 1 中的 Trip 模型若已写入，回滚后错误码会以原始 key 字符串返回（不影响功能，仅影响可读性）。

---

## 七、关联文档

| 文档 | 路径 | 说明 |
|------|------|------|
| 技术方案 §九改动清单 | [../02-技术方案.md](../02-技术方案.md) | 文件变更全貌 |
| 实施计划 | [../IMPLEMENTATION-PLAN.md](../IMPLEMENTATION-PLAN.md) | T01-T09 任务概述 |
| Phase 0.5 | [./phase-05-ratelimit.md](./phase-05-ratelimit.md) | 可并行执行的限流基础设施 |
| Phase 1 | [./phase-1-model.md](./phase-1-model.md) | 依赖 Phase 0 完成 |

---

*文档创建时间: 2026-03-05 | Agent: vscode-copilot | 状态: ⬜ 待执行*