<template>
	<view class="content">
		<image class="logo" src="/static/logo.png"></image>
		<view class="text-area">
			<text class="title">{{ title }}</text>
		</view>
		
		<!-- 版本更新提示 -->
		<view v-if="showUpdateTip" class="update-tip" @click="handleUpdateClick">
			<view class="update-icon">
				<uni-icons type="refresh" size="20" color="#007aff"></uni-icons>
			</view>
			<view class="update-content">
				<text class="update-title">发现新版本 {{updateInfo.version}}</text>
				<text class="update-desc">{{updateInfo.description || '点击查看详情'}}</text>
			</view>
			<view class="update-arrow">
				<uni-icons type="right" size="16" color="#999"></uni-icons>
			</view>
		</view>
		
		<!-- 手动检查更新按钮 -->
		<view class="check-update-btn" @click="checkUpdate">
			<uni-icons type="loop" size="18" color="#007aff"></uni-icons>
			<text class="btn-text">检查更新</text>
		</view>
	</view>
</template>

<script>
import { AppUpdater, isUpdateSupported, getAppInfo } from '@/uni_modules/app-updater/js_sdk/index.js'

export default {
	data() {
		return {
			title: 'AI项目管理助手',
			showUpdateTip: false,
			updateInfo: null,
			appUpdater: null
		}
	},
	onLoad() {
		// 检查是否有可用更新
		this.checkGlobalUpdateInfo()
	},
	onShow() {
		// 每次显示页面时检查更新信息
		this.checkGlobalUpdateInfo()
	},
	methods: {
		// 检查全局更新信息
		checkGlobalUpdateInfo() {
			const app = getApp()
			if (app.globalData && app.globalData.updateInfo) {
				this.updateInfo = app.globalData.updateInfo
				this.appUpdater = app.globalData.appUpdater
				this.showUpdateTip = true
			}
		},
		
		// 手动检查更新
		async checkUpdate() {
			if (!isUpdateSupported()) {
				uni.showToast({
					title: '当前平台不支持应用更新',
					icon: 'none'
				})
				return
			}
			
			uni.showLoading({ title: '检查更新中...' })
			
			try {
				const appUpdater = new AppUpdater({
					updateUrl: 'https://project.r0ad.host/version.json',
					autoInstall: false,
					showProgress: true
				})
				
				const updateInfo = await appUpdater.checkUpdate()
				
				uni.hideLoading()
				
				if (updateInfo.hasUpdate) {
					this.updateInfo = updateInfo
					this.appUpdater = appUpdater
					this.showUpdateTip = true
					
					// 更新全局数据
					const app = getApp()
					app.globalData = app.globalData || {}
					app.globalData.updateInfo = updateInfo
					app.globalData.appUpdater = appUpdater
					
					uni.showToast({
						title: `发现新版本 ${updateInfo.version}`,
						icon: 'success'
					})
				} else {
					uni.showToast({
						title: '当前已是最新版本',
						icon: 'success'
					})
				}
			} catch (error) {
				uni.hideLoading()
				uni.showToast({
					title: '检查更新失败',
					icon: 'none'
				})
				console.error('检查更新失败:', error)
			}
		},
		
		// 处理更新提示点击
		handleUpdateClick() {
			if (!this.updateInfo) return
			
			uni.showModal({
				title: `新版本 ${this.updateInfo.version}`,
				content: `${this.updateInfo.description || '发现新版本，是否立即更新？'}`,
				confirmText: '立即更新',
				cancelText: '稍后再说',
				success: (res) => {
					if (res.confirm) {
						this.performUpdate()
					} else {
						// 用户选择稍后再说，隐藏提示
						this.showUpdateTip = false
					}
				}
			})
		},
		
		// 执行更新
		async performUpdate() {
			if (!this.appUpdater || !this.updateInfo) {
				uni.showToast({ title: '更新信息异常', icon: 'none' })
				return
			}
			
			try {
				uni.showLoading({ title: '正在下载更新...' })
				
				const result = await this.appUpdater.performUpdate(this.updateInfo)
				
				uni.hideLoading()
				
				if (result.success) {
					uni.showToast({ title: '更新完成', icon: 'success' })
					this.showUpdateTip = false
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

<style>
.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.logo {
	height: 200rpx;
	width: 200rpx;
	margin-top: 200rpx;
	margin-left: auto;
	margin-right: auto;
	margin-bottom: 50rpx;
}

.text-area {
	display: flex;
	justify-content: center;
}

.title {
	font-size: 36rpx;
	color: #8f8f94;
}

.demo-section {
	margin-top: 80rpx;
	width: 100%;
	padding: 0 40rpx;
	box-sizing: border-box;
}

.section-title {
	font-size: 32rpx;
	color: #333;
	font-weight: bold;
	margin-bottom: 40rpx;
	display: block;
	text-align: center;
}

.btn-group {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.demo-btn {
	width: 500rpx;
	height: 80rpx;
	background-color: #007aff;
	color: white;
	border: none;
	border-radius: 10rpx;
	font-size: 28rpx;
	margin-bottom: 30rpx;
	cursor: pointer;
}

.demo-btn:hover {
	background-color: #0056cc;
}

.demo-btn:active {
	background-color: #004499;
}

/* 更新提示样式 */
.update-tip {
	position: fixed;
	top: 100rpx;
	left: 30rpx;
	right: 30rpx;
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 20rpx;
	padding: 30rpx;
	display: flex;
	align-items: center;
	box-shadow: 0 10rpx 30rpx rgba(102, 126, 234, 0.3);
	z-index: 999;
	animation: slideDown 0.5s ease-out;
}

.update-icon {
	width: 60rpx;
	height: 60rpx;
	background: rgba(255, 255, 255, 0.2);
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 20rpx;
}

.update-content {
	flex: 1;
	display: flex;
	flex-direction: column;
}

.update-title {
	color: #fff;
	font-size: 32rpx;
	font-weight: bold;
	margin-bottom: 10rpx;
}

.update-desc {
	color: rgba(255, 255, 255, 0.8);
	font-size: 24rpx;
	line-height: 1.4;
}

.update-arrow {
	margin-left: 20rpx;
}

/* 检查更新按钮 */
.check-update-btn {
	position: fixed;
	bottom: 100rpx;
	right: 30rpx;
	width: 120rpx;
	height: 120rpx;
	background: #007aff;
	border-radius: 50%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 20rpx rgba(0, 122, 255, 0.3);
	z-index: 998;
}

.btn-text {
	color: #fff;
	font-size: 20rpx;
	margin-top: 8rpx;
}

/* 动画效果 */
@keyframes slideDown {
	from {
		transform: translateY(-100%);
		opacity: 0;
	}
	to {
		transform: translateY(0);
		opacity: 1;
	}
}
</style>
