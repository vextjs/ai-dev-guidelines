# 修复模式库

> 规范问题的标准化修复模式

**版本**: v2.0
**创建日期**: 2026-02-12
**最后更新**: 2026-02-27

---

## 📋 模式概览（11 个模式）

| 模式 | 触发条件 | 安全等级 | 自动化 |
|-----|---------|---------|--------|
| 模式 1: 补充缺失章节 | 完整性检测 | ✅ 安全 | 自动 |
| 模式 2: 修复死链接 | 链接检测 | ✅ 安全 | 自动 |
| 模式 3: 添加可覆盖标记 | 完整性检测 | ✅ 安全 | 自动 |
| 模式 4: 内容合并 | 冗余检测 | ⚠️ 需确认 | 半自动 |
| 模式 5: 版本号批量更新 | 版本检测 | ✅ 安全 | 自动（🔴 v2.0 升级：主动全量） |
| 模式 6: 依赖链修复 | 链接检测 | ⚠️ 需确认 | 半自动 |
| 模式 7: 术语统一 | 冲突检测 | ⚠️ 需确认 | 半自动 |
| 模式 8: 格式标准化 | 格式检测 | ✅ 安全 | 自动 |
| 模式 9: 时序违规修复 | 时序检测 | ✅ 安全 | 自动（🆕 v2.0） |
| 模式 10: 知识库断层修复 | 断层检测 | ⚠️ 需确认 | 半自动（🆕 v2.0） |

---

## 🔧 模式详情

### 模式 1: 补充缺失章节

```yaml
触发条件: 完整性检测发现缺少必要章节

安全等级: ✅ 安全（只添加不删除）

执行步骤:
  1. 确定缺失章节类型
  2. 加载对应模板
  3. 确定插入位置（通常在文件末尾）
  4. 插入内容
  5. 验证 Markdown 格式

示例:
  检测: workflows/04-research/README.md 缺少 "## ✅ 完成检查清单"
  模板: templates/common/checklist.md
  插入位置: 最后一个 "---" 之前
  结果: 添加标准检查清单章节
```

---

### 模式 2: 修复死链接

```yaml
触发条件: 发现链接指向不存在的文件

安全等级: ✅ 安全

执行步骤:
  1. 提取失效链接
  2. 搜索文件系统查找可能的新位置
  3. 如找到匹配: 更新链接
  4. 如未找到:
     - 选项 A: 删除链接保留文本
     - 选项 B: 标记为待处理
  5. 记录修复

示例:
  检测: [模板](./templates/old.md) 指向不存在文件
  搜索: 查找 "old" 相关文件
  找到: ./templates/core/old-template.md
  修复: [模板](./templates/core/old-template.md)
```

---

### 模式 3: 添加可覆盖标记

```yaml
触发条件: standards/README.md 标注可覆盖，但规范文件无标记

安全等级: ✅ 安全

执行步骤:
  1. 读取 standards/README.md 的可覆盖列表
  2. 检查每个规范文件是否有标记
  3. 在缺少标记的文件头部添加

示例:
  检测: code-standards.md 可覆盖但无标记
  添加位置: 文件头部元数据后
  添加内容:
    > **可被项目覆盖**: ✅ 是（项目规范优先）
```

---

### 模式 4: 内容合并

```yaml
触发条件: 检测到高度重复内容（>70% 相似度）

安全等级: ⚠️ 需确认（可能删除有用信息）

执行步骤:
  1. 识别重复内容位置
  2. 确定主文件（保留完整内容）
  3. 生成合并方案
  4. 展示给用户确认
  5. 执行合并
  6. 在其他文件添加引用

示例:
  检测:
    - CONSTRAINTS.md 第 50-80 行
    - confirmation-points.md 第 20-50 行
    相似度: 85%

  方案:
    主文件: confirmation-points.md（内容更完整）
    修改: CONSTRAINTS.md 删除重复，添加引用

  询问: "发现重复内容，是否合并？[Y/N]"
```

---

### 模式 5: 版本号批量更新（🔴 v2.0 升级 — 主动全量）

