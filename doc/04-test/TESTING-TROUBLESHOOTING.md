# 测试问题排查指南

## 📋 目录

- [常见错误类型](#常见错误类型)
- [错误诊断步骤](#错误诊断步骤)
- [解决方案速查](#解决方案速查)
- [调试技巧](#调试技巧)
- [预防措施](#预防措施)

## 常见错误类型

### 1. 依赖关系错误

#### 问题：循环依赖
```
Error: Cannot access 'promoApi' before initialization
```

**原因**：API之间存在循环依赖关系
**解决方案**：使用Mock隔离依赖

```javascript
// 在aiApi.test.js中
jest.mock('@/api/promoApi.js')
```

#### 问题：模块未找到
```
Error: Cannot resolve module '@/api/someApi.js'
```

**原因**：路径映射配置问题
**解决方案**：检查Jest配置中的moduleNameMapping

```javascript
// jest.config.js
moduleNameMapping: {
  '^@/(.*)$': '<rootDir>/$1'
}
```

### 2. Mock配置错误

#### 问题：Mock未生效
```
TypeError: dbService.insert is not a function
```

**原因**：Mock配置不正确
**解决方案**：确保Mock在导入之前

```javascript
// ✅ 正确顺序
jest.mock('@/utils/dbService.js')
import dbService from '@/utils/dbService.js'

// ❌ 错误顺序
import dbService from '@/utils/dbService.js'
jest.mock('@/utils/dbService.js')
```

#### 问题：Mock返回值错误
```
Expected: 123
Received: undefined
```

**原因**：Mock方法未正确配置返回值
**解决方案**：检查Mock配置

```javascript
// ✅ 正确配置
beforeEach(() => {
  dbService.insert = jest.fn().mockResolvedValue(123)
})

// ❌ 错误配置
beforeEach(() => {
  dbService.insert = jest.fn()  // 没有设置返回值
})
```

### 3. 异步测试错误

#### 问题：测试提前结束
```
Error: Timeout - Async callback was not invoked within the 5000ms timeout
```

**原因**：异步操作未正确等待
**解决方案**：使用async/await

```javascript
// ✅ 正确方式
it('应该能够异步创建项目', async () => {
  const result = await projectApi.createProject(data)
  expect(result.success).toBe(true)
})

// ❌ 错误方式
it('应该能够异步创建项目', () => {
  projectApi.createProject(data).then(result => {
    expect(result.success).toBe(true)  // 测试可能不会等待
  })
})
```

#### 问题：Promise未处理
```
UnhandledPromiseRejectionWarning: Error: 数据库连接失败
```

**原因**：Promise rejection未正确处理
**解决方案**：使用try-catch或expect().rejects

```javascript
// ✅ 正确方式
it('应该处理数据库错误', async () => {
  dbService.findMany.mockRejectedValue(new Error('数据库连接失败'))
  
  await expect(projectApi.getProjectList()).rejects.toThrow('数据库连接失败')
})

// 或者
it('应该处理数据库错误', async () => {
  dbService.findMany.mockRejectedValue(new Error('数据库连接失败'))
  
  try {
    await projectApi.getProjectList()
    fail('应该抛出错误')
  } catch (error) {
    expect(error.message).toBe('数据库连接失败')
  }
})
```

### 4. 时间相关错误

#### 问题：时间测试不稳定
```
Expected: "刚刚"
Received: "1分钟前"
```

**原因**：时间间隔设置不当
**解决方案**：使用更短的时间间隔

```javascript
// ✅ 正确方式
const thirtySecondsAgo = new Date(now.getTime() - 30000)  // 30秒前
expect(formatTime(thirtySecondsAgo.toISOString())).toBe('刚刚')

// ❌ 错误方式
const oneMinuteAgo = new Date(now.getTime() - 60000)  // 1分钟前
expect(formatTime(oneMinuteAgo.toISOString())).toBe('刚刚')  // 可能显示"1分钟前"
```

### 5. 数据格式错误

#### 问题：返回值格式不匹配
```
Expected: 123
Received: {"success": true, "data": {"id": 123}}
```

**原因**：API返回值格式与测试期望不符
**解决方案**：调整测试期望值

```javascript
// ✅ 正确方式
const result = await knowledgeApi.createKnowledge(data)
expect(result.success).toBe(true)
expect(result.data.id).toBe(123)

// ❌ 错误方式
const result = await knowledgeApi.createKnowledge(data)
expect(result).toBe(123)  // 实际返回的是对象
```

## 错误诊断步骤

### 1. 查看错误信息

```bash
# 运行测试并查看详细错误
npm test -- --verbose

# 运行特定测试文件
npm test -- tests/unit/api/chatApi.test.js --verbose
```

### 2. 检查Mock配置

```javascript
// 在测试中添加调试信息
it('应该能够创建项目', async () => {
  console.log('Mock状态:', {
    insert: dbService.insert,
    insertMock: dbService.insert.mock,
    insertResults: dbService.insert.mock.results
  })
  
  const result = await projectApi.createProject(data)
  console.log('返回结果:', result)
  
  expect(result.success).toBe(true)
})
```

### 3. 验证依赖关系

```javascript
// 检查依赖是否正确导入
console.log('aiApi:', aiApi)
console.log('promoApi:', promoApi)
console.log('dbService:', dbService)
```

### 4. 检查测试数据

```javascript
// 验证测试数据格式
const testData = createTestProject()
console.log('测试数据:', JSON.stringify(testData, null, 2))

// 验证Mock返回值
dbService.insert.mockResolvedValue(123)
console.log('Mock返回值:', await dbService.insert())
```

## 解决方案速查

### 问题：测试失败但不知道原因

**解决步骤**：
1. 运行 `npm test -- --verbose` 查看详细错误
2. 在测试中添加 `console.log` 调试信息
3. 检查Mock配置是否正确
4. 验证测试数据格式

### 问题：Mock不生效

**解决步骤**：
1. 确保 `jest.mock()` 在 `import` 之前
2. 检查Mock方法名是否正确
3. 在 `beforeEach` 中重新配置Mock
4. 使用 `jest.clearAllMocks()` 重置状态

### 问题：异步测试超时

**解决步骤**：
1. 使用 `async/await` 而不是 `.then()`
2. 检查是否有未处理的Promise rejection
3. 增加测试超时时间：`jest.setTimeout(10000)`
4. 确保所有异步操作都被等待

### 问题：测试数据不一致

**解决步骤**：
1. 使用工厂函数创建测试数据
2. 在 `beforeEach` 中重置测试数据
3. 避免测试之间的数据依赖
4. 验证测试数据的格式和内容

## 调试技巧

### 1. 使用console.log调试

```javascript
it('应该能够创建项目', async () => {
  console.log('开始测试')
  console.log('测试数据:', data)
  
  const result = await projectApi.createProject(data)
  
  console.log('返回结果:', result)
  console.log('Mock调用次数:', dbService.insert.mock.calls.length)
  console.log('Mock调用参数:', dbService.insert.mock.calls[0])
  
  expect(result.success).toBe(true)
})
```

### 2. 使用Jest调试工具

```javascript
// 检查Mock调用情况
expect(dbService.insert).toHaveBeenCalledTimes(1)
expect(dbService.insert).toHaveBeenCalledWith('projects', expect.objectContaining({
  name: '测试项目'
}))

// 检查Mock返回值
expect(dbService.insert.mock.results[0].value).resolves.toBe(123)
```

### 3. 使用断点调试

```javascript
// 在VS Code中设置断点
it('应该能够创建项目', async () => {
  debugger  // 设置断点
  const result = await projectApi.createProject(data)
  expect(result.success).toBe(true)
})
```

### 4. 分步调试

```javascript
it('应该能够创建项目', async () => {
  // 步骤1：准备数据
  const projectData = createTestProject()
  console.log('步骤1完成：数据准备')
  
  // 步骤2：配置Mock
  dbService.insert.mockResolvedValue(123)
  console.log('步骤2完成：Mock配置')
  
  // 步骤3：调用API
  const result = await projectApi.createProject(projectData)
  console.log('步骤3完成：API调用')
  
  // 步骤4：验证结果
  expect(result.success).toBe(true)
  console.log('步骤4完成：结果验证')
})
```

## 预防措施

### 1. 建立测试规范

```javascript
// 测试文件模板
describe('API名称测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 配置Mock
  })
  
  describe('基础功能测试', () => {
    it('应该能够创建资源', async () => {
      // 测试实现
    })
  })
  
  describe('错误处理测试', () => {
    it('应该处理数据库错误', async () => {
      // 错误测试实现
    })
  })
})
```

### 2. 使用测试辅助函数

```javascript
// 创建测试辅助函数
const setupMockDatabase = () => {
  dbService.isInitialized = true
  dbService.insert = jest.fn().mockResolvedValue(123)
  dbService.findMany = jest.fn().mockResolvedValue([])
  dbService.findOne = jest.fn().mockResolvedValue(null)
}

const createTestData = (overrides = {}) => ({
  name: '测试数据',
  ...overrides
})

// 在测试中使用
beforeEach(() => {
  setupMockDatabase()
})
```

### 3. 定期检查测试健康

```bash
# 定期运行所有测试
npm test

# 检查测试覆盖率
npm test -- --coverage

# 检查测试性能
npm test -- --verbose --detectOpenHandles
```

### 4. 代码审查检查点

- [ ] Mock配置是否正确
- [ ] 测试数据是否独立
- [ ] 异步操作是否正确处理
- [ ] 错误情况是否覆盖
- [ ] 测试名称是否清晰
- [ ] 测试是否可重复运行

## 总结

测试问题排查的关键是：

1. **理解错误信息**：仔细阅读错误信息，理解问题根源
2. **逐步调试**：使用console.log和断点逐步排查问题
3. **检查配置**：验证Mock配置和测试环境设置
4. **预防为主**：建立良好的测试规范和习惯

记住：好的测试是调试的好朋友，而不是负担！
