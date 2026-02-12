# 测试规范

> AI 生成测试代码时必须遵守的标准

---

## 📌 文档定位

```yaml
本文档 (test-standards.md):
  定位: 通用测试原则和规范
  内容: 覆盖率要求、命名规范、分层策略、断言规范
  适用: 所有项目通用

项目级 TESTING.md:
  定位: 项目特定的测试配置
  内容: 框架配置、CI 集成、mock 策略、环境配置
  位置: projects/_template/TESTING.md 或各项目目录

关系: 本规范 < 项目 TESTING.md（项目配置优先）
```

---

## 📋 测试类型

| 类型 | 说明 | 覆盖目标 |
|-----|------|---------|
| 单元测试 | 测试单个函数/方法 | >= 80% |
| 集成测试 | 测试模块间交互 | 关键路径 |
| API 测试 | 测试接口响应 | 所有端点 |

---

## 🔧 测试框架

```yaml
推荐框架:
  - Jest (默认)
  - Vitest (Vite 项目)
  - Mocha + Chai (传统项目)

断言库:
  - Jest 内置
  - Chai
  - expect
```

---

## 📝 测试用例规范

### 命名规范

```yaml
文件命名:
  - *.test.ts  - 单元测试
  - *.spec.ts  - 集成测试
  - *.e2e.ts   - 端到端测试

用例命名:
  格式: should [期望行为] when [条件]
  
示例:
  ✅ 'should return user when id is valid'
  ✅ 'should throw NotFoundError when user not exist'
  ❌ 'test user function'
```

### 测试结构

```javascript
describe('UserService', () => {
  // 测试准备
  beforeEach(() => {
    // 初始化
  });

  afterEach(() => {
    // 清理
  });

  describe('getUserById', () => {
    it('should return user when id is valid', async () => {
      // Arrange
      const userId = '123';
      
      // Act
      const result = await userService.getUserById(userId);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(userId);
    });

    it('should throw NotFoundError when user not exist', async () => {
      // Arrange
      const userId = 'invalid';
      
      // Act & Assert
      await expect(userService.getUserById(userId))
        .rejects.toThrow(NotFoundError);
    });
  });
});
```

---

## ✅ 必须测试的场景

### 正常路径

```yaml
必测:
  - 正常输入正常输出
  - 典型使用场景
```

### 边界情况

```yaml
必测:
  - null/undefined 输入
  - 空字符串/空数组/空对象
  - 极值（最大/最小）
  - 负数（当期望正数时）
  - 超长字符串（如 10000 字符）
  - 特殊字符（如 <script>, ', ", \, null byte）
  - 数组越界（如 arr[-1], arr[length]）
  - 重复值/重复操作

示例:
  describe('边界情况测试', () => {
    it('should handle null input', () => {
      expect(getFirstItem(null)).toBeNull();
    });
    
    it('should handle empty array', () => {
      expect(getFirstItem([])).toBeNull();
    });
    
    it('should handle undefined', () => {
      expect(getFirstItem(undefined)).toBeNull();
    });
    
    it('should handle empty string', () => {
      expect(validateEmail('')).toBe(false);
    });
    
    it('should handle max integer', () => {
      expect(calculateSum(Number.MAX_SAFE_INTEGER, 1))
        .toThrow('Overflow');
    });
    
    it('should handle very long string', () => {
      const longStr = 'a'.repeat(10000);
      expect(validateInput(longStr)).toBe(false);
    });
    
    it('should handle special characters', () => {
      expect(sanitizeHTML('<script>alert("xss")</script>'))
        .not.toContain('<script>');
    });
  });
```

### 错误处理

```yaml
必测:
  - 异常抛出
  - 错误类型
  - 错误消息
```

---

## 🎭 Mock 规范

### Mock 对象创建

```yaml
原则:
  - 只 Mock 外部依赖（数据库、API、文件系统）
  - 不 Mock 业务逻辑
  - Mock 应该尽可能真实

工具:
  - Jest: jest.mock(), jest.fn()
  - Sinon: sinon.stub(), sinon.spy()
  - MSW: Mock Service Worker（API Mock）
```

### Mock 数据库

```typescript
// 使用内存数据库或 Mock
import { MongoMemoryServer } from 'mongodb-memory-server';

describe('UserService', () => {
  let mongoServer: MongoMemoryServer;
  
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });
  
  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });
  
  it('should create user', async () => {
    const user = await userService.create({ name: 'Test' });
    expect(user).toBeDefined();
  });
});
```

