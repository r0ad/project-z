<template>
  <view class="share-card-modal" v-if="visible" @click="handleMaskClick">
    <view class="share-card-container" @click.stop>
      <!-- 头部标题 -->
      <view class="share-header">
        <text class="share-title">分享卡片</text>
        <nut-icon name="close" size="20" color="#86909C" @click="closeModal"></nut-icon>
      </view>
      
      <!-- 主题选择 -->
      <view class="theme-selector">
        <text class="selector-label">选择主题</text>
        <view class="theme-list">
          <view 
            v-for="theme in themeList" 
            :key="theme.key"
            class="theme-item"
            :class="{ active: selectedTheme === theme.key }"
            @click="selectTheme(theme.key)"
          >
            <view class="theme-preview" :class="theme.key">
              <view class="preview-header"></view>
              <view class="preview-content">
                <view class="preview-line long"></view>
                <view class="preview-line medium"></view>
                <view class="preview-line short"></view>
              </view>
            </view>
            <text class="theme-name">{{ theme.name }}</text>
          </view>
        </view>
      </view>
      
      <!-- 卡片预览 -->
      <view class="card-preview">
        <text class="preview-label">预览效果</text>
        <view class="preview-container">
          <!-- 简化的文本预览 -->
          <view class="text-preview" :class="selectedTheme">
            <view class="preview-header">
              <text class="preview-title">{{ adaptedContent.title || '标题' }}</text>
            </view>
            
            <view class="preview-tags" v-if="adaptedContent.tags && adaptedContent.tags.length > 0">
              <text 
                v-for="tag in adaptedContent.tags.slice(0, 3)" 
                :key="tag"
                class="preview-tag"
              >
                {{ tag }}
              </text>
            </view>
            
            <view class="preview-content">
              <text class="preview-text">{{ adaptedContent.content || '内容' }}</text>
              
              <!-- 进度显示 -->
              <view v-if="adaptedContent.progress !== undefined" class="preview-progress">
                <text class="progress-label">进度: {{ adaptedContent.progress }}%</text>
                <view class="progress-bar">
                  <view class="progress-fill" :style="{ width: adaptedContent.progress + '%' }"></view>
                </view>
              </view>
              
              <!-- 里程碑显示 -->
              <view v-if="adaptedContent.milestones && adaptedContent.milestones.length > 0" class="preview-milestones">
                <text class="milestone-label">里程碑:</text>
                <view 
                  v-for="milestone in adaptedContent.milestones.slice(0, 2)" 
                  :key="milestone.id"
                  class="milestone-item"
                >
                  <text class="milestone-status" :class="milestone.status">{{ milestone.status === 'completed' ? '✓' : '○' }}</text>
                  <text class="milestone-title">{{ milestone.title }}</text>
                </view>
              </view>
            </view>
            
            <view class="preview-footer">
              <text class="preview-time">{{ formatPreviewTime(adaptedContent.timestamp) }}</text>
              <text class="preview-brand">点点</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 操作按钮 -->
      <view class="share-actions">
        <nut-button 
          type="default" 
          size="large"
          @click="generateTextShare"
          :loading="isGeneratingText"
        >
          <nut-icon name="copy" size="16"></nut-icon>
          复制文字
        </nut-button>
        
        <nut-button 
          type="primary" 
          size="large"
          @click="generateImageShare"
          :loading="isGenerating"
        >
          <nut-icon name="image" size="16"></nut-icon>
          生成图片
        </nut-button>
      </view>
    </view>
  </view>
</template>

<script>
import { getThemeList } from '@/utils/shareCardThemes.js'
import { ContentAdapterFactory } from '@/utils/contentAdapters.js'
import DateUtils from '@/utils/dateUtils.js'

