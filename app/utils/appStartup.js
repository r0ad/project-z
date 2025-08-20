/**
 * 应用启动检查工具
 * 处理应用启动时的各种检查逻辑，包括分享码有效期检查
 */

import promoManager from './promoManager.js'

class AppStartup {
	constructor() {
		this.initialized = false
		this.checkInterval = null
	}

	/**
	 * 初始化应用启动检查
	 */
	async init() {
		if (this.initialized) {
			return
		}

		try {
			console.log('[AppStartup] 开始应用启动检查...')
			
			// 初始化分享码管理器
			await promoManager.init()
			
			// 执行分享码有效期检查
			await this.checkPromoCodeValidity()
			
			// 设置定期检查（每小时检查一次）
			// this.setupPeriodicCheck()
			
			this.initialized = true
			console.log('[AppStartup] 应用启动检查完成')
			
		} catch (error) {
			console.error('[AppStartup] 应用启动检查失败:', error)
		}
	}

	/**
	 * 检查分享码有效性
	 */
	async checkPromoCodeValidity() {
		try {
			console.log('[AppStartup] 检查分享码有效性...')
			
			const status = await promoManager.getStatus()
			
			if (!status.hasPromoCode) {
				console.log('[AppStartup] 未发现分享码配置')
				return
			}
			
			console.log('[AppStartup] 分享码状态:', {
				provider: status.provider,
				expired: status.expired,
				remainingDays: status.remainingDays
			})
			
			// 检查是否过期
			if (status.expired) {
				console.log('[AppStartup] 分享码已过期，显示过期通知')
				await this.showExpiredNotification(status)
				return
			}
			
			// 检查是否即将过期（7天内）
			if (status.remainingDays <= 1 && status.remainingDays > 0) {
				console.log('[AppStartup] 分享码即将过期，显示提醒通知')
				await this.showExpiringNotification(status)
				return
			}
			
			console.log('[AppStartup] 分享码状态正常')
			
		} catch (error) {
			console.error('[AppStartup] 分享码有效性检查失败:', error)
		}
	}

	/**
	 * 显示过期通知
	 */
	async showExpiredNotification(status) {
		try {
			const contactInfo = promoManager.getContactInfo()
			
			uni.showModal({
				title: '分享码已过期',
				content: `您的${status.provider}分享码已过期，AI功能可能受到影响。\n\n请联系微信号 ${contactInfo.wechat} 重新申请分享码。`,
				confirmText: '复制微信号',
				cancelText: '稍后处理',
				success: (res) => {
					if (res.confirm) {
						// 复制微信号到剪贴板
						uni.setClipboardData({
							data: contactInfo.wechat,
							success: () => {
								uni.showToast({
									title: '微信号已复制',
									icon: 'success'
								})
							}
						})
					}
				}
			})
			
		} catch (error) {
			console.error('[AppStartup] 显示过期通知失败:', error)
		}
	}

	/**
	 * 显示即将过期通知
	 */
	async showExpiringNotification(status) {
		try {
			const contactInfo = promoManager.getContactInfo()
			const remainingText = promoManager.formatRemainingTime(status.remainingDays)
			
			uni.showModal({
				title: '分享码即将过期',
				content: `您的${status.provider}分享码将在${remainingText}后过期。\n\n建议提前联系微信号 ${contactInfo.wechat} 续期。`,
				confirmText: '复制微信号',
				cancelText: '知道了',
				success: (res) => {
					if (res.confirm) {
						// 复制微信号到剪贴板
						uni.setClipboardData({
							data: contactInfo.wechat,
							success: () => {
								uni.showToast({
									title: '微信号已复制',
									icon: 'success'
								})
							}
						})
					}
				}
			})
			
		} catch (error) {
			console.error('[AppStartup] 显示即将过期通知失败:', error)
		}
	}

	/**
	 * 设置定期检查
	 */
	setupPeriodicCheck() {
		// 清除之前的定时器
		if (this.checkInterval) {
			clearInterval(this.checkInterval)
		}
		
		// 每小时检查一次（3600000毫秒）
		this.checkInterval = setInterval(async () => {
			try {
				console.log('[AppStartup] 执行定期分享码检查...')
				await this.checkPromoCodeValidity()
			} catch (error) {
				console.error('[AppStartup] 定期检查失败:', error)
			}
		}, 3600000) // 1小时
		
		console.log('[AppStartup] 定期检查已设置（每小时一次）')
	}

	/**
	 * 手动触发检查
	 */
	async manualCheck() {
		try {
			console.log('[AppStartup] 手动触发分享码检查...')
			await this.checkPromoCodeValidity()
		} catch (error) {
			console.error('[AppStartup] 手动检查失败:', error)
		}
	}

	/**
	 * 销毁检查器
	 */
	destroy() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval)
			this.checkInterval = null
		}
		
		this.initialized = false
		console.log('[AppStartup] 应用启动检查器已销毁')
	}

	/**
	 * 获取检查状态
	 */
	getStatus() {
		return {
			initialized: this.initialized,
			hasPeriodicCheck: !!this.checkInterval
		}
	}
}

// 创建单例实例
export default AppStartup