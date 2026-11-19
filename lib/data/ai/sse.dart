import 'dart:convert';

import 'types.dart';

class SseFrame {
  const SseFrame(this.data, {this.event});
  final String data;
  final String? event;
}

/// 增量 SSE 解码器：处理半包、CRLF、多行 data 和空行分隔。
class SseDecoder {
  final StringBuffer _buffer = StringBuffer();
  final List<String> _data = [];
  String? _event;

  List<SseFrame> add(String chunk) {
    _buffer.write(chunk);
    final frames = <SseFrame>[];
    while (true) {
      final text = _buffer.toString();
      final newline = text.indexOf('\n');
      if (newline < 0) break;
      var line = text.substring(0, newline);
      _buffer
        ..clear()
        ..write(text.substring(newline + 1));
      if (line.endsWith('\r')) line = line.substring(0, line.length - 1);
      if (line.isEmpty) {
        if (_data.isNotEmpty) {
          frames.add(SseFrame(_data.join('\n'), event: _event));
        }
        _data.clear();
        _event = null;
        continue;
      }
      if (line.startsWith(':')) continue;
      if (line.startsWith('data:')) {
        var value = line.substring(5);
        if (value.startsWith(' ')) value = value.substring(1);
        _data.add(value);
      } else if (line.startsWith('event:')) {
        _event = line.substring(6).trim();
      }
    }
    return frames;
  }

  List<SseFrame> flush() {
    if (_data.isEmpty) return const [];
    final frame = SseFrame(_data.join('\n'), event: _event);
    _data.clear();
    _event = null;
    return [frame];
  }
}

class ParsedChunk {
  const ParsedChunk({
    this.text = '',
    this.reasoning = '',
    this.toolDeltas = const [],
    this.finishReason,
    this.usage,
  });
  final String text;
  final String reasoning;
  final List<AiToolDelta> toolDeltas;
  final String? finishReason;
  final AiUsage? usage;
}

ParsedChunk parseOpenAiChunk(String data) {
  final map = jsonDecode(data) as Map<String, dynamic>;
  final choices = (map['choices'] as List?) ?? const [];
  var text = '';
  var reasoning = '';
  String? finish;
  final toolDeltas = <AiToolDelta>[];
  if (choices.isNotEmpty) {
    final choice = choices.first as Map<String, dynamic>;
    finish = choice['finish_reason'] as String?;
    final delta =
        (choice['delta'] as Map?)?.cast<String, dynamic>() ??
        (choice['message'] as Map?)?.cast<String, dynamic>() ??
        const {};
    text = (delta['content'] as String?) ?? '';
    reasoning =
        (delta['reasoning_content'] as String?) ??
        (delta['reasoning'] as String?) ??
        '';
    final calls = (delta['tool_calls'] as List?) ?? const [];
    for (final raw in calls) {
      final call = (raw as Map).cast<String, dynamic>();
      final fn = (call['function'] as Map?)?.cast<String, dynamic>();
      toolDeltas.add(
        AiToolDelta(
          index: (call['index'] as num?)?.toInt() ?? 0,
          id: call['id'] as String?,
          name: fn?['name'] as String?,
          arguments: fn?['arguments'] as String?,
        ),
      );
    }
  }
  AiUsage? usage;
  final rawUsage = map['usage'];
  if (rawUsage is Map) {
    usage = AiUsage(
      promptTokens: (rawUsage['prompt_tokens'] as num?)?.toInt() ?? 0,
      completionTokens: (rawUsage['completion_tokens'] as num?)?.toInt() ?? 0,
      totalTokens: (rawUsage['total_tokens'] as num?)?.toInt() ?? 0,
    );
  }
  return ParsedChunk(
    text: text,
    reasoning: reasoning,
    toolDeltas: toolDeltas,
    finishReason: finish,
    usage: usage,
  );
}

/// 从模型输出中提取 JSON 对象/数组，兼容 ```json 围栏和前后废话。
String? extractJson(String raw) {
  var text = raw.trim();
  final fence = RegExp(r'```(?:json)?\s*([\s\S]*?)```').firstMatch(text);
  if (fence != null) text = fence.group(1)!.trim();
  final start = text.indexOf(RegExp(r'[\[{]'));
  if (start < 0) return null;
  final open = text[start];
  final close = open == '{' ? '}' : ']';
  var depth = 0;
  var inString = false;
  var escaped = false;
  for (var i = start; i < text.length; i++) {
    final ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch == r'\') {
        escaped = true;
      } else if (ch == '"') {
        inString = false;
      }
      continue;
    }
    if (ch == '"') {
      inString = true;
    } else if (ch == open) {
      depth++;
    } else if (ch == close) {
      depth--;
      if (depth == 0) return text.substring(start, i + 1);
    }
  }
  return null;
}
