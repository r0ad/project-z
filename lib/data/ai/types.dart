import 'package:equatable/equatable.dart';

enum AiRole {
  system('system'),
  user('user'),
  assistant('assistant'),
  tool('tool');

  const AiRole(this.value);
  final String value;

  static AiRole fromString(String value) =>
      values.firstWhere((e) => e.value == value, orElse: () => user);
}

class AiMessage extends Equatable {
  const AiMessage({required this.role, this.content = '', this.toolCallId, this.toolCalls});
  final AiRole role;
  final String content;
  final String? toolCallId;
  final List<AiToolCall>? toolCalls;

  Map<String, dynamic> toJson() => {
        'role': role.value,
        'content': content,
        if (toolCallId != null) 'tool_call_id': toolCallId,
        if (toolCalls != null && toolCalls!.isNotEmpty)
          'tool_calls': toolCalls!.map((e) => e.toJson()).toList(),
      };

  @override
  List<Object?> get props => [role, content, toolCallId, toolCalls];
}

class AiToolCall extends Equatable {
  const AiToolCall({required this.id, required this.name, required this.arguments});
  final String id;
  final String name;
  final String arguments;

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': 'function',
        'function': {'name': name, 'arguments': arguments},
      };

  @override
  List<Object?> get props => [id, name, arguments];
}

class AiToolDefinition extends Equatable {
  const AiToolDefinition({
    required this.name,
    required this.description,
    required this.parameters,
  });
  final String name;
  final String description;
  final Map<String, dynamic> parameters;

  Map<String, dynamic> toJson() => {
        'type': 'function',
        'function': {
          'name': name,
          'description': description,
          'parameters': parameters,
        },
      };

  @override
  List<Object?> get props => [name, description, parameters];
}

class AiUsage extends Equatable {
  const AiUsage({this.promptTokens = 0, this.completionTokens = 0, this.totalTokens = 0});
  final int promptTokens;
  final int completionTokens;
  final int totalTokens;

  @override
  List<Object?> get props => [promptTokens, completionTokens, totalTokens];
}

class AiCompletion extends Equatable {
  const AiCompletion({
    this.content = '',
    this.reasoning = '',
    this.toolCalls = const [],
    this.usage,
    this.finishReason,
  });
  final String content;
  final String reasoning;
  final List<AiToolCall> toolCalls;
  final AiUsage? usage;
  final String? finishReason;

  @override
  List<Object?> get props => [content, reasoning, toolCalls, usage, finishReason];
}

sealed class AiStreamEvent {
  const AiStreamEvent();
}

class AiTextDelta extends AiStreamEvent {
  const AiTextDelta(this.text);
  final String text;
}

class AiReasoningDelta extends AiStreamEvent {
  const AiReasoningDelta(this.text);
  final String text;
}

class AiToolDelta extends AiStreamEvent {
  const AiToolDelta({
    required this.index,
    this.id,
    this.name,
    this.arguments,
  });
  final int index;
  final String? id;
  final String? name;
  final String? arguments;
}

class AiUsageEvent extends AiStreamEvent {
  const AiUsageEvent(this.usage);
  final AiUsage usage;
}

class AiFinished extends AiStreamEvent {
  const AiFinished({this.finishReason});
  final String? finishReason;
}

class AiFailure extends AiStreamEvent {
  const AiFailure(this.message, {this.statusCode});
  final String message;
  final int? statusCode;
}

class AiException implements Exception {
  const AiException(this.message, {this.statusCode, this.kind = AiErrorKind.unknown});
  final String message;
  final int? statusCode;
  final AiErrorKind kind;

  String get userMessage => switch (kind) {
        AiErrorKind.unauthorized => 'API Key 无效或已过期，请到设置中检查',
        AiErrorKind.notFound => '模型或接口地址不存在，请检查供应商配置',
        AiErrorKind.rateLimited => '请求过于频繁或额度不足，请稍后再试',
        AiErrorKind.timeout => '请求超时，请检查网络或调大超时时间',
        AiErrorKind.network => '网络不可用，请检查连接',
        AiErrorKind.cancelled => '请求已取消',
        AiErrorKind.badResponse => 'AI 返回内容无法解析，请重试',
        AiErrorKind.server => 'AI 服务暂时不可用，请稍后再试',
        AiErrorKind.unknown => message,
      };

  @override
  String toString() => 'AiException($kind, $statusCode): $message';
}

enum AiErrorKind {
  unauthorized,
  notFound,
  rateLimited,
  timeout,
  network,
  cancelled,
  badResponse,
  server,
  unknown,
}
