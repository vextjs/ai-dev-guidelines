# AI 开发流程规范

> 统一的 AI 辅助开发工作流程和文档标准

---

## 📌 总体原则

### 核心理念
- **文档先行**: 所有开发必须有完整的文档支撑
- **流程标准化**: 统一的工作流程和文档结构
- **可追溯性**: 每个决策和变更都有清晰的记录
- **AI 友好**: 文档结构易于 AI 理解和执行

### 适用范围
- ✅ 新功能需求开发
- ✅ Bug 问题修复
- ✅ 性能优化改进
- ✅ 系统对接集成

---

## 🔄 工作流程类型

### 1️⃣ 需求开发流程

#### 阶段划分
```
需求分析 → 技术方案 → 实施计划 → 代码开发 → 对接文档 → 验收测试
```

#### 必需文档
1. **01-requirement.md** - 需求文档
   - 业务背景和目标
   - 功能需求列表
   - 非功能性需求
   - 验收标准

2. **02-technical.md** - 技术方案
   - 技术选型和架构设计
   - 核心模块设计
   - 接口设计
   - 数据库设计（如需要）

3. **03-implementation.md** - 实施方案
   - 开发任务分解
   - 文件变更清单
   - 代码实现要点
   - 测试计划

4. **04-integration.md** - 对接文档
   - API 接口文档
   - 配置说明
   - 使用示例
   - 注意事项

