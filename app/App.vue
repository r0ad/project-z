<script>
import dbService from '@/utils/dbService.js'

export default {
	async onLaunch() {
		console.log('App Launch')
		
		// 初始化数据库
		try {
			await this.initDatabase()
			console.log('数据库初始化成功')
		} catch (error) {
			console.error('数据库初始化失败:', error)
			// 只在严重错误时显示提示
			if (error.code !== -1402) { // -1402 表示数据库已经打开
				uni.showToast({
					title: '数据库初始化失败',
					icon: 'error',
					duration: 3000
				})
			}
		}
	},
	
	onShow: function() {
		console.log('App Show')
	},
	
	onHide: function() {
		console.log('App Hide')
	},
	
	methods: {
		async initDatabase() {
			try {
				// 初始化数据库连接（包含表创建和索引创建）
				await dbService.initDB()
				
				// 创建索引（如果还没有创建）
				await dbService.createIndexes()
				
				// 初始化默认用户（如果还没有用户）
				await dbService.initDefaultUser()
				
				console.log('数据库初始化完成')
				
			} catch (error) {
				console.error('数据库初始化过程中出错:', error)
				// 对于已经打开的数据库错误，不抛出异常
				if (error.code === -1402) {
					console.log('数据库已经打开，继续运行')
					return
				}
				throw error
			}
		}
	}
}
</script>

<style lang="scss">
@import "nutui-uniapp/styles/index.scss";

/* 全局样式 */
page {
	background-color: #F2F3F5;
}

/* 通用样式类 */
.primary-color {
	color: #165DFF;
}

.success-color {
	color: #00B42A;
}

.warning-color {
	color: #FF7D00;
}

.danger-color {
	color: #F53F3F;
}

.gray-color {
	color: #86909C;
}

.card {
	background-color: #ffffff;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	margin-bottom: 24rpx;
	padding: 32rpx;
}

.btn-primary {
	background-color: #165DFF;
	color: #ffffff;
	border-radius: 16rpx;
	padding: 24rpx 32rpx;
	font-size: 28rpx;
	border: none;
}

.btn-secondary {
	background-color: #ffffff;
	color: #86909C;
	border: 2rpx solid #E5E6EB;
	border-radius: 16rpx;
	padding: 24rpx 32rpx;
	font-size: 28rpx;
}

</style>
