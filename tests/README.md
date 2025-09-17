# 测试目录结构说明

## 📚 完整文档

- [完整测试指南](COMPLETE-TESTING-GUIDE.md) - 详细的测试架构、配置、最佳实践和故障排除指南
- [测试架构概览](TESTING-ARCHITECTURE.md) - 测试架构图和策略说明
- [快速参考](QUICK-REFERENCE.md) - 常用命令、配置和问题解决方案

## 目录组织原则

测试目录按照业务功能模块进行组织，与源代码目录结构保持一致，便于维护和查找。

## 目录结构

```
tests/
├── unit/                    # 单元测试
│   ├── api/                # API 层测试
│   │   ├── aiApi.test.js
│   │   ├── chatApi.test.js
│   │   ├── knowledgeApi.test.js
│   │   ├── projectApi.test.js
│   │   └── userApi.test.js
│   ├── utils/              # 工具函数测试
│   │   ├── appStartup.test.js
│   │   ├── cryptoUtils.test.js
│   │   ├── dateUtils.test.js
│   │   ├── dbService-simple.test.js
│   │   └── userStore.test.js
│   ├── pages/              # 页面组件测试
│   │   ├── project-list.test.js
│   │   ├── knowledge-index.test.js
│   │   └── profile-index.test.js
│   ├── components/         # 组件测试
│   │   ├── CustomNavbar.test.js
│   │   ├── ChatComponent.test.js
│   │   └── ShareCardComponent.test.js
│   └── uni_modules/        # 插件模块测试
│       ├── openai-chat.test.js
│       ├── file-manager.test.js
│       └── gitcode-sync.test.js
├── integration/            # 集成测试
│   ├── api/               # API 集成测试
│   │   ├── projectApi.test.js
│   │   └── database.test.js
│   ├── pages/             # 页面集成测试
│   │   └── index.test.js
│   └── components/        # 组件集成测试
├── e2e/                   # 端到端测试
├── setup/                 # 测试配置
│   ├── unit.setup.js
│   ├── integration.setup.js
│   └── e2e.setup.js
└── jest.config.*.js       # Jest 配置文件
```

## 测试分类

### 1. 单元测试 (Unit Tests)
- **位置**: `tests/unit/`
- **目的**: 测试单个函数、方法或组件的功能
- **特点**: 快速、独立、无外部依赖
- **覆盖**: 所有工具函数、API 方法、组件方法

### 2. 集成测试 (Integration Tests)
- **位置**: `tests/integration/`
- **目的**: 测试多个模块之间的交互
- **特点**: 测试真实的数据流和模块协作
- **覆盖**: API 与数据库交互、页面与 API 交互

### 3. 端到端测试 (E2E Tests)
- **位置**: `tests/e2e/`
- **目的**: 测试完整的用户流程
- **特点**: 模拟真实用户操作
- **覆盖**: 关键业务流程

## 命名规范

### 测试文件命名
- 单元测试: `{功能模块}.test.js`
- 集成测试: `{功能模块}.test.js`
- 端到端测试: `{功能流程}.test.js`

### 测试用例命名
- 使用中文描述: `应该能够...当...时`
- 分组使用 `describe`: 按功能模块分组
- 用例使用 `it`: 描述具体行为

## 测试覆盖范围

### API 层测试
- [x] 项目 API (projectApi.js)
- [x] 用户 API (userApi.js)
- [x] AI API (aiApi.js)
- [x] 聊天 API (chatApi.js)
- [x] 知识库 API (knowledgeApi.js)

### 工具函数测试
- [x] 数据库服务 (dbService.js)
- [x] 用户存储 (userStore.js)
- [x] 应用启动 (appStartup.js)
- [x] 日期工具 (dateUtils.js)
- [x] 加密工具 (cryptoUtils.js)

### 页面组件测试
- [x] 项目列表页 (project-list.vue)
- [x] 知识库首页 (knowledge-index.vue)
- [ ] 个人中心页 (profile-index.vue)

### 组件测试
- [x] 自定义导航栏 (CustomNavbar.vue)
- [ ] 聊天组件 (ChatComponent.vue)
- [ ] 分享卡片组件 (ShareCardComponent.vue)

## 运行测试

```bash
# 运行所有测试
npm test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:integration

# 运行端到端测试
npm run test:e2e

# 运行特定模块测试
npm test -- --testPathPattern=api

# 运行测试并生成覆盖率报告
npm run test:coverage
```

## 最佳实践

1. **测试隔离**: 每个测试用例独立运行，不依赖其他测试
2. **Mock 外部依赖**: 使用 Jest Mock 模拟外部服务
3. **测试数据**: 使用工厂函数创建测试数据
4. **错误处理**: 测试正常流程和异常情况
5. **性能测试**: 对关键功能进行性能测试
6. **文档更新**: 及时更新测试文档和覆盖率报告