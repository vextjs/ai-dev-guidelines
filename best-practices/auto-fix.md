# 自动修复机制

> 自动检测和修复常见代码问题

---

## 📋 概述

自动修复机制用于快速修正常见的代码问题，提高开发效率。

---

## 🎯 修复分类

### 分类 1: 安全修复（必须执行）
```yaml
修复类型:
  代码执行问题:
    - 缺少 await
    - 未处理 Promise
    - 未处理异常
    
  类型安全:
    - 隐式 any 类型
    - 类型不匹配
    - 空值判断
```

### 分类 2: 风格修复（自动执行）
```yaml
修复类型:
  格式问题:
    - 行尾空白
    - 缩进不一致
    - 未使用的导入
    
  命名问题:
    - 变量命名不规范
    - 文件命名不规范
```

### 分类 3: 性能修复（可选）
```yaml
修复类型:
  性能改进:
    - 重复计算
    - 效率低的算法
    - 内存泄漏风险
```

---

## 🔧 修复器实现

### 基础框架
```typescript
interface Fixer {
  name: string;
  description: string;
  pattern: RegExp | ((code: string) => boolean);
  fix: (code: string, match?: any) => string;
  category: 'safety' | 'style' | 'performance';
  autoFix: boolean;  // 是否自动执行
}

class AutoFixer {
  private fixers: Map<string, Fixer> = new Map();
  
  register(fixer: Fixer) {
    this.fixers.set(fixer.name, fixer);
  }
  
  async fixFile(filePath: string, autoOnly: boolean = false): Promise<FixResult> {
    let content = await read_file({ filePath });
    const originalContent = content;
    const appliedFixes: FixRecord[] = [];
    
    for (const fixer of this.fixers.values()) {
      // 跳过非自动修复（需要人工审查）
      if (!fixer.autoFix && autoOnly) {
        continue;
      }
      
      // 应用修复
      const newContent = this.applyFixer(content, fixer);
      
      if (newContent !== content) {
        appliedFixes.push({
          name: fixer.name,
          description: fixer.description,
          category: fixer.category
        });
        content = newContent;
      }
    }
    
    // 保存修改
    if (content !== originalContent) {
      await create_file({ filePath, content });
    }
    
    return {
      filePath,
      changed: content !== originalContent,
      appliedFixes,
      linesChanged: countChangedLines(originalContent, content)
    };
  }
  
  private applyFixer(content: string, fixer: Fixer): string {
    if (typeof fixer.pattern === 'function') {
      if (!fixer.pattern(content)) return content;
      return fixer.fix(content);
    } else {
      return content.replace(fixer.pattern, (match) => fixer.fix(match));
    }
  }
}
```

### 具体修复器

#### 修复 1: 移除未使用的导入
```typescript
const unusedImportsFixer: Fixer = {
  name: 'unused-imports',
  description: '移除未使用的导入',
  pattern: (code: string) => {
    return /import\s+{[^}]*}\s+from/g.test(code);
  },
  fix: (code: string): string => {
    const lines = code.split('\n');
    const imports: Map<string, number> = new Map();
    
    // 收集所有导入
    for (const line of lines) {
      const match = line.match(/import\s+{\s*([^}]+)\s*}\s+from/);
      if (match) {
        const items = match[1].split(',').map(s => s.trim());
        for (const item of items) {
          imports.set(item, 0);
        }
      }
    }
    
    // 计数使用情况
    const importedCode = lines.slice(0, 10).join('\n');
    for (const [item, _] of imports) {
      const usageRegex = new RegExp(`\\b${item}\\b`, 'g');
      const matches = importedCode.match(usageRegex) || [];
      imports.set(item, Math.max(0, matches.length - 1));  // 减去导入本身
    }
    
    // 移除未使用的导入
    return lines.map(line => {
      const match = line.match(/import\s+{\s*([^}]+)\s*}\s+from\s+"(.+?)"/);
      if (!match) return line;
      
      const [fullMatch, itemsStr, source] = match;
      const items = itemsStr.split(',').map(s => s.trim());
      const usedItems = items.filter(item => imports.get(item)! > 0);
      
      if (usedItems.length === 0) {
        return '';  // 删除整行导入
      } else if (usedItems.length < items.length) {
        return `import { ${usedItems.join(', ')} } from "${source}"`;
      }
      
      return line;
    }).filter(line => line).join('\n');
  },
  category: 'style',
  autoFix: true
};
```

