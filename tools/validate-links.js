/**
 * validate-links.js
 * 验证 Markdown 文件中的内部链接是否有效
 *
 * 使用方法:
 *   node tools/validate-links.js
 *   node tools/validate-links.js --fix  # 显示建议修复
 *
 * 功能:
 *   - 检测所有 .md 文件中的相对链接
 *   - 验证链接目标是否存在
 *   - 报告断链和建议修复
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const IGNORED_DIRS = ['node_modules', '.git', 'coverage', 'dist'];

// 颜色输出
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

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
    } else if (item.endsWith('.md')) {
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
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('#')) {
      continue;
    }

    // 移除锚点部分
    const cleanUrl = url.split('#')[0];
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
    const withMd = targetPath + '.md';
    if (fs.existsSync(withMd)) {
      return { valid: true, resolvedPath: withMd, suggestion: linkUrl + '.md' };
    }
  }

  return { valid: false, resolvedPath: targetPath };
}

// 主函数
function main() {
  const showFix = process.argv.includes('--fix');

  console.log(colors.cyan('🔍 开始验证 Markdown 链接...\n'));

  const mdFiles = getAllMarkdownFiles(ROOT_DIR);
  console.log(`📁 找到 ${mdFiles.length} 个 Markdown 文件\n`);

  let totalLinks = 0;
  let brokenLinks = 0;
  const issues = [];

  for (const file of mdFiles) {
    const relativePath = path.relative(ROOT_DIR, file);
    const content = fs.readFileSync(file, 'utf-8');
    const links = extractLinks(content, file);

    for (const link of links) {
      totalLinks++;
      const result = validateLink(link.url, file);

      if (!result.valid) {
        brokenLinks++;
        issues.push({
          file: relativePath,
          link: link.url,
          text: link.text,
        });
      }
    }
  }

  // 输出结果
  console.log(colors.cyan('📊 验证结果:\n'));
  console.log(`   总链接数: ${totalLinks}`);
  console.log(`   有效链接: ${colors.green(totalLinks - brokenLinks)}`);
  console.log(`   断开链接: ${brokenLinks > 0 ? colors.red(brokenLinks) : colors.green(0)}`);
  console.log('');

  if (issues.length > 0) {
    console.log(colors.red('❌ 发现以下断链:\n'));

    // 按文件分组
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
        console.log(`   ❌ [${issue.text}](${issue.link})`);
      }
      console.log('');
    }

    process.exit(1);
  } else {
    console.log(colors.green('✅ 所有链接验证通过!\n'));
    process.exit(0);
  }
}

main();

