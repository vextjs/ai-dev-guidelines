# 验证清单（125 个功能 · 16 分类）

> ⏳ 待验证 · 🔄 验证中 · ✅ 已通过 · ⚠️ 有问题 · ➖ 无对应项  
> 验证完成后在"验证文档"列填写 `validation/checklists/` 下的文件名

---

## A0. 操作层入口与内部工具（10）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| A0-1 | MongoDB 操作主类 | 代码 `mongodb/index.js` | — | ⏳ |
| A0-2 | MongoDB 连接封装 | 代码 `mongodb/connect.js` · 测试 基础设施 `mongodb-connect` | — | ⏳ |
| A0-3 | 查询入口聚合 | 代码 `mongodb/queries/index.js` | — | ⏳ |
| A0-4 | 写操作入口聚合 | 代码 `mongodb/writes/index.js` | — | ⏳ |
| A0-5 | 管理操作入口 | 代码 `mongodb/management/index.js` | — | ⏳ |
| A0-6 | 聚合管道工具 | 代码 `mongodb/common/agg-pipeline.js` | — | ⏳ |
| A0-7 | 聚合管道验证 | 代码 `mongodb/common/aggregation-validator.js` | — | ⏳ |
| A0-8 | 实例 ID 生成 | 代码 `mongodb/common/iid.js` | — | ⏳ |
| A0-9 | 字典序表达式 | 代码 `mongodb/common/lexicographic-expr.js` | — | ⏳ |
| A0-10 | 排序 + 事务感知 | 代码 `mongodb/common/sort.js` `transaction-aware.js` | — | ⏳ |

---

## A. 查询操作（12）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| A1 | find | 代码 `mongodb/queries/find.js` · 文档 `find.md` · 测试 功能 `find` | — | ⏳ |
| A2 | findOne | 代码 `mongodb/queries/find-one.js` · 文档 `findOne.md` · 测试 功能 `findOne` | — | ⏳ |
| A3 | findOneById | 代码 `mongodb/queries/find-one-by-id.js` · 文档 `find-one-by-id.md` · 测试 功能 `findOneById` | — | ⏳ |
| A4 | findByIds | 代码 `mongodb/queries/find-by-ids.js` · 文档 `find-by-ids.md` · 测试 功能 `findByIds` | — | ⏳ |
| A5 | findPage | 代码 `mongodb/queries/find-page.js` · 文档 `findPage.md` · 测试 功能 `findPage` `findPage-supplement` | — | ⏳ |
| A6 | findAndCount | 代码 `mongodb/queries/find-and-count.js` · 文档 `find-and-count.md` · 测试 功能 `findAndCount` | — | ⏳ |
| A7 | count | 代码 `mongodb/queries/count.js` · 文档 `count.md` · 测试 功能 `count` | — | ⏳ |
| A8 | distinct | 代码 `mongodb/queries/distinct.js` · 文档 `distinct.md` · 测试 功能 `distinct` | — | ⏳ |
| A9 | aggregate | 代码 `mongodb/queries/aggregate.js` · 文档 `aggregate.md` · 测试 功能 `aggregate` | — | ⏳ |
| A10 | chain（链式调用） | 代码 `mongodb/queries/chain.js` · 文档 `chaining-api.md` `chaining-methods.md` `chain-api-implementation.md` · 测试 功能 `chaining` | — | ⏳ |
| A11 | watch | 代码 `mongodb/queries/watch.js` · 文档 `watch.md` · 测试 查询 `watch` · 集成 `watch` | — | ⏳ |
| A12 | explain | 文档 `explain.md` · 测试 功能 `explain` | — | ⏳ |

---

