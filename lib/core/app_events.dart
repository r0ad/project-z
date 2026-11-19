import 'package:flutter/foundation.dart';

/// 轻量的进程内数据变更广播。
///
/// 页面之间不共享 Cubit，写操作完成后调用 [bump]，常驻页面监听后重新拉取。
class AppEvents {
  AppEvents._();

  static final ValueNotifier<int> dataChanged = ValueNotifier<int>(0);

  static void bump() => dataChanged.value++;
}
