// 应用更新器插件
// 基于dairy-app项目的updateApp.js封装

// 应用更新器类
export class AppUpdater {
  constructor(config = {}) {
    this.config = {
      updateUrl: config.updateUrl || '', // 更新检查URL
      downloadPath: config.downloadPath || 'downloads/', // 下载路径
      autoInstall: config.autoInstall !== false, // 是否自动安装
      showProgress: config.showProgress !== false, // 是否显示进度
      ...config
    }
    this.downloadTask = null
  }

  // 检查应用更新
  async checkUpdate() {
    if (!this.config.updateUrl) {
      throw new Error('未配置更新检查URL')
    }

    try {
      const response = await uni.request({
        url: this.config.updateUrl,
        method: 'GET',
        timeout: 10000
      })

      if (response.statusCode === 200) {
        const updateInfo = response.data
        
        // 获取当前应用版本
        const currentVersion = this.getCurrentVersion()
        
        // 比较版本号
        if (this.compareVersion(updateInfo.version, currentVersion) > 0) {
          return {
            hasUpdate: true,
            ...updateInfo
          }
        } else {
          return {
            hasUpdate: false,
            message: '当前已是最新版本'
          }
        }
      } else {
        throw new Error(`检查更新失败: ${response.statusCode}`)
      }
    } catch (error) {
      console.error('检查更新失败:', error)
      throw error
    }
  }

