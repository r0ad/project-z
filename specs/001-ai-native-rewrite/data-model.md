# 数据模型：点点 Flutter 版

- 数据库：SQLite（Drift），单文件 `<appSupport>/diandian.sqlite`
- schemaVersion：1（全新安装，不迁移旧库）
- 时间：UTC epoch milliseconds（`INTEGER`）；「业务日期」用本地 `YYYY-MM-DD` 文本
- ID：UUID v4 文本，跨端备份不冲突
- 外键：开启；删除按下方策略级联

## 1. 表结构

### 1.1 projects

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | UUID |
| title | TEXT | NOT NULL | 项目名 |
| description | TEXT | NOT NULL DEFAULT '' | 描述 |
| goal | TEXT | NOT NULL DEFAULT '' | SMART 目标 |
| status | TEXT | NOT NULL DEFAULT 'active' | active / completed / paused / cancelled |
| progress | INTEGER | NOT NULL DEFAULT 0 | 0–100，由里程碑推导的缓存值 |
| color | TEXT | NULL | 强调色（可选） |
| start_date | TEXT | NULL | YYYY-MM-DD |
| due_date | TEXT | NULL | YYYY-MM-DD |
| completed_at | INTEGER | NULL | 完成时间 |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | 手动排序 |
| created_at | INTEGER | NOT NULL | |
| updated_at | INTEGER | NOT NULL | |

索引：`(status, updated_at DESC)`、`(due_date)`。

### 1.2 milestones

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | |
| project_id | TEXT | NOT NULL FK → projects.id ON DELETE CASCADE | |
| title | TEXT | NOT NULL | |
| description | TEXT | NOT NULL DEFAULT '' | |
| due_date | TEXT | NULL | |
| is_completed | INTEGER | NOT NULL DEFAULT 0 | bool |
| completed_at | INTEGER | NULL | |
| sort_order | INTEGER | NOT NULL DEFAULT 0 | |
| created_at / updated_at | INTEGER | NOT NULL | |

索引：`(project_id, sort_order)`、`(project_id, is_completed)`。

### 1.3 project_logs

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | |
| project_id | TEXT | NOT NULL FK → projects.id ON DELETE CASCADE | |
| log_date | TEXT | NOT NULL | 本地业务日期 YYYY-MM-DD |
| progress_text | TEXT | NOT NULL DEFAULT '' | 进展 |
| problem_text | TEXT | NOT NULL DEFAULT '' | 问题 |
| plan_text | TEXT | NOT NULL DEFAULT '' | 计划 |
| raw_input | TEXT | NULL | 用户原始自然语言（AI 整理前） |
| milestone_id | TEXT | NULL FK → milestones.id ON DELETE SET NULL | 关联里程碑（可选） |
| created_at / updated_at | INTEGER | NOT NULL | |

索引：`(project_id, log_date DESC)`、`(log_date DESC)`。

### 1.4 ai_insights（合并旧 ai_analyses / ai_summaries）

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | |
| project_id | TEXT | NULL FK → projects.id ON DELETE CASCADE | 周复盘可为空 |
| kind | TEXT | NOT NULL | project_analysis / weekly_review |
| title | TEXT | NOT NULL | |
| content | TEXT | NOT NULL | Markdown |
| model | TEXT | NULL | 生成模型 |
| prompt_version | TEXT | NULL | prompt 版本 |
| period_start / period_end | TEXT | NULL | 复盘周期 |
| source_refs | TEXT | NOT NULL DEFAULT '[]' | JSON 引用 [{type,id,label}] |
| created_at / updated_at | INTEGER | NOT NULL | |

索引：`(project_id, created_at DESC)`、`(kind, created_at DESC)`。

### 1.5 knowledge_entries

| 列 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | |
| title | TEXT | NOT NULL | |
| content | TEXT | NOT NULL | Markdown |
| source_type | TEXT | NOT NULL DEFAULT 'manual' | manual / log / insight / chat |
| source_id | TEXT | NULL | 来源 ID |
| view_count | INTEGER | NOT NULL DEFAULT 0 | |
| created_at / updated_at | INTEGER | NOT NULL | |
| last_viewed_at | INTEGER | NULL | |

索引：`(updated_at DESC)`。

### 1.6 tags / knowledge_tag_links

