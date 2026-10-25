# 贡献指南

感谢你愿意为「点点」（Project Z）贡献代码、文档或反馈。本文件说明参与开发前需要了解的约定；更细的工程细节以 [AGENTS.md](AGENTS.md) 为准。

- 许可证：[MIT](LICENSE)。提交即表示你同意以 MIT 条款授权你的贡献。
- 行为准则：[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)。
- 安全漏洞：请勿公开提交 issue，请按 [SECURITY.md](SECURITY.md) 私下报告。

## 1. 开始之前

1. 先读 [AGENTS.md](AGENTS.md)——它是本仓库对开发者与 AI 编码代理的**唯一权威约定**；`README.md`、`.cursorrules`、`.trae/rules/` 中的部分内容已过期，冲突时以 `AGENTS.md` 与源码为准。
2. 搜索现有 issue / PR，避免重复工作。
3. 较大的功能、重构或数据结构变更，请先开 issue 讨论，达成一致后再动手。

## 2. 开发环境

本项目使用 **HBuilderX** 开发与打包，不是 Vite / webpack 工程：

- 用 HBuilderX 的「文件 → 导入 → 从本地目录导入」，选择**仓库根目录**（源码根就是仓库根目录）。
- 运行与发行通过 HBuilderX 的「运行」/「发行」流程完成，主目标是 **App-Plus（Android / iOS）**。
- `package.json` 中**没有** `dev` / `build` 脚本，不要尝试 `npm run dev`、`npm run build`，也不要自行搭建打包工具链。
- Node.js 与 npm **仅用于运行测试**：在仓库根目录执行 `npm install` 安装开发依赖即可。

数据层依赖 `plus.sqlite`，它只在 App-Plus 环境存在。H5 / 小程序端无法使用数据库功能，因此涉及数据库或页面的改动必须在 App 真机或模拟器上验证。

## 3. 分支与提交

- 从 `main` 切出短生命周期分支：`feat/xxx`、`fix/xxx`、`docs/xxx`、`refactor/xxx`。
- 提交信息采用简洁的 Conventional 风格，主体用中文描述：

  ```text
  feat: 项目详情页支持导出分享卡
  fix: 修复日志列表进度字段映射错误
  docs: 补充数据库升级说明
  ```

  常用类型：`feat`、`fix`、`docs`、`refactor`、`test`、`chore`。
- 一个提交只做一件事；不要在一个 PR 里夹带无关的格式化或重排。
- **每完成一个可验证的改动就提交一次**，不要攒到最后；完整流程（自查 → 跑测试 → 精确 `git add` → commit）见 [AGENTS.md](AGENTS.md) §14。使用 AI 编码代理时同样适用：代理应在改完并验证通过后自动提交，而不是把一堆未提交改动留给维护者。
- 提交前确认没有构建产物（`unpackage/`）、临时脚本、日志、密钥 / 证书 / 口令混入。`--forceExit` 跑测试是底线，涉及数据库或页面的改动还要在 App 内验证。

## 4. 代码约定（摘要）

完整约定见 [AGENTS.md](AGENTS.md)，以下是最容易被违反的几条：

- **分层**：`pages → api/* → utils/dbService → plus.sqlite`。页面只调用 `api/*`，不直接操作 `dbService` 或 `plus.sqlite`；`api/*` 不碰 UI（不弹 toast、不做路由跳转）；数据库只经 `utils/dbService.js`。
- **少建文件**：新增能力优先扩展已有的 `*Api.js` 或 `utils/` 下的模块，不要为一个小功能新建文件。
- **字段映射在 api 层完成**：数据库是 snake_case，页面使用 camelCase / 业务语义字段。
- **页面必须注册**：新页面要在 `pages.json` 的 `pages[]` 中登记，并提供可达的跳转入口；所有页面使用 `CustomNavbar`。
- **UI**：组件库为 `nutui-uniapp`，单位只用 `rpx`（禁止 `px` / `rem` / `vw`），颜色取自 `App.vue` 定义的色板，优先复用全局样式类。
- **平台差异**用条件编译（`// #ifdef APP-PLUS`），不要用 `process.env.UNI_PLATFORM` 判断。
- **不要修改 `uni_modules/`** 下的第三方插件，升级会覆盖；确有需要时把逻辑复制到 `utils/` 再改。
- **不硬编码密钥**：AI API Key / base_url 等只存本地 `ai_config` 表，由用户在「我的 → AI 设置」录入，禁止写入源码或提交到仓库。
- 中文注释、中文 UI 文案；不引入新的 UI 库、状态管理（仓库没有 vuex / pinia）或请求库。

## 5. 常见改动的步骤

### 新增页面

1. 新建 `pages/<分组>/<页面>.vue`，采用与现有页面一致的 Options API 写法，顶部使用 `CustomNavbar`。
2. 在 `pages.json` 的 `pages[]` 中注册该页面。
3. 从现有页面或 `custom-tab-bar` 添加入口（`uni.navigateTo` / `uni.reLaunch`）。缺少入口的页面不可达。

### 修改数据库结构

1. 在 `utils/dbUpgradeConfig.js` **末尾追加新版本号**及对应 `scripts`，同步更新 `current_version` 与 `upgrade_order`；**不要修改已发布版本的脚本**。
2. 在 `doc/03-design/` 中同步数据结构说明。
3. 在 `api/*` 层完成读写与字段映射，并在 App 真机上验证升级路径。

### 新增 API 能力

1. 在对应的 `api/*Api.js` 类中新增方法（保持 `class` + `export default 单例` 的结构）。
2. 在 api 层完成字段映射与业务校验。
3. 页面只调用该 api；同时在 `tests/unit/api/` 下补充单元测试。

新增可配置项时还需三步：先在 `settings` 表做读写封装 → 在设置页加表单项 → 在功能处读取，缺一不可。

## 6. 测试

```bash
# 安装依赖（仅测试需要）
npm install

# 单文件（推荐，最快）
npx jest --config tests/jest.config.unit.js --runTestsByPath tests/unit/api/projectApi.test.js --forceExit

# 分层测试
npm run test:unit
npm run test:app
npm run test:pages
```

- **务必加 `--forceExit`**：部分测试会留下未关闭的异步句柄，不加会挂住不退出。
- 根 `jest.config.js` 的 `moduleNameMapper` 把 `@/` 映射到仓库根目录，测试里可以按源码习惯引入模块。
- 新增测试放在 `tests/unit/` 对应子目录，命名 `*.test.js`；测试中 mock `plus.sqlite`，不要连真实数据库。
- 改了数据库结构或页面时，单测通过只是底线，必须在 App 内按 [AGENTS.md](AGENTS.md) 的手工验证清单走一遍关键路径。

## 7. Pull Request

- **小而聚焦**：一个 PR 解决一个问题，便于审阅与回滚。
- 说明**改了什么、为什么、如何验证**（跑过的命令、App 内操作步骤或截图）。
- 不要提交构建产物、日志、临时脚本，以及任何密钥 / 口令 / 证书；具体见 [SECURITY.md](SECURITY.md)。
- 若改动了目录结构、命令或工程约定，请同步更新 [AGENTS.md](AGENTS.md)。
- PR 模板中的检查清单请逐项确认。

## 8. Issue

- 缺陷与功能建议请使用对应的 issue 模板，环境信息尽量完整。
- 粘贴日志前请去掉 API Key、个人信息等敏感内容。
- 安全漏洞**不要**开公开 issue，请按 [SECURITY.md](SECURITY.md) 私下报告。
