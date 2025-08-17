<template>
  <view class="chat-page">
    <!-- 自定义导航栏 -->
    <CustomNavbar 
      title="聊项目"
      right-icon="more"
      left-icon-color="#1D2129"
      right-icon-color="#1D2129"
      @left-click="goBack"
      @right-click="showContextMenu"
    />

    <!-- 项目上下文信息 -->
    <view class="context-info" v-if="showContext">
      <view class="context-compact">
        <nut-icon name="tips" size="14" color="#165DFF"></nut-icon>
        <text class="context-text">{{ projectName }} · {{ projectProgress }}% · {{ recentLogCount }}条日志</text>
        <view class="context-toggle" @click="toggleContext">
          <nut-icon name="close" size="12" color="#86909C"></nut-icon>
        </view>
      </view>
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
      <!-- <view class="config-options">
        <view class="option-item">
          <text class="option-label">流式输出</text>
          <switch 
            :checked="enableStream" 
            @change="onStreamToggle"
            color="#165dff"
          />
        </view>
      </view> -->
      
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
        <view class="menu-item" @click="showConversationHistory">
          <nut-icon name="message" size="16" color="#165DFF"></nut-icon>
          <text>历史会话</text>
        </view>
        <view class="menu-item" @click="createNewConversation">
          <nut-icon name="plus" size="16" color="#00B42A"></nut-icon>
          <text>新建会话</text>
        </view>
        <view class="menu-item" @click="showLogCountConfig">
          <nut-icon name="setting" size="16" color="#FF7D00"></nut-icon>
          <text>设置日志数量</text>
        </view>
        <view class="menu-item" @click="clearContext">
          <nut-icon name="delete" size="16" color="#F53F3F"></nut-icon>
          <text>清空当前对话</text>
        </view>
        <view class="menu-item" @click="exportChat">
          <nut-icon name="download" size="16" color="#00B42A"></nut-icon>
          <text>导出对话</text>
        </view>
      </view>
    </nut-popup>

    <!-- 会话列表弹窗 -->
    <nut-popup 
      v-model:visible="showConversationList" 
      position="bottom"
      :style="{ height: '60%' }"
    >
      <view class="conversation-list">
        <view class="popup-header">
          <text class="popup-title">历史会话</text>
          <nut-icon name="close" size="20" @click="showConversationList = false"></nut-icon>
        </view>
        <scroll-view class="conversation-scroll" scroll-y>
          <view 
            class="conversation-item" 
            v-for="conversation in conversations" 
            :key="conversation.id"
            @click="selectConversation(conversation.id)"
            :class="{ active: conversation.id === currentConversationId }"
          >
            <view class="conversation-info">
              <text class="conversation-title">{{ conversation.title || '未命名会话' }}</text>
              <text class="conversation-time">{{ formatTime(conversation.updated_at) }}</text>
            </view>
            <nut-icon 
              name="delete" 
              size="16" 
              color="#F53F3F" 
              @click.stop="deleteConversation(conversation.id)"
            ></nut-icon>
          </view>
          <view v-if="conversations.length === 0" class="empty-state">
            <text>暂无历史会话</text>
          </view>
        </scroll-view>
      </view>
    </nut-popup>

    <!-- 日志数量配置弹窗 -->
    <nut-popup 
      v-model:visible="showLogConfig" 
      position="center"
      :style="{ width: '90%', maxWidth: '400rpx' }"
    >
      <view class="log-config">
        <view class="popup-header">
          <text class="popup-title">设置日志数量</text>
          <nut-icon name="close" size="20" @click="cancelLogConfig" class="close-btn"></nut-icon>
        </view>
        
        <view class="config-content">
          <!-- 选择模式 -->
          <view class="mode-selector">
            <view class="mode-tabs">
              <view 
                class="mode-tab" 
                :class="{ active: logSelectionMode === 'quick' }"
                @click="logSelectionMode = 'quick'"
              >
                快捷选择
              </view>
              <view 
                class="mode-tab" 
                :class="{ active: logSelectionMode === 'manual' }"
                @click="logSelectionMode = 'manual'"
              >
                手动选择
              </view>
            </view>
          </view>
          
          <!-- 快捷选择模式 -->
          <view v-if="logSelectionMode === 'quick'" class="quick-mode">
            <text class="mode-label">选择最近的日志数量：</text>
            
            <view class="quick-buttons">
              <view 
                class="quick-btn" 
                :class="{ active: tempLogCount === 3 }"
                @click="setQuickLogCount(3)"
              >
                最近3条
              </view>
              <view 
                class="quick-btn" 
                :class="{ active: tempLogCount === 7 }"
                @click="setQuickLogCount(7)"
              >
                最近7条
              </view>
              <view 
                class="quick-btn" 
                :class="{ active: tempLogCount === 14 }"
                @click="setQuickLogCount(14)"
              >
                最近14条
              </view>
              <view 
                class="quick-btn" 
                :class="{ active: tempLogCount === 20 }"
                @click="setQuickLogCount(20)"
              >
                最近20条
              </view>
            </view>
            
            <!-- 自定义数量 -->
            <view class="custom-select">
              <text class="custom-label">或自定义数量：</text>
              <nut-input-number 
                v-model="tempLogCount" 
                :min="1" 
                :max="50"
                :step="1"
                class="custom-input"
              ></nut-input-number>
            </view>
          </view>
          
          <!-- 手动选择模式 -->
          <view v-if="logSelectionMode === 'manual'" class="manual-mode">
            <text class="mode-label">选择具体的日志条目：</text>
            
            <scroll-view class="log-list" scroll-y :style="{ height: '300rpx' }">
              <view 
                class="log-item" 
                v-for="(log, index) in availableLogs" 
                :key="index"
                @click="toggleLogSelection(index)"
                :class="{ selected: selectedLogIndexes.includes(index) }"
              >
                <view class="log-checkbox">
                  <nut-icon 
                    :name="selectedLogIndexes.includes(index) ? 'checked' : 'check-normal'" 
                    size="16" 
                    :color="selectedLogIndexes.includes(index) ? '#165DFF' : '#C9CDD4'"
                  ></nut-icon>
                </view>
                <view class="log-content">
                  <text class="log-text">{{ log.content }}</text>
                  <text class="log-time">{{ formatTime(log.timestamp) }}</text>
                </view>
              </view>
              
              <view v-if="availableLogs.length === 0" class="empty-logs">
                <text>暂无可选择的日志</text>
              </view>
            </scroll-view>
            
            <view class="selection-summary">
              <text class="summary-text">已选择 {{ selectedLogIndexes.length }} 条日志</text>
              <view class="selection-actions">
                <text class="action-link" @click="selectAllLogs">全选</text>
                <text class="action-link" @click="clearLogSelection">清空</text>
              </view>
            </view>
          </view>
          
          <view class="config-tip">
            <nut-icon name="tips" size="14" color="#999"></nut-icon>
            <text class="tip-text">{{ logSelectionMode === 'quick' ? '日志数量越多，AI理解上下文越准确，但会消耗更多token' : '选择相关的日志条目可以提供更精准的上下文信息' }}</text>
          </view>
        </view>
        
        <view class="config-actions">
          <nut-button type="default" @click="cancelLogConfig" class="action-btn">取消</nut-button>
          <nut-button type="primary" @click="saveLogCount" class="action-btn">确定</nut-button>
        </view>
      </view>
    </nut-popup>
  </view>
