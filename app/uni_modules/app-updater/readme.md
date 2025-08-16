# 应用更新器插件

基于 uni-app 的应用自动更新插件，支持版本检查、下载安装包、自动安装等功能。

## 功能特性

- ✅ 版本检查（支持语义化版本号比较）
- ✅ 应用更新包下载（带进度显示）
- ✅ 自动安装更新包
- ✅ 下载进度监听
- ✅ 取消下载功能
- ✅ 错误处理和重试机制
- ✅ 仅支持 Android 平台（iOS 不支持应用内更新）
- ✅ 灵活的配置选项

## 安装使用

### 1. 导入插件

```javascript
import AppUpdater from '@/uni_modules/app-updater/js_sdk/index.js'
// 或者按需导入
import { AppUpdater, checkAppUpdate, downloadAndInstall } from '@/uni_modules/app-updater/js_sdk/index.js'
```

### 2. 基本使用

#### 检查更新

```javascript
// 简单检查更新
try {
  const updateInfo = await checkAppUpdate('https://api.example.com/check-update')
  if (updateInfo.hasUpdate) {
    console.log('发现新版本:', updateInfo.version)
    console.log('更新说明:', updateInfo.description)
  } else {
    console.log('当前已是最新版本')
  }
} catch (error) {
  console.error('检查更新失败:', error)
}

// 使用类实例
const updater = new AppUpdater({
  updateUrl: 'https://api.example.com/check-update'
})

const updateInfo = await updater.checkUpdate()
```

#### 下载并安装更新

```javascript
// 简单下载安装
try {
  const result = await downloadAndInstall(
    'https://example.com/app-v2.0.0.apk',
    (progress, downloaded, total) => {
      console.log(`下载进度: ${progress}%`)
      console.log(`已下载: ${downloaded}/${total} 字节`)
    }
  )
  console.log('更新完成:', result)
} catch (error) {
  console.error('更新失败:', error)
}

// 使用类实例进行完整更新流程
const updater = new AppUpdater({
  autoInstall: true,
  showProgress: true
})

try {
  const updateInfo = await updater.checkUpdate()
  if (updateInfo.hasUpdate) {
    const result = await updater.performUpdate(updateInfo, (progress) => {
      console.log(`下载进度: ${progress}%`)
    })
    console.log('更新结果:', result)
  }
} catch (error) {
  console.error('更新失败:', error)
}
```

#### 分步骤更新

```javascript
const updater = new AppUpdater({
  autoInstall: false, // 不自动安装
  showProgress: true
})

try {
  // 1. 检查更新
  const updateInfo = await updater.checkUpdate()
  if (!updateInfo.hasUpdate) {
    uni.showToast({ title: '当前已是最新版本', icon: 'none' })
    return
  }

  // 2. 询问用户是否更新
  const confirmResult = await uni.showModal({
    title: '发现新版本',
    content: `版本 ${updateInfo.version}\n${updateInfo.description}`,
    confirmText: '立即更新',
    cancelText: '稍后再说'
  })

  if (!confirmResult.confirm) return

  // 3. 下载更新包
  const downloadResult = await updater.downloadUpdate(
    updateInfo.downloadUrl,
    (progress, downloaded, total) => {
      console.log(`下载进度: ${progress}%`)
    }
  )

  // 4. 手动安装
  if (downloadResult.success) {
    const installResult = await updater.installUpdate(downloadResult.filePath)
    console.log('安装结果:', installResult)
  }
} catch (error) {
  console.error('更新过程出错:', error)
  uni.showToast({ title: '更新失败', icon: 'none' })
}
```

## 配置选项

### AppUpdater 构造函数配置

```javascript
const updater = new AppUpdater({
  updateUrl: 'https://api.example.com/check-update', // 更新检查URL
  downloadPath: 'downloads/', // 下载路径（相对于应用目录）
  autoInstall: true, // 是否自动安装（默认true）
  showProgress: true, // 是否显示进度（默认true）
  timeout: 30000 // 超时时间（毫秒，默认30秒）
})
```

### 更新检查API响应格式

更新检查URL应返回以下格式的JSON：

```json
{
  "version": "2.0.0",
  "versionCode": 200,
  "description": "修复了一些问题，提升了用户体验",
  "downloadUrl": "https://example.com/app-v2.0.0.apk",
  "forceUpdate": false,
  "minVersion": "1.0.0"
}
```

## API 参考

### AppUpdater 类

#### constructor(config)

创建应用更新器实例。

**参数：**
- `config` (object): 配置选项

#### checkUpdate()

检查应用更新。

**返回：**
- Promise<object>: 更新信息
  ```javascript
  {
    hasUpdate: true,
    version: "2.0.0",
    description: "更新说明",
    downloadUrl: "下载链接",
    forceUpdate: false
  }
  ```

#### downloadUpdate(downloadUrl, onProgress)

下载更新包。

**参数：**
- `downloadUrl` (string): 下载链接
- `onProgress` (function): 进度回调函数

**返回：**
- Promise<object>: 下载结果

#### installUpdate(filePath)

安装更新包。

**参数：**
- `filePath` (string): APK文件路径

