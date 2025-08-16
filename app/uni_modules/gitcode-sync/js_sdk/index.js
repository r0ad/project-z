// GitCode同步插件
// 基于dairy-app项目的sync.js中的GitCodeSync类封装

// 通用请求封装
function request(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      ...options,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data)
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${JSON.stringify(res.data)}`))
        }
      },
      fail: reject
    })
  })
}

// GitCode同步类
export class GitCodeSync {
  constructor(config) {
    this.config = config
    this.baseUrl = config.baseUrl || 'https://gitcode.com/api/v5'
    
    // 验证必要的配置参数
    if (!config.owner) {
      throw new Error('GitCode配置缺少仓库所有者(owner)')
    }
    if (!config.repo) {
      throw new Error('GitCode配置缺少仓库名(repo)')
    }
    if (!config.accessToken) {
      throw new Error('GitCode配置缺少访问令牌')
    }
    
    // 设置默认值
    if (!config.branch) {
      this.config.branch = 'main'
    }
    if (!config.filePath) {
      this.config.filePath = 'data.json'
    }
    
    console.log('GitCode同步初始化:', {
      baseUrl: this.baseUrl,
      owner: config.owner,
      repo: config.repo,
      branch: this.config.branch,
      filePath: this.config.filePath
    })
  }

  // 检查分支是否存在
  async checkBranchExists(branchName) {
    const { owner, repo, accessToken } = this.config
    
    try {
      await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}/branches/${branchName}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      return true
    } catch (error) {
      if (error.message && error.message.includes('404')) {
        return false
      }
      throw error
    }
  }

  // 创建分支
  async createBranch(branchName, fromBranch = 'main') {
    const { owner, repo, accessToken } = this.config
    
    try {
      // 先获取源分支的最新commit SHA
      const fromBranchInfo = await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}/branches/${fromBranch}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      const sha = fromBranchInfo.commit.sha
      
      // 创建新分支
      await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}/branches`,
        method: 'POST',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          branch_name: branchName,
          refs: sha
        }
      })
      
      console.log(`分支 ${branchName} 创建成功`)
      return true
    } catch (error) {
      console.error('创建分支失败:', error)
      throw error
    }
  }

  // 上传数据
  async uploadData(data, filename) {
    const { owner, repo, accessToken, branch, filePath } = this.config
    const content = JSON.stringify(data, null, 2)
    const encodedContent = uni.base64Encode(content)
    const targetPath = filename || filePath
    
    try {
      console.log('开始上传文件到GitCode:', {
        owner,
        repo,
        branch,
        targetPath,
        baseUrl: this.baseUrl
      })
      
      // 先检查分支是否存在
      const branchExists = await this.checkBranchExists(branch)
      if (!branchExists) {
        console.log(`分支 ${branch} 不存在，尝试创建`)
        await this.createBranch(branch)
      }
      
      // 检查文件是否存在
      let fileExists = false
      let currentSha = null
      
      try {
        console.log('检查文件是否存在:', targetPath)
        const fileInfo = await request({
          url: `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(branch)}`,
          method: 'GET',
          header: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })
        
        if (fileInfo && fileInfo.sha) {
          fileExists = true
          currentSha = fileInfo.sha
          console.log('文件已存在，将进行更新操作, SHA:', currentSha)
        }
      } catch (e) {
        console.log('检查文件存在性的响应:', e.message)
        if (e.message && e.message.includes('404')) {
          console.log('文件不存在，将创建新文件')
          fileExists = false
        } else {
          console.error('检查文件存在性时出错:', e)
          throw new Error(`检查文件失败: ${e.message}`)
        }
      }

      // 准备提交数据
      const commitData = {
        branch: branch,
        content: encodedContent,
        commit_message: `${fileExists ? 'Update' : 'Create'} data file - ${new Date().toISOString()}`,
        encoding: 'base64'
      }
      
      if (fileExists && currentSha) {
        commitData.sha = currentSha
      }

      console.log('准备提交数据:', {
        branch: commitData.branch,
        commit_message: commitData.commit_message,
        encoding: commitData.encoding,
        contentLength: encodedContent.length,
        hasExistingSha: !!currentSha
      })

      // 创建或更新文件
      const result = await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}`,
        method: 'PUT',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: commitData
      })
      
      console.log('文件操作成功:', result)
      
      return {
        success: true,
        commit: result.commit,
        content: result.content,
        operation: fileExists ? 'updated' : 'created'
      }
    } catch (error) {
      console.error('GitCode上传失败:', error)
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack
      })
      
      // 提供更详细的错误信息
      let errorMessage = '上传失败'
      if (error.message) {
        if (error.message.includes('401')) {
          errorMessage = '认证失败，请检查访问令牌'
        } else if (error.message.includes('403')) {
          errorMessage = '权限不足，请检查令牌权限'
        } else if (error.message.includes('404')) {
          errorMessage = '仓库不存在或无访问权限，请检查仓库信息'
        } else if (error.message.includes('422')) {
          errorMessage = '参数错误，请检查分支名和文件路径'
        } else if (error.message.includes('400')) {
          errorMessage = '请求参数错误，请检查配置'
        } else {
          errorMessage = error.message
        }
      }
      
      throw new Error(errorMessage)
    }
  }

  // 下载数据
  async downloadData(filename) {
    const { owner, repo, accessToken, branch, filePath } = this.config
    const targetPath = filename || filePath
    
    try {
      console.log('下载文件:', targetPath, '分支:', branch)
      
      const fileInfo = await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(branch)}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!fileInfo || !fileInfo.content) {
        throw new Error('文件内容为空')
      }

      // 解码base64内容
      const content = uni.base64Decode(fileInfo.content)
      const data = JSON.parse(content)
      
      console.log('文件下载成功')
      return data
    } catch (error) {
      console.error('GitCode下载失败:', error)
      
      let errorMessage = '下载失败'
      if (error.message) {
        if (error.message.includes('404')) {
          errorMessage = '文件不存在，可能是首次同步'
        } else if (error.message.includes('401')) {
          errorMessage = '认证失败，请检查访问令牌'
        } else if (error.message.includes('403')) {
          errorMessage = '权限不足，请检查令牌权限'
        } else {
          errorMessage = error.message
        }
      }
      
      throw new Error(errorMessage)
    }
  }

  // 测试连接
  async testConnection() {
    const { owner, repo, accessToken } = this.config
    
    try {
      console.log('测试连接到仓库:', `${owner}/${repo}`)
      
      const result = await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('连接测试成功，仓库信息:', result.name)
      return {
        success: true,
        repoName: result.name,
        repoPath: result.path,
        visibility: result.visibility,
        defaultBranch: result.default_branch
      }
    } catch (error) {
      console.error('连接测试失败:', error)
      
      let errorMessage = '连接失败'
      if (error.message) {
        if (error.message.includes('401')) {
          errorMessage = '认证失败，请检查访问令牌是否正确'
        } else if (error.message.includes('403')) {
          errorMessage = '权限不足，请检查令牌权限'
        } else if (error.message.includes('404')) {
          errorMessage = '仓库不存在或无访问权限，请检查仓库信息'
        } else {
          errorMessage = error.message
        }
      }
      
      throw new Error(errorMessage)
    }
  }

  // 获取仓库信息
  async getRepoInfo() {
    return await this.testConnection()
  }

  // 获取分支列表
  async getBranches() {
    const { owner, repo, accessToken } = this.config
    
    try {
      console.log('获取仓库分支列表:', `${owner}/${repo}`)
      
      const result = await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}/branches`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('获取分支列表成功:', result.length, '个分支')
      return result
    } catch (error) {
      console.error('获取分支列表失败:', error)
      throw error
    }
  }
}

// 插件配置管理
export class GitCodeSyncConfig {
  static getConfig() {
    return uni.getStorageSync('gitcode_sync_config') || {}
  }

  static setConfig(config) {
    uni.setStorageSync('gitcode_sync_config', config)
  }

  static clearConfig() {
    uni.removeStorageSync('gitcode_sync_config')
  }

  static validateConfig(config) {
    const required = ['owner', 'repo', 'accessToken']
    const missing = required.filter(key => !config[key])
    
    if (missing.length > 0) {
      throw new Error(`缺少必要配置: ${missing.join(', ')}`)
    }
    
    return true
  }
}

// 默认导出
export default {
  GitCodeSync,
  GitCodeSyncConfig
}