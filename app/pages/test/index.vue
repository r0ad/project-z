<template>
  <view class="test-page">
    <nut-nav-bar title="功能测试" left-show @click-left="goBack" />
    
    <view class="test-section">
      <view class="section-title">数据库测试</view>
      <nut-button type="primary" @click="testDatabase" :loading="dbTesting">
        测试数据库连接
      </nut-button>
      <view class="test-result" v-if="dbResult">
        {{ dbResult }}
      </view>
    </view>
    
    <view class="test-section">
      <view class="section-title">项目API测试</view>
      <nut-button type="primary" @click="testProjectAPI" :loading="projectTesting">
        测试项目API
      </nut-button>
      <view class="test-result" v-if="projectResult">
        {{ projectResult }}
      </view>
    </view>
    
    <view class="test-section">
      <view class="section-title">日志API测试</view>
      <nut-button type="primary" @click="testLogAPI" :loading="logTesting">
        测试日志API
      </nut-button>
      <view class="test-result" v-if="logResult">
        {{ logResult }}
      </view>
    </view>
    
    <view class="test-section">
      <view class="section-title">AI API测试</view>
      <nut-button type="primary" @click="testAIAPI" :loading="aiTesting">
        测试AI API
      </nut-button>
      <view class="test-result" v-if="aiResult">
        {{ aiResult }}
      </view>
    </view>
    
    <view class="test-section">
      <view class="section-title">综合测试</view>
      <nut-button type="success" @click="runAllTests" :loading="allTesting">
        运行所有测试
      </nut-button>
      <view class="test-summary" v-if="testSummary">
        <view class="summary-title">测试结果汇总：</view>
        <view v-for="(result, index) in testSummary" :key="index" 
              :class="['summary-item', result.success ? 'success' : 'error']">
          {{ result.name }}: {{ result.success ? '✓ 通过' : '✗ 失败' }}
          <view v-if="!result.success" class="error-detail">{{ result.error }}</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import dbService from '@/utils/dbService.js'
import projectApi from '@/api/projectApi.js'
import logApi from '@/api/logApi.js'
import aiApi from '@/api/aiApi.js'

