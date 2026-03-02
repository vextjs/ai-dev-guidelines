#!/usr/bin/env node
/**
 * bump-version.js — 版本号 & 约束条数 & 日期自动同步工具
 *
 * 从 META.yaml（单一真相源）读取 version、constraint_count、last_updated，
 * 自动扫描并同步到所有引用文件。
 *
 * 同步范围:
 *   - 版本号:   8 个文件（META.yaml §version_files）
 *   - 约束条数: 11 个文件（META.yaml §constraint_files）
 *   - 日期:     8 个文件（META.yaml §date_sync_files）
 *
 * 用法:
 *   node tools/bump-version.js                # 检查模式（只报告差异，不修改）
 *   node tools/bump-version.js --apply        # 应用模式（实际写入修改）
 *   node tools/bump-version.js --apply --date 2026-03-01  # 同时覆盖日期
 *
 * 选项:
 *   --apply       实际执行写入（默认为 dry-run 检查模式）
 *   --date <val>  覆盖 last_updated 日期（默认使用 META.yaml 中的值）
 *   --verbose     输出详细匹配信息
 *
 * 依赖: 无外部依赖，仅使用 Node.js 内置模块
 *
 * 版本: 1.1.0
 * 最后更新: 2026-03-02
 */

const fs = require("fs");
const path = require("path");

// ============================================
// 配置
// ============================================

const ROOT_DIR = path.resolve(__dirname, "../..");
const PROJECT_ROOT = path.resolve(ROOT_DIR, ".."); // MySelf/ — .github/ 所在目录
const META_PATH = path.join(ROOT_DIR, "core/META.yaml");

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const VERBOSE = args.includes("--verbose");
const dateIdx = args.indexOf("--date");
const DATE_OVERRIDE = dateIdx !== -1 ? args[dateIdx + 1] : null;

// ============================================
// 简易 YAML 解析（仅解析 META.yaml 的顶层标量字段）
// ============================================

function parseMetaYaml(content) {
  const meta = {};
  // 只提取这 3 个顶层标量键，忽略嵌套结构中的同名字段
  const TARGET_KEYS = ["version", "constraint_count", "last_updated"];

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-"))
      continue;

    // 只匹配行首无缩进的顶层键（排除缩进行中的嵌套字段）
    if (line.startsWith(" ") || line.startsWith("\t")) continue;

    const match = trimmed.match(/^(\w+):\s*"([^"]+)"/);
    if (match && TARGET_KEYS.includes(match[1])) {
      meta[match[1]] = match[2];
      continue;
    }

    // 非引号值（如 constraint_count: 20）
    const matchUnquoted = trimmed.match(/^(\w+):\s*(\S+)\s*(?:#.*)?$/);
    if (matchUnquoted && TARGET_KEYS.includes(matchUnquoted[1])) {
      meta[matchUnquoted[1]] = matchUnquoted[2];
    }
  }
  return meta;
}

// ============================================
// 版本号同步规则
// ============================================

/**
 * 每个规则定义:
 *   file     — 相对于项目根目录的文件路径
 *   patterns — 正则 + 替换模板数组（一个文件可能有多处需要替换）
 *
 * 正则中使用命名捕获组 `(?<pre>...)` 保留前缀，`(?<ver>[\d.]+)` 匹配旧版本号
 */
