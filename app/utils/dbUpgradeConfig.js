/**
 * 数据库升级配置
 * 定义各个版本的数据库升级脚本
 */

const dbUpgradeConfig = {
  current_version: '2.14.0',
  upgrade_order: ['1.0.0', '2.0.0', '2.1.0', '2.2.0', '2.3.0', '2.4.0', '2.5.0', '2.6.0', '2.7.0', '2.8.0', '2.9.0', '2.10.0', '2.11.0', '2.12.0', '2.13.0', '2.14.0'],
  versions: {
    '1.0.0': {
      description: '初始化数据库',
      scripts: [
        {
          type: 'create_table',
          name: 'settings',
          sql: 'CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, category TEXT NOT NULL, key TEXT NOT NULL, value TEXT, description TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(category, key))'
        },
        {
          type: 'create_table',
          name: 'projects',
          sql: 'CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, description TEXT, status TEXT DEFAULT \'active\', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        },
        {
          type: 'create_table',
          name: 'project_logs',
          sql: 'CREATE TABLE IF NOT EXISTS project_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, content TEXT NOT NULL, log_type TEXT DEFAULT \'general\', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, progress_text TEXT, problem_text TEXT, plan_text TEXT, FOREIGN KEY (project_id) REFERENCES projects(id))'
        }
      ]
    },
    '2.0.0': {
      description: '添加AI功能支持',
      dependencies: ['1.0.0'],
      scripts: [
        {
          type: 'create_table',
          name: 'ai_config',
          sql: 'CREATE TABLE IF NOT EXISTS ai_config (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, provider TEXT NOT NULL, api_key TEXT NOT NULL, base_url TEXT, model TEXT, is_active INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        },
        {
          type: 'create_table',
          name: 'ai_analyses',
          sql: 'CREATE TABLE IF NOT EXISTS ai_analyses (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, analysis_type TEXT NOT NULL, input_data TEXT, result TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id))'
        },
        {
          type: 'create_table',
          name: 'knowledge_base',
          sql: 'CREATE TABLE IF NOT EXISTS knowledge_base (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, content TEXT NOT NULL, category TEXT, tags TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        },
        {
          type: 'create_table',
          name: 'knowledge_tags',
          sql: 'CREATE TABLE IF NOT EXISTS knowledge_tags (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, color TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
        },
        {
          type: 'create_table',
          name: 'knowledge_tag_mappings',
          sql: 'CREATE TABLE IF NOT EXISTS knowledge_tag_mappings (id INTEGER PRIMARY KEY AUTOINCREMENT, knowledge_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id), FOREIGN KEY (tag_id) REFERENCES knowledge_tags(id), UNIQUE(knowledge_id, tag_id))'
        },
        {
          type: 'alter_table',
          name: 'projects',
          sql: 'ALTER TABLE projects ADD COLUMN ai_suggestions TEXT'
        }
      ]
    },
    '2.1.0': {
      description: '性能优化和索引',
      dependencies: ['2.0.0'],
      scripts: [
        {
          type: 'create_index',
          name: 'idx_projects_status',
          sql: 'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status)'
        },
        {
          type: 'create_index',
          name: 'idx_project_logs_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_project_logs_project_id ON project_logs(project_id)'
        },
        {
          type: 'create_index',
          name: 'idx_project_logs_created_at',
          sql: 'CREATE INDEX IF NOT EXISTS idx_project_logs_created_at ON project_logs(created_at)'
        }
      ]
    },
    '2.2.0': {
      description: '扩展项目日志功能',
      dependencies: ['2.1.0'],
      scripts: [
        {
          type: 'alter_table',
          name: 'project_logs',
          sql: 'ALTER TABLE project_logs ADD COLUMN updated_at DATETIME',
          ignore_error: true
        },
        {
          type: 'alter_table',
          name: 'project_logs',
          sql: 'ALTER TABLE project_logs ADD COLUMN progress_text TEXT',
          ignore_error: true
        },
        {
          type: 'alter_table',
          name: 'project_logs',
          sql: 'ALTER TABLE project_logs ADD COLUMN problem_text TEXT',
          ignore_error: true
        },
        {
          type: 'alter_table',
          name: 'project_logs',
          sql: 'ALTER TABLE project_logs ADD COLUMN plan_text TEXT',
          ignore_error: true
        }
      ]
    },
    '2.4.0': {
      description: '扩展项目日志功能',
      dependencies: ['2.2.0'],
      scripts: [
        {
          type: 'alter_table',
          name: 'project_logs',
          sql: 'ALTER TABLE project_logs ADD COLUMN updated_at DATETIME',
          ignore_error: true
        }
      ]
    },
    '2.5.0': {
      description: '添加聊天历史功能',
      dependencies: ['2.4.0'],
      scripts: [
        {
          type: 'create_table',
          name: 'chat_conversations',
          sql: 'CREATE TABLE IF NOT EXISTS chat_conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, title TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id))'
        },
        {
          type: 'create_table',
          name: 'chat_messages',
          sql: 'CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, metadata TEXT, FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id))'
        },
        {
          type: 'create_index',
          name: 'idx_chat_conversations_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chat_conversations_project_id ON chat_conversations(project_id)'
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
    '2.6.0': {
      description: '添加AI分析和总结功能表',
      dependencies: ['2.5.0'],
      scripts: [
        {
          type: 'alter_table',
          name: 'ai_analyses',
          sql: 'ALTER TABLE ai_analyses ADD COLUMN content TEXT',
          ignore_error: true
        },
        {
          type: 'alter_table',
          name: 'ai_analyses',
          sql: 'ALTER TABLE ai_analyses ADD COLUMN suggestions TEXT',
          ignore_error: true
        },
        {
          type: 'create_table',
          name: 'ai_summaries',
          sql: 'CREATE TABLE IF NOT EXISTS ai_summaries (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, content TEXT NOT NULL, suggestions TEXT, summary_type TEXT DEFAULT "summary", created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id))'
        },
        {
          type: 'create_index',
          name: 'idx_ai_summaries_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_summaries_project_id ON ai_summaries(project_id)'
        },
        {
          type: 'alter_table',
          name: 'projects',
          sql: 'ALTER TABLE projects ADD COLUMN goal TEXT',
          ignore_error: true
        },
        {
          type: 'alter_table',
          name: 'projects',
          sql: 'ALTER TABLE projects ADD COLUMN progress INTEGER DEFAULT 0',
          ignore_error: true
        },
        {
          type: 'alter_table',
          name: 'projects',
          sql: 'ALTER TABLE projects ADD COLUMN start_date DATE',
          ignore_error: true
        },
        {
          type: 'alter_table',
          name: 'projects',
          sql: 'ALTER TABLE projects ADD COLUMN end_date DATE',
          ignore_error: true
        },
        {
          type: 'create_table',
          name: 'project_milestones',
          sql: 'CREATE TABLE IF NOT EXISTS project_milestones (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, title TEXT NOT NULL, description TEXT, status TEXT DEFAULT "pending", progress INTEGER DEFAULT 0, deadline DATE, sequence INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id))',
          ignore_error: true
        },
        {
          type: 'create_index',
          name: 'idx_milestones_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_milestones_project_id ON project_milestones(project_id)'
        }
      ]
    },
    '2.8.0': {
      description: '添加项目里程碑功能补充字段',
      dependencies: ['2.6.0'],
      scripts: [
        {
          type: 'add_column',
          name: 'ai_summaries',
          sql: 'ALTER TABLE ai_summaries ADD COLUMN summary_type TEXT DEFAULT "summary"'
        }
      ]
    },
    '2.9.0': {
      description: '修复AI分析表缺少updated_at字段的问题 - 使用表重建方式',
      dependencies: ['2.8.0'],
      scripts: [
        {
          type: 'recreate_table',
          name: 'ai_analyses_backup',
          sql: 'CREATE TEMPORARY TABLE ai_analyses_backup AS SELECT * FROM ai_analyses',
          ignore_error: true
        },
        {
          type: 'drop_table',
          name: 'ai_analyses_drop',
          sql: 'DROP TABLE IF EXISTS ai_analyses',
          ignore_error: true
        },
        {
          type: 'create_table',
          name: 'ai_analyses_recreate',
          sql: "CREATE TABLE ai_analyses (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, analysis_type TEXT NOT NULL, content TEXT, suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id))",
          ignore_error: false
        },
        {
          type: 'restore_data',
          name: 'ai_analyses_restore',
          sql: "INSERT INTO ai_analyses (id, project_id, analysis_type, content, suggestions, created_at, updated_at) SELECT id, project_id, analysis_type, COALESCE(content, ''), COALESCE(suggestions, ''), created_at, COALESCE(created_at, datetime('now')) FROM ai_analyses_backup",
          ignore_error: true
        },
        {
          type: 'drop_table',
          name: 'ai_analyses_cleanup',
          sql: 'DROP TABLE IF EXISTS ai_analyses_backup',
          ignore_error: true
        },
        {
          type: 'recreate_table',
          name: 'ai_summaries_backup',
          sql: 'CREATE TEMPORARY TABLE ai_summaries_backup AS SELECT * FROM ai_summaries',
          ignore_error: true
        },
        {
          type: 'drop_table',
          name: 'ai_summaries_drop',
          sql: 'DROP TABLE IF EXISTS ai_summaries',
          ignore_error: true
        },
        {
          type: 'create_table',
          name: 'ai_summaries_recreate',
          sql: "CREATE TABLE ai_summaries (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, summary_type TEXT DEFAULT 'summary', content TEXT, suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id))",
          ignore_error: false
        },
        {
          type: 'restore_data',
          name: 'ai_summaries_restore',
          sql: "INSERT INTO ai_summaries (id, project_id, summary_type, content, suggestions, created_at, updated_at) SELECT id, project_id, COALESCE(summary_type, 'summary'), COALESCE(content, ''), COALESCE(suggestions, ''), created_at, COALESCE(created_at, datetime('now')) FROM ai_summaries_backup",
          ignore_error: true
        },
        {
          type: 'drop_table',
          name: 'ai_summaries_cleanup',
          sql: 'DROP TABLE IF EXISTS ai_summaries_backup',
          ignore_error: true
        }
      ]
    },
    '2.11.0': {
      description: '最终确认AI表结构完整性',
      dependencies: ['2.10.0'],
      scripts: [
        {
          type: 'create_index',
          name: 'idx_ai_analyses_project_updated',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_analyses_project_updated ON ai_analyses(project_id, updated_at)',
          ignore_error: true
        },
        {
          type: 'create_index',
          name: 'idx_ai_summaries_project_updated',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_summaries_project_updated ON ai_summaries(project_id, updated_at)',
          ignore_error: true
        }
      ]
    },
    
    '2.12.0': {
      description: '修改聊天表结构支持不同类型聊天',
      dependencies: ['2.11.0'],
      scripts: [
        {
          type: 'recreate_table',
          name: 'chat_conversations_backup',
          sql: 'CREATE TEMPORARY TABLE chat_conversations_backup AS SELECT * FROM chat_conversations',
          ignore_error: true
        },
        {
          type: 'drop_table',
          name: 'chat_conversations_drop',
          sql: 'DROP TABLE IF EXISTS chat_conversations',
          ignore_error: true
        },
        {
          type: 'create_table',
          name: 'chat_conversations_recreate',
          sql: 'CREATE TABLE chat_conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, title TEXT, chat_type TEXT DEFAULT "project", related_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)',
          ignore_error: false
        },
        {
          type: 'restore_data',
          name: 'chat_conversations_restore',
          sql: 'INSERT INTO chat_conversations (id, project_id, title, chat_type, related_id, created_at, updated_at) SELECT id, project_id, title, "project", project_id, created_at, updated_at FROM chat_conversations_backup',
          ignore_error: true
        },
        {
          type: 'drop_table',
          name: 'chat_conversations_cleanup',
          sql: 'DROP TABLE IF EXISTS chat_conversations_backup',
          ignore_error: true
        },
        {
          type: 'create_index',
          name: 'idx_chat_conversations_project_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chat_conversations_project_id ON chat_conversations(project_id)',
          ignore_error: true
        },
        {
          type: 'create_index',
          name: 'idx_chat_conversations_type_related',
          sql: 'CREATE INDEX IF NOT EXISTS idx_chat_conversations_type_related ON chat_conversations(chat_type, related_id)',
          ignore_error: true
        }
      ]
    },
    '2.13.0': {
      description: '添加多用户支持，为相关表添加user_id字段',
      dependencies: ['2.12.0'],
      scripts: [
        {
          type: 'alter_table',
          name: 'add_user_id_to_ai_config',
          sql: 'ALTER TABLE ai_config ADD COLUMN user_id INTEGER DEFAULT 1 REFERENCES users(id)',
          ignore_error: true
        },
        {
          type: 'alter_table',
          name: 'add_user_id_to_knowledge_base',
          sql: 'ALTER TABLE knowledge_base ADD COLUMN user_id INTEGER DEFAULT 1 REFERENCES users(id)',
          ignore_error: true
        },
        {
          type: 'create_index',
          name: 'idx_ai_config_user_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_config_user_id ON ai_config(user_id)',
          ignore_error: true
        },
        {
          type: 'create_index',
          name: 'idx_knowledge_base_user_id',
          sql: 'CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id)',
          ignore_error: true
        }
      ]
    },
    '2.14.0': {
      description: '修复ai_config表的唯一约束问题，支持多用户使用相同provider',
      dependencies: ['2.13.0'],
      scripts: [
        {
          type: 'backup_table',
          name: 'ai_config_backup',
          sql: 'CREATE TABLE ai_config_backup AS SELECT * FROM ai_config',
          ignore_error: true
        },
        {
          type: 'drop_table',
          name: 'drop_ai_config',
          sql: 'DROP TABLE ai_config',
          ignore_error: false
        },
        {
          type: 'create_table',
          name: 'recreate_ai_config',
          sql: 'CREATE TABLE ai_config (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL, base_url TEXT NOT NULL, api_key TEXT NOT NULL, model TEXT NOT NULL, timeout INTEGER DEFAULT 30, max_tokens INTEGER DEFAULT 2000, temperature REAL DEFAULT 0.7, is_active INTEGER DEFAULT 0, user_id INTEGER DEFAULT 1 REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(provider, user_id))',
          ignore_error: false
        },
        {
          type: 'restore_data',
          name: 'ai_config_restore',
          sql: 'INSERT INTO ai_config (id, provider, base_url, api_key, model, timeout, max_tokens, temperature, is_active, user_id, created_at, updated_at) SELECT id, provider, base_url, api_key, model, timeout, max_tokens, temperature, is_active, COALESCE(user_id, 1), created_at, updated_at FROM ai_config_backup',
          ignore_error: true
        },
        {
          type: 'drop_table',
          name: 'ai_config_cleanup',
          sql: 'DROP TABLE IF EXISTS ai_config_backup',
          ignore_error: true
        },
        {
          type: 'create_index',
          name: 'idx_ai_config_user_provider',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_config_user_provider ON ai_config(user_id, provider)',
          ignore_error: true
        },
        {
          type: 'create_index',
          name: 'idx_ai_config_is_active',
          sql: 'CREATE INDEX IF NOT EXISTS idx_ai_config_is_active ON ai_config(is_active)',
          ignore_error: true
        }
      ]
    },
    '2.15.0': {
      description: '修复时间存储问题，统一使用本地时间',
      dependencies: ['2.14.0'],
      scripts: [
        {
          type: 'execute_sql',
          name: 'update_time_defaults',
          sql: `
            -- 更新所有表的默认时间为本地时间
            -- 注意：SQLite的datetime('now','localtime')会使用本地时区
          `,
          ignore_error: true
        }
      ]
    }
  }
}

export default dbUpgradeConfig