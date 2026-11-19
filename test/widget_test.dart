import 'package:diandian/app/theme.dart';
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
}
