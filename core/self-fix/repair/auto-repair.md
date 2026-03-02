# 自动修复实现

> 规范问题的自动修复、半自动修复和辅助修复

**最后更新**: 2026-03-02

---

## 🎯 修复策略分类

### ✅ 可自动修复（安全）

无需用户确认，AI 直接执行：

```yaml
适用场景:
  1. 补充缺失的章节标题
  2. 删除死链接
  3. 更新"最后更新"时间
  4. 添加"可覆盖"标记
  5. 格式化问题（缩进、空行）
  6. 🆕 v2.0 版本号全量同步（对照 8 文件清单逐个检查并更新）
  7. 🆕 v2.0 阶段 0 时序规则同步（从 task-memory.md 同步到 00-pre-check/README.md）

安全边界:
  - 不删除实质内容
  - 不改变语义
  - 可轻易撤销

示例 1（v1.0）:
  检测: core/workflows/04-research/README.md 缺少验证清单
  修复: 在文件末尾添加 "## ✅ 技术调研专属验证"
  执行: 自动应用
  记录: records/2026-02-12-auto-add-validation.md

示例 2（🆕 v2.0 — 版本号全量同步）:
  检测: decision-tree.yaml 版本号为 v2.10.0，其余 7 个文件为 v2.11.0
  修复: 更新 decision-tree.yaml 的 4 处版本号为 v2.11.0
  执行: 自动应用（对照清单逐个 read_file 验证后修复）
  记录: records/2026-02-27-auto-version-sync.md

示例 3（🆕 v2.0 — 时序规则同步）:
  检测: 00-pre-check/README.md 缺少阶段 0 时序强制规则
  修复: 从 task-memory/triggers.md §阶段 0 复制时序强制规则到 00-pre-check
  执行: 自动应用（task-memory/triggers.md 为权威来源）
  记录: records/2026-02-27-auto-timing-sync.md
```

---

### ⚠️ 半自动修复（需确认）

生成修复方案，用户确认后执行：

```yaml
适用场景:
  1. 删除冗余内容
  2. 合并文件
  3. 添加例外说明
  4. 🆕 v2.0 知识库断层修复（spec-self-fix 子模块需要全链路回写）

需要确认原因:
  - 可能删除有用信息
  - 可能影响其他文件
  - 需要业务判断
  - 🆕 v2.0 涉及多个文件联动修改（知识库断层修复时 6+ 个文件需要同步更新）

示例 1（v1.0）:
  检测: CONSTRAINTS.md 与 confirmation-points.md 内容重复
  方案:
    [A] 删除 CONSTRAINTS.md 中的重复内容
    [B] 保持现状，添加互引用
  询问: "推荐方案 A，是否执行？[Y/N]"
  用户: "Y"
  执行: 应用修复

示例 2（🆕 v2.0 — 知识库断层修复）:
  检测: 上次修复只写入了执行流程入口文件（QUICK-REFERENCE/CONSTRAINTS/task-memory），
        但 spec-self-fix 知识库的 6 个子模块仍为 v1.0，未同步更新
  方案:
    全链路回写 — 更新以下 6 个文件:
    1. detection/conflict-detection.md（嵌入 8 文件清单 + 时序检测规则）
    2. detection/obsolete-detection.md（时序过时检测 + 清单同步检测）
    3. triggers/auto-triggers.md（版本号全量同步 + 时序合规 + 反复问题升级触发）
    4. triggers/user-intent-detection.md（反复问题升级触发模式）
    5. repair/repair-patterns.md（模式 5 升级 + 模式 9/10 新增）
    6. repair/auto-repair.md（版本号全量同步 + 时序修复列为自动修复场景）
  询问: "检测到知识库断层，需要更新 6 个文件。是否确认执行？[Y/N]"
  用户: "Y"
  执行: 按计划逐个修改，修改后执行回写完整性验证
```

---

