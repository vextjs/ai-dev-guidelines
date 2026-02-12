# 项目规范 - CI/CD 质量门禁

> **用途**: 定义 CI/CD 质量门禁的具体标准和检查项  
> **所属**: projects/<project-name>/CI-CD-QUALITY-GATES.md  
> **维护**: DevOps/平台团队  
> **最后更新**: 2026-02-11

---

## 📊 质量门禁概述

质量门禁是代码合并前的最后一道防线，确保代码质量和系统稳定性。

```
代码提交
   ↓
【质量门禁检查】
   ├─ 检查 1: 代码风格 (Linting)
   ├─ 检查 2: 类型检查 (TypeScript)
   ├─ 检查 3: 单元测试
   ├─ 检查 4: 代码质量 (SonarQube)
   ├─ 检查 5: 依赖安全 (npm audit)
   └─ 检查 6: 代码审查 (人工)
   ↓
所有检查通过? 
   ├─ ✅ 是 → 合并代码
   └─ ❌ 否 → 拒绝合并，反馈问题
```

---

## ✅ 必须通过的门禁

### 门禁 1: 代码风格检查 (Linting)

```yaml
工具: ESLint + Prettier

标准:
  ✓ 零个错误 (errors)
  ✓ 零个警告 (warnings)
  ✓ 代码格式符合 Prettier 标准

常见问题:
  ❌ 未定义的变量
  ❌ 未使用的导入
  ❌ 缺少分号
  ❌ 不一致的代码格式
  ❌ console.log 未删除
  ❌ 使用了禁止的语法

修复方法:
  npm run lint              # 查看所有错误
  npm run lint:fix          # 自动修复部分错误
  npm run format            # 使用 Prettier 格式化

配置文件:
  .eslintrc.js              # ESLint 配置
  .prettierrc.js            # Prettier 配置
  .eslintignore             # ESLint 忽略规则

示例配置:
  {
    "extends": ["eslint:recommended"],
    "rules": {
      "no-unused-vars": "error",
      "no-undef": "error",
      "semi": ["error", "always"],
      "quotes": ["error", "single"]
    }
  }
```

### 门禁 2: 类型检查 (TypeScript)

```yaml
工具: TypeScript 编译器

标准:
  ✓ 零个类型错误
  ✓ 零个编译错误

常见问题:
  ❌ 类型不匹配
  ❌ 缺少类型注解
  ❌ 无效的类型转换
  ❌ 可能的 undefined 访问
  ❌ 方法或属性不存在

修复方法:
  npm run type-check        # 检查类型
  npx tsc --noEmit          # 显式检查编译
  npm run type-check:fix    # 自动修复 (如有)

常见修复示例:
  // ❌ 类型不匹配
  const x: number = "hello";
  
  // ✅ 修复
  const x: string = "hello";
  
  // ❌ 可能的 undefined
  function getValue(obj: any) {
    return obj.value + 1;
  }
  
  // ✅ 修复
  function getValue(obj: { value: number }) {
    return obj.value + 1;
  }

配置文件:
  tsconfig.json             # TypeScript 配置
  
示例配置 (严格模式):
  {
    "compilerOptions": {
      "strict": true,                      # 启用所有严格检查
      "noImplicitAny": true,              # 禁止隐式 any
      "strictNullChecks": true,           # 严格 null 检查
      "strictFunctionTypes": true,        # 严格函数类型
      "noImplicitThis": true              # 禁止隐式 this
    }
  }
```

### 门禁 3: 单元测试

```yaml
工具: Jest / Vitest

标准:
  ✓ 所有测试通过 (100%)
  ✓ 测试覆盖率 >= 80%

测试覆盖率解释:
  - 行覆盖率 (Line Coverage): 执行过的代码行 / 总行数
  - 分支覆盖率 (Branch Coverage): 执行过的分支 / 总分支数
  - 函数覆盖率 (Function Coverage): 调用过的函数 / 总函数数

常见问题:
  ❌ 测试写得不够
  ❌ 测试覆盖率不达标
  ❌ 测试有 Flaky (不稳定)
  ❌ 没有对错误情况的测试
  ❌ 异步测试写得不对

修复方法:
  npm test                  # 运行所有测试
  npm test -- --coverage    # 生成覆盖率报告
  npm test -- --watch       # 监听模式，开发时使用

覆盖率报告示例:
  -------------|----------|----------|----------|
  File         | % Stmts  | % Branch | % Funcs  |
  -------------|----------|----------|----------|
  auth.js      | 85.2     | 72.4     | 90.0     | ✓ 及格
  utils.js     | 65.3     | 58.9     | 70.0     | ❌ 不足
  -------------|----------|----------|----------|

测试最佳实践:
  1. 为每个函数写测试用例
  2. 测试正常情况和错误情况
  3. 使用有意义的测试名称
  4. 避免重复代码，使用辅助函数
  5. 测试应该独立，不依赖运行顺序

示例测试:
  describe('auth.login', () => {
    // 正常情况
    it('should return token when credentials are correct', async () => {
      const result = await login('user@example.com', 'password');
      expect(result).toHaveProperty('token');
    });
    
    // 错误情况
    it('should throw error when email is invalid', async () => {
      expect(login('invalid-email', 'password'))
        .rejects.toThrow('Invalid email');
    });
    
    // 边界情况
    it('should handle empty password', async () => {
      expect(login('user@example.com', ''))
        .rejects.toThrow('Password is required');
    });
  });
```

