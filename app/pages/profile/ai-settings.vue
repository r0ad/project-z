<template>
	<view class="ai-settings-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-content">
				<nut-icon name="left" size="20" color="#1D2129" @click="goBack"></nut-icon>
				<text class="navbar-title">AI设置</text>
				<nut-button type="primary" size="small" @click="showAddConfig = true">
					添加配置
				</nut-button>
			</view>
		</view>

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- AI配置状态 -->
			<view class="status-card">
				<view class="status-header">
					<view class="status-icon" :class="{ 'connected': isConfigured }">
						<nut-icon :name="isConfigured ? 'check' : 'close'" size="16" color="#ffffff"></nut-icon>
					</view>
					<view class="status-info">
						<text class="status-title">{{ isConfigured ? 'AI已连接' : 'AI未配置' }}</text>
						<text class="status-subtitle">{{ statusText }}</text>
					</view>
					<nut-button 
						type="primary" 
						size="small" 
						@click="testConnection"
						:loading="testing"
						:disabled="!canTest"
					>
						{{ testing ? '测试中' : '测试连接' }}
					</nut-button>
				</view>
			</view>

			<!-- AI配置列表 -->
			<view class="config-list">
				<view class="section-title">运营商配置</view>
				<view v-if="configList.length === 0" class="empty-state">
					<nut-icon name="robot" size="48" color="#C9CDD4"></nut-icon>
					<text class="empty-text">暂无AI配置</text>
					<text class="empty-desc">点击右上角添加按钮创建配置</text>
				</view>
				<view v-else>
					<view 
						v-for="(config, index) in configList" 
						:key="config.id"
						class="config-item"
						:class="{ 'active': config.is_active }"
					>
						<view class="config-header">
							<view class="config-info">
								<text class="config-provider">{{ config.provider }}</text>
								<text class="config-model">{{ config.model }}</text>
							</view>
							<view class="config-actions">
								<nut-button 
									v-if="!config.is_active"
									type="primary" 
									size="small" 
									@click="activateConfig(config.provider)"
								>
									激活
								</nut-button>
								<text v-else class="active-badge">当前激活</text>
								<nut-icon 
									name="edit" 
									size="16" 
									color="#86909C" 
									@click="editConfig(config)"
								></nut-icon>
								<nut-icon 
									name="del" 
									size="16" 
									color="#F53F3F" 
									@click="deleteConfig(config.provider)"
								></nut-icon>
							</view>
						</view>
						<view class="config-details">
							<text class="config-url">{{ config.base_url }}</text>
							<view class="config-params">
								<text class="param-item">超时: {{ config.timeout }}s</text>
								<text class="param-item">Tokens: {{ config.max_tokens }}</text>
								<text class="param-item">温度: {{ config.temperature }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 配置表单弹窗 -->
			<nut-popup 
				v-model:visible="showAddConfig" 
				position="bottom" 
				:style="{ height: '80%' }"
				round
				closeable
				@close="resetForm"
			>
				<view class="config-form">
					<view class="form-header">
						<text class="form-title">{{ editingConfig ? '编辑配置' : '添加配置' }}</text>
					</view>
					
					<view class="form-content">
						<!-- 运营商 -->
						<view class="form-item">
							<text class="form-label">运营商</text>
							<nut-input 
								v-model="formData.provider" 
								placeholder="如：OpenAI、Claude、通义千问等"
								type="text"
								clear-icon
								:disabled="editingConfig"
							></nut-input>
						</view>
						
						<!-- API地址 -->
						<view class="form-item">
							<text class="form-label">API地址</text>
							<nut-input 
								v-model="formData.base_url" 
								placeholder="请输入API地址"
								type="text"
								clear-icon
							></nut-input>
						</view>
						
						<!-- API Key -->
						<view class="form-item">
							<text class="form-label">API Key</text>
							<nut-input 
								v-model="formData.api_key" 
								placeholder="请输入API Key"
								type="password"
								clear-icon
							></nut-input>
						</view>
						
						<!-- AI模型 -->
						<view class="form-item">
							<text class="form-label">AI模型</text>
							<nut-input 
								v-model="formData.model" 
								placeholder="如：gpt-4、claude-3-sonnet等"
								type="text"
								clear-icon
							></nut-input>
						</view>
						
						<!-- 超时时间 -->
						<view class="form-item">
							<text class="form-label">超时时间(秒)</text>
							<nut-input 
								v-model="formData.timeout" 
								placeholder="请输入超时时间"
								type="number"
							></nut-input>
						</view>
						
						<!-- 最大Token数 -->
						<view class="form-item">
							<text class="form-label">最大Token数</text>
							<nut-input 
								v-model="formData.max_tokens" 
								placeholder="请输入最大Token数"
								type="number"
							></nut-input>
						</view>
						
						<!-- 温度参数 -->
						<view class="form-item">
							<text class="form-label">温度参数 ({{ formData.temperature }})</text>
							<nut-range 
								v-model="formData.temperature" 
								:min="0" 
								:max="2" 
								:step="0.1"
								active-color="#165DFF"
							></nut-range>
							<view class="range-tips">
								<text class="tip-text">较低值使输出更确定，较高值使输出更随机</text>
							</view>
						</view>
						
						<!-- 是否激活 -->
						<view class="form-item">
							<view class="switch-item">
								<text class="form-label">设为激活配置</text>
								<nut-switch v-model="formData.is_active"></nut-switch>
							</view>
						</view>
					</view>
					
					<!-- 操作按钮 -->
					<view class="form-actions">
						<nut-button 
							type="default" 
							size="large" 
							@click="resetForm"
						>
							取消
						</nut-button>
						<nut-button 
							type="primary" 
							size="large" 
							@click="saveConfig"
							:loading="saving"
						>
							{{ saving ? '保存中...' : '保存配置' }}
						</nut-button>
					</view>
				</view>
			</nut-popup>
		</view>
	</view>
</template>

<script>
import aiApi from '@/api/aiApi.js'

export default {
	data() {
		return {
			// 配置列表
			configList: [],
			// 表单数据
			formData: {
				provider: 'deepseek',
				base_url: 'https://api.deepseek.com/v1',
				api_key: 'sk-',
				model: 'deepseek-chat',
				timeout: 30,
				max_tokens: 2000,
				temperature: 0.7,
				is_active: false
			},
			// 状态
			showAddConfig: false,
			editingConfig: null,
			testing: false,
			saving: false,
			isConfigured: false
		}
	},
	computed: {
		statusText() {
			const activeConfig = this.configList.find(config => config.is_active)
			if (activeConfig) {
				return `当前模型：${activeConfig.model}`
			} else {
				return '请配置并激活AI服务'
			}
		},
		canTest() {
			return this.configList.some(config => config.is_active)
		}
	},
	onLoad() {
		this.loadConfigList()
	},
	methods: {
		async loadConfigList() {
			try {
				const configs = await aiApi.getAIConfigList()
				this.configList = configs || []
				this.isConfigured = this.configList.some(config => config.is_active)
			} catch (error) {
				console.error('加载AI配置失败:', error)
				uni.showToast({
					title: '加载配置失败',
					icon: 'error'
				})
			}
		},
		
		async saveConfig() {
			if (!this.formData.provider || !this.formData.base_url || !this.formData.api_key || !this.formData.model) {
				uni.showToast({
					title: '请填写必要配置项',
					icon: 'error'
				})
				return
			}
			
			this.saving = true
			try {
				// 验证数值类型
				const configToSave = {
					...this.formData,
					timeout: parseInt(this.formData.timeout) || 30,
					max_tokens: parseInt(this.formData.max_tokens) || 2000,
					temperature: parseFloat(this.formData.temperature) || 0.7
				}
				
				// 验证温度参数范围
				if (configToSave.temperature < 0 || configToSave.temperature > 2) {
					uni.showToast({
						title: '温度参数必须在0-2之间',
						icon: 'error'
					})
					return
				}
				
				if (this.editingConfig) {
					await aiApi.updateAIConfig(this.editingConfig.id, configToSave)
				} else {
					await aiApi.addAIConfig(configToSave)
				}
				
				await this.loadConfigList()
				this.resetForm()
				
				uni.showToast({
					title: '配置保存成功',
					icon: 'success'
				})
			} catch (error) {
				console.error('保存AI配置失败:', error)
				uni.showToast({
					title: '保存配置失败',
					icon: 'error'
				})
			} finally {
				this.saving = false
			}
		},
		
		async testConnection() {
			if (!this.canTest) {
				uni.showToast({
					title: '请先激活一个配置',
					icon: 'error'
				})
				return
			}
			
			this.testing = true
			try {
				// 发送测试请求
				const response = await aiApi.testAIConnection()
				
				if (response && response.success) {
					uni.showToast({
						title: 'AI连接成功',
						icon: 'success'
					})
				} else {
					throw new Error('AI响应异常')
				}
			} catch (error) {
				console.error('AI连接测试失败:', error)
				uni.showToast({
					title: 'AI连接失败',
					icon: 'error'
				})
			} finally {
				this.testing = false
			}
		},
		
		resetForm() {
			this.formData = {
				provider: '',
				base_url: '',
				api_key: '',
				model: '',
				timeout: 30,
				max_tokens: 2000,
				temperature: 0.7,
				is_active: false
			}
			this.editingConfig = null
			this.showAddConfig = false
		},
		
		editConfig(config) {
			this.formData = { ...config }
			this.editingConfig = config
			this.showAddConfig = true
		},
		
		async deleteConfig(provider) {
			uni.showModal({
				title: '确认删除',
				content: '确定要删除这个配置吗？',
				success: async (res) => {
					if (res.confirm) {
						try {
							await aiApi.deleteAIConfig(provider)
							await this.loadConfigList()
							uni.showToast({
								title: '删除成功',
								icon: 'success'
							})
						} catch (error) {
							console.error('删除配置失败:', error)
							uni.showToast({
								title: '删除失败',
								icon: 'error'
							})
						}
					}
				}
			})
		},
		
		async activateConfig(provider) {
			try {
				await aiApi.activateAIConfig(provider)
				await this.loadConfigList()
				uni.showToast({
					title: '激活成功',
					icon: 'success'
				})
			} catch (error) {
				console.error('激活配置失败:', error)
				uni.showToast({
					title: '激活失败',
					icon: 'error'
				})
			}
		},
		
		goBack() {
			uni.navigateBack()
		}
	}
}
</script>

<style scoped>
.ai-settings-page {
	min-height: 100vh;
	background-color: #f5f5f5;
}

.custom-navbar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1000;
	background-color: #ffffff;
	border-bottom: 1rpx solid #E5E6EB;
}

