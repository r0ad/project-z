/**
 * 日志管理API
 * 提供项目日志的增删改查功能
 */

import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'

class LogApi {
  /**
   * 初始化数据库（如果未初始化）
   */
  async ensureDBInit() {
    if (!dbService.isInitialized) {
      await dbService.initDB()
    }
  }

  /**
   * 获取项目日志列表
   * @param {number} projectId - 项目ID
   * @param {Object} options - 查询选项
   * @param {number} options.limit - 限制数量
   * @param {number} options.offset - 偏移量
   * @param {string} options.logType - 日志类型筛选
   */
  async getProjectLogs(projectId, options = {}) {
    await this.ensureDBInit()
    
    const { limit = 20, offset = 0, logType } = options
    
    let where = 'project_id = ?'
    let params = [projectId]
    
    if (logType) {
      where += ' AND log_type = ?'
      params.push(logType)
    }
    
    const orderBy = 'created_at DESC'
    const limitClause = `${limit} OFFSET ${offset}`
    
    const logs = await dbService.findMany('project_logs', where, params, orderBy, limitClause)
    
    // 格式化日志数据
		return logs.map(log => ({
			...log,
			created_at: DateUtils.formatDateTime(log.created_at),
			hasProgress: !!log.progress_text,
			hasProblem: !!log.problem_text,
			hasPlan: !!log.plan_text
    }))
  }

  /**
   * 获取日志详情
   * @param {number} logId - 日志ID
   */
  async getLogDetail(logId) {
    await this.ensureDBInit()
    
    const log = await dbService.findOne('project_logs', 'id = ?', [logId])
    if (!log) {
      throw new Error('日志不存在')
    }
    
    return {
      ...log,
      created_at: DateUtils.formatDateTime(log.created_at)
    }
  }

  /**
   * 创建项目日志
   * @param {number} projectId - 项目ID
   * @param {Object} logData - 日志数据
   * @param {string} logData.content - 原始内容
   * @param {string} logData.progressText - 进展内容
   * @param {string} logData.problemText - 问题内容
   * @param {string} logData.planText - 计划内容
   * @param {string} logData.logType - 日志类型（manual/voice/ai）
   */
  async createLog(projectId, logData) {
    await this.ensureDBInit()
    
    const { content, progressText, problemText, planText, logType = 'manual' } = logData
    
    if (!content && !progressText && !problemText && !planText) {
      throw new Error('日志内容不能为空')
    }
    
    // 验证项目是否存在
    const project = await dbService.findOne('projects', 'id = ?', [projectId])
    if (!project) {
      throw new Error('项目不存在')
    }
    
    const logId = await dbService.insert('project_logs', {
      project_id: projectId,
      content: content || '',
      progress_text: progressText || '',
      problem_text: problemText || '',
      plan_text: planText || '',
      log_type: logType
    })
    
    // 更新项目的最后更新时间
    await dbService.update('projects', {
      updated_at: DateUtils.getCurrentLocalISOString()
    }, 'id = ?', [projectId])
    
    return await this.getLogDetail(logId)
  }

  /**
   * 更新日志
   * @param {number} logId - 日志ID
   * @param {Object} updateData - 更新数据
   */
  async updateLog(logId, updateData) {
    await this.ensureDBInit()
    
    const log = await dbService.findOne('project_logs', 'id = ?', [logId])
    if (!log) {
      throw new Error('日志不存在')
    }
    
    await dbService.update('project_logs', updateData, 'id = ?', [logId])
    
    // 更新项目的最后更新时间
    await dbService.update('projects', {}, 'id = ?', [log.project_id])
    
    return await this.getLogDetail(logId)
  }

  /**
   * 删除日志
   * @param {number} logId - 日志ID
   */
  async deleteLog(logId) {
    await this.ensureDBInit()
    
    const log = await dbService.findOne('project_logs', 'id = ?', [logId])
    if (!log) {
      throw new Error('日志不存在')
    }
    
    await dbService.delete('project_logs', 'id = ?', [logId])
    
    // 更新项目的最后更新时间
    await dbService.update('projects', {}, 'id = ?', [log.project_id])
    
    return true
  }