```yaml
触发条件:
  v1.0（已废弃）: 主版本号变更，其他文件版本号不一致
  v2.0（当前）: 任何涉及版本号变更的操作 → 主动全量检查 8 个文件

安全等级: ✅ 安全

🔴 v2.0 核心变化:
  - 从"扫描发现不一致再修"升级为"对照清单逐个 read_file 确认"
  - 即使本次没有修改某个文件，也必须检查其版本号
  - 8 个文件全部一致才算修复完成

🔴 版本号文件清单（8 个 — 与 QUICK-REFERENCE.md §版本号文件清单 同源）:

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

执行步骤（v2.0）:
  1. 确定目标版本号（通常从 copilot-instructions.md 或用户指令获取）
  2. 🔴 逐个 read_file 8 个文件（禁止推断"应该没问题"）
  3. 提取每个文件的当前版本号
  4. 标记所有与目标版本不一致的文件
  5. 批量更新不一致的文件:
     a. 更新版本号
     b. 更新"最后更新"日期（使用 now() 获取真实日期）
  6. 🔴 修复后再次逐个 read_file 验证 8 个文件版本号全部一致
  7. 输出验证结果

v1.0 示例（已废弃）:
  主版本: v2.0.0 (README.md)
  发现:
    - STATUS.md: v1.3.0 → v2.0.0
    - decision-tree.yaml: v1.0.0 → v2.0.0
  执行: 批量更新
  ❌ 问题: 只更新了"发现的"文件，遗漏了没扫到的文件

v2.0 示例:
  目标版本: v2.11.0
  逐个检查:
    1. copilot-instructions.md → v2.11.0 ✅
    2. README.md → v2.11.0 ✅
    3. QUICK-REFERENCE.md → v2.11.0 ✅
    4. CONSTRAINTS.md → v2.11.0 ✅
    5. STATUS.md → v2.11.0 ✅
    6. CHANGELOG.md → v2.11.0 行存在 ✅
    7. decision-tree.yaml → v2.10.0 ❌ → 更新为 v2.11.0
    8. 00-pre-check/README.md → v2.10.0 ❌ → 更新为 v2.11.0
  修复后验证: 8/8 一致 ✅

根因背景:
  模式 5 在 v1.0 时只是通用的"扫描→修复"，导致版本号遗漏反复发生 3 次
  （BUG-023~031）。根因是缺少明确的文件清单 + 只有被动检查。
  v2.0 嵌入了 8 文件清单 + 主动全量检查，消除了"靠记忆想还有哪些文件"的风险。

关联:
  - detection/conflict-detection.md §规则 1（8 文件清单的检测逻辑）
  - triggers/auto-triggers.md §场景 5（版本号全量同步自动触发）
  - QUICK-REFERENCE.md §版本号文件清单（权威清单来源）
  - CONSTRAINTS.md 约束 #14（交叉验证要求）
```

---

### 模式 6: 依赖链修复

```yaml
触发条件: 文件A引用B，B引用C，C不存在

安全等级: ⚠️ 需确认

执行步骤:
  1. 构建引用依赖图
  2. 检测断裂的依赖链
  3. 定位根本问题（最终失效的文件）
  4. 生成修复方案:
     - 创建缺失文件
     - 或更新所有引用

示例:
  依赖链:
    README.md → workflows/common/base.md → templates/base-template.md
                                           ↑ 不存在

  方案:
    [A] 创建 templates/base-template.md
    [B] 更新 workflows/common/base.md 删除此引用
```

---

### 模式 7: 术语统一

```yaml
触发条件: 检测到同一概念多种表述

安全等级: ⚠️ 需确认

执行步骤:
  1. 识别同义表述
  2. 确定标准术语
  3. 批量替换
  4. 可选: 添加术语别名说明

示例:
  检测:
    - "确认点" 出现 45 次
    - "检查点" 出现 12 次
    - "CP" 出现 30 次

  标准化: 统一为 "确认点 (CP)"

  替换规则:
    - "检查点" → "确认点"
    - 保留 "CP" 作为缩写
```

---

### 模式 8: 格式标准化

