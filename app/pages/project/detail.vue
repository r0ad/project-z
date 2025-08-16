<template>
	<view class="project-detail-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-content">
				<nut-icon name="left" size="20" color="#86909C" @click="goBack"></nut-icon>
				<text class="navbar-title">{{ projectTitle }}</text>
				<nut-icon name="more-x" size="20" color="#86909C"></nut-icon>
			</view>
		</view>

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 标签导航 -->
			<view class="tab-nav">
				<view 
					v-for="(tab, index) in tabs" 
					:key="index"
					class="tab-item"
					:class="{ active: activeTab === index }"
					@click="switchTab(index)"
				>
					{{ tab.name }}
				</view>
			</view>

			<!-- 标签内容 -->
			<view class="tab-content">
				<!-- 目标与节点 -->
				<view v-if="activeTab === 0" class="tab-panel">
					<!-- 项目目标 -->
					<view class="card">
						<view class="card-header">
							<nut-icon name="target" color="#165DFF" size="16"></nut-icon>
							<text class="card-title">项目目标</text>
						</view>
						<text class="goal-text">{{ projectGoal }}</text>
						<view class="ai-tip">
							<text class="ai-tip-text">AI提示：目标符合SMART原则，可执行性高</text>
						</view>
					</view>

					<!-- 关键节点 -->
					<view class="card">
						<view class="card-header">
							<nut-icon name="list" color="#165DFF" size="16"></nut-icon>
							<text class="card-title">关键节点</text>
						</view>
						
						<view class="milestone-list">
							<view 
								v-for="(milestone, index) in milestones" 
								:key="index"
								class="milestone-item"
							>
								<view class="milestone-number" :class="getMilestoneClass(milestone.status)">
									{{ index + 1 }}
								</view>
								<view class="milestone-content">
									<text class="milestone-title">{{ milestone.title }}</text>
									<text class="milestone-deadline">截止：{{ milestone.deadline }}</text>
									<view v-if="milestone.status === 'completed'" class="milestone-status completed">
										已完成
									</view>
									<view v-else-if="milestone.status === 'progress'" class="milestone-progress">
										<view class="progress-header">
											<text class="progress-label">进度</text>
											<text class="progress-value">{{ milestone.progress }}%</text>
										</view>
										<nut-progress 
											:percentage="milestone.progress" 
											color="#165DFF"
											:show-text="false"
											height="6rpx"
										></nut-progress>
									</view>
									<view v-else class="milestone-status pending">
										未开始
									</view>
								</view>
							</view>
						</view>
					</view>

					<!-- AI提醒 -->
					<view class="warning-card">
						<nut-icon name="notice" color="#FF7D00" size="16"></nut-icon>
						<text class="warning-text">AI提醒：核心开发节点按当前进度，可能提前2天完成，建议提前准备测试计划</text>
					</view>
				</view>

				<!-- 项目日志 -->
				<view v-if="activeTab === 1" class="tab-panel">
					<view class="log-list">
						<view 
							v-for="(log, index) in projectLogs" 
							:key="index"
							class="log-item"
						>
							<view class="log-time">{{ log.time }}</view>
							<view class="log-content">
								<view v-if="log.progress" class="log-entry">
									<text class="log-label progress">进展：</text>
									<text class="log-text">{{ log.progress }}</text>
								</view>
								<view v-if="log.problem" class="log-entry">
									<text class="log-label problem">问题：</text>
									<text class="log-text">{{ log.problem }}</text>
								</view>
								<view v-if="log.plan" class="log-entry">
									<text class="log-label plan">计划：</text>
									<text class="log-text">{{ log.plan }}</text>
								</view>
							</view>
						</view>
					</view>
				</view>

				<!-- AI分析 -->
				<view v-if="activeTab === 2" class="tab-panel">
					<view class="card">
						<view class="card-header">
							<nut-icon name="chart-pie" color="#165DFF" size="16"></nut-icon>
							<text class="card-title">项目分析</text>
						</view>
						<text class="analysis-text">基于当前进度和历史数据，AI分析显示项目整体进展良好，预计可按时完成。建议重点关注API性能优化环节。</text>
					</view>
				</view>

				<!-- 总结 -->
				<view v-if="activeTab === 3" class="tab-panel">
					<view class="card">
						<view class="card-header">
							<nut-icon name="file-text" color="#165DFF" size="16"></nut-icon>
							<text class="card-title">项目总结</text>
						</view>
						<text class="summary-text">项目进展顺利，已完成需求确认阶段，核心开发阶段进度良好。团队协作效率高，技术难点逐步攻克。</text>
					</view>
				</view>
			</view>

			<!-- 底部操作区 -->
			<view class="bottom-actions">
				<nut-button type="primary" size="large" block @click="addLog">
					<nut-icon name="plus" size="14"></nut-icon>
					记录日志
				</nut-button>
				<nut-button type="default" size="large" block @click="chatProject" style="margin-top: 16rpx;">
					<nut-icon name="comment" size="14"></nut-icon>
					聊项目
				</nut-button>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			projectId: '',
			projectTitle: 'AI工具开发',
			projectGoal: '30天开发一款支持文本生成的AI小工具，用户留存率≥60%',
			activeTab: 0,
			tabs: [
				{ name: '目标与节点' },
				{ name: '项目日志' },
				{ name: 'AI分析' },
				{ name: '总结' }
			],
			milestones: [
				{
					title: '需求确认',
					deadline: '2023-07-10',
					status: 'completed'
				},
				{
					title: '核心开发',
					deadline: '2023-07-25',
					status: 'progress',
					progress: 80
				},
				{
					title: '测试优化',
					deadline: '2023-08-05',
					status: 'pending'
				}
			],
			projectLogs: [
				{
					time: '今天 14:30',
					progress: '完成文本生成API对接，测试成功',
					problem: '大文本生成时有延迟，超过3秒',
					plan: '明天优化API调用方式，实现流式输出'
				},
				{
					time: '昨天 09:15',
					progress: '完成前端界面开发，包含输入框和结果展示区',
					problem: '暂无',
					plan: '今日开始对接后端API'
				},
				{
					time: '2023-07-18 16:40',
					progress: '完成后端服务搭建，数据库设计',
					problem: 'API接口文档不清晰，需进一步确认',
					plan: '明天与API提供方沟通确认细节'
				}
			]
		}
	},
	onLoad(options) {
		if (options.id) {
			this.projectId = options.id
		}
		if (options.title) {
			this.projectTitle = decodeURIComponent(options.title)
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		switchTab(index) {
			this.activeTab = index
		},
		getMilestoneClass(status) {
			return {
				completed: status === 'completed',
				progress: status === 'progress',
				pending: status === 'pending'
			}
		},
		addLog() {
			uni.navigateTo({
				url: `/pages/project/log?projectId=${this.projectId}&projectName=${this.projectTitle}`
			})
		},
		chatProject() {
			uni.navigateTo({
				url: `/pages/project/chat?projectId=${this.projectId}&projectName=${this.projectTitle}&progress=${this.projectProgress}`
			})
		}
	}
}
</script>

