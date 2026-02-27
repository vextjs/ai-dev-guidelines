9. **修复需扫描** - 修复后必须全局扫描同类问题+数据联动检查
# 快速参考

> AI 执行任务时的速查手册

**版本**: v2.3.0  
**最后更新**: 2026-02-27

---

## 🔍 预检查 (每次必做)

```text
📋 预检查:
1. 工作区: [当前路径]
2. 任务类型: [需求/Bug/优化/分析/...]
3. 输出位置: [projects/<project>/...]
4. Agent: [zed-copilot / webstorm-copilot / cursor / vscode-copilot / ...] ← 🆕
```

### 🏷️ Agent 标识速查

| 编辑器 + AI | 标识值 |
|------------|--------|
| Zed + GitHub Copilot | `zed-copilot` |
| WebStorm + GitHub Copilot | `webstorm-copilot` |
| VS Code + GitHub Copilot | `vscode-copilot` |
| Cursor | `cursor` |
| VS Code + Cline | `vscode-cline` |
| Windsurf | `windsurf` |
| 其他 | `<editor>-<ai-provider>` |

> **为什么需要 Agent？** 用户可能同时使用多个编辑器的 AI 助手，Agent 标识用于区分记忆来源，避免混乱。
> 详见 [workflows/common/task-memory.md §多 Agent 支持](./workflows/common/task-memory.md)

---

## 🔴 日期与必填字段（强制执行）

### 文件名日期前缀

所有输出文件（报告、分析、记忆等）**必须**以 `YYYYMMDD-` 开头：

```yaml
✅ 正确: 20260226-analysis-v3-architecture-deep-review.md
✅ 正确: 20260227-zed-copilot-REQ-user-auth.md
❌ 错误: v3-architecture-deep-analysis.md    # 缺少日期前缀
❌ 错误: 2026-02-26-analysis-xxx.md          # 日期格式错误（有分隔符）
```

### 文档头部必填字段

```yaml
🔴 每次生成文档前，AI 必须逐项确认:
  - [ ] 日期字段不包含 "YYYY" 占位符？（已替换为真实日期）
  - [ ] 日期通过 now() 工具获取？
  - [ ] Agent 字段已填写当前编辑器/AI 标识？
  - [ ] 文件名以 YYYYMMDD- 开头？
  - [ ] 项目名称为真实项目名？
```

> 详见 [templates/common/header.md](./templates/common/header.md) 和 [templates/README.md §必填字段规范](./templates/README.md)

---

## 🎯 任务类型映射

| 关键词 | 任务类型 | 工作流路径 |
|-------|---------|-----------|
| 实现、开发、添加、集成、新增 | 需求开发 | `workflows/01-requirement-dev/` |
| 修复、解决、Bug、报错、异常 | Bug 修复 | `workflows/02-bug-fix/` |
| 优化、慢、性能、加速 | 性能优化 | `workflows/03-optimization/` |
| 调研、选型、对比、POC | 技术调研 | `workflows/04-research/` |
| 重构、重写、改造、升级 | 架构重构 | `workflows/05-refactoring/` |
| 数据库、迁移、Schema | 数据库变更 | `workflows/06-database/` |
| 安全、漏洞、加固 | 安全修复 | `workflows/07-security/` |
| 事故、故障、复盘 | 事故复盘 | `workflows/08-incident/` |
| 新项目、开源、npm包、初始化 | 开源项目初始化 | `workflows/09-opensource-init/` 🆕 |
| 分析、审查、评估、深度分析 | 深度分析 | 模板: `templates/lite/analysis-lite.md` 🆕 |

---

## 📝 执行模式

### 快速模式 (默认)

| 项目 | 说明 |
|-----|------|
| 适用 | 简单需求、小改动、< 5 个文件 |
| 流程 | 5 阶段（理解→方案→实施方案→执行→报告） |
| 模板 | `templates/lite/` |
| 时间 | 15-30 分钟 |

### 完整模式

| 项目 | 说明 |
|-----|------|
| 适用 | 复杂需求、核心功能、正式交付 |
| 流程 | 7 阶段（+生成文档+验证检查） |
| 模板 | `templates/core/` |
| 时间 | 45-90 分钟 |

### 模式切换

- 用户说 "快速"、"简单" → 快速模式
- 用户说 "完整"、"详细"、"需要文档" → 完整模式
- 用户说 "只要代码" → 跳过文档

---

## ✅ 确认点 (CP)

| 确认点 | 时机 | 必须等待用户 |
|-------|------|-------------|
| CP1 | 需求理解后 | ✅ 是 |
| CP2 | 技术方案后 | ✅ 是 |
| CP3 | 实施方案后（含实施前检查） | ✅ 是 - 确认所有变更内容后才执行 |

> **完整模式额外确认点**: CP4 (测试完成后)、CP5 (文档生成后)  
> 详见 [workflows/common/confirmation-points.md](./workflows/common/confirmation-points.md)

