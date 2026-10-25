# AGENTS.md — Project Z（点点）

> 本文件是本仓库对 AI 编码代理的唯一权威约定。
> 与 `.cursorrules`、`.trae/rules/`、`README.md` 冲突时**以本文件为准**（那几份已过期，见 §11）。
> 事实优先级：**源码 > `doc/03-design/` > `README.md` > `.cursorrules`**。改代码前先读本文件，再读对应源码。

## 1. 项目是什么

- 产品名「点点」（Project Z，slogan「指日可待」）：AI 驱动的轻量项目管理 App，闭环为 **设定目标 → 记录执行 → AI 分析 → 沉淀知识库**。
- 技术栈：**uni-app + Vue 3**（`manifest.json` `vueVersion: "3"`），用 **HBuilderX** 编译，主目标是 **App-Plus（Android / iOS）**。
- 数据完全本地：**SQLite（`plus.sqlite`）**，库文件 `ai_project_manage.db`，路径 `_doc/`。单用户模型（`user_id DEFAULT 1`）。
- 版本：`package.json` 1.0.6 / `manifest.json` versionName 1.0.6、versionCode 100 / appid `__UNI__08418DF`。
- 云端只做两件事：**GitCode 备份恢复**（`uni_modules/gitcode-sync`）与 **APK 更新**（`utils/updateApp.js` 拉 `version.json`）。业务数据不上云。

**一句话架构**：`pages → api/* → utils/dbService → plus.sqlite`；AI 走 `api/aiApi.js → uni_modules/openai-chat/js_sdk → http-request`；启动与更新在 `App.vue` 的 `onLaunch`。

## 2. 目录地图（真实状态）

**源码根 = 仓库根目录。历史文档里的 `app/` 目录已删除（曾是重复副本），不要把代码写进 `app/`。**

| 路径 | 内容 |
|---|---|
| `pages/` | 全部页面，按业务分组（project / knowledge / profile / demo） |
| `api/` | 数据与 AI 能力封装，8 个 `xxxApi.js`，**页面只允许调用这一层** |
| `utils/` | 基础设施：`dbService.js`（数据库唯一门面）、`dbUpgradeConfig.js`、`aiProviders.js`、`userStore.js`、`updateApp.js`、`promoManager.js`、`appStartup.js`、`cryptoUtils.js`、`dateUtils.js`、`contentAdapters.js`、`shareCardThemes.js`、`projectCases.js` |
| `components/` | 公共组件：`ChatComponent.vue`、`CustomNavbar.vue`、`ShareCardComponent.vue`、`ua-markdown/` |
| `custom-tab-bar/index.vue` | 底部导航（nut-tabbar 实现，无原生 tabBar） |
| `uni_modules/` | 插件：`openai-chat`（AI SDK，生产在用）、`http-request`（openai-chat 传递依赖）、`gitcode-sync`、`qiun-data-charts`、`app-updater`、`file-manager` |
| `doc/03-design/` | 数据模型与设计文档（`01-db.sql` 为准，但与实现有偏差）；文档导航见 `doc/README.md` |
| `tests/` | Jest 测试，分 unit / integration / app / e2e / pages |
| `static/`、`intro/` | 图片资源、下载落地页 |
| `static/app-icons/` | **App 图标源文件**（`manifest.json` 的 icons 全部指向这里，18 个尺寸） |
| `package.example.md` | 打包说明模板（真实口令/证书只在本地 `package.md`，已 gitignore） |
| `LICENSE` / `CONTRIBUTING.md` / `SECURITY.md` / `CODE_OF_CONDUCT.md` / `.github/` | 开源协作文件与 Issue/PR 模板 |
| `App.vue` / `main.js` / `pages.json` / `manifest.json` | 入口与全局配置 |
| `unpackage/`、`.hbuilderx/`、`node_modules/`、`package.md`、`*.keystore` | **已被 `.gitignore` 忽略，不要提交** |

## 3. 分层铁律

