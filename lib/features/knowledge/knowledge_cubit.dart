import 'dart:async';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app/app_dependencies.dart';
import '../../domain/models.dart';

class KnowledgeState extends Equatable {
  const KnowledgeState({
    this.loading = true,
    this.entries = const [],
    this.tags = const [],
    this.query = '',
    this.favoritesOnly = false,
    this.tagId,
    this.error,
  });

  final bool loading;
  final List<KnowledgeEntry> entries;
  final List<Tag> tags;
  final String query;
  final bool favoritesOnly;
  final String? tagId;
  final String? error;

  KnowledgeState copyWith({
    bool? loading,
    List<KnowledgeEntry>? entries,
    List<Tag>? tags,
    String? query,
    bool? favoritesOnly,
    String? tagId,
    String? error,
  }) {
    return KnowledgeState(
      loading: loading ?? this.loading,
      entries: entries ?? this.entries,
      tags: tags ?? this.tags,
      query: query ?? this.query,
      favoritesOnly: favoritesOnly ?? this.favoritesOnly,
      tagId: tagId,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
    loading,
    entries,
    tags,
    query,
    favoritesOnly,
    tagId,
    error,
  ];
}

class KnowledgeCubit extends Cubit<KnowledgeState> {
  KnowledgeCubit(this._deps) : super(const KnowledgeState());

  final AppDependencies _deps;
  Timer? _debounce;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));
    try {
      final entries = await _deps.knowledge.list(
        query: state.query,
        favoritesOnly: state.favoritesOnly,
        tagId: state.tagId,
      );
      final tags = await _deps.knowledge.allTags();
      emit(state.copyWith(loading: false, entries: entries, tags: tags));
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  void search(String query) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 220), () {
      emit(state.copyWith(query: query));
      load();
    });
  }

  void toggleFavoritesOnly() {
    emit(state.copyWith(favoritesOnly: !state.favoritesOnly));
    load();
  }

  void selectTag(String? tagId) {
    emit(state.copyWith(tagId: tagId));
    load();
  }

  Future<void> toggleFavorite(KnowledgeEntry entry) async {
    await _deps.knowledge.toggleFavorite(entry.id);
    await load();
  }

  @override
  Future<void> close() {
    _debounce?.cancel();
    return super.close();
  }
}
