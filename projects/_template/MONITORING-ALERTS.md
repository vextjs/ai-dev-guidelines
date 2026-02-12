# 项目监控规范 - 告警和响应

> **版本**: v1.0  
> **最后更新**: 2026-02-11  
> **适用范围**: 所有生产服务

---

## 告警规则

### 1. 告警级别定义

```yaml
🔴 严重告警 (Critical):
  影响: 服务不可用或关键功能故障
  响应时间: 5 分钟内
  示例: 
    - 可用性 < 99%
    - 大于 50% 请求 5xx 错误
    - 数据库连接池耗尽
  处理: 立即启动故障修复流程

🟠 警告告警 (Warning):
  影响: 性能下降但服务仍可用
  响应时间: 15 分钟内
  示例:
    - 响应时间 P95 > 1s
    - CPU 使用率 > 80%
    - 错误率 > 5%
  处理: 调查根本原因，制定改进计划

🟡 通知告警 (Info):
  影响: 需要关注但不紧急
  响应时间: 1 小时内
  示例:
    - 内存使用率 > 70%
    - 磁盘使用率 > 70%
    - 第三方服务延迟
  处理: 监控趋势，准备预案
```

### 2. 常见告警规则

#### 可用性告警

```yaml
规则 1: 服务不响应
  触发条件: 连续 3 次健康检查失败 (约 30 秒)
  告警级别: 🔴 Critical
  通知渠道: Slack @on-call + PagerDuty + 短信
  
  Prometheus 规则:
    ​```yaml
    - alert: ServiceDown
      expr: up{service="api"} == 0
      for: 30s
      annotations:
        summary: "API 服务离线"
        runbook: "/docs/runbooks/service-down.md"
    ​```

规则 2: 高错误率
  触发条件: 错误率 > 1% 持续 5 分钟
  告警级别: 🔴 Critical
  通知渠道: Slack @on-call + PagerDuty + 短信
  
  规则表达式:
    ​```
    rate(http_requests_total{status=~"5.."}[5m]) / rate(http_requests_total[5m]) > 0.01
    ​```
```

#### 性能告警

```yaml
规则 3: 高延迟
  触发条件: P95 响应时间 > 1000ms 持续 10 分钟
  告警级别: 🟠 Warning
  通知渠道: Slack #monitoring
  
  Prometheus 规则:
    ​```yaml
    - alert: HighLatency
      expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
      for: 10m
    ​```

规则 4: 吞吐量突降
  触发条件: 吞吐量 < 正常值的 50% 持续 5 分钟
  告警级别: 🟠 Warning
  通知渠道: Slack #monitoring
  
  规则表达式:
    ​```
    rate(http_requests_total[5m]) < avg_over_time(rate(http_requests_total[5m])[1d:5m]) * 0.5
    ​```
```

#### 资源告警

```yaml
规则 5: CPU 过高
  触发条件: CPU 使用率 > 80% 持续 10 分钟
  告警级别: 🟠 Warning
  通知渠道: Slack #infrastructure
  
  规则表达式:
    ​```
    100 - (avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100) > 80
    ​```

规则 6: 内存即将耗尽
  触发条件: 可用内存 < 500MB
  告警级别: 🟠 Warning
  通知渠道: Slack #infrastructure
  
  规则表达式:
    ​```
    node_memory_MemAvailable_bytes / 1024 / 1024 < 500
    ​```

规则 7: 磁盘空间不足
  触发条件: 磁盘使用率 > 80%
  告警级别: 🟡 Info
  通知渠道: Slack #infrastructure
  
  规则表达式:
    ​```
    100 - (node_filesystem_avail_bytes / node_filesystem_size_bytes * 100) > 80
    ​```
```

#### 业务告警

```yaml
规则 8: 登录成功率下降
  触发条件: 成功率 < 95% 持续 5 分钟
  告警级别: 🔴 Critical
  通知渠道: Slack @on-call + 短信
  
  规则表达式:
    ​```
    rate(login_success_total[5m]) / rate(login_total[5m]) < 0.95
    ​```

规则 9: 支付失败率升高
  触发条件: 失败率 > 2% 或绝对数 > 100 笔/分钟
  告警级别: 🔴 Critical
  通知渠道: Slack @on-call + 短信 + 电话
  
  规则表达式:
    ​```
    (rate(payment_failed_total[5m]) > 0.02 * rate(payment_total[5m])) 
    OR (rate(payment_failed_total[5m]) > 100/60)
    ​```
```

### 3. 告警通知渠道

```yaml
实时紧急 (Critical):
  - ✅ Slack @on-call
  - ✅ PagerDuty (自动编排)
  - ✅ 短信到值班人员
  - ✅ 电话自动呼叫 (可选)

紧急 (Warning):
  - ✅ Slack #operations
  - ✅ Email 到负责团队
  - ✅ PagerDuty (非紧急)

信息性 (Info):
  - ✅ Slack #monitoring
  - ✅ Email 日报
  - ✅ 监控仪表板

不通知:
  - 已确认但未解决的告警 (已静音)
  - 已识别为误告的告警
  - 重复的相同告警
```

---

## 告警响应流程

