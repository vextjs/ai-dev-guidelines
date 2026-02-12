# 项目依赖管理规范 - 更新和安全

> **版本**: v1.0  
> **最后更新**: 2026-02-11  
> **适用范围**: 所有 npm 项目

---

## 更新依赖

### 1. 更新策略

```yaml
日常更新 (每月):
  包括: 补丁版本、安全更新
  频率: 每月 1 次
  验证: 运行完整的测试套件
  风险: 低

定期更新 (每季度):
  包括: 次版本、新功能
  频率: 每季度 1 次
  验证: 完整的测试 + 手动测试
  风险: 中等

年度审查 (每年):
  包括: 主版本、大型升级
  频率: 每年 1-2 次
  验证: 完整的回归测试
  风险: 高

安全更新 (紧急):
  包括: 安全漏洞修复
  频率: 根据需要
  验证: 快速验证不会破坏核心功能
  风险: 必须立即应用
```

### 2. 更新命令

```bash
# 检查可用的更新
npm outdated

# 输出示例:
# Package          Current  Wanted  Latest  Location
# express            4.17.1  4.18.2  4.18.2  dev-docs
# mongoose           6.0.0   6.9.2   7.5.0  dev-docs

# 更新所有补丁版本
npm update

# 更新特定包
npm install express@^4.18.2

# 更新到最新版本 (可能包括主版本)
npm install express@latest

# 用 npm-check-updates 管理批量更新
npm install -g npm-check-updates
ncu --upgrade
```

### 3. 更新工作流

```
Step 1: 创建新分支
  ↓
  git checkout -b chore/dependency-updates

Step 2: 运行更新检查
  ↓
  npm outdated

Step 3: 有选择地更新依赖
  ↓
  npm install express@^4.18.2
  npm install --save-dev jest@^29.5.0

Step 4: 验证变更
  ↓
  npm test
  npm run build
  npm run lint

Step 5: 提交和 PR
  ↓
  git add package.json package-lock.json
  git commit -m "chore: update dependencies"
  git push origin chore/dependency-updates

Step 6: Code review 和合并
  ↓
  团队审核，确认变更无误

Step 7: 验证修复 (3 天内)
  ↓
  在测试环境运行，监控性能
```

### 4. 处理破坏性更新

```javascript
// 假设从 Express 4.x 升级到 5.x
// 5.x 改变了路由 API

// 升级步骤:
// 1. 阅读迁移指南
// 2. 在分支上逐个更新代码
// 3. 运行测试确保功能完整
// 4. 逐个模块迁移，而不是一次性
// 5. 保留向后兼容的包装器 (临时的)
// 6. 完全迁移后移除包装器
```

---

## 安全检查

### 1. 自动安全扫描

```bash
# npm 内置的安全审计
npm audit

# 输出示例:
# high | prototype pollution in lodash
# Package: lodash
# Patched in: 4.17.21
# Dependency of: my-app

# 自动修复已知漏洞
npm audit fix

# 修复可能有风险的漏洞 (需谨慎)
npm audit fix --force

# 使用 Snyk 进行深度扫描
npm install -g snyk
snyk test
```

### 2. 配置 npm 审计

```javascript
// .npmrc 文件
audit-level=moderate  // 只报告中等及以上风险

// package.json
{
  "engines": {
    "npm": ">=8.0.0"  // 确保使用现代的 npm
  }
}
```

### 3. CI/CD 中的安全检查

```yaml
name: Security Scan

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      - name: Run Snyk test
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        run: |
          npm install -g snyk
          snyk test --severity-threshold=high
```

### 4. 依赖许可证检查

```bash
# 安装 license-check-and-gather
npm install -g license-check-and-gather

# 检查所有依赖的许可证
license-check-and-gather --production

# 配置允许的许可证 (.licensecheckrc)
{
  "allowedLicenses": [
    "MIT",
    "Apache-2.0",
    "BSD-2-Clause",
    "BSD-3-Clause",
    "ISC"
  ],
  "deniedLicenses": ["GPL-3.0"]
}
```

---

## 性能优化

### 1. 依赖大小优化

