// 应用更新功能
// 版本检查接口：https://project.r0ad.host/version.json
// APK下载地址：https://project.r0ad.host/project.apk

// 显示版本历史记录
function showVersionHistory(versionData) {
  let historyList = []
  
  // 兼容不同的数据格式
  if (Array.isArray(versionData)) {
    // 新格式：直接是数组
    historyList = versionData.sort((a, b) => compareVersion(b.version, a.version))
  } else if (versionData.history && Array.isArray(versionData.history)) {
    // 旧格式：包含history字段
    historyList = versionData.history.sort((a, b) => compareVersion(b.version, a.version))
  } else if (versionData.version) {
    // 单个版本格式
    historyList = [versionData]
  }
  
  if (historyList.length === 0) {
    uni.showModal({
      title: '历史记录',
      content: '暂无历史更新记录',
      showCancel: false
    })
    return
  }
  
  // 生成历史记录内容
  const historyContent = historyList.map((item, index) => {
    const dateStr = formatHistoryDate(item.date)
    return `版本 ${item.version} (${dateStr})\n${item.comment || '无更新说明'}`
  }).join('\n\n')
  
  // 使用 ActionSheet 展示更多选项
  uni.showActionSheet({
    itemList: ['查看详细历史', '返回'],
    success: (res) => {
      if (res.tapIndex === 0) {
        // 显示详细历史对话框
        const displayContent = historyContent.length > 800 
          ? historyContent.substring(0, 800) + '\n\n...(更多内容请查看在线版本)'
          : historyContent
          
        uni.showModal({
          title: `历史更新记录 (共${historyList.length}个版本)`,
          content: displayContent,
          showCancel: true,
          confirmText: '知道了',
          cancelText: '返回'
        })
      }
    }
  })
}

// 格式化历史记录日期
function formatHistoryDate(dateStr) {
  if (!dateStr) return '未知日期'
  
  // 处理不同的日期格式
  if (dateStr.length === 8 && !dateStr.includes('-')) {
    // 格式：20250819 -> 2025-08-19
    return dateStr.substring(0, 4) + '-' + dateStr.substring(4, 6) + '-' + dateStr.substring(6, 8)
  }
  
  return dateStr
}

