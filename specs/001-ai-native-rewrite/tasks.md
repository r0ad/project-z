# 任务清单：点点 Flutter 三端重写

> 规则：每个任务先写失败测试再实现（TDD）；完成的定义 = 代码 + 测试 + `flutter analyze` 通过 + 提交。
> 阶段末尾必须至少通过一次对应平台编译。

## 阶段 0：工程地基

- [ ] 0.1 在 `master` 移除旧 uni-app 源码（保留 `uniapp` 分支），提交 `chore: 移除旧版 uni-app 源码`
- [ ] 0.2 `flutter create` 生成 android/ios/windows 三端工程，包名 `host.r0ad.diandian`，应用名「点点」
- [ ] 0.3 配置 `pubspec.yaml` 依赖、`analysis_options.yaml`（very_good_analysis）、目录骨架
- [ ] 0.4 设计令牌与亮/暗 Material 3 主题；品牌色/圆角/间距/字体 fallback
- [ ] 0.5 go_router 路由骨架 + 响应式 Shell（BottomNav / NavigationRail）
- [ ] 0.6 共享组件：`AppScaffold`、`AppCard`、`AsyncView`、`EmptyState`、`TagChip`、`AiActionButton`
- [ ] 0.7 日志脱敏 + 全局错误边界
- [ ] 0.8 `.github/workflows/ci.yml`：analyze/test/windows/android/ios 编译
- [ ] 0.9 `README.md` / `AGENTS.md` 改为 Flutter 版说明

## 阶段 1：数据层

- [ ] 1.1 测试：Drift 内存库可打开、外键开启、schemaVersion=1
- [ ] 1.2 表定义：projects / milestones / project_logs
- [ ] 1.3 表定义：ai_insights / knowledge / tags / links / favorites
- [ ] 1.4 表定义：conversations / messages / ai_configs / settings / ai_tool_calls
- [ ] 1.5 FTS5 表 + 触发器；知识/日志搜索测试
- [ ] 1.6 `ProjectRepository`（watch/list/create/update/delete/status）
- [ ] 1.7 `MilestoneRepository` + 进度重算事务测试
- [ ] 1.8 `LogRepository` + 搜索/时间线测试
- [ ] 1.9 `KnowledgeRepository`（含标签、关联、FTS、收藏）
- [ ] 1.10 `SettingsRepository`（默认值、类型读写）
- [ ] 1.11 `AiConfigRepository`（唯一激活、删除清理 Key 由安全存储层负责）
- [ ] 1.12 `InsightRepository` / `ChatRepository` / `ToolAuditRepository`
- [ ] 1.13 `StatsRepository`：周活动、计数、连续天数
- [ ] 1.14 迁移测试基架（v1 建库 + 升级钩子）

## 阶段 2：核心闭环（纯手动）

- [ ] 2.1 项目列表：状态筛选、搜索、空状态、下拉刷新、卡片进度
- [ ] 2.2 新建项目：手动表单 + 模板库；校验与保存
- [ ] 2.3 项目详情：概览 + 里程碑增删改/勾选/排序 + 进度即时更新
- [ ] 2.4 项目详情：日志时间线 + 编辑/删除
- [ ] 2.5 快速记录面板：项目/日期/三栏/里程碑关联；全局入口
- [ ] 2.6 首页：今日聚焦、最近动态、快速记录、空状态
- [ ] 2.7 Onboarding：3 页 + 跳过 + `onboarding_done`
- [ ] 2.8 Widget 测试：列表→详情→勾选里程碑→进度变化
- [ ] 2.9 集成测试：新建项目 → 记日志 → 进度更新（内存 DB）

## 阶段 3：AI 基础

