/**
 * HTTP请求工具插件 v2.0
 * 基于事件驱动架构实现真正实时的流式HTTP请求
 * 支持功能：
 * - 真实流式请求（SSE格式）
 * - 事件驱动消息传递
 * - 零延迟数据传递
 * - 自动处理Android/iOS差异
 */

// 导入事件总线和异步读取器
import { eventBus, EVENTS } from './eventBus.js'
import { AsyncStreamReader } from './asyncStreamReader.js'

// 全局数据缓存，用于跨线程数据传递
let globalDataCache = {
  requestId: 0,
  callbacks: new Map() // 保留用于兼容性
}

/**
 * 执行流式HTTP请求 (v2.0 事件驱动版本)
 * @param {Object} config 请求配置
 * @param {String} config.url 请求URL
 * @param {String} config.method 请求方法，默认POST
 * @param {Object} config.headers 请求头
 * @param {Object|String} config.data 请求数据
 * @param {Function} onData 数据回调函数 (chunk) => {}
 * @param {Function} onComplete 完成回调函数 () => {}
 * @param {Function} onError 错误回调函数 (error) => {}
 */
export function streamRequest(config, onData, onComplete, onError) {
  // 生成唯一请求ID
  const requestId = ++globalDataCache.requestId
  
  console.log('[HTTP Request v2] 创建事件驱动流式请求，ID:', requestId)
  
  // 使用事件总线替代传统回调
  if (typeof onData === 'function') {
    eventBus.subscribe(EVENTS.STREAM_DATA, onData, requestId)
  }
  if (typeof onComplete === 'function') {
    eventBus.subscribe(EVENTS.REQUEST_COMPLETE, onComplete, requestId)
  }
  if (typeof onError === 'function') {
    eventBus.subscribe(EVENTS.STREAM_ERROR, onError, requestId)
  }
  
  // 设置请求状态
  eventBus.setRequestState(requestId, {
    status: 'starting',
    url: config.url,
    startTime: Date.now()
  })
  
  // #ifdef APP-PLUS
  let isAndroid = plus.os.name === 'Android'
  if (isAndroid) {
    // Android原生实现
    return androidStreamRequest(config, requestId)
  } else {
    // iOS实现（暂时降级到普通请求模拟流式）
    return iosStreamRequest(config, onData, onComplete, onError)
  }
  // #endif
  
  // #ifndef APP-PLUS
  // 非APP环境降级处理
  console.warn('[HTTP Request] 非APP环境，使用模拟流式请求')
  return fallbackStreamRequest(config, onData, onComplete, onError)
  // #endif
}

// 全局回调触发器，在主线程中调用，优化数据同步
function triggerCallback(requestId, type, data) {
  const callbacks = globalDataCache.callbacks.get(requestId)
  if (!callbacks) {
    if (Math.random() < 0.1) console.warn('[HTTP Request] 找不到请求回调，ID:', requestId)
    return
  }
  
  try {
    switch (type) {
      case 'data':
        if (typeof callbacks.onData === 'function') {
          if (Math.random() < 0.1) console.log('[HTTP Request] 触发数据回调，ID:', requestId, '数据长度:', data.length)
          
          // 使用同步调用，确保数据传递的实时性
          const startTime = Date.now()
          callbacks.onData(data)
          const endTime = Date.now()
          
          if (Math.random() < 0.1) console.log('[HTTP Request] 数据回调完成，耗时:', endTime - startTime, 'ms')
        } else {
          console.warn('[HTTP Request] onData不是函数:', typeof callbacks.onData)
        }
        break
      case 'complete':
        if (typeof callbacks.onComplete === 'function') {
          console.log('[HTTP Request] 触发完成回调，ID:', requestId)
          callbacks.onComplete()
        }
        // 清理回调
        globalDataCache.callbacks.delete(requestId)
        break
      case 'error':
        if (typeof callbacks.onError === 'function') {
          console.log('[HTTP Request] 触发错误回调，ID:', requestId)
          callbacks.onError(data)
        }
        // 清理回调
        globalDataCache.callbacks.delete(requestId)
        break
    }
  } catch (error) {
    console.error('[HTTP Request] 回调执行错误:', error)
    console.error('[HTTP Request] 错误堆栈:', error.stack)
    
    // 如果是数据回调错误，尝试继续处理
    if (type !== 'data') {
      // 清理回调避免内存泄漏
      globalDataCache.callbacks.delete(requestId)
    }
  }
}

/**
 * Android原生流式请求实现
 */
