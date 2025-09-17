/**
 * AI API 单元测试
 * 测试 AI 相关的 API 功能
 * 使用真实的API源码进行测试
 */

// Mock 依赖
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')
jest.mock('@/uni_modules/openai-chat/js_sdk/openai-api.js')
jest.mock('@/api/promoApi.js')

// 导入真实的模块
import aiApi from '@/api/aiApi.js'
import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'
import OpenAIAPI from '@/uni_modules/openai-chat/js_sdk/openai-api.js'
import promoApi from '@/api/promoApi.js'

describe('AI API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // 设置用户ID
    userStore.setCurrentUserId(1)
    
    // Mock数据库初始化状态，避免plus.sqlite检查
    dbService.isInitialized = true
    
    // Mock promoApi
    promoApi.getPromoCodeStatus = jest.fn().mockResolvedValue({
      hasPromoCode: false,
      provider: null
    })
    promoApi.clearPromoConfig = jest.fn().mockResolvedValue(true)
  })

  describe('AI API 实例化', () => {
    it('应该能够创建 AI API 实例', () => {
      expect(aiApi).toBeDefined()
      expect(aiApi.openaiAPI).toBeNull()
      expect(aiApi.isConfigured).toBe(false)
    })
  })

  describe('数据库初始化', () => {
    it('应该能够确保数据库已初始化', async () => {
      // 重置数据库状态
      dbService.isInitialized = false
      
      // 模拟数据库初始化
      const originalInitDB = dbService.initDB
      dbService.initDB = jest.fn().mockResolvedValue(true)

      await aiApi.ensureDBInit()

      expect(dbService.initDB).toHaveBeenCalled()
      
      // 恢复原始方法
      dbService.initDB = originalInitDB
    })

    it('应该跳过已初始化的数据库', async () => {
      // 设置数据库为已初始化状态
      dbService.isInitialized = true
      
      const originalInitDB = dbService.initDB
      dbService.initDB = jest.fn()

      await aiApi.ensureDBInit()

      expect(dbService.initDB).not.toHaveBeenCalled()
      
      // 恢复原始方法
      dbService.initDB = originalInitDB
    })

    it('应该处理数据库初始化失败', async () => {
      dbService.isInitialized = false
      const originalInitDB = dbService.initDB
      dbService.initDB = jest.fn().mockRejectedValue(new Error('数据库初始化失败'))

      await expect(aiApi.ensureDBInit()).rejects.toThrow('数据库初始化失败')
      
      // 恢复原始方法
      dbService.initDB = originalInitDB
    })
  })

  describe('AI 配置管理', () => {
    it('应该能够获取AI配置列表', async () => {
      const mockConfigs = [
        { id: 1, provider: 'openai', api_key: 'test-key', is_active: 1 },
        { id: 2, provider: 'deepseek', api_key: 'test-key-2', is_active: 0 }
      ]
      
      const originalFindMany = dbService.findMany
      dbService.findMany = jest.fn().mockResolvedValue(mockConfigs)

      const result = await aiApi.getAIConfigList(1)

      expect(result).toEqual(mockConfigs)
      expect(dbService.findMany).toHaveBeenCalledWith(
        'ai_config', 
        'user_id = ?', 
        [1], 
        'created_at DESC'
      )
      
      // 恢复原始方法
      dbService.findMany = originalFindMany
    })

    it('应该能够添加AI配置', async () => {
      const config = {
        provider: 'openai',
        api_key: 'test-key',
        model: 'gpt-3.5-turbo',
        is_active: 1
      }

      const originalInsert = dbService.insert
      const originalUpdate = dbService.update
      dbService.insert = jest.fn().mockResolvedValue(1)
      dbService.update = jest.fn().mockResolvedValue(1)

      const result = await aiApi.addAIConfig(config, 1)

      expect(result).toBe(1)
      expect(dbService.insert).toHaveBeenCalledWith('ai_config', expect.objectContaining({
        provider: 'openai',
        api_key: 'test-key',
        model: 'gpt-3.5-turbo',
        is_active: 1,
        user_id: 1
      }))
      
      // 恢复原始方法
      dbService.insert = originalInsert
      dbService.update = originalUpdate
    })

    it('应该能够获取激活的AI配置', async () => {
      const mockConfig = {
        id: 1,
        provider: 'openai',
        api_key: 'test-key',
        model: 'gpt-3.5-turbo',
        is_active: 1
      }
      
      const originalFindOne = dbService.findOne
      dbService.findOne = jest.fn().mockResolvedValue(mockConfig)

      const result = await aiApi.getActiveAIConfig(1)

      expect(result).toEqual(mockConfig)
      expect(dbService.findOne).toHaveBeenCalledWith(
        'ai_config', 
        'is_active = ? AND user_id = ?', 
        [1, 1]
      )
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
    })

    it('应该返回默认配置当没有激活配置时', async () => {
      const originalFindOne = dbService.findOne
      dbService.findOne = jest.fn().mockResolvedValue(null)

      const result = await aiApi.getActiveAIConfig(1)

      expect(result).toEqual({
        provider: 'deepseek',
        base_url: 'https://api.deepseek.com/v1',
        api_key: '',
        model: 'deepseek-chat',
        timeout: 130,
        max_tokens: 2000,
        temperature: 0.7
      })
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
    })

    it('应该能够更新AI配置', async () => {
      const configId = 1
      const config = {
        provider: 'openai',
        api_key: 'new-key',
        model: 'gpt-4',
        is_active: 1
      }
      
      const originalFindOne = dbService.findOne
      const originalUpdate = dbService.update
      const originalExecuteSql = dbService.executeSql
      
      dbService.findOne = jest.fn().mockResolvedValue({ id: 1, promo_code_id: null })
      dbService.update = jest.fn().mockResolvedValue(1)
      dbService.executeSql = jest.fn().mockResolvedValue(1)

      const result = await aiApi.updateAIConfig(configId, config, 1)

      expect(result).toBe(1)
      expect(dbService.update).toHaveBeenCalled()
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
      dbService.update = originalUpdate
      dbService.executeSql = originalExecuteSql
    })

    it('应该能够删除AI配置', async () => {
      const provider = 'openai'
      
      const originalDelete = dbService.delete
      const originalFindOne = dbService.findOne
      const originalGetPromoCodeStatus = promoApi.getPromoCodeStatus
      
      dbService.delete = jest.fn().mockResolvedValue(1)
      dbService.findOne = jest.fn().mockResolvedValue({ id: 1 })
      promoApi.getPromoCodeStatus = jest.fn().mockResolvedValue({ hasPromoCode: false })

      await aiApi.deleteAIConfig(provider, 1)

      expect(dbService.delete).toHaveBeenCalledWith(
        'ai_config', 
        'provider = ? AND user_id = ?', 
        [provider, 1]
      )
      
      // 恢复原始方法
      dbService.delete = originalDelete
      dbService.findOne = originalFindOne
      promoApi.getPromoCodeStatus = originalGetPromoCodeStatus
    })

    it('应该能够激活AI配置', async () => {
      const provider = 'openai'
      const mockConfig = {
        id: 1,
        provider: 'openai',
        api_key: 'test-key',
        model: 'gpt-3.5-turbo',
        is_active: 1
      }
      
      const originalExecuteSql = dbService.executeSql
      const originalFindOne = dbService.findOne
      
      dbService.executeSql = jest.fn().mockResolvedValue(1)
      dbService.findOne = jest.fn().mockResolvedValue(mockConfig)

      await aiApi.activateAIConfig(provider, 1)

      expect(dbService.executeSql).toHaveBeenCalledWith(
        'UPDATE ai_config SET is_active = 0 WHERE user_id = ?', 
        [1]
      )
      expect(dbService.executeSql).toHaveBeenCalledWith(
        'UPDATE ai_config SET is_active = 1 WHERE provider = ? AND user_id = ?',
        [provider, 1]
      )
      
      // 恢复原始方法
      dbService.executeSql = originalExecuteSql
      dbService.findOne = originalFindOne
    })
  })

  describe('权限检查', () => {
    it('应该能够检查配置编辑权限', async () => {
      const configId = 1
      const mockConfig = { id: 1, promo_code_id: null }
      
      const originalFindOne = dbService.findOne
      dbService.findOne = jest.fn().mockResolvedValue(mockConfig)

      const result = await aiApi.canEditConfig(configId, 1)

      expect(result).toBe(true)
      expect(dbService.findOne).toHaveBeenCalledWith(
        'ai_config', 
        'id = ? AND user_id = ?', 
        [configId, 1]
      )
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
    })

    it('应该拒绝编辑分享码配置', async () => {
      const configId = 1
      const mockConfig = { id: 1, promo_code_id: 123 }
      
      const originalFindOne = dbService.findOne
      dbService.findOne = jest.fn().mockResolvedValue(mockConfig)

      const result = await aiApi.canEditConfig(configId, 1)

      expect(result).toBe(false)
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
    })

    it('应该能够检查配置是否为分享码配置', async () => {
      const configId = 1
      const mockConfig = { id: 1, promo_code_id: 123 }
      
      const originalFindOne = dbService.findOne
      dbService.findOne = jest.fn().mockResolvedValue(mockConfig)

      const result = await aiApi.isPromoCodeConfig(configId)

      expect(result).toBe(true)
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
    })
  })

  describe('AI 连接测试', () => {
    it('应该能够测试AI连接', async () => {
      const mockConfig = {
        id: 1,
        provider: 'openai',
        api_key: 'test-key',
        model: 'gpt-3.5-turbo',
        is_active: 1
      }
      
      const originalFindOne = dbService.findOne
      const originalInitOpenAI = aiApi.initOpenAI
      
      dbService.findOne = jest.fn().mockResolvedValue(mockConfig)
      
      // Mock initOpenAI方法，避免真实的API调用
      aiApi.initOpenAI = jest.fn().mockImplementation(() => {
        aiApi.openaiAPI = {
          chatCompletion: jest.fn().mockResolvedValue({
            content: '连接成功',
            usage: { totalTokens: 10 }
          })
        }
        aiApi.isConfigured = true
        return aiApi.openaiAPI
      })

      const result = await aiApi.testAIConnection()

      expect(result.success).toBe(true)
      expect(result.response).toBe('连接成功')
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
      aiApi.initOpenAI = originalInitOpenAI
    })

    it('应该处理AI连接失败', async () => {
      const originalFindOne = dbService.findOne
      dbService.findOne = jest.fn().mockResolvedValue(null)

      const result = await aiApi.testAIConnection()

      expect(result.success).toBe(false)
      expect(result.error).toContain('没有激活的AI配置')
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
    })
  })

  describe('项目分析', () => {
    it('应该能够分析项目', async () => {
      const projectId = 1
      const mockProject = {
        id: 1,
        name: '测试项目',
        goal: '项目目标',
        description: '项目描述',
        status: '进行中',
        progress: 50
      }
      const mockMilestones = [
        { title: '里程碑1', status: 'completed', progress: 100 }
      ]
      const mockLogs = [
        { content: '项目进展良好', progress_text: '完成了主要功能' }
      ]
      const mockConfig = {
        id: 1,
        provider: 'openai',
        api_key: 'test-key',
        model: 'gpt-3.5-turbo',
        is_active: 1
      }

      const originalFindOne = dbService.findOne
      const originalFindMany = dbService.findMany
      const originalInsert = dbService.insert
      const originalGetCurrentLocalISOString = DateUtils.getCurrentLocalISOString
      
      dbService.findOne = jest.fn()
        .mockResolvedValueOnce(mockProject) // 项目查询
        .mockResolvedValueOnce(mockConfig)  // AI配置查询
      dbService.findMany = jest.fn()
        .mockResolvedValueOnce(mockMilestones)
        .mockResolvedValueOnce(mockLogs)
      dbService.insert = jest.fn().mockResolvedValue(1)
      DateUtils.getCurrentLocalISOString = jest.fn().mockReturnValue('2024-01-15T10:00:00.000Z')
      
      // Mock initOpenAI方法，避免真实的API调用
      const originalInitOpenAI = aiApi.initOpenAI
      aiApi.initOpenAI = jest.fn().mockImplementation(() => {
        aiApi.openaiAPI = {
          chatCompletion: jest.fn().mockResolvedValue({
            content: '项目分析结果',
            usage: { totalTokens: 100 }
          })
        }
        aiApi.isConfigured = true
        return aiApi.openaiAPI
      })

      const result = await aiApi.analyzeProject(projectId, 'general')

      expect(result).toEqual({
        id: 1,
        type: 'general',
        content: '项目分析结果',
        createdAt: '2024-01-15T10:00:00.000Z'
      })
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
      dbService.findMany = originalFindMany
      dbService.insert = originalInsert
      DateUtils.getCurrentLocalISOString = originalGetCurrentLocalISOString
      aiApi.initOpenAI = originalInitOpenAI
    })

    it('应该处理项目不存在的情况', async () => {
      const originalFindOne = dbService.findOne
      dbService.findOne = jest.fn().mockResolvedValue(null)

      await expect(aiApi.analyzeProject(999, 'general')).rejects.toThrow('项目不存在')
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
    })
  })

  describe('项目聊天', () => {
    it('应该能够进行项目聊天', async () => {
      const projectId = 1
      const message = '你好'
      const chatHistory = []
      const mockProject = {
        id: 1,
        name: '测试项目',
        goal: '项目目标',
        description: '项目描述',
        status: '进行中'
      }
      const mockConfig = {
        id: 1,
        provider: 'openai',
        api_key: 'test-key',
        model: 'gpt-3.5-turbo',
        is_active: 1
      }

      const originalFindOne = dbService.findOne
      const originalFindMany = dbService.findMany
      const originalGetCurrentLocalISOString = DateUtils.getCurrentLocalISOString
      
      dbService.findOne = jest.fn()
        .mockResolvedValueOnce(mockProject) // 项目查询
        .mockResolvedValueOnce(mockConfig)  // AI配置查询
      dbService.findMany = jest.fn()
        .mockResolvedValueOnce([]) // milestones
        .mockResolvedValueOnce([]) // logs
      DateUtils.getCurrentLocalISOString = jest.fn().mockReturnValue('2024-01-15T10:00:00.000Z')
      
      // Mock initOpenAI方法，避免真实的API调用
      const originalInitOpenAI = aiApi.initOpenAI
      aiApi.initOpenAI = jest.fn().mockImplementation(() => {
        aiApi.openaiAPI = {
          chatCompletion: jest.fn().mockResolvedValue({
            content: '你好！我是你的项目管理助手',
            usage: { totalTokens: 20 }
          })
        }
        aiApi.isConfigured = true
        return aiApi.openaiAPI
      })

      const result = await aiApi.chatWithProject(projectId, message, chatHistory)

      expect(result.content).toBe('你好！我是你的项目管理助手')
      expect(result.timestamp).toBe('2024-01-15T10:00:00.000Z')
      
      // 恢复原始方法
      dbService.findOne = originalFindOne
      dbService.findMany = originalFindMany
      DateUtils.getCurrentLocalISOString = originalGetCurrentLocalISOString
      aiApi.initOpenAI = originalInitOpenAI
    })
  })

  describe('错误处理', () => {
    it('应该能够处理数据库操作失败', async () => {
      const originalFindMany = dbService.findMany
      dbService.findMany = jest.fn().mockRejectedValue(new Error('数据库错误'))

      const result = await aiApi.getAIConfigList(1)

      expect(result).toEqual([])
      
      // 恢复原始方法
      dbService.findMany = originalFindMany
    })

    it('应该能够处理配置保存失败', async () => {
      const config = { provider: 'openai', api_key: 'test-key' }
      
      const originalInsert = dbService.insert
      dbService.insert = jest.fn().mockRejectedValue(new Error('数据库错误'))

      await expect(aiApi.addAIConfig(config, 1)).rejects.toThrow('数据库错误')
      
      // 恢复原始方法
      dbService.insert = originalInsert
    })
  })
})
