/**
 * 用户存储测试 (P0 核心功能)
 * 测试用户状态管理、数据持久化等核心功能
 */

// Mock uni API
global.uni = {
  getStorageSync: jest.fn(),
  setStorageSync: jest.fn()
}

import userStore from '@/utils/userStore.js'

describe('用户存储测试 (P0)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // 重置用户存储状态
    userStore.currentUserId = 1
    userStore.currentUser = null
    userStore.listeners = []
  })

  describe('用户数据存储测试', () => {
    it('应该能够获取当前用户ID', () => {
      userStore.currentUserId = 5
      
      const userId = userStore.getCurrentUserId()
      
      expect(userId).toBe(5)
    })

    it('应该能够获取当前用户信息', () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@example.com'
      }
      userStore.currentUser = mockUser
      
      const user = userStore.getCurrentUser()
      
      expect(user).toEqual(mockUser)
    })

    it('应该能够设置当前用户ID', () => {
      const mockListener = jest.fn()
      userStore.addListener(mockListener)
      
      userStore.setCurrentUserId(5)
      
      expect(userStore.currentUserId).toBe(5)
      expect(userStore.currentUser).toBeNull() // 应该清除用户信息缓存
      expect(mockListener).toHaveBeenCalledWith({
        type: 'USER_CHANGED',
        oldUserId: 1,
        newUserId: 5
      })
    })

    it('应该能够设置当前用户信息', () => {
      const mockUser = {
        id: 2,
        username: 'newuser',
        email: 'new@example.com'
      }
      const mockListener = jest.fn()
      userStore.addListener(mockListener)
      
      userStore.setCurrentUser(mockUser)
      
      expect(userStore.currentUser).toEqual(mockUser)
      expect(userStore.currentUserId).toBe(2) // 应该自动设置用户ID
      expect(mockListener).toHaveBeenCalledWith({
        type: 'USER_INFO_UPDATED',
        userInfo: mockUser
      })
    })

    it('应该能够处理相同的用户ID设置', () => {
      const mockListener = jest.fn()
      userStore.addListener(mockListener)
      
      userStore.setCurrentUserId(1) // 与当前ID相同
      
      expect(userStore.currentUserId).toBe(1)
      expect(mockListener).not.toHaveBeenCalled() // 不应该触发监听器
    })
  })

  describe('用户设置管理测试', () => {
    it('应该能够添加监听器', () => {
      const mockListener = jest.fn()
      
      userStore.addListener(mockListener)
      
      expect(userStore.listeners).toContain(mockListener)
    })

    it('应该能够移除监听器', () => {
      const mockListener1 = jest.fn()
      const mockListener2 = jest.fn()
      
      userStore.addListener(mockListener1)
      userStore.addListener(mockListener2)
      expect(userStore.listeners).toHaveLength(2)
      
      userStore.removeListener(mockListener1)
      
      expect(userStore.listeners).toHaveLength(1)
      expect(userStore.listeners).toContain(mockListener2)
      expect(userStore.listeners).not.toContain(mockListener1)
    })

    it('应该能够处理无效的监听器', () => {
      const originalLength = userStore.listeners.length
      
      userStore.addListener(null)
      userStore.addListener(undefined)
      userStore.addListener('not a function')
      
      expect(userStore.listeners).toHaveLength(originalLength)
    })

    it('应该能够通知所有监听器', () => {
      const mockListener1 = jest.fn()
      const mockListener2 = jest.fn()
      
      userStore.addListener(mockListener1)
      userStore.addListener(mockListener2)
      
      const testEvent = { type: 'TEST_EVENT', data: 'test' }
      userStore.notifyListeners(testEvent)
      
      expect(mockListener1).toHaveBeenCalledWith(testEvent)
      expect(mockListener2).toHaveBeenCalledWith(testEvent)
    })

    it('应该能够处理监听器执行错误', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      const errorListener = jest.fn().mockImplementation(() => {
        throw new Error('监听器错误')
      })
      const normalListener = jest.fn()
      
      userStore.addListener(errorListener)
      userStore.addListener(normalListener)
      
      userStore.notifyListeners({ type: 'TEST_EVENT' })
      
      expect(consoleSpy).toHaveBeenCalledWith('用户状态监听器执行错误:', expect.any(Error))
      expect(normalListener).toHaveBeenCalled() // 正常监听器仍应执行
      
      consoleSpy.mockRestore()
    })
  })

  describe('数据持久化测试', () => {
    it('应该能够从本地存储加载用户状态', () => {
      global.uni.getStorageSync.mockReturnValue('5')
      
      userStore.loadFromStorage()
      
      expect(global.uni.getStorageSync).toHaveBeenCalledWith('currentUserId')
      expect(userStore.currentUserId).toBe(5)
    })

    it('应该能够保存用户状态到本地存储', () => {
      userStore.currentUserId = 3
      
      userStore.saveToStorage()
      
      expect(global.uni.setStorageSync).toHaveBeenCalledWith('currentUserId', 3)
    })

    it('应该能够处理存储加载失败', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      global.uni.getStorageSync.mockImplementation(() => {
        throw new Error('存储读取失败')
      })
      
      userStore.loadFromStorage()
      
      expect(consoleSpy).toHaveBeenCalledWith('加载用户状态失败:', expect.any(Error))
      expect(userStore.currentUserId).toBe(1) // 应该保持默认值
      
      consoleSpy.mockRestore()
    })

    it('应该能够处理存储保存失败', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      global.uni.setStorageSync.mockImplementation(() => {
        throw new Error('存储写入失败')
      })
      
      userStore.saveToStorage()
      
      expect(consoleSpy).toHaveBeenCalledWith('保存用户状态失败:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('应该能够处理无效的存储数据', () => {
      global.uni.getStorageSync.mockReturnValue('invalid')
      
      userStore.loadFromStorage()
      
      expect(userStore.currentUserId).toBe(1) // 应该保持默认值
    })

    it('应该能够处理空存储数据', () => {
      global.uni.getStorageSync.mockReturnValue('')
      
      userStore.loadFromStorage()
      
      expect(userStore.currentUserId).toBe(1) // 应该保持默认值
    })
  })

  describe('状态清除测试', () => {
    it('应该能够清除所有状态', () => {
      userStore.currentUserId = 5
      userStore.currentUser = { id: 5, username: 'test' }
      userStore.addListener(jest.fn())
      
      userStore.clear()
      
      expect(userStore.currentUserId).toBe(1)
      expect(userStore.currentUser).toBeNull()
      expect(userStore.listeners).toHaveLength(0)
    })
  })

  describe('监听器自动保存测试', () => {
    it('应该在用户变化时自动保存到存储', () => {
      global.uni.setStorageSync.mockClear()
      
      // 模拟用户变化事件
      const event = {
        type: 'USER_CHANGED',
        oldUserId: 1,
        newUserId: 2
      }
      
      userStore.notifyListeners(event)
      
      expect(global.uni.setStorageSync).toHaveBeenCalledWith('currentUserId', 2)
    })

    it('应该在其他事件时不自动保存', () => {
      global.uni.setStorageSync.mockClear()
      
      // 模拟其他事件
      const event = {
        type: 'USER_INFO_UPDATED',
        userInfo: { id: 1, username: 'test' }
      }
      
      userStore.notifyListeners(event)
      
      expect(global.uni.setStorageSync).not.toHaveBeenCalled()
    })
  })

  describe('边界条件测试', () => {
    it('应该能够处理用户ID为0的情况', () => {
      const mockListener = jest.fn()
      userStore.addListener(mockListener)
      
      userStore.setCurrentUserId(0)
      
      expect(userStore.currentUserId).toBe(0)
      expect(mockListener).toHaveBeenCalledWith({
        type: 'USER_CHANGED',
        oldUserId: 1,
        newUserId: 0
      })
    })

    it('应该能够处理负数用户ID', () => {
      userStore.setCurrentUserId(-1)
      
      expect(userStore.currentUserId).toBe(-1)
    })

    it('应该能够处理用户信息为空对象', () => {
      const mockListener = jest.fn()
      userStore.addListener(mockListener)
      
      userStore.setCurrentUser({})
      
      expect(userStore.currentUser).toEqual({})
      expect(userStore.currentUserId).toBe(1) // 应该保持原值
      expect(mockListener).toHaveBeenCalled()
    })

    it('应该能够处理用户信息为null', () => {
      userStore.setCurrentUser(null)
      
      expect(userStore.currentUser).toBeNull()
      expect(userStore.currentUserId).toBe(1) // 应该保持原值
    })
  })

  describe('性能测试', () => {
    it('应该能够处理大量监听器', () => {
      const listeners = Array.from({ length: 1000 }, () => jest.fn())
      
      listeners.forEach(listener => userStore.addListener(listener))
      
      expect(userStore.listeners).toHaveLength(1000)
      
      const startTime = Date.now()
      userStore.notifyListeners({ type: 'PERFORMANCE_TEST' })
      const endTime = Date.now()
      
      expect(endTime - startTime).toBeLessThan(100) // 应该在100ms内完成
      listeners.forEach(listener => {
        expect(listener).toHaveBeenCalled()
      })
    })
  })
})