</template>

<script>
import aiApi from '@/api/aiApi.js'
import logApi from '@/api/logApi.js'
import chatApi from '@/api/chatApi.js'
import projectApi from '@/api/projectApi.js'
import CustomNavbar from '@/components/CustomNavbar.vue'

export default {
	components: {
		CustomNavbar
	},
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
      
      // 智能滚动控制系统
      scrollTop: 0, // 当前滚动位置
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
      isStreaming: false,
      
      // 会话管理
      conversations: [],
      showConversationList: false,
      logCount: 5, // 可配置的日志数量
      showLogConfig: false,
      tempLogCount: 5,
      
      // 日志选择功能
      logSelectionMode: 'quick', // 'quick' | 'manual'
      availableLogs: [], // 可选择的日志列表
      selectedLogIndexes: [], // 已选择的日志索引
      selectedLogs: [] // 已选择的具体日志
    }
  },
  
  onLoad(options) {
    this.projectId = options.projectId || ''
    this.projectName = options.projectName || '项目名称'
    this.projectProgress = parseInt(options.progress) || 0
    this.initChat()
  },
  
  onUnload() {
    // 清理所有滚动相关定时器
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
  
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    async initChat() {
      this.loading = true
      try {
        // 加载项目信息、最近日志和会话列表
        const [projectResult, logsResult, conversationsResult] = await Promise.all([
          projectApi.getProjectDetail(this.projectId),
          logApi.getRecentLogs(this.projectId, this.logCount),
          chatApi.getConversationsByProject(this.projectId)
        ])
        
        // 设置会话列表
        this.conversations = conversationsResult || []
        
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
      // 确保date是Date对象
      const dateObj = date instanceof Date ? date : new Date(date)
      
      // 检查是否是有效的日期
      if (isNaN(dateObj.getTime())) {
        return '--:--'
      }
      
      const hours = String(dateObj.getHours()).padStart(2, '0')
      const minutes = String(dateObj.getMinutes()).padStart(2, '0')
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
      
      // 强制滚动到底部（用户发送消息）
      this.$nextTick(() => {
        this.scrollState = 'AUTO_FOLLOW'
        this.scrollToBottom(true)
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
          this.scrollToBottom(true)
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
              // 使用节流滚动到底部（流式输出）
              this.$nextTick(() => {
                this.throttledScrollToBottom()
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
      /* if (content.includes('进度') || content.includes('完成')) {
        actions.push({ type: 'update_progress', text: '更新进度' })
      } */
      
      /* if (content.includes('问题') || content.includes('解决')) {
        actions.push({ type: 'save_solution', text: '保存解决方案' })
      } */
      
      /* if (content.includes('计划') || content.includes('建议')) {
        actions.push({ type: 'update_plan', text: '更新计划' })
      } */
      
      if (content.includes('知识') || content.includes('经验')) {
        actions.push({ type: 'save_knowledge', text: '保存到知识库' })
      }
      
      // 里程碑相关操作
      if (content.includes('里程碑') || content.includes('节点') || content.includes('阶段')) {
        actions.push({ type: 'manage_milestone', text: '管理里程碑' })
      }
      
      /* if (content.includes('创建') && (content.includes('里程碑') || content.includes('节点'))) {
        actions.push({ type: 'create_milestone', text: '创建里程碑' })
      } */
      
      if (content.includes('完成') && (content.includes('里程碑') || content.includes('节点'))) {
        actions.push({ type: 'complete_milestone', text: '标记完成' })
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
        case 'manage_milestone':
          await this.manageMilestone()
          break
        case 'create_milestone':
          await this.createMilestone()
          break
        case 'complete_milestone':
          await this.completeMilestone()
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
    
    // 里程碑管理相关方法
    async manageMilestone() {
      try {
        // 确保projectId存在
        if (!this.projectId) {
          uni.showToast({
            title: '项目信息缺失',
            icon: 'error'
          })
          return
        }
        
        // 跳转到项目详情页面的里程碑管理，传递当前项目ID
        uni.navigateTo({
          url: `/pages/project/detail?projectId=${this.projectId}&tab=milestones&from=chat`
        })
      } catch (error) {
        console.error('跳转失败:', error)
        uni.showToast({
          title: '跳转失败',
          icon: 'error'
        })
      }
    },
    
    async createMilestone() {
      try {
        // 显示创建里程碑的输入框
        uni.showModal({
          title: '创建里程碑',
          editable: true,
          placeholderText: '请输入里程碑标题',
          success: async (res) => {
            if (res.confirm && res.content) {
              const milestoneData = {
                title: res.content,
                description: '',
                status: 'pending',
                progress: 0,
                deadline: null
              }
              
              await projectApi.createMilestone(this.projectId, milestoneData)
              
              // 添加AI回复确认创建成功
              const confirmMessage = {
                type: 'ai',
                content: `已成功创建里程碑「${res.content}」。你可以在项目详情页面查看和管理所有里程碑。`,
                timestamp: new Date().toISOString(),
                actions: [{ type: 'manage_milestone', text: '查看里程碑' }]
              }
              this.messages.push(confirmMessage)
              
              // 保存AI消息到数据库
              await this.saveMessageToHistory('assistant', confirmMessage.content)
              
              this.$nextTick(() => {
                this.scrollToBottom()
              })
              
              uni.showToast({
                title: '里程碑创建成功',
                icon: 'success'
              })
            }
          }
        })
      } catch (error) {
        console.error('创建里程碑失败:', error)
        uni.showToast({
          title: '创建失败',
          icon: 'error'
        })
      }
    },
    
    async completeMilestone() {
      try {
        // 获取项目的里程碑列表
        const milestones = await projectApi.getProjectMilestones(this.projectId)
        const pendingMilestones = milestones.filter(m => m.status !== 'completed')
        
        if (pendingMilestones.length === 0) {
          uni.showToast({
            title: '暂无待完成的里程碑',
            icon: 'none'
          })
          return
        }
        
        // 显示里程碑选择列表
        const itemList = pendingMilestones.map(m => m.title)
        uni.showActionSheet({
          itemList: itemList,
          success: async (res) => {
            const selectedMilestone = pendingMilestones[res.tapIndex]
            
            // 标记里程碑为完成
            await projectApi.updateMilestone(selectedMilestone.id, {
              status: 'completed',
              progress: 100
            })
            
            // 添加AI回复确认完成
            const confirmMessage = {
              type: 'ai',
              content: `恭喜！已将里程碑「${selectedMilestone.title}」标记为完成。项目进度已自动更新。`,
              timestamp: new Date().toISOString(),
              actions: [{ type: 'manage_milestone', text: '查看进度' }]
            }
            this.messages.push(confirmMessage)
            
            // 保存AI消息到数据库
            await this.saveMessageToHistory('assistant', confirmMessage.content)
            
            // 刷新项目信息
            await this.loadProjectContext()
            
            this.$nextTick(() => {
              this.scrollToBottom()
            })
            
            uni.showToast({
              title: '里程碑已完成',
              icon: 'success'
            })
          }
        })
      } catch (error) {
        console.error('完成里程碑失败:', error)
        uni.showToast({
          title: '操作失败',
          icon: 'error'
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
    
    // 会话管理方法
    showConversationHistory() {
      this.showMenu = false
      this.showConversationList = true
    },
    
    async createNewConversation() {
      this.showMenu = false
      try {
        // 创建新会话
        const newConversation = await chatApi.createConversation({
          projectId: this.projectId,
          title: '新对话'
        })
        this.currentConversationId = newConversation.id
        this.messages = []
        
        // 重新加载会话列表
        this.conversations = await chatApi.getConversationsByProject(this.projectId)
        
        uni.showToast({
          title: '新会话已创建',
          icon: 'success'
        })
      } catch (error) {
        console.error('创建新会话失败:', error)
        uni.showToast({
          title: '创建失败',
          icon: 'none'
        })
      }
    },
    
    async selectConversation(conversation) {
      try {
        this.currentConversationId = conversation.id
        this.showConversationList = false
        
        // 加载选中会话的消息
        const messages = await chatApi.getMessages(conversation.id)
        this.messages = messages.map(msg => ({
          type: msg.role === 'user' ? 'user' : 'ai',
          content: msg.content,
          timestamp: msg.timestamp || msg.created_at,
          actions: msg.role === 'assistant' ? this.extractActions(msg.content) : undefined
        }))
        
        uni.showToast({
          title: '会话已切换',
          icon: 'success'
        })
      } catch (error) {
        console.error('切换会话失败:', error)
        uni.showToast({
          title: '切换失败',
          icon: 'none'
        })
      }
    },
    
    async deleteConversation(conversation) {
      uni.showModal({
        title: '确认删除',
        content: `确定要删除会话"${conversation.title}"吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              await chatApi.deleteConversation(conversation.id)
              
              // 重新加载会话列表
              this.conversations = await chatApi.getConversationsByProject(this.projectId)
              
              // 如果删除的是当前会话，创建新会话
              if (this.currentConversationId === conversation.id) {
                await this.createNewConversation()
              }
              
              uni.showToast({
                title: '会话已删除',
                icon: 'success'
              })
            } catch (error) {
              console.error('删除会话失败:', error)
              uni.showToast({
                title: '删除失败',
                icon: 'none'
              })
            }
          }
        }
      })
    },
    
    async showLogCountConfig() {
      this.showMenu = false
      this.tempLogCount = this.logCount
      
      try {
        // 加载所有可用的日志用于手动选择
        const allLogs = await logApi.getRecentLogs(this.projectId, 50) // 获取最近50条日志
        this.availableLogs = allLogs || []
        
        // 如果当前使用的是手动选择的日志，恢复选择状态
        if (this.selectedLogs.length > 0) {
          this.selectedLogIndexes = []
          this.selectedLogs.forEach(selectedLog => {
            const index = this.availableLogs.findIndex(log => 
              log.id === selectedLog.id || 
              (log.content === selectedLog.content && log.timestamp === selectedLog.timestamp)
            )
            if (index > -1) {
              this.selectedLogIndexes.push(index)
            }
          })
        }
      } catch (error) {
        console.error('加载日志列表失败:', error)
        this.availableLogs = []
      }
      
      this.showLogConfig = true
    },
    
    async saveLogCount() {
      this.showLogConfig = false
      
      try {
        if (this.logSelectionMode === 'quick') {
          // 快捷选择模式：使用数量
          this.logCount = this.tempLogCount
          const logsResult = await logApi.getRecentLogs(this.projectId, this.logCount)
          this.contextData.recentLogs = logsResult || []
          this.selectedLogs = []
        } else {
          // 手动选择模式：使用选中的日志
          this.selectedLogs = this.selectedLogIndexes.map(index => this.availableLogs[index])
          this.contextData.recentLogs = this.selectedLogs
          this.logCount = this.selectedLogs.length
        }
        
        this.recentLogCount = this.contextData.recentLogs.length
        
        uni.showToast({
          title: `已设置${this.recentLogCount}条日志`,
          icon: 'success'
        })
      } catch (error) {
        console.error('更新日志配置失败:', error)
        uni.showToast({
          title: '更新失败',
          icon: 'none'
        })
      }
    },
    
    cancelLogConfig() {
      this.showLogConfig = false
      // 重置临时变量
      this.tempLogCount = this.logCount
      this.selectedLogIndexes = []
    },
    
    // 日志选择相关方法
    setQuickLogCount(count) {
      this.tempLogCount = count
    },
    
    toggleLogSelection(index) {
      const selectedIndex = this.selectedLogIndexes.indexOf(index)
      if (selectedIndex > -1) {
        // 取消选择
        this.selectedLogIndexes.splice(selectedIndex, 1)
      } else {
        // 添加选择
        this.selectedLogIndexes.push(index)
      }
    },
    
    selectAllLogs() {
      this.selectedLogIndexes = this.availableLogs.map((_, index) => index)
    },
    
    clearLogSelection() {
      this.selectedLogIndexes = []
    },
    
    // 智能滚动系统方法
    
    // 检查是否接近底部
    checkNearBottom(scrollTop, scrollHeight, clientHeight) {
      return scrollTop + clientHeight >= scrollHeight - this.nearBottomThreshold
    },
    
    // 滚动到底部（智能滚动入口）
    scrollToBottom(force = false) {
      // 如果不是强制滚动且不在自动跟随状态，跳过
      if (!force && this.scrollState !== 'AUTO_FOLLOW') {
        console.log(`滚动状态为 ${this.scrollState}，跳过自动滚动`)
        return
      }
      
      // 如果不是强制滚动且正在自动滚动中，跳过
      if (!force && this.isAutoScrolling) {
        return
      }
      
      // 执行自动滚动
      this.performAutoScroll(force)
    },
    
    // 执行自动滚动
    performAutoScroll(forceScroll = false) {
      console.log('开始执行智能滚动到底部', { forceScroll })
      this.isAutoScrolling = true
      
      // 清除之前的自动滚动定时器
      if (this.autoScrollTimer) {
        clearTimeout(this.autoScrollTimer)
      }
      
      const query = uni.createSelectorQuery().in(this)
      query.select('#messageScrollView').boundingClientRect()
      query.select('.message-list').boundingClientRect()
      query.exec((res) => {
        if (res && res[0] && res[1]) {
          const scrollViewHeight = res[0].height
          const contentHeight = res[1].height
          const currentScrollTop = this.scrollTop
          
          // 如果内容高度大于滚动视图高度，需要滚动
          if (contentHeight > scrollViewHeight) {
            const targetScrollTop = Math.max(0, contentHeight - scrollViewHeight)
            const scrollDifference = Math.abs(currentScrollTop - targetScrollTop)
            
            console.log('滚动计算:', {
              contentHeight,
              scrollViewHeight,
              currentScrollTop,
              targetScrollTop,
              scrollDifference,
              forceScroll
            })
            
            // 如果不是强制滚动且滚动差异很小，不需要滚动
            if (!forceScroll && scrollDifference < 10) {
              console.log('滚动差异很小，跳过滚动')
              this.finishAutoScroll()
              return
            }
            
            // 执行平滑滚动
            this.smoothScrollTo(targetScrollTop)
          } else {
            this.finishAutoScroll()
          }
        } else {
          this.finishAutoScroll()
        }
      })
    },
    
    // 平滑滚动到指定位置
    smoothScrollTo(targetScrollTop) {
      console.log('设置滚动位置:', targetScrollTop)
      this.scrollTop = targetScrollTop
      
      // 设置自动滚动完成定时器
      this.autoScrollTimer = setTimeout(() => {
        this.finishAutoScroll()
      }, 300) // 等待滚动动画完成
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
      query.select('.message-list').boundingClientRect()
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
    
    // 滚动事件处理
    onScroll(e) {
      const { scrollTop, scrollHeight, scrollLeft } = e.detail
      const now = Date.now()
      
      // 防抖处理：清除之前的防抖定时器
      if (this.scrollDebounceTimer) {
        clearTimeout(this.scrollDebounceTimer)
      }
      
      // 如果正在自动滚动，不处理用户滚动
      if (this.isAutoScrolling) {
        return
      }
      
      // 计算滚动方向
      const direction = scrollTop > this.lastScrollTop ? 'down' : 'up'
      this.scrollDirection = direction
      
      // 更新滚动位置和时间
      this.lastScrollTop = scrollTop
      this.lastScrollTime = now
      
      // 防抖处理滚动状态变化
      this.scrollDebounceTimer = setTimeout(() => {
        this.handleScrollStateChange(scrollTop, scrollHeight)
      }, 150)
    },
    
    // 处理滚动状态变化
    handleScrollStateChange(scrollTop, scrollHeight) {
      const query = uni.createSelectorQuery().in(this)
      query.select('#messageScrollView').boundingClientRect()
      query.exec((res) => {
        if (res && res[0]) {
          const scrollViewHeight = res[0].height
          const isNearBottom = this.checkNearBottom(scrollTop, scrollHeight, scrollViewHeight)
          
          console.log('滚动状态检查:', {
            scrollTop,
            scrollHeight,
            scrollViewHeight,
            isNearBottom,
            currentState: this.scrollState
          })
          
          // 根据滚动位置更新状态
          if (isNearBottom) {
            // 接近底部，切换到自动跟随状态
            if (this.scrollState !== 'AUTO_FOLLOW') {
              console.log('切换到自动跟随状态')
              this.scrollState = 'AUTO_FOLLOW'
            }
          } else {
            // 不在底部，切换到用户浏览状态
            if (this.scrollState !== 'USER_BROWSING') {
              console.log('切换到用户浏览状态')
              this.scrollState = 'USER_BROWSING'
            }
          }
        }
      })
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
  padding-top: calc(var(--status-bar-height) + 120rpx);
  padding-bottom: 0;
}

.context-info {
  position: fixed;
  top: calc(var(--status-bar-height) + 120rpx);
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e6eb;
  z-index: 100;
  
  .context-compact {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 16rpx 32rpx;
    
    .context-text {
      font-size: 24rpx;
      color: #4e5969;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    
    .context-toggle {
      padding: 8rpx;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }
}

.chat-messages {
  flex: 1;
  padding: 32rpx;
  margin-top: 80rpx; /* 为固定的上下文信息留出空间 */
  margin-bottom: 200rpx; /* 为固定的输入区域留出空间 */
}

.message-list {
  .message-item {
    display: flex;
    margin-bottom: 32rpx;
    
    &.user-message {
      flex-direction: row-reverse;
      
      .message-content {
        align-items: flex-end;
        
        .message-time {
          text-align: right;
        }
      }
      
      .message-avatar {
        background-color: #165dff;
        margin: 0 16rpx 0 0; /* 用户头像右边距 */
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
          border: 1rpx solid #165dff;
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
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e6eb;
  padding: 24rpx 32rpx;
  z-index: 100;
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.1);
  
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

// 日志配置弹窗样式
.log-config {
  background-color: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
  
  .popup-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx 32rpx 24rpx;
    border-bottom: 1rpx solid #f2f3f5;
    
    .popup-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #1d2129;
    }
    
    .close-btn {
      padding: 8rpx;
      color: #86909c;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
  
  .config-content {
    padding: 32rpx;
  }
  
  .config-tip {
    display: flex;
    align-items: flex-start;
    gap: 12rpx;
    padding: 24rpx;
    background-color: #f8f9fa;
    border-radius: 12rpx;
    margin: 24rpx 0;
    
    .tip-text {
      font-size: 24rpx;
      color: #86909c;
      line-height: 1.5;
      flex: 1;
    }
  }
  
  .config-actions {
    display: flex;
    gap: 24rpx;
    padding: 24rpx 32rpx 32rpx;
    border-top: 1rpx solid #f2f3f5;
    
    .action-btn {
      flex: 1;
      height: 80rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
    }
  }
}

// 日志选择界面样式
.mode-selector {
  margin-bottom: 32rpx;
  
  .mode-tabs {
    display: flex;
    background-color: #f2f3f5;
    border-radius: 12rpx;
    padding: 4rpx;
    
    .mode-tab {
      flex: 1;
      text-align: center;
      padding: 16rpx 24rpx;
      font-size: 28rpx;
      color: #86909c;
      border-radius: 8rpx;
      transition: all 0.3s;
      
      &.active {
        background-color: #ffffff;
        color: #165dff;
        box-shadow: 0 2rpx 8rpx rgba(22, 93, 255, 0.1);
      }
    }
  }
}

.quick-mode, .manual-mode {
  .mode-label {
    font-size: 28rpx;
    color: #1d2129;
    margin-bottom: 24rpx;
    display: block;
  }
}

.quick-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16rpx;
  margin-bottom: 32rpx;
  
  .quick-btn {
    padding: 20rpx 24rpx;
    background-color: #f2f3f5;
    color: #4e5969;
    border-radius: 12rpx;
    font-size: 26rpx;
    text-align: center;
    transition: all 0.3s;
    border: 2rpx solid transparent;
    
    &.active {
      background-color: #165dff;
      color: #ffffff;
      border-color: #165dff;
      box-shadow: 0 4rpx 12rpx rgba(22, 93, 255, 0.2);
    }
    
    &:active {
      transform: scale(0.95);
    }
    
    &:hover {
      background-color: #e8f4ff;
      border-color: #b3d8ff;
    }
  }
}

.custom-select {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
  padding: 24rpx;
  background-color: #f8f9fa;
  border-radius: 12rpx;
  border: 1rpx solid #e5e6eb;
  
  .custom-label {
    font-size: 26rpx;
    color: #4e5969;
    white-space: nowrap;
  }
  
  .custom-input {
    flex: 1;
    min-width: 120rpx;
  }
}

.log-list {
  border: 1rpx solid #e5e6eb;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  background-color: #ffffff;
  
  .log-item {
    display: flex;
    align-items: flex-start;
    padding: 24rpx;
    border-bottom: 1rpx solid #f2f3f5;
    transition: all 0.3s;
    cursor: pointer;
    
    &:last-child {
       border-bottom: none;
     }
     
     &.selected {
       background-color: #f0f7ff;
       border-left: 4rpx solid #165dff;
     }
    
    &:active {
      background-color: #f8f9fa;
    }
    
    .log-checkbox {
      margin-right: 16rpx;
      margin-top: 4rpx;
    }
    
    .log-content {
      flex: 1;
      
      .log-text {
        font-size: 26rpx;
        color: #1d2129;
        line-height: 1.5;
        display: block;
        margin-bottom: 8rpx;
        word-break: break-all;
      }
      
      .log-time {
        font-size: 22rpx;
        color: #86909c;
      }
    }
  }
  
  .empty-logs {
    padding: 60rpx 24rpx;
    text-align: center;
    color: #86909c;
    font-size: 26rpx;
  }
}

.selection-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background-color: #f8f9fa;
  border-radius: 12rpx;
  margin-bottom: 24rpx;
  
  .summary-text {
    font-size: 26rpx;
    color: #4e5969;
  }
  
  .selection-actions {
    display: flex;
    gap: 24rpx;
    
    .action-link {
      font-size: 26rpx;
      color: #165dff;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
    
    &.selected {
      background-color: #f0f7ff;
    }
    
    &:active {
      background-color: #e8f4ff;
    }
    
    .log-checkbox {
      margin-right: 16rpx;
      margin-top: 4rpx;
    }
    
    .log-content {
      flex: 1;
      
      .log-text {
        font-size: 26rpx;
        color: #1d2129;
        line-height: 1.5;
        display: block;
        margin-bottom: 8rpx;
      }
      
      .log-time {
        font-size: 22rpx;
        color: #86909c;
      }
    }
  }
  
  .empty-logs {
    padding: 60rpx 24rpx;
    text-align: center;
    color: #86909c;
    font-size: 26rpx;
  }
}

.selection-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
  
  .summary-text {
    font-size: 26rpx;
    color: #4e5969;
  }
  
  .selection-actions {
    display: flex;
    gap: 24rpx;
    
    .action-link {
      font-size: 26rpx;
      color: #165dff;
      
      &:active {
        opacity: 0.7;
      }
    }
  }
}
</style>