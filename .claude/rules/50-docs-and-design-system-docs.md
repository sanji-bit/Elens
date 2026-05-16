# Design System Documentation Rules

## DESIGN_SYSTEM.md

- Component specification sections must be token-first.
  - 中文备注：组件规范必须以 token/CSS 变量为主。

- Stable UI colors, sizes, spacing, radii, shadows, borders, z-indexes, and motion values must use tokens or CSS variables as the primary value.
  - 中文备注：稳定 UI 的颜色、尺寸、间距、圆角、阴影、边框、层级、动效要优先用 token/CSS 变量。

- Token definition sections may include concrete values because they are the source of truth.
  - 中文备注：token 定义区可以写具体值，因为那里是源头。

- Component specification sections should not use raw `px`, hex, `rgb/rgba`, named colors, or duration values as the primary spec.
  - 中文备注：组件规格区不要把裸 `px`、hex、rgba、颜色名、时间值当主规格。

- If raw values appear for legacy/reference reasons, label them clearly and prefer adding or mapping a semantic token.
  - 中文备注：如果因为历史原因必须出现裸值，要明确标注，并优先补语义 token 或映射。

- New stable UI tokens must be added to `src/design-tokens.ts` and exposed through `generateCSSVariables()` before documentation or component specs reference them.
  - 中文备注：新稳定 token 必须先进入代码 token 源，再被文档引用。

- Do not invent local one-off CSS variables or raw values to bypass the design system.
  - 中文备注：不能用局部一次性变量或裸值绕开设计系统。

## Workbench

- Workbench samples must use real runtime classes and real component structure, not fake mock components.
  - 中文备注：Workbench 样例必须用真实运行时 class 和结构，不能是假 mock。

- If a new reusable UI pattern is introduced, add it to the Workbench pending component area before treating it as stable.
  - 中文备注：新可复用 UI 模式先放 pending，不要直接当稳定组件。

- Every new pending component entry must include closest stable component, why the stable component cannot be reused directly, review status, last reviewed date, and proposed review decision.
  - 中文备注：pending 组件必须写清楚最接近稳定组件、不能复用原因、审核状态、日期和建议决策。

- When changing stable UI tokens, component dimensions, color, radius, shadow, border, spacing, or interaction states, update `DESIGN_SYSTEM.md` and the matching Workbench sample or explicitly explain why they remain valid.
  - 中文备注：改稳定 token 或组件视觉/交互状态时，要同步更新设计系统文档和 Workbench，或说明为什么不用更新。
