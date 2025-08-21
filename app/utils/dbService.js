/**
 * SQLite数据库统一访问工具
 * 提供数据库初始化、基础CRUD操作等功能
 */
import dbUpgradeConfig from '@/utils/dbUpgradeConfig.js'

class DBService {
  constructor() {
    this.dbName = 'ai_project_manage.db'
    this.dbPath = '_doc/ai_project_manage.db'
    this.isInitialized = false
    this.currentVersion = '1.0.0' // 当前数据库版本
  }

  /**
   * 判断数据库是否打开
   */
  isOpen() {
    try {
      return plus.sqlite.isOpenDatabase({
        name: this.dbName,
        path: this.dbPath
      })
    } catch (e) {
      return false
    }
  }

  /**
   * 初始化数据库
   */
  async initDB() {
    // 如果已经初始化，直接返回
    if (this.isInitialized) {
      return Promise.resolve(true)
    }
    
    console.log('开始数据库初始化流程...')
    
    try {
      // 检查plus.sqlite是否可用
      if (typeof plus === 'undefined' || !plus.sqlite) {
        throw new Error('plus.sqlite 不可用，请确保在App环境中运行')
      }
      
      // 如果数据库已经打开，进行版本检查
      if (this.isOpen()) {
        console.log('数据库已经打开，进行版本检查...')
        await this.checkAndUpgradeDatabase()
        this.isInitialized = true
        return true
      }
      
      // 打开数据库
      await this.openDatabase()
      
      // 检查并升级数据库
      await this.checkAndUpgradeDatabase()
      
      // 标记为已初始化
      this.isInitialized = true
      console.log('数据库初始化完成')
      
      return true
    } catch (error) {
      console.error('数据库初始化失败:', error)
      this.isInitialized = false
      throw error
    }
  }
  
  /**
   * 打开数据库
   */
  async openDatabase() {
    console.log('尝试打开数据库:', this.dbName)
    
    return new Promise((resolve, reject) => {
      plus.sqlite.openDatabase({
        name: this.dbName,
        path: this.dbPath,
        success: (e) => {
          console.log('数据库打开成功')
          resolve(e)
        },
        fail: (e) => {
          console.error('数据库打开失败:', e)
          reject(e)
        }
      })
    })
  }

  /**
   * 检查并升级数据库
   */
  async checkAndUpgradeDatabase() {
    // 加载升级配置
    const upgradeConfig = await this.loadUpgradeConfig()
    const targetVersion = upgradeConfig.current_version
    let dbVersion = '0.0.0' // 默认版本
    
    try {
      // 尝试获取当前数据库版本
      const versionResult = await this.query('SELECT value FROM settings WHERE category = ? AND key = ?', ['system', 'db_version'])
      if (versionResult.length > 0) {
        dbVersion = versionResult[0].value
      }
    } catch (error) {
      console.log('获取数据库版本失败，可能是首次初始化:', error)
      dbVersion = '0.0.0'
    }
    
    console.log(`当前数据库版本: ${dbVersion}, 目标版本: ${targetVersion}`)
    
    if (dbVersion === targetVersion) {
      console.log('数据库版本已是最新，无需升级')
      return
    }
    
    // 执行升级
    await this.executeUpgrade(dbVersion, targetVersion, upgradeConfig)
    
    // 更新版本信息
    await this.updateDatabaseVersion(targetVersion)
  }
  
  /**
   * 加载升级配置文件
   */
  async loadUpgradeConfig() {
    try {
      // 导入JS配置文件
      const config = dbUpgradeConfig
      return config
    } catch (error) {
      console.error('加载升级配置失败:', error)
      // 返回默认配置
      return this.getDefaultUpgradeConfig()
    }
  }
  
  /**
   * 获取默认升级配置（备用方案）
   */
  getDefaultUpgradeConfig() {
    return {
      current_version: '1.0.0',
      upgrade_order: ['1.0.0'],
      versions: {}
    }
  }
  
  /**
   * 执行数据库升级
   */
  async executeUpgrade(fromVersion, toVersion, upgradeConfig) {
    console.log(`执行数据库升级: ${fromVersion} -> ${toVersion}`)
    
    // 获取需要执行的版本列表
    const versionsToExecute = this.getVersionsToExecute(fromVersion, toVersion, upgradeConfig.upgrade_order)
    
    if (versionsToExecute.length === 0) {
      console.log('没有需要执行的升级脚本')
      return
    }
    
    // 按顺序执行每个版本的脚本
    for (const version of versionsToExecute) {
      console.log(`执行版本 ${version} 的升级脚本...`)
      const versionConfig = upgradeConfig.versions[version]
      
      if (!versionConfig) {
        console.warn(`版本 ${version} 的配置不存在，跳过`)
        continue
      }
      
      await this.executeVersionScripts(version, versionConfig)
    }
    
    console.log('数据库升级完成')
  }
  