### 🔴 辅助修复（手动）

生成修复指南，用户手动执行：

```yaml
适用场景:
  1. 解决规范冲突（需理解业务）
  2. 重写过时内容（需专业知识）
  3. 重大结构调整

必须手动原因:
  - 需要深度理解
  - 风险高
  - 涉及多个文件联动

示例:
  检测: code-standards.md 要求驼峰，项目规范要求下划线
  分析: 这是业务决策，AI 无法判断
  输出: "建议手动统一命名规范，参考以下方案..."
```

---

## 🔧 v2.0 新增自动修复场景

### 场景 A: 版本号全量同步（🆕 v2.0）

```yaml
触发条件:
  - detection/conflict-detection.md §规则 1 检测到 8 个版本号文件中存在不一致
  - triggers/auto-triggers.md §场景 5 在版本变更操作后自动触发

安全等级: ✅ 安全（版本号是纯元数据，不影响业务逻辑）

🔴 版本号文件清单（8 个 — 与 CROSS-VALIDATION.md §版本号文件清单 同源）:

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

  ⚠️ 此清单与 CROSS-VALIDATION.md §版本号文件清单 同源，新增文件时两处必须同步更新。
  ⚠️ 子文件不再维护独立版本号（2026-03-02 起取消），仅保留最后更新日期。

自动修复步骤:
  1. 确定目标版本号（从 copilot-instructions.md 或多数文件版本号取最新值）
  2. 🔴 逐个 read_file 8 个文件（禁止推断"应该没问题"）
  3. 提取每个文件的当前版本号
  4. 标记所有与目标版本不一致的文件
  5. 逐个更新不一致的文件:
     a. 更新版本号
     b. 更新"最后更新"日期（使用 now() 获取真实日期）
  6. 🔴 修复后再次逐个 read_file 验证 8 个文件版本号全部一致
  7. 输出验证结果

v1.0 vs v2.0 对比:
  v1.0（已废弃）:
    ❌ "扫描所有 .md 文件" → 无明确清单，易遗漏
    ❌ 被动检查 → 只检查"改了的文件"
    ❌ 已导致 3 次同类 Bug（BUG-023~031）
  v2.0（当前）:
    ✅ 对照 8 文件清单逐个 read_file → 主动全量
    ✅ 8 个文件全部一致才算完成
    ✅ 修复后再次全量验证

关联:
  - detection/conflict-detection.md §规则 1（检测逻辑）
  - triggers/auto-triggers.md §场景 5（触发时机）
  - repair/repair-patterns.md §模式 5（修复模式详情）
  - CROSS-VALIDATION.md §版本号文件清单（权威清单来源）
```

---

### 场景 B: 阶段 0 时序规则同步（🆕 v2.0）

