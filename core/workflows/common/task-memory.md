# 任务记忆机制

**最后更新**: 2026-03-02

> AI 每次会话自动输出报告文件 + 记忆索引，实现跨会话上下文传递

---

## 🎯 解决的问题

- AI 会话断开后，新会话无法知道之前做了什么
- TASK-INDEX.md 只记录了任务编号和路径，缺少上下文
- 长期积累后 AI 无法快速回忆项目历史决策
- **多编辑器/多 Agent 场景下记忆文件共存混乱，无法区分来源**
- **对话中直接输出的分析结果，会话关闭后无法追溯**（🆕 v1.5）
- **记忆文件为了保留上下文被迫塞入大量细节，偏离"摘要索引"定位**（🆕 v1.5）
- **触发时机以 AI 内部阶段为中心，忽略了"用户发消息"这个关键输入时刻**（🆕 v1.6）
- **用户追加需求/方向修正没有记忆写入点，可能在 token 耗尽时丢失**（🆕 v1.6）

---

## 🏗️ 核心架构：报告为主体、记忆为索引（🆕 v1.5）

> **核心原则**: AI 每次会话的分析结果必须写入报告文件，记忆文件只存摘要+报告链接。
> 对话中不再直接输出大段分析内容 —— 完整内容写报告，对话中只输出结论摘要+报告路径。

```yaml
🔴 架构规则（NO EXCEPTIONS）:

  报告文件（reports/）:
    - 定位: 每次会话的完整分析内容载体
    - 内容: 完整的分析过程、数据、结论、建议
    - 存放: projects/<project>/reports/<子目录>/<agent>/YYYYMMDD/（🆕 temp-reports v1.6 按 Agent+日期目录隔离）
    - 命名: NN-<类型>-<简述>.md（NN 为报告独立序号，仅扫描该目录；日期由目录层级表达）
    - 详见: core/workflows/common/temp-reports.md

  记忆文件（.ai-memory/）:
    - 定位: 索引 + 摘要（指向报告的指针）
    - 内容: 任务目标、状态、关键决策、报告链接、对话记录、待跟进
    - 存放: projects/<project>/.ai-memory/clients/<agent>/tasks/
    - 命名: YYYYMMDD.md（🆕 v1.7：每天一个文件，会话内以 ## 会话 NN 分段追加）

  🔴 序号独立规则（v1.7 / temp-reports v1.6）:
    - 报告 NN 序号: 仅扫描 reports/<子目录>/<agent>/YYYYMMDD/ 目录计算，与记忆无关
    - 记忆文件: 不再使用 NN 序号，直接以日期命名（YYYYMMDD.md）
    - 记忆内部会话编号: 文件内以 ## 会话 NN 分段（NN 为当天第几个会话）
    - ❌ 禁止报告和记忆共享全局序号（v1.6 及之前的设计缺陷，已废弃）

  对话输出:
    - 只输出结论摘要 + 报告文件路径
    - 不在对话中堆砌大段分析内容

  关系图:
    用户提问 → AI 分析 → 写入报告文件（完整内容）
                       → 追加/更新记忆文件（摘要+报告链接+对话记录）
                       → 对话输出结论摘要 + 报告路径

    下次会话 → 读记忆（最新日期文件末尾）→ 跟链接读报告 → 完整恢复上下文

为什么这样设计:
  1. 减少 token 浪费: 记忆文件不再重复写分析内容，只存摘要+链接
  2. 可追溯性: 每次对话都有报告文件留存，不随会话丢失
  3. 跨会话恢复: 新会话读记忆→读报告，完整上下文不丢失
  4. 职责清晰: 报告=完整内容，记忆=索引+摘要，分工明确
  5. 序号解耦: 报告和记忆各自独立管理，消除断号困惑和跨目录耦合（🆕 v1.7）
  6. 文件数可控: 每天一个记忆文件，月底最多 28~31 个，而非 30~50+（🆕 v1.7）
```

---

## 🔴 自动输出，禁止询问（🆕 v1.5）

```yaml
🔴 强制规则（NO EXCEPTIONS）:

  报告文件和记忆文件的写入是 AI 的自动行为，绝不询问用户。
  每次用户提问、AI 回复，都必须自动写入报告 + 更新记忆。

  ❌ 绝对禁止:
    - "需要我把分析写入报告吗？"
    - "要不要我写入记忆？"
    - "是否需要保存本次结果？"
    - 任何形式的询问用户是否写入报告/记忆的行为

  ✅ 正确行为:
    - 预检查完成后，自动创建初始记忆（状态 🔄）
    - 分析完成后，自动写入报告文件
    - 报告写入后，自动更新记忆文件（追加报告链接）
    - 任务完成后，自动更新记忆状态为 ✅
    - 对话中输出结论摘要 + 报告路径

  为什么:
    - 报告和记忆是 AI 内部工作机制，不是用户需要决策的事项
    - 询问会打断用户思路，增加不必要的交互轮次
    - 遗忘写入 = 下次会话丢失上下文 = 重复劳动
    - 约束 #16（文件修改需确认）已明确豁免记忆文件和报告文件的创建
```