<style scoped>
.project-detail-page {
	min-height: 100vh;
	background-color: #F2F3F5;
}

.custom-navbar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1000;
	background-color: #ffffff;
	border-bottom: 2rpx solid #E5E6EB;
	padding-top: var(--status-bar-height);
}

.navbar-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 32rpx;
}

.navbar-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #1D2129;
	flex: 1;
	text-align: center;
	margin: 0 32rpx;
}

.page-content {
	padding: calc(var(--status-bar-height) + 120rpx) 32rpx 200rpx;
}

.tab-nav {
	display: flex;
	border-bottom: 2rpx solid #E5E6EB;
	margin-bottom: 32rpx;
	background-color: #ffffff;
	border-radius: 16rpx 16rpx 0 0;
}

.tab-item {
	padding: 24rpx 32rpx;
	font-size: 28rpx;
	color: #86909C;
	transition: all 0.3s ease;
	position: relative;
}

.tab-item.active {
	color: #165DFF;
	font-weight: 500;
}

.tab-item.active::after {
	content: '';
	position: absolute;
	bottom: 0;
	left: 50%;
	transform: translateX(-50%);
	width: 60rpx;
	height: 4rpx;
	background-color: #165DFF;
	border-radius: 2rpx;
}

.tab-content {
	min-height: 600rpx;
}

