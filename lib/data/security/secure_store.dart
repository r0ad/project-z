import 'dart:convert';
import 'dart:io';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../domain/repositories.dart';

/// 跨平台安全存储：Windows 走 DPAPI，Android 走 Keystore，iOS 走 Keychain。
class FlutterSecureSecretStore implements SecretStore {
  FlutterSecureSecretStore({FlutterSecureStorage? storage})
    : _storage = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read(String key) => _storage.read(key: key);

  @override
  Future<void> write(String key, String value) =>
      _storage.write(key: key, value: value);

  @override
  Future<void> delete(String key) => _storage.delete(key: key);
}

/// 仅用于自动化测试的明文文件存储。
///
/// 通过 `DIANDIAN_SECRETS_FILE` 显式开启，生产环境不会走这里。
/// 它存在的唯一原因是：CI / 沙箱进程无法写入 Windows 的 AppData，
/// 而 `flutter_secure_storage` 的 Windows 实现依赖 AppData。
class FileSecretStore implements SecretStore {
  FileSecretStore(this.file);

  final File file;

  Future<Map<String, String>> _load() async {
    if (!await file.exists()) return <String, String>{};
    final raw = await file.readAsString();
    if (raw.trim().isEmpty) return <String, String>{};
    final decoded = jsonDecode(raw);
    if (decoded is! Map) return <String, String>{};
    return decoded.map(
      (key, value) => MapEntry(key.toString(), value.toString()),
    );
  }

  Future<void> _save(Map<String, String> values) async {
    await file.parent.create(recursive: true);
    await file.writeAsString(jsonEncode(values), flush: true);
  }

  @override
  Future<String?> read(String key) async => (await _load())[key];

  @override
  Future<void> write(String key, String value) async {
    final values = await _load();
    values[key] = value;
    await _save(values);
  }

  @override
  Future<void> delete(String key) async {
    final values = await _load();
    values.remove(key);
    await _save(values);
  }
}
