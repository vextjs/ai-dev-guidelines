# 12e - 可观测性（日志 / 健康检查 / 指标 / 故障场景）

> **所属模块**: Cluster（`12-cluster.md`）

---

## 1. 日志设计

### 1.1 结构化日志前缀

```
[2026-02-26T10:30:00.000Z] [cluster:master]   INFO  starting 4 workers
[2026-02-26T10:30:01.200Z] [cluster:master]   INFO  worker 1 ready (pid: 12345)
[2026-02-26T10:30:05.000Z] [cluster:worker:1] INFO  GET /api/users 200 23ms
```

### 1.2 日志策略

**推荐策略 A：Worker 直接写日志**（默认）
- 每个 Worker 独立写到 stdout/stderr
- Docker / K8s 日志驱动自动收集
- 最简单，性能最好

> 策略 B（Worker 通过 IPC 发给 Master 统一输出）⏳ 后续按需实现。

---

## 2. 健康检查

### 2.1 Master 心跳检测

```ts
private startHealthCheck(): void {
  const { interval, timeout } = this.config.healthCheck

  this.healthCheckTimer = setInterval(() => {
    const now = Date.now()
    for (const [id, meta] of this.workers) {
      if (meta.state !== 'ready') continue
      const elapsed = now - meta.lastHeartbeat
      if (elapsed > timeout) {
        console.error(`[cluster] worker ${id} heartbeat timeout (${elapsed}ms > ${timeout}ms)`)
        const worker = cluster.workers?.[id]
        if (worker && !worker.isDead()) worker.process.kill('SIGKILL')
      }
    }
  }, interval)

  this.healthCheckTimer.unref()
}
```

> **检测延迟**：最坏 `timeout + interval`（30s + 15s = 45s）。Worker 心跳间隔 10s。

### 2.2 HTTP 健康检查端点

使用 `05-config.md` §3.6 已定义的 `/health` 和 `/ready` 端点（**不另建 `/_health`**）。

Cluster 模式下 `/health` 响应自动扩展：

```json
GET /health → HTTP 200
{
  "status": "ok",
  "uptime": 12345.6,
  "workerId": 2,
  "pid": 54321,
  "memory": { "heapUsed": 67108864, "rss": 201326592 },
  "activeRequests": 3
}
```

> - 单进程模式：无 `workerId` 字段
> - `/health` 和 `/ready` 不经过用户中间件、不受 `router.prefix` 影响

---

## 3. 监控指标

Master 通过 Worker metrics 聚合以下指标（⏳ 后续通过 `vextjs-plugin-prometheus` 导出）：

| 指标 | 类型 | 说明 |
|------|------|------|
| `vext_workers_total` | gauge | 当前 Worker 数量 |
| `vext_workers_ready` | gauge | ready 状态的 Worker 数量 |
| `vext_worker_restarts_total` | counter | Worker 重启总次数 |
| `vext_worker_memory_bytes` | gauge/worker | 每个 Worker 堆内存 |
| `vext_worker_active_requests` | gauge/worker | 每个 Worker 在途请求数 |
| `vext_worker_total_requests` | counter/worker | 每个 Worker 累计请求数 |

---

## 4. 故障场景矩阵

| 场景 | 检测方式 | 应对 | 恢复时间 |
|------|----------|------|----------|
| **单 Worker 崩溃** | `cluster.on('exit')` | 指数退避 auto-restart | 1-30s |
| **Worker 挂死（死循环）** | 心跳超时 | SIGKILL + auto-restart | 30-45s |
| **Worker 内存泄漏** | 指标上报 + 阈值 | Worker 主动 `request-restart` | ~2s (rolling) |
| **所有 Worker 同时崩溃** | `workers.size === 0` | Master 退出 (exit 1) + Docker/systemd 重启 | 容器重启时间 |
| **快速循环崩溃** | 频率保护 | 停止 auto-restart + 报警 | 人工介入 |
| **Master 崩溃** | Docker/systemd | 容器重启策略 | 容器重启时间 |
| **端口被占用** | `EADDRINUSE` | 启动失败 + 明确错误信息 | 人工修复 |
| **首个 Worker 启动失败** | bootstrap 异常 | Master 立即中止 (Fail Fast) | 人工修复 |
| **配置错误** | config-loader 校验 | 启动失败 + Fail Fast | 人工修复 |

---

## 5. 性能调优建议

| 应用类型 | 推荐 Worker 数 | 原因 |
|----------|---------------|------|
| CPU 密集型 | `auto` (= CPU 核心数) | 每个 Worker 跑满一个核心 |
| IO 密集型 | `auto` | Node.js 异步 IO 天然高效 |
| 内存受限 (512MB) | `2-4` | 每个 Worker 约 100-200MB |

