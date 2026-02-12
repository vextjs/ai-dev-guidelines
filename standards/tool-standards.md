# 工具调用规范

> AI 工具使用边界和最佳实践

---

## 🎯 规范目标

```yaml
目标:
  - 明确 AI 可使用的工具能力
  - 定义工具调用的权限边界
  - 规范工具调用的安全实践
  - 跨平台通用，不绑定特定 AI

适用对象:
  - AI Agent（Copilot / Claude / GPT 等）
  - 自动化脚本
  - CI/CD 流程
```

---

## 🧰 工具能力分类

### 文件操作能力

```yaml
读取能力:
  - 查看文件内容
  - 搜索文件内容（文本/正则）
  - 查找文件（按名称/路径）
  - 列出目录结构

写入能力:
  - 创建新文件
  - 编辑现有文件
  - 删除文件（需确认）

权限边界:
  只读: 所有非敏感文件
  读写: 项目目录下的代码和文档
  禁止: .git/, .env, node_modules/, dist/
```

### 代码搜索能力

```yaml
能力类型:
  - 语义搜索: 基于代码含义查找
  - 正则搜索: 精确模式匹配
  - 文件名搜索: 按文件名/路径查找

使用场景:
  - 查找相似实现
  - 定位功能代码
  - 分析依赖关系

最佳实践:
  - 优先使用语义搜索（更智能）
  - 正则搜索用于精确匹配
  - 并行搜索提高效率
```

### 终端命令能力

```yaml
能力类型:
  - 执行命令: 运行 shell 命令
  - 交互输入: 向运行中的命令发送输入
  - 读取输出: 获取命令执行结果
  - 停止命令: 终止运行中的命令

执行模式:
  sync: 同步执行（构建、测试）
  async: 异步执行（服务器、交互式工具）
  background: 后台运行（长期服务）

权限边界:
  允许: 构建、测试、Lint、Git 查看
  受限: 文件删除、系统修改
  禁止: rm -rf、格式化磁盘、修改系统配置
```

### Git 操作能力

```yaml
读取操作:
  - 查看状态: git status
  - 查看差异: git diff
  - 查看历史: git log
  - 查看提交: git show

写入操作（需确认）:
  - 提交变更: git commit
  - 推送代码: git push
  - 合并分支: git merge

禁止操作:
  - 修改历史: rebase/reset --hard
  - 强制推送: push --force
```

---

## 🔒 文件操作权限边界

### 只读文件

```yaml
类型:
  - 配置文件: package.json, tsconfig.json, .gitignore
  - 依赖锁文件: package-lock.json, yarn.lock
  - 构建产物: dist/, build/
  - 第三方代码: node_modules/, vendor/

操作:
  ✅ view: 查看内容
  ❌ edit: 不允许直接修改
  ❌ delete: 不允许删除

例外:
  如需修改配置文件，必须经用户确认
```

### 读写文件

```yaml
类型:
  - 源代码: src/, lib/
  - 测试代码: test/, __tests__/
  - 文档: docs/, *.md
  - 脚本: scripts/

操作:
  ✅ view: 查看内容
  ✅ edit: 修改内容
  ✅ create: 创建新文件
  ⚠️ delete: 需用户确认（危险操作）
```

### 禁止访问

```yaml
类型:
  - 敏感配置: .env, .env.*
  - Git 目录: .git/
  - 系统文件: .DS_Store, Thumbs.db
  - IDE 配置: .vscode/, .idea/
  - AI 配置: .github/agents/

操作:
  ❌ 完全禁止访问
  ❌ 不能读取
  ❌ 不能修改

原因:
  - 可能包含敏感信息
  - 可能导致安全问题
  - 可能影响 AI 行为
```

---

## 🛡️ 终端命令执行规范

### 安全命令白名单

```yaml
构建工具:
  - npm install, npm run build, npm test
  - yarn install, yarn build, yarn test
  - pnpm install, pnpm build, pnpm test

代码质量:
  - eslint, prettier, tslint
  - jest, mocha, vitest
  - tsc --noEmit

Git 操作:
  - git status, git diff, git log
  - git show, git blame
  - 不允许: git commit, git push, git reset

文件操作:
  - cat, head, tail, less
  - find, grep, ls
  - 受限: rm, mv（需确认）
```

### 危险命令需确认

```yaml
删除操作:
  - rm, rm -rf
  - 必须: 用户明确确认

系统修改:
  - chmod, chown
  - 必须: 用户明确确认

网络操作:
  - curl, wget（外部 API）
  - 建议: 说明用途，征得同意

包管理:
  - npm uninstall
  - 建议: 说明原因
```

