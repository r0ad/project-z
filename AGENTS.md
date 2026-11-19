# AGENTS.md — 点点（Project Z）

> 本文件是本仓库对 AI 编码代理的唯一权威约定。
> 与 `README.md`、`specs/` 冲突时以本文件为准；`specs/` 记录产品与架构决策，实现细节以源码为准。
> 事实优先级：**源码 > `specs/001-ai-native-rewrite/` > `README.md` > `docs/`**。

## 1. 项目是什么

- 产品名「点点」（Project Z，slogan「指日可待」）：AI 驱动的轻量项目管理应用。
- 核心闭环：**设定目标 → 记录执行 → AI 分析 → 沉淀知识库**，并由全局 AI 助手贯穿。
- 技术栈：**Flutter 3.50 + Dart 3.14**，Material 3（`material_ui` 包），目标平台 **Windows / Android / iOS**。
- 数据完全本地：SQLite（Drift），单用户，不上传云端；AI 请求直接由客户端发往用户配置的 OpenAI 兼容服务。
- 旧版 uni-app 源码保留在 `uniapp` 分支与工作树 `D:\ws-research\project-z-uniapp`，**仅供查参考，不再修改**；主分支已完全切换为 Flutter。

## 2. 目录结构

| 路径 | 内容 |
|---|---|
| `lib/main.dart` | 启动：桌面窗口、`AppDependencies.bootstrap()`、`MaterialApp.router` |
| `lib/app/` | DI（`app_dependencies.dart`）、`AppScope`、主题、路由、响应式 Shell |
| `lib/domain/` | 纯 Dart 模型与仓储接口，不依赖 Flutter/Drift |
| `lib/data/local/` | Drift schema、FTS5、建库/打开数据库 |
| `lib/data/repositories/` | Drift 仓储实现（项目/里程碑/日志/洞察/知识/聊天/配置/设置/统计/工具审计） |
| `lib/data/ai/` | 自研 OpenAI 兼容网关、SSE 解析、Prompt、Context Builder、`AiService`、供应商目录、AI 项目工具 |
| `lib/data/backup/` | 本地 JSON 备份、WebDAV、GitCode 备份服务 |
| `lib/data/update/` | GitHub Release / version.json 更新检查 |
| `lib/data/security/` | `FlutterSecureSecretStore`（生产）与 `FileSecretStore`（仅自动化测试） |
| `lib/features/<feature>/` | 页面 + Cubit，按功能分包 |
| `lib/core/` | 通用 UI、Markdown、日期格式化 |
| `specs/` | 宪法、spec、plan、data-model、tasks 与旧版审计报告 `_legacy/` |
| `docs/research/` | 外部调研（AI 供应商与模型） |
| `test/` | 单元、数据层、Widget、集成测试 |

## 3. 分层铁律

1. **UI 不碰 Drift**：`lib/features/**` 只能通过 `lib/domain/repositories.dart` 的接口访问数据；行类型（`ProjectRow` 等）不得出现在页面或 Cubit 中。
2. **领域层不依赖框架**：`lib/domain/` 只用 Dart 与 `equatable`，不 import Flutter、Drift、Dio。
3. **数据映射集中在 data 层**：Drift 行 → 领域对象在 `lib/data/mappers.dart` 或对应仓储内完成，页面拿到的是领域模型。
4. **依赖注入手动完成**：`AppDependencies.bootstrap()` 组装数据库、仓储、安全存储与 AI 服务；`AppScope.of(context)` 取用。**不要引入 get_it / provider / riverpod**。
5. **状态管理统一 flutter_bloc**：每个功能一个 Cubit + 不可变 State；页面用 `BlocBuilder`/`BlocListener`，不要 `setState` 管理业务状态。
6. **路由统一 go_router**：路由表在 `lib/app/router.dart`；Shell 内四个 tab 用 `StatefulShellRoute.indexedStack`；详情/编辑页是 Shell 外的根路由。新增页面必须同时加路由与入口。
7. **AI 调用统一走 `AiService`**：页面不得直接 `new OpenAiCompatibleGateway()`，不得自己拼 HTTP；Prompt 统一放 `lib/data/ai/prompts.dart`，并带 `PromptVersions` 版本号。

