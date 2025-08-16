# 本地文件管理器插件

基于 uni-app 的本地文件管理插件，提供文件读写、列表获取等功能。

## 功能特性

- ✅ 文件写入（支持字符串和JSON对象）
- ✅ 文件读取（自动处理BOM和编码问题）
- ✅ 文件列表获取（按修改时间排序）
- ✅ 文件大小格式化显示
- ✅ 跨平台支持（Android/iOS）
- ✅ 使用应用私有目录，无需额外权限
- ✅ 自动创建目录结构

## 安装使用

### 1. 导入插件

```javascript
import FileManager from '@/uni_modules/file-manager/js_sdk/index.js'
// 或者按需导入
import { writeFile, readFile, getFileList } from '@/uni_modules/file-manager/js_sdk/index.js'
```

### 2. 基本使用

#### 写入文件

```javascript
// 写入文本文件
const filePath = await FileManager.writeFile('Hello World', 'test.txt')
console.log('文件保存路径:', filePath)

// 写入JSON文件
const data = { name: '张三', age: 25 }
const jsonPath = await FileManager.writeFile(data, 'user.json')
```

#### 读取文件

```javascript
try {
  const content = await FileManager.readFile('test.txt')
  console.log('文件内容:', content)
} catch (error) {
  console.error('读取失败:', error)
}
```

#### 获取文件列表

```javascript
try {
  const fileList = await FileManager.getFileList()
  fileList.forEach(file => {
    console.log(`文件: ${file.name}, 大小: ${FileManager.formatFileSize(file.size)}, 修改时间: ${file.lastModifiedDate}`)
  })
} catch (error) {
  console.error('获取文件列表失败:', error)
}
```

#### 格式化文件大小

```javascript
const size = FileManager.formatFileSize(1024) // "1 KB"
const size2 = FileManager.formatFileSize(1048576) // "1 MB"
```

#### 获取应用目录路径

```javascript
const appDir = FileManager.getAppPrivateDir()
console.log('应用私有目录:', appDir)
```

## 配置选项

### 修改基础目录

```javascript
import { FileManagerConfig } from '@/uni_modules/file-manager/js_sdk/index.js'

// 获取当前基础目录
const currentDir = FileManagerConfig.getBaseDir() // 默认: "app-data"

// 设置新的基础目录
FileManagerConfig.setBaseDir('my-app-data')
```

## API 参考

### writeFile(data, fileName)

写入文件到应用私有目录。

**参数：**
- `data` (string|object): 要写入的数据
- `fileName` (string): 文件名（支持子目录，如 'folder/file.txt'）

**返回：**
- Promise<string>: 文件的完整路径

### readFile(fileName)

从应用私有目录读取文件。

**参数：**
- `fileName` (string): 文件名

**返回：**
- Promise<string>: 文件内容

### getFileList()

获取应用私有目录下的所有文件列表。

**返回：**
- Promise<Array>: 文件信息数组
  ```javascript
  [
    {
      name: "file.txt",
      size: 1024,
      lastModified: 1640995200000,
      lastModifiedDate: "2022/1/1 12:00:00"
    }
  ]
  ```

### formatFileSize(bytes)

格式化文件大小显示。

**参数：**
- `bytes` (number): 文件大小（字节）

**返回：**
- string: 格式化后的大小（如 "1.5 KB"）

### getAppPrivateDir()

获取应用私有目录的路径。

**返回：**
- string: 目录路径

## 错误处理

所有异步方法都会在失败时抛出异常，建议使用 try-catch 进行错误处理：

```javascript
try {
  const content = await FileManager.readFile('nonexistent.txt')
} catch (error) {
  if (error.message.includes('文件不存在')) {
    console.log('文件不存在，创建新文件')
    await FileManager.writeFile('默认内容', 'nonexistent.txt')
  } else {
    console.error('其他错误:', error)
  }
}
```

## 平台差异说明

### Android
- 使用 Java 原生 API 进行文件操作
- 文件路径：`应用私有文档目录/app-data/`
- 支持同步和异步操作

### iOS
- 使用 HTML5 File API
- 文件路径：`应用私有文档目录/app-data/`
- 仅支持异步操作

### 其他平台
- 方法会返回空数组或默认值
- 不会报错，但功能不可用

## 注意事项

1. **权限要求**：使用应用私有目录，无需申请存储权限
2. **文件编码**：自动处理 UTF-8 编码和 BOM 问题
3. **目录创建**：会自动创建不存在的目录结构
4. **文件覆盖**：写入同名文件会覆盖原文件
5. **平台兼容**：仅在 APP 端有效，其他平台返回默认值

## 版本历史

### v1.0.0
- 初始版本
- 支持基本的文件读写功能
- 支持文件列表获取
- 跨平台兼容（Android/iOS）