```yaml
触发条件: 格式不符合规范

安全等级: ✅ 安全

执行步骤:
  1. 检测格式问题:
     - 标题级别不正确
     - 列表格式不一致
     - 代码块缺少语言标记
     - 表格格式错误
  2. 自动修复

示例:
  检测: 代码块缺少语言标记
  修复:
    ```          →  ```yaml
    key: value       key: value
    ```              ```
```

---

### 模式 9: 时序违规修复（🆕 v2.0）

```yaml
触发条件:
  - detection/conflict-detection.md §规则 5 检测到时序定义冲突
  - detection/obsolete-detection.md §规则 5 检测到时序规则过时
  - triggers/auto-triggers.md §场景 6 检测到阶段 0 时序违规
  - 用户指出 AI 执行顺序不正确

安全等级: ✅ 安全（只修改规则定义，不影响业务逻辑）

修复目标:
  确保阶段 0 时序强制规则在以下两个文件中保持一致:
  - workflows/common/task-memory.md §阶段 0（权威来源）
  - workflows/00-pre-check/README.md §阶段 0（同步副本）

时序强制规则内容（必须在两处都存在）:
  🔴 时序强制规则（NO EXCEPTIONS）:
    阶段 0 的全部步骤（预检查 + 记忆写入）必须在 AI 开始分析用户问题之前完成。
    禁止"先分析问题、再补写记忆"— 这会导致记忆写入被遗忘或延迟。
    正确顺序: 预检查 → 写入记忆(§会话NN) → 输出"📝 记忆已更新" → 然后才开始分析用户问题
    错误顺序: 预检查 → 分析问题 → 输出结论 → 最后才补写记忆 ❌（已发生事故：§会话05）

自检清单首项（必须在 task-memory.md 阶段 0 自检清单中存在）:
  - [ ] 🔴 记忆写入是否在分析用户问题之前完成？（不是分析完才补写）

执行步骤:
  1. 读取 task-memory.md §阶段 0 的完整时序规则（权威来源）
  2. 读取 00-pre-check/README.md §阶段 0 的时序规则
  3. 对比两处内容:
     a. 两处都有时序规则 → 检查内容是否一致，不一致则以 task-memory.md 为准同步
     b. task-memory.md 有但 00-pre-check 缺失 → 从 task-memory.md 复制到 00-pre-check
     c. 两处都缺失 → 🔴 严重问题，需要重新添加完整时序规则（参考上方内容）
  4. 检查 task-memory.md 阶段 0 自检清单:
     a. 首项是否为时序检查 → 如果不是，调整为首项
     b. 自检清单是否存在 → 如果不存在，添加完整自检清单
  5. 修复后验证:
     a. 两处时序规则内容一致 ✅
     b. 自检清单首项为时序检查 ✅
     c. 两处阶段 0 步骤顺序一致 ✅

示例:
  检测: 00-pre-check/README.md 缺少时序强制规则
  权威来源: task-memory.md 已有完整时序规则
  修复:
    在 00-pre-check/README.md §阶段 0 的 yaml 代码块中添加:
      🔴 时序强制规则（NO EXCEPTIONS）:
        阶段 0 的全部步骤（预检查 + 记忆写入）必须在 AI 开始分析用户问题之前完成。
        ...
  验证:
    - task-memory.md 阶段 0 时序规则 ✅
    - 00-pre-check 阶段 0 时序规则 ✅（已同步）
    - 自检清单首项 ✅

根因背景:
  此模式源于 §会话05 的阶段 0 时序违规事故 —— AI 先分析问题再补写记忆，
  导致记忆写入延迟。修复后在两处都加入了 🔴 NO EXCEPTIONS 时序强制规则。
  本修复模式确保:
  1) 当检测到时序规则定义偏差时，有标准化的修复流程
  2) 以 task-memory.md 为权威来源，00-pre-check 为同步副本
  3) 自检清单的时序检查位置固定为首项

关联:
  - detection/conflict-detection.md §规则 5（流程时序合规性检测）
  - detection/obsolete-detection.md §规则 5（流程时序过时检测）
  - triggers/auto-triggers.md §场景 6（阶段 0 时序合规自动触发）
  - workflows/common/task-memory.md §阶段 0 时序强制规则
  - workflows/00-pre-check/README.md §阶段 0 时序强制规则
```

