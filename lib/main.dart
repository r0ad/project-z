import 'package:cupertino_ui/cupertino_ui.dart'
    show GlobalCupertinoLocalizations;
import 'package:flutter/foundation.dart';
import 'package:flutter_localizations/flutter_localizations.dart'
    show GlobalWidgetsLocalizations;
import 'package:material_ui/material_ui.dart';
import 'package:window_manager/window_manager.dart';

import 'app/app_dependencies.dart';
import 'app/app_scope.dart';
import 'app/router.dart';
import 'app/theme.dart';
import 'features/onboarding/welcome_page.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await _configureDesktopWindow();

  try {
    final deps = await AppDependencies.bootstrap();
    final onboarded = await deps.settings.getBool('onboarding_done');
    runApp(AppRoot(dependencies: deps, showWelcome: !onboarded));
  } catch (error, stack) {
    debugPrint('启动失败: $error\n$stack');
    runApp(_BootstrapFailure(error));
  }
}

Future<void> _configureDesktopWindow() async {
  if (kIsWeb) return;
  final desktop =
      defaultTargetPlatform == TargetPlatform.windows ||
      defaultTargetPlatform == TargetPlatform.macOS ||
      defaultTargetPlatform == TargetPlatform.linux;
  if (!desktop) return;

  final window = WindowManager.instance.getCurrent();
  if (window == null) return;
  window
    ..title = '点点'
    ..minimumSize = const Size(980, 640).toNative()
    ..setSize(const Size(1280, 820).toNative(), false)
    ..center()
    ..show()
    ..focus();
}

class AppRoot extends StatefulWidget {
  const AppRoot({
    super.key,
    required this.dependencies,
    this.showWelcome = false,
  });

  final AppDependencies dependencies;
  final bool showWelcome;

  @override
  State<AppRoot> createState() => _AppRootState();
}

class _AppRootState extends State<AppRoot> {
  final _router = createRouter();
  late bool _showWelcome = widget.showWelcome;

  @override
  Widget build(BuildContext context) {
    return AppScope(
      dependencies: widget.dependencies,
      child: _showWelcome
          ? MaterialApp(
              title: '点点',
              debugShowCheckedModeBanner: false,
              theme: buildDarkTheme(),
              darkTheme: buildDarkTheme(),
              themeMode: ThemeMode.dark,
              locale: const Locale('zh', 'CN'),
              supportedLocales: const [Locale('zh', 'CN'), Locale('en')],
              localizationsDelegates: _localizations,
              home: WelcomePage(
                onDone: () => setState(() => _showWelcome = false),
              ),
            )
          : MaterialApp.router(
              title: '点点',
              debugShowCheckedModeBanner: false,
              theme: buildDarkTheme(),
              darkTheme: buildDarkTheme(),
              themeMode: ThemeMode.dark,
              locale: const Locale('zh', 'CN'),
              supportedLocales: const [Locale('zh', 'CN'), Locale('en')],
              localizationsDelegates: _localizations,
              routerConfig: _router,
            ),
    );
  }

  static const _localizations = [
    GlobalMaterialLocalizations.delegate,
    GlobalWidgetsLocalizations.delegate,
    GlobalCupertinoLocalizations.delegate,
  ];
}

class _BootstrapFailure extends StatelessWidget {
  const _BootstrapFailure(this.error);

  final Object error;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: buildDarkTheme(),
      home: Scaffold(
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 520),
            child: Padding(
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(
                    Icons.error_outline,
                    color: AppColors.danger,
                    size: 42,
                  ),
                  const SizedBox(height: 16),
                  const Text(
                    '启动失败',
                    style: TextStyle(fontSize: 22, fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 10),
                  const Text(
                    '本机的数据目录或安全存储没有初始化成功。可以先重启应用；如果仍然失败，把下面的信息发给开发者。',
                    style: TextStyle(color: AppColors.textMuted, height: 1.6),
                  ),
                  const SizedBox(height: 16),
                  SelectableText(
                    '$error',
                    style: const TextStyle(fontSize: 12, height: 1.5),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
