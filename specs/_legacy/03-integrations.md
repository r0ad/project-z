# 03 · 外部集成与 AI 能力（legacy 事实基线）

> 审计对象：`D:\ws-research\project-z-public`，分支 `master`，versionName `1.0.6` / versionCode `100`。
> 性质：**只读审计**。本文所有行为描述均来自仓库源码，行号对应当前工作树（未提交、未修改）。
> 目的：为 Flutter 重写提供「真实行为」而不是设计文档里的应然行为。`doc/03-design/` 与 `AGENTS.md` 中与本文件冲突处，以源码为准，并在文中标注。
> 阅读约定：`保留` = 行为/协议可原样迁移；`重设计` = 业务意图保留、实现替换；`丢弃` = 不迁移。

---

## 0. 范围、方法与未决项

### 0.1 覆盖文件

| 层 | 文件 |
|---|---|
| AI 门面 | `api/aiApi.js`（1582 行）、`api/chatApi.js`（420 行） |
| AI SDK | `uni_modules/openai-chat/js_sdk/openai-api.js`（710 行） |
| 传输 | `uni_modules/http-request/js_sdk/index.js`（428 行）+ `asyncStreamReader.js`（305 行） |
| 配置 | `utils/aiProviders.js`（118 行）、`pages/profile/ai-settings.vue` |
| 对话 UI | `components/ChatComponent.vue`（2078 行）、`pages/project/chat.vue`（2063 行）、`pages/knowledge/chat.vue`（816 行） |
| 其他 AI 调用 | `pages/project/create.vue`、`pages/project/detail.vue`、`pages/project/log.vue` |
| 推广码 | `utils/cryptoUtils.js`（473）、`api/promoApi.js`（493）、`utils/promoManager.js`（358）、`utils/appStartup.js`（209） |
| 外部 | `utils/updateApp.js`（392）、`uni_modules/gitcode-sync/js_sdk/index.js`（669） |
| 分享 | `components/ShareCardComponent.vue`（912）、`utils/contentAdapters.js`（331）、`utils/shareCardThemes.js`（183） |
| 基础 | `utils/dateUtils.js`（247）、`utils/userStore.js`（148） |

### 0.2 未核实 / TODO（时间限制，未继续深挖）

- [ ] `chatCompletion` 是否真的把 `temperature` / `max_tokens` 放进请求体：初读只看到 `{model, messages, stream}`，`ai_config` 里这两列疑似**只存不发**（见 §1.4）。
- [ ] `ai_analyses` 与 `ai_summaries` 两张表在实际页面上的读取路径是否都走通（`generateAIAnalysis` 写 `ai_analyses`，`generateAISummary` 写 `ai_summaries`；详情页读取方法未逐行核对）。
- [ ] `ShareCardComponent` 的四套主题是否只影响预览样式、从未进入纯文本输出（代码显示复制内容只有 emoji 文本）。
- [ ] Android 原生 SSE 读到一半退出页面时的资源回收（无取消 API，`close()` 是否被调用未核实）。
- [ ] `pages/project/chat.vue` 里 `saveToKnowledge` / `getProjectSuggestions` 在 `aiApi` 中不存在，已被 `try/catch` 吞掉（`AGENTS.md` §7 已记录，属确认缺陷）。

---

## 1. AI 供应商与 `ai_config`

### 1.1 供应商定义（`utils/aiProviders.js`）

唯一事实源。`providers` 数组顺序 = 设置页展示顺序：
`deepseek → siliconflow → openai → kimi → qwen → custom`。

