# 项目规范索引

> **用途**: 快速导航所有项目规范文档  
> **最后更新**: 2026-02-12  
> **维护**: AI 规范小组

---

## 📚 快速导航

### 🔥 新手必读

1. **[../../README.md](../../README.md)** (项目入口)
   - dev-docs 项目概述
   - 目录结构说明
   - AI 使用指南

2. **[../../QUICK-REFERENCE.md](../../QUICK-REFERENCE.md)** (快速参考)
   - 任务类型映射
   - 输出路径规范
   - 确认点机制

3. **[../../CONSTRAINTS.md](../../CONSTRAINTS.md)** (约束清单)
   - 执行的底线要求
   - 不可违反的规则

### 📋 完整规范导航

#### 开发规范

| 规范 | 用途 | 优先级 |
|------|------|-------|
| [CODE-STANDARDS.md](./CODE-STANDARDS.md) | 代码规范（风格、命名、注释） | P0 |
| [../../best-practices/AI-CODE-STANDARDS.md](../../best-practices/AI-CODE-STANDARDS.md) | AI 代码规范（验证优先原则） | P0 |
| [TECH-STACK.md](./TECH-STACK.md) | 技术栈定义和选择 | P1 |
| [PROJECT-PROFILE.md](./PROJECT-PROFILE.md) | 项目概况模板 | P1 |

#### 测试规范

| 规范 | 用途 | 优先级 |
|------|------|-------|
| [TESTING.md](./TESTING.md) | 完整测试规范 | P0 |
| [../../standards/test-standards.md](../../standards/test-standards.md) | 通用测试原则 | P0 |

#### CI/CD 规范

| 规范 | 用途 | 优先级 |
|------|------|-------|
| [CI-CD-OVERVIEW.md](./CI-CD-OVERVIEW.md) | CI/CD 概念和决策点 | P0 |
| [CI-CD-IMPLEMENTATION.md](./CI-CD-IMPLEMENTATION.md) | CI/CD 实施步骤和工具 | P0 |
| [CI-CD-QUALITY-GATES.md](./CI-CD-QUALITY-GATES.md) | 质量门禁详细说明 | P0 |

#### 监控规范

| 规范 | 用途 | 优先级 |
|------|------|-------|
| [MONITORING-METRICS.md](./MONITORING-METRICS.md) | 关键监控指标定义 | P1 |
| [MONITORING-ALERTS.md](./MONITORING-ALERTS.md) | 告警规则和响应流程 | P1 |
| [MONITORING-DASHBOARD.md](./MONITORING-DASHBOARD.md) | 数据收集和仪表板设计 | P2 |

#### 依赖管理规范

| 规范 | 用途 | 优先级 |
|------|------|-------|
| [DEPENDENCIES-VERSION.md](./DEPENDENCIES-VERSION.md) | 版本策略和选择方法 | P1 |
| [DEPENDENCIES-UPDATES.md](./DEPENDENCIES-UPDATES.md) | 更新策略和安全检查 | P1 |

### 🔄 工作流规范

| 规范 | 用途 | 优先级 |
|------|------|-------|
| [../../workflows/](../../workflows/) | 通用工作流目录 | P0 |
| [../../workflows/01-requirement-dev/](../../workflows/01-requirement-dev/) | 需求开发流程 | P0 |
| [../../workflows/02-bug-fix/](../../workflows/02-bug-fix/) | Bug 修复流程 | P0 |

### 💡 最佳实践

| 文档 | 用途 | 优先级 |
|------|------|-------|
| [../../best-practices/](../../best-practices/) | 最佳实践集合 | P1 |
| [../../best-practices/AI-CODE-STANDARDS.md](../../best-practices/AI-CODE-STANDARDS.md) | AI 代码规范 | P0 |
| [../../best-practices/validation/](../../best-practices/validation/) | 三轮验证机制 | P0 |

---

## 📖 按场景快速查找

### 🎯 我要...

#### 开始一个新项目
1. 读 [../../README.md](../../README.md) 了解 dev-docs 结构
2. 复制 `projects/_template/` 到 `projects/<项目名>/`
3. 填充 [PROJECT-PROFILE.md](./PROJECT-PROFILE.md)
4. 配置 [TECH-STACK.md](./TECH-STACK.md)

#### 写代码
1. 遵循 [CODE-STANDARDS.md](./CODE-STANDARDS.md) 的代码风格
2. 如果用 AI: 遵循 [AI-CODE-STANDARDS.md](../../best-practices/AI-CODE-STANDARDS.md)
3. 遵循 [../../CONSTRAINTS.md](../../CONSTRAINTS.md) 的底线

#### 写测试
1. 读 [TESTING.md](./TESTING.md) 了解项目测试配置
2. 参考 [../../standards/test-standards.md](../../standards/test-standards.md) 通用原则

#### 配置 CI/CD
1. 读 [CI-CD-OVERVIEW.md](./CI-CD-OVERVIEW.md) 理解核心概念
2. 跟随 [CI-CD-IMPLEMENTATION.md](./CI-CD-IMPLEMENTATION.md) 实施
3. 参考 [CI-CD-QUALITY-GATES.md](./CI-CD-QUALITY-GATES.md) 配置质量门禁

#### 配置监控
1. 读 [MONITORING-METRICS.md](./MONITORING-METRICS.md) 定义关键指标
2. 配置告警: [MONITORING-ALERTS.md](./MONITORING-ALERTS.md)
3. 构建仪表板: [MONITORING-DASHBOARD.md](./MONITORING-DASHBOARD.md)

#### 管理依赖
1. 添加依赖: 读 [DEPENDENCIES-VERSION.md](./DEPENDENCIES-VERSION.md)
2. 更新依赖: 读 [DEPENDENCIES-UPDATES.md](./DEPENDENCIES-UPDATES.md)

---

## 📊 规范体系概览

### 文件清单

```
projects/_template/
├── INDEX.md                      # 本文件 - 规范索引
├── PROJECT-PROFILE.md            # 项目概况模板
├── TECH-STACK.md                 # 技术栈模板
├── CODE-STANDARDS.md             # 代码规范模板
├── TESTING.md                    # 测试规范模板
├── CI-CD-OVERVIEW.md             # CI/CD 概览
├── CI-CD-IMPLEMENTATION.md       # CI/CD 实施
├── CI-CD-QUALITY-GATES.md        # CI/CD 质量门禁
├── MONITORING-METRICS.md         # 监控指标
├── MONITORING-ALERTS.md          # 告警配置
├── MONITORING-DASHBOARD.md       # 仪表板
├── DEPENDENCIES-VERSION.md       # 依赖版本
└── DEPENDENCIES-UPDATES.md       # 依赖更新
```

---

## 🔗 相关文档

- [../../README.md](../../README.md) - dev-docs 项目入口
- [../../QUICK-REFERENCE.md](../../QUICK-REFERENCE.md) - 快速参考卡
- [../../AI-WORKFLOW.md](../../AI-WORKFLOW.md) - AI 工作流概述
- [../../workflows/](../../workflows/) - 通用工作流
- [../../templates/](../../templates/) - 文档模板
- [../../best-practices/](../../best-practices/) - 最佳实践

---

**文件**: projects/_template/INDEX.md  
**版本**: 2.0  
**最后更新**: 2026-02-12
