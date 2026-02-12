#!/usr/bin/env node
/**
 * 规范健康检查工具
 * 执行 spec-self-fix 定义的所有检测
 *
 * 用法: node spec-health-check.js [选项]
 * 选项:
 *   --fix     自动修复安全问题
 *   --report  生成详细报告
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const AUTO_FIX = args.includes('--fix');
const GENERATE_REPORT = args.includes('--report');

// 检查结果
const results = {
  timestamp: new Date().toISOString(),
  summary: {
    total: 0,
    passed: 0,
    warnings: 0,
    errors: 0
  },
  checks: {
    versionConsistency: { status: 'pending', issues: [] },
    linkValidity: { status: 'pending', issues: [] },
    completeness: { status: 'pending', issues: [] },
    redundancy: { status: 'pending', issues: [] }
  },
  autoFixes: []
};

/**
 * 1. 版本一致性检测
 */
function checkVersionConsistency() {
  console.log('\n🔍 检测版本一致性...');

  const versionFiles = ['README.md', 'STATUS.md', 'QUICK-REFERENCE.md'];
  const versions = [];

  for (const file of versionFiles) {
    const filePath = path.join(ROOT_DIR, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const match = content.match(/版本[：:]\s*v?([\d.]+)/i) ||
                    content.match(/\*\*版本\*\*[：:]\s*v?([\d.]+)/i);
      if (match) {
        versions.push({ file, version: match[1] });
      }
    }
  }

  // 检查 decision-tree.yaml
  const dtPath = path.join(ROOT_DIR, 'workflows', 'decision-tree.yaml');
  if (fs.existsSync(dtPath)) {
    const content = fs.readFileSync(dtPath, 'utf-8');
    const match = content.match(/version:\s*["']?([\d.]+)["']?/);
    if (match) {
      versions.push({ file: 'workflows/decision-tree.yaml', version: match[1] });
    }
  }

  if (versions.length > 0) {
    const mainVersion = versions[0].version;
    const inconsistent = versions.filter(v => v.version !== mainVersion);

    if (inconsistent.length > 0) {
      results.checks.versionConsistency.status = 'warning';
      results.checks.versionConsistency.issues = inconsistent.map(v => ({
        file: v.file,
        expected: mainVersion,
        actual: v.version
      }));
      console.log(`   ⚠️ 发现 ${inconsistent.length} 个版本不一致`);
    } else {
      results.checks.versionConsistency.status = 'passed';
      console.log(`   ✅ 版本一致 (${mainVersion})`);
    }
  }

  results.summary.total++;
  if (results.checks.versionConsistency.status === 'passed') {
    results.summary.passed++;
  } else {
    results.summary.warnings++;
  }
}

/**
 * 2. 链接有效性检测
 */
function checkLinkValidity() {
  console.log('\n🔍 检测链接有效性...');

  const mdFiles = getAllMarkdownFiles(ROOT_DIR);
  const brokenLinks = [];

  for (const file of mdFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const linkRegex = /\[([^\]]*)\]\(([^)]+)\)/g;
    let match;

    while ((match = linkRegex.exec(content)) !== null) {
      const linkPath = match[2];

      // 跳过外部链接和锚点
      if (linkPath.startsWith('http') || linkPath.startsWith('#')) continue;

      // 解析相对路径
      const basePath = path.dirname(file);
      const targetPath = path.resolve(basePath, linkPath.split('#')[0]);

      if (!fs.existsSync(targetPath)) {
        brokenLinks.push({
          file: path.relative(ROOT_DIR, file),
          link: linkPath,
          text: match[1]
        });
      }
    }
  }

  if (brokenLinks.length > 0) {
    results.checks.linkValidity.status = 'error';
    results.checks.linkValidity.issues = brokenLinks;
    console.log(`   ❌ 发现 ${brokenLinks.length} 个断链`);
  } else {
    results.checks.linkValidity.status = 'passed';
    console.log('   ✅ 所有链接有效');
  }

  results.summary.total++;
  if (results.checks.linkValidity.status === 'passed') {
    results.summary.passed++;
  } else {
    results.summary.errors++;
  }
}

/**
 * 3. 完整性检测
 */
