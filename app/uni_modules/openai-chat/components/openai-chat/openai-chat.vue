<template>
	<view class="openai-chat">
		<!-- 配置区域 -->
		<view v-if="showConfig" class="config-panel">
			<view class="config-modal">
				<view class="config-header">
					<text class="config-title">OpenAI 配置</text>
					<text class="config-close" @click="toggleConfig">×</text>
				</view>
				<scroll-view class="config-content" scroll-y>
					<view class="config-item">
						<text class="config-label">API地址:</text>
						<input v-model="config.baseUrl" class="config-input" placeholder="请输入API地址" />
					</view>
					<view class="config-item">
						<text class="config-label">API Key:</text>
						<input v-model="config.apiKey" class="config-input" placeholder="请输入API Key" type="password" />
					</view>
					<view class="config-item">
						<text class="config-label">模型:</text>
						<input v-model="config.model" class="config-input" placeholder="请输入模型名称" />
					</view>
				</scroll-view>
				<view class="config-actions">
					<button @click="saveConfig" class="config-btn save-btn">保存配置</button>
					<button @click="toggleConfig" class="config-btn cancel-btn">取消</button>
				</view>
			</view>
		</view>
		
		<!-- 聊天头部 -->
		<view class="chat-header">
			<view class="header-left">
				<text class="chat-title">{{title}}</text>
				<text v-if="currentConversationId" class="conversation-info">对话: {{currentConversationId.substring(5, 13)}}</text>
			</view>
			<view class="header-actions">
				<text class="action-btn" @click="toggleConfig">⚙️</text>
				<text class="action-btn" @click="newConversation">➕</text>
				<text class="action-btn" @click="clearConversation">🗑️</text>
			</view>
		</view>
		
		<!-- 消息列表 -->
		<scroll-view id="messageScrollView" class="message-list" :scroll-y="true" :scroll-top="scrollTop" :scroll-with-animation="true" :enable-flex="true" @scroll="onScroll">
			<view class="message-container">
				<view v-for="(message, index) in messages" :key="index" class="message-item" :class="message.role">
					<view class="message-avatar">
						<text class="avatar-text">{{getAvatarText(message.role)}}</text>
					</view>
					<view class="message-content">
						<view class="message-text">{{message.content}}</view>
						<view v-if="message.function_call" class="function-call">
							<text class="function-label">🔧 函数调用:</text>
							<text class="function-name">{{message.function_call.name}}</text>
						</view>
						<view class="message-time">{{formatTime(message.timestamp)}}</view>
					</view>
				</view>
				
				<!-- 流式响应显示 -->
				<view v-if="isStreaming && streamContent" class="message-item assistant streaming">
					<view class="message-avatar">
						<text class="avatar-text">🤖</text>
					</view>
					<view class="message-content">
						<view class="message-text">
							{{streamContent}}
							<text class="cursor" :class="{blink: isStreaming}">|</text>
						</view>
					</view>
				</view>
				
				<!-- 加载状态 -->
				<view v-if="loading && !isStreaming" class="loading-item">
					<view class="loading-dots">
						<text class="dot">●</text>
						<text class="dot">●</text>
						<text class="dot">●</text>
					</view>
					<text class="loading-text">AI正在思考中...</text>
				</view>
			</view>
		</scroll-view>
		
		<!-- 输入区域 -->
		<view class="input-area">
			<view class="input-options">
				<view class="option-item">
					<text class="option-label">流式:</text>
					<switch :checked="enableStream" @change="onStreamModeChange" color="#007aff" />
				</view>
				<view class="option-item">
					<text class="option-label">函数:</text>
					<switch :checked="enableFunctions" @change="onFunctionModeChange" color="#007aff" />
				</view>
			</view>
			
			<view class="input-row">
				<view class="input-wrapper">
					<textarea 
						v-model="inputMessage" 
						class="message-input" 
						placeholder="请输入消息..." 
						:disabled="loading"
						@confirm="sendMessage"
						auto-height
						:maxlength="2000"
					></textarea>
				</view>
				<view class="send-wrapper">
					<button @click="sendMessage" class="send-btn" :disabled="loading || !inputMessage.trim()">
						<text class="send-text">{{loading ? '...' : '发送'}}</text>
					</button>
				</view>
			</view>
		</view>
		
		<!-- 错误提示 -->
		<view v-if="errorMessage" class="error-toast">
			<text class="error-text">{{errorMessage}}</text>
			<text class="error-close" @click="clearError">×</text>
		</view>
	</view>
