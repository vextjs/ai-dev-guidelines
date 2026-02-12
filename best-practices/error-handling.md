# 错误处理和回滚

> 错误恢复、操作回滚和检查点机制

---

## 📋 概述

错误处理和回滚机制是保证系统可靠性的关键，特别是在自动化开发中。

---

## 🚨 错误分类

### 可恢复错误
```yaml
特征:
  - 临时性问题
  - 重试可能成功
  - 不影响数据完整性

示例:
  - 网络超时
  - 资源暂时不可用
  - 并发冲突

处理策略: 重试 + 降级
```

### 不可恢复错误
```yaml
特征:
  - 永久性问题
  - 重试不会成功
  - 需要人工介入

示例:
  - 语法错误
  - 权限不足
  - 资源不存在
  - 逻辑错误

处理策略: 回滚 + 报告
```

### 致命错误
```yaml
特征:
  - 严重损坏
  - 影响系统稳定性
  - 可能造成数据丢失

示例:
  - 磁盘故障
  - 内存溢出
  - 数据库连接丢失

处理策略: 立即停止 + 保存现场 + 告警
```

---

## 🔄 操作日志

### 日志记录
```typescript
interface OperationLog {
  id: string;
  timestamp: Date;
  operation: string;
  type: 'create' | 'update' | 'delete';
  target: string;
  beforeState?: any;
  afterState?: any;
  success: boolean;
  error?: string;
}

class OperationLogger {
  private logs: OperationLog[] = [];
  private logFile: string;
  
  constructor(projectPath: string) {
    this.logFile = path.join(projectPath, '.ai', 'operations.jsonl');
  }
  
  async log(operation: Omit<OperationLog, 'id' | 'timestamp'>) {
    const log: OperationLog = {
      ...operation,
      id: generateId(),
      timestamp: new Date()
    };
    
    this.logs.push(log);
    
    // 追加写入文件（JSONL 格式）
    await appendFile(this.logFile, JSON.stringify(log) + '\n');
    
    return log;
  }
  
  async getLogs(filter?: Partial<OperationLog>): Promise<OperationLog[]> {
    if (!filter) return this.logs;
    
    return this.logs.filter(log => 
      Object.entries(filter).every(([key, value]) => 
        log[key] === value
      )
    );
  }
}
```

### 使用示例
```typescript
const logger = new OperationLogger(projectPath);

async function createFileWithLogging(filePath: string, content: string) {
  try {
    // 记录操作前状态
    const exists = await fileExists(filePath);
    const beforeState = exists ? await readFile(filePath) : null;
    
    // 执行操作
    await create_file({ filePath, content });
    
    // 记录成功
    await logger.log({
      operation: 'create_file',
      type: 'create',
      target: filePath,
      beforeState,
      afterState: content,
      success: true
    });
    
  } catch (error) {
    // 记录失败
    await logger.log({
      operation: 'create_file',
      type: 'create',
      target: filePath,
      success: false,
      error: error.message
    });
    
    throw error;
  }
}
```

---

## 📍 检查点机制

### 检查点定义
```typescript
interface Checkpoint {
  id: string;
  timestamp: Date;
  phase: string;
  state: ProjectState;
  files: FileSnapshot[];
  canRestore: boolean;
}

interface FileSnapshot {
  path: string;
  content: string;
  hash: string;
}

class CheckpointManager {
  private checkpoints: Checkpoint[] = [];
  private checkpointDir: string;
  
  constructor(projectPath: string) {
    this.checkpointDir = path.join(projectPath, '.ai', 'checkpoints');
  }
  
  async create(phase: string, state: ProjectState): Promise<Checkpoint> {
    const checkpoint: Checkpoint = {
      id: generateId(),
      timestamp: new Date(),
      phase,
      state,
      files: await this.snapshotFiles(state.modifiedFiles),
      canRestore: true
    };
    
    // 保存检查点
    const checkpointFile = path.join(
      this.checkpointDir,
      `${checkpoint.id}.json`
    );
    
    await create_file({
      filePath: checkpointFile,
      content: JSON.stringify(checkpoint, null, 2)
    });
    
    this.checkpoints.push(checkpoint);
    
    console.log(`✅ 检查点已创建: ${phase}`);
    return checkpoint;
  }
  
  async restore(checkpointId: string): Promise<void> {
    const checkpoint = this.checkpoints.find(c => c.id === checkpointId);
    if (!checkpoint) {
      throw new Error(`检查点不存在: ${checkpointId}`);
    }
    
    if (!checkpoint.canRestore) {
      throw new Error(`检查点不可恢复: ${checkpointId}`);
    }
    
    console.log(`🔄 恢复检查点: ${checkpoint.phase}`);
    
    // 恢复文件
    for (const file of checkpoint.files) {
      await create_file({
        filePath: file.path,
        content: file.content
      });
    }
    
    console.log(`✅ 检查点已恢复`);
  }
  
  private async snapshotFiles(filePaths: string[]): Promise<FileSnapshot[]> {
    const snapshots: FileSnapshot[] = [];
    
    for (const filePath of filePaths) {
      const content = await readFile(filePath);
      snapshots.push({
        path: filePath,
        content,
        hash: computeHash(content)
      });
    }
    
    return snapshots;
  }
}
```

