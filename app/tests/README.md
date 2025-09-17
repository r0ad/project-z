# 测试目录结构说明

## 目录组织

```
tests/
├── unit/                    # 单元测试
│   ├── dbService.test.js    # 数据库服务测试
│   ├── projectApi.test.js   # 项目API测试
│   └── ...                  # 其他单元测试
├── integration/             # 集成测试
│   ├── projectFlow.test.js  # 项目流程测试
│   └── ...                  # 其他集成测试
├── e2e/                     # 端到端测试
│   ├── appStartup.test.js   # 应用启动测试
│   └── ...                  # 其他E2E测试
├── setup/                   # 测试设置文件
│   ├── unit.setup.js        # 单元测试设置
│   ├── integration.setup.js # 集成测试设置
│   └── e2e.setup.js         # E2E测试设置
├── coverage/                # 测试覆盖率报告
├── jest.config.unit.js      # 单元测试配置
├── jest.config.integration.js # 集成测试配置
├── jest.config.e2e.js       # E2E测试配置
└── README.md               # 本文件
```

## 测试类型说明

### 单元测试 (Unit Tests)
- **位置**: `tests/unit/`
- **目的**: 测试单个函数、类或模块的功能
- **环境**: Node.js 环境，使用模拟对象
- **特点**: 快速、独立、不依赖外部资源
- **运行**: `npm run test:unit`

### 集成测试 (Integration Tests)
- **位置**: `tests/integration/`
- **目的**: 测试多个模块之间的交互
- **环境**: App Plus 环境，使用真实数据库
- **特点**: 测试模块间的接口和数据流
- **运行**: `npm run test:integration`

### 端到端测试 (E2E Tests)
- **位置**: `tests/e2e/`
- **目的**: 测试完整的用户流程
- **环境**: App Plus 环境，完整的应用环境
- **特点**: 模拟真实用户操作，测试完整功能
- **运行**: `npm run test:e2e`

## 运行测试

### 运行所有测试
```bash
npm test
```

### 运行特定类型测试
```bash
# 只运行单元测试
npm run test:unit

# 只运行集成测试
npm run test:integration

# 只运行E2E测试
npm run test:e2e
```

### 监听模式
```bash
# 监听单元测试变化
npm run test:watch
```

### 生成覆盖率报告
```bash
npm run test:coverage
```

## 测试文件命名规范

- 单元测试: `*.test.js` 或 `*.spec.js`
- 集成测试: `*.test.js`
- E2E测试: `*.test.js`

## 测试配置

每个测试类型都有独立的配置文件：
- `jest.config.unit.js` - 单元测试配置
- `jest.config.integration.js` - 集成测试配置
- `jest.config.e2e.js` - E2E测试配置

## 最佳实践

1. **单元测试**: 专注于单个功能，使用模拟对象
2. **集成测试**: 测试模块间交互，使用真实数据
3. **E2E测试**: 测试完整用户流程，模拟真实操作
4. **测试隔离**: 每个测试应该独立运行
5. **测试数据**: 使用测试专用的数据，避免污染生产数据
6. **错误处理**: 测试正常流程和异常情况
