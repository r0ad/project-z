import 'dart:convert';

import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import '../../app/app_dependencies.dart';
import '../../data/ai/context_builder.dart';
import '../../data/ai/types.dart' as ai;
import '../../domain/models.dart';

class PendingToolCall extends Equatable {
  const PendingToolCall({
    required this.call,
    required this.summary,
    required this.write,
  });

  final ai.AiToolCall call;
  final String summary;
  final bool write;

  @override
  List<Object?> get props => [call, summary, write];
}

class ChatState extends Equatable {
  const ChatState({
    this.loading = true,
    this.sending = false,
    this.conversationId,
    this.projectTitle,
    this.conversations = const [],
    this.messages = const [],
    this.streamingText = '',
    this.streamingReasoning = '',
    this.pendingTools = const [],
    this.error,
  });

  final bool loading;
  final bool sending;
  final String? conversationId;
  final String? projectTitle;
  final List<ChatConversation> conversations;
  final List<ChatMessage> messages;
  final String streamingText;
  final String streamingReasoning;
  final List<PendingToolCall> pendingTools;
  final String? error;

  ChatState copyWith({
    bool? loading,
    bool? sending,
    String? conversationId,
    bool resetConversation = false,
    String? projectTitle,
    List<ChatConversation>? conversations,
    List<ChatMessage>? messages,
    String? streamingText,
    String? streamingReasoning,
    List<PendingToolCall>? pendingTools,
    String? error,
  }) {
    return ChatState(
      loading: loading ?? this.loading,
      sending: sending ?? this.sending,
      conversationId: resetConversation
          ? null
          : conversationId ?? this.conversationId,
      projectTitle: projectTitle ?? this.projectTitle,
      conversations: conversations ?? this.conversations,
      messages: messages ?? this.messages,
      streamingText: streamingText ?? this.streamingText,
      streamingReasoning: streamingReasoning ?? this.streamingReasoning,
      pendingTools: pendingTools ?? this.pendingTools,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
    loading,
    sending,
    conversationId,
    projectTitle,
    conversations,
    messages,
    streamingText,
    streamingReasoning,
    pendingTools,
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
  List<ai.AiMessage>? _lastBaseMessages;
  List<ai.AiMessage>? _pendingPrefix;

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));
    try {
      await _loadContext();
      final conversations = await _fetchConversations();
      emit(state.copyWith(conversations: conversations));
      if (conversations.isEmpty) {
        emit(state.copyWith(loading: false));
        return;
      }
      await openConversation(conversations.first.id);
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  Future<void> _loadContext() async {
    if (projectId != null) {
      _project = await _deps.projects.detail(projectId!);
      if (_project != null) {
        emit(state.copyWith(projectTitle: _project!.project.title));
      }
      return;
    }
    final projects = await _deps.projects.list();
    final logs = await _deps.logs.recent(days: 14);
    final knowledge = await _deps.knowledge.list(limit: 20);
    _workspaceContext = const ContextBuilder().workspace(
      projects: projects,
      logs: logs,
      knowledge: knowledge,
    );
  }

  Future<List<ChatConversation>> _fetchConversations() async {
    final items = await _deps.chats.conversations(
      scopeType: projectId == null ? 'global' : 'project',
      scopeId: projectId,
    );
    return items..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
  }

  Future<void> loadConversations() async {
    try {
      final conversations = await _fetchConversations();
      emit(state.copyWith(conversations: conversations));
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> openConversation(String id) async {
    if (state.sending) return;
    if (state.conversationId == id && state.messages.isNotEmpty) return;
    _pendingPrefix = null;
    _lastBaseMessages = null;
    emit(
      state.copyWith(
        loading: true,
        conversationId: id,
        messages: const [],
        pendingTools: const [],
        streamingText: '',
        streamingReasoning: '',
        error: null,
      ),
    );
    try {
      final messages = await _deps.chats.messages(id);
      emit(
        state.copyWith(loading: false, conversationId: id, messages: messages),
      );
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  Future<void> newConversation() async {
    if (state.sending) return;
    _pendingPrefix = null;
    _lastBaseMessages = null;
    emit(
      state.copyWith(
        resetConversation: true,
        loading: false,
        messages: const [],
        pendingTools: const [],
        streamingText: '',
        streamingReasoning: '',
        error: null,
      ),
    );
  }

  Future<void> deleteConversation(String id) async {
    if (state.sending) return;
    try {
      await _deps.chats.deleteConversation(id);
      final conversations = state.conversations
          .where((item) => item.id != id)
          .toList();
      if (state.conversationId == id) {
        _pendingPrefix = null;
        _lastBaseMessages = null;
        emit(
          state.copyWith(
            resetConversation: true,
            conversations: conversations,
            messages: const [],
            pendingTools: const [],
            streamingText: '',
            streamingReasoning: '',
            error: null,
          ),
        );
      } else {
        emit(state.copyWith(conversations: conversations));
      }
    } catch (e) {
      emit(state.copyWith(error: e.toString()));
    }
  }

  Future<void> send(String text) async {
    final content = text.trim();
    if (content.isEmpty || state.sending) return;
    _pendingPrefix = null;
    emit(
      state.copyWith(
        sending: true,
        error: null,
        streamingText: '',
        streamingReasoning: '',
        pendingTools: const [],
      ),
    );
    try {
      var conversationId = state.conversationId;
      if (conversationId == null) {
        final conversation = await _deps.chats.createConversation(
          title: content.length > 24 ? '${content.substring(0, 24)}…' : content,
          scopeType: projectId == null ? 'global' : 'project',
          scopeId: projectId,
        );
        conversationId = conversation.id;
        emit(
          state.copyWith(
            conversationId: conversation.id,
            conversations: [
              conversation,
              ...state.conversations.where((c) => c.id != conversation.id),
            ],
          ),
        );
      }
      final now = DateTime.now().toUtc().millisecondsSinceEpoch;
      final history = state.messages;
      final userMessage = await _deps.chats.appendMessage(
        ChatMessage(
          id: _uuid.v4(),
          conversationId: conversationId,
          role: ChatRole.user,
          content: content,
          createdAt: now,
        ),
      );
      emit(
        state.copyWith(
          conversationId: conversationId,
          messages: [...history, userMessage],
        ),
      );

      _lastBaseMessages = _deps.ai.chatMessages(
        userMessage: content,
        history: history,
        project: _project,
        workspaceContext: _workspaceContext,
      );
      await _respond(_lastBaseMessages!, tools: _deps.projectTools.definitions);
    } on ai.AiException catch (e) {
      emit(state.copyWith(sending: false, error: e.userMessage));
    } catch (e) {
      emit(state.copyWith(sending: false, error: e.toString()));
    }
  }

  Future<void> confirmPending() async {
    if (state.pendingTools.isEmpty || state.sending) return;
    final pending = List<PendingToolCall>.from(state.pendingTools);
    final prefix = _pendingPrefix;
    _pendingPrefix = null;
    emit(
      state.copyWith(
        sending: true,
        pendingTools: const [],
        error: null,
        streamingText: '',
        streamingReasoning: '',
      ),
    );
    final results = <ai.AiMessage>[];
    final failures = <String>[];
    for (final item in pending) {
      final stopwatch = Stopwatch()..start();
      final output = await _deps.projectTools.execute(item.call);
      stopwatch.stop();
      final ok = _isOk(output);
      if (!ok) failures.add(item.summary);
      await _deps.toolCalls.updateStatus(
        item.call.id,
        ok ? ToolCallStatus.completed : ToolCallStatus.failed,
        error: ok ? null : _errorFrom(output),
        resultSummary: _brief(output),
        durationMs: stopwatch.elapsedMilliseconds,
      );
      results.add(
        ai.AiMessage(
          role: ai.AiRole.tool,
          toolCallId: item.call.id,
          content: output,
        ),
      );
    }

    final calls = pending.map((e) => e.call).toList();
    final messages = <ai.AiMessage>[];
    if (prefix != null) {
      messages.addAll(prefix);
    } else {
      messages.addAll(_lastBaseMessages ?? _fallbackBase());
      messages.add(ai.AiMessage(role: ai.AiRole.assistant, toolCalls: calls));
    }
    messages.addAll(results);
    try {
      await _respond(messages, tools: null);
      if (failures.isNotEmpty && state.error == null) {
        emit(state.copyWith(error: '部分操作没有完成：${failures.join('；')}'));
      }
    } on ai.AiException catch (e) {
      final summary = pending.map((e) => e.summary).join('；');
      await _appendAssistant('已执行：$summary。\n生成回复时出错：${e.userMessage}');
      emit(
        state.copyWith(
          sending: false,
          streamingText: '',
          streamingReasoning: '',
          error: e.userMessage,
        ),
      );
    } catch (e) {
      emit(state.copyWith(sending: false, error: e.toString()));
    }
  }

  Future<void> rejectPending() async {
    if (state.pendingTools.isEmpty) return;
    final pending = List<PendingToolCall>.from(state.pendingTools);
    _pendingPrefix = null;
    for (final item in pending) {
      await _deps.toolCalls.updateStatus(
        item.call.id,
        ToolCallStatus.rejected,
        error: '用户取消执行',
      );
    }
    await _appendAssistant('好的，这次先不改动。需要调整时再告诉我。');
    emit(
      state.copyWith(
        pendingTools: const [],
        sending: false,
        streamingText: '',
        streamingReasoning: '',
      ),
    );
  }

  void clearError() => emit(state.copyWith(error: null));

  Future<void> _respond(
    List<ai.AiMessage> messages, {
    required List<ai.AiToolDefinition>? tools,
    int depth = 0,
  }) async {
    if (depth > 4) {
      emit(
        state.copyWith(
          sending: false,
          streamingText: '',
          streamingReasoning: '',
          error: '操作步骤太多，先停一下。请把要做的事拆小一点再试。',
        ),
      );
      return;
    }
    final result = await _streamRound(messages, tools: tools);
    if (result.failure != null) {
      emit(
        state.copyWith(
          sending: false,
          streamingText: '',
          streamingReasoning: '',
          error: result.failure,
        ),
      );
      return;
    }

    final calls = result.toolCalls;
    if (calls.isEmpty) {
      final answer = result.text.trim();
      if (answer.isEmpty) {
        emit(
          state.copyWith(
            sending: false,
            streamingText: '',
            streamingReasoning: '',
            error: depth > 0 ? '操作可能已完成，但 AI 没有生成回复。' : 'AI 没有返回内容，请重试',
          ),
        );
        return;
      }
      await _appendAssistant(answer);
      _lastBaseMessages = null;
      _pendingPrefix = null;
      emit(
        state.copyWith(
          sending: false,
          streamingText: '',
          streamingReasoning: '',
          pendingTools: const [],
        ),
      );
      return;
    }

    final readOnly = <ai.AiToolCall>[];
    final writes = <ai.AiToolCall>[];
    for (final call in calls) {
      final known = _deps.projectTools.definitions.any(
        (d) => d.name == call.name,
      );
      if (!known) {
        emit(
          state.copyWith(
            sending: false,
            streamingText: '',
            streamingReasoning: '',
            error: '模型调用了不支持的工具：${call.name}',
          ),
        );
        return;
      }
      (_deps.projectTools.isWrite(call.name) ? writes : readOnly).add(call);
    }

    if (result.text.trim().isNotEmpty) {
      await _appendAssistant(result.text.trim());
    }
    final assistantMessage = ai.AiMessage(
      role: ai.AiRole.assistant,
      content: result.text.trim(),
      toolCalls: calls,
    );
    final toolMessages = <ai.AiMessage>[];
    for (final call in readOnly) {
      final stopwatch = Stopwatch()..start();
      await _deps.toolCalls.record(
        AiToolCall(
          id: call.id,
          toolName: call.name,
          argumentsJson: call.arguments,
          conversationId: state.conversationId,
          resultSummary: await _deps.projectTools.summarize(call),
          status: ToolCallStatus.pending,
          createdAt: DateTime.now().toUtc().millisecondsSinceEpoch,
        ),
      );
      final output = await _deps.projectTools.execute(call);
      stopwatch.stop();
      final ok = _isOk(output);
      await _deps.toolCalls.updateStatus(
        call.id,
        ok ? ToolCallStatus.completed : ToolCallStatus.failed,
        error: ok ? null : _errorFrom(output),
        resultSummary: _brief(output),
        durationMs: stopwatch.elapsedMilliseconds,
      );
      toolMessages.add(
        ai.AiMessage(
          role: ai.AiRole.tool,
          toolCallId: call.id,
          content: output,
        ),
      );
    }

    if (writes.isEmpty) {
      await _respond(
        [...messages, assistantMessage, ...toolMessages],
        tools: tools,
        depth: depth + 1,
      );
      return;
    }

    final pending = <PendingToolCall>[];
    for (final call in writes) {
      final item = PendingToolCall(
        call: call,
        summary: await _deps.projectTools.summarize(call),
        write: true,
      );
      pending.add(item);
      await _deps.toolCalls.record(
        AiToolCall(
          id: call.id,
          toolName: call.name,
          argumentsJson: call.arguments,
          conversationId: state.conversationId,
          resultSummary: item.summary,
          status: ToolCallStatus.pending,
          createdAt: DateTime.now().toUtc().millisecondsSinceEpoch,
        ),
      );
    }
    _pendingPrefix = [...messages, assistantMessage, ...toolMessages];
    emit(
      state.copyWith(
        sending: false,
        streamingText: '',
        streamingReasoning: '',
        pendingTools: pending,
      ),
    );
  }

  Future<_RoundResult> _streamRound(
    List<ai.AiMessage> messages, {
    required List<ai.AiToolDefinition>? tools,
  }) async {
    final text = StringBuffer();
    final reasoning = StringBuffer();
    final builders = <int, _ToolCallBuilder>{};
    String? failure;
    await for (final event in _deps.ai.stream(messages, tools: tools)) {
      if (event is ai.AiTextDelta) {
        text.write(event.text);
        emit(state.copyWith(streamingText: text.toString()));
      } else if (event is ai.AiReasoningDelta) {
        reasoning.write(event.text);
        emit(state.copyWith(streamingReasoning: reasoning.toString()));
      } else if (event is ai.AiToolDelta) {
        final builder = builders.putIfAbsent(event.index, _ToolCallBuilder.new);
        if (event.id != null && event.id!.isNotEmpty) builder.id = event.id;
        if (event.name != null && event.name!.isNotEmpty) {
          builder.name.write(event.name);
        }
        if (event.arguments != null) builder.arguments.write(event.arguments);
      } else if (event is ai.AiFailure) {
        failure = event.message;
        break;
      }
    }
    final keys = builders.keys.toList()..sort();
    return _RoundResult(
      text: text.toString(),
      reasoning: reasoning.toString(),
      toolCalls: keys
          .map((key) {
            final b = builders[key]!;
            return ai.AiToolCall(
              id: b.id?.isNotEmpty == true ? b.id! : _uuid.v4(),
              name: b.name.toString().trim(),
              arguments: b.arguments.toString(),
            );
          })
          .where((call) => call.name.isNotEmpty)
          .toList(),
      failure: failure,
    );
  }

  Future<ChatMessage> _appendAssistant(String content) async {
    final message = await _deps.chats.appendMessage(
      ChatMessage(
        id: _uuid.v4(),
        conversationId: state.conversationId ?? '',
        role: ChatRole.assistant,
        content: content,
        createdAt: DateTime.now().toUtc().millisecondsSinceEpoch,
      ),
    );
    emit(state.copyWith(messages: [...state.messages, message]));
    return message;
  }

  List<ai.AiMessage> _fallbackBase() {
    final messages = state.messages;
    final index = messages.lastIndexWhere((m) => m.role == ChatRole.user);
    final lastUser = index >= 0 ? messages[index].content : '（继续刚才的对话）';
    final history = index > 0 ? messages.sublist(0, index) : <ChatMessage>[];
    return _deps.ai.chatMessages(
      userMessage: lastUser,
      history: history,
      project: _project,
      workspaceContext: _workspaceContext,
    );
  }

  bool _isOk(String output) {
    try {
      final decoded = jsonDecode(output);
      return decoded is Map && decoded['ok'] == true;
    } catch (_) {
      return false;
    }
  }

  String? _errorFrom(String output) {
    try {
      final decoded = jsonDecode(output);
      if (decoded is Map) return decoded['error']?.toString();
    } catch (_) {}
    return output;
  }

  String _brief(String output) =>
      output.length <= 500 ? output : '${output.substring(0, 500)}…';
}

class _RoundResult {
  const _RoundResult({
    required this.text,
    required this.reasoning,
    required this.toolCalls,
    required this.failure,
  });

  final String text;
  final String reasoning;
  final List<ai.AiToolCall> toolCalls;
  final String? failure;
}

class _ToolCallBuilder {
  String? id;
  final StringBuffer name = StringBuffer();
  final StringBuffer arguments = StringBuffer();
}
