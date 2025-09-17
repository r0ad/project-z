/**
 * 聊天 API 单元测试
 * 测试聊天相关的 API 功能
 */

// Mock 依赖
jest.mock('@/utils/dbService.js')

import chatApi from '@/api/chatApi.js'
import dbService from '@/utils/dbService.js'

describe('聊天 API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('对话管理', () => {
    it('应该能够创建对话', async () => {
      const params = {
        projectId: 1,
        type: 'project',
        title: '测试对话'
      }
      dbService.insert.mockResolvedValue(123)

      const result = await chatApi.createConversation(params)

      expect(result).toEqual({ id: 123, ...params })
      expect(dbService.insert).toHaveBeenCalledWith(
        'chat_conversations',
        expect.objectContaining({
          title: '测试对话',
          chat_type: 'project',
          project_id: 1
        })
      )
    })

    it('应该能够获取对话列表', async () => {
      const projectId = 1
      const mockConversations = [
        { id: 1, title: '对话1', chat_type: 'project' },
        { id: 2, title: '对话2', chat_type: 'project' }
      ]
      dbService.query.mockResolvedValue(mockConversations)

      const result = await chatApi.getConversations(projectId)

      expect(result).toEqual(mockConversations)
      expect(dbService.query).toHaveBeenCalledWith(
        'SELECT * FROM chat_conversations WHERE project_id = ? ORDER BY updated_at DESC',
        [projectId]
      )
    })

    it('应该能够删除对话', async () => {
      const conversationId = 1
      dbService.delete.mockResolvedValue(true)

      const result = await chatApi.deleteConversation(conversationId)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalledWith(
        'chat_messages',
        'conversation_id = ?',
        [conversationId]
      )
      expect(dbService.delete).toHaveBeenCalledWith(
        'chat_conversations',
        'id = ?',
        [conversationId]
      )
    })
  })

  describe('消息管理', () => {
    it('应该能够添加消息', async () => {
      const params = {
        conversationId: 1,
        role: 'user',
        content: '测试消息'
      }
      dbService.insert.mockResolvedValue(456)

      const result = await chatApi.addMessage(params)

      expect(result).toBe(456)
      expect(dbService.insert).toHaveBeenCalledWith(
        'chat_messages',
        expect.objectContaining({
          conversation_id: 1,
          role: 'user',
          content: '测试消息'
        })
      )
    })

    it('应该能够获取消息历史', async () => {
      const conversationId = 1
      const mockMessages = [
        { id: 1, content: '消息1', role: 'user', metadata: null },
        { id: 2, content: '消息2', role: 'assistant', metadata: null }
      ]
      dbService.query.mockResolvedValue(mockMessages)

      const result = await chatApi.getMessages(conversationId)

      expect(result).toEqual(mockMessages)
      expect(dbService.query).toHaveBeenCalledWith(
        'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT ?',
        [conversationId, 50]
      )
    })

    it('应该能够保存消息', async () => {
      const conversationId = 1
      const role = 'user'
      const content = '测试消息'
      dbService.insert.mockResolvedValue(789)

      const result = await chatApi.saveMessage(conversationId, role, content)

      expect(result).toBe(789)
      expect(dbService.insert).toHaveBeenCalledWith(
        'chat_messages',
        expect.objectContaining({
          conversation_id: conversationId,
          role: role,
          content: content
        })
      )
    })
  })

  describe('AI 统计', () => {
    it('应该能够获取 AI 统计数据', async () => {
      const mockStats = {
        todayChats: 5,
        totalAnalysis: 100
      }
      dbService.query
        .mockResolvedValueOnce([{ count: 5 }]) // 今日对话
        .mockResolvedValueOnce([{ count: 100 }]) // 总分析数

      const result = await chatApi.getAIStats()

      expect(result).toEqual(mockStats)
      expect(dbService.query).toHaveBeenCalledTimes(2)
    })
  })

  describe('错误处理', () => {
    it('应该能够处理数据库操作失败', async () => {
      const params = { projectId: 1, title: '测试' }
      dbService.insert.mockRejectedValue(new Error('数据库错误'))

      await expect(chatApi.createConversation(params)).rejects.toThrow('数据库错误')
    })

    it('应该能够处理获取对话失败', async () => {
      const projectId = 1
      dbService.query.mockRejectedValue(new Error('查询失败'))

      const result = await chatApi.getConversations(projectId)

      expect(result).toEqual([])
    })
  })
})
