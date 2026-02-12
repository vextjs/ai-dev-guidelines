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

## 📎 相关文档

- [代码规范](./code-standards.md)
- [模板目录](../templates/)

---

**最后更新**: 2026-02-12

