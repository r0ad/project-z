import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app/app_dependencies.dart';
import '../../core/app_events.dart';
import '../../data/ai/types.dart';
import '../../domain/models.dart';

class ProjectDetailState extends Equatable {
  const ProjectDetailState({
    this.loading = true,
    this.detail,
    this.error,
    this.busy = false,
    this.analyzing = false,
  });

  final bool loading;
  final ProjectDetail? detail;
  final String? error;
  final bool busy;
  final bool analyzing;

  ProjectDetailState copyWith({
    bool? loading,
    ProjectDetail? detail,
    String? error,
    bool? busy,
    bool? analyzing,
  }) {
    return ProjectDetailState(
      loading: loading ?? this.loading,
      detail: detail ?? this.detail,
      error: error,
      busy: busy ?? this.busy,
      analyzing: analyzing ?? this.analyzing,
    );
  }

  @override
  List<Object?> get props => [loading, detail, error, busy, analyzing];
}

class ProjectDetailCubit extends Cubit<ProjectDetailState> {
  ProjectDetailCubit(this._deps, this.projectId)
    : super(const ProjectDetailState());

  final AppDependencies _deps;
  final String projectId;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));
    try {
      final detail = await _deps.projects.detail(projectId);
      if (detail == null) {
        emit(state.copyWith(loading: false, error: '项目不存在或已被删除'));
        return;
      }
      emit(state.copyWith(loading: false, detail: detail));
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  Future<void> toggleMilestone(Milestone milestone) async {
    emit(state.copyWith(busy: true));
    try {
      await _deps.milestones.toggle(milestone.id, !milestone.isCompleted);
      await load();
      AppEvents.bump();
    } catch (e) {
      emit(state.copyWith(busy: false, error: e.toString()));
    }
  }

  Future<void> addMilestone({
    required String title,
    String description = '',
    String? dueDate,
  }) async {
    emit(state.copyWith(busy: true));
    try {
      await _deps.milestones.create(
        MilestoneDraft(
          projectId: projectId,
          title: title,
          description: description,
          dueDate: dueDate,
        ),
      );
      await load();
      AppEvents.bump();
    } catch (e) {
      emit(state.copyWith(busy: false, error: e.toString()));
    }
  }

  Future<void> removeMilestone(String id) async {
    emit(state.copyWith(busy: true));
    try {
      await _deps.milestones.delete(id);
      await load();
      AppEvents.bump();
    } catch (e) {
      emit(state.copyWith(busy: false, error: e.toString()));
    }
  }

  Future<void> setStatus(ProjectStatus status) async {
    emit(state.copyWith(busy: true));
    try {
      await _deps.projects.setStatus(projectId, status);
      await load();
      AppEvents.bump();
    } catch (e) {
      emit(state.copyWith(busy: false, error: e.toString()));
    }
  }

  Future<AiInsight?> analyze() async {
    final detail = state.detail;
    if (detail == null) return null;
    emit(state.copyWith(analyzing: true, error: null));
    try {
      final insight = await _deps.ai.analyzeProject(detail);
      final saved = await _deps.insights.save(insight);
      await load();
      AppEvents.bump();
      emit(state.copyWith(analyzing: false));
      return saved;
    } on AiException catch (e) {
      emit(state.copyWith(analyzing: false, error: e.userMessage));
      return null;
    } catch (e) {
      emit(state.copyWith(analyzing: false, error: e.toString()));
      return null;
    }
  }

  Future<bool> saveInsightAsKnowledge(AiInsight insight) async {
    final detail = state.detail;
    if (detail == null) return false;
    try {
      await _deps.knowledge.create(
        KnowledgeDraft(
          title: '${detail.project.title} · ${insight.kind.label}',
          content: insight.content,
          sourceType: KnowledgeSource.insight,
          sourceId: projectId,
          tagNames: const ['AI分析'],
          projectIds: [projectId],
        ),
      );
      AppEvents.bump();
      return true;
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
      return false;
    }
  }

  Future<void> deleteProject() async {
    try {
      await _deps.projects.delete(projectId);
      emit(state.copyWith(busy: false));
      AppEvents.bump();
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }
}
