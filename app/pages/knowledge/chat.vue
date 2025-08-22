<template>
  <view class="knowledge-chat-page">
    <!-- 自定义导航栏 -->
    <CustomNavbar 
      :title="pageTitle"
			right-icon="more-x"
      left-icon-color="#1D2129"
      right-icon-color="#1D2129"
      @left-click="goBack"
      @right-click="showMoreActions"
    />
    
    <!-- 使用公共聊天组件 -->
    <ChatComponent
      v-if="!loading && !error && knowledgeData"
      ref="chatComponent"
      chat-type="knowledge"
      :related-id="knowledgeId"
      :context-data="contextData"
      :show-context="showContext"
      :default-welcome-message="welcomeMessage"
      input-placeholder="询问关于这个知识库的问题..."
      :enable-voice="true"
      :enable-stream="true"
      :custom-ai-call="handleAICall"
      @message-sent="handleMessageSent"
      @message-received="handleMessageReceived"
      @action-clicked="handleActionClicked"
      @context-toggle="toggleContext"
      @menu-show="showMenu = true"
      @menu-hide="showMenu = false"
      @chat-init="initChat"
      @conversation-changed="handleConversationChanged"
    >
      <!-- 知识库上下文信息插槽 -->
      <template #contextInfo="{ contextData, toggleContext }">
        <view class="context-info" v-if="knowledgeData">
          <view class="context-compact">
            <nut-icon name="star" size="14" color="#165DFF"></nut-icon>
            <text class="context-text">{{ knowledgeData.title || '未知标题' }} · {{ knowledgeData.view_count || 0 }}次查看 · {{ knowledgeData.tags ? knowledgeData.tags.length : 0 }}个标签</text>
            <view class="context-toggle" @click="toggleContext">
              <nut-icon name="close" size="12" color="#86909C"></nut-icon>
            </view>
          </view>
        </view>
      </template>

      <!-- 知识库特定的消息操作按钮 -->
      <template #messageActions="{ actions, handleAction }">
        <view class="knowledge-message-actions">
          <nut-button 
            v-for="action in actions" 
            :key="action.type"
            size="small"
            :type="getActionButtonType(action.type)"
            plain
            @click="handleKnowledgeAction(action)"
            class="knowledge-action-btn"
          >
            <nut-icon 
              :name="getActionIcon(action.type)" 
              size="12" 
              class="action-icon"
            ></nut-icon>
            {{ action.label }}
          </nut-button>
        </view>
      </template>
    </ChatComponent>

    <!-- 业务功能悬浮按钮 -->
    <view class="business-actions">
      <view class="business-btn" @click="viewKnowledgeDetail">
        <nut-icon name="eye" size="14" color="#165DFF"></nut-icon>
      </view>
    </view>
    
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-container">
      <text class="loading-text">正在加载知识库信息...</text>
    </view>
    
    <!-- 错误状态 -->
    <view v-else-if="error" class="error-container">
      <nut-icon name="close-circle" size="40" color="#F56C6C"></nut-icon>
      <text class="error-text">{{ error }}</text>
    </view>
  </view>
</template>

<script>
import CustomNavbar from '@/components/CustomNavbar.vue'
import ChatComponent from '@/components/ChatComponent.vue'
import knowledgeApi from '@/api/knowledgeApi.js'
import chatApi from '@/api/chatApi.js'

