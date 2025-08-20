<template>
  <view class="chat-component">
    <!-- 上下文信息区域 - 使用slot支持个性化 -->
    <view class="context-info" v-if="showContext && $slots.contextInfo">
      <slot name="contextInfo" :contextData="contextData" :toggleContext="toggleContext"></slot>
    </view>

    <!-- 聊天消息列表 -->
    <scroll-view 
      id="messageScrollView"
      class="chat-messages" 
      scroll-y
      :scroll-top="scrollTop"
      scroll-with-animation
      @scroll="onScroll"
    >
      <view class="message-list">
        <!-- 欢迎消息 - 使用slot支持个性化 -->
        <view class="message-item ai-message" v-if="messages.length === 0">
          <view class="message-avatar">
            <nut-icon name="service" size="20" color="#165DFF"></nut-icon>
          </view>
          <view class="message-content">
            <view class="message-bubble ai-bubble">
              <slot name="welcomeMessage" :contextData="contextData">
                <text class="message-text">{{ defaultWelcomeMessage }}</text>
              </slot>
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
            <view 
              class="message-bubble" 
              :class="message.type === 'user' ? 'user-bubble' : 'ai-bubble'"
              @longpress="copyMessage(message.content)"
            >
              <text class="message-text">{{ message.content }}</text>
              
              <!-- 流式输出指示器 -->
              <view v-if="message.isStreaming" class="streaming-indicator">
                <text class="cursor">|</text>
              </view>
              
              <!-- AI消息的操作按钮 - 使用slot支持个性化 -->
              <view class="message-actions" v-if="message.type === 'ai' && message.actions && message.actions.length > 0">
                <slot name="messageActions" :actions="message.actions" :handleAction="handleAction">
                  <nut-button 
                    v-for="action in message.actions" 
                    :key="action.type"
                    size="small"
                    type="primary"
                    plain
                    @click="handleAction(action)"
                    class="action-btn"
                  >
                    <nut-icon v-if="action.icon" :name="action.icon" size="14" style="margin-right: 4px;"></nut-icon>
                    {{ action.label || action.text }}
                  </nut-button>
                </slot>
              </view>
            </view>
            <view class="message-time">{{ formatTime(new Date(message.timestamp)) }}</view>
          </view>
          
          <view class="message-avatar" v-if="message.type === 'user'">
            <nut-icon name="my" size="20" color="#FFFFFF"></nut-icon>
          </view>
        </view>

        <!-- 流式响应显示 -->
        <view v-if="isStreaming && streamContent" class="message-item ai-message streaming">
          <view class="message-avatar">
            <nut-icon name="service" size="20" color="#165DFF"></nut-icon>
          </view>
          <view class="message-content">
            <view class="message-bubble ai-bubble">
              <text class="message-text">{{ streamContent }}</text>
              <text class="cursor blink">|</text>
            </view>
          </view>
        </view>
        
        <!-- AI思考中 -->
        <view class="message-item ai-message" v-if="isThinking && !isStreaming">
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
      <view class="input-container">
        <nut-textarea
          v-model="inputText"
          :placeholder="inputPlaceholder"
          :autosize="{ maxHeight: '200rpx', minHeight: '80rpx' }"
          :border="false"
          class="chat-input"
          @confirm="sendMessage"
          @keydown="handleKeyDown"
        />
        <view class="input-actions">
          
          <nut-button 
            type="primary"
            size="small"
            :disabled="!inputText.trim() || isThinking || isStreaming"
            @click="sendMessage"
            class="send-btn"
          >
            <nut-icon 
              v-if="!isStreaming" 
              name="right" 
              size="20" 
              color="#ffffff"
              style="display: flex; align-items: center; justify-content: center;"
            ></nut-icon>
            <nut-icon 
              v-else 
              name="loading" 
              size="20" 
              color="#ffffff"
              style="display: flex; align-items: center; justify-content: center;"
            ></nut-icon>
          </nut-button>
        </view>
      </view>
    </view>

    <!-- 上下文菜单 - 使用slot支持个性化 -->
    <nut-popup 
      v-model:visible="showMenu" 
      position="top"
      :style="{ height: '300rpx' }"
    >
      <view class="context-menu">
        <slot name="contextMenu" :hideMenu="hideMenu">
          <!-- 默认菜单项 -->
          <view class="menu-item" @click="clearContext">
            <nut-icon name="del2" size="16" color="#F53F3F"></nut-icon>
            <text>清空当前对话</text>
          </view>
        </slot>
      </view>
    </nut-popup>
  </view>