### 使用检查点
```typescript
const checkpointManager = new CheckpointManager(projectPath);

async function executeWithCheckpoints(phases: Phase[]) {
  for (const phase of phases) {
    // 创建检查点
    const checkpoint = await checkpointManager.create(
      phase.name,
      getCurrentState()
    );
    
    try {
      // 执行阶段任务
      await executePhase(phase);
      
      console.log(`✅ ${phase.name} 完成`);
      
    } catch (error) {
      console.error(`❌ ${phase.name} 失败:`, error.message);
      
      // 询问用户是否回滚
      const shouldRollback = await confirm(
        `是否回滚到 "${phase.name}" 开始前的状态？`
      );
      
      if (shouldRollback) {
        await checkpointManager.restore(checkpoint.id);
        console.log('已回滚到检查点');
      }
      
      throw error;
    }
  }
}
```

---

## ⏪ 回滚策略

### 回滚类型

#### 1. 文件回滚
```typescript
async function rollbackFile(filePath: string, log: OperationLog) {
  switch (log.type) {
    case 'create':
      // 删除创建的文件
      await deleteFile(filePath);
      break;
      
    case 'update':
      // 恢复原内容
      if (log.beforeState) {
        await create_file({
          filePath,
          content: log.beforeState
        });
      }
      break;
      
    case 'delete':
      // 恢复删除的文件
      if (log.beforeState) {
        await create_file({
          filePath,
          content: log.beforeState
        });
      }
      break;
  }
}
```

#### 2. 批量回滚
```typescript
async function rollbackBatch(logs: OperationLog[]) {
  // 按时间倒序回滚
  const reversedLogs = [...logs].reverse();
  
  for (const log of reversedLogs) {
    try {
      await rollbackFile(log.target, log);
      console.log(`✅ 已回滚: ${log.target}`);
    } catch (error) {
      console.error(`❌ 回滚失败: ${log.target}`, error);
      // 继续回滚其他文件
    }
  }
}
```

#### 3. Git 回滚
```typescript
async function rollbackWithGit(commitHash?: string) {
  if (!commitHash) {
    // 回滚未提交的更改
    await run_in_terminal({
      command: 'git reset --hard HEAD',
      explanation: '回滚所有未提交的更改'
    });
  } else {
    // 回滚到指定提交
    await run_in_terminal({
      command: `git reset --hard ${commitHash}`,
      explanation: `回滚到提交 ${commitHash}`
    });
  }
}
```

### 回滚决策
```yaml
何时回滚:
  - 关键步骤失败
  - 数据完整性问题
  - 无法继续执行
  - 用户明确要求

何时不回滚:
  - 轻微警告
  - 可修复的错误
  - 部分成功（询问用户）
```

---

## 🛡️ 安全措施

### 操作前验证
```typescript
async function safeOperation<T>(
  operation: () => Promise<T>,
  validation: ValidationCheck[]
): Promise<OperationResult<T>> {
  // 1. 执行前验证
  for (const check of validation) {
    const valid = await check.validate();
    if (!valid) {
      return {
        success: false,
        error: `验证失败: ${check.description}`,
        suggestion: check.suggestion
      };
    }
  }
  
  // 2. 创建备份
  const backup = await createBackup();
  
  try {
    // 3. 执行操作
    const result = await operation();
    
    return { success: true, data: result };
    
  } catch (error) {
    // 4. 自动回滚
    await restoreBackup(backup);
    
    return {
      success: false,
      error: error.message,
      rolledBack: true
    };
  }
}
```

