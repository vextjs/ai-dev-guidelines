# AI 代码写作规范

> **重要**: 这是 AI 写代码时必须遵守的强制规范  
> **版本**: v1.0  
> **最后更新**: 2026-02-11  
> **适用对象**: GitHub Copilot / Claude / GPT 等 AI 代理

---

## 🚨 核心原则

### 1. 禁止盲目猜测

```
❌ 绝对禁止:
  - 看代码"猜测"函数的行为
  - 根据"经验"假设 API 的返回格式
  - 不查实际代码就"推断"依赖库的用法
  - 看一个文件就"想象"整个模块的架构

✅ 正确做法:
  - 不确定就先读代码
  - 看实际的 API 文档
  - 运行测试验证假设
  - 查看完整的上下文
```

### 2. 验证优先原则

```
执行顺序:

1️⃣ 收集信息 (必须)
   ├─ 读取相关源代码
   ├─ 查看单元测试（学习用法）
   ├─ 检查错误处理方式
   └─ 了解依赖库版本

2️⃣ 分析理解 (必须)
   ├─ 理解现有代码的逻辑
   ├─ 识别代码的约定和模式
   ├─ 确认 API 的参数和返回值
   └─ 理解错误处理策略

3️⃣ 提出假设 (可选)
   ├─ 基于代码分析提出假设
   ├─ 明确列出假设
   └─ 准备验证方案

4️⃣ 验证假设 (必须)
   ├─ 通过测试验证
   ├─ 通过代码审查验证
   ├─ 通过运行时验证
   └─ 不确定就再次读代码

5️⃣ 生成代码 (最后)
   └─ 基于已验证的理解写代码
```

### 3. 不确定时的处理

```
if (不确定) {
  // ✅ 正确处理:
  1. 停止当前工作
  2. 读取相关代码或文档
  3. 编写测试来验证
  4. 和用户讨论确认
  5. 记录解决过程
  
  // ❌ 绝对不要:
  1. 继续"猜测"
  2. 写代码测试猜测 (浪费时间)
  3. 用注释记录"可能"的方案
  4. 提交"可能有效"的代码
  5. 等用户报 bug 再修
}
```

---

## 实际应用规范

### 场景 1: 使用不熟悉的库

```
❌ 错误方式:

// 看了 README，我觉得应该这样用
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379
});

client.set('key', 'value');  // 猜测这样调用

---

✅ 正确方式:

// Step 1: 阅读库的实际代码和文档
// 查看: node_modules/redis/README.md 和 examples/
// 查看: 单元测试了解实际用法

// Step 2: 检查实际的 API
const redis = require('redis');
const client = redis.createClient({
  host: 'localhost',
  port: 6379
});

// Step 3: 参考现有代码中的用法
// 在项目中搜索 client.set / client.get 的实际用法
// 了解是否使用 callback 还是 Promise

// Step 4: 编写测试验证
client.set('testKey', 'testValue', (err) => {
  if (err) console.error('Set failed:', err);
  client.get('testKey', (err, value) => {
    console.assert(value === 'testValue', 'Get/Set mismatch');
  });
});

// Step 5: 提交代码（确认无误后）
```

### 场景 2: 修改复杂的现有函数

```
❌ 错误方式:

// 看起来这个函数做 A，我只需要加 B 功能
function processUser(user) {
  // 原有代码
  return user;
}

// 我加个新逻辑吧
function processUser(user) {
  // 原有代码
  validateUser(user);  // 我觉得应该加这个
  return user;
}

// 糟糕，测试失败了

---

✅ 正确方式:

// Step 1: 理解现有函数
// - 读完整个 processUser 函数
// - 查看所有调用这个函数的地方（至少 5 个）
// - 阅读相关的单元测试
// - 理解 validateUser 的副作用

// Step 2: 识别修改点
// - 确认哪些地方需要改动
// - 评估修改的影响范围
// - 检查是否有隐藏的依赖

// Step 3: 提出明确的修改方案
// - 在代码注释中写下修改方案
// - 列出所有会受影响的函数
// - 列出需要更新的测试用例

// Step 4: 更新代码和测试
// - 先更新单元测试
// - 再更新函数实现
// - 验证所有相关测试通过

// Step 5: Code review
// - 让人工代码审查确认逻辑正确
```

