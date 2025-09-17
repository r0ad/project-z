<template>
  <view class="create-knowledge-page">
    <!-- 自定义导航栏 -->
    <CustomNavbar :title="isEdit ? '编辑知识' : '新增知识'" :show-back="true" @back="goBack">
    </CustomNavbar>
    
    <!-- 导航栏占位 -->
    <view class="navbar-placeholder"></view>

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

      <!-- 知识概要 -->
      <view class="form-section">
        <view class="section-header">
          <text class="section-title">知识概要</text>
          <text class="optional-mark">（可选）</text>
        </view>
        <nut-textarea
          v-model="formData.summary"
          placeholder="请输入知识概要，简要描述知识内容"
          :border="false"
          class="summary-input"
          :maxlength="200"
          :rows="3"
        />
        <view class="char-count">{{ formData.summary.length }}/200</view>
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
         <!--  <view class="editor-toolbar">
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
          </view> -->
          <textarea
            v-model="formData.content"
            placeholder="请输入知识内容..."
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

      <!-- 相关知识 -->
      <view class="form-section" v-if="isEdit">
        <view class="section-header">
          <text class="section-title">相关知识</text>
          <text class="optional-mark">（基于项目关联）</text>
        </view>
        <view class="related-knowledge">
          <view class="knowledge-list" v-if="relatedKnowledge.length > 0">
            <view 
              class="knowledge-item" 
              v-for="(item, index) in relatedKnowledge" 
              :key="item.id"
            >
              <view class="knowledge-info">
                <text class="knowledge-title">{{ item.title }}</text>
                <text class="knowledge-summary">{{ item.summary }}</text>
              </view>
              <view class="knowledge-actions">
                <nut-icon name="eye" size="16" color="#165DFF" @click="viewKnowledge(item.id)"></nut-icon>
                <nut-icon name="delete" size="16" color="#F53F3F" @click="removeRelatedKnowledge(item.id)"></nut-icon>
              </view>
            </view>
          </view>
          <view class="empty-knowledge" v-else>
            <text class="empty-text">暂无相关知识，关联项目后会自动显示</text>
          </view>
          <nut-button 
            type="default" 
            size="small" 
            @click="refreshRelatedKnowledge"
            class="refresh-btn"
          >
            刷新相关知识
          </nut-button>
        </view>
      </view>
    </scroll-view>

    <!-- 底部操作区 -->
    <view class="bottom-actions">
      <nut-button 
        type="primary" 
        size="large" 
        @click="saveKnowledge"
        :loading="saving"
        :disabled="!canSave"
        class="save-btn"
        block
      >
        {{ isEdit ? '更新' : '发布' }}
      </nut-button>
    </view>



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
import CustomNavbar from '@/components/CustomNavbar.vue'
import knowledgeApi from '@/api/knowledgeApi.js'

export default {
  components: {
    CustomNavbar
  },
  data() {
    return {
      isEdit: false,
      knowledgeId: '',
      saving: false,
      showProjectModal: false,
      showTagModal: false,
      newTag: '',
      formData: {
        title: '',
        summary: '',
        tags: [],
        content: '',
        relatedProject: ''
      },
      projects: [],
      relatedKnowledge: [],
      suggestedTags: ['前端', '后端', '数据库', 'API', 'UI设计'],
      aiAnalysis: null
    }
  },
  
  computed: {
    canSave() {
      return this.formData.title.trim() && 
             this.formData.content.trim()
    }
  },
  
  onLoad(options) {
    this.isEdit = !!options.id
    this.knowledgeId = options.id || ''
    
    // 处理从聊天页面传递过来的数据
    if (options.data) {
      try {
        const knowledgeData = JSON.parse(decodeURIComponent(options.data))
        this.formData = {
          title: knowledgeData.title || '',
          summary: knowledgeData.summary || '',
          tags: knowledgeData.tags || [],
          content: knowledgeData.content || '',
          relatedProject: knowledgeData.projectId ? this.getProjectNameById(knowledgeData.projectId) : ''
        }
        
        // 显示提示信息
        uni.showToast({
          title: 'AI已提取知识内容',
          icon: 'success'
        })
      } catch (error) {
        console.error('解析传递的数据失败:', error)
        uni.showToast({
          title: '数据解析失败',
          icon: 'error'
        })
      }
    }
    
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
        const knowledge = await knowledgeApi.getKnowledgeDetail(this.knowledgeId)
        if (knowledge) {
          this.formData = {
            title: knowledge.title || '',
            summary: knowledge.summary || '',
            tags: knowledge.tags || [],
            content: knowledge.content || '',
            relatedProject: knowledge.project_name || ''
          }
          // 加载相关知识
          await this.loadRelatedKnowledge()
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
        const projects = await knowledgeApi.getAllProjects()
        this.projects = projects || []
      } catch (error) {
        console.error('加载项目列表失败:', error)
        this.projects = []
      }
    },
    
    // 根据项目ID获取项目名称
    getProjectNameById(projectId) {
      const project = this.projects.find(p => p.id === projectId)
      return project ? project.name : ''
    },
    
    async loadRelatedKnowledge() {
      try {
        console.log('加载相关知识，当前知识ID:', this.knowledgeId)
        this.relatedKnowledge = await knowledgeApi.getRelatedKnowledge(this.knowledgeId)
        console.log('加载到的相关知识:', this.relatedKnowledge)
      } catch (error) {
        console.error('加载相关知识失败:', error)
        this.relatedKnowledge = []
      }
    },
    
    async refreshRelatedKnowledge() {
      await this.loadRelatedKnowledge()
      uni.showToast({
        title: '已刷新',
        icon: 'success'
      })
    },
    
    viewKnowledge(knowledgeId) {
      uni.navigateTo({
        url: `/pages/knowledge/detail?id=${knowledgeId}`
      })
    },
    
    async removeRelatedKnowledge(knowledgeId) {
      uni.showModal({
        title: '确认操作',
        content: '确定要移除此相关知识的关联吗？',
        success: async (res) => {
          if (res.confirm) {
            try {
              // 这里需要实现移除关联的API
              await knowledgeApi.removeKnowledgeRelation(this.knowledgeId, knowledgeId)
              await this.loadRelatedKnowledge()
              uni.showToast({
                title: '移除成功',
                icon: 'success'
              })
            } catch (error) {
              console.error('移除关联失败:', error)
              uni.showToast({
                title: '移除失败',
                icon: 'error'
              })
            }
          }
        }
      })
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
        const knowledgeData = {
          title: this.formData.title.trim(),
          summary: this.formData.summary.trim(),
          category: this.formData.category,
          content: this.formData.content.trim(),
          tags: this.formData.tags,
          project_name: this.formData.relatedProject
        }
        
        if (this.isEdit) {
          await knowledgeApi.updateKnowledge(this.knowledgeId, knowledgeData)
        } else {
          await knowledgeApi.createKnowledge(knowledgeData)
        }
        
        // 清除草稿
        uni.removeStorageSync('knowledge_draft')
        
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
    

  }
}
</script>

