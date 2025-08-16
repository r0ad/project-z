# OpenAI Chat - uni-app 插件

一个功能完整的 OpenAI 聊天组件，支持流式响应、历史对话管理、函数调用等高级功能。

## 功能特性

- 🚀 **开箱即用** - 无需复杂配置，导入即可使用
- 💬 **智能对话** - 支持流式和非流式响应模式
- 📚 **历史管理** - 自动保存和管理对话历史
- 🔧 **函数调用** - 支持 OpenAI Function Calling
- 🎨 **美观界面** - 现代化的聊天界面设计
- 📱 **跨平台** - 支持 H5、小程序、App 等多端
- ⚙️ **灵活配置** - 支持自定义 API 地址、模型等

## 安装使用

### 1. 插件导入

在 uni-app 项目中导入本插件，或直接在插件市场安装。

### 2. 基础使用

```vue
<template>
  <view>
    <openai-chat 
      title="AI助手"
      :initial-config="config"
      system-prompt="你是一个智能助手"
      @message="onMessage"
      @config-updated="onConfigUpdated"
    />
  </view>
</template>

<script>
export default {
  data() {
    return {
      config: {
        baseUrl: 'https://api.deepseek.com/v1',
        apiKey: 'your-api-key',
        model: 'deepseek-chat'
      }
    }
  },
  methods: {
    onMessage(message) {
      console.log('新消息:', message)
    },
    onConfigUpdated(config) {
      console.log('配置更新:', config)
    }
  }
}
</script>
```

### 3. 高级使用

```vue
<template>
  <view>
    <openai-chat 
      ref="chatRef"
      title="智能客服"
      :initial-config="config"
      system-prompt="你是一个专业的客服助手"
      :enable-history="true"
      :max-messages="50"
      @conversation-created="onConversationCreated"
    />
  </view>
</template>

<script>
export default {
  data() {
    return {
      config: {
        baseUrl: 'https://api.openai.com/v1',
        apiKey: 'sk-xxx',
        model: 'gpt-3.5-turbo',
        timeout: 30000
      }
    }
  },
  mounted() {
    // 注册自定义函数
    this.registerCustomFunctions()
  },
  methods: {
    registerCustomFunctions() {
      const chatAPI = this.$refs.chatRef.getAPI()
      
      // 注册天气查询函数
      chatAPI.registerFunction(
        'getWeather',
        '查询指定城市的天气信息',
        {
          type: 'object',
          properties: {
            city: {
              type: 'string',
              description: '城市名称'
            }
          },
          required: ['city']
        },
        async (args) => {
          // 这里调用实际的天气API
          return {
            city: args.city,
            weather: '晴天',
            temperature: '25°C'
          }
        }
      )
    },
    
    onConversationCreated(conversationId) {
      console.log('新对话创建:', conversationId)
    }
  }
}
</script>
```

## 组件属性

| 属性名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| title | String | 'AI助手' | 聊天窗口标题 |
| initialConfig | Object | {} | 初始配置对象 |
| systemPrompt | String | '你是一个智能助手...' | 系统提示词 |
| showConfigPanel | Boolean | true | 是否显示配置面板 |
| enableHistory | Boolean | true | 是否启用历史对话 |
| maxMessages | Number | 100 | 最大消息显示数量 |

## 配置对象

```javascript
{
  baseUrl: 'https://api.deepseek.com/v1',  // API 基础地址
  apiKey: '',                              // API 密钥
  model: 'deepseek-chat',                  // 模型名称
  timeout: 30000                           // 请求超时时间(ms)
}
```

## 组件事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| message | message | 新消息时触发 |
| config-updated | config | 配置更新时触发 |
| conversation-created | conversationId | 新对话创建时触发 |
| conversation-cleared | conversationId | 对话清空时触发 |

## 组件方法

### registerFunction(name, description, parameters, handler)

注册自定义函数供 AI 调用。

**参数：**
- `name` (String): 函数名称
- `description` (String): 函数描述
- `parameters` (Object): 参数定义（JSON Schema 格式）
- `handler` (Function): 函数处理器

**示例：**
```javascript
this.$refs.chatRef.registerFunction(
  'getCurrentTime',
  '获取当前时间',
  {
    type: 'object',
    properties: {
      format: {
        type: 'string',
        enum: ['datetime', 'date', 'time']
      }
    }
  },
  (args) => {
    return new Date().toLocaleString('zh-CN')
  }
)
```

### getAPI()

获取 OpenAI API 实例，可用于更高级的操作。

**返回：** OpenAIAPI 实例

## API 类使用

如果需要在组件外单独使用 API 类：

```javascript
import OpenAIAPI from '@/uni_modules/openai-chat/js_sdk/openai-api.js'

const api = new OpenAIAPI({
  baseUrl: 'https://api.deepseek.com/v1',
  apiKey: 'your-api-key',
  model: 'deepseek-chat'
})

// 基础聊天
const result = await api.chatCompletion([
  { role: 'user', content: '你好' }
])

// 流式聊天
api.chatCompletionStream(
  [{ role: 'user', content: '你好' }],
  (chunk) => console.log(chunk),
  (result) => console.log('完成:', result),
  (error) => console.error('错误:', error)
)

// 历史对话管理
const conversationId = api.createConversation()
api.addMessageToHistory('user', '你好')
const history = api.getConversationHistory()

// 函数调用
api.registerFunction('test', '测试函数', {}, () => 'Hello')
```

## 支持的 API 功能

- ✅ 聊天完成（Chat Completion）
- ✅ 流式响应（Streaming）
- ✅ 函数调用（Function Calling）
- ✅ 历史对话管理
- ✅ 图像生成（Image Generation）
- ✅ 文本嵌入（Text Embedding）
- ✅ 语音转文字（Speech to Text）
- ✅ 对话导入导出
- ✅ Token 估算

## 兼容性

| 平台 | 支持状态 |
|------|----------|
| H5 | ✅ |
| 微信小程序 | ✅ |
| 支付宝小程序 | ✅ |
| 百度小程序 | ✅ |
| 字节小程序 | ✅ |
| QQ小程序 | ✅ |
| 快手小程序 | ✅ |
| 京东小程序 | ✅ |
| App (Android) | ✅ |
| App (iOS) | ✅ |

## 常见问题

### Q: 如何配置不同的 API 提供商？

A: 修改 `baseUrl` 和 `model` 即可：

```javascript
// DeepSeek
{
  baseUrl: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat'
}

// OpenAI
{
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-3.5-turbo'
}

// 其他兼容 OpenAI 格式的服务
{
  baseUrl: 'https://your-api.com/v1',
  model: 'your-model'
}
```

### Q: 如何处理网络错误？

A: 组件会自动显示错误信息，你也可以监听相关事件：

```javascript
// 在组件的 methods 中
onError(error) {
  console.error('聊天错误:', error)
  // 自定义错误处理
}
```

### Q: 如何自定义样式？

A: 可以通过 CSS 覆盖组件样式：

```css
/* 修改主题色 */
.openai-chat .send-btn {
  background: #ff6b6b !important;
}

/* 修改消息气泡 */
.openai-chat .message-item.user .message-content {
  background: #4ecdc4 !important;
}
```

## 更新日志

### v1.0.0
- 🎉 首次发布
- ✨ 支持基础聊天功能
- ✨ 支持流式响应
- ✨ 支持历史对话管理
- ✨ 支持函数调用
- ✨ 支持多种 API 提供商

## 许可证

MIT License

## 技术支持

如有问题或建议，请在插件市场留言或提交 Issue。