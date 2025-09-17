# Project-Z 测试框架集成指南

## 项目概述

Project-Z 是一个基于 uni-app 的 AI 项目管理助手，使用 SQLite 数据库进行数据存储。本项目集成了完整的测试框架，支持单元测试、集成测试和 App 功能测试。

## 平台支持

本项目使用 SQLite 数据库，**仅支持 App Plus 平台**进行自动化测试。

### 支持的平台

- ✅ **App Plus (Android)** - 主要测试平台
- ✅ **App Plus (iOS)** - 需要模拟器支持
- ❌ **H5** - 不支持 SQLite
- ❌ **微信小程序** - 不支持 SQLite
- ❌ **其他小程序平台** - 不支持 SQLite

## 快速开始

### 1. 环境准备

#### 必需环境

1. **Node.js** (v14+) - 用于运行测试脚本
2. **HBuilderX** - 用于编译和运行 App Plus 应用
3. **Android SDK** - 用于 Android 测试（可选）
4. **Xcode** (macOS) - 用于 iOS 测试（可选）

#### 安装依赖

```bash
# 进入项目目录
cd project-z/app

# 安装测试依赖
npm install

# 验证安装
npm test
```

### 2. 测试框架架构

```
测试框架架构
├── Jest 测试运行器
├── 单元测试 (Unit Tests)
│   ├── 工具函数测试
│   ├── API 功能测试
│   └── 业务逻辑测试
├── App 功能测试 (App Tests)
│   ├── 页面功能测试
│   ├── 数据库操作测试
│   └── 用户交互测试
└── 测试配置
    ├── 环境模拟
    ├── 数据模拟
    └── 断言配置
```

## 测试命令

### 基础测试命令

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行 App 功能测试
npm run test:app

# 监听模式（文件变化时自动运行测试）
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 测试输出示例

```bash
$ npm test

> project-z@1.0.6 test
> jest

 PASS  tests/unit/utils.test.js
 PASS  tests/app/index.test.js
 PASS  tests/unit/api.test.js
 PASS  tests/app/projectApi.test.js
 PASS  tests/app/database.test.js

Test Suites: 5 passed, 5 total
Tests:       35 passed, 35 total
Snapshots:   0 total
Time:        0.519 s
```

## 开发指南

### 1. 测试文件结构

```
tests/
├── unit/                    # 单元测试
│   ├── utils.test.js        # 工具函数测试
│   ├── api.test.js          # API 功能测试
│   └── ...                  # 其他单元测试
├── app/                     # App 功能测试
│   ├── index.test.js        # 首页功能测试
│   ├── projectApi.test.js   # 项目API测试
│   ├── database.test.js     # 数据库测试
│   └── ...                  # 其他App测试
├── setup/                   # 测试设置文件
│   ├── unit.setup.js        # 单元测试设置
│   └── app.setup.js         # App测试设置
├── jest.config.unit.js      # 单元测试配置
├── jest.config.app.js       # App测试配置
└── README.md               # 测试文档
```

### 2. 创建新测试

#### 单元测试示例

```javascript
// tests/unit/myFunction.test.js
describe('我的函数测试', () => {
  it('应该正确执行基本功能', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });

  it('应该处理边界情况', () => {
    expect(() => myFunction(null)).toThrow('参数不能为空');
  });
});
```

#### App 功能测试示例

```javascript
// tests/app/myPage.test.js
describe('我的页面测试', () => {
  let mockPage;

  beforeEach(() => {
    mockPage = {
      data: { title: '测试页面' },
      setData: jest.fn(),
      callMethod: jest.fn()
    };
  });

  it('应该正确初始化页面数据', () => {
    expect(mockPage.data.title).toBe('测试页面');
  });
});
```

### 3. 测试配置说明

#### 主配置文件 (jest.config.js)

```javascript
module.exports = {
  testTimeout: 20000,
  testMatch: ['<rootDir>/tests/**/*test.[jt]s?(x)'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/unit.setup.js'],
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'  // 路径别名解析
  }
};
```

#### 单元测试配置 (tests/jest.config.unit.js)

```javascript
module.exports = {
  displayName: 'Unit Tests',
  testMatch: ['<rootDir>/unit/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node',  // 使用 Node.js 环境
  setupFilesAfterEnv: ['<rootDir>/setup/unit.setup.js']
};
```

