# 冗余检测

> 检测规范文件中的重复和冗余内容

---

## 🎯 检测目标

识别以下类型的冗余：
1. **内容重复** - 相同内容在多处定义
2. **文件重复** - 功能相似的多个文件
3. **定义冗余** - 同一概念有多种定义方式
4. **示例重复** - 相同示例在多处出现

---

## 🔍 检测规则

### 规则 1: 确认点定义重复

```yaml
检测逻辑:
  1. 收集所有确认点定义位置
     - core/workflows/common/confirmation-points.md (权威)
     - README.md 快速参考
     - CONSTRAINTS.md
     - 各 workflow README.md
  2. 比较内容重复度

检测示例:
  位置1: confirmation-points.md (完整定义，50行)
  位置2: README.md (简化定义，10行)
  位置3: CONSTRAINTS.md (部分定义，15行)
  
  分析:
    - 位置1 是权威来源 ✅
    - 位置2 是简化引用 ✅ 合理
    - 位置3 与位置1 有 60% 重复 ⚠️ 可能冗余
    
建议:
  位置3 改为引用："详见 [确认点机制](../../workflows/common/confirmation-points.md)"
```

### 规则 2: 代码示例重复

```yaml
检测逻辑:
  1. 提取所有代码块
  2. 计算相似度（去除空格和注释后）
  3. 标记相似度 > 80% 的代码块

检测示例:
  位置1: code-standards.md L45-60
  位置2: api-standards.md L120-135
  内容: 相同的错误处理模式
  相似度: 92%
  
建议:
  1. 提取为公共示例
  2. 或在其中一处引用另一处
```

### 规则 3: 文件功能重叠

```yaml
检测逻辑:
  1. 分析文件标题和目的描述
  2. 检测功能重叠的文件对

检测示例:
  文件1: core/best-practices/compliance-check.md
  文件2: core/self-fix/detection/xxx.md
  重叠: 都涉及规范检查
  
分析:
  - compliance-check.md: 面向 AI 执行时的检查
  - detection/: 面向规范自身的检查
  结论: ✅ 不是真正重复，目的不同
```

### 规则 4: 多版本定义

```yaml
检测逻辑:
  1. 搜索同一概念的多处定义
  2. 检查是否有"新版本"替代"旧版本"

检测示例:
  概念: "预检查步骤"
  位置1: core/workflows/00-pre-check/README.md (v2, 3项)
  位置2: 某处旧文档 (v1, 5项)
  
建议:
  删除旧版本定义，或添加"已废弃"标记
```

---

## 🔧 检测脚本

```javascript
// 检测内容重复
function detectRedundancy() {
  const issues = [];
  const definitions = new Map();
  
  // 收集所有关键定义
  const keyTerms = ['确认点', 'CP1', 'CP2', 'CP3', '预检查', '模式切换'];
  
  for (const file of getAllMarkdownFiles()) {
    const content = readFile(file);
    
    for (const term of keyTerms) {
      const sections = extractSectionsContaining(content, term);
      
      if (sections.length > 0) {
        if (!definitions.has(term)) {
          definitions.set(term, []);
        }
        definitions.get(term).push({
          file,
          content: sections,
          lines: sections.length
        });
      }
    }
  }
  
  // 检测重复
  for (const [term, locations] of definitions) {
    if (locations.length > 2) {
      // 超过2处定义可能是冗余
      issues.push({
        type: '多处定义',
        term,
        locations: locations.map(l => l.file),
        suggestion: '考虑集中定义，其他位置改为引用'
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
  类型: 冗余检测
  扫描文件数: 138
  发现问题: 2

  问题列表:
    - 问题1:
        类型: 多处定义
        概念: 确认点机制
        位置: 
          - core/workflows/common/confirmation-points.md (权威)
          - README.md L250
          - CONSTRAINTS.md L20
        重复度: 45%
        建议: CONSTRAINTS.md 改为引用
        
    - 问题2:
        类型: 代码示例重复
        位置: 
          - code-standards.md L85
          - test-standards.md L150
        相似度: 88%
        建议: 提取为公共示例或互相引用
```

---

## ✅ 冗余容忍原则

以下情况的"重复"是**可接受**的：

1. **快速参考表** - README.md 中的简化版定义
2. **示例展示** - 不同场景下展示相同模式
3. **分层引用** - 通用规范 vs 项目规范的层级关系
4. **版本演进** - CHANGELOG 中记录的历史版本

---

**最后更新**: 2026-02-12

