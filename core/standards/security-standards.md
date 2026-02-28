# 安全规范

> 代码安全检查和最佳实践

---

## 🚨 敏感信息检测（10 种）

| # | 类型 | 检测模式 | 处理方式 |
|---|-----|---------|---------|
| 1 | API 密钥 | sk-*, api_key=* | 使用环境变量 |
| 2 | 数据库密码 | password=*, pwd=* | 使用环境变量 |
| 3 | 私钥 | -----BEGIN PRIVATE KEY----- | 外部文件 |
| 4 | Token | token=*, bearer * | 使用环境变量 |
| 5 | 连接字符串 | mongodb://*, mysql://* | 使用环境变量 |
| 6 | AWS 凭证 | AKIA*, aws_secret_* | 使用环境变量 |
| 7 | JWT 密钥 | jwt_secret=* | 使用环境变量 |
| 8 | 加密密钥 | encryption_key=* | 使用环境变量 |
| 9 | OAuth 密钥 | client_secret=* | 使用环境变量 |
| 10 | Webhook 密钥 | webhook_secret=* | 使用环境变量 |

---

## 🔒 常见安全漏洞

### SQL/NoSQL 注入

```yaml
问题:
  // ❌ 危险
  const query = { name: req.query.name };
  
解决:
  // ✅ 安全
  const name = typeof req.query.name === 'string' 
    ? req.query.name.trim() 
    : '';
  const query = { name };
```

### XSS 攻击

```yaml
问题:
  // ❌ 危险
  res.send(`<h1>${userInput}</h1>`);
  
解决:
  // ✅ 安全
  import escape from 'escape-html';
  res.send(`<h1>${escape(userInput)}</h1>`);
```

### CSRF 攻击

```yaml
解决:
  - 使用 CSRF Token
  - 验证 Origin/Referer
  - 使用 SameSite Cookie
```

---

## ✅ 安全检查清单

### 输入验证

```yaml
必须:
  - 验证所有用户输入
  - 使用白名单而非黑名单
  - 限制输入长度
  - 转义特殊字符
```

### 认证授权

```yaml
必须:
  - 使用 HTTPS
  - 安全存储密码（bcrypt）
  - Token 设置过期时间
  - 实现最小权限原则
```

### 错误处理

```yaml
必须:
  - 不暴露堆栈信息
  - 使用通用错误消息
  - 记录详细日志
```

---

## 🌐 OWASP Top 10 对照

| # | 风险类型 | 检查要点 | 防护措施 |
|---|---------|---------|---------|
| A01 | 访问控制失效 | 权限绕过、越权访问 | RBAC、资源级权限检查 |
| A02 | 加密失败 | 明文存储、弱加密 | AES-256、bcrypt |
| A03 | 注入攻击 | SQL/NoSQL/命令注入 | 参数化查询、输入验证 |
| A04 | 不安全设计 | 业务逻辑缺陷 | 威胁建模、安全设计评审 |
| A05 | 安全配置错误 | 默认配置、调试开启 | 安全基线、配置审计 |
| A06 | 组件漏洞 | 过期依赖、已知漏洞 | 定期更新、漏洞扫描 |
| A07 | 认证失败 | 弱密码、会话固定 | MFA、安全的会话管理 |
| A08 | 数据完整性 | 不安全反序列化 | 签名验证、类型检查 |
| A09 | 日志监控不足 | 缺少审计日志 | 完整日志、异常告警 |
| A10 | SSRF | 服务端请求伪造 | URL 白名单、网络隔离 |

---

## 🔍 依赖安全扫描

### npm audit

```bash
# 检查漏洞
npm audit

# 自动修复
npm audit fix

# 强制修复（可能破坏性更新）
npm audit fix --force

# 生成报告
npm audit --json > audit-report.json
```

### 扫描工具推荐

| 工具 | 用途 | 使用方式 |
|-----|------|---------|
| npm audit | npm 依赖扫描 | `npm audit` |
| Snyk | 全面漏洞扫描 | `snyk test` |
| OWASP Dependency-Check | 多语言支持 | CLI/CI 集成 |
| Trivy | 容器扫描 | `trivy fs .` |

### CI/CD 集成

```yaml
# GitHub Actions 示例
name: Security Scan
on: [push, pull_request]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm audit --audit-level=high
```

---

## 🛡️ 敏感数据处理

### 数据分类

| 级别 | 类型 | 处理要求 |
|-----|------|---------|
| L1 | 公开数据 | 无特殊要求 |
| L2 | 内部数据 | 访问控制 |
| L3 | 敏感数据 | 加密存储、审计日志 |
| L4 | 机密数据 | 加密传输、最小授权 |

### 处理原则

```yaml
存储:
  - 密码使用 bcrypt（成本因子≥12）
  - 敏感字段使用 AES-256 加密
  - 不存储不需要的敏感数据

传输:
  - 强制使用 HTTPS
  - API 响应脱敏（手机号、邮箱）
  - 日志中不记录敏感信息

销毁:
  - 定期清理过期数据
  - 删除时彻底清除（非软删除）
```

---

## 📎 相关文档

- [代码规范](./code-standards.md)
- [API 规范](./api-standards.md)

---

**最后更新**: 2026-02-12
