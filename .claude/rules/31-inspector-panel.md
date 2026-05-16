# Inspector Panel Guardrails

These are stable product behaviors and must not regress.

中文备注：这些不是审美规则，而是 Inspector 的稳定产品行为，不能回归。

## Numeric Fields

- Numeric inspector fields representing pixel, size, spacing, radius, position, or similar visual values must display and commit integers only.
  - 中文备注：像 px、尺寸、间距、圆角、位置这类数字字段只能显示和提交整数。

- Manual input, blur, Enter, arrow keys, and drag scrubbing must not produce decimals.
  - 中文备注：手输、失焦、回车、方向键、拖拽调数都不能产生小数。

## Color Fields

- Color text fields must display six-digit HEX values only, such as `FFFFFF` or `09090B`.
  - 中文备注：颜色文本框只能显示六位 HEX。

- Do not show `lab(...)`, `oklab(...)`, `rgb(...)`, `rgba(...)`, named colors, or raw computed color strings in color text fields.
  - 中文备注：颜色文本框不能显示 CSS 函数、命名色或原始 computed 字符串。

- Color swatches and text fields must reflect the real computed color.
  - 中文备注：色块和文本必须反映真实 computed color。

- Do not use white or black fallbacks when parsing fails in a way that could misrepresent the selected element.
  - 中文备注：解析失败不能随便 fallback 成白色或黑色，避免误导。

- Transparent or absent backgrounds must not be presented as white fill.
  - 中文备注：透明或无背景不能显示成白色填充。

- Only show `FFFFFF` when the element actually has visible white background or fill.
  - 中文备注：只有真实可见白色背景/填充时才显示 `FFFFFF`。

- Opacity controls must reflect real alpha from computed colors, including modern CSS color formats.
  - 中文备注：透明度控件要反映真实 alpha，包括现代 CSS 色彩格式。

- When changing a color while existing alpha is present, preserve that alpha unless the user explicitly changes opacity.
  - 中文备注：已有透明度时，改颜色要保留 alpha，除非用户明确改透明度。

## Floating UI

- Dropdowns, popovers, and floating controls inside the inspector must remain visually isolated from host pages.
  - 中文备注：Inspector 内的下拉、弹层、浮动控件必须和宿主页面样式隔离。

- In extension and embedded contexts, mount floating UI under the Elens root/shadow host when needed.
  - 中文备注：扩展和嵌入场景下，必要时把浮层挂到 Elens root/shadow host 下。

- Use Shadow DOM-safe outside-click handling such as `event.composedPath()`.
  - 中文备注：外部点击检测要兼容 Shadow DOM，例如用 `event.composedPath()`。

## Validation

- Every inspector UI fix touching color, numeric fields, dropdowns, popovers, or floating controls must be validated against realistic host-page CSS conditions, not only the demo page.
  - 中文备注：这类修复不能只在 demo 页测，还要考虑真实宿主页面 CSS 干扰。