`tags`：`id TEXT PK`、`name TEXT NOT NULL UNIQUE`、`color TEXT NULL`、`created_at INTEGER`。

`knowledge_tag_links`：`knowledge_id`、`tag_id` 复合 PK，均 `ON DELETE CASCADE`。

索引：`(tag_id, knowledge_id)`。

### 1.7 project_knowledge_links

`project_id`、`knowledge_id` 复合 PK，均 `ON DELETE CASCADE`；`created_at INTEGER`。

索引：`(knowledge_id)`。删除项目只删链接，不删知识。

### 1.8 favorites

| 列 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| target_type | TEXT NOT NULL | project / knowledge / log / insight |
| target_id | TEXT NOT NULL | |
| created_at | INTEGER NOT NULL | |

唯一索引：`(target_type, target_id)`。目标删除时由应用层清理对应收藏。

### 1.9 chat_conversations / chat_messages

`chat_conversations`：`id`、`title`、`scope_type`（global/project/knowledge）、`scope_id`、
`created_at`、`updated_at`、`archived_at`。索引 `(updated_at DESC)`、`(scope_type, scope_id)`。

`chat_messages`：`id`、`conversation_id`（CASCADE）、`role`（user/assistant/system/tool）、
`content`、`reasoning_content`、`tool_calls_json`、`tool_call_id`、`token_usage_json`、`created_at`。
索引 `(conversation_id, created_at)`。

### 1.10 ai_configs

| 列 | 类型 | 说明 |
|---|---|---|
| id | TEXT PK | |
| name | TEXT NOT NULL | 显示名 |
| provider_key | TEXT NOT NULL | openai/deepseek/kimi/qwen/siliconflow/zhipu/openrouter/custom |
| base_url | TEXT NOT NULL | 不含尾部 `/` |
| model | TEXT NOT NULL | |
| temperature | REAL NOT NULL DEFAULT 0.7 | |
| max_tokens | INTEGER NOT NULL DEFAULT 2048 | |
| timeout_seconds | INTEGER NOT NULL DEFAULT 60 | |
| is_active | INTEGER NOT NULL DEFAULT 0 | 应用层保证最多一个 true |
| supports_tools | INTEGER NOT NULL DEFAULT 1 | 能力探测/用户覆盖 |
| supports_stream | INTEGER NOT NULL DEFAULT 1 | |
| created_at / updated_at | INTEGER | |

API Key 不入库：`flutter_secure_storage` key = `ai_key_<configId>`；删除配置时同步删除。

### 1.11 settings

`key TEXT PK`、`value TEXT NOT NULL`、`updated_at INTEGER NOT NULL`。

默认项：`onboarding_done=false`、`theme_mode=system`、`update_url=https://project.r0ad.host/version.json`、
`window_geometry`（JSON，仅 Windows）、`ai_context_budget=6000`、`last_backup_at`。

### 1.12 ai_tool_calls（审计）

`id`、`conversation_id`、`message_id`、`tool_name`、`arguments_json`、`result_summary`、
`status`（pending/confirmed/rejected/completed/failed）、`error`、`duration_ms`、
`created_at`、`confirmed_at`。索引 `(created_at DESC)`、`(conversation_id)`。
不存完整正文，只存参数摘要（≤500 字符）。

## 2. FTS5

### 2.1 knowledge_fts

```sql
CREATE VIRTUAL TABLE knowledge_fts USING fts5(
  knowledge_id UNINDEXED, title, content, tokenize = 'unicode61'
);
```

触发器：`knowledge_entries` 的 INSERT/UPDATE/DELETE 同步。标签不进 FTS（通过 join 过滤）。
搜索：`SELECT knowledge_id, bm25(knowledge_fts) AS rank FROM knowledge_fts WHERE knowledge_fts MATCH ?`，
中文单字场景用前缀匹配 + LIKE 兜底。

### 2.2 project_logs_fts

```sql
CREATE VIRTUAL TABLE project_logs_fts USING fts5(
  log_id UNINDEXED, progress_text, problem_text, plan_text, tokenize = 'unicode61'
);
```

触发器同上。用于「搜索日志」。

## 3. 领域不变量

