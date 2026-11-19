import 'package:material_ui/material_ui.dart';
import 'package:gpt_markdown/gpt_markdown.dart';

import '../app/theme.dart';

/// 所有 AI 输出统一用同一套 Markdown 排版，避免各页面样式漂移。
class AiMarkdown extends StatelessWidget {
  const AiMarkdown(this.data, {super.key, this.isStreaming = false});

  final String data;
  final bool isStreaming;

  @override
  Widget build(BuildContext context) {
    return GptMarkdown(
      data,
      isStreaming: isStreaming,
      style: const TextStyle(color: Colors.white, fontSize: 14, height: 1.6),
    );
  }
}

/// 轻量行内 Markdown（用于列表摘要）。
class AiMarkdownMuted extends StatelessWidget {
  const AiMarkdownMuted(this.data, {super.key, this.maxLines = 3});

  final String data;
  final int maxLines;

  @override
  Widget build(BuildContext context) {
    return GptMarkdown(
      data,
      isStreaming: false,
      maxLines: maxLines,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(
        color: AppColors.textMuted,
        fontSize: 12,
        height: 1.45,
      ),
    );
  }
}
