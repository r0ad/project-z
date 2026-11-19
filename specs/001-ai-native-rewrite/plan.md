# 技术计划：点点 Flutter 三端重写

- 对应规格：`specs/001-ai-native-rewrite/spec.md`
- 状态：Draft（版本与包选型待 pub 实测/审计回填）
- 原则：本地优先、AI-native、三端一套代码、能复用不手搓、TDD。

## 1. 技术选型

| 领域 | 选型 | 版本（2026-11） | 理由 / 替代方案 |
|---|---|---|---|
| 框架 | Flutter stable | 3.50.0 / Dart 3.14 | 已安装，三端一套代码 |
| 语言 | Dart 3（sound null safety） | — | — |
| 状态管理 | `flutter_bloc` + Cubit | 9.1.1 | 事件/状态边界清晰、`bloc_test` 易做 TDD；团队熟悉度高于 Riverpod |
| 路由 | `go_router` | 18.1.4 | 声明式、深链、ShellRoute 适配桌面/手机 |
| 数据库 | `drift` + `sqlite3_flutter_libs` | 2.35.4 | 类型安全 SQL、迁移可测试、FTS5；替代 sqflite/Isar |
| 数据库代码生成 | `drift_dev` + `build_runner` | 最新兼容 | 官方工具链 |
| 不可变模型 | `freezed` + `json_serializable` | 3.x | 减少样板、sealed union；AI DTO 可序列化 |
| 网络 | `dio` | 5.11.1 | 拦截器、取消、流式响应成熟 |
| 安全存储 | `flutter_secure_storage` | 11.2.0 | Keychain / Keystore / Windows Credential Manager |
| Markdown | `gpt_markdown` | 1.4.1 | 专为 LLM 输出/流式设计，表格/代码块友好；替代已趋停更的 flutter_markdown |
| 图表 | `fl_chart` | 1.3.1 | 高 star、纯 Dart、三端一致 |
| 提示 | `toastification` | 3.2.2 | 非阻塞、可定制、桌面/移动一致 |
| 骨架屏 | `skeletonizer` | 3.0.0 | 减少手写 loading 布局 |
| 动效 | `flutter_animate` | 4.5.2 | 轻量、声明式；不引入 Rive/Lottie 运行时 |
| 文件选择 | `file_picker` | 13.4.0 | 三端系统选择器 |
| 分享 | `share_plus` | 13.3.1 | 三端分享面板 |
| URL | `url_launcher` | 6.3.3 | 打开下载页/主页 |
| 窗口 | `window_manager` | 0.7.0 | 仅 Windows：最小尺寸、位置记忆 |
| 应用信息 | `package_info_plus` | 10.2.2 | 版本/构建号 |
| 路径 | `path_provider` + `path` | 2.1.6 / 最新 | 应用数据目录 |
| 时间/格式 | `intl` | 0.20.3 | 日期、相对时间 |
| 日志 | `logger` | 2.8.0 | 分级、脱敏 printer |
| 语音 | `speech_to_text` + `flutter_tts` | 7.5.0 / 4.2.5 | P2；三端支持，失败降级 |
| 图标生成 | `flutter_launcher_icons` | 最新 | 用旧版 1024 图标生成三端 |
| 测试 | `flutter_test` + `bloc_test` + `mocktail` | 最新 | 单测/Widget 测试 |
| Lint | `very_good_analysis` | 11.0.0 | 严格规则，统一风格 |

> 选型红线：不引入第二套状态管理、不引入第二套网络库、不引入第二套数据库。
> AI 客户端自研（见 §5），因为它是产品核心且需要适配多供应商流式/工具调用差异；
> 其余基础能力一律用成熟包。

## 2. 分层与目录

