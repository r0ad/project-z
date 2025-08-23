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
						:class="{ 
							'active': config.is_active,
							'promo-config': config.promo_code_id,
							'readonly': config.promo_code_id
						}"
					>
						<view class="config-header">
							<view class="config-info">
								<text class="config-provider">{{ config.provider }}</text>
								<text class="config-model">{{ config.model }}</text>
								<!-- 分享码标识 -->
								<view class="source-indicator" v-if="config.promo_code_id">
									<nut-icon name="scan" size="12" color="#FF7D00"></nut-icon>
									<text class="source-text">分享码</text>
								</view>
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
												
								<!-- 编辑按钮 - 只有手动配置可编辑 -->
								<nut-icon 
									v-if="isConfigEditable(config)"
									name="edit" 
									size="16" 
									color="#86909C" 
									@click="editConfig(config)"
								></nut-icon>
												
								<!-- 分享码特殊操作 -->
								<nut-button 
									v-if="config.promo_code_id" 
									size="small" 
									type="warning"
									@click="showPromoDetails(config)"
								>
									分享码详情
								</nut-button>
												
								<nut-icon 
									name="del" 
									size="16" 
									color="#F53F3F" 
									@click="deleteConfig(config.provider)"
								></nut-icon>
							</view>
						</view>
										
						<!-- 分享码配置的额外信息 -->
						<view v-if="config.promo_code_id" class="promo-info">
							<view class="promo-meta">
								<text class="promo-id">分享码ID: {{ config.promo_code_id }}</text>
								<text class="created-time">应用时间: {{ formatTime(config.created_at) }}</text>
							</view>
							<view class="promo-notice">
								<nut-icon name="notice" size="12" color="#FF7D00"></nut-icon>
								<text class="notice-text">此配置来自分享码，不可编辑</text>
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
						<!-- 运营商选择 -->
						<view class="form-item">
							<text class="form-label">运营商</text>
							<nut-cell 
								v-if="!isCustomMode"
								:title="providerName || '请选择运营商'" 
								:desc="''"
								:disabled="editingConfig"
								@click="showProviderPicker = true"
								is-link
							></nut-cell>
							<nut-input 
								v-else
								v-model="formData.custom_provider_name" 
								placeholder="请输入自定义供应商名称，如：Claude、Gemini等"
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
						
						<!-- AI模型选择 -->
						<view class="form-item">
							<text class="form-label">AI模型</text>
							<nut-cell 
					v-if="!isCustomMode && availableModels.length > 0"
					:title="getModelDisplayName(formData.model) || '请选择模型'" 
					:desc="''"
					@click="showModelPicker = true"
					is-link
				></nut-cell>
							<nut-input 
								v-else
								v-model="formData.model" 
								placeholder="请输入模型名称，如：gpt-4、claude-3-sonnet等"
								type="text"
								clear-icon
							></nut-input>
						</view>
						
						<!-- 自定义模式下显示的额外字段 -->
						<template v-if="isCustomMode">
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
						</template>
						
						<!-- 高级设置 -->
						<view class="form-item">
							<view class="advanced-toggle" @click="showAdvanced = !showAdvanced">
								<text class="form-label">高级设置</text>
								<nut-icon 
									:name="showAdvanced ? 'arrow-up' : 'arrow-down'" 
									size="14" 
									color="#86909C"
								></nut-icon>
							</view>
							
							<view v-if="showAdvanced" class="advanced-content">
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
			
			<!-- 运营商选择弹窗 -->
			<nut-popup 
				v-model:visible="showProviderPicker" 
				position="bottom" 
				safe-area-inset-bottom
				:style="{ zIndex: 2000 }"
			>
				<nut-picker 
					v-model="selectedProvider"
					:columns="providers"
					title="选择运营商"
					@confirm="onProviderConfirm"
					@cancel="showProviderPicker = false"
				></nut-picker>
			</nut-popup>
			
			<!-- 模型选择弹窗 -->
			<nut-popup 
				v-model:visible="showModelPicker" 
				position="bottom" 
				safe-area-inset-bottom
				:style="{ zIndex: 2000 }"
			>
				<nut-picker 
					v-model="selectedModel"
					:columns="availableModels"
					title="选择模型"
					@confirm="onModelConfirm"
					@cancel="showModelPicker = false"
				></nut-picker>
			</nut-popup>
		</view>
	</view>
</template>

