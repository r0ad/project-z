import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/formatters.dart';
import '../../core/ui.dart';
import '../../domain/models.dart';
import 'knowledge_cubit.dart';

class KnowledgePage extends StatelessWidget {
  const KnowledgePage({super.key});

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => KnowledgeCubit(deps)..load(),
      child: const _KnowledgeView(),
    );
  }
}

String _sourceLabel(KnowledgeSource source) => switch (source) {
  KnowledgeSource.manual => '手动',
  KnowledgeSource.log => '来自记录',
  KnowledgeSource.insight => '来自分析',
  KnowledgeSource.chat => '来自对话',
};

class _KnowledgeView extends StatelessWidget {
  const _KnowledgeView();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      floatingActionButton: BlocBuilder<KnowledgeCubit, KnowledgeState>(
        buildWhen: (previous, current) =>
            previous.entries.isEmpty != current.entries.isEmpty,
        builder: (context, state) {
          if (state.entries.isEmpty) return const SizedBox.shrink();
          return FloatingActionButton.extended(
            onPressed: () => context.push('/knowledge/new'),
            backgroundColor: AppColors.seed,
            foregroundColor: Colors.black,
            icon: const Icon(Icons.add),
            label: const Text('沉淀一条'),
          );
        },
      ),
      body: SafeArea(
        child: BlocBuilder<KnowledgeCubit, KnowledgeState>(
          builder: (context, state) {
            return RefreshIndicator(
              onRefresh: () => context.read<KnowledgeCubit>().load(),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 18, 20, 96),
                children: [
                  PagePad(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          '知识库',
                          style: TextStyle(
                            fontSize: 26,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          '把踩过的坑、想通的事留下来，下次直接复用',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 13,
                          ),
                        ),
                        const SizedBox(height: 18),
                        TextField(
                          onChanged: context.read<KnowledgeCubit>().search,
                          decoration: const InputDecoration(
                            hintText: '搜索标题或内容',
                            prefixIcon: Icon(Icons.search),
                          ),
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            FilterChip(
                              label: const Text('全部'),
                              selected:
                                  !state.favoritesOnly && state.tagId == null,
                              onSelected: (_) {
                                if (state.tagId != null) {
                                  context.read<KnowledgeCubit>().selectTag(
                                    null,
                                  );
                                } else if (state.favoritesOnly) {
                                  context
                                      .read<KnowledgeCubit>()
                                      .toggleFavoritesOnly();
                                }
                              },
                              showCheckmark: false,
                            ),
                            FilterChip(
                              avatar: const Icon(Icons.star, size: 16),
                              label: const Text('收藏'),
                              selected: state.favoritesOnly,
                              onSelected: (_) => context
                                  .read<KnowledgeCubit>()
                                  .toggleFavoritesOnly(),
                              showCheckmark: false,
                            ),
                            for (final tag in state.tags)
                              FilterChip(
                                label: Text(tag.name),
                                selected: state.tagId == tag.id,
                                onSelected: (_) =>
                                    context.read<KnowledgeCubit>().selectTag(
                                      state.tagId == tag.id ? null : tag.id,
                                    ),
                                showCheckmark: false,
                              ),
                          ],
                        ),
                        const SizedBox(height: 16),
                        if (state.loading)
                          const Padding(
                            padding: EdgeInsets.symmetric(vertical: 80),
                            child: Center(child: CircularProgressIndicator()),
                          )
                        else if (state.entries.isEmpty)
                          EmptyState(
                            icon: Icons.menu_book_outlined,
                            title: state.query.isEmpty && !state.favoritesOnly
                                ? '知识库还是空的'
                                : '没有匹配的知识',
                            message: state.query.isEmpty && !state.favoritesOnly
                                ? '完成一次复盘、解决一个卡点后，把结论沉淀成一条知识。'
                                : '换个关键词或标签试试。',
                            action: state.query.isEmpty && !state.favoritesOnly
                                ? FilledButton.icon(
                                    onPressed: () =>
                                        context.push('/knowledge/new'),
                                    icon: const Icon(Icons.add),
                                    label: const Text('写第一条'),
                                  )
                                : null,
                          )
                        else
                          _KnowledgeGrid(entries: state.entries),
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

class _KnowledgeGrid extends StatelessWidget {
  const _KnowledgeGrid({required this.entries});
  final List<KnowledgeEntry> entries;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 920
            ? 3
            : constraints.maxWidth >= 620
            ? 2
            : 1;
        final width = (constraints.maxWidth - (columns - 1) * 14) / columns;
        return Wrap(
          spacing: 14,
          runSpacing: 14,
          children: [
            for (final entry in entries)
              SizedBox(
                width: width,
                child: _KnowledgeCard(entry: entry),
              ),
          ],
        );
      },
    );
  }
}

class _KnowledgeCard extends StatelessWidget {
  const _KnowledgeCard({required this.entry});
  final KnowledgeEntry entry;

  @override
  Widget build(BuildContext context) {
    return SurfaceCard(
      onTap: () => context.go('/knowledge/${entry.id}'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Pill(_sourceLabel(entry.sourceType), color: AppColors.textMuted),
              const Spacer(),
              IconButton(
                visualDensity: VisualDensity.compact,
                tooltip: entry.isFavorite ? '取消收藏' : '收藏',
                onPressed: () =>
                    context.read<KnowledgeCubit>().toggleFavorite(entry),
                icon: Icon(
                  entry.isFavorite ? Icons.star : Icons.star_border,
                  size: 18,
                  color: entry.isFavorite
                      ? AppColors.warning
                      : AppColors.textMuted,
                ),
              ),
            ],
          ),
          Text(
            entry.title,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(
            entry.content,
            maxLines: 3,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: AppColors.textMuted,
              fontSize: 12,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 14),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: [
              for (final tag in entry.tags.take(3))
                Pill(tag.name, color: AppColors.seed),
            ],
          ),
          const SizedBox(height: 10),
          Text(
            '${relativeTime(entry.updatedAt)} · 看过 ${entry.viewCount} 次',
            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
          ),
        ],
      ),
    );
  }
}
