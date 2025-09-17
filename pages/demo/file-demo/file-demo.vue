<template>
	<view class="container">
		<view class="header">
			<text class="title">本地文件管理示例</text>
		</view>
		
		<!-- 文件操作区域 -->
		<view class="operation-section">
			<text class="section-title">文件操作</text>
			<view class="form-item">
				<text class="label">文件名:</text>
				<input class="input" v-model="fileName" placeholder="请输入文件名（如：test.txt）" />
			</view>
			<view class="form-item">
				<text class="label">文件内容:</text>
				<textarea class="textarea" v-model="fileContent" placeholder="请输入文件内容"></textarea>
			</view>
			<view class="btn-group">
				<button class="btn btn-primary" @click="writeFile">写入文件</button>
				<button class="btn btn-success" @click="readFile">读取文件</button>
			</view>
		</view>
		
		<!-- 文件列表区域 -->
		<view class="list-section">
			<view class="list-header">
				<text class="section-title">文件列表</text>
				<button class="btn btn-info btn-small" @click="refreshFileList">刷新</button>
			</view>
			<view class="file-list">
				<view v-if="fileList.length === 0" class="empty-state">
					<text class="empty-text">暂无文件</text>
				</view>
				<view v-for="(file, index) in fileList" :key="index" class="file-item" @click="selectFile(file)">
					<view class="file-info">
						<text class="file-name">{{ file.name }}</text>
						<text class="file-meta">{{ file.lastModifiedDate }}</text>
						<text class="file-size">{{ formatFileSize(file.size) }}</text>
					</view>
					<view class="file-actions">
						<text class="action-btn" @click.stop="loadFile(file.name)">加载</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 应用目录信息 -->
		<view class="info-section">
			<text class="section-title">目录信息</text>
			<view class="info-item">
				<text class="info-label">应用私有目录:</text>
				<text class="info-value">{{ appPrivateDir }}</text>
			</view>
			<view class="info-item">
				<text class="info-label">基础目录:</text>
				<text class="info-value">{{ baseDir }}</text>
			</view>
		</view>
		
		<!-- 快速操作区域 -->
		<view class="quick-section">
			<text class="section-title">快速操作</text>
			<view class="btn-group">
				<button class="btn btn-secondary" @click="createSampleFile">创建示例文件</button>
				<button class="btn btn-warning" @click="exportData">导出JSON数据</button>
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
import FileManager, { FileManagerConfig } from '@/uni_modules/file-manager/js_sdk/index.js'

