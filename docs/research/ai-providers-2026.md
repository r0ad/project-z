# OpenAI 兼容 AI 供应商调研（截至 2026-11）

> 调研性质：只读资料核对，不改动任何代码或配置。
> 核对日期：**2026-11-19**（以各厂商官方文档、定价页当日展示为准）。
> 价格单位：除非另注，均为「每 100 万 tokens」；美元记 `$`，人民币记 `¥`。
> 说明：本文只记录官方文档能直接核对的信息；文档未展示或前后矛盾的项标 **TODO/未确认**，不要当作接入承诺。

---

## 0. 结论速览

| 供应商 | OpenAI 兼容 base_url | 旗舰模型 | 快速/低价模型 | 推理模型 | 单模型上下文 |
|---|---|---|---|---|---|
| OpenAI | `https://api.openai.com/v1` | `gpt-6.2-astra` | `gpt-6-luna` | `gpt-6.2-astra`（reasoning 档位） | 1.05M |
| DeepSeek | `https://api.deepseek.com` | `deepseek-v4-pro` | `deepseek-flash` | `deepseek-flash`（thinking）/`deepseek-v4-pro` | 1M |
| Moonshot / Kimi | `https://api.moonshot.cn/v1` | `kimi-k3.1-pro` | `kimi-k3.1-pro-highspeed`（无更低价档） | `kimi-k3.1-pro` | 1,048,576 |
| 阿里云百炼 Qwen | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen4-max` | `qwen3.8-flash` | `qwen4-max`（深度思考） | 1,000,000 |
| SiliconFlow | `https://api.siliconflow.com/v1` | `deepseek-ai/DeepSeek-V4.1-Flash` | `zai-org/GLM-5.3-Flash` | `zai-org/GLM-5.3` | 1,049K |
| 智谱 GLM（可选） | `https://open.bigmodel.cn/api/paas/v4` | `glm-5.3` | `glm-5.3-flash` | `glm-5.3`（始终思考） | 1M |
| MiniMax（可选） | `https://api.minimax.cn/v1` | `MiniMax-M3.1-Flash` | `MiniMax-M3.1-Flash` | `MiniMax-M3.1-Flash`（强制思考） | 1,000,000 |
| OpenRouter（可选） | `https://openrouter.ai/api/v1` | 聚合平台，无自有旗舰 | — | — | 随上游模型 |

---

## 1. OpenAI（api.openai.com）

- 官方文档：<https://developers.openai.com/api/docs/models>
- 定价页：<https://developers.openai.com/api/docs/pricing>
- 弃用公告：<https://developers.openai.com/api/docs/deprecations>
- OpenAI 兼容 base_url：`https://api.openai.com/v1`（OpenAI SDK 默认端点；官方 models 页未逐字展示，按 SDK 默认值填写）
- 鉴权：`Authorization: Bearer <API_KEY>`

### 1.1 2026-11 主推模型

| 模型 id | 定位 | 上下文 | 最大输出 | 输入价 | 输出价 | 缓存输入 | 能力/备注 |
|---|---|---|---|---|---|---|---|
| `gpt-6.2-astra` | 旗舰 | 1.05M | 128K | $8 | $40 | $0.40 | reasoning 档位 low/medium/high/xhigh/max；函数调用、Web/File search、Computer use；知识截止 2026-05-18 |
| `gpt-6.2-sol` | 均衡主力 | 1.05M | 128K | $2 | $10 | — | 函数调用、Web/File search；知识截止 2026-06-01 |
| `gpt-6.1-terra` | 轻量均衡 | 1.05M | 128K | $1 | $5 | — | reasoning none–max；函数调用 |
| `gpt-6-luna` | 最低成本 | 1.05M | 128K | $0.10 | $0.50 | — | 官方称“最高性价比”；函数调用 |

> 定价页另列出 `gpt-6-astra`（$10/$50）与 `gpt-6.1-sol`（$2/$10）；models 页与定价页个别条目存在差异，实际扣费以账单/定价页为准。`gpt-5.6-sol` 促销价截止 2026-11-30（TODO：具体价格未核）。

### 1.2 能力

- 流式：支持（SSE，`stream: true`）。
- Function calling / tools：支持（Functions，另含 Web search、File search、Computer use 等内置工具）。
- 结构化输出：支持 JSON Schema / `response_format`（OpenAI 标准能力；models 页 Tools 列可见 Functions，结构化输出未逐模型逐行标注，按平台通用能力处理）。
- 多模态：文本 + 图像输入。

