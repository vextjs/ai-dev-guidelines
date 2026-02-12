# 项目规范 - CI/CD 实施步骤

> **用途**: 定义 CI/CD 的具体实施过程和配置  
> **所属**: projects/<project-name>/CI-CD-IMPLEMENTATION.md  
> **维护**: DevOps/平台团队  
> **最后更新**: 2026-02-11

---

## 🔄 工作流程 (5 个步骤)

### 第 1 步: 代码提交和 PR 创建

```
开发者在本地分支上修改代码
   ↓
git add . && git commit -m "功能描述"
   ↓
git push origin feature/xxxx
   ↓
在 GitHub 创建 Pull Request
   └─ 标题: [类型] 描述 (e.g., [feat] 添加登录功能)
   └─ 描述: 修改了什么、为什么、测试方式
   └─ 关联 Issue (e.g., closes #123)
   ↓
【系统自动触发 CI】
  ✅ CI 检查开始运行 (1-5 分钟)
  ✅ 检查项: Linting / TypeScript / 单元测试 / 覆盖率 / 安全
```

**关键要点**:
- PR 标题要清晰，便于日后查阅
- 提供详细的描述和修改说明
- 一个 PR 处理一个功能或 Bug (不要混杂多个功能)

### 第 2 步: 代码审查

```
PR 创建 + CI 检查通过
   ↓
分配给代码审查者 (至少 1 人)
   ↓
审查者检查:
  ✓ 代码逻辑是否正确
  ✓ 是否遵守代码规范
  ✓ 是否有潜在的 Bug
  ✓ 测试是否足够
  ✓ 文档是否完整
   ↓
审查结果:
  选项 A: ✅ 批准 (Approve)
    → 可以合并到 main
  
  选项 B: 💬 评论 (Comment)
    → 提出改进建议
  
  选项 C: ❌ 拒绝 (Request Changes)
    → 需要修改后重新审查
   ↓
【如需修改】:
  1. 在本地修改代码
  2. git push 推送新 commit
  3. CI 自动重新运行检查
  4. 代码审查者继续审查
```

**关键要点**:
- 代码审查是质量保证的关键环节，不要跳过
- 给出具体、有建设性的评论
- 2-4 小时内回复，不要让开发者长期等待

### 第 3 步: 合并到 Main

```
代码审查通过 (✅ Approved)
   ↓
CI 检查通过 (✅ All checks passed)
   ↓
【开发者点击"Merge"】
   ↓
代码合并到 main 分支
   ↓
本地分支可选择删除
   ↓
【系统自动触发 CD】
  → 触发部署流程到测试环境
```

**关键要点**:
- 只有当 CI 检查和代码审查都通过才能合并
- 合并后自动删除本地分支 (节约空间)
- 合并即表示这段代码已准备好部署

### 第 4 步: 部署到测试环境

```
代码合并到 main
   ↓
【自动部署流程】(如配置了自动部署):
  1. 拉取最新代码
  2. 安装依赖: npm install
  3. 构建: npm run build
  4. 构建镜像: docker build
  5. 推送到镜像仓库
  6. 更新测试环境配置
  7. 重启服务
   ↓
【部署验证】:
  1. 健康检查: 服务是否可响应?
  2. 自动化测试: 运行集成测试
  3. 日志检查: 是否有错误?
   ↓
部署结果:
  ✅ 成功 → 准备生产部署
  ❌ 失败 → 发送告警 + 可选自动回滚

【人工测试】(可选):
  - QA 团队在测试环境验证功能
  - 检查是否有 Bug 或性能问题
  - 通过后，确认可以部署到生产
```

**关键要点**:
- 测试环境部署应自动化，降低人工错误
- 部署应幂等，重复部署应得到相同结果
- 保留部署日志，便于问题排查

### 第 5 步: 部署到生产环境

