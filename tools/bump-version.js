#!/usr/bin/env node
/**
 * bump-version.js — v3 版本号 & 约束条数 & 日期自动同步工具
 *
 * 适配 v3 单文件权威规范架构：
 *   - 真相源: version/v3/RULES.md 头部（version / last_updated / constraint_count from §4）
 *   - 动态扫描: version/v3/ 下全部 .md 文件（递归）
 *   - 外部文件: .github/copilot-instructions.md / README.md / CHANGELOG.md
 *
 * 同步范围:
 *   - 版本号:   version/v3/ 下全部 .md（头部+版本历史+模板版本）+ 外部入口文件
 *   - 约束条数: copilot-instructions.md / README.md
 *   - 日期:     version/v3/ 下全部 .md（头部 + 版本历史 + 模板版本）+ 外部入口文件
 *
 * 用法:
 *   node tools/bump-version.js                # 检查模式（只报告差异，不修改）
 *   node tools/bump-version.js --apply        # 应用模式（实际写入修改）
 *   node tools/bump-version.js --apply --version 3.1.0  # 指定新版本号
 *   node tools/bump-version.js --apply --date 2026-04-01  # 覆盖日期
 *   node tools/bump-version.js --apply --constraints 23   # 覆盖约束条数
 *
 * 选项:
 *   --apply          实际执行写入（默认为 dry-run 检查模式）
 *   --version <val>  指定新版本号（默认从 RULES.md 提取）
 *   --date <val>     覆盖日期（默认从 RULES.md 提取）
 *   --constraints <n> 覆盖约束条数（默认从 RULES.md §4 计数）
 *   --verbose        输出详细匹配信息
 *
 * 依赖: 无外部依赖，仅使用 Node.js 内置模块
 *
 * 版本: 1.0.0
 * 最后更新: 2026-03-10
 */

const fs = require("fs");
const path = require("path");

// ============================================
// 配置
// ============================================

// 项目根目录 = tools/ 的上级（ai-dev-guidelines/）
const ROOT_DIR = path.resolve(__dirname, "..");
// 工作区根目录 = ai-dev-guidelines/ 的上级（Workspace/）
const WORKSPACE_DIR = path.resolve(ROOT_DIR, "..");
const V3_DIR = path.join(ROOT_DIR, "version", "v3");
const RULES_PATH = path.join(V3_DIR, "RULES.md");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const VERBOSE = args.includes("--verbose");

function getArgValue(name) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : null;
}

const VERSION_OVERRIDE = getArgValue("--version");
const DATE_OVERRIDE = getArgValue("--date");
const CONSTRAINT_OVERRIDE = getArgValue("--constraints");

// ============================================
// RULES.md 解析（替代 v2 的 META.yaml）
// ============================================

/**
 * 从 RULES.md 头部提取版本号和最后更新日期
 * 格式:
 *   **版本**: v3.0.0
 *   **最后更新**: 2026-03-10
 */
function parseRulesHeader(content) {
  const result = { version: null, lastUpdated: null };

  const versionMatch = content.match(/\*\*版本\*\*:\s*v([\d.]+)/);
  if (versionMatch) {
    result.version = versionMatch[1];
  }

  const dateMatch = content.match(/\*\*最后更新\*\*:\s*(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) {
    result.lastUpdated = dateMatch[1];
  }

  return result;
}

/**
 * 从 RULES.md §4 计数约束条数
 * P0 表格行 + P1 表格行（排除表头和分隔行）
 */
function countConstraints(content) {
  // 找到 §4 核心约束 区域
  const sectionMatch = content.match(
    /## §4 核心约束（\d+ 条）([\s\S]*?)(?=\n## §5 )/,
  );
  if (!sectionMatch) return null;

  const section = sectionMatch[1];
  // 匹配表格数据行: | 数字 | ... |
  const rows = section.match(/^\|\s*\d+\s*\|/gm);
  return rows ? rows.length : null;
}

// ============================================
// 动态文件发现
// ============================================

/**
 * 递归扫描目录下所有 .md 文件
 */
function walkMdFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkMdFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      results.push(fullPath);
    }
  }
  return results;
}

