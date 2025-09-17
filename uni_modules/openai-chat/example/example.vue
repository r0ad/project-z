<template>
	<view class="example-container">
		<!-- 基础使用示例 -->
		<view class="example-section">
			<view class="section-title">基础使用示例</view>
			<openai-chat 
				title="基础AI助手"
				:initial-config="basicConfig"
				system-prompt="你是一个友好的AI助手，可以帮助用户解答各种问题。"
				@message="onBasicMessage"
			/>
		</view>
		
		<!-- 高级功能示例 -->
		<view class="example-section">
			<view class="section-title">高级功能示例</view>
			<openai-chat 
				ref="advancedChat"
				title="智能客服助手"
				:initial-config="advancedConfig"
				system-prompt="你是一个专业的客服助手，可以帮助用户查询天气、计算数学问题、获取时间等。当用户询问天气时，请使用 getWeather 函数。"
				:enable-history="true"
				:max-messages="50"
				@message="onAdvancedMessage"
				@conversation-created="onConversationCreated"
				@config-updated="onConfigUpdated"
			/>
		</view>
		
		<!-- 配置说明 -->
		<view class="config-info">
			<view class="info-title">配置说明</view>
			<view class="info-content">
				<text class="info-text">• 请在组件的配置面板中设置您的 API Key</text>
				<text class="info-text">• 支持 OpenAI、DeepSeek 等多种 API 提供商</text>
				<text class="info-text">• 高级示例包含自定义天气查询函数</text>
				<text class="info-text">• 可以通过流式响应和函数调用选项体验不同功能</text>
			</view>
		</view>
		
		<!-- 功能演示按钮 -->
		<view class="demo-buttons">
			<button @click="testWeatherFunction" class="demo-btn">测试天气查询</button>
			<button @click="testCalculation" class="demo-btn">测试数学计算</button>
			<button @click="testTimeQuery" class="demo-btn">测试时间查询</button>
			<button @click="exportConversation" class="demo-btn">导出对话</button>
		</view>
	</view>
</template>

<script>
// 导入聊天组件
import OpenAIChat from '../components/openai-chat/openai-chat.vue'

