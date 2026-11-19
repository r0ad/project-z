import 'package:equatable/equatable.dart';

/// 项目状态。数据库存字符串，避免 enum index 漂移。
enum ProjectStatus {
  active('active', '进行中'),
  completed('completed', '已完成'),
  paused('paused', '已暂停'),
  cancelled('cancelled', '已取消');

  const ProjectStatus(this.dbValue, this.label);
  final String dbValue;
  final String label;

  static ProjectStatus fromDb(String value) =>
      values.firstWhere((e) => e.dbValue == value, orElse: () => active);
}

enum InsightKind {
  projectAnalysis('project_analysis', '项目分析'),
  weeklyReview('weekly_review', '周复盘');

  const InsightKind(this.dbValue, this.label);
  final String dbValue;
  final String label;

  static InsightKind fromDb(String value) => values.firstWhere(
    (e) => e.dbValue == value,
    orElse: () => projectAnalysis,
  );
}

enum KnowledgeSource {
  manual('manual'),
  log('log'),
  insight('insight'),
  chat('chat');

  const KnowledgeSource(this.dbValue);
  final String dbValue;

  static KnowledgeSource fromDb(String value) =>
      values.firstWhere((e) => e.dbValue == value, orElse: () => manual);
}

enum ChatRole {
  user('user'),
  assistant('assistant'),
  system('system'),
  tool('tool');

  const ChatRole(this.dbValue);
  final String dbValue;

  static ChatRole fromDb(String value) =>
      values.firstWhere((e) => e.dbValue == value, orElse: () => assistant);
}

enum ToolCallStatus {
  pending('pending', '待确认'),
  confirmed('confirmed', '已确认'),
  rejected('rejected', '已拒绝'),
  completed('completed', '已完成'),
  failed('failed', '失败');

  const ToolCallStatus(this.dbValue, this.label);
  final String dbValue;
  final String label;

  static ToolCallStatus fromDb(String value) =>
      values.firstWhere((e) => e.dbValue == value, orElse: () => pending);
}

