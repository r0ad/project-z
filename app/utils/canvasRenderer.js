// Canvas渲染引擎 - 用于将卡片内容渲染为图片
import { getThemeConfig } from './shareCardThemes.js'

export class CanvasRenderer {
  constructor(canvasId, theme = 'simple') {
    this.canvasId = canvasId
    this.theme = getThemeConfig(theme)
    this.canvas = null
    this.ctx = null
    this.pixelRatio = 2 // 提高清晰度
    this.baseWidth = 375
    this.baseHeight = 500
  }

  /**
   * 初始化Canvas
   */
  async init() {
    return new Promise((resolve, reject) => {
      try {
        // 使用uni-app的Canvas 2D API
        const query = uni.createSelectorQuery()
        query.select(`#${this.canvasId}`)
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res[0] && res[0].node) {
              this.canvas = res[0].node
              this.ctx = this.canvas.getContext('2d')
              
              // 设置Canvas大小和像素比
              const dpr = uni.getSystemInfoSync().pixelRatio || 1
              this.canvas.width = this.baseWidth * dpr
              this.canvas.height = this.baseHeight * dpr
              this.ctx.scale(dpr, dpr)
              
              resolve()
            } else {
              // 降级到传统Canvas API
              this.ctx = uni.createCanvasContext(this.canvasId)
              if (this.ctx) {
                resolve()
              } else {
                reject(new Error('Failed to create canvas context'))
              }
            }
          })
      } catch (error) {
        // 降级到传统Canvas API
        try {
          this.ctx = uni.createCanvasContext(this.canvasId)
          if (this.ctx) {
            resolve()
          } else {
            reject(new Error('Failed to create canvas context'))
          }
        } catch (fallbackError) {
          reject(new Error('Canvas not supported: ' + fallbackError.message))
        }
      }
    })
  }

  /**
   * 计算内容高度
   */
  calculateContentHeight(content) {
    let height = this.theme.layout.padding * 2 // 上下padding
    
    // 标题高度
    height += this.theme.fonts.title.lineHeight
    
    // 标签高度
    if (content.tags && content.tags.length > 0) {
      height += 40 + this.theme.layout.spacing // 标签区域高度
    }
    
    // 内容高度
    const contentLines = this.calculateTextLines(content.content, this.baseWidth - this.theme.layout.padding * 2, this.theme.fonts.body.size)
    height += contentLines * this.theme.fonts.body.lineHeight + this.theme.layout.spacing
    
    // 进度条高度
    if (content.progress !== undefined) {
      height += 50 + this.theme.layout.spacing
    }
    
    // 里程碑高度
    if (content.milestones && content.milestones.length > 0) {
      height += Math.min(content.milestones.length, 3) * 40 + this.theme.layout.spacing
    }
    
    // 底部信息高度
    height += 60
    
    return Math.max(height, this.baseHeight)
  }

  /**
   * 渲染卡片
   */
  async renderCard(content) {
    // 计算实际高度
    const actualHeight = this.calculateContentHeight(content)
    
    // 重新设置画布高度（仅限Canvas 2D API）
    if (this.canvas && this.canvas.height !== undefined) {
      this.canvas.height = actualHeight * this.pixelRatio
      this.ctx.scale(this.pixelRatio, this.pixelRatio)
    }
    
    // 清空画布
    this.clearCanvas(actualHeight)
    
    // 渲染背景
    this.renderBackground(actualHeight)
    
    // 渲染内容
    let currentY = this.theme.layout.padding
    currentY = this.renderTitle(content.title, currentY)
    
    if (content.tags && content.tags.length > 0) {
      currentY = this.renderTags(content.tags, currentY)
    }
    
    currentY = this.renderContent(content.content, currentY)
    
    if (content.progress !== undefined) {
      currentY = this.renderProgress(content.progress, currentY)
    }
    
    if (content.milestones && content.milestones.length > 0) {
      currentY = this.renderMilestones(content.milestones, currentY)
    }
    
    // 渲染底部信息
    this.renderFooter(content, actualHeight - this.theme.layout.padding - 30)
    
    // 如果是传统Canvas API，需要调用draw方法
    if (this.ctx.draw) {
      this.ctx.draw(false, () => {
        // 导出图片
        this.exportImage()
      })
    }
    
    // 导出图片
    return this.exportImage()
  }

  /**
   * 清空画布
   */
  clearCanvas(height) {
    if (this.ctx.clearRect) {
      // Canvas 2D API
      this.ctx.clearRect(0, 0, this.baseWidth, height)
    } else {
      // 传统Canvas API - 使用白色填充
      this.ctx.setFillStyle('#FFFFFF')
      this.ctx.fillRect(0, 0, this.baseWidth, height)
    }
  }

  /**
   * 渲染背景
   */
  renderBackground(height) {
    if (this.theme.gradients && this.theme.gradients.length > 0) {
      // 渐变背景
      const gradient = this.ctx.createLinearGradient(0, 0, 0, height)
      this.theme.gradients.forEach((color, index) => {
        gradient.addColorStop(index / (this.theme.gradients.length - 1), color)
      })
      this.ctx.fillStyle = gradient
    } else {
      // 纯色背景
      this.ctx.fillStyle = this.theme.colors.background
    }
    
    // 绘制圆角矩形背景
    this.roundRect(0, 0, this.baseWidth, height, this.theme.layout.borderRadius)
    this.ctx.fill()
  }

  /**
   * 渲染标题
   */
  renderTitle(title, startY) {
    this.ctx.font = `${this.theme.fonts.title.weight} ${this.theme.fonts.title.size}px ${this.theme.fonts.title.family}`
    this.ctx.fillStyle = this.theme.colors.title
    this.ctx.textAlign = 'center'
    
    // 处理长标题换行
    const lines = this.wrapText(title, this.baseWidth - this.theme.layout.padding * 2, this.theme.fonts.title.size)
    lines.forEach((line, index) => {
      this.ctx.fillText(line, this.baseWidth / 2, startY + (index * this.theme.fonts.title.lineHeight))
    })
    
    return startY + (lines.length * this.theme.fonts.title.lineHeight) + this.theme.layout.spacing
  }

  /**
   * 渲染标签
   */
  renderTags(tags, startY) {
    const tagHeight = 28
    const tagSpacing = 8
    const tagPadding = 12
    
    let currentX = this.theme.layout.padding
    let currentY = startY
    
    this.ctx.font = `${this.theme.fonts.meta.weight} ${this.theme.fonts.meta.size}px ${this.theme.fonts.meta.family}`
    
    tags.slice(0, 5).forEach(tag => {
      const tagWidth = this.ctx.measureText(tag).width + tagPadding * 2
      
      // 换行检查
      if (currentX + tagWidth > this.baseWidth - this.theme.layout.padding) {
        currentX = this.theme.layout.padding
        currentY += tagHeight + tagSpacing
      }
      
      // 绘制标签背景
      this.ctx.fillStyle = this.theme.colors.tagBackground
      this.roundRect(currentX, currentY, tagWidth, tagHeight, 14)
      this.ctx.fill()
      
      // 绘制标签文字
      this.ctx.fillStyle = this.theme.colors.tagText
      this.ctx.textAlign = 'left'
      this.ctx.fillText(tag, currentX + tagPadding, currentY + 19)
      
      currentX += tagWidth + tagSpacing
    })
    
    return currentY + tagHeight + this.theme.layout.spacing
  }

  /**
   * 渲染内容
   */
  renderContent(content, startY) {
    this.ctx.font = `${this.theme.fonts.body.weight} ${this.theme.fonts.body.size}px ${this.theme.fonts.body.family}`
    this.ctx.fillStyle = this.theme.colors.body
    this.ctx.textAlign = 'left'
    
    const lines = this.wrapText(content, this.baseWidth - this.theme.layout.padding * 2, this.theme.fonts.body.size)
    const maxLines = 8 // 最大显示行数
    
    lines.slice(0, maxLines).forEach((line, index) => {
      this.ctx.fillText(line, this.theme.layout.padding, startY + (index * this.theme.fonts.body.lineHeight))
    })
    
    // 如果内容被截断，添加省略号
    if (lines.length > maxLines) {
      const lastY = startY + ((maxLines - 1) * this.theme.fonts.body.lineHeight)
      this.ctx.fillText('...', this.theme.layout.padding, lastY)
    }
    
    return startY + (Math.min(lines.length, maxLines) * this.theme.fonts.body.lineHeight) + this.theme.layout.spacing
  }

  /**
   * 渲染进度条
   */
  renderProgress(progress, startY) {
    const progressWidth = this.baseWidth - this.theme.layout.padding * 2
    const progressHeight = 6
    const progressX = this.theme.layout.padding
    
    // 进度条背景
    this.ctx.fillStyle = this.theme.colors.progressBackground
    this.roundRect(progressX, startY, progressWidth, progressHeight, 3)
    this.ctx.fill()
    
    // 进度条填充
    this.ctx.fillStyle = this.theme.colors.progress
    this.roundRect(progressX, startY, progressWidth * (progress / 100), progressHeight, 3)
    this.ctx.fill()
    
    // 进度文字
    this.ctx.font = `${this.theme.fonts.meta.weight} ${this.theme.fonts.meta.size}px ${this.theme.fonts.meta.family}`
    this.ctx.fillStyle = this.theme.colors.meta
    this.ctx.textAlign = 'right'
    this.ctx.fillText(`${progress}%`, this.baseWidth - this.theme.layout.padding, startY + 25)
    
    return startY + 40
  }

  /**
   * 渲染里程碑
   */
  renderMilestones(milestones, startY) {
    this.ctx.font = `${this.theme.fonts.body.weight} ${this.theme.fonts.body.size}px ${this.theme.fonts.body.family}`
    
    milestones.slice(0, 3).forEach((milestone, index) => {
      const y = startY + (index * 35)
      
      // 状态指示器
      this.ctx.fillStyle = milestone.status === 'completed' ? this.theme.colors.accent : this.theme.colors.progressBackground
      this.ctx.beginPath()
      this.ctx.arc(this.theme.layout.padding + 8, y + 8, 4, 0, 2 * Math.PI)
      this.ctx.fill()
      
      // 里程碑标题
      this.ctx.fillStyle = this.theme.colors.body
      this.ctx.textAlign = 'left'
      this.ctx.fillText(milestone.title, this.theme.layout.padding + 24, y + 12)
    })
    
    return startY + (Math.min(milestones.length, 3) * 35) + this.theme.layout.spacing
  }

  /**
   * 渲染底部信息
   */
  renderFooter(content, startY) {
    this.ctx.font = `${this.theme.fonts.meta.weight} ${this.theme.fonts.meta.size}px ${this.theme.fonts.meta.family}`
    this.ctx.fillStyle = this.theme.colors.meta
    
    // 时间信息
    this.ctx.textAlign = 'left'
    this.ctx.fillText(content.timestamp || '', this.theme.layout.padding, startY)
    
    // 品牌信息
    this.ctx.textAlign = 'right'
    this.ctx.fillText('Project-Z', this.baseWidth - this.theme.layout.padding, startY)
  }

  /**
   * 文字换行
   */
  wrapText(text, maxWidth, fontSize) {
    const words = text.split('')
    const lines = []
    let currentLine = ''
    
    this.ctx.font = `${fontSize}px ${this.theme.fonts.body.family}`
    
    words.forEach(char => {
      const testLine = currentLine + char
      const metrics = this.ctx.measureText(testLine)
      
      if (metrics.width > maxWidth && currentLine !== '') {
        lines.push(currentLine)
        currentLine = char
      } else {
        currentLine = testLine
      }
    })
    
    if (currentLine) {
      lines.push(currentLine)
    }
    
    return lines
  }

  /**
   * 计算文本行数
   */
  calculateTextLines(text, maxWidth, fontSize) {
    return this.wrapText(text, maxWidth, fontSize).length
  }

  /**
   * 绘制圆角矩形
   */
  roundRect(x, y, width, height, radius) {
    this.ctx.beginPath()
    this.ctx.moveTo(x + radius, y)
    this.ctx.lineTo(x + width - radius, y)
    this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    this.ctx.lineTo(x + width, y + height - radius)
    this.ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    this.ctx.lineTo(x + radius, y + height)
    this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    this.ctx.lineTo(x, y + radius)
    this.ctx.quadraticCurveTo(x, y, x + radius, y)
    this.ctx.closePath()
  }

  /**
   * 导出图片
   */
  exportImage() {
    return new Promise((resolve) => {
      if (this.canvas && this.canvas.toDataURL) {
        // Canvas 2D API
        try {
          const dataURL = this.canvas.toDataURL('image/png')
          resolve(dataURL)
        } catch (error) {
          console.error('导出图片失败:', error)
          resolve(null)
        }
      } else {
        // 传统Canvas API
        uni.canvasToTempFilePath({
          canvasId: this.canvasId,
          success: (res) => {
            resolve(res.tempFilePath)
          },
          fail: (error) => {
            console.error('导出图片失败:', error)
            resolve(null)
          }
        })
      }
    })
  }
}

// 便捷函数
export async function renderCardToImage(canvasId, content, theme = 'simple') {
  const renderer = new CanvasRenderer(canvasId, theme)
  await renderer.init()
  return await renderer.renderCard(content)
}