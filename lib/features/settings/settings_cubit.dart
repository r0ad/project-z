import 'package:equatable/equatable.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:uuid/uuid.dart';

import '../../app/app_dependencies.dart';
import '../../core/app_events.dart';
import '../../data/ai/types.dart';
import '../../domain/models.dart';

class SettingsState extends Equatable {
  const SettingsState({
    this.loading = true,
    this.configs = const [],
    this.userName = '',
    this.proxy = '',
    this.saving = false,
    this.testing = false,
    this.testResult,
    this.error,
  });

  final bool loading;
  final List<AiConfig> configs;
  final String userName;
  final String proxy;
  final bool saving;
  final bool testing;
  final bool? testResult;
  final String? error;

  AiConfig? get active {
    for (final config in configs) {
      if (config.isActive) return config;
    }
    return null;
  }

  SettingsState copyWith({
    bool? loading,
    List<AiConfig>? configs,
    String? userName,
    String? proxy,
    bool? saving,
    bool? testing,
    bool? testResult,
    String? error,
  }) {
    return SettingsState(
      loading: loading ?? this.loading,
      configs: configs ?? this.configs,
      userName: userName ?? this.userName,
      proxy: proxy ?? this.proxy,
      saving: saving ?? this.saving,
      testing: testing ?? this.testing,
      testResult: testResult,
      error: error,
    );
  }

  @override
  List<Object?> get props => [
    loading,
    configs,
    userName,
    proxy,
    saving,
    testing,
    testResult,
    error,
  ];
}

class SettingsCubit extends Cubit<SettingsState> {
  SettingsCubit(this._deps) : super(const SettingsState());
  final AppDependencies _deps;
  final _uuid = const Uuid();

  Future<void> load() async {
    emit(state.copyWith(loading: true, error: null));
    try {
      final configs = await _deps.aiConfigs.list();
      final name = await _deps.settings.get('user_name') ?? '';
      final proxy = await _deps.settings.get('network_proxy') ?? '';
      emit(
        state.copyWith(
          loading: false,
          configs: configs,
          userName: name,
          proxy: proxy,
        ),
      );
    } catch (e) {
      emit(state.copyWith(loading: false, error: e.toString()));
    }
  }

  Future<void> setUserName(String name) async {
    await _deps.settings.set('user_name', name.trim());
    emit(state.copyWith(userName: name.trim()));
    AppEvents.bump();
  }

  Future<void> setProxy(String value) async {
    final proxy = value.trim();
    await _deps.settings.set('network_proxy', proxy);
    emit(state.copyWith(proxy: proxy));
  }

  Future<void> saveConfig({
    AiConfig? existing,
    required String providerKey,
    required String name,
    required String baseUrl,
    required String model,
    String apiKey = '',
    bool activate = true,
  }) async {
    emit(state.copyWith(saving: true, error: null));
    try {
      final now = DateTime.now().toUtc().millisecondsSinceEpoch;
      final config = AiConfig(
        id: existing?.id ?? _uuid.v4(),
        name: name.trim(),
        providerKey: providerKey,
        baseUrl: baseUrl.trim(),
        model: model.trim(),
        temperature: existing?.temperature ?? 0.7,
        maxTokens: existing?.maxTokens ?? 4096,
        timeoutSeconds: existing?.timeoutSeconds ?? 90,
        isActive: activate,
        supportsTools: existing?.supportsTools ?? true,
        supportsStream: existing?.supportsStream ?? true,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      );
      await _deps.aiConfigs.save(config, apiKey: apiKey);
      await load();
      emit(state.copyWith(saving: false));
      AppEvents.bump();
    } on AiException catch (e) {
      emit(state.copyWith(saving: false, error: e.userMessage));
    } catch (e) {
      emit(state.copyWith(saving: false, error: e.toString()));
    }
  }

  Future<void> activate(String id) async {
    await _deps.aiConfigs.setActive(id);
    await load();
    AppEvents.bump();
  }

  Future<void> delete(String id) async {
    await _deps.aiConfigs.delete(id);
    await load();
    AppEvents.bump();
  }

  Future<String?> apiKeyFor(String id) => _deps.aiConfigs.readApiKey(id);

  Future<void> test(AiConfig config, {String apiKey = ''}) async {
    emit(state.copyWith(testing: true, testResult: null, error: null));
    try {
      final key = apiKey.trim().isEmpty
          ? await _deps.aiConfigs.readApiKey(config.id) ?? ''
          : apiKey.trim();
      await _deps.ai.testConnection(config, key);
      emit(state.copyWith(testing: false, testResult: true));
    } on AiException catch (e) {
      emit(
        state.copyWith(testing: false, testResult: false, error: e.userMessage),
      );
    } catch (e) {
      emit(
        state.copyWith(testing: false, testResult: false, error: e.toString()),
      );
    }
  }

  AiConfig previewConfig({
    AiConfig? existing,
    required String providerKey,
    required String name,
    required String baseUrl,
    required String model,
  }) {
    final now = DateTime.now().toUtc().millisecondsSinceEpoch;
    return AiConfig(
      id: existing?.id ?? 'preview',
      name: name,
      providerKey: providerKey,
      baseUrl: baseUrl,
      model: model,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    );
  }
}
