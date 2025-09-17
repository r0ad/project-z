/**
 * 全局用户状态管理器
 * 用于管理当前用户状态和提供统一的用户切换接口
 */
class UserStore {
	constructor() {
		this.currentUserId = 1 // 默认用户ID
		this.currentUser = null // 当前用户信息缓存
		this.listeners = [] // 状态变化监听器
	}

	/**
	 * 获取当前用户ID
	 */
	getCurrentUserId() {
		return this.currentUserId
	}

	/**
	 * 获取当前用户信息
	 */
	getCurrentUser() {
		return this.currentUser
	}

	/**
	 * 设置当前用户ID
	 * @param {number} userId - 用户ID
	 */
	setCurrentUserId(userId) {
		if (this.currentUserId !== userId) {
			const oldUserId = this.currentUserId
			this.currentUserId = userId
			this.currentUser = null // 清除用户信息缓存
			
			// 通知所有监听器
			this.notifyListeners({
				type: 'USER_CHANGED',
				oldUserId,
				newUserId: userId
			})
		}
	}

	/**
	 * 设置当前用户信息
	 * @param {object} userInfo - 用户信息
	 */
	setCurrentUser(userInfo) {
		this.currentUser = userInfo
		if (userInfo && userInfo.id) {
			this.currentUserId = userInfo.id
		}
		
		// 通知所有监听器
		this.notifyListeners({
			type: 'USER_INFO_UPDATED',
			userInfo
		})
	}

	/**
	 * 添加状态变化监听器
	 * @param {function} listener - 监听器函数
	 */
	addListener(listener) {
		if (typeof listener === 'function') {
			this.listeners.push(listener)
		}
	}

	/**
	 * 移除状态变化监听器
	 * @param {function} listener - 监听器函数
	 */
	removeListener(listener) {
		const index = this.listeners.indexOf(listener)
		if (index > -1) {
			this.listeners.splice(index, 1)
		}
	}

	/**
	 * 通知所有监听器
	 * @param {object} event - 事件对象
	 */
	notifyListeners(event) {
		this.listeners.forEach(listener => {
			try {
				listener(event)
			} catch (error) {
				console.error('用户状态监听器执行错误:', error)
			}
		})
	}

	/**
	 * 清除所有状态
	 */
	clear() {
		this.currentUserId = 1
		this.currentUser = null
		this.listeners = []
	}

	/**
	 * 从本地存储加载用户状态
	 */
	loadFromStorage() {
		try {
			const savedUserId = uni.getStorageSync('currentUserId')
			if (savedUserId) {
				this.currentUserId = parseInt(savedUserId)
			}
		} catch (error) {
			console.error('加载用户状态失败:', error)
		}
	}

	/**
	 * 保存用户状态到本地存储
	 */
	saveToStorage() {
		try {
			uni.setStorageSync('currentUserId', this.currentUserId)
		} catch (error) {
			console.error('保存用户状态失败:', error)
		}
	}
}

// 创建全局实例
const userStore = new UserStore()

// 应用启动时加载状态
userStore.loadFromStorage()

// 监听状态变化并保存到本地存储
userStore.addListener((event) => {
	if (event.type === 'USER_CHANGED') {
		userStore.saveToStorage()
	}
})

export default userStore