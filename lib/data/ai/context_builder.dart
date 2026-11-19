import '../../domain/models.dart';

/// 把领域对象压成 Prompt 友好的事实文本，避免把整段 JSON 丢给模型。
class ContextBuilder {
  const ContextBuilder();

  String project(ProjectDetail detail) {
    final p = detail.project;
    final buffer = StringBuffer()
      ..writeln('项目：${p.title}')
      ..writeln('状态：${p.status.label}，进度：${p.progress}%')
      ..writeln('目标：${p.goal.isEmpty ? '（未填写）' : p.goal}');
    if (p.description.isNotEmpty) buffer.writeln('描述：${p.description}');
    if (p.dueDate != null) buffer.writeln('截止：${p.dueDate}');
    if (detail.milestones.isEmpty) {
      buffer.writeln('里程碑：（暂无）');
    } else {
      buffer.writeln('里程碑：');
      for (final m in detail.milestones) {
        buffer.writeln(
          '- [${m.isCompleted ? 'x' : ' '}] ${m.title}'
          '${m.dueDate == null ? '' : '（${m.dueDate}）'}',
        );
      }
    }
    return buffer.toString();
  }

  String logs(List<ProjectLog> logs, {int limit = 12}) {
    if (logs.isEmpty) return '最近日志：（暂无）';
    final recent = logs.take(limit);
    final buffer = StringBuffer('最近日志：\n');
    for (final log in recent) {
      buffer.writeln('${log.logDate}：');
      if (log.progressText.isNotEmpty) {
        buffer.writeln('- 进展：${log.progressText}');
      }
      if (log.problemText.isNotEmpty) buffer.writeln('- 问题：${log.problemText}');
      if (log.planText.isNotEmpty) buffer.writeln('- 计划：${log.planText}');
    }
    return buffer.toString();
  }

  String knowledge(List<KnowledgeEntry> entries, {int limit = 8}) {
    if (entries.isEmpty) return '相关知识：（暂无）';
    final buffer = StringBuffer('相关知识：\n');
    for (final e in entries.take(limit)) {
      buffer.writeln('- ${e.title}：${_oneLine(e.content)}');
    }
    return buffer.toString();
  }

  /// 全局副驾用：不打开具体项目时，也能看到工作区里正在发生什么。
  String workspace({
    required List<Project> projects,
    required List<ProjectLog> logs,
    required List<KnowledgeEntry> knowledge,
  }) {
    final buffer = StringBuffer('工作区概览：\n');
    final active = projects
        .where((p) => p.status == ProjectStatus.active)
        .toList();
    if (active.isEmpty) {
      buffer.writeln('正在推进的项目：（暂无）');
    } else {
      buffer.writeln('正在推进的项目：');
      for (final p in active.take(6)) {
        buffer.writeln(
          '- ${p.title}（${p.progress}%${p.dueDate == null ? '' : '，截止 ${p.dueDate}'}）',
        );
      }
    }
    if (logs.isEmpty) {
      buffer.writeln('最近 14 天记录：（暂无）');
    } else {
      final titles = {for (final p in projects) p.id: p.title};
      buffer.writeln('最近 14 天记录：');
      for (final log in logs.take(8)) {
        final title = titles[log.projectId] ?? '未知项目';
        final text = log.progressText.isNotEmpty
            ? log.progressText
            : log.planText.isNotEmpty
            ? log.planText
            : log.problemText;
        buffer.writeln('- ${log.logDate} · $title：${_oneLine(text)}');
      }
    }
    if (knowledge.isNotEmpty) {
      buffer.writeln('最近沉淀的知识：');
      for (final e in knowledge.take(6)) {
        buffer.writeln('- ${e.title}');
      }
    }
    return buffer.toString();
  }

  String _oneLine(String text) {
    final line = text.replaceAll(RegExp(r'\s+'), ' ').trim();
    return line.length <= 120 ? line : '${line.substring(0, 120)}…';
  }
}
