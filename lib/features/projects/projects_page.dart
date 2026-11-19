import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/formatters.dart';
import '../../core/ui.dart';
import '../../domain/models.dart';
import 'projects_cubit.dart';

class ProjectsPage extends StatelessWidget {
  const ProjectsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => ProjectsCubit(deps)..load(),
      child: const _ProjectsView(),
    );
  }
}

class _ProjectsView extends StatelessWidget {
  const _ProjectsView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: BlocBuilder<ProjectsCubit, ProjectsState>(
        buildWhen: (previous, current) =>
            previous.projects.isEmpty != current.projects.isEmpty,
        builder: (context, state) {
          if (state.projects.isEmpty) return const SizedBox.shrink();
          return FloatingActionButton.extended(
            onPressed: () => context.go('/projects/new'),
            backgroundColor: AppColors.seed,
            foregroundColor: Colors.black,
            icon: const Icon(Icons.add),
            label: const Text('新建项目'),
          );
        },
      ),
      body: SafeArea(
        child: BlocBuilder<ProjectsCubit, ProjectsState>(
          builder: (context, state) {
            return RefreshIndicator(
              onRefresh: () => context.read<ProjectsCubit>().load(),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 96),
                children: [
                  PagePad(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    '项目',
                                    style: TextStyle(
                                      fontSize: 26,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    '目标、里程碑与执行记录都在这里',
                                    style: TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 13,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => context.go('/stats'),
                              icon: const Icon(
                                Icons.insights_outlined,
                                size: 18,
                              ),
                              label: const Text('统计'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),
                        _Toolbar(state: state),
                        if (state.error != null)
                          Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: Text(
                              state.error!,
                              style: const TextStyle(color: AppColors.danger),
                            ),
                          ),
                        const SizedBox(height: 16),
                        if (state.loading)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 80),
                            child: Center(child: CircularProgressIndicator()),
                          )
                        else if (state.projects.isEmpty)
                          EmptyState(
                            icon: Icons.flag_outlined,
                            title: state.query.isEmpty && state.status == null
                                ? '还没有项目'
                                : '没有匹配的项目',
                            message: state.query.isEmpty && state.status == null
                                ? '从一个具体目标开始，点点帮你拆成可执行的里程碑。'
                                : '换个关键词或状态试试。',
                            action: state.query.isEmpty && state.status == null
                                ? FilledButton.icon(
                                    onPressed: () =>
                                        context.go('/projects/new'),
                                    icon: const Icon(Icons.add),
                                    label: const Text('创建第一个项目'),
                                  )
                                : null,
                          )
                        else
                          _ProjectGrid(projects: state.projects),
                      ],
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}

class _Toolbar extends StatelessWidget {
  const _Toolbar({required this.state});
  final ProjectsState state;

  @override
  Widget build(BuildContext context) {
    final filters = <ProjectStatus?>[null, ...ProjectStatus.values];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          onChanged: context.read<ProjectsCubit>().search,
          decoration: const InputDecoration(
            hintText: '搜索项目名称或目标',
            prefixIcon: Icon(Icons.search),
          ),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final status in filters)
              ChoiceChip(
                label: Text(status?.label ?? '全部'),
                selected: state.status == status,
                onSelected: (_) =>
                    context.read<ProjectsCubit>().setStatus(status),
                showCheckmark: false,
              ),
          ],
        ),
      ],
    );
  }
}

class _ProjectGrid extends StatelessWidget {
  const _ProjectGrid({required this.projects});
  final List<Project> projects;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 960
            ? 3
            : constraints.maxWidth >= 620
            ? 2
            : 1;
        final width = (constraints.maxWidth - (columns - 1) * 14) / columns;
        return Wrap(
          spacing: 14,
          runSpacing: 14,
          children: [
            for (final project in projects)
              SizedBox(
                width: width,
                child: _ProjectCard(project: project),
              ),
          ],
        );
      },
    );
  }
}

class _ProjectCard extends StatelessWidget {
  const _ProjectCard({required this.project});
  final Project project;

  Color get _statusColor => switch (project.status) {
    ProjectStatus.active => AppColors.seed,
    ProjectStatus.completed => AppColors.success,
    ProjectStatus.paused => AppColors.warning,
    ProjectStatus.cancelled => AppColors.danger,
  };

  Future<void> _confirmDelete(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除项目？'),
        content: const Text('项目、里程碑、日志和 AI 分析会被删除；已沉淀的知识会保留。'),
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
      await context.read<ProjectsCubit>().delete(project.id);
      if (context.mounted) showSnack(context, '项目已删除');
    }
  }

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      onTap: () => context.go('/projects/${project.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Pill(project.status.label, color: _statusColor),
              const Spacer(),
              PopupMenuButton<String>(
                tooltip: '更多',
                onSelected: (value) {
                  if (value == 'delete') _confirmDelete(context);
                },
                itemBuilder: (_) => const [
                  PopupMenuItem(value: 'delete', child: Text('删除项目')),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            project.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            project.goal.isEmpty ? '还没有写下目标' : project.goal,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 13,
              height: 1.45,
            ),
          ),
          const SizedBox(height: 18),
          Row(
            children: [
              Expanded(
                child: ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    value: project.progress / 100,
                    minHeight: 6,
                    backgroundColor: AppColors.outline,
                    color: _statusColor,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Text(
                '${project.progress}%',
                style: TextStyle(
                  color: _statusColor,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '更新于 ${relativeTime(project.updatedAt)}',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
        ],
      ),
    );
  }
}
