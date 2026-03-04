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
  - typescript, javascript, jsx, tsx  # JavaScript 系列
  - python, java, go, rust, c, cpp    # 其他语言
  - bash, sh, shell, zsh              # Shell 脚本
  - json, yaml, yml, toml             # 配置文件
  - sql, graphql                      # 查询语言
  - markdown, md, html, css           # 标记语言
  - docker, dockerfile                # 容器
  - xml, diff, plaintext              # 其他格式

示例:
  \`\`\`typescript
  function hello(name: string): string {
    return `Hello, ${name}!`;
  }
  \`\`\`
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

## 🔗 链接格式规范

### 相对链接 vs 绝对链接

```yaml
相对链接:
  使用场景: 仓库内的文档引用
  格式: ./file.md 或 ../dir/file.md
  示例:
    - [代码规范](./code-standards.md)
    - [上级目录](../README.md)
    - [子目录](./workflows/README.md)

绝对链接:
  使用场景: 外部资源、公共文档站点
  格式: https://domain.com/path
  示例:
    - [GitHub](https://github.com)
    - [API文档](https://api.example.com/docs)
```

### 锚点链接

```yaml
规则:
  - 标题自动生成锚点
  - 中文标题使用英文 slug
  - 多级标题用 - 连接
  
示例:
  # 标题: ## 🔧 技术方案
  # 链接: [技术方案](#-技术方案)
  
  # 标题: ### 数据库设计
  # 链接: [数据库设计](#数据库设计)
```

---

## 🖼️ 图片和图表规范

### 图片引用

```yaml
格式: ![图片描述](图片路径)

本地图片:
  - 存储位置: ./assets/ 或 ./images/
  - 命名规范: <模块>-<描述>.png
  - 示例: ![架构图](./assets/system-architecture.png)

外部图片:
  - 使用稳定的图床或 CDN
  - 添加替代文本
  - 示例: ![Logo](https://cdn.example.com/logo.png)
```

### 图表规范

```yaml
推荐工具:
  - Mermaid: 流程图、序列图、类图
  - PlantUML: UML 图
  - ASCII Art: 简单示意图

Mermaid 示例:
  \`\`\`mermaid
  graph TD
    A[开始] --> B{判断}
    B -->|是| C[执行]
    B -->|否| D[结束]
    C --> D
  \`\`\`

表格替代:
  - 简单对比用表格
  - 复杂关系用图表
```

---

## 📏 中英文排版规范

### 空格规则

```yaml
必须加空格:
  - 中英文之间: "使用 React 开发"
  - 中文与数字之间: "共 3 个文件"
  - 中文与百分号之间: "覆盖率 80%"
  - 全角标点与其他字符之间: "这是示例，注意空格"

不加空格:
  - 全角标点与汉字之间: "这是示例，不加空格"
  - 链接文字内: "[查看详情](./link.md)"
  - 专有名词内: "GitHub API"
```

### 标点符号

```yaml
使用全角:
  - 中文句子使用全角标点: 。，！？；：""''（）
  - 例外: 代码、链接、专有名词中使用半角

使用半角:
  - 英文句子使用半角标点: . , ! ? ; : "" '' ()
  - 数字、代码、命令中使用半角
```

### 格式规范

```yaml
专有名词:
  - 保持正确的大小写: GitHub（不是 Github）
  - 保持正确的空格: App Store（不是 AppStore）
  - 常见专有名词:
    * JavaScript, TypeScript, Node.js
    * React, Vue.js, Angular
    * GitHub, GitLab
    * macOS, iOS, Windows
    * MySQL, MongoDB, Redis

数字:
  - 大数字使用千分位: 1,000,000
  - 小数保持精度: 3.14159
  - 百分比带单位: 95.5%
```

### 示例对比

```yaml
✅ 正确:
  - 使用 TypeScript 开发，覆盖率达到 85%。
  - 请查看 [GitHub 仓库](https://github.com/example)。
  - 支持 iOS 12+ 和 Android 6+。

❌ 错误:
  - 使用TypeScript开发，覆盖率达到85%。（缺少空格）
  - 请查看[Github仓库](https://github.com/example)。（缺少空格+专有名词错误）
  - 支持iOS12+和Android6+。（缺少空格）
```

---

## 📁 文件命名规范

### 代码/工程文档文件

```yaml
格式: <序号>-<描述>.md 或 <YYYYMMDD>-<描述>.md

规则:
  - 使用小写字母
  - 单词间用连字符（-）连接
  - 禁止使用空格和特殊字符
  - 有序文档使用两位数序号

适用范围: 代码仓库内的工程文档（README.md、CHANGELOG.md、API 文档等）

示例:
  ✅ 01-requirement.md（代码仓库内的工程文档）
  ✅ 02-technical-design.md
  ✅ 20260212-rate-limit.md
  ❌ Technical Design.md
  ❌ Requirements Doc.md
```

### 🔴 任务文档命名（requirements/ 下的任务产物 — 🆕 FIX-011 2026-02-28）

```yaml
格式: <序号>-<中文描述>.md 或 <中文描述>/

规则:
  - 任务产物文件（projects/<project>/requirements/ 下）使用中文命名
  - 固定序号前缀保留数字: 01-、02-、03-
  - 目录名使用中文描述（无日期前缀）
  - 报告文件简述部分也使用中文（见 temp-reports.md §FIX-008）

适用范围: ai-dev-guidelines/projects/<project>/requirements/<中文描述>/ 下的需求/技术/实施文档

示例:
  ✅ requirements/用户限流功能/01-需求定义.md
  ✅ requirements/用户限流功能/02-技术方案.md
  ✅ requirements/用户限流功能/03-实施方案/README.md
  ✅ requirements/用户限流功能/IMPLEMENTATION-PLAN.md
  ❌ requirements/20260212-rate-limit/01-requirement.md  ← 旧格式（英文+日期前缀）

原因:
  - FIX-011 决策（2026-02-28）确认任务产物使用中文命名
  - copilot-instructions.md 入口声明"所有输出使用中文"
  - 模板（requirement-lite.md / technical-lite.md）关联链接已使用中文名

详见: core/workflows/common/temp-reports.md §命名语言规则（FIX-008）
```

### 目录命名

```yaml
格式: <类型>-<描述> 或 <中文描述>（任务目录）

示例:
  ✅ requirements/（顶级分类目录）
  ✅ requirements/用户限流功能/（任务目录 — 中文）
  ✅ 20260212-user-auth/（代码仓库内的工程目录）
  ❌ Requirements/
  ❌ 需求文档/（顶级分类目录不用中文）
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
