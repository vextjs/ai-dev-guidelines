# Projects - 项目特定规范

> 每个项目的特定开发规范、技术约束和配置

---

## 📋 现有项目

| 项目 | 描述 | 规范入口 |
|-----|------|---------|
| `_template` | 项目规范模板 | `_template/profile/README.md` |
| `chat` | AITA 核心聊天服务（对话、行程、AI Agent） | `chat/profile/README.md` |
| `ai-dev-guidelines` | AI 开发执行手册（本项目） | `ai-dev-guidelines/profile/README.md` |
| `monSQLize` | 轻量级 MongoDB ORM（多级缓存 + Saga 事务 + 122 操作符） | `monSQLize/profile/README.md` |
| `user-service` | 用户服务（示例项目） | `user-service/profile/README.md` |

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
├── _template/                         # 🔴 项目规范模板
│   ├── README.md                     # 项目顶层索引模板
│   ├── TASK-INDEX.md                 # 任务索引模板
│   └── profile/                      # 模块化规范模板
│       ├── README.md                 # 规范入口（索引所有模块文件）
│       ├── 01-项目信息.md             # 项目路径、技术栈、目录结构
│       ├── 02-架构约束.md             # 强制禁止项（P0）
│       ├── 03-代码风格.md             # 命名规范、缩进格式
│       └── CHANGELOG.md              # 版本变更日志
│       （按项目需要可增加更多模块文件）
│
├── chat/                              # chat 项目（参考实例）
│   ├── README.md                     # 项目顶层索引
│   ├── TASK-INDEX.md                 # 任务索引
│   └── profile/                      # 模块化规范（9 文件）
│       ├── README.md
│       ├── 01-项目信息.md
│       ├── ...
│       └── CHANGELOG.md
│
├── <project-name>/                    # 具体项目目录
│   ├── README.md                     # 项目顶层索引（指向 profile/）
│   ├── TASK-INDEX.md                 # 📋 任务索引（追溯历史任务）
│   ├── profile/                      # 🔴 项目规范（模块化）
│   │   ├── README.md                 # 规范入口 + AI 遵循声明
│   │   ├── 01-项目信息.md             # 必需
│   │   ├── 02-架构约束.md             # 必需
│   │   ├── 03-代码风格.md             # 必需
│   │   ├── 04-错误处理与多语言.md      # 推荐
│   │   ├── ...                       # 更多模块
│   │   └── CHANGELOG.md
│   ├── requirements/                 # 需求开发输出（归档，提交 git）
│   ├── bugs/                         # Bug 修复输出（归档，提交 git）
│   ├── optimizations/                # 优化方案输出（归档，提交 git）
│   └── research/                     # 技术调研输出（归档，提交 git）
│
└── ...                                # 其他项目
```

### AI 工作目录

`reports/` 和 `.ai-memory/` 统一存放在 `ai-dev-guidelines/projects/<project>/` 下，与正式归档文档同级：

```
projects/<project>/                    # 如 projects/chat/
├── profile/                          # 🔴 项目规范
├── TASK-INDEX.md                     # 📋 任务索引
├── requirements/                     # 需求开发输出（归档，提交 git）
├── bugs/                             # Bug 修复输出（归档，提交 git）
├── optimizations/                    # 优化方案输出（归档，提交 git）
├── research/                         # 技术调研输出（归档，提交 git）
│
├── reports/                          # 📊 AI 临时报告（gitignore 忽略）
│   ├── diagnostics/                  # 诊断分析
│   ├── bugs/                         # Bug 分析
│   ├── requirements/                 # 需求分析
│   └── .temp/                        # 中间过程文件（可随时清理）
│
└── .ai-memory/                       # 🧠 AI 任务记忆（gitignore 忽略）
    ├── SUMMARY.md                    # 总摘要（AI 首先读取）
    └── tasks/                        # 各任务的详细记忆
        └── <date>-<type>-<id>.md
