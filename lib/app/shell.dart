import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import 'theme.dart';

class AppShell extends StatelessWidget {
  const AppShell({super.key, required this.navigationShell});

  final StatefulNavigationShell navigationShell;

  static const _destinations = [
    _Destination('今日', Icons.bolt_outlined, Icons.bolt),
    _Destination('项目', Icons.folder_outlined, Icons.folder),
    _Destination('知识', Icons.menu_book_outlined, Icons.menu_book),
    _Destination('我的', Icons.person_outline, Icons.person),
  ];

  void _go(int index) {
    navigationShell.goBranch(
      index,
      initialLocation: index == navigationShell.currentIndex,
    );
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.sizeOf(context).width;
    final wide = width >= 900;

    final content = navigationShell;
    if (!wide) {
      return Scaffold(
        body: content,
        bottomNavigationBar: NavigationBar(
          selectedIndex: navigationShell.currentIndex,
          onDestinationSelected: _go,
          destinations: [
            for (final item in _destinations)
              NavigationDestination(
                icon: Icon(item.icon),
                selectedIcon: Icon(item.selectedIcon, color: AppColors.seed),
                label: item.label,
              ),
          ],
        ),
      );
    }

    return Scaffold(
      body: Row(
        children: [
          NavigationRail(
            extended: width >= 1180,
            minExtendedWidth: 200,
            backgroundColor: AppColors.background,
            selectedIndex: navigationShell.currentIndex,
            onDestinationSelected: _go,
            leading: Padding(
              padding: const EdgeInsets.fromLTRB(12, 22, 12, 26),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  ClipRRect(
                    borderRadius: BorderRadius.circular(12),
                    child: Image.asset(
                      'assets/branding/app_icon.png',
                      width: 34,
                      height: 34,
                    ),
                  ),
                  if (width >= 1180) ...[
                    const SizedBox(width: 10),
                    const Text(
                      '点点',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            destinations: [
              for (final item in _destinations)
                NavigationRailDestination(
                  icon: Icon(item.icon),
                  selectedIcon: Icon(item.selectedIcon, color: AppColors.seed),
                  label: Text(item.label),
                ),
            ],
            trailing: const Expanded(
              child: Align(
                alignment: Alignment.bottomCenter,
                child: Padding(
                  padding: EdgeInsets.only(bottom: 18),
                  child: Text(
                    '本地优先',
                    style: TextStyle(fontSize: 10, color: AppColors.textMuted),
                  ),
                ),
              ),
            ),
          ),
          const VerticalDivider(width: 1),
          Expanded(child: content),
        ],
      ),
    );
  }
}

class _Destination {
  const _Destination(this.label, this.icon, this.selectedIcon);
  final String label;
  final IconData icon;
  final IconData selectedIcon;
}