## B. 写入操作（21）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| B1 | insertOne | 代码 `mongodb/writes/insert-one.js` · 文档 `insert-one.md` · 测试 功能 `insertOne` | — | ⏳ |
| B2 | insertMany | 代码 `mongodb/writes/insert-many.js` · 文档 `insert-many.md` · 测试 功能 `insertMany` | — | ⏳ |
| B3 | insertBatch | 代码 `mongodb/writes/insert-batch.js` · 文档 `insertBatch.md` · 测试 功能 `insertBatch` | — | ⏳ |
| B4 | updateOne | 代码 `mongodb/writes/update-one.js` · 文档 `update-one.md` · 测试 功能 `updateOne` | — | ⏳ |
| B5 | updateMany | 代码 `mongodb/writes/update-many.js` · 文档 `update-many.md` · 测试 功能 `updateMany` | — | ⏳ |
| B6 | updateBatch | 代码 `mongodb/writes/update-batch.js` · 文档 `updateBatch.md` · 测试 功能 `updateBatch` | — | ⏳ |
| B7 | replaceOne | 代码 `mongodb/writes/replace-one.js` · 文档 `replace-one.md` · 测试 功能 `replaceOne` | — | ⏳ |
| B8 | upsertOne | 代码 `mongodb/writes/upsert-one.js` · 文档 `upsert-one.md` `upsert-guide.md` `quick-upsert.md` · 测试 功能 `upsertOne` | — | ⏳ |
| B9 | incrementOne | 代码 `mongodb/writes/increment-one.js` · 文档 `increment-one.md` · 测试 功能 `incrementOne` | — | ⏳ |
| B10 | deleteOne | 代码 `mongodb/writes/delete-one.js` · 文档 `delete-one.md` · 测试 功能 `deleteOne` | — | ⏳ |
| B11 | deleteMany | 代码 `mongodb/writes/delete-many.js` · 文档 `delete-many.md` · 测试 功能 `deleteMany` | — | ⏳ |
| B12 | deleteBatch | 代码 `mongodb/writes/delete-batch.js` · 文档 `deleteBatch.md` · 测试 功能 `deleteBatch` | — | ⏳ |
| B13 | findOneAndUpdate | 代码 `mongodb/writes/find-one-and-update.js` · 文档 `find-one-and-update.md` · 测试 功能 `findOneAndUpdate` | — | ⏳ |
| B14 | findOneAndDelete | 代码 `mongodb/writes/find-one-and-delete.js` · 文档 `find-one-and-delete.md` · 测试 功能 `findOneAndDelete` | — | ⏳ |
| B15 | findOneAndReplace | 代码 `mongodb/writes/find-one-and-replace.js` · 文档 `find-one-and-replace.md` · 测试 功能 `findOneAndReplace` | — | ⏳ |
| B16 | Update 聚合管道 | 代码 `mongodb/writes/update-one.js` · 文档 `update-aggregation.md` · 测试 功能 `update-aggregation-pipeline` | — | ⏳ |
| B17 | 写操作结果处理 | 代码 `mongodb/writes/result-handler.js` · 测试 工具 `result-handler` | — | ⏳ |
| B18 | 批量重试工具 | 代码 `mongodb/writes/common/batch-retry.js` | — | ⏳ |
| B19 | 写操作缓存失效 | 测试 功能 `invalidate` · 写入 `update-cache-invalidation` | — | ⏳ |
| B20 | 写操作综合指南 | 文档 `write-operations.md` `update-operations.md` | — | ⏳ |
| B21 | findOneAnd* 返回值统一 | 代码 `mongodb/writes/find-one-and-*.js` · 文档 `findOneAnd-return-value-unified.md` | — | ⏳ |

---

## C. 缓存系统（8）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| C1 | 内存缓存（LRU） | 代码 `cache.js` · 文档 `cache.md` `cache-implementation.md` · 测试 基础设施 `cache` | — | ⏳ |
| C2 | Redis 缓存适配器 | 代码 `redis-cache-adapter.js` · 测试 基础设施 `redis-cache-adapter` `redis-cache` | — | ⏳ |
| C3 | 多级缓存 | 代码 `multi-level-cache.js` · 测试 基础设施 `multi-level-cache-distributed` | — | ⏳ |
| C4 | 缓存失效 | 代码 `cache-invalidation.js` `cache-invalidation/` · 测试 基础设施 `cache-invalidation` | — | ⏳ |
| C5 | 分布式缓存失效 | 代码 `distributed-cache-invalidator.js` · 文档 `distributed-deployment.md` `distributed-deployment-quickref.md` · 测试 基础设施 `distributed-cache-invalidator` · 集成 `distributed-cache-invalidation` | — | ⏳ |
| C6 | 函数缓存 | 代码 `function-cache.js` · 文档 `function-cache.md` · 测试 单元 `function-cache` `function-cache-redis` | — | ⏳ |
| C7 | 缓存键构建 | 代码 `mongodb/common/accessor-helpers.js` | — | ⏳ |
| C8 | ObjectId 缓存键标准化 | 代码 `utils/objectid-converter.js` · 文档 `objectid-auto-convert.md` `objectid-conversion-scope.md` `objectid-cross-version.md` `objectid-cross-version-faq.md` `objectid-logging-optimization.md` · 测试 工具 `objectid-cross-version` · 根级 `objectid-conversion` | — | ⏳ |

---

