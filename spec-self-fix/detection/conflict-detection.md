# 冲突检测

> 检测规范文件之间的矛盾和冲突

**版本**: v2.0
**创建日期**: 2026-02-12
**最后更新**: 2026-02-27

---

## 🎯 检测目标

识别以下类型的冲突：
1. **规范定义冲突** - 同一概念在不同文件中有不同定义
2. **优先级冲突** - 规范优先级不明确或矛盾
3. **版本冲突** - 文件版本号不一致
4. **路径冲突** - 文件引用路径矛盾
5. **流程时序冲突** - 执行顺序规则与实际行为不一致（🆕 v2.0）

---

## 🔍 检测规则

### 规则 1: 版本号一致性（🔴 v2.0 升级 — 主动全量检测）

```yaml
检测逻辑（v2.0 — 主动全量，非被动）:
  1. 🔴 逐个 read_file 以下 8 个文件，提取版本号（禁止推断，必须实际读取）
  2. 比较 8 个文件的版本号是否全部一致
  3. 任一不一致 → 标记为 🔴 P0 冲突

🔴 版本号文件清单（8 个 — 与 QUICK-REFERENCE.md §版本号文件清单 保持同步）:
  | # | 文件路径                           | 版本号位置                                                          |
  |:-:|-----------------------------------|-------------------------------------------------------------------|
  | 1 | .github/copilot-instructions.md   | L1 `**版本**: vX.Y.Z`                                              |
  | 2 | README.md                         | L3 `> **版本**: vX.Y.Z`                                            |
  | 3 | QUICK-REFERENCE.md                | L5 `**版本**: vX.Y.Z`                                              |
  | 4 | CONSTRAINTS.md                    | L6 `**版本**: vX.Y.Z`                                              |
  | 5 | STATUS.md                         | L5 `**当前版本**: vX.Y.Z`                                          |
  | 6 | CHANGELOG.md                      | 版本概览表新增行                                                     |
  | 7 | workflows/decision-tree.yaml      | L1 注释 + L4 `version` 字段 + L82 注释 + L87 `mandatory_precheck.version` |
  | 8 | workflows/00-pre-check/README.md  | L3 `> **版本**: vX.Y.Z` + 文件末尾 `**版本**: vX.Y.Z`（两处）         |

  ⚠️ 此清单与 QUICK-REFERENCE.md 同源，新增文件时两处必须同步更新。
  ⚠️ 非入口文件（如 task-memory.md v1.7、temp-reports.md v1.5）使用独立版本号，不在此清单中。

v1.0 旧逻辑（已废弃）:
  ❌ 扫描所有 .md 文件头部的版本声明 → 无明确清单，易遗漏
  ❌ 只比较"改了的文件" → 被动检查，已导致 3 次同类 Bug（BUG-023~031）

v2.0 新逻辑（替代）:
  ✅ 对照清单逐个 read_file → 主动全量检查，不依赖记忆
  ✅ 8 个文件全部一致才算通过
  ✅ 即使本次没有修改某文件，也必须确认其版本号

检测示例:
  文件 1: copilot-instructions.md → v2.11.0
  文件 2: README.md → v2.11.0
  文件 7: decision-tree.yaml → v2.10.0  ← ❌
  结果: 🔴 版本号冲突（decision-tree.yaml 落后）

修复建议:
  统一为最新版本号，同步更新所有 8 个文件
  参考: repair/repair-patterns.md §模式 5
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

### 规则 5: 流程时序合规性（🆕 v2.0）

```yaml
检测逻辑:
  1. 读取 workflows/common/task-memory.md §阶段 0 的时序强制规则
  2. 读取 workflows/00-pre-check/README.md §阶段 0 的时序强制规则
  3. 确认两处的时序规则内容一致
  4. 确认阶段 0 自检清单首项为时序检查（"记忆写入是否在分析用户问题之前完成"）
  5. 确认两个文件中阶段 0 步骤顺序一致

