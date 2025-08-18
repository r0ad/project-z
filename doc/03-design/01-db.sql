-- android_metadata definition

CREATE TABLE android_metadata (locale TEXT);


-- chat_conversations definition

CREATE TABLE chat_conversations (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER, title TEXT, chat_type TEXT DEFAULT "project", related_id INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);

CREATE INDEX idx_chat_conversations_project_id ON chat_conversations(project_id);
CREATE INDEX idx_chat_conversations_type_related ON chat_conversations(chat_type, related_id);


-- knowledge_tags definition

CREATE TABLE knowledge_tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );


-- settings definition

CREATE TABLE settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        category TEXT NOT NULL,
        key TEXT NOT NULL,
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, key)
      );

CREATE INDEX idx_settings_category_key ON settings(category, key);


-- users definition

CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL,
        email TEXT,
        avatar TEXT,
        settings TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );


-- ai_config definition

CREATE TABLE ai_config (id INTEGER PRIMARY KEY AUTOINCREMENT, provider TEXT NOT NULL, base_url TEXT NOT NULL, api_key TEXT NOT NULL, model TEXT NOT NULL, timeout INTEGER DEFAULT 30, max_tokens INTEGER DEFAULT 2000, temperature REAL DEFAULT 0.7, is_active INTEGER DEFAULT 0, user_id INTEGER DEFAULT 1 REFERENCES users(id), created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(provider, user_id));

CREATE INDEX idx_ai_config_user_provider ON ai_config(user_id, provider);
CREATE INDEX idx_ai_config_is_active ON ai_config(is_active);


-- chat_messages definition

CREATE TABLE chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, conversation_id INTEGER NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP, metadata TEXT, FOREIGN KEY (conversation_id) REFERENCES chat_conversations(id));

CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_timestamp ON chat_messages(timestamp);


-- favorites definition

CREATE TABLE favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        target_type TEXT NOT NULL,
        target_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );


-- knowledge_base definition

CREATE TABLE knowledge_base (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT,
        summary TEXT,
        view_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      , user_id INTEGER DEFAULT 1 REFERENCES users(id));

CREATE INDEX idx_knowledge_title ON knowledge_base(title);
CREATE INDEX idx_knowledge_base_user_id ON knowledge_base(user_id);


-- knowledge_tag_mappings definition

CREATE TABLE knowledge_tag_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        knowledge_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id),
        FOREIGN KEY (tag_id) REFERENCES knowledge_tags(id)
      );


-- projects definition

CREATE TABLE projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER DEFAULT 1,
        name TEXT NOT NULL,
        description TEXT,
        goal TEXT,
        status TEXT DEFAULT 'active',
        progress INTEGER DEFAULT 0,
        start_date DATE,
        end_date DATE,
        ai_suggestions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      );

CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_status ON projects(status);


-- ai_analyses definition

CREATE TABLE ai_analyses (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, analysis_type TEXT NOT NULL, content TEXT, suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id));

CREATE INDEX idx_ai_analyses_project_updated ON ai_analyses(project_id, updated_at);
CREATE INDEX idx_ai_analyses_project_id ON ai_analyses(project_id);


-- ai_summaries definition

CREATE TABLE ai_summaries (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, summary_type TEXT DEFAULT 'summary', content TEXT, suggestions TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id));

CREATE INDEX idx_ai_summaries_project_updated ON ai_summaries(project_id, updated_at);
CREATE INDEX idx_ai_summaries_project_id ON ai_summaries(project_id);


-- project_knowledge_mappings definition

CREATE TABLE project_knowledge_mappings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        knowledge_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id),
        FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id)
      );


-- project_logs definition

CREATE TABLE project_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        content TEXT,
        progress_text TEXT,
        problem_text TEXT,
        plan_text TEXT,
        log_type TEXT DEFAULT 'manual',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME,
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );

CREATE INDEX idx_logs_project_id ON project_logs(project_id);
CREATE INDEX idx_logs_created_at ON project_logs(created_at);


-- project_milestones definition

CREATE TABLE project_milestones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        deadline DATE,
        sequence INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, summary_type TEXT DEFAULT "summary",
        FOREIGN KEY (project_id) REFERENCES projects(id)
      );

CREATE INDEX idx_milestones_project_id ON project_milestones(project_id);