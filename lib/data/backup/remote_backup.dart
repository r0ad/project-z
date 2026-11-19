import 'dart:convert';

// 私有字段 + 可注入 Dio，无法直接使用 initializing formal。
// ignore_for_file: prefer_initializing_formals

import 'package:dio/dio.dart';

import '../../domain/repositories.dart';

class BackupRemoteException implements Exception {
  const BackupRemoteException(this.message);
  final String message;

  @override
  String toString() => message;
}

/// WebDAV 备份：固定文件地址，使用 Basic Auth。
class WebDavService {
  WebDavService({
    required SettingsRepository settings,
    required SecretStore secrets,
    Dio? dio,
  }) : _settings = settings,
       _secrets = secrets,
       _dio =
           dio ??
           Dio(
             BaseOptions(
               connectTimeout: const Duration(seconds: 20),
               receiveTimeout: const Duration(seconds: 60),
               sendTimeout: const Duration(seconds: 60),
               validateStatus: (status) => status != null && status < 400,
             ),
           );

  final SettingsRepository _settings;
  final SecretStore _secrets;
  final Dio _dio;

  static const urlKey = 'webdav_url';
  static const userKey = 'webdav_username';
  static const passwordKey = 'webdav_password';
  static const fileName = 'diandian-backup.json';

  Future<String?> get url => _settings.get(urlKey);
  Future<String?> get username => _settings.get(userKey);

  Future<bool> get configured async {
    final value = await url;
    return value != null && value.trim().isNotEmpty && await _auth() != null;
  }

  Future<void> saveConfig({
    required String url,
    required String username,
    String? password,
  }) async {
    await _settings.set(urlKey, url.trim());
    await _settings.set(userKey, username.trim());
    if (password != null && password.isNotEmpty) {
      await _secrets.write(passwordKey, password);
    }
  }

  Future<void> upload(String json) async {
    final target = await _target();
    try {
      await _dio.put<void>(
        target,
        data: json,
        options: Options(
          headers: {
            ...await _headers(),
            Headers.contentTypeHeader: 'application/json; charset=utf-8',
          },
        ),
      );
    } on DioException catch (e) {
      throw BackupRemoteException(_message(e));
    }
  }

  Future<String> download() async {
    final target = await _target();
    try {
      final response = await _dio.get<String>(
        target,
        options: Options(
          responseType: ResponseType.plain,
          headers: await _headers(),
        ),
      );
      final body = response.data ?? '';
      if (body.trim().isEmpty) {
        throw const BackupRemoteException('云端备份文件是空的');
      }
      return body;
    } on DioException catch (e) {
      throw BackupRemoteException(_message(e));
    }
  }

  Future<void> test() async {
    final target = await _target();
    try {
      await _dio.get<String>(
        target,
        options: Options(
          responseType: ResponseType.plain,
          headers: await _headers(),
          validateStatus: (status) =>
              status != null && (status < 400 || status == 404),
        ),
      );
    } on DioException catch (e) {
      throw BackupRemoteException(_message(e));
    }
  }

  Future<String> _target() async {
    final raw = (await url)?.trim() ?? '';
    if (raw.isEmpty) throw const BackupRemoteException('还没有配置 WebDAV 地址');
    final parsed = Uri.tryParse(raw);
    if (parsed == null || !parsed.hasScheme || parsed.host.isEmpty) {
      throw const BackupRemoteException('WebDAV 地址格式不正确');
    }
    return raw.endsWith('/') ? '$raw$fileName' : raw;
  }

  Future<Map<String, String>?> _auth() async {
    final user = (await username)?.trim() ?? '';
    final password = await _secrets.read(passwordKey);
    if (user.isEmpty || password == null || password.isEmpty) return null;
    return {
      'Authorization': 'Basic ${base64Encode(utf8.encode('$user:$password'))}',
    };
  }

  Future<Map<String, String>> _headers() async {
    final auth = await _auth();
    if (auth == null) {
      throw const BackupRemoteException('请先填写 WebDAV 用户名和密码');
    }
    return auth;
  }

  String _message(DioException e) {
    final status = e.response?.statusCode;
    return switch (status) {
      401 => 'WebDAV 认证失败，请检查用户名和密码',
      403 => 'WebDAV 没有写入权限',
      404 => 'WebDAV 地址或目录不存在',
      409 => 'WebDAV 目录不存在，请先创建目录',
      _ =>
        e.type == DioExceptionType.connectionTimeout
            ? '连接 WebDAV 超时'
            : 'WebDAV 请求失败：${e.message ?? status ?? '未知错误'}',
    };
  }
}

/// GitCode 备份：走 OpenAPI v5 的 contents 接口，token 存在安全存储。
class GitCodeService {
  GitCodeService({
    required SettingsRepository settings,
    required SecretStore secrets,
    Dio? dio,
  }) : _settings = settings,
       _secrets = secrets,
       _dio =
           dio ??
           Dio(
             BaseOptions(
               baseUrl: 'https://gitcode.com/api/v5',
               connectTimeout: const Duration(seconds: 20),
               receiveTimeout: const Duration(seconds: 60),
               sendTimeout: const Duration(seconds: 60),
               validateStatus: (status) => status != null && status < 500,
             ),
           );

