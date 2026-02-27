#!/usr/bin/env node
/**
 * update-task-index.js — TASK-INDEX.md 自动生成/更新工具
 *
 * 扫描 reports/、changelogs/、.ai-memory/ 目录，
 * 自动生成或更新 projects/<project>/TASK-INDEX.md 中的任务条目。
 *
 * 用法:
 *   node tools/update-task-index.js <project>           # 更新指定项目的 TASK-INDEX
 *   node tools/update-task-index.js <project> --dry-run  # 预览变更，不写入文件
 *   node tools/update-task-index.js <project> --verbose   # 输出详细扫描信息
 *
 * 示例:
 *   node tools/update-task-index.js dev-docs
 *   node tools/update-task-index.js dev-docs --dry-run --verbose
 *
 * 功能:
 *   1. 扫描 reports/<子目录>/ 下的报告文件 → 提取分析/Bug/优化条目
 *   2. 扫描 changelogs/ 下的版本文件 → 提取版本发布记录
 *   3. 扫描 .ai-memory/clients/<agent>/tasks/ → 提取记忆文件和会话统计
 *   4. 与现有 TASK-INDEX.md 合并（保留手动维护的条目，新增自动发现的条目）
 *   5. 更新"最后更新"日期
 *
 * 依赖: 无外部依赖，仅使用 Node.js 内置模块
 *
 * 版本: 1.0.0
 * 最后更新: 2026-02-27
 */

const fs = require("fs");
const path = require("path");

// ============================================
// 配置
// ============================================

const ROOT_DIR = path.resolve(__dirname, "..");
const args = process.argv.slice(2);

const projectName = args.find((a) => !a.startsWith("--"));
const DRY_RUN = args.includes("--dry-run");
const VERBOSE = args.includes("--verbose");

if (!projectName) {
  console.error("❌ 用法: node tools/update-task-index.js <project> [--dry-run] [--verbose]");
  console.error("   示例: node tools/update-task-index.js dev-docs");
  process.exit(1);
}

const PROJECT_DIR = path.join(ROOT_DIR, "projects", projectName);
const TASK_INDEX_PATH = path.join(PROJECT_DIR, "TASK-INDEX.md");
const REPORTS_DIR = path.join(PROJECT_DIR, "reports");
const CHANGELOGS_DIR = path.join(ROOT_DIR, "changelogs");
const AI_MEMORY_DIR = path.join(PROJECT_DIR, ".ai-memory");

// ============================================
// 数据结构
// ============================================

/**
 * @typedef {Object} ReportEntry
 * @property {string} id      — 自动生成的 ID（如 ANA-001）
 * @property {string} date    — YYYY-MM-DD 格式日期
 * @property {string} title   — 报告标题
 * @property {string} status  — 状态
 * @property {string} path    — 相对路径
 * @property {string} type    — 类型: analysis | bug | optimization | ...
 */

/**
 * @typedef {Object} VersionEntry
 * @property {string} version — 版本号
 * @property {string} date    — 日期
 * @property {string} theme   — 主题
 * @property {string} path    — changelog 文件路径
 */

/**
 * @typedef {Object} MemoryEntry
 * @property {string} file     — 文件名（如 20260227.md）
 * @property {number} sessions — 会话数
 * @property {string} content  — 涵盖内容摘要
 * @property {string} agent    — Agent 标识
 */

// ============================================
// 扫描函数
// ============================================

/**
 * 扫描 reports/ 目录，提取报告条目
 */
