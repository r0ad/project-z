<template>
	<view class="stats-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar title="数据统计" />

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 时间筛选 -->
			<view class="time-filter">
				<view class="filter-tabs">
					<view 
						v-for="(tab, index) in timeTabs" 
						:key="index" 
						class="filter-tab"
						:class="{ active: activeTimeTab === index }"
						@click="switchTimeTab(index)"
					>
						{{ tab.label }}
					</view>
				</view>
			</view>

			<!-- 核心数据卡片 -->
			<view class="core-stats">
				<view class="stats-grid">
					<view 
						v-for="(stat, index) in coreStats" 
						:key="index" 
						class="stat-card"
					>
						<view class="stat-icon" :style="{ backgroundColor: stat.iconBg }">
							<nut-icon :name="stat.icon" size="20" :color="stat.iconColor"></nut-icon>
						</view>
						<view class="stat-info">
							<text class="stat-value">{{ stat.value }}</text>
							<text class="stat-label">{{ stat.label }}</text>
							<view v-if="stat.trend" class="stat-trend" :class="stat.trend.type">
								<nut-icon 
									:name="stat.trend.type === 'up' ? 'arrow-up' : 'arrow-down'" 
									size="12"
								></nut-icon>
								<text>{{ stat.trend.value }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 图表区域 -->
			<view class="chart-section">
				<view class="chart-card">
					<view class="chart-header">
						<text class="chart-title">项目活跃度趋势</text>
						<view class="chart-legend">
							<view class="legend-item">
								<view class="legend-dot" style="background-color: #165DFF;"></view>
								<text class="legend-text">项目数</text>
							</view>
							<view class="legend-item">
								<view class="legend-dot" style="background-color: #00B42A;"></view>
								<text class="legend-text">AI对话</text>
							</view>
						</view>
					</view>
					<view class="chart-container">
						<qiun-data-charts 
							type="line" 
							:opts="chartOpts" 
							:chartData="chartData"
							:canvas2d="true"
							:canvasId="'lineChart'"
							:width="chartWidth"
							:height="300"
						></qiun-data-charts>
					</view>
				</view>
			</view>

			<!-- 详细统计 -->
			<view class="detail-stats">
				<view class="section-title">详细统计</view>
				<view class="detail-list">
					<view 
						v-for="(item, index) in detailStats" 
						:key="index" 
						class="detail-item"
					>
						<view class="detail-left">
							<view class="detail-icon" :style="{ backgroundColor: item.iconBg }">
								<nut-icon :name="item.icon" size="16" :color="item.iconColor"></nut-icon>
							</view>
							<view class="detail-info">
								<text class="detail-label">{{ item.label }}</text>
								<text class="detail-desc">{{ item.description }}</text>
							</view>
						</view>
						<view class="detail-right">
							<text class="detail-value">{{ item.value }}</text>
							<text class="detail-unit">{{ item.unit }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 使用习惯 -->
			<view class="usage-section">
				<view class="section-title">使用习惯</view>
				<view class="usage-card">
					<view class="usage-item">
						<text class="usage-label">最活跃时段</text>
						<text class="usage-value">{{ mostActiveTime }}</text>
					</view>
					<view class="usage-item">
						<text class="usage-label">平均会话时长</text>
						<text class="usage-value">{{ avgSessionTime }}</text>
					</view>
					<view class="usage-item">
						<text class="usage-label">常用功能</text>
						<text class="usage-value">{{ mostUsedFeature }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import CustomNavbar from '@/components/CustomNavbar.vue'
import favoriteApi from '@/api/favoriteApi.js'
import chatApi from '@/api/chatApi.js'
import projectApi from '@/api/projectApi.js'
import knowledgeApi from '@/api/knowledgeApi.js'

export default {
	components: {
		CustomNavbar
	},
	data() {
		return {
			activeTimeTab: 0,
			loading: false,
			timeTabs: [
				{ label: '今日', value: 'today' },
				{ label: '本周', value: 'week' },
				{ label: '本月', value: 'month' },
				{ label: '全部', value: 'all' }
			],
			coreStats: [
				{
					icon: 'category',
					iconColor: '#165DFF',
					iconBg: '#165DFF20',
					value: '12',
					label: '项目总数',
					trend: { type: 'up', value: '+2' }
				},
				{
					icon: 'JIMI40',
					iconColor: '#00B42A',
					iconBg: '#00B42A20',
					value: '156',
					label: 'AI对话',
					trend: { type: 'up', value: '+23' }
				},
				{
					icon: 'book',
					iconColor: '#FF7D00',
					iconBg: '#FF7D0020',
					value: '89',
					label: '知识条目',
					trend: { type: 'up', value: '+5' }
				},
				{
					icon: 'star-fill',
					iconColor: '#F53F3F',
					iconBg: '#F53F3F20',
					value: '34',
					label: '收藏数量',
					trend: { type: 'up', value: '+1' }
				}
			],
			chartWidth: 0,
			chartOpts: {
				color: ['#165DFF', '#00B42A'],
				padding: [15, 15, 0, 15],
				dataLabel: false,
				dataPointShape: false,
				enableScroll: false,
				xAxis: {
					disabled: false
				},
				yAxis: {
					gridType: 'dash',
					dashLength: 2
				},
				extra: {
					line: {
						type: 'curve',
						width: 2
					}
				}
			},
			chartData: {},
			detailStats: [
				{
					icon: 'clock',
					iconColor: '#165DFF',
					iconBg: '#165DFF20',
					label: '总使用时长',
					description: '累计使用应用时间',
					value: '48.5',
					unit: '小时'
				},
				{
					icon: 'message',
					iconColor: '#00B42A',
					iconBg: '#00B42A20',
					label: '消息总数',
					description: '发送和接收的消息',
					value: '1,234',
					unit: '条'
				},
				{
					icon: 'check-checked',
					iconColor: '#00B42A',
					iconBg: '#00B42A20',
					label: '完成任务',
					description: '已完成的项目任务',
					value: '67',
					unit: '个'
				},
				{
					icon: 'share',
					iconColor: '#FF7D00',
					iconBg: '#FF7D0020',
					label: '分享次数',
					description: '分享项目和知识',
					value: '23',
					unit: '次'
				}
			],
			mostActiveTime: '14:00-16:00',
			avgSessionTime: '25分钟',
			mostUsedFeature: 'AI助手'
		}
	},
	mounted() {
		this.initChart()
		this.loadStatsData()
	},
	methods: {
		switchTimeTab(index) {
			this.activeTimeTab = index
			this.loadStatsData()
		},
		initChart() {
			// 获取屏幕宽度
			const systemInfo = uni.getSystemInfoSync()
			this.chartWidth = systemInfo.windowWidth - 64 // 减去padding
			
			// 初始化图表数据
			this.chartData = {
				categories: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
				series: [
					{
						name: '项目数',
						data: [2, 3, 1, 4, 2, 3, 2]
					},
					{
						name: 'AI对话',
						data: [12, 18, 8, 25, 15, 20, 16]
					}
				]
			}
		},
		async loadStatsData() {
			this.loading = true
			try {
				const timeRange = this.timeTabs[this.activeTimeTab].value
				console.log('加载统计数据:', timeRange)
				
				// 并行获取各种统计数据
				const [favoriteStats, aiStats, projectStats, knowledgeStats] = await Promise.all([
					favoriteApi.getFavoritesStats(),
					chatApi.getAIStats(),
					this.getProjectStats(),
					this.getKnowledgeStats()
				])
				
				// 更新核心统计数据
				this.coreStats[0].value = String(projectStats.total || 0)
				this.coreStats[1].value = String(aiStats.todayChats || 0)
				this.coreStats[2].value = String(knowledgeStats.total || 0)
				this.coreStats[3].value = String(favoriteStats.total || 0)
				
				// 更新详细统计
				this.detailStats[0].value = `${Math.floor(Math.random() * 200)}.5`
				this.detailStats[1].value = String(aiStats.totalAnalysis || 1234)
				this.detailStats[2].value = String(projectStats.completed || 67)
				this.detailStats[3].value = String(Math.floor(Math.random() * 50) + 10)
				
				// 更新图表数据
				this.updateChartData(timeRange)
				
			} catch (error) {
				console.error('加载统计数据失败:', error)
				uni.showToast({
					title: '加载失败，请重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		
		async getProjectStats() {
			try {
				const projects = await projectApi.getProjectList()
				const completed = projects.filter(p => p.status === 'completed').length
				return {
					total: projects.length,
					completed
				}
			} catch (error) {
				console.error('获取项目统计失败:', error)
				return { total: 0, completed: 0 }
			}
		},
		
		async getKnowledgeStats() {
			try {
				const knowledge = await knowledgeApi.getKnowledgeList()
				return {
					total: knowledge.length
				}
			} catch (error) {
				console.error('获取知识统计失败:', error)
				return { total: 0 }
			}
		},
		
		updateChartData(timeRange) {
			// 根据时间范围更新图表数据
			let categories, projectData, chatData
			
			switch (timeRange) {
				case 'today':
					categories = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00']
					projectData = [0, 0, 1, 1, 0, 0]
					chatData = [2, 1, 8, 15, 12, 6]
					break
				case 'week':
					categories = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
					projectData = [2, 3, 1, 4, 2, 3, 2]
					chatData = [12, 18, 8, 25, 15, 20, 16]
					break
				case 'month':
					categories = ['第1周', '第2周', '第3周', '第4周']
					projectData = [8, 12, 6, 10]
					chatData = [65, 78, 82, 71]
					break
				default:
					categories = ['1月', '2月', '3月', '4月', '5月', '6月']
					projectData = [25, 30, 18, 35, 28, 32]
					chatData = [120, 145, 167, 189, 201, 178]
			}
			
			this.chartData = {
				categories,
				series: [
					{
						name: '项目数',
						data: projectData
					},
					{
						name: 'AI对话',
						data: chatData
					}
				]
			}
		}
	}
}
</script>

<style scoped>
.stats-page {
	min-height: 100vh;
	background-color: #F2F3F5;
}

.page-content {
	padding: calc(var(--status-bar-height) + 146rpx) 32rpx 32rpx;
}

.time-filter {
	margin-bottom: 32rpx;
}

.filter-tabs {
	display: flex;
	background-color: #ffffff;
	border-radius: 12rpx;
	padding: 8rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.filter-tab {
	flex: 1;
	text-align: center;
	padding: 16rpx 24rpx;
	border-radius: 8rpx;
	font-size: 28rpx;
	color: #86909C;
	transition: all 0.3s ease;
}

.filter-tab.active {
	background-color: #165DFF;
	color: #ffffff;
	font-weight: 500;
}

.core-stats {
	margin-bottom: 32rpx;
}

.stats-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16rpx;
}

.stat-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	gap: 24rpx;
}

.stat-icon {
	width: 64rpx;
	height: 64rpx;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.stat-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.stat-value {
	font-size: 36rpx;
	font-weight: 600;
	color: #1D2129;
	display: block;
}

.stat-label {
	font-size: 24rpx;
	color: #86909C;
	display: block;
}

.stat-trend {
	display: flex;
	align-items: center;
	gap: 4rpx;
	font-size: 20rpx;
	font-weight: 500;
}

.stat-trend.up {
	color: #00B42A;
}

.stat-trend.down {
	color: #F53F3F;
}

.chart-section {
	margin-bottom: 32rpx;
}

.chart-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.chart-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 24rpx;
}

.chart-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.chart-legend {
	display: flex;
	gap: 24rpx;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.legend-dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
}

.legend-text {
	font-size: 24rpx;
	color: #86909C;
}

.chart-container {
	width: 100%;
	height: 300rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 24rpx;
}

.detail-stats {
	margin-bottom: 32rpx;
}

.detail-list {
	background-color: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.detail-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 32rpx;
	border-bottom: 2rpx solid #F2F3F5;
}

.detail-item:last-child {
	border-bottom: none;
}

.detail-left {
	display: flex;
	align-items: center;
	gap: 24rpx;
}

.detail-icon {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.detail-info {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.detail-label {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 500;
	display: block;
}

.detail-desc {
	font-size: 24rpx;
	color: #86909C;
	display: block;
}

.detail-right {
	display: flex;
	align-items: baseline;
	gap: 8rpx;
}

.detail-value {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.detail-unit {
	font-size: 24rpx;
	color: #86909C;
}

.usage-section {
	margin-bottom: 32rpx;
}

.usage-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: column;
	gap: 32rpx;
}

.usage-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.usage-label {
	font-size: 28rpx;
	color: #4E5969;
}

.usage-value {
	font-size: 28rpx;
	font-weight: 500;
	color: #1D2129;
}
</style>