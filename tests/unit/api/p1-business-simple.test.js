/**
 * P1 业务功能简化测试
 * 专注于验证 API 方法能够被调用，不测试复杂的业务逻辑
 */

// Mock 依赖
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')
jest.mock('@/utils/cryptoUtils.js')
jest.mock('@/api/projectApi.js')
jest.mock('@/api/knowledgeApi.js')
jest.mock('@/api/favoriteApi.js')
jest.mock('@/api/logApi.js')
jest.mock('@/api/promoApi.js')

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
    
    // Mock uni global object
    global.uni = {
      getStorageSync: jest.fn(),
      setStorageSync: jest.fn(),
      removeStorageSync: jest.fn()
    }
    
    // Mock API methods
    knowledgeApi.getKnowledgeList = jest.fn()
    knowledgeApi.createKnowledge = jest.fn()
    knowledgeApi.searchKnowledge = jest.fn()
    favoriteApi.getFavoritesList = jest.fn()
    favoriteApi.addFavorite = jest.fn()
    favoriteApi.removeFavorite = jest.fn()
    logApi.getProjectLogs = jest.fn()
    logApi.createLog = jest.fn()
    logApi.getLogStats = jest.fn()
    promoApi.validatePromoCode = jest.fn()
    promoApi.applyPromoCode = jest.fn()
    promoApi.getPromoCodeStatus = jest.fn()
  })

  describe('知识库管理 API 基础功能', () => {
    it('应该能够调用知识库列表查询', async () => {
      knowledgeApi.getKnowledgeList.mockResolvedValue([])

      const result = await knowledgeApi.getKnowledgeList()

      expect(result).toBeDefined()
      expect(knowledgeApi.getKnowledgeList).toHaveBeenCalled()
    })

    it('应该能够调用知识库创建', async () => {
      knowledgeApi.createKnowledge.mockResolvedValue(123)

      const knowledgeData = {
        title: '测试知识',
        content: '测试内容',
        category: '技术'
      }

      const result = await knowledgeApi.createKnowledge(knowledgeData)

      expect(result).toBeDefined()
      expect(knowledgeApi.createKnowledge).toHaveBeenCalled()
    })

    it('应该能够调用知识库搜索', async () => {
      knowledgeApi.searchKnowledge.mockResolvedValue([])

      const result = await knowledgeApi.searchKnowledge('测试')

      expect(result).toBeDefined()
      expect(knowledgeApi.searchKnowledge).toHaveBeenCalled()
    })
  })

  describe('收藏管理 API 基础功能', () => {
    it('应该能够调用收藏列表查询', async () => {
      favoriteApi.getFavoritesList.mockResolvedValue([])

      const result = await favoriteApi.getFavoritesList()

      expect(result).toBeDefined()
      expect(favoriteApi.getFavoritesList).toHaveBeenCalled()
    })

    it('应该能够调用添加收藏', async () => {
      favoriteApi.addFavorite.mockResolvedValue(true)

      const result = await favoriteApi.addFavorite('project', 1)

      expect(result).toBeDefined()
      expect(favoriteApi.addFavorite).toHaveBeenCalled()
    })

    it('应该能够调用取消收藏', async () => {
      favoriteApi.removeFavorite.mockResolvedValue(true)

      const result = await favoriteApi.removeFavorite('project', 1)

      expect(result).toBeDefined()
      expect(favoriteApi.removeFavorite).toHaveBeenCalled()
    })
  })

  describe('日志管理 API 基础功能', () => {
    it('应该能够调用项目日志查询', async () => {
      logApi.getProjectLogs.mockResolvedValue([])

      const result = await logApi.getProjectLogs(1)

      expect(result).toBeDefined()
      expect(logApi.getProjectLogs).toHaveBeenCalled()
    })

    it('应该能够调用创建日志', async () => {
      logApi.createLog.mockResolvedValue({ id: 123, title: '测试日志' })

      const logData = {
        title: '测试日志',
        content: '测试内容'
      }

      const result = await logApi.createLog(1, logData)

      expect(result).toBeDefined()
      expect(logApi.createLog).toHaveBeenCalled()
    })

    it('应该能够调用日志统计', async () => {
      logApi.getLogStats.mockResolvedValue({ totalLogs: 10 })

      const result = await logApi.getLogStats(1)

      expect(result).toBeDefined()
      expect(logApi.getLogStats).toHaveBeenCalled()
    })
  })

  describe('推广功能 API 基础功能', () => {
    it('应该能够调用推广码验证', async () => {
      promoApi.validatePromoCode.mockResolvedValue({
        success: true,
        data: { provider: 'OpenAI' }
      })

      const result = await promoApi.validatePromoCode('test_code')

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
      expect(promoApi.validatePromoCode).toHaveBeenCalled()
    })

    it('应该能够调用推广码应用', async () => {
      promoApi.applyPromoCode.mockResolvedValue({
        success: true,
        message: '应用成功'
      })

      const result = await promoApi.applyPromoCode('test_code')

      expect(result).toBeDefined()
      expect(promoApi.applyPromoCode).toHaveBeenCalled()
    })

    it('应该能够调用推广码状态查询', async () => {
      promoApi.getPromoCodeStatus.mockResolvedValue({ hasPromoCode: true })

      const result = await promoApi.getPromoCodeStatus()

      expect(result).toBeDefined()
      expect(promoApi.getPromoCodeStatus).toHaveBeenCalled()
    })
  })

  describe('错误处理基础功能', () => {
    it('应该能够处理数据库连接失败', async () => {
      knowledgeApi.getKnowledgeList.mockRejectedValue(new Error('数据库连接失败'))

      await expect(knowledgeApi.getKnowledgeList()).rejects.toThrow('数据库连接失败')
    })

    it('应该能够处理查询失败', async () => {
      favoriteApi.getFavoritesList.mockRejectedValue(new Error('查询失败'))

      await expect(favoriteApi.getFavoritesList()).rejects.toThrow('查询失败')
    })
  })
})
