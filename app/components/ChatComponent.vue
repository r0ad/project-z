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
                <!-- 欢迎消息也使用ua-markdown渲染 -->
                <ua-markdown :source="defaultWelcomeMessage" :showLine="true" class="message-markdown" />
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
              <!-- 使用ua-markdown渲染消息内容 -->
              <ua-markdown :source="message.content" :showLine="true" class="message-markdown" />
              
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
              <!-- 流式内容使用ua-markdown渲染 -->
              <ua-markdown :source="streamContent" :showLine="true" class="message-markdown" />
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
    
    // 事件驱动的滚动控制
    scrollEventQueue: [], // 滚动事件队列
    isProcessingScrollEvent: false, // 是否正在处理滚动事件
    lastScrollEventTime: 0, // 上次滚动事件时间
    scrollEventThrottle: 100, // 滚动事件节流时间（毫秒）
    periodicScrollTimer: null, // 周期性滚动检查定时器
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
    
    // 初始化事件驱动的滚动系统
    this.initScrollEventSystem()
    
    // 使用事件驱动的方式初始滚动到底部
    this.enqueueScrollEvent('manual_trigger', true, { reason: 'initial_mount' })
    
    // 启动周期性滚动检查
    this.startPeriodicScrollCheck()
  },
  
  onUnload() {
    this.clearScrollTimers()
    this.clearScrollEventSystem()
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
      console.log('添加消息:', { 
        type: message.type, 
        contentLength: message.content.length,
        timestamp: Date.now()
      })
      this.messages.push({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      })
      // 使用事件驱动的方式触发滚动
      this.enqueueScrollEvent('message_added', false, { message })
    },
    
    // 公共方法：设置消息列表
    setMessages(messages) {
      this.messages = messages
      // 使用事件驱动的方式触发滚动
      this.enqueueScrollEvent('message_added', true, { bulk: true })
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
              // 使用事件驱动的方式处理流式更新滚动
              this.enqueueScrollEvent('stream_update', false, { chunkLength: chunk.length })
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
        // 只在非流式模式下才需要最终滚动，流式模式下已经在onStream中处理了滚动
        if (!this.isStreaming) {
          console.log('非流式模式，执行最终滚动')
          this.$nextTick(() => {
            this.scrollToBottom(true)
          })
        } else {
          console.log('流式模式，准备触发完成事件')
          // 流式完成后触发滚动事件，确保在DOM更新后执行
          this.$nextTick(() => {
            this.enqueueScrollEvent('stream_complete', true)
          })
        }
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
        isAutoScrolling: this.isAutoScrolling,
        timestamp: Date.now()
      })
      
      // 如果正在自动滚动，不进行状态判断
      if (this.isAutoScrolling) {
        console.log('自动滚动进行中，跳过状态检测')
        return
      }
      
      // 状态机逻辑
      this.updateScrollState(scrollDelta, isNearBottom, scrollSpeed)
    },
    
    // 更新滚动状态机（改进版）
    updateScrollState(scrollDelta, isNearBottom, scrollSpeed) {
      const previousState = this.scrollState
      
      // 改进的状态逻辑：
      // 1. 在底部或非常接近底部 = AUTO_FOLLOW
      // 2. 不在底部且向上滚动 = USER_BROWSING
      // 3. 从浏览状态向下滚动且接近底部 = RETURNING_TO_BOTTOM
      // 4. 从浏览状态向下滚动但远离底部 = USER_BROWSING（保持浏览状态）
      
      if (isNearBottom) {
        // 在底部或非常接近底部，恢复自动跟随
        this.scrollState = 'AUTO_FOLLOW'
      } else if (scrollDelta < -5) { // 降低向上滚动阈值
        // 向上滚动，进入浏览模式
        this.scrollState = 'USER_BROWSING'
      } else if (this.scrollState === 'USER_BROWSING' && scrollDelta > 5 && isNearBottom) {
        // 从浏览模式向下滚动且接近底部，进入返回底部模式
        this.scrollState = 'RETURNING_TO_BOTTOM'
      }
      // 如果从浏览状态向下滚动但不接近底部，保持浏览状态
      
      if (previousState !== this.scrollState) {
        console.log(`状态切换: ${previousState} → ${this.scrollState}`, {
          scrollDelta,
          isNearBottom,
          scrollSpeed: scrollSpeed.toFixed(2)
        })
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
      console.log('调用scrollToBottom', { 
        force, 
        scrollState: this.scrollState, 
        isAutoScrolling: this.isAutoScrolling,
        timestamp: Date.now(),
        stack: new Error().stack.split('\n').slice(1, 4).join(' <- ')
      })
      
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
      
      // 如果是强制滚动且已经在滚动中，清除现有滚动状态重新开始
      if (force && this.isAutoScrolling) {
        console.log('强制滚动调用，清除现有滚动状态重新开始')
        this.finishAutoScroll() // 清除现有滚动状态
      }
      
      this.$nextTick(() => {
        this.performAutoScroll(force)
      })
    },
    
    // 执行自动滚动的核心逻辑
    performAutoScroll(forceScroll = false) {
      console.log('开始执行智能滚动到底部', { 
        forceScroll,
        scrollState: this.scrollState,
        timestamp: Date.now(),
        stack: new Error().stack.split('\n').slice(1, 4).join(' <- ')
      })
      this.isAutoScrolling = true
      
      // 清除之前的定时器
      if (this.autoScrollTimer) {
        clearTimeout(this.autoScrollTimer)
      }
      
      const query = uni.createSelectorQuery().in(this)
      query.select('#messageScrollView').boundingClientRect()
      query.select('.message-list').boundingClientRect()
      query.exec((res) => {
        console.log('选择器查询结果:', res)
        
        if (res && res[0] && res[1]) {
          const scrollViewHeight = res[0].height
          const contentHeight = res[1].height
          const currentScrollTop = this.scrollTop
          
          console.log('滚动元素尺寸:', {
            scrollViewHeight,
            contentHeight,
            currentScrollTop,
            forceScroll
          })
          
          // 如果内容高度大于滚动视图高度，或者强制滚动，则滚动到底部
          if (contentHeight > scrollViewHeight || forceScroll) {
            let targetScrollTop = Math.max(0, contentHeight - scrollViewHeight)
            
            // 强制滚动时，即使内容高度不足也滚动到最大可能位置
            if (forceScroll && contentHeight <= scrollViewHeight) {
              targetScrollTop = contentHeight // 滚动到内容底部
              console.log('强制滚动到内容底部', { 
                contentHeight, 
                scrollViewHeight,
                targetScrollTop
              })
            }
            
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
            
            // 使用智能滚动策略：如果距离底部较近，直接滚动到底部；否则使用平滑滚动
            if (scrollDifference < 100) {
              console.log('距离底部较近，直接滚动到底部')
              this.scrollTop = targetScrollTop
              this.finishAutoScroll()
            } else {
              // 使用平滑滚动策略
              this.smoothScrollTo(targetScrollTop)
            }
          } else {
            // 即使内容高度不足，如果是强制滚动也应该滚动
            if (forceScroll) {
              const targetScrollTop = contentHeight // 滚动到内容底部
              console.log('强制滚动（内容高度不足）:', { 
                contentHeight, 
                scrollViewHeight,
                targetScrollTop
              })
              this.smoothScrollTo(targetScrollTop)
            } else {
              console.log('内容高度不足，无需滚动', { 
                contentHeight, 
                scrollViewHeight, 
                condition: contentHeight > scrollViewHeight 
              })
              this.finishAutoScroll()
            }
          }
        } else {
          console.warn('获取元素尺寸失败:', res)
          if (!res) {
            console.warn('选择器查询返回undefined')
          } else if (!res[0]) {
            console.warn('未找到#messageScrollView元素')
          } else if (!res[1]) {
            console.warn('未找到.message-list元素')
          }
          this.finishAutoScroll()
        }
      })
    },
    
    // 平滑滚动到指定位置
    smoothScrollTo(targetScrollTop) {
      console.log('设置滚动位置:', targetScrollTop)
      
      // 检查是否需要滚动（当前位置与目标位置差异大于1px）
      if (Math.abs(this.scrollTop - targetScrollTop) > 1) {
        this.scrollTop = targetScrollTop
        
        // 设置完成定时器
        this.autoScrollTimer = setTimeout(() => {
          this.finishAutoScroll()
        }, 300) // 减少等待时间
      } else {
        console.log('无需滚动，当前位置已接近目标位置')
        this.finishAutoScroll()
      }
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
    
    throttledScrollToBottom(force = false) {
      console.log('调用throttledScrollToBottom', { 
        force,
        scrollState: this.scrollState,
        lastThrottleTime: this.lastThrottleTime,
        timeSinceLastCall: this.lastThrottleTime ? Date.now() - this.lastThrottleTime : 'first call',
        timestamp: Date.now(),
        stack: new Error().stack.split('\n').slice(1, 4).join(' <- ')
      })
      
      // 如果不在自动跟随状态，不执行滚动
      if (!force && this.scrollState !== 'AUTO_FOLLOW') {
        console.log(`滚动状态为 ${this.scrollState}，跳过节流滚动`)
        return
      }
      
      const now = Date.now()
      
      // 节流控制：200ms内最多执行一次
      if (!force && now - this.lastThrottleTime < 200) {
        console.log('节流控制：200ms内跳过重复调用')
        return
      }
      
      // 如果已经有滚动定时器，取消之前的滚动
      if (this.autoScrollTimer) {
        clearTimeout(this.autoScrollTimer)
        this.autoScrollTimer = null
      }
      
      // 如果强制滚动，直接执行滚动
      if (force) {
        // 检查是否已经在滚动中，避免重复调用
        if (!this.isAutoScrolling) {
          this.scrollToBottom(true)
        } else {
          console.log('强制滚动调用，但滚动正在进行中，跳过重复调用')
        }
        return
      }
      
      // 使用$nextTick确保DOM更新完成后再检查内容高度
      this.$nextTick(() => {
        const query = uni.createSelectorQuery().in(this)
        query.select('.message-list').boundingClientRect()
        query.exec((res) => {
          if (res && res[0]) {
            const currentHeight = res[0].height
            
            console.log('内容高度检测:', {
              currentHeight,
              lastContentHeight: this.lastContentHeight,
              heightDifference: this.lastContentHeight ? currentHeight - this.lastContentHeight : 'first call',
              timestamp: Date.now()
            })
            
            // 如果高度增加少于50px，不滚动（提高阈值）
            if (this.lastContentHeight && currentHeight - this.lastContentHeight < 50) {
              console.log('内容高度增加不足50px，跳过滚动')
              return
            }
            
            this.lastContentHeight = currentHeight
            this.lastThrottleTime = now
            
            // 执行非强制滚动
            this.scrollToBottom(false)
          } else {
            console.warn('获取内容高度失败，直接执行滚动')
            this.lastThrottleTime = now
            this.scrollToBottom(false)
          }
        })
      })
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
    
    // 事件驱动的滚动系统
    initScrollEventSystem() {
      console.log('初始化事件驱动的滚动系统')
      this.scrollEventQueue = []
      this.isProcessingScrollEvent = false
      this.lastScrollEventTime = 0
    },
    
    clearScrollEventSystem() {
      this.scrollEventQueue = []
      this.isProcessingScrollEvent = false
      this.stopPeriodicScrollCheck()
      console.log('清理事件驱动的滚动系统')
    },
    
    // 启动周期性滚动检查
    startPeriodicScrollCheck() {
      console.log('启动周期性滚动检查')
      this.periodicScrollTimer = setInterval(() => {
        // 只有在有内容时才检查
        if (this.messages.length > 0 || this.isStreaming) {
          this.enqueueScrollEvent('periodic_check', false)
        }
      }, 1000) // 每秒检查一次
    },
    
    // 停止周期性滚动检查
    stopPeriodicScrollCheck() {
      if (this.periodicScrollTimer) {
        clearInterval(this.periodicScrollTimer)
        this.periodicScrollTimer = null
      }
    },
    
    // 添加滚动事件到队列
    enqueueScrollEvent(eventType, force = false, data = {}) {
      const now = Date.now()
      
      // 节流控制：相同类型的事件在短时间内只保留一个
      if (now - this.lastScrollEventTime < this.scrollEventThrottle) {
        const existingIndex = this.scrollEventQueue.findIndex(event => 
          event.type === eventType && !event.force
        )
        if (existingIndex !== -1) {
          this.scrollEventQueue.splice(existingIndex, 1)
        }
      }
      
      const event = {
        type: eventType,
        force,
        data,
        timestamp: now,
        priority: this.getScrollEventPriority(eventType)
      }
      
      this.scrollEventQueue.push(event)
      
      this.lastScrollEventTime = now
      
      console.log('添加滚动事件到队列:', {
        type: eventType,
        force: force,
        data: data,
        queueLength: this.scrollEventQueue.length,
        isProcessing: this.isProcessingScrollEvent
      })
      
      // 如果没有正在处理事件，立即开始处理
      if (!this.isProcessingScrollEvent) {
        this.processScrollEvents()
      }
    },
    
    // 获取滚动事件优先级
    getScrollEventPriority(eventType) {
      const priorities = {
        'message_added': 10,      // 消息添加最高优先级
        'stream_update': 8,        // 流式更新次高
        'stream_complete': 9,      // 流式完成高优先级
        'manual_trigger': 7,       // 手动触发中等
        'periodic_check': 1        // 周期性检查最低
      }
      return priorities[eventType] || 5
    },
    
    // 处理滚动事件队列
    async processScrollEvents() {
      if (this.isProcessingScrollEvent || this.scrollEventQueue.length === 0) {
        return
      }
      
      this.isProcessingScrollEvent = true
      
      try {
        // 按优先级排序（数字越大优先级越高）
        this.scrollEventQueue.sort((a, b) => b.priority - a.priority)
        
        let processedCount = 0
        const maxProcessPerCycle = 5 // 每个处理周期最多处理5个事件
        
        while (this.scrollEventQueue.length > 0 && processedCount < maxProcessPerCycle) {
          const event = this.scrollEventQueue.shift()
          
          console.log('处理滚动事件:', {
            type: event.type,
            force: event.force,
            priority: event.priority,
            queueLength: this.scrollEventQueue.length,
            processedCount: processedCount + 1
          })
          
          await this.handleScrollEvent(event)
          processedCount++
          
          // 处理完一个事件后稍微延迟，避免过于密集
          if (this.scrollEventQueue.length > 0) {
            await new Promise(resolve => setTimeout(resolve, 30))
          }
        }
        
        // 如果还有剩余事件，继续处理
        if (this.scrollEventQueue.length > 0) {
          setTimeout(() => {
            this.processScrollEvents()
          }, 100)
        }
        
      } catch (error) {
        console.error('处理滚动事件失败:', error)
      } finally {
        this.isProcessingScrollEvent = false
      }
    },
    
    // 处理单个滚动事件
    async handleScrollEvent(event) {
      const { type, force, data } = event
      
      switch (type) {
        case 'message_added':
          // 消息添加时立即滚动
          console.log('处理消息添加事件，强制滚动:', force)
          await this.$nextTick()
          this.scrollToBottom(force)
          break
          
        case 'stream_update':
          // 流式更新时智能滚动（内容显著变化才滚动）
          console.log('处理流式更新事件，chunk长度:', data.chunkLength)
          if (data.chunkLength > 10) {
            this.throttledScrollToBottom(true)
          }
          break
          
        case 'stream_complete':
          // 流式完成时强制滚动到底部
          console.log('处理流式完成事件')
          await this.$nextTick()
          this.scrollToBottom(true)
          break
          
        case 'manual_trigger':
          // 手动触发滚动
          console.log('处理手动触发事件，强制滚动:', force)
          this.scrollToBottom(force)
          break
          
        case 'periodic_check':
          // 周期性检查是否需要滚动
          console.log('处理周期性检查事件')
          this.checkAndScrollIfNeeded()
          break
          
        default:
          console.warn('未知的滚动事件类型:', type)
      }
    },
    
    // 获取内容高度
    getContentHeight() {
      // 简单估算内容高度：每条消息约100px + 其他元素
      const messageHeight = this.messages.length * 100
      const welcomeHeight = this.messages.length === 0 ? 200 : 0
      const streamingHeight = this.isStreaming ? 100 : 0
      const estimatedHeight = messageHeight + welcomeHeight + streamingHeight + 200 // 额外缓冲
      
      console.log('估算内容高度:', {
        messageCount: this.messages.length,
        hasWelcome: this.messages.length === 0,
        isStreaming: this.isStreaming,
        estimatedHeight: estimatedHeight
      })
      
      return estimatedHeight
    },
    
    // 获取滚动系统状态（用于调试）
    getScrollSystemStatus() {
      return {
        scrollState: this.scrollState,
        isAutoScrolling: this.isAutoScrolling,
        eventQueueLength: this.scrollEventQueue.length,
        isProcessingEvents: this.isProcessingScrollEvent,
        periodicTimerActive: !!this.periodicScrollTimer,
        lastEventTime: this.lastScrollEventTime,
        messagesCount: this.messages.length,
        isStreaming: this.isStreaming,
        streamContentLength: this.streamContent.length
      }
    },
    
    // 检查是否需要滚动并执行
    checkAndScrollIfNeeded() {
      if (this.scrollState === 'AUTO_FOLLOW') {
        // 只有在确实需要滚动时才执行
        this.$nextTick(() => {
          const scrollView = uni.createSelectorQuery().select('#messageScrollView')
          scrollView.fields({ scrollOffset: true, size: true }, (res) => {
            if (res) {
              const { scrollTop, height: scrollViewHeight } = res
              // 使用实际的内容高度而不是估算值
              const contentQuery = uni.createSelectorQuery().select('.message-list')
              contentQuery.fields({ size: true }, (contentRes) => {
                if (contentRes) {
                  const contentHeight = contentRes.height
                  
                  console.log('实际内容高度检测:', {
                    scrollTop,
                    scrollViewHeight,
                    contentHeight,
                    distanceFromBottom: contentHeight - scrollTop - scrollViewHeight,
                    threshold: this.nearBottomThreshold
                  })
                  
                  // 如果距离底部超过阈值，才执行滚动
                  const distanceFromBottom = contentHeight - scrollTop - scrollViewHeight
                  console.log('滚动判断条件:', {
                    distanceFromBottom,
                    threshold: this.nearBottomThreshold,
                    shouldScroll: distanceFromBottom > this.nearBottomThreshold
                  })
                  
                  if (distanceFromBottom > this.nearBottomThreshold || contentHeight < scrollViewHeight) {
                    // 如果距离底部超过阈值，或者内容高度小于视图高度（内容不足一屏），都执行滚动
                    console.log('执行滚动：', { 
                      reason: contentHeight < scrollViewHeight ? 'content_too_short' : 'distance_exceeds_threshold',
                      contentHeight, 
                      scrollViewHeight,
                      distanceFromBottom
                    })
                    this.scrollToBottom(false)
                  }
                }
              }).exec()
            }
          }).exec()
        })
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
  padding: 120rpx 40rpx 40rpx 40rpx;
  /* 设置明确的高度计算：总高度 - 顶部padding - 底部padding - 输入区域高度 */
  height: calc(100vh - 120rpx - 40rpx - 120rpx - 80rpx - 48rpx - 48rpx - env(safe-area-inset-bottom));
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

/* markdown组件样式 */
.message-markdown {
  font-size: 28rpx;
  line-height: 1.6;
  color: #1D2129;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.user-bubble .message-markdown {
  color: #ffffff;
}

/* 覆盖markdown组件内部样式以适应聊天气泡 */
.message-markdown /deep/ .ua__markdown {
  color: inherit;
}

.message-markdown /deep/ .ua__markdown p {
  margin: 0;
  padding: 0;
  color: inherit;
}

.message-markdown /deep/ .ua__markdown pre {
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 8rpx;
  padding: 16rpx;
  margin: 16rpx 0;
  overflow-x: auto;
}

.user-bubble .message-markdown /deep/ .ua__markdown pre {
  background-color: rgba(255, 255, 255, 0.1);
}

.message-markdown /deep/ .ua__markdown code {
  background-color: rgba(0, 0, 0, 0.05);
  padding: 4rpx 8rpx;
  border-radius: 4rpx;
  font-family: 'Courier New', monospace;
}

.user-bubble .message-markdown /deep/ .ua__markdown code {
  background-color: rgba(255, 255, 255, 0.1);
}

.message-markdown /deep/ .ua__markdown h1,
.message-markdown /deep/ .ua__markdown h2,
.message-markdown /deep/ .ua__markdown h3,
.message-markdown /deep/ .ua__markdown h4,
.message-markdown /deep/ .ua__markdown h5,
.message-markdown /deep/ .ua__markdown h6 {
  margin: 16rpx 0 8rpx 0;
  color: inherit;
  font-weight: bold;
}

.message-markdown /deep/ .ua__markdown ul,
.message-markdown /deep/ .ua__markdown ol {
  margin: 8rpx 0;
  padding-left: 32rpx;
}

.message-markdown /deep/ .ua__markdown li {
  margin: 4rpx 0;
  color: inherit;
}

.message-markdown /deep/ .ua__markdown blockquote {
  border-left: 4rpx solid #165DFF;
  padding-left: 16rpx;
  margin: 16rpx 0;
  color: inherit;
  opacity: 0.8;
}

.message-markdown /deep/ .ua__markdown table {
  border-collapse: collapse;
  width: 100%;
  margin: 16rpx 0;
}

.message-markdown /deep/ .ua__markdown th,
.message-markdown /deep/ .ua__markdown td {
  border: 1rpx solid #E5E6EB;
  padding: 12rpx;
  text-align: left;
  color: inherit;
}

.user-bubble .message-markdown /deep/ .ua__markdown th,
.user-bubble .message-markdown /deep/ .ua__markdown td {
  border-color: rgba(255, 255, 255, 0.3);
}

.message-markdown /deep/ .ua__markdown th {
  background-color: rgba(0, 0, 0, 0.05);
  font-weight: bold;
}

.user-bubble .message-markdown /deep/ .ua__markdown th {
  background-color: rgba(255, 255, 255, 0.1);
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