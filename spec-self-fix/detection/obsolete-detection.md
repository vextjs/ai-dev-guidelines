# 过时检测

> 检测规范文件中的过时内容和废弃引用

---

## 🎯 检测目标

识别以下类型的过时内容：
1. **废弃文件引用** - 引用了已删除/移动的文件
2. **过时版本引用** - 引用了旧版本的工具/库
3. **过时示例** - 示例代码使用了废弃的 API
4. **过时声明** - 声称完成但实际未完成的功能

---

## 🔍 检测规则

### 规则 1: 断链检测

```yaml
检测逻辑:
  1. 扫描所有 .md 文件中的相对链接
  2. 验证链接目标是否存在
  3. 区分真实断链和模板占位符

排除规则:
  - templates/ 目录下的占位符链接
  - 代码块中的示例链接
  - 明确标注为"示例"的链接

检测示例:
  链接: [快速参考](../../QUICK-REFERENCE.md)
  目标: QUICK-REFERENCE.md
  结果: ❌ 文件不存在
```

### 规则 2: 版本声明验证

```yaml
检测逻辑:
  1. 提取 CHANGELOG.md 中声明"已完成"的功能
  2. 验证功能是否实际存在
  
检测示例:
  CHANGELOG v1.3.0: "✅ 增强 QUICK-REFERENCE.md"
  实际: 文件不存在
  结果: ❌ 虚假声明
  
修复建议:
  1. 创建声称的文件
  2. 或修正声明为"计划中"
```

### 规则 3: 目录结构验证

```yaml
检测逻辑:
  1. 解析 README.md 中的目录结构声明
  2. 与实际文件系统对比
  
检测示例:
  声明: "├── payment-service/"
  实际: 目录不存在
  结果: ❌ 虚假目录声明
```

### 规则 4: 最后更新日期检查

```yaml
检测逻辑:
  1. 提取文件中的"最后更新"日期
  2. 与文件实际修改时间对比
  3. 标记超过 30 天未更新的文件

检测示例:
  文件声明: "最后更新: 2026-01-01"
  实际修改: 2026-02-12
  结果: ⚠️ 更新日期过时
```

---

## 🔧 检测脚本

```javascript
// 检测过时引用
function detectObsoleteReferences() {
  const issues = [];
  
  // 收集所有声称"已完成"的功能
  const claimedFeatures = parseChangelog();
  
  for (const feature of claimedFeatures) {
    if (feature.status === '✅') {
      // 验证功能是否存在
      const exists = verifyFeatureExists(feature);
      if (!exists) {
        issues.push({
          type: '虚假声明',
          location: feature.source,
          claim: feature.description,
          suggestion: '创建文件或修正声明'
        });
      }
    }
  }
  
  return issues;
}

// 解析 CHANGELOG 中的声明
function parseChangelog() {
  const content = readFile('CHANGELOG.md');
  const features = [];
  
  // 匹配 "✅ xxx" 或 "- ✅ xxx" 格式
  const regex = /[✅⚠️❌]\s*\*?\*?([^*\n]+)\*?\*?/g;
  let match;
  
  while ((match = regex.exec(content)) !== null) {
    features.push({
      status: match[0].includes('✅') ? '✅' : '⚠️',
      description: match[1].trim(),
      source: 'CHANGELOG.md'
    });
  }
  
  return features;
}
```

---

## 📊 输出格式

```yaml
检测结果:
  类型: 过时检测
  扫描文件数: 138
  发现问题: 3

  问题列表:
    - 问题1:
        类型: 虚假声明
        位置: CHANGELOG.md (v1.3.0)
        详情: 声称"增强 QUICK-REFERENCE.md"但文件不存在
        建议: 修正为"计划中"
        
    - 问题2:
        类型: 目录不存在
        位置: README.md L103
        详情: 声明 "payment-service/" 但目录不存在
        建议: 删除声明或创建目录
        
    - 问题3:
        类型: 断链
        位置: outputs/README.md L67
        详情: 引用 ../QUICK-REFERENCE.md 不存在
        建议: 修正为有效链接
```

---

**版本**: v1.0  
**创建日期**: 2026-02-12

