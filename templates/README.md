# 模板使用说明

> 本目录包含 AI 生成文档时使用的模板

---

## 📁 目录结构

```
templates/
├── README.md              # 本文件
├── lite/                  # 🆕 精简模板（快速模式）
│   ├── README.md
│   ├── technical-lite.md
│   ├── requirement-lite.md
│   ├── implementation-lite.md
│   ├── bug-analysis-lite.md
│   ├── optimization-lite.md      # 🆕
│   ├── research-lite.md          # 🆕
│   └── refactoring-lite.md       # 🆕
├── core/                  # 核心模板（完整模式）
│   ├── requirement-template.md
│   ├── technical-template.md
│   ├── implementation-template.md
│   ├── bug-analysis-template.md
│   ├── optimization-template.md
│   ├── integration-template.md
│   ├── api-doc-template.md
│   └── frontend-integration-template.md
├── extended/              # 扩展模板（Tier 2 任务）
│   ├── research-template.md
│   ├── refactoring-template.md
│   ├── database-template.md
│   ├── security-template.md
│   └── incident-template.md
└── common/                # 通用模板组件
    ├── header.md          # 文档头部
    ├── footer.md          # 文档尾部
    ├── checklist.md       # 检查清单
    ├── STATUS-template.md
    ├── CHANGELOG-template.md
    ├── status-badge.md
    └── changelogs/        # 变更日志子目录
```

---

## 🎯 模板选择指南（v2.0 新增）

### 何时使用 Lite 模板（精简版）

| 条件 | 说明 |
|-----|------|
| ✅ 简单需求 | 涉及文件 < 5 个 |
| ✅ 快速迭代 | 时间紧迫，快速产出 |
| ✅ 内部文档 | 非正式交付 |
| ✅ 用户要求 | 用户说"简单"、"快速" |

### 何时使用 Core 模板（完整版）

| 条件 | 说明 |
|-----|------|
| ✅ 复杂需求 | 涉及多模块、多文件 |
| ✅ 正式交付 | 需要评审、归档 |
| ✅ 核心功能 | 重要业务逻辑 |
| ✅ 用户要求 | 用户说"完整"、"详细" |

---

## 🎯 模板分类

### Lite Templates（精简模板）🆕
用于快速模式，章节数 3-5 个：

| 模板文件 | 用途 | 章节数 |
|---------|------|-------|
| `technical-lite.md` | 技术方案 | 4-5 |
| `requirement-lite.md` | 需求文档 | 3-4 |
| `implementation-lite.md` | 实施方案 | 3-4 |
| `bug-analysis-lite.md` | Bug 分析 | 4 |
| `optimization-lite.md` | 性能优化 | 5 |
| `research-lite.md` | 技术调研 | 5 |
| `refactoring-lite.md` | 架构重构 | 5 |

### Core Templates（核心模板）
用于 Tier 1 任务，使用频率 80%：

| 模板文件 | 用途 | 使用场景 |
|---------|------|---------|
| `requirement-template.md` | 需求文档 | 新功能开发 |
| `technical-template.md` | 技术方案 | 方案设计 |
| `implementation-template.md` | 实施方案 | 代码实现 |
| `bug-analysis-template.md` | Bug 分析 | 问题定位 |
| `optimization-template.md` | 优化方案 | 性能优化 |
| `integration-template.md` | 对接文档 | 系统集成 |

### Extended Templates（扩展模板）
用于 Tier 2 任务，使用频率 20%：

| 模板文件 | 用途 | 使用场景 |
|---------|------|---------|
| `research-template.md` | 调研报告 | 技术选型 |
| `refactoring-template.md` | 重构计划 | 架构升级 |
| `database-template.md` | 数据库变更 | Schema 变更 |
| `security-template.md` | 安全修复 | 漏洞修复 |
| `incident-template.md` | 事故复盘 | 故障分析 |

### Common Components（通用组件）
可复用的文档组件：

| 组件文件 | 用途 | 使用方式 |
|---------|------|---------|
| `header.md` | 文档头部 | 包含标题、元数据、目录 |
| `footer.md` | 文档尾部 | 包含签名、版本信息 |
| `changelog.md` | 变更日志 | 记录文档修订历史 |
| `checklist.md` | 检查清单 | 任务验收标准 |