检测示例:
  task-memory.md 阶段 0:
    正确顺序: 预检查 → 写入记忆 → 输出"📝 记忆已更新" → 开始分析
    自检首项: "🔴 记忆写入是否在分析用户问题之前完成？"
  
  00-pre-check 阶段 0:
    正确顺序: 预检查 → 写入记忆 → 输出"📝 记忆已更新" → 开始分析
    ✅ 一致 → 通过

  ❌ 冲突情况:
    task-memory.md: "预检查 → 写入记忆 → 分析"
    00-pre-check: "预检查 → 分析 → 写入记忆"
    结果: 🔴 时序定义冲突

修复建议:
  以 task-memory.md 为权威来源，同步更新 00-pre-check/README.md
  参考: repair/repair-patterns.md §模式 9

触发场景:
  - 定期健康检查
  - 修改 task-memory.md 或 00-pre-check/README.md 后
  - 用户指出阶段 0 执行偏差

根因背景:
  此规则源于 §会话05 发现的阶段 0 时序违规事故 —— AI 先分析问题再补写记忆，
  导致记忆写入延迟。已在两处加入 🔴 NO EXCEPTIONS 时序强制规则，
  本检测规则确保两处定义不会在后续修改中产生偏差。
```

### 规则 6: 约束条数一致性

```yaml
检测逻辑:
  1. 读取 CONSTRAINTS.md 的实际约束条目数（## 标题数）
  2. 读取 QUICK-REFERENCE.md §核心约束 标题中的数字
  3. 读取 copilot-instructions.md 中约束条数描述
  4. 三处数字必须一致

检测示例:
  CONSTRAINTS.md: 实际 20 个 ### 标题
  QUICK-REFERENCE.md: "⚠️ 核心约束 (20条)"
  copilot-instructions.md: 未直接提及条数
  结果: ✅ 一致

  ❌ 冲
突情况:
  CONSTRAINTS.md: 实际 21 个 ### 标题
  QUICK-REFERENCE.md: "⚠️ 核心约束 (20条)"
  结果: 🔴 约束条数不一致
```

---

## 🔧 检测脚本

```javascript
// 检测版本号一致性（v2.0 — 基于 8 文件清单的主动全量检查）
function detectVersionConflict() {
  // 🔴 v2.0: 不再扫描全部 .md 文件，而是精确检查 8 个版本号文件
  const versionFiles = [
    { file: '.github/copilot-instructions.md', pattern: /\*\*版本\*\*:\s*(v[\d.]+)/ },
    { file: 'README.md', pattern: /\*\*版本\*\*:\s*(v[\d.]+)/ },
    { file: 'QUICK-REFERENCE.md', pattern: /\*\*版本\*\*:\s*(v[\d.]+)/ },
    { file: 'CONSTRAINTS.md', pattern: /\*\*版本\*\*:\s*(v[\d.]+)/ },
    { file: 'STATUS.md', pattern: /\*\*当前版本\*\*:\s*(v[\d.]+)/ },
    { file: 'CHANGELOG.md', pattern: /版本概览/ }, // 特殊：检查最新版本行
    { file: 'workflows/decision-tree.yaml', pattern: /version:\s*"([\d.]+)"/ },
    { file: 'workflows/00-pre-check/README.md', pattern: /\*\*版本\*\*:\s*(v[\d.]+)/ },
  ];

  const versions = [];

  for (const { file, pattern } of versionFiles) {
    const content = readFile(file); // 🔴 必须实际读取，禁止推断
    const match = content.match(pattern);
    if (match) {
      versions.push({ file, version: match[1] });
    } else {
      versions.push({ file, version: '⚠️ 未找到版本号' });
    }
  }

  // 以 copilot-instructions.md 为基准
  const mainVersion = versions[0]?.version;
  const conflicts = versions.filter(v =>
    v.version !== mainVersion && v.version !== '⚠️ 未找到版本号'
  );

  return { mainVersion, versions, conflicts };
}

