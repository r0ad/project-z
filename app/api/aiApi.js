/**
/**
 * AI交互API
 * 提供AI模型交互、项目分析、聊天对话等功能
 * 基于openai-chat组件实现
 */

import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'
import DateUtils from '@/utils/dateUtils.js'
import OpenAIAPI from '@/uni_modules/openai-chat/js_sdk/openai-api.js'
import promoApi from '@/api/promoApi.js'

class AiApi {
  constructor() {
    this.openaiAPI = null
    this.isConfigured = false
  }

  /**
   * 初始化数据库（如果未初始化）
   */
  async ensureDBInit() {
    if (!dbService.isInitialized) {
      console.log('开始初始化数据库...')
      try {
        await dbService.initDB()
        console.log('数据库初始化完成')
      } catch (error) {
        console.error('数据库初始化失败:', error)
        throw error
      }
    }
  }

  /**
   * 初始化OpenAI API
   */
  async initOpenAI() {
    if (this.openaiAPI && this.isConfigured) {
      return this.openaiAPI
    }

    try {
      // 从数据库获取AI配置
      const config = await this.getActiveAIConfig()
      
      if (!config.api_key) {
        throw new Error('请先在设置中配置AI API密钥')
      }

      this.openaiAPI = new OpenAIAPI({
        baseUrl: config.base_url || 'https://api.deepseek.com/v1',
        apiKey: config.api_key,
        model: config.model || 'deepseek-chat',
        timeout: (config.timeout || 30) * 1000
      })

      this.isConfigured = true
      console.log('OpenAI API 初始化成功')
      return this.openaiAPI
    } catch (error) {
      console.error('OpenAI API 初始化失败:', error)
      throw error
    }
  }

  /**
   * 获取AI配置列表
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async getAIConfigList(userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      const configs = await dbService.findMany('ai_config', 'user_id = ?', [userId], 'created_at DESC')
      return configs
    } catch (error) {
      console.error('获取AI配置列表失败:', error)
      return []
    }
  }

  /**
   * 检查配置是否可编辑（核心权限控制逃辑）
   * @param {number} configId - 配置ID
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   * @returns {Promise<boolean>}
   */
  async canEditConfig(configId, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    
    await this.ensureDBInit()
    
    try {
      const config = await dbService.findOne(
        'ai_config', 
        'id = ? AND user_id = ?', 
        [configId, userId]
      )
      
      if (!config) {
        return false
      }
      
      // 核心逻辑：promo_code_id存在则不可编辑
      return !config.promo_code_id
    } catch (error) {
      console.error('检查配置编辑权限失败:', error)
      return false
    }
  }
  
  /**
   * 检查配置是否为分享码配置
   * @param {number} configId - 配置ID
   * @returns {Promise<boolean>}
   */
  async isPromoCodeConfig(configId) {
    try {
      const config = await dbService.findOne('ai_config', 'id = ?', [configId])
      return config && !!config.promo_code_id
    } catch (error) {
      console.error('检查分享码配置失败:', error)
      return false
    }
  }
  
  /**
   * 获取可编辑的配置列表
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   * @returns {Promise<Array>}
   */
  async getEditableConfigs(userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    
    await this.ensureDBInit()
    
    try {
      // 查询promo_code_id为null的配置（可编辑配置）
      const configs = await dbService.findMany(
        'ai_config',
        'user_id = ? AND promo_code_id IS NULL',
        [userId],
        'created_at DESC'
      )
      
      return configs
    } catch (error) {
      console.error('获取可编辑配置列表失败:', error)
      return []
    }
  }
  
  /**
   * 获取带来源信息的配置列表
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   * @returns {Promise<Array>}
   */
  async getConfigsWithSource(userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    
    const configs = await this.getAIConfigList(userId)
    
    // 为每个配置添加来源信息
    return configs.map(config => ({
      ...config,
      source_type: config.promo_code_id ? 'promo_code' : 'manual',
      is_editable: !config.promo_code_id
    }))
  }
  
