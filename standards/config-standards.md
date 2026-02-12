# 配置规范

> 应用配置管理最佳实践

---

## 📋 环境变量命名规范

### 命名规则

```yaml
格式: UPPER_SNAKE_CASE

规则:
  - 全部大写字母
  - 单词间使用下划线分隔
  - 添加模块前缀（推荐）
  - 布尔值使用 true/false 字符串

示例:
  ✅ 正确:
    DATABASE_URI=mongodb://localhost:27017/app
    REDIS_HOST=localhost
    REDIS_PORT=6379
    API_BASE_URL=https://api.example.com
    ENABLE_CACHE=true
    NODE_ENV=production
    
  ❌ 错误:
    databaseUri=...           # 小写
    database-uri=...          # 连字符
    DATABASE_uri=...          # 混合大小写
```

### 常用前缀

```yaml
数据库相关:
  - DB_*, DATABASE_*
  - MONGODB_*, MYSQL_*, POSTGRES_*
  - REDIS_*

API 相关:
  - API_*
  - SERVICE_*
  - EXTERNAL_*

认证相关:
  - AUTH_*
  - JWT_*
  - OAUTH_*

应用相关:
  - APP_*
  - SERVER_*
  - NODE_*

日志相关:
  - LOG_*
  - LOGGER_*
```

---

## 🔧 配置文件分层

### 分层策略

```yaml
层级（优先级从低到高）:
  1. default（默认配置）
  2. {env}（环境配置）
  3. local（本地覆盖）

文件结构:
  config/
  ├── default.json         # 默认配置（所有环境共享）
  ├── development.json     # 开发环境
  ├── test.json           # 测试环境
  ├── staging.json        # 预发环境
  ├── production.json     # 生产环境
  └── local.json          # 本地覆盖（不提交到 Git）
```

### 配置加载顺序

```typescript
// 使用 config 库示例
import config from 'config';

// 加载顺序: default → {NODE_ENV} → local
// 最终配置 = merge(default, {NODE_ENV}, local)

const dbConfig = config.get('database');
const apiKey = config.get('api.key');
```

### 配置示例

```json
// config/default.json
{
  "server": {
    "port": 3000,
    "host": "0.0.0.0"
  },
  "database": {
    "host": "localhost",
    "port": 27017,
    "name": "app"
  },
  "cache": {
    "enabled": true,
    "ttl": 3600
  },
  "log": {
    "level": "info",
    "format": "json"
  }
}

// config/development.json
{
  "server": {
    "port": 3001
  },
  "database": {
    "name": "app_dev"
  },
  "log": {
    "level": "debug",
    "format": "pretty"
  }
}

// config/production.json
{
  "server": {
    "port": 8080
  },
  "database": {
    "host": "${DATABASE_HOST}",
    "port": "${DATABASE_PORT}",
    "name": "${DATABASE_NAME}"
  },
  "log": {
    "level": "warn",
    "format": "json"
  }
}
```

---

## 📄 .env 文件管理规范

### 文件命名

```yaml
标准文件:
  .env                # 生产环境模板（不包含真实值）
  .env.example        # 示例文件（提交到 Git）
  .env.local          # 本地开发（不提交）
  .env.development    # 开发环境（不提交）
  .env.test           # 测试环境（不提交）
  .env.production     # 生产环境（不提交）
```

### .env.example 模板

```bash
# .env.example
# 复制此文件为 .env.local 并填入真实值

# 数据库配置
DATABASE_URI=mongodb://localhost:27017/app
DATABASE_NAME=app_dev

# Redis 配置
REDIS_HOST=localhost
REDIS_PORT=6379

# API 配置
API_KEY=your_api_key_here
API_SECRET=your_api_secret_here

# JWT 配置
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRES_IN=7d

# 应用配置
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
```

### .env 使用规范

```typescript
// 加载环境变量
import dotenv from 'dotenv';
import path from 'path';

// 根据环境加载不同文件
const envFile = process.env.NODE_ENV === 'production'
  ? '.env.production'
  : '.env.local';

dotenv.config({ path: path.resolve(process.cwd(), envFile) });

// 验证必需的环境变量
const requiredEnvVars = [
  'DATABASE_URI',
  'JWT_SECRET',
  'API_KEY',
];

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}
```

---

## 🔒 敏感配置处理

### 禁止提交的配置

```yaml
绝对禁止提交:
  - 数据库密码
  - API 密钥
  - JWT 密钥
  - OAuth 密钥
  - 加密密钥
  - 第三方服务凭证
  - 生产环境配置文件

.gitignore 配置:
  # 敏感配置文件
  .env
  .env.local
  .env.*.local
  config/local.json
  config/production.json
  secrets/
```

### 敏感配置存储方案

