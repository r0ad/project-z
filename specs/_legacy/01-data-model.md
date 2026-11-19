# 01 数据模型（legacy：uni-app + plus.sqlite）

> 审计对象：`D:\ws-research\project-z-public`（分支 `master`，app 1.0.6 / versionCode 100）
> 审计方式：只读源码与文档，未运行 App、未连接真机数据库、未修改任何源码、未提交 git。
> 事实优先级：**源码 > `doc/03-design/01-db.sql` > `doc/03-design/02-db-upgrade-history.md` > `doc/03-design/03-design.md`**。
> 数据库：SQLite 文件 `ai_project_manage.db`，路径 `_doc/`（`utils/dbService.js:9-10`）；单用户模型（`user_id DEFAULT 1`）。
> 结论基准：DDL 以 `utils/dbUpgradeConfig.js` 的 `1.0.0 + 1.1.0` 脚本为运行时权威；`01-db.sql` 缺 `1.1.0` 的 `promo_code_id`，属文档滞后。

---

## 0. 速查（给 Flutter 重写的 10 条硬事实）

1. 业务表 **15 张**；物理库还有 SQLite 自动生成的 **`android_metadata`**（第 16 张，无业务含义）。
2. 版本号只存一行：`settings(category='system', key='db_version')`，当前写入值 `1.1.0`。`settings` 表**除这一行外全仓无任何读写**（用户偏好实际在 `users.settings` JSON）。
3. `project_logs` 的真实列是 `progress_text / problem_text / plan_text`，**不是** `progress / problem / plan`（设计文档写错，代码与 DDL 一致）。
4. 项目 `progress` 由里程碑加权平均推导：completed=100、status=`progress` 取其 `progress`、其余=0，`Math.round(total/条数)`；全部 completed 时把 `projects.status` 置 `completed`。
5. 项目状态实际只写 `active` / `completed`；文档中的 `paused` 仅存在于映射表，`cancelled` 全仓 0 处。
6. 删除项目只清 `project_logs / project_milestones / ai_analyses / project_knowledge_mappings / projects`；**不清理** `ai_summaries`、`chat_*`、`favorites`。
7. 删除知识清 `knowledge_tag_mappings / project_knowledge_mappings / favorites / knowledge_base`；**不清理** `chat_conversations(chat_type='knowledge')`。
8. 收藏是**无约束多态**：`target_type IN ('project','knowledge')` 仅由 api 层校验，表上没有 CHECK / UNIQUE / 目标外键；孤儿收藏在列表查询时被静默跳过。
9. `chat_messages.metadata` 列存在但**从未被写入**（`addMessage` 无调用方，UI 走 `saveMessage`），实际恒为 NULL。
10. 时间格式有 **4 套并存**：SQLite `CURRENT_TIMESTAMP`（UTC `YYYY-MM-DD HH:MM:SS`）、`DateUtils.getCurrentLocalISOString()`（本地时间但无时区后缀）、`Date.toISOString()`（UTC 带 `Z`）、`Date.now()` 毫秒整数（仅 `ai_config` 的推广码写入）。`DateUtils.utcToBeijing` 会把"无 Z 字符串"当 UTC 再 +8h，导致本地 ISO 时间显示**快 8 小时**。

---

## 1. 完整表清单（15 张业务表）

### 1.0 数据库级约定

| 项 | 事实 |
|---|---|
| 库文件 | `ai_project_manage.db`，`_doc/ai_project_manage.db`（`dbService.js:9-10`） |
| 打开方式 | `plus.sqlite.openDatabase`；`isOpenDatabase` 判断已打开 |
| 外键强制 | DDL 里写了 `FOREIGN KEY`，但代码从未执行 `PRAGMA foreign_keys = ON`。SQLite 默认关闭外键，因此**声明型外键实际不生效**（TODO：真机 `PRAGMA foreign_keys` 复核） |
| 时间默认值 | `DEFAULT CURRENT_TIMESTAMP` 产生 UTC 文本 `YYYY-MM-DD HH:MM:SS`，无时区 |
| 主键 | 全部 `INTEGER PRIMARY KEY AUTOINCREMENT` |
| 删除策略 | 无软删除列；全部硬删除，级联由 api 层手工完成 |
| 单用户 | `user_id INTEGER DEFAULT 1`；`userStore` 默认 `currentUserId=1`，持久化在 uni storage key `currentUserId` |

### 1.1 `users`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | 默认用户 id=1 |
| username | TEXT | NOT NULL | 无 UNIQUE；默认用户为 `默认用户` 或 `用户` |
| email | TEXT | 可空 | 默认 `default@example.com` / `''` |
| avatar | TEXT | 可空 | 存 emoji（`👤` 等），非 URL |
| settings | TEXT | 可空 | JSON：`{title,isVip,theme}` |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | UTC |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | UTC |

- 外键：被 `projects.user_id`、`ai_config.user_id`、`knowledge_base.user_id`、`favorites.user_id` 引用（未强制）。
- 索引：无。
- 文档差异：`03-design.md` 只列 `id, username, email, avatar, settings`，未提 `created_at/updated_at`；`dbService.js` 里**死代码** `createBasicTables()` 定义的 `username UNIQUE / email UNIQUE / password_hash NOT NULL / avatar_url` 与真实表完全不同，不要参考。
- 写入方：`dbService.initDefaultUser()`（`dbService.js:561-577`，count=0 时插入 `默认用户/default@example.com/''/{}`）；`userApi.createDefaultUser()`（`用户/''/👤/{title:'产品经理',isVip:false,theme:'light'}`）；`userApi.updateUser()`（username/email/avatar/settings + `updated_at` ISO）。

### 1.2 `settings`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | `INSERT OR REPLACE` 会重置 id |
| category | TEXT | NOT NULL | 实际只有 `system` |
| key | TEXT | NOT NULL | 实际只有 `db_version` |
| value | TEXT | 可空 | 实际值 `1.1.0` |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | REPLACE 时被重置 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | REPLACE 时被重置 |

- 唯一约束：`UNIQUE(category, key)`。
- 索引：`idx_settings_category_key(category, key)`（与 UNIQUE 隐式索引重复，冗余）。
- 全仓读写点只有 `dbService.js:105`（SELECT）、`:444`（INSERT OR REPLACE）、`:465`（SELECT）；页面/其他 api 无任何 settings 表访问。
- **无任何默认配置行**；所谓"默认值"只存在于 `users.settings` 的读取兜底：`title='产品经理'`、`isVip=false`、`theme='light'`。

### 1.3 `ai_config`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| provider | TEXT | NOT NULL | 逻辑枚举：`openai/deepseek/siliconflow/kimi/qwen/custom`（`utils/aiProviders.js:4-11`），无 CHECK |
| base_url | TEXT | NOT NULL | 无默认；各供应商默认见 §4.2 |
| api_key | TEXT | NOT NULL | **明文存储**，无加密 |
| model | TEXT | NOT NULL | 无默认 |
| timeout | INTEGER | DEFAULT 30 | DDL 30；代码新增/更新/保存默认 **130**，不一致 |
| max_tokens | INTEGER | DEFAULT 2000 | 代码默认 2000；`aiProviders.defaultConfigs` 另有 4000/8000 |
| temperature | REAL | DEFAULT 0.7 | |
| is_active | INTEGER | DEFAULT 0 | 0/1；"每用户仅一条激活"仅由代码维护 |
| user_id | INTEGER | DEFAULT 1, REFERENCES users(id) | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 推广码路径写毫秒整数 |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 推广码路径写毫秒整数 |
| promo_code_id | TEXT | NULL（**1.1.0 ALTER 新增**） | 非空表示来自分享码，禁止编辑；`01-db.sql` 未同步 |

