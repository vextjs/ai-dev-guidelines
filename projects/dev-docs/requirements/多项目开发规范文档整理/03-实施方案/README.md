# 03 - 实施方案

> **项目**: dev-docs（跨项目规范）  
> **日期**: 2026-03-02  
> **关联**: [01-需求文档](../01-需求文档.md) → [02-技术方案](../02-技术方案.md) → 本文档

---

## 实施前检查

- [x] 信息来源目录 `guidelines/guidelines/profiles/user/` 已确认存在（12个规范文件）
- [x] 输出目录 `ai-dev-guidelines/projects/dev-docs/requirements/多项目开发规范文档整理/` 已确认存在
- [x] 报告目录 `reports/requirements/webstorm-copilot/20260302/` 已创建
- [x] 不涉及任何项目源码修改

---

## 实施步骤（按顺序执行）

| 步骤 | 文件 | 状态 |
|------|------|------|
| 1 | `代码规范.md` | ⏳ 待执行 |
| 2 | `接口规范.md` | ⏳ 待执行 |
| 3 | `错误码规范.md` | ⏳ 待执行 |
| 4 | `日志规范.md` | ⏳ 待执行 |
| 5 | `中间件基础服务说明.md` | ⏳ 待执行 |
| 6 | 会话报告 `reports/.../01-req-多项目开发规范文档整理.md` | ⏳ 待执行 |
| 7 | 更新记忆 `.ai-memory/.../20260302.md` | ⏳ 待执行 |

---

## 各文件变更内容

### 步骤1：代码规范.md

**路径**: `requirements/多项目开发规范文档整理/代码规范.md`  
**操作**: 新增  
**结构**:
- 一、命名规范（变量/函数/类/常量/枚举/文件/路由URL/Controller方法）
- 二、注释规范（Controller方法注释/Service方法注释/枚举注释/Model字段注释/特殊注释标记）
- 三、代码格式（缩进4空格/单引号/分号/TypeScript类型/async-await）
- 四、目录结构（完整目录树/各层说明/文档存放强制规则）
- 五、最佳实践（分层职责强制规范8条/错误处理/枚举定义/Service拆分/数据库操作/类型文件组织）

---

### 步骤2：接口规范.md

**路径**: `requirements/多项目开发规范文档整理/接口规范.md`  
**操作**: 新增  
**结构**:
- 一、RESTful 设计原则（路由风格/URL规范/HTTP方法语义/禁止使用旧分组方式）
- 二、请求/响应格式（统一响应格式规范/ctx.success/错误响应结构）
- 三、参数校验（schema-dsl语法表/必填/范围/类型/Validator层/三种来源body/query/params）
- 四、版本管理（模块前缀规则/四模块划分/路由文件组织）
- 五、错误处理（分层处理/exceptions中间件/Controller无需try-catch）

---

### 步骤3：错误码规范.md

**路径**: `requirements/多项目开发规范文档整理/错误码规范.md`  
**操作**: 新增  
**结构**:
- 一、统一错误码体系（对象格式规范/唯一配置位置config/dsl/）
- 二、错误码分类与分段规则（4xxxx业务错误/5xxxx系统错误/8xxxx参数验证错误/详细分段表）
- 三、错误信息国际化（zh/en/hk三文件同步/配置格式/index.ts导出方式）
- 四、使用方式（throw和create区别/使用场景/代码示例）
- 五、完整使用示例（Validator→Service→exceptions完整链路）
- 六、禁止事项与常见错误

---

### 步骤4：日志规范.md

**路径**: `requirements/多项目开发规范文档整理/日志规范.md`  
**操作**: 新增  
**结构**:
- 一、日志级别定义（error/warn/info/debug四级使用场景与判断标准）
- 二、日志格式规范（[Module.method]前缀规范/结构化日志字段/格式示例）
- 三、关键信息记录要求（Service层必须记录的场景/HTTP调用日志/错误日志必要字段）
- 四、敏感信息处理（禁止记录的字段清单/httpHelper redactHeaders配置/脱敏示例）
- 五、最佳实践（禁用console/error日志完整要素/info日志精简原则）

---

### 步骤5：中间件基础服务说明.md

**路径**: `requirements/多项目开发规范文档整理/中间件基础服务说明.md`  
**操作**: 新增  
**结构**:
- 一、中间件总览（6个中间件盘点表/执行顺序图）
- 二、responseHelper（用途/ctx.success/响应格式JSON示例）
- 三、schemaDslValidator（DSL语法速查表/validateDsl三种来源/错误自动响应）
- 四、httpHelper（8个核心方法表/配置选项说明/tag参数规范/使用场景）
- 五、userAuth（JWT鉴权流程/ctx.state.user字段/路由配置示例）
- 六、exceptions（统一异常捕获/错误响应格式/业务vs系统错误区分）
- 七、flexRateLimit（5种限流维度/4种算法/全局配置/路由级配置/IP白名单/注意事项）
- 八、最佳实践与常见问题（FAQ 5条）

