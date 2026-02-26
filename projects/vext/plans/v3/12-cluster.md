# 12 - 多进程 Cluster 设计方案（总览）

> **项目**: vext (vextjs)
> **日期**: 2026-02-26
> **状态**: ✅ 已确认
> **关联文件**: `06c-lifecycle.md`、`09-cli.md`、`05-config.md`、`11-hot-reload.md`

---

## 子文件索引

| 文件 | 内容 |
|------|------|
| `12-cluster.md` | 总览：设计目标、架构、配置、注意事项、对比 |
| `12a-master.md` | Master 进程设计、Worker 数量计算、信号处理 |
| `12b-worker.md` | Worker 进程设计、IPC 通信协议、心跳/指标 |
| `12c-lifecycle.md` | 进程状态机、零停机重启（Rolling Restart）、优雅关闭 |
| `12d-deploy.md` | Docker 支持、多项目隔离、PID 文件、systemd |
| `12e-observability.md` | 日志设计、健康检查、指标、故障场景矩阵 |

---

## 1. 设计目标与约束

### 1.1 目标

| 目标 | 说明 |
|------|------|
| **多核利用** | 充分利用多核 CPU，每个 Worker 独占一个核心 |
| **零停机重启** | 滚动重启 Worker，对外请求无感知 |
| **自动恢复** | Worker 崩溃后自动重启，带指数退避和频率保护 |
| **Docker 原生** | 单容器多进程、多容器单进程两种模式都支持 |
| **多项目隔离** | 同一服务器运行多个 vext 项目互不影响 |
| **零外部依赖** | 仅使用 Node.js 内置 `node:cluster`、`node:os`、`node:fs` |
| **可观测性** | 结构化日志、健康检查端点、指标上报接口 |

### 1.2 约束

- ❌ **不依赖** pm2、forever、nodemon 或任何第三方进程管理器
- ✅ **仅使用** `node:cluster`（底层基于 `child_process.fork` + 端口共享）
- ✅ **兼容** Node.js 18 LTS / 20 LTS / 22+
- ✅ **兼容** Linux (glibc/musl)、macOS、Windows
- ✅ **兼容** Docker (Alpine / Debian)、Kubernetes、Docker Compose

---

## 2. 架构总览

```
┌───────────────────────────────────────────────────────────────────────┐
│                          Operating System                             │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────────┐  │
│  │                     Vext Master Process                         │  │
│  │                     (PID written to .vext.pid)                  │  │
│  │                                                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐ │  │
│  │  │ Worker       │  │ Health       │  │ Lifecycle Manager     │ │  │
│  │  │ Manager      │  │ Monitor      │  │ - spawn / respawn     │ │  │
│  │  │              │  │              │  │ - rolling restart     │ │  │
│  │  │ - fork()     │  │ - heartbeat  │  │ - graceful shutdown   │ │  │
│  │  │ - IPC relay  │  │ - liveness   │  │ - crash recovery      │ │  │
│  │  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘ │  │
│  │         │        IPC (message passing)            │             │  │
│  │  ┌──────┴─────────────────┴───────────────────────┴───────────┐ │  │
│  │  │                   Cluster IPC Channel                      │ │  │
│  │  └──────┬─────────┬─────────┬─────────┬──────────────────────┘ │  │
│  │    ┌────┴───┐ ┌───┴────┐ ┌─┴──────┐ ┌┴───────┐               │  │
│  │    │Worker 1│ │Worker 2│ │Worker 3│ │Worker N│  (共享端口)   │  │
│  │    └────────┘ └────────┘ └────────┘ └────────┘               │  │
│  └─────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────┘
```

**核心原理**: `node:cluster` 允许多个 Worker 监听同一端口。OS 内核分配 TCP 连接（Linux: `SO_REUSEPORT`，Windows: round-robin）。Master 不处理 HTTP 请求，只负责进程管理。

---

## 3. 配置设计

cluster 配置位于 `config/default.ts` 的 `cluster` 字段中（详见 `05-config.md` §3.15）。

### 3.1 完整配置项

