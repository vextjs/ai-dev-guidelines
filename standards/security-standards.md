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

## 📎 相关文档

- [代码规范](./code-standards.md)
- [API 规范](./api-standards.md)

---

**最后更新**: 2026-02-12

