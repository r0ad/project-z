import 'dart:convert';

import '../../core/formatters.dart';
import '../../domain/models.dart';
import '../../domain/repositories.dart';
import 'context_builder.dart';
import 'gateway.dart';
import 'prompts.dart';

// 私有字段配合命名参数，无法使用 initializing formal。
// ignore_for_file: prefer_initializing_formals
import 'sse.dart';
import 'types.dart';

class MilestoneSuggestion {
  const MilestoneSuggestion({
    required this.title,
    this.description = '',
    this.dueDate,
  });

  final String title;
  final String description;
  final String? dueDate;

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    if (dueDate != null) 'dueDate': dueDate,
  };
}

class ProjectPlanSuggestion {
  const ProjectPlanSuggestion({required this.goal, required this.milestones});
  final String goal;
  final List<MilestoneSuggestion> milestones;
}

class LogStructure {
  const LogStructure({
    required this.progressText,
    this.problemText = '',
    this.planText = '',
    this.milestoneTitle,
  });

  final String progressText;
  final String problemText;
  final String planText;
  final String? milestoneTitle;
}

/// AI 业务门面：负责取配置、拼 Prompt、解析 JSON、流式转发。
/// 页面只依赖这一层，不直接碰 Gateway。
class AiService {
  AiService({
    required AiGateway gateway,
    required AiConfigRepository configs,
    required SecretStore secrets,
    required SettingsRepository settings,
    ContextBuilder context = const ContextBuilder(),
  }) : _gateway = gateway,
       _configs = configs,
       _secrets = secrets,
       _settings = settings,
       _context = context;

  final AiGateway _gateway;
  final AiConfigRepository _configs;
  final SecretStore _secrets;
  final SettingsRepository _settings;
  final ContextBuilder _context;

  Future<void> _applyProxy() async {
    final gateway = _gateway;
    if (gateway is OpenAiCompatibleGateway) {
      gateway.setProxy(await _settings.get('network_proxy'));
    }
  }

  Future<(AiConfig, String)> _active() async {
    await _applyProxy();
    final config = await _configs.active();
    if (config == null) {
      throw const AiException('还没有可用的 AI 配置，请先到「设置 → AI 供应商」添加并激活一个供应商。');
    }
    final key = await _secrets.read(config.storageKey);
    if (key == null || key.trim().isEmpty) {
      throw AiException('「${config.name}」没有保存 API Key，请到设置中补填。');
    }
    return (config, key);
  }

  Future<AiCompletion> complete({
    required List<AiMessage> messages,
    bool jsonMode = false,
    List<AiToolDefinition>? tools,
  }) async {
    final (config, key) = await _active();
    return _gateway.complete(
      config: config,
      apiKey: key,
      messages: messages,
      jsonMode: jsonMode,
      tools: tools,
    );
  }

  Stream<AiStreamEvent> stream(
    List<AiMessage> messages, {
    List<AiToolDefinition>? tools,
  }) async* {
    final (config, key) = await _active();
    yield* _gateway.stream(
      config: config,
      apiKey: key,
      messages: messages,
      tools: tools,
    );
  }

  Future<void> testConnection(AiConfig config, String apiKey) async {
    await _applyProxy();
    return _gateway.testConnection(config: config, apiKey: apiKey);
  }

  Future<ProjectPlanSuggestion> planProject({
    required String title,
    required String description,
    String goal = '',
    String? dueDate,
  }) async {
    final json = await _completeJson(
      system: '你是严谨的项目教练，只输出合法 JSON。',
      user: planProjectPrompt(
        title: title,
        description: description,
        goal: goal,
        dueDate: dueDate,
        today: dateKey(DateTime.now()),
      ),
    );
    final milestones = ((json['milestones'] as List?) ?? const [])
        .whereType<Map>()
        .map((m) {
          final map = m.cast<String, dynamic>();
          return MilestoneSuggestion(
            title: (map['title'] as String?)?.trim() ?? '',
            description: (map['description'] as String?)?.trim() ?? '',
            dueDate: _date(map['dueDate']),
          );
        })
        .where((m) => m.title.isNotEmpty)
        .take(8)
        .toList();
    return ProjectPlanSuggestion(
      goal: (json['goal'] as String?)?.trim() ?? goal,
      milestones: milestones,
    );
  }

  Future<LogStructure> structureLog({
    required String rawInput,
    required String projectTitle,
    String projectGoal = '',
    List<String> milestoneTitles = const [],
  }) async {
    final json = await _completeJson(
      system: '你是记录整理助手，不编造事实，只输出合法 JSON。',
      user: structureLogPrompt(
        rawInput: rawInput,
        projectTitle: projectTitle,
        projectGoal: projectGoal,
        milestoneTitles: milestoneTitles,
      ),
    );
    return LogStructure(
      progressText:
          (json['progressText'] as String?)?.trim() ?? rawInput.trim(),
      problemText: (json['problemText'] as String?)?.trim() ?? '',
      planText: (json['planText'] as String?)?.trim() ?? '',
      milestoneTitle: _date(json['milestoneTitle']),
    );
  }

