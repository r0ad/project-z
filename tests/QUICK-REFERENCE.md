# 测试快速参考

## 🚀 快速开始

### 运行测试
```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行App平台测试
npm run test:app

# 运行E2E测试
npm run test:e2e
```

### 平台特定测试
```bash
# Android平台
npm run test:android

# iOS平台
npm run test:ios

# H5平台
npm run test:h5

# 微信小程序
npm run test:mp-weixin
```

## 📁 目录结构

```
tests/
├── unit/                    # 单元测试 (70%)
│   ├── api/                # API层测试
│   ├── utils/              # 工具函数测试
│   ├── pages/              # 页面组件测试
│   ├── components/         # 组件测试
│   └── uni_modules/        # 插件模块测试
├── integration/            # 集成测试 (20%)
│   ├── api/                # API集成测试
│   ├── pages/              # 页面集成测试
│   └── components/         # 组件集成测试
├── app/                    # App平台测试 (5%)
│   └── pages/              # App页面测试
├── e2e/                    # 端到端测试 (5%)
├── setup/                  # 测试配置
└── jest.config.*.js        # Jest配置文件
```

## 🧪 测试类型

### 单元测试 (Unit Tests)
- **位置：** `tests/unit/`
- **目的：** 测试单个函数、方法或组件
- **特点：** 快速、独立、无外部依赖
- **运行：** `npm run test:unit`

### 集成测试 (Integration Tests)
- **位置：** `tests/integration/`
- **目的：** 测试多个模块之间的交互
- **特点：** 测试真实的数据流和模块协作
- **运行：** `npm run test:integration`

### App平台测试 (App Tests)
- **位置：** `tests/app/`
- **目的：** 测试App平台特定功能
- **特点：** 模拟真实App环境
- **运行：** `npm run test:app`

### 端到端测试 (E2E Tests)
- **位置：** `tests/e2e/`
- **目的：** 测试完整的用户流程
- **特点：** 模拟真实用户操作
- **运行：** `npm run test:e2e`

## ⚙️ 配置文件

### Jest配置
- `jest.config.unit.js` - 单元测试配置
- `jest.config.integration.js` - 集成测试配置
- `jest.config.app.js` - App平台测试配置
- `jest.config.e2e.js` - E2E测试配置

### 测试设置
- `setup/unit.setup.js` - 单元测试设置
- `setup/integration.setup.js` - 集成测试设置
- `setup/app.setup.js` - App测试设置
- `setup/e2e.setup.js` - E2E测试设置
- `setup/uniapp.setup.js` - UniApp环境模拟

## 🎯 测试优先级

### P0 - 核心功能测试（必须）
- 数据库服务 (dbService.js)
- 项目管理 API (projectApi.js)
- 用户存储 (userStore.js)
- 应用启动 (appStartup.js)

### P1 - 业务功能测试（重要）
- AI 聊天功能 (aiApi.js, chatApi.js)
- 知识库管理 (knowledgeApi.js)
- 收藏功能 (favoriteApi.js)

### P2 - 页面功能测试（中等）
- 项目管理页面
- 知识库页面
- 个人中心页面

### P3 - 工具和组件测试（低优先级）
- 工具函数
- 组件测试
- 第三方模块

## 🔧 常用命令

### 测试运行
```bash
# 运行特定文件
npm test -- tests/unit/api/aiApi.test.js

# 运行特定模式
npm test -- --testPathPattern=api

# 监视模式
npm run test:watch

# 生成覆盖率报告
npm run test:coverage
```

### 调试测试
```bash
# 详细输出
npm test -- --verbose

# 停在第一个失败处
npm test -- --bail

# 显示覆盖率
npm test -- --coverage
```

## 📊 测试指标

### 覆盖率目标
- **整体覆盖率：** 80%+
- **核心模块覆盖率：** 95%+
- **业务模块覆盖率：** 85%+

### 性能指标
- **测试执行时间：** < 5分钟
- **测试通过率：** 100%
- **测试维护成本：** 低

## 🐛 常见问题

### 数据库初始化失败
```javascript
// 解决方案：在测试前设置数据库状态
beforeEach(() => {
  dbService.isInitialized = true
})
```

### 模块导入问题
```javascript
// 检查moduleNameMapper配置
moduleNameMapper: {
  '^@/(.*)$': '<rootDir>/../$1'
}
```

### 异步测试超时
```javascript
// 设置超时时间
it('异步测试', async () => {
  // 测试代码
}, 10000) // 10秒超时
```

## 📚 相关文档

- [完整测试指南](COMPLETE-TESTING-GUIDE.md) - 详细的测试文档
- [UniApp Jest集成解决方案](../doc/04-test/UNIAPP-JEST-INTEGRATION-SOLUTION.md) - 集成解决方案
- [测试策略总览](../doc/04-test/README.md) - 测试策略文档

---

**文档版本：** v1.0  
**创建时间：** 2024-01-15  
**维护者：** AI Assistant  
**状态：** 已完成 ✅
