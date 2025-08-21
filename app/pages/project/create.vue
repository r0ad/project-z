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
          
          <view class="creation-options">
            <view 
              :class="['option-card', { 'selected': creationMode === 'template' }]"
              @click="selectCreationMode('template')"
            >
              <nut-icon name="category" size="28" color="#165DFF"></nut-icon>
              <view class="option-title">使用模板</view>
              <view class="option-desc">从精选模板快速开始</view>
            </view>
            
            <view 
              :class="['option-card', { 'selected': creationMode === 'scratch' }]"
              @click="selectCreationMode('scratch')"
            >
              <nut-icon name="add" size="28" color="#FF6B35"></nut-icon>
              <view class="option-title">从头创建</view>
              <view class="option-desc">完全自定义项目</view>
            </view>
          </view>

          <!-- 模板选择区域 -->
          <view v-if="creationMode === 'template'" class="template-section">
            <view class="template-header">
              <text class="template-subtitle">选择项目类型</text>
            </view>
            
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
                <text class="category-count">({{ category.cases }})</text>
              </view>
            </view>
            
            <view v-if="selectedCategory" class="template-list">
              <view class="template-list-header">
                <text class="list-subtitle">选择模板</text>
              </view>
              
              <view 
                v-for="(caseItem, index) in getCasesByCategory(selectedCategory)" 
                :key="index"
                :class="['template-item', { 'selected': selectedTemplate?.name === caseItem.name }]"
                @click="selectTemplate(caseItem)"
              >
                <view class="template-content">
                  <view class="template-title">{{ caseItem.name }}</view>
                  <view class="template-goal">{{ caseItem.goal }}</view>
                </view>
                <view v-if="selectedTemplate?.name === caseItem.name" class="selected-badge">
                  <nut-icon name="check" size="14" color="#ffffff"></nut-icon>
                </view>
              </view>
            </view>
            
            <view v-else-if="creationMode === 'template'" class="template-placeholder">
              <nut-icon name="category" size="16" color="#c9cdd4"></nut-icon>
              <text class="placeholder-text">请先选择一个项目类型</text>
            </view>
          </view>
          
          <!-- 从头创建的引导 -->
          <view v-if="creationMode === 'scratch'" class="scratch-guide">
            <view class="guide-card">
              <nut-icon name="star" size="24" color="#00D68F"></nut-icon>
              <view class="guide-info">
                <view class="guide-title">自定义创建</view>
                <view class="guide-desc">AI将帮助你生成SMART目标和项目计划</view>
              </view>
            </view>
          </view>
        </view>

        <!-- 步骤2：项目基本信息 -->
        <view v-else-if="currentStep === 1" class="step-section">
          <view class="section-title">项目基本信息</view>
          
          <!-- 模板信息展示 -->
          <view v-if="selectedTemplate" class="template-info-card">
            <view class="template-info-header">
              <nut-icon name="category" size="18" color="#165dff"></nut-icon>
              <text class="template-info-text">基于模板：{{ selectedTemplate.name }}</text>
            </view>
          </view>
          
          <view class="form-section">
            <view class="form-item">
              <view class="form-label">
                <text class="label-text">项目名称</text>
                <text class="required">*</text>
              </view>
              <nut-input
                v-model="formData.name"
                placeholder="例如：AI智能助手小程序"
                :border="false"
                class="modern-input"
                @input="updatePreview"
              />
            </view>

            <view class="form-item">
              <view class="form-label">
                <text class="label-text">项目目标</text>
                <text class="required">*</text>
              </view>
              <nut-textarea
                v-model="formData.goal"
                placeholder="描述你想要达成的具体目标，例如：&#10;在30天内开发一款AI聊天小程序，实现智能对话功能，用户留存率达到60%"
                :rows="4"
                :border="false"
                class="modern-textarea"
                @input="updatePreview"
              />
            </view>
          </view>
          
          <!-- 实时预览卡片 -->
          <view v-if="formData.name || formData.goal" class="preview-card-mini">
            <view class="preview-header">
              <nut-icon name="eye" size="16" color="#165dff"></nut-icon>
              <text class="preview-title">实时预览</text>
            </view>
            <view class="preview-content">
              <view class="preview-name">{{ formData.name || '项目名称' }}</view>
              <view class="preview-goal">{{ formData.goal || '项目目标描述...' }}</view>
            </view>
          </view>
        </view>

        <!-- 步骤3：项目详情 -->
        <view v-else-if="currentStep === 2" class="step-section">
          <view class="section-title">项目详情</view>
          
          <view class="form-section">
            <view class="form-item">
              <view class="form-label">
                <text class="label-text">项目描述</text>
                <text class="optional">(可选)</text>
              </view>
              <nut-textarea
                v-model="formData.description"
                placeholder="详细描述项目功能、目标用户、预期效果等...&#10;&#10;例如：&#10;- 目标用户：年轻人群体&#10;- 核心功能：智能对话、知识问答&#10;- 预期效果：提升用户工作效率"
                :rows="6"
                :border="false"
                class="modern-textarea"
                @input="updatePreview"
              />
            </view>
          </view>
          
          <!-- AI提示卡片 -->
          <view class="ai-tip-card">
            <nut-icon name="star" size="18" color="#FF6B35"></nut-icon>
            <text class="ai-tip-text">详细描述有助于AI生成更精准的项目计划</text>
          </view>
        </view>

        <!-- 步骤4：确认创建 -->
        <view v-else-if="currentStep === 3" class="step-section">
          <view class="section-title">确认项目信息</view>
          
          <!-- 项目预览卡片 -->
          <view class="confirm-preview-card">
            <view class="project-header">
              <view class="project-name">{{ formData.name || '未设置项目名称' }}</view>
              <view v-if="selectedTemplate" class="template-badge">
                模板：{{ selectedTemplate.name }}
              </view>
            </view>
            <view class="project-goal">{{ formData.goal || '未设置目标' }}</view>
            <view v-if="formData.description" class="project-desc">{{ formData.description }}</view>
            
            <!-- AI增强提示 -->
            <view class="ai-enhancement-card">
              <nut-icon name="star" size="18" color="#FF6B35"></nut-icon>
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
      currentStep: 0, // 当前步骤
      steps: [
        { label: '选择方式', key: 'mode' },
        { label: '基本信息', key: 'basic' },
        { label: '项目详情', key: 'detail' },
        { label: '确认创建', key: 'confirm' }
      ],
      creationMode: '', // 'template' 或 'scratch'
      formData: {
        name: '',
        goal: '',
        description: ''
      },
      creating: false,
      categories: [],
      selectedCategory: '',
      selectedTemplate: null,
      currentCases: []
    }
  },
  computed: {
    canCreate() {
      return this.formData.name.trim() && this.formData.goal.trim()
    },
    canNextStep() {
      switch(this.currentStep) {
        case 0: // 选择创建方式
          return this.creationMode && (this.creationMode === 'scratch' || this.selectedTemplate)
        case 1: // 基本信息
          return this.formData.name.trim() && this.formData.goal.trim()
        case 2: // 项目详情 - 可选步骤
          return true
        default:
          return false
      }
    }
  },
  mounted() {
    this.loadCategories()
  },
  methods: {
    goBack() {
      if (this.currentStep > 0) {
        this.prevStep()
      } else {
        uni.navigateBack()
      }
    },
    
    // 步骤控制
    nextStep() {
      if (this.canNextStep && this.currentStep < 3) {
        this.currentStep++
      }
    },
    
    prevStep() {
      if (this.currentStep > 0) {
        this.currentStep--
      }
    },
    
    // 选择创建方式
    selectCreationMode(mode) {
      this.creationMode = mode
      if (mode === 'scratch') {
        // 清空模板相关数据
        this.selectedTemplate = null
        this.selectedCategory = ''
      }
    },
    
    // 加载案例分类
    loadCategories() {
      this.categories = getCaseCategories()
    },
    
    // 选择分类
    selectCategory(categoryKey) {
      this.selectedCategory = categoryKey
      this.currentCases = getCasesByCategory(categoryKey)
      this.selectedTemplate = null // 重置选中的模板
    },
    
    // 根据分类获取案例
    getCasesByCategory(categoryKey) {
      return getCasesByCategory(categoryKey)
    },
    
    // 选择模板
    selectTemplate(caseData) {
      this.selectedTemplate = caseData
      // 自动填充表单数据
      this.formData.name = caseData.name
      this.formData.goal = caseData.goal
      this.formData.description = caseData.description || ''
    },
    
    // 更新预览（可以添加实时预览功能）
    updatePreview() {
      // 这里可以添加实时预览逻辑
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
  overflow: hidden;
}

.page-content {
  padding: calc(var(--status-bar-height) + 146rpx) 32rpx 140rpx;
  height: calc(100vh - calc(var(--status-bar-height) + 286rpx));
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

// 步骤指示器
.step-indicator {
  display: flex;
  justify-content: space-between;
  margin-bottom: 40rpx;
  padding: 0 20rpx;
  
  .step-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    position: relative;
    
    &:not(:last-child)::after {
      content: '';
      position: absolute;
      top: 16rpx;
      right: -50%;
      width: 100%;
      height: 2rpx;
      background-color: #e5e6eb;
      z-index: 1;
    }
    
    &.completed::after {
      background-color: #165dff;
    }
    
    .step-number {
      width: 32rpx;
      height: 32rpx;
      border-radius: 50%;
      background-color: #e5e6eb;
      color: #86909c;
      font-size: 20rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      margin-bottom: 8rpx;
      position: relative;
      z-index: 2;
    }
    
    .step-label {
      font-size: 24rpx;
      color: #86909c;
      text-align: center;
    }
    
    &.active {
      .step-number {
        background-color: #165dff;
        color: #ffffff;
      }
      
      .step-label {
        color: #165dff;
        font-weight: 500;
      }
    }
    
    &.completed {
      .step-number {
        background-color: #00d68f;
        color: #ffffff;
      }
      
      .step-label {
        color: #00d68f;
      }
    }
  }
}

// 步骤内容区域
.step-content {
  flex: 1;
  overflow-y: auto;
  
  .step-section {
    height: 100%;
    display: flex;
    flex-direction: column;
    
    .section-title {
      font-size: 36rpx;
      font-weight: 600;
      color: #1d2129;
      margin-bottom: 16rpx;
    }
    
    .section-desc {
      font-size: 28rpx;
      color: #86909c;
      margin-bottom: 40rpx;
      line-height: 1.5;
    }
  }
}

// 创建方式选择
.creation-options {
  display: flex;
  gap: 24rpx;
  margin-bottom: 40rpx;
  
  .option-card {
    flex: 1;
    padding: 40rpx 24rpx 32rpx;
    background-color: #ffffff;
    border-radius: 20rpx;
    border: 2rpx solid #e5e6eb;
    text-align: center;
    transition: all 0.3s ease;
    box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
    
    &.selected {
      border-color: #165dff;
      background-color: rgba(22, 93, 255, 0.05);
      transform: translateY(-4rpx);
      box-shadow: 0 8rpx 24rpx rgba(22, 93, 255, 0.15);
    }
    
    .option-title {
      font-size: 30rpx;
      font-weight: 600;
      color: #1d2129;
      margin: 20rpx 0 12rpx;
    }
    
    .option-desc {
      font-size: 26rpx;
      color: #86909c;
      line-height: 1.4;
    }
  }
}

// 模板选择区域
.template-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  
  .template-categories {
    display: flex;
    gap: 16rpx;
    margin-bottom: 24rpx;
    flex-wrap: wrap;
    
    .category-item {
      display: flex;
      align-items: center;
      gap: 8rpx;
      padding: 12rpx 20rpx;
      background-color: #ffffff;
      border-radius: 24rpx;
      border: 1rpx solid #e5e6eb;
      font-size: 24rpx;
      color: #4e5969;
      transition: all 0.3s ease;
      
      &.active {
        background-color: #165dff;
        color: #ffffff;
        border-color: #165dff;
        
        .category-icon {
          color: #ffffff !important;
        }
      }
      
      .category-icon {
        display: flex;
        align-items: center;
      }
      
      .category-name {
        white-space: nowrap;
      }
    }
  }
  
  .template-list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 16rpx;
    overflow-y: auto;
    
    .template-item {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding: 24rpx;
      background-color: #ffffff;
      border-radius: 16rpx;
      border: 2rpx solid #e5e6eb;
      transition: all 0.3s ease;
      
      &.selected {
        border-color: #165dff;
        background-color: rgba(22, 93, 255, 0.05);
      }
      
      .template-content {
        flex: 1;
        
        .template-title {
          font-size: 28rpx;
          font-weight: 600;
          color: #1d2129;
          margin-bottom: 8rpx;
        }
        
        .template-goal {
          font-size: 24rpx;
          color: #4e5969;
          line-height: 1.5;
        }
      }
      
      .selected-badge {
        width: 28rpx;
        height: 28rpx;
        background-color: #165dff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-left: 16rpx;
        flex-shrink: 0;
      }
    }
  }
}

