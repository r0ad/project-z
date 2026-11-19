import 'package:diandian/data/local/app_database.dart';
import 'package:drift/drift.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase(NativeDatabase.memory());
  });

  tearDown(() async {
    await db.close();
  });

  test('opens schema v1 and creates FTS tables', () async {
    final tables = await db
        .customSelect(
          "SELECT name FROM sqlite_master WHERE type IN ('table','view') "
          "AND name IN ('knowledge_fts','project_logs_fts')",
        )
        .get();
    expect(tables, hasLength(2));
  });

  test('foreign keys cascade project delete', () async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await db
        .into(db.projects)
        .insert(
          ProjectsCompanion.insert(
            id: 'p1',
            title: '项目',
            createdAt: now,
            updatedAt: now,
          ),
        );
    await db
        .into(db.milestones)
        .insert(
          MilestonesCompanion.insert(
            id: 'm1',
            projectId: 'p1',
            title: '里程碑',
            createdAt: now,
            updatedAt: now,
          ),
        );
    await (db.delete(db.projects)..where((t) => t.id.equals('p1'))).go();
    final left = await db.select(db.milestones).get();
    expect(left, isEmpty);
  });

  test('knowledge FTS trigger indexes insert and update', () async {
    final now = DateTime.now().millisecondsSinceEpoch;
    await db
        .into(db.knowledgeEntries)
        .insert(
          KnowledgeEntriesCompanion.insert(
            id: 'k1',
            title: 'Flutter 重写计划',
            content: '用 Drift 管理本地数据',
            createdAt: now,
            updatedAt: now,
          ),
        );
    var hits = await db
        .customSelect(
          "SELECT knowledge_id FROM knowledge_fts WHERE knowledge_fts MATCH 'Flutter'",
        )
        .get();
    expect(hits.map((r) => r.read<String>('knowledge_id')), contains('k1'));

    await (db.update(
      db.knowledgeEntries,
    )..where((t) => t.id.equals('k1'))).write(
      KnowledgeEntriesCompanion(
        title: const Value('SQLite 笔记'),
        updatedAt: Value(now + 1),
      ),
    );
    hits = await db
        .customSelect(
          "SELECT knowledge_id FROM knowledge_fts WHERE knowledge_fts MATCH 'SQLite'",
        )
        .get();
    expect(hits.map((r) => r.read<String>('knowledge_id')), contains('k1'));
    final old = await db
        .customSelect(
          "SELECT knowledge_id FROM knowledge_fts WHERE knowledge_fts MATCH 'Flutter'",
        )
        .get();
    expect(old, isEmpty);
  });
}
