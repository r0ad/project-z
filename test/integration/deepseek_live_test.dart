import 'dart:io';

import 'package:diandian/data/ai/gateway.dart';
import 'package:diandian/domain/models.dart';
import 'package:diandian/data/ai/types.dart';
import 'package:flutter_test/flutter_test.dart';

/// 真实 DeepSeek 连通性测试。默认跳过；设置 DEEPSEEK_API_KEY 后运行：
/// flutter test test/integration/deepseek_live_test.dart
void main() {
  final key = Platform.environment['DEEPSEEK_API_KEY'] ?? '';

  test(
    'DeepSeek 官方接口返回非空内容（complete + stream）',
    () async {
      final gateway = OpenAiCompatibleGateway();
      final now = DateTime.now().millisecondsSinceEpoch;
      final config = AiConfig(
        id: 'live-test',
        name: 'DeepSeek',
        providerKey: 'deepseek',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-flash',
        createdAt: now,
        updatedAt: now,
      );

      final completion = await gateway.complete(
        config: config,
        apiKey: key,
        messages: const [AiMessage(role: AiRole.user, content: '只回复 OK 两个字母')],
      );
      expect(completion.content.trim(), isNotEmpty);

      final buffer = StringBuffer();
      var finished = false;
      await for (final event in gateway.stream(
        config: config,
        apiKey: key,
        messages: const [
          AiMessage(role: AiRole.user, content: '用一句中文说明你在正常工作'),
        ],
      )) {
        if (event is AiTextDelta) buffer.write(event.text);
        if (event is AiFinished) finished = true;
      }
      expect(buffer.toString().trim(), isNotEmpty);
      expect(finished, isTrue);
    },
    skip: key.isEmpty ? '未设置 DEEPSEEK_API_KEY' : false,
    timeout: const Timeout(Duration(seconds: 90)),
  );
}