```bash
# 分析打包大小
npm install -g webpack-bundle-analyzer
npm run build

# 识别重型依赖
# 示例: lodash (71KB) → 可以用原生 JS 替换
#       moment (67KB) → 改用 date-fns 或 dayjs

# 使用 tree-shaking 移除未使用代码
// webpack.config.js
{
  mode: 'production',  // 启用 tree-shaking
  optimization: {
    usedExports: true,
    sideEffects: false
  }
}
```

### 2. 减少依赖数量

```javascript
// ❌ 不好: 添加太多依赖
npm install lodash moment uuid chalk

// ✅ 更好: 使用内置功能
// lodash → JavaScript ES6+
// moment → new Date() 或 dayjs
// uuid → crypto.randomUUID()
// chalk → console 的 ANSI 颜色
```

### 3. 依赖版本锁定

```bash
# 生成 package-lock.json (npm v5+)
npm install

# 在 CI 中使用 npm ci 而不是 npm install
npm ci  # 完全按照 lock file 安装

# .npmrc
legacy-peer-deps=false  # 严格检查对等依赖
```

---

## 最佳实践

### 1. 依赖审计清单

```yaml
每周:
  ☐ 运行 npm audit 检查安全
  ☐ 审视新的 issue 和 PR
  ☐ 检查是否有紧急安全补丁

每月:
  ☐ 运行 npm outdated 检查更新
  ☐ 更新所有补丁版本 (npm update)
  ☐ 审视新的主版本发布

每季度:
  ☐ 评估主版本升级
  ☐ 审视依赖大小和数量
  ☐ 考虑是否可以移除某些依赖

每年:
  ☐ 完整的依赖审计
  ☐ 制定升级计划
  ☐ 评估许可证合规性
```

### 2. 团队协作规范

```yaml
添加新依赖:
  1️⃣ 不要随意添加，先和团队讨论
  2️⃣ 检查是否已有类似包
  3️⃣ 评估包的质量和维护状态
  4️⃣ PR 需要至少 1 个审核
  5️⃣ 安全检查通过后才能合并

更新依赖:
  1️⃣ 小版本更新: 可以直接提交
  2️⃣ 主版本更新: 需要 PR 和充分测试
  3️⃣ 安全补丁: 优先处理
```

### 3. 常见陷阱

```javascript
❌ 陷阱 1: 使用 latest 作为版本
{
  "dependencies": {
    "express": "latest"  // ❌ 太危险
  }
}

✅ 正确做法:
{
  "dependencies": {
    "express": "^4.18.0"  // ✅ 明确范围
  }
}

---

❌ 陷阱 2: 忽视安全警告
npm audit  // 显示 5 个高危漏洞，但不处理

✅ 正确做法:
npm audit fix  // 自动修复

---

❌ 陷阱 3: 添加不必要的依赖
npm install lodash  // 只为了用 _.map()

✅ 正确做法:
const users = users.map(u => ({ id: u.id }));  // 用原生 JS
```

---

## 工具推荐

```yaml
依赖管理:
  - npm: 官方工具，功能完整
  - yarn: 性能好，支持 workspaces
  - pnpm: 节省磁盘空间，快速

版本管理:
  - npm-check-updates: 检查和更新依赖

安全扫描:
  - npm audit: 内置，快速
  - snyk: 更全面，支持 CI/CD

许可证检查:
  - license-check-and-gather: 简单有效

分析工具:
  - bundlephobia.com: 查看包的大小
  - npm-stat.com: 查看下载趋势
```

---

## 检查清单

### 新项目初始化

```
□ 初始化 package.json
  npm init

□ 选择合适的 Node 版本
  # .nvmrc
  18.0.0

□ 添加关键依赖
  □ Web 框架
  □ 数据库驱动
  □ 验证库
  □ 日志库

□ 添加开发工具
  □ TypeScript
  □ ESLint
  □ Prettier
  □ Jest

□ 配置文件
  □ .nvmrc (Node 版本)
  □ .npmrc (npm 配置)
  □ .licensecheckrc (许可证白名单)
  □ .gitignore (排除 node_modules)

□ 文档
  □ 创建 LICENSES.md
  □ 在 README.md 中说明如何安装依赖
```

---

## 相关文档

- [DEPENDENCIES-VERSION.md](./DEPENDENCIES-VERSION.md) - 版本策略
- [CI-CD-OVERVIEW.md](./CI-CD-OVERVIEW.md) - CI/CD 概览

---

**最后更新**: 2026-02-12  
**维护者**: [需要项目团队确定]
