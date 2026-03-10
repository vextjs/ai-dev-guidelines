# 规范检查机制

> 自动检测和验证代码/文档是否符合项目规范

---

## 📋 概述

规范检查机制用于确保 AI 生成的代码和文档符合项目定义的标准，防止规范偏差。

---

## 🎯 检查维度

### 维度 1: 代码规范
```yaml
检查项:
  代码风格:
    - 缩进 (2空格 vs 4空格 vs Tab)
    - 行长度 (< 80/100/120)
    - 命名规则 (camelCase/snake_case)
    - 导入排序
    
  类型安全:
    - 所有函数都有类型注解
    - 没有 any 类型
    - 接口定义完整
    
  最佳实践:
    - 错误处理完整
    - 无 console.log
    - 常量定义规范
    - 异常处理方式
    
  测试覆盖:
    - 单元测试存在
    - 覆盖率要求
    - 测试命名规范
```

### 维度 2: 架构规范
```yaml
检查项:
  模块结构:
    - 目录组织
    - 文件命名
    - 依赖关系
    
  接口设计:
    - API 参数
    - 返回值类型
    - 错误响应
    
  依赖管理:
    - 禁用依赖
    - 版本限制
    - Peer dependencies
```

### 维度 3: 文档规范
```yaml
检查项:
  格式:
    - Markdown 格式
    - 标题层级
    - 列表缩进
    
  内容:
    - 必需章节
    - 示例代码
    - API 文档
    
  更新:
    - 变更日志
    - 更新时间
    - 版本标记
```

### 维度 4: 提交规范
```yaml
检查项:
  Commit Message:
    - 格式 (Conventional Commits)
    - 前缀 (feat/fix/docs/etc)
    - 消息长度
    
  代码变更:
    - 相关文件在一个 PR
    - 测试同步更新
    - 文档同步更新
```

---

## 🔧 检查实现

### 检查器框架
```typescript
interface CheckRule {
  id: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'style' | 'architecture' | 'performance' | 'security' | 'best-practice';
  check: (file: FileContent) => Promise<CheckResult[]>;
}

interface CheckResult {
  ruleId: string;
  file: string;
  line?: number;
  column?: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  autoFixable?: boolean;
}

class ComplianceChecker {
  private rules: Map<string, CheckRule> = new Map();
  
  registerRule(rule: CheckRule) {
    this.rules.set(rule.id, rule);
  }
  
  async checkFile(filePath: string): Promise<CheckResult[]> {
    const content = await read_file({ filePath });
    const results: CheckResult[] = [];
    
    for (const rule of this.rules.values()) {
      try {
        const ruleResults = await rule.check({
          path: filePath,
          content,
          extension: getFileExtension(filePath)
        });
        results.push(...ruleResults);
      } catch (error) {
        console.error(`规则检查失败 ${rule.id}:`, error);
      }
    }
    
    return results;
  }
  
  async checkProject(projectPath: string, pattern?: string): Promise<CheckResult[]> {
    const files = await file_search({ 
      query: pattern || '**/*.{ts,js,md}'
    });
    
    const allResults: CheckResult[] = [];
    
    for (const file of files) {
      const results = await this.checkFile(file);
      allResults.push(...results);
    }
    
    return allResults;
  }
}
```

### 具体规则示例

