<template>
  <view class="log-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <nut-icon name="left" size="20" color="#1D2129"></nut-icon>
        </view>
        <view class="navbar-title">{{ projectName || '记录日志' }}</view>
        <view class="navbar-right">
          <view class="save-btn" @click="saveLog" v-if="logContent.trim()">
            <text class="save-text">保存</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 页面内容 -->
    <view class="page-content">
      <!-- 项目信息 -->
      <view class="project-info">
        <view class="project-name">{{ projectName }}</view>
        <view class="log-date">{{ currentDate }}</view>
      </view>

      <!-- 输入方式选择 -->
      <view class="input-mode">
        <view class="mode-tabs">
          <view 
            class="mode-tab" 
            :class="{ active: inputMode === 'text' }"
            @click="switchInputMode('text')"
          >
            <nut-icon name="edit" size="16"></nut-icon>
            <text>文字输入</text>
          </view>
          <view 
            class="mode-tab" 
            :class="{ active: inputMode === 'voice' }"
            @click="switchInputMode('voice')"
          >
            <nut-icon name="voice" size="16"></nut-icon>
            <text>语音输入</text>
          </view>
        </view>
      </view>

      <!-- 文字输入区域 -->
      <view class="input-area" v-if="inputMode === 'text'">
        <nut-textarea
          v-model="logContent"
          placeholder="记录今天的项目进展、遇到的问题和明天的计划...\n\nAI将自动帮您分类整理为：\n• 进展：完成的工作内容\n• 问题：遇到的困难和阻碍\n• 计划：下一步的行动安排"
          :rows="12"
          :border="false"
          class="log-textarea"
        />
      </view>

      <!-- 语音输入区域 -->
      <view class="voice-area" v-if="inputMode === 'voice'">
        <view class="voice-container">
          <view class="voice-tip" v-if="!isRecording && !voiceText">
            <nut-icon name="voice" size="32" color="#86909C"></nut-icon>
            <text class="tip-text">点击下方按钮开始语音录制</text>
          </view>
          
          <view class="voice-content" v-if="voiceText">
            <text class="voice-text">{{ voiceText }}</text>
          </view>
          
          <view class="recording-animation" v-if="isRecording">
            <view class="wave-animation">
              <view class="wave"></view>
              <view class="wave"></view>
              <view class="wave"></view>
            </view>
            <text class="recording-text">正在录制中...</text>
          </view>
        </view>
        
        <view class="voice-controls">
          <nut-button
            v-if="!isRecording"
            type="primary"
            size="large"
            @click="startRecording"
            class="voice-btn"
          >
            <nut-icon name="voice" size="20"></nut-icon>
            开始录制
          </nut-button>
          
          <view class="recording-controls" v-if="isRecording">
            <nut-button
              type="default"
              @click="cancelRecording"
              class="control-btn"
            >
              取消
            </nut-button>
            <nut-button
              type="primary"
              @click="stopRecording"
              class="control-btn"
            >
              完成
            </nut-button>
          </view>
        </view>
      </view>

      <!-- AI分析结果 -->
      <view class="ai-analysis" v-if="analysisResult">
        <view class="analysis-header">
          <nut-icon name="tips" size="16" color="#165DFF"></nut-icon>
          <text class="analysis-title">AI智能分析</text>
        </view>
        
        <view class="analysis-content">
          <view class="analysis-item" v-if="analysisResult.progress">
            <view class="item-header">
              <nut-icon name="check" size="14" color="#00B42A"></nut-icon>
              <text class="item-title">进展</text>
            </view>
            <text class="item-content">{{ analysisResult.progress }}</text>
          </view>
          
          <view class="analysis-item" v-if="analysisResult.problems">
            <view class="item-header">
              <nut-icon name="warning" size="14" color="#FF7D00"></nut-icon>
              <text class="item-title">问题</text>
            </view>
            <text class="item-content">{{ analysisResult.problems }}</text>
          </view>
          
          <view class="analysis-item" v-if="analysisResult.plans">
            <view class="item-header">
              <nut-icon name="calendar" size="14" color="#165DFF"></nut-icon>
              <text class="item-title">计划</text>
            </view>
            <text class="item-content">{{ analysisResult.plans }}</text>
          </view>
        </view>
      </view>

      <!-- 底部操作区 -->
      <view class="bottom-actions">
        <nut-button
          v-if="logContent.trim() && !analysisResult"
          type="primary"
          size="large"
          :loading="analyzing"
          @click="analyzeContent"
          class="analyze-btn"
        >
          {{ analyzing ? 'AI分析中...' : 'AI智能分析' }}
        </nut-button>
        
        <nut-button
          v-if="analysisResult"
          type="primary"
          size="large"
          :loading="saving"
          @click="saveLog"
          class="save-btn"
        >
          {{ saving ? '保存中...' : '保存日志' }}
        </nut-button>
      </view>
    </view>
  </view>
