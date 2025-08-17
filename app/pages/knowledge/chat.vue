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

    <!-- 聊天组件 -->
    <ChatComponent
      ref="chatComponent"
      chat-type="knowledge"
      :related-id="knowledgeId"
      :system-prompt="systemPrompt"
      :context-data="contextData"
      :default-welcome-message="welcomeMessage"
      input-placeholder="问问这个知识库..."
      @message-sent="handleMessageSent"
      @message-received="handleMessageReceived"
      @chat-init="handleChatInit"
      :custom-ai-call="callAI"
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
      currentConversationId: null
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
        
        // 加载或创建对话
        await this.loadOrCreateConversation()
        
      } catch (error) {
        console.error('初始化知识聊天失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'error'
        })
      }
    },
    async loadOrCreateConversation() {
      try {
        // 尝试获取该知识库的最新对话
        const conversations = await chatApi.getConversationsByTypeAndId('knowledge', this.knowledgeId)
        
        if (conversations.length > 0) {
          // 使用最新的对话
          this.currentConversationId = conversations[0].id
          // 加载历史消息
          await this.loadChatHistory()
        } else {
          // 创建新对话
          const conversation = await chatApi.createConversation({
            type: 'knowledge',
            relatedId: this.knowledgeId,
            title: `${this.knowledgeData.title || '知识库'} - 聊天记录`,
            createdAt: new Date().toISOString()
          })
          this.currentConversationId = conversation.id
        }
      } catch (error) {
        console.error('加载或创建对话失败:', error)
        uni.showToast({
          title: '加载对话失败',
          icon: 'none'
        })
      }
    },
    
    async loadChatHistory() {
      if (!this.currentConversationId) return
      
      try {
        const messages = await chatApi.getConversationMessages(this.currentConversationId)
        // 将历史消息设置到ChatComponent中
        if (this.$refs.chatComponent) {
          this.$refs.chatComponent.setMessages(messages.map(msg => ({
            text: msg.content,
            isUser: msg.role === 'user',
            timestamp: msg.timestamp
          })))
        }
      } catch (error) {
        console.error('加载聊天历史失败:', error)
      }
    },
    async handleMessageSent(eventData) {
      // 保存用户消息到数据库
      if (this.currentConversationId) {
        try {
          await chatApi.saveMessage(this.currentConversationId, 'user', eventData.message.content)
        } catch (error) {
          console.error('保存用户消息失败:', error)
        }
      }
    },
    async handleMessageReceived(eventData) {
      // 保存AI消息到数据库
      if (this.currentConversationId) {
        try {
          await chatApi.saveMessage(this.currentConversationId, 'assistant', eventData.message.content)
        } catch (error) {
          console.error('保存AI消息失败:', error)
        }
      }
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
    async handleAICall(userInput, messages, contextData, options) {
      // 自定义AI调用逻辑，包含知识库上下文
      return await this.callAI(userInput, messages, options)
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
    async saveToKnowledge(data) {
      try {
        await knowledgeApi.createKnowledge({
          title: data.title,
          content: data.content,
          summary: data.summary,
          tags: data.tags || []
        })
        
        uni.showToast({
          title: '保存成功',
          icon: 'success'
        })
      } catch (error) {
        console.error('保存到知识库失败:', error)
        uni.showToast({
          title: '保存失败',
          icon: 'error'
        })
      }
    },
    viewRelatedKnowledge(data) {
      uni.navigateTo({
        url: `/pages/knowledge/detail?id=${data.knowledgeId}`
      })
    },
    exportSummary(data) {
      // 导出总结功能
      uni.showToast({
        title: '导出功能开发中',
        icon: 'none'
      })
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
</style>