#### 规则 1: TypeScript 类型注解
```typescript
const typeAnnotationRule: CheckRule = {
  id: 'ts-type-annotation',
  name: 'TypeScript 类型注解',
  description: '所有函数和变量都应该有类型注解',
  severity: 'error',
  category: 'best-practice',
  
  async check(file: FileContent): Promise<CheckResult[]> {
    if (!file.path.endsWith('.ts')) return [];
    
    const results: CheckResult[] = [];
    const lines = file.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // 检查函数声明
      const funcMatch = line.match(/^\s*(?:export\s+)?(?:async\s+)?function\s+\w+\s*\(/);
      if (funcMatch) {
        // 检查是否有返回类型
        if (!line.includes(': ') && !lines[i + 1]?.includes(': ')) {
          results.push({
            ruleId: this.id,
            file: file.path,
            line: lineNum,
            message: '函数缺少返回类型注解',
            severity: 'error',
            suggestion: `添加返回类型: ${funcMatch[0]}... ) : ReturnType {`
          });
        }
      }
      
      // 检查变量声明
      const varMatch = line.match(/^\s*(?:const|let|var)\s+(\w+)\s*=/);
      if (varMatch) {
        const varName = varMatch[1];
        // 检查是否有类型注解
        if (!line.includes(': ')) {
          results.push({
            ruleId: this.id,
            file: file.path,
            line: lineNum,
            message: `变量 '${varName}' 缺少类型注解`,
            severity: 'warning',
            suggestion: `添加类型: const ${varName}: Type = ...`
          });
        }
      }
    }
    
    return results;
  }
};
```

#### 规则 2: 代码风格
```typescript
const codeStyleRule: CheckRule = {
  id: 'code-style',
  name: '代码风格检查',
  description: '检查缩进、行长度等代码风格',
  severity: 'warning',
  category: 'style',
  
  async check(file: FileContent): Promise<CheckResult[]> {
    const results: CheckResult[] = [];
    const lines = file.content.split('\n');
    const MAX_LINE_LENGTH = 100;
    const INDENT_SIZE = 2;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;
      
      // 检查行长度
      if (line.length > MAX_LINE_LENGTH) {
        results.push({
          ruleId: this.id,
          file: file.path,
          line: lineNum,
          column: MAX_LINE_LENGTH,
          message: `行长度超过 ${MAX_LINE_LENGTH} 字符 (当前: ${line.length})`,
          severity: 'warning'
        });
      }
      
      // 检查缩进
      const indentMatch = line.match(/^(\s*)/);
      const indent = indentMatch?.[1].length || 0;
      if (indent > 0 && indent % INDENT_SIZE !== 0) {
        results.push({
          ruleId: this.id,
          file: file.path,
          line: lineNum,
          column: indent,
          message: `缩进应该是 ${INDENT_SIZE} 的倍数 (当前: ${indent})`,
          severity: 'info',
          suggestion: `使用 ${Math.round(indent / INDENT_SIZE) * INDENT_SIZE} 个空格`
        });
      }
    }
    
    return results;
  }
};
```

#### 规则 3: 错误处理
```typescript
const errorHandlingRule: CheckRule = {
  id: 'error-handling',
  name: '错误处理检查',
  description: '检查异步函数是否有错误处理',
  severity: 'error',
  category: 'best-practice',
  
  async check(file: FileContent): Promise<CheckResult[]> {
    if (!file.path.endsWith('.ts')) return [];
    
    const results: CheckResult[] = [];
    const lines = file.content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查 try-catch 覆盖的 await
      if (line.includes('await') && !line.includes('catch')) {
        // 查看是否在 try 块中
        let inTry = false;
        for (let j = Math.max(0, i - 10); j < i; j++) {
          if (lines[j].includes('try {')) {
            inTry = true;
            break;
          }
        }
        
        if (!inTry) {
          results.push({
            ruleId: this.id,
            file: file.path,
            line: i + 1,
            message: 'await 表达式未被 try-catch 包围',
            severity: 'error',
            suggestion: '将 await 表达式放在 try-catch 块中'
          });
        }
      }
    }
    
    return results;
  }
};
```

---

## 📊 检查报告

### 报告生成
```typescript
interface ComplianceReport {
  timestamp: Date;
  projectPath: string;
  filesChecked: number;
  issuesFound: number;
  
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  
  byCategory: Record<string, number>;
  byFile: Record<string, CheckResult[]>;
  
  overallScore: number;  // 0-100
  compliance: 'compliant' | 'warning' | 'non-compliant';
}

function generateReport(results: CheckResult[]): ComplianceReport {
  const summary = {
    errors: results.filter(r => r.severity === 'error').length,
    warnings: results.filter(r => r.severity === 'warning').length,
    info: results.filter(r => r.severity === 'info').length
  };
  
  // 计算合规分数
  const overallScore = Math.max(
    0,
    100 - (summary.errors * 10 + summary.warnings * 2 + summary.info * 0.5)
  );
  
  // 按文件分组
  const byFile: Record<string, CheckResult[]> = {};
  for (const result of results) {
    if (!byFile[result.file]) {
      byFile[result.file] = [];
    }
    byFile[result.file].push(result);
  }
  
  // 按类别统计
  const byCategory: Record<string, number> = {};
  for (const result of results) {
    const rule = checker.getRule(result.ruleId);
    if (rule) {
      byCategory[rule.category] = (byCategory[rule.category] || 0) + 1;
    }
  }
  
  return {
    timestamp: new Date(),
    projectPath: process.cwd(),
    filesChecked: Object.keys(byFile).length,
    issuesFound: results.length,
    summary,
    byCategory,
    byFile,
    overallScore,
    compliance: overallScore > 90 ? 'compliant' : overallScore > 70 ? 'warning' : 'non-compliant'
  };
}

function formatReport(report: ComplianceReport): string {
  return `
📊 代码规范检查报告

时间: ${report.timestamp.toISOString()}
路径: ${report.projectPath}

## 总体评分
${report.overallScore.toFixed(1)}/100 - ${report.compliance.toUpperCase()}

## 问题统计
✅ 已检查文件: ${report.filesChecked}
❌ 发现问题: ${report.issuesFound}

按严重级别:
  🔴 错误: ${report.summary.errors}
  🟡 警告: ${report.summary.warnings}
  🔵 提示: ${report.summary.info}

## 按类别统计
${Object.entries(report.byCategory)
  .map(([category, count]) => `  ${category}: ${count}`)
  .join('\n')}

## 涉及的文件
${Object.entries(report.byFile)
  .slice(0, 5)
  .map(([file, issues]) => `  ${file}: ${issues.length} 个问题`)
  .join('\n')}
${Object.keys(report.byFile).length > 5 ? `  ... 还有 ${Object.keys(report.byFile).length - 5} 个文件` : ''}

## 建议
${report.compliance === 'compliant' 
  ? '✅ 代码符合规范，无需改进'
  : report.compliance === 'warning'
  ? '⚠️  请修复警告级别的问题'
  : '❌ 请优先修复错误级别的问题'}
  `.trim();
}
```

---

## 🔧 自动修复

### 修复机制
```typescript
class AutoFixer {
  async fixFile(filePath: string, results: CheckResult[]): Promise<void> {
    let content = await read_file({ filePath });
    let lines = content.split('\n');
    
    // 按行号倒序排列（避免行号偏移）
    const fixableResults = results
      .filter(r => r.autoFixable)
      .sort((a, b) => (b.line || 0) - (a.line || 0));
    
    for (const result of fixableResults) {
      if (!result.line) continue;
      
      // 根据规则ID应用修复
      switch (result.ruleId) {
        case 'code-style':
          lines[result.line - 1] = this.fixIndentation(lines[result.line - 1]);
          break;
          
        case 'trailing-whitespace':
          lines[result.line - 1] = lines[result.line - 1].trimRight();
          break;
          
        case 'unused-imports':
          // 移除未使用的导入
          lines = this.removeUnusedImport(lines, result.line - 1);
          break;
      }
    }
    
    // 写回文件
    await create_file({
      filePath,
      content: lines.join('\n')
    });
  }
  
  private fixIndentation(line: string): string {
    const content = line.trimLeft();
    const indentLevel = Math.round(line.search(/\S/) / 2);
    return ' '.repeat(indentLevel * 2) + content;
  }
  
  private removeUnusedImport(lines: string[], lineIndex: number): string[] {
    // 简化版：直接删除该行
    return lines.filter((_, i) => i !== lineIndex);
  }
}
```

### 修复工作流
```typescript
async function checkAndFix(filePath: string) {
  // 1. 检查
  const results = await checker.checkFile(filePath);
  
  // 2. 分类
  const errors = results.filter(r => r.severity === 'error');
  const fixable = results.filter(r => r.autoFixable);
  
  if (errors.length === 0 && fixable.length === 0) {
    console.log('✅ 文件符合规范');
    return;
  }
  
  // 3. 修复
  if (fixable.length > 0) {
    console.log(`修复 ${fixable.length} 个问题...`);
    const fixer = new AutoFixer();
    await fixer.fixFile(filePath, fixable);
    console.log('✅ 自动修复完成');
  }
  
  // 4. 报告剩余问题
  if (errors.length > 0) {
    console.log('\n⚠️  以下问题需要手动修复:');
    for (const error of errors) {
      console.log(`  ${error.file}:${error.line} - ${error.message}`);
      if (error.suggestion) {
        console.log(`    💡 建议: ${error.suggestion}`);
      }
    }
  }
}
```

---

## 🎯 预提交检查

### Git Hooks
```bash
#!/bin/bash
# .husky/pre-commit

# 检查暂存的文件
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(ts|js|md)$')

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

echo "🔍 正在检查代码规范..."

# 运行规范检查
node scripts/check-compliance.js $STAGED_FILES

if [ $? -ne 0 ]; then
  echo "❌ 规范检查失败，请修复后重试"
  exit 1
fi

echo "✅ 规范检查通过"
```

### 检查脚本
```typescript
// scripts/check-compliance.ts

const files = process.argv.slice(2);
const checker = new ComplianceChecker();

// 注册所有规则
checker.registerRule(typeAnnotationRule);
checker.registerRule(codeStyleRule);
checker.registerRule(errorHandlingRule);
// ...

async function main() {
  const results: CheckResult[] = [];
  
  for (const file of files) {
    const fileResults = await checker.checkFile(file);
    results.push(...fileResults);
  }
  
  if (results.length === 0) {
    console.log('✅ 所有文件符合规范');
    process.exit(0);
  }
  
  const report = generateReport(results);
  console.log(formatReport(report));
  
  process.exit(report.compliance === 'non-compliant' ? 1 : 0);
}

main();
```

---

## 🎓 AI 实施建议

### 何时检查？
```yaml
时机:
  - 创建文件后
  - 编辑文件后
  - 提交前
  - 每日定时检查
```

### 处理不合规代码
```yaml
步骤:
  1. 运行检查
  2. 尝试自动修复
  3. 报告剩余问题
  4. 询问用户是否继续
  5. 可选：向代码库报告问题
```

### 项目配置
```typescript
// .ai/compliance.json
{
  "rules": {
    "ts-type-annotation": { "severity": "error" },
    "code-style": { "severity": "warning" },
    "error-handling": { "severity": "error" }
  },
  "autoFix": {
    "enabled": true,
    "rules": ["code-style", "trailing-whitespace"]
  },
  "threshold": {
    "minScore": 80,
    "allowWarnings": true
  }
}
```

---

**最后更新**: 2026-02-11