#### App 测试配置 (tests/jest.config.app.js)

```javascript
module.exports = {
  displayName: 'App Tests',
  testMatch: ['<rootDir>/app/**/*.test.[jt]s?(x)'],
  testEnvironment: 'node',  // 使用模拟环境
  setupFilesAfterEnv: ['<rootDir>/setup/app.setup.js']
};
```

## 测试最佳实践

### 1. 测试命名规范

```javascript
// ✅ 好的命名
describe('项目API功能测试', () => {
  it('应该能够创建新项目', () => {
    // 测试逻辑
  });
  
  it('应该验证必填字段', () => {
    // 测试逻辑
  });
});

// ❌ 避免的命名
describe('test', () => {
  it('test1', () => {
    // 测试逻辑
  });
});
```

### 2. 测试结构规范

```javascript
describe('功能模块测试', () => {
  // 1. 测试前的准备
  beforeEach(() => {
    // 每个测试前的设置
  });

  afterEach(() => {
    // 每个测试后的清理
  });

  // 2. 正常情况测试
  describe('正常功能', () => {
    it('应该处理正常输入', () => {
      // 测试逻辑
    });
  });

  // 3. 边界情况测试
  describe('边界情况', () => {
    it('应该处理空输入', () => {
      // 测试逻辑
    });
  });

  // 4. 异常情况测试
  describe('异常情况', () => {
    it('应该处理无效输入', () => {
      // 测试逻辑
    });
  });
});
```

### 3. 模拟对象使用

```javascript
// 模拟 uni-app API
global.uni = {
  showToast: jest.fn(),
  showModal: jest.fn(),
  request: jest.fn()
};

// 模拟数据库服务
const mockDbService = {
  insert: jest.fn().mockResolvedValue(1),
  findOne: jest.fn().mockResolvedValue({ id: 1, name: '测试' })
};

// 模拟页面对象
const mockPage = {
  data: { title: '测试页面' },
  setData: jest.fn(),
  callMethod: jest.fn()
};
```

### 4. 断言使用

```javascript
// 基本断言
expect(result).toBe(expected);
expect(result).toEqual(expected);
expect(result).toBeTruthy();
expect(result).toBeFalsy();

// 数组断言
expect(array).toHaveLength(3);
expect(array).toContain('item');

// 异常断言
expect(() => functionCall()).toThrow('错误信息');

// 模拟函数断言
expect(mockFunction).toHaveBeenCalled();
expect(mockFunction).toHaveBeenCalledWith('参数');
expect(mockFunction).toHaveBeenCalledTimes(2);
```

## 集成指南

### 1. 新项目集成测试框架

#### 步骤 1: 安装依赖

```bash
npm install --save-dev jest cross-env
```

#### 步骤 2: 创建测试目录结构

```bash
mkdir -p tests/{unit,app,setup}
```

#### 步骤 3: 复制配置文件

```bash
# 复制主配置文件
cp jest.config.js tests/

# 复制测试配置
cp tests/jest.config.unit.js tests/
cp tests/jest.config.app.js tests/

# 复制设置文件
cp tests/setup/unit.setup.js tests/setup/
cp tests/setup/app.setup.js tests/setup/
```

#### 步骤 4: 更新 package.json

```json
{
  "scripts": {
    "test": "jest",
    "test:unit": "jest --config tests/jest.config.unit.js",
    "test:app": "jest --config tests/jest.config.app.js",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

### 2. 现有项目添加测试

#### 步骤 1: 分析现有代码

- 识别需要测试的核心功能
- 确定测试优先级
- 规划测试覆盖范围

#### 步骤 2: 创建基础测试

```bash
# 为工具函数创建测试
touch tests/unit/utils.test.js

# 为 API 创建测试
touch tests/unit/api.test.js

# 为页面创建测试
touch tests/app/pages.test.js
```

#### 步骤 3: 逐步完善测试

- 从核心功能开始
- 逐步增加测试覆盖率
- 定期运行测试确保稳定性

### 3. 团队协作

#### 代码提交前检查

```bash
# 运行所有测试
npm test

# 检查测试覆盖率
npm run test:coverage