<script>
import aiApi from '@/api/aiApi.js'
import { 
	providers, 
	getProviderDefaultConfig, 
	getProviderModels, 
	isCustomProvider,
	LLMProviders 
} from '@/utils/aiProviders.js'

export default {
	data() {
		return {
			// 配置列表
			configList: [],
			// 表单数据
			formData: {
				provider: LLMProviders.DEEPSEEK,
				custom_provider_name: '',
				base_url: 'https://api.deepseek.com/v1',
				api_key: '',
				model: 'deepseek-chat',
				timeout: 130,
				max_tokens: 8000,
				temperature: 0.7,
				is_active: false
			},
			// 状态
			showAddConfig: false,
			editingConfig: null,
			testing: false,
			saving: false,
			isConfigured: false,
			showAdvanced: false,
			// Picker状态
			showProviderPicker: false,
			showModelPicker: false,
			selectedProvider: [],
			selectedModel: [],
			// 供应商相关
			providers: [providers.map(p => ({ text: p.name, value: p.id }))],
			availableModels: []
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
			},
			isCustomMode() {
				return isCustomProvider(this.formData.provider)
			},
			providerName() {
				const provider = this.providers[0].find(p => p.value === this.formData.provider)
				return provider ? provider.text : ''
			}
		},
	onLoad() {
		this.loadConfigList()
		this.updateAvailableModels()
		// 初始化selectedProvider
		this.selectedProvider = [LLMProviders.DEEPSEEK]
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
				
				// 如果是自定义模式，使用custom_provider_name作为provider
				if (this.isCustomMode && this.formData.custom_provider_name) {
					configToSave.provider = this.formData.custom_provider_name
				}
				
				// 删除custom_provider_name字段，数据库中不需要
				delete configToSave.custom_provider_name
				
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
				provider: LLMProviders.DEEPSEEK,
				custom_provider_name: '',
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
			this.showAdvanced = false
			this.showProviderPicker = false
			this.showModelPicker = false
			this.selectedProvider = [LLMProviders.DEEPSEEK]
			this.selectedModel = []
			this.onProviderChange(LLMProviders.DEEPSEEK)
		},
		// 判断配置是否可编辑（新增核心方法）
		isConfigEditable(config) {
			// 无promo_code_id表示手动创建，可编辑
			return !config.promo_code_id
		},
		
		// 获取配置来源类型显示文本
		getConfigSourceText(config) {
			return config.promo_code_id ? '分享码' : '手动创建'
		},
		
		// 获取配置来源图标
		getConfigSourceIcon(config) {
			return config.promo_code_id ? 'scan' : 'edit'
		},
		
		// 显示分享码配置详情
		showPromoDetails(config) {
			const detailText = `分享码配置详情\n\n` +
								`供应商: ${config.provider}\n` +
								`模型: ${config.model}\n` +
								`分享码ID: ${config.promo_code_id}\n` +
								`应用时间: ${this.formatTime(config.created_at)}\n\n` +
								`此配置来自分享码，不可编辑。\n` +
								`如需修改，请在“我的”页面移除分享码后再试。`
			
			uni.showModal({
				title: '分享码配置',
				content: detailText,
				showCancel: false,
				confirmText: '知道了'
			})
		},
		
		// 格式化时间显示
		formatTime(timestamp) {
			if (!timestamp) return '未知'
			
			try {
				const date = new Date(timestamp)
				return date.toLocaleString('zh-CN', {
					year: 'numeric',
					month: '2-digit',
					day: '2-digit',
					hour: '2-digit',
					minute: '2-digit'
				})
			} catch (error) {
				console.error('时间格式化失败:', error)
				return '时间格式错误'
			}
		},
		
		editConfig(config) {
			// 检查是否为分享码配置
			if (config.promo_code_id) {
				uni.showModal({
					title: '无法编辑',
					content: '该配置来自分享码，不允许编辑。\n\n如需修改，请在"我的"页面移除分享码后再试，或者创建新的手动配置。',
					showCancel: false,
					confirmText: '知道了'
				})
				return
			}
			
			// 原有的编辑逻辑
			this.editingConfig = config
			// 如果是自定义供应商，将provider值设置到custom_provider_name
			const isCustom = !Object.values(LLMProviders).includes(config.provider)
			const actualProvider = isCustom ? LLMProviders.CUSTOM : config.provider
			this.formData = { 
				...config,
				provider: actualProvider,
				custom_provider_name: isCustom ? config.provider : '',
				// 确保is_active是布尔值
				is_active: Boolean(config.is_active),
				// 确保数值类型正确
				timeout: Number(config.timeout) || 30,
				max_tokens: Number(config.max_tokens) || 2000,
				temperature: Number(config.temperature) || 0.7
			}
			// 设置picker的选中状态
			this.selectedProvider = [actualProvider]
			this.updateAvailableModels(actualProvider)
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
		},
		
		// 供应商变更处理
		onProviderChange(providerId) {
			// 如果是picker组件传递的对象，提取id
			if (typeof providerId === 'object' && providerId.id) {
				providerId = providerId.id
			}
			
			// 更新selectedProvider状态
			this.selectedProvider = [providerId]
			
			const defaultConfig = getProviderDefaultConfig(providerId)
			this.formData.provider = providerId
			this.formData.base_url = defaultConfig.base_url
			this.formData.timeout = defaultConfig.timeout
			this.formData.max_tokens = defaultConfig.max_tokens
			this.formData.temperature = defaultConfig.temperature
			
			// 更新可用模型
			this.updateAvailableModels()
			
			// 设置默认模型
			if (this.availableModels.length > 0) {
				this.formData.model = this.availableModels[0].id
			}
		},
		
		// 更新可用模型列表
		updateAvailableModels(providerId) {
			const models = getProviderModels(providerId || this.formData.provider)
			// 转换为picker需要的格式
			this.availableModels = models ? [models.map(m => ({ text: m.name, value: m.id }))] : []
			
			// 如果当前选择的模型不在新的模型列表中，清空模型选择
			if (models && models.length > 0) {
				const currentModelExists = models.some(model => model.id === this.formData.model)
				if (!currentModelExists) {
					this.formData.model = models[0]?.id || ''
				}
			} else {
				this.formData.model = ''
			}
		},
		
		// 运营商选择确认
		onProviderConfirm({ selectedValue, selectedOptions }) {
			const providerId = selectedValue[0]
			this.formData.provider = providerId
			// 更新selectedProvider以正确显示选中项
			this.selectedProvider = [providerId]
			this.onProviderChange(providerId)
			this.showProviderPicker = false
		},
		
		// 模型选择确认
		onModelConfirm({ selectedValue, selectedOptions }) {
			const modelId = selectedValue[0]
			this.formData.model = modelId
			this.showModelPicker = false
		},
		
		// 获取模型显示名称
		getModelDisplayName(modelId) {
			if (!modelId || !this.availableModels[0]) return ''
			const model = this.availableModels[0].find(m => m.value === modelId)
			return model ? model.text : modelId
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

/* 分享码配置特殊样式 */
.config-item.promo-config {
	border-color: #FF7D00;
	background-color: #FFF7F0;
	position: relative;
}

.config-item.promo-config.active {
	border-color: #FF7D00;
	background-color: #FFF2E6;
}

.config-item.readonly {
	opacity: 0.9;
}

/* 分享码标识 */
.source-indicator {
	display: flex;
	align-items: center;
	gap: 6rpx;
	margin-top: 8rpx;
	padding: 4rpx 8rpx;
	border-radius: 8rpx;
	background-color: #FF7D0015;
	border: 1rpx solid #FF7D0030;
}

.source-text {
	font-size: 20rpx;
	color: #FF7D00;
	font-weight: 500;
}

/* 分享码信息区域 */
.promo-info {
	margin-top: 16rpx;
	padding: 16rpx;
	border-radius: 8rpx;
	background-color: #FFF7F0;
	border: 1rpx solid #FF7D0030;
}

.promo-meta {
	display: flex;
	flex-direction: column;
	gap: 8rpx;
	margin-bottom: 12rpx;
}

.promo-id {
	font-size: 24rpx;
	color: #4E5969;
	font-family: monospace;
}

.created-time {
	font-size: 24rpx;
	color: #86909C;
}

.promo-notice {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 8rpx 12rpx;
	border-radius: 6rpx;
	background-color: #FF7D0010;
}

.notice-text {
	font-size: 24rpx;
	color: #FF7D00;
	font-weight: 500;
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
	height: 1100rpx;
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

/* 高级设置样式 */
.advanced-toggle {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 0;
	border-bottom: 1rpx solid #E5E6EB;
	cursor: pointer;
	transition: background-color 0.3s;
}

.advanced-toggle:active {
	background-color: #F7F8FA;
}

.advanced-content {
	padding-top: 24rpx;
	animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
	from {
		opacity: 0;
		transform: translateY(-20rpx);
	}
	to {
		opacity: 1;
		transform: translateY(0);
	}
}
</style>