1. **页面不碰数据库**：`pages/**` 只 import `@/api/*`、`@/utils/*`、`@/components/*`。禁止在页面里直接 `import dbService` 做业务 CRUD。
2. **api 不碰 UI**：`api/*Api.js` 只依赖 `dbService` / `userStore` / `dateUtils` / `aiProviders`，不弹 toast、不做路由跳转。
3. **数据库只经 `utils/dbService.js`**：禁止任何文件直接调用 `plus.sqlite.*`。`dbService` 提供 `initDB / openDatabase / checkAndUpgradeDatabase / executeSql / query / insert / update / delete / findOne / findMany / count / exportAllData / importAllData / initDefaultUser / createIndexes`。
4. **api 采用 `class + export default 单例`**：如 `class ProjectApi { ... } export default new ProjectApi()`（见 `api/projectApi.js`）。新增能力加到对应的 `*Api` 类里，不要为一个小功能新建文件。
5. **字段映射在 api 层完成**：数据库是 snake_case（`name` / `updated_at` / `progress_text`），页面用 camelCase / 业务语义字段（`title` / `updateTime`）。映射写在 api 里，如 `projectApi.getProjectList()` 里 `project.title = project.name`。
6. **启动顺序**：`App.vue onLaunch` → `dbService.initDB()` → `createIndexes()` → `initDefaultUser()` → `new AppStartup().init()`（推广码校验）→ `#ifdef APP-PLUS` 检查更新。新增启动期逻辑塞进这里或 `utils/appStartup.js`，不要在页面 `onLoad` 里重复初始化数据库。

## 4. 数据库

### 4.1 表清单（15 张，权威结构见 `doc/03-design/01-db.sql`）

`users`、`settings`（category/key/value，含 `system.db_version`）、`ai_config`（AI 供应商配置，`UNIQUE(provider, user_id)`）、`projects`、`project_milestones`、`project_logs`、`ai_analyses`、`ai_summaries`、`chat_conversations`、`chat_messages`、`knowledge_base`、`knowledge_tags`、`knowledge_tag_mappings`、`project_knowledge_mappings`、`favorites`。

关键语义：
- `projects.status` ∈ `active / completed / paused / cancelled`；`progress` 为 0–100。
- **进度由里程碑推导**：进度 = 已完成里程碑 / 总数 × 100，达到 100 自动置 `completed`。写进度统一走 `projectApi.updateProjectProgress` / `updateProgress` / `updatePlan`，不要在各页面另算一套。
- `project_logs` 的列是 `progress_text` / `problem_text` / `plan_text`（不是 `progress` / `problem` / `plan`，设计文档写错了）。
- 删除项目/知识时需同步清理其关联表（`project_*_mappings`、`chat_conversations`、`favorites` 等）——复用 api 里已有的删除方法。

### 4.2 数据库升级（改表必须照此办理）

- 目标版本与升级脚本在 **`utils/dbUpgradeConfig.js`**：`current_version: '1.1.0'`、`upgrade_order: ['1.0.0','1.1.0']`、每种版本一个 `scripts[]`（类型支持 `create_table` / `create_index` / `alter_table`（可 `ignore_error`）/ 表重建迁移）。
- 实际版本号存在 `settings` 表 `category='system', key='db_version'`；`dbService.checkAndUpgradeDatabase()` 负责比对与执行。
- **加表 / 加字段 / 改索引的正确姿势**：在 `dbUpgradeConfig.js` 末尾**追加新版本号**（如 `1.2.0`）并写入脚本、同时更新 `current_version` 和 `upgrade_order`。**绝对不要修改已发布版本的脚本**——老用户库里已经执行过，改了也不会重跑，只会造成新旧库结构分叉。
- `doc/03-design/02-db-upgrade-history.md` 记录历史，新增升级项时同步补一段。
- 已知坑：`utils/dbService.js` 构造器里的 `currentVersion = '1.0.0'` 是残留字段，判定用的是 `dbUpgradeConfig.current_version`，别被它误导。

### 4.3 兼容性