```
lib/
  main.dart
  bootstrap.dart                # 初始化 DB、设置、窗口、错误边界
  app/
    app.dart                    # MaterialApp.router
    router.dart                 # go_router 路由表
    theme/                      # 设计令牌、亮/暗主题、组件主题
  core/
    result.dart                 # sealed Result<T>
    exceptions.dart
    logging/                    # 脱敏日志
    utils/                      # 日期、debounce、json 工具
  domain/
    entities/                   # Project, Milestone, ProjectLog, KnowledgeEntry, ...
    repositories/               # 抽象接口
    services/                   # 进度计算、上下文构建、复盘聚合
    usecases/                   # 可测试的业务动作
  data/
    db/
      app_database.dart         # Drift schema + migrations
      tables/
      daos/
    repositories/               # Drift 实现
    secure/                     # Key 安全存储
    backup/                     # 导出/导入
  ai/
    gateway.dart                # AiGateway 接口 + OpenAI 兼容实现
    sse.dart                    # SSE 解析
    models/                     # 请求/响应/流事件/工具调用
    prompts/                    # 版本化 prompt
    context/                    # ContextBuilder
    tools/                      # 工具注册表 + 本地执行器
    agent/                      # 多轮工具调用循环
    catalog/                    # 供应商与模型预设
  features/
    onboarding/
    dashboard/
    projects/
    logs/
    knowledge/
    assistant/
    settings/
    stats/
  widgets/                      # 共享组件：AsyncView, EmptyState, AppCard, ...
  platform/                     # 窗口、分享、语音、更新等适配
test/
  unit/  data/  widget/  integration/
  fixtures/                     # AI 响应、备份样例
integration_test/
```

依赖方向：`features → domain ← data`，`features → ai`，`ai → domain`，`core` 无上层依赖。
`data` 实现 `domain` 接口；UI 只依赖 Cubit 与领域模型，不直接 import Drift 行类型。

## 3. 数据模型

Drift 数据库文件：`<appSupport>/diandian.sqlite`，WAL 模式，外键开启。

核心表（详见 `data-model.md`）：

- `projects`、`milestones`、`project_logs`
- `ai_analyses`、`ai_summaries`
- `knowledge_entries`、`tags`、`knowledge_tag_links`、`project_knowledge_links`
- `favorites`
- `chat_conversations`、`chat_messages`
- `ai_configs`、`settings`、`ai_tool_calls`
- FTS5：`knowledge_fts`、`project_logs_fts`（external content + triggers）

约定：

- 时间统一存 UTC epoch millis；展示按本地时区。
- ID 用 UUID v4 字符串（跨端备份不冲突）。
- 枚举存文本（`active` 等），迁移不破坏可读性。
- 进度 = 已完成里程碑 / 总数 × 100（0 个里程碑时为 0）；由 `ProjectProgressService` 统一计算，
  在里程碑变更的同一事务内写回 `projects.progress` 与 `status`。
- 项目删除级联里程碑/日志/分析/对话/关联；知识保留，仅删除 `project_knowledge_links`。
- `settings` 为 key/value，含 `onboarding_done`、`theme_mode`、`update_url` 等；无 `users` 表。

迁移策略：Drift `schemaVersion` 从 1 开始；每次结构变更新增 migration 并写升级测试
（旧 schema 建库 → 升级 → 断言）。不修改已发布 migration。

## 4. 状态管理与路由

- 每个功能一个 Cubit（复杂流程用 Bloc）：`DashboardCubit`、`ProjectListCubit`、
  `ProjectDetailCubit`、`QuickLogCubit`、`KnowledgeCubit`、`AssistantCubit`、`SettingsCubit`。
- 依赖通过构造函数注入；App 根部用 `MultiRepositoryProvider` 暴露仓库，
  `BlocProvider` 按路由创建。测试直接 new Cubit + fake repository，不依赖全局 locator。
- 状态用 `freezed` union：`initial / loading / data / empty / failure`，UI 强制处理四态。
- 路由：
  - `StatefulShellRoute.indexedStack`：`/home`、`/projects`、`/knowledge`、`/settings`
  - 详情：`/projects/:id`、`/knowledge/:id`、`/settings/ai`、`/settings/ai/edit`
  - 全屏：`/onboarding`、`/search`、`/stats`、`/assistant`
  - 手机显示 BottomNavigationBar；≥1024 显示 NavigationRail，内容最大宽度 1200。
- 快捷键（Windows）：Ctrl+N 新建项目、Ctrl+L 快速记录、Ctrl+K 全局搜索、Esc 关闭面板。

## 5. AI 架构

### 5.1 Gateway

```dart
abstract interface class AiGateway {
  Stream<AiStreamEvent> streamChat(AiRequest request, {CancellationToken? cancel});
  Future<AiChatResult> complete(AiRequest request);
  Future<List<AiModelInfo>> listModels(AiConfig config);
  Future<ConnectionTestResult> testConnection(AiConfig config);
}
```

`OpenAiCompatibleGateway` 基于 `dio`：

