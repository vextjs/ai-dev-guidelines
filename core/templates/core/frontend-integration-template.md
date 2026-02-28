# 前端对接文档模板

> [功能名称] 前端对接指南

- **项目**: <project-name>
- **后端版本**: v1.0.0
- **创建日期**: YYYY-MM-DD
- **负责人**: [姓名]
- **状态**: 🔵 草稿 / 🟡 评审中 / 🟢 已发布

---

## 📋 概述

### 功能描述
[简要描述该功能的作用和目的]

### 涉及的接口
| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/v1/xxx` | POST | 创建 xxx |
| `/api/v1/xxx/:id` | GET | 获取 xxx |
| `/api/v1/xxx/:id` | PUT | 更新 xxx |
| `/api/v1/xxx/:id` | DELETE | 删除 xxx |

---

## 🔗 接口调用示例

### 1. [接口名称]

#### 请求
```typescript
// 使用 fetch
const response = await fetch('/api/v1/xxx', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    field1: 'value1',
    field2: 'value2'
  })
});

const data = await response.json();
```

#### 成功响应
```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": "xxx",
    "field1": "value1",
    "field2": "value2",
    "createdAt": "2026-02-12T00:00:00Z"
  }
}
```

#### 错误响应
```json
{
  "code": 40001,
  "message": "参数错误: field1 不能为空",
  "data": null
}
```

---

## 📊 数据结构

### 请求参数

| 字段 | 类型 | 必填 | 说明 | 示例 |
|------|------|------|------|------|
| field1 | string | ✅ | 字段1说明 | "value1" |
| field2 | number | ❌ | 字段2说明 | 100 |
| field3 | boolean | ❌ | 字段3说明 | true |

### 响应数据

| 字段 | 类型 | 说明 | 示例 |
|------|------|------|------|
| code | number | 状态码，0 表示成功 | 0 |
| message | string | 状态描述 | "success" |
| data | object | 业务数据 | {...} |

### TypeScript 类型定义

```typescript
// 请求参数
interface CreateXxxRequest {
  field1: string;
  field2?: number;
  field3?: boolean;
}

// 响应数据
interface XxxResponse {
  id: string;
  field1: string;
  field2: number;
  field3: boolean;
  createdAt: string;
  updatedAt: string;
}

// API 响应包装
interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}
```

---

## 🎨 UI 实现要点

### 页面结构
```
页面
├── 头部区域
│   ├── 标题
│   └── 操作按钮
├── 主体区域
│   ├── 表单/列表
│   └── 分页
└── 底部区域
    └── 操作栏
```

### 状态管理

```typescript
// 推荐的状态结构
interface XxxState {
  // 数据
  list: XxxResponse[];
  detail: XxxResponse | null;
  
  // 加载状态
  loading: boolean;
  submitting: boolean;
  
  // 分页
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  
  // 错误
  error: string | null;
}
```

### 交互流程

```
用户操作 → 调用 API → 显示 Loading → 处理响应
                                    ↓
                              成功 → 更新状态 → 提示成功
                              失败 → 显示错误 → 允许重试
```

---

## ⚠️ 注意事项

### 鉴权要求
- 所有接口需要在 Header 中携带 `Authorization: Bearer <token>`
- Token 过期返回 401，需要刷新 Token 或重新登录

### 错误处理
| 错误码 | 说明 | 前端处理 |
|--------|------|---------|
| 0 | 成功 | 正常处理 |
| 40001 | 参数错误 | 显示具体错误信息 |
| 40101 | 未授权 | 跳转登录页 |
| 40301 | 无权限 | 显示无权限提示 |
| 50001 | 服务器错误 | 显示通用错误提示 |

### 性能优化
- [ ] 列表数据使用分页加载
- [ ] 大量数据使用虚拟滚动
- [ ] 频繁请求使用防抖/节流
- [ ] 重复请求使用缓存

---

## 📝 更新记录

| 日期 | 版本 | 变更内容 | 作者 |
|------|------|---------|------|
| YYYY-MM-DD | v1.0.0 | 初始版本 | [姓名] |

---

**文档版本**: 1.0  
**模板来源**: ai-dev-guidelines/core/templates/core/frontend-integration-template.md

