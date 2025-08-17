/**
 * OpenAI API 工具类
 * 使用 uni.request 实现跨平台兼容的 OpenAI API 调用
 * 支持功能：
 * - 基础聊天完成（流式/非流式）
 * - 历史对话管理
 * - 函数调用（Function Calling）
 * - 图像生成
 * - 文本嵌入
 * - 语音转文字
 */

class OpenAIAPI {
	constructor(config = {}) {
		// 基础配置
		this.config = {
			baseUrl: config.baseUrl || 'https://api.openai.com/v1',
			apiKey: config.apiKey || '',
			model: config.model || 'gpt-3.5-turbo',
			timeout: config.timeout || 30000,
			...config
		}
		
		// 历史对话管理
		this.conversations = new Map() // 存储所有对话
		this.currentConversationId = null // 当前对话ID
		this.maxHistoryLength = config.maxHistoryLength || 50 // 最大历史记录长度
		
		// 函数调用管理
		this.functions = new Map() // 存储注册的函数
		this.autoFollowFunction = config.autoFollowFunction !== false // 是否自动跟进函数调用
	}
	
	/**
	 * 更新配置
	 * @param {Object} newConfig 新配置
	 */
	updateConfig(newConfig) {
		this.config = { ...this.config, ...newConfig }
		console.log('[OpenAI API] 配置已更新:', this.config)
	}
	
