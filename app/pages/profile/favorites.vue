<template>
	<view class="favorites-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar title="我的收藏" />

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 空状态 -->
			<view v-if="favoritesList.length === 0" class="empty-state">
				<nut-icon name="star" size="80" color="#C9CDD4"></nut-icon>
				<text class="empty-text">暂无收藏内容</text>
				<text class="empty-desc">收藏的项目和知识会显示在这里</text>
			</view>

			<!-- 收藏列表 -->
			<view v-else class="favorites-list">
				<view 
					v-for="(item, index) in favoritesList" 
					:key="index" 
					class="favorite-item"
					@click="goToDetail(item)"
				>
					<!-- <view class="item-icon" :style="{ backgroundColor: item.iconBg }">
						<nut-icon :name="item.icon" size="16" :color="item.iconColor"></nut-icon>
					</view> -->
					<view class="item-content">
						<text class="item-title">{{ item.title }}</text>
						<text class="item-desc">{{ item.description }}</text>
						<text class="item-time">收藏于 {{ item.favoriteTime }}</text>
					</view>
					<view class="item-actions">
						<nut-tag :type="getTypeColor(item.type)" size="small">{{ item.typeName }}</nut-tag>
						<nut-icon 
							name="del" 
							size="16" 
							color="#FF4D4F"
							class="delete-icon"
							@click.stop="removeFavorite(item, index)"
						></nut-icon>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import CustomNavbar from '@/components/CustomNavbar.vue'
import favoriteApi from '@/api/favoriteApi.js'

export default {
	components: {
		CustomNavbar
	},
	data() {
		return {
			favoritesList: [],
			loading: false
		}
	},
	mounted() {
		this.loadFavorites()
	},
	methods: {
		/**
		 * 加载收藏列表
		 */
		async loadFavorites() {
			this.loading = true
			try {
				this.favoritesList = await favoriteApi.getFavoritesList()
			} catch (error) {
				console.error('加载收藏列表失败:', error)
				uni.showToast({
					title: '加载失败，请重试',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		
		getTypeColor(type) {
			const colorMap = {
				project: 'primary',
				knowledge: 'success'
			}
			return colorMap[type] || 'default'
		},
		
		goToDetail(item) {
			if (item.type === 'project') {
				uni.navigateTo({
					url: `/pages/project/detail?id=${item.id}`
				})
			} else if (item.type === 'knowledge') {
				uni.navigateTo({
					url: `/pages/knowledge/detail?id=${item.id}`
				})
			}
		},
		
		async removeFavorite(item, index) {
			try {
				const result = await uni.showModal({
					title: '确认取消收藏',
					content: `确定要取消收藏"${item.title}"吗？`,
					confirmText: '取消收藏',
					cancelText: '保留'
				})
				
				if (result.confirm) {
					// 调用API取消收藏
					const success = await favoriteApi.removeFavorite(item.type, item.id)
					if (success) {
						this.favoritesList.splice(index, 1)
						uni.showToast({
							title: '已取消收藏',
							icon: 'success'
						})
					} else {
						uni.showToast({
							title: '取消收藏失败',
							icon: 'none'
						})
					}
				}
			} catch (error) {
				console.error('取消收藏失败:', error)
				uni.showToast({
					title: '操作失败，请重试',
					icon: 'none'
				})
			}
		}
	}
}
</script>

<style scoped>
.favorites-page {
	min-height: 100vh;
	background-color: #F2F3F5;
}

.page-content {
	padding: calc(var(--status-bar-height) + 146rpx) 32rpx 32rpx;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 32rpx;
	text-align: center;
}

.empty-text {
	margin-top: 80rpx;
	font-size: 32rpx;
	color: #86909C;
	display: block;
}

.empty-desc {
	margin-top: 80rpx;
	font-size: 28rpx;
	color: #C9CDD4;
	display: block;
}

.favorites-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.favorite-item {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	gap: 24rpx;
	transition: all 0.3s ease;
}

.favorite-item:active {
	transform: scale(0.98);
	box-shadow: 0 2rpx 8rpx 0 rgba(0, 0, 0, 0.12);
}

.item-icon {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.item-content {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.item-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	display: block;
}

.item-desc {
	font-size: 28rpx;
	color: #86909C;
	line-height: 1.4;
	display: block;
}

.item-time {
	font-size: 24rpx;
	color: #C9CDD4;
	display: block;
}

.item-actions {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 16rpx;
}

.delete-icon {
	padding: 8rpx;
	border-radius: 8rpx;
	transition: background-color 0.3s ease;
}

.delete-icon:active {
	background-color: rgba(255, 77, 79, 0.1);
}
</style>