export default {
  data() {
    return {
      dbTesting: false,
      projectTesting: false,
      logTesting: false,
      aiTesting: false,
      allTesting: false,
      
      dbResult: '',
      projectResult: '',
      logResult: '',
      aiResult: '',
      testSummary: null
    }
  },
  
  methods: {
    goBack() {
      uni.navigateBack()
    },
    
    async testDatabase() {
      this.dbTesting = true
      this.dbResult = ''
      
      try {
        // 测试数据库连接
        await dbService.initDB()
        
        // 测试查询
        const result = await dbService.query('SELECT name FROM sqlite_master WHERE type="table"')
        
        this.dbResult = `数据库连接成功！\n发现 ${result.length} 个表：\n${result.map(r => r.name).join(', ')}`
        
      } catch (error) {
        this.dbResult = `数据库测试失败：${error.message}`
      } finally {
        this.dbTesting = false
      }
    },
    
    async testProjectAPI() {
      this.projectTesting = true
      this.projectResult = ''
      
      try {
        // 创建测试项目
        const testProject = {
          name: '测试项目',
          goal: '测试项目目标',
          description: '这是一个用于测试的项目',
          status: 'active'
        }
        
        const createResult = await projectApi.createProject(testProject)
        
        // 获取项目列表
        const projects = await projectApi.getProjectList()
        
        // 获取项目详情
        const projectDetail = await projectApi.getProjectDetail(createResult.id)
        
        this.projectResult = `项目API测试成功！\n创建项目ID: ${createResult.id}\n项目总数: ${projects.length}\n项目详情: ${projectDetail.name}`
        
      } catch (error) {
        this.projectResult = `项目API测试失败：${error.message}`
      } finally {
        this.projectTesting = false
      }
    },
    
    async testLogAPI() {
      this.logTesting = true
      this.logResult = ''
      
      try {
        // 先确保有项目存在
        const projects = await projectApi.getProjectList()
        let projectId = 1
        
        if (projects.length === 0) {
          const testProject = await projectApi.createProject({
            name: '日志测试项目',
            goal: '测试日志功能',
            description: '用于测试日志API的项目'
          })
          projectId = testProject.id
        } else {
          projectId = projects[0].id
        }
        
        // 创建测试日志
        const testLog = {
          project_id: projectId,
          content: '这是一条测试日志',
          progress_text: '完成了测试功能',
          problem_text: '暂无问题',
          plan_text: '继续测试其他功能'
        }
        
        const createResult = await logApi.createLog(testLog)
        
        // 获取项目日志
        const logs = await logApi.getProjectLogs(projectId)
        
        this.logResult = `日志API测试成功！\n创建日志ID: ${createResult.id}\n项目日志总数: ${logs.length}`
        
      } catch (error) {
        this.logResult = `日志API测试失败：${error.message}`
      } finally {
        this.logTesting = false
      }
    },
    
    async testAIAPI() {
      this.aiTesting = true
      this.aiResult = ''
      
      try {
        // 测试AI文本生成
        const response = await aiApi.sendAIRequest('你好，这是一个测试请求')
        
        // 测试语音转文本（模拟）
        const speechResult = await aiApi.speechToText('test_audio_data')
        
        this.aiResult = `AI API测试成功！\nAI回复: ${response.content.substring(0, 50)}...\n语音转文本: ${speechResult.text}`
        
      } catch (error) {
        this.aiResult = `AI API测试失败：${error.message}`
      } finally {
        this.aiTesting = false
      }
    },
    
    async runAllTests() {
      this.allTesting = true
      this.testSummary = []
      
      const tests = [
        { name: '数据库连接', test: this.testDatabaseSilent },
        { name: '项目API', test: this.testProjectAPISilent },
        { name: '日志API', test: this.testLogAPISilent },
        { name: 'AI API', test: this.testAIAPISilent }
      ]
      
      for (const testItem of tests) {
        try {
          await testItem.test()
          this.testSummary.push({
            name: testItem.name,
            success: true
          })
        } catch (error) {
          this.testSummary.push({
            name: testItem.name,
            success: false,
            error: error.message
          })
        }
      }
      
      this.allTesting = false
      
      // 显示测试完成提示
      const successCount = this.testSummary.filter(t => t.success).length
      uni.showToast({
        title: `测试完成：${successCount}/${tests.length} 通过`,
        icon: successCount === tests.length ? 'success' : 'error'
      })
    },
    
    // 静默测试方法（不更新UI）
    async testDatabaseSilent() {
      await dbService.initDB()
      await dbService.query('SELECT name FROM sqlite_master WHERE type="table"')
    },
    
    async testProjectAPISilent() {
      const testProject = {
        name: '静默测试项目',
        goal: '测试',
        description: '静默测试'
      }
      await projectApi.createProject(testProject)
      await projectApi.getProjectList()
    },
    
    async testLogAPISilent() {
      const projects = await projectApi.getProjectList()
      const projectId = projects.length > 0 ? projects[0].id : 1
      
      const testLog = {
        project_id: projectId,
        content: '静默测试日志'
      }
      await logApi.createLog(testLog)
    },
    
    async testAIAPISilent() {
      await aiApi.sendAIRequest('静默测试')
    }
  }
}
</script>

<style scoped>
.test-page {
  padding: 20rpx;
}

.test-section {
  margin-bottom: 40rpx;
  padding: 30rpx;
  background: white;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  color: #333;
}

.test-result {
  margin-top: 20rpx;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
  font-size: 28rpx;
  line-height: 1.5;
  white-space: pre-line;
}

.test-summary {
  margin-top: 20rpx;
}

.summary-title {
  font-size: 30rpx;
  font-weight: bold;
  margin-bottom: 15rpx;
  color: #333;
}

.summary-item {
  padding: 15rpx;
  margin-bottom: 10rpx;
  border-radius: 8rpx;
  font-size: 28rpx;
}

.summary-item.success {
  background: #f0f9ff;
  color: #0369a1;
  border: 1px solid #bae6fd;
}

.summary-item.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.error-detail {
  font-size: 24rpx;
  margin-top: 8rpx;
  opacity: 0.8;
}
</style>