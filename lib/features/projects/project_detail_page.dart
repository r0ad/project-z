import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/formatters.dart';
import '../../core/markdown.dart';
import '../../core/ui.dart';
import '../../domain/models.dart';
import 'project_detail_cubit.dart';

class ProjectDetailPage extends StatelessWidget {
  const ProjectDetailPage({super.key, required this.projectId});

  final String projectId;

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => ProjectDetailCubit(deps, projectId)..load(),
      child: const _ProjectDetailView(),
    );
  }
}

class _ProjectDetailView extends StatelessWidget {
  const _ProjectDetailView();

  Future<void> _addMilestone(BuildContext context) async {
    final title = TextEditingController();
    final description = TextEditingController();
    final result = await showDialog<(String, String)>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('添加里程碑'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: title,
              autofocus: true,
              decoration: const InputDecoration(labelText: '里程碑名称'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: description,
              minLines: 2,
              maxLines: 4,
              decoration: const InputDecoration(labelText: '完成标准（可选）'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, (
              title.text.trim(),
              description.text.trim(),
            )),
            child: const Text('添加'),
          ),
        ],
      ),
    );
    title.dispose();
    description.dispose();
    if (result != null && result.$1.isNotEmpty && context.mounted) {
      await context.read<ProjectDetailCubit>().addMilestone(
        title: result.$1,
        description: result.$2,
      );
    }
  }

  Future<void> _confirmDelete(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除项目？'),
        content: const Text('项目、里程碑、日志和分析会删除；已沉淀的知识会保留。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            style: FilledButton.styleFrom(backgroundColor: AppColors.danger),
            child: const Text('删除'),
          ),
        ],
      ),
    );
    if (ok == true && context.mounted) {
      await context.read<ProjectDetailCubit>().deleteProject();
      if (context.mounted) context.go('/projects');
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ProjectDetailCubit, ProjectDetailState>(
      listener: (context, state) {
        if (state.error != null) showSnack(context, state.error!, error: true);
      },
      builder: (context, state) {
        final detail = state.detail;
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              onPressed: () =>
                  context.canPop() ? context.pop() : context.go('/projects'),
              icon: const Icon(Icons.arrow_back),
            ),
            title: Text(detail?.project.title ?? '项目'),
            actions: [
              if (detail != null)
                PopupMenuButton<String>(
                  onSelected: (value) async {
                    final cubit = context.read<ProjectDetailCubit>();
                    if (value == 'delete') {
                      await _confirmDelete(context);
                      return;
                    }
                    final status = ProjectStatus.values.firstWhere(
                      (e) => e.dbValue == value,
                    );
                    await cubit.setStatus(status);
                  },
                  itemBuilder: (_) => [
                    for (final status in ProjectStatus.values)
                      PopupMenuItem(
                        value: status.dbValue,
                        child: Text('标记为${status.label}'),
                      ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(value: 'delete', child: Text('删除项目')),
                  ],
                ),
            ],
          ),
          body: state.loading
              ? const Center(child: CircularProgressIndicator())
              : detail == null
              ? EmptyState(
                  icon: Icons.folder_off_outlined,
                  title: '找不到项目',
                  message: state.error ?? '项目可能已被删除',
                  action: FilledButton(
                    onPressed: () => context.go('/projects'),
                    child: const Text('返回项目列表'),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => context.read<ProjectDetailCubit>().load(),
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                    children: [
                      PagePad(
                        maxWidth: 900,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Header(detail: detail),
                            const SizedBox(height: 22),
                            SectionTitle(
                              '里程碑',
                              subtitle:
                                  '${detail.completedMilestones}/${detail.milestones.length} 已完成',
                              action: TextButton.icon(
                                onPressed: () => _addMilestone(context),
                                icon: const Icon(Icons.add, size: 18),
                                label: const Text('添加'),
                              ),
                            ),
                            if (detail.milestones.isEmpty)
                              const SurfaceCard(
                                child: Text(
                                  '还没有里程碑。让 AI 重新拆解，或手动添加第一个。',
                                  style: TextStyle(color: AppColors.textMuted),
                                ),
                              )
                            else
                              for (final milestone in detail.milestones)
                                _MilestoneTile(
                                  milestone: milestone,
                                  onToggle: () => context
                                      .read<ProjectDetailCubit>()
                                      .toggleMilestone(milestone),
                                  onDelete: () => context
                                      .read<ProjectDetailCubit>()
                                      .removeMilestone(milestone.id),
                                ),
                            const SizedBox(height: 22),
                            SectionTitle(
                              '执行记录',
                              subtitle: '${detail.logs.length} 条',
                              action: FilledButton.icon(
                                onPressed: () => context.go(
                                  '/projects/${detail.project.id}/logs/new',
                                ),
                                icon: const Icon(Icons.edit_note, size: 18),
                                label: const Text('记录今天'),
                              ),
                            ),
                            if (detail.logs.isEmpty)
                              const SurfaceCard(
                                child: Text(
                                  '今天推进了什么？记一句，AI 会帮你整理成进展、问题和下一步。',
                                  style: TextStyle(color: AppColors.textMuted),
                                ),
                              )
                            else
                              for (final log in detail.logs.take(8))
                                _LogTile(
                                  log: log,
                                  projectId: detail.project.id,
                                ),
                            const SizedBox(height: 22),
                            SectionTitle(
                              'AI 分析',
                              subtitle: '基于里程碑与最近日志',
                              action: FilledButton.tonalIcon(
                                onPressed: state.analyzing
                                    ? null
                                    : () async {
                                        final insight = await context
                                            .read<ProjectDetailCubit>()
                                            .analyze();
                                        if (insight != null &&
                                            context.mounted) {
                                          showSnack(context, '分析已生成');
                                        }
                                      },
                                icon: state.analyzing
                                    ? const SizedBox(
                                        width: 14,
                                        height: 14,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      )
                                    : const Icon(Icons.auto_awesome, size: 18),
                                label: Text(state.analyzing ? '分析中…' : '生成分析'),
                              ),
                            ),
                            if (detail.insights.isEmpty)
                              const SurfaceCard(
                                child: Text(
                                  '还没有分析。当你记录了几条日志后，让 AI 帮你看清进展、风险和下一步。',
                                  style: TextStyle(color: AppColors.textMuted),
                                ),
                              )
                            else
                              for (final insight in detail.insights.take(3))
                                Padding(
                                  padding: const EdgeInsets.only(bottom: 12),
                                  child: SurfaceCard(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            Pill(
                                              insight.kind.label,
                                              color: AppColors.seed,
                                            ),
                                            const Spacer(),
                                            Text(
                                              relativeTime(insight.createdAt),
                                              style: const TextStyle(
                                                color: AppColors.textMuted,
                                                fontSize: 11,
                                              ),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                        AiMarkdown(insight.content),
                                        Align(
                                          alignment: Alignment.centerRight,
                                          child: TextButton.icon(
                                            onPressed: () async {
                                              final saved = await context
                                                  .read<ProjectDetailCubit>()
                                                  .saveInsightAsKnowledge(
                                                    insight,
                                                  );
                                              if (saved && context.mounted) {
                                                showSnack(context, '已沉淀到知识库');
                                              }
                                            },
                                            icon: const Icon(
                                              Icons.bookmark_add_outlined,
                                              size: 18,
                                            ),
                                            label: const Text('沉淀为知识'),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
        );
      },
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.detail});
  final ProjectDetail detail;

  @override
  Widget build(BuildContext context) {
    final project = detail.project;
    return SurfaceCard(
      highlight: true,
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Pill(project.status.label, color: AppColors.seed),
              const SizedBox(width: 8),
              if (project.dueDate != null)
                Text(
                  '截止 ${formatFullDate(project.dueDate)}',
                  style: const TextStyle(
                    color: AppColors.textMuted,
                    fontSize: 11,
                  ),
                ),
              const Spacer(),
              Text(
                '${project.progress}%',
                style: const TextStyle(
                  color: AppColors.seed,
                  fontSize: 24,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            project.goal.isEmpty ? '还没有写下目标' : project.goal,
            style: const TextStyle(fontSize: 15, height: 1.55),
          ),
          if (project.description.isNotEmpty) ...[
            const SizedBox(height: 10),
            Text(
              project.description,
              style: const TextStyle(
                color: AppColors.textMuted,
                fontSize: 12,
                height: 1.5,
              ),
            ),
          ],
          const SizedBox(height: 16),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: project.progress / 100,
              minHeight: 7,
              backgroundColor: AppColors.outline,
              color: AppColors.seed,
            ),
          ),
        ],
      ),
    );
  }
}

class _MilestoneTile extends StatelessWidget {
  const _MilestoneTile({
    required this.milestone,
    required this.onToggle,
    required this.onDelete,
  });

  final Milestone milestone;
  final VoidCallback onToggle;
  final VoidCallback onDelete;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SurfaceCard(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
        child: Row(
          children: [
            Checkbox(
              value: milestone.isCompleted,
              onChanged: (_) => onToggle(),
              activeColor: AppColors.seed,
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    milestone.title,
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      decoration: milestone.isCompleted
                          ? TextDecoration.lineThrough
                          : null,
                      color: milestone.isCompleted
                          ? AppColors.textMuted
                          : Colors.white,
                    ),
                  ),
                  if (milestone.description.isNotEmpty)
                    Text(
                      milestone.description,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: AppColors.textMuted,
                        fontSize: 11,
                      ),
                    ),
                  if (milestone.dueDate != null)
                    Text(
                      milestone.dueDate!,
                      style: const TextStyle(
                        color: AppColors.seed,
                        fontSize: 11,
                      ),
                    ),
                ],
              ),
            ),
            IconButton(
              tooltip: '删除里程碑',
              onPressed: onDelete,
              icon: const Icon(Icons.close, size: 18),
            ),
          ],
        ),
      ),
    );
  }
}

class _LogTile extends StatelessWidget {
  const _LogTile({required this.log, required this.projectId});
  final ProjectLog log;
  final String projectId;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SurfaceCard(
        onTap: () => context.go('/projects/$projectId/logs/${log.id}'),
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(
                  formatFullDate(log.logDate),
                  style: const TextStyle(
                    color: AppColors.seed,
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const Spacer(),
                const Icon(
                  Icons.chevron_right,
                  size: 16,
                  color: AppColors.textMuted,
                ),
              ],
            ),
            const SizedBox(height: 6),
            Text(
              log.progressText.isEmpty ? '（无进展记录）' : log.progressText,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(fontSize: 13, height: 1.45),
            ),
            if (log.problemText.isNotEmpty) ...[
              const SizedBox(height: 4),
              Text(
                '问题：${log.problemText}',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(color: AppColors.warning, fontSize: 11),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
