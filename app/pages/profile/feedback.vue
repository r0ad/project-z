<template>
	<view class="feedback-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar title="意见反馈" />

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 反馈类型选择 -->
			<view class="feedback-type">
				<view class="section-title">反馈类型</view>
				<view class="type-grid">
					<view 
						v-for="(type, index) in feedbackTypes" 
						:key="index" 
						class="type-item"
						:class="{ active: selectedType === index }"
						@click="selectType(index)"
					>
						<view class="type-icon" :style="{ backgroundColor: type.iconBg }">
							<nut-icon :name="type.icon" size="20" :color="type.iconColor"></nut-icon>
						</view>
						<text class="type-label">{{ type.label }}</text>
					</view>
				</view>
			</view>

			<!-- 反馈内容 -->
			<view class="feedback-content">
				<view class="section-title">详细描述</view>
				<view class="content-card">
					<nut-textarea 
						v-model="feedbackContent"
						placeholder="请详细描述您遇到的问题或建议，我们会认真对待每一条反馈"
						:maxlength="500"
						:rows="6"
						:show-word-limit="true"
						:autosize="true"
					></nut-textarea>
				</view>
			</view>

			<!-- 联系方式 -->
			<view class="contact-info">
				<view class="section-title">联系方式（可选）</view>
				<view class="contact-card">
					<nut-input 
						v-model="contactEmail"
						placeholder="请输入您的邮箱地址"
						type="email"
						clearable
					>
						<template #left>
							<nut-icon name="message" size="16" color="#86909C"></nut-icon>
						</template>
					</nut-input>
					<view class="contact-tip">
						<nut-icon name="tips" size="14" color="#86909C"></nut-icon>
						<text class="tip-text">提供联系方式有助于我们更好地跟进您的反馈</text>
					</view>
				</view>
			</view>

			<!-- 图片上传 -->
			<view class="image-upload">
				<view class="section-title">相关截图（可选）</view>
				<view class="upload-area">
					<view class="image-list">
						<view 
							v-for="(image, index) in uploadedImages" 
							:key="index" 
							class="image-item"
						>
							<image :src="image" class="uploaded-image" mode="aspectFill"></image>
							<view class="image-delete" @click="deleteImage(index)">
								<nut-icon name="close" size="12" color="#ffffff"></nut-icon>
							</view>
						</view>
						<view 
							v-if="uploadedImages.length < 3" 
							class="upload-btn"
							@click="chooseImage"
						>
							<nut-icon name="photograph" size="24" color="#86909C"></nut-icon>
							<text class="upload-text">添加图片</text>
						</view>
					</view>
					<view class="upload-tip">
						<text class="tip-text">最多可上传3张图片，支持JPG、PNG格式</text>
					</view>
				</view>
			</view>

			<!-- 提交按钮 -->
			<view class="submit-section">
				<nut-button 
					type="primary" 
					size="large" 
					block
					:loading="submitting"
					:disabled="!canSubmit"
					@click="submitFeedback"
				>
					{{ submitting ? '提交中...' : '提交反馈' }}
				</nut-button>
			</view>

			<!-- 历史反馈 -->
			<view class="history-section">
				<view class="section-title">历史反馈</view>
				<view v-if="feedbackHistory.length === 0" class="empty-state">
					<nut-icon name="empty" size="48" color="#C9CDD4"></nut-icon>
					<text class="empty-text">暂无历史反馈</text>
				</view>
				<view v-else class="history-list">
					<view 
						v-for="(item, index) in feedbackHistory" 
						:key="index" 
						class="history-item"
						@click="viewFeedbackDetail(item)"
					>
						<view class="history-header">
							<view class="history-type">
								<view class="type-dot" :style="{ backgroundColor: item.typeColor }"></view>
								<text class="type-name">{{ item.typeName }}</text>
							</view>
							<view class="history-status" :class="item.status">
								<text class="status-text">{{ getStatusText(item.status) }}</text>
							</view>
						</view>
						<view class="history-content">
							<text class="content-text">{{ item.content }}</text>
						</view>
						<view class="history-footer">
							<text class="submit-time">{{ item.submitTime }}</text>
							<nut-icon name="right" size="14" color="#86909C"></nut-icon>
						</view>
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
			selectedType: 0,
			feedbackTypes: [
				{
					label: '功能建议',
					icon: 'star',
					iconColor: '#165DFF',
					iconBg: '#165DFF20',
					value: 'suggestion'
				},
				{
					label: '问题反馈',
					icon: 'issue',
					iconColor: '#F53F3F',
					iconBg: '#F53F3F20',
					value: 'bug'
				},
				{
					label: '使用咨询',
					icon: 'ask',
					iconColor: '#00B42A',
					iconBg: '#00B42A20',
					value: 'question'
				},
				{
					label: '其他',
					icon: 'more',
					iconColor: '#86909C',
					iconBg: '#86909C20',
					value: 'other'
				}
			],
			feedbackContent: '',
			contactEmail: '',
			uploadedImages: [],
			submitting: false,
			feedbackHistory: [
				{
					id: 1,
					typeName: '功能建议',
					typeColor: '#165DFF',
					content: '希望能增加暗黑模式，在夜间使用时更加舒适',
					status: 'processing',
					submitTime: '2024-01-15 14:30'
				},
				{
					id: 2,
					typeName: '问题反馈',
					typeColor: '#F53F3F',
					content: 'AI助手有时响应较慢，希望能优化响应速度',
					status: 'resolved',
					submitTime: '2024-01-10 09:15'
				}
			]
		}
	},
	computed: {
		canSubmit() {
			return this.feedbackContent.trim().length > 0 && !this.submitting
		}
	},
	methods: {
		selectType(index) {
			this.selectedType = index
		},
		chooseImage() {
			uni.chooseImage({
				count: 3 - this.uploadedImages.length,
				sizeType: ['compressed'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					this.uploadedImages.push(...res.tempFilePaths)
				},
				fail: (err) => {
					console.error('选择图片失败:', err)
				}
			})
		},
		deleteImage(index) {
			this.uploadedImages.splice(index, 1)
		},
		async submitFeedback() {
			if (!this.canSubmit) return
			
			this.submitting = true
			
			try {
				// 构建反馈数据
				const feedbackData = {
					type: this.feedbackTypes[this.selectedType].value,
					content: this.feedbackContent.trim(),
					contact: this.contactEmail.trim(),
					images: this.uploadedImages,
					submitTime: new Date().toISOString()
				}
				
				// TODO: 调用API提交反馈
				console.log('提交反馈:', feedbackData)
				
				// 模拟API调用
				await new Promise(resolve => setTimeout(resolve, 2000))
				
				// 提交成功
				uni.showToast({
					title: '反馈提交成功',
					icon: 'success'
				})
				
				// 重置表单
				this.resetForm()
				
				// 刷新历史记录
				this.loadFeedbackHistory()
				
			} catch (error) {
				console.error('提交反馈失败:', error)
				uni.showToast({
					title: '提交失败，请重试',
					icon: 'none'
				})
			} finally {
				this.submitting = false
			}
		},
		resetForm() {
			this.selectedType = 0
			this.feedbackContent = ''
			this.contactEmail = ''
			this.uploadedImages = []
		},
		loadFeedbackHistory() {
			// TODO: 从API加载历史反馈
			console.log('加载历史反馈')
		},
		viewFeedbackDetail(item) {
			uni.showModal({
				title: '反馈详情',
				content: `类型：${item.typeName}\n内容：${item.content}\n状态：${this.getStatusText(item.status)}\n时间：${item.submitTime}`,
				showCancel: false
			})
		},
		getStatusText(status) {
			const statusMap = {
				pending: '待处理',
				processing: '处理中',
				resolved: '已解决',
				closed: '已关闭'
			}
			return statusMap[status] || '未知状态'
		}
	},
	mounted() {
		this.loadFeedbackHistory()
	}
}
</script>

