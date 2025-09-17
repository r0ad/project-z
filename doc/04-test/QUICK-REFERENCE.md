# Jest ES6模块问题快速参考

## 问题症状
- `SyntaxError: Cannot use import statement outside a module`
- `SyntaxError: Unexpected token 'export'`
- `TypeError: Cannot read properties of undefined`

## 快速解决

### 1. 转换源文件
```bash
npx babel utils/dateUtils.js --out-file utils/dateUtils.commonjs.js
```

### 2. 修改测试文件
```javascript
// 原始
import DateUtils from '@/utils/dateUtils.js'

// 修改为
const DateUtils = require('../../../utils/dateUtils.commonjs.js')
```

### 3. 运行测试
```bash
npx jest tests/unit/utils/dateUtils.test.js --config tests/jest.config.unit.js
```

## 配置文件

### babel.config.js
```javascript
module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: { node: 'current' },
        modules: 'commonjs'
      }
    ]
  ]
};
```

### jest.config.unit.js
```javascript
module.exports = {
  // ... 其他配置
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ]
};
```

## 自动化脚本

### package.json
```json
{
  "scripts": {
    "convert:es6": "babel utils/ --out-dir utils/commonjs/",
    "test:unit": "jest --config tests/jest.config.unit.js"
  }
}
```

### 转换脚本
```bash
# 转换单个文件
npx babel utils/dateUtils.js --out-file utils/dateUtils.commonjs.js

# 转换整个目录
npx babel utils/ --out-dir utils/commonjs/
```

## 常见问题

### 1. 模块未定义
```javascript
// 检查模块是否正确加载
if (!DateUtils) {
  throw new Error('DateUtils module not loaded correctly')
}
```

### 2. 方法未找到
```javascript
// 检查方法是否存在
if (typeof DateUtils.formatDate !== 'function') {
  throw new Error('DateUtils.formatDate method not found')
}
```

### 3. 路径错误
```javascript
// 使用相对路径
const DateUtils = require('../../../utils/dateUtils.commonjs.js')
```

## 验证步骤

### 1. 检查转换结果
```bash
npx babel utils/dateUtils.js --out-file test-output.js
cat test-output.js | tail -10
```

### 2. 验证模块导出
```javascript
const DateUtils = require('../../../utils/dateUtils.commonjs.js')
console.log('DateUtils:', DateUtils)
console.log('Methods:', Object.getOwnPropertyNames(DateUtils))
```

### 3. 运行测试
```bash
npx jest tests/unit/utils/dateUtils.test.js --config tests/jest.config.unit.js
```

## 文件结构
```
project/
├── utils/
│   ├── dateUtils.js          # 原始ES6模块
│   └── dateUtils.commonjs.js # 转换后的CommonJS模块
└── tests/
    └── unit/
        └── utils/
            └── dateUtils.test.js
```

## 成功标志
```
PASS   Unit Tests  tests/unit/utils/dateUtils.test.js
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
```

## 注意事项
1. 源文件修改后需要重新转换
2. 转换后的文件可以加入.gitignore
3. 确保测试的是真实源码，不是mock
4. 使用相对路径避免别名问题
