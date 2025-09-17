/**
 * 页面逻辑测试设置文件
 * 配置页面业务逻辑测试环境（不依赖Vue组件渲染）
 */

// 模拟UniApp环境
global.getApp = jest.fn(() => ({
  globalData: {},
  $options: {}
}))

global.getCurrentPages = jest.fn(() => [])
global.getCurrentInstance = jest.fn(() => ({
  proxy: {},
  ctx: {},
  scope: {}
}))

// Mock uni API - UniApp全局API
global.uni = {
  // 导航相关
  navigateTo: jest.fn(),
  redirectTo: jest.fn(),
  reLaunch: jest.fn(),
  switchTab: jest.fn(),
  navigateBack: jest.fn(),
  
  // 界面相关
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
  showActionSheet: jest.fn(),
  showModal: jest.fn(),
  showNavigationBarLoading: jest.fn(),
  hideNavigationBarLoading: jest.fn(),
  setNavigationBarTitle: jest.fn(),
  setNavigationBarColor: jest.fn(),
  
  // 下拉刷新
  stopPullDownRefresh: jest.fn(),
  startPullDownRefresh: jest.fn(),
  
  // 存储相关
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  clearStorageSync: jest.fn(),
  getStorage: jest.fn(),
  setStorage: jest.fn(),
  removeStorage: jest.fn(),
  clearStorage: jest.fn(),
  
  // 网络请求
  request: jest.fn(),
  uploadFile: jest.fn(),
  downloadFile: jest.fn(),
  
  // 系统信息
  getSystemInfo: jest.fn(),
  getSystemInfoSync: jest.fn(),
  
  // 页面生命周期
  onLoad: jest.fn(),
  onShow: jest.fn(),
  onReady: jest.fn(),
  onHide: jest.fn(),
  onUnload: jest.fn(),
  onPullDownRefresh: jest.fn(),
  onReachBottom: jest.fn(),
  onShareAppMessage: jest.fn(),
  onPageScroll: jest.fn(),
  onTabItemTap: jest.fn(),
  onResize: jest.fn(),
  onNavigationBarButtonTap: jest.fn(),
  onBackPress: jest.fn(),
  onNavigationBarSearchInputChanged: jest.fn(),
  onNavigationBarSearchInputConfirmed: jest.fn(),
  onNavigationBarSearchInputClicked: jest.fn()
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}

// 设置测试超时时间
jest.setTimeout(10000)