</template>

<script>
import aiApi from '@/api/aiApi.js'
import chatApi from '@/api/chatApi.js'
import DateUtils from '@/utils/dateUtils.js'

export default {
  name: 'ChatComponent',
  props: {
    // 聊天类型：'project' | 'knowledge'
    chatType: {
      type: String,
      default: 'project'
    },
    // 关联的ID（项目ID或知识ID）
    relatedId: {
      type: String,
      required: true
    },
    // 上下文数据
    contextData: {
      type: Object,
      default: () => ({})
    },
    // 是否显示上下文信息
    showContext: {
      type: Boolean,
      default: true
    },
    // 系统提示词
    systemPrompt: {
      type: String,
      default: ''
    },
    // 默认欢迎消息
    defaultWelcomeMessage: {
      type: String,
      default: '你好！我是你的AI助手，有什么可以帮助你的吗？'
    },
    // 输入框占位符
    inputPlaceholder: {
      type: String,
      default: '输入你的问题...'
    },
    // 是否启用语音输入
    enableVoice: {
      type: Boolean,
      default: true
    },
    // 是否启用流式输出
    enableStream: {
      type: Boolean,
      default: true
    },
    // 自定义AI API调用函数
    customAiCall: {
      type: Function,
      default: null
    },
    // 当前对话ID
    currentConversationId: {
      type: String,
      default: null
    },
    // 自定义操作按钮处理函数
    handleActionClicked: {
      type: Function,
      default: null
    }
  },
  
  emits: [
    'message-sent',
    'message-received', 
    'action-clicked',
    'context-toggle',
    'menu-show',
    'menu-hide',
    'chat-init',
    'conversation-created',
    'conversation-loaded',
    'conversation-changed',
    'message-saved'
  ],
  
  data() {
    return {
      inputText: '',
      isThinking: false,
      isStreaming: false,
      streamContent: '',
      showMenu: false,
      messages: [],
      
      // 会话管理
      conversations: [],
      conversationId: null, // 内部会话ID
      
      // 智能滚动控制
      scrollTop: 0,
      scrollState: 'AUTO_FOLLOW',
      lastScrollTop: 0,
      lastScrollTime: 0,
      scrollDirection: 0,
      isAutoScrolling: false,
      userScrollThreshold: 30,
      nearBottomThreshold: 50,
      scrollDebounceTimer: null,
      autoScrollTimer: null,
      scrollThrottleTimer: null,
      lastThrottleTime: 0,
      lastContentHeight: 0
    }
  },
  
  computed: {
    // 获取当前会话ID，优先使用内部conversationId
    getCurrentConversationId() {
      return this.conversationId || this.currentConversationId
    }
  },
  
  async mounted() {
    // 初始化内部会话ID
    this.conversationId = this.currentConversationId
    // 初始化聊天
    await this.initChat()
    
    // 加载会话列表
    await this.loadConversations()
    
    // 滚动到底部
    this.$nextTick(() => {
      this.scrollToBottom(true)
    })
  },
  
  onUnload() {
    this.clearScrollTimers()
  },
  
  methods: {
    async initChat() {
      // 触发初始化事件，让父组件处理具体的初始化逻辑
      this.$emit('chat-init', {
        chatType: this.chatType,
        relatedId: this.relatedId,
        currentConversationId: this.currentConversationId
      })
    },
    
    // 消息会话处理方法
    async saveMessageToHistory(role, content, actions = []) {
      const currentId = this.getCurrentConversationId
      if (!currentId) return
      
      try {
        await chatApi.saveMessage(currentId, role, content)
        
        this.$emit('message-saved', {
          conversationId: currentId,
          role,
          content
        })
      } catch (error) {
        console.error('保存消息失败:', error)
      }
    },
    
    async loadChatHistory(conversationId) {
      if (!conversationId) return
      
      try {
        // const chatApi = (await import('@/api/chatApi.js')).default
        const messages = await chatApi.getConversationMessages(conversationId)
        
        this.setMessages(messages.map(msg => ({
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.timestamp
        })))
        
        this.$emit('conversation-loaded', {
          conversationId,
          messages: this.messages
        })
      } catch (error) {
        console.error('加载聊天历史失败:', error)
      }
    },
    
    async createOrLoadConversation() {
      try {
        // const chatApi = (await import('@/api/chatApi.js')).default
        
        // 尝试获取该类型和ID的最新对话
        const conversations = await chatApi.getConversationsByTypeAndId(this.chatType, this.relatedId)
        
        if (conversations.length > 0) {
          // 使用最新的对话
          const latestConversation = conversations[0]
          this.conversationId = latestConversation.id
          await this.loadChatHistory(latestConversation.id)
          this.$emit('conversation-changed', latestConversation.id)
          return latestConversation.id
        } else {
          // 创建新对话
          const conversationParams = {
            type: this.chatType,
            relatedId: this.relatedId,
            title: this.getDefaultConversationTitle(),
            createdAt: new Date().toISOString()
          }
          
          // 对于项目聊天，需要传递projectId
          if (this.chatType === 'project') {
            conversationParams.projectId = this.relatedId
          }
          
          const conversation = await chatApi.createConversation(conversationParams)
          
          this.conversationId = conversation.id
          this.$emit('conversation-created', {
            conversation,
            chatType: this.chatType,
            relatedId: this.relatedId
          })
          this.$emit('conversation-changed', conversation.id)
          
          return conversation.id
        }
      } catch (error) {
        console.error('创建或加载对话失败:', error)
        return null
      }
    },
    
    getDefaultConversationTitle() {
      const now = new Date()
      const timeStr = now.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      
      if (this.chatType === 'project') {
        return `项目聊天 - ${timeStr}`
      } else if (this.chatType === 'knowledge') {
        return `知识库聊天 - ${timeStr}`
      } else {
        return `聊天记录 - ${timeStr}`
      }
    },
    
    // 公共方法：添加消息
    addMessage(message) {
      this.messages.push({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      })
      this.$nextTick(() => {
        this.scrollToBottom()
      })
    },
    
    // 公共方法：设置消息列表
    setMessages(messages) {
      this.messages = messages
      this.$nextTick(() => {
        this.scrollToBottom()
      })
    },
    
    // 公共方法：清空消息
    clearMessages() {
      this.messages = []
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
      this.addMessage(userMessage)
      
      // 保存用户消息到历史记录
      await this.saveMessageToHistory('user', text)
      
      // 触发消息发送事件
      this.$emit('message-sent', {
        message: userMessage,
        chatType: this.chatType,
        relatedId: this.relatedId
      })
      
      this.inputText = ''
      
      // AI思考
      this.isThinking = true
      
      try {
        let aiResponse
        
        // 如果有自定义AI调用函数，使用自定义函数
        if (this.customAiCall) {
          // 开始流式响应
          this.isStreaming = true
          this.streamContent = ''
          
          aiResponse = await this.customAiCall(text, this.messages, this.contextData, {
            onStream: (chunk) => {
              // 流式更新内容
              this.streamContent += chunk
              this.scrollToBottom()
            }
          })
          
          // 流式完成，添加完整消息到列表
          this.isStreaming = false
          if (this.streamContent || aiResponse.content) {
            const finalContent = aiResponse.content || this.streamContent
            const aiMessage = {
              type: 'ai',
              content: finalContent,
              timestamp: new Date().toISOString(),
              actions: aiResponse.actions || []
            }
            this.addMessage(aiMessage)
            
            // 保存AI消息到历史记录
            await this.saveMessageToHistory('assistant', finalContent, aiResponse.actions || [])
            
            // 触发消息接收事件
            this.$emit('message-received', {
              message: aiMessage,
              chatType: this.chatType,
              relatedId: this.relatedId
            })
          }
          this.streamContent = ''
        } else {
          // 使用默认的AI调用
          aiResponse = await this.callDefaultAI(text)
          
          const aiMessage = {
            type: 'ai',
            content: aiResponse.content,
            timestamp: new Date().toISOString(),
            actions: aiResponse.actions || []
          }
          this.addMessage(aiMessage)
          
          // 保存AI消息到历史记录
          await this.saveMessageToHistory('assistant', aiResponse.content, aiResponse.actions || [])
          
          // 触发消息接收事件
          this.$emit('message-received', {
            message: aiMessage,
            chatType: this.chatType,
            relatedId: this.relatedId
          })
        }
        
      } catch (error) {
        console.error('AI回复失败:', error)
        this.isStreaming = false
        this.streamContent = ''
        
        const errorMessage = {
          type: 'ai',
          content: '抱歉，我暂时无法回答你的问题，请稍后再试。',
          timestamp: new Date().toISOString(),
          actions: []
        }
        this.addMessage(errorMessage)
      } finally {
        this.isThinking = false
        this.$nextTick(() => {
          this.scrollToBottom(true)
        })
      }
    },
    
    async callDefaultAI(userInput) {
      // 默认的AI调用逻辑
      try {
        // 构建聊天历史，包含系统提示词
        const chatHistory = []
        
        // 添加系统提示词（如果有）
        if (this.systemPrompt) {
          chatHistory.push({
            role: 'system',
            content: this.systemPrompt
          })
        }
        
        // 添加历史消息
        chatHistory.push(...this.messages.map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        })))
        
        // 添加当前用户输入
        chatHistory.push({
          role: 'user',
          content: userInput
        })
        
        const response = await aiApi.sendAIRequest(userInput, {
          type: this.chatType,
          relatedId: this.relatedId,
          context: this.contextData,
          messages: chatHistory,
          systemPrompt: this.systemPrompt
        })
        
        return {
          content: response.content || '我正在学习中，暂时无法回答这个问题。',
          actions: response.actions || []
        }
      } catch (error) {
        console.error('默认AI调用失败:', error)
        return {
          content: '抱歉，AI服务暂时不可用，请稍后再试。',
          actions: []
        }
      }
    },
    
    handleAction(action) {
      // 优先使用自定义的操作处理函数
      if (this.handleActionClicked && typeof this.handleActionClicked === 'function') {
        this.handleActionClicked(action)
      } else {
        // 触发动作点击事件，让父组件处理具体逻辑
        this.$emit('action-clicked', {
          action,
          chatType: this.chatType,
          relatedId: this.relatedId
        })
      }
    },
    
    toggleContext() {
      this.$emit('context-toggle')
    },
    
    showContextMenu() {
      // 使用 uni.showActionSheet 替换原有菜单
      const itemList = ['历史会话', '新建会话', '清空对话', '导出对话']
      
      uni.showActionSheet({
        itemList,
        success: (res) => {
          const index = res.tapIndex
          switch (index) {
            case 0:
              this.showConversationHistory()
              break
            case 1:
              this.createNewConversation()
              break
            case 2:
              this.clearContext()
              break
            case 3:
              this.exportChat()
              break
          }
        }
      })
      this.$emit('menu-show')
    },
    
    hideMenu() {
      this.showMenu = false
      this.$emit('menu-hide')
    },
    
    clearContext() {
      uni.showModal({
        title: '确认清空',
        content: '确定要清空所有对话记录吗？',
        success: (res) => {
          if (res.confirm) {
            this.clearMessages()
            this.hideMenu()
            uni.showToast({
              title: '对话已清空',
              icon: 'success'
            })
          }
        }
      })
    },
    
    toggleVoiceInput() {
      uni.showToast({
        title: '使用输入法自带语音输入',
        icon: 'none'
      })
    },
    
    formatTime(date) {
      const dateObj = date instanceof Date ? date : new Date(date)
      if (isNaN(dateObj.getTime())) {
        return '--:--'
      }
      const hours = String(dateObj.getHours()).padStart(2, '0')
      const minutes = String(dateObj.getMinutes()).padStart(2, '0')
      return `${hours}:${minutes}`
    },
    
    // 滚动相关方法
    onScroll(e) {
      const currentTime = Date.now()
      const currentScrollTop = e.detail.scrollTop
      
      // 节流处理
      if (currentTime - this.lastThrottleTime < 16) return // 约60fps
      this.lastThrottleTime = currentTime
      
      // 计算滚动方向
      this.scrollDirection = currentScrollTop > this.lastScrollTop ? 1 : -1
      
      // 检测用户主动滚动
      if (Math.abs(currentScrollTop - this.lastScrollTop) > this.userScrollThreshold && 
          !this.isAutoScrolling) {
        this.scrollState = 'USER_BROWSING'
      }
      
      this.lastScrollTop = currentScrollTop
      this.lastScrollTime = currentTime
      
      // 防抖处理
      if (this.scrollDebounceTimer) {
        clearTimeout(this.scrollDebounceTimer)
      }
      
      this.scrollDebounceTimer = setTimeout(() => {
        this.handleScrollEnd(currentScrollTop)
      }, 150)
    },
    
    handleScrollEnd(scrollTop) {
      // 检查是否接近底部
      uni.createSelectorQuery().in(this).select('#messageScrollView').boundingClientRect((rect) => {
        if (rect) {
          const isNearBottom = (rect.height + scrollTop) >= (this.lastContentHeight - this.nearBottomThreshold)
          
          if (isNearBottom && this.scrollState === 'USER_BROWSING') {
            this.scrollState = 'RETURNING_TO_BOTTOM'
            setTimeout(() => {
              this.scrollState = 'AUTO_FOLLOW'
            }, 500)
          }
        }
      }).exec()
    },
    
    scrollToBottom(force = false) {
      if (!force && this.scrollState === 'USER_BROWSING') {
        return
      }
      
      this.isAutoScrolling = true
      
      uni.createSelectorQuery().in(this).select('.message-list').boundingClientRect((rect) => {
        if (rect) {
          this.lastContentHeight = rect.height
          this.scrollTop = rect.height
          
          setTimeout(() => {
            this.isAutoScrolling = false
          }, 300)
        }
      }).exec()
    },
    
    throttledScrollToBottom() {
      if (this.autoScrollTimer) return
      
      this.autoScrollTimer = setTimeout(() => {
        this.scrollToBottom()
        this.autoScrollTimer = null
      }, 100)
    },
    
    clearScrollTimers() {
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
    },
    
    // 会话管理方法
    async loadConversations() {
      try {
        const conversations = await chatApi.getConversationsByTypeAndId(this.chatType, this.relatedId)
        this.conversations = conversations || []
      } catch (error) {
        console.error('加载会话列表失败:', error)
        this.conversations = []
      }
    },
    
    showConversationHistory() {
      if (this.conversations.length === 0) {
        uni.showToast({
          title: '暂无历史会话',
          icon: 'none'
        })
        return
      }
      
      const itemList = this.conversations.map(conv => {
        const preview = conv.title || this.getConversationPreview(conv)
        const time = this.formatConversationTime(conv.updated_at)
        return `${preview} (${time})`
      })
      
      uni.showActionSheet({
        itemList,
        success: (res) => {
          const conversation = this.conversations[res.tapIndex]
          this.selectConversation(conversation)
        }
      })
    },
    
    async createNewConversation() {
      try {
        const title = this.getDefaultConversationTitle()
        const conversationParams = {
          type: this.chatType,
          relatedId: this.relatedId,
          title
        }
        
        // 对于项目聊天，需要传递projectId
        if (this.chatType === 'project') {
          conversationParams.projectId = this.relatedId
        }
        
        const response = await chatApi.createConversation(conversationParams)
        
        this.conversationId = response.id
        this.clearMessages()
        await this.loadConversations()
        
        // 通知父组件会话ID变化
        this.$emit('conversation-changed', response.id)
        
        uni.showToast({
          title: '新会话已创建',
          icon: 'success'
        })
      } catch (error) {
        console.error('创建新会话失败:', error)
        uni.showToast({
          title: '创建会话失败',
          icon: 'error'
        })
      }
    },
    
    async selectConversation(conversation) {
      try {
        this.conversationId = conversation.id
        await this.loadChatHistory(conversation.id)
        
        // 通知父组件会话ID变化
        this.$emit('conversation-changed', conversation.id)
        
        uni.showToast({
          title: '会话已切换',
          icon: 'success'
        })
      } catch (error) {
        console.error('切换会话失败:', error)
        uni.showToast({
          title: '切换会话失败',
          icon: 'error'
        })
      }
    },
    
    async exportChat() {
      try {
        if (this.messages.length === 0) {
          uni.showToast({
            title: '暂无对话内容',
            icon: 'none'
          })
          return
        }
        
        const chatContent = this.messages.map(msg => {
          const time = this.formatTime(msg.timestamp)
          const role = msg.type === 'user' ? '用户' : 'AI助手'
          return `[${time}] ${role}: ${msg.content}`
        }).join('\n\n')
        
        // 复制到剪贴板
        uni.setClipboardData({
          data: chatContent,
          success: () => {
            uni.showToast({
              title: '对话已复制到剪贴板',
              icon: 'success'
            })
          }
        })
      } catch (error) {
        console.error('导出对话失败:', error)
        uni.showToast({
          title: '导出失败',
          icon: 'error'
        })
      }
    },
    
    getConversationPreview(conversation) {
      if (conversation.title) return conversation.title
      if (conversation.first_message) {
        return conversation.first_message.length > 20 
          ? conversation.first_message.substring(0, 20) + '...'
          : conversation.first_message
      }
      return '新对话'
    },
    
    formatConversationTime(timestamp) {
      const date = new Date(timestamp)
      const now = new Date()
      const diffTime = now - date
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        return this.formatTime(date)
      } else if (diffDays === 1) {
        return '昨天'
      } else if (diffDays < 7) {
        return `${diffDays}天前`
      } else {
        return date.toLocaleDateString()
      }
    },
    
    // 复制消息内容
    copyMessage(content) {
      try {
        uni.setClipboardData({
          data: content,
          success: () => {
            uni.showToast({
              title: '消息已复制',
              icon: 'success',
              duration: 1500
            })
          },
          fail: () => {
            uni.showToast({
              title: '复制失败',
              icon: 'error'
            })
          }
        })
      } catch (error) {
        console.error('复制消息失败:', error)
        uni.showToast({
          title: '复制失败',
          icon: 'error'
        })
      }
    },
    
    // 处理键盘事件
    handleKeyDown(event) {
      // Ctrl+Enter 或 Cmd+Enter 发送消息
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        this.sendMessage()
      }
    }
  }
}
</script>