### 门禁 4: 代码质量扫描 (SonarQube)

```yaml
工具: SonarQube / CodeClimate

标准:
  ✓ 关键问题 = 0
  ✓ 主要问题 <= 10
  ✓ 代码异味 <= 30
  ✓ 评级 >= B

问题等级定义:
  🔴 Critical (关键): 安全漏洞、逻辑错误 → 必须修复
  🟠 Major (主要): 违反最佳实践、性能问题 → 应该修复
  🟡 Minor (次要): 代码异味、可读性问题 → 建议修复
  🔵 Info (信息): 提示性问题 → 可选修复

常见问题类型:
  - 安全问题: SQL 注入、XSS 攻击、敏感信息泄露
  - 可靠性: 可能的 null 指针、异常处理不足
  - 可维护性: 高复杂度函数、重复代码
  - 性能: 无效的正则、低效的循环

修复方法:
  1. 查看 SonarQube 仪表板，找出问题
  2. 点击问题查看详细说明和修复建议
  3. 修改代码
  4. 提交后 SonarQube 自动重新扫描
  5. 验证问题已解决

配置文件:
  sonar-project.properties  # SonarQube 项目配置

示例问题和修复:

  【问题 1】定义但从未使用的变量
    ❌ const unusedVar = 42;
    ✅ 删除未使用的变量
  
  【问题 2】复杂度过高 (Cognitive Complexity > 15)
    ❌ function checkCondition(a, b, c, d) {
      if (a) { if (b) { if (c) { if (d) { ... } } } }
    }
    ✅ 拆分为多个函数或使用卫语句
    function checkCondition(a, b, c, d) {
      if (!a || !b) return;
      if (!c || !d) return;
      // 逻辑继续
    }
  
  【问题 3】重复代码 (Duplication > 10%)
    ❌ function func1() {
      const x = getValue();
      const y = validate(x);
      return process(y);
    }
    function func2() {
      const x = getValue();
      const y = validate(x);
      return process(y) * 2;
    }
    ✅ 提取公共代码
    function processValue() {
      const x = getValue();
      return validate(x);
    }
    function func1() {
      return process(processValue());
    }
```

### 门禁 5: 依赖安全检查

```yaml
工具: npm audit / Snyk

标准:
  ✓ 没有 Critical (严重) 漏洞
  ✓ 没有 High (高危) 漏洞
  ✓ 可接受的 Medium/Low 漏洞

漏洞等级:
  🔴 Critical (严重): 紧急修复，可能导致远程代码执行
  🟠 High (高危): 在部署前修复，可能导致数据泄露
  🟡 Medium (中等): 应该修复，但不是紧急
  🔵 Low (低): 可选修复

常见原因:
  - 依赖版本过旧
  - 依赖库本身有漏洞
  - 不兼容的依赖版本组合

修复方法:
  npm audit                 # 检查漏洞
  npm audit fix             # 自动修复
  npm audit fix --force     # 强制修复 (可能破坏兼容性)
  npm update                # 更新依赖到最新版本

常见修复步骤:
  1. npm audit 查看漏洞列表
  2. npm audit fix 尝试自动修复
  3. npm test 验证修复后是否有问题
  4. 如自动修复失败，手动更新包版本
  5. 修改代码以适应新版本 API

示例输出:
  # npm audit
  
  30 vulnerabilities found
  
  ├─ Critical: 2
  ├─ High: 5
  ├─ Medium: 15
  └─ Low: 8
  
  Run "npm audit fix" to resolve 25 of them.
  Run "npm audit fix --force" to resolve all of them,
  but this may introduce breaking changes.

配置文件:
  package-lock.json         # 精确的依赖版本记录
  .npmauditignore (可选)    # 忽略已知可接受的漏洞
```

### 门禁 6: 代码审查 (人工)