---

### 模式 10: 知识库断层修复（🆕 v2.0）

```yaml
触发条件:
  - triggers/auto-triggers.md §场景 7 检测到反复问题
  - triggers/user-intent-detection.md §模式 5 用户指出修复未生效/复现
  - 规范修复后回写完整性验证发现断层

安全等级: ⚠️ 需确认（涉及多个文件联动修改）

修复目标:
  当规范修复只写入了"执行流程入口文件"（QUICK-REFERENCE / CONSTRAINTS / task-memory / 00-pre-check）
  但未回写到"spec-self-fix 知识库"（detection / triggers / repair / records）时，
  补齐知识库中缺失的检测规则、触发场景、修复模式。

断层检测清单（6 项）:
  □ 修复是否写入了执行流程入口文件？（QUICK-REFERENCE / CONSTRAINTS / task-memory / 00-pre-check）
  □ 修复是否回写到 spec-self-fix/detection/？（检测规则是否更新）
  □ 修复是否回写到 spec-self-fix/triggers/？（自动触发场景是否新增）
  □ 修复是否回写到 spec-self-fix/repair/？（修复模式是否更新）
  □ 修复记录是否更新到 spec-self-fix/records/？（修复记录和 summary.md）
  □ .ai-memory 记忆文件是否更新？

  任一项为"否" → 存在断层，需要补齐

执行步骤:
  1. 确定缺失的层面（执行流程 / 检测 / 触发 / 修复 / 记录）
  2. 对于每个缺失层面:
     a. 读取原始修复的内容（从修复记录或执行流程入口文件中提取）
     b. 确定需要更新的目标文件
     c. 生成变更内容
     d. 列出变更计划，等待用户确认
  3. 按计划执行修改
  4. 修复后执行回写完整性验证（6 项全部 ✅）
  5. 更新修复记录和 records/summary.md

修复内容映射:
  | 修复类型 | 需要更新的知识库文件 | 更新内容 |
  |---------|-------------------|---------|
  | 新增检测规则 | detection/*.md | 新增规则（编号、逻辑、示例） |
  | 新增触发场景 | triggers/auto-triggers.md | 新增场景（编号、触发条件、执行方式） |
  | 新增用户触发模式 | triggers/user-intent-detection.md | 新增模式（关键词、识别步骤、响应模板） |
  | 新增修复模式 | repair/repair-patterns.md | 新增模式（编号、步骤、示例） |
  | 版本号同步规则 | detection/conflict-detection.md §规则 1 | 嵌入 8 文件清单 |
  | 时序规则 | detection/conflict-detection.md §规则 5 | 时序合规检测逻辑 |
  | 反复问题升级 | triggers/auto-triggers.md §场景 7 | 升级等级和全链路修复要求 |

示例:
  场景: §会话05 修复了版本号遗漏和阶段 0 时序问题
  
  修复写入了执行流程入口:
    ✅ QUICK-REFERENCE.md（8 文件清单 + 主动全量检查）
    ✅ CONSTRAINTS.md（约束 #14 增强）
    ✅ task-memory.md（阶段 0 时序强制规则）
    ✅ 00-pre-check/README.md（阶段 0 时序强制规则）
  
  但知识库未同步:
    ❌ detection/conflict-detection.md → 缺少 8 文件清单和时序检测规则
    ❌ detection/obsolete-detection.md → 缺少时序过时检测规则
    ❌ triggers/auto-triggers.md → 缺少版本号全量和时序合规触发场景
    ❌ triggers/user-intent-detection.md → 缺少反复问题升级触发模式
    ❌ repair/repair-patterns.md → 模式 5 未升级，缺少模式 9/10
    ❌ repair/auto-repair.md → 未添加新的自动修复场景
  
  断层修复:
    → 6 个文件全部从 v1.0 升级到 v2.0
    → 嵌入 8 文件清单、时序规则、反复问题升级机制
    → 修复后回写完整性验证: 6/6 ✅

🔴 防止未来断层的机制:
  每次执行规范修复后，必须在最后阶段执行以下检查:
  
  "修复回写完整性验证（6 项）"
    □ 执行流程入口 → 已写入？
    □ spec-self-fix/detection/ → 检测规则已更新？
    □ spec-self-fix/triggers/ → 触发场景已更新？
    □ spec-self-fix/repair/ → 修复模式已更新？
    □ spec-self-fix/records/ → 修复记录已更新？
    □ .ai-memory → 记忆已更新？
  
  如果修复不涉及某个层面（如不需要新增检测规则），标注"不适用"即可，
  但必须逐项过一遍而不是跳过验证。

根因背景:
  此模式源于 §会话06 用户指出的核心问题 —— 上次修复只写入了执行流程入口
  （QUICK-REFERENCE / CONSTRAINTS / task-memory），但 spec-self-fix 知识库本身
  没有同步更新。6 个子模块仍停留在 v1.0，导致:
  - 未来健康检查不会使用最新检测规则
  - 自动触发场景不包含已知的关键检测
  - 修复模式库不包含已验证的修复流程
  → 修复可能被遗忘，问题可能复现

关联:
  - triggers/auto-triggers.md §场景 7（反复问题自动升级）
  - triggers/user-intent-detection.md §模式 5（反复问题用户触发）
  - spec-self-fix/records/summary.md（修复历史统计）
```

