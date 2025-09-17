/**
 * UniApp环境模拟
 * 为测试环境提供UniApp API的模拟实现
 */

// 模拟uni全局对象
global.uni = {
  // 网络请求
  request: jest.fn((options) => {
    return new Promise((resolve, reject) => {
      // 模拟成功响应
      setTimeout(() => {
        resolve({
          data: options.data || {},
          statusCode: 200,
          header: {},
          cookies: []
        });
      }, 100);
    });
  }),
  
  // 存储API
  getStorageSync: jest.fn((key) => {
    return global.uni._storage[key] || '';
  }),
  setStorageSync: jest.fn((key, value) => {
    global.uni._storage = global.uni._storage || {};
    global.uni._storage[key] = value;
  }),
  removeStorageSync: jest.fn((key) => {
    if (global.uni._storage) {
      delete global.uni._storage[key];
    }
  }),
  clearStorageSync: jest.fn(() => {
    global.uni._storage = {};
  }),
  
  // 界面交互
  showToast: jest.fn((options) => {
    console.log('Toast:', options.title);
  }),
  showModal: jest.fn((options) => {
    return new Promise((resolve) => {
      resolve({
        confirm: true,
        cancel: false
      });
    });
  }),
  showLoading: jest.fn((options) => {
    console.log('Loading:', options.title);
  }),
  hideLoading: jest.fn(),
  
  // 导航
  navigateTo: jest.fn((options) => {
    console.log('Navigate to:', options.url);
  }),
  redirectTo: jest.fn((options) => {
    console.log('Redirect to:', options.url);
  }),
  reLaunch: jest.fn((options) => {
    console.log('ReLaunch to:', options.url);
  }),
  switchTab: jest.fn((options) => {
    console.log('Switch tab to:', options.url);
  }),
  navigateBack: jest.fn((options) => {
    console.log('Navigate back');
  }),
  
  // 系统信息
  getSystemInfoSync: jest.fn(() => ({
    platform: 'android',
    system: 'Android 10',
    version: '1.0.0',
    SDKVersion: '1.0.0',
    language: 'zh-CN',
    pixelRatio: 3,
    screenWidth: 1080,
    screenHeight: 1920,
    windowWidth: 1080,
    windowHeight: 1920,
    statusBarHeight: 24,
    safeArea: {
      left: 0,
      right: 1080,
      top: 24,
      bottom: 1920,
      width: 1080,
      height: 1896
    }
  })),
  
  // 设备信息
  getDeviceInfo: jest.fn(() => ({
    deviceId: 'test-device-id',
    deviceBrand: 'test-brand',
    deviceModel: 'test-model'
  })),
  
  // 文件系统
  getFileSystemManager: jest.fn(() => ({
    readFile: jest.fn(),
    writeFile: jest.fn(),
    readdir: jest.fn(),
    mkdir: jest.fn(),
    rmdir: jest.fn(),
    unlink: jest.fn()
  })),
  
  // 网络状态
  getNetworkType: jest.fn(() => ({
    networkType: 'wifi'
  })),
  
  // 位置信息
  getLocation: jest.fn(() => ({
    latitude: 39.908823,
    longitude: 116.397470,
    speed: 0,
    accuracy: 65,
    altitude: 0,
    verticalAccuracy: 65,
    horizontalAccuracy: 65
  })),
  
  // 初始化存储
  _storage: {}
};

// 模拟plus对象（App平台）
global.plus = {
  ready: jest.fn((callback) => {
    if (callback) callback();
  }),
  webview: {
    currentWebview: () => ({
      getStyle: () => ({}),
      setStyle: () => {}
    })
  },
  runtime: {
    getProperty: jest.fn(() => 'test-value')
  }
};

// 模拟wx对象（微信小程序）
global.wx = {
  request: global.uni.request,
  getStorageSync: global.uni.getStorageSync,
  setStorageSync: global.uni.setStorageSync,
  showToast: global.uni.showToast,
  showModal: global.uni.showModal,
  navigateTo: global.uni.navigateTo,
  getSystemInfoSync: global.uni.getSystemInfoSync
};

// 模拟process.env
process.env.UNI_PLATFORM = process.env.UNI_PLATFORM || 'app-plus';
process.env.UNI_OS_NAME = process.env.UNI_OS_NAME || 'android';

console.log('UniApp测试环境已初始化');
console.log('平台:', process.env.UNI_PLATFORM);
console.log('系统:', process.env.UNI_OS_NAME);