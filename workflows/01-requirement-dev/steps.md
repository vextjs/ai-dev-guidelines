# 需求开发详细步骤

> 补充 README.md 中的详细执行逻辑

---

## 🔍 Step 1 详解: 生成任务 ID

### 目标
为需求生成唯一且有意义的标识符

### 命名规则
```
格式: REQ-<project>-<YYYYMMDD>-<slug>

组成部分:
- REQ: 固定前缀，表示需求（Requirement）
- project: 项目名（小写字母+连字符）
- YYYYMMDD: 日期（年月日，无分隔符）
- slug: 功能简述（URL 友好格式）

示例:
REQ-user-20260211-rate-limit
REQ-payment-20260211-wechat-pay
REQ-chat-20260211-message-encryption
```

### AI 实现逻辑
```typescript
function generateTaskId(projectName: string, description: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  
  // 将描述转为 slug
  const slug = description
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // 移除特殊字符
    .replace(/\s+/g, '-')     // 空格转为连字符
    .replace(/-+/g, '-')      // 多个连字符合并
    .slice(0, 30);            // 限制长度
  
  return `REQ-${projectName}-${date}-${slug}`;
}
```

### 验证清单
- [ ] 任务 ID 已生成
- [ ] 格式符合规范
- [ ] 项目名称正确
- [ ] 日期为当前日期
- [ ] slug 有意义且简洁

---

## 📁 Step 2 详解: 创建输出目录

### 目标
创建标准化的文档输出目录结构

### 目录结构
```
projects/
└── <project-name>/
    └── requirements/
        └── <task-id>/
            ├── 01-requirement.md      # 需求文档
            ├── 02-technical.md        # 技术方案
            ├── 03-implementation.md   # 实施记录
            ├── 04-integration.md      # 对接文档（可选）
            └── scripts/               # 脚本目录
                ├── install.sh
                └── test.js
```

### AI 执行命令
```bash
# 创建主目录
mkdir -p outputs/<project-name>/requirements/<task-id>/scripts

# 示例
mkdir -p outputs/user-service/requirements/REQ-user-20260211-rate-limit/scripts
```

### 验证清单
- [ ] 目录已创建
- [ ] 路径符合规范
- [ ] scripts 子目录已创建
- [ ] 目录权限正确

---

## 🔎 Step 3 详解: 收集项目上下文

### 目标
理解项目结构、技术栈、依赖关系，为方案设计提供依据

### 收集内容清单

#### 3.1 项目基本信息
```yaml
必须收集:
  - package.json: 依赖版本、脚本命令
  - README.md: 项目说明、架构概览
  - tsconfig.json: TypeScript 配置

可选收集:
  - CHANGELOG.md: 历史变更
  - CONTRIBUTING.md: 开发规范
```

#### 3.2 目录结构分析
```typescript
// AI 应执行的操作
const projectStructure = {
  srcDir: 'src/',          // 源码目录
  configDir: 'config/',    // 配置目录
  middlewareDir: 'src/middleware/', // 中间件目录
  typesDir: 'types/',      // 类型定义
  testDir: 'test/',        // 测试目录
};

// 检查关键目录是否存在
for (const [key, path] of Object.entries(projectStructure)) {
  const exists = await checkPathExists(path);
  console.log(`${key}: ${exists ? '✅' : '❌'}`);
}
```

#### 3.3 技术栈识别
```yaml
检查项:
  - Node.js 版本: package.json -> engines.node
  - 框架: express / koa / fastify
  - 数据库: mongodb / postgresql / mysql
  - 测试框架: jest / mocha / vitest
  - 构建工具: typescript / webpack / vite
```

#### 3.4 依赖分析
```typescript
// 分析现有依赖，避免冲突
interface DependencyAnalysis {
  production: string[];    // 生产依赖
  development: string[];   // 开发依赖
  conflicts: string[];     // 可能的冲突
  suggestions: string[];   // 优化建议
}

// 示例输出
{
  production: ['express@4.18.0', 'mongodb@5.0.0'],
  development: ['typescript@5.0.0', 'vitest@1.0.0'],
  conflicts: [],
  suggestions: ['建议升级 mongodb 到 6.x 版本']
}
```

### AI 工具使用