export default {
  name: 'ShareCardComponent',
  props: {
    // 显示状态
    visible: {
      type: Boolean,
      default: false
    },
    
    // 内容类型：knowledge, project, log, analysis
    contentType: {
      type: String,
      default: 'knowledge',
      validator: (value) => ['knowledge', 'project', 'log', 'analysis'].includes(value)
    },
    
    // 内容数据
    contentData: {
      type: Object,
      default: () => ({})
    },
    
    // 默认主题
    defaultTheme: {
      type: String,
      default: 'simple'
    }
  },
  
  emits: ['update:visible', 'share', 'export'],
  
  data() {
    return {
      selectedTheme: 'simple',
      themeList: [],
      adaptedContent: {},
      isGenerating: false,
      isGeneratingText: false
    }
  },
  
  watch: {
    visible(newVal) {
      if (newVal) {
        this.initComponent()
      } else {
        this.resetComponent()
      }
    },
    
    contentData: {
      handler() {
        if (this.visible) {
          this.adaptContent()
        }
      },
      deep: true
    }
  },
  
  created() {
    this.themeList = getThemeList()
    this.selectedTheme = this.defaultTheme
  },
  
  methods: {
    /**
     * 初始化组件
     */
    initComponent() {
      this.adaptContent()
    },
    
    /**
     * 重置组件状态
     */
    resetComponent() {
      this.isGenerating = false
      this.isGeneratingText = false
    },
    
    /**
     * 适配内容数据
     */
    adaptContent() {
      try {
        const adapter = ContentAdapterFactory.create(this.contentType, this.contentData)
        this.adaptedContent = adapter.getAdaptedContent()
      } catch (error) {
        console.error('内容适配失败:', error)
        this.adaptedContent = {
          title: '内容加载失败',
          content: '无法获取内容信息',
          author: 'Project-Z',
          timestamp: new Date().toLocaleDateString(),
          tags: [],
          meta: {}
        }
      }
    },
    
    /**
     * 选择主题
     */
    selectTheme(themeKey) {
      this.selectedTheme = themeKey
    },
    
    /**
     * 生成图片分享
     */
    async generateImageShare() {
      if (this.isGenerating) return
      
      this.isGenerating = true
      
      try {
        // 简化版本：直接使用文本分享
        const shareText = this.formatTextContent()
        
        // 复制到剪贴板
        uni.setClipboardData({
          data: shareText,
          success: () => {
            uni.showToast({
              title: '分享内容已复制',
              icon: 'success'
            })
            
            // 触发分享事件
            this.$emit('share', {
              type: 'text',
              data: shareText,
              theme: this.selectedTheme,
              contentType: this.contentType
            })
            
            this.closeModal()
          },
          fail: () => {
            uni.showToast({
              title: '分享失败',
              icon: 'error'
            })
          }
        })
        
      } catch (error) {
        console.error('分享失败:', error)
        uni.showToast({
          title: '分享失败',
          icon: 'error'
        })
      } finally {
        this.isGenerating = false
      }
    },
    
    /**
     * 生成文字分享
     */
    async generateTextShare() {
      if (this.isGeneratingText) return
      
      this.isGeneratingText = true
      
      try {
        const shareText = this.formatTextContent()
        
        // 复制到剪贴板
        uni.setClipboardData({
          data: shareText,
          success: () => {
            uni.showToast({
              title: '已复制到剪贴板',
              icon: 'success'
            })
            
            // 触发分享事件
            this.$emit('share', {
              type: 'text',
              data: shareText,
              theme: this.selectedTheme,
              contentType: this.contentType
            })
            
            this.closeModal()
          },
          fail: () => {
            uni.showToast({
              title: '复制失败',
              icon: 'error'
            })
          }
        })
        
      } catch (error) {
        console.error('文字分享失败:', error)
        uni.showToast({
          title: '分享失败',
          icon: 'error'
        })
      } finally {
        this.isGeneratingText = false
      }
    },
    
    /**
     * 格式化文字内容
     */
    formatTextContent() {
      // 根据内容类型生成不同的分享格式
      switch (this.contentType) {
        case 'knowledge':
          return this.formatKnowledgeContent()
        case 'project':
          return this.formatProjectContent()
        case 'log':
          return this.formatLogContent()
        case 'analysis':
          return this.formatAnalysisContent()
        default:
          return this.formatDefaultContent()
      }
    },
    
    /**
     * 格式化知识库内容
     */
    formatKnowledgeContent() {
      let text = `📚 ${this.adaptedContent.title}\n`
      text += `${'='.repeat(Math.min(this.adaptedContent.title.length + 4, 30))}\n\n`
      
      // 标签部分
      if (this.adaptedContent.tags && this.adaptedContent.tags.length > 0) {
        text += `🏷️  标签: ${this.adaptedContent.tags.join(' · ')}\n\n`
      }
      
      // 内容概要
      if (this.adaptedContent.extra && this.adaptedContent.extra.summary) {
        text += `💡 内容概要\n`
        text += `${this.adaptedContent.extra.summary}\n\n`
      }
      
      // 详细内容
      text += `📝 详细内容\n`
      text += `${this.adaptedContent.content}\n\n`
      
      // 统计信息
      if (this.adaptedContent.meta && this.adaptedContent.meta.viewCount) {
        text += `📊 浏览次数: ${this.adaptedContent.meta.viewCount}\n`
      }
      
      // 时间信息
      text += `⏰ 更新时间: ${this.adaptedContent.timestamp}\n\n`
      
      // 底部标识
      text += `━━━━━━━━━━━━━━━━━━━━\n`
      text += `🔗 来自 Project-Z 知识管理系统`
      
      return text
    },
    
    /**
     * 格式化项目内容
     */
    formatProjectContent() {
      let text = `🎯 ${this.adaptedContent.title}\n`
      text += `${'='.repeat(Math.min(this.adaptedContent.title.length + 4, 30))}\n\n`
      
      // 项目目标
      text += `🎯 项目目标\n`
      text += `${this.adaptedContent.content}\n\n`
      
      // 进度信息
      if (this.adaptedContent.progress !== undefined) {
        const progressBar = this.generateProgressBar(this.adaptedContent.progress)
        text += `📊 项目进度\n`
        text += `${progressBar} ${this.adaptedContent.progress}%\n\n`
      }
      
      // 关键里程碑
      if (this.adaptedContent.milestones && this.adaptedContent.milestones.length > 0) {
        text += `🎯 关键里程碑\n`
        this.adaptedContent.milestones.slice(0, 5).forEach((milestone, index) => {
          const status = milestone.status === 'completed' ? '✅' : 
                        milestone.status === 'progress' ? '🔄' : '⏳'
          text += `${status} ${milestone.title}`
          if (milestone.status === 'progress' && milestone.progress) {
            text += ` (${milestone.progress}%)`
          }
          text += '\n'
        })
        text += '\n'
      }
      
      // 项目统计
      if (this.adaptedContent.meta) {
        text += `📈 项目统计\n`
        if (this.adaptedContent.meta.totalMilestones) {
          text += `• 总里程碑: ${this.adaptedContent.meta.totalMilestones}个\n`
          text += `• 已完成: ${this.adaptedContent.meta.completedMilestones}个\n\n`
        }
      }
      
      // 时间信息
      text += `⏰ 更新时间: ${this.adaptedContent.timestamp}\n\n`
      
      // 底部标识
      text += `━━━━━━━━━━━━━━━━━━━━\n`
      text += `🔗 来自 Project-Z 项目管理系统`
      
      return text
    },
    
    /**
     * 格式化日志内容
     */
    formatLogContent() {
      let text = `📋 ${this.adaptedContent.title}\n`
      text += `${'='.repeat(Math.min(this.adaptedContent.title.length + 4, 30))}\n\n`
      
      // 标签
      if (this.adaptedContent.tags && this.adaptedContent.tags.length > 0) {
        text += `🏷️  类型: ${this.adaptedContent.tags.join(' · ')}\n\n`
      }
      
      // 日志内容
      if (this.adaptedContent.extra && this.adaptedContent.extra.originalContent) {
        text += `📝 日志内容\n`
        text += `${this.adaptedContent.extra.originalContent}\n\n`
      }
      
      // 进展分析
      if (this.adaptedContent.extra && this.adaptedContent.extra.progressText) {
        text += `📈 进展分析\n`
        text += `${this.adaptedContent.extra.progressText}\n\n`
      }
      
      // 问题记录
      if (this.adaptedContent.extra && this.adaptedContent.extra.problemText) {
        text += `⚠️  问题记录\n`
        text += `${this.adaptedContent.extra.problemText}\n\n`
      }
      
      // 下步计划
      if (this.adaptedContent.extra && this.adaptedContent.extra.planText) {
        text += `📋 下步计划\n`
        text += `${this.adaptedContent.extra.planText}\n\n`
      }
      
      // 时间信息
      text += `⏰ 记录时间: ${this.adaptedContent.timestamp}\n\n`
      
      // 底部标识
      text += `━━━━━━━━━━━━━━━━━━━━\n`
      text += `🔗 来自 Project-Z 项目日志系统`
      
      return text
    },
    
    /**
     * 格式化AI分析内容
     */
    formatAnalysisContent() {
      let text = `🤖 ${this.adaptedContent.title}\n`
      text += `${'='.repeat(Math.min(this.adaptedContent.title.length + 4, 30))}\n\n`
      
      // 分析类型
      if (this.adaptedContent.meta && this.adaptedContent.meta.analysisType) {
        const typeMap = {
          general: '综合分析',
          progress: '进度分析', 
          risk: '风险分析',
          quality: '质量分析'
        }
        text += `🔍 分析类型: ${typeMap[this.adaptedContent.meta.analysisType] || '其他'}\n\n`
      }
      
      // 分析内容
      text += `📊 分析报告\n`
      text += `${this.adaptedContent.content}\n\n`
      
      // AI建议
      if (this.adaptedContent.extra && this.adaptedContent.extra.suggestions) {
        text += `💡 AI建议\n`
        text += `${this.adaptedContent.extra.suggestions}\n\n`
      }
      
      // 置信度
      if (this.adaptedContent.meta && this.adaptedContent.meta.confidence) {
        text += `🎯 分析置信度: ${this.adaptedContent.meta.confidence}%\n\n`
      }
      
      // 时间信息
      text += `⏰ 分析时间: ${this.adaptedContent.timestamp}\n\n`
      
      // 底部标识
      text += `━━━━━━━━━━━━━━━━━━━━\n`
      text += `🔗 来自 Project-Z AI分析系统`
      
      return text
    },
    
    /**
     * 格式化默认内容
     */
    formatDefaultContent() {
      let text = `📄 ${this.adaptedContent.title}\n\n`
      
      if (this.adaptedContent.tags && this.adaptedContent.tags.length > 0) {
        text += `🏷️ ${this.adaptedContent.tags.join(' · ')}\n\n`
      }
      
      text += `${this.adaptedContent.content}\n\n`
      text += `📅 ${this.adaptedContent.timestamp}\n`
      text += `🔗 来自 Project-Z`
      
      return text
    },
    
    /**
     * 生成进度条
     */
    generateProgressBar(progress) {
      const totalBars = 10
      const filledBars = Math.round((progress / 100) * totalBars)
      const emptyBars = totalBars - filledBars
      return '█'.repeat(filledBars) + '░'.repeat(emptyBars)
    },
    
    /**
     * 格式化预览时间
     */
    formatPreviewTime(timestamp) {
      if (!timestamp) return DateUtils.formatDateTime(new Date())
      
      try {
        return DateUtils.formatDateTime(timestamp)
      } catch (error) {
        return timestamp
      }
    },
    
    /**
     * 处理遮罩点击
     */
    handleMaskClick() {
      this.closeModal()
    },
    
    /**
     * 关闭弹窗
     */
    closeModal() {
      this.$emit('update:visible', false)
    }
  }
}
</script>