  // 下载更新包
  async downloadUpdate(downloadUrl, onProgress) {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      const isAndroid = plus.os.name === 'Android'
      if (!isAndroid) {
        reject(new Error('iOS不支持应用内更新'))
        return
      }

      // 获取下载保存路径
      const fileName = this.getFileNameFromUrl(downloadUrl)
      const savePath = plus.io.convertLocalFileSystemURL('_downloads/') + fileName

      // 创建下载任务
      this.downloadTask = plus.downloader.createDownload(downloadUrl, {
        filename: savePath,
        timeout: 30000
      }, (download, status) => {
        if (status === 200) {
          console.log('下载完成:', download.filename)
          resolve({
            success: true,
            filePath: download.filename,
            fileName: fileName
          })
        } else {
          console.error('下载失败:', status)
          reject(new Error(`下载失败: ${status}`))
        }
      })

      // 监听下载进度
      this.downloadTask.addEventListener('statechanged', (download, status) => {
        switch (download.state) {
          case 1: // 开始下载
            console.log('开始下载...')
            if (this.config.showProgress) {
              uni.showLoading({ title: '开始下载...' })
            }
            break
          case 2: // 下载中
            const progress = Math.round((download.downloadedSize / download.totalSize) * 100)
            console.log(`下载进度: ${progress}%`)
            if (onProgress) {
              onProgress(progress, download.downloadedSize, download.totalSize)
            }
            if (this.config.showProgress) {
              uni.showLoading({ title: `下载中 ${progress}%` })
            }
            break
          case 3: // 下载完成
            console.log('下载完成')
            if (this.config.showProgress) {
              uni.hideLoading()
            }
            break
          case 4: // 下载失败
            console.error('下载失败')
            if (this.config.showProgress) {
              uni.hideLoading()
            }
            reject(new Error('下载失败'))
            break
        }
      })

      // 开始下载
      this.downloadTask.start()
      // #endif

      // #ifndef APP-PLUS
      reject(new Error('仅支持APP端更新'))
      // #endif
    })
  }

  // 安装更新包
  async installUpdate(filePath) {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      const isAndroid = plus.os.name === 'Android'
      if (!isAndroid) {
        reject(new Error('iOS不支持应用内更新'))
        return
      }

      try {
        console.log('开始安装更新包:', filePath)
        
        if (this.config.showProgress) {
          uni.showLoading({ title: '正在安装...' })
        }

        // 使用plus.runtime.install安装APK
        plus.runtime.install(filePath, {}, () => {
          console.log('安装成功')
          if (this.config.showProgress) {
            uni.hideLoading()
          }
          resolve({ success: true, message: '安装成功' })
        }, (error) => {
          console.error('安装失败:', error)
          if (this.config.showProgress) {
            uni.hideLoading()
          }
          reject(new Error(`安装失败: ${error.message}`))
        })
      } catch (error) {
        console.error('安装异常:', error)
        if (this.config.showProgress) {
          uni.hideLoading()
        }
        reject(error)
      }
      // #endif

      // #ifndef APP-PLUS
      reject(new Error('仅支持APP端更新'))
      // #endif
    })
  }

  // 完整的更新流程
  async performUpdate(updateInfo, onProgress) {
    try {
      // 1. 下载更新包
      console.log('开始下载更新包...')
      const downloadResult = await this.downloadUpdate(updateInfo.downloadUrl, onProgress)
      
      if (!downloadResult.success) {
        throw new Error('下载失败')
      }

      // 2. 安装更新包
      if (this.config.autoInstall) {
        console.log('开始安装更新包...')
        const installResult = await this.installUpdate(downloadResult.filePath)
        return {
          success: true,
          message: '更新完成',
          downloaded: true,
          installed: true,
          filePath: downloadResult.filePath
        }
      } else {
        return {
          success: true,
          message: '下载完成，请手动安装',
          downloaded: true,
          installed: false,
          filePath: downloadResult.filePath
        }
      }
    } catch (error) {
      console.error('更新失败:', error)
      throw error
    }
  }

  // 取消下载
  cancelDownload() {
    if (this.downloadTask) {
      this.downloadTask.abort()
      this.downloadTask = null
      if (this.config.showProgress) {
        uni.hideLoading()
      }
      console.log('下载已取消')
    }
  }

  // 获取当前应用版本
  getCurrentVersion() {
    // #ifdef APP-PLUS
    return plus.runtime.version
    // #endif
    
    // #ifndef APP-PLUS
    return '1.0.0'
    // #endif
  }

  // 比较版本号
  compareVersion(version1, version2) {
    const v1Parts = version1.split('.').map(Number)
    const v2Parts = version2.split('.').map(Number)
    const maxLength = Math.max(v1Parts.length, v2Parts.length)
    
    for (let i = 0; i < maxLength; i++) {
      const v1Part = v1Parts[i] || 0
      const v2Part = v2Parts[i] || 0
      
      if (v1Part > v2Part) return 1
      if (v1Part < v2Part) return -1
    }
    
    return 0
  }

  // 从URL中提取文件名
  getFileNameFromUrl(url) {
    const urlParts = url.split('/')
    let fileName = urlParts[urlParts.length - 1]
    
    // 如果文件名不包含.apk扩展名，添加它
    if (!fileName.includes('.apk')) {
      fileName = `app_update_${Date.now()}.apk`
    }
    
    return fileName
  }

  // 检查是否支持更新
  static isUpdateSupported() {
    // #ifdef APP-PLUS
    return plus.os.name === 'Android'
    // #endif
    
    // #ifndef APP-PLUS
    return false
    // #endif
  }

  // 获取应用信息
  static getAppInfo() {
    // #ifdef APP-PLUS
    return {
      name: plus.runtime.appid,
      version: plus.runtime.version,
      versionCode: plus.runtime.versionCode,
      platform: plus.os.name
    }
    // #endif
    
    // #ifndef APP-PLUS
    return {
      name: 'unknown',
      version: '1.0.0',
      versionCode: 1,
      platform: 'unknown'
    }
    // #endif
  }
}

// 应用更新配置类
export class AppUpdaterConfig {
  static createConfig(options = {}) {
    return {
      updateUrl: options.updateUrl || '',
      downloadPath: options.downloadPath || 'downloads/',
      autoInstall: options.autoInstall !== false,
      showProgress: options.showProgress !== false,
      timeout: options.timeout || 30000,
      ...options
    }
  }
}

// 便捷方法
export async function checkAppUpdate(updateUrl) {
  const updater = new AppUpdater({ updateUrl })
  return await updater.checkUpdate()
}

export async function downloadAndInstall(downloadUrl, onProgress) {
  const updater = new AppUpdater({ autoInstall: true })
  return await updater.performUpdate({ downloadUrl }, onProgress)
}

export function isUpdateSupported() {
  return AppUpdater.isUpdateSupported()
}

export function getAppInfo() {
  return AppUpdater.getAppInfo()
}

// 默认导出
export default {
  AppUpdater,
  AppUpdaterConfig,
  checkAppUpdate,
  downloadAndInstall,
  isUpdateSupported,
  getAppInfo
}