import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app/app_dependencies.dart';
import '../../core/app_events.dart';
import '../../data/ai/service.dart';
import '../../data/ai/types.dart';
import '../../domain/models.dart';

class LogEditorState extends Equatable {
  const LogEditorState({
    this.loading = true,
    this.saving = false,
    this.structuring = false,
    this.project,
    this.milestones = const [],
    this.log,
    this.structure,
    this.error,
  });

  final bool loading;
  final bool saving;
  final bool structuring;
  final Project? project;
  final List<Milestone> milestones;
  final ProjectLog? log;
  final LogStructure? structure;
  final String? error;

  LogEditorState copyWith({
    bool? loading,
    bool? saving,
    bool? structuring,
    Project? project,
    List<Milestone>? milestones,
    ProjectLog? log,
    LogStructure? structure,
    String? error,
  }) {
    return LogEditorState(
      loading: loading ?? this.loading,
      saving: saving ?? this.saving,
      structuring: structuring ?? this.structuring,
      project: project ?? this.project,
      milestones: milestones ?? this.milestones,
      log: log ?? this.log,
      structure: structure ?? this.structure,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
    loading,
    saving,
    structuring,
    project,
    milestones,
    log,
    structure,
    error,
  ];
}

class LogEditorCubit extends Cubit<LogEditorState> {
  LogEditorCubit(this._deps, {required this.projectId, this.logId})
    : super(const LogEditorState());

  final AppDependencies _deps;
  final String projectId;
  final String? logId;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));
    try {
      final detail = await _deps.projects.detail(projectId);
      if (detail == null) {
        emit(state.copyWith(loading: false, error: '项目不存在'));
        return;
      }
      ProjectLog? existing;
      if (logId != null) {
        for (final log in detail.logs) {
          if (log.id == logId) existing = log;
        }
      }
      emit(
        state.copyWith(
          loading: false,
          project: detail.project,
          milestones: detail.milestones,
          log: existing,
        ),
      );
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  Future<LogStructure?> structure(String rawInput) async {
    final project = state.project;
    if (project == null) return null;
    emit(state.copyWith(structuring: true, error: null));
    try {
      final structure = await _deps.ai.structureLog(
        rawInput: rawInput,
        projectTitle: project.title,
        projectGoal: project.goal,
        milestoneTitles: state.milestones.map((m) => m.title).toList(),
      );
      emit(state.copyWith(structuring: false, structure: structure));
      return structure;
    } on AiException catch (e) {
      emit(state.copyWith(structuring: false, error: e.userMessage));
      return null;
    } catch (e) {
      emit(state.copyWith(structuring: false, error: e.toString()));
      return null;
    }
  }

  Future<String?> save(LogDraft draft) async {
    emit(state.copyWith(saving: true, error: null));
    try {
      if (state.log == null) {
        await _deps.logs.create(draft);
      } else {
        final old = state.log!;
        await _deps.logs.updateLog(
          ProjectLog(
            id: old.id,
            projectId: old.projectId,
            logDate: draft.logDate,
            progressText: draft.progressText,
            problemText: draft.problemText,
            planText: draft.planText,
            rawInput: draft.rawInput,
            milestoneId: draft.milestoneId,
            createdAt: old.createdAt,
            updatedAt: DateTime.now().toUtc().millisecondsSinceEpoch,
          ),
        );
      }
      emit(state.copyWith(saving: false));
      AppEvents.bump();
      return null;
    } catch (e) {
      emit(state.copyWith(saving: false, error: e.toString()));
      return e.toString();
    }
  }
}