## 4. 数据库

### 4.1 表

Drift schema v1，14 张表：

`projects`、`milestones`、`project_logs`、`ai_insights`、`knowledge_entries`、`tags`、`knowledge_tag_links`、`project_knowledge_links`、`favorites`、`chat_conversations`、`chat_messages`、`ai_configs`、`settings`、`ai_tool_calls`。

关键语义：

- `projects.status` ∈ `active / completed / paused / cancelled`；`progress` 为 0–100。
- **进度由里程碑推导**：完成数 / 总数，四舍五入；全部完成自动 `completed` 并写 `completedAt`；取消勾选且原为 completed 时回到 `active` 并清空 `completedAt`。统一走 `MilestoneRepository.toggle` / `DriftMilestoneRepository`，页面不要另算。
- `project_logs` 三栏是 `progressText / problemText / planText`，另有 `rawText`、`logDate`、`milestoneId`。
- `ai_insights` 合并旧版 `ai_analyses` 与 `ai_summaries`，用 `kind` 区分 `projectAnalysis / weeklyReview`，带 `promptVersion`。
- 删除项目：清 favorites 与项目会话，再级联删里程碑/日志/洞察/关联；**知识条目保留**。删除知识：级联标签关联、项目关联、收藏。
- SQLite 时间用 UTC 毫秒（`createdAt`/`updatedAt`），业务日期用 `YYYY-MM-DD` 字符串（`logDate`）。

### 4.2 FTS

- `knowledge_fts(knowledge_id UNINDEXED, title, content)` 与 `project_logs_fts(log_id UNINDEXED, raw_text, progress_text, problem_text, plan_text)`。
- 由 `onCreate` 中的触发器保持同步；改表结构时必须同步改触发器，并补 FTS 测试。

### 4.3 迁移

- Drift `schemaVersion` 当前为 1。改表必须：升 `schemaVersion`、写 `MigrationStrategy`、补 `test/data/app_database_test.dart`，并更新 `specs/001-ai-native-rewrite/data-model.md`。
- **不做旧 uni-app SQLite 迁移**：这是产品决策，用户全新安装。
- `openAppDatabase()` 优先读环境变量 `DIANDIAN_DATA_DIR`（仅自动化/沙箱用），否则写系统 Application Support；不要把它当正式功能。

## 5. 页面与 UI

- 主题：`lib/app/theme.dart`。深色为主，seed `#06B6D4`，背景 `#070B10`，卡片 `#10161E`，描边 `#2A3644`，正文灰 `#93A4B8`；成功 `#34D399`、警告 `#FBBF24`、危险 `#F87171`。
- **Flutter 3.50 起 Material 已拆包**：业务代码统一 `import 'package:material_ui/material_ui.dart';`，Cupertino 用 `package:cupertino_ui/cupertino_ui.dart`；不要再 import `package:flutter/material.dart`（已 deprecated）。
- 常用组件在 `lib/core/ui.dart`：`SurfaceCard`、`SectionTitle`、`EmptyState`、`StatTile`、`Pill`、`AiHint`、`showSnack`、`PagePad`；优先复用。
- 响应式断点：600 / 1024（Shell 侧栏 900/1180）。页面内容用 `PagePad(maxWidth: 1040)` 限制宽度。
- Markdown 统一 `AiMarkdown` / `AiMarkdownMuted`（`lib/core/markdown.dart`，基于 `gpt_markdown`）。
- 中文 UI 文案；日期用 `lib/core/formatters.dart`，不要在各页面手写格式。

## 6. AI 能力

### 6.1 调用链

`页面/Cubit → AiService → AiGateway(OpenAiCompatibleGateway) → dio SSE → 供应商`

