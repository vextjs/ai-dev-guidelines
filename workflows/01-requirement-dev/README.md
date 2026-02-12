# 工作流 1: 需求开发（AI 执行手册）

> **任务类型**: 需求开发
> 
> **适用场景**: 新功能开发、功能增强、第三方集成
> 
> **执行时长**: 预计 30-60 分钟
> 
> **输出文档**: 4 个

---

## 📋 执行概览

```
总流程: 7 个主步骤

1. 生成任务 ID                  [1 分钟]
2. 创建输出目录                  [1 分钟]
3. 收集项目上下文                [5-10 分钟]
4. 生成需求文档                  [10-15 分钟]
5. 生成技术方案文档              [15-20 分钟]
6. 执行代码实现                  [10-20 分钟]
7. 生成实施记录文档              [5-10 分钟]
8. 验证完成度                    [2-3 分钟]
```

---

## 🚀 Step 1: 生成任务 ID

### 目标
为本次需求生成唯一的任务标识符

### 执行步骤
```typescript
// 任务 ID 格式: REQ-<project>-<YYYYMMDD>-<slug>

function generateTaskId(projectName: string, description: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const slug = slugify(description); // 转为 URL 友好格式
  return `REQ-${projectName}-${date}-${slug}`;
}

// 示例
输入: projectName="user", description="集成限流功能"
输出: "REQ-user-20260211-rate-limit"
```

### AI 输出格式
```markdown
任务 ID: REQ-user-20260211-rate-limit
项目名称: user
任务描述: 集成限流功能
输出目录: outputs/user/requirements/REQ-user-20260211-rate-limit/
```

---

## 📁 Step 2: 创建输出目录

### 目标
创建文档输出目录结构

### 需要调用的工具
- `create_directory`

### 执行步骤
```javascript
// 创建目录结构
const taskId = "REQ-user-20260211-rate-limit";
const basePath = `outputs/user/requirements/${taskId}`;

await createDirectory(`${basePath}/scripts`);
```

### 验证
```bash
# 目录结构应该是:
outputs/user/requirements/REQ-user-20260211-rate-limit/
└── scripts/
```

---

## 🔍 Step 3: 收集项目上下文

### 目标
了解项目结构、技术栈、现有代码

### 需要调用的工具
1. `semantic_search` - 搜索相关代码
2. `read_file` - 阅读关键文件
3. `list_dir` - 查看目录结构
4. `grep_search` - 搜索特定模式

### 执行步骤

#### 3.1 确定项目根目录
```javascript
// 方法 1: 从工作区查找
const projectRoot = findProjectRoot("user");

// 方法 2: 询问用户
if (!projectRoot) {
  await askUser("请提供 user 项目的根目录路径");
}
```

#### 3.2 阅读项目基础信息
```javascript
// 必读文件
const filesToRead = [
  `${projectRoot}/package.json`,      // 依赖信息
  `${projectRoot}/README.md`,         // 项目说明
  `${projectRoot}/tsconfig.json`,     // TypeScript 配置
];

for (const file of filesToRead) {
  const content = await readFile(file);
  // 提取关键信息: 技术栈、依赖版本、项目结构
}
```

#### 3.3 搜索相关代码
```javascript
// 如果任务是"集成限流功能"，搜索:
await semanticSearch("middleware rate limit");
await semanticSearch("express middleware");
await grepSearch("app.use");  // 查找中间件注册点
```

#### 3.4 理解现有架构
```javascript
// 阅读入口文件
await readFile(`${projectRoot}/src/index.js`);
await readFile(`${projectRoot}/src/app.js`);

// 查看中间件目录
await listDir(`${projectRoot}/src/middleware`);
```

### 输出内容
AI 应该能回答：
- ✅ 项目使用什么框架？（Express / Koa / Fastify）
- ✅ 项目目录结构是什么？
- ✅ 现有中间件在哪里？
- ✅ 入口文件在哪里？
- ✅ 有哪些相关依赖？

---

## 📝 Step 4: 生成需求文档

### 目标
创建 `01-requirement.md`