class Project extends Equatable {
  const Project({
    required this.id,
    required this.title,
    this.description = '',
    this.goal = '',
    this.status = ProjectStatus.active,
    this.progress = 0,
    this.color,
    this.startDate,
    this.dueDate,
    this.completedAt,
    this.sortOrder = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String title;
  final String description;
  final String goal;
  final ProjectStatus status;
  final int progress;
  final String? color;
  final String? startDate;
  final String? dueDate;
  final int? completedAt;
  final int sortOrder;
  final int createdAt;
  final int updatedAt;

  bool get isActive => status == ProjectStatus.active;
  bool get isCompleted => status == ProjectStatus.completed;

  DateTime get createdDateTime =>
      DateTime.fromMillisecondsSinceEpoch(createdAt, isUtc: true).toLocal();
  DateTime get updatedDateTime =>
      DateTime.fromMillisecondsSinceEpoch(updatedAt, isUtc: true).toLocal();

  @override
  List<Object?> get props => [
    id,
    title,
    description,
    goal,
    status,
    progress,
    color,
    startDate,
    dueDate,
    completedAt,
    sortOrder,
    createdAt,
    updatedAt,
  ];
}

class ProjectDraft {
  const ProjectDraft({
    required this.title,
    this.description = '',
    this.goal = '',
    this.startDate,
    this.dueDate,
    this.color,
  });

  final String title;
  final String description;
  final String goal;
  final String? startDate;
  final String? dueDate;
  final String? color;
}

class Milestone extends Equatable {
  const Milestone({
    required this.id,
    required this.projectId,
    required this.title,
    this.description = '',
    this.dueDate,
    this.isCompleted = false,
    this.completedAt,
    this.sortOrder = 0,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String projectId;
  final String title;
  final String description;
  final String? dueDate;
  final bool isCompleted;
  final int? completedAt;
  final int sortOrder;
  final int createdAt;
  final int updatedAt;

  @override
  List<Object?> get props => [
    id,
    projectId,
    title,
    description,
    dueDate,
    isCompleted,
    completedAt,
    sortOrder,
    createdAt,
    updatedAt,
  ];
}

class MilestoneDraft {
  const MilestoneDraft({
    required this.projectId,
    required this.title,
    this.description = '',
    this.dueDate,
  });

  final String projectId;
  final String title;
  final String description;
  final String? dueDate;
}

class ProjectLog extends Equatable {
  const ProjectLog({
    required this.id,
    required this.projectId,
    required this.logDate,
    this.progressText = '',
    this.problemText = '',
    this.planText = '',
    this.rawInput,
    this.milestoneId,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String projectId;
  final String logDate;
  final String progressText;
  final String problemText;
  final String planText;
  final String? rawInput;
  final String? milestoneId;
  final int createdAt;
  final int updatedAt;

  bool get isEmpty =>
      progressText.trim().isEmpty &&
      problemText.trim().isEmpty &&
      planText.trim().isEmpty;

  @override
  List<Object?> get props => [
    id,
    projectId,
    logDate,
    progressText,
    problemText,
    planText,
    rawInput,
    milestoneId,
    createdAt,
    updatedAt,
  ];
}

class LogDraft {
  const LogDraft({
    required this.projectId,
    required this.logDate,
    this.progressText = '',
    this.problemText = '',
    this.planText = '',
    this.rawInput,
    this.milestoneId,
  });

  final String projectId;
  final String logDate;
  final String progressText;
  final String problemText;
  final String planText;
  final String? rawInput;
  final String? milestoneId;
}

class LogSearchHit {
  const LogSearchHit({required this.log, required this.projectTitle});
  final ProjectLog log;
  final String projectTitle;
}

class AiInsight extends Equatable {
  const AiInsight({
    required this.id,
    required this.kind,
    required this.title,
    required this.content,
    this.projectId,
    this.model,
    this.promptVersion,
    this.periodStart,
    this.periodEnd,
    this.sourceRefs = '[]',
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final InsightKind kind;
  final String title;
  final String content;
  final String? projectId;
  final String? model;
  final String? promptVersion;
  final String? periodStart;
  final String? periodEnd;
  final String sourceRefs;
  final int createdAt;
  final int updatedAt;

  @override
  List<Object?> get props => [
    id,
    kind,
    title,
    content,
    projectId,
    model,
    promptVersion,
    periodStart,
    periodEnd,
    sourceRefs,
    createdAt,
    updatedAt,
  ];
}

class Tag extends Equatable {
  const Tag({
    required this.id,
    required this.name,
    this.color,
    required this.createdAt,
  });
  final String id;
  final String name;
  final String? color;
  final int createdAt;

  @override
  List<Object?> get props => [id, name, color, createdAt];
}

class KnowledgeEntry extends Equatable {
  const KnowledgeEntry({
    required this.id,
    required this.title,
    required this.content,
    this.sourceType = KnowledgeSource.manual,
    this.sourceId,
    this.viewCount = 0,
    this.lastViewedAt,
    required this.createdAt,
    required this.updatedAt,
    this.tags = const [],
    this.projectIds = const [],
    this.isFavorite = false,
  });

  final String id;
  final String title;
  final String content;
  final KnowledgeSource sourceType;
  final String? sourceId;
  final int viewCount;
  final int? lastViewedAt;
  final int createdAt;
  final int updatedAt;
  final List<Tag> tags;
  final List<String> projectIds;
  final bool isFavorite;

  bool get isManual => sourceType == KnowledgeSource.manual;

  @override
  List<Object?> get props => [
    id,
    title,
    content,
    sourceType,
    sourceId,
    viewCount,
    lastViewedAt,
    createdAt,
    updatedAt,
    tags,
    projectIds,
    isFavorite,
  ];
}

class KnowledgeDraft {
  const KnowledgeDraft({
    required this.title,
    required this.content,
    this.sourceType = KnowledgeSource.manual,
    this.sourceId,
    this.tagNames = const [],
    this.projectIds = const [],
  });

  final String title;
  final String content;
  final KnowledgeSource sourceType;
  final String? sourceId;
  final List<String> tagNames;
  final List<String> projectIds;
}

class ChatConversation extends Equatable {
  const ChatConversation({
    required this.id,
    required this.title,
    this.scopeType = 'global',
    this.scopeId,
    required this.createdAt,
    required this.updatedAt,
    this.archivedAt,
  });

  final String id;
  final String title;
  final String scopeType;
  final String? scopeId;
  final int createdAt;
  final int updatedAt;
  final int? archivedAt;

  @override
  List<Object?> get props => [
    id,
    title,
    scopeType,
    scopeId,
    createdAt,
    updatedAt,
    archivedAt,
  ];
}

class ChatMessage extends Equatable {
  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.role,
    this.content = '',
    this.reasoningContent,
    this.toolCallsJson,
    this.toolCallId,
    this.tokenUsageJson,
    required this.createdAt,
  });

  final String id;
  final String conversationId;
  final ChatRole role;
  final String content;
  final String? reasoningContent;
  final String? toolCallsJson;
  final String? toolCallId;
  final String? tokenUsageJson;
  final int createdAt;

  @override
  List<Object?> get props => [
    id,
    conversationId,
    role,
    content,
    reasoningContent,
    toolCallsJson,
    toolCallId,
    tokenUsageJson,
    createdAt,
  ];
}

class AiConfig extends Equatable {
  const AiConfig({
    required this.id,
    required this.name,
    required this.providerKey,
    required this.baseUrl,
    required this.model,
    this.temperature = 0.7,
    this.maxTokens = 2048,
    this.timeoutSeconds = 60,
    this.isActive = false,
    this.supportsTools = true,
    this.supportsStream = true,
    required this.createdAt,
    required this.updatedAt,
  });

  final String id;
  final String name;
  final String providerKey;
  final String baseUrl;
  final String model;
  final double temperature;
  final int maxTokens;
  final int timeoutSeconds;
  final bool isActive;
  final bool supportsTools;
  final bool supportsStream;
  final int createdAt;
  final int updatedAt;

  String get storageKey => 'ai_key_$id';

  AiConfig copyWith({
    String? name,
    String? providerKey,
    String? baseUrl,
    String? model,
    double? temperature,
    int? maxTokens,
    int? timeoutSeconds,
    bool? isActive,
    bool? supportsTools,
    bool? supportsStream,
  }) {
    return AiConfig(
      id: id,
      name: name ?? this.name,
      providerKey: providerKey ?? this.providerKey,
      baseUrl: baseUrl ?? this.baseUrl,
      model: model ?? this.model,
      temperature: temperature ?? this.temperature,
      maxTokens: maxTokens ?? this.maxTokens,
      timeoutSeconds: timeoutSeconds ?? this.timeoutSeconds,
      isActive: isActive ?? this.isActive,
      supportsTools: supportsTools ?? this.supportsTools,
      supportsStream: supportsStream ?? this.supportsStream,
      createdAt: createdAt,
      updatedAt: updatedAt,
    );
  }

  @override
  List<Object?> get props => [
    id,
    name,
    providerKey,
    baseUrl,
    model,
    temperature,
    maxTokens,
    timeoutSeconds,
    isActive,
    supportsTools,
    supportsStream,
    createdAt,
    updatedAt,
  ];
}

class AiToolCall extends Equatable {
  const AiToolCall({
    required this.id,
    required this.toolName,
    required this.argumentsJson,
    this.conversationId,
    this.messageId,
    this.resultSummary,
    this.status = ToolCallStatus.pending,
    this.error,
    this.durationMs,
    required this.createdAt,
    this.confirmedAt,
  });

  final String id;
  final String toolName;
  final String argumentsJson;
  final String? conversationId;
  final String? messageId;
  final String? resultSummary;
  final ToolCallStatus status;
  final String? error;
  final int? durationMs;
  final int createdAt;
  final int? confirmedAt;

  @override
  List<Object?> get props => [
    id,
    toolName,
    argumentsJson,
    conversationId,
    messageId,
    resultSummary,
    status,
    error,
    durationMs,
    createdAt,
    confirmedAt,
  ];
}

class ProjectDetail {
  const ProjectDetail({
    required this.project,
    required this.milestones,
    required this.logs,
    required this.insights,
  });

  final Project project;
  final List<Milestone> milestones;
  final List<ProjectLog> logs;
  final List<AiInsight> insights;

  int get completedMilestones => milestones.where((m) => m.isCompleted).length;
}

class WeeklyStats {
  const WeeklyStats({
    required this.weekStart,
    required this.logCounts,
    required this.activeProjects,
    required this.completedMilestones,
    required this.totalProjects,
    required this.totalKnowledge,
  });

  final String weekStart;
  final List<int> logCounts;
  final int activeProjects;
  final int completedMilestones;
  final int totalProjects;
  final int totalKnowledge;

  int get totalLogs => logCounts.fold(0, (a, b) => a + b);
}

class ProjectFilter {
  const ProjectFilter({this.status, this.query = ''});
  final ProjectStatus? status;
  final String query;

  bool get isEmpty => status == null && query.trim().isEmpty;
}
