/**
 * 推广功能 API 单元测试
 * 测试推广码的生成、验证、统计等功能
 */

// Mock 依赖
jest.mock('@/utils/cryptoUtils.js')
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')

import promoApi from '@/api/promoApi.js'
import cryptoUtils from '@/utils/cryptoUtils.js'
import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'

describe('推广功能 API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    userStore.getCurrentUserId.mockReturnValue(1)
    
    // Mock uni global object
    global.uni = {
      getStorageSync: jest.fn(),
      setStorageSync: jest.fn(),
      removeStorageSync: jest.fn()
    }
  })

  describe('推广码验证测试', () => {
    it('应该能够验证有效的推广码', async () => {
      const promoCode = 'valid_promo_code'
      const mockValidation = {
        valid: true,
        data: {
          provider: 'OpenAI',
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo'
        },
        remainingDays: 30
      }
      
      cryptoUtils.validatePromoCodeUniversal.mockReturnValue(mockValidation)

      const result = await promoApi.validatePromoCode(promoCode)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockValidation.data)
      expect(cryptoUtils.validatePromoCodeUniversal).toHaveBeenCalledWith(promoCode)
    })

    it('应该能够处理无效的推广码', async () => {
      const promoCode = 'invalid_promo_code'
      const mockValidation = {
        valid: false,
        error: '分享码不存在或已过期'
      }
      
      cryptoUtils.validatePromoCodeUniversal.mockReturnValue(mockValidation)

      const result = await promoApi.validatePromoCode(promoCode)

      expect(result.success).toBe(false)
      expect(result.error).toBe('分享码不存在或已过期')
    })

    it('应该能够处理空分享码', async () => {
      const result = await promoApi.validatePromoCode('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('分享码不能为空')
    })
  })

  describe('推广码应用测试', () => {
    it('应该能够应用推广码', async () => {
      const promoCode = 'valid_promo_code'
      const mockValidation = {
        valid: true,
        data: {
          provider: 'OpenAI',
          apiKey: 'test-key',
          model: 'gpt-3.5-turbo'
        }
      }
      
      cryptoUtils.validatePromoCodeUniversal.mockReturnValue(mockValidation)
      dbService.query.mockResolvedValue([]) // 模拟没有现有配置
      dbService.executeSql.mockResolvedValue(true)

      const result = await promoApi.applyPromoCode(promoCode)

      expect(result.success).toBe(true)
      expect(cryptoUtils.validatePromoCodeUniversal).toHaveBeenCalledWith(promoCode)
    })

    it('应该能够处理应用失败', async () => {
      const promoCode = 'invalid_promo_code'
      const mockValidation = {
        success: false,
        error: '分享码无效'
      }
      
      cryptoUtils.validatePromoCodeUniversal.mockReturnValue(mockValidation)

      const result = await promoApi.applyPromoCode(promoCode)

      expect(result.success).toBe(false)
      expect(result.error).toBe('分享码无效')
    })
  })

  describe('推广码状态测试', () => {
    it('应该能够获取推广码状态', async () => {
      const mockConfig = {
        provider: 'OpenAI',
        expires_at: '2024-12-31T23:59:59Z'
      }
      
      // Mock uni.getStorageSync to return mock config
      global.uni = {
        getStorageSync: jest.fn().mockReturnValue(mockConfig)
      }

      const result = await promoApi.getPromoCodeStatus()

      expect(result).toHaveProperty('hasPromoCode')
      expect(result).toHaveProperty('provider')
    })

    it('应该能够移除推广码', async () => {
      const mockConfig = {
        id: 'promo_123',
        provider: 'OpenAI'
      }
      
      global.uni.getStorageSync.mockReturnValue(mockConfig)
      dbService.delete.mockResolvedValue({ changes: 1 })

      const result = await promoApi.removePromoCode()

      expect(result.success).toBe(true)
      expect(result.message).toBe('分享码已移除')
      expect(dbService.delete).toHaveBeenCalled()
    })
  })

  describe('错误处理测试', () => {
    it('应该能够处理验证失败', async () => {
      const promoCode = 'test_code'
      cryptoUtils.validatePromoCodeUniversal.mockImplementation(() => {
        throw new Error('验证失败')
      })

      const result = await promoApi.validatePromoCode(promoCode)

      expect(result.success).toBe(false)
      expect(result.error).toBe('分享码验证失败: 验证失败')
    })

    it('应该能够处理应用失败', async () => {
      const promoCode = 'test_code'
      cryptoUtils.validatePromoCodeUniversal.mockImplementation(() => {
        throw new Error('应用失败')
      })

      const result = await promoApi.applyPromoCode(promoCode)

      expect(result.success).toBe(false)
      expect(result.error).toBe('分享码验证失败: 应用失败')
    })
  })
})
