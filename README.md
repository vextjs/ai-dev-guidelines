# ai-dev-guidelines

> **AI 工作操作系统** — 给 AI Agent 一个完整的工程任务执行框架

[![版本](https://img.shields.io/badge/版本-v2.11.0-blue)]()
[![约束](https://img.shields.io/badge/约束-20_条-red)]()
[![工作流](https://img.shields.io/badge/工作流-11_种-green)]()
[![模板](https://img.shields.io/badge/模板-29_个-orange)]()

---

## 它是什么？

就像操作系统给应用程序提供文件系统、内存管理、进程调度一样，`ai-dev-guidelines` 给 AI Agent 提供：

| 能力 | 说明 | 对应模块 |
|------|------|---------|
| **标准化工作流** | 11 种开发场景（需求/Bug/优化/安全...），AI 按步骤执行 | `core/workflows/` |
| **持久化记忆** | 跨会话记忆 + 多 Agent 协同，告别每次从零开始 | `.ai-memory/` + `reports/` |
| **行为约束** | 20 条护栏规则，防止 AI 未经确认执行破坏性操作 | `core/CONSTRAINTS.md` |
| **文档模板** | 29 个结构化模板（快速/完整双模式），输出格式统一 | `core/templates/` |
| **规范自修复** | AI 检测规范冲突并自动修复，系统自维护 | `core/self-fix/` |
| **防复现机制** | META 单一真相源 + 自动同步工具，同类 Bug 不再重复 | `core/tools/` |

## 它不是什么

- ❌ **不是提示词模板** — 不是几条规则让 AI 照做，而是完整的执行框架
- ❌ **不是编码规范** — 不是 ESLint/Prettier 那样约束代码风格
- ❌ **不是项目管理工具** — 不是 Jira/Linear 的替代品

## 核心特性

### 🔄 有状态执行

```
无状态模式（传统）:
  用户: "继续上次的工作"
  AI: "抱歉，我不记得上次做了什么"

ai-dev-guidelines:
  用户: "继续"
  AI: → 读取记忆 → 恢复上下文 → 无缝继续
```

### 🤝 多 Agent 协同

多个 AI（Copilot / Claude / GPT）可以在同一项目上并行工作，通过目录隔离和记忆共享避免冲突。

### 📐 三层递进架构

控制 Token 成本，按需加载信息：

```
第 1 层: 入口指引（~39 行）  → 每次必读
第 2 层: 速查手册（~420 行） → 日常执行
第 3 层: 完整规范（4000+ 行）→ 按需加载
```

AI 日常只需加载 ~460 行即可执行大部分任务。

---

## 📂 项目结构

```
ai-dev-guidelines/
├── core/              # 🤖 AI 规范内核
│   ├── workflows/     #    11 种工作流
│   ├── templates/     #    29 个文档模板
│   ├── standards/     #    9 个开发规范
│   ├── tools/         #    7 个自动化工具
│   ├── self-fix/      #    规范自修复机制
│   └── ...            #    约束、速查手册等
├── docs/              # 📖 用户文档
├── projects/          # 📂 项目规范与产出
└── changelogs/        # 📜 版本变更详情
```

## 🚀 快速开始

### AI Agent 接入

1. 将 `ai-dev-guidelines/` 放入你的 workspace
2. 在 `.github/copilot-instructions.md` 中添加入口指引（参考本项目示例）
3. AI 会自动读取规范并按流程执行

### 用户入门

- 📖 [快速入门指南](./docs/getting-started.md) — 5 分钟了解全貌
- 🏗️ [设计理念](./docs/DESIGN-PHILOSOPHY.md) — 架构哲学与演进路线
- 📋 [AI 执行手册](./core/README.md) — AI 视角的完整参考

### 新项目接入

```bash
# 1. 复制项目模板
cp -r projects/_template projects/<your-project>

# 2. 编辑项目规范
# 填写 projects/<your-project>/profile/README.md

# 3. AI 自动识别
# AI 在收到任务时会自动读取对应项目规范
```

---

## 💡 设计理念

| 原则 | 说明 |
|------|------|
| **AI 是第一用户** | 所有设计以"AI 能否无歧义执行"为标准 |
| **有状态 > 无状态** | 消息驱动记忆，AI 拥有跨会话工作记忆 |
| **防复现 > 事后修复** | META 单一真相源 + 自动同步，消除同类 Bug |
| **约束是护栏不是枷锁** | 20 条约束防止 AI 犯人类会犯的错 |
| **按需加载** | 三层递进架构控制 Token 成本 |

> 详见 [设计理念文档](./docs/DESIGN-PHILOSOPHY.md)

---

## 📊 项目状态

| 指标 | 数据 |
|------|------|
| 当前版本 | v2.11.0 |
| 规范文件 | ~4000 行 |
| 工作流 | 11 种 |
| 模板 | 29 个 |
| 约束 | 20 条 |
| 工具脚本 | 7 个 |
| 接入项目 | 5+ 个 |

> 详见 [项目状态](./core/STATUS.md) · [变更日志](./CHANGELOG.md)

## 📄 License

MIT
