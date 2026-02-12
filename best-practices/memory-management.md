# 对话记忆存储

> 跨会话上下文保存和任务恢复机制

---

## 📋 概述

对话记忆存储机制用于保存 AI 开发过程中的上下文信息，使得跨会话工作能够无缝衔接。

---

## 🎯 为什么需要对话记忆？

### 问题场景
```yaml
场景 1: 会话中断
  - AI 对话意外断开
  - 所有上下文丢失
  - 需要重新解释任务

场景 2: 长时间任务
  - 任务跨越多天
  - 每次重新开始需要回顾
  - 浪费时间重建上下文

场景 3: 团队协作
  - 不同 AI 会话处理同一项目
  - 缺乏上下文共享
  - 重复工作

场景 4: 任务切换
  - 在多个任务间切换
  - 难以记住每个任务的状态
  - 容易遗漏细节
```

### 解决方案
```yaml
对话记忆系统:
  - 自动保存关键信息
  - 跨会话恢复上下文
  - 支持任务断点续传
  - 提供历史追溯
```

---

## 💾 存储结构

### 目录组织
```yaml
.ai/
  ├── memory/
  │   ├── sessions/          # 会话记录
  │   │   ├── 2026-02-11_001.json
  │   │   ├── 2026-02-11_002.json
  │   │   └── ...
  │   ├── tasks/             # 任务状态
  │   │   ├── REQ-001.json
  │   │   ├── BUG-042.json
  │   │   └── ...
  │   ├── decisions/         # 关键决策
  │   │   └── architecture-decisions.jsonl
  │   └── context/           # 项目上下文
  │       ├── project-summary.json
  │       └── tech-stack.json
  └── state.json            # 当前状态快照
```

### 数据模型

#### 会话记录
```typescript
interface Session {
  id: string;
  startTime: Date;
  endTime?: Date;
  type: 'requirement' | 'bug-fix' | 'optimization' | 'other';
  taskId?: string;  // 关联的任务ID
  
  conversation: Message[];
  operations: OperationSummary[];
  decisions: Decision[];
  
  outcome: 'completed' | 'in-progress' | 'paused' | 'failed';
  nextSteps?: string[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  important?: boolean;  // 标记重要信息
}

interface OperationSummary {
  type: string;
  description: string;
  result: 'success' | 'failed';
  files: string[];  // 影响的文件
}
```

#### 任务状态
```typescript
interface TaskMemory {
  id: string;
  type: 'requirement' | 'bug-fix' | 'optimization';
  title: string;
  description: string;
  
  status: 'todo' | 'in-progress' | 'blocked' | 'completed';
  progress: {
    currentPhase: string;
    completedSteps: string[];
    nextSteps: string[];
  };
  
  context: {
    relatedFiles: string[];
    dependencies: string[];
    keyDecisions: Decision[];
  };
  
  sessions: string[];  // 关联的会话ID
  createdAt: Date;
  updatedAt: Date;
}
```

#### 关键决策
```typescript
interface Decision {
  timestamp: Date;
  category: 'architecture' | 'technical' | 'design' | 'process';
  question: string;
  decision: string;
  rationale: string;
  alternatives?: string[];
  impact: string[];
}
```

---

## 🔧 实现机制

