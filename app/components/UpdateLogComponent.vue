<template>
	<view class="update-log-container">
		<view class="header">
			<text class="title">更新日志</text>
			<view class="close-btn" @click="closeModal">
				<uni-icons type="closeempty" size="20" color="#999"></uni-icons>
			</view>
		</view>
		
		<scroll-view class="log-content" scroll-y="true">
			<view v-for="(log, index) in updateLogs" :key="index" class="log-item">
				<view class="log-header">
					<view class="version-info">
						<text class="version">v{{log.version}}</text>
						<text v-if="log.isLatest" class="latest-badge">最新</text>
						<text v-if="log.isCurrent" class="current-badge">当前</text>
					</view>
					<text class="date">{{log.date}}</text>
				</view>
				
				<view class="log-body">
					<text class="description">{{log.description}}</text>
					
					<view v-if="log.features && log.features.length > 0" class="change-section">
						<text class="section-title">✨ 新功能</text>
						<view v-for="(feature, fIndex) in log.features" :key="fIndex" class="change-item">
							<text class="change-text">• {{feature}}</text>
						</view>
					</view>
					
					<view v-if="log.improvements && log.improvements.length > 0" class="change-section">
						<text class="section-title">🔧 改进优化</text>
						<view v-for="(improvement, iIndex) in log.improvements" :key="iIndex" class="change-item">
							<text class="change-text">• {{improvement}}</text>
						</view>
					</view>
					
					<view v-if="log.fixes && log.fixes.length > 0" class="change-section">
						<text class="section-title">🐛 问题修复</text>
						<view v-for="(fix, fixIndex) in log.fixes" :key="fixIndex" class="change-item">
							<text class="change-text">• {{fix}}</text>
						</view>
					</view>
				</view>
			</view>
			
			<view v-if="updateLogs.length === 0" class="empty-state">
				<uni-icons type="info" size="40" color="#ccc"></uni-icons>
				<text class="empty-text">暂无更新日志</text>
			</view>
		</scroll-view>
		
		<view class="footer">
			<view class="btn-group">
				<view class="btn btn-secondary" @click="closeModal">
					<text class="btn-text">关闭</text>
				</view>
				<view v-if="hasUpdate" class="btn btn-primary" @click="performUpdate">
					<text class="btn-text">立即更新</text>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'UpdateLogComponent',
	props: {
		visible: {
			type: Boolean,
			default: false
		},
		currentVersion: {
			type: String,
			default: '1.0.0'
		},
		updateInfo: {
			type: Object,
			default: null
		},
		hasUpdate: {
			type: Boolean,
			default: false
		}
	},
	data() {
		return {
			updateLogs: [
				{
					version: '1.2.0',
					date: '2024-01-15',
					description: '重大功能更新，提升用户体验',
					isLatest: true,
					isCurrent: false,
					features: [
						'新增AI智能项目分析功能',
						'支持多种文件格式导入导出',
						'新增团队协作功能'
					],
					improvements: [
						'优化界面响应速度',
						'改进数据同步机制',
						'提升搜索功能准确性'
					],
					fixes: [
						'修复项目删除时的数据残留问题',
						'解决知识库搜索偶尔失效的问题'
					]
				},
				{
					version: '1.1.0',
					date: '2024-01-01',
					description: '功能增强与性能优化',
					isLatest: false,
					isCurrent: false,
					features: [
						'新增项目模板功能',
						'支持自定义标签分类'
					],
					improvements: [
						'优化数据库查询性能',
						'改进用户界面交互'
					],
					fixes: [
						'修复数据导出格式问题'
					]
				},
				{
					version: '1.0.0',
					date: '2023-12-15',
					description: '首个正式版本发布',
					isLatest: false,
					isCurrent: true,
					features: [
						'项目管理核心功能',
						'知识库管理系统',
						'AI聊天助手集成',
						'用户个人中心'
					],
					improvements: [],
					fixes: []
				}
			]
		}
	},
	mounted() {
		this.updateLogStatus()
	},
	watch: {
		currentVersion() {
			this.updateLogStatus()
		},
		updateInfo() {
			this.updateLogStatus()
		}
	},
	methods: {
		// 更新日志状态
		updateLogStatus() {
			this.updateLogs.forEach(log => {
				log.isCurrent = log.version === this.currentVersion
				log.isLatest = this.updateInfo && log.version === this.updateInfo.version
			})
		},
		
		// 关闭弹窗
		closeModal() {
			this.$emit('close')
		},
		
		// 执行更新
		performUpdate() {
			this.$emit('update')
		}
	}
}
</script>

<style scoped>
.update-log-container {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.5);
	z-index: 9999;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 40rpx;
}

.update-log-container::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: #fff;
	border-radius: 20rpx;
	box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
}

.header {
	position: relative;
	z-index: 1;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 40rpx 40rpx 20rpx;
	border-bottom: 1px solid #eee;
}

.title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
}

.close-btn {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: #f5f5f5;
}

.log-content {
	position: relative;
	z-index: 1;
	max-height: 800rpx;
	padding: 20rpx 40rpx;
}

.log-item {
	margin-bottom: 40rpx;
	padding-bottom: 40rpx;
	border-bottom: 1px solid #f0f0f0;
}

.log-item:last-child {
	border-bottom: none;
	margin-bottom: 0;
	padding-bottom: 0;
}

.log-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
}

.version-info {
	display: flex;
	align-items: center;
}

.version {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	margin-right: 20rpx;
}

.latest-badge {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	color: #fff;
	font-size: 20rpx;
	padding: 6rpx 12rpx;
	border-radius: 20rpx;
	margin-right: 10rpx;
}

.current-badge {
	background: #52c41a;
	color: #fff;
	font-size: 20rpx;
	padding: 6rpx 12rpx;
	border-radius: 20rpx;
}

.date {
	font-size: 24rpx;
	color: #999;
}

.log-body {
	padding-left: 20rpx;
}

.description {
	font-size: 28rpx;
	color: #666;
	line-height: 1.5;
	margin-bottom: 20rpx;
	display: block;
}

.change-section {
	margin-bottom: 20rpx;
}

.section-title {
	font-size: 26rpx;
	font-weight: bold;
	color: #333;
	margin-bottom: 10rpx;
	display: block;
}

.change-item {
	margin-bottom: 8rpx;
}

.change-text {
	font-size: 24rpx;
	color: #666;
	line-height: 1.4;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 100rpx 0;
}

.empty-text {
	font-size: 28rpx;
	color: #ccc;
	margin-top: 20rpx;
}

.footer {
	position: relative;
	z-index: 1;
	padding: 20rpx 40rpx 40rpx;
	border-top: 1px solid #eee;
}

.btn-group {
	display: flex;
	gap: 20rpx;
}

.btn {
	flex: 1;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 40rpx;
	transition: all 0.3s ease;
}

.btn-secondary {
	background: #f5f5f5;
	border: 1px solid #ddd;
}

.btn-primary {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.btn-text {
	font-size: 28rpx;
	font-weight: 500;
}

.btn-secondary .btn-text {
	color: #666;
}

.btn-primary .btn-text {
	color: #fff;
}

.btn:active {
	transform: scale(0.98);
	opacity: 0.8;
}
</style>