<style lang="scss" scoped>
.create-knowledge-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 120rpx;
}

.navbar-placeholder {
  height: 88rpx;
}

.form-content {
  padding: 24rpx 32rpx 24rpx 24rpx;
  box-sizing: border-box;
}

.form-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx 24rpx;
  margin-bottom: 24rpx;
  box-sizing: border-box;
  
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
    color: #86909C;
    margin-top: 10rpx;
  }

  .summary-input {
    background-color: #F7F8FA;
    border-radius: 12rpx;
    padding: 20rpx;
    font-size: 28rpx;
    color: #1D2129;
    min-height: 120rpx;
  }

  .summary-input ::v-deep .nut-textarea__textarea {
    background-color: transparent;
    border: none;
    outline: none;
    resize: none;
  }
  
  .project-selector {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background-color: #f5f5f5;
    border-radius: 12rpx;
    padding: 24rpx;
    
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
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 24rpx 32rpx 24rpx 24rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  border-top: 1rpx solid #e5e6eb;
  z-index: 100;
  box-sizing: border-box;
  
  .save-btn {
    height: 88rpx;
    border-radius: 44rpx;
    background: linear-gradient(135deg, #165dff 0%, #0e42d2 100%);
  }
}

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
  
  .project-list {
    max-height: 600rpx;
    
    .project-option {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24rpx 32rpx;
      border-bottom: 1rpx solid #f2f3f5;
      
      &:last-child {
        border-bottom: none;
      }
      
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
    padding: 32rpx 32rpx 16rpx;
    text-align: center;
    
    .modal-title {
      font-size: 32rpx;
      font-weight: 600;
      color: #1d2129;
    }
  }
  
  .modal-content {
    padding: 0 32rpx 24rpx;
    
    .tag-input {
      background-color: #f2f3f5;
      border-radius: 12rpx;
      padding: 24rpx;
    }
  }
  
  .modal-actions {
    display: flex;
    gap: 16rpx;
    padding: 0 32rpx 32rpx;
  }
}

.related-knowledge {
  .knowledge-list {
    .knowledge-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24rpx;
      background-color: #f8f9fa;
      border-radius: 12rpx;
      margin-bottom: 16rpx;
      
      .knowledge-info {
        flex: 1;
        
        .knowledge-title {
          display: block;
          font-size: 28rpx;
          font-weight: 500;
          color: #1d2129;
          margin-bottom: 8rpx;
        }
        
        .knowledge-summary {
          font-size: 24rpx;
          color: #86909c;
          line-height: 1.4;
        }
      }
      
      .knowledge-actions {
        display: flex;
        gap: 16rpx;
        margin-left: 16rpx;
      }
    }
  }
  
  .empty-knowledge {
    text-align: center;
    padding: 48rpx 24rpx;
    
    .empty-text {
      font-size: 26rpx;
      color: #86909c;
    }
  }
  
  .refresh-btn {
    margin-top: 16rpx;
    width: 100%;
  }
}
</style>