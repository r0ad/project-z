/**
 * 端到端测试设置文件
 * 配置 E2E 测试的全局设置
 */

// 设置 E2E 测试超时
jest.setTimeout(30000);

// 全局测试钩子
beforeAll(async () => {
  console.log('开始端到端测试...');
  // 确保应用已完全启动
  await new Promise(resolve => setTimeout(resolve, 2000));
});

afterAll(async () => {
  console.log('端到端测试完成');
});

// 每个测试前的设置
beforeEach(async () => {
  // 等待页面稳定
  await new Promise(resolve => setTimeout(resolve, 500));
});

// 每个测试后的清理
afterEach(async () => {
  // 清理测试数据或重置状态
});
