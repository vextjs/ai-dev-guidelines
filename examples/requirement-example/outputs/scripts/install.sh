#!/bin/bash
# 安装脚本: 集成限流功能
# 任务ID: REQ-user-20260212-rate-limit

set -e

echo "🚀 开始安装限流功能..."

# 1. 安装依赖
echo "📦 安装依赖..."
npm install flex-rate-limit@^1.0.0

# 2. 创建配置目录（如果不存在）
echo "📁 检查目录..."
mkdir -p config
mkdir -p src/middleware
mkdir -p types

# 3. 提示手动步骤
echo ""
echo "✅ 依赖安装完成"
echo ""
echo "📝 接下来需要手动完成:"
echo "   1. 复制 config/rate-limit.ts 到项目"
echo "   2. 复制 src/middleware/rate-limiter.ts 到项目"
echo "   3. 修改 src/app.ts 注册中间件"
echo "   4. 添加环境变量到 .env.example"
echo ""
echo "🔧 可选环境变量:"
echo "   RATE_LIMIT_WINDOW_MS=60000"
echo "   RATE_LIMIT_MAX=100"

