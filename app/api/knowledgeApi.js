/**
 * 知识库管理API
 * 提供知识库的增删改查、标签管理、项目关联等功能
 */

import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'

class KnowledgeApi {
  /**
   * 初始化数据库（如果未初始化）
   */
  async ensureDBInit() {
    if (!dbService.isInitialized) {
      await dbService.initDB()
    }
  }

  /**
   * 获取知识库列表
   * @param {Object} options - 查询选项
   * @param {string} options.category - 分类筛选
   * @param {string} options.keyword - 关键词搜索
   * @param {string} options.status - 状态筛选
   * @param {number} options.limit - 限制数量
   * @param {number} options.offset - 偏移量
   * @param {string} options.orderBy - 排序方式
   * @param {number} options.userId - 用户ID
   */
  async getKnowledgeList(options = {}) {
    await this.ensureDBInit()
    
    const { keyword, limit = 50, offset = 0, orderBy = 'updated_at DESC', userId = null } = options
    const currentUserId = userId || userStore.getCurrentUserId()
    
    let where = 'user_id = ?'
    let params = [currentUserId]
    
    if (keyword) {
      where += ' AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)'
      const keywordParam = `%${keyword}%`
      params.push(keywordParam, keywordParam, keywordParam)
    }
    
    const limitClause = `${limit} OFFSET ${offset}`
    
    const knowledgeList = await dbService.findMany('knowledge_base', where, params, orderBy, limitClause)
    
    // 为每个知识获取标签信息并设置默认值
    for (let knowledge of knowledgeList) {
      knowledge.tags = await this.getKnowledgeTags(knowledge.id)
      knowledge.updateTime = this.formatUpdateTime(knowledge.updated_at)
      knowledge.viewCount = knowledge.view_count || 0  // 映射访问数量字段
      
      // 设置默认值（因为数据库中没有这些字段）
      knowledge.ai_score = 0
      knowledge.aiScore = 0
      knowledge.keyPoints = []
      knowledge.category = 'other'
    }
    
    return knowledgeList
  }

  /**
   * 获取知识详情
   * @param {number} knowledgeId - 知识ID
   * @param {number} userId - 用户ID
   */
  async getKnowledgeDetail(knowledgeId, userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    const knowledge = await dbService.findOne('knowledge_base', 'id = ? AND user_id = ?', [knowledgeId, currentUserId])
    if (!knowledge) {
      throw new Error('知识不存在')
    }
    
    // 获取标签
    knowledge.tags = await this.getKnowledgeTags(knowledgeId)
    
    // 获取关联项目
    knowledge.relatedProjects = await this.getRelatedProjects(knowledgeId)
    
    // 设置project_name字段（用于编辑界面）
    knowledge.project_name = knowledge.relatedProjects.length > 0 ? knowledge.relatedProjects[0].name : ''
    
    // 格式化时间
    knowledge.updateTime = this.formatUpdateTime(knowledge.updated_at)
    
    // 设置默认值（因为数据库中没有这些字段）
    knowledge.keyPoints = []
    knowledge.aiAnalysis = {}
    knowledge.ai_score = 0
    knowledge.ai_suggestion = ''
    
    // 增加浏览量
    await this.incrementViewCount(knowledgeId)
    
    return knowledge
  }