| provider | baseUrl | 默认模型（defaultModels，按数组顺序） | 默认参数（defaultConfigs） |
|---|---|---|---|
| `deepseek` | `https://api.deepseek.com/v1` | `deepseek-chat`、`deepseek-reasoner` | timeout 130、temperature 0.7、max_tokens 8000 |
| `siliconflow` | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-R1`、`deepseek-ai/DeepSeek-V3`、`Qwen/Qwen3-8B`、`Qwen/Qwen3-14B`、`Qwen/Qwen3-32B` | timeout 130、temperature 0.7、max_tokens 4000 |
| `openai` | `https://api.openai.com/v1` | `gpt-5-2025-08-07`、`gpt-5-mini`、`gpt-5-nano` | timeout 130、temperature 0.7、max_tokens 4000 |
| `kimi` | `https://api.moonshot.cn/v1` | `kimi-k2-0711-preview` | timeout 130、temperature 0.7、max_tokens 4000 |
| `qwen` | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo-latest`、`qwen-plus-latest` | timeout 130、temperature 0.7、max_tokens 4000 |
| `custom` | `''`（空，必须用户填） | `custom-model` | timeout 130、temperature 0.7、max_tokens 2000 |

辅助函数：`getProviderInfo(provider)`、`getProviderDefaultConfig(provider)`、`getProviderModels(provider)`、`isCustomProvider(provider)`。
`custom` 在设置页会把 `provider` 替换为用户填的 `custom_provider_name`，然后删掉该临时字段再入库（`pages/profile/ai-settings.vue`）。

### 1.2 表结构（`utils/dbUpgradeConfig.js:56-57`，与 `utils/dbService.js:393` 双份建表并存）

```sql
CREATE TABLE IF NOT EXISTS ai_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT NOT NULL,
  base_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  model TEXT NOT NULL,
  timeout INTEGER DEFAULT 30,
  max_tokens INTEGER DEFAULT 2000,
  temperature REAL DEFAULT 0.7,
  is_active INTEGER DEFAULT 0,
  user_id INTEGER DEFAULT 1 REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(provider, user_id)
)
```

升级补列：`promo_code_id TEXT NULL`（`dbUpgradeConfig.js:247`），索引 `idx_ai_config_promo_code_id`、部分索引 `idx_ai_config_editable ... WHERE promo_code_id IS NULL`。
**API Key 明文存 SQLite，无加密**；`base_url` 也明文。

### 1.3 CRUD 与「激活」的真实语义（`api/aiApi.js`）

| 方法 | 行号 | 行为要点 |
|---|---|---|
| `initOpenAI()` | 39 | 读 `getActiveAIConfig()`，`new OpenAIAPI({baseUrl: config.base_url \|\| 'https://api.deepseek.com/v1', apiKey, model: config.model \|\| 'deepseek-chat', timeout: (config.timeout \|\| 130) * 1000})`；缓存实例。无 `api_key` 抛 `请先在设置中配置AI API密钥`。 |
| `getAIConfigList` | 72 | `user_id` 过滤，`created_at DESC`；附 `is_editable`（`!promo_code_id`）。 |
| `addAIConfig` | 223 | 若 `is_active`，先 `UPDATE ai_config SET is_active = 0`（**全表，不带 user_id**）；`timeout` 默认 **30**、`max_tokens` 2000、`temperature` 0.7。 |
| `updateAIConfig` | 264 | `canEditConfig` 拒绝分享码配置；`is_active` 时 `UPDATE ... WHERE id != ?`；`timeout` 默认 **130**；`updated_at = Date.now()`；**不更新 `promo_code_id`**；`WHERE id = ${id} AND user_id = ${userId}`（字符串拼接）。 |
| `saveAIConfig` | 387 | 按 `(provider, user_id)` upsert，兼容 camelCase（`baseUrl/apiKey/maxTokens/isActive`）；激活后把其它 provider 置 0。 |
| `deleteAIConfig` | 443 | 删除后若 `promoStatus.provider === provider`，调 `promoApi.clearPromoConfig()`。 |
| `activateAIConfig` | 481 | 先全置 0，再置目标 1；清缓存并重新 `initOpenAI()`。 |
| `getActiveAIConfig` | 343 | `is_active = 1 AND user_id = ?`；查不到（或异常）返回默认对象：`{provider:'deepseek', base_url:'https://api.deepseek.com/v1', api_key:'', model:'deepseek-chat', timeout:130, max_tokens:2000, temperature:0.7}`。 |
| `testAIConnection` | — | 调 `sendAIRequest('你好，请回复"连接成功"')`，返回 `{success, response: content}`。 |

**激活模型**：`ai_config` 里同一时刻只有一行 `is_active = 1`（应用层保证，无 DB 约束）。切换 provider 走「先全 0、再置 1」。分享码创建的配置 `promo_code_id != NULL`，UI 与 API 双重禁止编辑/删除（删除只能经 `promoApi.removePromoCode`）。

### 1.4 已知不一致（迁移时必须消掉）

1. **timeout 默认值三处不同**：DDL 30、`addAIConfig` 30、`updateAIConfig`/`getActiveAIConfig` 130；`aiProviders` 130。
2. **max_tokens 默认值两套**：DDL/`addAIConfig` 2000，`aiProviders` 按供应商 8000/4000/2000，设置页新增表单默认 2000。
3. `addAIConfig` / `updateAIConfig` 的「全部置 0」SQL 未带 `user_id`，多用户模型下会串号（当前单用户 `user_id=1`，未暴露）。
4. `updateAIConfig` 用字符串拼接 `id`（内部数字，风险低），但不是参数化。
5. `temperature` / `max_tokens` 落库后，`chatCompletion` 初读未使用（TODO 见 §0.2）。

**决策：重设计。** Flutter 侧建议：`AiProvider` 值对象 + `AiConfig` 表（`provider`、`baseUrl`、`model`、`apiKeyRef`、`timeoutMs`、`maxTokens`、`temperature`、`isActive`、`origin`=manual/promo），API Key 放 `flutter_secure_storage`，DB 只存 key 引用；单 active 用事务 + 唯一局部索引保证。

---

## 2. 请求构造、流式协议与错误处理

### 2.1 `sendAIRequest` 忽略 `options.messages`（已核实，核心缺陷）

`api/aiApi.js:515-546` 的全部构造逻辑：

```js
const messages = [ { role: 'user', content: prompt } ]
if (options.systemPrompt) {
  messages.unshift({ role: 'system', content: options.systemPrompt })
}
const response = await api.chatCompletion(messages, {
  useHistory: false,
  enableFunctions: false
})
return { content: response.content, usage: response.usage || { totalTokens: 0 } }
```

结论（逐条核实）：

- `options.messages` **从未被读取**，传了也无效；
- `options.stream` / `options.onStream` / `options.onData` **也被忽略**，永远走非流式 `chatCompletion`；
- `options.type` / `relatedId` / `context` 只进入调用方参数、**不进入 prompt**；
- 实际发送永远只有 1 条（无 systemPrompt）或 2 条（有 systemPrompt）消息。

受影响调用点：

| 调用点 | 传入 | 实际效果 |
|---|---|---|
| `components/ChatComponent.vue:642 callDefaultAI` | `messages: chatHistory`（system + 全部历史 + 当前输入） | 历史全丢，仅 system + 当前输入 |
| `pages/knowledge/chat.vue:558` | `{messages, stream, onStream}` | 历史与流式**双重失效**，退化为单轮非流式 |
| `pages/project/chat.vue:1094` | 无 | 正常单轮 |
| `pages/project/create.vue:424` | 无 | 正常单轮 |
| `pages/project/log.vue:316` | 无 | 正常单轮 |

反例（不受影响）：`pages/project/chat.vue:522` 走 `aiApi.chatWithProject(...)`，该方法**自己**把 `system + chatHistory + 当前 user` 拼成 `messages`（`api/aiApi.js:691-695`），所以项目聊天多轮是通的；但父页只给 `messages.slice(-10)`（`chat.vue:515-536`），且每条只保留 `role/content`。

**决策：重设计（不是简单修 bug）。** Flutter 侧 `AiRequest` 必须显式携带 `systemPrompt`、`messages`、`temperature`、`maxTokens`、`stream`、`cancelToken`；服务层不得再从单一 `prompt` 反推消息列表。

### 2.2 `chatCompletion`（非流式，`openai-api.js`）

- `POST ${baseUrl}/chat/completions`，Header `Authorization: Bearer <key>`、`Content-Type: application/json`。
- 请求体：`{ model, messages, stream: false }`，可选 `functions` / `function_call`（`enableFunctions` 未真正注册函数时为空）。
- `uni.request` 的 `timeout = config.timeout`（`aiApi` 传秒 ×1000，默认 130s）。
- 成功判定：`statusCode === 200 && data.choices[0].message` → resolve `{content, function_call, usage, model}`。
- 非 200：reject `{error: data || {message: 'HTTP ' + statusCode}, response}`；网络失败：reject `{error:{message: errMsg}}`。
- `useHistory` 为 true 时才合并/写入 SDK 内部会话历史；`aiApi` 全部显式传 `useHistory: false`，所以 SDK 的 `conversations` Map 实际未使用。

### 2.3 流式真实链路

```
ChatComponent.sendMessage
  → 父页 customAiCall（project/chat.vue）或 callDefaultAI
    → aiApi.chatWithProject(..., {stream:true, onData})
      → OpenAIAPI.chatCompletionStream(messages, onData, onComplete, onError, {useHistory:false})
        → streamRequest({url, method:'POST', headers, data})
          → Android: plus.android 原生 java.net.HttpURLConnection + AsyncStreamReader（真 SSE）
          → iOS / H5 / 小程序: fallbackStreamRequest（假流式）
