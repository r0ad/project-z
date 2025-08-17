-- 知识库数据库结构更新脚本
-- 为支持完整的知识库功能，需要对现有表结构进行扩展

-- 1. 更新 knowledge_base 表，添加缺失字段
ALTER TABLE knowledge_base ADD COLUMN category TEXT DEFAULT 'other';
ALTER TABLE knowledge_base ADD COLUMN ai_score REAL DEFAULT 0;
ALTER TABLE knowledge_base ADD COLUMN key_points TEXT; -- JSON格式存储关键要点数组
ALTER TABLE knowledge_base ADD COLUMN ai_suggestion TEXT;
ALTER TABLE knowledge_base ADD COLUMN status TEXT DEFAULT 'published'; -- draft, published, archived
ALTER TABLE knowledge_base ADD COLUMN user_id INTEGER DEFAULT 1;

-- 添加外键约束
-- ALTER TABLE knowledge_base ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- 2. 创建知识库分类表（可选，如果需要动态管理分类）
CREATE TABLE IF NOT EXISTS knowledge_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    color TEXT DEFAULT '#165DFF',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认分类
INSERT OR IGNORE INTO knowledge_categories (name, description) VALUES 
('技术文档', '技术相关的文档和教程'),
('项目经验', '项目实施过程中的经验总结'),
('问题解决', '问题分析和解决方案'),
('学习笔记', '学习过程中的笔记和心得'),
('最佳实践', '行业最佳实践和规范'),
('工具使用', '工具和软件的使用指南'),
('其他', '其他类型的知识');

-- 3. 创建知识库AI分析表
CREATE TABLE IF NOT EXISTS knowledge_ai_analysis (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id INTEGER NOT NULL,
    analysis_type TEXT NOT NULL, -- quality, keywords, suggestions
    content TEXT,
    score REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id) ON DELETE CASCADE
);

CREATE INDEX idx_knowledge_ai_analysis_knowledge_id ON knowledge_ai_analysis(knowledge_id);

-- 4. 创建知识库收藏表（扩展favorites表的功能）
-- favorites表已存在，可以直接使用，target_type='knowledge', target_id=knowledge_id

-- 5. 创建知识库评论表（如果需要评论功能）
CREATE TABLE IF NOT EXISTS knowledge_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    content TEXT NOT NULL,
    parent_id INTEGER, -- 用于回复评论
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_id) REFERENCES knowledge_comments(id)
);

CREATE INDEX idx_knowledge_comments_knowledge_id ON knowledge_comments(knowledge_id);
CREATE INDEX idx_knowledge_comments_user_id ON knowledge_comments(user_id);

-- 6. 创建知识库访问记录表（用于统计浏览量）
CREATE TABLE IF NOT EXISTS knowledge_views (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    knowledge_id INTEGER NOT NULL,
    user_id INTEGER DEFAULT 1,
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (knowledge_id) REFERENCES knowledge_base(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_knowledge_views_knowledge_id ON knowledge_views(knowledge_id);
CREATE INDEX idx_knowledge_views_created_at ON knowledge_views(created_at);

-- 7. 添加一些有用的索引
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_status ON knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_ai_score ON knowledge_base(ai_score);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_user_id ON knowledge_base(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_updated_at ON knowledge_base(updated_at);

-- 8. 创建一些有用的视图
CREATE VIEW IF NOT EXISTS v_knowledge_with_stats AS
SELECT 
    kb.*,
    COUNT(DISTINCT ktm.tag_id) as tag_count,
    COUNT(DISTINCT kv.id) as actual_view_count,
    COUNT(DISTINCT f.id) as favorite_count,
    COUNT(DISTINCT kc.id) as comment_count
FROM knowledge_base kb
LEFT JOIN knowledge_tag_mappings ktm ON kb.id = ktm.knowledge_id
LEFT JOIN knowledge_views kv ON kb.id = kv.knowledge_id
LEFT JOIN favorites f ON kb.id = f.target_id AND f.target_type = 'knowledge'
LEFT JOIN knowledge_comments kc ON kb.id = kc.knowledge_id
GROUP BY kb.id;

-- 9. 插入一些测试数据（可选）
INSERT OR IGNORE INTO knowledge_tags (name) VALUES 
('Vue3'), ('JavaScript'), ('前端'), ('React'), ('性能优化'), 
('UI设计'), ('设计系统'), ('Figma'), ('产品管理'), ('需求分析'), 
('用户研究'), ('商业模式'), ('创业'), ('战略'), ('TypeScript');

-- 更新现有knowledge_base数据的示例（如果有数据的话）
-- UPDATE knowledge_base SET category = '技术文档' WHERE title LIKE '%Vue%' OR title LIKE '%React%';
-- UPDATE knowledge_base SET category = '设计' WHERE title LIKE '%UI%' OR title LIKE '%设计%';
-- UPDATE knowledge_base SET category = '产品' WHERE title LIKE '%产品%' OR title LIKE '%需求%';
-- UPDATE knowledge_base SET category = '商业' WHERE title LIKE '%商业%' OR title LIKE '%创业%';