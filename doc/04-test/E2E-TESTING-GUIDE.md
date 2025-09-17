# E2E测试实施指南

## 🎯 概述

本指南详细介绍如何在Project-Z项目中实施uni-automator端到端测试，包括环境配置、测试编写、最佳实践等。

## 🛠️ 环境配置

### 1. 安装依赖

```bash
# 安装uni-automator
npm install @dcloudio/uni-automator --save-dev

# 安装相关依赖
npm install @dcloudio/uni-cli-shared --save-dev
```

### 2. Jest配置

创建E2E测试专用配置：

```javascript
// jest.config.e2e.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup/e2e.setup.js'],
  testTimeout: 30000,
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './tests/reports/e2e',
      filename: 'e2e-report.html'
    }]
  ]
}
```

### 3. 测试环境设置

```javascript
// tests/setup/e2e.setup.js
const { program } = require('@dcloudio/uni-automator')

// 全局测试配置
global.testConfig = {
  timeout: 30000,
  retries: 2,
  platforms: ['h5', 'app-plus']
}

// 测试数据清理
afterAll(async () => {
  // 清理测试数据
  await program.close()
})
```

## 📝 测试编写规范

### 1. 测试文件结构

```
tests/e2e/
├── pages/                 # 页面测试
│   ├── project/          # 项目管理页面
│   ├── knowledge/        # 知识库页面
│   └── profile/          # 个人中心页面
├── flows/                # 业务流程测试
│   ├── project-creation.test.js
│   ├── knowledge-management.test.js
│   └── user-registration.test.js
├── components/           # 组件测试
└── utils/               # 测试工具
    ├── page-helpers.js
    └── test-data.js
```

### 2. 测试用例模板

```javascript
// tests/e2e/flows/project-creation.test.js
describe('项目创建流程E2E测试', () => {
  let page
  
  beforeAll(async () => {
    // 启动应用并导航到项目列表页
    page = await program.reLaunch('/pages/project/project-list')
    await page.waitFor('view')
  })
  
  afterEach(async () => {
    // 每个测试后清理数据
    await cleanupTestData()
  })
  
  describe('创建新项目', () => {
    it('应该能够成功创建项目', async () => {
      // 1. 点击创建按钮
      const createBtn = await page.$('.create-project-btn')
      expect(createBtn).toBeTruthy()
      await createBtn.tap()
      
      // 2. 等待页面跳转
      await page.waitFor(1000)
      
      // 3. 填写项目信息
      await fillProjectForm({
        name: '测试项目',
        description: '这是一个E2E测试项目',
        goal: '验证项目创建功能'
      })
      
      // 4. 提交表单
      const submitBtn = await page.$('.submit-btn')
      await submitBtn.tap()
      
      // 5. 等待创建完成
      await page.waitFor(2000)
      
      // 6. 验证结果
      expect(await page.data('projectCreated')).toBeTruthy()
      expect(await page.data('projectId')).toBeGreaterThan(0)
    })
    
    it('应该验证必填字段', async () => {
      // 测试表单验证
      const createBtn = await page.$('.create-project-btn')
      await createBtn.tap()
      
      await page.waitFor(1000)
      
      // 不填写任何信息直接提交
      const submitBtn = await page.$('.submit-btn')
      await submitBtn.tap()
      
      // 验证错误提示
      const errorMsg = await page.$('.error-message')
      expect(await errorMsg.text()).toContain('项目名称不能为空')
    })
  })
  
  describe('项目列表操作', () => {
    it('应该能够查看项目列表', async () => {
      // 验证项目列表显示
      const projectList = await page.$('.project-list')
      expect(projectList).toBeTruthy()
      
      // 验证项目项
      const projectItems = await page.$$('.project-item')
      expect(projectItems.length).toBeGreaterThan(0)
    })
    
    it('应该能够搜索项目', async () => {
      // 输入搜索关键词
      const searchInput = await page.$('.search-input')
      await searchInput.input('测试')
      
      // 等待搜索结果
      await page.waitFor(1000)
      
      // 验证搜索结果
      const projectItems = await page.$$('.project-item')
      expect(projectItems.length).toBeGreaterThan(0)
    })
  })
})
```

### 3. 测试工具函数

```javascript
// tests/e2e/utils/page-helpers.js

/**
 * 填写项目表单
 */
async function fillProjectForm(data) {
  const nameInput = await page.$('#project-name')
  await nameInput.input(data.name)
  
  const descInput = await page.$('#project-desc')
  await descInput.input(data.description)
  
  const goalInput = await page.$('#project-goal')
  await goalInput.input(data.goal)
}

/**
 * 等待元素出现
 */
async function waitForElement(selector, timeout = 5000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const element = await page.$(selector)
    if (element) return element
    await page.waitFor(100)
  }
  throw new Error(`Element ${selector} not found within ${timeout}ms`)
}

/**
 * 清理测试数据
 */
async function cleanupTestData() {
  // 删除测试创建的项目
  const testProjects = await page.data('projects')
  if (testProjects) {
    const testProject = testProjects.find(p => p.name.includes('测试'))
    if (testProject) {
      await page.callMethod('deleteProject', testProject.id)
    }
  }
}

/**
 * 登录测试用户
 */
async function loginTestUser() {
  // 模拟登录流程
  await page.callMethod('login', {
    username: 'testuser',
    password: 'testpass'
  })
  await page.waitFor(1000)
}

module.exports = {
  fillProjectForm,
  waitForElement,
  cleanupTestData,
  loginTestUser
}
```

## 🎯 关键测试场景

### 1. 项目管理流程

