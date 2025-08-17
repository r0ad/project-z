<template>
  <view class="knowledge-chat-page">
    <!-- 自定义导航栏 -->
    <CustomNavbar :title="pageTitle" :show-back="true" @back="goBack">
      <template #right>
        <view class="nav-actions">
          <nut-icon name="more" size="20" color="#86909C" @click="showMoreActions"></nut-icon>
        </view>
      </template>
    </CustomNavbar>
    
    <!-- 导航栏占位 -->
    <view class="navbar-placeholder"></view>

    <!-- 加载状态 -->
    <view v-if="isLoading" class="loading-container">
      <!-- <nut-loading type="circular" size="24"></nut-loading> -->
      <text class="loading-text">加载知识库数据中...</text>
    </view>
    
    <!-- 错误状态 -->
    <view v-else-if="!knowledgeData || !knowledgeData.title" class="error-container">
      <nut-icon name="warning" size="48" color="#F56C6C"></nut-icon>
      <text class="error-text">知识库数据加载失败</text>
      <nut-button type="primary" size="small" @click="initKnowledgeChat">重新加载</nut-button>
    </view>
    
    <!-- 聊天组件 -->
    <ChatComponent
      v-else
      ref="chatComponent"
      chat-type="knowledge"
      :related-id="knowledgeId"
      :system-prompt="systemPrompt"
      :context-data="contextData"
      :current-conversation-id="currentConversationId"
      :default-welcome-message="welcomeMessage"
      input-placeholder="问问这个知识库..."
      :enable-voice="true"
      :enable-stream="true"
      :custom-ai-call="handleAICall"
      @message-sent="handleMessageSent"
      @message-received="handleMessageReceived"
      @action-clicked="handleActionClicked"
      @chat-init="handleChatInit"
      @conversation-created="loadOrCreateConversation"
      @conversation-loaded="loadChatHistory"
    >
      <!-- 知识信息卡片 -->
      <template #header>
        <view class="knowledge-info-card">
          <view class="knowledge-header">
            <text class="knowledge-title">{{ knowledgeData.title }}</text>
            <view class="knowledge-meta">
              <view class="meta-item">
                <nut-icon name="time" size="12" color="#86909C"></nut-icon>
                <text class="meta-text">{{ knowledgeData.updateTime }}</text>
              </view>
              <view class="meta-item">
                <nut-icon name="eye" size="12" color="#86909C"></nut-icon>
                <text class="meta-text">{{ knowledgeData.viewCount }}</text>
              </view>
            </view>
          </view>
          <view class="knowledge-summary">
            <text class="summary-text">{{ knowledgeData.summary }}</text>
          </view>
          <view class="knowledge-tags" v-if="knowledgeData.tags && knowledgeData.tags.length > 0">
            <text 
              v-for="(tag, index) in knowledgeData.tags" 
              :key="index"
              class="knowledge-tag"
            >
              {{ tag }}
            </text>
          </view>
        </view>
      </template>
      
      <template #messageActions="{ actions, handleAction }">
        <view class="knowledge-message-actions" v-if="actions && actions.length > 0">
          <view 
            v-for="action in actions" 
            :key="action.type"
            :class="['knowledge-action-btn', getActionButtonType(action.type)]"
            @click="handleKnowledgeAction(action)"
          >
            <nut-icon :name="getActionIcon(action.type)" size="14"></nut-icon>
            <text class="action-text">{{ action.label }}</text>
          </view>
        </view>
      </template>
    </ChatComponent>
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
      knowledgeData: {
        title: '',
        summary: '',
        content: '',
        tags: [],
        updateTime: '',
        viewCount: 0
      },
      currentConversationId: null,
      isLoading: false
    }
  },
  computed: {
    pageTitle() {
      return this.knowledgeData.title ? `聊知识 - ${this.knowledgeData.title}` : '聊知识'
    },
    systemPrompt() {
      return `你是一个专业的知识助手，专门帮助用户理解和应用知识库中的内容。

当前知识信息：
标题：${this.knowledgeData.title}
概要：${this.knowledgeData.summary}
详细内容：${this.knowledgeData.content}

请基于这个知识内容回答用户的问题，提供深入的解释、实际应用建议和相关扩展。你可以：
1. 解释知识点的核心概念
2. 提供实际应用场景和案例
3. 推荐相关的学习资源
4. 回答具体的实施问题
5. 提供最佳实践建议

请保持专业、准确、有帮助的回答风格。`
    },
    contextData() {
      return {
        knowledgeId: this.knowledgeId,
        knowledgeTitle: this.knowledgeData.title,
        knowledgeSummary: this.knowledgeData.summary,
        knowledgeContent: this.knowledgeData.content,
        knowledgeTags: this.knowledgeData.tags
      }
    },
    welcomeMessage() {
      return `你好！我是你的知识助手。我已经了解了「${this.knowledgeData.title}」的相关内容，可以帮你：

💡 深入理解核心概念
🔧 提供实际应用指导
📚 推荐相关学习资源
❓ 解答具体实施问题

有什么想了解的，尽管问我吧！`
    }
  },
  async onLoad(options) {
    if (options.id) {
      this.knowledgeId = options.id
      this.initKnowledgeChat()
    }
  },
  onUnload() {
    // 清理资源
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    async initKnowledgeChat() {
      try {
        this.isLoading = true
        
        // 加载知识详情
        const knowledge = await knowledgeApi.getKnowledgeDetail(this.knowledgeId)
        if (knowledge) {
          this.knowledgeData = {
            title: knowledge.title || '',
            summary: knowledge.summary || '',
            content: knowledge.content || '',
            tags: knowledge.tags || [],
            updateTime: knowledge.updateTime || '',
            viewCount: knowledge.view_count || 0
          }
        }
        
      } catch (error) {
        console.error('初始化知识聊天失败:', error)
        uni.showToast({
          title: '初始化失败',
          icon: 'error'
        })
      } finally {
        this.isLoading = false
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
    

    
    getActionButtonType(actionType) {
      const typeMap = {
        'save_to_knowledge': 'primary',
        'view_related': 'secondary',
        'export_summary': 'info'
      }
      return typeMap[actionType] || 'default'
    },
    
    getActionIcon(actionType) {
      const iconMap = {
        'save_to_knowledge': 'star',
        'view_related': 'link',
        'export_summary': 'download'
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
        if (aiResponse && aiResponse.length > 50) {
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
        })
        
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
      uni.showActionSheet({
        itemList: ['清空对话', '导出对话', '分享知识'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              this.clearConversation()
              break
            case 1:
              this.exportConversation()
              break
            case 2:
              this.shareKnowledge()
              break
          }
        }
      })
    },
    async clearConversation() {
      uni.showModal({
        title: '确认清空',
        content: '确定要清空当前对话吗？此操作不可恢复。',
        success: async (res) => {
          if (res.confirm && this.currentConversationId) {
            try {
              await chatApi.clearConversation(this.currentConversationId)
              this.$refs.chatComponent.clearMessages()
              uni.showToast({
                title: '已清空对话',
                icon: 'success'
              })
            } catch (error) {
              console.error('清空对话失败:', error)
              uni.showToast({
                title: '清空失败',
                icon: 'error'
              })
            }
          }
        }
      })
    },
    exportConversation() {
      uni.showToast({
        title: '导出功能开发中',
        icon: 'none'
      })
    },
    shareKnowledge() {
      uni.showToast({
        title: '分享功能开发中',
        icon: 'none'
      })
    }
  }
}
</script>

