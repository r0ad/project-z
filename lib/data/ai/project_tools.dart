import 'dart:convert';

import '../../domain/models.dart' hide AiToolCall;
import '../../domain/repositories.dart';
import 'types.dart';

/// AI 副驾可调用的本地数据工具。
///
/// 覆盖项目、里程碑、日志、AI 分析、知识库与工作区概览；所有写操作由 UI
/// 二次确认后才执行，读操作直接执行并回传结果。工具参数里用 ID 定位数据，
/// 但给用户看的摘要一律解析成名称，不展示原始 ID。
class ProjectTools {
  ProjectTools({
    required this.projects,
    required this.milestones,
    required this.logs,
    required this.insights,
    required this.knowledge,
  });

  final ProjectRepository projects;
  final MilestoneRepository milestones;
  final LogRepository logs;
  final InsightRepository insights;
  final KnowledgeRepository knowledge;

  static const listProjects = 'list_projects';
  static const getProject = 'get_project';
  static const listMilestones = 'list_milestones';
  static const listLogs = 'list_project_logs';
  static const listInsights = 'list_insights';
  static const listKnowledge = 'list_knowledge';
  static const getKnowledge = 'get_knowledge';
  static const workspaceOverview = 'get_workspace_overview';

  static const createProject = 'create_project';
  static const updateProject = 'update_project';
  static const deleteProject = 'delete_project';
  static const createMilestone = 'create_milestone';
  static const updateMilestone = 'update_milestone';
  static const setMilestoneCompleted = 'set_milestone_completed';
  static const deleteMilestone = 'delete_milestone';
  static const createLog = 'create_project_log';
  static const updateLog = 'update_project_log';
  static const deleteLog = 'delete_project_log';
  static const createKnowledge = 'create_knowledge';
  static const updateKnowledge = 'update_knowledge';
  static const toggleKnowledgeFavorite = 'toggle_knowledge_favorite';
  static const deleteKnowledge = 'delete_knowledge';
  static const deleteInsight = 'delete_insight';

  static const writeTools = {
    createProject,
    updateProject,
    deleteProject,
    createMilestone,
    updateMilestone,
    setMilestoneCompleted,
    deleteMilestone,
    createLog,
    updateLog,
    deleteLog,
    createKnowledge,
    updateKnowledge,
    toggleKnowledgeFavorite,
    deleteKnowledge,
    deleteInsight,
  };