```
测试环境验证通过
   ↓
【人工审批】:
  技术负责人 / DevOps 验收
  确认是否准备好生产部署
   ↓
【发起部署请求】:
  - 填写部署单: 版本号、修改内容、回滚方案
  - 审批: 部门负责人、技术负责人
  - 预定部署时间: 避免高峰时段
   ↓
【灰度部署】(推荐):
  
  阶段 1 (0-5%)
    1. 部署到 5% 的实例
    2. 监控 5 分钟，错误率是否升高?
    3. 如失败，立即回滚
    4. 如成功，继续下一阶段
  
  阶段 2 (5-25%)
    1. 部署到 25% 的实例
    2. 监控 10 分钟
    3. 如失败，立即回滚
    4. 如成功，继续下一阶段
  
  阶段 3 (25-100%)
    1. 部署到剩余 75% 的实例
    2. 监控 15-30 分钟
    3. 如失败，回滚 (手动)
    4. 如成功，部署完成
   ↓
【蓝绿部署】(备选):
  
  1. 部署到全部新实例 (绿)
  2. 运行健康检查
  3. 一次性切换流量 (蓝→绿)
  4. 监控 10-15 分钟
  5. 如失败，立即切换回旧实例
   ↓
【部署完成】:
  ✅ 监控告警正常
  ✅ 错误率无升高
  ✅ 性能指标正常
  ✅ 用户反馈正常
```

**关键要点**:
- 生产部署应谨慎，建议使用灰度发布
- 部署前充分测试，部署中持续监控
- 准备好回滚方案，需要时快速回滚
- 文档化每次部署，便于事后追踪

---

## 🔧 工具和配置

### 推荐的工具栈

```yaml
CI/CD 平台 (选一个):
  ★ GitHub Actions (推荐)
    - 免费，无需维护
    - 集成 GitHub，操作简单
    - 社区活跃，模板众多
  
  GitLab CI/CD
    - 功能强大，自动化程度高
    - 需要自建或付费托管
  
  Jenkins
    - 完全可控，适合复杂需求
    - 维护成本高，需要运维人员

代码质量分析:
  ★ SonarQube (开源)
    - 免费自建，功能强大
    - 支持多语言
    - 可视化报告详细
  
  CodeClimate
    - SaaS 服务，易用
    - 付费，但功能完整

测试覆盖率:
  ★ Codecov (推荐)
    - 免费对开源项目
    - 集成 GitHub，自动上报
    - 覆盖率报告详细

依赖安全:
  ★ npm audit (内置)
    - npm 自带命令
    - 检查依赖漏洞
  
  Snyk
    - 专业安全扫描
    - 免费基础版

部署工具:
  Docker (容器化)
    - 标准化打包
    - 跨环境一致
  
  Kubernetes (容器编排)
    - 大规模部署
    - 灰度/蓝绿支持
  
  Terraform (基础设施)
    - 基础设施即代码
    - 可重复部署

监控告警:
  Prometheus + Grafana
    - 开源方案，功能完整
  
  DataDog
    - SaaS，易用
    - 价格较高
```

### GitHub Actions 示例配置

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      # 1. 检出代码
      - uses: actions/checkout@v3
      
      # 2. 安装 Node.js
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      
      # 3. 安装依赖
      - run: npm install
      
      # 4. 代码风格检查
      - run: npm run lint
        name: Run ESLint
      
      # 5. TypeScript 检查
      - run: npm run type-check
        name: Run TypeScript
      
      # 6. 单元测试 + 覆盖率
      - run: npm test -- --coverage
        name: Run Jest Tests
      
      # 7. 上传覆盖率到 Codecov
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
      
      # 8. SonarQube 扫描 (可选)
      - uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        if: env.SONAR_TOKEN != ''
```

### 部署配置示例

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker Image
        run: |
          docker build -t my-app:${{ github.sha }} .
          docker tag my-app:${{ github.sha }} my-app:latest
      
      - name: Push to Registry
        run: |
          docker push my-app:${{ github.sha }}
      
      - name: Deploy to Testing
        run: |
          kubectl set image deployment/my-app \
            my-app=my-app:${{ github.sha }} \
            -n testing
        if: success()
      
      - name: Health Check
        run: |
          curl http://testing-my-app/health
```

---

## 📈 监控和告警

### 关键指标

```yaml
构建指标:
  1. 构建成功率
     目标: >= 95%
     告警: < 90% (表示流程有问题)
  
  2. 构建耗时
     目标: < 5 分钟
     告警: > 10 分钟 (性能回退)

测试指标:
  3. 测试覆盖率
     目标: >= 80%
     告警: < 75% (覆盖率下降)
  
  4. 测试通过率
     目标: 100%
     告警: 任何失败

部署指标:
  5. 部署成功率
     目标: 100% (生产)
     告警: 任何失败
  
  6. 平均修复时间 (MTTR)
     目标: < 30 分钟
     告警: > 1 小时

生产指标:
  7. 错误率
     目标: < 0.1%
     告警: > 0.5%
  
  8. 性能指标 (响应时间)
     目标: P95 < 500ms
     告警: P95 > 1000ms
```

