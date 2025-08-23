// 内容适配器 - 用于将不同类型的数据转换为统一的卡片数据格式

/**
 * 文本截断工具函数
 * @param {string} text - 原始文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
function truncateText(text, maxLength) {
  if (!text || typeof text !== 'string') return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * 格式化日期显示
 * @param {string|Date} dateTime - 日期时间
 * @param {string} format - 格式化模式，默认'YYYY-MM-DD'
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(dateTime, format = 'YYYY-MM-DD') {
  if (!dateTime) return ''
  
  const date = new Date(dateTime)
  if (isNaN(date.getTime())) return ''
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  
  switch (format) {
    case 'MM-DD':
      return `${month}-${day}`
    case 'YYYY-MM-DD HH:mm':
      return `${year}-${month}-${day} ${hour}:${minute}`
    default:
      return `${year}-${month}-${day}`
  }
}

/**
 * 基础内容适配器
 */
class BaseContentAdapter {
  constructor(data, options = {}) {
    this.rawData = data
    this.options = {
      maxContentLength: 200,
      maxTitleLength: 50,
      showBranding: true,
      ...options
    }
  }

  // 获取适配后的内容数据
  getAdaptedContent() {
    return {
      title: this.getTitle(),
      content: this.getContent(),
      author: this.getAuthor(),
      timestamp: this.getTimestamp(),
      tags: this.getTags(),
      progress: this.getProgress(),
      milestones: this.getMilestones(),
      meta: this.getMeta(),
      extra: this.getExtra()
    }
  }

  getTitle() {
    return truncateText(this.rawData.title || '无标题', this.options.maxTitleLength)
  }

  getContent() {
    return truncateText(this.rawData.content || '', this.options.maxContentLength)
  }

  getAuthor() {
    return this.rawData.author || 'Project-Z'
  }

  getTimestamp() {
    return formatDate(this.rawData.timestamp || this.rawData.updateTime || Date.now())
  }

  getTags() {
    return this.rawData.tags || []
  }

  getProgress() {
    return this.rawData.progress
  }

  getMilestones() {
    return this.rawData.milestones || []
  }

  getMeta() {
    return {}
  }

  getExtra() {
    return this.rawData.extra || {}
  }
}

/**
 * 知识库内容适配器
 */
export class KnowledgeContentAdapter extends BaseContentAdapter {
  getContent() {
    // 优先使用摘要，如果没有摘要则使用主要内容
    const content = this.rawData.summary || this.rawData.content || ''
    return truncateText(content, this.options.maxContentLength)
  }

  getAuthor() {
    return '知识管理'
  }

  getMeta() {
    return {
      type: 'knowledge',
      viewCount: this.rawData.viewCount || 0,
      favoriteCount: this.rawData.favoriteCount || 0
    }
  }

  getExtra() {
    return {
      knowledgeId: this.rawData.id,
      summary: this.rawData.summary,
      fullContent: this.rawData.content
    }
  }
}

/**
 * 项目内容适配器
 */
export class ProjectContentAdapter extends BaseContentAdapter {
  getContent() {
    const goal = this.rawData.goal || this.rawData.content || ''
    return truncateText(goal, this.options.maxContentLength)
  }

  getAuthor() {
    return '项目管理'
  }

  getProgress() {
    if (this.rawData.progress !== undefined) {
      return this.rawData.progress
    }
    
    // 根据里程碑计算进度
    const milestones = this.getMilestones()
    if (milestones.length === 0) return 0
    
    const completedCount = milestones.filter(m => m.status === 'completed').length
    return Math.round((completedCount / milestones.length) * 100)
  }

  getMilestones() {
    const milestones = this.rawData.milestones || []
    return milestones.slice(0, 5).map(milestone => ({
      id: milestone.id,
      title: truncateText(milestone.title, 30),
      status: milestone.status,
      progress: milestone.progress || 0
    }))
  }

  getMeta() {
    const milestones = this.getMilestones()
    const completedCount = milestones.filter(m => m.status === 'completed').length
    
    return {
      type: 'project',
      totalMilestones: milestones.length,
      completedMilestones: completedCount,
      progress: this.getProgress()
    }
  }

  getExtra() {
    return {
      projectId: this.rawData.id,
      goal: this.rawData.goal,
      fullMilestones: this.rawData.milestones
    }
  }
}

/**
 * 项目日志内容适配器
 */
export class ProjectLogContentAdapter extends BaseContentAdapter {
  getTitle() {
    return `项目日志 - ${formatDate(this.rawData.time || Date.now(), 'MM-DD')}`
  }

  getContent() {
    let content = ''
    
    if (this.rawData.content) {
      content += this.rawData.content
    }
    
    if (this.rawData.progressText) {
      content += content ? '\n\n' : ''
      content += `进展：${this.rawData.progressText}`
    }
    
    if (this.rawData.problemText) {
      content += content ? '\n\n' : ''
      content += `问题：${this.rawData.problemText}`
    }
    
    if (this.rawData.planText) {
      content += content ? '\n\n' : ''
      content += `计划：${this.rawData.planText}`
    }
    
    return truncateText(content, this.options.maxContentLength)
  }

  getAuthor() {
    return '项目日志'
  }

  getTimestamp() {
    return formatDate(this.rawData.time || Date.now())
  }

  getTags() {
    const tags = []
    if (this.rawData.progressText) tags.push('进展')
    if (this.rawData.problemText) tags.push('问题')
    if (this.rawData.planText) tags.push('计划')
    return tags
  }

  getMeta() {
    return {
      type: 'log',
      hasProgress: !!this.rawData.progressText,
      hasProblem: !!this.rawData.problemText,
      hasPlan: !!this.rawData.planText
    }
  }

  getExtra() {
    return {
      logId: this.rawData.id,
      originalContent: this.rawData.content,
      progressText: this.rawData.progressText,
      problemText: this.rawData.problemText,
      planText: this.rawData.planText
    }
  }
}

/**
 * AI分析内容适配器
 */
export class AIAnalysisContentAdapter extends BaseContentAdapter {
  getTitle() {
    return this.rawData.title || 'AI智能分析'
  }

  getContent() {
    return truncateText(this.rawData.analysis || this.rawData.content || '', this.options.maxContentLength)
  }

  getAuthor() {
    return 'AI助手'
  }

  getTags() {
    const tags = ['AI分析']
    if (this.rawData.type) {
      tags.push(this.rawData.type)
    }
    return tags
  }

  getMeta() {
    return {
      type: 'analysis',
      confidence: this.rawData.confidence,
      analysisType: this.rawData.analysisType
    }
  }

  getExtra() {
    return {
      analysis: this.rawData.analysis,
      recommendations: this.rawData.recommendations,
      insights: this.rawData.insights
    }
  }
}

/**
 * 内容适配器工厂
 */
export class ContentAdapterFactory {
  static create(contentType, data, options = {}) {
    switch (contentType) {
      case 'knowledge':
        return new KnowledgeContentAdapter(data, options)
      case 'project':
        return new ProjectContentAdapter(data, options)
      case 'log':
        return new ProjectLogContentAdapter(data, options)
      case 'analysis':
        return new AIAnalysisContentAdapter(data, options)
      default:
        return new BaseContentAdapter(data, options)
    }
  }
}

// 导出便捷函数
export function adaptContent(contentType, data, options = {}) {
  const adapter = ContentAdapterFactory.create(contentType, data, options)
  return adapter.getAdaptedContent()
}