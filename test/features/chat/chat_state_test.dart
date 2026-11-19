import 'package:diandian/features/chat/chat_cubit.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('resetConversation 清空当前会话，普通 copy 保留', () {
    const state = ChatState(
      loading: false,
      conversationId: 'conversation-1',
      messages: [],
    );

    expect(state.copyWith(loading: true).conversationId, 'conversation-1');
    final reset = state.copyWith(
      resetConversation: true,
      messages: const [],
      pendingTools: const [],
    );
    expect(reset.conversationId, isNull);
    expect(reset.messages, isEmpty);
  });

  test('新会话状态不会继承流式内容', () {
    const state = ChatState(
      loading: false,
      conversationId: 'conversation-1',
      streamingText: '生成中',
      streamingReasoning: '推理中',
    );

    final reset = state.copyWith(
      resetConversation: true,
      streamingText: '',
      streamingReasoning: '',
    );
    expect(reset.conversationId, isNull);
    expect(reset.streamingText, isEmpty);
    expect(reset.streamingReasoning, isEmpty);
  });
}
