<template>
	<view class="profile-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-content">
				<text class="navbar-title">我的</text>
				<nut-icon name="setting" size="20" color="#86909C" @click="openSettings"></nut-icon>
			</view>
		</view>

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 用户信息卡片 -->
			<view class="user-card">
				<view class="user-info">
					<view class="avatar-section">
						<image class="user-avatar" :src="userInfo.avatar" mode="aspectFill"></image>
						<view class="vip-badge" v-if="userInfo.isVip">
							<nut-icon name="crown" size="12" color="#FFD700"></nut-icon>
							<text class="vip-text">VIP</text>
						</view>
					</view>
					<view class="user-details">
						<text class="user-name">{{ userInfo.name }}</text>
						<text class="user-title">{{ userInfo.title }}</text>
						<view class="user-stats">
							<view class="stat-item">
								<text class="stat-number">{{ userInfo.projectCount }}</text>
								<text class="stat-label">项目</text>
							</view>
							<view class="stat-divider"></view>
							<view class="stat-item">
								<text class="stat-number">{{ userInfo.knowledgeCount }}</text>
								<text class="stat-label">知识</text>
							</view>
							<view class="stat-divider"></view>
							<view class="stat-item">
								<text class="stat-number">{{ userInfo.days }}</text>
								<text class="stat-label">天数</text>
							</view>
						</view>
					</view>
				</view>
				<nut-icon name="right" size="16" color="#C9CDD4" @click="editProfile"></nut-icon>
			</view>

			<!-- 功能菜单 -->
			<view class="menu-section">
				<view class="menu-group">
					<view v-for="(item, index) in menuItems" :key="index" class="menu-item"
						:class="{ disabled: item.disabled }" @click="handleMenuClick(item)">
						<view class="menu-icon" :style="{ backgroundColor: item.iconBg }">
							<nut-icon :name="item.icon" size="16" :color="item.iconColor"></nut-icon>
						</view>
						<view class="menu-content">
							<text class="menu-title">{{ item.title }}</text>
							<text v-if="item.subtitle" class="menu-subtitle">{{ item.subtitle }}</text>
						</view>
						<view class="menu-extra">
							<text v-if="item.badge" class="menu-badge">{{ item.badge }}</text>
							<nut-icon name="right" size="14" color="#C9CDD4"></nut-icon>
						</view>
					</view>
				</view>
			</view>

			<!-- 版本信息 -->
			<view class="version-info">
				<text class="version-text">版本 v{{ version }}</text>
			</view>
		</view>

		<!-- 自定义tabbar -->
		<custom-tab-bar current="2"></custom-tab-bar>
	</view>
</template>

<script>
import projectApi from '@/api/projectApi.js'
import knowledgeApi from '@/api/knowledgeApi.js'
import chatApi from '@/api/chatApi.js'
import favoriteApi from '@/api/favoriteApi.js'
import CustomNavbar from '@/components/CustomNavbar.vue'
import CustomTabBar from '@/custom-tab-bar/index.vue'
import dbService from '@/utils/dbService.js'
import { version } from 'vue'

