<template>
	<view class="container">
		<view class="header">
			<text class="title">应用更新示例</text>
		</view>
		
		<!-- 应用信息区域 -->
		<view class="info-section">
			<text class="section-title">当前应用信息</text>
			<view class="info-item">
				<text class="info-label">应用名称:</text>
				<text class="info-value">{{ appInfo.name }}</text>
			</view>
			<view class="info-item">
				<text class="info-label">当前版本:</text>
				<text class="info-value">{{ appInfo.version }}</text>
			</view>
			<view class="info-item">
				<text class="info-label">版本代码:</text>
				<text class="info-value">{{ appInfo.versionCode }}</text>
			</view>
			<view class="info-item">
				<text class="info-label">运行平台:</text>
				<text class="info-value">{{ appInfo.platform }}</text>
			</view>
			<view class="info-item">
				<text class="info-label">更新支持:</text>
				<text class="info-value" :class="updateSupported ? 'text-success' : 'text-danger'">
					{{ updateSupported ? '支持' : '不支持' }}
				</text>
			</view>
		</view>
		
		<!-- 配置区域 -->
		<view class="config-section">
			<text class="section-title">更新配置</text>
			<view class="form-item">
				<text class="label">更新检查URL:</text>
				<input class="input" v-model="config.updateUrl" placeholder="请输入更新检查API地址" />
			</view>
			<view class="form-item">
				<text class="label">下载URL (测试用):</text>
				<input class="input" v-model="config.downloadUrl" placeholder="请输入APK下载地址" />
			</view>
			<view class="form-item">
				<view class="checkbox-group">
					<label class="checkbox-item">
						<checkbox :checked="config.autoInstall" @change="onAutoInstallChange" />
						<text class="checkbox-label">自动安装</text>
					</label>
					<label class="checkbox-item">
						<checkbox :checked="config.showProgress" @change="onShowProgressChange" />
						<text class="checkbox-label">显示进度</text>
					</label>
				</view>
			</view>
		</view>
		
		<!-- 操作区域 -->
		<view class="operation-section">
			<text class="section-title">更新操作</text>
			<view class="btn-group">
				<button class="btn btn-primary" @click="checkUpdate" :disabled="!updateSupported">检查更新</button>
				<button class="btn btn-success" @click="performFullUpdate" :disabled="!updateSupported || !hasUpdate">完整更新</button>
			</view>
			<view class="btn-group">
				<button class="btn btn-info" @click="downloadOnly" :disabled="!updateSupported || !config.downloadUrl">仅下载</button>
				<button class="btn btn-warning" @click="cancelDownload" :disabled="!downloading">取消下载</button>
			</view>
		</view>
		
		<!-- 进度显示区域 -->
		<view v-if="downloading" class="progress-section">
			<text class="section-title">下载进度</text>
			<view class="progress-container">
				<view class="progress-bar">
					<view class="progress-fill" :style="{ width: downloadProgress + '%' }"></view>
				</view>
				<text class="progress-text">{{ downloadProgress }}%</text>
			</view>
			<view class="progress-info">
				<text class="progress-detail">已下载: {{ formatFileSize(downloadedSize) }}</text>
				<text class="progress-detail">总大小: {{ formatFileSize(totalSize) }}</text>
			</view>
		</view>
		
		<!-- 更新信息显示 -->
		<view v-if="updateInfo && hasUpdate" class="update-info-section">
			<text class="section-title">更新信息</text>
			<view class="update-card">
				<view class="update-header">
					<text class="update-version">版本 {{ updateInfo.version }}</text>
					<text class="update-badge" :class="updateInfo.forceUpdate ? 'badge-danger' : 'badge-info'">
						{{ updateInfo.forceUpdate ? '强制更新' : '可选更新' }}
					</text>
				</view>
				<view class="update-description">
					<text class="description-text">{{ updateInfo.description || '暂无更新说明' }}</text>
				</view>
				<view class="update-meta">
					<text class="meta-item">版本代码: {{ updateInfo.versionCode }}</text>
					<text class="meta-item" v-if="updateInfo.minVersion">最低版本: {{ updateInfo.minVersion }}</text>
				</view>
			</view>
		</view>
		
		<!-- 结果显示区域 -->
		<view class="result-section">
			<text class="section-title">操作结果</text>
			<view class="result-box">
				<text class="result-text">{{ resultText }}</text>
			</view>
		</view>
		
		<!-- 加载状态 -->
		<view v-if="loading" class="loading-overlay">
			<view class="loading-content">
				<text class="loading-text">{{ loadingText }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { AppUpdater, isUpdateSupported, getAppInfo } from '@/uni_modules/app-updater/js_sdk/index.js'

export default {
	data() {
		return {
			appInfo: {},
			updateSupported: false,
			config: {
				updateUrl: 'https://project.r0ad.host/version.json',
				downloadUrl: 'https://project.r0ad.host/project.apk',
				autoInstall: true,
				showProgress: true
			},
			updateInfo: null,
			hasUpdate: false,
			downloading: false,
			downloadProgress: 0,
			downloadedSize: 0,
			totalSize: 0,
			resultText: '等待操作...',
			loading: false,
			loadingText: '',
			appUpdater: null
		}
	},
	
	onLoad() {
		// 获取应用信息和更新支持状态
		this.appInfo = getAppInfo()
		this.updateSupported = isUpdateSupported()
		
		// 从本地存储加载配置
		this.loadConfig()
		
		// 创建更新器实例
		this.createUpdater()
		
		// 显示初始信息
		this.resultText = `应用信息加载完成\n平台: ${this.appInfo.platform}\n版本: ${this.appInfo.version}\n更新支持: ${this.updateSupported ? '是' : '否'}`
	},
	
	methods: {
		// 加载配置
		loadConfig() {
			try {
				const savedConfig = uni.getStorageSync('app_update_config')
				if (savedConfig) {
					this.config = { ...this.config, ...savedConfig }
				}
			} catch (error) {
				console.log('加载配置失败:', error)
			}
		},
		
		// 保存配置
		saveConfig() {
			try {
				uni.setStorageSync('app_update_config', this.config)
			} catch (error) {
				console.log('保存配置失败:', error)
			}
		},
		
		// 创建更新器实例
		createUpdater() {
			this.appUpdater = new AppUpdater({
				updateUrl: this.config.updateUrl,
				autoInstall: this.config.autoInstall,
				showProgress: false // 使用自定义进度显示
			})
		},
		
		// 检查更新
		async checkUpdate() {
			if (!this.config.updateUrl.trim()) {
				uni.showToast({ title: '请先配置更新检查URL', icon: 'none' })
				return
			}
			
			this.loading = true
			this.loadingText = '检查更新中...'
			
			try {
				// 重新创建更新器实例以使用最新配置
				this.createUpdater()
				
				const updateInfo = await this.appUpdater.checkUpdate()
				this.updateInfo = updateInfo
				this.hasUpdate = updateInfo.hasUpdate
				
				if (updateInfo.hasUpdate) {
					this.resultText = `发现新版本！\n当前版本: ${this.appInfo.version}\n最新版本: ${updateInfo.version}\n\n${updateInfo.description || '暂无更新说明'}`
					uni.showToast({ title: '发现新版本', icon: 'success' })
					this.saveConfig()
				} else {
					this.resultText = '当前已是最新版本\n无需更新'
					uni.showToast({ title: '已是最新版本', icon: 'none' })
				}
			} catch (error) {
				this.resultText = '检查更新失败: ' + error.message
				uni.showToast({ title: '检查更新失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		
		// 执行完整更新流程
		async performFullUpdate() {
			if (!this.updateInfo || !this.hasUpdate) {
				uni.showToast({ title: '请先检查更新', icon: 'none' })
				return
			}
			
			// 确认更新
			const confirmResult = await uni.showModal({
				title: '确认更新',
				content: `是否更新到版本 ${this.updateInfo.version}？\n\n${this.updateInfo.description || ''}`,
				confirmText: '立即更新',
				cancelText: '稍后再说'
			})
			
			if (!confirmResult.confirm) return
			
			this.downloading = true
			this.downloadProgress = 0
			this.downloadedSize = 0
			this.totalSize = 0
			
			try {
				const result = await this.appUpdater.performUpdate(
					this.updateInfo,
					(progress, downloaded, total) => {
						this.downloadProgress = progress
						this.downloadedSize = downloaded || 0
						this.totalSize = total || 0
					}
				)
				
				if (result.success) {
					this.resultText = `更新完成！\n下载状态: ${result.downloaded ? '成功' : '失败'}\n安装状态: ${result.installed ? '成功' : '未安装'}\n\n${result.message}`
					uni.showToast({ title: '更新完成', icon: 'success' })
				} else {
					this.resultText = '更新失败: ' + result.message
					uni.showToast({ title: '更新失败', icon: 'none' })
				}
			} catch (error) {
				this.resultText = '更新异常: ' + error.message
				uni.showToast({ title: '更新异常', icon: 'none' })
			} finally {
				this.downloading = false
			}
		},
		
		// 仅下载
		async downloadOnly() {
			if (!this.config.downloadUrl.trim()) {
				uni.showToast({ title: '请先配置下载URL', icon: 'none' })
				return
			}
			
			this.downloading = true
			this.downloadProgress = 0
			this.downloadedSize = 0
			this.totalSize = 0
			
			try {
				const result = await this.appUpdater.downloadUpdate(
					this.config.downloadUrl,
					(progress, downloaded, total) => {
						this.downloadProgress = progress
						this.downloadedSize = downloaded || 0
						this.totalSize = total || 0
					}
				)
				
				if (result.success) {
					this.resultText = `下载完成！\n文件路径: ${result.filePath}\n文件名: ${result.fileName}\n\n可以手动安装或使用完整更新流程`
					uni.showToast({ title: '下载完成', icon: 'success' })
				} else {
					this.resultText = '下载失败: ' + (result.message || '未知错误')
					uni.showToast({ title: '下载失败', icon: 'none' })
				}
			} catch (error) {
				this.resultText = '下载异常: ' + error.message
				uni.showToast({ title: '下载异常', icon: 'none' })
			} finally {
				this.downloading = false
			}
		},
		
		// 取消下载
		cancelDownload() {
			if (this.appUpdater) {
				this.appUpdater.cancelDownload()
				this.downloading = false
				this.downloadProgress = 0
				this.downloadedSize = 0
				this.totalSize = 0
				this.resultText = '下载已取消'
				uni.showToast({ title: '下载已取消', icon: 'none' })
			}
		},
		
		// 自动安装选项变化
		onAutoInstallChange(e) {
			this.config.autoInstall = e.detail.value.length > 0
			this.saveConfig()
		},
		
		// 显示进度选项变化
		onShowProgressChange(e) {
			this.config.showProgress = e.detail.value.length > 0
			this.saveConfig()
		},
		
		// 格式化文件大小
		formatFileSize(bytes) {
			if (bytes === 0) return '0 B'
			const k = 1024
			const sizes = ['B', 'KB', 'MB', 'GB']
			const i = Math.floor(Math.log(bytes) / Math.log(k))
			return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
		}
	}
}
</script>

<style scoped>
.container {
	padding: 20rpx;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.header {
	text-align: center;
	margin-bottom: 30rpx;
}

.title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.info-section,
.config-section,
.operation-section,
.progress-section,
.update-info-section,
.result-section {
	background-color: white;
	border-radius: 10rpx;
	padding: 20rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.1);
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 20rpx;
	display: block;
}

.info-item {
	display: flex;
	margin-bottom: 15rpx;
}

.info-label {
	font-size: 26rpx;
	color: #666;
	width: 160rpx;
	flex-shrink: 0;
}

.info-value {
	font-size: 26rpx;
	color: #333;
	flex: 1;
}

.text-success {
	color: #28a745 !important;
}

.text-danger {
	color: #dc3545 !important;
}

.form-item {
	margin-bottom: 20rpx;
}

.label {
	font-size: 28rpx;
	color: #666;
	margin-bottom: 10rpx;
	display: block;
}

.input {
	width: 100%;
	height: 80rpx;
	border: 2rpx solid #ddd;
	border-radius: 8rpx;
	padding: 0 20rpx;
	font-size: 28rpx;
	box-sizing: border-box;
}

.input:focus {
	border-color: #007aff;
}

.checkbox-group {
	display: flex;
	flex-wrap: wrap;
}

.checkbox-item {
	display: flex;
	align-items: center;
	margin-right: 40rpx;
	margin-bottom: 10rpx;
}

.checkbox-label {
	font-size: 26rpx;
	color: #333;
	margin-left: 10rpx;
}

.btn {
	height: 80rpx;
	border-radius: 8rpx;
	font-size: 28rpx;
	border: none;
	cursor: pointer;
	margin-bottom: 20rpx;
}

.btn:disabled {
	opacity: 0.5;
	cursor: not-allowed;
}

.btn-primary {
	background-color: #007aff;
	color: white;
	flex: 1;
	margin-right: 20rpx;
}

.btn-success {
	background-color: #28a745;
	color: white;
	flex: 1;
}

.btn-info {
	background-color: #17a2b8;
	color: white;
	flex: 1;
	margin-right: 20rpx;
}

.btn-warning {
	background-color: #ffc107;
	color: #212529;
	flex: 1;
}

.btn-group {
	display: flex;
	margin-bottom: 20rpx;
}

.btn-group .btn:last-child {
	margin-right: 0;
}

.progress-container {
	display: flex;
	align-items: center;
	margin-bottom: 20rpx;
}

.progress-bar {
	flex: 1;
	height: 20rpx;
	background-color: #e9ecef;
	border-radius: 10rpx;
	overflow: hidden;
	margin-right: 20rpx;
}

.progress-fill {
	height: 100%;
	background-color: #007aff;
	transition: width 0.3s ease;
}

.progress-text {
	font-size: 24rpx;
	color: #333;
	width: 80rpx;
	text-align: right;
}

.progress-info {
	display: flex;
	justify-content: space-between;
}

.progress-detail {
	font-size: 24rpx;
	color: #666;
}

.update-card {
	border: 2rpx solid #e9ecef;
	border-radius: 8rpx;
	padding: 20rpx;
}

.update-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 15rpx;
}

.update-version {
	font-size: 30rpx;
	font-weight: bold;
	color: #333;
}

.update-badge {
	font-size: 22rpx;
	padding: 6rpx 12rpx;
	border-radius: 12rpx;
	color: white;
}

.badge-info {
	background-color: #17a2b8;
}

.badge-danger {
	background-color: #dc3545;
}

.update-description {
	margin-bottom: 15rpx;
}

.description-text {
	font-size: 26rpx;
	color: #666;
	line-height: 1.5;
}

.update-meta {
	display: flex;
	flex-wrap: wrap;
}

.meta-item {
	font-size: 24rpx;
	color: #999;
	margin-right: 30rpx;
	margin-bottom: 5rpx;
}

.result-box {
	background-color: #f8f9fa;
	border: 2rpx solid #e9ecef;
	border-radius: 8rpx;
	padding: 20rpx;
	min-height: 200rpx;
}

.result-text {
	font-size: 24rpx;
	color: #333;
	line-height: 1.5;
	white-space: pre-wrap;
	word-break: break-all;
}

.loading-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 9999;
}

.loading-content {
	background-color: white;
	border-radius: 10rpx;
	padding: 40rpx;
	text-align: center;
}

.loading-text {
	font-size: 28rpx;
	color: #333;
}
</style>