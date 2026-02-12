# 项目监控规范 - 数据收集和仪表板

> **版本**: v1.0  
> **最后更新**: 2026-02-11  
> **适用范围**: 所有生产服务

---

## 监控数据收集

### 1. 指标收集方式

#### 应用程序埋点 (Instrumentation)

```javascript
// 使用 Prometheus client library
const promClient = require('prom-client');

// 创建计数器 (Counter)
const httpRequests = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'route', 'status']
});

// 创建直方图 (Histogram) - 用于响应时间
const httpDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

// 创建仪表盘 (Gauge)
const dbPoolConnections = new promClient.Gauge({
  name: 'db_pool_connections_active',
  help: 'Active database connections',
  labelNames: ['pool']
});

// 在中间件中使用
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequests.labels(req.method, req.route?.path || req.path, res.statusCode).inc();
    httpDuration.labels(req.method, req.route?.path || req.path, res.statusCode).observe(duration);
  });
  
  next();
});

// 暴露 /metrics 端点供 Prometheus 收集
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});
```

#### 日志聚合

```javascript
// 使用 Winston 或 Bunyan 记录结构化日志
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'logs/app.log' })
  ]
});

// 记录重要事件
logger.info('User login', {
  userId: 123,
  timestamp: new Date(),
  ip: req.ip,
  success: true
});

logger.error('Database connection failed', {
  error: err.message,
  database: 'primary',
  retry: true
});

// 日志通过 ELK/Splunk 处理
// Filebeat 将日志发送到 Elasticsearch
// Kibana 用于查询和分析
```

#### 分布式追踪

```javascript
// 使用 OpenTelemetry 实现分布式追踪
const { BasicTracerProvider, SimpleSpanProcessor } = require('@opentelemetry/tracing');
const { JaegerExporter } = require('@opentelemetry/exporter-jaeger');

const exporter = new JaegerExporter({
  endpoint: 'http://localhost:14268/api/traces'
});

const provider = new BasicTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(exporter));

const tracer = provider.getTracer('my-app');

// 创建 span 追踪请求
const span = tracer.startSpan('processRequest');

try {
  // 你的业务逻辑
  const result = await fetchUserData(userId);
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.recordException(error);
} finally {
  span.end();
}
```

### 2. 收集频率

```yaml
关键指标:
  收集频率: 每 10 秒
  保留期: 3 个月
  示例: 响应时间、错误率、可用性
  
  Prometheus 配置:
    ​```yaml
    global:
      scrape_interval: 10s
      evaluation_interval: 10s
    
    scrape_configs:
      - job_name: 'api-server'
        static_configs:
          - targets: ['localhost:9090']
    ​```

普通指标:
  收集频率: 每 1 分钟
  保留期: 1 年
  示例: CPU、内存、磁盘使用率
  
常规指标:
  收集频率: 每 5 分钟
  保留期: 3 年
  示例: 业务指标汇总

历史数据:
  保留期: 5 年
  存储方式: S3 或冷存储
  用途: 长期趋势分析、容量规划
```

---

## 仪表板和报表

### Grafana 仪表板设计

#### 概览仪表板

