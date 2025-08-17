/**
 * 用户API - 处理用户相关的数据库操作
 */
import dbService from '@/utils/dbService.js'

class UserApi {
	/**
	 * 初始化用户API
	 */
	constructor() {
		this.tableName = 'users'
	}

	/**
	 * 获取当前用户信息
	 * @returns {Promise<Object>} 用户信息
	 */
	async getCurrentUser() {
		try {
			await dbService.init()
			
			// 获取第一个用户（默认用户）
			const sql = `SELECT * FROM ${this.tableName} ORDER BY id ASC LIMIT 1`
			const result = await dbService.selectSQL(sql)
			
			if (result.length > 0) {
				return this.formatUserData(result[0])
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
			const defaultUser = {
				username: '用户',
				email: '',
				avatar: '👤', // 默认头像emoji
				settings: JSON.stringify({
					title: '产品经理',
					isVip: false,
					theme: 'light'
				})
			}
			
			const sql = `
				INSERT INTO ${this.tableName} (username, email, avatar, settings)
				VALUES (?, ?, ?, ?)
			`
			
			const result = await dbService.executeSql(sql, [
				defaultUser.username,
				defaultUser.email,
				defaultUser.avatar,
				defaultUser.settings
			])
			
			// 返回创建的用户信息
			return {
				id: result.insertId,
				...defaultUser,
				settings: JSON.parse(defaultUser.settings),
				created_at: new Date().toISOString(),
				updated_at: new Date().toISOString()
			}
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
			await dbService.init()
			
			const currentUser = await this.getCurrentUser()
			const userId = currentUser.id
			
			// 准备更新数据
			const updateFields = []
			const updateValues = []
			
			if (userData.username !== undefined) {
				updateFields.push('username = ?')
				updateValues.push(userData.username)
			}
			
			if (userData.email !== undefined) {
				updateFields.push('email = ?')
				updateValues.push(userData.email)
			}
			
			if (userData.avatar !== undefined) {
				updateFields.push('avatar = ?')
				updateValues.push(userData.avatar)
			}
			
			if (userData.settings !== undefined) {
				updateFields.push('settings = ?')
				updateValues.push(typeof userData.settings === 'string' ? userData.settings : JSON.stringify(userData.settings))
			}
			
			// 添加更新时间
			updateFields.push('updated_at = ?')
			updateValues.push(new Date().toISOString())
			
			// 添加用户ID到参数末尾
			updateValues.push(userId)
			
			const sql = `
				UPDATE ${this.tableName} 
				SET ${updateFields.join(', ')}
				WHERE id = ?
			`
			
			await dbService.executeSql(sql, updateValues)
			
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
	 * @returns {Object} 格式化后的用户数据
	 */
	formatUserData(rawData) {
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