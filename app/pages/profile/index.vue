<template>
	<view class="profile-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-content">
				<text class="navbar-title">我的</text>
				<view class="navbar-actions">
					<nut-icon name="people" size="20" color="#165DFF" @click="showUserSwitcher"></nut-icon>
				</view>
			</view>
		</view>

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 用户信息卡片 -->
			<view class="user-card" @click="editProfile">
				<view class="user-info">
					<view class="avatar-section">
						<view class="user-avatar">
							<text class="avatar-emoji">{{ userInfo.avatar }}</text>
						</view>
						<view class="vip-badge" v-if="userInfo.isVip">
							<nut-icon name="crown" size="12" color="#FFD700"></nut-icon>
							<text class="vip-text">VIP</text>
						</view>
					</view>
					<view class="user-details">
						<view class="user-name-row">
							<text class="user-name">{{ userInfo.name }}</text>
							<view class="user-actions">
								<!-- <nut-icon name="edit" size="24" color="#165DFF" @click.stop="editProfile"></nut-icon> -->
								<nut-icon name="more-x" size="24" color="#165DFF" @click.stop="showUserSwitcher"></nut-icon>
							</view>
						</view>
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
			<view class="version-info" @click="showVersionDetails">
				<view class="version-content">
					<text class="version-text">版本 v{{ version }}</text>
					<text v-if="hasUpdate" class="update-badge">有更新</text>
				</view>
				<view class="version-actions">
					<text class="check-update-text" @click.stop="checkUpdate">检查更新</text>
					<nut-icon name="right" size="14" color="#C9CDD4"></nut-icon>
				</view>
			</view>
		</view>

		<!-- 用户切换弹窗 -->
		<nut-popup v-model:visible="showUserModal" position="bottom" :style="{ height: '60%' }">
			<view class="user-switcher-modal">
				<view class="modal-header">
					<text class="modal-title">选择用户</text>
					<nut-icon name="close" size="20" color="#86909C" @click="closeUserSwitcher"></nut-icon>
				</view>

				<view class="user-list">
					<view v-for="user in allUsers" :key="user.id" class="user-item"
						:class="{ active: user.id === userInfo.id }" @click="switchToUser(user.id)">
						<view class="user-item-avatar">
							<text class="user-item-emoji">{{ user.avatar }}</text>
						</view>
						<view class="user-item-info">
							<text class="user-item-name">{{ user.username }}</text>
							<text class="user-item-title">{{ user.title }}</text>
							<text class="user-item-stats">{{ user.projectCount }}个项目 · {{ user.knowledgeCount
								}}个知识</text>
						</view>
						<nut-icon v-if="user.id === userInfo.id" name="check" size="16" color="#165DFF"></nut-icon>
					</view>
				</view>

				<view class="modal-actions">
					<nut-button type="primary" size="large" @click="showCreateUserModal" block>
						<nut-icon name="plus" size="16" color="#ffffff"></nut-icon>
						创建新用户
					</nut-button>
				</view>
			</view>
		</nut-popup>

		<!-- 创建用户弹窗 -->
		<nut-popup v-model:visible="showCreateModal" position="center" :style="{ width: '80%' }">
			<view class="create-user-modal">
				<view class="modal-header">
					<text class="modal-title">创建新用户</text>
					<nut-icon name="close" size="20" color="#86909C" @click="closeCreateUserModal"></nut-icon>
				</view>

				<view class="create-form">
					<view class="form-item">
						<text class="form-label">用户名</text>
						<nut-input v-model="newUser.username" placeholder="请输入用户名" />
					</view>

					<view class="form-item">
						<text class="form-label">职位</text>
						<nut-input v-model="newUser.title" placeholder="请输入职位" />
					</view>

					<view class="form-item">
						<text class="form-label">头像</text>
						<view class="avatar-selector">
							<view v-for="avatar in avatarOptions" :key="avatar.value" class="avatar-option"
								:class="{ selected: newUser.avatar === avatar.value }"
								@click="selectAvatar(avatar.value)">
								<text class="avatar-emoji">{{ avatar.value }}</text>
							</view>
						</view>
					</view>
				</view>

				<view class="modal-actions">
					<nut-button @click="closeCreateUserModal" size="large" style="margin-right: 20rpx;">
						取消
					</nut-button>
					<nut-button type="primary" @click="createNewUser" size="large">
						创建
					</nut-button>
				</view>
			</view>
		</nut-popup>

		<!-- GitCode备份配置弹窗 -->
		<nut-popup v-model:visible="showGitCodeModal" position="bottom" :style="{ height: '60%' }">
			<view class="gitcode-modal">
				<view class="modal-header">
					<text class="modal-title">GitCode数据库备份</text>
					<nut-icon name="close" size="20" color="#86909C" @click="closeGitCodeModal"></nut-icon>
				</view>

				<!-- 配置区域 -->
				<view class="gitcode-config-section">
					<view class="section-header" @click="gitCodeConfigCollapsed = !gitCodeConfigCollapsed">
						<text class="section-title">配置信息</text>
						<nut-icon :name="gitCodeConfigCollapsed ? 'arrow-down' : 'arrow-up'" size="16"
							color="#86909C"></nut-icon>
					</view>
					<view v-if="!gitCodeConfigCollapsed" class="section-content">
						<view class="form-item">
							<text class="form-label">仓库URL</text>
							<nut-input v-model="gitCodeConfig.repoUrl" placeholder="请输入GitCode仓库URL" />
						</view>
						<view class="form-item">
							<text class="form-label">访问令牌</text>
							<nut-input v-model="gitCodeConfig.accessToken" placeholder="请输入访问令牌" type="password" />
						</view>
						<view class="form-item">
							<text class="form-label">分支名称</text>
							<nut-input v-model="gitCodeConfig.branchName" placeholder="main" />
						</view>
						<nut-button type="primary" @click="testGitCodeConnection" size="large" block>
							测试连接
						</nut-button>
					</view>
				</view>

				<!-- 操作区域 -->
				<view class="gitcode-operation-section">
					<text class="section-title">备份操作</text>
					<view class="btn-group">
						<nut-button type="success" @click="backupDatabaseToGitCode" size="large"
							style="margin-right: 20rpx;">
							<nut-icon name="top" size="16" color="#ffffff"></nut-icon>
							备份到云端
						</nut-button>
						<nut-button type="info" @click="restoreDatabaseFromGitCode" size="large">
							<nut-icon name="download" size="16" color="#ffffff"></nut-icon>
							从云端恢复
						</nut-button>
					</view>
				</view>

				<!-- 结果显示区域 -->
				<view class="gitcode-result-section">
					<view class="section-header" @click="gitCodeResultCollapsed = !gitCodeResultCollapsed">
						<text class="section-title">操作结果</text>
						<nut-icon :name="gitCodeResultCollapsed ? 'arrow-down' : 'arrow-up'" size="16"
							color="#86909C"></nut-icon>
					</view>
					<view v-if="!gitCodeResultCollapsed" class="section-content">
						<view class="result-box">
							<text class="result-text">{{ gitCodeResultText }}</text>
						</view>
					</view>
				</view>

				<!-- 加载状态 -->
				<view v-if="gitCodeLoading" class="loading-overlay">
					<view class="loading-content">
						<text class="loading-text">{{ gitCodeLoadingText }}</text>
					</view>
				</view>
			</view>
		</nut-popup>

		<!-- 备份文件选择弹窗 -->
		<nut-popup v-model:visible="showBackupFileSelector" position="bottom" :style="{ height: '60%' }">
			<view class="backup-file-selector">
				<view class="modal-header">
					<text class="modal-title">选择备份文件</text>
					<nut-icon name="close" size="20" color="#86909C" @click="showBackupFileSelector = false"></nut-icon>
				</view>

				<view class="backup-file-list">
					<view v-if="backupFileList.length === 0" class="empty-state">
						<text class="empty-text">暂无备份文件</text>
					</view>
					<view v-else>
						<view v-for="(file, index) in backupFileList" :key="index" class="backup-file-item"
							@click="selectBackupFileForRestore(file)">
							<view class="file-info">
								<view class="file-icon">
									<nut-icon name="download" size="20" color="#165DFF"></nut-icon>
								</view>
								<view class="file-details">
									<text class="file-name">{{ file.displayName }}</text>
									<text class="file-date">{{ file.dateStr }}</text>
								</view>
							</view>
							<nut-icon name="right" size="14" color="#C9CDD4"></nut-icon>
						</view>
					</view>
				</view>
			</view>
		</nut-popup>

		<!-- 分享码弹窗 -->
		<nut-popup 
			v-model:visible="showPromoModal" 
			position="center" 
			:style="{width: '90%', minWidth: '500rpx', borderRadius: '20rpx', maxHeight: '80vh'}"
			:closeable="true"
			@close="closePromoModal"
		>
			<view class="promo-modal">
				<view class="promo-header">
					<text class="promo-title">分享码管理</text>
					<view class="close-btn" @click="closePromoModal">
						<nut-icon name="close" size="20" color="#86909C"></nut-icon>
					</view>
				</view>
				<view class="promo-content">
				
				<!-- 当前状态显示 -->
				<view class="promo-status" v-if="promoStatus">
					<view class="status-header">
						<text class="status-title">推广码状态</text>
						<nut-button 
							type="primary" 
							size="small" 
							@click="refreshPromoStatus"
							:loading="promoLoading"
							class="refresh-btn"
						>
							刷新
						</nut-button>
					</view>
					<view class="status-item" v-if="promoStatus.hasPromoCode && !promoStatus.expired">
						<text class="status-label">当前状态:</text>
						<text class="status-value active">已激活</text>
					</view>
					<view class="status-item" v-if="promoStatus.hasPromoCode && promoStatus.expired">
						<text class="status-label">当前状态:</text>
						<text class="status-value expired">已过期</text>
					</view>
					<view class="status-item" v-if="!promoStatus.hasPromoCode">
						<text class="status-label">当前状态:</text>
						<text class="status-value inactive">未激活</text>
					</view>
					
					<view class="status-item" v-if="promoStatus.hasPromoCode">
						<text class="status-label">供应商:</text>
						<text class="status-value">{{ promoStatus.provider }}</text>
					</view>
					
					<view class="status-item" v-if="promoStatus.hasPromoCode && !promoStatus.expired">
						<text class="status-label">剩余时间:</text>
						<text class="status-value">{{ promoManager.formatRemainingTime(promoStatus.remainingDays) }}</text>
					</view>
				</view>
				
				<!-- 输入区域 -->
				<view class="promo-input-section">
					<view class="input-label">
						<text>分享码</text>
					</view>
					<nut-textarea  
						:autosize="{ maxHeight: `200rpx`, minHeight: `100rpx` }"
						v-model="promoCode" 
						placeholder="请输入分享码"
						:disabled="promoLoading"
						class="promo-input"
					/>
				</view>
				
				<!-- 有效期选择区域 -->
				<view class="promo-validity-section">
					<view class="input-label">
						<text>分享码有效期</text>
					</view>
					<nut-cell 
						title="有效期选择" 
						:desc="selectedValidityText" 
						@click="showValidityPicker = true"
						class="validity-cell"
					></nut-cell>
					
					<nut-popup 
						v-model:visible="showValidityPicker" 
						position="bottom" 
						safe-area-inset-bottom
					>
						<nut-picker 
							v-model="selectedValidityDays"
							:columns="validityOptions"
							title="选择有效期"
							@confirm="onValidityConfirm"
							@cancel="showValidityPicker = false"
						>
						</nut-picker>
					</nut-popup>
				</view>
				
				<!-- 压缩版选项 -->
				<view class="promo-compress-section" v-if="false">
					<view class="input-label">
						<text>分享码格式</text>
					</view>
					<nut-cell 
						title="使用压缩版" 
						:desc="useCompressed ? '压缩版 (长度更短)' : '标准版 (兼容旧版)'" 
						class="compress-cell"
					>
						<template #link>
							<nut-switch v-model="useCompressed" size="small"></nut-switch>
						</template>
					</nut-cell>
					<view class="compress-tip">
						<text class="tip-text">💡 压缩版分享码长度减少60-80%，更便于复制分享</text>
					</view>
				</view>
				
				<!-- 主要操作按钮 -->
				<view class="promo-main-actions">
					<nut-button 
						type="primary" 
						@click="applyPromoCode"
						:loading="promoLoading"
						:disabled="!promoCode || !promoCode.trim()"
						class="main-action-btn"
					>
						应用分享码
					</nut-button>
					
					<nut-button 
						v-if="promoStatus && promoStatus.hasPromoCode"
						type="danger" 
						@click="removePromoCode"
						:loading="promoLoading"
						class="main-action-btn"
					>
						移除分享码
					</nut-button>
				</view>
				
				<!-- 高级功能区域 -->
				<view class="promo-advanced-section">
					<view class="advanced-header" @click="showAdvancedOptions = !showAdvancedOptions">
						<text class="advanced-title">高级功能</text>
						<nut-icon 
							:name="showAdvancedOptions ? 'arrow-up' : 'arrow-down'" 
							size="16" 
							color="#86909C"
						></nut-icon>
					</view>
					
					<view class="advanced-actions" v-show="showAdvancedOptions">
						<nut-button 
							v-if="promoStatus && promoStatus.hasBackup"
							type="warning" 
							@click="restoreBackupConfig"
							:loading="promoLoading"
							class="advanced-btn"
							size="small"
						>
							恢复备份
						</nut-button>
						
						<nut-button 
							type="success" 
							@click="generatePromoFromCurrentConfig"
							:loading="promoLoading"
							class="advanced-btn"
							size="small"
						>
							<nut-icon name="magic" size="14" color="#ffffff"></nut-icon>
							生成分享码
						</nut-button>
						
						<nut-button 
							type="default" 
							@click="showPromoContactInfo"
							class="advanced-btn"
							size="small"
						>
							获取分享码
						</nut-button>
					</view>
				</view>
				
				<!-- 结果显示 -->
				<view class="promo-result">
					<text class="result-text">{{ promoResultText }}</text>
				</view>
				</view>
			</view>
		</nut-popup>
		
		<!-- 自定义tabbar -->
		<custom-tab-bar current="2"></custom-tab-bar>
	</view>
