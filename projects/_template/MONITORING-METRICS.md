# 项目监控规范 - 关键指标定义

> **版本**: v1.0  
> **最后更新**: 2026-02-11  
> **适用范围**: 所有生产服务

---

## 📊 监控目标

### 核心目标

```yaml
可用性监控:
  目标: 服务持续可用，99.5% 以上的时间内可访问
  关键指标:
    - 服务可用性 (%) = (总时间 - 宕机时间) / 总时间
    - 平均故障恢复时间 (MTTR)
    - 平均故障间隔时间 (MTBF)

性能监控:
  目标: 用户请求在可接受的时间内得到响应
  关键指标:
    - 响应时间 (P50/P95/P99)
    - 吞吐量 (请求数/秒)
    - 错误率 (%)

资源监控:
  目标: 基础设施资源正常运行，无浪费
  关键指标:
    - CPU 使用率
    - 内存使用率
    - 磁盘使用率
    - 网络带宽使用

业务监控:
  目标: 关键业务指标符合预期
  关键指标:
    - 用户登录成功率
    - 订单成功率
    - 支付成功率
    - 数据准确性
```

---

## 关键指标定义

### 1. 服务可用性指标

#### 定义

```
Availability (可用性) = (总时间 - 宕机时间) / 总时间 * 100%
```

#### 指标分级

```yaml
99.9% (三个九):
  含义: 年度宕机时间 < 8.76 小时
  目标: 普通服务的标准目标
  告警阈值: < 99.5%

99.95% (四个九):
  含义: 年度宕机时间 < 4.38 小时
  目标: 关键服务的目标
  告警阈值: < 99.9%

99.99% (五个九):
  含义: 年度宕机时间 < 52.6 分钟
  目标: 超关键服务的目标 (如支付系统)
  告警阈值: < 99.95%
```

#### 监控方法

```
主动探测 (Active Health Check):
  - 每 10 秒向服务发送一个 HTTP 请求
  - 检查响应状态码是否为 200
  - 如果连续 3 次失败，标记为宕机
  - 首次恢复响应时标记为恢复

代码示例 (Prometheus + Node Exporter):
  ​```javascript
  // 定期检查服务健康
  const checkHealth = async () => {
    try {
      const response = await fetch('https://api.example.com/health');
      healthStatus.set(response.ok ? 1 : 0);
    } catch (err) {
      healthStatus.set(0);
    }
  };
  ​```

日志分析 (ELK/Splunk):
  - 追踪 HTTP 5xx 错误率
  - 追踪应用异常日志
  - 追踪数据库连接错误
```

### 2. 性能指标

#### 响应时间

```yaml
P50 (中位数):
  定义: 50% 的请求在此时间内完成
  普通API: < 50ms
  复杂查询: < 200ms
  文件上传: < 1s

P95:
  定义: 95% 的请求在此时间内完成
  普通API: < 100ms
  复杂查询: < 500ms
  文件上传: < 2s

P99:
  定义: 99% 的请求在此时间内完成
  普通API: < 200ms
  复杂查询: < 1s
  文件上传: < 5s
```

#### 监控方法

```
应用埋点 (APM - Application Performance Monitoring):
  工具: New Relic, DataDog, Dynatrace
  方法: 在代码关键位置记录执行时间
  
  代码示例:
    ​```javascript
    const start = Date.now();
    const result = await processRequest();
    const duration = Date.now() - start;
    metrics.recordLatency('api.process', duration);
    ​```

Web 服务器日志:
  工具: Nginx, Apache
  方法: 从日志的 $request_time 字段提取
  
  Nginx 日志格式:
    $remote_addr - $remote_user [$time_local] 
    "$request" $status $body_bytes_sent 
    "$http_referer" "$http_user_agent" $request_time

分布式追踪:
  工具: Jaeger, Zipkin
  方法: 追踪请求在各个微服务中的执行时间
```

#### 错误率

```yaml
定义: 失败请求 / 总请求 * 100%

分类:
  4xx 错误 (客户端错误): 
    - 400: 请求参数错误
    - 401: 未授权
    - 403: 禁止访问
    - 404: 资源不存在
    - 触发条件: 正常现象，不需告警
  
  5xx 错误 (服务器错误):
    - 500: 内部错误
    - 502: 网关错误
    - 503: 服务不可用
    - 触发条件: 错误率 > 1% 时告警

监控方法:
  ​```javascript
  // 统计 5xx 错误
  app.use((req, res, next) => {
    const originalSend = res.send;
    res.send = function(data) {
      if (res.statusCode >= 500) {
        metrics.increment('errors.server');
      } else if (res.statusCode >= 400) {
        metrics.increment('errors.client');
      }
      return originalSend.call(this, data);
    };
    next();
  });
  ​```
```

### 3. 资源指标

#### CPU 使用率

```yaml
阈值定义:
  正常 (< 60%): 系统有余量，可处理流量峰值
  注意 (60-80%): 已接近容量上限，需注意
  告警 (> 80%): 立即调查，考虑扩容
  紧急 (> 95%): 立即扩容或流量分流

监控方法:
  Linux 命令: top, htop, vmstat
  Prometheus: node_cpu_seconds_total
  代码示例:
    ​```javascript
    const os = require('os');
    const cpus = os.cpus();
    const avgLoad = os.loadavg()[0] / cpus.length;
    metrics.gauge('system.cpu.usage', avgLoad * 100);
    ​```
```

#### 内存使用率

```yaml
阈值定义:
  正常 (< 70%): 系统有缓冲区
  注意 (70-85%): 内存紧张，需优化
  告警 (> 85%): 可能导致 OOM，立即处理
  紧急 (> 95%): 系统不稳定

症状识别:
  ✅ 如果见到内存使用率 > 90%，立即检查:
     - 内存泄漏？
     - 缓存过大？
     - 后台进程堆积？

监控方法:
  ​```javascript
  const memUsage = process.memoryUsage();
  const heapPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  metrics.gauge('process.memory.heap', heapPercent);
  ​```
```

#### 磁盘使用率

```yaml
阈值定义:
  正常 (< 70%): 充足空间
  注意 (70-80%): 接近上限
  告警 (> 80%): 立即清理日志/临时文件
  紧急 (> 90%): 可能导致写入失败

常见原因:
  - 日志文件过大 (~/logs/)
  - 临时文件堆积 (~/tmp/, /tmp/)
  - 缓存未清理 (/var/cache/)
  - 数据库文件过大

清理方案:
  定期清理任务 (cron job):
    ​```bash
    # 清理 30 天前的日志
    find /var/log -name "*.log" -mtime +30 -delete
    
    # 清理临时文件
    rm -rf /tmp/* ~/.tmp/*
    
    # 清理 npm 缓存
    npm cache clean --force
    ​```
```

---

## 相关文档

- [MONITORING-ALERTS.md](./MONITORING-ALERTS.md) - 告警规则定义
- [MONITORING-DASHBOARD.md](./MONITORING-DASHBOARD.md) - 仪表板和数据收集
- [CI-CD.md](./CI-CD.md) - CI/CD 规范（包括部署监控）

---

**最后更新**: 2026-02-11  
**维护者**: [需要项目团队确定]
