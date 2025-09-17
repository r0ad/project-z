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
    // Mock dbService 初始化状态
    dbService.isInitialized = true
    dbService.initDB = jest.fn().mockResolvedValue(true)
    // Mock DateUtils
    DateUtils.getCurrentLocalISOString.mockReturnValue('2024-01-01T10:00:00Z')
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

      const result = await knowledgeApi.createKnowledge(knowledgeData)

      expect(result.success).toBe(true)
      expect(result.data.id).toBe(123)
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

    it('应该能够创建带项目关联的知识', async () => {
      const knowledgeData = {
        title: '测试知识',
        content: '详细内容',
        project_name: '测试项目'
      }
      
      dbService.insert.mockResolvedValue(456)
      dbService.findOne.mockResolvedValue({ id: 1, name: '测试项目' })
      dbService.insert.mockResolvedValue(456) // 项目关联插入

      const result = await knowledgeApi.createKnowledge(knowledgeData)

      expect(result.data.id).toBe(456)
      expect(dbService.findOne).toHaveBeenCalledWith('projects', 'name = ?', ['测试项目'])
    })

    it('应该能够处理创建失败', async () => {
      const knowledgeData = { 
        title: '测试知识',
        content: '详细内容'
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
      dbService.executeSql.mockResolvedValue(true) // 模拟增加浏览量

      const result = await knowledgeApi.getKnowledgeDetail(1)

      expect(result).toHaveProperty('tags')
      expect(result).toHaveProperty('updateTime')
      expect(result).toHaveProperty('relatedProjects')
      expect(result).toHaveProperty('project_name')
      expect(dbService.findOne).toHaveBeenCalledWith(
        'knowledge_base',
        'id = ? AND user_id = ?',
        [1, 1]
      )
    })

    it('应该能够处理知识不存在的情况', async () => {
      dbService.findOne.mockResolvedValue(null)

      await expect(knowledgeApi.getKnowledgeDetail(999)).rejects.toThrow('知识不存在')
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
        expect.objectContaining({
          title: '更新后的标题',
          content: '更新后的内容',
          updated_at: '2024-01-01T10:00:00Z'
        }),
        'id = ? AND user_id = ?',
        [1, 1]
      )
    })

    it('应该能够更新带项目关联的知识', async () => {
      const updateData = {
        title: '更新后的标题',
        project_name: '新项目'
      }
      dbService.update.mockResolvedValue(true)
      dbService.delete.mockResolvedValue(true) // 清除现有关联
      dbService.findOne.mockResolvedValue({ id: 2, name: '新项目' })
      dbService.insert.mockResolvedValue(789) // 新关联

      const result = await knowledgeApi.updateKnowledge(1, updateData)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalledWith('project_knowledge_mappings', 'knowledge_id = ?', [1])
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
      expect(dbService.delete).toHaveBeenCalledWith('knowledge_tag_mappings', 'knowledge_id = ?', [1])
      expect(dbService.delete).toHaveBeenCalledWith('project_knowledge_mappings', 'knowledge_id = ?', [1])
      expect(dbService.delete).toHaveBeenCalledWith('favorites', 'target_type = ? AND target_id = ?', ['knowledge', 1])
      expect(dbService.delete).toHaveBeenCalledWith('knowledge_base', 'id = ? AND user_id = ?', [1, 1])
    })

    it('应该能够处理删除失败', async () => {
      dbService.delete.mockRejectedValue(new Error('删除失败'))

      await expect(knowledgeApi.deleteKnowledge(1)).rejects.toThrow('删除失败')
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
        updated_at: '2024-01-01T00:00:00.000Z'
      }]
      dbService.findMany.mockResolvedValue(mockResults)
      dbService.query.mockResolvedValue([]) // 模拟标签查询

      const result = await knowledgeApi.searchKnowledge('搜索词')

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('tags')
      expect(result[0]).toHaveProperty('updateTime')
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

    it('应该能够确保标签存在', async () => {
      dbService.findOne.mockResolvedValue(null) // 标签不存在
      dbService.insert.mockResolvedValue(123) // 创建新标签

      const result = await knowledgeApi.ensureTagExists('新标签')

      expect(result).toBe(123)
      expect(dbService.insert).toHaveBeenCalledWith(
        'knowledge_tags',
        expect.objectContaining({
          name: '新标签'
        })
      )
    })

    it('应该能够获取所有标签', async () => {
      const mockTags = [
        { id: 1, name: '技术' },
        { id: 2, name: 'API' }
      ]
      dbService.findMany.mockResolvedValue(mockTags)

      const result = await knowledgeApi.getAllTags()

      expect(result).toEqual(mockTags)
      expect(dbService.findMany).toHaveBeenCalledWith(
        'knowledge_tags',
        '1=1',
        [],
        'name ASC'
      )
    })

    it('应该能够获取热门标签', async () => {
      const mockTags = [
        { name: '技术', usage_count: 10 },
        { name: 'API', usage_count: 5 }
      ]
      dbService.query.mockResolvedValue(mockTags)

      const result = await knowledgeApi.getPopularTags(10)

      expect(result).toEqual(mockTags)
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT kt.name, COUNT(ktm.id) as usage_count'),
        [10]
      )
    })
  })

  describe('项目关联测试', () => {
    it('应该能够获取关联项目', async () => {
      const mockProjects = [
        { id: 1, name: '项目1', description: '描述1', status: 'active' }
      ]
      dbService.query.mockResolvedValue(mockProjects)

      const result = await knowledgeApi.getRelatedProjects(1)

      expect(result).toEqual(mockProjects)
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT p.id, p.name, p.description, p.status'),
        [1]
      )
    })

    it('应该能够获取所有可关联的项目', async () => {
      const mockProjects = [
        { id: 1, name: '项目1', description: '描述1', status: 'active' }
      ]
      dbService.query.mockResolvedValue(mockProjects)

      const result = await knowledgeApi.getAllProjects()

      expect(result).toEqual(mockProjects)
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, description, status'),
        [1]
      )
    })

    it('应该能够关联项目', async () => {
      dbService.findOne.mockResolvedValue(null) // 未关联
      dbService.insert.mockResolvedValue(123)

      const result = await knowledgeApi.linkProject(1, 2)

      expect(result).toBe(true)
      expect(dbService.insert).toHaveBeenCalledWith(
        'project_knowledge_mappings',
        expect.objectContaining({
          knowledge_id: 1,
          project_id: 2
        })
      )
    })

    it('应该能够取消项目关联', async () => {
      dbService.delete.mockResolvedValue(true)

      const result = await knowledgeApi.unlinkProject(1, 2)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalledWith(
        'project_knowledge_mappings',
        'knowledge_id = ? AND project_id = ?',
        [1, 2]
      )
    })
  })

  describe('收藏功能测试', () => {
    it('应该能够切换收藏状态', async () => {
      dbService.findOne.mockResolvedValue(null) // 未收藏
      dbService.insert.mockResolvedValue(123)

      const result = await knowledgeApi.toggleFavorite(1)

      expect(result).toBe(true)
      expect(dbService.insert).toHaveBeenCalledWith(
        'favorites',
        expect.objectContaining({
          user_id: 1,
          target_type: 'knowledge',
          target_id: 1
        })
      )
    })

    it('应该能够获取收藏的知识列表', async () => {
      const mockFavorites = [
        { id: 1, title: '知识1', summary: '摘要1', favorite_time: '2024-01-01T10:00:00Z' }
      ]
      dbService.query
        .mockResolvedValueOnce(mockFavorites) // 收藏查询
        .mockResolvedValueOnce([]) // 标签查询

      const result = await knowledgeApi.getFavoriteKnowledge()

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('tags')
      expect(result[0]).toHaveProperty('updateTime')
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT kb.*, f.created_at as favorite_time'),
        [1]
      )
    })
  })

  describe('统计功能测试', () => {
    it('应该能够获取知识统计信息', async () => {
      dbService.count
        .mockResolvedValueOnce(10) // 总知识数
        .mockResolvedValueOnce(10) // 已发布知识数
      dbService.query.mockResolvedValue([{ total_views: 100 }]) // 总浏览量
      dbService.count.mockResolvedValueOnce(5) // 收藏数

      const result = await knowledgeApi.getKnowledgeStats()

      expect(result).toHaveProperty('totalCount', 10)
      expect(result).toHaveProperty('publishedCount', 10)
      expect(result).toHaveProperty('draftCount', 0)
      expect(result).toHaveProperty('totalViews', 100)
      expect(result).toHaveProperty('favoriteCount', 5)
      expect(result).toHaveProperty('categoryStats', [])
    })
  })

  describe('辅助方法测试', () => {
    it('应该能够生成摘要', () => {
      const content = '这是一个很长的内容，需要被截断到200个字符以内。'.repeat(10)
      const result = knowledgeApi.generateSummary(content)
      
      expect(result).toContain('...')
      expect(result.length).toBeLessThanOrEqual(203) // 200 + '...'
    })

    it('应该能够格式化更新时间', () => {
      const now = new Date()
      const oneMinuteAgo = new Date(now.getTime() - 30000) // 30秒前
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000) // 30分钟前
      const oneDayAgo = new Date(now.getTime() - 86400000) // 1天前

      expect(knowledgeApi.formatUpdateTime(oneMinuteAgo.toISOString())).toBe('刚刚')
      expect(knowledgeApi.formatUpdateTime(thirtyMinutesAgo.toISOString())).toMatch(/\d+分钟前/)
      expect(knowledgeApi.formatUpdateTime(oneDayAgo.toISOString())).toMatch(/\d+天前/)
    })
  })

  describe('错误处理测试', () => {
    it('应该能够处理数据库连接失败', async () => {
      dbService.isInitialized = false
      dbService.initDB.mockRejectedValue(new Error('数据库连接失败'))

      await expect(knowledgeApi.getKnowledgeList()).rejects.toThrow('数据库连接失败')
    })

    it('应该能够处理查询失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('查询失败'))

      await expect(knowledgeApi.getKnowledgeList()).rejects.toThrow('查询失败')
    })

    it('应该能够处理删除失败', async () => {
      dbService.delete.mockRejectedValue(new Error('删除失败'))

      await expect(knowledgeApi.deleteKnowledge(1)).rejects.toThrow('删除失败')
    })
  })
})