- `AiService` 负责：读激活配置、从 `SecretStore` 取 Key、拼 system/user 消息、JSON 模式与容错解析、落 `ai_insights`。
- `AiService.planProject`（拆目标/里程碑）、`structureLog`（三栏）、`analyzeProject`（四段分析）、`weeklyReview`（周复盘）、`chatMessages` / `stream`（对话）。
- 缺配置或 Key 时抛 `AiException`，`userMessage` 是可直接展示的中文。
- 流式事件：`AiTextDelta / AiReasoningDelta / AiUsageEvent / AiFinished / AiFailure`。

### 6.2 供应商

`lib/data/ai/catalog.dart` 内置 2026-11 目录：DeepSeek、OpenAI、Kimi、Qwen、SiliconFlow、智谱、MiniMax、OpenRouter、Custom。默认模型名以目录为准（如 `deepseek-flash`、`deepseek-v4-pro`）。

- 新增供应商：改 `catalog.dart` 的 `providerPresets`，不需要改设置页表单（预设会自动填充）。
- `AiConfig` 存数据库；**API Key 只存系统安全存储**，storage key 为 `ai_key_<configId>`。
- 禁止把任何 Key、token、base_url 硬编码进源码或提交。发现泄露立即轮换。

### 6.3 测试钩子

`DIANDIAN_SECRETS_FILE` 指向一个 JSON 文件时，`AppDependencies` 会用 `FileSecretStore` 代替系统安全存储。**仅用于 CI / 沙箱自动化**，生产不设置该变量；不要在文档里教用户用它存真实 Key。

### 6.4 安卓网络

- **Release 主清单必须保留** `android/app/src/main/AndroidManifest.xml` 里的 `<uses-permission android:name="android.permission.INTERNET"/>`。Flutter 模板只在 debug/profile 清单里加 INTERNET，release 漏掉会表现为所有 AI 请求「网络不可用」。改清单后必须重新构建 APK，热重载不会生效。
- 模拟器遇到 DNS fake-IP / 无法直连时，可在「我的 → 网络 → HTTP 代理」填 `127.0.0.1:10808`，并先执行 `adb reverse tcp:10808 tcp:10808`。该配置存 `settings.network_proxy`，只影响 AI 请求，默认空表示直连；真实设备直连时不要填。

### 6.5 AI 工具调用

- 工具定义与执行集中在 `lib/data/ai/project_tools.dart`：`list_projects` / `get_project`（只读），`create_project` / `update_project` / `delete_project`（写操作）。
- 聊天链路：`ChatCubit.send` → `AiService.stream(tools: ProjectTools.definitions)` → 模型返回 tool_calls；只读工具立即执行并把结果回传模型，循环最多 4 轮；写操作先落 `ai_tool_calls`（pending）并在聊天页展示确认卡，用户点「同意并执行」后才执行。
- 审计统一走 `ToolAuditRepository`，状态 `pending / completed / failed / rejected`；不要绕过审计直接调仓储改项目。
- 工具参数、系统提示与确认文案都在 `prompts.dart` / `project_tools.dart`；新增工具必须同时补 `test/data/project_tools_test.dart`，并保持写操作需要确认。

### 6.6 备份与更新

- 本地备份：`BackupService.exportJson()` / `importJson()`，14 表、格式 `diandian-backup`、版本 1、**不导出 API Key**；导入在事务内清空并恢复，失败回滚。
- WebDAV：`WebDavService`，`settings` 键 `webdav_url/webdav_username`，密码在 `SecretStore` 的 `webdav_password`，固定文件名 `diandian-backup.json`。
- GitCode：`GitCodeService`，OpenAPI v5 `https://gitcode.com/api/v5`，`settings` 键 `gitcode_repo/gitcode_branch/gitcode_path`，token 在 `SecretStore` 的 `gitcode_token`；上传先查 sha，再 POST/PUT contents。
- 更新：`UpdateService` 默认读 `https://api.github.com/repos/r0ad/project-z/releases/latest`，也兼容旧 `version.json`（对象或数组）；`settings.update_manifest_url` 可覆盖。下载按平台选 Windows 安装包/便携 zip、Android APK、iOS 页面。
- 以上服务都不在页面里直接拼 HTTP；UI 在 `features/backup/` 与 `features/settings/`。

## 7. 测试与命令