</template>

<script>
import OpenAIAPI from '../../js_sdk/openai-api.js'

export default {
	name: 'openai-chat',
	props: {
		// 聊天标题
		title: {
			type: String,
			default: 'AI助手'
		},
		// 初始配置
		initialConfig: {
			type: Object,
			default: () => ({})
		},
		// 系统提示词
		systemPrompt: {
			type: String,
			default: '你是一个智能助手，可以帮助用户解答问题。'
		},
		// 是否显示配置面板
		showConfigPanel: {
			type: Boolean,
			default: true
		},
		// 是否启用历史对话
		enableHistory: {
			type: Boolean,
			default: true
		},
		// 最大消息显示数量
		maxMessages: {
			type: Number,
			default: 100
		}
	},
	
	data() {
		return {
			// OpenAI API实例
			openaiAPI: null,
			
			// 配置
			config: {
				baseUrl: 'https://api.deepseek.com/v1',
				apiKey: '',
				model: 'deepseek-chat',
				timeout: 30000,
				...this.initialConfig
			},
			
			// UI状态
			showConfig: false,
			loading: false,
			errorMessage: '',
			// 滚动控制系统
			scrollTop: 0, // 当前滚动位置
			oldScrollTop: 0, // 旧的滚动位置（兼容性保留）
			
			// 智能滚动状态机
			scrollState: 'AUTO_FOLLOW', // AUTO_FOLLOW | USER_BROWSING | RETURNING_TO_BOTTOM
			lastScrollTop: 0, // 上次滚动位置
			lastScrollTime: 0, // 上次滚动时间戳
			scrollDirection: 0, // 滚动方向：1向下，-1向上，0无变化
			isAutoScrolling: false, // 是否正在执行自动滚动
			userScrollThreshold: 30, // 用户主动滚动的阈值（像素）
			nearBottomThreshold: 50, // 接近底部的阈值（像素）
			scrollDebounceTimer: null, // 滚动防抖定时器
			autoScrollTimer: null, // 自动滚动定时器
			scrollThrottleTimer: null, // 滚动节流定时器
			lastThrottleTime: 0, // 上次节流时间
			lastContentHeight: 0, // 上次内容高度
			
			// 对话状态
			currentConversationId: null,
			messages: [],
			inputMessage: '',
			
			// 流式响应
			enableStream: true,
			isStreaming: false,
			streamContent: '',
			streamUpdateTimer: null,
			
			// 函数调用
			enableFunctions: false
		}
	},
	
	mounted() {
		this.initOpenAI()
		this.registerDefaultFunctions()
	},
	
	beforeDestroy() {
		// 清理所有滚动相关定时器
		if (this.scrollTimer) {
			clearTimeout(this.scrollTimer)
			this.scrollTimer = null
		}
		if (this.scrollDebounceTimer) {
			clearTimeout(this.scrollDebounceTimer)
			this.scrollDebounceTimer = null
		}
		if (this.autoScrollTimer) {
			clearTimeout(this.autoScrollTimer)
			this.autoScrollTimer = null
		}
		if (this.scrollThrottleTimer) {
			clearTimeout(this.scrollThrottleTimer)
			this.scrollThrottleTimer = null
		}
		console.log('智能滚动系统已清理')
	},
	
	watch: {
		config: {
			handler() {
				if (this.openaiAPI) {
					this.openaiAPI.updateConfig(this.config)
				}
			},
			deep: true
		},
		
		messages: {
			handler() {
				this.$nextTick(() => {
					this.scrollToBottom()
				})
			},
			deep: true
		},
		
		streamContent: {
			handler() {
				if (this.isStreaming && this.autoScrollLocked) {
					// 节流滚动，避免频繁调用
					clearTimeout(this.scrollTimer)
					this.scrollTimer = setTimeout(() => {
						this.scrollToBottom()
					}, 50)
				}
			}
		}
	},
	
	methods: {
		// 初始化OpenAI API
		initOpenAI() {
			this.openaiAPI = new OpenAIAPI(this.config)
			
			// 创建新对话
			if (this.enableHistory) {
				this.currentConversationId = this.openaiAPI.createConversation(null, this.systemPrompt)
				this.updateMessages()
			}
		},
		
		// 注册默认函数
		registerDefaultFunctions() {
			if (!this.openaiAPI) return
			
			// 获取当前时间
			this.openaiAPI.registerFunction(
				'getCurrentTime',
				'获取当前的日期和时间',
				{
					type: 'object',
					properties: {
						format: {
							type: 'string',
							description: '时间格式',
							enum: ['datetime', 'date', 'time']
						}
					},
					required: []
				},
				(args) => {
					const now = new Date()
					switch (args.format) {
						case 'date': return now.toLocaleDateString('zh-CN')
						case 'time': return now.toLocaleTimeString('zh-CN')
						default: return now.toLocaleString('zh-CN')
					}
				}
			)
			
			// 计算数学表达式
			this.openaiAPI.registerFunction(
				'calculate',
				'计算数学表达式',
				{
					type: 'object',
					properties: {
						expression: {
							type: 'string',
							description: '要计算的数学表达式'
						}
					},
					required: ['expression']
				},
				(args) => {
					try {
						const result = Function('"use strict"; return (' + args.expression + ')')();
						return { expression: args.expression, result: result, success: true }
					} catch (error) {
						return { expression: args.expression, error: error.message, success: false }
					}
				}
			)
		},
		
		// 发送消息
		async sendMessage() {
			if (!this.inputMessage.trim()) return
			
			if (!this.config.apiKey.trim()) {
				this.showError('请先配置API Key')
				return
			}
			
			const userMessage = this.inputMessage.trim()
			this.inputMessage = ''
			
			// 立即添加用户消息到显示列表
			this.addMessage('user', userMessage)
			
			// 确保有当前对话ID，如果没有则创建新对话
			if (this.enableHistory && this.openaiAPI && !this.currentConversationId) {
				this.currentConversationId = this.openaiAPI.createConversation(null, this.systemPrompt)
			}
			
			// 重置滚动状态，确保新消息能自动滚动
			this.scrollState = 'AUTO_FOLLOW'
			this.lastScrollTop = 0
			this.lastScrollTime = Date.now()
			console.log('发送新消息，重置滚动状态为 AUTO_FOLLOW')
			
			this.loading = true
			this.clearError()
			
			try {
				const messages = [{ role: 'user', content: userMessage }]
				
				if (this.enableStream) {
					// 流式响应
					this.isStreaming = true
					this.streamContent = ''
					
					// 启动定时更新机制，确保UI实时刷新
					this.streamUpdateTimer = setInterval(() => {
						if (this.isStreaming) {
							this.$forceUpdate()
						}
					}, 50) // 每50ms强制更新一次
					
					this.openaiAPI.chatCompletionStream(
					messages,
					(chunk) => {
						if (chunk === '[DONE]') {
							this.isStreaming = false
							
							// 清除定时器
							if (this.streamUpdateTimer) {
								clearInterval(this.streamUpdateTimer)
								this.streamUpdateTimer = null
							}
							
							if (this.streamContent) {
								this.addMessage('assistant', this.streamContent)
								this.streamContent = ''
							}
							// 流式完成后确保滚动到底部
							this.scrollToBottom(true)
						} else {
							// 强制实时更新机制 - 方法1：直接赋值
							this.streamContent += chunk
							
							// 强制实时更新机制 - 方法2：强制触发响应式更新
							this.$forceUpdate()
							
							// 立即滚动
							this.$nextTick(() => {
								this.throttledScrollToBottom()
							})
							
							// 调试日志（随机输出）
							if (Math.random() < 0.1) {
								console.log('[UI] 流式内容更新:', this.streamContent.length + '字符')
							}
						}
					},
						(result) => {
							console.log('流式完成:', result)
						},
						(error) => {
							this.isStreaming = false
							
							// 清除定时器
							if (this.streamUpdateTimer) {
								clearInterval(this.streamUpdateTimer)
								this.streamUpdateTimer = null
							}
							
							this.streamContent = ''
							this.showError(error.error?.message || '发送失败')
						},
						{
							useHistory: this.enableHistory,
							enableFunctions: this.enableFunctions
						}
					)
				} else {
					// 非流式响应
					const result = await this.openaiAPI.chatCompletion(messages, {
						useHistory: this.enableHistory,
						enableFunctions: this.enableFunctions,
						autoFollowFunction: true
					})
					
					if (result.content) {
						this.addMessage('assistant', result.content)
						// 非流式回复完成后强制滚动到底部
						this.scrollToBottom(true)
					}
				}
				
			} catch (error) {
				console.error('发送消息失败:', error)
				this.showError(error.error?.message || error.message || '发送失败')
			} finally {
				this.loading = false
			}
		},
		
		// 添加消息到显示列表
		addMessage(role, content, functionCall = null) {
			const message = {
				role: role,
				content: content,
				timestamp: Date.now()
			}
			
			if (functionCall) {
				message.function_call = functionCall
			}
			
			this.messages.push(message)
			
			// 限制消息数量
			if (this.messages.length > this.maxMessages) {
				this.messages = this.messages.slice(-this.maxMessages)
			}
			
			// 触发事件
			this.$emit('message', message)
			
			// 新消息添加后，如果是用户消息则强制滚动，助手消息则普通滚动
			this.$nextTick(() => {
				if (role === 'user') {
					this.scrollToBottom(true) // 用户消息强制滚动
				} else {
					this.scrollToBottom(false) // 助手消息普通滚动
				}
			})
		},
		
		// 更新消息显示（从历史记录）
		updateMessages() {
			if (!this.enableHistory || !this.openaiAPI) return
			
			// 只在初始化或切换对话时完全更新消息列表
			// 在发送消息过程中不调用此方法，避免覆盖正在显示的消息
			const history = this.openaiAPI.getConversationHistory()
			// 过滤掉系统消息，只显示用户和助手的对话
			const filteredHistory = history.filter(msg => msg.role !== 'system')
			
			// 为历史消息添加时间戳（如果没有的话）
			this.messages = filteredHistory.map(msg => ({
				...msg,
				timestamp: msg.timestamp || Date.now()
			}))
			
			// 限制消息数量
			if (this.messages.length > this.maxMessages) {
				this.messages = this.messages.slice(-this.maxMessages)
			}
		},
		
		// 新建对话
		newConversation() {
			if (!this.enableHistory || !this.openaiAPI) return
			
			this.currentConversationId = this.openaiAPI.createConversation(null, this.systemPrompt)
			this.messages = []
			this.streamContent = ''
			this.isStreaming = false
			this.loading = false
			this.clearError()
			
			uni.showToast({
				title: '新对话已创建',
				icon: 'success'
			})
			
			this.$emit('conversation-created', this.currentConversationId)
		},
		
		// 清空对话
		clearConversation() {
			if (!this.enableHistory || !this.openaiAPI || !this.currentConversationId) return
			
			uni.showModal({
				title: '确认清空',
				content: '确定要清空当前对话吗？',
				success: (res) => {
					if (res.confirm) {
						this.openaiAPI.clearConversation(this.currentConversationId)
						this.messages = []
						this.clearError()
						
						uni.showToast({
							title: '对话已清空',
							icon: 'success'
						})
						
						this.$emit('conversation-cleared', this.currentConversationId)
					}
				}
			})
		},
		
		// 切换配置面板
		toggleConfig() {
			if (!this.showConfigPanel) return
			this.showConfig = !this.showConfig
		},
		
		// 保存配置
		saveConfig() {
			if (this.openaiAPI) {
				this.openaiAPI.updateConfig(this.config)
			}
			
			this.showConfig = false
			this.clearError()
			
			uni.showToast({
				title: '配置已保存',
				icon: 'success'
			})
			
			this.$emit('config-updated', this.config)
		},
		
		// 流式模式切换
		onStreamModeChange(e) {
			this.enableStream = e.detail.value.length > 0
		},
		
		// 函数调用模式切换
		onFunctionModeChange(e) {
			this.enableFunctions = e.detail.value.length > 0
		},
		
		// 显示错误
		showError(message) {
			this.errorMessage = message
			setTimeout(() => {
				this.clearError()
			}, 5000)
		},
		
		// 清除错误
		clearError() {
			this.errorMessage = ''
		},
		
		// 处理滚动事件
		onScroll(e) {
			const { scrollTop, scrollHeight, clientHeight } = e.detail
			const currentTime = Date.now()
			
			// 防抖处理，避免过于频繁的状态检测
			if (this.scrollDebounceTimer) {
				clearTimeout(this.scrollDebounceTimer)
			}
			
			this.scrollDebounceTimer = setTimeout(() => {
				this.handleScrollStateChange(scrollTop, scrollHeight, clientHeight, currentTime)
			}, 50)
			
			// 立即更新基础数据
			this.updateScrollMetrics(scrollTop, scrollHeight, clientHeight, currentTime)
		},
		
		// 处理滚动状态变化的核心逻辑
		handleScrollStateChange(scrollTop, scrollHeight, clientHeight, currentTime) {
			const scrollDelta = scrollTop - this.lastScrollTop
			const timeDelta = currentTime - this.lastScrollTime
			const isNearBottom = this.checkNearBottom(scrollTop, scrollHeight, clientHeight)
			const scrollSpeed = timeDelta > 0 ? Math.abs(scrollDelta) / timeDelta : 0
			
			console.log('滚动状态分析:', {
				scrollTop,
				scrollDelta,
				scrollSpeed: scrollSpeed.toFixed(2),
				isNearBottom,
				currentState: this.scrollState,
				isAutoScrolling: this.isAutoScrolling
			})
			
			// 如果正在自动滚动，不进行状态判断
			if (this.isAutoScrolling) {
				console.log('自动滚动进行中，跳过状态检测')
				return
			}
			
			// 状态机逻辑
			this.updateScrollState(scrollDelta, isNearBottom, scrollSpeed)
		},
		
		// 更新滚动状态机（简化版）
		updateScrollState(scrollDelta, isNearBottom, scrollSpeed) {
			const previousState = this.scrollState
			
			// 简化的状态逻辑：
			// 1. 在底部 = AUTO_FOLLOW
			// 2. 不在底部且向上滚动超过阈值 = USER_BROWSING
			// 3. 从浏览状态向下滚动 = RETURNING_TO_BOTTOM
			
			if (isNearBottom) {
				// 在底部，恢复自动跟随
				this.scrollState = 'AUTO_FOLLOW'
			} else if (scrollDelta < -15 && scrollSpeed > 0.3) {
				// 向上滚动超过15px且速度较快，进入浏览模式
				this.scrollState = 'USER_BROWSING'
			} else if (this.scrollState === 'USER_BROWSING' && scrollDelta > 5) {
				// 从浏览模式向下滚动，进入返回底部模式
				this.scrollState = 'RETURNING_TO_BOTTOM'
			}
			
			if (previousState !== this.scrollState) {
				console.log(`状态切换: ${previousState} → ${this.scrollState}`)
			}
		},
		
		// 更新滚动指标
		updateScrollMetrics(scrollTop, scrollHeight, clientHeight, currentTime) {
			// 计算滚动方向
			if (scrollTop > this.lastScrollTop) {
				this.scrollDirection = 1 // 向下
			} else if (scrollTop < this.lastScrollTop) {
				this.scrollDirection = -1 // 向上
			} else {
				this.scrollDirection = 0 // 无变化
			}
			
			this.lastScrollTop = scrollTop
			this.lastScrollTime = currentTime
		},
		
		// 检查是否接近底部
		checkNearBottom(scrollTop, scrollHeight, clientHeight) {
			return scrollTop + clientHeight >= scrollHeight - this.nearBottomThreshold
		},
		
		// 智能滚动到底部
		scrollToBottom(force = false) {
			// 检查是否应该执行自动滚动
			if (!force && this.scrollState !== 'AUTO_FOLLOW') {
				console.log(`滚动状态为 ${this.scrollState}，跳过自动滚动`)
				return
			}
			
			// 防止重复执行（除非是强制滚动）
			if (!force && this.isAutoScrolling) {
				console.log('自动滚动正在进行中，跳过重复调用')
				return
			}
			
			this.$nextTick(() => {
				this.performAutoScroll(force)
			})
		},
		
		// 执行自动滚动的核心逻辑
		performAutoScroll(forceScroll = false) {
			console.log('开始执行智能滚动到底部', { forceScroll })
			this.isAutoScrolling = true
			
			// 清除之前的定时器
			if (this.autoScrollTimer) {
				clearTimeout(this.autoScrollTimer)
			}
			
			const query = uni.createSelectorQuery().in(this)
			query.select('#messageScrollView').boundingClientRect()
			query.select('.message-container').boundingClientRect()
			query.exec((res) => {
				if (res && res[0] && res[1]) {
					const scrollViewHeight = res[0].height
					const contentHeight = res[1].height
					const currentScrollTop = this.scrollTop
					
					// 如果内容高度大于滚动视图高度，则滚动到底部
					if (contentHeight > scrollViewHeight) {
						const targetScrollTop = Math.max(0, contentHeight - scrollViewHeight)
						const scrollDifference = Math.abs(currentScrollTop - targetScrollTop)
						
						console.log('滚动诊断:', {
							scrollViewHeight,
							contentHeight,
							currentScrollTop,
							targetScrollTop,
							scrollDifference,
							forceScroll
						})
						
						// 如果已经在底部且不是强制滚动，跳过
						if (!forceScroll && scrollDifference < 10) {
							console.log('已在底部，跳过滚动')
							this.finishAutoScroll()
							return
						}
						
						// 使用平滑滚动策略
						this.smoothScrollTo(targetScrollTop)
					} else {
						console.log('内容高度不足，无需滚动')
						this.finishAutoScroll()
					}
				} else {
					console.warn('获取元素尺寸失败:', res)
					this.finishAutoScroll()
				}
			})
		},
		
		// 平滑滚动到指定位置
		smoothScrollTo(targetScrollTop) {
			console.log('设置滚动位置:', targetScrollTop)
			this.scrollTop = targetScrollTop
			
			// 设置完成定时器
			this.autoScrollTimer = setTimeout(() => {
				this.finishAutoScroll()
			}, 300) // 减少等待时间
		},
		
		// 完成自动滚动
		finishAutoScroll() {
			this.isAutoScrolling = false
			if (this.autoScrollTimer) {
				clearTimeout(this.autoScrollTimer)
				this.autoScrollTimer = null
			}
			console.log('自动滚动完成')
		},
		
		// 节流滚动到底部（用于流式回复）
		throttledScrollToBottom() {
			// 如果不在自动跟随状态，不执行滚动
			if (this.scrollState !== 'AUTO_FOLLOW') {
				return
			}
			
			const now = Date.now()
			
			// 节流控制：200ms内最多执行一次
			if (now - this.lastThrottleTime < 200) {
				return
			}
			
			// 检查内容高度是否显著增加
			const query = uni.createSelectorQuery().in(this)
			query.select('.message-container').boundingClientRect()
			query.exec((res) => {
				if (res && res[0]) {
					const currentHeight = res[0].height
					
					// 如果高度增加少于30px，不滚动
					if (this.lastContentHeight && currentHeight - this.lastContentHeight < 30) {
						return
					}
					
					this.lastContentHeight = currentHeight
					this.lastThrottleTime = now
					
					// 执行非强制滚动
					this.scrollToBottom(false)
				}
			})
		},
		
		// 获取头像文本
		getAvatarText(role) {
			const avatars = {
				user: '👤',
				assistant: '🤖',
				system: '⚙️',
				function: '🔧'
			}
			return avatars[role] || '❓'
		},
		
		// 格式化时间
		formatTime(timestamp) {
			if (!timestamp) return ''
			return new Date(timestamp).toLocaleTimeString('zh-CN')
		},
		
		// 公开方法：注册自定义函数
		registerFunction(name, description, parameters, handler) {
			if (this.openaiAPI) {
				this.openaiAPI.registerFunction(name, description, parameters, handler)
			}
		},
		
		// 公开方法：获取API实例
		getAPI() {
			return this.openaiAPI
		}
	}
}
</script>

