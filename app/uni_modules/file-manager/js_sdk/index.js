// 本地文件管理器插件
// 基于dairy-app项目的heyuanWrite.js封装

const appBaseDir = "app-data"

// 文件写入功能
export function writeFile(data, fileName) {
  // #ifdef APP-PLUS
  let isAndroid = plus.os.name === 'Android'
  if (isAndroid) {
    // 使用应用私有目录，无需权限
    let filePath = plus.io.convertLocalFileSystemURL("_doc/") + appBaseDir + '/' + fileName
    const File = plus.android.importClass('java.io.File')
    const FileWriter = plus.android.importClass('java.io.FileWriter')
    const writeFile = (fileName, data) => {
      try {
        const n = fileName.lastIndexOf('/')
        if (n !== -1) {
          const fileDirs = fileName.substring(0, n)
          const directory = new File(fileDirs)
          if (!directory.exists()) {
            directory.mkdirs()
          }
        }
        const file = new File(fileName)
        if (!file.exists()) {
          file.createNewFile()
        }
        // 保证写入utf-8无BOM
        const fos = new FileWriter(fileName, false)
        fos.write(typeof data === 'string' ? data : JSON.stringify(data))
        fos.close()
        return filePath
      } catch (e) {
        console.error('Android写入文件失败:', e)
        uni.showToast({ title: '保存失败', icon: 'none' })
        return null
      }
    }
    return writeFile(filePath, data)
  } else {
    // iOS端 - 使用应用私有目录
    return new Promise((resolve, reject) => {
      plus.io.requestFileSystem(
        plus.io.PRIVATE_DOC, // 使用私有文档目录
        (fs) => {
          let rootPath = fs.root.toURL()
          // 创建应用子目录
          fs.root.getDirectory(
            appBaseDir,
            { create: true },
            (appDir) => {
              let fileUrl = appDir.toURL() + fileName
              appDir.getFile(
                fileName, { create: true },
                (fileEntry) => {
                  fileEntry.createWriter(
                    (writer) => {
                      writer.onwrite = (e) => {
                        resolve(fileUrl)
                      }
                      writer.onerror = (error) => {
                        console.error('iOS写入文件失败:', error)
                        uni.showToast({ title: '保存失败', icon: 'none' })
                        reject(error)
                      }
                      writer.seek(0)
                      writer.write(typeof data === 'string' ? data : JSON.stringify(data))
                    },
                    (error) => {
                      console.error('iOS创建写入器失败:', error)
                      uni.showToast({ title: '保存失败', icon: 'none' })
                      reject(error)
                    }
                  )
                },
                (error) => {
                  console.error('iOS获取文件失败:', error)
                  uni.showToast({ title: '保存失败', icon: 'none' })
                  reject(error)
                }
              )
            },
            (error) => {
              console.error('iOS创建目录失败:', error)
              uni.showToast({ title: '保存失败', icon: 'none' })
              reject(error)
            }
          )
        },
        (error) => {
          console.error('iOS请求文件系统失败:', error)
          uni.showToast({ title: '保存失败', icon: 'none' })
          reject(error)
        }
      )
    })
  }
  // #endif
}

// 文件读取功能
export function readFile(fileName) {
  // #ifdef APP-PLUS
  let isAndroid = plus.os.name === 'Android'
  if (isAndroid) {
    return new Promise((resolve, reject) => {
      try {
        // 使用应用私有目录
        let filePath = plus.io.convertLocalFileSystemURL("_doc/") + appBaseDir + '/' + fileName
        const File = plus.android.importClass('java.io.File')
        const FileReader = plus.android.importClass('java.io.FileReader')
        const BufferedReader = plus.android.importClass('java.io.BufferedReader')
        const file = new File(filePath)
        if (!file.exists()) {
          uni.showToast({ title: '文件不存在', icon: 'none' })
          reject('文件不存在')
          return
        }
        const fr = new FileReader(file)
        const br = new BufferedReader(fr)
        let line, result = ''
        while ((line = br.readLine()) != null) {
          result += line + '\n'
        }
        br.close()
        fr.close()
        console.log('安卓原生读取内容:', result)
        // 去除BOM和首尾空白
        let clean = result.replace(/^\uFEFF/, '').trim()
        // 去除所有不可见控制字符（除了\n、\r、\t）
        clean = clean.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        if (clean.endsWith('\n')) clean = clean.slice(0, -1)
        console.log('处理后内容:', clean)
        resolve(clean)
      } catch (e) {
        console.error('Android读取文件失败:', e)
        uni.showToast({ title: '读取失败', icon: 'none' })
        reject(e)
      }
    })
  } else {
    // iOS端 - 使用应用私有目录
    return new Promise((resolve, reject) => {
      plus.io.requestFileSystem(
        plus.io.PRIVATE_DOC, // 使用私有文档目录
        (fs) => {
          fs.root.getDirectory(
            appBaseDir,
            { create: false },
            (appDir) => {
              appDir.getFile(
                fileName, { create: false },
                (fileEntry) => {
                  fileEntry.file((file) => {
                    const reader = new plus.io.FileReader()
                    reader.onloadend = (evt) => {
                      let result = evt.target.result
                      // 去除BOM和首尾空白
                      let clean = result.replace(/^\uFEFF/, '').trim()
                      clean = clean.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
                      if (clean.endsWith('\n')) clean = clean.slice(0, -1)
                      resolve(clean)
                    }
                    reader.onerror = (err) => {
                      console.error('iOS读取文件失败:', err)
                      uni.showToast({ title: '读取失败', icon: 'none' })
                      reject(err)
                    }
                    reader.readAsText(file)
                  })
                },
                (error) => {
                  console.error('iOS文件不存在:', error)
                  uni.showToast({ title: '文件不存在', icon: 'none' })
                  reject(error)
                }
              )
            },
            (error) => {
              console.error('iOS目录不存在:', error)
              uni.showToast({ title: '目录不存在', icon: 'none' })
              reject(error)
            }
          )
        },
        (error) => {
          console.error('iOS请求文件系统失败:', error)
          uni.showToast({ title: '读取失败', icon: 'none' })
          reject(error)
        }
      )
    })
  }
  // #endif
}

