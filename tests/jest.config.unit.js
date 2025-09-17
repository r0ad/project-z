/**
 * 单元测试配置
 * 专门用于单元测试的 Jest 配置
 */
module.exports = {
  displayName: 'Unit Tests',
  testMatch: ['<rootDir>/unit/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/setup/unit.setup.js'],
  collectCoverageFrom: [
    '../api/**/*.js',
    '../utils/**/*.js',
    '!**/node_modules/**',
    '!**/unpackage/**'
  ],
  coverageDirectory: '<rootDir>/tests/coverage/unit',
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../$1'
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/unpackage/'
  ],
  moduleFileExtensions: ['js', 'json']
};