export default {
	data() {
		return {
			fileName: 'demo.txt',
			fileContent: '这是一个测试文件\n创建时间: ' + new Date().toLocaleString(),
			fileList: [],
			resultText: '等待操作...',
			loading: false,
			loadingText: '',
			appPrivateDir: '',
			baseDir: ''
		}
	},
	
	onLoad() {
		// 获取目录信息
		this.appPrivateDir = FileManager.getAppPrivateDir()
		this.baseDir = FileManagerConfig.getBaseDir()
		
		// 刷新文件列表
		this.refreshFileList()
	},
	
	methods: {
		// 写入文件
		async writeFile() {
			if (!this.fileName.trim()) {
				uni.showToast({ title: '请输入文件名', icon: 'none' })
				return
			}
			
			if (!this.fileContent.trim()) {
				uni.showToast({ title: '请输入文件内容', icon: 'none' })
				return
			}
			
			this.loading = true
			this.loadingText = '写入文件中...'
			
			try {
				const filePath = await FileManager.writeFile(this.fileContent, this.fileName)
				this.resultText = `文件写入成功！\n文件路径: ${filePath}\n文件名: ${this.fileName}\n内容长度: ${this.fileContent.length} 字符`
				uni.showToast({ title: '写入成功', icon: 'success' })
				
				// 刷新文件列表
				await this.refreshFileList()
			} catch (error) {
				this.resultText = '写入文件失败: ' + error.message
				uni.showToast({ title: '写入失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		
		// 读取文件
		async readFile() {
			if (!this.fileName.trim()) {
				uni.showToast({ title: '请输入文件名', icon: 'none' })
				return
			}
			
			this.loading = true
			this.loadingText = '读取文件中...'
			
			try {
				const content = await FileManager.readFile(this.fileName)
				this.fileContent = content
				this.resultText = `文件读取成功！\n文件名: ${this.fileName}\n内容长度: ${content.length} 字符\n\n文件内容已加载到编辑区域`
				uni.showToast({ title: '读取成功', icon: 'success' })
			} catch (error) {
				this.resultText = '读取文件失败: ' + error.message
				uni.showToast({ title: '读取失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		
		// 刷新文件列表
		async refreshFileList() {
			this.loading = true
			this.loadingText = '获取文件列表...'
			
			try {
				this.fileList = await FileManager.getFileList()
				this.resultText = `文件列表刷新成功！\n共找到 ${this.fileList.length} 个文件`
			} catch (error) {
				this.resultText = '获取文件列表失败: ' + error.message
				uni.showToast({ title: '获取失败', icon: 'none' })
			} finally {
				this.loading = false
			}
		},
		
		// 选择文件
		selectFile(file) {
			this.fileName = file.name
			this.resultText = `已选择文件: ${file.name}\n大小: ${this.formatFileSize(file.size)}\n修改时间: ${file.lastModifiedDate}`
		},
		
		// 加载文件内容
		async loadFile(fileName) {
			this.fileName = fileName
			await this.readFile()
		},
		
		// 创建示例文件
		async createSampleFile() {
			const sampleData = {
				title: '示例数据文件',
				createdAt: new Date().toISOString(),
				version: '1.0.0',
				data: {
					users: [
						{ id: 1, name: '张三', age: 25 },
						{ id: 2, name: '李四', age: 30 },
						{ id: 3, name: '王五', age: 28 }
					],
					settings: {
						theme: 'light',
						language: 'zh-CN',
						notifications: true
					}
				},
				notes: '这是通过文件管理器插件创建的示例JSON文件'
			}
			
			this.fileName = 'sample_data.json'
			this.fileContent = JSON.stringify(sampleData, null, 2)
			
			await this.writeFile()
		},
		
		// 导出数据
		async exportData() {
			const exportData = {
				exportTime: new Date().toISOString(),
				appInfo: {
					name: 'project-z',
					version: '1.0.0'
				},
				fileList: this.fileList,
				directoryInfo: {
					appPrivateDir: this.appPrivateDir,
					baseDir: this.baseDir
				},
				stats: {
					totalFiles: this.fileList.length,
					totalSize: this.fileList.reduce((sum, file) => sum + file.size, 0)
				}
			}
			
			const fileName = `export_${new Date().getTime()}.json`
			this.fileName = fileName
			this.fileContent = JSON.stringify(exportData, null, 2)
			
			await this.writeFile()
		},
		
		// 格式化文件大小
		formatFileSize(bytes) {
			return FileManager.formatFileSize(bytes)
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

.operation-section,
.list-section,
.info-section,
.quick-section,
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

.list-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
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

.btn-small {
	height: 60rpx;
	font-size: 24rpx;
	padding: 0 20rpx;
	margin-bottom: 0;
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

.btn-secondary {
	background-color: #6c757d;
	color: white;
	flex: 1;
	margin-right: 20rpx;
}

.btn-warning {
	background-color: #ffc107;
	color: #212529;
	flex: 1;
}

.btn-info {
	background-color: #17a2b8;
	color: white;
}

.btn-group {
	display: flex;
	margin-bottom: 20rpx;
}

.btn-group .btn:last-child {
	margin-right: 0;
}

.file-list {
	max-height: 600rpx;
	overflow-y: auto;
}

.empty-state {
	text-align: center;
	padding: 40rpx;
}

.empty-text {
	font-size: 28rpx;
	color: #999;
}

.file-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20rpx;
	border-bottom: 2rpx solid #f0f0f0;
	cursor: pointer;
}

.file-item:hover {
	background-color: #f8f9fa;
}

.file-item:last-child {
	border-bottom: none;
}

.file-info {
	flex: 1;
}

.file-name {
	font-size: 28rpx;
	color: #333;
	font-weight: bold;
	display: block;
	margin-bottom: 5rpx;
}

.file-meta {
	font-size: 24rpx;
	color: #666;
	display: block;
	margin-bottom: 5rpx;
}

.file-size {
	font-size: 24rpx;
	color: #999;
	display: block;
}

.file-actions {
	flex-shrink: 0;
}

.action-btn {
	font-size: 24rpx;
	color: #007aff;
	padding: 10rpx 20rpx;
	border: 2rpx solid #007aff;
	border-radius: 6rpx;
	cursor: pointer;
}

.action-btn:hover {
	background-color: #007aff;
	color: white;
}

.info-item {
	display: flex;
	margin-bottom: 15rpx;
}

.info-label {
	font-size: 26rpx;
	color: #666;
	width: 200rpx;
	flex-shrink: 0;
}

.info-value {
	font-size: 26rpx;
	color: #333;
	flex: 1;
	word-break: break-all;
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