#### 修复 2: 缺少 await
```typescript
const missingAwaitFixer: Fixer = {
  name: 'missing-await',
  description: '添加缺少的 await',
  pattern: /=\s*[^=]*(async\s+)?function\s*\([^)]*\)[^{]*{[\s\S]*?}/,
  fix: (code: string): string => {
    let modified = code;
    
    // 查找异步函数调用但没有 await
    const asyncCallPattern = /([A-Za-z_]\w*)\s*\(\s*\)/g;
    modified = modified.replace(asyncCallPattern, (match, funcName) => {
      // 检查这是否是异步函数调用
      if (funcName.includes('fetch') || funcName.includes('request') || 
          funcName.endsWith('Async')) {
        return `await ${match}`;
      }
      return match;
    });
    
    return modified;
  },
  category: 'safety',
  autoFix: false  // 需要人工审查
};
```

#### 修复 3: 行尾空白
```typescript
const trailingWhitespaceFixer: Fixer = {
  name: 'trailing-whitespace',
  description: '移除行尾空白',
  pattern: /\s+$/gm,
  fix: () => '',
  category: 'style',
  autoFix: true
};
```

#### 修复 4: console.log 移除
```typescript
const consoleLogFixer: Fixer = {
  name: 'remove-console-log',
  description: '移除 console.log 语句',
  pattern: /^\s*console\.(log|debug|info)\([^)]*\);?$/gm,
  fix: () => '',
  category: 'style',
  autoFix: true
};
```

#### 修复 5: 缺失的分号
```typescript
const missingSemicolonFixer: Fixer = {
  name: 'missing-semicolon',
  description: '添加缺失的分号',
  pattern: /([}\w\)"'])\s*\n/g,
  fix: (match: string): string => {
    // 检查是否需要分号
    const line = match.trim();
    const shouldHaveSemicolon = !line.endsWith('{') && 
                               !line.endsWith('}') &&
                               !line.endsWith(':') &&
                               line.length > 0;
    
    return shouldHaveSemicolon ? line + ';\n' : match;
  },
  category: 'style',
  autoFix: false  // 需要谨慎
};
```

#### 修复 6: 导入排序
```typescript
const importSortFixer: Fixer = {
  name: 'import-sort',
  description: '排序导入语句',
  pattern: (code: string) => /^import\s+/m.test(code),
  fix: (code: string): string => {
    const lines = code.split('\n');
    const importLines: string[] = [];
    const otherLines: string[] = [];
    let inImports = true;
    
    for (const line of lines) {
      if (line.startsWith('import ')) {
        importLines.push(line);
      } else if (inImports && line.trim() === '') {
        inImports = false;
        otherLines.push(line);
      } else {
        inImports = false;
        otherLines.push(line);
      }
    }
    
    // 按类型排序导入
    const sorted = importLines.sort((a, b) => {
      // 本地导入排在后面
      const aLocal = a.includes('.');
      const bLocal = b.includes('.');
      
      if (aLocal !== bLocal) {
        return aLocal ? 1 : -1;
      }
      
      return a.localeCompare(b);
    });
    
    return [...sorted, ...otherLines].join('\n');
  },
  category: 'style',
  autoFix: true
};
```

---

## 📊 修复报告

### 报告结构
```typescript
interface FixResult {
  filePath: string;
  changed: boolean;
  appliedFixes: FixRecord[];
  linesChanged: number;
}

interface FixRecord {
  name: string;
  description: string;
  category: 'safety' | 'style' | 'performance';
}

function formatFixReport(results: FixResult[]): string {
  const totalFiles = results.length;
  const changedFiles = results.filter(r => r.changed).length;
  const totalFixes = results.reduce((sum, r) => sum + r.appliedFixes.length, 0);
  
  return `
🔧 自动修复报告

## 总体统计
- 检查文件: ${totalFiles}
- 修改文件: ${changedFiles}
- 应用修复: ${totalFixes}

## 修复详情
${results
  .filter(r => r.changed)
  .map(r => `
${r.filePath}:
${r.appliedFixes.map(f => `  ✅ ${f.name} - ${f.description}`).join('\n')}
  变更行数: ${r.linesChanged}
`).join('\n')}

## 修复分类
${Array.from(
  results
    .flatMap(r => r.appliedFixes)
    .reduce((map, fix) => {
      map.set(fix.category, (map.get(fix.category) || 0) + 1);
      return map;
    }, new Map<string, number>())
)
  .map(([category, count]) => `- ${category}: ${count}`)
  .join('\n')}
  `.trim();
}
```

