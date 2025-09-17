/**
 * App平台测试配置
 * 专门用于Android和iOS App平台的自动化测试
 */
module.exports = {
  displayName: 'App Tests',
  testMatch: ['<rootDir>/app/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup/uniapp.setup.js'],
  collectCoverageFrom: [
    '../pages/**/*.vue',
    '../components/**/*.vue',
    '!**/node_modules/**',
    '!**/unpackage/**'
  ],
  coverageDirectory: '<rootDir>/coverage/app',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../$1',
    '^@/api/(.*)$': '<rootDir>/../api/$1',
    '^@/utils/(.*)$': '<rootDir>/../utils/$1',
    '^@/components/(.*)$': '<rootDir>/../components/$1',
    '^@/uni_modules/(.*)$': '<rootDir>/../uni_modules/$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/unpackage/',
    '/dist/'
  ],
  moduleFileExtensions: ['js', 'json', 'vue'],
  transform: {
    '^.+\\.js$': 'babel-jest',
    '^.+\\.vue$': '@vue/vue3-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  // App平台测试需要更长的超时时间
  testTimeout: 60000,
  verbose: true,
  
  // App平台特定配置
  globals: {
    'UNI_PLATFORM': process.env.UNI_PLATFORM || 'app-plus',
    'UNI_OS_NAME': process.env.UNI_OS_NAME || 'android'
  }
};