- `plus.sqlite` **只在 App-Plus 存在**，`dbService.initDB()` 会显式检查并抛错。所以：**H5 / 小程序无法验证数据库相关改动**，必须在 App 真机或模拟器上验证。
- `dbService.initDB()` 对「数据库已打开」错误码 `-1402` 做了容错，重复初始化不要当异常处理。

## 5. 页面与导航

- **页面必须注册**：新增页面 = 新建 `pages/xxx/yyy.vue` + 在 `pages.json` 的 `pages[]` 加一项 + 加跳转入口。未注册的页面**不可达**（现有 `pages/index/index.vue`、`pages/demo/*` 下三个示例页就是漏注册的死页，不要模仿）。
- 所有页面 `navigationStyle: "custom"`，顶部统一使用 `components/CustomNavbar.vue`（`title` / `show-back` / `right-button` 插槽式配置）。
- **没有原生 tabBar**：`pages.json` 里无 `tabBar` 段；底部导航由 `custom-tab-bar/index.vue` 提供（在 `pages/project/list`、`pages/knowledge/index`、`pages/profile/index` 手动引入），切换用 `uni.reLaunch`。
- 页面跳转一律 `uni.navigateTo` / `uni.reLaunch`，且目标路径必须在 `pages.json` 里存在。已知反面案例：`pages/knowledge/chat.vue` 跳转的 `/pages/knowledge/list`、`/pages/knowledge/edit` 并不存在——修 bug 时顺手改掉。
- 页面状态用 Options API（`data / computed / methods / onLoad / onShow`），与现有代码保持一致；页面是重灾区，`pages/project/detail.vue`、`pages/profile/index.vue`、`components/ChatComponent.vue` 都超过 50KB，改动优先做小步增量，不要整体重写。

## 6. UI 规范

- **组件库**：`nutui-uniapp`（easycom 自动注册，`pages.json.easycom.custom`：`^nut-(.*)?-(.*)` 与 `^nut-(.*)`）。直接用 `<nut-button>`、`<nut-icon>`、`<nut-tag>`、`<nut-cell>` 等，不要自己造同类基础组件。文档：<https://nutui-uniapp.pages.dev>
- **单位只用 `rpx`**（`manifest.json` `transformPx: false`，以 750 设计稿为基准）。禁止 `px` / `rem` / `vw`。
- **设计色板**（`App.vue` 全局样式）：主色 `#165DFF`、成功 `#00B42A`、警告 `#FF7D00`、危险 `#F53F3F`、辅助灰 `#86909C`、页面底色 `#F2F3F5`。卡片：白底、`16rpx` 圆角、`0 4rpx 16rpx rgba(0,0,0,.08)` 阴影、内边距 `32rpx`。
- 全局类 `.card` / `.btn-primary` / `.btn-secondary` / `.primary-color` 等已在 `App.vue` 定义，优先复用。
- 图标统一 `nut-icon`，不要混入 iconfont 或图片图标。
- `pages.json` 里所有页面都是自定义导航栏，写页面时注意顶部留出状态栏高度（参考现有页面的 `CustomNavbar` 用法与 `statusBarHeight` 处理）。

## 7. AI 能力接入