<style scoped>
.feedback-page {
	min-height: 100vh;
	background-color: #F2F3F5;
}

.page-content {
	padding: calc(var(--status-bar-height) + 146rpx) 32rpx 32rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	margin-bottom: 24rpx;
}

.feedback-type {
	margin-bottom: 32rpx;
}

.type-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16rpx;
}

.type-item {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
	transition: all 0.3s ease;
	border: 4rpx solid transparent;
}

.type-item.active {
	border-color: #165DFF;
	box-shadow: 0 4rpx 16rpx 0 rgba(22, 93, 255, 0.2);
}

.type-item:active {
	transform: scale(0.98);
}

.type-icon {
	width: 64rpx;
	height: 64rpx;
	border-radius: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.type-label {
	font-size: 28rpx;
	font-weight: 500;
	color: #1D2129;
	display: block;
}

.feedback-content {
	margin-bottom: 32rpx;
}

.content-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.contact-info {
	margin-bottom: 32rpx;
}

.contact-card {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.contact-tip {
	display: flex;
	align-items: center;
	gap: 8rpx;
	margin-top: 16rpx;
}

.tip-text {
	font-size: 24rpx;
	color: #86909C;
}

.image-upload {
	margin-bottom: 32rpx;
}

.upload-area {
	background-color: #ffffff;
	border-radius: 16rpx;
	padding: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.image-list {
	display: flex;
	gap: 16rpx;
	flex-wrap: wrap;
	margin-bottom: 16rpx;
}

.image-item {
	position: relative;
	width: 160rpx;
	height: 160rpx;
}

.uploaded-image {
	width: 100%;
	height: 100%;
	border-radius: 12rpx;
}

.image-delete {
	position: absolute;
	top: -8rpx;
	right: -8rpx;
	width: 32rpx;
	height: 32rpx;
	background-color: #F53F3F;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
}

.upload-btn {
	width: 160rpx;
	height: 160rpx;
	border: 2rpx dashed #C9CDD4;
	border-radius: 12rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	transition: all 0.3s ease;
}

.upload-btn:active {
	border-color: #165DFF;
	background-color: #165DFF10;
}

.upload-text {
	font-size: 24rpx;
	color: #86909C;
}

.upload-tip {
	text-align: center;
}

.submit-section {
	margin-bottom: 48rpx;
}

.history-section {
	margin-bottom: 32rpx;
}

.empty-state {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 80rpx 32rpx;
	background-color: #ffffff;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	gap: 24rpx;
}

.empty-text {
	font-size: 28rpx;
	color: #86909C;
}

.history-list {
	background-color: #ffffff;
	border-radius: 16rpx;
	overflow: hidden;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.history-item {
	padding: 32rpx;
	border-bottom: 2rpx solid #F2F3F5;
	transition: all 0.3s ease;
}

.history-item:last-child {
	border-bottom: none;
}

.history-item:active {
	background-color: #F2F3F5;
}

.history-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 16rpx;
}

.history-type {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.type-dot {
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
}

.type-name {
	font-size: 28rpx;
	font-weight: 500;
	color: #1D2129;
}

.history-status {
	padding: 8rpx 16rpx;
	border-radius: 8rpx;
	font-size: 24rpx;
}

.history-status.pending {
	background-color: #FF7D0020;
	color: #FF7D00;
}

.history-status.processing {
	background-color: #165DFF20;
	color: #165DFF;
}

.history-status.resolved {
	background-color: #00B42A20;
	color: #00B42A;
}

.history-status.closed {
	background-color: #86909C20;
	color: #86909C;
}

.status-text {
	font-weight: 500;
}

.history-content {
	margin-bottom: 16rpx;
}

.content-text {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.5;
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
}

.history-footer {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.submit-time {
	font-size: 24rpx;
	color: #86909C;
}
</style>