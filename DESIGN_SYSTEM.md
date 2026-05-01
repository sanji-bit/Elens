# Elens Design System

本文档定义了 Elens 元素检查器的设计规范，确保 UI 组件的一致性和可维护性。

---

## 1. 颜色系统

### 1.1 背景色

| Token | 值 | 用途 |
|-------|-----|------|
| `--bg-panel` | `#111113` | 面板、下拉菜单、Tooltip 背景 |
| `--bg-dropdown` | `rgba(30,30,30,1)` | 下拉菜单背景 |
| `--bg-field` | `rgba(255,255,255,0.06)` | 输入框、选择器背景 |
| `--bg-hover` | `rgba(255,255,255,0.08)` | 悬停状态背景 |
| `--bg-hover-strong` | `rgba(255,255,255,0.12)` | 强悬停状态 |
| `--bg-active` | `rgba(255,255,255,0.14)` | 激活状态背景 |
| `--bg-toolbar` | `black` | 工具栏背景 |

### 1.2 文字色

| Token | 值 | 用途 |
|-------|-----|------|
| `--text-primary` | `rgba(255,255,255,0.85)` | 主要文字、输入值 |
| `--text-secondary` | `rgba(255,255,255,0.7)` | 次要文字、Section 标签 |
| `--text-tertiary` | `rgba(255,255,255,0.45)` | 标签、图标、占位符 |
| `--text-muted` | `rgba(255,255,255,0.35)` | 禁用状态、辅助信息 |
| `--text-faint` | `rgba(255,255,255,0.25)` | 极淡文字 |

### 1.3 边框色

| Token | 值 | 用途 |
|-------|-----|------|
| `--border-default` | `rgba(255,255,255,0.1)` | 默认边框 |
| `--border-subtle` | `rgba(255,255,255,0.08)` | 细边框、分割线 |
| `--border-input` | `rgba(255,255,255,0.15)` | 输入框边框 |
| `--border-hover` | `rgba(255,255,255,0.12)` | 悬停边框 |

### 1.4 语义色

| Token | 值 | 用途 |
|-------|-----|------|
| `--accent` | `#0C8CE9` (可配置) | 主题色、选中、聚焦 |
| `--margin` | `#E17055` | Margin 高亮色 |
| `--move` | `#FF00FF` | Move 模式高亮色 |
| `--success` | `rgba(0,184,148,0.9)` | 成功状态 |
| `--success-bg` | `rgba(0,184,148,0.18)` | 成功背景 |
| `--purple` | `#6C5CE7` | 标签色、特殊高亮 |
| `--purple-bg` | `rgba(108,92,231,0.22)` | 紫色背景 |

### 1.5 阴影

| Token | 值 | 用途 |
|-------|-----|------|
| `--shadow-panel` | `0 20px 50px rgba(0,0,0,0.55)` | 面板阴影 |
| `--shadow-dropdown` | `0px 10px 16px rgba(0,0,0,0.35), 0px 2px 5px rgba(0,0,0,0.35)` | 下拉菜单阴影 |
| `--shadow-toolbar` | `0px 2px 8px rgba(0,0,0,0.24), 0px 1px 24px rgba(0,0,0,0.24)` | 工具栏阴影 |
| `--shadow-inset` | `inset 0px 0.5px 0px rgba(255,255,255,0.08), inset 0px 0px 0.5px rgba(255,255,255,0.35)` | 内嵌高光 |

---

## 2. 排版系统

### 2.1 字体族

```css
font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
```

### 2.2 字号

| Token | 值 | 用途 |
|-------|-----|------|
| `--text-xs` | `9px` | 标签、Badge |
| `--text-sm` | `10px` | 辅助文字、按钮文字 |
| `--text-base` | `11px` | 正文、输入框 |
| `--text-lg` | `12px` | 标题、面板标题 |

### 2.3 字重

| Token | 值 | 用途 |
|-------|-----|------|
| `--font-normal` | `400` | 正文 |
| `--font-medium` | `500` | 标签 |
| `--font-semibold` | `600` | 按钮、标题 |
| `--font-bold` | `700` | 强调标题 |

### 2.4 行高

| Token | 值 | 用途 |
|-------|-----|------|
| `--leading-none` | `1` | 单行图标 |
| `--leading-tight` | `1.4` | 紧凑文字 |
| `--leading-normal` | `1.5` | 正文 |
| `--leading-relaxed` | `1.6` | 宽松文字 |

### 2.5 字间距

| Token | 值 | 用途 |
|-------|-----|------|
| `--tracking-tight` | `0.005px` | 标签 |
| `--tracking-normal` | `0.055px` | 正文 |
| `--tracking-wide` | `0.08em` | 大写标签 |
| `--tracking-wider` | `0.11px` | Section 标题 |

---

## 3. 间距系统

### 3.1 基础间距