- `POST {baseUrl}/chat/completions`，`stream: true`，解析 SSE（`data:` 行、`[DONE]`）。
- 支持 `delta.content`、`delta.reasoning_content`（DeepSeek 等）、`delta.tool_calls` 分片聚合。
- 支持 `response_format: json_object` 与「JSON schema 提示 + 解析修复」双路径。
- 统一错误映射：401 鉴权、404 模型/路径、429 限流、5xx、超时、取消。
- 请求前 `ContextBuilder` 做 token 预算（粗估 4 字符/token）与敏感信息脱敏。
- 审计：模型、耗时、token、工具调用写 `ai_tool_calls`（不含正文）。

### 5.2 供应商目录

`ai/catalog/provider_catalog.dart` 内置 2026-11 主流供应商预设（OpenAI、DeepSeek、Kimi、
通义千问、硅基流动、智谱、OpenRouter、自定义 OpenAI 兼容）。每家给 baseUrl + 推荐模型 +
上下文窗口/是否支持工具调用。模型列表可由 `GET /models` 刷新，失败回退预设。
具体清单以 `docs/research/ai-providers-2026.md` 为准。

### 5.3 Prompt 与结构化输出

- Prompt 放 `ai/prompts/`，每个模板含 `id`、`version`、`system`、`userTemplate`、输出 schema。
- 结构化任务（项目拆解、日志三栏、知识卡、分析）统一走 `StructuredGenerator`：
  发 JSON 指令 → 解析 → 校验 → 失败重试一次（附错误）→ 仍失败返回可读错误。
- 关键 prompt 有 golden fixture 测试：输入固定上下文，断言解析结果字段完整、无空标题。

### 5.4 上下文构建

`ContextBuilder` 输入：当前路由/项目/知识、最近 N 条日志、里程碑、相关知识与对话摘要。
输出带 token 预算的 `AiContext`，按「系统 > 当前对象 > 最近日志 > 相关知识 > 历史对话」裁剪。
所有引用保留 `sourceType/sourceId/label`，供 UI 展示引用 chip。

### 5.5 工具调用（AI-native 的关键）

工具以 JSON Schema 注册，分只读与写入：

| 工具 | 类型 | 说明 |
|---|---|---|
| `search_knowledge` | 读 | 按关键词/标签搜索知识 |
| `get_project_overview` | 读 | 项目、里程碑、进度、最近日志 |
| `list_recent_logs` | 读 | 指定项目/天数的日志 |
| `get_weekly_stats` | 读 | 本地统计聚合 |
| `create_project` | 写 | 创建项目 + 里程碑（需确认） |
| `add_project_log` | 写 | 新增日志（需确认） |
| `set_milestone_completed` | 写 | 勾选里程碑（需确认） |
| `create_knowledge` | 写 | 沉淀知识（需确认） |

`AgentRunner` 循环：模型返回 `tool_calls` → 只读工具立即执行 → 写工具生成
`PendingAction` 交给 UI 确认 → 用户确认后执行并把结果回填给模型 → 最多 6 轮。
每次调用写审计；参数经 schema 校验；UI 展示「将要做什么」。

### 5.6 降级

- 无配置/断网/错误：隐藏「生成中」态，展示手动表单或本地模板。
- 周复盘：无 AI 时用 `LocalReviewGenerator` 生成统计版。
- 流式失败：保留已生成内容，提供重试；不落库半成品。

## 6. UI / 设计系统

- Material 3；`ColorScheme.fromSeed`，seed `#06B6D4`（品牌青），深色为主推，浅色完整支持。
- 设计令牌：4pt 间距体系、圆角 12/16/24、卡片低对比描边、克制阴影。
- 字体：系统字体 + `fontFamilyFallback`（PingFang SC / Microsoft YaHei / Noto Sans CJK）；
  不打包大字体，保证包体。
- 组件：`AppScaffold`、`AppCard`、`SectionHeader`、`StatTile`、`EmptyState`、
  `AsyncView`、`ConfirmSheet`、`AiActionButton`、`SourceChip`、`TagChip`。
- 图标：Material Icons；品牌图标用现有 1024 PNG 生成三端 launcher。
- 响应式断点：<600 手机；600–1024 紧凑；>1024 桌面。
- 无障碍：语义标签、键盘焦点、对比度、动态字号。

## 7. 平台适配

