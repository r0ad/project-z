/**
 * 日期处理工具类
 * 提供统一的日期格式化和处理功能
 */

class DateUtils {
  /**
   * 格式化日期时间显示
   * @param {string|Date} dateTime - 日期时间
   * @returns {string} 格式化后的时间字符串
   */
  static formatDateTime(dateTime) {
    if (!dateTime) return ''
    
    const date = new Date(dateTime)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    
    // 小于1分钟
    if (diff < 60 * 1000) {
      return '刚刚'
    }
    
    // 小于1小时
    if (diff < 60 * 60 * 1000) {
      const minutes = Math.floor(diff / (60 * 1000))
      return `${minutes}分钟前`
    }
    
    // 小于1天
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000))
      return `${hours}小时前`
    }
    
    // 小于7天
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = Math.floor(diff / (24 * 60 * 60 * 1000))
      return `${days}天前`
    }
    
    // 超过7天，显示具体日期
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    
    // 如果是今年，不显示年份
    if (year === now.getFullYear()) {
      return `${month}-${day} ${hour}:${minute}`
    }
    
    return `${year}-${month}-${day} ${hour}:${minute}`
  }
  
  /**
   * 格式化为标准日期格式
   * @param {string|Date} dateTime - 日期时间
   * @returns {string} YYYY-MM-DD HH:mm:ss 格式
   */
  static formatStandard(dateTime) {
    if (!dateTime) return ''
    
    const date = new Date(dateTime)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }
  
  /**
   * 格式化为日期格式（不含时间）
   * @param {string|Date} dateTime - 日期时间
   * @returns {string} YYYY-MM-DD 格式
   */
  static formatDate(dateTime) {
    if (!dateTime) return ''
    
    const date = new Date(dateTime)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }
  
  /**
   * 格式化为时间格式（不含日期）
   * @param {string|Date} dateTime - 日期时间
   * @returns {string} HH:mm:ss 格式
   */
  static formatTime(dateTime) {
    if (!dateTime) return ''
    
    const date = new Date(dateTime)
    const hour = String(date.getHours()).padStart(2, '0')
    const minute = String(date.getMinutes()).padStart(2, '0')
    const second = String(date.getSeconds()).padStart(2, '0')
    
    return `${hour}:${minute}:${second}`
  }
  
  /**
   * 获取当前日期字符串
   * @returns {string} YYYY-MM-DD 格式的当前日期
   */
  static getCurrentDate() {
    return this.formatDate(new Date())
  }
  
  /**
   * 获取当前时间字符串
   * @returns {string} YYYY-MM-DD HH:mm:ss 格式的当前时间
   */
  static getCurrentDateTime() {
    return this.formatStandard(new Date())
  }
  
  /**
   * 判断是否为今天
   * @param {string|Date} dateTime - 日期时间
   * @returns {boolean} 是否为今天
   */
  static isToday(dateTime) {
    if (!dateTime) return false
    
    const date = new Date(dateTime)
    const today = new Date()
    
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate()
  }
  
  /**
   * 判断是否为本周
   * @param {string|Date} dateTime - 日期时间
   * @returns {boolean} 是否为本周
   */
  static isThisWeek(dateTime) {
    if (!dateTime) return false
    
    const date = new Date(dateTime)
    const today = new Date()
    const diff = today.getTime() - date.getTime()
    
    return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000
  }
}

export default DateUtils