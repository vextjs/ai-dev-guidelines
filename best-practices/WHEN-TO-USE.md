# Best Practices 快速索引

> 遇到问题时快速找到解决方案

---

## 🔍 按问题查找

| 遇到的问题 | 参考文档 | 关键内容 |
|-----------|---------|---------|
| 文件太大，读不完 | [token-optimization.md](./token-optimization.md) | 分段读取、摘要生成 |
| 项目很复杂，不知从何下手 | [large-projects.md](./large-projects.md) | 模块化拆分、渐进实施 |
| 操作出错，需要回滚 | [error-handling.md](./error-handling.md) | 检查点、回滚策略 |
| 代码不符合规范 | [compliance-check.md](./compliance-check.md) | 检测机制、修复方法 |
| 遇到网络/权限等异常 | [edge-cases.md](./edge-cases.md) | 异常处理、降级方案 |
| 跨会话继续工作 | [memory-management.md](./memory-management.md) | 上下文保存、任务恢复 |
| 自动修复代码问题 | [auto-fix.md](./auto-fix.md) | 修复策略、常见模式 |

---

## 📋 按场景查找

### 开发前

| 场景 | 参考文档 |
|-----|---------|
| 分析大型项目 | [large-projects.md](./large-projects.md) |
| 了解项目规范 | [compliance-check.md](./compliance-check.md) |
| Token 预算评估 | [token-optimization.md](./token-optimization.md) |

### 开发中

| 场景 | 参考文档 |
|-----|---------|
| 读取大文件 | [token-optimization.md#分段读取](./token-optimization.md) |
| 处理复杂逻辑 | [large-projects.md#模块化拆分](./large-projects.md) |
| 遇到异常情况 | [edge-cases.md](./edge-cases.md) |
| 操作记录和回滚 | [error-handling.md](./error-handling.md) |

### 开发后

| 场景 | 参考文档 |
|-----|---------|
| 规范检查 | [compliance-check.md](./compliance-check.md) |
| 自动修复 | [auto-fix.md](./auto-fix.md) |
| 保存上下文 | [memory-management.md](./memory-management.md) |

---

## ⚡ 常见问题速查

### Q: 文件超过 500 行怎么读？

```yaml
方案: 分段读取
参考: token-optimization.md#分段读取

步骤:
  1. 先读取文件头部（1-50行）了解结构
  2. 用 grep_search 定位关键代码
  3. 按需读取特定区域
```

### Q: 项目文件太多，不知道改哪里？

```yaml
方案: 逐步分析
参考: large-projects.md#模块化拆分

步骤:
  1. 先看 package.json 和入口文件
  2. 用 grep_search 搜索关键词
  3. 按依赖关系逐步深入
```

### Q: 改错了怎么回滚？

```yaml
方案: 使用检查点
参考: error-handling.md#回滚策略

步骤:
  1. 操作前记录文件状态
  2. 出错后用 git checkout 恢复
  3. 或手动还原修改
```

### Q: 代码不符合项目规范？

```yaml
方案: 规范检查 + 自动修复
参考: compliance-check.md + auto-fix.md

步骤:
  1. 读取项目 profile/03-代码风格.md
  2. 对照检查生成的代码
  3. 自动修复或提示用户
```

---

## 📊 文档优先级

当时间有限时，按以下优先级阅读：

| 优先级 | 文档 | 适用频率 |
|-------|------|---------|
| P0 | token-optimization.md | 几乎每次 |
| P0 | large-projects.md | 大项目必读 |
| P1 | error-handling.md | 复杂操作时 |
| P1 | edge-cases.md | 遇到异常时 |
| P2 | compliance-check.md | 代码检查时 |
| P2 | auto-fix.md | 修复问题时 |
| P3 | memory-management.md | 跨会话时 |

---

**最后更新**: 2026-02-12