### 1.3 弃用与别名

| 旧模型 | 状态 | 关停日期 | 建议替代 |
|---|---|---|---|
| `gpt-5` / `gpt-5-mini` / `gpt-5-nano` / `gpt-5-pro` | 弃用 | 2026-12-11 | `gpt-6.1-sol` / `gpt-6.1-terra` / `gpt-6-luna` |
| `o3` / `o3-pro` | 弃用 | 2026-12-11 | `gpt-6.1-sol` / `gpt-6.1-terra` |
| `gpt-4o` / `gpt-4o-mini` / `gpt-4.1` / `gpt-4.1-mini` | 弃用 | 2027-01-14 | `gpt-6-luna` |
| `gpt-5.1` | 弃用 | 2027-04-01 | `gpt-6-sol` |
| `gpt-5.2` / `gpt-5.4` / `gpt-5.4-mini` 的 EU data residency、fast/priority | 弃用 | 2027-01-11 | 改用标准区域/标准层级 |

> 旧模型在关停前仍可调用，但不再是新接入推荐；未发现 `gpt-4o` 等旧名自动指向新模型的官方说明（即“别名指向”未确认）。

---

## 2. DeepSeek（api.deepseek.com）

- 官方文档：<https://api-docs.deepseek.com/>
- 定价页：<https://api-docs.deepseek.com/quick_start/pricing/>
- OpenAI 兼容 base_url：`https://api.deepseek.com`（官方示例不带 `/v1`；Anthropic 兼容：`https://api.deepseek.com/anthropic`）
- 鉴权：`Authorization: Bearer <API_KEY>`

### 2.1 2026-11 主推模型

| 模型 id | 实际版本 | 定位 | 上下文 | 最大输出 | 能力 |
|---|---|---|---|---|---|
| `deepseek-flash` | DeepSeek-V4.1-Flash-1017 | 快速/低价，默认主力 | 1M | 384K | JSON ✓、Tool Calls ✓、Responses API ✓、Anthropic API ✓、Chat Prefix Completion Beta ✓、Vision ✓、FIM（仅非思考）✓ |
| `deepseek-v4-pro` | DeepSeek-V4-Pro-0813 | 高能力旗舰 | 1M | 384K | JSON ✓、Tool Calls ✓、Responses API ✓、Anthropic API ✓；Vision ✗ |

- 思考模式：请求体 `thinking: { "type": "enabled" }`；`reasoning_effort` 支持 `low` / `high` / `max`。`deepseek-flash` 同时支持非思考与思考模式。
- 并发：`deepseek-flash` 2500，`deepseek-v4-pro` 500（官方 pricing 页标注）。
- 流式：支持（`stream: true`，OpenAI SSE 格式）。

### 2.2 价格（USD / 百万 tokens）

| 模型 | 缓存命中（off-peak / peak） | 缓存未命中（off-peak / peak） | 输出（off-peak / peak） |
|---|---|---|---|
| `deepseek-flash` | $0.003 / $0.006 | $0.15 / $0.30 | $0.60 / $1.20 |
| `deepseek-v4-pro` | $0.022 / $0.044 | $0.66 / $1.32 | $1.98 / $3.96 |

- 高峰时段：UTC 周一至周五 `01:00–04:00`、`06:00–10:00`（中国法定节假日除外）；其余时段为 off-peak，按半价计费。

### 2.3 弃用与别名

| 旧模型 | 状态 | 说明 |
|---|---|---|
| `deepseek-chat` / `deepseek-reasoner` | 已停止 | 2026-07-24 起停止服务，统一改用 `deepseek-flash`（含思考模式） |
| `deepseek-v4-flash` / `deepseek-v4-flash-vision-exp` | 模型已退役，名称仍接受 | 请求被路由到 `DeepSeek-V4.1-Flash-1017`，按 Flash 价格计费（事实上的别名） |

---

## 3. Moonshot / Kimi（api.moonshot.cn）

- 官方文档（已从 platform.moonshot.cn 迁至）：<https://platform.kimi.com/docs/>
- 快速开始：<https://platform.kimi.com/docs/guide/start-quick-start>
- 模型列表/定价：<https://platform.kimi.com/docs/pricing/chat>
- OpenAI 兼容 base_url：`https://api.moonshot.cn/v1`（官方快速开始示例明确；Anthropic 兼容：`https://api.moonshot.cn/anthropic`）
- 鉴权：`Authorization: Bearer <API_KEY>`

