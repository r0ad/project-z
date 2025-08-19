# 供应商

// 支持的LLM提供商
const LLMProviders = {
  OPENAI: 'openai',
  DEEPSEEK: 'deepseek',
  SILICONFLOW: 'siliconflow',
  CUSTOM: 'custom',
};

// 提供商列表
const providers = [
  { id: LLMProviders.DEEPSEEK, name: 'DeepSeek' },
  { id: LLMProviders.SILICONFLOW, name: '硅基流动' },
  { id: LLMProviders.OPENAI, name: 'OpenAI' },
  { id: LLMProviders.CUSTOM, name: '自定义兼容端点' },
];

/**

* 各提供商的基础 URL
 */
const baseUrls = {
  [LLMProviders.OPENAI]: '<https://api.openai.com/v1>',
  [LLMProviders.ANTHROPIC]: '<https://api.anthropic.com/v1>',
  [LLMProviders.DEEPSEEK]: '<https://api.deepseek.com/v1>',
  [LLMProviders.SILICONFLOW]: '<https://api.siliconflow.cn/v1>',
  [LLMProviders.CUSTOM]: '', // 自定义提供商需要用户指定
};

// 默认模型配置
const defaultModels = {
  
  [LLMProviders.DEEPSEEK]: [
    { id: 'deepseek-chat', name: 'DeepSeek Chat' },
    { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner' },
  ],
  [LLMProviders.SILICONFLOW]: [
    { id: 'deepseek-ai/DeepSeek-R1', name: 'DeepSeek-R1' },
    { id: 'deepseek-ai/DeepSeek-V3', name: 'DeepSeek V3' },
    { id: 'Qwen/Qwen3-8B', name: 'Qwen 3 8B' },
    { id: 'Qwen/Qwen3-14B', name: 'Qwen 3 14B' },
    { id: 'Qwen/Qwen3-32B', name: 'Qwen 3 32B' },
  ],
  [LLMProviders.CUSTOM]: [{ id: 'custom-model', name: '自定义模型' }],
  [LLMProviders.OPENAI]: [
    { id: 'gpt-5-2025-08-07', name: 'GPT-5' },
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini' },
    { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano' }
  ],
};

## kimi

<https://api.moonshot.cn/v1>
kimi-k2-0711-preview

## 阿里云qwen3

<https://dashscope.aliyuncs.com/compatible-mode/v1>
qwen-turbo-latest
qwen-plus-latest
