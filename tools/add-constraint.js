/**
 * add-constraint.js
 * 约束新增自动化工具 — MVP
 *
 * 使用方法:
 *   node tools/add-constraint.js --interactive              # 交互式向导
 *   node tools/add-constraint.js --interactive --dry-run    # 预览模式（不写入）
 *   node tools/add-constraint.js --id 21 --rule "规则名" --category "behavior" --violation "违反描述"
 *
 * 功能:
 *   1. 读取 META.yaml 获取当前约束条数
 *   2. 计算新约束编号 (N+1)
 *   3. 在 CONSTRAINTS.md 速查表追加行
 *   4. 在 CONSTRAINTS.md 正文末尾追加约束框架（### N+1. 规则名）
 *   5. 在 decision-tree.yaml constraints 中追加条目
 *   6. 更新 META.yaml constraint_count
 *   7. 调用 bump-version.js --apply 同步条数到 11 个文件
 *   8. 输出变更摘要报告
 *
 * 约束正文的详细说明需手动补充。
 *
 * 最后更新: 2026-02-27
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const { execSync } = require("child_process");

// ============================================
// 配置
// ============================================

const ROOT_DIR = path.resolve(__dirname, "..");
const META_PATH = path.join(ROOT_DIR, "META.yaml");
const CONSTRAINTS_PATH = path.join(ROOT_DIR, "CONSTRAINTS.md");
const DECISION_TREE_PATH = path.join(
  ROOT_DIR,
  "workflows",
  "decision-tree.yaml",
);
const BUMP_VERSION_PATH = path.join(__dirname, "bump-version.js");

const args = process.argv.slice(2);
const INTERACTIVE = args.includes("--interactive");
const DRY_RUN = args.includes("--dry-run");

// ============================================
// 颜色输出
// ============================================

const colors = {
  red: (t) => `\x1b[31m${t}\x1b[0m`,
  green: (t) => `\x1b[32m${t}\x1b[0m`,
  yellow: (t) => `\x1b[33m${t}\x1b[0m`,
  cyan: (t) => `\x1b[36m${t}\x1b[0m`,
  dim: (t) => `\x1b[2m${t}\x1b[0m`,
  bold: (t) => `\x1b[1m${t}\x1b[0m`,
  magenta: (t) => `\x1b[35m${t}\x1b[0m`,
};

// ============================================
// META.yaml 简易解析
// ============================================

function parseMetaYaml() {
  if (!fs.existsSync(META_PATH)) {
    console.error(colors.red("❌ META.yaml 不存在！"));
    process.exit(1);
  }
  const content = fs.readFileSync(META_PATH, "utf-8");
  const meta = {};
  const TARGET_KEYS = ["version", "constraint_count", "last_updated"];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-"))
      continue;
    if (line.startsWith(" ") || line.startsWith("\t")) continue;
    const match = trimmed.match(/^(\w+):\s*"([^"]+)"/);
    if (match && TARGET_KEYS.includes(match[1])) {
      meta[match[1]] = match[2];
      continue;
    }
    const matchUnquoted = trimmed.match(/^(\w+):\s*(\S+)\s*(?:#.*)?$/);
    if (matchUnquoted && TARGET_KEYS.includes(matchUnquoted[1])) {
      meta[matchUnquoted[1]] = matchUnquoted[2];
    }
  }
  return meta;
}

// ============================================
// 交互式输入
// ============================================

function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

// ============================================
// 分类映射
// ============================================

const CATEGORY_MAP = {
  core: {
    label: "核心约束",
    yamlSection: "core_constraints",
  },
  code: {
    label: "代码输出约束",
    yamlSection: "code_constraints",
  },
  behavior: {
    label: "报告/修复/行为约束",
    yamlSection: "behavior_constraints",
  },
};

const VALID_CATEGORIES = Object.keys(CATEGORY_MAP);

// ============================================
// 步骤 1: 在 CONSTRAINTS.md 速查表追加行
// ============================================

function appendToSummaryTable(content, id, rule, category, triggerDesc) {
  // 找到速查表的最后一行（| 20 | ... | 之后的位置）
  // 速查表格式: | N | **规则** | 分类 | 触发时机 |
  const lines = content.split("\n");
  let lastTableRowIndex = -1;

  // 找到 ## 📊 约束速查表 之后的表格
  let inSummaryTable = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("约束速查表")) {
      inSummaryTable = true;
      continue;
    }
    if (inSummaryTable) {
      // 跳过表头和分隔行
      if (lines[i].startsWith("|")) {
        // 检查是否是数据行（以 | 数字 开头）
        const match = lines[i].match(/^\|\s*(\d+)\s*\|/);
        if (match) {
          lastTableRowIndex = i;
        }
      }
      // 遇到空行或非表格行，结束搜索
      if (
        !lines[i].startsWith("|") &&
        lines[i].trim() !== "" &&
        lastTableRowIndex > 0
      ) {
        break;
      }
    }
  }

  if (lastTableRowIndex === -1) {
    return { success: false, error: "找不到约束速查表" };
  }

  // 分类标签映射
  const categoryLabels = {
    core: "操作",
    code: "代码",
    behavior: "行为",
  };

  const categoryLabel = categoryLabels[category] || "行为";
  const newRow = `| ${id} | **🔴 ${rule}** | ${categoryLabel} | ${triggerDesc} |`;

  lines.splice(lastTableRowIndex + 1, 0, newRow);

  return { success: true, content: lines.join("\n"), newRow };
}

// ============================================
// 步骤 2: 在 CONSTRAINTS.md 正文追加约束框架
// ============================================

function appendConstraintBody(content, id, rule, violation, version) {
  // 策略：找到最后一个 ### N. 约束标题，然后找到该约束段落结束的位置
  // 约束段落结束 = 遇到下一个 ## 标题 或 --- 分隔线
  const lines = content.split("\n");

  // 找到最后一个 ### N. 约束标题的行号
  let lastConstraintHeadingIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^### \d+\.\s/.test(lines[i])) {
      lastConstraintHeadingIndex = i;
    }
  }

  if (lastConstraintHeadingIndex === -1) {
    return { success: false, error: "找不到任何 ### N. 约束标题" };
  }

  // 从最后一个约束标题往下找，直到遇到 --- 或 ## 标题（不含 ###）
  let insertBeforeIndex = -1;
  for (let i = lastConstraintHeadingIndex + 1; i < lines.length; i++) {
    if (lines[i].trim() === "---" || /^## [^#]/.test(lines[i])) {
      insertBeforeIndex = i;
      break;
    }
  }

  if (insertBeforeIndex === -1) {
    // 没找到结束标记，插到文件末尾
    insertBeforeIndex = lines.length;
  }

  const newConstraintLines = [
    "",
    `### ${id}. ${rule}（🆕 v${version}）`,
    "",
    "<!-- TODO: 补充约束详细说明 -->",
    "",
    "```yaml",
    "🔴 强制规则（NO EXCEPTIONS）:",
    "",
    "  触发条件: [待补充]",
    "",
    "  检查项:",
    "    - [待补充]",
    "",
    "  ❌ 绝对禁止:",
    `    - ${violation}`,
    "",
    "详见: [待补充相关文档链接]",
    "```",
    "",
  ];

  lines.splice(insertBeforeIndex, 0, ...newConstraintLines);

  return { success: true, content: lines.join("\n") };
}

// ============================================
// 步骤 3: 在 decision-tree.yaml 追加条目
// ============================================

function appendToDecisionTree(content, id, rule, violation, category) {
  const yamlSection =
    CATEGORY_MAP[category]?.yamlSection || "behavior_constraints";

  // 找到 additional_forbidden 之前的位置（即最后一个约束条目后）
  // 或者找到对应 section 的最后一个条目
  const additionalMarker = "additional_forbidden:";
  const additionalIndex = content.indexOf(additionalMarker);

  if (additionalIndex === -1) {
    return { success: false, error: "找不到 additional_forbidden 标记" };
  }

  // 在 additional_forbidden 前插入新条目
  const indent = "    ";
  const newEntry = `${indent}- id: ${id}\n${indent}  rule: "${rule}"\n${indent}  violation: "${violation}"\n\n`;

  // 找到 additional_forbidden 前面的空行位置
  const beforeAdditional = content.substring(0, additionalIndex);
  const lastNewlineIndex = beforeAdditional.lastIndexOf("\n");

  // 确保前面有一个注释行（# 附加禁止项）
  const commentMarker = "# 附加禁止项";
  const commentIndex = content.indexOf(commentMarker);

  let insertIndex;
  if (commentIndex !== -1 && commentIndex < additionalIndex) {
    // 在注释行之前插入
    const beforeComment = content.substring(0, commentIndex);
    const lastNl = beforeComment.lastIndexOf("\n");
    insertIndex = lastNl + 1;
  } else {
    insertIndex = lastNewlineIndex + 1;
  }

  const newContent =
    content.substring(0, insertIndex) +
    newEntry +
    content.substring(insertIndex);

  return { success: true, content: newContent };
}

// ============================================
// 步骤 4: 更新 META.yaml constraint_count
// ============================================

function updateMetaConstraintCount(content, newCount) {
  // 匹配顶层的 constraint_count（不缩进的行）
  const regex = /^(constraint_count:\s*)\d+/m;
  const match = content.match(regex);

  if (!match) {
    return { success: false, error: "找不到 constraint_count 字段" };
  }

  const newContent = content.replace(regex, `$1${newCount}`);
  return { success: true, content: newContent };
}

// ============================================
// 步骤 5: 更新 CONSTRAINTS.md 中的约束条数标题
// ============================================

function updateConstraintsTitleCount(content, oldCount, newCount) {
  // 更新 § 标题中的条数
  const titleRegex = new RegExp(`核心约束（${oldCount} 条）`, "g");
  let newContent = content.replace(titleRegex, `核心约束（${newCount} 条）`);

  return { success: true, content: newContent };
}

// ============================================
// 步骤 6: 更新 decision-tree.yaml 注释中的约束条数
// ============================================

function updateDecisionTreeComment(content, oldCount, newCount) {
  const regex = new RegExp(
    `编号对齐 CONSTRAINTS\\.md 的 ${oldCount} 条约束`,
    "g",
  );
  const newContent = content.replace(
    regex,
    `编号对齐 CONSTRAINTS.md 的 ${newCount} 条约束`,
  );
  return { success: true, content: newContent };
}

// ============================================
// 主函数
// ============================================

async function main() {
  console.log("═".repeat(60));
  console.log("🔧 add-constraint.js — 约束新增自动化工具");
  console.log("═".repeat(60));
  console.log(
    `   模式: ${INTERACTIVE ? "🟢 交互式" : "🔵 命令行"} ${DRY_RUN ? colors.yellow("(预览模式)") : ""}`,
  );
  console.log();

  // 读取当前状态
  const meta = parseMetaYaml();
  const currentCount = parseInt(meta.constraint_count, 10);
  const version = meta.version;
  const newId = currentCount + 1;

  console.log(`   📌 当前约束条数: ${currentCount}`);
  console.log(`   📌 新约束编号: #${newId}`);
  console.log(`   📌 当前版本: v${version}`);
  console.log();

  // 获取约束信息
  let rule, category, violation, triggerDesc, versionTag;

  if (INTERACTIVE) {
    const rl = createPrompt();

    console.log(colors.cyan("请输入新约束信息:\n"));

    rule = await ask(rl, `  规则名称: `);
    if (!rule) {
      console.error(colors.red("\n❌ 规则名称不能为空"));
      rl.close();
      process.exit(1);
    }

    console.log(
      colors.dim(
        `\n  可选分类: ${VALID_CATEGORIES.map((c) => `${c}(${CATEGORY_MAP[c].label})`).join(", ")}`,
      ),
    );
    category = await ask(rl, `  分类 [${VALID_CATEGORIES.join("/")}]: `);
    if (!VALID_CATEGORIES.includes(category)) {
      console.log(
        colors.yellow(`  ⚠️ 未知分类 "${category}"，默认使用 behavior`),
      );
      category = "behavior";
    }

    violation = await ask(rl, `  违反描述: `);
    if (!violation) {
      console.error(colors.red("\n❌ 违反描述不能为空"));
      rl.close();
      process.exit(1);
    }

    triggerDesc = await ask(rl, `  触发时机（速查表用，简短）: `);
    if (!triggerDesc) {
      triggerDesc = "[待补充]";
    }

    versionTag = await ask(rl, `  版本标记 [默认 ${version}]: `);
    if (!versionTag) {
      versionTag = version;
    }

    rl.close();
    console.log();
  } else {
    // 命令行参数模式
    const getArg = (name) => {
      const idx = args.indexOf(`--${name}`);
      return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
    };

    rule = getArg("rule");
    category = getArg("category") || "behavior";
    violation = getArg("violation");
    triggerDesc = getArg("trigger") || "[待补充]";
    versionTag = getArg("version") || version;

    if (!rule || !violation) {
      console.error(
        colors.red("❌ 命令行模式需要 --rule 和 --violation 参数\n"),
      );
      console.log("用法:");
      console.log(
        '  node tools/add-constraint.js --id 21 --rule "规则名" --category "behavior" --violation "违反描述"',
      );
      console.log("  node tools/add-constraint.js --interactive");
      process.exit(1);
    }

    if (!VALID_CATEGORIES.includes(category)) {
      console.log(
        colors.yellow(`⚠️ 未知分类 "${category}"，默认使用 behavior`),
      );
      category = "behavior";
    }
  }

  // ============================================
  // 执行变更
  // ============================================

  console.log("─".repeat(60));
  console.log(colors.cyan("📋 变更计划:\n"));
  console.log(`   #${newId}: ${colors.bold(rule)}`);
  console.log(`   分类: ${CATEGORY_MAP[category].label}`);
  console.log(`   违反: ${violation}`);
  console.log(`   触发: ${triggerDesc}`);
  console.log(`   版本: v${versionTag}`);
  console.log();
  console.log(colors.cyan("📂 将修改以下文件:\n"));
  console.log("   1. CONSTRAINTS.md — 速查表追加行 + 正文框架 + 条数标题");
  console.log("   2. decision-tree.yaml — constraints 追加条目 + 注释条数");
  console.log(`   3. META.yaml — constraint_count: ${currentCount} → ${newId}`);
  console.log("   4. （+ bump-version.js 同步的 11 个文件的约束条数）");
  console.log();

  if (INTERACTIVE && !DRY_RUN) {
    const rl2 = createPrompt();
    const confirm = await ask(rl2, colors.yellow("确认执行？(Y/n) "));
    rl2.close();

    if (
      confirm &&
      confirm.toLowerCase() !== "y" &&
      confirm.toLowerCase() !== "yes" &&
      confirm !== ""
    ) {
      console.log("\n已取消。");
      process.exit(0);
    }
    console.log();
  }

  // 读取文件
  const constraintsContent = fs.readFileSync(CONSTRAINTS_PATH, "utf-8");
  const decisionTreeContent = fs.readFileSync(DECISION_TREE_PATH, "utf-8");
  const metaContent = fs.readFileSync(META_PATH, "utf-8");

  const changes = [];
  let constraintsResult = constraintsContent;
  let decisionTreeResult = decisionTreeContent;
  let metaResult = metaContent;

  // Step 1: 速查表追加行
  console.log("─".repeat(60));
  console.log(colors.cyan("🔧 执行变更\n"));

  const tableResult = appendToSummaryTable(
    constraintsResult,
    newId,
    rule,
    category,
    triggerDesc,
  );
  if (!tableResult.success) {
    console.error(colors.red(`❌ 速查表追加失败: ${tableResult.error}`));
    process.exit(1);
  }
  constraintsResult = tableResult.content;
  console.log(
    `   ✅ CONSTRAINTS.md 速查表 — 追加行: ${colors.dim(tableResult.newRow)}`,
  );
  changes.push("CONSTRAINTS.md §速查表");

  // Step 2: 正文追加框架
  const bodyResult = appendConstraintBody(
    constraintsResult,
    newId,
    rule,
    violation,
    versionTag,
  );
  if (!bodyResult.success) {
    console.error(colors.red(`❌ 正文追加失败: ${bodyResult.error}`));
    process.exit(1);
  }
  constraintsResult = bodyResult.content;
  console.log(`   ✅ CONSTRAINTS.md 正文 — 追加 §${newId}. ${rule} 框架`);
  changes.push(`CONSTRAINTS.md §${newId}`);

  // Step 3: 更新 CONSTRAINTS.md 条数标题
  const titleResult = updateConstraintsTitleCount(
    constraintsResult,
    currentCount,
    newId,
  );
  if (titleResult.success) {
    constraintsResult = titleResult.content;
    console.log(`   ✅ CONSTRAINTS.md 标题 — 条数 ${currentCount} → ${newId}`);
    changes.push("CONSTRAINTS.md §标题条数");
  }

  // Step 4: decision-tree.yaml 追加条目
  const dtResult = appendToDecisionTree(
    decisionTreeResult,
    newId,
    rule,
    violation,
    category,
  );
  if (!dtResult.success) {
    console.error(
      colors.red(`❌ decision-tree.yaml 追加失败: ${dtResult.error}`),
    );
    process.exit(1);
  }
  decisionTreeResult = dtResult.content;
  console.log(`   ✅ decision-tree.yaml — 追加 constraints[${newId}]`);
  changes.push("decision-tree.yaml constraints");

  // Step 5: 更新 decision-tree.yaml 注释条数
  const dtCommentResult = updateDecisionTreeComment(
    decisionTreeResult,
    currentCount,
    newId,
  );
  if (dtCommentResult.success) {
    decisionTreeResult = dtCommentResult.content;
    console.log(
      `   ✅ decision-tree.yaml — 注释条数 ${currentCount} → ${newId}`,
    );
    changes.push("decision-tree.yaml 注释");
  }

  // Step 6: META.yaml constraint_count
  const metaUpdateResult = updateMetaConstraintCount(metaResult, newId);
  if (!metaUpdateResult.success) {
    console.error(
      colors.red(`❌ META.yaml 更新失败: ${metaUpdateResult.error}`),
    );
    process.exit(1);
  }
  metaResult = metaUpdateResult.content;
  console.log(`   ✅ META.yaml — constraint_count: ${currentCount} → ${newId}`);
  changes.push("META.yaml");

  // 写入文件
  if (DRY_RUN) {
    console.log(colors.yellow("\n   ⏭️  预览模式 — 不写入文件"));
  } else {
    fs.writeFileSync(CONSTRAINTS_PATH, constraintsResult, "utf-8");
    fs.writeFileSync(DECISION_TREE_PATH, decisionTreeResult, "utf-8");
    fs.writeFileSync(META_PATH, metaResult, "utf-8");
    console.log(colors.green("\n   💾 3 个文件已写入"));
  }

  // Step 7: 调用 bump-version.js 同步其余文件
  console.log();
  console.log("─".repeat(60));
  console.log(
    colors.cyan("📦 调用 bump-version.js 同步约束条数到 11 个文件\n"),
  );

  if (DRY_RUN) {
    console.log(colors.yellow("   ⏭️  预览模式 — 跳过 bump-version.js"));
    console.log(
      colors.dim(
        `   实际执行时将运行: node ${path.relative(ROOT_DIR, BUMP_VERSION_PATH)} --apply`,
      ),
    );
  } else {
    try {
      const output = execSync(`node "${BUMP_VERSION_PATH}" --apply`, {
        cwd: ROOT_DIR,
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
      });

      // 提取关键结果行
      const resultLines = output
        .split("\n")
        .filter(
          (l) =>
            l.includes("✅") ||
            l.includes("⚠️") ||
            l.includes("需更新") ||
            l.includes("同步摘要"),
        );
      for (const line of resultLines) {
        console.log(`   ${line.trim()}`);
      }
      changes.push("bump-version.js 同步的 11 个文件");
    } catch (err) {
      console.error(
        colors.red(`   ❌ bump-version.js 执行失败: ${err.message}`),
      );
      console.log(
        colors.yellow("   ⚠️ 请手动运行: node tools/bump-version.js --apply"),
      );
    }
  }

  // ============================================
  // 变更摘要
  // ============================================

  console.log();
  console.log("═".repeat(60));
  console.log(colors.cyan("📊 变更摘要"));
  console.log("═".repeat(60));
  console.log();
  console.log(`   新约束: #${newId} ${colors.bold(rule)}`);
  console.log(`   分类:   ${CATEGORY_MAP[category].label}`);
  console.log(`   违反:   ${violation}`);
  console.log(`   条数:   ${currentCount} → ${newId}`);
  console.log(`   变更:   ${changes.length} 处`);
  for (const c of changes) {
    console.log(`           ✅ ${c}`);
  }
  console.log();

  if (DRY_RUN) {
    console.log(
      colors.yellow(
        "   ⚠️ 预览模式 — 以上变更未实际写入。去掉 --dry-run 执行写入。",
      ),
    );
  } else {
    console.log(colors.green("   ✅ 约束新增完成！"));
    console.log();
    console.log(colors.yellow("   📝 后续手动步骤:"));
    console.log(
      `      1. 编辑 CONSTRAINTS.md §${newId} — 补充详细说明（替换 TODO 占位符）`,
    );
    console.log("      2. 更新 CHANGELOG.md — 添加约束新增变更条目");
    console.log("      3. 创建/更新 changelogs/v<版本>.md");
    console.log("      4. 运行 node tools/validate-links.js 验证链接");
  }

  console.log();
  console.log("═".repeat(60));
}

main().catch((err) => {
  console.error(colors.red(`\n❌ 未预期的错误: ${err.message}`));
  process.exit(1);
});
