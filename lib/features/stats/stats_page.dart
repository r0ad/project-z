import 'package:fl_chart/fl_chart.dart';
import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/formatters.dart';
import '../../core/markdown.dart';
import '../../core/ui.dart';
import '../../data/ai/types.dart';
import '../../domain/models.dart';

class StatsPage extends StatefulWidget {
  const StatsPage({super.key});

  @override
  State<StatsPage> createState() => _StatsPageState();
}

class _StatsPageState extends State<StatsPage> {
  WeeklyStats? _stats;
  String? _error;
  AiInsight? _review;
  bool _loadingReview = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final stats = await AppScope.of(context).stats.weekly();
      if (mounted) setState(() => _stats = stats);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    }
  }

  Future<void> _generateReview() async {
    final deps = AppScope.of(context);
    final stats = _stats;
    if (stats == null || _loadingReview) return;
    setState(() {
      _loadingReview = true;
      _error = null;
    });
    try {
      final projects = await deps.projects.list();
      final logs = await deps.logs.recent(days: 7);
      final insight = await deps.ai.weeklyReview(
        stats: stats,
        projects: projects,
        logs: logs,
      );
      await deps.insights.save(insight);
      if (mounted) setState(() => _review = insight);
    } on AiException catch (e) {
      if (mounted) setState(() => _error = e.userMessage);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loadingReview = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 40),
          children: [
            PagePad(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => context.canPop()
                            ? context.pop()
                            : context.go('/projects'),
                        icon: const Icon(Icons.arrow_back),
                      ),
                      const SizedBox(width: 2),
                      const Text(
                        '统计与复盘',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  if (_stats == null && _error == null)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 60),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  else if (_stats == null)
                    EmptyState(
                      icon: Icons.error_outline,
                      title: '统计读取失败',
                      message: _error ?? '未知错误',
                      action: FilledButton(
                        onPressed: _load,
                        child: const Text('重试'),
                      ),
                    )
                  else
                    _StatsBody(stats: _stats!),
                  const SizedBox(height: 22),
                  Row(
                    children: [
                      const Expanded(
                        child: SectionTitle(
                          '本周复盘',
                          subtitle: 'AI 基于本周记录、项目与里程碑生成，不会编造数据',
                        ),
                      ),
                      FilledButton.tonalIcon(
                        onPressed: _loadingReview ? null : _generateReview,
                        icon: _loadingReview
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.auto_awesome, size: 17),
                        label: Text(_loadingReview ? '生成中…' : '生成复盘'),
                      ),
                    ],
                  ),
                  if (_error != null && _stats != null)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.danger,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  if (_review != null)
                    SurfaceCard(
                      highlight: true,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _review!.title,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 8),
                          AiMarkdown(_review!.content),
                        ],
                      ),
                    )
                  else
                    SurfaceCard(
                      child: Row(
                        children: [
                          Icon(
                            Icons.auto_awesome,
                            color: AppColors.seed.withValues(alpha: 0.9),
                            size: 20,
                          ),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              '点右侧「生成复盘」，把这一周的事实整理成：做成了什么、卡在哪里、下周建议。',
                              style: theme.textTheme.bodySmall?.copyWith(
                                color: AppColors.textMuted,
                                height: 1.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatsBody extends StatelessWidget {
  const _StatsBody({required this.stats});
  final WeeklyStats stats;

  @override
  Widget build(BuildContext context) {
    final maxY = stats.logCounts.fold<int>(4, (a, b) => b > a ? b : a) + 2.0;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        GridView.count(
          crossAxisCount: MediaQuery.sizeOf(context).width > 720 ? 4 : 2,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          crossAxisSpacing: 10,
          mainAxisSpacing: 10,
          childAspectRatio: 2.35,
          children: [
            StatTile(
              label: '本周记录',
              value: '${stats.totalLogs}',
              icon: Icons.edit_note,
              color: AppColors.seed,
            ),
            StatTile(
              label: '活跃项目',
              value: '${stats.activeProjects}',
              icon: Icons.folder_open,
              color: AppColors.success,
            ),
            StatTile(
              label: '完成里程碑',
              value: '${stats.completedMilestones}',
              icon: Icons.flag_outlined,
              color: AppColors.warning,
            ),
            StatTile(
              label: '知识条目',
              value: '${stats.totalKnowledge}',
              icon: Icons.menu_book_outlined,
              color: const Color(0xFFA78BFA),
            ),
          ],
        ),
        const SizedBox(height: 16),
        SurfaceCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                '每日记录 · ${stats.weekStart} 起',
                style: const TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                height: 170,
                child: BarChart(
                  BarChartData(
                    maxY: maxY,
                    alignment: BarChartAlignment.spaceAround,
                    borderData: FlBorderData(show: false),
                    gridData: const FlGridData(show: false),
                    barTouchData: BarTouchData(
                      touchTooltipData: BarTouchTooltipData(
                        getTooltipColor: (_) => AppColors.surfaceHigh,
                        getTooltipItem: (group, groupIndex, rod, rodIndex) =>
                            BarTooltipItem(
                              '${stats.logCounts[group.x.toInt()]} 条',
                              const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                              ),
                            ),
                      ),
                    ),
                    titlesData: FlTitlesData(
                      leftTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false),
                      ),
                      rightTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false),
                      ),
                      topTitles: const AxisTitles(
                        sideTitles: SideTitles(showTitles: false),
                      ),
                      bottomTitles: AxisTitles(
                        sideTitles: SideTitles(
                          showTitles: true,
                          reservedSize: 24,
                          getTitlesWidget: (value, meta) {
                            const labels = ['一', '二', '三', '四', '五', '六', '日'];
                            final index = value.toInt();
                            if (index < 0 || index >= labels.length) {
                              return const SizedBox.shrink();
                            }
                            return Padding(
                              padding: const EdgeInsets.only(top: 6),
                              child: Text(
                                labels[index],
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ),
                    barGroups: [
                      for (var i = 0; i < stats.logCounts.length; i++)
                        BarChartGroupData(
                          x: i,
                          barRods: [
                            BarChartRodData(
                              toY: stats.logCounts[i].toDouble(),
                              width: 18,
                              borderRadius: BorderRadius.circular(5),
                              color: stats.logCounts[i] == 0
                                  ? AppColors.outline
                                  : AppColors.seed,
                            ),
                          ],
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Text(
          '统计周期：${formatDate(stats.weekStart)} 起的一周',
          style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
        ),
      ],
    );
  }
}
