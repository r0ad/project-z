# GitCode同步插件

基于dairy-app项目的GitCode同步功能封装的uni-app插件，支持与GitCode仓库进行数据同步。

## 功能特性

- ✅ 支持上传数据到GitCode仓库
- ✅ 支持从GitCode仓库下载数据
- ✅ 自动处理分支创建和文件更新
- ✅ 完整的错误处理和状态反馈
- ✅ 支持配置管理和验证
- ✅ 支持连接测试和仓库信息获取

## 安装使用

### 1. 导入插件

```javascript
import { GitCodeSync, GitCodeSyncConfig } from '@/uni_modules/gitcode-sync/js_sdk/index.js'
```

### 2. 配置GitCode

```javascript
// 配置GitCode连接信息
const config = {
  owner: 'your-username',        // GitCode用户名或组织名
  repo: 'your-repository',       // 仓库名
  accessToken: 'your-token',     // GitCode访问令牌
  branch: 'main',                // 分支名（可选，默认main）
  filePath: 'data.json',         // 文件路径（可选，默认data.json）
  baseUrl: 'https://gitcode.com/api/v5'  // API地址（可选）
}

// 保存配置
GitCodeSyncConfig.setConfig(config)
```

### 3. 创建同步实例

```javascript
// 从存储中获取配置
const savedConfig = GitCodeSyncConfig.getConfig()

// 验证配置
GitCodeSyncConfig.validateConfig(savedConfig)

// 创建同步实例
const gitSync = new GitCodeSync(savedConfig)
```

### 4. 基本操作

#### 测试连接

```javascript
try {
  const result = await gitSync.testConnection()
  console.log('连接成功:', result)
} catch (error) {
  console.error('连接失败:', error.message)
}
```

#### 上传数据

```javascript
const data = {
  timestamp: Date.now(),
  content: 'Hello GitCode'
}

try {
  const result = await gitSync.uploadData(data, 'my-data.json')
  console.log('上传成功:', result)
} catch (error) {
  console.error('上传失败:', error.message)
}
```

#### 下载数据

```javascript
try {
  const data = await gitSync.downloadData('my-data.json')
  console.log('下载成功:', data)
} catch (error) {
  console.error('下载失败:', error.message)
}
```

#### 获取仓库信息

```javascript
try {
  const repoInfo = await gitSync.getRepoInfo()
  console.log('仓库信息:', repoInfo)
} catch (error) {
  console.error('获取失败:', error.message)
}
```

#### 获取分支列表

```javascript
try {
  const branches = await gitSync.getBranches()
  console.log('分支列表:', branches)
} catch (error) {
  console.error('获取失败:', error.message)
}
```

## 配置参数

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| owner | String | 是 | - | GitCode用户名或组织名 |
| repo | String | 是 | - | 仓库名 |
| accessToken | String | 是 | - | GitCode访问令牌 |
| branch | String | 否 | 'main' | 目标分支名 |
| filePath | String | 否 | 'data.json' | 默认文件路径 |
| baseUrl | String | 否 | 'https://gitcode.com/api/v5' | GitCode API地址 |

## 错误处理

插件提供详细的错误信息，常见错误类型：

- `401`: 认证失败，请检查访问令牌
- `403`: 权限不足，请检查令牌权限
- `404`: 仓库或文件不存在
- `422`: 参数错误，请检查分支名和文件路径

## 获取GitCode访问令牌

1. 登录GitCode网站
2. 进入个人设置 -> 访问令牌
3. 创建新的访问令牌
4. 选择适当的权限范围（至少需要repo权限）
5. 复制生成的令牌

## 注意事项

- 访问令牌请妥善保管，不要泄露
- 建议使用专门的分支进行数据同步
- 大文件上传可能需要较长时间
- 网络异常时会自动重试

## 版本历史

### v1.0.0
- 初始版本
- 支持基本的上传下载功能
- 支持配置管理
- 支持连接测试