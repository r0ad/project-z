/**
 * 异步流式读取器
 * 解决同步阻塞问题，实现真正的非阻塞异步处理
 */

import { eventBus, EVENTS } from './eventBus.js'

/**
 * 异步流式数据处理器
 * 使用分片处理和定时器避免线程阻塞
 */
export class AsyncStreamReader {
  constructor(requestId, reader, inputStream, connection) {
    this.requestId = requestId
    this.reader = reader
    this.inputStream = inputStream
    this.connection = connection
    
    // 状态管理
    this.isRunning = false
    this.isPaused = false
    this.dataCount = 0
    this.completeContent = ''
    this.firstDataTime = null
    this.requestStartTime = Date.now()
    
    // 性能配置
    this.BATCH_SIZE = 3 // 每批处理行数
    this.PROCESS_INTERVAL = 1 // 处理间隔(ms)
    this.MAX_CONTINUOUS_TIME = 10 // 最大连续处理时间(ms)
    
    console.log('[AsyncStreamReader] 初始化异步流读取器，ID:', requestId)
  }

  /**
   * 启动异步读取
   */
  start() {
    if (this.isRunning) return
    
    this.isRunning = true
    console.log('[AsyncStreamReader] 启动异步读取')
    
    // 使用微任务调度，避免阻塞
    this.scheduleNextBatch()
  }

  /**
   * 调度下一批处理
   */
  scheduleNextBatch() {
    if (!this.isRunning || this.isPaused) return
    
    // 使用setTimeout实现非阻塞调度
    setTimeout(() => {
      this.processBatch()
    }, this.PROCESS_INTERVAL)
  }

  /**
   * 处理一批数据
   */
  processBatch() {
    if (!this.isRunning) return
    
    const batchStartTime = Date.now()
    let processedLines = 0
    let shouldContinue = true
    
    try {
      while (processedLines < this.BATCH_SIZE && shouldContinue) {
        // 检查是否超时，避免长时间占用线程
        if (Date.now() - batchStartTime > this.MAX_CONTINUOUS_TIME) {
          break
        }
        
        const line = this.reader.readLine()
        
        if (line === null) {
          // 读取结束
          this.handleStreamEnd()
          return
        }
        
        processedLines++
        shouldContinue = this.processLine(line)
        
        if (!shouldContinue) {
          // 遇到结束标记
          this.handleStreamEnd()
          return
        }
      }
      
      // 继续下一批处理
      this.scheduleNextBatch()
      
    } catch (error) {
      console.error('[AsyncStreamReader] 处理批次错误:', error)
      this.handleError(error)
    }
  }

  /**
   * 处理单行数据
   * @param {String} line 数据行
   * @returns {Boolean} 是否继续处理
   */
  processLine(line) {
    if (Math.random() < 0.05) {
      // console.log('[AsyncStreamReader] 处理行:', line)
    }
    
    // 处理SSE格式数据
    if (line.startsWith('data: ')) {
      const data = line.substring(6)
      
      if (data === '[DONE]') {
        console.log('[AsyncStreamReader] 收到结束标记')
        return false // 停止处理
      }
      
      if (data.trim() !== '') {
        this.processDataChunk(data)
      }
    }
    // 忽略其他格式的行
    
    return true // 继续处理
  }