<style scoped>
.openai-chat {
	position: relative;
	height: 100vh;
	display: flex;
	flex-direction: column;
	background: #f5f5f5;
}

/* 配置面板 */
.config-panel {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0,0,0,0.5);
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	padding: 20px;
	box-sizing: border-box;
}

.config-modal {
	background: white;
	border-radius: 12px;
	width: 100%;
	max-width: 380px;
	max-height: 85vh;
	min-height: 400px;
	display: flex;
	flex-direction: column;
	overflow: hidden;
	box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.config-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 12px 16px;
	border-bottom: 1px solid #f0f0f0;
	background: #f8f8f8;
	flex-shrink: 0;
}

.config-title {
	font-size: 16px;
	font-weight: 600;
	color: #333;
}

.config-close {
	width: 28px;
	height: 28px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	background: #f0f0f0;
	font-size: 18px;
	color: #666;
	cursor: pointer;
	transition: background 0.2s;
}

.config-close:hover {
	background: #e0e0e0;
}

.config-content {
	flex: 1;
	overflow-y: auto;
	padding: 0;
	min-height: 0;
}

.config-item {
	padding: 12px 16px;
	border-bottom: 1px solid #f0f0f0;
}

.config-item:last-child {
	border-bottom: none;
}

.config-label {
	font-size: 13px;
	color: #333;
	margin-bottom: 6px;
	display: block;
	font-weight: 500;
}