## D. 连接与基础设施（9）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| D1 | 基本连接 | 代码 `connect.js` `index.js` · 文档 `connection.md` · 测试 基础设施 `connection` `mongodb-connect` | `connect.md` | ✅ |
| D2 | 多连接池 | 代码 `infrastructure/ConnectionPoolManager.js` · 文档 `multi-pool.md` `multi-pool-health-check.md` · 测试 基础设施 `connection-pool-manager` `connection-pool-manager-complete` `connection-pool-manager-errors` `connection-pool-manager-ultimate` `multi-pool-100-percent-final` `multi-pool-100-percent-supplement` `multi-pool-100-percent-ultimate` · 集成 `multi-pool-basic` `multi-pool-advanced` | `multi-pool.md` | ✅ |
| D3 | 连接池配置 | 代码 `infrastructure/PoolConfig.js` · 测试 基础设施 `pool-config-stats` | — | ⏳ |
| D4 | 连接池选择策略 | 代码 `infrastructure/PoolSelector.js` · 测试 基础设施 `pool-selector` | — | ⏳ |
| D5 | 连接池统计 | 代码 `infrastructure/PoolStats.js` · 测试 基础设施 `pool-config-stats` | — | ⏳ |
| D6 | 健康检查 | 代码 `infrastructure/HealthChecker.js` · 文档 `multi-pool-health-check.md` · 测试 基础设施 `health-checker` `health-checker-complete` | — | ⏳ |
| D7 | SSH 隧道 | 代码 `infrastructure/ssh-tunnel.js` `ssh-tunnel-ssh2.js` · 文档 `ssh-tunnel.md` · 测试 基础设施 `ssh-tunnel-ssh2` | — | ⏳ |
| D8 | URI 解析器 | 代码 `infrastructure/uri-parser.js` · 测试 基础设施 `uri-parser` | — | ⏳ |
| D9 | 主入口（MonSQLize 类） | 代码 `index.js` · 文档 `connection.md` · 测试 基础设施 `index` | — | ⏳ |

---

## E. 事务系统（6）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| E1 | 基本事务 | 代码 `transaction/Transaction.js` `TransactionManager.js` `index.js` · 文档 `transaction.md` `transaction-optimizations.md` · 测试 功能 `transaction-basic` `transaction-unit` · 集成 `transaction` `transaction-optimizations` | — | ⏳ |
| E2 | 缓存锁管理 | 代码 `transaction/CacheLockManager.js` | — | ⏳ |
| E3 | 分布式缓存锁 | 代码 `transaction/DistributedCacheLockManager.js` | — | ⏳ |
| E4 | Saga 编排器 | 代码 `saga/SagaOrchestrator.js` `index.js` · 文档 `saga-transaction.md` `saga-advanced.md` · 测试 Saga `orchestrator` `orchestrator-redis` | — | ⏳ |
| E5 | Saga 执行器 | 代码 `saga/SagaExecutor.js` `SagaDefinition.js` `SagaContext.js` · 测试 Saga `executor` `context` | — | ⏳ |
| E6 | 业务锁 | 代码 `lock/Lock.js` `errors.js` `index.js` · 文档 `business-lock.md` · 测试 锁 `business-lock` | — | ⏳ |

---

## F. Model 层（11）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| F1 | Model 基础 | 代码 `model/index.js` · 文档 `model.md` · 测试 Model `model` `model-integration` `model-instance` `model-advanced` `model-edge-cases` `model-error-handling` `model-coverage-100` `model-features-100` `model-final-100` | — | ⏳ |
| F2 | Schema 验证 | 代码 `model/index.js` · 文档 `model.md` · 测试 Model `model-schema-validation` | — | ⏳ |
| F3 | 生命周期 Hooks | 代码 `model/features/` · 文档 `hooks.md` · 测试 Model `model-hooks` | — | ⏳ |
| F4 | Populate | 代码 `model/features/populate.js` · 文档 `populate.md` · 测试 Model `model-populate` `model-populate-advanced` `model-populate-errors` `model-populate-integration` `model-populate-logic` `model-findandcount-populate` `model-findbyids-populate` `model-integrate-populate` | — | ⏳ |
| F5 | 嵌套 Populate | 文档 `model/nested-populate.md` · 测试 Model `model-nested-populate` | — | ⏳ |
| F6 | Relations | 代码 `model/features/relations.js` · 文档 `relations.md` `model/relations.md` `model/relations-quickstart.md` · 测试 Model `model-relations` `model-relations-edge-cases` | — | ⏳ |
| F7 | 软删除 | 代码 `model/features/soft-delete.js` · 测试 Model `model-soft-delete` · 集成 Model `model-soft-delete-db` | — | ⏳ |
| F8 | 版本控制 | 代码 `model/features/version.js` · 测试 Model `model-version` · 集成 Model `model-version-db` `model-version-complete` | — | ⏳ |
| F9 | 虚拟字段+默认值+时间戳 | 代码 `model/features/virtuals.js` `defaults.js` · 测试 Model `model-virtuals-defaults` `model-timestamps` | — | ⏳ |
| F10 | Model 自动加载 | 代码 `index.js` · 测试 Model `model-auto-load` | — | ⏳ |
| F11 | Model 示例 | 代码 `model/examples/test.js` | — | ⏳ |