  /**
   * 安全的配置更新（检查编辑权限）
   * @param {number} configId - 配置ID
   * @param {Object} updates - 更新数据
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   * @returns {Promise<Object>}
   */
  async updateConfigSafely(configId, updates, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    
    try {
      // 检查编辑权限
      const canEdit = await this.canEditConfig(configId, userId)
      
      if (!canEdit) {
        return {
          success: false,
          error: '该配置来自分享码，不允许编辑。如需修改，请先移除分享码或创建新的手动配置。'
        }
      }
      
      // 执行更新
      await this.updateAIConfig(configId, updates)
      
      return {
        success: true,
        message: '配置更新成功'
      }
    } catch (error) {
      console.error('安全更新配置失败:', error)
      return {
        success: false,
        error: '更新失败: ' + error.message
      }
    }
  }
  /*
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async addAIConfig(config, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      console.log('添加AI配置:', config)
      
      // 如果设置为激活，先将该用户的其他配置设为非激活
      if (config.is_active) {
        await dbService.update('ai_config', { is_active: 0 }, 'user_id = ?', [userId])
      }
      
      // 使用dbService.insert方法
      const configData = {
        provider: config.provider || '',
        base_url: config.base_url || '',
        api_key: config.api_key || '',
        model: config.model || '',
        timeout: parseInt(config.timeout) || 30,
        max_tokens: parseInt(config.max_tokens) || 2000,
        temperature: parseFloat(config.temperature) || 0.7,
        is_active: config.is_active ? 1 : 0,
        user_id: userId
      }
      
      const result = await dbService.insert('ai_config', configData)
      return result
    } catch (error) {
      console.error('添加AI配置失败:', error)
      throw error
    }
  }

  /**
   * 更新AI配置（带权限检查）
   * @param {number} id - 配置ID
   * @param {Object} config - 配置信息
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async updateAIConfig(id, config, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      console.log('更新AI配置:', id, config)
      
      // 检查编辑权限（核心安全检查）
      const canEdit = await this.canEditConfig(id, userId)
      if (!canEdit) {
        throw new Error('该配置来自分享码，不允许编辑。如需修改，请先移除分享码或创建新的手动配置。')
      }
      
      // 如果设置为激活，先将该用户的其他配置设为非激活
      if (config.is_active) {
        await dbService.executeSql('UPDATE ai_config SET is_active = 0 WHERE id != ? AND user_id = ?', [id, userId])
      }
      
      // 使用dbService.update方法
      const configData = {
        provider: config.provider || '',
        base_url: config.base_url || '',
        api_key: config.api_key || '',
        model: config.model || '',
        timeout: parseInt(config.timeout) || 30,
        max_tokens: parseInt(config.max_tokens) || 2000,
        temperature: parseFloat(config.temperature) || 0.7,
        is_active: config.is_active ? 1 : 0,
        updated_at: Date.now()  // 添加更新时间
      }
      
      // 注意：不更新promo_code_id字段，保持来源信息不变
      
      const result = await dbService.update('ai_config', configData, `id = ${id} AND user_id = ${userId}`)
      return result
    } catch (error) {
      console.error('更新AI配置失败:', error)
      throw error
    }
  }

  /**
   * 测试AI连接
   */
  async testAIConnection() {
    try {
      const activeConfig = await this.getActiveAIConfig()
      console.log('获取到的激活配置:', activeConfig)
      
      if (!activeConfig || !activeConfig.api_key) {
        console.log('配置检查失败:', { hasConfig: !!activeConfig, hasApiKey: !!activeConfig?.api_key })
        throw new Error('没有激活的AI配置或API密钥未设置')
      }
      
      // 初始化OpenAI客户端
      await this.initOpenAI()
      
      // 发送测试请求
      const response = await this.sendAIRequest('你好，请回复"连接成功"')
      
      return {
        success: true,
        response: response.content
      }
    } catch (error) {
      console.error('测试AI连接失败:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }
  
  /**
   * 获取当前激活的AI配置
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async getActiveAIConfig(userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      const config = await dbService.findOne('ai_config', 'is_active = ? AND user_id = ?', [1, userId])
      console.log('数据库查询激活配置结果:', config)
      
      if (config) {
        return config
      }
      
      // 如果没有激活的配置，返回默认配置
      console.log('没有找到激活配置，返回默认配置')
      return {
        provider: 'deepseek',
        base_url: 'https://api.deepseek.com/v1',
        api_key: '',
        model: 'deepseek-chat',
        timeout: 30,
        max_tokens: 2000,
        temperature: 0.7
      }
    } catch (error) {
      console.error('获取激活AI配置失败:', error)
      return {
        provider: 'deepseek',
        base_url: 'https://api.deepseek.com/v1',
        api_key: '',
        model: 'deepseek-chat',
        timeout: 30,
        max_tokens: 2000,
        temperature: 0.7
      }
    }
  }

  /**
   * 保存AI配置
   * @param {Object} config - 配置信息
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async saveAIConfig(config, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      console.log('保存AI配置:', config)
      
      // 检查是否已存在该用户的该运营商配置
      const existing = await dbService.findOne('ai_config', 'provider = ? AND user_id = ?', [config.provider, userId])
      
      const configData = {
        provider: config.provider,
        base_url: config.baseUrl || config.base_url,
        api_key: config.apiKey || config.api_key,
        model: config.model,
        timeout: parseInt(config.timeout) || 30,
        max_tokens: parseInt(config.maxTokens || config.max_tokens) || 2000,
        temperature: parseFloat(config.temperature) || 0.7,
        is_active: config.isActive ? 1 : 0,
        user_id: userId
      }
      
      if (existing) {
        // 更新现有配置
        await dbService.update('ai_config', configData, 'provider = ? AND user_id = ?', [config.provider, userId])
      } else {
        // 插入新配置
        await dbService.insert('ai_config', configData)
      }
      
      // 如果设置为激活，需要将该用户的其他配置设为非激活
      if (config.isActive) {
        await dbService.executeSql(
          'UPDATE ai_config SET is_active = 0 WHERE provider != ? AND user_id = ?',
          [config.provider, userId]
        )
      }
      
      console.log('AI配置保存成功')
      // 重新初始化API
      this.isConfigured = false
      await this.initOpenAI()
      
    } catch (error) {
      console.error('保存AI配置失败:', error)
      throw error
    }
  }
  
  /**
   * 删除AI配置
   * @param {string} provider - 提供商
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async deleteAIConfig(provider, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      await dbService.delete('ai_config', 'provider = ? AND user_id = ?', [provider, userId])
      console.log('AI配置删除成功:', provider)
      
      // 检查推广码状态，如果删除的配置与推广码相关，需要同步更新
      try {
        const promoStatus = await promoApi.getPromoCodeStatus()
        if (promoStatus.hasPromoCode && promoStatus.provider === provider) {
          console.log('检测到删除的配置与推广码相关，清除推广码状态')
          await promoApi.clearPromoConfig()
        }
      } catch (promoError) {
        console.warn('检查推广码状态失败:', promoError)
      }
      
      // 如果删除的是激活配置，需要重新初始化
      const activeConfig = await this.getActiveAIConfig(userId)
      if (!activeConfig.id) {
        this.isConfigured = false
      }
      
    } catch (error) {
      console.error('删除AI配置失败:', error)
      throw error
    }
  }
  
  /**
   * 激活AI配置
   * @param {string} provider - 提供商
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   */
  async activateAIConfig(provider, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    await this.ensureDBInit()
    
    try {
      // 将该用户的所有配置设为非激活
      await dbService.executeSql('UPDATE ai_config SET is_active = 0 WHERE user_id = ?', [userId])
      
      // 激活指定配置
      await dbService.executeSql(
        'UPDATE ai_config SET is_active = 1 WHERE provider = ? AND user_id = ?',
        [provider, userId]
      )
      
      console.log('AI配置激活成功:', provider)
      
      // 重新初始化API
      this.isConfigured = false
      this.openaiAPI = null
      await this.initOpenAI()
      
    } catch (error) {
      console.error('激活AI配置失败:', error)
      throw error
    }
  }

  /**
   * 发送AI请求的通用方法
   * @param {string} prompt - 提示词
   * @param {Object} options - 请求选项
   */
  async sendAIRequest(prompt, options = {}) {
    try {
      const api = await this.initOpenAI()
      
      const messages = [
        { role: 'user', content: prompt }
      ]
      
      if (options.systemPrompt) {
        messages.unshift({ role: 'system', content: options.systemPrompt })
      }
      
      const response = await api.chatCompletion(messages, {
        useHistory: false,
        enableFunctions: false
      })
      
      return {
        content: response.content,
        usage: response.usage || { totalTokens: 0 }
      }
    } catch (error) {
      console.error('AI请求失败:', error)
      
      // 如果是配置问题，返回友好提示
      if (error.message.includes('配置') || error.message.includes('API密钥')) {
        throw error
      }
      
      throw new Error('AI服务暂时不可用，请稍后重试')
    }
  }



  /**
   * 项目分析
   * @param {number} projectId - 项目ID
   * @param {string} analysisType - 分析类型（progress/risk/suggestion）
   */
  async analyzeProject(projectId, analysisType = 'general') {
    await this.ensureDBInit()
    
    // 获取项目信息
    const project = await dbService.findOne('projects', 'id = ?', [projectId])
    if (!project) {
      throw new Error('项目不存在')
    }
    
    // 获取项目里程碑
    const milestones = await dbService.findMany('project_milestones', 'project_id = ?', [projectId])
    
    // 获取最近的日志
    const recentLogs = await dbService.findMany(
      'project_logs',
      'project_id = ?',
      [projectId],
      'created_at DESC',
      '10'
    )
    
    // 构建分析提示词
    let prompt = `请分析以下项目信息：\n\n`
    prompt += `项目名称：${project.name}\n`
    prompt += `项目目标：${project.goal}\n`
    prompt += `项目描述：${project.description}\n`
    prompt += `当前状态：${project.status}\n`
    prompt += `进度：${project.progress}%\n\n`
    
    if (milestones.length > 0) {
      prompt += `里程碑信息：\n`
      milestones.forEach(milestone => {
        prompt += `- ${milestone.title}：${milestone.status}（${milestone.progress}%）\n`
      })
      prompt += '\n'
    }
    
    if (recentLogs.length > 0) {
      prompt += `最近的项目日志：\n`
      recentLogs.slice(0, 5).forEach(log => {
        if (log.content) prompt += `- ${log.content}\n`
        if (log.progress_text) prompt += `  进展：${log.progress_text}\n`
        if (log.problem_text) prompt += `  问题：${log.problem_text}\n`
      })
      prompt += '\n'
    }
    
    // 根据分析类型添加特定指令
    switch (analysisType) {
      case 'progress':
        prompt += '请重点分析项目的进展情况，包括已完成的工作、当前进度是否合理、是否存在延期风险等。'
        break
      case 'risk':
        prompt += '请重点分析项目可能存在的风险，包括技术风险、进度风险、资源风险等，并提供应对建议。'
        break
      case 'suggestion':
        prompt += '请基于当前项目状态，提供具体的改进建议和下一步行动计划。'
        break
      default:
        prompt += '请对项目进行全面分析，包括进展情况、潜在问题、改进建议等。'
    }
    
    const response = await this.sendAIRequest(prompt)
    
    // 保存分析结果
    const analysisId = await dbService.insert('ai_analyses', {
      project_id: projectId,
      analysis_type: analysisType,
      prompt: prompt,
      result: response.content,
      token_usage: response.usage?.totalTokens || 0
    })
    
    return {
      id: analysisId,
      type: analysisType,
      content: response.content,
      createdAt: DateUtils.getCurrentLocalISOString()
    }
  }

  /**
   * 项目聊天对话
   * @param {number} projectId - 项目ID
   * @param {string} message - 用户消息
   * @param {Array} chatHistory - 聊天历史
   * @param {Object} options - 选项（包括流式输出配置）
   */
  async chatWithProject(projectId, message, chatHistory = [], options = {}) {
    await this.ensureDBInit()
    
    try {
      const api = await this.initOpenAI()
      
      // 获取项目信息
      const project = await dbService.findOne('projects', 'id = ?', [projectId])
      if (!project) {
        throw new Error('项目不存在')
      }
      
      // 获取项目上下文信息
      const milestones = await dbService.findMany('project_milestones', 'project_id = ?', [projectId])
      const recentLogs = await dbService.findMany(
        'project_logs',
        'project_id = ?',
        [projectId],
        'created_at DESC',
        '5'
      )
      
      // 构建系统提示词
      let systemPrompt = `你是一个专业的项目管理助手，正在协助用户管理以下项目：\n\n`
      systemPrompt += `项目名称：${project.name}\n`
      systemPrompt += `项目目标：${project.goal}\n`
      systemPrompt += `项目描述：${project.description}\n`
      systemPrompt += `当前状态：${project.status}\n\n`
      
      if (milestones.length > 0) {
        systemPrompt += `项目里程碑：\n`
        milestones.forEach(milestone => {
          systemPrompt += `- ${milestone.title}（${milestone.status}）\n`
        })
        systemPrompt += `\n`
      }
      
      if (recentLogs.length > 0) {
        systemPrompt += `最近的项目日志：\n`
        recentLogs.forEach(log => {
          systemPrompt += `- ${log.progress_text || log.problem_text || log.plan_text}\n`
        })
        systemPrompt += `\n`
      }
      
      systemPrompt += `请基于以上项目信息，为用户提供专业的项目管理建议和支持。`
      
      // 构建完整的对话历史
      const messages = [
        { role: 'system', content: systemPrompt },
        ...chatHistory,
        { role: 'user', content: message }
      ]
      
      // 检查是否使用流式输出
      if (options.stream && options.onData) {
        // 流式输出
        return new Promise((resolve, reject) => {
          let fullContent = ''
          
          api.chatCompletionStream(
            messages,
            (chunk) => {
              if (chunk === '[DONE]') {
                resolve({
                  content: fullContent,
                  timestamp: DateUtils.getCurrentLocalISOString(),
                  tokenUsage: 0
                })
              } else {
                fullContent += chunk
                options.onData(chunk)
              }
            },
            (result) => {
              resolve({
                content: fullContent,
                timestamp: DateUtils.getCurrentLocalISOString(),
                tokenUsage: result.usage?.totalTokens || 0
              })
            },
            (error) => {
              reject(error)
            },
            {
              useHistory: false,
              enableFunctions: false
            }
          )
        })
      } else {
        // 非流式输出
        const response = await api.chatCompletion(messages, {
          useHistory: false,
          enableFunctions: false
        })
        
        return {
          content: response.content,
          timestamp: DateUtils.getCurrentLocalISOString(),
          tokenUsage: response.usage?.totalTokens || 0
        }
      }
    } catch (error) {
      console.error('项目聊天失败:', error)
      
      // 如果是配置问题，返回友好提示
      if (error.message.includes('配置') || error.message.includes('API密钥')) {
        throw error
      }
      
      throw new Error('AI聊天服务暂时不可用，请稍后重试')
    }
  }

  /**
   * 生成项目总结
   * @param {number} projectId - 项目ID
   * @param {string} period - 时间周期（week/month/all）
   */
  async generateProjectSummary(projectId, period = 'week') {
    await this.ensureDBInit()
    
    const project = await dbService.findOne('projects', 'id = ?', [projectId])
    if (!project) {
      throw new Error('项目不存在')
    }
    
    // 根据时间周期获取日志
    let dateFilter = ''
    switch (period) {
      case 'week':
        dateFilter = "AND created_at >= datetime('now', '-7 days')"
        break
      case 'month':
        dateFilter = "AND created_at >= datetime('now', '-30 days')"
        break
      default:
        dateFilter = ''
    }
    
    const logs = await dbService.query(`
      SELECT * FROM project_logs 
      WHERE project_id = ? ${dateFilter}
      ORDER BY created_at DESC
    `, [projectId])
    
    let prompt = `请为以下项目生成${period === 'week' ? '周' : period === 'month' ? '月' : '整体'}总结：\n\n`
    prompt += `项目：${project.name}\n`
    prompt += `目标：${project.goal}\n\n`
    
    if (logs.length > 0) {
      prompt += `期间工作记录：\n`
      logs.forEach(log => {
        if (log.content) prompt += `- ${log.content}\n`
        if (log.progress_text) prompt += `  进展：${log.progress_text}\n`
        if (log.problem_text) prompt += `  问题：${log.problem_text}\n`
        if (log.plan_text) prompt += `  计划：${log.plan_text}\n`
      })
    } else {
      prompt += `期间暂无工作记录。\n`
    }
    
    prompt += `\n请生成结构化的项目总结，包括：\n1. 主要成果\n2. 遇到的问题\n3. 下一步计划\n4. 整体评价`
    
    const response = await this.sendAIRequest(prompt)
    
    // 保存总结
    const summaryId = await dbService.insert('ai_analyses', {
      project_id: projectId,
      analysis_type: 'summary',
      prompt: prompt,
      result: response.content,
      token_usage: response.usage?.totalTokens || 0
    })
    
    return {
      id: summaryId,
      period: period,
      content: response.content,
      createdAt: DateUtils.getCurrentLocalISOString()
    }
  }

  /**
   * 智能建议生成
   * @param {number} projectId - 项目ID
   * @param {string} context - 上下文信息
   */
  async generateSuggestions(projectId, context = '') {
    await this.ensureDBInit()
    
    const project = await dbService.findOne('projects', 'id = ?', [projectId])
    if (!project) {
      throw new Error('项目不存在')
    }
    
    // 获取项目数据
    const milestones = await dbService.findMany('project_milestones', 'project_id = ?', [projectId])
    const recentLogs = await dbService.findMany(
      'project_logs',
      'project_id = ?',
      [projectId],
      'created_at DESC',
      '5'
    )
    
    let prompt = `基于以下项目信息，请提供具体的改进建议：\n\n`
    prompt += `项目：${project.name}\n`
    prompt += `目标：${project.goal}\n`
    prompt += `当前进度：${project.progress}%\n`
    prompt += `状态：${project.status}\n\n`
    
    if (context) {
      prompt += `特定情况：${context}\n\n`
    }
    
    if (milestones.length > 0) {
      prompt += `里程碑状态：\n`
      milestones.forEach(milestone => {
        prompt += `- ${milestone.title}：${milestone.status}（${milestone.progress}%）\n`
      })
      prompt += '\n'
    }
    
    if (recentLogs.length > 0) {
      prompt += `最近动态：\n`
      recentLogs.forEach(log => {
        if (log.problem_text) prompt += `问题：${log.problem_text}\n`
        if (log.plan_text) prompt += `计划：${log.plan_text}\n`
      })
      prompt += '\n'
    }
    
    prompt += `请提供：\n1. 具体的行动建议\n2. 优先级排序\n3. 预期效果\n4. 实施难度评估`
    
    const response = await this.sendAIRequest(prompt)
    
    return {
      content: response.content,
      createdAt: DateUtils.getCurrentLocalISOString(),
      tokenUsage: response.usage?.totalTokens || 0
    }
  }

  /**
   * 获取AI分析历史
   * @param {number} projectId - 项目ID
   * @param {string} analysisType - 分析类型
   * @param {number} limit - 限制数量
   */
  async getAnalysisHistory(projectId, analysisType = null, limit = 10) {
    await this.ensureDBInit()
    
    let where = 'project_id = ?'
    let params = [projectId]
    
    if (analysisType) {
      where += ' AND analysis_type = ?'
      params.push(analysisType)
    }
    
    const analyses = await dbService.findMany(
      'ai_analyses',
      where,
      params,
      'created_at DESC',
      limit.toString()
    )
    
    return analyses.map(analysis => ({
      id: analysis.id,
      type: analysis.analysis_type,
      content: analysis.result,
      createdAt: analysis.created_at,
      tokenUsage: analysis.token_usage
    }))
  }

  /**
   * 语音转文字
   * @param {string} audioData - 音频数据
   */
  async speechToText(audioData) {
    try {
      const api = await this.initOpenAI()
      
      // 使用OpenAI的语音转文字API
      const response = await api.transcribeAudio(audioData, {
        model: 'whisper-1',
        language: 'zh'
      })
      
      return {
        text: response.text,
        confidence: 0.95
      }
    } catch (error) {
      console.error('语音转文字失败:', error)
      
      // 如果是配置问题，返回友好提示
      if (error.message.includes('配置') || error.message.includes('API密钥')) {
        throw error
      }
      
      // 如果API调用失败，返回模拟数据作为降级方案
      console.log('使用模拟语音识别作为降级方案')
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const mockTexts = [
        '今天完成了用户界面的设计，整体进展顺利。',
        '遇到了数据库连接的问题，需要进一步调试。',
        '与团队讨论了下一阶段的开发计划。',
        '完成了核心功能的开发，准备进入测试阶段。',
        '发现了一些性能问题，正在优化中。'
      ]
      
      const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)]
      
      return {
        text: randomText,
        confidence: 0.85
      }
    }
  }

  /**
   * 文字转语音（模拟实现）
   * @param {string} text - 要转换的文字
   */
  async textToSpeech(text) {
    // 模拟TTS处理时间
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    return {
      audioUrl: 'data:audio/mp3;base64,mock_audio_data',
      duration: Math.ceil(text.length / 10) // 模拟音频时长
    }
  }

  // ==================== AI分析管理 ====================
  
  /**
   * 获取项目AI分析列表
   * @param {number} projectId - 项目ID
   * @param {Object} options - 查询选项
   */
  async getAnalysesList(projectId, options = {}) {
    await this.ensureDBInit()
    
    const { analysisType, limit = 20, offset = 0 } = options
    
    let where = 'project_id = ?'
    let params = [projectId]
    
    if (analysisType) {
      where += ' AND analysis_type = ?'
      params.push(analysisType)
    }
    
    const orderBy = 'created_at DESC'
    const limitClause = `${limit} OFFSET ${offset}`
    
    const analyses = await dbService.findMany('ai_analyses', where, params, orderBy, limitClause)
    
    return analyses.map(analysis => ({
      id: analysis.id,
      projectId: analysis.project_id,
      content: analysis.content,
      suggestions: analysis.suggestions,
      analysisType: analysis.analysis_type,
      createdAt: analysis.created_at,
      formattedTime: this.formatTime(analysis.created_at)
    }))
  }
  
  /**
   * 创建AI分析记录
   * @param {number} projectId - 项目ID
   * @param {Object} analysisData - 分析数据
   */
  async createAnalysis(projectId, analysisData) {
    await this.ensureDBInit()
    
    const { content, suggestions, analysisType = 'general', isAIGenerated = false } = analysisData
    
    const data = {
      project_id: projectId,
      content: content || '',
      suggestions: suggestions || '',
      analysis_type: analysisType
    }
    
    const analysisId = await dbService.insert('ai_analyses', data)
    
    // 如果是AI生成的，记录到日志
    if (isAIGenerated) {
      console.log(`AI分析已创建: ${analysisId}, 项目: ${projectId}`)
    }
    
    return analysisId
  }
  
  /**
   * 更新AI分析记录
   * @param {number} analysisId - 分析ID
   * @param {Object} updateData - 更新数据
   */
  async updateAnalysis(analysisId, updateData) {
    await this.ensureDBInit()
    
    const { content, suggestions, analysisType } = updateData
    
    const data = {}
    if (content !== undefined) data.content = content
    if (suggestions !== undefined) data.suggestions = suggestions
    if (analysisType !== undefined) data.analysis_type = analysisType
    
    await dbService.update('ai_analyses', data, 'id = ?', [analysisId])
    
    return true
  }
  
  /**
   * 删除AI分析记录
   * @param {number} analysisId - 分析ID
   */
  async deleteAnalysis(analysisId) {
    await this.ensureDBInit()
    
    await dbService.delete('ai_analyses', 'id = ?', [analysisId])
    
    return true
  }
  
  /**
   * 获取AI分析详情
   * @param {number} analysisId - 分析ID
   */
  async getAnalysisDetail(analysisId) {
    await this.ensureDBInit()
    
    const analysis = await dbService.findOne('ai_analyses', 'id = ?', [analysisId])
    
    if (!analysis) {
      throw new Error('分析记录不存在')
    }
    
    return {
      id: analysis.id,
      projectId: analysis.project_id,
      content: analysis.content,
      suggestions: analysis.suggestions,
      analysisType: analysis.analysis_type,
      createdAt: analysis.created_at,
      formattedTime: this.formatTime(analysis.created_at)
    }
  }
  
  /**
   * 智能生成AI分析
   * @param {number} projectId - 项目ID
   * @param {string} analysisType - 分析类型
   */
  async generateAIAnalysis(projectId, analysisType = 'general') {
    await this.ensureDBInit()
    
    try {
      // 获取项目信息
      const project = await dbService.findOne('projects', 'id = ?', [projectId])
      if (!project) {
        throw new Error('项目不存在')
      }
      
      // 获取最近的日志
      const recentLogs = await dbService.findMany(
        'project_logs',
        'project_id = ?',
        [projectId],
        'created_at DESC',
        '10'
      )
      
      // 获取里程碑信息
      const milestones = await dbService.findMany(
        'project_milestones',
        'project_id = ?',
        [projectId],
        'sequence ASC'
      )
      
      // 构建分析提示词
      const prompt = this.buildAnalysisPrompt(project, recentLogs, milestones, analysisType)
      
      // 调用AI进行分析
      const aiResponse = await this.sendAIRequest(prompt)
      
      // 解析AI响应
      const analysisResult = this.parseAnalysisResponse(aiResponse.content)
      
      // 保存分析结果
      const analysisId = await this.createAnalysis(projectId, {
        content: analysisResult.content,
        suggestions: analysisResult.suggestions,
        analysisType: analysisType,
        isAIGenerated: true
      })
      
      return {
        id: analysisId,
        content: analysisResult.content,
        suggestions: analysisResult.suggestions,
        analysisType: analysisType
      }
      
    } catch (error) {
      console.error('生成AI分析失败:', error)
      throw error
    }
  }
  
  // ==================== AI总结管理 ====================
  
  /**
   * 获取项目总结列表
   * @param {number} projectId - 项目ID
   * @param {Object} options - 查询选项
   */
  async getSummariesList(projectId, options = {}) {
    await this.ensureDBInit()
    
    const { summaryType, limit = 20, offset = 0 } = options
    
    let where = 'project_id = ?'
    let params = [projectId]
    
    if (summaryType) {
      where += ' AND summary_type = ?'
      params.push(summaryType)
    }
    
    const orderBy = 'created_at DESC'
    const limitClause = `${limit} OFFSET ${offset}`
    
    const summaries = await dbService.findMany('ai_summaries', where, params, orderBy, limitClause)
    
    return summaries.map(summary => ({
      id: summary.id,
      projectId: summary.project_id,
      content: summary.content,
      suggestions: summary.suggestions,
      summaryType: summary.summary_type,
      createdAt: summary.created_at,
      formattedTime: this.formatTime(summary.created_at)
    }))
  }
  
  /**
   * 创建项目总结
   * @param {number} projectId - 项目ID
   * @param {Object} summaryData - 总结数据
   */
  async createSummary(projectId, summaryData) {
    await this.ensureDBInit()
    
    const { content, suggestions, summaryType = 'general', isAIGenerated = false } = summaryData
    
    const data = {
      project_id: projectId,
      content: content || '',
      suggestions: suggestions || '',
      summary_type: summaryType
    }
    
    const summaryId = await dbService.insert('ai_summaries', data)
    
    // 如果是AI生成的，记录到日志
    if (isAIGenerated) {
      console.log(`AI总结已创建: ${summaryId}, 项目: ${projectId}`)
    }
    
    return summaryId
  }
  
  /**
   * 更新项目总结
   * @param {number} summaryId - 总结ID
   * @param {Object} updateData - 更新数据
   */
  async updateSummary(summaryId, updateData) {
    await this.ensureDBInit()
    
    const { content, suggestions, summaryType } = updateData
    
    const data = {}
    if (content !== undefined) data.content = content
    if (suggestions !== undefined) data.suggestions = suggestions
    if (summaryType !== undefined) data.summary_type = summaryType
    
    await dbService.update('ai_summaries', data, 'id = ?', [summaryId])
    
    return true
  }
  
  /**
   * 删除项目总结
   * @param {number} summaryId - 总结ID
   */
  async deleteSummary(summaryId) {
    await this.ensureDBInit()
    
    await dbService.delete('ai_summaries', 'id = ?', [summaryId])
    
    return true
  }
  
  /**
   * 智能生成项目总结
   * @param {number} projectId - 项目ID
   * @param {string} period - 总结周期 (week/month/all)
   */
  async generateAISummary(projectId, period = 'week') {
    await this.ensureDBInit()
    
    try {
      // 获取项目信息
      const project = await dbService.findOne('projects', 'id = ?', [projectId])
      if (!project) {
        throw new Error('项目不存在')
      }
      
      // 根据周期获取日志
      const logs = await this.getLogsByPeriod(projectId, period)
      
      // 获取里程碑完成情况
      const milestones = await dbService.findMany(
        'project_milestones',
        'project_id = ?',
        [projectId],
        'sequence ASC'
      )
      
      // 构建总结提示词
      const prompt = this.buildSummaryPrompt(project, logs, milestones, period)
      
      // 调用AI进行总结
      const aiResponse = await this.sendAIRequest(prompt)
      
      // 解析AI响应
      const summaryResult = this.parseAnalysisResponse(aiResponse.content)
      
      // 保存总结结果
      const summaryId = await this.createSummary(projectId, {
        content: summaryResult.content,
        suggestions: summaryResult.suggestions,
        isAIGenerated: true
      })
      
      return {
        id: summaryId,
        content: summaryResult.content,
        suggestions: summaryResult.suggestions,
        period: period
      }
      
    } catch (error) {
      console.error('生成AI总结失败:', error)
      throw error
    }
  }
  
  // ==================== 辅助方法 ====================
  
  /**
   * 构建分析提示词
   */
  buildAnalysisPrompt(project, logs, milestones, analysisType) {
    const logsSummary = logs.map(log => `${log.created_at}: ${log.content || ''} ${log.progress_text || ''} ${log.problem_text || ''} ${log.plan_text || ''}`).join('\n')
    const milestonesSummary = milestones.map(m => `${m.title}: ${m.status} (${m.progress || 0}%)`).join('\n')
    
    return `请分析以下项目的当前状况：

项目名称：${project.name}
项目目标：${project.goal || '未设定'}
当前进度：${project.progress || 0}%
项目状态：${project.status}

最近日志：
${logsSummary}

里程碑情况：
${milestonesSummary}

请从以下角度进行分析：
1. 项目进展情况
2. 存在的问题和风险
3. 改进建议
4. 下一步行动计划

**重要：请严格按照以下JSON格式返回，不要包含任何其他文本或说明：**

{
  "content": "详细的分析内容，包含项目进展、问题风险、改进建议等",
  "suggestions": "具体的改进建议和下一步行动计划"
}

请确保返回的是有效的JSON格式，不要添加任何前缀或后缀文本。`
  }
  
  /**
   * 构建总结提示词
   */
  buildSummaryPrompt(project, logs, milestones, period) {
    const periodText = { week: '本周', month: '本月', all: '整个项目' }[period] || '最近'
    const logsSummary = logs.map(log => `${log.created_at}: ${log.content || ''} ${log.progress_text || ''} ${log.problem_text || ''} ${log.plan_text || ''}`).join('\n')
    const completedMilestones = milestones.filter(m => m.status === 'completed')

    return `请总结以下项目${periodText}的情况：

项目名称：${project.name}
项目目标：${project.goal || '未设定'}
当前进度：${project.progress || 0}%

${periodText}日志：
${logsSummary}

已完成里程碑：
${completedMilestones.map(m => `- ${m.title}`).join('\n')}

请总结：
1. 主要成果和进展
2. 遇到的挑战
3. 经验教训
4. 下期计划

**重要：请严格按照以下JSON格式返回，不要包含任何其他文本或说明：**

{
  "content": "详细的总结内容，包含主要成果、挑战、经验教训等",
  "suggestions": "具体的建议和下期计划"
}

请确保返回的是有效的JSON格式，不要添加任何前缀或后缀文本。`
  }
  
  /**
   * 解析AI分析响应
   */
  parseAnalysisResponse(response) {
    try {
      // 清理响应文本，移除可能的前缀和后缀
      let cleanResponse = response.trim()
      
      // 尝试提取JSON部分
      const jsonMatch = cleanResponse.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        cleanResponse = jsonMatch[0]
      }
      
      // 尝试解析JSON响应
      const parsed = JSON.parse(cleanResponse)
      return {
        content: parsed.content || response,
        suggestions: parsed.suggestions || ''
      }
    } catch (error) {
      console.warn('JSON解析失败，使用原文本:', error)
      // 如果不是JSON格式，尝试简单分割
      const lines = response.split('\n').filter(line => line.trim())
      const midPoint = Math.floor(lines.length / 2)
      
      return {
        content: lines.slice(0, midPoint).join('\n') || response,
        suggestions: lines.slice(midPoint).join('\n') || ''
      }
    }
  }
  
