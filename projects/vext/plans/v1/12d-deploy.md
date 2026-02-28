# 12d - 部署方案（Docker / 多项目 / PID / systemd）

> **所属模块**: Cluster（`12-cluster.md`）

---

## 1. PID 文件管理

```ts
// lib/cluster/pid-file.ts
import { writeFileSync, unlinkSync, existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

export class PidFile {
  private readonly path: string

  constructor(configPath: string, projectRoot: string) {
    this.path = resolve(projectRoot, configPath)
  }

  write(): void {
    if (existsSync(this.path)) {
      const oldPid = parseInt(readFileSync(this.path, 'utf-8').trim(), 10)
      if (this.isProcessAlive(oldPid)) {
        throw new Error(
          `[vextjs] another master is already running (pid: ${oldPid}, pidFile: ${this.path}). ` +
          `Delete ${this.path} if stale.`
        )
      }
      unlinkSync(this.path)
    }
    writeFileSync(this.path, String(process.pid), 'utf-8')
  }

  remove(): void {
    try { if (existsSync(this.path)) unlinkSync(this.path) } catch { /* ignore */ }
  }

  read(): number | null {
    try {
      if (existsSync(this.path)) {
        return parseInt(readFileSync(this.path, 'utf-8').trim(), 10)
      }
    } catch { /* ignore */ }
    return null
  }

  private isProcessAlive(pid: number): boolean {
    try { process.kill(pid, 0); return true } catch { return false }
  }
}
```

---

## 2. 同服务器多项目隔离

| 维度 | 隔离方式 |
|------|----------|
| **进程** | 每个项目独立 Master + Workers |
| **端口** | 每个项目不同端口 |
| **PID 文件** | 每个项目独立 `.vext.pid` |
| **进程标题** | `process.title` 带项目名前缀 |

```bash
# ps aux | grep vext
project-a:master   1234  ...
project-a:worker:1 1235  ...
project-b:master   5678  ...

# 独立操作
cd /srv/project-a && vext reload   # 只重启 project-a
cd /srv/project-b && vext stop     # 只停止 project-b
```

---

## 3. Docker 支持

### 3.1 模式 A：单容器多进程（小规模推荐）

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

ENV VEXT_CLUSTER=1
ENV VEXT_WORKERS=auto

# 使用 vext CLI 启动（TS 项目内部用 tsx，JS 项目用 node）
CMD ["npx", "vext", "start"]

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => { process.exit(r.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"
```

```yaml
# docker-compose.yml
services:
  app:
    build: .
    ports: ["3000:3000"]
    environment:
      - VEXT_CLUSTER=1
      - VEXT_WORKERS=auto
    deploy:
      resources:
        limits:
          cpus: "4"        # auto = 4 workers
          memory: "2G"
```

### 3.2 模式 B：多容器单进程（K8s 推荐）

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

ENV VEXT_CLUSTER=0
CMD ["npx", "vext", "start"]
```

```yaml
# k8s deployment.yaml
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 4
  template:
    spec:
      containers:
        - name: app
          image: vext-app:latest
          env:
            - { name: VEXT_CLUSTER, value: "0" }
          livenessProbe:
            httpGet: { path: /health, port: 3000 }
          readinessProbe:
            httpGet: { path: /ready, port: 3000 }
```

### 3.3 PID 1 信号处理

Vext Master 已注册 SIGTERM handler（`12a-master.md` §4），可安全作为 PID 1 运行。

> 建议生产环境使用 `tini`（Node.js 22 Alpine 已内置）确保信号正确转发：
> ```dockerfile
> RUN apk add --no-cache tini
> ENTRYPOINT ["/sbin/tini", "--"]
> CMD ["npx", "vext", "start"]
> ```

---

## 4. systemd 集成

```ini
# /etc/systemd/system/vext-myapp.service
[Unit]
Description=Vext Application - myapp
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/srv/myapp
ExecStart=/usr/bin/npx vext start
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
RestartSec=5
KillMode=mixed
KillSignal=SIGTERM
TimeoutStopSec=30
Environment=NODE_ENV=production
Environment=VEXT_CLUSTER=1
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl start vext-myapp
sudo systemctl reload vext-myapp   # → SIGHUP → Rolling Restart
sudo journalctl -u vext-myapp -f
```

---

## 5. Sticky Session 实现（附录）

仅 `sticky: 'ip'` 时启用，Master 接管连接分发：

```ts
// lib/cluster/sticky.ts
import { createServer, Socket } from 'node:net'

export function startStickyServer(port: number, host: string, workerIds: number[]) {
  const server = createServer({ pauseOnConnect: true }, (conn: Socket) => {
    const ip = conn.remoteAddress || ''
    const idx = fnv1aHash(ip) % workerIds.length
    const worker = cluster.workers?.[workerIds[idx]]
    if (worker) worker.send({ type: 'sticky-connection' }, conn)
    else conn.destroy()
  })
  server.listen(port, host)
  return server
}

/** FNV-1a hash（轻量级，无 FIPS 限制） */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash
}
```

> **注意**: Sticky session 降低性能且增加复杂度。大多数 REST API 无状态，不需要此功能。