```yaml
方案 1: 环境变量（推荐）
  优点: 简单、标准
  缺点: 不适合复杂配置
  使用: 开发、测试环境

方案 2: 密钥管理服务
  工具: AWS Secrets Manager, Azure Key Vault, HashiCorp Vault
  优点: 安全、审计、版本控制
  缺点: 需要额外服务
  使用: 生产环境

方案 3: 加密配置文件
  工具: git-crypt, ansible-vault
  优点: 可提交到 Git
  缺点: 需要密钥管理
  使用: 团队协作
```

### 配置加密示例

```typescript
// 使用 crypto 加密配置
import crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = crypto.scryptSync(process.env.CONFIG_KEY!, 'salt', 32);

function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedData] = encrypted.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

---

## 📝 配置变更审计

### 变更记录

```yaml
必须记录:
  - 变更时间
  - 变更人
  - 变更内容
  - 变更原因
  - 影响范围

记录方式:
  - Git commit（配置文件）
  - CHANGELOG（重要变更）
  - 配置管理系统日志
```

### 变更审批流程

```yaml
开发环境:
  审批: 不需要
  通知: 团队消息

测试环境:
  审批: Team Lead
  通知: 开发团队

生产环境:
  审批: Team Lead + Tech Lead
  通知: 全体相关人员
  备份: 变更前备份配置
  回滚: 准备回滚方案
```

---

## 🔄 配置加载顺序

### 标准加载顺序

```yaml
顺序（优先级从低到高）:
  1. 应用默认值（代码中的默认值）
  2. 配置文件 default
  3. 配置文件 {NODE_ENV}
  4. 环境变量
  5. 配置文件 local
  6. 命令行参数（最高优先级）
```

### 配置合并策略

```typescript
// 配置合并示例
import { merge } from 'lodash';

interface Config {
  database: {
    host: string;
    port: number;
    name: string;
  };
  api: {
    timeout: number;
    retries: number;
  };
}

// 1. 应用默认值
const defaultConfig: Config = {
  database: {
    host: 'localhost',
    port: 27017,
    name: 'app',
  },
  api: {
    timeout: 5000,
    retries: 3,
  },
};

// 2. 加载配置文件
const fileConfig = loadConfigFile(`config/${NODE_ENV}.json`);

// 3. 加载环境变量
const envConfig = {
  database: {
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || '27017'),
    name: process.env.DATABASE_NAME,
  },
};

// 4. 合并配置（深度合并）
const finalConfig = merge({}, defaultConfig, fileConfig, envConfig);
```

---

## 🌍 多环境配置管理

### 环境定义

```yaml
开发环境 (development):
  特点: 宽松、调试模式
  数据: 测试数据
  日志: debug 级别
  缓存: 禁用或短期

测试环境 (test):
  特点: 隔离、可重置
  数据: Mock 数据
  日志: info 级别
  缓存: 禁用

预发环境 (staging):
  特点: 接近生产
  数据: 生产副本
  日志: warn 级别
  缓存: 启用

生产环境 (production):
  特点: 高可用、性能优先
  数据: 真实数据
  日志: error 级别
  缓存: 启用+优化
```

### 环境切换

```typescript
// 环境检测
const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// 条件配置
const config = {
  database: {
    host: process.env.DATABASE_HOST || 'localhost',
    debug: isDevelopment, // 仅开发环境启用调试
  },
  logger: {
    level: isProduction ? 'error' : 'debug',
    pretty: !isProduction, // 生产环境使用 JSON 格式
  },
  cache: {
    enabled: !isTest, // 测试环境禁用缓存
    ttl: isProduction ? 3600 : 60,
  },
};
```

---

## ✅ 配置验证

### 运行时验证

```typescript
// 使用 Joi 进行配置验证
import Joi from 'joi';

const configSchema = Joi.object({
  database: Joi.object({
    host: Joi.string().hostname().required(),
    port: Joi.number().port().required(),
    name: Joi.string().required(),
  }).required(),
  
  api: Joi.object({
    key: Joi.string().min(32).required(),
    timeout: Joi.number().min(1000).max(30000).default(5000),
  }).required(),
  
  server: Joi.object({
    port: Joi.number().port().required(),
    host: Joi.string().ip().default('0.0.0.0'),
  }).required(),
});

// 验证配置
const { error, value } = configSchema.validate(config, {
  abortEarly: false, // 返回所有错误
  stripUnknown: true, // 移除未知字段
});

if (error) {
  console.error('❌ 配置验证失败:');
  error.details.forEach((detail) => {
    console.error(`  - ${detail.path.join('.')}: ${detail.message}`);
  });
  process.exit(1);
}

export default value;
```

---

## 📎 相关文档

- [安全规范](./security-standards.md)
- [脚本规范](./script-standards.md)

---

**最后更新**: 2026-02-12