```yaml
触发条件:
  - detection/conflict-detection.md §规则 5 检测到时序规则定义不一致
  - detection/obsolete-detection.md §规则 5 检测到时序规则过时
  - triggers/auto-triggers.md §场景 6 在修改 task-memory 或 00-pre-check 后触发

安全等级: ✅ 安全（时序规则是流程定义，以 task-memory.md 为权威来源同步到 00-pre-check）

时序规则内容（必须在两处都存在）:
  🔴 时序强制规则（NO EXCEPTIONS）:
    阶段 0 的全部步骤（预检查 + 记忆写入）必须在 AI 开始分析用户问题之前完成。
    禁止"先分析问题、再补写记忆"— 这会导致记忆写入被遗忘或延迟。
    正确顺序: 预检查 → 写入记忆(§会话NN) → 输出"📝 记忆已更新" → 然后才开始分析用户问题
    错误顺序: 预检查 → 分析问题 → 输出结论 → 最后才补写记忆 ❌（已发生事故：§会话05）

自检清单首项（必须存在于 task-memory.md 阶段 0 自检清单）:
  - [ ] 🔴 记忆写入是否在分析用户问题之前完成？（不是分析完才补写）

自动修复步骤:
  1. 读取 task-memory/triggers.md §阶段 0 的完整时序规则（权威来源）
  2. 读取 00-pre-check/README.md §阶段 0 的时序规则
  3. 对比两处内容:
     a. 两处都有且一致 → 无需修复 ✅
     b. task-memory.md 有但 00-pre-check 缺失 → 从 task-memory.md 复制到 00-pre-check
     c. 两处内容不一致 → 以 task-memory.md 为准覆盖 00-pre-check
     d. 两处都缺失 → 🔴 严重问题，添加完整时序规则（参考上方内容模板）
  4. 检查 task-memory.md 阶段 0 自检清单:
     a. 首项是否为时序检查 → 如果不是，调整为首项
     b. 自检清单是否存在 → 如果不存在，添加完整自检清单
  5. 修复后验证:
     a. 两处时序规则内容一致 ✅
     b. 自检清单首项为时序检查 ✅
     c. 两处阶段 0 步骤顺序一致 ✅

根因背景:
  此场景源于 §会话05 的阶段 0 时序违规事故 —— AI 先分析问题再补写记忆，
  导致记忆写入延迟。修复后在两处都加入了 🔴 NO EXCEPTIONS 时序强制规则。
  本自动修复场景确保两处定义始终同步。

关联:
  - detection/conflict-detection.md §规则 5（流程时序合规性检测）
  - detection/obsolete-detection.md §规则 5（流程时序过时检测）
  - triggers/auto-triggers.md §场景 6（阶段 0 时序合规自动触发）
  - repair/repair-patterns.md §模式 9（时序违规修复模式）
  - core/workflows/common/task-memory/triggers.md §阶段 0 时序强制规则（权威来源）
  - core/workflows/00-pre-check/README.md §阶段 0 时序强制规则（同步副本）
```

---

### 场景 C: 版本号清单跨模块同步（🆕 v2.0）

```yaml
触发条件:
  - detection/obsolete-detection.md §规则 6 检测到版本号清单不同步
  - CROSS-VALIDATION.md §版本号文件清单 发生增减

安全等级: ✅ 安全（清单内容同步，不影响业务逻辑）

同步目标:
  当 CROSS-VALIDATION.md §版本号文件清单 的文件数量或内容发生变化时，
  自动同步更新以下引用处:
  1. core/self-fix/detection/conflict-detection.md §规则 1 的 8 文件清单
  2. core/self-fix/repair/repair-patterns.md §模式 5 的 8 文件清单
  3. core/self-fix/repair/auto-repair.md §场景 A 的 8 文件清单
  4. core/self-fix/triggers/auto-triggers.md §场景 5 的 8 文件清单
  5. CONSTRAINTS.md 约束 #14 的清单引用

  ⚠️ CROSS-VALIDATION.md 是权威来源，其他文件为同步副本

自动修复步骤:
  1. 读取 CROSS-VALIDATION.md §版本号文件清单 中的文件列表
  2. 读取上述 5 处引用的文件列表
  3. 对比是否一致
  4. 不一致时，以 CROSS-VALIDATION.md 为准同步更新

关联:
  - detection/obsolete-detection.md §规则 6（版本号清单同步检测）
  - CROSS-VALIDATION.md §版本号文件清单（权威来源）
```

---

## 🔧 修复模式库

### 模式 1: 补充缺失章节

```yaml
触发: 完整性检测发现缺少必要章节

步骤:
  1. 确定插入位置（通常在文件末尾）
  2. 生成章节模板
  3. 插入内容
  4. 验证 Markdown 格式

代码示例:
  检测: core/workflows/04-research/README.md 缺少 "## ✅ 专属验证"
  定位: 最后一个 "---" 之前
  插入:
    ## ✅ 技术调研专属验证

    完成调研后，执行以下验证：
    （验证清单内容）
  验证: 检查 Markdown 语法正确
```