function androidStreamRequest(config, requestId) {
  return new Promise((resolve, reject) => {
    try {
      console.log('[HTTP Request] Android原生流式请求开始:', config)
      
      // 导入必要的Java类
      const URL = plus.android.importClass('java.net.URL')
      const HttpURLConnection = plus.android.importClass('java.net.HttpURLConnection')
      const BufferedReader = plus.android.importClass('java.io.BufferedReader')
      const InputStreamReader = plus.android.importClass('java.io.InputStreamReader')
      const OutputStreamWriter = plus.android.importClass('java.io.OutputStreamWriter')
      const DataOutputStream = plus.android.importClass('java.io.DataOutputStream')
      
      // 创建URL对象
      const url = new URL(config.url)
      const connection = url.openConnection()
      
      // 设置请求方法
      connection.setRequestMethod(config.method || 'POST')
      
      // 设置请求头
      if (config.headers) {
        Object.keys(config.headers).forEach(key => {
          connection.setRequestProperty(key, config.headers[key])
        })
      }
      
      // 配置连接属性
      connection.setDoOutput(true)
      connection.setDoInput(true)
      connection.setUseCaches(false)
      connection.setConnectTimeout(30000) // 30秒连接超时
      connection.setReadTimeout(60000)    // 60秒读取超时
      
      // 如果有请求数据，写入
      if (config.data) {
        const dataString = typeof config.data === 'string' ? config.data : JSON.stringify(config.data)
        const outputStream = connection.getOutputStream()
        const writer = new OutputStreamWriter(outputStream, 'UTF-8')
        writer.write(dataString)
        writer.flush()
        writer.close()
      }
      
      // 获取响应码
      const responseCode = connection.getResponseCode()
      console.log('[HTTP Request] 响应码:', responseCode)
      
      if (responseCode === 200) {
        // 读取流式响应
        const inputStream = connection.getInputStream()
        const reader = new BufferedReader(new InputStreamReader(inputStream, 'UTF-8'))
        
        // 在新线程中处理流式数据
        const Runnable = plus.android.importClass('java.lang.Runnable')
        const Thread = plus.android.importClass('java.lang.Thread')
        
        // 🚀 v3.0 完全异步非阻塞流处理器
        console.log('[HTTP Request v3] 使用异步非阻塞流处理器')
        
        const streamProcessor = plus.android.implements('java.lang.Runnable', {
          run: function() {
            try {
              // 创建异步流读取器
              const asyncReader = new AsyncStreamReader(requestId, reader, inputStream, connection)
              
              // 启动异步处理
              asyncReader.start()
              
              console.log('[HTTP Request v3] 异步流读取器已启动，线程将立即释放')
              
            } catch (error) {
              console.error('[HTTP Request v3] 异步读取器启动失败:', error)
              
              // 发布错误事件
              plus.android.runtimeMainActivity().runOnUiThread(plus.android.implements('java.lang.Runnable', {
                run: function() {
                  eventBus.publish(EVENTS.STREAM_ERROR, { 
                    error: { message: error.message || '流处理启动失败' } 
                  }, requestId)
                  eventBus.cleanupRequest(requestId)
                }
              }))
            }
          }
        })
        
        const thread = new Thread(streamProcessor)
        thread.start()
        
        // 监听完成事件来解析Promise
        eventBus.subscribe(EVENTS.REQUEST_COMPLETE, () => {
          console.log('[HTTP Request v3] 请求完成，解析Promise')
          resolve()
        }, requestId)
        
        eventBus.subscribe(EVENTS.STREAM_ERROR, (error) => {
          console.log('[HTTP Request v3] 请求失败，拒绝Promise')
          reject(error)
        }, requestId)
        
      } else {
        // 处理错误响应
        const errorStream = connection.getErrorStream()
        if (errorStream) {
          const errorReader = new BufferedReader(new InputStreamReader(errorStream, 'UTF-8'))
          let errorMessage = ''
          let errorLine
          while ((errorLine = errorReader.readLine()) !== null) {
            errorMessage += errorLine
          }
          errorReader.close()
          
          console.error('[HTTP Request] 服务器错误:', errorMessage)
          triggerCallback(requestId, 'error', { 
            error: { message: `HTTP ${responseCode}: ${errorMessage}` },
            statusCode: responseCode 
          })
          reject(new Error(`HTTP ${responseCode}: ${errorMessage}`))
        } else {
          const error = `HTTP ${responseCode}`
          console.error('[HTTP Request] HTTP错误:', error)
          triggerCallback(requestId, 'error', { error: { message: error }, statusCode: responseCode })
          reject(new Error(error))
        }
        
        connection.disconnect()
      }
      
    } catch (error) {
      console.error('[HTTP Request] Android原生请求失败:', error)
      triggerCallback(requestId, 'error', { error: { message: error.message || '网络请求失败' } })
      reject(error)
    }
  })
}

