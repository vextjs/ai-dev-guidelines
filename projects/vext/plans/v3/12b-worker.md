# 12b - Worker 进程设计

> **所属模块**: Cluster（`12-cluster.md`）

---

## 1. 职责

Worker 进程运行实际的 Vext 应用：

1. 执行完整的 bootstrap 流程（详见 `09-cli.md` §4.1）
2. 监听 HTTP 端口（通过 `node:cluster` 共享）
3. 定期发送心跳给 Master
4. 响应 Master 的管理指令（shutdown / set-title）
5. 优雅关闭时停止接受新请求、等待在途请求完成

---

## 2. Worker 入口

```ts
// lib/cluster/worker.ts
import { bootstrap } from '../bootstrap'

export async function workerMain(): Promise<void> {
  const workerId = process.env.VEXT_WORKER_ID || '?'

  try {
    // 1. 执行标准 bootstrap（返回签名见 §4.1）
    const { app, internals, serverHandle } = await bootstrap()

    // 2. 响应 Master 指令
    process.on('message', (msg: any) => {
      if (msg?.type === 'set-title') {
        process.title = msg.title
      }
      if (msg?.type === 'shutdown') {
        // 由 internals.shutdown 统一处理（见 06-built-ins.md）
        internals.shutdown(serverHandle)
      }
    })

    // 3. 通知 Master 已就绪
    process.send?.({ type: 'ready', pid: process.pid, workerId })

    // 4. 启动心跳
    startHeartbeat()

    // 5. 启动指标收集
    startMetricsReporter(app)

    console.log(`[worker:${workerId}] ready (pid: ${process.pid})`)
  } catch (err) {
    console.error(`[worker:${workerId}] bootstrap failed:`, err)
    process.exit(1)
  }
}
```

> **`bootstrap()` 返回签名**（`09-cli.md` §4.1 定义）：
> ```ts
> interface BootstrapResult {
>   app:          VextApp
>   internals:    AppInternals     // 见 06-built-ins.md §4
>   serverHandle: VextServerHandle // 见 08-adapter.md §1
> }
> ```

---

## 3. IPC 通信协议

所有 Master ↔ Worker 通信使用 `process.send()` / `process.on('message')`。

### 3.1 消息类型

```ts
// lib/cluster/ipc-types.ts

/** Worker → Master */
type WorkerToMasterMessage =
  | { type: 'ready'; pid: number; workerId: string }
  | { type: 'heartbeat'; pid: number; uptime: number; memory: number }
  | { type: 'metrics'; data: WorkerMetrics }
  | { type: 'request-restart'; reason: string }

/** Master → Worker */
type MasterToWorkerMessage =
  | { type: 'set-title'; title: string }
  | { type: 'shutdown'; timeout: number }
  | { type: 'health-check' }
  | { type: 'broadcast'; payload: unknown }

interface WorkerMetrics {
  pid: number
  memory: NodeJS.MemoryUsage
  activeRequests: number
  totalRequests: number
  avgResponseTime: number
}
```

### 3.2 广播

Master 可向所有 Worker 广播消息（如缓存清除）：

```ts
broadcast(payload: unknown): void {
  for (const [id] of this.workers) {
    const worker = cluster.workers?.[id]
    if (worker && !worker.isDead()) {
      worker.send({ type: 'broadcast', payload })
    }
  }
}
```

---

## 4. 心跳机制

```ts
function startHeartbeat(): void {
  const HEARTBEAT_INTERVAL = 10_000  // 10s

  const timer = setInterval(() => {
    process.send?.({
      type: 'heartbeat',
      pid: process.pid,
      uptime: process.uptime(),
      memory: process.memoryUsage().heapUsed,
    })
  }, HEARTBEAT_INTERVAL)

  timer.unref()  // 不阻止进程退出
}
```

> **检测延迟说明**: Master 每 `interval`（15s）检查一次，超时 `timeout`（30s）。最坏检测延迟为 `timeout + interval = 45s`。

---

## 5. 指标上报

```ts
function startMetricsReporter(app: VextApp): void {
  const METRICS_INTERVAL = 30_000  // 30s

  const timer = setInterval(() => {
    const metrics = app._internals?.getMetrics?.() ?? {
      activeRequests: 0,
      totalRequests: 0,
      avgResponseTime: 0,
    }
    process.send?.({
      type: 'metrics',
      data: { pid: process.pid, memory: process.memoryUsage(), ...metrics },
    })
  }, METRICS_INTERVAL)

  timer.unref()
}
```

> **`app._internals.getMetrics()`** 由框架内部的请求计数中间件（出口包装层）更新。计数器在 `createApp` 时初始化，在 `response-wrapper` 中累加。详见 `01c-response.md` 出口中间件。

---

## 6. 内存阈值自动重启

Worker 检测到堆内存过高时主动请求重启（避免 OOM crash）：

```ts
const MEMORY_THRESHOLD    = 1024 * 1024 * 1024  // 1GB
const MEMORY_CHECK_INTERVAL = 60_000             // 1 分钟

setInterval(() => {
  const { heapUsed } = process.memoryUsage()
  if (heapUsed > MEMORY_THRESHOLD) {
    console.warn(`[worker] heap ${Math.round(heapUsed / 1024 / 1024)}MB > threshold`)
    process.send?.({
      type: 'request-restart',
      reason: `heap ${Math.round(heapUsed / 1024 / 1024)}MB > ${Math.round(MEMORY_THRESHOLD / 1024 / 1024)}MB`,
    })
  }
}, MEMORY_CHECK_INTERVAL).unref()
```

