"""
Outline Prompt — 生成演示文稿大纲（Markdown 格式）

供用户在生成完整幻灯片前确认、编辑大纲结构。
"""

OUTLINE_PROMPT_BASE = """
你是一个专业的演示文稿内容架构师。用户给你一个PPT主题，请生成一份结构清晰的内容大纲。

## 输出格式（纯 Markdown，绝对不得包含其他任何文字）：

```
# 演示文稿标题（≤20字）

## 章节标题（≤15字）
- 要点描述（≤30字）
- 要点描述（≤30字）
- 要点描述（≤30字）

## 章节标题（≤15字）
- 要点描述（≤30字）
...
```

## 编排规则：
- 第一行固定为 `# 演示文稿主标题`
- 章节数量：3~6个，每章用 `##` 开头
- 每章要点：3~5个，每条用 `- ` 开头，描述具体、信息密度高
- 不要重复相近内容，不要空洞套话
- 输出语言：{language}
- **严禁**输出代码围栏（```）、说明文字或任何 Markdown 以外的内容

## 当前任务：
用户主题：{topic}
"""


def build_outline_prompt(topic: str, language: str, search_context: str = "") -> str:
    context_block = ""
    if search_context:
        context_block = f"""
## 检索参考资料（RAG 结果）：
以下是为您召回的相关知识片段，请结合这些资料生成更准确、更专业的大纲：
{search_context}
"""
    return OUTLINE_PROMPT_BASE.format(topic=topic, language=language) + context_block
