// AI供应商配置

// 支持的LLM提供商
export const LLMProviders = {
  OPENAI: 'openai',
  DEEPSEEK: 'deepseek',
  SILICONFLOW: 'siliconflow',
  KIMI: 'kimi',
  QWEN: 'qwen',
  CUSTOM: 'custom',
};

// 提供商列表
export const providers = [
  { id: LLMProviders.DEEPSEEK, name: 'DeepSeek' },
  { id: LLMProviders.SILICONFLOW, name: '硅基流动' },
  { id: LLMProviders.OPENAI, name: 'OpenAI' },
  { id: LLMProviders.KIMI, name: 'Kimi' },
  { id: LLMProviders.QWEN, name: '阿里云通义千问' },
  { id: LLMProviders.CUSTOM, name: '自定义兼容端点' },
];

// 各提供商的基础 URL
export const baseUrls = {
  [LLMProviders.OPENAI]: 'https://api.openai.com/v1',
  [LLMProviders.DEEPSEEK]: 'https://api.deepseek.com/v1',
  [LLMProviders.SILICONFLOW]: 'https://api.siliconflow.cn/v1',
  [LLMProviders.KIMI]: 'https://api.moonshot.cn/v1',
  [LLMProviders.QWEN]: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
  [LLMProviders.CUSTOM]: '', // 自定义提供商需要用户指定
};

// 默认模型配置
export const defaultModels = {
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
  [LLMProviders.OPENAI]: [
    { id: 'gpt-5-2025-08-07', name: 'GPT-5' },
    { id: 'gpt-5-mini-2025-08-07', name: 'GPT-5 Mini' },
    { id: 'gpt-5-nano-2025-08-07', name: 'GPT-5 Nano' }
  ],
  [LLMProviders.KIMI]: [
    { id: 'kimi-k2-0711-preview', name: 'Kimi K2' },
  ],
  [LLMProviders.QWEN]: [
    { id: 'qwen-turbo-latest', name: 'Qwen Turbo' },
    { id: 'qwen-plus-latest', name: 'Qwen Plus' },
  ],
  [LLMProviders.CUSTOM]: [
    { id: 'custom-model', name: '自定义模型' }
  ],
};

// 默认配置参数
export const defaultConfigs = {
  [LLMProviders.DEEPSEEK]: {
    timeout: 130,
    max_tokens: 8000,
    temperature: 0.7,
  },
  [LLMProviders.SILICONFLOW]: {
    timeout: 60,
    max_tokens: 4000,
    temperature: 0.7,
  },
  [LLMProviders.OPENAI]: {
    timeout: 60,
    max_tokens: 4000,
    temperature: 0.7,
  },
  [LLMProviders.KIMI]: {
    timeout: 60,
    max_tokens: 4000,
    temperature: 0.7,
  },
  [LLMProviders.QWEN]: {
    timeout: 60,
    max_tokens: 4000,
    temperature: 0.7,
  },
  [LLMProviders.CUSTOM]: {
    timeout: 30,
    max_tokens: 2000,
    temperature: 0.7,
  },
};

// 获取提供商信息
export function getProviderInfo(providerId) {
  return providers.find(p => p.id === providerId);
}

// 获取提供商的默认配置
export function getProviderDefaultConfig(providerId) {
  return {
    base_url: baseUrls[providerId] || '',
    ...defaultConfigs[providerId],
  };
}

// 获取提供商的模型列表
export function getProviderModels(providerId) {
  return defaultModels[providerId] || [];
}

// 检查是否为自定义提供商
export function isCustomProvider(providerId) {
  return providerId === LLMProviders.CUSTOM;
}