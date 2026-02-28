# 创建项目 AI 标题异步化 — 优化记录

> **任务 ID**: OPT-001  
> **项目**: chat  
> **接口**: `POST /home/trip_project`  
> **日期**: 2026-02-28  
> **状态**: ✅ 已执行（待验证效果）

---

## 一、问题与基线

| 指标 | 场景 | 优化前 | 优化后（预期） |
|------|------|--------|-------------|
| 接口响应时间 | 传入 title（触发 AI） | 2000~10000ms | **<500ms** |
| 接口响应时间 | 传入 project_name | <500ms | <500ms（不变） |
| LLM 调用 | TripNameAgent | 同步阻塞主链路 | 异步，不阻塞 |

**瓶颈位置**：`TripProjectController.ts` `create()` 方法中 `await baseChatService.run(TripNameAgent, ...)` 同步调用 LLM，阻塞 2~10s。

**调用链路（优化前）**：
```
HTTP 请求 → 订阅检查 → [阻塞 2~10s] await LLM(title) → 创建项目 → 响应
```

---

## 二、方案选择

| 方案 | 改动量 | 可靠性 | 选择 |
|------|--------|--------|------|
| **A. setImmediate 异步** | 极小（1 文件 <20 行） | 中（失败降级为原始标题） | ✅ 选择 |
| B. Egg Schedule 定时扫描 | 中（新增 schedule + 字段） | 高 | — |
| C. Redis 队列 + Worker | 大 | 很高 | — |

**选择理由**：LLM 失败时 title 保留用户原始输入（有效降级），进程重启概率极低，方案 A 足够。

---

## 三、实施内容

**修改文件**：`chat/app/controller/home/TripProjectController.ts`

**核心改动**：

1. 移除同步 `await LLM()` 调用
2. 保存原始标题 `rawTitle`，用原始值直接创建项目
3. `ctx.body` 赋值后，通过 `setImmediate` 异步调用 LLM 并更新标题

**调用链路（优化后）**：
```
HTTP 请求 → 订阅检查 → 用原始 title 创建项目 → 响应（<500ms）
                                                    ↓（异步）
                                              LLM(rawTitle) → 更新 title
```

**关键实现要点**：
- 提前捕获 `tripProjectService`、`baseChatService`、`logger`、`language` 引用（避免 ctx 生命周期问题）
- `try/catch` 静默处理 LLM 失败，title 保留原始输入
- 不影响后续 marketing / 模板复制等逻辑

---

## 四、风险评估

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| LLM 超时/失败 | 中 | 低 | catch 静默 + logger.error |
| ctx 生命周期 | 低 | 中 | 提前捕获 service 引用 |
| 进程重启丢失 | 极低 | 低 | 可接受；后续可升级方案 B |

---

## 五、待验证

- [ ] 本地启动服务，传入 `title` 调用接口，确认响应时间 <500ms
- [ ] 等待几秒后查询项目，确认标题已被 AI 更新
- [ ] 模拟 LLM 超时，确认降级保留原始标题

