import 'dart:convert';

import 'package:diandian/data/ai/project_tools.dart';
import 'package:diandian/data/ai/types.dart';
import 'package:diandian/data/local/app_database.dart';
import 'package:diandian/data/repositories/content_repositories.dart';
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
    tools = ProjectTools(
      projects: projects,
      milestones: milestones,
      logs: DriftLogRepository(db),
      insights: DriftInsightRepository(db),
      knowledge: DriftKnowledgeRepository(db),
    );
  });

  tearDown(() async => db.close());

  AiToolCall call(String name, Map<String, dynamic> arguments) =>
      AiToolCall(id: 'call-1', name: name, arguments: jsonEncode(arguments));

  Map<String, dynamic> decode(String raw) =>
      jsonDecode(raw) as Map<String, dynamic>;

  test(
    'exposes read and write definitions with confirmation semantics',
    () async {
      expect(tools.definitions, hasLength(23));
      expect(tools.isWrite(ProjectTools.createProject), isTrue);
      expect(tools.isWrite(ProjectTools.createMilestone), isTrue);
      expect(tools.isWrite(ProjectTools.createLog), isTrue);
      expect(tools.isWrite(ProjectTools.createKnowledge), isTrue);
      expect(tools.isWrite(ProjectTools.deleteProject), isTrue);
      expect(tools.isWrite(ProjectTools.listProjects), isFalse);
      expect(tools.isWrite(ProjectTools.getProject), isFalse);
      expect(tools.isWrite(ProjectTools.listKnowledge), isFalse);
      expect(
        await tools.summarize(
          call(ProjectTools.createProject, {'title': '新项目'}),
        ),
        '创建项目「新项目」',
      );
    },
  );

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

  test(
    'manages milestones, logs and knowledge with readable summaries',
    () async {
      final created = decode(
        await tools.execute(
          call(ProjectTools.createProject, {'title': '全量工具项目'}),
        ),
      );
      final projectId = (created['result'] as Map)['id'] as String;

      final milestoneRaw = decode(
        await tools.execute(
          call(ProjectTools.createMilestone, {
            'projectId': projectId,
            'title': '第一个里程碑',
            'dueDate': '2026-12-31',
          }),
        ),
      );
      final milestoneId = (milestoneRaw['result'] as Map)['id'] as String;
      expect(
        await tools.summarize(
          call(ProjectTools.createMilestone, {
            'projectId': projectId,
            'title': '第一个里程碑',
          }),
        ),
        '在项目「全量工具项目」下创建里程碑「第一个里程碑」',
      );
      expect(
        await tools.summarize(
          call(ProjectTools.setMilestoneCompleted, {
            'milestoneId': milestoneId,
            'completed': true,
          }),
        ),
        '将项目「全量工具项目」的里程碑「第一个里程碑」标记为完成',
      );

      final logRaw = decode(
        await tools.execute(
          call(ProjectTools.createLog, {
            'projectId': projectId,
            'progress': '完成里程碑',
            'milestoneId': milestoneId,
            'logDate': '2026-11-19',
          }),
        ),
      );
      final logId = (logRaw['result'] as Map)['id'] as String;
      expect(
        await tools.summarize(
          call(ProjectTools.updateLog, {'logId': logId, 'problem': '新问题'}),
        ),
        '修改执行记录「全量工具项目 · 2026-11-19」',
      );

      final knowledgeRaw = decode(
        await tools.execute(
          call(ProjectTools.createKnowledge, {
            'title': '工具知识',
            'content': '通过 AI 创建',
            'tags': ['ai', '测试'],
            'projectIds': [projectId],
          }),
        ),
      );
      final knowledgeId = (knowledgeRaw['result'] as Map)['id'] as String;

      final listed = decode(
        await tools.execute(
          call(ProjectTools.listKnowledge, {'query': '工具知识'}),
        ),
      );
      expect((listed['result'] as Map)['count'], 1);
      expect(
        ((listed['result'] as Map)['entries'] as List).single['tags'],
        containsAll(['ai', '测试']),
      );

      final favorite = decode(
        await tools.execute(
          call(ProjectTools.toggleKnowledgeFavorite, {
            'knowledgeId': knowledgeId,
          }),
        ),
      );
      expect((favorite['result'] as Map)['favorite'], isTrue);

      final updated = decode(
        await tools.execute(
          call(ProjectTools.updateKnowledge, {
            'knowledgeId': knowledgeId,
            'title': '改名后的工具知识',
            'tags': ['ai'],
          }),
        ),
      );
      expect((updated['result'] as Map)['title'], '改名后的工具知识');
      expect(
        await tools.summarize(
          call(ProjectTools.updateKnowledge, {'knowledgeId': knowledgeId}),
        ),
        '修改知识「改名后的工具知识」',
      );

      final overview = decode(
        await tools.execute(call(ProjectTools.workspaceOverview, {})),
      );
      expect((overview['result'] as Map)['knowledgeCount'], 1);

      expect(
        decode(
          await tools.execute(
            call(ProjectTools.deleteKnowledge, {'knowledgeId': knowledgeId}),
          ),
        )['ok'],
        isTrue,
      );
      expect(
        decode(
          await tools.execute(call(ProjectTools.deleteLog, {'logId': logId})),
        )['ok'],
        isTrue,
      );
      expect(
        decode(
          await tools.execute(
            call(ProjectTools.deleteMilestone, {'milestoneId': milestoneId}),
          ),
        )['ok'],
        isTrue,
      );
    },
  );

  test('returns a friendly error instead of throwing', () async {
    final result = decode(
      await tools.execute(call(ProjectTools.getProject, {'projectId': 'nope'})),
    );
    expect(result['ok'], isFalse);
    expect(result['error'], contains('项目不存在'));
  });
}
