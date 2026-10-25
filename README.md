<div align="center">
  <img src="static/logo.png" width="96" alt="点点 Logo">
  <h1>点点 · Project Z</h1>
  <p>指日可待 —— 本地优先的 AI 轻量项目管理 App</p>
</div>

![version](https://img.shields.io/badge/version-1.0.6-165DFF)
![uni-app](https://img.shields.io/badge/uni--app-Vue%203-00B42A)
![license](https://img.shields.io/badge/license-MIT-F53F3F)

**点点**是用 uni-app + Vue 3 编写的 AI 驱动项目管理 App。它把「设定目标 → 记录执行 → AI 分析 → 沉淀知识」做成一条闭环：AI 把一句朴素的目标拆成可执行的里程碑，日志里的碎碎念会被整理成「进展 / 问题 / 计划」，项目结束后经验可以沉淀进知识库。

所有业务数据都保存在手机本地 SQLite 中，AI Key 也只存本地表；联网只发生在调用你配置的 AI 服务、以及你主动触发的 GitCode 备份恢复和 APK 更新检查。主目标是 App-Plus（Android / iOS），当前版本 **1.0.6**。

## 界面预览

> 仓库暂未附带运行截图。下表是 `pages.json` 里真实注册的页面及其主要界面元素，均可对照源码核对。

| 页面 | 路由 | 主要界面 |
|---|---|---|
| 项目列表 | `pages/project/list` | 项目卡片：状态标签、进度条、里程碑 N/M、最近节点；顶部新建项目；未配置 AI 时提示「使用分享码 / 手动配置 AI」 |
| 新建项目 | `pages/project/create` | 三步向导：模板或自定义 → 基本信息 → 可选详情；可选择内置案例模板快速填充 |
| 项目详情 | `pages/project/detail` | 四个标签页：目标与节点、项目日志、AI 分析、总结；里程碑增删改与进度勾选 |
| 记录日志 | `pages/project/log` | 日期、正文输入、AI 一键拆解为进展 / 问题 / 计划 |
| 聊项目 | `pages/project/chat` | 基于项目上下文的多轮对话，流式输出并持久化会话 |
| 知识库 | `pages/knowledge/index` | 关键词搜索、标签筛选、卡片列表、收藏状态 |
| 新增知识 | `pages/knowledge/create` | 标题、正文、最多 5 个标签（含推荐标签）、关联项目、相关知识 |
| 知识详情 | `pages/knowledge/detail` | 正文、标签、收藏、分享卡、相关知识 |
| 聊知识 | `pages/knowledge/chat` | 以某条知识为上下文的 AI 问答 |
| 我的 | `pages/profile/index` | 收藏入口、AI 设置、分享码、云备份、修复应用、帮助中心、意见反馈、版本检查更新、本地档案切换 |
| AI 设置 | `pages/profile/ai-settings` | 供应商与模型、温度 / 超时 / max_tokens、测试连接、多配置激活 |
| 数据统计 | `pages/profile/stats` | 折线图与汇总卡片（入口暂未开放，见「已知限制」） |

## 功能亮点

### 目标与执行

- **项目与里程碑**：`api/projectApi.js` 提供项目、里程碑的增删改查；项目进度不是手动填的，而是「已完成里程碑 / 总数」推导，达到 100% 自动置为已完成。
- **AI 拆解目标**：新建项目时把名称 / 目标 / 描述交给 `aiApi.sendAIRequest`，返回 SMART 目标与关键节点；解析失败会自动回退到原始输入，不阻塞创建流程。也可以用 `utils/projectCases.js` 内置的技术开发 / 学习成长等分类模板一键填入。
- **日志**：`api/logApi.js` 负责日志增删改查、最近日志、关键词搜索、时间线与统计；正文可交给 AI 拆成「进展 / 问题 / 计划」三栏。

### AI 分析与沉淀

- **分析与总结**：项目详情页可生成、编辑、删除分析与周总结，分别落在 `ai_analyses` / `ai_summaries` 表。
- **对话**：`components/ChatComponent.vue` 负责消息渲染与流式滚动，会话持久化在 `chat_conversations` / `chat_messages`；项目与知识两条线共用它。
- **知识库**：`api/knowledgeApi.js` 提供知识 CRUD、标签、关联项目、相关知识、收藏与浏览计数。
- **分享卡**：`components/ShareCardComponent.vue` 支持项目 / 日志 / 分析 / 知识四种内容与 4 套主题（简约、渐变、极简、科技），通过剪贴板复制文字分享。

### AI 接入

- **6 家供应商**：OpenAI、DeepSeek、硅基流动、Kimi、阿里云通义千问、自定义兼容端点（`utils/aiProviders.js`）。
- **配置只存本地**：base_url / API Key / 模型 / 超时 / max_tokens / temperature 存在 `ai_config` 表，由 AI 设置页录入，可保存多套并一键激活。
- **分享码**：`utils/cryptoUtils.js` 把一套 AI 配置编码成 `v2_` 前缀的分享码，粘贴即可激活；激活前会备份原配置，到期后自动清理（`utils/promoManager.js` + `utils/appStartup.js`）。
- **流式输出**：`aiApi.chatWithProject(..., { onStream })` → `uni_modules/openai-chat/js_sdk` → `uni_modules/http-request`。

### 本地优先

- **SQLite 单库**：`utils/dbService.js` 是唯一数据库门面，15 张表覆盖项目、里程碑、日志、AI 分析 / 总结、对话、知识、收藏、设置与 AI 配置。
- **版本化升级**：库结构由 `utils/dbUpgradeConfig.js` 管理（当前 1.1.0），升级脚本按版本追加，不改写已发布版本。
- **云端只做两件事**：用户主动的 GitCode 备份 / 恢复（`uni_modules/gitcode-sync`），以及启动时的 APK 更新检查（`utils/updateApp.js` 拉取 `version.json`）。

## 技术栈

| 层 | 选型 | 说明 |
|---|---|---|
| 框架 | uni-app + Vue 3 | `manifest.json` `vueVersion: "3"`；页面用 Options API |
| UI | nutui-uniapp 1.8 | easycom 自动注册（`<nut-button>`、`<nut-icon>` 等）；自定义导航栏 `CustomNavbar` |
| 样式 | SCSS + rpx | 以 750 设计稿为基准，`transformPx: false`；主色 `#165DFF` |
| 数据 | SQLite（`plus.sqlite`） | 库文件 `ai_project_manage.db`，位于 `_doc/`，仅 App-Plus 可用 |
| AI | openai-chat 的 js_sdk | 兼容 OpenAI Chat Completions 协议，请求经 http-request 发出 |
| 图表 | qiun-data-charts | 数据统计页折线图 |
| 云端 | gitcode-sync | 配置仓库 URL + 访问令牌后手动备份 / 恢复数据库 |
| 构建 | HBuilderX | `package.json` 没有 `dev` / `build` 脚本，不自建 vite / webpack |
| 测试 | Jest 27 | `tests/` 分 unit / integration / app / pages / e2e |

## API 层速览

页面只允许调用 `api/*` 这一层，字段映射（snake_case → camelCase）也在这一层完成。

| 文件 | 职责 |
|---|---|
| `api/projectApi.js` | 项目与里程碑 CRUD、进度推导（`updateProjectProgress`）、项目统计 |
| `api/logApi.js` | 日志 CRUD、最近日志、关键词搜索、时间线、日志统计 |
| `api/knowledgeApi.js` | 知识 CRUD、标签、关联项目、相关知识、收藏、知识统计 |
| `api/chatApi.js` | 会话与消息持久化、AI 使用统计 |
| `api/favoriteApi.js` | 收藏的项目 / 知识增删查、收藏统计 |
| `api/aiApi.js` | AI 配置管理、请求封装、分析与总结生成、流式对话、语音接口 |
| `api/promoApi.js` | 分享码校验与应用、原配置备份 / 恢复、过期处理 |
| `api/userApi.js` | 本地用户档案、头像选项、当前档案切换 |

## 数据库

库结构以 `utils/dbUpgradeConfig.js` 的脚本为准（当前版本 1.1.0），共 15 张业务表：

| 领域 | 表 |
|---|---|
| 项目 | `projects`、`project_milestones`、`project_logs` |
| AI | `ai_config`、`ai_analyses`、`ai_summaries`、`chat_conversations`、`chat_messages` |
| 知识 | `knowledge_base`、`knowledge_tags`、`knowledge_tag_mappings`、`project_knowledge_mappings` |
| 收藏 | `favorites` |
| 用户与设置 | `users`、`settings`（含 `system.db_version`） |

改表时在 `dbUpgradeConfig.js` **末尾追加新版本号**并同步升级顺序，不要修改已发布版本的脚本。

## 快速开始

### 环境要求

- HBuilderX（App 开发版即可）
- Node.js（仅安装依赖与跑测试时需要）
- Android 手机或模拟器（推荐；SQLite 只在 App 端存在）

### 导入与运行

1. 克隆仓库，用 HBuilderX 打开**仓库根目录**（源码就在根目录，没有 `app/` 之类的子工程，历史文档里的该目录已删除）。
2. 执行 `npm install`（主要依赖是 nutui-uniapp 组件与 Jest 测试工具）。
3. HBuilderX 菜单「运行」→「运行到手机或模拟器」→ 选择设备，等待标准基座安装完成。
4. 首次启动会在控制台打印 `数据库初始化成功`，随后进入项目列表。

> ⚠️ 本项目没有 `npm run dev`，不是 CLI 工程，请不要自行搭建 vite / webpack 开发服务。H5 / 小程序预览能跑起来，但数据库相关功能会失败，**功能验证请以 App 端为准**。

### 配置 AI

1. 打开「我的 → AI 设置」，选择供应商，填写 Base URL、API Key 与模型。
2. 点「测试连接」，通过后「激活」该配置，列表页与详情页的 AI 能力即可使用。
3. 也可以直接用「分享码」：粘贴一段 `v2_` 开头的码即可秒配（码内已含 provider / key / model）。

## 项目结构

```text
project-z/
├── pages/                  # 页面：project / knowledge / profile / demo
├── api/                    # 8 个数据与 AI 封装，页面只允许调用这一层
├── utils/                  # dbService、dbUpgradeConfig、aiProviders、userStore、updateApp…
├── components/             # ChatComponent、CustomNavbar、ShareCardComponent、ua-markdown
├── custom-tab-bar/         # 底部导航（无原生 tabBar，nut-tabbar 实现）
├── uni_modules/            # openai-chat、http-request、gitcode-sync、qiun-data-charts、app-updater、file-manager
├── static/                 # 图片资源与 App 图标（static/app-icons/）
├── tests/                  # unit / integration / app / pages / e2e
├── doc/、intro/            # 设计文档（doc/03-design/）与下载落地页
├── App.vue                 # 启动链路：建库 → 索引 → 默认用户 → 分享码校验 → 检查更新
├── pages.json              # 页面注册与 easycom 配置
└── manifest.json           # App 配置：appid、版本、权限、图标
```

**分层**：`pages → api/* → utils/dbService → plus.sqlite`。页面不直接操作数据库，API 层不弹 toast、不跳路由；字段映射（snake_case → camelCase）在 API 层完成；AI 调用统一走 `api/aiApi.js`。

## 数据与隐私

- **业务数据全在本地**：`ai_project_manage.db`，不上传服务器。没有账号体系，只有本地档案（默认 `user_id = 1`，可在「我的」里切换或新建本地档案）。
- **AI Key 存 `ai_config` 表**：代码里不写任何默认 Key，也不应把 Key 提交到仓库。
- **只在两种情况下联网**：调用你配置的 AI 供应商；启动时请求远程 `version.json` 检查 APK 更新。
- **GitCode 备份是用户主动操作**：「我的 → 云备份」里自行填写仓库 URL 与访问令牌后手动备份 / 恢复，令牌同样只落本地。
- **分享码不是安全机制**：它是 XOR + Base58 的本地对称编码，任何拿到码的人都能还原出其中的 AI 配置，请只在可信范围内传递。

## 测试

```bash
# 全量（约 18 个测试文件，务必加 --forceExit）
npm test -- --forceExit

# 分层
npm run test:unit
npm run test:app
npm run test:pages

# 单文件（推荐，最快）
npx jest --config tests/jest.config.unit.js \
  --runTestsByPath tests/unit/api/projectApi.test.js --forceExit
```

测试通过 `tests/setup/uniapp.setup.js` mock `uni` / `plus`，不连真库；`@/` 别名由 `jest.config.js` 的 `moduleNameMapper` 映射到仓库根。**部分用例会留下未关闭的异步句柄，不加 `--forceExit` 会挂住不退出**，因此不建议把全量套件当 CI 门禁。e2e 配置在 `tests/jest.config.e2e.js`，需要真机或模拟器。

## 常见问题

**Q：H5 或小程序预览时页面空白 / 报「数据库初始化失败」？**
`plus.sqlite` 只存在于 App-Plus，`utils/dbService.js` 的 `initDB()` 会显式检查并抛错。请用 HBuilderX 运行到手机或模拟器，功能验证以 App 端为准。

**Q：AI 功能一直提示未配置服务？**
先在「我的 → AI 设置」填好供应商、Base URL、API Key 与模型，点「测试连接」，再「激活」；或者用「分享码」粘贴一段 `v2_...` 的码直接激活。

**Q：数据存在哪里？卸载 App 会丢吗？换手机怎么迁移？**
全部在应用私有目录 `_doc/ai_project_manage.db`，卸载 App 时该目录通常会随应用数据一起删除。迁移方式：旧机「云备份」上传数据库文件，新机填同样的仓库 URL + 访问令牌后「恢复」；库结构版本不同时，启动的升级流程会按 `dbUpgradeConfig.js` 逐版本补齐。

不支持多端实时同步：这是本地优先的单机应用，没有服务端，也没有账号体系。

## 已知限制与完成度

这是一个可自用的个人项目，不是生产级产品；以下限制都能在源码里找到对应位置：

| 限制 | 说明 |
|---|---|
| 平台 | 主目标 App-Plus；**H5 / 小程序未验证**，端上不存在 `plus.sqlite`，数据库相关功能必然失败 |
| iOS | 工程保留了 iOS 配置，但**未上架、未签名分发**；作者主要在 Android 上验证 |
| 语音 | 记录日志页有语音入口，实际会提示「使用输入法自带语音输入」，转写仍是 mock 数据 |
| 知识 AI 分析 | 新增知识页的「AI 分析」按钮是 TODO 占位（`pages/knowledge/create.vue`） |
| 数据统计 | `pages/profile/stats` 页面已实现折线图，但「我的」里的入口被标记为待开发；部分图表与明细仍是占位数据 |
| 分享卡 | 「生成图片」当前同样是复制文字到剪贴板，尚未落地为真图片导出 |
| 多轮记忆 | `sendAIRequest` 只读 `systemPrompt`、忽略 `messages`，部分多轮场景会丢失历史 |
| 死页面 | `pages/index/index.vue` 与 `pages/demo/` 下三个示例页未注册进 `pages.json`，demo 入口按钮会跳转失败 |
| 分享码 | 本地对称编码，不是加密，也不做权限校验 |
| 测试 | 只覆盖 api / utils 的纯逻辑，页面与端到端基本无覆盖 |
| 发布 | 未上架任何应用商店；APK 走 `version.json` 自更新，需要自行签名打包 |

## 参与贡献

- 动手前请先读 [AGENTS.md](AGENTS.md)，它是本仓库对架构、分层、数据库升级与测试方式的权威约定。
- 开发环境、分支 / 提交规范与 PR 要求见 [CONTRIBUTING.md](CONTRIBUTING.md)；社区行为准则见 [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
- 安全问题请按 [SECURITY.md](SECURITY.md) 私下报告，不要在公开 issue 里贴 Key 或漏洞细节。
- 提交前至少跑一遍受影响文件的单测（加 `--forceExit`）；改了数据库结构或页面，还要上 App 手工验证关键路径。

## 许可证

本项目基于 [MIT](LICENSE) 许可证开源。

---

**点点 · 指日可待**
