# 12c - 进程生命周期管理

> **所属模块**: Cluster（`12-cluster.md`）

---

## 1. 状态机

```
                    fork()
    ┌──────────┐  ────────▶  ┌──────────┐
    │  (none)  │              │ starting │
    └──────────┘              └────┬─────┘
                         'ready' IPC
                                  ▼
                             ┌──────────┐
                  ┌─────────▶│  ready   │◀── auto-restart ──┐
                  │          └────┬─────┘                    │
                  │     'shutdown' / SIGHUP                  │
                  │               ▼                          │
                  │          ┌──────────┐                    │
                  │          │ draining │  new Worker        │
                  │          └────┬─────┘  replaces          │
                  │          process.exit                    │
                  │               ▼                          │
                  │          ┌──────────┐                    │
                  │          │   dead   │────────────────────┘
                  │          └──────────┘
                  │  unexpected crash
                  └──────────────────
```

---

## 2. 启动顺序

```
1. Master 启动
2. 计算 workerCount（resolveWorkerCount）
3. 写入 PID 文件
4. FOR i = 1 TO workerCount（串行）:
   4a. cluster.fork() → 新 Worker 进程
   4b. Worker 执行 bootstrap()
   4c. Worker 发送 { type: 'ready' }
   4d. Master 标记 worker.state = 'ready'
   4e. 继续 fork 下一个
5. 所有 Worker ready → "all workers ready"
6. 启动健康检查定时器
```

---

## 3. Fork 与等待就绪

```ts
private async forkWorker(): Promise<cluster.Worker> {
  const worker = cluster.fork({
    VEXT_WORKER_ID: String(this.workers.size + 1),
  })

  const meta: WorkerMeta = {
    id: worker.id,
    startTime: Date.now(),
    restartCount: 0,
    lastHeartbeat: Date.now(),
    state: 'starting',
  }
  this.workers.set(worker.id, meta)

  worker.send({ type: 'set-title', title: `${this.config.titlePrefix}:worker:${worker.id}` })

  worker.on('message', (msg: any) => this.handleWorkerMessage(worker, msg))

  await this.waitForWorkerReady(worker)
  return worker
}

private waitForWorkerReady(worker: cluster.Worker): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`worker ${worker.id} ready timeout (${this.config.reload.readyTimeout}ms)`))
    }, this.config.reload.readyTimeout)

    const onMessage = (msg: any) => {
      if (msg?.type === 'ready') {
        clearTimeout(timeout)
        const meta = this.workers.get(worker.id)
        if (meta) meta.state = 'ready'
        worker.removeListener('message', onMessage)
        resolve()
      }
    }

    worker.on('message', onMessage)
    worker.once('exit', () => {
      clearTimeout(timeout)
      worker.removeListener('message', onMessage)
      reject(new Error(`worker ${worker.id} exited before ready`))
    })
  })
}
```

---

## 4. Worker 退出处理

```ts
private handleWorkerExit(worker: cluster.Worker, code: number | null, signal: string | null): void {
  const meta = this.workers.get(worker.id)
  this.workers.delete(worker.id)

  const exitInfo = signal ? `signal ${signal}` : `code ${code}`
  console.log(`[cluster] worker ${worker.id} (pid: ${worker.process.pid}) exited: ${exitInfo}`)

  if (this.isShuttingDown) return
  if (meta?.state === 'draining') return

  if (!this.config.autoRestart) {
    this.checkAllDead()
    return
  }

  // 频率保护
  if (this.isRestartThrottled()) {
    console.error(
      `[cluster] ❌ restart rate exceeded (${this.config.maxRestarts} in ${this.config.restartWindow}ms), pausing`
    )
    this.emit('restart-throttled', { workerId: worker.id, code, signal })
    this.checkAllDead()
    return
  }

  // 指数退避重启
  const delay = this.calculateRestartDelay()
  console.log(`[cluster] restarting worker in ${delay}ms...`)
  setTimeout(async () => {
    try {
      await this.forkWorker()
    } catch (err) {
      console.error(`[cluster] failed to spawn replacement: ${(err as Error).message}`)
    }
  }, delay)
}
```

---

## 5. 频率保护 + 指数退避

