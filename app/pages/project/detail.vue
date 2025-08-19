<template>
	<view class="project-detail-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar 
			:title="projectTitle"
			right-icon="more-x"
			left-icon-color="#86909C"
			right-icon-color="#86909C"
			@left-click="goBack"
			@right-click="showMoreActions"
		/>

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
							<view class="card-header-left">
								<nut-icon name="list" color="#165DFF" size="16"></nut-icon>
								<text class="card-title">关键节点</text>
							</view>
							<view class="card-actions">
								<nut-button 
									type="primary" 
									size="small" 
									plain
									@click="showAddMilestone"
								>
									<nut-icon name="plus" size="12"></nut-icon>
									添加
								</nut-button>
							</view>
						</view>
						
						<view class="milestone-list">
							<view 
								v-for="(milestone, index) in milestones" 
								:key="milestone.id"
								class="milestone-item"
							>
								<view class="milestone-number" :class="getMilestoneClass(milestone.status)">
									{{ index + 1 }}
								</view>
								<view class="milestone-content">
									<view class="milestone-header">
										<text class="milestone-title">{{ milestone.title }}</text>
										<view class="milestone-actions">
											<nut-icon 
												name="edit" 
												size="14" 
												color="#86909C"
												@click="editMilestone(milestone)"
											></nut-icon>
											<nut-icon 
												name="del" 
												size="14" 
												color="#F53F3F"
												@click="deleteMilestone(milestone)"
												style="margin-left: 16rpx;"
											></nut-icon>
										</view>
									</view>
									<text class="milestone-description" v-if="milestone.description">{{ milestone.description }}</text>
									<text class="milestone-deadline" v-if="milestone.deadline">截止：{{ milestone.deadline }}</text>
									<view v-if="milestone.status === 'completed'" class="milestone-status completed">
										已完成
									</view>
									<view v-else-if="milestone.status === 'progress'" class="milestone-progress">
										<view class="progress-header">
											<text class="progress-label">进度</text>
											<text class="progress-value">{{ milestone.progress }}%</text>
											<nut-button 
												type="primary" 
												size="mini" 
												plain
												@click="updateMilestoneStatus(milestone, 'completed')"
												style="margin-left: 16rpx;"
											>
												标记完成
											</nut-button>
										</view>
										<nut-progress 
											:percentage="milestone.progress" 
											color="#165DFF"
											:show-text="false"
											height="6rpx"
										></nut-progress>
									</view>
									<view v-else class="milestone-status pending">
										<text>未开始</text>
										<nut-button 
											type="primary" 
											size="mini" 
											plain
											@click="updateMilestoneStatus(milestone, 'progress')"
											style="margin-left: 16rpx;"
										>
											开始
										</nut-button>
									</view>
								</view>
							</view>
							
							<!-- 空状态 -->
							<view v-if="milestones.length === 0" class="empty-milestone">
								<nut-icon name="list" size="32" color="#C9CDD4"></nut-icon>
								<text class="empty-text">暂无里程碑，点击添加按钮创建第一个里程碑</text>
							</view>
						</view>
					</view>

					<!-- AI提醒 -->
					<view class="warning-card" v-if="project.ai_suggestions">
						<nut-icon name="notice" color="#FF7D00" size="16"></nut-icon>
						<text class="warning-text">{{ project.ai_suggestions }}</text>
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
							<view class="log-actions">
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
							<view class="card-header-left">
								<nut-icon name="chart-pie" color="#165DFF" size="16"></nut-icon>
								<text class="card-title">AI分析</text>
							</view>
							<view class="card-actions">
								<nut-button 
									type="primary" 
									size="small" 
									plain
									@click="generateAIAnalysis"
									:loading="generatingAnalysis"
								>
									<nut-icon name="magic" size="12"></nut-icon>
									AI分析
								</nut-button>
								<nut-button 
									type="default" 
									size="small" 
									plain
									@click="showAddAnalysis"
									style="margin-left: 16rpx;"
								>
									<nut-icon name="plus" size="12"></nut-icon>
									手动添加
								</nut-button>
							</view>
						</view>
						
						<view class="analysis-list">
							<view 
								v-for="(analysis, index) in analysisList" 
								:key="analysis.id"
								class="analysis-item-card"
							>
								<view class="analysis-header">
									<view class="analysis-meta">
										<text class="analysis-time">{{ analysis.formattedTime }}</text>
										<view class="analysis-type" v-if="analysis.analysisType !== 'general'">
											{{ getAnalysisTypeText(analysis.analysisType) }}
										</view>
									</view>
									<view class="analysis-actions">
										<nut-icon 
											name="edit" 
											size="14" 
											color="#86909C"
											@click="editAnalysis(analysis)"
										></nut-icon>
										<nut-icon 
											name="del" 
											size="14" 
											color="#F53F3F"
											@click="deleteAnalysis(analysis)"
											style="margin-left: 16rpx;"
										></nut-icon>
									</view>
								</view>
								<view class="analysis-content">
									<text class="analysis-text">{{ analysis.content }}</text>
									<view v-if="analysis.suggestions" class="analysis-suggestions">
										<text class="suggestions-label">建议：</text>
										<text class="suggestions-text">{{ analysis.suggestions }}</text>
									</view>
								</view>
							</view>
							
							<!-- 空状态 -->
							<view v-if="analysisList.length === 0" class="empty-analysis">
								<nut-icon name="chart-pie" size="32" color="#C9CDD4"></nut-icon>
								<text class="empty-text">暂无分析记录，点击AI分析或手动添加</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 总结 -->
				<view v-if="activeTab === 3" class="tab-panel">
					<view class="card">
						<view class="card-header">
							<view class="card-header-left">
								<nut-icon name="file-text" color="#165DFF" size="16"></nut-icon>
								<text class="card-title">项目总结</text>
							</view>
							<view class="card-actions">
								<nut-button 
									type="primary" 
									size="small" 
									plain
									@click="generateAISummary"
									:loading="generatingSummary"
								>
									<nut-icon name="magic" size="12"></nut-icon>
									AI总结
								</nut-button>
								<nut-button 
									type="default" 
									size="small" 
									plain
									@click="showAddSummary"
									style="margin-left: 16rpx;"
								>
									<nut-icon name="plus" size="12"></nut-icon>
									手动添加
								</nut-button>
							</view>
						</view>
						
						<view class="summary-list">
							<view 
								v-for="(summary, index) in summaryList" 
								:key="summary.id"
								class="summary-item-card"
							>
								<view class="summary-header">
									<view class="summary-meta">
										<text class="summary-time">{{ summary.formattedTime }}</text>
									</view>
									<view class="summary-actions">
										<nut-icon 
											name="edit" 
											size="14" 
											color="#86909C"
											@click="editSummary(summary)"
										></nut-icon>
										<nut-icon 
											name="del" 
											size="14" 
											color="#F53F3F"
											@click="deleteSummary(summary)"
											style="margin-left: 16rpx;"
										></nut-icon>
									</view>
								</view>
								<view class="summary-content">
									<text class="summary-text">{{ summary.content }}</text>
									<view v-if="summary.suggestions" class="summary-suggestions">
										<text class="suggestions-label">建议：</text>
										<text class="suggestions-text">{{ summary.suggestions }}</text>
									</view>
								</view>
							</view>
							
							<!-- 空状态 -->
							<view v-if="summaryList.length === 0" class="empty-summary">
								<nut-icon name="file-text" size="32" color="#C9CDD4"></nut-icon>
								<text class="empty-text">暂无总结记录，点击AI总结或手动添加</text>
							</view>
						</view>
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
			>
				<view class="edit-modal">
					<view class="edit-header">
						<text class="edit-title">编辑日志</text>
					</view>
					<view class="edit-form">
						<view class="form-item">
							<view class="form-label">日志内容</view>
							<nut-textarea 
								v-model="editForm.content"
								placeholder="请输入日志内容"
								:rows="3"
								maxlength="500"
								show-word-limit
							/>
						</view>
						<view class="form-item">
							<view class="form-label">进展情况</view>
							<nut-textarea 
								v-model="editForm.progressText"
								placeholder="请输入进展情况"
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
			
			<!-- AI分析/总结编辑弹窗 -->
			<nut-popup 
				v-model:visible="showAnalysisModal" 
				position="bottom" 
				:style="{ height: '80%' }"
				round
				closeable
			>
				<view class="analysis-modal">
					<view class="modal-header">
						<text class="modal-title">{{ editingAnalysis ? '编辑' : '添加' }}{{ analysisModalType === 'analysis' ? 'AI分析' : '项目总结' }}</text>
					</view>
					<view class="modal-form">
						<view class="form-item">
							<view class="form-label">{{ analysisModalType === 'analysis' ? '分析内容' : '总结内容' }}</view>
							<nut-textarea 
								v-model="analysisForm.content"
								:placeholder="'请输入' + (analysisModalType === 'analysis' ? '分析内容' : '总结内容')"
								:rows="6"
								maxlength="2000"
								show-word-limit
							/>
						</view>
						<view class="form-item">
							<view class="form-label">建议和改进</view>
							<nut-textarea 
								v-model="analysisForm.suggestions"
								placeholder="请输入建议和改进措施（可选）"
								:rows="4"
								maxlength="1000"
								show-word-limit
							/>
						</view>
					</view>
					<view class="modal-actions">
						<nut-button 
							type="default" 
							size="large" 
							@click="cancelAnalysisEdit"
							style="margin-right: 16rpx;"
						>
							取消
						</nut-button>
						<nut-button 
							type="primary" 
							size="large" 
							@click="saveAnalysis"
							:loading="saving"
						>
							保存
						</nut-button>
					</view>
				</view>
			</nut-popup>
			
			<!-- 添加/编辑里程碑弹窗 -->
			<nut-popup 
				v-model:visible="showMilestoneModal" 
				position="bottom" 
				:style="{ height: '70%' }"
				round
				closeable
			>
				<view class="milestone-modal">
					<view class="modal-header">
						<text class="modal-title">{{ editingMilestone ? '编辑里程碑' : '添加里程碑' }}</text>
					</view>
					<scroll-view class="modal-form" scroll-y>
						<view class="form-item">
							<view class="form-label">标题 *</view>
							<nut-input 
								v-model="milestoneForm.title"
								placeholder="请输入里程碑标题"
								maxlength="50"
							/>
						</view>
						<view class="form-item">
							<view class="form-label">描述</view>
							<nut-textarea 
								v-model="milestoneForm.description"
								placeholder="请输入里程碑描述"
								:rows="3"
								maxlength="200"
								show-word-limit
							/>
						</view>
						<view class="form-item">
							<view class="form-label">截止日期</view>
							<nut-cell
								:showIcon="true"
								title="选择截止日期"
								:desc="milestoneForm.deadline || '请选择日期'"
								@click="openDatePicker"
							/>
						</view>
						<view class="form-item" v-if="editingMilestone">
							<view class="form-label">状态</view>
							<nut-radio-group v-model="milestoneForm.status" direction="horizontal">
								<nut-radio label="pending">未开始</nut-radio>
								<nut-radio label="progress">进行中</nut-radio>
								<nut-radio label="completed">已完成</nut-radio>
							</nut-radio-group>
						</view>
						<view class="form-item" v-if="editingMilestone && milestoneForm.status === 'progress'">
							<view class="form-label">进度<text style="margin-left: 16rpx; color: #86909C;">%</text></view>
							<nut-input-number 
								v-model="milestoneForm.progress"
								:min="0"
								:max="100"
								:step="10"
							/>
						</view>
					</scroll-view>
					<view class="modal-actions">
						<nut-button 
							type="default" 
							size="large" 
							@click="cancelMilestone"
							style="margin-right: 16rpx; flex: 1;"
						>
							取消
						</nut-button>
						<nut-button 
							type="primary" 
							size="large" 
							@click="saveMilestone"
							:loading="saving"
							style="flex: 1;"
						>
							保存
						</nut-button>
					</view>
				</view>
			</nut-popup>
			
			<!-- 日期选择器 -->
			<nut-calendar
				v-model:visible="showDatePicker"
				:default-value="selectedDate"
				:start-date="minDate"
				:end-date="maxDate"
				@close="closeDatePicker"
				@choose="onDateConfirm"
			/>
			
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
import aiApi from '@/api/aiApi.js'
import DateUtils from '@/utils/dateUtils.js'
import CustomNavbar from '@/components/CustomNavbar.vue'

