# 项目规范索引

> **用途**: 快速导航所有项目规范文档  
> **最后更新**: 2026-02-11  
> **维护**: 规范小组

---

## 📚 快速导航

### 🔥 新手必读

1. **[QUICK-START.md](../workflows/QUICK-START.md)** (快速开始)
   - 5 分钟快速入门
   - 核心概念总结
   - 常见问题 FAQ

2. **[SAFETY-PRINCIPLES.md](../workflows/SAFETY-PRINCIPLES.md)** (安全原则)
   - 执行的底线要求
   - 不可违反的规则
   - 风险评估方法

### 📋 完整规范导航

#### 开发规范

| 规范 | 用途 | 优先级 | 文件大小 |
|------|------|-------|---------|
| [CODE-STANDARDS.md](./CODE-STANDARDS.md) | 代码规范（风格、命名、注释） | P0 | 380L |
| [AI-CODE-STANDARDS.md](../best-practices/AI-CODE-STANDARDS.md) | AI 代码规范（验证优先原则） | P0 | 420L |
| [TECH-STACK.md](./TECH-STACK.md) | 技术栈定义和选择 | P1 | 220L |
| [PROJECT-PROFILE.md](./PROJECT-PROFILE.md) | 项目概况模板 | P1 | 150L |

#### 测试规范

| 规范 | 用途 | 优先级 | 文件大小 |
|------|------|-------|---------|
| [TESTING.md](./TESTING.md) | 完整测试规范 | P0 | 456L |
| | 包含：单元测试、集成测试、E2E 测试、Mock | | |

#### CI/CD 规范 (已拆分)

| 规范 | 用途 | 优先级 | 文件大小 |
|------|------|-------|---------|
| [CI-CD-OVERVIEW.md](./CI-CD-OVERVIEW.md) | CI/CD 概念和决策点 | P0 | 280L |
| [CI-CD-IMPLEMENTATION.md](./CI-CD-IMPLEMENTATION.md) | CI/CD 实施步骤和工具 | P0 | 370L |
| [CI-CD-QUALITY-GATES.md](./CI-CD-QUALITY-GATES.md) | 质量门禁详细说明 | P0 | 380L |

📌 **提示**: 原始 CI-CD.md (687L) 已拆分为上述 3 个文件，删除原件

#### 监控规范 (已拆分)

| 规范 | 用途 | 优先级 | 文件大小 |
|------|------|-------|---------|
| [MONITORING-METRICS.md](./MONITORING-METRICS.md) | 关键监控指标定义 | P1 | 350L |
| [MONITORING-ALERTS.md](./MONITORING-ALERTS.md) | 告警规则和响应流程 | P1 | 380L |
| [MONITORING-DASHBOARD.md](./MONITORING-DASHBOARD.md) | 数据收集和仪表板设计 | P2 | 310L |

📌 **提示**: 原始 MONITORING.md (890L) 已拆分为上述 3 个文件，删除原件

#### 依赖管理规范 (已拆分)

| 规范 | 用途 | 优先级 | 文件大小 |
|------|------|-------|---------|
| [DEPENDENCIES-VERSION.md](./DEPENDENCIES-VERSION.md) | 版本策略和选择方法 | P1 | 320L |
| [DEPENDENCIES-UPDATES.md](./DEPENDENCIES-UPDATES.md) | 更新策略和安全检查 | P1 | 330L |

📌 **提示**: 原始 DEPENDENCIES.md (745L) 已拆分为上述 2 个文件，删除原件

### 🔄 工作流规范

| 规范 | 用途 | 优先级 | 文件大小 |
|------|------|-------|---------|
| [STANDARD-WORKFLOWS.md](../workflows/STANDARD-WORKFLOWS.md) | 标准工作流定义 | P0 | 420L |
| [WORKFLOW-TRANSITIONS.md](./WORKFLOW-TRANSITIONS.md) | 工作流状态转移规则 | P1 | 680L |

📌 **待处理**: WORKFLOW-TRANSITIONS.md (680L) 需要拆分

### 💡 最佳实践

| 文档 | 用途 | 优先级 |
|------|------|-------|
| [best-practices/](../best-practices/) | 最佳实践集合 | P1 |
| ├─ AI-CODE-STANDARDS.md | AI 代码规范 | P0 |
| └─ (待扩充) | | |

