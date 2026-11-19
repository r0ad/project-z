import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/formatters.dart';
import '../../core/markdown.dart';
import '../../core/ui.dart';
import 'knowledge_detail_cubit.dart';

class KnowledgeDetailPage extends StatelessWidget {
  const KnowledgeDetailPage({super.key, required this.id});

  final String id;

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => KnowledgeDetailCubit(deps, id)..load(),
      child: const _KnowledgeDetailView(),
    );
  }
}

class _KnowledgeDetailView extends StatelessWidget {
  const _KnowledgeDetailView();

  Future<void> _delete(BuildContext context) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('删除这条知识？'),
        content: const Text('删除后无法恢复。'),
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
      await context.read<KnowledgeDetailCubit>().delete();
      if (context.mounted) context.go('/knowledge');
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<KnowledgeDetailCubit, KnowledgeDetailState>(
      listener: (context, state) {
        if (state.error != null) showSnack(context, state.error!, error: true);
      },
      builder: (context, state) {
        final entry = state.entry;
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              onPressed: () =>
                  context.canPop() ? context.pop() : context.go('/knowledge'),
              icon: const Icon(Icons.arrow_back),
            ),
            title: const Text('知识'),
            actions: [
              if (entry != null) ...[
                IconButton(
                  tooltip: entry.isFavorite ? '取消收藏' : '收藏',
                  onPressed: () =>
                      context.read<KnowledgeDetailCubit>().toggleFavorite(),
                  icon: Icon(
                    entry.isFavorite ? Icons.star : Icons.star_border,
                    color: entry.isFavorite ? AppColors.warning : null,
                  ),
                ),
                IconButton(
                  tooltip: '编辑',
                  onPressed: () => context.push('/knowledge/${entry.id}/edit'),
                  icon: const Icon(Icons.edit_outlined),
                ),
                PopupMenuButton<String>(
                  onSelected: (value) {
                    if (value == 'delete') _delete(context);
                  },
                  itemBuilder: (_) => const [
                    PopupMenuItem(value: 'delete', child: Text('删除')),
                  ],
                ),
              ],
            ],
          ),
          body: state.loading
              ? const Center(child: CircularProgressIndicator())
              : entry == null
              ? EmptyState(
                  icon: Icons.menu_book_outlined,
                  title: '找不到这条知识',
                  message: state.error ?? '可能已被删除',
                  action: FilledButton(
                    onPressed: () => context.go('/knowledge'),
                    child: const Text('返回知识库'),
                  ),
                )
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  children: [
                    PagePad(
                      maxWidth: 780,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            entry.title,
                            style: const TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w800,
                              height: 1.3,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Text(
                                '更新于 ${relativeTime(entry.updatedAt)} · 看过 ${entry.viewCount} 次',
                                style: const TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          if (entry.tags.isNotEmpty) ...[
                            const SizedBox(height: 14),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final tag in entry.tags)
                                  Pill(tag.name, color: AppColors.seed),
                              ],
                            ),
                          ],
                          const SizedBox(height: 20),
                          SurfaceCard(
                            padding: const EdgeInsets.all(20),
                            child: AiMarkdown(entry.content),
                          ),
                          if (state.related.isNotEmpty) ...[
                            const SizedBox(height: 24),
                            const SectionTitle(
                              '相关',
                              subtitle: '通过标签 / 项目关联到这些知识',
                            ),
                            for (final related in state.related)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 10),
                                child: SurfaceCard(
                                  onTap: () =>
                                      context.go('/knowledge/${related.id}'),
                                  padding: const EdgeInsets.all(14),
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              related.title,
                                              maxLines: 1,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              related.content,
                                              maxLines: 2,
                                              overflow: TextOverflow.ellipsis,
                                              style: const TextStyle(
                                                color: AppColors.textMuted,
                                                fontSize: 12,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      const Icon(
                                        Icons.chevron_right,
                                        color: AppColors.textMuted,
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                          ],
                        ],
                      ),
                    ),
                  ],
                ),
        );
      },
    );
  }
}