// 版本号比较函数
function compareVersion(version1, version2) {
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

// 主要的更新检查和执行函数
async function updateApp(showTip = false) {
  // #ifdef H5
  if (showTip) {
    uni.showModal({
      title: '提示',
      content: '请前往 https://project.r0ad.host 下载最新版APP\n\n或查看在线版本更新记录',
      confirmText: '知道了',
      showCancel: false
    })
  }
  return {
    hasUpdate: false,
    updateInfo: null,
    currentVersion: '1.0.0',
    latestVersion: '1.0.0'
  }
  // #endif

  // #ifdef APP-PLUS
  try {
    console.log('[UpdateApp] 开始检查更新...')
    const res = await new Promise((resolve, reject) => {
      uni.request({
        url: 'https://project.r0ad.host/version.json',
        method: 'GET',
        timeout: 10000,
        success: resolve,
        fail: reject
      })
    })
    
    console.log('[UpdateApp] 版本检查响应:', res.data)
    const data = res.data
    let remoteVersion, comment, downloadUrl, latestVersionData
    
    // 兼容不同的数据格式
    if (Array.isArray(data)) {
      // 新格式：数组，取第一个（最新版本）
      const sortedVersions = data.sort((a, b) => compareVersion(b.version, a.version))
      latestVersionData = sortedVersions[0]
      remoteVersion = latestVersionData.version
      comment = latestVersionData.comment || ''
      downloadUrl = latestVersionData.downloadUrl || 'https://project.r0ad.host/project.apk'
    } else {
      // 旧格式：对象
      latestVersionData = data
      remoteVersion = data.version
      comment = data.comment || ''
      downloadUrl = data.downloadUrl || 'https://project.r0ad.host/project.apk'
    }
    
    console.log('[UpdateApp] 解析后的版本信息:', {
      remoteVersion,
      comment,
      downloadUrl
    })
    
    // 获取当前版本
    // const currentVersion = getCurrentVersion()
    const currentVersion = '1.0.0'
    console.log('[UpdateApp] 当前版本:', currentVersion, '远程版本:', remoteVersion)
    
    const hasUpdate = compareVersion(remoteVersion, currentVersion) > 0
    
    // 构建返回的更新信息
    const updateInfo = {
      latestVersion: remoteVersion,
      versionHistory: Array.isArray(data) ? data : [latestVersionData],
      downloadUrl: downloadUrl,
      comment: comment
    }
    
    if (hasUpdate) {
      // 有新版本可用
      console.log('[UpdateApp] 发现新版本')
      if (showTip) {
        uni.showModal({
          title: `发现新版本 v${remoteVersion}`,
          content: `当前版本: v${currentVersion}\n最新版本: v${remoteVersion}\n\n更新内容:\n${comment}\n\n是否下载并安装新版本？`,
          confirmText: '立即更新',
          cancelText: '查看历史',
          success: (modalRes) => {
            if (modalRes.confirm) {
              downloadAndInstall(downloadUrl)
            } else {
              // 显示历史记录选项
              uni.showActionSheet({
                itemList: ['查看更新历史', '稍后更新', '取消'],
                success: (actionRes) => {
                  if (actionRes.tapIndex === 0) {
                    showVersionHistory(data)
                  } else if (actionRes.tapIndex === 1) {
                    uni.showToast({ title: '稍后可在设置中检查更新', icon: 'none', duration: 2000 })
                  }
                }
              })
            }
          }
        })
      }
    } else if (showTip) {
      // 已是最新版本，显示当前版本信息和历史记录选项
      uni.showModal({
        title: '版本信息',
        content: `当前版本: v${currentVersion}\n已是最新版本`,
        confirmText: '查看历史',
        cancelText: '知道了',
        success: (modalRes) => {
          if (modalRes.confirm) {
            showVersionHistory(data)
          }
        }
      })
    }
    
    return {
      hasUpdate: hasUpdate,
      updateInfo: updateInfo,
      currentVersion: currentVersion,
      latestVersion: remoteVersion
    }
    
  } catch (e) {
    console.error('[UpdateApp] 检查更新失败:', e)
    if (showTip) {
      uni.showModal({
        title: '更新检查失败',
        content: `网络错误: ${e.message || '请检查网络连接'}\n\n请稍后重试或手动前往官网下载`,
        confirmText: '重试',
        cancelText: '取消',
        success: (modalRes) => {
          if (modalRes.confirm) {
            updateApp(true)
          }
        }
      })
    }
    
    return {
      hasUpdate: false,
      updateInfo: null,
      currentVersion: getCurrentVersion(),
      latestVersion: null,
      error: e.message
    }
  }
  // #endif
}

// 获取当前应用版本
function getCurrentVersion() {
  // #ifdef APP-PLUS
  return plus.runtime.version || '1.0.0'
  // #endif
  // #ifndef APP-PLUS
  return '1.0.0'
  // #endif
}

// 下载并安装APK
function downloadAndInstall(downloadUrl) {
  console.log('[UpdateApp] 开始下载APK:', downloadUrl)
  
  // 创建下载任务
  const dtask = plus.downloader.createDownload(downloadUrl, {}, function(d, status) {
    console.log('[UpdateApp] 下载完成，状态码:', status)
    plus.nativeUI.closeWaiting()
    
    if (status == 200) {
      console.log('[UpdateApp] 下载成功，文件路径:', d.filename)
      uni.showModal({
        title: '下载完成',
        content: '是否立即安装新版本？',
        confirmText: '立即安装',
        cancelText: '稍后安装',
        success: (modalRes) => {
          if (modalRes.confirm) {
            console.log('[UpdateApp] 开始安装APK')
            plus.runtime.install(d.filename, {}, function() {
              console.log('[UpdateApp] 安装成功')
              uni.showToast({ title: '安装成功，即将重启应用', icon: 'success' })
            }, function(e) {
              console.error('[UpdateApp] 安装失败:', e)
              uni.showToast({ title: '安装失败: ' + (e.message || '未知错误'), icon: 'none', duration: 3000 })
            })
          } else {
            uni.showToast({ title: '安装包已保存，可稍后手动安装', icon: 'none', duration: 2000 })
          }
        }
      })
    } else {
      console.error('[UpdateApp] 下载失败，状态码:', status)
      uni.showModal({
        title: '下载失败',
        content: `下载状态码: ${status}\n请检查网络连接或稍后重试`,
        confirmText: '重试',
        cancelText: '取消',
        success: (modalRes) => {
          if (modalRes.confirm) {
            downloadAndInstall(downloadUrl)
          }
        }
      })
    }
  })
  
  // 开始下载
  dtask.start()
  
  // 显示进度对话框
  let progressDialog = plus.nativeUI.showWaiting('正在下载更新包...')
  
  // 监听下载状态变化
  dtask.addEventListener('statechanged', function(task) {
    console.log('[UpdateApp] 下载状态变化:', {
      state: task.state,
      downloadedSize: task.downloadedSize,
      totalSize: task.totalSize
    })
    
    switch (task.state) {
      case 1: // 开始下载
        console.log('[UpdateApp] 开始下载')
        progressDialog.setTitle('开始下载...')
        break
      case 2: // 下载中
        if (task.totalSize > 0) {
          let progress = Math.round((task.downloadedSize / task.totalSize) * 100)
          let downloadedMB = (task.downloadedSize / 1024 / 1024).toFixed(1)
          let totalMB = (task.totalSize / 1024 / 1024).toFixed(1)
          console.log('[UpdateApp] 下载进度:', progress + '%', downloadedMB + 'MB/' + totalMB + 'MB')
          progressDialog.setTitle(`下载中 ${progress}%\n${downloadedMB}MB / ${totalMB}MB`)
        } else {
          progressDialog.setTitle('下载中...')
        }
        break
      case 3: // 下载完成
        console.log('[UpdateApp] 下载完成')
        progressDialog.setTitle('下载完成，准备安装...')
        break
      case 4: // 下载失败
        console.error('[UpdateApp] 下载失败')
        plus.nativeUI.closeWaiting()
        break
    }
  })
}

// 创建示例版本数据格式（供服务端参考）
function getVersionDataExample() {
  // 推荐使用新的数组格式
  return [
    {
      version: "1.0.1",
      comment: "1.云端同步恢复优化。",
      date: "20250819",
      downloadUrl: "https://project.r0ad.host/project.apk"
    },
    {
      version: "1.0.0",
      comment: "1.项目管理、知识库管理，拥有AI功能。可以云端同步恢复。",
      date: "20250819",
      downloadUrl: "https://project.r0ad.host/project.apk"
    }
  ]
}

// UpdateApp 类
class UpdateApp {
  constructor() {
    this.updateUrl = 'https://project.r0ad.host/version.json'
    this.downloadUrl = 'https://project.r0ad.host/project.apk'
  }

  // 检查更新
  async checkUpdate(showTip = false) {
    return await updateApp(showTip)
  }

  // 下载并安装
  async downloadAndInstall(url) {
    return await downloadAndInstall(url || this.downloadUrl)
  }

  // 获取当前版本
  getCurrentVersion() {
    return getCurrentVersion()
  }

  // 显示版本历史
  showVersionHistory(versionData) {
    return showVersionHistory(versionData)
  }

  // 版本比较
  compareVersion(version1, version2) {
    return compareVersion(version1, version2)
  }
}

// CommonJS 导出
export default UpdateApp