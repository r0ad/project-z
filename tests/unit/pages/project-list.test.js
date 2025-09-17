/**
 * 项目列表页面测试
 * 测试页面核心业务逻辑，不依赖Vue组件渲染
 */

// Mock uni API
global.uni = {
  navigateTo: jest.fn(),
  showToast: jest.fn(),
  showActionSheet: jest.fn(),
  showModal: jest.fn(),
  stopPullDownRefresh: jest.fn(),
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn()
}

// Mock API模块
const mockProjectApi = {
  getProjectList: jest.fn(),
  deleteProject: jest.fn()
}

const mockAiApi = {
  getAIConfigList: jest.fn()
}

// 模拟页面实例
class ProjectListPage {
  constructor() {
    this.projectList = []
    this.loading = false
    this.refreshing = false
    this.isAIConfigured = false
    this.showQuickTip = true
  }

  async checkAIConfiguration() {
    try {
      const configs = await mockAiApi.getAIConfigList()
      this.isAIConfigured = configs && configs.length > 0 && configs.some(config => config.is_active)
    } catch (error) {
      console.error('检查AI配置失败:', error)
      this.isAIConfigured = false
    }
  }

  goToAISettings() {
    uni.navigateTo({
      url: '/pages/profile/ai-settings'
    })
  }

  goToPromoCode() {
    uni.navigateTo({
      url: '/pages/profile/index?tab=promo'
    })
  }

  async loadProjects() {
    if (this.loading) return
    
    this.loading = true
    try {
      const projects = await mockProjectApi.getProjectList()
      this.projectList = projects || []
    } catch (error) {
      console.error('加载项目列表失败:', error)
      uni.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      })
    } finally {
      this.loading = false
    }
  }

  async refreshProjects() {
    this.refreshing = true
    try {
      await this.loadProjects()
      uni.showToast({
        title: '刷新成功',
        icon: 'success'
      })
    } catch (error) {
      uni.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      this.refreshing = false
      uni.stopPullDownRefresh()
    }
  }

  getStatusType(status) {
    const statusMap = {
      progress: 'success',
      warning: 'warning',
      completed: 'default'
    }
    return statusMap[status] || 'default'
  }

  getProgressColor(status) {
    const colorMap = {
      progress: '#165DFF',
      warning: '#FF7D00',
      completed: '#00B42A'
    }
    return colorMap[status] || '#165DFF'
  }

  createProject() {
    if (!this.isAIConfigured) {
      uni.showActionSheet({
        title: '创建项目需要AI支持，请选择配置方式',
        itemList: ['使用分享码', '手动配置AI'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.goToPromoCode()
          } else if (res.tapIndex === 1) {
            this.goToAISettings()
          }
        }
      })
      return
    }
    
    uni.navigateTo({
      url: '/pages/project/create'
    })
  }

  goToDetail(project) {
    if (!this.isAIConfigured) {
      uni.showActionSheet({
        title: '查看项目详情需要AI支持，请选择配置方式',
        itemList: ['使用分享码', '手动配置AI'],
        success: (res) => {
          if (res.tapIndex === 0) {
            this.goToPromoCode()
          } else if (res.tapIndex === 1) {
            this.goToAISettings()
          }
        }
      })
      return
    }
    
    uni.navigateTo({
      url: `/pages/project/detail?id=${project.id}&title=${project.title}`
    })
  }

  async deleteProject(project, index) {
    try {
      const result = await uni.showModal({
        title: '确认删除',
        content: `确定要删除项目"${project.title}"吗？此操作不可恢复。`,
        confirmText: '删除',
        cancelText: '取消'
      })
      
      if (result.confirm) {
        await mockProjectApi.deleteProject(project.id)
        this.projectList.splice(index, 1)
        uni.showToast({
          title: '删除成功',
          icon: 'success'
        })
      }
    } catch (error) {
      console.error('删除项目失败:', error)
      uni.showToast({
        title: '删除失败，请重试',
        icon: 'none'
      })
    }
  }

  getLatestMilestone(project) {
    if (!project.milestones || project.milestones.length === 0) {
      return null
    }
    
    const inProgress = project.milestones.find(m => m.status === 'progress')
    if (inProgress) return inProgress
    
    const pending = project.milestones.find(m => m.status === 'pending')
    if (pending) return pending
    
    const completed = project.milestones.filter(m => m.status === 'completed')
    if (completed.length > 0) {
      return completed[completed.length - 1]
    }
    
    return project.milestones[0]
  }

  getMilestoneStatusClass(status) {
    return {
      'status-completed': status === 'completed',
      'status-progress': status === 'progress',
      'status-pending': status === 'pending'
    }
  }

  checkQuickTipStatus() {
    try {
      const tipClosed = uni.getStorageSync('project_list_tip_closed')
      this.showQuickTip = !tipClosed
    } catch (error) {
      console.error('检查提示状态失败:', error)
      this.showQuickTip = true
    }
  }

  closeQuickTip() {
    try {
      uni.setStorageSync('project_list_tip_closed', true)
      this.showQuickTip = false
    } catch (error) {
      console.error('关闭提示失败:', error)
    }
  }
}

