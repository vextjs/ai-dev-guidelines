# AI 代码写作规范

> **重要**: 这是 AI 写代码时必须遵守的强制规范  
> **版本**: v2.0  
> **最后更新**: 2026-02-12  
> **适用对象**: GitHub Copilot / Claude / GPT 等 AI 代理

---

## 🚨 核心原则

### 0. 先评估再执行（v1.1 新增）

```yaml
原则: 收到任务/问题清单时，先评估有效性，不盲目执行

评估步骤:
  1. 验证问题是否真实存在
  2. 判断问题是否已解决
  3. 评估修复是否必要（收益 vs 成本）
  4. 识别过度设计的建议

评估结果分类:
  ✅ 真正需要处理: 问题存在且有实际价值
  ⚠️ 已解决/部分解决: 验证后发现已处理
  ❌ 不需要处理: 过度设计或收益低于成本

示例:
  问题清单: "缺少增量迭代机制"
  评估: Git 已提供版本追踪，额外机制是过度设计
  结论: ❌ 不处理
```

### 0.1 报告必须验证（v2.0 新增，v2.0.1 增强）⭐

```yaml
原则: 生成分析报告/问题清单前，必须逐项验证

❌ 禁止行为:
  - 基于文件名/目录名"推断"问题存在
  - 未读取文件内容就列出问题
  - 复制之前报告的问题而不重新验证
  - 假设"应该有"某个内容但未确认
  - 只搜索 1-2 处就断言"已修复完毕"（必须全局搜索）
  - 把"路线图待办"和"实际Bug"混为一谈
  - 把"优化建议"当作"问题"报告

✅ 正确做法:
  - 每个问题都要读取实际文件验证
  - 路径/链接类问题必须用 grep_search 全局搜索，不能只查一处
  - 验证后必须按以下 4 类严格分类:
      🔴 Bug: 已验证存在的实际错误（路径错误、版本冲突、链接失效）
      🟡 待办: STATUS.md/路线图中已计划但未完成的项目
      💡 建议: 可做可不做的优化建议
      ❌ 误报: 验证后发现不存在的问题
  - 只有 🔴Bug 类才能列入"需要修复的问题"
  - 不确定的问题标注"待验证"并说明原因

搜索深度要求（v2.0.1 新增）:
  路径引用问题:
    ❌ 错误: grep 到 2 处 outputs/ → 只修 2 处 → 完成
    ✅ 正确: grep_search 全项目 outputs/ → 发现 20+ 处 → 逐一分类 → 全部修复
  版本号问题:
    ❌ 错误: 只看当前文件的版本号
    ✅ 正确: grep_search 全项目相关版本号 → 确认跨文件一致性
  链接失效问题:
    ❌ 错误: 推断路径不存在
    ✅ 正确: list_dir / read_file 实际验证目标文件是否存在

验证流程:
  1. 收集: 初步识别潜在问题
  2. 全局搜索: 用 grep_search 查找所有相关位置（不能只看一处）
  3. 逐一验证: 每处都 read_file 确认实际内容
  4. 严格分类: 按 🔴/🟡/💡/❌ 四类分类
  5. 报告: 分类输出，只有 🔴Bug 标为"需要修复"

输出格式:
  🔴 Bug-1: [描述] - 已验证存在
     位置: [文件:行号]（共 N 处）
     证据: [实际内容摘要]

  🟡 待办-1: [描述] - 路线图已计划
     位置: [STATUS.md 相关行]
     说明: 属于 vX.Y.Z 计划内容

  💡 建议-1: [描述] - 可选优化
     理由: [为什么建议优化]

  ❌ 误报-1: [描述] - 验证后不存在
     原因: [实际情况说明]
```

### 0.2 修复后完整性扫描（v2.0.2 新增）⭐

```yaml
原则: 每次修复完成后，必须执行完整性扫描，防止遗漏同类问题

❌ 反复遗漏的根因（已发生过的教训）:
  - 修了 A 文件的数据，没检查引用 A 的 B、C 文件
  - grep 搜到 2 处就只改 2 处，没搜全项目
  - 改了结构树没检查结构树之外的数据表格
  - 声称"三轮验证通过"但 Round 3 只看修复点没做全局扫描

修复后必须执行的 3 步扫描:

  Step 1 - 同类问题全局扫描:
    修了什么类型的问题 → grep_search 全项目搜索同类
    例: 修了 outputs/ → grep 全项目 outputs/ → 确认零残留
    例: 修了版本号 → grep 全项目相关版本号 → 确认一致
    例: 补了目录 → 对照 list_dir 确认结构树与实际一致

  Step 2 - 数据联动扫描:
    改了 A 文件的数据 → 找出引用该数据的所有文件 → 逐一检查
    数据联动清单（必查）:
      STATUS.md 的数量/百分比 ←→ 实际 list_dir 计数
      README.md 的结构树 ←→ 实际目录结构
      README.md 的工作流表 ←→ workflows/ 实际目录
      QUICK-REFERENCE.md 的约束数 ←→ CONSTRAINTS.md 约束数
      STATUS.md 的版本路线图 ←→ CHANGELOG.md 版本记录
      各文件的预检查格式 ←→ copilot-instructions.md 定义

  Step 3 - 声明前复核:
    在说"全部修复完毕"之前，必须回答:
      □ 是否 grep 了全项目确认零残留？
      □ 是否检查了所有引用修改数据的文件？
      □ 是否对照实际目录验证了所有数量/结构描述？
    如果任一项为"否" → 不得声称修复完毕，继续执行扫描
```

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
