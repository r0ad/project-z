<template>
	<view class="help-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar title="帮助中心" />

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 搜索框 -->
			<view class="search-section">
				<nut-searchbar 
					v-model="searchKeyword" 
					placeholder="搜索帮助内容"
					@search="handleSearch"
				></nut-searchbar>
			</view>

			<!-- 常见问题 -->
			<view class="faq-section">
				<view class="section-title">常见问题</view>
				<view class="faq-list">
					<view 
						v-for="(item, index) in filteredFaqList" 
						:key="index" 
						class="faq-item"
						@click="toggleFaq(index)"
					>
						<view class="faq-question">
							<text class="question-text">{{ item.question }}</text>
							<nut-icon 
								:name="item.expanded ? 'arrow-up' : 'arrow-down'" 
								size="16" 
								color="#86909C"
							></nut-icon>
						</view>
						<view v-if="item.expanded" class="faq-answer">
							<text class="answer-text">{{ item.answer }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 功能指南 -->
			<view class="guide-section">
				<view class="section-title">功能指南</view>
				<view class="guide-grid">
					<view 
						v-for="(guide, index) in guideList" 
						:key="index" 
						class="guide-item"
						@click="openGuide(guide)"
					>
						<view class="guide-icon" :style="{ backgroundColor: guide.iconBg }">
							<nut-icon :name="guide.icon" size="20" :color="guide.iconColor"></nut-icon>
						</view>
						<text class="guide-title">{{ guide.title }}</text>
						<text class="guide-desc">{{ guide.description }}</text>
					</view>
				</view>
			</view>

			<!-- 联系我们 -->
			<view class="contact-section">
				<view class="section-title">联系我们</view>
				<view class="contact-card">
					<view class="contact-item" @click="copyEmail">
						<view class="contact-icon">
							<nut-icon name="message" size="20" color="#165DFF"></nut-icon>
						</view>
						<view class="contact-info">
							<text class="contact-label">邮箱支持</text>
							<text class="contact-value">support@example.com</text>
						</view>
						<nut-icon name="copy" size="16" color="#86909C"></nut-icon>
					</view>
					<view class="contact-item" @click="openFeedback">
						<view class="contact-icon">
							<nut-icon name="service" size="20" color="#00B42A"></nut-icon>
						</view>
						<view class="contact-info">
							<text class="contact-label">意见反馈</text>
							<text class="contact-value">提交问题和建议</text>
						</view>
						<nut-icon name="right" size="16" color="#86909C"></nut-icon>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import CustomNavbar from '@/components/CustomNavbar.vue'

export default {
	components: {
		CustomNavbar
	},
	data() {
		return {
			searchKeyword: '',
			faqList: [
				{
					question: '如何创建新项目？',
					answer: '在项目页面点击右上角的"新建项目"按钮，填写项目名称、目标和描述信息，然后点击保存即可创建新项目。',
					expanded: false
				},
				{
					question: '如何使用AI助手？',
					answer: '点击AI助手卡片上的"对话"按钮，或在项目详情页面使用AI分析功能。AI助手可以帮助您分析项目进度、提供改进建议等。',
					expanded: false
				},
				{
					question: '如何管理知识库？',
					answer: '在知识页面可以查看、添加和管理知识条目。支持分类管理，可以将相关知识归类整理。',
					expanded: false
				},
				{
					question: '数据如何同步？',
					answer: '应用支持本地存储，所有数据都保存在设备本地。如需备份，可以使用导出功能将数据导出到文件。',
					expanded: false
				},
				{
					question: '如何设置AI模型？',
					answer: '在设置页面的AI设置中，可以配置API密钥、选择模型类型、调整参数等。支持多种主流AI模型。',
					expanded: false
				},
				{
					question: '遇到数据库问题怎么办？',
					answer: '如果遇到数据库相关问题，可以在个人页面使用"数据库升级重试"功能，或联系技术支持获取帮助。',
					expanded: false
				}
			],
			guideList: [
				{
					title: '项目管理',
					description: '学习如何创建和管理项目',
					icon: 'category',
					iconColor: '#165DFF',
					iconBg: '#165DFF20',
					type: 'project'
				},
				{
					title: 'AI助手',
					description: '了解AI功能和使用技巧',
					icon: 'JIMI40',
					iconColor: '#00B42A',
					iconBg: '#00B42A20',
					type: 'ai'
				},
				{
					title: '知识管理',
					description: '知识库的使用和管理',
					icon: 'book',
					iconColor: '#FF7D00',
					iconBg: '#FF7D0020',
					type: 'knowledge'
				},
				{
					title: '设置配置',
					description: '应用设置和个性化配置',
					icon: 'setting',
					iconColor: '#86909C',
					iconBg: '#86909C20',
					type: 'settings'
				}
			]
		}
	},
	computed: {
		filteredFaqList() {
			if (!this.searchKeyword) {
				return this.faqList
			}
			return this.faqList.filter(item => 
				item.question.toLowerCase().includes(this.searchKeyword.toLowerCase()) ||
				item.answer.toLowerCase().includes(this.searchKeyword.toLowerCase())
			)
		}
	},
	methods: {
		handleSearch() {
			// 搜索逻辑已在computed中处理
			console.log('搜索关键词:', this.searchKeyword)
		},
		toggleFaq(index) {
			this.filteredFaqList[index].expanded = !this.filteredFaqList[index].expanded
		},
		openGuide(guide) {
			uni.showToast({
				title: `打开${guide.title}指南`,
				icon: 'none'
			})
			// TODO: 跳转到具体的指南页面
		},
		copyEmail() {
			uni.setClipboardData({
				data: 'support@example.com',
				success: () => {
					uni.showToast({
						title: '邮箱已复制',
						icon: 'success'
					})
				}
			})
		},
		openFeedback() {
			uni.navigateTo({
				url: '/pages/profile/feedback'
			})
		}
	}
}
</script>

<style scoped>
.help-page {
	min-height: 100vh;
	background-color: #F2F3F5;
}

.page-content {
	padding: calc(var(--status-bar-height) + 146rpx) 32rpx 32rpx;
}

.search-section {
	margin-bottom: 32rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 24rpx;
}

.faq-section {
	margin-bottom: 48rpx;
}

.faq-list {
	background-color: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.faq-item {
	border-bottom: 2rpx solid #F2F3F5;
	transition: all 0.3s ease;
}

.faq-item:last-child {
	border-bottom: none;
}

.faq-item:active {
	background-color: #F2F3F5;
}

.faq-question {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 32rpx;
}

.question-text {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 500;
	flex: 1;
	margin-right: 16rpx;
}

.faq-answer {
	padding: 0 32rpx 32rpx;
	border-top: 2rpx solid #F2F3F5;
	background-color: #FAFBFC;
}

.answer-text {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.6;
	display: block;
}

.guide-section {
	margin-bottom: 48rpx;
}

.guide-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16rpx;
}

.guide-item {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: column;
	align-items: center;
	text-align: center;
	gap: 16rpx;
	transition: all 0.3s ease;
}

.guide-item:active {
	transform: scale(0.98);
	box-shadow: 0 2rpx 8rpx 0 rgba(0, 0, 0, 0.12);
}

.guide-icon {
	width: 64rpx;
	height: 64rpx;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.guide-title {
	font-size: 28rpx;
	font-weight: 600;
	color: #1D2129;
	display: block;
}

.guide-desc {
	font-size: 24rpx;
	color: #86909C;
	line-height: 1.4;
	display: block;
}

.contact-section {
	margin-bottom: 32rpx;
}

.contact-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.contact-item {
	display: flex;
	align-items: center;
	padding: 32rpx;
	border-bottom: 2rpx solid #F2F3F5;
	transition: all 0.3s ease;
}

.contact-item:last-child {
	border-bottom: none;
}

.contact-item:active {
	background-color: #F2F3F5;
}

.contact-icon {
	width: 48rpx;
	height: 48rpx;
	border-radius: 12rpx;
	background-color: #F2F3F5;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 24rpx;
}

.contact-info {
	flex: 1;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.contact-label {
	font-size: 28rpx;
	color: #1D2129;
	font-weight: 500;
	display: block;
}

.contact-value {
	font-size: 24rpx;
	color: #86909C;
	display: block;
}
</style>