/**
 * 收藏管理API
 * 提供收藏的增删改查功能，支持项目和知识的收藏
 */

import dbService from '@/utils/dbService.js'
import projectApi from './projectApi.js'
import knowledgeApi from './knowledgeApi.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'

class FavoriteApi {
  /**
   * 初始化数据库（如果未初始化）
   */
  async ensureDBInit() {
    if (!dbService.isInitialized) {
      await dbService.initDB()
    }
  }

  /**
   * 获取收藏列表
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   * @param {string} type - 收藏类型 ('project', 'knowledge', 'all')
   */
  async getFavoritesList(userId = null, type = 'all') {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    let where = 'user_id = ?'
    let params = [userId]
    
    if (type !== 'all') {
      where += ' AND target_type = ?'
      params.push(type)
    }
    
    const favorites = await dbService.findMany('favorites', where, params, 'created_at DESC')
    
    // 获取详细信息
    const favoritesList = []
    
    for (let favorite of favorites) {
      let item = {
        id: favorite.target_id,
        favoriteId: favorite.id,
        type: favorite.target_type,
        favoriteTime: this.formatTime(favorite.created_at)
      }
      
      try {
        if (favorite.target_type === 'project') {
          const project = await dbService.findOne('projects', 'id = ?', [favorite.target_id])
          if (project) {
            item.title = project.name
            item.description = project.description || project.goal || '暂无描述'
            item.typeName = '项目'
            item.icon = 'category'
            item.iconColor = '#165DFF'
            item.iconBg = '#165DFF20'
            item.status = project.status
            item.progress = project.progress || 0
            favoritesList.push(item)
          }
        } else if (favorite.target_type === 'knowledge') {
          const knowledge = await dbService.findOne('knowledge_base', 'id = ?', [favorite.target_id])
          if (knowledge) {
            item.title = knowledge.title
            item.description = knowledge.summary || '暂无描述'
            item.typeName = '知识'
            item.icon = 'book'
            item.iconColor = '#00B42A'
            item.iconBg = '#00B42A20'
            item.viewCount = knowledge.view_count || 0
            favoritesList.push(item)
          }
        }
      } catch (error) {
        console.error(`获取${favorite.target_type}详情失败:`, error)
      }
    }
    
    return favoritesList
  }

  /**
   * 添加收藏
   * @param {string} targetType - 目标类型 ('project', 'knowledge')
   * @param {number} targetId - 目标ID
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async addFavorite(targetType, targetId, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    // 验证收藏类型
    if (!['project', 'knowledge'].includes(targetType)) {
      throw new Error('无效的收藏类型')
    }
    
    // 检查是否已收藏
    const existing = await dbService.findOne(
      'favorites',
      'user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    )
    
    if (existing) {
      return false // 已收藏
    }
    
    // 添加收藏
    await dbService.insert('favorites', {
      user_id: userId,
      target_type: targetType,
      target_id: targetId,
      created_at: DateUtils.getCurrentLocalISOString()
    })
    
    return true
  }

  /**
   * 取消收藏
   * @param {string} targetType - 目标类型 ('project', 'knowledge')
   * @param {number} targetId - 目标ID
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async removeFavorite(targetType, targetId, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    const result = await dbService.delete(
      'favorites',
      'user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    )
    
    return true
  }

  /**
   * 切换收藏状态
   * @param {string} targetType - 目标类型 ('project', 'knowledge')
   * @param {number} targetId - 目标ID
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async toggleFavorite(targetType, targetId, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    // 检查是否已收藏
    const existing = await dbService.findOne(
      'favorites',
      'user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    )
    
    if (existing) {
      // 取消收藏
      await dbService.delete('favorites', 'id = ?', [existing.id])
      return false
    } else {
      // 添加收藏
      await dbService.insert('favorites', {
        user_id: userId,
        target_type: targetType,
        target_id: targetId,
        created_at: DateUtils.getCurrentLocalISOString()
      })
      return true
    }
  }

  /**
   * 检查是否已收藏
   * @param {string} targetType - 目标类型 ('project', 'knowledge')
   * @param {number} targetId - 目标ID
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async isFavorite(targetType, targetId, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    const existing = await dbService.findOne(
      'favorites',
      'user_id = ? AND target_type = ? AND target_id = ?',
      [userId, targetType, targetId]
    )
    
    return !!existing
  }

  /**
   * 获取收藏统计
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async getFavoritesStats(userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    const stats = {
      total: 0,
      project: 0,
      knowledge: 0
    }
    
    // 获取总数
    const totalResult = await dbService.query(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ?',
      [userId]
    )
    stats.total = totalResult[0]?.count || 0
    
    // 获取项目收藏数
    const projectResult = await dbService.query(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND target_type = "project"',
      [userId]
    )
    stats.project = projectResult[0]?.count || 0
    
    // 获取知识收藏数
    const knowledgeResult = await dbService.query(
      'SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND target_type = "knowledge"',
      [userId]
    )
    stats.knowledge = knowledgeResult[0]?.count || 0
    
    return stats
  }

  /**
   * 格式化时间
   * @param {string} timeStr - 时间字符串
   */
  formatTime(timeStr) {
    if (!timeStr) return ''
    
    try {
      const date = new Date(timeStr)
      const now = new Date()
      const diff = now - date
      
      // 小于1分钟
      if (diff < 60000) {
        return '刚刚'
      }
      
      // 小于1小时
      if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      }
      
      // 小于1天
      if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
      }
      
      // 小于7天
      if (diff < 604800000) {
        return `${Math.floor(diff / 86400000)}天前`
      }
      
      // 超过7天显示具体日期
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch (error) {
      console.error('时间格式化失败:', error)
      return timeStr
    }
  }
}

// 创建单例实例
const favoriteApi = new FavoriteApi()

export default favoriteApi