	/**
	 * 非流式聊天完成
	 * @param {Array} messages 消息数组
	 * @param {Object} options 选项
	 * @returns {Promise} 返回Promise
	 */
	chatCompletion(messages, options = {}) {
		return new Promise((resolve, reject) => {
			console.log('[OpenAI API] 开始非流式聊天完成')
			console.log('[OpenAI API] 消息:', messages)
			console.log('[OpenAI API] 选项:', options)
			
			// 合并历史对话
			let finalMessages = messages
			if (options.useHistory && this.currentConversationId) {
				const history = this.getConversationHistory()
				// 排除最后的用户消息，避免重复
				const historyWithoutLast = history.slice(0, -1)
				finalMessages = [...historyWithoutLast, ...messages]
				console.log('[OpenAI API] 合并历史对话后的消息:', finalMessages)
			}
			
			// 构建请求数据
			const requestData = {
				model: this.config.model,
				messages: finalMessages,
				stream: false
			}
			
			// 添加函数调用支持
			if (options.enableFunctions && this.functions.size > 0) {
				requestData.functions = this.getFunctionDefinitions()
				requestData.function_call = 'auto'
				console.log('[OpenAI API] 启用函数调用，可用函数:', requestData.functions)
			}
			
			console.log('[OpenAI API] 请求数据:', requestData)
			
			uni.request({
				url: `${this.config.baseUrl}/chat/completions`,
				method: 'POST',
				header: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.config.apiKey}`
				},
				data: requestData,
				timeout: this.config.timeout,
				success: (response) => {
					console.log('[OpenAI API] 收到响应:', response)
					
					if (response.statusCode === 200 && response.data) {
						const result = response.data
						
						if (result.choices && result.choices.length > 0) {
							const choice = result.choices[0]
							const message = choice.message
							
							// 保存用户消息到历史
							if (options.useHistory && this.currentConversationId) {
								messages.forEach(msg => {
									this.addMessageToHistory(msg.role, msg.content, msg.function_call)
								})
							}
							
							// 处理函数调用
							if (message.function_call && options.enableFunctions) {
								console.log('[OpenAI API] 检测到函数调用:', message.function_call)
								
								// 保存助手消息（包含函数调用）
								if (options.useHistory && this.currentConversationId) {
									this.addMessageToHistory('assistant', message.content || '', message.function_call)
								}
								
								try {
									// 执行函数
									const functionResult = this.executeFunction(
										message.function_call.name,
										JSON.parse(message.function_call.arguments)
									)
									
									console.log('[OpenAI API] 函数执行结果:', functionResult)
									
									// 保存函数结果到历史
									if (options.useHistory && this.currentConversationId) {
										this.addMessageToHistory('function', JSON.stringify(functionResult), null, message.function_call.name)
									}
									
									// 如果启用自动跟进，继续对话获取最终回复
									if (this.autoFollowFunction && options.autoFollowFunction !== false) {
										const followUpMessages = [{
											role: 'function',
											name: message.function_call.name,
											content: JSON.stringify(functionResult)
										}]
										
										// 递归调用获取最终回复
										this.chatCompletion(followUpMessages, {
											...options,
											enableFunctions: false // 避免无限递归
										}).then(resolve).catch(reject)
										return
									}
									
								} catch (error) {
									console.error('[OpenAI API] 函数执行失败:', error)
									reject({
										error: { message: `函数执行失败: ${error.message}` },
										response: response
									})
									return
								}
							}
							
							// 保存助手回复到历史
							if (options.useHistory && this.currentConversationId && message.content) {
								this.addMessageToHistory('assistant', message.content)
							}
							
							resolve({
								content: message.content || '',
								function_call: message.function_call,
								usage: result.usage,
								model: result.model
							})
						} else {
							console.error('[OpenAI API] 响应格式错误:', result)
							reject({
								error: { message: '响应格式错误' },
								response: response
							})
						}
					} else {
						console.error('[OpenAI API] HTTP错误:', response)
						reject({
							error: response.data || { message: `HTTP ${response.statusCode}` },
							response: response
						})
					}
				},
				fail: (error) => {
					console.error('[OpenAI API] 请求失败:', error)
					reject({
						error: { message: error.errMsg || '网络请求失败' },
						originalError: error
					})
				}
			})
		})
	}
	
	/**
	 * 流式聊天完成（模拟实现）
	 * @param {Array} messages 消息数组
	 * @param {Function} onData 数据回调
	 * @param {Function} onComplete 完成回调
	 * @param {Function} onError 错误回调
	 * @param {Object} options 选项
	 */
	chatCompletionStream(messages, onData, onComplete, onError, options = {}) {
		console.log('[OpenAI API] 开始流式聊天完成（模拟）')
		console.log('[OpenAI API] 消息:', messages)
		console.log('[OpenAI API] 选项:', options)
		
		// 处理历史对话
		let finalMessages = messages
		if (options.useHistory && this.currentConversationId) {
			const history = this.getConversationHistory()
			console.log('[OpenAI API] 当前历史对话:', history)
			
			// 合并历史消息和新消息，避免重复
			const historyWithoutLast = history.slice(0, -1)
			finalMessages = [...historyWithoutLast, ...messages]
			console.log('[OpenAI API] 合并历史对话后的消息:', finalMessages)
		}
		
		// 构建请求数据
		const requestData = {
			model: this.config.model,
			messages: finalMessages,
			stream: false
		}
		
		// 添加函数调用支持
		if (options.enableFunctions && this.functions.size > 0) {
			requestData.functions = this.getFunctionDefinitions()
			requestData.function_call = 'auto'
			console.log('[OpenAI API] 启用函数调用，可用函数:', requestData.functions)
		}
		console.log('[OpenAI API] 流式模拟 - 请求完整报文:', requestData)
		
		// 使用uni.request进行流式请求（模拟实现）
		uni.request({
			url: `${this.config.baseUrl}/chat/completions`,
			method: 'POST',
			header: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${this.config.apiKey}`
			},
			data: requestData,
			timeout: this.config.timeout,
			success: (response) => {
				console.log('[OpenAI API] 流式响应 - 收到完整响应:', response)
				
				if (response.statusCode === 200 && response.data) {
					const result = response.data
					
					if (result.choices && result.choices.length > 0) {
						const choice = result.choices[0]
						const message = choice.message
						const content = message.content || ''
						console.log('[OpenAI API] 流式模拟 - 开始分块发送内容:', content)
						
						// 保存用户消息到历史
						if (options.useHistory && this.currentConversationId) {
							messages.forEach(msg => {
								this.addMessageToHistory(msg.role, msg.content, msg.function_call)
							})
							// 保存助手回复到历史
							this.addMessageToHistory('assistant', content, message.function_call)
						}
						
						// 将内容按词分割，模拟流式发送
						const words = content.split('')
						let index = 0
						
						const sendNextChunk = () => {
							if (index < words.length) {
								const chunk = words[index]
								
								try {
									if (typeof onData === 'function') {
										onData(chunk)
									}
								} catch (error) {
									console.error('[OpenAI API] 流式模拟 - onData回调执行错误:', error)
								}
								
								index++
								setTimeout(sendNextChunk, 20) // 20ms间隔，更快的流式效果
							} else {
								console.log('[OpenAI API] 流式模拟 - 发送完成')
								
								// 发送结束标记
								try {
									if (typeof onData === 'function') {
										onData('[DONE]')
									}
								} catch (error) {
									console.error('[OpenAI API] 流式模拟 - onData结束回调执行错误:', error)
								}
								
								// 调用完成回调
								try {
									if (typeof onComplete === 'function') {
										onComplete({
											content: content,
											usage: result.usage,
											model: result.model
										})
									}
								} catch (error) {
									console.error('[OpenAI API] 流式模拟 - onComplete回调执行错误:', error)
								}
							}
						}
						
						sendNextChunk()
					} else {
						console.error('[OpenAI API] 流式模拟 - 响应格式错误:', result)
						if (typeof onError === 'function') {
							onError({
								error: { message: '响应格式错误' },
								response: response
							})
						}
					}
				} else {
					console.error('[OpenAI API] 流式模拟 - HTTP错误:', response)
					if (typeof onError === 'function') {
						onError({
							error: response.data || { message: `HTTP ${response.statusCode}` },
							response: response
						})
					}
				}
			},
			fail: (error) => {
				console.error('[OpenAI API] 流式模拟 - 请求失败:', error)
				if (typeof onError === 'function') {
					onError({
						error: { message: error.errMsg || '网络请求失败' },
						originalError: error
					})
				}
			}
		})
	}
	
