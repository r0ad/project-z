<template>
	<view class="knowledge-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-content">
				<text class="navbar-title">知识库</text>
				<nut-icon name="search" size="20" color="#86909C" @click="showSearch"></nut-icon>
			</view>
		</view>

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

			<!-- 分类标签 -->
			<view class="category-section">
				<view class="category-title">分类</view>
				<view class="category-tags">
					<view 
						v-for="(category, index) in categories" 
						:key="index"
						class="category-tag"
						:class="{ active: activeCategory === category.id }"
						@click="selectCategory(category.id)"
					>
						{{ category.name }}
					</view>
				</view>
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
						<view class="ai-score" :class="getScoreClass(item.aiScore)">
							AI评分: {{ item.aiScore }}
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

export default {
	components: {
		CustomTabBar
	},
	data() {
		return {
			searchVisible: false,
			searchKeyword: '',
			activeCategory: 'all',
			categories: [
				{ id: 'all', name: '全部' },
				{ id: 'tech', name: '技术' },
				{ id: 'design', name: '设计' },
				{ id: 'product', name: '产品' },
				{ id: 'business', name: '商业' },
				{ id: 'other', name: '其他' }
			],
			knowledgeList: [
				{
					id: 1,
					title: 'Vue3 Composition API 最佳实践',
					summary: '详细介绍Vue3 Composition API的使用方法和最佳实践，包括响应式数据、生命周期钩子、组合式函数等核心概念。',
					tags: ['Vue3', 'JavaScript', '前端'],
					category: 'tech',
					updateTime: '2天前',
					viewCount: 128,
					aiScore: 9.2
				},
				{
					id: 2,
					title: 'UI设计系统构建指南',
					summary: '从零开始构建完整的UI设计系统，包括颜色规范、字体规范、组件库设计等，提升设计效率和一致性。',
					tags: ['UI设计', '设计系统', 'Figma'],
					category: 'design',
					updateTime: '5天前',
					viewCount: 89,
					aiScore: 8.7
				},
				{
					id: 3,
					title: '产品需求分析方法论',
					summary: '系统性的产品需求分析方法，包括用户调研、需求收集、优先级排序、可行性评估等关键环节。',
					tags: ['产品管理', '需求分析', '用户研究'],
					category: 'product',
					updateTime: '1周前',
					viewCount: 156,
					aiScore: 8.9
				},
				{
					id: 4,
					title: 'React性能优化技巧',
					summary: 'React应用性能优化的实用技巧，包括组件优化、状态管理、代码分割、懒加载等方面的最佳实践。',
					tags: ['React', '性能优化', '前端'],
					category: 'tech',
					updateTime: '3天前',
					viewCount: 203,
					aiScore: 9.1
				},
				{
					id: 5,
					title: '商业模式画布应用指南',
					summary: '商业模式画布的详细应用指南，帮助创业者和产品经理系统性地分析和设计商业模式。',
					tags: ['商业模式', '创业', '战略'],
					category: 'business',
					updateTime: '1周前',
					viewCount: 67,
					aiScore: 8.5
				}
			]
		}
	},
	computed: {
		filteredKnowledge() {
			let result = this.knowledgeList
			
			// 分类筛选
			if (this.activeCategory !== 'all') {
				result = result.filter(item => item.category === this.activeCategory)
			}
			
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
	methods: {
		showSearch() {
			this.searchVisible = !this.searchVisible
		},
		handleSearch(value) {
			this.searchKeyword = value
		},
		clearSearch() {
			this.searchKeyword = ''
		},
		selectCategory(categoryId) {
			this.activeCategory = categoryId
		},
		viewDetail(item) {
			uni.navigateTo({
				url: `/pages/knowledge/detail?id=${item.id}&title=${encodeURIComponent(item.title)}`
			})
		},
		getScoreClass(score) {
			if (score >= 9) return 'excellent'
			if (score >= 8) return 'good'
			if (score >= 7) return 'average'
			return 'poor'
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

.custom-navbar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 1000;
	background-color: #ffffff;
	border-bottom: 2rpx solid #E5E6EB;
	padding-top: var(--status-bar-height);
}

.navbar-content {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx 32rpx;
}

.navbar-title {
	font-size: 36rpx;
	font-weight: bold;
	color: #1D2129;
}

.page-content {
	padding: calc(var(--status-bar-height) + 120rpx) 32rpx 200rpx;
}

.search-section {
	margin-bottom: 32rpx;
}

.category-section {
	margin-bottom: 32rpx;
}

.category-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 16rpx;
}

.category-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.category-tag {
	padding: 12rpx 24rpx;
	background-color: #ffffff;
	border: 2rpx solid #E5E6EB;
	border-radius: 32rpx;
	font-size: 24rpx;
	color: #4E5969;
	transition: all 0.3s ease;
}

.category-tag.active {
	background-color: #165DFF;
	border-color: #165DFF;
	color: #ffffff;
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

.ai-score {
	font-size: 24rpx;
	font-weight: 500;
	padding: 8rpx 16rpx;
	border-radius: 8rpx;
}

.ai-score.excellent {
	background-color: #00B42A10;
	color: #00B42A;
}

.ai-score.good {
	background-color: #165DFF10;
	color: #165DFF;
}

.ai-score.average {
	background-color: #FF7D0010;
	color: #FF7D00;
}

.ai-score.poor {
	background-color: #F53F3F10;
	color: #F53F3F;
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