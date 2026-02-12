# 边界情况处理

> 处理开发过程中的异常和边界情况

---

## 📋 概述

边界情况是指正常流程之外的异常场景，需要特殊处理以保证系统稳定性。

---

## 🚨 网络故障

### 问题描述
```yaml
常见场景:
  - npm install 失败（网络超时）
  - Git clone/pull 失败
  - API 调用超时
  - 文件下载失败
```

### 处理策略

#### 1. 重试机制
```typescript
async function installDependencyWithRetry(
  package: string,
  maxAttempts: number = 3
): Promise<InstallResult> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await run_in_terminal({
        command: `npm install ${package}`,
        explanation: `安装依赖 (尝试 ${attempt}/${maxAttempts})`
      });
      
      return { 
        success: true,
        message: `依赖 ${package} 安装成功`
      };
      
    } catch (error) {
      if (attempt < maxAttempts) {
        // 指数退避：1s, 2s, 4s
        const waitTime = Math.pow(2, attempt) * 1000;
        await sleep(waitTime);
        continue;
      }
      
      // 最后一次失败，向用户报告
      return {
        success: false,
        error: `依赖安装失败：${error.message}`,
        suggestions: [
          '1. 检查网络连接',
          '2. 尝试使用国内镜像：npm config set registry https://registry.npmmirror.com',
          '3. 使用 pnpm 或 yarn 替代',
          '4. 手动下载并安装依赖'
        ]
      };
    }
  }
}
```

#### 2. 降级方案
```typescript
async function fetchWithFallback(url: string): Promise<Data> {
  try {
    // 尝试从网络获取
    return await fetch(url);
  } catch (networkError) {
    // 降级：使用本地缓存
    const cached = await loadFromCache(url);
    if (cached) {
      console.warn('网络请求失败，使用缓存数据');
      return cached;
    }
    throw networkError;
  }
}
```

#### 3. 用户交互
```yaml
失败后的处理:
  1. 明确告知失败原因
  2. 提供可能的解决方案
  3. 询问用户下一步操作
  4. 不要静默失败

示例输出:
  "❌ 依赖安装失败
   
   错误原因: 网络连接超时
   
   建议操作:
   1. 检查网络连接后重试
   2. 配置 npm 镜像源
   3. 跳过此依赖继续其他任务
   
   请选择: [重试/配置镜像/跳过]"
```

---

## ⚔️ 依赖冲突

### 问题描述
```yaml
常见冲突:
  - 新依赖要求的版本与现有不兼容
  - Peer dependencies 不满足
  - 传递依赖冲突
```

### 处理策略

#### 1. 冲突分析
```typescript
interface DependencyConflict {
  newPackage: string;           // 要安装的包
  conflictsWith: string;        // 冲突的包
  currentVersion: string;       // 当前版本
  requiredVersion: string;      // 需要的版本
  impactedModules: string[];    // 受影响的模块
}

async function analyzeDependencyConflict(
  newPkg: string,
  error: Error
): Promise<ConflictAnalysis> {
  // 解析错误信息
  const conflict = parseConflictError(error);
  
  // 分析影响范围
  const impact = await analyzeImpact(conflict);
  
  // 生成解决方案
  const solutions = generateSolutions(conflict, impact);
  
  return {
    conflict,
    impact,
    solutions,
    recommendation: selectBestSolution(solutions)
  };
}
```

#### 2. 解决方案
```typescript
interface Solution {
  type: 'upgrade' | 'downgrade' | 'alternative' | 'fork';
  description: string;
  risk: 'low' | 'medium' | 'high';
  steps: string[];
}

function generateSolutions(conflict: DependencyConflict): Solution[] {
  return [
    {
      type: 'upgrade',
      description: `升级 ${conflict.conflictsWith} 到 ${conflict.requiredVersion}`,
      risk: assessUpgradeRisk(conflict),
      steps: [
        `npm install ${conflict.conflictsWith}@${conflict.requiredVersion}`,
        '运行测试验证兼容性',
        '如有问题可回滚'
      ]
    },
    {
      type: 'downgrade',
      description: `降级新包到兼容版本`,
      risk: 'low',
      steps: [
        `查找兼容版本: npm view ${conflict.newPackage} versions`,
        `安装兼容版本: npm install ${conflict.newPackage}@<version>`
      ]
    },
    {
      type: 'alternative',
      description: `使用替代库 ${findAlternative(conflict.newPackage)}`,
      risk: 'low',
      steps: [
        `安装替代库`,
        `调整代码适配 API`
      ]
    }
  ];
}
```