### 3.1 2026-11 主推模型

| 模型 id | 定位 | 上下文 | 最大输出 | 输入价（¥） | 输出价（¥） | 能力/备注 |
|---|---|---|---|---|---|---|
| `kimi-k3.1-pro` | 旗舰 | 1,048,576 | TODO/未确认 | ¥13 | ¥68 | 3 万亿级参数；原生文本+图片+视频输入；`reasoning_effort` low/high/max，默认 max |
| `kimi-k3.1-pro-highspeed` | 旗舰高速版 | 1,048,576 | TODO/未确认 | ¥26 | ¥136 | 能力同 K3.1 Pro，约 2–3 倍速度 |
| `kimi-k3` | 上一代旗舰 | 1,048,576 | 262K（按 SiliconFlow 托管页，官方页 TODO） | ¥20 | ¥100 | 2.8 万亿参数；原生视觉；开源 |

- 缓存：`kimi-k3.1-pro` 缓存命中 ¥1.30；缓存写入 5 分钟 ¥13、1 小时 ¥26（每百万 tokens）。
- Batch：标准价的 60%。
- 流式：支持（`stream: true`）。
- Function calling / 工具调用：支持。
- JSON Mode：支持。
- 视觉输入：K3.1 Pro 与 K3 均支持文本、图片、视频。

### 3.2 弃用/下线

| 旧模型 | 状态 |
|---|---|
| `moonshot-v1-8k` / `moonshot-v1-32k` / `moonshot-v1-128k` / `moonshot-v1-auto` | 已下线 |
| `moonshot-v1-*-vision-preview` 系列 | 已下线 |
| `kimi-k2-*`、`kimi-k2-thinking*`、`kimi-latest`、`kimi-thinking-preview` | 已下线 |
| `kimi-k2.7-code` / `kimi-k2.7-code-highspeed` / `kimi-k2.6` | 停止新用户开通（2026-11-01 前注册的老用户仍可用），预计 2026-12 底全面下线 |

> 结论：`moonshot-v1-8k` 已不可用；Kimi 当前没有“低价小模型”档，最便宜可用档是上一代 `kimi-k3`。

---

## 4. 阿里云百炼 Qwen（DashScope OpenAI 兼容模式）

- 模型列表：<https://help.aliyun.com/zh/model-studio/models>
- base_url 说明：<https://help.aliyun.com/zh/model-studio/base-url>
- `qwen4-max`：<https://help.aliyun.com/zh/model-studio/qwen4-max>
- OpenAI 兼容 base_url（按地域）：
  - 北京：`https://dashscope.aliyuncs.com/compatible-mode/v1`
  - 新加坡：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
  - 美国：`https://dashscope-us.aliyuncs.com/compatible-mode/v1`
  - 中国香港：`https://cn-hongkong.dashscope.aliyuncs.com/compatible-mode/v1`
  - 生产推荐业务空间专属域名：`https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`（其他地域同构）
- 鉴权：`Authorization: Bearer <DASHSCOPE_API_KEY>`

### 4.1 2026-11 主推模型

| 模型 id | 定位 | 上下文 | 最大输入 | 最大输出 | 输入价（¥） | 输出价（¥） | 能力/备注 |
|---|---|---|---|---|---|---|---|
| `qwen4-max` | 最新旗舰 | 1,000,000 | 991,808（思考模式 983,616） | 131,072（思考模式 262,144） | ¥10 | ¥30 | 流式 ✓、深度思考 ✓、并行工具调用 ✓、联网搜索 ✓、Function Calling ✓、结构化输出 JSON Object/Schema ✓；支持 OpenAI Chat/Responses、Anthropic、DashScope 协议；北京地域价，含 100 万 token 免费额度 |
| `qwen3.7-plus` | 均衡 | 1,000,000 | 991,808 | 131,072 | ¥2（≤256K 档） | ¥8 | 缓存命中 ¥0.4；视觉、Function Calling、结构化输出 |
| `qwen3.8-flash` | 快速/低价 | 1,000,000 | 991,808 | 131,072 | ¥0.8 | ¥2.7 | 缓存命中 ¥0.1；视觉、Function Calling、结构化输出、联网搜索 |

