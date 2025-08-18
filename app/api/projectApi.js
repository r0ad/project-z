/**
 * 项目管理API
 * 提供项目和项目节点的增删改查功能
 */

import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'

class ProjectApi {
  /**
   * 初始化数据库（如果未初始化）
   */
  async ensureDBInit() {
    if (!dbService.isInitialized) {
      await dbService.initDB()
    }
  }

  /**
   * 获取项目列表
   * @param {Object} options - 查询选项
   * @param {string} options.status - 项目状态筛选
   * @param {number} options.limit - 限制数量
   * @param {number} options.offset - 偏移量
   * @param {number} options.userId - 用户ID，如果不提供则使用当前用户
   */
  async getProjectList(options = {}) {
    await this.ensureDBInit()
    
    const { status, limit = 50, offset = 0, userId = userStore.getCurrentUserId() } = options
    
    let where = 'user_id = ?'
    let params = [userId]
    
    if (status) {
      where += ' AND status = ?'
      params.push(status)
    }
    
    const orderBy = 'updated_at DESC'
    const limitClause = `${limit} OFFSET ${offset}`
    
    const projects = await dbService.findMany('projects', where, params, orderBy, limitClause)
    
    // 为每个项目获取节点信息并格式化数据
    for (let project of projects) {
      project.milestones = await this.getProjectMilestones(project.id)
      project.milestoneCount = project.milestones.length
      project.completedMilestones = project.milestones.filter(m => m.status === 'completed').length
      
      // 字段映射：将数据库字段转换为前端期望的字段
      project.title = project.name // 数据库字段name映射到前端title
      project.updateTime = this.formatUpdateTime(project.updated_at)
      
      // 状态映射：将数据库状态转换为前端期望的状态
      project.status = this.mapDatabaseStatus(project.status)
      project.statusText = this.getStatusText(project.status)
      
      // 确保进度字段存在
      if (project.progress === null || project.progress === undefined) {
        project.progress = 0
      }
    }
    
    return projects
  }

  /**
   * 获取所有项目（用于统计和简单列表）
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   * @returns {Promise<Array>} 项目列表
   */
  async getAllProjects(userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    const projects = await dbService.findMany('projects', 'user_id = ?', [userId], 'updated_at DESC')
    
    // 简单格式化，只返回基本信息
    return projects.map(project => ({
      id: project.id,
      name: project.name,
      title: project.name, // 字段映射
      description: project.description,
      status: this.mapDatabaseStatus(project.status),
      progress: project.progress || 0,
      created_at: project.created_at,
      updated_at: project.updated_at
    }))
  }