| Token | 值 | 用途 |
|-------|-----|------|
| `--space-1` | `2px` | 微间距 |
| `--space-2` | `4px` | 紧凑间距 |
| `--space-3` | `6px` | 小间距 |
| `--space-4` | `8px` | 标准间距 |
| `--space-5` | `10px` | 中等间距 |
| `--space-6` | `12px` | 大间距 |
| `--space-8` | `16px` | 区块间距 |
| `--space-10` | `20px` | 大区块间距 |

### 3.2 组件内边距

| 组件 | Padding |
|------|---------|
| Panel Header | `14px 16px` |
| Panel Body | `4px 16px 16px` |
| Section Content | `0 0 16px` |
| Dropdown | `8px` |
| Input Field | `0 6px` |
| Button (text) | `0 8px` |
| Badge | `2-4px 6-8px` |

---

## 4. 圆角系统

### 4.1 圆角值

| Token | 值 | 用途 |
|-------|-----|------|
| `--radius-xs` | `2px` | 小色块、内嵌元素 |
| `--radius-sm` | `3px` | Badge、小按钮 |
| `--radius-md` | `4px` | 图标按钮、小输入框 |
| `--radius-lg` | `5px` | 输入框、下拉选项 |
| `--radius-xl` | `8px` | 按钮、卡片 |
| `--radius-2xl` | `10px` | 大按钮、输入区域 |
| `--radius-3xl` | `12px` | 下拉菜单、Tooltip |
| `--radius-4xl` | `13px` | 大下拉菜单 |
| `--radius-panel` | `18px` | 面板 |
| `--radius-full` | `9999px` | 圆形按钮、Badge |

---

## 5. 组件规范

### 5.1 按钮 (Button)

#### 尺寸变体

| 变体 | 高度 | 宽度 | 圆角 |
|------|------|------|------|
| Ghost Icon (圆形) | `var(--btn-icon-size)` | `var(--btn-icon-size)` | `var(--radius-full)` |
| Ghost Icon (圆角矩形) | `var(--btn-icon-size-sm)` | `var(--btn-icon-size-sm)` | `var(--radius-md)` |
| Text (小) | `var(--btn-text-height)` | auto | `var(--radius-xl)` |
| Text (中) | `var(--btn-text-height-md)` | auto | `var(--radius-xl)` |
| Text (大) | `var(--btn-text-height-lg)` | auto | `var(--radius-xl)` |

#### 状态样式

```css
/* 默认 */
background: transparent;
color: var(--text-primary);

/* 悬停 */
background: var(--surface-hover-strong);

/* 激活 */
background: var(--interactive-accent);
color: var(--overlay-label-text);

/* 禁用 */
opacity: 0.35;
pointer-events: none;
```

### 5.2 输入框 (Input Field)

| 属性 | 值 |
|------|-----|
| 高度 | `var(--input-height)` |
| 圆角 | `var(--field-radius)` |
| 背景 | `var(--surface-field)` |
| 边框 | `var(--border-input)` |
| 悬停边框 | `var(--border-hover)` |
| 聚焦边框 | `var(--interactive-accent)` |
| 字号 | `var(--text-base)` |
| 内边距 | `var(--space-3)` horizontal |

### 5.3 选择器 (Select / Dropdown)

| 属性 | 值 |
|------|-----|
| 触发器高度 | `var(--input-height)` |
| 下拉面板圆角 | `var(--radius-4xl)` |
| 下拉面板背景 | `var(--surface-dropdown)` |
| 下拉面板内边距 | `var(--space-4)` |
| 选项高度 | `var(--dropdown-option-height)` / `var(--dropdown-option-height-lg)` |
| 选项圆角 | `var(--field-radius)` |
| 最小宽度 | `var(--dropdown-min-width)` |

### 5.4 下拉菜单 (Dropdown Menu)

| 属性 | 值 |
|------|-----|
| 圆角 | `var(--radius-3xl)` |
| 背景 | `var(--surface-panel)` |
| 边框 | `var(--border-default)` |
| 内边距 | `var(--space-3)` |
| 默认项高度 | `var(--dropdown-option-height)` |
| Large 项高度 | `var(--menu-item-height-lg)` |
| 默认项圆角 | `var(--radius-lg)` |
| Large 项圆角 | `var(--menu-item-radius-lg)` |
| 项内图标文字间距 | `var(--space-4)` |
| 选项间距 | `var(--dropdown-menu-item-gap)` |

基础菜单项模式默认使用 `var(--dropdown-option-height)`。当下拉菜单或操作列表需要更强可点按性时，使用 large 菜单项规格：`var(--menu-item-height-lg)` / `var(--menu-item-font-size-lg)` / `var(--menu-item-radius-lg)`，并保持项内图标与文字间距为 `var(--space-4)`。该 large 规格只作用于菜单项，不等同于 `Select / Dropdown` 的通用 option large。

