# 项目更新逻辑设计文档

## 1. 概述

本文档描述了项目管理系统中项目相关的更新逻辑，包括项目状态更新、进度跟踪、里程碑管理和日志记录等核心功能的设计和实现方案。

## 2. 数据库设计

### 2.1 核心表结构

#### projects 表（项目主表）
```sql
CREATE TABLE projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER DEFAULT 1,
    name TEXT NOT NULL,                    -- 项目名称
    description TEXT,                      -- 项目描述
    goal TEXT,                            -- 项目目标
    status TEXT DEFAULT 'active',         -- 项目状态：active/completed/paused/cancelled
    progress INTEGER DEFAULT 0,           -- 项目进度（0-100）
    start_date DATE,                      -- 开始日期
    end_date DATE,                        -- 结束日期
    ai_suggestions TEXT,                  -- AI建议
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

#### project_milestones 表（项目里程碑）
```sql
CREATE TABLE project_milestones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    title TEXT NOT NULL,                  -- 里程碑标题
    description TEXT,                     -- 里程碑描述
    status TEXT DEFAULT 'pending',       -- 状态：pending/progress/completed
    progress INTEGER DEFAULT 0,          -- 进度（0-100）
    deadline DATE,                       -- 截止日期
    sequence INTEGER DEFAULT 0,         -- 排序序号
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

#### project_logs 表（项目日志）
```sql
CREATE TABLE project_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    content TEXT,                        -- 原始日志内容
    progress_text TEXT,                  -- 进展内容（AI分析后）
    problem_text TEXT,                   -- 问题内容（AI分析后）
    plan_text TEXT,                      -- 计划内容（AI分析后）
    log_type TEXT DEFAULT 'manual',     -- 日志类型：manual/voice/ai
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME,
    FOREIGN KEY (project_id) REFERENCES projects(id)
);
```

## 3. 项目更新逻辑设计

### 3.1 项目进度更新机制

#### 3.1.1 自动进度计算
项目进度基于里程碑完成情况自动计算：

```javascript
// 核心算法
async updateProjectProgress(projectId) {
    const milestones = await this.getProjectMilestones(projectId)
    
    if (milestones.length === 0) return
    
    const completedCount = milestones.filter(m => m.status === 'completed').length
    const progress = Math.round((completedCount / milestones.length) * 100)
    
    await dbService.update('projects', { progress }, 'id = ?', [projectId])
    
    // 如果所有里程碑完成，自动更新项目状态为完成
    if (progress === 100) {
        await dbService.update('projects', { status: 'completed' }, 'id = ?', [projectId])
    }
}
```

#### 3.1.2 手动进度更新
支持用户手动调整项目进度：

```javascript
async updateProgress(projectId, progressData) {
    const updateData = {
        progress: progressData.progress || 0
    }
    
    if (progressData.description) {
        updateData.description = progressData.description
    }
    
    await dbService.update('projects', updateData, 'id = ?', [projectId])
    
    // 重新计算基于里程碑的进度
    await this.updateProjectProgress(projectId)
}
```

### 3.2 里程碑管理逻辑

#### 3.2.1 里程碑状态更新
```javascript
async updateMilestone(milestoneId, updateData) {
    const milestone = await dbService.findOne('project_milestones', 'id = ?', [milestoneId])
    
    await dbService.update('project_milestones', updateData, 'id = ?', [milestoneId])
    
    // 如果里程碑状态变为完成，触发项目进度重新计算
    if (updateData.status === 'completed') {
        await this.updateProjectProgress(milestone.project_id)
    }
}
```

#### 3.2.2 里程碑进度影响项目进度
- 里程碑完成时自动触发项目整体进度重新计算
- 支持里程碑的细粒度进度跟踪（0-100%）
- 项目进度 = 已完成里程碑数 / 总里程碑数 × 100%

### 3.3 项目状态管理

#### 3.3.1 状态定义
- `active`: 进行中
- `completed`: 已完成
- `paused`: 暂停
- `cancelled`: 已取消

#### 3.3.2 状态自动转换规则
1. 当所有里程碑完成时，项目状态自动变为 `completed`
2. 当项目进度达到100%时，状态自动变为 `completed`
3. 其他状态变更需要手动操作

### 3.4 日志记录与分析

#### 3.4.1 日志创建流程
```javascript
async createLog(projectId, logData) {
    const { content, progressText, problemText, planText, logType = 'manual' } = logData
    
    const logId = await dbService.insert('project_logs', {
        project_id: projectId,
        content: content || '',
        progress_text: progressText || '',
        problem_text: problemText || '',
        plan_text: planText || '',
        log_type: logType
    })
    
    // 更新项目的最后更新时间
    await dbService.update('projects', {
        updated_at: new Date().toISOString()
    }, 'id = ?', [projectId])
}
```