### Mock 外部 API

```typescript
// 使用 MSW Mock HTTP 请求
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('https://api.example.com/users/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        id: req.params.id,
        name: 'John Doe',
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

it('should fetch user from API', async () => {
  const user = await fetchUser('123');
  expect(user.name).toBe('John Doe');
});
```

### Mock 函数

```typescript
// Jest Mock 函数
const mockCallback = jest.fn();

it('should call callback', () => {
  processData([1, 2, 3], mockCallback);
  
  expect(mockCallback).toHaveBeenCalledTimes(3);
  expect(mockCallback).toHaveBeenCalledWith(1);
});

// Mock 模块
jest.mock('./user-service', () => ({
  getUserById: jest.fn().mockResolvedValue({
    id: '123',
    name: 'Test User',
  }),
}));
```

---

## 📊 测试覆盖率要求

### 覆盖率目标

| 类型 | 最低要求 | 建议目标 | 优秀水平 |
|-----|---------|---------|---------|
| 行覆盖 (Lines) | 70% | 85% | 90%+ |
| 分支覆盖 (Branches) | 60% | 80% | 85%+ |
| 函数覆盖 (Functions) | 80% | 90% | 95%+ |
| 语句覆盖 (Statements) | 70% | 85% | 90%+ |

### 不同模块的覆盖率要求

```yaml
核心业务逻辑: >= 90%
  - 支付流程
  - 认证授权
  - 数据处理

一般功能: >= 80%
  - CRUD 操作
  - 工具函数
  - 中间件

UI 组件: >= 70%
  - 展示组件
  - 容器组件

配置文件: 不要求
  - 配置文件
  - 常量定义
```

### 覆盖率配置

```json
// jest.config.js
module.exports = {
  collectCoverageFrom: [
    'src/**/*.{js,ts}',
    '!src/**/*.d.ts',
    '!src/**/*.test.ts',
    '!src/config/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 90,
      lines: 85,
      statements: 85,
    },
    './src/core/': {
      branches: 90,
      functions: 95,
      lines: 90,
      statements: 90,
    },
  },
};
```

### 覆盖率报告

```bash
# 生成覆盖率报告
npm test -- --coverage

# 查看详细报告
open coverage/lcov-report/index.html

# CI 中检查覆盖率
npm test -- --coverage --coverageReporters=text-summary
```

---

## 🔄 CI/CD 集成

### GitHub Actions 配置

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test -- --coverage
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
      
      - name: Check coverage threshold
        run: |
          npm test -- --coverage --coverageReporters=text-summary | tee coverage.txt
          if grep -q "All files.*[0-9]\{1,2\}\.[0-9]\+" coverage.txt; then
            echo "Coverage is below threshold"
            exit 1
          fi
```

### 测试环境隔离

```yaml
原则:
  - 测试使用独立的测试数据库
  - 测试环境变量与生产隔离
  - 每个测试独立，不依赖执行顺序

环境变量:
  # .env.test
  NODE_ENV=test
  MONGODB_URI=mongodb://localhost:27017/test
  REDIS_URL=redis://localhost:6379/1

配置加载:
  // jest.config.js
  module.exports = {
    setupFiles: ['<rootDir>/test/setup.ts'],
  };
  
  // test/setup.ts
  import dotenv from 'dotenv';
  dotenv.config({ path: '.env.test' });
```

### 测试分层运行

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --testPathPattern=\\.unit\\.test\\.ts$",
    "test:integration": "jest --testPathPattern=\\.integration\\.test\\.ts$",
    "test:e2e": "jest --testPathPattern=\\.e2e\\.test\\.ts$",
    "test:watch": "jest --watch",
    "test:ci": "jest --ci --coverage --maxWorkers=2"
  }
}
```

---

## 📊 覆盖率要求

| 类型 | 最低要求 | 建议目标 |
|-----|---------|---------|
| 行覆盖 | 70% | 85% |
| 分支覆盖 | 60% | 80% |
| 函数覆盖 | 80% | 90% |

---

## 📎 相关文档

- [代码规范](./code-standards.md)
- [三轮验证](../best-practices/validation/README.md)

---

**最后更新**: 2026-02-12

