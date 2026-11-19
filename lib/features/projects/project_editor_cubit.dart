import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app/app_dependencies.dart';
import '../../core/app_events.dart';
import '../../data/ai/service.dart';
import '../../data/ai/types.dart';
import '../../domain/models.dart';

class ProjectEditorState extends Equatable {
  const ProjectEditorState({
    this.generating = false,
    this.saving = false,
    this.suggestion,
    this.error,
  });

  final bool generating;
  final bool saving;
  final ProjectPlanSuggestion? suggestion;
  final String? error;

  ProjectEditorState copyWith({
    bool? generating,
    bool? saving,
    ProjectPlanSuggestion? suggestion,
    String? error,
  }) {
    return ProjectEditorState(
      generating: generating ?? this.generating,
      saving: saving ?? this.saving,
      suggestion: suggestion ?? this.suggestion,
      error: error,
    );
  }

  @override
  List<Object?> get props => [generating, saving, suggestion, error];
}

class ProjectEditorCubit extends Cubit<ProjectEditorState> {
  ProjectEditorCubit(this._deps) : super(const ProjectEditorState());

  final AppDependencies _deps;

  Future<ProjectPlanSuggestion?> generate({
    required String title,
    required String description,
    String goal = '',
    String? dueDate,
  }) async {
    emit(state.copyWith(generating: true, error: null));
    try {
      final suggestion = await _deps.ai.planProject(
        title: title,
        description: description,
        goal: goal,
        dueDate: dueDate,
      );
      emit(state.copyWith(generating: false, suggestion: suggestion));
      return suggestion;
    } on AiException catch (e) {
      emit(state.copyWith(generating: false, error: e.userMessage));
      return null;
    } catch (e) {
      emit(state.copyWith(generating: false, error: e.toString()));
      return null;
    }
  }

  Future<Project?> save({
    required ProjectDraft draft,
    List<MilestoneSuggestion> milestones = const [],
  }) async {
    emit(state.copyWith(saving: true, error: null));
    try {
      final project = await _deps.projects.create(draft);
      for (final milestone in milestones) {
        await _deps.milestones.create(
          MilestoneDraft(
            projectId: project.id,
            title: milestone.title,
            description: milestone.description,
            dueDate: milestone.dueDate,
          ),
        );
      }
      emit(state.copyWith(saving: false));
      AppEvents.bump();
      return project;
    } catch (e) {
      emit(state.copyWith(saving: false, error: e.toString()));
      return null;
    }
  }
}
