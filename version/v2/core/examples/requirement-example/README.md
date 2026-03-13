# 需求开发示例: 集成限流功能

> **场景**: 在 user-service 项目中集成 flex-rate-limit 限流中间件
> 
> **难度**: ⭐⭐⭐ 中等
> 
> **学习价值**: ⭐⭐⭐⭐⭐ 最常见的需求开发场景

---

## 📋 示例概述

### 背景
user-service 是一个用户管理微服务，使用 Express + MongoDB + TypeScript 技术栈。随着用户量增长，需要添加 API 限流功能，防止滥用和保护服务稳定性。

### 用户需求
"在 user-service 项目添加限流功能，每个用户每分钟最多 100 个请求"

### 期望输出
- 需求文档
- 技术方案文档
- 实施方案文档
- 可运行的代码
- 测试用例

---

## 📂 示例结构

```
requirement-example/
├── README.md                           # 本文件
├── user-input.md                       # 用户原始输入
│
└── outputs/                            # 生成的文档
    ├── 01-需求定义.md                   # 需求文档
    ├── 02-技术方案.md                   # 技术方案
    ├── 03-实施方案/                     # 实施方案（目录）
    │   ├── README.md                   # 实施总索引
    │   └── RateLimitMiddleware.md      # 限流中间件变更
    ├── 04-实施计划.md                    # 实施计划（🔴 强制生成）
    └── scripts/                        # 脚本目录
```

> **注意**: 任务产物文件使用中文命名（FIX-011 决策 2026-02-28），`04-实施计划.md` 为强制生成文件。

> **注意**: 完整示例应包含 `code-changes/` (代码变更) 目录，当前为精简示例，仅展示核心输出文档。
> 当前 `outputs/` 下实际文件仍为旧英文命名（历史遗留），规范要求的产物命名以上方目录树为准。

---

## 🎯 学习要点

### 要点 1: 任务识别
- **输入**: "在 user-service 项目添加限流功能"
- **关键词**: "添加"、"功能"
- **识别结果**: 需求开发
- **工作流**: `01-requirement-dev`

### 要点 2: 上下文收集
AI 需要收集的信息：
- package.json → 了解依赖和脚本
- src/ 目录结构 → 确定代码组织
- 现有中间件 → 保持一致性
- 测试框架 → 编写测试

### 要点 3: 方案设计
技术选型考虑：
- **选择 flex-rate-limit** - 支持 MongoDB，配置灵活
- **中间件模式** - 最小侵入，易于维护
- **配置化** - 支持不同环境不同配置

### 要点 4: 代码实现
关键实现：
- 配置文件: `config/rate-limit.ts`
- 中间件: `src/middleware/rate-limiter.ts`
- 类型定义: `types/rate-limit.d.ts`
- 测试: `test/middleware/rate-limiter.test.ts`

### 要点 5: 验证
验证维度：
- ✅ 类型检查通过
- ✅ Lint 检查通过
- ✅ 测试通过（3/3）
- ✅ 功能验证通过

---

## 🔍 关键决策点

### 决策 1: 存储方案
**问题**: 限流数据存储在哪里？

**选项**:
- A. 内存（不持久化）
- B. Redis（需要额外服务）
- C. MongoDB（已有服务）

**决策**: 选择 C (MongoDB)

**理由**:
- 项目已使用 MongoDB，无需额外依赖
- flex-rate-limit 原生支持 MongoDB
- 数据持久化，重启不丢失

### 决策 2: 限流粒度
**问题**: 按什么维度限流？

**选项**:
- A. 按 IP 地址
- B. 按用户 ID
- C. 按 IP + 用户 ID 组合

**决策**: 选择 B (用户 ID)，未登录用户降级到 IP

**理由**:
- 用户维度更精准
- 避免共享 IP 误伤
- 符合业务需求

### 决策 3: 错误处理
**问题**: 触发限流时如何响应？

**选项**:
- A. 返回 429 + JSON 错误
- B. 返回 429 + HTML 页面
- C. 静默丢弃请求

**决策**: 选择 A (429 + JSON)

**理由**:
- RESTful API 标准
- 客户端可解析
- 提供重试建议

---

## 🚨 常见错误示例

