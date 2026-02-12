# Projects - 项目特定规范

> 每个项目的特定开发规范、技术约束和配置

---

## 📋 目录说明

### 通用规范 vs 项目规范

```yaml
通用规范 (workflows/):
  - 适用于所有项目的标准流程
  - 任务识别、文档模板、验证标准
  - 技术无关的开发方法论

项目规范 (projects/):
  - 特定项目的技术栈约束
  - 项目特有的命名规范
  - 项目架构和模块说明
  - 特殊流程和注意事项
```

---

## 📂 目录结构

```
projects/
├── README.md                          # 本文件
├── _template/                         # 项目规范模板
│   ├── INDEX.md                      # 模板索引
│   ├── PROJECT-PROFILE.md            # 项目概况
│   ├── TECH-STACK.md                 # 技术栈说明
│   ├── CODE-STANDARDS.md             # 代码规范
│   ├── TESTING.md                    # 测试规范
│   ├── DEPENDENCIES-VERSION.md       # 依赖版本管理
│   ├── DEPENDENCIES-UPDATES.md       # 依赖更新策略
│   ├── CI-CD-OVERVIEW.md             # CI/CD 概览
│   ├── CI-CD-IMPLEMENTATION.md       # CI/CD 实施
│   ├── CI-CD-QUALITY-GATES.md        # CI/CD 质量门禁
│   ├── MONITORING-METRICS.md         # 监控指标
│   ├── MONITORING-DASHBOARD.md       # 监控面板
│   └── MONITORING-ALERTS.md          # 告警配置
│
├── <project-name>/                    # 具体项目目录
│   ├── PROJECT-PROFILE.md            # 必需文件
│   ├── TECH-STACK.md                 # 必需文件
│   ├── CODE-STANDARDS.md             # 必需文件
│   ├── requirements/                 # 需求开发输出
│   ├── bugs/                         # Bug 修复输出
│   ├── research/                     # 技术调研输出
│   └── ...                           # 其他输出目录
│
└── ...                                # 其他项目
```

---

## 🎯 项目规范包含内容

### 1. PROJECT-PROFILE.md（项目概况）
```yaml
内容:
  - 项目名称和描述
  - 仓库地址
  - 主要负责人
  - 依赖服务列表
  - 环境清单（开发、测试、生产）
  - 监控和日志地址
```

### 2. TECH-STACK.md（技术栈说明）
```yaml
内容:
  - 编程语言和版本
  - 框架和版本（Express/Koa/Fastify）
  - 数据库（MongoDB/PostgreSQL/Redis）
  - 测试框架（Jest/Vitest/Mocha）
  - 构建工具（TypeScript/Webpack/Vite）
  - 依赖包约束（必须/禁止/推荐）
```

### 3. CODE-STANDARDS.md（代码规范）
```yaml
内容:
  - 命名规范（变量/函数/类/文件）
  - 目录结构约定
  - 导入顺序规则
  - 注释规范
  - 错误处理模式
  - 日志规范
  - API 设计规范
```

### 4. DEPLOYMENT.md（部署流程）
```yaml
内容:
  - 构建命令
  - 部署步骤
  - 环境变量配置
  - 数据库迁移流程
  - 回滚策略
  - 健康检查端点
```

### 5. ARCHITECTURE.md（架构说明）
```yaml
内容:
  - 系统架构图
  - 模块划分
  - 数据流向
  - 关键接口
  - 性能要求
  - 安全要求
```

---

## 🔧 AI 使用项目规范

### Step 1: 识别项目
```typescript
// 从用户输入中提取项目名
用户输入: "在 user-service 添加限流功能"
项目名: "user-service"
```

### Step 2: 读取项目规范
```typescript
// 按优先级读取项目文档
const projectDocs = [
  'projects/user-service/PROJECT-PROFILE.md',   // 必读
  'projects/user-service/TECH-STACK.md',        // 必读
  'projects/user-service/CODE-STANDARDS.md',    // 必读
  'projects/user-service/ARCHITECTURE.md',      // 可选
  'projects/user-service/DEPLOYMENT.md'         // 需要时读
];

for (const doc of projectDocs.slice(0, 3)) {
  const content = await read_file(doc);
  projectContext.add(content);
}
```

### Step 3: 应用项目约束
```typescript
// 示例：根据项目技术栈选择方案
if (projectTechStack.database === 'MongoDB') {
  // 选择支持 MongoDB 的限流库
  selectedLibrary = 'flex-rate-limit';
} else if (projectTechStack.database === 'PostgreSQL') {
  // 选择其他方案
  selectedLibrary = 'rate-limiter-flexible';
}

// 示例：遵守项目命名规范
if (projectCodeStandards.naming.middleware === 'camelCase') {
  middlewareName = 'rateLimiterMiddleware'; // camelCase
} else {
  middlewareName = 'rate_limiter_middleware'; // snake_case
}
```

