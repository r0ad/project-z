/**
 * 单元测试设置文件
 * 配置单元测试的全局设置
 */

// 模拟 uni-app 环境
global.uni = {
  showToast: jest.fn(),
  showModal: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  request: jest.fn(),
  getStorage: jest.fn(),
  setStorage: jest.fn(),
  removeStorage: jest.fn(),
  clearStorage: jest.fn(),
  getStorageSync: jest.fn().mockReturnValue('1'),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn(),
  navigateTo: jest.fn(),
  redirectTo: jest.fn(),
  reLaunch: jest.fn(),
  switchTab: jest.fn(),
  navigateBack: jest.fn()
};

// 模拟 plus 环境
global.plus = {
  sqlite: {
    isOpenDatabase: jest.fn(),
    openDatabase: jest.fn(),
    executeSql: jest.fn(),
    selectSql: jest.fn(),
    closeDatabase: jest.fn()
  }
};

// 模拟 getApp
global.getApp = jest.fn(() => ({
  globalData: {}
}));

// 设置测试超时
jest.setTimeout(10000);

// 确保测试后清理异步操作
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

// 全局清理
afterAll(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});
