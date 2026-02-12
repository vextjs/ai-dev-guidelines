# 测试规范

> AI 生成测试代码时必须遵守的标准

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
  - 空字符串/空数组
  - 极值（最大/最小）
  - 负数（当期望正数时）
```

### 错误处理

```yaml
必测:
  - 异常抛出
  - 错误类型
  - 错误消息
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

