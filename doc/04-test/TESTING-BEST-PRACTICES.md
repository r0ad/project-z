# 测试最佳实践指南

## 📋 目录

- [测试编写原则](#测试编写原则)
- [Mock使用策略](#mock使用策略)
- [测试数据管理](#测试数据管理)
- [错误处理测试](#错误处理测试)
- [性能测试考虑](#性能测试考虑)
- [代码覆盖率](#代码覆盖率)
- [测试维护](#测试维护)
- [常见陷阱](#常见陷阱)

## 测试编写原则

### 1. 单一职责原则 (SRP)

每个测试用例应该只测试一个功能点：

```javascript
// ✅ 好的做法
it('应该能够创建项目当提供有效数据时', async () => {
  const projectData = { name: '测试项目', description: '描述' }
  const result = await projectApi.createProject(projectData)
  expect(result.success).toBe(true)
})

it('应该抛出错误当项目名称为空时', async () => {
  const projectData = { name: '', description: '描述' }
  await expect(projectApi.createProject(projectData)).rejects.toThrow('项目名称不能为空')
})

// ❌ 避免的做法
it('应该能够创建和管理项目', async () => {
  // 测试创建
  const result = await projectApi.createProject(data)
  expect(result.success).toBe(true)
  
  // 测试更新
  const updateResult = await projectApi.updateProject(1, updateData)
  expect(updateResult.success).toBe(true)
  
  // 测试删除
  const deleteResult = await projectApi.deleteProject(1)
  expect(deleteResult.success).toBe(true)
})
```

### 2. 独立性原则

测试用例之间应该相互独立：

```javascript
// ✅ 好的做法 - 每个测试都设置自己的数据
describe('项目管理测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 重置所有Mock状态
  })
  
  it('应该能够创建项目', async () => {
    const projectData = createTestProject()
    const result = await projectApi.createProject(projectData)
    expect(result.success).toBe(true)
  })
  
  it('应该能够获取项目列表', async () => {
    dbService.findMany.mockResolvedValue([createTestProject()])
    const result = await projectApi.getProjectList()
    expect(result).toHaveLength(1)
  })
})

// ❌ 避免的做法 - 测试之间相互依赖
describe('项目管理测试', () => {
  let projectId
  
  it('应该能够创建项目', async () => {
    const result = await projectApi.createProject(data)
    projectId = result.data.id  // 设置给下一个测试使用
    expect(result.success).toBe(true)
  })
  
  it('应该能够更新项目', async () => {
    // 依赖上一个测试的projectId
    const result = await projectApi.updateProject(projectId, updateData)
    expect(result.success).toBe(true)
  })
})
```

### 3. 可读性原则

测试名称应该清晰描述测试意图：

```javascript
// ✅ 好的测试命名
it('应该能够创建项目当提供有效数据时', () => {})
it('应该抛出错误当项目名称为空时', () => {})
it('应该能够处理数据库连接失败', () => {})
it('应该返回空数组当没有找到项目时', () => {})

// ❌ 避免的命名
it('测试创建', () => {})
it('应该工作', () => {})
it('错误测试', () => {})
it('测试1', () => {})
```

## Mock使用策略

### 1. 最小化Mock原则

只Mock必要的依赖，避免过度Mock：

```javascript
// ✅ 好的做法 - 只Mock必要的依赖
jest.mock('@/utils/dbService.js')  // 需要Mock
jest.mock('@/utils/userStore.js')  // 需要Mock

// 不需要Mock内部工具函数
const internalHelper = (data) => { /* 内部逻辑 */ }

// ❌ 避免的做法 - 过度Mock
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')
jest.mock('@/utils/cryptoUtils.js')  // 可能不需要Mock
jest.mock('@/utils/stringUtils.js')  // 可能不需要Mock
```

### 2. 真实数据原则

Mock返回的数据应该符合真实API的格式：

```javascript
// ✅ 好的做法 - 返回真实格式的数据
dbService.insert.mockResolvedValue(123)  // 返回真实的ID
dbService.findMany.mockResolvedValue([
  {
    id: 1,
    name: '测试项目',
    status: 'active',
    created_at: '2024-01-01T10:00:00.000Z'
  }
])

// ❌ 避免的做法 - 返回不真实的数据
dbService.insert.mockResolvedValue('success')
dbService.findMany.mockResolvedValue('data')
```

### 3. 状态重置原则

每个测试前都应该重置Mock状态：

```javascript
describe('API测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()  // 重置所有Mock调用历史
    
    // 重置Mock返回值
    dbService.insert.mockResolvedValue(123)
    dbService.findMany.mockResolvedValue([])
  })
})
```

## 测试数据管理

### 1. 使用工厂函数

```javascript
// 创建测试数据工厂
const createTestProject = (overrides = {}) => ({
  name: '测试项目',
  description: '项目描述',
  status: 'active',
  user_id: 1,
  ...overrides
})

const createTestUser = (overrides = {}) => ({
  id: 1,
  name: '测试用户',
  email: 'test@example.com',
  ...overrides
})

// 在测试中使用
it('应该能够创建项目', async () => {
  const projectData = createTestProject({ name: '特殊项目' })
  const result = await projectApi.createProject(projectData)
  expect(result.success).toBe(true)
})
```

### 2. 使用常量定义

```javascript
// 定义测试常量
const TEST_USER_ID = 1
const TEST_PROJECT_ID = 123
const TEST_KNOWLEDGE_ID = 456

// 在测试中使用
it('应该能够获取用户项目', async () => {
  dbService.findMany.mockResolvedValue([
    createTestProject({ user_id: TEST_USER_ID })
  ])
  
  const result = await projectApi.getUserProjects(TEST_USER_ID)
  expect(result).toHaveLength(1)
})
```

### 3. 数据隔离

```javascript
// 每个测试使用独立的数据
it('应该能够创建项目A', async () => {
  const projectA = createTestProject({ name: '项目A' })
  const result = await projectApi.createProject(projectA)
  expect(result.data.name).toBe('项目A')
})

it('应该能够创建项目B', async () => {
  const projectB = createTestProject({ name: '项目B' })
  const result = await projectApi.createProject(projectB)
  expect(result.data.name).toBe('项目B')
})
```

## 错误处理测试

### 1. 测试各种错误情况

```javascript
describe('错误处理测试', () => {
  it('应该处理数据库连接失败', async () => {
    dbService.findMany.mockRejectedValue(new Error('数据库连接失败'))
    
    await expect(projectApi.getProjectList()).rejects.toThrow('数据库连接失败')
  })
  
  it('应该处理参数验证失败', async () => {
    const invalidData = { name: '' }  // 空名称
    
    await expect(projectApi.createProject(invalidData)).rejects.toThrow('项目名称不能为空')
  })
  
  it('应该处理资源不存在', async () => {
    dbService.findOne.mockResolvedValue(null)  // 项目不存在
    
    await expect(projectApi.getProjectDetail(999)).rejects.toThrow('项目不存在')
  })
})
```

### 2. 测试错误恢复

```javascript
it('应该能够从错误中恢复', async () => {
  // 第一次调用失败
  dbService.findMany.mockRejectedValueOnce(new Error('网络错误'))
  
  // 第二次调用成功
  dbService.findMany.mockResolvedValueOnce([createTestProject()])
  
  // 测试重试逻辑
  const result = await projectApi.getProjectListWithRetry()
  expect(result).toHaveLength(1)
})
```

## 性能测试考虑

### 1. 测试执行时间

```javascript
it('应该在合理时间内完成', async () => {
  const startTime = Date.now()
  
  const result = await projectApi.getProjectList()
  
  const endTime = Date.now()
  const executionTime = endTime - startTime
  
  expect(executionTime).toBeLessThan(1000)  // 应该在1秒内完成
  expect(result).toBeDefined()
})
```

### 2. 内存使用测试

```javascript
it('不应该造成内存泄漏', async () => {
  const initialMemory = process.memoryUsage().heapUsed
  
  // 执行大量操作
  for (let i = 0; i < 1000; i++) {
    await projectApi.createProject(createTestProject({ name: `项目${i}` }))
  }
  
  const finalMemory = process.memoryUsage().heapUsed
  const memoryIncrease = finalMemory - initialMemory
  
  expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)  // 内存增长应该小于50MB
})
```

## 代码覆盖率

### 1. 目标覆盖率

```javascript
// 设置覆盖率目标
module.exports = {
  collectCoverageFrom: [
    'api/**/*.js',
    'utils/**/*.js',
    '!**/*.test.js',
    '!**/node_modules/**'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### 2. 覆盖率分析

```bash
# 生成覆盖率报告
npm test -- --coverage

# 查看详细覆盖率
npm test -- --coverage --verbose
```

## 测试维护

### 1. 定期重构

```javascript
// 重构前 - 重复的测试代码
it('应该能够创建项目A', async () => {
  const projectData = { name: '项目A', description: '描述A' }
  dbService.insert.mockResolvedValue(1)
  const result = await projectApi.createProject(projectData)
  expect(result.success).toBe(true)
  expect(result.data.id).toBe(1)
})

it('应该能够创建项目B', async () => {
  const projectData = { name: '项目B', description: '描述B' }
  dbService.insert.mockResolvedValue(2)
  const result = await projectApi.createProject(projectData)
  expect(result.success).toBe(true)
  expect(result.data.id).toBe(2)
})

// 重构后 - 使用辅助函数
const testProjectCreation = (projectName, expectedId) => {
  return async () => {
    const projectData = createTestProject({ name: projectName })
    dbService.insert.mockResolvedValue(expectedId)
    const result = await projectApi.createProject(projectData)
    expect(result.success).toBe(true)
    expect(result.data.id).toBe(expectedId)
  }
}

it('应该能够创建项目A', testProjectCreation('项目A', 1))
it('应该能够创建项目B', testProjectCreation('项目B', 2))
```

### 2. 测试文档化

```javascript
/**
 * 测试项目管理API的核心功能
 * 
 * 覆盖场景：
 * - 项目创建、查询、更新、删除
 * - 参数验证和错误处理
 * - 数据库操作和状态管理
 */
describe('项目管理API测试', () => {
  // 测试实现...
})
```

## 常见陷阱

### 1. 异步测试陷阱

```javascript
// ❌ 错误 - 没有等待异步操作
it('应该能够创建项目', () => {
  projectApi.createProject(data).then(result => {
    expect(result.success).toBe(true)  // 测试可能不会等待这个断言
  })
})

// ✅ 正确 - 使用async/await
it('应该能够创建项目', async () => {
  const result = await projectApi.createProject(data)
  expect(result.success).toBe(true)
})
```

### 2. Mock状态污染

```javascript
// ❌ 错误 - Mock状态在测试间污染
describe('测试组', () => {
  it('测试1', () => {
    dbService.insert.mockResolvedValue(1)
    // 测试逻辑...
  })
  
  it('测试2', () => {
    // dbService.insert仍然返回1，可能不是期望的值
    const result = await api.someMethod()
    expect(result).toBe(2)  // 可能失败
  })
})

// ✅ 正确 - 每个测试前重置Mock
describe('测试组', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  it('测试1', () => {
    dbService.insert.mockResolvedValue(1)
    // 测试逻辑...
  })
  
  it('测试2', () => {
    dbService.insert.mockResolvedValue(2)
    // 测试逻辑...
  })
})
```

### 3. 测试数据依赖

```javascript
// ❌ 错误 - 测试数据相互依赖
describe('测试组', () => {
  let projectId
  
  it('创建项目', async () => {
    const result = await projectApi.createProject(data)
    projectId = result.data.id  // 设置给下一个测试
  })
  
  it('更新项目', async () => {
    // 依赖上一个测试的projectId
    const result = await projectApi.updateProject(projectId, updateData)
    expect(result.success).toBe(true)
  })
})

// ✅ 正确 - 每个测试独立
describe('测试组', () => {
  it('创建项目', async () => {
    dbService.insert.mockResolvedValue(123)
    const result = await projectApi.createProject(data)
    expect(result.data.id).toBe(123)
  })
  
  it('更新项目', async () => {
    dbService.findOne.mockResolvedValue(createTestProject())
    dbService.update.mockResolvedValue(true)
    const result = await projectApi.updateProject(123, updateData)
    expect(result.success).toBe(true)
  })
})
```

## 总结

遵循这些最佳实践可以确保：

- ✅ **测试质量高**：测试准确、可靠、易维护
- ✅ **开发效率高**：快速发现问题，减少调试时间
- ✅ **代码质量好**：通过测试驱动开发提高代码质量
- ✅ **团队协作好**：统一的测试标准便于团队协作

记住：好的测试是项目成功的重要保障！