// 模板信息卡片
.template-info-card {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(22, 93, 255, 0.03) 100%);
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 32rpx;
  border: 1rpx solid rgba(22, 93, 255, 0.15);
  
  .template-info-header {
    display: flex;
    align-items: center;
    gap: 8rpx;
    
    .template-info-text {
      font-size: 26rpx;
      color: #165dff;
      font-weight: 500;
    }
  }
}

// 现代化表单样式
.form-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 32rpx;
  
  .form-item {
    .form-label {
      display: flex;
      align-items: center;
      gap: 8rpx;
      margin-bottom: 16rpx;
      
      .label-text {
        font-size: 28rpx;
        color: #1d2129;
        font-weight: 600;
      }
      
      .required {
        color: #f53f3f;
        font-size: 24rpx;
      }
      
      .optional {
        color: #86909c;
        font-weight: 400;
        font-size: 24rpx;
      }
    }
    
    .modern-input {
      background-color: #ffffff;
      border-radius: 16rpx;
      padding: 28rpx 32rpx;
      border: 2rpx solid #e5e6eb;
      transition: all 0.3s ease;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
      
      &:focus {
        border-color: #165dff;
        box-shadow: 0 4rpx 16rpx rgba(22, 93, 255, 0.15);
      }
    }
    
    .modern-textarea {
      background-color: #ffffff;
      border-radius: 16rpx;
      padding: 28rpx 32rpx;
      border: 2rpx solid #e5e6eb;
      min-height: 160rpx;
      transition: all 0.3s ease;
      box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
      line-height: 1.6;
      
      &:focus {
        border-color: #165dff;
        box-shadow: 0 4rpx 16rpx rgba(22, 93, 255, 0.15);
      }
    }
  }
}

