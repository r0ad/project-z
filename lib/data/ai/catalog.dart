/// 2026-11 主流 OpenAI 兼容供应商目录。
/// 只做「预填」用途，用户仍可改 baseUrl / model，因此新增供应商无需改代码。
class ProviderPreset {
  const ProviderPreset({
    required this.key,
    required this.label,
    required this.baseUrl,
    required this.models,
    this.defaultModel,
    this.docsUrl,
  });

  final String key;
  final String label;
  final String baseUrl;
  final List<String> models;
  final String? defaultModel;
  final String? docsUrl;

  String get effectiveModel =>
      defaultModel ?? (models.isEmpty ? '' : models.first);
}

const providerPresets = <ProviderPreset>[
  ProviderPreset(
    key: 'deepseek',
    label: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    models: ['deepseek-v4-pro', 'deepseek-flash'],
    docsUrl: 'https://platform.deepseek.com',
  ),
  ProviderPreset(
    key: 'openai',
    label: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-6.2-astra', 'gpt-6.2-sol', 'gpt-6.1-terra', 'gpt-6-luna'],
    docsUrl: 'https://platform.openai.com',
  ),
  ProviderPreset(
    key: 'kimi',
    label: 'Kimi / 月之暗面',
    baseUrl: 'https://api.moonshot.cn/v1',
    models: ['kimi-k3.1-pro', 'kimi-k3.1-pro-highspeed'],
    docsUrl: 'https://platform.moonshot.cn',
  ),
  ProviderPreset(
    key: 'qwen',
    label: '通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    models: ['qwen4-max', 'qwen3.7-plus', 'qwen3.8-flash'],
    docsUrl: 'https://dashscope.aliyun.com',
  ),
  ProviderPreset(
    key: 'siliconflow',
    label: '硅基流动',
    baseUrl: 'https://api.siliconflow.com/v1',
    models: ['deepseek-ai/DeepSeek-V4.1-Flash', 'zai-org/GLM-5.3'],
    docsUrl: 'https://siliconflow.cn',
  ),
  ProviderPreset(
    key: 'zhipu',
    label: '智谱 GLM',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    models: ['glm-5.3', 'glm-5.3-flash'],
    docsUrl: 'https://open.bigmodel.cn',
  ),
  ProviderPreset(
    key: 'minimax',
    label: 'MiniMax',
    baseUrl: 'https://api.minimax.cn/v1',
    models: ['MiniMax-M3.1-Flash'],
    docsUrl: 'https://platform.minimaxi.com',
  ),
  ProviderPreset(
    key: 'openrouter',
    label: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: [
      'openai/gpt-6.2-astra',
      'anthropic/claude-sonnet-5',
      'google/gemini-4-pro',
    ],
    docsUrl: 'https://openrouter.ai',
  ),
  ProviderPreset(key: 'custom', label: '自定义兼容接口', baseUrl: '', models: []),
];

ProviderPreset presetFor(String key) {
  for (final preset in providerPresets) {
    if (preset.key == key) return preset;
  }
  return providerPresets.last;
}