---

### 模式 2: 修复死链接

```yaml
触发: 发现链接指向不存在的文件

步骤:
  1. 检查是否临时失效（最近删除）
  2. 搜索文件系统查找可能的新位置
  3. 如找到: 更新链接
  4. 如未找到: 删除链接，保留文本

代码示例:
  检测: [老文档](./old.md) 指向不存在文件
  搜索: 查找 "old" 相关文件
  找到: ./archive/old-archived.md
  修复: [老文档](./archive/old-archived.md)

  或

  未找到: "老文档（已废弃）"
```

---

### 模式 3: 添加可覆盖标记

```yaml
触发: core/standards/README.md 说可覆盖，但规范文件无标记

步骤:
  1. 在规范文件头部添加标记
  2. 插入位置: 第一个 ## 标题之前
  3. 格式: > **可被项目覆盖**: ...

代码示例:
  文件: core/standards/code-standards.md
  检测: 缺少可覆盖标记
  插入位置: 第一个 "##" 前
  插入内容:
    > **可被项目覆盖**: 此规范可被 projects/<project>/profile/03-代码风格.md 覆盖
```

---

## ✅ 修复验证

每次修复后执行 4 步验证：

```yaml
1. 文件完整性:
   - 修改的文件可正常打开
   - Markdown 格式正确
   - 无语法错误

2. 链接有效性:
   - 新增/修改的链接指向存在的文件
   - 锚点（#section）正确

3. 内容一致性:
   - 修复未引入新冲突
   - 相关文件已同步更新

4. 功能验证:
   - AI 仍能正确读取规范
   - 工作流仍可执行

🆕 v2.0 附加验证:

5. 版本号全量一致性（场景 A 修复后）:
   - 逐个 read_file 8 个文件，确认版本号全部一致
   - 禁止推断"应该没问题"

6. 时序规则同步一致性（场景 B 修复后）:
   - task-memory.md 和 00-pre-check 的时序规则内容一致
   - 自检清单首项为时序检查

7. 回写完整性验证（场景 C / 知识库断层修复后）:
   - 执行 6 项断层检测清单（详见 repair-patterns.md §模式 10）:
     □ 执行流程入口已写入？
     □ core/self-fix/detection/ 检测规则已更新？
     □ core/self-fix/triggers/ 触发场景已更新？
     □ core/self-fix/repair/ 修复模式已更新？
     □ core/self-fix/records/ 修复记录已更新？
     □ .ai-memory 记忆已更新？
   - 全部 ✅ → 修复完整，复现风险消除
```

---

## 📝 修复记录

所有修复记录到 `../records/YYYYMMDD-xxx.md`：

```markdown
# 规范修复记录

**日期**: 2026-02-12 16:00
**触发方式**: 自动触发（预检查阶段）
**修复类型**: ✅ 自动修复

## 问题描述
core/workflows/04-research/README.md 缺少专属验证清单

## 修复方案
在文件末尾添加验证清单章节

## 修复步骤
1. 读取文件
2. 定位插入位置（最后一个 --- 之前）
3. 插入验证清单模板
4. 保存文件

## 验证结果
✅ 文件可正常打开
✅ Markdown 格式正确
✅ 内容完整

## 代码变更
+ ## ✅ 技术调研专属验证
+
+ 完成调研后，执行以下验证：
+ ...
```

### v2.0 自动修复记录格式（版本号全量同步）

