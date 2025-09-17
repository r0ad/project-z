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
    // Mock dbService 初始化状态
    dbService.isInitialized = true
    dbService.initDB = jest.fn().mockResolvedValue(true)
    // Mock DateUtils
    DateUtils.getCurrentLocalISOString.mockReturnValue('2024-01-01T10:00:00Z')
    DateUtils.formatDateTime.mockReturnValue('2024-01-01 10:00')
  })

  describe('日志记录测试', () => {
    it('应该能够创建项目日志', async () => {
      const logData = {
        content: '项目第一阶段开发完成',
        progressText: '完成了用户界面设计',
        problemText: '遇到了一些技术难题',
        planText: '下一步进行后端开发',
        logType: 'manual'
      }
      
      dbService.findOne.mockResolvedValue({ id: 1, name: '测试项目' }) // 模拟项目存在
      dbService.insert.mockResolvedValue(123)
      dbService.update.mockResolvedValue(true)

      const result = await logApi.createLog(1, logData)

      expect(result).toHaveProperty('id', 1)
      expect(result).toHaveProperty('created_at', '2024-01-01 10:00')
      expect(dbService.insert).toHaveBeenCalledWith(
        'project_logs',
        expect.objectContaining({
          project_id: 1,
          content: '项目第一阶段开发完成',
          progress_text: '完成了用户界面设计',
          problem_text: '遇到了一些技术难题',
          plan_text: '下一步进行后端开发',
          log_type: 'manual'
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
        { 
          id: 1, 
          content: '日志1', 
          log_type: 'milestone', 
          created_at: '2024-01-01T10:00:00Z',
          progress_text: '进展1',
          problem_text: null,
          plan_text: null
        },
        { 
          id: 2, 
          content: '日志2', 
          log_type: 'task', 
          created_at: '2024-01-01T11:00:00Z',
          progress_text: null,
          problem_text: '问题2',
          plan_text: '计划2'
        }
      ]
      dbService.findMany.mockResolvedValue(mockLogs)

      const result = await logApi.getProjectLogs(1)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('hasProgress', true)
      expect(result[0]).toHaveProperty('hasProblem', false)
      expect(result[0]).toHaveProperty('hasPlan', false)
      expect(result[1]).toHaveProperty('hasProgress', false)
      expect(result[1]).toHaveProperty('hasProblem', true)
      expect(result[1]).toHaveProperty('hasPlan', true)
      expect(dbService.findMany).toHaveBeenCalledWith(
        'project_logs',
        'project_id = ?',
        [1],
        'created_at DESC',
        '20 OFFSET 0'
      )
    })

    it('应该能够根据日志类型筛选', async () => {
      const mockLogs = [{ 
        id: 1, 
        content: '里程碑日志', 
        log_type: 'milestone', 
        created_at: '2024-01-01T10:00:00Z',
        progress_text: null,
        problem_text: null,
        plan_text: null
      }]
      dbService.findMany.mockResolvedValue(mockLogs)

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

    it('应该能够获取日志详情', async () => {
      const mockLog = {
        id: 1,
        content: '测试日志',
        created_at: '2024-01-01T10:00:00Z'
      }
      dbService.findOne.mockResolvedValue(mockLog)

      const result = await logApi.getLogDetail(1)

      expect(result).toHaveProperty('created_at', '2024-01-01 10:00')
      expect(dbService.findOne).toHaveBeenCalledWith('project_logs', 'id = ?', [1])
    })

    it('应该能够处理日志不存在', async () => {
      dbService.findOne.mockResolvedValue(null)

      await expect(logApi.getLogDetail(999)).rejects.toThrow('日志不存在')
    })
  })

  describe('日志更新测试', () => {
    it('应该能够更新日志', async () => {
      const updateData = {
        content: '更新后的内容',
        progressText: '新的进展'
      }
      const mockLog = { id: 1, project_id: 1, content: '原内容' }
      
      dbService.findOne.mockResolvedValue(mockLog)
      dbService.update.mockResolvedValue(true)
      dbService.findOne.mockResolvedValue({ ...mockLog, ...updateData })

      const result = await logApi.updateLog(1, updateData)

      expect(result).toHaveProperty('created_at', '2024-01-01 10:00')
      expect(dbService.update).toHaveBeenCalledWith('project_logs', updateData, 'id = ?', [1])
    })

    it('应该能够处理更新不存在的日志', async () => {
      dbService.findOne.mockResolvedValue(null)

      await expect(logApi.updateLog(999, {})).rejects.toThrow('日志不存在')
    })
  })

  describe('日志删除测试', () => {
    it('应该能够删除项目日志', async () => {
      const mockLog = { id: 1, project_id: 1, content: '测试日志' }
      dbService.findOne.mockResolvedValue(mockLog)
      dbService.delete.mockResolvedValue(true)
      dbService.update.mockResolvedValue(true)

      const result = await logApi.deleteLog(1)

      expect(result).toBe(true)
      expect(dbService.delete).toHaveBeenCalledWith('project_logs', 'id = ?', [1])
    })

    it('应该能够处理删除不存在的日志', async () => {
      dbService.findOne.mockResolvedValue(null)

      await expect(logApi.deleteLog(999)).rejects.toThrow('日志不存在')
    })
  })

  describe('最近日志测试', () => {
    it('应该能够获取最近的日志', async () => {
      const mockLogs = [
        { 
          id: 1, 
          content: '最近日志1', 
          progress_text: '进展1',
          problem_text: '问题1',
          plan_text: '计划1',
          created_at: '2024-01-01T10:00:00Z',
          log_type: 'manual'
        }
      ]
      dbService.findMany.mockResolvedValue(mockLogs)

      const result = await logApi.getRecentLogs(1, 3)

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('progressText', '进展1')
      expect(result[0]).toHaveProperty('problemText', '问题1')
      expect(result[0]).toHaveProperty('planText', '计划1')
      expect(dbService.findMany).toHaveBeenCalledWith(
        'project_logs',
        'project_id = ?',
        [1],
        'created_at DESC',
        '3'
      )
    })
  })

  describe('日志搜索测试', () => {
    it('应该能够搜索日志', async () => {
      const mockLogs = [
        { 
          id: 1, 
          content: '包含关键词的日志', 
          created_at: '2024-01-01T10:00:00Z',
          progress_text: null,
          problem_text: null,
          plan_text: null
        }
      ]
      dbService.findMany.mockResolvedValue(mockLogs)

      const result = await logApi.searchLogs(1, '关键词')

      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('hasProgress', false)
      expect(dbService.findMany).toHaveBeenCalledWith(
        'project_logs',
        expect.stringContaining('project_id = ? AND ('),
        expect.arrayContaining([1, '%关键词%', '%关键词%', '%关键词%', '%关键词%']),
        'created_at DESC',
        '20 OFFSET 0'
      )
    })

    it('应该能够处理空关键词搜索', async () => {
      const mockLogs = [{ id: 1, content: '日志1' }]
      dbService.findMany.mockResolvedValue(mockLogs)

      const result = await logApi.searchLogs(1, '')

      expect(result).toHaveLength(1)
      expect(dbService.findMany).toHaveBeenCalledWith(
        'project_logs',
        'project_id = ?',
        [1],
        'created_at DESC',
        '20 OFFSET 0'
      )
    })
  })

  describe('日志统计测试', () => {
    it('应该能够获取项目日志统计', async () => {
      const mockStats = {
        totalLogs: 50,
        problemLogs: 10,
        recentWeekLogs: 30,
        byType: { 'manual': 30, 'ai': 20 }
      }
      
      dbService.count.mockResolvedValue(50) // 总日志数
      dbService.query
        .mockResolvedValueOnce([{ log_type: 'manual', count: 30 }, { log_type: 'ai', count: 20 }]) // 各类型日志数
        .mockResolvedValueOnce([{ count: 30 }])    // 最近一周日志数
        .mockResolvedValueOnce([{ count: 10 }])    // 问题日志数

      const result = await logApi.getLogStats(1)

      expect(result).toEqual(mockStats)
      expect(dbService.count).toHaveBeenCalledWith('project_logs', 'project_id = ?', [1])
      expect(dbService.query).toHaveBeenCalledTimes(3)
    })
  })

  describe('日志时间线测试', () => {
    it('应该能够获取日志时间线数据', async () => {
      const mockTimeline = [
        { log_date: '2024-01-01', log_count: 5, log_ids: '1,2,3,4,5' },
        { log_date: '2024-01-02', log_count: 3, log_ids: '6,7,8' }
      ]
      dbService.query.mockResolvedValue(mockTimeline)

      const result = await logApi.getLogTimeline(1, 30)

      expect(result).toHaveLength(2)
      expect(result[0]).toHaveProperty('date', '2024-01-01')
      expect(result[0]).toHaveProperty('count', 5)
      expect(result[0]).toHaveProperty('logIds', [1, 2, 3, 4, 5])
      expect(dbService.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [1]
      )
    })
  })

  describe('批量创建日志测试', () => {
    it('应该能够批量创建日志', async () => {
      const logsData = [
        { content: '日志1', logType: 'manual' },
        { content: '日志2', logType: 'ai' }
      ]
      
      dbService.findOne.mockResolvedValue({ id: 1, name: '测试项目' })
      dbService.insert
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(2)
      dbService.update.mockResolvedValue(true)

      const result = await logApi.batchCreateLogs(1, logsData)

      expect(result).toHaveLength(2)
      expect(dbService.insert).toHaveBeenCalledTimes(2)
    })
  })

  describe('错误处理测试', () => {
    it('应该能够处理数据库连接失败', async () => {
      dbService.isInitialized = false
      dbService.initDB.mockRejectedValue(new Error('数据库连接失败'))

      await expect(logApi.getProjectLogs(1)).rejects.toThrow('数据库连接失败')
    })

    it('应该能够处理查询失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('查询失败'))

      await expect(logApi.getProjectLogs(1)).rejects.toThrow('查询失败')
    })

    it('应该能够处理删除失败', async () => {
      const mockLog = { id: 1, project_id: 1 }
      dbService.findOne.mockResolvedValue(mockLog)
      dbService.delete.mockRejectedValue(new Error('删除失败'))

      await expect(logApi.deleteLog(1)).rejects.toThrow('删除失败')
    })

    it('应该能够处理更新失败', async () => {
      const mockLog = { id: 1, project_id: 1 }
      dbService.findOne.mockResolvedValue(mockLog)
      dbService.update.mockRejectedValue(new Error('更新失败'))

      await expect(logApi.updateLog(1, {})).rejects.toThrow('更新失败')
    })
  })
})