.config-input {
	width: 100%;
	padding: 10px 12px;
	border: 1px solid #ddd;
	border-radius: 6px;
	font-size: 15px;
	line-height: 1.4;
	box-sizing: border-box;
	background: #fafafa;
	height: 42px;
}

.config-input:focus {
	border-color: #007aff;
	background: white;
	outline: none;
}

.config-actions {
	display: flex;
	gap: 8px;
	padding: 12px 16px;
	background: #f8f8f8;
	flex-shrink: 0;
}

.config-btn {
	flex: 1;
	padding: 8px 12px;
	border: none;
	border-radius: 6px;
	font-size: 13px;
	cursor: pointer;
	transition: opacity 0.2s;
	height: 36px;
}

.config-btn:active {
	opacity: 0.8;
}

.save-btn {
	background: #007aff;
	color: white;
}

.cancel-btn {
	background: #f0f0f0;
	color: #333;
}

/* 聊天头部 */
.chat-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 10px 15px;
	background: #f8f8f8;
	border-bottom: 1px solid #e0e0e0;
	flex-shrink: 0;
}

.header-left {
	display: flex;
	align-items: center;
	gap: 10px;
	flex: 1;
	min-width: 0;
}

.chat-title {
	font-size: 16px;
	font-weight: 600;
	color: #333;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.conversation-info {
	font-size: 11px;
	color: #666;
	white-space: nowrap;
}