```ts
interface VextClusterConfig {
  /** 是否启用 cluster 模式。也可通过 VEXT_CLUSTER=1 开启 @default false */
  enabled: boolean
  /** Worker 数量。'auto' = CPU 核心数 @default 'auto' */
  workers: 'auto' | 'auto-1' | number
  /** Worker 崩溃后自动重启 @default true */
  autoRestart: boolean
  /** 允许在窗口内重启的最大次数（第 N+1 次触发限流）@default 5 */
  maxRestarts: number
  /** 快速重启检测窗口（毫秒）@default 60000 */
  restartWindow: number
  /** 重启间隔退避基数（毫秒）@default 1000 */
  restartBaseDelay: number
  /** 重启间隔上限（毫秒）@default 30000 */
  restartMaxDelay: number
  /** 健康检查 */
  healthCheck: {
    enabled: boolean       // @default true
    interval: number       // Master 检查间隔（毫秒）@default 15000
    timeout: number        // 心跳超时（毫秒）@default 30000
  }
  /** 零停机重启 */
  reload: {
    workerDelay: number      // @default 2000
    readyTimeout: number     // @default 30000
    shutdownTimeout: number  // @default 10000
  }
  /** PID 文件路径 @default '.vext.pid' */
  pidFile: string
  /** 进程标题前缀 @default 'vext' */
  titlePrefix: string
  /** 粘性会话 @default 'none' */
  sticky: 'none' | 'ip'
}
```

### 3.2 环境变量覆盖

| 环境变量 | 说明 | 示例 |
|----------|------|------|
| `VEXT_CLUSTER` | 是否启用 | `1` / `0` |
| `VEXT_WORKERS` | Worker 数量 | `4` / `auto` |
| `VEXT_CLUSTER_PID` | PID 文件路径 | `/var/run/myapp.pid` |

---

## 4. 多进程注意事项

每个 Worker 是独立 V8 实例，**内存不共享**：

| 场景 | 问题 | 应对 |
|------|------|------|
| 内存缓存 | Worker 间数据不一致 | 使用 Redis 等外部缓存 |
| Rate Limit | 每个 Worker 独立计数，实际限流 = N × max | 使用 Redis store |
| Session | 不同 Worker 无法读取同一 session | 使用 Redis store 或 sticky session |
| WebSocket 广播 | 只广播到当前 Worker | Redis pub/sub 或 IPC relay |
| 定时任务 | 每个 Worker 都会执行 | 分布式锁或 Master 执行 |
| DB 连接池 | 总连接数 = N × poolSize | 调低单 Worker poolSize |

> **Rate Limit 重要说明**：框架内置的 `flex-rate-limit` 默认使用内存 store。cluster 模式下应配置 Redis store，否则限流不准确。

---

## 5. 与 dev 模式的关系

| 特性 | `vext dev` | `vext start --cluster` | `vext start`（单进程） |
|------|-----------|----------------------|---------------------|
| 进程数 | 1 (+ watcher) | 1 Master + N Workers | 1 |
| 热重载 | ✅ | ❌ | ❌ |
| 零停机重启 | ❌ | ✅ Rolling Restart | ❌ |
| 多核 | ❌ | ✅ | ❌ |
| 推荐环境 | 本地开发 | 生产 / 预发布 | K8s |

> 热重载详见 `11-hot-reload.md`。

---

## 6. 与常见方案对比

| 特性 | Vext Cluster | PM2 | K8s |
|------|-------------|-----|-----|
| 依赖 | 无（Node.js 内置） | npm 包 | K8s |
| 零停机重启 | ✅ | ✅ | ✅ |
| 自动恢复 | ✅ | ✅ | ✅ |
| 适合场景 | 单服务器/Docker | 单服务器 | 大集群 |

**定位**: 不引入外部依赖，提供 80% PM2 能力。需要更复杂编排时禁用 cluster（`VEXT_CLUSTER=0`），让 K8s 管理副本数。

---

## 7. 实施计划

| 阶段 | 内容 | 预估 |
|------|------|------|
| Phase 1 | 基础 Cluster：fork / exit / signal / PID | 2-3 天 |
| Phase 2 | 弹性恢复：auto-restart / 退避 / 频率保护 / 心跳 | 1-2 天 |
| Phase 3 | 零停机重启：Rolling Restart / 优雅关闭 | 1-2 天 |
| Phase 4 | CLI 集成：stop / reload / status | 1 天 |
| Phase 5 | Docker + 多项目 | 1 天 |
| Phase 6 | 可观测性：metrics / 日志 / 内存阈值 | 1 天 |
| Phase 7 | 测试 | 2 天 |