- 另见 `qwen3.8-max`（0902 快照，模型列表标 HOT）与 `qwen3.7-max`，旗舰仍以 `qwen4-max` 为准；`qwen3.8-max` 价格 TODO/未确认。
- 流式：支持（OpenAI 兼容 `stream: true`）。
- Function calling / JSON mode：上述三款均支持；`qwen4-max` 支持并行工具调用与 JSON Schema。

### 4.2 旧模型

- `qwen4-max` 为“最新模型”；`qwen3.8-max`、`qwen3.7-max` 等仍在售，未见官方弃用公告（未确认是否降级为旧版）。
- 更早的 `qwen2.5` / `qwen3` 系列仍出现在模型列表中，官方未标记下线；新接入不建议使用。

---

## 5. SiliconFlow（硅基流动）

- 官方文档：<https://docs.siliconflow.com/cn/>
- 快速开始：<https://docs.siliconflow.com/cn/userguide/quickstart>
- 定价：<https://www.siliconflow.com/zh/pricing>
- 模型广场：<https://www.siliconflow.com/zh/models>
- OpenAI 兼容 base_url：`https://api.siliconflow.com/v1`（官方快速开始与 API 参考示例均用此地址）
  - 国内控制台为 `cloud.siliconflow.cn`；`https://api.siliconflow.cn/v1` 为常见国内端点，但**本次官方文档页未直接展示 `.cn` base_url，标 TODO/未确认**。
- 模型 id 规则：`厂商/模型名`，大小写与连字符必须完全一致。
- 鉴权：`Authorization: Bearer <API_KEY>`

### 5.1 2026-11 可用主力模型（精选）

| 模型 id | 定位 | 上下文 | 最大输出 | 输入价（$） | 缓存输入（$） | 输出价（$） | 能力/备注 |
|---|---|---|---|---|---|---|---|
| `deepseek-ai/DeepSeek-V4.1-Flash` | 默认主力/旗舰 | 1049K | 393K | 0.15 | 0.003 | 0.60 | 视觉输入 ✓、JSON Mode ✓、工具 ✓、对话前缀补全 ✓；结构化输出 ✗ |
| `zai-org/GLM-5.3-Flash` | 快速/低价 | 1049K | 262K | 0.15 | 0.03 | 0.50 | 多模态理解、1M 上下文、reasoning effort 可调 |
| `zai-org/GLM-5.3` | 推理 | 1049K | 262K | 1.40 | 0.26 | 4.40 | 纯文本；默认开启思考；JSON Mode ✓、工具 ✓ |
| `moonshotai/Kimi-K3` | 高能力备选 | 1049K | 262K | 2.70 | 0.27 | 13.50 | 原生视觉、JSON Mode ✓、工具 ✓ |
| `Qwen/Qwen3.5-9B` | 极低价备选 | 262K | 262K | 0.10 | — | 0.15 | 轻量多模态、默认思考、工具调用 |

- 流式：支持（OpenAI SSE；`stream: true`）。
- Function calling：支持（`tools`，最多 128 个函数）。
- JSON Mode：支持（`response_format`）；“结构化 Outputs”在模型详情页标“不支持”，接 JSON Schema 前需按模型确认。
- 推理参数：`thinking_budget`（128–32768）、`enable_thinking`（部分模型）、`reasoning_content` 返回思维链。

### 5.2 旧模型/下线

- 平台文档的模型枚举明显滞后（仍列 `deepseek-ai/DeepSeek-V3.2`、`Qwen/Qwen3.5-*` 等），但模型广场已上架 V4.1/GLM-5.3/Kimi-K3；两处不一致，接入以模型广场/调用返回为准。
- 未发现官方“已弃用”清单；旧模型（DeepSeek-V3.x、Qwen3、GLM-5.1 等）多数仍可调用，但不再是最新推荐。

---

## 6. 可选：智谱 GLM

- 模型页：<https://docs.bigmodel.cn/cn/guide/models/text/glm-5.3>
- 定价：<https://docs.bigmodel.cn/cn/guide/start/pricing>
- OpenAI 兼容说明：<https://docs.bigmodel.cn/cn/guide/develop/openai/introduction>
- base_url（OpenAI Chat Completion 协议）：`https://open.bigmodel.cn/api/paas/v4`
  - OpenAI Responses 协议：`https://open.bigmodel.cn/api/v1`
  - Anthropic Message 协议：`https://open.bigmodel.cn/api/anthropic`
