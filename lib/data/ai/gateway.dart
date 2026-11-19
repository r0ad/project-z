import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:dio/io.dart';

import '../../domain/models.dart' hide AiToolCall;
import 'sse.dart';
import 'types.dart';

abstract interface class AiGateway {
  Future<AiCompletion> complete({
    required AiConfig config,
    required String apiKey,
    required List<AiMessage> messages,
    List<AiToolDefinition>? tools,
    bool jsonMode = false,
    CancelToken? cancelToken,
  });

  Stream<AiStreamEvent> stream({
    required AiConfig config,
    required String apiKey,
    required List<AiMessage> messages,
    List<AiToolDefinition>? tools,
  });

  Future<void> testConnection({
    required AiConfig config,
    required String apiKey,
  });
}

class OpenAiCompatibleGateway implements AiGateway {
  OpenAiCompatibleGateway({Dio? dio, String? proxy})
    : _customDio = dio != null,
      _proxy = _normalizeProxy(proxy),
      _dio = dio ?? _buildDio(_normalizeProxy(proxy));

  final bool _customDio;
  String? _proxy;
  Dio _dio;

  /// 支持 `host:port` 或 `http://host:port`，空字符串表示直连。
  /// 进入设置页修改后由 [AiService] 在每次请求前刷新；地址未变时复用连接池。
  void setProxy(String? proxy) {
    if (_customDio) return;
    final next = _normalizeProxy(proxy);
    if (next == _proxy) return;
    _proxy = next;
    _dio = _buildDio(next);
  }

  static Dio _buildDio(String? proxy) {
    final address = _normalizeProxy(proxy);
    if (address == null) return Dio();
    return Dio()
      ..httpClientAdapter = IOHttpClientAdapter(
        createHttpClient: () {
          final client = HttpClient();
          client.findProxy = (_) => 'PROXY $address';
          return client;
        },
      );
  }

  static String? _normalizeProxy(String? raw) {
    var value = raw?.trim() ?? '';
    if (value.isEmpty) return null;
    value = value.replaceFirst(RegExp(r'^[a-zA-Z]+://'), '');
    value = value.replaceAll(RegExp(r'/+$'), '');
    return value.isEmpty ? null : value;
  }

  Uri _endpoint(AiConfig config) {
    var base = config.baseUrl.trim();
    while (base.endsWith('/')) {
      base = base.substring(0, base.length - 1);
    }
    if (base.endsWith('/chat/completions')) return Uri.parse(base);
    return Uri.parse('$base/chat/completions');
  }

  Map<String, dynamic> _body(
    AiConfig config,
    List<AiMessage> messages, {
    List<AiToolDefinition>? tools,
    bool jsonMode = false,
    bool stream = false,
  }) {
    return {
      'model': config.model,
      'messages': messages.map((e) => e.toJson()).toList(),
      'temperature': config.temperature,
      'max_tokens': config.maxTokens,
      if (stream) 'stream': true,
      if (stream) 'stream_options': {'include_usage': true},
      if (tools != null && tools.isNotEmpty)
        'tools': tools.map((e) => e.toJson()).toList(),
      if (jsonMode) 'response_format': {'type': 'json_object'},
    };
  }

  Options _options(AiConfig config, String apiKey, {bool stream = false}) =>
      Options(
        responseType: stream ? ResponseType.stream : ResponseType.json,
        validateStatus: (_) => true,
        headers: {
          'Authorization': 'Bearer $apiKey',
          'Content-Type': 'application/json',
          'Accept': stream ? 'text/event-stream' : 'application/json',
        },
        receiveTimeout: Duration(seconds: config.timeoutSeconds),
        sendTimeout: Duration(seconds: config.timeoutSeconds),
        connectTimeout: const Duration(seconds: 15),
      );

  @override
  Future<AiCompletion> complete({
    required AiConfig config,
    required String apiKey,
    required List<AiMessage> messages,
    List<AiToolDefinition>? tools,
    bool jsonMode = false,
    CancelToken? cancelToken,
  }) async {
    try {
      final response = await _dio.post<dynamic>(
        _endpoint(config).toString(),
        data: _body(config, messages, tools: tools, jsonMode: jsonMode),
        options: _options(config, apiKey),
        cancelToken: cancelToken,
      );
      if ((response.statusCode ?? 0) >= 400) {
        throw _mapError(response.statusCode, _stringify(response.data));
      }
      final data = response.data is String
          ? jsonDecode(response.data as String) as Map<String, dynamic>
          : (response.data as Map).cast<String, dynamic>();
      final choice =
          ((data['choices'] as List?)?.firstOrNull as Map?)
              ?.cast<String, dynamic>() ??
          const {};
      final message =
          (choice['message'] as Map?)?.cast<String, dynamic>() ?? const {};
      final calls = ((message['tool_calls'] as List?) ?? const []).map((raw) {
        final call = (raw as Map).cast<String, dynamic>();
        final fn =
            (call['function'] as Map?)?.cast<String, dynamic>() ?? const {};
        return AiToolCall(
          id: (call['id'] as String?) ?? '',
          name: (fn['name'] as String?) ?? '',
          arguments: (fn['arguments'] as String?) ?? '{}',
        );
      }).toList();
      final rawUsage = data['usage'];
      return AiCompletion(
        content: (message['content'] as String?) ?? '',
        reasoning: (message['reasoning_content'] as String?) ?? '',
        toolCalls: calls,
        finishReason: choice['finish_reason'] as String?,
        usage: rawUsage is Map
            ? AiUsage(
                promptTokens: (rawUsage['prompt_tokens'] as num?)?.toInt() ?? 0,
                completionTokens:
                    (rawUsage['completion_tokens'] as num?)?.toInt() ?? 0,
                totalTokens: (rawUsage['total_tokens'] as num?)?.toInt() ?? 0,
              )
            : null,
      );
    } on DioException catch (e) {
      throw _fromDio(e);
    }
  }

