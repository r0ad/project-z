/**
 * P1 业务功能简化测试
 * 专注于验证 API 方法能够被调用，不测试复杂的业务逻辑
 */

// Mock 依赖
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')
jest.mock('@/utils/cryptoUtils.js')

import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'
import cryptoUtils from '@/utils/cryptoUtils.js'
import knowledgeApi from '@/api/knowledgeApi.js'
import favoriteApi from '@/api/favoriteApi.js'
import logApi from '@/api/logApi.js'
import promoApi from '@/api/promoApi.js'

describe('P1 业务功能简化测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    userStore.getCurrentUserId.mockReturnValue(1)
    DateUtils.getCurrentLocalISOString.mockReturnValue('2024-01-01T10:00:00Z')
    DateUtils.formatDateTime.mockReturnValue('2024-01-01 10:00')
    
    // Mock dbService 初始化状态
    dbService.isInitialized = true
    dbService.initDB = jest.fn().mockResolvedValue(true)
    
    // Mock uni global object
    global.uni = {
      getStorageSync: jest.fn(),
      setStorageSync: jest.fn(),
      removeStorageSync: jest.fn()
    }
  })

  describe('知识库管理 API 基础功能', () => {
    it('应该能够调用知识库列表查询', async () => {
      dbService.findMany.mockResolvedValue([])

      const result = await knowledgeApi.getKnowledgeList()

      expect(result).toEqual([])
      expect(dbService.findMany).toHaveBeenCalled()
    })

    it('应该能够调用知识库创建', async () => {
      dbService.insert.mockResolvedValue(123)

      const knowledgeData = {
        title: '测试知识',
        content: '测试内容',
        category: '技术'
      }

      const result = await knowledgeApi.createKnowledge(knowledgeData)

      expect(result.data.id).toBe(123)
      expect(dbService.insert).toHaveBeenCalled()
    })

    it('应该能够调用知识库搜索', async () => {
      dbService.findMany.mockResolvedValue([])

      const result = await knowledgeApi.searchKnowledge('测试')

      expect(result).toEqual([])
      expect(dbService.findMany).toHaveBeenCalled()
    })
  })

  describe('收藏管理 API 基础功能', () => {
    it('应该能够调用收藏列表查询', async () => {
      dbService.findMany.mockResolvedValue([])

      const result = await favoriteApi.getFavoritesList()

      expect(result).toEqual([])
      expect(dbService.findMany).toHaveBeenCalled()
    })

    it('应该能够调用添加收藏', async () => {
      dbService.findOne.mockResolvedValue(null) // 没有重复收藏
      dbService.insert.mockResolvedValue(1)

      const result = await favoriteApi.addFavorite('project', 1)

      expect(result).toBe(true)
      expect(dbService.insert).toHaveBeenCalled()
    })

    it('应该能够调用取消收藏', async () => {
      dbService.delete.mockResolvedValue({ changes: 1 })

      const result = await favoriteApi.removeFavorite('project', 1)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalled()
    })
  })

  describe('日志管理 API 基础功能', () => {
    it('应该能够调用项目日志查询', async () => {
      dbService.findMany.mockResolvedValue([])

      const result = await logApi.getProjectLogs(1)

      expect(result).toEqual([])
      expect(dbService.findMany).toHaveBeenCalled()
    })

    it('应该能够调用创建日志', async () => {
      dbService.findOne
        .mockResolvedValueOnce({ id: 1, name: '测试项目' }) // 项目存在
        .mockResolvedValueOnce({ id: 123, content: '测试内容' }) // 日志详情
      dbService.insert.mockResolvedValue(123)

      const logData = {
        title: '测试日志',
        content: '测试内容'
      }

      const result = await logApi.createLog(1, logData)

      expect(result.id).toBe(123)
      expect(dbService.insert).toHaveBeenCalled()
    })

    it('应该能够调用日志统计', async () => {
      dbService.count.mockResolvedValue(10)
      dbService.query
        .mockResolvedValueOnce([]) // 类型统计
        .mockResolvedValueOnce([{ count: 5 }]) // 最近7天
        .mockResolvedValueOnce([{ count: 2 }]) // 问题日志

      const result = await logApi.getLogStats(1)

      expect(result.totalLogs).toBe(10)
      expect(dbService.count).toHaveBeenCalled()
    })
  })

  describe('推广功能 API 基础功能', () => {
    it('应该能够调用推广码验证', async () => {
      cryptoUtils.validatePromoCodeUniversal.mockReturnValue({
        valid: true,
        data: { provider: 'OpenAI' }
      })

      const result = await promoApi.validatePromoCode('test_code')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ provider: 'OpenAI' })
      expect(cryptoUtils.validatePromoCodeUniversal).toHaveBeenCalled()
    })

    it('应该能够调用推广码应用', async () => {
      cryptoUtils.validatePromoCodeUniversal.mockReturnValue({
        valid: true,
        data: { provider: 'OpenAI', apiKey: 'test-key' }
      })
      dbService.query.mockResolvedValue([]) // 没有现有配置
      dbService.executeSql.mockResolvedValue(true)
      global.uni.setStorageSync.mockResolvedValue(true)

      const result = await promoApi.applyPromoCode('test_code')

      expect(result.success).toBe(true)
      expect(result.message).toBe('分享码应用成功')
      expect(cryptoUtils.validatePromoCodeUniversal).toHaveBeenCalled()
    })

    it('应该能够调用推广码状态查询', async () => {
      global.uni.getStorageSync.mockReturnValue({ provider: 'OpenAI' })

      const result = await promoApi.getPromoCodeStatus()

      expect(result).toHaveProperty('hasPromoCode', true)
      expect(result).toHaveProperty('provider', 'OpenAI')
      expect(global.uni.getStorageSync).toHaveBeenCalled()
    })
  })

  describe('错误处理基础功能', () => {
    it('应该能够处理数据库连接失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('数据库连接失败'))

      await expect(knowledgeApi.getKnowledgeList()).rejects.toThrow('数据库连接失败')
    })

    it('应该能够处理查询失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('查询失败'))

      await expect(favoriteApi.getFavoritesList()).rejects.toThrow('查询失败')
    })
  })
})
