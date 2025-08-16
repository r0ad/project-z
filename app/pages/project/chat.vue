<template>
  <view class="chat-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <nut-icon name="left" size="20" color="#1D2129"></nut-icon>
        </view>
        <view class="navbar-title">聊项目</view>
        <view class="navbar-right" @click="showContextMenu">
          <nut-icon name="more" size="20" color="#1D2129"></nut-icon>
        </view>
      </view>
    </view>

    <!-- 项目上下文信息 -->
    <view class="context-info" v-if="showContext">
      <view class="context-header">
        <nut-icon name="tips" size="16" color="#165DFF"></nut-icon>
        <text class="context-title">当前上下文</text>
        <view class="context-toggle" @click="toggleContext">
          <nut-icon :name="showContext ? 'up' : 'down'" size="14" color="#86909C"></nut-icon>
        </view>
      </view>
      <view class="context-content">
        <view class="context-item">
          <text class="context-label">项目：</text>
          <text class="context-value">{{ projectName }}</text>
        </view>
        <view class="context-item">
          <text class="context-label">进度：</text>
          <text class="context-value">{{ projectProgress }}%</text>
        </view>
        <view class="context-item">
          <text class="context-label">最近日志：</text>
          <text class="context-value">{{ recentLogCount }}条</text>
        </view>
      </view>
    </view>

    <!-- 聊天消息列表 -->
    <scroll-view 
      class="chat-messages" 
      scroll-y
      :scroll-top="scrollTop"
      scroll-with-animation
    >
      <view class="message-list">
        <!-- 欢迎消息 -->
        <view class="message-item ai-message" v-if="messages.length === 0">
          <view class="message-avatar">
            <nut-icon name="service" size="20" color="#165DFF"></nut-icon>
          </view>
          <view class="message-content">
            <view class="message-bubble ai-bubble">
              <text class="message-text">你好！我是你的AI项目助手。我已经了解了你的项目「{{ projectName }}」的基本情况，有什么问题可以随时问我。</text>
            </view>
            <view class="message-time">{{ formatTime(new Date()) }}</view>
          </view>
        </view>

        <!-- 消息列表 -->
        <view 
          class="message-item" 
          :class="message.type === 'user' ? 'user-message' : 'ai-message'"
          v-for="(message, index) in messages" 
          :key="index"
        >
          <view class="message-avatar" v-if="message.type === 'ai'">
            <nut-icon name="service" size="20" color="#165DFF"></nut-icon>
          </view>
          
          <view class="message-content">
            <view class="message-bubble" :class="message.type === 'user' ? 'user-bubble' : 'ai-bubble'">
              <text class="message-text">{{ message.content }}</text>
              
              <!-- 流式输出指示器 -->
              <view v-if="message.isStreaming" class="streaming-indicator">
                <text class="cursor">|</text>
              </view>
              
              <!-- AI消息的操作按钮 -->
              <view class="message-actions" v-if="message.type === 'ai' && message.actions">
                <nut-button 
                  v-for="action in message.actions" 
                  :key="action.type"
                  size="small"
                  type="primary"
                  plain
                  @click="handleAction(action)"
                  class="action-btn"
                >
                  {{ action.text }}
                </nut-button>
              </view>
            </view>
            <view class="message-time">{{ formatTime(new Date(message.timestamp)) }}</view>
          </view>
          
          <view class="message-avatar" v-if="message.type === 'user'">
            <nut-icon name="my" size="20" color="#FFFFFF"></nut-icon>
          </view>
        </view>

        <!-- AI思考中 -->
        <view class="message-item ai-message" v-if="isThinking">
          <view class="message-avatar">
            <nut-icon name="service" size="20" color="#165DFF"></nut-icon>
          </view>
          <view class="message-content">
            <view class="message-bubble ai-bubble thinking">
              <view class="thinking-animation">
                <view class="dot"></view>
                <view class="dot"></view>
                <view class="dot"></view>
              </view>
              <text class="thinking-text">AI正在思考中...</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 输入区域 -->
    <view class="input-area">
      <!-- 配置选项 -->
      <view class="config-options">
        <view class="option-item">
          <text class="option-label">流式输出</text>
          <switch 
            :checked="enableStream" 
            @change="onStreamToggle"
            color="#165dff"
          />
        </view>
      </view>
      
      <view class="input-container">
        <nut-input
          v-model="inputText"
          placeholder="输入你的问题..."
          :border="false"
          class="chat-input"
          @confirm="sendMessage"
        />
        <view class="input-actions">
          <view class="voice-btn" @click="toggleVoiceInput">
            <nut-icon name="voice" size="20" color="#86909C"></nut-icon>
          </view>
          <nut-button 
            type="primary"
            size="small"
            :disabled="!inputText.trim() || isThinking || isStreaming"
            @click="sendMessage"
            class="send-btn"
          >
            {{ isStreaming ? '生成中...' : '发送' }}
          </nut-button>
        </view>
      </view>
    </view>

    <!-- 上下文菜单 -->
    <nut-popup 
      v-model:visible="showMenu" 
      position="top"
      :style="{ height: '300rpx' }"
    >
      <view class="context-menu">
        <view class="menu-item" @click="loadMoreContext">
          <nut-icon name="history" size="16" color="#165DFF"></nut-icon>
          <text>加载更多历史</text>
        </view>
        <view class="menu-item" @click="clearContext">
          <nut-icon name="delete" size="16" color="#F53F3F"></nut-icon>
          <text>清空对话</text>
        </view>
        <view class="menu-item" @click="exportChat">
          <nut-icon name="download" size="16" color="#00B42A"></nut-icon>
          <text>导出对话</text>
        </view>
      </view>
    </nut-popup>
  </view>
