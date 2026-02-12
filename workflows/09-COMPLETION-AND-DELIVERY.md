# 步骤 9 和 10 - 完成验证和交付规范

> **所属流程**: 所有工作流（WF-01 到 WF-08）  
> **执行阶段**: 步骤 8（验证完成度）之后  
> **驱动方式**: AI 自动执行 + 用户确认 + 用户手动提交  
> **预计耗时**: Step 9: 3-5分钟, Step 10: 2-3分钟  
> **目标**: 自动验证执行结果，生成交付清单

---

## ⚠️ 编号说明

本文档的 **WF-01 到 WF-08** 指"执行阶段"，不是目录结构的任务类型编号。  
详见 [10-WORKFLOW-TRANSITIONS.md](./10-WORKFLOW-TRANSITIONS.md#编号说明)

---

## 📋 流程概述

在完成代码实现和文档生成后，需要进行两个关键步骤：

1. **Step 9 - 完成验证**: AI 自动验证代码和文档的质量、完整性、一致性
2. **Step 10 - 交付清单**: AI 生成交付清单，包括 commit 描述和后续操作指引

**设计理念**:
- ✅ AI 主导验证和生成
- ⚠️ 用户确认验证结果
- ✅ 用户决定何时提交（不是 AI 自动提交）
- 📝 明确的后续操作指引

---

## 🎯 步骤 9: 完成验证

### 目标
验证最终实现是否与技术方案、文档一致，确保质量达标

### 子步骤 9.1: 代码质量检查

**AI 自动执行**:

```yaml
检查项:
  1. 代码风格检查 (Linting)
     工具: eslint / prettier
     标准: 项目的 CODE-STANDARDS.md
     通过标准: 0 个错误，0 个警告
  
  2. 类型检查
     工具: TypeScript compiler (tsc)
     标准: 项目的 tsconfig.json
     通过标准: 0 个类型错误
  
  3. 单元测试
     工具: jest / vitest / 其他
     标准: 项目的 TESTING.md
     通过标准: 所有测试通过，覆盖率 >= 80%
  
  4. 集成测试 (如有)
     工具: 项目定义的集成测试框架
     标准: 所有关键场景通过
```

**检查结果示例**:

```
Step 9.1 - 代码质量检查
═════════════════════════════════════════
Linting                  ✅ 通过 (0 errors, 0 warnings)
TypeScript               ✅ 通过 (0 errors)
单元测试                 ✅ 通过 (128/128 测试)
  - src/__tests__/user.test.ts       ✅ 12 tests
  - src/__tests__/auth.test.ts       ✅ 18 tests
  - src/__tests__/middleware.test.ts ✅ 98 tests
覆盖率                   ✅ 95% (目标: >= 80%)
  - 语句覆盖率: 95%
  - 分支覆盖率: 92%
  - 函数覆盖率: 96%
集成测试                 ✅ 通过 (15/15 测试)
  - API 端点测试        ✅ 8 tests
  - 数据库集成          ✅ 5 tests
  - 第三方集成          ✅ 2 tests
═════════════════════════════════════════
状态: ✅ 代码质量检查通过
```

**故障处理**:

```
❌ 代码质量检查失败

示例 1: Linting 失败
  错误: src/user.ts:45 - 'unused variable'
  建议: 删除未使用的变量或重新命名
  操作: 修复后重新运行

示例 2: 测试失败
  失败: src/__tests__/user.test.ts 第 3 个测试
  原因: Expected 5 but got 3
  建议: 调查测试预期值是否正确，或实现有误
  操作: 修复后重新运行

示例 3: 覆盖率不足
  当前: 72% (目标: >= 80%)
  缺失: 错误处理分支、边界情况
  建议: 添加更多测试用例覆盖未测试的代码
  操作: 补充测试后重新运行
```

---

### 子步骤 9.2: 文档完整性检查

**AI 自动执行**:

```yaml
检查需求文档:
  文件: REQUIREMENT.md
  检查项:
    □ 功能描述完整
    □ 需求清单完整（所有需求都被列出）
    □ 业务背景描述清晰
    □ 接受标准明确
    □ 依赖关系说明

检查技术方案:
  文件: TECH-PLAN.md
  检查项:
    □ 架构设计完整
    □ 核心模块说明
    □ 技术栈明确
    □ 与需求的对应关系明确
    □ 风险评估

检查实施记录:
  文件: IMPLEMENTATION.md
  检查项:
    □ 实现步骤清晰
    □ 所有需求都有对应的实现说明
    □ 代码位置明确
    □ 遇到的问题和解决方案
    □ 性能影响说明
```

**检查结果示例**:

```
Step 9.2 - 文档完整性检查
═════════════════════════════════════════
REQUIREMENT.md
  □ 功能描述                ✅ 完整 (250 字)
  □ 需求清单                ✅ 完整 (5 项需求)
  □ 业务背景                ✅ 清晰 (150 字)
  □ 接受标准                ✅ 明确 (3 项标准)
  □ 依赖关系                ✅ 已说明 (2 个依赖)

TECH-PLAN.md
  □ 架构设计                ✅ 完整 (有架构图)
  □ 核心模块                ✅ 完整 (3 个核心模块)
  □ 技术栈                  ✅ 明确 (已列出)
  □ 需求对应                ✅ 明确 (5 需求 ← 5 实现)
  □ 风险评估                ✅ 有 (3 项风险)

IMPLEMENTATION.md
  □ 实现步骤                ✅ 清晰 (7 个步骤)
  □ 需求对应                ✅ 完整 (所有 5 项都有说明)
  □ 代码位置                ✅ 明确 (都有文件路径)
  □ 问题和解决              ✅ 有 (2 项问题已记录)
  □ 性能说明                ✅ 有 (响应时间 < 100ms)

═════════════════════════════════════════
状态: ✅ 文档完整性检查通过
```

**故障处理**:

```
⚠️ 文档缺失或不完整

示例 1: 需求和实现不对应
  问题: REQUIREMENT.md 列出 5 项需求，但 IMPLEMENTATION.md 只有 4 项说明
  建议: 补充第 5 项的实现说明，或从需求中删除
  操作: 更新文档后重新运行

示例 2: 缺少技术决策说明
  问题: TECH-PLAN.md 未说明为什么选择 Redis 而不是 Memcached
  建议: 补充技术选型的理由
  操作: 更新文档后重新运行
```

---

### 子步骤 9.3: 需求覆盖率检查

**AI 自动执行**:

```yaml
检查内容:
  1. 需求识别
     从 REQUIREMENT.md 中提取所有需求项
     格式: REQ-001, REQ-002, ... 或 功能描述
  
  2. 实现覆盖
     检查 IMPLEMENTATION.md 中是否都有对应说明
     检查代码中是否实现了相应功能
  
  3. 测试覆盖
     检查单元测试是否覆盖了每个需求
     检查集成测试是否验证了核心流程
```

**检查结果示例**:

```
Step 9.3 - 需求覆盖率检查
═════════════════════════════════════════
需求清单:
  REQ-001: 用户认证          ✅ 实现 + ✅ 测试覆盖
  REQ-002: 权限管理          ✅ 实现 + ✅ 测试覆盖
  REQ-003: 审计日志          ✅ 实现 + ✅ 测试覆盖
  REQ-004: 性能优化          ✅ 实现 + ⚠️  部分测试覆盖
  REQ-005: 错误处理          ✅ 实现 + ✅ 测试覆盖

覆盖率统计:
  实现覆盖率: 100% (5/5)
  测试覆盖率: 80% (4/5)   ← REQ-004 性能测试不完整
  文档覆盖率: 100% (所有需求都有说明)

═════════════════════════════════════════
状态: ⚠️ 需求覆盖率检查通过，但建议补充 REQ-004 性能测试
```

---

### 子步骤 9.4: 文档关联性检查 ⭐ (新增，最关键)

**AI 自动执行**:

这是您最关心的部分 - **验证文档之间的强关联和一致性**

```yaml
检查维度:

A. 需求 ← 技术方案
   验证: TECH-PLAN.md 中的每个设计点都对应 REQUIREMENT.md 中的需求
   格式:
     技术方案 1.1: "使用 JWT 认证"
     ← 对应需求: REQ-001 "用户认证"
   
   检查失败示例:
     ❌ 技术方案中提出"添加消息队列"
     ❌ 但需求中没有相应的功能需求
     建议: 要么删除消息队列，要么在需求中添加

B. 技术方案 ← 代码实现
   验证: IMPLEMENTATION.md 中的每个实现都对应 TECH-PLAN.md 中的设计
   格式:
     实现: "在 src/auth/jwt.ts 中实现 JWT 验证"
     ← 对应设计: TECH-PLAN "使用 JWT 认证"
   
   检查失败示例:
     ❌ 技术方案说使用 JWT，但代码实现用的是 Session
     建议: 要么更新代码，要么更新技术方案

C. 代码实现 ← 测试验证
   验证: 测试用例覆盖了实现的核心功能
   格式:
     实现: "src/user.ts 中的 getUserById 函数"
     ← 对应测试: "src/__tests__/user.test.ts - getUserById 测试"
   
   检查失败示例:
     ❌ 实现了错误处理分支，但测试中没有覆盖
     建议: 添加测试用例覆盖错误分支

D. 实施记录 ← 最终代码
   验证: IMPLEMENTATION.md 中的代码示例与实际代码一致
   格式:
     文档: "调用 user.findById(userId) 获取用户"
     ← 实际代码: 确实有这个调用
```

**检查结果示例**:

```
Step 9.4 - 文档关联性检查
═════════════════════════════════════════

关联映射:

需求 → 技术方案
  REQ-001 "用户认证"     ← TECH-PLAN "JWT 认证方案"  ✅
  REQ-002 "权限管理"     ← TECH-PLAN "RBAC 模型"     ✅
  REQ-003 "审计日志"     ← TECH-PLAN "事件队列日志"  ✅
  REQ-004 "性能优化"     ← TECH-PLAN "缓存策略"      ✅
  REQ-005 "错误处理"     ← TECH-PLAN "统一错误处理"  ✅

技术方案 → 代码实现
  TECH-PLAN "JWT 认证"      ← src/auth/jwt.ts        ✅
  TECH-PLAN "RBAC 模型"     ← src/auth/rbac.ts       ✅
  TECH-PLAN "事件队列日志"  ← src/log/queue.ts       ✅
  TECH-PLAN "缓存策略"      ← src/cache/redis.ts     ✅
  TECH-PLAN "统一错误处理"  ← src/error/handler.ts   ✅

代码实现 → 测试覆盖
  src/auth/jwt.ts         ← test/auth.test.ts       ✅ 98% 覆盖
  src/auth/rbac.ts        ← test/rbac.test.ts       ✅ 92% 覆盖
  src/log/queue.ts        ← test/log.test.ts        ✅ 88% 覆盖
  src/cache/redis.ts      ← test/cache.test.ts      ✅ 85% 覆盖
  src/error/handler.ts    ← test/error.test.ts      ✅ 90% 覆盖

实施记录 ← 最终代码
  所有代码示例             都与实际实现一致         ✅

═════════════════════════════════════════
状态: ✅ 所有文档完整关联，无冲突
```

**关联性问题示例**:

```
❌ 关联性检查发现冲突

问题 1: 需求和方案不一致
  REQ-002 说"使用 RBAC 权限管理"
  TECH-PLAN 说"使用 ABAC 权限管理"
  冲突: 需求和技术方案不一致
  建议: 
    A) 更新需求为 ABAC
    B) 更新技术方案为 RBAC
    C) 讨论后确认采用哪个方案

问题 2: 技术方案和实现不一致
  TECH-PLAN 说"使用 Redis 缓存"
  src/cache/index.ts 使用的是"Memcached"
  冲突: 实现与设计不符
  建议:
    A) 更新代码使用 Redis
    B) 更新技术方案说明使用 Memcached
    C) 讨论后确认采用哪个方案

问题 3: 测试覆盖不足
  实现: "src/auth/jwt.ts 中有 5 个函数"
  测试: "test/auth.test.ts 只测试了 3 个函数"
  建议: 添加测试覆盖剩余 2 个函数
```

---

### 小结：Step 9 完成验证

```
Step 9: 完成验证 (总耗时: 3-5 分钟)
  ✅ 9.1: 代码质量检查
  ✅ 9.2: 文档完整性检查
  ✅ 9.3: 需求覆盖率检查
  ✅ 9.4: 文档关联性检查 ← 最关键

验证通过标准:
  □ 所有代码检查通过 (lint/type/test)
  □ 所有文档完整 (需求/方案/实现)
  □ 所有需求都有实现和测试
  □ 所有文档相互关联，无冲突
```

---

## 🎯 步骤 10: 交付清单生成

### 目标
生成明确的交付清单，包括 commit 描述、文件归档指引、后续操作

### 子步骤 10.1: Commit 描述生成

**AI 自动生成**（用户复制粘贴，不是 AI 提交）:

```yaml
格式: Conventional Commits

构成:
  1. 类型和范围
     格式: <type>(<scope>):
     例: feat(auth): 或 fix(user): 或 docs(api):
     
     type 可选值:
       - feat: 新功能
       - fix: 修复bug
       - docs: 文档修改
       - style: 代码格式修改
       - refactor: 重构（无功能变化）
       - test: 添加或修改测试
       - chore: 构建、依赖等非功能改动
     
     scope: 影响的模块，例 auth, user, db 等
  
  2. 简短描述 (< 50 字)
     - 使用祈使句（"添加" 而非 "添加了"）
     - 不要以句号结尾
     - 清楚说明做了什么
  
  3. 详细描述 (可选但推荐)
     - 为什么做这个变化
     - 与之前的行为有什么不同
     - 可以分多行，每行 < 72 字
  
  4. 相关文档 (新增)
     - 列出相关的需求、方案、实施文档
     - 格式: 相关文档: <链接>
  
  5. 测试结果 (新增)
     - 列出运行的测试
     - 列出覆盖率
     - 列出通过的测试数量
  
  6. 关闭的 Issue (如有)
     - 格式: Closes #123 或 Fixes #456
     - GitHub/GitLab 会自动关联
```

**生成示例**:

```
feat(auth): 实现 JWT 用户认证和 RBAC 权限管理

实现内容:
  - 添加 JWT 认证中间件 (src/auth/jwt.ts)
  - 实现 RBAC 权限检查 (src/auth/rbac.ts)
  - 添加用户角色和权限管理接口
  - 完整的单元和集成测试

技术方案:
  - 使用 jsonwebtoken 库生成和验证 JWT
  - 权限存储在 JWT 的 claims 中
  - 中间件检查请求的权限
  - 支持动态权限更新（需要重新登录）

相关文档:
  - 需求: outputs/auth/req-001/REQUIREMENT.md
  - 技术方案: outputs/auth/req-001/TECH-PLAN.md
  - 实施记录: outputs/auth/req-001/IMPLEMENTATION.md

测试结果:
  ✅ 单元测试: 45/45 通过
  ✅ 集成测试: 12/12 通过
  ✅ 覆盖率: 95% (语句), 92% (分支)
  ✅ Linting: 通过 (0 errors, 0 warnings)
  ✅ TypeScript: 通过 (0 type errors)

Closes #456, Closes #457
```

**用户操作**:
```bash
# 1. 复制上方 commit 描述

# 2. 在 Git 中提交
git add .
git commit -m "feat(auth): 实现 JWT 用户认证和 RBAC 权限管理

实现内容:
  - 添加 JWT 认证中间件 (src/auth/jwt.ts)
  ...
"

# 3. AI 不做这一步，用户决定何时提交
```

---

### 子步骤 10.2: 文件归档清单

**AI 自动生成**（用户根据清单手动操作）:

```yaml
分类标准:

A. 长期保存 (进入项目 docs/)
   条件: 经过审核，是正式文档
   文件:
     - REQUIREMENT.md → docs/requirements/FEATURE-001.md
     - TECH-PLAN.md → docs/design/FEATURE-001-design.md
     - API文档 → docs/api/
   处理: 用户审核后复制

B. 临时保存 (保留在 outputs/)
   条件: 实施过程中的临时产物
   文件:
     - IMPLEMENTATION.md (保留原件)
     - test-scripts/ (测试脚本)
     - reports/ (性能报告等)
     - analysis/ (问题分析等)
   处理: 自动保留 30 天

C. 版本管理
   条件: 需求有变更时
   处理:
     - 原始文档: REQUIREMENT-v1.0.md
     - 变更1: REQUIREMENT-v1.1.md
     - 变更2: REQUIREMENT-v2.0.md
     - 记录: CHANGES.md (记录所有变更)
```

**归档清单示例**:

```
Step 10.2 - 文件归档清单
═════════════════════════════════════════

生成的文件:
  outputs/auth/req-001/
    ├── REQUIREMENT.md (248 行)
    ├── TECH-PLAN.md (412 行)
    ├── IMPLEMENTATION.md (185 行)
    ├── test-scripts/
    │   ├── performance-test.js
    │   └── load-test.js
    └── reports/
        ├── performance-report.md
        └── coverage-report.md

建议归档:

【需要进入项目的文件】
  □ REQUIREMENT.md
    目标路径: docs/requirements/FEATURE-AUTH-001.md
    步骤: 审核后复制
    
  □ TECH-PLAN.md
    目标路径: docs/design/FEATURE-AUTH-001-design.md
    步骤: 审核后复制
    
  □ API 接口说明 (从 TECH-PLAN.md 提取)
    目标路径: docs/api/auth-api.md
    步骤: 单独整理，审核后复制

【保留在 outputs 的文件】
  □ IMPLEMENTATION.md (参考实施细节用)
  □ test-scripts/ (以后运行回归测试用)
  □ reports/ (审计追踪用)

【版本管理】
  原始版本: REQUIREMENT-v1.0.md
  后续变更: REQUIREMENT-v1.1.md (如有变更)
  变更记录: CHANGES.md
═════════════════════════════════════════

用户操作流程:
  1. 审核 REQUIREMENT.md 和 TECH-PLAN.md
  2. 如需修改，修改 outputs 中的原件
  3. 审核通过后，复制到 docs/
  4. 更新 outputs/auth/INDEX.md (任务列表)
```

---

### 子步骤 10.3: 后续操作清单

**AI 自动生成**（明确的行动清单）:

```yaml
操作顺序:

【第 1 步 - 代码提交】
  时机: 代码完全就绪，验证通过
  操作:
    1. git add . (添加所有改动)
    2. git commit -m "..." (使用生成的 commit 描述)
    3. git push origin <当前分支> (推送到远程)
  预计时间: < 5 分钟

【第 2 步 - 代码审查】
  时机: 代码已推送到远程
  操作:
    1. 创建 Pull Request (如使用 GitHub/GitLab)
       标题: 与 commit 描述一致
       描述: 复制 commit 详细描述
    2. 关键审查人: @架构组, @安全组 (可选)
    3. 等待审查反馈
  预计时间: 1-2 天

【第 3 步 - 处理反馈】
  时机: 审查中发现问题
  操作:
    1. 查看审查评论
    2. 修改代码或文档
    3. git commit -m "fix: ..." (修复 commit)
    4. git push (推送修改)
    5. 重复直到审查通过
  预计时间: 根据问题复杂度

【第 4 步 - 合并代码】
  时机: 审查通过
  操作:
    1. Approve PR/MR
    2. 点击 "Merge" 或 "Squash and Merge"
    3. 删除远程分支 (可选)
  预计时间: < 5 分钟

【第 5 步 - 文件发布】
  时机: 代码合并到 main 分支
  操作:
    1. 复制 REQUIREMENT.md → docs/requirements/
    2. 复制 TECH-PLAN.md → docs/design/
    3. 更新 outputs/auth/INDEX.md (标记为已合并)
    4. git add docs/ && git commit && git push
  预计时间: < 10 分钟

【第 6 步 - 版本发布 (如需要)】
  时机: 功能已合并，准备发布
  操作:
    1. 更新 CHANGELOG.md
    2. 更新版本号 (package.json, 或其他)
    3. 创建 release tag
    4. 发布到 npm / 其他包管理器 (如适用)
  预计时间: < 15 分钟
```

**完整清单示例**:

```
Step 10.3 - 后续操作清单
═════════════════════════════════════════

当前状态: ✅ 所有验证通过，准备交付

【立即需要做的 (第 1-2 周)】

1️⃣  代码提交 (第 1 天)
    命令:
      git add .
      git commit -m "feat(auth): ..."
      git push origin feature/auth-001
    
    检查:
      □ 确认代码推送成功
      □ 分支出现在远程仓库

2️⃣  创建 Pull Request (第 1 天)
    地址: https://github.com/rockyshi1993/project/pull/new
    标题: 实现 JWT 用户认证和 RBAC 权限管理
    描述: [复制上方 commit 详细描述]
    审查人: @技术主管, @架构组
    
    检查:
      □ PR 标题和描述清晰
      □ 所有相关审查人已添加

3️⃣  等待代码审查 (1-2 天)
    预期: 
      - 建筑代码是否符合规范
      - 是否有安全问题
      - 是否需要优化
    
    如有反馈:
      □ 修改代码
      □ 推送新的 commit
      □ 重新请求审查

4️⃣  合并代码 (审查通过后)
    操作: 点击 PR 中的 "Merge" 按钮
    选项: 可选 "Squash and merge" (合并所有 commit)
    
    检查:
      □ 确认分支已合并到 main
      □ CI/CD 运行通过 (自动)

【后续需要做的 (第 2-3 周)】

5️⃣  文件归档 (代码合并后)
    操作:
      1. 复制 docs/requirements/FEATURE-AUTH-001.md
      2. 复制 docs/design/FEATURE-AUTH-001-design.md
      3. git add docs/ && git commit && git push
    
    检查:
      □ 文件已复制到 docs/
      □ 更改已推送到 main

6️⃣  更新任务状态 (代码合并后)
    文件: outputs/auth/INDEX.md
    更新:
      - 状态: merged → completed
      - 完成日期: 2026-02-15
      - 对应的 PR: #456
    
    检查:
      □ INDEX.md 已更新
      □ 更改已推送

【可选 - 版本发布 (月底或重大版本)】

7️⃣  更新版本信息 (如需发布)
    文件:
      - CHANGELOG.md (添加新功能说明)
      - package.json (版本号)
    
    步骤:
      1. 更新版本: 1.2.0 → 1.3.0
      2. npm publish (发布到 npm)
      3. git tag v1.3.0 && git push --tags

═════════════════════════════════════════

总时间估算:
  步骤 1-4: 2 天 (大部分时间在代码审查)
  步骤 5-6: 1 天 (文件归档和更新)
  步骤 7: 1 天 (如需发布)
  总计: 3-5 天 (审查最耗时)

关键阶段:
  ✅ 现在: 所有验证通过
  → 今天: 提交和创建 PR
  → 明天-后天: 等待审查，处理反馈
  → 后天: 合并代码
  → 一周后: 文件归档
```

---

### 小结：Step 10 交付清单

```
Step 10: 交付清单生成 (总耗时: 2-3 分钟，无需 AI 执行后续)

输出物:
  ✅ 10.1: Commit 描述 (用户复制粘贴)
  ✅ 10.2: 文件归档清单 (用户参考)
  ✅ 10.3: 后续操作清单 (用户按步骤执行)

用户决策:
  ⚠️ 何时执行 Step 1? (用户决定)
  ⚠️ PR 审查人是谁? (用户确认)
  ⚠️ 是否需要发布版本? (用户决定)
```

---

## 🎬 完整示例：从验证到交付

### 场景：实现用户认证功能

**Step 8: 验证完成度** (原有)
```
所有代码已生成，所有文档已完成
```

**Step 9: 完成验证** (新增)
```
✅ 代码质量: lint/type/test 全部通过，覆盖率 95%
✅ 文档完整: REQUIREMENT/TECH-PLAN/IMPLEMENTATION 都完整
✅ 需求覆盖: 5 个需求都有实现和测试
✅ 文档关联: 所有文档相互关联，无冲突

结论: ✅ 所有验证通过，准备交付
```

**Step 10: 交付清单** (新增)
```
【Commit 描述】
feat(auth): 实现 JWT 用户认证和 RBAC 权限管理
...

【文件归档清单】
- REQUIREMENT.md → docs/requirements/FEATURE-AUTH-001.md
- TECH-PLAN.md → docs/design/FEATURE-AUTH-001-design.md
- test-scripts/ → outputs/auth/req-001/test-scripts/

【后续操作】
1. git commit && git push
2. 创建 Pull Request
3. 等待代码审查 (1-2 天)
4. 合并到 main
5. 复制文件到 docs/
```

**用户执行**
```bash
# 第 1 天：提交代码
git commit -m "feat(auth): ..."
git push origin feature/auth-001

# 创建 PR (在 GitHub/GitLab)
[创建 PR，输入标题和描述]

# 第 2-3 天：等待审查，处理反馈
[修改代码，推送新的 commit]

# 审查通过后：合并代码
[点击 Merge 按钮]

# 后续：归档文件
cp outputs/auth/REQUIREMENT.md docs/requirements/
cp outputs/auth/TECH-PLAN.md docs/design/
git commit && git push
```

---

## ✅ 验收清单

Step 9 + Step 10 完成的标准：

```yaml
Step 9 - 完成验证:
  □ 代码质量检查通过
  □ 文档完整性检查通过
  □ 需求覆盖率 100%
  □ 文档关联性检查通过（无冲突）

Step 10 - 交付清单:
  □ Commit 描述已生成
  □ 文件归档清单已生成
  □ 后续操作清单已生成
  □ 用户已确认准备交付

准备交付:
  ✅ 代码和文档已就绪
  ✅ 用户知道下一步是什么
  ✅ 完整的审计追踪（文档关联）
  ✅ 清晰的版本管理
```

---

## 📚 相关文档

- [workflows/README.md](./README.md) - 工作流概述
- [00-pre-check/README.md](./00-pre-check/README.md) - 前置检查
- [../templates/](../templates/) - 文档模板

---

**流程编码**: WF-09-10  
**最后更新**: 2026-02-12  
**版本**: 1.1  
**维护者**: AI 规范团队