<style scoped>
.share-card-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.share-card-container {
  width: 90%;
  max-width: 600rpx;
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 40rpx;
  max-height: 80%;
  overflow-y: auto;
}

.share-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 40rpx;
}

.share-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #1D2129;
}

.theme-selector {
  margin-bottom: 40rpx;
}

.selector-label {
  font-size: 28rpx;
  color: #4E5969;
  margin-bottom: 20rpx;
  display: block;
}

.theme-list {
  display: flex;
  gap: 20rpx;
  overflow-x: auto;
}

.theme-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 120rpx;
  cursor: pointer;
}

.theme-item.active .theme-preview {
  border: 4rpx solid #165DFF;
}

.theme-preview {
  width: 100rpx;
  height: 120rpx;
  border: 2rpx solid #E5E6EB;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
  transition: border-color 0.3s;
}

.theme-preview.simple {
  background: #FFFFFF;
}

.theme-preview.gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.theme-preview.minimal {
  background: #F8F9FA;
}

.theme-preview.tech {
  background: #0D1117;
}

.preview-header {
  width: 100%;
  height: 12rpx;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2rpx;
  margin-bottom: 12rpx;
}

.theme-preview.gradient .preview-header,
.theme-preview.tech .preview-header {
  background: rgba(255, 255, 255, 0.3);
}

