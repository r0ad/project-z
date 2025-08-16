<template>
	<view class="container">
		<view class="header">
			<text class="title">GitCode 同步示例</text>
		</view>
		
		<!-- 配置区域 -->
		<view class="config-section">
			<text class="section-title">配置信息</text>
			<view class="form-item">
				<text class="label">仓库URL:</text>
				<input class="input" v-model="config.repoUrl" placeholder="请输入GitCode仓库URL" />
			</view>
			<view class="form-item">
				<text class="label">访问令牌:</text>
				<input class="input" v-model="config.accessToken" placeholder="请输入访问令牌" type="password" />
			</view>
			<view class="form-item">
				<text class="label">分支名称:</text>
				<input class="input" v-model="config.branchName" placeholder="请输入分支名称" />
			</view>
			<button class="btn btn-primary" @click="testConnection">测试连接</button>
		</view>
		
		<!-- 操作区域 -->
		<view class="operation-section">
			<text class="section-title">操作功能</text>
			<view class="btn-group">
				<button class="btn btn-secondary" @click="getRepoInfo">获取仓库信息</button>
				<button class="btn btn-secondary" @click="getBranches">获取分支列表</button>
			</view>
			<view class="btn-group">
				<button class="btn btn-success" @click="uploadData">上传数据</button>
				<button class="btn btn-info" @click="downloadData">下载数据</button>
			</view>
		</view>
		
		<!-- 数据区域 -->
		<view class="data-section">
			<text class="section-title">测试数据</text>
			<textarea class="textarea" v-model="testData" placeholder="请输入要上传的测试数据"></textarea>
			<view class="form-item">
				<text class="label">文件名:</text>
				<input class="input" v-model="fileName" placeholder="test.json" />
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
import { GitCodeSync, GitCodeSyncConfig } from '@/uni_modules/gitcode-sync/js_sdk/index.js'

