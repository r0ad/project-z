<template>
	<view class="edit-profile-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar title="编辑资料" :showBack="true" />
		
		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 头像选择 -->
			<view class="form-section">
				<view class="section-title">头像</view>
				<view class="avatar-selector">
					<view class="current-avatar" @click="showAvatarPicker = true">
						<text class="avatar-emoji">{{ formData.avatar }}</text>
						<view class="avatar-edit-icon">
							<nut-icon name="edit" size="14" color="#86909C"></nut-icon>
						</view>
					</view>
					<text class="avatar-tip">点击更换头像</text>
				</view>
			</view>
			
			<!-- 基本信息 -->
			<view class="form-section">
				<view class="section-title">基本信息</view>
				<view class="form-item">
					<text class="form-label">用户名</text>
					<nut-input
						v-model="formData.username"
						placeholder="请输入用户名"
						maxlength="20"
						clear-icon
					/>
				</view>
				<view class="form-item">
					<text class="form-label">邮箱</text>
					<nut-input
						v-model="formData.email"
						placeholder="请输入邮箱地址"
						type="email"
						clear-icon
					/>
				</view>
				<view class="form-item">
					<text class="form-label">职位</text>
					<nut-input
						v-model="formData.title"
						placeholder="请输入职位"
						maxlength="30"
						clear-icon
					/>
				</view>
			</view>
			
			<!-- 保存按钮 -->
			<view class="save-section">
				<nut-button
					type="primary"
					size="large"
					:loading="saving"
					@click="saveProfile"
				>
					{{ saving ? '保存中...' : '保存' }}
				</nut-button>
			</view>
		</view>
		
		<!-- 头像选择弹窗 -->
		<nut-popup
			v-model:visible="showAvatarPicker"
			position="bottom"
			round
			:style="{ height: '60%' }"
		>
			<view class="avatar-picker">
				<view class="picker-header">
					<text class="picker-title">选择头像</text>
					<nut-icon name="close" size="20" @click="showAvatarPicker = false"></nut-icon>
				</view>
				
				<view class="picker-content">
					<view class="avatar-categories">
						<view 
							v-for="category in avatarCategories" 
							:key="category"
							class="category-tab"
							:class="{ active: selectedCategory === category }"
							@click="selectedCategory = category"
						>
							{{ category }}
						</view>
					</view>
					
					<view class="avatar-grid">
						<view 
							v-for="avatar in filteredAvatars" 
							:key="avatar.value"
							class="avatar-option"
							:class="{ selected: formData.avatar === avatar.value }"
							@click="selectAvatar(avatar.value)"
						>
							<text class="avatar-emoji">{{ avatar.value }}</text>
							<text class="avatar-label">{{ avatar.label }}</text>
						</view>
					</view>
				</view>
			</view>
		</nut-popup>
	</view>
</template>

<script>
import CustomNavbar from '@/components/CustomNavbar.vue'
import userApi from '@/api/userApi.js'

