<template>
  <view class="log-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <nut-icon name="left" size="20" color="#1D2129"></nut-icon>
        </view>
        <view class="navbar-title">记录日志</view>
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
      analysisResult: null
    }
  },
  
  onLoad(options) {
    this.projectId = options.projectId || ''
    this.projectName = options.projectName || '项目名称'
    this.currentDate = this.formatDate(new Date())
  },
  
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    formatDate(date) {
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
    
    startRecording() {
      this.isRecording = true
      // TODO: 实现语音录制功能
      console.log('开始录制语音')
    },
    
    stopRecording() {
      this.isRecording = false
      // TODO: 停止录制并转换为文字
      // 模拟语音转文字结果
      this.voiceText = '今天完成了用户登录模块的开发，遇到了数据库连接超时的问题，明天计划优化数据库配置并进行测试。'
      console.log('停止录制语音')
    },
    
    cancelRecording() {
      this.isRecording = false
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
        // TODO: 调用AI接口分析日志内容
        // 模拟AI分析过程
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        // 模拟分析结果
        this.analysisResult = {
          progress: '完成了用户登录模块的开发，实现了基本的登录验证功能',
          problems: '遇到了数据库连接超时的问题，影响了开发进度',
          plans: '明天计划优化数据库配置，进行连接池设置，并完成登录模块的测试'
        }
        
      } catch (error) {
        console.error('AI分析失败:', error)
        uni.showToast({
          title: '分析失败，请重试',
          icon: 'none'
        })
      } finally {
        this.analyzing = false
      }
    },
    
    async saveLog() {
      if (!this.analysisResult && !this.logContent.trim() && !this.voiceText.trim()) {
        uni.showToast({
          title: '请先输入日志内容',
          icon: 'none'
        })
        return
      }
      
      this.saving = true
      
      try {
        const logData = {
          id: Date.now().toString(),
          projectId: this.projectId,
          content: this.logContent.trim() || this.voiceText.trim(),
          analysis: this.analysisResult,
          createdAt: new Date().toISOString()
        }
        
        // TODO: 保存到本地数据库
        console.log('保存日志:', logData)
        
        // 模拟保存过程
        await new Promise(resolve => setTimeout(resolve, 1000))
        
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
          title: '保存失败，请重试',
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