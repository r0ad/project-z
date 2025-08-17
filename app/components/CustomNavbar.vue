<template>
  <view class="custom-navbar" :class="{ fixed: fixed }">
    <view class="navbar-content">
      <!-- 左侧内容 -->
      <view class="navbar-left" @click="handleLeftClick">
        <nut-icon 
          v-if="showBack" 
          name="left" 
          size="20" 
          :color="leftIconColor"
        ></nut-icon>
        <slot name="left" v-else></slot>
      </view>
      
      <!-- 标题 -->
      <view class="navbar-title">
        <text class="title-text" :style="{ color: titleColor }">{{ title }}</text>
        <slot name="title"></slot>
      </view>
      
      <!-- 右侧内容 -->
      <view class="navbar-right" @click="handleRightClick">
        <nut-icon 
          v-if="rightIcon" 
          :name="rightIcon" 
          size="20" 
          :color="rightIconColor"
        ></nut-icon>
        <nut-button 
          v-else-if="rightButton"
          :type="rightButton.type || 'primary'"
          :size="rightButton.size || 'small'"
          @click="handleRightButtonClick"
        >
          <nut-icon v-if="rightButton.icon" :name="rightButton.icon" size="14"></nut-icon>
          {{ rightButton.text }}
        </nut-button>
        <view v-else-if="rightText" class="right-text" :style="{ color: rightTextColor }">
          {{ rightText }}
        </view>
        <slot name="right" v-else></slot>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CustomNavbar',
  props: {
    // 标题
    title: {
      type: String,
      default: ''
    },
    // 标题颜色
    titleColor: {
      type: String,
      default: '#1D2129'
    },
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      default: true
    },
    // 左侧图标颜色
    leftIconColor: {
      type: String,
      default: '#1D2129'
    },
    // 右侧图标
    rightIcon: {
      type: String,
      default: ''
    },
    // 右侧图标颜色
    rightIconColor: {
      type: String,
      default: '#1D2129'
    },
    // 右侧按钮配置
    rightButton: {
      type: Object,
      default: null
    },
    // 右侧文字
    rightText: {
      type: String,
      default: ''
    },
    // 右侧文字颜色
    rightTextColor: {
      type: String,
      default: '#165DFF'
    },
    // 是否固定定位
    fixed: {
      type: Boolean,
      default: true
    },
    // 背景色
    backgroundColor: {
      type: String,
      default: '#ffffff'
    },
    // 是否显示底部边框
    showBorder: {
      type: Boolean,
      default: true
    }
  },
  methods: {
    handleLeftClick() {
      if (this.showBack) {
        this.goBack()
      }
      this.$emit('left-click')
    },
    handleRightClick() {
      this.$emit('right-click')
    },
    handleRightButtonClick() {
      this.$emit('right-button-click')
    },
    goBack() {
      uni.navigateBack({
        delta: 1
      })
    }
  }
}
</script>

<style scoped>
.custom-navbar {
  background-color: v-bind(backgroundColor);
  border-bottom: v-bind(showBorder ? '2rpx solid #E5E6EB' : 'none');
  z-index: 1000;
}

.custom-navbar.fixed {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  padding-top: var(--status-bar-height);
}

.navbar-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  height: 88rpx;
}

.navbar-left {
  display: flex;
  align-items: center;
  min-width: 80rpx;
  justify-content: flex-start;
}

.navbar-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.title-text {
  font-size: 36rpx;
  font-weight: bold;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar-right {
  display: flex;
  align-items: center;
  min-width: 80rpx;
  justify-content: flex-end;
}

.right-text {
  font-size: 28rpx;
  font-weight: 500;
}

/* 为使用固定导航栏的页面提供顶部间距 */
.navbar-placeholder {
  height: calc(var(--status-bar-height) + 136rpx);
}
</style>