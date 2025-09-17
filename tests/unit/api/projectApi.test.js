/**
 * 项目管理 API 测试 (P0 核心功能)
 * 测试项目创建、查询、更新、删除等核心功能
 */

// Mock 依赖
jest.mock('@/utils/dbService.js')
jest.mock('@/utils/userStore.js')
jest.mock('@/utils/dateUtils.js')

import projectApi from '@/api/projectApi.js'
import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'

describe('项目管理 API 测试 (P0)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock dbService
    dbService.isInitialized = true
    dbService.initDB = jest.fn().mockResolvedValue(true)
    dbService.findMany = jest.fn()
    dbService.findOne = jest.fn()
    dbService.insert = jest.fn()
    dbService.update = jest.fn()
    dbService.delete = jest.fn()
    dbService.query = jest.fn()
    dbService.count = jest.fn()
    dbService.executeSql = jest.fn()
    
    // Mock userStore
    userStore.getCurrentUserId = jest.fn().mockReturnValue(1)
    
    // Mock DateUtils
    DateUtils.getCurrentLocalISOString = jest.fn().mockReturnValue('2024-01-01T10:00:00Z')
    DateUtils.formatDate = jest.fn().mockReturnValue('2024-01-01')
    DateUtils.formatDateTime = jest.fn().mockReturnValue('2024-01-01 12:00:00')
  })

  describe('项目创建测试', () => {
    it('应该能够创建项目', async () => {
      const projectData = {
        name: '测试项目',
        goal: '测试目标',
        description: '测试描述'
      }
      
      dbService.insert.mockResolvedValue(1)
      dbService.findOne.mockResolvedValue({
        id: 1,
        name: '测试项目',
        goal: '测试目标',
        description: '测试描述',
        status: 'active',
        progress: 0
      })
      
      const result = await projectApi.createProject(projectData)
      
      expect(dbService.insert).toHaveBeenCalledWith('projects', expect.objectContaining({
        user_id: 1,
        name: '测试项目',
        goal: '测试目标',
        description: '测试描述',
        status: 'active',
        progress: 0
      }))
      expect(result).toBeDefined()
      expect(result.id).toBe(1)
    })

    it('应该能够创建带 AI 分析的项目', async () => {
      const projectData = {
        name: 'AI 项目',
        goal: 'AI 目标',
        description: 'AI 描述'
      }
      
      const aiAnalysis = {
        smartGoal: 'SMART 目标',
        milestones: [
          { title: '里程碑1', description: '描述1', deadline: 7 },
          { title: '里程碑2', description: '描述2', deadline: 14 }
        ],
        suggestions: 'AI 建议'
      }
      
      dbService.insert
        .mockResolvedValueOnce(1) // 项目插入
        .mockResolvedValueOnce(1) // 里程碑1插入
        .mockResolvedValueOnce(2) // 里程碑2插入
      
      dbService.findOne.mockResolvedValue({
        id: 1,
        name: 'AI 项目',
        milestones: []
      })
      
      const result = await projectApi.createProject(projectData, aiAnalysis)
      
      expect(dbService.insert).toHaveBeenCalledTimes(3) // 1个项目 + 2个里程碑
      expect(result).toBeDefined()
    })

    it('应该验证必填字段', async () => {
      const projectData = {
        name: '',
        goal: '测试目标'
      }
      
      await expect(projectApi.createProject(projectData)).rejects.toThrow('项目名称和目标不能为空')
    })
  })

  describe('项目查询测试', () => {
    it('应该能够获取项目列表', async () => {
      const mockProjects = [
        {
          id: 1,
          name: '项目1',
          description: '描述1',
          status: 'active',
          progress: 50,
          updated_at: '2024-01-01 12:00:00'
        },
        {
          id: 2,
          name: '项目2',
          description: '描述2',
          status: 'completed',
          progress: 100,
          updated_at: '2024-01-02 12:00:00'
        }
      ]
      
      dbService.findMany.mockResolvedValue(mockProjects)
      dbService.query.mockResolvedValue([]) // 里程碑查询
      
      const result = await projectApi.getProjectList()
      
      expect(dbService.findMany).toHaveBeenCalledWith(
        'projects',
        'user_id = ?',
        [1],
        'updated_at DESC',
        '50 OFFSET 0'
      )
      expect(result).toHaveLength(2)
      expect(result[0].title).toBe('项目1') // 字段映射
      expect(result[0].status).toBe('progress') // 状态映射
    })

    it('应该能够按状态筛选项目', async () => {
      dbService.findMany.mockResolvedValue([])
      dbService.query.mockResolvedValue([])
      
      await projectApi.getProjectList({ status: 'active' })
      
      expect(dbService.findMany).toHaveBeenCalledWith(
        'projects',
        'user_id = ? AND status = ?',
        [1, 'active'],
        'updated_at DESC',
        '50 OFFSET 0'
      )
    })

    it('应该能够获取项目详情', async () => {
      const mockProject = {
        id: 1,
        name: '测试项目',
        description: '测试描述',
        status: 'active',
        progress: 50,
        updated_at: '2024-01-01 12:00:00'
      }
      
      dbService.findOne.mockResolvedValue(mockProject)
      dbService.findMany.mockResolvedValue([]) // 里程碑和日志查询
      
      const result = await projectApi.getProjectDetail(1)
      
      expect(dbService.findOne).toHaveBeenCalledWith(
        'projects',
        'id = ? AND user_id = ?',
        [1, 1]
      )
      expect(result).toBeDefined()
      expect(result.title).toBe('测试项目')
    })

    it('应该处理项目不存在的情况', async () => {
      dbService.findOne.mockResolvedValue(null)
      
      await expect(projectApi.getProjectDetail(999)).rejects.toThrow('项目不存在')
    })
  })

  describe('项目更新测试', () => {
    it('应该能够更新项目', async () => {
      const mockProject = {
        id: 1,
        name: '原项目名',
        status: 'active'
      }
      
      const updateData = {
        name: '新项目名',
        description: '新描述'
      }
      
      dbService.findOne.mockResolvedValue(mockProject)
      dbService.update.mockResolvedValue({})
      dbService.findMany.mockResolvedValue([])
      
      const result = await projectApi.updateProject(1, updateData)
      
      expect(dbService.update).toHaveBeenCalledWith(
        'projects',
        updateData,
        'id = ? AND user_id = ?',
        [1, 1]
      )
      expect(result).toBeDefined()
    })

    it('应该处理更新不存在的项目', async () => {
      dbService.findOne.mockResolvedValue(null)
      
      await expect(projectApi.updateProject(999, {})).rejects.toThrow('项目不存在')
    })
  })

  describe('项目删除测试', () => {
    it('应该能够删除项目', async () => {
      const mockProject = {
        id: 1,
        name: '测试项目'
      }
      
      dbService.findOne.mockResolvedValue(mockProject)
      dbService.delete.mockResolvedValue({})
      
      const result = await projectApi.deleteProject(1)
      
      expect(dbService.delete).toHaveBeenCalledTimes(5) // 删除相关数据
      expect(dbService.delete).toHaveBeenCalledWith('project_logs', 'project_id = ?', [1])
      expect(dbService.delete).toHaveBeenCalledWith('project_milestones', 'project_id = ?', [1])
      expect(dbService.delete).toHaveBeenCalledWith('ai_analyses', 'project_id = ?', [1])
      expect(dbService.delete).toHaveBeenCalledWith('project_knowledge_mappings', 'project_id = ?', [1])
      expect(dbService.delete).toHaveBeenCalledWith('projects', 'id = ? AND user_id = ?', [1, 1])
      expect(result).toBe(true)
    })

    it('应该处理删除不存在的项目', async () => {
      dbService.findOne.mockResolvedValue(null)
      
      await expect(projectApi.deleteProject(999)).rejects.toThrow('项目不存在或无权限删除')
    })
  })

  describe('里程碑管理测试', () => {
    it('应该能够创建里程碑', async () => {
      const milestoneData = {
        title: '测试里程碑',
        description: '里程碑描述',
        deadline: '2024-01-15'
      }
      
      dbService.query.mockResolvedValue([{ max_seq: 0 }])
      dbService.insert.mockResolvedValue(1)
      dbService.findOne.mockResolvedValue({
        id: 1,
        title: '测试里程碑'
      })
      
      const result = await projectApi.createMilestone(1, milestoneData)
      
      expect(dbService.insert).toHaveBeenCalledWith('project_milestones', expect.objectContaining({
        project_id: 1,
        title: '测试里程碑',
        description: '里程碑描述',
        status: 'pending',
        progress: 0,
        sequence: 1
      }))
      expect(result).toBeDefined()
    })

    it('应该能够更新里程碑', async () => {
      const mockMilestone = {
        id: 1,
        project_id: 1,
        title: '原里程碑'
      }
      
      const updateData = {
        status: 'completed',
        progress: 100
      }
      
      dbService.findOne.mockResolvedValue(mockMilestone)
      dbService.update.mockResolvedValue({})
      dbService.findMany.mockResolvedValue([]) // updateProjectProgress 查询
      
      const result = await projectApi.updateMilestone(1, updateData)
      
      expect(dbService.update).toHaveBeenCalledWith(
        'project_milestones',
        updateData,
        'id = ?',
        [1]
      )
      expect(result).toBeDefined()
    })

    it('应该能够删除里程碑', async () => {
      const mockMilestone = {
        id: 1,
        project_id: 1,
        title: '测试里程碑'
      }
      
      dbService.findOne.mockResolvedValue(mockMilestone)
      dbService.delete.mockResolvedValue({})
      dbService.findMany.mockResolvedValue([]) // updateProjectProgress 查询
      
      const result = await projectApi.deleteMilestone(1)
      
      expect(dbService.delete).toHaveBeenCalledWith('project_milestones', 'id = ?', [1])
      expect(result).toBe(true)
    })
  })

  describe('项目统计测试', () => {
    it('应该能够获取项目统计信息', async () => {
      dbService.count
        .mockResolvedValueOnce(10) // 总项目数
        .mockResolvedValueOnce(5)  // 进行中项目数
        .mockResolvedValueOnce(3)  // 已完成项目数
      
      dbService.query
        .mockResolvedValueOnce([{ count: 20 }]) // 总里程碑数
        .mockResolvedValueOnce([{ count: 12 }]) // 已完成里程碑数
      
      const result = await projectApi.getProjectStats()
      
      expect(result).toEqual({
        totalProjects: 10,
        activeProjects: 5,
        completedProjects: 3,
        totalMilestones: 20,
        completedMilestones: 12
      })
    })
  })

  describe('项目进度测试', () => {
    it('应该能够更新项目进度', async () => {
      const mockProject = {
        id: 1,
        name: '测试项目'
      }
      
      const progressData = {
        progress: 75,
        description: '进度更新'
      }
      
      dbService.findOne.mockResolvedValue(mockProject)
      dbService.update.mockResolvedValue({})
      dbService.findMany.mockResolvedValue([]) // updateProjectProgress 查询
      
      const result = await projectApi.updateProgress(1, progressData)
      
      expect(dbService.update).toHaveBeenCalledWith(
        'projects',
        expect.objectContaining({
          progress: 75,
          description: '进度更新'
        }),
        'id = ? AND user_id = ?',
        [1, 1]
      )
      expect(result).toBe(true)
    })

    it('应该能够基于里程碑自动计算项目进度', async () => {
      const milestones = [
        { status: 'completed', progress: 100 },
        { status: 'progress', progress: 50 },
        { status: 'pending', progress: 0 }
      ]
      
      dbService.findMany.mockResolvedValue(milestones)
      dbService.update.mockResolvedValue({})
      
      await projectApi.updateProjectProgress(1)
      
      // 计算期望的进度：(100 + 50 + 0) / 3 = 50
      expect(dbService.update).toHaveBeenCalledWith(
        'projects',
        { progress: 50 },
        'id = ?',
        [1]
      )
    })
  })

  describe('状态映射测试', () => {
    it('应该正确映射数据库状态到前端状态', () => {
      expect(projectApi.mapDatabaseStatus('active')).toBe('progress')
      expect(projectApi.mapDatabaseStatus('completed')).toBe('completed')
      expect(projectApi.mapDatabaseStatus('pending')).toBe('pending')
      expect(projectApi.mapDatabaseStatus('paused')).toBe('warning')
      expect(projectApi.mapDatabaseStatus('unknown')).toBe('progress')
    })

    it('应该返回正确的状态文本', () => {
      expect(projectApi.getStatusText('progress')).toBe('进行中')
      expect(projectApi.getStatusText('warning')).toBe('有风险')
      expect(projectApi.getStatusText('completed')).toBe('已完成')
      expect(projectApi.getStatusText('pending')).toBe('待开始')
      expect(projectApi.getStatusText('unknown')).toBe('未知状态')
    })
  })

  describe('错误处理测试', () => {
    it('应该处理数据库初始化失败', async () => {
      dbService.isInitialized = false
      dbService.initDB = jest.fn().mockRejectedValue(new Error('数据库初始化失败'))
      
      await expect(projectApi.getProjectList()).rejects.toThrow('数据库初始化失败')
    })

    it('应该处理数据库操作失败', async () => {
      dbService.findMany.mockRejectedValue(new Error('查询失败'))
      
      await expect(projectApi.getProjectList()).rejects.toThrow('查询失败')
    })
  })
})