  List<AiToolDefinition> get definitions => const [
    AiToolDefinition(
      name: listProjects,
      description: '查询项目列表，可按状态或关键词筛选。需要项目 ID 时先调用它。',
      parameters: {
        'type': 'object',
        'properties': {
          'status': {
            'type': 'string',
            'enum': ['active', 'completed', 'paused', 'cancelled'],
            'description': '可选，按项目状态筛选',
          },
          'query': {'type': 'string', 'description': '可选，按项目名称或目标搜索'},
        },
      },
    ),
    AiToolDefinition(
      name: getProject,
      description: '查看一个项目的完整信息：基础信息、里程碑、最近日志、AI 分析和关联知识。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {
            'type': 'string',
            'description': '项目 ID，可先用 list_projects 获取',
          },
        },
        'required': ['projectId'],
      },
    ),
    AiToolDefinition(
      name: listMilestones,
      description: '列出一个项目下的全部里程碑，包含完成状态和日期。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '项目 ID'},
        },
        'required': ['projectId'],
      },
    ),
    AiToolDefinition(
      name: listLogs,
      description: '列出项目的执行记录（三栏日志），按日期倒序。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '项目 ID'},
          'limit': {'type': 'integer', 'description': '最多返回多少条，默认 20，最大 100'},
        },
        'required': ['projectId'],
      },
    ),
    AiToolDefinition(
      name: listInsights,
      description: '查看某个项目的 AI 分析，或查看全部周复盘。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '可选，项目 ID；不传则查周复盘'},
        },
      },
    ),
    AiToolDefinition(
      name: listKnowledge,
      description: '搜索或列出知识库条目，可按标签、收藏筛选。',
      parameters: {
        'type': 'object',
        'properties': {
          'query': {'type': 'string', 'description': '可选，全文搜索关键词'},
          'tag': {'type': 'string', 'description': '可选，标签名称'},
          'favoritesOnly': {'type': 'boolean', 'description': '可选，只返回收藏'},
          'limit': {'type': 'integer', 'description': '最多返回多少条，默认 30，最大 100'},
        },
      },
    ),
    AiToolDefinition(
      name: getKnowledge,
      description: '查看一条知识的正文、标签、关联项目和收藏状态。',
      parameters: {
        'type': 'object',
        'properties': {
          'knowledgeId': {'type': 'string', 'description': '知识 ID'},
        },
        'required': ['knowledgeId'],
      },
    ),
    AiToolDefinition(
      name: workspaceOverview,
      description: '查看整个工作区概览：项目状态、本周记录、知识数量与最近项目。',
      parameters: {'type': 'object', 'properties': {}},
    ),
    AiToolDefinition(
      name: createProject,
      description: '新建项目。只在用户明确要求创建时调用。',
      parameters: {
        'type': 'object',
        'properties': {
          'title': {'type': 'string', 'description': '项目名称'},
          'description': {'type': 'string', 'description': '可选，项目背景'},
          'goal': {'type': 'string', 'description': '可选，项目目标'},
          'startDate': {'type': 'string', 'description': '可选，开始日期 YYYY-MM-DD'},
          'dueDate': {'type': 'string', 'description': '可选，截止日期 YYYY-MM-DD'},
        },
        'required': ['title'],
      },
    ),
    AiToolDefinition(
      name: updateProject,
      description: '修改项目信息（名称、描述、目标、状态、开始/截止日期）。只改用户明确提到的字段。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '项目 ID'},
          'title': {'type': 'string', 'description': '新名称'},
          'description': {'type': 'string', 'description': '新背景描述'},
          'goal': {'type': 'string', 'description': '新目标'},
          'status': {
            'type': 'string',
            'enum': ['active', 'completed', 'paused', 'cancelled'],
          },
          'startDate': {'type': 'string', 'description': '新开始日期 YYYY-MM-DD'},
          'dueDate': {'type': 'string', 'description': '新截止日期 YYYY-MM-DD'},
        },
        'required': ['projectId'],
      },
    ),
    AiToolDefinition(
      name: deleteProject,
      description: '删除项目及其里程碑、日志、分析，知识条目会保留。不可撤销，必须确认。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '项目 ID'},
        },
        'required': ['projectId'],
      },
    ),
    AiToolDefinition(
      name: createMilestone,
      description: '在项目下新建里程碑。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '项目 ID'},
          'title': {'type': 'string', 'description': '里程碑名称'},
          'description': {'type': 'string', 'description': '可选，验收标准'},
          'dueDate': {'type': 'string', 'description': '可选，日期 YYYY-MM-DD'},
        },
        'required': ['projectId', 'title'],
      },
    ),
    AiToolDefinition(
      name: updateMilestone,
      description: '修改里程碑的名称、描述或日期。',
      parameters: {
        'type': 'object',
        'properties': {
          'milestoneId': {'type': 'string', 'description': '里程碑 ID'},
          'title': {'type': 'string', 'description': '新名称'},
          'description': {'type': 'string', 'description': '新描述'},
          'dueDate': {'type': 'string', 'description': '新日期 YYYY-MM-DD'},
        },
        'required': ['milestoneId'],
      },
    ),
    AiToolDefinition(
      name: setMilestoneCompleted,
      description: '把里程碑标记为完成或未完成，项目进度会自动重算。',
      parameters: {
        'type': 'object',
        'properties': {
          'milestoneId': {'type': 'string', 'description': '里程碑 ID'},
          'completed': {'type': 'boolean', 'description': 'true 完成，false 未完成'},
        },
        'required': ['milestoneId', 'completed'],
      },
    ),
    AiToolDefinition(
      name: deleteMilestone,
      description: '删除一个里程碑，项目进度会自动重算。',
      parameters: {
        'type': 'object',
        'properties': {
          'milestoneId': {'type': 'string', 'description': '里程碑 ID'},
        },
        'required': ['milestoneId'],
      },
    ),
    AiToolDefinition(
      name: createLog,
      description: '为项目新增一条执行记录。至少填写进展、问题、下一步或原文之一。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '项目 ID'},
          'logDate': {'type': 'string', 'description': '可选，日期 YYYY-MM-DD，默认今天'},
          'progress': {'type': 'string', 'description': '进展'},
          'problem': {'type': 'string', 'description': '问题或阻塞'},
          'plan': {'type': 'string', 'description': '下一步'},
          'rawText': {'type': 'string', 'description': '用户原话'},
          'milestoneId': {'type': 'string', 'description': '可选，关联里程碑 ID'},
        },
        'required': ['projectId'],
      },
    ),
    AiToolDefinition(
      name: updateLog,
      description: '修改一条执行记录的日期、三栏内容、原文或关联里程碑。',
      parameters: {
        'type': 'object',
        'properties': {
          'logId': {'type': 'string', 'description': '日志 ID'},
          'logDate': {'type': 'string', 'description': '新日期 YYYY-MM-DD'},
          'progress': {'type': 'string', 'description': '新进展'},
          'problem': {'type': 'string', 'description': '新问题'},
          'plan': {'type': 'string', 'description': '新下一步'},
          'rawText': {'type': 'string', 'description': '新原文'},
          'milestoneId': {
            'type': 'string',
            'description': '新关联里程碑 ID；空字符串表示取消关联',
          },
        },
        'required': ['logId'],
      },
    ),
    AiToolDefinition(
      name: deleteLog,
      description: '删除一条执行记录。',
      parameters: {
        'type': 'object',
        'properties': {
          'logId': {'type': 'string', 'description': '日志 ID'},
        },
        'required': ['logId'],
      },
    ),
    AiToolDefinition(
      name: createKnowledge,
      description: '新建一条知识，可带标签和关联项目。',
      parameters: {
        'type': 'object',
        'properties': {
          'title': {'type': 'string', 'description': '知识标题'},
          'content': {'type': 'string', 'description': '知识正文，支持 Markdown'},
          'tags': {
            'type': 'array',
            'items': {'type': 'string'},
            'description': '可选，标签名称列表',
          },
          'projectIds': {
            'type': 'array',
            'items': {'type': 'string'},
            'description': '可选，关联项目 ID 列表',
          },
        },
        'required': ['title', 'content'],
      },
    ),
    AiToolDefinition(
      name: updateKnowledge,
      description: '修改知识标题、正文、标签或关联项目。',
      parameters: {
        'type': 'object',
        'properties': {
          'knowledgeId': {'type': 'string', 'description': '知识 ID'},
          'title': {'type': 'string', 'description': '新标题'},
          'content': {'type': 'string', 'description': '新正文'},
          'tags': {
            'type': 'array',
            'items': {'type': 'string'},
            'description': '新标签列表（整体替换）',
          },
          'projectIds': {
            'type': 'array',
            'items': {'type': 'string'},
            'description': '新关联项目 ID 列表（整体替换）',
          },
        },
        'required': ['knowledgeId'],
      },
    ),
    AiToolDefinition(
      name: toggleKnowledgeFavorite,
      description: '切换一条知识的收藏状态。',
      parameters: {
        'type': 'object',
        'properties': {
          'knowledgeId': {'type': 'string', 'description': '知识 ID'},
        },
        'required': ['knowledgeId'],
      },
    ),
    AiToolDefinition(
      name: deleteKnowledge,
      description: '删除一条知识及其标签/项目关联、收藏。',
      parameters: {
        'type': 'object',
        'properties': {
          'knowledgeId': {'type': 'string', 'description': '知识 ID'},
        },
        'required': ['knowledgeId'],
      },
    ),
    AiToolDefinition(
      name: deleteInsight,
      description: '删除一条 AI 分析或周复盘。',
      parameters: {
        'type': 'object',
        'properties': {
          'insightId': {'type': 'string', 'description': '分析 ID'},
        },
        'required': ['insightId'],
      },
    ),
  ];

  bool isWrite(String name) => writeTools.contains(name);

  /// 给用户看的操作摘要。用名称而不是 ID，失败时退回所选对象的泛称。
  Future<String> summarize(AiToolCall call) async {
    final args = _args(call.arguments);
    try {
      switch (call.name) {
        case listProjects:
          return '查看项目列表';
        case getProject:
          return '查看项目「${await _projectName(_text(args, 'projectId'))}」';
        case listMilestones:
          return '查看项目「${await _projectName(_text(args, 'projectId'))}」的里程碑';
        case listLogs:
          return '查看项目「${await _projectName(_text(args, 'projectId'))}」的执行记录';
        case listInsights:
          final projectId = _text(args, 'projectId');
          if (projectId == null) return '查看周复盘';
          return '查看项目「${await _projectName(projectId)}」的 AI 分析';
        case listKnowledge:
          final query = _text(args, 'query');
          return query == null || query.isEmpty ? '查看知识库' : '搜索知识库「$query」';
        case getKnowledge:
          return '查看知识「${await _knowledgeName(_text(args, 'knowledgeId'))}」';
        case workspaceOverview:
          return '查看工作区概览';
        case createProject:
          return '创建项目「${_text(args, 'title') ?? '未命名'}」';
        case updateProject:
          final projectId = _text(args, 'projectId');
          final oldName = await _projectName(projectId);
          final newName = _text(args, 'title');
          if (newName != null && newName != oldName) {
            return '将项目「$oldName」改名为「$newName」';
          }
          return '修改项目「$oldName」';
        case deleteProject:
          return '删除项目「${await _projectName(_text(args, 'projectId'))}」';
        case createMilestone:
          final project = await _projectName(_text(args, 'projectId'));
          return '在项目「$project」下创建里程碑「${_text(args, 'title') ?? '未命名'}」';
        case updateMilestone:
          final context = await _milestoneContext(_text(args, 'milestoneId'));
          return '修改项目「${context.$1}」的里程碑「${context.$2}」';
        case setMilestoneCompleted:
          final context = await _milestoneContext(_text(args, 'milestoneId'));
          final done = _bool(args, 'completed') ?? false;
          return '将项目「${context.$1}」的里程碑「${context.$2}」标记为${done ? '完成' : '未完成'}';
        case deleteMilestone:
          final context = await _milestoneContext(_text(args, 'milestoneId'));
          return '删除项目「${context.$1}」的里程碑「${context.$2}」';
        case createLog:
          final project = await _projectName(_text(args, 'projectId'));
          final date = _cleanDate(args['logDate']) ?? _today();
          return '为项目「$project」记录 $date 的执行';
        case updateLog:
          return '修改执行记录「${await _logLabel(_text(args, 'logId'))}」';
        case deleteLog:
          return '删除执行记录「${await _logLabel(_text(args, 'logId'))}」';
        case createKnowledge:
          return '新建知识「${_text(args, 'title') ?? '未命名'}」';
        case updateKnowledge:
          return '修改知识「${await _knowledgeName(_text(args, 'knowledgeId'))}」';
        case toggleKnowledgeFavorite:
          return '切换知识「${await _knowledgeName(_text(args, 'knowledgeId'))}」的收藏';
        case deleteKnowledge:
          return '删除知识「${await _knowledgeName(_text(args, 'knowledgeId'))}」';
        case deleteInsight:
          return '删除 AI 分析「${await _insightName(_text(args, 'insightId'))}」';
        default:
          return '调用 ${call.name}';
      }
    } catch (_) {
      return _fallbackSummary(call, args);
    }
  }

  /// 执行工具并返回一段紧凑 JSON。成功返回 `{"ok":true,...}`，失败返回
  /// `{"ok":false,"error":...}`；异常不会穿透到聊天流程。
  Future<String> execute(AiToolCall call) async {
    try {
      final args = _args(call.arguments);
      final result = switch (call.name) {
        listProjects => await _listProjects(args),
        getProject => await _getProject(args),
        listMilestones => await _listMilestones(args),
        listLogs => await _listLogs(args),
        listInsights => await _listInsights(args),
        listKnowledge => await _listKnowledge(args),
        getKnowledge => await _getKnowledge(args),
        workspaceOverview => await _workspaceOverview(),
        createProject => await _createProject(args),
        updateProject => await _updateProject(args),
        deleteProject => await _deleteProject(args),
        createMilestone => await _createMilestone(args),
        updateMilestone => await _updateMilestone(args),
        setMilestoneCompleted => await _setMilestoneCompleted(args),
        deleteMilestone => await _deleteMilestone(args),
        createLog => await _createLog(args),
        updateLog => await _updateLog(args),
        deleteLog => await _deleteLog(args),
        createKnowledge => await _createKnowledge(args),
        updateKnowledge => await _updateKnowledge(args),
        toggleKnowledgeFavorite => await _toggleKnowledgeFavorite(args),
        deleteKnowledge => await _deleteKnowledge(args),
        deleteInsight => await _deleteInsight(args),
        _ => throw const FormatException('不支持的工具'),
      };
      return jsonEncode({'ok': true, 'tool': call.name, 'result': result});
    } catch (e) {
      return jsonEncode({
        'ok': false,
        'tool': call.name,
        'error': e is FormatException ? e.message : e.toString(),
      });
    }
  }

  Future<Map<String, dynamic>> _listProjects(Map<String, dynamic> args) async {
    final status = _text(args, 'status');
    final items = await projects.list(
      filter: ProjectFilter(
        status: status == null ? null : ProjectStatus.fromDb(status),
        query: _text(args, 'query') ?? '',
      ),
    );
    return {
      'count': items.length,
      'projects': items
          .take(30)
          .map(
            (p) => {
              'id': p.id,
              'title': p.title,
              'goal': p.goal,
              'status': p.status.dbValue,
              'statusLabel': p.status.label,
              'progress': p.progress,
              'dueDate': p.dueDate,
            },
          )
          .toList(),
    };
  }

  Future<Map<String, dynamic>> _getProject(Map<String, dynamic> args) async {
    final project = await _requireProject(_text(args, 'projectId'));
    final detail = await projects.detail(project.id);
    if (detail == null) throw const FormatException('项目不存在或已被删除');
    final allMilestones = await milestones.listByProject(project.id);
    final linkedKnowledge = (await knowledge.list(limit: 200))
        .where((e) => e.projectIds.contains(project.id))
        .map((e) => {'id': e.id, 'title': e.title})
        .toList();
    return {
      'project': _projectMap(detail.project),
      'milestones': allMilestones.map(_milestoneMap).toList(),
      'recentLogs': detail.logs.take(10).map(_logMap).toList(),
      'insights': detail.insights
          .take(5)
          .map(
            (i) => {
              'id': i.id,
              'title': i.title,
              'kind': i.kind.dbValue,
              'createdAt': i.createdAt,
            },
          )
          .toList(),
      'knowledge': linkedKnowledge,
    };
  }

  Future<Map<String, dynamic>> _listMilestones(
    Map<String, dynamic> args,
  ) async {
    final project = await _requireProject(_text(args, 'projectId'));
    final items = await milestones.listByProject(project.id);
    return {
      'project': {'id': project.id, 'title': project.title},
      'count': items.length,
      'milestones': items.map(_milestoneMap).toList(),
    };
  }

  Future<Map<String, dynamic>> _listLogs(Map<String, dynamic> args) async {
    final project = await _requireProject(_text(args, 'projectId'));
    final limit = (_int(args, 'limit') ?? 20).clamp(1, 100);
    final items = await logs.listByProject(project.id, limit: limit);
    return {
      'project': {'id': project.id, 'title': project.title},
      'count': items.length,
      'logs': items.map(_logMap).toList(),
    };
  }

  Future<Map<String, dynamic>> _listInsights(Map<String, dynamic> args) async {
    final projectId = _text(args, 'projectId');
    final List<AiInsight> items;
    if (projectId == null) {
      items = await insights.listWeekly();
    } else {
      final project = await _requireProject(projectId);
      items = await insights.listByProject(project.id);
    }
    return {
      'count': items.length,
      'insights': items
          .take(20)
          .map(
            (i) => {
              'id': i.id,
              'title': i.title,
              'kind': i.kind.dbValue,
              'content': i.content,
              'projectId': i.projectId,
              'createdAt': i.createdAt,
            },
          )
          .toList(),
    };
  }

  Future<Map<String, dynamic>> _listKnowledge(Map<String, dynamic> args) async {
    final tagName = _text(args, 'tag');
    String? tagId;
    if (tagName != null) {
      final tags = await knowledge.allTags();
      for (final tag in tags) {
        if (tag.name.toLowerCase() == tagName.toLowerCase()) {
          tagId = tag.id;
          break;
        }
      }
      if (tagId == null) throw FormatException('没有找到标签「$tagName」');
    }
    final limit = (_int(args, 'limit') ?? 30).clamp(1, 100);
    final items = await knowledge.list(
      query: _text(args, 'query') ?? '',
      tagId: tagId,
      favoritesOnly: _bool(args, 'favoritesOnly') ?? false,
      limit: limit,
    );
    return {
      'count': items.length,
      'entries': items
          .map(
            (e) => {
              'id': e.id,
              'title': e.title,
              'tags': e.tags.map((t) => t.name).toList(),
              'projectIds': e.projectIds,
              'favorite': e.isFavorite,
              'updatedAt': e.updatedAt,
            },
          )
          .toList(),
    };
  }

  Future<Map<String, dynamic>> _getKnowledge(Map<String, dynamic> args) async {
    final entry = await _requireKnowledge(_text(args, 'knowledgeId'));
    final projectTitles = <String>[];
    for (final id in entry.projectIds) {
      final project = await projects.getById(id);
      if (project != null) projectTitles.add(project.title);
    }
    return {
      'id': entry.id,
      'title': entry.title,
      'content': entry.content,
      'tags': entry.tags.map((t) => t.name).toList(),
      'projects': projectTitles,
      'favorite': entry.isFavorite,
      'sourceType': entry.sourceType.dbValue,
      'createdAt': entry.createdAt,
      'updatedAt': entry.updatedAt,
    };
  }

  Future<Map<String, dynamic>> _workspaceOverview() async {
    final allProjects = await projects.list();
    final recentLogs = await logs.recent(days: 7);
    final allKnowledge = await knowledge.list(limit: 100);
    final counts = <String, int>{};
    for (final project in allProjects) {
      counts.update(
        project.status.dbValue,
        (value) => value + 1,
        ifAbsent: () => 1,
      );
    }
    return {
      'projects': {
        'total': allProjects.length,
        'byStatus': counts,
        'recent': allProjects
            .take(5)
            .map(
              (p) => {
                'id': p.id,
                'title': p.title,
                'status': p.status.dbValue,
                'progress': p.progress,
              },
            )
            .toList(),
      },
      'last7DaysLogs': recentLogs.length,
      'knowledgeCount': allKnowledge.length,
      'favoriteKnowledge': allKnowledge.where((e) => e.isFavorite).length,
    };
  }

  Future<Map<String, dynamic>> _createProject(Map<String, dynamic> args) async {
    final title = _text(args, 'title');
    if (title == null) throw const FormatException('项目名称不能为空');
    final project = await projects.create(
      ProjectDraft(
        title: title,
        description: _text(args, 'description') ?? '',
        goal: _text(args, 'goal') ?? '',
        startDate: _cleanDate(args['startDate']),
        dueDate: _cleanDate(args['dueDate']),
      ),
    );
    return {'id': project.id, 'title': project.title};
  }

  Future<Map<String, dynamic>> _updateProject(Map<String, dynamic> args) async {
    final existing = await _requireProject(_text(args, 'projectId'));
    final title = _text(args, 'title');
    final status = _text(args, 'status');
    final updated = Project(
      id: existing.id,
      title: title == null || title.isEmpty ? existing.title : title,
      description: args.containsKey('description')
          ? (_text(args, 'description') ?? '')
          : existing.description,
      goal: args.containsKey('goal')
          ? (_text(args, 'goal') ?? '')
          : existing.goal,
      status: status == null ? existing.status : ProjectStatus.fromDb(status),
      progress: existing.progress,
      color: existing.color,
      startDate: args.containsKey('startDate')
          ? _cleanDate(args['startDate'])
          : existing.startDate,
      dueDate: args.containsKey('dueDate')
          ? _cleanDate(args['dueDate'])
          : existing.dueDate,
      completedAt: existing.completedAt,
      sortOrder: existing.sortOrder,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    );
    await projects.updateProject(updated);
    return {'id': updated.id, 'title': updated.title};
  }

  Future<Map<String, dynamic>> _deleteProject(Map<String, dynamic> args) async {
    final existing = await _requireProject(_text(args, 'projectId'));
    await projects.delete(existing.id);
    return {'id': existing.id, 'title': existing.title};
  }

  Future<Map<String, dynamic>> _createMilestone(
    Map<String, dynamic> args,
  ) async {
    final project = await _requireProject(_text(args, 'projectId'));
    final title = _text(args, 'title');
    if (title == null) throw const FormatException('里程碑名称不能为空');
    final milestone = await milestones.create(
      MilestoneDraft(
        projectId: project.id,
        title: title,
        description: _text(args, 'description') ?? '',
        dueDate: _cleanDate(args['dueDate']),
      ),
    );
    return {
      'id': milestone.id,
      'projectId': project.id,
      'projectTitle': project.title,
      'title': milestone.title,
    };
  }

  Future<Map<String, dynamic>> _updateMilestone(
    Map<String, dynamic> args,
  ) async {
    final existing = await _requireMilestone(_text(args, 'milestoneId'));
    final title = _text(args, 'title');
    final milestone = Milestone(
      id: existing.id,
      projectId: existing.projectId,
      title: title == null || title.isEmpty ? existing.title : title,
      description: args.containsKey('description')
          ? (_text(args, 'description') ?? '')
          : existing.description,
      dueDate: args.containsKey('dueDate')
          ? _cleanDate(args['dueDate'])
          : existing.dueDate,
      isCompleted: existing.isCompleted,
      completedAt: existing.completedAt,
      sortOrder: existing.sortOrder,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    );
    await milestones.updateMilestone(milestone);
    return {
      'id': milestone.id,
      'projectId': milestone.projectId,
      'title': milestone.title,
    };
  }

  Future<Map<String, dynamic>> _setMilestoneCompleted(
    Map<String, dynamic> args,
  ) async {
    final existing = await _requireMilestone(_text(args, 'milestoneId'));
    final completed = _bool(args, 'completed');
    if (completed == null) throw const FormatException('缺少 completed');
    await milestones.toggle(existing.id, completed);
    return {
      'id': existing.id,
      'projectId': existing.projectId,
      'title': existing.title,
      'completed': completed,
    };
  }

  Future<Map<String, dynamic>> _deleteMilestone(
    Map<String, dynamic> args,
  ) async {
    final existing = await _requireMilestone(_text(args, 'milestoneId'));
    await milestones.delete(existing.id);
    return {
      'id': existing.id,
      'projectId': existing.projectId,
      'title': existing.title,
    };
  }

  Future<Map<String, dynamic>> _createLog(Map<String, dynamic> args) async {
    final project = await _requireProject(_text(args, 'projectId'));
    final progress = _text(args, 'progress') ?? '';
    final problem = _text(args, 'problem') ?? '';
    final plan = _text(args, 'plan') ?? '';
    final rawText = _text(args, 'rawText');
    if (progress.isEmpty &&
        problem.isEmpty &&
        plan.isEmpty &&
        (rawText == null || rawText.isEmpty)) {
      throw const FormatException('至少填写进展、问题、下一步或原文之一');
    }
    final milestoneId = _text(args, 'milestoneId');
    if (milestoneId != null) {
      final milestone = await _requireMilestone(milestoneId);
      if (milestone.projectId != project.id) {
        throw const FormatException('里程碑不属于该项目');
      }
    }
    final log = await logs.create(
      LogDraft(
        projectId: project.id,
        logDate: _cleanDate(args['logDate']) ?? _today(),
        progressText: progress,
        problemText: problem,
        planText: plan,
        rawInput: rawText,
        milestoneId: milestoneId,
      ),
    );
    return {
      'id': log.id,
      'projectId': log.projectId,
      'projectTitle': project.title,
      'logDate': log.logDate,
    };
  }

  Future<Map<String, dynamic>> _updateLog(Map<String, dynamic> args) async {
    final existing = await _requireLog(_text(args, 'logId'));
    final milestoneId = args.containsKey('milestoneId')
        ? _text(args, 'milestoneId')
        : existing.milestoneId;
    if (milestoneId != null && milestoneId.isNotEmpty) {
      final milestone = await _requireMilestone(milestoneId);
      if (milestone.projectId != existing.projectId) {
        throw const FormatException('里程碑不属于该项目');
      }
    }
    final log = ProjectLog(
      id: existing.id,
      projectId: existing.projectId,
      logDate: args.containsKey('logDate')
          ? (_cleanDate(args['logDate']) ?? existing.logDate)
          : existing.logDate,
      progressText: args.containsKey('progress')
          ? (_text(args, 'progress') ?? '')
          : existing.progressText,
      problemText: args.containsKey('problem')
          ? (_text(args, 'problem') ?? '')
          : existing.problemText,
      planText: args.containsKey('plan')
          ? (_text(args, 'plan') ?? '')
          : existing.planText,
      rawInput: args.containsKey('rawText')
          ? _text(args, 'rawText')
          : existing.rawInput,
      milestoneId: milestoneId == null || milestoneId.isEmpty
          ? null
          : milestoneId,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
    );
    if (log.isEmpty) {
      throw const FormatException('至少保留进展、问题、下一步或原文之一');
    }
    await logs.updateLog(log);
    return {'id': log.id, 'projectId': log.projectId, 'logDate': log.logDate};
  }

  Future<Map<String, dynamic>> _deleteLog(Map<String, dynamic> args) async {
    final existing = await _requireLog(_text(args, 'logId'));
    await logs.delete(existing.id);
    return {
      'id': existing.id,
      'projectId': existing.projectId,
      'logDate': existing.logDate,
    };
  }

  Future<Map<String, dynamic>> _createKnowledge(
    Map<String, dynamic> args,
  ) async {
    final title = _text(args, 'title');
    final content = _text(args, 'content');
    if (title == null) throw const FormatException('知识标题不能为空');
    if (content == null) throw const FormatException('知识正文不能为空');
    final projectIds = await _validProjectIds(args['projectIds']);
    final entry = await knowledge.create(
      KnowledgeDraft(
        title: title,
        content: content,
        sourceType: KnowledgeSource.manual,
        tagNames: _strings(args['tags']),
        projectIds: projectIds,
      ),
    );
    return {
      'id': entry.id,
      'title': entry.title,
      'tags': entry.tags.map((t) => t.name).toList(),
      'projectIds': entry.projectIds,
    };
  }

  Future<Map<String, dynamic>> _updateKnowledge(
    Map<String, dynamic> args,
  ) async {
    final existing = await _requireKnowledge(_text(args, 'knowledgeId'));
    final title = _text(args, 'title');
    final content = _text(args, 'content');
    final updated = KnowledgeEntry(
      id: existing.id,
      title: title == null || title.isEmpty ? existing.title : title,
      content: content ?? existing.content,
      sourceType: existing.sourceType,
      sourceId: existing.sourceId,
      viewCount: existing.viewCount,
      lastViewedAt: existing.lastViewedAt,
      createdAt: existing.createdAt,
      updatedAt: existing.updatedAt,
      tags: existing.tags,
      projectIds: existing.projectIds,
      isFavorite: existing.isFavorite,
    );
    final projectIds = args.containsKey('projectIds')
        ? await _validProjectIds(args['projectIds'])
        : null;
    final result = await knowledge.updateEntry(
      updated,
      tagNames: args.containsKey('tags') ? _strings(args['tags']) : null,
      projectIds: projectIds,
    );
    return {
      'id': result.id,
      'title': result.title,
      'tags': result.tags.map((t) => t.name).toList(),
      'projectIds': result.projectIds,
    };
  }

  Future<Map<String, dynamic>> _toggleKnowledgeFavorite(
    Map<String, dynamic> args,
  ) async {
    final existing = await _requireKnowledge(_text(args, 'knowledgeId'));
    await knowledge.toggleFavorite(existing.id);
    final refreshed = await knowledge.getById(existing.id);
    return {
      'id': existing.id,
      'title': existing.title,
      'favorite': refreshed?.isFavorite ?? !existing.isFavorite,
    };
  }

  Future<Map<String, dynamic>> _deleteKnowledge(
    Map<String, dynamic> args,
  ) async {
    final existing = await _requireKnowledge(_text(args, 'knowledgeId'));
    await knowledge.delete(existing.id);
    return {'id': existing.id, 'title': existing.title};
  }

  Future<Map<String, dynamic>> _deleteInsight(Map<String, dynamic> args) async {
    final existing = await _requireInsight(_text(args, 'insightId'));
    await insights.delete(existing.id);
    return {'id': existing.id, 'title': existing.title};
  }

  Future<Project> _requireProject(String? id) async {
    if (id == null || id.isEmpty) throw const FormatException('缺少 projectId');
    final project = await projects.getById(id);
    if (project == null) throw const FormatException('项目不存在或已被删除');
    return project;
  }

  Future<Milestone> _requireMilestone(String? id) async {
    if (id == null || id.isEmpty) {
      throw const FormatException('缺少 milestoneId');
    }
    final milestone = await milestones.getById(id);
    if (milestone == null) throw const FormatException('里程碑不存在或已被删除');
    return milestone;
  }

  Future<ProjectLog> _requireLog(String? id) async {
    if (id == null || id.isEmpty) throw const FormatException('缺少 logId');
    final log = await logs.getById(id);
    if (log == null) throw const FormatException('执行记录不存在或已被删除');
    return log;
  }

  Future<KnowledgeEntry> _requireKnowledge(String? id) async {
    if (id == null || id.isEmpty) {
      throw const FormatException('缺少 knowledgeId');
    }
    final entry = await knowledge.getById(id);
    if (entry == null) throw const FormatException('知识不存在或已被删除');
    return entry;
  }

  Future<AiInsight> _requireInsight(String? id) async {
    if (id == null || id.isEmpty) throw const FormatException('缺少 insightId');
    final insight = await insights.getById(id);
    if (insight == null) throw const FormatException('AI 分析不存在或已被删除');
    return insight;
  }

  Future<List<String>> _validProjectIds(Object? value) async {
    final ids = _strings(value);
    for (final id in ids) {
      if (await projects.getById(id) == null) {
        throw FormatException('关联项目不存在或已被删除：$id');
      }
    }
    return ids;
  }

  Future<String> _projectName(String? id) async {
    if (id == null || id.isEmpty) return '所选项目';
    final project = await projects.getById(id);
    return project?.title ?? '所选项目';
  }

  Future<(String, String)> _milestoneContext(String? id) async {
    if (id == null || id.isEmpty) return ('所选项目', '所选里程碑');
    final milestone = await milestones.getById(id);
    if (milestone == null) return ('所选项目', '所选里程碑');
    final project = await projects.getById(milestone.projectId);
    return (project?.title ?? '所选项目', milestone.title);
  }

  Future<String> _knowledgeName(String? id) async {
    if (id == null || id.isEmpty) return '所选知识';
    final entry = await knowledge.getById(id);
    return entry?.title ?? '所选知识';
  }

  Future<String> _logLabel(String? id) async {
    if (id == null || id.isEmpty) return '所选记录';
    final log = await logs.getById(id);
    if (log == null) return '所选记录';
    final project = await projects.getById(log.projectId);
    return '${project?.title ?? '所选项目'} · ${log.logDate}';
  }

  Future<String> _insightName(String? id) async {
    if (id == null || id.isEmpty) return '所选分析';
    final insight = await insights.getById(id);
    return insight?.title ?? '所选分析';
  }

  String _fallbackSummary(AiToolCall call, Map<String, dynamic> args) {
    final title = _text(args, 'title');
    if (title != null) return '${call.name}「$title」';
    return '调用 ${call.name}';
  }

  Map<String, dynamic> _projectMap(Project p) => {
    'id': p.id,
    'title': p.title,
    'description': p.description,
    'goal': p.goal,
    'status': p.status.dbValue,
    'statusLabel': p.status.label,
    'progress': p.progress,
    'startDate': p.startDate,
    'dueDate': p.dueDate,
    'completedAt': p.completedAt,
  };

  Map<String, dynamic> _milestoneMap(Milestone m) => {
    'id': m.id,
    'projectId': m.projectId,
    'title': m.title,
    'description': m.description,
    'completed': m.isCompleted,
    'dueDate': m.dueDate,
    'sortOrder': m.sortOrder,
  };

  Map<String, dynamic> _logMap(ProjectLog log) => {
    'id': log.id,
    'projectId': log.projectId,
    'logDate': log.logDate,
    'progress': log.progressText,
    'problem': log.problemText,
    'plan': log.planText,
    'rawText': log.rawInput,
    'milestoneId': log.milestoneId,
  };

  String _today() {
    final now = DateTime.now();
    final month = now.month.toString().padLeft(2, '0');
    final day = now.day.toString().padLeft(2, '0');
    return '${now.year}-$month-$day';
  }

  String? _cleanDate(Object? value) {
    final text = (value as String?)?.trim();
    if (text == null || text.isEmpty) return null;
    final match = RegExp(r'\d{4}-\d{2}-\d{2}').firstMatch(text);
    return match?.group(0);
  }

  String? _text(Map<String, dynamic> args, String key) {
    final value = args[key];
    if (value == null) return null;
    final text = value.toString().trim();
    return text.isEmpty ? null : text;
  }

  int? _int(Map<String, dynamic> args, String key) {
    final value = args[key];
    if (value is int) return value;
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '');
  }

  bool? _bool(Map<String, dynamic> args, String key) {
    final value = args[key];
    if (value is bool) return value;
    if (value is String) {
      if (value == 'true') return true;
      if (value == 'false') return false;
    }
    return null;
  }

  List<String> _strings(Object? value) {
    if (value is List) {
      return value
          .map((e) => e.toString().trim())
          .where((e) => e.isNotEmpty)
          .toList();
    }
    if (value is String && value.trim().isNotEmpty) {
      return value
          .split(',')
          .map((e) => e.trim())
          .where((e) => e.isNotEmpty)
          .toList();
    }
    return const [];
  }

  Map<String, dynamic> _args(String raw) {
    if (raw.trim().isEmpty) return const {};
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map) return decoded.cast<String, dynamic>();
    } on FormatException {
      // 交给调用方按空参数处理，返回更清晰的业务错误。
    }
    return const {};
  }
}