<style scoped>
.chat-component {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #F2F3F5;
}

.context-info {
  background-color: #ffffff;
  border-bottom: 1rpx solid #E5E6EB;
}

.chat-messages {
  flex: 1;
  padding: 120rpx 40rpx 200rpx 40rpx;
}

.message-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
}

.user-message {
  flex-direction: row-reverse;
    max-width: calc(100% - 80rpx);

}

.message-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-message .message-avatar {
  background-color: #F2F3F5;
}

.user-message .message-avatar {
  background-color: #165DFF;
}

.message-content {
  flex: 1;
  max-width: calc(100% - 170rpx);
  min-width: 0;
}

.message-bubble {
  padding: 24rpx;
  border-radius: 16rpx;
  position: relative;
  word-wrap: break-word;
}

.ai-bubble {
  background-color: #ffffff;
  box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.user-bubble {
  background-color: #165DFF;
  color: #ffffff;
}

.message-text {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1D2129;
  display: block;
  white-space: pre-line;
}

.user-bubble .message-text {
  color: #ffffff;
}

.message-time {
  font-size: 24rpx;
  color: #86909C;
  margin-top: 8rpx;
  text-align: left;
}

.user-message .message-time {
  text-align: right;
}

.thinking {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.thinking-animation {
  display: flex;
  gap: 8rpx;
}

.dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background-color: #165DFF;
  animation: thinking 1.4s infinite ease-in-out;
}

.dot:nth-child(1) { animation-delay: -0.32s; }
.dot:nth-child(2) { animation-delay: -0.16s; }

@keyframes thinking {
  0%, 80%, 100% {
    transform: scale(0);
    opacity: 0.5;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}

.thinking-text {
  font-size: 24rpx;
  color: #86909C;
}

.streaming-indicator {
  display: inline;
}

.cursor {
  animation: blink 1s infinite;
  color: #165DFF;
  font-weight: bold;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.cursor {
  color: #165DFF;
  font-weight: bold;
  margin-left: 4rpx;
}

.cursor.blink {
  animation: blink 1s infinite;
}

.streaming {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.message-actions {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.action-btn {
  font-size: 24rpx !important;
  padding: 8rpx 16rpx !important;
  height: auto !important;
  min-height: 56rpx;
}

.input-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1rpx solid #E5E6EB;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  z-index: 100;
}

.input-container {
  display: flex;
  align-items: flex-end;
  gap: 16rpx;
  background-color: #F2F3F5;
  border-radius: 24rpx;
  padding: 16rpx 24rpx;
  min-height: 80rpx;
}

.chat-input {
  flex: 1;
  font-size: 28rpx;
  background: transparent;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.voice-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: #ffffff;
  transition: all 0.3s ease;
}

.voice-btn:active {
  background-color: #F2F3F5;
}

.send-btn {
  width: 64rpx !important;
  height: 64rpx !important;
  padding: 0 !important;
  border-radius: 32rpx !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-width: 64rpx !important;
  line-height: 1 !important;
}

.send-btn .nut-icon {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
}

.context-menu {
  padding: 32rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #E5E6EB;
  font-size: 28rpx;
  color: #1D2129;
  transition: all 0.3s ease;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background-color: #F2F3F5;
}
</style>