.navbar-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	height: 88rpx;
	padding: 0 32rpx;
	padding-top: var(--status-bar-height);
}

.navbar-title {
	font-size: 36rpx;
	font-weight: 600;
	color: #1D2129;
}

.page-content {
	padding-top: calc(88rpx + var(--status-bar-height));
	padding: calc(88rpx + var(--status-bar-height)) 32rpx 32rpx;
}

.status-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.status-header {
	display: flex;
	align-items: center;
	gap: 24rpx;
}

.status-icon {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background-color: #F53F3F;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: background-color 0.3s;
}

.status-icon.connected {
	background-color: #00B42A;
}

.status-info {
	flex: 1;
}

.status-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	display: block;
	margin-bottom: 8rpx;
}

.status-subtitle {
	font-size: 28rpx;
	color: #86909C;
	display: block;
}

/* 配置列表样式 */
.config-list {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.06);
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 32rpx;
	display: block;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 80rpx 0;
	gap: 16rpx;
}

.empty-text {
	font-size: 32rpx;
	color: #86909C;
	font-weight: 500;
}

.empty-desc {
	font-size: 28rpx;
	color: #C9CDD4;
}

.config-item {
	border: 2rpx solid #E5E6EB;
	border-radius: 12rpx;
	padding: 24rpx;
	margin-bottom: 16rpx;
	transition: all 0.3s;
}

