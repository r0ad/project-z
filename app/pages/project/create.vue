<template>
  <view class="create-project-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <nut-icon name="left" size="20" color="#1D2129"></nut-icon>
        </view>
        <view class="navbar-title">新建项目</view>
        <view class="navbar-right"></view>
      </view>
    </view>

    <!-- 页面内容 -->
    <view class="page-content">
      <!-- 表单区域 -->
      <view class="form-container">
        <view class="form-item">
          <view class="form-label">项目名称</view>
          <nut-input
            v-model="formData.name"
            placeholder="输入项目名称"
            :border="false"
            class="custom-input"
          />
        </view>

        <view class="form-item">
          <view class="form-label">目标关键词</view>
          <nut-input
            v-model="formData.goal"
            placeholder="输入目标关键词，如'30天开发小程序'"
            :border="false"
            class="custom-input"
          />
        </view>

        <view class="form-item">
          <view class="form-label">项目描述</view>
          <nut-textarea
            v-model="formData.description"
            placeholder="详细描述项目内容和预期成果（可选）"
            :rows="4"
            :border="false"
            class="custom-textarea"
          />
        </view>

        <!-- AI提示 -->
        <view class="ai-tip">
          <nut-icon name="tips" size="16" color="#165DFF"></nut-icon>
          <text class="tip-text">AI将根据您的输入生成符合SMART原则的目标和关键节点</text>
        </view>
      </view>

      <!-- 底部操作区 -->
      <view class="bottom-actions">
        <nut-button
          type="primary"
          size="large"
          :loading="creating"
          @click="createProject"
          class="create-btn"
        >
          {{ creating ? '创建中...' : '创建项目' }}
        </nut-button>
      </view>
    </view>
  </view>
</template>

<script>
import projectApi from '@/api/projectApi.js'
import aiApi from '@/api/aiApi.js'

export default {
  data() {
    return {
      formData: {
        name: '减肥',
        goal: '高效减肥10kg',
        description: '高效减肥10kg'
      },
      creating: false
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    async createProject() {
      // 表单验证
      const validation = this.validateForm()
      if (!validation.valid) {
        uni.showToast({
          title: validation.message,
          icon: 'none'
        })
        return
      }

      if (this.creating) return
      
      this.creating = true
      
      try {
        // 创建项目数据
        const projectData = {
          name: this.formData.name.trim(),
          goal: this.formData.goal.trim(),
          description: this.formData.description.trim() || '',
          status: 'planning'
        }
        
        // 使用AI分析项目并生成SMART目标和关键节点
        let aiAnalysis = null
        try {
          const aiPrompt = `请分析以下项目信息，生成符合SMART原则的目标和关键节点：

项目名称：${projectData.name}
目标关键词：${projectData.goal}
项目描述：${projectData.description}

请返回JSON格式的分析结果，包含：
1. smartGoal: 重新优化的SMART目标
2. milestones: 关键节点数组，每个节点包含title、description、deadline（相对天数）
3. suggestions: 项目建议

示例格式：
{
  "smartGoal": "在30天内开发一款AI小工具，实现文本生成功能，用户留存率达到60%以上",
  "milestones": [
    {"title": "需求分析与设计", "description": "完成产品需求分析和UI设计", "deadline": 7},
    {"title": "核心功能开发", "description": "实现AI文本生成核心功能", "deadline": 20},
    {"title": "测试与优化", "description": "完成功能测试和性能优化", "deadline": 28},
    {"title": "发布上线", "description": "完成项目发布和用户反馈收集", "deadline": 30}
  ],
  "suggestions": "建议重点关注用户体验设计和AI模型的响应速度优化"
}`
          
          const aiResponse = await aiApi.sendAIRequest(aiPrompt)
          if (aiResponse && aiResponse.content) {
            try {
              // 提取AI返回内容中的JSON部分（去除markdown代码块标记）
              let content = aiResponse.content
              // 如果包含```json标记，提取其中的JSON内容
              const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
              if (jsonMatch) {
                content = jsonMatch[1].trim()
              }
              
              aiAnalysis = JSON.parse(content)
              console.log('AI分析结果:', aiAnalysis)
              
              // 如果AI返回了优化的目标，使用AI的目标
              if (aiAnalysis.smartGoal) {
                projectData.goal = aiAnalysis.smartGoal
              }
            } catch (parseError) {
              console.log('AI返回格式解析失败，使用原始数据:', parseError)
              console.log('原始AI返回内容:', aiResponse.content)
            }
          }
        } catch (aiError) {
          console.log('AI分析失败，继续创建项目:', aiError)
        }
        
        // 调用项目API创建项目
        const result = await projectApi.createProject(projectData, aiAnalysis)
        
        uni.showToast({
          title: '项目创建成功',
          icon: 'success'
        })
        
        // 延迟返回，让用户看到成功提示
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
        
      } catch (error) {
        console.error('创建项目失败:', error)
        uni.showToast({
          title: error.message || '创建失败，请重试',
          icon: 'none'
        })
      } finally {
        this.creating = false
      }
    },
    
    // 清空表单
    clearForm() {
      this.formData.name = ''
      this.formData.goal = ''
      this.formData.description = ''
    },
    
    // 表单验证
    validateForm() {
      if (!this.formData.name.trim()) {
        return { valid: false, message: '请输入项目名称' }
      }
      
      if (this.formData.name.trim().length < 2) {
        return { valid: false, message: '项目名称至少2个字符' }
      }
      
      if (this.formData.name.trim().length > 50) {
        return { valid: false, message: '项目名称不能超过50个字符' }
      }
      
      if (!this.formData.goal.trim()) {
        return { valid: false, message: '请输入目标关键词' }
      }
      
      if (this.formData.goal.trim().length < 5) {
        return { valid: false, message: '目标关键词至少5个字符' }
      }
      
      if (this.formData.description.trim().length > 500) {
        return { valid: false, message: '项目描述不能超过500个字符' }
      }
      
      return { valid: true }
    }
  }
}
</script>

<style lang="scss" scoped>
.create-project-page {
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
    }
  }
}

.page-content {
  padding: 32rpx;
  min-height: calc(100vh - 88rpx);
  display: flex;
  flex-direction: column;
}

.form-container {
  flex: 1;
}

.form-item {
  margin-bottom: 48rpx;
  
  .form-label {
    font-size: 28rpx;
    color: #4e5969;
    margin-bottom: 16rpx;
    font-weight: 500;
  }
  
  .custom-input {
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 24rpx 32rpx;
    border: 2rpx solid #e5e6eb;
    
    &:focus {
      border-color: #165dff;
    }
  }
  
  .custom-textarea {
    background-color: #ffffff;
    border-radius: 16rpx;
    padding: 24rpx 32rpx;
    border: 2rpx solid #e5e6eb;
    min-height: 160rpx;
    
    &:focus {
      border-color: #165dff;
    }
  }
}

.ai-tip {
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  background-color: #f2f6ff;
  border: 2rpx solid #d4e7ff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 48rpx;
  
  .tip-text {
    font-size: 24rpx;
    color: #4e5969;
    line-height: 1.5;
    flex: 1;
  }
}

.bottom-actions {
  padding: 32rpx 0;
  
  .create-btn {
    width: 100%;
    height: 88rpx;
    border-radius: 16rpx;
    font-size: 32rpx;
    font-weight: 600;
  }
}
</style>