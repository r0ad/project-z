/**
 * App 测试设置文件
 * 配置 App Plus 环境模拟
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
  navigateTo: jest.fn(),
  redirectTo: jest.fn(),
  reLaunch: jest.fn(),
  switchTab: jest.fn(),
  navigateBack: jest.fn()
};

// 模拟 plus 环境（App Plus 特有）
global.plus = {
  sqlite: {
    isOpenDatabase: jest.fn().mockReturnValue(true),
    openDatabase: jest.fn().mockImplementation((options) => {
      if (options.success) options.success({});
    }),
    executeSql: jest.fn().mockImplementation((options) => {
      if (options.success) options.success({ insertId: 1 });
    }),
    selectSql: jest.fn().mockImplementation((options) => {
      if (options.success) options.success([]);
    }),
    closeDatabase: jest.fn().mockImplementation((options) => {
      if (options.success) options.success({});
    })
  },
  runtime: {
    getProperty: jest.fn()
  }
};

// 模拟 getApp
global.getApp = jest.fn(() => ({
  globalData: {
    updateInfo: null,
    appUpdater: null
  }
}));

// 模拟 Vue 环境
global.Vue = {
  createApp: jest.fn(),
  defineComponent: jest.fn(),
  ref: jest.fn(),
  reactive: jest.fn(),
  computed: jest.fn(),
  watch: jest.fn(),
  onMounted: jest.fn(),
  onUnmounted: jest.fn()
};

// 设置测试超时
jest.setTimeout(10000);
