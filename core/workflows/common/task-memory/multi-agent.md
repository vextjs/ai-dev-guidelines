# 多 Agent / 多编辑器支持

**最后更新**: 2026-03-02

> 本文件从 [task-memory.md](../task-memory.md) 拆分而来，定义多 Agent 场景下的目录隔离、读写规则和检测方法。

---

## 🤖 问题背景

用户可能同时使用多个编辑器（如 Zed + WebStorm）安装不同的 AI 助手，
它们共享同一个文件系统上的 `.ai-memory/` 目录。

---

## 🔴 方案：目录隔离 + 全局摘要

```
.ai-memory/
├── SUMMARY.md                          # 全局只读摘要（所有 Agent 的关键决策）
└── clients/
    ├── webstorm-copilot/               # WebStorm Copilot 专属
    │   ├── SUMMARY.md                  # 该 Agent 的任务摘要
    │   └── tasks/
    │       └── 20260227.md
    ├── zed-copilot/                    # Zed Copilot 专属
    │   ├── SUMMARY.md
    │   └── tasks/
    │       └── 20260226.md
    └── unknown-agent/                  # 无法确定编辑器时的默认目录
        ├── SUMMARY.md
        └── tasks/
```

---

## 为什么目录隔离？

```yaml
❌ 共享目录+文件名前缀的问题（v1.2 已废弃）:
  - SUMMARY.md 被多个 Agent 并发写入，容易互相覆盖
  - 恢复任务需要解析文件名中的 Agent 前缀来过滤，复杂且脆弱
  - 文件名过长（日期+Agent+类型+描述）可读性差

✅ 目录隔离的优点:
  - 每个 Agent 完全独立读写自己的 SUMMARY.md 和 tasks/，零冲突
  - 恢复任务时只扫描自己的目录，无需过滤
  - 用户在文件管理器中一眼看出哪个编辑器产生了哪些记忆
  - 全局 SUMMARY.md 仅追加关键决策摘要，不存在并发问题
```

---

## 读写规则

```yaml
写入:
  1. 报告写入 projects/<project>/reports/<子目录>/（所有 Agent 共享 reports/ 目录）
  2. 记忆追加到 .ai-memory/clients/<agent>/tasks/YYYYMMDD.md（当天文件）
  3. 同时更新 clients/<agent>/SUMMARY.md
  4. 关键决策同步追加到全局 .ai-memory/SUMMARY.md（标注 Agent 来源）
  5. AI 绝不写入其他 Agent 的 clients/ 目录

读取:
  1. 先读取全局 .ai-memory/SUMMARY.md（了解跨编辑器的关键决策）
  2. 再读取 .ai-memory/clients/<agent>/SUMMARY.md（本 Agent 的任务列表）
  3. 读取记忆中的报告链接 → 按需读取报告文件恢复详细上下文
  4. 恢复任务时只从本 Agent 目录查找 🔄 状态的任务

跨 Agent 恢复:
  - 读取全局 SUMMARY.md 发现其他 Agent 有未完成任务时，提示用户确认
  - 用户确认后，在本 Agent 目录创建新记忆文件，标注"继承自 <原 Agent>"
  - 不修改原 Agent 目录下的文件
```

---

## Agent 检测方法

```yaml
优先级:
  1. 系统信息/环境线索（如本次对话的 "JetBrains-WS editor" → webstorm-copilot）
  2. 用户在对话中提及的编辑器名称
  3. 无法确定时使用 unknown-agent，提示用户确认

常见映射:
  JetBrains IDE (WebStorm/IDEA) → webstorm-copilot
  Zed Agent 面板               → zed-copilot
  VS Code Copilot Chat         → vscode-copilot
  Cursor                       → cursor
  Windsurf                     → windsurf
```

---

## 向后兼容

```yaml
升级策略:
  - 已有的 .ai-memory/tasks/ 和 SUMMARY.md 保持不变（历史数据）
  - 新任务写入 clients/<agent>/ 目录
  - 读取时优先查 clients/<agent>/，同时兼容读取根目录下的旧数据
  - 首次使用时自动创建 clients/<agent>/ 目录结构
  - 🆕 v1.7: 旧格式文件（YYYYMMDD-NN-TYPE-id.md）保留可读，新会话一律使用 YYYYMMDD.md
```

---

## 📎 相关文档

- [task-memory.md](../task-memory.md) — 任务记忆主文件（核心架构 + 自动输出）
- [triggers.md](./triggers.md) — 触发时机（5+1 阶段）
- [templates.md](./templates.md) — 模板 + 存储 + 维护

---

**最后更新**: 2026-03-02