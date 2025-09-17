// 分享卡片主题配置
export const shareCardThemes = {
  simple: {
    name: '简约',
    colors: {
      background: '#FFFFFF',
      title: '#1D2129',
      body: '#4E5969',
      meta: '#86909C',
      accent: '#165DFF',
      tagBackground: '#F2F3F5',
      tagText: '#86909C',
      progress: '#165DFF',
      progressBackground: '#F2F3F5',
      border: '#E5E6EB'
    },
    fonts: {
      title: {
        family: 'PingFang SC',
        size: 28,
        lineHeight: 40,
        weight: 'bold'
      },
      body: {
        family: 'PingFang SC',
        size: 16,
        lineHeight: 24,
        weight: 'normal'
      },
      meta: {
        family: 'PingFang SC',
        size: 14,
        lineHeight: 20,
        weight: 'normal'
      }
    },
    layout: {
      padding: 40,
      borderRadius: 16,
      spacing: 20
    }
  },
  
  gradient: {
    name: '渐变',
    colors: {
      background: '#FFFFFF',
      title: '#FFFFFF',
      body: '#FFFFFF',
      meta: 'rgba(255,255,255,0.8)',
      accent: '#FFFFFF',
      tagBackground: 'rgba(255,255,255,0.2)',
      tagText: '#FFFFFF',
      progress: '#FFFFFF',
      progressBackground: 'rgba(255,255,255,0.3)',
      border: 'rgba(255,255,255,0.2)'
    },
    gradients: ['#667eea', '#764ba2'],
    fonts: {
      title: {
        family: 'PingFang SC',
        size: 28,
        lineHeight: 40,
        weight: 'bold'
      },
      body: {
        family: 'PingFang SC',
        size: 16,
        lineHeight: 24,
        weight: 'normal'
      },
      meta: {
        family: 'PingFang SC',
        size: 14,
        lineHeight: 20,
        weight: 'normal'
      }
    },
    layout: {
      padding: 40,
      borderRadius: 16,
      spacing: 20
    }
  },
  
  minimal: {
    name: '极简',
    colors: {
      background: '#F8F9FA',
      title: '#2C3E50',
      body: '#5A6C7D',
      meta: '#95A5A6',
      accent: '#3498DB',
      tagBackground: '#ECF0F1',
      tagText: '#7F8C8D',
      progress: '#3498DB',
      progressBackground: '#ECF0F1',
      border: '#E8EAED'
    },
    fonts: {
      title: {
        family: 'SF Pro Display',
        size: 26,
        lineHeight: 36,
        weight: 'bold'
      },
      body: {
        family: 'SF Pro Text',
        size: 15,
        lineHeight: 22,
        weight: 'normal'
      },
      meta: {
        family: 'SF Pro Text',
        size: 13,
        lineHeight: 18,
        weight: 'normal'
      }
    },
    layout: {
      padding: 32,
      borderRadius: 12,
      spacing: 16
    }
  },
  
  tech: {
    name: '科技',
    colors: {
      background: '#0D1117',
      title: '#F0F6FC',
      body: '#C9D1D9',
      meta: '#8B949E',
      accent: '#58A6FF',
      tagBackground: '#21262D',
      tagText: '#F0F6FC',
      progress: '#58A6FF',
      progressBackground: '#21262D',
      border: '#30363D'
    },
    fonts: {
      title: {
        family: 'SF Mono',
        size: 24,
        lineHeight: 32,
        weight: 'bold'
      },
      body: {
        family: 'SF Mono',
        size: 14,
        lineHeight: 20,
        weight: 'normal'
      },
      meta: {
        family: 'SF Mono',
        size: 12,
        lineHeight: 16,
        weight: 'normal'
      }
    },
    layout: {
      padding: 32,
      borderRadius: 8,
      spacing: 16
    }
  }
}

// 默认主题
export const defaultTheme = 'simple'

// 获取主题配置
export function getThemeConfig(themeName = defaultTheme) {
  return shareCardThemes[themeName] || shareCardThemes[defaultTheme]
}

// 获取所有主题列表
export function getThemeList() {
  return Object.keys(shareCardThemes).map(key => ({
    key,
    name: shareCardThemes[key].name
  }))
}