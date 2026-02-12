# Changelog

> 记录 dev-docs 项目的版本变更历史

---

## [Unreleased]

---

## [1.1.0] - 2026-02-12

### Added
- **P0 关键缺失补充**
  - 强制启动协议（预检查机制）
  - 三轮验证机制（23 项检查清单）
  - 意图分类系统（13 种意图）
  - 禁止项清单（13 条约束）
  - 确认点机制（5 个确认点）
  - 代码规范引用（7 个规范文件）

- **P1 重要增强**
  - 项目 Profile 系统增强（MCP 配置、禁止项模板）
  - 需求理解确认流程
  - 深度分析方法论（3 种分析策略）
  - Stop & Save 机制

- **新增文件**
  - `workflows/00-pre-check/checklist.md`
  - `workflows/00-pre-check/examples.md`
  - `workflows/00-task-identification/intent-matrix.md`
  - `workflows/00-task-identification/risk-levels.md`
  - `workflows/00-task-identification/step-mapping.md`
  - `workflows/common/confirmation-points.md`
  - `workflows/common/stop-and-save.md`
  - `workflows/01-requirement-dev/requirement-confirmation.md`
  - `best-practices/validation/README.md`
  - `best-practices/validation/three-round-validation.md`
  - `best-practices/validation/auto-fix.md`
  - `best-practices/analysis-methods.md`
  - `standards/README.md`
  - `standards/code-standards.md`
  - `standards/test-standards.md`
  - `standards/doc-standards.md`
  - `standards/api-standards.md`
  - `standards/script-standards.md`
  - `standards/security-standards.md`
  - `CONSTRAINTS.md`
  - `CHANGELOG.md`

### Changed
- 增强 `workflows/00-pre-check/README.md`，添加强制启动协议
- 增强 `projects/_template/PROJECT-PROFILE.md`，添加 MCP 配置和禁止项

---

## [1.0.0] - 2026-02-11

### Added
- 初始版本
- 核心工作流（需求开发、Bug 修复、性能优化）
- 文档模板（6 个核心模板）
- 最佳实践（边界处理、Token 优化、大项目策略）
- 项目规范结构（projects/_template/）

---

## 版本说明

本项目遵循 [Semantic Versioning](https://semver.org/):

- **MAJOR**: 不兼容的 API 变更
- **MINOR**: 向后兼容的功能新增
- **PATCH**: 向后兼容的问题修复

---

**维护者**: AI 规范团队  
**最后更新**: 2026-02-12

