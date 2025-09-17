<template>
	<view class="plugin-example">
		<!-- 使用 OpenAI Chat 组件 -->
		<openai-chat 
			ref="chatComponent"
			title="AI智能助手"
			:initial-config="chatConfig"
			system-prompt="你是一个智能助手，可以帮助用户解答问题、查询天气、进行数学计算等。当用户询问天气时，请使用 getWeather 函数；当用户需要数学计算时，请使用 calculate 函数；当用户询问时间时，请使用 getCurrentTime 函数。"
			:enable-history="true"
			:max-messages="100"
			@message="onMessage"
			@conversation-created="onConversationCreated"
			@conversation-cleared="onConversationCleared"
			@config-updated="onConfigUpdated"
		/>
		
		<!-- 功能说明浮层 -->
		<view v-if="showHelp" class="help-overlay" @click="toggleHelp">
			<view class="help-content" @click.stop>
				<view class="help-header">
					<text class="help-title">功能说明</text>
					<text class="help-close" @click="toggleHelp">×</text>
				</view>
				<scroll-view class="help-body" scroll-y>
					<view class="help-section">
						<text class="help-section-title">🔧 配置说明</text>
						<text class="help-text">• 点击右上角齿轮图标进入配置面板</text>
						<text class="help-text">• 设置您的 API Key 和服务地址</text>
						<text class="help-text">• 支持 OpenAI、DeepSeek 等多种服务商</text>
					</view>
					
					<view class="help-section">
						<text class="help-section-title">💬 聊天功能</text>
						<text class="help-text">• 支持流式和非流式响应模式</text>
						<text class="help-text">• 自动保存和管理对话历史</text>
						<text class="help-text">• 可创建多个独立对话</text>
					</view>
					
					<view class="help-section">
						<text class="help-section-title">🚀 高级功能</text>
						<text class="help-text">• 函数调用：AI 可以调用预定义的函数</text>
						<text class="help-text">• 天气查询：询问"北京天气如何？"</text>
						<text class="help-text">• 数学计算：询问"123+456等于多少？"</text>
						<text class="help-text">• 时间查询：询问"现在几点了？"</text>
					</view>
					
					<view class="help-section">
						<text class="help-section-title">🎯 测试建议</text>
						<text class="help-text">• "你好，请介绍一下你的功能"</text>
						<text class="help-text">• "请帮我查询北京的天气"</text>
						<text class="help-text">• "计算 123 * 456 + 789"</text>
						<text class="help-text">• "现在是什么时间？"</text>
						<text class="help-text">• "生成一个1到100的随机数"</text>
					</view>
				</scroll-view>
			</view>
		</view>
		
		<!-- 帮助按钮 -->
		<view class="help-btn" @click="toggleHelp">
			<text class="help-btn-text">💡</text>
		</view>
	</view>
</template>

<script>
// 导入 OpenAI Chat 组件
import OpenAIChat from '@/uni_modules/openai-chat/components/openai-chat/openai-chat.vue'

