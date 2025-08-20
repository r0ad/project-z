/**
 * 日期处理工具类
 * 提供统一的日期格式化和处理功能
 */

class DateUtils {
  /**
   * 格式化日期时间显示
   * @param {string|Date} dateTime - 日期时间
   * @param {boolean} convertFromUTC - 是否从UTC时间转换为本地时间，默认为true
   * @returns {string} 格式化后的时间字符串
   */
  static formatDateTime(dateTime, convertFromUTC = true) {
    if (!dateTime) return ''
    
    let date
    if (convertFromUTC) {
      // 默认将数据库的UTC时间转换为北京时间
      date = this.utcToBeijing(dateTime)
    } else {
      date = new Date(dateTime)
    }
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    console.log('dateTime diff', dateTime,now,date,diff)
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
   * @param {boolean} convertFromUTC - 是否从UTC时间转换为本地时间，默认为true
   * @returns {string} YYYY-MM-DD HH:mm:ss 格式
   */
  static formatStandard(dateTime, convertFromUTC = true) {
    if (!dateTime) return ''
    
    let date
    if (convertFromUTC) {
      // 默认将数据库的UTC时间转换为北京时间
      date = this.utcToBeijing(dateTime)
    } else {
      date = new Date(dateTime)
    }
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
   * @param {boolean} convertFromUTC - 是否从UTC时间转换为本地时间，默认为true
   * @returns {string} YYYY-MM-DD 格式
   */
  static formatDate(dateTime, convertFromUTC = true) {
    if (!dateTime) return ''
    
    let date
    if (convertFromUTC) {
      // 默认将数据库的UTC时间转换为北京时间
      date = this.utcToBeijing(dateTime)
    } else {
      date = new Date(dateTime)
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }
  
  /**
   * 格式化为时间格式（不含日期）
   * @param {string|Date} dateTime - 日期时间
   * @param {boolean} convertFromUTC - 是否从UTC时间转换为本地时间，默认为true
   * @returns {string} HH:mm:ss 格式
   */
  static formatTime(dateTime, convertFromUTC = true) {
    if (!dateTime) return ''
    
    let date
    if (convertFromUTC) {
      // 默认将数据库的UTC时间转换为北京时间
      date = this.utcToBeijing(dateTime)
    } else {
      date = new Date(dateTime)
    }
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
   * 获取当前本地时间的ISO字符串（用于数据库存储）
   * @returns {string} 本地时间的ISO格式字符串
   */
  static getCurrentLocalISOString() {
    const now = new Date()
    const offset = now.getTimezoneOffset() * 60000 // 转换为毫秒
    const localTime = new Date(now.getTime() - offset)
    return localTime.toISOString().replace('Z', '')
  }
  
  /**
   * 将UTC时间字符串转换为本地时间显示
   * @param {string} utcTimeString - UTC时间字符串
   * @returns {Date} 本地时间Date对象
   */
  static utcToLocal(utcTimeString) {
    if (!utcTimeString) return null
    
    // 如果时间字符串没有时区信息，假设它是本地时间
    if (!utcTimeString.includes('Z') && !utcTimeString.includes('+') && !utcTimeString.includes('-', 10)) {
      return new Date(utcTimeString)
    }
    
    return new Date(utcTimeString)
  }
  
  /**
   * 将UTC时间转换为北京时间（UTC+8）
   * @param {string|Date} dateTime - UTC时间
   * @returns {Date} 北京时间Date对象
   */
  static utcToBeijing(dateTime) {
    if (!dateTime) return null
    
    let utcDate
    if (typeof dateTime === 'string') {
      // 如果是字符串且没有时区信息，假设它是UTC时间
      if (!dateTime.includes('Z') && !dateTime.includes('+') && !dateTime.includes('-', 10)) {
        return new Date(dateTime + 'Z') // 添加Z表示UTC时间
      } else {
        utcDate = new Date(dateTime)
      }
    } else {
      utcDate = new Date(dateTime)
    }
    // 转换为北京时间（UTC+8）
    const beijingTime = new Date(utcDate.getTime() + 8 * 60 * 60 * 1000)
    return beijingTime
  }
  
  /**
   * 判断是否为今天
   * @param {string|Date} dateTime - 日期时间
   * @param {boolean} convertFromUTC - 是否从UTC时间转换为本地时间，默认为true
   * @returns {boolean} 是否为今天
   */
  static isToday(dateTime, convertFromUTC = true) {
    if (!dateTime) return false
    
    let date
    if (convertFromUTC) {
      date = this.utcToBeijing(dateTime)
    } else {
      date = new Date(dateTime)
    }
    const today = new Date()
    
    return date.getFullYear() === today.getFullYear() &&
           date.getMonth() === today.getMonth() &&
           date.getDate() === today.getDate()
  }
  
  /**
   * 判断是否为本周
   * @param {string|Date} dateTime - 日期时间
   * @param {boolean} convertFromUTC - 是否从UTC时间转换为本地时间，默认为true
   * @returns {boolean} 是否为本周
   */
  static isThisWeek(dateTime, convertFromUTC = true) {
    if (!dateTime) return false
    
    let date
    if (convertFromUTC) {
      date = this.utcToBeijing(dateTime)
    } else {
      date = new Date(dateTime)
    }
    const today = new Date()
    const diff = today.getTime() - date.getTime()
    
    return diff >= 0 && diff < 7 * 24 * 60 * 60 * 1000
  }
}

export default DateUtils