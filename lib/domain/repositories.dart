import 'models.dart';

abstract interface class ProjectRepository {
  Future<List<Project>> list({ProjectFilter filter = const ProjectFilter()});
  Future<Project?> getById(String id);
  Future<ProjectDetail?> detail(String id);
  Future<Project> create(ProjectDraft draft);
  Future<void> updateProject(Project project);
  Future<void> setStatus(String id, ProjectStatus status);
  Future<void> delete(String id);
}

abstract interface class MilestoneRepository {
  Future<List<Milestone>> listByProject(String projectId);
  Future<Milestone?> getById(String id);
  Future<Milestone> create(MilestoneDraft draft);
  Future<void> updateMilestone(Milestone milestone);
  Future<void> toggle(String id, bool completed);
  Future<void> delete(String id);
  Future<void> reorder(String projectId, List<String> orderedIds);
}

abstract interface class LogRepository {
  Future<List<ProjectLog>> listByProject(String projectId, {int limit = 100});
  Future<ProjectLog?> getById(String id);
  Future<List<ProjectLog>> recent({int days = 7, String? projectId});
  Future<ProjectLog> create(LogDraft draft);
  Future<void> updateLog(ProjectLog log);
  Future<void> delete(String id);
  Future<List<LogSearchHit>> search(String query, {String? projectId});
}

abstract interface class InsightRepository {
  Future<List<AiInsight>> listByProject(String projectId);
  Future<AiInsight?> getById(String id);
  Future<List<AiInsight>> listWeekly();
  Future<AiInsight> save(AiInsight insight);
  Future<void> delete(String id);
}

abstract interface class KnowledgeRepository {
  Future<List<KnowledgeEntry>> list({
    String query = '',
    String? tagId,
    bool favoritesOnly = false,
    int limit = 200,
  });
  Future<KnowledgeEntry?> getById(String id);
  Future<KnowledgeEntry> create(KnowledgeDraft draft);
  Future<KnowledgeEntry> updateEntry(
    KnowledgeEntry entry, {
    List<String>? tagNames,
    List<String>? projectIds,
  });
  Future<void> delete(String id);
  Future<List<Tag>> allTags();
  Future<void> toggleFavorite(String knowledgeId);
  Future<List<KnowledgeEntry>> related(String knowledgeId, {int limit = 5});
  Future<void> recordView(String id);
}

abstract interface class ChatRepository {
  Future<List<ChatConversation>> conversations({
    String? scopeType,
    String? scopeId,
  });
  Future<ChatConversation> createConversation({
    String title = '新对话',
    String scopeType = 'global',
    String? scopeId,
  });
  Future<List<ChatMessage>> messages(String conversationId);
  Future<ChatMessage> appendMessage(ChatMessage message);
  Future<void> renameConversation(String id, String title);
  Future<void> deleteConversation(String id);
}

abstract interface class AiConfigRepository {
  Future<List<AiConfig>> list();
  Future<AiConfig?> active();
  Future<AiConfig> save(AiConfig config, {String? apiKey});
  Future<void> setActive(String id);
  Future<void> delete(String id);
  Future<String?> readApiKey(String configId);
}

abstract interface class SettingsRepository {
  Future<String?> get(String key);
  Future<void> set(String key, String value);
  Future<bool> getBool(String key, {bool defaultValue = false});
  Future<void> setBool(String key, bool value);
}

abstract interface class StatsRepository {
  Future<WeeklyStats> weekly({DateTime? now});
}

abstract interface class ToolAuditRepository {
  Future<List<AiToolCall>> recent({int limit = 50});
  Future<void> record(AiToolCall call);
  Future<void> updateStatus(
    String id,
    ToolCallStatus status, {
    String? error,
    String? resultSummary,
    int? durationMs,
  });
}

abstract interface class SecretStore {
  Future<String?> read(String key);
  Future<void> write(String key, String value);
  Future<void> delete(String key);
}
