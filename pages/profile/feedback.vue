<template>
	<view class="feedback-page">
		<!-- 自定义导航栏 -->
		<CustomNavbar title="意见反馈" />

		<!-- 页面内容 -->
		<view class="page-content">
			<!-- 欢迎卡片 -->
			<view class="welcome-card">
				<view class="welcome-icon">
					<nut-icon name="service" size="32" color="#165DFF"></nut-icon>
				</view>
				<view class="welcome-content">
					<text class="welcome-title">我们重视您的每一条反馈</text>
					<text class="welcome-subtitle">通过微信联系我们，获得更快速的响应</text>
				</view>
			</view>

			<!-- 微信联系卡片 -->
			<view class="wechat-card">
				<view class="card-header">
					<view class="header-icon">
						<nut-icon name="wechat" size="24" color="#07C160"></nut-icon>
					</view>
					<text class="card-title">微信联系</text>
				</view>

				<!-- 微信二维码 -->
				<view class="qrcode-section">
					<view class="qrcode-container">
						<image src="/static/wechat.jpg" class="qrcode-image" mode="aspectFit" @click="previewQRCode">
						</image>
						<view class="qrcode-overlay" @click="previewQRCode">
							<nut-icon name="eye" size="20" color="#ffffff"></nut-icon>
							<text class="overlay-text">点击查看大图</text>
						</view>
					</view>
					<text class="qrcode-tip">扫描二维码添加微信</text>
				</view>

				<!-- 微信号 -->
				<view class="wechat-id-section">
					<view class="id-row">
						<view class="id-label">
							<nut-icon name="add" size="16" color="#86909C"></nut-icon>
							<text class="label-text">微信号</text>
						</view>
						<view class="id-content">
							<text class="wechat-id">{{ wechatId }}</text>
							<view class="copy-btn" @click="copyWechatId">
								<nut-icon name="s-follow" size="16" color="#ffffff"></nut-icon>
								<text class="copy-text">复制</text>
							</view>
						</view>
					</view>
				</view>

				<!-- 操作按钮 -->
				<view class="action-buttons">
					<nut-button type="success" size="large" block @click="openWechat" class="wechat-btn">
						<nut-icon name="my2" size="18" color="#ffffff"></nut-icon>
						打开微信
					</nut-button>
				</view>
			</view>

			<!-- 反馈指南 -->
			<view class="guide-card">
				<view class="guide-header">
					<nut-icon name="tips" size="20" color="#FF7D00"></nut-icon>
					<text class="guide-title">反馈指南</text>
				</view>
				<view class="guide-list">
					<view class="guide-item">
						<view class="guide-dot"></view>
						<text class="guide-text">详细描述遇到的问题或建议</text>
					</view>
					<view class="guide-item">
						<view class="guide-dot"></view>
						<text class="guide-text">提供相关截图或操作步骤</text>
					</view>
					<view class="guide-item">
						<view class="guide-dot"></view>
						<text class="guide-text">留下您的联系方式便于跟进</text>
					</view>
					<view class="guide-item">
						<view class="guide-dot"></view>
						<text class="guide-text">我们会在24小时内回复您</text>
					</view>
				</view>
			</view>

			<!-- 常见问题 -->
			<view class="faq-card">
				<view class="faq-header" @click="toggleFAQ">
					<view class="faq-title-row">
						<nut-icon name="ask" size="20" color="#165DFF"></nut-icon>
						<text class="faq-title">常见问题</text>
					</view>
					<nut-icon :name="faqExpanded ? 'arrow-up' : 'arrow-down'" size="16" color="#86909C"></nut-icon>
				</view>
				<view v-if="faqExpanded" class="faq-content">
					<view v-for="(faq, index) in faqList" :key="index" class="faq-item">
						<view class="faq-question">
							<text class="question-text">Q: {{ faq.question }}</text>
						</view>
						<view class="faq-answer">
							<text class="answer-text">A: {{ faq.answer }}</text>
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
			wechatId: 'codetrend',
			faqExpanded: false,
			faqList: [
				{
					question: '如何快速联系客服？',
					answer: '扫描上方二维码或搜索微信号 codetrend 添加客服微信，我们会在24小时内回复您。'
				},
				{
					question: '反馈问题需要提供哪些信息？',
					answer: '请详细描述问题现象、操作步骤，并提供相关截图，这样有助于我们快速定位和解决问题。'
				},
				{
					question: '功能建议如何提交？',
					answer: '您可以通过微信详细描述您希望增加的功能，我们会认真评估每一个建议。'
				},
				{
					question: '多久能收到回复？',
					answer: '我们承诺在24小时内回复您的反馈，紧急问题会优先处理。'
				}
			]
		}
	},
	methods: {
		// 预览二维码
		previewQRCode() {
			uni.previewImage({
				current: 0,
				urls: ['/static/wechat.jpg']
			})
		},

		// 复制微信号
		copyWechatId() {
			uni.setClipboardData({
				data: this.wechatId,
				success: () => {
					uni.showToast({
						title: '微信号已复制',
						icon: 'success',
						duration: 2000
					})
				},
				fail: () => {
					uni.showToast({
						title: '复制失败',
						icon: 'none'
					})
				}
			})
		},

		// 打开微信
		openWechat() {
			// 尝试打开微信应用
			// #ifdef APP-PLUS
			plus.runtime.openURL('weixin://', (error) => {
				// 如果打开失败，提示用户手动打开
				uni.showModal({
					title: '提示',
					content: '无法直接打开微信，请手动打开微信搜索：' + this.wechatId,
					confirmText: '复制微信号',
					cancelText: '知道了',
					success: (res) => {
						if (res.confirm) {
							this.copyWechatId()
						}
					}
				})
			})
			// #endif

			// #ifdef H5
			// H5环境下提示用户
			uni.showModal({
				title: '提示',
				content: '请在手机上打开微信，搜索微信号：' + this.wechatId,
				confirmText: '复制微信号',
				cancelText: '知道了',
				success: (res) => {
					if (res.confirm) {
						this.copyWechatId()
					}
				}
			})
			// #endif

			// #ifdef MP-WEIXIN
			// 微信小程序环境下的处理
			uni.showModal({
				title: '提示',
				content: '请搜索微信号：' + this.wechatId + ' 添加客服微信',
				confirmText: '复制微信号',
				cancelText: '知道了',
				success: (res) => {
					if (res.confirm) {
						this.copyWechatId()
					}
				}
			})
			// #endif
		},

		// 切换FAQ展开状态
		toggleFAQ() {
			this.faqExpanded = !this.faqExpanded
		}
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

/* 欢迎卡片 */
.welcome-card {
	background: linear-gradient(135deg, #165DFF 0%, #4080FF 100%);
	border-radius: 20rpx;
	padding: 40rpx 32rpx;
	margin-bottom: 32rpx;
	display: flex;
	align-items: center;
	gap: 24rpx;
	box-shadow: 0 8rpx 24rpx 0 rgba(22, 93, 255, 0.3);
}

.welcome-icon {
	width: 80rpx;
	height: 80rpx;
	background-color: rgba(255, 255, 255, 0.2);
	border-radius: 20rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.welcome-content {
	flex: 1;
}

.welcome-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #ffffff;
	display: block;
	margin-bottom: 8rpx;
}

.welcome-subtitle {
	font-size: 26rpx;
	color: rgba(255, 255, 255, 0.8);
	display: block;
}

/* 微信联系卡片 */
.wechat-card {
	background-color: #ffffff;
	border-radius: 20rpx;
	padding: 32rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.card-header {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 32rpx;
	padding-bottom: 24rpx;
	border-bottom: 2rpx solid #F2F3F5;
}

.header-icon {
	width: 48rpx;
	height: 48rpx;
	background-color: #07C16020;
	border-radius: 12rpx;
	display: flex;
	align-items: center;
	justify-content: center;
}

.card-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

/* 二维码区域 */
.qrcode-section {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 32rpx;
}

.qrcode-container {
	position: relative;
	width: 320rpx;
	height: 320rpx;
	border-radius: 16rpx;
	overflow: hidden;
	margin-bottom: 16rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.1);
}

.qrcode-image {
	width: 100%;
	height: 100%;
}

.qrcode-overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: rgba(0, 0, 0, 0.5);
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	opacity: 0;
	transition: all 0.3s ease;
}

.qrcode-container:active .qrcode-overlay {
	opacity: 1;
}

.overlay-text {
	font-size: 24rpx;
	color: #ffffff;
	font-weight: 500;
}

.qrcode-tip {
	font-size: 28rpx;
	color: #4E5969;
	text-align: center;
}

/* 微信号区域 */
.wechat-id-section {
	margin-bottom: 32rpx;
}

.id-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 24rpx;
	background-color: #F7F8FA;
	border-radius: 12rpx;
}