  final SettingsRepository _settings;
  final SecretStore _secrets;
  final Dio _dio;

  static const repoKey = 'gitcode_repo';
  static const branchKey = 'gitcode_branch';
  static const pathKey = 'gitcode_path';
  static const tokenKey = 'gitcode_token';
  static const defaultPath = 'diandian/backup.json';

  Future<String?> get repo => _settings.get(repoKey);
  Future<String?> get branch => _settings.get(branchKey);
  Future<String?> get path => _settings.get(pathKey);

  Future<bool> get configured async {
    final value = await repo;
    return value != null &&
        value.trim().isNotEmpty &&
        (await _secrets.read(tokenKey))?.isNotEmpty == true;
  }

  Future<void> saveConfig({
    required String repo,
    required String branch,
    required String path,
    String? token,
  }) async {
    await _settings.set(repoKey, repo.trim());
    await _settings.set(
      branchKey,
      branch.trim().isEmpty ? 'main' : branch.trim(),
    );
    await _settings.set(
      pathKey,
      path.trim().isEmpty ? defaultPath : path.trim(),
    );
    if (token != null && token.isNotEmpty) {
      await _secrets.write(tokenKey, token);
    }
  }

  Future<void> upload(String json) async {
    final config = await _config();
    final sha = await _remoteSha(config);
    final body = {
      'message': 'chore: backup from 点点',
      'content': base64Encode(utf8.encode(json)),
      'branch': config.branch,
      // ignore: use_null_aware_elements
      if (sha != null) 'sha': sha,
    };
    try {
      if (sha == null) {
        await _dio.post<void>(
          '/repos/${config.repo}/contents/${config.encodedPath}',
          data: body,
          options: Options(headers: config.headers),
        );
      } else {
        await _dio.put<void>(
          '/repos/${config.repo}/contents/${config.encodedPath}',
          data: body,
          options: Options(headers: config.headers),
        );
      }
    } on DioException catch (e) {
      throw BackupRemoteException(_message(e));
    }
  }

  Future<String> download() async {
    final config = await _config();
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/repos/${config.repo}/contents/${config.encodedPath}',
        queryParameters: {'ref': config.branch},
        options: Options(headers: config.headers),
      );
      final data = response.data;
      final content = data?['content']?.toString() ?? '';
      if (content.isEmpty) {
        throw const BackupRemoteException('GitCode 上的备份文件是空的');
      }
      return utf8.decode(base64Decode(content.replaceAll('\n', '')));
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw const BackupRemoteException('GitCode 上还没有备份文件');
      }
      throw BackupRemoteException(_message(e));
    }
  }

  Future<void> test() async {
    final config = await _config();
    try {
      await _dio.get<Map<String, dynamic>>(
        '/repos/${config.repo}/branches/${config.branch}',
        options: Options(headers: config.headers),
      );
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw BackupRemoteException('仓库或分支不存在：${config.branch}');
      }
      throw BackupRemoteException(_message(e));
    }
  }

  Future<String?> _remoteSha(_Config config) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/repos/${config.repo}/contents/${config.encodedPath}',
        queryParameters: {'ref': config.branch},
        options: Options(headers: config.headers),
      );
      return response.data?['sha']?.toString();
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      throw BackupRemoteException(_message(e));
    }
  }

  Future<_Config> _config() async {
    final repo = (await this.repo)?.trim() ?? '';
    final token = await _secrets.read(tokenKey);
    if (repo.isEmpty) throw const BackupRemoteException('还没有配置 GitCode 仓库');
    if (token == null || token.isEmpty) {
      throw const BackupRemoteException('还没有配置 GitCode Token');
    }
    final branch = (await this.branch)?.trim() ?? 'main';
    final path = (await this.path)?.trim() ?? defaultPath;
    return _Config(
      repo: repo,
      branch: branch.isEmpty ? 'main' : branch,
      path: path.isEmpty ? defaultPath : path,
      token: token,
    );
  }

  String _message(DioException e) {
    final status = e.response?.statusCode;
    return switch (status) {
      401 => 'GitCode Token 无效或已过期',
      403 => 'GitCode 没有仓库写权限',
      404 => 'GitCode 仓库、分支或文件不存在',
      _ =>
        e.type == DioExceptionType.connectionTimeout
            ? '连接 GitCode 超时'
            : 'GitCode 请求失败：${e.message ?? status ?? '未知错误'}',
    };
  }
}

class _Config {
  const _Config({
    required this.repo,
    required this.branch,
    required this.path,
    required this.token,
  });

  final String repo;
  final String branch;
  final String path;
  final String token;

  Map<String, String> get headers => {'Authorization': 'Bearer $token'};

  String get encodedPath => path
      .split('/')
      .where((e) => e.isNotEmpty)
      .map(Uri.encodeComponent)
      .join('/');
}