.header-actions {
	display: flex;
	gap: 6px;
	flex-shrink: 0;
}

.action-btn {
	padding: 6px 10px;
	background: #007aff;
	color: white;
	border: none;
	border-radius: 5px;
	font-size: 11px;
	cursor: pointer;
	white-space: nowrap;
	transition: opacity 0.2s;
}

.action-btn:active {
	opacity: 0.8;
}

.action-btn.secondary {
	background: #666;
}

.action-btn.danger {
	background: #ff3b30;
}

/* 消息列表 */
.message-list {
	flex: 1;
	padding: 10px;
	overflow-y: auto;
	min-height: 0;
	/* 安卓端需要固定高度才能正常滚动 */
	height: calc(100vh - 200px);
}

.message-container {
	min-height: 100%;
	display: flex;
	flex-direction: column;
}

.message-item {
	display: flex;
	margin-bottom: 15px;
	gap: 8px;
	max-width: 100%;
	align-items: flex-start;
}

.message-item.user {
	flex-direction: row-reverse;
	justify-content: flex-start;
}

.message-item.assistant {
	justify-content: flex-start;
}

.message-item.user .message-content {
	background: #007aff;
	color: white;
}

.message-item.assistant .message-content {
	background: white;
	color: #333;
}

.message-item.streaming .message-content {
	background: #f0f8ff;
	border: 1px solid #007aff;
}