1. `progress = round(completedMilestones / totalMilestones * 100)`；无里程碑时为 0。
2. 全部里程碑完成 → `status=completed` 且写 `completed_at`；取消勾选 → 回到 `active`，
   清空 `completed_at`（仅当此前是自动完成的）。
3. `status=completed` 也可手动设置；手动完成后新增未完成里程碑不自动改状态，由用户决定。
4. 删除项目：级联里程碑/日志/洞察/对话；删除 `project_knowledge_links` 与相关收藏；
   `knowledge_entries` 保留。
5. 删除知识：级联标签映射、项目关联、收藏。
6. 同一天可有多条日志；`log_date` 只表示业务日期，不唯一。
7. 对话删除级联消息；配置删除级联安全存储 Key 与审计保留（脱敏）。
8. 所有写操作在事务中完成；进度与状态更新与里程碑变更同事务。

## 4. Repository 接口

```dart
abstract interface class ProjectRepository {
  Stream<List<Project>> watchProjects({ProjectFilter filter});
  Stream<Project?> watchProject(String id);
  Future<Project> create(ProjectDraft draft);
  Future<void> update(Project project);
  Future<void> setStatus(String id, ProjectStatus status);
  Future<void> delete(String id);
}

abstract interface class MilestoneRepository {
  Stream<List<Milestone>> watchByProject(String projectId);
  Future<Milestone> create(MilestoneDraft draft);
  Future<void> update(Milestone milestone);
  Future<void> toggle(String id, bool completed); // 同事务重算项目进度
  Future<void> reorder(String projectId, List<String> orderedIds);
  Future<void> delete(String id);
}

abstract interface class LogRepository {
  Stream<List<ProjectLog>> watchByProject(String projectId);
  Stream<List<ProjectLog>> watchRecent({int days, String? projectId});
  Future<ProjectLog> create(LogDraft draft);
  Future<void> update(ProjectLog log);
  Future<void> delete(String id);
  Future<List<LogSearchHit>> search(String query, {String? projectId});
}

abstract interface class KnowledgeRepository {
  Stream<List<KnowledgeEntry>> watchAll({String? query, Set<String> tagIds, bool favoritesOnly});
  Stream<KnowledgeEntry?> watchOne(String id);
  Future<KnowledgeEntry> create(KnowledgeDraft draft, {List<String> tagNames, List<String> projectIds});
  Future<void> update(KnowledgeEntry entry, {List<String>? tagNames, List<String>? projectIds});
  Future<void> delete(String id);
  Future<List<Tag>> allTags();
  Future<List<KnowledgeEntry>> related(String id, {int limit = 5});
}

abstract interface class InsightRepository { ... }
abstract interface class ChatRepository { ... }
abstract interface class AiConfigRepository { ... }
abstract interface class SettingsRepository { ... }
abstract interface class StatsRepository { ... }
abstract interface class ToolAuditRepository { ... }
```

约定：UI 只拿领域实体；Drift 行类型不出 `data/`。

## 5. 迁移

- v1 建表 + FTS + 触发器 + 索引，一次 migration。
- 每次 schema 变更：`schemaVersion++`，`MigrationStrategy.onUpgrade` 增加分支，
  并新增 `test/data/migrations/vN_to_vN+1_test.dart`。
- 迁移在事务中执行；失败回滚并记录脱敏日志。
- 不使用 `createAll()` 覆盖用户库；仅新库走 `onCreate`。

## 6. 备份格式（v1）

```json
{
  "format": "diandian-backup",
  "formatVersion": 1,
  "schemaVersion": 1,
  "appVersion": "1.0.0",
  "exportedAt": "2026-11-19T02:00:00Z",
  "data": {
    "projects": [], "milestones": [], "logs": [], "insights": [],
    "knowledge": [], "tags": [], "knowledgeTags": [], "projectKnowledge": [],
    "favorites": [], "conversations": [], "messages": [],
    "aiConfigs": [], "settings": []
  }
}
```

- 默认不导出 API Key；`aiConfigs` 仅保留非敏感字段，导入后需重填 Key。
- 导入前校验 `format`/`formatVersion`/`schemaVersion`；不兼容则拒绝。
- 导入策略：整库替换（清空后事务写入）或合并（按 ID upsert），由用户选择；v1 先做整库替换。
- 单项目导出：Markdown（目标、里程碑表、日志、洞察），不含密钥。