### 修复验证
```typescript
async function verifyFixes(fixedFiles: string[]): Promise<VerificationResult> {
  const results: VerificationResult = {
    successful: [],
    failed: [],
    warnings: []
  };
  
  for (const file of fixedFiles) {
    try {
      // 1. 检查语法
      const syntaxCheck = await checkSyntax(file);
      if (!syntaxCheck.valid) {
        results.failed.push({
          file,
          error: `语法错误: ${syntaxCheck.error}`
        });
        continue;
      }
      
      // 2. 运行类型检查（如果是 TypeScript）
      if (file.endsWith('.ts')) {
        const typeCheck = await runTypeCheck(file);
        if (!typeCheck.valid) {
          results.warnings.push({
            file,
            warning: `类型错误: ${typeCheck.error}`
          });
        }
      }
      
      // 3. 运行测试（如果存在相关测试）
      const testFile = findTestFile(file);
      if (testFile) {
        const testResult = await runTests(testFile);
        if (!testResult.passed) {
          results.failed.push({
            file,
            error: `测试失败: ${testResult.error}`
          });
          continue;
        }
      }
      
      results.successful.push(file);
      
    } catch (error) {
      results.failed.push({
        file,
        error: error.message
      });
    }
  }
  
  return results;
}
```

---

## 🎯 修复工作流

### 完整流程
```typescript
async function autoFixProject(projectPath: string) {
  // 1. 检查合规性
  console.log('📋 检查代码规范...');
  const checker = new ComplianceChecker();
  const violations = await checker.checkProject(projectPath);
  
  if (violations.length === 0) {
    console.log('✅ 代码已符合规范');
    return;
  }
  
  // 2. 准备修复
  console.log(`\n🔧 发现 ${violations.length} 个问题，开始修复...`);
  const fixer = new AutoFixer();
  
  // 注册所有修复器
  fixer.register(unusedImportsFixer);
  fixer.register(trailingWhitespaceFixer);
  fixer.register(consoleLogFixer);
  fixer.register(importSortFixer);
  // ...
  
  // 3. 应用修复
  const files = await file_search({ query: '**/*.{ts,js}' });
  const fixResults: FixResult[] = [];
  
  for (const file of files) {
    const result = await fixer.fixFile(file, true);  // autoOnly=true
    fixResults.push(result);
  }
  
  // 4. 报告结果
  console.log(formatFixReport(fixResults));
  
  // 5. 验证修复
  console.log('\n✔️  验证修复...');
  const changedFiles = fixResults.filter(r => r.changed).map(r => r.filePath);
  const verification = await verifyFixes(changedFiles);
  
  if (verification.failed.length > 0) {
    console.error('\n❌ 部分修复失败:');
    for (const { file, error } of verification.failed) {
      console.error(`  ${file}: ${error}`);
    }
    console.error('\n需要手动审查和修复');
  } else if (verification.warnings.length > 0) {
    console.warn('\n⚠️  修复成功但有警告:');
    for (const { file, warning } of verification.warnings) {
      console.warn(`  ${file}: ${warning}`);
    }
  } else {
    console.log('✅ 所有修复验证通过');
  }
}
```

---

## 🎓 AI 实施建议

### 修复策略
```yaml
保守策略:
  - 只修复风格问题
  - 安全修复需要审查
  - 性能修复需要测试

激进策略:
  - 自动修复所有可修复项
  - 运行测试验证
  - 失败时回滚

平衡策略:
  - 自动修复风格和安全问题
  - 性能修复需要用户确认
  - 总是验证修复结果
```

### 何时使用自动修复？
```yaml
推荐使用:
  - 代码审查前
  - 提交前
  - CI/CD 流程中
  - 自动化开发时

谨慎使用:
  - 高风险代码
  - 关键功能
  - 需要手动审查的修复
```

### 修复配置
```json
{
  ".ai/autofix.json": {
    "enabled": true,
    "strategy": "balanced",
    "autoFixers": {
      "unused-imports": true,
      "trailing-whitespace": true,
      "console-log": true,
      "import-sort": true,
      "missing-await": false,
      "missing-semicolon": false
    },
    "verify": {
      "syntaxCheck": true,
      "typeCheck": true,
      "runTests": false,
      "failOnWarning": false
    },
    "backup": {
      "enabled": true,
      "directory": ".ai/backups"
    }
  }
}
```

---

**最后更新**: 2026-02-11