.message-avatar {
	width: 32px;
	height: 32px;
	border-radius: 50%;
	background: #e0e0e0;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.avatar-text {
	font-size: 14px;
}

.message-content {
	max-width: calc(100% - 50px);
	padding: 8px 12px;
	border-radius: 12px;
	position: relative;
	word-wrap: break-word;
	overflow-wrap: break-word;
}

.message-text {
	line-height: 1.4;
	word-wrap: break-word;
	white-space: pre-wrap;
	font-size: 15px;
}

.function-call {
	margin-top: 8px;
	padding: 8px;
	background: rgba(0,0,0,0.05);
	border-radius: 6px;
}

.function-label {
	display: block;
	font-size: 12px;
	color: #666;
	margin-bottom: 4px;
}

.function-name {
	font-weight: bold;
	color: #333;
}

.message-time {
	font-size: 11px;
	color: #999;
	margin-top: 6px;
}

.cursor {
	color: #007aff;
	font-weight: bold;
}

.cursor.blink {
	animation: blink 1s infinite;
}

@keyframes blink {
	0%, 50% { opacity: 1; }
	51%, 100% { opacity: 0; }
}

/* 加载状态 */
.loading-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 20px;
	justify-content: center;
}

.loading-dots {
	display: flex;
	gap: 4px;
}

