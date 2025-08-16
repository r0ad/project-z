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
      console.log('[AppUpdater] 开始检查更新...')
      console.log('[AppUpdater] 请求URL:', this.config.updateUrl)
      console.log('[AppUpdater] 请求配置:', {
        method: 'GET',
        timeout: 10000
      })
      
      const response = await uni.request({
        url: this.config.updateUrl,
        method: 'GET',
        timeout: 10000
      })

      console.log('[AppUpdater] 响应状态码:', response.statusCode)
      console.log('[AppUpdater] 响应数据:', response.data)

      if (response.statusCode === 200) {
        let updateInfo = response.data
        
        // 适配不同的API数据格式
        if (Array.isArray(updateInfo)) {
          console.log('[AppUpdater] 检测到数组格式的版本信息，长度:', updateInfo.length)
          // 如果是数组格式，根据版本号排序取最大值
          if (updateInfo.length === 0) {
            throw new Error('版本信息为空')
          }
          
          // 按版本号降序排序，取最新版本
          updateInfo = updateInfo.sort((a, b) => {
            if (!a.version || !b.version) {
              return 0
            }
            return this.compareVersion(b.version, a.version)
          })[0]
          
          console.log('[AppUpdater] 已排序取最新版本:', updateInfo)
        }
        
        // 验证必要字段
        if (!updateInfo.version) {
          throw new Error('版本信息缺少version字段')
        }
        
        // 获取当前应用版本
        const currentVersion = this.getCurrentVersion()
        console.log('[AppUpdater] 版本比较:', {
          current: currentVersion,
          latest: updateInfo.version,
          updateInfo
        })
        
        // 比较版本号
        const versionComparison = this.compareVersion(updateInfo.version, currentVersion)
        console.log('[AppUpdater] 版本比较结果:', versionComparison, '(>0表示有新版本)')
        
        if (versionComparison > 0) {
          const result = {
            hasUpdate: true,
            version: updateInfo.version,
            comment: updateInfo.comment || '新版本更新',
            date: updateInfo.date || '',
            downloadUrl: updateInfo.downloadUrl || this.config.downloadUrl,
            ...updateInfo
          }
          console.log('[AppUpdater] 发现新版本，返回更新信息:', result)
          return result
        } else {
          const result = {
            hasUpdate: false,
            message: '当前已是最新版本',
            currentVersion,
            latestVersion: updateInfo.version
          }
          console.log('[AppUpdater] 当前已是最新版本，返回结果:', result)
          return result
        }
      } else {
        console.error('[AppUpdater] HTTP请求失败，状态码:', response.statusCode)
        throw new Error(`检查更新失败: HTTP ${response.statusCode}`)
      }
    } catch (error) {
      console.error('[AppUpdater] 检查更新失败:', error)
      console.error('[AppUpdater] 错误详情:', {
        message: error.message,
        stack: error.stack
      })
      throw error
    }
  }

  // 下载更新包
  async downloadUpdate(downloadUrl, onProgress) {
    return new Promise((resolve, reject) => {
      // #ifdef APP-PLUS
      const isAndroid = plus.os.name === 'Android'
      console.log('[AppUpdater] 平台检查:', {
        platform: plus.os.name,
        isAndroid: isAndroid
      })
      
      if (!isAndroid) {
        console.error('[AppUpdater] iOS不支持应用内更新')
        reject(new Error('iOS不支持应用内更新'))
        return
      }

      try {
        console.log('[AppUpdater] 开始下载更新包...')
        console.log('[AppUpdater] 下载URL:', downloadUrl)
        
        // 获取下载保存路径
        const fileName = this.getFileNameFromUrl(downloadUrl)
        // 使用应用私有目录，确保有写入权限
        const downloadDir = plus.io.convertLocalFileSystemURL('_downloads/')
        const savePath = downloadDir + fileName
        
        console.log('[AppUpdater] 下载配置:', {
          downloadUrl,
          fileName,
          downloadDir,
          savePath
        })

        // 创建下载任务
        console.log('[AppUpdater] 创建下载任务...')
        this.downloadTask = plus.downloader.createDownload(downloadUrl, {
          filename: savePath,
          timeout: 60000, // 增加超时时间
          retry: 3 // 重试次数
        }, (download, status) => {
          console.log('[AppUpdater] 下载任务完成回调，状态码:', status)
          if (status === 200) {
            console.log('[AppUpdater] 下载完成:', {
              filename: download.filename,
              downloadedSize: download.downloadedSize,
              totalSize: download.totalSize
            })
            
            // 验证文件是否存在
             const filePath = download.filename
             console.log('[AppUpdater] 开始验证文件:', filePath)
             
             // 尝试多种路径格式进行验证
             const pathsToTry = [
               filePath,
               'file://' + filePath,
               plus.io.convertAbsoluteFileSystem(filePath)
             ]
             
             console.log('[AppUpdater] 待验证的路径列表:', pathsToTry)
             
             let verified = false
             let validPath = null
             
             const tryVerifyPath = (index) => {
               if (index >= pathsToTry.length) {
                 if (!verified) {
                   console.error('[AppUpdater] 所有路径验证失败:', pathsToTry)
                   // 即使验证失败，也返回下载结果，让安装方法处理
                   const result = {
                     success: true,
                     filePath: filePath,
                     fileName: fileName,
                     fullPath: filePath,
                     verified: false
                   }
                   console.log('[AppUpdater] 返回未验证的下载结果:', result)
                   resolve(result)
                 }
                 return
               }
               
               const currentPath = pathsToTry[index]
               console.log(`[AppUpdater] 尝试验证路径 ${index + 1}:`, currentPath)
               
               plus.io.resolveLocalFileSystemURL(currentPath, (entry) => {
                 console.log('[AppUpdater] 文件验证成功:', {
                   path: currentPath,
                   fullPath: entry.fullPath,
                   name: entry.name
                 })
                 verified = true
                 validPath = entry.fullPath
                 const result = {
                   success: true,
                   filePath: currentPath,
                   fileName: fileName,
                   fullPath: entry.fullPath,
                   verified: true
                 }
                 console.log('[AppUpdater] 返回验证成功的下载结果:', result)
                 resolve(result)
               }, (error) => {
                 console.log(`[AppUpdater] 路径 ${index + 1} 验证失败:`, error)
                 tryVerifyPath(index + 1)
               })
             }
             
             tryVerifyPath(0)
          } else {
            console.error('[AppUpdater] 下载失败，状态码:', status)
            reject(new Error(`下载失败: HTTP ${status}`))
          }
        })

        // 监听下载进度 - 必须在启动任务前设置
        console.log('[AppUpdater] 设置下载进度监听...')
        this.downloadTask.addEventListener('statechanged', (download, status) => {
          console.log('[AppUpdater] 下载状态变更:', {
            state: download.state,
            status: status,
            downloadedSize: download.downloadedSize,
            totalSize: download.totalSize
          })
          
          switch (download.state) {
            case 1: // 开始下载
              console.log('[AppUpdater] 开始下载...', {
                url: downloadUrl,
                savePath: download.filename
              })
              if (this.config.showProgress) {
                uni.showLoading({ title: '开始下载...' })
              }
              break
            case 2: // 下载中
              if (download.totalSize > 0) {
                const progress = Math.round((download.downloadedSize / download.totalSize) * 100)
                console.log(`[AppUpdater] 下载进度: ${progress}% (${download.downloadedSize}/${download.totalSize})`)
                if (onProgress) {
                  onProgress(progress, download.downloadedSize, download.totalSize)
                }
                if (this.config.showProgress) {
                  uni.showLoading({ title: `下载中 ${progress}%` })
                }
              } else {
                console.log('[AppUpdater] 下载中...', download.downloadedSize)
                if (onProgress) {
                  onProgress(0, download.downloadedSize, 0)
                }
              }
              break
            case 3: // 下载完成
              console.log('[AppUpdater] 下载状态变更: 完成')
              if (this.config.showProgress) {
                uni.hideLoading()
              }
              break
            case 4: // 下载失败
              console.error('[AppUpdater] 下载状态变更: 失败')
              if (this.config.showProgress) {
                uni.hideLoading()
              }
              reject(new Error('下载过程中发生错误'))
              break
          }
        })

        // 启动下载任务
        console.log('[AppUpdater] 启动下载任务...')
        this.downloadTask.start()
      } catch (error) {
        console.error('[AppUpdater] 创建下载任务失败:', error)
        console.error('[AppUpdater] 错误详情:', {
          message: error.message,
          stack: error.stack
        })
        reject(error)
      }
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
      console.log('[AppUpdater] 开始安装更新包，检查平台兼容性...')
      const isAndroid = plus.os.name === 'Android'
      console.log('[AppUpdater] 平台检查结果:', {
        platform: plus.os.name,
        isAndroid: isAndroid
      })
      
      if (!isAndroid) {
        console.error('[AppUpdater] iOS平台不支持应用内更新')
        reject(new Error('iOS不支持应用内更新'))
        return
      }

      try {
        console.log('[AppUpdater] 开始安装更新包:', {
          filePath: filePath,
          autoInstall: this.config.autoInstall,
          showProgress: this.config.showProgress
        })
        
        if (this.config.showProgress) {
          uni.showLoading({ title: '正在安装...' })
        }

        // 使用plus.runtime.install安装APK
        console.log('[AppUpdater] 调用plus.runtime.install...')
        plus.runtime.install(filePath, {}, () => {
          console.log('[AppUpdater] 安装成功')
          if (this.config.showProgress) {
            uni.hideLoading()
          }
          resolve({ success: true, message: '安装成功' })
        }, (error) => {
          console.error('[AppUpdater] 安装失败:', error)
          console.error('[AppUpdater] 安装错误详情:', {
            message: error.message,
            code: error.code,
            filePath: filePath
          })
          if (this.config.showProgress) {
            uni.hideLoading()
          }
          reject(new Error(`安装失败: ${error.message}`))
        })
      } catch (error) {
        console.error('[AppUpdater] 安装异常:', error)
        console.error('[AppUpdater] 异常详情:', {
          message: error.message,
          stack: error.stack,
          filePath: filePath
        })
        if (this.config.showProgress) {
          uni.hideLoading()
        }
        reject(error)
      }
      // #endif

      // #ifndef APP-PLUS
      console.error('[AppUpdater] 非APP端环境，不支持更新')
      reject(new Error('仅支持APP端更新'))
      // #endif
    })
  }

  // 完整的更新流程
  async performUpdate(updateInfo, onProgress) {
    try {
      console.log('[AppUpdater] 开始完整更新流程...', {
        updateInfo: updateInfo,
        autoInstall: this.config.autoInstall
      })
      
      // 1. 下载更新包
      console.log('[AppUpdater] 步骤1: 开始下载更新包...')
      const downloadResult = await this.downloadUpdate(updateInfo.downloadUrl, onProgress)
      
      console.log('[AppUpdater] 下载结果:', downloadResult)
      if (!downloadResult.success) {
        throw new Error('下载失败')
      }

      // 2. 安装更新包
      if (this.config.autoInstall) {
        console.log('[AppUpdater] 步骤2: 开始安装更新包...')
        const installResult = await this.installUpdate(downloadResult.filePath)
        console.log('[AppUpdater] 安装结果:', installResult)
        return {
          success: true,
          message: '更新完成',
          downloaded: true,
          installed: true,
          filePath: downloadResult.filePath
        }
      } else {
        console.log('[AppUpdater] 自动安装已禁用，仅下载完成')
        return {
          success: true,
          message: '下载完成，请手动安装',
          downloaded: true,
          installed: false,
          filePath: downloadResult.filePath
        }
      }
    } catch (error) {
      console.error('[AppUpdater] 更新失败:', error)
      console.error('[AppUpdater] 更新错误详情:', {
        message: error.message,
        stack: error.stack,
        updateInfo: updateInfo
      })
      throw error
    }
  }

  // 取消下载
  cancelDownload() {
    console.log('[AppUpdater] 尝试取消下载...')
    if (this.downloadTask) {
      console.log('[AppUpdater] 找到下载任务，正在取消...')
      this.downloadTask.abort()
      this.downloadTask = null
      if (this.config.showProgress) {
        uni.hideLoading()
      }
      console.log('[AppUpdater] 下载已取消')
    } else {
      console.log('[AppUpdater] 没有找到活动的下载任务')
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
    // 确保参数是字符串类型
    const v1 = String(version1 || '0')
    const v2 = String(version2 || '0')
    
    console.log('版本比较详情:', {
      original_v1: version1,
      original_v2: version2,
      converted_v1: v1,
      converted_v2: v2
    })
    
    // 如果版本号是纯数字，直接比较
    if (/^\d+$/.test(v1) && /^\d+$/.test(v2)) {
      const num1 = parseInt(v1)
      const num2 = parseInt(v2)
      return num1 > num2 ? 1 : (num1 < num2 ? -1 : 0)
    }
    
    // 处理点分版本号格式
    const v1Parts = v1.split('.').map(part => {
      const num = parseInt(part)
      return isNaN(num) ? 0 : num
    })
    const v2Parts = v2.split('.').map(part => {
      const num = parseInt(part)
      return isNaN(num) ? 0 : num
    })
    
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
    
    // 检查文件是否已存在，如果存在则生成新的文件名
    const downloadDir = plus.io.convertLocalFileSystemURL('_downloads/')
    let finalFileName = fileName
    let counter = 1
    
    // 同步检查文件是否存在
    while (this.checkFileExists(downloadDir + finalFileName)) {
      const nameWithoutExt = fileName.replace('.apk', '')
      finalFileName = `${nameWithoutExt}_${counter}.apk`
      counter++
      
      // 防止无限循环
      if (counter > 100) {
        finalFileName = `app_update_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.apk`
        break
      }
    }
    
    console.log('文件名处理结果:', {
      originalUrl: url,
      originalFileName: fileName,
      finalFileName: finalFileName,
      counter: counter - 1
    })
    
    return finalFileName
  }
  
  // 检查文件是否存在的辅助方法
  checkFileExists(filePath) {
    try {
      // 使用同步方式检查文件是否存在
      const entry = plus.io.resolveLocalFileSystemURL(filePath)
      return entry !== null
    } catch (error) {
      return false
    }
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