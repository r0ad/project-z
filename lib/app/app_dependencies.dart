import 'dart:io';

import '../data/ai/gateway.dart';
import '../data/ai/service.dart';
import '../data/local/app_database.dart';
import '../data/repositories/content_repositories.dart';
import '../data/repositories/project_repositories.dart';
import '../data/security/secure_store.dart';
import '../domain/repositories.dart';

/// 手动依赖注入容器：单用户本地应用，不引入 service locator。
class AppDependencies {
  AppDependencies._({
    required this.database,
    required this.projects,
    required this.milestones,
    required this.logs,
    required this.insights,
    required this.knowledge,
    required this.chats,
    required this.aiConfigs,
    required this.settings,
    required this.stats,
    required this.toolCalls,
    required this.secrets,
    required this.ai,
  });

  final AppDatabase database;
  final ProjectRepository projects;
  final MilestoneRepository milestones;
  final LogRepository logs;
  final InsightRepository insights;
  final KnowledgeRepository knowledge;
  final ChatRepository chats;
  final AiConfigRepository aiConfigs;
  final SettingsRepository settings;
  final StatsRepository stats;
  final ToolAuditRepository toolCalls;
  final SecretStore secrets;
  final AiService ai;

  static Future<AppDependencies> bootstrap() async {
    final database = AppDatabase(openAppDatabase());
    final secretsPath = Platform.environment['DIANDIAN_SECRETS_FILE'];
    final secrets = (secretsPath != null && secretsPath.trim().isNotEmpty)
        ? FileSecretStore(File(secretsPath))
        : FlutterSecureSecretStore();
    final aiConfigs = DriftAiConfigRepository(database, secrets);
    final settings = DriftSettingsRepository(database);
    final proxy = await settings.get('network_proxy');
    return AppDependencies._(
      database: database,
      projects: DriftProjectRepository(database),
      milestones: DriftMilestoneRepository(database),
      logs: DriftLogRepository(database),
      insights: DriftInsightRepository(database),
      knowledge: DriftKnowledgeRepository(database),
      chats: DriftChatRepository(database),
      aiConfigs: aiConfigs,
      settings: settings,
      stats: DriftStatsRepository(database),
      toolCalls: DriftToolAuditRepository(database),
      secrets: secrets,
      ai: AiService(
        gateway: OpenAiCompatibleGateway(proxy: proxy),
        configs: aiConfigs,
        secrets: secrets,
        settings: settings,
      ),
    );
  }
}