</template>

<script>
import aiApi from '@/api/aiApi.js'
import logApi from '@/api/logApi.js'
import projectApi from '@/api/projectApi.js'
import chatApi from '@/api/chatApi.js'

export default {
  data() {
    return {
      projectId: '',
      projectName: '',
      projectProgress: 0,
      recentLogCount: 0,
      showContext: true,
      showMenu: false,
      inputText: '',
      isThinking: false,
      scrollTop: 0,
      messages: [],
      contextData: {
        recentLogs: [],
        currentGoals: [],
        problems: []
      },
      loading: false,

      currentConversationId: null,
      enableStream: true,
      streamContent: '',
      isStreaming: false
    }
  },
  
  onLoad(options) {
    this.projectId = options.projectId || ''
    this.projectName = options.projectName || '项目名称'
    this.projectProgress = parseInt(options.progress) || 0
    this.initChat()
  },
  
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    async initChat() {
      this.loading = true
      try {
        // 加载项目信息和最近日志
        const [projectResult, logsResult] = await Promise.all([
          projectApi.getProjectDetail(this.projectId),
          logApi.getRecentLogs(this.projectId, 5)
        ])
        
        if (projectResult) {
          this.projectName = projectResult.name || this.projectName
          this.projectProgress = projectResult.progress || this.projectProgress
        }
        
        this.contextData = {
          recentLogs: logsResult || [],
          currentGoals: projectResult?.goals || [],
          problems: projectResult?.problems || []
        }
        this.recentLogCount = this.contextData.recentLogs.length
        
        // 加载或创建对话
        await this.loadOrCreateConversation()
        
      } catch (error) {
        console.error('初始化聊天失败:', error)
        // 使用默认数据
        this.contextData = {
          recentLogs: [
            { content: '完成了用户登录模块', type: 'progress' },
            { content: '数据库连接超时问题', type: 'problem' },
            { content: '明天优化数据库配置', type: 'plan' }
          ],
          currentGoals: ['完成用户模块开发', '优化系统性能'],
          problems: ['数据库连接不稳定', 'UI响应速度慢']
        }
        this.recentLogCount = this.contextData.recentLogs.length
      } finally {
        this.loading = false
      }
    },
    
    async loadProjectContext() {
      await this.initChat()
    },
    
    async loadOrCreateConversation() {
      try {
        // 尝试获取该项目的最新对话
        const conversations = await chatApi.getConversationsByProject(this.projectId)
        
        if (conversations.length > 0) {
          // 使用最新的对话
          this.currentConversationId = conversations[0].id
          // 加载历史消息
          await this.loadChatHistory()
        } else {
          // 创建新对话
          const conversation = await chatApi.createConversation({
            projectId: this.projectId,
            title: `${this.projectName} - 聊天记录`,
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
      try {
        if (!this.currentConversationId) return
        
        const messages = await chatApi.getMessagesByConversation(this.currentConversationId)
        
        // 转换数据库消息格式为UI消息格式
        this.messages = messages.map(msg => ({
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.timestamp,
          actions: msg.role === 'assistant' ? this.extractActions(msg.content) : undefined
        }))
        
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } catch (error) {
        console.error('加载聊天历史失败:', error)
        uni.showToast({
          title: '加载历史失败',
          icon: 'none'
        })
      }
    },
    
    async saveMessageToHistory(role, content) {
      try {
        if (!this.currentConversationId) return
        
        await chatApi.addMessage({
          conversationId: this.currentConversationId,
          role: role,
          content: content,
          timestamp: new Date().toISOString()
        })
      } catch (error) {
        console.error('保存消息失败:', error)
      }
    },
    

    
    toggleContext() {
      this.showContext = !this.showContext
    },
    
    showContextMenu() {
      this.showMenu = true
    },
    
    formatTime(date) {
      const hours = String(date.getHours()).padStart(2, '0')
      const minutes = String(date.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    },
    
    async sendMessage() {
      const text = this.inputText.trim()
      if (!text || this.isThinking) return
      
      // 添加用户消息
      const userMessage = {
        type: 'user',
        content: text,
        timestamp: new Date().toISOString()
      }
      this.messages.push(userMessage)
      
      // 保存用户消息到数据库
      await this.saveMessageToHistory('user', text)
      
      this.inputText = ''
      
      // 滚动到底部
      this.$nextTick(() => {
        this.scrollToBottom()
      })
      
      // AI思考
      this.isThinking = true
      this.streamContent = ''
      
      // 先添加一个空的AI消息用于流式更新
      const aiMessage = {
        type: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        actions: []
      }
      this.messages.push(aiMessage)
      
      try {
        // 调用AI接口（流式输出）
        const aiResponse = await this.callAIWithStream(text)
        
        // 更新AI消息的最终内容和动作
        const messageIndex = this.messages.length - 1
        this.messages[messageIndex].content = aiResponse.content
        this.messages[messageIndex].actions = aiResponse.actions
        
        // 保存AI消息到数据库
        await this.saveMessageToHistory('assistant', aiResponse.content)
        
      } catch (error) {
        console.error('AI回复失败:', error)
        const errorMessage = {
          type: 'ai',
          content: '抱歉，我暂时无法回答你的问题，请稍后再试。',
          timestamp: new Date().toISOString()
        }
        this.messages.push(errorMessage)
        
        // 保存错误消息到数据库
        await this.saveMessageToHistory('assistant', errorMessage.content)
      } finally {
        this.isThinking = false
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
    
    async callAIWithStream(userInput) {
      try {
        // 构建聊天历史
        const chatHistory = this.messages.slice(-10).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
        
        // 使用aiApi进行项目聊天（流式输出）
        let fullContent = ''
        let currentMessageIndex = this.messages.length - 1 // AI回复消息的索引
        
        const response = await aiApi.chatWithProject(this.projectId, userInput, chatHistory, {
          stream: true,
          onData: (chunk) => {
            // 流式更新AI回复内容
            fullContent += chunk
            if (this.messages[currentMessageIndex]) {
              this.messages[currentMessageIndex].content = fullContent
              // 触发界面更新
              this.$forceUpdate()
              // 滚动到底部
              this.$nextTick(() => {
                this.scrollToBottom()
              })
            }
          }
        })
        
        return {
          content: response.content,
          actions: this.extractActions(response.content)
        }
        
      } catch (error) {
        console.error('AI API调用失败:', error)
        
        // 降级到本地回复逻辑
        const responses = {
          '进度': {
            content: `根据你的项目数据，当前进度是${this.projectProgress}%。最近的进展包括：${this.contextData.recentLogs.filter(log => log.type === 'progress').map(log => log.content).join('、')}。建议继续保持这个节奏。`,
            actions: [{ type: 'update_progress', text: '更新进度' }]
          },
          '问题': {
            content: `我注意到你遇到了一些问题：${this.contextData.problems.join('、')}。建议优先解决数据库连接问题，这可能会影响整体开发进度。`,
            actions: [{ type: 'save_solution', text: '保存解决方案' }]
          },
          '计划': {
            content: '基于当前进度和遇到的问题，我建议下一步：1. 优化数据库连接配置 2. 完成用户模块测试 3. 开始下一个功能模块的设计。',
            actions: [{ type: 'update_plan', text: '更新计划' }]
          }
        }
        
        // 简单的关键词匹配
        for (const [keyword, response] of Object.entries(responses)) {
          if (userInput.includes(keyword)) {
            return response
          }
        }
        
        // 默认回复
        return {
          content: '抱歉，我暂时无法连接到AI服务。请稍后再试，或者尝试重新描述你的问题。',
          actions: [{ type: 'retry', text: '重试' }]
        }
      }
    },
    
    buildSystemPrompt() {
      const contextInfo = {
        projectName: this.projectName,
        projectProgress: this.projectProgress,
        recentLogs: this.contextData.recentLogs.slice(0, 3),
        currentGoals: this.contextData.currentGoals,
        problems: this.contextData.problems
      }
      
      return `你是一个专业的AI项目助手，正在协助用户管理项目「${this.projectName}」。

当前项目信息：
- 项目名称：${this.projectName}
- 当前进度：${this.projectProgress}%
- 最近日志：${this.contextData.recentLogs.map(log => log.content).join('；')}
- 当前目标：${this.contextData.currentGoals.join('；')}
- 遇到问题：${this.contextData.problems.join('；')}

请基于以上信息，为用户提供专业、有针对性的建议和帮助。回答要简洁明了，并在适当时候提供可操作的建议。`
    },
    

    
    extractActions(content) {
      const actions = []
      
      // 根据内容提取可能的操作
      if (content.includes('进度') || content.includes('完成')) {
        actions.push({ type: 'update_progress', text: '更新进度' })
      }
      
      if (content.includes('问题') || content.includes('解决')) {
        actions.push({ type: 'save_solution', text: '保存解决方案' })
      }
      
      if (content.includes('计划') || content.includes('建议')) {
        actions.push({ type: 'update_plan', text: '更新计划' })
      }
      
      if (content.includes('知识') || content.includes('经验')) {
        actions.push({ type: 'save_knowledge', text: '保存到知识库' })
      }
      
      return actions
    },
    
    async handleAction(action) {
      switch (action.type) {
        case 'save_solution':
          await this.saveToKnowledge(action.data)
          break
        case 'update_progress':
          await this.updateProgress(action.data)
          break
        case 'update_plan':
          await this.updatePlan(action.data)
          break
        case 'get_suggestions':
          await this.getMoreSuggestions()
          break
        case 'retry':
          // 重新发送最后一条用户消息
          const lastUserMessage = this.messages.filter(m => m.type === 'user').pop()
          if (lastUserMessage) {
            this.inputText = lastUserMessage.content
            this.sendMessage()
          }
          break
      }
    },
    
    async saveToKnowledge(data) {
      try {
        await aiApi.saveToKnowledge(this.projectId, data)
        uni.showToast({
          title: '已保存到知识库',
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
    
    async updateProgress(data) {
      try {
        await projectApi.updateProgress(this.projectId, data)
        uni.showToast({
          title: '进度更新成功',
          icon: 'success'
        })
        // 刷新项目信息
        await this.loadProjectContext()
      } catch (error) {
        console.error('更新进度失败:', error)
        uni.showToast({
          title: '更新失败',
          icon: 'error'
        })
      }
    },
    
    async updatePlan(data) {
      try {
        await projectApi.updatePlan(this.projectId, data)
        uni.showToast({
          title: '计划更新成功',
          icon: 'success'
        })
        // 刷新项目信息
        await this.loadProjectContext()
      } catch (error) {
        console.error('更新计划失败:', error)
        uni.showToast({
          title: '更新失败',
          icon: 'error'
        })
      }
    },
    
    async getMoreSuggestions() {
      try {
        const response = await aiApi.getProjectSuggestions(this.projectId, this.contextData)
        const suggestion = {
          type: 'ai',
          content: response.content || '根据类似项目的经验，我还建议：1. 设置每日进度检查点 2. 建立问题解决流程 3. 定期进行代码审查。这些措施可以帮助提高项目成功率。',
          timestamp: new Date().toISOString(),
          actions: response.actions
        }
        this.messages.push(suggestion)
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      } catch (error) {
        console.error('获取建议失败:', error)
        const suggestion = {
          type: 'ai',
          content: '根据类似项目的经验，我还建议：1. 设置每日进度检查点 2. 建立问题解决流程 3. 定期进行代码审查。这些措施可以帮助提高项目成功率。',
          timestamp: new Date().toISOString()
        }
        this.messages.push(suggestion)
        this.$nextTick(() => {
          this.scrollToBottom()
        })
      }
    },
    
    onStreamToggle(e) {
      this.enableStream = e.detail.value
      uni.showToast({
        title: this.enableStream ? '已启用流式输出' : '已关闭流式输出',
        icon: 'none'
      })
    },
    
    toggleVoiceInput() {
      uni.showToast({
        title: '语音功能开发中',
        icon: 'none'
      })
    },
    
    async loadMoreContext() {
      this.showMenu = false
      try {
        if (!this.currentConversationId) {
          uni.showToast({
            title: '暂无历史记录',
            icon: 'none'
          })
          return
        }
        
        // 获取更多历史消息（分页加载）
        const offset = this.messages.length
        const limit = 20
        const moreMessages = await chatApi.getMessagesByConversation(
          this.currentConversationId, 
          { offset, limit }
        )
        
        if (moreMessages.length === 0) {
          uni.showToast({
            title: '暂无更多记录',
            icon: 'none'
          })
          return
        }
        
        // 将新消息添加到消息列表开头
        const newMessages = moreMessages.map(msg => ({
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.createdAt,
          actions: msg.role === 'assistant' ? this.extractActions(msg.content) : undefined
        }))
        
        this.messages = [...newMessages, ...this.messages]
        
        uni.showToast({
          title: `加载了${moreMessages.length}条记录`,
          icon: 'success'
        })
      } catch (error) {
        console.error('加载历史记录失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    
    async clearContext() {
      this.showMenu = false
      uni.showModal({
        title: '确认清空',
        content: '确定要清空所有对话记录吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              // 清空数据库中的消息
              if (this.currentConversationId) {
                await chatApi.clearMessages(this.currentConversationId)
              }
              
              // 清空UI中的消息
              this.messages = []
              
              uni.showToast({
                title: '对话已清空',
                icon: 'success'
              })
            } catch (error) {
              console.error('清空对话失败:', error)
              uni.showToast({
                title: '清空失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
    
    exportChat() {
      this.showMenu = false
      uni.showToast({
        title: '导出功能开发中',
        icon: 'none'
      })
    },
    
    scrollToBottom() {
      this.scrollTop = 999999
    }
  }
}
</script>

<style lang="scss" scoped>
.chat-page {
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.custom-navbar {
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e6eb;
  
  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 32rpx;
    
    .navbar-left,
    .navbar-right {
      width: 60rpx;
      height: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .navbar-title {
      font-size: 36rpx;
      font-weight: 600;
      color: #1d2129;
    }
  }
}

.context-info {
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e6eb;
  
  .context-header {
    display: flex;
    align-items: center;
    gap: 8rpx;
    padding: 24rpx 32rpx 16rpx;
    
    .context-title {
      font-size: 24rpx;
      color: #4e5969;
      flex: 1;
    }
    
    .context-toggle {
      padding: 8rpx;
    }
  }
  
  .context-content {
    padding: 0 32rpx 24rpx;
    
    .context-item {
      display: flex;
      margin-bottom: 8rpx;
      
      .context-label {
        font-size: 24rpx;
        color: #86909c;
        width: 120rpx;
      }
      
      .context-value {
        font-size: 24rpx;
        color: #1d2129;
        flex: 1;
      }
    }
  }
}

.chat-messages {
  flex: 1;
  padding: 32rpx;
}

.message-list {
  .message-item {
    display: flex;
    margin-bottom: 32rpx;
    
    &.user-message {
      flex-direction: row-reverse;
      
      .message-content {
        align-items: flex-end;
      }
      
      .message-avatar {
        background-color: #165dff;
      }
    }
    
    &.ai-message {
      .message-content {
        align-items: flex-start;
      }
    }
    
    .message-avatar {
      width: 64rpx;
      height: 64rpx;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 16rpx;
      flex-shrink: 0;
      background-color: #f2f6ff;
    }
    
    .message-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      max-width: calc(100% - 120rpx);
      
      .message-bubble {
        padding: 24rpx 32rpx;
        border-radius: 24rpx;
        max-width: calc(100% - 32rpx);
        word-wrap: break-word;
        box-sizing: border-box;
        
        &.user-bubble {
          background-color: #165dff;
          color: #ffffff;
          border-bottom-right-radius: 8rpx;
        }
        
        &.ai-bubble {
          background-color: #ffffff;
          color: #1d2129;
          border: 1rpx solid #e5e6eb;
          border-bottom-left-radius: 8rpx;
          
          &.thinking {
            display: flex;
            align-items: center;
            gap: 16rpx;
            padding: 32rpx;
          }
        }
        
        .message-text {
          font-size: 28rpx;
          line-height: 1.5;
        }
        
        .message-actions {
          display: flex;
          gap: 16rpx;
          margin-top: 16rpx;
          flex-wrap: wrap;
          
          .action-btn {
            font-size: 24rpx;
            height: 56rpx;
            padding: 0 16rpx;
          }
        }
        
        .thinking-animation {
          display: flex;
          gap: 8rpx;
          
          .dot {
            width: 8rpx;
            height: 8rpx;
            border-radius: 50%;
            background-color: #165dff;
            animation: thinking 1.4s ease-in-out infinite both;
            
            &:nth-child(1) { animation-delay: -0.32s; }
            &:nth-child(2) { animation-delay: -0.16s; }
            &:nth-child(3) { animation-delay: 0s; }
          }
        }
        
        .thinking-text {
          font-size: 24rpx;
          color: #86909c;
        }
      }
      
      .message-time {
        font-size: 20rpx;
        color: #86909c;
        margin-top: 8rpx;
        padding: 0 16rpx;
      }
    }
  }
}

.input-area {
  background-color: #ffffff;
  border-top: 1rpx solid #e5e6eb;
  padding: 24rpx 32rpx;
  
  .config-options {
    padding: 16rpx 0;
    border-bottom: 1rpx solid #f0f0f0;
    margin-bottom: 16rpx;
    
    .option-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      
      .option-label {
        font-size: 26rpx;
        color: #1d2129;
      }
    }
  }
  
  .input-container {
    display: flex;
    align-items: center;
    gap: 16rpx;
    
    .chat-input {
      flex: 1;
      background-color: #f5f5f5;
      border-radius: 48rpx;
      padding: 16rpx 32rpx;
      font-size: 28rpx;
    }
    
    .input-actions {
      display: flex;
      align-items: center;
      gap: 16rpx;
      
      .voice-btn {
        width: 64rpx;
        height: 64rpx;
        border-radius: 50%;
        background-color: #f5f5f5;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .send-btn {
        height: 64rpx;
        padding: 0 32rpx;
        border-radius: 32rpx;
        font-size: 28rpx;
      }
    }
  }
}

.context-menu {
  padding: 32rpx;
  
  .menu-item {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx 0;
    border-bottom: 1rpx solid #e5e6eb;
    font-size: 28rpx;
    color: #1d2129;
    
    &:last-child {
      border-bottom: none;
    }
  }
}

@keyframes thinking {
  0%, 80%, 100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}

@keyframes blink {
  0%, 50% {
    opacity: 1;
  }
  51%, 100% {
    opacity: 0;
  }
}

.streaming-indicator {
  display: inline;
  
  .cursor {
    animation: blink 1s infinite;
    color: #165dff;
    font-weight: bold;
  }
}
</style>