# Elens Project Instructions

Elens is a standalone DOM element inspector SDK for Web, Electron, and Tauri apps.

中文备注：Elens 是 DOM 元素检查器 SDK。主要风险不是普通页面开发，而是 Inspector、Toolbar、Selection、Move/Drag、Runtime Styles、Design Tokens、Overlay、Extension/Demo 入口这些地方发生回归。

## Core Principles

- Think before coding. Identify the task type, affected area, likely regression risk, and completion criteria before editing.
  - 中文备注：编码前先判断任务类型、影响范围、回归风险和完成标准，不要一上来就改代码。

- Use the smallest safe change. Prefer the narrowest diff that fully solves the requested problem.
  - 中文备注：坚持最小安全修改，能局部解决就不要扩大改动范围。

- Only fix the requested problem. Do not refactor, restyle, rewrite, or improve unrelated code unless necessary.
  - 中文备注：只解决指定问题，不要顺手重构、改样式、重写或优化无关代码。

- Define completion criteria before implementation.
  - 中文备注：开始前要清楚做到什么算完成，避免越改越多或无限循环。

- Stable existing functionality must not regress.
  - 中文备注：旧功能不能因为新修复或新功能坏掉。

- Follow the Elens Design System for all UI work.
  - 中文备注：所有 UI 改动必须遵守 Elens 设计系统，优先复用已有组件和 token。

- If uncertain, say “不确定” and explain why. Do not present guesses as facts.
  - 中文备注：不确定必须明说，不能把猜测说成结论。

- End substantive responses with `可信度：X/10`.
  - 中文备注：重要回答最后给可信度评分。

## Rule Files

Read the applicable rule files under `.claude/rules/` before editing:

- `00-project-defaults.md` — response style and judgment rules
- `01-rule-maintenance.md` — how to classify and place new project rules
- `10-execution-scope.md` — task sizing, scope control, and completion criteria
- `20-regression-guardrails.md` — regression prevention and high-risk flows
- `30-ui-design-system.md` — UI reuse and design-system rules
- `31-inspector-panel.md` — inspector numeric/color/floating UI guardrails
- `40-validation-reporting.md` — validation commands and completion report
- `50-docs-and-design-system-docs.md` — DESIGN_SYSTEM.md and Workbench documentation rules

中文备注：根文件只保留最高优先级原则和规则索引。具体细节放进 `.claude/rules/`，避免根文件越来越臃肿。