#### 读取文件
```typescript
// 1. 读取 package.json
const packageJson = await readFile('package.json');
const pkg = JSON.parse(packageJson);

// 2. 读取 README.md（提取架构信息）
const readme = await readFile('README.md');
const architecture = extractArchitecture(readme);

// 3. 检查目录结构
const fileTree = await listDirectory('.', { recursive: true, depth: 2 });
```

#### 搜索代码模式
```typescript
// 查找现有中间件
const middlewareFiles = await searchFiles('src/middleware/**/*.ts');

// 查找配置文件
const configFiles = await searchFiles('config/**/*.{ts,js,json}');

// 查找测试文件
const testFiles = await searchFiles('test/**/*.test.ts');
```

### 输出格式

AI 应在执行日志中输出：
```markdown
✅ 项目上下文收集完成

项目信息:
- 名称: user-service
- 版本: 1.2.0
- Node.js: >=18.0.0
- TypeScript: 5.0.0

技术栈:
- 框架: Express 4.18.0
- 数据库: MongoDB 5.0.0
- 测试: Vitest 1.0.0

目录结构:
- ✅ src/ - 源码目录
- ✅ src/middleware/ - 中间件目录
- ✅ config/ - 配置目录
- ✅ types/ - 类型定义
- ✅ test/ - 测试目录

现有依赖:
- 生产: 15 个包
- 开发: 8 个包
- 冲突: 无

下一步: 生成需求文档...
```

### 验证清单
- [ ] package.json 已读取
- [ ] 目录结构已分析
- [ ] 技术栈已识别
- [ ] 依赖已分析
- [ ] 无冲突或已记录解决方案

---

## 📝 Step 4 详解: 生成需求文档

### 目标
基于用户输入和项目上下文，生成结构化的需求文档

### 文档模板路径
```
templates/requirement-template.md
```

### 生成逻辑

#### 4.1 读取模板
```typescript
const template = await readFile('templates/requirement-template.md');
```

#### 4.2 填充章节

**第 1 章: 需求概述**
```yaml
数据来源: 用户输入
填充内容:
  - 需求背景: 为什么要做这个功能
  - 需求目标: 期望达到什么效果
  - 使用场景: 在什么情况下使用
  - 预期收益: 能带来什么价值
```

**第 2 章: 功能需求**
```yaml
数据来源: 用户输入 + AI 分析
填充内容:
  - 核心功能: 必须实现的功能点
  - 扩展功能: 可选的增强功能
  - 功能边界: 不包含哪些功能
```

**第 3 章: 技术约束**
```yaml
数据来源: 项目上下文
填充内容:
  - 兼容性要求: Node.js 版本、依赖版本
  - 性能要求: 响应时间、吞吐量
  - 安全要求: 认证、授权、加密
```

**第 4 章: 验收标准**
```yaml
数据来源: AI 推断
填充内容:
  - 功能验收: 如何验证功能正确
  - 性能验收: 如何验证性能达标
  - 安全验收: 如何验证安全合规
```

#### 4.3 保存文档
```typescript
const outputPath = `outputs/${projectName}/requirements/${taskId}/01-requirement.md`;
await writeFile(outputPath, filledContent);
```

### 质量检查

AI 应自我检查：
```typescript
const qualityChecks = {
  structure: checkChapterStructure(document),     // 章节完整性
  completeness: checkContentCompleteness(document), // 内容完整性
  clarity: checkClarityScore(document),           // 清晰度评分
  consistency: checkConsistency(document),        // 一致性检查
};

// 如果任何检查失败，重新生成
if (!qualityChecks.allPassed) {
  console.warn('文档质量检查失败，重新生成...');
  return regenerateDocument();
}
```

### 输出确认

AI 应输出：
```markdown
✅ 需求文档已生成

文件路径: outputs/user-service/requirements/REQ-user-20260211-rate-limit/01-requirement.md

文档结构:
- ✅ 第 1 章: 需求概述 (200 字)
- ✅ 第 2 章: 功能需求 (5 个功能点)
- ✅ 第 3 章: 技术约束 (3 项约束)
- ✅ 第 4 章: 验收标准 (6 条标准)

质量评分:
- 完整性: 95%
- 清晰度: 90%
- 一致性: 100%

下一步: 生成技术方案文档...
```

### 验证清单
- [ ] 模板已读取
- [ ] 所有章节已填充
- [ ] 内容准确无误
- [ ] 格式符合规范
- [ ] 文档已保存
- [ ] 质量检查通过

