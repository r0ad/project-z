<template>
	<view class="project-list-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar 
			title="项目列表"
			:show-back="false"
			:right-button="{
				text: '新建项目',
				icon: 'plus',
				type: 'primary',
				size: 'small'
			}"
			@right-button-click="createProject"
		/>

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- AI配置提示卡片 -->
			<view v-if="!isAIConfigured" class="ai-config-tip-card">
				<view class="ai-tip-header">
					<nut-icon name="robot" color="#FF7D00" size="20"></nut-icon>
					<text class="ai-tip-title">AI功能未配置</text>
				</view>
				<text class="ai-tip-desc">项目功能需要AI支持，请选择配置方式以获得完整体验</text>
				<view class="ai-config-buttons">
					<nut-button 
						type="primary" 
						size="small" 
						@click="goToPromoCode"
						class="ai-config-btn promo-btn"
					>
						<nut-icon name="share" size="14"></nut-icon>
						使用分享码
					</nut-button>
					<nut-button 
						type="default" 
						size="small" 
						@click="goToAISettings"
						class="ai-config-btn manual-btn"
					>
						<nut-icon name="setting" size="14"></nut-icon>
						手动配置
					</nut-button>
				</view>
			</view>
			
			<!-- 快捷提示 -->
			<view class="tip-card" v-if="isAIConfigured">
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
					<!-- 卡片头部 -->
					<view class="card-header">
						<view class="header-left">
							<text class="project-title">{{ project.title }}</text>
							<nut-tag 
								:type="getStatusType(project.status)" 
								size="small"
								class="status-tag"
							>
								{{ project.statusText }}
							</nut-tag>
						</view>
						<nut-icon 
							name="del" 
							size="16" 
							color="#FF4D4F"
							class="delete-icon"
							@click.stop="deleteProject(project, index)"
						></nut-icon>
					</view>
					
					<!-- 项目描述 -->
					<text class="project-desc" v-if="project.description">{{ project.description }}</text>
					
					<!-- 数据展示区域 -->
					<view class="data-section">
						<!-- 进度卡片 -->
						<view class="data-card progress-card">
							<view class="data-content">
								<text class="data-label">项目进度</text>
								<text class="data-value">{{ project.progress }}%</text>
							</view>
							<nut-progress 
								:percentage="project.progress" 
								:color="getProgressColor(project.status)"
								:show-text="false"
								height="4rpx"
								class="mini-progress"
							></nut-progress>
						</view>
						
						<!-- 里程碑卡片 -->
						<view class="data-card milestone-card" v-if="project.milestones && project.milestones.length > 0">
							<view class="data-content">
								<text class="data-label">里程碑</text>
								<text class="data-value">{{ project.completedMilestones }}/{{ project.milestoneCount }}</text>
							</view>
							<view class="milestone-latest" v-if="getLatestMilestone(project)">
								<view class="milestone-status-dot" :class="getMilestoneStatusClass(getLatestMilestone(project).status)"></view>
								<text class="milestone-title">{{ getLatestMilestone(project).title }}</text>
							</view>
						</view>
					</view>
					
					<!-- 底部信息 -->
					<view class="card-footer">
						<text class="update-time">{{ project.updateTime }}</text>
						<nut-icon name="right" size="12" color="#C9CDD4"></nut-icon>
					</view>
				</view>
			</view>
		</view>

		<!-- 自定义TabBar -->
		<custom-tab-bar></custom-tab-bar>
	</view>
</template>

<script>
import CustomTabBar from '@/custom-tab-bar/index.vue'
import CustomNavbar from '@/components/CustomNavbar.vue'
import projectApi from '@/api/projectApi.js'
import aiApi from '@/api/aiApi.js'
import DateUtils from '@/utils/dateUtils.js'