- 鉴权：`Authorization: Bearer <API_KEY>`

| 模型 id | 定位 | 上下文 | 最大输出 | 输入价（¥） | 输出价（¥） | 缓存命中（¥） | 能力/备注 |
|---|---|---|---|---|---|---|---|
| `glm-5.3` | 旗舰 | 1M | 128K | ¥8 | ¥28 | ¥2 | 纯文本；始终开启思考，`reasoning_effort` low/high/max，默认 max；流式、Function Calling、结构化输出、上下文缓存 |
| `glm-5.3-flash` | 快速/低价 | 1M | 128K | ¥0.8 | ¥2.8 | ¥0.23 | 原生多模态（图/视频/文件/文本）；始终思考；Function Calling、结构化输出 |
| `glm-5.3-flashx` | 高速版 | 1M | 128K | ¥2 | ¥7 | ¥0.57 | 约 200 tokens/s，能力同 Flash 档 |

- 迁移提示：`glm-5.3` 不再支持 `thinking.type: "disabled"`；从 GLM-5.2 迁移需改为 `enabled`，并把 `reasoning_effort` 设为 `low` 起步，否则请求失败。
- 旧模型：`glm-5.2` 同价 ¥8/¥28 仍在售；`glm-5.1`、`glm-5` 等继续可用，未见下线公告。

---

## 7. 可选：MiniMax

- OpenAI SDK 接入文档：<https://platform.minimax.cn/docs/api-reference/text-openai-api>
- 定价：<https://platform.minimax.cn/docs/pricing/overview>
- OpenAI 兼容 base_url：`https://api.minimax.cn/v1`（官方示例 `OPENAI_BASE_URL`）
- 鉴权：`Authorization: Bearer <API_KEY>`

| 模型 id | 定位 | 上下文 | 最大输出 | 输入价（¥） | 输出价（¥） | 缓存读取（¥） | 能力/备注 |
|---|---|---|---|---|---|---|---|
| `MiniMax-M3.1-Flash` | 旗舰/默认 | 1,000,000 | TODO/未确认 | ¥1.00 | ¥4.00 | ¥0.10 | 原生多模态（文本/图片/视频）；强制开启思考；`reasoning_effort` low/medium/high/xhigh/max，默认 max |
| `MiniMax-M3` | 上一代 | 1,000,000 | TODO/未确认 | ¥2.10（≤512K 输入，五折） | ¥8.40 | ¥0.42 | 输入 >512K 时 ¥4.20/¥16.80；可选择关闭思考 |

- 流式：支持；`stream_options.include_usage` 可取用量。
- Function calling：支持（多轮 Function Call 需回传完整 `response_message`，含 `tool_calls` 与 `reasoning_content`）。
- JSON mode：**未确认**（官方 OpenAI 兼容页未明确列出 `response_format`，接入前需实测）。
- 注意：`temperature`、`top_p` 暂不支持指定（固定 1 / 0.95）；`MiniMax-M3.1-Flash` 不支持 `service_tier` 和 `reasoning_split=false`。
- 旧模型：`MiniMax-M3` 仍可用；更早的 M2.x 等未在定价页“语言模型”主表展示，是否下线未确认。

---

## 8. 可选：OpenRouter

- 快速开始：<https://openrouter.ai/docs/quickstart>
- 模型目录：<https://openrouter.ai/models>
- OpenAI 兼容 base_url：`https://openrouter.ai/api/v1`（EU 专属：`https://eu.openrouter.ai/api/v1`）
- 鉴权：`Authorization: Bearer <OPENROUTER_API_KEY>`；可选 `HTTP-Referer`、`X-OpenRouter-Title`（用于榜单归因，不影响调用）。
- 说明：OpenRouter 是聚合路由，不自研模型。模型 slug 形如 `<厂商>/<模型>`，同一个上游模型可能有 `:batch`、`:free`、`:nitro` 等变体；价格 = 上游价 + 路由/计费策略，需以模型页实时展示为准（逐项价格未确认）。
- 2026-11 目录示例（仅示例 slug，非“官方主推”）：`openai/gpt-6.2-astra`、`openai/gpt-6.2-sol`、`openai/gpt-6.2-astra-pro`、`openai/gpt-6-luna`。
- 能力：透传上游的流式、工具调用、结构化输出；是否支持取决于所选模型与 provider。
- 旧模型：由上游厂商弃用节奏决定，OpenRouter 目录会保留一段时间；无统一“别名指向”承诺。

