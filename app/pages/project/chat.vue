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

    <!-- 使用公共聊天组件 -->
    <ChatComponent
      ref="chatComponent"
      chat-type="project"
      :related-id="projectId"
      :context-data="contextData"
      :show-context="showContext"
      :default-welcome-message="welcomeMessage"
      input-placeholder="输入你的问题..."
      :enable-voice="true"
      :enable-stream="enableStream"
      :custom-ai-call="handleProjectAiCall"
      @message-sent="handleMessageSent"
      @message-received="handleMessageReceived"
      @action-clicked="handleActionClicked"
      @context-toggle="toggleContext"
      @menu-show="showMenu = true"
      @menu-hide="showMenu = false"
      @chat-init="initChat"
      @conversation-changed="handleConversationChanged"
    >
      <!-- 项目上下文信息插槽 -->
      <template #contextInfo="{ contextData, toggleContext }">
        <view class="context-info">
          <view class="context-compact">
            <nut-icon name="tips" size="14" color="#165DFF"></nut-icon>
            <text class="context-text">{{ projectName }} · {{ projectProgress }}% · {{ recentLogCount }}条日志</text>
            <view class="context-toggle" @click="toggleContext">
              <nut-icon name="close" size="12" color="#86909C"></nut-icon>
            </view>
          </view>
        </view>
      </template>

      <!-- 项目特定的消息操作按钮 -->
      <template #messageActions="{ actions, handleAction }">
        <view class="project-message-actions">
          <nut-button 
            v-for="action in actions" 
            :key="action.type"
            size="small"
            :type="getActionButtonType(action.type)"
            plain
            @click="handleProjectAction(action)"
            class="project-action-btn"
          >
            <nut-icon 
              :name="getActionIcon(action.type)" 
              size="12" 
              class="action-icon"
            ></nut-icon>
            {{ action.text }}
          </nut-button>
        </view>
      </template>


    </ChatComponent>

    <!-- 业务功能悬浮按钮 -->
    <view class="business-actions">
      <view class="business-btn" @click="convertToKnowledge">
        <nut-icon name="star" size="14" color="#165DFF"></nut-icon>
        <!-- <text class="business-text">转为知识</text> -->
      </view>
      <view class="business-btn" @click="showLogCountConfig">
        <nut-icon name="setting" size="14" color="#165DFF"></nut-icon>
        <!-- <text class="business-text">设置日志</text> -->
      </view>
    </view>

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
import ChatComponent from '@/components/ChatComponent.vue'

