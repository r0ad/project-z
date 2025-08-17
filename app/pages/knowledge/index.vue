<template>
	<view class="knowledge-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar title="知识库" :show-back="false">
			<template #right>
				<nut-icon name="search" size="20" color="#86909C" @click="showSearch"></nut-icon>
			</template>
		</CustomNavbar>
		
		<!-- 导航栏占位 -->
		<view class="navbar-placeholder"></view>

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 搜索框 -->
			<view v-if="searchVisible" class="search-section">
				<nut-searchbar 
					v-model="searchKeyword" 
					placeholder="搜索知识内容"
					@search="handleSearch"
					@clear="clearSearch"
					shape="round"
				></nut-searchbar>
			</view>



			<!-- 知识列表 -->
			<view class="knowledge-list">
				<view 
					v-for="(item, index) in filteredKnowledge" 
					:key="index"
					class="knowledge-card"
					@click="viewDetail(item)"
				>
					<view class="card-header">
						<view class="title-section">
							<text class="knowledge-title">{{ item.title }}</text>
							<view class="knowledge-tags">
								<text 
									v-for="(tag, tagIndex) in item.tags" 
									:key="tagIndex"
									class="knowledge-tag"
								>
									{{ tag }}
								</text>
							</view>
						</view>
						<nut-icon name="right" size="16" color="#C9CDD4"></nut-icon>
					</view>
					
					<text class="knowledge-summary">{{ item.summary }}</text>
					
					<view class="card-footer">
						<view class="meta-info">
							<view class="meta-item">
								<nut-icon name="time" size="12" color="#86909C"></nut-icon>
								<text class="meta-text">{{ item.updateTime }}</text>
							</view>
							<view class="meta-item">
								<nut-icon name="eye" size="12" color="#86909C"></nut-icon>
								<text class="meta-text">{{ item.viewCount }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-if="filteredKnowledge.length === 0" class="empty-state">
				<nut-icon name="file-text" size="48" color="#C9CDD4"></nut-icon>
				<text class="empty-text">暂无相关知识</text>
				<text class="empty-tip">试试其他关键词或分类</text>
			</view>

			<!-- 底部操作区 -->
			<view class="bottom-actions">
				<nut-button type="primary" size="large" block @click="addKnowledge">
					<nut-icon name="plus" size="14"></nut-icon>
					新增知识
				</nut-button>
			</view>
		</view>

		<!-- 自定义tabbar -->
		<custom-tab-bar current="1"></custom-tab-bar>
	</view>
</template>

<script>
import CustomTabBar from '@/custom-tab-bar/index.vue'
import CustomNavbar from '@/components/CustomNavbar.vue'
import knowledgeApi from '@/api/knowledgeApi.js'

export default {
	components: {
		CustomTabBar,
		CustomNavbar
	},
	data() {
			return {
				searchVisible: false,
				searchKeyword: '',
				loading: false,
				refreshing: false,
				knowledgeList: [],
				allTags: []
			}
		},
	computed: {
			filteredKnowledge() {
				let result = this.knowledgeList
				
				// 搜索筛选
				if (this.searchKeyword) {
					const keyword = this.searchKeyword.toLowerCase()
					result = result.filter(item => 
						item.title.toLowerCase().includes(keyword) ||
						item.summary.toLowerCase().includes(keyword) ||
						item.tags.some(tag => tag.toLowerCase().includes(keyword))
					)
				}
				
				return result
			}
		},
	onLoad() {
		this.loadKnowledgeList()
		this.loadAllTags()
	},
	onPullDownRefresh() {
		this.refreshData()
	},
	methods: {
		// 加载知识列表
		async loadKnowledgeList() {
			try {
				this.loading = true
				const options = {
					keyword: this.searchKeyword,
					limit: 50,
					offset: 0
				}
				this.knowledgeList = await knowledgeApi.getKnowledgeList(options)
			} catch (error) {
				console.error('加载知识列表失败:', error)
				uni.showToast({
					title: '加载失败',
					icon: 'none'
				})
			} finally {
				this.loading = false
			}
		},
		
		// 加载所有标签
		async loadAllTags() {
			try {
				this.allTags = await knowledgeApi.getAllTags()
			} catch (error) {
				console.error('加载标签失败:', error)
			}
		},
		
		// 刷新数据
		async refreshData() {
			try {
				this.refreshing = true
				await Promise.all([
					this.loadKnowledgeList(),
					this.loadAllTags()
				])
				uni.showToast({
					title: '刷新成功',
					icon: 'success'
				})
			} catch (error) {
				uni.showToast({
					title: '刷新失败',
					icon: 'none'
				})
			} finally {
				this.refreshing = false
				uni.stopPullDownRefresh()
			}
		},
		
		showSearch() {
			this.searchVisible = !this.searchVisible
		},
		
		async handleSearch(value) {
			this.searchKeyword = value
			await this.loadKnowledgeList()
		},
		
		async clearSearch() {
			this.searchKeyword = ''
			await this.loadKnowledgeList()
		},
		

		
		viewDetail(item) {
			uni.navigateTo({
				url: `/pages/knowledge/detail?id=${item.id}&title=${encodeURIComponent(item.title)}`
			})
		},
		

		
		addKnowledge() {
			uni.navigateTo({
				url: '/pages/knowledge/create'
			})
		}
	}
}
</script>

<style scoped>
.knowledge-page {
	min-height: 100vh;
	background-color: #F2F3F5;
	padding-bottom: 160rpx;
}

.navbar-placeholder {
	height: calc(var(--status-bar-height) + 136rpx);
}

.page-content {
	padding: 32rpx 32rpx 200rpx;
}

.search-section {
	margin-bottom: 32rpx;
}



.knowledge-list {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.knowledge-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	transition: all 0.3s ease;
}

.knowledge-card:active {
	transform: scale(0.98);
}

.card-header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 16rpx;
}

.title-section {
	flex: 1;
}

.knowledge-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	line-height: 1.4;
	margin-bottom: 12rpx;
	display: block;
}

.knowledge-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 8rpx;
}

.knowledge-tag {
	padding: 4rpx 12rpx;
	background-color: #F2F3F5;
	border-radius: 8rpx;
	font-size: 20rpx;
	color: #86909C;
}

.knowledge-summary {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.5;
	margin-bottom: 24rpx;
	display: block;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.card-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.meta-info {
	display: flex;
	align-items: center;
	gap: 24rpx;
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



.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 120rpx 32rpx;
	text-align: center;
}

.empty-text {
	font-size: 32rpx;
	color: #4E5969;
	margin: 24rpx 0 12rpx;
	display: block;
}

.empty-tip {
	font-size: 28rpx;
	color: #86909C;
	display: block;
}

.bottom-actions {
	position: fixed;
	bottom: 120rpx;
	left: 32rpx;
	right: 32rpx;
	z-index: 100;
}
</style>