---

### 模式 11: 预检查-记忆原子操作修复（🆕 v2.1）

```yaml
触发条件:
  - detection/conflict-detection.md §规则 5 检测到预检查第 6 行缺失
  - triggers/auto-triggers.md §场景 9 检测到预检查缺少记忆写入确认行
  - 用户指出阶段 0 记忆写入被跳过（反复问题）

安全等级: ✅ 安全（只修改输出格式定义和规则描述，不影响业务逻辑）

修复目标:
  确保预检查第 6 行（📝 记忆已创建 — 阶段 0 硬性阻塞）在以下 4 处文件中一致存在:
  - workflows/00-pre-check/README.md §检查清单 + §输出格式（标准/扩展）（权威来源）
  - QUICK-REFERENCE.md §预检查模板
  - workflows/00-pre-check/memory-and-rules.md §阶段 0 输出
  - .github/copilot-instructions.md 预检查描述

第 6 行标准格式（必须在上述 4 处都存在或引用）:
  "6. 📝 记忆已创建: .ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN (🔄)"
  标注: "← 🔴 阶段0 硬性阻塞"

关联的自检清单更新（task-memory.md §阶段 0）:
  自检清单首项必须为:
  "🔴 预检查第 6 行是否已输出？（'6. 📝 记忆已创建: ...'）— 未输出 = 预检查未完成"

执行步骤:
  1. 逐个 read_file 检查 4 处文件，确认第 6 行是否存在
  2. 对于每个缺失的位置:
     a. 确定插入点（预检查第 5 行之后）
     b. 插入第 6 行标准格式
     c. 如有按需检查编号（原 6/7），调整为 7/8
     d. 确保标注 "🔴 阶段0 硬性阻塞"（防止被误认为可选项）
  3. 检查 task-memory.md §阶段 0:
     a. 自检清单首项是否为第 6 行输出检查
     b. 阶段 0 步骤中是否包含 "输出预检查第 6 行" 步骤
     c. 硬性阻塞机制说明是否存在
  4. 检查 copilot-instructions.md:
     a. 预检查描述是否包含 "第 6 行阶段0 记忆写入硬性阻塞"
  5. 修复后验证:
     a. 4 处文件均包含第 6 行 ✅
     b. 第 6 行格式一致 ✅
     c. 硬性阻塞标注存在 ✅
     d. 自检清单首项正确 ✅
     e. 按需检查编号已调整（7/8）✅

修复内容映射:
  | 缺失位置 | 修复动作 | 关键检查 |
  |---------|---------|---------|
  | 00-pre-check/README.md §检查清单 | 第 5 行后插入第 6 行 | 标注 "🔴 阶段0 硬性阻塞" |
  | 00-pre-check/README.md §输出格式（标准） | 第 5 行后插入第 6 行 | 标准格式示例中包含 |
  | 00-pre-check/README.md §输出格式（扩展） | 第 5 行后插入第 6 行 + 原 6/7→7/8 | 编号调整 |
  | QUICK-REFERENCE.md §预检查 | 第 5 行后插入第 6 行 | 与 README.md 格式一致 |
  | memory-and-rules.md §阶段 0 | 输出行更新为第 6 行格式 | 与 README.md 格式一致 |
  | copilot-instructions.md | 预检查描述追加硬性阻塞说明 | 包含 "第 6 行" 关键词 |
  | task-memory.md §阶段 0 | 自检清单首项 + 步骤 10 + 硬性阻塞说明 | 首项为第 6 行检查 |

示例:
  检测: QUICK-REFERENCE.md §预检查模板只有 5 行（无第 6 行）
  修复:
    在第 5 行 "上次记忆: ..." 之后插入:
    "6. 📝 记忆已创建: [.ai-memory/clients/<agent>/tasks/YYYYMMDD.md §会话NN (🔄)] ← 🔴 阶段0 硬性阻塞"
  验证:
    - 00-pre-check/README.md 第 6 行 ✅
    - QUICK-REFERENCE.md 第 6 行 ✅（已修复）
    - memory-and-rules.md 第 6 行 ✅
    - copilot-instructions.md 描述 ✅
    - task-memory.md 自检清单首项 ✅

根因背景:
  此模式源于 2 次阶段 0 时序违规事故（§会话05 + vscode-copilot §会话01）。
  AI 在预检查 5 项输出后认为"预检查完成了"，直接切换到任务执行模式，
  跳过记忆写入。根本原因是预检查完成与记忆写入之间缺少显式阻塞操作（soft gate）。
  修复方案为将记忆写入嵌入预检查输出的第 6 行（hard gate 升级），
  使不写第 6 行 = 预检查本身不完整，从而消除跳过记忆写入的可能性。
  本修复模式确保:
  1) 当第 6 行在某处被意外删除或遗漏时，有标准化的修复流程
  2) 修复后全量验证 4 处文件一致性
  3) 自检清单的首项固定为第 6 行输出检查

关联:
  - detection/conflict-detection.md §规则 5（预检查第 6 行存在性检测）
  - triggers/auto-triggers.md §场景 9（预检查缺少记忆写入确认行检测）
  - 模式 9（时序违规修复 — 互补关系：模式 9 修复时序规则定义，模式 11 修复硬性阻塞机制）
  - workflows/common/task-memory.md §阶段 0 硬性阻塞机制
  - workflows/00-pre-check/README.md §输出格式 第 6 行
```

