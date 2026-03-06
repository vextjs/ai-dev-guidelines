# Phase 0 — Blog Model

> **文件路径**: `app/model/blog.ts`
> **操作**: 新建
> **所属阶段**: Phase 0（基础层）
> **关联**: [README.md](./README.md) → §3.1 / §4 Phase 0

---

## 说明

blogs 集合 Mongoose Schema 定义，包含 14 个字段和 3 个复合索引。

**设计要点**：

- 使用 `timestamps` 自动维护 `created_at` / `updated_at`，与项目现有 Model（如 `article.ts`）保持一致
- `status` 使用字符串枚举（`draft` / `published`），不复用通用 `StatusEnum`（Blog 状态语义不同）
- `del_flag` 使用数字（0=正常，1=已删除），与项目软删除惯例一致
- `view_count` 默认 0，由 Service 层通过 `$inc` 原子自增
- 索引设计覆盖三种核心查询场景：公开列表、作者筛选、标签过滤

---

## 完整代码

```typescript
// app/model/blog.ts

import { Application } from 'egg';

/**
 * Blog 博客文章模型
 *
 * 字段说明：
 * - title: 文章标题（必填，1-200 字符）
 * - content: 文章正文（必填，最多 50000 字符）
 * - summary: 文章摘要（可选，最多 500 字符；不填时 Service 层自动截取正文前 200 字符）
 * - cover_image: 封面图 URL（可选）
 * - tags: 标签数组（最多 10 个，每个 1-20 字符）
 * - status: 文章状态 draft=草稿 / published=已发布
 * - author_id: 作者用户 ID（ObjectId）
 * - view_count: 浏览量（默认 0，通过 $inc 原子自增，异步更新不触发缓存失效）
 * - del_flag: 软删除标记 0=正常 1=已删除
 * - published_at: 首次发布时间（draft→published 时写入）
 * - deleted_at: 软删除时间
 * - created_at / updated_at: 由 timestamps 自动维护
 */
export default (app: Application) => {
    const mongoose = app.mongoose;
    const Schema = mongoose.Schema;

    const blogSchema = new Schema(
        {
            // 文章标题
            title: {
                type: Schema.Types.String,
                required: true,
                trim: true,
            },
            // 文章正文
            content: {
                type: Schema.Types.String,
                required: true,
            },
            // 文章摘要
            summary: {
                type: Schema.Types.String,
                required: false,
                default: '',
                trim: true,
            },
            // 封面图 URL
            cover_image: {
                type: Schema.Types.String,
                required: false,
                default: '',
            },
            // 标签数组
            tags: {
                type: [Schema.Types.String],
                required: false,
                default: [],
            },
            // 文章状态：draft=草稿 / published=已发布
            status: {
                type: Schema.Types.String,
                enum: ['draft', 'published'],
                default: 'draft',
                required: true,
            },
            // 作者用户 ID
            author_id: {
                type: Schema.Types.ObjectId,
                required: true,
            },
            // 浏览量（原子自增，异步更新）
            view_count: {
                type: Schema.Types.Number,
                required: false,
                default: 0,
            },
            // 软删除标记：0=正常，1=已删除
            del_flag: {
                type: Schema.Types.Number,
                enum: [0, 1],
                default: 0,
                required: true,
            },
            // 首次发布时间
            published_at: {
                type: Schema.Types.Date,
                required: false,
                default: null,
            },
            // 软删除时间
            deleted_at: {
                type: Schema.Types.Date,
                required: false,
                default: null,
            },
        },
        {
            timestamps: {
                createdAt: 'created_at',
                updatedAt: 'updated_at',
            },
        }
    );

    // === 索引设计 ===

    // 索引 1：公开列表主查询（覆盖过滤 + 排序）+ findPage 游标分页
    // 用途：GET /open/blog — status=published, del_flag=0, 按 published_at 降序
    blogSchema.index({ status: 1, del_flag: 1, published_at: -1 });

    // 索引 2：按作者查询（权限校验 + 作者筛选）
    // 用途：author_id 过滤 + 按 created_at 降序；也覆盖 Service 层权限校验查询
    blogSchema.index({ author_id: 1, del_flag: 1, created_at: -1 });

    // 索引 3：按标签过滤查询
    // 用途：GET /open/blog?tag=xxx — tags 数组字段 + status + del_flag
    blogSchema.index({ tags: 1, status: 1, del_flag: 1 });

    return mongoose.model('Blog', blogSchema, 'blogs');
};
```

---

## 索引与 findPage 的关系

| 索引 | 字段组合 | 覆盖的 findPage sort | 说明 |
|------|---------|:-------------------:|------|
| `idx_status_del_published` | `{ status: 1, del_flag: 1, published_at: -1 }` | `{ published_at: -1 }` | 公开列表。findPage 自动追加 `_id` 确保稳定排序，`_id` 无需加入索引 |
| `idx_author_del_created` | `{ author_id: 1, del_flag: 1, created_at: -1 }` | `{ created_at: -1 }` | 管理端按作者筛选时可利用此索引 |
| `idx_tags_status_del` | `{ tags: 1, status: 1, del_flag: 1 }` | — | 标签过滤场景，配合列表查询 |

---

## 与现有 Article Model 的区别

| 对比项 | `article.ts`（现有） | `blog.ts`（新建） |
|--------|:-------------------:|:----------------:|
| 集合名 | `articles` | `blogs` |
| 状态类型 | 数字（通用 `StatusEnum`） | 字符串（`draft` / `published`） |
| 作者字段 | `author`（String） | `author_id`（ObjectId） |
| 软删除 | 无 | `del_flag` + `deleted_at` |
| 分类 | `category` / `category_id` | 无（仅 tags） |
| 来源 | `source` / `source_link` | 无 |
| 浏览量 | `view_count` | `view_count`（异步 $inc，不触发缓存失效） |
| 发布时间 | 无专用字段 | `published_at` |

两个模型完全独立，互不影响。

---

**文档版本**: v1.0
**最后更新**: 2026-03-06
**Agent**: zed-copilot