export default {
	name: 'PluginExample',
	components: {
		OpenAIChat
	},
	
	data() {
		return {
			// 聊天配置
			chatConfig: {
				baseUrl: 'https://api.deepseek.com/v1',
				apiKey: 'sk-REMOVED', // 用户需要在配置面板中设置
				model: 'deepseek-chat',
				timeout: 30000
			},
			
			// UI 状态
			showHelp: false
		}
	},
	
	mounted() {
		// 等待组件加载完成后注册自定义函数
		this.$nextTick(() => {
			setTimeout(() => {
				this.registerCustomFunctions()
			}, 500)
		})
		
		// 显示使用提示
		uni.showToast({
			title: '点击右下角?查看使用说明',
			icon: 'none',
			duration: 3000
		})
	},
	
	methods: {
		// 注册自定义函数
		registerCustomFunctions() {
			if (!this.$refs.chatComponent) {
				console.log('聊天组件未准备就绪')
				return
			}
			
			console.log('开始注册自定义函数')
			
			// 注册天气查询函数
			this.$refs.chatComponent.registerFunction(
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
			this.$refs.chatComponent.registerFunction(
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
			this.$refs.chatComponent.registerFunction(
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
						appVersion: systemInfo.version,
						uniVersion: systemInfo.uniRuntimeVersion
					}
				}
			)
			
			console.log('自定义函数注册完成')
		},
		
		// 处理天气查询
		handleWeatherQuery(args) {
			console.log('天气查询参数:', args)
			
			// 模拟天气数据
			const weatherData = {
				'北京': { temp: 15, weather: '晴天', humidity: 45, wind: '北风3级' },
				'上海': { temp: 20, weather: '多云', humidity: 60, wind: '东南风2级' },
				'广州': { temp: 25, weather: '小雨', humidity: 75, wind: '南风1级' },
				'深圳': { temp: 26, weather: '晴天', humidity: 55, wind: '东风2级' },
				'杭州': { temp: 18, weather: '阴天', humidity: 65, wind: '西北风2级' },
				'成都': { temp: 22, weather: '多云', humidity: 70, wind: '无风' },
				'重庆': { temp: 24, weather: '雾', humidity: 80, wind: '东北风1级' },
				'西安': { temp: 16, weather: '晴天', humidity: 40, wind: '西风3级' },
				'南京': { temp: 19, weather: '小雨', humidity: 68, wind: '东南风2级' },
				'武汉': { temp: 21, weather: '多云', humidity: 62, wind: '南风2级' }
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
					wind: weatherData[city].wind,
					updateTime: new Date().toLocaleString('zh-CN'),
					success: true,
					message: `${city}当前天气：${weatherData[city].weather}，温度${temp}°${unit === 'celsius' ? 'C' : 'F'}，湿度${weatherData[city].humidity}%，${weatherData[city].wind}`
				}
			} else {
				return {
					city: city,
					error: '暂不支持该城市的天气查询',
					supportedCities: Object.keys(weatherData),
					success: false,
					message: `抱歉，暂不支持${city}的天气查询。支持的城市有：${Object.keys(weatherData).join('、')}`
				}
			}
		},
		
		// 切换帮助显示
		toggleHelp() {
			this.showHelp = !this.showHelp
		},
		
		// 消息事件处理
		onMessage(message) {
			console.log('新消息:', message)
		},
		
		// 对话创建事件
		onConversationCreated(conversationId) {
			console.log('新对话创建:', conversationId)
		},
		
		// 对话清空事件
		onConversationCleared(conversationId) {
			console.log('对话已清空:', conversationId)
		},
		
		// 配置更新事件
		onConfigUpdated(config) {
			console.log('配置已更新:', config)
		}
	}
}
</script>

<style scoped>
.plugin-example {
	height: 100vh;
	position: relative;
	background: #f5f5f5;
}

/* 帮助按钮 */
.help-btn {
	position: fixed;
	bottom: 120px;
	right: 20px;
	width: 45px;
	height: 45px;
	background: #FF9500;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 3px 10px rgba(255,149,0,0.3);
	z-index: 998;
}

.help-btn-text {
	font-size: 20px;
}

/* 帮助浮层 */
.help-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0,0,0,0.5);
	z-index: 1000;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 20px;
}

.help-content {
	background: white;
	border-radius: 12px;
	width: 100%;
	max-width: 500px;
	max-height: 80vh;
	overflow: hidden;
	display: flex;
	flex-direction: column;
}

.help-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px;
	border-bottom: 1px solid #eee;
}

.help-title {
	font-size: 18px;
	font-weight: bold;
	color: #333;
}

.help-close {
	font-size: 24px;
	color: #999;
	cursor: pointer;
	width: 30px;
	height: 30px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.help-body {
	flex: 1;
	padding: 20px;
	max-height: 60vh;
}

.help-section {
	margin-bottom: 24px;
}

.help-section-title {
	font-size: 16px;
	font-weight: bold;
	color: #333;
	display: block;
	margin-bottom: 12px;
}

.help-text {
	font-size: 14px;
	color: #666;
	line-height: 1.6;
	display: block;
	margin-bottom: 8px;
	padding-left: 16px;
}

/* 响应式设计 */
@media (max-width: 600px) {
	.help-overlay {
		padding: 10px;
	}
	
	.help-content {
		max-height: 90vh;
	}
	
	.help-body {
		max-height: 70vh;
	}
}
</style>