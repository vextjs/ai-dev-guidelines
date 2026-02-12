# 文档规范

> AI 生成文档时必须遵守的标准

---

## 📋 文档类型

| 类型 | 用途 | 更新频率 |
|-----|------|---------|
| README.md | 项目入口 | 功能变更时 |
| CHANGELOG.md | 版本历史 | 每次发布 |
| API 文档 | 接口说明 | 接口变更时 |
| 技术方案 | 设计记录 | 需求开发时 |

---

## 📝 README 规范

### 必须包含

```yaml
章节:
  1. 项目标题和描述
  2. 安装方法
  3. 快速开始
  4. 配置说明
  5. API 概览
  6. 贡献指南（开源项目）
```

### 模板

```markdown
# 项目名称

> 一句话描述项目功能

## 安装

\`\`\`bash
npm install package-name
\`\`\`

## 快速开始

\`\`\`javascript
// 代码示例
\`\`\`

## 配置

| 配置项 | 说明 | 默认值 |
|-------|------|-------|
| xxx | xxx | xxx |

## API

### methodName(params)

描述...

## License

MIT
```

---

## 📊 CHANGELOG 规范

### 格式

```yaml
遵循: Keep a Changelog (https://keepachangelog.com)
版本: Semantic Versioning (https://semver.org)
```

### 模板

```markdown
# Changelog

## [Unreleased]

## [1.0.0] - 2026-02-12

### Added
- 新功能描述

### Changed
- 变更描述

### Fixed
- 修复描述

### Removed
- 移除描述
```

---

## 🔧 技术方案文档

### 必须包含

```yaml
章节:
  1. 需求背景
  2. 方案设计
  3. 实现细节
  4. 影响分析
  5. 测试计划
```

---

## ✏️ Markdown 格式规范

### 标题层级

```yaml
规则:
  - 文档只能有一个 H1（# 标题）
  - H2 用于主要章节
  - H3 用于子章节
  - 最多使用到 H4
  - 标题前后必须有空行

示例:
  # 文档标题
  
  ## 第一章
  
  ### 1.1 小节
```

### 代码块

```yaml
规则:
  - 必须指定语言标识
  - 代码块前后必须有空行
  - 长代码块需添加注释

语言标识:
  javascript, typescript, bash, yaml, json, sql, markdown
```

### 表格

```yaml
规则:
  - 表头必须有分隔行
  - 列对齐使用冒号（左对齐:---，右对齐---:，居中:---:）
  - 表格前后必须有空行

示例:
  | 列1 | 列2 | 列3 |
  |:----|:---:|----:|
  | 左  | 中  | 右  |
```

### 列表

```yaml
规则:
  - 无序列表使用 - 开头
  - 有序列表使用 1. 2. 3.
  - 嵌套列表缩进 2 空格
  - 列表项之间不要有空行（除非内容较长）
```

---

## 📁 文件命名规范

### 文档文件

```yaml
格式: <序号>-<描述>.md 或 <YYYYMMDD>-<描述>.md

规则:
  - 使用小写字母
  - 单词间用连字符（-）连接
  - 禁止使用空格和特殊字符
  - 有序文档使用两位数序号

示例:
  ✅ 01-requirement.md
  ✅ 02-technical-design.md
  ✅ 20260212-rate-limit.md
  ❌ Technical Design.md
  ❌ 技术方案.md
```

### 目录命名

```yaml
格式: <类型>-<描述> 或 <YYYYMMDD>-<描述>

示例:
  ✅ requirements/
  ✅ 20260212-user-auth/
  ❌ Requirements/
  ❌ 需求文档/
```

---

## 📄 文档头部 Frontmatter（可选）

```yaml
格式: YAML 格式，三横线包围

示例:
  ---
  title: 技术方案文档
  author: AI
  date: 2026-02-12
  version: 1.0
  status: draft | review | approved
  ---

使用场景:
  - 需要元数据管理的文档
  - 自动化处理的文档
  - 发布到文档站点的内容
```

---

## 📎 相关文档

- [代码规范](./code-standards.md)
- [模板目录](../templates/)

---

**最后更新**: 2026-02-12
