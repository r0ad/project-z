<template>
	<view class="project-detail-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-content">
				<nut-icon name="left" size="20" color="#86909C" @click="goBack"></nut-icon>
				<text class="navbar-title">{{ projectTitle }}</text>
				<nut-icon name="more-x" size="20" color="#86909C" @click="showMoreActions"></nut-icon>
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
						<view class="log-header">
							<view class="log-time">{{ log.time }}</view>
							<view v-if="log.progressText || log.problemText || log.planText" class="log-actions">
								<nut-button 
									type="primary" 
									size="small" 
									plain
									@click="editLog(log)"
								>
									编辑
								</nut-button>
							</view>
						</view>
						<view class="log-content">
							<!-- 原始内容 -->
							<view v-if="log.content" class="log-entry">
								<text class="log-label content">内容：</text>
								<text class="log-text">{{ log.content }}</text>
							</view>
							<!-- AI分析结果 -->
							<view v-if="log.progressText" class="log-entry">
								<text class="log-label progress">进展：</text>
								<text class="log-text">{{ log.progressText }}</text>
							</view>
							<view v-if="log.problemText" class="log-entry">
								<text class="log-label problem">问题：</text>
								<text class="log-text">{{ log.problemText }}</text>
							</view>
							<view v-if="log.planText" class="log-entry">
								<text class="log-label plan">计划：</text>
								<text class="log-text">{{ log.planText }}</text>
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

			<!-- 编辑日志弹窗 -->
			<nut-popup 
				v-model:visible="showEditModal" 
				position="bottom" 
				:style="{ height: '70%' }"
				round
				closeable
				title="编辑日志分析"
			>
				<view class="edit-modal-content">
					<view class="edit-form">
						<view class="form-item">
							<view class="form-label">进展情况</view>
							<nut-textarea 
								v-model="editForm.progressText"
								placeholder="请输入项目进展情况"
								:rows="3"
								maxlength="500"
								show-word-limit
							/>
						</view>
						<view class="form-item">
							<view class="form-label">遇到问题</view>
							<nut-textarea 
								v-model="editForm.problemText"
								placeholder="请输入遇到的问题"
								:rows="3"
								maxlength="500"
								show-word-limit
							/>
						</view>
						<view class="form-item">
							<view class="form-label">下步计划</view>
							<nut-textarea 
								v-model="editForm.planText"
								placeholder="请输入下一步计划"
								:rows="3"
								maxlength="500"
								show-word-limit
							/>
						</view>
					</view>
					<view class="edit-actions">
						<nut-button 
							type="default" 
							size="large" 
							@click="cancelEdit"
							style="margin-right: 16rpx;"
						>
							取消
						</nut-button>
						<nut-button 
							type="primary" 
							size="large" 
							@click="saveEdit"
							:loading="saving"
						>
							保存
						</nut-button>
					</view>
				</view>
			</nut-popup>
			
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
import projectApi from '@/api/projectApi.js'
import logApi from '@/api/logApi.js'

