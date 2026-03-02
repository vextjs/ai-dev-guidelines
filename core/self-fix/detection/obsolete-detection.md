# 过时检测

> 检测规范文件中的过时内容和废弃引用

**最后更新**: 2026-02-27

---

## 🎯 检测目标

识别以下类型的过时内容：
1. **废弃文件引用** - 引用了已删除/移动的文件
2. **过时版本引用** - 引用了旧版本的工具/库
3. **过时示例** - 示例代码使用了废弃的 API
4. **过时声明** - 声称完成但实际未完成的功能
5. **流程时序过时** - 执行顺序规则在某处已更新但其他引用处未同步（🆕 v2.0）

---

## 🔍 检测规则

### 规则 1: 断链检测

```yaml
检测逻辑:
  1. 扫描所有 .md 文件中的相对链接
  2. 验证链接目标是否存在
  3. 区分真实断链和模板占位符

排除规则:
  - core/templates/ 目录下的占位符链接
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

### 规则 5: 流程时序过时检测（🆕 v2.0）

```yaml
检测逻辑:
  1. 读取 core/workflows/common/task-memory/triggers.md §阶段 0 的时序强制规则和自检清单
  2. 读取 core/workflows/00-pre-check/README.md §阶段 0 的时序强制规则
  3. 对比两处的时序规则，确认一致性
  4. 如果一处已更新而另一处仍为旧版 → 标记为 🔴 时序过时

检测要点:
  - task-memory.md 是阶段 0 时序规则的权威来源
  - 00-pre-check/README.md 应与其保持同步
  - 阶段 0 自检清单首项必须为时序检查（"🔴 记忆写入是否在分析用户问题之前完成？"）
  - 如首项不是时序检查 → 说明自检清单已过时

检测示例:
  task-memory.md 阶段 0:
    🔴 时序强制规则（NO EXCEPTIONS）:
      正确顺序: 预检查 → 写入记忆 → 输出"📝 记忆已更新" → 开始分析
      错误顺序: 预检查 → 分析问题 → 补写记忆 ❌
    自检清单首项: "🔴 记忆写入是否在分析用户问题之前完成？"

  00-pre-check/README.md 阶段 0:
    ✅ 包含相同时序规则 → 通过
    ❌ 缺少时序规则 → 过时（需同步 task-memory.md 的最新版本）
    ❌ 时序规则内容不同 → 过时（以 task-memory.md 为准）

修复建议:
  从 task-memory.md 同步最新时序规则到 00-pre-check/README.md
  参考: repair/repair-patterns.md §模式 9

根因背景:
  此规则源于 §会话05 的阶段 0 时序违规事故 —— AI 先分析问题再补写记忆。
  修复后在两处都加入了 🔴 NO EXCEPTIONS 时序规则，
  本检测规则确保后续修改时不会出现一处更新、另一处过时的情况。
```

### 规则 6: 版本号文件清单同步检测（🆕 v2.0）

```yaml
检测逻辑:
  1. 读取 CROSS-VALIDATION.md §版本号文件清单 中列出的 8 个文件
  2. 读取 conflict-detection.md §规则 1 中列出的 8 个文件
  3. 读取 CONSTRAINTS.md 约束 #14 中引用的版本号清单
  4. 确认三处引用的文件清单内容一致
  5. 如果某处清单已增减文件而其他处未同步 → 标记为 ⚠️ 清单过时

检测示例:
  CROSS-VALIDATION.md: 8 个文件
  conflict-detection.md: 8 个文件 ✅ 一致
  CONSTRAINTS.md 约束 #14: 引用 "8 个文件全量同步" ✅ 一致

  ❌ 过时情况:
    CROSS-VALIDATION.md 新增第 9 个文件
    conflict-detection.md 仍只有 8 个
    结果: ⚠️ conflict-detection.md 版本号清单过时

修复建议:
  以 CROSS-VALIDATION.md 为权威来源，同步更新其他引用处
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

