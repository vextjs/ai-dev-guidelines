# 冲突检测

> 检测规范文件之间的矛盾和冲突

**版本**: v2.1
**创建日期**: 2026-02-12
**最后更新**: 2026-02-28

---

## 🎯 检测目标

识别以下类型的冲突：
1. **规范定义冲突** - 同一概念在不同文件中有不同定义
2. **优先级冲突** - 规范优先级不明确或矛盾
3. **版本冲突** - 文件版本号不一致
4. **路径冲突** - 文件引用路径矛盾
5. **流程时序冲突** - 执行顺序规则与实际行为不一致（🆕 v2.0）+ 预检查第 6 行存在性（🆕 v2.1）

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
  | 7 | core/workflows/decision-tree.yaml      | L1 注释 + L4 `version` 字段 + L82 注释 + L87 `mandatory_precheck.version` |
  | 8 | core/workflows/00-pre-check/README.md  | L3 `> **版本**: vX.Y.Z` + 文件末尾 `**版本**: vX.Y.Z`（两处）         |

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
     - core/workflows/common/confirmation-points.md
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
  实际路径: core/templates/core/xxx.md
  结果: ❌ 文件 B 路径错误
```

### 规则 5: 流程时序合规性 + 预检查第 6 行存在性（🆕 v2.0 / 🔴 v2.1 扩展）

```yaml
检测逻辑:
  === 原有检测（v2.0）===
  1. 读取 core/workflows/common/task-memory.md §阶段 0 的时序强制规则
  2. 读取 core/workflows/00-pre-check/README.md §阶段 0 的时序强制规则
  3. 确认两处的时序规则内容一致
  4. 确认阶段 0 自检清单首项为时序检查（"预检查第 6 行是否已输出"）
  5. 确认两个文件中阶段 0 步骤顺序一致

  === 🔴 新增检测（v2.1 — 预检查第 6 行硬性阻塞存在性）===
  6. 预检查第 6 行（📝 记忆已创建）在 3 处文件中是否都存在且格式一致:
     a. core/workflows/00-pre-check/README.md §检查清单 + §输出格式（标准/扩展）
     b. QUICK-REFERENCE.md §预检查模板
     c. core/workflows/00-pre-check/memory-and-rules.md §阶段 0 输出
  7. 第 6 行格式是否统一为:
     "6. 📝 记忆已创建: .ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN (🔄)"
  8. 第 6 行是否标注为 "🔴 阶段0 硬性阻塞"（防止被误认为可选项）
  9. task-memory.md §阶段 0 自检清单首项是否为:
     "🔴 预检查第 6 行是否已输出？（'6. 📝 记忆已创建: ...'）— 未输出 = 预检查未完成"
  10. copilot-instructions.md 预检查描述是否包含 "第 6 行阶段0 记忆写入硬性阻塞"

检测示例（v2.0 — 时序一致性）:
  task-memory.md 阶段 0:
    正确顺序: 预检查 1-5 项 → 写入记忆 → 输出第 6 行"📝 记忆已创建" → 开始分析
    自检首项: "🔴 预检查第 6 行是否已输出？"
  
  00-pre-check 阶段 0:
    正确顺序: 预检查 1-5 项 → 写入记忆 → 输出第 6 行"📝 记忆已创建" → 开始分析
    ✅ 一致 → 通过

  ❌ 冲突情况:
    task-memory.md: "预检查 1-5 项 → 写入记忆 → 第 6 行 → 分析"
    00-pre-check: "预检查 1-5 项 → 分析 → 写入记忆"
    结果: 🔴 时序定义冲突

检测示例（🆕 v2.1 — 第 6 行存在性）:
  00-pre-check/README.md §检查清单:
    包含 "6. 📝 记忆已创建: [...] ← 🔴 阶段0 硬性阻塞" → ✅
  QUICK-REFERENCE.md §预检查:
    包含 "6. 📝 记忆已创建: [...] ← 🔴 阶段0 硬性阻塞" → ✅
  memory-and-rules.md §阶段 0:
    输出行包含 "6. 📝 记忆已创建: ..." → ✅
  copilot-instructions.md:
    包含 "第 6 行阶段0 记忆写入硬性阻塞" → ✅
  结果: ✅ 4 处定义一致

  ❌ 缺失情况:
  QUICK-REFERENCE.md §预检查: 只有 5 行，无第 6 行
  结果: 🔴 预检查第 6 行缺失（硬性阻塞被移除，阶段 0 时序保护失效）

修复建议:
  时序冲突: 以 task-memory.md 为权威来源，同步更新 00-pre-check/README.md
  第 6 行缺失: 参考 repair/repair-patterns.md §模式 11，补齐缺失位置
  参考: repair/repair-patterns.md §模式 9（时序违规）/ §模式 11（预检查-记忆原子操作）

