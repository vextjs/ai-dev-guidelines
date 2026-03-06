---
标题: Blog 博客 — 技术方案遗留问题跟踪
项目: chat
类型: issue
Agent: zed-copilot
日期: 2026-03-06
状态: 📋 待修复
---

# Blog 博客 — 技术方案遗留问题跟踪

> **关联文档**: [02-技术方案.md](./02-技术方案.md)（当前版本 v2.1）
> **说明**: 以下问题均为**文档描述与实际实现不一致**，不影响代码功能，仅需同步更新技术方案文档。

---

## 问题清单

| # | 问题 ID | 位置 | 严重度 | 状态 |
|:-:|:-------:|------|:------:|:----:|
| 1 | ISSUE-BLOG-DOC-01 | §1.1 架构图、§1.3 数据流、§7.2 路由设计 | 低 | ✅ 已修复 |
| 2 | ISSUE-BLOG-DOC-02 | §9.2 修改文件 footnote | 低 | ✅ 已修复 |
| 3 | ISSUE-BLOG-DOC-03 | §十一 开发顺序 Phase 0 依赖列 | 低 | ✅ 已修复 |

---

## 详细描述

### ISSUE-BLOG-DOC-01 — 用户端鉴权中间件描述不准确

**影响位置**:
- `§1.1 整体架构` 架构图中 `/home/*（userAuth）`、`(userAuth basic)` 描述
- `§1.3 核心数据流` 创建文章数据流中 `→ userAuth({ level: 'basic' }) 中间件`
- `§7.2 home 路由` 用户端分组中间件 `[userAuth({ level: 'basic' })]`

**文档现状**:
```
用户端分组中间件: [userAuth({ level: 'basic' })]
```

**实际实现**（`app/routes/home/blog.ts`）:
```typescript
const userJwt = middleware.jwt({
    property: jwtType.property,
    secret: app.config.custom.jwt.public_key,
});
const singleLogin = middleware.singleLogin({ valid_entity: 'user' });

groupRouter.group({
    prefix: '/blog',
    middlewares: [userJwt, singleLogin],
}, ...)
```

**说明**: 两者**功能完全等价**。`userAuth({ level: 'basic' })` 是高层抽象描述，实际在路由文件中以 `[userJwt, singleLogin]` 形式展开（与项目 `home/index.ts` 其他路由组的实现模式一致）。

**修复方案**: 将技术方案中所有 `userAuth({ level: 'basic' })` 的路由层描述改为：
```
[userJwt（JWT 解析）, singleLogin（单点登录校验）]
```
或添加注脚说明 `userAuth basic = userJwt + singleLogin`。

---

### ISSUE-BLOG-DOC-02 — §9.2 footnote 说明已过时

**影响位置**: `§9.2 修改文件（3 个）` 末尾的注意事项

**文档现状**:
```
注意：config/dsl/index.ts 的修改依赖行程广场 Phase 0 的子目录迁移完成。
若行程广场尚未执行 Phase 0，则 Blog 的 DSL 需要同时处理子目录迁移
（将 core + trip_square + blog 一并创建）。
```

**实际实现**: Blog DSL 已独立先行，`config/dsl/index.ts` 采用 **spread merge** 方式合并，
无需行程广场 Phase 0 完成：

```typescript
// 实际实现方式（不依赖行程广场迁移）
import zh from "./zh";   // 保留现有扁平文件
import en from "./en";
import hk from "./hk";
import { zhCN as blogZhCN } from "./blog/zh-CN";  // Blog 子目录增量追加
import { enUS as blogEnUS } from "./blog/en-US";
import { zhHK as blogZhHK } from "./blog/zh-HK";

export const dslLocales = {
    "zh-CN": { ...zh, ...blogZhCN },
    "en-US": { ...en, ...blogEnUS },
    "zh-HK": { ...hk, ...blogZhHK },
};
```

**修复方案**: 删除该 footnote，或替换为：
```
说明：Blog DSL 采用独立增量追加方式（spread merge），保留现有扁平文件，
无需等待行程广场 Phase 0 子目录迁移。
```

---

### ISSUE-BLOG-DOC-03 — §十一 Phase 0 依赖注释已无效

**影响位置**: `§十一 开发顺序` 表格中 Phase 0 的依赖列

**文档现状**:
```
| 0 | 基础层 | ... | 无（若行程广场 Phase 0 未执行，需同时处理子目录迁移） |
```

**实际情况**: CP3 实施阶段已确认 Blog DSL 独立先行，行程广场迁移不是前置依赖，
`(若行程广场 Phase 0 未执行，需同时处理子目录迁移)` 这一括注已不再适用。

**修复方案**: 将 Phase 0 依赖列改为：
```
无（Blog DSL 已独立实现，不依赖行程广场 Phase 0）
```

---

## 上下文背景

上述问题均产生于 **CP2 → CP3 技术方案演进过程**：

- CP2 方案（v2）撰写时，用户端路由鉴权以高层抽象 `userAuth` 描述，未展开为实际实现细节
- CP2 方案（v2）撰写时，`config/dsl/index.ts` 的修改方式尚未最终确定，保留了行程广场迁移的条件说明
- CP3 实施阶段确认了 Blog DSL 独立先行策略，上述条件注释失效

**这些问题不影响已实施代码的正确性，仅为文档与代码的描述层面差异。**

---

## 修复记录

| 问题 ID | 修复时间 | 修复说明 | 操作人 |
|:-------:|---------|---------|:------:|
| ISSUE-BLOG-DOC-01 | 2026-03-06 | §1.1 架构图 `(userAuth basic)` → `[userJwt, singleLogin]`；§1.3 数据流 `userAuth({ level: 'basic' })` → `[userJwt, singleLogin]`；§7.2 路由用户端分组中间件同步修正 | zed-copilot |
| ISSUE-BLOG-DOC-02 | 2026-03-06 | §9.2 footnote 删除行程广场依赖说明，替换为"Blog DSL 采用增量追加（spread merge），无需等待行程广场 Phase 0" | zed-copilot |
| ISSUE-BLOG-DOC-03 | 2026-03-06 | §十一 Phase 0 依赖列括注改为"无（Blog DSL 已独立实现，不依赖行程广场 Phase 0）" | zed-copilot |

---

**文档版本**: v1.1
**创建时间**: 2026-03-06
**最后更新**: 2026-03-06
**Agent**: zed-copilot
**状态**: ✅ 全部已修复