**返回：**
- Promise<object>: 安装结果

#### performUpdate(updateInfo, onProgress)

执行完整更新流程（下载+安装）。

**参数：**
- `updateInfo` (object): 更新信息
- `onProgress` (function): 进度回调函数

**返回：**
- Promise<object>: 更新结果

#### cancelDownload()

取消当前下载任务。

#### getCurrentVersion()

获取当前应用版本。

**返回：**
- string: 版本号

#### compareVersion(version1, version2)

比较两个版本号。

**参数：**
- `version1` (string): 版本号1
- `version2` (string): 版本号2

**返回：**
- number: 1表示version1更新，-1表示version2更新，0表示相同

### 静态方法

#### AppUpdater.isUpdateSupported()

检查当前平台是否支持应用内更新。

**返回：**
- boolean: 是否支持

#### AppUpdater.getAppInfo()

获取当前应用信息。

**返回：**
- object: 应用信息
  ```javascript
  {
    name: "应用ID",
    version: "1.0.0",
    versionCode: 100,
    platform: "Android"
  }
  ```

### 便捷函数

#### checkAppUpdate(updateUrl)

快速检查应用更新。

#### downloadAndInstall(downloadUrl, onProgress)

快速下载并安装更新。

#### isUpdateSupported()

检查是否支持更新。

#### getAppInfo()

获取应用信息。

## 权限配置

### Android 权限

在 `manifest.json` 中添加以下权限：

```json
{
  "app-plus": {
    "distribute": {
      "android": {
        "permissions": [
          "<uses-permission android:name=\"android.permission.INSTALL_PACKAGES\"/>",
          "<uses-permission android:name=\"android.permission.REQUEST_INSTALL_PACKAGES\"/>"
        ]
      }
    }
  }
}
```

## 错误处理

```javascript
try {
  const result = await updater.performUpdate(updateInfo)
} catch (error) {
  switch (error.message) {
    case '未配置更新检查URL':
      console.log('请配置updateUrl')
      break
    case 'iOS不支持应用内更新':
      console.log('iOS平台不支持应用内更新')
      break
    case '仅支持APP端更新':
      console.log('当前平台不支持更新')
      break
    default:
      console.error('更新失败:', error.message)
  }
}
```

## 平台支持

| 平台 | 支持状态 | 说明 |
|------|----------|------|
| Android | ✅ | 完全支持 |
| iOS | ❌ | 不支持应用内更新 |
| H5 | ❌ | 不适用 |
| 小程序 | ❌ | 不适用 |

## 注意事项

1. **平台限制**：仅支持 Android 平台，iOS 由于系统限制不支持应用内更新
2. **权限要求**：需要安装包权限，Android 8.0+ 需要用户手动授权
3. **网络要求**：下载更新包需要网络连接
4. **存储空间**：确保设备有足够存储空间下载安装包
5. **版本格式**：建议使用语义化版本号（如 1.0.0）
6. **HTTPS**：建议使用 HTTPS 链接确保安全性

## 完整示例

```javascript
// pages/settings/settings.vue
<template>
  <view class="container">
    <button @click="checkUpdate">检查更新</button>
    <view v-if="downloading">
      <text>下载进度: {{progress}}%</text>
      <button @click="cancelUpdate">取消下载</button>
    </view>
  </view>
</template>

<script>
import { AppUpdater } from '@/uni_modules/app-updater/js_sdk/index.js'

export default {
  data() {
    return {
      updater: null,
      downloading: false,
      progress: 0
    }
  },
  
  onLoad() {
    this.updater = new AppUpdater({
      updateUrl: 'https://api.example.com/check-update',
      autoInstall: true,
      showProgress: false // 使用自定义进度显示
    })
  },
  
  methods: {
    async checkUpdate() {
      try {
        const updateInfo = await this.updater.checkUpdate()
        
        if (updateInfo.hasUpdate) {
          const result = await uni.showModal({
            title: '发现新版本',
            content: `版本 ${updateInfo.version}\n${updateInfo.description}`,
            confirmText: '立即更新'
          })
          
          if (result.confirm) {
            await this.performUpdate(updateInfo)
          }
        } else {
          uni.showToast({ title: '当前已是最新版本', icon: 'none' })
        }
      } catch (error) {
        console.error('检查更新失败:', error)
        uni.showToast({ title: '检查更新失败', icon: 'none' })
      }
    },
    
    async performUpdate(updateInfo) {
      try {
        this.downloading = true
        this.progress = 0
        
        const result = await this.updater.performUpdate(updateInfo, (progress) => {
          this.progress = progress
        })
        
        this.downloading = false
        uni.showToast({ title: '更新完成', icon: 'success' })
      } catch (error) {
        this.downloading = false
        console.error('更新失败:', error)
        uni.showToast({ title: '更新失败', icon: 'none' })
      }
    },
    
    cancelUpdate() {
      this.updater.cancelDownload()
      this.downloading = false
      this.progress = 0
    }
  }
}
</script>
```

## 版本历史

### v1.0.0
- 初始版本
- 支持版本检查、下载、安装功能
- 支持进度监听和取消下载
- 仅支持 Android 平台