```

> **为什么在 ai-dev-guidelines/projects/ 下？**
> - 统一管理：与项目规范（profile/）、正式归档文档（requirements/ 等）在同一目录树下
> - 不污染业务源码目录
> - ai-dev-guidelines 是独立仓库，跨工作区不丢失
> - reports/ 和 .ai-memory/ 加入 ai-dev-guidelines/.gitignore 忽略即可

### 🔴 强制规则：模块化结构

所有项目规范**必须**按模块化拆分到 `profile/` 子目录，**禁止**在项目根目录平铺规范文件或生成单一 `PROJECT.md`。

**必需文件**（`profile/` 下，所有项目）：

| 文件 | 内容 | 优先级 |
|------|------|--------|
| `profile/README.md` | 规范索引 + AI 遵循声明 | P0 必需 |
| `profile/01-项目信息.md` | 项目路径、技术栈、目录结构 | P0 必需 |
| `profile/02-架构约束.md` | 强制禁止项 | P0 必需 |
| `profile/03-代码风格.md` | 命名规范、缩进格式 | P0 必需 |
| `profile/CHANGELOG.md` | 版本变更日志 | P1 推荐 |

**推荐文件**（`profile/` 下，视项目复杂度）：

| 文件 | 内容 | 适用场景 |
|------|------|---------|
| `profile/04-错误处理与多语言.md` | 错误处理规范 | 有多语言需求 |
| `profile/05-参数校验规范.md` | 参数校验方式 | API 服务 |
| `profile/06-中间件规范.md` | 中间件使用 | Egg.js / Express / Koa |
| `profile/07-路由与接口规范.md` | 路由分组、鉴权 | API 服务 |
| `profile/XX-<项目特有>.md` | 项目独有模块 | 如 AI 架构、微服务通信 |

**项目根目录文件**：

| 文件 | 内容 | 优先级 |
|------|------|--------|
| `README.md` | 项目顶层索引（指向 profile/ + 列出任务输出目录） | P0 必需 |

---

## 🎯 模块化规范参考实例

### chat 项目（完整参考）

```
projects/chat/
├── README.md                   ← 项目顶层索引
├── profile/                    ← 项目规范
│   ├── README.md               ← 规范入口 + AI 遵循声明
│   ├── 01-项目信息.md           ← 项目路径、技术栈、目录结构
│   ├── 02-架构约束.md           ← 8 条强制禁止项
│   ├── 03-代码风格.md           ← 命名规范、缩进格式
│   ├── 04-错误处理与多语言.md    ← schema-dsl 错误处理
│   ├── 05-参数校验规范.md        ← schema-dsl 三层标准模式
│   ├── 06-中间件规范.md          ← 中间件加载顺序
│   ├── 07-路由与接口规范.md      ← 接口分组、鉴权
│   ├── 08-AI架构.md             ← Agent 策略模式（项目特有）
│   ├── 09-微服务通信.md          ← httpHelper、服务清单（项目特有）
│   └── CHANGELOG.md             ← 版本变更日志
├── requirements/               ← 需求开发输出
├── bugs/                       ← Bug 修复输出
└── optimizations/              ← 优化方案输出
```

---

## 🔧 AI 使用项目规范

### Step 1: 识别项目
```typescript
// 从用户输入中提取项目名
用户输入: "在 chat 服务添加一个内部接口"
项目名: "chat"
```

### Step 2: 读取项目规范
```yaml
加载入口: projects/<project>/profile/README.md

加载策略:
  必读: profile/README.md → profile/01-项目信息.md → profile/02-架构约束.md → profile/03-代码风格.md
  按需: 根据任务类型加载对应模块
    - 涉及错误处理 → profile/04-错误处理与多语言.md
    - 涉及参数校验 → profile/05-参数校验规范.md
    - 涉及中间件   → profile/06-中间件规范.md
    - 涉及路由     → profile/07-路由与接口规范.md
    - 涉及 AI 功能 → profile/08-AI架构.md（如存在）
    - 涉及服务调用 → profile/09-微服务通信.md（如存在）

未找到时:
  🔴 必须询问用户 "是否需要我分析项目并生成项目规范文件？[是/否]"
```

### Step 3: 应用项目约束
```yaml
原则:
  项目规范 > 通用规范 > 行业标准

示例:
  - chat 规范要求用 ctx.dsl.error.throw()
  - 即使旧代码用 throw new Error()
  - 新代码也必须遵循项目规范
```

---

## 📝 创建新项目规范

### 方式 1: AI 自动生成（推荐）

```yaml
用户输入: "为 payment 项目创建规范文档"

AI 流程:
  1. 分析项目代码（package.json、目录结构、tsconfig 等）
  2. 参考 _template/ 模板和已有项目规范（如 chat/profile/）
  3. 生成 projects/<project>/README.md（顶层索引）
  4. 生成 projects/<project>/profile/（模块化规范文件）

生成的最小文件集:
  - README.md（项目顶层索引）
  - TASK-INDEX.md（任务索引）
  - profile/README.md（规范入口 + AI 遵循声明）
  - profile/01-项目信息.md
  - profile/02-架构约束.md
  - profile/03-代码风格.md
  - profile/CHANGELOG.md
```

### 方式 2: 手动基于模板

```bash
# 复制模板
cp -r projects/_template projects/new-service

# 按实际项目填充每个模块文件
# 删除不需要的可选模块
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
  - 在 README.md / CHANGELOG.md 记录版本历史
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
  1. 在 01-项目信息.md 或 09-微服务通信.md 的 dependencies 字段列出
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
- [ ] README.md（项目顶层索引）已创建
- [ ] TASK-INDEX.md（任务索引）已创建
- [ ] profile/README.md（规范入口 + AI 遵循声明）已创建
- [ ] profile/01-项目信息.md 已创建
- [ ] profile/02-架构约束.md 已创建
- [ ] profile/03-代码风格.md 已创建
- [ ] 技术栈版本信息完整
- [ ] 命名规范明确
- [ ] profile/CHANGELOG.md 已创建

### AI 使用项目规范检查
- [ ] AI 能正确识别项目名
- [ ] AI 优先读取 profile/README.md 索引
- [ ] AI 按需加载 profile/ 下对应模块文件
- [ ] AI 生成的代码符合项目规范
- [ ] 项目特有规则得到遵守

---

## 📚 参考资源

- [_template/](./_template/) - 项目规范模板
- [../workflows/](../workflows/) - 通用开发流程
- [../templates/](../templates/) - 通用文档模板

---

**最后更新**: 2026-02-24
