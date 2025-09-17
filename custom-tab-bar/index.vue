<template>
	<view class="custom-tab-bar">
		<nut-tabbar v-model="active" @tab-switch="onSwitch" :safe-area-inset-bottom="true">
			<nut-tabbar-item tab-title="首页" icon="home">
				<template #icon="props">
					<nut-icon :name="props.active ? 'home' : 'home'" :color="props.active ? '#165DFF' : '#86909C'" size="20"></nut-icon>
				</template>
			</nut-tabbar-item>
			<nut-tabbar-item tab-title="知识库" icon="find">
				<template #icon="props">
					<nut-icon :name="props.active ? 'find' : 'find'" :color="props.active ? '#165DFF' : '#86909C'" size="20"></nut-icon>
				</template>
			</nut-tabbar-item>
			<nut-tabbar-item tab-title="我的" icon="my">
				<template #icon="props">
					<nut-icon :name="props.active ? 'my' : 'my'" :color="props.active ? '#165DFF' : '#86909C'" size="20"></nut-icon>
				</template>
			</nut-tabbar-item>
		</nut-tabbar>
	</view>
</template>

<script>
export default {
	data() {
		return {
			active: 0
		}
	},
	mounted() {
		// 根据当前页面设置active值
		const pages = getCurrentPages()
		const currentPage = pages[pages.length - 1]
		const route = currentPage.route
		
		if (route.includes('project/list')) {
			this.active = 0
		} else if (route.includes('knowledge/index')) {
			this.active = 1
		} else if (route.includes('profile/index')) {
			this.active = 2
		}
	},
	methods: {
		onSwitch(item, index) {
			this.active = index
			const urls = [
				'/pages/project/list',
				'/pages/knowledge/index',
				'/pages/profile/index'
			]
			
			uni.reLaunch({
				url: urls[index]
			})
		}
	}
}
</script>

<style scoped>
.custom-tab-bar {
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	z-index: 1000;
}
</style>