  /**
   * 获取需要执行的版本列表
   */
  getVersionsToExecute(fromVersion, toVersion, upgradeOrder) {
    if (fromVersion === '0.0.0') {
      // 全量初始化，执行所有版本
      return upgradeOrder.filter(v => this.compareVersion(v, toVersion) <= 0)
    }
    
    // 增量升级，只执行大于当前版本且小于等于目标版本的脚本
    return upgradeOrder.filter(v => 
      this.compareVersion(v, fromVersion) > 0 && 
      this.compareVersion(v, toVersion) <= 0
    )
  }
  
  /**
   * 执行特定版本的脚本
   */
  async executeVersionScripts(version, versionConfig) {
    console.log(`执行版本 ${version}: ${versionConfig.description}`)
    
    for (const script of versionConfig.scripts) {
      try {
        console.log(`执行脚本: ${script.type} - ${script.name || 'unnamed'}`)
        await this.executeSql(script.sql)
        console.log(`脚本执行成功: ${script.name || 'unnamed'}`)
      } catch (error) {
        if (script.ignore_error) {
          console.log(`脚本执行失败但忽略错误: ${script.name || 'unnamed'}`, error)
        } else {
          console.error(`脚本执行失败: ${script.name || 'unnamed'}`, error)
          throw error
        }
      }
    }
  }
  
  /**
   * 版本比较函数
   * 返回值: -1 表示 v1 < v2, 0 表示 v1 = v2, 1 表示 v1 > v2
   */
  compareVersion(v1, v2) {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0
      const part2 = parts2[i] || 0
      
      if (part1 < part2) return -1
      if (part1 > part2) return 1
    }
    
