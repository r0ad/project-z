import 'package:material_ui/material_ui.dart';
import 'package:go_router/go_router.dart';

import '../features/chat/chat_page.dart';
import '../features/home/home_page.dart';
import '../features/knowledge/knowledge_detail_page.dart';
import '../features/knowledge/knowledge_editor_page.dart';
import '../features/knowledge/knowledge_page.dart';
import '../features/logs/log_editor_page.dart';
import '../features/projects/project_detail_page.dart';
import '../features/projects/project_editor_page.dart';
import '../features/projects/projects_page.dart';
import '../features/settings/settings_page.dart';
import '../features/stats/stats_page.dart';
import 'shell.dart';
import 'theme.dart';

GoRouter createRouter() {
  final rootKey = GlobalKey<NavigatorState>(debugLabel: 'root');

  return GoRouter(
    navigatorKey: rootKey,
    initialLocation: '/',
    routes: [
      StatefulShellRoute.indexedStack(
        builder: (context, state, navigationShell) =>
            AppShell(navigationShell: navigationShell),
        branches: [
          StatefulShellBranch(
            routes: [
              GoRoute(path: '/', builder: (context, state) => const HomePage()),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/projects',
                builder: (context, state) => const ProjectsPage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/knowledge',
                builder: (context, state) => const KnowledgePage(),
              ),
            ],
          ),
          StatefulShellBranch(
            routes: [
              GoRoute(
                path: '/profile',
                builder: (context, state) => const SettingsPage(),
              ),
            ],
          ),
        ],
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/projects/new',
        builder: (context, state) => const ProjectEditorPage(),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/projects/:id',
        builder: (context, state) =>
            ProjectDetailPage(projectId: state.pathParameters['id']!),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/projects/:id/logs/new',
        builder: (context, state) =>
            LogEditorPage(projectId: state.pathParameters['id']!),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/projects/:id/logs/:logId',
        builder: (context, state) => LogEditorPage(
          projectId: state.pathParameters['id']!,
          logId: state.pathParameters['logId'],
        ),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/projects/:id/chat',
        builder: (context, state) =>
            ChatPage(projectId: state.pathParameters['id']),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/knowledge/new',
        builder: (context, state) => const KnowledgeEditorPage(),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/knowledge/:id/edit',
        builder: (context, state) =>
            KnowledgeEditorPage(entryId: state.pathParameters['id']),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/knowledge/:id',
        builder: (context, state) =>
            KnowledgeDetailPage(id: state.pathParameters['id']!),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/chat',
        builder: (context, state) =>
            ChatPage(draft: state.uri.queryParameters['draft'] ?? ''),
      ),
      GoRoute(
        parentNavigatorKey: rootKey,
        path: '/stats',
        builder: (context, state) => const StatsPage(),
      ),
    ],
    errorBuilder: (context, state) => Scaffold(
      backgroundColor: AppColors.background,
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Icon(Icons.explore_off_outlined, size: 44),
              const SizedBox(height: 14),
              const Text(
                '这里还没有页面',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
              ),
              const SizedBox(height: 8),
              Text(
                state.uri.toString(),
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.textMuted,
                  fontSize: 12,
                ),
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () => context.go('/'),
                child: const Text('回到今日'),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
