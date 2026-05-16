# UI Design System Rules

All UI work must follow the Elens Design System.

中文备注：所有 UI 工作必须遵守 Elens 设计系统，不允许随意造新样式。

## Required Workflow

- Identify whether the task affects UI, visual style, interaction state, layout, or component behavior.
  - 中文备注：先判断任务是不是 UI 相关。

- Inspect existing Workbench and `.ei-*` / `.ei-dp-*` component patterns before editing.
  - 中文备注：改 UI 前先看已有 Workbench 和组件 class 模式。

- Reuse existing components, tokens, class patterns, and interaction states first.
  - 中文备注：优先复用现有组件、token、class 和交互状态。

- If reuse is not possible, state the closest existing component, why it cannot be reused directly, and whether the solution is an extension, a pending component, or a one-off layout detail.
  - 中文备注：不能复用时，要说明最接近的组件、不能复用原因、解决方式属于扩展/待审核组件/一次性布局。

- Do not invent new colors, radii, shadows, spacing systems, dropdown styles, input styles, color picker styles, panel styles, or button styles unless justified.
  - 中文备注：不要随便发明新颜色、圆角、阴影、间距、下拉、输入框、面板或按钮样式。

- New components must inherit existing theme constraints, tokens, CSS variables, and shared interaction patterns.
  - 中文备注：新组件也必须继承现有主题、token、CSS 变量和交互模式。

## Must Reuse

- Color picker
- Input fields
- Dropdown/select
- Segmented input groups
- Panel/popover
- Tabs
- Buttons
- Menu items
- Tooltip
- Annotation input

中文备注：以上是稳定组件模式，相关功能必须优先复用。

## Hard Rules

- All color selection must use the shared color picker.
  - 中文备注：所有颜色选择必须用共享 color picker。

- Do not use native `input[type=color]` outside the shared color picker implementation.
  - 中文备注：共享 color picker 之外不能用浏览器原生颜色选择器。

- Dropdowns must use the existing dropdown style and arrow icon.
  - 中文备注：下拉必须用已有样式和箭头图标。

- Inputs must follow existing default / hover / focus behavior.
  - 中文备注：输入框必须符合已有默认、悬停、聚焦状态。

- Segmented inputs should use a connected segment group instead of unrelated standalone fields.
  - 中文备注：分段输入要用连接式 segment group，不要散落独立字段。

- New `.ei-*` or `.ei-dp-*` component classes must be justified.
  - 中文备注：新增组件 class 必须说明理由。

- Avoid hardcoded visual values when an existing token, CSS variable, or component pattern can be used.
  - 中文备注：有 token/CSS 变量/现有模式时，不要硬编码视觉值。
