import 'dart:convert';

import '../../domain/models.dart' hide AiToolCall;
import '../../domain/repositories.dart';
import 'types.dart';

/// AI 可调用的项目工具。只暴露有限的增删改查，所有写操作由 UI 二次确认。
class ProjectTools {
  ProjectTools({required this.projects, required this.milestones});

  final ProjectRepository projects;
  final MilestoneRepository milestones;

  static const listProjects = 'list_projects';
  static const getProject = 'get_project';
  static const createProject = 'create_project';
  static const updateProject = 'update_project';
  static const deleteProject = 'delete_project';

  static const writeTools = {createProject, updateProject, deleteProject};

  List<AiToolDefinition> get definitions => const [
    AiToolDefinition(
      name: listProjects,
      description: '查询项目列表。可以按状态或关键词筛选，用于了解用户当前有哪些项目。',
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
      description: '查看单个项目的完整信息，包括里程碑、最近记录和 AI 分析数量。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '项目 ID'},
        },
        'required': ['projectId'],
      },
    ),
    AiToolDefinition(
      name: createProject,
      description: '新建一个项目。只在用户明确要求创建时调用。',
      parameters: {
        'type': 'object',
        'properties': {
          'title': {'type': 'string', 'description': '项目名称'},
          'description': {'type': 'string', 'description': '可选，项目背景'},
          'goal': {'type': 'string', 'description': '可选，项目目标'},
          'dueDate': {'type': 'string', 'description': '可选，截止日期，格式 YYYY-MM-DD'},
        },
        'required': ['title'],
      },
    ),
    AiToolDefinition(
      name: updateProject,
      description: '修改项目信息（名称、描述、目标、状态、截止日期）。只修改用户明确提到的字段。',
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
          'dueDate': {'type': 'string', 'description': '新截止日期，格式 YYYY-MM-DD'},
        },
        'required': ['projectId'],
      },
    ),
    AiToolDefinition(
      name: deleteProject,
      description: '删除一个项目。属于不可撤销操作，必须由用户确认。',
      parameters: {
        'type': 'object',
        'properties': {
          'projectId': {'type': 'string', 'description': '项目 ID'},
        },
        'required': ['projectId'],
      },
    ),
  ];

  bool isWrite(String name) => writeTools.contains(name);

  String summarize(AiToolCall call) {
    final args = _args(call.arguments);
    final title = (args['title'] as String?)?.trim();
    final id = (args['projectId'] as String?)?.trim();
    return switch (call.name) {
      listProjects => '查看项目列表',
      getProject => '查看项目详情',
      createProject => '创建项目「${title?.isNotEmpty == true ? title : '未命名'}」',
      updateProject =>
        '修改项目「${title?.isNotEmpty == true ? title : id ?? '所选项目'}」',
      deleteProject => '删除项目「${id ?? '所选项目'}」',
      _ => '调用 ${call.name}',
    };
  }

  /// 执行工具并返回一段紧凑 JSON。成功返回 `{"ok":true,...}`，失败返回 `{"ok":false,"error":...}`。
  Future<String> execute(AiToolCall call) async {
    try {
      final args = _args(call.arguments);
      final result = switch (call.name) {
        listProjects => await _listProjects(args),
        getProject => await _getProject(args),
        createProject => await _createProject(args),
        updateProject => await _updateProject(args),
        deleteProject => await _deleteProject(args),
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
    final status = (args['status'] as String?)?.trim();
    final query = (args['query'] as String?)?.trim() ?? '';
    final filter = ProjectFilter(
      status: status == null || status.isEmpty
          ? null
          : ProjectStatus.fromDb(status),
      query: query,
    );
    final items = await projects.list(filter: filter);
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
              'progress': p.progress,
              'dueDate': p.dueDate,
            },
          )
          .toList(),
    };
  }

  Future<Map<String, dynamic>> _getProject(Map<String, dynamic> args) async {
    final id = _requireId(args);
    final detail = await projects.detail(id);
    if (detail == null) throw const FormatException('项目不存在或已被删除');
    final allMilestones = await milestones.listByProject(id);
    return {
      'project': {
        'id': detail.project.id,
        'title': detail.project.title,
        'description': detail.project.description,
        'goal': detail.project.goal,
        'status': detail.project.status.dbValue,
        'progress': detail.project.progress,
        'startDate': detail.project.startDate,
        'dueDate': detail.project.dueDate,
      },
      'milestones': allMilestones
          .map(
            (m) => {
              'id': m.id,
              'title': m.title,
              'completed': m.isCompleted,
              'dueDate': m.dueDate,
            },
          )
          .toList(),
      'recentLogs': detail.logs
          .take(10)
          .map(
            (l) => {
              'date': l.logDate,
              'progress': l.progressText,
              'problem': l.problemText,
              'plan': l.planText,
            },
          )
          .toList(),
      'insightCount': detail.insights.length,
    };
  }

  Future<Map<String, dynamic>> _createProject(Map<String, dynamic> args) async {
    final title = (args['title'] as String?)?.trim() ?? '';
    if (title.isEmpty) throw const FormatException('项目名称不能为空');
    final project = await projects.create(
      ProjectDraft(
        title: title,
        description: (args['description'] as String?)?.trim() ?? '',
        goal: (args['goal'] as String?)?.trim() ?? '',
        dueDate: _cleanDate(args['dueDate']),
      ),
    );
    return {'id': project.id, 'title': project.title};
  }

  Future<Map<String, dynamic>> _updateProject(Map<String, dynamic> args) async {
    final id = _requireId(args);
    final existing = await projects.getById(id);
    if (existing == null) throw const FormatException('项目不存在或已被删除');
    final title = (args['title'] as String?)?.trim();
    final status = (args['status'] as String?)?.trim();
    final updated = Project(
      id: existing.id,
      title: title == null || title.isEmpty ? existing.title : title,
      description: args.containsKey('description')
          ? (args['description'] as String?)?.trim() ?? ''
          : existing.description,
      goal: args.containsKey('goal')
          ? (args['goal'] as String?)?.trim() ?? ''
          : existing.goal,
      status: status == null || status.isEmpty
          ? existing.status
          : ProjectStatus.fromDb(status),
      progress: existing.progress,
      color: existing.color,
      startDate: existing.startDate,
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
    final id = _requireId(args);
    final existing = await projects.getById(id);
    if (existing == null) throw const FormatException('项目不存在或已被删除');
    await projects.delete(id);
    return {'id': id, 'title': existing.title};
  }

  String _requireId(Map<String, dynamic> args) {
    final id = (args['projectId'] as String?)?.trim() ?? '';
    if (id.isEmpty) throw const FormatException('缺少 projectId');
    return id;
  }

  String? _cleanDate(Object? value) {
    final text = (value as String?)?.trim();
    if (text == null || text.isEmpty) return null;
    final match = RegExp(r'\d{4}-\d{2}-\d{2}').firstMatch(text);
    return match?.group(0);
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
