# Token 限制处理

> 优化 Token 使用，提高 AI 工作效率

---

## 📋 概述

Token 限制是 AI 模型的核心约束，合理管理 Token 使用是高效开发的关键。

---

## 🎯 Token 消耗来源

### 输入 Token
```yaml
来源:
  - 系统提示词（System Prompt）
  - 历史对话记录
  - 读取的文件内容
  - 工具调用结果
  - 项目规范文档

占比（估算）:
  系统提示词: 5-10%
  历史对话: 20-30%
  文件内容: 40-50%
  其他: 10-20%
```

### 输出 Token
```yaml
来源:
  - AI 生成的文本
  - 代码实现
  - 工具调用参数
  
占比（估算）:
  文本说明: 20-30%
  代码: 60-70%
  工具调用: 5-10%
```

---

## 📊 优化策略

### 策略 1: 分段读取大文件

#### 问题
```yaml
场景: 需要分析 2000 行的文件

直接读取:
  - Token 消耗: ~10,000
  - 效率: 低（大部分内容无关）
  
后果:
  - 达到 Token 限制
  - 无法完成任务
```

#### 解决方案
```typescript
// ❌ 错误：直接读取整个文件
const allContent = await read_file({
  filePath: 'large-file.ts',
  startLine: 1,
  endLine: 2000
});

// ✅ 正确：分段读取
async function analyzeFileInChunks(filePath: string) {
  // Step 1: 读取文件头（了解结构）
  const header = await read_file({
    filePath,
    startLine: 1,
    endLine: 50
  });
  
  // Step 2: 使用 grep_search 定位目标
  const searchResult = await grep_search({
    query: 'function handleRequest',
    isRegexp: false,
    includePattern: filePath
  });
  
  // Step 3: 只读取相关部分
  for (const match of searchResult.matches) {
    const contextStart = Math.max(1, match.lineNumber - 10);
    const contextEnd = match.lineNumber + 30;
    
    const relevantCode = await read_file({
      filePath,
      startLine: contextStart,
      endLine: contextEnd
    });
    
    // 分析这一段代码
    await analyzeCodeBlock(relevantCode);
  }
}
```

#### 分段策略
```yaml
文件类型 → 分段方式:
  配置文件 (< 200 行):
    - 完整读取
    
  普通源文件 (200-1000 行):
    - 首尾各 50 行 + 搜索定位
    
  大型文件 (> 1000 行):
    - 目录结构 + 搜索 + 分段读取
    - 每段 ≤ 100 行
```

---

### 策略 2: 摘要生成

#### 问题
```yaml
场景: 需要理解项目整体结构

直接读所有文件:
  - Token 消耗: ~50,000+
  - 超出限制
```

#### 解决方案
```typescript
async function generateProjectSummary(projectPath: string) {
  // Step 1: 读取关键配置
  const packageJson = await read_file({
    filePath: path.join(projectPath, 'package.json'),
    startLine: 1,
    endLine: 50
  });
  
  // Step 2: 列出目录结构（不读内容）
  const srcStructure = await list_dir(path.join(projectPath, 'src'));
  
  // Step 3: 只读取核心文件的开头
  const coreFiles = ['index.ts', 'app.ts', 'server.ts'];
  const summaries = [];
  
  for (const file of coreFiles) {
    const summary = await read_file({
      filePath: path.join(projectPath, 'src', file),
      startLine: 1,
      endLine: 30  // 只读开头
    });
    summaries.push({ file, summary });
  }
  
  // Step 4: 搜索关键模式
  const patterns = await grep_search({
    query: 'export (class|function|interface)',
    isRegexp: true
  });
  
  return {
    dependencies: extractDependencies(packageJson),
    structure: srcStructure,
    coreModules: summaries,
    exports: patterns
  };
}
```

#### 摘要原则
```yaml
保留:
  - 文件/模块名称
  - 导出的 API
  - 依赖关系
  - 核心类/函数签名

忽略:
  - 函数实现细节
  - 内部变量
  - 注释（除非是文档）
  - 测试代码
```

