# Git 操作规范

> Git 版本控制的标准化操作规范和安全指南

---

## 📋 概述

本规范定义了 AI 辅助开发中 Git 操作的标准和安全要求，确保版本控制操作可靠、可追溯。

---

## 🎯 操作分类

### 安全操作（可直接执行）

```yaml
安全操作列表:
  查看类:
    - git status: 查看工作区状态
    - git log: 查看提交历史
    - git diff: 查看差异
    - git branch: 查看分支
    - git stash list: 查看暂存列表
    
  只读类:
    - git fetch: 获取远程更新（不合并）
    - git remote -v: 查看远程仓库

执行条件: 无需确认，可直接执行
```

### 提示操作（建议确认）

```yaml
提示操作列表:
  暂存类:
    - git add: 暂存文件
    - git stash: 暂存工作区
    - git stash pop: 恢复暂存
    
  分支类:
    - git checkout: 切换分支
    - git branch <name>: 创建分支

执行条件: 建议告知用户操作内容，但非必须确认
```

### 必须确认操作（高风险）

```yaml
必须确认操作列表:
  提交类:
    - git commit: 提交变更
    - git commit --amend: 修改提交
    
  推送类:
    - git push: 推送到远程
    - git push --force: 强制推送 ⚠️ 极高风险
    
  合并类:
    - git merge: 合并分支
    - git rebase: 变基操作
    - git cherry-pick: 摘取提交
    
  回滚类:
    - git reset: 重置提交
    - git revert: 撤销提交
    
  删除类:
    - git branch -d/-D: 删除分支
    - git clean: 清理未跟踪文件

执行条件: 必须明确告知用户并获得确认
```

---

## 🔴 禁止操作

```yaml
绝对禁止:
  - git push --force 到 main/master/production 分支
  - 未经确认直接 git reset --hard
  - 删除远程主分支
  - 在生产环境执行危险操作

需要额外审批:
  - 修改已推送的提交历史
  - 删除远程分支
  - 强制合并冲突
```

---

## 📝 提交规范

### Commit Message 格式

```
<type>(<scope>): <English description>

<body (optional, English)>

<footer（可选）>
```

> 🔴 **语言规范（默认）**：`type` 和 `scope` 使用英文，描述（subject）和正文（body）**默认使用英文**。项目可通过 `projects/<project>/profile/` 中的规范覆盖为中文。

### Type 类型

```yaml
类型列表:
  feat: 新功能
  fix: Bug 修复
  docs: 文档更新
  style: 代码格式（不影响功能）
  refactor: 重构
  perf: 性能优化
  test: 测试相关
  chore: 构建/工具变更
  ci: CI 配置变更
  build: 构建系统变更
```

### 语言规范细则

```yaml
格式: Conventional Commits（类型前缀英文，描述正文默认英文）
模式: <type>(<scope>): <English description>

✅ 正确示例:
  feat(user): add user registration
  fix(auth): fix JWT token not refreshed on expiry
  docs: add API reference documentation
  refactor(adapter): refactor request parsing logic
  chore: update dependencies
  test(login): add login timeout edge case tests

❌ 错误示例:
  更新代码                              ← missing type prefix
  fix bug                              ← no Conventional Commits format
  WIP                                  ← meaningless description

项目级覆盖:
  如需使用中文描述，可在 projects/<project>/profile/ 中声明覆盖:
    commit_language: zh-CN
  覆盖后示例:
    feat(user): 添加用户注册功能
    fix(auth): 修复 JWT token 过期未刷新的问题
```

### 正文（body）规范

```yaml
使用场景: complex changes, explaining reasons or scope of impact
语言: English (default); project-level override available
格式:
  - each change point starts with "- "
  - explain "what" and "why"
  - reference Issue numbers (Closes #123)
```

### 示例

```bash
# ✅ Good commit message (simple change)
feat(user): add user registration

# ✅ Good commit message (complex change with body)
feat(middleware): add API rate limiting

- Add rate-limit.ts middleware with sliding window algorithm
- Add Redis storage support
- Add rate limit config options in config.ts (RATE_LIMIT_*)
- Return 429 status code when rate limit exceeded

Closes #123

# ❌ Bad commit messages
fix bug
update code
WIP
```

---

## 🌿 分支策略

### 分支命名规范