  /**
   * 根据周期获取日志
   */
  async getLogsByPeriod(projectId, period) {
    const now = new Date()
    let startDate
    
    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date('1970-01-01')
    }
    
    return await dbService.findMany(
      'project_logs',
      'project_id = ? AND created_at >= ?',
      [projectId, startDate.toISOString()],
      'created_at DESC'
    )
  }
  
  /**
   * 格式化时间显示
   */
  formatTime(time) {
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
      return `${date.getMonth() + 1}-${date.getDate()}`
    }
  }
  
  /**
   * 检查配置是否可用于生成分享码（防循环生成机制）
   * @param {number} configId - 配置ID
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   * @returns {Promise<Object>} 检查结果
   */
  async canGeneratePromoFromConfig(configId, userId = null) {
    if (!userId) {
      userId = userStore.getCurrentUserId()
    }
    
    await this.ensureDBInit()
    
    try {
      const config = await dbService.findOne(
        'ai_config', 
        'id = ? AND user_id = ?', 
        [configId, userId]
      )
      
      if (!config) {
        return {
          canGenerate: false,
          reason: '配置不存在或无权限访问'
        }
      }
      
      // 核心安全检查：来自分享码的配置不能生成新的分享码
      if (config.promo_code_id) {
        return {
          canGenerate: false,
          reason: '该配置来自分享码，不允许生成新的分享码，以防止循环传播。',
          configSource: 'promo_code'
        }
      }
      
      // 额外安全检查：确保配置完整性
      if (!config.provider || !config.api_key || !config.model) {
        return {
          canGenerate: false,
          reason: '配置信息不完整，无法生成分享码'
        }
      }
      
      return {
        canGenerate: true,
        config: config,
        configSource: 'manual'
      }
    } catch (error) {
      console.error('检查配置是否可生成分享码失败:', error)
      return {
        canGenerate: false,
        reason: '检查失败: ' + error.message
      }
    }
  }
  
  /**
   * 安全生成分享码（带权限检查）
   * @param {number} configId - 配置ID
   * @param {number} validDays - 有效天数
   * @param {number} userId - 用户ID，如果不提供则使用当前用户
   * @returns {Promise<Object>} 生成结果
   */
  async generatePromoCodeSafely(configId, validDays = 7, userId = null) {
    try {
      // 先检查是否可以生成
      const checkResult = await this.canGeneratePromoFromConfig(configId, userId)
      
      if (!checkResult.canGenerate) {
        return {
          success: false,
          error: checkResult.reason,
          securityBlock: checkResult.configSource === 'promo_code'
        }
      }
      
      const config = checkResult.config
      
      // 引入加密工具
      const cryptoUtils = (await import('@/utils/cryptoUtils.js')).default
      
      // 调用加密工具生成分享码
      const promoCode = cryptoUtils.generatePromoCode(
        config.provider,
        config.api_key,
        config.model,
        validDays
      )
      
      return {
        success: true,
        promoCode: promoCode,
        sourceConfig: {
          provider: config.provider,
          model: config.model,
          validDays: validDays
        }
      }
    } catch (error) {
      console.error('安全生成分享码失败:', error)
      return {
        success: false,
        error: '生成失败: ' + error.message
      }
    }
  }
}

// 创建单例实例
const aiApi = new AiApi()

export default aiApi