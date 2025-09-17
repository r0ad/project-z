/**
 * 日期工具函数单元测试
 * 测试日期相关的工具函数
 */

import DateUtils from '@/utils/dateUtils.js'

describe('日期工具函数测试', () => {
  describe('日期格式化', () => {
    it('应该能够格式化日期为 YYYY-MM-DD 格式', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = DateUtils.formatDate(date, false) // 不转换时区
      
      expect(result).toBe('2024-01-15')
    })

    it('应该能够格式化日期为 YYYY-MM-DD HH:mm:ss 格式', () => {
      const date = new Date('2024-01-15T10:30:00Z')
      const result = DateUtils.formatStandard(date, false) // 不转换时区
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })

    it('应该能够格式化相对时间', () => {
      const past = new Date(Date.now() - 30 * 60 * 1000) // 30分钟前
      const result = DateUtils.formatDateTime(past, false) // 不转换时区
      
      expect(result).toBe('30分钟前')
    })
  })

  describe('时间格式化', () => {
    it('应该能够格式化时间为 HH:mm:ss 格式', () => {
      const date = new Date('2024-01-15T10:30:45Z')
      const result = DateUtils.formatTime(date)
      
      expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    })

    it('应该能够获取当前日期', () => {
      const result = DateUtils.getCurrentDate()
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    })

    it('应该能够获取当前时间', () => {
      const result = DateUtils.getCurrentDateTime()
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
    })
  })

  describe('时区转换', () => {
    it('应该能够将 UTC 时间转换为本地时间', () => {
      const utcTimeString = '2024-01-15T10:00:00Z'
      const result = DateUtils.utcToLocal(utcTimeString)
      
      expect(result).toBeInstanceOf(Date)
    })

    it('应该能够将 UTC 时间转换为北京时间', () => {
      const utcTimeString = '2024-01-15T10:00:00Z'
      const result = DateUtils.utcToBeijing(utcTimeString)
      
      expect(result).toBeInstanceOf(Date)
      // 检查转换后的时间是否正确（UTC+8）
      const expectedTime = new Date('2024-01-15T18:00:00Z')
      expect(result.getTime()).toBe(expectedTime.getTime())
    })
  })

  describe('日期判断', () => {
    it('应该能够判断是否为今天', () => {
      const today = new Date()
      const result = DateUtils.isToday(today, false) // 不转换时区
      
      expect(result).toBe(true)
    })

    it('应该能够判断是否为本周', () => {
      const thisWeek = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2天前
      const result = DateUtils.isThisWeek(thisWeek, false) // 不转换时区
      
      expect(result).toBe(true)
    })
  })

  describe('边界条件', () => {
    it('应该能够处理 null 日期', () => {
      const result = DateUtils.formatDate(null)
      
      expect(result).toBe('')
    })

    it('应该能够处理 undefined 日期', () => {
      const result = DateUtils.formatDate(undefined)
      
      expect(result).toBe('')
    })

    it('应该能够处理空字符串日期', () => {
      const result = DateUtils.formatDate('')
      
      expect(result).toBe('')
    })
  })

  describe('ISO 字符串处理', () => {
    it('应该能够获取当前本地时间的 ISO 字符串', () => {
      const result = DateUtils.getCurrentLocalISOString()
      
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}$/)
    })
  })
})
