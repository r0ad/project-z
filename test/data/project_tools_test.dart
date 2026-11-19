import 'dart:convert';

import 'package:diandian/data/ai/project_tools.dart';
import 'package:diandian/data/ai/types.dart';
import 'package:diandian/data/local/app_database.dart';
import 'package:diandian/data/repositories/project_repositories.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late AppDatabase db;
  late DriftProjectRepository projects;
  late DriftMilestoneRepository milestones;
  late ProjectTools tools;

  setUp(() {
    db = AppDatabase(NativeDatabase.memory());
    projects = DriftProjectRepository(db);
    milestones = DriftMilestoneRepository(db);
    tools = ProjectTools(projects: projects, milestones: milestones);
  });

  tearDown(() async => db.close());

  AiToolCall call(String name, Map<String, dynamic> arguments) =>
      AiToolCall(id: 'call-1', name: name, arguments: jsonEncode(arguments));

  Map<String, dynamic> decode(String raw) =>
      jsonDecode(raw) as Map<String, dynamic>;

  test('exposes read and write definitions with confirmation semantics', () {
    expect(tools.definitions, hasLength(5));
    expect(tools.isWrite(ProjectTools.createProject), isTrue);
    expect(tools.isWrite(ProjectTools.deleteProject), isTrue);
    expect(tools.isWrite(ProjectTools.listProjects), isFalse);
    expect(tools.isWrite(ProjectTools.getProject), isFalse);
    expect(
      tools.summarize(call(ProjectTools.createProject, {'title': '新项目'})),
      '创建项目「新项目」',
    );
  });

  test('creates, reads, updates and deletes a project', () async {
    final created = decode(
      await tools.execute(
        call(ProjectTools.createProject, {
          'title': 'AI 新建项目',
          'description': '通过点点创建',
          'goal': '验证工具链路',
          'dueDate': '2026-12-31',
        }),
      ),
    );
    expect(created['ok'], isTrue);
    final id = (created['result'] as Map)['id'] as String;

    final listed = decode(
      await tools.execute(call(ProjectTools.listProjects, {})),
    );
    expect(listed['ok'], isTrue);
    final result = listed['result'] as Map;
    expect(result['count'], 1);
    expect((result['projects'] as List).single['title'], 'AI 新建项目');

    final detail = decode(
      await tools.execute(call(ProjectTools.getProject, {'projectId': id})),
    );
    expect(detail['ok'], isTrue);
    expect((detail['result'] as Map)['project']['goal'], '验证工具链路');

    final updated = decode(
      await tools.execute(
        call(ProjectTools.updateProject, {
          'projectId': id,
          'title': '改名后的项目',
          'goal': '新目标',
          'status': 'paused',
        }),
      ),
    );
    expect(updated['ok'], isTrue);
    final current = await projects.getById(id);
    expect(current!.title, '改名后的项目');
    expect(current.goal, '新目标');
    expect(current.status.dbValue, 'paused');

    final deleted = decode(
      await tools.execute(call(ProjectTools.deleteProject, {'projectId': id})),
    );
    expect(deleted['ok'], isTrue);
    expect(await projects.getById(id), isNull);
  });

  test('returns a friendly error instead of throwing', () async {
    final result = decode(
      await tools.execute(call(ProjectTools.getProject, {'projectId': 'nope'})),
    );
    expect(result['ok'], isFalse);
    expect(result['error'], contains('项目不存在'));
  });
}
