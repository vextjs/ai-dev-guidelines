# 12a - Master 进程设计

> **所属模块**: Cluster（`12-cluster.md`）

---

## 1. 职责

Master 进程是纯管理者角色，**不处理任何 HTTP 请求**：

1. 计算 Worker 数量
2. Fork Worker 进程（逐个启动，非并行）
3. 写入 PID 文件
4. 监听 Worker 退出事件并决定是否重启
5. 处理 OS 信号（SIGTERM、SIGHUP、SIGUSR2）
6. 执行零停机重启（Rolling Restart）
7. 运行健康检查（heartbeat monitor）
8. 所有 Worker 退出后清理 PID 文件并退出

---

## 2. Worker 数量计算

```ts
// lib/cluster/worker-count.ts
import { availableParallelism, cpus } from 'node:os'

/**
 * 优先 os.availableParallelism()（Node.js 19.4+，感知 Docker cgroups v2）
 * 降级 os.cpus().length + cgroup v1 检测
 */
export function resolveWorkerCount(config: 'auto' | 'auto-1' | number): number {
  if (typeof config === 'number') {
    return Math.max(1, Math.min(config, 64))  // 硬上限 64
  }

  let cpuCount: number
  if (typeof availableParallelism === 'function') {
    cpuCount = availableParallelism()
  } else {
    cpuCount = cpus().length || 1
  }

  // cgroup v1 降级（Docker 旧版本 / 部分云平台）
  cpuCount = adjustForCgroupV1(cpuCount)

  return config === 'auto-1'
    ? Math.max(1, cpuCount - 1)
    : Math.max(1, cpuCount)
}

function adjustForCgroupV1(fallback: number): number {
  try {
    const fs = require('node:fs')
    const quotaPath  = '/sys/fs/cgroup/cpu/cpu.cfs_quota_us'
    const periodPath = '/sys/fs/cgroup/cpu/cpu.cfs_period_us'

    if (fs.existsSync(quotaPath) && fs.existsSync(periodPath)) {
      const quota  = parseInt(fs.readFileSync(quotaPath, 'utf-8').trim(), 10)
      const period = parseInt(fs.readFileSync(periodPath, 'utf-8').trim(), 10)
      if (quota > 0 && period > 0) {
        return Math.min(fallback, Math.ceil(quota / period))
      }
    }
  } catch { /* 非 Linux 或无权限 */ }
  return fallback
}
```

---

## 3. Master 主类

```ts
// lib/cluster/master.ts
import cluster from 'node:cluster'
import { EventEmitter } from 'node:events'

interface WorkerMeta {
  id: number
  startTime: number
  restartCount: number
  lastHeartbeat: number
  state: 'starting' | 'ready' | 'draining' | 'dead'
}

export class ClusterMaster extends EventEmitter {
  private workers = new Map<number, WorkerMeta>()
  private restartTimestamps: number[] = []
  private isShuttingDown = false
  private isReloading = false
  private healthCheckTimer: ReturnType<typeof setInterval> | null = null
  private readonly config: VextClusterConfig

  constructor(config: VextClusterConfig) {
    super()
    this.config = config
  }

  async start(): Promise<void> {
    const workerCount = resolveWorkerCount(this.config.workers)
    process.title = `${this.config.titlePrefix}:master`

    // 写入 PID 文件（见 12d-deploy.md）
    await this.writePidFile()

    // Linux + 非 sticky: SCHED_NONE（内核 SO_REUSEPORT，性能最优）
    if (process.platform === 'linux' && this.config.sticky === 'none') {
      cluster.schedulingPolicy = cluster.SCHED_NONE
    } else {
      cluster.schedulingPolicy = cluster.SCHED_RR
    }

    console.log(`[cluster] master ${process.pid} starting ${workerCount} workers`)

    for (let i = 0; i < workerCount; i++) {
      try {
        await this.forkWorker()
      } catch (err) {
        if (i === 0) {
          // 首个 Worker 失败 → Fail Fast
          console.error(`[cluster] ❌ first worker failed: ${(err as Error).message}`)
          this.cleanup()
          process.exit(1)
        }
        console.warn(`[cluster] worker ${i + 1} failed: ${(err as Error).message}`)
      }
    }

    cluster.on('exit', (worker, code, signal) => {
      this.handleWorkerExit(worker, code, signal)
    })

    this.registerSignals()

    if (this.config.healthCheck.enabled) {
      this.startHealthCheck()
    }

    console.log(`[cluster] ✅ ${workerCount} workers ready`)
  }

  // forkWorker / waitForWorkerReady / handleWorkerExit
  // → 见 12c-lifecycle.md（进程生命周期管理）

  // gracefulShutdown / rollingRestart
  // → 见 12c-lifecycle.md

  // startHealthCheck
  // → 见 12e-observability.md
}
```

---

## 4. 信号处理

### 4.1 信号矩阵

| 信号 | 行为 | 说明 |
|------|------|------|
| `SIGTERM` | 优雅关闭 | 通知所有 Worker shutdown → 等待退出 → 清理 PID → Master 退出 |
| `SIGINT` | 同 SIGTERM | Ctrl+C |
| `SIGHUP` | 滚动重启 | Rolling Restart 所有 Worker（类似 `nginx -s reload`） |
| `SIGUSR2` | 同 SIGHUP | 备用 reload 信号 |
| `SIGUSR1` | 无 | 保留给 Node.js debugger |

### 4.2 注册代码

```ts
private registerSignals(): void {
  process.on('SIGTERM', () => this.gracefulShutdown('SIGTERM'))
  process.on('SIGINT',  () => this.gracefulShutdown('SIGINT'))

  if (process.platform !== 'win32') {
    process.on('SIGHUP',  () => this.rollingRestart('SIGHUP'))
    process.on('SIGUSR2', () => this.rollingRestart('SIGUSR2'))
  }
}
```

---

## 5. 逐个启动（Sequential Fork）

Worker 逐个启动，不是同时 fork。好处：

- 避免启动时 DB 连接风暴（N 个 Worker 同时建连接池）
- 首个 Worker 可执行一次性操作（如数据库迁移）
- 首个 Worker 失败可立即中止（不浪费资源）