```

- `chatCompletionStream` 只把每个 chunk 透传给 `onData`；`[DONE]` **不特殊处理**，SDK 自己累积内容时跳过 `[DONE]`。
- `onComplete` 返回 `{content: accumulatedContent, usage: lastUsage, model: lastModel || config.model}`；`lastUsage` 在流式路径中从未赋值 → 实际 `undefined`。
- **没有 AbortController / cancel / close 对外的 API**；页面卸载无法中断请求。`[DONE]` 到达时 `chatWithProject` 的 wrapper 会 `resolve`（`api/aiApi.js:706-711`），且此后不再回调 `onData`。

### 2.4 SSE 解析（`asyncStreamReader.js`）

- 逐行 `readLine()`；
- 只处理以 `data: ` 开头的行，其它行（`event:`、`id:`、空行、注释）忽略；
- 内容为 `[DONE]` → 停止；
- `JSON.parse` 后取 `choices[0].delta.content`，非空则 publish `STREAM_DATA`；
- **解析失败的行被当作正文内容整行发出**（会把协议噪声混进回答）；
- 批处理：每 3 行 / 1ms，最长连续 10ms，避免阻塞；
- 结束 publish `REQUEST_COMPLETE {totalLength, totalChunks, duration, success:true}`；
- 错误 publish `STREAM_ERROR`；`close()` 关闭 reader / inputStream / connection。

### 2.5 超时、取消、错误

| 项 | 事实 |
|---|---|
| 非流式超时 | `ai_config.timeout` 秒（默认 130）→ `uni.request` timeout |
| Android 流式超时 | **硬编码** `setConnectTimeout(30000)`、`setReadTimeout(60000)`，**忽略 `ai_config.timeout`** |
| iOS/H5 伪流式超时 | `uni.request` timeout 60000 |
| 取消 | 无。没有 abort 接口，没有 UI 停止按钮（`ChatComponent` 只有 `isStreaming` 标志） |
| 非 200 | 原生分支读取 `getErrorStream` 拼错误文本 → `reject new Error('HTTP <code>: <msg>')` |
| 错误上抛 | `chatCompletionStream.onError` → `chatWithProject` reject → 页面 toast；`sendAIRequest` 把非配置类错误统一改写成 `AI服务暂时不可用，请稍后重试`（原始错误仅 `console.error`） |
| 重试 | 无自动重试；`updateApp` 的弹窗重试是另一条链路 |
| 配置错误 | 含「配置」或「API密钥」的异常原样上抛，UI 提示去设置 |

**iOS/H5 的「假流式」**（`http-request/js_sdk/index.js` 的 `fallbackStreamRequest`）：把请求体 `stream` 改为 `false`，正常请求拿到完整 `choices[0].message.content`，再按**每 15 个字符 / 50ms** 定时回调。用户看到的是打字机效果，不是增量生成；首字延迟 = 整段生成时间。

**决策：丢弃整条 uni 传输链。** Flutter 用 `dio` + `ResponseType.stream` 自行解析 SSE（`utf8.decoder` + `LineSplitter`），`CancelToken` 取消；Android/iOS 同一实现，不再有平台分叉和伪流式。若用现成库，选 `flutter_client_sse` 或 `http` 的 `StreamedResponse`，但必须自己处理 `[DONE]`、`data:` 前缀、坏行丢弃（不要像 legacy 一样把坏行当正文）。

---

## 3. Prompt 原文（逐字摘录，未改写）

> 说明：源码里这些 prompt 是 JS 模板字符串；旧版 `analyzeProject` / `generateProjectSummary` 写作 `\\n`，其余写作 `\n`。下面按**运行时呈现的文本**排版，措辞、标点、全角/半角、emoji 均未改动。

### 3.1 建项目：SMART 目标 + 里程碑（`pages/project/create.vue:401-422`）

输入变量：`projectData.name`、`projectData.goal`、`projectData.description`。
输出格式：JSON（`smartGoal`、`milestones[{title,description,deadline}]`、`suggestions`）；代码用 `/```json\s*([\s\S]*?)\s*```/` 去围栏后 `JSON.parse`，失败静默降级为原始表单数据，`smartGoal` 存在时覆盖 `projectData.goal`。

```text
请分析以下项目信息，生成符合SMART原则的目标和关键节点：

项目名称：${projectData.name}
目标关键词：${projectData.goal}
项目描述：${projectData.description}

请返回JSON格式的分析结果，包含：
1. smartGoal: 重新优化的SMART目标
2. milestones: 关键节点数组，每个节点包含title、description、deadline（相对天数）
3. suggestions: 项目建议

示例格式：
{
  "smartGoal": "在30天内开发一款AI小工具，实现文本生成功能，用户留存率达到60%以上",
  "milestones": [
    {"title": "需求分析与设计", "description": "完成产品需求分析和UI设计", "deadline": 7},
    {"title": "核心功能开发", "description": "实现AI文本生成核心功能", "deadline": 20},
    {"title": "测试与优化", "description": "完成功能测试和性能优化", "deadline": 28},
    {"title": "发布上线", "description": "完成项目发布和用户反馈收集", "deadline": 30}
  ],
  "suggestions": "建议重点关注用户体验设计和AI模型的响应速度优化"
}
```

### 3.2 项目聊天：页面侧 system prompt（`pages/project/chat.vue:578-587`）

输入变量：`projectName`、`projectProgress`、`contextData.recentLogs`（取前 3 条 `.content`）、`currentGoals`、`problems`。
输出：纯文本（无格式约束）。该 prompt 由页面 `buildSystemPrompt()` 生成后传给 `chatWithProject` 的 `options.systemPrompt`，但 `chatWithProject` **不使用** `options.systemPrompt`（它自己另拼一份，见 §3.3）——即这份 prompt 实际**未发送**。

```text
你是一个专业的AI项目助手，正在协助用户管理项目「${this.projectName}」。

当前项目信息：
- 项目名称：${this.projectName}
- 当前进度：${this.projectProgress}%
- 最近日志：${this.contextData.recentLogs.map(log => log.content).join('；')}
- 当前目标：${this.contextData.currentGoals.join('；')}
- 遇到问题：${this.contextData.problems.join('；')}

请基于以上信息，为用户提供专业、有针对性的建议和帮助。回答要简洁明了，并在适当时候提供可操作的建议。
```

### 3.3 项目聊天：`aiApi.chatWithProject` 真正发送的 system prompt（`api/aiApi.js:666-688`）

输入变量：项目 `name/goal/description/status`；里程碑 `title/status`；最近 5 条日志（`progress_text || problem_text || plan_text`）。
输出：纯文本。消息数组 = `[system, ...chatHistory, user]`；流式/非流式都发这一份。

```text
你是一个专业的项目管理助手，正在协助用户管理以下项目：

项目名称：${project.name}
项目目标：${project.goal}
项目描述：${project.description}
当前状态：${project.status}

项目里程碑：            ← 仅 milestones.length > 0 时出现
- ${milestone.title}（${milestone.status}）

最近的项目日志：        ← 仅 recentLogs.length > 0 时出现
- ${log.progress_text || log.problem_text || log.plan_text}

请基于以上项目信息，为用户提供专业的项目管理建议和支持。
```

### 3.4 知识聊天 system prompt（`pages/knowledge/chat.vue:117-133`）

输入变量：知识 `title/summary/content`。
输出：纯文本。由 `ChatComponent` 的 `systemPrompt` prop 传入；知识页 `handleAICall` 又把它拼进 `chatHistory` 交给 `sendAIRequest`，而后者忽略 `messages` —— 所以**只有**通过 `ChatComponent` 默认路径才可能带上；实际因 `sendAIRequest` 只看 `options.systemPrompt`，该页是否真正发送此 prompt 取决于调用方式（`handleAICall` 未把 systemPrompt 放进 `options.systemPrompt`，**结论：实际未发送**）。

```text
你是一个专业的知识助手，专门帮助用户理解和应用知识库中的内容。

当前知识信息：
标题：${this.knowledgeData.title || ''}
概要：${this.knowledgeData.summary || ''}
详细内容：${this.knowledgeData.content || ''}

请基于这个知识内容回答用户的问题，提供深入的解释、实际应用建议和相关扩展。你可以：
1. 解释知识点的核心概念
2. 提供实际应用场景和案例
3. 推荐相关的学习资源
4. 回答具体的实施问题
5. 提供最佳实践建议

请保持专业、准确、有帮助的回答风格。
```

### 3.5 日志结构化分析（`pages/project/log.vue:299-313`）

输入变量：用户输入的 `content`。
输出：JSON `{progress, problems, plans}`；`/\\{[\\s\\S]*\\}/` 提取，失败走 `parseTextResponse` 文本兜底。

```text
请分析以下工作日志内容，并按照JSON格式返回结构化数据：

日志内容：${content}

请提取以下信息并以JSON格式返回：
{
  "progress": "今天完成的工作内容（如果有的话）",
  "problems": "遇到的问题和困难（如果有的话）",
  "plans": "明天或下一步的计划（如果有的话）"
}

注意：
1. 如果某个方面没有相关内容，请返回空字符串
2. 请用简洁明了的语言总结
3. 只返回JSON格式，不要其他文字
```

### 3.6 对话转知识（`pages/project/chat.vue:1078-1091`）

输入变量：`messages` 映射为 `用户: …` / `AI助手: …`，以 `\n\n` 拼接。
输出：JSON `{title, content, tags[], category, summary}`；`/\\{[\\s\\S]*\\}/` 解析，失败降级为固定对象（`title: '从对话中提取的知识'`、`tags: ['对话提取']`…）。

```text
请分析以下对话内容，提取出有价值的知识信息，并按照以下JSON格式返回：

