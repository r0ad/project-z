# 测试配置示例

## Jest配置文件

### jest.config.unit.js
```javascript
module.exports = {
  displayName: 'UniApp Tests',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/uniapp.setup.js'],
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js'
  ],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  collectCoverageFrom: [
    'api/**/*.js',
    'utils/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage/unit'
}
```

### babel.config.js
```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: {
        node: 'current'
      }
    }]
  ],
  plugins: [
    '@babel/plugin-transform-modules-commonjs'
  ]
}
```

## 测试环境设置

### tests/setup/uniapp.setup.js
```javascript
// UniApp测试环境设置
import { jest } from '@jest/globals'

// Mock UniApp全局对象
global.uni = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn(),
  removeStorageSync: jest.fn(),
  request: jest.fn(),
  showToast: jest.fn(),
  showModal: jest.fn(),
  navigateTo: jest.fn(),
  redirectTo: jest.fn(),
  switchTab: jest.fn(),
  reLaunch: jest.fn(),
  getSystemInfoSync: jest.fn(() => ({
    platform: 'app-plus',
    system: 'android',
    version: '1.0.0'
  }))
}

// Mock plus对象
global.plus = {
  sqlite: {
    openDatabase: jest.fn(),
    closeDatabase: jest.fn()
  }
}

// 设置测试环境变量
process.env.NODE_ENV = 'test'

console.log('UniApp测试环境已初始化')
console.log('平台:', global.uni.getSystemInfoSync().platform)
console.log('系统:', global.uni.getSystemInfoSync().system)
```

## Mock配置示例

### API测试Mock配置
```javascript
// 在API测试文件中的Mock配置
import { jest } from '@jest/globals'

// Mock依赖
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')

import apiModule from '@/api/apiModule.js'
import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'

describe('API测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // 用户状态Mock
    userStore.getCurrentUserId = jest.fn().mockReturnValue(1)
    userStore.setCurrentUserId = jest.fn()
    
    // 数据库Mock
    dbService.isInitialized = true
    dbService.initDB = jest.fn().mockResolvedValue(true)
    dbService.insert = jest.fn().mockResolvedValue(123)
    dbService.findMany = jest.fn().mockResolvedValue([])
    dbService.findOne = jest.fn().mockResolvedValue(null)
    dbService.update = jest.fn().mockResolvedValue(true)
    dbService.delete = jest.fn().mockResolvedValue({ changes: 1 })
    dbService.query = jest.fn().mockResolvedValue([])
    dbService.count = jest.fn().mockResolvedValue(0)
    
    // 时间工具Mock
    DateUtils.getCurrentLocalISOString = jest.fn().mockReturnValue('2024-01-01T10:00:00.000Z')
    DateUtils.formatDateTime = jest.fn().mockReturnValue('2024-01-01 10:00')
  })
})
```

### 工具函数测试Mock配置
```javascript
// 在工具函数测试中的Mock配置
import { jest } from '@jest/globals'

// Mock外部依赖
jest.mock('@/utils/dbService.js')

import toolFunction from '@/utils/toolFunction.js'
import dbService from '@/utils/dbService.js'

describe('工具函数测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // 数据库Mock
    dbService.isInitialized = true
    dbService.query = jest.fn().mockResolvedValue([])
  })
})
```

## 测试数据工厂

### testDataFactory.js
```javascript
// 测试数据工厂函数
export const createTestUser = (overrides = {}) => ({
  id: 1,
  name: '测试用户',
  email: 'test@example.com',
  ...overrides
})

export const createTestProject = (overrides = {}) => ({
  id: 1,
  name: '测试项目',
  description: '项目描述',
  status: 'active',
  created_at: '2024-01-01T10:00:00.000Z',
  updated_at: '2024-01-01T10:00:00.000Z',
  ...overrides
})

export const createTestKnowledge = (overrides = {}) => ({
  id: 1,
  title: '测试知识',
  content: '知识内容',
  summary: '知识摘要',
  category: '技术',
  tags: ['测试', 'API'],
  user_id: 1,
  view_count: 0,
  created_at: '2024-01-01T10:00:00.000Z',
  updated_at: '2024-01-01T10:00:00.000Z',
  ...overrides
})

export const createTestLog = (overrides = {}) => ({
  id: 1,
  project_id: 1,
  content: '日志内容',
  progress_text: '进度描述',
  problem_text: '问题描述',
  plan_text: '计划描述',
  log_type: 'manual',
  created_at: '2024-01-01T10:00:00.000Z',
  ...overrides
})
```

## 测试辅助函数

### testHelpers.js
```javascript
// 测试辅助函数
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

export const createMockPromise = (resolveValue, rejectValue = null) => {
  return jest.fn(() => {
    if (rejectValue) {
      return Promise.reject(rejectValue)
    }
    return Promise.resolve(resolveValue)
  })
}

export const createMockFunction = (returnValue) => {
  return jest.fn(() => returnValue)
}

export const expectToHaveBeenCalledWith = (mockFn, ...expectedArgs) => {
  expect(mockFn).toHaveBeenCalledWith(...expectedArgs)
}

export const expectToHaveBeenCalledTimes = (mockFn, expectedTimes) => {
  expect(mockFn).toHaveBeenCalledTimes(expectedTimes)
}
```

## 测试脚本配置

### package.json测试脚本
```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest tests/unit/",
    "test:api": "jest tests/unit/api/",
    "test:utils": "jest tests/unit/utils/",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ci": "jest --ci --coverage --watchAll=false"
  }
}
```

## 持续集成配置

### .github/workflows/test.yml
```yaml
name: 测试

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [16.x, 18.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: 使用 Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    
    - name: 安装依赖
      run: npm ci
    
    - name: 运行测试
      run: npm run test:ci
    
    - name: 上传覆盖率报告
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info
```

## 调试配置

### VS Code调试配置 (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "运行当前测试文件",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["${relativeFile}", "--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    },
    {
      "name": "运行所有测试",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/node_modules/.bin/jest",
      "args": ["--runInBand"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

这些配置示例提供了完整的测试环境设置，可以直接在项目中使用。