- 唯一约束：`UNIQUE(provider, user_id)`。
- 索引：`idx_ai_config_user_provider(user_id, provider)`、`idx_ai_config_is_active(is_active)`、`idx_ai_config_promo_code_id(promo_code_id)`、`idx_ai_config_editable(user_id) WHERE promo_code_id IS NULL`（部分索引，SQLite 支持）。
- 外键：`user_id → users(id)`（未强制）。
- 注意：`is_active` 没有部分唯一索引，理论上可存在多条 active；`addAIConfig/updateAIConfig/saveAIConfig/activateAIConfig` 各自先清零再置 1，逻辑上保证单条。

### 1.4 `projects`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| user_id | INTEGER | DEFAULT 1, REFERENCES users(id) | |
| name | TEXT | NOT NULL | API 映射为 `title` |
| description | TEXT | 可空 | 也承载 `updatePlan` 的 `plan` |
| goal | TEXT | 可空 | 创建时必填（api 校验） |
| status | TEXT | DEFAULT 'active' | 实际写 `active`/`completed`；无 CHECK |
| progress | INTEGER | DEFAULT 0 | 0–100，无 CHECK；由里程碑推导，可被手工覆盖后再被重算 |
| start_date | DATE | 可空 | 创建时写本地日期 `YYYY-MM-DD` |
| end_date | DATE | 可空 | **全仓无写入**（死列） |
| ai_suggestions | TEXT | 可空 | 创建时写 AI 建议字符串；详情页展示 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | UTC |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 日志/里程碑操作会刷新 |

- 外键：`user_id → users(id)`；被 `project_logs / project_milestones / ai_analyses / ai_summaries / project_knowledge_mappings` 引用（未强制）。
- 索引：`idx_projects_user_id(user_id)`、`idx_projects_status(status)`。

### 1.5 `project_milestones`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) | |
| title | TEXT | NOT NULL | |
| description | TEXT | 可空 | |
| status | TEXT | DEFAULT 'pending' | 业务值 `pending/progress/completed`，无 CHECK |
| progress | INTEGER | DEFAULT 0 | status='progress' 时参与项目进度加权 |
| deadline | DATE | 可空 | 由 `start_date + N 天` 的 UTC 日期截取 |
| sequence | INTEGER | DEFAULT 0 | 创建时取 `MAX(sequence)+1` |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| summary_type | TEXT | DEFAULT "summary" | **误植列**：从 `ai_summaries` 复制建表语句时带入，里程碑业务完全不用 |

- 外键：`project_id → projects(id)`（未强制）。
- 索引：`idx_milestones_project_id(project_id)`。
- 页面（`pages/project/detail.vue`）切换状态时：completed 置 `progress=100`；progress 且原 0 置 `progress=10`。

### 1.6 `project_logs`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) | |
| content | TEXT | 可空 | 正文 |
| progress_text | TEXT | 可空 | 进展（**非** `progress`） |
| problem_text | TEXT | 可空 | 问题（**非** `problem`） |
| plan_text | TEXT | 可空 | 计划（**非** `plan`） |
| log_type | TEXT | DEFAULT 'manual' | 实际值 `manual` / `voice`（`pages/project/log.vue:429`） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | UTC |
| updated_at | DATETIME | **无默认值** | 插入时为 NULL，更新时由 dbService 自动填 `CURRENT_TIMESTAMP` |

- 外键：`project_id → projects(id)`（未强制）。
- 索引：`idx_logs_project_id(project_id)`、`idx_logs_created_at(created_at)`。
- 文档差异：`03-design.md` 2026-10 修订块已改正字段名，但 §4.1 表清单仍未列 `updated_at`；`dbService` 死代码里的 `title NOT NULL / log_type DEFAULT 'general'` 与真实表相反，勿参考。

### 1.7 `ai_analyses`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) | |
| analysis_type | TEXT | NOT NULL | 实际值 `general` / `summary`（后者错写进本表） |
| content | TEXT | 可空 | 分析正文 |
| suggestions | TEXT | 可空 | 建议文本 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

- 外键：`project_id → projects(id)`（未强制）。
- 索引：`idx_ai_analyses_project_id(project_id)`、`idx_ai_analyses_project_updated(project_id, updated_at)`。
- **实现缺陷**：`aiApi.analyzeProject()`（约 `aiApi.js:555`）与 `generateProjectSummary()`（约 `aiApi.js:763`）执行 `insert ai_analyses {project_id, analysis_type, prompt, result, token_usage}`，`prompt/result/token_usage` 三列不存在 → 该路径保存必失败（`no such column: prompt`）。`getAnalysisHistory()` 还按 `analysis.result / analysis.token_usage` 映射，同样读不到。

### 1.8 `ai_summaries`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) | |
| summary_type | TEXT | DEFAULT 'summary' | `aiApi.createSummary` 显式传 `'general'`，故通常是 general |
| content | TEXT | 可空 | |
| suggestions | TEXT | 可空 | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

- 外键：`project_id → projects(id)`（未强制）。
- 索引：`idx_ai_summaries_project_id(project_id)`、`idx_ai_summaries_project_updated(project_id, updated_at)`。
- 实际只有 `aiApi.generateAISummary()` 走 `createSummary` 写本表；`generateProjectSummary()` 却写 `ai_analyses`，两条"总结"链路未统一。

### 1.9 `chat_conversations`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| project_id | INTEGER | 可空 | 仅 `chat_type='project'` 时写；无外键 |
| title | TEXT | 可空 | 默认 `对话 <toLocaleString>` 或 `项目聊天 - MM/DD HH:mm` |
| chat_type | TEXT | DEFAULT "project" | 业务值 `project` / `knowledge`（无 CHECK） |
| related_id | INTEGER | 可空 | project 类型=项目 id；knowledge 类型=知识 id；无外键 |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 可能被传 UTC `toISOString()` 带 Z |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 消息写入后刷新 |

- 外键：**未声明**（`project_id`、`related_id` 都是逻辑关联）。
- 索引：`idx_chat_conversations_project_id(project_id)`、`idx_chat_conversations_type_related(chat_type, related_id)`。
- 语义冗余：project 会话同时有 `project_id` 与 `related_id`（同值）；knowledge 会话 `project_id=NULL`、`related_id=知识id`。列表查询因此分叉：
  - `getConversations(projectId)` 只按 `project_id`（知识会话查不到）；
  - `getConversationsByProject(projectId)` 用 `project_id=? OR (chat_type="project" AND related_id=?)`；
  - `getConversationsByTypeAndId(type, relatedId)` 按 `chat_type + related_id`。

### 1.10 `chat_messages`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| conversation_id | INTEGER | NOT NULL, REFERENCES chat_conversations(id) | 未强制 |
| role | TEXT | NOT NULL | 业务值 `user` / `assistant`（无 CHECK） |
| content | TEXT | NOT NULL | |
| timestamp | DATETIME | DEFAULT CURRENT_TIMESTAMP | UI 写入本地 ISO（无 Z）；默认值为 UTC |
| metadata | TEXT | 可空 | 设计为 JSON 字符串；**实际从未写入**，恒 NULL |

- 外键：`conversation_id → chat_conversations(id)`（未强制）。
- 索引：`idx_chat_messages_conversation_id(conversation_id)`、`idx_chat_messages_timestamp(timestamp)`。
- 读取：`getMessages/getConversationMessages` 均 `ORDER BY timestamp ASC LIMIT n`，取的是**最旧** n 条，不是最近 n 条（分页语义缺陷）。

### 1.11 `knowledge_base`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| title | TEXT | NOT NULL | |
| content | TEXT | 可空 | |
| summary | TEXT | 可空 | 无 summary 时取 content 前 200 字 + `...` |
| view_count | INTEGER | DEFAULT 0 | 详情读取时自增（GET 写库） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | api 显式写本地 ISO |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | 同上 |
| user_id | INTEGER | DEFAULT 1, REFERENCES users(id) | |