<style scoped>
.knowledge-chat-page {
  min-height: 100vh;
  background-color: #F2F3F5;
}

.navbar-placeholder {
  height: calc(var(--status-bar-height) + 136rpx);
}

.nav-actions {
  display: flex;
  align-items: center;
}

.knowledge-info-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin: 16rpx;
  margin-bottom: 0;
  box-shadow: 0 2rpx 8rpx 0 rgba(0, 0, 0, 0.06);
}

.knowledge-header {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.knowledge-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1D2129;
  line-height: 1.4;
}

.knowledge-meta {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.meta-text {
  font-size: 22rpx;
  color: #86909C;
}

.knowledge-summary {
  margin-bottom: 16rpx;
}

.summary-text {
  font-size: 26rpx;
  color: #4E5969;
  line-height: 1.5;
  display: block;
}

.knowledge-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.knowledge-tag {
  padding: 6rpx 12rpx;
  background-color: #F2F3F5;
  border-radius: 6rpx;
  font-size: 22rpx;
  color: #86909C;
}

/* 知识库消息操作按钮样式 */
.knowledge-message-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 16rpx;
  flex-wrap: wrap;
}

.knowledge-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx 24rpx;
  border: none;
  border-radius: 40rpx;
  font-size: 24rpx;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.knowledge-action-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
}

.action-text {
  font-size: 24rpx;
}

/* 不同类型按钮的样式 */
.knowledge-action-btn.primary {
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
}

.knowledge-action-btn.primary:hover {
  background: linear-gradient(45deg, #5a6fd8, #6a42a0);
}

.knowledge-action-btn.secondary {
  background: linear-gradient(45deg, #11998e, #38ef7d);
  color: white;
}

.knowledge-action-btn.secondary:hover {
  background: linear-gradient(45deg, #0e8478, #32d96b);
}

.knowledge-action-btn.info {
  background: linear-gradient(45deg, #3498db, #2980b9);
  color: white;
}

.knowledge-action-btn.info:hover {
  background: linear-gradient(45deg, #2980b9, #21618c);
}

.knowledge-action-btn.default {
  background: linear-gradient(45deg, #95a5a6, #7f8c8d);
  color: white;
}

.knowledge-action-btn.default:hover {
  background: linear-gradient(45deg, #7f8c8d, #6c7b7d);
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