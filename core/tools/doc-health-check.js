#!/usr/bin/env node
/**
 * 文档健康检查工具
 * 检查 ai-dev-guidelines 项目的文档完整性和一致性
 *
 * 用法: node doc-health-check.js [目录]
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = process.argv[2] || '.';

// 检查结果
const results = {
  errors: [],
  warnings: [],
  info: []
};

/**
 * 检查 README.md 是否存在
 */
function checkReadmeExists(dir) {
  const readmePath = path.join(dir, 'README.md');
  if (!fs.existsSync(readmePath)) {
    results.warnings.push(`缺少 README.md: ${dir}`);
    return false;
  }
  return true;
}

/**
 * 检查 Markdown 文件内容
 */
function checkMarkdownContent(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const fileName = path.basename(filePath);

  // 检查是否有标题
  if (!content.match(/^#\s+.+/m)) {
    results.warnings.push(`缺少标题: ${filePath}`);
  }

  // 检查是否有版本/更新日期
  if (fileName === 'README.md' && !content.includes('更新') && !content.includes('版本')) {
    results.info.push(`建议添加版本/更新信息: ${filePath}`);
  }

  // 检查空链接
  const emptyLinks = content.match(/\[([^\]]*)\]\(\s*\)/g);
  if (emptyLinks) {
    results.errors.push(`存在空链接: ${filePath}`);
  }
}

/**
 * 检查目录结构
 */
function checkDirectoryStructure(dir, depth = 0) {
  if (depth > 5) return; // 防止过深递归

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    // 跳过隐藏文件和 node_modules
    if (item.name.startsWith('.') || item.name === 'node_modules') continue;

    if (item.isDirectory()) {
      checkReadmeExists(fullPath);
      checkDirectoryStructure(fullPath, depth + 1);
    } else if (item.name.endsWith('.md')) {
      checkMarkdownContent(fullPath);
    }
  }
}

/**
 * 检查必要文件
 */
function checkRequiredFiles() {
  const requiredFiles = [
    'README.md',
    'QUICK-REFERENCE.md',
    'STATUS.md',
    'CHANGELOG.md',
    'CONSTRAINTS.md'
  ];

  for (const file of requiredFiles) {
    const filePath = path.join(ROOT_DIR, file);
    if (!fs.existsSync(filePath)) {
      results.errors.push(`缺少必要文件: ${file}`);
    }
  }
}

/**
 * 检查版本一致性
 */
function checkVersionConsistency() {
  const versionFiles = ['README.md', 'STATUS.md', 'QUICK-REFERENCE.md'];
  const versions = [];

  for (const file of versionFiles) {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const versionMatch = content.match(/版本[:\s]*v?(\d+\.\d+\.\d+)/);
      if (versionMatch) {
        versions.push({ file, version: versionMatch[1] });
      }
    }
  }

  if (versions.length > 1) {
    const firstVersion = versions[0].version;
    for (const v of versions) {
      if (v.version !== firstVersion) {
        results.warnings.push(`版本不一致: ${v.file} (${v.version}) vs ${versions[0].file} (${firstVersion})`);
      }
    }
  }
}

// 执行检查
console.log('🔍 开始文档健康检查...\n');

checkRequiredFiles();
checkVersionConsistency();
checkDirectoryStructure(ROOT_DIR);

// 输出结果
console.log('=' .repeat(50));
console.log('📊 检查结果\n');

if (results.errors.length > 0) {
  console.log('❌ 错误 (' + results.errors.length + '):');
  results.errors.forEach(e => console.log('   - ' + e));
  console.log();
}

if (results.warnings.length > 0) {
  console.log('⚠️ 警告 (' + results.warnings.length + '):');
  results.warnings.forEach(w => console.log('   - ' + w));
  console.log();
}

if (results.info.length > 0) {
  console.log('ℹ️ 建议 (' + results.info.length + '):');
  results.info.forEach(i => console.log('   - ' + i));
  console.log();
}

if (results.errors.length === 0 && results.warnings.length === 0) {
  console.log('✅ 所有检查通过！');
}

console.log('=' .repeat(50));

// 退出码
process.exit(results.errors.length > 0 ? 1 : 0);