export default {
	data() {
		return {
			projectId: '',
			projectTitle: 'AI工具开发',
			projectGoal: '30天开发一款支持文本生成的AI小工具，用户留存率≥60%',
			activeTab: 0,
			loading: false,
			refreshing: false,
			tabs: [
				{ name: '目标与节点' },
				{ name: '项目日志' },
				{ name: 'AI分析' },
				{ name: '总结' }
			],
			milestones: [],
			projectLogs: [],
			project: {},
			// 编辑日志相关
			editingLog: null,
			showEditModal: false,
			saving: false,
			editForm: {
				progressText: '',
				problemText: '',
				planText: ''
			}
		}
	},
	onLoad(options) {
		if (options.id) {
			this.projectId = options.id
			this.loadProjectDetail()
		}
		if (options.title) {
			this.projectTitle = decodeURIComponent(options.title)
		}
	},
	onShow() {
		// 页面显示时刷新数据
		if (this.projectId) {
			this.loadProjectDetail()
		}
	},
	onPullDownRefresh() {
		this.refreshData()
	},
	methods: {
		async loadProjectDetail() {
			if (this.loading || !this.projectId) return
			
			this.loading = true
			try {
				// 并行加载项目详情、里程碑和最近日志
				const [projectResult, milestonesResult, logsResult] = await Promise.all([
					projectApi.getProjectDetail(this.projectId),
					projectApi.getProjectMilestones(this.projectId),
					logApi.getRecentLogs(this.projectId, 10)
				])
				
				this.project = projectResult || {}
			this.milestones = milestonesResult || []
			// 处理日志数据，添加格式化时间
			this.projectLogs = (logsResult || []).map(log => ({
				...log,
				time: this.formatDateTime(log.createdAt)
			}))
				
				// 更新项目标题和目标
			if (this.project.title) {
				this.projectTitle = this.project.title
			} else {
				// 如果没有获取到项目标题，设置默认值
				this.projectTitle = '项目详情'
			}
			if (this.project.goal) {
				this.projectGoal = this.project.goal
			} else {
				// 如果没有获取到项目目标，设置默认值
				this.projectGoal = '暂无项目目标'
			}
				
			} catch (error) {
				console.error('加载项目详情失败:', error)
				uni.showToast({
					title: '加载失败，请重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		
		async refreshData() {
			this.refreshing = true
			try {
				await this.loadProjectDetail()
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
		
		// 更新里程碑进度
		async updateMilestoneProgress(milestone, newProgress) {
			try {
				await projectApi.updateMilestone(milestone.id, {
					progress: newProgress
				})
				
				// 更新本地数据
				milestone.progress = newProgress
				
				// 重新计算项目整体进度
				await this.updateProjectProgress()
				
				uni.showToast({
					title: '进度更新成功',
					icon: 'success'
				})
			} catch (error) {
				console.error('更新里程碑进度失败:', error)
				uni.showToast({
					title: '更新失败',
					icon: 'none'
				})
			}
		},
		
		// 更新项目整体进度
		async updateProjectProgress() {
			if (this.milestones.length === 0) return
			
			const totalProgress = this.milestones.reduce((sum, milestone) => {
				return sum + (milestone.progress || 0)
			}, 0)
			
			const avgProgress = Math.round(totalProgress / this.milestones.length)
			
			try {
				await projectApi.updateProjectProgress(this.projectId, avgProgress)
				this.project.progress = avgProgress
			} catch (error) {
				console.error('更新项目进度失败:', error)
			}
		},
		
		// 格式化时间显示
		formatTime(time) {
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
				return `${date.getMonth() + 1}-${date.getDate()}`
			}
		},
		
		addLog() {
			const projectName = this.project.title || this.projectTitle || '未命名项目'
			uni.navigateTo({
				url: `/pages/project/log?projectId=${this.projectId}&projectName=${encodeURIComponent(projectName)}`
			})
		},
		chatProject() {
			const projectName = this.project.title || this.projectTitle || '未命名项目'
			uni.navigateTo({
				url: `/pages/project/chat?projectId=${this.projectId}&projectName=${encodeURIComponent(projectName)}&progress=${this.project.progress || 0}`
			})
		},
		
		// 显示更多操作菜单
		showMoreActions() {
			uni.showActionSheet({
				itemList: ['删除项目'],
				success: (res) => {
					if (res.tapIndex === 0) {
						this.deleteProject()
					}
				}
			})
		},
		
		// 删除项目
		async deleteProject() {
			uni.showModal({
				title: '确认删除',
				content: '删除后无法恢复，确定要删除这个项目吗？',
				success: async (res) => {
					if (res.confirm) {
						try {
							await projectApi.deleteProject(this.projectId)
							uni.showToast({
								title: '删除成功',
								icon: 'success'
							})
							// 返回项目列表页
							setTimeout(() => {
								uni.navigateBack()
							}, 1500)
						} catch (error) {
							console.error('删除项目失败:', error)
							uni.showToast({
								title: '删除失败，请重试',
								icon: 'none'
							})
						}
					}
				}
			})
		},
		
		// 格式化时间显示
		formatDateTime(dateTime) {
			if (!dateTime) return ''
			
			const date = new Date(dateTime)
			const now = new Date()
			const diff = now - date
			
			// 小于1分钟
			if (diff < 60000) {
				return '刚刚'
			}
			
			// 小于1小时
			if (diff < 3600000) {
				return Math.floor(diff / 60000) + '分钟前'
			}
			
			// 小于1天
			if (diff < 86400000) {
				return Math.floor(diff / 3600000) + '小时前'
			}
			
			// 小于7天
			if (diff < 604800000) {
				return Math.floor(diff / 86400000) + '天前'
			}
			
			// 超过7天显示具体日期
			const year = date.getFullYear()
			const month = String(date.getMonth() + 1).padStart(2, '0')
			const day = String(date.getDate()).padStart(2, '0')
			const hour = String(date.getHours()).padStart(2, '0')
			const minute = String(date.getMinutes()).padStart(2, '0')
			
			// 如果是今年，不显示年份
			if (year === now.getFullYear()) {
				return `${month}-${day} ${hour}:${minute}`
			} else {
				return `${year}-${month}-${day} ${hour}:${minute}`
			}
		},
		
		// 编辑日志
		editLog(log) {
			this.editingLog = log
			this.editForm = {
				progressText: log.progressText || '',
				problemText: log.problemText || '',
				planText: log.planText || ''
			}
			this.showEditModal = true
		},
		
		// 取消编辑
		cancelEdit() {
			this.showEditModal = false
			this.editingLog = null
			this.editForm = {
				progressText: '',
				problemText: '',
				planText: ''
			}
		},
		
		// 保存编辑
		async saveEdit() {
			if (!this.editingLog) return
			
			if (this.saving) return
			
			this.saving = true
			
			try {
				const updateData = {
					progressText: this.editForm.progressText.trim(),
					problemText: this.editForm.problemText.trim(),
					planText: this.editForm.planText.trim()
				}
				
				await logApi.updateLog(this.editingLog.id, updateData)
				
				// 更新本地数据
				const logIndex = this.projectLogs.findIndex(log => log.id === this.editingLog.id)
				if (logIndex !== -1) {
					this.projectLogs[logIndex] = {
						...this.projectLogs[logIndex],
						...updateData
					}
				}
				
				uni.showToast({
					title: '保存成功',
					icon: 'success'
				})
				
				this.cancelEdit()
				
			} catch (error) {
				console.error('保存日志编辑失败:', error)
				uni.showToast({
					title: error.message || '保存失败，请重试',
					icon: 'none'
				})
			} finally {
				this.saving = false
			}
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
	padding: calc(var(--status-bar-height) + 120rpx) 32rpx 240rpx;
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
	max-height: 500rpx;
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

.log-label.content {
	color: #1D2129;
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

.log-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.log-actions {
	display: flex;
	align-items: center;
}

.edit-modal-content {
	padding: 32rpx;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.edit-form {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 32rpx;
}

.form-item {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.form-label {
	font-size: 28rpx;
	font-weight: 500;
	color: #1D2129;
}

.edit-actions {
	display: flex;
	justify-content: flex-end;
	padding-top: 32rpx;
	border-top: 2rpx solid #E5E6EB;
	margin-top: 32rpx;
}

.bottom-actions {
	position: fixed;
	bottom: 32rpx;
	left: 32rpx;
	right: 32rpx;
	z-index: 100;
}
</style>