- `platform/window_service.dart`：仅 Windows 初始化 `window_manager`，最小 960×640，
  恢复/保存窗口位置（settings 表）。
- `platform/share_service.dart`：share_plus；桌面无分享面板时回退保存文件。
- `platform/speech_service.dart`：speech_to_text，权限失败返回 `SpeechUnavailable`。
- `platform/update_service.dart`：GET `version.json`，语义版本比较，打开下载页。
- Android：`INTERNET` 权限、minSdk 23、release 签名走环境变量/本地 keystore（不入库）。
- iOS：Info.plist 麦克风/语音识别文案；`--no-codesign` CI 编译；最低 iOS 14。
- Windows：窗口标题、单实例（可选）、文件保存对话框。

## 8. 测试策略（TDD）

1. **单元**：进度计算、日期边界、SSE 解析、工具参数校验、ContextBuilder 裁剪、
   备份序列化、更新版本比较。
2. **数据**：Drift 内存库 + 真实 migration；每个 repository 的 CRUD/级联/事务。
3. **AI**：fixture 驱动的流式响应、工具调用分片、JSON 修复、错误映射；不打真实网络。
4. **Widget**：首页/项目详情/快速记录/知识列表的关键交互与空错载三态；
   Cubit 用 fake repository 驱动。
5. **集成**：`integration_test` 启动 app（内存 DB）走「新建项目 → 记日志 → 进度变化」。
6. **手工**：三端各跑一遍关键路径；iOS 由 CI 编译守护。

命令：

```bash
dart run build_runner build --delete-conflicting-outputs
dart format --set-exit-if-changed .
flutter analyze
flutter test
flutter build windows
flutter build apk --debug
flutter build ios --no-codesign   # 仅 macOS
```

## 9. CI

`.github/workflows/ci.yml`：

- `quality`（ubuntu）：pub get → build_runner → format check → analyze → test。
- `windows`（windows-latest）：build windows。
- `android`（ubuntu）：setup Java 21 + Android SDK → build apk（debug/release）。
- `ios`（macos-latest）：build ios --no-codesign。
- 缓存 `~/.pub-cache` 与 Gradle；失败上传日志。

发布 workflow 后续单独做：tag → 三端产物 + 校验值；APK 不上传仓库。

## 10. 实施阶段（对应 tasks.md）

1. **阶段 0 基础**：移除旧源码、Flutter 工程、依赖、主题、路由、CI 骨架。
2. **阶段 1 数据**：Drift schema、迁移、Repository、种子设置；TDD。
3. **阶段 2 核心闭环**：项目/里程碑/日志/首页/快速记录（手动路径先通）。
4. **阶段 3 AI 基础**：配置、安全存储、Gateway、SSE、连接测试、目标拆解。
5. **阶段 4 AI 闭环**：日志结构化、分析/周复盘、知识提炼、副驾与工具。
6. **阶段 5 知识与统计**：搜索、标签、收藏、图表。
7. **阶段 6 三端打磨**：桌面布局/快捷键、Android/iOS 适配、备份、更新、无障碍。
8. **阶段 7 验收**：三端构建、集成测试、文档、发布准备。

## 11. 风险与对策

| 风险 | 对策 |
|---|---|
| Drift 在 `flutter test` 加载 sqlite3 失败 | 先在 Windows 做探针；必要时用 `sqlite3` 动态库测试 helper，CI 用 Android 集成测试兜底 |
| 各供应商流式/工具调用格式差异 | 统一 SSE 聚合层 + fixture 覆盖 DeepSeek/OpenAI 典型响应；异常降级为非流式 |
| 桌面/移动两套布局走偏 | 共享组件 + 断点测试；桌面只改变容器，不复制页面 |
| AI 输出不可控 | schema 校验 + 确认卡 + 审计；写操作永不自动执行 |
| 旧功能遗漏 | 以 `specs/_legacy/` 审计为清单逐项勾选；非目标明确排除 |
| iOS 无法本机验证 | macOS CI 编译 + 真机手测清单；平台插件用抽象接口 |
| 包体过大 | 不打包字体/大图；图片压缩；tree-shake icons |

## 12. 待确认

- 供应商/模型清单（等调研）。
- 是否在 v1 就做语音（倾向：做，但可隐藏）。
- 桌面多窗口（倾向不做）。
- 备份是否 zip（倾向：JSON 为主，Markdown 单项目导出）。