export default {
	name: 'EditProfile',
	components: {
		CustomNavbar
	},
	data() {
		return {
			formData: {
				username: '',
				email: '',
				avatar: '👤',
				title: '',
				isVip: false
			},
			originalData: {},
			saving: false,
			showAvatarPicker: false,
			avatarOptions: [],
			selectedCategory: '人物'
		}
	},
	computed: {
		avatarCategories() {
			const categories = [...new Set(this.avatarOptions.map(item => item.category))]
			return categories
		},
		filteredAvatars() {
			return this.avatarOptions.filter(item => item.category === this.selectedCategory)
		}
	},
	async mounted() {
		await this.loadUserData()
		this.loadAvatarOptions()
	},
	methods: {
		/**
		 * 加载用户数据
		 */
		async loadUserData() {
			try {
				uni.showLoading({ title: '加载中...' })
				
				const userData = await userApi.getCurrentUser()
				
				this.formData = {
					username: userData.username,
					email: userData.email,
					avatar: userData.avatar,
					title: userData.title,
					isVip: userData.isVip
				}
				
				// 保存原始数据用于比较
				this.originalData = { ...this.formData }
				
			} catch (error) {
				console.error('加载用户数据失败:', error)
				uni.showToast({
					title: '加载失败',
					icon: 'error'
				})
			} finally {
				uni.hideLoading()
			}
		},
		
		/**
		 * 加载头像选项
		 */
		loadAvatarOptions() {
			this.avatarOptions = userApi.getAvatarOptions()
		},
		
		/**
		 * 选择头像
		 */
		selectAvatar(avatar) {
			this.formData.avatar = avatar
			this.showAvatarPicker = false
		},
		
		/**
		 * 保存用户资料
		 */
		async saveProfile() {
			// 验证表单
			if (!this.validateForm()) {
				return
			}
			
			// 检查是否有变更
			if (!this.hasChanges()) {
				uni.showToast({
					title: '没有变更',
					icon: 'none'
				})
				return
			}
			
			try {
				this.saving = true
				
				// 准备更新数据
				const updateData = {
					username: this.formData.username,
					email: this.formData.email,
					avatar: this.formData.avatar,
					settings: {
						title: this.formData.title,
						isVip: this.formData.isVip,
						theme: 'light' // 保持默认主题
					}
				}
				
				await userApi.updateUser(updateData)
				
				uni.showToast({
					title: '保存成功',
					icon: 'success'
				})
				
				// 延迟返回上一页
				setTimeout(() => {
					uni.navigateBack()
				}, 1500)
				
			} catch (error) {
				console.error('保存失败:', error)
				uni.showToast({
					title: '保存失败',
					icon: 'error'
				})
			} finally {
				this.saving = false
			}
		},
		
		/**
		 * 验证表单
		 */
		validateForm() {
			if (!this.formData.username.trim()) {
				uni.showToast({
					title: '请输入用户名',
					icon: 'none'
				})
				return false
			}
			
			if (this.formData.email && !this.isValidEmail(this.formData.email)) {
				uni.showToast({
					title: '邮箱格式不正确',
					icon: 'none'
				})
				return false
			}
			
			return true
		},
		
		/**
		 * 验证邮箱格式
		 */
		isValidEmail(email) {
			const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
			return emailRegex.test(email)
		},
		
		/**
		 * 检查是否有变更
		 */
		hasChanges() {
			return JSON.stringify(this.formData) !== JSON.stringify(this.originalData)
		}
	}
}
</script>

<style scoped>
.edit-profile-page {
	min-height: 100vh;
	background-color: #f7f8fa;
}

.page-content {
	padding: 16px;
}

.form-section {
	background: white;
	border-radius: 12px;
	padding: 16px;
	margin-bottom: 16px;
}

.section-title {
	font-size: 16px;
	font-weight: 600;
	color: #1d2129;
	margin-bottom: 16px;
}

/* 头像选择器 */
.avatar-selector {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
}

.current-avatar {
	position: relative;
	width: 80px;
	height: 80px;
	border-radius: 50%;
	background: #f2f3f5;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 2px solid #e4e6ea;
}

.avatar-emoji {
	font-size: 40px;
}

.avatar-edit-icon {
	position: absolute;
	bottom: 0;
	right: 0;
	width: 24px;
	height: 24px;
	background: white;
	border-radius: 50%;
	border: 1px solid #e4e6ea;
	display: flex;
	align-items: center;
	justify-content: center;
}

.avatar-tip {
	font-size: 12px;
	color: #86909c;
}

/* 表单项 */
.form-item {
	margin-bottom: 16px;
}

.form-item:last-child {
	margin-bottom: 0;
}

.form-label {
	font-size: 14px;
	color: #4e5969;
	margin-bottom: 8px;
	display: block;
}

.switch-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.switch-item .form-label {
	margin-bottom: 0;
}

/* 保存按钮 */
.save-section {
	padding: 16px 0;
}

/* 头像选择弹窗 */
.avatar-picker {
	height: 100%;
	display: flex;
	flex-direction: column;
}

.picker-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16px 20px;
	border-bottom: 1px solid #e4e6ea;
}

.picker-title {
	font-size: 16px;
	font-weight: 600;
	color: #1d2129;
}

.picker-content {
	flex: 1;
	padding: 16px 20px;
	overflow-y: auto;
}

.avatar-categories {
	display: flex;
	gap: 16px;
	margin-bottom: 20px;
	border-bottom: 1px solid #e4e6ea;
}

.category-tab {
	padding: 8px 0;
	font-size: 14px;
	color: #86909c;
	border-bottom: 2px solid transparent;
	cursor: pointer;
}

.category-tab.active {
	color: #165dff;
	border-bottom-color: #165dff;
}

.avatar-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 16px;
}

.avatar-option {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	padding: 12px;
	border-radius: 8px;
	border: 2px solid transparent;
	cursor: pointer;
	transition: all 0.2s;
}

.avatar-option:hover {
	background: #f2f3f5;
}

.avatar-option.selected {
	border-color: #165dff;
	background: #f2f6ff;
}

.avatar-option .avatar-emoji {
	font-size: 32px;
}

.avatar-label {
	font-size: 12px;
	color: #86909c;
	text-align: center;
}
</style>