- **唯一入口 `api/aiApi.js`**：`initOpenAI`（读 `ai_config` 选 `is_active` 配置）、`sendAIRequest(prompt, options)`、`chatWithProject(projectId, message, history, { onStream })`、`analyzeProject`、`generateAIAnalysis`、`generateAISummary`、`speechToText` / `textToSpeech`，以及 `ai_config` 的 CRUD（`addAIConfig / updateAIConfig / saveAIConfig / activateAIConfig / getActiveAIConfig`）。
- **供应商定义在 `utils/aiProviders.js`**：openai / deepseek / siliconflow / kimi / qwen / custom，含 `baseUrls`、`defaultModels`、`defaultConfigs`。新增供应商改这里 + `pages/profile/ai-settings.vue` 的表单，不要在 aiApi 里另写一份映射。
- **生成式 AI 调用一律走 `aiApi`**；不要直接 `new OpenAIAPI(...)`，不要另起一套 fetch。
- **配置只能存数据库**：API Key / base_url / model / 超时都存 `ai_config` 表，由 `pages/profile/ai-settings.vue` 录入。**禁止把任何 key、token、base_url 硬编码进源码或提交到仓库**。
- **对话 UI 用 `components/ChatComponent.vue`**（会话持久化在 `chat_conversations` / `chat_messages`，含流式输出与滚动控制），已在 `pages/project/chat.vue`、`pages/knowledge/chat.vue` 复用。`uni_modules/openai-chat` 的 Vue 组件只在 demo 页用过，**新交互不要引它的组件，只经 `aiApi` 用它的 js_sdk**。
- **流式**：`chatWithProject(..., { onStream })` → `openai-api.js` 的 `chatCompletionStream` → `uni_modules/http-request`。改流式协议时这三处要一起看。
- **推广码**（免配置直接激活 AI）：`aiApi.generatePromoCodeSafely()` → `cryptoUtils`（XOR + base58 对称编码）→ `promoApi.savePromoConfig()`；激活走 `promoManager.applyPromoCode()` → `promoApi.applyPromoCode()`（先 `backupCurrentAIConfig`）；启动时 `AppStartup.init()` → `promoManager.checkAndHandleExpiry()`，过期会清空 AI 配置。涉及推广码时 `cryptoUtils / promoApi / promoManager / appStartup / aiApi` 五处编解码格式必须一致。
- 已知缺陷（修 bug 时可顺手处理）：`pages/project/chat.vue` 调用了 `aiApi.saveToKnowledge`、`aiApi.getProjectSuggestions`，但 `aiApi` 里**没有**这两个方法（被 try/catch 吞掉）；`aiApi.sendAIRequest` 只读取 `options.systemPrompt`，**忽略** `options.messages`，导致 `ChatComponent` 的多轮历史实际丢失。

## 8. 设置项

- **所有可配置项必须能在设置界面里改**，不允许写死在代码里。AI 相关在 `pages/profile/ai-settings.vue`；其他偏好写 `settings` 表（`category` / `key` / `value`），读写走 `userApi` / 对应 api，不要页面直接操作 `settings`。
- 新的设置项：先加 `settings` 表的读写封装 → 再在设置页加表单项 → 最后在功能处读取。三步缺一不可。

## 9. 运行 / 构建 / 验证

### 9.1 开发与构建

- **本项目用 HBuilderX 开发，`package.json` 里没有 `dev` / `build` 脚本**。不要试图 `npm run dev`、不要自己搭 vite/webpack。
- 用 HBuilderX 打开**仓库根目录**（不是 `app/`），运行到手机/模拟器；打包流程见 `package.example.md`。
- **签名证书与口令不入库**：本地 `r0ad.keystore` / `package.md` 已被 `.gitignore` 忽略（历史里仍有，见 §11/§12）。发布用签名请放在仓库外目录，并单独备份。

### 9.2 测试（已实测可用）

```bash
# 单文件（推荐，最快，先跑这个）—— 已实测通过
npx jest --config tests/jest.config.unit.js --runTestsByPath tests/unit/api/projectApi.test.js --forceExit

# 单元 / 应用 / 页面分层
npm run test:unit
npm run test:app
npm run test:pages

# 全量（根 jest.config.js，约 18 个测试文件）
npm test
```

