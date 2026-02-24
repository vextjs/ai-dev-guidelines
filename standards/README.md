# 开发规范索引

> AI 生成代码时必须遵守的各类规范

---

## 📂 规范目录

| 规范文件 | 说明 | 适用场景 | 可被项目覆盖 |
|---------|------|---------|-------------|
| [code-standards.md](./code-standards.md) | 代码规范 | 所有代码生成 | ✅ 可覆盖 |
| [test-standards.md](./test-standards.md) | 测试规范 | 测试用例生成 | ✅ 可覆盖 |
| [doc-standards.md](./doc-standards.md) | 文档规范 | 文档生成 | ✅ 可覆盖 |
| [api-standards.md](./api-standards.md) | API 规范 | API 开发 | ✅ 可覆盖 |
| [script-standards.md](./script-standards.md) | 脚本规范 | 脚本开发 | ✅ 可覆盖 |
| [security-standards.md](./security-standards.md) | 安全规范 | 所有代码 | ❌ 不可覆盖 |
| [config-standards.md](./config-standards.md) | 配置规范 | 配置管理 | ✅ 可覆盖 |
| [tool-standards.md](./tool-standards.md) | 工具规范 | AI 工具调用 | ❌ 不可覆盖 |
| [git-standards.md](./git-standards.md) | Git 规范 | 版本控制操作 | ✅ 可覆盖 |

---

## 🎯 规范优先级

```yaml
优先级（从高到低）:
  1. 项目规范 (projects/<project>/profile/)
     - 最高优先级，项目特定约束（入口: profile/README.md）
     - 只能覆盖"可覆盖"的规范
  
  2. 通用规范 (standards/)
     - 项目规范未定义时使用
  
  3. 行业最佳实践
     - 以上都未定义时参考

冲突处理规则:
  - 项目规范优先于通用规范（仅限可覆盖项）
  - 安全规范和工具规范不可被项目覆盖
  - 遇到冲突时，以更严格的规范为准
```

### 覆盖规则说明

```yaml
✅ 可覆盖:
  - 命名规范（驼峰/下划线）
  - 缩进风格（2空格/4空格）
  - 测试框架选择
  - API 返回格式
  - 文档格式偏好

❌ 不可覆盖:
  - 敏感信息处理（必须环境变量）
  - 错误处理要求（必须有 try-catch）
  - 工具权限边界（禁止访问 .env）
  - Git 操作限制（commit 需确认）
```

---

## 📋 规范加载时机

### 预检查阶段

```yaml
必须加载:
  1. 项目规范（如存在）
     - projects/<project>/profile/README.md（规范入口）
     - projects/<project>/profile/01-项目信息.md（技术栈）
     - projects/<project>/profile/03-代码风格.md（代码标准）
  
  2. 通用代码规范
     - standards/code-standards.md
```

### 代码生成阶段

```yaml
根据任务类型加载:
  API 开发: api-standards.md
  脚本开发: script-standards.md
  测试生成: test-standards.md
  文档生成: doc-standards.md
  
  所有代码: security-standards.md
```

---

## 🔧 AI 使用指南

### 如何应用规范

```yaml
步骤 1: 加载规范
  - 读取项目规范
  - 读取相关通用规范

步骤 2: 生成代码
  - 遵守命名规范
  - 遵守格式规范
  - 遵守安全规范

步骤 3: 验证代码
  - 第二轮验证检查代码规范
  - 不符合规范自动修复
```

### 规范检查示例

```javascript
// 检查是否符合命名规范
function validateNaming(code) {
  // 变量：camelCase
  // 常量：UPPER_SNAKE_CASE
  // 类：PascalCase
  // 函数：camelCase
}

// 检查是否符合错误处理规范
function validateErrorHandling(code) {
  // async 函数必须有 try-catch
  // Promise 必须有 .catch()
}
```

---

## 📎 相关文档

- [三轮验证](../best-practices/validation/README.md)
- [自动修复](../best-practices/validation/auto-fix.md)
- [禁止项清单](../CONSTRAINTS.md)

---

**最后更新**: 2026-02-12