.loading-dots .dot {
	color: #007aff;
	animation: loading 1.4s infinite ease-in-out;
}

.loading-dots .dot:nth-child(1) { animation-delay: -0.32s; }
.loading-dots .dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes loading {
	0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
	40% { transform: scale(1); opacity: 1; }
}

.loading-text {
	color: #666;
	font-size: 14px;
}

/* 输入区域 */
.input-area {
	background: white;
	border-top: 1px solid #eee;
	padding: 15px 20px;
}

.input-options {
	display: flex;
	gap: 15px;
	margin-bottom: 8px;
	padding: 0 5px;
	flex-wrap: wrap;
}

.option-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 13px;
	color: #666;
	flex-shrink: 0;
}

.option-label {
	font-size: 13px;
	color: #666;
}

.input-row {
	display: flex;
	gap: 8px;
	align-items: flex-end;
}

.input-wrapper {
	flex: 1;
	min-width: 0;
}

.message-input {
	width: 100%;
	min-height: 36px;
	max-height: 100px;
	padding: 8px 12px;
	border: 1px solid #ddd;
	border-radius: 18px;
	font-size: 15px;
	resize: none;
	box-sizing: border-box;
}

.send-wrapper {
	flex-shrink: 0;
}

.send-btn {
	padding: 8px 16px;
	background: #007aff;
	color: white;
	border: none;
	border-radius: 18px;
	font-size: 14px;
	cursor: pointer;
	min-width: 60px;
	height: 36px;
	transition: all 0.3s ease;
}

.send-btn:disabled {
	background: #e0e0e0;
	color: #999;
	cursor: not-allowed;
	opacity: 0.6;
}

.send-btn:not(:disabled):active {
	transform: scale(0.95);
	background: #0056d3;
}

.send-btn:disabled {
	background: #ccc;
	cursor: not-allowed;
}

/* 错误提示 */
.error-toast {
	position: absolute;
	top: 80px;
	left: 20px;
	right: 20px;
	background: #ff4444;
	color: white;
	padding: 12px 16px;
	border-radius: 8px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	z-index: 999;
}

.error-text {
	flex: 1;
}

.error-close {
	font-size: 18px;
	cursor: pointer;
	margin-left: 10px;
}

/* 滚动锚点 */

</style>