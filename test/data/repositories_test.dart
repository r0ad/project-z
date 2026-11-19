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

  setUp(() {
    db = AppDatabase(NativeDatabase.memory());
    projects = DriftProjectRepository(db);
    milestones = DriftMilestoneRepository(db);
    logs = DriftLogRepository(db);
    knowledge = DriftKnowledgeRepository(db);
    settings = DriftSettingsRepository(db);
  });

  tearDown(() async => db.close());

  test('milestone progress drives project status', () async {
    final project = await projects.create(
      const ProjectDraft(title: '重写点点', goal: '三端可用'),
    );
    final a = await milestones.create(
      MilestoneDraft(projectId: project.id, title: '数据层'),
    );
    await milestones.create(MilestoneDraft(projectId: project.id, title: 'UI'));

    var current = await projects.getById(project.id);
    expect(current!.progress, 0);

    await milestones.toggle(a.id, true);
    current = await projects.getById(project.id);
    expect(current!.progress, 50);
    expect(current.status, ProjectStatus.active);

    final all = await milestones.listByProject(project.id);
    await milestones.toggle(all.last.id, true);
    current = await projects.getById(project.id);
    expect(current!.progress, 100);
    expect(current.status, ProjectStatus.completed);
    expect(current.completedAt, isNotNull);

    await milestones.toggle(all.last.id, false);
    current = await projects.getById(project.id);
    expect(current!.progress, 50);
    expect(current.status, ProjectStatus.active);
    expect(current.completedAt, isNull);
  });

  test('logs can be created and full-text searched', () async {
    final project = await projects.create(const ProjectDraft(title: '搜索测试'));
    await logs.create(
      LogDraft(
        projectId: project.id,
        logDate: dateKey(DateTime.now()),
        progressText: '完成了 Drift 数据库迁移',
        problemText: 'Windows 构建很慢',
        planText: '明天补测试',
      ),
    );
    final hits = await logs.search('Drift');
    expect(hits, hasLength(1));
    expect(hits.first.projectTitle, '搜索测试');
    final recent = await logs.recent(days: 7);
    expect(recent, hasLength(1));
  });

  test('knowledge keeps tags, project links and favorite', () async {
    final project = await projects.create(const ProjectDraft(title: '知识项目'));
    final entry = await knowledge.create(
      KnowledgeDraft(
        title: '流式解析',
        content: 'SSE 要处理半包',
        tagNames: ['Flutter', 'AI'],
        projectIds: [project.id],
      ),
    );
    expect(entry.tags.map((e) => e.name), containsAll(['Flutter', 'AI']));

    var list = await knowledge.list(tagId: entry.tags.first.id);
    expect(list.map((e) => e.id), contains(entry.id));

    await knowledge.toggleFavorite(entry.id);
    list = await knowledge.list(favoritesOnly: true);
    expect(list.map((e) => e.id), contains(entry.id));

    final found = await knowledge.list(query: 'SSE');
    expect(found.map((e) => e.id), contains(entry.id));

    await knowledge.delete(entry.id);
    expect(await knowledge.getById(entry.id), isNull);
    expect(await knowledge.allTags(), hasLength(2));
  });

  test('settings round trip', () async {
    await settings.setBool('onboarding_done', true);
    expect(await settings.getBool('onboarding_done'), isTrue);
    expect(await settings.get('missing'), isNull);
  });
}
