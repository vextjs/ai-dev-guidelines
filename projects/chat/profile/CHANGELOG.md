# CHANGELOG - Chat 项目规范变更日志

---

## v1.3.0 (2026-02-24)

### 🔄 目录重构
- **规范文件移入 `profile/` 子目录**: 规范和任务输出（requirements/bugs/optimizations）职责分离
- 项目顶层 `README.md` 作为总索引，指向 `profile/` 和各任务输出目录
- 对齐 ai-dev-guidelines 模块化 profiles 概念

---

## v1.2.0 (2026-02-24)

### 🔄 结构重构
- **拆分 PROJECT.md**: 将单一文件拆分为 9 个独立模块文件 + README 索引
- **参考 user 项目规范结构**: 对齐 ai-dev-guidelines `_template/profile/` 的文件组织方式

### 📁 新文件清单
| 文件 | 内容 |
|------|------|
| `README.md` | 规范总索引 + AI 遵循声明 |
| `01-项目信息.md` | 项目路径、技术栈、目录结构 |
| `02-架构约束.md` | 8 条强制禁止项 |
| `03-代码风格.md` | 命名规范、缩进格式 |
| `04-错误处理与多语言.md` | schema-dsl 错误处理 + config/dsl/ 配置 |
| `05-参数校验规范.md` | schema-dsl 三层标准模式 |
| `06-中间件规范.md` | 中间件加载顺序与使用 |
| `07-路由与接口规范.md` | 接口分组、鉴权 |
| `08-AI架构.md` | Agent 策略模式、LLM 适配 |
| `09-微服务通信.md` | httpHelper、服务依赖/暴露清单 |

---

## v1.1.0 (2026-02-24)

### 🔥 修正
- 错误处理统一为 `ctx.dsl.error.throw()` / `throw ctx.dsl.error.create()`
- 响应格式统一为 `ctx.success(data)`
- 错误码配置唯一位置 `config/dsl/`
- 新增 8 条架构约束
- 参考 ai-dev-guidelines 通用规范体系（`standards/` 目录）

---

## v1.0.0 (2026-02-24)

### 🆕 初始版本
- AI 基于项目分析自动生成
- 包含技术栈、目录结构、AI 架构等基础信息