function scanReports() {
  const entries = [];

  if (!fs.existsSync(REPORTS_DIR)) {
    if (VERBOSE) console.log("   ⏭️  reports/ 目录不存在，跳过");
    return entries;
  }

  const subdirs = fs.readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const subdir of subdirs) {
    const subdirPath = path.join(REPORTS_DIR, subdir);
    const files = fs.readdirSync(subdirPath)
      .filter((f) => f.endsWith(".md") && /^\d{8}-\d{2}-/.test(f))
      .sort();

    for (const file of files) {
      const filePath = path.join(subdirPath, file);
      const entry = parseReportFile(filePath, file, subdir);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  if (VERBOSE) console.log(`   📊 扫描到 ${entries.length} 个报告文件`);
  return entries;
}

/**
 * 解析单个报告文件，提取元数据
 */
function parseReportFile(filePath, fileName, subdir) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");

    // 提取日期: YYYYMMDD → YYYY-MM-DD
    const dateMatch = fileName.match(/^(\d{4})(\d{2})(\d{2})-(\d{2})-/);
    if (!dateMatch) return null;

    const date = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
    const nn = dateMatch[4];

    // 提取标题: 第一行 # 标题
    let title = fileName.replace(/\.md$/, "").replace(/^\d{8}-\d{2}-/, "");
    for (const line of lines) {
      if (line.startsWith("# ")) {
        title = line.replace(/^#\s+/, "").trim();
        break;
      }
    }

    // 确定类型
    let type = subdir; // analysis, bugs, optimizations, etc.
    const typePrefix = mapTypeToPrefix(type);

    // 生成相对路径
    const relPath = `reports/${subdir}/${fileName}`;

    return {
      id: null, // 将在合并阶段分配
      date,
      nn: parseInt(nn, 10),
      title: truncate(title, 60),
      status: "✅ 完成",
      path: relPath,
      type,
      typePrefix,
    };
  } catch (err) {
    if (VERBOSE) console.log(`   ⚠️  解析失败: ${fileName} — ${err.message}`);
    return null;
  }
}

/**
 * 扫描 changelogs/ 目录，提取版本发布记录
 */
function scanChangelogs() {
  const entries = [];

  if (!fs.existsSync(CHANGELOGS_DIR)) {
    if (VERBOSE) console.log("   ⏭️  changelogs/ 目录不存在，跳过");
    return entries;
  }

  const files = fs.readdirSync(CHANGELOGS_DIR)
    .filter((f) => /^v\d+\.\d+\.\d+\.md$/.test(f))
    .sort((a, b) => {
      // 按版本号排序
      const va = a.match(/v(\d+)\.(\d+)\.(\d+)/);
      const vb = b.match(/v(\d+)\.(\d+)\.(\d+)/);
      if (!va || !vb) return 0;
      const na = parseInt(va[1]) * 10000 + parseInt(va[2]) * 100 + parseInt(va[3]);
      const nb = parseInt(vb[1]) * 10000 + parseInt(vb[2]) * 100 + parseInt(vb[3]);
      return na - nb;
    });

  for (const file of files) {
    const filePath = path.join(CHANGELOGS_DIR, file);
    const entry = parseChangelogFile(filePath, file);
    if (entry) {
      entries.push(entry);
    }
  }

  if (VERBOSE) console.log(`   📦 扫描到 ${entries.length} 个版本文件`);
  return entries;
}

/**
 * 解析单个 changelog 文件
 */
function parseChangelogFile(filePath, fileName) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const version = fileName.replace(/\.md$/, "");

    // 提取日期
    let date = "-";
    const dateMatch = content.match(/发布日期[：:]\s*(\d{4}-\d{2}-\d{2})/i);
    if (dateMatch) {
      date = dateMatch[1];
    }

    // 提取主题: 第一行 # 标题中 " - " 后面的部分
    let theme = version;
    const lines = content.split("\n");
    for (const line of lines) {
      if (line.startsWith("# ")) {
        const dashIndex = line.indexOf(" - ");
        if (dashIndex !== -1) {
          theme = line.substring(dashIndex + 3).trim();
        }
        break;
      }
    }

    return {
      version,
      date,
      theme: truncate(theme, 60),
      path: `changelogs/${fileName}`,
    };
  } catch (err) {
    if (VERBOSE) console.log(`   ⚠️  解析失败: ${fileName} — ${err.message}`);
    return null;
  }
}

/**
 * 扫描 .ai-memory/ 目录，提取记忆文件统计
 */