#### 3.4.2 AI智能分析
- 支持将原始日志内容通过AI分析，自动分类为进展、问题、计划三个维度
- 分析结果存储在对应的字段中，便于后续查询和展示
- 支持语音输入转文字后进行AI分析

## 4. 业务流程设计

### 4.1 项目创建流程
1. 用户填写项目基本信息（名称、描述、目标）
2. 系统创建项目记录，状态默认为 `active`
3. 可选择性添加初始里程碑
4. 项目进度初始化为 0%

### 4.2 日常更新流程
1. **日志记录**：用户通过文字或语音记录项目进展
2. **AI分析**：系统自动分析日志内容，提取进展、问题、计划
3. **进度更新**：根据日志内容和里程碑完成情况更新项目进度
4. **状态同步**：自动更新项目的最后修改时间

### 4.3 里程碑管理流程
1. **创建里程碑**：设置标题、描述、截止日期
2. **进度跟踪**：定期更新里程碑进度
3. **状态变更**：标记里程碑为进行中或已完成
4. **自动计算**：里程碑状态变更时自动重新计算项目整体进度

### 4.4 项目完成流程
1. 所有里程碑标记为完成
2. 系统自动将项目进度设为100%
3. 项目状态自动变更为 `completed`
4. 生成项目完成总结（可选）

## 5. API接口设计

### 5.1 项目更新相关接口

```javascript
// 更新项目基本信息
POST /api/projects/{id}/update
{
    "name": "项目名称",
    "description": "项目描述",
    "goal": "项目目标",
    "status": "active"
}

// 更新项目进度
POST /api/projects/{id}/progress
{
    "progress": 75,
    "description": "进度描述"
}

// 更新项目计划
POST /api/projects/{id}/plan
{
    "plan": "计划内容",
    "goals": ["目标1", "目标2"]
}
```

### 5.2 里程碑管理接口

```javascript
// 更新里程碑
PUT /api/milestones/{id}
{
    "title": "里程碑标题",
    "status": "completed",
    "progress": 100
}

// 获取项目里程碑
GET /api/projects/{id}/milestones
```

### 5.3 日志管理接口

```javascript
// 创建日志
POST /api/projects/{id}/logs
{
    "content": "原始日志内容",
    "logType": "manual"
}

// 获取项目日志
GET /api/projects/{id}/logs?limit=10
```

## 6. 前端交互设计

### 6.1 项目详情页面
- **目标与节点**：显示项目目标和里程碑列表
- **项目日志**：显示最近的项目日志记录
- **进度可视化**：通过进度条展示项目和里程碑进度
- **操作按钮**：支持编辑、删除、聊天等操作

### 6.2 日志记录页面
- **多种输入方式**：支持文字输入和语音输入
- **AI智能分析**：自动将日志内容分类为进展、问题、计划
- **实时保存**：支持自动保存和手动保存
- **历史记录**：显示历史日志记录

### 6.3 聊天交互页面
- **项目上下文**：显示项目基本信息和最近日志
- **AI对话**：支持与AI讨论项目相关问题
- **智能建议**：AI根据项目状态提供改进建议
- **快捷操作**：支持快速更新进度和计划

## 7. 数据一致性保证

### 7.1 事务处理
- 里程碑状态更新和项目进度重新计算使用事务保证一致性
- 日志创建和项目更新时间同步更新

### 7.2 数据校验
- 进度值范围校验（0-100）
- 状态值枚举校验
- 必填字段验证

### 7.3 并发控制
- 使用乐观锁机制处理并发更新
- 关键操作添加重试机制

## 8. 性能优化

### 8.1 查询优化
- 为常用查询字段添加索引
- 分页查询大量数据
- 缓存频繁访问的数据

### 8.2 更新优化
- 批量更新操作
- 异步处理非关键更新
- 减少不必要的数据库访问

## 9. 扩展性考虑

### 9.1 功能扩展
- 支持项目模板
- 支持项目协作
- 支持更复杂的里程碑依赖关系

### 9.2 数据扩展
- 预留扩展字段
- 支持自定义属性
- 支持附件和文档管理

## 10. 总结

本设计文档详细描述了项目更新逻辑的各个方面，包括数据库设计、业务逻辑、API接口和前端交互。通过合理的设计和实现，系统能够提供完整的项目管理功能，支持项目的全生命周期管理，并通过AI技术提升用户体验和管理效率。