export default {
	components: {
		CustomNavbar,
		ChatComponent
	},
  data() {
    return {
      projectId: '',
      projectName: '',
      projectProgress: 0,
      recentLogCount: 0,
      showContext: true,
      showMenu: false,
      loading: false,
      
      contextData: {
        recentLogs: [],
        currentGoals: [],
        problems: []
      },

      enableStream: true,
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
  
  computed: {
    welcomeMessage() {
      return `你好！我是你的AI项目助手。我已经了解了你的项目「${this.projectName}」的基本情况，有什么问题可以随时问我。`
    }
  },
  
  onLoad(options) {
    this.projectId = options.projectId || ''
    this.projectName = options.projectName || '项目名称'
    this.projectProgress = parseInt(options.progress) || 0
    this.initChat()
  },
  
  onUnload() {
    // 清理资源
  },
  
  methods: {
    goBack() {
      uni.navigateBack()
    },
    

    
    async handleActionClicked(action) {
      // 处理AI消息中的操作按钮点击
      await this.handleAIAction(action)
    },
    
    handleMessageSent(event) {
      // 处理消息发送事件
      console.log('消息已发送:', event)
    },
    
    handleMessageReceived(event) {
      // 处理消息接收事件
      console.log('消息已接收:', event)
    },
    
    handleConversationChanged(conversationId) {
      this.currentConversationId = conversationId
      console.log('会话切换:', conversationId)
    },
    
    // 处理项目特定的操作按钮点击
    async handleProjectAction(action) {
      try {
        await this.handleAIAction(action)
      } catch (error) {
        console.error('处理项目操作失败:', error)
        uni.showToast({
          title: '操作失败，请重试',
          icon: 'error'
        })
      }
    },
    
    // 获取操作按钮的类型样式
    getActionButtonType(actionType) {
      const typeMap = {
        'manage_milestone': 'primary',
        'create_milestone': 'success', 
        'complete_milestone': 'warning',
        'update_progress': 'info',
        'update_plan': 'info',
        'save_solution': 'success',
        'get_suggestions': 'default',
        'retry': 'default'
      }
      return typeMap[actionType] || 'default'
    },
    
    // 获取操作按钮的图标
    getActionIcon(actionType) {
      const iconMap = {
        'manage_milestone': 'location',
        'create_milestone': 'plus',
        'complete_milestone': 'checked',
        'update_progress': 'refresh',
        'update_plan': 'edit',
        'save_solution': 'star-fill',
        'get_suggestions': 'tips',
        'retry': 'refresh'
      }
      return iconMap[actionType] || 'more'
    },
    
    async handleAICall(message, systemPrompt) {
      // 自定义AI调用逻辑
      return await this.callAI(message, systemPrompt)
    },
    
    async handleProjectAiCall(userInput, messages, contextData, options = {}) {
      // 项目特定的AI调用逻辑，包含上下文信息
      const systemPrompt = this.buildSystemPrompt()
      return await this.callAI(userInput, systemPrompt, options)
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
        if (this.$refs.chatComponent) {
          const conversationId = await this.$refs.chatComponent.createOrLoadConversation()
          if (conversationId) {
            this.currentConversationId = conversationId
          }
        }
        
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
    

    

    
    toggleContext() {
      this.showContext = !this.showContext
    },
    
    showContextMenu() {
      this.$refs.chatComponent.showContextMenu()
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
    
    formatConversationTime(date) {
      const dateObj = date instanceof Date ? date : new Date(date)
      
      if (isNaN(dateObj.getTime())) {
        return '未知时间'
      }
      
      const now = new Date()
      const diffMs = now - dateObj
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) {
        // 今天
        const hours = String(dateObj.getHours()).padStart(2, '0')
        const minutes = String(dateObj.getMinutes()).padStart(2, '0')
        return `今天 ${hours}:${minutes}`
      } else if (diffDays === 1) {
        // 昨天
        const hours = String(dateObj.getHours()).padStart(2, '0')
        const minutes = String(dateObj.getMinutes()).padStart(2, '0')
        return `昨天 ${hours}:${minutes}`
      } else if (diffDays < 7) {
        // 一周内
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        const weekday = weekdays[dateObj.getDay()]
        const hours = String(dateObj.getHours()).padStart(2, '0')
        const minutes = String(dateObj.getMinutes()).padStart(2, '0')
        return `${weekday} ${hours}:${minutes}`
      } else {
        // 超过一周
        const month = String(dateObj.getMonth() + 1).padStart(2, '0')
        const day = String(dateObj.getDate()).padStart(2, '0')
        return `${month}-${day}`
      }
    },
    
    getConversationPreview(conversation) {
      // 这里可以根据实际需求获取会话的最后一条消息作为预览
      // 暂时使用会话标题或默认文本
      if (conversation.title && conversation.title !== '新对话' && conversation.title !== '未命名会话') {
        return conversation.title
      }
      return '点击查看会话详情...'
    },
    

    
    async callAI(userInput, systemPrompt, options = {}) {
      try {
        // 构建聊天历史
        const chatHistory = this.$refs.chatComponent.messages.slice(-10).map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }))
        
        // 使用aiApi进行项目聊天（支持流式输出）
        let fullContent = ''
        const response = await aiApi.chatWithProject(this.projectId, userInput, chatHistory, {
          stream: true,
          onData: (chunk) => {
            fullContent += chunk
            // 如果有流式回调，调用它
            if (options.onStream) {
              options.onStream(chunk)
            }
          }
        })
        
        return {
          content: response.content || fullContent,
          actions: this.extractActions(response.content || fullContent)
        }
        
      } catch (error) {
        console.error('AI API调用失败:', error)
        
        // 降级到本地回复逻辑
        const responses = {
         /*  '进度': {
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
          } */
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
      
      /* if (content.includes('知识') || content.includes('经验')) {
        actions.push({ type: 'save_knowledge', text: '保存到知识库' })
      } */
      
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
    
    async handleAIAction(action) {
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
          const lastUserMessage = (this.messages || []).filter(m => m.type === 'user').pop()
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
        const pendingMilestones = (milestones || []).filter(m => m.status !== 'completed')
        
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
          this.selectedLogs = this.selectedLogIndexes
            .map(index => this.availableLogs[index])
            .filter(log => log !== undefined)
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
    },
    
    // 转为知识功能
    async convertToKnowledge() {
      this.showMenu = false
      
      try {
        // 从ChatComponent获取消息并检查是否有对话内容
        const messages = this.$refs.chatComponent ? this.$refs.chatComponent.messages : []
        if (!messages || messages.length === 0) {
          uni.showToast({
            title: '暂无对话内容',
            icon: 'none'
          })
          return
        }
        
        uni.showLoading({
          title: 'AI正在提取知识...'
        })
        
        // 调用AI提取知识的方法
        const knowledgeData = await this.extractKnowledgeFromChat()
        
        uni.hideLoading()
        
        if (knowledgeData) {
          // 跳转到知识创建页面，并传递提取的参数
          uni.navigateTo({
            url: `/pages/knowledge/create?data=${encodeURIComponent(JSON.stringify(knowledgeData))}`
          })
        }
      } catch (error) {
        uni.hideLoading()
        console.error('转换知识失败:', error)
        uni.showToast({
          title: '转换失败，请重试',
          icon: 'error'
        })
      }
    },
    
    // AI提取对话内容为知识库格式
    async extractKnowledgeFromChat() {
      try {
        // 从ChatComponent获取消息
        const messages = this.$refs.chatComponent ? this.$refs.chatComponent.messages : []
        
        if (!messages || messages.length === 0) {
          throw new Error('暂无对话内容可提取')
        }
        
        // 构建对话内容
        const chatContent = messages.map(msg => {
          return `${msg.type === 'user' ? '用户' : 'AI助手'}: ${msg.content}`
        }).join('\n\n')
        
        // 构建AI提示词
        const prompt = `请分析以下对话内容，提取出有价值的知识信息，并按照以下JSON格式返回：

{
  "title": "知识标题（简洁明了）",
  "content": "知识内容（详细描述）",
  "tags": ["标签1", "标签2"],
  "category": "知识分类",
  "summary": "知识摘要（一句话概括）"
}

对话内容：
${chatContent}

请确保返回的是有效的JSON格式，不要包含其他文字说明。`
        
        // 调用AI API
        const aiResponse = await aiApi.sendAIRequest(prompt)
        
        // 获取AI回复内容
        const aiContent = aiResponse.content || ''
        
        // 解析AI返回的JSON
        let knowledgeData
        try {
          // 尝试从AI响应中提取JSON
          const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            knowledgeData = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('AI返回格式不正确')
          }
        } catch (parseError) {
          console.error('解析AI返回数据失败:', parseError)
          // 如果解析失败，使用默认格式
          knowledgeData = {
            title: '从对话中提取的知识',
            content: aiContent,
            tags: ['对话提取'],
            category: '其他',
            summary: '从项目对话中提取的知识内容'
          }
        }
        
        // 添加项目ID
        knowledgeData.projectId = this.projectId
        
        return knowledgeData
      } catch (error) {
        console.error('AI提取知识失败:', error)
        throw error
      }
    }
  }
}
</script>

<style lang="scss" scoped>
/* 项目消息操作按钮样式 */
.project-message-actions {
  margin-top: 16rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.project-action-btn {
  font-size: 24rpx !important;
  padding: 8rpx 16rpx !important;
  height: auto !important;
  min-height: 56rpx;
  border-radius: 28rpx !important;
  display: flex;
  align-items: center;
  gap: 6rpx;
  transition: all 0.3s ease;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.project-action-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.project-action-btn .action-icon {
  margin-right: 4rpx;
}

/* 不同类型按钮的特殊样式 */
.project-action-btn[type="primary"] {
  background: linear-gradient(135deg, #165DFF 0%, #4080FF 100%);
  border: none;
  color: #ffffff;
}

.project-action-btn[type="success"] {
  background: linear-gradient(135deg, #00B42A 0%, #52C41A 100%);
  border: none;
  color: #ffffff;
}

.project-action-btn[type="warning"] {
  background: linear-gradient(135deg, #FF7D00 0%, #FFA940 100%);
  border: none;
  color: #ffffff;
}

.project-action-btn[type="info"] {
  background: linear-gradient(135deg, #00B2FF 0%, #40C9FF 100%);
  border: none;
  color: #ffffff;
}

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
      min-width: 300rpx;

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
  min-width: 600rpx;
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
}

/* 历史会话弹窗样式 */
.history-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.history-content {
  background: white;
  border-radius: 20rpx;
  width: 90%;
  max-width: 700rpx;
  max-height: 85%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(50rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.history-header {
  padding: 40rpx 30rpx 30rpx;
  border-bottom: 1px solid #eee;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  color: white;
}

.history-title-section {
  display: flex;
  align-items: center;
  gap: 15rpx;
}

.history-icon {
  font-size: 40rpx;
}

.history-title {
  font-size: 36rpx;
  font-weight: bold;
}

.conversation-count {
  font-size: 24rpx;
  opacity: 0.8;
  margin-top: 5rpx;
}

.close-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32rpx;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.new-conversation-btn {
  margin: 20rpx;
  padding: 25rpx;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  color: white;
  border: none;
  border-radius: 15rpx;
  font-size: 30rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15rpx;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(22, 93, 255, 0.3);
}

.new-conversation-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 6px 20px rgba(22, 93, 255, 0.4);
}

.history-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 20rpx 20rpx;
}

.conversation-item {
  padding: 30rpx 25rpx;
  margin-bottom: 15rpx;
  background: white;
  border-radius: 15rpx;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  border: 2px solid transparent;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
}

.conversation-item:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  border-color: #165dff;
}

.conversation-item.current {
  border-color: #165dff;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.05) 0%, rgba(114, 46, 209, 0.05) 100%);
}

.conversation-item.current::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 6rpx;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  border-radius: 0 3rpx 3rpx 0;
}

.conversation-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32rpx;
  flex-shrink: 0;
}

.conversation-info {
  flex: 1;
  min-width: 0;
}

.conversation-header {
  display: flex;
  align-items: center;
  gap: 15rpx;
  margin-bottom: 10rpx;
}

.conversation-title {
  font-size: 32rpx;
  color: #333;
  font-weight: 600;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.current-badge {
  background: #165dff;
  color: white;
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
  font-weight: 500;
}

.conversation-preview {
  font-size: 26rpx;
  color: #666;
  margin-bottom: 10rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-time {
  font-size: 24rpx;
  color: #999;
}

.conversation-actions {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.delete-btn {
  width: 60rpx;
  height: 60rpx;
  border-radius: 50%;
  background: #ff4757;
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  transition: all 0.3s ease;
  opacity: 0.8;
}

.delete-btn:hover {
  opacity: 1;
  transform: scale(1.1);
}

.empty-state {
  text-align: center;
  padding: 100rpx 40rpx;
  color: #999;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 30rpx;
  opacity: 0.3;
  color: #165dff;
}

.empty-text {
  font-size: 28rpx;
  margin-bottom: 40rpx;
  line-height: 1.5;
}

.create-btn {
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  color: white;
  border: none;
  padding: 25rpx 50rpx;
  border-radius: 25rpx;
  font-size: 28rpx;
  font-weight: 500;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(22, 93, 255, 0.3);
}

.create-btn:hover {
  transform: translateY(-2rpx);
  box-shadow: 0 6px 20px rgba(22, 93, 255, 0.4);
}

/* 业务功能悬浮按钮样式 */
.business-actions {
  position: fixed;
  right: 30rpx;
  bottom: 200rpx;
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.action-btn {
  width: 120rpx;
  height: 120rpx;
  border-radius: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24rpx;
  font-weight: 500;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  border: none;
  outline: none;
}

.action-btn:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.2);
}

.knowledge-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.knowledge-btn:hover {
  background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
}

.log-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.log-btn:hover {
  background: linear-gradient(135deg, #e881e9 0%, #e3455a 100%);
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
</style>