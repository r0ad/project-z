import 'dart:convert';
import 'dart:typed_data';

import 'package:file_picker/file_picker.dart';
import 'package:material_ui/material_ui.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/app_events.dart';
import '../../core/ui.dart';
import '../../data/backup/remote_backup.dart';

/// 本地 JSON、WebDAV、GitCode 三种备份方式集中在一页，避免设置页过长。
class BackupPage extends StatefulWidget {
  const BackupPage({super.key});

  @override
  State<BackupPage> createState() => _BackupPageState();
}

class _BackupPageState extends State<BackupPage> {
  final _webdavUrl = TextEditingController();
  final _webdavUser = TextEditingController();
  final _webdavPassword = TextEditingController();
  final _gitRepo = TextEditingController();
  final _gitBranch = TextEditingController();
  final _gitPath = TextEditingController();
  final _gitToken = TextEditingController();

  bool _loading = true;
  String? _busy;
  bool _webdavHasPassword = false;
  bool _gitHasToken = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    for (final controller in [
      _webdavUrl,
      _webdavUser,
      _webdavPassword,
      _gitRepo,
      _gitBranch,
      _gitPath,
      _gitToken,
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _load() async {
    final deps = AppScope.of(context);
    final url = await deps.webdav.url;
    final user = await deps.webdav.username;
    final password = await deps.secrets.read(WebDavService.passwordKey);
    final repo = await deps.gitcode.repo;
    final branch = await deps.gitcode.branch;
    final path = await deps.gitcode.path;
    final token = await deps.secrets.read(GitCodeService.tokenKey);
    if (!mounted) return;
    setState(() {
      _webdavUrl.text = url ?? '';
      _webdavUser.text = user ?? '';
      _gitRepo.text = repo ?? '';
      _gitBranch.text = branch ?? 'main';
      _gitPath.text = path ?? GitCodeService.defaultPath;
      _webdavHasPassword = password != null && password.isNotEmpty;
      _gitHasToken = token != null && token.isNotEmpty;
      _loading = false;
    });
  }

  Future<void> _run(String key, Future<String> Function() task) async {
    if (_busy != null) return;
    setState(() => _busy = key);
    try {
      final message = await task();
      if (!mounted) return;
      showSnack(context, message);
    } catch (e) {
      if (!mounted) return;
      showSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _busy = null);
    }
  }

  Future<void> _exportLocal() => _run('export', () async {
    final deps = AppScope.of(context);
    final json = await deps.backup.exportJson();
    final date = DateTime.now().toIso8601String().substring(0, 10);
    final uri = await FilePicker.saveFile(
      dialogTitle: '导出点点备份',
      fileName: 'diandian-backup-$date.json',
      bytes: Uint8List.fromList(utf8.encode(json)),
      mimeType: 'application/json',
    );
    if (uri == null) return '已取消导出';
    return '备份已导出';
  });

  Future<void> _importLocal() => _run('import', () async {
    final picked = await FilePicker.pickFiles(
      dialogTitle: '选择点点备份',
      type: FileType.custom,
      allowedExtensions: ['json'],
    );
    if (picked.isEmpty) return '已取消导入';
    final file = picked.single;
    final bytes = await file.readAsBytes();
    final raw = utf8.decode(bytes);
    if (!mounted) return '已取消导入';
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('恢复备份？'),
        content: const Text('当前所有本地数据会被备份内容替换，且不能撤销。建议先导出一份当前数据。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('恢复'),
          ),
        ],
      ),
    );
    if (confirmed != true) return '已取消导入';
    if (!mounted) return '页面已关闭';
    final deps = AppScope.of(context);
    final result = await deps.backup.importJson(raw);
    AppEvents.bump();
    return '已恢复 ${result.total} 条记录';
  });

  Future<void> _saveWebdav() => _run('webdav-save', () async {
    final deps = AppScope.of(context);
    final url = _webdavUrl.text.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw const BackupRemoteException('WebDAV 地址必须以 http:// 或 https:// 开头');
    }
    if (_webdavUser.text.trim().isEmpty) {
      throw const BackupRemoteException('请填写 WebDAV 用户名');
    }
    if (!_webdavHasPassword && _webdavPassword.text.trim().isEmpty) {
      throw const BackupRemoteException('请填写 WebDAV 密码');
    }
    await deps.webdav.saveConfig(
      url: url.endsWith('/') ? url : '$url/',
      username: _webdavUser.text.trim(),
      password: _webdavPassword.text.trim().isEmpty
          ? null
          : _webdavPassword.text.trim(),
    );
    _webdavPassword.clear();
    await _load();
    return 'WebDAV 配置已保存';
  });

  Future<void> _testWebdav() => _run('webdav-test', () async {
    await AppScope.of(context).webdav.test();
    return 'WebDAV 连接成功';
  });

  Future<void> _uploadWebdav() => _run('webdav-upload', () async {
    final deps = AppScope.of(context);
    final json = await deps.backup.exportJson();
    await deps.webdav.upload(json);
    return '已上传到 WebDAV';
  });

  Future<void> _downloadWebdav() => _run('webdav-download', () async {
    final deps = AppScope.of(context);
    final raw = await deps.webdav.download();
    if (!mounted) return '已取消恢复';
    final confirmed = await _confirmRestore('从 WebDAV 恢复？');
    if (!confirmed) return '已取消恢复';
    final result = await deps.backup.importJson(raw);
    AppEvents.bump();
    return '已从 WebDAV 恢复 ${result.total} 条记录';
  });

  Future<void> _saveGitcode() => _run('git-save', () async {
    final deps = AppScope.of(context);
    final repo = _gitRepo.text.trim();
    if (!repo.contains('/')) {
      throw const BackupRemoteException('GitCode 仓库格式应为 owner/repo');
    }
    if (!_gitHasToken && _gitToken.text.trim().isEmpty) {
      throw const BackupRemoteException('请填写 GitCode Token');
    }
    await deps.gitcode.saveConfig(
      repo: repo,
      branch: _gitBranch.text.trim(),
      path: _gitPath.text.trim(),
      token: _gitToken.text.trim().isEmpty ? null : _gitToken.text.trim(),
    );
    _gitToken.clear();
    await _load();
    return 'GitCode 配置已保存';
  });

  Future<void> _testGitcode() => _run('git-test', () async {
    await AppScope.of(context).gitcode.test();
    return 'GitCode 连接成功';
  });

  Future<void> _uploadGitcode() => _run('git-upload', () async {
    final deps = AppScope.of(context);
    final json = await deps.backup.exportJson();
    await deps.gitcode.upload(json);
    return '已上传到 GitCode';
  });

  Future<void> _downloadGitcode() => _run('git-download', () async {
    final deps = AppScope.of(context);
    final raw = await deps.gitcode.download();
    if (!mounted) return '已取消恢复';
    final confirmed = await _confirmRestore('从 GitCode 恢复？');
    if (!confirmed) return '已取消恢复';
    final result = await deps.backup.importJson(raw);
    AppEvents.bump();
    return '已从 GitCode 恢复 ${result.total} 条记录';
  });

  Future<bool> _confirmRestore(String title) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: const Text('当前所有本地数据会被云端备份替换，且不能撤销。'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('恢复'),
          ),
        ],
      ),
    );
    return confirmed == true;
  }

  Widget _button(
    String label,
    Future<void> Function() action, {
    String key = '',
    bool filled = false,
  }) {
    final disabled = _busy != null;
    final child = _busy == key
        ? const SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(strokeWidth: 2),
          )
        : Text(label);
    final onPressed = disabled ? null : action;
    return filled
        ? FilledButton(onPressed: onPressed, child: child)
        : OutlinedButton(onPressed: onPressed, child: child);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('备份与恢复')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : PagePad(
              child: ListView(
                padding: const EdgeInsets.only(top: 16, bottom: 40),
                children: [
                  const SectionTitle(
                    '本地备份',
                    subtitle: '导出完整数据库为 JSON，不包含系统安全存储中的 API Key',
                  ),
                  SurfaceCard(
                    child: Wrap(
                      spacing: 12,
                      runSpacing: 12,
                      children: [
                        _button(
                          '导出备份',
                          _exportLocal,
                          key: 'export',
                          filled: true,
                        ),
                        _button('从文件恢复', _importLocal, key: 'import'),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const SectionTitle(
                    'WebDAV',
                    subtitle: '坚果云、Nextcloud 等标准 WebDAV 服务',
                  ),
                  SurfaceCard(
                    child: Column(
                      children: [
                        TextField(
                          controller: _webdavUrl,
                          decoration: const InputDecoration(
                            labelText: 'WebDAV 地址',
                            hintText: 'https://dav.example.com/remote.php/dav/files/name/',
                          ),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _webdavUser,
                          decoration: const InputDecoration(labelText: '用户名'),
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _webdavPassword,
                          obscureText: true,
                          decoration: InputDecoration(
                            labelText: _webdavHasPassword
                                ? '密码（已保存，留空保持不变）'
                                : '密码',
                          ),
                        ),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _button(
                              '保存配置',
                              _saveWebdav,
                              key: 'webdav-save',
                              filled: true,
                            ),
                            _button('测试连接', _testWebdav, key: 'webdav-test'),
                            _button(
                              '上传备份',
                              _uploadWebdav,
                              key: 'webdav-upload',
                            ),
                            _button(
                              '下载并恢复',
                              _downloadWebdav,
                              key: 'webdav-download',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  const SectionTitle(
                    'GitCode',
                    subtitle: '把备份提交到 GitCode 仓库，token 只存安全存储',
                  ),
                  SurfaceCard(
                    child: Column(
                      children: [
                        TextField(
                          controller: _gitRepo,
                          decoration: const InputDecoration(
                            labelText: '仓库',
                            hintText: 'owner/repo',
                          ),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _gitBranch,
                                decoration: const InputDecoration(
                                  labelText: '分支',
                                  hintText: 'main',
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 2,
                              child: TextField(
                                controller: _gitPath,
                                decoration: const InputDecoration(
                                  labelText: '文件路径',
                                  hintText: 'diandian/backup.json',
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        TextField(
                          controller: _gitToken,
                          obscureText: true,
                          decoration: InputDecoration(
                            labelText: _gitHasToken
                                ? 'Token（已保存，留空保持不变）'
                                : 'Token',
                          ),
                        ),
                        const SizedBox(height: 14),
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            _button(
                              '保存配置',
                              _saveGitcode,
                              key: 'git-save',
                              filled: true,
                            ),
                            _button('测试连接', _testGitcode, key: 'git-test'),
                            _button('上传备份', _uploadGitcode, key: 'git-upload'),
                            _button(
                              '下载并恢复',
                              _downloadGitcode,
                              key: 'git-download',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    '恢复会覆盖当前所有本地数据，操作前建议先导出一份。',
                    style: TextStyle(
                      color: AppColors.textMuted.withValues(alpha: 0.9),
                      fontSize: 11,
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
