import 'dart:io';

import 'package:package_info_plus/package_info_plus.dart';

import '../data/ai/gateway.dart';
import '../data/ai/project_tools.dart';
import '../data/ai/service.dart';
import '../data/backup/backup_service.dart';
import '../data/backup/remote_backup.dart';
import '../data/local/app_database.dart';
import '../data/repositories/content_repositories.dart';
import '../data/repositories/project_repositories.dart';
import '../data/security/secure_store.dart';
import '../data/update/update_service.dart';
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
    required this.projectTools,
    required this.backup,
    required this.webdav,
    required this.gitcode,
    required this.updates,
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
  final ProjectTools projectTools;
  final BackupService backup;
  final WebDavService webdav;
  final GitCodeService gitcode;
  final UpdateService updates;

  static Future<AppDependencies> bootstrap() async {
    final database = AppDatabase(openAppDatabase());
    final secretsPath = Platform.environment['DIANDIAN_SECRETS_FILE'];
    final secrets = (secretsPath != null && secretsPath.trim().isNotEmpty)
        ? FileSecretStore(File(secretsPath))
        : FlutterSecureSecretStore();
    final aiConfigs = DriftAiConfigRepository(database, secrets);
    final settings = DriftSettingsRepository(database);
    final projects = DriftProjectRepository(database);
    final milestones = DriftMilestoneRepository(database);
    final proxy = await settings.get('network_proxy');
    final packageInfo = await PackageInfo.fromPlatform();
    return AppDependencies._(
      database: database,
      projects: projects,
      milestones: milestones,
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
      projectTools: ProjectTools(
        projects: projects,
        milestones: milestones,
        logs: DriftLogRepository(database),
        insights: DriftInsightRepository(database),
        knowledge: DriftKnowledgeRepository(database),
      ),
      backup: BackupService(database, appVersion: packageInfo.version),
      webdav: WebDavService(settings: settings, secrets: secrets),
      gitcode: GitCodeService(settings: settings, secrets: secrets),
      updates: UpdateService(settings: settings),
    );
  }
}
