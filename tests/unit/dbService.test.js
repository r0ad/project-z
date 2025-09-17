/**
 * 数据库服务测试 (P0 核心功能)
 * 测试数据库初始化、CRUD操作、升级等核心功能
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

import dbService from '@/utils/dbService.js'

describe('数据库服务测试 (P0)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 重置数据库服务状态
    dbService.isInitialized = false
  })

  describe('数据库初始化测试', () => {
    it('应该能够初始化数据库', async () => {
      // Mock plus.sqlite 可用
      global.plus.sqlite.isOpenDatabase.mockReturnValue(false)
      global.plus.sqlite.openDatabase.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })

      const result = await dbService.initDB()
      
      expect(result).toBe(true)
      expect(dbService.isInitialized).toBe(true)
      expect(global.plus.sqlite.openDatabase).toHaveBeenCalled()
    })

    it('应该能够检测数据库是否已打开', () => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(true)
      
      const isOpen = dbService.isOpen()
      
      expect(isOpen).toBe(true)
      expect(global.plus.sqlite.isOpenDatabase).toHaveBeenCalledWith({
        name: 'ai_project_manage.db',
        path: '_doc/ai_project_manage.db'
      })
    })

    it('应该能够处理数据库初始化失败', async () => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(false)
      global.plus.sqlite.openDatabase.mockImplementation(({ fail }) => {
        fail(new Error('数据库打开失败'))
        return Promise.reject()
      })

      await expect(dbService.initDB()).rejects.toThrow('数据库打开失败')
      expect(dbService.isInitialized).toBe(false)
    })

    it('应该能够处理 plus.sqlite 不可用的情况', async () => {
      // 模拟 plus.sqlite 不可用
      const originalPlus = global.plus
      global.plus = undefined

      await expect(dbService.initDB()).rejects.toThrow('plus.sqlite 不可用，请确保在App环境中运行')
      
      // 恢复 plus
      global.plus = originalPlus
    })
  })

  describe('数据库升级测试', () => {
    beforeEach(() => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(true)
      global.plus.sqlite.openDatabase.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })
    })

    it('应该能够检查数据库版本', async () => {
      global.plus.sqlite.selectSql.mockImplementation(({ success }) => {
        success([{ value: '0.9.0' }])
        return Promise.resolve()
      })
      global.plus.sqlite.executeSql.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })

      await dbService.initDB()
      
      expect(global.plus.sqlite.selectSql).toHaveBeenCalled()
    })

    it('应该能够执行数据库升级', async () => {
      global.plus.sqlite.selectSql.mockImplementation(({ success }) => {
        success([{ value: '0.9.0' }])
        return Promise.resolve()
      })
      global.plus.sqlite.executeSql.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })

      await dbService.initDB()
      
      expect(global.plus.sqlite.executeSql).toHaveBeenCalled()
    })
  })

  describe('数据增删改查测试', () => {
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

    it('应该能够插入数据', async () => {
      await dbService.initDB()
      
      const result = await dbService.insert('users', { username: 'test', email: 'test@example.com' })
      
      expect(result).toBe(1)
      expect(global.plus.sqlite.executeSql).toHaveBeenCalled()
    })

    it('应该能够查询数据', async () => {
      await dbService.initDB()
      
      const result = await dbService.query('SELECT * FROM users WHERE id = ?', [1])
      
      expect(result).toEqual([{ id: 1, name: 'test' }])
      expect(global.plus.sqlite.selectSql).toHaveBeenCalled()
    })

    it('应该能够更新数据', async () => {
      await dbService.initDB()
      
      await dbService.update('users', { username: 'updated' }, 'id = ?', [1])
      
      expect(global.plus.sqlite.executeSql).toHaveBeenCalled()
    })

    it('应该能够删除数据', async () => {
      await dbService.initDB()
      
      await dbService.delete('users', 'id = ?', [1])
      
      expect(global.plus.sqlite.executeSql).toHaveBeenCalled()
    })

    it('应该能够查找单条记录', async () => {
      await dbService.initDB()
      
      const result = await dbService.findOne('users', 'id = ?', [1])
      
      expect(result).toEqual({ id: 1, name: 'test' })
    })

    it('应该能够查找多条记录', async () => {
      await dbService.initDB()
      
      const result = await dbService.findMany('users', 'status = ?', ['active'])
      
      expect(result).toEqual([{ id: 1, name: 'test' }])
    })

    it('应该能够统计记录数', async () => {
      global.plus.sqlite.selectSql.mockImplementation(({ success }) => {
        success([{ count: 5 }])
        return Promise.resolve()
      })
      
      await dbService.initDB()
      
      const count = await dbService.count('users')
      
      expect(count).toBe(5)
    })
  })

  describe('数据导入导出测试', () => {
    beforeEach(() => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(true)
      global.plus.sqlite.openDatabase.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })
      global.plus.sqlite.selectSql.mockImplementation(({ success }) => {
        if (success.toString().includes('sqlite_master')) {
          success([{ name: 'users' }, { name: 'projects' }])
        } else {
          success([{ id: 1, name: 'test' }])
        }
        return Promise.resolve()
      })
      global.plus.sqlite.executeSql.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })
    })

    it('应该能够导出所有数据', async () => {
      await dbService.initDB()
      
      const exportData = await dbService.exportAllData()
      
      expect(exportData).toHaveProperty('users')
      expect(exportData).toHaveProperty('projects')
      expect(exportData.users).toEqual([{ id: 1, name: 'test' }])
    })

    it('应该能够导入所有数据', async () => {
      await dbService.initDB()
      
      const importData = {
        users: [{ id: 1, name: 'test' }],
        projects: [{ id: 1, title: 'test project' }]
      }
      
      const result = await dbService.importAllData(importData)
      
      expect(result).toBe(true)
      expect(global.plus.sqlite.executeSql).toHaveBeenCalled()
    })
  })

  describe('事务处理测试', () => {
    beforeEach(() => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(true)
      global.plus.sqlite.openDatabase.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })
    })

    it('应该能够处理事务回滚', async () => {
      global.plus.sqlite.executeSql.mockImplementation(({ sql, success, fail }) => {
        if (sql.includes('INSERT INTO users')) {
          fail(new Error('插入失败'))
        } else if (sql.includes('ROLLBACK')) {
          success({})
        } else {
          success({})
        }
        return Promise.resolve()
      })

      await dbService.initDB()
      
      const importData = {
        users: [{ id: 1, name: 'test' }]
      }
      
      await expect(dbService.importAllData(importData)).rejects.toThrow('插入失败')
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

    it('应该能够处理查询错误', async () => {
      global.plus.sqlite.isOpenDatabase.mockReturnValue(true)
      global.plus.sqlite.openDatabase.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })
      global.plus.sqlite.selectSql.mockImplementation(({ fail }) => {
        fail(new Error('查询失败'))
        return Promise.reject()
      })

      await dbService.initDB()
      
      await expect(dbService.query('SELECT * FROM invalid_table')).rejects.toThrow('查询失败')
    })
  })

  describe('数据库关闭测试', () => {
    it('应该能够关闭数据库', () => {
      global.plus.sqlite.closeDatabase.mockImplementation(({ success }) => {
        success({})
        return Promise.resolve()
      })

      dbService.closeDB()
      
      expect(global.plus.sqlite.closeDatabase).toHaveBeenCalledWith({
        name: 'ai_project_manage.db',
        success: expect.any(Function),
        fail: expect.any(Function)
      })
    })
  })
})