export default {
	name: 'OpenAIChatExample',
	components: {
		OpenAIChat
	},
	
	data() {
		return {
			// 基础配置
			basicConfig: {
				baseUrl: 'https://api.deepseek.com/v1',
				apiKey: '', // 用户需要自己配置
				model: 'deepseek-chat',
				timeout: 30000
			},
			
			// 高级配置
			advancedConfig: {
				baseUrl: 'https://api.deepseek.com/v1',
				apiKey: '', // 用户需要自己配置
				model: 'deepseek-chat',
				timeout: 30000
			}
		}
	},
	
	mounted() {
		// 注册自定义函数
		this.$nextTick(() => {
			this.registerCustomFunctions()
		})
	},
	
	methods: {
		// 注册自定义函数
		registerCustomFunctions() {
			if (!this.$refs.advancedChat) return
			
			// 注册天气查询函数
			this.$refs.advancedChat.registerFunction(
				'getWeather',
				'查询指定城市的天气信息',
				{
					type: 'object',
					properties: {
						city: {
							type: 'string',
							description: '要查询天气的城市名称'
						},
						unit: {
							type: 'string',
							description: '温度单位',
							enum: ['celsius', 'fahrenheit'],
							default: 'celsius'
						}
					},
					required: ['city']
				},
				this.handleWeatherQuery
			)
			
			// 注册随机数生成函数
			this.$refs.advancedChat.registerFunction(
				'generateRandomNumber',
				'生成指定范围内的随机数',
				{
					type: 'object',
					properties: {
						min: {
							type: 'number',
							description: '最小值',
							default: 1
						},
						max: {
							type: 'number',
							description: '最大值',
							default: 100
						}
					},
					required: []
				},
				(args) => {
					const min = args.min || 1
					const max = args.max || 100
					const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min
					return {
						number: randomNumber,
						range: `${min}-${max}`,
						message: `生成的随机数是: ${randomNumber}`
					}
				}
			)
			
			// 注册系统信息查询函数
			this.$refs.advancedChat.registerFunction(
				'getSystemInfo',
				'获取当前系统和应用信息',
				{
					type: 'object',
					properties: {},
					required: []
				},
				() => {
					const systemInfo = uni.getSystemInfoSync()
					return {
						platform: systemInfo.platform,
						system: systemInfo.system,
						model: systemInfo.model,
						screenWidth: systemInfo.screenWidth,
						screenHeight: systemInfo.screenHeight,
						appVersion: systemInfo.version
					}
				}
			)
		},
		
		// 处理天气查询
		handleWeatherQuery(args) {
			// 模拟天气数据
			const weatherData = {
				'北京': { temp: 15, weather: '晴天', humidity: 45 },
				'上海': { temp: 20, weather: '多云', humidity: 60 },
				'广州': { temp: 25, weather: '小雨', humidity: 75 },
				'深圳': { temp: 26, weather: '晴天', humidity: 55 },
				'杭州': { temp: 18, weather: '阴天', humidity: 65 }
			}
			
			const city = args.city
			const unit = args.unit || 'celsius'
			
			if (weatherData[city]) {
				let temp = weatherData[city].temp
				if (unit === 'fahrenheit') {
					temp = Math.round(temp * 9/5 + 32)
				}
				
				return {
					city: city,
					temperature: `${temp}°${unit === 'celsius' ? 'C' : 'F'}`,
					weather: weatherData[city].weather,
					humidity: `${weatherData[city].humidity}%`,
					updateTime: new Date().toLocaleString('zh-CN'),
					success: true
				}
			} else {
				return {
					city: city,
					error: '暂不支持该城市的天气查询',
					supportedCities: Object.keys(weatherData),
					success: false
				}
			}
		},
		
		// 基础消息事件
		onBasicMessage(message) {
			console.log('基础聊天消息:', message)
		},
		
		// 高级消息事件
		onAdvancedMessage(message) {
			console.log('高级聊天消息:', message)
		},
		
		// 对话创建事件
		onConversationCreated(conversationId) {
			console.log('新对话创建:', conversationId)
			uni.showToast({
				title: '新对话已创建',
				icon: 'success'
			})
		},
		
		// 配置更新事件
		onConfigUpdated(config) {
			console.log('配置已更新:', config)
		},
		
		// 测试天气查询
		testWeatherFunction() {
			if (!this.$refs.advancedChat) {
				uni.showToast({ title: '请等待组件加载完成', icon: 'none' })
				return
			}
			
			// 模拟用户输入
			const testMessage = '请帮我查询一下北京的天气'
			this.simulateUserInput(testMessage)
		},
		
		// 测试数学计算
		testCalculation() {
			const testMessage = '请帮我计算 123 + 456 * 2'
			this.simulateUserInput(testMessage)
		},
		
		// 测试时间查询
		testTimeQuery() {
			const testMessage = '现在几点了？'
			this.simulateUserInput(testMessage)
		},
		
		// 模拟用户输入
		simulateUserInput(message) {
			uni.showModal({
				title: '功能演示',
				content: `将发送测试消息: "${message}"`,
				success: (res) => {
					if (res.confirm) {
						// 这里可以通过组件的方法发送消息
						// 由于组件没有暴露发送消息的方法，这里只是演示
						uni.showToast({
							title: '请在聊天框中输入该消息',
							icon: 'none',
							duration: 3000
						})
					}
				}
			})
		},
		
		// 导出对话
		exportConversation() {
			if (!this.$refs.advancedChat) {
				uni.showToast({ title: '请等待组件加载完成', icon: 'none' })
				return
			}
			
			const api = this.$refs.advancedChat.getAPI()
			if (api) {
				const conversation = api.exportConversation()
				console.log('导出的对话:', conversation)
				
				uni.showModal({
					title: '对话导出',
					content: `对话已导出到控制台，包含 ${conversation.messages.length} 条消息`,
					showCancel: false
				})
			}
		}
	}
}
</script>

<style scoped>
.example-container {
	padding: 20px;
	background: #f5f5f5;
	min-height: 100vh;
}

.example-section {
	margin-bottom: 30px;
	background: white;
	border-radius: 10px;
	overflow: hidden;
	box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.section-title {
	padding: 15px 20px;
	background: #007aff;
	color: white;
	font-size: 16px;
	font-weight: bold;
}

.config-info {
	background: white;
	border-radius: 10px;
	padding: 20px;
	margin-bottom: 20px;
	box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.info-title {
	font-size: 16px;
	font-weight: bold;
	color: #333;
	margin-bottom: 15px;
}

.info-content {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.info-text {
	color: #666;
	font-size: 14px;
	line-height: 1.5;
}

.demo-buttons {
	display: flex;
	flex-wrap: wrap;
	gap: 10px;
	padding: 20px;
	background: white;
	border-radius: 10px;
	box-shadow: 0 2px 10px rgba(0,0,0,0.1);
}

.demo-btn {
	flex: 1;
	min-width: 120px;
	padding: 12px 16px;
	background: #4CAF50;
	color: white;
	border: none;
	border-radius: 6px;
	font-size: 14px;
	cursor: pointer;
}

.demo-btn:active {
	background: #45a049;
}

/* 响应式设计 */
@media (max-width: 600px) {
	.demo-buttons {
		flex-direction: column;
	}
	
	.demo-btn {
		min-width: auto;
	}
}
</style>