export default {
	components: {
		CustomTabBar,
		CustomNavbar
	},
	data() {
		return {
			projectList: [],
			loading: false,
			refreshing: false,
			isAIConfigured: false
		}
	},
	onLoad() {
		this.checkAIConfiguration()
		this.loadProjects()
	},
	onShow() {
		// 页面显示时刷新数据
		this.checkAIConfiguration()
		this.loadProjects()
	},
	onPullDownRefresh() {
		this.refreshProjects()
	},
	methods: {
		// 检查AI配置状态
		async checkAIConfiguration() {
			try {
				const configs = await aiApi.getAIConfigList()
				this.isAIConfigured = configs && configs.length > 0 && configs.some(config => config.is_active)
			} catch (error) {
				console.error('检查AI配置失败:', error)
				this.isAIConfigured = false
			}
		},
		
		// 跳转到AI设置页面
		goToAISettings() {
			uni.navigateTo({
				url: '/pages/profile/ai-settings'
			})
		},
		
		// 跳转到分享码页面
		goToPromoCode() {
			uni.navigateTo({
				url: '/pages/profile/index?tab=promo'
			})
		},
		
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
			// 检查AI配置状态
			if (!this.isAIConfigured) {
				uni.showActionSheet({
					title: '创建项目需要AI支持，请选择配置方式',
					itemList: ['使用分享码', '手动配置AI'],
					success: (res) => {
						if (res.tapIndex === 0) {
							this.goToPromoCode()
						} else if (res.tapIndex === 1) {
							this.goToAISettings()
						}
					}
				})
				return
			}
			
			uni.navigateTo({
				url: '/pages/project/create'
			})
		},
		goToDetail(project) {
			// 检查AI配置状态
			if (!this.isAIConfigured) {
				uni.showActionSheet({
					title: '查看项目详情需要AI支持，请选择配置方式',
					itemList: ['使用分享码', '手动配置AI'],
					success: (res) => {
						if (res.tapIndex === 0) {
							this.goToPromoCode()
						} else if (res.tapIndex === 1) {
							this.goToAISettings()
						}
					}
				})
				return
			}
			
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
			return DateUtils.formatDateTime(time)
		},
		
		// 获取最新的里程碑（优先显示进行中的，其次是待开始的，最后是已完成的）
		getLatestMilestone(project) {
			if (!project.milestones || project.milestones.length === 0) {
				return null
			}
			
			// 优先显示进行中的里程碑
			const inProgress = project.milestones.find(m => m.status === 'progress')
			if (inProgress) return inProgress
			
			// 其次显示待开始的里程碑
			const pending = project.milestones.find(m => m.status === 'pending')
			if (pending) return pending
			
			// 最后显示最近完成的里程碑
			const completed = project.milestones.filter(m => m.status === 'completed')
			if (completed.length > 0) {
				return completed[completed.length - 1] // 返回最后一个完成的
			}
			
			return project.milestones[0] // 兜底返回第一个
		},
		
		// 获取里程碑状态样式类
		getMilestoneStatusClass(status) {
			return {
				'status-completed': status === 'completed',
				'status-progress': status === 'progress',
				'status-pending': status === 'pending'
			}
		},
		
		// 获取里程碑状态文本
		getMilestoneStatusText(status) {
			const statusMap = {
				completed: '已完成',
				progress: '进行中',
				pending: '待开始'
			}
			return statusMap[status] || '未知'
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

.page-content {
	padding: calc(var(--status-bar-height) + 146rpx) 32rpx 0;
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

/* AI配置提示卡片样式 */
.ai-config-tip-card {
	background: linear-gradient(135deg, #FF7D0010, #FF7D0005);
	border: 2rpx solid #FF7D0020;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 32rpx;
	position: relative;
	overflow: hidden;
}

.ai-config-tip-card::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4rpx;
	background: linear-gradient(90deg, #FF7D00, #FFB800);
	opacity: 0.8;
}

.ai-tip-header {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 16rpx;
}

.ai-tip-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #FF7D00;
}

.ai-tip-desc {
	font-size: 28rpx;
	color: #86909C;
	line-height: 1.6;
	margin-bottom: 24rpx;
	display: block;
}

.ai-config-buttons {
	display: flex;
	gap: 24rpx;
	margin-top: 24rpx;
	align-items: center;
}

.ai-config-btn {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	min-height: 72rpx;
	border-radius: 12rpx;
	padding: 16rpx 32rpx;
	font-size: 28rpx;
	font-weight: 500;
	transition: all 0.3s ease;
}

.promo-btn {
	background: linear-gradient(135deg, #165DFF, #00B42A);
	border: none;
	color: white;
	box-shadow: 0 4rpx 12rpx rgba(22, 93, 255, 0.3);
}

.manual-btn {
	border: 2rpx solid #165DFF;
	color: #165DFF;
	background: rgba(22, 93, 255, 0.05);
}

.ai-config-btn:active {
	transform: translateY(2rpx);
	box-shadow: 0 2rpx 8rpx rgba(255, 125, 0, 0.4);
}

.project-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.project-card {
	background-color: #ffffff;
	border-radius: 20rpx;
	padding: 0;
	box-shadow: 0 8rpx 24rpx 0 rgba(0, 0, 0, 0.06);
	transition: all 0.3s ease;
	overflow: hidden;
	border: 2rpx solid rgba(22, 93, 255, 0.08);
}

.project-card:active {
	transform: translateY(-4rpx);
	box-shadow: 0 12rpx 32rpx 0 rgba(0, 0, 0, 0.12);
	border-color: rgba(22, 93, 255, 0.15);
}

.card-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	padding: 32rpx 32rpx 24rpx;
	background: linear-gradient(135deg, rgba(22, 93, 255, 0.02), rgba(22, 93, 255, 0.01));
	border-bottom: 2rpx solid rgba(22, 93, 255, 0.05);
}

.header-left {
	display: flex;
	flex-direction: column;
	gap: 12rpx;
	flex: 1;
}

.project-title {
	font-size: 34rpx;
	font-weight: 600;
	color: #1D2129;
	line-height: 1.3;
	margin-bottom: 0;
}

.status-tag {
	align-self: flex-start;
}

.delete-icon {
	padding: 12rpx;
	border-radius: 12rpx;
	transition: all 0.3s ease;
	background-color: rgba(255, 77, 79, 0.05);
}

.delete-icon:active {
	background-color: rgba(255, 77, 79, 0.15);
	transform: scale(0.9);
}

.project-desc {
	font-size: 28rpx;
	color: #86909C;
	line-height: 1.6;
	padding: 0 32rpx 24rpx;
	display: block;
}

.data-section {
	display: flex;
	gap: 16rpx;
	padding: 0 32rpx 24rpx;
}

.data-card {
	flex: 1;
	background: linear-gradient(135deg, rgba(22, 93, 255, 0.03), rgba(22, 93, 255, 0.01));
	border: 2rpx solid rgba(22, 93, 255, 0.08);
	border-radius: 16rpx;
	padding: 10rpx;
	position: relative;
	overflow: hidden;
}

.data-card::before {
	content: '';
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	height: 4rpx;
	background: linear-gradient(90deg, #165DFF, #00B42A);
	opacity: 0.6;
}

.data-icon {
	margin-bottom: 12rpx;
}

.data-content {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
	margin-bottom: 12rpx;
}

.data-label {
	font-size: 22rpx;
	color: #86909C;
	font-weight: 400;
}

.data-value {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 600;
}

.mini-progress {
	margin-top: 8rpx;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 20rpx 32rpx;
	background-color: rgba(22, 93, 255, 0.02);
	border-top: 2rpx solid rgba(22, 93, 255, 0.05);
}

.milestone-latest {
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-top: 8rpx;
}

.milestone-status-dot {
	width: 8rpx;
	height: 8rpx;
	border-radius: 50%;
	flex-shrink: 0;
}

.milestone-status-dot.status-completed {
	background-color: #00B42A;
}

.milestone-status-dot.status-progress {
	background-color: #165DFF;
}

.milestone-status-dot.status-pending {
	background-color: #C9CDD4;
}

.milestone-title {
	font-size: 20rpx;
	color: #4E5969;
	flex: 1;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	line-height: 1.2;
}

.update-time {
	font-size: 24rpx;
	color: #C9CDD4;
	display: block;
}
</style>