### 场景 3: 处理异步代码

```
❌ 错误方式:

// 我觉得这里应该用 async/await
async function getUser(id) {
  const user = await User.findById(id);  // 猜测这个方法存在
  const posts = await Post.find({ userId: id });  // 猜测返回数组
  return { user, posts };  // 猜测这样组合就行
}

---

✅ 正确方式:

// Step 1: 检查 User 模型的实际 API
// 打开 models/User.js
// 查看: findById 是否存在
// 查看: findById 返回 Promise 还是其他
// 查看: findById 没找到时返回 null 还是抛错

// Step 2: 检查 Post 模型的 API
// 同上，确认 Post.find 的行为

// Step 3: 查看错误处理
// 在项目中搜索其他异步函数的错误处理方式
// 确认团队的约定（try-catch? Promise.catch?）

// Step 4: 编写完整的实现
async function getUser(id) {
  if (!id) {
    throw new Error('User ID is required');
  }
  
  const user = await User.findById(id);
  if (!user) {
    throw new Error('User not found');
  }
  
  const posts = await Post.find({ userId: id });
  
  return { user, posts };
}

// Step 5: 编写测试
describe('getUser', () => {
  it('should return user with posts', async () => {
    const user = await getUser(validId);
    expect(user.user).toBeDefined();
    expect(Array.isArray(user.posts)).toBe(true);
  });
  
  it('should throw if user not found', async () => {
    expect(getUser(invalidId)).rejects.toThrow('User not found');
  });
});
```

### 场景 4: API 集成

```
❌ 错误方式:

// 看了 API 文档，应该这样调用
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  body: JSON.stringify(user)  // 猜测应该是 JSON.stringify
});

const data = await response.json();  // 猜测一定有 json() 方法
return data.users[0];  // 猜测返回格式

---

✅ 正确方式:

// Step 1: 阅读实际的 API 文档或 OpenAPI schema
// 检查: Content-Type header 是否必需
// 检查: 请求体的具体格式
// 检查: 响应的实际结构
// 检查: 错误情况下的返回格式

// Step 2: 查看项目中现有的 API 调用
// 搜索其他 fetch 调用的方式
// 了解项目的约定
// 了解是否使用了 HTTP 客户端库 (axios, got, etc.)

// Step 3: 查看错误处理
// 项目如何处理网络错误
// 项目如何处理 API 错误响应
// 项目如何处理 timeout

// Step 4: 编写完整的实现
const response = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(user)
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(`API Error: ${error.message}`);
}

const data = await response.json();

// 验证响应格式
if (!data.users || !Array.isArray(data.users)) {
  throw new Error('Unexpected API response format');
}

return data.users[0];

// Step 5: 编写测试，包括错误情况
describe('API integration', () => {
  it('should create user successfully', async () => {
    // Mock API 响应
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ users: [{ id: 1, name: 'Test' }] })
    });
    
    const result = await createUser(testData);
    expect(result.id).toBe(1);
  });
  
  it('should handle API errors', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: 'Invalid input' })
    });
    
    expect(createUser(badData)).rejects.toThrow('API Error');
  });
});
```

---

## 代码审查清单

在生成代码前，AI 应该自我检查：

