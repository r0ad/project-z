# 数据库升级脚本历史说明

## 概述

本文档记录了项目在版本重构前（2.0.0-2.14.0）的数据库升级脚本历史，这些脚本现已整合到1.0.0版本中。

## 版本历史

### 1.0.0 - 初始化数据库
- **描述**: 初始化数据库基础表结构
- **包含表**: settings, projects, project_logs
- **特点**: 基础的项目管理功能

### 2.0.0 - 添加AI功能支持
- **描述**: 引入AI相关功能表
- **新增表**: ai_config, ai_analyses, knowledge_base, knowledge_tags, knowledge_tag_mappings
- **表修改**: projects表添加ai_suggestions字段
- **特殊脚本**: 无

### 2.1.0 - 性能优化和索引
- **描述**: 为主要表添加索引以提升查询性能
- **新增索引**:
  - idx_projects_status
  - idx_project_logs_project_id
  - idx_project_logs_created_at
- **特殊脚本**: 无

### 2.2.0 - 扩展项目日志功能
- **描述**: 为project_logs表添加更多字段
- **表修改**: project_logs表添加updated_at, progress_text, problem_text, plan_text字段
- **特殊脚本**: 使用ALTER TABLE添加字段，设置ignore_error: true防止重复添加

### 2.4.0 - 项目日志功能补充
- **描述**: 确保project_logs表的updated_at字段存在
- **表修改**: project_logs表添加updated_at字段（重复操作，用于兼容性）
- **特殊脚本**: ignore_error: true

### 2.5.0 - 添加聊天历史功能
- **描述**: 引入聊天对话功能
- **新增表**: chat_conversations, chat_messages
- **新增索引**:
  - idx_chat_conversations_project_id
  - idx_chat_messages_conversation_id
  - idx_chat_messages_timestamp
- **特殊脚本**: 无

### 2.6.0 - AI分析和总结功能扩展
- **描述**: 扩展AI功能，添加项目里程碑管理
- **表修改**:
  - ai_analyses表添加content, suggestions字段
  - projects表添加goal, progress, start_date, end_date字段
- **新增表**: ai_summaries, project_milestones
- **新增索引**: idx_ai_summaries_project_id, idx_milestones_project_id
- **特殊脚本**: 使用ignore_error: true处理字段重复添加

### 2.8.0 - AI总结功能补充
- **描述**: 为ai_summaries表添加summary_type字段
- **表修改**: ai_summaries表添加summary_type字段，默认值"summary"
- **特殊脚本**: 使用ADD COLUMN语法

### 2.9.0 - AI分析表结构修复
- **描述**: 修复AI分析表缺少updated_at字段的问题
- **特殊脚本**: **表重建方式**
  1. 创建临时备份表
  2. 删除原表
  3. 重新创建表结构
  4. 恢复数据
  5. 清理备份表
- **涉及表**: ai_analyses, ai_summaries
- **注意**: 这是最复杂的升级脚本，使用了完整的表重建流程

### 2.11.0 - AI表结构完整性确认
- **描述**: 最终确认AI表结构完整性
- **新增索引**:
  - idx_ai_analyses_project_updated
  - idx_ai_summaries_project_updated
- **特殊脚本**: ignore_error: true

### 2.12.0 - 聊天表结构优化
- **描述**: 修改聊天表结构支持不同类型聊天
- **特殊脚本**: **表重建方式**
  1. 备份chat_conversations表
  2. 删除原表
  3. 重新创建表（添加chat_type, related_id字段）
  4. 恢复数据并设置默认值
  5. 重建索引
- **新增字段**: chat_type, related_id
- **新增索引**: idx_chat_conversations_type_related

### 2.13.0 - 多用户支持
- **描述**: 为相关表添加user_id字段支持多用户
- **表修改**:
  - ai_config表添加user_id字段
  - knowledge_base表添加user_id字段
- **新增索引**:
  - idx_ai_config_user_id
  - idx_knowledge_base_user_id
- **特殊脚本**: 使用DEFAULT 1设置默认用户ID

### 2.14.0 - AI配置表唯一约束修复
- **描述**: 修复ai_config表的唯一约束问题，支持多用户使用相同provider
- **特殊脚本**: **表重建方式**
  1. 备份ai_config表
  2. 删除原表
  3. 重新创建表（添加UNIQUE(provider, user_id)约束）
  4. 恢复数据
  5. 重建索引
- **新增约束**: UNIQUE(provider, user_id)
- **新增索引**:
  - idx_ai_config_user_provider
  - idx_ai_config_is_active

### 2.15.0 - 时间存储优化
- **描述**: 修复时间存储问题，统一使用本地时间
- **特殊脚本**: 执行SQL注释，实际未进行表结构修改
- **注意**: 主要是概念性修改，统一时间处理策略

## 特殊脚本类型说明

### 1. 表重建脚本
最复杂的升级类型，用于无法通过ALTER TABLE解决的结构修改：
```javascript
{
  type: 'recreate_table',
  name: 'table_backup',
  sql: 'CREATE TEMPORARY TABLE table_backup AS SELECT * FROM original_table'
},
{
  type: 'drop_table', 
  name: 'table_drop',
  sql: 'DROP TABLE IF EXISTS original_table'
},
{
  type: 'create_table',
  name: 'table_recreate', 
  sql: 'CREATE TABLE original_table (new_structure)'
},
{
  type: 'restore_data',
  name: 'table_restore',
  sql: 'INSERT INTO original_table SELECT ... FROM table_backup'
}
```

### 2. 容错字段添加
使用ignore_error防止重复执行错误：
```javascript
{
  type: 'alter_table',
  name: 'add_field',
  sql: 'ALTER TABLE table_name ADD COLUMN field_name TYPE',
  ignore_error: true
}
```

### 3. 索引创建
标准索引创建，通常包含IF NOT EXISTS：
```javascript
{
  type: 'create_index',
  name: 'index_name',
  sql: 'CREATE INDEX IF NOT EXISTS index_name ON table(column)'
}
```

## 整合到1.0.0的优势

1. **简化管理**: 不再需要复杂的增量升级逻辑
2. **减少错误**: 避免了字段重复添加、表结构不一致等问题
3. **提升性能**: 一次性创建完整结构，包含所有必要的索引
4. **易于维护**: 单一版本的数据库结构，便于理解和维护
5. **测试友好**: 新环境可以直接创建完整结构，无需经历复杂的升级过程

## 注意事项

1. **数据迁移**: 如果有现有数据需要迁移，需要单独处理
2. **版本兼容**: 确保应用代码与新的1.0.0数据库结构兼容
3. **备份策略**: 在生产环境应用前，务必做好数据备份
4. **测试验证**: 充分测试所有功能在新结构下的正常运行

## 结论

通过将复杂的增量升级脚本整合到单一的1.0.0版本中，我们大大简化了数据库管理的复杂性。这种方法特别适合项目重构阶段，可以清理历史包袱，建立更清晰的数据库架构基础。