---

## 📋 模板使用规范

### 规范 1: 严格按模板结构
```
❌ 错误: 随意调整章节顺序
✅ 正确: 严格按照模板的章节结构和顺序
```

### 规范 2: 完整填充内容
```
❌ 错误: 跳过某些章节或留空
✅ 正确: 所有章节必须填充，无内容时写"无"或"不适用"
```

### 规范 3: 保持格式一致
```
❌ 错误: 使用不同的标题级别或列表格式
✅ 正确: 保持模板定义的格式（标题级别、列表样式等）
```

### 规范 4: 使用结构化数据
```
❌ 错误: 大段自然语言描述
✅ 正确: 使用表格、列表、代码块等结构化格式
```

---

## 🔧 AI 使用指南

### Step 1: 选择模板
```typescript
function selectTemplate(taskType: string): string {
  const templateMap = {
    'requirement': 'core/requirement-template.md',
    'bug': 'core/bug-analysis-template.md',
    'optimization': 'core/optimization-template.md',
    'research': 'extended/research-template.md',
    // ...
  };
  return templateMap[taskType];
}
```

### Step 2: 读取模板
```typescript
const templatePath = selectTemplate(taskType);
const template = await readFile(`templates/${templatePath}`);
```

### Step 3: 解析章节
```typescript
interface Chapter {
  level: number;
  title: string;
  content: string;
  subsections: Chapter[];
}

const chapters = parseMarkdownChapters(template);
```

### Step 4: 填充内容
```typescript
for (const chapter of chapters) {
  chapter.content = await generateContent(chapter.title, context);
}
```

### Step 5: 验证完整性
```typescript
function validateDocument(doc: Document): ValidationResult {
  return {
    hasAllChapters: checkChapterCompleteness(doc),
    hasRequiredFields: checkRequiredFields(doc),
    formatCorrect: checkFormat(doc),
  };
}
```

### Step 6: 保存文档
```typescript
const outputPath = `projects/${projectName}/${taskType}/${taskId}/01-xxx.md`;
await writeFile(outputPath, generatedDocument);
```

---

## 🎨 模板定制

### 添加新模板
```bash
# 1. 创建模板文件
touch templates/extended/my-new-template.md

# 2. 定义章节结构
# 参考现有模板的章节结构

# 3. 更新 README.md
# 在对应分类中添加说明
```

### 修改现有模板
```yaml
修改原则:
  - 保持章节层级结构
  - 不删除必填章节
  - 可添加可选章节
  - 更新文档示例

更新流程:
  1. 备份原模板
  2. 修改模板内容
  3. 测试 AI 生成效果
  4. 更新使用说明
```

---

## 📊 模板质量标准

### 标准 1: 结构清晰
- 章节层级不超过 4 层
- 每个章节有明确的目的
- 章节之间逻辑连贯

### 标准 2: 内容完整
- 包含所有必要信息
- 提供示例和说明
- 覆盖常见场景

### 标准 3: 易于填充
- 字段定义明确
- 提供填充指南
- 包含格式示例

### 标准 4: 可扩展性
- 支持添加自定义章节
- 允许组合使用
- 预留扩展位置

---

## 🔍 模板版本管理

### 版本号规则
```
格式: v<major>.<minor>.<patch>

major: 结构性变更（章节增删）
minor: 内容优化（描述改进）
patch: 格式修正（拼写、排版）

示例:
v1.0.0 - 初始版本
v1.1.0 - 添加风险评估章节
v1.1.1 - 修复示例代码格式
```

### 变更日志
```markdown
## requirement-template.md

### v1.1.0 (2026-02-11)
- 添加"系统对接"可选章节
- 优化"验收标准"描述
- 补充示例内容

### v1.0.0 (2026-02-01)
- 初始版本发布
```

---

## 📚 参考资源

- [Markdown 语法指南](https://www.markdownguide.org/)
- [技术文档最佳实践](https://www.writethedocs.org/guide/)
- [结构化写作原则](https://developers.google.com/tech-writing)