- 外键：`user_id → users(id)`；被 `knowledge_tag_mappings.knowledge_id`、`project_knowledge_mappings.knowledge_id`、`favorites.target_id`（多态，无外键）逻辑引用。
- 索引：`idx_knowledge_title(title)`、`idx_knowledge_base_user_id(user_id)`。
- **不存在** `category`、`status`、`key_points`、`ai_score`、`ai_suggestion` 列；api 返回对象里的这些字段都是硬编码默认值（`category:'other'`、`ai_score:0` 等），不能当持久化事实。

### 1.12 `knowledge_tags`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| name | TEXT | NOT NULL **UNIQUE** | 精确匹配（BINARY，大小写敏感） |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | api 写入本地 ISO |

- 外键：被 `knowledge_tag_mappings.tag_id` 引用（未强制）。
- 索引：UNIQUE 隐式索引；无业务索引。
- 标签是全局共享的，不区分 user。

### 1.13 `knowledge_tag_mappings`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| knowledge_id | INTEGER | NOT NULL, REFERENCES knowledge_base(id) | |
| tag_id | INTEGER | NOT NULL, REFERENCES knowledge_tags(id) | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | api 写入本地 ISO |

- 外键：两列均声明（未强制）。
- 索引：**无**（两列都没有索引，SQLite 不为 FK 自动建索引）。
- 唯一约束：**无** `UNIQUE(knowledge_id, tag_id)`；去重完全靠 `updateKnowledgeTags` 的"先全删再插"。
- 写入语义：**全量替换**（`knowledgeApi.updateKnowledgeTags`）。

### 1.14 `project_knowledge_mappings`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| project_id | INTEGER | NOT NULL, REFERENCES projects(id) | |
| knowledge_id | INTEGER | NOT NULL, REFERENCES knowledge_base(id) | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | api 写入本地 ISO |

- 外键：两列均声明（未强制）。
- 索引：**无**；唯一约束：**无**。
- 写入：`linkProject` 先 `findOne` 去重再插入；`updateKnowledge` 按 `project_name` 重绑时先删该知识全部映射。

### 1.15 `favorites`

| 字段 | 类型 | 约束 / 默认 | 说明 |
|---|---|---|---|
| id | INTEGER | PK AUTOINCREMENT | |
| user_id | INTEGER | DEFAULT 1, REFERENCES users(id) | |
| target_type | TEXT | NOT NULL | 仅 `project` / `knowledge`（api 校验，无 CHECK） |
| target_id | INTEGER | NOT NULL | 指向 projects.id 或 knowledge_base.id，**无外键** |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | api 写入本地 ISO |

- 外键：只有 `user_id`（未强制）；`target_id` 是多态逻辑关联。
- 索引：**无**；唯一约束：**无** → 同一用户可重复收藏同一对象（api 用 `findOne` 先查兜底，存在并发/绕行风险）。

### 1.16 物理第 16 张：`android_metadata`

`android_metadata(locale TEXT)`，由 Android SQLite 自动生成，也被 `1.0.0` 的 `create_table` 脚本显式 `IF NOT EXISTS` 创建。导出/导入会把它当业务表一起清空重灌（无实际影响，但污染备份）。

### 1.17 索引总表（1.0.0 共 18 条 + 1.1.0 共 2 条 = 20 条）

| # | 索引 | 表 (列) | 版本 |
|---|---|---|---|
| 1 | idx_settings_category_key | settings(category, key) | 1.0.0 |
| 2 | idx_projects_user_id | projects(user_id) | 1.0.0 |
| 3 | idx_projects_status | projects(status) | 1.0.0 |
| 4 | idx_logs_project_id | project_logs(project_id) | 1.0.0 |
| 5 | idx_logs_created_at | project_logs(created_at) | 1.0.0 |
| 6 | idx_milestones_project_id | project_milestones(project_id) | 1.0.0 |
| 7 | idx_ai_config_user_provider | ai_config(user_id, provider) | 1.0.0 |
| 8 | idx_ai_config_is_active | ai_config(is_active) | 1.0.0 |
| 9 | idx_ai_analyses_project_id | ai_analyses(project_id) | 1.0.0 |
| 10 | idx_ai_analyses_project_updated | ai_analyses(project_id, updated_at) | 1.0.0 |
| 11 | idx_ai_summaries_project_id | ai_summaries(project_id) | 1.0.0 |
| 12 | idx_ai_summaries_project_updated | ai_summaries(project_id, updated_at) | 1.0.0 |
| 13 | idx_knowledge_title | knowledge_base(title) | 1.0.0 |
| 14 | idx_knowledge_base_user_id | knowledge_base(user_id) | 1.0.0 |
| 15 | idx_chat_conversations_project_id | chat_conversations(project_id) | 1.0.0 |
| 16 | idx_chat_conversations_type_related | chat_conversations(chat_type, related_id) | 1.0.0 |
| 17 | idx_chat_messages_conversation_id | chat_messages(conversation_id) | 1.0.0 |
| 18 | idx_chat_messages_timestamp | chat_messages(timestamp) | 1.0.0 |
| 19 | idx_ai_config_promo_code_id | ai_config(promo_code_id) | 1.1.0 |
| 20 | idx_ai_config_editable | ai_config(user_id) WHERE promo_code_id IS NULL（部分索引） | 1.1.0 |

**缺口**（Flutter 需补）：`knowledge_tag_mappings(knowledge_id)`、`knowledge_tag_mappings(tag_id)`、`project_knowledge_mappings(project_id)`、`project_knowledge_mappings(knowledge_id)`、`favorites(user_id, target_type, target_id)`、`project_logs(project_id, created_at)` 复合、`chat_messages(conversation_id, timestamp)` 复合。

### 1.18 文档与实现差异（逐条）

| 差异 | 文档 | 实现（权威） |
|---|---|---|
| `project_logs` 字段名 | `03-design.md` 原写 `progress/problem/plan`，2026-10 修订块已改为 `*_text`；§4.5 提示词示例仍用 `log.progress` | 真实列 `progress_text/problem_text/plan_text`（`01-db.sql:159-172`、`dbUpgradeConfig.js:43`） |
| `ai_config.promo_code_id` | `01-db.sql` 与 `03-design.md` §4.1 均未列 | `1.1.0` ALTER 新增，运行库存在；`03-design.md` §4.1 的核心字段清单也漏了它 |
| 表数量 | `03-design.md` 原写 10 张，2026-10 修订为 15 张 | 物理 16 张（含 `android_metadata`） |
| `project_milestones.summary_type` | 文档完全不提 | 建表误植，空列 |
| `ai_analyses` 写入字段 | 文档列 `analysis_type/content/suggestions` | `aiApi` 有两条路径按 `prompt/result/token_usage` 写，实际必失败 |
| `knowledge_ai_analysis` | 文档无此表 | `knowledgeApi.getAIAnalysis/saveAIAnalysis` 在用它，但 schema/升级脚本中**不存在** |
| `knowledge_base.category` | 无 | `searchKnowledge` 传非 `all` 的 category 时拼 `AND category = ?`，列不存在 → SQL 报错；列表却硬编码 `category:'other'` |
| `projects.status` 枚举 | `active/completed/paused/cancelled`（AGENTS.md §4.1） | 代码只写 `active/completed`；`paused` 仅在 `mapDatabaseStatus` 出现；`cancelled` 0 处 |
| 用户表字段 | 文档 `id/username/email/avatar/settings` | 真实另有 `created_at/updated_at`；死代码里的 `password_hash/avatar_url/UNIQUE` 不成立 |

---

## 2. 数据库版本与升级机制

### 2.1 版本常量

| 项 | 值 | 位置 |
|---|---|---|
| `current_version` | `'1.1.0'` | `utils/dbUpgradeConfig.js:12` |
| `upgrade_order` | `['1.0.0', '1.1.0']` | `utils/dbUpgradeConfig.js:13` |
| 版本存储 | `settings` 表 `category='system', key='db_version'`，`value` = 版本字符串 | `dbService.js:105` / `:444` |
| 残留字段 | `dbService.currentVersion = '1.0.0'`（构造器，**不参与判定**） | `dbService.js:12` |
| 缺省版本 | 查不到则 `'0.0.0'`，执行 `upgrade_order` 全量 | `dbService.js:101`、`:187-198` |