```ts
private isRestartThrottled(): boolean {
  const now = Date.now()
  this.restartTimestamps.push(now)
  this.restartTimestamps = this.restartTimestamps.filter(
    t => t > now - this.config.restartWindow
  )
  return this.restartTimestamps.length > this.config.maxRestarts
}

private calculateRestartDelay(): number {
  return Math.min(
    this.config.restartBaseDelay * Math.pow(2, this.restartTimestamps.length - 1),
    this.config.restartMaxDelay,
  )
}
```

---

## 6. 零停机重启（Rolling Restart）

### 6.1 触发方式

- **信号**: `kill -HUP <master_pid>` 或 `kill -USR2 <master_pid>`
- **CLI**: `vext reload`（读取 PID 文件，发送 SIGHUP，详见 `09-cli.md` §5）

### 6.2 流程

```
[1] isReloading = true
[2] 快照当前 Worker 列表 [W1, W2, W3, W4]
[3] FOR EACH oldWorker（串行）:
    [3a] Fork 新 Worker W5（加载最新代码）
    [3b] 等待 W5 ready（超时 → 杀 W5，跳过本轮，旧 Worker 保持运行）
    [3c] W5 就绪 → 通知旧 W1 shutdown
    [3d] 等待 W1 退出（超时 → SIGKILL）
    [3e] 等待 workerDelay（2s）再处理下一个
[4] 全部替换完 → isReloading = false
```

```
时间线（4 Worker 示例）:
t0:  W1 W2 W3 W4         ← 4 Worker 服务中
t1:  W1 W2 W3 W4  [W5]   ← W5 启动中
t2:  ▓1 W2 W3 W4   W5    ← W5 ready，W1 draining
t3:     W2 W3 W4   W5    ← W1 退出，仍 4 Worker
...
tn:              W5 W6 W7 W8  ← 全部替换完

图例: W = 正常服务  ▓ = draining
```

### 6.3 实现

```ts
async rollingRestart(trigger: string): Promise<void> {
  if (this.isReloading) return
  if (this.isShuttingDown) return

  this.isReloading = true
  console.log(`[cluster] rolling restart triggered by ${trigger}`)

  const oldWorkerIds = [...this.workers.keys()]
  let replaced = 0

  for (const oldId of oldWorkerIds) {
    if (this.isShuttingDown) break

    try {
      const newWorker = await this.forkWorker()

      const oldWorker = cluster.workers?.[oldId]
      if (oldWorker && !oldWorker.isDead()) {
        oldWorker.send({ type: 'shutdown', timeout: this.config.reload.shutdownTimeout })
        await this.waitForWorkerExit(oldWorker, this.config.reload.shutdownTimeout)
      }

      replaced++
      if (replaced < oldWorkerIds.length) {
        await sleep(this.config.reload.workerDelay)
      }
    } catch (err) {
      console.error(`[cluster] failed to replace worker ${oldId}: ${(err as Error).message}`)
    }
  }

  this.isReloading = false
  console.log(`[cluster] rolling restart complete, ${replaced}/${oldWorkerIds.length} replaced`)
}
```

---

## 7. 优雅关闭

```ts
async gracefulShutdown(trigger: string): Promise<void> {
  if (this.isShuttingDown) return
  this.isShuttingDown = true

  console.log(`[cluster] graceful shutdown triggered by ${trigger}`)

  if (this.healthCheckTimer) {
    clearInterval(this.healthCheckTimer)
    this.healthCheckTimer = null
  }

  const promises: Promise<void>[] = []
  for (const [id] of this.workers) {
    const worker = cluster.workers?.[id]
    if (worker && !worker.isDead()) {
      worker.send({ type: 'shutdown', timeout: this.config.reload.shutdownTimeout })
      promises.push(this.waitForWorkerExit(worker, this.config.reload.shutdownTimeout))
    }
  }

  await Promise.allSettled(promises)
  this.cleanup()
  console.log('[cluster] all workers stopped, master exiting')
  process.exit(0)
}

private waitForWorkerExit(worker: cluster.Worker, timeout: number): Promise<void> {
  return new Promise<void>((resolve) => {
    let resolved = false
    const done = () => { if (!resolved) { resolved = true; resolve() } }

    worker.once('exit', done)
    const timer = setTimeout(() => {
      if (!worker.isDead()) {
        console.warn(`[cluster] worker ${worker.id} shutdown timeout, SIGKILL`)
        worker.process.kill('SIGKILL')
      }
      done()
    }, timeout)
    worker.once('exit', () => clearTimeout(timer))
  })
}
```

