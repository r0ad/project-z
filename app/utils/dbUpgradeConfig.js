/**
 * 数据库升级配置
 * 定义各个版本的数据库升级脚本
 * 
 * 历史版本说明：
 * - 之前的版本2.0.0-2.14.0包含了复杂的增量升级脚本
 * - 包括表重建、数据迁移、索引优化等特殊处理
 * - 现在统一整合到1.0.0版本中，简化数据库管理
 */

const dbUpgradeConfig = {
  current_version: '1.1.0',
  upgrade_order: ['1.0.0', '1.1.0'],
  versions: {
    '1.0.0': {
      description: '初始化完整数据库结构',
      scripts: [
        // 基础表：用户表
        {
          type: 'create_table',
          name: 'users',
          sql: 'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL, email TEXT, avatar TEXT, settings TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        },
        
        // 基础表：设置表
        {
          type: 'create_table',
          name: 'settings',
          sql: 'CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(category, key))'
        },
        
        // 项目管理：项目表
        {
          type: 'create_table',
          name: 'projects',
          sql: 'CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER DEFAULT 1, name TEXT NOT NULL, description TEXT, goal TEXT, status TEXT DEFAULT \'active\', progress INTEGER DEFAULT 0, start_date DATE, end_date DATE, ai_suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))'
        },
        
        // 项目管理：项目日志表
        {
          type: 'create_table',
          name: 'project_logs',
          sql: 'CREATE TABLE IF NOT EXISTS project_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, content TEXT, progress_text TEXT, problem_text TEXT, plan_text TEXT, log_type TEXT DEFAULT \'manual\', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME, FOREIGN KEY (project_id) REFERENCES projects(id))'
        },
        
        // 项目管理：项目里程碑表
        {
          type: 'create_table',
          name: 'project_milestones',
          sql: 'CREATE TABLE IF NOT EXISTS project_milestones (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT DEFAULT \'pending\', progress INTEGER DEFAULT 0, deadline DATE, sequence INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, summary_type TEXT DEFAULT "summary", FOREIGN KEY (project_id) REFERENCES projects(id))'
        },
        
        // AI功能：AI配置表
        {
          type: 'create_table',
          name: 'ai_config',
          sql: 'CREATE TABLE IF NOT EXISTS ai_config (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL, base_url TEXT NOT NULL, api_key TEXT NOT NULL, model TEXT NOT NULL, timeout INTEGER DEFAULT 30, max_tokens INTEGER DEFAULT 2000, temperature REAL DEFAULT 0.7, is_active INTEGER DEFAULT 0, user_id INTEGER DEFAULT 1 REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(provider, user_id))'
        },
        
        // AI功能：AI分析表
        {
          type: 'create_table',
          name: 'ai_analyses',
          sql: 'CREATE TABLE IF NOT EXISTS ai_analyses (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, analysis_type TEXT NOT NULL, content TEXT, suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id))'
        },
        
        // AI功能：AI总结表
        {
          type: 'create_table',
          name: 'ai_summaries',
          sql: 'CREATE TABLE IF NOT EXISTS ai_summaries (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, summary_type TEXT DEFAULT \'summary\', content TEXT, suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id))'
        },
        
        // 知识库：知识标签表
        {
          type: 'create_table',
          name: 'knowledge_tags',
          sql: 'CREATE TABLE IF NOT EXISTS knowledge_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        },
        
        // 知识库：知识库表
        {
          type: 'create_table',
          name: 'knowledge_base',
          sql: 'CREATE TABLE IF NOT EXISTS knowledge_base (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT, summary TEXT, view_count INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, user_id INTEGER DEFAULT 1 REFERENCES users(id))'
        },
        
        // 知识库：知识标签映射表
        {
          type: 'create_table',
          name: 'knowledge_tag_mappings',
          sql: 'CREATE TABLE IF NOT EXISTS knowledge_tag_mappings (id INTEGER PRIMARY KEY AUTOINCREMENT, knowledge_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id), FOREIGN KEY (tag_id) REFERENCES knowledge_tags(id))'
        },
        
        // 项目知识关联：项目知识映射表
        {
          type: 'create_table',
          name: 'project_knowledge_mappings',
          sql: 'CREATE TABLE IF NOT EXISTS project_knowledge_mappings (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, knowledge_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id), FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id))'
        },
        
        // 聊天功能：聊天会话表
        {
          type: 'create_table',
          name: 'chat_conversations',
          sql: 'CREATE TABLE IF NOT EXISTS chat_conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, title TEXT, chat_type TEXT DEFAULT "project", related_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        },
        
        // 聊天功能：聊天消息表
        {
          type: 'create_table',
          name: 'chat_messages',
          sql: 'CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, metadata TEXT, FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id))'
        },
        
        // 收藏功能：收藏表
        {
          type: 'create_table',
          name: 'favorites',
          sql: 'CREATE TABLE IF NOT EXISTS favorites (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER DEFAULT 1, target_type TEXT NOT NULL, target_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id))'
        },
        
        // 系统表：Android元数据表
        {
          type: 'create_table',
          name: 'android_metadata',
          sql: 'CREATE TABLE IF NOT EXISTS android_metadata (locale TEXT)'
        },
        
        // 创建索引：设置表索引
        {
          type: 'create_index',
          name: 'idx_settings_category_key',
          sql: 'CREATE INDEX IF NOT EXISTS idx_settings_category_key ON settings(category, key)'
        },
        
        // 创建索引：项目表索引
        {
          type: 'create_index',
          name: 'idx_projects_user_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id)'
        },
        {
          type: 'create_index',
          name: 'idx_projects_status',
          sql: 'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)'
        },
        
        // 创建索引：项目日志表索引
        {
          type: 'create_index',
          name: 'idx_logs_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_logs_project_id ON project_logs(project_id)'
        },
        {
          type: 'create_index',
          name: 'idx_logs_created_at',
          sql: 'CREATE INDEX IF NOT EXISTS idx_logs_created_at ON project_logs(created_at)'
        },
        
        // 创建索引：项目里程碑表索引
        {
          type: 'create_index',
          name: 'idx_milestones_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON project_milestones(project_id)'
        },
        
        // 创建索引：AI配置表索引
        {
          type: 'create_index',
          name: 'idx_ai_config_user_provider',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_config_user_provider ON ai_config(user_id, provider)'
        },
        {
          type: 'create_index',
          name: 'idx_ai_config_is_active',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_config_is_active ON ai_config(is_active)'
        },
        
        // 创建索引：AI分析表索引
        {
          type: 'create_index',
          name: 'idx_ai_analyses_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_id ON ai_analyses(project_id)'
        },
        {
          type: 'create_index',
          name: 'idx_ai_analyses_project_updated',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_updated ON ai_analyses(project_id, updated_at)'
        },
        
        // 创建索引：AI总结表索引
        {
          type: 'create_index',
          name: 'idx_ai_summaries_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_summaries_project_id ON ai_summaries(project_id)'
        },
        {
          type: 'create_index',
          name: 'idx_ai_summaries_project_updated',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_summaries_project_updated ON ai_summaries(project_id, updated_at)'
        },
        
        // 创建索引：知识库表索引
        {
          type: 'create_index',
          name: 'idx_knowledge_title',
          sql: 'CREATE INDEX IF NOT EXISTS idx_knowledge_title ON knowledge_base(title)'
        },
        {
          type: 'create_index',
          name: 'idx_knowledge_base_user_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id)'
        },
        
        // 创建索引：聊天表索引
        {
          type: 'create_index',
          name: 'idx_chat_conversations_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chat_conversations_project_id ON chat_conversations(project_id)'
        },
        {
          type: 'create_index',
          name: 'idx_chat_conversations_type_related',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chat_conversations_type_related ON chat_conversations(chat_type, related_id)'
        },
        {
          type: 'create_index',
          name: 'idx_chat_messages_conversation_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation_id ON chat_messages(conversation_id)'
        },
        {
          type: 'create_index',
          name: 'idx_chat_messages_timestamp',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chat_messages_timestamp ON chat_messages(timestamp)'
        }
      ]
    },
    
    '1.1.0': {
      description: '分享码系统优化：添加AI配置来源追踪',
      scripts: [
        // 扩展ai_config表结构
        {
          type: 'alter_table',
          name: 'ai_config_add_promo_code_id',
          sql: 'ALTER TABLE ai_config ADD COLUMN promo_code_id TEXT NULL'
        },
        
        // 创建索引以提升查询性能
        {
          type: 'create_index',
          name: 'idx_ai_config_promo_code_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_config_promo_code_id ON ai_config(promo_code_id)'
        },
        
        // 创建复合索引用于可编辑配置查询
        {
          type: 'create_index',
          name: 'idx_ai_config_editable',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_config_editable ON ai_config(user_id) WHERE promo_code_id IS NULL'
        }
      ]
    }
  }
}

export default dbUpgradeConfig