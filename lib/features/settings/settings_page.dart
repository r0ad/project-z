import 'package:material_ui/material_ui.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';
import '../../core/ui.dart';
import '../../data/ai/catalog.dart';
import '../../domain/models.dart';
import 'settings_cubit.dart';

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final deps = AppScope.of(context);
    return BlocProvider(
      create: (_) => SettingsCubit(deps)..load(),
      child: const _SettingsView(),
    );
  }
}

class _SettingsView extends StatelessWidget {
  const _SettingsView();

  Future<void> _editName(BuildContext context, String current) async {
    final controller = TextEditingController(text: current);
    final name = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('怎么称呼你'),
        content: TextField(
          controller: controller,
          autofocus: true,
          decoration: const InputDecoration(hintText: '你的名字或昵称'),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('保存'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (name != null && name.isNotEmpty && context.mounted) {
      await context.read<SettingsCubit>().setUserName(name);
    }
  }

  Future<void> _editProxy(BuildContext context, String current) async {
    final controller = TextEditingController(text: current);
    final value = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('网络代理'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            TextField(
              controller: controller,
              autofocus: true,
              decoration: const InputDecoration(
                hintText: '127.0.0.1:10808',
                helperText: '留空表示直连；只支持 HTTP/HTTPS 代理',
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              '用于模拟器或受限网络。修改后下一次 AI 请求生效。',
              style: TextStyle(fontSize: 12, color: AppColors.textMuted),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('取消'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('保存'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (value != null && context.mounted) {
      await context.read<SettingsCubit>().setProxy(value);
    }
  }

  Future<void> _openConfig(BuildContext context, {AiConfig? existing}) async {
    final result = await showModalBottomSheet<_ConfigResult>(
      context: context,
      isScrollControlled: true,
      backgroundColor: AppColors.surface,
      builder: (_) => _ConfigSheet(existing: existing),
    );
    if (result == null || !context.mounted) return;
    final cubit = context.read<SettingsCubit>();
    await cubit.saveConfig(
      existing: existing,
      providerKey: result.providerKey,
      name: result.name,
      baseUrl: result.baseUrl,
      model: result.model,
      apiKey: result.apiKey,
      activate: result.activate,
    );
    if (context.mounted && cubit.state.error != null) {
      showSnack(context, cubit.state.error!, error: true);
    }
  }

  Future<void> _test(BuildContext context, AiConfig config) async {
    final cubit = context.read<SettingsCubit>();
    await cubit.test(config);
    if (context.mounted) {
      final result = cubit.state.testResult;
      showSnack(
        context,
        result == true ? '连接成功' : (cubit.state.error ?? '连接失败'),
        error: result != true,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: BlocBuilder<SettingsCubit, SettingsState>(
          builder: (context, state) {
            return ListView(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 40),
              children: [
                PagePad(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '我的',
                        style: TextStyle(
                          fontSize: 26,
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const SizedBox(height: 18),
                      SurfaceCard(
                        child: Row(
                          children: [
                            CircleAvatar(
                              radius: 26,
                              backgroundColor: AppColors.seed.withValues(
                                alpha: 0.16,
                              ),
                              child: Text(
                                state.userName.isEmpty
                                    ? '点'
                                    : state.userName.characters.first,
                                style: const TextStyle(
                                  color: AppColors.seed,
                                  fontSize: 20,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                            ),
                            const SizedBox(width: 14),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    state.userName.isEmpty
                                        ? '还没设置称呼'
                                        : state.userName,
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                  const SizedBox(height: 3),
                                  const Text(
                                    '数据保存在这台设备，不上传云端',
                                    style: TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 12,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () =>
                                  _editName(context, state.userName),
                              icon: const Icon(Icons.edit_outlined, size: 18),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      SectionTitle(
                        'AI 供应商',
                        subtitle: '至少激活一个，才能使用 AI 拆解、记录整理和对话',
                        action: FilledButton.tonalIcon(
                          onPressed: () => _openConfig(context),
                          icon: const Icon(Icons.add, size: 18),
                          label: const Text('添加'),
                        ),
                      ),
                      if (state.loading)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 30),
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (state.configs.isEmpty)
                        SurfaceCard(
                          highlight: true,
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                '还没有 AI 配置',
                                style: TextStyle(fontWeight: FontWeight.w700),
                              ),
                              const SizedBox(height: 6),
                              const Text(
                                '推荐先用 DeepSeek：国内可直连、价格低、支持流式。填好 API Key 后点「测试连接」。',
                                style: TextStyle(
                                  color: AppColors.textMuted,
                                  fontSize: 12,
                                  height: 1.5,
                                ),
                              ),
                              const SizedBox(height: 12),
                              FilledButton.icon(
                                onPressed: () => _openConfig(context),
                                icon: const Icon(Icons.auto_awesome, size: 18),
                                label: const Text('配置 DeepSeek'),
                              ),
                            ],
                          ),
                        )
                      else
                        for (final config in state.configs)
                          Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: SurfaceCard(
                              padding: const EdgeInsets.all(14),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          config.name,
                                          style: const TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.w700,
                                          ),
                                        ),
                                      ),
                                      if (config.isActive)
                                        const Pill(
                                          '使用中',
                                          color: AppColors.success,
                                        ),
                                    ],
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    '${config.model} · ${config.baseUrl}',
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      color: AppColors.textMuted,
                                      fontSize: 11,
                                      height: 1.4,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Wrap(
                                    spacing: 6,
                                    children: [
                                      if (!config.isActive)
                                        TextButton(
                                          onPressed: () => context
                                              .read<SettingsCubit>()
                                              .activate(config.id),
                                          child: const Text('设为当前'),
                                        ),
                                      TextButton(
                                        onPressed: () => _test(context, config),
                                        child: const Text('测试连接'),
                                      ),
                                      TextButton(
                                        onPressed: () => _openConfig(
                                          context,
                                          existing: config,
                                        ),
                                        child: const Text('编辑'),
                                      ),
                                      TextButton(
                                        onPressed: () async {
                                          final ok = await showDialog<bool>(
                                            context: context,
                                            builder: (context) => AlertDialog(
                                              title: const Text('删除配置？'),
                                              content: const Text(
                                                'API Key 也会从本机安全存储中删除。',
                                              ),
                                              actions: [
                                                TextButton(
                                                  onPressed: () =>
                                                      Navigator.pop(
                                                        context,
                                                        false,
                                                      ),
                                                  child: const Text('取消'),
                                                ),
                                                FilledButton(
                                                  onPressed: () =>
                                                      Navigator.pop(
                                                        context,
                                                        true,
                                                      ),
                                                  style: FilledButton.styleFrom(
                                                    backgroundColor:
                                                        AppColors.danger,
                                                  ),
                                                  child: const Text('删除'),
                                                ),
                                              ],
                                            ),
                                          );
                                          if (ok == true && context.mounted) {
                                            await context
                                                .read<SettingsCubit>()
                                                .delete(config.id);
                                          }
                                        },
                                        child: const Text(
                                          '删除',
                                          style: TextStyle(
                                            color: AppColors.danger,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                      const SizedBox(height: 24),
                      const SectionTitle(
                        '网络',
                        subtitle: '模拟器直连失败时，可填写本机 HTTP 代理',
                      ),
                      SurfaceCard(
                        child: ListTile(
                          contentPadding: EdgeInsets.zero,
                          leading: const Icon(Icons.lan_outlined),
                          title: const Text('HTTP 代理'),
                          subtitle: Text(
                            state.proxy.isEmpty ? '直连（未设置）' : state.proxy,
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () => _editProxy(context, state.proxy),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const SectionTitle('关于'),
                      SurfaceCard(
                        child: Column(
                          children: [
                            const _InfoRow(
                              label: '应用',
                              value: '点点 · Project Z',
                            ),
                            const _VersionRow(),
                            const _InfoRow(
                              label: '数据',
                              value: '本地 SQLite + 系统安全存储',
                            ),
                            const _InfoRow(
                              label: '理念',
                              value: 'AI native · 本地优先 · 三端一致',
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _VersionRow extends StatelessWidget {
  const _VersionRow();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<PackageInfo>(
      future: PackageInfo.fromPlatform(),
      builder: (context, snapshot) {
        final info = snapshot.data;
        return _InfoRow(
          label: '版本',
          value: info == null ? '读取中…' : '${info.version}+${info.buildNumber}',
        );
      },
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Text(
            label,
            style: const TextStyle(color: AppColors.textMuted, fontSize: 12),
          ),
          const Spacer(),
          Text(value, style: const TextStyle(fontSize: 12)),
        ],
      ),
    );
  }
}

class _ConfigResult {
  const _ConfigResult({
    required this.providerKey,
    required this.name,
    required this.baseUrl,
    required this.model,
    required this.apiKey,
    required this.activate,
  });

  final String providerKey;
  final String name;
  final String baseUrl;
  final String model;
  final String apiKey;
  final bool activate;
}

class _ConfigSheet extends StatefulWidget {
  const _ConfigSheet({this.existing});
  final AiConfig? existing;

  @override
  State<_ConfigSheet> createState() => _ConfigSheetState();
}

class _ConfigSheetState extends State<_ConfigSheet> {
  late ProviderPreset _preset;
  final _name = TextEditingController();
  final _baseUrl = TextEditingController();
  final _model = TextEditingController();
  final _apiKey = TextEditingController();
  bool _activate = true;
  bool _showKey = false;

  @override
  void initState() {
    super.initState();
    final existing = widget.existing;
    _preset = presetFor(existing?.providerKey ?? 'deepseek');
    _name.text = existing?.name ?? 'DeepSeek';
    _baseUrl.text = existing?.baseUrl ?? _preset.baseUrl;
    _model.text = existing?.model ?? _preset.effectiveModel;
    _activate = existing?.isActive ?? true;
  }

  @override
  void dispose() {
    _name.dispose();
    _baseUrl.dispose();
    _model.dispose();
    _apiKey.dispose();
    super.dispose();
  }

  void _applyPreset(String key) {
    final preset = presetFor(key);
    setState(() {
      _preset = preset;
      _name.text = preset.label;
      _baseUrl.text = preset.baseUrl;
      _model.text = preset.effectiveModel;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        20,
        20,
        20 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              widget.existing == null ? '添加 AI 供应商' : '编辑 AI 供应商',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 18),
            DropdownButtonFormField<String>(
              initialValue: _preset.key,
              decoration: const InputDecoration(labelText: '预设'),
              items: [
                for (final preset in providerPresets)
                  DropdownMenuItem(
                    value: preset.key,
                    child: Text(preset.label),
                  ),
              ],
              onChanged: (value) {
                if (value != null) _applyPreset(value);
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _name,
              decoration: const InputDecoration(labelText: '显示名称'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _baseUrl,
              decoration: const InputDecoration(
                labelText: 'Base URL',
                hintText: 'https://api.deepseek.com',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _model,
              decoration: const InputDecoration(
                labelText: '模型',
                hintText: 'deepseek-flash',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _apiKey,
              obscureText: !_showKey,
              decoration: InputDecoration(
                labelText: widget.existing == null
                    ? 'API Key'
                    : 'API Key（留空保持不变）',
                suffixIcon: IconButton(
                  onPressed: () => setState(() => _showKey = !_showKey),
                  icon: Icon(
                    _showKey ? Icons.visibility_off : Icons.visibility,
                  ),
                ),
              ),
            ),
            const SizedBox(height: 8),
            SwitchListTile(
              contentPadding: EdgeInsets.zero,
              title: const Text('保存后设为当前使用'),
              value: _activate,
              onChanged: (value) => setState(() => _activate = value),
            ),
            const SizedBox(height: 8),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () {
                  if (_name.text.trim().isEmpty ||
                      _baseUrl.text.trim().isEmpty ||
                      _model.text.trim().isEmpty) {
                    showSnack(context, '名称、Base URL、模型都要填', error: true);
                    return;
                  }
                  Navigator.pop(
                    context,
                    _ConfigResult(
                      providerKey: _preset.key,
                      name: _name.text.trim(),
                      baseUrl: _baseUrl.text.trim(),
                      model: _model.text.trim(),
                      apiKey: _apiKey.text.trim(),
                      activate: _activate,
                    ),
                  );
                },
                child: const Text('保存配置'),
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'API Key 只写入系统安全存储（Windows DPAPI / Android Keystore / iOS Keychain），不会进入数据库或备份。',
              style: TextStyle(
                color: AppColors.textMuted.withValues(alpha: 0.9),
                fontSize: 11,
                height: 1.5,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
