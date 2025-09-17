/**
 * 日志管理 API 单元测试
 * 测试项目日志的增删改查功能
 */

// Mock 依赖
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')

import logApi from '@/api/logApi.js'
import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'

describe('日志管理 API 测试', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    userStore.getCurrentUserId.mockReturnValue(1)
  })

  describe('日志记录测试', () => {
    it('应该能够创建项目日志', async () => {
      const logData = {
        logType: 'milestone',
        content: '项目第一阶段开发完成'
      }
      
      dbService.findOne.mockResolvedValue({ id: 1, name: '测试项目' }) // 模拟项目存在
      dbService.insert.mockResolvedValue(123)
      dbService.update.mockResolvedValue(true)
      DateUtils.getCurrentLocalISOString.mockReturnValue('2024-01-01T10:00:00Z')

      const result = await logApi.createLog(1, logData)

      expect(result).toEqual(expect.objectContaining({
        id: 1,
        name: '测试项目'
      }))
      expect(dbService.insert).toHaveBeenCalledWith(
        'project_logs',
        expect.objectContaining({
          project_id: 1,
          log_type: 'milestone',
          content: '项目第一阶段开发完成'
        })
      )
    })

    it('应该能够处理日志记录失败', async () => {
      const logData = { 
        content: '测试内容'
      }
      dbService.findOne.mockResolvedValue({ id: 1, name: '测试项目' })
      dbService.insert.mockRejectedValue(new Error('数据库错误'))

      await expect(logApi.createLog(1, logData)).rejects.toThrow('数据库错误')
    })

    it('应该能够处理缺少日志内容', async () => {
      const logData = { 
        logType: 'milestone'
        // 缺少 content 字段
      }

      await expect(logApi.createLog(1, logData)).rejects.toThrow('日志内容不能为空')
    })

    it('应该能够处理项目不存在', async () => {
      const logData = { 
        content: '测试内容'
      }
      dbService.findOne.mockResolvedValue(null) // 项目不存在

      await expect(logApi.createLog(1, logData)).rejects.toThrow('项目不存在')
    })
  })

  describe('日志查询测试', () => {
    it('应该能够获取项目日志列表', async () => {
      const mockLogs = [
        { id: 1, title: '日志1', log_type: 'milestone', created_at: '2024-01-01T10:00:00Z' },
        { id: 2, title: '日志2', log_type: 'task', created_at: '2024-01-01T11:00:00Z' }
      ]
      dbService.findMany.mockResolvedValue(mockLogs)
      DateUtils.formatDateTime.mockReturnValue('2024-01-01 10:00')

      const result = await logApi.getProjectLogs(1)

      expect(result).toHaveLength(2)
      expect(dbService.findMany).toHaveBeenCalledWith(
        'project_logs',
        'project_id = ?',
        [1],
        'created_at DESC',
        '20 OFFSET 0'
      )
    })

    it('应该能够根据日志类型筛选', async () => {
      const mockLogs = [{ id: 1, title: '里程碑日志', log_type: 'milestone', created_at: '2024-01-01T10:00:00Z' }]
      dbService.findMany.mockResolvedValue(mockLogs)
      DateUtils.formatDateTime.mockReturnValue('2024-01-01 10:00')

      const result = await logApi.getProjectLogs(1, { logType: 'milestone' })

      expect(result).toHaveLength(1)
      expect(dbService.findMany).toHaveBeenCalledWith(
        'project_logs',
        'project_id = ? AND log_type = ?',
        [1, 'milestone'],
        'created_at DESC',
        '20 OFFSET 0'
      )
    })
  })

  describe('日志删除测试', () => {
    it('应该能够删除项目日志', async () => {
      dbService.findOne.mockResolvedValue({ id: 1, title: '测试日志' }) // 模拟日志存在
      dbService.delete.mockResolvedValue(true)

      const result = await logApi.deleteLog(1)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalledWith(
        'project_logs',
        'id = ?',
        [1]
      )
    })
  })

  describe('日志统计测试', () => {
    it('应该能够获取项目日志统计', async () => {
      const mockStats = {
        totalLogs: 50,
        problemLogs: 10,
        recentWeekLogs: 30,
        byType: { 'undefined': 50 }
      }
      
      dbService.count.mockResolvedValue(50) // 总日志数
      dbService.query
        .mockResolvedValueOnce([{ log_type: 'undefined', count: 50 }])    // 各类型日志数
        .mockResolvedValueOnce([{ count: 30 }])    // 最近一周日志数
        .mockResolvedValueOnce([{ count: 10 }])    // 问题日志数

      const result = await logApi.getLogStats(1)

      expect(result).toEqual(mockStats)
      expect(dbService.count).toHaveBeenCalledWith('project_logs', 'project_id = ?', [1])
      expect(dbService.query).toHaveBeenCalledTimes(3)
    })
  })

  describe('错误处理测试', () => {
    it('应该能够处理数据库连接失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('数据库连接失败'))

      await expect(logApi.getProjectLogs(1)).rejects.toThrow('数据库连接失败')
    })

    it('应该能够处理查询失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('查询失败'))

      await expect(logApi.getProjectLogs(1)).rejects.toThrow('查询失败')
    })

    it('应该能够处理删除失败', async () => {
      dbService.delete.mockRejectedValue(new Error('删除失败'))

      await expect(logApi.deleteLog(1)).rejects.toThrow('删除失败')
    })
  })
})
