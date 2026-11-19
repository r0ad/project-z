import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../domain/models.dart';
import '../../domain/repositories.dart';
import '../local/app_database.dart';
import '../mappers.dart';

const _uuid = Uuid();

class DriftKnowledgeRepository implements KnowledgeRepository {
  DriftKnowledgeRepository(this._db);
  final AppDatabase _db;

  @override
  Future<List<KnowledgeEntry>> list({
    String query = '',
    String? tagId,
    bool favoritesOnly = false,
    int limit = 200,
  }) async {
    final q = _db.select(_db.knowledgeEntries);

    final keyword = query.trim();
    if (keyword.isNotEmpty) {
      final ids = await _ftsIds(keyword);
      if (ids.isEmpty) return const [];
      q.where((t) => t.id.isIn(ids));
    }
    if (tagId != null) {
      final ids = await _taggedIds(tagId);
      if (ids.isEmpty) return const [];
      q.where((t) => t.id.isIn(ids));
    }
    if (favoritesOnly) {
      final ids = await _favoriteIds();
      if (ids.isEmpty) return const [];
      q.where((t) => t.id.isIn(ids));
    }
    q.orderBy([
      (t) => OrderingTerm(expression: t.updatedAt, mode: OrderingMode.desc),
    ]);
    q.limit(limit);
    final rows = await q.get();
    final result = <KnowledgeEntry>[];
    for (final row in rows) {
      result.add(await _withMeta(row));
    }
    return result;
  }

  Future<List<String>> _ftsIds(String query) async {
    final match = _toMatch(query);
    if (match.isEmpty) return const [];
    final rows = await _db
        .customSelect(
          'SELECT knowledge_id FROM knowledge_fts WHERE knowledge_fts MATCH ? '
          'ORDER BY rank LIMIT 200',
          variables: [Variable.withString(match)],
        )
        .get();
    return rows.map((r) => r.read<String>('knowledge_id')).toList();
  }