#### 3. 风险评估
```typescript
function assessUpgradeRisk(conflict: DependencyConflict): 'low' | 'medium' | 'high' {
  const versionDiff = calculateVersionDiff(
    conflict.currentVersion,
    conflict.requiredVersion
  );
  
  // 主版本变化 = 高风险
  if (versionDiff.major > 0) return 'high';
  
  // 次版本变化 + 影响模块多 = 中风险
  if (versionDiff.minor > 0 && conflict.impactedModules.length > 5) {
    return 'medium';
  }
  
  // 补丁版本 = 低风险
  return 'low';
}
```

---

## 🔒 权限问题

### 问题描述
```yaml
常见场景:
  - 无法创建/修改文件（EACCES）
  - Git 操作被拒绝
  - 无法执行脚本（权限不足）
```

### 处理策略

#### 1. 权限检测
```typescript
async function detectPermissionError(error: Error): Promise<PermissionIssue | null> {
  const permissionKeywords = ['EACCES', 'EPERM', 'permission denied', 'access denied'];
  
  if (!permissionKeywords.some(kw => error.message.includes(kw))) {
    return null;
  }
  
  // 提取路径
  const path = extractPathFromError(error);
  
  return {
    type: 'permission',
    path,
    operation: extractOperation(error),
    error: error.message
  };
}
```

#### 2. 解决建议
```typescript
function suggestPermissionFix(issue: PermissionIssue): PermissionFix {
  const fixes: string[] = [];
  
  // Linux/Mac 解决方案
  if (process.platform !== 'win32') {
    fixes.push(
      `# 修改文件权限
chmod +x ${issue.path}

# 修改所有者
sudo chown $USER ${issue.path}

# 如果是目录
chmod -R 755 ${issue.path}`
    );
  }
  
  // Windows 解决方案
  else {
    fixes.push(
      `# 以管理员身份运行
右键点击终端 → "以管理员身份运行"

# 或修改文件属性
右键文件 → 属性 → 安全 → 编辑权限`
    );
  }
  
  return {
    problem: `无权限${issue.operation} ${issue.path}`,
    solutions: fixes,
    autoFixAvailable: false,  // 权限问题不应自动修复
    userActionRequired: true
  };
}
```

#### 3. 安全原则
```yaml
权限处理原则:
  ✅ 检测权限错误
  ✅ 提供修复建议
  ❌ 不自动修改权限（安全风险）
  ❌ 不建议使用 sudo（除非必要）
  ✅ 明确告知用户风险
```

---

## 💾 磁盘空间不足

### 问题描述
```yaml
常见场景:
  - 创建文件失败（ENOSPC）
  - node_modules 占用过大
  - 日志文件膨胀
  - 构建产物积累
```

### 处理策略

#### 1. 空间检查
```typescript
async function checkDiskSpace(requiredGB: number = 1): Promise<DiskSpaceCheck> {
  const { available } = await getDiskInfo(process.cwd());
  const availableGB = available / (1024 ** 3);
  
  if (availableGB < requiredGB) {
    return {
      sufficient: false,
      available: availableGB,
      required: requiredGB,
      warning: `磁盘空间不足 ${requiredGB}GB，当前可用 ${availableGB.toFixed(2)}GB`,
      suggestions: await generateCleanupSuggestions()
    };
  }
  
  return { sufficient: true, available: availableGB };
}
```