</template>

<script>
import logApi from '@/api/logApi.js'
import aiApi from '@/api/aiApi.js'
import DateUtils from '@/utils/dateUtils.js'

export default {
  data() {
    return {
      projectId: '',
      projectName: '',
      currentDate: '',
      inputMode: 'text', // text | voice
      logContent: '',
      voiceText: '',
      isRecording: false,
      analyzing: false,
      saving: false,
      transcribing: false,
      analysisResult: null
    }
  },
  
  onLoad(options) {
    this.projectId = parseInt(options.projectId) || ''
    this.projectName = decodeURIComponent(options.projectName) || '项目名称'
    this.currentDate = this.formatDateWithWeekday(new Date())
  },
  
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    formatDateWithWeekday(date) {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const weekday = weekdays[date.getDay()]
      return `${year}年${month}月${day}日 ${weekday}`
    },
    
    switchInputMode(mode) {
      this.inputMode = mode
      if (mode === 'text' && this.voiceText) {
        this.logContent = this.voiceText
      }
    },
    
    async startRecording() {
      this.isRecording = true
      this.voiceText = ''
      
      try {
        // 这里应该调用真实的语音录制API
        // 目前使用模拟实现
        console.log('开始录制语音')
        
        uni.showToast({
          title: '开始录音',
          icon: 'none'
        })
      } catch (error) {
        console.error('开始录音失败:', error)
        this.isRecording = false
        uni.showToast({
          title: '录音失败',
          icon: 'none'
        })
      }
    },
    
    async stopRecording() {
      this.isRecording = false
      
      try {
        this.transcribing = true
        
        // 调用语音转文字API
        const result = await aiApi.speechToText('mock_audio_data')
        this.voiceText = result.text
        
        uni.showToast({
          title: '转换完成',
          icon: 'success'
        })
      } catch (error) {
        console.error('语音转文字失败:', error)
        // 使用模拟数据作为后备
        this.voiceText = '今天完成了用户登录模块的开发，遇到了数据库连接超时的问题，明天计划优化数据库配置并进行测试。'
        uni.showToast({
          title: '转换失败，使用模拟数据',
          icon: 'none'
        })
      } finally {
        this.transcribing = false
      }
    },
    
    cancelRecording() {
      this.isRecording = false
      this.voiceText = ''
      console.log('取消录制')
    },
    
    async analyzeContent() {
      const content = this.logContent.trim() || this.voiceText.trim()
      if (!content) {
        uni.showToast({
          title: '请先输入日志内容',
          icon: 'none'
        })
        return
      }
      
      this.analyzing = true
      
      try {
        // 构建AI分析提示词
        const prompt = `请分析以下工作日志内容，并按照JSON格式返回结构化数据：

日志内容：${content}

请提取以下信息并以JSON格式返回：
{
  "progress": "今天完成的工作内容（如果有的话）",
  "problems": "遇到的问题和困难（如果有的话）",
  "plans": "明天或下一步的计划（如果有的话）"
}

注意：
1. 如果某个方面没有相关内容，请返回空字符串
2. 请用简洁明了的语言总结
3. 只返回JSON格式，不要其他文字`
        
        // 调用AI接口进行分析
        const response = await aiApi.sendAIRequest(prompt)
        
        // 解析AI返回的JSON数据
        let analysisData
        try {
          // 尝试解析JSON响应
          const jsonMatch = response.content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            analysisData = JSON.parse(jsonMatch[0])
          } else {
            throw new Error('无法解析AI返回的JSON格式')
          }
        } catch (parseError) {
          console.warn('JSON解析失败，使用文本解析:', parseError)
          // 如果JSON解析失败，尝试文本解析
          analysisData = this.parseTextResponse(response.content)
        }
        
        this.analysisResult = {
          progress: analysisData.progress || '',
          problems: analysisData.problems || '',
          plans: analysisData.plans || ''
        }
        
        uni.showToast({
          title: 'AI分析完成',
          icon: 'success'
        })
        
      } catch (error) {
        console.error('AI分析失败:', error)
        
        // 显示具体错误信息
        let errorMessage = 'AI分析失败'
        if (error.message.includes('配置') || error.message.includes('API密钥')) {
          errorMessage = '请先在设置中配置AI服务'
        } else if (error.message.includes('网络')) {
          errorMessage = '网络连接失败，请检查网络'
        }
        
        uni.showToast({
          title: errorMessage,
          icon: 'none',
          duration: 3000
        })
        
        // 不再使用mock数据，让用户知道需要配置AI服务
        this.analysisResult = null
        
      } finally {
        this.analyzing = false
      }
    },
    
    // 解析文本格式的AI响应
    parseTextResponse(text) {
      const result = {
        progress: '',
        problems: '',
        plans: ''
      }
      
      // 尝试从文本中提取结构化信息
      const lines = text.split('\n').filter(line => line.trim())
      
      let currentSection = ''
      for (const line of lines) {
        const trimmedLine = line.trim()
        
        // 识别章节标题
        if (trimmedLine.includes('进展') || trimmedLine.includes('完成') || trimmedLine.includes('progress')) {
          currentSection = 'progress'
          continue
        } else if (trimmedLine.includes('问题') || trimmedLine.includes('困难') || trimmedLine.includes('problem')) {
          currentSection = 'problems'
          continue
        } else if (trimmedLine.includes('计划') || trimmedLine.includes('下一步') || trimmedLine.includes('plan')) {
          currentSection = 'plans'
          continue
        }
        
        // 提取内容
        if (currentSection && trimmedLine && !trimmedLine.match(/^[\d\.\-\*]+/)) {
          if (result[currentSection]) {
            result[currentSection] += ' ' + trimmedLine
          } else {
            result[currentSection] = trimmedLine
          }
        }
      }
      
      return result
    },
    
    async saveLog() {
      if (!this.analysisResult && !this.logContent.trim() && !this.voiceText.trim()) {
        uni.showToast({
          title: '请先输入日志内容',
          icon: 'none'
        })
        return
      }
      
      if (this.saving) return
      
      this.saving = true
      
      try {
        const logData = {
          content: this.logContent.trim() || this.voiceText.trim(),
          progressText: this.analysisResult?.progress || '',
          problemText: this.analysisResult?.problems || '',
          planText: this.analysisResult?.plans || '',
          logType: this.inputMode === 'voice' ? 'voice' : 'manual'
        }
        
        await logApi.createLog(this.projectId, logData)
        
        uni.showToast({
          title: '日志保存成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
        
      } catch (error) {
        console.error('保存日志失败:', error)
        uni.showToast({
          title: error.message || '保存失败，请重试',
          icon: 'none'
        })
      } finally {
        this.saving = false
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.log-page {
  min-height: 100vh;
  background-color: #f5f5f5;
}

.custom-navbar {
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e6eb;
  position: sticky;
  top: 0;
  z-index: 100;
  
  .navbar-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 32rpx;
    
    .navbar-left {
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
    
    .navbar-right {
      width: 60rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      
      .save-btn {
        .save-text {
          font-size: 28rpx;
          color: #165dff;
          font-weight: 500;
        }
      }
    }
  }
}

.page-content {
  padding: 32rpx;
}

.project-info {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  
  .project-name {
    font-size: 32rpx;
    font-weight: 600;
    color: #1d2129;
    margin-bottom: 8rpx;
  }
  
  .log-date {
    font-size: 24rpx;
    color: #86909c;
  }
}

.input-mode {
  margin-bottom: 32rpx;
  
  .mode-tabs {
    display: flex;
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 8rpx;
    
    .mode-tab {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8rpx;
      padding: 16rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      color: #86909c;
      transition: all 0.3s;
      
      &.active {
        background-color: #165dff;
        color: #ffffff;
      }
    }
  }
}

.input-area {
  margin-bottom: 32rpx;
  
  .log-textarea {
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 32rpx;
    min-height: 400rpx;
    font-size: 28rpx;
    line-height: 1.6;
  }
}

.voice-area {
  margin-bottom: 32rpx;
  
  .voice-container {
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 48rpx 32rpx;
    min-height: 400rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    .voice-tip {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16rpx;
      
      .tip-text {
        font-size: 24rpx;
        color: #86909c;
      }
    }
    
    .voice-content {
      width: 100%;
      
      .voice-text {
        font-size: 28rpx;
        line-height: 1.6;
        color: #1d2129;
      }
    }
    
    .recording-animation {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32rpx;
      
      .wave-animation {
        display: flex;
        gap: 8rpx;
        
        .wave {
          width: 8rpx;
          height: 40rpx;
          background-color: #165dff;
          border-radius: 4rpx;
          animation: wave 1.2s ease-in-out infinite;
          
          &:nth-child(2) {
            animation-delay: 0.1s;
          }
          
          &:nth-child(3) {
            animation-delay: 0.2s;
          }
        }
      }
      
      .recording-text {
        font-size: 24rpx;
        color: #165dff;
      }
    }
  }
  
  .voice-controls {
    margin-top: 32rpx;
    
    .voice-btn {
      width: 100%;
      height: 88rpx;
      border-radius: 16rpx;
    }
    
    .recording-controls {
      display: flex;
      gap: 24rpx;
      
      .control-btn {
        flex: 1;
        height: 88rpx;
        border-radius: 16rpx;
      }
    }
  }
}

.ai-analysis {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
  
  .analysis-header {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 24rpx;
    
    .analysis-title {
      font-size: 28rpx;
      font-weight: 600;
      color: #1d2129;
    }
  }
  
  .analysis-content {
    .analysis-item {
      margin-bottom: 24rpx;
      
      &:last-child {
        margin-bottom: 0;
      }
      
      .item-header {
        display: flex;
        align-items: center;
        gap: 8rpx;
        margin-bottom: 8rpx;
        
        .item-title {
          font-size: 24rpx;
          font-weight: 500;
          color: #4e5969;
        }
      }
      
      .item-content {
        font-size: 26rpx;
        line-height: 1.5;
        color: #1d2129;
        padding-left: 22rpx;
      }
    }
  }
}

.bottom-actions {
  padding: 32rpx 0;
  
  .analyze-btn,
  .save-btn {
    width: 100%;
    height: 88rpx;
    border-radius: 16rpx;
    font-size: 32rpx;
    font-weight: 600;
  }
}

@keyframes wave {
  0%, 40%, 100% {
    transform: scaleY(0.4);
  }
  20% {
    transform: scaleY(1);
  }
}
</style>