    return 0
  }
  

  

   
   /**
    * 创建基础表（1.0.0版本）
    */
   async createBasicTables() {
     console.log('创建基础表结构...')
     
     // 用户表
     await this.executeSql(`
       CREATE TABLE IF NOT EXISTS users (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         username TEXT UNIQUE NOT NULL,
         email TEXT UNIQUE,
         password_hash TEXT NOT NULL,
         avatar_url TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
       )
     `)
     
     // 项目表（基础版本，不包含ai_suggestions）
     await this.executeSql(`
       CREATE TABLE IF NOT EXISTS projects (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         user_id INTEGER NOT NULL,
         name TEXT NOT NULL,
         description TEXT,
         goal TEXT,
         status TEXT DEFAULT 'active',
         progress INTEGER DEFAULT 0,
         start_date DATE,
         end_date DATE,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         FOREIGN KEY (user_id) REFERENCES users(id)
       )
     `)
     
     // 设置表
     await this.executeSql(`
       CREATE TABLE IF NOT EXISTS settings (
         id INTEGER PRIMARY KEY AUTOINCREMENT,
         category TEXT NOT NULL,
         key TEXT NOT NULL,
         value TEXT,
         created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
         UNIQUE(category, key)
       )
     `)
     
     console.log('基础表创建完成')
    }
    
    /**
     * 创建项目相关表
     */
    async createProjectTables() {
      console.log('创建项目相关表...')
      
      // 项目里程碑表
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS project_milestones (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          due_date DATE,
          status TEXT DEFAULT 'pending',
          completed_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `)
      
      // 项目日志表
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS project_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          title TEXT NOT NULL,
          content TEXT,
          log_type TEXT DEFAULT 'general',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `)
      
      // 收藏表
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS favorites (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          item_type TEXT NOT NULL,
          item_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id),
          UNIQUE(user_id, item_type, item_id)
        )
      `)
      
      console.log('项目相关表创建完成')
    }

    /**
     * 创建AI相关表
     */
    async createAITables() {
      console.log('创建AI相关表...')
      
      // AI分析表
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS ai_analyses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          suggestions TEXT,
          analysis_type TEXT DEFAULT 'analysis',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `)
      
      // AI总结表
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS ai_summaries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          project_id INTEGER NOT NULL,
          content TEXT NOT NULL,
          suggestions TEXT,
          summary_type TEXT DEFAULT 'summary',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (project_id) REFERENCES projects(id)
        )
      `)
      
      // AI配置表
      await this.executeSql(`
        CREATE TABLE IF NOT EXISTS ai_config (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE,
          api_key TEXT NOT NULL,
          base_url TEXT,
          model TEXT DEFAULT 'gpt-3.5-turbo',
          is_active INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      console.log('AI相关表创建完成')
    }
   
   /**
    * 创建数据库索引
    */
   async createIndexes() {
     console.log('创建数据库索引...')
     
     const indexes = [
       'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)',
       'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)',
       'CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON project_milestones(project_id)',
       'CREATE INDEX IF NOT EXISTS idx_logs_project_id ON project_logs(project_id)',
       'CREATE INDEX IF NOT EXISTS idx_logs_created_at ON project_logs(created_at)',
       'CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge_base(title)',
       'CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_id ON ai_analyses(project_id)',
       'CREATE INDEX IF NOT EXISTS idx_ai_summaries_project_id ON ai_summaries(project_id)',
       'CREATE INDEX IF NOT EXISTS idx_settings_category_key ON settings(category, key)',
       'CREATE INDEX IF NOT EXISTS idx_ai_config_is_active ON ai_config(is_active)'
     ]
     
     for (const sql of indexes) {
       try {
         await this.executeSql(sql)
         console.log('创建索引成功:', sql.substring(0, 50) + '...')
       } catch (error) {
         console.log('创建索引失败:', error)
       }
     }
     
     console.log('数据库索引创建完成')
   }
  
  /**
   * 更新数据库版本
   */
  async updateDatabaseVersion(version) {
    try {
      await this.executeSql('INSERT OR REPLACE INTO settings (category, key, value) VALUES (?, ?, ?)', ['system', 'db_version', version])
      console.log(`数据库版本已更新为: ${version}`)
    } catch (error) {
      console.error('更新数据库版本失败:', error)
    }
  }

  /**
   * 强制重新执行数据库升级（用于重试失败的升级）
   */
  async forceRetryUpgrade() {
    console.log('开始强制重新执行数据库升级...')
    
    try {
      // 加载升级配置
      const upgradeConfig = await this.loadUpgradeConfig()
      const targetVersion = upgradeConfig.current_version
      
      // 获取当前数据库版本
      let currentVersion = '0.0.0'
      try {
        const versionResult = await this.query('SELECT value FROM settings WHERE category = ? AND key = ?', ['system', 'db_version'])
        if (versionResult.length > 0) {
          currentVersion = versionResult[0].value
        }
      } catch (error) {
        console.log('获取当前版本失败，使用默认版本:', error)
      }
      
      console.log(`强制升级: 当前版本 ${currentVersion} -> 目标版本 ${targetVersion}`)
      
      // 强制执行最新版本的升级脚本（忽略版本检查）
      const latestVersions = upgradeConfig.upgrade_order.slice(-3) // 执行最近3个版本的脚本
      
      for (const version of latestVersions) {
        console.log(`强制执行版本 ${version} 的升级脚本...`)
        const versionConfig = upgradeConfig.versions[version]
        
        if (!versionConfig) {
          console.warn(`版本 ${version} 的配置不存在，跳过`)
          continue
        }
        
        // 执行该版本的所有脚本，忽略错误
        for (const script of versionConfig.scripts) {
          try {
            console.log(`强制执行脚本: ${script.type} - ${script.name || 'unnamed'}`)
            await this.executeSql(script.sql)
            console.log(`脚本执行成功: ${script.name || 'unnamed'}`)
          } catch (error) {
            console.log(`脚本执行失败但继续: ${script.name || 'unnamed'}`, error)
            // 强制重试时忽略所有错误，继续执行下一个脚本
          }
        }
      }
      
      // 更新版本信息
      await this.updateDatabaseVersion(targetVersion)
      
      console.log('强制数据库升级完成')
      return true
      
    } catch (error) {
      console.error('强制数据库升级失败:', error)
      throw error
    }
  }

  /**
   * 创建所有数据库表（全量初始化用）
   */
  async createAllTables() {
    console.log('开始创建所有数据库表...')
    
    // 删除所有相关表，确保使用最新的表结构
    const tablesToDrop = [
      'projects', 'project_milestones', 'project_logs', 
      'knowledge_base', 'knowledge_tags', 'knowledge_tag_mappings',
      'ai_analyses', 'ai_summaries', 'favorites', 'settings', 'ai_config', 'users'
    ]
    
    for (const table of tablesToDrop) {
      try {
        await this.executeSql(`DROP TABLE IF EXISTS ${table}`)
        console.log(`已删除表: ${table}`)
      } catch (error) {
        console.log(`删除表 ${table} 失败:`, error)
      }
    }
    
    // 按顺序创建所有表
    await this.createBasicTables()      // 基础表（用户、项目基础版、设置）
    await this.createProjectTables()    // 项目相关表（里程碑、日志、收藏）
    await this.createAITables()         // AI相关表
    
    // 为projects表添加ai_suggestions字段（因为基础表中没有）
    try {
      await this.executeSql('ALTER TABLE projects ADD COLUMN ai_suggestions TEXT')
      console.log('已为projects表添加ai_suggestions字段')
    } catch (error) {
      console.log('添加ai_suggestions字段失败或字段已存在:', error)
    }
    
    // 创建索引
    await this.createIndexes()
    
    // 初始化默认用户
    await this.initDefaultUser()
    
    console.log('所有数据库表创建完成')
  }



  /**
   * 初始化默认用户
   */
  async initDefaultUser() {
    try {
      const userExists = await this.query('SELECT COUNT(*) as count FROM users')
      if (userExists[0].count === 0) {
        await this.executeSql(
          'INSERT INTO users (username, email, avatar, settings) VALUES (?, ?, ?, ?)',
          ['默认用户', 'default@example.com', '', JSON.stringify({})]
        )
        console.log('默认用户创建成功')
      } else {
        console.log('用户已存在，跳过默认用户创建')
      }
    } catch (error) {
      console.error('初始化默认用户失败:', error)
      // 不抛出错误，允许应用继续运行
    }
  }

  /**
   * 执行SQL语句
   * 注意：HTML5+ SQLite的executeSql不支持params参数，需要手动拼接SQL
   */
  async executeSql(sql, params = []) {
    return new Promise((resolve, reject) => {
      // HTML5+ SQLite的executeSql不支持params参数，需要手动替换占位符
      let finalSql = sql
      if (params && params.length > 0) {
        // 将?占位符替换为实际参数值
        let paramIndex = 0
        finalSql = sql.replace(/\?/g, () => {
          if (paramIndex < params.length) {
            const param = params[paramIndex++]
            // 对不同类型的参数进行处理
            if (param === null || param === undefined) {
              return 'NULL'
            } else if (typeof param === 'string') {
              return "'" + param.replace(/'/g, "''") + "'"
            } else if (typeof param === 'object') {
              // 对象或数组转换为JSON字符串
              return "'" + JSON.stringify(param).replace(/'/g, "''") + "'"
            } else {
              return param
            }
          }
          return '?'
        })
      }
      
      // console.log('执行SQL:', finalSql)
      
      plus.sqlite.executeSql({
        name: this.dbName,
        sql: finalSql,
        success: (e) => {
          resolve(e)
        },
        fail: (e) => {
          console.error('SQL执行失败:', finalSql, e)
          reject(e)
        }
      })
    })
  }

  /**
   * 查询数据
   * 注意：HTML5+ SQLite的selectSql不支持params参数，需要手动拼接SQL
   */
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      // HTML5+ SQLite的selectSql不支持params参数，需要手动替换占位符
      let finalSql = sql
      if (params && params.length > 0) {
        // 将?占位符替换为实际参数值
        let paramIndex = 0
        finalSql = sql.replace(/\?/g, () => {
          if (paramIndex < params.length) {
             const param = params[paramIndex++]
             // 对不同类型的参数进行处理
             if (param === null || param === undefined) {
               return 'NULL'
             } else if (typeof param === 'string') {
               return "'" + param.replace(/'/g, "''") + "'"
             } else if (typeof param === 'object') {
               // 对象或数组转换为JSON字符串
               return "'" + JSON.stringify(param).replace(/'/g, "''") + "'"
             } else {
               return param
             }
          }
          return '?'
        })
      }
      
      // console.log('执行查询SQL:', finalSql)
      
      plus.sqlite.selectSql({
        name: this.dbName,
        sql: finalSql,
        success: (e) => {
          resolve(e)
        },
        fail: (e) => {
          console.error('查询失败:', finalSql, e)
          reject(e)
        }
      })
    })
  }

  /**
   * 插入数据
   */
  async insert(table, data) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    const placeholders = keys.map(() => '?').join(', ')
    
    const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`
    console.log('插入SQL:', sql, values)
    const result = await this.executeSql(sql, values)
    
    // HTML5+ SQLite可能不返回insertId，需要手动查询
    if (result.insertId) {
      return result.insertId
    } else {
      // 查询最后插入的行ID
      const lastIdResult = await this.query('SELECT last_insert_rowid() as id')
      return lastIdResult[0].id
    }
  }

  /**
   * 更新数据
   */
  async update(table, data, where, whereParams = []) {
    const keys = Object.keys(data)
    const values = Object.values(data)
    
    // 构建SET子句
    const setClauses = []
    if (keys.length > 0) {
      setClauses.push(...keys.map(key => `${key} = ?`))
    }
    
    // 只有当data中没有updated_at字段时，才自动添加
    if (!keys.includes('updated_at')) {
      setClauses.push('updated_at = CURRENT_TIMESTAMP')
    }
    
    const sql = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${where}`
    
    return await this.executeSql(sql, [...values, ...whereParams])
  }

  /**
   * 删除数据
   */
  async delete(table, where, whereParams = []) {
    const sql = `DELETE FROM ${table} WHERE ${where}`
    return await this.executeSql(sql, whereParams)
  }

  /**
   * 获取单条记录
   */
  async findOne(table, where, whereParams = []) {
    const sql = `SELECT * FROM ${table} WHERE ${where} LIMIT 1`
    const result = await this.query(sql, whereParams)
    return result.length > 0 ? result[0] : null
  }

  /**
   * 获取多条记录
   */
  async findMany(table, where = '1=1', whereParams = [], orderBy = '', limit = '') {
    let sql = `SELECT * FROM ${table} WHERE ${where}`
    if (orderBy) sql += ` ORDER BY ${orderBy}`
    if (limit) sql += ` LIMIT ${limit}`
    
    return await this.query(sql, whereParams)
  }

  /**
   * 统计记录数
   */
  async count(table, where = '1=1', whereParams = []) {
    const sql = `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
    const result = await this.query(sql, whereParams)
    return result[0].count
  }

  /**
   * 导出所有数据
   */
  async exportAllData() {
    try {
      const exportData = {}
      
      // 获取所有表名
      const tables = await this.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      
      // 导出每个表的数据
      for (const table of tables) {
        const tableName = table.name
        const tableData = await this.query(`SELECT * FROM ${tableName}`)
        exportData[tableName] = tableData
      }
      
      return exportData
    } catch (error) {
      console.error('导出数据失败:', error)
      throw error
    }
  }

  /**
   * 导入所有数据
   */
  async importAllData(importData) {
    try {
      // 开始事务
      await this.executeSql('BEGIN TRANSACTION')
      
      // 清空所有表数据（保留表结构）
      const tables = await this.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      
      for (const table of tables) {
        const tableName = table.name
        await this.executeSql(`DELETE FROM ${tableName}`)
      }
      
      // 导入数据
      for (const [tableName, tableData] of Object.entries(importData)) {
        if (Array.isArray(tableData) && tableData.length > 0) {
          // 获取表结构
          const columns = Object.keys(tableData[0])
          const placeholders = columns.map(() => '?').join(', ')
          const columnNames = columns.join(', ')
          
          const insertSql = `INSERT INTO ${tableName} (${columnNames}) VALUES (${placeholders})`
          
          // 批量插入数据
          for (const row of tableData) {
            const values = columns.map(col => row[col])
            await this.executeSql(insertSql, values)
          }
        }
      }
      
      // 提交事务
      await this.executeSql('COMMIT')
      
      console.log('数据导入成功')
      return true
    } catch (error) {
      // 回滚事务
      try {
        await this.executeSql('ROLLBACK')
      } catch (rollbackError) {
        console.error('回滚事务失败:', rollbackError)
      }
      
      console.error('导入数据失败:', error)
      throw error
    }
  }

  /**
   * 关闭数据库
   */
  closeDB() {
    plus.sqlite.closeDatabase({
      name: this.dbName,
      success: () => {
        console.log('数据库关闭成功')
        this.isInitialized = false
      },
      fail: (e) => {
        console.error('数据库关闭失败:', e)
      }
    })
  }
}

// 创建单例实例
const dbService = new DBService()

export default dbService