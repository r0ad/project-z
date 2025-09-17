/**
 * 应用启动测试 (P0 核心功能)
 * 测试应用初始化、分享码检查等核心功能
 */

// Mock uni API
global.uni = {
  showModal: jest.fn(),
  setClipboardData: jest.fn(),
  showToast: jest.fn()
}

// Mock 依赖
jest.mock('@/utils/promoManager.js')

import AppStartup from '@/utils/appStartup.js'
import promoManager from '@/utils/promoManager.js'

describe('应用启动测试 (P0)', () => {
  let appStartup

  beforeEach(() => {
    jest.clearAllMocks()
    appStartup = new AppStartup()
    
    // Mock promoManager
    promoManager.init = jest.fn().mockResolvedValue()
    promoManager.getStatus = jest.fn()
    promoManager.getContactInfo = jest.fn()
    promoManager.formatRemainingTime = jest.fn()
  })

  describe('应用初始化测试', () => {
    it('应该能够初始化应用启动检查', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: false
      })
      
      await appStartup.init()
      
      expect(promoManager.init).toHaveBeenCalled()
      expect(appStartup.initialized).toBe(true)
    })

    it('应该能够处理重复初始化', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: false
      })
      
      await appStartup.init()
      await appStartup.init() // 第二次初始化
      
      expect(promoManager.init).toHaveBeenCalledTimes(1) // 只应该调用一次
    })

    it('应该能够处理初始化失败', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      promoManager.init.mockRejectedValue(new Error('初始化失败'))
      
      await appStartup.init()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 应用启动检查失败:', expect.any(Error))
      expect(appStartup.initialized).toBe(false)
      
      consoleSpy.mockRestore()
    })
  })

  describe('数据库连接测试', () => {
    it('应该能够检查分享码有效性', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: false,
        remainingDays: 30
      })
      
      await appStartup.init()
      
      expect(promoManager.getStatus).toHaveBeenCalled()
    })

    it('应该能够处理无分享码的情况', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: false
      })
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      await appStartup.init()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 未发现分享码配置')
      
      consoleSpy.mockRestore()
    })

    it('应该能够处理分享码检查失败', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      promoManager.getStatus.mockRejectedValue(new Error('检查失败'))
      
      await appStartup.init()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 分享码有效性检查失败:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('用户状态检查测试', () => {
    it('应该能够显示过期通知', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: true,
        remainingDays: 0
      })
      promoManager.getContactInfo.mockReturnValue({
        wechat: 'test_wechat'
      })
      
      global.uni.showModal.mockImplementation(({ success }) => {
        success({ confirm: true })
      })
      global.uni.setClipboardData.mockImplementation(({ success }) => {
        success()
      })
      
      await appStartup.init()
      
      expect(global.uni.showModal).toHaveBeenCalledWith({
        title: '分享码已过期',
        content: expect.stringContaining('您的OpenAI分享码已过期'),
        confirmText: '复制微信号',
        cancelText: '稍后处理',
        success: expect.any(Function)
      })
    })

    it('应该能够显示即将过期通知', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: false,
        remainingDays: 1
      })
      promoManager.getContactInfo.mockReturnValue({
        wechat: 'test_wechat'
      })
      promoManager.formatRemainingTime.mockReturnValue('1天')
      
      global.uni.showModal.mockImplementation(({ success }) => {
        success({ confirm: false })
      })
      
      await appStartup.init()
      
      expect(global.uni.showModal).toHaveBeenCalledWith({
        title: '分享码即将过期',
        content: expect.stringContaining('您的OpenAI分享码将在1天后过期'),
        confirmText: '复制微信号',
        cancelText: '知道了',
        success: expect.any(Function)
      })
    })

    it('应该能够处理用户确认复制微信号', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: true,
        remainingDays: 0
      })
      promoManager.getContactInfo.mockReturnValue({
        wechat: 'test_wechat'
      })
      
      global.uni.showModal.mockImplementation(({ success }) => {
        success({ confirm: true })
      })
      global.uni.setClipboardData.mockImplementation(({ success }) => {
        success()
      })
      global.uni.showToast.mockImplementation(() => {})
      
      await appStartup.init()
      
      expect(global.uni.setClipboardData).toHaveBeenCalledWith({
        data: 'test_wechat',
        success: expect.any(Function)
      })
    })

    it('应该能够处理用户取消操作', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: true,
        remainingDays: 0
      })
      promoManager.getContactInfo.mockReturnValue({
        wechat: 'test_wechat'
      })
      
      global.uni.showModal.mockImplementation(({ success }) => {
        success({ confirm: false })
      })
      
      await appStartup.init()
      
      expect(global.uni.setClipboardData).not.toHaveBeenCalled()
    })
  })

  describe('定期检查测试', () => {
    beforeEach(() => {
      jest.useFakeTimers()
    })

    afterEach(() => {
      jest.useRealTimers()
      jest.clearAllTimers()
      // 清理可能存在的定时器
      if (appStartup.checkInterval) {
        clearInterval(appStartup.checkInterval)
        appStartup.checkInterval = null
      }
    })

    it('应该能够设置定期检查', () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: false
      })
      
      appStartup.setupPeriodicCheck()
      
      expect(appStartup.checkInterval).toBeDefined()
    })

    it('应该能够清除之前的定时器', () => {
      const mockInterval = setInterval(() => {}, 1000)
      appStartup.checkInterval = mockInterval
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      
      appStartup.setupPeriodicCheck()
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(mockInterval)
      
      clearIntervalSpy.mockRestore()
    })

    it('应该能够执行定期检查', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: false
      })
      
      appStartup.setupPeriodicCheck()
      
      // 快进1小时
      jest.advanceTimersByTime(3600000)
      
      expect(promoManager.getStatus).toHaveBeenCalled()
    })
  })

  describe('手动检查测试', () => {
    it('应该能够手动触发检查', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: false
      })
      
      await appStartup.manualCheck()
      
      expect(promoManager.getStatus).toHaveBeenCalled()
    })

    it('应该能够处理手动检查失败', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      promoManager.getStatus.mockRejectedValue(new Error('检查失败'))
      
      await appStartup.manualCheck()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 分享码有效性检查失败:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('销毁测试', () => {
    it('应该能够销毁检查器', () => {
      const mockInterval = setInterval(() => {}, 1000)
      appStartup.checkInterval = mockInterval
      appStartup.initialized = true
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      appStartup.destroy()
      
      expect(clearIntervalSpy).toHaveBeenCalledWith(mockInterval)
      expect(appStartup.checkInterval).toBeNull()
      expect(appStartup.initialized).toBe(false)
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 应用启动检查器已销毁')
      
      clearIntervalSpy.mockRestore()
      consoleSpy.mockRestore()
    })

    it('应该能够处理无定时器的情况', () => {
      appStartup.checkInterval = null
      appStartup.initialized = true
      
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')
      
      appStartup.destroy()
      
      expect(clearIntervalSpy).not.toHaveBeenCalled()
      expect(appStartup.initialized).toBe(false)
      
      clearIntervalSpy.mockRestore()
    })
  })

  describe('状态获取测试', () => {
    it('应该能够获取检查状态', () => {
      appStartup.initialized = true
      appStartup.checkInterval = setInterval(() => {}, 1000)
      
      const status = appStartup.getStatus()
      
      expect(status).toEqual({
        initialized: true,
        hasPeriodicCheck: true
      })
    })

    it('应该能够获取未初始化状态', () => {
      appStartup.initialized = false
      appStartup.checkInterval = null
      
      const status = appStartup.getStatus()
      
      expect(status).toEqual({
        initialized: false,
        hasPeriodicCheck: false
      })
    })
  })

  describe('错误处理测试', () => {
    it('应该能够处理显示通知失败', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: true,
        remainingDays: 0
      })
      promoManager.getContactInfo.mockImplementation(() => {
        throw new Error('获取联系信息失败')
      })
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await appStartup.init()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 显示过期通知失败:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('应该能够处理复制到剪贴板失败', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: true,
        remainingDays: 0
      })
      promoManager.getContactInfo.mockReturnValue({
        wechat: 'test_wechat'
      })
      
      global.uni.showModal.mockImplementation(({ success }) => {
        success({ confirm: true })
      })
      global.uni.setClipboardData.mockImplementation(({ fail }) => {
        fail(new Error('复制失败'))
      })
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await appStartup.init()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 显示过期通知失败:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })
  })

  describe('边界条件测试', () => {
    it('应该能够处理分享码状态为null', async () => {
      promoManager.getStatus.mockResolvedValue(null)
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()
      
      await appStartup.init()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 分享码有效性检查失败:', expect.any(Error))
      
      consoleSpy.mockRestore()
    })

    it('应该能够处理剩余天数为负数', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: false,
        remainingDays: -1
      })
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      await appStartup.init()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 分享码状态正常')
      
      consoleSpy.mockRestore()
    })

    it('应该能够处理剩余天数为0', async () => {
      promoManager.getStatus.mockResolvedValue({
        hasPromoCode: true,
        provider: 'OpenAI',
        expired: false,
        remainingDays: 0
      })
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      await appStartup.init()
      
      expect(consoleSpy).toHaveBeenCalledWith('[AppStartup] 分享码状态正常')
      
      consoleSpy.mockRestore()
    })
  })
})