---

## 🛠️ Step 5 详解: 生成技术方案文档

### 目标
设计实现需求的技术方案，包括架构设计、接口设计、数据结构等

### 文档模板路径
```
templates/technical-template.md
```

### 方案设计原则

#### 原则 1: 最小侵入
- 优先使用中间件模式
- 避免修改核心业务逻辑
- 保持现有代码结构

#### 原则 2: 可扩展性
- 支持配置化
- 预留扩展点
- 模块化设计

#### 原则 3: 向后兼容
- 不破坏现有 API
- 支持渐进式升级
- 提供平滑迁移路径

### 生成逻辑

#### 5.1 架构设计
```yaml
内容:
  - 整体架构图
  - 模块划分
  - 数据流向
  - 依赖关系

示例:
  ```
  [Client] → [Middleware Layer] → [Business Logic] → [Database]
               ↑
           [Rate Limiter]
  ```
```

#### 5.2 接口设计
```typescript
// 设计新增的 API 或修改的接口
interface RateLimiterConfig {
  maxRequests: number;      // 最大请求数
  windowMs: number;         // 时间窗口（毫秒）
  keyGenerator?: (req) => string; // 键生成函数
  handler?: (req, res) => void;   // 限流处理函数
}

// 中间件签名
function rateLimiter(config: RateLimiterConfig): Middleware;
```

#### 5.3 数据结构设计
```typescript
// MongoDB 集合设计（如需要持久化）
interface RateLimitRecord {
  key: string;              // 限流键（如用户 ID）
  count: number;            // 请求计数
  resetAt: Date;            // 重置时间
  createdAt: Date;          // 创建时间
  updatedAt: Date;          // 更新时间
}
```

#### 5.4 技术选型
```yaml
依赖选择:
  - 库名: flex-rate-limit
  - 版本: ^1.0.0
  - 理由: 
    - 支持 MongoDB 存储
    - 配置灵活
    - 性能优秀（1000+ req/s）
  - 替代方案: express-rate-limit（但不支持 MongoDB）
```

#### 5.5 风险评估
```yaml
风险项:
  - 风险 1: 高并发下 MongoDB 性能瓶颈
    影响: 中
    概率: 低
    缓解: 使用 Redis 作为缓存层
  
  - 风险 2: 时钟不同步导致限流不准确
    影响: 低
    概率: 低
    缓解: 使用服务器时间，避免客户端时间
```

### 保存文档
```typescript
const outputPath = `outputs/${projectName}/requirements/${taskId}/02-technical.md`;
await writeFile(outputPath, technicalDoc);
```

### 输出确认
```markdown
✅ 技术方案文档已生成

文件路径: outputs/user-service/requirements/REQ-user-20260211-rate-limit/02-technical.md

方案概要:
- 架构模式: 中间件模式
- 技术选型: flex-rate-limit v1.0.0
- 存储方案: MongoDB
- 侵入程度: 最小（仅添加中间件）

关键设计:
- ✅ 接口设计 (3 个接口)
- ✅ 数据结构 (1 个集合)
- ✅ 配置项 (5 个参数)
- ✅ 错误处理 (3 种场景)

风险评估:
- 识别风险: 2 项
- 高风险: 0 项
- 缓解措施: 已制定

下一步: 执行代码实现...
```

### 验证清单
- [ ] 架构设计合理
- [ ] 接口设计完整
- [ ] 数据结构符合规范
- [ ] 技术选型有依据
- [ ] 风险已评估
- [ ] 文档已保存

---

## 💻 Step 6 详解: 执行代码实现

### 目标
按技术方案实施代码变更，包括安装依赖、编写代码、编写测试

### 实施步骤

#### 6.1 安装依赖
```bash
# AI 执行命令
cd /path/to/project
npm install flex-rate-limit --save

# 或 pnpm
pnpm add flex-rate-limit
```

**验证安装**
```typescript
// 检查 package.json
const pkg = JSON.parse(await readFile('package.json'));
const installed = pkg.dependencies['flex-rate-limit'];
console.log(`✅ flex-rate-limit@${installed} 已安装`);
```