---

## G. 表达式系统（5）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| G1 | 表达式入口+工厂 | 代码 `expression/index.js` `factory.js` · 文档 `expression-functions.md` · 测试 功能 `expression-date-advanced` | — | ⏳ |
| G2 | 操作符检测 | 代码 `expression/detector.js` · 测试 表达式核心 `detection` | — | ⏳ |
| G3 | 表达式编译器 | 代码 `expression/compiler/ExpressionCompiler.js` `ExpressionCompilerExtensions.js` | — | ⏳ |
| G4 | 表达式缓存 | 代码 `expression/cache/ExpressionCache.js` | — | ⏳ |
| G5 | 操作符（122 个） | 代码 `operators.js` · 文档 `expression-functions.md` · 测试 表达式操作符 `aggregation` `arithmetic` `array` `array-advanced` `conditional` `date` `edge-cases` `group` `high-frequency` `math` `string` `string-advanced` · 表达式错误 `error-handling` · 表达式兼容 `backward-compatibility` · 表达式性能 `performance` | — | ⏳ |

---

## H. 管理操作（7）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| H1 | 索引管理 | 代码 `mongodb/management/index-ops.js` · 文档 `create-index.md` `create-indexes.md` `list-indexes.md` `drop-index.md` · 测试 功能 `indexes` | — | ⏳ |
| H2 | 集合管理 | 代码 `mongodb/management/collection-ops.js` · 文档 `collection-management.md` · 测试 基础设施 `collection-mgmt` | — | ⏳ |
| H3 | 数据库管理 | 代码 `mongodb/management/database-ops.js` · 文档 `database-ops.md` · 测试 基础设施 `database` | — | ⏳ |
| H4 | Admin 操作 | 代码 `mongodb/management/admin-ops.js` · 文档 `admin.md` · 测试 基础设施 `admin` | — | ⏳ |
| H5 | 书签管理 | 代码 `mongodb/management/bookmark-ops.js` · 文档 `bookmarks.md` · 测试 功能 `bookmarks` | — | ⏳ |
| H6 | 缓存管理操作 | 代码 `mongodb/management/cache-ops.js` | — | ⏳ |
| H7 | 验证+命名空间 | 代码 `mongodb/management/validation-ops.js` `namespace.js` · 文档 `validation.md` · 测试 基础设施 `validation` | — | ⏳ |

---

## I. 数据同步（2）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| I1 | Change Stream 同步 | 代码 `sync/ChangeStreamSyncManager.js` `SyncConfig.js` `SyncTarget.js` `index.js` · 文档 `sync-backup.md` · 测试 同步 `config` | — | ⏳ |
| I2 | Resume Token 存储 | 代码 `sync/ResumeTokenStore.js` · 测试 同步 `token-store` `token-store-errors` | — | ⏳ |

---

## J. 慢查询日志（3）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| J1 | 慢查询日志核心 | 代码 `common/log.js` `runner.js` · 文档 `slow-query-log.md` · 测试 公共 `log` | — | ⏳ |
| J2 | 慢查询持久化 | 代码 `slow-query-log/index.js` `base-storage.js` `mongodb-storage.js` `batch-queue.js` `config-manager.js` `query-hash.js` · 测试 慢查询 `batch-queue` `config-manager` `query-hash` · 根级 `slow-query-log-comprehensive` `slow-query-log-integration` | — | ⏳ |
| J3 | 查询形状提取 | 代码 `mongodb/common/shape.js` `common/shape-builders.js` · 测试 公共 `shape-builders` · 工具 `shape-builders` | — | ⏳ |

---

