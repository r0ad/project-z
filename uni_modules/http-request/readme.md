# HTTP请求工具插件 v3.0

基于事件驱动架构实现真正异步非阻塞的流式HTTP请求工具，专为OpenAI等流式API设计。

## 功能特性

- 🚀 **异步非阻塞**：v3.0版本彻底解决线程阻塞问题，实现真正的并发处理
- ✅ **真实流式请求**：Android平台使用原生Java HttpURLConnection实现真正的流式数据接收
- ✅ **事件驱动架构**：基于发布订阅模式，零延迟数据传递
- ✅ **跨平台兼容**：自动处理Android/iOS/Web平台差异
- ✅ **SSE格式支持**：自动解析Server-Sent Events格式的流式数据
- ✅ **智能降级**：非Android环境自动降级为模拟流式请求
- ✅ **完整错误处理**：详细的错误信息和状态码反馈
- ✅ **性能监控**：实时性能统计和状态追踪

## 安装使用

将插件复制到项目的 `uni_modules` 目录下即可使用。

## API文档

### streamRequest(config, onData, onComplete, onError)

执行流式HTTP请求 (v3.0 异步非阻塞版本)

**参数：**
- `config` {Object} - 请求配置
  - `url` {String} - 请求URL
  - `method` {String} - 请求方法，默认'POST'
  - `headers` {Object} - 请求头
  - `data` {Object|String} - 请求数据
- `onData` {Function} - 数据回调 `(chunk) => {}`
- `onComplete` {Function} - 完成回调 `() => {}`
- `onError` {Function} - 错误回调 `(error) => {}`

**返回：**
- `Promise` - 请求Promise

**v3.0新特性：**
- 🚀 **零延迟**：数据到达后立即回调，无批量等待
- 🔄 **非阻塞**：Java线程启动后立即释放，不占用系统资源
- 📊 **并发支持**：支持多个同时请求，互不影响
- 📈 **性能监控**：实时统计处理性能和延迟

### httpRequest(config)

执行普通HTTP请求

**参数：**
- `config` {Object} - 请求配置

**返回：**
- `Promise` - 返回响应数据

### getStreamSupport()

检查流式请求支持情况

**返回：**
- `Object` - 支持情况信息
  - `supported` {Boolean} - 是否支持流式请求
  - `native` {Boolean} - 是否使用原生实现
  - `platform` {String} - 平台名称
  - `method` {String} - 实现方法

## 使用示例

```javascript
import { streamRequest, httpRequest, getStreamSupport } from '@/uni_modules/http-request/js_sdk/index.js'

// 检查支持情况
const support = getStreamSupport()
console.log('流式请求支持:', support)

// 🚀 v3.0 异步非阻塞流式请求示例
streamRequest({
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your-api-key'
  },
  data: {
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: '你好' }],
    stream: true
  }
}, 
// onData: 零延迟数据回调
(chunk) => {
  console.log('实时收到数据:', chunk)
  // 立即更新UI显示，无延迟
},
// onComplete: 请求完成
() => {
  console.log('流式请求完成')
},
// onError: 请求错误
(error) => {
  console.error('请求失败:', error)
})

// 💡 并发请求示例（v3.0新特性）
const request1 = streamRequest(config1, onData1, onComplete1, onError1)
const request2 = streamRequest(config2, onData2, onComplete2, onError2)
// 两个请求可以同时进行，互不阻塞

// 普通请求示例
httpRequest({
  url: 'https://api.example.com/data',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer token'
  }
}).then(data => {
  console.log('响应数据:', data)
}).catch(error => {
  console.error('请求失败:', error)
})
```

## 平台差异说明

### Android平台 (v3.0)
- 🚀 **异步非阻塞**：使用 `AsyncStreamReader` 实现真正的异步处理
- ✅ **真实流式请求**：基于原生Java `HttpURLConnection` 实现
- ✅ **SSE格式支持**：自动解析Server-Sent Events格式数据
- ✅ **线程隔离**：Java线程启动后立即释放，不占用系统资源
- ✅ **并发支持**：支持多个同时请求，互不阻塞
- ✅ **性能监控**：实时统计处理性能和延迟

### iOS平台
- 当前版本暂时使用模拟流式请求
- 未来版本将支持原生Objective-C/Swift实现

### Web/小程序平台
- 自动降级为uni.request模拟流式请求
- 保持API一致性，确保代码兼容

## 注意事项

1. **权限要求**：Android平台需要网络权限，但不需要额外的存储权限
2. **线程安全**：v3.0版本完全异步非阻塞，Java线程启动后立即释放
3. **并发处理**：支持多个同时请求，每个请求独立处理，互不阻塞
4. **超时设置**：连接超时30秒，读取超时60秒，适合长连接流式请求
5. **错误处理**：建议在onError回调中进行错误处理和用户提示
6. **性能监控**：可通过EventBus监控请求状态和性能指标

## 更新日志

### v3.0.0 🚀 **重大更新**
- ✨ **异步非阻塞架构**：彻底解决线程阻塞问题
- ✨ **事件驱动设计**：基于EventBus实现零延迟数据传递
- ✨ **并发支持**：支持多个同时请求，互不阻塞
- ✨ **性能监控**：实时统计处理性能和延迟
- ✨ **智能资源管理**：自动检测流结束，智能资源清理
- ✨ **错误恢复机制**：增强的错误处理和恢复能力

### v2.0.0
- ✨ **事件驱动架构**：基于发布订阅模式
- ✨ **批量数据传递**：减少主线程切换频率
- ✨ **性能优化**：提升数据传递实时性

### v1.0.0
- ✨ 初始版本发布
- ✨ 支持Android原生流式请求
- ✨ 支持跨平台兼容
- ✨ 支持SSE格式数据解析