export default {
	components: {
		CustomNavbar
	},
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
			// AI分析和总结数据
			analysisList: [],
			summaryList: [],
			// 编辑日志相关
			editingLog: null,
			showEditModal: false,
			saving: false,
			editForm: {
				content: '',
				progressText: '',
				problemText: '',
				planText: ''
			},
			// AI分析/总结编辑相关
			showAnalysisModal: false,
			editingAnalysis: null,
			analysisModalType: 'analysis', // 'analysis' 或 'summary'
			analysisForm: {
				content: '',
				suggestions: ''
			},
			generatingAnalysis: false,
			generatingSummary: false,
			savingAnalysis: false,
			// 里程碑管理相关
			showMilestoneModal: false,
			editingMilestone: null,
			milestoneForm: {
				title: '',
				description: '',
				deadline: '',
				status: 'pending',
				progress: 0
			},
			showDatePicker: false,
			selectedDate: new Date().toISOString().split('T')[0],
			minDate: '2020-01-01',
			maxDate: '2030-12-31'
		}
	},
	onLoad(options) {
		if (options.projectId) {
			this.projectId = options.projectId
			this.loadProjectDetail()
		} else if (options.id) {
			this.projectId = options.id
			this.loadProjectDetail()
		}
		if (options.title) {
			this.projectTitle = decodeURIComponent(options.title)
		}
		// 处理从聊天页面跳转过来的tab参数
		if (options.tab === 'milestones') {
			this.activeTab = 0 // 切换到目标与节点标签页（里程碑管理）
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
				// 并行加载项目详情、里程碑、最近日志、AI分析和总结
				const [projectResult, milestonesResult, logsResult, analysisResult, summaryResult] = await Promise.all([
					projectApi.getProjectDetail(this.projectId),
					projectApi.getProjectMilestones(this.projectId),
					logApi.getRecentLogs(this.projectId, 10),
					aiApi.getAnalysesList(this.projectId, { analysisType: 'general', limit: 10 }),
					aiApi.getSummariesList(this.projectId, { limit: 10 })
				])
				
				this.project = projectResult || {}
				this.milestones = milestonesResult || []
				// 处理日志数据，添加格式化时间
				this.projectLogs = (logsResult || []).map(log => ({
					...log,
					time: DateUtils.formatDateTime(log.createdAt)
				}))
				// 处理AI分析和总结数据
				this.analysisList = analysisResult || []
				this.summaryList = summaryResult || []
				
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
			
			try {
				// 调用API更新项目进度（API内部会根据所有节点进度计算）
				await projectApi.updateProjectProgress(this.projectId)
				
				// 重新加载项目详情以获取最新进度
				const updatedProject = await projectApi.getProjectDetail(this.projectId)
				if (updatedProject) {
					this.project = updatedProject
				}
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
		

		
		// 编辑日志
		editLog(log) {
			this.editingLog = log
			this.editForm = {
				content: log.content || '',
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
				content: '',
				progressText: '',
				problemText: '',
				planText: ''
			}
		},
		
		// 保存编辑
		async saveEdit() {
			if (!this.editingLog) return
			
			if (this.saving) return
			
			this.savingAnalysis = true
			
			try {
				const updateData = {
			content: this.editForm.content.trim(),
			progress_text: this.editForm.progressText.trim(),
			problem_text: this.editForm.problemText.trim(),
			plan_text: this.editForm.planText.trim()
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
				this.savingAnalysis = false
			}
		},
		
		// 里程碑管理方法
		// 显示添加里程碑弹窗
		showAddMilestone() {
			this.editingMilestone = null
			this.milestoneForm = {
				title: '',
				description: '',
				deadline: '',
				status: 'pending',
				progress: 0
			}
			this.showMilestoneModal = true
		},
		
		// 编辑里程碑
		editMilestone(milestone) {
			this.editingMilestone = milestone
			this.milestoneForm = {
				title: milestone.title || '',
				description: milestone.description || '',
				deadline: milestone.deadline || '',
				status: milestone.status || 'pending',
				progress: milestone.progress || 0
			}
			this.showMilestoneModal = true
		},
		
		// 取消里程碑编辑
		cancelMilestone() {
			this.showMilestoneModal = false
			this.editingMilestone = null
			this.milestoneForm = {
				title: '',
				description: '',
				deadline: '',
				status: 'pending',
				progress: 0
			}
		},
		
		// 保存里程碑
		async saveMilestone() {
			if (!this.milestoneForm.title.trim()) {
				uni.showToast({
					title: '请输入里程碑标题',
					icon: 'none'
				})
				return
			}
			
			if (this.saving) return
			
			this.saving = true
			
			try {
				const milestoneData = {
					title: this.milestoneForm.title.trim(),
					description: this.milestoneForm.description.trim(),
					deadline: this.milestoneForm.deadline || null,
					status: this.milestoneForm.status,
					progress: this.milestoneForm.progress
				}
				
				if (this.editingMilestone) {
					// 更新里程碑
					const updatedMilestone = await projectApi.updateMilestone(this.editingMilestone.id, milestoneData)
					
					// 更新本地数据
					const index = this.milestones.findIndex(m => m.id === this.editingMilestone.id)
					if (index !== -1) {
						this.milestones[index] = updatedMilestone
					}
					
					uni.showToast({
						title: '更新成功',
						icon: 'success'
					})
				} else {
					// 创建新里程碑
					const newMilestone = await projectApi.createMilestone(this.projectId, milestoneData)
					
					// 添加到本地数据
					this.milestones.push(newMilestone)
					
					uni.showToast({
						title: '添加成功',
						icon: 'success'
					})
				}
				
				// 重新计算项目进度
				await this.updateProjectProgress()
				
				this.cancelMilestone()
				
			} catch (error) {
				console.error('保存里程碑失败:', error)
				uni.showToast({
					title: error.message || '保存失败，请重试',
					icon: 'none'
				})
			} finally {
				this.saving = false
			}
		},
		
		// 删除里程碑
		async deleteMilestone(milestone) {
			uni.showModal({
				title: '确认删除',
				content: `确定要删除里程碑「${milestone.title}」吗？`,
				success: async (res) => {
					if (res.confirm) {
						try {
							await projectApi.deleteMilestone(milestone.id)
							
							// 从本地数据中移除
							const index = this.milestones.findIndex(m => m.id === milestone.id)
							if (index !== -1) {
								this.milestones.splice(index, 1)
							}
							
							// 重新计算项目进度
							await this.updateProjectProgress()
							
							uni.showToast({
								title: '删除成功',
								icon: 'success'
							})
						} catch (error) {
							console.error('删除里程碑失败:', error)
							uni.showToast({
								title: '删除失败，请重试',
								icon: 'none'
							})
						}
					}
				}
			})
		},
		
		// 更新里程碑状态
		async updateMilestoneStatus(milestone, newStatus) {
			try {
				const updateData = {
					status: newStatus
				}
				
				// 如果标记为完成，设置进度为100%
				if (newStatus === 'completed') {
					updateData.progress = 100
				} else if (newStatus === 'progress' && milestone.progress === 0) {
					// 如果开始进行，设置初始进度为10%
					updateData.progress = 10
				}
				
				const updatedMilestone = await projectApi.updateMilestone(milestone.id, updateData)
				
				// 更新本地数据
				const index = this.milestones.findIndex(m => m.id === milestone.id)
				if (index !== -1) {
					this.milestones[index] = updatedMilestone
				}
				
				// 重新计算项目进度
				await this.updateProjectProgress()
				
				uni.showToast({
					title: '状态更新成功',
					icon: 'success'
				})
			} catch (error) {
				console.error('更新里程碑状态失败:', error)
				uni.showToast({
					title: '更新失败，请重试',
					icon: 'none'
				})
			}
		},
		
		// 打开日期选择器
		openDatePicker() {
			// 如果已有日期，设置为选中状态
			if (this.milestoneForm.deadline) {
				// 确保日期格式正确
				this.selectedDate = this.milestoneForm.deadline
			} else {
				// 设置默认日期为今天
				const today = new Date()
				const year = today.getFullYear()
				const month = String(today.getMonth() + 1).padStart(2, '0')
				const day = String(today.getDate()).padStart(2, '0')
				this.selectedDate = `${year}-${month}-${day}`
			}
			this.showDatePicker = true
		},
		
		// 关闭日期选择器
		closeDatePicker() {
			this.showDatePicker = false
		},
		
		// 日期选择确认
		onDateConfirm(param) {
			// 根据官方文档，param[3]是选中的日期字符串
			this.selectedDate = param[3]
			this.milestoneForm.deadline = param[3]
			this.showDatePicker = false
		},
		
		// 更新项目整体进度（基于里程碑完成情况）
		async updateProjectProgress() {
			if (this.milestones.length === 0) {
				return
			}
			
			try {
				// 调用API更新项目进度
				await projectApi.updateProjectProgress(this.projectId)
				
				// 重新加载项目详情以获取最新进度
				const updatedProject = await projectApi.getProjectDetail(this.projectId)
				if (updatedProject) {
					this.project = updatedProject
				}
			} catch (error) {
				console.error('更新项目进度失败:', error)
			}
		},
		
		// ==================== AI分析相关方法 ====================
		
		// 生成AI分析
		async generateAIAnalysis() {
			if (this.generatingAnalysis) return
			
			this.generatingAnalysis = true
			try {
				const result = await aiApi.generateAIAnalysis(this.projectId, 'general')
				
				// 添加到分析列表
				this.analysisList.unshift({
					id: result.id,
					content: result.content,
					suggestions: result.suggestions,
					analysisType: result.analysisType,
					formattedTime: '刚刚'
				})
				
				uni.showToast({
					title: 'AI分析生成成功',
					icon: 'success'
				})
			} catch (error) {
				console.error('生成AI分析失败:', error)
				uni.showToast({
					title: error.message || '生成失败，请重试',
					icon: 'none'
				})
			} finally {
				this.generatingAnalysis = false
			}
		},
		
		// 显示添加分析弹窗
		showAddAnalysis() {
			this.analysisModalType = 'analysis'
			this.editingAnalysis = null
			this.analysisForm = {
				content: '',
				suggestions: ''
			}
			this.showAnalysisModal = true
		},
		
		// 编辑分析
		editAnalysis(analysis) {
			this.analysisModalType = 'analysis'
			this.editingAnalysis = analysis
			this.analysisForm = {
				content: analysis.content || '',
				suggestions: analysis.suggestions || ''
			}
			this.showAnalysisModal = true
		},
		
		// 删除分析
		async deleteAnalysis(analysis) {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除这条分析记录吗？',
				success: async (res) => {
					if (res.confirm) {
						try {
							await aiApi.deleteAnalysis(analysis.id)
							
							// 从本地数据中移除
							const index = this.analysisList.findIndex(a => a.id === analysis.id)
							if (index !== -1) {
								this.analysisList.splice(index, 1)
							}
							
							uni.showToast({
								title: '删除成功',
								icon: 'success'
							})
						} catch (error) {
							console.error('删除分析失败:', error)
							uni.showToast({
								title: '删除失败，请重试',
								icon: 'none'
							})
						}
					}
				}
			})
		},
		
		// ==================== AI总结相关方法 ====================
		
		// 生成AI总结
		async generateAISummary() {
			if (this.generatingSummary) return
			
			this.generatingSummary = true
			try {
				const result = await aiApi.generateAISummary(this.projectId, 'week')
				
				// 添加到总结列表
				this.summaryList.unshift({
					id: result.id,
					content: result.content,
					suggestions: result.suggestions,
					period: result.period,
					formattedTime: '刚刚'
				})
				
				uni.showToast({
					title: 'AI总结生成成功',
					icon: 'success'
				})
			} catch (error) {
				console.error('生成AI总结失败:', error)
				uni.showToast({
					title: error.message || '生成失败，请重试',
					icon: 'none'
				})
			} finally {
				this.generatingSummary = false
			}
		},
		
		// 显示添加总结弹窗
		showAddSummary() {
			this.analysisModalType = 'summary'
			this.editingAnalysis = null
			this.analysisForm = {
				content: '',
				suggestions: ''
			}
			this.showAnalysisModal = true
		},
		
		// 编辑总结
		editSummary(summary) {
			this.analysisModalType = 'summary'
			this.editingAnalysis = summary
			this.analysisForm = {
				content: summary.content || '',
				suggestions: summary.suggestions || ''
			}
			this.showAnalysisModal = true
		},
		
		// 删除总结
		async deleteSummary(summary) {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除这条总结记录吗？',
				success: async (res) => {
					if (res.confirm) {
						try {
							await aiApi.deleteSummary(summary.id)
							
							// 从本地数据中移除
							const index = this.summaryList.findIndex(s => s.id === summary.id)
							if (index !== -1) {
								this.summaryList.splice(index, 1)
							}
							
							uni.showToast({
								title: '删除成功',
								icon: 'success'
							})
						} catch (error) {
							console.error('删除总结失败:', error)
							uni.showToast({
								title: '删除失败，请重试',
								icon: 'none'
							})
						}
					}
				}
			})
		},
		
		// ==================== 通用编辑方法 ====================
		
		// 保存分析/总结
		async saveAnalysis() {
			if (this.savingAnalysis) return
			
			if (!this.analysisForm.content.trim()) {
				uni.showToast({
					title: '请输入内容',
					icon: 'none'
				})
				return
			}
			
			this.saving = true
			try {
				const data = {
					content: this.analysisForm.content.trim(),
					suggestions: this.analysisForm.suggestions.trim()
				}
				
				if (this.editingAnalysis) {
					// 更新现有记录
					if (this.analysisModalType === 'analysis') {
						await aiApi.updateAnalysis(this.editingAnalysis.id, data)
						
						// 更新本地数据
						const index = this.analysisList.findIndex(a => a.id === this.editingAnalysis.id)
						if (index !== -1) {
							this.analysisList[index] = {
								...this.analysisList[index],
								...data
							}
						}
					} else {
						await aiApi.updateSummary(this.editingAnalysis.id, data)
						
						// 更新本地数据
						const index = this.summaryList.findIndex(s => s.id === this.editingAnalysis.id)
						if (index !== -1) {
							this.summaryList[index] = {
								...this.summaryList[index],
								...data
							}
						}
					}
					
					uni.showToast({
						title: '更新成功',
						icon: 'success'
					})
				} else {
					// 创建新记录
					let newId
					if (this.analysisModalType === 'analysis') {
						newId = await aiApi.createAnalysis(this.projectId, data)
						
						// 添加到本地数据
						this.analysisList.unshift({
							id: newId,
							...data,
							analysisType: 'general',
							formattedTime: '刚刚'
						})
					} else {
						newId = await aiApi.createSummary(this.projectId, data)
						
						// 添加到本地数据
						this.summaryList.unshift({
							id: newId,
							...data,
							formattedTime: '刚刚'
						})
					}
					
					uni.showToast({
						title: '添加成功',
						icon: 'success'
					})
				}
				
				this.cancelAnalysisEdit()
				
			} catch (error) {
				console.error('保存失败:', error)
				uni.showToast({
					title: error.message || '保存失败，请重试',
					icon: 'none'
				})
			} finally {
				this.saving = false
			}
		},
		
		// 取消编辑
		cancelAnalysisEdit() {
			this.showAnalysisModal = false
			this.editingAnalysis = null
			this.analysisForm = {
				content: '',
				suggestions: ''
			}
		},
		
		// 获取分析类型文本
		getAnalysisTypeText(type) {
			const typeMap = {
				general: '综合分析',
				progress: '进度分析',
				risk: '风险分析',
				quality: '质量分析'
			}
			return typeMap[type] || '其他'
		}
	}
}
</script>

