# AI项目管理APP概要设计文档（uniapp版）

> ⚠️ **修订说明（2026-10）**
>
> 本文档撰写于项目早期（`app/` 目录时代），**部分内容已过时**，以根目录 `AGENTS.md` 与源码为准。
> 事实优先级：**AGENTS.md > 源码 > 本文档**。
>
> 本次（2026-10）就地改正的错误断言：
>
> 1. §2.2 UI 组件库 `uView UI` → 实际为 **nutui-uniapp**（easycom 自动注册，无原生 tabBar）；
> 2. §2.2 状态管理 `Pinia` → 实际**无全局状态库**（全仓无 pinia / vuex），当前用户状态是 `utils/userStore.js`；
> 3. §4.1 `project_logs` 字段 `progress / problem / plan` → 实际为 **`progress_text / problem_text / plan_text`**（另有 `content`、`log_type`）；
> 4. §4.1 表清单只列 10 张 → 实际 **15 张**，已补 `settings`、`ai_config`、`ai_summaries`、`chat_conversations`、`chat_messages`；
> 5. §6.1 页面树 `mine/` → 实际为 **`pages/profile/`**；首页不是 `pages/index/`，而是 **`pages/project/list`**（`pages.json` 第一个页面），`pages/index/index.vue` 属未注册死页；
> 6. §11.1 附录 UI 组件库 `uView UI` → 实际为 **nutui-uniapp**；AI 模型服务现为多供应商（`utils/aiProviders.js`：openai / deepseek / siliconflow / kimi / qwen / custom）。
>
> 另有一类差异仅在本文说明、正文未逐句改写（避免破坏历史设计叙述）：
>
> - 文中 `aiService.js` / `AIService` → 现为 `api/aiApi.js`；`DBService` → 现为 `utils/dbService.js` 单例；
> - 文中 `ProjectModel` / `LogModel` 等数据模型类不存在，字段映射统一在 `api/*Api.js` 完成；
> - 项目进度实际**由里程碑推导**（已完成里程碑 / 总数 × 100，满 100 自动置 `completed`），不是「节点完成率 + 手动进度值」；
> - 数据库结构以 `doc/03-design/01-db.sql` 为准（仍与实现有少量偏差），升级脚本见 `utils/dbUpgradeConfig.js`。
>
> 未标注修订的章节（如 §9 开发计划、§10 风险）属历史规划，仅供参考，不构成实现承诺。

## 1. 项目概述

### 1.1 项目目标

开发一款基于uniapp的跨平台AI项目管理应用，实现项目全生命周期管理、智能日志记录、AI辅助分析及知识库沉淀功能，无需自建后端服务，通过sqlite本地存储数据，直接调用第三方AI模型接口实现智能交互。

### 1.2 项目范围

- 支持平台：iOS、Android、H5
- 核心功能：项目管理、进度跟踪、日志记录、AI分析、知识库管理、个人中心
- 技术限制：无自建后端，数据本地存储，AI交互依赖第三方API

### 1.3 目标用户

需要管理个人或小型团队项目的产品经理、开发者、创业者等，注重项目效率和知识沉淀的用户

