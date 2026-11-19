import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/app_events.dart';
import '../../core/formatters.dart';
import '../../core/ui.dart';
import '../../domain/models.dart';
import 'home_cubit.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => HomeCubit(deps)..load(),
      child: const _HomeView(),
    );
  }
}

class _HomeView extends StatefulWidget {
  const _HomeView();

  @override
  State<_HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<_HomeView> {
  final _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    AppEvents.dataChanged.addListener(_reload);
  }

  void _reload() {
    if (mounted) context.read<HomeCubit>().load();
  }

  @override
  void dispose() {
    AppEvents.dataChanged.removeListener(_reload);
    _controller.dispose();
    super.dispose();
  }

  void _ask(String text) {
    final value = text.trim();
    if (value.isEmpty) return;
    _controller.clear();
    context.go('/chat?draft=${Uri.encodeComponent(value)}');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: BlocBuilder<HomeCubit, HomeState>(
          builder: (context, state) {
            if (state.loading) {
              return const Center(child: CircularProgressIndicator());
            }
            if (state.error != null) {
              return EmptyState(
                icon: Icons.error_outline,
                title: '加载失败',
                message: state.error,
                action: FilledButton(
                  onPressed: () => context.read<HomeCubit>().load(),
                  child: const Text('重试'),
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () => context.read<HomeCubit>().load(),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                children: [
                  PagePad(
                    child: LayoutBuilder(
                      builder: (context, constraints) {
                        final wide = constraints.maxWidth >= 860;
                        return Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            _Header(state: state),
                            const SizedBox(height: 22),
                            _AiBar(
                              controller: _controller,
                              onAsk: _ask,
                              configured: state.hasAi,
                            ),
                            const SizedBox(height: 24),
                            _Stats(state: state),
                            const SizedBox(height: 28),
                            if (wide)
                              Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    flex: 3,
                                    child: _Projects(state: state),
                                  ),
                                  const SizedBox(width: 20),
                                  Expanded(
                                    flex: 2,
                                    child: _Recent(state: state),
                                  ),
                                ],
                              )
                            else ...[
                              _Projects(state: state),
                              const SizedBox(height: 26),
                              _Recent(state: state),
                            ],
                            const SizedBox(height: 26),
                            _QuickActions(onAsk: _ask),
                          ],
                        );
                      },
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

class _Header extends StatelessWidget {
  const _Header({required this.state});
  final HomeState state;

  @override
  Widget build(BuildContext context) {
    final name = state.userName.isEmpty ? '朋友' : state.userName;
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: BoxDecoration(
            color: AppColors.seed.withValues(alpha: 0.12),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: AppColors.seed.withValues(alpha: 0.35)),
          ),
          child: const Icon(Icons.blur_on, color: AppColors.seed),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '${greetingFor(DateTime.now())}，$name',
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 3),
              Text(
                '${DateTime.now().month} 月 ${DateTime.now().day} 日 · 指日可待',
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 13,
                ),
              ),
            ],
          ),
        ),
        IconButton(
          tooltip: '设置',
          onPressed: () => context.go('/profile'),
          icon: const Icon(Icons.settings_outlined),
        ),
      ],
    );
  }
}

class _AiBar extends StatelessWidget {
  const _AiBar({
    required this.controller,
    required this.onAsk,
    required this.configured,
  });

