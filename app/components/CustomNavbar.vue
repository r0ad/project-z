<template>
  <view class="custom-navbar" :class="{ fixed: fixed }" :style="{ backgroundColor: backgroundColor }">
    <view class="navbar-content">
      <!-- 左侧内容插槽 -->
      <view class="navbar-left">
        <slot name="left">
          <!-- 默认返回按钮 -->
          <nut-icon 
            v-if="showBack" 
            name="left" 
            size="20" 
            :color="leftIconColor"
            @click="handleLeftClick"
          ></nut-icon>
        </slot>
      </view>
      
      <!-- 中间标题插槽 -->
      <view class="navbar-center">
        <slot name="center">
          <text v-if="title" class="navbar-title" :style="{ color: titleColor }">{{ title }}</text>
        </slot>
      </view>
      
      <!-- 右侧内容插槽 -->
      <view class="navbar-right">
        <slot name="right">
          <!-- 兼容旧版本的属性配置 -->
          <nut-icon 
            v-if="rightIcon" 
            :name="rightIcon" 
            size="20" 
            :color="rightIconColor"
            @click="handleRightClick"
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
        </slot>
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
  position: relative;
}

.navbar-left {
  display: flex;
  align-items: center;
  min-width: 80rpx;
  justify-content: flex-start;
  z-index: 2;
}

.navbar-center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  max-width: 60%;
  z-index: 1;
}

.navbar-title {
  font-size: 36rpx;
  font-weight: bold;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar-right {
  display: flex;
  align-items: center;
  min-width: 80rpx;
  justify-content: flex-end;
  z-index: 2;
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