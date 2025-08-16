<template>
  <view class="create-knowledge-page">
    <!-- 自定义导航栏 -->
    <view class="custom-navbar">
      <view class="navbar-content">
        <view class="navbar-left" @click="goBack">
          <nut-icon name="left" size="20" color="#1D2129"></nut-icon>
        </view>
        <view class="navbar-title">{{ isEdit ? '编辑知识' : '新增知识' }}</view>
        <view class="navbar-right" @click="saveDraft">
          <text class="save-draft-text">草稿</text>
        </view>
      </view>
    </view>

    <!-- 表单内容 -->
    <scroll-view class="form-content" scroll-y>
      <!-- 知识标题 -->
      <view class="form-section">
        <view class="section-header">
          <text class="section-title">知识标题</text>
          <text class="required-mark">*</text>
        </view>
        <nut-input
          v-model="formData.title"
          placeholder="请输入知识标题"
          :border="false"
          class="title-input"
          :maxlength="50"
        />
        <view class="char-count">{{ formData.title.length }}/50</view>
      </view>

      <!-- 知识分类 -->
      <view class="form-section">
        <view class="section-header">
          <text class="section-title">知识分类</text>
          <text class="required-mark">*</text>
        </view>
        <view class="category-selector" @click="showCategoryPicker">
          <text class="category-text" :class="{ placeholder: !formData.category }">{{ formData.category || '请选择分类' }}</text>
          <nut-icon name="right" size="16" color="#86909C"></nut-icon>
        </view>
      </view>

      <!-- 知识标签 -->
      <view class="form-section">
        <view class="section-header">
          <text class="section-title">知识标签</text>
          <text class="optional-mark">（可选）</text>
        </view>
        <view class="tags-container">
          <view class="tag-list">
            <view 
              class="tag-item" 
              v-for="(tag, index) in formData.tags" 
              :key="index"
            >
              <text class="tag-text">{{ tag }}</text>
              <nut-icon name="close" size="12" color="#86909C" @click="removeTag(index)"></nut-icon>
            </view>
            <view class="add-tag-btn" @click="showAddTag" v-if="formData.tags.length < 5">
              <nut-icon name="plus" size="14" color="#165DFF"></nut-icon>
              <text class="add-tag-text">添加标签</text>
            </view>
          </view>
          <view class="tag-suggestions" v-if="suggestedTags.length > 0">
            <text class="suggestions-title">推荐标签：</text>
            <view class="suggestion-list">
              <text 
                class="suggestion-tag" 
                v-for="tag in suggestedTags" 
                :key="tag"
                @click="addSuggestedTag(tag)"
              >
                {{ tag }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 知识内容 -->
      <view class="form-section">
        <view class="section-header">
          <text class="section-title">知识内容</text>
          <text class="required-mark">*</text>
        </view>
        <view class="content-editor">
          <view class="editor-toolbar">
            <view class="toolbar-item" @click="toggleBold">
              <nut-icon name="bold" size="16" color="#86909C"></nut-icon>
            </view>
            <view class="toolbar-item" @click="toggleItalic">
              <nut-icon name="italic" size="16" color="#86909C"></nut-icon>
            </view>
            <view class="toolbar-item" @click="insertList">
              <nut-icon name="list" size="16" color="#86909C"></nut-icon>
            </view>
            <view class="toolbar-item" @click="insertImage">
              <nut-icon name="image" size="16" color="#86909C"></nut-icon>
            </view>
            <view class="toolbar-item" @click="aiAssist">
              <nut-icon name="service" size="16" color="#165DFF"></nut-icon>
              <text class="ai-text">AI</text>
            </view>
          </view>
          <textarea
            v-model="formData.content"
            placeholder="请输入知识内容，支持Markdown格式..."
            class="content-textarea"
            :maxlength="5000"
          />
          <view class="char-count">{{ formData.content.length }}/5000</view>
        </view>
      </view>

      <!-- AI分析结果 -->
      <view class="form-section" v-if="aiAnalysis">
        <view class="section-header">
          <nut-icon name="service" size="16" color="#165DFF"></nut-icon>
          <text class="section-title">AI分析建议</text>
        </view>
        <view class="ai-analysis">
          <view class="analysis-item" v-if="aiAnalysis.score">
            <text class="analysis-label">质量评分：</text>
            <view class="score-display">
              <text class="score-value">{{ aiAnalysis.score }}</text>
              <text class="score-total">/10</text>
            </view>
          </view>
          <view class="analysis-item" v-if="aiAnalysis.suggestions.length > 0">
            <text class="analysis-label">优化建议：</text>
            <view class="suggestions-list">
              <text 
                class="suggestion-item" 
                v-for="(suggestion, index) in aiAnalysis.suggestions" 
                :key="index"
              >
                {{ index + 1 }}. {{ suggestion }}
              </text>
            </view>
          </view>
          <view class="analysis-item" v-if="aiAnalysis.keywords.length > 0">
            <text class="analysis-label">关键词：</text>
            <view class="keywords-list">
              <text 
                class="keyword-item" 
                v-for="keyword in aiAnalysis.keywords" 
                :key="keyword"
                @click="addKeywordAsTag(keyword)"
              >
                {{ keyword }}
              </text>
            </view>
          </view>
        </view>
      </view>

      <!-- 相关项目 -->
      <view class="form-section">
        <view class="section-header">
          <text class="section-title">关联项目</text>
          <text class="optional-mark">（可选）</text>
        </view>
        <view class="related-projects">
          <view class="project-selector" @click="showProjectPicker">
            <text class="project-text" :class="{ placeholder: !formData.relatedProject }">{{ formData.relatedProject || '选择关联项目' }}</text>
            <nut-icon name="right" size="16" color="#86909C"></nut-icon>
          </view>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作区 -->
    <view class="bottom-actions">
      <nut-button 
        type="default" 
        size="large" 
        @click="previewKnowledge"
        class="preview-btn"
      >
        预览
      </nut-button>
      <nut-button 
        type="primary" 
        size="large" 
        @click="saveKnowledge"
        :loading="saving"
        :disabled="!canSave"
        class="save-btn"
      >
        {{ isEdit ? '更新' : '发布' }}
      </nut-button>
    </view>

    <!-- 分类选择器 -->
    <nut-popup v-model:visible="showCategoryModal" position="bottom">
      <view class="category-picker">
        <view class="picker-header">
          <text class="picker-title">选择分类</text>
          <nut-icon name="close" size="20" color="#86909C" @click="showCategoryModal = false"></nut-icon>
        </view>
        <view class="category-list">
          <view 
            class="category-option" 
            v-for="category in categories" 
            :key="category"
            @click="selectCategory(category)"
          >
            <text class="category-name">{{ category }}</text>
            <nut-icon 
              name="check" 
              size="16" 
              color="#165DFF" 
              v-if="formData.category === category"
            ></nut-icon>
          </view>
        </view>
      </view>
    </nut-popup>

    <!-- 项目选择器 -->
    <nut-popup v-model:visible="showProjectModal" position="bottom">
      <view class="project-picker">
        <view class="picker-header">
          <text class="picker-title">选择项目</text>
          <nut-icon name="close" size="20" color="#86909C" @click="showProjectModal = false"></nut-icon>
        </view>
        <view class="project-list">
          <view 
            class="project-option" 
            v-for="project in projects" 
            :key="project.id"
            @click="selectProject(project)"
          >
            <text class="project-name">{{ project.name }}</text>
            <nut-icon 
              name="check" 
              size="16" 
              color="#165DFF" 
              v-if="formData.relatedProject === project.name"
            ></nut-icon>
          </view>
        </view>
      </view>
    </nut-popup>

    <!-- 添加标签弹窗 -->
    <nut-popup v-model:visible="showTagModal" position="center">
      <view class="tag-input-modal">
        <view class="modal-header">
          <text class="modal-title">添加标签</text>
        </view>
        <view class="modal-content">
          <nut-input
            v-model="newTag"
            placeholder="请输入标签名称"
            :border="false"
            class="tag-input"
            :maxlength="10"
          />
        </view>
        <view class="modal-actions">
          <nut-button type="default" @click="showTagModal = false">取消</nut-button>
          <nut-button type="primary" @click="addTag" :disabled="!newTag.trim()">确定</nut-button>
        </view>
      </view>
    </nut-popup>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isEdit: false,
      knowledgeId: '',
      saving: false,
      showCategoryModal: false,
      showProjectModal: false,
      showTagModal: false,
      newTag: '',
      formData: {
        title: '',
        category: '',
        tags: [],
        content: '',
        relatedProject: ''
      },
      categories: [
        '技术文档',
        '项目经验',
        '问题解决',
        '学习笔记',
        '最佳实践',
        '工具使用',
        '其他'
      ],
      projects: [],
      suggestedTags: ['前端', '后端', '数据库', 'API', 'UI设计'],
      aiAnalysis: null
    }
  },
  
  computed: {
    canSave() {
      return this.formData.title.trim() && 
             this.formData.category && 
             this.formData.content.trim()
    }
  },
  
  onLoad(options) {
    this.isEdit = !!options.id
    this.knowledgeId = options.id || ''
    
    if (this.isEdit) {
      this.loadKnowledge()
    }
    
    this.loadProjects()
  },
  
  methods: {
    goBack() {
      if (this.hasChanges()) {
        uni.showModal({
          title: '确认离开',
          content: '当前有未保存的内容，确定要离开吗？',
          success: (res) => {
            if (res.confirm) {
              uni.navigateBack()
            }
          }
        })
      } else {
        uni.navigateBack()
      }
    },
    
    hasChanges() {
      return this.formData.title.trim() || 
             this.formData.content.trim() || 
             this.formData.tags.length > 0
    },
    
    async loadKnowledge() {
      try {
        // TODO: 从数据库加载知识详情
        // 模拟加载数据
        this.formData = {
          title: '示例知识标题',
          category: '技术文档',
          tags: ['前端', 'Vue'],
          content: '这是示例知识内容...',
          relatedProject: '示例项目'
        }
      } catch (error) {
        console.error('加载知识失败:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'error'
        })
      }
    },
    
    async loadProjects() {
      try {
        // TODO: 从数据库加载项目列表
        this.projects = [
          { id: '1', name: '项目管理APP' },
          { id: '2', name: '知识库系统' },
          { id: '3', name: '用户管理系统' }
        ]
      } catch (error) {
        console.error('加载项目列表失败:', error)
      }
    },
    
    showCategoryPicker() {
      this.showCategoryModal = true
    },
    
    selectCategory(category) {
      this.formData.category = category
      this.showCategoryModal = false
    },
    
    showProjectPicker() {
      this.showProjectModal = true
    },
    
    selectProject(project) {
      this.formData.relatedProject = project.name
      this.showProjectModal = false
    },
    
    showAddTag() {
      this.newTag = ''
      this.showTagModal = true
    },
    
    addTag() {
      const tag = this.newTag.trim()
      if (tag && !this.formData.tags.includes(tag) && this.formData.tags.length < 5) {
        this.formData.tags.push(tag)
        this.showTagModal = false
      }
    },
    
    removeTag(index) {
      this.formData.tags.splice(index, 1)
    },
    
    addSuggestedTag(tag) {
      if (!this.formData.tags.includes(tag) && this.formData.tags.length < 5) {
        this.formData.tags.push(tag)
      }
    },
    
    addKeywordAsTag(keyword) {
      if (!this.formData.tags.includes(keyword) && this.formData.tags.length < 5) {
        this.formData.tags.push(keyword)
      }
    },
    
    toggleBold() {
      uni.showToast({ title: '加粗功能开发中', icon: 'none' })
    },
    
    toggleItalic() {
      uni.showToast({ title: '斜体功能开发中', icon: 'none' })
    },
    
    insertList() {
      uni.showToast({ title: '列表功能开发中', icon: 'none' })
    },
    
    insertImage() {
      uni.showToast({ title: '图片功能开发中', icon: 'none' })
    },
    
    async aiAssist() {
      if (!this.formData.content.trim()) {
        uni.showToast({
          title: '请先输入内容',
          icon: 'none'
        })
        return
      }
      
      uni.showLoading({ title: 'AI分析中...' })
      
      try {
        // TODO: 调用AI分析接口
        await new Promise(resolve => setTimeout(resolve, 2000))
        
        this.aiAnalysis = {
          score: Math.floor(Math.random() * 3) + 7, // 7-9分
          suggestions: [
            '建议增加更多实例说明',
            '可以添加相关的技术背景',
            '建议补充参考资料链接'
          ],
          keywords: ['Vue', '组件', '开发', '前端']
        }
        
        uni.hideLoading()
        uni.showToast({
          title: 'AI分析完成',
          icon: 'success'
        })
      } catch (error) {
        uni.hideLoading()
        console.error('AI分析失败:', error)
        uni.showToast({
          title: 'AI分析失败',
          icon: 'error'
        })
      }
    },
    
    previewKnowledge() {
      if (!this.canSave) {
        uni.showToast({
          title: '请完善必填信息',
          icon: 'none'
        })
        return
      }
      
      // TODO: 实现预览功能
      uni.showToast({
        title: '预览功能开发中',
        icon: 'none'
      })
    },
    
    async saveKnowledge() {
      if (!this.canSave) {
        uni.showToast({
          title: '请完善必填信息',
          icon: 'none'
        })
        return
      }
      
      this.saving = true
      
      try {
        // TODO: 保存到数据库
        await new Promise(resolve => setTimeout(resolve, 1500))
        
        uni.showToast({
          title: this.isEdit ? '更新成功' : '发布成功',
          icon: 'success'
        })
        
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
        
      } catch (error) {
        console.error('保存失败:', error)
        uni.showToast({
          title: '保存失败',
          icon: 'error'
        })
      } finally {
        this.saving = false
      }
    },
    
    async saveDraft() {
      if (!this.hasChanges()) {
        uni.showToast({
          title: '暂无内容需要保存',
          icon: 'none'
        })
        return
      }
      
      try {
        // TODO: 保存草稿到本地存储
        uni.setStorageSync('knowledge_draft', this.formData)
        uni.showToast({
          title: '草稿已保存',
          icon: 'success'
        })
      } catch (error) {
        console.error('保存草稿失败:', error)
        uni.showToast({
          title: '保存草稿失败',
          icon: 'error'
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.create-knowledge-page {
  height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
}

.custom-navbar {
  background-color: #ffffff;
  border-bottom: 1rpx solid #e5e6eb;
  
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
      .save-draft-text {
        font-size: 28rpx;
        color: #165dff;
      }
    }
  }
}

.form-content {
  flex: 1;
  padding: 32rpx;
}

.form-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  
  .section-header {
    display: flex;
    align-items: center;
    margin-bottom: 24rpx;
    
    .section-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #1d2129;
    }
    
    .required-mark {
      color: #f53f3f;
      margin-left: 8rpx;
    }
    
    .optional-mark {
      color: #86909c;
      font-size: 24rpx;
      margin-left: 8rpx;
    }
  }
  
  .title-input {
    background-color: #f5f5f5;
    border-radius: 12rpx;
    padding: 24rpx;
    font-size: 28rpx;
  }
  
  .char-count {
    text-align: right;
    font-size: 24rpx;
    color: #86909c;
    margin-top: 16rpx;
  }
  
  .category-selector,
  .project-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #f5f5f5;
    border-radius: 12rpx;
    padding: 24rpx;
    
    .category-text,
    .project-text {
      font-size: 28rpx;
      color: #1d2129;
      
      &.placeholder {
        color: #86909c;
      }
    }
  }
}