---

### 策略 3: 增量上下文

#### 问题
```yaml
场景: 长时间多步骤任务

传统方式:
  - 每次对话携带完整历史
  - Token 快速累积
  - 最终超限
```

#### 解决方案
```typescript
interface TaskContext {
  phase: string;
  completedSteps: string[];
  currentStep: string;
  keyDecisions: Record<string, any>;
  pendingIssues: Issue[];
}

async function executeMultiStepTask(task: Task) {
  // Step 1: 初始化上下文
  const context: TaskContext = {
    phase: 'init',
    completedSteps: [],
    currentStep: 'analysis',
    keyDecisions: {},
    pendingIssues: []
  };
  
  // Step 2: 执行各阶段，只保留关键信息
  for (const step of task.steps) {
    const result = await executeStep(step, context);
    
    // 记录关键决策，丢弃详细过程
    context.keyDecisions[step.name] = {
      decision: result.decision,
      reason: result.reason,
      // ❌ 不保存: 详细日志、临时变量
    };
    
    context.completedSteps.push(step.name);
    context.currentStep = getNextStep(step);
  }
  
  return context;
}
```

#### 压缩历史
```yaml
保留:
  - 任务目标
  - 关键决策点
  - 错误和解决方案
  - 待办事项

压缩:
  - 详细日志 → 摘要
  - 代码片段 → 文件名 + 行号
  - 长讨论 → 结论

丢弃:
  - 临时变量值
  - 重复信息
  - 已解决的问题
```

---

### 策略 4: 智能搜索

#### 问题
```yaml
场景: 不知道目标在哪个文件

错误做法:
  - 读取所有可能的文件
  - Token 浪费
```