触发场景:
  - 定期健康检查
  - 修改 task-memory.md 或 00-pre-check/README.md 后
  - 修改 QUICK-REFERENCE.md §预检查模板后
  - 修改 copilot-instructions.md 预检查描述后
  - 用户指出阶段 0 执行偏差时

根因背景:
  此规则源于 §会话05 + vscode-copilot §会话01 的 2 次阶段 0 时序违规事故 ——
  AI 先分析问题再补写记忆，导致记忆写入延迟或遗忘。
  v2.0: 在两处加入 🔴 NO EXCEPTIONS 时序强制规则，确保定义不产生偏差。
  v2.1: 预检查第 6 行硬性阻塞（soft gate → hard gate 升级），
        将记忆写入嵌入预检查输出格式，消除预检查完成与记忆写入之间的空隙。
        本检测规则确保第 6 行在 4 处文件中一致存在，防止后续修改时被遗漏。
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

### 规则 7: 混合意图防护一致性（🆕 v2.2 FIX-010）

```yaml
检测逻辑:
  1. 确认以下 3 处文件都包含混合意图优先级规则:
     a. core/workflows/00-task-identification/rules.md §混合意图优先级规则
     b. core/workflows/01-requirement-dev/README.md §强制执行规则（混合意图判定）
     c. core/workflows/10-analysis/README.md §变更意图检测
  2. 确认 QUICK-REFERENCE.md 任务类型映射表包含混合意图说明
  3. 确认 3 处文件的规则表述一致（含变更意图 → 需求开发）

检测示例:
  00-task-identification/rules.md: 包含 §混合意图优先级规则 → ✅
  01-requirement-dev/README.md: 包含 FIX-010 混合意图判定 → ✅
  10-analysis/README.md: 包含 §变更意图检测 → ✅
  QUICK-REFERENCE.md: 包含混合意图规则说明 → ✅
  结果: ✅ 4 处定义一致

  ❌ 缺失情况:
  10-analysis/README.md: 无变更意图检测入口
  结果: 🔴 混合意图防护不完整（分析工作流缺少转出规则，可能再次误判）

根因背景:
  FIX-010 — AI 将含变更意图的请求（目录重构）误判为深度分析任务，
  跳过了需求开发的 CP1/CP2/CP3 确认点，直接输出完整分析方案。
  修复方案在 3 处工作流 + 1 处速查手册中加入混合意图防护。
  本规则确保 4 处定义一致存在，防止后续修改时遗漏。

触发场景:
  - 定期健康检查
  - 修改 00-task-identification/ 后
  - 修改 01-requirement-dev/ 或 10-analysis/ 后
  - 用户指出任务类型误判时
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
    { file: 'core/workflows/decision-tree.yaml', pattern: /version:\s*"([\d.]+)"/ },
    { file: 'core/workflows/00-pre-check/README.md', pattern: /\*\*版本\*\*:\s*(v[\d.]+)/ },
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
  const taskMemory = readFile('core/workflows/common/task-memory.md');
  const preCheck = readFile('core/workflows/00-pre-check/README.md');

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

## 📋 变更日志

```yaml
v2.2 (2026-02-28):
  新增:
    - 规则 7: 混合意图防护一致性检测（4 处文件同步）
  根因:
    - FIX-010 — AI 将含变更意图的请求误判为分析，跳过确认点
    - 修复方案在 3 处工作流 + 1 处速查手册中加入防护规则
    - 需要检测规则确保 4 处定义一致存在
  关联:
    - core/workflows/00-task-identification/rules.md §混合意图优先级规则
    - core/workflows/01-requirement-dev/README.md §强制执行规则
    - core/workflows/10-analysis/README.md §变更意图检测
    - QUICK-REFERENCE.md §任务类型映射

v2.1 (2026-02-28):
  新增:
    - 规则 5 扩展: 预检查第 6 行（📝 记忆已创建）存在性检测（4 处文件同步一致性）
    - 检测项 6-10: 第 6 行格式一致性、硬性阻塞标注、自检清单首项、copilot-instructions 同步
  根因:
    - 阶段 0 时序违规已发生 2 次（§会话05 + vscode-copilot §会话01），
      根因是预检查完成与记忆写入之间缺少硬性阻塞（soft gate），
      修复方案为将记忆写入嵌入预检查第 6 行（hard gate 升级）
    - 需要检测规则确保第 6 行在多处定义中一致存在，防止被后续修改遗漏
  关联:
    - triggers/auto-triggers.md §场景 9（预检查缺少记忆写入确认行检测）
    - repair/repair-patterns.md §模式 11（预检查-记忆原子操作修复）

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
    - core/self-fix/records/2026-02-27-version-sync-gap-and-stage0-timing.md

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

**版本**: v2.2
**最后更新**: 2026-02-28
**v2.1 核心改进**: 规则 5 扩展预检查第 6 行存在性检测（4 处文件同步）；v2.0 核心改进: 版本号检测从被动→主动全量（8文件清单）；新增时序合规检测；新增约束条数检测；v2.2 新增规则 7 混合意图防护一致性检测
