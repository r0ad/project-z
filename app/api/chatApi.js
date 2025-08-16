/**
 * 聊天API服务
 * 处理聊天历史的数据库操作
 */
import dbService from '@/utils/dbService.js'

class ChatApi {
  /**
   * 创建新的对话
   * @param {Object} params 参数对象
   * @param {number} params.projectId 项目ID
   * @param {string} params.title 对话标题
   * @param {string} params.createdAt 创建时间
   * @returns {Promise<Object>} 对话对象
   */
  async createConversation(params) {
    try {
      await dbService.initDB()
      
      const conversationId = await dbService.insert('chat_conversations', {
        project_id: params.projectId,
        title: params.title || `对话 ${new Date().toLocaleString()}`,
        created_at: params.createdAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      
      console.log('创建对话成功:', conversationId)
      return { id: conversationId, ...params }
    } catch (error) {
      console.error('创建对话失败:', error)
      throw error
    }
  }
  
  /**
   * 获取项目的对话列表
   * @param {number} projectId 项目ID
   * @returns {Promise<Array>} 对话列表
   */
  async getConversations(projectId) {
    try {
      await dbService.initDB()
      
      const conversations = await dbService.query(
        'SELECT * FROM chat_conversations WHERE project_id = ? ORDER BY updated_at DESC',
        [projectId]
      )
      
      return conversations
    } catch (error) {
      console.error('获取对话列表失败:', error)
      return []
    }
  }
  
  /**
   * 根据项目ID获取对话列表
   * @param {number} projectId 项目ID
   * @returns {Promise<Array>} 对话列表
   */
  async getConversationsByProject(projectId) {
    try {
      await dbService.initDB()
      
      const conversations = await dbService.query(
        'SELECT * FROM chat_conversations WHERE project_id = ? ORDER BY updated_at DESC',
        [projectId]
      )
      
      return conversations
    } catch (error) {
      console.error('获取项目对话列表失败:', error)
      return []
    }
  }
  
  /**
   * 获取对话的消息历史
   * @param {number} conversationId 对话ID
   * @param {number} limit 限制数量
   * @returns {Promise<Array>} 消息列表
   */
  async getMessages(conversationId, limit = 50) {
    try {
      await dbService.initDB()
      
      const messages = await dbService.query(
        'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT ?',
        [conversationId, limit]
      )
      
      // 解析metadata
      return messages.map(msg => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }))
    } catch (error) {
      console.error('获取消息历史失败:', error)
      return []
    }
  }
  
  /**
   * 根据对话ID获取消息列表
   * @param {number} conversationId 对话ID
   * @param {Object} options 选项
   * @param {number} options.offset 偏移量
   * @param {number} options.limit 限制数量
   * @returns {Promise<Array>} 消息列表
   */
  async getMessagesByConversation(conversationId, options = {}) {
    try {
      await dbService.initDB()
      
      const { offset = 0, limit = 50 } = options
      
      const messages = await dbService.query(
        'SELECT * FROM chat_messages WHERE conversation_id = ? ORDER BY timestamp ASC LIMIT ? OFFSET ?',
        [conversationId, limit, offset]
      )
      
      return messages
    } catch (error) {
      console.error('获取对话消息失败:', error)
      return []
    }
  }
  
  /**
   * 添加消息到对话
   * @param {Object} params 参数对象
   * @param {number} params.conversationId 对话ID
   * @param {string} params.role 角色 (user/assistant)
   * @param {string} params.content 消息内容
   * @param {string} params.createdAt 创建时间
   * @param {Object} params.metadata 元数据
   * @returns {Promise<number>} 消息ID
   */
  async addMessage(params) {
    try {
      await dbService.initDB()
      
      const messageId = await dbService.insert('chat_messages', {
        conversation_id: params.conversationId,
        role: params.role,
        content: params.content,
        timestamp: params.timestamp || new Date().toISOString(),
        metadata: params.metadata ? JSON.stringify(params.metadata) : null
      })
      
      // 更新对话的最后更新时间（dbService会自动设置updated_at）
      await dbService.update(
        'chat_conversations',
        {},
        'id = ?',
        [params.conversationId]
      )
      
      return messageId
    } catch (error) {
      console.error('添加消息失败:', error)
      throw error
    }
  }
  
  /**
   * 更新对话标题
   * @param {number} conversationId 对话ID
   * @param {string} title 新标题
   * @returns {Promise<boolean>} 是否成功
   */
  async updateConversationTitle(conversationId, title) {
    try {
      await dbService.initDB()
      
      await dbService.update(
        'chat_conversations',
        { title: title },
        'id = ?',
        [conversationId]
      )
      
      return true
    } catch (error) {
      console.error('更新对话标题失败:', error)
      return false
    }
  }
  
  /**
   * 删除对话及其所有消息
   * @param {number} conversationId 对话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async deleteConversation(conversationId) {
    try {
      await dbService.initDB()
      
      // 删除对话的所有消息
      await dbService.delete('chat_messages', 'conversation_id = ?', [conversationId])
      
      // 删除对话
      await dbService.delete('chat_conversations', 'id = ?', [conversationId])
      
      return true
    } catch (error) {
      console.error('删除对话失败:', error)
      return false
    }
  }
  
  /**
   * 清空对话的所有消息
   * @param {number} conversationId 对话ID
   * @returns {Promise<boolean>} 是否成功
   */
  async clearMessages(conversationId) {
    try {
      await dbService.initDB()
      
      await dbService.delete('chat_messages', 'conversation_id = ?', [conversationId])
      
      // 更新对话的最后更新时间
      await dbService.update(
        'chat_conversations',
        {},
        'id = ?',
        [conversationId]
      )
      
      return true
    } catch (error) {
      console.error('清空消息失败:', error)
      return false
    }
  }
  
  /**
   * 获取项目的最近聊天记录
   * @param {number} projectId 项目ID
   * @param {number} limit 限制数量
   * @returns {Promise<Array>} 最近消息列表
   */
  async getRecentMessages(projectId, limit = 10) {
    try {
      await dbService.initDB()
      
      const messages = await dbService.query(`
        SELECT cm.*, cc.title as conversation_title 
        FROM chat_messages cm 
        JOIN chat_conversations cc ON cm.conversation_id = cc.id 
        WHERE cc.project_id = ? 
        ORDER BY cm.timestamp DESC 
        LIMIT ?
      `, [projectId, limit])
      
      // 解析metadata
      return messages.map(msg => ({
        ...msg,
        metadata: msg.metadata ? JSON.parse(msg.metadata) : null
      }))
    } catch (error) {
      console.error('获取最近聊天记录失败:', error)
      return []
    }
  }
}

// 创建单例实例
const chatApi = new ChatApi()

export default chatApi