---

## 📖 按场景快速查找

### 🎯 我要...

#### 开始一个新项目
1. 读 [QUICK-START.md](../workflows/QUICK-START.md) (5 分钟)
2. 读 [PROJECT-PROFILE.md](./PROJECT-PROFILE.md) 并填充项目信息
3. 检查 [TECH-STACK.md](./TECH-STACK.md) 选择技术栈
4. 准备 CI/CD: 读 [CI-CD-OVERVIEW.md](./CI-CD-OVERVIEW.md)

#### 写代码
1. 遵循 [CODE-STANDARDS.md](./CODE-STANDARDS.md) 的代码风格
2. 如果用 AI: 遵循 [AI-CODE-STANDARDS.md](../best-practices/AI-CODE-STANDARDS.md)
3. 遵循 [SAFETY-PRINCIPLES.md](../workflows/SAFETY-PRINCIPLES.md) 的底线

#### 写测试
1. 读 [TESTING.md](./TESTING.md) 了解测试规范
2. 单元测试: 部分 2
3. 集成测试: 部分 3

#### 配置 CI/CD
1. 读 [CI-CD-OVERVIEW.md](./CI-CD-OVERVIEW.md) 理解核心概念
2. 选择部署策略 (见文档决策表)
3. 跟随 [CI-CD-IMPLEMENTATION.md](./CI-CD-IMPLEMENTATION.md) 实施
4. 参考 [CI-CD-QUALITY-GATES.md](./CI-CD-QUALITY-GATES.md) 配置质量门禁

#### 配置监控
1. 读 [MONITORING-METRICS.md](./MONITORING-METRICS.md) 定义关键指标
2. 配置告警: [MONITORING-ALERTS.md](./MONITORING-ALERTS.md)
3. 构建仪表板: [MONITORING-DASHBOARD.md](./MONITORING-DASHBOARD.md)

#### 管理依赖
1. 添加依赖: 读 [DEPENDENCIES-VERSION.md](./DEPENDENCIES-VERSION.md)
2. 更新依赖: 读 [DEPENDENCIES-UPDATES.md](./DEPENDENCIES-UPDATES.md)
3. 安全检查: 见 DEPENDENCIES-UPDATES.md 的 npm audit 部分

#### 处理工作流转移
1. 理解规则: [WORKFLOW-TRANSITIONS.md](./WORKFLOW-TRANSITIONS.md)
2. 遵循 [STANDARD-WORKFLOWS.md](../workflows/STANDARD-WORKFLOWS.md) 的流程

---

## 📊 规范体系概览

### 阶段完成情况

```
P1 完成: ✅
  ├─ QUICK-START.md
  ├─ SAFETY-PRINCIPLES.md
  └─ STANDARD-WORKFLOWS.md

P2.1 完成: ✅
  ├─ TESTING.md
  ├─ CI-CD.md (已拆分为 3 个)
  ├─ MONITORING.md (已拆分为 3 个)
  └─ DEPENDENCIES.md (已拆分为 2 个)

P2.2 完成: ✅
  └─ WORKFLOW-TRANSITIONS.md

【本轮质量改进】新增: ✅
  └─ AI-CODE-STANDARDS.md

合计: 17 个核心规范 + 3 个拆分文件组 = 20+ 规范文档

待完成:
  P2.3: 快速路径流程 (4-6h)
  P2.4: 完善 AI 理解说明 (8-10h)
```

### 文件大小合规性

```
【改进成果】:
✅ CI-CD-OVERVIEW.md: 280L
✅ CI-CD-IMPLEMENTATION.md: 370L
✅ CI-CD-QUALITY-GATES.md: 380L
✅ MONITORING-METRICS.md: 350L
✅ MONITORING-ALERTS.md: 380L
✅ MONITORING-DASHBOARD.md: 310L
✅ DEPENDENCIES-VERSION.md: 320L
✅ DEPENDENCIES-UPDATES.md: 330L
✅ AI-CODE-STANDARDS.md: 420L

所有文件 ≤ 500 行 ✓

【待处理】:
⏳ WORKFLOW-TRANSITIONS.md: 680L (需拆分)
⏳ EXECUTION-REPORT-P1-P2.md: 1043L (临时，需清理)
⏳ PROGRESS-UPDATE-P2-MID.md: 860L (临时，需清理)
```

