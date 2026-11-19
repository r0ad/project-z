import 'package:diandian/app/theme.dart';
import 'package:diandian/core/markdown.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:material_ui/material_ui.dart';

void main() {
  testWidgets('深色主题可渲染中文标题', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildDarkTheme(),
        home: const Scaffold(body: Center(child: Text('点点'))),
      ),
    );

    expect(find.text('点点'), findsOneWidget);
    expect(
      Theme.of(tester.element(find.text('点点'))).brightness,
      Brightness.dark,
    );
  });

  testWidgets('AI Markdown 解析标题、列表与粗体', (tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: buildDarkTheme(),
        home: const Scaffold(
          body: SingleChildScrollView(
            child: AiMarkdown(
              '## 三步计划\n\n- **第一步**：明确目标\n- 第二步：开始执行',
              isStreaming: true,
            ),
          ),
        ),
      ),
    );

    final plain = tester
        .widgetList<RichText>(find.byType(RichText))
        .map((widget) => widget.text.toPlainText())
        .join('\n');

    expect(plain, contains('三步计划'));
    expect(plain, contains('明确目标'));
    expect(plain, isNot(contains('##')));
  });
}
