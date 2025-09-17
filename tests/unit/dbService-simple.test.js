/**
 * 数据库服务简化测试 (P0 核心功能)
 * 使用 CommonJS 语法，避免 ES6 模块问题
 */

// Mock plus.sqlite API
global.plus = {
  sqlite: {
    isOpenDatabase: jest.fn(),
    openDatabase: jest.fn(),
    executeSql: jest.fn(),
    selectSql: jest.fn(),
    closeDatabase: jest.fn()
  }
}

// Mock dbUpgradeConfig
jest.mock('@/utils/dbUpgradeConfig.js', () => ({
  current_version: '1.0.0',
  upgrade_order: ['1.0.0'],
  versions: {
    '1.0.0': {
      description: '初始版本',
      scripts: [
        {
          type: 'create_table',
          name: 'users',
          sql: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL)',
          ignore_error: false
        }
      ]
    }
  }
}))

// 使用 require 而不是 import
const dbService = require('@/utils/dbService.js').default

describe('数据库服务简化测试 (P0)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 重置数据库服务状态
    dbService.isInitialized = false
  })

  describe('数据库初始化测试', () => {
    it('应该能够检测数据库是否已打开', () => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(true)
      
      const isOpen = dbService.isOpen()
      
      expect(isOpen).toBe(true)
      expect(global.plus.sqlite.isOpenDatabase).toHaveBeenCalledWith({
        name: 'ai_project_manage.db',
        path: '_doc/ai_project_manage.db'
      })
    })

    it('应该能够处理数据库未打开的情况', () => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(false)
      
      const isOpen = dbService.isOpen()
      
      expect(isOpen).toBe(false)
    })
  })

  describe('数据库操作测试', () => {
    beforeEach(() => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(true)
      global.plus.sqlite.openDatabase.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })
      global.plus.sqlite.executeSql.mockImplementation(({ success }) => {
        success({ insertId: 1 })
        return Promise.resolve()
      })
      global.plus.sqlite.selectSql.mockImplementation(({ success }) => {
        success([{ id: 1, name: 'test' }])
        return Promise.resolve()
      })
    })

    it('应该能够执行 SQL 语句', async () => {
      await dbService.initDB()
      
      const result = await dbService.executeSql('SELECT * FROM users')
      
      expect(global.plus.sqlite.executeSql).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('应该能够查询数据', async () => {
      await dbService.initDB()
      
      const result = await dbService.query('SELECT * FROM users WHERE id = ?', [1])
      
      expect(global.plus.sqlite.selectSql).toHaveBeenCalled()
      expect(result).toEqual([{ id: 1, name: 'test' }])
    })
  })

  describe('错误处理测试', () => {
    it('应该能够处理 SQL 执行错误', async () => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(true)
      global.plus.sqlite.openDatabase.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })
      global.plus.sqlite.executeSql.mockImplementation(({ fail }) => {
        fail(new Error('SQL 执行失败'))
        return Promise.reject()
      })

      await dbService.initDB()
      
      await expect(dbService.executeSql('INVALID SQL')).rejects.toThrow('SQL 执行失败')
    })
  })
})
