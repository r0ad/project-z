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
    
    // 如果提供了repoUrl，尝试从URL中解析owner和repo
    console.log('[GitCodeSync] 构造函数参数:', config)
    if (config.repoUrl && (!config.owner || !config.repo)) {
      const parsed = this.parseRepoUrl(config.repoUrl)
      if (parsed.owner && parsed.repo) {
        this.config.owner = this.config.owner || parsed.owner
        this.config.repo = this.config.repo || parsed.repo
      }
    }
    
    // 验证必要的配置参数
    if (!this.config.owner) {
      throw new Error('GitCode配置缺少仓库所有者(owner)，请提供owner参数或完整的repoUrl')
    }
    if (!this.config.repo) {
      throw new Error('GitCode配置缺少仓库名(repo)，请提供repo参数或完整的repoUrl')
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
      owner: this.config.owner,
      repo: this.config.repo,
      branch: this.config.branch,
      filePath: this.config.filePath
    })
  }

  // 解析仓库URL，提取owner和repo信息
  parseRepoUrl(url) {
    try {
      console.log('[GitCodeSync] 开始解析仓库URL:', url)
      
      // 支持多种URL格式:
      // https://gitcode.com/owner/repo
      // https://gitcode.com/owner/repo.git
      // https://gitcode.com/owner/repo/
      
      // 兼容uni-app环境，使用字符串解析而不是URL构造函数
      let pathname = ''
      
      if (url.includes('://')) {
        // 提取路径部分
        const parts = url.split('://')
        if (parts.length > 1) {
          const hostAndPath = parts[1]
          const pathIndex = hostAndPath.indexOf('/')
          if (pathIndex !== -1) {
            pathname = hostAndPath.substring(pathIndex)
          }
        }
      } else {
        // 如果没有协议，假设整个字符串就是路径
        pathname = url.startsWith('/') ? url : '/' + url
      }
      
      console.log('[GitCodeSync] 提取的路径:', pathname)
      
      const pathParts = pathname.split('/').filter(part => part.length > 0)
      console.log('[GitCodeSync] 路径分割结果:', pathParts)
      
      if (pathParts.length >= 2) {
        const owner = pathParts[0]
        let repo = pathParts[1]
        
        // 移除.git后缀
        if (repo.endsWith('.git')) {
          repo = repo.slice(0, -4)
        }
        
        console.log('[GitCodeSync] 解析结果:', { owner, repo })
        return { owner, repo }
      } else {
        console.warn('[GitCodeSync] 路径分割结果不足2个部分，无法解析owner和repo')
      }
    } catch (error) {
      console.error('[GitCodeSync] 解析仓库URL失败:', error)
      console.error('[GitCodeSync] 错误详情:', {
        message: error.message,
        stack: error.stack,
        url: url
      })
    }
    
    return { owner: null, repo: null }
  }

  // 检查分支是否存在
  async checkBranchExists(branchName) {
    const { owner, repo, accessToken } = this.config
    
    try {
      console.log('[GitCodeSync] 检查分支是否存在:', branchName)
      
      const result = await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}/branches`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      const branchExists = result.some(branch => branch.name === branchName)
      console.log(`[GitCodeSync] 分支 ${branchName} ${branchExists ? '存在' : '不存在'}`)
      
      return branchExists
    } catch (error) {
      console.error('[GitCodeSync] 检查分支失败:', error)
      throw new Error(`检查分支失败: ${error.message}`)
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
  async uploadData(data, filename, commitMessage) {
    const { owner, repo, accessToken, branch, filePath } = this.config
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    
    // 兼容不同环境的base64编码
    let encodedContent;
    try {
      if (typeof btoa !== 'undefined') {
        encodedContent = btoa(unescape(encodeURIComponent(content)));
      } else if (typeof Buffer !== 'undefined') {
        // 使用Buffer进行编码（兼容Node.js环境）
        encodedContent = Buffer.from(content, 'utf-8').toString('base64');
      } else {
        // 手动实现base64编码（兼容更多环境）
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
        let result = '';
        let i = 0;
        const input = unescape(encodeURIComponent(content));
        
        while (i < input.length) {
          const a = input.charCodeAt(i++);
          const b = i < input.length ? input.charCodeAt(i++) : 0;
          const c = i < input.length ? input.charCodeAt(i++) : 0;
          
          const bitmap = (a << 16) | (b << 8) | c;
          
          result += chars.charAt((bitmap >> 18) & 63);
          result += chars.charAt((bitmap >> 12) & 63);
          result += i - 2 < input.length ? chars.charAt((bitmap >> 6) & 63) : '=';
          result += i - 1 < input.length ? chars.charAt(bitmap & 63) : '=';
        }
        
        encodedContent = result;
      }
      console.log('[GitCodeSync] 文件内容编码成功，长度:', encodedContent.length);
    } catch (encodeError) {
      console.error('[GitCodeSync] 文件内容编码失败:', encodeError);
      throw new Error('文件内容编码失败: ' + encodeError.message);
    }
    
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
        console.log('[GitCodeSync] 检查文件是否存在:', targetPath, '分支:', branch)
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
          console.log('[GitCodeSync] 文件已存在，将进行更新操作, SHA:', currentSha)
        }
      } catch (e) {
        console.log('[GitCodeSync] 检查文件存在性的响应:', e.message)
        if (e.message && e.message.includes('404')) {
          console.log('[GitCodeSync] 文件不存在，将创建新文件')
          fileExists = false
        } else {
          console.error('[GitCodeSync] 检查文件存在性时出错:', e)
          throw new Error(`检查文件失败: ${e.message}`)
        }
      }

      // 准备提交数据
      const commitData = {
        message: commitMessage || `${fileExists ? 'Update' : 'Create'} data file - ${new Date().toISOString()}`,
        content: encodedContent,
        branch: branch
      }
      
      console.log('[GitCodeSync] 准备提交数据详情:', {
        message: commitData.message,
        branch: commitData.branch,
        contentLength: encodedContent.length,
        targetPath: targetPath,
        fileExists: fileExists,
        currentSha: currentSha
      })
      
      if (fileExists && currentSha) {
        commitData.sha = currentSha
      }

      console.log('[GitCodeSync] 准备提交数据:', {
        branch: commitData.branch,
        commit_message: commitData.commit_message,
        encoding: commitData.encoding,
        contentLength: encodedContent.length,
        hasExistingSha: !!currentSha,
        operation: fileExists ? 'update' : 'create'
      })

      // 创建或更新文件
      let result
      
      if (fileExists) {
        // 更新现有文件 - 使用PUT方法
        console.log('[GitCodeSync] 更新现有文件:', targetPath)
        result = await request({
          url: `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}`,
          method: 'PUT',
          header: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: commitData
        })
      } else {
        // 创建新文件 - 使用POST方法
        console.log('[GitCodeSync] 创建新文件:', targetPath)
        // 创建新文件时不需要sha字段
        const createData = { ...commitData }
        delete createData.sha
        
        result = await request({
          url: `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}`,
          method: 'POST',
          header: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: createData
        })
      }
      
      console.log('[GitCodeSync] 文件操作成功:', result)
      
      return {
        success: true,
        commit: result.commit,
        content: result.content,
        operation: fileExists ? 'updated' : 'created'
      }
    } catch (error) {
      console.error('[GitCodeSync] 上传失败:', error)
      console.error('[GitCodeSync] 错误详情:', {
        message: error.message,
        stack: error.stack,
        config: {
          owner: owner,
          repo: repo,
          branch: branch,
          targetPath: targetPath,
          hasAccessToken: !!accessToken
        },
        commitData: commitData
      })
      
      // 提供更详细的错误信息
      let errorMessage = '上传失败'
      if (error.message) {
        if (error.message.includes('401')) {
          errorMessage = '认证失败，请检查访问令牌'
        } else if (error.message.includes('403')) {
          errorMessage = '权限不足，请检查令牌权限'
        } else if (error.message.includes('404')) {
          errorMessage = '仓库不存在或无访问权限，请检查owner/repo和分支名'
        } else if (error.message.includes('422')) {
          errorMessage = '参数错误，请检查分支名和文件路径'
        } else if (error.message.includes('409')) {
          errorMessage = '文件冲突，请重试同步'
        } else if (error.message.includes('400')) {
          if (error.message.includes('must not be blank')) {
            errorMessage = '请求参数不能为空，请检查message、content或branch字段'
          } else {
            errorMessage = '请求参数错误，请检查配置'
          }
        } else {
          errorMessage = error.message
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.message
      }
    }
  }

  // 下载数据
  async downloadData(filename) {
    const { owner, repo, accessToken, branch, filePath } = this.config
    const targetPath = filename || filePath
    const targetBranch = branch || 'main'
    
    try {
      console.log('[GitCodeSync] 开始下载文件:', targetPath, '分支:', targetBranch)
      
      // 先检查分支是否存在
      const branchExists = await this.checkBranchExists(targetBranch)
      if (!branchExists) {
        throw new Error(`分支 ${targetBranch} 不存在`)
      }
      
      const fileInfo = await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(targetPath)}?ref=${encodeURIComponent(targetBranch)}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!fileInfo || !fileInfo.content) {
        throw new Error('文件内容为空')
      }

      console.log('[GitCodeSync] 文件信息获取成功，SHA:', fileInfo.sha)
      
      // 解码base64内容
      console.log('[GitCodeSync] 开始解码文件内容');
      let content;
      try {
        // 兼容不同环境的base64解码
        if (typeof atob !== 'undefined') {
          content = decodeURIComponent(escape(atob(fileInfo.content)));
        } else if (typeof Buffer !== 'undefined') {
          // 使用Buffer进行解码（兼容Node.js环境）
          content = Buffer.from(fileInfo.content, 'base64').toString('utf-8');
        } else {
          // 手动实现base64解码（兼容更多环境）
          const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
          let result = '';
          let i = 0;
          const input = fileInfo.content.replace(/[^A-Za-z0-9+/]/g, '');
          
          while (i < input.length) {
            const encoded1 = chars.indexOf(input.charAt(i++));
            const encoded2 = chars.indexOf(input.charAt(i++));
            const encoded3 = chars.indexOf(input.charAt(i++));
            const encoded4 = chars.indexOf(input.charAt(i++));
            
            const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4;
            
            result += String.fromCharCode((bitmap >> 16) & 255);
            if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255);
            if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255);
          }
          
          content = decodeURIComponent(escape(result));
        }
        console.log('[GitCodeSync] 文件内容解码成功，长度:', content.length);
      } catch (decodeError) {
        console.error('[GitCodeSync] 文件内容解码失败:', decodeError);
        throw new Error('文件内容解码失败: ' + decodeError.message);
      }
      
      const data = JSON.parse(content)
      
      console.log('[GitCodeSync] 文件下载成功，数据大小:', JSON.stringify(data).length, '字符')
      return {
        success: true,
        data: data,
        message: '下载成功'
      }
    } catch (error) {
      console.error('[GitCodeSync] 下载失败:', error)
      console.error('[GitCodeSync] 错误详情:', {
        message: error.message,
        stack: error.stack,
        config: {
          owner: this.config.owner,
          repo: this.config.repo,
          branch: this.config.branch,
          targetPath: targetPath,
          hasAccessToken: !!this.config.accessToken
        }
      })
      
      let errorMessage = '下载失败'
      if (error.message) {
        if (error.message.includes('文件不存在') || error.message.includes('404')) {
          errorMessage = '文件不存在，可能是首次同步'
        } else if (error.message.includes('分支') && error.message.includes('不存在')) {
          errorMessage = error.message
        } else if (error.message.includes('401')) {
          errorMessage = '认证失败，请检查访问令牌'
        } else if (error.message.includes('403')) {
          errorMessage = '权限不足，请检查令牌权限'
        } else {
          errorMessage = error.message
        }
      }
      
      return {
        success: false,
        message: errorMessage,
        error: error.message
      }
    }
  }

  // 测试连接
  async testConnection() {
    const { owner, repo, accessToken } = this.config
    
    try {
      console.log('[GitCodeSync] 开始测试GitCode连接...')
      console.log('[GitCodeSync] 配置信息:', {
        baseUrl: this.baseUrl,
        owner: this.config.owner,
        repo: this.config.repo,
        branch: this.config.branch,
        hasAccessToken: !!this.config.accessToken
      })
      console.log('[GitCodeSync] 测试连接到仓库:', `${owner}/${repo}`)
      
      const result = await request({
        url: `${this.baseUrl}/repos/${owner}/${repo}`,
        method: 'GET',
        header: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      })
      
      console.log('[GitCodeSync] 连接测试成功，仓库信息:', result.name)
      return {
        success: true,
        repoName: result.name,
        repoPath: result.path,
        visibility: result.visibility,
        defaultBranch: result.default_branch
      }
    } catch (error) {
      console.error('[GitCodeSync] 连接测试失败:', error)
      console.error('[GitCodeSync] 错误详情:', {
        message: error.message,
        stack: error.stack
      })
      
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

  // 获取文件列表
  async listFiles(options = {}) {
    const { owner, repo, accessToken, branch } = this.config
    const { refName = branch } = options
    
    try {
      console.log('[GitCodeSync] 获取文件列表:', `${owner}/${repo}`, '分支:', refName)
      
      // 构建查询参数字符串（根据API文档，只支持access_token和ref_name参数）
      const queryString = `access_token=${encodeURIComponent(accessToken)}&ref_name=${encodeURIComponent(refName)}`
      
      const url = `https://api.gitcode.com/api/v5/repos/${owner}/${repo}/file_list?${queryString}`
      
      const result = await request({
        url: url,
        method: 'GET',
        header: {
          'Accept': 'application/json'
        }
      })
      
      console.log('[GitCodeSync] 获取文件列表成功:', Array.isArray(result) ? result.length : 0, '个文件')
      // API返回的是文件名字符串数组
      return Array.isArray(result) ? result : []
    } catch (error) {
      console.error('[GitCodeSync] 获取文件列表失败:', error)
      
      let errorMessage = '获取文件列表失败'
      if (error.message) {
        if (error.message.includes('401')) {
          errorMessage = '认证失败，请检查访问令牌是否正确'
        } else if (error.message.includes('403')) {
          errorMessage = '权限不足，请检查令牌权限'
        } else if (error.message.includes('404')) {
          errorMessage = '仓库或分支不存在，请检查仓库信息'
        } else {
          errorMessage = error.message
        }
      }
      
      throw new Error(errorMessage)
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