```yaml
主分支:
  - main: 生产环境代码
  - develop: 开发环境代码

功能分支:
  - feature/<issue-id>-<short-description>
  - 示例: feature/123-user-registration

修复分支:
  - fix/<issue-id>-<short-description>
  - hotfix/<issue-id>-<description>（紧急修复）

发布分支:
  - release/<version>
  - 示例: release/v1.2.0
```

### 分支工作流

```yaml
标准流程:
  1. 从 develop 创建功能分支
  2. 在功能分支开发
  3. 提交 PR 到 develop
  4. Code Review 通过后合并
  5. develop 定期合并到 main

紧急修复:
  1. 从 main 创建 hotfix 分支
  2. 修复问题
  3. 同时合并到 main 和 develop
```

---

## ⚠️ AI 操作确认流程

### 标准确认格式

```yaml
操作确认:
  操作类型: [git commit/push/merge/...]
  目标分支: [分支名]
  变更内容:
    - [文件1]
    - [文件2]
  风险等级: [低/中/高]
  
确认: 是否继续执行？[Y/N]
```

### 示例场景

```yaml
场景1 - 提交代码:
  🔔 即将执行 Git 操作:
  操作: git commit
  信息: "feat(auth): add JWT authentication middleware"
  变更: 3 个文件 (+156, -12)
  
  确认继续? [Y/N]

场景2 - 推送代码:
  🔔 即将执行 Git 操作:
  操作: git push origin feature/auth-jwt
  远程: origin (https://github.com/...)
  分支: feature/auth-jwt
  
  确认继续? [Y/N]
```

---

## 🛡️ 安全检查清单

### 提交前检查

```yaml
必须确认:
  - [ ] 没有敏感信息（密钥、密码、Token）
  - [ ] 没有大文件（>10MB）
  - [ ] 没有编译产物（node_modules、dist 等）
  - [ ] .gitignore 配置正确
  - [ ] 提交信息符合规范
```

### 推送前检查

```yaml
必须确认:
  - [ ] 本地测试通过
  - [ ] 代码已经过 Review（如需要）
  - [ ] 目标分支正确
  - [ ] 没有合并冲突
```

---

## 📊 常用命令速查

### 日常操作

```bash
# 查看状态
git status
git log --oneline -10

# 暂存变更
git add .
git add <file>

# 提交
git commit -m "type(scope): message"

# 拉取/推送
git pull origin <branch>
git push origin <branch>
```

### 分支操作

```bash
# 创建并切换分支
git checkout -b feature/xxx

# 切换分支
git checkout <branch>

# 合并分支
git merge <branch>

# 删除本地分支
git branch -d <branch>
```

### 撤销操作

```bash
# 撤销工作区修改
git checkout -- <file>

# 撤销暂存
git reset HEAD <file>

# 撤销提交（保留修改）
git reset --soft HEAD^

# 撤销提交（创建新提交）
git revert <commit>
```

---

## 📝 最佳实践

1. **小步提交**: 每个提交只做一件事
2. **有意义的信息**: 提交信息要说明"为什么"
3. **先拉后推**: push 前先 pull 最新代码
4. **分支隔离**: 不同功能在不同分支开发
5. **定期清理**: 删除已合并的本地分支
6. **备份重要变更**: 大改动前先 stash 或新建分支

---

## 🤖 AI 辅助 Git 操作

### AI 生成 Commit Message

AI 根据代码变更自动生成 commit message：

```yaml
生成规则:
  1. 分析 git diff 内容
  2. 识别变更类型（feat/fix/refactor/...）
  3. 提取变更范围（scope）
  4. 总结核心变更（subject）
  5. 列出详细变更点（body）

输出格式:
  <type>(<scope>): <one-line summary>
  
  - Change point 1
  - Change point 2
  - Change point 3
```

### AI 生成 Commit Message 示例

```bash
# Input: git diff shows changes to rate-limit.ts and config.ts

# AI generated:
feat(middleware): add API rate limiting

- Add rate-limit.ts middleware with sliding window algorithm
- Add Redis storage support
- Add rate limit config options in config.ts (RATE_LIMIT_*)
- Return 429 status code when rate limit exceeded
```

### AI 辅助 PR 描述

```markdown
## 变更说明
[AI 自动生成的变更摘要]

## 变更类型
- [ ] feat: 新功能
- [x] fix: Bug 修复
- [ ] refactor: 重构

## 测试清单
- [ ] 单元测试通过
- [ ] 集成测试通过
- [ ] 手动测试通过

## 影响范围
[AI 分析的影响模块]

## 关联 Issue
Closes #xxx
```

---

**最后更新**: 2026-02-12

