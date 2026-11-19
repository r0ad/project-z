import 'package:drift/drift.dart';
import 'package:uuid/uuid.dart';

import '../../domain/models.dart';
import '../../domain/repositories.dart';
import '../local/app_database.dart';
import '../mappers.dart';

const _uuid = Uuid();

class DriftProjectRepository implements ProjectRepository {
  DriftProjectRepository(this._db);
  final AppDatabase _db;

  @override
  Future<List<Project>> list({
    ProjectFilter filter = const ProjectFilter(),
  }) async {
    final q = _db.select(_db.projects);
    if (filter.status != null) {
      q.where((t) => t.status.equals(filter.status!.dbValue));
    }
    final keyword = filter.query.trim();
    if (keyword.isNotEmpty) {
      final like = '%$keyword%';
      q.where(
        (t) =>
            t.title.like(like) | t.description.like(like) | t.goal.like(like),
      );
    }
    q.orderBy([
      (t) => OrderingTerm(expression: t.updatedAt, mode: OrderingMode.desc),
    ]);
    return (await q.get()).map(projectFromRow).toList();
  }

  @override
  Future<Project?> getById(String id) async {
    final row = await (_db.select(
      _db.projects,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
    return row == null ? null : projectFromRow(row);
  }

  @override
  Future<ProjectDetail?> detail(String id) async {
    final project = await getById(id);
    if (project == null) return null;
    final milestones =
        await (_db.select(_db.milestones)
              ..where((t) => t.projectId.equals(id))
              ..orderBy([(t) => OrderingTerm(expression: t.sortOrder)]))
            .get();
    final logs =
        await (_db.select(_db.projectLogs)
              ..where((t) => t.projectId.equals(id))
              ..orderBy([
                (t) => OrderingTerm(
                  expression: t.createdAt,
                  mode: OrderingMode.desc,
                ),
              ])
              ..limit(20))
            .get();
    final insights =
        await (_db.select(_db.aiInsights)
              ..where((t) => t.projectId.equals(id))
              ..orderBy([
                (t) => OrderingTerm(
                  expression: t.createdAt,
                  mode: OrderingMode.desc,
                ),
              ])
              ..limit(10))
            .get();
    return ProjectDetail(
      project: project,
      milestones: milestones.map(milestoneFromRow).toList(),
      logs: logs.map(logFromRow).toList(),
      insights: insights.map(insightFromRow).toList(),
    );
  }

  @override
  Future<Project> create(ProjectDraft draft) async {
    final now = nowMillis();
    final project = Project(
      id: _uuid.v4(),
      title: draft.title.trim(),
      description: draft.description.trim(),
      goal: draft.goal.trim(),
      status: ProjectStatus.active,
      color: draft.color,
      startDate: draft.startDate,
      dueDate: draft.dueDate,
      createdAt: now,
      updatedAt: now,
    );
    await _db.into(_db.projects).insert(projectToCompanion(project));
    return project;
  }

  @override
  Future<void> updateProject(Project project) async {
    await (_db.update(_db.projects)..where((t) => t.id.equals(project.id)))
        .write(projectToCompanion(project.copyWithUpdated(nowMillis())));
  }

  @override
  Future<void> setStatus(String id, ProjectStatus status) async {
    final now = nowMillis();
    await (_db.update(_db.projects)..where((t) => t.id.equals(id))).write(
      ProjectsCompanion(
        status: Value(status.dbValue),
        completedAt: Value(status == ProjectStatus.completed ? now : null),
        updatedAt: Value(now),
      ),
    );
  }

  @override
  Future<void> delete(String id) async {
    await _db.transaction(() async {
      await (_db.delete(_db.favorites)..where(
            (t) => t.targetType.equals('project') & t.targetId.equals(id),
          ))
          .go();
      await (_db.delete(
            _db.chatConversations,
          )..where((t) => t.scopeType.equals('project') & t.scopeId.equals(id)))
          .go();
      await (_db.delete(_db.projects)..where((t) => t.id.equals(id))).go();
    });
  }
}

extension on Project {
  Project copyWithUpdated(int updatedAt) => Project(
    id: id,
    title: title,
    description: description,
    goal: goal,
    status: status,
    progress: progress,
    color: color,
    startDate: startDate,
    dueDate: dueDate,
    completedAt: completedAt,
    sortOrder: sortOrder,
    createdAt: createdAt,
    updatedAt: updatedAt,
  );
}

class DriftMilestoneRepository implements MilestoneRepository {
  DriftMilestoneRepository(this._db);
  final AppDatabase _db;

  @override
  Future<List<Milestone>> listByProject(String projectId) async {
    final rows =
        await (_db.select(_db.milestones)
              ..where((t) => t.projectId.equals(projectId))
              ..orderBy([(t) => OrderingTerm(expression: t.sortOrder)]))
            .get();
    return rows.map(milestoneFromRow).toList();
  }

  @override
  Future<Milestone?> getById(String id) async {
    final row = await (_db.select(
      _db.milestones,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
    return row == null ? null : milestoneFromRow(row);
  }

  @override
  Future<Milestone> create(MilestoneDraft draft) async {
    final now = nowMillis();
    final order = await _nextOrder(draft.projectId);
    final milestone = Milestone(
      id: _uuid.v4(),
      projectId: draft.projectId,
      title: draft.title.trim(),
      description: draft.description.trim(),
      dueDate: draft.dueDate,
      sortOrder: order,
      createdAt: now,
      updatedAt: now,
    );
    await _db.transaction(() async {
      await _db
          .into(_db.milestones)
          .insert(
            MilestonesCompanion.insert(
              id: milestone.id,
              projectId: milestone.projectId,
              title: milestone.title,
              description: Value(milestone.description),
              dueDate: Value(milestone.dueDate),
              sortOrder: Value(milestone.sortOrder),
              createdAt: now,
              updatedAt: now,
            ),
          );
      await _recompute(draft.projectId);
    });
    return milestone;
  }

  Future<int> _nextOrder(String projectId) async {
    final maxOrder = _db.milestones.sortOrder.max();
    final query = _db.selectOnly(_db.milestones)
      ..addColumns([maxOrder])
      ..where(_db.milestones.projectId.equals(projectId));
    final row = await query.getSingle();
    return (row.read(maxOrder) ?? -1) + 1;
  }

  @override
  Future<void> updateMilestone(Milestone milestone) async {
    await _db.transaction(() async {
      await (_db.update(
        _db.milestones,
      )..where((t) => t.id.equals(milestone.id))).write(
        MilestonesCompanion(
          title: Value(milestone.title),
          description: Value(milestone.description),
          dueDate: Value(milestone.dueDate),
          isCompleted: Value(milestone.isCompleted),
          completedAt: Value(milestone.completedAt),
          sortOrder: Value(milestone.sortOrder),
          updatedAt: Value(nowMillis()),
        ),
      );
      await _recompute(milestone.projectId);
    });
  }

  @override
  Future<void> toggle(String id, bool completed) async {
    await _db.transaction(() async {
      final row = await (_db.select(
        _db.milestones,
      )..where((t) => t.id.equals(id))).getSingleOrNull();
      if (row == null) return;
      final now = nowMillis();
      await (_db.update(_db.milestones)..where((t) => t.id.equals(id))).write(
        MilestonesCompanion(
          isCompleted: Value(completed),
          completedAt: Value(completed ? now : null),
          updatedAt: Value(now),
        ),
      );
      await _recompute(row.projectId);
    });
  }

  @override
  Future<void> delete(String id) async {
    await _db.transaction(() async {
      final row = await (_db.select(
        _db.milestones,
      )..where((t) => t.id.equals(id))).getSingleOrNull();
      if (row == null) return;
      await (_db.delete(_db.milestones)..where((t) => t.id.equals(id))).go();
      await _recompute(row.projectId);
    });
  }

  @override
  Future<void> reorder(String projectId, List<String> orderedIds) async {
    await _db.transaction(() async {
      for (var i = 0; i < orderedIds.length; i++) {
        await (_db.update(_db.milestones)..where(
              (t) => t.id.equals(orderedIds[i]) & t.projectId.equals(projectId),
            ))
            .write(
              MilestonesCompanion(
                sortOrder: Value(i),
                updatedAt: Value(nowMillis()),
              ),
            );
      }
    });
  }

  Future<void> _recompute(String projectId) async {
    final rows = await (_db.select(
      _db.milestones,
    )..where((t) => t.projectId.equals(projectId))).get();
    final total = rows.length;
    final done = rows.where((r) => r.isCompleted).length;
    final progress = total == 0 ? 0 : ((done / total) * 100).round();
    final allDone = total > 0 && done == total;
    final project = await (_db.select(
      _db.projects,
    )..where((t) => t.id.equals(projectId))).getSingleOrNull();
    if (project == null) return;
    final now = nowMillis();
    final shouldComplete =
        allDone && project.status != ProjectStatus.completed.dbValue;
    final shouldReactivate =
        !allDone && project.status == ProjectStatus.completed.dbValue;
    await (_db.update(
      _db.projects,
    )..where((t) => t.id.equals(projectId))).write(
      ProjectsCompanion(
        progress: Value(progress),
        status: shouldComplete
            ? const Value('completed')
            : shouldReactivate
            ? const Value('active')
            : const Value.absent(),
        completedAt: shouldComplete
            ? Value(now)
            : shouldReactivate
            ? const Value(null)
            : const Value.absent(),
        updatedAt: Value(now),
      ),
    );
  }
}

class DriftLogRepository implements LogRepository {
  DriftLogRepository(this._db);
  final AppDatabase _db;

  @override
  Future<List<ProjectLog>> listByProject(
    String projectId, {
    int limit = 100,
  }) async {
    final rows =
        await (_db.select(_db.projectLogs)
              ..where((t) => t.projectId.equals(projectId))
              ..orderBy([
                (t) => OrderingTerm(
                  expression: t.logDate,
                  mode: OrderingMode.desc,
                ),
                (t) => OrderingTerm(
                  expression: t.createdAt,
                  mode: OrderingMode.desc,
                ),
              ])
              ..limit(limit))
            .get();
    return rows.map(logFromRow).toList();
  }

  @override
  Future<List<ProjectLog>> recent({int days = 7, String? projectId}) async {
    final start = dateKey(DateTime.now().subtract(Duration(days: days - 1)));
    final q = _db.select(_db.projectLogs)
      ..where((t) => t.logDate.isBiggerOrEqualValue(start));
    if (projectId != null) q.where((t) => t.projectId.equals(projectId));
    q.orderBy([
      (t) => OrderingTerm(expression: t.logDate, mode: OrderingMode.desc),
      (t) => OrderingTerm(expression: t.createdAt, mode: OrderingMode.desc),
    ]);
    return (await q.get()).map(logFromRow).toList();
  }

  @override
  Future<ProjectLog?> getById(String id) async {
    final row = await (_db.select(
      _db.projectLogs,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
    return row == null ? null : logFromRow(row);
  }

  @override
  Future<ProjectLog> create(LogDraft draft) async {
    final now = nowMillis();
    final log = ProjectLog(
      id: _uuid.v4(),
      projectId: draft.projectId,
      logDate: draft.logDate,
      progressText: draft.progressText.trim(),
      problemText: draft.problemText.trim(),
      planText: draft.planText.trim(),
      rawInput: draft.rawInput,
      milestoneId: draft.milestoneId,
      createdAt: now,
      updatedAt: now,
    );
    await _db
        .into(_db.projectLogs)
        .insert(
          ProjectLogsCompanion.insert(
            id: log.id,
            projectId: log.projectId,
            logDate: log.logDate,
            progressText: Value(log.progressText),
            problemText: Value(log.problemText),
            planText: Value(log.planText),
            rawInput: Value(log.rawInput),
            milestoneId: Value(log.milestoneId),
            createdAt: now,
            updatedAt: now,
          ),
        );
    await (_db.update(_db.projects)..where((t) => t.id.equals(log.projectId)))
        .write(ProjectsCompanion(updatedAt: Value(now)));
    return log;
  }

  @override
  Future<void> updateLog(ProjectLog log) async {
    await (_db.update(
      _db.projectLogs,
    )..where((t) => t.id.equals(log.id))).write(
      ProjectLogsCompanion(
        logDate: Value(log.logDate),
        progressText: Value(log.progressText),
        problemText: Value(log.problemText),
        planText: Value(log.planText),
        rawInput: Value(log.rawInput),
        milestoneId: Value(log.milestoneId),
        updatedAt: Value(nowMillis()),
      ),
    );
  }

  @override
  Future<void> delete(String id) async {
    await (_db.delete(_db.projectLogs)..where((t) => t.id.equals(id))).go();
  }

  @override
  Future<List<LogSearchHit>> search(String query, {String? projectId}) async {
    final match = _toMatch(query);
    if (match.isEmpty) return const [];
    final projectFilter = projectId == null ? '' : 'AND l.project_id = ?';
    final rows = await _db
        .customSelect(
          'SELECT l.*, p.title AS project_title FROM project_logs_fts f '
          'JOIN project_logs l ON l.id = f.log_id '
          'JOIN projects p ON p.id = l.project_id '
          'WHERE project_logs_fts MATCH ? $projectFilter '
          'ORDER BY rank LIMIT 50',
          variables: [
            Variable.withString(match),
            if (projectId != null) Variable.withString(projectId),
          ],
        )
        .get();
    return rows.map((r) {
      final log = ProjectLog(
        id: r.read<String>('id'),
        projectId: r.read<String>('project_id'),
        logDate: r.read<String>('log_date'),
        progressText: r.read<String>('progress_text'),
        problemText: r.read<String>('problem_text'),
        planText: r.read<String>('plan_text'),
        rawInput: r.readNullable<String>('raw_input'),
        milestoneId: r.readNullable<String>('milestone_id'),
        createdAt: r.read<int>('created_at'),
        updatedAt: r.read<int>('updated_at'),
      );
      return LogSearchHit(
        log: log,
        projectTitle: r.read<String>('project_title'),
      );
    }).toList();
  }

  String _toMatch(String query) {
    final tokens = query
        .trim()
        .split(RegExp(r'\s+'))
        .where((e) => e.isNotEmpty)
        .map((e) => '"${e.replaceAll('"', '')}"')
        .where((e) => e.length > 2)
        .toList();
    return tokens.join(' ');
  }
}

class DriftInsightRepository implements InsightRepository {
  DriftInsightRepository(this._db);
  final AppDatabase _db;

  @override
  Future<List<AiInsight>> listByProject(String projectId) async {
    final rows =
        await (_db.select(_db.aiInsights)
              ..where((t) => t.projectId.equals(projectId))
              ..orderBy([
                (t) => OrderingTerm(
                  expression: t.createdAt,
                  mode: OrderingMode.desc,
                ),
              ]))
            .get();
    return rows.map(insightFromRow).toList();
  }

  @override
  Future<AiInsight?> getById(String id) async {
    final row = await (_db.select(
      _db.aiInsights,
    )..where((t) => t.id.equals(id))).getSingleOrNull();
    return row == null ? null : insightFromRow(row);
  }

  @override
  Future<List<AiInsight>> listWeekly() async {
    final rows =
        await (_db.select(_db.aiInsights)
              ..where((t) => t.kind.equals(InsightKind.weeklyReview.dbValue))
              ..orderBy([
                (t) => OrderingTerm(
                  expression: t.createdAt,
                  mode: OrderingMode.desc,
                ),
              ]))
            .get();
    return rows.map(insightFromRow).toList();
  }

  @override
  Future<AiInsight> save(AiInsight insight) async {
    await _db
        .into(_db.aiInsights)
        .insertOnConflictUpdate(
          AiInsightsCompanion.insert(
            id: insight.id,
            projectId: Value(insight.projectId),
            kind: Value(insight.kind.dbValue),
            title: insight.title,
            content: insight.content,
            model: Value(insight.model),
            promptVersion: Value(insight.promptVersion),
            periodStart: Value(insight.periodStart),
            periodEnd: Value(insight.periodEnd),
            sourceRefs: Value(insight.sourceRefs),
            createdAt: insight.createdAt,
            updatedAt: insight.updatedAt,
          ),
        );
    return insight;
  }

  @override
  Future<void> delete(String id) async {
    await (_db.delete(_db.aiInsights)..where((t) => t.id.equals(id))).go();
  }
}

class DriftStatsRepository implements StatsRepository {
  DriftStatsRepository(this._db);
  final AppDatabase _db;

  @override
  Future<WeeklyStats> weekly({DateTime? now}) async {
    final current = now ?? DateTime.now();
    final monday = DateTime(
      current.year,
      current.month,
      current.day,
    ).subtract(Duration(days: current.weekday - 1));
    final days = List.generate(
      7,
      (i) => dateKey(monday.add(Duration(days: i))),
    );
    final counts = <int>[];
    for (final day in days) {
      final count = _db.projectLogs.id.count();
      final q = _db.selectOnly(_db.projectLogs)
        ..addColumns([count])
        ..where(_db.projectLogs.logDate.equals(day));
      counts.add((await q.getSingle()).read(count) ?? 0);
    }
    final active = _db.projects.id.count();
    final activeQuery = _db.selectOnly(_db.projects)
      ..addColumns([active])
      ..where(_db.projects.status.equals('active'));
    final total = _db.projects.id.count();
    final totalQuery = _db.selectOnly(_db.projects)..addColumns([total]);
    final knowledge = _db.knowledgeEntries.id.count();
    final knowledgeQuery = _db.selectOnly(_db.knowledgeEntries)
      ..addColumns([knowledge]);
    final milestones = _db.milestones.id.count();
    final milestoneQuery = _db.selectOnly(_db.milestones)
      ..addColumns([milestones])
      ..where(_db.milestones.isCompleted.equals(true));
    return WeeklyStats(
      weekStart: days.first,
      logCounts: counts,
      activeProjects: (await activeQuery.getSingle()).read(active) ?? 0,
      completedMilestones:
          (await milestoneQuery.getSingle()).read(milestones) ?? 0,
      totalProjects: (await totalQuery.getSingle()).read(total) ?? 0,
      totalKnowledge: (await knowledgeQuery.getSingle()).read(knowledge) ?? 0,
    );
  }
}