<style scoped>
.project-detail-page {
	min-height: 100vh;
	background-color: #F2F3F5;
}

.page-content {
	padding: calc(var(--status-bar-height) + 136rpx) 32rpx 240rpx;
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
	justify-content: space-between;
	margin-bottom: 24rpx;
}

.card-header-left {
	display: flex;
	align-items: center;
	gap: 12rpx;
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
	max-height: calc(100vh - var(--status-bar-height) - 88rpx - 200rpx - 120rpx);
	overflow-y: auto;
	padding-bottom: 120rpx;
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

/* AI分析和总结卡片样式 */
.analysis-list,
.summary-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
	margin-top: 24rpx;
}

.analysis-item-card,
.summary-item-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 24rpx;
	box-shadow: 0 2rpx 12rpx 0 rgba(0, 0, 0, 0.06);
	border: 2rpx solid #F2F3F5;
	transition: all 0.3s ease;
}

.analysis-item-card:hover,
.summary-item-card:hover {
	box-shadow: 0 4rpx 20rpx 0 rgba(0, 0, 0, 0.1);
	border-color: #E5E6EB;
}

.analysis-header,
.summary-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 16rpx;
	padding-bottom: 12rpx;
	border-bottom: 2rpx solid #F7F8FA;
}

.analysis-meta,
.summary-meta {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.analysis-time,
.summary-time {
	font-size: 24rpx;
	color: #86909C;
	font-weight: 500;
}

.analysis-type {
	font-size: 20rpx;
	color: #165DFF;
	background-color: #165DFF10;
	padding: 4rpx 12rpx;
	border-radius: 8rpx;
	display: inline-block;
}

.analysis-actions,
.summary-actions {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.analysis-content,
.summary-content {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.analysis-suggestions,
.summary-suggestions {
	background-color: #F7F8FA;
	border-radius: 12rpx;
	padding: 16rpx;
	margin-top: 12rpx;
	border-left: 4rpx solid #165DFF;
}

.suggestions-label {
	font-size: 24rpx;
	font-weight: 600;
	color: #165DFF;
	margin-bottom: 8rpx;
	display: block;
}

.suggestions-text {
	font-size: 26rpx;
	color: #4E5969;
	line-height: 1.5;
	display: block;
}

.empty-analysis,
.empty-summary {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80rpx 32rpx;
	text-align: center;
	background-color: #FAFBFC;
	border-radius: 16rpx;
	border: 2rpx dashed #E5E6EB;
	margin-top: 24rpx;
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

/* 里程碑管理样式 */
.card-actions {
	display: flex;
	align-items: center;
}

.milestone-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 8rpx;
}

.milestone-actions {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.milestone-description {
	font-size: 24rpx;
	color: #86909C;
	margin-bottom: 8rpx;
	line-height: 1.4;
}

.empty-milestone {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80rpx 32rpx;
	text-align: center;
}

.empty-text {
	font-size: 24rpx;
	color: #86909C;
	margin-top: 16rpx;
	line-height: 1.4;
}

/* 里程碑弹窗样式 */
.milestone-modal {
	padding: 32rpx;
	height: 100%;
	display: flex;
	flex-direction: column;
	background-color: #ffffff;
	overflow: hidden;
}

.modal-header {
	margin-bottom: 32rpx;
}

.modal-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.modal-form {
	padding: 32rpx;
	flex: 1;
	overflow-y: auto;
}

.analysis-modal {
	height: 100%;
	display: flex;
	flex-direction: column;
	padding: 0;
}

.modal-header {
	padding: 32rpx 32rpx 16rpx 32rpx;
	border-bottom: 2rpx solid #E5E6EB;
}

.modal-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.modal-form {
	flex: 1;
	padding: 32rpx;
	overflow-y: auto;
}

.modal-actions {
	display: flex;
	justify-content: space-between;
	padding: 32rpx;
	gap: 16rpx;
	background-color: #ffffff;
	border-top: 2rpx solid #E5E6EB;
	position: sticky;
	bottom: 0;
	z-index: 10;
	margin-top: auto;
}

.modal-actions .nut-button {
	flex: 1;
	max-width: 300rpx;
	min-width: 120rpx;
}

.edit-modal {
	padding: 32rpx;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.edit-header {
	margin-bottom: 32rpx;
}

.edit-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.bottom-actions {
	position: fixed;
	bottom: 32rpx;
	left: 32rpx;
	right: 32rpx;
	z-index: 100;
}
</style>