function checkCompleteness() {
  console.log('\n🔍 检测文档完整性...');

  const issues = [];

  // 检查必要文件
  const requiredFiles = [
    'README.md',
    'QUICK-REFERENCE.md',
    'STATUS.md',
    'CHANGELOG.md',
    'CONSTRAINTS.md'
  ];

  for (const file of requiredFiles) {
    if (!fs.existsSync(path.join(ROOT_DIR, file))) {
      issues.push({ type: 'missing_file', file });
    }
  }

  // 检查目录是否有 README
  const directories = [
    'workflows',
    'templates',
    'standards',
    'best-practices',
    'projects',
    'examples',
    'tools'
  ];

  for (const dir of directories) {
    const readmePath = path.join(ROOT_DIR, dir, 'README.md');
    if (fs.existsSync(path.join(ROOT_DIR, dir)) && !fs.existsSync(readmePath)) {
      issues.push({ type: 'missing_readme', directory: dir });
    }
  }

  if (issues.length > 0) {
    results.checks.completeness.status = 'warning';
    results.checks.completeness.issues = issues;
    console.log(`   ⚠️ 发现 ${issues.length} 个完整性问题`);
  } else {
    results.checks.completeness.status = 'passed';
    console.log('   ✅ 文档完整');
  }

  results.summary.total++;
  if (results.checks.completeness.status === 'passed') {
    results.summary.passed++;
  } else {
    results.summary.warnings++;
  }
}

/**
 * 4. 冗余检测（简化版）
 */
function checkRedundancy() {
  console.log('\n🔍 检测内容冗余...');

  // 简化版：只检测文件大小异常
  const mdFiles = getAllMarkdownFiles(ROOT_DIR);
  const largeFiles = [];

  for (const file of mdFiles) {
    const stats = fs.statSync(file);
    if (stats.size > 50000) { // 超过 50KB
      largeFiles.push({
        file: path.relative(ROOT_DIR, file),
        size: Math.round(stats.size / 1024) + 'KB'
      });
    }
  }

  if (largeFiles.length > 0) {
    results.checks.redundancy.status = 'warning';
    results.checks.redundancy.issues = largeFiles;
    console.log(`   ⚠️ 发现 ${largeFiles.length} 个大文件（可能有冗余）`);
  } else {
    results.checks.redundancy.status = 'passed';
    console.log('   ✅ 无明显冗余');
  }

  results.summary.total++;
  if (results.checks.redundancy.status === 'passed') {
    results.summary.passed++;
  } else {
    results.summary.warnings++;
  }
}

/**
 * 获取所有 Markdown 文件
 */
function getAllMarkdownFiles(dir, files = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    // 跳过
    if (item.name.startsWith('.') ||
        item.name === 'node_modules' ||
        item.name === 'reports') continue;

    if (item.isDirectory()) {
      getAllMarkdownFiles(fullPath, files);
    } else if (item.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * 生成报告
 */
function generateReport() {
  const reportPath = path.join(ROOT_DIR, 'reports', `SPEC-HEALTH-CHECK-${new Date().toISOString().split('T')[0]}.md`);

  let report = `# 规范健康检查报告

> **检查时间**: ${results.timestamp}  
> **检查结果**: ${results.summary.passed}/${results.summary.total} 通过

---

## 📊 摘要

| 指标 | 数值 |
|-----|------|
| 总检查项 | ${results.summary.total} |
| 通过 | ${results.summary.passed} |
| 警告 | ${results.summary.warnings} |
| 错误 | ${results.summary.errors} |

---

## 📋 检查详情

`;

  // 添加每项检查的详情
  for (const [name, check] of Object.entries(results.checks)) {
    const statusIcon = check.status === 'passed' ? '✅' :
                       check.status === 'warning' ? '⚠️' : '❌';

    report += `### ${statusIcon} ${name}\n\n`;

    if (check.issues.length > 0) {
      report += '| 问题 | 详情 |\n|-----|------|\n';
      for (const issue of check.issues) {
        report += `| ${issue.file || issue.type} | ${JSON.stringify(issue)} |\n`;
      }
    } else {
      report += '无问题\n';
    }

    report += '\n---\n\n';
  }

  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 报告已生成: ${path.relative(ROOT_DIR, reportPath)}`);
}

/**
 * 主函数
 */
function main() {
  console.log('═'.repeat(50));
  console.log('🏥 规范健康检查');
  console.log('═'.repeat(50));

  // 执行检查
  checkVersionConsistency();
  checkLinkValidity();
  checkCompleteness();
  checkRedundancy();

  // 输出摘要
  console.log('\n' + '═'.repeat(50));
  console.log('📊 检查摘要');
  console.log('═'.repeat(50));
  console.log(`   总检查项: ${results.summary.total}`);
  console.log(`   ✅ 通过: ${results.summary.passed}`);
  console.log(`   ⚠️ 警告: ${results.summary.warnings}`);
  console.log(`   ❌ 错误: ${results.summary.errors}`);

  // 生成报告
  if (GENERATE_REPORT) {
    generateReport();
  }

  // 自动修复提示
  if (AUTO_FIX && (results.summary.warnings > 0 || results.summary.errors > 0)) {
    console.log('\n💡 提示: 运行 node tools/spec-auto-fix.js 执行自动修复');
  }

  console.log('\n' + '═'.repeat(50));

  // 退出码
  process.exit(results.summary.errors > 0 ? 1 : 0);
}

main();

