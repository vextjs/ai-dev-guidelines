/**
 * validate-links.js
 * 验证 Markdown 文件中的内部链接是否有效
 *
 * 使用方法:
 *   node tools/validate-links.js
 *   node tools/validate-links.js --fix       # 显示建议修复
 *   node tools/validate-links.js --strict    # 忽略 .linksignore，所有断链都报错
 *
 * 功能:
 *   - 检测所有 .md 文件中的相对链接
 *   - 验证链接目标是否存在
 *   - 支持 .linksignore 文件过滤模板占位符/已知无害断链
 *   - 分类输出：真实断链 vs 已忽略断链
 *   - 仅对真实断链返回非零退出码（CI 友好）
 *   - 报告断链和建议修复
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "..");
const IGNORED_DIRS = ["node_modules", ".git", "coverage", "dist"];
const LINKSIGNORE_PATH = path.join(ROOT_DIR, ".linksignore");

// 颜色输出
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  dim: (text) => `\x1b[2m${text}\x1b[0m`,
  magenta: (text) => `\x1b[35m${text}\x1b[0m`,
};

// 加载 .linksignore 忽略模式
function loadLinksIgnore() {
  if (!fs.existsSync(LINKSIGNORE_PATH)) {
    return [];
  }

  const content = fs.readFileSync(LINKSIGNORE_PATH, "utf-8");
  const patterns = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    // 跳过空行和注释
    if (!line || line.startsWith("#")) continue;
    patterns.push(line);
  }

  return patterns;
}

// 将 .linksignore 中的 glob 模式转为正则表达式
function globToRegex(pattern) {
  // 转义正则特殊字符（保留 * 和 ?）
  let escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  // ** 匹配任意路径段
  escaped = escaped.replace(/\*\*/g, "{{DOUBLESTAR}}");
  // * 匹配除路径分隔符外的任意字符
  escaped = escaped.replace(/\*/g, "[^/]*");
  // 还原 **
  escaped = escaped.replace(/\{\{DOUBLESTAR\}\}/g, ".*");
  // ? 匹配单个字符
  escaped = escaped.replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`);
}

// 检查断链是否匹配 .linksignore 模式
function isIgnored(sourceFile, linkUrl, ignorePatterns) {
  if (ignorePatterns.length === 0) return false;

  // 归一化路径分隔符
  const normalizedSource = sourceFile.replace(/\\/g, "/");
  const normalizedLink = linkUrl.replace(/\\/g, "/");
  // 组合 "source -> link" 格式，用于精确匹配
  const combined = `${normalizedSource}:${normalizedLink}`;

  for (const pattern of ignorePatterns) {
    const regex = globToRegex(pattern);

    // 模式匹配：链接路径、源文件路径、或 source:link 组合
    if (
      regex.test(normalizedLink) ||
      regex.test(normalizedSource) ||
      regex.test(combined)
    ) {
      return true;
    }
  }

  return false;
}

// 获取所有 Markdown 文件
function getAllMarkdownFiles(dir, files = []) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      if (!IGNORED_DIRS.includes(item)) {
        getAllMarkdownFiles(fullPath, files);
      }
    } else if (item.endsWith(".md")) {
      files.push(fullPath);
    }
  }

  return files;
}

// 提取 Markdown 文件中的链接
function extractLinks(content, filePath) {
  const links = [];

  // 匹配 [text](url) 格式
  const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    const url = match[2];

    // 跳过外部链接和锚点链接
    if (
      url.startsWith("http://") ||
      url.startsWith("https://") ||
      url.startsWith("#")
    ) {
      continue;
    }

    // 移除锚点部分
    const cleanUrl = url.split("#")[0];
    if (!cleanUrl) continue;

    links.push({
      text: match[1],
      url: cleanUrl,
      fullMatch: match[0],
      position: match.index,
    });
  }

  return links;
}

// 验证链接是否存在
function validateLink(linkUrl, sourceFile) {
  const sourceDir = path.dirname(sourceFile);
  const targetPath = path.resolve(sourceDir, linkUrl);

  // 检查文件或目录是否存在
  if (fs.existsSync(targetPath)) {
    return { valid: true, resolvedPath: targetPath };
  }

  // 如果链接没有扩展名，尝试添加 .md
  if (!path.extname(linkUrl)) {
    const withMd = targetPath + ".md";
    if (fs.existsSync(withMd)) {
      return { valid: true, resolvedPath: withMd, suggestion: linkUrl + ".md" };
    }
  }

  return { valid: false, resolvedPath: targetPath };
}

// 按文件分组并输出断链列表
function printGroupedIssues(issues, icon, labelColor) {
  const grouped = {};
  for (const issue of issues) {
    if (!grouped[issue.file]) {
      grouped[issue.file] = [];
    }
    grouped[issue.file].push(issue);
  }

  for (const [file, fileIssues] of Object.entries(grouped)) {
    console.log(colors.yellow(`📄 ${file}`));
    for (const issue of fileIssues) {
      const label = issue.reason ? ` ${colors.dim(`(${issue.reason})`)}` : "";
      console.log(`   ${icon} [${issue.text}](${issue.link})${label}`);
    }
    console.log("");
  }
}

// 主函数
function main() {
  const showFix = process.argv.includes("--fix");
  const strictMode = process.argv.includes("--strict");

  console.log(colors.cyan("🔍 开始验证 Markdown 链接...\n"));

  // 加载 .linksignore
  const ignorePatterns = strictMode ? [] : loadLinksIgnore();
  if (ignorePatterns.length > 0) {
    console.log(
      colors.dim(
        `📋 已加载 .linksignore（${ignorePatterns.length} 条忽略模式）\n`,
      ),
    );
  } else if (!strictMode && !fs.existsSync(LINKSIGNORE_PATH)) {
    console.log(
      colors.dim("💡 提示: 可创建 .linksignore 文件过滤模板占位链接\n"),
    );
  } else if (strictMode) {
    console.log(
      colors.magenta("🔒 严格模式: 忽略 .linksignore，所有断链都报错\n"),
    );
  }

  const mdFiles = getAllMarkdownFiles(ROOT_DIR);
  console.log(`📁 找到 ${mdFiles.length} 个 Markdown 文件\n`);

  let totalLinks = 0;
  const realIssues = []; // 真实断链（需修复）
  const ignoredIssues = []; // 已忽略断链（模板/占位符）

  for (const file of mdFiles) {
    const relativePath = path.relative(ROOT_DIR, file);
    const content = fs.readFileSync(file, "utf-8");
    const links = extractLinks(content, file);

    for (const link of links) {
      totalLinks++;
      const result = validateLink(link.url, file);

      if (!result.valid) {
        const issue = {
          file: relativePath,
          link: link.url,
          text: link.text,
        };

        if (isIgnored(relativePath, link.url, ignorePatterns)) {
          issue.reason = "linksignore";
          ignoredIssues.push(issue);
        } else {
          realIssues.push(issue);
        }
      }
    }
  }

  const totalBroken = realIssues.length + ignoredIssues.length;

  // 输出结果
  console.log(colors.cyan("📊 验证结果:\n"));
  console.log(`   总链接数:   ${totalLinks}`);
  console.log(`   有效链接:   ${colors.green(totalLinks - totalBroken)}`);
  console.log(
    `   真实断链:   ${realIssues.length > 0 ? colors.red(realIssues.length) : colors.green(0)}`,
  );
  console.log(
    `   已忽略断链: ${ignoredIssues.length > 0 ? colors.dim(ignoredIssues.length) : colors.green(0)}`,
  );
  console.log("");

  // 真实断链
  if (realIssues.length > 0) {
    console.log(
      colors.red(`❌ 真实断链（${realIssues.length} 条，需修复）:\n`),
    );
    printGroupedIssues(realIssues, "❌");
  }

  // 已忽略断链
  if (ignoredIssues.length > 0) {
    console.log(
      colors.dim(
        `⏭️  已忽略断链（${ignoredIssues.length} 条，匹配 .linksignore）:\n`,
      ),
    );
    printGroupedIssues(ignoredIssues, "⏭️");
  }

  // 退出码：仅真实断链导致非零退出
  if (realIssues.length > 0) {
    console.log(
      colors.red(`\n💥 发现 ${realIssues.length} 条真实断链，退出码 1\n`),
    );
    process.exit(1);
  } else {
    if (ignoredIssues.length > 0) {
      console.log(
        colors.green(`✅ 无真实断链（${ignoredIssues.length} 条已忽略）\n`),
      );
    } else {
      console.log(colors.green("✅ 所有链接验证通过!\n"));
    }
    process.exit(0);
  }
}

main();