---

## 📁 存储位置

```
ai-dev-guidelines/projects/<project>/          # 如 projects/chat/
├── reports/                          # 🔴 AI 会话报告（每次会话必须输出）
│   ├── analysis/                     # 深度分析/架构分析报告
│   ├── diagnostics/                  # 诊断分析报告
│   ├── bugs/                         # Bug 分析报告
│   ├── requirements/                 # 需求分析报告
│   ├── optimizations/                # 优化分析报告
│   └── .temp/                        # 临时/中间过程文件
│
└── .ai-memory/                       # 🔴 AI 任务记忆（索引+摘要）
    ├── SUMMARY.md                    # 📋 全局只读摘要（关键决策汇总）
    └── clients/                      # 🔴 按 Agent 目录隔离（v1.3）
        ├── zed-copilot/              # Zed Copilot 专属
        │   ├── SUMMARY.md            # 该 Agent 的任务摘要
        │   └── tasks/
        │       ├── 20260226.md       # 🆕 v1.7: 每天一个记忆文件
        │       └── 20260227.md       # 当天的所有会话追加在同一文件内
        ├── webstorm-copilot/         # WebStorm Copilot 专属
        │   ├── SUMMARY.md
        │   └── tasks/
        │       └── 20260227.md
        └── unknown-agent/            # 无法确定编辑器时的默认目录
            ├── SUMMARY.md
            └── tasks/
```

> **记忆文件命名格式**: `<YYYYMMDD>.md`（🆕 v1.7：每天一个文件，不再使用 NN 序号）
> **报告文件命名格式**: `NN-<类型>-<简述>.md`（NN 为报告独立序号，日期由目录层级 `<agent>/YYYYMMDD/` 表达）
> **Agent 由目录隔离保证**（clients/<agent>/），不写入文件名
>
> **为什么在 ai-dev-guidelines/projects/ 下而不在项目源码目录？**
> - 统一管理：与项目规范（profile/）、正式归档文档在同一目录树下
> - 不污染业务源码目录
> - .ai-memory/ 和 reports/ 加入 ai-dev-guidelines/.gitignore 忽略即可

> 🔴 **禁止在以下位置创建 `.ai-memory/` 或 `reports/`（NO EXCEPTIONS）**:
> - ❌ 工作区根目录（如 `MySelf/.ai-memory/`）
> - ❌ `ai-dev-guidelines/` 根目录（如 `ai-dev-guidelines/.ai-memory/`）
> - ❌ 业务项目源码目录（如 `schema-dsl/.ai-memory/`）
> - ✅ **唯一正确位置**: `ai-dev-guidelines/projects/<project>/.ai-memory/`
>
> 根因: 已发生事故 — Agent 在工作区根目录 `MySelf/.ai-memory/` 创建记忆文件，导致记忆与项目脱钩、其他 Agent 无法恢复上下文。

---

## 📂 子文件索引

本文件为主文件，以下子文件包含完整的细节规范：

| 子文件 | 内容 | 说明 |
|--------|------|------|
| [task-memory/triggers.md](./task-memory/triggers.md) | 🔄 触发时机（v1.9 消息驱动 5+1 阶段） | 阶段 0~4.5~4 的完整定义、任务完成验证、新会话恢复 |
| [task-memory/templates.md](./task-memory/templates.md) | 📋 模板与维护 | SUMMARY 模板、每日记忆模板、文件命名规范、使用方式、归档策略 |
| [task-memory/multi-agent.md](./task-memory/multi-agent.md) | 🤖 多 Agent 支持 | 目录隔离方案、读写规则、Agent 检测方法、向后兼容 |

> 💡 **加载策略**: 主文件（本文件）每次必读；子文件按需加载：
> - 首次会话 / 预检查 → 加载 `triggers.md`（阶段 0 流程）
> - 创建记忆文件 → 加载 `templates.md`（记忆模板）
> - 多编辑器场景 → 加载 `multi-agent.md`（隔离规则）

---

## 📎 相关文档

- [temp-reports.md](./temp-reports.md) — 报告规范（命名、存储、核心规则）
- [confirmation-points.md](./confirmation-points.md) — 确认点机制（CP1-CP6）
- [core/CONSTRAINTS.md](../../CONSTRAINTS.md) — 约束清单（22 条）
- [00-pre-check/README.md](../00-pre-check/README.md) — 预检查流程（5 项必做 + 阶段 0）

---

**最后更新**: 2026-03-02