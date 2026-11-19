import 'package:drift/drift.dart';

import '../domain/models.dart';
import 'local/app_database.dart';

int nowMillis() => DateTime.now().millisecondsSinceEpoch;

String dateKey(DateTime date) {
  final local = date.toLocal();
  final m = local.month.toString().padLeft(2, '0');
  final d = local.day.toString().padLeft(2, '0');
  return '${local.year}-$m-$d';
}

DateTime parseDateKey(String value) {
  final parts = value.split('-');
  return DateTime(int.parse(parts[0]), int.parse(parts[1]), int.parse(parts[2]));
}

Project projectFromRow(ProjectRow r) => Project(
      id: r.id,
      title: r.title,
      description: r.description,
      goal: r.goal,
      status: ProjectStatus.fromDb(r.status),
      progress: r.progress,
      color: r.color,
      startDate: r.startDate,
      dueDate: r.dueDate,
      completedAt: r.completedAt,
      sortOrder: r.sortOrder,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    );

Milestone milestoneFromRow(MilestoneRow r) => Milestone(
      id: r.id,
      projectId: r.projectId,
      title: r.title,
      description: r.description,
      dueDate: r.dueDate,
      isCompleted: r.isCompleted,
      completedAt: r.completedAt,
      sortOrder: r.sortOrder,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    );

ProjectLog logFromRow(ProjectLogRow r) => ProjectLog(
      id: r.id,
      projectId: r.projectId,
      logDate: r.logDate,
      progressText: r.progressText,
      problemText: r.problemText,
      planText: r.planText,
      rawInput: r.rawInput,
      milestoneId: r.milestoneId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    );

AiInsight insightFromRow(AiInsightRow r) => AiInsight(
      id: r.id,
      kind: InsightKind.fromDb(r.kind),
      title: r.title,
      content: r.content,
      projectId: r.projectId,
      model: r.model,
      promptVersion: r.promptVersion,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      sourceRefs: r.sourceRefs,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    );

KnowledgeEntry knowledgeFromRow(KnowledgeRow r) => KnowledgeEntry(
      id: r.id,
      title: r.title,
      content: r.content,
      sourceType: KnowledgeSource.fromDb(r.sourceType),
      sourceId: r.sourceId,
      viewCount: r.viewCount,
      lastViewedAt: r.lastViewedAt,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    );

Tag tagFromRow(TagRow r) => Tag(id: r.id, name: r.name, color: r.color, createdAt: r.createdAt);

ChatConversation conversationFromRow(ChatConversationRow r) => ChatConversation(
      id: r.id,
      title: r.title,
      scopeType: r.scopeType,
      scopeId: r.scopeId,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      archivedAt: r.archivedAt,
    );

ChatMessage messageFromRow(ChatMessageRow r) => ChatMessage(
      id: r.id,
      conversationId: r.conversationId,
      role: ChatRole.fromDb(r.role),
      content: r.content,
      reasoningContent: r.reasoningContent,
      toolCallsJson: r.toolCallsJson,
      toolCallId: r.toolCallId,
      tokenUsageJson: r.tokenUsageJson,
      createdAt: r.createdAt,
    );

AiConfig configFromRow(AiConfigRow r) => AiConfig(
      id: r.id,
      name: r.name,
      providerKey: r.providerKey,
      baseUrl: r.baseUrl,
      model: r.model,
      temperature: r.temperature,
      maxTokens: r.maxTokens,
      timeoutSeconds: r.timeoutSeconds,
      isActive: r.isActive,
      supportsTools: r.supportsTools,
      supportsStream: r.supportsStream,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    );

AiToolCall toolCallFromRow(AiToolCallRow r) => AiToolCall(
      id: r.id,
      toolName: r.toolName,
      argumentsJson: r.argumentsJson,
      conversationId: r.conversationId,
      messageId: r.messageId,
      resultSummary: r.resultSummary,
      status: ToolCallStatus.fromDb(r.status),
      error: r.error,
      durationMs: r.durationMs,
      createdAt: r.createdAt,
      confirmedAt: r.confirmedAt,
    );

ProjectsCompanion projectToCompanion(Project p) => ProjectsCompanion(
      id: Value(p.id),
      title: Value(p.title),
      description: Value(p.description),
      goal: Value(p.goal),
      status: Value(p.status.dbValue),
      progress: Value(p.progress),
      color: Value(p.color),
      startDate: Value(p.startDate),
      dueDate: Value(p.dueDate),
      completedAt: Value(p.completedAt),
      sortOrder: Value(p.sortOrder),
      createdAt: Value(p.createdAt),
      updatedAt: Value(p.updatedAt),
    );
