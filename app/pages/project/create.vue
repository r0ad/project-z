<template>
  <view class="create-project-page">
    <!-- 自定义导航栏 -->
    <CustomNavbar 
      title="新建项目"
      @left-click="goBack"
    />

    <!-- 页面内容 -->
    <view class="page-content">
      <!-- 步骤指示器 -->
      <view class="step-indicator">
        <view 
          v-for="(step, index) in steps" 
          :key="index"
          :class="['step-item', { 
            'active': currentStep === index, 
            'completed': currentStep > index 
          }]"
        >
          <view class="step-number">{{ index + 1 }}</view>
          <view class="step-label">{{ step.label }}</view>
        </view>
      </view>

      <!-- 步骤内容区域 -->
      <view class="step-content">
        <!-- 步骤1：选择项目类型或使用模板 -->
        <view v-if="currentStep === 0" class="step-section">
          <view class="section-title">选择创建方式</view>
          <view class="section-desc">你可以从模板开始，或者从头创建项目</view>
          
          <view class="creation-options">
            <view 
              :class="['option-card', { 'selected': creationMode === 'template' }]"
              @click="selectCreationMode('template')"
            >
              <nut-icon name="category" size="24" color="#165DFF"></nut-icon>
              <view class="option-title">使用模板</view>
              <view class="option-desc">从精选模板快速开始</view>
            </view>
            
            <view 
              :class="['option-card', { 'selected': creationMode === 'scratch' }]"
              @click="selectCreationMode('scratch')"
            >
              <nut-icon name="add" size="24" color="#FF6B35"></nut-icon>
              <view class="option-title">从头创建</view>
              <view class="option-desc">自定义所有项目信息</view>
            </view>
          </view>

          <!-- 模板选择区域 -->
          <view v-if="creationMode === 'template'" class="template-section">
            <view class="template-categories">
              <view 
                v-for="category in categories" 
                :key="category.key"
                :class="['category-item', { 'active': selectedCategory === category.key }]"
                @click="selectCategory(category.key)"
              >
                <view class="category-icon" :style="{ color: category.color }">
                  <nut-icon :name="category.icon" size="18"></nut-icon>
                </view>
                <text class="category-name">{{ category.name }}</text>
              </view>
            </view>
            
            <view v-if="selectedCategory" class="template-list">
              <view 
                v-for="(caseItem, index) in getCasesByCategory(selectedCategory)" 
                :key="index"
                :class="['template-item', { 'selected': selectedTemplate?.name === caseItem.name }]"
                @click="selectTemplate(caseItem)"
              >
                <view class="template-title">{{ caseItem.name }}</view>
                <view class="template-goal">{{ caseItem.goal }}</view>
              </view>
            </view>
          </view>
        </view>

        <!-- 步骤2：项目基本信息 -->
        <view v-else-if="currentStep === 1" class="step-section">
          <view class="section-title">项目基本信息</view>
          <view class="section-desc">设置项目的名称和核心目标</view>
          
          <view class="form-group">
            <view class="form-item">
              <view class="form-label">项目名称</view>
              <nut-input
                v-model="formData.name"
                placeholder="例如：AI智能助手小程序"
                :border="false"
                class="custom-input"
                @input="updatePreview"
              />
            </view>

            <view class="form-item">
              <view class="form-label">目标关键词</view>
              <nut-input
                v-model="formData.goal"
                placeholder="例如：30天内开发完成并上线"
                :border="false"
                class="custom-input"
                @input="updatePreview"
              />
            </view>
          </view>
        </view>

        <!-- 步骤3：项目详情 -->
        <view v-else-if="currentStep === 2" class="step-section">
          <view class="section-title">项目详情</view>
          <view class="section-desc">补充项目描述，让AI更好地理解你的项目</view>
          
          <view class="form-group">
            <view class="form-item">
              <view class="form-label">项目描述 <text class="optional">(可选)</text></view>
              <nut-textarea
                v-model="formData.description"
                placeholder="详细描述项目功能、目标用户、预期效果等..."
                :rows="4"
                :border="false"
                class="custom-textarea"
                @input="updatePreview"
              />
            </view>
          </view>
        </view>

        <!-- 步骤4：确认创建 -->
        <view v-else-if="currentStep === 3" class="step-section">
          <view class="section-title">确认项目信息</view>
          <view class="section-desc">请检查项目信息，确认无误后创建项目</view>
          
          <!-- 项目预览卡片 -->
          <view class="preview-card">
            <view class="preview-header">
              <view class="project-name">{{ formData.name || '未设置项目名称' }}</view>
              <view v-if="selectedTemplate" class="template-badge">
                基于模板：{{ selectedTemplate.name }}
              </view>
            </view>
            <view class="project-goal">{{ formData.goal || '未设置目标' }}</view>
            <view v-if="formData.description" class="project-desc">{{ formData.description }}</view>
            
            <!-- AI增强提示 -->
            <view class="ai-enhancement">
              <nut-icon name="star" size="16" color="#FF6B35"></nut-icon>
              <text class="ai-text">AI将为你生成SMART目标和关键节点</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部操作区 -->
      <view class="bottom-actions">
        <nut-button
          v-if="currentStep > 0"
          type="default"
          size="large"
          @click="prevStep"
          class="action-btn prev-btn"
        >
          上一步
        </nut-button>
        
        <nut-button
          v-if="currentStep < 3"
          type="primary"
          size="large"
          :disabled="!canNextStep"
          @click="nextStep"
          class="action-btn next-btn"
        >
          下一步
        </nut-button>
        
        <nut-button
          v-if="currentStep === 3"
          type="primary"
          size="large"
          :loading="creating"
          :disabled="!canCreate"
          @click="createProject"
          class="action-btn create-btn"
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
import CustomNavbar from '@/components/CustomNavbar.vue'
import { getCaseCategories, getCasesByCategory } from '@/utils/projectCases.js'

