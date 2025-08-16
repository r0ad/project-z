<template>
	<view class="project-list-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-content">
				<text class="navbar-title">项目列表</text>
				<nut-button type="primary" size="small" @click="createProject">
					<nut-icon name="plus" size="14"></nut-icon>
					新建项目
				</nut-button>
			</view>
		</view>

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 快捷提示 -->
			<view class="tip-card">
				<nut-icon name="tips" color="#165DFF" size="16"></nut-icon>
				<text class="tip-text">点击项目卡片进入详情，或使用右上角按钮创建新项目</text>
			</view>

			<!-- 项目列表 -->
			<view class="project-list">
				<view 
					v-for="(project, index) in projectList" 
					:key="index" 
					class="project-card"
					@click="goToDetail(project)"
				>
					<view class="card-header">
						<text class="project-title">{{ project.title }}</text>
						<view class="card-actions">
							<nut-tag 
								:type="getStatusType(project.status)" 
								size="small"
							>
								{{ project.statusText }}
							</nut-tag>
							<nut-icon 
								name="del" 
								size="16" 
								color="#FF4D4F"
								class="delete-icon"
								@click.stop="deleteProject(project, index)"
							></nut-icon>
						</view>
					</view>
					
					<text class="project-desc">{{ project.description }}</text>
					
					<view class="progress-section">
						<view class="progress-header">
							<text class="progress-label">进度</text>
							<text class="progress-value">{{ project.progress }}%</text>
						</view>
						<nut-progress 
							:percentage="project.progress" 
							:color="getProgressColor(project.status)"
							:show-text="false"
							height="6rpx"
						></nut-progress>
					</view>
					
					<text class="update-time">最近更新：{{ project.updateTime }}</text>
				</view>
			</view>
		</view>

		<!-- 自定义TabBar -->
		<custom-tab-bar></custom-tab-bar>
	</view>
</template>

<script>
import CustomTabBar from '@/custom-tab-bar/index.vue'
import projectApi from '@/api/projectApi.js'

export default {
	components: {
		CustomTabBar
	},
	data() {
		return {
			projectList: [],
			loading: false,
			refreshing: false
		}
	},
	onLoad() {
		this.loadProjects()
	},
	onShow() {
		// 页面显示时刷新数据
		this.loadProjects()
	},
	onPullDownRefresh() {
		this.refreshProjects()
	},
	methods: {
		async loadProjects() {
			if (this.loading) return
			
			this.loading = true
			try {
				const projects = await projectApi.getProjectList()
				this.projectList = projects || []
			} catch (error) {
				console.error('加载项目列表失败:', error)
				uni.showToast({
					title: '加载失败，请重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		async refreshProjects() {
			this.refreshing = true
			try {
				await this.loadProjects()
				uni.showToast({
					title: '刷新成功',
					icon: 'success'
				})
			} catch (error) {
				uni.showToast({
					title: '刷新失败',
					icon: 'none'
				})
			} finally {
				this.refreshing = false
				uni.stopPullDownRefresh()
			}
		},
		getStatusType(status) {
			const statusMap = {
				progress: 'success',
				warning: 'warning',
				completed: 'default'
			}
			return statusMap[status] || 'default'
		},
		getProgressColor(status) {
			const colorMap = {
				progress: '#165DFF',
				warning: '#FF7D00',
				completed: '#00B42A'
			}
			return colorMap[status] || '#165DFF'
		},
		createProject() {
			uni.navigateTo({
				url: '/pages/project/create'
			})
		},
		goToDetail(project) {
			uni.navigateTo({
				url: `/pages/project/detail?id=${project.id}&title=${project.title}`
			})
		},
		async deleteProject(project, index) {
			try {
				const result = await uni.showModal({
					title: '确认删除',
					content: `确定要删除项目"${project.title}"吗？此操作不可恢复。`,
					confirmText: '删除',
					cancelText: '取消'
				})
				
				if (result.confirm) {
					await projectApi.deleteProject(project.id)
					this.projectList.splice(index, 1)
					uni.showToast({
						title: '删除成功',
						icon: 'success'
					})
				}
			} catch (error) {
				console.error('删除项目失败:', error)
				uni.showToast({
					title: '删除失败，请重试',
					icon: 'none'
				})
			}
		},
		formatUpdateTime(time) {
			if (!time) return ''
			const date = new Date(time)
			const now = new Date()
			const diffMs = now - date
			const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
			
			if (diffDays === 0) {
				return `今天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
			} else if (diffDays === 1) {
				return `昨天 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
			} else if (diffDays < 7) {
				const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
				return `${weekdays[date.getDay()]} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
			} else {
				return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
			}
		}
	}
}
</script>

<style scoped>
.project-list-page {
	min-height: 100vh;
	background-color: #F2F3F5;
	padding-bottom: 120rpx;
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
	padding: calc(var(--status-bar-height) + 120rpx) 32rpx 0;
}

.tip-card {
	background: linear-gradient(135deg, #165DFF10, #165DFF05);
	border: 2rpx solid #165DFF20;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 32rpx;
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
}

.tip-text {
	font-size: 28rpx;
	color: #165DFF;
	line-height: 1.5;
	flex: 1;
}

.project-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.project-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	transition: all 0.3s ease;
}

.project-card:active {
	transform: scale(0.98);
	box-shadow: 0 2rpx 8rpx 0 rgba(0, 0, 0, 0.12);
}

.card-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
}

.project-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	flex: 1;
}

.card-actions {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.delete-icon {
	padding: 8rpx;
	border-radius: 8rpx;
	transition: background-color 0.3s ease;
}

.delete-icon:active {
	background-color: rgba(255, 77, 79, 0.1);
}

.project-desc {
	font-size: 28rpx;
	color: #86909C;
	line-height: 1.5;
	margin-bottom: 24rpx;
	display: block;
}

.progress-section {
	margin-bottom: 16rpx;
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

.update-time {
	font-size: 24rpx;
	color: #C9CDD4;
	display: block;
}
</style>