# 项目规范 - TESTING.md 模板

> **用途**: 定义项目的测试规范  
> **所属**: projects/<project-name>/TESTING.md  
> **维护**: 项目技术负责人  
> **最后更新**: 2026-02-12

---

## 📌 文档定位

```yaml
本文档 (项目 TESTING.md):
  定位: 项目特定的测试配置
  内容: 框架配置、CI 集成、mock 策略、环境配置
  优先级: 高（覆盖通用规范）

通用测试规范:
  位置: standards/test-standards.md
  内容: 覆盖率要求、命名规范、分层策略
  优先级: 低（作为基础规范）

使用方式:
  1. 首先遵守 standards/test-standards.md 的通用原则
  2. 然后按本文档配置项目特定的测试环境
  3. 项目配置优先于通用规范
```

---

## 📋 测试框架和工具

### 单元测试
```yaml
框架: Jest (或 Vitest)
语言: TypeScript
配置文件: jest.config.js

安装:
  npm install --save-dev jest @types/jest ts-jest

配置示例:
  {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "roots": ["<rootDir>/src"],
    "testMatch": ["**/__tests__/**/*.ts", "**/?(*.)+(spec|test).ts"]
  }
```

### 集成测试
```yaml
框架: Jest (与单元测试同框架)
特点: 涉及多个模块的测试

目录结构:
  src/
    ├── __tests__/
    │   ├── unit/          # 单元测试
    │   │   └── user.test.ts
    │   └── integration/   # 集成测试
    │       └── auth-flow.test.ts
```

### E2E 测试 (如有)
```yaml
框架: Playwright / Cypress (根据项目需要)
用于: 完整用户流程测试

安装 Playwright:
  npm install --save-dev @playwright/test
```

---

## 📊 测试覆盖率要求

### 覆盖率标准 🎯

```yaml
整体目标: >= 80%

按类型分解:
  - 语句覆盖 (Statement): >= 80%
  - 分支覆盖 (Branch): >= 75%
  - 函数覆盖 (Function): >= 80%
  - 行覆盖 (Line): >= 80%

关键模块: >= 90%
  - 认证/授权 模块
  - 数据处理 模块
  - 核心业务 逻辑

可以容许 < 70% 的模块:
  - 工具函数
  - 配置文件
  - 类型定义

❌ 不允许 < 50% 的代码

如何检查覆盖率:
  npm test -- --coverage
```

### 覆盖率报告

```yaml
输出格式: HTML

生成:
  npm test -- --coverage

查看:
  open coverage/index.html

记录位置:
  outputs/<project>/<task-id>/reports/coverage-report.md
```

---

## 🎯 测试命名规范

### 单元测试文件

```typescript
// ✅ 正确
src/__tests__/user.test.ts
src/__tests__/auth.test.ts
src/__tests__/middleware.test.ts

// ❌ 不使用
src/__tests__/userTest.ts
test/user.js
```

### 测试用例命名

```typescript
// ✅ 使用 describe + test，清晰的嵌套结构
describe('User Module', () => {
  describe('getUserById', () => {
    test('should return user when exists', () => {
      // ...
    })
    
    test('should throw error when not found', () => {
      // ...
    })
  })
})

// ✅ 使用 BDD 风格
describe('Authentication', () => {
  it('should authenticate user with correct password', () => {
    // ...
  })
  
  it('should reject user with incorrect password', () => {
    // ...
  })
})

// ❌ 避免
test('test1', () => {})
test('verify', () => {})
```

### 测试结构

```typescript
describe('Module', () => {
  // 测试前设置
  beforeEach(() => {
    // 初始化
  })
  
  // 测试后清理
  afterEach(() => {
    // 清理
  })
  
  // 具体测试
  test('should...', () => {
    // Arrange: 准备数据
    const input = { ... }
    
    // Act: 执行操作
    const result = functionUnderTest(input)
    
    // Assert: 验证结果
    expect(result).toBe(expectedValue)
  })
})
```

---