### 验证检查
```typescript
const validationChecks: ValidationCheck[] = [
  {
    name: 'disk_space',
    description: '检查磁盘空间',
    validate: async () => {
      const space = await getDiskSpace();
      return space > 1_000_000_000;  // > 1GB
    },
    suggestion: '请清理磁盘空间后重试'
  },
  {
    name: 'file_permissions',
    description: '检查文件权限',
    validate: async () => {
      return await hasWritePermission(projectPath);
    },
    suggestion: '请检查文件权限'
  },
  {
    name: 'dependencies',
    description: '检查依赖完整性',
    validate: async () => {
      return await verifyDependencies();
    },
    suggestion: '请运行 npm install'
  }
];
```

---

## 🔍 错误追踪

### 错误上下文
```typescript
interface ErrorContext {
  operation: string;
  phase: string;
  inputs: Record<string, any>;
  state: ProjectState;
  stackTrace: string;
  relatedLogs: OperationLog[];
  timestamp: Date;
}

async function captureErrorContext(error: Error): Promise<ErrorContext> {
  const context: ErrorContext = {
    operation: currentOperation,
    phase: currentPhase,
    inputs: currentInputs,
    state: getCurrentState(),
    stackTrace: error.stack || '',
    relatedLogs: await logger.getLogs({ success: false }),
    timestamp: new Date()
  };
  
  // 保存错误上下文
  await saveErrorContext(context);
  
  return context;
}
```

### 错误报告
```typescript
function formatErrorReport(error: Error, context: ErrorContext): string {
  return `
❌ 操作失败

错误: ${error.message}

上下文:
  操作: ${context.operation}
  阶段: ${context.phase}
  时间: ${context.timestamp.toISOString()}

最近操作:
${context.relatedLogs.slice(-5).map(log => 
  `  - ${log.operation} ${log.target} ${log.success ? '✅' : '❌'}`
).join('\n')}

建议:
  1. 检查错误消息并修复问题
  2. 使用 rollback 命令回滚更改
  3. 查看完整日志: .ai/operations.jsonl

是否需要回滚？[Y/n]
  `.trim();
}
```

---

## 📊 恢复策略

### 自动恢复
```typescript
async function autoRecover(error: Error): Promise<RecoveryResult> {
  // 1. 分析错误类型
  const errorType = classifyError(error);
  
  switch (errorType) {
    case 'network':
      // 网络错误：重试
      return await retryWithBackoff();
      
    case 'permission':
      // 权限错误：报告并停止
      return {
        recovered: false,
        message: '权限不足，需要手动处理',
        suggestion: '请检查文件权限或以管理员身份运行'
      };
      
    case 'syntax':
      // 语法错误：回滚
      await rollbackLastOperation();
      return {
        recovered: true,
        message: '已回滚错误更改',
        suggestion: '请修正后重试'
      };
      
    default:
      return { recovered: false, message: '未知错误类型' };
  }
}
```

### 手动恢复
```yaml
恢复步骤:
  1. 查看操作日志
     - .ai/operations.jsonl
  
  2. 识别失败点
     - 最后一个成功的操作
  
  3. 选择恢复方式
     - 回滚到检查点
     - 撤销特定操作
     - Git 回滚
  
  4. 验证恢复结果
     - 运行测试
     - 检查文件状态
```

---

## 🎯 AI 实施建议

### 何时创建检查点？
```yaml
关键时机:
  - 开始新阶段前
  - 大量文件修改前
  - 执行高风险操作前
  - 用户明确请求

检查点命名:
  - phase-1-setup
  - before-refactor
  - pre-migration
```

### 错误处理流程
```yaml
1. 捕获错误
2. 记录上下文
3. 分类错误
4. 尝试自动恢复
5. 询问用户决策
6. 执行回滚（如需要）
7. 报告结果
```

---

**最后更新**: 2026-02-11
