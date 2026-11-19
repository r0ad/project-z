import 'package:diandian/data/ai/sse.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('SSE decoder handles split packets and multi-line data', () {
    final decoder = SseDecoder();
    expect(decoder.add('data: {"choices":[{"delta":{"content":"你'), isEmpty);
    final frames = decoder.add('好"}}]}\n\ndata: [DONE]\n\n');
    expect(frames, hasLength(2));
    expect(frames.first.data, contains('你好'));
    expect(frames.last.data, '[DONE]');
  });

  test('SSE decoder handles CRLF and comments', () {
    final decoder = SseDecoder();
    final frames = decoder.add(': ping\r\ndata: {"a":1}\r\n\r\n');
    expect(frames, hasLength(1));
    expect(frames.single.data, '{"a":1}');
  });

  test('parse chunk extracts content, reasoning and tool calls', () {
    final chunk = parseOpenAiChunk(
      '{"choices":[{"delta":{"content":"hi","reasoning_content":"think",'
      '"tool_calls":[{"index":0,"id":"call_1","function":{"name":"search","arguments":"{\\"q\\":"}}]},'
      '"finish_reason":null}],"usage":{"prompt_tokens":3,"completion_tokens":2,"total_tokens":5}}',
    );
    expect(chunk.text, 'hi');
    expect(chunk.reasoning, 'think');
    expect(chunk.toolDeltas.single.name, 'search');
    expect(chunk.toolDeltas.single.arguments, '{"q":');
    expect(chunk.usage!.totalTokens, 5);
  });

  test('extractJson handles fenced and noisy output', () {
    expect(extractJson('好的：\n```json\n{"title":"x"}\n```\n完'), '{"title":"x"}');
    expect(extractJson('前缀 {"a":{"b":1}} 后缀'), '{"a":{"b":1}}');
    expect(extractJson('没有 json'), isNull);
  });
}