.tags-container {
  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 16rpx;
    margin-bottom: 24rpx;
    
    .tag-item {
      display: flex;
      align-items: center;
      gap: 8rpx;
      background-color: #f2f6ff;
      border: 1rpx solid #bedaff;
      border-radius: 24rpx;
      padding: 12rpx 20rpx;
      
      .tag-text {
        font-size: 24rpx;
        color: #165dff;
      }
    }
    
    .add-tag-btn {
      display: flex;
      align-items: center;
      gap: 8rpx;
      background-color: #f5f5f5;
      border: 1rpx dashed #c9cdd4;
      border-radius: 24rpx;
      padding: 12rpx 20rpx;
      
      .add-tag-text {
        font-size: 24rpx;
        color: #165dff;
      }
    }
  }
  
  .tag-suggestions {
    .suggestions-title {
      font-size: 24rpx;
      color: #86909c;
      margin-bottom: 16rpx;
    }
    
    .suggestion-list {
      display: flex;
      flex-wrap: wrap;
      gap: 16rpx;
      
      .suggestion-tag {
        background-color: #f5f5f5;
        border-radius: 20rpx;
        padding: 8rpx 16rpx;
        font-size: 24rpx;
        color: #4e5969;
      }
    }
  }
}

.content-editor {
  .editor-toolbar {
    display: flex;
    align-items: center;
    gap: 24rpx;
    padding: 16rpx 0;
    border-bottom: 1rpx solid #e5e6eb;
    margin-bottom: 24rpx;
    
    .toolbar-item {
      display: flex;
      align-items: center;
      gap: 4rpx;
      padding: 12rpx;
      border-radius: 8rpx;
      background-color: #f5f5f5;
      
      .ai-text {
        font-size: 20rpx;
        color: #165dff;
        font-weight: 600;
      }
    }
  }
  
  .content-textarea {
    width: 100%;
    min-height: 400rpx;
    background-color: #f5f5f5;
    border-radius: 12rpx;
    padding: 24rpx;
    font-size: 28rpx;
    line-height: 1.6;
    border: none;
    outline: none;
    resize: none;
  }
}