export default {
  components: {
    CustomNavbar,
    ChatComponent
  },
  data() {
    return {
      knowledgeId: '',
      knowledgeData: null,
      loading: false,
      error: null,
      showContext: true,
      showMenu: false,
      currentConversationId: null
    }
  },
  computed: {
    pageTitle() {
      return this.knowledgeData && this.knowledgeData.title ? `聊知识 - ${this.knowledgeData.title.slice(0, 5)} ...` : '聊知识'
    },
    systemPrompt() {
      if (!this.knowledgeData) return ''
      return `你是一个专业的知识助手，专门帮助用户理解和应用知识库中的内容。

当前知识信息：
标题：${this.knowledgeData.title || ''}
概要：${this.knowledgeData.summary || ''}
详细内容：${this.knowledgeData.content || ''}

请基于这个知识内容回答用户的问题，提供深入的解释、实际应用建议和相关扩展。你可以：
1. 解释知识点的核心概念
2. 提供实际应用场景和案例
3. 推荐相关的学习资源
4. 回答具体的实施问题
5. 提供最佳实践建议

请保持专业、准确、有帮助的回答风格。`
    },
    contextData() {
      if (!this.knowledgeData) return {}
      return {
        knowledgeId: this.knowledgeId,
        knowledgeTitle: this.knowledgeData.title || '',
        knowledgeSummary: this.knowledgeData.summary || '',
        knowledgeContent: this.knowledgeData.content || '',
        knowledgeTags: this.knowledgeData.tags || []
      }
    },
    welcomeMessage() {
      if (!this.knowledgeData || !this.knowledgeData.title) {
        return '你好！我是你的知识助手，正在加载知识库信息...'
      }
      return `你好！我是你的知识助手。我已经了解了「${this.knowledgeData.title}」的相关内容，可以帮你：

💡 深入理解核心概念
🔧 提供实际应用指导
📚 推荐相关学习资源
❓ 解答具体实施问题

有什么想了解的，尽管问我吧！`
    }
  },
  async onLoad(options) {
    this.knowledgeId = options.id || options.knowledgeId || ''
    console.log('知识库聊天页面加载，知识库ID:', this.knowledgeId)
    
    if (this.knowledgeId) {
      this.initKnowledgeChat()
    } else {
      uni.showToast({
        title: '知识库ID不能为空',
        icon: 'error'
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  
  onShow() {
    // 页面显示时通知ChatComponent
    if (this.$refs.chatComponent) {
      this.$refs.chatComponent.isPageVisible = true
      this.$refs.chatComponent.isComponentActive = true
      // 恢复周期性检查
      if (!this.$refs.chatComponent.periodicScrollTimer) {
        this.$refs.chatComponent.startPeriodicScrollCheck()
      }
    }
  },
  
  onHide() {
    // 页面隐藏时通知ChatComponent
    if (this.$refs.chatComponent) {
      this.$refs.chatComponent.isPageVisible = false
      this.$refs.chatComponent.pausePeriodicScrollCheck()
    }
  },
  
  onUnload() {
    // 页面卸载时彻底清理ChatComponent资源
    if (this.$refs.chatComponent) {
      this.$refs.chatComponent.isComponentActive = false
      this.$refs.chatComponent.isPageVisible = false
      this.$refs.chatComponent.clearAllScrollResources()
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    toggleContext() {
      this.showContext = !this.showContext
    },
    
    viewKnowledgeDetail() {
      uni.navigateTo({
        url: `/pages/knowledge/detail?id=${this.knowledgeId}`
      })
    },
    
    async initKnowledgeChat() {
      this.loading = true
      this.error = null
      try {
        // 获取知识库详情
        const knowledge = await knowledgeApi.getKnowledgeDetail(this.knowledgeId)
        if (knowledge) {
          this.knowledgeData = {
            title: knowledge.title || '',
            summary: knowledge.summary || '',
            content: knowledge.content || '',
            tags: knowledge.tags || [],
            updateTime: knowledge.updateTime || '',
            view_count: knowledge.view_count || 0
          }
        } else {
          this.error = '知识库不存在'
        }
      } catch (error) {
        console.error('初始化知识库聊天失败:', error)
        this.error = '知识库数据加载失败'
      } finally {
        this.loading = false
      }
    },
    async loadOrCreateConversation() {
      // 这个方法现在由ChatComponent处理
      console.log('对话加载由ChatComponent处理')
    },
    
    async loadChatHistory() {
      // 这个方法现在由ChatComponent处理
      console.log('聊天历史加载由ChatComponent处理')
    },
    async handleMessageSent(eventData) {
      // 消息发送处理现在由ChatComponent处理
      console.log('用户消息已发送:', eventData)
    },
    async handleMessageReceived(eventData) {
      // 消息接收处理现在由ChatComponent处理
      console.log('AI消息已接收:', eventData)
    },
    handleActionClicked(action) {
      // 处理AI操作按钮点击
      console.log('知识聊天操作:', action)
      
      switch (action.type) {
        case 'save_to_knowledge':
          this.saveToKnowledge(action.data)
          break
        case 'view_related':
          this.viewRelatedKnowledge(action.data)
          break
        case 'export_summary':
          this.exportSummary(action.data)
          break
        default:
          console.log('未知操作类型:', action.type)
      }
    },
    
    initChat() {
      // 聊天组件初始化完成
      console.log('知识库聊天初始化完成')
    },
    
    handleConversationChanged(conversationId) {
      this.currentConversationId = conversationId
      console.log('会话切换:', conversationId)
    },
    

    
    getActionButtonType(actionType) {
      const typeMap = {
        'save_to_knowledge': 'primary',
        'view_related': 'success',
        'export_summary': 'info',
        'edit_knowledge': 'warning'
      }
      return typeMap[actionType] || 'default'
    },
    
    getActionIcon(actionType) {
      const iconMap = {
        'save_to_knowledge': 'star',
        'view_related': 'link',
        'export_summary': 'download',
        'edit_knowledge': 'edit'
      }
      return iconMap[actionType] || 'more'
    },
    
    handleChatInit() {
      // 聊天组件初始化完成
      console.log('知识库聊天初始化完成')
    },
    async handleAICall(userInput, messages, contextData, options = {}) {
      // 自定义AI调用逻辑，包含知识库上下文
      try {
        // 确保知识库数据已加载
        if (!this.knowledgeData || !this.knowledgeData.title) {
          console.warn('知识库数据未加载，使用默认回复')
          return {
            content: '抱歉，知识库数据还在加载中，请稍后重试。',
            actions: []
          }
        }
        
        // 构建包含知识库内容的系统提示词
        const systemPrompt = `你是一个专业的知识库助手，正在协助用户理解和应用以下知识库内容：

知识库标题：${this.knowledgeData.title}
知识库概要：${this.knowledgeData.summary || '无概要'}
知识库详细内容：
${this.knowledgeData.content || '无详细内容'}
标签：${this.knowledgeData.tags ? this.knowledgeData.tags.join(', ') : '无标签'}

请基于上述知识库的具体内容来回答用户的问题。你可以：
- 解释知识库中的概念和内容
- 回答与知识库相关的问题
- 提供基于知识库内容的建议
- 帮助用户更好地理解和应用这些知识

请确保你的回答都是基于提供的知识库内容，如果用户问的问题超出了知识库范围，请明确告知并引导用户回到知识库相关话题。`
        
        // 构建聊天历史
        const chatHistory = messages.slice(-10).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
        
        // 构建完整的消息历史
        const fullMessages = [
          { role: 'system', content: systemPrompt },
          ...chatHistory,
          { role: 'user', content: userInput }
        ]
        
        // 调用AI API
        const aiApi = (await import('@/api/aiApi.js')).default
        
        // 检查是否使用流式输出
        if (options.onStream) {
          // 流式输出
          return new Promise((resolve, reject) => {
            let fullContent = ''
            
            aiApi.initOpenAI().then(api => {
              api.chatCompletionStream(
                fullMessages,
                (chunk) => {
                  if (chunk === '[DONE]') {
                    resolve({
                      content: fullContent,
                      actions: this.generateKnowledgeActions(fullContent, userInput)
                    })
                  } else {
                    fullContent += chunk
                    options.onStream(chunk)
                  }
                },
                (result) => {
                  resolve({
                    content: fullContent,
                    actions: this.generateKnowledgeActions(fullContent, userInput)
                  })
                },
                (error) => {
                  reject(error)
                },
                {
                  useHistory: false,
                  enableFunctions: false
                }
              )
            }).catch(reject)
          })
        } else {
          // 非流式输出
          const api = await aiApi.initOpenAI()
          const response = await api.chatCompletion(fullMessages, {
            useHistory: false,
            enableFunctions: false
          })
          
          const content = response.content || '抱歉，我暂时无法回答这个问题。'
          return {
            content,
            actions: this.generateKnowledgeActions(content, userInput)
          }
        }
        
      } catch (error) {
        console.error('知识库AI调用失败:', error)
        return {
          content: '抱歉，处理您的问题时出现了错误，请稍后重试。',
          actions: []
        }
      }
    },
    
    generateKnowledgeActions(aiResponse, userInput) {
      const actions = []
      
      try {
        // 确保知识库数据已加载
        if (!this.knowledgeData) {
          console.warn('知识库数据未加载，无法生成操作按钮')
          return actions
        }
        
        // 保存到知识库操作
        /* if (aiResponse && aiResponse.length > 50) {
          actions.push({
            type: 'save_to_knowledge',
            label: '保存到知识库',
            icon: 'bookmark',
            data: {
              content: aiResponse,
              source: 'ai_response',
              relatedKnowledgeId: this.knowledgeId,
              title: `${this.knowledgeData.title || '未知知识库'} - AI回答`
            }
          })
        }
        
        // 查看相关知识操作
        actions.push({
          type: 'view_related',
          label: '查看相关知识',
          icon: 'search',
          data: {
            query: userInput,
            currentKnowledgeId: this.knowledgeId,
            tags: this.knowledgeData.tags || []
          }
        })
        
        // 导出摘要操作
        if (aiResponse && aiResponse.length > 100) {
          actions.push({
            type: 'export_summary',
            label: '导出摘要',
            icon: 'download',
            data: {
              content: aiResponse,
              title: `${this.knowledgeData.title || '未知知识库'} - 问答摘要`,
              question: userInput,
              timestamp: new Date().toISOString()
            }
          })
        }
        
        // 编辑知识库操作
        actions.push({
          type: 'edit_knowledge',
          label: '编辑知识库',
          icon: 'edit',
          data: {
            knowledgeId: this.knowledgeId,
            currentContent: this.knowledgeData.content || ''
          }
        }) */
        
      } catch (error) {
        console.error('生成知识库操作按钮失败:', error)
      }
      
      return actions
    },
    
    // 处理知识库操作按钮点击
    async handleKnowledgeAction(action) {
      try {
        switch (action.type) {
          case 'save_to_knowledge':
            await this.saveToKnowledge(action.data)
            break
          case 'view_related':
            await this.viewRelatedKnowledge(action.data)
            break
          case 'export_summary':
            await this.exportSummary(action.data)
            break
          case 'edit_knowledge':
            await this.editKnowledge(action.data)
            break
          default:
            console.warn('未知的知识库操作类型:', action.type)
        }
      } catch (error) {
        console.error('执行知识库操作失败:', error)
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'none'
        })
      }
    },
    
    async callAI(userInput, messages, options) {
      try {
        // 构建聊天历史，包含知识库完整内容
        const knowledgeContent = `
知识库标题：${this.knowledgeData.title}
知识库概要：${this.knowledgeData.summary || '无概要'}
知识库详细内容：
${this.knowledgeData.content || '无详细内容'}
标签：${this.knowledgeData.tags ? this.knowledgeData.tags.join(', ') : '无标签'}
`
        
        const systemMessage = {
          role: 'system',
          content: `你是一个专业的知识库助手。用户正在与你讨论以下知识库的内容：

${knowledgeContent}

请基于上述知识库的具体内容来回答用户的问题。你可以：
- 解释知识库中的概念和内容
- 回答与知识库相关的问题
- 提供基于知识库内容的建议
- 帮助用户更好地理解和应用这些知识

请确保你的回答都是基于提供的知识库内容，如果用户问的问题超出了知识库范围，请明确告知并引导用户回到知识库相关话题。`
        }
        
        const chatHistory = [
          systemMessage,
          ...messages,
          {
            role: 'user',
            content: userInput
          }
        ]
        
        // 使用aiApi调用AI接口
        const aiApi = (await import('@/api/aiApi.js')).default
        
        // 调用AI API
        const response = await aiApi.sendAIRequest(userInput, {
          messages: chatHistory,
          stream: options && options.onStream ? true : false,
          onStream: options && options.onStream ? options.onStream : null
        })
        
        const finalContent = response.content || response.choices?.[0]?.message?.content || '抱歉，我暂时无法回答您的问题。'
        
        // 保存用户消息和AI回复到数据库
        if (this.currentConversationId) {
          try {
            // 保存用户消息
            await chatApi.saveMessage(this.currentConversationId, 'user', userInput)
            
            // 保存AI回复
            await chatApi.saveMessage(this.currentConversationId, 'assistant', finalContent)
            
            // 更新对话的最后更新时间
            await chatApi.updateConversation(this.currentConversationId, {
              updated_at: new Date().toISOString()
            })
          } catch (error) {
            console.error('保存消息失败:', error)
          }
        }
        
        return {
          content: finalContent
        }
        
      } catch (error) {
        console.error('AI调用失败:', error)
        // 返回降级回复
        return {
          choices: [{
            message: {
              content: '抱歉，我暂时无法回答您的问题。请稍后再试。'
            }
          }]
        }
      }
    },
    // 保存到知识库
    async saveToKnowledge(data) {
      try {
        /* const knowledgeService = (await import('@/services/knowledgeService.js')).default
        await knowledgeService.createKnowledge({
          title: data.title,
          content: data.content,
          tags: ['AI生成', '问答'],
          source: data.source,
          relatedId: data.relatedKnowledgeId
        }) */
        
        uni.showToast({
          title: '已保存到知识库',
          icon: 'success'
        })
      } catch (error) {
        console.error('保存到知识库失败:', error)
        throw error
      }
    },
    // 查看相关知识
    async viewRelatedKnowledge(data) {
      try {
        const query = encodeURIComponent(JSON.stringify({
          search: data.query,
          tags: data.tags,
          excludeId: data.currentKnowledgeId
        }))
        
        uni.navigateTo({
          url: `/pages/knowledge/list?query=${query}`
        })
      } catch (error) {
        console.error('查看相关知识失败:', error)
        throw error
      }
    },
    // 导出摘要
    async exportSummary(data) {
      try {
        const summary = `# ${data.title}\n\n**问题：** ${data.question}\n\n**回答：**\n${data.content}\n\n**导出时间：** ${new Date(data.timestamp).toLocaleString()}`
        
        // 这里可以实现具体的导出逻辑，比如保存到文件或分享
        uni.showModal({
          title: '导出摘要',
          content: '摘要已生成，是否复制到剪贴板？',
          success: (res) => {
            if (res.confirm) {
              uni.setClipboardData({
                data: summary,
                success: () => {
                  uni.showToast({
                    title: '已复制到剪贴板',
                    icon: 'success'
                  })
                }
              })
            }
          }
        })
      } catch (error) {
        console.error('导出摘要失败:', error)
        throw error
      }
    },
    
    // 编辑知识库
    async editKnowledge(data) {
      try {
        uni.navigateTo({
          url: `/pages/knowledge/edit?id=${data.knowledgeId}`
        })
      } catch (error) {
        console.error('编辑知识库失败:', error)
        throw error
      }
    },
    showMoreActions() {
      this.$refs.chatComponent.showContextMenu()
    },

  }
}
</script>

<style scoped>
.knowledge-chat-page {
  min-height: 100vh;
  background-color: #F2F3F5;
}

/* 上下文信息样式 */
.context-info {
  background-color: #ffffff;
  border-bottom: 1rpx solid #E5E6EB;
}

.context-compact {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 24rpx;
  gap: 12rpx;
}

.context-text {
  flex: 1;
  font-size: 24rpx;
  color: #4E5969;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.context-toggle {
  padding: 8rpx;
  border-radius: 50%;
  background-color: #F7F8FA;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.context-toggle:hover {
  background-color: #E5E6EB;
}

/* 业务功能悬浮按钮 */
.business-actions {
  position: fixed;
  right: 32rpx;
  bottom: 200rpx;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.business-btn {
  width: 50rpx;
  height: 50rpx;
  border-radius: 50%;
  background-color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s ease;
}

.business-btn:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.16);
}

/* 知识库消息操作按钮样式 */
.knowledge-message-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
  flex-wrap: wrap;
}

.knowledge-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  border-radius: 32rpx;
  transition: all 0.3s ease;
}

.knowledge-action-btn .action-icon {
  margin-right: 4rpx;
}

/* 加载状态样式 */
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  background-color: #ffffff;
  margin: 16rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx 0 rgba(0, 0, 0, 0.06);
}

.loading-text {
  font-size: 28rpx;
  color: #86909C;
  text-align: center;
  margin-top: 20rpx;
}

/* 错误状态样式 */
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 40rpx;
  background-color: #ffffff;
  margin: 16rpx;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 8rpx 0 rgba(0, 0, 0, 0.06);
}

.error-text {
  font-size: 28rpx;
  color: #F56C6C;
  text-align: center;
  margin: 20rpx 0;
}
</style>