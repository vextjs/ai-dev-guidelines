# Best Practices - 最佳实践指南

> AI 开发中的高级场景、边界处理和优化策略

---

## 📚 内容导航

本目录包含 AI 开发的最佳实践和高级策略，拆分为多个专题文档：

### 核心实践
- [edge-cases.md](./edge-cases.md) - 边界情况处理
- [token-optimization.md](./token-optimization.md) - Token 限制处理
- [large-projects.md](./large-projects.md) - 大项目开发策略
- [error-handling.md](./error-handling.md) - 错误处理和回滚

### 高级机制
- [memory-management.md](./memory-management.md) - 对话记忆存储
- [compliance-check.md](./compliance-check.md) - 规范检查机制
- [auto-fix.md](./auto-fix.md) - 自动修复机制

### AI 行为规范
- [AI-CODE-STANDARDS.md](./AI-CODE-STANDARDS.md) - AI 代码生成标准（报告验证、修复扫描）
- [ai-self-check.md](./ai-self-check.md) - AI 自检机制
- [analysis-methods.md](./analysis-methods.md) - 分析方法论

### 快速索引
- [WHEN-TO-USE.md](./WHEN-TO-USE.md) - 问题速查（什么场景用什么文档）

---

## 🎯 快速索引

### 按场景查找

#### 遇到异常时
- 网络故障 → [edge-cases.md#网络故障](./edge-cases.md#网络故障)
- 依赖冲突 → [edge-cases.md#依赖冲突](./edge-cases.md#依赖冲突)
- 权限问题 → [edge-cases.md#权限问题](./edge-cases.md#权限问题)
- 磁盘空间不足 → [edge-cases.md#磁盘空间](./edge-cases.md#磁盘空间)

#### Token 不够用时
- 大文件读取 → [token-optimization.md#分段读取](./token-optimization.md#分段读取)
- 项目分析 → [token-optimization.md#摘要生成](./token-optimization.md#摘要生成)
- 长时间任务 → [token-optimization.md#增量上下文](./token-optimization.md#增量上下文)

#### 大项目开发时
- 功能拆分 → [large-projects.md#模块化拆分](./large-projects.md#模块化拆分)
- 分阶段实施 → [large-projects.md#渐进式实施](./large-projects.md#渐进式实施)
- 并发开发 → [large-projects.md#并行协调](./large-projects.md#并行协调)

#### 需要回滚时
- 操作记录 → [error-handling.md#操作日志](./error-handling.md#操作日志)
- 检查点 → [error-handling.md#检查点机制](./error-handling.md#检查点机制)
- 回滚策略 → [error-handling.md#回滚策略](./error-handling.md#回滚策略)

#### 跨会话工作时
- 保存上下文 → [memory-management.md#对话存储](./memory-management.md#对话存储)
- 恢复任务 → [memory-management.md#任务恢复](./memory-management.md#任务恢复)

#### 代码不符合规范时
- 检测违规 → [compliance-check.md#检测机制](./compliance-check.md#检测机制)
- 自动修复 → [auto-fix.md#修复策略](./auto-fix.md#修复策略)

---

## 📖 使用建议

### 学习顺序
1. ✅ 先学习 **edge-cases.md** - 理解常见异常
2. ✅ 再学习 **token-optimization.md** - 掌握资源优化
3. ✅ 然后学习 **large-projects.md** - 应对复杂项目
4. ✅ 最后学习其他高级机制

### 查阅方式
- **遇到问题时**：直接跳转到相关章节
- **开发前预习**：通读相关最佳实践
- **回顾优化**：定期复习改进点

---

## 🔍 文档说明

### 为什么拆分？
```yaml
原因:
  - 单个文件过大（600+ 行）难以阅读
  - AI 加载完整文档消耗大量 Token
  - 按需加载提高效率

好处:
  - 快速定位问题
  - 减少无关内容加载
  - 便于维护和更新
```

### 如何阅读？
```yaml
方式 1: 按顺序学习
  - 适合首次接触
  - 建立完整知识体系

方式 2: 按需查阅
  - 适合解决具体问题
  - 快速找到解决方案

方式 3: 主题深入
  - 适合专项优化
  - 深入理解特定领域
```

---

**最后更新**: 2026-02-27