  @override
  Stream<AiStreamEvent> stream({
    required AiConfig config,
    required String apiKey,
    required List<AiMessage> messages,
    List<AiToolDefinition>? tools,
  }) async* {
    final cancelToken = CancelToken();
    var finished = false;
    try {
      final response = await _dio.post<ResponseBody>(
        _endpoint(config).toString(),
        data: _body(config, messages, tools: tools, stream: true),
        options: _options(config, apiKey, stream: true),
        cancelToken: cancelToken,
      );
      final body = response.data;
      if (body == null) {
        throw const AiException('空响应', kind: AiErrorKind.badResponse);
      }
      if ((response.statusCode ?? 0) >= 400) {
        final text = await body.stream
            .cast<List<int>>()
            .transform(utf8.decoder)
            .join();
        throw _mapError(response.statusCode, text);
      }
      final decoder = SseDecoder();
      await for (final text in body.stream.cast<List<int>>().transform(
        utf8.decoder,
      )) {
        for (final frame in decoder.add(text)) {
          if (frame.data.trim() == '[DONE]') {
            finished = true;
            yield const AiFinished();
            return;
          }
          try {
            final parsed = parseOpenAiChunk(frame.data);
            if (parsed.reasoning.isNotEmpty) {
              yield AiReasoningDelta(parsed.reasoning);
            }
            if (parsed.text.isNotEmpty) yield AiTextDelta(parsed.text);
            for (final tool in parsed.toolDeltas) {
              yield AiToolDelta(
                index: tool.index,
                id: tool.id,
                name: tool.name,
                arguments: tool.arguments,
              );
            }
            if (parsed.usage != null) yield AiUsageEvent(parsed.usage!);
            if (parsed.finishReason != null) {
              finished = true;
              yield AiFinished(finishReason: parsed.finishReason);
            }
          } on FormatException {
            // 忽略 Keep-Alive / 非 JSON 心跳。
          }
        }
      }
      for (final frame in decoder.flush()) {
        if (frame.data.trim() == '[DONE]') {
          finished = true;
          yield const AiFinished();
        }
      }
      if (!finished) yield const AiFinished(finishReason: 'stop');
    } on DioException catch (e) {
      if (CancelToken.isCancel(e)) {
        yield const AiFailure('请求已取消');
        return;
      }
      final mapped = _fromDio(e);
      yield AiFailure(mapped.userMessage, statusCode: mapped.statusCode);
    } on AiException catch (e) {
      yield AiFailure(e.userMessage, statusCode: e.statusCode);
    } finally {
      if (!finished) cancelToken.cancel('consumer cancelled');
    }
  }

  @override
  Future<void> testConnection({
    required AiConfig config,
    required String apiKey,
  }) async {
    await complete(
      config: config,
      apiKey: apiKey,
      messages: const [AiMessage(role: AiRole.user, content: '只回复 OK')],
    );
  }

  String _stringify(dynamic data) {
    if (data == null) return '';
    if (data is String) return data;
    try {
      return jsonEncode(data);
    } catch (_) {
      return data.toString();
    }
  }

  AiException _mapError(int? status, String body) {
    final code = status ?? 0;
    final kind = switch (code) {
      401 || 403 => AiErrorKind.unauthorized,
      404 => AiErrorKind.notFound,
      429 => AiErrorKind.rateLimited,
      >= 500 => AiErrorKind.server,
      _ => AiErrorKind.badResponse,
    };
    var message = body;
    try {
      final map = jsonDecode(body) as Map<String, dynamic>;
      final error = map['error'];
      if (error is Map) {
        message = (error['message'] as String?) ?? body;
      } else if (error is String) {
        message = error;
      }
    } catch (_) {}
    if (message.length > 400) message = message.substring(0, 400);
    return AiException(
      message.isEmpty ? 'HTTP $status' : message,
      statusCode: status,
      kind: kind,
    );
  }

  AiException _fromDio(DioException e) {
    final kind = switch (e.type) {
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.sendTimeout => AiErrorKind.timeout,
      DioExceptionType.connectionError => AiErrorKind.network,
      DioExceptionType.badResponse => AiErrorKind.server,
      DioExceptionType.cancel => AiErrorKind.cancelled,
      _ => AiErrorKind.unknown,
    };
    final status = e.response?.statusCode;
    if (status != null) return _mapError(status, _stringify(e.response?.data));
    return AiException(e.message ?? e.toString(), kind: kind);
  }
}
