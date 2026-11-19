import 'package:dio/dio.dart';

// 私有字段 + 可注入 Dio，无法直接使用 initializing formal。
// ignore_for_file: prefer_initializing_formals

import '../../domain/repositories.dart';

class UpdateInfo {
  const UpdateInfo({
    required this.version,
    required this.notes,
    required this.pageUrl,
    this.androidUrl,
    this.windowsSetupUrl,
    this.windowsPortableUrl,
    this.iosUrl,
  });

  final String version;
  final String notes;
  final String pageUrl;
  final String? androidUrl;
  final String? windowsSetupUrl;
  final String? windowsPortableUrl;
  final String? iosUrl;
}

class UpdateException implements Exception {
  const UpdateException(this.message);
  final String message;

  @override
  String toString() => message;
}

class UpdateService {
  UpdateService({required SettingsRepository settings, Dio? dio})
    : _settings = settings,
      _dio =
          dio ??
          Dio(
            BaseOptions(
              connectTimeout: const Duration(seconds: 15),
              receiveTimeout: const Duration(seconds: 30),
              validateStatus: (status) => status != null && status < 500,
            ),
          );

  final SettingsRepository _settings;
  final Dio _dio;

  static const manifestKey = 'update_manifest_url';
  static const defaultManifest =
      'https://api.github.com/repos/r0ad/project-z/releases/latest';

  Future<String> manifestUrl() async {
    final saved = (await _settings.get(manifestKey))?.trim();
    return saved == null || saved.isEmpty ? defaultManifest : saved;
  }

  Future<UpdateInfo?> check({required String currentVersion}) async {
    final url = await manifestUrl();
    try {
      final response = await _dio.get<dynamic>(
        url,
        options: Options(
          headers: {
            'Accept': 'application/vnd.github+json, application/json',
            'User-Agent': 'diandian-app',
          },
        ),
      );
      final data = response.data;
      if (data == null) throw const UpdateException('更新清单为空');
      final info = _parse(data);
      if (info == null) throw const UpdateException('更新清单格式不正确');
      return compareVersion(info.version, currentVersion) > 0 ? info : null;
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) {
        throw const UpdateException('更新地址不存在');
      }
      throw UpdateException(
        e.type == DioExceptionType.connectionTimeout
            ? '检查更新超时，请稍后重试'
            : '检查更新失败：${e.message ?? '网络错误'}',
      );
    }
  }

  UpdateInfo? _parse(dynamic data) {
    if (data is Map) {
      final map = data.cast<String, dynamic>();
      if (map['tag_name'] != null) return _fromGitHub(map);
      if (map['version'] != null) return _fromManifest(map);
      // 兼容 { "releases": [...] }
      final releases = map['releases'];
      if (releases is List) return _best(releases);
    }
    if (data is List) return _best(data);
    return null;
  }

  UpdateInfo? _best(List items) {
    UpdateInfo? best;
    for (final item in items) {
      if (item is! Map) continue;
      final info = _fromManifest(item.cast<String, dynamic>());
      if (info == null) continue;
      if (best == null || compareVersion(info.version, best.version) > 0) {
        best = info;
      }
    }
    return best;
  }

  UpdateInfo? _fromGitHub(Map<String, dynamic> map) {
    final version = _cleanVersion(map['tag_name']?.toString() ?? '');
    if (version.isEmpty) return null;
    final page = map['html_url']?.toString() ?? '';
    String? android;
    String? windowsSetup;
    String? windowsPortable;
    String? ios;
    final assets = map['assets'];
    if (assets is List) {
      for (final asset in assets) {
        if (asset is! Map) continue;
        final name = asset['name']?.toString().toLowerCase() ?? '';
        final url = asset['browser_download_url']?.toString();
        if (url == null || url.isEmpty) continue;
        if (name.endsWith('.apk')) {
          android = url;
        } else if (name.endsWith('.exe') && name.contains('setup')) {
          windowsSetup = url;
        } else if (name.endsWith('.zip') && name.contains('windows')) {
          windowsPortable = url;
        } else if (name.endsWith('.zip') && name.contains('ios')) {
          ios = url;
        }
      }
    }
    return UpdateInfo(
      version: version,
      notes: map['body']?.toString() ?? '',
      pageUrl: page,
      androidUrl: android,
      windowsSetupUrl: windowsSetup,
      windowsPortableUrl: windowsPortable,
      iosUrl: ios,
    );
  }

  UpdateInfo? _fromManifest(Map<String, dynamic> map) {
    final version = _cleanVersion(map['version']?.toString() ?? '');
    if (version.isEmpty) return null;
    final downloads = map['downloads'];
    String? pick(String key) {
      if (downloads is Map) {
        final value = downloads[key];
        if (value is String && value.isNotEmpty) return value;
      }
      return null;
    }

    return UpdateInfo(
      version: version,
      notes: (map['notes'] ?? map['comment'] ?? map['body'] ?? '').toString(),
      pageUrl: (map['pageUrl'] ?? map['url'] ?? map['downloadUrl'] ?? '')
          .toString(),
      androidUrl: pick('android'),
      windowsSetupUrl: pick('windowsSetup'),
      windowsPortableUrl: pick('windowsPortable'),
      iosUrl: pick('ios'),
    );
  }

  String _cleanVersion(String raw) {
    final match = RegExp(r'\d+(?:\.\d+)*').firstMatch(raw.trim());
    return match?.group(0) ?? '';
  }
}

int compareVersion(String a, String b) {
  List<int> parts(String value) => value
      .split(RegExp(r'[^0-9]+'))
      .where((e) => e.isNotEmpty)
      .map(int.parse)
      .toList();
  final left = parts(a);
  final right = parts(b);
  final length = left.length > right.length ? left.length : right.length;
  for (var i = 0; i < length; i++) {
    final l = i < left.length ? left[i] : 0;
    final r = i < right.length ? right[i] : 0;
    if (l != r) return l.compareTo(r);
  }
  return 0;
}
