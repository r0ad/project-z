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

			<!-- AI助手卡片 -->
			<view class="ai-assistant-card">
				<view class="ai-header">
					<view class="ai-icon">
						<nut-icon name="robot" size="20" color="#165DFF"></nut-icon>
					</view>
					<view class="ai-info">
						<text class="ai-title">AI助手</text>
						<text class="ai-subtitle">智能分析，高效决策</text>
					</view>
					<nut-button type="primary" size="small" @click="chatWithAI">
						对话
					</nut-button>
				</view>
				<view class="ai-stats">
					<view class="ai-stat-item">
						<text class="ai-stat-label">今日对话</text>
						<text class="ai-stat-value">{{ aiStats.todayChats }}</text>
					</view>
					<view class="ai-stat-item">
						<text class="ai-stat-label">总计分析</text>
						<text class="ai-stat-value">{{ aiStats.totalAnalysis }}</text>
					</view>
				</view>
			</view>

			<!-- 功能菜单 -->
			<view class="menu-section">
				<view class="menu-group">
					<view 
						v-for="(item, index) in menuItems" 
						:key="index"
						class="menu-item"
						@click="handleMenuClick(item)"
					>
						<view class="menu-icon" :style="{ backgroundColor: item.iconBg }">
							<nut-icon :name="item.icon" size="16" :color="item.iconColor"></nut-icon>
						</view>
						<text class="menu-title">{{ item.title }}</text>
						<view class="menu-extra">
							<text v-if="item.badge" class="menu-badge">{{ item.badge }}</text>
							<nut-icon name="right" size="14" color="#C9CDD4"></nut-icon>
						</view>
					</view>
				</view>
			</view>

			<!-- 数据统计 -->
			<view class="stats-section">
				<view class="stats-title">数据统计</view>
				<view class="stats-grid">
					<view 
						v-for="(stat, index) in statsData" 
						:key="index"
						class="stats-item"
					>
						<text class="stats-number">{{ stat.value }}</text>
						<text class="stats-label">{{ stat.label }}</text>
						<view class="stats-trend" :class="stat.trend">
							<nut-icon :name="stat.trend === 'up' ? 'arrow-up' : 'arrow-down'" size="10"></nut-icon>
							<text class="trend-text">{{ stat.change }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 版本信息 -->
			<view class="version-info">
				<text class="version-text">版本 v1.0.0</text>
			</view>
		</view>

		<!-- 自定义tabbar -->
		<custom-tab-bar current="2"></custom-tab-bar>
	</view>
</template>

<script>
import CustomTabBar from '@/custom-tab-bar/index.vue'

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
				todayChats: 8,
				totalAnalysis: 156
			},
			menuItems: [
				{
					icon: 'star',
					iconColor: '#FFD700',
					iconBg: '#FFD70020',
					title: '我的收藏',
					badge: '3',
					action: 'favorites'
				},
				{
					icon: 'download',
					iconColor: '#00B42A',
					iconBg: '#00B42A20',
					title: '离线下载',
					action: 'downloads'
				},
				{
					icon: 'clock',
					iconColor: '#165DFF',
					iconBg: '#165DFF20',
					title: '浏览历史',
					action: 'history'
				},
				{
					icon: 'notice',
					iconColor: '#FF7D00',
					iconBg: '#FF7D0020',
					title: '消息通知',
					badge: '2',
					action: 'notifications'
				},
				{
					icon: 'tips',
					iconColor: '#86909C',
					iconBg: '#86909C20',
					title: '帮助中心',
					action: 'help'
				},
				{
					icon: 'service',
					iconColor: '#F53F3F',
					iconBg: '#F53F3F20',
					title: '意见反馈',
					action: 'feedback'
				}
			],
			statsData: [
				{
					label: '本周完成',
					value: '8',
					change: '+12%',
					trend: 'up'
				},
				{
					label: '学习时长',
					value: '24h',
					change: '+8%',
					trend: 'up'
				},
				{
					label: '效率提升',
					value: '35%',
					change: '+5%',
					trend: 'up'
				},
				{
					label: '目标达成',
					value: '92%',
					change: '-2%',
					trend: 'down'
				}
			]
		}
	},
	methods: {
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
			switch (item.action) {
				case 'favorites':
					uni.showToast({ title: '我的收藏', icon: 'none' })
					break
				case 'downloads':
					uni.showToast({ title: '离线下载', icon: 'none' })
					break
				case 'history':
					uni.showToast({ title: '浏览历史', icon: 'none' })
					break
				case 'notifications':
					uni.showToast({ title: '消息通知', icon: 'none' })
					break
				case 'help':
					uni.showToast({ title: '帮助中心', icon: 'none' })
					break
				case 'feedback':
					uni.showToast({ title: '意见反馈', icon: 'none' })
					break
				default:
					break
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

.menu-icon {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
}

.menu-title {
	font-size: 28rpx;
	color: #1D2129;
	flex: 1;
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