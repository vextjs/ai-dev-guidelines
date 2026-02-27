# ai-dev-guidelines 项目规范

> **最后更新**: 2026-02-27  
> **维护者**: AI 规范团队  
> **主项目版本**: 见 [README.md](../../README.md)

---

## 📋 基本信息

| 项目 | 说明 |
|-----|------|
| 项目名称 | ai-dev-guidelines |
| 项目描述 | 轻量、灵活、实用的 AI 开发执行手册 |
| 定位 | AI Agent 的文档生成工具 |
| 目标用户 | GitHub Copilot / Claude / GPT 等 AI Agent |
| 代码仓库 | 当前工作区下的 `ai-dev-guidelines/` 目录 |
| 项目目录名 | `projects/dev-docs/`（即本项目在 projects/ 下的位置） |

---

## 🏗️ 技术栈详情

### 核心技术

| 分类 | 技术 | 说明 |
|-----|------|------|
| 文档格式 | Markdown | 所有文档使用 Markdown |
| 配置格式 | YAML | 决策树、工作流配置 |
| 脚本语言 | JavaScript/Node.js | 验证和工具脚本 |

### 工具链

| 工具 | 版本 | 用途 |
|-----|------|------|
| Node.js | >=18.x | 运行验证脚本 |
| Markdown Linter | - | 文档格式检查 |

---

## 📁 目录结构

```
ai-dev-guidelines/
├── README.md                 # 项目入口（AI 首读）
├── QUICK-REFERENCE.md        # 快速参考
├── CONSTRAINTS.md            # 约束清单（19 条）
├── STATUS.md                 # 项目状态
├── CHANGELOG.md              # 变更日志索引
│
├── workflows/                # 🤖 工作流定义
│   ├── 00-pre-check/         # 预检查（5 项必做）
│   ├── 00-task-identification/  # 任务识别
│   ├── 01-requirement-dev/   # 需求开发
│   ├── 02-bug-fix/           # Bug 修复
│   ├── 03-optimization/      # 性能优化
│   ├── 04-research/          # 技术调研
│   ├── 05-refactoring/       # 架构重构
│   ├── 06-database/          # 数据库变更
│   ├── 07-security/          # 安全修复
│   ├── 08-incident/          # 事故复盘
│   ├── 09-opensource-init/   # 开源项目初始化
│   ├── common/               # 通用组件（确认点、断点续传等）
│   └── decision-tree.yaml    # 决策树配置
│
├── templates/                # 📝 文档模板
│   ├── lite/                 # 精简模板（快速模式，8 个）
│   ├── core/                 # 核心模板（完整模式，8 个）
│   ├── extended/             # 扩展模板（Tier 2，5 个）
│   └── common/               # 通用组件
│
├── projects/                 # 🗂️ 项目规范
│   ├── _template/            # 项目规范模板
│   ├── chat/                 # chat 项目（参考实例）
│   ├── dev-docs/             # 本项目规范（ai-dev-guidelines）
│   ├── monSQLize/            # 轻量级 MongoDB ORM
│   ├── user-service/         # 用户服务（示例项目）
│   └── vext/                 # vext 项目
│
├── best-practices/           # 💡 最佳实践
├── standards/                # 📏 规范标准（9 个文件）
├── examples/                 # 📚 示例
├── tools/                    # 🔧 工具脚本
├── spec-self-fix/            # 🔧 规范自我修复机制
└── changelogs/               # 📜 版本变更详情
```

---

## 📝 文档规范

### 命名规范

| 类型 | 规范 | 示例 |
|-----|------|------|
| 目录名 | kebab-case | `best-practices/` |
| 文件名（入口） | UPPER_CASE.md | `README.md`, `STATUS.md` |
| 文件名（内容） | kebab-case.md | `error-handling.md` |
| 模板文件 | xxx-template.md | `requirement-template.md` |
| 精简模板 | xxx-lite.md | `technical-lite.md` |
| 输出文件 | YYYYMMDD-NN-描述.md | `20260227-01-analysis-xxx.md` |

### 文档结构规范

