# 预检查输出示例

> ⚠️ **注意**: 本文件为 v1.x 旧版预检查示例（5项、🔴/✅ 前缀），仅供历史参考。  
> **v2.0 当前格式请以 `README.md` 为准（3项，📋 前缀，无 ✅ 编号前缀）。**

> 各种场景下的预检查输出示例

---

## ✅ 成功示例

### 示例 1: 完整成功

```text
🔴 预检查清单:
✅ 1. 工作区: E:\Worker\user-service
✅ 2. 项目规范: ✅ 已加载 PROJECT-PROFILE.md (Express 4.18 + TypeScript 5.0 + MongoDB 6.0)
✅ 3. 任务类型: 需求开发
✅ 4. 风险等级: P1（需要 4 个确认点）
✅ 5. 输出目录: projects/user-service/requirements/20260212-rate-limit/
```

### 示例 2: Bug 修复任务

```text
🔴 预检查清单:
✅ 1. 工作区: E:\Worker\chat-service
✅ 2. 项目规范: ✅ 已加载 PROJECT-PROFILE.md (Egg.js 3.17 + TypeScript + MongoDB)
✅ 3. 任务类型: Bug 修复
✅ 4. 风险等级: P1（需要 4 个确认点）
✅ 5. 输出目录: projects/chat-service/bugs/BUG-chat-001-message-loss/
```

### 示例 3: 数据库变更（P0）

```text
🔴 预检查清单:
✅ 1. 工作区: E:\Worker\payment-service
✅ 2. 项目规范: ✅ 已加载 PROJECT-PROFILE.md (Egg.js + TypeScript + MongoDB + Redis)
✅ 3. 任务类型: 数据库变更
⚠️ 4. 风险等级: P0（关键操作，需要 5 个确认点）
     警告: 此操作可能影响生产数据，请谨慎操作
✅ 5. 输出目录: projects/payment-service/database/20260212-add-index/
```

---

## ⚠️ 部分失败示例

### 示例 4: 项目规范未找到

```text
🔴 预检查清单:
✅ 1. 工作区: E:\Worker\new-service
⚠️ 2. 项目规范: ❌ 未找到
     查找路径: projects/new-service/PROJECT-PROFILE.md
     处理: 将使用通用规范继续
✅ 3. 任务类型: 需求开发
✅ 4. 风险等级: P1
✅ 5. 输出目录: projects/new-service/requirements/20260212-initial-setup/
```

### 示例 5: 需要用户确认项目

```text
🔴 预检查清单:
⚠️ 1. 工作区: E:\Worker (未识别项目)
     问题: 工作区包含多个项目，请指定目标项目
     可选: user-service, chat-service, payment-service
✅ 2. 项目规范: ⏳ 等待项目确认
✅ 3. 任务类型: 需求开发
✅ 4. 风险等级: P1
✅ 5. 输出目录: ⏳ 等待项目确认

❓ 请指定要操作的项目名称
```

### 示例 6: 任务类型不明确

```text
🔴 预检查清单:
✅ 1. 工作区: E:\Worker\user-service
✅ 2. 项目规范: ✅ 已加载 PROJECT-PROFILE.md
⚠️ 3. 任务类型: 未识别
     用户请求: "处理一下用户模块"
     可能类型:
       [A] 需求开发 - 添加新功能
       [B] Bug 修复 - 修复问题
       [C] 架构重构 - 重构代码
     请选择任务类型
✅ 4. 风险等级: ⏳ 等待任务类型确认
✅ 5. 输出目录: ⏳ 等待任务类型确认

❓ 请确认任务类型: [A/B/C]
```

---

## 🔄 特殊场景示例

### 示例 7: 简单问答（P2）

```text
🔴 预检查清单:
✅ 1. 工作区: E:\Worker\user-service
✅ 2. 项目规范: ✅ 已加载 PROJECT-PROFILE.md
✅ 3. 任务类型: 简单问答
✅ 4. 风险等级: P2（低风险，可简化流程）
✅ 5. 输出目录: 不需要（问答类任务）

继续回答您的问题...
```

### 示例 8: 紧急修复（P0）

```text
🔴 预检查清单:
✅ 1. 工作区: E:\Worker\payment-service
✅ 2. 项目规范: ✅ 已加载 PROJECT-PROFILE.md
✅ 3. 任务类型: 紧急修复
🔴 4. 风险等级: P0（紧急！需要 5 个确认点）
     警告: 紧急修复模式，部分测试步骤可简化
     必须: 方案确认、代码确认、回滚方案
✅ 5. 输出目录: projects/payment-service/bugs/HOTFIX-20260212-payment-failure/

⚠️ 紧急修复模式已启用，是否继续？ [Y/N]
```

### 示例 9: 技术调研

```text
🔴 预检查清单:
✅ 1. 工作区: E:\Worker\user-service
✅ 2. 项目规范: ✅ 已加载 PROJECT-PROFILE.md
✅ 3. 任务类型: 技术调研
✅ 4. 风险等级: P2（调研类，低风险）
✅ 5. 输出目录: projects/user-service/research/RES-cache-selection-20260212/

调研模式：将生成对比报告和结论建议...
```

---

## 📊 预检查后的下一步

### 需求开发 → 01-requirement-dev

```text
预检查完成 ✅

下一步: 读取 workflows/01-requirement-dev/README.md
预计生成文档:
  - 01-requirement.md (需求文档)
  - 02-technical.md (技术方案)
  - 03-implementation/ (实施方案目录)
  - 04-integration.md (对接文档，如涉及第三方)

开始执行需求开发流程...
```

### Bug 修复 → 02-bug-fix

```text
预检查完成 ✅

下一步: 读取 workflows/02-bug-fix/README.md
预计生成文档:
  - 01-analysis.md (问题分析)
  - 02-solution.md (解决方案)
  - 03-implementation (实施方案)

开始执行 Bug 修复流程...
```

---

## 📎 相关文档

- [预检查主流程](./README.md)
- [预检查详细项](./checklist.md)
- [任务识别规则](../00-task-identification/README.md)

---

**最后更新**: 2026-02-12

