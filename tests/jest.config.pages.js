/**
 * 页面逻辑测试配置
 * 专门用于页面业务逻辑测试的 Jest 配置（不依赖Vue组件渲染）
 */
module.exports = {
  displayName: 'Page Tests',
  testMatch: ['<rootDir>/unit/pages/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup/pages.setup.js'],
  collectCoverageFrom: [
    '../pages/**/*.vue',
    '!**/node_modules/**',
    '!**/unpackage/**'
  ],
  coverageDirectory: '<rootDir>/tests/coverage/pages',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/unpackage/'
  ],
  moduleFileExtensions: ['js', 'json'],
  transform: {
    '^.+\\.(js|jsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ]
};