---

## 📂 输出路径

```
projects/<project-name>/
├── requirements/    # 需求开发输出
│   └── <YYYYMMDD-feature>/
├── bugs/           # Bug 修复输出
│   └── <BUG-xxx>/
├── optimizations/  # 性能优化输出
│   └── <OPT-xxx>/
├── research/       # 技术调研输出
│   └── <RES-xxx>/
├── refactoring/    # 架构重构输出
│   └── <REF-xxx>/
├── database/       # 数据库变更输出
│   └── <DB-xxx>/
├── security/       # 安全修复输出
│   └── <SEC-xxx>/
├── incidents/      # 事故复盘输出
│   └── <INC-xxx>/
└── reports/        # 临时报告（gitignore 忽略）
    ├── diagnostics/    # 诊断报告
    ├── bugs/           # Bug 分析报告
    ├── requirements/   # 需求分析报告
    ├── optimizations/  # 优化分析报告
    ├── analysis/       # 🆕 深度分析/架构分析报告
    └── .temp/          # 临时文件（可随时清理）
```

> ⚠️ `reports/` 下所有文件名必须以 `YYYYMMDD-` 开头。详见 [workflows/common/temp-reports.md](./workflows/common/temp-reports.md)

---

## 📋 模板选择

| 任务类型 | 快速模式 | 完整模式 |
|---------|---------|---------|
| 需求开发 | `lite/requirement-lite.md` | `core/requirement-template.md` |
| 技术方案 | `lite/technical-lite.md` | `core/technical-template.md` |
| 实施方案 | `lite/implementation-lite.md` | `core/implementation-template.md` |
| Bug 分析 | `lite/bug-analysis-lite.md` | `core/bug-analysis-template.md` |
| 性能优化 | `lite/optimization-lite.md` | `core/optimization-template.md` |
| 技术调研 | `lite/research-lite.md` | `extended/research-template.md` |
| 架构重构 | `lite/refactoring-lite.md` | `extended/refactoring-template.md` |
| 深度分析 | `lite/analysis-lite.md` 🆕 | - |
| 系统对接 | - | `core/integration-template.md` |

---

## 🤖 多编辑器 / 多 Agent 速查

### 记忆目录结构

```
.ai-memory/
├── SUMMARY.md                    # 全局只读摘要（关键决策汇总）
└── clients/
    ├── webstorm-copilot/         # WebStorm 专属
    │   ├── SUMMARY.md
    │   └── tasks/
    └── zed-copilot/              # Zed 专属
        ├── SUMMARY.md
        └── tasks/
```

### 记忆文件命名

```yaml
格式: <YYYYMMDD>-<NN>-<TYPE>-<id>.md（在各 Agent 目录内）

✅ 正确: clients/zed-copilot/tasks/20260226-01-ANALYSIS-v3-deep-review.md
✅ 正确: clients/webstorm-copilot/tasks/20260227-01-REQ-user-auth.md
✅ 正确: clients/webstorm-copilot/tasks/20260227-02-FIX-spec-verify.md
❌ 错误: clients/zed-copilot/tasks/20260226-ANALYSIS-v3-deep-review.md  # 缺少序号
```

### 恢复任务时的 Agent 过滤

```yaml
用户在 Zed 中说"继续":
  → 只扫描 clients/zed-copilot/ 下的未完成任务
  → 全局 SUMMARY.md 中若有其他 Agent 未完成任务，提示用户确认后才恢复
```

### 关键规则

- 每个 Agent 独立管理自己的 `clients/<agent>/` 目录
- 全局 `SUMMARY.md` 仅存放关键决策摘要，不存任务列表
- AI 绝不写入其他 Agent 的 `clients/` 目录
- 首次使用时自动创建 `clients/<agent>/` 目录结构

> 详见 [workflows/common/task-memory.md §多 Agent 支持](./workflows/common/task-memory.md)

---

## 🔧 常用工具

| 场景 | 参考文档 |
|-----|---------|
| 文件太大读不完 | `best-practices/token-optimization.md` |
| 项目很复杂 | `best-practices/large-projects.md` |
| 操作出错回滚 | `best-practices/error-handling.md` |
| 代码不符合规范 | `best-practices/compliance-check.md` |
| 遇到异常情况 | `best-practices/edge-cases.md` |
| 跨会话继续 | `best-practices/memory-management.md` |

---

## 🔍 追溯历史任务

查找之前的方案/修复记录：
```
1. 读取 ai-dev-guidelines/projects/<project>/.ai-memory/SUMMARY.md（快速回忆）
2. 读取 projects/<project>/TASK-INDEX.md（正式索引）
3. 搜索关键词，定位任务 ID 和路径
4. 读取具体文档
```

