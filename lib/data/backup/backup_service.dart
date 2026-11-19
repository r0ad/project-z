import 'dart:convert';

import 'package:drift/drift.dart';

import '../local/app_database.dart';

class BackupImportResult {
  const BackupImportResult({required this.counts, required this.exportedAt});

  final Map<String, int> counts;
  final String exportedAt;

  int get total => counts.values.fold(0, (sum, value) => sum + value);
}

/// 本地 JSON 备份：完整导出 14 张业务表，不包含系统安全存储里的 API Key。
class BackupService {
  BackupService(this._db, {this.appVersion = ''});

  final AppDatabase _db;
  final String appVersion;

  static const format = 'diandian-backup';
  static const version = 1;

  /// 依赖顺序：父表在前。导入时反向删除，正向插入。
  static const tableNames = [
    'projects',
    'milestones',
    'project_logs',
    'ai_insights',
    'knowledge_entries',
    'tags',
    'knowledge_tag_links',
    'project_knowledge_links',
    'favorites',
    'chat_conversations',
    'chat_messages',
    'ai_configs',
    'settings',
    'ai_tool_calls',
  ];

  Future<String> exportJson() async {
    final tables = <String, List<Map<String, dynamic>>>{};
    for (final table in tableNames) {
      final rows = await _db.customSelect('SELECT * FROM $table').get();
      tables[table] = rows.map((row) => row.data).toList();
    }
    final payload = {
      'format': format,
      'version': version,
      'appVersion': appVersion,
      'exportedAt': DateTime.now().toUtc().toIso8601String(),
      'tables': tables,
    };
    return const JsonEncoder.withIndent('  ').convert(payload);
  }

  Future<BackupImportResult> importJson(String raw) async {
    final dynamic decoded;
    try {
      decoded = jsonDecode(raw);
    } on FormatException {
      throw const BackupFormatException('备份文件不是合法的 JSON');
    }
    if (decoded is! Map) {
      throw const BackupFormatException('备份文件结构不正确');
    }
    final map = decoded.cast<String, dynamic>();
    if (map['format'] != format) {
      throw const BackupFormatException('这不是点点导出的备份文件');
    }
    final versionValue = map['version'];
    if (versionValue is! int || versionValue > version) {
      throw const BackupFormatException('备份文件版本过新，请先升级应用');
    }
    final rawTables = map['tables'];
    if (rawTables is! Map) {
      throw const BackupFormatException('备份文件缺少数据表');
    }
    final tables = rawTables.cast<String, dynamic>();

    final counts = <String, int>{};
    try {
      await _db.transaction(() async {
        for (final table in tableNames.reversed) {
          await _db.customStatement('DELETE FROM $table');
        }
        for (final table in tableNames) {
          final rows = tables[table];
          if (rows == null) continue;
          if (rows is! List) {
            throw BackupFormatException('数据表 $table 格式不正确');
          }
          for (final row in rows) {
            if (row is! Map) {
              throw BackupFormatException('数据表 $table 的记录格式不正确');
            }
            await _insertRow(table, row.cast<String, dynamic>());
          }
          counts[table] = rows.length;
        }
      });
    } on BackupFormatException {
      rethrow;
    } catch (e) {
      throw BackupFormatException('导入失败，已回滚：$e');
    }

    return BackupImportResult(
      counts: counts,
      exportedAt: map['exportedAt']?.toString() ?? '',
    );
  }

  Future<void> _insertRow(String table, Map<String, dynamic> row) async {
    if (row.isEmpty) return;
    final columns = row.keys.toList();
    for (final column in columns) {
      if (!RegExp(r'^[a-z_][a-z0-9_]*$').hasMatch(column)) {
        throw const BackupFormatException('备份中包含非法字段名');
      }
    }
    final placeholders = List.filled(columns.length, '?').join(', ');
    await _db.customInsert(
      'INSERT INTO $table (${columns.join(', ')}) VALUES ($placeholders)',
      variables: [
        for (final column in columns)
          Variable<Object>(_normalizeValue(row[column])),
      ],
    );
  }

  Object? _normalizeValue(Object? value) {
    if (value is bool) return value ? 1 : 0;
    if (value is num || value is String || value == null) return value;
    return jsonEncode(value);
  }
}

class BackupFormatException implements Exception {
  const BackupFormatException(this.message);
  final String message;

  @override
  String toString() => message;
}