### 5.5 Badge / Tag

| 变体 | 圆角 | 内边距 | 字号 |
|------|------|--------|------|
| 圆形 | `var(--radius-full)` | `var(--space-2)` / `var(--space-4)` | `var(--text-sm)` |
| 小 | `var(--radius-sm)` | `var(--space-1)` / `var(--space-2)` | `var(--text-xs)` |
| Type 标签 | `var(--radius-full)` | `var(--space-1)` / `var(--space-3)` | `var(--text-xs)` |

### 5.6 面板 (Panel)

| 属性 | 值 |
|------|-----|
| 宽度 | `var(--panel-width)` |
| 圆角 | `var(--panel-radius)` |
| 背景 | `var(--surface-panel)` |
| 边框 | `var(--border-default)` |
| 阴影 | `var(--panel-shadow)` |

### 5.7 工具栏 (Toolbar)

| 属性 | 值 |
|------|-----|
| 圆角 | `var(--radius-full)` |
| 背景 | `var(--surface-toolbar)` |
| 内边距 | `var(--toolbar-padding)` |
| 按钮间距 | `var(--toolbar-button-gap)` |

### 5.8 Tooltip

| 属性 | 值 |
|------|-----|
| 最大宽度 | `var(--tooltip-max-width)` |
| 圆角 | `var(--radius-3xl)` |
| 内边距 | `var(--space-5)` / `var(--space-6)` |
| 字号 | `var(--text-base)` |

---

## 6. 动效规范

### 6.1 过渡时间

| Token | 值 | 用途 |
|-------|-----|------|
| `--duration-fast` | `100ms` | 快速反馈 |
| `--duration-normal` | `120ms` | 标准过渡 |
| `--duration-slow` | `150ms` | 慢速过渡 |
| `--duration-slower` | `160ms` | 更慢过渡 |


### 6.2 缓动函数

| Token | 值 | 用途 |
|-------|-----|------|
| `--ease-default` | `ease` | 默认 |
| `--ease-out` | `ease-out` | 淡出动画 |

### 6.3 常用过渡

```css
/* 背景色过渡 */
transition: background 0.12s ease;

/* 边框色过渡 */
transition: border-color 0.15s ease;

/* 颜色过渡 */
transition: color 0.12s ease;

/* 综合过渡 */
transition: background 0.12s ease, border-color 0.12s ease, transform 0.12s ease;
```

---

## 7. 图标规范

### 7.1 尺寸

| 用途 | 尺寸 |
|------|------|
| Ghost Icon 大尺寸图标 | `var(--btn-icon-glyph-size)` 视口，按钮盒使用 `var(--btn-icon-size)` |
| Ghost Icon 小尺寸图标 | `var(--btn-icon-glyph-size-sm)` 视口，按钮盒使用 `var(--btn-icon-size-sm)` |
| 输入框图标 | `16px` 视口 |
| 对齐网格图标 | `var(--icon-size-sm)` 视口 |
| 小图标 | `var(--icon-size-sm)` 视口 |

### 7.2 颜色

```css
/* 默认 */
color: var(--text-tertiary);

/* 悬停 */
color: var(--text-secondary);

/* 激活 */
color: var(--interactive-accent);
```

---

## 8. 命名规范

### 8.1 CSS 类名前缀

| 前缀 | 用途 |
|------|------|
| `ei-` | 全局前缀 (Element Inspector) |
| `ei-hl-` | 高亮层 (Highlight) |
| `ei-dp-` | 设计面板 (Design Panel) |
| `ei-tt-` | Tooltip |
| `ei-ann-` | Changes/Annotation 列表 |
| `ei-box-` | Box Model 图 |

### 8.2 组件状态

使用 `data-*` 属性表示状态：

- `data-active="true"` - 激活状态
- `data-visible="true"` - 可见状态
- `data-expanded="true/false"` - 展开/折叠
- `data-design="true"` - 设计模式
- `data-move="true"` - 移动模式
- `data-disabled="true"` - 禁用状态

---

## 9. 可访问性

### 9.1 对比度

- 主要文字使用 `var(--text-primary)`，在深色背景上保持主要信息可读性
- 次要文字使用 `var(--text-tertiary)`，用于装饰性文字或弱化信息

### 9.2 聚焦状态

```css
.ei-field:focus-within {
  border-color: var(--interactive-accent);
}

.ei-btn:focus {
  outline: none;
}
```

### 9.3 交互区域

- Ghost Icon Button 目前只有两种真实尺寸：`var(--btn-icon-size)` / `var(--btn-icon-glyph-size)` 与 `var(--btn-icon-size-sm)` / `var(--btn-icon-glyph-size-sm)`
- Ghost Icon Button 目前只有两种真实形状：圆形和圆角矩形