### 自动保存
```typescript
class MemoryManager {
  private sessionId: string;
  private session: Session;
  private autoSaveInterval: NodeJS.Timeout;
  
  constructor(private projectPath: string) {
    this.sessionId = this.generateSessionId();
    this.session = this.initializeSession();
    
    // 每 5 分钟自动保存
    this.autoSaveInterval = setInterval(() => {
      this.save();
    }, 5 * 60 * 1000);
  }
  
  private generateSessionId(): string {
    const date = new Date().toISOString().split('T')[0];
    const time = Date.now();
    return `${date}_${time}`;
  }
  
  private initializeSession(): Session {
    return {
      id: this.sessionId,
      startTime: new Date(),
      type: 'other',
      conversation: [],
      operations: [],
      decisions: [],
      outcome: 'in-progress'
    };
  }
  
  // 记录对话
  recordMessage(role: 'user' | 'assistant', content: string, important: boolean = false) {
    this.session.conversation.push({
      role,
      content,
      timestamp: new Date(),
      important
    });
  }
  
  // 记录操作
  recordOperation(operation: OperationSummary) {
    this.session.operations.push(operation);
  }
  
  // 记录决策
  recordDecision(decision: Decision) {
    this.session.decisions.push(decision);
    
    // 同时写入全局决策日志
    this.appendToDecisionLog(decision);
  }
  
  // 保存会话
  async save() {
    const sessionPath = path.join(
      this.projectPath,
      '.ai/memory/sessions',
      `${this.sessionId}.json`
    );
    
    await create_file({
      filePath: sessionPath,
      content: JSON.stringify(this.session, null, 2)
    });
  }
  
  // 结束会话
  async end(outcome: Session['outcome']) {
    this.session.endTime = new Date();
    this.session.outcome = outcome;
    
    await this.save();
    clearInterval(this.autoSaveInterval);
  }
  
  // 恢复会话
  static async restore(projectPath: string, sessionId: string): Promise<Session> {
    const sessionPath = path.join(
      projectPath,
      '.ai/memory/sessions',
      `${sessionId}.json`
    );
    
    const content = await read_file({ filePath: sessionPath });
    return JSON.parse(content);
  }
}
```

### 任务管理
```typescript
class TaskManager {
  constructor(private projectPath: string) {}
  
  // 创建任务
  async createTask(task: Omit<TaskMemory, 'sessions' | 'createdAt' | 'updatedAt'>): Promise<TaskMemory> {
    const fullTask: TaskMemory = {
      ...task,
      sessions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await this.saveTask(fullTask);
    return fullTask;
  }
  
  // 更新任务
  async updateTask(taskId: string, updates: Partial<TaskMemory>) {
    const task = await this.loadTask(taskId);
    
    const updatedTask = {
      ...task,
      ...updates,
      updatedAt: new Date()
    };
    
    await this.saveTask(updatedTask);
    return updatedTask;
  }
  
  // 关联会话
  async linkSession(taskId: string, sessionId: string) {
    const task = await this.loadTask(taskId);
    
    if (!task.sessions.includes(sessionId)) {
      task.sessions.push(sessionId);
      await this.saveTask(task);
    }
  }
  
  // 加载任务
  async loadTask(taskId: string): Promise<TaskMemory> {
    const taskPath = path.join(
      this.projectPath,
      '.ai/memory/tasks',
      `${taskId}.json`
    );
    
    const content = await read_file({ filePath: taskPath });
    return JSON.parse(content);
  }
  
  // 保存任务
  private async saveTask(task: TaskMemory) {
    const taskPath = path.join(
      this.projectPath,
      '.ai/memory/tasks',
      `${task.id}.json`
    );
    
    await create_file({
      filePath: taskPath,
      content: JSON.stringify(task, null, 2)
    });
  }
  
  // 列出所有任务
  async listTasks(filter?: { status?: TaskMemory['status'] }): Promise<TaskMemory[]> {
    const tasksDir = path.join(this.projectPath, '.ai/memory/tasks');
    const files = await list_dir(tasksDir);
    
    const tasks = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          const content = await read_file({ 
            filePath: path.join(tasksDir, f) 
          });
          return JSON.parse(content) as TaskMemory;
        })
    );
    
    if (filter?.status) {
      return tasks.filter(t => t.status === filter.status);
    }
    
    return tasks;
  }
}
```

---

## 🔄 任务恢复