### 告警方式

```yaml
构建失败:
  频道: Slack #ci-failures 频道
  通知: 团队全体
  要求: 1 小时内修复
  内容: 失败日志链接 + 简单说明

测试覆盖率下降:
  频道: PR 评论 / Slack
  触发: 下降超过 5%
  要求: 开发者补充测试
  效果: 可阻止合并

部署失败:
  频道: Slack #incidents 频道
  通知: DevOps + 技术负责人
  要求: 立即响应，10 分钟内处理
  内容: 失败原因 + 回滚指示

性能告警:
  频道: Slack #performance 频道
  触发: 性能下降 > 10%
  要求: 分析原因，准备优化方案
  内容: 性能对比数据 + 影响范围
```

---

## 🚨 故障处理

### 如果 CI 检查失败

```
【立即行动】:
  1. 查看失败日志
     - 点击 GitHub 上 PR 的失败检查项
     - 查看详细日志，找出具体错误
  
  2. 理解问题类型
     - Linting 失败: npm run lint 查看具体错误
     - TypeScript 失败: npm run type-check 查看类型问题
     - 测试失败: npm test 本地运行失败的测试
     - 覆盖率问题: 缺少测试覆盖
  
  3. 本地复现
     - 在本地环境完全复现问题
     - 不要盲目猜测，必须实际操作验证

【修复方案】:
  Linting 错误
    → 修复代码风格，遵循 ESLint 规则
    → 或者 npm run lint:fix 自动修复
  
  TypeScript 错误
    → 修改类型注解，确保类型正确
    → 检查变量使用是否与声明一致
  
  测试失败
    → 修改代码或修改测试
    → 确认修改后测试通过
  
  覆盖率不足
    → 编写新测试覆盖未测试的分支
    → 检查覆盖率报告，找出缺口

【提交修复】:
  1. git add . && git commit -m "修复 CI 失败"
  2. git push
  3. CI 自动重新运行
  4. 监控结果，直到全部通过
```

### 如果部署失败

```
【灰度部署失败】:
  1. 查看部署日志
     - 查看具体是哪一步失败
     - 检查错误信息
  
  2. 快速回滚
     - 如配置了自动回滚，系统已回滚
     - 如需手动回滚，执行回滚脚本
     - 验证服务已恢复
  
  3. 分析原因
     - 是否是代码问题？
     - 是否是环境问题？
     - 是否是配置问题？
  
  4. 修复和重新部署
     - 修复根本原因
     - 在测试环境验证
     - 再次尝试部署

【蓝绿部署失败】:
  1. 观察错误现象
     - 新版本 (绿) 是否无法启动?
     - 是否有异常日志?
  
  2. 立即回滚
     - 切换流量回旧版本 (蓝)
     - 停止新实例 (绿)
     - 验证服务恢复
  
  3. 根本原因分析
     - 检查新版本的配置
     - 检查依赖版本是否兼容
     - 检查数据库迁移
  
  4. 修复和重试
     - 修复问题
     - 重新构建和测试
     - 再次尝试部署
```

---

## ✅ 实施检查清单

```yaml
【第 1 周 - 工具选择和配置】:
  □ 选择 CI/CD 平台 (推荐 GitHub Actions)
  □ 创建 .github/workflows/ 目录
  □ 编写 CI 工作流 (.yml 配置)
  □ 编写部署工作流 (.yml 配置)
  □ 连接代码质量工具 (SonarQube / Codecov)
  □ 配置质量门禁规则

【第 2 周 - 测试验证】:
  □ 在测试分支验证 CI 流程
  □ 故意让某项检查失败，验证通知
  □ 测试自动部署到测试环境
  □ 测试灰度部署流程
  □ 测试回滚流程

【第 3 周 - 文档和培训】:
  □ 文档化 CI/CD 流程
  □ 编写故障处理指南
  □ 准备团队培训材料
  □ 培训全体开发者
  □ 建立 Runbook

【第 4 周 - 上线】:
  □ 首次正式部署到生产
  □ 持续监控，收集反馈
  □ 调整告警规则
  □ 优化流程效率
  □ 定期审查和改进
```

---

**文件**: projects/<project>/CI-CD-IMPLEMENTATION.md  
**版本**: 1.0  
**最后更新**: 2026-02-11  
**维护者**: DevOps/平台团队
