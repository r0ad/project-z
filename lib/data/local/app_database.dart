import 'dart:io';

import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';

part 'app_database.g.dart';

@DataClassName('ProjectRow')
class Projects extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get description => text().withDefault(const Constant(''))();
  TextColumn get goal => text().withDefault(const Constant(''))();
  TextColumn get status => text().withDefault(const Constant('active'))();
  IntColumn get progress => integer().withDefault(const Constant(0))();
  TextColumn get color => text().nullable()();
  TextColumn get startDate => text().nullable()();
  TextColumn get dueDate => text().nullable()();
  IntColumn get completedAt => integer().nullable()();
  IntColumn get sortOrder => integer().withDefault(const Constant(0))();
  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('MilestoneRow')
class Milestones extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text().references(Projects, #id, onDelete: KeyAction.cascade)();
  TextColumn get title => text()();
  TextColumn get description => text().withDefault(const Constant(''))();
  TextColumn get dueDate => text().nullable()();
  BoolColumn get isCompleted => boolean().withDefault(const Constant(false))();
  IntColumn get completedAt => integer().nullable()();
  IntColumn get sortOrder => integer().withDefault(const Constant(0))();
  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ProjectLogRow')
class ProjectLogs extends Table {
  TextColumn get id => text()();
  TextColumn get projectId => text().references(Projects, #id, onDelete: KeyAction.cascade)();
  TextColumn get logDate => text()();
  TextColumn get progressText => text().withDefault(const Constant(''))();
  TextColumn get problemText => text().withDefault(const Constant(''))();
  TextColumn get planText => text().withDefault(const Constant(''))();
  TextColumn get rawInput => text().nullable()();
  TextColumn get milestoneId =>
      text().nullable().references(Milestones, #id, onDelete: KeyAction.setNull)();
  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('AiInsightRow')
class AiInsights extends Table {
  TextColumn get id => text()();
  TextColumn get projectId =>
      text().nullable().references(Projects, #id, onDelete: KeyAction.cascade)();
  TextColumn get kind => text().withDefault(const Constant('project_analysis'))();
  TextColumn get title => text()();
  TextColumn get content => text()();
  TextColumn get model => text().nullable()();
  TextColumn get promptVersion => text().nullable()();
  TextColumn get periodStart => text().nullable()();
  TextColumn get periodEnd => text().nullable()();
  TextColumn get sourceRefs => text().withDefault(const Constant('[]'))();
  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('KnowledgeRow')
class KnowledgeEntries extends Table {
  TextColumn get id => text()();
  TextColumn get title => text()();
  TextColumn get content => text()();
  TextColumn get sourceType => text().withDefault(const Constant('manual'))();
  TextColumn get sourceId => text().nullable()();
  IntColumn get viewCount => integer().withDefault(const Constant(0))();
  IntColumn get lastViewedAt => integer().nullable()();
  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('TagRow')
class Tags extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get color => text().nullable()();
  IntColumn get createdAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('KnowledgeTagLinkRow')
class KnowledgeTagLinks extends Table {
  TextColumn get knowledgeId =>
      text().references(KnowledgeEntries, #id, onDelete: KeyAction.cascade)();
  TextColumn get tagId => text().references(Tags, #id, onDelete: KeyAction.cascade)();

  @override
  Set<Column> get primaryKey => {knowledgeId, tagId};
}

@DataClassName('ProjectKnowledgeLinkRow')
class ProjectKnowledgeLinks extends Table {
  TextColumn get projectId =>
      text().references(Projects, #id, onDelete: KeyAction.cascade)();
  TextColumn get knowledgeId =>
      text().references(KnowledgeEntries, #id, onDelete: KeyAction.cascade)();
  IntColumn get createdAt => integer()();

  @override
  Set<Column> get primaryKey => {projectId, knowledgeId};
}

@DataClassName('FavoriteRow')
class Favorites extends Table {
  TextColumn get id => text()();
  TextColumn get targetType => text()();
  TextColumn get targetId => text()();
  IntColumn get createdAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ChatConversationRow')
class ChatConversations extends Table {
  TextColumn get id => text()();
  TextColumn get title => text().withDefault(const Constant('新对话'))();
  TextColumn get scopeType => text().withDefault(const Constant('global'))();
  TextColumn get scopeId => text().nullable()();
  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();
  IntColumn get archivedAt => integer().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('ChatMessageRow')
class ChatMessages extends Table {
  TextColumn get id => text()();
  TextColumn get conversationId =>
      text().references(ChatConversations, #id, onDelete: KeyAction.cascade)();
  TextColumn get role => text()();
  TextColumn get content => text().withDefault(const Constant(''))();
  TextColumn get reasoningContent => text().nullable()();
  TextColumn get toolCallsJson => text().nullable()();
  TextColumn get toolCallId => text().nullable()();
  TextColumn get tokenUsageJson => text().nullable()();
  IntColumn get createdAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('AiConfigRow')
class AiConfigs extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get providerKey => text()();
  TextColumn get baseUrl => text()();
  TextColumn get model => text()();
  RealColumn get temperature => real().withDefault(const Constant(0.7))();
  IntColumn get maxTokens => integer().withDefault(const Constant(2048))();
  IntColumn get timeoutSeconds => integer().withDefault(const Constant(60))();
  BoolColumn get isActive => boolean().withDefault(const Constant(false))();
  BoolColumn get supportsTools => boolean().withDefault(const Constant(true))();
  BoolColumn get supportsStream => boolean().withDefault(const Constant(true))();
  IntColumn get createdAt => integer()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {id};
}

@DataClassName('SettingRow')
class Settings extends Table {
  TextColumn get key => text()();
  TextColumn get value => text()();
  IntColumn get updatedAt => integer()();

  @override
  Set<Column> get primaryKey => {key};
}

@DataClassName('AiToolCallRow')
class AiToolCalls extends Table {
  TextColumn get id => text()();
  TextColumn get conversationId => text().nullable()();
  TextColumn get messageId => text().nullable()();
  TextColumn get toolName => text()();
  TextColumn get argumentsJson => text()();
  TextColumn get resultSummary => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('pending'))();
  TextColumn get error => text().nullable()();
  IntColumn get durationMs => integer().nullable()();
  IntColumn get createdAt => integer()();
  IntColumn get confirmedAt => integer().nullable()();

  @override
  Set<Column> get primaryKey => {id};
}

@DriftDatabase(
  tables: [
    Projects,
    Milestones,
    ProjectLogs,
    AiInsights,
    KnowledgeEntries,
    Tags,
    KnowledgeTagLinks,
    ProjectKnowledgeLinks,
    Favorites,
    ChatConversations,
    ChatMessages,
    AiConfigs,
    Settings,
    AiToolCalls,
  ],
)
class AppDatabase extends _$AppDatabase {
  AppDatabase(super.e);

  @override
  int get schemaVersion => 1;

  @override
  MigrationStrategy get migration => MigrationStrategy(
        onCreate: (m) async {
          await m.createAll();
          await _createSearchIndex();
        },
        beforeOpen: (details) async {
          await customStatement('PRAGMA foreign_keys = ON');
          await customStatement('PRAGMA journal_mode = WAL');
        },
      );

  Future<void> _createSearchIndex() async {
    await customStatement(
      'CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_fts USING fts5('
      'knowledge_id UNINDEXED, title, content, tokenize = "unicode61")',
    );
    await customStatement(
      'CREATE TRIGGER IF NOT EXISTS knowledge_fts_ai AFTER INSERT ON knowledge_entries BEGIN '
      'INSERT INTO knowledge_fts(knowledge_id, title, content) '
      'VALUES (new.id, new.title, new.content); END',
    );
    await customStatement(
      'CREATE TRIGGER IF NOT EXISTS knowledge_fts_au AFTER UPDATE ON knowledge_entries BEGIN '
      'DELETE FROM knowledge_fts WHERE knowledge_id = old.id; '
      'INSERT INTO knowledge_fts(knowledge_id, title, content) '
      'VALUES (new.id, new.title, new.content); END',
    );
    await customStatement(
      'CREATE TRIGGER IF NOT EXISTS knowledge_fts_ad AFTER DELETE ON knowledge_entries BEGIN '
      'DELETE FROM knowledge_fts WHERE knowledge_id = old.id; END',
    );

    await customStatement(
      'CREATE VIRTUAL TABLE IF NOT EXISTS project_logs_fts USING fts5('
      'log_id UNINDEXED, progress_text, problem_text, plan_text, tokenize = "unicode61")',
    );
    await customStatement(
      'CREATE TRIGGER IF NOT EXISTS project_logs_fts_ai AFTER INSERT ON project_logs BEGIN '
      'INSERT INTO project_logs_fts(log_id, progress_text, problem_text, plan_text) '
      'VALUES (new.id, new.progress_text, new.problem_text, new.plan_text); END',
    );
    await customStatement(
      'CREATE TRIGGER IF NOT EXISTS project_logs_fts_au AFTER UPDATE ON project_logs BEGIN '
      'DELETE FROM project_logs_fts WHERE log_id = old.id; '
      'INSERT INTO project_logs_fts(log_id, progress_text, problem_text, plan_text) '
      'VALUES (new.id, new.progress_text, new.problem_text, new.plan_text); END',
    );
    await customStatement(
      'CREATE TRIGGER IF NOT EXISTS project_logs_fts_ad AFTER DELETE ON project_logs BEGIN '
      'DELETE FROM project_logs_fts WHERE log_id = old.id; END',
    );

    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status, updated_at DESC)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id, sort_order)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_logs_project_date ON project_logs(project_id, log_date DESC)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_logs_date ON project_logs(log_date DESC)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_knowledge_updated ON knowledge_entries(updated_at DESC)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_ktl_tag ON knowledge_tag_links(tag_id, knowledge_id)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_pkl_knowledge ON project_knowledge_links(knowledge_id)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation '
      'ON chat_messages(conversation_id, created_at)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_insights_project ON ai_insights(project_id, created_at DESC)',
    );
    await customStatement(
      'CREATE INDEX IF NOT EXISTS idx_ai_tool_calls_created ON ai_tool_calls(created_at DESC)',
    );
  }
}

LazyDatabase openAppDatabase() {
  return LazyDatabase(() async {
    final dir = await getApplicationSupportDirectory();
    final file = File(p.join(dir.path, 'diandian.sqlite'));
    return NativeDatabase.createInBackground(file);
  });
}
