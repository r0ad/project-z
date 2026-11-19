import 'dart:async';

import 'package:diandian/data/ai/gateway.dart';
import 'package:diandian/data/ai/service.dart';
import 'package:diandian/data/ai/types.dart';
import 'package:diandian/domain/models.dart';
import 'package:diandian/domain/repositories.dart';
import 'package:flutter_test/flutter_test.dart';

class _Gateway implements AiGateway {
  _Gateway(this.responses);
  final List<Object> responses;
  int calls = 0;
  List<AiMessage> lastMessages = const [];

  @override
  Future<AiCompletion> complete({
    required AiConfig config,
    required String apiKey,
    required List<AiMessage> messages,
    List<AiToolDefinition>? tools,
    bool jsonMode = false,
    dynamic cancelToken,
  }) async {
    lastMessages = messages;
    final item = responses[calls++];
    if (item is Exception) throw item;
    return AiCompletion(content: item as String);
  }

  @override
  Stream<AiStreamEvent> stream({
    required AiConfig config,
    required String apiKey,
    required List<AiMessage> messages,
    List<AiToolDefinition>? tools,
  }) => const Stream.empty();

  @override
  Future<void> testConnection({
    required AiConfig config,
    required String apiKey,
  }) async {}
}

class _Configs implements AiConfigRepository {
  _Configs(this.config);
  final AiConfig? config;
  @override
  Future<AiConfig?> active() async => config;
  @override
  Future<List<AiConfig>> list() async => config == null ? [] : [config!];
  @override
  Future<AiConfig> save(AiConfig config, {String? apiKey}) async => config;
  @override
  Future<void> setActive(String id) async {}
  @override
  Future<void> delete(String id) async {}
  @override
  Future<String?> readApiKey(String configId) async => 'sk-test';
}

class _Settings implements SettingsRepository {
  @override
  Future<String?> get(String key) async => null;
  @override
  Future<void> set(String key, String value) async {}
  @override
  Future<bool> getBool(String key, {bool defaultValue = false}) async =>
      defaultValue;
  @override
  Future<void> setBool(String key, bool value) async {}
}

class _Secrets implements SecretStore {
  @override
  Future<String?> read(String key) async => 'sk-test';
  @override
  Future<void> write(String key, String value) async {}
  @override
  Future<void> delete(String key) async {}
}

AiConfig _config() => AiConfig(
  id: 'c1',
  name: 'test',
  providerKey: 'deepseek',
  baseUrl: 'https://example.com/v1',
  model: 'deepseek-flash',
  isActive: true,
  createdAt: 0,
  updatedAt: 0,
);

void main() {
  test('planProject parses fenced JSON and trims milestones', () async {
    final gateway = _Gateway([
      '好的\n```json\n{"goal":"三个月上线","milestones":[{"title":"完成原型","description":"可演示","dueDate":"2026-12-01"},{"title":"内测","description":""}]}\n```',
    ]);
    final service = AiService(
      gateway: gateway,
      configs: _Configs(_config()),
      secrets: _Secrets(),
      settings: _Settings(),
    );
    final plan = await service.planProject(title: '点点', description: '重写');
    expect(plan.goal, '三个月上线');
    expect(plan.milestones, hasLength(2));
    expect(plan.milestones.first.dueDate, '2026-12-01');
    expect(gateway.lastMessages.last.content, contains('今天日期：'));
  });

  test('structureLog returns three fields and milestone', () async {
    final gateway = _Gateway([
      '{"progressText":"完成登录","problemText":"接口慢","planText":"优化查询","milestoneTitle":"登录模块"}',
    ]);
    final service = AiService(
      gateway: gateway,
      configs: _Configs(_config()),
      secrets: _Secrets(),
      settings: _Settings(),
    );
    final log = await service.structureLog(
      rawInput: '今天把登录做完了，接口有点慢，明天优化',
      projectTitle: '点点',
      milestoneTitles: ['登录模块'],
    );
    expect(log.progressText, '完成登录');
    expect(log.problemText, '接口慢');
    expect(log.milestoneTitle, '登录模块');
  });

  test('invalid JSON is retried once with correction message', () async {
    final gateway = _Gateway(['抱歉，我不能输出 JSON', '{"goal":"g","milestones":[]}']);
    final service = AiService(
      gateway: gateway,
      configs: _Configs(_config()),
      secrets: _Secrets(),
      settings: _Settings(),
    );
    final plan = await service.planProject(title: 't', description: 'd');
    expect(plan.goal, 'g');
    expect(gateway.calls, 2);
    expect(gateway.lastMessages.last.content, contains('只输出合法 JSON'));
  });

  test('missing config throws friendly error', () async {
    final service = AiService(
      gateway: _Gateway([]),
      configs: _Configs(null),
      secrets: _Secrets(),
      settings: _Settings(),
    );
    expect(
      () => service.planProject(title: 't', description: 'd'),
      throwsA(isA<AiException>()),
    );
  });
}
