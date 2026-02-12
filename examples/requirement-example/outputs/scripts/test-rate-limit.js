/**
 * 测试脚本: 验证限流功能
 * 任务ID: REQ-user-20260212-rate-limit
 *
 * 使用方法:
 *   node scripts/test-rate-limit.js
 *
 * 环境变量:
 *   API_BASE_URL - API 基础地址（默认 http://localhost:3000）
 */

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_ENDPOINT = '/api/users/me';
const REQUESTS_TO_SEND = 110;  // 超过限制的请求数

async function makeRequest(index) {
  try {
    const response = await fetch(`${API_BASE_URL}${TEST_ENDPOINT}`, {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    return {
      index,
      status: response.status,
      ok: response.ok
    };
  } catch (error) {
    return {
      index,
      status: 'error',
      error: error.message
    };
  }
}

async function runTest() {
  console.log('🚀 限流功能测试开始');
  console.log(`📋 测试配置:`);
  console.log(`   API: ${API_BASE_URL}${TEST_ENDPOINT}`);
  console.log(`   请求数: ${REQUESTS_TO_SEND}`);
  console.log('');

  const results = {
    success: 0,
    rateLimited: 0,
    error: 0
  };

  // 发送请求
  console.log('📤 发送请求...');
  for (let i = 1; i <= REQUESTS_TO_SEND; i++) {
    const result = await makeRequest(i);

    if (result.status === 200) {
      results.success++;
    } else if (result.status === 429) {
      results.rateLimited++;
      if (results.rateLimited === 1) {
        console.log(`⚠️ 请求 #${i} 被限流 (429)`);
      }
    } else {
      results.error++;
    }

    // 进度输出
    if (i % 20 === 0) {
      console.log(`   进度: ${i}/${REQUESTS_TO_SEND}`);
    }
  }

  // 输出结果
  console.log('');
  console.log('📊 测试结果:');
  console.log(`   ✅ 成功: ${results.success}`);
  console.log(`   🚫 限流: ${results.rateLimited}`);
  console.log(`   ❌ 错误: ${results.error}`);
  console.log('');

  // 验证
  if (results.success <= 100 && results.rateLimited > 0) {
    console.log('✅ 测试通过: 限流功能正常工作');
    process.exit(0);
  } else {
    console.log('❌ 测试失败: 限流功能异常');
    process.exit(1);
  }
}

runTest().catch(error => {
  console.error('❌ 测试执行失败:', error);
  process.exit(1);
});