function scanMemory() {
  const entries = [];

  if (!fs.existsSync(AI_MEMORY_DIR)) {
    if (VERBOSE) console.log("   ⏭️  .ai-memory/ 目录不存在，跳过");
    return entries;
  }

  const clientsDir = path.join(AI_MEMORY_DIR, "clients");
  if (!fs.existsSync(clientsDir)) {
    if (VERBOSE) console.log("   ⏭️  .ai-memory/clients/ 目录不存在，跳过");
    return entries;
  }

  const agents = fs.readdirSync(clientsDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const agent of agents) {
    const tasksDir = path.join(clientsDir, agent, "tasks");
    if (!fs.existsSync(tasksDir)) continue;

    const files = fs.readdirSync(tasksDir)
      .filter((f) => /^\d{8}\.md$/.test(f))
      .sort();

    for (const file of files) {
      const filePath = path.join(tasksDir, file);
      const entry = parseMemoryFile(filePath, file, agent);
      if (entry) {
        entries.push(entry);
      }
    }
  }

  if (VERBOSE) console.log(`   🧠 扫描到 ${entries.length} 个记忆文件`);
  return entries;
}

/**
 * 解析单个记忆文件，统计会话数和内容摘要
 */
function parseMemoryFile(filePath, fileName, agent) {
  try {
    const content = fs.readFileSync(filePath, "utf-8");

    // 统计 ## 会话 NN 的数量
    const sessionMatches = content.match(/^## 会话 \d+/gm);
    const sessions = sessionMatches ? sessionMatches.length : 0;

    // 提取每个会话的任务目标作为摘要
    const summaryParts = [];
    const goalMatches = content.match(/🎯 任务[目摘][标要][：:]\s*(.+)/g);
    if (goalMatches) {
      for (const match of goalMatches) {
        const goal = match.replace(/🎯 任务[目摘][标要][：:]\s*/, "").trim();
        if (goal && !summaryParts.includes(goal)) {
          summaryParts.push(truncate(goal, 30));
        }
      }
    }

    // 如果没有提取到目标，尝试从 ## 会话 标题后面的内容提取
    if (summaryParts.length === 0 && sessionMatches) {
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (/^## 会话 \d+/.test(lines[i])) {
          // 查找后续几行中的任务信息
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const line = lines[j].trim();
            if (line.startsWith("- **任务") || line.startsWith("**任务")) {
              const task = line.replace(/^[-*\s]*\*?\*?任务[^:：]*[：:]?\s*\*?\*?\s*/, "").trim();
              if (task && !summaryParts.includes(task)) {
                summaryParts.push(truncate(task, 30));
              }
              break;
            }
          }
        }
      }
    }

    const content_summary = summaryParts.length > 0
      ? summaryParts.map((s, i) => `§${String(i + 1).padStart(2, "0")} ${s}`).join(" / ")
      : "(内容摘要需手动补充)";

    return {
      file: fileName,
      sessions,
      content: truncate(content_summary, 120),
      agent,
    };
  } catch (err) {
    if (VERBOSE) console.log(`   ⚠️  解析失败: ${fileName} — ${err.message}`);
    return null;
  }
}

// ============================================
// TASK-INDEX 生成
// ============================================

/**
 * 读取现有 TASK-INDEX.md，提取手动维护的条目
 */
function parseExistingTaskIndex() {
  const existing = {
    header: "",
    sections: {},
    footer: "",
    raw: "",
  };

  if (!fs.existsSync(TASK_INDEX_PATH)) {
    return existing;
  }

  existing.raw = fs.readFileSync(TASK_INDEX_PATH, "utf-8");
  return existing;
}

/**
 * 生成记忆文件表格段落
 */
function generateMemorySection(memoryEntries) {
  if (memoryEntries.length === 0) return "";

  // 按 agent 分组
  const byAgent = {};
  for (const entry of memoryEntries) {
    if (!byAgent[entry.agent]) byAgent[entry.agent] = [];
    byAgent[entry.agent].push(entry);
  }

  let section = `### 按记忆文件查找（v1.7 每日一文件格式）\n\n`;
  section += `> **说明**: v2.10.0 起记忆文件改为每天一个文件（\`YYYYMMDD.md\`），会话内以 \`## 会话 NN\` 分段。\n\n`;

  for (const [agent, entries] of Object.entries(byAgent)) {
    section += `**Agent: \`${agent}\`**\n\n`;
    section += `| 日期文件 | 会话数 | 涵盖内容 |\n`;
    section += `|---------|:------:|--------|\n`;

    for (const entry of entries) {
      section += `| \`${entry.file}\` | ${entry.sessions} | ${entry.content} |\n`;
    }

    section += `\n`;
  }

  section += `> 记忆文件存放于 \`.ai-memory/clients/<agent>/tasks/\` 目录下\n`;

  return section;
}

