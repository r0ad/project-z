<template>
	<view class="knowledge-detail-page">
		<!-- 自定义导航栏 -->
		<view class="custom-navbar">
			<view class="navbar-content">
				<nut-icon name="left" size="20" color="#86909C" @click="goBack"></nut-icon>
				<text class="navbar-title">知识详情</text>
				<nut-icon name="share" size="20" color="#86909C" @click="shareKnowledge"></nut-icon>
			</view>
		</view>

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
						<view class="ai-score" :class="getScoreClass(knowledgeData.aiScore)">
							AI评分: {{ knowledgeData.aiScore }}
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

				<!-- 关键要点 -->
				<view class="content-section">
					<view class="section-title">
						<nut-icon name="star" color="#165DFF" size="16"></nut-icon>
						<text class="title-text">关键要点</text>
					</view>
					<view class="key-points">
						<view 
							v-for="(point, index) in knowledgeData.keyPoints" 
							:key="index"
							class="key-point-item"
						>
							<view class="point-number">{{ index + 1 }}</view>
							<text class="point-text">{{ point }}</text>
						</view>
					</view>
				</view>

				<!-- AI分析 -->
				<view class="content-section ai-analysis">
					<view class="section-title">
						<nut-icon name="chart-pie" color="#165DFF" size="16"></nut-icon>
						<text class="title-text">AI分析</text>
					</view>
					<view class="ai-analysis-content">
						<view class="analysis-item">
							<text class="analysis-label">实用性评估：</text>
							<text class="analysis-value high">高</text>
						</view>
						<view class="analysis-item">
							<text class="analysis-label">技术深度：</text>
							<text class="analysis-value medium">中等</text>
						</view>
						<view class="analysis-item">
							<text class="analysis-label">学习难度：</text>
							<text class="analysis-value low">较低</text>
						</view>
						<text class="ai-suggestion">{{ knowledgeData.aiSuggestion }}</text>
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
				<nut-button type="default" size="large" @click="collectKnowledge">
					<nut-icon name="star" size="14"></nut-icon>
					收藏
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
export default {
	data() {
		return {
			knowledgeId: '',
			knowledgeData: {
				title: 'Vue3 Composition API 最佳实践',
				summary: '详细介绍Vue3 Composition API的使用方法和最佳实践，包括响应式数据、生命周期钩子、组合式函数等核心概念。',
				content: 'Vue3 Composition API是Vue.js 3.0版本引入的一套新的API设计，它提供了一种更加灵活和可组合的方式来组织组件逻辑。\n\n与传统的Options API相比，Composition API具有以下优势：\n\n1. 更好的逻辑复用：通过组合式函数，可以轻松地在不同组件间共享逻辑\n2. 更好的类型推导：TypeScript支持更加完善\n3. 更灵活的代码组织：相关逻辑可以组织在一起，而不是分散在不同的选项中\n\n在实际开发中，我们需要注意以下几个关键点：\n\n响应式数据的创建和使用、生命周期钩子的正确调用时机、组合式函数的设计原则等。',
				tags: ['Vue3', 'JavaScript', '前端'],
				updateTime: '2天前',
				viewCount: 128,
				aiScore: 9.2,
				keyPoints: [
					'ref和reactive的区别和使用场景',
					'computed和watch的正确使用方式',
					'生命周期钩子在Composition API中的变化',
					'组合式函数的设计原则和最佳实践',
					'与TypeScript的完美结合'
				],
				aiSuggestion: 'AI建议：这是一篇高质量的技术文档，适合有一定Vue基础的开发者学习。建议结合实际项目练习，加深理解。'
			},
			relatedKnowledge: [
				{
					id: 2,
					title: 'React性能优化技巧'
				},
				{
					id: 3,
					title: 'TypeScript进阶指南'
				},
				{
					id: 4,
					title: '前端工程化最佳实践'
				}
			]
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
	methods: {
		goBack() {
			uni.navigateBack()
		},
		loadKnowledgeDetail() {
			// 模拟加载知识详情数据
			console.log('加载知识详情:', this.knowledgeId)
		},
		getScoreClass(score) {
			if (score >= 9) return 'excellent'
			if (score >= 8) return 'good'
			if (score >= 7) return 'average'
			return 'poor'
		},
		shareKnowledge() {
			uni.showToast({
				title: '分享知识',
				icon: 'none'
			})
		},
		collectKnowledge() {
			uni.showToast({
				title: '收藏成功',
				icon: 'success'
			})
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
		}
	}
}
</script>

<style scoped>
.knowledge-detail-page {
	min-height: 100vh;
	background-color: #F2F3F5;
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
	flex: 1;
	text-align: center;
	margin: 0 32rpx;
}

.page-content {
	padding: calc(var(--status-bar-height) + 120rpx) 32rpx 200rpx;
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

.key-points {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.key-point-item {
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
}

.point-number {
	width: 32rpx;
	height: 32rpx;
	border-radius: 50%;
	background-color: #165DFF;
	color: #ffffff;
	font-size: 20rpx;
	font-weight: 600;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	margin-top: 4rpx;
}

.point-text {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.5;
	flex: 1;
}

.ai-analysis {
	background: linear-gradient(135deg, #165DFF10, #165DFF05);
	border: 2rpx solid #165DFF20;
}

.ai-analysis-content {
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.analysis-item {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.analysis-label {
	font-size: 28rpx;
	color: #4E5969;
	font-weight: 500;
}

.analysis-value {
	font-size: 24rpx;
	padding: 4rpx 12rpx;
	border-radius: 6rpx;
	font-weight: 500;
}

.analysis-value.high {
	background-color: #00B42A10;
	color: #00B42A;
}

.analysis-value.medium {
	background-color: #FF7D0010;
	color: #FF7D00;
}

.analysis-value.low {
	background-color: #165DFF10;
	color: #165DFF;
}

.ai-suggestion {
	font-size: 28rpx;
	color: #165DFF;
	line-height: 1.5;
	margin-top: 8rpx;
	display: block;
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