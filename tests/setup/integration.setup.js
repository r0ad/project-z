/**
 * 集成测试设置文件
 * 配置集成测试的全局设置
 */

// 设置集成测试超时
jest.setTimeout(20000);

// 全局测试钩子
beforeAll(async () => {
  console.log('开始集成测试...');
});

afterAll(async () => {
  console.log('集成测试完成');
});

// 每个测试前的设置
beforeEach(async () => {
  // 可以在这里添加测试前的通用设置
});

// 每个测试后的清理
afterEach(async () => {
  // 可以在这里添加测试后的清理工作
});
