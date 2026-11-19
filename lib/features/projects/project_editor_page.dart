import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/formatters.dart';
import '../../core/ui.dart';
import '../../data/ai/service.dart';
import '../../domain/models.dart';
import 'project_editor_cubit.dart';

class ProjectEditorPage extends StatelessWidget {
  const ProjectEditorPage({super.key});

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => ProjectEditorCubit(deps),
      child: const _ProjectEditorView(),
    );
  }
}

class _ProjectEditorView extends StatefulWidget {
  const _ProjectEditorView();

  @override
  State<_ProjectEditorView> createState() => _ProjectEditorViewState();
}

class _ProjectEditorViewState extends State<_ProjectEditorView> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _description = TextEditingController();
  final _goal = TextEditingController();
  String? _dueDate;
  List<MilestoneSuggestion> _milestones = const [];

  @override
  void dispose() {
    _title.dispose();
    _description.dispose();
    _goal.dispose();
    super.dispose();
  }

  Future<void> _generate() async {
    final title = _title.text.trim();
    if (title.isEmpty) {
      showSnack(context, '先给项目起个名字', error: true);
      return;
    }
    final suggestion = await context.read<ProjectEditorCubit>().generate(
      title: title,
      description: _description.text.trim(),
      goal: _goal.text.trim(),
      dueDate: _dueDate,
    );
    if (suggestion != null && mounted) {
      setState(() {
        _goal.text = suggestion.goal;
        _milestones = suggestion.milestones;
      });
      showSnack(context, '已生成 ${suggestion.milestones.length} 个里程碑');
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    final cubit = context.read<ProjectEditorCubit>();
    final project = await cubit.save(
      draft: ProjectDraft(
        title: _title.text.trim(),
        description: _description.text.trim(),
        goal: _goal.text.trim(),
        dueDate: _dueDate,
        color: '#06B6D4',
      ),
      milestones: _milestones,
    );
    if (project != null && mounted) {
      context.go('/projects/${project.id}');
    } else if (mounted) {
      showSnack(context, cubit.state.error ?? '保存失败', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          onPressed: () =>
              context.canPop() ? context.pop() : context.go('/projects'),
          icon: const Icon(Icons.arrow_back),
        ),
        title: const Text('新建项目'),
      ),
      body: BlocConsumer<ProjectEditorCubit, ProjectEditorState>(
        listener: (context, state) {
          if (state.error != null) {
            showSnack(context, state.error!, error: true);
          }
        },
        builder: (context, state) {
          return Form(
            key: _formKey,
            child: ListView(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 40),
              children: [
                PagePad(
                  maxWidth: 780,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const AiHint(
                        '先写下你模糊的想法，AI 会帮你重写目标并拆成 3-6 个可验证的里程碑。也可以跳过 AI 手动创建。',
                      ),
                      const SizedBox(height: 20),
                      TextFormField(
                        controller: _title,
                        textInputAction: TextInputAction.next,
                        decoration: const InputDecoration(
                          labelText: '项目名称',
                          hintText: '例如：完成个人作品集网站',
                        ),
                        validator: (value) =>
                            (value == null || value.trim().isEmpty)
                            ? '请填写项目名称'
                            : null,
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _description,
                        minLines: 3,
                        maxLines: 6,
                        decoration: const InputDecoration(
                          labelText: '现状 / 想法',
                          hintText: '为什么想做？现在进行到哪一步？有什么限制？',
                          alignLabelWithHint: true,
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextFormField(
                        controller: _goal,
                        minLines: 1,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          labelText: '目标（可留空让 AI 生成）',
                          hintText: '例如：30 天内上线可投递的作品集',
                        ),
                      ),
                      const SizedBox(height: 14),
                      InkWell(
                        onTap: () async {
                          final now = DateTime.now();
                          final picked = await showDatePicker(
                            context: context,
                            initialDate: _dueDate == null
                                ? now
                                : DateTime.parse(_dueDate!),
                            firstDate: now,
                            lastDate: now.add(const Duration(days: 365 * 3)),
                          );
                          if (picked != null) {
                            setState(() => _dueDate = dateKey(picked));
                          }
                        },
                        child: InputDecorator(
                          decoration: const InputDecoration(
                            labelText: '期望完成时间',
                            suffixIcon: Icon(
                              Icons.calendar_today_outlined,
                              size: 18,
                            ),
                          ),
                          child: Text(
                            _dueDate == null ? '未设置' : formatFullDate(_dueDate),
                            style: TextStyle(
                              color: _dueDate == null
                                  ? AppColors.textMuted
                                  : Colors.white,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(height: 22),
                      Row(
                        children: [
                          Expanded(
                            child: FilledButton.icon(
                              onPressed: state.generating ? null : _generate,
                              icon: state.generating
                                  ? const SizedBox(
                                      width: 16,
                                      height: 16,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.auto_awesome),
                              label: Text(
                                state.generating ? 'AI 正在拆解…' : 'AI 帮我拆目标',
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (_milestones.isNotEmpty) ...[
                        const SizedBox(height: 26),
                        SectionTitle(
                          'AI 生成的里程碑',
                          subtitle: '${_milestones.length} 个，保存后可继续调整',
                          action: TextButton(
                            onPressed: () =>
                                setState(() => _milestones = const []),
                            child: const Text('清空'),
                          ),
                        ),
                        for (var i = 0; i < _milestones.length; i++)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: SurfaceCard(
                              padding: const EdgeInsets.all(14),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  CircleAvatar(
                                    radius: 13,
                                    backgroundColor: AppColors.seed.withValues(
                                      alpha: 0.15,
                                    ),
                                    child: Text(
                                      '${i + 1}',
                                      style: const TextStyle(
                                        color: AppColors.seed,
                                        fontSize: 12,
                                        fontWeight: FontWeight.w700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 12),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          _milestones[i].title,
                                          style: const TextStyle(
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                        if (_milestones[i]
                                            .description
                                            .isNotEmpty) ...[
                                          const SizedBox(height: 4),
                                          Text(
                                            _milestones[i].description,
                                            style: const TextStyle(
                                              color: AppColors.textMuted,
                                              fontSize: 12,
                                              height: 1.4,
                                            ),
                                          ),
                                        ],
                                        if (_milestones[i].dueDate != null) ...[
                                          const SizedBox(height: 6),
                                          Text(
                                            _milestones[i].dueDate!,
                                            style: const TextStyle(
                                              color: AppColors.seed,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ],
                                      ],
                                    ),
                                  ),
                                  IconButton(
                                    tooltip: '移除',
                                    onPressed: () => setState(
                                      () =>
                                          _milestones = [..._milestones]
                                            ..removeAt(i),
                                    ),
                                    icon: const Icon(Icons.close, size: 18),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                      const SizedBox(height: 26),
                      SizedBox(
                        width: double.infinity,
                        child: FilledButton(
                          onPressed: state.saving ? null : _save,
                          child: state.saving
                              ? const SizedBox(
                                  width: 18,
                                  height: 18,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                  ),
                                )
                              : Text(
                                  _milestones.isEmpty ? '创建项目' : '创建项目并保存里程碑',
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