</template>

<script>
import projectApi from '@/api/projectApi.js'
import knowledgeApi from '@/api/knowledgeApi.js'
import chatApi from '@/api/chatApi.js'
import favoriteApi from '@/api/favoriteApi.js'
import userApi from '@/api/userApi.js'
import promoApi from '@/api/promoApi.js'
import aiApi from '@/api/aiApi.js'
import userStore from '@/utils/userStore.js'
import promoManager from '@/utils/promoManager.js'
import CustomNavbar from '@/components/CustomNavbar.vue'
import CustomTabBar from '@/custom-tab-bar/index.vue'
import dbService from '@/utils/dbService.js'
import { GitCodeSync } from '@/uni_modules/gitcode-sync/js_sdk/index.js'
import { version } from 'vue'
import UpdateApp from '@/utils/updateApp.js'

export default {
	components: {
		CustomTabBar
	},
	data() {
		return {
			userInfo: {
				id: 1,
				avatar: '👤',
				name: '用户',
				title: '产品经理',
				isVip: false,
				projectCount: 0,
				knowledgeCount: 0,
				days: 0
			},
			// 用户切换相关
			allUsers: [],
			showUserModal: false,
			showCreateModal: false,
			newUser: {
				username: '',
				title: '产品经理',
				avatar: '👤'
			},
			avatarOptions: [],
			// GitCode备份相关
			showGitCodeModal: false,
			gitCodeConfig: {
				repoUrl: '',
				accessToken: '',
				branchName: 'main'
			},
			gitCodeLoading: false,
			gitCodeLoadingText: '',
			gitCodeResultText: '等待操作...',
			// 折叠状态
			gitCodeConfigCollapsed: false,
			gitCodeResultCollapsed: false,
			// 备份文件列表相关
			backupFileList: [],
			selectedBackupFile: null,
			showBackupFileSelector: false,
			// 分享码相关
			showPromoModal: false,
			promoCode: '',
			useCompressed: true, // 默认使用压缩版
			showAdvancedOptions: false, // 控制高级功能展开/折叠
			promoStatus: {
				hasPromoCode: false,
				expired: false,
				remainingDays: 0,
				provider: '',
				modelName: '',
				hasBackup: false
			},
			promoLoading: false,
			promoResultText: '等待操作...',
			promoConfigCollapsed: false,
			promoResultCollapsed: false,
			// 有效期选择相关
			showValidityPicker: false,
			selectedValidityDays: ['7'], // 默认7天
			selectedValidityText: '7天',
			validityOptions: [
				[
					{ text: '1天', value: '1' },
					{ text: '3天', value: '3' },
					{ text: '5天', value: '5' },
					{ text: '7天', value: '7' },
					{ text: '10天', value: '10' },
					{ text: '15天', value: '15' },
					{ text: '20天', value: '20' },
					{ text: '30天', value: '30' }
				]
			],
			hasUpdate: false,
			updateInfo: null,
			updateApp: null,
			aiStats: {
				todayChats: 0,
				totalAnalysis: 0
			},
			statsData: [
				{ label: '项目数', value: 0 },
				{ label: '知识数', value: 0 },
				{ label: '完成率', value: '0%' }
			],
			menuItems: [
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
						icon: 'JIMI40',
						iconColor: '#165DFF',
						iconBg: '#165DFF20',
						title: 'AI设置',
						subtitle: '支持DeepSeek、Kimi、ChatGPT等模型',
						type: 'navigate',
						path: '/pages/profile/ai-settings'
					},
					{
						icon: 'scan',
						iconColor: '#FF7D00',
						iconBg: '#FF7D0020',
						title: '分享码',
						subtitle: '一键配置AI模型',
						type: 'action',
						handler: 'showPromoCodeModal'
					},
				{
					icon: 'refresh2',
					iconColor: '#FF7D00',
					iconBg: '#FF7D0020',
					title: '云备份',
					subtitle: '华为GitCode云端同步',
					type: 'action',
					handler: 'showGitCodeBackup'
				},

				{
					icon: 'refresh',
					iconColor: '#00B42A',
					iconBg: '#00B42A20',
					title: '修复应用',
					type: 'action',
					handler: 'retryDatabaseUpgrade'
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
					subtitle: '待开发',
					type: 'disabled',
					disabled: true,
					path: '/pages/profile/stats'
				},

				{
					icon: 'service',
					iconColor: '#F53F3F',
					iconBg: '#F53F3F20',
					title: '意见反馈',
					subtitle: '待开发',
					type: 'disabled',
					disabled: true,
					path: '/pages/profile/feedback'
				}
			],
			version: '1.0.1',
			// 工具类引用
			promoManager: promoManager
		}
	},
	onLoad(options) {
		// 处理页面参数
		if (options.tab === 'promo') {
			// 延迟显示分享码弹窗，确保页面加载完成
			this.$nextTick(() => {
				setTimeout(() => {
					this.showPromoCodeModal()
				}, 300)
			})
		}
	},

	async mounted() {
			// 添加用户状态变化监听器
			userStore.addListener(this.handleUserStateChange)

			await this.loadUserInfo()
			await this.loadUserData()
			// await this.loadStatsData()
			// await this.loadAIStats()
			await this.loadFavoriteCount()
			await this.loadAllUsers()
			this.loadAvatarOptions()
			this.loadGitCodeConfig()
			await this.loadPromoStatus()
			this.version = this.getCurrentVersion()
			this.checkGlobalUpdateInfo()
		},

	beforeDestroy() {
			// 移除用户状态变化监听器
			userStore.removeListener(this.handleUserStateChange)
			// 销毁分享码管理器
			promoManager.destroy()
		},
	methods: {
		// 获取当前应用版本
		getCurrentVersion() {
			// #ifdef APP-PLUS
			return plus.runtime.version
			// #endif
			// #ifndef APP-PLUS
			return '1.0.1'
			// #endif
		},

		checkGlobalUpdateInfo() {
			const app = getApp()
			if (app.globalData && app.globalData.updateInfo) {
				this.updateInfo = app.globalData.updateInfo
				this.updateApp = app.globalData.updateApp
				this.hasUpdate = true
			} else {
				this.hasUpdate = false
			}
		},

		// 显示版本详情
		showVersionDetails() {
			let content = `当前版本：${this.version}\n`

			if (this.hasUpdate && this.updateInfo) {
				content += `最新版本：${this.updateInfo.latestVersion}\n`
				content += `更新内容：${this.updateInfo.versionHistory || '暂无描述'}\n`
				content += `\n是否立即更新？`

				uni.showModal({
					title: '版本信息',
					content: content,
					confirmText: '立即更新',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							this.performUpdate()
						}
					}
				})
			} else {
				content += '当前已是最新版本'

				uni.showModal({
					title: '版本信息',
					content: content,
					showCancel: false,
					confirmText: '确定'
				})
			}
		},

		// 检查更新
		async checkUpdate() {
			uni.showLoading({ title: '检查更新中...' })

			try {
				const updateApp = new UpdateApp()
				// 手动检查更新，传入showTip=true，会自动显示结果弹窗
				const updateInfo = await updateApp.checkUpdate(true)

				uni.hideLoading()

				if (updateInfo.hasUpdate) {
					this.updateInfo = updateInfo
					this.updateApp = updateApp
					this.hasUpdate = true

					// 更新全局数据
					const app = getApp()
					app.globalData = app.globalData || {}
					app.globalData.updateInfo = updateInfo
					app.globalData.updateApp = updateApp
				} else {
					this.hasUpdate = false
				}
			} catch (error) {
				uni.hideLoading()
				uni.showToast({
					title: '检查更新失败',
					icon: 'none'
				})
				console.error('检查更新失败:', error)
			}
		},

		// 执行更新
		async performUpdate() {
			if (!this.updateApp || !this.updateInfo) {
				uni.showToast({ title: '更新信息异常', icon: 'none' })
				return
			}

			try {
				// 显示下载进度
				uni.showLoading({ title: '正在下载更新... 0%' })

				// 执行更新，包含进度回调
				const result = await this.updateApp.downloadAndInstall(
					'https://project.r0ad.host/project.apk',
					(progress, downloaded, total) => {
						uni.showLoading({
							title: `正在下载更新... ${Math.round(progress)}%`
						})
					}
				)

				uni.hideLoading()

				if (result.success) {
					if (result.installed) {
						uni.showModal({
							title: '更新完成',
							content: '应用已更新完成，请重启应用以使用新版本。',
							showCancel: false,
							confirmText: '确定'
						})
						this.hasUpdate = false
					} else if (result.downloaded) {
						uni.showModal({
							title: '下载完成',
							content: '安装包已下载完成，请手动安装。',
							showCancel: false,
							confirmText: '确定'
						})
						this.hasUpdate = false
					} else {
						uni.showToast({ title: '更新失败: ' + result.message, icon: 'none' })
					}
				} else {
					uni.showToast({ title: '更新失败: ' + result.message, icon: 'none' })
				}
			} catch (error) {
				uni.hideLoading()
				uni.showToast({ title: '更新异常: ' + error.message, icon: 'none' })
			}
		},
		openSettings() {
			uni.showToast({
				title: '设置',
				icon: 'none'
			})
		},
		editProfile(event) {
			uni.navigateTo({
				url: '/pages/profile/edit'
			})
		},
		handleMenuClick(item, event) {
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

		// ==================== 分享码相关方法 ====================
		
		/**
		 * 显示分享码弹窗
		 */
		async showPromoCodeModal() {
			this.showPromoModal = true
			this.promoResultText = '等待操作...'
			// 刷新推广码状态
			await this.loadPromoStatus()
		},

		/**
		 * 关闭分享码弹窗
		 */
		closePromoModal() {
			this.showPromoModal = false
			this.promoCode = ''
			this.promoResultText = '等待操作...'
		},

		/**
		 * 加载分享码状态
		 */
		async loadPromoStatus() {
			try {
				const status = await promoManager.getStatus()
				this.promoStatus = status
				
				// 更新菜单项的副标题
				const promoMenuItem = this.menuItems.find(item => item.handler === 'showPromoCodeModal')
				if (promoMenuItem) {
					if (status.hasPromoCode && !status.expired) {
						promoMenuItem.subtitle = `${status.provider} - ${promoManager.formatRemainingTime(status.remainingDays)}`
					} else if (status.expired) {
						promoMenuItem.subtitle = '分享码已过期'
					} else {
						promoMenuItem.subtitle = '一键配置AI模型'
					}
				}
			} catch (error) {
				console.error('加载分享码状态失败:', error)
			}
		},

		/**
		 * 刷新推广码状态
		 */
		async refreshPromoStatus() {
			this.promoLoading = true
			try {
				await this.loadPromoStatus()
				uni.showToast({
					title: '状态已刷新',
					icon: 'success'
				})
			} catch (error) {
				console.error('刷新推广码状态失败:', error)
				uni.showToast({
					title: '刷新失败',
					icon: 'error'
				})
			} finally {
				this.promoLoading = false
			}
		},

		/**
		 * 应用分享码
		 */
		async applyPromoCode(event) {
			if (!this.promoCode.trim()) {
				uni.showToast({
					title: '请输入分享码',
					icon: 'none'
				})
				return
			}

			this.promoLoading = true
			this.promoResultText = '正在验证分享码...'

			try {
				const result = await promoManager.applyPromoCode(this.promoCode)
				console.log('应用分享码结果:', result)
				
				if (result.success) {
					this.promoResultText = `分享码应用成功！\n供应商: ${result.config.provider}\n模型: ${result.config.model}\n剩余天数: ${result.remainingDays}天`
					
					// 重新加载状态
					await this.loadPromoStatus()
					
					// 清空输入框
					this.promoCode = ''
				} else {
					this.promoResultText = `应用失败: ${result.error}`
					
					if (result.expired) {
						this.promoResultText += '\n\n分享码已过期，请联系微信号 codetrend 重新申请。'
					}
				}
			} catch (error) {
				console.error('应用分享码失败:', error)
				this.promoResultText = `应用失败: ${error.message}`
			} finally {
				this.promoLoading = false
			}
		},

		/**
		 * 移除分享码
		 */
		async removePromoCode(event) {
			uni.showModal({
				title: '移除分享码',
				content: '确定要移除当前分享码吗？这将恢复您之前的AI配置。',
				success: async (res) => {
					if (res.confirm) {
						this.promoLoading = true
						this.promoResultText = '正在移除分享码...'

						try {
							const result = await promoManager.removePromoCode()
							
							if (result.success) {
								this.promoResultText = '分享码已移除，配置已恢复'
								
								// 重新加载状态
								await this.loadPromoStatus()
							} else {
								this.promoResultText = `移除失败: ${result.error}`
							}
						} catch (error) {
							console.error('移除分享码失败:', error)
							this.promoResultText = `移除失败: ${error.message}`
						} finally {
							this.promoLoading = false
						}
					}
				}
			})
		},

		/**
		 * 恢复备份配置
		 */
		async restoreBackupConfig(event) {
			uni.showModal({
				title: '恢复备份',
				content: '确定要恢复备份的AI配置吗？',
				success: async (res) => {
					if (res.confirm) {
						this.promoLoading = true
						this.promoResultText = '正在恢复备份配置...'

						try {
							const result = await promoManager.restoreBackup()
							
							if (result.success) {
								this.promoResultText = '备份配置恢复成功'
								
								// 重新加载状态
								await this.loadPromoStatus()
							} else {
								this.promoResultText = `恢复失败: ${result.error}`
							}
						} catch (error) {
							console.error('恢复备份配置失败:', error)
							this.promoResultText = `恢复失败: ${error.message}`
						} finally {
							this.promoLoading = false
						}
					}
				}
			})
		},

		/**
		 * 获取分享码联系信息
		 */
		showPromoContactInfo(event) {
			const contactInfo = promoManager.getContactInfo()
			
			uni.showModal({
				title: '获取分享码',
				content: `${contactInfo.description}\n\n${contactInfo.instructions.join('\n')}`,
				confirmText: '复制微信号',
				cancelText: '知道了',
				success: (res) => {
					if (res.confirm) {
						// 复制微信号到剪贴板
						uni.setClipboardData({
							data: contactInfo.wechat,
							success: () => {
								uni.showToast({
									title: '微信号已复制',
									icon: 'success'
								})
							}
						})
					}
				}
			})
		},

		/**
		 * 有效期选择确认
		 */
		onValidityConfirm({ selectedValue, selectedOptions }) {
			this.selectedValidityDays = selectedValue
			this.selectedValidityText = selectedOptions.map(item => item.text).join(',')
			this.showValidityPicker = false
		},

		/**
		 * 根据当前AI配置生成分享码
		 */
		async generatePromoFromCurrentConfig(event) {
			try {
				this.promoLoading = true
				this.promoResultText = '正在获取当前AI配置...'

				// 获取当前激活的AI配置
				const activeConfig = await aiApi.getActiveAIConfig()
				
				if (!activeConfig || !activeConfig.provider || !activeConfig.model) {
					this.promoResultText = '未找到有效的AI配置，请先在AI设置中配置并激活一个AI模型'
					return
				}

				this.promoResultText = `正在为 ${activeConfig.provider} - ${activeConfig.model} 生成分享码...`

				// 调用Node.js分享码生成工具
				const result = await this.callPromoGenerator(activeConfig)
				
				if (result.success) {
					this.promoCode = result.promoCode
					
					// 自动复制到剪贴板
					try {
						uni.setClipboardData({
							data: result.promoCode,
							success: () => {
								uni.showToast({
									title: '分享码已复制到剪贴板',
									icon: 'success'
								})
							}
						})
					} catch (copyError) {
						console.error('复制到剪贴板失败:', copyError)
					}
					
					this.promoResultText = `分享码生成成功！\n供应商: ${activeConfig.provider}\n模型: ${activeConfig.model}\n有效期: ${this.selectedValidityText}\n格式: ${result.format || '标准版'}\n长度: ${result.promoCode.length} 字符\n\n分享码已自动填入上方输入框并复制到剪贴板，点击"应用分享码"即可使用。`
				} else {
					this.promoResultText = `生成失败: ${result.error || '未知错误'}`
				}
			} catch (error) {
				console.error('生成分享码失败:', error)
				this.promoResultText = `生成失败: ${error.message || '网络错误，请检查Node.js分享码生成工具是否正常运行'}`
			} finally {
				this.promoLoading = false
			}
		},

		/**
		 * 调用Node.js分享码生成工具
		 */
		async callPromoGenerator(config) {
			try {
				// 获取选择的有效期
				const validDays = parseInt(this.selectedValidityDays[0]) || 7
				
				// 构建命令参数
				const args = [
					'generate',
					'--provider', config.provider,
					'--model', config.model,
					'--days', validDays.toString()
				]

				// 使用uni.request调用本地Node.js服务（如果有的话）
				// 或者直接生成分享码（简化版本）
				return await this.generatePromoCodeLocally(config)
			} catch (error) {
				console.error('调用分享码生成工具失败:', error)
				throw error
			}
		},

		/**
		 * 本地生成分享码（简化版本）
		 */
		async generatePromoCodeLocally(config) {
			try {
				// 导入分享码生成相关工具
				const cryptoUtils = (await import('@/utils/cryptoUtils.js')).default
				
				// 获取选择的有效期
				const validDays = parseInt(this.selectedValidityDays[0]) || 7
				
				let promoCode
				
				if (this.useCompressed) {
					// 生成压缩版分享码
					promoCode = cryptoUtils.generateCompressedPromoCode(
						config.provider,
						config.api_key,
						config.model,
						validDays
					)
				} else {
					// 生成标准版分享码（兼容旧版）
					const promoData = {
						provider: config.provider,
						model: config.model,
						baseUrl: config.base_url,
						apiKey: config.api_key,
						expiresAt: Date.now() + (validDays * 24 * 60 * 60 * 1000),
						createdAt: Date.now(),
						validDays: validDays
					}
					promoCode = cryptoUtils.encrypt(JSON.stringify(promoData))
				}
				
				return {
					success: true,
					promoCode: promoCode,
					validDays: validDays,
					format: this.useCompressed ? '压缩版' : '标准版'
				}
			} catch (error) {
				console.error('本地生成分享码失败:', error)
				return {
					success: false,
					error: error.message
				}
			}
		},

		/**
		 * 加载用户信息
		 */
		async loadUserInfo() {
			try {
				const currentUserId = userStore.getCurrentUserId()
				const userData = await userApi.getCurrentUser(currentUserId)

				this.userInfo = {
					id: userData.id,
					name: userData.username,
					title: userData.title,
					avatar: userData.avatar,
					isVip: userData.isVip,
					projectCount: 0, // 将在loadUserData中更新
					knowledgeCount: 0, // 将在loadUserData中更新
					days: userApi.calculateUsageDays(userData.created_at)
				}

				// 更新全局状态
				userStore.setCurrentUser(this.userInfo)
			} catch (error) {
				console.error('加载用户信息失败:', error)
			}
		},

		async loadUserData() {
			try {
				const currentUserId = userStore.getCurrentUserId()
				// 获取用户项目和知识统计
				const projects = await projectApi.getAllProjects(currentUserId)
				const knowledge = await knowledgeApi.getKnowledgeStats(currentUserId)

				this.userInfo.projectCount = projects.length
				this.userInfo.knowledgeCount = knowledge.publishedCount ? knowledge.publishedCount : 0
			} catch (error) {
				console.error('加载用户数据失败:', error)
			}
		},
		async loadStatsData() {
			try {
				// 获取项目统计
				const projects = await projectApi.getAllProjects(1)
				this.statsData[0].value = projects.length

				// 获取知识统计
				const knowledge = await knowledgeApi.getKnowledgeStats({ page: 1, pageSize: 1000 })
				this.statsData[1].value = knowledge.publishedCount ? knowledge.publishedCount : 0

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
		},

		/**
		 * 加载所有用户
		 */
		async loadAllUsers() {
			try {
				this.allUsers = await userApi.getAllUsers()
			} catch (error) {
				console.error('加载用户列表失败:', error)
			}
		},

		/**
		 * 加载头像选项
		 */
		loadAvatarOptions() {
			this.avatarOptions = userApi.getAvatarOptions().slice(0, 12) // 只显示前12个
		},

		/**
		 * 显示用户切换器
		 */
		showUserSwitcher(event) {
			this.showUserModal = true
		},

		/**
		 * 关闭用户切换器
		 */
		closeUserSwitcher() {
			this.showUserModal = false
		},

		/**
		 * 切换到指定用户
		 */
		async switchToUser(userId) {
			if (userId === this.userInfo.id) {
				this.closeUserSwitcher()
				return
			}

			try {
				uni.showLoading({ title: '切换中...' })

				// 切换用户
				await userApi.switchUser(userId)

				// 重新加载用户信息和数据
				await this.loadUserInfo()
				await this.loadUserData()
				await this.loadFavoriteCount()

				uni.hideLoading()
				this.closeUserSwitcher()

				uni.showToast({
					title: '切换成功',
					icon: 'success'
				})
			} catch (error) {
				console.error('切换用户失败:', error)
				uni.hideLoading()
				uni.showToast({
					title: '切换失败',
					icon: 'error'
				})
			}
		},

		/**
		 * 显示创建用户弹窗
		 */
		showCreateUserModal() {
			this.showUserModal = false
			this.showCreateModal = true
			// 重置表单
			this.newUser = {
				username: '',
				title: '产品经理',
				avatar: '👤'
			}
		},

		/**
		 * 关闭创建用户弹窗
		 */
		closeCreateUserModal() {
			this.showCreateModal = false
		},

		/**
		 * 选择头像
		 */
		selectAvatar(avatar) {
			this.newUser.avatar = avatar
		},

		/**
		 * 创建新用户
		 */
		async createNewUser() {
			if (!this.newUser.username.trim()) {
				uni.showToast({
					title: '请输入用户名',
					icon: 'none'
				})
				return
			}

			try {
				uni.showLoading({ title: '创建中...' })

				// 创建用户
				const newUser = await userApi.createUser(this.newUser)

				// 重新加载用户列表
				await this.loadAllUsers()

				// 切换到新用户
				await this.switchToUser(newUser.id)

				uni.hideLoading()
				this.closeCreateUserModal()

				uni.showToast({
					title: '创建成功',
					icon: 'success'
				})
			} catch (error) {
				console.error('创建用户失败:', error)
				uni.hideLoading()
				uni.showToast({
					title: '创建失败',
					icon: 'error'
				})
			}
		},

		/**
		 * GitCode备份相关方法
		 */
		// 显示GitCode备份弹窗
		showGitCodeBackup() {
			this.showGitCodeModal = true
		},

		// 关闭GitCode备份弹窗
		closeGitCodeModal() {
			this.showGitCodeModal = false
		},

		// 加载GitCode配置
		loadGitCodeConfig() {
			try {
				const savedConfig = uni.getStorageSync('gitcode_backup_config')
				if (savedConfig) {
					this.gitCodeConfig = { ...this.gitCodeConfig, ...savedConfig }
					// 如果配置已存在，默认折叠配置区域
					if (savedConfig.repoUrl && savedConfig.accessToken) {
						this.gitCodeConfigCollapsed = true
					}
				}
			} catch (error) {
				console.log('加载GitCode配置失败:', error)
			}
		},

		// 保存GitCode配置
		saveGitCodeConfig() {
			try {
				uni.setStorageSync('gitcode_backup_config', this.gitCodeConfig)
			} catch (error) {
				console.log('保存GitCode配置失败:', error)
			}
		},

		// 创建GitCodeSync实例
		createGitCodeSync() {
			if (!this.gitCodeConfig.repoUrl || !this.gitCodeConfig.accessToken) {
				uni.showToast({ title: '请先配置仓库URL和访问令牌', icon: 'none' })
				return null
			}

			const syncConfig = {
				repoUrl: this.gitCodeConfig.repoUrl,
				accessToken: this.gitCodeConfig.accessToken,
				branch: this.gitCodeConfig.branchName || 'main'
			}

			try {
				return new GitCodeSync(syncConfig)
			} catch (error) {
				console.error('创建GitCodeSync失败:', error)
				uni.showToast({ title: '配置错误: ' + error.message, icon: 'none' })
				return null
			}
		},

		// 测试GitCode连接
		async testGitCodeConnection() {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return

			this.gitCodeLoading = true
			this.gitCodeLoadingText = '测试连接中...'

			try {
				const result = await gitCodeSync.testConnection()
				if (result.success) {
					this.gitCodeResultText = '连接成功！\n' + JSON.stringify(result, null, 2)
					this.saveGitCodeConfig()
					uni.showToast({ title: '连接成功', icon: 'success' })
				} else {
					this.gitCodeResultText = '连接失败：' + result.message
					uni.showToast({ title: '连接失败', icon: 'none' })
				}
			} catch (error) {
				this.gitCodeResultText = '连接异常：' + error.message
				uni.showToast({ title: '连接异常', icon: 'none' })
			} finally {
				this.gitCodeLoading = false
			}
		},

		// 获取备份文件列表
		async getBackupFileList() {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return

			try {
				// 获取仓库中的所有文件
				const fileList = await gitCodeSync.listFiles()

				if (Array.isArray(fileList)) {
					// 过滤出备份文件（以database_backup_开头的json文件）
					this.backupFileList = fileList
						.filter(fileName => fileName.startsWith('database_backup_') && fileName.endsWith('.json'))
						.map(fileName => {
							// 从文件名提取日期
							const dateStr = fileName.replace('database_backup_', '').replace('.json', '')
							return {
								fileName: fileName,
								dateStr: dateStr,
								// 格式化显示名称
								displayName: `备份文件 - ${dateStr}`
							}
						})
						.sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr)) // 按日期倒序排列

					console.log('获取到备份文件列表:', this.backupFileList)
				} else {
					this.backupFileList = []
					uni.showToast({ title: '获取备份文件列表失败', icon: 'none' })
				}
			} catch (error) {
				console.error('获取备份文件列表失败:', error)
				this.backupFileList = []
				uni.showToast({ title: `获取备份文件列表异常: ${error.message}`, icon: 'none' })
			}
		},

		// 备份数据库到GitCode
		async backupDatabaseToGitCode() {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return

			this.gitCodeLoading = true
			this.gitCodeLoadingText = '备份数据库中...'

			try {
				// 导出数据库数据
				const dbData = await dbService.exportAllData()
				const backupData = {
					timestamp: new Date().toISOString(),
					version: '1.0.0',
					data: dbData
				}

				const fileName = `database_backup_${new Date().toISOString().split('T')[0]}.json`
				const result = await gitCodeSync.uploadData(
					JSON.stringify(backupData, null, 2),
					fileName,
					`数据库备份 - ${new Date().toLocaleString()}`
				)

				if (result.success) {
					this.gitCodeResultText = '备份成功！\n' + JSON.stringify(result, null, 2)
					uni.showToast({ title: '备份成功', icon: 'success' })
				} else {
					this.gitCodeResultText = '备份失败：' + result.message
					uni.showToast({ title: '备份失败', icon: 'none' })
				}
			} catch (error) {
				this.gitCodeResultText = '备份异常：' + error.message
				uni.showToast({ title: '备份异常', icon: 'none' })
			} finally {
				this.gitCodeLoading = false
			}
		},

		// 从GitCode恢复数据库
		async restoreDatabaseFromGitCode() {
			// 先获取备份文件列表
			uni.showLoading({ title: '获取备份文件列表...' })
			await this.getBackupFileList()
			uni.hideLoading()

			if (this.backupFileList.length === 0) {
				uni.showModal({
					title: '提示',
					content: '未找到任何备份文件，请先进行数据库备份。',
					showCancel: false
				})
				return
			}

			// 显示备份文件选择器
			this.showBackupFileSelector = true
		},

		// 选择备份文件进行恢复
		async selectBackupFileForRestore(backupFile) {
			this.selectedBackupFile = backupFile
			this.showBackupFileSelector = false

			uni.showModal({
				title: '确认恢复',
				content: `确定要从备份文件"${backupFile.displayName}"恢复数据库吗？\n\n恢复数据库将覆盖当前所有数据，此操作不可逆！`,
				success: async (res) => {
					if (res.confirm) {
						await this.performDatabaseRestore(backupFile.fileName)
					}
				}
			})
		},

		// 执行数据库恢复
		async performDatabaseRestore(fileName) {
			const gitCodeSync = this.createGitCodeSync()
			if (!gitCodeSync) return

			this.gitCodeLoading = true
			this.gitCodeLoadingText = '恢复数据库中...'

			try {
				// 使用传入的文件名，如果没有传入则使用默认文件名
				const backupFileName = fileName || `database_backup_${new Date().toISOString().split('T')[0]}.json`

				const result = await gitCodeSync.downloadData(backupFileName)

				if (result.success) {
					// 验证下载的数据
					let rawData = result.data
					console.log('下载的原始数据类型:', typeof rawData)
					console.log('下载的原始数据:', rawData)

					// 处理不同类型的数据
					if (typeof rawData === 'object' && rawData !== null) {
						// 如果已经是对象，直接使用
						if (rawData.data) {
							// 直接使用对象数据
							const backupData = rawData
							// 验证备份数据结构
							if (!backupData || !backupData.data) {
								throw new Error('备份数据格式不正确，缺少data字段')
							}
							// 恢复数据库
							await dbService.importAllData(backupData.data)

							this.gitCodeResultText = '恢复成功！\n数据库已从云端恢复'
							uni.showToast({ title: '恢复成功', icon: 'success' })

							// 重新加载用户数据
							await this.loadUserInfo()
							await this.loadUserData()
							return
						} else {
							// 转换为字符串进行解析
							rawData = JSON.stringify(rawData)
						}
					} else if (typeof rawData !== 'string') {
						// 其他类型转换为字符串
						rawData = String(rawData)
					}

					// 确保rawData是字符串后再进行字符串操作
					if (typeof rawData === 'string') {
						console.log('字符串数据前100字符:', rawData.substring(0, 100))
						// 清理可能的BOM或其他特殊字符
						rawData = rawData.trim()
						if (rawData.charCodeAt(0) === 0xFEFF) {
							rawData = rawData.slice(1)
						}
					}

					let backupData
					try {
						backupData = JSON.parse(rawData)
					} catch (parseError) {
						console.error('JSON解析失败:', parseError)
						console.error('解析失败的数据:', rawData.substring(0, 200))
						throw new Error(`JSON解析失败: ${parseError.message}`)
					}

					// 验证备份数据结构
					if (!backupData || !backupData.data) {
						throw new Error('备份数据格式不正确，缺少data字段')
					}

					// 恢复数据库
					await dbService.importAllData(backupData.data)

					this.gitCodeResultText = '恢复成功！\n数据库已从云端恢复'
					uni.showToast({ title: '恢复成功', icon: 'success' })

					// 重新加载用户数据
					await this.loadUserInfo()
					await this.loadUserData()
				} else {
					this.gitCodeResultText = '恢复失败：' + result.message
					uni.showToast({ title: '恢复失败', icon: 'none' })
				}
			} catch (error) {
				console.error('数据库恢复详细错误:', error)
				this.gitCodeResultText = '恢复异常：' + error.message
				uni.showToast({ title: '恢复异常', icon: 'none' })
			} finally {
				this.gitCodeLoading = false
			}
		},

		/**
		 * 处理用户状态变化
		 */
		handleUserStateChange(event) {
			if (event.type === 'USER_CHANGED') {
				// 用户切换时重新加载所有数据
				this.loadUserInfo()
				this.loadUserData()
				this.loadFavoriteCount()
			} else if (event.type === 'USER_INFO_UPDATED' && event.userInfo) {
				// 用户信息更新时同步界面
				this.userInfo = {
					...this.userInfo,
					...event.userInfo
				}
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

.navbar-actions {
	display: flex;
	align-items: center;
	gap: 32rpx;
}

.navbar-actions nut-icon {
	cursor: pointer;
	transition: all 0.3s ease;
}

.navbar-actions nut-icon:active {
	transform: scale(0.9);
	opacity: 0.7;
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
	transition: all 0.3s ease;
	cursor: pointer;
}

.user-card:active {
	transform: scale(0.98);
	background-color: #F7F8FA;
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
	display: flex;
	align-items: center;
	justify-content: center;
}

.avatar-emoji {
	font-size: 64rpx;
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
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	justify-content: space-between;
	transition: all 0.3s ease;
}

.version-info:active {
	background-color: #F2F3F5;
}

.version-content {
	display: flex;
	align-items: center;
	flex: 1;
}

.version-text {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 500;
}

.update-badge {
	background-color: #F53F3F;
	color: #ffffff;
	font-size: 20rpx;
	padding: 4rpx 8rpx;
	border-radius: 8rpx;
	margin-left: 12rpx;
	font-weight: 600;
}

.version-actions {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.check-update-text {
	font-size: 24rpx;
	color: #165DFF;
	font-weight: 500;
}

/* GitCode备份弹窗样式 */
.gitcode-modal {
	padding: 32rpx;
	height: 1100rpx;
	background-color: #F2F3F5;
	display: flex;
	flex-direction: column;
}

.gitcode-config-section,
.gitcode-operation-section,
.gitcode-result-section {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 24rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.section-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 24rpx;
	display: block;
}

.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	cursor: pointer;
	padding: 8rpx 0;
	margin-bottom: 16rpx;
	border-bottom: 2rpx solid #F2F3F5;
	transition: all 0.3s ease;
}

.section-header:active {
	background-color: #F7F8FA;
	border-radius: 8rpx;
	padding: 8rpx 12rpx;
}

.section-header .section-title {
	margin-bottom: 0;
	flex: 1;
}

.section-content {
	padding-top: 8rpx;
}

.btn-group {
	display: flex;
	gap: 20rpx;
}

.btn-group .nut-button {
	flex: 1;
}

.result-box {
	background-color: #F7F8FA;
	border: 2rpx solid #E5E6EB;
	border-radius: 12rpx;
	padding: 20rpx;
	min-height: 200rpx;
	max-height: 300rpx;
	overflow-y: auto;
}

.result-text {
	font-size: 24rpx;
	color: #4E5969;
	line-height: 1.6;
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
	z-index: 10000;
}

.loading-content {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 48rpx;
	text-align: center;
	box-shadow: 0 8rpx 32rpx 0 rgba(0, 0, 0, 0.16);
}

.loading-text {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 500;
}

/* 备份文件选择器样式 */
.backup-file-selector {
	padding: 32rpx;
	background-color: #ffffff;
	border-radius: 32rpx 32rpx 0 0;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.backup-file-list {
	flex: 1;
	overflow-y: auto;
	padding-top: 16rpx;
}

.empty-state {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 400rpx;
}

.empty-text {
	font-size: 28rpx;
	color: #86909C;
}

.backup-file-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	margin-bottom: 16rpx;
	background-color: #F8F9FA;
	border-radius: 16rpx;
	border: 2rpx solid transparent;
	transition: all 0.3s ease;
}

.backup-file-item:active {
	transform: scale(0.98);
	background-color: #165DFF10;
}

.file-info {
	display: flex;
	align-items: center;
	gap: 16rpx;
	flex: 1;
}

.file-icon {
	width: 64rpx;
	height: 64rpx;
	border-radius: 12rpx;
	background-color: #165DFF10;
	display: flex;
	align-items: center;
	justify-content: center;
}

.file-details {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.file-name {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 500;
}

.file-date {
	font-size: 24rpx;
	color: #86909C;
}

/* 用户切换相关样式 */
.user-name-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8rpx;
}

.user-actions {
	display: flex;
	gap: 28rpx;
}

.user-actions nut-icon {
	cursor: pointer;
	transition: all 0.3s ease;
}

.user-actions nut-icon:active {
	transform: scale(0.9);
	opacity: 0.7;
}

.user-switch-link {
	display: inline-flex;
	align-items: center;
	gap: 4rpx;
	transition: all 0.3s ease;
	cursor: pointer;
}

.user-switch-link:active {
	transform: scale(0.95);
	opacity: 0.7;
}

.switch-text {
	font-size: 28rpx;
	color: #165DFF;
	font-weight: 400;
	text-decoration: underline;
	text-underline-offset: 4rpx;
}

/* 用户切换弹窗样式 */
.user-switcher-modal {
	padding: 32rpx;
	background-color: #ffffff;
	border-radius: 32rpx 32rpx 0 0;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.modal-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 32rpx;
	padding-bottom: 24rpx;
	border-bottom: 2rpx solid #F2F3F5;
}

.modal-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #1D2129;
}

.user-list {
	flex: 1;
	overflow-y: auto;
}

.user-item {
	display: flex;
	align-items: center;
	padding: 24rpx;
	margin-bottom: 16rpx;
	background-color: #F8F9FA;
	border-radius: 16rpx;
	border: 2rpx solid transparent;
	transition: all 0.3s ease;
}

.user-item:active {
	transform: scale(0.98);
}

.user-item.active {
	background-color: #165DFF10;
	border-color: #165DFF;
}

.user-item-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background-color: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.user-item-emoji {
	font-size: 48rpx;
}

.user-item-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.user-item-name {
	font-size: 28rpx;
	font-weight: 600;
	color: #1D2129;
}

.user-item-title {
	font-size: 24rpx;
	color: #86909C;
}

.user-item-stats {
	font-size: 22rpx;
	color: #C9CDD4;
}

.modal-actions {
	padding-top: 24rpx;
	border-top: 2rpx solid #F2F3F5;
}

/* 创建用户弹窗样式 */
.create-user-modal {
	padding: 32rpx;
	background-color: #ffffff;
	border-radius: 16rpx;
	max-height: 80vh;
	display: flex;
	flex-direction: column;
}

.create-form {
	flex: 1;
	margin-bottom: 32rpx;
}

.form-item {
	margin-bottom: 32rpx;
}

.form-label {
	font-size: 28rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 16rpx;
	display: block;
}

.avatar-selector {
	display: grid;
	grid-template-columns: repeat(6, 1fr);
	gap: 16rpx;
	margin-top: 16rpx;
}

.avatar-option {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	background-color: #F8F9FA;
	border: 3rpx solid transparent;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: all 0.3s ease;
}

.avatar-option:active {
	transform: scale(0.9);
}

.avatar-option.selected {
	background-color: #165DFF10;
	border-color: #165DFF;
	box-shadow: 0 4rpx 12rpx rgba(22, 93, 255, 0.3);
}

.avatar-option .avatar-emoji {
	font-size: 40rpx;
}

/* 分享码弹窗样式 */
.promo-modal {
	display: flex;
	flex-direction: column;
	height: 100%;
	max-height: 80vh;
	background-color: #ffffff;
	border-radius: 20rpx;
	min-width: 700rpx;
}

.promo-header {
	position: sticky;
	top: 0;
	z-index: 10;
	background-color: #ffffff;
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 40rpx 40rpx 24rpx 40rpx;
	border-bottom: 2rpx solid #F2F3F5;
	border-radius: 20rpx 20rpx 0 0;
}

.promo-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #1D2129;
}