export default {
	components: {
		CustomTabBar
	},
	data() {
		return {
			userInfo: {
				avatar: '/static/images/avatar.png',
				name: '张三',
				title: '产品经理',
				isVip: true,
				projectCount: 12,
				knowledgeCount: 48,
				days: 365
			},
			aiStats: {
				todayChats: 0,
				totalAnalysis: 0
			},
			menuItems: [
				{
					icon: 'JIMI40',
					iconColor: '#165DFF',
					iconBg: '#165DFF20',
					title: 'AI设置',
					type: 'navigate',
					path: '/pages/profile/ai-settings'
				},
				{
					icon: 'refresh',
					iconColor: '#00B42A',
					iconBg: '#00B42A20',
					title: '数据库升级重试',
					type: 'action',
					handler: 'retryDatabaseUpgrade'
				},
				{
					icon: 'star',
					iconColor: '#FFD700',
					iconBg: '#FFD70020',
					title: '我的收藏',
					badge: '0',
					type: 'navigate',
					path: '/pages/profile/favorites'
				},
				{
					icon: 'notice',
					iconColor: '#86909C',
					iconBg: '#86909C20',
					title: '消息通知',
					subtitle: '待开发',
					type: 'disabled',
					disabled: true
				},
				{
					icon: 'horizontal',
					iconColor: '#165DFF',
					iconBg: '#165DFF20',
					title: '数据统计',
					type: 'navigate',
					path: '/pages/profile/stats'
				},
				{
					icon: 'tips',
					iconColor: '#86909C',
					iconBg: '#86909C20',
					title: '帮助中心',
					type: 'navigate',
					path: '/pages/profile/help'
				},
				{
					icon: 'service',
					iconColor: '#F53F3F',
					iconBg: '#F53F3F20',
					title: '意见反馈',
					subtitle: '待开发',
					type: 'disabled',
					type: 'navigate',
					path: '/pages/profile/feedback'
				}
			],
			version: '1.0.0'
		}
	},
	async mounted() {
		await this.loadUserData()
		await this.loadStatsData()
		await this.loadAIStats()
		await this.loadFavoriteCount()
		this.getCurrentVersion()
	},
	methods: {
		// 获取当前应用版本
  		getCurrentVersion() {
			// #ifdef APP-PLUS
			return plus.runtime.version
			// #endif
			// #ifndef APP-PLUS
			return '1.0.0'
			// #endif
		},
		openSettings() {
			uni.showToast({
				title: '设置',
				icon: 'none'
			})
		},
		editProfile() {
			uni.showToast({
				title: '编辑资料',
				icon: 'none'
			})
		},
		chatWithAI() {
			uni.showToast({
				title: 'AI对话',
				icon: 'none'
			})
		},
		handleMenuClick(item) {
			// 统一的菜单交互逻辑处理
			switch (item.type) {
				case 'navigate':
					// 页面跳转
					if (item.path) {
						uni.navigateTo({
							url: item.path
						})
					} else {
						console.error('导航类型菜单缺少path参数:', item)
						uni.showToast({
							title: '页面路径配置错误',
							icon: 'none'
						})
					}
					break
					
				case 'action':
					// 功能调用
					if (item.handler && typeof this[item.handler] === 'function') {
						this[item.handler]()
					} else {
						console.error('功能类型菜单缺少有效的handler:', item)
						uni.showToast({
							title: '功能配置错误',
							icon: 'none'
						})
					}
					break
					
				case 'disabled':
					// 禁用状态
					uni.showToast({
						title: item.subtitle || '功能待开发',
						icon: 'none'
					})
					break
					
				default:
					// 未知类型
					console.error('未知的菜单类型:', item)
					uni.showToast({
						title: '菜单类型配置错误',
						icon: 'none'
					})
			}
		},
		
		/**
		 * 打开AI设置
		 */
		openAISettings() {
			uni.showToast({
				title: 'AI设置功能开发中',
				icon: 'none'
			})
			// TODO: 实现AI设置页面跳转
			// uni.navigateTo({
			//     url: '/pages/settings/ai'
			// })
		},

		async retryDatabaseUpgrade() {
			uni.showModal({
				title: '数据库升级重试',
				content: '确定要强制重新执行数据库升级脚本吗？这将忽略版本控制，重新执行最近的升级脚本来修复数据库问题。',
				success: async (res) => {
					if (res.confirm) {
						uni.showLoading({
							title: '强制升级中...'
						})

						try {
							// 初始化数据库服务
							// await dbService.init()

							// 强制重新执行数据库升级
							await dbService.forceRetryUpgrade()

							uni.hideLoading()
							uni.showToast({
								title: '数据库升级成功',
								icon: 'success',
								duration: 3000
							})

							// 提示用户重启应用
							setTimeout(() => {
								uni.showModal({
									title: '升级完成',
									content: '数据库升级已完成，建议重启应用以确保所有功能正常工作。',
									showCancel: false,
									confirmText: '知道了'
								})
							}, 3000)

						} catch (error) {
							console.error('数据库升级失败:', error)
							uni.hideLoading()
							uni.showModal({
								title: '升级失败',
								content: `数据库升级失败：${error.message || '未知错误'}\n\n请检查控制台日志获取详细信息。`,
								showCancel: false
							})
						}
					}
				}
			})
		},
		async loadUserData() {
			try {
				// 获取用户项目和知识统计
				const projects = await projectApi.getAllProjects()
				const knowledge = await knowledgeApi.getAllKnowledge()

				this.userInfo.projectCount = projects.length
				this.userInfo.knowledgeCount = knowledge.length
			} catch (error) {
				console.error('加载用户数据失败:', error)
			}
		},
		async loadStatsData() {
			try {
				// 获取项目统计
				const projects = await projectApi.getAllProjects()
				this.statsData[0].value = projects.length

				// 获取知识统计
				const knowledge = await knowledgeApi.getAllKnowledge()
				this.statsData[1].value = knowledge.length

				// 计算完成率（示例逻辑）
				const completedProjects = projects.filter(p => p.status === 'completed')
				const completionRate = projects.length > 0 ? Math.round((completedProjects.length / projects.length) * 100) : 0
				this.statsData[2].value = `${completionRate}%`

			} catch (error) {
				console.error('加载统计数据失败:', error)
			}
		},
		async loadAIStats() {
			try {
				// 获取AI助手统计数据
				const stats = await chatApi.getAIStats()
				this.aiStats.todayChats = stats.todayChats || 0
				this.aiStats.totalAnalysis = stats.totalAnalysis || 0
			} catch (error) {
				console.error('加载AI统计数据失败:', error)
			}
		},
		
		/**
		 * 加载收藏数量
		 */
		async loadFavoriteCount() {
			try {
				const stats = await favoriteApi.getFavoritesStats()
				// 更新收藏菜单项的badge
				const favoriteMenuItem = this.menuItems.find(item => item.title === '我的收藏')
				if (favoriteMenuItem) {
					favoriteMenuItem.badge = String(stats.total || 0)
				}
			} catch (error) {
				console.error('加载收藏统计失败:', error)
			}
		}
	}
}
</script>