### On-Call 工作流

```
1️⃣ 告警触发
   ├─ 自动发送通知到 PagerDuty
   ├─ 通知当前 On-Call 人员 (Slack + 短信)
   └─ 记录告警时间和内容

2️⃣ 初步诊断 (5 分钟内)
   ├─ 检查告警详情和历史趋势
   ├─ 查阅相关运行手册 (runbook)
   ├─ 判断是否需要升级
   └─ 如果 < 5 分钟解决，则自动解决

3️⃣ 快速解决 (可能的选项)
   ├─ 选项 A: 重启服务
   ├─ 选项 B: 扩容或流量分流
   ├─ 选项 C: 回滚最近的部署
   ├─ 选项 D: 清理资源 (日志、缓存)
   └─ 更新告警状态

4️⃣ 深度诊断 (5-30 分钟)
   ├─ 收集日志和监控数据
   ├─ 检查应用的健康状态
   ├─ 联系相关团队 (如需)
   └─ 制定长期解决方案

5️⃣ 升级流程 (如需)
   ├─ 如果 On-Call 无法解决，升级到 Engineering Manager
   ├─ 如果涉及多个服务，进行战争室 (war room)
   └─ 公开沟通，定期更新状态

6️⃣ 事后分析 (24 小时内)
   ├─ 编写告警事件报告
   ├─ 识别根本原因
   ├─ 制定改进措施
   ├─ 更新运行手册
   └─ 分享学习内容给团队

7️⃣ 验证修复 (3 天内)
   ├─ 验证修复是否有效
   ├─ 更新监控规则 (如需)
   └─ 关闭对应的 Jira ticket
```

### 运行手册 (Runbook) 模板

```markdown
# Runbook: API 服务宕机

## 告警信息
- 告警规则: ServiceDown
- 触发条件: 连续 30 秒无响应
- 严重级别: 🔴 Critical

## 快速检查清单

### Step 1: 确认服务状态
​```bash
# 检查服务是否在运行
systemctl status api-service

# 检查端口是否监听
netstat -tlnp | grep 3000

# 直接测试 HTTP 端点
curl -v http://localhost:3000/health
​```

### Step 2: 检查日志
​```bash
# 查看最近的错误日志
tail -100 /var/log/api-service.log | grep ERROR

# 查看是否有 OOM 错误
dmesg | grep -i "out of memory"

# 查看系统资源
free -h
df -h
top -bn1
​```

### Step 3: 快速修复（尝试顺序）

**Option A: 重启服务**
​```bash
systemctl restart api-service
sleep 5
curl http://localhost:3000/health
​```

**Option B: 清理资源**
​```bash
# 清理日志文件（如果磁盘满）
find /var/log -name "*.log" -mtime +7 -delete

# 清理缓存
rm -rf /var/cache/api-service/*
systemctl restart api-service
​```

## 如果以上都不行

1. 联系后端团队负责人
2. 启动 war room (https://zoom.us/war-room)
3. 进行数据库检查
4. 考虑回滚最近的部署
5. 向用户发送公告信息
```

---

## 监控最佳实践

### 1. 定义清晰的成功指标

```
✅ DO:
  - "P95 响应时间 < 200ms"
  - "错误率 < 0.5%"
  - "可用性 99.9%"

❌ DON'T:
  - "性能要好"
  - "系统要稳定"
  - "速度要快"
```

### 2. 避免告警疲劳

```
❌ 问题: 每分钟 100 个告警，团队忽视所有告警

✅ 解决方案:
  - 只告警关键指标 (< 10 个)
  - 使用合理的阈值
  - 定期审查和调整告警规则
  - 使用告警分组和聚合
  - 禁用已知的误告
```

### 3. 建立可视化文化

```javascript
// 所有指标都应该是可视化的
每个关键指标都对应一个 Grafana 图表
↓
每个服务都有一个概览仪表板
↓
团队可以实时看到系统状态
↓
问题被快速发现和解决
```

### 4. 自动化修复

```
基本告警:
  ❌ 手动处理 (太慢)
  ✅ 自动修复脚本
  
  示例:
    - CPU 高 → 自动扩容
    - 磁盘满 → 自动清理日志
    - 内存泄漏 → 自动重启进程

复杂告警:
  需要人工判断的告警
  ↓
  通知 on-call 人员
  ↓
  提供自动化诊断信息
  ↓
  指导快速修复步骤
```

### 5. 持续改进

```yaml
每周:
  - 审查过去一周的告警
  - 识别虚假告警
  - 调整不合理的阈值

每月:
  - 评估告警覆盖的指标
  - 识别未被监控的关键组件
  - 补充新的监控指标

每季度:
  - 审查和更新运行手册
  - 验证告警响应流程的有效性
  - 根据新需求调整监控策略
```

---

## 相关文档

- [MONITORING-METRICS.md](./MONITORING-METRICS.md) - 关键指标定义
- [MONITORING-DASHBOARD.md](./MONITORING-DASHBOARD.md) - 仪表板和数据收集
- [CI-CD.md](./CI-CD.md) - CI/CD 规范

---

**最后更新**: 2026-02-11  
**维护者**: [需要项目团队确定]