#### 6.2 创建配置文件
```typescript
// config/rate-limit.ts
import type { RateLimiterConfig } from 'flex-rate-limit';

export const rateLimitConfig: RateLimiterConfig = {
  maxRequests: 100,
  windowMs: 60 * 1000, // 1 分钟
  mongodb: {
    uri: process.env.MONGODB_URI!,
    collectionName: 'rate_limits',
  },
  keyGenerator: (req) => {
    return req.user?.id || req.ip;
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too Many Requests',
      message: '请求过于频繁，请稍后再试',
      retryAfter: 60,
    });
  },
};
```

#### 6.3 创建中间件
```typescript
// src/middleware/rate-limiter.ts
import { rateLimiter } from 'flex-rate-limit';
import { rateLimitConfig } from '../config/rate-limit';

export const rateLimiterMiddleware = rateLimiter(rateLimitConfig);

// 导出便捷函数
export function createRateLimiter(customConfig?: Partial<RateLimiterConfig>) {
  return rateLimiter({
    ...rateLimitConfig,
    ...customConfig,
  });
}
```

#### 6.4 集成到应用
```typescript
// src/app.ts
import express from 'express';
import { rateLimiterMiddleware } from './middleware/rate-limiter';

const app = express();

// 全局限流
app.use(rateLimiterMiddleware);

// 或针对特定路由
app.post('/api/login', rateLimiterMiddleware, loginHandler);

export default app;
```

#### 6.5 添加类型定义
```typescript
// types/rate-limit.d.ts
declare module 'flex-rate-limit' {
  import type { Request, Response, NextFunction } from 'express';
  
  export interface RateLimiterConfig {
    maxRequests: number;
    windowMs: number;
    mongodb?: {
      uri: string;
      collectionName: string;
    };
    keyGenerator?: (req: Request) => string;
    handler?: (req: Request, res: Response) => void;
  }
  
  export function rateLimiter(config: RateLimiterConfig): 
    (req: Request, res: Response, next: NextFunction) => Promise<void>;
}
```

#### 6.6 编写测试
```typescript
// test/middleware/rate-limiter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../src/app';

describe('Rate Limiter Middleware', () => {
  beforeEach(async () => {
    // 清理测试数据
    await clearRateLimitRecords();
  });

  it('应该允许限制内的请求', async () => {
    const responses = await Promise.all(
      Array(50).fill(null).map(() => 
        request(app).get('/api/test')
      )
    );
    
    responses.forEach(res => {
      expect(res.status).toBe(200);
    });
  });

  it('应该拒绝超过限制的请求', async () => {
    // 发送 101 个请求
    const responses = await Promise.all(
      Array(101).fill(null).map(() => 
        request(app).get('/api/test')
      )
    );
    
    // 前 100 个应该成功
    expect(responses.slice(0, 100).every(r => r.status === 200)).toBe(true);
    
    // 第 101 个应该被限流
    expect(responses[100].status).toBe(429);
    expect(responses[100].body.error).toBe('Too Many Requests');
  });

  it('应该在时间窗口重置后允许新请求', async () => {
    // 触发限流
    await Promise.all(
      Array(100).fill(null).map(() => request(app).get('/api/test'))
    );
    
    // 等待时间窗口重置
    await sleep(60 * 1000);
    
    // 新请求应该成功
    const res = await request(app).get('/api/test');
    expect(res.status).toBe(200);
  });
});
```

#### 6.7 创建安装脚本
```bash
# scripts/install-rate-limit.sh
#!/bin/bash

echo "📦 安装 flex-rate-limit..."
npm install flex-rate-limit --save

echo "✅ 依赖已安装"

echo "🔧 检查配置..."
if [ ! -f "config/rate-limit.ts" ]; then
  echo "❌ 配置文件不存在: config/rate-limit.ts"
  exit 1
fi

echo "✅ 配置文件存在"

echo "🧪 运行测试..."
npm test -- test/middleware/rate-limiter.test.ts

echo "✅ 限流功能安装完成"
```

### 代码质量检查

AI 应自动执行：
```typescript
// 1. 类型检查
await runCommand('npx tsc --noEmit');

// 2. Lint 检查
await runCommand('npx eslint src/middleware/rate-limiter.ts');

// 3. 格式化
await runCommand('npx prettier --write src/middleware/rate-limiter.ts');

// 4. 运行测试
await runCommand('npm test -- rate-limiter.test.ts');
```