```markdown
# 标题

> **关键元数据**: 值

---

## 📋 章节1

内容...

---

## 🎯 章节2

内容...

---

**最后更新**: YYYY-MM-DD
```

### 必须遵守的规范

- ✅ 所有文档使用 UTF-8 编码
- ✅ 路径分隔符统一使用 `/`
- ✅ 表格必须有表头
- ✅ 代码块必须指定语言
- ✅ 链接使用相对路径
- ✅ 中文文档，技术术语可用英文

---

## ⚠️ 重要约定

### 强制规则（必须遵守）

1. **预检查必执行** - 每次任务开始前必须输出预检查结果（5 项必做）
2. **确认点必等待** - CP1-CP5 必须等待用户确认后继续
3. **模板必使用** - 生成文档必须基于对应模板
4. **索引必更新** - 任务完成后必须更新 TASK-INDEX.md
5. **文件修改需确认** - 涉及文件修改/删除操作必须先输出变更计划（约束 #16）

### 版本管理规范

| 版本类型 | 规则 | 示例 |
|---------|------|------|
| Major | 架构性变更 | v1.0.0 → v2.0.0 |
| Minor | 新增功能 | v2.0.0 → v2.1.0 |
| Patch | Bug修复、文档优化 | v2.0.0 → v2.0.1 |

### 禁止事项

- ❌ 跳过预检查直接执行任务
- ❌ 不等待用户确认就继续
- ❌ 使用绝对路径
- ❌ 日期字段留 YYYY-MM-DD 占位符（必须替换为真实日期）
- ❌ 删除 STATUS.md / CHANGELOG.md

---

## 🔄 工作流规范

### 执行模式

| 模式 | 条件 | 模板目录 |
|-----|------|---------|
| 快速模式 | 简单需求、< 5 个文件 | `templates/lite/` |
| 完整模式 | 复杂需求、正式交付 | `templates/core/` |

### 确认点

| 确认点 | 时机 | 用户选项 |
|-------|------|---------|
| CP1 | 需求理解后 | 确认/修改 |
| CP2 | 方案设计后 | 确认/修改/取消 |
| CP3 | 实施方案后（含实施前检查） | 确认/修改/取消 |
| CP4 | 测试完成后 | 确认/重测/跳过 |
| CP5 | 文档生成后 | 确认/修改 |

---

## 🧪 测试规范

### 验证工具

| 工具 | 路径 | 用途 |
|-----|------|------|
| validate-links.js | `tools/validate-links.js` | 检查链接有效性 |
| validate-structure.js | `tools/validate-structure.js` | 检查目录结构 |

### 验证检查清单

- [ ] 所有内部链接有效
- [ ] 目录结构符合规范
- [ ] 模板章节完整
- [ ] 版本号同步

---

## 📎 关键文档

| 文档 | 路径 | 用途 |
|-----|------|------|
| 入口文档 | `README.md` | AI 首读文档 |
| 快速参考 | `QUICK-REFERENCE.md` | 执行时速查 |
| 约束清单 | `CONSTRAINTS.md` | 核心约束（19 条） |
| 项目状态 | `STATUS.md` | 完成度追踪 |
| 决策树 | `workflows/decision-tree.yaml` | 任务路由 |

---

## 🔧 开发指南

### 添加新工作流

1. 在 `workflows/` 下创建目录 `XX-workflow-name/`
2. 创建 `README.md` 定义流程
3. 更新 `workflows/README.md` 索引
4. 更新 `decision-tree.yaml` 添加关键词映射
5. 更新 `QUICK-REFERENCE.md` 任务映射表

### 添加新模板

1. 确定模板层级（lite/core/extended）
2. 基于现有模板创建新文件
3. 更新 `templates/README.md` 模板清单
4. 更新 `QUICK-REFERENCE.md` 模板选择表

### 发布新版本

1. 更新 `README.md` 版本号
2. 更新 `STATUS.md` 版本信息
3. 创建 `changelogs/vX.Y.Z.md`
4. 更新 `CHANGELOG.md`

---

**注意**: 此文件为 ai-dev-guidelines 项目自身的规范，修改时需同步更新相关文档