export default {
	data() {
		return {
			config: {
				repoUrl: 'https://gitcode.com/xxx/diary-demo',
				owner: 'xxxx',
				repo: 'diary-demo',
				accessToken: 'xxxx',
				branchName: 'main'
			},
			testData: JSON.stringify({
				message: 'Hello GitCode!',
				timestamp: new Date().toISOString(),
				data: {
					user: 'test_user',
					action: 'demo_upload'
				}
			}, null, 2),
			fileName: 'test.json',
			resultText: '等待操作...',
			loading: false,
			loadingText: '',
			gitCodeSync: null
		}
	},
	
	onLoad() {
		// 从本地存储加载配置
		this.loadConfig()
	},
	
	methods: {
		// 加载配置
		loadConfig() {
			try {
				const savedConfig = uni.getStorageSync('gitcode_config')
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
				uni.setStorageSync('gitcode_config', this.config)
			} catch (error) {
				console.log('保存配置失败:', error)
			}
		},
		
		// 创建GitCodeSync实例
		createGitCodeSync() {
			if (!this.config.repoUrl || !this.config.accessToken) {
				uni.showToast({ title: '请先配置仓库URL和访问令牌', icon: 'none' })
				return null
			}
			
			// 直接传递配置对象给GitCodeSync构造函数
			const syncConfig = {
				repoUrl: this.config.repoUrl,
				accessToken: this.config.accessToken,
				branch: this.config.branchName || 'main'
			}
			
			console.log('创建GitCodeSync配置:', syncConfig)
			
			try {
				return new GitCodeSync(syncConfig)
			} catch (error) {
				console.error('创建GitCodeSync失败:', error)
				uni.showToast({ title: '配置错误: ' + error.message, icon: 'none' })
				return null
			}
		},
		
		// 测试连接
		async testConnection() {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return
			
			this.loading = true
			this.loadingText = '测试连接中...'
			
			try {
				const result = await gitCodeSync.testConnection()
				if (result.success) {
					this.resultText = '连接成功！\n' + JSON.stringify(result, null, 2)
					this.saveConfig()
					uni.showToast({ title: '连接成功', icon: 'success' })
				} else {
					this.resultText = '连接失败：' + result.message
					uni.showToast({ title: '连接失败', icon: 'none' })
				}
			} catch (error) {
				this.resultText = '连接异常：' + error.message
				uni.showToast({ title: '连接异常', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		
		// 获取仓库信息
		async getRepoInfo() {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return
			
			this.loading = true
			this.loadingText = '获取仓库信息...'
			
			try {
				const repoInfo = await gitCodeSync.getRepoInfo()
				this.resultText = '仓库信息：\n' + JSON.stringify(repoInfo, null, 2)
			} catch (error) {
				this.resultText = '获取仓库信息失败：' + error.message
				uni.showToast({ title: '获取失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		
		// 获取分支列表
		async getBranches() {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return
			
			this.loading = true
			this.loadingText = '获取分支列表...'
			
			try {
				const branches = await gitCodeSync.getBranches()
				this.resultText = '分支列表：\n' + JSON.stringify(branches, null, 2)
			} catch (error) {
				this.resultText = '获取分支列表失败：' + error.message
				uni.showToast({ title: '获取失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		
		// 上传数据
		async uploadData() {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return
			
			if (!this.testData.trim()) {
				uni.showToast({ title: '请输入要上传的数据', icon: 'none' })
				return
			}
			
			if (!this.fileName.trim()) {
				uni.showToast({ title: '请输入文件名', icon: 'none' })
				return
			}
			
			this.loading = true
			this.loadingText = '上传数据中...'
			
			try {
				const result = await gitCodeSync.uploadData(
					this.testData,
					this.fileName,
					`通过GitCode同步插件上传 - ${new Date().toLocaleString()}`
				)
				
				if (result.success) {
					this.resultText = '上传成功！\n' + JSON.stringify(result, null, 2)
					uni.showToast({ title: '上传成功', icon: 'success' })
				} else {
					this.resultText = '上传失败：' + result.message
					uni.showToast({ title: '上传失败', icon: 'none' })
				}
			} catch (error) {
				this.resultText = '上传异常：' + error.message
				uni.showToast({ title: '上传异常', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		
		// 下载数据
		async downloadData() {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return
			
			if (!this.fileName.trim()) {
				uni.showToast({ title: '请输入要下载的文件名', icon: 'none' })
				return
			}
			
			this.loading = true
			this.loadingText = '下载数据中...'
			
			try {
				const result = await gitCodeSync.downloadData(this.fileName)
				
				if (result.success) {
					this.testData = result.data
					this.resultText = '下载成功！\n文件内容已更新到测试数据区域'
					uni.showToast({ title: '下载成功', icon: 'success' })
				} else {
					this.resultText = '下载失败：' + result.message
					uni.showToast({ title: '下载失败', icon: 'none' })
				}
			} catch (error) {
				this.resultText = '下载异常：' + error.message
				uni.showToast({ title: '下载异常', icon: 'none' })
			} finally {
				this.loading = false
			}
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

.config-section,
.operation-section,
.data-section,
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

.textarea {
	width: 100%;
	height: 200rpx;
	border: 2rpx solid #ddd;
	border-radius: 8rpx;
	padding: 20rpx;
	font-size: 28rpx;
	box-sizing: border-box;
	resize: none;
}

.textarea:focus {
	border-color: #007aff;
}

.btn {
	height: 80rpx;
	border-radius: 8rpx;
	font-size: 28rpx;
	border: none;
	cursor: pointer;
	margin-bottom: 20rpx;
}

.btn-primary {
	background-color: #007aff;
	color: white;
	width: 100%;
}

.btn-secondary {
	background-color: #6c757d;
	color: white;
	flex: 1;
	margin-right: 20rpx;
}

.btn-secondary:last-child {
	margin-right: 0;
}

.btn-success {
	background-color: #28a745;
	color: white;
	flex: 1;
	margin-right: 20rpx;
}

.btn-info {
	background-color: #17a2b8;
	color: white;
	flex: 1;
}

.btn-group {
	display: flex;
	margin-bottom: 20rpx;
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