# 确保所有测试通过
echo "所有测试通过，可以提交代码"
```

#### Git Hooks 集成

```bash
# 在 .git/hooks/pre-commit 中添加
#!/bin/sh
npm test
if [ $? -ne 0 ]; then
  echo "测试失败，请修复后再提交"
  exit 1
fi
```

## 注意事项

### 技术限制

1. **SQLite 限制**：由于使用 SQLite，只能在 App Plus 环境中运行
2. **平台兼容性**：测试主要针对 App Plus 平台
3. **环境依赖**：需要 Node.js 和 Jest 环境

### 开发建议

1. **测试优先**：新功能开发时先写测试
2. **持续集成**：定期运行测试确保代码质量
3. **覆盖率目标**：建议保持 80% 以上的测试覆盖率
4. **测试维护**：及时更新测试用例以匹配代码变更

## 故障排除

### 常见问题及解决方案

#### 1. 测试运行失败

```bash
# 问题：No tests found
# 解决：检查测试文件路径和命名
ls tests/unit/
ls tests/app/

# 确保测试文件以 .test.js 结尾
```

#### 2. 模块路径解析错误

```bash
# 问题：Cannot find module '@/utils/dbService.js'
# 解决：检查 jest.config.js 中的 moduleNameMapping 配置
moduleNameMapping: {
  '^@/(.*)$': '<rootDir>/$1'
}
```

#### 3. 模拟对象未定义

```javascript
// 问题：ReferenceError: uni is not defined
// 解决：在测试设置文件中添加全局模拟
global.uni = {
  showToast: jest.fn(),
  // ... 其他 API
};
```

#### 4. 测试超时

```javascript
// 问题：Timeout - Async callback was not invoked
// 解决：增加超时时间或检查异步操作
jest.setTimeout(10000); // 10秒超时
```

#### 5. 覆盖率报告问题

```bash
# 问题：覆盖率报告不准确
# 解决：检查 collectCoverageFrom 配置
collectCoverageFrom: [
  'api/**/*.js',
  'utils/**/*.js',
  '!**/node_modules/**'
]
```

### 调试技巧

#### 1. 详细输出模式

```bash
# 运行测试时显示详细信息
npm test -- --verbose

# 只运行特定的测试文件
npm test -- tests/unit/utils.test.js
```

#### 2. 测试调试

```javascript
// 在测试中添加调试信息
it('应该处理数据', () => {
  console.log('输入数据:', inputData);
  const result = processData(inputData);
  console.log('处理结果:', result);
  expect(result).toBe(expected);
});
```

#### 3. 模拟函数调试

```javascript
// 检查模拟函数调用情况
expect(mockFunction).toHaveBeenCalled();
console.log('调用参数:', mockFunction.mock.calls);
console.log('调用次数:', mockFunction.mock.calls.length);
```

## 持续集成

### GitHub Actions 配置示例

```yaml
# .github/workflows/test.yml
name: 测试

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: 设置 Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
        
    - name: 安装依赖
      run: |
        cd app
        npm install
        
    - name: 运行测试
      run: |
        cd app
        npm test
        
    - name: 生成覆盖率报告
      run: |
        cd app
        npm run test:coverage
```

### 本地开发工作流

```bash
# 1. 开发新功能
git checkout -b feature/new-function

# 2. 编写测试
# 在 tests/ 目录下创建测试文件

# 3. 运行测试
npm test

# 4. 提交代码
git add .
git commit -m "feat: 添加新功能及测试"

# 5. 推送并创建 PR
git push origin feature/new-function
```

## 总结

Project-Z 测试框架提供了完整的测试解决方案，包括：

- ✅ **单元测试**：测试工具函数和业务逻辑
- ✅ **App 功能测试**：测试页面功能和用户交互
- ✅ **模拟环境**：模拟 uni-app 和 plus 环境
- ✅ **配置灵活**：支持多种测试配置
- ✅ **易于集成**：简单的安装和配置过程
- ✅ **团队协作**：支持持续集成和代码质量检查

通过遵循本指南，您可以：

1. 快速集成测试框架到新项目
2. 为现有项目添加测试覆盖
3. 建立团队测试规范和流程
4. 提高代码质量和开发效率

开始使用测试框架，让您的项目更加稳定可靠！🚀