	// ==================== 历史对话管理 ====================
	
	/**
	 * 创建新对话
	 * @param {String} conversationId 对话ID，如果不提供则自动生成
	 * @param {String} systemMessage 系统消息
	 * @returns {String} 对话ID
	 */
	createConversation(conversationId = null, systemMessage = null) {
		const id = conversationId || `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
		
		const conversation = {
			id: id,
			messages: [],
			createdAt: Date.now(),
			updatedAt: Date.now()
		}
		
		// 添加系统消息
		if (systemMessage) {
			conversation.messages.push({
				role: 'system',
				content: systemMessage,
				timestamp: Date.now()
			})
		}
		
		this.conversations.set(id, conversation)
		this.currentConversationId = id
		
		console.log('[OpenAI API] 创建新对话:', id)
		return id
	}
	
	/**
	 * 切换到指定对话
	 * @param {String} conversationId 对话ID
	 * @returns {Boolean} 是否切换成功
	 */
	switchConversation(conversationId) {
		if (this.conversations.has(conversationId)) {
			this.currentConversationId = conversationId
			console.log('[OpenAI API] 切换到对话:', conversationId)
			return true
		}
		console.warn('[OpenAI API] 对话不存在:', conversationId)
		return false
	}
	
	/**
	 * 获取当前对话历史
	 * @returns {Array} 消息数组
	 */
	getConversationHistory() {
		if (!this.currentConversationId) {
			return []
		}
		
		const conversation = this.conversations.get(this.currentConversationId)
		return conversation ? conversation.messages : []
	}
	
	/**
	 * 添加消息到当前对话历史
	 * @param {String} role 角色
	 * @param {String} content 内容
	 * @param {Object} functionCall 函数调用信息
	 * @param {String} functionName 函数名（用于function角色）
	 */
	addMessageToHistory(role, content, functionCall = null, functionName = null) {
		if (!this.currentConversationId) {
			console.warn('[OpenAI API] 没有当前对话，无法添加消息')
			return
		}
		
		const conversation = this.conversations.get(this.currentConversationId)
		if (!conversation) {
			console.warn('[OpenAI API] 当前对话不存在')
			return
		}
		
		const message = {
			role: role,
			content: content,
			timestamp: Date.now()
		}
		
		if (functionCall) {
			message.function_call = functionCall
		}
		
		if (functionName) {
			message.name = functionName
		}
		
		conversation.messages.push(message)
		conversation.updatedAt = Date.now()
		
		// 限制历史长度
		if (conversation.messages.length > this.maxHistoryLength) {
			// 保留系统消息，删除最旧的用户/助手消息
			const systemMessages = conversation.messages.filter(msg => msg.role === 'system')
			const otherMessages = conversation.messages.filter(msg => msg.role !== 'system')
			
			const keepCount = this.maxHistoryLength - systemMessages.length
			const keptMessages = otherMessages.slice(-keepCount)
			
			conversation.messages = [...systemMessages, ...keptMessages]
		}
		
		console.log('[OpenAI API] 添加消息到历史:', message)
	}
	
	/**
	 * 清空当前对话
	 */
	clearConversation(conversationId = null) {
		const id = conversationId || this.currentConversationId
		if (!id) return
		
		const conversation = this.conversations.get(id)
		if (conversation) {
			// 保留系统消息
			const systemMessages = conversation.messages.filter(msg => msg.role === 'system')
			conversation.messages = systemMessages
			conversation.updatedAt = Date.now()
			console.log('[OpenAI API] 清空对话:', id)
		}
	}
	
	/**
	 * 删除对话
	 * @param {String} conversationId 对话ID
	 */
	deleteConversation(conversationId) {
		if (this.conversations.has(conversationId)) {
			this.conversations.delete(conversationId)
			if (this.currentConversationId === conversationId) {
				this.currentConversationId = null
			}
			console.log('[OpenAI API] 删除对话:', conversationId)
			return true
		}
		return false
	}
	
	/**
	 * 获取对话列表
	 * @returns {Array} 对话列表
	 */
	getConversationList() {
		return Array.from(this.conversations.values()).map(conv => ({
			id: conv.id,
			messageCount: conv.messages.length,
			createdAt: conv.createdAt,
			updatedAt: conv.updatedAt,
			lastMessage: conv.messages.length > 0 ? 
				conv.messages[conv.messages.length - 1].content.substring(0, 50) + '...' : 
				'暂无消息'
		})).sort((a, b) => b.updatedAt - a.updatedAt)
	}
	
	// ==================== 函数调用管理 ====================
	
	/**
	 * 注册函数
	 * @param {String} name 函数名
	 * @param {String} description 函数描述
	 * @param {Object} parameters 参数定义（JSON Schema格式）
	 * @param {Function} handler 函数处理器
	 */
	registerFunction(name, description, parameters, handler) {
		this.functions.set(name, {
			name: name,
			description: description,
			parameters: parameters,
			handler: handler
		})
		console.log('[OpenAI API] 注册函数:', name)
	}
	
	/**
	 * 获取函数定义列表
	 * @returns {Array} 函数定义数组
	 */
	getFunctionDefinitions() {
		return Array.from(this.functions.values()).map(func => ({
			name: func.name,
			description: func.description,
			parameters: func.parameters
		}))
	}
	
	/**
	 * 执行函数
	 * @param {String} name 函数名
	 * @param {Object} args 参数
	 * @returns {Any} 函数执行结果
	 */
	executeFunction(name, args) {
		const func = this.functions.get(name)
		if (!func) {
			throw new Error(`函数不存在: ${name}`)
		}
		
		console.log(`[OpenAI API] 执行函数 ${name}:`, args)
		return func.handler(args)
	}
	
	// ==================== 其他功能 ====================
	
	/**
	 * 图像生成
	 * @param {String} prompt 提示词
	 * @param {Object} options 选项
	 * @returns {Promise} 返回Promise
	 */
	generateImage(prompt, options = {}) {
		return new Promise((resolve, reject) => {
			uni.request({
				url: `${this.config.baseUrl}/images/generations`,
				method: 'POST',
				header: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.config.apiKey}`
				},
				data: {
					prompt: prompt,
					n: options.n || 1,
					size: options.size || '1024x1024',
					...options
				},
				timeout: this.config.timeout,
				success: (response) => {
					if (response.statusCode === 200) {
						resolve(response.data)
					} else {
						reject({ error: response.data, response })
					}
				},
				fail: reject
			})
		})
	}
	
	/**
	 * 文本嵌入
	 * @param {String|Array} input 输入文本
	 * @param {Object} options 选项
	 * @returns {Promise} 返回Promise
	 */
	createEmbedding(input, options = {}) {
		return new Promise((resolve, reject) => {
			uni.request({
				url: `${this.config.baseUrl}/embeddings`,
				method: 'POST',
				header: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${this.config.apiKey}`
				},
				data: {
					input: input,
					model: options.model || 'text-embedding-ada-002',
					...options
				},
				timeout: this.config.timeout,
				success: (response) => {
					if (response.statusCode === 200) {
						resolve(response.data)
					} else {
						reject({ error: response.data, response })
					}
				},
				fail: reject
			})
		})
	}
	
	/**
	 * 语音转文字
	 * @param {String} audioFile 音频文件路径
	 * @param {Object} options 选项
	 * @returns {Promise} 返回Promise
	 */
	transcribeAudio(audioFile, options = {}) {
		return new Promise((resolve, reject) => {
			uni.uploadFile({
				url: `${this.config.baseUrl}/audio/transcriptions`,
				filePath: audioFile,
				name: 'file',
				header: {
					'Authorization': `Bearer ${this.config.apiKey}`
				},
				formData: {
					model: options.model || 'whisper-1',
					...options
				},
				success: (response) => {
					if (response.statusCode === 200) {
						try {
							const data = JSON.parse(response.data)
							resolve(data)
						} catch (e) {
							resolve({ text: response.data })
						}
					} else {
						reject({ error: response.data, response })
					}
				},
				fail: reject
			})
		})
	}
	
	/**
	 * 估算Token数量（简单实现）
	 * @param {String} text 文本
	 * @returns {Number} 估算的Token数量
	 */
	estimateTokens(text) {
		// 简单估算：英文约4个字符=1个token，中文约1.5个字符=1个token
		const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
		const otherChars = text.length - chineseChars
		return Math.ceil(chineseChars / 1.5 + otherChars / 4)
	}
	
	/**
	 * 导出对话数据
	 * @param {String} conversationId 对话ID
	 * @returns {Object} 对话数据
	 */
	exportConversation(conversationId = null) {
		const id = conversationId || this.currentConversationId
		if (!id) return null
		
		const conversation = this.conversations.get(id)
		return conversation ? JSON.parse(JSON.stringify(conversation)) : null
	}
	
	/**
	 * 导入对话数据
	 * @param {Object} conversationData 对话数据
	 * @returns {String} 导入的对话ID
	 */
	importConversation(conversationData) {
		if (!conversationData || !conversationData.id) {
			throw new Error('无效的对话数据')
		}
		
		this.conversations.set(conversationData.id, conversationData)
		console.log('[OpenAI API] 导入对话:', conversationData.id)
		return conversationData.id
	}
}

// 导出类和默认实例
export default OpenAIAPI
export const openaiAPI = new OpenAIAPI()