  /**
   * 获取项目详情
   * @param {number} projectId - 项目ID
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async getProjectDetail(projectId, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    const project = await dbService.findOne('projects', 'id = ? AND user_id = ?', [projectId, userId])
    if (!project) {
      throw new Error('项目不存在')
    }
    
    // 获取项目节点
    project.milestones = await this.getProjectMilestones(projectId)
    
    // 获取最近的日志
    project.recentLogs = await dbService.findMany(
      'project_logs', 
      'project_id = ?', 
      [projectId], 
      'created_at DESC', 
      '5'
    )
    
    // 字段映射：将数据库字段转换为前端期望的字段
    project.title = project.name // 数据库字段name映射到前端title
    project.updateTime = this.formatUpdateTime(project.updated_at)
    
    // 状态映射：将数据库状态转换为前端期望的状态
    project.status = this.mapDatabaseStatus(project.status)
    project.statusText = this.getStatusText(project.status)
    
    // 确保进度字段存在
    if (project.progress === null || project.progress === undefined) {
      project.progress = 0
    }
    
    return project
  }

  /**
   * 创建项目
   * @param {Object} projectData - 项目数据
   * @param {string} projectData.name - 项目名称
   * @param {string} projectData.goal - 项目目标
   * @param {string} projectData.description - 项目描述
   * @param {Object} aiAnalysis - AI分析结果（可选）
   * @param {string} aiAnalysis.smartGoal - AI优化的SMART目标
   * @param {Array} aiAnalysis.milestones - AI生成的里程碑
   * @param {string} aiAnalysis.suggestions - AI建议
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async createProject(projectData, aiAnalysis = null, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    const { name, goal, description } = projectData
    
    if (!name || !goal) {
      throw new Error('项目名称和目标不能为空')
    }
    
    // 插入项目
    const projectId = await dbService.insert('projects', {
      user_id: userId,
      name,
      goal,
      description: description || '',
      status: 'active',
      progress: 0,
      start_date: DateUtils.formatDate(new Date()),
      ai_suggestions: aiAnalysis ? aiAnalysis.suggestions : null
    })

    console.log('projectId start_date ', projectId, DateUtils.formatDate(new Date()))
    
    // 创建AI生成的项目节点
    if (aiAnalysis && aiAnalysis.milestones && aiAnalysis.milestones.length > 0) {
      const startDate = new Date()
      
      for (let i = 0; i < aiAnalysis.milestones.length; i++) {
        const milestone = aiAnalysis.milestones[i]
        
        // 计算截止日期
        let deadline = null
        if (milestone.deadline && typeof milestone.deadline === 'number') {
          const deadlineDate = new Date(startDate)
          deadlineDate.setDate(startDate.getDate() + milestone.deadline)
          deadline = deadlineDate.toISOString().split('T')[0]
        }
        
        await dbService.insert('project_milestones', {
          project_id: projectId,
          title: milestone.title,
          description: milestone.description || '',
          status: 'pending',
          progress: 0,
          deadline: deadline,
          sequence: i + 1
        })
      }
    }
    
    return await this.getProjectDetail(projectId, userId)
  }

  /**
   * 更新项目
   * @param {number} projectId - 项目ID
   * @param {Object} updateData - 更新数据
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async updateProject(projectId, updateData, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    const project = await dbService.findOne('projects', 'id = ? AND user_id = ?', [projectId, userId])
    if (!project) {
      throw new Error('项目不存在')
    }
    
    await dbService.update('projects', updateData, 'id = ? AND user_id = ?', [projectId, userId])
    
    return await this.getProjectDetail(projectId, userId)
  }

  /**
   * 删除项目
   * @param {number} projectId - 项目ID
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async deleteProject(projectId, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    // 验证项目所有权
    const project = await dbService.findOne('projects', 'id = ? AND user_id = ?', [projectId, userId])
    if (!project) {
      throw new Error('项目不存在或无权限删除')
    }
    
    // 删除相关数据
    await dbService.delete('project_logs', 'project_id = ?', [projectId])
    await dbService.delete('project_milestones', 'project_id = ?', [projectId])
    await dbService.delete('ai_analyses', 'project_id = ?', [projectId])
    await dbService.delete('project_knowledge_mappings', 'project_id = ?', [projectId])
    await dbService.delete('projects', 'id = ? AND user_id = ?', [projectId, userId])
    
    return true
  }

  /**
   * 获取项目节点列表
   * @param {number} projectId - 项目ID
   */
  async getProjectMilestones(projectId) {
    await this.ensureDBInit()
    
    return await dbService.findMany(
      'project_milestones', 
      'project_id = ?', 
      [projectId], 
      'sequence ASC'
    )
  }

  /**
   * 创建项目节点
   * @param {number} projectId - 项目ID
   * @param {Object} milestoneData - 节点数据
   */
  async createMilestone(projectId, milestoneData) {
    await this.ensureDBInit()
    
    const { title, description, deadline } = milestoneData
    
    if (!title) {
      throw new Error('节点标题不能为空')
    }
    
    // 获取当前最大序号
    const maxSequence = await dbService.query(
      'SELECT MAX(sequence) as max_seq FROM project_milestones WHERE project_id = ?',
      [projectId]
    )
    
    const sequence = (maxSequence[0].max_seq || 0) + 1
    
    const milestoneId = await dbService.insert('project_milestones', {
      project_id: projectId,
      title,
      description: description || '',
      status: 'pending',
      progress: 0,
      deadline: deadline || null,
      sequence
    })
    
    return await dbService.findOne('project_milestones', 'id = ?', [milestoneId])
  }

  /**
   * 更新项目节点
   * @param {number} milestoneId - 节点ID
   * @param {Object} updateData - 更新数据
   */
  async updateMilestone(milestoneId, updateData) {
    await this.ensureDBInit()
    
    const milestone = await dbService.findOne('project_milestones', 'id = ?', [milestoneId])
    if (!milestone) {
      throw new Error('节点不存在')
    }
    
    await dbService.update('project_milestones', updateData, 'id = ?', [milestoneId])
    
    // 如果节点状态变为完成，更新项目进度
    if (updateData.status === 'completed') {
      await this.updateProjectProgress(milestone.project_id)
    }
    
    return await dbService.findOne('project_milestones', 'id = ?', [milestoneId])
  }

  /**
   * 删除项目节点
   * @param {number} milestoneId - 节点ID
   */
  async deleteMilestone(milestoneId) {
    await this.ensureDBInit()
    
    const milestone = await dbService.findOne('project_milestones', 'id = ?', [milestoneId])
    if (!milestone) {
      throw new Error('节点不存在')
    }
    
    await dbService.delete('project_milestones', 'id = ?', [milestoneId])
    
    // 更新项目进度
    await this.updateProjectProgress(milestone.project_id)
    
    return true
  }

