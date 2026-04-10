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
| Icon (圆形) | `32px` | `32px` | `9999px` |
| Icon (方形) | `24px` | `24px` | `4px` |
| Text (小) | `24px` | auto | `8px` |
| Text (中) | `28px` | auto | `8px` |
| Text (大) | `32px` | auto | `8px` |

#### 状态样式

```css
/* 默认 */
background: transparent;
color: rgba(255,255,255,0.85);

/* 悬停 */
background: rgba(255,255,255,0.15);

/* 激活 */
background: var(--accent);
color: #fff;

/* 禁用 */
opacity: 0.35;
pointer-events: none;
```

### 5.2 输入框 (Input Field)

| 属性 | 值 |
|------|-----|
| 高度 | `24px` |
| 圆角 | `5px` |
| 背景 | `rgba(255,255,255,0.06)` |
| 边框 | `1px solid transparent` |
| 悬停边框 | `rgba(255,255,255,0.10)` |
| 聚焦边框 | `var(--accent)` |
| 字号 | `11px` |
| 内边距 | `0 6px` |

### 5.3 选择器 (Select / Dropdown)

| 属性 | 值 |
|------|-----|
| 触发器高度 | `24px` |
| 下拉面板圆角 | `13px` |
| 下拉面板背景 | `rgba(30,30,30,1)` |
| 下拉面板内边距 | `8px` |
| 选项高度 | `24px` / `28px` |
| 选项圆角 | `5px` |
| 最小宽度 | `150px` |

### 5.4 下拉菜单 (Dropdown Menu)

| 属性 | 值 |
|------|-----|
| 圆角 | `12px` |
| 背景 | `#111113` |
| 边框 | `1px solid rgba(255,255,255,0.1)` |
| 内边距 | `6px` |
| 选项高度 | `24px` |
| 选项圆角 | `8px` |

### 5.5 Badge / Tag

| 变体 | 圆角 | 内边距 | 字号 |
|------|------|--------|------|
| 圆形 | `999px` | `3px 8px` | `10px` |
| 小 | `3px` | `1px 4px` | `9px` |
| Type 标签 | `999px` | `2px 6px` | `9px` |

### 5.6 面板 (Panel)

| 属性 | 值 |
|------|-----|
| 宽度 | `320px` |
| 圆角 | `18px` |
| 背景 | `#111113` |
| 边框 | `1px solid rgba(255,255,255,0.1)` |
| 阴影 | `0 20px 50px rgba(0,0,0,0.55)` |

### 5.7 工具栏 (Toolbar)

| 属性 | 值 |
|------|-----|
| 圆角 | `9999px` |
| 背景 | `black` |
| 内边距 | `6px` |
| 按钮间距 | `6px` |

### 5.8 Tooltip

| 属性 | 值 |
|------|-----|
| 最大宽度 | `320px` |
| 圆角 | `12px` |
| 内边距 | `10px 12px` |
| 字号 | `11px` |

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
| Toolbar 按钮 | `24px` 视口，stroke `1.5px` |
| 输入框图标 | `24px` 视口 |
| 对齐网格图标 | `16px` 视口 |
| 小图标 | `16px` 视口 |

### 7.2 颜色

```css
/* 默认 */
color: rgba(255,255,255,0.4);

/* 悬停 */
color: rgba(255,255,255,0.7);

/* 激活 */
color: var(--accent);
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

- 主要文字 `rgba(255,255,255,0.85)` 在深色背景上满足 WCAG AA 标准
- 次要文字 `rgba(255,255,255,0.45)` 用于装饰性文字

### 9.2 聚焦状态

```css
.ei-field:focus-within {
  border-color: var(--accent);
}

.ei-btn:focus {
  outline: none;
}
```

### 9.3 交互区域

- 所有可点击元素最小尺寸 `24px`
- Toolbar 按钮尺寸 `32px` 以便于触摸操作