---

## 📊 修复统计模板

```yaml
修复报告:
  日期: YYYY-MM-DD
  触发方式: [用户反馈/自动检测/定期检查]

  修复统计:
    - 模式 1 (补充章节): X 次
    - 模式 2 (死链接): X 次
    - 模式 5 (版本更新): X 次（v2.0: 主动全量 Y 次）
    - 模式 9 (时序修复): X 次（🆕 v2.0）
    - 模式 10 (断层修复): X 次（🆕 v2.0）
    - ...

  详细记录:
    - 文件: xxx.md
      问题: 缺少检查清单
      模式: 模式 1
      状态: ✅ 已修复

    - 文件: decision-tree.yaml
      问题: 版本号 v2.10.0（应为 v2.11.0）
      模式: 模式 5（v2.0 — 主动全量检查发现）
      状态: ✅ 已修复

    - 文件: 00-pre-check/README.md
      问题: 缺少阶段 0 时序强制规则
      模式: 模式 9
      状态: ✅ 已修复（从 task-memory.md 同步）

    - 文件: detection/conflict-detection.md
      问题: 未嵌入 8 文件版本号清单
      模式: 模式 10（知识库断层）
      状态: ✅ 已修复（v1.0 → v2.0）
```

---

## 📋 变更日志

```yaml
v2.1 (2026-02-28):
  新增:
    - 模式 11: 预检查-记忆原子操作修复
      - 确保预检查第 6 行（📝 记忆已创建 — 阶段 0 硬性阻塞）在 4 处文件中一致存在
      - 修复内容映射表（缺失位置 → 修复动作 → 关键检查）
      - 修复后全量验证 4 处文件一致性 + 自检清单首项检查
  根因:
    - 阶段 0 时序违规已发生 2 次（§会话05 + vscode-copilot §会话01），
      根因是预检查完成与记忆写入之间缺少硬性阻塞（soft gate）
    - 修复方案为将记忆写入嵌入预检查第 6 行（hard gate 升级）
    - 需要修复模式确保第 6 行在后续修改中不被意外删除或遗漏
  关联:
    - detection/conflict-detection.md §规则 5（v2.1 — 预检查第 6 行存在性检测）
    - triggers/auto-triggers.md §场景 9（v2.2 — 预检查缺少记忆写入确认行检测）

v2.0 (2026-02-27):
  升级:
    - 模式 5: 版本号批量更新
      - 从"扫描发现→修复"升级为"对照 8 文件清单→逐个 read_file→主动全量检查→修复→验证"
      - 嵌入完整的 8 文件版本号清单（与 QUICK-REFERENCE.md 同源）
      - 新增修复后再次全量验证步骤
      - 新增 v1.0 vs v2.0 对比示例
  新增:
    - 模式 9: 时序违规修复
      - 标准化的阶段 0 时序规则修复流程
      - 权威来源: task-memory.md，同步副本: 00-pre-check/README.md
      - 自检清单首项固定为时序检查
      - 包含完整的时序规则内容模板
    - 模式 10: 知识库断层修复
      - 6 项断层检测清单（执行流程 + 检测 + 触发 + 修复 + 记录 + 记忆）
      - 修复内容映射表（修复类型 → 需更新的知识库文件 → 更新内容）
      - 防止未来断层的机制（修复回写完整性验证）
      - 实际案例（§会话05/06 的版本号+时序+断层修复全过程）
  根因:
    - 版本号遗漏反复发生 3 次（BUG-023~031）→ 模式 5 缺少明确文件清单和主动全量检查
    - 阶段 0 时序违规（§会话05）→ 缺少标准化的时序修复流程（模式 9）
    - 知识库断层（§会话06）→ 修复只写入执行流程但未回写知识库（模式 10）
  关联修复记录:
    - spec-self-fix/records/2026-02-27-version-sync-gap-and-stage0-timing.md
    - spec-self-fix/records/2026-02-27-selffix-knowledge-base-writeback.md

v1.0 (2026-02-12):
  初始版本: 模式 1~8（补充章节、死链接、覆盖标记、内容合并、版本更新、依赖链、术语统一、格式标准化）
```

