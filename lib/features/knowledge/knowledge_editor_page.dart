import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../core/ui.dart';
import 'knowledge_editor_cubit.dart';

class KnowledgeEditorPage extends StatelessWidget {
  const KnowledgeEditorPage({super.key, this.entryId});

  final String? entryId;

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => KnowledgeEditorCubit(deps, entryId: entryId)..load(),
      child: const _KnowledgeEditorView(),
    );
  }
}

class _KnowledgeEditorView extends StatefulWidget {
  const _KnowledgeEditorView();

  @override
  State<_KnowledgeEditorView> createState() => _KnowledgeEditorViewState();
}

class _KnowledgeEditorViewState extends State<_KnowledgeEditorView> {
  final _title = TextEditingController();
  final _content = TextEditingController();
  final _customTag = TextEditingController();
  bool _hydrated = false;

  @override
  void dispose() {
    _title.dispose();
    _content.dispose();
    _customTag.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_title.text.trim().isEmpty || _content.text.trim().isEmpty) {
      showSnack(context, '标题和内容都要填', error: true);
      return;
    }
    final entry = await context.read<KnowledgeEditorCubit>().save(
      title: _title.text.trim(),
      content: _content.text.trim(),
    );
    if (entry != null && mounted) {
      showSnack(context, '已保存');
      context.go('/knowledge/${entry.id}');
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<KnowledgeEditorCubit, KnowledgeEditorState>(
      listener: (context, state) {
        if (state.error != null) showSnack(context, state.error!, error: true);
        if (state.entry != null && !_hydrated) {
          _hydrated = true;
          _title.text = state.entry!.title;
          _content.text = state.entry!.content;
        }
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              tooltip: '返回',
              icon: const Icon(Icons.arrow_back),
              onPressed: () {
                if (context.canPop()) {
                  context.pop();
                } else {
                  context.go('/knowledge');
                }
              },
            ),
            title: Text(state.entry == null ? '沉淀知识' : '编辑知识'),
            actions: [
              TextButton(
                onPressed: state.saving ? null : _save,
                child: state.saving
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(strokeWidth: 2),
                      )
                    : const Text('保存'),
              ),
            ],
          ),
          body: state.loading
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
                  children: [
                    PagePad(
                      maxWidth: 780,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const AiHint(
                            '写清楚「什么场景、我原来怎么想、后来发现什么、下次怎么做」，比收藏链接更有用。',
                          ),
                          const SizedBox(height: 18),
                          TextField(
                            controller: _title,
                            decoration: const InputDecoration(
                              labelText: '标题',
                              hintText: '一句话说清这条知识',
                            ),
                          ),
                          const SizedBox(height: 14),
                          TextField(
                            controller: _content,
                            minLines: 10,
                            maxLines: 24,
                            decoration: const InputDecoration(
                              labelText: '内容',
                              hintText: '支持 Markdown。写下背景、结论和可复用的做法。',
                              alignLabelWithHint: true,
                            ),
                          ),
                          const SizedBox(height: 22),
                          const SectionTitle('标签', subtitle: '用于筛选和关联'),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              for (final tag in state.tags)
                                FilterChip(
                                  label: Text(tag.name),
                                  selected: state.selectedTags.contains(
                                    tag.name,
                                  ),
                                  onSelected: (_) => context
                                      .read<KnowledgeEditorCubit>()
                                      .toggleTag(tag.name),
                                ),
                              for (final name in state.selectedTags.where(
                                (e) => !state.tags.any((t) => t.name == e),
                              ))
                                FilterChip(
                                  label: Text(name),
                                  selected: true,
                                  onSelected: (_) => context
                                      .read<KnowledgeEditorCubit>()
                                      .toggleTag(name),
                                ),
                            ],
                          ),
                          const SizedBox(height: 10),
                          Row(
                            children: [
                              Expanded(
                                child: TextField(
                                  controller: _customTag,
                                  decoration: const InputDecoration(
                                    hintText: '新标签',
                                    isDense: true,
                                  ),
                                  onSubmitted: (value) {
                                    final name = value.trim();
                                    if (name.isNotEmpty &&
                                        !state.selectedTags.contains(name)) {
                                      context
                                          .read<KnowledgeEditorCubit>()
                                          .toggleTag(name);
                                    }
                                    _customTag.clear();
                                  },
                                ),
                              ),
                              const SizedBox(width: 8),
                              IconButton.filledTonal(
                                onPressed: () {
                                  final name = _customTag.text.trim();
                                  if (name.isNotEmpty &&
                                      !state.selectedTags.contains(name)) {
                                    context
                                        .read<KnowledgeEditorCubit>()
                                        .toggleTag(name);
                                  }
                                  _customTag.clear();
                                },
                                icon: const Icon(Icons.add),
                              ),
                            ],
                          ),
                          if (state.projects.isNotEmpty) ...[
                            const SizedBox(height: 22),
                            const SectionTitle(
                              '关联项目',
                              subtitle: '让项目详情能找到这条知识',
                            ),
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                for (final project in state.projects)
                                  FilterChip(
                                    label: Text(project.title),
                                    selected: state.selectedProjectIds.contains(
                                      project.id,
                                    ),
                                    onSelected: (_) => context
                                        .read<KnowledgeEditorCubit>()
                                        .toggleProject(project.id),
                                  ),
                              ],
                            ),
                          ],
                          const SizedBox(height: 28),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: state.saving ? null : _save,
                              child: const Text('保存'),
                            ),
                          ),
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
