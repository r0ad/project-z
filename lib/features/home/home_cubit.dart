import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app/app_dependencies.dart';
import '../../domain/models.dart';

class HomeState extends Equatable {
  const HomeState({
    this.loading = true,
    this.userName = '',
    this.activeProjects = const [],
    this.recentLogs = const [],
    this.stats,
    this.knowledgeCount = 0,
    this.hasAi = false,
    this.error,
  });

  final bool loading;
  final String userName;
  final List<Project> activeProjects;
  final List<ProjectLog> recentLogs;
  final WeeklyStats? stats;
  final int knowledgeCount;
  final bool hasAi;
  final String? error;

  HomeState copyWith({
    bool? loading,
    String? userName,
    List<Project>? activeProjects,
    List<ProjectLog>? recentLogs,
    WeeklyStats? stats,
    int? knowledgeCount,
    bool? hasAi,
    String? error,
  }) {
    return HomeState(
      loading: loading ?? this.loading,
      userName: userName ?? this.userName,
      activeProjects: activeProjects ?? this.activeProjects,
      recentLogs: recentLogs ?? this.recentLogs,
      stats: stats ?? this.stats,
      knowledgeCount: knowledgeCount ?? this.knowledgeCount,
      hasAi: hasAi ?? this.hasAi,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
    loading,
    userName,
    activeProjects,
    recentLogs,
    stats,
    knowledgeCount,
    hasAi,
    error,
  ];
}

class HomeCubit extends Cubit<HomeState> {
  HomeCubit(this._deps) : super(const HomeState());

  final AppDependencies _deps;

  Future<void> load() async {
    emit(state.copyWith(loading: true));
    try {
      final results = await Future.wait<Object?>([
        _deps.settings.get('user_name'),
        _deps.projects.list(
          filter: const ProjectFilter(status: ProjectStatus.active),
        ),
        _deps.logs.recent(days: 14),
        _deps.stats.weekly(),
        _deps.knowledge.list(limit: 500),
        _deps.aiConfigs.active(),
      ]);
      emit(
        HomeState(
          loading: false,
          userName: (results[0] as String?)?.trim() ?? '',
          activeProjects: results[1] as List<Project>,
          recentLogs: results[2] as List<ProjectLog>,
          stats: results[3] as WeeklyStats,
          knowledgeCount: (results[4] as List<KnowledgeEntry>).length,
          hasAi: results[5] != null,
        ),
      );
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }
}