.preview-content {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.preview-line {
  height: 8rpx;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2rpx;
}

.theme-preview.gradient .preview-line,
.theme-preview.tech .preview-line {
  background: rgba(255, 255, 255, 0.5);
}

.preview-line.long {
  width: 100%;
}

.preview-line.medium {
  width: 75%;
}

.preview-line.short {
  width: 50%;
}

.theme-name {
  font-size: 24rpx;
  color: #86909C;
}

.card-preview {
  margin-bottom: 40rpx;
}

.preview-label {
  font-size: 28rpx;
  color: #4E5969;
  margin-bottom: 20rpx;
  display: block;
}

.preview-container {
  position: relative;
  width: 100%;
  height: 400rpx;
  background: #F7F8FA;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.text-preview {
  width: 90%;
  height: 90%;
  padding: 20rpx;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.text-preview.simple {
  background: #FFFFFF;
  border: 1rpx solid #E5E6EB;
}

.text-preview.gradient {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #FFFFFF;
}

.text-preview.minimal {
  background: #F8F9FA;
  border: 1rpx solid #E8EAED;
}

.text-preview.tech {
  background: #0D1117;
  color: #F0F6FC;
  border: 1rpx solid #30363D;
}

.preview-header {
  margin-bottom: 16rpx;
}

.preview-title {
  font-size: 24rpx;
  font-weight: bold;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-tags {
  display: flex;
  gap: 8rpx;
  margin-bottom: 12rpx;
  flex-wrap: wrap;
}

.preview-tag {
  font-size: 18rpx;
  padding: 4rpx 8rpx;
  border-radius: 4rpx;
  background: rgba(0, 0, 0, 0.1);
}

.text-preview.gradient .preview-tag,
.text-preview.tech .preview-tag {
  background: rgba(255, 255, 255, 0.2);
}

.preview-content {
  flex: 1;
  margin-bottom: 16rpx;
}

.preview-text {
  font-size: 20rpx;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 12rpx;
}

.preview-progress {
  margin-top: 12rpx;
}

.progress-label {
  font-size: 18rpx;
  margin-bottom: 6rpx;
  display: block;
}

.progress-bar {
  width: 100%;
  height: 4rpx;
  background: rgba(0, 0, 0, 0.1);
  border-radius: 2rpx;
  overflow: hidden;
}

.text-preview.gradient .progress-bar,
.text-preview.tech .progress-bar {
  background: rgba(255, 255, 255, 0.2);
}

.progress-fill {
  height: 100%;
  background: currentColor;
  opacity: 0.8;
  transition: width 0.3s ease;
}

.preview-milestones {
  margin-top: 12rpx;
}

.milestone-label {
  font-size: 18rpx;
  margin-bottom: 6rpx;
  display: block;
}

.milestone-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  margin-bottom: 4rpx;
}

.milestone-status {
  font-size: 16rpx;
  width: 16rpx;
  text-align: center;
}

.milestone-status.completed {
  color: #00B42A;
}

.milestone-status.progress {
  color: #165DFF;
}

.milestone-status.pending {
  opacity: 0.5;
}

.milestone-title {
  font-size: 16rpx;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.preview-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.preview-time,
.preview-brand {
  font-size: 18rpx;
  opacity: 0.7;
}

.share-actions {
  display: flex;
  gap: 20rpx;
}

.share-actions .nut-button {
  flex: 1;
}
</style>