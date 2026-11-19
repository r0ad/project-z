import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import '../../app/app_dependencies.dart';
import '../../data/ai/context_builder.dart';
import '../../data/ai/types.dart';
import '../../domain/models.dart';

class ChatState extends Equatable {
  const ChatState({
    this.loading = true,
    this.sending = false,
    this.conversationId,
    this.projectTitle,
    this.messages = const [],
    this.streamingText = '',
    this.error,
  });

  final bool loading;
  final bool sending;
  final String? conversationId;
  final String? projectTitle;
  final List<ChatMessage> messages;
  final String streamingText;
  final String? error;

  ChatState copyWith({
    bool? loading,
    bool? sending,
    String? conversationId,
    String? projectTitle,
    List<ChatMessage>? messages,
    String? streamingText,
    String? error,
  }) {
    return ChatState(
      loading: loading ?? this.loading,
      sending: sending ?? this.sending,
      conversationId: conversationId ?? this.conversationId,
      projectTitle: projectTitle ?? this.projectTitle,
      messages: messages ?? this.messages,
      streamingText: streamingText ?? this.streamingText,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
    loading,
    sending,
    conversationId,
    projectTitle,
    messages,
    streamingText,
    error,
  ];
}

class ChatCubit extends Cubit<ChatState> {
  ChatCubit(this._deps, {this.projectId}) : super(const ChatState());

  final AppDependencies _deps;
  final String? projectId;
  final _uuid = const Uuid();
  ProjectDetail? _project;
  String _workspaceContext = '';

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));
    try {
      if (projectId != null) {
        _project = await _deps.projects.detail(projectId!);
        if (_project != null) {
          emit(state.copyWith(projectTitle: _project!.project.title));
        }
      } else {
        final projects = await _deps.projects.list();
        final logs = await _deps.logs.recent(days: 14);
        final knowledge = await _deps.knowledge.list(limit: 20);
        _workspaceContext = const ContextBuilder().workspace(
          projects: projects,
          logs: logs,
          knowledge: knowledge,
        );
      }
      final conversations = await _deps.chats.conversations(
        scopeType: projectId == null ? 'global' : 'project',
        scopeId: projectId,
      );
      ChatConversation? conversation;
      for (final item in conversations) {
        if (conversation == null || item.updatedAt > conversation.updatedAt) {
          conversation = item;
        }
      }
      if (conversation == null) {
        emit(state.copyWith(loading: false));
        return;
      }
      final messages = await _deps.chats.messages(conversation.id);
      emit(
        state.copyWith(
          loading: false,
          conversationId: conversation.id,
          messages: messages,
        ),
      );
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  Future<void> send(String text) async {
    final content = text.trim();
    if (content.isEmpty || state.sending) return;
    emit(state.copyWith(sending: true, error: null, streamingText: ''));
    try {
      var conversationId = state.conversationId;
      if (conversationId == null) {
        final conversation = await _deps.chats.createConversation(
          title: content.length > 24 ? '${content.substring(0, 24)}…' : content,
          scopeType: projectId == null ? 'global' : 'project',
          scopeId: projectId,
        );
        conversationId = conversation.id;
      }
      final now = DateTime.now().toUtc().millisecondsSinceEpoch;
      final userMessage = await _deps.chats.appendMessage(
        ChatMessage(
          id: _uuid.v4(),
          conversationId: conversationId,
          role: ChatRole.user,
          content: content,
          createdAt: now,
        ),
      );
      final history = state.messages;
      emit(
        state.copyWith(
          conversationId: conversationId,
          messages: [...history, userMessage],
        ),
      );

      final messages = _deps.ai.chatMessages(
        userMessage: content,
        history: history,
        project: _project,
        workspaceContext: _workspaceContext,
      );
      final buffer = StringBuffer();
      String? failure;
      await for (final event in _deps.ai.stream(messages)) {
        if (event is AiTextDelta) {
          buffer.write(event.text);
          emit(state.copyWith(streamingText: buffer.toString()));
        } else if (event is AiFailure) {
          failure = event.message;
          break;
        }
      }
      if (failure != null) {
        emit(state.copyWith(sending: false, error: failure));
        return;
      }
      final answer = buffer.toString().trim();
      if (answer.isEmpty) {
        emit(state.copyWith(sending: false, error: 'AI 没有返回内容，请重试'));
        return;
      }
      final assistant = await _deps.chats.appendMessage(
        ChatMessage(
          id: _uuid.v4(),
          conversationId: conversationId,
          role: ChatRole.assistant,
          content: answer,
          createdAt: DateTime.now().toUtc().millisecondsSinceEpoch,
        ),
      );
      emit(
        state.copyWith(
          sending: false,
          streamingText: '',
          messages: [...state.messages, assistant],
        ),
      );
    } on AiException catch (e) {
      emit(state.copyWith(sending: false, error: e.userMessage));
    } catch (e) {
      emit(state.copyWith(sending: false, error: e.toString()));
    }
  }

  void clearError() => emit(state.copyWith(error: null));
}