```
┌─────────────────────────────────────────────────────────────────┐
│ 📊 API Service Overview Dashboard                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🟢 Service Status   │  Uptime: 99.97%   │  Incidents: 2       │
│  ─────────────────────────────────────────────────────────────  │
│                                                                  │
│  ┌─────────────────┬──────────────────┬──────────────────┐    │
│  │  响应时间 (P95)  │  错误率          │  吞吐量           │    │
│  │  ▁▃▅▇█▇▅▃▁     │  ▁▁▁▂▁▁▁▁▁      │  ▇▇▆▆▇▇▇▆▆      │    │
│  │  125ms          │  0.3%            │  1250 req/s       │    │
│  └─────────────────┴──────────────────┴──────────────────┘    │
│                                                                  │
│  ┌──────────────────┬──────────────────┬──────────────────┐   │
│  │  CPU 使用率      │  内存使用率      │  磁盘使用率      │   │
│  │  ▃▅▇▅▃▄▅▆▇     │  ▄▅▆▇▆▅▄▅▆     │  ▂▃▃▃▃▂▂▂▂     │   │
│  │  42%             │  65%             │  72%              │   │
│  └──────────────────┴──────────────────┴──────────────────┘   │
│                                                                  │
│  ┌──────────────────┬──────────────────┬──────────────────┐   │
│  │ 数据库连接       │  Redis 缓存命中   │  消息队列堆积    │   │
│  │  42/100          │  94.2%            │  123 messages    │   │
│  └──────────────────┴──────────────────┴──────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Grafana 配置示例

```json
{
  "dashboard": {
    "title": "API Service Overview",
    "panels": [
      {
        "title": "Service Availability",
        "targets": [
          {
            "expr": "up{service='api'} * 100",
            "legendFormat": "Availability (%)"
          }
        ],
        "type": "gauge"
      },
      {
        "title": "Request Duration P95",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, http_request_duration_seconds)",
            "legendFormat": "P95"
          }
        ],
        "type": "graph"
      },
      {
        "title": "Error Rate",
        "targets": [
          {
            "expr": "rate(http_requests_total{status=~'5..'}[5m]) / rate(http_requests_total[5m]) * 100",
            "legendFormat": "Error Rate (%)"
          }
        ],
        "type": "graph"
      }
    ]
  }
}
```

### 周报告模板

```markdown
# 周监控报告 - 2026 年 2 月 8-14 日

## 执行摘要

- ✅ 整周可用性: 99.96%
- ✅ 平均响应时间: 95ms (P95)
- ⚠️ 2 次告警，已全部解决
- ✅ 无用户影响事件

## 关键指标

| 指标 | 目标 | 实际 | 状态 |
|------|------|------|------|
| 可用性 | 99.9% | 99.96% | ✅ |
| P95 响应时间 | < 200ms | 95ms | ✅ |
| 错误率 | < 1% | 0.3% | ✅ |
| 磁盘空间 | > 20% | 28% | ✅ |

## 告警分析

### 告警 1: CPU 高峰
- 时间: 周三 14:00-14:30
- 原因: 数据导出任务
- 处理: 自动扩容，30 分钟恢复
- 教训: 需要调度数据导出到低峰时段

### 告警 2: 缓存未命中率高
- 时间: 周五 10:00-10:15
- 原因: Redis 重启
- 处理: 自动重连，15 分钟恢复
- 改进: 已优化缓存预热逻辑

## 趋势分析

```
吞吐量趋势:
  周一: 1200 req/s
  周二: 1250 req/s  (↑ 4%)
  周三: 1180 req/s  (↓ 5%) - 受公假影响
  周四: 1220 req/s  (↑ 3%)
  周五: 1300 req/s  (↑ 7%) - 周五高峰
  周六: 980 req/s   (↓ 25%) - 周末低谷
  周日: 950 req/s   (↓ 3%) - 周末低谷

结论: 流量呈现清晰的周期性，周五达到峰值
```

## 改进措施

- [ ] 调整数据导出任务时间表
- [ ] 优化 Redis 缓存预热
- [ ] 增加周五临时容量 (+10%)
- [ ] 完善 on-call 工作流文档

---

下周看点: 春节假期可能导致流量大幅下降
```

---

## 工具和平台

### 推荐工具堆栈

```yaml
指标收集:
  - Prometheus (开源，功能完整)
  - InfluxDB (高性能时间序列数据库)
  
可视化:
  - Grafana (功能强大，易用)
  
日志聚合:
  - ELK (Elasticsearch + Logstash + Kibana)
  - Splunk (企业级，昂贵)
  
分布式追踪:
  - Jaeger (开源)
  - Zipkin (开源)
  - Datadog (商业)
  
告警管理:
  - Prometheus AlertManager
  - PagerDuty (事件管理)
  
应用性能监控 (APM):
  - New Relic (商业)
  - DataDog (商业)
  - Dynatrace (商业)
  - Elastic APM (开源)
```

### Docker Compose 本地部署

```yaml
version: '3.8'
services:
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter:latest
    ports:
      - "9100:9100"

volumes:
  prometheus_data:
  grafana_data:
```

---

## 相关文档

- [MONITORING-METRICS.md](./MONITORING-METRICS.md) - 关键指标定义
- [MONITORING-ALERTS.md](./MONITORING-ALERTS.md) - 告警规则
- [CI-CD.md](./CI-CD.md) - CI/CD 规范

---

**最后更新**: 2026-02-11  
**维护者**: [需要项目团队确定]