---

## 🗂️ 文件目录结构

```
dev-docs/
├── projects/_template/           ← 项目规范模板
│   ├── CI-CD-OVERVIEW.md
│   ├── CI-CD-IMPLEMENTATION.md
│   ├── CI-CD-QUALITY-GATES.md
│   ├── MONITORING-METRICS.md
│   ├── MONITORING-ALERTS.md
│   ├── MONITORING-DASHBOARD.md
│   ├── DEPENDENCIES-VERSION.md
│   ├── DEPENDENCIES-UPDATES.md
│   ├── TESTING.md
│   ├── CODE-STANDARDS.md
│   ├── PROJECT-PROFILE.md
│   ├── TECH-STACK.md
│   ├── WORKFLOW-TRANSITIONS.md
│   └── INDEX.md                  ← 【你在这里】
│
├── best-practices/               ← 最佳实践
│   ├── AI-CODE-STANDARDS.md      ← 新增，关键文件
│   └── (待扩充)
│
├── workflows/                    ← 工作流定义
│   ├── QUICK-START.md
│   ├── SAFETY-PRINCIPLES.md
│   └── STANDARD-WORKFLOWS.md
│
├── guidelines/                   ← 主规范 (来自外部)
│   └── ... (参考 E:\MySelf\guidelines\guidelines\v4.md)
│
└── 其他文档和报告
    ├── README.md
    ├── COMPREHENSIVE-ISSUE-REPORT.md
    ├── QUALITY-IMPROVEMENT-PHASE3-REPORT.md
    └── ...
```

---

## 🔗 相关文档

### 规范改进相关

- [COMPREHENSIVE-ISSUE-REPORT.md](../COMPREHENSIVE-ISSUE-REPORT.md) - 全面问题排查报告
- [QUALITY-IMPROVEMENT-PHASE3-REPORT.md](../QUALITY-IMPROVEMENT-PHASE3-REPORT.md) - 质量改进总结
- [AI-WORKFLOW.md](../AI-WORKFLOW.md) - AI 执行工作流

### 项目计划相关

- [IMPROVEMENT-PLAN.md](../IMPROVEMENT-PLAN.md) - 改进计划
- [OPTIMIZATION-SUMMARY.md](../OPTIMIZATION-SUMMARY.md) - 优化总结

---

## 📝 使用建议

### 1. 第一次使用？

```
建议阅读顺序:
1. QUICK-START.md (5 分钟，快速了解)
2. SAFETY-PRINCIPLES.md (10 分钟，了解底线)
3. 根据需要查阅具体规范
```

### 2. 需要深入学习？

```
建议阅读顺序:
1. STANDARD-WORKFLOWS.md (了解整体流程)
2. PROJECT-PROFILE.md (项目设置)
3. CODE-STANDARDS.md (开发规范)
4. TESTING.md (测试规范)
5. 根据项目需要选择其他规范
```

### 3. 遇到问题？

```
查找步骤:
1. 在本索引中用 Ctrl+F 搜索关键词
2. 根据场景定位到具体规范
3. 查看规范中的"常见问题"或"故障处理"部分
4. 如未找到答案，查阅 SAFETY-PRINCIPLES.md
```

---

## ✅ 定期维护清单

每个月检查一次:

```
□ 是否有新增的规范需要加入索引?
□ 规范中的链接是否都有效?
□ 是否有新的文件需要归档或删除?
□ 规范是否需要更新或改进?
□ 是否有用户反馈的规范改进?
```

---

## 💬 反馈和建议

如果觉得某个规范：
- ❓ 难以理解 → 需要添加更多例子
- ⚠️ 不准确 → 需要更新
- 🔍 难以查找 → 需要改进索引
- 📈 需要扩展 → 可以建议新规范

请在相应规范文件中提出反馈或联系规范小组。

---

**文件**: projects/_template/INDEX.md  
**版本**: 1.0  
**最后更新**: 2026-02-11  
**维护**: 规范小组