#### 解决方案
```typescript
async function locateFeature(feature: string) {
  // Step 1: 语义搜索（最高效）
  const semanticResults = await semantic_search({
    query: `${feature} implementation function class`
  });
  
  if (semanticResults.length > 0) {
    return semanticResults[0];  // 直接定位
  }
  
  // Step 2: 关键字搜索
  const grepResults = await grep_search({
    query: feature,
    isRegexp: false
  });
  
  if (grepResults.matches.length > 0) {
    // 读取匹配周围的少量上下文
    return await readMatchContext(grepResults.matches[0], 20);
  }
  
  // Step 3: 文件名搜索
  const fileResults = await file_search({
    query: `**/*${feature}*.ts`
  });
  
  if (fileResults.length > 0) {
    // 只读文件开头
    return await read_file({
      filePath: fileResults[0],
      startLine: 1,
      endLine: 50
    });
  }
  
  return null;  // 未找到
}
```

#### 搜索优先级
```yaml
1. semantic_search (最智能):
   - 理解语义
   - 直接定位相关代码
   - Token 效率最高

2. grep_search (最精确):
   - 文本匹配
   - 快速定位
   - 适合已知关键字

3. file_search (最宽泛):
   - 文件名匹配
   - 范围较大
   - 需要后续筛选
```

---

### 策略 5: 延迟加载

#### 问题
```yaml
场景: 可能需要参考多个文件

过早加载:
  - 加载了不需要的内容
  - Token 浪费
```

#### 解决方案
```typescript
async function implementFeature(task: Task) {
  // Step 1: 先分析需求（不加载代码）
  const plan = await analyzeTaImplementation(task.description);
  
  // Step 2: 确定需要哪些文件
  const requiredFiles = identifyRequiredFiles(plan);
  
  // Step 3: 只加载必需的文件
  for (const file of requiredFiles) {
    if (file.needsFullRead) {
      // 完整读取
      const content = await read_file({ filePath: file.path });
      await processFile(content);
    } else {
      // 只读关键部分
      const snippet = await read_file({
        filePath: file.path,
        startLine: file.startLine,
        endLine: file.endLine
      });
      await processSnippet(snippet);
    }
  }
}
```

#### 延迟加载原则
```yaml
何时加载:
  - 明确需要时才加载
  - 先规划后加载
  - 分批加载

何时不加载:
  - "可能"需要（不确定）
  - "参考"用途（非必需）
  - 重复信息
```

---

## 🎯 实战技巧

### 技巧 1: 使用工具组合
```typescript
// ❌ 低效：直接读取
const allFiles = await Promise.all(
  fileList.map(f => read_file({ filePath: f }))
);

// ✅ 高效：搜索 + 定向读取
const matches = await grep_search({
  query: 'export class.*Service',
  isRegexp: true
});

const services = await Promise.all(
  matches.slice(0, 5).map(m => 
    read_file({
      filePath: m.filePath,
      startLine: m.lineNumber,
      endLine: m.lineNumber + 20
    })
  )
);
```

### 技巧 2: 缓存结果
```typescript
const cache = new Map<string, any>();

async function getFileInfo(filePath: string) {
  if (cache.has(filePath)) {
    return cache.get(filePath);  // 避免重复读取
  }
  
  const info = await read_file({ filePath });
  cache.set(filePath, info);
  return info;
}
```

### 技巧 3: 预估 Token
```typescript
function estimateTokens(text: string): number {
  // 粗略估算：4 字符 ≈ 1 Token
  return Math.ceil(text.length / 4);
}

async function smartRead(filePath: string, maxTokens: number = 2000) {
  // 先读一小部分
  const sample = await read_file({
    filePath,
    startLine: 1,
    endLine: 10
  });
  
  const tokensPerLine = estimateTokens(sample) / 10;
  const maxLines = Math.floor(maxTokens / tokensPerLine);
  
  // 根据估算决定读多少行
  return await read_file({
    filePath,
    startLine: 1,
    endLine: Math.min(maxLines, 500)
  });
}
```

---

## 📊 效果对比

### 案例：分析 1000 行文件中的错误

#### 方法 A：完整读取（低效）
```yaml
操作:
  1. read_file(1-1000)
  
Token 消耗:
  - 读取: ~5000
  - 分析: ~1000
  - 总计: ~6000
  
效率: ★☆☆☆☆
```

#### 方法 B：搜索定位（高效）
```yaml
操作:
  1. grep_search('error|exception')
  2. read_file(匹配行 ± 20)
  
Token 消耗:
  - 搜索: ~100
  - 读取: ~500 (假设 5 个匹配)
  - 分析: ~500
  - 总计: ~1100
  
效率: ★★★★★
节省: 82%
```

---

## 🚨 Token 告警

### 何时需要优化？
```yaml
信号:
  - 单次对话 Token > 20,000
  - 频繁达到上下文限制
  - 等待时间过长
  - 输出被截断
```

### 优化检查清单
```yaml
- [ ] 是否可以用 grep_search 替代 read_file？
- [ ] 是否可以分段读取而非完整读取？
- [ ] 是否可以生成摘要而非详细内容？
- [ ] 历史对话是否可以压缩？
- [ ] 是否有重复读取的文件？
- [ ] 是否需要所有匹配结果（可以限制数量）？
```

---

## 🎓 AI 实施建议

### 读取文件前，问自己：
```yaml
1. 我需要整个文件吗？
   → 可能只需要函数签名

2. 我知道内容在哪里吗？
   → 用 grep_search 先定位

3. 文件很大吗？
   → 分段读取或摘要

4. 这个内容之前读过吗？
   → 引用之前的结果

5. 有其他获取信息的方式吗？
   → list_dir, semantic_search
```

### Token 预算管理
```yaml
任务开始时评估:
  - 预计需要读取的文件数
  - 每个文件的行数
  - 估算总 Token 消耗
  
超出预算时:
  - 拆分任务
  - 优化策略
  - 请求用户确认
```

---

**最后更新**: 2026-02-11