/**
 * 生成版本发布记录表格
 */
function generateVersionSection(versionEntries) {
  if (versionEntries.length === 0) return "";

  let section = `## 📦 版本发布记录\n\n`;
  section += `| 版本 | 日期 | 主题 | 变更日志 |\n`;
  section += `|------|------|------|--------|\n`;

  // 按版本号倒序
  const sorted = [...versionEntries].reverse();
  for (const entry of sorted) {
    section += `| ${entry.version} | ${entry.date} | ${entry.theme} | \`${entry.path}\` |\n`;
  }

  return section;
}

/**
 * 生成报告条目表格（按类型分组）
 */
function generateReportsSection(reportEntries) {
  if (reportEntries.length === 0) return "";

  // 按 type 分组
  const byType = {};
  for (const entry of reportEntries) {
    if (!byType[entry.type]) byType[entry.type] = [];
    byType[entry.type].push(entry);
  }

  let section = "";

  const typeConfig = {
    analysis: { heading: "## 🔬 深度分析", prefix: "ANA" },
    bugs: { heading: "## 🐛 Bug 修复（自动扫描）", prefix: "BUG-RPT" },
    optimizations: { heading: "## ⚡ 性能优化（自动扫描）", prefix: "OPT-RPT" },
  };

  for (const [type, entries] of Object.entries(byType)) {
    const config = typeConfig[type] || {
      heading: `## 📋 ${type}（自动扫描）`,
      prefix: type.toUpperCase().substring(0, 3),
    };

    section += `${config.heading}\n\n`;
    section += `| ID | 日期 | 标题 | 状态 | 路径 |\n`;
    section += `|----|------|------|------|------|\n`;

    // 分配 ID
    entries.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.nn - b.nn;
    });

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const id = `${config.prefix}-${String(i + 1).padStart(3, "0")}`;
      section += `| ${id} | ${entry.date} | ${entry.title} | ${entry.status} | \`${entry.path}\` |\n`;
    }

    section += `\n`;
  }

  return section;
}

/**
 * 生成完整的 TASK-INDEX.md 内容
 * 策略: 如果已有文件，保留其内容，仅在末尾追加/更新自动生成的部分
 */
function generateTaskIndex(existing, reports, changelogs, memory) {
  const autoGenMarker = "<!-- AUTO-GENERATED BELOW — DO NOT EDIT MANUALLY -->";
  const autoGenEndMarker = "<!-- END AUTO-GENERATED -->";

  const today = new Date().toISOString().split("T")[0];

  let content;

  if (existing.raw) {
    // 已有文件: 检查是否有自动生成标记
    const markerIndex = existing.raw.indexOf(autoGenMarker);

    if (markerIndex !== -1) {
      // 保留标记之前的手动内容
      content = existing.raw.substring(0, markerIndex).trimEnd();
    } else {
      // 没有标记: 保留整个文件，在末尾追加
      content = existing.raw.trimEnd();
    }

    // 更新"最后更新"日期
    content = content.replace(
      /(\*\*最后更新\*\*:\s*)\d{4}-\d{2}-\d{2}/,
      `$1${today}`
    );
  } else {
    // 全新文件
    content = `# 任务索引

> **用途**: 追溯 ${projectName} 项目的所有历史任务
> **更新时机**: 运行 \`node tools/update-task-index.js ${projectName}\` 自动更新
> **最后更新**: ${today}

---

## ⚠️ 自动维护说明

本文件由 \`tools/update-task-index.js\` 自动维护。

- **手动内容**: \`${autoGenMarker}\` 标记**之上**的内容可以手动编辑
- **自动内容**: 标记**之下**的内容由脚本自动生成，每次运行会覆盖
- **更新频率**: 版本发布时运行一次即可，无需每次会话都更新`;
  }

  // 追加自动生成部分
  content += `\n\n---\n\n`;
  content += `${autoGenMarker}\n\n`;
  content += `> 以下内容由 \`node tools/update-task-index.js ${projectName}\` 自动生成于 ${today}\n\n`;

  // 报告条目
  const reportsSection = generateReportsSection(reports);
  if (reportsSection) {
    content += reportsSection + "\n---\n\n";
  }

  // 版本发布记录
  const versionsSection = generateVersionSection(changelogs);
  if (versionsSection) {
    content += versionsSection + "\n---\n\n";
  }

  // 记忆文件索引
  content += `## 🔍 快速检索\n\n`;
  const memorySection = generateMemorySection(memory);
  if (memorySection) {
    content += memorySection;
  }

  content += `\n\n${autoGenEndMarker}\n\n`;
  content += `---\n\n**维护者**: AI 规范团队\n`;

  return content;
}