{
  "title": "知识标题（简洁明了）",
  "content": "知识内容（详细描述）",
  "tags": ["标签1", "标签2"],
  "category": "知识分类",
  "summary": "知识摘要（一句话概括）"
}

对话内容：
${chatContent}

请确保返回的是有效的JSON格式，不要包含其他文字说明。
```

### 3.7 新版分析 prompt（`api/aiApi.js:1319-1350 buildAnalysisPrompt`，`generateAIAnalysis` 使用）

输入变量：`project.name/goal/progress/status`；`logs` 拼成 `created_at: content progress_text problem_text plan_text`；`milestones` 拼成 `title: status (progress%)`。
输出：严格 JSON `{content, suggestions}`；`parseAnalysisResponse` 用 `/\\{[\\s\\S]*\\}/` 提取，解析失败按行中点拆分 content/suggestions。

```text
请分析以下项目的当前状况：

项目名称：${project.name}
项目目标：${project.goal || '未设定'}
当前进度：${project.progress || 0}%
项目状态：${project.status}

最近日志：
${logsSummary}

里程碑情况：
${milestonesSummary}

请从以下角度进行分析：
1. 项目进展情况
2. 存在的问题和风险
3. 改进建议
4. 下一步行动计划

**重要：请严格按照以下JSON格式返回，不要包含任何其他文本或说明：**

{
  "content": "详细的分析内容，包含项目进展、问题风险、改进建议等",
  "suggestions": "具体的改进建议和下一步行动计划"
}

请确保返回的是有效的JSON格式，不要添加任何前缀或后缀文本。
```

### 3.8 新版总结 prompt（`api/aiApi.js:1355-1386 buildSummaryPrompt`，`generateAISummary` 使用）

输入变量：`periodText`（`week→本周`、`month→本月`、`all→整个项目`、兜底 `最近`）；`logsSummary` 同上；`completedMilestones` 标题列表。
输出：严格 JSON `{content, suggestions}`，解析同上。

```text
请总结以下项目${periodText}的情况：

项目名称：${project.name}
项目目标：${project.goal || '未设定'}
当前进度：${project.progress || 0}%

${periodText}日志：
${logsSummary}

已完成里程碑：
${completedMilestones.map(m => `- ${m.title}`).join('\n')}

请总结：
1. 主要成果和进展
2. 遇到的挑战
3. 经验教训
4. 下期计划

**重要：请严格按照以下JSON格式返回，不要包含任何其他文本或说明：**

{
  "content": "详细的总结内容，包含主要成果、挑战、经验教训等",
  "suggestions": "具体的建议和下期计划"
}

请确保返回的是有效的JSON格式，不要添加任何前缀或后缀文本。
```

### 3.9 旧版分析 prompt（`api/aiApi.js:577-615 analyzeProject`，仍可被调用）

输入变量：项目 `name/goal/description/status/progress`；全部里程碑 `title/status/progress`；最近 10 条日志取前 5 条（`content/progress_text/problem_text`）。
输出：**无格式约束**纯文本；结果写入 `ai_analyses(prompt, result, token_usage)`。
按 `analysisType` 追加的四种指令（原文）：

- `progress`：`请重点分析项目的进展情况，包括已完成的工作、当前进度是否合理、是否存在延期风险等。`
- `risk`：`请重点分析项目可能存在的风险，包括技术风险、进度风险、资源风险等，并提供应对建议。`
- `suggestion`：`请基于当前项目状态，提供具体的改进建议和下一步行动计划。`
- `default`：`请对项目进行全面分析，包括进展情况、潜在问题、改进建议等。`

模板骨架：

```text
请分析以下项目信息：

项目名称：${project.name}
项目目标：${project.goal}
项目描述：${project.description}
当前状态：${project.status}
进度：${project.progress}%

里程碑信息：
- ${milestone.title}：${milestone.status}（${milestone.progress}%）

最近的项目日志：
- ${log.content}
  进展：${log.progress_text}
  问题：${log.problem_text}

<按 analysisType 追加的指令>
```

### 3.10 旧版总结 prompt（`api/aiApi.js:790-806 generateProjectSummary`）

输入变量：`period` 决定「周 / 月 / 整体」与 SQL 时间过滤（`datetime('now','-7 days')` / `-30 days` / 无）；项目 `name/goal`；日志 `content/progress_text/problem_text/plan_text`。
输出：**无格式约束**纯文本，要求 4 段；写入 `ai_analyses(analysis_type='summary', prompt, result, token_usage)`。

```text
请为以下项目生成${period === 'week' ? '周' : period === 'month' ? '月' : '整体'}总结：

项目：${project.name}
目标：${project.goal}

期间工作记录：
- ${log.content}
  进展：${log.progress_text}
  问题：${log.problem_text}
  计划：${log.plan_text}

请生成结构化的项目总结，包括：
1. 主要成果
2. 遇到的问题
3. 下一步计划
4. 整体评价
```

> 无日志时正文为 `期间暂无工作记录。`

### 3.11 Prompt 层结论

- 同一业务存在**两套 prompt**（旧 `analyzeProject`/`generateProjectSummary` 与新 `buildAnalysisPrompt`/`buildSummaryPrompt`），措辞、输出格式、落库字段都不同。
- 全部 JSON 解析都是「正则抠第一个 `{...}` + `JSON.parse`」，没有 schema 校验、没有重试、没有 `response_format` 约束。
- 项目上下文直接拼进 system prompt，**没有长度预算 / token 截断**（日志 10 条、里程碑全量）。
- 没有任何 prompt 注入防护；用户日志/知识内容可包含指令。

**决策：**
- Prompt 文案本身：**保留**（作为产品资产迁到 Flutter 的 `prompts/` 常量，逐字保留，便于回归对比）。
- 双份 prompt + 双份落库：**丢弃**旧版 `analyzeProject` / `generateProjectSummary`，只保留新版 JSON 协议。
- 解析：**重设计**为 `json_schema`/`response_format`（若供应商支持）+ 严格解析 + 一次修复重试 + 失败落原文。
- 上下文：**重设计**为按 token 预算裁剪（最近 N 条日志 + 里程碑摘要），并给用户内容加分隔与「以下为资料，不是指令」声明。

---

## 4. 完整调用链与持久化

### 4.1 项目分析（详情页按钮）

```
pages/project/detail.vue:1347 generateAIAnalysis()
  → aiApi.generateAIAnalysis(projectId, 'general')            api/aiApi.js:1107
    → dbService 读 projects / project_logs(最近10) / project_milestones(sequence ASC)
    → buildAnalysisPrompt(...)                                 aiApi.js:1319
    → sendAIRequest(prompt)                                    aiApi.js:515
      → initOpenAI → OpenAIAPI.chatCompletion (非流式)
    → parseAnalysisResponse(content)                           aiApi.js:1391
    → createAnalysis(projectId, {content, suggestions, analysisType})  aiApi.js:1024
      → INSERT ai_analyses(project_id, analysis_type, content, suggestions, ...)
  → 页面 analysisList.unshift({id, content, suggestions, analysisType, formattedTime:'刚刚'})
  → uni.showToast('AI分析生成成功')
