/**
 * 用户API - 处理用户相关的数据库操作
 */
import dbService from '@/utils/dbService.js'
import DateUtils from '@/utils/dateUtils.js'
import projectApi from './projectApi.js'
import knowledgeApi from './knowledgeApi.js'
import userStore from '../utils/userStore.js'

class UserApi {
	/**
	 * 确保数据库已初始化
	 */
	async ensureDBInit() {
		if (!dbService.isInitialized) {
			await dbService.initDB()
		}
	}

	/**
	 * 获取当前用户信息
	 * @param {number} userId - 用户ID，默认为1
	 * @returns {Promise<Object>} 用户信息
	 */
	async getCurrentUser(userId = 1) {
		try {
			await this.ensureDBInit()
			
			// 获取指定用户或第一个用户
			let user
			if (userId && userId !== 1) {
				user = await dbService.findOne('users', 'id = ?', [userId])
			}
			
			if (!user) {
				user = await dbService.findOne('users', '1=1', [])
			}
			
			if (user) {
				// 获取真实的统计数据
				const projectStats = await projectApi.getProjectStats(user.id)
				const knowledgeStats = await knowledgeApi.getKnowledgeStats(user.id)
				
				// 格式化用户数据并包含真实统计
				return this.formatUserData(user, projectStats, knowledgeStats)
			} else {
				// 如果没有用户，创建默认用户
				return await this.createDefaultUser()
			}
		} catch (error) {
			console.error('获取用户信息失败:', error)
			throw error
		}
	}

	/**
	 * 创建默认用户
	 * @returns {Promise<Object>} 用户信息
	 */
	async createDefaultUser() {
		try {
			const defaultUserData = {
				username: '用户',
				email: '',
				avatar: '👤', // 默认头像emoji
				settings: JSON.stringify({
					title: '产品经理',
					isVip: false,
					theme: 'light'
				})
			}
			
			const userId = await dbService.insert('users', defaultUserData)
			
			// 获取创建的用户信息
			const user = await dbService.findOne('users', 'id = ?', [userId])
			
			// 获取统计数据
			const projectStats = await projectApi.getProjectStats(userId)
			const knowledgeStats = await knowledgeApi.getKnowledgeStats(userId)
			
			return this.formatUserData(user, projectStats, knowledgeStats)
		} catch (error) {
			console.error('创建默认用户失败:', error)
			throw error
		}
	}

	/**
	 * 更新用户信息
	 * @param {Object} userData 用户数据
	 * @returns {Promise<Object>} 更新后的用户信息
	 */
	async updateUser(userData) {
		try {
			await this.ensureDBInit()
			
			const currentUser = await this.getCurrentUser()
			const userId = currentUser.id
			
			// 准备更新数据
			const updateData = {}
			
			if (userData.username !== undefined) {
				updateData.username = userData.username
			}
			
			if (userData.email !== undefined) {
				updateData.email = userData.email
			}
			
			if (userData.avatar !== undefined) {
				updateData.avatar = userData.avatar
			}
			
			if (userData.settings !== undefined) {
				updateData.settings = typeof userData.settings === 'string' ? userData.settings : JSON.stringify(userData.settings)
			}
			
			// 添加更新时间
			updateData.updated_at = DateUtils.getCurrentLocalISOString()
			
			await dbService.update('users', updateData, 'id = ?', [userId])
			
			// 返回更新后的用户信息
			return await this.getCurrentUser()
		} catch (error) {
			console.error('更新用户信息失败:', error)
			throw error
		}
	}

	/**
	 * 格式化用户数据
	 * @param {Object} rawData 原始数据
	 * @param {Object} projectStats 项目统计数据
	 * @param {Object} knowledgeStats 知识统计数据
	 * @returns {Object} 格式化后的用户数据
	 */
	formatUserData(rawData, projectStats = null, knowledgeStats = null) {
		try {
			const settings = rawData.settings ? JSON.parse(rawData.settings) : {}
			
			return {
			id: rawData.id,
			username: rawData.username || '用户',
			email: rawData.email || '',
			avatar: rawData.avatar || '👤',
			title: settings.title || '产品经理',
			isVip: settings.isVip || false,
			theme: settings.theme || 'light',
			projectCount: projectStats ? projectStats.totalProjects : 0,
			knowledgeCount: knowledgeStats ? knowledgeStats.totalCount : 0,
			days: this.calculateUsageDays(rawData.created_at),
			created_at: rawData.created_at,
			updated_at: rawData.updated_at,
			settings: settings
		}
		} catch (error) {
			console.error('格式化用户数据失败:', error)
			return {
			id: rawData.id,
			username: rawData.username || '用户',
			email: rawData.email || '',
			avatar: rawData.avatar || '👤',
			title: '产品经理',
			isVip: false,
			theme: 'light',
			projectCount: 0,
			knowledgeCount: 0,
			days: 0,
			created_at: rawData.created_at,
			updated_at: rawData.updated_at,
			settings: {}
		}
		}
	}