### 2.2 脚本类型（当前实际使用 3 种）

| type | 语义 | 是否幂等 |
|---|---|---|
| `create_table` | `CREATE TABLE IF NOT EXISTS ...`（含 `android_metadata`） | 是 |
| `create_index` | `CREATE INDEX IF NOT EXISTS ...` | 是 |
| `alter_table` | 裸 `ALTER TABLE ... ADD COLUMN promo_code_id TEXT NULL`（无 `IF NOT EXISTS`、无 `ignore_error`） | **否** |

历史文档 `02-db-upgrade-history.md` 提到的 `recreate_table / drop_table / restore_data / alter_table + ignore_error` 在当前配置里**已全部不存在**（2.0.0–2.15.0 已整合进 1.0.0）。`executeVersionScripts` 仍保留 `script.ignore_error` 分支（`dbService.js:203-220`），但当前没有任何脚本使用它。

### 2.3 执行流程

```
App.vue onLaunch
  └─ initDatabase()                        App.vue:59-80
       ├─ dbService.initDB()               dbService.js:32-70
       │    ├─ isInitialized 直接返回
       │    ├─ typeof plus === 'undefined' || !plus.sqlite → throw 'plus.sqlite 不可用，请确保在App环境中运行'
       │    ├─ isOpen() → checkAndUpgradeDatabase()
       │    └─ openDatabase() → checkAndUpgradeDatabase()
       │         ├─ 读 settings(system,db_version)
       │         ├─ 相等 → return
       │         ├─ getVersionsToExecute(from, to)  // 0.0.0 走全量；否则 v>from && v<=to
       │         ├─ 逐版本逐 script 执行；失败且无 ignore_error → throw
       │         └─ updateDatabaseVersion(target)
       │              └─ INSERT OR REPLACE INTO settings(category,key,value)
       ├─ dbService.createIndexes()         // 重复创建 10 条子集索引（IF NOT EXISTS）
       └─ dbService.initDefaultUser()       // users 空表则插入默认用户
```

- 版本比较：`compareVersion` 按 `.` 拆数字逐段比较（`dbService.js:226-246`），非语义化版本，无预发布/构建号。
- 升级不是事务：逐条 `executeSql`，中途失败会留下半套结构，且 `db_version` 仍是旧值。
- `forceRetryUpgrade()`（`dbService.js:454-510`，入口 `pages/profile/index.vue:850`）取 `upgrade_order.slice(-3)` 重跑并**吞掉所有错误**，最后无条件把版本写成目标版本。

### 2.4 已知坑（按严重度）

1. **`ALTER TABLE` 不幂等 + 无 `ignore_error`**：若 1.1.0 的 ALTER 成功但后续索引失败/进程被杀，重试会报 `duplicate column name: promo_code_id`，`initDB` 抛错 → 启动即失败；只有 `forceRetryUpgrade`（吞错）能"绕过"，但它会把版本直接标成 1.1.0。
2. **版本号重置破坏单调性**：旧安装若 `db_version` 是 `2.15.0`，新代码目标 `1.1.0`，`compareVersion(2.15.0, 1.1.0) > 0`，`getVersionsToExecute` 返回空 → 不会执行 1.1.0，却把版本覆盖成 `1.1.0`；之后所有 `promo_code_id` 查询/写入报列不存在。**TODO：需在从旧版升级的真机库上确认是否存在 2.x 版本行**（history 文档称已整合，风险未排除）。
3. **`INSERT OR REPLACE` 重置 `settings` 行**：`id` 变化、`created_at` 丢失，审计信息不可靠。
4. **文档/代码双份 schema**：`dbService.js:255-439` 的 `createBasicTables / createProjectTables / createAITables` 与真实 DDL 冲突（详见 §6），只被 `createAllTables` 调用，而 `createAllTables` 全仓无引用（grep 证实）——死代码，但会误导迁移。
5. **`createIndexes()` 不建全量索引**：只建 10 条（settings、projects user/status、logs project/created、milestones、knowledge title、ai_analyses project、ai_summaries project、ai_config is_active），比 1.0.0 脚本少 8 条；依赖升级脚本而非该方法保证全量。
6. **`importAllData` 先 `DELETE FROM` 所有表**（含 `settings`、`android_metadata`），再逐行 INSERT，失败才 ROLLBACK（`dbService.js:780-827`）。若导入的备份缺 `settings` 表数据，重启后 `db_version` 变 `0.0.0`，会重新跑 1.0.0 + 1.1.0 → 撞上坑 1。
7. **`undo` 不存在**：无降级脚本/备份前自动快照；`forceRetryUpgrade` 是唯一"修复"入口。
8. **H5/小程序不可验证**：`plus.sqlite` 仅 App-Plus 存在，`initDB` 显式抛错；所有 DB 改动只能真机/模拟器验证。

---

## 3. 业务派生规则

### 3.1 项目进度如何由里程碑推导

入口：`projectApi.updateProjectProgress(projectId)`（唯一权威算法）。

```
milestones = SELECT * FROM project_milestones WHERE project_id = ? ORDER BY sequence ASC
if (milestones.length === 0) return          // 不清零、不更新，保留旧 progress
total = 0
for m in milestones:
    if m.status === 'completed'      total += 100
    else if m.status === 'progress'  total += (m.progress || 0)
    else                             total += 0        // pending / 其他
progress = Math.round(total / milestones.length)
UPDATE projects SET progress = ? WHERE id = ?
if (every m.status === 'completed') UPDATE projects SET status = 'completed'
```

要点：
- 权重只看 `status`，不看 `sequence`、`deadline`；`pending` 一律 0。
- 没有里程碑时**直接返回**（手工 `progress` 会保留，删除最后一个里程碑也不会清零）。
- 只会把状态推进到 `completed`，**不会回退**到 `active`；重新打开已完成项目需要手动改库/接口，UI 无入口。
- 触发点：`updateMilestone(status='completed')`、`deleteMilestone`、`updateProgress`、`updatePlan`（间接）。
- `updateProgress(projectId, {progress, description})` 先写手填值，再调用 `updateProjectProgress` 覆盖：**有里程碑时手填 progress 无效**；无里程碑时才保留。
- `updatePlan` 把 `plan` 写进 `projects.description`；若传 `goals` 数组会写 `projects.goals`（列不存在 → SQL 报错），这是接口层缺陷。

### 3.2 状态流转

| 实体 | 取值 | 写入点 |
|---|---|---|
| `projects.status` | `active`（创建）、`completed`（全部里程碑完成时自动） | `createProject`、`updateProjectProgress` |
| `projects.status`（文档/映射） | `paused` 仅出现在 `mapDatabaseStatus`；`cancelled` 无任何代码 | 无写入 |
| `project_milestones.status` | `pending`（创建）→ `progress` / `completed`（页面切换） | `createMilestone`、`updateMilestone`、页面 |
| `project_logs.log_type` | `manual` / `voice` | `createLog`（log.vue 语音入口传 voice） |
| `chat_conversations.chat_type` | `project` / `knowledge` | `ChatComponent` / 页面 |
| `chat_messages.role` | `user` / `assistant` | `saveMessage` |
| `ai_analyses.analysis_type` | `general`（正常）/ `summary`（错误路径） | `aiApi` |
| `ai_summaries.summary_type` | `general`（createSummary 默认传 general） | `aiApi` |
| `favorites.target_type` | `project` / `knowledge` | `favoriteApi.addFavorite` / `knowledgeApi.toggleFavorite` |
| `ai_config.provider` | 6 个枚举（见 §4.2） | 设置页 / 推广码 |

UI 映射（`projectApi.js:523-545`）：