- **务必加 `--forceExit`**：部分测试会留下未关闭的异步句柄，不加会挂住不退出（已实测：`dateUtils`、`projectApi`、`dbService-simple` 等单文件通过，但整套跑会长时间不结束）。改完代码优先按「单文件 + `--forceExit`」验证，不要用全量套件当质量门禁。
- 配置：根 `jest.config.js` 扫 `tests/**/*.test.js`，`moduleNameMapper` 把 `@/` 映射到仓库根，`testEnvironment: 'node'`，`tests/setup/uniapp.setup.js` 提供 `uni` / `plus` mock。
- 分层：`tests/unit/`（api、utils 纯逻辑）、`tests/integration/`（dbService + api 组合）、`tests/app/`、`tests/pages/`、`tests/e2e/`（需真机/模拟器，配置是 `tests/jest.config.e2e.js`）。
- 新增测试放 `tests/unit/` 对应子目录，命名 `*.test.js`；测试里 mock `plus.sqlite`，不要连真库。
- **判断标准**：改了 `api/` 或 `utils/` 的纯逻辑 → 至少跑该文件对应单测；改了数据库结构/页面 → 单测通过只是底线，必须再上 App 手工验证。

### 9.3 手工验证清单（App 内）

1. 冷启动无白屏、`数据库初始化成功` 日志出现；
2. 新建项目 → AI 生成目标/里程碑 → 详情页进度正确；
3. 记一条日志（含语音入口）→ 列表刷新；
4. AI 对话流式输出不卡、滚动到底；
5. 知识库新增/收藏/分享卡；
6. 我的 → AI 设置（切换供应商、测试连接）、备份恢复、检查更新。

## 10. 代码风格

- **中文注释、中文 UI 文案**；关键函数写 JSDoc（项目现有风格）。
- 组件文件 `PascalCase.vue`，模板标签用 `PascalCase` 或 easycom 的 `kebab-case`；事件用 `kebab-case`（`@right-button-click`）。
- 不引入新的 UI 库、状态管理（**全仓没有 vuex / pinia**，当前用户状态就是 `utils/userStore.js`）、不引入新的请求库（用 `uni.request` 或既有 `http-request`）。
- 文件**尽可能少、单一职责**：一个功能优先扩展已有 `*Api.js` / 已有组件，不要为一个小函数新建文件。
- 平台差异用**条件编译**，不要 `if (process.env.UNI_PLATFORM)`：
  ```js
  // #ifdef APP-PLUS
  plus.navigator.closeSplashscreen()
  // #endif
  ```
- 不要把构建产物、日志、临时脚本提交进仓库；根目录出现 `test-*.js` 这类调试残留时不要引用，交给清理流程。
- `uni_modules/` 是第三方插件，**不要直接修改**（升级会覆盖）；确有需要就把逻辑复制到 `utils/` 里再改。

## 11. 已知技术债 / 陷阱（别照抄）

| 项 | 说明 |
|---|---|
| 死页面 | `pages/index/index.vue` 不在 `pages.json`；`pages/demo/index.vue` 按钮跳转的 `file-demo` / `gitcode-demo` / `plugin-example` 也未注册，点击必失败 |
| 死代码 | `utils/canvasRenderer.js` 全仓无引用；分享卡实际是 DOM + 剪贴板实现（`ShareCardComponent` + `contentAdapters` + `shareCardThemes`） |
| 已清理（2026-10） | 删除：`app/` 重复副本、根目录 `test-babel-output.js` / `test-simple-output.js`、`pages/test/`、`components/UpdateLogComponent.vue`、`utils/cryptoUtilsCompressed.js`；取消跟踪：`unpackage/**`（含 28.9MB 调试 APK）、`r0ad.keystore`、`package.md`；应用图标迁到 `static/app-icons/`；`pages/demo/plugin-example` 里的真实 API Key 已置空。不要再按旧文档去找这些文件 |
| 两套更新 | 生产用 `utils/updateApp.js`（`plus.downloader` + `install`）；`uni_modules/app-updater` 只被不可达页面引用，别用 |
| 双份 schema | `dbUpgradeConfig.js` 的脚本与 `dbService.js` 里的建表方法并存，已有漂移；改表以 `dbUpgradeConfig.js` 为准，必要时清理 `dbService` 里的旧建表逻辑 |
| 文档过期 | `doc/03-design/03-design.md` 顶部已有 2026-10 修订块（原写 uView UI / Pinia / 日志字段 / 10 张表 / `mine/` 均已改正）；`README.md` 已按真实功能重写；`.cursorrules`、`.trae/rules/` 已改为仓库根路径并指向本文件。历史设计文档（`doc/04-test/`）仍部分过时，只作参考 |
| 仓库体积 | `unpackage/`（约 121MB）已在 `.gitignore` 中且取消跟踪，但**本地仍占磁盘**，可用 `git clean -Xdf` 清理；仍在跟踪的大文件：`uni_modules/qiun-data-charts` 内 echarts（~1.4MB）、`doc/02-UI界面` 设计源文件（~6.4MB）、`static/logo.png`（0.65MB）。不要新增二进制到 git |
| 密钥历史 | `r0ad.keystore`、`package.md`（口令）以及 `pages/demo/plugin-example` 里的一枚真实 API Key **仍在 git 历史里**（已推送到 `origin`）。工作区已修复，但发布前必须清理历史并轮换凭证，见 §12 |

