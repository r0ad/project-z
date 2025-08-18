<script>
import dbService from '@/utils/dbService.js'
import { AppUpdater, isUpdateSupported, getAppInfo } from '@/uni_modules/app-updater/js_sdk/index.js'

export default {
	async onLaunch() {
		console.log('App Launch')
		
		// 初始化数据库
		try {
			await this.initDatabase()
			console.log('数据库初始化成功')
		} catch (error) {
			console.error('数据库初始化失败:', error)
			// 只在严重错误时显示提示
			if (error.code !== -1402) { // -1402 表示数据库已经打开
				uni.showToast({
					title: '数据库初始化失败',
					icon: 'error',
					duration: 3000
				})
			}
		}
		
		// 检查应用更新
		this.checkAppUpdate()
	},
	
	onShow: function() {
		console.log('App Show')
	},
	
	onHide: function() {
		console.log('App Hide')
	},
	
	methods: {
		async initDatabase() {
			try {
				// 初始化数据库连接（包含表创建和索引创建）
				await dbService.initDB()
				
				// 创建索引（如果还没有创建）
				await dbService.createIndexes()
				
				// 初始化默认用户（如果还没有用户）
				await dbService.initDefaultUser()
				
				console.log('数据库初始化完成')
				
			} catch (error) {
				console.error('数据库初始化过程中出错:', error)
				// 对于已经打开的数据库错误，不抛出异常
				if (error.code === -1402) {
					console.log('数据库已经打开，继续运行')
					return
				}
				throw error
			}
		},
		
		// 检查应用更新
		async checkAppUpdate() {
			// 只在支持更新的平台上检查
			if (!isUpdateSupported()) {
				console.log('当前平台不支持应用更新')
				return
			}
			
			try {
				const appUpdater = new AppUpdater({
					updateUrl: 'https://project.r0ad.host/version.json',
					autoInstall: false, // 不自动安装，让用户选择
					showProgress: true
				})
				
				const updateInfo = await appUpdater.checkUpdate()
				
				if (updateInfo.hasUpdate) {
					console.log('发现新版本:', updateInfo.version)
					
					// 存储更新信息到全局
					getApp().globalData = getApp().globalData || {}
					getApp().globalData.updateInfo = updateInfo
					getApp().globalData.appUpdater = appUpdater
					
					// 如果是强制更新，立即显示更新弹窗
					if (updateInfo.forceUpdate) {
						this.showForceUpdateDialog(updateInfo)
					} else {
						// 可选更新，延迟3秒后显示提示
						setTimeout(() => {
							this.showOptionalUpdateDialog(updateInfo)
						}, 3000)
					}
				} else {
					console.log('当前已是最新版本')
				}
			} catch (error) {
				console.error('检查更新失败:', error)
				// 静默失败，不影响应用正常使用
			}
		},
		
		// 显示强制更新对话框
		showForceUpdateDialog(updateInfo) {
			uni.showModal({
				title: '发现新版本',
				content: `发现新版本 ${updateInfo.version}，需要立即更新才能继续使用。\n\n${updateInfo.description || ''}`,
				showCancel: false,
				confirmText: '立即更新',
				success: (res) => {
					if (res.confirm) {
						this.performUpdate(updateInfo)
					}
				}
			})
		},
		
		// 显示可选更新对话框
		showOptionalUpdateDialog(updateInfo) {
			uni.showModal({
				title: '发现新版本',
				content: `发现新版本 ${updateInfo.version}，是否立即更新？\n\n${updateInfo.description || ''}`,
				confirmText: '立即更新',
				cancelText: '稍后再说',
				success: (res) => {
					if (res.confirm) {
						this.performUpdate(updateInfo)
					}
				}
			})
		},
		
		// 执行更新
		async performUpdate(updateInfo) {
			try {
				const appUpdater = getApp().globalData.appUpdater
				if (!appUpdater) {
					uni.showToast({ title: '更新器未初始化', icon: 'none' })
					return
				}
				
				uni.showLoading({ title: '正在下载更新...' })
				
				const result = await appUpdater.performUpdate(updateInfo)
				
				uni.hideLoading()
				
				if (result.success) {
					uni.showToast({ title: '更新完成', icon: 'success' })
				} else {
					uni.showToast({ title: '更新失败: ' + result.message, icon: 'none' })
				}
			} catch (error) {
				uni.hideLoading()
				uni.showToast({ title: '更新异常: ' + error.message, icon: 'none' })
			}
		}
	}
}
</script>

<style lang="scss">
@import "nutui-uniapp/styles/index.scss";

/* 全局样式 */
page {
	background-color: #F2F3F5;
}

/* 通用样式类 */
.primary-color {
	color: #165DFF;
}

.success-color {
	color: #00B42A;
}

.warning-color {
	color: #FF7D00;
}

.danger-color {
	color: #F53F3F;
}

.gray-color {
	color: #86909C;
}

.card {
	background-color: #ffffff;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	margin-bottom: 24rpx;
	padding: 32rpx;
}

.btn-primary {
	background-color: #165DFF;
	color: #ffffff;
	border-radius: 16rpx;
	padding: 24rpx 32rpx;
	font-size: 28rpx;
	border: none;
}

.btn-secondary {
	background-color: #ffffff;
	color: #86909C;
	border: 2rpx solid #E5E6EB;
	border-radius: 16rpx;
	padding: 24rpx 32rpx;
	font-size: 28rpx;
}

</style>