// 读取应用目录下的文件列表
export function getFileList() {
  // #ifdef APP-PLUS
  let isAndroid = plus.os.name === 'Android'
  if (isAndroid) {
    return new Promise((resolve, reject) => {
      try {
        // 使用应用私有目录
        let dirPath = plus.io.convertLocalFileSystemURL("_doc/") + appBaseDir
        const File = plus.android.importClass('java.io.File')
        const directory = new File(dirPath)
        
        if (!directory.exists()) {
          console.log('目录不存在，创建目录:', dirPath)
          directory.mkdirs()
          resolve([])
          return
        }
        
        if (!directory.isDirectory()) {
          reject('路径不是目录')
          return
        }
        
        const files = directory.listFiles()
        if (!files) {
          resolve([])
          return
        }
        
        const fileList = []
        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          if (file.isFile()) {
            const fileName = file.getName()
            const lastModified = file.lastModified()
            const fileSize = file.length()
            
            fileList.push({
              name: fileName,
              size: fileSize,
              lastModified: lastModified,
              lastModifiedDate: new Date(lastModified).toLocaleString()
            })
          }
        }
        
        // 按修改时间倒序排列
        fileList.sort((a, b) => b.lastModified - a.lastModified)
        console.log('获取到文件列表:', fileList)
        resolve(fileList)
      } catch (e) {
        console.error('读取文件列表失败:', e)
        reject(e)
      }
    })
  } else {
    // iOS端 - 使用应用私有目录
    return new Promise((resolve, reject) => {
      plus.io.requestFileSystem(
        plus.io.PRIVATE_DOC, // 使用私有文档目录
        (fs) => {
          fs.root.getDirectory(
            appBaseDir,
            { create: false },
            (appDir) => {
              appDir.createReader().readEntries(
                (entries) => {
                  const fileList = []
                  const fileEntries = entries.filter(entry => entry.isFile)
                  
                  if (fileEntries.length === 0) {
                    resolve([])
                    return
                  }
                  
                  let processedCount = 0
                  
                  fileEntries.forEach(entry => {
                    entry.getMetadata(
                      (metadata) => {
                        fileList.push({
                          name: entry.name,
                          size: entry.size || 0,
                          lastModified: metadata.modificationTime.getTime(),
                          lastModifiedDate: metadata.modificationTime.toLocaleString()
                        })
                        
                        processedCount++
                        // 当所有文件处理完成后返回
                        if (processedCount === fileEntries.length) {
                          fileList.sort((a, b) => b.lastModified - a.lastModified)
                          resolve(fileList)
                        }
                      },
                      (error) => {
                        console.error('获取文件元数据失败:', error)
                        processedCount++
                        if (processedCount === fileEntries.length) {
                          fileList.sort((a, b) => b.lastModified - a.lastModified)
                          resolve(fileList)
                        }
                      }
                    )
                  })
                },
                (error) => {
                  console.error('读取目录失败:', error)
                  reject(error)
                }
              )
            },
            (error) => {
              console.error('iOS目录不存在:', error)
              // 目录不存在时创建并返回空列表
              fs.root.getDirectory(
                appBaseDir,
                { create: true },
                (appDir) => {
                  resolve([])
                },
                (createError) => {
                  console.error('创建目录失败:', createError)
                  reject(createError)
                }
              )
            }
          )
        },
        (error) => {
          console.error('请求文件系统失败:', error)
          reject(error)
        }
      )
    })
  }
  // #endif
  
  // #ifndef APP-PLUS
  return Promise.resolve([])
  // #endif
}

// 格式化文件大小
export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 获取应用私有目录路径（用于显示给用户）
export function getAppPrivateDir() {
  // #ifdef APP-PLUS
  let isAndroid = plus.os.name === 'Android'
  if (isAndroid) {
    return plus.io.convertLocalFileSystemURL("_doc/") + appBaseDir
  } else {
    // iOS端返回描述性文本
    return "应用私有文档目录/" + appBaseDir
  }
  // #endif
  
  // #ifndef APP-PLUS
  return "应用私有目录"
  // #endif
}

// 文件管理器配置类
export class FileManagerConfig {
  static getBaseDir() {
    return appBaseDir
  }
  
  static setBaseDir(dir) {
    appBaseDir = dir
  }
}

// 默认导出
export default {
  writeFile,
  readFile,
  getFileList,
  formatFileSize,
  getAppPrivateDir,
  FileManagerConfig
}