// 检测流程时序一致性（🆕 v2.0）
function detectTimingConflict() {
  const taskMemory = readFile('workflows/common/task-memory.md');
  const preCheck = readFile('workflows/00-pre-check/README.md');

  const issues = [];

  // 检查两处是否都有时序强制规则
  const tmHasTiming = taskMemory.includes('时序强制规则（NO EXCEPTIONS）');
  const pcHasTiming = preCheck.includes('时序强制规则（NO EXCEPTIONS）');

  if (!tmHasTiming) {
    issues.push({ file: 'task-memory.md', issue: '缺少阶段 0 时序强制规则' });
  }
  if (!pcHasTiming) {
    issues.push({ file: '00-pre-check/README.md', issue: '缺少阶段 0 时序强制规则' });
  }

  // 检查自检清单首项是否为时序检查
  const tmChecklistMatch = taskMemory.match(/阶段 0 自检清单[\s\S]*?- \[ \] (.*?)$/m);
  if (tmChecklistMatch && !tmChecklistMatch[1].includes('记忆写入是否在分析用户问题之前完成')) {
    issues.push({ file: 'task-memory.md', issue: '自检清单首项不是时序检查' });
  }

  return issues;
}
```

---

## 📊 输出格式

```yaml
检测结果:
  类型: 冲突检测
  版本: v2.0
  扫描范围: 8 个版本号文件 + 流程时序文件
  发现冲突: N

  版本号检查（8 文件全量）:
    - copilot-instructions.md: v2.11.0 ✅
    - README.md: v2.11.0 ✅
    - QUICK-REFERENCE.md: v2.11.0 ✅
    - CONSTRAINTS.md: v2.11.0 ✅
    - STATUS.md: v2.11.0 ✅
    - CHANGELOG.md: v2.11.0 行存在 ✅
    - decision-tree.yaml: v2.11.0 ✅
    - 00-pre-check/README.md: v2.11.0 ✅
    结论: ✅ 8 文件版本号全部一致

  时序合规检查:
    - task-memory.md 阶段 0 时序规则: ✅ 存在
    - 00-pre-check 阶段 0 时序规则: ✅ 存在
    - 自检清单首项为时序检查: ✅ 是
    结论: ✅ 时序规则定义一致

  冲突列表（如有）:
    - 冲突1:
        类型: 版本号不一致
        位置: decision-tree.yaml L4
        详情: version: "2.10.0"（应为 "2.11.0"）
        建议: 统一为 v2.11.0
```

---

## 📋 v2.0 变更日志

```yaml
v2.0 (2026-02-27):
  新增:
    - 规则 1 升级: 嵌入 8 文件版本号清单，从被动检查升级为主动全量检查
    - 规则 5 新增: 流程时序合规性检测（阶段 0 时序强制规则一致性）
    - 规则 6 新增: 约束条数一致性检测
    - 检测脚本 v2.0: detectVersionConflict 基于 8 文件清单，detectTimingConflict 新增
  根因:
    - 版本号不一致已反复发生 3 次（BUG-023~031），根因是缺少明确文件清单
    - 阶段 0 时序违规已发生 1 次（§会话05），根因是两处定义可能产生偏差
  关联修复记录:
    - spec-self-fix/records/2026-02-27-version-sync-gap-and-stage0-timing.md

v1.0 (2026-02-12):
  初始版本: 基础版本号检测 + 命名规范 + 确认点 + 路径引用
```

---

## 🔗 相关文档

- `obsolete-detection.md` - 过时检测
- `completeness-detection.md` - 完整性检测
- `redundancy-detection.md` - 冗余检测
- `../repair/repair-patterns.md` §模式 5 - 版本号批量更新
- `../repair/repair-patterns.md` §模式 9 - 时序违规修复
- `../triggers/auto-triggers.md` §场景 5/6 - 版本号/时序自动触发
- `QUICK-REFERENCE.md` §版本号文件清单 - 权威清单来源

---

**版本**: v2.0
**最后更新**: 2026-02-27
**v2.0 核心改进**: 版本号检测从被动→主动全量（8文件清单）；新增时序合规检测；新增约束条数检测