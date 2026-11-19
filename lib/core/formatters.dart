import 'package:intl/intl.dart';

String dateKey(DateTime date) => DateFormat('yyyy-MM-dd').format(date);

String formatDate(String? value) {
  if (value == null || value.isEmpty) return '';
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  return DateFormat('M月d日').format(parsed);
}

String formatFullDate(String? value) {
  if (value == null || value.isEmpty) return '未设置';
  final parsed = DateTime.tryParse(value);
  if (parsed == null) return value;
  return DateFormat('yyyy年M月d日').format(parsed);
}

String relativeTime(int millis) {
  final time = DateTime.fromMillisecondsSinceEpoch(
    millis,
    isUtc: true,
  ).toLocal();
  final diff = DateTime.now().difference(time);
  if (diff.inMinutes < 1) return '刚刚';
  if (diff.inHours < 1) return '${diff.inMinutes} 分钟前';
  if (diff.inDays < 1) return '${diff.inHours} 小时前';
  if (diff.inDays < 7) return '${diff.inDays} 天前';
  return DateFormat('M月d日').format(time);
}

String greetingFor(DateTime now) {
  final hour = now.hour;
  if (hour < 6) return '夜深了';
  if (hour < 12) return '早上好';
  if (hour < 14) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

String weekLabel(DateTime now) {
  final monday = now.subtract(Duration(days: now.weekday - 1));
  final friday = monday.add(const Duration(days: 6));
  return '${DateFormat('M月d日').format(monday)} - ${DateFormat('M月d日').format(friday)}';
}
