import 'package:flutter_test/flutter_test.dart';

import 'package:diandian/data/ai/context_builder.dart';
import 'package:diandian/domain/models.dart';

void main() {
  const builder = ContextBuilder();
  final now = DateTime(2026, 11, 19).millisecondsSinceEpoch;

  Project project({
    String id = 'p1',
    String title = '上线点点',
    ProjectStatus status = ProjectStatus.active,
    int progress = 40,
    String? dueDate,
  }) {
    return Project(
      id: id,
      title: title,
      status: status,
      progress: progress,
      dueDate: dueDate,
      createdAt: now,
      updatedAt: now,
    );
  }

  test('workspace 汇总活跃项目、最近记录与知识', () {
    final text = builder.workspace(
      projects: [
        project(dueDate: '2026-12-01'),
        project(
          id: 'p2',
          title: '旧项目',
          status: ProjectStatus.completed,
          progress: 100,
        ),
      ],
      logs: [
        ProjectLog(
          id: 'l1',
          projectId: 'p1',
          logDate: '2026-11-19',
          progressText: '完成登录页',
          createdAt: now,
          updatedAt: now,
        ),
      ],
      knowledge: [
        KnowledgeEntry(
          id: 'k1',
          title: 'Flutter 构建坑',
          content: 'ATL 头文件需要手动探测。',
          createdAt: now,
          updatedAt: now,
        ),
      ],
    );

    expect(text, contains('正在推进的项目'));
    expect(text, contains('上线点点（40%，截止 2026-12-01）'));
    expect(text, isNot(contains('旧项目')));
    expect(text, contains('2026-11-19 · 上线点点：完成登录页'));
    expect(text, contains('Flutter 构建坑'));
  });

  test('workspace 空数据给出明确占位', () {
    final text = builder.workspace(
      projects: const [],
      logs: const [],
      knowledge: const [],
    );
    expect(text, contains('（暂无）'));
    expect(text, contains('最近 14 天记录：（暂无）'));
  });
}