| DB 值 | API `status` | `statusText` |
|---|---|---|
| `active` | `progress` | 进行中 |
| `completed` | `completed` | 已完成 |
| `pending` | `pending` | 待开始 |
| `paused` | `warning` | 有风险 |
| 其他 / undefined | `progress` | 未知状态 |

注意：`getProjectList({status})` 会把参数直接拼进 `projects.status = ?`，但页面拿到的是**映射后**的 `status`；若调用方按 UI 值（`progress`）过滤会永远查不到（当前页面未传该参数，属潜在坑）。

### 3.3 删除级联清理范围（实测 api 代码）

| 操作 | 清理顺序 | 未清理（孤儿风险） |
|---|---|---|
| `projectApi.deleteProject(id)` | `project_logs` → `project_milestones` → `ai_analyses` → `project_knowledge_mappings` → `projects` | `ai_summaries`（project_id 悬挂）、`chat_conversations`/`chat_messages`（项目聊天记录永久残留）、`favorites`（project 类型收藏悬挂，列表跳过但行仍在） |
| `knowledgeApi.deleteKnowledge(id)` | `knowledge_tag_mappings` → `project_knowledge_mappings` → `favorites(target_type='knowledge')` → `knowledge_base` | `chat_conversations(chat_type='knowledge', related_id=id)` 及其 `chat_messages` |
| `knowledgeApi.deleteTag(id)` | `knowledge_tag_mappings(tag_id)` → `knowledge_tags` | 无 |
| `chatApi.deleteConversation(id)` | `chat_messages` → `chat_conversations`（无事务） | 无 |
| `favoriteApi.removeFavorite(type, id)` | 只删 `favorites` 一行 | 目标对象不受影响 |
| `dbService.importAllData` | `DELETE FROM` 每张物理表 → 逐行 INSERT → COMMIT（失败 ROLLBACK） | —（但会清 `settings/db_version`） |

补充：
- `logApi.createLog/updateLog/deleteLog` 每次都会 `UPDATE projects SET updated_at = ...`，用于列表排序；`dbService.update('projects', {}, 'id=?')` 也会触发自动 `updated_at = CURRENT_TIMESTAMP`。
- `knowledgeApi.getKnowledgeDetail` 每次读取都 `view_count = view_count + 1`（GET 产生写放大，统计不可重放）。
- `projectApi.getProjectStats` 的 `totalMilestones/completedMilestones` 用 `JOIN projects` 限定当前用户，但只统计 `status='completed'`，不含 `progress`。
- `logApi.getLogStats`：`problemLogs` 用 `problem_text IS NOT NULL AND problem_text != ''`；`recentWeekLogs` 用 `datetime('now','-7 days')`（UTC 与本地 ISO 混比）。
- `knowledgeApi.getKnowledgeStats`：`publishedCount = totalCount`、`draftCount = 0`、`categoryStats = []`，是占位统计。

---

## 4. 专项结构

### 4.1 `settings` 与"默认值"真相

- 表结构：`category/key/value`，唯一键 `(category,key)`。
- 全库唯一一行：`category='system'`、`key='db_version'`、`value='1.1.0'`（由升级流程写入）。
- **没有任何业务设置键**（无 theme/language/backup/ai 等）；页面读设置一律走 `users.settings`。
- `users.settings` JSON 键（只有 3 个）：
  - `title`：默认 `'产品经理'`（`userApi.formatUserData` 兜底）
  - `isVip`：默认 `false`
  - `theme`：默认 `'light'`；`pages/profile/edit.vue:225` 固定写 `'light'`
- 默认用户有两条不同来源：`dbService.initDefaultUser()` 写 `settings='{}'`（`默认用户/default@example.com/''`）；`userApi.createDefaultUser()` 写 `{"title":"产品经理","isVip":false,"theme":"light"}`（`用户/''/👤`）。先跑哪条决定最终形态。

### 4.2 `ai_config` 字段与多供应商约束

- 唯一约束 `UNIQUE(provider, user_id)` → 每用户每供应商最多一条；换 key 是 UPDATE 而不是新行。
- 激活语义：`is_active=1`。四个写入点都会先清零同用户其他行：
  - `addAIConfig`：`update ai_config {is_active:0} where user_id=?`（条件：传入 is_active）
  - `updateAIConfig`：`UPDATE ... SET is_active=0 WHERE id != ? AND user_id=?`
  - `saveAIConfig`：先 upsert（按 provider+user_id），再 `UPDATE ... WHERE provider != ? AND user_id=?`
  - `activateAIConfig`：`UPDATE ... is_active=0 WHERE user_id=?` → `... is_active=1 WHERE provider=? AND user_id=?`
- 读取：`getActiveAIConfig` 用 `is_active=1 AND user_id=?`；查不到时返回**内存兜底对象**（不落库）：`{provider:'deepseek', base_url:'https://api.deepseek.com/v1', api_key:'', model:'deepseek-chat', timeout:130, max_tokens:2000, temperature:0.7}`。
- 分享码约束：`promo_code_id` 非空 = 只能由分享码流程管理：
  - `canEditConfig` 返回 `!config.promo_code_id`；`updateAIConfig` 不满足直接抛 `该配置来自分享码，不允许编辑...`。
  - `getEditableConfigs` 用 `promo_code_id IS NULL`（命中部分索引）。
  - `getConfigsWithSource` 派生 `source_type: 'promo_code' | 'manual'`、`is_editable`。
  - `deleteAIConfig(provider)` 按 provider+user 删除，若与推广码 provider 相同则 `promoApi.clearPromoConfig()`。
- 供应商枚举与默认值（`utils/aiProviders.js`）：