// 实时预览卡片 - 小版本
.preview-card-mini {
  background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
  border-radius: 20rpx;
  padding: 24rpx;
  margin-top: 24rpx;
  border: 1rpx solid #e5e6eb;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  
  .preview-header {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-bottom: 16rpx;
    
    .preview-title {
      font-size: 24rpx;
      color: #165dff;
      font-weight: 600;
    }
  }
  
  .preview-content {
    .preview-name {
      font-size: 28rpx;
      font-weight: 600;
      color: #1d2129;
      margin-bottom: 8rpx;
      line-height: 1.4;
    }
    
    .preview-goal {
      font-size: 24rpx;
      color: #4e5969;
      line-height: 1.5;
      max-height: 120rpx;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
    }
  }
}

// AI提示卡片
.ai-tip-card {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 24rpx;
  background: linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 107, 53, 0.03) 100%);
  border-radius: 16rpx;
  border: 1rpx solid rgba(255, 107, 53, 0.15);
  margin-top: 24rpx;
  
  .ai-tip-text {
    font-size: 24rpx;
    color: #FF6B35;
    line-height: 1.4;
  }
}

// 确认预览卡片
.confirm-preview-card {
  background: linear-gradient(135deg, #ffffff 0%, #f8faff 100%);
  border-radius: 20rpx;
  padding: 32rpx;
  border: 1rpx solid #e5e6eb;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.08);
  
  .project-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20rpx;
    
    .project-name {
      font-size: 32rpx;
      font-weight: 700;
      color: #1d2129;
      flex: 1;
      line-height: 1.4;
    }
    
    .template-badge {
      font-size: 22rpx;
      color: #165dff;
      background-color: rgba(22, 93, 255, 0.1);
      padding: 6rpx 16rpx;
      border-radius: 16rpx;
      margin-left: 16rpx;
      white-space: nowrap;
      border: 1rpx solid rgba(22, 93, 255, 0.2);
    }
  }
  
  .project-goal {
    font-size: 28rpx;
    color: #4e5969;
    line-height: 1.6;
    margin-bottom: 20rpx;
  }
  
  .project-desc {
    font-size: 26rpx;
    color: #86909c;
    line-height: 1.6;
    margin-bottom: 24rpx;
    padding: 20rpx;
    background-color: rgba(245, 247, 250, 0.6);
    border-radius: 12rpx;
  }
  
  .ai-enhancement-card {
    display: flex;
    align-items: center;
    gap: 12rpx;
    padding: 20rpx 24rpx;
    background: linear-gradient(135deg, rgba(255, 107, 53, 0.08) 0%, rgba(255, 107, 53, 0.03) 100%);
    border-radius: 16rpx;
    border: 1rpx solid rgba(255, 107, 53, 0.15);
    
    .ai-text {
      font-size: 26rpx;
      color: #FF6B35;
      font-weight: 500;
    }
  }
}