> **⚠️ 强关联**: 此机制依赖各工作流（01-08）在任务完成时更新 TASK-INDEX.md + .ai-memory/  
> 模板位置: `projects/_template/TASK-INDEX.md`  
> 记忆机制: `workflows/common/task-memory.md`

---

## ⚠️ 核心约束 (15条)

1. **删除操作需确认** - 删除代码/文件前必须用户确认
2. **Git 操作需确认** - commit/push 前必须用户确认
3. **方案选择需确认** - 多方案时必须用户决策
4. **多任务需拆分** - 同时多个任务建议分开执行
5. **错误处理** - 所有代码必须有错误处理
6. **禁止硬编码** - 敏感信息必须用环境变量
7. **结构化输出** - 所有输出必须结构化
8. **报告需验证** - 分析报告必须逐项验证，按 🔴/🟡/💡/❌ 分类
9. **🔴 文件名必须带日期+序号** - 所有输出文件必须 `YYYYMMDD-NN-<描述>.md` 格式（NN 为当日递增序号）
10. **🔴 多 Agent 目录隔离** - 记忆写入 `clients/<agent>/`，不写入其他 Agent 目录
11. **修复需扫描** - 修复后必须全局扫描同类问题+数据联动检查
12. **主动合理性分析** - 收到指令先评估合理性，有更好建议先提出
13. **自动关联文件检查** - 修改文件时自动扫描关联文件并同步
14. **🔴 规范修改需交叉验证** - 修改任何规范文件后，必须逐个检查所有引用该规范的文件是否需要同步更新（见下方交叉验证清单）
15. **🔴 任务完成验证** - 声称任务完成前必须验证：输出文件存在性 + 内容结构完整性 + 记忆已更新（见 task-memory.md §任务完成验证）

> 完整说明见 [CONSTRAINTS.md](./CONSTRAINTS.md)

---

## 🔴 规范修改交叉验证清单

> **何时触发**: 修改任何规范文件（`.github/copilot-instructions.md`、`workflows/`、`standards/`、`QUICK-REFERENCE.md`）后必须执行。
>
> **为什么**: 规范体系由 6+ 个文件组成，同一规则在多处引用。只改一处不改其他 = 不一致 = AI 执行混乱。

### 必须交叉检查的文件对

| 当你修改了... | 必须同步检查 | 检查什么 |
|-------------|------------|---------|
| `.github/copilot-instructions.md` | `00-pre-check/README.md`、`QUICK-REFERENCE.md` | 预检查项数、禁止行为、格式示例 |
| `workflows/00-pre-check/README.md` | `copilot-instructions.md`、`task-memory.md` | 预检查项数、记忆写入路径、Agent 检测逻辑 |
| `workflows/common/task-memory.md` | `copilot-instructions.md`、`00-pre-check/README.md` | 文件名格式、Agent 方案（共享 vs 隔离）、恢复流程 |
| `workflows/common/temp-reports.md` | `copilot-instructions.md`、`QUICK-REFERENCE.md`、`doc-standards.md` | 报告命名格式、Agent 字段 |
| `QUICK-REFERENCE.md` | `copilot-instructions.md` | 约束条数、关键原则 |
| `standards/doc-standards.md` | `temp-reports.md`、`QUICK-REFERENCE.md` | 文件命名规范 |

### 检查清单（每次修改后逐条确认）

```yaml
□ 预检查项数: copilot-instructions.md / 00-pre-check / QUICK-REFERENCE 三处一致？
□ 文件命名序号: 报告和记忆文件都使用 YYYYMMDD-NN 格式？
□ 多 Agent 方案: 目录隔离 clients/<agent>/（非共享目录+文件名前缀）？
□ 约束条数: QUICK-REFERENCE 标题数字与实际条目数一致？
□ 版本号: 修改的文件已更新版本号和最后更新日期？
□ 禁止行为: copilot-instructions.md 和 00-pre-check 的禁止清单对齐？
□ 交叉引用路径: 所有 [链接](./path) 指向的文件确实存在？
```

---

## 🔗 相关文档

- [README.md](./README.md) - 项目入口
- [CONSTRAINTS.md](./CONSTRAINTS.md) - 完整约束
- [best-practices/WHEN-TO-USE.md](./best-practices/WHEN-TO-USE.md) - 问题速查
- [workflows/](./workflows/) - 工作流详情
- [templates/](./templates/) - 模板详情
- [workflows/common/task-memory.md](./workflows/common/task-memory.md) - 记忆机制（含多 Agent）
- [workflows/common/temp-reports.md](./workflows/common/temp-reports.md) - 临时报告规范

---

**版本**: v2.5.0  
**最后更新**: 2026-02-27  
**v2.3.0 变更**: 预检查新增 Agent 标识（第 4 项）、新增日期强制执行规范、新增 analysis-lite 模板条目、新增多编辑器/多 Agent 速查段落