## K. 公共工具（10）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| K1 | 错误码+工厂 | 代码 `errors.js` · 文档 `error-codes.md` · 测试 基础设施 `errors` | — | ⏳ |
| K2 | Logger | 代码 `logger.js` · 测试 基础设施 `logger` | — | ⏳ |
| K3 | 常量 | 代码 `constants.js` | — | ⏳ |
| K4 | 参数校验 | 代码 `common/validation.js` · 文档 `validation.md` · 测试 基础设施 `validation` · 工具 `validation` | — | ⏳ |
| K5 | 游标工具 | 代码 `common/cursor.js` · 测试 工具 `cursor` | — | ⏳ |
| K6 | 分页结果封装 | 代码 `common/page-result.js` · 测试 工具 `page-result` | — | ⏳ |
| K7 | 数据规范化 | 代码 `common/normalize.js` · 测试 工具 `normalize` | — | ⏳ |
| K8 | 命名空间工具 | 代码 `common/namespace.js` | — | ⏳ |
| K9 | Count 队列 | 代码 `count-queue.js` · 文档 `count-queue.md` · 测试 根级 `count-queue` | — | ⏳ |
| K10 | 其他工具 | 代码 `common/docs-urls.js` `index-options.js` `server-features.js` · 文档 `utilities.md` | — | ⏳ |

---

## L. 兼容性与模块（8）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| L1 | ESM 支持 | 根 `index.mjs` · 文档 `esm-support.md` · 测试 ESM `import.test.mjs` | — | ⏳ |
| L2 | TypeScript 类型 | 根 `index.d.ts` + `types/` · 测试 类型 `basic.test-d.ts` | — | ⏳ |
| L3 | 兼容性矩阵 | 文档 `COMPATIBILITY.md` `COMPATIBILITY-TESTING-GUIDE.md` · 测试 兼容性 `driver-versions` `node-versions` `server-versions` | — | ⏳ |
| L4 | Driver 兼容 | 文档 `mongodb-driver-compatibility.md` · 测试 兼容性 `driver-versions` | — | ⏳ |
| L5 | Node.js 兼容 | 文档 `node-version-testing-guide.md` · 测试 兼容性 `node-versions` | — | ⏳ |
| L6 | Server 兼容 | 测试 兼容性 `server-versions` | — | ⏳ |
| L7 | ObjectId 跨版本 | 文档 `objectid-cross-version.md` `objectid-cross-version-faq.md` · 测试 工具 `objectid-cross-version` | — | ⏳ |
| L8 | readPreference | 文档 `readPreference.md` | — | ⏳ |

---

## M. 综合性文档（8）

| # | 文档 | 说明 | 验证文档 | 状态 |
|---|------|------|---------|------|
| M1 | `INDEX.md` | 索引完整性、链接有效 | — | ⏳ |
| M2 | `mongodb-native-vs-extensions.md` | 对比表准确性 | — | ⏳ |
| M3 | `PROJECT-VISION.md` | 愿景与功能匹配 | — | ⏳ |
| M4 | `events.md` | 事件系统 | — | ⏳ |
| M5 | `MONGODB-MEMORY-SERVER.md` | 内存 MongoDB | — | ⏳ |
| M6 | 根 `README.md` | 项目 README | — | ⏳ |
| M7 | 根 `CHANGELOG.md` | 变更日志 | — | ⏳ |
| M8 | `distributed-deployment.md` `distributed-deployment-quickref.md` | 分布式部署 | — | ⏳ |

---

## N. 性能测试（2）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| N1 | 批量操作性能 | 测试 性能 `batch-operations-performance` | — | ⏳ |
| N2 | 函数缓存性能 | 测试 性能 `function-cache-performance` | — | ⏳ |

---

## O. 验证与回归（3）

| # | 功能 | 资源 | 验证文档 | 状态 |
|---|------|------|---------|------|
| O1 | 问题回归 | 测试 验证 `issues-verification` | — | ⏳ |
| O2 | Redis 功能 | 测试 验证 `monsqlize-redis-verification` | — | ⏳ |
| O3 | Redis 配置 | 测试 验证 `redis-config-verification` | — | ⏳ |

---

## 统计

| 大类 | 数量 | ✅ | ⏳ |
|------|------|----|----|
| A0 操作层入口 | 10 | 0 | 10 |
| A 查询 | 12 | 0 | 12 |
| B 写入 | 21 | 0 | 21 |
| C 缓存 | 8 | 0 | 8 |
| D 连接 | 9 | 2 | 7 |
| E 事务 | 6 | 0 | 6 |
| F Model | 11 | 0 | 11 |
| G 表达式 | 5 | 0 | 5 |
| H 管理 | 7 | 0 | 7 |
| I 同步 | 2 | 0 | 2 |
| J 慢查询 | 3 | 0 | 3 |
| K 工具 | 10 | 0 | 10 |
| L 兼容性 | 8 | 0 | 8 |
| M 文档 | 8 | 0 | 8 |
| N 性能 | 2 | 0 | 2 |
| O 回归 | 3 | 0 | 3 |
| **合计** | **125** | **2** | **123** |