export default {
  components: {
    CustomNavbar
  },
  data() {
    return {
      formData: {
        name: '',
        goal: '',
        description: ''
      },
      creating: false,
      showTemplatePopup: false,
      categories: [],
      selectedCategory: '',
      currentCases: []
    }
  },
  computed: {
    canCreate() {
      return this.formData.name.trim() && this.formData.goal.trim()
    }
  },
  mounted() {
    this.loadCategories()
  },
  watch: {
    showTemplatePopup(newVal) {
      // 弹窗打开时，如果没有选中分类则默认选中第一个
      if (newVal && !this.selectedCategory && this.categories.length > 0) {
        this.selectCategory(this.categories[0].key)
      }
    }
  },
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    // 加载案例分类
    loadCategories() {
      this.categories = getCaseCategories()
    },
    
    // 选择分类
    selectCategory(categoryKey) {
      this.selectedCategory = categoryKey
      this.currentCases = getCasesByCategory(categoryKey)
    },
    
    // 根据分类获取案例
    getCasesByCategory(categoryKey) {
      return getCasesByCategory(categoryKey)
    },
    
    // 选择模板
    selectTemplate(caseData) {
      // 自动填充表单数据
      this.formData.name = caseData.name
      this.formData.goal = caseData.goal
      this.formData.description = caseData.description
      
      // 关闭弹窗
      this.showTemplatePopup = false
      
      // 显示成功提示
      uni.showToast({
        title: '模板已应用',
        icon: 'success',
        duration: 1500
      })
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

.page-content {
  padding: calc(var(--status-bar-height) + 146rpx) 32rpx 120rpx;
  min-height: calc(100vh - 200rpx);
  display: flex;
  flex-direction: column;
}

.form-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 48rpx;
}

.form-item {
  .form-label-wrapper {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16rpx;
    
    .form-label {
      font-size: 28rpx;
      color: #4e5969;
      font-weight: 500;
    }
    
    .template-trigger {
      display: flex;
      align-items: center;
      gap: 8rpx;
      padding: 8rpx 16rpx;
      background-color: rgba(22, 93, 255, 0.1);
      border-radius: 20rpx;
      border: 1rpx solid rgba(22, 93, 255, 0.3);
      
      .template-text {
        font-size: 24rpx;
        color: #165dff;
      }
    }
  }
  
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
    background-color: #f7f8fa;
    border-radius: 8rpx;
    padding: 16rpx 20rpx;
    margin-top: 24rpx;
    
    .tip-text {
      font-size: 24rpx;
      color: #86909c;
      text-align: center;
    }
  }

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background-color: #ffffff;
  border-top: 2rpx solid #e5e6eb;
  
  .create-btn {
    width: 100%;
    height: 88rpx;
    border-radius: 16rpx;
    font-size: 32rpx;
    font-weight: 600;
    
    &:disabled {
      background-color: #f2f3f5;
      color: #c9cdd4;
    }
  }
}

// 模板弹窗样式
:deep(.nut-popup) {
  .nut-popup__content {
    border-radius: 24rpx 24rpx 0 0;
  }
}

.template-popup {
    :deep(.nut-popup__content) {
      height: 85vh;
      max-height: 700rpx;
      background: #fff;
    }
  }
</style>