### 输出确认
```markdown
✅ 代码实现完成

变更文件:
- ✅ package.json (添加依赖)
- ✅ config/rate-limit.ts (配置文件)
- ✅ src/middleware/rate-limiter.ts (中间件实现)
- ✅ src/app.ts (集成到应用)
- ✅ types/rate-limit.d.ts (类型定义)
- ✅ test/middleware/rate-limiter.test.ts (测试文件)
- ✅ scripts/install-rate-limit.sh (安装脚本)

代码质量:
- ✅ 类型检查通过
- ✅ Lint 检查通过
- ✅ 测试通过 (3/3)
- ✅ 代码已格式化

下一步: 生成实施记录文档...
```

### 验证清单
- [ ] 依赖已安装
- [ ] 代码已编写
- [ ] 类型定义已添加
- [ ] 测试已编写
- [ ] 测试已通过
- [ ] 代码质量检查通过
- [ ] 脚本已创建

---

## 📋 Step 7 详解: 生成实施记录文档

### 目标
记录实施过程的详细信息，便于回顾和维护

### 文档模板路径
```
templates/implementation-template.md
```

### 生成内容

#### 7.1 变更清单
```markdown
## 文件变更

### 新增文件
- config/rate-limit.ts (配置文件, 45 行)
- src/middleware/rate-limiter.ts (中间件, 28 行)
- types/rate-limit.d.ts (类型定义, 18 行)
- test/middleware/rate-limiter.test.ts (测试, 85 行)
- scripts/install-rate-limit.sh (脚本, 20 行)

### 修改文件
- package.json (+1 依赖)
- src/app.ts (+2 行, 导入并使用中间件)

### 删除文件
- 无
```

#### 7.2 代码片段
```markdown
## 关键代码

### 中间件实现
```typescript
// src/middleware/rate-limiter.ts
import { rateLimiter } from 'flex-rate-limit';
import { rateLimitConfig } from '../config/rate-limit';

export const rateLimiterMiddleware = rateLimiter(rateLimitConfig);
```

### 集成到应用
```typescript
// src/app.ts
import { rateLimiterMiddleware } from './middleware/rate-limiter';

// 全局限流
app.use(rateLimiterMiddleware);
```
```

#### 7.3 测试结果
```markdown
## 测试结果

```bash
$ npm test -- rate-limiter.test.ts

✓ test/middleware/rate-limiter.test.ts (3)
  ✓ Rate Limiter Middleware (3)
    ✓ 应该允许限制内的请求
    ✓ 应该拒绝超过限制的请求
    ✓ 应该在时间窗口重置后允许新请求

Test Files  1 passed (1)
     Tests  3 passed (3)
  Duration  2.45s
```
```

#### 7.4 部署说明
```markdown
## 部署步骤

### 1. 安装依赖
```bash
npm install flex-rate-limit --save
```

### 2. 配置环境变量
```bash
# .env
MONGODB_URI=mongodb://localhost:27017/myapp
```

### 3. 运行测试
```bash
npm test
```

### 4. 启动应用
```bash
npm start
```

### 5. 验证功能
```bash
# 发送测试请求
for i in {1..101}; do
  curl http://localhost:3000/api/test
done

# 第 101 个请求应返回 429
```
```

#### 7.5 注意事项
```markdown
## 注意事项

1. **MongoDB 连接**: 确保 MONGODB_URI 配置正确
2. **时间窗口**: 默认 1 分钟，可在 config/rate-limit.ts 修改
3. **限流键**: 默认使用用户 ID 或 IP，可自定义 keyGenerator
4. **错误处理**: 限流触发时返回 429 状态码
5. **监控**: 建议添加限流指标监控
```

### 保存文档
```typescript
const outputPath = `outputs/${projectName}/requirements/${taskId}/03-implementation.md`;
await writeFile(outputPath, implementationDoc);
```

### 输出确认
```markdown
✅ 实施记录文档已生成

文件路径: outputs/user-service/requirements/REQ-user-20260211-rate-limit/03-implementation.md

文档内容:
- ✅ 变更清单 (7 个文件)
- ✅ 关键代码片段 (3 处)
- ✅ 测试结果 (3 个用例通过)
- ✅ 部署说明 (5 个步骤)
- ✅ 注意事项 (5 项)

下一步: 验证完成度...
```