### 恢复流程
```typescript
class TaskRestorer {
  constructor(
    private memoryManager: MemoryManager,
    private taskManager: TaskManager
  ) {}
  
  async restoreTask(taskId: string): Promise<RestoredContext> {
    // 1. 加载任务信息
    const task = await this.taskManager.loadTask(taskId);
    
    // 2. 加载相关会话
    const sessions = await Promise.all(
      task.sessions.map(sid => MemoryManager.restore(this.projectPath, sid))
    );
    
    // 3. 重建上下文
    const context = this.rebuildContext(task, sessions);
    
    // 4. 生成恢复摘要
    const summary = this.generateSummary(task, sessions);
    
    return {
      task,
      context,
      summary,
      sessions
    };
  }
  
  private rebuildContext(task: TaskMemory, sessions: Session[]): TaskContext {
    // 提取所有操作
    const allOperations = sessions.flatMap(s => s.operations);
    
    // 提取所有决策
    const allDecisions = sessions.flatMap(s => s.decisions);
    
    // 识别修改的文件
    const modifiedFiles = [
      ...new Set(allOperations.flatMap(op => op.files))
    ];
    
    return {
      currentPhase: task.progress.currentPhase,
      completedSteps: task.progress.completedSteps,
      nextSteps: task.progress.nextSteps,
      modifiedFiles,
      decisions: allDecisions,
      lastOperation: allOperations[allOperations.length - 1]
    };
  }
  
  private generateSummary(task: TaskMemory, sessions: Session[]): string {
    const totalSessions = sessions.length;
    const totalOperations = sessions.reduce((sum, s) => sum + s.operations.length, 0);
    const successfulOps = sessions.flatMap(s => s.operations).filter(op => op.result === 'success').length;
    
    return `
## 任务恢复摘要

**任务**: ${task.title} (${task.id})
**状态**: ${task.status}
**当前阶段**: ${task.progress.currentPhase}

### 进度
- 已完成: ${task.progress.completedSteps.length} 步
- 待完成: ${task.progress.nextSteps.length} 步

### 历史
- 会话数: ${totalSessions}
- 总操作数: ${totalOperations}
- 成功率: ${((successfulOps / totalOperations) * 100).toFixed(1)}%

