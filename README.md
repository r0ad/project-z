# 点点 · Project Z

> 指日可待。一个本地优先、AI 驱动的轻量项目管理应用。

点点把「设定目标 → 记录执行 → AI 分析 → 沉淀知识」做成一个闭环：你只需要用自然语言写下今天做了什么，AI 会整理成进展 / 问题 / 下一步，并在项目层面给出风险判断和下一步建议。所有数据留在本机，AI Key 存在系统安全存储里。

当前主分支是 **Flutter 重写版**。旧 uni-app 版本完整保留在 `uniapp` 分支，仅作参考。

## 功能

- **AI 拆目标**：输入项目名称与现状，AI 给出目标、里程碑和第一步。
- **记录执行**：一句话输入，AI 整理成三栏；也可以直接手填。支持关联里程碑、按日期回看。
- **项目详情**：进度由里程碑自动推导；执行记录、AI 分析、状态管理在同一页。
- **AI 分析**：基于里程碑、最近日志和知识库上下文，输出进展判断、风险与阻塞、下一步建议、可沉淀的知识。
- **知识库**：Markdown 内容、标签、收藏、关联项目、FTS5 全文搜索、相关条目推荐。
- **AI 副驾**：全局或项目内多轮对话，流式输出；项目内对话自动带入项目上下文。
- **周统计**：近 7 天记录柱状图 + 一键生成周复盘。
- **多供应商**：DeepSeek、OpenAI、Kimi、Qwen、SiliconFlow、智谱、MiniMax、OpenRouter、自定义 OpenAI 兼容端点。
- **三端**：Windows / Android / iOS 共用一套代码；Windows 与移动端各自适配导航与窗口。

## 技术栈

| 层 | 选型 |
|---|---|
| UI | Flutter 3.50 / Material 3（`material_ui`） / `go_router` |
| 状态 | `flutter_bloc`（Cubit） |
| 数据 | SQLite + `drift` + FTS5；`flutter_secure_storage` 存 Key |
| AI | 自研 OpenAI 兼容网关（`dio` + SSE），支持流式、推理内容与工具调用分片 |
| 图表 | `fl_chart` |
| Markdown | `gpt_markdown` |
| 工程 | `very_good_analysis` 风格约束、`flutter_lints`、`bloc_test`、`mocktail` |

## 快速开始

### 环境

- Flutter 3.50+ / Dart 3.14+
- Windows：Visual Studio 2022（C++ 桌面开发 + ATL）
- Android：Android SDK 37.2、build-tools 37.0.0、NDK 28.2.13676358、JDK 21
- iOS：macOS + Xcode（本机 Windows 只能生成工程，构建交给 macOS CI）

```bash
flutter pub get
flutter analyze
flutter test
flutter run -d windows
```

构建：

```bash
flutter build windows --release
flutter build apk --release
flutter build ios --no-codesign   # macOS
```

Windows 构建的 ATL 路径由 `windows/CMakeLists.txt` 通过 `vswhere` 自动探测，不要写死本机路径。

## 使用

1. 首次启动后进入「我的 → AI 供应商」，选一个预设，填入 API Key，保存。
2. 在「项目」新建项目，输入名称、现状、目标；可以让 AI 拆里程碑。
3. 在项目详情点「记录今天」，用一句话记录，点「AI 整理成三栏」，保存。
4. 记录几条后，在项目详情底部点「生成分析」。
5. 在「知识」沉淀可复用的经验；在「今日」的输入条直接问点点。

API Key 只写入系统安全存储（Windows DPAPI / Android Keystore / iOS Keychain），不会进数据库、日志或仓库。

## 目录

```
lib/
  app/            依赖注入、主题、路由、响应式 Shell
  domain/         模型与仓储接口（纯 Dart）
  data/           Drift schema、仓储实现、AI 网关/Prompt/服务
  features/       页面 + Cubit（home/projects/logs/chat/knowledge/settings/stats）
  core/           通用 UI、Markdown、日期
specs/            SDD 文档：宪法、spec、plan、data-model、tasks、旧版审计
docs/research/    2026-11 AI 供应商与模型调研
test/             单元 / 数据层 / Widget / 真实模型联调
```

更细的工程约定见 [`AGENTS.md`](AGENTS.md)。

## 数据与隐私

- 单用户、本地 SQLite；没有账号、云同步或遥测。
- 删除项目会级联删除里程碑、日志、AI 分析与会话，但**保留知识条目**。
- 备份/恢复、应用更新检查尚未实现，见路线图。
- 旧版的推广码、GitCode 备份、分享卡、APK 自动更新已明确不做。

## 路线图

- [ ] 首启 onboarding（称呼、首个项目、AI 配置引导）
- [ ] 本地备份 / 恢复（JSON，不含 Key）
- [ ] 全局 AI 工具调用（白名单 + 写操作确认）
- [ ] 聊天停止生成与重试
- [ ] Android / iOS 真机验收与发布流水线
- [ ] 应用更新检查

## 文档

- 产品与架构规格：[`specs/001-ai-native-rewrite/spec.md`](specs/001-ai-native-rewrite/spec.md)
- 技术方案：[`specs/001-ai-native-rewrite/plan.md`](specs/001-ai-native-rewrite/plan.md)
- 数据模型：[`specs/001-ai-native-rewrite/data-model.md`](specs/001-ai-native-rewrite/data-model.md)
- 旧版审计：[`specs/_legacy/`](specs/_legacy/)
- AI 供应商目录：[`docs/research/ai-providers-2026.md`](docs/research/ai-providers-2026.md)

## License

MIT，见 [`LICENSE`](LICENSE)。