## 2. 系统架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────┐
│                 表现层                      │
│  (pages组件、导航组件、公共UI组件、交互逻辑)  │
├─────────────────────────────────────────────┤
│                 业务层                      │
│  (项目管理、日志管理、AI交互、知识库、用户)  │
├─────────────────────────────────────────────┤
│                 数据层                      │
│  (sqlite数据库操作、本地缓存、数据模型)      │
├─────────────────────────────────────────────┤
│               外部服务层                    │
│  (AI模型HTTP接口、文件存储、统计分析)        │
└─────────────────────────────────────────────┘
```

### 2.2 技术架构

- 框架：uniapp（Vue 3 + Vite）
- 状态管理：无全局状态库（全仓无 pinia / vuex），当前用户状态见 `utils/userStore.js`（2026-10 修订）
- 路由管理：uniapp内置路由
- 数据库：sqlite（通过uniapp的plus.sqlite模块操作，统一经 `utils/dbService.js`）
- UI组件：自定义公共组件 + nutui-uniapp（2026-10 修订，原文档误写为 uView UI）
- 网络请求：uni.request（用于AI接口调用）
- 本地存储：uni.setStorage/uni.getStorage

## 3. 功能模块设计

### 3.1 项目管理模块

#### 3.1.1 功能描述

- 项目列表展示与筛选
- 项目创建、编辑、删除
- 项目状态与进度管理
- 项目节点（里程碑）管理

#### 3.1.2 核心流程

1. 用户创建项目时，输入基本信息，AI自动生成建议的目标和节点
2. 项目列表按状态分组展示，支持下拉刷新和上拉加载
3. 点击项目进入详情页，展示项目完整信息

#### 3.1.3 关键实现

- 项目数据本地存储在`projects`表
- 项目节点存储在`project_milestones`表，通过`project_id`关联
- 进度计算基于节点完成率和用户手动更新的进度值

### 3.2 日志管理模块

#### 3.2.1 功能描述

- 项目日志记录（进展、问题、计划）
- 日志时间线展示
- 日志编辑与删除
- 语音输入转文字

#### 3.2.2 核心流程

1. 用户选择项目，点击"记录日志"
2. 输入进展、问题、计划（支持语音输入）
3. 提交后存储到本地数据库，同步更新项目进度
4. 日志按时间倒序展示，形成项目时间线

#### 3.2.3 关键实现

- 日志数据存储在`project_logs`表
- 语音转文字使用uniapp的`plus.speech`模块
- 时间线渲染基于创建时间排序

### 3.3 AI交互模块

#### 3.3.1 功能描述

- 项目问题智能问答
- 项目进度分析与预测
- 日志内容结构化处理
- 改进建议生成

#### 3.3.2 核心流程

1. 用户输入问题或提交日志
2. 应用构造prompt，包含项目上下文信息
3. 调用第三方AI模型接口（如GPT API）
4. 解析返回结果，格式化展示给用户
5. 重要建议自动关联到项目或知识库

#### 3.3.3 关键实现

- AI接口调用封装在`aiService.js`中
- 请求参数包含API密钥（用户配置）、模型选择、prompt
- 响应结果缓存到本地，避免重复调用
- 实现请求超时和错误处理机制

### 3.4 知识库模块

#### 3.4.1 功能描述

- 知识文章创建与编辑
- 标签分类与搜索
- 知识与项目关联
- 浏览历史与热门推荐

#### 3.4.2 核心流程

1. 用户可从项目中创建知识，或直接新增知识
2. 为知识添加标签，便于分类检索
3. 知识可关联到多个项目，形成项目知识网络
4. 系统记录浏览历史，推荐相关知识

#### 3.4.3 关键实现

- 知识主表`knowledge_base`存储文章内容
- 标签系统通过`knowledge_tags`和关联表实现
- 项目关联通过`project_knowledge_mappings`表实现
- 搜索功能基于SQLite的模糊查询实现

### 3.5 个人中心模块

#### 3.5.1 功能描述

- 用户信息管理
- 项目数据统计与可视化
- 收藏管理
- 系统设置（AI接口配置等）

#### 3.5.2 核心流程

1. 用户首次使用需完成基础设置（如AI接口配置）
2. 个人中心展示项目完成率、知识数量等核心数据
3. 提供数据备份与恢复功能
4. 支持清除缓存、切换主题等系统设置

#### 3.5.3 关键实现

- 用户信息存储在`users`表（单用户模式）
- 统计数据通过SQL聚合查询实现
- 数据备份通过导出SQLite数据库文件实现
- AI接口配置加密存储在本地缓存（2026-10 修订：实际存 `ai_config` 表，由 `pages/profile/ai-settings.vue` 录入，禁止硬编码进源码）

## 4. 数据设计

### 4.1 数据库设计

采用SQLite数据库，数据库名称为`ai_project_manage.db`，**全部 15 张表**结构如下（2026-10 修订：原文档仅列 10 张，权威 DDL 见 `01-db.sql`）：

| 表名 | 说明 | 核心字段 |
|------|------|----------|
| users | 用户信息表 | id, username, email, avatar, settings |
| settings | 系统设置表（category/key/value，含 `system.db_version`） | id, category, key, value（UNIQUE(category, key)） |
| ai_config | AI 供应商配置表（每用户每供应商一条） | id, provider, base_url, api_key, model, timeout, max_tokens, temperature, is_active, user_id（UNIQUE(provider, user_id)） |
| projects | 项目表 | id, user_id, name, description, goal, status, progress |
| project_milestones | 项目节点表 | id, project_id, title, status, deadline, sequence |
| project_logs | 项目日志表 | id, project_id, content, progress_text, problem_text, plan_text, log_type, created_at |
| ai_analyses | AI分析结果表 | id, project_id, analysis_type, content, suggestions, created_at |
| ai_summaries | AI 总结结果表 | id, project_id, summary_type, content, suggestions, created_at |
| chat_conversations | AI 对话会话表 | id, project_id, title, chat_type, related_id, created_at |
| chat_messages | AI 对话消息表 | id, conversation_id, role, content, timestamp, metadata |
| knowledge_base | 知识库表 | id, title, content, summary, view_count |
| knowledge_tags | 知识标签表 | id, name |
| knowledge_tag_mappings | 知识-标签关联表 | id, knowledge_id, tag_id |
| project_knowledge_mappings | 项目-知识关联表 | id, project_id, knowledge_id |
| favorites | 收藏表 | id, user_id, target_type, target_id |

> 2026-10 修订：`project_logs` 的进展/问题/计划字段实际为 `progress_text` / `problem_text` / `plan_text`（原文档误写为 `progress` / `problem` / `plan`）。

### 4.2 数据访问层设计

封装数据库操作工具类`DBService`，提供以下核心方法：

- `initDB()`：初始化数据库和表结构
- `executeSql(sql, params)`：执行SQL语句
- `query(sql, params)`：查询数据
- `insert(table, data)`：插入数据
- `update(table, data, where)`：更新数据
- `delete(table, where)`：删除数据

### 4.3 数据模型设计

为核心实体创建数据模型类，如`ProjectModel`、`LogModel`等，封装数据验证和转换逻辑。

## 5. 接口设计

### 5.1 本地接口（数据访问）

通过`DBService`提供统一的数据访问接口，各业务模块通过调用该接口操作数据，例如：

```javascript
// 项目相关接口
const projectApi = {
  getList: (userId, status) => DBService.query('SELECT * FROM projects WHERE user_id = ? AND status = ?', [userId, status]),
  getDetail: (id) => DBService.query('SELECT * FROM projects WHERE id = ?', [id]),
  create: (projectData) => DBService.insert('projects', projectData),
  update: (id, projectData) => DBService.update('projects', projectData, `id = ${id}`),
  delete: (id) => DBService.delete('projects', `id = ${id}`)
}
```

### 5.2 AI模型接口

直接调用第三方AI模型HTTP接口，封装为`AIService`：

#### 5.2.1 文本生成接口

```javascript
// 调用示例
async function generateText(prompt, model = 'gpt-3.5-turbo') {
  const apiKey = await getStoredApiKey(); // 从本地获取API密钥
  const response = await uni.request({
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    data: {
      model,
      messages: [{ role: 'user', content: prompt }]
    },
    timeout: 30000
  });
  
  if (response.statusCode === 200) {
    return response.data.choices[0].message.content;
  } else {
    throw new Error(`AI接口错误: ${response.data.error.message}`);
  }
}
```

#### 5.2.2 项目分析接口

封装专门的项目分析方法，自动构建包含项目上下文的prompt：

```javascript
async function analyzeProject(projectId) {
  // 获取项目相关数据
  const project = await projectApi.getDetail(projectId);
  const logs = await logApi.getList(projectId, 5); // 获取最近5条日志
  
  // 构建prompt
  const prompt = `分析以下项目状态并提供建议:
  项目名称: ${project.name}
  目标: ${project.goal}
  当前进度: ${project.progress}%
  最近进展: ${logs.map(log => log.progress).join('; ')}
  
  请分析项目可能存在的风险，并提供改进建议。`;
  
  // 调用AI接口
  return generateText(prompt);
}
```

## 6. 界面设计

### 6.1 页面结构

> 2026-10 修订：以下页面树已按实际目录改正（原文档误写 `index/` 为首页、`mine/` 为个人中心）。完整页面清单与注册顺序以 `pages.json` 为准。

```
pages/
├── project/               # 项目管理（首页即 list，pages.json 第一个页面）
│   ├── list.vue           # 首页/项目列表页（不是 pages/index/）
│   ├── detail.vue         # 项目详情页
│   ├── create.vue         # 创建项目页
│   ├── log.vue            # 项目日志页
│   └── chat.vue           # 项目 AI 对话页
├── knowledge/             # 知识库相关
│   ├── index.vue          # 知识库首页
│   ├── detail.vue         # 知识详情页
│   ├── create.vue         # 新增/编辑知识页
│   └── chat.vue           # 知识 AI 对话页
├── profile/               # 个人中心（原文档误写为 mine/）
│   ├── index.vue          # 个人中心首页
│   ├── stats.vue          # 数据统计页
│   ├── favorites.vue      # 收藏页
│   ├── ai-settings.vue    # AI 设置页
│   ├── edit.vue           # 用户信息编辑页
│   ├── feedback.vue       # 反馈页
│   └── help.vue           # 帮助页
├── demo/                  # 第三方插件示例页（多数未注册，仅供查阅）
└── index/index.vue        # 未注册死页，实际不可达
```

### 6.2 导航设计

- 底部导航：首页、知识库、我的
- 页面内导航：通过顶部标签切换不同视图（如项目详情页的标签切换）
- 跳转导航：通过按钮、卡片等元素跳转到详情页或编辑页

## 7. 安全设计

### 7.1 数据安全

- 敏感数据（如API密钥）加密存储，使用uniapp的加密API
- 数据库文件设置访问权限，防止未授权访问
- 提供数据备份与恢复功能，防止数据丢失

### 7.2 接口安全

- AI接口密钥本地存储，不进行网络传输（除调用AI接口时）
- 实现API调用频率限制，防止滥用
- 对AI接口返回内容进行安全过滤，防止有害信息

## 8. 性能优化

### 8.1 数据库优化

- 为常用查询字段建立索引
- 分页加载大量数据（如日志列表、知识库列表）
- 批量操作优化，减少数据库连接次数

### 8.2 界面优化

- 实现列表项复用，减少DOM节点
- 图片懒加载，优化加载速度
- 复杂计算放到Worker中执行，避免UI阻塞

### 8.3 网络优化

- 实现AI接口请求缓存，避免重复请求
- 请求超时处理和重试机制
- 网络状态监测，在无网络时提示用户

## 9. 开发计划

### 9.1 阶段划分

1. **基础架构阶段**（2周）
   - 项目初始化与配置
   - 数据库设计与实现
   - 基础UI组件开发

2. **核心功能阶段**（3周）
   - 项目管理模块开发
   - 日志管理模块开发
   - 个人中心模块开发

3. **AI集成阶段**（2周）
   - AI接口封装与测试
   - AI分析功能开发
   - 智能问答功能开发

4. **知识库阶段**（2周）
   - 知识库核心功能开发
   - 标签与搜索功能开发
   - 知识关联功能开发

5. **测试优化阶段**（2周）
   - 功能测试与BUG修复
   - 性能优化
   - 跨平台适配

## 10. 风险与应对

1. **AI接口依赖风险**
   - 风险：依赖第三方AI接口，可能存在服务不稳定或收费问题
   - 应对：支持多AI模型切换，实现离线模式基础功能

2. **数据安全风险**
   - 风险：本地存储数据可能被篡改或泄露
   - 应对：关键数据加密，提供数据备份功能

3. **跨平台兼容性风险**
   - 风险：不同平台表现不一致
   - 应对：针对主要平台进行适配测试，使用uniapp兼容API

4. **性能风险**
   - 风险：本地数据库操作可能在数据量大时性能下降
   - 应对：实现数据分页、索引优化、定期清理冗余数据

## 11. 附录

### 11.1 第三方服务依赖

- AI模型服务：OpenAI API / 阿里云灵积 / 百度文心一言（2026-10 修订：实际支持 openai / deepseek / siliconflow / kimi / qwen / custom，见 `utils/aiProviders.js`）
- UI组件库：uView UI（2026-10 修订：实际为 nutui-uniapp）
- 图表库：uCharts（对应 `uni_modules/qiun-data-charts`）

### 11.2 关键技术点

- SQLite数据库操作封装
- 第三方API调用与错误处理
- 本地数据加密与安全存储
- 跨平台适配与兼容性处理
- 离线功能设计与实现
