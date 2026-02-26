# Vext v3 — 文件监听器与变更分类

> **文档编号**: 11c-file-watcher.md  
> **状态**: 设计稿 v2.2  
> **最后更新**: 2026-02-28  
> **父文档**: [11-hot-reload.md](./11-hot-reload.md)  
> **关联文件**: `11d-bootstrap-cli.md`, `11b-soft-reload.md`

---

## 目录

- [1. 概述](#1-概述)
- [2. 变更分类器](#2-变更分类器)
- [3. VextFileWatcher 实现](#3-vextfilewatcher-实现)
- [4. Docker 兼容性](#4-docker-兼容性)
- [5. 自动检测容器环境](#5-自动检测容器环境)

---

## 1. 概述

文件监听器是热重载的入口组件，负责：

1. **监听** `src/` 目录和根目录配置文件的变更
2. **分类** 变更文件为 `cold`（冷重启）、`soft`（热替换）或 `ignore`（忽略）
3. **识别变更类型**（`modify` / `add` / `delete`）— 决定走 Tier 1 还是 Tier 2 编译路径
4. **防抖合并** 100ms 窗口内的多个变更为一次 reload 事件
5. **Docker 兼容** — inotify 不可用时自动降级为 polling

> **重要**: FileWatcher 监听的是 `src/` **源码目录**，不是 `.vext/dev/` 编译产物目录。
> 这避免了 esbuild 编译输出触发二次变更事件的问题。

---

## 2. 变更分类器

分类器的实现较轻量，从父文档 [11-hot-reload.md §3](./11-hot-reload.md#3-文件分类规则) 的分类表驱动：

```ts
// lib/dev/change-classifier.ts

export interface ChangeClassification {
  action: 'cold' | 'soft' | 'ignore';
  reason: string;
}

const COLD_PATTERNS = [
  /^src\/config\//,
  /^package\.json$/,
  /^\.env(\..*)?$/,
  /^src\/plugins\//,
  /^tsconfig\.json$/,
];

const IGNORE_PATTERNS = [
  /^node_modules\//,
  /^dist\//,
  /^build\//,
  /^\.vext\//,
  /^\.git\//,
  /^test(s)?\//,
  /\.(md|txt|log|lock)$/,
  /^plans\//,
  /^docs\//,
];

export function classifyChange(relativePath: string): ChangeClassification {
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(relativePath)) {
      return { action: 'ignore', reason: `matched ignore pattern: ${pattern}` };
    }
  }

  for (const pattern of COLD_PATTERNS) {
    if (pattern.test(relativePath)) {
      return { action: 'cold', reason: `config/plugin change: ${pattern}` };
    }
  }

  // 默认：src/ 下的 .ts/.js/.mjs 文件走 soft reload
  if (/^src\/.*\.(ts|js|mjs|cjs)$/.test(relativePath)) {
    return { action: 'soft', reason: 'source code change' };
  }

  return { action: 'ignore', reason: 'unrecognized file type' };
}
```

### 2.1 用户自定义分类

用户可在 `config/default.ts` 的 `dev` 字段中覆盖默认分类：

```ts
// src/config/default.ts
export default {
  dev: {
    // 将某些文件强制归为 cold restart
    coldPatterns: [
      'src/lib/database-schema.ts',  // 数据库 schema 变更需要冷重启
    ],
    // 将某些文件强制归为 ignore
    ignorePatterns: [
      'src/generated/**',  // 自动生成的文件不触发 reload
    ],
  },
};
```

---

## 3. VextFileWatcher 实现

### 3.1 接口定义

```ts
// lib/dev/file-watcher.ts

import { watch, FSWatcher, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readdir } from 'node:fs/promises';
import { EventEmitter } from 'node:events';
import { classifyChange } from './change-classifier';

export interface WatcherOptions {
  /** 项目根目录 */
  root: string;
  /** 防抖间隔（ms） */
  debounce?: number;
  /** 使用轮询模式（Docker/网络文件系统降级方案） */
  usePolling?: boolean;
  /** 轮询间隔（ms），仅 usePolling 为 true 时有效 */
  pollInterval?: number;
}

/**
 * 单个文件的变更信息
 * 用于分级编译：modify → Tier 1 (compileSingle), add/delete → Tier 2 (rebuild)
 */
export interface FileChangeInfo {
  /** 相对于项目根目录的文件路径（如 "src/routes/user.ts"） */
  path: string;
  /** 变更类型：modify=内容修改, add=新增文件, delete=删除文件 */
  type: 'modify' | 'add' | 'delete';
}

export interface FileChangeEvent {
  /** 变更文件列表（含路径和变更类型） */
  files: FileChangeInfo[];
  /** 合并后的最终动作（有一个 cold 就是 cold） */
  action: 'soft' | 'cold';
}
```

### 3.2 核心实现

```ts
export class VextFileWatcher extends EventEmitter {
  private watchers: FSWatcher[] = [];
  private pendingChanges = new Map<string, {
    action: 'soft' | 'cold';
    type: 'modify' | 'add' | 'delete';
  }>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly options: Required<WatcherOptions>;

  /**
   * v2.2 新增：已知文件路径集合，用于区分 add 和 modify
   * 在 start() 时扫描 src/ 初始化，后续根据事件维护
   */
  private knownFiles = new Set<string>();

  constructor(options: WatcherOptions) {
    super();
    this.options = {
      debounce: 100,
      usePolling: false,
      pollInterval: 1000,
      ...options,
    };
  }

  async start(): Promise<void> {
    const { root, usePolling } = this.options;

    // v2.2: 初始化已知文件集合（用于区分 add/modify/delete）
    await this.initKnownFiles(root);

    if (usePolling) {
      this.startPolling();
      return;
    }

    // 递归监听 src/ 目录
    const srcDir = join(root, 'src');

    try {
      const watcher = watch(
        srcDir,
        {
          recursive: true,
          persistent: true,
        },
        (eventType, filename) => {
          if (!filename) return;

          const relativePath = relative(root, join(srcDir, filename));
          const normalizedPath = relativePath.replace(/\\/g, '/');

          // v2.2 修复：根据 eventType 和文件系统状态准确判断变更类型
          //
          // fs.watch 的 eventType 语义：
          //   'change'  → 文件内容修改（Windows/macOS/Linux 一致）
          //   'rename'  → 文件新建、删除、或重命名（无法直接区分）
          //
          // v2.1 Bug：所有事件 changeType 默认为 'modify'，Tier 2 永远不触发。
          // v2.2 Fix：
          //   - 'change' 事件 → 'modify'
          //   - 'rename' 事件 → 用 existsSync 判断文件是否存在：
          //     - 存在 + 不在 knownFiles 中 → 'add'（新文件）
          //     - 存在 + 在 knownFiles 中 → 'modify'（某些平台 rename 后同名写回）
          //     - 不存在 → 'delete'
          const changeType = this.detectChangeType(
            eventType,
            normalizedPath,
            join(srcDir, filename),
          );

          this.onFileChange(normalizedPath, changeType);
        },
      );

      watcher.on('error', (err) => {
        // Docker 中 inotify 可能报 ENOSPC，降级为 polling
        if ((err as NodeJS.ErrnoException).code === 'ENOSPC') {
          console.warn('[vext dev] inotify limit reached, falling back to polling');
          this.restartWithPolling();
        }
      });

      this.watchers.push(watcher);
    } catch {
      // 目录不存在时静默跳过
    }

    // 根目录配置文件单独监听
    const rootConfigFiles = [
      'package.json', 'tsconfig.json',
    ];

    // .env 文件（含 .env.local, .env.production 等）
    const envFiles = this.findEnvFiles(root);

    for (const configFile of rootConfigFiles) {
      const fullPath = join(root, configFile);
      try {
        statSync(fullPath);
        const watcher = watch(fullPath, () => {
          // 配置文件只关心内容修改，不关心 add/delete
          this.onFileChange(configFile, 'modify');
        });
        this.watchers.push(watcher);
      } catch {
        // 文件不存在，跳过
      }
    }

    // .env 文件监听（含 .env.local, .env.production 等）
    for (const envFile of envFiles) {
      const fullPath = join(root, envFile);
      try {
        const watcher = watch(fullPath, () => {
          this.onFileChange(envFile, 'modify');
        });
        this.watchers.push(watcher);
      } catch {
        // 文件不存在，跳过
      }
    }

    console.log(`[vext dev] watching ${root}/src for changes...`);
  }

  /**
   * 查找根目录下所有 .env 文件（.env, .env.local, .env.production 等）
   */
  private findEnvFiles(root: string): string[] {
    try {
      const entries = require('fs').readdirSync(root);
      return entries.filter((f: string) => /^\.env(\..+)?$/.test(f));
    } catch {
      return ['.env'];  // fallback: 至少监听 .env
    }
  }

  /**
   * v2.2 新增：根据 fs.watch 事件类型和文件系统状态判断变更类型
   *
   * 这是 v2.2 的关键修复。v2.1 中所有变更都被视为 'modify'，
   * 导致新增/删除文件时 Tier 2 编译路径永远不被触发。
   */
  private detectChangeType(
    eventType: string,
    normalizedPath: string,
    absolutePath: string,
  ): 'modify' | 'add' | 'delete' {
    if (eventType === 'change') {
      // 内容修改（所有平台一致）
      return 'modify';
    }

    // eventType === 'rename'：可能是新建、删除或重命名
    if (existsSync(absolutePath)) {
      // 文件存在
      if (this.knownFiles.has(normalizedPath)) {
        // 已知文件 — 可能是某些平台将内容修改也报为 rename
        // 或者是 rename 后同名写回的情况，按 modify 处理
        return 'modify';
      } else {
        // 新文件 — add
        this.knownFiles.add(normalizedPath);
        return 'add';
      }
    } else {
      // 文件不存在 — delete
      this.knownFiles.delete(normalizedPath);
      return 'delete';
    }
  }

  /**
   * v2.2 新增：初始化已知文件集合
   * 启动时扫描 src/ 目录，记录所有已存在的文件路径
   */
  private async initKnownFiles(root: string): Promise<void> {
    this.knownFiles.clear();
    const srcDir = join(root, 'src');
    const files = await this.walkDirectory(srcDir);
    for (const file of files) {
      const rel = relative(root, file).replace(/\\/g, '/');
      this.knownFiles.add(rel);
    }
  }

  /**
   * 处理文件变更事件
   */
  private onFileChange(
    relativePath: string,
    changeType: 'modify' | 'add' | 'delete',
  ): void {
    const classification = classifyChange(relativePath);
    if (classification.action === 'ignore') return;

    // 合并到 pending 集合
    // 如果已经有一个 cold，保持 cold（cold 优先级最高）
    const existing = this.pendingChanges.get(relativePath);
    if (!existing || classification.action === 'cold') {
      this.pendingChanges.set(relativePath, {
        action: classification.action,
        type: changeType,
      });
    }

    // 防抖：重置定时器
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => this.flush(), this.options.debounce);
  }

  /**
   * 将 pending 变更合并为一个 FileChangeEvent 并发射
   */
  private flush(): void {
    if (this.pendingChanges.size === 0) return;

    const files: FileChangeInfo[] = [...this.pendingChanges.entries()].map(
      ([filePath, info]) => ({ path: filePath, type: info.type })
    );
    const hasCold = [...this.pendingChanges.values()].some(v => v.action === 'cold');

    const event: FileChangeEvent = {
      files,
      action: hasCold ? 'cold' : 'soft',
    };

    this.pendingChanges.clear();
    this.debounceTimer = null;

    this.emit('change', event);
  }

  /** 当 inotify 限制时降级为 polling 模式 */
  private restartWithPolling(): void {
    this.stop();
    this.options.usePolling = true;
    this.startPolling();
  }

  /**
   * Polling 降级方案
   * 适用于 Docker 挂载卷、网络文件系统
   *
   * v2.2: polling 模式也能正确检测 add/delete
   * （通过对比前后两轮文件列表的差集）
   */
  private startPolling(): void {
    const { root, pollInterval } = this.options;
    const fileStats = new Map<string, number>(); // path → mtime

    const poll = async () => {
      const files = await this.walkDirectory(join(root, 'src'));
      const currentPaths = new Set<string>();

      for (const file of files) {
        const relativePath = relative(root, file).replace(/\\/g, '/');
        currentPaths.add(relativePath);

        try {
          const stat = statSync(file);
          const mtime = stat.mtimeMs;
          const prev = fileStats.get(relativePath);

          if (prev === undefined) {
            // 新文件（首轮扫描除外）
            if (fileStats.size > 0) {
              this.onFileChange(relativePath, 'add');
            }
          } else if (prev !== mtime) {
            // 内容修改
            this.onFileChange(relativePath, 'modify');
          }
          fileStats.set(relativePath, mtime);
        } catch {
          // stat 失败，可能已删除（下面的删除检测会处理）
        }
      }

      // 检测已删除的文件
      for (const [trackedPath] of fileStats) {
        if (!currentPaths.has(trackedPath)) {
          fileStats.delete(trackedPath);
          this.onFileChange(trackedPath, 'delete');
        }
      }
    };

    // 初始扫描（不触发事件，只建立基线）
    this.walkDirectory(join(root, 'src')).then(files => {
      for (const file of files) {
        const relativePath = relative(root, file).replace(/\\/g, '/');
        try {
          const stat = statSync(file);
          fileStats.set(relativePath, stat.mtimeMs);
        } catch {
          // ignore
        }
      }
    });

    const timer = setInterval(poll, pollInterval);
    // 用一个伪 FSWatcher 来管理定时器
    this.watchers.push({ close: () => clearInterval(timer) } as any);

    console.log(`[vext dev] using polling mode (interval: ${pollInterval}ms)`);
  }

  /**
   * 递归遍历目录，返回所有匹配的文件路径
   */
  private async walkDirectory(dir: string): Promise<string[]> {
    const results: string[] = [];
    try {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
            results.push(...await this.walkDirectory(fullPath));
          }
        } else if (/\.(ts|js|mjs|cjs|json)$/.test(entry.name)) {
          results.push(fullPath);
        }
      }
    } catch {
      // 目录不存在或无权限
    }
    return results;
  }

  /**
   * 停止所有 watcher 并清理状态
   */
  stop(): void {
    for (const watcher of this.watchers) {
      watcher.close();
    }
    this.watchers = [];
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.pendingChanges.clear();
    this.knownFiles.clear();
  }
}
```

---

## 4. Docker 兼容性

| 环境 | 监听方式 | 配置 |
|------|----------|------|
| macOS | `fs.watch` (FSEvents) | 默认即可 |
| Windows | `fs.watch` (ReadDirectoryChangesW) | 默认即可 |
| Linux (本机) | `fs.watch` (inotify) | 默认即可 |
| Docker (bind mount) | `fs.watch` 可能不触发 → 自动降级 polling | `VEXT_DEV_POLL=1` 或自动检测 |
| Docker (volume) | `fs.watch` 正常 | 默认即可 |
| WSL2 (跨文件系统) | `fs.watch` 可能不触发 | `VEXT_DEV_POLL=1` |

### 4.1 已知平台差异

| 平台 | `fs.watch` recursive | rename 行为 | 注意事项 |
|------|---------------------|-------------|---------|
| macOS | ✅ 原生支持 | 准确 | FSEvents 可靠 |
| Windows | ✅ 原生支持 | rename 可能触发两次（旧名 + 新名） | 防抖合并处理 |
| Linux | ✅ Node 19+ 支持 | 部分编辑器（vim）写文件时先删再建，触发 rename 而非 change | `detectChangeType()` 已覆盖此场景 |

### 4.2 Vim/Emacs 写文件策略

某些编辑器写文件时使用 "write to temp + rename" 策略：

```
1. 写入 .user.ts.swp（临时文件）
2. 删除原 user.ts         → 触发 rename (delete)
3. 重命名 .swp → user.ts  → 触发 rename (add)
```

100ms 防抖窗口内，`delete` 和 `add` 会被合并。由于 `add` 事件晚于 `delete`，flush 时文件已存在，最终 `pendingChanges` 中该文件的 type 为 `add`。这会触发 Tier 2 编译路径（`rebuildWithNewEntryPoints`），虽然比 Tier 1 慢，但行为正确。

> **优化空间**：未来可在 flush 时对同一文件的 `delete` + `add` 序列合并为 `modify`，避免不必要的 Tier 2 触发。

---

## 5. 自动检测容器环境

```ts
// lib/dev/detect-polling.ts

import fs from 'fs'

/**
 * 判断是否需要使用 polling 模式
 *
 * 优先级：
 *   1. 环境变量显式设置 → 使用设置值
 *   2. 检测到容器 + bind mount → 使用 polling
 *   3. 默认不使用 polling
 */
export function shouldUsePolling(): boolean {
  // 1. 显式设置
  if (process.env.VEXT_DEV_POLL === '1') return true;
  if (process.env.VEXT_DEV_POLL === '0') return false;

  // 2. 自动检测：检查是否在容器内
  try {
    // 方法 A：检查 /.dockerenv 文件（Docker 容器标志文件）
    if (fs.existsSync('/.dockerenv')) {
      return checkBindMount();
    }

    // 方法 B：检查 cgroup（兼容更多容器运行时）
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf-8');
    if (cgroup.includes('docker') || cgroup.includes('kubepods') || cgroup.includes('containerd')) {
      return checkBindMount();
    }
  } catch {
    // 非 Linux 系统或无权限 — 不是容器环境
  }

  return false;
}

/**
 * 检查工作目录是否为 bind mount
 * bind mount 的文件系统通常是 ext4/xfs/ntfs 等宿主机类型，
 * 而非 overlay（Docker 层文件系统）
 */
function checkBindMount(): boolean {
  try {
    const mounts = fs.readFileSync('/proc/mounts', 'utf-8');
    // 检查常见的 bind mount 特征
    // 如果 /app 或工作目录使用非 overlay 文件系统，很可能是 bind mount
    const cwd = process.cwd();
    const lines = mounts.split('\n');
    for (const line of lines) {
      if (line.includes(cwd) || line.includes('/app')) {
        // bind mount 通常不是 overlay
        if (!line.includes('overlay')) {
          return true;
        }
      }
    }
  } catch {
    // 无法读取 mounts 信息
  }

  // 保守策略：在容器内但无法确认 bind mount → 仍使用 polling
  // bind mount 上 inotify 不工作是已知问题，宁可多用 polling 也不能丢失事件
  return true;
}
```

### 5.1 CLI 覆盖

用户可通过 CLI 选项或环境变量强制控制：

```bash
# 强制使用 polling
vext dev --poll

# 强制使用 polling + 自定义间隔
vext dev --poll --poll-interval 500

# 环境变量方式
VEXT_DEV_POLL=1 vext dev

# 强制不使用 polling（即使在容器中）
VEXT_DEV_POLL=0 vext dev
```

---

## 附录：v2.2 FileWatcher 修复清单

| 编号 | 优先级 | 问题描述 | 修复方式 |
|------|--------|---------|---------|
| FIX-4 | 🟡 P1 | `fs.watch` 回调不传 `changeType`，所有变更默认为 `modify`，Tier 2 永远不触发 | 新增 `detectChangeType()` — 用 `eventType` + `existsSync` + `knownFiles` 集合区分 `add` / `delete` / `modify` |
| FIX-5 | 🟡 P1 | Polling 模式无法检测新文件和删除文件 | Polling 改为对比前后两轮文件列表差集，正确发出 `add` / `delete` 事件 |
| FIX-6 | ⚪ P3 | Vim/Emacs 的 "delete + rename" 写文件策略触发不必要的 Tier 2 | 已识别（防抖可合并），未来可优化为在 flush 时将同文件的 `delete` + `add` 合并为 `modify` |