### 验证清单
- [ ] 变更清单完整
- [ ] 代码片段准确
- [ ] 测试结果真实
- [ ] 部署说明清晰
- [ ] 注意事项完善
- [ ] 文档已保存

---

## ✅ Step 8 详解: 验证完成度

### 目标
全面检查任务是否按要求完成

### 验证维度

#### 8.1 文档完整性
```yaml
检查项:
  - ✅ 01-requirement.md 已生成
  - ✅ 02-technical.md 已生成
  - ✅ 03-implementation.md 已生成
  - ✅ scripts/ 目录已创建
  - ✅ 安装脚本已创建
```

#### 8.2 代码质量
```yaml
检查项:
  - ✅ 类型检查通过
  - ✅ Lint 检查通过
  - ✅ 测试通过 (覆盖率 >= 80%)
  - ✅ 代码已格式化
  - ✅ 无安全漏洞
```

#### 8.3 功能验证
```yaml
检查项:
  - ✅ 限流功能正常工作
  - ✅ 配置项生效
  - ✅ 错误处理正确
  - ✅ 性能达标 (响应时间 < 10ms)
```

#### 8.4 集成验证
```yaml
检查项:
  - ✅ 依赖已安装
  - ✅ 中间件已集成
  - ✅ 应用可正常启动
  - ✅ 不影响现有功能
```

### 验证清单

AI 应生成并输出：
```markdown
## 📋 完成度验证清单

### 文档完整性 ✅
- [x] 需求文档已生成
- [x] 技术方案已生成
- [x] 实施记录已生成
- [x] 脚本文件已创建

### 代码质量 ✅
- [x] TypeScript 类型检查通过
- [x] ESLint 检查通过 (0 errors, 0 warnings)
- [x] 测试通过 (3/3, 覆盖率 85%)
- [x] 代码已格式化

### 功能验证 ✅
- [x] 限流功能正常工作
- [x] 配置项可自定义
- [x] 错误处理符合预期
- [x] 性能达标 (响应时间 5ms)

### 集成验证 ✅
- [x] 依赖安装成功
- [x] 中间件集成成功
- [x] 应用启动正常
- [x] 现有功能未受影响

### 总体评分: 100% ✅
```

### 最终输出

AI 应向用户报告：
```markdown
🎉 任务完成！

任务 ID: REQ-user-20260211-rate-limit
任务类型: 需求开发
执行时长: 45 分钟

📦 输出内容:
- 📄 需求文档: outputs/user-service/requirements/REQ-user-20260211-rate-limit/01-requirement.md
- 📄 技术方案: outputs/user-service/requirements/REQ-user-20260211-rate-limit/02-technical.md
- 📄 实施记录: outputs/user-service/requirements/REQ-user-20260211-rate-limit/03-implementation.md
- 🔧 安装脚本: outputs/user-service/requirements/REQ-user-20260211-rate-limit/scripts/install.sh

✅ 验证结果:
- 文档完整性: 100%
- 代码质量: 100%
- 功能验证: 100%
- 集成验证: 100%

📊 测试覆盖率: 85%
⚡ 性能: 响应时间 5ms

🚀 下一步:
1. 审查生成的文档
2. 在测试环境验证功能
3. 准备部署到生产环境

如需调整或有任何问题，请告知！
```

---

## 🔄 异常处理

### 场景 1: 依赖安装失败
```yaml
问题: npm install 失败
处理:
  1. 检查网络连接
  2. 尝试使用 --registry 参数
  3. 建议使用 pnpm 或 yarn
  4. 记录错误信息
  5. 向用户报告
```

### 场景 2: 测试失败
```yaml
问题: 测试用例不通过
处理:
  1. 分析失败原因
  2. 修复代码或测试
  3. 重新运行测试
  4. 记录修复过程
  5. 更新实施文档
```

### 场景 3: 类型错误
```yaml
问题: TypeScript 类型检查不通过
处理:
  1. 分析类型错误
  2. 补充类型定义
  3. 修复类型不匹配
  4. 重新检查
  5. 更新代码文档
```

---

## 📚 参考资料

- [flex-rate-limit 文档](https://www.npmjs.com/package/flex-rate-limit)
- [Express 中间件指南](https://expressjs.com/en/guide/using-middleware.html)
- [MongoDB 集合设计最佳实践](https://www.mongodb.com/docs/manual/core/data-model-design/)
