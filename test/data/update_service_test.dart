import 'dart:convert';
import 'dart:io';

import 'package:diandian/data/local/app_database.dart';
import 'package:diandian/data/repositories/content_repositories.dart';
import 'package:diandian/data/update/update_service.dart';
import 'package:drift/native.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  late HttpServer server;
  late AppDatabase db;
  late DriftSettingsRepository settings;
  late UpdateService updates;
  late String base;

  setUp(() async {
    db = AppDatabase(NativeDatabase.memory());
    settings = DriftSettingsRepository(db);
    updates = UpdateService(settings: settings);
    server = await HttpServer.bind(InternetAddress.loopbackIPv4, 0);
    base = 'http://127.0.0.1:${server.port}/latest';
    await settings.set(UpdateService.manifestKey, base);
    server.listen((request) async {
      request.response.headers.contentType = ContentType.json;
      if (request.uri.path == '/latest') {
        request.response.write(
          jsonEncode({
            'tag_name': 'v2.1.0',
            'body': '修复若干问题',
            'html_url': 'https://example.com/release',
            'assets': [
              {
                'name': 'diandian-android.apk',
                'browser_download_url': 'https://example.com/app.apk',
              },
              {
                'name': 'diandian-windows-setup.exe',
                'browser_download_url': 'https://example.com/setup.exe',
              },
              {
                'name': 'diandian-windows-x64.zip',
                'browser_download_url': 'https://example.com/portable.zip',
              },
              {
                'name': 'diandian-ios-unsigned.zip',
                'browser_download_url': 'https://example.com/ios.zip',
              },
            ],
          }),
        );
      } else if (request.uri.path == '/static') {
        request.response.write(
          jsonEncode({
            'version': '2.1.1',
            'notes': '静态清单',
            'pageUrl': 'https://example.com/tag',
            'downloads': {
              'android': 'https://example.com/a.apk',
              'windowsSetup': 'https://example.com/setup.exe',
              'windowsPortable': 'https://example.com/zip',
              'ios': 'https://example.com/ios.zip',
            },
          }),
        );
      } else if (request.uri.path == '/limited') {
        request.response.statusCode = 403;
        request.response.write(
          jsonEncode({'message': 'API rate limit exceeded'}),
        );
      } else if (request.uri.path == '/legacy') {
        request.response.write(
          jsonEncode([
            {
              'version': '2.0.5',
              'comment': '旧清单',
              'downloadUrl': 'https://example.com/old.apk',
            },
            {
              'version': '2.3.0',
              'comment': '最新',
              'downloadUrl': 'https://example.com/new.apk',
            },
          ]),
        );
      } else {
        request.response.statusCode = 404;
      }
      await request.response.close();
    });
  });

  tearDown(() async {
    await server.close(force: true);
    await db.close();
  });

  test('parses a GitHub latest release and picks platform assets', () async {
    final info = await updates.check(currentVersion: '2.0.0');
    expect(info, isNotNull);
    expect(info!.version, '2.1.0');
    expect(info.notes, '修复若干问题');
    expect(info.androidUrl, 'https://example.com/app.apk');
    expect(info.windowsSetupUrl, 'https://example.com/setup.exe');
    expect(info.windowsPortableUrl, 'https://example.com/portable.zip');
    expect(info.iosUrl, 'https://example.com/ios.zip');
  });

  test('returns null when current version is newer', () async {
    expect(await updates.check(currentVersion: '2.1.0'), isNull);
    expect(await updates.check(currentVersion: '2.2.0'), isNull);
  });

  test('parses the static version.json manifest', () async {
    await settings.set(
      UpdateService.manifestKey,
      'http://127.0.0.1:${server.port}/static',
    );
    final info = await updates.check(currentVersion: '2.1.0');
    expect(info!.version, '2.1.1');
    expect(info.notes, '静态清单');
    expect(info.androidUrl, 'https://example.com/a.apk');
    expect(info.windowsSetupUrl, 'https://example.com/setup.exe');
    expect(info.pageUrl, 'https://example.com/tag');
  });

  test('reports GitHub rate limiting clearly', () async {
    await settings.set(
      UpdateService.manifestKey,
      'http://127.0.0.1:${server.port}/limited',
    );
    expect(
      () => updates.check(currentVersion: '2.1.0'),
      throwsA(
        isA<UpdateException>().having(
          (e) => e.message,
          'message',
          contains('限流'),
        ),
      ),
    );
  });

  test('supports the legacy version.json manifest', () async {
    await settings.set(
      UpdateService.manifestKey,
      'http://127.0.0.1:${server.port}/legacy',
    );
    final info = await updates.check(currentVersion: '2.0.0');
    expect(info!.version, '2.3.0');
    expect(info.pageUrl, 'https://example.com/new.apk');
  });
}
