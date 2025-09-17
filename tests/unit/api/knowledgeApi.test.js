/**
 * 知识库管理 API 单元测试
 * 测试知识库的增删改查、标签管理、项目关联等功能
 */

// Mock 依赖
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')

import knowledgeApi from '@/api/knowledgeApi.js'
import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'

describe('知识库管理 API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    userStore.getCurrentUserId.mockReturnValue(1)
  })

  describe('知识库创建测试', () => {
    it('应该能够创建知识库条目', async () => {
      const knowledgeData = {
        title: '测试知识',
        summary: '这是一个测试知识',
        content: '详细内容',
        tags: ['测试', 'API']
      }
      
      dbService.insert.mockResolvedValue(123)
      dbService.query.mockResolvedValue([]) // 模拟标签查询返回空数组
      DateUtils.getCurrentLocalISOString.mockReturnValue('2024-01-01T10:00:00Z')

      const result = await knowledgeApi.createKnowledge(knowledgeData)

      expect(result).toBe(123)
      expect(dbService.insert).toHaveBeenCalledWith(
        'knowledge_base',
        expect.objectContaining({
          title: '测试知识',
          summary: '这是一个测试知识',
          content: '详细内容',
          user_id: 1,
          view_count: 0
        })
      )
    })

    it('应该能够处理创建失败', async () => {
      const knowledgeData = { 
        title: '测试知识',
        content: '详细内容' // 添加必需的 content 字段
      }
      dbService.insert.mockRejectedValue(new Error('数据库错误'))

      await expect(knowledgeApi.createKnowledge(knowledgeData)).rejects.toThrow('数据库错误')
    })

    it('应该能够处理缺少必填字段', async () => {
      const knowledgeData = { 
        title: '测试知识'
        // 缺少 content 字段
      }

      await expect(knowledgeApi.createKnowledge(knowledgeData)).rejects.toThrow('标题和内容不能为空')
    })
  })

  describe('知识库查询测试', () => {
    it('应该能够获取知识库列表', async () => {
      const mockKnowledgeList = [
        { id: 1, title: '知识1', updated_at: '2024-01-01T10:00:00Z' },
        { id: 2, title: '知识2', updated_at: '2024-01-01T11:00:00Z' }
      ]
      dbService.findMany.mockResolvedValue(mockKnowledgeList)
      dbService.query.mockResolvedValue([]) // 模拟标签查询

      const result = await knowledgeApi.getKnowledgeList()

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('tags')
      expect(result[0]).toHaveProperty('updateTime')
      expect(result[0]).toHaveProperty('viewCount')
      expect(result[0]).toHaveProperty('ai_score')
      expect(result[0]).toHaveProperty('category', 'other')
      expect(dbService.findMany).toHaveBeenCalledWith(
        'knowledge_base',
        'user_id = ?',
        [1],
        'updated_at DESC',
        '50 OFFSET 0'
      )
    })

    it('应该能够根据关键词搜索知识库', async () => {
      const mockResults = [{ id: 1, title: '包含关键词的知识', updated_at: '2024-01-01T10:00:00Z' }]
      dbService.findMany.mockResolvedValue(mockResults)
      dbService.query.mockResolvedValue([]) // 模拟标签查询

      const result = await knowledgeApi.getKnowledgeList({ keyword: '关键词' })

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('tags')
      expect(dbService.findMany).toHaveBeenCalledWith(
        'knowledge_base',
        'user_id = ? AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)',
        [1, '%关键词%', '%关键词%', '%关键词%'],
        'updated_at DESC',
        '50 OFFSET 0'
      )
    })

    it('应该能够获取知识库详情', async () => {
      const mockKnowledge = {
        id: 1,
        title: '测试知识',
        content: '详细内容',
        updated_at: '2024-01-01T10:00:00Z'
      }
      dbService.findOne.mockResolvedValue(mockKnowledge)
      dbService.query.mockResolvedValue([]) // 模拟标签查询

      const result = await knowledgeApi.getKnowledgeDetail(1)

      expect(result).toHaveProperty('tags')
      expect(result).toHaveProperty('updateTime')
      expect(dbService.findOne).toHaveBeenCalledWith(
        'knowledge_base',
        'id = ? AND user_id = ?',
        [1, 1]
      )
    })
  })

  describe('知识库更新测试', () => {
    it('应该能够更新知识库条目', async () => {
      const updateData = {
        title: '更新后的标题',
        content: '更新后的内容'
      }
      dbService.update.mockResolvedValue(true)

      const result = await knowledgeApi.updateKnowledge(1, updateData)

      expect(result).toBe(true)
      expect(dbService.update).toHaveBeenCalledWith(
        'knowledge_base',
        expect.objectContaining(updateData),
        'id = ? AND user_id = ?',
        [1, 1]
      )
    })

    it('应该能够处理更新失败', async () => {
      const updateData = { title: '新标题' }
      dbService.update.mockRejectedValue(new Error('更新失败'))

      await expect(knowledgeApi.updateKnowledge(1, updateData)).rejects.toThrow('更新失败')
    })
  })

  describe('知识库删除测试', () => {
    it('应该能够删除知识库条目', async () => {
      dbService.delete.mockResolvedValue(true)

      const result = await knowledgeApi.deleteKnowledge(1)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalledWith(
        'knowledge_base',
        'id = ? AND user_id = ?',
        [1, 1]
      )
    })
  })

  describe('知识库搜索测试', () => {
    it('应该能够执行全文搜索', async () => {
      const mockResults = [{ 
        id: 1, 
        title: '包含关键词的知识',
        summary: '这是测试摘要',
        content: '这是测试内容',
        user_id: 1,
        view_count: 5,
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
        tags: ['技术', 'API'],
        updateTime: '1天前',
        viewCount: 5,
        ai_score: 0,
        aiScore: 0,
        keyPoints: [],
        category: 'other'
      }]
      dbService.findMany.mockResolvedValue(mockResults)
      dbService.query.mockResolvedValue([]) // 模拟标签查询

      const result = await knowledgeApi.searchKnowledge('搜索词')

      expect(result).toEqual(mockResults)
      expect(dbService.findMany).toHaveBeenCalledWith(
        'knowledge_base',
        'user_id = ? AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)',
        [1, '%搜索词%', '%搜索词%', '%搜索词%'],
        'updated_at DESC',
        '20 OFFSET 0'
      )
    })

    it('应该能够按分类筛选', async () => {
      const mockResults = [{ id: 1, category: '技术' }]
      dbService.findMany.mockResolvedValue(mockResults)
      dbService.query.mockResolvedValue([]) // 模拟标签查询

      const result = await knowledgeApi.getKnowledgeList({ category: '技术' })

      expect(result).toEqual(mockResults)
    })
  })

  describe('标签管理测试', () => {
    it('应该能够更新知识库标签', async () => {
      const tags = ['技术', 'API']
      dbService.delete.mockResolvedValue(true)
      dbService.findOne.mockResolvedValue({ id: 1 })
      dbService.insert.mockResolvedValue(1)

      const result = await knowledgeApi.updateKnowledgeTags(1, tags)

      expect(result).toBeUndefined() // 实际方法没有返回值
      expect(dbService.delete).toHaveBeenCalledWith(
        'knowledge_tag_mappings',
        'knowledge_id = ?',
        [1]
      )
    })

    it('应该能够获取知识库标签', async () => {
      const mockTags = [
        { name: '技术' },
        { name: 'API' }
      ]
      dbService.query.mockResolvedValue(mockTags)

      const result = await knowledgeApi.getKnowledgeTags(1)

      expect(result).toEqual(['技术', 'API']) // 实际返回标签名称数组
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT kt.name'),
        [1]
      )
    })
  })

  describe('错误处理测试', () => {
    it('应该能够处理数据库连接失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('数据库连接失败'))

      await expect(knowledgeApi.getKnowledgeList()).rejects.toThrow('数据库连接失败')
    })

    it('应该能够处理查询失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('查询失败'))

      await expect(knowledgeApi.getKnowledgeList()).rejects.toThrow('查询失败')
    })
  })
})
