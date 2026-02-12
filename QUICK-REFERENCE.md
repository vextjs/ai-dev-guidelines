# 🚀 快速参考卡

> AI 执行任务时的速查手册

---

## 📋 任务类型 → 工作流映射

| 任务类型 | 工作流文件 | 关键词 |
|---------|-----------|--------|
| 需求开发 | `workflows/01-requirement-dev/` | 实现、开发、添加、集成、对接 |
| Bug 修复 | `workflows/02-bug-fix/` | 修复、解决、Bug、报错 |
| 性能优化 | `workflows/03-optimization/` | 优化、慢、性能、加速 |
| 技术调研 | `workflows/04-research/` | 调研、选型、对比 |
| 架构重构 | `workflows/05-refactoring/` | 重构、重写、改造 |
| 数据库变更 | `workflows/06-database/` | 迁移、Schema、索引 |
| 安全修复 | `workflows/07-security/` | 漏洞、安全、注入 |
| 事故复盘 | `workflows/08-incident/` | 故障、复盘、宕机 |

---

## 🚨 四条底线（必须遵守）

```yaml
1. 先读工作流: 收到请求 → 先读 workflows/ → 再执行
2. 按模板生成: 使用 templates/ 的模板，不要自由发挥
3. 保存到 projects/: 所有输出放到 projects/<project-name>/
4. 验证后报告: 执行完验证步骤才能说"完成"
```

### 扩展底线

```yaml
5. 先预检查: 执行任务前必须完成预检查清单（5项）
6. 不猜测: 不确定时询问用户，不要假设或猜测
```

---

## 📊 任务类型 → 输出文档矩阵

| 任务类型 | 必须文档 | 可选文档 | 测试要求 | 总计 |
|---------|---------|---------|---------|------|
| 需求开发 | 01-requirement.md<br>02-technical.md<br>03-implementation.md | README.md<br>API文档 | 单元测试<br>集成测试 | 5-7 |
| Bug 修复 | 01-analysis.md<br>02-solution.md | 回归测试 | Bug 复现测试<br>修复验证 | 3-4 |
| 性能优化 | 01-baseline.md<br>02-optimization.md<br>03-results.md | 性能测试报告 | 压力测试<br>对比测试 | 4-5 |
| 技术调研 | 01-research.md<br>02-conclusion.md | POC 代码 | 无 | 2-3 |
| 架构重构 | 01-refactoring-plan.md<br>02-implementation.md | 迁移指南 | 全量回归测试 | 3-4 |
| 数据库变更 | 01-migration-plan.md<br>02-migration-script.md | 回滚脚本 | 数据验证 | 3-4 |
| 安全修复 | 01-vulnerability.md<br>02-fix.md | 安全扫描报告 | 安全测试 | 3-4 |
| 事故复盘 | 01-incident-report.md<br>02-action-items.md | 时间线 | 无 | 2-3 |

---

## 📁 输出路径规范

```
projects/<project-name>/
├── requirements/              # 需求开发输出
│   └── <YYYYMMDD-feature>/
├── bugs/                      # Bug 修复输出
│   └── <BUG-project-id>/
├── optimizations/             # 性能优化输出
├── refactoring/               # 重构输出
├── database/                  # 数据库变更输出
├── security/                  # 安全修复输出
└── research/                  # 技术调研输出
```

---

## 📝 文档编号规范

| 类型 | 格式 | 示例 |
|------|------|------|
| 需求 | `YYYYMMDD-<feature>` | `20260212-rate-limit` |
| Bug | `BUG-<project>-<id>-<desc>` | `BUG-user-001-login-timeout` |
| 优化 | `OPT-<module>-<id>` | `OPT-payment-db-001` |
| 重构 | `REF-<module>-<date>` | `REF-user-auth-20260212` |

---

## ✅ 预检查清单（每次必做）

```
🔴 预检查清单:
✅ 1. 工作区: <项目路径>
✅ 2. 项目规范: 已加载 PROJECT-PROFILE.md
✅ 3. 任务类型: <识别结果>
✅ 4. 风险等级: P0/P1/P2
✅ 5. 输出目录: projects/<project>/...
```

---

## 🎯 确认点（必须等待用户）

| 确认点 | 时机 | 选项 |
|--------|------|------|
| CP1 | 需求理解后 | 确认/修改 |
| CP2 | 方案设计后 | 确认/修改/取消 |
| CP3 | 代码实现后 | 确认/修改/取消 |
| CP4 | 测试完成后 | 确认/重测/跳过 |
| CP5 | 文档生成后 | 确认/修改 |
| CP6 | 项目文档更新后 | 确认/修改/跳过 |

---

## 🔗 常用链接

- [预检查流程](./workflows/00-pre-check/README.md)
- [任务识别](./workflows/00-task-identification/README.md)
- [确认点机制](./workflows/common/confirmation-points.md)
- [三轮验证](./best-practices/validation/README.md)
- [禁止项清单](./CONSTRAINTS.md)

---

## ✅ 三轮验证速查

### 第一轮：逻辑验证

```yaml
必查项（6项）:
  ✅ 需求覆盖: 所有需求点有对应实现
  ✅ 边界处理: null/undefined/空值处理
  ✅ 错误处理: async 函数有 try-catch
  ✅ 逻辑完整: if 有 else，switch 有 default
  ✅ 流程正确: 业务流程符合需求
  ✅ 返回值: 类型和结构正确
```

### 第二轮：技术验证

```yaml
必查项（5项）:
  ✅ 代码规范: 命名、格式、注释符合标准
  ✅ 安全检测: 无敏感信息硬编码
  ✅ 性能考量: 无 N+1 查询、有分页、有索引
  ✅ 并发安全: 竞态条件处理
  ✅ 数据库规则: 按项目规范使用 ORM
```

### 第三轮：完整性验证

```yaml
必查项（6项）:
  ✅ 文件完整: 所有规划文件已生成
  ✅ 测试覆盖: 单元测试 ≥80%，集成测试覆盖关键路径
  ✅ README 同步: 功能/配置说明更新
  ✅ STATUS 同步: 版本/需求状态更新
  ✅ CHANGELOG 同步: 变更记录添加
  ✅ 依赖声明: 新依赖已添加到 package.json
```

### 快速自检命令

```bash
# 第一轮：运行测试
npm test

# 第二轮：代码检查
npm run lint
npm run type-check

# 第三轮：覆盖率检查
npm test -- --coverage
```

---

**最后更新**: 2026-02-12

