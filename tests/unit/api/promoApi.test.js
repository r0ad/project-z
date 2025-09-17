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

    it('应该能够处理非字符串分享码', async () => {
      const result = await promoApi.validatePromoCode(null)

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
          model: 'gpt-3.5-turbo',
          baseUrl: 'https://api.openai.com/v1',
          timeout: 130,
          maxTokens: 2000,
          temperature: 0.7,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
        }
      }
      
      cryptoUtils.validatePromoCodeUniversal.mockReturnValue(mockValidation)
      dbService.query.mockResolvedValue([]) // 模拟没有现有配置
      dbService.executeSql.mockResolvedValue(true)
      global.uni.setStorageSync.mockResolvedValue(true)

      const result = await promoApi.applyPromoCode(promoCode)

      expect(result.success).toBe(true)
      expect(result.message).toBe('分享码应用成功')
      expect(cryptoUtils.validatePromoCodeUniversal).toHaveBeenCalledWith(promoCode)
    })

    it('应该能够处理已存在相同provider的分享码配置', async () => {
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
      dbService.query.mockResolvedValue([{ id: 1, provider: 'OpenAI' }]) // 模拟已存在配置

      const result = await promoApi.applyPromoCode(promoCode)

      expect(result.success).toBe(false)
      expect(result.error).toContain('已存在来自分享码的OpenAI配置')
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
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        appliedAt: Date.now() - 24 * 60 * 60 * 1000
      }
      
      global.uni.getStorageSync.mockReturnValue(mockConfig)

      const result = await promoApi.getPromoCodeStatus()

      expect(result).toHaveProperty('hasPromoCode', true)
      expect(result).toHaveProperty('provider', 'OpenAI')
      expect(result).toHaveProperty('expired', false)
      expect(result).toHaveProperty('remainingDays')
    })

    it('应该能够处理没有推广码的情况', async () => {
      global.uni.getStorageSync.mockReturnValue(null)

      const result = await promoApi.getPromoCodeStatus()

      expect(result).toHaveProperty('hasPromoCode', false)
    })

    it('应该能够检查过期状态', async () => {
      const mockConfig = {
        provider: 'OpenAI',
        expiresAt: Date.now() - 24 * 60 * 60 * 1000 // 已过期
      }
      
      global.uni.getStorageSync.mockReturnValue(mockConfig)
      global.uni.removeStorageSync.mockResolvedValue(true)

      const result = await promoApi.checkPromoCodeExpiry()

      expect(result).toHaveProperty('hasPromoCode', true)
      expect(result).toHaveProperty('expired', true)
    })
  })

  describe('推广码管理测试', () => {
    it('应该能够移除推广码', async () => {
      const mockConfig = {
        id: 'promo_123',
        provider: 'OpenAI'
      }
      
      global.uni.getStorageSync.mockReturnValue(mockConfig)
      dbService.delete.mockResolvedValue({ changes: 1 })
      global.uni.removeStorageSync.mockResolvedValue(true)

      const result = await promoApi.removePromoCode()

      expect(result.success).toBe(true)
      expect(result.message).toBe('分享码已移除')
      expect(dbService.delete).toHaveBeenCalled()
    })

    it('应该能够处理移除不存在的推广码', async () => {
      global.uni.getStorageSync.mockReturnValue(null)

      const result = await promoApi.removePromoCode()

      expect(result.success).toBe(false)
      expect(result.error).toBe('没有找到分享码配置')
    })

    it('应该能够保存推广码配置', async () => {
      const config = {
        id: 'promo_123',
        code: 'test_code',
        provider: 'OpenAI'
      }
      
      global.uni.setStorageSync.mockResolvedValue(true)

      await promoApi.savePromoConfig(config)

      expect(global.uni.setStorageSync).toHaveBeenCalledWith('promo_code_config', config)
    })

    it('应该能够获取推广码配置', async () => {
      const mockConfig = {
        id: 'promo_123',
        provider: 'OpenAI'
      }
      
      global.uni.getStorageSync.mockReturnValue(mockConfig)

      const result = await promoApi.getPromoConfig()

      expect(result).toEqual(mockConfig)
      expect(global.uni.getStorageSync).toHaveBeenCalledWith('promo_code_config')
    })

    it('应该能够清除推广码配置', async () => {
      global.uni.removeStorageSync.mockResolvedValue(true)

      await promoApi.clearPromoConfig()

      expect(global.uni.removeStorageSync).toHaveBeenCalledWith('promo_code_config')
    })
  })

  describe('备份和恢复测试', () => {
    it('应该能够备份当前AI配置', async () => {
      const mockConfig = {
        id: 1,
        provider: 'OpenAI',
        api_key: 'test-key',
        is_active: 1
      }
      
      dbService.findOne.mockResolvedValue(mockConfig)
      global.uni.setStorageSync.mockResolvedValue(true)

      await promoApi.backupCurrentAIConfig()

      expect(dbService.findOne).toHaveBeenCalledWith('ai_config', 'is_active = ? AND user_id = ?', [1, 1])
      expect(global.uni.setStorageSync).toHaveBeenCalledWith('ai_config_backup', expect.objectContaining({
        ...mockConfig,
        backedUpAt: expect.any(Number)
      }))
    })

    it('应该能够恢复备份的AI配置', async () => {
      const mockBackup = {
        id: 1,
        provider: 'OpenAI',
        api_key: 'test-key',
        backedUpAt: Date.now()
      }
      
      global.uni.getStorageSync.mockReturnValue(mockBackup)
      dbService.update.mockResolvedValue(true)
      dbService.insert.mockResolvedValue(2)
      global.uni.removeStorageSync.mockResolvedValue(true)

      const result = await promoApi.restoreBackupAIConfig()

      expect(result.success).toBe(true)
      expect(result.message).toBe('配置恢复成功')
      expect(dbService.insert).toHaveBeenCalledWith('ai_config', expect.objectContaining({
        provider: 'OpenAI',
        api_key: 'test-key',
        is_active: 1
      }))
    })

    it('应该能够处理没有备份的情况', async () => {
      global.uni.getStorageSync.mockReturnValue(null)

      const result = await promoApi.restoreBackupAIConfig()

      expect(result.success).toBe(false)
      expect(result.error).toBe('没有找到备份配置')
    })
  })

  describe('推广码ID生成测试', () => {
    it('应该能够生成符合格式的推广码ID', () => {
      const promoCode = 'test_code'
      const id = promoApi.generatePromoCodeId(promoCode)

      expect(id).toMatch(/^promo_[a-z0-9]+_\d+$/)
      expect(id).toContain('promo_')
      expect(id).toContain('_')
    })

    it('应该能够为不同推广码生成不同ID', () => {
      const promoCode1 = 'test_code_1'
      const promoCode2 = 'test_code_2'
      const id1 = promoApi.generatePromoCodeId(promoCode1)
      const id2 = promoApi.generatePromoCodeId(promoCode2)

      expect(id1).not.toBe(id2)
      expect(id1).toMatch(/^promo_[a-z0-9]+_\d+$/)
      expect(id2).toMatch(/^promo_[a-z0-9]+_\d+$/)
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

    it('应该能够处理数据库操作失败', async () => {
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
      dbService.initDB.mockRejectedValue(new Error('数据库连接失败'))

      const result = await promoApi.applyPromoCode(promoCode)

      expect(result.success).toBe(false)
      expect(result.error).toContain('应用分享码失败')
    })

    it('应该能够处理存储操作失败', async () => {
      const config = { id: 'test' }
      global.uni.setStorageSync.mockImplementation(() => {
        throw new Error('存储失败')
      })

      await expect(promoApi.savePromoConfig(config)).rejects.toThrow('存储失败')
    })
  })
})