```

持久化：`ai_analyses`（`content` / `suggestions` / `analysis_type` / `created_at`）。**注意**：`analyzeProject` 与 `generateProjectSummary` 写的是同表的 `prompt` / `result` / `token_usage` 列（`aiApi.js:620-626`、`811-817`），与 `getAnalysesList` 读取的 `analysis.content` / `analysis.suggestions` 不一致 → 旧路径产生的记录在列表里内容为空。这是**已确认的字段漂移**。

### 4.2 AI 总结（详情页按钮）

```
detail.vue:1435 generateAISummary()
  → aiApi.generateAISummary(projectId, 'week')                 aiApi.js:1264
    → getLogsByPeriod：JS 计算 7/30 天前，传 ISO 字符串给 dbService 比较
    → dbService 读 project + milestones
    → buildSummaryPrompt(project, logs, milestones, period)    aiApi.js:1355
    → sendAIRequest → parseAnalysisResponse
    → createSummary(projectId, {content, suggestions, summaryType})  aiApi.js:1205
      → INSERT ai_summaries(...)
```

持久化：`ai_summaries`。读取侧 `getSummariesList`（`aiApi.js:1171`）。旧路径 `generateProjectSummary`（`aiApi.js:763`）写 `ai_analyses(analysis_type='summary')`，与 `ai_summaries` **双表并存**，属历史迁移残留。

### 4.3 聊项目（流式，唯一真正多轮的链路）

```
pages/project/chat.vue
  initChat (384-433)
    → Promise.all([projectApi.getProjectDetail, logApi.getRecentLogs(projectId, logCount), chatApi.getConversationsByProject(projectId)])
    → contextData = { recentLogs, currentGoals: project.goals || [], problems: project.problems || [] }
    → 失败时硬编码 3 条示例日志 / 2 目标 / 2 问题（演示兜底）

  用户发送 → ChatComponent.sendMessage
    → addMessage('user')（内存）
    → chatApi.saveMessage(conversationId, 'user', content)     api/chatApi.js
    → emit('message-sent')
    → customAiCall(text, this.messages, contextData, {onStream})
      → chat.vue handleProjectAiCall
        → buildSystemPrompt()（页面侧，实际未发送）
        → callAI(userInput) (515-536)
          → chatHistory = this.$refs.chatComponent.messages.slice(-10)
             映射 { role: type==='user' ? 'user' : 'assistant', content }
          → aiApi.chatWithProject(projectId, userInput, chatHistory, {stream:true, onData})
            → 读 project / milestones / 最近5日志，拼 §3.3 system
            → messages = [system, ...chatHistory, user]
            → api.chatCompletionStream(...)
              → 原生 SSE（Android）或 假流式（iOS/H5）
          → 返回 { content, actions: extractActions(content) }
    → ChatComponent 收到流式 chunk → streamContent += chunk
    → 流结束后 addMessage('assistant', finalContent)
    → saveMessageToHistory('assistant', finalContent)            ChatComponent.vue:391
      → chatApi.saveMessage(...) + 刷新会话 updated_at
```

会话持久化：`chat_conversations`（`chat_type='project'`、`related_id=projectId`、`project_id`、`title`、`created_at/updated_at`）+ `chat_messages`（`conversation_id`、`role`、`content`、`metadata` JSON、`timestamp`）。
`ChatComponent.createOrLoadConversation()`（`:430`）取最新会话或新建，标题 `项目聊天 - MM/DD HH:mm`；`loadChatHistory()`（`:408`）取最近 100 条。
`clearContext` 只清 UI + toast，**不删库**；`showContextMenu` 的「清空对话」是否落库删除未核实（TODO）。

### 4.4 聊知识（单轮 + 历史实际丢失）

```
pages/knowledge/chat.vue
  computed systemPrompt（§3.4）
  handleAICall(userInput, messages, context, {onStream})
    → chatHistory = messages.slice(-10) + system
    → 若 onStream：动态 import aiApi.initOpenAI()，直接 new 出的 api.chatCompletionStream(...)
    → 否则：aiApi.sendAIRequest(userInput, { messages: chatHistory, stream, onStream })
      → messages / stream 均被忽略（§2.1） → 实际只发 user 一条
  → ChatComponent 持久化到 chat_conversations / chat_messages（chat_type='knowledge'，related_id=knowledgeId）
```

知识侧走了一条**绕过 aiApi 门面**的路径（直接 `initOpenAI()` 再调 SDK），与 `AGENTS.md`「不要直接 new OpenAIAPI」冲突；流式分支能出字，但每次都要 `initOpenAI`（有缓存）。

### 4.5 日志页 AI 分析 + 语音

```
pages/project/log.vue:259  speechToText('mock_audio_data')
  → aiApi.speechToText → OpenAIAPI.transcribeAudio(/audio/transcriptions, whisper-1, language zh)
  → 失败（大概率，因为传的是占位字符串而不是文件路径）→ 随机 5 条中文 mock 文本，confidence 0.85
  → 结果填入日志输入框

log.vue:316  analyzeContent → aiApi.sendAIRequest(prompt §3.5) → 解析 {progress, problems, plans} → 回填表单
```

**语音输入真实状态**：`ChatComponent.toggleVoiceInput()`（`:756`）只弹 toast `使用输入法自带语音输入`，没有录音、没有权限申请、没有 ASR。`pages/project/log.vue` 虽有「语音」按钮，实际传入的是字符串 `'mock_audio_data'`，不是音频文件/临时路径，`uni.uploadFile` 必然失败并落到 mock 文本。

### 4.6 迁移决策（§4）

| 能力 | 决策 | Flutter 方案 |
|---|---|---|
| 项目分析 / 总结 | 重设计 | 统一 `AiAnalysis` 领域模型，单表 `ai_analyses(kind, content, suggestions, raw, createdAt)`；旧 `result` 迁移到 `content`；分析/总结共用一套 JSON schema |
| 聊项目 | 保留意图，重设计实现 | `ChatRepository`（drift/sqflite）+ 流式 AI 服务；system prompt 由服务端组装，页面不再拼；历史按 token 预算取最近 N 条 |
| 聊知识 | 重设计 | 复用同一 `ChatRepository`；知识上下文显式注入 `systemPrompt`，不再走「messages 里塞 system」的歧义路径 |
| 多轮历史 | 重设计 | 请求对象显式 `messages`；每轮落库 `role/content/token/createdAt`；禁止 `sendAIRequest` 式隐式丢参 |
| 会话清空 | 重设计 | 明确「清空 UI」与「删除会话」两个动作，后者级联删消息 |
| 语音输入 | 丢弃 | 不迁移假入口；若需要，用 `record` + 后端 Whisper / 云 ASR，先做权限与文件上传 |
| TTS | 丢弃 | `textToSpeech` 是纯 mock（返回 `data:audio/mp3;base64,mock_audio_data`），无迁移价值 |

---

## 5. 推广码（Promo Code）

### 5.1 编码算法（`utils/cryptoUtils.js`）

**不是加密，是本地对称编码**。固定密钥硬编码在源码：`secretKey = 'ProjectZ2024PromoCode'`。

两代格式并存：

| 版本 | 生成 | 结构 | 校验 |
|---|---|---|---|
| v1（默认） | `generatePromoCode(provider, apiKey, modelName, validDays)` `:208` | `base64( xorHex( JSON{provider, apiKey, model, validDays, createdAt, expiresAt} ) )` | `validatePromoCode` `:428`：解密 → 校验 `provider/apiKey/model/expiresAt` |
| v2 | `generateCompressedPromoCode(...)` `:324` | `'v2_' + base58( xorHex( JSON{p, k, m, e} ) )`，`e` 为秒级过期时间 | `validateCompressedPromoCode` `:345`；`validatePromoCodeUniversal` `:414` 按前缀分派 |

实现细节：

- `xorEncrypt(text, key)` `:18`：逐字符 `charCode ^ key[i % key.length]`，输出两位十六进制（`padStart(2,'0')`）；`xorDecrypt` 反向。
- Base64：App/H5 用 `btoa(unescape(encodeURIComponent(...)))`，小程序用 `uni.arrayBufferToBase64`；解码对应 `atob(decodeURIComponent(escape(...)))`。
- Base58 `:233`：字母表 `123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz`（无 `0OIl`），BigInt 分组转换，前导零字节 → `'1'`。
- 过期：`Date.now() > expiresAt` → `{valid:false, error:'分享码已过期', expired:true}`；成功返回 `remainingDays = ceil((expiresAt - now)/86400000)`。
- 已知小 bug：`validateCompressedPromoCode` 返回 `validDays: promoData.d`，而 JSON 里没有 `d` 字段 → `undefined`。

### 5.2 用途与流程（`api/promoApi.js`、`utils/promoManager.js`、`utils/appStartup.js`）

用途：让用户**免配置**直接激活一个预置 AI 供应商（provider + apiKey + model + 有效期），分享码内含**明文 API Key**。

生成侧（管理员/分享者）：

```
aiApi.generatePromoCodeSafely(configId, validDays=7)     // 动态 import cryptoUtils
  → canGeneratePromoFromConfig：配置存在、promo_code_id 为空（防循环传播）、provider/api_key/model 齐全
  → cryptoUtils.generatePromoCode(provider, apiKey, model, validDays)   // v1