  Future<AiInsight> analyzeProject(ProjectDetail detail) async {
    final (config, _) = await _active();
    final completion = await _gateway.complete(
      config: config,
      apiKey: await _secrets.read(config.storageKey) ?? '',
      messages: [
        const AiMessage(
          role: AiRole.system,
          content: '你是项目复盘教练。只基于给定事实分析，使用 Markdown，不要编造。',
        ),
        AiMessage(
          role: AiRole.user,
          content: analyzeProjectPrompt(
            projectContext: _context.project(detail),
            logsContext: _context.logs(detail.logs),
            knowledgeContext: _context.knowledge(const []),
          ),
        ),
      ],
    );
    final now = DateTime.now().toUtc().millisecondsSinceEpoch;
    return AiInsight(
      id: 'insight_${now}_${detail.project.id}',
      kind: InsightKind.projectAnalysis,
      title: '${detail.project.title} · 项目分析',
      content: completion.content.trim(),
      projectId: detail.project.id,
      model: config.model,
      promptVersion: PromptVersions.analyze,
      sourceRefs: jsonEncode(detail.logs.take(10).map((e) => e.id).toList()),
      createdAt: now,
      updatedAt: now,
    );
  }

  Future<AiInsight> weeklyReview({
    required WeeklyStats stats,
    required List<Project> projects,
    required List<ProjectLog> logs,
  }) async {
    final (config, _) = await _active();
    final projectLines = projects
        .take(8)
        .map((p) => '- ${p.title}：${p.status.label} ${p.progress}%')
        .join('\n');
    final completion = await _gateway.complete(
      config: config,
      apiKey: await _secrets.read(config.storageKey) ?? '',
      messages: [
        const AiMessage(
          role: AiRole.system,
          content: '你是周复盘教练。只基于给定事实，使用 Markdown，不要编造。',
        ),
        AiMessage(
          role: AiRole.user,
          content: weeklyReviewPrompt(
            weekLabel: stats.weekStart,
            statsContext:
                '本周记录 ${stats.totalLogs} 条，活跃项目 ${stats.activeProjects} 个，'
                '完成里程碑 ${stats.completedMilestones} 个。',
            projectContext: '项目概览：\n$projectLines',
            logsContext: _context.logs(logs, limit: 20),
          ),
        ),
      ],
    );
    final now = DateTime.now().toUtc().millisecondsSinceEpoch;
    return AiInsight(
      id: 'weekly_$now',
      kind: InsightKind.weeklyReview,
      title: '$stats.weekStart 周复盘',
      content: completion.content.trim(),
      model: config.model,
      promptVersion: PromptVersions.weekly,
      periodStart: stats.weekStart,
      sourceRefs: '[]',
      createdAt: now,
      updatedAt: now,
    );
  }

  List<AiMessage> chatMessages({
    required String userMessage,
    required List<ChatMessage> history,
    ProjectDetail? project,
    List<KnowledgeEntry> knowledge = const [],
    String workspaceContext = '',
  }) {
    final projectText = project == null
        ? '当前没有打开具体项目。'
        : _context.project(project);
    final system = chatSystemPrompt(
      userContext: '今天是 ${DateTime.now().toIso8601String().split('T').first}。',
      projectContext: projectText,
      knowledgeContext: _context.knowledge(knowledge),
      workspaceContext: workspaceContext,
    );
    return [
      AiMessage(role: AiRole.system, content: system),
      ...history
          .where((m) => m.role == ChatRole.user || m.role == ChatRole.assistant)
          .where((m) => m.content.trim().isNotEmpty)
          .take(20)
          .map(
            (m) => AiMessage(
              role: m.role == ChatRole.user ? AiRole.user : AiRole.assistant,
              content: m.content,
            ),
          ),
      AiMessage(role: AiRole.user, content: userMessage),
    ];
  }

  Future<Map<String, dynamic>> _completeJson({
    required String system,
    required String user,
  }) async {
    final messages = <AiMessage>[
      AiMessage(role: AiRole.system, content: system),
      AiMessage(role: AiRole.user, content: user),
    ];
    Object? lastError;
    for (var attempt = 0; attempt < 2; attempt++) {
      try {
        final completion = await complete(
          messages: messages,
          jsonMode: attempt == 0,
        );
        final raw = extractJson(completion.content);
        if (raw != null) {
          final decoded = jsonDecode(raw);
          if (decoded is Map<String, dynamic>) return decoded;
          if (decoded is Map) return decoded.cast<String, dynamic>();
        }
        lastError = '返回内容不是 JSON';
      } on AiException catch (e) {
        // 网络/鉴权/限流错误重试没有意义，直接交给页面显示友好文案。
        if (e.kind != AiErrorKind.badResponse) rethrow;
        lastError = e.userMessage;
      } on FormatException {
        lastError = '返回内容不是 JSON';
      } catch (_) {
        lastError = '请求失败';
      }
      messages
        ..add(const AiMessage(role: AiRole.assistant, content: '（上一次输出不可解析）'))
        ..add(
          const AiMessage(
            role: AiRole.user,
            content: '请只输出合法 JSON，不要 Markdown 围栏、不要解释、不要多余文字。',
          ),
        );
    }
    throw AiException(
      lastError == null
          ? 'AI 返回内容不是合法 JSON，请重试'
          : 'AI 返回内容不是合法 JSON，请重试（$lastError）',
      kind: AiErrorKind.badResponse,
    );
  }

  String? _date(Object? value) {
    if (value is! String) return null;
    final text = value.trim();
    if (text.isEmpty || text == 'null') return null;
    return text;
  }
}