.close-btn {
	width: 60rpx;
	height: 60rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background-color: #F8F9FA;
	transition: all 0.3s ease;
}

.close-btn:active {
	background-color: #E5E6EB;
	transform: scale(0.9);
}

.promo-content {
	flex: 1;
	overflow-y: auto;
	padding: 0 40rpx 40rpx 40rpx;
}

.promo-status {
	margin-bottom: 32rpx;
	padding: 24rpx;
	background-color: #F8F9FA;
	border-radius: 16rpx;
}

.status-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20rpx;
	padding-bottom: 16rpx;
	border-bottom: 2rpx solid #E5E6EB;
}

.status-title {
	font-size: 28rpx;
	font-weight: bold;
	color: #1D2129;
}

.refresh-btn {
	padding: 8rpx 16rpx !important;
	height: 56rpx !important;
	font-size: 24rpx !important;
}

.status-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 16rpx;
}

.status-item:last-child {
	margin-bottom: 0;
}

.status-label {
	font-size: 28rpx;
	color: #86909C;
	font-weight: 500;
}

.status-value {
	font-size: 28rpx;
	font-weight: 500;
}

.status-value.active {
	color: #00B42A;
}

.status-value.expired {
	color: #F53F3F;
}

.status-value.inactive {
	color: #86909C;
}

