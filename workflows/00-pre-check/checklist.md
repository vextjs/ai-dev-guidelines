# 预检查详细清单

> ⚠️ **注意**: 本文件为 v1.x 旧版预检查清单（5项），仅供历史参考。  
> **v2.0 当前格式请以 `README.md` 为准（3项，无 ✅ 前缀）。**

> 每个检查项的详细说明和执行要求

---

## 📋 检查项详解

### 检查 1: 工作区确认

```yaml
目的: 确定当前工作的项目名称

识别顺序（优先级从高到低）:
  1. 用户明确指定: "使用 user 项目" → 项目名 = user
  2. 当前工作目录名: 工作区根目录名称
  3. package.json 的 name 字段
  4. 用户请求中提及的项目名
  5. 无法识别: 询问用户 "请指定项目名称"

输出示例:
  成功: ✅ 1. 工作区: E:\Worker\user-service
  需确认: ⚠️ 1. 工作区: E:\Worker (未识别项目，请指定)
```

### 检查 2: 项目规范加载

```yaml
目的: 加载项目特定的开发规范和约束

查找路径:
  路径1: projects/<项目名>/PROJECT-PROFILE.md
  路径2: projects/<项目名>/TECH-STACK.md

🔴 强制要求:
  - 必须使用 read_file 工具实际读取
  - 必须等待工具返回结果后再判断
  - 禁止凭"记忆"判断文件是否存在

执行流程:
  1. 调用 read_file("projects/<项目名>/PROJECT-PROFILE.md")
  2. 等待返回结果
  3. 成功 → 解析技术栈信息并输出
  4. 失败 → 输出未找到，使用通用规范

输出示例:
  成功: ✅ 2. 项目规范: ✅ 已加载 PROJECT-PROFILE.md (Express + TypeScript + MongoDB)
  
  失败: ⚠️ 2. 项目规范: ❌ 未找到
            查找路径: projects/user-service/PROJECT-PROFILE.md
            处理: 将使用通用规范继续
```

### 检查 3: 任务类型识别

```yaml
目的: 判断用户请求属于哪种任务类型

识别规则:
  Tier 1 核心任务（优先匹配）:
    需求开发: 开发、实现、新增、集成、对接、添加功能
    Bug 修复: 修复、解决、Bug、问题、报错、异常
    性能优化: 优化、性能、加速、慢、提升
  
  Tier 2 扩展任务:
    技术调研: 调研、选型、对比、评估、分析方案
    架构重构: 重构、重写、拆分、改造、升级架构
    数据库变更: 迁移、Schema、表结构、索引、数据库
    安全修复: 漏洞、安全、注入、XSS、加固
    事故复盘: 故障、宕机、复盘、事故
  
  特殊任务:
    简单问答: 什么是、解释、说明、怎么理解

输出示例:
  ✅ 3. 任务类型: 需求开发
  ✅ 3. 任务类型: Bug 修复
  ⚠️ 3. 任务类型: 未识别（请确认任务类型）
```

### 检查 4: 风险等级评估

```yaml
目的: 确定任务的风险等级

风险等级定义:
  P0 (Critical 关键):
    触发任务: 数据库变更、安全修复、部署、数据迁移、紧急修复
    影响: 可能造成数据丢失、安全问题、生产事故
    确认点: 5 个
    特殊要求: 必须展示 P0 清单，逐项确认
  
  P1 (High 高):
    触发任务: 需求开发、Bug 修复、性能优化、API 开发、配置变更
    影响: 影响核心功能，需要谨慎处理
    确认点: 4 个
    特殊要求: 标准流程
  
  P2 (Low 低):
    触发任务: 简单问答、文档更新、代码审查、仅测试
    影响: 低风险，影响有限
    确认点: 0-2 个
    特殊要求: 可简化流程

输出示例:
  ✅ 4. 风险等级: P0（关键操作，需要 5 个确认点）
  ✅ 4. 风险等级: P1（需要 4 个确认点）
  ✅ 4. 风险等级: P2（低风险）
```

### 检查 5: 输出目录确认

```yaml
目的: 确定文档和报告的输出路径

目录构建规则:
  需求开发: projects/<project>/requirements/<YYYYMMDD-feature-name>/
  Bug 修复: projects/<project>/bugs/<BUG-project-id-desc>/
  性能优化: projects/<project>/optimizations/<OPT-area-id>/
  技术调研: projects/<project>/research/<RES-topic-YYYYMMDD>/
  架构重构: projects/<project>/refactoring/<REF-module-YYYYMMDD>/
  事故复盘: projects/<project>/incidents/<INC-YYYYMMDD-severity-desc>/

输出示例:
  ✅ 5. 输出目录: projects/user-service/requirements/20260212-rate-limit/
  ✅ 5. 输出目录: projects/chat/bugs/BUG-chat-001-message-loss/
```

---

## ⚠️ 常见违规行为

### 违规 1: 跳过预检查

```yaml
错误:
  用户: "在 user 项目添加限流功能"
  AI: "好的，我来分析一下项目结构..."  ← 违规！

正确:
  用户: "在 user 项目添加限流功能"
  AI: "🔴 预检查清单:
        ✅ 1. 工作区: ...
        ..."
  AI: "预检查完成，我来分析项目结构..."
```

### 违规 2: 不等待工具返回

```yaml
错误:
  AI: 调用 read_file("projects/user/PROJECT-PROFILE.md")
  AI: "⚠️ 项目规范未找到"  ← 违规！未等返回

正确:
  AI: 调用 read_file(...)
  AI: [等待工具返回]
  AI: 根据实际返回结果判断
```

### 违规 3: 凭记忆判断

```yaml
错误:
  AI: "我记得这个项目用的是 Express..."  ← 违规！

正确:
  AI: 实际读取 PROJECT-PROFILE.md
  AI: "根据项目规范，技术栈是 Express + TypeScript"
```

---

## 📎 相关文档

- [预检查主流程](./README.md)
- [预检查输出示例](./examples.md)
- [任务识别规则](../00-task-identification/README.md)
- [意图矩阵](../00-task-identification/intent-matrix.md)

---

**最后更新**: 2026-02-12

