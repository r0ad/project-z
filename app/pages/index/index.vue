<template>
	<view class="content">
		<image class="logo" src="/static/logo.png"></image>
		<view class="text-area">
			<text class="title">{{ title }}</text>
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