### 需要使用的模板
`templates/requirement-template.md`

### 执行步骤

#### 4.1 读取模板
```javascript
const template = await readFile('templates/requirement-template.md');
```

#### 4.2 填充模板
```javascript
const requirementDoc = fillTemplate(template, {
  projectName: "user",
  taskId: "REQ-user-20260211-rate-limit",
  date: "2026-02-11",
  title: "集成限流功能",
  background: "当前系统缺少 API 限流，存在被恶意调用风险",
  goals: [
    "集成 flex-rate-limit 中间件",
    "配置全局和 API 级别限流",
    "添加限流监控指标"
  ],
  // ... 其他字段
});
```

#### 4.3 生成文档
```javascript
await createFile(
  `outputs/user/requirements/REQ-user-20260211-rate-limit/01-requirement.md`,
  requirementDoc
);
```

### 文档要求
- ✅ 章节结构完整（参考模板）
- ✅ 需求描述清晰具体
- ✅ 验收标准可量化
- ✅ 使用表格、列表等结构化格式

---

## 🏗️ Step 5: 生成技术方案文档

### 目标
创建 `02-technical.md`

### 需要使用的模板
`templates/technical-template.md`

### 执行步骤

#### 5.1 设计技术方案
```javascript
// 基于 Step 3 收集的信息，设计方案
const solution = {
  architecture: "中间件模式",
  components: [
    { name: "RateLimitMiddleware", responsibility: "限流逻辑" },
    { name: "RateLimitConfig", responsibility: "配置管理" }
  ],
  integration: {
    where: "src/app.js",
    position: "在路由注册之前"
  },
  dependencies: [
    { name: "flex-rate-limit", version: "^1.0.0" }
  ]
};
```

#### 5.2 填充模板并生成
```javascript
const technicalDoc = fillTemplate(technicalTemplate, solution);
await createFile(
  `outputs/user/requirements/REQ-user-20260211-rate-limit/02-technical.md`,
  technicalDoc
);
```

### 文档要求
- ✅ 包含架构图（ASCII 或文字描述）
- ✅ 列出所有模块和职责
- ✅ 明确集成点和修改点
- ✅ 列出依赖和版本号

---

## 💻 Step 6: 执行代码实现

### 目标
按照技术方案实现代码

### 需要调用的工具
1. `create_file` - 创建新文件
2. `replace_string_in_file` - 修改现有文件
3. `run_in_terminal` - 安装依赖

### 执行步骤

#### 6.1 安装依赖
```javascript
await runInTerminal({
  command: "npm install flex-rate-limit@^1.0.0",
  explanation: "安装限流中间件",
  isBackground: false
});
```

#### 6.2 创建中间件文件
```javascript
const middlewareCode = `
// src/middleware/rate-limit.js
const rateLimit = require('flex-rate-limit');
const config = require('../config/rate-limit.config');

function createRateLimiter(options = {}) {
  return rateLimit({
    windowMs: (options.window || config.global.window) * 1000,
    max: options.limit || config.global.limit,
    message: 'Too many requests',
    standardHeaders: true,
    legacyHeaders: false
  });
}

module.exports = createRateLimiter;
`;

await createFile('src/middleware/rate-limit.js', middlewareCode);
```

#### 6.3 修改入口文件
```javascript
await replaceStringInFile({
  filePath: 'src/app.js',
  oldString: `
const express = require('express');
const app = express();
`,
  newString: `
const express = require('express');
const createRateLimiter = require('./middleware/rate-limit');
const app = express();

// 全局限流
app.use(createRateLimiter());
`
});
```

#### 6.4 创建配置文件
```javascript
const configCode = `
// src/config/rate-limit.config.js
module.exports = {
  global: {
    enabled: true,
    limit: 100,
    window: 60  // 秒
  },
  apis: {
    '/api/login': { limit: 10, window: 60 },
    '/api/register': { limit: 5, window: 300 }
  }
};
`;

await createFile('src/config/rate-limit.config.js', configCode);
```