```javascript
describe('项目管理完整流程', () => {
  it('应该完成项目创建到完成的完整流程', async () => {
    // 1. 创建项目
    await createProject({
      name: 'E2E测试项目',
      description: '完整流程测试'
    })
    
    // 2. 添加里程碑
    await addMilestone({
      title: '第一阶段',
      description: '需求分析'
    })
    
    // 3. 添加项目日志
    await addProjectLog({
      content: '开始需求分析工作',
      progress: 20
    })
    
    // 4. 更新项目状态
    await updateProjectStatus('in_progress')
    
    // 5. 完成项目
    await completeProject()
    
    // 6. 验证最终状态
    expect(await page.data('projectStatus')).toBe('completed')
  })
})
```

### 2. 知识库管理流程

```javascript
describe('知识库管理流程', () => {
  it('应该能够创建和管理知识条目', async () => {
    // 1. 创建知识条目
    await createKnowledge({
      title: 'E2E测试知识',
      content: '这是测试知识内容',
      tags: ['测试', 'E2E']
    })
    
    // 2. 搜索知识
    await searchKnowledge('E2E')
    
    // 3. 编辑知识
    await editKnowledge({
      title: '更新后的E2E测试知识',
      content: '更新后的内容'
    })
    
    // 4. 删除知识
    await deleteKnowledge()
    
    // 5. 验证删除结果
    expect(await page.data('knowledgeList')).toHaveLength(0)
  })
})
```

### 3. 用户交互流程

```javascript
describe('用户交互流程', () => {
  it('应该能够处理用户的各种操作', async () => {
    // 1. 页面导航
    await navigateToPage('/pages/project/project-list')
    
    // 2. 下拉刷新
    await page.callMethod('onPullDownRefresh')
    await page.waitFor(1000)
    
    // 3. 上拉加载
    await page.callMethod('onReachBottom')
    await page.waitFor(1000)
    
    // 4. 返回操作
    await page.callMethod('onBackPress')
    
    // 5. 验证页面状态
    expect(await page.data('isRefreshing')).toBeFalsy()
  })
})
```

## 🔧 最佳实践

### 1. 测试数据管理

```javascript
// tests/e2e/utils/test-data.js

const testData = {
  users: {
    admin: {
      username: 'admin',
      password: 'admin123',
      role: 'admin'
    },
    user: {
      username: 'testuser',
      password: 'testpass',
      role: 'user'
    }
  },
  projects: {
    valid: {
      name: 'E2E测试项目',
      description: '用于E2E测试的项目',
      goal: '验证项目功能'
    },
    invalid: {
      name: '',
      description: '无效项目'
    }
  }
}

module.exports = testData
```

### 2. 错误处理

```javascript
describe('错误处理测试', () => {
  it('应该能够处理网络错误', async () => {
    // 模拟网络错误
    await page.callMethod('simulateNetworkError')
    
    // 尝试创建项目
    await createProject(testData.projects.valid)
    
    // 验证错误处理
    const errorToast = await page.$('.error-toast')
    expect(errorToast).toBeTruthy()
    expect(await errorToast.text()).toContain('网络错误')
  })
  
  it('应该能够处理数据验证错误', async () => {
    // 提交无效数据
    await createProject(testData.projects.invalid)
    
    // 验证错误提示
    const errorMsg = await page.$('.form-error')
    expect(errorMsg).toBeTruthy()
  })
})
```

### 3. 性能测试

```javascript
describe('性能测试', () => {
  it('应该能够快速加载项目列表', async () => {
    const startTime = Date.now()
    
    await page.reLaunch('/pages/project/project-list')
    await page.waitFor('view')
    
    const loadTime = Date.now() - startTime
    
    // 验证加载时间
    expect(loadTime).toBeLessThan(3000) // 3秒内完成加载
  })
  
  it('应该能够处理大量数据', async () => {
    // 创建大量测试数据
    await createMultipleProjects(100)
    
    // 验证列表性能
    const projectList = await page.$('.project-list')
    expect(projectList).toBeTruthy()
    
    // 验证滚动性能
    await page.callMethod('scrollToBottom')
    await page.waitFor(1000)
  })
})
```

## 📊 测试报告

### 1. 测试执行

```bash
# 运行E2E测试
npm run test:e2e

# 运行特定测试
npm run test:e2e -- --testNamePattern="项目管理"

# 生成测试报告
npm run test:e2e -- --reporters=html
```

### 2. 测试报告配置

```javascript
// jest.config.e2e.js
module.exports = {
  // ... 其他配置
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './tests/reports/e2e',
      filename: 'e2e-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'Project-Z E2E测试报告'
    }],
    ['jest-junit', {
      outputDirectory: './tests/reports/e2e',
      outputName: 'e2e-results.xml'
    }]
  ]
}
```

## 🚀 CI/CD集成

### 1. GitHub Actions配置

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '16'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload test reports
      uses: actions/upload-artifact@v2
      with:
        name: e2e-test-reports
        path: tests/reports/e2e/
```

### 2. 测试结果通知

```javascript
// tests/setup/e2e.setup.js
const { program } = require('@dcloudio/uni-automator')

// 测试结果通知
afterAll(async () => {
  const results = global.testResults
  
  if (process.env.CI) {
    // CI环境发送通知
    await sendTestNotification(results)
  }
  
  await program.close()
})

async function sendTestNotification(results) {
  // 发送测试结果到Slack/钉钉等
  console.log(`E2E测试完成: ${results.passed}/${results.total} 通过`)
}
```

## 📝 总结

通过实施uni-automator E2E测试，Project-Z项目将获得：

1. **真实环境验证**：在真实设备上测试应用功能
2. **用户体验测试**：验证UI交互和用户流程
3. **集成问题发现**：发现模块间的集成问题
4. **端到端保证**：确保完整业务流程的正确性

E2E测试与单元测试结合使用，将构建一个完整的测试体系，确保Project-Z项目的质量和稳定性。
