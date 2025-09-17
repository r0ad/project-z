/**
 * 单元测试配置
 * 专门用于单元测试的 Jest 配置
 */
module.exports = {
  displayName: 'Unit Tests',
  testMatch: ['<rootDir>/unit/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node', // 单元测试使用 node 环境
  setupFilesAfterEnv: ['<rootDir>/setup/unit.setup.js'],
  collectCoverageFrom: [
    'api/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/unpackage/**'
  ],
  coverageDirectory: '<rootDir>/tests/coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