  /**
   * 更新项目进度（基于节点完成情况）
   * @param {number} projectId - 项目ID
   */
  async updateProjectProgress(projectId) {
    await this.ensureDBInit()
    
    const milestones = await this.getProjectMilestones(projectId)
    
    if (milestones.length === 0) {
      return
    }
    
    const completedCount = milestones.filter(m => m.status === 'completed').length
    const progress = Math.round((completedCount / milestones.length) * 100)
    
    await dbService.update('projects', { progress }, 'id = ?', [projectId])
    
    // 如果所有节点完成，更新项目状态
    if (progress === 100) {
      await dbService.update('projects', { status: 'completed' }, 'id = ?', [projectId])
    }
  }

  /**
   * 获取项目统计信息
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async getProjectStats(userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    const stats = {}
    
    // 总项目数
    stats.totalProjects = await dbService.count('projects', 'user_id = ?', [userId])
    
    // 进行中的项目数
    stats.activeProjects = await dbService.count('projects', 'user_id = ? AND status = ?', [userId, 'active'])
    
    // 已完成的项目数
    stats.completedProjects = await dbService.count('projects', 'user_id = ? AND status = ?', [userId, 'completed'])
    
    // 总节点数
    const milestoneCountResult = await dbService.query(
      'SELECT COUNT(*) as count FROM project_milestones pm JOIN projects p ON pm.project_id = p.id WHERE p.user_id = ?',
      [userId]
    )
    stats.totalMilestones = milestoneCountResult[0].count
    
    // 已完成节点数
    const completedMilestoneResult = await dbService.query(
      'SELECT COUNT(*) as count FROM project_milestones pm JOIN projects p ON pm.project_id = p.id WHERE p.user_id = ? AND pm.status = ?',
      [userId, 'completed']
    )
    stats.completedMilestones = completedMilestoneResult[0].count
    
    return stats
  }

  /**
   * 格式化更新时间
   * @param {string} time - 时间字符串
   */
  formatUpdateTime(time) {
    if (!time) return ''
    const date = new Date(time)
    const now = new Date()
    const diffMs = now - date
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    } else if (diffDays === 1) {
      return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    } else if (diffDays < 7) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      return `${weekdays[date.getDay()]} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    } else {
      return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    }
  }

  /**
   * 更新项目进度
   * @param {number} projectId - 项目ID
   * @param {Object} progressData - 进度数据
   * @param {number} progressData.progress - 进度百分比
   * @param {string} progressData.description - 进度描述
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async updateProgress(projectId, progressData, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      // 验证项目所有权
      const project = await dbService.findOne('projects', 'id = ? AND user_id = ?', [projectId, userId])
      if (!project) {
        throw new Error('项目不存在或无权限修改')
      }
      
      // 更新项目进度
      const updateData = {
        progress: progressData.progress || 0
      }
      
      if (progressData.description) {
        updateData.description = progressData.description
      }
      
      await dbService.update('projects', updateData, 'id = ? AND user_id = ?', [projectId, userId])
      
      // 重新计算项目进度（基于里程碑）
      await this.updateProjectProgress(projectId)
      
      return true
    } catch (error) {
      console.error('更新项目进度失败:', error)
      throw error
    }
  }
  
  /**
   * 更新项目计划
   * @param {number} projectId - 项目ID
   * @param {Object} planData - 计划数据
   * @param {string} planData.plan - 计划内容
   * @param {Array} planData.goals - 目标列表
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async updatePlan(projectId, planData, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      // 验证项目所有权
      const project = await dbService.findOne('projects', 'id = ? AND user_id = ?', [projectId, userId])
      if (!project) {
        throw new Error('项目不存在或无权限修改')
      }
      
      const updateData = {}
      
      if (planData.plan) {
        updateData.description = planData.plan
      }
      
      if (planData.goals && Array.isArray(planData.goals)) {
        updateData.goals = JSON.stringify(planData.goals)
      }
      
      await dbService.update('projects', updateData, 'id = ? AND user_id = ?', [projectId, userId])
      
      return true
    } catch (error) {
      console.error('更新项目计划失败:', error)
      throw error
    }
  }

  /**
   * 映射数据库状态到前端状态
   * @param {string} dbStatus - 数据库状态值
   */
  mapDatabaseStatus(dbStatus) {
    const statusMap = {
      'active': 'progress',
      'completed': 'completed',
      'pending': 'pending',
      'paused': 'warning'
    }
    return statusMap[dbStatus] || 'progress'
  }

  /**
   * 获取状态文本
   * @param {string} status - 状态值
   */
  getStatusText(status) {
    const statusMap = {
      'progress': '进行中',
      'warning': '有风险',
      'completed': '已完成',
      'pending': '待开始'
    }
    return statusMap[status] || '未知状态'
  }
}

// 创建单例实例
const projectApi = new ProjectApi()

export default projectApi