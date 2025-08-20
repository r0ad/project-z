/**
 * 推广码API
 * 提供推广码的验证、存储、管理等功能
 */

import cryptoUtils from '@/utils/cryptoUtils.js'
import dbService from '@/utils/dbService.js'

class PromoApi {
  constructor() {
    this.STORAGE_KEY = 'promo_code_config'
    this.BACKUP_STORAGE_KEY = 'ai_config_backup'
  }

  /**
   * 验证推广码
   * @param {string} promoCode 推广码
   * @returns {Promise<Object>} 验证结果
   */
  async validatePromoCode(promoCode) {
    try {
      if (!promoCode || typeof promoCode !== 'string') {
        return {
          success: false,
          error: '推广码不能为空'
        }
      }

      // 使用加密工具验证推广码（支持标准版和压缩版）
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
      console.error('验证推广码失败:', error)
      return {
        success: false,
        error: '推广码验证失败: ' + error.message
      }
    }
  }

  /**
   * 应用推广码配置
   * @param {string} promoCode 推广码
   * @returns {Promise<Object>} 应用结果
   */
  async applyPromoCode(promoCode) {
    try {
      // 先验证推广码
      const validation = await this.validatePromoCode(promoCode)
      if (!validation.success) {
        return validation
      }

      const promoData = validation.data

      // 备份当前AI配置
      await this.backupCurrentAIConfig()

      // 应用推广码配置
      const aiConfig = {
        provider: promoData.provider,
        apiKey: promoData.apiKey,
        modelName: promoData.model,  // 使用model字段
        isActive: true,
        fromPromoCode: true,
        promoCodeAppliedAt: Date.now()
      }

      // 保存AI配置到本地存储
      await this.saveAIConfig(aiConfig)

      // 保存推广码信息
      const promoConfig = {
        code: promoCode,
        appliedAt: Date.now(),
        expiresAt: promoData.expiresAt,
        provider: promoData.provider,
        modelName: promoData.modelName
      }
      await this.savePromoConfig(promoConfig)

      return {
        success: true,
        message: '推广码应用成功',
        config: aiConfig,
        remainingDays: validation.remainingDays
      }
    } catch (error) {
      console.error('应用推广码失败:', error)
      return {
        success: false,
        error: '应用推广码失败: ' + error.message
      }
    }
  }

  /**
   * 备份当前AI配置
   * @returns {Promise<void>}
   */
  async backupCurrentAIConfig() {
    try {
      // 获取当前AI配置
      const currentConfig = uni.getStorageSync('ai_config') || {}
      
      // 添加备份时间戳
      const backup = {
        ...currentConfig,
        backedUpAt: Date.now()
      }

      // 保存备份
      uni.setStorageSync(this.BACKUP_STORAGE_KEY, backup)
      
      console.log('AI配置备份成功')
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

      // 移除备份时间戳
      const { backedUpAt, ...config } = backup
      
      // 恢复配置
      uni.setStorageSync('ai_config', config)
      
      // 清除推广码配置
      await this.clearPromoConfig()

      return {
        success: true,
        message: '配置恢复成功',
        config: config
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
   * 保存推广码配置
   * @param {Object} config 推广码配置
   * @returns {Promise<void>}
   */
  async savePromoConfig(config) {
    try {
      uni.setStorageSync(this.STORAGE_KEY, config)
    } catch (error) {
      console.error('保存推广码配置失败:', error)
      throw error
    }
  }

  /**
   * 获取推广码配置
   * @returns {Promise<Object|null>} 推广码配置
   */
  async getPromoConfig() {
    try {
      return uni.getStorageSync(this.STORAGE_KEY) || null
    } catch (error) {
      console.error('获取推广码配置失败:', error)
      return null
    }
  }

  /**
   * 清除推广码配置
   * @returns {Promise<void>}
   */
  async clearPromoConfig() {
    try {
      uni.removeStorageSync(this.STORAGE_KEY)
    } catch (error) {
      console.error('清除推广码配置失败:', error)
      throw error
    }
  }

  /**
   * 检查推广码是否过期
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
        // 推广码已过期，清除相关配置
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
      console.error('检查推广码过期失败:', error)
      return {
        hasPromoCode: false,
        expired: false,
        error: error.message
      }
    }
  }

  /**
   * 处理过期的推广码
   * @returns {Promise<void>}
   */
  async handleExpiredPromoCode() {
    try {
      // 清除推广码配置
      await this.clearPromoConfig()
      
      // 尝试恢复备份的AI配置
      const restoreResult = await this.restoreBackupAIConfig()
      
      if (!restoreResult.success) {
        // 如果恢复失败，清除当前AI配置
        uni.removeStorageSync('ai_config')
      }
      
      console.log('已处理过期的推广码')
    } catch (error) {
      console.error('处理过期推广码失败:', error)
      throw error
    }
  }

  /**
   * 获取推广码状态信息
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
      console.error('获取推广码状态失败:', error)
      return {
        hasPromoCode: false,
        hasBackup: false,
        error: error.message
      }
    }
  }

  /**
   * 移除推广码配置并恢复原配置
   * @returns {Promise<Object>} 移除结果
   */
  async removePromoCode() {
    try {
      const promoConfig = await this.getPromoConfig()
      
      if (!promoConfig) {
        return {
          success: false,
          error: '没有找到推广码配置'
        }
      }

      // 恢复备份配置
      const restoreResult = await this.restoreBackupAIConfig()
      
      return {
        success: true,
        message: '推广码已移除',
        restored: restoreResult.success
      }
    } catch (error) {
      console.error('移除推广码失败:', error)
      return {
        success: false,
        error: '移除推广码失败: ' + error.message
      }
    }
  }
}

// 导出单例
const promoApi = new PromoApi()
export default promoApi