  /**
   * 创建知识
   * @param {Object} knowledgeData - 知识数据
   * @param {number} userId - 用户ID
   */
  async createKnowledge(knowledgeData, userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    const {
      title,
      content,
      summary,
      tags = [],
      project_name
    } = knowledgeData
    
    // 验证必填字段
    if (!title || !content) {
      throw new Error('标题和内容不能为空')
    }
    
    // 插入知识记录（只使用数据库中实际存在的字段）
    const knowledgeId = await dbService.insert('knowledge_base', {
      title,
      content,
      summary: summary || this.generateSummary(content),
      user_id: currentUserId,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    
    // 处理标签
    if (tags.length > 0) {
      await this.updateKnowledgeTags(knowledgeId, tags)
    }
    
    // 处理项目关联
    if (project_name) {
      try {
        console.log(`开始处理项目关联，项目名称: "${project_name}"`)
        // 根据项目名称查找项目ID
        const project = await dbService.findOne('projects', 'name = ?', [project_name])
        console.log(`项目查找结果:`, project)
        if (project) {
          const linkResult = await this.linkProject(knowledgeId, project.id)
          console.log(`知识 ${knowledgeId} 关联项目 ${project.name} (ID: ${project.id}) 结果:`, linkResult)
        } else {
          console.warn(`项目 "${project_name}" 不存在，无法建立关联`)
          // 查看所有项目
          const allProjects = await dbService.findMany('projects')
          console.log('当前所有项目:', allProjects)
        }
      } catch (error) {
        console.error('建立项目关联失败:', error)
      }
    } else {
      console.log('没有指定项目名称，跳过项目关联')
    }
    
    return knowledgeId
  }

  /**
   * 更新知识
   * @param {number} knowledgeId - 知识ID
   * @param {Object} updateData - 更新数据
   * @param {number} userId - 用户ID
   */
  async updateKnowledge(knowledgeId, updateData, userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    const {
      title,
      content,
      summary,
      tags,
      project_name
    } = updateData
    
    // 构建更新数据（只使用数据库中实际存在的字段）
    const updateFields = {
      updated_at: new Date().toISOString()
    }
    
    if (title !== undefined) updateFields.title = title
    if (content !== undefined) updateFields.content = content
    if (summary !== undefined) updateFields.summary = summary
    
    // 更新知识记录
    await dbService.update('knowledge_base', updateFields, 'id = ? AND user_id = ?', [knowledgeId, currentUserId])
    
    // 更新标签
    if (tags !== undefined) {
      await this.updateKnowledgeTags(knowledgeId, tags)
    }
    
    // 处理项目关联更新
    if (project_name !== undefined) {
      try {
        console.log(`开始更新项目关联，知识ID: ${knowledgeId}, 项目名称: "${project_name}"`)
        // 先清除现有的项目关联
        const deleteResult = await dbService.delete('project_knowledge_mappings', 'knowledge_id = ?', [knowledgeId])
        console.log(`清除现有项目关联结果:`, deleteResult)
        
        // 如果指定了新的项目，建立新关联
        if (project_name) {
          const project = await dbService.findOne('projects', 'name = ?', [project_name])
          console.log(`项目查找结果:`, project)
          if (project) {
            const linkResult = await this.linkProject(knowledgeId, project.id)
            console.log(`知识 ${knowledgeId} 重新关联项目 ${project.name} (ID: ${project.id}) 结果:`, linkResult)
          } else {
            console.warn(`项目 "${project_name}" 不存在，无法建立关联`)
            // 查看所有项目
            const allProjects = await dbService.findMany('projects')
            console.log('当前所有项目:', allProjects)
          }
        } else {
          console.log(`知识 ${knowledgeId} 的项目关联已清除`)
        }
      } catch (error) {
        console.error('更新项目关联失败:', error)
      }
    } else {
      console.log('project_name未定义，跳过项目关联更新')
    }
    
    return true
  }

  /**
   * 删除知识
   * @param {number} knowledgeId - 知识ID
   * @param {number} userId - 用户ID
   */
  async deleteKnowledge(knowledgeId, userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    try {
      // 删除标签关联
      await dbService.delete('knowledge_tag_mappings', 'knowledge_id = ?', [knowledgeId])
      
      // 删除项目关联（如果存在）
      try {
        await dbService.delete('project_knowledge_mappings', 'knowledge_id = ?', [knowledgeId])
      } catch (error) {
        console.log('project_knowledge_mappings表不存在或删除失败:', error)
      }
      
      // 删除收藏记录
      await dbService.delete('favorites', 'target_type = ? AND target_id = ?', ['knowledge', knowledgeId])
      
      // 删除知识记录
      await dbService.delete('knowledge_base', 'id = ? AND user_id = ?', [knowledgeId, currentUserId])
      
      return true
    } catch (error) {
      console.error('删除知识失败:', error)
      throw error
    }
  }

  /**
   * 获取知识标签
   * @param {number} knowledgeId - 知识ID
   */
  async getKnowledgeTags(knowledgeId) {
    await this.ensureDBInit()
    
    const sql = `
      SELECT kt.name 
      FROM knowledge_tags kt
      INNER JOIN knowledge_tag_mappings ktm ON kt.id = ktm.tag_id
      WHERE ktm.knowledge_id = ?
    `
    
    const result = await dbService.query(sql, [knowledgeId])
    return result.map(row => row.name)
  }

  /**
   * 更新知识标签
   * @param {number} knowledgeId - 知识ID
   * @param {Array} tags - 标签数组
   */
  async updateKnowledgeTags(knowledgeId, tags) {
    await this.ensureDBInit()
    
    // 删除现有标签关联
    await dbService.delete('knowledge_tag_mappings', 'knowledge_id = ?', [knowledgeId])
    
    // 添加新标签
    for (let tagName of tags) {
      if (!tagName.trim()) continue
      
      // 确保标签存在
      let tagId = await this.ensureTagExists(tagName.trim())
      
      // 创建关联
      await dbService.insert('knowledge_tag_mappings', {
        knowledge_id: knowledgeId,
        tag_id: tagId,
        created_at: new Date().toISOString()
      })
    }
  }

  /**
   * 确保标签存在，如果不存在则创建
   * @param {string} tagName - 标签名称
   */
  async ensureTagExists(tagName) {
    await this.ensureDBInit()
    
    // 查找现有标签
    let tag = await dbService.findOne('knowledge_tags', 'name = ?', [tagName])
    
    if (!tag) {
      // 创建新标签
      const tagId = await dbService.insert('knowledge_tags', {
        name: tagName,
        created_at: new Date().toISOString()
      })
      return tagId
    }
    
    return tag.id
  }

  /**
   * 获取所有标签
   */
  async getAllTags() {
    await this.ensureDBInit()
    
    const tags = await dbService.findMany('knowledge_tags', '1=1', [], 'name ASC')
    return tags
  }

  /**
   * 获取热门标签
   * @param {number} limit - 限制数量
   */
  async getPopularTags(limit = 10) {
    await this.ensureDBInit()
    
    const sql = `
      SELECT kt.name, COUNT(ktm.id) as usage_count
      FROM knowledge_tags kt
      INNER JOIN knowledge_tag_mappings ktm ON kt.id = ktm.tag_id
      GROUP BY kt.id, kt.name
      ORDER BY usage_count DESC
      LIMIT ?
    `
    
    const result = await dbService.query(sql, [limit])
    return result
  }

  /**
   * 删除标签
   * @param {number} tagId - 标签ID
   */
  async deleteTag(tagId) {
    await this.ensureDBInit()
    
    // 删除标签关联
    await dbService.delete('knowledge_tag_mappings', 'tag_id = ?', [tagId])
    
    // 删除标签
    await dbService.delete('knowledge_tags', 'id = ?', [tagId])
    
    return true
  }

  /**
   * 获取关联项目
   * @param {number} knowledgeId - 知识ID
   */
  async getRelatedProjects(knowledgeId) {
    await this.ensureDBInit()
    
    const sql = `
      SELECT p.id, p.name, p.description, p.status
      FROM projects p
      INNER JOIN project_knowledge_mappings pkm ON p.id = pkm.project_id
      WHERE pkm.knowledge_id = ?
    `
    
    const result = await dbService.query(sql, [knowledgeId])
    return result
  }

  /**
   * 获取所有可关联的项目列表
   * @param {number} userId - 用户ID
   */
  async getAllProjects(userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    const sql = `
      SELECT id, name, description, status
      FROM projects
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `
    
    const result = await dbService.query(sql, [currentUserId])
    return result
  }

  /**
   * 获取相关知识（基于项目关联）
   * @param {number} knowledgeId - 当前知识ID
   * @param {number} limit - 返回数量限制，默认5个
   */
  async getRelatedKnowledge(knowledgeId, limit = 5) {
    await this.ensureDBInit()
    
    console.log(`=== 开始获取知识 ${knowledgeId} 的相关知识 ===`)
    
    // 检查project_knowledge_mappings表是否存在
    try {
      const tableCheckSql = `
        SELECT name FROM sqlite_master WHERE type='table' AND name='project_knowledge_mappings'
      `
      const tableExists = await dbService.query(tableCheckSql)
      console.log('project_knowledge_mappings表是否存在:', tableExists.length > 0)
      
      if (tableExists.length === 0) {
        console.log('project_knowledge_mappings表不存在，返回空列表')
        return []
      }
    } catch (error) {
      console.error('检查表存在性失败:', error)
      return []
    }
    
    // 检查表中是否有数据
    try {
      const allMappings = await dbService.query('SELECT * FROM project_knowledge_mappings LIMIT 10')
      console.log('project_knowledge_mappings表中的数据:', allMappings)
    } catch (error) {
      console.error('查询映射表数据失败:', error)
    }
    
    // 首先检查当前知识是否关联了任何项目
    const projectCheckSql = `
      SELECT project_id FROM project_knowledge_mappings WHERE knowledge_id = ?
    `
    const projects = await dbService.query(projectCheckSql, [knowledgeId])
    
    console.log(`知识 ${knowledgeId} 关联的项目:`, projects)
    
    if (projects.length === 0) {
      console.log(`知识 ${knowledgeId} 没有关联任何项目，返回空的相关知识列表`)
      return []
    }
    
    const sql = `
      SELECT DISTINCT kb.id, kb.title, kb.summary, kb.view_count, kb.updated_at
      FROM knowledge_base kb
      INNER JOIN project_knowledge_mappings pkm1 ON kb.id = pkm1.knowledge_id
      INNER JOIN project_knowledge_mappings pkm2 ON pkm1.project_id = pkm2.project_id
      WHERE pkm2.knowledge_id = ? AND kb.id != ?
      ORDER BY kb.view_count DESC, kb.updated_at DESC
      LIMIT ?
    `
    
    console.log('执行相关知识查询SQL:', sql)
    console.log('查询参数:', [knowledgeId, knowledgeId, limit])
    
    const result = await dbService.query(sql, [knowledgeId, knowledgeId, limit])
    
    console.log(`知识 ${knowledgeId} 的相关知识查询结果:`, result)
    
    // 格式化返回数据
    const formattedResult = result.map(knowledge => ({
      id: knowledge.id,
      title: knowledge.title,
      summary: knowledge.summary || '暂无摘要',
      viewCount: knowledge.view_count || 0,
      updateTime: this.formatUpdateTime(knowledge.updated_at)
    }))
    
    console.log('格式化后的相关知识:', formattedResult)
    console.log(`=== 相关知识获取完成 ===`)
    
    return formattedResult
  }

  /**
   * 移除知识关联（通过移除项目关联实现）
   * @param {number} knowledgeId1 - 第一个知识ID
   * @param {number} knowledgeId2 - 第二个知识ID
   */
  async removeKnowledgeRelation(knowledgeId1, knowledgeId2) {
    await this.ensureDBInit()
    
    try {
      console.log(`移除知识 ${knowledgeId1} 和 ${knowledgeId2} 的关联`)
      
      // 查找两个知识共同关联的项目
      const commonProjectsSql = `
        SELECT DISTINCT pkm1.project_id
        FROM project_knowledge_mappings pkm1
        INNER JOIN project_knowledge_mappings pkm2 ON pkm1.project_id = pkm2.project_id
        WHERE pkm1.knowledge_id = ? AND pkm2.knowledge_id = ?
      `
      
      const commonProjects = await dbService.query(commonProjectsSql, [knowledgeId1, knowledgeId2])
      console.log('共同关联的项目:', commonProjects)
      
      if (commonProjects.length > 0) {
        // 移除第二个知识与这些项目的关联
        for (const project of commonProjects) {
          const deleteSql = `
            DELETE FROM project_knowledge_mappings 
            WHERE project_id = ? AND knowledge_id = ?
          `
          await dbService.query(deleteSql, [project.project_id, knowledgeId2])
          console.log(`移除知识 ${knowledgeId2} 与项目 ${project.project_id} 的关联`)
        }
        
        return true
      } else {
        console.log('没有找到共同关联的项目')
        return false
      }
    } catch (error) {
      console.error('移除知识关联失败:', error)
      throw error
    }
  }

  /**
   * 关联项目
   * @param {number} knowledgeId - 知识ID
   * @param {number} projectId - 项目ID
   */
  async linkProject(knowledgeId, projectId) {
    await this.ensureDBInit()
    
    // 检查是否已经关联
    const existing = await dbService.findOne(
      'project_knowledge_mappings',
      'knowledge_id = ? AND project_id = ?',
      [knowledgeId, projectId]
    )
    
    if (existing) {
      return false // 已经关联
    }
    
    // 创建关联
    await dbService.insert('project_knowledge_mappings', {
      knowledge_id: knowledgeId,
      project_id: projectId,
      created_at: new Date().toISOString()
    })
    
    return true
  }

  /**
   * 取消项目关联
   * @param {number} knowledgeId - 知识ID
   * @param {number} projectId - 项目ID
   */
  async unlinkProject(knowledgeId, projectId) {
    await this.ensureDBInit()
    
    await dbService.delete(
      'project_knowledge_mappings',
      'knowledge_id = ? AND project_id = ?',
      [knowledgeId, projectId]
    )
    
    return true
  }

  /**
   * 获取AI分析
   * @param {number} knowledgeId - 知识ID
   */
  async getAIAnalysis(knowledgeId) {
    await this.ensureDBInit()
    
    const analyses = await dbService.findMany(
      'knowledge_ai_analysis',
      'knowledge_id = ?',
      [knowledgeId],
      'created_at DESC'
    )
    
    const result = {}
    for (let analysis of analyses) {
      result[analysis.analysis_type] = {
        content: analysis.content,
        score: analysis.score,
        created_at: analysis.created_at
      }
    }
    
    return result
  }

  /**
   * 保存AI分析结果
   * @param {number} knowledgeId - 知识ID
   * @param {string} analysisType - 分析类型
   * @param {Object} analysisData - 分析数据
   */
  async saveAIAnalysis(knowledgeId, analysisType, analysisData) {
    await this.ensureDBInit()
    
    const { content, score } = analysisData
    
    // 删除旧的分析结果
    await dbService.delete(
      'knowledge_ai_analysis',
      'knowledge_id = ? AND analysis_type = ?',
      [knowledgeId, analysisType]
    )
    
    // 插入新的分析结果
    await dbService.insert('knowledge_ai_analysis', {
      knowledge_id: knowledgeId,
      analysis_type: analysisType,
      content: typeof content === 'object' ? JSON.stringify(content) : content,
      score: score || null,
      created_at: new Date().toISOString()
    })
    
    return true
  }

  /**
   * 增加浏览量
   * @param {number} knowledgeId - 知识ID
   * @param {number} userId - 用户ID
   */
  async incrementViewCount(knowledgeId, userId = null) {
    await this.ensureDBInit()
    
    // 更新浏览量（移除对不存在的knowledge_views表的操作）
    await dbService.executeSql(
      'UPDATE knowledge_base SET view_count = view_count + 1 WHERE id = ?',
      [knowledgeId]
    )
    
    return true
  }

  /**
   * 收藏/取消收藏知识
   * @param {number} knowledgeId - 知识ID
   * @param {number} userId - 用户ID
   */
  async toggleFavorite(knowledgeId, userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    // 检查是否已收藏
    const existing = await dbService.findOne(
      'favorites',
      'user_id = ? AND target_type = ? AND target_id = ?',
      [currentUserId, 'knowledge', knowledgeId]
    )
    
    if (existing) {
      // 取消收藏
      await dbService.delete('favorites', 'id = ?', [existing.id])
      return false
    } else {
      // 添加收藏
      await dbService.insert('favorites', {
        user_id: currentUserId,
        target_type: 'knowledge',
        target_id: knowledgeId,
        created_at: new Date().toISOString()
      })
      return true
    }
  }

  /**
   * 获取收藏的知识列表
   * @param {number} userId - 用户ID
   */
  async getFavoriteKnowledge(userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    const sql = `
      SELECT kb.*, f.created_at as favorite_time
      FROM knowledge_base kb
      INNER JOIN favorites f ON kb.id = f.target_id
      WHERE f.user_id = ? AND f.target_type = 'knowledge'
      ORDER BY f.created_at DESC
    `
    
    const result = await dbService.query(sql, [currentUserId])
    
    // 为每个知识获取标签信息
    for (let knowledge of result) {
      knowledge.tags = await this.getKnowledgeTags(knowledge.id)
      knowledge.updateTime = this.formatUpdateTime(knowledge.updated_at)
    }
    
    return result
  }

  /**
   * 搜索知识
   * @param {string} keyword - 搜索关键词
   * @param {Object} options - 搜索选项
   * @param {number} userId - 用户ID
   */
  async searchKnowledge(keyword, options = {}, userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    const { category, limit = 20, offset = 0 } = options
    
    let where = 'user_id = ? AND (title LIKE ? OR summary LIKE ? OR content LIKE ?)'
    let params = [currentUserId, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
    
    if (category && category !== 'all') {
      where += ' AND category = ?'
      params.push(category)
    }
    
    const orderBy = 'updated_at DESC'
    const limitClause = `${limit} OFFSET ${offset}`
    
    const result = await dbService.findMany('knowledge_base', where, params, orderBy, limitClause)
    
    // 为每个知识获取标签信息
    for (let knowledge of result) {
      knowledge.tags = await this.getKnowledgeTags(knowledge.id)
      knowledge.updateTime = this.formatUpdateTime(knowledge.updated_at)
    }
    
    return result
  }

  /**
   * 获取知识统计信息
   * @param {number} userId - 用户ID
   */
  async getKnowledgeStats(userId = null) {
    await this.ensureDBInit()
    
    const currentUserId = userId || userStore.getCurrentUserId()
    
    const stats = {}
    
    // 总知识数
    stats.totalCount = await dbService.count('knowledge_base', 'user_id = ?', [currentUserId])
    
    // 已发布知识数 (由于没有status字段，暂时等于总数)
    stats.publishedCount = await dbService.count('knowledge_base', 'user_id = ?', [currentUserId])
    
    // 草稿数 (由于没有status字段，暂时为0)
    stats.draftCount = 0
    
    // 总浏览量
    const viewResult = await dbService.query(
      'SELECT SUM(view_count) as total_views FROM knowledge_base WHERE user_id = ?',
      [currentUserId]
    )
    stats.totalViews = viewResult[0]?.total_views || 0
    
    // 收藏数
    stats.favoriteCount = await dbService.count('favorites', 'user_id = ? AND target_type = "knowledge"', [currentUserId])
    
    // 分类统计 (由于没有category字段，返回空数组)
    stats.categoryStats = []
    console.log('stats',stats)
    return stats
  }

  /**
   * 生成摘要（简单实现）
   * @param {string} content - 内容
   */
  generateSummary(content) {
    if (!content) return ''
    
    // 简单的摘要生成：取前200个字符
    const summary = content.replace(/\n/g, ' ').substring(0, 200)
    return summary + (content.length > 200 ? '...' : '')
  }

  /**
   * 格式化更新时间
   * @param {string} time - 时间字符串
   */
  formatUpdateTime(time) {
    if (!time) return ''
    
    const now = new Date()
    const updateTime = new Date(time)
    const diff = now - updateTime
    
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (minutes < 1) {
      return '刚刚'
    } else if (minutes < 60) {
      return `${minutes}分钟前`
    } else if (hours < 24) {
      return `${hours}小时前`
    } else if (days < 7) {
      return `${days}天前`
    } else {
      return updateTime.toLocaleDateString()
    }
  }
}

const knowledgeApi = new KnowledgeApi()

export default knowledgeApi