  String _toMatch(String query) {
    final tokens = query
        .trim()
        .split(RegExp(r'\s+'))
        .where((e) => e.isNotEmpty)
        .map((e) => '"${e.replaceAll('"', '')}"')
        .where((e) => e.length > 2)
        .toList();
    return tokens.join(' ');
  }

  Future<List<String>> _taggedIds(String tagId) async {
    final rows = await (_db.select(
      _db.knowledgeTagLinks,
    )..where((t) => t.tagId.equals(tagId))).get();
    return rows.map((r) => r.knowledgeId).toList();
  }

  Future<List<String>> _favoriteIds() async {
    final rows = await (_db.select(
      _db.favorites,
    )..where((t) => t.targetType.equals('knowledge'))).get();
    return rows.map((r) => r.targetId).toList();
  }

  Future<KnowledgeEntry> _withMeta(KnowledgeRow row) async {
    final tagRows = await _db
        .customSelect(
          'SELECT t.* FROM tags t JOIN knowledge_tag_links l ON l.tag_id = t.id '
          'WHERE l.knowledge_id = ? ORDER BY t.name',
          variables: [Variable.withString(row.id)],
        )
        .get();
    final projectRows = await (_db.select(
      _db.projectKnowledgeLinks,
    )..where((t) => t.knowledgeId.equals(row.id))).get();
    final favorite =
        await (_db.select(_db.favorites)..where(
              (t) =>
                  t.targetType.equals('knowledge') & t.targetId.equals(row.id),
            ))
            .getSingleOrNull();
    return knowledgeFromRow(row).copyWithMeta(
      tags: tagRows
          .map(
            (r) => Tag(
              id: r.read<String>('id'),
              name: r.read<String>('name'),
              color: r.readNullable<String>('color'),
              createdAt: r.read<int>('created_at'),
            ),
          )
          .toList(),
      projectIds: projectRows.map((r) => r.projectId).toList(),
      isFavorite: favorite != null,
    );
  }

  @override
  Future<KnowledgeEntry?> getById(String id) async {
    final row = await (_db.select(
      _db.knowledgeEntries,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
    return row == null ? null : _withMeta(row);
  }

  @override
  Future<KnowledgeEntry> create(KnowledgeDraft draft) async {
    final now = nowMillis();
    final id = _uuid.v4();
    await _db.transaction(() async {
      await _db
          .into(_db.knowledgeEntries)
          .insert(
            KnowledgeEntriesCompanion.insert(
              id: id,
              title: draft.title.trim(),
              content: draft.content,
              sourceType: Value(draft.sourceType.dbValue),
              sourceId: Value(draft.sourceId),
              createdAt: now,
              updatedAt: now,
            ),
          );
      await _replaceTags(id, draft.tagNames);
      await _replaceProjects(id, draft.projectIds);
    });
    return (await getById(id))!;
  }

  @override
  Future<KnowledgeEntry> updateEntry(
    KnowledgeEntry entry, {
    List<String>? tagNames,
    List<String>? projectIds,
  }) async {
    final now = nowMillis();
    await _db.transaction(() async {
      await (_db.update(
        _db.knowledgeEntries,
      )..where((t) => t.id.equals(entry.id))).write(
        KnowledgeEntriesCompanion(
          title: Value(entry.title),
          content: Value(entry.content),
          updatedAt: Value(now),
        ),
      );
      if (tagNames != null) await _replaceTags(entry.id, tagNames);
      if (projectIds != null) await _replaceProjects(entry.id, projectIds);
    });
    return (await getById(entry.id))!;
  }

  Future<void> _replaceTags(String knowledgeId, List<String> names) async {
    await (_db.delete(
      _db.knowledgeTagLinks,
    )..where((t) => t.knowledgeId.equals(knowledgeId))).go();
    for (final raw
        in names.map((e) => e.trim()).where((e) => e.isNotEmpty).toSet()) {
      final tag = await _ensureTag(raw);
      await _db
          .into(_db.knowledgeTagLinks)
          .insertOnConflictUpdate(
            KnowledgeTagLinksCompanion.insert(
              knowledgeId: knowledgeId,
              tagId: tag,
            ),
          );
    }
  }

  Future<String> _ensureTag(String name) async {
    final existing = await (_db.select(
      _db.tags,
    )..where((t) => t.name.equals(name))).getSingleOrNull();
    if (existing != null) return existing.id;
    final id = _uuid.v4();
    await _db
        .into(_db.tags)
        .insert(
          TagsCompanion.insert(id: id, name: name, createdAt: nowMillis()),
        );
    return id;
  }

  Future<void> _replaceProjects(
    String knowledgeId,
    List<String> projectIds,
  ) async {
    await (_db.delete(
      _db.projectKnowledgeLinks,
    )..where((t) => t.knowledgeId.equals(knowledgeId))).go();
    for (final projectId in projectIds.toSet()) {
      await _db
          .into(_db.projectKnowledgeLinks)
          .insertOnConflictUpdate(
            ProjectKnowledgeLinksCompanion.insert(
              projectId: projectId,
              knowledgeId: knowledgeId,
              createdAt: nowMillis(),
            ),
          );
    }
  }

  @override
  Future<void> delete(String id) async {
    await _db.transaction(() async {
      await (_db.delete(_db.favorites)..where(
            (t) => t.targetType.equals('knowledge') & t.targetId.equals(id),
          ))
          .go();
      await (_db.delete(
        _db.knowledgeEntries,
      )..where((t) => t.id.equals(id))).go();
    });
  }

  @override
  Future<List<Tag>> allTags() async {
    final rows = await (_db.select(
      _db.tags,
    )..orderBy([(t) => OrderingTerm(expression: t.name)])).get();
    return rows.map(tagFromRow).toList();
  }

  @override
  Future<void> toggleFavorite(String knowledgeId) async {
    final existing =
        await (_db.select(_db.favorites)..where(
              (t) =>
                  t.targetType.equals('knowledge') &
                  t.targetId.equals(knowledgeId),
            ))
            .getSingleOrNull();
    if (existing != null) {
      await (_db.delete(
        _db.favorites,
      )..where((t) => t.id.equals(existing.id))).go();
    } else {
      await _db
          .into(_db.favorites)
          .insert(
            FavoritesCompanion.insert(
              id: _uuid.v4(),
              targetType: 'knowledge',
              targetId: knowledgeId,
              createdAt: nowMillis(),
            ),
          );
    }
  }

  @override
  Future<List<KnowledgeEntry>> related(
    String knowledgeId, {
    int limit = 5,
  }) async {
    final rows = await _db
        .customSelect(
          'SELECT DISTINCT l2.knowledge_id FROM knowledge_tag_links l1 '
          'JOIN knowledge_tag_links l2 ON l2.tag_id = l1.tag_id '
          'WHERE l1.knowledge_id = ? AND l2.knowledge_id != ? LIMIT ?',
          variables: [
            Variable.withString(knowledgeId),
            Variable.withString(knowledgeId),
            Variable.withInt(limit),
          ],
        )
        .get();
    final ids = rows.map((r) => r.read<String>('knowledge_id')).toList();
    if (ids.isEmpty) return const [];
    final entries =
        await (_db.select(_db.knowledgeEntries)
              ..where((t) => t.id.isIn(ids))
              ..limit(limit))
            .get();
    return entries.map((r) => knowledgeFromRow(r)).toList();
  }

  @override
  Future<void> recordView(String id) async {
    final now = nowMillis();
    await _db.customUpdate(
      'UPDATE knowledge_entries SET view_count = view_count + 1, last_viewed_at = ? WHERE id = ?',
      variables: [Variable.withInt(now), Variable.withString(id)],
      updates: {_db.knowledgeEntries},
      updateKind: UpdateKind.update,
    );
  }
}

extension on KnowledgeEntry {
  KnowledgeEntry copyWithMeta({
    required List<Tag> tags,
    required List<String> projectIds,
    required bool isFavorite,
  }) {
    return KnowledgeEntry(
      id: id,
      title: title,
      content: content,
      sourceType: sourceType,
      sourceId: sourceId,
      viewCount: viewCount,
      lastViewedAt: lastViewedAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      tags: tags,
      projectIds: projectIds,
      isFavorite: isFavorite,
    );
  }
}

class DriftChatRepository implements ChatRepository {
  DriftChatRepository(this._db);
  final AppDatabase _db;

  @override
  Future<List<ChatConversation>> conversations({
    String? scopeType,
    String? scopeId,
  }) async {
    final q = _db.select(_db.chatConversations);
    if (scopeType != null) q.where((t) => t.scopeType.equals(scopeType));
    if (scopeId != null) q.where((t) => t.scopeId.equals(scopeId));
    q.orderBy([
      (t) => OrderingTerm(expression: t.updatedAt, mode: OrderingMode.desc),
    ]);
    return (await q.get()).map(conversationFromRow).toList();
  }

  @override
  Future<ChatConversation> createConversation({
    String title = '新对话',
    String scopeType = 'global',
    String? scopeId,
  }) async {
    final now = nowMillis();
    final conversation = ChatConversation(
      id: _uuid.v4(),
      title: title,
      scopeType: scopeType,
      scopeId: scopeId,
      createdAt: now,
      updatedAt: now,
    );
    await _db
        .into(_db.chatConversations)
        .insert(
          ChatConversationsCompanion.insert(
            id: conversation.id,
            title: Value(title),
            scopeType: Value(scopeType),
            scopeId: Value(scopeId),
            createdAt: now,
            updatedAt: now,
          ),
        );
    return conversation;
  }

  @override
  Future<List<ChatMessage>> messages(String conversationId) async {
    final rows =
        await (_db.select(_db.chatMessages)
              ..where((t) => t.conversationId.equals(conversationId))
              ..orderBy([(t) => OrderingTerm(expression: t.createdAt)]))
            .get();
    return rows.map(messageFromRow).toList();
  }

  @override
  Future<ChatMessage> appendMessage(ChatMessage message) async {
    await _db
        .into(_db.chatMessages)
        .insert(
          ChatMessagesCompanion.insert(
            id: message.id,
            conversationId: message.conversationId,
            role: message.role.dbValue,
            content: Value(message.content),
            reasoningContent: Value(message.reasoningContent),
            toolCallsJson: Value(message.toolCallsJson),
            toolCallId: Value(message.toolCallId),
            tokenUsageJson: Value(message.tokenUsageJson),
            createdAt: message.createdAt,
          ),
        );
    await (_db.update(_db.chatConversations)
          ..where((t) => t.id.equals(message.conversationId)))
        .write(ChatConversationsCompanion(updatedAt: Value(nowMillis())));
    return message;
  }

  @override
  Future<void> renameConversation(String id, String title) async {
    await (_db.update(
      _db.chatConversations,
    )..where((t) => t.id.equals(id))).write(
      ChatConversationsCompanion(
        title: Value(title.trim()),
        updatedAt: Value(nowMillis()),
      ),
    );
  }

  @override
  Future<void> deleteConversation(String id) async {
    await (_db.delete(
      _db.chatConversations,
    )..where((t) => t.id.equals(id))).go();
  }
}

class DriftAiConfigRepository implements AiConfigRepository {
  DriftAiConfigRepository(this._db, this._secrets);
  final AppDatabase _db;
  final SecretStore _secrets;

  @override
  Future<List<AiConfig>> list() async {
    final rows =
        await (_db.select(_db.aiConfigs)..orderBy([
              (t) => OrderingTerm(
                expression: t.updatedAt,
                mode: OrderingMode.desc,
              ),
            ]))
            .get();
    return rows.map(configFromRow).toList();
  }

  @override
  Future<AiConfig?> active() async {
    final row =
        await (_db.select(_db.aiConfigs)
              ..where((t) => t.isActive.equals(true))
              ..limit(1))
            .getSingleOrNull();
    return row == null ? null : configFromRow(row);
  }

  @override
  Future<AiConfig> save(AiConfig config, {String? apiKey}) async {
    final now = nowMillis();
    final saved = config.copyWithWithTimes(now);
    await _db.transaction(() async {
      if (saved.isActive) {
        await _db
            .update(_db.aiConfigs)
            .write(const AiConfigsCompanion(isActive: Value(false)));
      }
      await _db
          .into(_db.aiConfigs)
          .insertOnConflictUpdate(
            AiConfigsCompanion.insert(
              id: saved.id,
              name: saved.name,
              providerKey: saved.providerKey,
              baseUrl: saved.baseUrl,
              model: saved.model,
              temperature: Value(saved.temperature),
              maxTokens: Value(saved.maxTokens),
              timeoutSeconds: Value(saved.timeoutSeconds),
              isActive: Value(saved.isActive),
              supportsTools: Value(saved.supportsTools),
              supportsStream: Value(saved.supportsStream),
              createdAt: saved.createdAt,
              updatedAt: saved.updatedAt,
            ),
          );
    });
    if (apiKey != null && apiKey.trim().isNotEmpty) {
      await _secrets.write(saved.storageKey, apiKey.trim());
    }
    return saved;
  }

  @override
  Future<void> setActive(String id) async {
    await _db.transaction(() async {
      await _db
          .update(_db.aiConfigs)
          .write(const AiConfigsCompanion(isActive: Value(false)));
      await (_db.update(_db.aiConfigs)..where((t) => t.id.equals(id))).write(
        AiConfigsCompanion(
          isActive: const Value(true),
          updatedAt: Value(nowMillis()),
        ),
      );
    });
  }

  @override
  Future<void> delete(String id) async {
    await _db.transaction(() async {
      await (_db.delete(_db.aiConfigs)..where((t) => t.id.equals(id))).go();
    });
    await _secrets.delete('ai_key_$id');
  }

  @override
  Future<String?> readApiKey(String configId) =>
      _secrets.read('ai_key_$configId');
}

extension on AiConfig {
  AiConfig copyWithWithTimes(int now) => AiConfig(
    id: id,
    name: name,
    providerKey: providerKey,
    baseUrl: baseUrl,
    model: model,
    temperature: temperature,
    maxTokens: maxTokens,
    timeoutSeconds: timeoutSeconds,
    isActive: isActive,
    supportsTools: supportsTools,
    supportsStream: supportsStream,
    createdAt: createdAt == 0 ? now : createdAt,
    updatedAt: now,
  );
}

class DriftSettingsRepository implements SettingsRepository {
  DriftSettingsRepository(this._db);
  final AppDatabase _db;

  @override
  Future<String?> get(String key) async {
    final row = await (_db.select(
      _db.settings,
    )..where((t) => t.key.equals(key))).getSingleOrNull();
    return row?.value;
  }

  @override
  Future<void> set(String key, String value) async {
    await _db
        .into(_db.settings)
        .insertOnConflictUpdate(
          SettingsCompanion.insert(
            key: key,
            value: value,
            updatedAt: nowMillis(),
          ),
        );
  }

  @override
  Future<bool> getBool(String key, {bool defaultValue = false}) async {
    final value = await get(key);
    return value == null ? defaultValue : value == 'true';
  }

  @override
  Future<void> setBool(String key, bool value) => set(key, value.toString());
}

class DriftToolAuditRepository implements ToolAuditRepository {
  DriftToolAuditRepository(this._db);
  final AppDatabase _db;

  @override
  Future<List<AiToolCall>> recent({int limit = 50}) async {
    final rows =
        await (_db.select(_db.aiToolCalls)
              ..orderBy([
                (t) => OrderingTerm(
                  expression: t.createdAt,
                  mode: OrderingMode.desc,
                ),
              ])
              ..limit(limit))
            .get();
    return rows.map(toolCallFromRow).toList();
  }

  @override
  Future<void> record(AiToolCall call) async {
    await _db
        .into(_db.aiToolCalls)
        .insert(
          AiToolCallsCompanion.insert(
            id: call.id,
            conversationId: Value(call.conversationId),
            messageId: Value(call.messageId),
            toolName: call.toolName,
            argumentsJson: call.argumentsJson,
            resultSummary: Value(call.resultSummary),
            status: Value(call.status.dbValue),
            error: Value(call.error),
            durationMs: Value(call.durationMs),
            createdAt: call.createdAt,
            confirmedAt: Value(call.confirmedAt),
          ),
        );
  }

  @override
  Future<void> updateStatus(
    String id,
    ToolCallStatus status, {
    String? error,
    String? resultSummary,
    int? durationMs,
  }) async {
    await (_db.update(_db.aiToolCalls)..where((t) => t.id.equals(id))).write(
      AiToolCallsCompanion(
        status: Value(status.dbValue),
        error: Value(error),
        resultSummary: Value(resultSummary),
        durationMs: Value(durationMs),
        confirmedAt: Value(nowMillis()),
      ),
    );
  }
}
