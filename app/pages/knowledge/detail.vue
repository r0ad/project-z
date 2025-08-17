<template>
	<view class="knowledge-detail-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar title="知识详情" :show-back="true" @back="goBack">
			<template #right>
				<view class="nav-actions">
					<nut-icon name="edit" size="20" color="#165DFF" @click="editKnowledge" style="margin-right: 20rpx;"></nut-icon>
					<nut-icon name="share" size="20" color="#86909C" @click="shareKnowledge"></nut-icon>
				</view>
			</template>
		</CustomNavbar>
		
		<!-- 导航栏占位 -->
		<view class="navbar-placeholder"></view>

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 知识头部信息 -->
			<view class="knowledge-header">
				<text class="knowledge-title">{{ knowledgeData.title }}</text>
				
				<view class="knowledge-meta">
					<view class="meta-row">
						<view class="meta-item">
							<nut-icon name="time" size="14" color="#86909C"></nut-icon>
							<text class="meta-text">{{ knowledgeData.updateTime }}</text>
						</view>
						<view class="meta-item">
							<nut-icon name="eye" size="14" color="#86909C"></nut-icon>
							<text class="meta-text">{{ knowledgeData.viewCount }}</text>
						</view>
					</view>
					
					<view class="knowledge-tags">
						<text 
							v-for="(tag, index) in knowledgeData.tags" 
							:key="index"
							class="knowledge-tag"
						>
							{{ tag }}
						</text>
					</view>
				</view>
			</view>

			<!-- 知识内容 -->
			<view class="knowledge-content">
				<view class="content-section">
					<view class="section-title">
						<nut-icon name="file-text" color="#165DFF" size="16"></nut-icon>
						<text class="title-text">内容概要</text>
					</view>
					<text class="content-text">{{ knowledgeData.summary }}</text>
				</view>

				<view class="content-section">
					<view class="section-title">
						<nut-icon name="list" color="#165DFF" size="16"></nut-icon>
						<text class="title-text">详细内容</text>
					</view>
					<view class="detailed-content">
						<text class="content-text">{{ knowledgeData.content }}</text>
					</view>
				</view>



				<!-- 相关知识 -->
				<view class="content-section">
					<view class="section-title">
						<nut-icon name="link" color="#165DFF" size="16"></nut-icon>
						<text class="title-text">相关知识</text>
					</view>
					<view class="related-knowledge">
						<view 
							v-for="(item, index) in relatedKnowledge" 
							:key="index"
							class="related-item"
							@click="viewRelated(item)"
						>
							<text class="related-title">{{ item.title }}</text>
							<nut-icon name="right" size="14" color="#C9CDD4"></nut-icon>
						</view>
					</view>
				</view>
			</view>

			<!-- 底部操作区 -->
			<view class="bottom-actions">
				<nut-button :type="isFavorite ? 'primary' : 'default'" size="large" @click="collectKnowledge">
					<nut-icon :name="isFavorite ? 'heart-fill' : 'heart'" size="14" :color="isFavorite ? '#FF6B6B' : ''"></nut-icon>
					{{ isFavorite ? '已收藏' : '收藏' }}
				</nut-button>
				<nut-button type="primary" size="large" @click="chatKnowledge">
					<nut-icon name="comment" size="14"></nut-icon>
					聊知识
				</nut-button>
			</view>
		</view>
	</view>
</template>

<script>
import CustomNavbar from '@/components/CustomNavbar.vue'
import knowledgeApi from '@/api/knowledgeApi.js'