## 12. 开源协作与密钥策略

### 12.1 协作文件

| 文件 | 用途 |
|---|---|
| `LICENSE` | MIT，版权行 `r0ad <sunzroad@gmail.com>`（如需变更版权人，改这一行） |
| `CONTRIBUTING.md` | 开发环境、分支/提交、PR 要求、测试方式 |
| `SECURITY.md` | 漏洞私下报告流程（GitHub Security Advisories，不要开公开 issue） |
| `CODE_OF_CONDUCT.md` | 社区行为准则 |
| `.github/` | Issue 模板（bug / feature）、PR 模板、`config.yml` |
| `package.example.md` | 打包说明模板；真实口令在本机 `package.md`（已 gitignore） |

### 12.2 凭证铁律

- **永不入库**：AI API Key、签名证书（`*.keystore` / `*.jks`）、证书口令、`.env`、机器相关的 `local.properties`。
- AI Key 只存 **本地 SQLite 的 `ai_config` 表**，由「我的 → AI 设置」录入；代码里一律不写默认 Key（`pages/demo/plugin-example` 的旧 Key 已置空）。
- 签名证书与口令放**仓库之外**的私密目录并单独备份；仓库只留 `package.example.md` 模板。
- 推广码只是 `cryptoUtils` 的 XOR + base58 **本地对称编码**，不是加密，也不含任何服务端密钥——不要把它当机密或安全机制。
- 一旦发现 Key/口令进入提交：**立即轮换**（吊销 API Key、重新生成签名证书），再清理历史；只删文件不轮换等于没修。

### 12.3 历史清理（发布前必须决定）

截至 2026-10，git 历史中仍包含 `r0ad.keystore`、`package.md`（口令）、以及一枚真实 API Key，且已推送到 `origin`（腾讯 GitCode）。发布到公开仓库前二选一：

1. **干净历史（推荐）**：新建公开仓库，把当前工作区提交为一次初始提交（如 `git checkout --orphan main` 后提交），旧历史不随行。代价是丢失提交历史。
2. **重写历史**：`git filter-repo` 移除 `r0ad.keystore`、`package.md` 及相关 Key 字符串后 force push。需要协调所有克隆者，且远端缓存/PR 引用可能残留。

无论选哪种，都必须在对应平台**吊销旧 API Key** 并**重新生成签名证书**（旧证书能签出可覆盖安装的包）。

### 12.4 发布前仓库设置清单

- [ ] 仓库可见性改为 public 前，确认 §12.3 已处理完毕
- [ ] 填写仓库描述、Topics（`uniapp` `vue3` `ai` `project-management` `sqlite`）
- [ ] 开启 Secret scanning / push protection（GitHub）
- [ ] 保护 `main` 分支，禁止直接 push
- [ ] 确认 CI（可选）：目前**没有** CI 配置，如要加，跑测试即可（`--forceExit`）
- [ ] Release 附构建产物（APK）时给出校验值，不要把 APK 提交进仓库
- [ ] `README` 的徽章/链接全部可达（LICENSE、CONTRIBUTING、SECURITY）

## 13. 新增功能检查清单

