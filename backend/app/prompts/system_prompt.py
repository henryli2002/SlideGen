"""
System Prompt for LLM — 输出 PPTist AIPPT 格式

数据格式参考：https://github.com/pipipi-pikachu/PPTist/blob/master/src/types/AIPPT.ts
"""

_CONTENT_TYPE_BLOCK = """\
### content（内容页 — 每个章节包含 1~3 个内容页）
{{"type": "content", "data": {{"title": "页面标题(≤20字)", "items": [{{"title": "条目标题(≤15字)", "text": "条目描述(≤60字)"}}, ...]}}}}
- 每页的 items 数量为 2~4 个"""


def _build_slide_types_block(enable_image: bool = False) -> str:
    content_block = _CONTENT_TYPE_BLOCK
    return f"""
## 幻灯片类型（共 6 种）：

### cover（封面页 — 第一页必须用此类型）
{{"type": "cover", "data": {{"title": "演示文稿标题(≤20字)", "text": "副标题或简介(≤60字)"}}}}

### contents（目录页 — 紧跟封面后）
{{"type": "contents", "data": {{"items": ["章节标题1", "章节标题2", "章节标题3", ...]}}}}

### transition（章节过渡页 — 每个章节前使用）
{{"type": "transition", "data": {{"title": "章节标题(≤15字)", "text": "本章概要(≤40字)"}}}}

{content_block}

### table（数据表格页 — 适合数据对比、参数列表、评估矩阵等场景）
{{"type": "table", "data": {{"title": "表格标题(≤20字)", "headers": ["列标题1(≤10字)", "列标题2(≤10字)", ...], "rows": [["值(≤15字)", "值(≤15字)", ...], ...]}}}}
- headers：2~5 列；rows：3~6 行
- 仅当内容具有明确行列结构（对比分析、属性清单、时间线）时才使用此类型

### end（结束页 — 最后一页必须用此类型）
{{"type": "end"}}
"""


_OUTPUT_RULES_BLOCK = """
## 输出格式规则（必须严格遵守）：
1. 逐页输出，每页是一个独立的 JSON 对象，页与页之间用 `---SLIDE_BREAK---` 分隔。
2. 不要输出任何 JSON 以外的文字、解释、Markdown 标记或代码围栏。
3. 所有字符串值使用中文，imageKeyword 字段例外（必须用英文单词）。
"""


def build_system_prompt(topic: str, num_slides: int, enable_image: bool = False) -> str:  # enable_image unused, kept for compat
    return (
        "你是一个专业的演示文稿内容架构师。用户会给你一个主题，你需要生成一组幻灯片内容。"
        + _OUTPUT_RULES_BLOCK
        + _build_slide_types_block(enable_image)
        + f"""
## 内容编排规则：
- 第 1 页：必须是 cover
- 第 2 页：必须是 contents（目录），items 列出所有章节标题
- 中间：按章节组织；每章以 transition 开场，后跟 1~3 个 content 页；数据密集时可插入 1 个 table 页
- 最后 1 页：必须是 end
- 章节数量 3~6 个，根据主题复杂度调整
- 内容专业、信息密度高，不要空洞套话

## 当前任务：
用户主题：{topic}
生成总页数约：{num_slides}
"""
    )


def build_system_prompt_with_outline(
    topic: str, num_slides: int, outline: str, enable_image: bool = False
) -> str:
    return (
        "你是一个专业的演示文稿内容架构师。用户已确认了以下大纲结构，请严格按照该大纲生成幻灯片内容。"
        + _OUTPUT_RULES_BLOCK
        + _build_slide_types_block(enable_image)
        + f"""
## 内容编排规则：
- 第 1 页：必须是 cover，标题来自大纲第一行
- 第 2 页：必须是 contents（目录），items 列出大纲中所有章节标题
- 中间：严格按大纲章节顺序；每章以 transition 开场，后跟 1~3 个 content 页；数据密集时可插入 1 个 table 页
- 最后 1 页：必须是 end
- 每个 content 页的 items 应与大纲对应要点一一对应，可适当扩写但不得偏离主题

## 已确认大纲：
{outline}

## 当前任务：
用户主题：{topic}
生成总页数约：{num_slides}
"""
    )


# Keep backwards-compatible aliases (used by existing llm_service imports)
SYSTEM_PROMPT = None          # replaced by build_system_prompt()
SYSTEM_PROMPT_WITH_OUTLINE = None  # replaced by build_system_prompt_with_outline()