// ============================================
// 同步规则
// ============================================

/**
 * 版本号同步规则
 *
 * v3 文件中的版本号出现模式:
 *   1. 头部:       **版本**: v3.0.0
 *   2. 版本历史:   > **版本历史**: v3.0.0 (2026-03-10) — ...
 *   3. 模板版本:   > **模板版本**: v3.0.0 (2026-03-10)
 *   4. 内联版本:   > **版本**: v3.0.0 · **模板来源**: ...
 *   5. §4 标题:    ## §4 核心约束（22 条）
 */
function getV3VersionPatterns(version) {
  return [
    {
      // 头部: **版本**: vX.Y.Z
      // 排除 diff 示例行（以 +/- 开头的行）
      regex: /^(?![+-])(.*)(\*\*版本\*\*:\s*v)([\d.]+)/gm,
      replacement: `$1$2${version}`,
      label: "头部版本号",
    },
    {
      // 版本历史: > **版本历史**: vX.Y.Z (YYYY-MM-DD)
      regex: /(> \*\*版本历史\*\*:\s*v)[\d.]+((?:\s*\())/g,
      replacement: `$1${version}$2`,
      label: "版本历史",
    },
    {
      // 模板版本: > **模板版本**: vX.Y.Z (YYYY-MM-DD)
      regex: /(> \*\*模板版本\*\*:\s*v)[\d.]+((?:\s*\())/g,
      replacement: `$1${version}$2`,
      label: "模板版本",
    },
  ];
}

/**
 * 日期同步规则
 *
 * v3 文件中的日期出现模式:
 *   1. 头部:       **最后更新**: 2026-03-10
 *   2. 版本历史:   > **版本历史**: v3.0.0 (2026-03-10)
 *   3. 模板版本:   > **模板版本**: v3.0.0 (2026-03-10)
 *   4. 内联版本:   copilot-instructions.md 中的 **最后更新**: 行
 */
function getV3DatePatterns(dateStr) {
  return [
    {
      // 头部: **最后更新**: YYYY-MM-DD
      // 排除 diff 示例行（以 +/- 开头的行）
      regex: /^(?![+-])(.*)(\*\*最后更新\*\*:\s*)(\d{4}-\d{2}-\d{2})/gm,
      replacement: `$1$2${dateStr}`,
      label: "头部日期",
    },
    {
      // 版本历史/模板版本中的日期: (YYYY-MM-DD)
      // 仅匹配紧跟在版本号后面括号中的日期
      regex: /(\*\*版本历史\*\*:\s*v[\d.]+\s*\()(\d{4}-\d{2}-\d{2})(\))/g,
      replacement: `$1${dateStr}$3`,
      label: "版本历史日期",
    },
    {
      regex: /(\*\*模板版本\*\*:\s*v[\d.]+\s*\()(\d{4}-\d{2}-\d{2})(\))/g,
      replacement: `$1${dateStr}$3`,
      label: "模板版本日期",
    },
    {
      // 内联版本: > **版本**: v3.0.0 · ... 后面没有日期，跳过
      // copilot-instructions 的 **最后更新** 已被第一条 regex 覆盖
    },
  ].filter((p) => p.regex); // 移除空条目
}

/**
 * 约束条数同步规则（仅外部文件需要）
 */
function getConstraintPatterns(count) {
  const countStr = String(count);
  return [
    {
      // RULES.md §4 标题: ## §4 核心约束（22 条）
      regex: /(## §4 核心约束（)\d+( 条）)/g,
      replacement: `$1${countStr}$2`,
      label: "§4 标题约束数",
    },
    {
      // copilot-instructions.md: 约束-22_条
      regex: /(约束-)\d+(_条)/g,
      replacement: `$1${countStr}$2`,
      label: "badge 约束数",
    },
    {
      // README.md badge: 约束-22_条-red
      regex: /(约束-)\d+(_条-red)/g,
      replacement: `$1${countStr}$2`,
      label: "README badge 约束数",
    },
    {
      // README.md 表格: 22 条护栏规则
      regex: /(\d+)( 条护栏规则)/g,
      replacement: `${countStr}$2`,
      label: "README 正文约束数",
    },
    {
      // README.md 项目状态表: 约束 | 22 条
      regex: /(约束\s*\|\s*)\d+( 条)/g,
      replacement: `$1${countStr}$2`,
      label: "README 状态表约束数",
    },
    {
      // copilot-instructions.md: 22 条约束
      regex: /(\d+)( 条约束)/g,
      replacement: `${countStr}$2`,
      label: "入口文件约束数",
    },
    {
      // 22 条，P0/P1 分级
      regex: /(\d+)( 条，P0\/P1 分级)/g,
      replacement: `${countStr}$2`,
      label: "约束分级数",
    },
    {
      // P0×13 / P1×9 — 需要动态确定，此处跳过（由 P0P1 专项处理）
    },
  ].filter((p) => p.regex);
}

/**
 * P0/P1 分项约束数同步规则
 */
function getP0P1Patterns(p0Count, p1Count) {
  return [
    {
      // §4 P0 标题: ### 🔴 P0（13 条）
      regex: /(### 🔴 P0（)\d+( 条）)/g,
      replacement: `$1${p0Count}$2`,
      label: "P0 标题条数",
    },
    {
      // §4 P1 标题: ### 🟡 P1（9 条）
      regex: /(### 🟡 P1（)\d+( 条）)/g,
      replacement: `$1${p1Count}$2`,
      label: "P1 标题条数",
    },
    {
      // README badge/正文: P0×13 / P1×9
      regex: /(P0×)\d+(\s*\/\s*P1×)\d+/g,
      replacement: `$1${p0Count}$2${p1Count}`,
      label: "P0×N / P1×N",
    },
    {
      // README badge: P0/P1 分级
      regex: /(P0\/P1 分级)/g,
      replacement: `$1`,
      label: "P0/P1 标签（不变）",
    },
  ];
}

/**
 * 从 RULES.md §4 内容中分别计数 P0 和 P1
 */
function countP0P1(content) {
  const result = { p0: 0, p1: 0 };

  // 提取 P0 区域
  const p0Match = content.match(/### 🔴 P0（\d+ 条）([\s\S]*?)(?=### 🟡 P1)/);
  if (p0Match) {
    const p0Rows = p0Match[1].match(/^\|\s*\d+\s*\|/gm);
    result.p0 = p0Rows ? p0Rows.length : 0;
  }

  // 提取 P1 区域
  const p1Match = content.match(
    /### 🟡 P1（\d+ 条）([\s\S]*?)(?=\n---|\n## §5)/,
  );
  if (p1Match) {
    const p1Rows = p1Match[1].match(/^\|\s*\d+\s*\|/gm);
    result.p1 = p1Rows ? p1Rows.length : 0;
  }

  return result;
}

// ============================================
// 外部文件规则
// ============================================

function getExternalFiles() {
  return [
    {
      // .github/ 在工作区根目录（ai-dev-guidelines/ 的上级）
      path: path.join(WORKSPACE_DIR, ".github", "copilot-instructions.md"),
      label: ".github/copilot-instructions.md",
    },
    {
      path: path.join(ROOT_DIR, "README.md"),
      label: "README.md",
    },
  ];
}

// ============================================
// 核心同步引擎
// ============================================

/**
 * 对单个文件应用一组替换规则
 * @returns {{ file: string, matchCount: number, changed: boolean, diffs: string[] }}
 */
function applyPatterns(filePath, patterns, dryRun) {
  const result = {
    file: path.relative(ROOT_DIR, filePath),
    matchCount: 0,
    changed: false,
    diffs: [],
  };

  if (!fs.existsSync(filePath)) {
    result.diffs.push(`⚠️  文件不存在: ${result.file}`);
    return result;
  }

  const originalContent = fs.readFileSync(filePath, "utf-8");
  let content = originalContent;

  for (const pattern of patterns) {
    if (!pattern.regex) continue;

    // Reset lastIndex for global regexes
    const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

    // Count matches
    const matches = [...originalContent.matchAll(regex)];
    result.matchCount += matches.length;

    if (matches.length > 0) {
      const before = content;
      content = content.replace(
        new RegExp(pattern.regex.source, pattern.regex.flags),
        pattern.replacement,
      );

      if (before !== content) {
        result.changed = true;

        if (VERBOSE) {
          for (const m of matches) {
            const lineNum = originalContent
              .substring(0, m.index)
              .split("\n").length;
            const replaced = m[0].replace(
              new RegExp(pattern.regex.source, pattern.regex.flags),
              pattern.replacement,
            );
            if (m[0] !== replaced) {
              result.diffs.push(
                `    L${lineNum} [${pattern.label}]: "${m[0]}" → "${replaced}"`,
              );
            }
          }
        }
      }
    }
  }

  if (result.changed && !dryRun) {
    fs.writeFileSync(filePath, content, "utf-8");
  }

  return result;
}

// ============================================
// CHANGELOG ↔ changelogs/ 同步检查
// ============================================

function checkChangelogSync(version) {
  const issues = [];

  const changelogPath = path.join(ROOT_DIR, "CHANGELOG.md");
  const detailPath = path.join(ROOT_DIR, "changelogs", `v${version}.md`);

  // 检查 CHANGELOG.md 中是否有当前版本的条目
  if (fs.existsSync(changelogPath)) {
    const content = fs.readFileSync(changelogPath, "utf-8");
    if (!content.includes(`v${version}`)) {
      issues.push(`❌ CHANGELOG.md 缺少 v${version} 的版本条目`);
    }
  } else {
    issues.push("❌ CHANGELOG.md 文件不存在");
  }

  // 检查 changelogs/vX.Y.Z.md 是否存在
  if (!fs.existsSync(detailPath)) {
    issues.push(`❌ changelogs/v${version}.md 详细变更文件不存在`);
  }

  // 交叉检查
  const changelogsDir = path.join(ROOT_DIR, "changelogs");
  if (fs.existsSync(changelogsDir) && fs.existsSync(changelogPath)) {
    const changelogContent = fs.readFileSync(changelogPath, "utf-8");
    const versionFiles = fs
      .readdirSync(changelogsDir)
      .filter((f) => /^v\d+\.\d+\.\d+\.md$/.test(f));

    for (const vf of versionFiles) {
      const ver = vf.replace(/\.md$/, "");
      if (!changelogContent.includes(ver)) {
        issues.push(`⚠️  changelogs/${vf} 存在但 CHANGELOG.md 未引用 ${ver}`);
      }
    }

    // 反向检查
    const referencedVersions = [
      ...changelogContent.matchAll(
        /\[v(\d+\.\d+\.\d+)\]\(\.\/changelogs\/v\d+\.\d+\.\d+\.md\)/g,
      ),
    ];
    for (const match of referencedVersions) {
      const refFile = path.join(changelogsDir, `v${match[1]}.md`);
      if (!fs.existsSync(refFile)) {
        issues.push(
          `❌ CHANGELOG.md 引用了 changelogs/v${match[1]}.md 但该文件不存在`,
        );
      }
    }
  }

  return issues;
}

// ============================================
// 文件数量校验
// ============================================

function checkFileCounts() {
  const issues = [];

  // v3 路由数量
  const workflowDirs = [
    "build",
    "fix",
    "analyze",
    "audit",
    "common",
    "walkthrough",
  ];
  const actualWorkflows = workflowDirs.filter((d) =>
    fs.existsSync(path.join(V3_DIR, "workflows", d)),
  ).length;

  // v3 模板数量
  const templatesDir = path.join(V3_DIR, "templates");
  const actualTemplates = fs.existsSync(templatesDir)
    ? fs.readdirSync(templatesDir).filter((f) => f.endsWith(".md")).length
    : 0;

  // 检查 README.md 中标注的数量
  const readmePath = path.join(ROOT_DIR, "README.md");
  if (fs.existsSync(readmePath)) {
    const readme = fs.readFileSync(readmePath, "utf-8");

    // 路由数 badge: 路由-6_种
    const routeMatch = readme.match(/路由-(\d+)_种/);
    if (routeMatch) {
      const stated = parseInt(routeMatch[1], 10);
      // 路由数 = build + fix + analyze + audit + chat(内联) + resume(内联) = 6
      // 不直接对比目录数（因为 chat/resume 内联在 RULES.md）
      console.log(
        `   ✅ README.md — 路由数 badge: ${stated}（路由含内联 chat/resume）`,
      );
    }

    // 模板数 badge: 模板-8_个
    const templateMatch = readme.match(/模板-(\d+)_个/);
    if (templateMatch) {
      const stated = parseInt(templateMatch[1], 10);
      if (stated === actualTemplates) {
        console.log(
          `   ✅ README.md — 模板数 badge: ${stated}（实际 ${actualTemplates}，一致）`,
        );
      } else {
        console.log(
          `   ❌ README.md — 模板数 badge: 标注 ${stated}，实际 ${actualTemplates}`,
        );
        issues.push(
          `README.md 模板数 badge 标注 ${stated} ≠ 实际 ${actualTemplates}`,
        );
      }
    }
  }

  return issues;
}

// ============================================
// 主流程
// ============================================

function main() {
  console.log("═".repeat(60));
  console.log("🔧 bump-version.js (v3) — 版本号 & 约束条数 & 日期同步");
  console.log("═".repeat(60));
  console.log(`   模式: ${APPLY ? "🟢 应用 (--apply)" : "🔵 检查 (dry-run)"}`);
  console.log(`   真相源: version/v3/RULES.md`);
  console.log();

  // 1. 读取 RULES.md
  if (!fs.existsSync(RULES_PATH)) {
    console.error("❌ version/v3/RULES.md 不存在！");
    process.exit(1);
  }

  const rulesContent = fs.readFileSync(RULES_PATH, "utf-8");
  const header = parseRulesHeader(rulesContent);
  const autoConstraintCount = countConstraints(rulesContent);
  const { p0, p1 } = countP0P1(rulesContent);

  const version = VERSION_OVERRIDE || header.version;
  const lastUpdated = DATE_OVERRIDE || header.lastUpdated;
  const constraintCount = CONSTRAINT_OVERRIDE
    ? parseInt(CONSTRAINT_OVERRIDE, 10)
    : autoConstraintCount;

  if (!version) {
    console.error("❌ 无法从 RULES.md 提取版本号");
    process.exit(1);
  }
  if (!lastUpdated) {
    console.error("❌ 无法从 RULES.md 提取最后更新日期");
    process.exit(1);
  }
  if (!constraintCount) {
    console.error("❌ 无法从 RULES.md §4 计数约束条数");
    process.exit(1);
  }

  console.log(`   📌 版本号: v${version}`);
  console.log(`   📌 约束条数: ${constraintCount}（P0: ${p0}, P1: ${p1}）`);
  console.log(`   📌 最后更新: ${lastUpdated}`);
  if (VERSION_OVERRIDE) console.log(`   ⚡ 版本号已覆盖 (--version)`);
  if (DATE_OVERRIDE) console.log(`   ⚡ 日期已覆盖 (--date)`);
  if (CONSTRAINT_OVERRIDE) console.log(`   ⚡ 约束数已覆盖 (--constraints)`);
  console.log();

  const summary = {
    filesChecked: 0,
    filesChanged: 0,
    totalMatches: 0,
    missingFiles: [],
    errors: [],
  };

  // 2. 扫描 version/v3/ 下全部 .md 文件
  const v3Files = walkMdFiles(V3_DIR);
  console.log(`   📂 扫描到 ${v3Files.length} 个 v3 文件`);
  console.log();

  // 3. 同步版本号（v3 内部文件）
  console.log("─".repeat(60));
  console.log("📦 版本号同步（v3 内部）");
  console.log("─".repeat(60));

  const versionPatterns = getV3VersionPatterns(version);
  for (const filePath of v3Files) {
    const result = applyPatterns(filePath, versionPatterns, !APPLY);
    summary.filesChecked++;
    summary.totalMatches += result.matchCount;

    if (result.changed) {
      summary.filesChanged++;
      console.log(
        `   ${APPLY ? "✅" : "🔄"} ${result.file} — ${result.matchCount} 处${APPLY ? "已更新" : "需更新"}`,
      );
      for (const d of result.diffs) console.log(d);
    } else if (result.matchCount > 0) {
      console.log(`   ✅ ${result.file} — 已是最新 (${result.matchCount} 处)`);
    }
    // 没有版本号的文件不显示（减少噪音）
  }

  // 4. 同步版本号（外部文件）
  console.log();
  console.log("─".repeat(60));
  console.log("📦 版本号同步（外部入口）");
  console.log("─".repeat(60));

  for (const ext of getExternalFiles()) {
    const result = applyPatterns(ext.path, versionPatterns, !APPLY);
    summary.filesChecked++;
    summary.totalMatches += result.matchCount;

    if (!fs.existsSync(ext.path)) {
      summary.missingFiles.push(ext.label);
      console.log(`   ⚠️  ${ext.label} — 文件不存在`);
    } else if (result.changed) {
      summary.filesChanged++;
      console.log(
        `   ${APPLY ? "✅" : "🔄"} ${ext.label} — ${result.matchCount} 处${APPLY ? "已更新" : "需更新"}`,
      );
      for (const d of result.diffs) console.log(d);
    } else {
      console.log(`   ✅ ${ext.label} — 已是最新 (${result.matchCount} 处)`);
    }
  }

  // 5. 同步约束条数
  console.log();
  console.log("─".repeat(60));
  console.log("📋 约束条数同步");
  console.log("─".repeat(60));

  const constraintPatterns = [
    ...getConstraintPatterns(constraintCount),
    ...getP0P1Patterns(p0, p1),
  ];

  // 约束条数同步范围: RULES.md + 外部文件
  const constraintFiles = [
    { path: RULES_PATH, label: "version/v3/RULES.md" },
    ...getExternalFiles(),
  ];

  for (const cf of constraintFiles) {
    const result = applyPatterns(cf.path, constraintPatterns, !APPLY);
    summary.filesChecked++;
    summary.totalMatches += result.matchCount;

    if (!fs.existsSync(cf.path)) {
      summary.missingFiles.push(cf.label);
      console.log(`   ⚠️  ${cf.label} — 文件不存在`);
    } else if (result.changed) {
      summary.filesChanged++;
      console.log(
        `   ${APPLY ? "✅" : "🔄"} ${cf.label} — ${result.matchCount} 处${APPLY ? "已更新" : "需更新"}`,
      );
      for (const d of result.diffs) console.log(d);
    } else if (result.matchCount > 0) {
      console.log(`   ✅ ${cf.label} — 已是最新 (${result.matchCount} 处)`);
    } else {
      console.log(`   ⏭️  ${cf.label} — 无约束数标注`);
    }
  }

  // 6. 同步日期（v3 内部 + 外部）
  console.log();
  console.log("─".repeat(60));
  console.log("📅 日期同步");
  console.log("─".repeat(60));

  const datePatterns = getV3DatePatterns(lastUpdated);
  const allDateFiles = [
    ...v3Files.map((f) => ({
      path: f,
      label: path.relative(ROOT_DIR, f),
    })),
    ...getExternalFiles(),
  ];

  for (const df of allDateFiles) {
    const result = applyPatterns(df.path, datePatterns, !APPLY);
    summary.filesChecked++;
    summary.totalMatches += result.matchCount;

    if (result.changed) {
      summary.filesChanged++;
      console.log(
        `   ${APPLY ? "✅" : "🔄"} ${result.file || df.label} — ${result.matchCount} 处${APPLY ? "已更新" : "需更新"}`,
      );
      for (const d of result.diffs) console.log(d);
    } else if (result.matchCount > 0) {
      // 已是最新的文件: 日期同步时只在 verbose 模式显示
      if (VERBOSE) {
        console.log(
          `   ✅ ${result.file || df.label} — 已是最新 (${result.matchCount} 处)`,
        );
      }
    }
  }

  if (!VERBOSE) {
    const dateUpToDateCount = allDateFiles.length - summary.filesChanged;
    console.log(
      `   ✅ ${dateUpToDateCount} 个文件日期已是最新（--verbose 查看详情）`,
    );
  }

  // 7. CHANGELOG ↔ changelogs/ 交叉检查
  console.log();
  console.log("─".repeat(60));
  console.log("🔗 CHANGELOG ↔ changelogs/ 同步检查");
  console.log("─".repeat(60));

  const changelogIssues = checkChangelogSync(version);
  if (changelogIssues.length === 0) {
    console.log("   ✅ CHANGELOG.md 与 changelogs/ 目录完全同步");
  } else {
    for (const issue of changelogIssues) {
      console.log(`   ${issue}`);
      summary.errors.push(issue);
    }
  }

  // 8. 文件数量校验
  console.log();
  console.log("─".repeat(60));
  console.log("🔢 文件数量校验");
  console.log("─".repeat(60));

  const countIssues = checkFileCounts();
  summary.errors.push(...countIssues);

  // 9. RULES.md 自身版本号更新（当使用 --version 覆盖时）
  if (APPLY && VERSION_OVERRIDE) {
    // RULES.md 头部版本号已在步骤 3 中被更新
    // 版本历史行也已被更新
    console.log();
    console.log(`   ✅ RULES.md 版本号已更新为 v${version}`);
  }

  if (APPLY && DATE_OVERRIDE) {
    console.log(`   ✅ 所有日期已更新为 ${lastUpdated}`);
  }

  // 10. 输出摘要
  console.log();
  console.log("═".repeat(60));
  console.log("📊 同步摘要");
  console.log("═".repeat(60));
  console.log(`   v3 文件数:     ${v3Files.length}`);
  console.log(`   检查文件数:    ${summary.filesChecked}`);
  console.log(`   匹配总数:      ${summary.totalMatches}`);
  console.log(`   ${APPLY ? "已更新" : "需更新"}文件: ${summary.filesChanged}`);

  if (summary.missingFiles.length > 0) {
    console.log(`   ⚠️  缺失文件: ${summary.missingFiles.join(", ")}`);
  }

  if (summary.errors.length > 0) {
    console.log(`   ❌ 问题数:     ${summary.errors.length}`);
    for (const err of summary.errors) {
      console.log(`      · ${err}`);
    }
  }

  if (!APPLY && summary.filesChanged > 0) {
    console.log();
    console.log(
      "   💡 提示: 运行 `node tools/bump-version.js --apply` 以应用更改",
    );
  }

  if (APPLY && summary.filesChanged > 0) {
    console.log();
    console.log("   ✅ 所有更改已写入磁盘");
  }

  if (!APPLY && summary.filesChanged === 0 && summary.errors.length === 0) {
    console.log();
    console.log("   🎉 所有文件已是最新，无需更改");
  }

  console.log();
  console.log("═".repeat(60));

  const exitCode = summary.errors.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

main();