.tab-panel {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.card-header {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 24rpx;
}

.card-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.goal-text {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.6;
	margin-bottom: 24rpx;
	display: block;
}

.ai-tip {
	background: linear-gradient(135deg, #165DFF10, #165DFF05);
	border-radius: 12rpx;
	padding: 16rpx;
}

.ai-tip-text {
	font-size: 24rpx;
	color: #165DFF;
	display: block;
}

.milestone-list {
	display: flex;
	flex-direction: column;
	gap: 32rpx;
}

.milestone-item {
	display: flex;
	align-items: flex-start;
	gap: 24rpx;
}

.milestone-number {
	width: 48rpx;
	height: 48rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 24rpx;
	font-weight: 600;
	flex-shrink: 0;
	margin-top: 8rpx;
}

.milestone-number.completed {
	background-color: #00B42A;
	color: #ffffff;
}

.milestone-number.progress {
	background-color: #165DFF;
	color: #ffffff;
}

.milestone-number.pending {
	background-color: #F2F3F5;
	color: #86909C;
}

.milestone-content {
	flex: 1;
}

.milestone-title {
	font-size: 28rpx;
	font-weight: 500;
	color: #1D2129;
	display: block;
	margin-bottom: 8rpx;
}

.milestone-deadline {
	font-size: 24rpx;
	color: #86909C;
	display: block;
	margin-bottom: 16rpx;
}

.milestone-status {
	font-size: 24rpx;
	padding: 8rpx 16rpx;
	border-radius: 8rpx;
	display: inline-block;
}

.milestone-status.completed {
	background-color: #00B42A10;
	color: #00B42A;
}

.milestone-status.pending {
	background-color: #F2F3F5;
	color: #86909C;
}

.milestone-progress {
	margin-top: 16rpx;
}

.progress-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12rpx;
}

.progress-label {
	font-size: 24rpx;
	color: #4E5969;
}

.progress-value {
	font-size: 24rpx;
	color: #4E5969;
	font-weight: 500;
}

.warning-card {
	background: linear-gradient(135deg, #FF7D0010, #FF7D0005);
	border: 2rpx solid #FF7D0020;
	border-radius: 16rpx;
	padding: 24rpx;
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
}

.warning-text {
	font-size: 28rpx;
	color: #FF7D00;
	line-height: 1.5;
	flex: 1;
}

.log-list {
	display: flex;
	flex-direction: column;
	gap: 32rpx;
	max-height: 600rpx;
	overflow-y: auto;
}

.log-item {
	position: relative;
	padding-left: 48rpx;
	padding-bottom: 32rpx;
}

.log-item::before {
	content: '';
	position: absolute;
	left: 0;
	top: 8rpx;
	width: 24rpx;
	height: 24rpx;
	border-radius: 50%;
	background-color: #165DFF;
}

.log-item::after {
	content: '';
	position: absolute;
	left: 12rpx;
	top: 32rpx;
	bottom: 0;
	width: 2rpx;
	background-color: #E5E6EB;
}

.log-item:last-child::after {
	display: none;
}

.log-time {
	font-size: 28rpx;
	font-weight: 500;
	color: #1D2129;
	margin-bottom: 16rpx;
	display: block;
}

.log-content {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.log-entry {
	display: flex;
	align-items: flex-start;
	gap: 8rpx;
}

.log-label {
	font-size: 28rpx;
	font-weight: 500;
	flex-shrink: 0;
}

.log-label.progress {
	color: #165DFF;
}

.log-label.problem {
	color: #FF7D00;
}

.log-label.plan {
	color: #00B42A;
}

.log-text {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.5;
	flex: 1;
}

.analysis-text,
.summary-text {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.6;
	display: block;
}

.bottom-actions {
	position: fixed;
	bottom: 32rpx;
	left: 32rpx;
	right: 32rpx;
	z-index: 100;
}
</style>