.config-item:last-child {
	margin-bottom: 0;
}

.config-item.active {
	border-color: #165DFF;
	background-color: #F7F8FF;
}

.config-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
}

.config-info {
	flex: 1;
}

.config-provider {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	display: block;
	margin-bottom: 8rpx;
}

.config-model {
	font-size: 28rpx;
	color: #86909C;
	display: block;
}

.config-actions {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.active-badge {
	font-size: 24rpx;
	color: #165DFF;
	background-color: #E8F3FF;
	padding: 8rpx 16rpx;
	border-radius: 20rpx;
}

.config-details {
	padding-top: 16rpx;
	border-top: 1rpx solid #E5E6EB;
}

.config-url {
	font-size: 26rpx;
	color: #4E5969;
	display: block;
	margin-bottom: 12rpx;
	word-break: break-all;
}

.config-params {
	display: flex;
	gap: 24rpx;
	flex-wrap: wrap;
}

.param-item {
	font-size: 24rpx;
	color: #86909C;
	background-color: #F7F8FA;
	padding: 6rpx 12rpx;
	border-radius: 8rpx;
}

/* 表单弹窗样式 */
.config-form {
	padding: 32rpx;
	height: 100%;
	display: flex;
	flex-direction: column;
}

.form-header {
	margin-bottom: 32rpx;
}

.form-title {
	font-size: 36rpx;
	font-weight: 600;
	color: #1D2129;
}

.form-content {
	flex: 1;
	overflow-y: auto;
}

.form-item {
	margin-bottom: 32rpx;
}

.form-item:last-child {
	margin-bottom: 0;
}

.form-label {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 500;
	margin-bottom: 16rpx;
	display: block;
}

.switch-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.range-tips {
	margin-top: 16rpx;
}

.tip-text {
	font-size: 24rpx;
	color: #86909C;
}

.form-actions {
	display: flex;
	gap: 24rpx;
	padding-top: 32rpx;
	border-top: 1rpx solid #E5E6EB;
	margin-top: 32rpx;
}

.form-actions .nut-button {
	flex: 1;
}
</style>