## 🔍 测试最佳实践

### 1. 单元测试原则

```typescript
// ✅ 好：单职责，容易理解
test('getUserById returns user data', () => {
  const user = getUserById(123)
  expect(user.id).toBe(123)
})

// ❌ 坏：测试多个东西
test('user operations work', () => {
  const user = getUserById(123)
  expect(user).toBeDefined()
  updateUser(user)
  expect(user.updated).toBe(true)
  deleteUser(user)
  expect(getUserById(123)).toBeUndefined()
  // 太多断言
})
```

### 2. Mock 和 Stub

```typescript
// ✅ 使用 jest.mock() 模拟依赖
jest.mock('../database')

// ✅ 模拟第三方 API
jest.mock('axios')
axios.get.mockResolvedValue({ data: { ... } })

// ✅ 恢复 mock
afterEach(() => {
  jest.clearAllMocks()
})
```

### 3. 异步测试

```typescript
// ✅ 使用 async/await
test('should fetch user data', async () => {
  const user = await fetchUser(123)
  expect(user.id).toBe(123)
})

// ✅ 或使用 done 回调
test('should fetch user data', (done) => {
  fetchUser(123).then(user => {
    expect(user.id).toBe(123)
    done()
  })
})

// ❌ 不要遗漏异步
test('should fetch user data', () => {
  fetchUser(123).then(user => {
    expect(user.id).toBe(123)
  })
  // 测试立即完成，断言可能不会执行
})
```

### 4. 快照测试 (谨慎使用)

```typescript
// ✅ 用于 UI 组件
test('renders user profile', () => {
  const component = render(<UserProfile user={user} />)
  expect(component).toMatchSnapshot()
})

// ⚠️ 注意：快照测试容易被忽视
// 应该定期审查快照变更，不要盲目更新
```

---

## 🚀 运行测试

### 开发阶段

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test -- user.test.ts

# 监视模式（文件变更时自动运行）
npm test -- --watch

# 显示覆盖率
npm test -- --coverage
```

### CI/CD 阶段

```bash
# 运行测试并生成覆盖率报告
npm test -- --coverage --ci

# 检查覆盖率是否符合要求
npm test -- --coverage --coverageThreshold='{
  "global": {
    "statements": 80,
    "branches": 75,
    "functions": 80,
    "lines": 80
  }
}'
```

### 性能测试 (如需要)

```bash
# 运行性能测试
npm run test:performance

# 生成性能报告
npm run test:performance -- --report=outputs/reports/perf.json
```

---

## ✅ 提交前检查清单

在提交代码前，应该运行：

```yaml
□ 运行所有单元测试
  npm test
  
□ 检查代码覆盖率 >= 80%
  npm test -- --coverage
  
□ 运行集成测试
  npm test -- integration/
  
□ 检查 linting
  npm run lint
  
□ 检查类型
  npm run type-check

□ 查看覆盖率报告
  open coverage/index.html
  确保所有核心功能都有测试覆盖
```

---

## 📝 测试文档

### 每个 PR 应该包含

```yaml
测试覆盖情况:
  - 添加了多少新测试
  - 覆盖率变化 (例: 82% → 85%)
  - 关键路径是否都有测试

测试结果:
  - 所有测试通过 ✅
  - 没有新的警告或错误

性能影响:
  - 代码变更是否有性能影响
  - 新增的测试运行时间
```

### 记录位置

```
outputs/<project>/<task-id>/reports/
  └── coverage-report.md (记录测试覆盖率)
```

---

## 🔗 相关文档

- [CI-CD-QUALITY-GATES.md](./CI-CD-QUALITY-GATES.md) - 持续集成质量门禁
- [CODE-STANDARDS.md](./CODE-STANDARDS.md) - 代码规范
- [PROJECT.md](./PROJECT.md) - 项目规范

---

**文件**: projects/<project>/TESTING.md  
**版本**: 1.1  
**最后更新**: 2026-02-12  
**维护者**: 项目技术负责人