export default {
	components: {
		CustomNavbar
	},
	data() {
		return {
			knowledgeId: '',
			knowledgeData: {
				title: '',
				summary: '',
				content: '',
				tags: [],
				updateTime: '',
				viewCount: 0
			},
			relatedKnowledge: [],
			isFavorite: false
		}
	},
	onLoad(options) {
		if (options.id) {
			this.knowledgeId = options.id
			// 根据ID加载知识详情
			this.loadKnowledgeDetail()
		}
		if (options.title) {
			this.knowledgeData.title = decodeURIComponent(options.title)
		}
	},
	onShow() {
		// 页面显示时刷新数据（从编辑界面返回时）
		if (this.knowledgeId) {
			console.log('页面显示，刷新知识详情数据')
			this.loadKnowledgeDetail()
		}
	},
	methods: {
		goBack() {
			uni.navigateBack()
		},
		async loadKnowledgeDetail() {
		try {
			const knowledge = await knowledgeApi.getKnowledgeDetail(this.knowledgeId)
			if (knowledge) {
				this.knowledgeData = {
					title: knowledge.title || '',
					summary: knowledge.summary || '',
					content: knowledge.content || '',
					tags: knowledge.tags || [],
					updateTime: knowledge.updated_at || '',
					viewCount: knowledge.view_count || 0
				}
				
				// 检查收藏状态
				const favoriteKnowledge = await knowledgeApi.getFavoriteKnowledge()
				this.isFavorite = favoriteKnowledge.some(item => item.id == this.knowledgeId)
				
				// 增加浏览量
				await knowledgeApi.incrementViewCount(this.knowledgeId)
				
				// 获取相关知识
				console.log('开始获取相关知识，当前知识ID:', this.knowledgeId)
				this.relatedKnowledge = await knowledgeApi.getRelatedKnowledge(this.knowledgeId)
				console.log('获取到的相关知识:', this.relatedKnowledge)
			}
		} catch (error) {
			console.error('加载知识详情失败:', error)
			uni.showToast({
				title: '加载失败',
				icon: 'error'
			})
		}
	},

		shareKnowledge() {
			uni.showToast({
				title: '分享知识',
				icon: 'none'
			})
		},
		async collectKnowledge() {
		try {
			const result = await knowledgeApi.toggleFavorite(this.knowledgeId)
			this.isFavorite = !this.isFavorite
			uni.showToast({
				title: this.isFavorite ? '收藏成功' : '取消收藏',
				icon: 'success'
			})
		} catch (error) {
			console.error('收藏操作失败:', error)
			uni.showToast({
				title: '操作失败',
				icon: 'error'
			})
		}
	},
		chatKnowledge() {
			uni.showToast({
				title: '聊知识',
				icon: 'none'
			})
		},
		viewRelated(item) {
			uni.navigateTo({
				url: `/pages/knowledge/detail?id=${item.id}&title=${encodeURIComponent(item.title)}`
			})
		},
		editKnowledge() {
			console.log('跳转到编辑知识界面，知识ID:', this.knowledgeId)
			uni.navigateTo({
				url: `/pages/knowledge/create?id=${this.knowledgeId}&mode=edit`
			})
		}
	}
}
</script>

<style scoped>
.knowledge-detail-page {
	min-height: 100vh;
	background-color: #F2F3F5;
}

.navbar-placeholder {
	height: calc(var(--status-bar-height) + 136rpx);
}

.nav-actions {
	display: flex;
	align-items: center;
}

.page-content {
	padding: 32rpx;
	padding-bottom: 160rpx;
}

.knowledge-header {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	margin-bottom: 24rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.knowledge-title {
	font-size: 40rpx;
	font-weight: bold;
	color: #1D2129;
	line-height: 1.4;
	margin-bottom: 24rpx;
	display: block;
}

.knowledge-meta {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.meta-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 16rpx;
}

.meta-item {
	display: flex;
	align-items: center;
	gap: 8rpx;
}

.meta-text {
	font-size: 24rpx;
	color: #86909C;
}



.knowledge-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 12rpx;
}

.knowledge-tag {
	padding: 8rpx 16rpx;
	background-color: #F2F3F5;
	border-radius: 8rpx;
	font-size: 24rpx;
	color: #86909C;
}

.knowledge-content {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.content-section {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.section-title {
	display: flex;
	align-items: center;
	gap: 12rpx;
	margin-bottom: 24rpx;
}

.title-text {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.content-text {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.6;
	display: block;
	white-space: pre-line;
}

.detailed-content {
	max-height: 600rpx;
	overflow-y: auto;
}



.related-knowledge {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.related-item {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 16rpx;
	background-color: #F2F3F5;
	border-radius: 12rpx;
	transition: all 0.3s ease;
}

.related-item:active {
	background-color: #E5E6EB;
}

.related-title {
	font-size: 28rpx;
	color: #4E5969;
	flex: 1;
}

.bottom-actions {
	position: fixed;
	bottom: 32rpx;
	left: 32rpx;
	right: 32rpx;
	z-index: 100;
	display: flex;
	gap: 16rpx;
}

.bottom-actions .nut-button {
	flex: 1;
}
</style>