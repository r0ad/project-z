import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/formatters.dart';
import '../../core/ui.dart';
import '../../domain/models.dart';
import 'log_editor_cubit.dart';

class LogEditorPage extends StatelessWidget {
  const LogEditorPage({super.key, required this.projectId, this.logId});

  final String projectId;
  final String? logId;

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => LogEditorCubit(deps, projectId: projectId, logId: logId),
      child: const _LogEditorView(),
    );
  }
}

class _LogEditorView extends StatefulWidget {
  const _LogEditorView();

  @override
  State<_LogEditorView> createState() => _LogEditorViewState();
}

class _LogEditorViewState extends State<_LogEditorView> {
  final _raw = TextEditingController();
  final _progress = TextEditingController();
  final _problem = TextEditingController();
  final _plan = TextEditingController();
  String _date = dateKey(DateTime.now());
  String? _milestoneId;
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<LogEditorCubit>().load();
    });
  }

  @override
  void dispose() {
    _raw.dispose();
    _progress.dispose();
    _problem.dispose();
    _plan.dispose();
    super.dispose();
  }

  void _hydrate(ProjectLog log) {
    if (_initialized) return;
    _initialized = true;
    _date = log.logDate;
    _milestoneId = log.milestoneId;
    _raw.text = log.rawInput ?? '';
    _progress.text = log.progressText;
    _problem.text = log.problemText;
    _plan.text = log.planText;
  }

  Future<void> _structure() async {
    final raw = _raw.text.trim();
    if (raw.isEmpty) {
      showSnack(context, '先写一句今天做了什么', error: true);
      return;
    }
    final structure = await context.read<LogEditorCubit>().structure(raw);
    if (structure != null && mounted) {
      setState(() {
        if (structure.progressText.isNotEmpty) {
          _progress.text = structure.progressText;
        }
        if (structure.problemText.isNotEmpty) {
          _problem.text = structure.problemText;
        }
        if (structure.planText.isNotEmpty) _plan.text = structure.planText;
        if (structure.milestoneTitle != null) {
          for (final milestone
              in context.read<LogEditorCubit>().state.milestones) {
            if (milestone.title == structure.milestoneTitle) {
              _milestoneId = milestone.id;
            }
          }
        }
      });
    }
  }

  Future<void> _save() async {
    if (_progress.text.trim().isEmpty &&
        _problem.text.trim().isEmpty &&
        _plan.text.trim().isEmpty) {
      showSnack(context, '至少写一条进展、问题或下一步', error: true);
      return;
    }
    final cubit = context.read<LogEditorCubit>();
    final error = await cubit.save(
      LogDraft(
        projectId: cubit.projectId,
        logDate: _date,
        progressText: _progress.text.trim(),
        problemText: _problem.text.trim(),
        planText: _plan.text.trim(),
        rawInput: _raw.text.trim().isEmpty ? null : _raw.text.trim(),
        milestoneId: _milestoneId,
      ),
    );
    if (error == null && mounted) {
      showSnack(context, '记录已保存');
      context.go('/projects/${cubit.projectId}');
    } else if (mounted) {
      showSnack(context, error ?? '保存失败', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<LogEditorCubit, LogEditorState>(
      listener: (context, state) {
        if (state.error != null) showSnack(context, state.error!, error: true);
        if (state.log != null) _hydrate(state.log!);
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              onPressed: () =>
                  context.canPop() ? context.pop() : context.go('/projects'),
              icon: const Icon(Icons.arrow_back),
            ),
            title: Text(state.log == null ? '记录今天' : '编辑记录'),
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
                          if (state.project != null)
                            Text(
                              state.project!.title,
                              style: const TextStyle(
                                color: AppColors.seed,
                                fontWeight: FontWeight.w600,
                                fontSize: 13,
                              ),
                            ),
                          const SizedBox(height: 10),
                          const AiHint(
                            '用一句话写下今天做了什么、卡在哪里、下一步打算。AI 会整理成进展 / 问题 / 计划三栏，你也可以直接手填。',
                          ),
                          const SizedBox(height: 18),
                          TextField(
                            controller: _raw,
                            minLines: 4,
                            maxLines: 8,
                            decoration: const InputDecoration(
                              labelText: '今天怎么样？',
                              hintText: '例如：完成了登录页，但是接口一直 401，明天想先把鉴权调通。',
                              alignLabelWithHint: true,
                            ),
                          ),
                          const SizedBox(height: 10),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton.tonalIcon(
                              onPressed: state.structuring ? null : _structure,
                              icon: state.structuring
                                  ? const SizedBox(
                                      width: 14,
                                      height: 14,
                                      child: CircularProgressIndicator(
                                        strokeWidth: 2,
                                      ),
                                    )
                                  : const Icon(Icons.auto_awesome, size: 18),
                              label: Text(
                                state.structuring ? '整理中…' : 'AI 整理成三栏',
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          _Field(
                            controller: _progress,
                            label: '进展',
                            hint: '今天实际推进了什么？',
                            color: AppColors.success,
                          ),
                          const SizedBox(height: 12),
                          _Field(
                            controller: _problem,
                            label: '问题 / 阻塞',
                            hint: '卡在哪里？需要什么帮助？',
                            color: AppColors.warning,
                          ),
                          const SizedBox(height: 12),
                          _Field(
                            controller: _plan,
                            label: '下一步',
                            hint: '明天或接下来最想推进的一件事',
                            color: AppColors.seed,
                          ),
                          const SizedBox(height: 18),
                          Row(
                            children: [
                              Expanded(
                                child: InkWell(
                                  onTap: () async {
                                    final picked = await showDatePicker(
                                      context: context,
                                      initialDate: DateTime.parse(_date),
                                      firstDate: DateTime(2020),
                                      lastDate: DateTime.now().add(
                                        const Duration(days: 365),
                                      ),
                                    );
                                    if (picked != null) {
                                      setState(() => _date = dateKey(picked));
                                    }
                                  },
                                  child: InputDecorator(
                                    decoration: const InputDecoration(
                                      labelText: '日期',
                                      suffixIcon: Icon(
                                        Icons.calendar_today_outlined,
                                        size: 18,
                                      ),
                                    ),
                                    child: Text(formatFullDate(_date)),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: DropdownButtonFormField<String?>(
                                  initialValue: _milestoneId,
                                  decoration: const InputDecoration(
                                    labelText: '关联里程碑',
                                  ),
                                  items: [
                                    const DropdownMenuItem<String?>(
                                      value: null,
                                      child: Text('不关联'),
                                    ),
                                    for (final milestone in state.milestones)
                                      DropdownMenuItem<String?>(
                                        value: milestone.id,
                                        child: Text(
                                          milestone.title,
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                  ],
                                  onChanged: (value) =>
                                      setState(() => _milestoneId = value),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 26),
                          SizedBox(
                            width: double.infinity,
                            child: FilledButton(
                              onPressed: state.saving ? null : _save,
                              child: const Text('保存记录'),
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

class _Field extends StatelessWidget {
  const _Field({
    required this.controller,
    required this.label,
    required this.hint,
    required this.color,
  });

  final TextEditingController controller;
  final String label;
  final String hint;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: controller,
      minLines: 2,
      maxLines: 4,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        alignLabelWithHint: true,
        labelStyle: TextStyle(color: color),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: color.withValues(alpha: 0.35)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(14),
          borderSide: BorderSide(color: color),
        ),
      ),
    );
  }
}