#### 2. 清理建议
```typescript
async function generateCleanupSuggestions(): Promise<CleanupSuggestion[]> {
  const suggestions: CleanupSuggestion[] = [];
  
  // 检查 node_modules
  const nodeModulesSize = await getDirectorySize('node_modules');
  if (nodeModulesSize > 500 * 1024 * 1024) {  // > 500MB
    suggestions.push({
      type: 'node_modules',
      size: nodeModulesSize,
      command: 'rm -rf node_modules && npm install',
      description: '清理并重新安装依赖',
      savings: nodeModulesSize
    });
  }
  
  // 检查构建产物
  const distSize = await getDirectorySize('dist');
  if (distSize > 0) {
    suggestions.push({
      type: 'build',
      size: distSize,
      command: 'rm -rf dist',
      description: '删除构建产物',
      savings: distSize
    });
  }
  
  // 检查日志文件
  const logFiles = await findLogFiles('.');
  const logSize = sumFileSizes(logFiles);
  if (logSize > 100 * 1024 * 1024) {  // > 100MB
    suggestions.push({
      type: 'logs',
      size: logSize,
      command: 'find . -name "*.log" -delete',
      description: '删除日志文件',
      savings: logSize
    });
  }
  
  return suggestions;
}
```

#### 3. 预防措施
```yaml
开发规范:
  - 定期清理 node_modules
  - 使用 .gitignore 忽略大文件
  - 日志文件轮转（log rotation）
  - 构建产物及时清理

监控建议:
  - 设置磁盘空间阈值告警（< 10%）
  - 大型操作前预检查
  - 定期清理脚本
```

---

## 🔄 其他常见边界情况

### 1. 编码问题
```yaml
问题: 文件编码不一致导致乱码

解决:
  - 统一使用 UTF-8
  - 读取时指定编码
  - 转换工具: iconv

示例:
  const content = await readFile(path, { encoding: 'utf-8' });
```

### 2. 路径问题
```yaml
问题: 
  - Windows/Linux 路径分隔符不同
  - 相对路径错误
  - 路径包含空格

解决:
  - 使用 path.join() 而非字符串拼接
  - 使用绝对路径
  - 路径包含空格时加引号

示例:
  import path from 'path';
  const filePath = path.join(__dirname, 'config', 'database.ts');
```

### 3. 时区问题
```yaml
问题: 服务器和客户端时区不一致

解决:
  - 统一使用 UTC 存储
  - 显示时转为本地时区
  - 使用 dayjs 处理时区

示例:
  import dayjs from 'dayjs';
  import utc from 'dayjs/plugin/utc';
  dayjs.extend(utc);
  
  const utcTime = dayjs().utc();
```

### 4. 并发竞态
```yaml
问题: 多个操作同时修改同一资源

解决:
  - 文件锁
  - 数据库事务
  - 乐观锁/悲观锁

示例: 见 large-projects.md#并行协调
```

---

## 📊 边界情况检查清单

### 执行前检查
```yaml
- [ ] 网络连接正常
- [ ] 磁盘空间充足（>1GB）
- [ ] 文件权限正确
- [ ] 依赖兼容性
- [ ] 环境变量配置
```

### 执行中监控
```yaml
- [ ] 错误捕获和记录
- [ ] 进度反馈
- [ ] 超时检测
- [ ] 资源使用监控
```

### 执行后清理
```yaml
- [ ] 临时文件清理
- [ ] 锁释放
- [ ] 连接关闭
- [ ] 日志记录
```

---

## 🎯 AI 实施建议

### 何时检查边界情况？
```yaml
关键节点:
  - 安装依赖前
  - 创建大量文件前
  - 执行长时间操作前
  - Git 操作前
```

### 如何报告错误？
```yaml
格式:
  ❌ [操作] 失败
  
  原因: [具体错误信息]
  
  建议:
  1. [解决方案 1]
  2. [解决方案 2]
  3. [解决方案 3]
  
  需要帮助？[提供更多上下文]
```

---

**最后更新**: 2026-02-11