<style scoped>
.profile-page {
	min-height: 100vh;
	background-color: #F2F3F5;
	padding-bottom: 160rpx;
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
}

.page-content {
	padding: calc(var(--status-bar-height) + 120rpx) 32rpx 32rpx;
}

.user-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.user-info {
	display: flex;
	align-items: center;
	gap: 24rpx;
	flex: 1;
}

.avatar-section {
	position: relative;
}

.user-avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	background-color: #F2F3F5;
}

.vip-badge {
	position: absolute;
	bottom: -4rpx;
	right: -4rpx;
	background: linear-gradient(135deg, #FFD700, #FFA500);
	border-radius: 16rpx;
	padding: 4rpx 8rpx;
	display: flex;
	align-items: center;
	gap: 4rpx;
	border: 2rpx solid #ffffff;
}

.vip-text {
	font-size: 18rpx;
	color: #ffffff;
	font-weight: 600;
}

.user-details {
	flex: 1;
}

.user-name {
	font-size: 36rpx;
	font-weight: bold;
	color: #1D2129;
	margin-bottom: 8rpx;
	display: block;
}

.user-title {
	font-size: 24rpx;
	color: #86909C;
	margin-bottom: 16rpx;
	display: block;
}

.user-stats {
	display: flex;
	align-items: center;
	gap: 24rpx;
}

.stat-item {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4rpx;
}

.stat-number {
	font-size: 28rpx;
	font-weight: bold;
	color: #1D2129;
}

.stat-label {
	font-size: 20rpx;
	color: #86909C;
}

.stat-divider {
	width: 2rpx;
	height: 32rpx;
	background-color: #E5E6EB;
}

.ai-assistant-card {
	background: linear-gradient(135deg, #165DFF10, #165DFF05);
	border: 2rpx solid #165DFF20;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
}

.ai-header {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 24rpx;
}

.ai-icon {
	width: 48rpx;
	height: 48rpx;
	border-radius: 50%;
	background-color: #165DFF20;
	display: flex;
	align-items: center;
	justify-content: center;
}

.ai-info {
	flex: 1;
}

.ai-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 4rpx;
	display: block;
}

.ai-subtitle {
	font-size: 24rpx;
	color: #86909C;
	display: block;
}

.ai-stats {
	display: flex;
	gap: 48rpx;
}

.ai-stat-item {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.ai-stat-label {
	font-size: 24rpx;
	color: #86909C;
}

.ai-stat-value {
	font-size: 32rpx;
	font-weight: bold;
	color: #165DFF;
}

.menu-section {
	margin-bottom: 24rpx;
}

.menu-group {
	background-color: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.menu-item {
	display: flex;
	align-items: center;
	padding: 24rpx 32rpx;
	border-bottom: 2rpx solid #F2F3F5;
	transition: all 0.3s ease;
}

.menu-item:last-child {
	border-bottom: none;
}

.menu-item:active {
	background-color: #F2F3F5;
}

.menu-item.disabled {
	opacity: 0.5;
}

.menu-item.disabled:active {
	background-color: #ffffff;
}

.menu-icon {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
}

.menu-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.menu-title {
	font-size: 28rpx;
	color: #1D2129;
	display: block;
}

.menu-subtitle {
	font-size: 24rpx;
	color: #86909C;
	display: block;
}

.menu-extra {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.menu-badge {
	background-color: #F53F3F;
	color: #ffffff;
	font-size: 20rpx;
	padding: 4rpx 8rpx;
	border-radius: 8rpx;
	min-width: 32rpx;
	height: 32rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.stats-section {
	margin-bottom: 24rpx;
}

.stats-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 16rpx;
}

.stats-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16rpx;
}

.stats-item {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 24rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
}

.stats-number {
	font-size: 40rpx;
	font-weight: bold;
	color: #1D2129;
}

.stats-label {
	font-size: 24rpx;
	color: #86909C;
}

.stats-trend {
	display: flex;
	align-items: center;
	gap: 4rpx;
}

.stats-trend.up {
	color: #00B42A;
}

.stats-trend.down {
	color: #F53F3F;
}

.trend-text {
	font-size: 20rpx;
	font-weight: 500;
}

.version-info {
	text-align: center;
	padding: 32rpx;
}

.version-text {
	font-size: 24rpx;
	color: #C9CDD4;
}
</style>