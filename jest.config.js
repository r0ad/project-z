/**
 * UniApp CLI项目 Jest配置
 * 支持H5、App-Android、App-iOS、微信小程序等平台测试
 */
module.exports = {
  // 测试环境
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/tests/**/*.test.js',
    '<rootDir>/tests/**/*.spec.js'
  ],
  
  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/uniapp.setup.js'
  ],
  
  // 模块路径映射
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/api/(.*)$': '<rootDir>/api/$1',
    '^@/utils/(.*)$': '<rootDir>/utils/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/uni_modules/(.*)$': '<rootDir>/uni_modules/$1'
  },
  
  // 文件扩展名
  moduleFileExtensions: ['js', 'json', 'vue'],
  
  // 转换配置
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': '@vue/vue3-jest'
  },
  
  // 转换忽略模式 - 只忽略node_modules
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  
  // 测试路径忽略
  testPathIgnorePatterns: [
    '/node_modules/',
    '/unpackage/',
    '/dist/'
  ],
  
  // 覆盖率配置
  collectCoverageFrom: [
    'api/**/*.js',
    'utils/**/*.js',
    'components/**/*.vue',
    '!**/node_modules/**',
    '!**/unpackage/**',
    '!**/dist/**'
  ],
  
  // 覆盖率报告目录
  coverageDirectory: '<rootDir>/tests/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // 显示名称
  displayName: 'UniApp Tests',
  
  // 超时时间
  testTimeout: 30000,
  
  // 详细输出
  verbose: true
};