### 错误 1: 忘记安装依赖
```typescript
// ❌ 错误: 直接导入未安装的库
import { rateLimiter } from 'flex-rate-limit'; // Module not found

// ✅ 正确: 先安装依赖
await run_in_terminal({ command: 'npm install flex-rate-limit' });
```

### 错误 2: 配置硬编码
```typescript
// ❌ 错误: 配置写死在代码中
export const rateLimiterMiddleware = rateLimiter({
  maxRequests: 100,
  mongodb: { uri: 'mongodb://localhost:27017/myapp' }
});

// ✅ 正确: 使用环境变量
export const rateLimiterMiddleware = rateLimiter({
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX || '100'),
  mongodb: { uri: process.env.MONGODB_URI! }
});
```

### 错误 3: 缺少类型定义
```typescript
// ❌ 错误: TypeScript 找不到类型
import { rateLimiter } from 'flex-rate-limit'; // Cannot find module

// ✅ 正确: 添加类型定义文件
// types/rate-limit.d.ts
declare module 'flex-rate-limit' {
  export function rateLimiter(config: any): any;
}
```

---

## 📊 执行统计

### 时间分布
```
总耗时: 45 分钟

Step 1: 生成任务 ID              1 分钟    2%
Step 2: 创建输出目录             1 分钟    2%
Step 3: 收集项目上下文           8 分钟   18%
Step 4: 生成需求文档            12 分钟   27%
Step 5: 生成技术方案文档        10 分钟   22%
Step 6: 执行代码实现            10 分钟   22%
Step 7: 生成实施方案文档         2 分钟    4%
Step 8: 验证完成度               1 分钟    2%
```

### 工具使用统计
```
read_file:              8 次   # 读取配置、模板
create_file:            7 次   # 创建文档、代码
run_in_terminal:        6 次   # 安装、测试
list_dir:               3 次   # 分析结构
grep_search:            2 次   # 搜索代码
get_errors:             1 次   # 验证质量
```

### 文件变更统计
```
新增文件:  7 个
修改文件:  2 个
删除文件:  0 个
新增代码:  198 行
```

---

## 🎓 学习检查清单

完成此示例学习后，你应该能够：

### 基础能力
- [ ] 识别"需求开发"类型的用户输入
- [ ] 使用 read_file 收集项目信息
- [ ] 使用 create_file 生成文档
- [ ] 使用 run_in_terminal 安装依赖和运行测试

### 中级能力
- [ ] 从 package.json 分析技术栈
- [ ] 设计符合项目规范的目录结构
- [ ] 选择合适的技术方案（考虑兼容性）
- [ ] 编写符合 TypeScript 规范的代码

### 高级能力
- [ ] 评估不同方案的优缺点
- [ ] 处理配置、类型、测试的完整性
- [ ] 执行全面的质量验证
- [ ] 生成清晰完整的文档

---

## 🔗 相关资源

### 参考文档
- [core/workflows/01-requirement-dev/](../../workflows/01-requirement-dev/) - 需求开发工作流
- [core/templates/core/requirement-template.md](../../templates/core/requirement-template.md) - 需求文档模板
- [core/tools/README.md](../../tools/README.md) - 工具使用手册

### 代码示例
- [outputs/scripts/](./outputs/scripts/) - 安装和测试脚本
- [outputs/](./outputs/) - 完整的文档输出

### 下一步学习
- 参考 `core/workflows/02-bug-fix/` - Bug 修复流程
- 参考 `core/workflows/03-optimization/` - 性能优化方法

---

## 💬 思考题

学习完示例后，思考以下问题：

1. **如果用户没说具体限流规则（100 req/min），AI 应该怎么做？**
   - A. 使用默认值
   - B. 询问用户
   - C. 参考行业标准

2. **如果项目没有 MongoDB，只有 PostgreSQL，应该如何调整方案？**
   - 提示：考虑使用 Redis 或内存存储

3. **如果需要对不同 API 设置不同的限流规则，代码如何调整？**
   - 提示：工厂模式 + 配置映射

4. **如何验证限流功能在高并发下的正确性？**
   - 提示：压力测试 + 监控指标

---

**最后更新**: 2026-02-11