### 代码要求
- ✅ 代码符合项目风格
- ✅ 包含必要的注释
- ✅ 错误处理完善
- ✅ 配置化设计

---

## 📋 Step 7: 生成实施记录文档

### 目标
创建 `03-implementation.md`

### 需要使用的模板
`templates/implementation-template.md`

### 执行步骤

#### 7.1 记录文件变更
```javascript
const changes = {
  newFiles: [
    "src/middleware/rate-limit.js",
    "src/config/rate-limit.config.js"
  ],
  modifiedFiles: [
    { path: "src/app.js", description: "集成限流中间件" },
    { path: "package.json", description: "新增 flex-rate-limit 依赖" }
  ],
  deletedFiles: []
};
```

#### 7.2 填充模板并生成
```javascript
const implementationDoc = fillTemplate(implementationTemplate, {
  taskId: "REQ-user-20260211-rate-limit",
  changes: changes,
  testPlan: "...",
  rollbackPlan: "..."
});

await createFile(
  `outputs/user/requirements/REQ-user-20260211-rate-limit/03-implementation.md`,
  implementationDoc
);
```

### 文档要求
- ✅ 完整的文件变更清单
- ✅ 代码实现要点说明
- ✅ 测试验证步骤
- ✅ 回滚方案

---

## ✅ Step 8: 验证完成度

### 目标
确认任务完整完成

### 验证清单

#### 文档完整性
- [ ] `01-requirement.md` 已生成
- [ ] `02-technical.md` 已生成
- [ ] `03-implementation.md` 已生成
- [ ] 所有文档基于模板生成
- [ ] 所有章节都已填充

#### 代码完整性
- [ ] 所有新文件已创建
- [ ] 所有修改已完成
- [ ] 依赖已安装
- [ ] 代码可以编译/运行

#### 功能验证
- [ ] 启动项目无报错
- [ ] 限流功能正常工作
- [ ] 测试用例通过

### 如果验证失败
```javascript
if (验证失败) {
  // 1. 记录错误
  const errors = collectErrors();
  
  // 2. 尝试修复
  await fixErrors(errors);
  
  // 3. 重新验证
  await validate();
  
  // 4. 如果仍然失败，报告给用户
  if (stillFailed) {
    reportToUser("验证失败，请检查以下问题：", errors);
  }
}
```

---

## 📊 最终报告格式

AI 完成所有步骤后，应该向用户报告：

```markdown
✅ 需求开发任务完成

**任务信息**:
- 任务 ID: REQ-user-20260211-rate-limit
- 项目: user
- 描述: 集成限流功能

**已生成文档** (3 个):
1. ✅ 需求文档: outputs/user/requirements/REQ-user-20260211-rate-limit/01-requirement.md
2. ✅ 技术方案: outputs/user/requirements/REQ-user-20260211-rate-limit/02-technical.md
3. ✅ 实施记录: outputs/user/requirements/REQ-user-20260211-rate-limit/03-implementation.md

**代码变更**:
- 新增文件: 2 个
  - src/middleware/rate-limit.js
  - src/config/rate-limit.config.js
- 修改文件: 2 个
  - src/app.js（集成中间件）
  - package.json（添加依赖）

**下一步建议**:
1. 运行测试: npm test
2. 启动服务验证: npm start
3. 测试限流功能: curl http://localhost:3000/api/test
```

---

## ⚠️ 常见问题处理

### 问题 1: 项目目录找不到
```
解决: 询问用户提供完整路径
AI: "我在工作区中没有找到 user 项目，请提供项目的完整路径。"
```

### 问题 2: 依赖安装失败
```
解决: 检查 package.json 和网络，报告详细错误
AI: "依赖安装失败，错误信息：[错误详情]。请检查网络连接或 package.json 配置。"
```

### 问题 3: 代码冲突
```
解决: 报告冲突位置，询问用户如何处理
AI: "检测到 src/app.js 中已存在限流中间件配置，请问是：
  1. 替换现有配置
  2. 保留现有配置
  3. 合并两者"
```

---

**完成标志**: 所有验证通过 ✅  
**下一个工作流**: 无（需求开发完成）
