# 完整性检测

> 检测规范文件的完整性和覆盖度

---

## 🎯 检测目标

识别以下类型的不完整：
1. **必要章节缺失** - 规范文件缺少必要章节
2. **目录不完整** - 声明的目录/文件不存在
3. **模板缺失** - workflow 缺少对应的 template
4. **示例缺失** - 规范缺少实际示例

---

## 🔍 检测规则

### 规则 1: 规范文件必要章节

```yaml
检测逻辑:
  对于 core/standards/ 目录下的规范文件，必须包含:
    - 标题和描述
    - 规范规则定义
    - 正确/错误示例
    - 检查清单或验证方法

检测示例:
  文件: api-standards.md
  检查:
    ✅ 标题: "# API 规范"
    ✅ 规则: "URL 设计"、"HTTP 方法"等
    ✅ 示例: 代码块中有正确/错误对比
    ✅ 检查: "错误码规范"表格
  结果: 完整
```

### 规则 2: Workflow → Template 映射

```yaml
检测逻辑:
  1. 列出所有 workflow 目录
  2. 检查是否有对应的 template

映射关系:
  01-requirement-dev:
    - requirement-template.md ✅
    - technical-template.md ✅
    - implementation-template.md ✅
  02-bug-fix:
    - bug-analysis-template.md ✅
  03-optimization:
    - optimization-template.md ✅
  04-research:
    - research-template.md ✅
  05-refactoring:
    - refactoring-template.md ✅
  06-database:
    - database-template.md ✅
  07-security:
    - security-template.md ✅
  08-incident:
    - incident-template.md ✅
```

### 规则 3: 目录 README 完整性

```yaml
检测逻辑:
  主要目录必须有 README.md:
    - core/workflows/ ✅
    - core/templates/ ✅
    - projects/ ✅
    - core/tools/ ✅
    - core/examples/ ✅
    - core/best-practices/ ✅
    - core/self-fix/ ✅
    - core/standards/ ✅
    - changelogs/ ✅
```

### 规则 4: 示例目录完整性

```yaml
检测逻辑:
  1. 读取 core/examples/README.md 中声明的示例
  2. 验证每个示例目录是否存在且完整

检测示例:
  声明: requirement-example/, bug-fix-example/
  实际: 只有 requirement-example/
  结果: ⚠️ bug-fix-example/ 缺失

完整性标准:
  每个示例目录应包含:
    - README.md
    - user-input.md
    - outputs/ 目录
```

### 规则 5: spec-self-fix 模块完整性

```yaml
检测逻辑:
  验证 core/self-fix/ 目录结构:
    - detection/ (4 个文件)
    - repair/ (至少 1 个文件)
    - triggers/ (2 个文件)
    - records/ (至少 summary.md)

检测示例:
  detection/:
    ✅ conflict-detection.md
    ✅ obsolete-detection.md
    ✅ redundancy-detection.md
    ✅ completeness-detection.md
  repair/:
    ✅ auto-repair.md
  triggers/:
    ✅ user-intent-detection.md
    ✅ auto-triggers.md
  records/:
    ✅ summary.md
```

---

## 🔧 检测脚本

```javascript
// 检测完整性
function detectCompleteness() {
  const issues = [];
  
  // 检查 workflow → template 映射
  const workflowTemplateMap = {
    '01-requirement-dev': ['requirement-template.md', 'technical-template.md', 'implementation-template.md'],
    '02-bug-fix': ['bug-analysis-template.md'],
    '03-optimization': ['optimization-template.md'],
    '04-research': ['research-template.md'],
    '05-refactoring': ['refactoring-template.md'],
    '06-database': ['database-template.md'],
    '07-security': ['security-template.md'],
    '08-incident': ['incident-template.md']
  };
  
  for (const [workflow, templates] of Object.entries(workflowTemplateMap)) {
    const workflowPath = `core/workflows/${workflow}`;
    if (!directoryExists(workflowPath)) {
      issues.push({
        type: 'workflow 目录缺失',
        path: workflowPath
      });
      continue;
    }
    
    for (const template of templates) {
      const templatePath = `core/templates/core/${template}`;
      const extendedPath = `core/templates/extended/${template}`;
      
      if (!fileExists(templatePath) && !fileExists(extendedPath)) {
        issues.push({
          type: 'template 缺失',
          workflow,
          template,
          suggestion: `创建 ${templatePath}`
        });
      }
    }
  }
  
  return issues;
}

// 检查必要目录的 README
function checkDirectoryReadmes() {
  const requiredDirs = [
    'workflows', 'templates', 'projects', 'tools',
    'examples', 'best-practices', 'spec-self-fix', 'standards', 'changelogs'
  ];
  
  const issues = [];
  
  for (const dir of requiredDirs) {
    const readmePath = `${dir}/README.md`;
    if (!fileExists(readmePath)) {
      issues.push({
        type: 'README 缺失',
        directory: dir,
        suggestion: `创建 ${readmePath}`
      });
    }
  }
  
  return issues;
}
```

---

## 📊 输出格式

```yaml
检测结果:
  类型: 完整性检测
  扫描范围: 9 个主要目录
  发现问题: 1

  问题列表:
    - 问题1:
        类型: 示例缺失
        位置: core/examples/
        详情: 声明的 bug-fix-example/ 不存在
        建议: 创建示例或移除声明

  完整性统计:
    workflow → template 映射: 8/8 (100%)
    目录 README: 9/9 (100%)
    规范文件覆盖: 9/9 (100%)
    示例目录: 1/2 (50%)
```

---

## ✅ 完整性标准

### 规范文件标准

| 文件类型 | 必要章节 | 可选章节 |
|---------|---------|---------|
| core/standards/*.md | 标题、规则、示例、检查清单 | 最佳实践、FAQ |
| core/workflows/*.md | 流程概览、步骤、输出 | 异常处理、示例 |
| core/templates/*.md | 头部、章节结构、占位符 | 填写指南 |

### 目录完整性标准

| 目录 | 必须包含 | 可选 |
|-----|---------|------|
| core/workflows/ | README.md, 00-08 子目录 | common/ |
| core/templates/ | README.md, core/, lite/ | extended/ |
| projects/ | README.md, _template/ | 示例项目 |
| core/standards/ | README.md, 9 个规范文件 | - |

---

**版本**: v1.0  
**创建日期**: 2026-02-12

