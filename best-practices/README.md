# Best Practices - 最佳实践指南

> AI 开发中的高级场景、边界处理和优化策略

---

## 📚 内容导航

本目录包含 AI 开发的最佳实践和高级策略，拆分为多个专题文档：

### 核心实践
- [edge-cases.md](./edge-cases.md) - 边界情况处理
- [token-optimization.md](./token-optimization.md) - Token 限制处理
- [large-projects.md](./large-projects.md) - 大项目开发策略
- [error-handling.md](./error-handling.md) - 错误处理和回滚

### 高级机制
- [memory-management.md](./memory-management.md) - 对话记忆存储
- [compliance-check.md](./compliance-check.md) - 规范检查机制
- [auto-fix.md](./auto-fix.md) - 自动修复机制

---

## 🎯 快速索引

### 按场景查找

#### 遇到异常时
- 网络故障 → [edge-cases.md#网络故障](./edge-cases.md#网络故障)
- 依赖冲突 → [edge-cases.md#依赖冲突](./edge-cases.md#依赖冲突)
- 权限问题 → [edge-cases.md#权限问题](./edge-cases.md#权限问题)
- 磁盘空间不足 → [edge-cases.md#磁盘空间](./edge-cases.md#磁盘空间)

#### Token 不够用时
- 大文件读取 → [token-optimization.md#分段读取](./token-optimization.md#分段读取)
- 项目分析 → [token-optimization.md#摘要生成](./token-optimization.md#摘要生成)
- 长时间任务 → [token-optimization.md#增量上下文](./token-optimization.md#增量上下文)

#### 大项目开发时
- 功能拆分 → [large-projects.md#模块化拆分](./large-projects.md#模块化拆分)
- 分阶段实施 → [large-projects.md#渐进式实施](./large-projects.md#渐进式实施)
- 并发开发 → [large-projects.md#并行协调](./large-projects.md#并行协调)

#### 需要回滚时
- 操作记录 → [error-handling.md#操作日志](./error-handling.md#操作日志)
- 检查点 → [error-handling.md#检查点机制](./error-handling.md#检查点机制)
- 回滚策略 → [error-handling.md#回滚策略](./error-handling.md#回滚策略)

#### 跨会话工作时
- 保存上下文 → [memory-management.md#对话存储](./memory-management.md#对话存储)
- 恢复任务 → [memory-management.md#任务恢复](./memory-management.md#任务恢复)

#### 代码不符合规范时
- 检测违规 → [compliance-check.md#检测机制](./compliance-check.md#检测机制)
- 自动修复 → [auto-fix.md#修复策略](./auto-fix.md#修复策略)

---

## 📖 使用建议

### 学习顺序
1. ✅ 先学习 **edge-cases.md** - 理解常见异常
2. ✅ 再学习 **token-optimization.md** - 掌握资源优化
3. ✅ 然后学习 **large-projects.md** - 应对复杂项目
4. ✅ 最后学习其他高级机制

### 查阅方式
- **遇到问题时**：直接跳转到相关章节
- **开发前预习**：通读相关最佳实践
- **回顾优化**：定期复习改进点

---

## 🔍 文档说明

### 为什么拆分？
```yaml
原因:
  - 单个文件过大（600+ 行）难以阅读
  - AI 加载完整文档消耗大量 Token
  - 按需加载提高效率

好处:
  - 快速定位问题
  - 减少无关内容加载
  - 便于维护和更新
```

### 如何阅读？
```yaml
方式 1: 按顺序学习
  - 适合首次接触
  - 建立完整知识体系

方式 2: 按需查阅
  - 适合解决具体问题
  - 快速找到解决方案

方式 3: 主题深入
  - 适合专项优化
  - 深入理解特定领域
```

---

**最后更新**: 2026-02-12
 
  - 依赖安装失败
  - Git 操作超时
  - API 调用失败

处理策略:
  1. 重试机制（最多 3 次）
  2. 指数退避（1s, 2s, 4s）
  3. 降级方案（如使用本地缓存）
  4. 明确告知用户并等待指示

AI 实现:
  async function installDependencyWithRetry(package: string) {
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await run_in_terminal({
          command: `npm install ${package}`,
          explanation: `安装依赖 (尝试 ${attempt}/3)`
        });
        return { success: true };
      } catch (error) {
        if (attempt < 3) {
          await sleep(Math.pow(2, attempt) * 1000);
          continue;
        }
        
        // 最后一次失败，询问用户
        return {
          success: false,
          error: '依赖安装失败，请检查网络连接',
          suggestedAction: [
            '1. 检查 npm 镜像配置',
            '2. 使用 pnpm 或 yarn 替代',
            '3. 手动下载并安装依赖'
          ]
        };
      }
    }
  }
```

### 情况 2: 依赖冲突
```yaml
问题:
  - 新依赖与现有依赖版本冲突
  - Peer dependencies 不满足

处理策略:
  1. 分析冲突详情
  2. 尝试升级/降级现有依赖
  3. 寻找替代方案
  4. 征询用户意见

AI 实现:
  async function handleDependencyConflict(newPkg: string, conflict: Conflict) {
    // 1. 分析冲突
    const analysis = {
      newPackage: newPkg,
      conflictsWith: conflict.package,
      currentVersion: conflict.currentVersion,
      requiredVersion: conflict.requiredVersion,
      impactedModules: conflict.dependents
    };
    
    // 2. 生成解决方案
    const solutions = [
      {
        type: 'upgrade',
        description: `升级 ${conflict.package} 到 ${conflict.requiredVersion}`,
        risk: assessUpgradeRisk(conflict.package, conflict.requiredVersion)
      },
      {
        type: 'alternative',
        description: `使用替代库 ${findAlternative(newPkg)}`,
        risk: 'low'
      }
    ];
    
    // 3. 向用户报告
    return {
      problem: `依赖冲突: ${newPkg} 需要 ${conflict.package}@${conflict.requiredVersion}，但当前版本为 ${conflict.currentVersion}`,
      solutions,
      recommendation: solutions.find(s => s.risk === 'low')
    };
  }
```

### 情况 3: 磁盘空间不足
```yaml
问题:
  - 创建文件失败
  - 生成大量输出文件
  - 日志文件过大

处理策略:
  1. 检查可用空间
  2. 清理临时文件
  3. 压缩输出文件
  4. 警告用户并停止

AI 实现:
  async function checkDiskSpace(): Promise<DiskSpaceCheck> {
    const availableGB = await getDiskSpace();
    
    if (availableGB < 1) {
      return {
        sufficient: false,
        warning: '磁盘空间不足 1GB，建议清理后继续',
        actions: [
          '清理 node_modules',
          '清理 outputs/ 历史文件',
          '清理系统临时文件'
        ]
      };
    }
    
    return { sufficient: true };
  }
  
  // 在大型操作前检查
  before async function generateLargeDocuments() {
    const spaceCheck = await checkDiskSpace();
    if (!spaceCheck.sufficient) {
      throw new Error(spaceCheck.warning);
    }
    // 继续执行...
  }
```

### 情况 4: 权限问题
```yaml
问题:
  - 无法创建文件/目录
  - Git 操作被拒绝
  - 无法执行脚本

处理策略:
  1. 检测权限错误
  2. 建议修复方法
  3. 尝试降权操作
  4. 明确告知用户

AI 实现:
  async function handlePermissionError(error: Error, path: string) {
    if (error.message.includes('EACCES') || error.message.includes('permission denied')) {
      return {
        problem: `无权限访问: ${path}`,
        solutions: [
          `运行: chmod +x ${path} (Linux/Mac)`,
          `以管理员身份运行 (Windows)`,
          `修改文件所有者: chown $USER ${path}`
        ],
        automaticFix: null  // 权限问题不应自动修复
      };
    }
  }
```

---

## 🎫 Token 限制处理

### 策略 1: 分段读取大文件
```yaml
问题:
  - 大文件一次性读取超过 token 限制
  - 上下文窗口溢出

解决方案:
  async function readLargeFile(filePath: string): Promise<FileContent> {
    const totalLines = await getLineCount(filePath);
    
    if (totalLines > 500) {
      // 分段读取
      const segments = [];
      for (let start = 1; start <= totalLines; start += 500) {
        const end = Math.min(start + 499, totalLines);
        const segment = await read_file({
          filePath,
          startLine: start,
          endLine: end
        });
        segments.push(segment);
      }
      
      return {
        type: 'segmented',
        segments,
        totalLines,
        warning: '文件过大，已分段读取'
      };
    }
    
    return {
      type: 'full',
      content: await read_file({ filePath, startLine: 1, endLine: totalLines })
    };
  }
```

### 策略 2: 摘要生成
```yaml
问题:
  - 需要理解整个项目，但上下文装不下

解决方案:
  async function generateProjectSummary(projectPath: string): Promise<ProjectSummary> {
    // 1. 读取关键文件（package.json, README.md）
    const packageJson = await read_file('package.json');
    const readme = await read_file('README.md', { maxLines: 50 });
    
    // 2. 分析目录结构
    const structure = await analyze_directory_structure(projectPath);
    
    // 3. 统计代码量
    const stats = await getCodeStats(projectPath);
    
    // 4. 生成摘要
    return {
      name: packageJson.name,
      description: packageJson.description,
      techStack: extractTechStack(packageJson),
      structure: summarizeStructure(structure),
      stats: {
        files: stats.fileCount,
        lines: stats.totalLines,
        testCoverage: stats.coverage
      },
      keyModules: identifyKeyModules(structure)
    };
  }
  
  // 使用摘要而非完整内容
  const summary = await generateProjectSummary('.');
  // 后续只根据需要读取具体文件
```

### 策略 3: 增量上下文
```yaml
问题:
  - 长时间任务积累过多上下文

解决方案:
  class ContextManager {
    private context: ContextItem[] = [];
    private maxTokens = 100000;
    
    add(item: ContextItem) {
      this.context.push(item);
      if (this.estimateTokens() > this.maxTokens) {
        this.compress();
      }
    }
    
    compress() {
      // 1. 保留最近的内容
      const recent = this.context.slice(-10);
      
      // 2. 压缩旧内容为摘要
      const old = this.context.slice(0, -10);
      const summary = this.summarize(old);
      
      // 3. 更新上下文
      this.context = [
        { type: 'summary', content: summary },
        ...recent
      ];
    }
    
    summarize(items: ContextItem[]): string {
      // 提取关键信息，丢弃细节
      return items.map(item => ({
        action: item.action,
        result: item.success ? 'success' : 'failed',
        key_info: extractKeyInfo(item)
      })).join('\n');
    }
  }
```

### 策略 4: 按需加载
```yaml
问题:
  - 一次性加载所有模板和规范

解决方案:
  // ❌ 错误：一次性加载所有
  const allTemplates = await loadAllTemplates();
  const allWorkflows = await loadAllWorkflows();
  const allExamples = await loadAllExamples();
  
  // ✅ 正确：按需加载
  async function executeTask(taskType: string) {
    // 只加载当前任务需要的内容
    const workflow = await loadWorkflow(taskType);
    const template = await loadTemplate(taskType);
    const example = await loadExample(taskType);  // 可选
    
    // 执行任务...
  }
```

---

## 🏗️ 大项目开发策略

### 策略 1: 模块化拆分
```yaml
问题:
  - 单次任务涉及多个模块
  - 变更范围过大难以控制

解决方案:
  async function developLargeFeature(feature: LargeFeature) {
    // 1. 分解为子任务
    const subTasks = breakDownFeature(feature);
    
    // 2. 按依赖顺序执行
    const executionPlan = sortByDependencies(subTasks);
    
    // 3. 逐个实现
    for (const task of executionPlan) {
      console.log(`📋 执行子任务: ${task.name}`);
      
      const result = await executeSubTask(task);
      
      if (!result.success) {
        return {
          status: 'partial',
          completed: executionPlan.indexOf(task),
          total: executionPlan.length,
          error: result.error,
          rollbackNeeded: true
        };
      }
    }
    
    return { status: 'completed', tasks: executionPlan.length };
  }
  
  // 示例：微服务拆分
  const feature = {
    name: '用户认证系统',
    subTasks: [
      { name: '数据模型设计', dependencies: [] },
      { name: '认证中间件', dependencies: ['数据模型设计'] },
      { name: 'JWT 工具类', dependencies: [] },
      { name: '登录 API', dependencies: ['认证中间件', 'JWT 工具类'] },
      { name: '注册 API', dependencies: ['认证中间件'] },
      { name: '测试用例', dependencies: ['登录 API', '注册 API'] }
    ]
  };
```

### 策略 2: 渐进式实施
```yaml
问题:
  - 一次性实现风险高
  - 难以验证正确性

解决方案:
  async function incrementalDevelopment(feature: Feature) {
    const phases = [
      {
        name: 'Phase 1: 核心功能',
        scope: ['基本 CRUD', '数据模型'],
        verification: '单元测试'
      },
      {
        name: 'Phase 2: 业务逻辑',
        scope: ['业务规则', '数据验证'],
        verification: '集成测试'
      },
      {
        name: 'Phase 3: 错误处理',
        scope: ['异常处理', '错误日志'],
        verification: '异常测试'
      },
      {
        name: 'Phase 4: 性能优化',
        scope: ['缓存', '索引优化'],
        verification: '性能测试'
      }
    ];
    
    for (const phase of phases) {
      console.log(`🚀 开始 ${phase.name}`);
      
      // 实现当前阶段
      await implementPhase(phase.scope);
      
      // 验证
      const verified = await runVerification(phase.verification);
      if (!verified) {
        return {
          status: 'failed',
          phase: phase.name,
          message: '验证失败，停止后续阶段'
        };
      }
      
      // 提交检查点
      await commitCheckpoint(phase.name);
    }
  }
```

### 策略 3: 并行开发协调
```yaml
问题:
  - 多个 AI 实例同时开发不同模块
  - 代码冲突

解决方案:
  // 文件锁机制
  class FileLockManager {
    private locks = new Map<string, { owner: string; timestamp: number }>();
    
    async acquireLock(filePath: string, owner: string): Promise<boolean> {
      const existing = this.locks.get(filePath);
      
      if (existing) {
        // 检查锁是否过期（5分钟）
        if (Date.now() - existing.timestamp < 5 * 60 * 1000) {
          return false;  // 文件被锁定
        }
        // 锁已过期，可以获取
      }
      
      this.locks.set(filePath, { owner, timestamp: Date.now() });
      return true;
    }
    
    releaseLock(filePath: string, owner: string) {
      const lock = this.locks.get(filePath);
      if (lock && lock.owner === owner) {
        this.locks.delete(filePath);
      }
    }
  }
  
  // 使用锁
  async function editFileWithLock(filePath: string, ownerId: string) {
    const locked = await lockManager.acquireLock(filePath, ownerId);
    
    if (!locked) {
      return {
        success: false,
        message: '文件正在被其他任务编辑，请稍后重试'
      };
    }
    
    try {
      // 执行编辑
      await replace_string_in_file({ filePath, ... });
      return { success: true };
    } finally {
      lockManager.releaseLock(filePath, ownerId);
    }
  }
```

---

## 🔄 错误处理和回滚

### 机制 1: 操作日志
```yaml
实现:
  class OperationLog {
    private operations: Operation[] = [];
    
    record(operation: Operation) {
      this.operations.push({
        ...operation,
        timestamp: Date.now(),
        id: generateId()
      });
    }
    
    async rollback(toOperationId?: string) {
      // 回滚到指定操作，或全部回滚
      const targetIndex = toOperationId
        ? this.operations.findIndex(op => op.id === toOperationId)
        : -1;
      
      const toRollback = this.operations.slice(targetIndex + 1).reverse();
      
      for (const op of toRollback) {
        await this.rollbackOperation(op);
      }
    }
    
    private async rollbackOperation(op: Operation) {
      switch (op.type) {
        case 'create_file':
          await deleteFile(op.filePath);
          break;
        case 'modify_file':
          await restoreFile(op.filePath, op.backup);
          break;
        case 'install_dependency':
          await uninstallDependency(op.package);
          break;
      }
    }
  }
```

### 机制 2: 检查点
```yaml
实现:
  async function executeWithCheckpoints(task: Task) {
    const checkpoints = [];
    
    try {
      // Checkpoint 1: 代码变更前
      checkpoints.push(await createCheckpoint('before-code-changes'));
      await generateCode();
      
      // Checkpoint 2: 测试前
      checkpoints.push(await createCheckpoint('before-tests'));
      await runTests();
      
      // Checkpoint 3: 部署前
      checkpoints.push(await createCheckpoint('before-deployment'));
      await deploy();
      
      return { success: true };
      
    } catch (error) {
      // 回滚到最近的检查点
      const lastCheckpoint = checkpoints[checkpoints.length - 1];
      await rollbackToCheckpoint(lastCheckpoint);
      
      return {
        success: false,
        error,
        rolledBackTo: lastCheckpoint.name
      };
    }
  }
```

---

## 🎯 AI 使用建议

### 边界情况检查清单
```yaml
每次执行任务前:
  - [ ] 检查磁盘空间
  - [ ] 检查网络连接
  - [ ] 检查文件权限
  - [ ] 评估 token 使用量
  - [ ] 确认依赖兼容性

执行过程中:
  - [ ] 记录所有操作
  - [ ] 创建检查点
  - [ ] 监控错误
  - [ ] 验证中间结果

执行完成后:
  - [ ] 验证最终结果
  - [ ] 清理临时文件
  - [ ] 释放资源锁
  - [ ] 记录执行日志
```

---

**最后更新**: 2026-02-11