### 禁止命令

```yaml
绝对禁止:
  - rm -rf /
  - dd if=/dev/zero of=/dev/sda
  - mkfs, fdisk
  - sudo 相关命令（无权限）
  - 修改系统配置

原因:
  - 可能导致数据丢失
  - 可能破坏系统
  - AI 无系统权限
```

---

## ✅ 工具调用最佳实践

### 1. 文件操作最佳实践

```yaml
读取文件:
  - 优先使用 view（支持目录+行范围）
  - 大文件使用 view_range 分段读取
  - 并行读取多个文件提高效率

修改文件:
  - 使用 edit 精确替换（避免重写整个文件）
  - 批量修改可并行调用 edit
  - 修改后使用 view 验证

创建文件:
  - 检查文件是否存在（避免覆盖）
  - 使用标准模板
  - 创建后验证内容
```

### 2. 搜索工具最佳实践

```yaml
选择工具:
  - 语义搜索: search_code_subagent
  - 精确匹配: grep
  - 文件名: glob

并行搜索:
  # 同时搜索多个模式
  - grep pattern1
  - grep pattern2
  - glob pattern3

搜索策略:
  - 先宽泛搜索（了解结构）
  - 再精确定位（找到目标）
  - 最后读取验证（确认内容）
```

### 3. 命令执行最佳实践

```yaml
同步命令 (sync):
  使用场景: 快速命令（<10秒）
  示例: git status, ls, cat
  注意: 设置合适的 initial_wait

长命令 (sync + read_bash):
  使用场景: 构建、测试（>10秒）
  步骤:
    1. bash mode=sync initial_wait=60
    2. read_bash delay=30（持续读取）
  
异步命令 (async):
  使用场景: 交互式工具（调试器、REPL）
  步骤:
    1. bash mode=async
    2. write_bash 发送输入
    3. read_bash 读取输出

后台服务 (async + detach):
  使用场景: Web 服务器、数据库
  步骤:
    1. bash mode=async detach=true
  注意: 无法用 stop_bash 停止，需 kill PID
```

### 4. 错误处理最佳实践

```yaml
命令失败:
  1. 检查错误信息
  2. 分析失败原因
  3. 尝试修复或报告用户

文件不存在:
  1. 使用 view 前检查路径
  2. 提供清晰的错误信息
  3. 建议正确的路径

权限不足:
  1. 检查是否尝试访问禁止文件
  2. 使用允许的替代方案
  3. 向用户说明限制
```

---

## 🚨 安全约束

### 数据安全

```yaml
禁止:
  - 读取 .env 文件
  - 在日志中打印敏感信息
  - 将密钥写入代码

必须:
  - 使用环境变量存储密钥
  - 敏感操作征得用户同意
  - 遵守最小权限原则
```

### 操作安全

```yaml
删除操作:
  - 必须用户确认
  - 列出将删除的内容
  - 提供撤销方案

修改操作:
  - 重要文件（package.json）需确认
  - 使用 Git 跟踪变更
  - 可通过 Git 回滚

危险命令:
  - 绝对不执行
  - 向用户说明风险
  - 提供安全替代方案
```

---

## 📋 工具调用清单

### 文件读取

```yaml
单文件读取:
  工具: view
  参数: path
  
多文件读取:
  工具: 并行调用 view
  效率: 更高

目录浏览:
  工具: view（目录路径）
  结果: 显示文件列表
```

### 文件修改

```yaml
创建新文件:
  工具: create
  注意: 文件必须不存在

修改现有文件:
  工具: edit
  参数: path, old_str, new_str
  技巧: 可批量调用

删除文件:
  限制: 需用户确认
  工具: bash rm（慎用）
```

### 代码搜索

```yaml
语义搜索:
  工具: search_code_subagent
  参数: query（自然语言）
  
正则搜索:
  工具: grep
  参数: pattern, path, glob
  
文件搜索:
  工具: glob
  参数: pattern
```

### 命令执行

```yaml
同步执行:
  工具: bash
  参数: command, mode=sync

异步执行:
  工具: bash + write_bash + read_bash
  参数: mode=async

后台运行:
  工具: bash
  参数: mode=async, detach=true
```

---

## 📎 相关文档

- [代码规范](./code-standards.md)
- [安全规范](./security-standards.md)
- [脚本规范](./script-standards.md)

---

**最后更新**: 2026-02-12
