/**
 * 事件驱动消息总线
 * 解决回调链延迟问题，实现真正的实时数据传递
 */

class EventBus {
  constructor() {
    this.listeners = new Map()
    this.requestStates = new Map() // 存储请求状态
    console.log('[EventBus] 初始化事件总线')
  }

  /**
   * 订阅事件
   * @param {String} event 事件名
   * @param {Function} callback 回调函数
   * @param {String} requestId 请求ID（可选）
   */
  subscribe(event, callback, requestId = null) {
    const eventKey = requestId ? `${event}_${requestId}` : event
    
    if (!this.listeners.has(eventKey)) {
      this.listeners.set(eventKey, [])
    }
    
    this.listeners.get(eventKey).push(callback)
    console.log('[EventBus] 订阅事件:', eventKey, '监听器数量:', this.listeners.get(eventKey).length)
    return eventKey
  }

  /**
   * 发布事件（同步立即执行）
   * @param {String} event 事件名
   * @param {Any} data 数据
   * @param {String} requestId 请求ID（可选）
   */
  publish(event, data, requestId = null) {
    const eventKey = requestId ? `${event}_${requestId}` : event
    const listeners = this.listeners.get(eventKey)
    
    if (listeners && listeners.length > 0) {
      const startTime = Date.now()
      
      // 同步立即执行所有监听器
      listeners.forEach((callback, index) => {
        try {
          callback(data)
        } catch (error) {
          console.error('[EventBus] 监听器执行错误:', error, 'event:', eventKey, 'index:', index)
        }
      })
      
      const endTime = Date.now()
      if (Math.random() < 0.1) {
        console.log('[EventBus] 发布事件:', eventKey, '执行监听器:', listeners.length, '耗时:', endTime - startTime, 'ms')
      }
    }
  }

  /**
   * 取消订阅
   * @param {String} eventKey 事件键
   * @param {Function} callback 要移除的回调（可选，不提供则移除所有）
   */
  unsubscribe(eventKey, callback = null) {
    if (!this.listeners.has(eventKey)) return

    if (callback) {
      const listeners = this.listeners.get(eventKey)
      const index = listeners.indexOf(callback)
      if (index > -1) {
        listeners.splice(index, 1)
      }
      if (listeners.length === 0) {
        this.listeners.delete(eventKey)
      }
    } else {
      this.listeners.delete(eventKey)
    }
    
    console.log('[EventBus] 取消订阅:', eventKey)
  }

  /**
   * 清理请求相关的所有事件
   * @param {String} requestId 请求ID
   */
  cleanupRequest(requestId) {
    const keysToDelete = []
    for (const key of this.listeners.keys()) {
      if (key.endsWith(`_${requestId}`)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => {
      this.listeners.delete(key)
    })
    
    this.requestStates.delete(requestId)
    console.log('[EventBus] 清理请求:', requestId, '删除事件:', keysToDelete.length)
  }

  /**
   * 设置请求状态
   * @param {String} requestId 请求ID
   * @param {Object} state 状态信息
   */
  setRequestState(requestId, state) {
    this.requestStates.set(requestId, {
      ...this.requestStates.get(requestId),
      ...state,
      lastUpdate: Date.now()
    })
  }

  /**
   * 获取请求状态
   * @param {String} requestId 请求ID
   */
  getRequestState(requestId) {
    return this.requestStates.get(requestId) || {}
  }

  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalEvents: this.listeners.size,
      activeRequests: this.requestStates.size,
      eventDetails: Array.from(this.listeners.keys()).map(key => ({
        event: key,
        listenerCount: this.listeners.get(key).length
      }))
    }
  }
}

// 全局单例事件总线
export const eventBus = new EventBus()

// 事件名称常量
export const EVENTS = {
  STREAM_DATA: 'stream_data',      // 流式数据
  STREAM_START: 'stream_start',    // 开始流式
  STREAM_END: 'stream_end',        // 流式结束
  STREAM_ERROR: 'stream_error',    // 流式错误
  REQUEST_COMPLETE: 'request_complete' // 请求完成
}

export default EventBus
