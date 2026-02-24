# 冲突检测

> 检测规范文件之间的矛盾和冲突

---

## 🎯 检测目标

识别以下类型的冲突：
1. **规范定义冲突** - 同一概念在不同文件中有不同定义
2. **优先级冲突** - 规范优先级不明确或矛盾
3. **版本冲突** - 文件版本号不一致
4. **路径冲突** - 文件引用路径矛盾

---

## 🔍 检测规则

### 规则 1: 版本号一致性

```yaml
检测逻辑:
  1. 扫描所有 .md 文件头部的版本声明
  2. 提取 README.md 中的主版本号
  3. 比较是否一致

检测示例:
  README.md: "版本: v2.0.0"
  某文件尾部: "版本: v1.1"
  结果: ❌ 版本号冲突

修复建议:
  统一为最新版本号
```

### 规则 2: 命名规范一致性

```yaml
检测逻辑:
  1. 收集所有命名规范定义
     - code-standards.md 中的命名规范
     - projects/_template/profile/03-代码风格.md 中的命名规范
  2. 比较是否一致

检测示例:
  code-standards.md: "使用 camelCase"
  某项目规范: "使用 snake_case"
  结果: ⚠️ 可能是项目覆盖，需确认是否有意为之
```

### 规则 3: 确认点定义一致性

```yaml
检测逻辑:
  1. 收集所有确认点定义
     - workflows/common/confirmation-points.md
     - README.md 快速参考
     - 各 workflow 文件
  2. 比较 CP1/CP2/CP3 定义是否一致

检测示例:
  confirmation-points.md: "CP1 - 需求理解后"
  01-requirement-dev: "CP1 - 分析完成后"
  结果: ⚠️ 表述不一致，可能引起混淆
```

### 规则 4: 路径引用一致性

```yaml
检测逻辑:
  1. 扫描所有相对路径引用
  2. 检测同一文件是否被不同路径引用
  
检测示例:
  文件A: "[模板](./templates/core/xxx.md)"
  文件B: "[模板](./templates/xxx.md)"
  实际路径: templates/core/xxx.md
  结果: ❌ 文件 B 路径错误
```

---

## 🔧 检测脚本

```javascript
// 检测版本号一致性
function detectVersionConflict() {
  const versions = [];
  
  // 扫描所有 .md 文件
  for (const file of getAllMarkdownFiles()) {
    const content = readFile(file);
    const versionMatch = content.match(/版本[：:]\s*(v[\d.]+)/);
    if (versionMatch) {
      versions.push({
        file,
        version: versionMatch[1],
        location: versionMatch.index
      });
    }
  }
  
  // 找出不一致的版本
  const mainVersion = versions.find(v => v.file === 'README.md')?.version;
  const conflicts = versions.filter(v => v.version !== mainVersion);
  
  return conflicts;
}
```

---

## 📊 输出格式

```yaml
检测结果:
  类型: 冲突检测
  扫描文件数: 138
  发现冲突: 2

  冲突列表:
    - 冲突1:
        类型: 版本号不一致
        位置: README.md L467 vs L3
        详情: 尾部 "v1.1" vs 头部 "v2.0.0"
        建议: 统一为 v2.0.0
        
    - 冲突2:
        类型: 路径引用不一致
        位置: README.md L415
        详情: templates/optimization-template.md 应为 templates/core/
        建议: 修正为 templates/core/optimization-template.md
```

---

**版本**: v1.0  
**创建日期**: 2026-02-12