.ai-analysis {
  background-color: #f2f6ff;
  border-radius: 12rpx;
  padding: 24rpx;
  
  .analysis-item {
    margin-bottom: 24rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .analysis-label {
      font-size: 24rpx;
      color: #4e5969;
      margin-bottom: 12rpx;
      display: block;
    }
    
    .score-display {
      display: flex;
      align-items: baseline;
      
      .score-value {
        font-size: 48rpx;
        font-weight: 600;
        color: #165dff;
      }
      
      .score-total {
        font-size: 28rpx;
        color: #86909c;
        margin-left: 4rpx;
      }
    }
    
    .suggestions-list {
      .suggestion-item {
        font-size: 24rpx;
        color: #1d2129;
        line-height: 1.5;
        margin-bottom: 8rpx;
      }
    }
    
    .keywords-list {
      display: flex;
      flex-wrap: wrap;
      gap: 12rpx;
      
      .keyword-item {
        background-color: #ffffff;
        border: 1rpx solid #bedaff;
        border-radius: 16rpx;
        padding: 8rpx 16rpx;
        font-size: 24rpx;
        color: #165dff;
      }
    }
  }
}

.bottom-actions {
  display: flex;
  gap: 24rpx;
  padding: 32rpx;
  background-color: #ffffff;
  border-top: 1rpx solid #e5e6eb;
  
  .preview-btn {
    flex: 1;
  }
  
  .save-btn {
    flex: 2;
  }
}

.category-picker,
.project-picker {
  background-color: #ffffff;
  border-radius: 24rpx 24rpx 0 0;
  
  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
    border-bottom: 1rpx solid #e5e6eb;
    
    .picker-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #1d2129;
    }
  }
  
  .category-list,
  .project-list {
    max-height: 600rpx;
    
    .category-option,
    .project-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 32rpx;
      border-bottom: 1rpx solid #f5f5f5;
      
      .category-name,
      .project-name {
        font-size: 28rpx;
        color: #1d2129;
      }
    }
  }
}

.tag-input-modal {
  background-color: #ffffff;
  border-radius: 16rpx;
  width: 600rpx;
  
  .modal-header {
    padding: 32rpx 32rpx 24rpx;
    border-bottom: 1rpx solid #e5e6eb;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #1d2129;
    }
  }
  
  .modal-content {
    padding: 32rpx;
    
    .tag-input {
      background-color: #f5f5f5;
      border-radius: 12rpx;
      padding: 24rpx;
      font-size: 28rpx;
    }
  }
  
  .modal-actions {
    display: flex;
    gap: 24rpx;
    padding: 24rpx 32rpx 32rpx;
  }
}
</style>