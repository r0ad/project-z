import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app/app_dependencies.dart';
import '../../core/app_events.dart';
import '../../domain/models.dart';

class KnowledgeDetailState extends Equatable {
  const KnowledgeDetailState({
    this.loading = true,
    this.entry,
    this.related = const [],
    this.error,
  });

  final bool loading;
  final KnowledgeEntry? entry;
  final List<KnowledgeEntry> related;
  final String? error;

  KnowledgeDetailState copyWith({
    bool? loading,
    KnowledgeEntry? entry,
    List<KnowledgeEntry>? related,
    String? error,
  }) {
    return KnowledgeDetailState(
      loading: loading ?? this.loading,
      entry: entry ?? this.entry,
      related: related ?? this.related,
      error: error,
    );
  }

  @override
  List<Object?> get props => [loading, entry, related, error];
}

class KnowledgeDetailCubit extends Cubit<KnowledgeDetailState> {
  KnowledgeDetailCubit(this._deps, this.id)
    : super(const KnowledgeDetailState());

  final AppDependencies _deps;
  final String id;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));
    try {
      await _deps.knowledge.recordView(id);
      final entry = await _deps.knowledge.getById(id);
      if (entry == null) {
        emit(state.copyWith(loading: false, error: '这条知识不存在或已被删除'));
        return;
      }
      final related = await _deps.knowledge.related(id);
      emit(state.copyWith(loading: false, entry: entry, related: related));
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  Future<void> toggleFavorite() async {
    await _deps.knowledge.toggleFavorite(id);
    await load();
    AppEvents.bump();
  }

  Future<void> delete() async {
    await _deps.knowledge.delete(id);
    AppEvents.bump();
  }
}