- [ ] 页面已注册进 `pages.json`，且有入口可到达（`navigateTo` 路径正确）
- [ ] 通过 `api/*` 访问数据，未在页面直接操作 `dbService` 或 `plus.sqlite`
- [ ] 表结构变更：`dbUpgradeConfig.js` **追加新版本**（不改历史脚本）+ 同步 `doc/03-design/`
- [ ] 字段映射在 api 层完成，页面拿到的是 camelCase / 业务字段
- [ ] 样式全部 `rpx`，颜色取自 §6 色板，导航栏用 `CustomNavbar`
- [ ] 配置项可在 `pages/profile/ai-settings.vue`（或设置页）配置，无硬编码 key
- [ ] 平台相关代码加了条件编译，H5/小程序不会因 `plus` 不存在而崩
- [ ] 相关单测通过（至少 `npx jest --config tests/jest.config.unit.js --runTestsByPath <文件>`），并在 App 内手工验证关键路径
- [ ] 没有新建无引用文件、没有提交构建产物/临时脚本/密钥
- [ ] 改动已按 §14 提交（单一职责、message 规范、未混入无关文件）
- [ ] 若结构、命令、约定有变化，**同步更新本 `AGENTS.md`**

## 14. 提交规范（每次改动后自动提交）

**默认行为：每完成一个可验证的改动单元，立即 `git commit`，不要攒到最后一次性提交。** 编码代理（Claude Code / Cursor / Codex 等）在完成任务时就应提交，而不是只改文件等用户手动 commit。

### 14.1 提交粒度

- **一个 commit 只做一件事**：一个功能、一个修复、一次重构、一次文档更新、一次格式化，各自独立。
- 顺手修掉的无关 bug / 无关格式化，**单独一次提交**，不要混进当前改动。
- 大功能拆成可独立验证的小步（页面 → api → 数据层），每步能跑通就提交。

### 14.2 固定流程（四步，缺一不可）

```bash
git status && git diff          # 1. 自查：有没有 unpackage/、密钥、临时脚本、无关改动
npx jest --config tests/jest.config.unit.js --runTestsByPath <受影响文件的测试> --forceExit   # 2. 验证
git add <具体文件路径>           # 3. 精确添加，不要无脑 git add -A
git commit -m "type(scope): 中文描述" -m "为什么改 + 如何验证"
```

- 测试不通过就**不要提交**；页面/数据库改动还要在 App 内走一遍 §9.3。
- 提交前确认：无 API Key / 证书 / 口令、无构建产物、无大二进制、无 `package.md`（`.gitignore` 已覆盖，但 `git add -f` 会绕过）。

### 14.3 提交信息（Conventional Commits，中文描述）

```text
feat(project): 详情页支持导出分享卡
fix(log): 修正日志进度字段映射
docs: 补充数据库升级说明
refactor(ai): 抽取流式响应解析
test(api): 补充 knowledgeApi 单元测试
chore: 升级 nutui-uniapp 版本
security: 移除硬编码 API Key
chore(release): 1.0.7
```

- 类型：`feat` / `fix` / `docs` / `refactor` / `test` / `chore` / `perf` / `security` / `release`。
- subject ≤ 50 字；正文用 `-m` 第二段说明**为什么**与**如何验证**（跑了哪条命令、App 里点了什么）。
- 参考实现：本仓库 `fafb731 security:`、`4b130fa chore:`、`18a4877 docs:` 三次提交。

### 14.4 推送与红线

- **默认只提交到本地**；只有用户明确要求、或分支已确认可推送时才 `git push`，推送前先 `git pull --rebase`。
- 禁止：`--amend` 已推送的提交、对共享分支 force push、`reset --hard` 丢弃未提交改动（回滚用 `git revert`）、`--no-verify` 绕过检查。
- 版本号（`manifest.json` 的 `versionName` / `versionCode`、`package.json` 的 `version`）变更用单独的 `chore(release): x.y.z` 提交并打 tag。
- 历史中的敏感内容按 §12.3 单独处理，不要试图用普通提交"顺手"抹掉。