5. **scripts/** - 脚本文件
   - 安装脚本
   - 初始化脚本
   - 测试脚本
   - 部署脚本

#### 目录结构
```
projects/<project-name>/requirements/<YYYYMMDD-feature-name>/
├── 01-requirement.md
├── 02-technical.md
├── 03-implementation.md
├── 04-integration.md
└── scripts/
    ├── install.sh
    ├── init-db.sql
    └── test.js
```

---

### 2️⃣ Bug 修复流程

#### 阶段划分
```
问题复现 → 原因分析 → 解决方案 → 代码修复 → 验证测试 → 文档归档
```

#### 必需文档
1. **01-analysis.md** - 问题分析
   - 问题描述和复现步骤
   - 影响范围和严重程度
   - 根因分析
   - 相关代码定位

2. **02-solution.md** - 解决方案
   - 修复方案设计
   - 技术实现要点
   - 风险评估
   - 回滚方案

3. **03-implementation.md** - 实施记录
   - 代码修改清单
   - 配置变更记录
   - 测试结果
   - 部署记录

4. **04-validation.md** - 验证报告
   - 功能验证结果
   - 回归测试结果
   - 性能影响评估
   - 上线后观察

5. **scripts/** - 脚本文件
   - 数据修复脚本
   - 测试脚本
   - 回滚脚本

#### 目录结构
```
projects/<project-name>/bugs/<BUG-xxx-description>/
├── 01-analysis.md
├── 02-solution.md
├── 03-implementation.md
├── 04-validation.md
└── scripts/
    ├── fix-data.sql
    ├── test-fix.js
    └── rollback.sql
```

---

### 3️⃣ 性能优化流程

#### 阶段划分
```
性能基线 → 瓶颈识别 → 优化方案 → 代码优化 → 效果验证 → 对比报告
```

#### 必需文档
1. **01-baseline.md** - 基线分析
   - 当前性能指标
   - 性能瓶颈识别
   - 优化目标设定
   - 测试环境说明

2. **02-solution.md** - 优化方案
   - 优化策略选择
   - 技术实现方案
   - 预期收益分析
   - 风险评估

3. **03-implementation.md** - 实施记录
   - 代码优化清单
   - 配置调整记录
   - 数据库优化记录
   - 部署变更

4. **04-benchmark.md** - 性能对比
   - 优化后性能指标
   - 前后对比数据
   - 收益分析
   - 遗留问题

5. **scripts/** - 脚本文件
   - 性能测试脚本
   - 压测脚本
   - 监控脚本

#### 目录结构
```
projects/<project-name>/optimizations/<OPT-area-id>/
├── 01-baseline.md
├── 02-solution.md
├── 03-implementation.md
├── 04-benchmark.md
└── scripts/
    ├── benchmark.js
    ├── stress-test.js
    └── monitor.sh
```

---

### 4️⃣ 系统对接流程

#### 阶段划分
```
需求确认 → 接口设计 → 联调测试 → 文档编写 → 上线验证
```

#### 必需文档
1. **API.md** - 接口文档
   - 接口列表
   - 请求格式
   - 响应格式
   - 错误码说明

2. **DATA-FORMAT.md** - 数据格式
   - 数据模型定义
   - 字段说明
   - 数据示例
   - 校验规则

3. **WORKFLOW.md** - 对接流程
   - 业务流程图
   - 调用时序
   - 异常处理
   - 重试机制

4. **CHANGELOG.md** - 变更日志
   - 版本历史
   - 接口变更记录
   - 兼容性说明

#### 目录结构
```
projects/<project-name>/integrations/<system-name>/
├── API.md
├── DATA-FORMAT.md
├── WORKFLOW.md
├── CHANGELOG.md
└── examples/
    ├── request.json
    └── response.json
```

---

## 📝 文档编写规范

### 通用格式

#### 文档头部
```markdown
# [文档标题]

> [文档简述]

- **项目**: <project-name>
- **类型**: 需求开发 / Bug修复 / 性能优化 / 系统对接
- **创建日期**: YYYY-MM-DD
- **负责人**: [姓名]
- **状态**: 进行中 / 已完成 / 已归档
```

#### 章节结构
- 使用清晰的标题层级（H2、H3、H4）
- 重要信息使用表格或列表
- 代码示例使用代码块
- 关键决策使用引用块标注

#### 内容要求
- ✅ 清晰完整：信息完整，逻辑清晰
- ✅ 易于理解：避免过度技术化，AI 可理解
- ✅ 可执行性：方案具体，可直接执行
- ✅ 可追溯性：记录决策依据和变更历史

---

## 🔧 脚本文件规范

### 命名规则
- 使用小写字母和连字符
- 文件名体现功能: `install.sh`, `test-api.js`, `fix-data.sql`
- 禁止使用空格和特殊字符

### 内容要求
1. **文件头部注释**
   ```bash
   #!/bin/bash
   # 文件名: install.sh
   # 功能: 安装依赖和配置环境
   # 作者: [姓名]
   # 日期: 2026-02-11
   ```

2. **执行说明**
   - 必需的环境变量
   - 执行前置条件
   - 执行命令示例

3. **错误处理**
   - 关键步骤必须检查返回值
   - 失败时输出明确的错误信息
   - 提供回滚或恢复方案

### 分类存放
```
scripts/
├── install/          # 安装相关
├── init/             # 初始化相关
├── test/             # 测试相关
├── deploy/           # 部署相关
├── fix/              # 修复相关
└── monitor/          # 监控相关
```

---

## ✅ 质量检查清单

### 文档完整性
- [ ] 所有必需文档都已创建
- [ ] 文档头部信息完整
- [ ] 章节结构清晰合理
- [ ] 关键决策有明确记录

### 技术方案
- [ ] 技术选型有充分理由
- [ ] 设计方案清晰可执行
- [ ] 风险点已识别和评估
- [ ] 有备选方案或回滚方案

### 实施记录
- [ ] 代码变更清单完整
- [ ] 配置变更有明确记录
- [ ] 测试结果有详细记录
- [ ] 部署步骤清晰可重现

### 脚本质量
- [ ] 脚本有完整的头部注释
- [ ] 执行说明清晰
- [ ] 错误处理完善
- [ ] 已在目标环境测试通过

---

## 🎯 最佳实践

### 1. 渐进式文档
- 不要等到完成才写文档
- 边开发边记录，保持文档同步
- 及时更新文档状态

### 2. 代码即文档
- 关键代码必须有注释
- 复杂逻辑必须有说明
- 接口定义必须有文档

### 3. 版本管理
- 所有文档纳入版本控制
- 重大变更必须有 commit 说明
- 定期归档历史版本

### 4. 团队协作
- 文档使用统一的模板
- 命名遵循统一的规范
- 定期 review 文档质量

---

## 📚 参考资料

### 内部规范
- [代码标准](./standards/code-standards.md)
- [项目 Profile 模板](./projects/_template/TECH-STACK.md)

### 文档模板
- [需求文档模板](./templates/core/requirement-template.md)
- [技术方案模板](./templates/core/technical-template.md)
- [Bug 分析模板](./templates/core/bug-analysis-template.md)
- [优化方案模板](./templates/core/optimization-template.md)
- [实施记录模板](./templates/core/implementation-template.md)
- [系统对接模板](./templates/core/integration-template.md)

---

## 📞 支持

如有疑问或建议，请：
1. 查阅本规范和相关文档
2. 参考已有项目的文档示例
3. 联系项目负责人

---

**文档版本**: 1.0  
**最后更新**: 2026-02-11