- [ ] 3.1 供应商目录（2026-11 模型）+ 预设/自定义
- [ ] 3.2 安全存储 Key（三端抽象 + fake）
- [ ] 3.3 AI 设置页：配置 CRUD、激活、删除、Key 掩码
- [ ] 3.4 SSE 解析器测试：content / reasoning / [DONE] / 错误 / 半包
- [ ] 3.5 工具调用分片聚合测试
- [ ] 3.6 `OpenAiCompatibleGateway`：chat/stream/models/testConnection
- [ ] 3.7 错误映射（401/404/429/5xx/超时/取消）
- [ ] 3.8 连接测试 UI + 结果反馈
- [ ] 3.9 `StructuredGenerator`：JSON 模式、解析校验、一次修复重试
- [ ] 3.10 AI 目标拆解：输入 → 结构化草稿 → 可编辑 → 创建项目
- [ ] 3.11 AI 日志整理：原文 → 三栏草稿 → 可编辑 → 保存

## 阶段 4：AI 闭环

- [ ] 4.1 `ContextBuilder`：预算裁剪、引用、脱敏；单测
- [ ] 4.2 Prompt 库：版本号 + fixture 测试
- [ ] 4.3 项目分析：流式、取消、保存、编辑、删除
- [ ] 4.4 周复盘：跨项目聚合、本地统计版降级
- [ ] 4.5 知识提炼：标题/正文/标签建议、重复检测、确认保存
- [ ] 4.6 会话持久化：多会话、重命名、删除、重试
- [ ] 4.7 工具注册表：schema 校验 + 只读工具执行
- [ ] 4.8 写工具待确认流程 + 审计落库
- [ ] 4.9 `AgentRunner` 多轮循环（上限 6 轮、错误回填）
- [ ] 4.10 全局副驾：手机 sheet、桌面右侧栏、上下文感知
- [ ] 4.11 引用 chip 与「查看来源」
- [ ] 4.12 AI 不可用降级测试（无 Key/断网/500）

## 阶段 5：知识与统计

- [ ] 5.1 知识列表：搜索、标签筛选、收藏、排序
- [ ] 5.2 知识详情：Markdown、标签、关联项目、相关知识
- [ ] 5.3 知识编辑：标签输入、项目关联、自动保存/手动保存
- [ ] 5.4 收藏：项目/知识/日志/洞察统一入口
- [ ] 5.5 统计页：计数卡、周活动柱状图、项目进度分布
- [ ] 5.6 全局搜索页（Ctrl+K）：项目/日志/知识聚合

## 阶段 6：三端打磨

- [ ] 6.1 Windows：window_manager、最小尺寸、窗口位置记忆、标题
- [ ] 6.2 Windows：快捷键（Ctrl+N/L/K）
- [ ] 6.3 桌面宽屏布局：NavigationRail、内容最大宽度、双栏适配
- [ ] 6.4 Android：返回键、安全区、INTERNET 权限、minSdk、图标/启动屏
- [ ] 6.5 iOS：Info.plist 权限文案、图标、启动屏、最低版本
- [ ] 6.6 备份导出/导入（JSON）+ 校验 + 回滚
- [ ] 6.7 单项目 Markdown 导出
- [ ] 6.8 关于/更新检查（version.json、语义版本比较）
- [ ] 6.9 语音输入（speech_to_text）+ 权限失败降级
- [ ] 6.10 无障碍：语义、键盘焦点、对比度、动态字号

## 阶段 7：验收与交付

- [ ] 7.1 三端手工验证清单执行并记录
- [ ] 7.2 Windows `flutter build windows` 通过
- [ ] 7.3 Android `flutter build apk` 通过（debug + release 签名占位）
- [ ] 7.4 iOS CI `flutter build ios --no-codesign` 通过
- [ ] 7.5 性能检查：冷启动、1 万条日志滚动、搜索
- [ ] 7.6 安全复核：无 Key/证书/构建产物入库；日志脱敏
- [ ] 7.7 文档：README、AGENTS、SDD 更新、隐私说明
- [ ] 7.8 发布 workflow（tag → 三端产物 + 校验值）
- [ ] 7.9 `uniapp` 分支与远端一致性复核；master 干净

## 依赖关系

- 阶段 2 依赖阶段 1；阶段 3 依赖 1.10/1.11；阶段 4 依赖 3.6/3.9/1.12；阶段 5 依赖 1.9/1.13。
- 0.1 必须在旧代码审计（`specs/_legacy/`）完成后执行。
- iOS 构建任务在 Windows 本机不可执行，依赖 CI。
