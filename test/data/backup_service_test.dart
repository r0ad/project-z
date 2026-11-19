import 'dart:convert';

import 'package:diandian/data/backup/backup_service.dart';
import 'package:diandian/data/local/app_database.dart';
import 'package:diandian/data/mappers.dart';
import 'package:diandian/data/repositories/content_repositories.dart';
import 'package:diandian/data/repositories/project_repositories.dart';
import 'package:diandian/domain/models.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase db;
  late DriftProjectRepository projects;
  late DriftMilestoneRepository milestones;
  late DriftLogRepository logs;
  late DriftKnowledgeRepository knowledge;
  late DriftSettingsRepository settings;
  late BackupService backup;
  late String projectId;

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    projects = DriftProjectRepository(db);
    milestones = DriftMilestoneRepository(db);
    logs = DriftLogRepository(db);
    knowledge = DriftKnowledgeRepository(db);
    settings = DriftSettingsRepository(db);
    backup = BackupService(db, appVersion: '2.0.0');

    final project = await projects.create(
      const ProjectDraft(title: '备份项目', goal: '可恢复', description: '数据'),
    );
    projectId = project.id;
    final milestone = await milestones.create(
      MilestoneDraft(projectId: projectId, title: '第一里程碑'),
    );
    await milestones.toggle(milestone.id, true);
    await logs.create(
      LogDraft(
        projectId: projectId,
        logDate: dateKey(DateTime.now()),
        progressText: '完成导出',
        problemText: '无',
        planText: '验证导入',
      ),
    );
    await knowledge.create(
      KnowledgeDraft(
        title: '备份知识',
        content: '导入导出必须保留标签和项目关联',
        tagNames: ['backup', 'flutter'],
        projectIds: [projectId],
      ),
    );
    await settings.set('user_name', '备份用户');
  });

  tearDown(() async => db.close());

  test('exports all tables without API keys and imports atomically', () async {
    final raw = await backup.exportJson();
    final payload = jsonDecode(raw) as Map<String, dynamic>;
    expect(payload['format'], BackupService.format);
    expect(payload['version'], BackupService.version);
    expect(payload['appVersion'], '2.0.0');
    expect(raw, isNot(contains('api_key')));
    final tables = payload['tables'] as Map<String, dynamic>;
    expect(tables.keys, containsAll(BackupService.tableNames));
    expect((tables['projects'] as List), hasLength(1));
    expect((tables['knowledge_tag_links'] as List), hasLength(2));

    await projects.delete(projectId);
    expect(await projects.getById(projectId), isNull);

    final result = await backup.importJson(raw);
    expect(result.counts['projects'], 1);
    expect(result.counts['milestones'], 1);
    expect(result.counts['project_logs'], 1);
    expect(result.counts['knowledge_entries'], 1);
    expect((await settings.get('user_name')), '备份用户');

    final restored = await projects.getById(projectId);
    expect(restored!.title, '备份项目');
    expect(restored.progress, 100);
    expect(restored.status, ProjectStatus.completed);
    final restoredLogs = await logs.listByProject(projectId);
    expect(restoredLogs.single.progressText, '完成导出');
    final restoredKnowledge = await knowledge.list();
    expect(
      restoredKnowledge.single.tags.map((tag) => tag.name),
      containsAll(['backup', 'flutter']),
    );
    expect(restoredKnowledge.single.projectIds, contains(projectId));
  });

  test('rejects a backup with wrong format or newer version', () async {
    expect(
      () => backup.importJson('{"format":"other","version":1,"tables":{}}'),
      throwsA(isA<BackupFormatException>()),
    );
    expect(
      () => backup.importJson(
        '{"format":"diandian-backup","version":99,"tables":{}}',
      ),
      throwsA(isA<BackupFormatException>()),
    );
    expect(
      () => backup.importJson('not json'),
      throwsA(isA<BackupFormatException>()),
    );
  });
}