```
□ 我是否读过相关的源代码？
  - 不是就先读
  - 读不懂就再读一遍
  - 读完还不懂就和用户确认

□ 我是否了解所有依赖的 API？
  - 函数签名确认吗？
  - 返回值类型确认吗？
  - 错误情况确认吗？

□ 我是否验证过我的假设？
  - 编写了测试吗？
  - 测试通过了吗？
  - 异常情况也覆盖了吗？

□ 我是否遵循了项目约定？
  - 代码风格一致吗？
  - 错误处理方式一致吗？
  - 命名规范一致吗？

□ 我是否考虑了边界情况？
  - null/undefined 检查了吗？
  - 空数组/对象检查了吗？
  - 类型检查了吗？
  - 权限检查了吗？

□ 我的代码是否可读和可维护？
  - 有注释解释复杂逻辑吗？
  - 函数是否太长了？
  - 变量名是否清晰？
  - 是否有重复代码？

如果任何一项是 "否"，回到 Step 1：收集更多信息
```

---

## 常见陷阱和解决方案

### 陷阱 1: 依赖库版本不同

```
❌ 问题:
  我看 lodash 的文档，应该这样用
  const users = _.map(data.users, 'name');
  
  但项目用的是 lodash 3.x，API 不同

✅ 解决:
  1. 检查 package.json 的 lodash 版本
  2. 查看项目中现有的 lodash 用法
  3. 在对应版本的文档中查找
  4. 使用项目中相同的模式
```

### 陷阱 2: 不同环境的行为差异

```
❌ 问题:
  在本地 Node.js 环境运行的代码
  在浏览器环境可能崩溃

✅ 解决:
  1. 检查是否有 Node.js 特定的代码
  2. 检查是否有浏览器特定的代码
  3. 确认运行环境
  4. 测试在目标环境中
```

### 陷阱 3: 隐藏的副作用

```
❌ 问题:
  function processUser(user) {
    // 看起来是纯函数
    user.processed = true;  // 但实际修改了输入对象（副作用）
    return user;
  }

✅ 解决:
  1. 查看函数是否修改了输入参数
  2. 查看函数是否访问了全局状态
  3. 查看函数是否有网络/文件 I/O
  4. 评估这些副作用的影响
  5. 在注释中明确说明
```

---

## 向用户报告不确定性

当 AI 遇到真正的不确定时，应该这样处理：

```markdown
❌ 错误方式:

我现在会为你写这个函数...
[生成可能有错的代码]
这应该能用，如果有问题告诉我

---

✅ 正确方式:

我在生成代码前发现以下不确定之处：

1. 📌 **不确定点 1**: 函数 User.findById() 的行为
   - 没找到用户时：返回 null 还是抛异常？
   - 我需要查看 User 模型的代码确认

2. 📌 **不确定点 2**: 项目的错误处理约定
   - 使用 try-catch 还是 Promise.catch？
   - 我需要查看现有代码中的模式

**我的行动计划:**
- [ ] 读 User 模型的代码
- [ ] 查看现有的异步函数实现
- [ ] 编写单元测试验证逻辑
- [ ] 提交代码供审查

**预计还需 15 分钟来解决这些不确定性**

你想我继续吗？或者你能帮我确认这些点？
```

---

## 检查清单总结

| 任务 | 是否完成 | 说明 |
|------|---------|------|
| 阅读相关代码 | ☐ | 不能跳过 |
| 理解现有模式 | ☐ | 要和项目风格一致 |
| 验证 API 行为 | ☐ | 通过测试验证，不要猜测 |
| 处理错误情况 | ☐ | 包括 null/undefined/异常 |
| 编写测试 | ☐ | 测试通过了再提交 |
| Code review 准备 | ☐ | 添加清晰的注释 |
| 自我检查 | ☐ | 回答上面的 6 个问题 |

**如果任何一项是 ☐，不要提交代码**

---

## 参考资源

- [项目 README](../README.md) - 项目概况
- [code-standards.md](../standards/code-standards.md) - 代码规范
- [test-standards.md](../standards/test-standards.md) - 测试规范
- [TESTING.md](../projects/_template/TESTING.md) - 测试配置模板

---

**最后更新**: 2026-02-12  
**维护者**: AI 规范委员会  
**违规举报**: 看到 AI 盲目猜测，请和用户沟通确认