  /**
   * 获取最近的日志（用于AI上下文）
   * @param {number} projectId - 项目ID
   * @param {number} limit - 限制数量
   */
  async getRecentLogs(projectId, limit = 3) {
    await this.ensureDBInit()
    
    const logs = await dbService.findMany(
      'project_logs',
      'project_id = ?',
      [projectId],
      'created_at DESC',
      limit.toString()
    )
    
    return logs.map(log => ({
      id: log.id,
      content: log.content,
      progressText: log.progress_text,
      problemText: log.problem_text,
      planText: log.plan_text,
      createdAt: log.created_at,
      logType: log.log_type
    }))
  }

  /**
   * 搜索日志
   * @param {number} projectId - 项目ID
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项
   */
  async searchLogs(projectId, keyword, options = {}) {
    await this.ensureDBInit()
    
    const { limit = 20, offset = 0 } = options
    
    if (!keyword) {
      return await this.getProjectLogs(projectId, { limit, offset })
    }
    
    const searchPattern = `%${keyword}%`
    const where = `project_id = ? AND (
      content LIKE ? OR 
      progress_text LIKE ? OR 
      problem_text LIKE ? OR 
      plan_text LIKE ?
    )`
    const params = [projectId, searchPattern, searchPattern, searchPattern, searchPattern]
    
    const orderBy = 'created_at DESC'
    const limitClause = `${limit} OFFSET ${offset}`
    
    const logs = await dbService.findMany('project_logs', where, params, orderBy, limitClause)
    
    return logs.map(log => ({
      ...log,
      created_at: DateUtils.formatDateTime(log.created_at),
      hasProgress: !!log.progress_text,
      hasProblem: !!log.problem_text,
      hasPlan: !!log.plan_text
    }))
  }

  /**
   * 获取日志统计信息
   * @param {number} projectId - 项目ID
   */
  async getLogStats(projectId) {
    await this.ensureDBInit()
    
    const stats = {}
    
    // 总日志数
    stats.totalLogs = await dbService.count('project_logs', 'project_id = ?', [projectId])
    
    // 各类型日志数
    const typeStats = await dbService.query(`
      SELECT log_type, COUNT(*) as count 
      FROM project_logs 
      WHERE project_id = ? 
      GROUP BY log_type
    `, [projectId])
    
    stats.byType = {}
    typeStats.forEach(item => {
      stats.byType[item.log_type] = item.count
    })
    
    // 最近7天的日志数
    const recentStats = await dbService.query(`
      SELECT COUNT(*) as count 
      FROM project_logs 
      WHERE project_id = ? AND created_at >= datetime('now', '-7 days')
    `, [projectId])
    stats.recentWeekLogs = recentStats[0].count
    
    // 有问题的日志数
    const problemStats = await dbService.query(`
      SELECT COUNT(*) as count 
      FROM project_logs 
      WHERE project_id = ? AND problem_text IS NOT NULL AND problem_text != ''
    `, [projectId])
    stats.problemLogs = problemStats[0].count
    
    return stats
  }

  /**
   * 获取日志时间线数据（按日期分组）
   * @param {number} projectId - 项目ID
   * @param {number} days - 天数范围
   */
  async getLogTimeline(projectId, days = 30) {
    await this.ensureDBInit()
    
    const logs = await dbService.query(`
      SELECT 
        DATE(created_at) as log_date,
        COUNT(*) as log_count,
        GROUP_CONCAT(id) as log_ids
      FROM project_logs 
      WHERE project_id = ? AND created_at >= datetime('now', '-${days} days')
      GROUP BY DATE(created_at)
      ORDER BY log_date DESC
    `, [projectId])
    
    return logs.map(item => ({
      date: item.log_date,
      count: item.log_count,
      logIds: item.log_ids ? item.log_ids.split(',').map(id => parseInt(id)) : []
    }))
  }

  /**
   * 批量创建日志（用于AI处理后的结构化数据）
   * @param {number} projectId - 项目ID
   * @param {Array} logsData - 日志数据数组
   */
  async batchCreateLogs(projectId, logsData) {
    await this.ensureDBInit()
    
    const results = []
    
    for (const logData of logsData) {
      const log = await this.createLog(projectId, logData)
      results.push(log)
    }
    
    return results
  }

  /**
   * 格式化日期时间
   * @param {string} dateTime - 日期时间字符串
   */

}

// 创建单例实例
const logApi = new LogApi()

export default logApi