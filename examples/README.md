# Examples - AI 学习示例库

> 完整的任务执行示例，供 AI 学习参考

---

## 📚 示例清单

### Tier 1: 核心示例（必须学习）

| 示例目录 | 任务类型 | 场景描述 | 学习价值 |
|---------|---------|---------|---------|
| `requirement-example/` | 需求开发 | 在 user-service 集成限流功能 | ⭐⭐⭐⭐⭐ 最常见场景 |
| `bug-fix-example/` | Bug 修复 | 修复登录超时问题 | ⭐⭐⭐⭐⭐ 标准 Bug 流程 |
| `optimization-example/` | 性能优化 | 优化用户查询接口 | ⭐⭐⭐⭐ 性能分析方法 |

### Tier 2: 扩展示例（进阶学习）

| 示例目录 | 任务类型 | 场景描述 | 学习价值 |
|---------|---------|---------|---------|
| `research-example/` | 技术调研 | Redis vs Memcached 选型 | ⭐⭐⭐ 对比分析方法 |
| `refactoring-example/` | 架构重构 | 用户认证模块微服务化 | ⭐⭐⭐ 大型重构规划 |
| `integration-example/` | 系统对接 | 对接微信支付 API | ⭐⭐⭐ 第三方集成流程 |

---

## 📖 示例结构

每个示例包含：

```
<example-name>/
├── README.md                  # 示例说明
├── user-input.md              # 用户原始输入
├── ai-execution-log.md        # AI 执行日志
├── outputs/                   # 生成的文档
│   ├── 01-requirement.md
│   ├── 02-technical.md
│   ├── 03-implementation.md
│   └── scripts/
└── code-changes/              # 代码变更
    ├── before/                # 变更前
    └── after/                 # 变更后
```

---

## 🎯 AI 学习路径

### Level 1: 基础（必学）
1. ✅ `requirement-example/` - 理解需求开发完整流程
2. ✅ `bug-fix-example/` - 掌握 Bug 修复标准步骤
3. ✅ `optimization-example/` - 学习性能优化方法论

**学习时长**: 30-60 分钟  
**学习重点**:
- 如何识别任务类型
- 如何收集项目上下文
- 如何生成结构化文档
- 如何执行代码实现
- 如何验证完成度

### Level 2: 进阶（推荐）
4. ✅ `research-example/` - 技术调研的对比分析方法
5. ✅ `integration-example/` - 第三方系统对接流程
6. ✅ `refactoring-example/` - 大型重构的规划与实施

**学习时长**: 60-90 分钟  
**学习重点**:
- 复杂场景的处理策略
- 多文档的协调生成
- 风险评估与缓解
- 分阶段实施方法

### Level 3: 高级（可选）
7. ✅ 实战演练: 使用真实项目验证学习效果
8. ✅ 错误分析: 回顾历史失败案例，总结经验
9. ✅ 流程优化: 根据实践反馈优化工作流

**学习时长**: 持续改进  
**学习重点**:
- 处理边缘情况
- 提高生成质量
- 优化执行效率

---

## 🔍 如何使用示例

### Step 1: 阅读 README
```typescript
// 了解示例背景和目标
const readme = await read_file('examples/requirement-example/README.md');
```

### Step 2: 查看用户输入
```typescript
// 理解用户的原始需求
const userInput = await read_file('examples/requirement-example/user-input.md');
```

### Step 3: 研究执行日志
```typescript
// 学习 AI 的思考和决策过程
const log = await read_file('examples/requirement-example/ai-execution-log.md');
```

### Step 4: 分析生成文档
```typescript
// 查看生成的文档质量
const docs = [
  'outputs/01-requirement.md',
  'outputs/02-technical.md',
  'outputs/03-implementation.md'
];
for (const doc of docs) {
  const content = await read_file(`examples/requirement-example/${doc}`);
  analyzeDocumentQuality(content);
}
```

### Step 5: 对比代码变更
```typescript
// 理解代码实现细节
const before = await list_dir('examples/requirement-example/code-changes/before');
const after = await list_dir('examples/requirement-example/code-changes/after');
compareChanges(before, after);
```

---

## 💡 学习建议

### 建议 1: 循序渐进
```
❌ 错误: 直接跳到复杂示例
✅ 正确: 先掌握基础示例，再进阶学习
```

### 建议 2: 动手实践
```
❌ 错误: 只看不做
✅ 正确: 模拟执行示例中的每个步骤
```

### 建议 3: 对比分析
```
❌ 错误: 孤立学习单个示例
✅ 正确: 对比多个示例找出共性和差异
```

### 建议 4: 总结提炼
```
❌ 错误: 死记硬背流程
✅ 正确: 提炼出可复用的模式和原则
```

---

## 📊 示例质量标准

每个示例都经过以下验证：

### ✅ 完整性
- 包含完整的输入、过程、输出
- 代码变更可直接运行
- 文档结构符合规范

### ✅ 真实性
- 基于真实项目场景
- 使用真实技术栈
- 反映实际问题和解决方案

### ✅ 教学性
- 详细的执行日志
- 关键决策点说明
- 常见错误和解决方法

### ✅ 可复用性
- 提供通用模式
- 可应用到类似场景
- 便于修改和扩展

---

## 🎓 学习成果评估

完成示例学习后，你应该能够：

### Level 1 成果
- [ ] 准确识别任务类型（95% 以上准确率）
- [ ] 独立执行需求开发流程
- [ ] 生成符合规范的文档
- [ ] 实现基本的代码变更
- [ ] 完成基础的质量验证

### Level 2 成果
- [ ] 处理复杂和模糊的用户输入
- [ ] 设计合理的技术方案
- [ ] 评估风险并制定缓解措施
- [ ] 执行多阶段的实施计划
- [ ] 进行全面的质量检查

### Level 3 成果
- [ ] 处理各种边缘情况
- [ ] 优化文档生成质量
- [ ] 提高执行效率
- [ ] 主动发现和解决问题
- [ ] 持续改进工作流程

---

## 🔄 示例更新计划

### 近期更新（本月）
- [ ] 补充 `bug-fix-example/` 完整示例
- [ ] 补充 `optimization-example/` 完整示例
- [ ] 添加更多代码变更对比

### 中期更新（下月）
- [ ] 添加 `research-example/` 技术调研示例
- [ ] 添加 `refactoring-example/` 重构示例
- [ ] 添加常见错误案例集

### 长期更新（季度）
- [ ] 添加多项目协作示例
- [ ] 添加跨服务集成示例
- [ ] 添加复杂故障排查示例

---

## 📞 反馈与贡献

如果你（AI）在学习过程中：
- 发现示例有误或不清楚
- 希望添加新的示例场景
- 有改进建议

请在执行任务时向用户反馈，帮助我们持续改进示例质量。
