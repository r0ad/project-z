/**
 * 分享码管理工具类
 * 提供分享码的统一管理接口
 */

import promoApi from '@/api/promoApi.js'
import cryptoUtils from '@/utils/cryptoUtils.js'

class PromoManager {
  constructor() {
    this.initialized = false
    this.checkInterval = null
    this.CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24小时检查一次
  }

  /**
   * 初始化分享码管理器
   * @returns {Promise<void>}
   */
  async init() {
    try {
      if (this.initialized) {
        return
      }

      // 启动时检查分享码有效期
      await this.checkAndHandleExpiry()
      
      // 设置定期检查
      this.startPeriodicCheck()
      
      this.initialized = true
      console.log('分享码管理器初始化完成')
    } catch (error) {
      console.error('分享码管理器初始化失败:', error)
      throw error
    }
  }

  /**
   * 启动定期检查
   */
  startPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
    }

    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAndHandleExpiry()
      } catch (error) {
        console.error('定期检查分享码失败:', error)
      }
    }, this.CHECK_INTERVAL_MS)
  }

  /**
   * 停止定期检查
   */
  stopPeriodicCheck() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  /**
   * 检查并处理分享码过期
   * @returns {Promise<Object>} 检查结果
   */
  async checkAndHandleExpiry() {
    try {
      const expiryResult = await promoApi.checkPromoCodeExpiry()
      
      if (expiryResult.expired) {
        // 分享码已过期，显示提示
        await this.showExpiryNotification(expiryResult.expiredAt)
        
        return {
          expired: true,
          handled: true,
          expiredAt: expiryResult.expiredAt
        }
      }
      
      // 检查是否即将过期（3天内）
      if (expiryResult.hasPromoCode && expiryResult.remainingDays <= 3) {
        await this.showExpiryWarning(expiryResult.remainingDays)
      }
      
      return {
        expired: false,
        remainingDays: expiryResult.remainingDays,
        hasPromoCode: expiryResult.hasPromoCode
      }
    } catch (error) {
      console.error('检查分享码过期失败:', error)
      return {
        expired: false,
        error: error.message
      }
    }
  }

  /**
   * 显示过期通知
   * @param {number} expiredAt 过期时间戳
   * @returns {Promise<void>}
   */
  async showExpiryNotification(expiredAt) {
    const expiredDate = new Date(expiredAt).toLocaleDateString()
    
    uni.showModal({
      title: '分享码已过期',
      content: `您的分享码已于 ${expiredDate} 过期，AI配置已恢复为原始设置。如需继续使用，请联系微信号 codetrend 重新申请分享码。`,
      showCancel: false,
      confirmText: '知道了'
    })
  }

  /**
   * 显示即将过期警告
   * @param {number} remainingDays 剩余天数
   * @returns {Promise<void>}
   */
  async showExpiryWarning(remainingDays) {
    uni.showModal({
      title: '分享码即将过期',
      content: `您的分享码将在 ${remainingDays} 天后过期，请及时联系微信号 codetrend 续期。`,
      showCancel: false,
      confirmText: '知道了'
    })
  }

  /**
   * 应用分享码
   * @param {string} promoCode 分享码
   * @returns {Promise<Object>} 应用结果
   */
  async applyPromoCode(promoCode) {
    try {
      if (!promoCode || !promoCode.trim()) {
        return {
          success: false,
          error: '请输入分享码'
        }
      }

      // 显示加载提示
      uni.showLoading({ title: '验证分享码...' })
      
      const result = await promoApi.applyPromoCode(promoCode.trim())
      
      uni.hideLoading()
      
      if (result.success) {
        // 应用成功，显示成功提示
        uni.showToast({
          title: '分享码应用成功',
          icon: 'success',
          duration: 2000
        })
        
        // 重新启动定期检查
        this.startPeriodicCheck()
      }
      
      return result
    } catch (error) {
      uni.hideLoading()
      console.error('应用分享码失败:', error)
      return {
        success: false,
        error: '应用分享码失败: ' + error.message
      }
    }
  }

  /**
   * 移除分享码
   * @returns {Promise<Object>} 移除结果
   */
  async removePromoCode() {
    try {
      uni.showLoading({ title: '移除分享码...' })
      
      const result = await promoApi.removePromoCode()
      
      uni.hideLoading()
      
      if (result.success) {
        uni.showToast({
          title: '分享码已移除',
          icon: 'success',
          duration: 2000
        })
        
        // 停止定期检查
        this.stopPeriodicCheck()
      }
      
      return result
    } catch (error) {
      uni.hideLoading()
      console.error('移除分享码失败:', error)
      return {
        success: false,
        error: '移除分享码失败: ' + error.message
      }
    }
  }

  /**
   * 获取分享码状态
   * @returns {Promise<Object>} 状态信息
   */
  async getStatus() {
    try {
      return await promoApi.getPromoCodeStatus()
    } catch (error) {
      console.error('获取分享码状态失败:', error)
      return {
        hasPromoCode: false,
        error: error.message
      }
    }
  }

  /**
   * 验证分享码格式
   * @param {string} promoCode 分享码
   * @returns {Promise<Object>} 验证结果
   */
  async validateFormat(promoCode) {
    try {
      return await promoApi.validatePromoCode(promoCode)
    } catch (error) {
      console.error('验证分享码格式失败:', error)
      return {
        success: false,
        error: '验证失败: ' + error.message
      }
    }
  }

  /**
   * 获取分享码详细信息
   * @returns {Promise<Object>} 详细信息
   */
  async getDetails() {
    try {
      const status = await this.getStatus()
      
      if (!status.hasPromoCode) {
        return {
          hasPromoCode: false
        }
      }
      
      const expiryCheck = await this.checkAndHandleExpiry()
      
      return {
        ...status,
        expired: expiryCheck.expired,
        remainingDays: expiryCheck.remainingDays
      }
    } catch (error) {
      console.error('获取分享码详细信息失败:', error)
      return {
        hasPromoCode: false,
        error: error.message
      }
    }
  }

  /**
   * 恢复备份配置
   * @returns {Promise<Object>} 恢复结果
   */
  async restoreBackup() {
    try {
      uni.showLoading({ title: '恢复配置...' })
      
      const result = await promoApi.restoreBackupAIConfig()
      
      uni.hideLoading()
      
      if (result.success) {
        uni.showToast({
          title: '配置恢复成功',
          icon: 'success',
          duration: 2000
        })
      }
      
      return result
    } catch (error) {
      uni.hideLoading()
      console.error('恢复备份配置失败:', error)
      return {
        success: false,
        error: '恢复失败: ' + error.message
      }
    }
  }

  /**
   * 销毁管理器
   */
  destroy() {
    this.stopPeriodicCheck()
    this.initialized = false
  }

  /**
   * 格式化剩余时间显示
   * @param {number} remainingDays 剩余天数
   * @returns {string} 格式化的时间字符串
   */
  formatRemainingTime(remainingDays) {
    if (remainingDays <= 0) {
      return '已过期'
    } else if (remainingDays === 1) {
      return '1天后过期'
    } else if (remainingDays <= 30) {
      return `${remainingDays}天后过期`
    } else {
      const months = Math.floor(remainingDays / 30)
      const days = remainingDays % 30
      if (days === 0) {
        return `${months}个月后过期`
      } else {
        return `${months}个月${days}天后过期`
      }
    }
  }

  /**
   * 获取分享码联系信息
   * @returns {Object} 联系信息
   */
  getContactInfo() {
    return {
      wechat: 'codetrend',
      description: '联系微信号获取分享码',
      instructions: [
        '1. 添加微信号：codetrend',
        '2. 说明需要申请分享码',
        '3. 提供使用场景和需求',
        '4. 获取专属分享码'
      ]
    }
  }
}

// 导出单例
const promoManager = new PromoManager()
export default promoManager