---

## 🔗 相关文档

- [auto-repair.md](./auto-repair.md) - 自动修复实现
- [repair-validation.md](./repair-validation.md) - 修复验证
- [../detection/conflict-detection.md](../detection/conflict-detection.md) §规则 1 - 版本号 8 文件清单检测
- [../detection/conflict-detection.md](../detection/conflict-detection.md) §规则 5 - 流程时序合规 + 预检查第 6 行存在性检测
- [../detection/obsolete-detection.md](../detection/obsolete-detection.md) §规则 5 - 流程时序过时检测
- [../triggers/auto-triggers.md](../triggers/auto-triggers.md) §场景 5/6/7 - 自动触发场景
- [../triggers/auto-triggers.md](../triggers/auto-triggers.md) §场景 9 - 预检查第 6 行存在性触发（🆕 v2.1）
- [../triggers/user-intent-detection.md](../triggers/user-intent-detection.md) §模式 5 - 反复问题升级触发
- [QUICK-REFERENCE.md](../../QUICK-REFERENCE.md) §版本号文件清单 - 权威清单来源
- [CONSTRAINTS.md](../../CONSTRAINTS.md) 约束 #14 - 交叉验证要求

---

**版本**: v2.1
**最后更新**: 2026-02-28
**v2.1 核心改进**: 新增模式 11（预检查-记忆原子操作修复 — 确保第 6 行在 4 处文件一致存在）
**v2.0 核心改进**: 模式 5 升级（主动全量 8 文件）；新增模式 9（时序违规修复）；新增模式 10（知识库断层修复）