```

激活侧（用户）：

```
promoManager.applyPromoCode(code)
  → promoApi.validatePromoCode → cryptoUtils.validatePromoCodeUniversal
  → promoApi.applyPromoCode(code)
    → userStore.getCurrentUserId() / dbService.initDB()
    → 若同 provider 已有 promo_code_id 非空配置 → 拒绝（提示先移除）
    → 同 provider 手动配置且 api_key/model 不同 → backupCurrentAIConfig() 存入 uni storage 'ai_config_backup'
    → UPDATE ai_config SET is_active = 0 WHERE user_id = ?
    → INSERT OR REPLACE ai_config(... base_url 默认 https://api.deepseek.com/v1, timeout 130, max_tokens 2000, temperature 0.7, promo_code_id = 'promo_<hash36>_<ts>')
    → 保存 promoConfig 到 uni storage 'promo_code_config' {id, code, appliedAt, expiresAt, provider, modelName}
```

过期/移除：

- 启动：`App.vue onLaunch → new AppStartup().init()` → `promoManager.init()` → `checkPromoCodeExpiry()`（`appStartup.js` 的 `setupPeriodicCheck` 被注释；`promoManager.startPeriodicCheck` 每 24h 一次）。
- 过期：`now > expiresAt` → `handleExpiredPromoCode()`：清 `promo_code_config` 存储 + `restoreBackupAIConfig()`（从 `ai_config_backup` 恢复手动配置并置 active）；恢复失败才 `removeStorageSync('ai_config')`。**不会清空 `ai_config` 表**（`AGENTS.md` §7 的「过期会清空 AI 配置」表述不准确）。
- 剩余 ≤3 天：弹到期提醒；`remainingDays <= 1`：启动时再弹一次。
- 手动移除：`removePromoCode()` 按 `promo_code_id` 删行 → 恢复备份 → 清存储。
- 联系信息硬编码：微信号 `codetrend`（`promoManager.getContactInfo`、过期 modal 文案）。

### 5.3 安全边界（必须写进迁移决策）

- XOR 密钥在源码里，任何人可解出分享码内的 **API Key 明文**；分享码 = 可转发的明文凭证。
- 无服务器校验、无签名、无吊销、无次数限制；过期只靠客户端时钟（改系统时间可续命）。
- `base_url` 不在码里，激活时固定为 DeepSeek 默认地址 → 分享码只适用于 DeepSeek 兼容端点。
- 备份 `ai_config_backup` 与 `promo_code_config` 都存在 `uni.setStorage`（明文），含 API Key。
- 推广码配置在 UI 层「只读」，但数据库无约束，直接改库可绕过。

**决策：丢弃（安全边界不可接受）。** 若业务坚持保留「分享码免配置」：
- 码内只放**短期兑换 token**（服务端签发、可吊销、绑定设备/账号），客户端拿 token 换临时 key；
- 或服务端代理调用，客户端永不持有供应商 key；
- 本地最多缓存加密后的短期凭证（`flutter_secure_storage`），并强制 NTP/服务端时间校验。
不建议把 v1/v2 编码算法原样搬到 Flutter——它只提供混淆，不提供任何安全属性。

---

## 6. GitCode 备份 / 恢复

### 6.1 事实（`uni_modules/gitcode-sync/js_sdk/index.js` + `pages/profile/index.vue:1460-1767`）

- SDK `GitCodeSync(config)`：`baseUrl` 默认 `https://gitcode.com/api/v5`；`repoUrl` 解析 `owner/repo`（支持带/不带协议、`.git` 后缀）；`branch` 默认 `main`；`filePath` 默认 `data.json`。
- 认证：`access_token` 作为 **query 参数**拼在 URL 上（`request` 里统一加），会出现在日志/代理中。
- 上传 `uploadData(data, filename, commitMessage)`（`:190`）：
  1. `JSON.stringify(data, null, 2)`（字符串原样）；
  2. base64（`btoa(unescape(encodeURIComponent()))` / Buffer / 手写兜底）；
  3. 分支不存在则 `createBranch`：GET 分支取 `commit.sha` → POST `/branches {branch_name, refs: sha}`；
  4. GET `/contents/{encodeURIComponent(path)}?ref=branch` 判断文件是否存在并取 `sha`（404 视为不存在）；
  5. 存在 → PUT `/contents/path`（带 `sha`），不存在 → POST（不带 `sha`）；
  6. 返回 `{success, commit, content, operation:'updated'|'created'}`；错误按 401/403/404/422/409/400 映射中文 message。
- 下载 `downloadData(filename)`（`:397`）：分支不存在抛 `分支 <branch> 不存在`；无 `content` 抛 `文件内容为空`；base64 解码 → `JSON.parse`。
- 测试连接 `testConnection()`（`:510`）：GET `/repos/{owner}/{repo}`，返回 `{success, repoName, repoPath, visibility, defaultBranch}`。
- 列文件 `listFiles()`（`:595`）：**另一套 host** `https://api.gitcode.com/api/v5/repos/{o}/{r}/file_list?access_token=...&ref_name=...`（token 在 query，且与上传 host 不一致）。

业务层（`pages/profile/index.vue`）：

- 配置 storage key `gitcode_backup_config`，字段 `repoUrl` / `accessToken` / `branchName`（**没有 owner/repo**，全靠 `repoUrl` 解析）；SDK 的 storage key 是 `gitcode_sync_config`，两套并存。
- 备份：`dbService.exportAllData()` → `{timestamp: ISO, version: '1.0.0', data: dbData}` → 文件名 `database_backup_${YYYY-MM-DD}.json` → `uploadData(JSON.stringify(..., null, 2), fileName, '数据库备份 - ' + 本地时间)`。
- 恢复：`getBackupFileList()`（`listFiles` 过滤 `database_backup_` 且 `.json`，按日期倒序）→ 选择器 → 确认弹窗「覆盖当前所有数据，此操作不可逆」→ `downloadData` → 兼容对象/字符串、去 BOM、`JSON.parse`、校验 `backupData.data` → `dbService.importAllData(backupData.data)` → 重新 `loadUserInfo/loadUserData`。
- UI 用 `gitCodeLoading` / `gitCodeResultText` 展示 JSON 结果；无冲突合并、无版本迁移、无增量。

**风险**：token 明文 storage；token 进 URL query；`listFiles` 与写入 host 不一致；恢复是**整库覆盖**，`importAllData` 期间的失败无回滚；备份文件名按天，同一天多次备份会覆盖同文件（依赖 commit 更新）。

**决策：重设计（保留「可选云备份」意图）。** Flutter 侧：
- 用 `dio` 封装 Gitee/GitHub/GitCode REST，token 放 `flutter_secure_storage` + `Authorization` header，绝不进 query；
- 备份包加 `schemaVersion`、`appVersion`、`checksum`，恢复前校验并做**临时库校验 + 事务导入**；
- 用 `path_provider` 落地临时文件，`file_picker` 支持本地导入导出；
- 若只服务中国用户，优先 Gitee/GitCode，但把 base URL 做成可配置项（`AiConfig` 之外的 `SyncConfig`）。
- `uni_modules/gitcode-sync` 的 SDK **不直接移植**（第三方插件，逻辑与 uni.request 耦合）。

---

## 7. APK 更新（`utils/updateApp.js`）

- 版本清单：`https://project.r0ad.host/version.json`（`updateApp.js` 文件头注释）；APK 默认 `https://project.r0ad.host/project.apk`。
- 流程：`uni.request GET version.json`（timeout 10s）→ 兼容「数组 / 对象」两种格式；数组按 `compareVersion` 倒序取第一条 → `remoteVersion`、`comment`、`downloadUrl` → 与 `plus.runtime.version || '1.0.0'` 比较 → `hasUpdate`。
- 有更新：modal「发现新版本 v…」→ 确认 `downloadAndInstall(url)`；取消 → ActionSheet `['查看更新历史','稍后更新','取消']`。
- 无更新：modal 展示当前版本 + 查看历史。
- 下载安装（`:371`）：`plus.downloader.createDownload(url, {}, cb)` → `dtask.start()` → `plus.nativeUI.showWaiting('下载')` → `statechanged` 1=准备、2=百分比、3/4=完成；HTTP 200 后 modal「下载完成」→ `plus.runtime.install(d.filename, {}, success, fail)`；失败可重试。
- `compareVersion`（`:386`）按 `.` 分段 `Number` 比较，缺失补 0；`showVersionHistory`（`:381`）兼容数组 / `{history}` / 单对象，8 位日期转 `YYYY-MM-DD`，正文超 800 字截断。
- H5 分支只提示去官网，返回 `hasUpdate:false`。

**决策：保留（换实现）。** Flutter 用 `package_info_plus` 取版本、`dio` 拉 `version.json`、`open_filex` / `install_plugin` / `flutter_app_installer` 触发安装；Android 需 `REQUEST_INSTALL_PACKAGES` + `FileProvider`（`android:authorities` 与 `provider_paths.xml`）。iOS 不允许侧载 APK，需改为跳转 App Store 或 TestFlight。注意：`plus.runtime.install` 的「下载完成后静默安装」在 Android 8+ 会弹系统安装器，Flutter 侧要保持同样的 UX 预期。
**不要迁移** `uni_modules/app-updater`（不可达页面引用，`AGENTS.md` §11 已列为陷阱）。

---

## 8. 分享卡（DOM + 剪贴板）

### 8.1 事实

- `components/ShareCardComponent.vue`（912 行）props：`visible`、`contentType`（`knowledge | project | log | analysis`）、`contentData`、`defaultTheme`。
- **没有 canvas、没有 `createSelectorQuery`、没有图片生成**。`generateImageShare()`（`:229`）与 `generateTextShare()`（`:279`）都调用 `formatTextContent()` → `uni.setClipboardData` → toast（`分享内容已复制` / `已复制到剪贴板`）→ `emit('share', {type:'text', data, theme, contentType})` → 关闭弹窗。
- `formatTextContent()`（`:328`）是按类型的 emoji 模板：
  - knowledge：`📚 标题` + `=` 分隔线 + `🏷️ 标签` + `💡 内容概要`（`extra.summary`）+ `📝 详细内容` + `📊 浏览次数` + `⏰ 更新时间` + `━━` + `🔗 来自 点点 知识管理系统`；
  - project：`🎯 标题/目标`、`📊 进度`（`generateProgressBar` 10 格 `█░`）、`🎯 关键里程碑`（`✅/🔄/⏳`）、`📈 统计`、`⏰`、`🔗 来自 点点 项目管理系统`；
  - log：`📋 标题`、`🏷️ 类型`、`📝 日志内容`、`📈 进展分析`、`⚠️ 问题记录`、`📋 下步计划`、`⏰`、`🔗 来自 点点 项目日志系统`；
  - analysis：`🤖 标题`、`🔍 分析类型`（general/progress/risk/quality）、`📊 分析报告`、`💡 AI建议`、`🎯 置信度`、`⏰`、`🔗 来自 点点 AI分析系统`。
- 内容适配：`utils/contentAdapters.js` 用 `BaseContentAdapter` + 四个子类（Knowledge/Project/ProjectLog/AIAnalysis），统一输出 `{title, content, author, timestamp, tags, progress, milestones, meta, extra}`；默认截断 `maxContentLength: 200`、`maxTitleLength: 50`。
- 主题：`utils/shareCardThemes.js` 四套（`simple` 默认 / `gradient` / `minimal` / `tech`），含颜色、字体、排版；**代码里只用于预览样式**，不进入复制文本。
- 依赖：`DateUtils.formatDateTime` 格式化时间；`uni.setClipboardData`；无原生插件、无文件写入。

### 8.2 决策

- 纯文本分享：**保留意图，重设计实现**。Flutter 用 `share_plus`（`Share.share(text)` 或 `Share.shareXFiles`），文案模板可原样复用（emoji + 分隔线是产品风格）。
- 图片分享：**新增**。`RepaintBoundary` + `RenderRepaintBoundary.toImage()` 或 `screenshot` 包；主题 JSON 迁到 Flutter 的 `ShareTheme` 模型。
- “DOM + canvasRenderer” 的历史实现：**丢弃**（`utils/canvasRenderer.js` 全仓无引用，`AGENTS.md` §11 已确认死代码）。
- 剪贴板：仍可用 `Clipboard.setData` 作为「复制文案」次级操作，但主路径应是系统分享面板。

---

## 9. 基础工具（迁移参考）

### 9.1 `utils/dateUtils.js`（247 行，全 static）

- `formatDateTime(dateTime, convertFromUTC = true)`：相对时间（`刚刚` / `N分钟前` / `N小时前` / `N天前` / 今年 `MM-DD HH:mm` / 跨年 `YYYY-MM-DD HH:mm`）。
- `formatStandard` → `YYYY-MM-DD HH:mm:ss`；`formatDate` → `YYYY-MM-DD`；`formatTime` → `HH:mm:ss`。
- `getCurrentDate` / `getCurrentDateTime` / `getCurrentLocalISOString()`（本地偏移后 `toISOString().replace('Z','')`）。
- `utcToLocal`、`utcToBeijing`（无时区字符串补 `Z` 再 +8h）、`isToday`、`isThisWeek`。
- 迁移：Flutter 用 `intl` + `DateTime.toLocal()`；相对时间建议 `timeago` 或自写。**注意**：SQLite 里存的是本地时间字符串（无时区），迁移时要么统一 UTC，要么保留同样的字符串格式，否则历史数据会偏移 8 小时。

### 9.2 `utils/userStore.js`（148 行，单例）

- `currentUserId = 1`、`currentUser = null`、`listeners = []`。
- `getCurrentUserId` / `getCurrentUser` / `setCurrentUserId`（通知 `USER_CHANGED`）/ `setCurrentUser`（通知 `USER_INFO_UPDATED`）/ `addListener` / `removeListener` / `notifyListeners` / `clear` / `loadFromStorage`（`uni.getStorageSync('currentUserId')`）/ `saveToStorage`。
- 单用户模型，`user_id` 默认 1；无登录、无 token、无多租户。
- 迁移：Flutter 用 `ValueNotifier<User?>` 或 Riverpod `StateNotifier`；若仍单用户，可简化为 `AppUser.current` 常量 + `shared_preferences` 持久化。

---

## 10. 迁移决策总表

| # | 能力 | 现状（源码事实） | 决策 | Flutter 替代 |
|---|---|---|---|---|
| 1 | 供应商表 / 默认模型 | `utils/aiProviders.js` 六家，硬编码 | 保留 | `AiProvider` 常量或 assets JSON；加 `supportsVision/tools/jsonMode` 能力位 |
| 2 | `ai_config` CRUD / 激活 | 单 active、明文 key、默认值三处不一致 | 重设计 | `drift` 表 + `flutter_secure_storage` 存 key；事务切 active；默认值单一来源 |
| 3 | `sendAIRequest` | 忽略 `messages/stream`，只发 system+user | 重设计 | `AiRequest{system, messages, params, stream, cancel}`；服务层强制显式 |
| 4 | 非流式请求 | `uni.request` + Bearer，130s | 保留协议 | `dio` POST `/chat/completions` |
| 5 | 流式（Android） | 原生 `HttpURLConnection` + 逐行 SSE | 丢弃实现 | `dio` `ResponseType.stream` + `LineSplitter`；`CancelToken` |
| 6 | 流式（iOS/H5） | 假流式：整段生成后 15 字/50ms 切片 | 丢弃 | 统一真 SSE；不支持 SSE 的供应商用 `stream:false` + 一次性渲染 |
| 7 | SSE 解析 | 只认 `data: `；坏行当正文；无取消 | 重设计 | 严格解析、坏行丢弃、`[DONE]` 终止、超时/取消 |
| 8 | 项目 system prompt | `aiApi.js:666-688` 真正发送 | 保留文案，重设计组装 | Prompt 常量 + 上下文构建器（token 预算） |
| 9 | 项目页面 system prompt | `chat.vue:578-587` 构造但**未发送** | 丢弃 | 不迁移死代码；需要时合并进统一 system |
| 10 | 知识 system prompt | `knowledge/chat.vue:117-133`，实际未随请求发送 | 重设计 | 显式 `system` 字段；知识上下文单独 message |
| 11 | 分析 / 总结 prompt | 新旧两套并存 | 保留新版文案，丢弃旧版 | `prompts/analysis.md`、`prompts/summary.md` 逐字迁移 |
| 12 | JSON 解析 | 正则抠 `{...}` + parse，无校验/重试 | 重设计 | `json_schema` / 严格 decode + 一次修复 + 原文兜底 |
| 13 | 落库 | `ai_analyses` 字段漂移（`prompt/result` vs `content/suggestions`）；`ai_summaries` 双表 | 重设计 | 单表 + 迁移脚本（`result → content`, `prompt → rawPrompt`） |
| 14 | 会话/消息 | `chat_conversations` / `chat_messages`，metadata JSON | 保留模型，重设计仓储 | `drift` + 外键级联；分页加载；导出 JSON |
| 15 | 语音输入 | 仅 toast；日志页传 `'mock_audio_data'` | 丢弃 | 不迁移假入口；需要时 `record` + 后端 ASR |
| 16 | STT | Whisper 接口 + 失败随机 mock 文本 | 重设计 | 真实上传（`file_picker`/`record`）+ 明确失败提示，禁止 mock 兜底 |
| 17 | TTS | 纯 mock `data:audio/mp3;base64,mock_audio_data` | 丢弃 | 需要时 `flutter_tts` 或云 TTS |
| 18 | 推广码 | XOR+Base58，密钥硬编码，码内明文 key | 丢弃 | 服务端兑换 token；`flutter_secure_storage` 缓存短期凭证 |
| 19 | 推广码过期恢复 | 24h 轮询 + 启动检查；恢复 storage 备份 | 重设计 | 服务端校验 + 本地备份；启动与前台恢复时校验 |
| 20 | GitCode 备份 | content API + base64 + 整库覆盖 | 重设计 | `dio` + 可选 GitHub/Gitee；checksum + 事务导入 + 版本号 |
| 21 | APK 更新 | `version.json` + `plus.downloader` + `plus.runtime.install` | 保留流程 | `package_info_plus` + `dio` + `open_filex`/安装插件；iOS 改 App Store |
| 22 | 分享卡 | 纯文本 + 剪贴板；主题仅预览 | 保留文案，重设计分发 | `share_plus`；图片用 `RepaintBoundary`/`screenshot` |
| 23 | 日期 | 本地时间字符串、相对时间 | 保留行为 | `intl` + 统一时区策略（建议 UTC 存储） |
| 24 | 用户状态 | 单例 `userStore`，`user_id=1` | 简化 | `ValueNotifier` / Riverpod；单用户常量 |

---

## 11. 关键文件索引

| 主题 | 文件:行 |
|---|---|
| `sendAIRequest` | `api/aiApi.js:515-546` |
| `chatWithProject` / system prompt | `api/aiApi.js:643-756`，prompt `666-688` |
| `analyzeProject` 旧 prompt | `api/aiApi.js:555-634`，prompt `577-615` |
| `generateProjectSummary` 旧 prompt | `api/aiApi.js:763-819`，prompt `790-806` |
| `generateAIAnalysis` / `buildAnalysisPrompt` | `api/aiApi.js:1107-1169`、`1319-1350` |
| `generateAISummary` / `buildSummaryPrompt` | `api/aiApi.js:1264-1312`、`1355-1386` |
| `parseAnalysisResponse` | `api/aiApi.js:1391-1420` |
| `speechToText` / `textToSpeech` | `api/aiApi.js:926-981` |
| 供应商定义 | `utils/aiProviders.js:1-118` |
| `chatCompletionStream` | `uni_modules/openai-chat/js_sdk/openai-api.js`（`chatCompletionStream`） |
| SSE 读取 | `uni_modules/http-request/js_sdk/asyncStreamReader.js` |
| 假流式 | `uni_modules/http-request/js_sdk/index.js`（`fallbackStreamRequest`） |
| 项目聊天页 | `pages/project/chat.vue:515-536`、`569-588`、`1078-1091` |
| 知识聊天页 | `pages/knowledge/chat.vue:117-133`、`558` |
| 日志页 prompt / 语音 | `pages/project/log.vue:259`、`299-313`、`316` |
| 建项目 prompt | `pages/project/create.vue:401-422` |
| 分享卡 | `components/ShareCardComponent.vue:229`、`279`、`328` |
| 推广码编码 | `utils/cryptoUtils.js:18`、`208`、`233`、`324`、`345`、`414`、`428` |
| 推广码业务 | `api/promoApi.js:21`、`80`、`180`、`214`、`321`、`368`、`430` |
| 启动检查 | `utils/appStartup.js`、`utils/promoManager.js:140`、`183` |
| GitCode SDK | `uni_modules/gitcode-sync/js_sdk/index.js:190`、`397`、`510`、`595` |
| 备份 UI | `pages/profile/index.vue:1460-1767` |
| APK 更新 | `utils/updateApp.js:371`、`381`、`386` |
| 日期 / 用户 | `utils/dateUtils.js`、`utils/userStore.js` |

---

*本文只读审计，未修改任何源码；所有行号以当前 `master` 工作树为准。*