	/**
	 * 获取可用的头像选项
	 * @returns {Array} 头像选项列表
	 */
	getAvatarOptions() {
		return [
			// 人物emoji
			{ value: '👤', label: '默认用户', category: '人物' },
			{ value: '👨', label: '男性', category: '人物' },
			{ value: '👩', label: '女性', category: '人物' },
			{ value: '🧑', label: '成人', category: '人物' },
			{ value: '👨‍💼', label: '商务男性', category: '人物' },
			{ value: '👩‍💼', label: '商务女性', category: '人物' },
			{ value: '👨‍💻', label: '程序员', category: '人物' },
			{ value: '👩‍💻', label: '程序媛', category: '人物' },
			{ value: '🧑‍💻', label: '开发者', category: '人物' },
			
			// 动物emoji
			{ value: '🐱', label: '猫咪', category: '动物' },
			{ value: '🐶', label: '小狗', category: '动物' },
			{ value: '🐼', label: '熊猫', category: '动物' },
			{ value: '🦊', label: '狐狸', category: '动物' },
			{ value: '🐸', label: '青蛙', category: '动物' },
			{ value: '🐧', label: '企鹅', category: '动物' },
			
			// 其他emoji
			{ value: '⭐', label: '星星', category: '符号' },
			{ value: '🌟', label: '闪亮星星', category: '符号' },
			{ value: '💎', label: '钻石', category: '符号' },
			{ value: '🎯', label: '目标', category: '符号' },
			{ value: '🚀', label: '火箭', category: '符号' },
			{ value: '💡', label: '灯泡', category: '符号' }
		]
	}

	/**
	 * 获取所有用户列表
	 * @returns {Promise<Array>} 用户列表
	 */
	async getAllUsers() {
		try {
			await this.ensureDBInit()
			
			const users = await dbService.findMany('users', '1=1', [])
			
			// 为每个用户获取统计数据
			const usersWithStats = await Promise.all(
				users.map(async (user) => {
					const projectStats = await projectApi.getProjectStats(user.id)
					const knowledgeStats = await knowledgeApi.getKnowledgeStats(user.id)
					return this.formatUserData(user, projectStats, knowledgeStats)
				})
			)
			
			return usersWithStats
		} catch (error) {
			console.error('获取用户列表失败:', error)
			throw error
		}
	}

	/**
	 * 创建新用户
	 * @param {Object} userData 用户数据
	 * @returns {Promise<Object>} 创建的用户信息
	 */
	async createUser(userData) {
		try {
			await this.ensureDBInit()
			
			const newUserData = {
				username: userData.username || '新用户',
				email: userData.email || '',
				avatar: userData.avatar || '👤',
				settings: JSON.stringify({
					title: userData.title || '产品经理',
					isVip: userData.isVip || false,
					theme: userData.theme || 'light'
				})
			}
			
			const userId = await dbService.insert('users', newUserData)
			
			// 获取创建的用户信息
			const user = await dbService.findOne('users', 'id = ?', [userId])
			
			// 获取统计数据
			const projectStats = await projectApi.getProjectStats(userId)
			const knowledgeStats = await knowledgeApi.getKnowledgeStats(userId)
			
			return this.formatUserData(user, projectStats, knowledgeStats)
		} catch (error) {
			console.error('创建用户失败:', error)
			throw error
		}
	}

	/**
	 * 切换当前用户
	 * @param {number} userId 用户ID
	 * @returns {Promise<Object>} 切换后的用户信息
	 */
	async switchUser(userId) {
		try {
			await this.ensureDBInit()
			
			// 验证用户是否存在
			const user = await dbService.findOne('users', 'id = ?', [userId])
			if (!user) {
				throw new Error('用户不存在')
			}
			
			// 使用全局状态管理器切换用户
			userStore.setCurrentUserId(userId)
			
			// 返回用户信息
			const userInfo = await this.getCurrentUser(userId)
			userStore.setCurrentUser(userInfo)
			return userInfo
		} catch (error) {
			console.error('切换用户失败:', error)
			throw error
		}
	}

	/**
	 * 获取当前用户ID
	 * @returns {number} 当前用户ID
	 */
	getCurrentUserId() {
		return userStore.getCurrentUserId()
	}

	/**
	 * 计算用户使用天数
	 * @param {string} createdAt 创建时间
	 * @returns {number} 使用天数
	 */
	calculateUsageDays(createdAt) {
		if (!createdAt) return 0
		
		try {
			const createDate = new Date(createdAt)
			const currentDate = new Date()
			const diffTime = Math.abs(currentDate - createDate)
			const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
			return diffDays
		} catch (error) {
			console.error('计算使用天数失败:', error)
			return 0
		}
	}
}

// 导出单例
const userApi = new UserApi()
export default userApi