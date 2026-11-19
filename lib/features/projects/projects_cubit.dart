import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app/app_dependencies.dart';
import '../../core/app_events.dart';
import '../../domain/models.dart';

class ProjectsState extends Equatable {
  const ProjectsState({
    this.loading = true,
    this.projects = const [],
    this.status,
    this.query = '',
    this.error,
  });

  final bool loading;
  final List<Project> projects;
  final ProjectStatus? status;
  final String query;
  final String? error;

  ProjectsState copyWith({
    bool? loading,
    List<Project>? projects,
    ProjectStatus? status,
    bool clearStatus = false,
    String? query,
    String? error,
  }) {
    return ProjectsState(
      loading: loading ?? this.loading,
      projects: projects ?? this.projects,
      status: clearStatus ? null : (status ?? this.status),
      query: query ?? this.query,
      error: error,
    );
  }

  @override
  List<Object?> get props => [loading, projects, status, query, error];
}

class ProjectsCubit extends Cubit<ProjectsState> {
  ProjectsCubit(this._deps) : super(const ProjectsState());

  final AppDependencies _deps;
  Timer? _debounce;

  Future<void> load() async {
    emit(state.copyWith(loading: true));
    try {
      final projects = await _deps.projects.list(
        filter: ProjectFilter(status: state.status, query: state.query),
      );
      emit(state.copyWith(loading: false, projects: projects, error: null));
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  void setStatus(ProjectStatus? status) {
    emit(state.copyWith(status: status, clearStatus: status == null));
    load();
  }

  void search(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 220), () {
      emit(state.copyWith(query: value));
      load();
    });
  }

  Future<void> delete(String id) async {
    await _deps.projects.delete(id);
    await load();
    AppEvents.bump();
  }

  @override
  Future<void> close() {
    _debounce?.cancel();
    return super.close();
  }
}
