/**
 * 收藏管理 API 单元测试
 * 测试收藏的增删改查功能，支持项目和知识的收藏
 */

// Mock 依赖
jest.mock('@/utils/dbService.js')
jest.mock('@/api/projectApi.js')
jest.mock('@/api/knowledgeApi.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')

import favoriteApi from '@/api/favoriteApi.js'
import dbService from '@/utils/dbService.js'
import projectApi from '@/api/projectApi.js'
import knowledgeApi from '@/api/knowledgeApi.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'

describe('收藏管理 API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    userStore.getCurrentUserId.mockReturnValue(1)
  })

  describe('添加收藏测试', () => {
    it('应该能够添加项目收藏', async () => {
      dbService.insert.mockResolvedValue(true)
      DateUtils.getCurrentLocalISOString.mockReturnValue('2024-01-01T10:00:00Z')

      const result = await favoriteApi.addFavorite('project', 1)

      expect(result).toBe(true)
      expect(dbService.insert).toHaveBeenCalledWith(
        'favorites',
        expect.objectContaining({
          user_id: 1,
          target_type: 'project',
          target_id: 1
        })
      )
    })

    it('应该能够添加知识收藏', async () => {
      dbService.insert.mockResolvedValue(true)

      const result = await favoriteApi.addFavorite('knowledge', 2)

      expect(result).toBe(true)
      expect(dbService.insert).toHaveBeenCalledWith(
        'favorites',
        expect.objectContaining({
          user_id: 1,
          target_type: 'knowledge',
          target_id: 2
        })
      )
    })

    it('应该能够处理重复收藏', async () => {
      dbService.insert.mockRejectedValue(new Error('UNIQUE constraint failed'))

      await expect(favoriteApi.addFavorite('project', 1)).rejects.toThrow('UNIQUE constraint failed')
    })
  })

  describe('取消收藏测试', () => {
    it('应该能够取消项目收藏', async () => {
      dbService.delete.mockResolvedValue(true)

      const result = await favoriteApi.removeFavorite('project', 1)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalledWith(
        'favorites',
        'user_id = ? AND target_type = ? AND target_id = ?',
        [1, 'project', 1]
      )
    })

    it('应该能够取消知识收藏', async () => {
      dbService.delete.mockResolvedValue(true)

      const result = await favoriteApi.removeFavorite('knowledge', 2)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalledWith(
        'favorites',
        'user_id = ? AND target_type = ? AND target_id = ?',
        [1, 'knowledge', 2]
      )
    })

    it('应该能够处理取消收藏失败', async () => {
      dbService.delete.mockRejectedValue(new Error('删除失败'))

      await expect(favoriteApi.removeFavorite('project', 1)).rejects.toThrow('删除失败')
    })
  })

  describe('收藏列表测试', () => {
    it('应该能够获取所有收藏列表', async () => {
      const mockFavorites = [
        { id: 1, target_type: 'project', target_id: 1, created_at: '2024-01-01T10:00:00Z' },
        { id: 2, target_type: 'knowledge', target_id: 2, created_at: '2024-01-01T11:00:00Z' }
      ]
      dbService.findMany.mockResolvedValue(mockFavorites)
      dbService.findOne
        .mockResolvedValueOnce({ id: 1, name: '项目1', description: '项目描述', status: 'active', progress: 50 })
        .mockResolvedValueOnce({ id: 2, title: '知识1', summary: '知识摘要' })

      const result = await favoriteApi.getFavoritesList()

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('type', 'project')
      expect(result[0]).toHaveProperty('title', '项目1')
      expect(result[0]).toHaveProperty('typeName', '项目')
      expect(result[1]).toHaveProperty('type', 'knowledge')
      expect(result[1]).toHaveProperty('title', '知识1')
      expect(result[1]).toHaveProperty('typeName', '知识')
      expect(dbService.findMany).toHaveBeenCalledWith(
        'favorites',
        'user_id = ?',
        [1],
        'created_at DESC'
      )
    })

    it('应该能够获取项目收藏列表', async () => {
      const mockProjectFavorites = [
        { id: 1, target_type: 'project', target_id: 1, created_at: '2024-01-01T10:00:00Z' }
      ]
      dbService.findMany.mockResolvedValue(mockProjectFavorites)
      dbService.findOne.mockResolvedValue({ id: 1, name: '项目1', description: '项目描述', status: 'active', progress: 50 })

      const result = await favoriteApi.getFavoritesList(1, 'project')

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('type', 'project')
      expect(result[0]).toHaveProperty('title', '项目1')
      expect(dbService.findMany).toHaveBeenCalledWith(
        'favorites',
        'user_id = ? AND target_type = ?',
        [1, 'project'],
        'created_at DESC'
      )
    })

    it('应该能够获取知识收藏列表', async () => {
      const mockKnowledgeFavorites = [
        { id: 2, target_type: 'knowledge', target_id: 2, created_at: '2024-01-01T11:00:00Z' }
      ]
      dbService.findMany.mockResolvedValue(mockKnowledgeFavorites)
      dbService.findOne.mockResolvedValue({ id: 2, title: '知识1', summary: '知识摘要' })

      const result = await favoriteApi.getFavoritesList(1, 'knowledge')

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('type', 'knowledge')
      expect(result[0]).toHaveProperty('title', '知识1')
      expect(dbService.findMany).toHaveBeenCalledWith(
        'favorites',
        'user_id = ? AND target_type = ?',
        [1, 'knowledge'],
        'created_at DESC'
      )
    })
  })

  describe('收藏状态检查测试', () => {
    it('应该能够检查项目是否已收藏', async () => {
      dbService.findOne.mockResolvedValue({ id: 1 })

      const result = await favoriteApi.isFavorite('project', 1)

      expect(result).toBe(true)
      expect(dbService.findOne).toHaveBeenCalledWith(
        'favorites',
        'user_id = ? AND target_type = ? AND target_id = ?',
        [1, 'project', 1]
      )
    })

    it('应该能够检查知识是否已收藏', async () => {
      dbService.findOne.mockResolvedValue(null)

      const result = await favoriteApi.isFavorite('knowledge', 2)

      expect(result).toBe(false)
      expect(dbService.findOne).toHaveBeenCalledWith(
        'favorites',
        'user_id = ? AND target_type = ? AND target_id = ?',
        [1, 'knowledge', 2]
      )
    })
  })

  describe('收藏统计测试', () => {
    it('应该能够获取收藏统计信息', async () => {
      const mockStats = {
        total: 10,
        project: 6,
        knowledge: 4
      }
      
      dbService.query
        .mockResolvedValueOnce([{ count: 10 }]) // 总收藏数
        .mockResolvedValueOnce([{ count: 6 }])  // 项目收藏数
        .mockResolvedValueOnce([{ count: 4 }])  // 知识收藏数

      const result = await favoriteApi.getFavoritesStats()

      expect(result).toEqual(mockStats)
      expect(dbService.query).toHaveBeenCalledTimes(3)
    })
  })

  describe('错误处理测试', () => {
    it('应该能够处理数据库连接失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('数据库连接失败'))

      await expect(favoriteApi.getFavoritesList()).rejects.toThrow('数据库连接失败')
    })

    it('应该能够处理查询失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('查询失败'))

      await expect(favoriteApi.getFavoritesList()).rejects.toThrow('查询失败')
    })

    it('应该能够处理无效的收藏类型', async () => {
      await expect(favoriteApi.addFavorite('invalid', 1)).rejects.toThrow('无效的收藏类型')
    })
  })
})