.id-label {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.label-text {
	font-size: 28rpx;
	color: #86909C;
}

.id-content {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.wechat-id {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
	font-family: 'Courier New', monospace;
}

.copy-btn {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 12rpx 16rpx;
	background-color: #165DFF;
	border-radius: 8rpx;
	transition: all 0.3s ease;
}

.copy-btn:active {
	background-color: #0E42D2;
	transform: scale(0.95);
}

.copy-text {
	font-size: 24rpx;
	color: #ffffff;
	font-weight: 500;
}

/* 操作按钮 */
.action-buttons {
	margin-top: 32rpx;
}

.wechat-btn {
	background: linear-gradient(135deg, #07C160 0%, #00A854 100%) !important;
	border: none !important;
	box-shadow: 0 4rpx 16rpx 0 rgba(7, 193, 96, 0.3);
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	font-weight: 600;
}

/* 反馈指南 */
.guide-card {
	background-color: #ffffff;
	border-radius: 20rpx;
	padding: 32rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.guide-header {
	display: flex;
	align-items: center;
	gap: 16rpx;
	margin-bottom: 24rpx;
}

.guide-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.guide-list {
	display: flex;
	flex-direction: column;
	gap: 20rpx;
}

.guide-item {
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
}

.guide-dot {
	width: 12rpx;
	height: 12rpx;
	background-color: #165DFF;
	border-radius: 50%;
	margin-top: 8rpx;
	flex-shrink: 0;
}

.guide-text {
	font-size: 28rpx;
	color: #4E5969;
	line-height: 1.6;
}

/* 常见问题 */
.faq-card {
	background-color: #ffffff;
	border-radius: 20rpx;
	padding: 32rpx;
	margin-bottom: 32rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
}

.faq-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	cursor: pointer;
	padding: 8rpx 0;
}

.faq-title-row {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.faq-title {
	font-size: 32rpx;
	font-weight: 600;
	color: #1D2129;
}

.faq-content {
	margin-top: 24rpx;
	padding-top: 24rpx;
	border-top: 2rpx solid #F2F3F5;
}

.faq-item {
	margin-bottom: 32rpx;
}

.faq-item:last-child {
	margin-bottom: 0;
}

.faq-question {
	margin-bottom: 12rpx;
}

.question-text {
	font-size: 28rpx;
	font-weight: 600;
	color: #1D2129;
	line-height: 1.5;
}

.faq-answer {
	padding-left: 24rpx;
}

.answer-text {
	font-size: 26rpx;
	color: #4E5969;
	line-height: 1.6;
}
</style>