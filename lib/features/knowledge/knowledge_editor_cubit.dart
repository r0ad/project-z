import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';

import '../../app/app_dependencies.dart';
import '../../core/app_events.dart';
import '../../domain/models.dart';

class KnowledgeEditorState extends Equatable {
  const KnowledgeEditorState({
    this.loading = true,
    this.saving = false,
    this.entry,
    this.tags = const [],
    this.projects = const [],
    this.selectedTags = const [],
    this.selectedProjectIds = const [],
    this.error,
  });

  final bool loading;
  final bool saving;
  final KnowledgeEntry? entry;
  final List<Tag> tags;
  final List<Project> projects;
  final List<String> selectedTags;
  final List<String> selectedProjectIds;
  final String? error;

  KnowledgeEditorState copyWith({
    bool? loading,
    bool? saving,
    KnowledgeEntry? entry,
    List<Tag>? tags,
    List<Project>? projects,
    List<String>? selectedTags,
    List<String>? selectedProjectIds,
    String? error,
  }) {
    return KnowledgeEditorState(
      loading: loading ?? this.loading,
      saving: saving ?? this.saving,
      entry: entry ?? this.entry,
      tags: tags ?? this.tags,
      projects: projects ?? this.projects,
      selectedTags: selectedTags ?? this.selectedTags,
      selectedProjectIds: selectedProjectIds ?? this.selectedProjectIds,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
    loading,
    saving,
    entry,
    tags,
    projects,
    selectedTags,
    selectedProjectIds,
    error,
  ];
}

class KnowledgeEditorCubit extends Cubit<KnowledgeEditorState> {
  KnowledgeEditorCubit(this._deps, {this.entryId})
    : super(const KnowledgeEditorState());

  final AppDependencies _deps;
  final String? entryId;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));
    try {
      final entry = entryId == null
          ? null
          : await _deps.knowledge.getById(entryId!);
      final tags = await _deps.knowledge.allTags();
      final projects = await _deps.projects.list();
      emit(
        state.copyWith(
          loading: false,
          entry: entry,
          tags: tags,
          projects: projects,
          selectedTags: entry?.tags.map((e) => e.name).toList() ?? const [],
          selectedProjectIds: entry?.projectIds ?? const [],
        ),
      );
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  void toggleTag(String name) {
    final tags = [...state.selectedTags];
    tags.contains(name) ? tags.remove(name) : tags.add(name);
    emit(state.copyWith(selectedTags: tags));
  }

  void toggleProject(String id) {
    final ids = [...state.selectedProjectIds];
    ids.contains(id) ? ids.remove(id) : ids.add(id);
    emit(state.copyWith(selectedProjectIds: ids));
  }

  Future<KnowledgeEntry?> save({
    required String title,
    required String content,
  }) async {
    emit(state.copyWith(saving: true, error: null));
    try {
      if (state.entry == null) {
        final created = await _deps.knowledge.create(
          KnowledgeDraft(
            title: title,
            content: content,
            tagNames: state.selectedTags,
            projectIds: state.selectedProjectIds,
          ),
        );
        emit(state.copyWith(saving: false));
        AppEvents.bump();
        return created;
      }
      final updated = await _deps.knowledge.updateEntry(
        state.entry!,
        tagNames: state.selectedTags,
        projectIds: state.selectedProjectIds,
      );
      emit(state.copyWith(saving: false, entry: updated));
      AppEvents.bump();
      return updated;
    } catch (e) {
      emit(state.copyWith(saving: false, error: e.toString()));
      return null;
    }
  }
}