// 检测流程时序过时（🆕 v2.0）
function detectTimingObsolete() {
  const issues = [];
  
  const taskMemory = readFile('core/workflows/common/task-memory.md');
  const preCheck = readFile('core/workflows/00-pre-check/README.md');
  
  // 检查时序规则是否存在
  const tmHasTiming = taskMemory.includes('时序强制规则（NO EXCEPTIONS）');
  const pcHasTiming = preCheck.includes('时序强制规则（NO EXCEPTIONS）');
  
  if (tmHasTiming && !pcHasTiming) {
    issues.push({
      type: '时序规则过时',
      location: '00-pre-check/README.md',
      detail: 'task-memory.md 已有时序强制规则，但 00-pre-check 缺失',
      suggestion: '从 task-memory.md 同步时序规则到 00-pre-check'
    });
  }
  
  // 检查自检清单首项
  const checklistMatch = taskMemory.match(/阶段 0 自检清单[\s\S]*?- \[ \] (.*?)$/m);
  if (checklistMatch && !checklistMatch[1].includes('记忆写入是否在分析用户问题之前完成')) {
    issues.push({
      type: '自检清单过时',
      location: 'task-memory/triggers.md §阶段 0 自检清单',
      detail: '首项不是时序检查',
      suggestion: '将时序检查调整为自检清单首项'
    });
  }
  
  return issues;
}

// 检测版本号清单同步状态（🆕 v2.0）
function detectVersionListObsolete() {
  const issues = [];
  
  const crossValidation = readFile('CROSS-VALIDATION.md');
  const conflictDetection = readFile('core/self-fix/detection/conflict-detection.md');
  const constraints = readFile('CONSTRAINTS.md');
  
  // 提取各处版本号文件清单中的文件数
  const cvCount = (crossValidation.match(/版本号文件清单[\s\S]*?\|.*?\|/g) || []).length;
  const cdCount = (conflictDetection.match(/版本号文件清单[\s\S]*?\|.*?\|/g) || []).length;
  
  if (cvCount !== cdCount) {
    issues.push({
      type: '版本号清单不同步',
      location: 'CROSS-VALIDATION.md vs conflict-detection.md',
      detail: `CROSS-VALIDATION 列出 ${cvCount} 个文件，conflict-detection 列出 ${cdCount} 个`,
      suggestion: '以 CROSS-VALIDATION.md 为准，同步更新 conflict-detection.md'
    });
  }
  
  return issues;
}
```

---

## 📊 输出格式

```yaml
检测结果:
  类型: 过时检测
  版本: v2.0
  扫描文件数: N
  发现问题: N

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

    - 问题4（🆕 v2.0）:
        类型: 时序规则过时
        位置: 00-pre-check/README.md §阶段 0
        详情: task-memory.md 已有时序强制规则但此文件缺失
        建议: 从 task-memory.md 同步时序规则

    - 问题5（🆕 v2.0）:
        类型: 版本号清单不同步
        位置: conflict-detection.md vs CROSS-VALIDATION.md
        详情: 版本号文件清单数量不一致
        建议: 以 CROSS-VALIDATION.md 为准同步
```

---

## 📋 v2.0 变更日志

```yaml
v2.0 (2026-02-27):
  新增:
    - 规则 5: 流程时序过时检测（阶段 0 时序强制规则跨文件同步检测）
    - 规则 6: 版本号文件清单同步检测（CROSS-VALIDATION/conflict-detection/CONSTRAINTS 三处一致性）
    - 检测脚本: detectTimingObsolete()、detectVersionListObsolete() 新增
    - 检测目标新增第 5 类: 流程时序过时
  根因:
    - 阶段 0 时序违规（§会话05）暴露了跨文件规则定义可能不同步的风险
    - 版本号清单如果只在 CROSS-VALIDATION 维护而不同步到 spec-self-fix 检测模块，
      后续健康检查不会使用最新清单
  关联修复记录:
    - core/self-fix/records/2026-02-27-version-sync-gap-and-stage0-timing.md

v1.0 (2026-02-12):
  初始版本: 断链检测 + 版本声明验证 + 目录结构验证 + 更新日期检查
```

---

## 🔗 相关文档

- `conflict-detection.md` - 冲突检测（含版本号 8 文件清单）
- `completeness-detection.md` - 完整性检测
- `redundancy-detection.md` - 冗余检测
- `../repair/repair-patterns.md` §模式 9 - 时序违规修复
- `../triggers/auto-triggers.md` §场景 5/6 - 版本号/时序自动触发
- `CROSS-VALIDATION.md` §版本号文件清单 - 权威清单来源

---

**最后更新**: 2026-03-02