### Step 4: 验证项目兼容性
```typescript
// 检查是否符合项目约束
const validations = [
  checkNodeVersion(projectTechStack.node),
  checkDependencyConflicts(projectTechStack.forbidden),
  checkDirectoryStructure(projectCodeStandards.structure),
  checkNamingConventions(projectCodeStandards.naming)
];

const allPassed = validations.every(v => v.passed);
```

---

## 📝 创建新项目规范

### 方式 1: 使用模板
```bash
# 复制模板
cp -r projects/_template projects/new-service

# 填充内容
# 编辑 PROJECT-PROFILE.md、TECH-STACK.md 等
```

### 方式 2: AI 自动生成
```typescript
// AI 执行
用户输入: "为 order-service 项目创建规范文档"

AI 流程:
1. 读取 projects/_template/ 下的所有模板
2. 分析 order-service 项目代码
3. 提取技术栈、命名规范、架构信息
4. 填充模板生成项目规范
5. 保存到 projects/order-service/
```

---

## 🚨 项目规范优先级

### 规则冲突时的优先级
```yaml
优先级（从高到低）:
  1. 项目规范 (projects/<project>/)
     - 最高优先级，必须遵守
  
  2. 通用规范 (workflows/)
     - 项目规范未定义时使用
  
  3. 行业标准
     - 以上都未定义时参考行业最佳实践

示例:
  - 如果 user-service 规定变量用 camelCase
  - 即使通用规范建议 snake_case
  - 也必须使用 camelCase（项目规范优先）
```

---

## 📊 项目规范维护

### 维护责任
```yaml
创建时机:
  - 新项目启动时
  - 现有项目首次接入 AI 辅助开发时

更新时机:
  - 技术栈升级
  - 架构重大调整
  - 开发规范变更
  - 部署流程变化

维护原则:
  - 保持文档同步
  - 定期审查过时内容
  - 记录变更历史
```

### 版本管理
```yaml
建议:
  - 项目规范随项目代码一起版本管理
  - 重大变更打 tag（如 v1.0.0）
  - 在 PROJECT-PROFILE.md 记录版本历史
```

---

## 🎯 常见场景示例

### 场景 1: 多项目通用组件
```yaml
问题: 一个功能需要应用到多个项目

处理:
  1. 在通用规范中定义标准流程
  2. 在各项目规范中定义差异点
  3. AI 根据项目规范调整实现

示例:
  - 通用: workflows/01-requirement-dev/
  - user-service: 使用 MongoDB
  - payment-service: 使用 PostgreSQL
  - AI 根据各项目技术栈选择不同实现
```

### 场景 2: 项目特有流程
```yaml
问题: 某个项目有特殊部署流程

处理:
  1. 在 projects/<project>/DEPLOYMENT.md 详细说明
  2. AI 执行时优先读取项目部署文档
  3. 按项目特定流程执行

示例:
  - payment-service 部署前需要金融合规审批
  - 在 DEPLOYMENT.md 中明确说明审批步骤
  - AI 生成部署文档时包含审批环节
```

### 场景 3: 项目间依赖
```yaml
问题: 项目 A 依赖项目 B 的服务

处理:
  1. 在 PROJECT-PROFILE.md 的 dependencies 字段列出
  2. AI 开发涉及依赖服务的功能时
  3. 自动读取依赖服务的接口文档

示例:
  - user-service 依赖 auth-service
  - AI 开发用户认证功能时
  - 自动读取 projects/auth-service/API.md
```

---

## 🔍 检查清单

### 项目规范完整性检查
- [ ] PROJECT-PROFILE.md 已创建
- [ ] TECH-STACK.md 已创建
- [ ] CODE-STANDARDS.md 已创建
- [ ] 技术栈版本信息完整
- [ ] 命名规范明确
- [ ] 架构图清晰
- [ ] 部署流程可操作

### AI 使用项目规范检查
- [ ] AI 能正确识别项目名
- [ ] AI 优先读取项目规范
- [ ] AI 生成的代码符合项目规范
- [ ] AI 生成的文档符合项目要求
- [ ] 项目特有流程得到遵守

---

## 📚 参考资源

- [_template/](./_template/) - 项目规范模板
- [../workflows/](../workflows/) - 通用开发流程
- [../templates/](../templates/) - 通用文档模板

---

**最后更新**: 2026-02-12