  /**
   * 处理数据块
   * @param {String} data JSON数据
   */
  processDataChunk(data) {
    try {
      const jsonData = JSON.parse(data)
      
      if (jsonData.choices && jsonData.choices[0] && jsonData.choices[0].delta) {
        const delta = jsonData.choices[0].delta
        const content = delta.content || ''
        
        if (content) {
          this.completeContent += content
          this.dataCount++
          const now = Date.now()
          
          // 记录首次数据时间
          if (!this.firstDataTime) {
            this.firstDataTime = now
            console.log('[AsyncStreamReader] 首次数据，延迟:', now - this.requestStartTime, 'ms')
            
            // 发布开始事件
            this.publishEvent(EVENTS.STREAM_START, { startTime: now })
          }
          
          // 立即发布数据事件（零延迟）
          this.publishEvent(EVENTS.STREAM_DATA, content)
          
          // 更新状态
          this.updateState({
            lastChunkTime: now,
            totalChunks: this.dataCount,
            totalLength: this.completeContent.length
          })
          
          if (Math.random() < 0.1) {
            // console.log('[AsyncStreamReader] 发送内容:', content, '第', this.dataCount, '块')
          }
        }
      }
      
    } catch (parseError) {
      console.warn('[AsyncStreamReader] JSON解析失败:', parseError)
      // 对于非JSON数据，直接作为内容处理
      if (data.trim() !== '') {
        this.publishEvent(EVENTS.STREAM_DATA, data)
      }
    }
  }

  /**
   * 发布事件到主线程
   * @param {String} event 事件名
   * @param {Any} data 数据
   */
  publishEvent(event, data) {
    // 使用runOnUiThread确保在主线程执行
    plus.android.runtimeMainActivity().runOnUiThread(
      plus.android.implements('java.lang.Runnable', {
        run: () => {
          try {
            eventBus.publish(event, data, this.requestId)
          } catch (error) {
            console.error('[AsyncStreamReader] 事件发布错误:', error)
          }
        }
      })
    )
  }

  /**
   * 更新请求状态
   * @param {Object} state 状态数据
   */
  updateState(state) {
    plus.android.runtimeMainActivity().runOnUiThread(
      plus.android.implements('java.lang.Runnable', {
        run: () => {
          eventBus.setRequestState(this.requestId, state)
        }
      })
    )
  }

  /**
   * 处理流结束
   */
  handleStreamEnd() {
    this.isRunning = false
    console.log('[AsyncStreamReader] 流处理结束')
    
    // 关闭资源
    this.closeResources()
    
    // 发布结束事件
    this.publishEvent(EVENTS.STREAM_END, {
      totalChunks: this.dataCount,
      totalLength: this.completeContent.length,
      duration: this.firstDataTime ? Date.now() - this.firstDataTime : 0
    })
    
    // 发布完成事件
    this.publishEvent(EVENTS.REQUEST_COMPLETE, {
      totalLength: this.completeContent.length,
      totalChunks: this.dataCount,
      duration: this.firstDataTime ? Date.now() - this.firstDataTime : 0,
      success: true
    })
  }

  /**
   * 处理错误
   * @param {Error} error 错误对象
   */
  handleError(error) {
    this.isRunning = false
    console.error('[AsyncStreamReader] 处理错误:', error)
    
    // 关闭资源
    this.closeResources()
    
    // 发布错误事件
    this.publishEvent(EVENTS.STREAM_ERROR, {
      error: { message: error.message || '流处理失败' },
      totalProcessed: this.dataCount
    })
  }

  /**
   * 关闭资源
   */
  closeResources() {
    try {
      if (this.reader) this.reader.close()
      if (this.inputStream) this.inputStream.close()
      if (this.connection) this.connection.disconnect()
      console.log('[AsyncStreamReader] 资源关闭成功')
    } catch (closeError) {
      console.error('[AsyncStreamReader] 资源关闭失败:', closeError)
      // 尝试单独关闭
      try { if (this.reader) this.reader.close() } catch (e) {}
      try { if (this.connection) this.connection.disconnect() } catch (e) {}
    }
  }

  /**
   * 暂停处理
   */
  pause() {
    this.isPaused = true
    console.log('[AsyncStreamReader] 暂停处理')
  }

  /**
   * 恢复处理
   */
  resume() {
    if (this.isPaused && this.isRunning) {
      this.isPaused = false
      console.log('[AsyncStreamReader] 恢复处理')
      this.scheduleNextBatch()
    }
  }

  /**
   * 停止处理
   */
  stop() {
    this.isRunning = false
    this.closeResources()
    console.log('[AsyncStreamReader] 停止处理')
  }
}