.promo-input-section {
	margin-bottom: 32rpx;
}

.input-label {
	margin-bottom: 16rpx;
}

.input-label text {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 500;
}

.promo-input {
	width: 100%;
}

.promo-validity-section {
	margin-bottom: 32rpx;
}

.validity-cell {
	width: 100%;
	background-color: #F8F9FA;
	border: 2rpx solid #E5E6EB;
	border-radius: 12rpx;
	margin-top: 16rpx;
}

.promo-compress-section {
	margin-bottom: 32rpx;
}

.compress-cell {
	width: 100%;
	background-color: #F8F9FA;
	border: 2rpx solid #E5E6EB;
	border-radius: 12rpx;
	margin-top: 16rpx;
}

.compress-tip {
	margin-top: 12rpx;
	padding: 12rpx 16rpx;
	background-color: #E8F4FF;
	border-radius: 8rpx;
	border-left: 4rpx solid #165DFF;
}

.tip-text {
	font-size: 24rpx;
	color: #4E5969;
	line-height: 1.4;
}

.promo-main-actions {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
	margin-bottom: 24rpx;
}

.main-action-btn {
	width: 100%;
	height: 80rpx;
	border-radius: 12rpx;
	font-size: 28rpx;
	font-weight: 500;
}

.promo-advanced-section {
	margin-bottom: 32rpx;
	border: 2rpx solid #F2F3F5;
	border-radius: 16rpx;
	overflow: hidden;
}

.advanced-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx;
	background-color: #F8F9FA;
	cursor: pointer;
	transition: all 0.3s ease;
}

.advanced-header:active {
	background-color: #F2F3F5;
}

.advanced-title {
	font-size: 28rpx;
	color: #4E5969;
	font-weight: 500;
}

.advanced-actions {
	padding: 24rpx;
	background-color: #ffffff;
	display: flex;
	flex-direction: column;
	gap: 12rpx;
}

.advanced-btn {
	width: 100%;
	height: 64rpx;
	border-radius: 8rpx;
	font-size: 26rpx;
}

.promo-result {
	padding: 24rpx;
	background-color: #F8F9FA;
	border-radius: 16rpx;
	min-height: 120rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.result-text {
	font-size: 26rpx;
	color: #1D2129;
	line-height: 1.6;
	text-align: center;
	white-space: pre-line;
}
</style>