function getVersionRules(version) {
  return [
    // 1. .github/copilot-instructions.md (位于上层目录 MySelf/.github/)
    {
      file: "../.github/copilot-instructions.md",
      patterns: [
        {
          regex: /(\*\*版本\*\*:\s*v)[\d.]+/g,
          replacement: `$1${version}`,
        },
      ],
    },
    // 2. core/README.md
    {
      file: "core/README.md",
      patterns: [
        {
          regex: /(\*\*版本\*\*:\s*v)[\d.]+/g,
          replacement: `$1${version}`,
        },
        {
          regex: /(版本:\s*v)[\d.]+/g,
          replacement: `$1${version}`,
        },
      ],
    },
    // 3. core/QUICK-REFERENCE.md (头部 + 尾部)
    {
      file: "core/QUICK-REFERENCE.md",
      patterns: [
        {
          regex: /(\*\*版本\*\*:\s*v)[\d.]+/g,
          replacement: `$1${version}`,
        },
      ],
    },
    // 4. core/CONSTRAINTS.md
    {
      file: "core/CONSTRAINTS.md",
      patterns: [
        {
          regex: /(\*\*版本\*\*:\s*v)[\d.]+/g,
          replacement: `$1${version}`,
        },
      ],
    },
    // 5. core/STATUS.md
    {
      file: "core/STATUS.md",
      patterns: [
        {
          regex: /(\*\*当前版本\*\*:\s*v)[\d.]+/g,
          replacement: `$1${version}`,
        },
      ],
    },
    // 6. core/workflows/decision-tree.yaml (多处)
    {
      file: "core/workflows/decision-tree.yaml",
      patterns: [
        // L1: 注释中的版本号
        {
          regex: /(# AI 决策树配置文件 v)[\d.]+/g,
          replacement: `$1${version}`,
        },
        // L4: version 字段
        {
          regex: /(version:\s*")[\d.]+(")/g,
          replacement: `$1${version}$2`,
        },
        // mandatory_precheck.version (vX.Y 无补丁号)
        {
          regex: /(version:\s*"v)\d+\.\d+(")/g,
          replacement: `$1${version.replace(/\.\d+$/, "")}$2`,
        },
        // L82 注释: 强制预检查 (vX.Y
        {
          regex: /(# 强制预检查 \(v)\d+\.\d+/g,
          replacement: `$1${version.replace(/\.\d+$/, "")}`,
        },
      ],
    },
    // 7. core/workflows/00-pre-check/README.md (头部 + 尾部)
    {
      file: "core/workflows/00-pre-check/README.md",
      patterns: [
        {
          regex: /(\*\*版本\*\*:\s*v)[\d.]+/g,
          replacement: `$1${version}`,
        },
      ],
    },
    // 8. CHANGELOG.md — 版本号在概览表中，需要人工维护内容，此处仅检测
    {
      file: "CHANGELOG.md",
      patterns: [], // CHANGELOG 内容需要人工填写，不自动替换
      checkOnly: true,
    },
  ];
}

// ============================================
// 约束条数同步规则
// ============================================

function getConstraintRules(count) {
  const countStr = String(count);
  return [
    // 1. core/CONSTRAINTS.md
    {
      file: "core/CONSTRAINTS.md",
      patterns: [
        {
          regex: /(核心约束（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 2. core/QUICK-REFERENCE.md
    {
      file: "core/QUICK-REFERENCE.md",
      patterns: [
        {
          regex: /(核心约束 \()\d+(条\))/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(核心约束（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(当前 )\d+( 条)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 3. .github/copilot-instructions.md (位于上层目录)
    {
      file: "../.github/copilot-instructions.md",
      patterns: [
        {
          regex: /(执行约束（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 4. core/README.md
    {
      file: "core/README.md",
      patterns: [
        {
          regex: /(约束清单（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 5. core/STATUS.md — 仅匹配核心改进表中的当前值，不修改历史版本条目
    {
      file: "core/STATUS.md",
      patterns: [
        {
          regex: /(约束体系 )\d+( 条.*?含)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 6. core/workflows/decision-tree.yaml
    {
      file: "core/workflows/decision-tree.yaml",
      patterns: [
        {
          regex: /(CONSTRAINTS\.md 的 )\d+( 条约束)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 7. projects/dev-docs/profile/README.md
    {
      file: "projects/dev-docs/profile/README.md",
      patterns: [
        {
          regex: /(约束清单（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(约束体系 )\d+( 条)/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(CONSTRAINTS\.md.*?)\d+( 条)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 8. projects/dev-docs/profile/01-项目信息.md
    {
      file: "projects/dev-docs/profile/01-项目信息.md",
      patterns: [
        {
          regex: /(约束清单（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(约束体系.*?)\d+( 条)/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(CONSTRAINTS\.md.*?)\d+( 条)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 9. projects/dev-docs/profile/02-架构约束.md
    {
      file: "projects/dev-docs/profile/02-架构约束.md",
      patterns: [
        {
          regex: /(CONSTRAINTS\.md.*?)\d+( 条)/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(约束清单（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 10. changelogs/v<当前版本>.md — 动态路径
    {
      file: null, // 动态确定
      dynamicFile: true,
      patterns: [
        {
          regex: /(CONSTRAINTS\.md.*?（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(约束清单.*?（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
    // 11. core/self-fix/detection/conflict-detection.md
    {
      file: "core/self-fix/detection/conflict-detection.md",
      patterns: [
        {
          regex: /(核心约束（)\d+( 条）)/g,
          replacement: `$1${countStr}$2`,
        },
        {
          regex: /(约束.*?应为 )\d+/g,
          replacement: `$1${countStr}`,
        },
        {
          regex: /(基准值.*?)\d+( 条)/g,
          replacement: `$1${countStr}$2`,
        },
      ],
    },
  ];
}

// ============================================
// last_updated 日期同步规则 (8 个文件)
// ============================================
// 与 META.yaml §date_sync_files 和 CROSS-VALIDATION.md §日期同步清单 保持一致
// 根因: 日期遗漏已反复发生 5+ 次，版本号/约束条数有自动同步但日期靠手动 → 反复漏改

function getDateRules(dateStr) {
  // 通用 patterns：匹配多种日期格式
  //   - **最后更新**: 2026-03-02   （markdown 加粗，大部分核心文件）
  //   - > **最后更新**: 2026-03-02  （blockquote 中的加粗）
  //   - 最后更新: 2026-03-02        （纯文本，如 README 尾部 `- 最后更新: YYYY-MM-DD`）
  //   - last_updated: "2026-03-02"  （YAML 格式，decision-tree.yaml）
  //
  // 🔴 regex 要点: `**最后更新**:` 中 `最后更新` 后面紧跟 `**:`，
  //    所以字符类必须包含 `*` — 即 `[*：:]` 而非 `[：:]`
  const commonPatterns = [
    {
      // 匹配: **最后更新**: / 最后更新: / 最后更新：
      // [*：:] 覆盖 markdown 加粗闭合的 * 和直接的冒号
      regex: /(最后更新\**[：:]\s*)\d{4}-\d{2}-\d{2}/g,
      replacement: `$1${dateStr}`,
    },
    {
      // 匹配: last_updated: "YYYY-MM-DD" (YAML)
      regex: /(last_updated:\s*")\d{4}-\d{2}-\d{2}(")/g,
      replacement: `$1${dateStr}$2`,
    },
  ];

  return [
    // 1. .github/copilot-instructions.md — 入口文件（L2）
    "../.github/copilot-instructions.md",
    // 2. core/README.md — 项目主入口（头部 L4 + 尾部 L226）
    "core/README.md",
    // 3. core/QUICK-REFERENCE.md — 速查手册（头部 + 尾部两处）
    "core/QUICK-REFERENCE.md",
    // 4. core/CONSTRAINTS.md — 约束清单（头部 + 尾部两处）
    "core/CONSTRAINTS.md",
    // 5. core/STATUS.md — 项目状态（头部 + 尾部两处）
    "core/STATUS.md",
    // 6. core/workflows/decision-tree.yaml — 决策树配置（L5）
    "core/workflows/decision-tree.yaml",
    // 7. core/workflows/00-pre-check/README.md — 预检查工作流（尾部）
    "core/workflows/00-pre-check/README.md",
    // 8. core/ONBOARDING.md — 新 Agent 上手指南（L5）
    "core/ONBOARDING.md",
  ].map((file) => ({
    file,
    patterns: commonPatterns,
  }));
}

// ============================================
// 核心同步引擎
// ============================================

/**
 * 对单个文件应用一组替换规则
 * @returns {{ file: string, matchCount: number, changed: boolean, diffs: string[] }}
 */
function applyRules(filePath, patterns, dryRun) {
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

  let content = fs.readFileSync(filePath, "utf-8");
  let newContent = content;

  for (const { regex, replacement } of patterns) {
    // Reset lastIndex for global regexes
    regex.lastIndex = 0;

    // Count matches first
    const matches = [
      ...content.matchAll(new RegExp(regex.source, regex.flags)),
    ];
    result.matchCount += matches.length;

    if (matches.length > 0) {
      const before = newContent;
      newContent = newContent.replace(
        new RegExp(regex.source, regex.flags),
        replacement,
      );

      if (before !== newContent) {
        result.changed = true;

        if (VERBOSE) {
          for (const m of matches) {
            const lineNum = content.substring(0, m.index).split("\n").length;
            result.diffs.push(
              `  L${lineNum}: "${m[0]}" → "${m[0].replace(new RegExp(regex.source, regex.flags), replacement)}"`,
            );
          }
        }
      }
    }
  }

  if (result.changed && !dryRun) {
    fs.writeFileSync(filePath, newContent, "utf-8");
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

  // 交叉检查：changelogs/ 目录中是否有 CHANGELOG.md 未引用的版本
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

    // 反向检查：CHANGELOG.md 引用的版本是否都有对应的 changelogs/ 文件
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
// 主流程
// ============================================

function main() {
  console.log("═".repeat(60));
  console.log("🔧 bump-version.js — 版本号 & 约束条数 & 日期自动同步");
  console.log("═".repeat(60));
  console.log(`   模式: ${APPLY ? "🟢 应用 (--apply)" : "🔵 检查 (dry-run)"}`);
  console.log();

  // 1. 读取 META.yaml
  if (!fs.existsSync(META_PATH)) {
    console.error("❌ META.yaml 不存在！请在项目根目录创建 META.yaml");
    process.exit(1);
  }

  const metaContent = fs.readFileSync(META_PATH, "utf-8");
  const meta = parseMetaYaml(metaContent);

  const version = meta.version;
  const constraintCount = parseInt(meta.constraint_count, 10);
  const lastUpdated = DATE_OVERRIDE || meta.last_updated;

  if (!version || isNaN(constraintCount)) {
    console.error("❌ META.yaml 解析失败: 缺少 version 或 constraint_count");
    process.exit(1);
  }

  console.log(`   📌 版本号: v${version}`);
  console.log(`   📌 约束条数: ${constraintCount}`);
  console.log(`   📌 最后更新: ${lastUpdated}`);
  console.log();

  const summary = {
    filesChecked: 0,
    filesChanged: 0,
    totalMatches: 0,
    missingFiles: [],
    errors: [],
  };

  // 2. 同步版本号
  console.log("─".repeat(60));
  console.log("📦 版本号同步");
  console.log("─".repeat(60));

  const versionRules = getVersionRules(version);
  for (const rule of versionRules) {
    if (rule.checkOnly) {
      console.log(`   ⏭️  ${rule.file} (需手动维护，跳过自动替换)`);
      continue;
    }
    const filePath = path.join(ROOT_DIR, rule.file);
    const result = applyRules(filePath, rule.patterns, !APPLY);
    summary.filesChecked++;
    summary.totalMatches += result.matchCount;

    if (!fs.existsSync(filePath)) {
      summary.missingFiles.push(rule.file);
      console.log(`   ⚠️  ${rule.file} — 文件不存在`);
    } else if (result.changed) {
      summary.filesChanged++;
      console.log(
        `   ${APPLY ? "✅" : "🔄"} ${rule.file} — ${result.matchCount} 处${APPLY ? "已更新" : "需更新"}`,
      );
      for (const d of result.diffs) console.log(d);
    } else {
      console.log(`   ✅ ${rule.file} — 已是最新`);
    }
  }

  // 3. 同步约束条数
  console.log();
  console.log("─".repeat(60));
  console.log("📋 约束条数同步");
  console.log("─".repeat(60));

  const constraintRules = getConstraintRules(constraintCount);
  for (const rule of constraintRules) {
    let filePath;

    if (rule.dynamicFile) {
      // 动态确定当前版本的 changelog 文件
      filePath = path.join(ROOT_DIR, "changelogs", `v${version}.md`);
    } else {
      filePath = path.join(ROOT_DIR, rule.file);
    }

    const displayName = rule.dynamicFile
      ? `changelogs/v${version}.md`
      : rule.file;
    const result = applyRules(filePath, rule.patterns, !APPLY);
    summary.filesChecked++;
    summary.totalMatches += result.matchCount;

    if (!fs.existsSync(filePath)) {
      summary.missingFiles.push(displayName);
      console.log(`   ⚠️  ${displayName} — 文件不存在`);
    } else if (result.changed) {
      summary.filesChanged++;
      console.log(
        `   ${APPLY ? "✅" : "🔄"} ${displayName} — ${result.matchCount} 处${APPLY ? "已更新" : "需更新"}`,
      );
      for (const d of result.diffs) console.log(d);
    } else {
      console.log(`   ✅ ${displayName} — 已是最新`);
    }
  }

  // 4. 同步日期
  console.log();
  console.log("─".repeat(60));
  console.log("📅 日期同步");
  console.log("─".repeat(60));

  const dateRules = getDateRules(lastUpdated);
  for (const rule of dateRules) {
    const filePath = path.join(ROOT_DIR, rule.file);
    const result = applyRules(filePath, rule.patterns, !APPLY);
    summary.filesChecked++;
    summary.totalMatches += result.matchCount;

    if (!fs.existsSync(filePath)) {
      console.log(`   ⚠️  ${rule.file} — 文件不存在`);
    } else if (result.changed) {
      summary.filesChanged++;
      console.log(
        `   ${APPLY ? "✅" : "🔄"} ${rule.file} — ${result.matchCount} 处${APPLY ? "已更新" : "需更新"}`,
      );
    } else {
      console.log(`   ✅ ${rule.file} — 已是最新`);
    }
  }

  // 5. CHANGELOG ↔ changelogs/ 交叉检查
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

  // 6. 工具脚本 & 模板数量校验（防复现 BUG-052/053/057）
  console.log();
  console.log("─".repeat(60));
  console.log("🔢 工具/模板数量校验");
  console.log("─".repeat(60));

  const countChecks = [
    {
      label: "工具脚本 (core/tools/*.js)",
      dir: path.join(ROOT_DIR, "core/tools"),
      filter: (f) => f.endsWith(".js"),
      refs: [
        { file: "core/STATUS.md", regex: /(\d+)个可执行脚本/ },
        { file: "core/README.md", regex: /工具脚本（(\d+) 个）/ },
      ],
    },
    {
      label: "模板总数 (lite+core+extended+common)",
      count: () => {
        const dirs = [
          { dir: "core/templates/lite", exclude: ["README.md"] },
          { dir: "core/templates/core", exclude: [] },
          { dir: "core/templates/extended", exclude: ["README.md"] },
          { dir: "core/templates/common", exclude: ["README.md"] },
          { dir: "core/templates/common/changelogs", exclude: [] },
        ];
        let total = 0;
        for (const d of dirs) {
          const fullPath = path.join(ROOT_DIR, d.dir);
          if (!fs.existsSync(fullPath)) continue;
          const files = fs
            .readdirSync(fullPath)
            .filter(
              (f) =>
                f.endsWith(".md") &&
                !d.exclude.includes(f) &&
                !fs.statSync(path.join(fullPath, f)).isDirectory(),
            );
          total += files.length;
        }
        return total;
      },
      refs: [
        {
          file: "core/STATUS.md",
          regex: /模板可用性\s*\|\s*100%\s*\((\d+)\/\d+\)/,
        },
      ],
    },
  ];

  for (const check of countChecks) {
    let actual;
    if (check.count) {
      actual = check.count();
    } else {
      const files = fs.readdirSync(check.dir).filter(check.filter);
      actual = files.length;
    }

    for (const ref of check.refs) {
      const refPath = path.join(ROOT_DIR, ref.file);
      if (!fs.existsSync(refPath)) {
        console.log(`   ⚠️  ${ref.file} — 文件不存在`);
        continue;
      }
      const content = fs.readFileSync(refPath, "utf-8");
      const match = content.match(ref.regex);
      if (match) {
        const stated = parseInt(match[1], 10);
        if (stated === actual) {
          console.log(`   ✅ ${ref.file} — ${check.label}: ${actual} (一致)`);
        } else {
          console.log(
            `   ❌ ${ref.file} — ${check.label}: 标注 ${stated}，实际 ${actual}`,
          );
          summary.errors.push(
            `${ref.file}: ${check.label} 标注 ${stated} ≠ 实际 ${actual}`,
          );
        }
      } else {
        console.log(`   ⚠️  ${ref.file} — 未匹配到 ${check.label} 的数量标注`);
      }
    }
  }

  // 7. META.yaml 自身日期更新
  if (APPLY && DATE_OVERRIDE) {
    const updatedMeta = metaContent.replace(
      /(last_updated:\s*")\d{4}-\d{2}-\d{2}(")/,
      `$1${DATE_OVERRIDE}$2`,
    );
    if (updatedMeta !== metaContent) {
      fs.writeFileSync(META_PATH, updatedMeta, "utf-8");
      console.log();
      console.log(`   ✅ META.yaml last_updated 已更新为 ${DATE_OVERRIDE}`);
    }
  }

  // 8. 输出摘要
  console.log();
  console.log("═".repeat(60));
  console.log("📊 同步摘要");
  console.log("═".repeat(60));
  console.log(`   检查文件数: ${summary.filesChecked}`);
  console.log(`   匹配总数:   ${summary.totalMatches}`);
  console.log(`   ${APPLY ? "已更新" : "需更新"}文件: ${summary.filesChanged}`);

  if (summary.missingFiles.length > 0) {
    console.log(`   ⚠️  缺失文件: ${summary.missingFiles.join(", ")}`);
  }

  if (summary.errors.length > 0) {
    console.log(`   ❌ 问题数:   ${summary.errors.length}`);
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

  console.log();
  console.log("═".repeat(60));

  // 退出码: 有错误时返回 1
  const exitCode = summary.errors.length > 0 ? 1 : 0;
  process.exit(exitCode);
}

main();
