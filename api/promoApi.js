/**
 * 分享码API
 * 提供分享码的验证、存储、管理等功能
 */

import cryptoUtils from '@/utils/cryptoUtils.js'
import dbService from '@/utils/dbService.js'
import userStore from '@/utils/userStore.js'

class PromoApi {
  constructor() {
    this.STORAGE_KEY = 'promo_code_config'
    this.BACKUP_STORAGE_KEY = 'ai_config_backup'
  }

  /**
   * 验证分享码
   * @param {string} promoCode 分享码
   * @returns {Promise<Object>} 验证结果
   */
  async validatePromoCode(promoCode) {
    try {
      if (!promoCode || typeof promoCode !== 'string') {
        return {
          success: false,
          error: '分享码不能为空'
        }
      }

      // 使用加密工具验证分享码（支持标准版和压缩版）
      const validation = cryptoUtils.validatePromoCodeUniversal(promoCode)
      
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error,
          expired: validation.expired || false
        }
      }

      return {
        success: true,
        data: validation.data,
        remainingDays: validation.remainingDays
      }
    } catch (error) {
      console.error('验证分享码失败:', error)
      return {
        success: false,
        error: '分享码验证失败: ' + error.message
      }
    }
  }

  /**
   * 生成分享码唯一标识符
   * @param {string} promoCode 分享码
   * @returns {string} 唯一标识符
   */
  generatePromoCodeId(promoCode) {
    // 使用分享码和时间戳生成唯一ID
    const timestamp = Date.now()
    // 使用简单的哈希算法生成短哈希
    let hash = 0
    const str = promoCode + timestamp
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    const hashStr = Math.abs(hash).toString(36).substring(0, 12)
    return `promo_${hashStr}_${timestamp}`
  }

  /**
   * 应用分享码配置（优化版）
   * @param {string} promoCode 分享码
   * @returns {Promise<Object>} 应用结果
   */
  async applyPromoCode(promoCode) {
    try {
      // 先验证分享码
      const validation = await this.validatePromoCode(promoCode)
      if (!validation.success) {
        return validation
      }

      const promoData = validation.data
      const userId = userStore.getCurrentUserId()
      const promoCodeId = this.generatePromoCodeId(promoCode)

      // 确保数据库已初始化
      await dbService.initDB()

      // 检查是否已存在相同provider的分享码配置
      const existingPromoConfig = await dbService.query(
        'SELECT * FROM ai_config WHERE user_id = ? AND provider = ? AND promo_code_id IS NOT NULL', 
        [userId, promoData.provider]
      )

      // 如果存在分享码配置，提示用户
      if (existingPromoConfig.length > 0) {
        return {
          success: false,
          error: `已存在来自分享码的${promoData.provider}配置，请先移除后再应用新的分享码`
        }
      }

      // 检查是否已存在相同provider的手动配置
      const existingManualConfig = await dbService.query(
        'SELECT * FROM ai_config WHERE user_id = ? AND provider = ? AND promo_code_id IS NULL', 
        [userId, promoData.provider]
      )

      // 备份当前激活的AI配置（仅在没有备份或配置有变化时备份）
      const shouldBackup = existingManualConfig.length === 0 || 
                          existingManualConfig[0].api_key !== promoData.apiKey || 
                          existingManualConfig[0].model !== promoData.model
      
      if (shouldBackup) {
        await this.backupCurrentAIConfig()
      }

      // 先将所有现有配置设为非激活状态
      await dbService.update('ai_config', { is_active: 0 }, 'user_id = ?', [userId])

      // 准备AI配置数据（符合优化后的数据库表结构）
      const aiConfig = {
        user_id: userId,
        provider: promoData.provider,
        base_url: promoData.baseUrl || 'https://api.deepseek.com/v1',
        api_key: promoData.apiKey,
        model: promoData.model,
        timeout: promoData.timeout || 130,
        max_tokens: promoData.maxTokens || 2000,
        temperature: promoData.temperature || 0.7,
        is_active: 1,
        promo_code_id: promoCodeId,  // 核心：设置分享码关联ID
        created_at: Date.now(),
        updated_at: Date.now()
      }

      // 使用INSERT OR REPLACE避免UNIQUE约束冲突，并包含新的promo_code_id字段
      await dbService.executeSql(
        'INSERT OR REPLACE INTO ai_config (user_id, provider, base_url, api_key, model, timeout, max_tokens, temperature, is_active, promo_code_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [aiConfig.user_id, aiConfig.provider, aiConfig.base_url, aiConfig.api_key, aiConfig.model, aiConfig.timeout, aiConfig.max_tokens, aiConfig.temperature, aiConfig.is_active, aiConfig.promo_code_id, aiConfig.created_at, aiConfig.updated_at]
      )

      // 保存分享码信息到本地存储（保持原有兼容性）
      const promoConfig = {
        id: promoCodeId,  // 添加ID关联
        code: promoCode,
        appliedAt: Date.now(),
        expiresAt: promoData.expiresAt,
        provider: promoData.provider,
        modelName: promoData.model
      }
      await this.savePromoConfig(promoConfig)

      return {
        success: true,
        message: '分享码应用成功',
        config: aiConfig,
        promoCodeId: promoCodeId,
        remainingDays: validation.remainingDays
      }
    } catch (error) {
      console.error('应用分享码失败:', error)
      return {
        success: false,
        error: '应用分享码失败: ' + error.message
      }
    }
  }

  /**
   * 备份当前AI配置
   * @returns {Promise<void>}
   */
  async backupCurrentAIConfig() {
    try {
      const userId = userStore.getCurrentUserId()
      
      // 确保数据库已初始化
      await dbService.initDB()
      
      // 获取当前激活的AI配置（从数据库）
      const currentConfig = await dbService.findOne('ai_config', 'is_active = ? AND user_id = ?', [1, userId])
      
      if (currentConfig) {
        // 添加备份时间戳
        const backup = {
          ...currentConfig,
          backedUpAt: Date.now()
        }

        // 保存备份
        uni.setStorageSync(this.BACKUP_STORAGE_KEY, backup)
        
        console.log('AI配置备份成功')
      } else {
        console.log('没有找到激活的AI配置，跳过备份')
      }
    } catch (error) {
      console.error('备份AI配置失败:', error)
      throw error
    }
  }

  /**
   * 恢复备份的AI配置
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreBackupAIConfig() {
    try {
      const backup = uni.getStorageSync(this.BACKUP_STORAGE_KEY)
      
      if (!backup) {
        return {
          success: false,
          error: '没有找到备份配置'
        }
      }

      const userId = userStore.getCurrentUserId()
      
      // 确保数据库已初始化
      await dbService.initDB()
      
      // 移除备份时间戳和id字段
      const { backedUpAt, id, ...config } = backup
      
      // 先将所有现有配置设为非激活状态
      await dbService.update('ai_config', { is_active: 0 }, 'user_id = ?', [userId])
      
      // 恢复配置到数据库
      const restoreConfig = {
        ...config,
        user_id: userId,
        is_active: 1,
        updated_at: Date.now()
      }
      
      await dbService.insert('ai_config', restoreConfig)
      
      // 清除备份
      uni.removeStorageSync(this.BACKUP_STORAGE_KEY)

      return {
        success: true,
        message: '配置恢复成功',
        config: restoreConfig
      }
    } catch (error) {
      console.error('恢复AI配置失败:', error)
      return {
        success: false,
        error: '恢复配置失败: ' + error.message
      }
    }
  }

  /**
   * 保存AI配置
   * @param {Object} config AI配置
   * @returns {Promise<void>}
   */
  async saveAIConfig(config) {
    try {
      uni.setStorageSync('ai_config', config)
    } catch (error) {
      console.error('保存AI配置失败:', error)
      throw error
    }
  }

  /**
   * 保存分享码配置
   * @param {Object} config 分享码配置
   * @returns {Promise<void>}
   */
  async savePromoConfig(config) {
    try {
      uni.setStorageSync(this.STORAGE_KEY, config)
    } catch (error) {
      console.error('保存分享码配置失败:', error)
      throw error
    }
  }

  /**
   * 获取分享码配置
   * @returns {Promise<Object|null>} 分享码配置
   */
  async getPromoConfig() {
    try {
      return uni.getStorageSync(this.STORAGE_KEY) || null
    } catch (error) {
      console.error('获取分享码配置失败:', error)
      return null
    }
  }

  /**
   * 清除分享码配置
   * @returns {Promise<void>}
   */
  async clearPromoConfig() {
    try {
      uni.removeStorageSync(this.STORAGE_KEY)
    } catch (error) {
      console.error('清除分享码配置失败:', error)
      throw error
    }
  }

  /**
   * 检查分享码是否过期
   * @returns {Promise<Object>} 检查结果
   */
  async checkPromoCodeExpiry() {
    try {
      const promoConfig = await this.getPromoConfig()
      
      if (!promoConfig) {
        return {
          hasPromoCode: false,
          expired: false
        }
      }

      const now = Date.now()
      const expired = now > promoConfig.expiresAt
      
      if (expired) {
        // 分享码已过期，清除相关配置
        await this.handleExpiredPromoCode()
        
        return {
          hasPromoCode: true,
          expired: true,
          expiredAt: promoConfig.expiresAt
        }
      }

      const remainingDays = Math.ceil((promoConfig.expiresAt - now) / (24 * 60 * 60 * 1000))
      
      return {
        hasPromoCode: true,
        expired: false,
        remainingDays: remainingDays,
        config: promoConfig
      }
    } catch (error) {
      console.error('检查分享码过期失败:', error)
      return {
        hasPromoCode: false,
        expired: false,
        error: error.message
      }
    }
  }

  /**
   * 处理过期的分享码
   * @returns {Promise<void>}
   */
  async handleExpiredPromoCode() {
    try {
      // 清除分享码配置
      await this.clearPromoConfig()
      
      // 尝试恢复备份的AI配置
      const restoreResult = await this.restoreBackupAIConfig()
      
      if (!restoreResult.success) {
        // 如果恢复失败，清除当前AI配置
        uni.removeStorageSync('ai_config')
      }
      
      console.log('已处理过期的分享码')
    } catch (error) {
      console.error('处理过期分享码失败:', error)
      throw error
    }
  }

  /**
   * 获取分享码状态信息
   * @returns {Promise<Object>} 状态信息
   */
  async getPromoCodeStatus() {
    try {
      const promoConfig = await this.getPromoConfig()
      const backup = uni.getStorageSync(this.BACKUP_STORAGE_KEY)
      
      if (!promoConfig) {
        return {
          hasPromoCode: false,
          hasBackup: !!backup
        }
      }

      const expiryCheck = await this.checkPromoCodeExpiry()
      
      return {
        hasPromoCode: true,
        expired: expiryCheck.expired,
        remainingDays: expiryCheck.remainingDays,
        provider: promoConfig.provider,
        modelName: promoConfig.modelName,
        appliedAt: promoConfig.appliedAt,
        expiresAt: promoConfig.expiresAt,
        hasBackup: !!backup
      }
    } catch (error) {
      console.error('获取分享码状态失败:', error)
      return {
        hasPromoCode: false,
        hasBackup: false,
        error: error.message
      }
    }
  }

  /**
   * 移除分享码配置并恢复原配置（优化版）
   * @returns {Promise<Object>} 移除结果
   */
  async removePromoCode() {
    try {
      const promoConfig = await this.getPromoConfig()
      
      if (!promoConfig) {
        return {
          success: false,
          error: '没有找到分享码配置'
        }
      }

      const userId = userStore.getCurrentUserId()
      
      // 确保数据库已初始化
      await dbService.initDB()
      
      // 基于promo_code_id精确删除分享码相关的AI配置
      let deletedCount = 0
      if (promoConfig.id) {
        // 新版本：使用promo_code_id精确匹配
        const result = await dbService.delete(
          'ai_config', 
          'user_id = ? AND promo_code_id = ?', 
          [userId, promoConfig.id]
        )
        deletedCount = result.changes || 0
      } else {
        // 兼容旧版本：使用provider匹配并确保只删除分享码配置
        const result = await dbService.delete(
          'ai_config', 
          'user_id = ? AND provider = ? AND promo_code_id IS NOT NULL', 
          [userId, promoConfig.provider]
        )
        deletedCount = result.changes || 0
      }
      
      console.log(`已删除${deletedCount}个分享码配置`)
      
      // 恢复备份配置
      const restoreResult = await this.restoreBackupAIConfig()
      
      // 清除分享码配置
      await this.clearPromoConfig()
      
      return {
        success: true,
        message: '分享码已移除',
        deletedCount: deletedCount,
        restored: restoreResult.success,
        restoreMessage: restoreResult.message
      }
    } catch (error) {
      console.error('移除分享码失败:', error)
      return {
        success: false,
        error: '移除分享码失败: ' + error.message
      }
    }
  }
}

// 导出单例
const promoApi = new PromoApi()
export default promoApi