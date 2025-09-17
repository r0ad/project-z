/**
 * 单元测试配置
 * 专门用于单元测试的 Jest 配置
 * 支持UniApp App平台（Android/iOS）
 */
module.exports = {
  displayName: 'Unit Tests',
  testMatch: ['<rootDir>/unit/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup/unit.setup.js', '<rootDir>/setup/uniapp.setup.js'],
  collectCoverageFrom: [
    '../api/**/*.js',
    '../utils/**/*.js',
    '!**/node_modules/**',
    '!**/unpackage/**'
  ],
  coverageDirectory: '<rootDir>/coverage/unit',
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
  // 关键修复：只忽略node_modules，不忽略源文件
  transformIgnorePatterns: [
    '/node_modules/'
  ],
  // 超时时间
  testTimeout: 30000,
  // 详细输出
  verbose: true
};