```bash
# 静态检查
flutter analyze

# 单元 / 数据层 / Widget（不需要设备）
flutter test

# 真实 DeepSeek 联调（需要环境变量）
flutter test test/integration/deepseek_live_test.dart

# 运行（Windows）
flutter run -d windows

# 构建
flutter build windows --release
flutter build apk --release
flutter build ios --no-codesign   # 只能在 macOS 上跑
```

- Windows 构建依赖 Visual Studio 2022 + C++ 工具 + ATL。`windows/CMakeLists.txt` 已自动探测 `vswhere` 与 `atlmfc`，不要把本机绝对路径写死。
- 安装前缀已改为 `${CMAKE_BINARY_DIR}/runner/${BUILD_TYPE}`，不要恢复 Flutter 模板的生成式写法。
- `flutter test` 里 `sqlite3.openInMemory()` 使用原生资产；**不要加 `sqlite3_flutter_libs`**（已 EOL）。
- 涉及数据库或 UI 的改动，至少跑 `flutter analyze` + `flutter test`；关键路径还要启动 Windows 版走一遍。
- 沙箱环境如果无法写 AppData：`DIANDIAN_DATA_DIR` 覆盖数据库目录；`DIANDIAN_SECRETS_FILE` 覆盖 Key 存储（见 §6.3）。

## 8. 构建与 CI

- CI 计划（`.github/workflows/ci.yml`）四类 job：analyze+test、Windows build、Android APK、macOS iOS build（`--no-codesign`）。
- Android：`ANDROID_HOME=D:\Programs\Android\SDK`，platform 37.2 / build-tools 37.0.0；本机 JDK 为 Android Studio JBR 21。
- iOS：工程已生成（`ios/`），但本机 Windows 无法构建；以 macOS CI 为准，签名走 secrets，不提交证书。
- 发布：tag `v*` 触发 `.github/workflows/release.yml`，产出 Android APK、Windows 便携 zip、Windows 安装包（Inno Setup）与 iOS 未签名 zip，并发布到 GitHub Release；本地构建产物在 `build/`。
- Windows 安装包脚本 `installer/diandian.iss`，默认按用户安装、向导可改路径；`installer/ChineseSimplified.isl` 必须随仓库提交，CI 不应依赖系统语言文件。
- 不把 `build/`、`.dart_tool/`、APK、证书、`local.properties`、`vc_redist.x64.exe` 提交进仓库。

## 9. 提交规范

- 每完成一个可验证单元立即提交；一个 commit 只做一件事。
- Conventional Commits + 中文描述：
  `feat(project): 项目详情支持生成 AI 分析`
  `fix(ai): 修复 SSE 半包解析`
  `test(data): 补充知识库 FTS 用例`
  `docs: 重写 Flutter 架构说明`
- 提交前：`flutter analyze` 无 error、相关 `flutter test` 通过；不要提交调试脚本、临时数据、真实 Key。
- 默认只提交本地；需要推送时先确认分支与用户意图，禁止对共享分支 force push。

## 10. 当前边界（不要假装已实现）

- 已落地：首启 onboarding、本地备份/恢复、WebDAV/GitCode 远端备份、检查更新、AI 副驾项目工具（只读自动执行 + 写操作确认 + 审计）。
- WebDAV/GitCode 目前有服务层单元测试（本地 HTTP 假服务），尚无真实凭据的端到端验证；Windows 安装包在本机沙箱内只能验证文件复制，注册表/开始菜单写入需在非沙箱用户态运行一次。
- 聊天暂无「停止生成」按钮；流式失败会保留已生成的部分文本。
- 统计页的周复盘是手动触发；没有自动定时生成。
- 语音输入/播报未接入（已从依赖中移除 `speech_to_text` / `flutter_tts`）。
- 全局搜索只覆盖项目名/目标与知识库 FTS，不含日志全文的跨项目搜索 UI。
- iOS 只提供未签名构建，无真机签名/商店分发。
- 旧版分享卡、推广码、APK 自动更新均已明确不做；GitCode 备份已按新设计重做。
- 不要为了「和旧版一样」恢复已删除的死页面、死链或双份 schema。