  final TextEditingController controller;
  final ValueChanged<String> onAsk;
  final bool configured;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF0E2A33), Color(0xFF10161E)],
        ),
        border: Border.all(color: AppColors.seed.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Icon(Icons.auto_awesome, color: AppColors.seed, size: 19),
              const SizedBox(width: 8),
              const Text(
                '问点点',
                style: TextStyle(fontWeight: FontWeight.w700, fontSize: 15),
              ),
              const Spacer(),
              if (!configured)
                const Pill(
                  '未配置 AI',
                  color: AppColors.warning,
                  icon: Icons.warning_amber,
                ),
            ],
          ),
          const SizedBox(height: 8),
          const Text(
            '「这周该先推进什么？」「帮我把这个想法拆成计划」',
            style: TextStyle(color: AppColors.textMuted, fontSize: 12.5),
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  textInputAction: TextInputAction.send,
                  onSubmitted: onAsk,
                  decoration: const InputDecoration(
                    hintText: '说说你现在想推进的事…',
                    isDense: true,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              IconButton.filled(
                onPressed: () => onAsk(controller.text),
                icon: const Icon(Icons.arrow_upward, size: 20),
                style: IconButton.styleFrom(
                  backgroundColor: AppColors.seed,
                  foregroundColor: Colors.black,
                  minimumSize: const Size(48, 48),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _Stats extends StatelessWidget {
  const _Stats({required this.state});
  final HomeState state;

  @override
  Widget build(BuildContext context) {
    final stats = state.stats;
    final tiles = [
      StatTile(
        label: '本周记录',
        value: '${stats?.totalLogs ?? 0}',
        icon: Icons.edit_note,
      ),
      StatTile(
        label: '活跃项目',
        value: '${state.activeProjects.length}',
        icon: Icons.rocket_launch_outlined,
        color: AppColors.success,
      ),
      StatTile(
        label: '完成里程碑',
        value: '${stats?.completedMilestones ?? 0}',
        icon: Icons.flag_outlined,
        color: AppColors.warning,
      ),
      StatTile(
        label: '知识沉淀',
        value: '${state.knowledgeCount}',
        icon: Icons.lightbulb_outline,
        color: const Color(0xFFA78BFA),
      ),
    ];
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 760 ? 4 : 2;
        final width = (constraints.maxWidth - (columns - 1) * 12) / columns;
        return Wrap(
          spacing: 12,
          runSpacing: 12,
          children: [
            for (final tile in tiles) SizedBox(width: width, child: tile),
          ],
        );
      },
    );
  }
}

class _Projects extends StatelessWidget {
  const _Projects({required this.state});
  final HomeState state;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SectionTitle(
          '正在推进',
          subtitle: '${state.activeProjects.length} 个进行中的项目',
          action: TextButton(
            onPressed: () => context.go('/projects'),
            child: const Text('全部'),
          ),
        ),
        if (state.activeProjects.isEmpty)
          EmptyState(
            icon: Icons.flag_outlined,
            title: '还没有进行中的项目',
            message: '从一个想实现的目标开始，点点会帮你拆成里程碑。',
            action: FilledButton.icon(
              onPressed: () => context.go('/projects/new'),
              icon: const Icon(Icons.add),
              label: const Text('新建项目'),
            ),
          )
        else
          ...state.activeProjects
              .take(4)
              .map(
                (p) => Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: _ProjectRow(project: p),
                ),
              ),
      ],
    );
  }
}

class _ProjectRow extends StatelessWidget {
  const _ProjectRow({required this.project});
  final Project project;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      onTap: () => context.go('/projects/${project.id}'),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  project.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 15,
                  ),
                ),
              ),
              Text(
                '${project.progress}%',
                style: const TextStyle(
                  color: AppColors.seed,
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(999),
            child: LinearProgressIndicator(
              value: project.progress / 100,
              minHeight: 5,
              backgroundColor: AppColors.outline,
              color: AppColors.seed,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            project.goal.isEmpty ? '还没有写下目标' : project.goal,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
        ],
      ),
    );
  }
}

class _Recent extends StatelessWidget {
  const _Recent({required this.state});
  final HomeState state;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('最近记录', subtitle: '近两周的执行痕迹'),
        if (state.recentLogs.isEmpty)
          const SurfaceCard(
            child: Text(
              '还没有日志。记录一次进展，AI 才能帮你复盘。',
              style: TextStyle(color: AppColors.textMuted, height: 1.5),
            ),
          )
        else
          ...state.recentLogs.take(5).map((log) {
            final project = state.activeProjects
                .where((p) => p.id == log.projectId)
                .firstOrNull;
            return Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: SurfaceCard(
                padding: const EdgeInsets.all(14),
                onTap: () => context.go('/projects/${log.projectId}'),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          log.logDate,
                          style: const TextStyle(
                            fontSize: 11,
                            color: AppColors.textMuted,
                          ),
                        ),
                        const SizedBox(width: 8),
                        if (project != null)
                          Expanded(
                            child: Text(
                              project.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                fontSize: 11,
                                color: AppColors.seed,
                              ),
                            ),
                          ),
                      ],
                    ),
                    const SizedBox(height: 6),
                    Text(
                      log.progressText.isEmpty
                          ? log.planText
                          : log.progressText,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 13, height: 1.4),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.onAsk});
  final ValueChanged<String> onAsk;

  @override
  Widget build(BuildContext context) {
    final actions = [
      (Icons.add_task, '新建项目', () => context.go('/projects/new')),
      (Icons.edit_note, '记录进展', () => context.go('/projects')),
      (Icons.lightbulb_outline, '沉淀知识', () => context.push('/knowledge/new')),
      (Icons.chat_bubble_outline, '问问点点', () => context.go('/chat')),
    ];
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SectionTitle('快速开始'),
        Wrap(
          spacing: 10,
          runSpacing: 10,
          children: [
            for (final (icon, label, onTap) in actions)
              OutlinedButton.icon(
                onPressed: onTap,
                icon: Icon(icon, size: 18),
                label: Text(label),
              ),
          ],
        ),
      ],
    );
  }
}
