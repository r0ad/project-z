<script>
	export default {
		onLaunch: function() {
			console.log('App Launch')
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
@import "nutui-uniapp/styles/index.scss";

/* 全局样式 */
page {
	background-color: #F2F3F5;
}

/* 通用样式类 */
.primary-color {
	color: #165DFF;
}

.success-color {
	color: #00B42A;
}

.warning-color {
	color: #FF7D00;
}

.danger-color {
	color: #F53F3F;
}

.gray-color {
	color: #86909C;
}

.card {
	background-color: #ffffff;
	border-radius: 16rpx;
	box-shadow: 0 4rpx 16rpx 0 rgba(0, 0, 0, 0.08);
	margin-bottom: 24rpx;
	padding: 32rpx;
}

.btn-primary {
	background-color: #165DFF;
	color: #ffffff;
	border-radius: 16rpx;
	padding: 24rpx 32rpx;
	font-size: 28rpx;
	border: none;
}

.btn-secondary {
	background-color: #ffffff;
	color: #86909C;
	border: 2rpx solid #E5E6EB;
	border-radius: 16rpx;
	padding: 24rpx 32rpx;
	font-size: 28rpx;
}

</style>
