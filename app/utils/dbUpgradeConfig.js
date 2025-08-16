/**
 * 数据库升级配置
 * 定义各个版本的数据库升级脚本
 */

const dbUpgradeConfig = {
  current_version: '2.4.0',
  upgrade_order: ['1.0.0', '2.0.0', '2.1.0', '2.2.0', '2.4.0'],
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
    }
  }
}

export default dbUpgradeConfig