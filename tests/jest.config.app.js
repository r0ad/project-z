/**
 * App 测试配置
 * 专门用于 App Plus 平台的功能测试
 */
module.exports = {
  displayName: 'App Tests',
  testMatch: ['<rootDir>/app/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node', // 使用 node 环境进行模拟测试
  setupFilesAfterEnv: ['<rootDir>/setup/app.setup.js'],
  testTimeout: 10000,
  collectCoverageFrom: [
    'pages/**/*.vue',
    'api/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/unpackage/**'
  ],
  coverageDirectory: '<rootDir>/tests/coverage/app',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  }
};