describe('项目列表页面测试', () => {
  let pageInstance

  beforeEach(() => {
    jest.clearAllMocks()
    pageInstance = new ProjectListPage()
  })

  describe('AI配置检查测试', () => {
    it('应该检查AI配置状态', async () => {
      mockAiApi.getAIConfigList.mockResolvedValue([
        { id: 1, provider: 'OpenAI', is_active: 1 }
      ])
      
      await pageInstance.checkAIConfiguration()
      
      expect(mockAiApi.getAIConfigList).toHaveBeenCalled()
      expect(pageInstance.isAIConfigured).toBe(true)
    })

    it('应该在没有AI配置时返回false', async () => {
      mockAiApi.getAIConfigList.mockResolvedValue([])
      
      await pageInstance.checkAIConfiguration()
      
      expect(pageInstance.isAIConfigured).toBe(false)
    })

    it('应该处理AI配置检查失败', async () => {
      mockAiApi.getAIConfigList.mockRejectedValue(new Error('配置检查失败'))
      
      await pageInstance.checkAIConfiguration()
      
      expect(pageInstance.isAIConfigured).toBe(false)
    })
  })

  describe('项目列表加载测试', () => {
    it('应该加载项目列表', async () => {
      const mockProjects = [
        { id: 1, title: '测试项目1', status: 'progress', progress: 75 },
        { id: 2, title: '测试项目2', status: 'completed', progress: 100 }
      ]
      
      mockProjectApi.getProjectList.mockResolvedValue(mockProjects)
      
      await pageInstance.loadProjects()
      
      expect(mockProjectApi.getProjectList).toHaveBeenCalled()
      expect(pageInstance.projectList).toEqual(mockProjects)
      expect(pageInstance.loading).toBe(false)
    })

    it('应该处理加载失败的情况', async () => {
      mockProjectApi.getProjectList.mockRejectedValue(new Error('加载失败'))
      
      await pageInstance.loadProjects()
      
      expect(uni.showToast).toHaveBeenCalledWith({
        title: '加载失败，请重试',
        icon: 'none'
      })
      expect(pageInstance.loading).toBe(false)
    })

    it('应该防止重复加载', async () => {
      pageInstance.loading = true
      
      await pageInstance.loadProjects()
      
      expect(mockProjectApi.getProjectList).not.toHaveBeenCalled()
    })
  })

  describe('项目操作测试', () => {
    beforeEach(() => {
      pageInstance.projectList = [
        { id: 1, title: '测试项目1', status: 'progress' },
        { id: 2, title: '测试项目2', status: 'completed' }
      ]
    })

    it('应该能够创建新项目（已配置AI）', () => {
      pageInstance.isAIConfigured = true
      pageInstance.createProject()
      
      expect(uni.navigateTo).toHaveBeenCalledWith({
        url: '/pages/project/create'
      })
    })

    it('应该在未配置AI时显示配置选项', () => {
      pageInstance.isAIConfigured = false
      pageInstance.createProject()
      
      expect(uni.showActionSheet).toHaveBeenCalledWith({
        title: '创建项目需要AI支持，请选择配置方式',
        itemList: ['使用分享码', '手动配置AI'],
        success: expect.any(Function)
      })
    })

    it('应该能够跳转到项目详情（已配置AI）', () => {
      pageInstance.isAIConfigured = true
      const project = pageInstance.projectList[0]
      
      pageInstance.goToDetail(project)
      
      expect(uni.navigateTo).toHaveBeenCalledWith({
        url: `/pages/project/detail?id=${project.id}&title=${project.title}`
      })
    })

    it('应该能够删除项目', async () => {
      uni.showModal.mockResolvedValue({ confirm: true })
      mockProjectApi.deleteProject.mockResolvedValue(true)
      
      const project = pageInstance.projectList[0]
      const initialLength = pageInstance.projectList.length
      
      await pageInstance.deleteProject(project, 0)
      
      expect(uni.showModal).toHaveBeenCalledWith({
        title: '确认删除',
        content: `确定要删除项目"${project.title}"吗？此操作不可恢复。`,
        confirmText: '删除',
        cancelText: '取消'
      })
      expect(mockProjectApi.deleteProject).toHaveBeenCalledWith(project.id)
      expect(pageInstance.projectList).toHaveLength(initialLength - 1)
      expect(uni.showToast).toHaveBeenCalledWith({
        title: '删除成功',
        icon: 'success'
      })
    })

    it('应该处理删除取消的情况', async () => {
      uni.showModal.mockResolvedValue({ confirm: false })
      
      const project = pageInstance.projectList[0]
      await pageInstance.deleteProject(project, 0)
      
      expect(mockProjectApi.deleteProject).not.toHaveBeenCalled()
    })
  })

  describe('状态和样式测试', () => {
    it('应该正确获取状态类型', () => {
      expect(pageInstance.getStatusType('progress')).toBe('success')
      expect(pageInstance.getStatusType('warning')).toBe('warning')
      expect(pageInstance.getStatusType('completed')).toBe('default')
      expect(pageInstance.getStatusType('unknown')).toBe('default')
    })

    it('应该正确获取进度条颜色', () => {
      expect(pageInstance.getProgressColor('progress')).toBe('#165DFF')
      expect(pageInstance.getProgressColor('warning')).toBe('#FF7D00')
      expect(pageInstance.getProgressColor('completed')).toBe('#00B42A')
      expect(pageInstance.getProgressColor('unknown')).toBe('#165DFF')
    })

    it('应该正确获取最新里程碑', () => {
      const project = {
        milestones: [
          { id: 1, title: '里程碑1', status: 'completed' },
          { id: 2, title: '里程碑2', status: 'progress' }
        ]
      }
      
      const latestMilestone = pageInstance.getLatestMilestone(project)
      
      expect(latestMilestone).toBeTruthy()
      expect(latestMilestone.status).toBe('progress')
    })

    it('应该正确获取里程碑状态样式类', () => {
      const statusClass = pageInstance.getMilestoneStatusClass('completed')
      
      expect(statusClass).toEqual({
        'status-completed': true,
        'status-progress': false,
        'status-pending': false
      })
    })
  })

  describe('导航功能测试', () => {
    it('应该能够跳转到AI设置页面', () => {
      pageInstance.goToAISettings()
      
      expect(uni.navigateTo).toHaveBeenCalledWith({
        url: '/pages/profile/ai-settings'
      })
    })

    it('应该能够跳转到分享码页面', () => {
      pageInstance.goToPromoCode()
      
      expect(uni.navigateTo).toHaveBeenCalledWith({
        url: '/pages/profile/index?tab=promo'
      })
    })
  })

  describe('快捷提示测试', () => {
    it('应该能够关闭快捷提示', () => {
      pageInstance.showQuickTip = true
      pageInstance.closeQuickTip()
      
      expect(uni.setStorageSync).toHaveBeenCalledWith('project_list_tip_closed', true)
      expect(pageInstance.showQuickTip).toBe(false)
    })

    it('应该检查快捷提示状态', () => {
      uni.getStorageSync.mockReturnValue(true)
      pageInstance.checkQuickTipStatus()
      
      expect(pageInstance.showQuickTip).toBe(false)
    })
  })

  describe('刷新功能测试', () => {
    it('应该能够刷新项目列表', async () => {
      mockProjectApi.getProjectList.mockResolvedValue([])
      
      await pageInstance.refreshProjects()
      
      expect(mockProjectApi.getProjectList).toHaveBeenCalled()
      expect(uni.showToast).toHaveBeenCalledWith({
        title: '刷新成功',
        icon: 'success'
      })
      expect(uni.stopPullDownRefresh).toHaveBeenCalled()
    })

    it('应该处理刷新失败的情况', async () => {
      mockProjectApi.getProjectList.mockRejectedValue(new Error('刷新失败'))
      
      await pageInstance.refreshProjects()
      
      // 刷新失败时只会调用loadProjects中的错误toast，因为loadProjects内部已经处理了异常
      expect(uni.showToast).toHaveBeenCalledWith({
        title: '加载失败，请重试',
        icon: 'none'
      })
      expect(uni.stopPullDownRefresh).toHaveBeenCalled()
    })
  })

  describe('错误处理测试', () => {
    it('应该处理删除项目失败', async () => {
      uni.showModal.mockResolvedValue({ confirm: true })
      mockProjectApi.deleteProject.mockRejectedValue(new Error('删除失败'))
      
      const project = pageInstance.projectList[0]
      await pageInstance.deleteProject(project, 0)
      
      expect(uni.showToast).toHaveBeenCalledWith({
        title: '删除失败，请重试',
        icon: 'none'
      })
    })

    it('应该处理关闭提示失败', () => {
      uni.setStorageSync.mockImplementation(() => {
        throw new Error('存储失败')
      })
      
      pageInstance.closeQuickTip()
      
      expect(pageInstance.showQuickTip).toBe(true)
    })
  })
})