---

## 9. 横向对比与选型建议

### 9.1 价格对比（每百万 tokens，按官方标准价）

| 供应商/模型 | 输入 | 输出 | 备注 |
|---|---|---|---|
| OpenAI `gpt-6-luna` | $0.10 | $0.50 | 最低成本闭源档 |
| OpenAI `gpt-6.2-sol` | $2 | $10 | 均衡主力 |
| OpenAI `gpt-6.2-astra` | $8 | $40 | 旗舰 |
| DeepSeek `deepseek-flash`（off-peak） | $0.15 | $0.60 | 1M 上下文，性价比最高档之一 |
| DeepSeek `deepseek-v4-pro`（off-peak） | $0.66 | $1.98 | 高能力档 |
| Kimi `kimi-k3.1-pro` | ¥13 | ¥68 | 1M 上下文 + 视频输入 |
| Kimi `kimi-k3` | ¥20 | ¥100 | 上一代，反而更贵 |
| Qwen `qwen3.8-flash` | ¥0.8 | ¥2.7 | 国内低价档 |
| Qwen `qwen3.7-plus` | ¥2 | ¥8 | 均衡 |
| Qwen `qwen4-max` | ¥10 | ¥30 | 旗舰 |
| SiliconFlow `DeepSeek-V4.1-Flash` | $0.15 | $0.60 | 与 DeepSeek 官方 off-peak 接近 |
| SiliconFlow `GLM-5.3-Flash` | $0.15 | $0.50 | 多模态低价 |
| 智谱 `glm-5.3-flash` | ¥0.8 | ¥2.8 | 原生多模态 |
| 智谱 `glm-5.3` | ¥8 | ¥28 | 旗舰 |
| MiniMax `MiniMax-M3.1-Flash` | ¥1.00 | ¥4.00 | 强制思考，1M 上下文 |

> 汇率未统一折算；跨币种比较请按接入时汇率换算。OpenAI/DeepSeek/SiliconFlow 为美元价，Kimi/Qwen/智谱/MiniMax 为人民币价。

### 9.2 对本项目（Flutter 轻量项目管理 App）的建议

1. **默认主模型**：优先 `deepseek-flash` 或 `gpt-6.2-sol`。前者 1M 上下文 + 思考模式，价格低；后者工具调用/结构化输出生态最稳。
2. **快速模型**：`gpt-6-luna`、`qwen3.8-flash`、`glm-5.3-flash` 三选一；国内网络环境优先 Qwen/GLM。
3. **推理模型**：需要长链推理时用 `deepseek-v4-pro`（或 `deepseek-flash` 开 thinking）、`kimi-k3.1-pro`、`qwen4-max`、`glm-5.3`；不要用 `gpt-6-luna` 做深度推理。
4. **不要硬编码 key**：按项目约定只存本地 `ai_config` 表，base_url 与 model 可在设置页覆盖。
5. **流式差异**：DeepSeek/Kimi/Qwen/SiliconFlow/智谱/MiniMax 都兼容 OpenAI SSE；推理内容字段不统一（`reasoning_content` 或 `reasoning`），客户端需兼容两种。
6. **弃用迁移**：`gpt-4o` 系列 2027-01-14 关停、`gpt-5`/`o3` 2026-12-11 关停；`deepseek-chat`/`deepseek-reasoner` 已停；`moonshot-v1-8k` 已下线。默认配置不要再用这些 id。

---

## 10. 建议写入 Flutter 默认配置的片段

> 仅作“默认值”模板；运行时仍应以用户 `ai_config` 表为准。`fastModel` 用于摘要/标题等低价值调用，`reasoningModel` 用于项目分析/长链推理。