### 下一步
${task.progress.nextSteps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

### 最近操作
${sessions[sessions.length - 1]?.operations.slice(-3).map(op => 
  `- ${op.description} ${op.result === 'success' ? '✅' : '❌'}`
).join('\n') || '无'}
    `.trim();
  }
}
```

### 使用示例
```typescript
// 启动新会话时
const memoryManager = new MemoryManager(projectPath);
const taskManager = new TaskManager(projectPath);

// 用户请求："继续之前的任务 REQ-001"
const restorer = new TaskRestorer(memoryManager, taskManager);
const restored = await restorer.restoreTask('REQ-001');

// 显示恢复摘要
console.log(restored.summary);

// 继续任务
await continueTask(restored.task, restored.context);
```

---

## 🎯 上下文压缩

### 压缩策略
```typescript
class ContextCompressor {
  // 压缩对话历史
  compressConversation(messages: Message[]): Message[] {
    // 1. 保留标记为重要的消息
    const important = messages.filter(m => m.important);
    
    // 2. 保留最近 N 条消息
    const recent = messages.slice(-10);
    
    // 3. 对中间部分生成摘要
    const middle = messages.slice(0, -10).filter(m => !m.important);
    const middleSummary: Message = {
      role: 'assistant',
      content: this.summarizeMessages(middle),
      timestamp: middle[0]?.timestamp || new Date(),
      important: true
    };
    
    return [
      ...important,
      middleSummary,
      ...recent
    ];
  }
  
  private summarizeMessages(messages: Message[]): string {
    const topics = this.extractTopics(messages);
    const keyPoints = this.extractKeyPoints(messages);
    
    return `
[历史对话摘要]

讨论主题:
${topics.map(t => `- ${t}`).join('\n')}

关键要点:
${keyPoints.map(p => `- ${p}`).join('\n')}
    `.trim();
  }
  
  private extractTopics(messages: Message[]): string[] {
    // 提取讨论的主要话题（简化版）
    const keywords = new Set<string>();
    
    for (const msg of messages) {
      const words = msg.content.split(/\s+/);
      words.forEach(w => {
        if (w.length > 3 && isSignificant(w)) {
          keywords.add(w);
        }
      });
    }
    
    return Array.from(keywords).slice(0, 5);
  }
  
  private extractKeyPoints(messages: Message[]): string[] {
    // 提取关键决策和结论
    const keyPoints: string[] = [];
    
    for (const msg of messages) {
      // 查找包含决策关键词的句子
      const sentences = msg.content.split(/[.!?]/).filter(s => s.trim());
      
      for (const sentence of sentences) {
        if (/决定|选择|使用|修改|创建/.test(sentence)) {
          keyPoints.push(sentence.trim());
        }
      }
    }
    
    return keyPoints.slice(0, 10);
  }
}
```

---

## 📊 查询和分析

### 查询接口
```typescript
class MemoryQuery {
  constructor(private projectPath: string) {}
  
  // 查询相关会话
  async findSessions(criteria: {
    taskId?: string;
    type?: Session['type'];
    dateRange?: { from: Date; to: Date };
  }): Promise<Session[]> {
    const sessionsDir = path.join(this.projectPath, '.ai/memory/sessions');
    const files = await list_dir(sessionsDir);
    
    const sessions = await Promise.all(
      files
        .filter(f => f.endsWith('.json'))
        .map(async f => {
          const content = await read_file({ 
            filePath: path.join(sessionsDir, f) 
          });
          return JSON.parse(content) as Session;
        })
    );
    
    return sessions.filter(session => {
      if (criteria.taskId && session.taskId !== criteria.taskId) return false;
      if (criteria.type && session.type !== criteria.type) return false;
      if (criteria.dateRange) {
        const sessionDate = new Date(session.startTime);
        if (sessionDate < criteria.dateRange.from || sessionDate > criteria.dateRange.to) {
          return false;
        }
      }
      return true;
    });
  }
  
  // 查询决策历史
  async findDecisions(category?: Decision['category']): Promise<Decision[]> {
    const decisionsPath = path.join(
      this.projectPath,
      '.ai/memory/decisions/architecture-decisions.jsonl'
    );
    
    const content = await read_file({ filePath: decisionsPath });
    const lines = content.split('\n').filter(line => line.trim());
    
    const decisions = lines.map(line => JSON.parse(line) as Decision);
    
    if (category) {
      return decisions.filter(d => d.category === category);
    }
    
    return decisions;
  }
  
  // 搜索操作历史
  async searchOperations(keyword: string): Promise<OperationSummary[]> {
    const sessions = await this.findSessions({});
    
    const allOperations = sessions.flatMap(s => s.operations);
    
    return allOperations.filter(op => 
      op.description.toLowerCase().includes(keyword.toLowerCase()) ||
      op.files.some(f => f.includes(keyword))
    );
  }
}
```

---

## 🎓 AI 实施建议

### 何时记录？
```yaml
自动记录:
  - 每次用户输入
  - 每次 AI 响应
  - 每次文件操作
  - 每次决策点

手动标记:
  - 重要决策
  - 架构选择
  - 问题解决方案
```

### 记录内容原则
```yaml
记录:
  ✅ 任务目标和需求
  ✅ 关键决策及原因
  ✅ 操作记录（文件、命令）
  ✅ 错误和解决方案
  ✅ 下一步计划

不记录:
  ❌ 详细代码（太占空间）
  ❌ 临时变量值
  ❌ 重复信息
  ❌ 无关对话
```

### 恢复时机
```yaml
用户明确请求:
  - "继续之前的任务"
  - "我们之前讨论过什么？"
  - "恢复 XXX 任务"

自动检测:
  - 发现未完成的任务
  - 识别相关上下文
  - 提供恢复选项
```

---

**最后更新**: 2026-02-11
