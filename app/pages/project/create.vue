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
export default {
  data() {
    return {
      formData: {
        name: '',
        goal: '',
        description: ''
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
      if (!this.formData.name.trim()) {
        uni.showToast({
          title: '请输入项目名称',
          icon: 'none'
        })
        return
      }
      
      if (!this.formData.goal.trim()) {
        uni.showToast({
          title: '请输入目标关键词',
          icon: 'none'
        })
        return
      }

      this.creating = true
      
      try {
        // 创建项目数据
        const projectData = {
          id: Date.now().toString(),
          name: this.formData.name.trim(),
          goal: this.formData.goal.trim(),
          description: this.formData.description.trim(),
          progress: 0,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
        
        // TODO: 调用AI接口生成项目节点和详细目标
        // TODO: 保存到本地数据库
        
        // 模拟创建过程
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        uni.showToast({
          title: '项目创建成功',
          icon: 'success'
        })
        
        // 返回项目列表页面
        setTimeout(() => {
          uni.navigateBack()
        }, 1000)
        
      } catch (error) {
        console.error('创建项目失败:', error)
        uni.showToast({
          title: '创建失败，请重试',
          icon: 'none'
        })
      } finally {
        this.creating = false
      }
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