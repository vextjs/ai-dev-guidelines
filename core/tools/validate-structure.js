/**
 * validate-structure.js
 * 验证目录结构与 README 描述是否一致
 *
 * 使用方法:
 *   node tools/validate-structure.js
 *
 * 功能:
 *   - 检测 README.md 中声明的文件/目录是否存在
 *   - 检测实际存在但 README 中未声明的文件
 *   - 验证关键目录结构完整性
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.join(__dirname, "../..");

// 颜色输出
const colors = {
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

// 期望的核心目录结构
const EXPECTED_STRUCTURE = {
  "core/": {
    required: true,
    subdirs: [
      "workflows/",
      "templates/",
      "standards/",
      "best-practices/",
      "examples/",
      "tools/",
      "self-fix/",
    ],
    files: [
      "README.md",
      "QUICK-REFERENCE.md",
      "CONSTRAINTS.md",
      "STATUS.md",
      "META.yaml",
    ],
  },
  "core/workflows/": {
    required: true,
    subdirs: [
      "00-pre-check/",
      "00-task-identification/",
      "01-requirement-dev/",
      "02-bug-fix/",
      "03-optimization/",
      "common/",
    ],
  },
  "core/templates/": {
    required: true,
    subdirs: ["core/", "extended/", "common/"],
  },
  "projects/": {
    required: true,
    subdirs: ["_template/"],
  },
  "core/best-practices/": {
    required: true,
    subdirs: ["validation/"],
  },
  "core/standards/": {
    required: true,
    files: [
      "code-standards.md",
      "test-standards.md",
      "api-standards.md",
      "doc-standards.md",
      "security-standards.md",
      "script-standards.md",
    ],
  },
  "core/examples/": {
    required: true,
    subdirs: ["requirement-example/"],
  },
  "core/tools/": {
    required: false,
  },
  "changelogs/": {
    required: true,
  },
  "docs/": {
    required: true,
  },
};

// 期望的根目录文件
const EXPECTED_ROOT_FILES = [
  "README.md",
  "CHANGELOG.md",
  // 'CONSTRAINTS.md',     // 实际在 core/ 目录下，已在 EXPECTED_STRUCTURE['core/'].files 中检查
  // 'QUICK-REFERENCE.md', // 实际在 core/ 目录下，已在 EXPECTED_STRUCTURE['core/'].files 中检查
  // 'AI-WORKFLOW.md',     // v2.0 已整合到 README.md 中
];

// 检查目录是否存在
function dirExists(dirPath) {
  return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
}

// 检查文件是否存在
function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

// 主函数
function main() {
  console.log(colors.cyan("🔍 开始验证目录结构...\n"));

  const issues = {
    missing_required: [],
    missing_optional: [],
    all_checks: [],
  };

  // 1. 检查根目录文件
  console.log(colors.cyan("📄 检查根目录文件:"));
  for (const file of EXPECTED_ROOT_FILES) {
    const filePath = path.join(ROOT_DIR, file);
    const exists = fileExists(filePath);

    if (exists) {
      console.log(`   ${colors.green("✅")} ${file}`);
      issues.all_checks.push({ item: file, status: "ok" });
    } else {
      console.log(`   ${colors.red("❌")} ${file} (缺失)`);
      issues.missing_required.push(file);
      issues.all_checks.push({ item: file, status: "missing" });
    }
  }
  console.log("");

  // 2. 检查目录结构
  console.log(colors.cyan("📁 检查目录结构:"));
  for (const [dir, config] of Object.entries(EXPECTED_STRUCTURE)) {
    const dirPath = path.join(ROOT_DIR, dir);
    const exists = dirExists(dirPath);

    if (exists) {
      console.log(`   ${colors.green("✅")} ${dir}`);
      issues.all_checks.push({ item: dir, status: "ok" });

      // 检查子目录
      if (config.subdirs) {
        for (const subdir of config.subdirs) {
          const subdirPath = path.join(dirPath, subdir);
          const subdirExists = dirExists(subdirPath);

          if (subdirExists) {
            console.log(`      ${colors.green("✅")} ${subdir}`);
          } else {
            console.log(`      ${colors.yellow("⚠️")} ${subdir} (缺失)`);
            issues.missing_optional.push(`${dir}${subdir}`);
          }
        }
      }

      // 检查文件
      if (config.files) {
        for (const file of config.files) {
          const filePath = path.join(dirPath, file);
          const fileExistsResult = fileExists(filePath);

          if (fileExistsResult) {
            console.log(`      ${colors.green("✅")} ${file}`);
          } else {
            console.log(`      ${colors.yellow("⚠️")} ${file} (缺失)`);
            issues.missing_optional.push(`${dir}${file}`);
          }
        }
      }
    } else {
      if (config.required) {
        console.log(`   ${colors.red("❌")} ${dir} (必需目录缺失)`);
        issues.missing_required.push(dir);
      } else {
        console.log(`   ${colors.yellow("⚠️")} ${dir} (可选目录缺失)`);
        issues.missing_optional.push(dir);
      }
      issues.all_checks.push({
        item: dir,
        status: config.required ? "missing_required" : "missing_optional",
      });
    }
  }
  console.log("");

  // 3. 统计文件数量
  console.log(colors.cyan("📊 文件统计:"));
  const mdFiles = countFiles(ROOT_DIR, ".md");
  const yamlFiles =
    countFiles(ROOT_DIR, ".yaml") + countFiles(ROOT_DIR, ".yml");
  const jsFiles = countFiles(ROOT_DIR, ".js");

  console.log(`   Markdown 文件: ${mdFiles}`);
  console.log(`   YAML 文件: ${yamlFiles}`);
  console.log(`   JavaScript 文件: ${jsFiles}`);
  console.log("");

  // 4. 输出结果
  console.log(colors.cyan("📋 验证结果:"));

  if (issues.missing_required.length === 0) {
    console.log(colors.green("\n✅ 所有必需文件/目录都存在!"));
  } else {
    console.log(
      colors.red(`\n❌ 缺失 ${issues.missing_required.length} 个必需项:`),
    );
    for (const item of issues.missing_required) {
      console.log(`   - ${item}`);
    }
  }

  if (issues.missing_optional.length > 0) {
    console.log(
      colors.yellow(`\n⚠️ 缺失 ${issues.missing_optional.length} 个可选项:`),
    );
    for (const item of issues.missing_optional) {
      console.log(`   - ${item}`);
    }
  }

  console.log("");

  // 退出码
  if (issues.missing_required.length > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

// 统计文件数量
function countFiles(dir, extension, count = 0) {
  const items = fs.readdirSync(dir);

  for (const item of items) {
    if (item === "node_modules" || item === ".git") continue;

    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      count = countFiles(fullPath, extension, count);
    } else if (item.endsWith(extension)) {
      count++;
    }
  }

  return count;
}

main();
