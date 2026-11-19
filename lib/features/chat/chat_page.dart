import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:go_router/go_router.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/markdown.dart';
import '../../core/ui.dart';
import '../../domain/models.dart';
import 'chat_cubit.dart';

class ChatPage extends StatelessWidget {
  const ChatPage({super.key, this.projectId, this.draft = ''});

  final String? projectId;
  final String draft;

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => ChatCubit(deps, projectId: projectId),
      child: _ChatView(draft: draft),
    );
  }
}

class _ChatView extends StatefulWidget {
  const _ChatView({required this.draft});
  final String draft;

  @override
  State<_ChatView> createState() => _ChatViewState();
}

class _ChatViewState extends State<_ChatView> {
  final _input = TextEditingController();
  final _scroll = ScrollController();
  bool _booted = false;
  bool _draftSent = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.read<ChatCubit>().load();
    });
  }

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _scrollToBottom() {
    if (!_scroll.hasClients) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!_scroll.hasClients) return;
      _scroll.animateTo(
        _scroll.position.maxScrollExtent,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
      );
    });
  }

  void _send() {
    final text = _input.text.trim();
    if (text.isEmpty) return;
    _input.clear();
    context.read<ChatCubit>().send(text);
  }

  @override
  Widget build(BuildContext context) {
    return BlocConsumer<ChatCubit, ChatState>(
      listener: (context, state) {
        if (state.error != null) {
          showSnack(context, state.error!, error: true);
          context.read<ChatCubit>().clearError();
        }
        if (!state.loading && !_booted) {
          _booted = true;
          if (widget.draft.trim().isNotEmpty && !_draftSent) {
            _draftSent = true;
            context.read<ChatCubit>().send(widget.draft);
          }
        }
        _scrollToBottom();
      },
      builder: (context, state) {
        return Scaffold(
          appBar: AppBar(
            leading: IconButton(
              onPressed: () =>
                  context.canPop() ? context.pop() : context.go('/'),
              icon: const Icon(Icons.arrow_back),
            ),
            title: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('AI 副驾'),
                if (state.projectTitle != null)
                  Text(
                    state.projectTitle!,
                    style: const TextStyle(
                      fontSize: 11,
                      color: AppColors.textMuted,
                    ),
                  ),
              ],
            ),
          ),
          body: Column(
            children: [
              Expanded(
                child: state.loading
                    ? const Center(child: CircularProgressIndicator())
                    : state.messages.isEmpty && !state.sending
                    ? _EmptyChat(
                        onPick: (text) {
                          _input.text = text;
                          _send();
                        },
                      )
                    : ListView.builder(
                        controller: _scroll,
                        padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                        itemCount:
                            state.messages.length + (state.sending ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index >= state.messages.length) {
                            return _Bubble(
                              role: ChatRole.assistant,
                              text: state.streamingText,
                              reasoning: state.streamingReasoning,
                              streaming: true,
                            );
                          }
                          final message = state.messages[index];
                          return _Bubble(
                            role: message.role,
                            text: message.content,
                          );
                        },
                      ),
              ),
              SafeArea(
                top: false,
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _input,
                          minLines: 1,
                          maxLines: 5,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _send(),
                          decoration: const InputDecoration(
                            hintText: '问点什么，或说说你现在的情况…',
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      IconButton.filled(
                        onPressed: state.sending ? null : _send,
                        icon: state.sending
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.arrow_upward),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        );
      },
    );
  }
}

class _Bubble extends StatelessWidget {
  const _Bubble({
    required this.role,
    required this.text,
    this.reasoning = '',
    this.streaming = false,
  });

  final ChatRole role;
  final String text;
  final String reasoning;
  final bool streaming;

  @override
  Widget build(BuildContext context) {
    final user = role == ChatRole.user;
    final thinking = streaming && text.trim().isEmpty;
    final hasReasoning = reasoning.trim().isNotEmpty;
    return Align(
      alignment: user ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        constraints: const BoxConstraints(maxWidth: 680),
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(14),
        decoration: BoxDecoration(
          color: user
              ? AppColors.seed.withValues(alpha: 0.14)
              : AppColors.surface,
          borderRadius: BorderRadius.only(
            topLeft: const Radius.circular(16),
            topRight: const Radius.circular(16),
            bottomLeft: Radius.circular(user ? 16 : 4),
            bottomRight: Radius.circular(user ? 4 : 16),
          ),
          border: Border.all(
            color: user
                ? AppColors.seed.withValues(alpha: 0.35)
                : AppColors.outline,
          ),
        ),
        child: user
            ? SelectableText(
                text,
                style: const TextStyle(fontSize: 14, height: 1.5),
              )
            : Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (thinking) ...[
                    Row(
                      children: [
                        const SizedBox(
                          width: 10,
                          height: 10,
                          child: CircularProgressIndicator(strokeWidth: 1.5),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          hasReasoning ? '正在思考…' : '正在连接…',
                          style: const TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                    if (hasReasoning) ...[
                      const SizedBox(height: 8),
                      Text(
                        reasoning,
                        maxLines: 8,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: AppColors.textMuted,
                          fontSize: 12,
                          height: 1.55,
                        ),
                      ),
                    ],
                  ] else
                    SelectionArea(
                      child: AiMarkdown(text, isStreaming: streaming),
                    ),
                  if (streaming && !thinking) ...[
                    const SizedBox(height: 6),
                    const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 8,
                          height: 8,
                          child: CircularProgressIndicator(strokeWidth: 1.4),
                        ),
                        SizedBox(width: 6),
                        Text(
                          '生成中…',
                          style: TextStyle(
                            color: AppColors.textMuted,
                            fontSize: 11,
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
      ),
    );
  }
}

class _EmptyChat extends StatelessWidget {
  const _EmptyChat({required this.onPick});
  final ValueChanged<String> onPick;

  static const _suggestions = [
    '帮我看下这周该优先推进什么',
    '我卡在目标太大，帮我拆小一点',
    '把最近的经验整理成一条知识',
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 40, 24, 24),
      children: [
        Center(
          child: Column(
            children: [
              Container(
                width: 64,
                height: 64,
                decoration: BoxDecoration(
                  color: AppColors.seed.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.auto_awesome,
                  color: AppColors.seed,
                  size: 30,
                ),
              ),
              const SizedBox(height: 18),
              const Text(
                '我在这里，和你一起把事推进',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              const Text(
                '可以聊目标、拆解、复盘，也可以让我帮你整理记录。\n我不会替你拍板，但会尽量把事实和选择摆清楚。',
                textAlign: TextAlign.center,
                style: TextStyle(
                  color: AppColors.textMuted,
                  height: 1.6,
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 28),
              for (final suggestion in _suggestions)
                Padding(
                  padding: const EdgeInsets.only(bottom: 10),
                  child: ActionChip(
                    label: Text(suggestion),
                    onPressed: () => onPick(suggestion),
                  ),
                ),
            ],
          ),
        ),
      ],
    );
  }
}