```markdown
# 版本号全量同步修复记录

**日期**: 2026-02-27 16:27
**触发方式**: 自动触发（版本号变更后 — §场景 A）
**修复类型**: ✅ 自动修复
**修复模式**: 模式 5（版本号批量更新 v2.0 — 主动全量）

## 问题描述
8 文件版本号全量检查发现 2 个文件版本号不一致

## 检查结果
| # | 文件 | 当前版本 | 目标版本 | 状态 |
|:-:|------|---------|---------|:----:|
| 1 | copilot-instructions.md | v2.11.0 | v2.11.0 | ✅ |
| 2 | README.md | v2.11.0 | v2.11.0 | ✅ |
| 3 | QUICK-REFERENCE.md | v2.11.0 | v2.11.0 | ✅ |
| 4 | CONSTRAINTS.md | v2.11.0 | v2.11.0 | ✅ |
| 5 | STATUS.md | v2.11.0 | v2.11.0 | ✅ |
| 6 | CHANGELOG.md | v2.11.0 行 | v2.11.0 行 | ✅ |
| 7 | decision-tree.yaml | v2.10.0 | v2.11.0 | ❌→✅ |
| 8 | 00-pre-check/README.md | v2.10.0 | v2.11.0 | ❌→✅ |

## 修复后验证
✅ 8/8 文件版本号全部一致 (v2.11.0)
```

---

## 📊 修复统计

| 修复类型 | 数量 | 成功率 |
|---------|------|--------|
| 自动修复 | 3 | 100% |
| 半自动修复 | 2 | 100% |
| 辅助修复 | 0 | - |
| 🆕 v2.0 版本号全量同步 | 1 | 100% |
| 🆕 v2.0 时序规则同步 | 1 | 100% |
| 🆕 v2.0 知识库断层修复 | 1 | 100% |

详见 `../records/summary.md`

---

## 📋 v2.0 变更日志

```yaml
v2.0 (2026-02-27):
  新增:
    - 场景 A: 版本号全量同步自动修复
      - 嵌入 8 文件版本号清单（与 CROSS-VALIDATION.md 同源）
      - 主动全量检查 → 逐个 read_file → 修复 → 再次全量验证
      - v1.0 vs v2.0 对比说明
    - 场景 B: 阶段 0 时序规则同步自动修复
      - task-memory.md 为权威来源，00-pre-check 为同步副本
      - 包含完整时序规则内容模板和自检清单首项要求
    - 场景 C: 版本号清单跨模块同步自动修复
      - CROSS-VALIDATION.md 为权威来源，5 处引用处为同步副本
    - 修复验证新增 3 项（版本号一致性、时序规则一致性、回写完整性）
    - 半自动修复新增"知识库断层修复"场景
    - v2.0 自动修复记录格式模板
  升级:
    - 可自动修复场景从 5 个扩展到 7 个（新增场景 6/7）
    - 修复统计表新增 v2.0 类型
  根因:
    - 版本号遗漏反复发生 3 次（BUG-023~031）→ 需要明确的自动修复流程
    - 阶段 0 时序违规（§会话05）→ 需要标准化的同步修复流程
    - 知识库断层（§会话06）→ 修复只写入执行流程但未回写知识库
  关联修复记录:
    - core/self-fix/records/2026-02-27-version-sync-gap-and-stage0-timing.md
    - core/self-fix/records/2026-02-27-selffix-knowledge-base-writeback.md

v1.0 (2026-02-12):
  初始版本: 自动修复（5 场景）+ 半自动修复 + 辅助修复 + 4 步验证
```

---

## 🔗 相关文档

- `repair-patterns.md` - 修复模式库详细说明（含模式 5/9/10）
- `repair-validation.md` - 修复验证清单
- `../triggers/auto-triggers.md` §场景 5/6/7 - 自动触发规则
- `../triggers/user-intent-detection.md` §模式 5 - 反复问题升级触发
- `../detection/conflict-detection.md` §规则 1/5 - 版本号 + 时序检测
- `../detection/obsolete-detection.md` §规则 5/6 - 时序过时 + 清单同步检测
- `../records/` - 修复记录
- `CROSS-VALIDATION.md` §版本号文件清单 - 权威清单来源
- `CONSTRAINTS.md` 约束 #14 - 交叉验证要求

---

**最后更新**: 2026-03-02