```yaml
标准:
  ✓ 至少 1 个批准 (Approve)
  ✓ 所有评论问题已解决
  ✓ 没有拒绝 (Request Changes)

审查清单:
  □ 代码逻辑是否正确?
  □ 是否会引入新的 Bug?
  □ 是否符合现有代码风格?
  □ 是否有可读性问题?
  □ 是否有性能问题?
  □ 是否有安全隐患?
  □ 测试是否足够?
  □ 文档是否完整?
  □ 是否需要数据迁移?
  □ 是否涉及配置变更?

评论示例 (好的反馈):
  
  ✅ 建设性反馈:
  "这个函数的循环可以优化。考虑使用 map 而不是 forEach
  以获得更好的性能。可以参考 [链接] 中的最佳实践。"
  
  ❌ 不建设性的反馈:
  "这个代码不好。"
  
  ❌ 太苛刻的反馈:
  "这个变量命名不符合我的偏好。必须改。"

评论时机:
  - 尽快回复，不要让开发者等待超过 4 小时
  - 集中评论，避免多条独立评论
  - 对于风格问题，可以推荐自动化工具 (ESLint)

批准条件:
  ✅ 代码质量可接受
  ✅ 所有自动化检查通过
  ✅ 提出的问题都已解决
  ✅ 充分的测试覆盖
  ✅ 文档和注释清晰

拒绝原因:
  ❌ 重大逻辑错误
  ❌ 安全漏洞
  ❌ 破坏现有功能
  ❌ 测试不足
  ❌ 违反代码规范
```

---

## 📋 合并前检查清单

```yaml
PR 创建后，自动化工具会检查:

【自动检查】(无需人工操作):
  ☑ Linting 检查 (ESLint)
  ☑ TypeScript 编译
  ☑ 单元测试
  ☑ 测试覆盖率
  ☑ 代码质量扫描 (SonarQube)
  ☑ 依赖安全扫描 (npm audit)

【人工审查】(分配给审查者):
  ☑ 代码逻辑审查
  ☑ 业务需求验证
  ☑ 边界情况检查

【合并条件】(全部满足才能合并):
  ✓ 所有自动检查通过 (绿色 ✓)
  ✓ 至少 1 个代码审查批准
  ✓ 没有待解决的评论
  ✓ 分支已更新到最新 (无冲突)

【合并后】(自动触发):
  ✓ 删除本地分支
  ✓ 触发部署流程
  ✓ 更新版本号 (可选)
```

---

## 🔒 关键原则

### 原则 1: 严格执行

不能跳过任何门禁，即使是"小改动"：
- 所有 PR，无论大小，都必须通过全部检查
- 没有 "紧急例外" 或 "快速通道"
- 如有必要，审查时间可加快，但质量标准不降

### 原则 2: 反馈闭环

代码审查的目的不是阻止合并，而是改进代码：
- 如有问题，提供具体建议和示例
- 如开发者不同意，讨论而不是坚持
- 达成共识后才合并

### 原则 3: 持续改进

不定期回顾质量指标：
- 每月检查一次门禁失败率
- 如某个门禁频繁失败，考虑调整规则
- 收集团队反馈，优化流程

---

## 🔧 工具集成

### GitHub 集成

在 GitHub 中设置分支保护规则：

```yaml
Settings → Branches → Protected rules

规则名称: main

必需检查:
  ☑ Require status checks to pass
  ☑ Require branches to be up to date
  
具体检查:
  ☑ Build (GitHub Actions)
  ☑ Test (所有测试)
  ☑ Lint (代码检查)
  ☑ Type Check (TypeScript)
  ☑ SonarQube Quality Gate
  
代码审查:
  ☑ Require pull request reviews
  ☑ Number of reviewers: 1
  ☑ Dismiss stale pull request approvals
  ☑ Require code owner reviews
  
其他:
  ☑ Require conversation resolution
  ☑ Require status checks to pass
  ☑ Do not allow bypassing above settings
```

---

## 📊 门禁状态仪表板

构建一个仪表板监控所有门禁：

```
项目质量门禁仪表板
═════════════════════════════════════════════

门禁项目          | 状态 | 上次检查 | 趋势
─────────────────┼──────┼────────┼─────
Linting          | ✅   | 2m ago | ↗ ↑
TypeScript       | ✅   | 2m ago | → ➡
单元测试         | ✅   | 5m ago | ↗ ↑
覆盖率 (80%)     | ✅   | 5m ago | ↗ ↑
SonarQube        | ⚠️   | 5m ago | ↘ ↓
npm audit        | ✅   | 1m ago | ↗ ↑

总体评分: A (90/100)
═════════════════════════════════════════════
```

---

**文件**: projects/<project>/CI-CD-QUALITY-GATES.md  
**版本**: 1.0  
**最后更新**: 2026-02-11  
**维护者**: DevOps/平台团队
