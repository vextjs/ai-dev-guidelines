# AI 工具使用手册

> AI 执行开发任务时可用的工具和使用指南

---

## 📚 目录

- [VS Code 工具](#vscode-工具)
- [文件操作](#文件操作)
- [代码搜索](#代码搜索)
- [Git 操作](#git-操作)
- [终端命令](#终端命令)
- [验证工具](#验证工具)
- [本地脚本工具](#本地脚本工具)

---

## 🛠️ 本地脚本工具

本目录提供的可执行脚本：

| 脚本 | 用途 | 使用方法 |
|-----|------|---------|
| `validate-links.js` | 检查文档链接有效性 | `node validate-links.js` |
| `validate-structure.js` | 检查目录结构规范 | `node validate-structure.js` |
| `doc-health-check.js` | 文档健康检查（综合） | `node doc-health-check.js [目录]` |

### doc-health-check.js

**功能**：
- 检查必要文件存在性
- 检查各目录 README.md
- 检查版本号一致性
- 检查空链接和格式问题

**使用示例**：
```bash
cd ai-dev-guidelines
node tools/doc-health-check.js .
```

---

## 🔧 VS Code 工具

### 1. 读取文件
```typescript
// 工具: read_file
// 用途: 读取文件内容（支持行范围）

// 示例: 读取完整文件
await read_file({
  filePath: '/path/to/file.ts',
  startLine: 1,
  endLine: 100
});

// 示例: 读取部分内容
await read_file({
  filePath: '/path/to/package.json',
  startLine: 1,
  endLine: 20  // 只读前 20 行
});
```

### 2. 创建文件
```typescript
// 工具: create_file
// 用途: 创建新文件

await create_file({
  filePath: '/path/to/new-file.ts',
  content: '// File content here'
});
```

### 3. 编辑文件
```typescript
// 工具: replace_string_in_file
// 用途: 替换文件中的特定内容

await replace_string_in_file({
  filePath: '/path/to/file.ts',
  oldString: 'const old = 1;',
  newString: 'const new = 2;'
});
```

### 4. 多处编辑
```typescript
// 工具: replace_string_in_file（多次调用）
// 用途: 需要修改多处时，对每处分别调用 replace_string_in_file
// 注意: 不存在 multi_replace_string_in_file 工具

// 第一处修改
await replace_string_in_file({
  filePath: '/path/to/file1.ts',
  oldString: 'old1',
  newString: 'new1',
  explanation: '更新配置'
});

// 第二处修改
await replace_string_in_file({
  filePath: '/path/to/file2.ts',
  oldString: 'old2',
  newString: 'new2',
  explanation: '更新导入'
});
```

### 5. 智能插入编辑
```typescript
// 工具: insert_edit_into_file
// 用途: 当 replace_string_in_file 失败时使用，支持用注释表示未变更区域

await insert_edit_into_file({
  filePath: '/path/to/file.ts',
  explanation: '添加新方法',
  code: `class MyClass {
  // ...existing code...
  newMethod() {
    return true;
  }
}`
});
```

---

## 📁 文件操作

### 1. 列出目录
```typescript
// 工具: list_dir
// 用途: 列出目录内容

await list_dir({
  path: '/path/to/directory'
});

// 返回示例:
// src/
// config/
// package.json
// README.md
```

### 2. 创建目录
```typescript
// 工具: create_directory
// 用途: 创建目录（递归创建）

await create_directory({
  dirPath: '/path/to/new/directory'
});
```

### 3. 文件搜索
```typescript
// 工具: file_search
// 用途: 按 glob 模式搜索文件

await file_search({
  query: '**/*.ts',
  maxResults: 50
});

// 常用模式:
// '**/*.ts'           - 所有 TS 文件
// 'src/**/*.test.ts'  - 所有测试文件
// 'config/*.json'     - config 目录下的 JSON 文件
```

---

## 🔍 代码搜索

### 1. 文本搜索
```typescript
// 工具: grep_search
// 用途: 搜索代码内容（支持正则）

// 普通搜索
await grep_search({
  query: 'function handleRequest',
  isRegexp: false
});

// 正则搜索
await grep_search({
  query: 'export (interface|type) \\w+',
  isRegexp: true
});

// 限定文件范围
await grep_search({
  query: 'rateLimiter',
  isRegexp: false,
  includePattern: 'src/**/*.ts'
});
```

### 2. 语义搜索
```typescript
// 工具: semantic_search
// 用途: 智能搜索相关代码

await semantic_search({
  query: '限流中间件的实现'
});

// 返回与查询语义相关的代码片段
```

### 3. 代码引用
```typescript
// 工具: list_code_usages
// 用途: 查找函数/类的所有引用

await list_code_usages({
  symbolName: 'rateLimiter',
  filePaths: ['src/middleware/rate-limiter.ts']
});
```

---

## 🔀 Git 操作

### 1. 查看变更
```typescript
// 工具: get_changed_files
// 用途: 获取 Git 变更文件

await get_changed_files({
  repositoryPath: '/path/to/repo',
  sourceControlState: ['unstaged', 'staged']
});
```

### 2. Git 命令
```typescript
// 工具: run_in_terminal
// 用途: 执行 Git 命令

// 查看状态
await run_in_terminal({
  command: 'git status',
  explanation: '查看 Git 状态',
  isBackground: false
});

// 提交变更
await run_in_terminal({
  command: 'git add . && git commit -m "feat: 添加限流功能"',
  explanation: '提交代码',
  isBackground: false
});
```

---

## 💻 终端命令

### 1. 执行命令
```typescript
// 工具: run_in_terminal
// 用途: 在终端执行命令

// 安装依赖
await run_in_terminal({
  command: 'npm install flex-rate-limit --save',
  explanation: '安装限流库',
  isBackground: false
});

// 运行测试
await run_in_terminal({
  command: 'npm test',
  explanation: '运行测试',
  isBackground: false
});

// 启动服务（后台）
await run_in_terminal({
  command: 'npm start',
  explanation: '启动开发服务器',
  isBackground: true
});
```

### 2. 查看输出
```typescript
// 工具: get_terminal_output
// 用途: 获取后台命令的输出

const terminalId = await run_in_terminal({
  command: 'npm start',
  isBackground: true
});

// 稍后查看输出
await get_terminal_output({
  id: terminalId
});
```

---

## ✅ 验证工具

### 1. 检查错误
```typescript
// 工具: get_errors
// 用途: 获取编译/Lint 错误

// 检查特定文件
await get_errors({
  filePaths: ['src/middleware/rate-limiter.ts']
});

// 检查整个项目
await get_errors({});
```

### 2. TypeScript 检查
```typescript
// 使用终端命令
await run_in_terminal({
  command: 'npx tsc --noEmit',
  explanation: 'TypeScript 类型检查'
});
```

### 3. Lint 检查
```typescript
await run_in_terminal({
  command: 'npx eslint src/**/*.ts',
  explanation: 'ESLint 代码检查'
});
```

### 4. 格式化
```typescript
await run_in_terminal({
  command: 'npx prettier --write src/**/*.ts',
  explanation: '格式化代码'
});
```

### 5. 测试
```typescript
// 运行所有测试
await run_in_terminal({
  command: 'npm test',
  explanation: '运行所有测试'
});

// 运行特定测试
await run_in_terminal({
  command: 'npm test -- rate-limiter.test.ts',
  explanation: '运行限流测试'
});

// 查看覆盖率
await run_in_terminal({
  command: 'npm test -- --coverage',
  explanation: '生成测试覆盖率报告'
});
```

---

## 🎯 工作流中的工具使用

### 需求开发流程

#### Step 1: 生成任务 ID
```typescript
// 无需工具，AI 内部计算
```

#### Step 2: 创建输出目录
```typescript
await create_directory({
  dirPath: `projects/${projectName}/requirements/${taskId}/scripts`
});
```

#### Step 3: 收集项目上下文
```typescript
// 读取 package.json
const pkg = await read_file({
  filePath: 'package.json',
  startLine: 1,
  endLine: 1000
});

// 列出目录结构
const structure = await list_dir({ path: '.' });

// 搜索中间件文件
const middlewares = await file_search({
  query: 'src/middleware/**/*.ts'
});
```

#### Step 4-7: 生成文档并实现
```typescript
// 读取模板
const template = await read_file({
  filePath: 'templates/core/requirement-template.md'
});

// 创建文档
await create_file({
  filePath: `projects/${projectName}/requirements/${taskId}/01-requirement.md`,
  content: filledTemplate
});

// 安装依赖
await run_in_terminal({
  command: 'npm install flex-rate-limit --save'
});

// 创建代码文件
await create_file({
  filePath: 'src/middleware/rate-limiter.ts',
  content: middlewareCode
});
```

#### Step 8: 验证
```typescript
// 类型检查
await run_in_terminal({ command: 'npx tsc --noEmit' });

// Lint 检查
await run_in_terminal({ command: 'npx eslint src/**/*.ts' });

// 运行测试
await run_in_terminal({ command: 'npm test' });

// 检查错误
await get_errors({});
```

---

## 🚨 工具使用注意事项

### 1. 文件路径
```typescript
// ✅ 使用绝对路径
await read_file({
  filePath: '/full/path/to/file.ts'
});

// ❌ 避免相对路径（可能导致错误）
await read_file({
  filePath: './file.ts'
});
```

### 2. 异步操作
```typescript
// ✅ 等待操作完成
const content = await read_file({ filePath: '...' });
console.log(content);

// ❌ 不要忘记 await
const content = read_file({ filePath: '...' }); // 返回 Promise
console.log(content); // [object Promise]
```

### 3. 错误处理
```typescript
// ✅ 处理可能的错误
try {
  await run_in_terminal({ command: 'npm install' });
} catch (error) {
  console.error('安装失败:', error);
  // 提供备选方案
}
```

### 4. 后台任务
```typescript
// ✅ 后台任务保存 ID
const id = await run_in_terminal({
  command: 'npm start',
  isBackground: true
});
// 稍后查看输出
const output = await get_terminal_output({ id });

// ❌ 不要在后台运行快速命令
await run_in_terminal({
  command: 'npm test',  // 这个应该等待结果
  isBackground: true    // 错误！
});
```

### 5. 搜索优化
```typescript
// ✅ 使用 includePattern 限制范围
await grep_search({
  query: 'rateLimiter',
  includePattern: 'src/**/*.ts'  // 只搜索 src 目录
});

// ❌ 不要在全项目搜索通用词
await grep_search({
  query: 'const'  // 太宽泛！
});
```

---

## 📊 工具使用统计

基于真实使用场景的工具频率：

| 工具 | 使用频率 | 主要场景 |
|------|---------|---------|
| `read_file` | ⭐⭐⭐⭐⭐ | 读取配置、模板、代码 |
| `create_file` | ⭐⭐⭐⭐⭐ | 生成文档、创建代码 |
| `run_in_terminal` | ⭐⭐⭐⭐ | 安装依赖、运行测试 |
| `list_dir` | ⭐⭐⭐⭐ | 分析项目结构 |
| `grep_search` | ⭐⭐⭐ | 搜索代码模式 |
| `replace_string_in_file` | ⭐⭐⭐ | 修改配置、更新代码 |
| `get_errors` | ⭐⭐⭐ | 验证代码质量 |
| `file_search` | ⭐⭐ | 查找特定文件 |
| `semantic_search` | ⭐⭐ | 智能搜索 |
| `create_directory` | ⭐⭐ | 创建输出目录 |

---

## 📚 参考资源

- [VS Code API 文档](https://code.visualstudio.com/api)
- [Node.js fs 模块](https://nodejs.org/api/fs.html)
- [Git 命令手册](https://git-scm.com/docs)

---

## 🛠️ ai-dev-guidelines 验证脚本

### validate-links.js

验证 Markdown 文件中的内部链接是否有效。

```bash
# 运行验证
node tools/validate-links.js

# 显示建议修复
node tools/validate-links.js --fix
```

**功能**:
- 检测所有 `.md` 文件中的相对链接
- 验证链接目标是否存在
- 报告断链和建议修复

**输出示例**:
```
🔍 开始验证 Markdown 链接...
📁 找到 107 个 Markdown 文件

📊 验证结果:
   总链接数: 256
   有效链接: 254
   断开链接: 2

❌ 发现以下断链:
📄 some-file.md
   ❌ [不存在的链接](./missing-file.md)
```

> 注意：示例中的链接是演示用途，实际运行时会显示真实的断链。

### validate-structure.js

验证目录结构与 README 描述是否一致。

```bash
# 运行验证
node tools/validate-structure.js
```

**功能**:
- 检测 README.md 中声明的文件/目录是否存在
- 检测实际存在但 README 中未声明的文件
- 验证关键目录结构完整性

**输出示例**:
```
🔍 开始验证目录结构...

📄 检查根目录文件:
   ✅ README.md
   ✅ CHANGELOG.md
   ✅ CONSTRAINTS.md

📁 检查目录结构:
   ✅ workflows/
      ✅ 00-pre-check/
      ✅ 01-requirement-dev/

📊 文件统计:
   Markdown 文件: 107
   YAML 文件: 1
   JavaScript 文件: 2

✅ 所有必需文件/目录都存在!
```

---

**最后更新**: 2026-02-12