| provider | 显示名 | 默认 base_url | 默认模型（示例） | defaultConfigs(timeout/max_tokens/temp) |
|---|---|---|---|---|
| `deepseek` | DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat`、`deepseek-reasoner` | 130 / 8000 / 0.7 |
| `siliconflow` | 硅基流动 | `https://api.siliconflow.cn/v1` | `deepseek-ai/DeepSeek-R1`、`deepseek-ai/DeepSeek-V3`、`Qwen/Qwen3-8B/14B/32B` | 130 / 4000 / 0.7 |
| `openai` | OpenAI | `https://api.openai.com/v1` | `gpt-5-2025-08-07`、`gpt-5-mini-2025-08-07`、`gpt-5-nano-2025-08-07` | 130 / 4000 / 0.7 |
| `kimi` | Kimi | `https://api.moonshot.cn/v1` | `kimi-k2-0711-preview` | 130 / 4000 / 0.7 |
| `qwen` | 阿里云通义千问 | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-turbo-latest`、`qwen-plus-latest` | 130 / 4000 / 0.7 |
| `custom` | 自定义兼容端点 | `''`（用户填） | `custom-model` | 130 / 2000 / 0.7 |

- 写入默认值不一致：DDL `timeout DEFAULT 30`，`addAIConfig` 默认 30，`updateAIConfig/saveAIConfig` 默认 **130**；`max_tokens` 在 DDL/`addAIConfig` 是 2000，但供应商默认 4000/8000（设置页按 `defaultConfigs` 预填）。
- 推广码路径（`api/promoApi.js`）：用 `INSERT OR REPLACE` 直接写 12 列，`created_at/updated_at` 写 `Date.now()` **毫秒整数**；默认 `base_url='https://api.deepseek.com/v1'`、`timeout=130`、`max_tokens=2000`、`temperature=0.7`；同一 provider 已存在分享码配置时拒绝；备份只写 uni storage `ai_config_backup`（不落库）。
- 安全：`api_key` 明文存 SQLite；无加密/无 Keychain。`promo_code_id` 只是来源标记，不构成权限。

### 4.3 `chat_conversations` / `chat_messages` 持久化结构

会话创建（`ChatComponent.createOrLoadConversation()`，`ChatComponent.vue:430-474`）：
1. 先按 `chat_type + related_id` 查最新会话（`ORDER BY updated_at DESC`），有则复用；
2. 无则 `createConversation({type, relatedId, title, createdAt: new Date().toISOString()})`，project 类型额外传 `projectId=relatedId`；
3. 标题：`项目聊天 - MM/DD HH:mm` / `知识库聊天 - MM/DD HH:mm` / `聊天记录 - MM/DD HH:mm`（zh-CN 本地化）。

消息写入（`ChatComponent.saveMessageToHistory` → `chatApi.saveMessage`）：
- SQL 插入 `{conversation_id, role, content, timestamp: DateUtils.getCurrentLocalISOString()}`，随后 `updateConversation({updated_at: now})`。
- 每次保存**两条 update**（消息 INSERT + 会话 UPDATE），无事务。
- `metadata` 不写（恒 NULL）；`addMessage`（支持 metadata）无调用方。
- 读取 `getConversationMessages(id, limit=100)`：`ORDER BY timestamp ASC LIMIT 100` → 超长会话只显示最早 100 条，新消息看不到。
- 单会话多消息按 `timestamp` 排序；同毫秒写入顺序依赖 rowid，不稳定。

两条时间格式并存：
- `chat_conversations.created_at`：`toISOString()`（`...Z`，UTC）；
- `chat_messages.timestamp`：`getCurrentLocalISOString()`（本地时间、无时区后缀）；
- DDL 默认值：UTC `CURRENT_TIMESTAMP`。
同一会话内 UI 展示会因 `DateUtils.utcToBeijing` 对无 Z 字符串 +8h 而错位（详见 §6.9）。

### 4.4 `knowledge` 标签多对多

- 关系：`knowledge_base 1—N knowledge_tag_mappings N—1 knowledge_tags`，无 UNIQUE(knowledge_id, tag_id)。
- 标签名全局唯一（`name UNIQUE`），大小写敏感；`ensureTagExists` 只做精确 `findOne name`，`'AI'` 与 `'ai'` 会生成两条。
- 写入语义：`updateKnowledgeTags(id, tags)` **先删该知识全部映射，再逐条插入**；tags 必须是字符串数组（传对象会 `tagName.trim is not a function`）。
- 读取语义：`getKnowledgeTags` 返回**字符串数组**（不是 tag 对象），供页面直接 `v-for`。
- 关联项目：`linkProject(knowledgeId, projectId)` 先查重；`updateKnowledge` 收到 `project_name` 时先删该知识全部项目映射，再按 `projects.name = ?` 查项目并重绑（项目名可重复 → 只绑第一条）。
- 删除标签：先删映射再删标签；删除知识：先删映射与收藏再删主表。
- 派生：`getRelatedKnowledge` 通过共享项目自连接，按 `view_count DESC, updated_at DESC` 取 5 条；无共享项目返回空。
- **缺失表**：`knowledgeApi.getAIAnalysis/saveAIAnalysis` 读写 `knowledge_ai_analysis`（`knowledge_id/analysis_type/content/score/created_at`），schema 与升级脚本均无此表 → 运行时报 `no such table`。

### 4.5 `favorites` 多态

- 结构：`(user_id, target_type, target_id, created_at)`，`target_type` 仅 `project` / `knowledge`。
- 写入：
  - `favoriteApi.addFavorite(type,id,userId)`：先校验枚举，再 `findOne` 去重，存在返回 false，否则插入；
  - `knowledgeApi.toggleFavorite`：自己再实现一遍（查 → 删/插），与 `favoriteApi` 逻辑重复；
  - 实际 UI 只有知识详情/列表调用 `toggleFavorite`，项目收藏无入口。
- 读取：`getFavoritesList` 先查 `favorites`，再逐条回查 `projects` / `knowledge_base`；目标不存在**静默跳过**（孤儿行不返回、不清理）。
- 派生字段：project → `title=name`、`description=description||goal||'暂无描述'`、`status` 是**原始 DB 值**（未走 `mapDatabaseStatus`）；knowledge → `description=summary||'暂无描述'`、`viewCount`。
- 清理：`deleteKnowledge` 会删 `favorites(target_type='knowledge')`；`deleteProject` **不会**删 project 收藏。
- 统计：`getFavoritesStats` 三次 `COUNT(*)`（total / project / knowledge）。

---

## 5. 字段命名映射（DB snake_case → api / 页面）

### 5.1 通用规则

1. 映射发生在 `api/*Api.js`，页面不直接接触 DB 列名（架构约定）。
2. 大多数表**原样透传** DB 行（`...row`），只补业务字段；因此页面同时混用 snake_case 与 camelCase。
3. 时间字段常被 `DateUtils.formatDateTime/formatUpdateTime` 替换成**展示字符串**（`刚刚/N分钟前/...`），原始值在 API 返回中被覆盖。
4. 布尔语义用 `!!` 派生，不落库。
5. `getProjectList/detail` 会把 `name → title`，页面统一用 `title`；`projects.name` 原始列仍在。

### 5.2 逐表映射

| 表 | DB 列 | API / 页面字段 | 说明 |
|---|---|---|---|
| projects | name | title | `projectApi.getProjectList/detail/getAllProjects` |
| projects | updated_at | updateTime | 被格式化为相对时间 |
| projects | status | status + statusText | 值被 `mapDatabaseStatus` 改写（active→progress 等） |
| projects | progress | progress | null→0 |
| projects | ai_suggestions | ai_suggestions | 详情页直接读（未 camelCase） |
| projects | description | description | `updatePlan` 的 plan 也写这里 |
| project_milestones | * | 原样 | 页面用 `status/progress/deadline/sequence` |
| project_logs | progress_text | progressText | `getRecentLogs` 显式映射；`getProjectLogs` 原样 + hasX |
| project_logs | problem_text | problemText | 同上 |
| project_logs | plan_text | planText | 同上 |
| project_logs | log_type | logType | 仅 `getRecentLogs` 映射 |
| project_logs | created_at | created_at（展示串） | `getProjectLogs` 用格式化值覆盖原始列 |
| project_logs | — | hasProgress/hasProblem/hasPlan | 由 `!!*_text` 派生 |
| ai_analyses | project_id / analysis_type / created_at | projectId / analysisType / createdAt / formattedTime | `getAnalysesList` 映射 |
| ai_analyses | content | content | `getAnalysisHistory` 错映射 `analysis.result` |
| ai_summaries | summary_type | summaryType | `getSummariesList` |
| chat_conversations | * | 原样（id/title/chat_type/related_id/project_id） | 页面只用 id/title |
| chat_messages | role | type（user/ai） | ChatComponent 内转换：`role==='user' ? 'user' : 'ai'` |
| chat_messages | timestamp | timestamp | 原样传出，可能为本地 ISO |
| knowledge_base | view_count | viewCount | `getKnowledgeList/detail` |
| knowledge_base | updated_at | updateTime | 相对时间字符串 |
| knowledge_base | — | tags | 由映射表查出的 name 数组 |
| knowledge_base | — | project_name | 取 `relatedProjects[0].name`，非持久化 |
| knowledge_base | — | ai_score/aiScore/keyPoints/category/aiAnalysis/ai_suggestion | **硬编码默认值**（0/[]/'other'/{}），无对应列 |
| knowledge_tags | name | tags[i] | 直接字符串 |
| favorites | target_type | type | `getFavoritesList` |
| favorites | target_id | id | 与 favoriteId 区分 |
| favorites | created_at | favoriteTime | 相对时间 |
| projects（收藏项） | name | title | 收藏列表再映射一次 |
| users | settings | title / isVip / theme | 解析 JSON；`days` 由 `created_at` 计算 |
| ai_config | base_url / api_key / max_tokens | baseUrl / apiKey / maxTokens（部分入口） | `saveAIConfig` 两种都接受；其余入口用 snake_case |
| settings | value | db_version | 仅 dbService 内部 |

### 5.3 反向陷阱（页面/接口写 DB）

- `projectApi.updateProject(updateData)` 原样透传：调用方若传 `title/updateTime` 会拼出不存在的列（SQL 报错）。
- `logApi.updateLog` 同样透传：只接受 snake_case。
- `knowledgeApi.updateKnowledge` 只按白名单 `title/content/summary/updated_at` 组装，较安全。
- `userApi.updateUser` 只按 `username/email/avatar/settings/updated_at` 白名单，安全。
- `promoApi.applyPromoCode` 直接写 SQL，字段名硬编码，安全但绕过 dbService 校验。

---

## 6. 旧 schema 设计缺陷 & Flutter 新 schema 修正建议

> 目标：**不要照搬**。下面每条给出"旧实现事实 → 风险 → Flutter 建议"。

### 6.1 版本与迁移

- 旧：版本重置（2.x → 1.1.0）、`ALTER` 不幂等、无事务、失败不可恢复、`forceRetryUpgrade` 吞错。
- Flutter：`sqflite` + `onCreate/onUpgrade` 单调递增 `schemaVersion`；**每个版本一个事务**；迁移脚本只追加不修改；保留 `schema_migrations(version, applied_at)` 审计表；禁止"force retry"式吞错；启动失败要显式降级/提示而不是静默标版本。
- 迁移参考：把 §1 的 15 张表作为 v1 基线导入，`promo_code_id` 直接进基线，不再模拟 ALTER。

### 6.2 枚举无约束

- 旧：`status/role/chat_type/target_type/log_type` 全是裸 TEXT，无 CHECK，靠 api 约定。
- Flutter：Dart `enum` + `CHECK` 约束（或 lookup 表）；数据库值统一小写英文；`projects.status` 建议 `active/completed/paused/archived` 四值，并与 UI 文案解耦（不要存 UI 文案）。

### 6.3 外键声明但不强制

- 旧：所有 `FOREIGN KEY` 因 `PRAGMA foreign_keys` 默认 OFF 而不生效；级联靠手写删除。
- Flutter：打开库时 `PRAGMA foreign_keys = ON`；子表 `ON DELETE CASCADE`（project → logs/milestones/analyses/summaries/mappings；conversation → messages）；仍保留显式事务删除作为双保险。

### 6.4 级联覆盖不全

- 旧：删项目留 `ai_summaries/chat/favorites`；删知识留 chat。
- Flutter：外键级联 + 应用层 `deleteProject` 事务；聊天会话改为 `project_id`/`knowledge_id` 两个可空外键（`CHECK` 恰一个非空）并 `ON DELETE CASCADE`；收藏用触发器或应用层统一清理。

### 6.5 多态收藏无完整性

- 旧：`favorites(target_type,target_id)` 无 UNIQUE、无目标 FK，孤儿行静默跳过。
- Flutter：二选一：
  - 推荐：拆 `favorite_projects(user_id, project_id, created_at, PK(user_id,project_id))` 与 `favorite_knowledge(...)`，各自外键级联；
  - 或保留多态但加 `CHECK(target_type IN ('project','knowledge'))`、`UNIQUE(user_id,target_type,target_id)`、`BEFORE DELETE` 触发器/定时清理。

### 6.6 多对多缺唯一键与索引

- 旧：`knowledge_tag_mappings`、`project_knowledge_mappings` 无 UNIQUE、无索引；`favorites` 无索引。
- Flutter：复合主键 `(knowledge_id, tag_id)`、`(project_id, knowledge_id)`；补 `idx_tag_mappings_tag(tag_id)`、`idx_project_mappings_project(project_id)`、`favorites(user_id, target_type, target_id)` 唯一索引。

### 6.7 冗余/死列与误植列

- 旧：`project_milestones.summary_type`（误植）、`projects.end_date`（无写入）、`chat_conversations.project_id` 与 `related_id` 冗余、`chat_messages.metadata`（恒 NULL）、`projects.ai_suggestions` 只写不更新、`users` 无密码却保留多用户字段。
- Flutter：删 `summary_type`（里程碑不需要）；`projects.start_date/end_date` 保留但纳入创建/编辑流程或删除；会话只保留 `scope + project_id/knowledge_id` 两个可空列（加 CHECK），不再用 `related_id` 泛型；`metadata` 明确为可选 `TEXT`（JSON），不用就删；`users` 简化为 `profile(id=1, nickname, email, avatar, prefs_json)`。

### 6.8 派生字段与手工写入冲突

- 旧：`projects.progress` 既存又算，`updateProgress` 写后被覆盖；无里程碑时永不清零。
- Flutter：单一事实来源：
  - 方案 A（推荐）：不存 `progress`，查询时按里程碑聚合（Dart/SQL 计算），彻底消除漂移；
  - 方案 B：保留 `progress` 但只允许 repository 内部在里程碑事务里更新，禁止暴露"手填进度"接口；无里程碑时明确置 0 或保持并标注"未计划"。
- 状态同理：`completed` 由聚合结果推导，或由显式命令设置并记录 `completed_at`。

### 6.9 时间与时区

- 旧：四套格式（UTC 文本、本地 ISO 无 Z、UTC Z、epoch ms）；`DateUtils.utcToBeijing` 把无 Z 当 UTC +8h，导致本地 ISO 字段显示快 8 小时。
- Flutter：**统一存 UTC epoch 毫秒 INTEGER**（或带时区的 ISO 8601 字符串，二选一），展示层再转本地；禁止 `CURRENT_TIMESTAMP` 与本地无时区混用；迁移时对旧值做来源标注（哪个字段由哪条路径写入），无法判定的标 TODO 人工校正。

### 6.10 SQL 拼接与类型

- 旧：`executeSql/query` 用字符串替换 `?`，字符串仅转义单引号，对象 `JSON.stringify`，`undefined→NULL`，布尔直接 `true/false`；`update` 支持传 where 字符串（`id = ${id}` 拼接）。
- Flutter：全部走参数化查询（`sqflite` 原生 `?`）；DTO/模型层做类型转换；禁止字符串拼 SQL。

### 6.11 索引与查询

- 旧：缺映射表/FK 索引，`getMessages` 取最早 N 条，`getConversations` 与 `getConversationsByProject` 语义分叉，`searchKnowledge` 拼不存在的 `category`。
- Flutter：补复合索引；消息分页用 `ORDER BY created_at DESC LIMIT n` + 游标（keyset），UI 反向渲染；会话查询统一按 `scope + 关联 id`；搜索只对真实列做 FTS5（标题/正文/摘要）。
- 旧：`view_count` 在 GET 中自增，统计失真。Flutter：浏览事件表或显式 `incrementViewCount` 命令，允许节流。

### 6.12 AI 数据表

- 旧：`ai_analyses` 正常路径与错误路径字段不一致（`content/suggestions` vs `prompt/result/token_usage`）；`ai_summaries` 只在一条链路使用；`knowledge_ai_analysis` 根本不存在。
- Flutter：统一 `ai_outputs(id, project_id?, knowledge_id?, kind, content, suggestions, prompt, raw_response, model, token_usage_json, created_at)` 一张表，或两张同构表共享字段契约；写入前做 schema 校验；AI 调用日志与业务结果分开存。
- 旧：`ai_config` 明文 key。Flutter：key 存 `flutter_secure_storage`，SQLite 只存 `provider/base_url/model/timeout/max_tokens/temperature/is_active/promo_code_id`（或加密 blob）。
- 旧：`is_active` 靠应用逻辑保证唯一。Flutter：`CREATE UNIQUE INDEX ux_ai_active ON ai_config(user_id) WHERE is_active = 1`（SQLite 部分索引）从库层保证。

### 6.13 设置与用户偏好

- 旧：`settings` 表形同虚设，只有 `db_version`；偏好塞 `users.settings` JSON，无 schema、无迁移。
- Flutter：`app_settings(key TEXT PRIMARY KEY, value TEXT, updated_at)`（值用 JSON 字符串）或 `shared_preferences`；DB 版本放 `PRAGMA user_version` 或独立 `db_meta` 表，不混业务设置；偏好键要有默认值与版本化迁移。

### 6.14 其他

- `knowledge_base` 的 `summary` 由正文截断 200 字生成（`replace(/\n/g,' ')` 正则转义有误，见源码），Flutter 用真正的摘要字段/服务，不要在写路径做截断。
- `knowledge_base` 的 `category`/`ai_score`/`key_points` 是 UI 幻觉；新 schema 若需要分类，建 `knowledge_categories` 或 `category_id` 外键，不要硬编码 `'other'`。
- 单用户硬编码：保留 `profile(id=1)` 即可；若未来多用户，所有查询必须带 `user_id` 且建索引，不能依赖 `DEFAULT 1`。
- 备份/恢复：旧实现导出全部物理表（含 `android_metadata`）再整库 DELETE/INSERT。Flutter 备份应为带 `schema_version` 的 JSON/文件，按表事务导入，保留 `db_meta`，拒绝跨大版本直接灌入。

---

## 7. 迁移参考：旧字段清单（照抄必错，需转换）

### 7.1 真实字段（迁移时逐列搬运）

见 §1 的 15 张表；其中必须显式转换的列：

| 表.列 | 旧实际类型/格式 | Flutter 目标 |
|---|---|---|
| projects.name | TEXT | `title`（或保留 name + UI 映射） |
| projects.status | TEXT active/completed | Dart enum（统一枚举） |
| projects.progress | INTEGER 0–100（派生+手写） | 计算列或 repository 维护 |
| projects.start_date/end_date | `YYYY-MM-DD` 文本 | epoch ms 或 ISO date |
| project_milestones.deadline | `YYYY-MM-DD` 文本 | epoch ms / date |
| project_milestones.status | pending/progress/completed | enum |
| project_logs.progress_text/problem_text/plan_text | TEXT | 同名字段或 `progress_note/problem_note/plan_note` |
| project_logs.log_type | manual/voice | enum |
| project_logs.updated_at | 可 NULL | 非空 + 默认 |
| ai_analyses.analysis_type/content/suggestions | TEXT | 统一 AI 输出表 |
| ai_summaries.summary_type/content/suggestions | TEXT | 统一 AI 输出表 |
| chat_conversations.chat_type/related_id | TEXT/INTEGER | `scope + project_id/knowledge_id` |
| chat_messages.role | user/assistant | enum |
| chat_messages.metadata | 恒 NULL | 可选 JSON 或删除 |
| knowledge_base.view_count | INTEGER | 事件表或计数 |
| knowledge_tags.name | TEXT UNIQUE | 保留 UNIQUE（建议 `COLLATE NOCASE`） |
| favorites.target_type/target_id | TEXT/INTEGER | 拆表或 CHECK + UNIQUE |
| ai_config.api_key | TEXT 明文 | 安全存储 |
| ai_config.promo_code_id | TEXT（1.1.0 新增） | 保留来源标记 |
| settings.value | TEXT | JSON/typed |
| users.settings | TEXT JSON | `prefs_json` |

### 7.2 只存在于文档/死代码的"幻影字段"（**不要迁移**）

| 来源 | 幻影字段 | 真相 |
|---|---|---|
| `03-design.md` 旧版 | project_logs.progress / problem / plan | 真实为 `*_text` |
| `03-design.md` §4.5 提示词示例 | `log.progress` | 同上 |
| AGENTS.md §4.1 | projects.status `paused/cancelled` | 代码只写 active/completed |
| dbService.createBasicTables（死代码） | users.password_hash / avatar_url / username UNIQUE / email UNIQUE | 真实 users 无这些约束/列 |
| dbService.createProjectTables（死代码） | project_logs.title / log_type DEFAULT 'general'；milestones.due_date / completed_at | 真实列不同 |
| dbService.createProjectTables（死代码） | favorites.item_type / item_id / UNIQUE(user_id,item_type,item_id) | 真实为 target_type/target_id，无 UNIQUE |
| dbService.createAITables（死代码） | ai_config.name UNIQUE / base_url 可空 / model DEFAULT 'gpt-3.5-turbo' | 真实 provider 唯一、base_url NOT NULL、model NOT NULL |
| aiApi 错误写入路径 | ai_analyses.prompt / result / token_usage | 列不存在，写入必失败 |
| knowledgeApi | knowledge_ai_analysis 表、knowledge_base.category | 不存在 |
| knowledgeApi 返回对象 | ai_score / aiScore / keyPoints / aiAnalysis / ai_suggestion | 硬编码，无列 |

### 7.3 TODO（未在本次审计中验证，需真机/后续确认）

- [ ] 真机 `PRAGMA foreign_keys` 实际值（代码未设置，默认应为 0）。
- [ ] 从历史 2.x 版本升级上来的真实库中 `settings.db_version` 的值，以及 `ai_config.promo_code_id` 是否真的存在（验证 §2.4 坑 2）。
- [ ] `android_metadata` 在目标设备上是否由系统预先创建（影响 1.0.0 `CREATE TABLE IF NOT EXISTS` 是否命中）。
- [ ] `projects.status` 是否存在 `paused` 的历史脏数据（代码无写入，但手工/旧版本可能留下）。
- [ ] `chat_conversations.title` 是否存在旧格式标题（影响迁移展示，不影响结构）。
- [ ] `project_logs.updated_at` 为 NULL 的历史行数量（迁移时需补默认值）。

---

## 8. 证据索引（源码位置）

| 主题 | 位置 |
|---|---|
| 库名/路径/残留版本 | `utils/dbService.js:9-13` |
| initDB / plus 检查 / -1402 | `utils/dbService.js:32-70`；`App.vue:59-80` |
| 版本读取与升级入口 | `utils/dbService.js:97-126` |
| 版本筛选 / 比较 | `utils/dbService.js:187-198`、`:226-246` |
| 脚本执行 / ignore_error | `utils/dbService.js:203-220` |
| 版本写回 INSERT OR REPLACE | `utils/dbService.js:442-449` |
| forceRetryUpgrade | `utils/dbService.js:454-510` |
| 死代码建表 | `utils/dbService.js:255-439` |
| SQL 字符串拼参 | `utils/dbService.js:583-669` |
| insert / update 自动 updated_at | `utils/dbService.js:674-714` |
| 导出 / 导入 | `utils/dbService.js:756-827` |
| 默认用户 | `utils/dbService.js:561-577` |
| 升级脚本 1.0.0 / 1.1.0 | `utils/dbUpgradeConfig.js:11-268` |
| 权威 DDL | `doc/03-design/01-db.sql` |
| 升级历史（2.0.0–2.15.0） | `doc/03-design/02-db-upgrade-history.md` |
| 设计文档数据模型 | `doc/03-design/03-design.md:187-224` |
| 项目进度/状态映射 | `api/projectApi.js:523-545`、`updateProjectProgress` |
| 日志字段映射 | `api/logApi.js`（getProjectLogs/getRecentLogs/createLog） |
| 会话/消息 CRUD | `api/chatApi.js:56/77/99/121/151/291/365` |
| AI 配置 CRUD | `api/aiApi.js:93-117、223-256、264-305、343-380、387-436、443-474、481-508` |
| 知识标签/关联/删除 | `api/knowledgeApi.js`（updateKnowledgeTags/ensureTagExists/deleteKnowledge/linkProject） |
| 收藏 | `api/favoriteApi.js`、`api/knowledgeApi.toggleFavorite` |
| 用户/偏好 | `api/userApi.js`、`utils/userStore.js` |
| 聊天 UI 持久化 | `components/ChatComponent.vue:391-474` |
| 时间转换 | `utils/dateUtils.js:13、96、156-160、184-201` |
| 供应商定义 | `utils/aiProviders.js:4-95` |
| 推广码写入 ai_config | `api/promoApi.js`（applyPromoCode / removePromoCode） |

---

*本文只记录事实与建议，未对仓库源码做任何修改；所有"旧 schema 缺陷"均在 §6 给出 Flutter 侧修正方向。*