```yaml
ai_providers:
  - provider: openai
    baseUrl: https://api.openai.com/v1
    defaultModel: gpt-6.2-sol
    fastModel: gpt-6-luna
    reasoningModel: gpt-6.2-astra

  - provider: deepseek
    baseUrl: https://api.deepseek.com
    defaultModel: deepseek-flash
    fastModel: deepseek-flash
    reasoningModel: deepseek-v4-pro

  - provider: kimi
    baseUrl: https://api.moonshot.cn/v1
    defaultModel: kimi-k3.1-pro
    fastModel: kimi-k3.1-pro-highspeed
    reasoningModel: kimi-k3.1-pro

  - provider: qwen
    baseUrl: https://dashscope.aliyuncs.com/compatible-mode/v1
    defaultModel: qwen3.7-plus
    fastModel: qwen3.8-flash
    reasoningModel: qwen4-max

  - provider: siliconflow
    baseUrl: https://api.siliconflow.com/v1
    defaultModel: deepseek-ai/DeepSeek-V4.1-Flash
    fastModel: zai-org/GLM-5.3-Flash
    reasoningModel: zai-org/GLM-5.3

  # 可选
  - provider: zhipu
    baseUrl: https://open.bigmodel.cn/api/paas/v4
    defaultModel: glm-5.3-flash
    fastModel: glm-5.3-flash
    reasoningModel: glm-5.3

  - provider: minimax
    baseUrl: https://api.minimax.cn/v1
    defaultModel: MiniMax-M3.1-Flash
    fastModel: MiniMax-M3.1-Flash
    reasoningModel: MiniMax-M3.1-Flash

  - provider: openrouter
    baseUrl: https://openrouter.ai/api/v1
    defaultModel: openai/gpt-6.2-sol
    fastModel: openai/gpt-6-luna
    reasoningModel: openai/gpt-6.2-astra-pro
```

对应 JSON（同内容，便于直接嵌入）：

```json
{
  "ai_providers": [
    { "provider": "openai",     "baseUrl": "https://api.openai.com/v1",                              "defaultModel": "gpt-6.2-sol",                    "fastModel": "gpt-6-luna",                 "reasoningModel": "gpt-6.2-astra" },
    { "provider": "deepseek",   "baseUrl": "https://api.deepseek.com",                                "defaultModel": "deepseek-flash",                 "fastModel": "deepseek-flash",             "reasoningModel": "deepseek-v4-pro" },
    { "provider": "kimi",       "baseUrl": "https://api.moonshot.cn/v1",                              "defaultModel": "kimi-k3.1-pro",                  "fastModel": "kimi-k3.1-pro-highspeed",     "reasoningModel": "kimi-k3.1-pro" },
    { "provider": "qwen",       "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",       "defaultModel": "qwen3.7-plus",                   "fastModel": "qwen3.8-flash",              "reasoningModel": "qwen4-max" },
    { "provider": "siliconflow","baseUrl": "https://api.siliconflow.com/v1",                          "defaultModel": "deepseek-ai/DeepSeek-V4.1-Flash", "fastModel": "zai-org/GLM-5.3-Flash",      "reasoningModel": "zai-org/GLM-5.3" },
    { "provider": "zhipu",      "baseUrl": "https://open.bigmodel.cn/api/paas/v4",                    "defaultModel": "glm-5.3-flash",                  "fastModel": "glm-5.3-flash",              "reasoningModel": "glm-5.3" },
    { "provider": "minimax",    "baseUrl": "https://api.minimax.cn/v1",                               "defaultModel": "MiniMax-M3.1-Flash",             "fastModel": "MiniMax-M3.1-Flash",         "reasoningModel": "MiniMax-M3.1-Flash" },
    { "provider": "openrouter",  "baseUrl": "https://openrouter.ai/api/v1",                           "defaultModel": "openai/gpt-6.2-sol",             "fastModel": "openai/gpt-6-luna",          "reasoningModel": "openai/gpt-6.2-astra-pro" }
  ]
}
```

---

## 11. 待办 / 未确认清单

- [ ] SiliconFlow 国内 `.cn` base_url 的官方页面确认（当前文档只展示 `api.siliconflow.com/v1`）。
- [ ] Kimi `kimi-k3.1-pro` / `kimi-k3` 的官方最大输出 tokens（模型页未直接给出）。
- [ ] Qwen `qwen3.8-max` 价格与是否与 `qwen4-max` 并存。
- [ ] MiniMax 的 JSON mode / `response_format` 是否在 OpenAI 兼容层开放。
- [ ] OpenAI models 页与 pricing 页个别价格不一致（`gpt-6-astra` vs `gpt-6.2-astra`），以实际账单为准。
- [ ] 各厂商模型 id 的日期快照（如 `qwen4-max-2026-xx`）是否可直接指定。
