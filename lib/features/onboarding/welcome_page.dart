import 'package:material_ui/material_ui.dart';

import '../../app/app_scope.dart';
import '../../app/theme.dart';

/// 首次启动的欢迎页：建立称呼，并说明点点的工作方式。
class WelcomePage extends StatefulWidget {
  const WelcomePage({super.key, required this.onDone});

  final VoidCallback onDone;

  @override
  State<WelcomePage> createState() => _WelcomePageState();
}

class _WelcomePageState extends State<WelcomePage> {
  final _name = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _start() async {
    if (_saving) return;
    setState(() => _saving = true);
    final deps = AppScope.of(context);
    final name = _name.text.trim();
    await deps.settings.set('user_name', name.isEmpty ? '朋友' : name);
    await deps.settings.setBool('onboarding_done', true);
    if (!mounted) return;
    widget.onDone();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: RadialGradient(
            center: Alignment(-0.6, -0.9),
            radius: 1.4,
            colors: [Color(0xFF0B2B32), AppColors.background],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 40),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 520),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(22),
                      child: Image.asset(
                        'assets/branding/app_icon.png',
                        width: 88,
                        height: 88,
                        fit: BoxFit.cover,
                      ),
                    ),
                    const SizedBox(height: 28),
                    const Text(
                      '点点',
                      style: TextStyle(
                        fontSize: 40,
                        height: 1.1,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 2,
                      ),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      '把目标拆小，把每天记下。',
                      style: TextStyle(
                        fontSize: 18,
                        color: AppColors.textMuted,
                        height: 1.5,
                      ),
                    ),
                    const SizedBox(height: 36),
                    _Point(
                      icon: Icons.auto_awesome,
                      title: 'AI 帮你拆目标',
                      body: '说出想做成的事，点点给出里程碑和第一步。',
                    ),
                    _Point(
                      icon: Icons.edit_note,
                      title: '一句话就能记录',
                      body: '不用填表，AI 会整理成进展、问题与下一步。',
                    ),
                    _Point(
                      icon: Icons.lock_outline,
                      title: '数据只留在本机',
                      body: '本地数据库 + 系统安全存储，没有账号和云同步。',
                    ),
                    const SizedBox(height: 32),
                    TextField(
                      controller: _name,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _start(),
                      decoration: const InputDecoration(
                        labelText: '怎么称呼你',
                        hintText: '留空也可以',
                      ),
                    ),
                    const SizedBox(height: 20),
                    FilledButton(
                      onPressed: _saving ? null : _start,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(52),
                      ),
                      child: _saving
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Text('进入点点'),
                    ),
                    const SizedBox(height: 14),
                    const Text(
                      '之后可以在「我的」里修改称呼和 AI 配置。',
                      style: TextStyle(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Point extends StatelessWidget {
  const _Point({required this.icon, required this.title, required this.body});

  final IconData icon;
  final String title;
  final String body;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 22),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 40,
            height: 40,
            decoration: BoxDecoration(
              color: AppColors.seed.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Icon(icon, size: 20, color: AppColors.seed),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: const TextStyle(
                    fontSize: 13,
                    height: 1.5,
                    color: AppColors.textMuted,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
