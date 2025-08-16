<template>
	<view class="content">
		<image class="logo" src="/static/logo.png"></image>
		<view class="text-area">
			<text class="title">{{ title }}</text>
		</view>

		<view class="demo-section">
			<text class="section-title">插件示例</text>
			<view class="btn-group">
				<button class="demo-btn" @click="navigateToGitCode">GitCode同步示例</button>
				<button class="demo-btn" @click="navigateToFileManager">文件管理示例</button>
				<button class="demo-btn" @click="navigateToAppUpdater">应用更新示例</button>
				<button class="demo-btn" @click="navigateToOpenAIChat">OpenAI Chat示例</button>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			title: 'Hello'
		}
	},
	onLoad() {

	},
	methods: {
		// 导航到GitCode同步示例
		navigateToGitCode() {
			uni.navigateTo({
				url: '/pages/demo/gitcode-demo/gitcode-demo'
			})
		},

		// 导航到文件管理示例
		navigateToFileManager() {
			uni.navigateTo({
				url: '/pages/demo/file-demo/file-demo'
			})
		},

		// 导航到应用更新示例
		navigateToAppUpdater() {
			uni.navigateTo({
				url: '/pages/demo/update-demo/update-demo'
			})
		},
		// 导航到OpenAI Chat示例
		navigateToOpenAIChat() {
			uni.navigateTo({
				url: '/pages/demo/plugin-example/plugin-example'
			})
		}
	}
}
</script>

<style>
.content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.logo {
	height: 200rpx;
	width: 200rpx;
	margin-top: 200rpx;
	margin-left: auto;
	margin-right: auto;
	margin-bottom: 50rpx;
}

.text-area {
	display: flex;
	justify-content: center;
}

.title {
	font-size: 36rpx;
	color: #8f8f94;
}

.demo-section {
	margin-top: 80rpx;
	width: 100%;
	padding: 0 40rpx;
	box-sizing: border-box;
}

.section-title {
	font-size: 32rpx;
	color: #333;
	font-weight: bold;
	margin-bottom: 40rpx;
	display: block;
	text-align: center;
}

.btn-group {
	display: flex;
	flex-direction: column;
	align-items: center;
}

.demo-btn {
	width: 500rpx;
	height: 80rpx;
	background-color: #007aff;
	color: white;
	border: none;
	border-radius: 10rpx;
	font-size: 28rpx;
	margin-bottom: 30rpx;
	cursor: pointer;
}

.demo-btn:hover {
	background-color: #0056cc;
}

.demo-btn:active {
	background-color: #004499;
}
</style>
