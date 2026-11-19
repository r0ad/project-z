import 'dart:convert';
import 'dart:io';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:diandian/data/backup/remote_backup.dart';
import 'package:diandian/domain/repositories.dart';

class _MemSettings implements SettingsRepository {
  final Map<String, String> values = {};

  @override
  Future<String?> get(String key) async => values[key];

  @override
  Future<void> set(String key, String value) async => values[key] = value;

  @override
  Future<bool> getBool(String key, {bool defaultValue = false}) async =>
      values[key] == null ? defaultValue : values[key] == 'true';

  @override
  Future<void> setBool(String key, bool value) async =>
      values[key] = value.toString();
}

class _MemSecrets implements SecretStore {
  final Map<String, String> values = {};

  @override
  Future<String?> read(String key) async => values[key];

  @override
  Future<void> write(String key, String value) async => values[key] = value;

  @override
  Future<void> delete(String key) async => values.remove(key);
}

void main() {
  group('WebDavService', () {
    late HttpServer server;
    late _MemSettings settings;
    late _MemSecrets secrets;
    late WebDavService service;
    String? uploaded;

    setUp(() async {
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      uploaded = null;
      settings = _MemSettings();
      secrets = _MemSecrets();
      service = WebDavService(settings: settings, secrets: secrets);
      server.listen((request) async {
        final response = request.response;
        if (request.method == 'PUT') {
          uploaded = await utf8.decoder.bind(request).join();
          response.statusCode = HttpStatus.created;
        } else if (request.method == 'GET') {
          if (uploaded == null) {
            response.statusCode = HttpStatus.notFound;
          } else {
            response.headers.contentType = ContentType.json;
            response.write(uploaded);
          }
        } else {
          response.statusCode = HttpStatus.methodNotAllowed;
        }
        await response.close();
      });
      await service.saveConfig(
        url: 'http://127.0.0.1:${server.port}/dav/',
        username: 'user',
        password: 'pass',
      );
    });

    tearDown(() async => server.close(force: true));

    test('编辑保存后可以上传并下载 JSON', () async {
      await service.upload('{"format":"diandian-backup"}');
      expect(uploaded, '{"format":"diandian-backup"}');
      expect(await service.download(), '{"format":"diandian-backup"}');
      await service.test();
    });

    test('缺少凭据时给出中文错误', () async {
      final empty = WebDavService(
        settings: _MemSettings(),
        secrets: _MemSecrets(),
      );
      await expectLater(
        empty.upload('{}'),
        throwsA(isA<BackupRemoteException>()),
      );
    });
  });

  group('GitCodeService', () {
    late HttpServer server;
    late _MemSettings settings;
    late _MemSecrets secrets;
    late GitCodeService service;
    String? content;
    String? sha;
    Map<String, dynamic>? lastBody;

    setUp(() async {
      server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
      content = null;
      sha = null;
      lastBody = null;
      settings = _MemSettings();
      secrets = _MemSecrets();
      final dio = Dio(
        BaseOptions(
          baseUrl: 'http://127.0.0.1:${server.port}/api/v5',
          validateStatus: (status) => status != null && status < 500,
        ),
      );
      service = GitCodeService(settings: settings, secrets: secrets, dio: dio);
      server.listen((request) async {
        final response = request.response;
        response.headers.contentType = ContentType.json;
        final path = request.uri.path;
        if (path.endsWith('/branches/main')) {
          response.statusCode = HttpStatus.ok;
          response.write('{}');
        } else if (path.endsWith('/contents/diandian/backup.json')) {
          if (request.method == 'GET') {
            if (sha == null) {
              response.statusCode = HttpStatus.notFound;
            } else {
              response.write(
                jsonEncode({
                  'sha': sha,
                  'content': base64Encode(utf8.encode(content!)),
                }),
              );
            }
          } else {
            final body = jsonDecode(await utf8.decoder.bind(request).join());
            lastBody = body as Map<String, dynamic>;
            content = utf8.decode(base64Decode(body['content'] as String));
            sha = 'sha-1';
            response.statusCode = request.method == 'POST'
                ? HttpStatus.created
                : HttpStatus.ok;
            response.write('{}');
          }
        } else {
          response.statusCode = HttpStatus.notFound;
        }
        await response.close();
      });
      await service.saveConfig(
        repo: 'owner/repo',
        branch: 'main',
        path: 'diandian/backup.json',
        token: 'token-1',
      );
    });

    tearDown(() async => server.close(force: true));

    test('首次上传走 POST，再次上传带 sha 走 PUT', () async {
      await service.upload('{"a":1}');
      expect(lastBody?['sha'], isNull);
      expect(content, '{"a":1}');
      await service.upload('{"a":2}');
      expect(lastBody?['sha'], 'sha-1');
      expect(content, '{"a":2}');
    });

    test('下载会解码 base64 内容，test 检查分支', () async {
      await service.upload('{"hello":"点点"}');
      expect(await service.download(), '{"hello":"点点"}');
      await service.test();
    });
  });
}