/**
 * iOS流式请求实现（暂时使用模拟）
 */
function iosStreamRequest(config, onData, onComplete, onError) {
  console.log('[HTTP Request] iOS暂时使用uni.request模拟流式')
  return fallbackStreamRequest(config, onData, onComplete, onError)
}

/**
 * 降级流式请求实现（使用uni.request模拟）
 */
function fallbackStreamRequest(config, onData, onComplete, onError) {
  return new Promise((resolve, reject) => {
    console.log('[HTTP Request] 使用fallback模拟流式请求')
    
    // 修改请求数据，设置stream为false
    let requestData = config.data
    if (typeof requestData === 'object' && requestData !== null) {
      requestData = { ...requestData, stream: false }
    }
    
    uni.request({
      url: config.url,
      method: config.method || 'POST',
      header: config.headers || {},
      data: requestData,
      timeout: 60000,
      success: (response) => {
        console.log('[HTTP Request] Fallback响应:', response)
        
        if (response.statusCode === 200 && response.data) {
          const result = response.data
          
          if (result.choices && result.choices.length > 0) {
            const content = result.choices[0].message?.content || ''
            console.log('[HTTP Request] Fallback开始模拟流式发送:', content)
            
            // 模拟流式发送
            const words = content.split('')
            let index = 0
            const chunkSize = 15
            
            const sendNextChunk = () => {
              if (index < words.length) {
                const chunk = words.slice(index, index + chunkSize).join('')
                
                try {
                  if (typeof onData === 'function') {
                    onData(chunk)
                  }
                } catch (error) {
                  console.error('[HTTP Request] Fallback数据回调错误:', error)
                }
                
                index += chunkSize
                setTimeout(sendNextChunk, 50)
              } else {
                console.log('[HTTP Request] Fallback模拟发送完成')
                
                try {
                  if (typeof onComplete === 'function') {
                    onComplete()
                  }
                  resolve()
                } catch (error) {
                  console.error('[HTTP Request] Fallback完成回调错误:', error)
                }
              }
            }
            
            sendNextChunk()
          } else {
            const error = { error: { message: '响应格式错误' } }
            if (typeof onError === 'function') {
              onError(error)
            }
            reject(error)
          }
        } else {
          const error = { 
            error: response.data || { message: `HTTP ${response.statusCode}` },
            statusCode: response.statusCode 
          }
          if (typeof onError === 'function') {
            onError(error)
          }
          reject(error)
        }
      },
      fail: (error) => {
        console.error('[HTTP Request] Fallback请求失败:', error)
        const err = { error: { message: error.errMsg || '网络请求失败' } }
        if (typeof onError === 'function') {
          onError(err)
        }
        reject(err)
      }
    })
  })
}

/**
 * 普通HTTP请求
 * @param {Object} config 请求配置
 * @returns {Promise} 返回Promise
 */
export function httpRequest(config) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: config.url,
      method: config.method || 'POST',
      header: config.headers || {},
      data: config.data,
      timeout: config.timeout || 30000,
      success: (response) => {
        if (response.statusCode === 200) {
          resolve(response.data)
        } else {
          reject({ 
            error: response.data || { message: `HTTP ${response.statusCode}` },
            statusCode: response.statusCode 
          })
        }
      },
      fail: (error) => {
        reject({ error: { message: error.errMsg || '网络请求失败' } })
      }
    })
  })
}

/**
 * 检查流式请求支持情况
 * @returns {Object} 支持情况信息
 */
export function getStreamSupport() {
  // #ifdef APP-PLUS
  let isAndroid = plus.os.name === 'Android'
  return {
    supported: true,
    native: isAndroid,
    platform: isAndroid ? 'Android' : 'iOS',
    method: isAndroid ? 'Native Java' : 'Fallback Simulation'
  }
  // #endif
  
  // #ifndef APP-PLUS
  return {
    supported: false,
    native: false,
    platform: 'Web/MiniProgram',
    method: 'Fallback Simulation'
  }
  // #endif
}

// 默认导出
export default {
  streamRequest,
  httpRequest,
  getStreamSupport
}
