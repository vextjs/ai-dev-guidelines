# 用户原始输入

> 这是用户向 AI 提出的原始需求

---

## 用户输入

```
在 user-service 项目添加限流功能，每个用户每分钟最多 100 个请求
```

---

## 背景信息

### 项目信息
- **项目名称**: user-service
- **技术栈**: Express + MongoDB + TypeScript
- **Node.js**: >=18.0.0

### 现有目录结构
```
user-service/
├── package.json
├── tsconfig.json
├── src/
│   ├── app.ts
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   └── middleware/
├── config/
├── test/
└── types/
```

### 用户期望
- 使用现有的 MongoDB 作为限流存储
- 支持按用户 ID 限流
- 配置化，不同环境可设置不同限制
- 限流后返回 429 状态码

---

## AI 应该做的

1. 识别为"需求开发"任务
2. 执行 `workflows/01-requirement-dev/` 流程
3. 生成完整的文档和代码
4. 运行验证确保无错误

---

**记录时间**: 2026-02-12