// ============================================
// 工具函数
// ============================================

function truncate(str, maxLen) {
  if (!str) return "";
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + "...";
}

function mapTypeToPrefix(type) {
  const map = {
    analysis: "ANA",
    bugs: "BUG-RPT",
    optimizations: "OPT-RPT",
    requirements: "REQ-RPT",
  };
  return map[type] || type.toUpperCase().substring(0, 3);
}

// ============================================
// 主函数
// ============================================

function main() {
  console.log("═".repeat(60));
  console.log("📊 update-task-index.js — TASK-INDEX 自动更新");
  console.log("═".repeat(60));
  console.log(`   项目: ${projectName}`);
  console.log(`   模式: ${DRY_RUN ? "🔵 预览 (--dry-run)" : "🟢 写入"}`);
  console.log();

  // 检查项目目录
  if (!fs.existsSync(PROJECT_DIR)) {
    console.error(`❌ 项目目录不存在: projects/${projectName}/`);
    process.exit(1);
  }

  // 1. 扫描
  console.log("─".repeat(60));
  console.log("🔍 扫描文件");
  console.log("─".repeat(60));

  const reports = scanReports();
  const changelogs = scanChangelogs();
  const memory = scanMemory();

  console.log(`   📊 报告:    ${reports.length} 个`);
  console.log(`   📦 版本:    ${changelogs.length} 个`);
  console.log(`   🧠 记忆:    ${memory.length} 个文件`);

  // 2. 读取现有 TASK-INDEX
  console.log();
  console.log("─".repeat(60));
  console.log("📄 生成 TASK-INDEX");
  console.log("─".repeat(60));

  const existing = parseExistingTaskIndex();
  if (existing.raw) {
    console.log(`   📄 已有 TASK-INDEX.md（${existing.raw.split("\n").length} 行）`);
  } else {
    console.log("   📄 TASK-INDEX.md 不存在，将创建新文件");
  }

  // 3. 生成内容
  const newContent = generateTaskIndex(existing, reports, changelogs, memory);
  const newLineCount = newContent.split("\n").length;

  console.log(`   📝 生成内容: ${newLineCount} 行`);

  if (newLineCount > 500) {
    console.log(`   ⚠️  警告: 生成内容超过 500 行（约束 #20），考虑精简`);
  }

  // 4. 写入或预览
  if (DRY_RUN) {
    console.log();
    console.log("─".repeat(60));
    console.log("📋 预览（前 50 行）");
    console.log("─".repeat(60));
    const previewLines = newContent.split("\n").slice(0, 50);
    for (const line of previewLines) {
      console.log(`   ${line}`);
    }
    if (newLineCount > 50) {
      console.log(`   ... (省略 ${newLineCount - 50} 行)`);
    }
  } else {
    fs.writeFileSync(TASK_INDEX_PATH, newContent, "utf-8");
    console.log(`   ✅ 已写入: projects/${projectName}/TASK-INDEX.md`);
  }

  // 5. 摘要
  console.log();
  console.log("═".repeat(60));
  console.log("📊 摘要");
  console.log("═".repeat(60));
  console.log(`   报告条目:   ${reports.length}`);
  console.log(`   版本条目:   ${changelogs.length}`);
  console.log(`   记忆文件:   ${memory.length}`);
  console.log(`   总行数:     ${newLineCount}`);
  console.log(`   状态:       ${DRY_RUN ? "🔵 预览模式（未写入）" : "✅ 已写入"}`);

  if (DRY_RUN) {
    console.log();
    console.log("   💡 提示: 运行不带 --dry-run 以实际写入文件");
  }

  console.log();
  console.log("═".repeat(60));
}

main();