// 从头创建引导
.scratch-guide {
  margin-top: 40rpx;
  
  .guide-card {
    display: flex;
    align-items: center;
    gap: 16rpx;
    padding: 24rpx 28rpx;
    background: linear-gradient(135deg, rgba(0, 214, 143, 0.08) 0%, rgba(0, 214, 143, 0.03) 100%);
    border-radius: 16rpx;
    border: 1rpx solid rgba(0, 214, 143, 0.15);
    
    .guide-info {
      flex: 1;
      
      .guide-title {
        font-size: 28rpx;
        font-weight: 600;
        color: #1d2129;
        margin-bottom: 8rpx;
      }
      
      .guide-desc {
        font-size: 24rpx;
        color: #00D68F;
        line-height: 1.5;
      }
    }
  }
}

// 模板占位符
.template-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80rpx 32rpx;
  color: #c9cdd4;
  
  .placeholder-text {
    font-size: 24rpx;
    margin-top: 16rpx;
  }
}

// 底部操作区
.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background-color: #ffffff;
  border-top: 2rpx solid #e5e6eb;
  display: flex;
  gap: 16rpx;
  
  .action-btn {
    height: 88rpx;
    border-radius: 16rpx;
    font-size: 32rpx;
    font-weight: 600;
    
    &.prev-btn {
      flex: 0 0 160rpx;
    }
    
    &.next-btn,
    &.create-btn {
      flex: 1;
    }
    
    &:disabled {
      background-color: #f2f3f5;
      color: #c9cdd4;
    }
  }
}
</style>