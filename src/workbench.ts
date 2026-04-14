import { buildTheme } from './design-tokens'
import { createRuntimeStyles } from './runtime-styles'
import { clearPersistedTheme, getDefaultThemeConfig, loadPersistedTheme, mergeThemeConfig, persistTheme } from './theme-store'
import type { ElementInspectorInstance, ThemeConfig, ThemeContrast, ThemeDensity, ThemeMotion, ThemeRadiusScale } from './types'

type PreviewInteractionState = 'default' | 'hover' | 'active' | 'selected' | 'focus' | 'disabled'
type WorkbenchLibraryTab = 'all' | 'colors' | 'buttons' | 'inputs' | 'navigation' | 'panels' | 'states' | 'pending'

type LabelOption<T extends string> = {
  value: T
  label: string
}

type WorkbenchState = {
  theme: ThemeConfig
  previewState: PreviewInteractionState
  libraryTab: WorkbenchLibraryTab
}

type WorkbenchComponentKind = 'standard' | 'project'

type WorkbenchComponentSample = {
  id: string
  title: string
  tab: Exclude<WorkbenchLibraryTab, 'all'>
  status: 'stable' | 'pending'
  componentKind: WorkbenchComponentKind
  description: string
  classNames: string[]
  render: (context: SampleRenderContext) => HTMLElement
}

type SampleRenderContext = {
  previewClass: string
  previewState: PreviewInteractionState
  accent: string
  surface: string
  contrast: ThemeContrast
  density: ThemeDensity
  radiusScale: ThemeRadiusScale
  motion: ThemeMotion
  panelWidth: string
  panelRadius: string
  fieldHeight: string
  fieldRadius: string
  dropdownOptionHeight: string
  toolbarGap: string
}

const glossary = {
  Workbench: '工作台。这里是专门用来调试和理解 Elens 设计系统的页面，你可以在这里改颜色、圆角、间距，并立刻看到组件变化。',
  'Design System': '设计系统。一套统一的颜色、字体、圆角、间距和组件规范，目的是让所有界面看起来一致。',
  'Runtime Style Builder': '运行时样式生成器。它会把左侧主题配置转换成真实组件正在使用的 CSS 样式，所以这里看到的不是假预览。',
  accent: '强调色。通常用于按钮高亮、选中状态、焦点边框等最重要的交互颜色。',
  surface: '界面底色。比如面板、输入框、下拉菜单这些区域的背景颜色都会从它派生出来。',
  contrast: '对比度。控制文字、边框和背景之间的明显程度。对比越强，界面越清晰但也可能更硬。',
  density: '密度。控制控件是更紧凑还是更舒展，会影响输入框、下拉项等组件高度。',
  radius: '圆角。控制按钮、输入框、面板边角的圆润程度。',
  motion: '动效。控制界面变化时是否使用过渡动画。',
  panel: '面板。通常指右侧浮层、属性面板、信息卡片这类承载内容的容器。',
  field: '字段。这里主要指输入框、数值框、选择框这类可编辑控件。',
  dropdown: '下拉菜单。点击后展开一组可选项的控件。',
  toolbar: '工具栏。一排操作按钮，例如检查、设计、移动、变更等模式入口。',
  token: '设计变量。把颜色、圆角、尺寸等规范保存成可复用的变量，改一个变量就能影响很多组件。',
  JSON: '一种结构化文本格式。这里用于导出当前主题配置，方便后续保存或复制给代码使用。',
  ThemeConfig: '主题配置。Elens 用它记录当前的颜色、字体、圆角、组件尺寸等设置。',
  default: '默认状态。组件没有被悬停、点击、选中或禁用时的普通样子。',
  hover: '悬停状态。鼠标移动到组件上方时出现的反馈。',
  active: '按下状态。鼠标按住或组件正在被触发时的反馈。',
  selected: '选中状态。表示当前项已经被选中或处于当前模式。',
  focus: '焦点状态。表示这个控件正在被键盘或输入操作定位，通常会出现高亮边框。',
  disabled: '禁用状态。表示这个控件暂时不能点击或编辑。',
} as const

const previewStateLabels: Record<PreviewInteractionState, string> = {
  default: '默认',
  hover: '悬停',
  active: '按下',
  selected: '选中',
  focus: '焦点',
  disabled: '禁用',
}

const contrastOptions: LabelOption<ThemeContrast>[] = [
  { value: 'soft', label: '柔和' },
  { value: 'normal', label: '标准' },
  { value: 'strong', label: '强对比' },
]

const densityOptions: LabelOption<ThemeDensity>[] = [
  { value: 'compact', label: '紧凑' },
  { value: 'comfortable', label: '舒展' },
]

const radiusOptions: LabelOption<ThemeRadiusScale>[] = [
  { value: 'sharp', label: '偏直角' },
  { value: 'normal', label: '标准' },
  { value: 'soft', label: '更圆润' },
]

const motionOptions: LabelOption<ThemeMotion>[] = [
  { value: 'normal', label: '正常' },
  { value: 'reduced', label: '减少动效' },
]

const previewOptions: LabelOption<PreviewInteractionState>[] = [
  { value: 'default', label: '默认' },
  { value: 'hover', label: '悬停' },
  { value: 'active', label: '按下' },
  { value: 'selected', label: '选中' },
  { value: 'focus', label: '焦点' },
  { value: 'disabled', label: '禁用' },
]

const libraryTabs: LabelOption<WorkbenchLibraryTab>[] = [
  { value: 'all', label: '全部组件' },
  { value: 'colors', label: '颜色规范' },
  { value: 'buttons', label: '按钮' },
  { value: 'inputs', label: '输入控件' },
  { value: 'navigation', label: '导航与选择' },
  { value: 'panels', label: '面板与浮层' },
  { value: 'states', label: '状态参考' },
  { value: 'pending', label: '待确认组件' },
]

const STORAGE_KEY = 'elens-workbench-theme'
const WORKBENCH_THEME_DEFAULTS: ThemeConfig = {
  surface: { base: '#111113' },
  contrast: 'normal',
  density: 'compact',
  radiusScale: 'normal',
  motion: 'normal',
  typography: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    baseFontSize: 11,
  },
  component: {
    panel: {
      width: '320px',
      radius: '16px',
    },
    field: {
      height: '24px',
      radius: '5px',
    },
    dropdown: {
      optionHeight: '24px',
    },
    toolbar: {
      buttonGap: '6px',
    },
  },
  zIndex: 100,
}

const libraryTabDescriptions: Record<WorkbenchLibraryTab, string> = {
  all: '总览当前已收录的正式组件与待确认组件，适合定期巡检整个系统。',
  colors: '集中整理颜色规范：基础输入色、派生语义色、组件背景、文字、边框、交互和反馈颜色。',
  buttons: '集中查看按钮、图标按钮和触发类控件，方便发现重复按钮体系。',
  inputs: '集中查看输入框、下拉触发器和注释输入等输入类控件。',
  navigation: '集中查看 tabs、菜单项、面包屑等导航与选择类组件。',
  panels: '集中查看 panel、tooltip、annotation item 等承载信息的浮层与容器。',
  states: '集中查看状态色、交互状态和 token 对应关系。',
  pending: '这里放暂时不适合正式收录，或看起来可能重复、后续需要继续整理的组件。',
}

const stableTabLabel: Record<Exclude<WorkbenchLibraryTab, 'all'>, string> = {
  colors: '颜色规范',
  buttons: '按钮',
  inputs: '输入控件',
  navigation: '导航与选择',
  panels: '面板与浮层',
  states: '状态参考',
  pending: '待确认组件',
}

const DEFAULT_PENDING_NOTES = [
  {
    id: 'pending-button-variant',
    title: '新增按钮变体待确认',
    description: '如果以后项目里多出新的按钮样式，先在这里观察它是否真的是新品类，还是已有按钮的重复变体。',
    classNames: ['待扫描'],
    componentKind: 'standard',
    source: '新增功能 UI',
    closestStableComponent: '工具栏按钮 / 筛选按钮',
    reasonCannotReuse: '还没有出现真实新增样本，先保留为审查入口。',
    reviewStatus: 'pending',
    lastReviewedAt: '2026-04-12',
    decision: '待确认是否收敛为现有按钮变体',
  },
  {
    id: 'pending-composite-control',
    title: '上下文耦合较强的复合控件',
    description: '有些控件需要依赖更多上下文才能稳定展示，第一版先放在待确认区，避免为了展示而造假组件。',
    classNames: ['组合组件'],
    componentKind: 'project',
    source: '复杂上下文组件',
    closestStableComponent: '面板容器 / 设计字段 / 菜单项',
    reasonCannotReuse: '需要更多真实场景才能判断它是复合组件还是已有组件组合。',
    reviewStatus: 'pending',
    lastReviewedAt: '2026-04-12',
    decision: '待确认是否拆解为已有组件组合',
  },
  {
    id: 'pending-new-component-registry',
    title: '新组件默认先登记到待确认区',
    description: '以后 AI 如果发现没有现成组件可复用，允许先按现有 token、field、panel、dropdown 等规则生成一个新组件，但它默认只能先进入待确认组件区，不能直接视为正式组件。',
    classNames: ['pending registry', '.ei-* / .ei-dp-*'],
    componentKind: 'project',
    source: 'AI 新增组件',
    closestStableComponent: '最接近的现有 stable 组件',
    reasonCannotReuse: '必须先写清楚为什么现有组件不能直接复用或扩展。',
    reviewStatus: 'pending',
    lastReviewedAt: '2026-04-12',
    decision: '月度审查后再决定 stable / merge / remove',
  },
  {
    id: 'pending-design-dev-editor',
    title: 'Design Dev Mode CSS 编辑器',
    description: 'Design panel 里的 CSS patch 编辑区域，用于直接编辑当前 layer 的样式意图。',
    classNames: ['.ei-design-dev-editor', '.ei-design-dev-code', '.ei-design-dev-actions', '.ei-design-dev-error', '.ei-annotate-input', '.ei-button'],
    componentKind: 'project',
    source: 'Design Dev Mode MVP',
    closestStableComponent: '多行输入框 .ei-annotate-input / 文本按钮 .ei-button',
    reasonCannotReuse: '需要更大编辑面积、monospace CSS patch 输入和错误提示；按钮与 textarea 交互仍复用现有 stable 组件。',
    reviewStatus: 'pending',
    lastReviewedAt: '2026-04-14',
    decision: '先作为 Dev Mode 专用 pending 组件，验证后再决定是否沉淀为 stable。',
  },
] as const

const REVIEW_STATUS_LABELS = {
  pending: '待审查',
  reviewed: '已审查',
  merged: '已合并',
  removed: '已移除',
} as const

const COMPONENT_KIND_LABELS: Record<WorkbenchComponentKind, string> = {
  standard: '标准组件',
  project: '项目组件',
}

type PendingRegistryItem = (typeof DEFAULT_PENDING_NOTES)[number]

function createPendingMetaRows(item: PendingRegistryItem): HTMLElement {
  const wrap = el('div', 'wb-pending-audit')
  wrap.append(
    createKv('组件类型', COMPONENT_KIND_LABELS[item.componentKind]),
    createKv('登记来源', item.source),
    createKv('最接近 stable', item.closestStableComponent),
    createKv('不可复用原因', item.reasonCannotReuse),
    createKv('审查状态', REVIEW_STATUS_LABELS[item.reviewStatus]),
    createKv('最后审查', item.lastReviewedAt),
    createKv('审查决策', item.decision),
  )
  return wrap
}

function getPendingRegistry(): PendingRegistryItem[] {
  return [...DEFAULT_PENDING_NOTES]
}

function getPendingRegistryClassNames(): string[] {
  return getPendingRegistry().flatMap((item) => item.classNames.filter((name) => name.startsWith('.ei-') || name.startsWith('.ei-dp-')))
}

function getStableRegistryClassNames(): string[] {
  return componentSamples.flatMap((sample) => sample.classNames.filter((name) => name.startsWith('.ei-') || name.startsWith('.ei-dp-')))
}

export function getRegisteredComponentClassNames(): string[] {
  return [...new Set([...getStableRegistryClassNames(), ...getPendingRegistryClassNames()])]
}

export function getPendingComponentRegistry(): Array<{ id: string; title: string; componentKind: WorkbenchComponentKind; classNames: string[]; source: string; closestStableComponent: string; reasonCannotReuse: string; reviewStatus: string; lastReviewedAt: string; decision: string }> {
  return getPendingRegistry().map((item) => ({
    id: item.id,
    title: item.title,
    componentKind: item.componentKind,
    classNames: [...item.classNames],
    source: item.source,
    closestStableComponent: item.closestStableComponent,
    reasonCannotReuse: item.reasonCannotReuse,
    reviewStatus: item.reviewStatus,
    lastReviewedAt: item.lastReviewedAt,
    decision: item.decision,
  }))
}

export function getDesignSystemGuardrails(): string[] {
  return [
    '新增 UI 前先检查 Workbench，优先复用已有组件。',
    '如果没有现成组件，新组件也必须基于现有 theme、token、field、panel、dropdown 等约束生成。',
    '新组件默认先进入 pending registry，不能直接当成 stable 组件。',
    '登记 pending 组件时，必须写清 closest stable、不可复用原因、审查状态、最后审查时间。',
    '月度审查 pending registry，再决定合并、升级或删除。',
  ]
}

type InspectorWindow = Window & {
  __ELEMENT_INSPECTOR__?: ElementInspectorInstance
}

function getInspectorInstance(): ElementInspectorInstance | null {
  return (window as InspectorWindow).__ELEMENT_INSPECTOR__ ?? null
}

const DEFAULT_STATE: WorkbenchState = {
  previewState: 'default',
  libraryTab: 'all',
  theme: getDefaultThemeConfig({}, WORKBENCH_THEME_DEFAULTS),
}

function loadState(): WorkbenchState {
  try {
    const inspectorTheme = getInspectorInstance()?.getTheme()
    const persistedTheme = loadPersistedTheme()
    const saved = window.localStorage.getItem(STORAGE_KEY)
    const localState = saved ? mergeState(JSON.parse(saved)) : structuredClone(DEFAULT_STATE)
    const theme = inspectorTheme ?? persistedTheme ?? localState.theme
    return mergeState({ ...localState, theme })
  } catch {
    return structuredClone(DEFAULT_STATE)
  }
}

function mergeState(input: Partial<WorkbenchState>): WorkbenchState {
  return {
    previewState: input.previewState ?? DEFAULT_STATE.previewState,
    libraryTab: input.libraryTab ?? DEFAULT_STATE.libraryTab,
    theme: mergeThemeConfig(DEFAULT_STATE.theme, input.theme),
  }
}

function saveState(state: WorkbenchState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      previewState: state.previewState,
      libraryTab: state.libraryTab,
    }))
  } catch {
    // 忽略浏览器存储失败。
  }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag)
  if (className) node.className = className
  if (text != null) node.textContent = text
  return node
}

function createHelpButton(term: keyof typeof glossary): HTMLButtonElement {
  const button = el('button', 'wb-help-btn', '?')
  button.type = 'button'
  button.dataset.term = term
  button.dataset.help = glossary[term]
  button.setAttribute('aria-label', `解释 ${term}`)
  button.title = `${term}：${glossary[term]}`
  return button
}

function createLabelContent(label: string, terms: (keyof typeof glossary)[] = []): HTMLSpanElement {
  const wrapper = el('span', 'wb-field-label')
  const text = el('span', 'wb-field-label-text', label)
  wrapper.appendChild(text)

  for (const term of terms) {
    wrapper.appendChild(createHelpButton(term))
  }

  return wrapper
}

function createField(label: string, input: HTMLElement, terms: (keyof typeof glossary)[] = []): HTMLLabelElement {
  const field = el('label', 'wb-field')
  field.append(createLabelContent(label, terms), input)
  return field
}

function createReadonlyField(label: string, value: string, description: string): HTMLElement {
  const field = el('div', 'wb-field')
  const output = el('div', 'wb-readonly-field')
  output.innerHTML = `<span class="wb-readonly-value">${value}</span><span class="wb-readonly-desc">${description}</span>`
  field.append(createLabelContent(label), output)
  return field
}

function createSelect<T extends string>(value: T, options: LabelOption<T>[], onChange: (value: T) => void): HTMLSelectElement {
  const select = el('select', 'wb-input')
  for (const option of options) {
    const item = document.createElement('option')
    item.value = option.value
    item.textContent = option.label
    select.appendChild(item)
  }
  select.value = value
  select.addEventListener('change', () => onChange(select.value as T))
  return select
}

function createInlineTerm(term: keyof typeof glossary): HTMLElement {
  const wrapper = el('span', 'wb-inline-term')
  wrapper.append(document.createTextNode(term), createHelpButton(term))
  return wrapper
}

function createHeadingWithHelp(tag: 'span' | 'h1' | 'h2' | 'h3', label: string, terms: (keyof typeof glossary)[] = []): HTMLElement {
  const node = el(tag)
  if (label) {
    node.appendChild(document.createTextNode(label))
  }
  for (const term of terms) {
    if (label) {
      node.appendChild(document.createTextNode(' '))
    }
    node.appendChild(createInlineTerm(term))
  }
  return node
}

function createKv(label: string, value: string, valueClassName?: string): HTMLDivElement {
  const row = el('div', 'wb-kv')
  row.append(el('span', 'wb-kv-label', label))
  row.append(el('span', valueClassName ?? 'wb-kv-value', value))
  return row
}

function createCard(title: string, terms: (keyof typeof glossary)[] = []): HTMLElement {
  const card = el('article', 'wb-card')
  card.appendChild(createHeadingWithHelp('h3', title, terms))
  return card
}

function createTooltipHost(): HTMLDivElement {
  const tooltip = el('div', 'wb-help-tooltip')
  tooltip.hidden = true
  tooltip.innerHTML = '<div class="ei-tt-head"><span class="ei-tt-tag"></span></div><div class="ei-tt-row"><span class="ei-tt-val"></span></div>'
  return tooltip
}

function bindHelpTooltips(scope: HTMLElement): void {
  const tooltip = createTooltipHost()
  scope.appendChild(tooltip)
  const tag = tooltip.querySelector<HTMLElement>('.ei-tt-tag')
  const value = tooltip.querySelector<HTMLElement>('.ei-tt-val')
  let activeButton: HTMLButtonElement | null = null

  const hide = (): void => {
    tooltip.hidden = true
    activeButton = null
  }

  const show = (button: HTMLButtonElement): void => {
    const term = button.dataset.term
    const help = button.dataset.help
    if (!term || !help || !tag || !value) return
    tag.textContent = term
    value.textContent = help
    tooltip.hidden = false
    activeButton = button

    const scopeRect = scope.getBoundingClientRect()
    const buttonRect = button.getBoundingClientRect()
    const top = buttonRect.bottom - scopeRect.top + 8
    const left = Math.min(Math.max(buttonRect.left - scopeRect.left - 16, 12), Math.max(scope.clientWidth - 260, 12))
    tooltip.style.top = `${top}px`
    tooltip.style.left = `${left}px`
  }

  scope.querySelectorAll<HTMLButtonElement>('.wb-help-btn').forEach((button) => {
    button.addEventListener('mouseenter', () => show(button))
    button.addEventListener('focus', () => show(button))
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      if (activeButton === button && !tooltip.hidden) {
        hide()
        return
      }
      show(button)
    })
    button.addEventListener('mouseleave', () => {
      if (activeButton !== button) return
      hide()
    })
    button.addEventListener('blur', () => {
      if (activeButton !== button) return
      hide()
    })
  })

  scope.addEventListener('mouseleave', hide)
  document.addEventListener('click', (event) => {
    if (!scope.contains(event.target as Node)) {
      hide()
    }
  })
}

function displayPreviewState(value: PreviewInteractionState): string {
  return previewStateLabels[value]
}

function displayContrast(value: ThemeContrast): string {
  return contrastOptions.find((option) => option.value === value)?.label ?? value
}

function displayDensity(value: ThemeDensity): string {
  return densityOptions.find((option) => option.value === value)?.label ?? value
}

function displayRadius(value: ThemeRadiusScale): string {
  return radiusOptions.find((option) => option.value === value)?.label ?? value
}

function displayMotion(value: ThemeMotion): string {
  return motionOptions.find((option) => option.value === value)?.label ?? value
}

function createTextInput(value: string, onInput: (value: string) => void, type = 'text'): HTMLInputElement {
  const input = el('input', 'wb-input')
  input.type = type
  input.value = value
  input.addEventListener('input', () => onInput(input.value))
  return input
}

function createSampleHost(className = 'wb-gallery-stack'): HTMLDivElement {
  return el('div', className)
}

function createBadge(text: string): HTMLSpanElement {
  return el('span', 'wb-sample-badge', text)
}

function createClassTag(value: string): HTMLElement {
  const code = document.createElement('code')
  code.className = 'wb-class-tag'
  code.textContent = value
  return code
}

function createSampleMeta(sample: Pick<WorkbenchComponentSample, 'description' | 'classNames' | 'status' | 'componentKind'>): HTMLElement {
  const meta = el('div', 'wb-sample-meta')
  const tagRow = el('div', 'wb-class-tags')
  sample.classNames.forEach((className) => tagRow.appendChild(createClassTag(className)))
  tagRow.appendChild(createBadge(COMPONENT_KIND_LABELS[sample.componentKind]))
  if (sample.status === 'pending') {
    tagRow.appendChild(createBadge('待整理'))
  }
  meta.append(el('p', 'wb-sample-desc', sample.description), tagRow)
  return meta
}

function createSampleCard(sample: WorkbenchComponentSample, context: SampleRenderContext): HTMLElement {
  const card = createCard(sample.title)
  card.append(createSampleMeta(sample), sample.render(context))
  return card
}

function createLibraryTabBar(current: WorkbenchLibraryTab, onSelect: (tab: WorkbenchLibraryTab) => void): HTMLElement {
  const wrap = el('div', 'wb-library-tabs')
  for (const option of libraryTabs) {
    const button = el('button', `wb-library-tab${option.value === current ? ' is-active' : ''}`, option.label)
    button.type = 'button'
    button.addEventListener('click', () => onSelect(option.value))
    wrap.appendChild(button)
  }
  return wrap
}

function activateByAttribute(scope: HTMLElement, selector: string, activeAttribute = 'data-active'): void {
  scope.querySelectorAll<HTMLElement>(selector).forEach((item) => {
    item.addEventListener('click', () => {
      scope.querySelectorAll<HTMLElement>(selector).forEach((node) => node.removeAttribute(activeAttribute))
      item.setAttribute(activeAttribute, 'true')
    })
  })
}

function activateByClass(scope: HTMLElement, selector: string, activeClass = 'is-active'): void {
  scope.querySelectorAll<HTMLElement>(selector).forEach((item) => {
    item.addEventListener('click', () => {
      scope.querySelectorAll<HTMLElement>(selector).forEach((node) => node.classList.remove(activeClass))
      item.classList.add(activeClass)
    })
  })
}

function bindFieldFocus(scope: HTMLElement): void {
  scope.querySelectorAll<HTMLElement>('.ei-dp-field').forEach((field) => {
    field.addEventListener('click', () => {
      field.querySelector<HTMLInputElement>('input')?.focus()
    })
  })
}

function createToolbarButton(icon: string, stateClass = '', attrs = ''): string {
  return `<button class="ei-toolbar-btn ${stateClass}" ${attrs}><span>${icon}</span></button>`
}

function createFieldState(label: string, stateClass = '', disabled = false): string {
  return `
    <div class="wb-state-row">
      <span class="wb-kv-label">${label}</span>
      <div class="ei-dp-field ${stateClass}">
        <span class="ei-dp-field-icon">W</span>
        <input class="ei-dp-field-input" value="320" ${disabled ? 'disabled' : ''}>
        <span class="ei-dp-field-suffix">px</span>
      </div>
    </div>
  `
}

function createToolbarStateMatrix(): HTMLElement {
  const host = createSampleHost('wb-state-list')
  host.innerHTML = `
    <div class="wb-state-row"><span class="wb-kv-label">default</span>${createToolbarButton('↖')}</div>
    <div class="wb-state-row"><span class="wb-kv-label">hover</span>${createToolbarButton('↖', 'wb-preview-hover')}</div>
    <div class="wb-state-row"><span class="wb-kv-label">active</span>${createToolbarButton('↖', 'wb-preview-active')}</div>
    <div class="wb-state-row"><span class="wb-kv-label">selected</span>${createToolbarButton('↖', 'wb-preview-selected', 'data-active="true"')}</div>
    <div class="wb-state-row"><span class="wb-kv-label">focus</span>${createToolbarButton('↖', 'wb-preview-focus')}</div>
    <div class="wb-state-row"><span class="wb-kv-label">disabled</span>${createToolbarButton('↖', 'wb-preview-disabled', 'data-disabled="true"')}</div>
  `
  return host
}

function createInputStateMatrix(): HTMLElement {
  const host = createSampleHost('wb-state-list')
  host.innerHTML = `
    ${createFieldState('default')}
    ${createFieldState('hover', 'wb-preview-hover')}
    ${createFieldState('active', 'wb-preview-active')}
    ${createFieldState('focus', 'wb-preview-focus')}
    ${createFieldState('selected', 'wb-preview-selected')}
    ${createFieldState('disabled', 'wb-preview-disabled', true)}
  `
  return host
}

function createNavigationStateMatrix(): HTMLElement {
  const host = createSampleHost('wb-state-list')
  host.innerHTML = `
    <div class="wb-state-row"><span class="wb-kv-label">default</span><button class="ei-tab">文字</button></div>
    <div class="wb-state-row"><span class="wb-kv-label">hover</span><button class="ei-tab wb-preview-hover">文字</button></div>
    <div class="wb-state-row"><span class="wb-kv-label">active</span><button class="ei-tab wb-preview-active">文字</button></div>
    <div class="wb-state-row"><span class="wb-kv-label">selected</span><button class="ei-tab wb-preview-selected" data-active="true">文字</button></div>
    <div class="wb-state-row"><span class="wb-kv-label">focus</span><button class="ei-tab wb-preview-focus">文字</button></div>
    <div class="wb-state-row"><span class="wb-kv-label">disabled</span><button class="ei-tab wb-preview-disabled" disabled>文字</button></div>
  `
  return host
}

function createAnnotationMarkup(className: string, toolbarGap: string): string {
  return `
    <div class="ei-ann-item ${className}">
      <div class="ei-ann-main">
        <div class="ei-ann-top">
          <div class="ei-ann-author">
            <span class="ei-ann-avatar"></span>
            <div class="ei-ann-meta"><span class="ei-ann-title">工具栏间距</span><span class="ei-ann-dot">·</span><span class="ei-ann-type">design</span></div>
          </div>
          <span class="ei-ann-time">1 分钟前</span>
        </div>
        <div class="ei-ann-summary">
          <div class="ei-ann-diff">gap: 4px → ${toolbarGap}</div>
          <div class="ei-ann-note">工具栏间距统一使用 toolbar token，减少局部写死。</div>
        </div>
      </div>
    </div>
  `
}

function createAnnotationStateMatrix(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-state-list')
  host.innerHTML = `
    <div class="wb-state-row"><span class="wb-kv-label">default</span>${createAnnotationMarkup('', context.toolbarGap)}</div>
    <div class="wb-state-row"><span class="wb-kv-label">hover</span>${createAnnotationMarkup('wb-preview-hover', context.toolbarGap)}</div>
    <div class="wb-state-row"><span class="wb-kv-label">active</span>${createAnnotationMarkup('wb-preview-active', context.toolbarGap)}</div>
    <div class="wb-state-row"><span class="wb-kv-label">selected</span>${createAnnotationMarkup('is-active wb-preview-selected', context.toolbarGap)}</div>
    <div class="wb-state-row"><span class="wb-kv-label">focus</span>${createAnnotationMarkup('wb-preview-focus', context.toolbarGap)}</div>
    <div class="wb-state-row"><span class="wb-kv-label">disabled</span>${createAnnotationMarkup('wb-preview-disabled', context.toolbarGap)}</div>
  `
  return host
}

function createPanelStateMatrix(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-state-list')
  host.innerHTML = `
    <div class="wb-state-row"><span class="wb-kv-label">default</span><span class="wb-state-chip">${context.panelWidth}</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">hover</span><span class="wb-state-chip is-hover">边框 / 阴影保持稳定</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">active</span><span class="wb-state-chip is-active">拖动或操作中</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">selected</span><span class="wb-state-chip is-selected">当前面板</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">focus</span><span class="wb-state-chip is-focus">键盘焦点</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">disabled</span><span class="wb-state-chip is-disabled">不可操作</span></div>
  `
  return host
}

function createToolbarButtonsSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  const demo = el('div', 'wb-gallery-stack')
  demo.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>点击切换当前激活按钮，直接观察真实工具栏按钮的交互反馈。</p></div></div>
    <div class="wb-mini-toolbar">
      <button class="ei-toolbar-btn ${context.previewClass}" data-active="true"><span>↖</span></button>
      <button class="ei-toolbar-btn ${context.previewClass}"><span>◇</span></button>
      <button class="ei-toolbar-btn ${context.previewClass}"><span>✣</span></button>
      <button class="ei-toolbar-btn wb-preview-disabled" data-disabled="true"><span>⌘</span></button>
    </div>
  `
  activateByAttribute(demo, '.ei-toolbar-btn:not([data-disabled="true"])')
  host.append(demo, createCard('状态矩阵'))
  host.lastElementChild?.appendChild(createToolbarStateMatrix())
  return host
}

function createFilterButtonsSample(): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>点击分段项，检查互斥切换状态是否清晰。</p></div></div>
    <div class="ei-ann-filters">
      <button class="ei-ann-filter is-active">全部</button>
      <button class="ei-ann-filter">样式</button>
      <button class="ei-ann-filter">移动</button>
    </div>
    <div class="wb-state-list">
      <div class="wb-state-row"><span class="wb-kv-label">default</span><button class="ei-ann-filter">样式</button></div>
      <div class="wb-state-row"><span class="wb-kv-label">hover</span><button class="ei-ann-filter wb-preview-hover">样式</button></div>
      <div class="wb-state-row"><span class="wb-kv-label">active</span><button class="ei-ann-filter wb-preview-active">样式</button></div>
      <div class="wb-state-row"><span class="wb-kv-label">selected</span><button class="ei-ann-filter is-active">样式</button></div>
      <div class="wb-state-row"><span class="wb-kv-label">disabled</span><button class="ei-ann-filter wb-preview-disabled" disabled>样式</button></div>
    </div>
  `
  activateByClass(host, '.ei-ann-filters .ei-ann-filter')
  return host
}

function createTextButtonsSample(): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>标准文本按钮用于面板内确认、提交和次级操作；圆角固定 8px，左右内边距 12px。</p></div></div>
    <div class="wb-preview-row">
      <button class="ei-button">取消</button>
      <button class="ei-button ei-button-ghost">次级</button>
      <button class="ei-button ei-button-primary">添加</button>
      <button class="ei-button" disabled>不可用</button>
    </div>
    <div class="wb-state-list">
      <div class="wb-state-row"><span class="wb-kv-label">default</span><button class="ei-button">按钮</button></div>
      <div class="wb-state-row"><span class="wb-kv-label">ghost</span><button class="ei-button ei-button-ghost">按钮</button></div>
      <div class="wb-state-row"><span class="wb-kv-label">hover</span><button class="ei-button wb-preview-hover">按钮</button></div>
      <div class="wb-state-row"><span class="wb-kv-label">primary</span><button class="ei-button ei-button-primary">添加</button></div>
      <div class="wb-state-row"><span class="wb-kv-label">disabled</span><button class="ei-button" disabled>按钮</button></div>
    </div>
  `
  return host
}

function createInputFieldsSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>这里可以直接输入数值，检查字段高度、圆角、焦点边框和可编辑体验。</p></div></div>
    <div class="ei-dp-grid">
      <div class="ei-dp-field ${context.previewState === 'focus' ? 'wb-preview-focus' : ''}"><span class="ei-dp-field-icon">W</span><input class="ei-dp-field-input" value="${context.panelWidth.replace('px', '')}"><span class="ei-dp-field-suffix">px</span></div>
      <div class="ei-dp-field ${context.previewState === 'focus' ? 'wb-preview-focus' : ''}"><span class="ei-dp-field-icon">H</span><input class="ei-dp-field-input" value="${context.fieldHeight.replace('px', '')}"><span class="ei-dp-field-suffix">px</span></div>
    </div>
  `
  bindFieldFocus(host)
  const card = createCard('状态矩阵')
  card.appendChild(createInputStateMatrix())
  bindFieldFocus(card)
  host.appendChild(card)
  return host
}

function createTextareaSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>可以直接输入多行内容，检查 textarea 的输入、焦点和禁用状态。</p></div></div>
    <textarea class="ei-annotate-input ${context.previewState === 'focus' ? 'wb-preview-focus' : ''}" placeholder="输入注释内容预览"></textarea>
    <div class="wb-state-list">
      <div class="wb-state-row"><span class="wb-kv-label">default</span><textarea class="ei-annotate-input" placeholder="默认"></textarea></div>
      <div class="wb-state-row"><span class="wb-kv-label">focus</span><textarea class="ei-annotate-input wb-preview-focus" placeholder="焦点"></textarea></div>
      <div class="wb-state-row"><span class="wb-kv-label">disabled</span><textarea class="ei-annotate-input wb-preview-disabled" disabled placeholder="禁用"></textarea></div>
    </div>
  `
  return host
}

function createFillFieldMarkup(stateClass = '', opacity = '100'): string {
  const disabledAttrs = stateClass.includes('wb-preview-disabled') ? ' disabled' : ''
  return `<div class="ei-dp-fill-row ei-dp-fill-trigger ${stateClass}"><span class="ei-dp-swatch" style="background: var(--interactive-accent)"><input class="ei-dp-picker" type="color" value="#008AFF"${disabledAttrs}></span><input class="ei-dp-hex" value="008AFF"${disabledAttrs}><input class="ei-dp-fill-opacity" value="${opacity}"${disabledAttrs}><span class="ei-dp-fill-opacity-suffix">%</span></div>`
}

function createFontSelectMarkup(current = 'Inter'): string {
  return `<div class="ei-dp-font-select ei-dp-font-family-select"><span class="ei-dp-font-text">${current}</span><span class="ei-dp-font-arrow">⌄</span></div>`
}

function createFontSelectSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  const demo = el('div', 'wb-gallery-stack')
  demo.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>这是设计模式里真正的字体选择器。点击字段本体会展开选项列表。</p></div></div>
    ${createFontSelectMarkup('Inter')}
    <div class="wb-mini-menu wb-font-menu" hidden>
      <div class="ei-dp-font-option" data-active="true">Inter</div>
      <div class="ei-dp-font-option">SF Pro</div>
      <div class="ei-dp-font-option">Roboto</div>
      <div class="ei-dp-font-option">Helvetica Neue</div>
      <div class="ei-dp-font-option">Arial</div>
    </div>
    <div class="wb-kv"><span class="wb-kv-label">下拉项高</span><span class="wb-kv-value">${context.dropdownOptionHeight}</span></div>
  `
  const trigger = demo.querySelector<HTMLElement>('.ei-dp-font-select')
  const menu = demo.querySelector<HTMLElement>('.wb-font-menu')
  const text = demo.querySelector<HTMLElement>('.ei-dp-font-text')
  trigger?.addEventListener('click', (event) => {
    event.stopPropagation()
    menu?.toggleAttribute('hidden')
  })
  demo.querySelectorAll<HTMLElement>('.ei-dp-font-option').forEach((item) => {
    item.addEventListener('click', (event) => {
      event.stopPropagation()
      demo.querySelectorAll<HTMLElement>('.ei-dp-font-option').forEach((node) => delete node.dataset.active)
      item.dataset.active = 'true'
      if (text) text.textContent = item.textContent ?? 'Inter'
      menu?.setAttribute('hidden', '')
    })
  })
  host.appendChild(demo)
  const card = createCard('状态矩阵')
  card.innerHTML += `
    <div class="wb-state-list">
      <div class="wb-state-row"><span class="wb-kv-label">default</span>${createFontSelectMarkup('Inter')}</div>
      <div class="wb-state-row"><span class="wb-kv-label">hover</span><div class="wb-preview-hover">${createFontSelectMarkup('Inter')}</div></div>
      <div class="wb-state-row"><span class="wb-kv-label">active</span><div class="wb-preview-active">${createFontSelectMarkup('Inter')}</div></div>
      <div class="wb-state-row"><span class="wb-kv-label">selected</span>${createFontSelectMarkup('SF Pro')}</div>
    </div>
  `
  host.appendChild(card)
  return host
}

function createDropdownTriggerSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  const demo = el('div', 'wb-gallery-stack')
  demo.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>这里只保留色值字段本体；只有点击左侧小色块，才会打开颜色选择器。</p></div></div>
    ${createFillFieldMarkup(context.previewClass)}
    <div class="wb-ghost-panel" hidden>
      <div class="wb-kv"><span class="wb-kv-label">色值</span><span class="wb-kv-value">#008AFF</span></div>
      <div class="wb-kv"><span class="wb-kv-label">透明度</span><span class="wb-kv-value">100%</span></div>
      <div class="wb-kv"><span class="wb-kv-label">触发方式</span><span class="wb-kv-value">仅小色块打开选择器</span></div>
    </div>
    <div class="wb-kv"><span class="wb-kv-label">下拉项高</span><span class="wb-kv-value">${context.dropdownOptionHeight}</span></div>
  `
  const swatch = demo.querySelector<HTMLElement>('.ei-dp-swatch')
  const panel = demo.querySelector<HTMLElement>('.wb-ghost-panel')
  swatch?.addEventListener('click', (event) => {
    event.stopPropagation()
    panel?.toggleAttribute('hidden')
  })
  host.appendChild(demo)
  const card = createCard('状态矩阵')
  card.innerHTML += `
    <div class="wb-state-list">
      <div class="wb-state-row"><span class="wb-kv-label">default</span>${createFillFieldMarkup('', '100')}</div>
      <div class="wb-state-row"><span class="wb-kv-label">hover</span>${createFillFieldMarkup('wb-preview-hover', '100')}</div>
      <div class="wb-state-row"><span class="wb-kv-label">active</span>${createFillFieldMarkup('wb-preview-active', '100')}</div>
      <div class="wb-state-row"><span class="wb-kv-label">selected</span>${createFillFieldMarkup('wb-preview-selected', '100')}</div>
      <div class="wb-state-row"><span class="wb-kv-label">disabled</span>${createFillFieldMarkup('wb-preview-disabled', '100')}</div>
    </div>
  `
  host.appendChild(card)
  return host
}

function createNavigationSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>点击 tab 或面包屑，查看导航选择状态是否统一。</p></div></div>
    <div class="ei-tabs">
      <button class="ei-tab ${context.previewClass}" data-active="true">文字</button>
      <button class="ei-tab ${context.previewClass}">盒模型</button>
      <button class="ei-tab ${context.previewClass}">布局</button>
    </div>
    <div class="wb-breadcrumbs">
      <button class="ei-crumb ${context.previewClass}">App</button>
      <button class="ei-crumb ${context.previewClass}" data-active="true">Card</button>
      <button class="ei-crumb ${context.previewClass}">Button</button>
    </div>
  `
  activateByAttribute(host, '.ei-tabs .ei-tab')
  activateByAttribute(host, '.wb-breadcrumbs .ei-crumb')
  const card = createCard('状态矩阵')
  card.appendChild(createNavigationStateMatrix())
  host.appendChild(card)
  return host
}

function createMenuSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>点击菜单项，检查 hover / selected 行为是否和按钮体系一致。</p></div></div>
    <div class="wb-mini-menu">
      <button class="ei-capture-menu-item ${context.previewClass}" data-active="true"><span class="ei-capture-menu-icon">▣</span><span class="ei-capture-menu-label">捕获选区</span></button>
      <button class="ei-capture-menu-item ${context.previewClass}"><span class="ei-capture-menu-icon">◎</span><span class="ei-capture-menu-label">捕获状态</span></button>
      <button class="ei-capture-menu-item ${context.previewClass}"><span class="ei-capture-menu-icon">⌁</span><span class="ei-capture-menu-label">捕获画面</span></button>
    </div>
    <div class="wb-state-list">
      <div class="wb-state-row"><span class="wb-kv-label">default</span><button class="ei-capture-menu-item"><span class="ei-capture-menu-icon">▣</span><span class="ei-capture-menu-label">菜单项</span></button></div>
      <div class="wb-state-row"><span class="wb-kv-label">hover</span><button class="ei-capture-menu-item wb-preview-hover"><span class="ei-capture-menu-icon">▣</span><span class="ei-capture-menu-label">菜单项</span></button></div>
      <div class="wb-state-row"><span class="wb-kv-label">active</span><button class="ei-capture-menu-item wb-preview-active"><span class="ei-capture-menu-icon">▣</span><span class="ei-capture-menu-label">菜单项</span></button></div>
      <div class="wb-state-row"><span class="wb-kv-label">disabled</span><button class="ei-capture-menu-item wb-preview-disabled" disabled><span class="ei-capture-menu-icon">▣</span><span class="ei-capture-menu-label">菜单项</span></button></div>
    </div>
  `
  return host
}

function createPanelSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>面板本身展示真实容器结构，可直接查看尺寸、圆角、内容排布和关闭按钮位置。</p></div></div>
    <div class="ei-panel wb-embedded-panel">
      <div class="ei-panel-header">
        <div>
          <div class="ei-panel-title">检查面板</div>
          <div class="ei-panel-subtitle">真实 panel / field / tabs 样式</div>
        </div>
        <div class="ei-actions"><button class="ei-icon-btn">×</button></div>
      </div>
      <div class="ei-body">
        <div class="ei-row"><span class="ei-label">accent</span><span class="ei-value"><span class="ei-swatch" style="background: var(--interactive-accent)"></span><span class="ei-text">${context.accent}</span></span></div>
        <div class="ei-row"><span class="ei-label">surface</span><span class="ei-value"><span class="ei-swatch" style="background: var(--surface-panel)"></span><span class="ei-text">${context.surface}</span></span></div>
        <div class="ei-row"><span class="ei-label">density</span><span class="ei-value"><span class="ei-text">${displayDensity(context.density)}</span></span></div>
        <div class="ei-row"><span class="ei-label">radius</span><span class="ei-value"><span class="ei-text">${displayRadius(context.radiusScale)}</span></span></div>
        <div class="ei-row"><span class="ei-label">motion</span><span class="ei-value"><span class="ei-text">${displayMotion(context.motion)}</span></span></div>
        <div class="ei-row"><span class="ei-label">panel</span><span class="ei-value"><span class="ei-text">${context.panelWidth} / ${context.panelRadius}</span></span></div>
      </div>
    </div>
  `
  const card = createCard('状态矩阵')
  card.appendChild(createPanelStateMatrix(context))
  host.appendChild(card)
  return host
}

function createTooltipStateMatrix(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-state-list')
  host.innerHTML = `
    <div class="wb-state-row"><span class="wb-kv-label">default</span><div class="ei-tooltip wb-tooltip-sample"><div class="ei-tt-head"><span class="ei-tt-tag">input</span><span class="ei-tt-size">120 × ${context.fieldHeight}</span></div><div class="ei-tt-row"><span class="ei-tt-label">状态</span><span class="ei-tt-val">默认</span></div></div></div>
    <div class="wb-state-row"><span class="wb-kv-label">hover</span><div class="ei-tooltip wb-tooltip-sample"><div class="ei-tt-head"><span class="ei-tt-tag">hover</span><span class="ei-tt-size">提示</span></div><div class="ei-tt-row"><span class="ei-tt-label">状态</span><span class="ei-tt-val">悬停说明</span></div></div></div>
    <div class="wb-state-row"><span class="wb-kv-label">focus</span><div class="ei-tooltip wb-tooltip-sample"><div class="ei-tt-head"><span class="ei-tt-tag">focus</span><span class="ei-tt-size">提示</span></div><div class="ei-tt-row"><span class="ei-tt-label">状态</span><span class="ei-tt-val">焦点说明</span></div></div></div>
  `
  return host
}

function createTooltipSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>提示浮层用于解释状态与尺寸，这里保留真实 tooltip 结构与内容层级。</p></div></div>
    <div class="ei-tooltip wb-tooltip-sample">
      <div class="ei-tt-head"><span class="ei-tt-tag">input</span><span class="ei-tt-size">120 × ${context.fieldHeight}</span></div>
      <div class="ei-tt-row"><span class="ei-tt-label">状态</span><span class="ei-tt-val">${displayPreviewState(context.previewState)}</span></div>
      <div class="ei-tt-row"><span class="ei-tt-label">accent</span><span class="ei-tt-val">${context.accent}</span></div>
    </div>
  `
  const card = createCard('状态矩阵')
  card.appendChild(createTooltipStateMatrix(context))
  host.appendChild(card)
  return host
}

function createAnnotationSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>点击不同注释卡片，检查 hover / active / selected 的信息卡片反馈是否清楚。</p></div></div>
    <div class="wb-annotation-list">
      ${createAnnotationMarkup(context.previewClass, context.toolbarGap)}
      ${createAnnotationMarkup('', context.toolbarGap)}
      ${createAnnotationMarkup('', context.toolbarGap)}
    </div>
  `
  activateByClass(host, '.wb-annotation-list .ei-ann-item', 'is-active')
  const card = createCard('状态矩阵')
  card.appendChild(createAnnotationStateMatrix(context))
  host.appendChild(card)
  return host
}

function createStateReferenceSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-state-list')
  host.innerHTML = `
    <div class="wb-state-row"><span class="wb-kv-label">default</span><span class="wb-state-chip">默认</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">hover</span><span class="wb-state-chip is-hover">悬停</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">active</span><span class="wb-state-chip is-active">按下</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">selected</span><span class="wb-state-chip is-selected">选中</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">focus</span><span class="wb-state-chip is-focus">焦点</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">disabled</span><span class="wb-state-chip is-disabled">禁用</span></div>
    <div class="wb-state-row"><span class="wb-kv-label">当前</span><span class="wb-state-chip ${context.previewClass}">${displayPreviewState(context.previewState)}</span></div>
  `
  return host
}

function createColorSwatch(name: string, token: string, value: string, usage: string, source: string): HTMLElement {
  const row = el('div', 'wb-color-row')
  row.innerHTML = `
    <div class="wb-color-name-col">
      <div class="wb-color-name">${name}</div>
      <div class="wb-color-token">${token}</div>
    </div>
    <div class="wb-color-preview-col">
      <span class="wb-color-chip">
        <span class="wb-color-swatch" style="background: ${value}"></span>
        <span class="wb-color-value">${value}</span>
      </span>
    </div>
    <div class="wb-color-usage-col">${usage}</div>
    <div class="wb-color-source-col">${source}</div>
  `
  return row
}

function createColorTableHead(): HTMLElement {
  const head = el('div', 'wb-color-row wb-color-head')
  head.innerHTML = `
    <div class="wb-color-name-col">名称</div>
    <div class="wb-color-preview-col">颜色值</div>
    <div class="wb-color-usage-col">用途</div>
    <div class="wb-color-source-col">来源</div>
  `
  return head
}

function createColorTable(rows: HTMLElement[]): HTMLElement {
  const table = el('div', 'wb-color-table')
  table.appendChild(createColorTableHead())
  rows.forEach((row) => table.appendChild(row))
  return table
}

function createTokenColorRow(name: string, token: string, value: string, usage: string, source: string): HTMLElement {
  return createColorSwatch(name, token, value, usage, source)
}

function getContrastColorLabel(context: SampleRenderContext): string {
  return context.surface.trim().toLowerCase() === '#ffffff' ? '黑色' : '白色'
}

function getForegroundValue(context: SampleRenderContext): string {
  return getContrastColorLabel(context) === '白色' ? '#FFFFFF' : '#000000'
}

function getContrastScaleText(contrast: ThemeContrast): { field: string; hover: string; active: string } {
  if (contrast === 'soft') {
    return { field: '4.5%', hover: '6.5%', active: '11.5%' }
  }

  if (contrast === 'strong') {
    return { field: '8%', hover: '11%', active: '20%' }
  }

  return { field: '6%', hover: '8%', active: '14%' }
}

function getColorSourceInfo(context: SampleRenderContext): Record<'foreground' | 'panel' | 'field' | 'dropdown' | 'hover' | 'active' | 'accentSoft', string> {
  const foreground = getContrastColorLabel(context)
  const scale = getContrastScaleText(context.contrast)
  const dropdownMix = foreground === '白色' ? '8% foreground.base' : '5% foreground.base'

  return {
    foreground: `根据 surface.base 自动选择：深色界面使用白色，浅色界面使用黑色。它是文字、边框、hover、active 等派生色的前景源色。`,
    panel: `直接使用左侧“界面底色” surface.base（${context.surface}），不额外加透明度。`,
    field: `由 foreground.base 叠加在透明底上生成；当前对比度 ${displayContrast(context.contrast)} 下约 ${scale.field} 不透明度。`,
    dropdown: `由 surface.base 向 foreground.base 轻微混合生成；当前大约混入 ${dropdownMix}。`,
    hover: `由 foreground.base 叠加在透明底上生成；当前对比度 ${displayContrast(context.contrast)} 下约 ${scale.hover} 不透明度。`,
    active: `由 foreground.base 叠加在透明底上生成；当前对比度 ${displayContrast(context.contrast)} 下约 ${scale.active} 不透明度。`,
    accentSoft: `由品牌强调色 accent（${context.accent}）混入透明底生成；当前为 accent 12% + transparent。`,
  }
}

function createColorPaletteSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  const theme = buildTheme({
    brand: { accent: context.accent },
    surface: { base: context.surface },
    density: context.density,
    radiusScale: context.radiusScale,
    motion: context.motion,
  })
  const source = getColorSourceInfo(context)
  const rows = [
    createColorSwatch('品牌强调色', 'brand.accent', theme.config.brand.accent, '按钮、选中、焦点、重要操作', '左侧“强调色”直接输入，作为 accent 源色。'),
    createColorSwatch('界面底色', 'surface.base', theme.config.surface.base, '整套界面的基础底色', '左侧“界面底色”直接输入，作为所有 surface 派生色的源色。'),
    createColorSwatch('Foreground', 'foreground.base', getForegroundValue(context), '文字、边框、hover、active 等派生色的前景源色', source.foreground),
    createColorSwatch('Panel 背景', '--surface-panel', theme.semantic.surface.panel, '检查面板、设置面板、信息容器', source.panel),
    createColorSwatch('Field 背景', '--surface-field', theme.semantic.surface.field, '输入框、数值框、可编辑区域', source.field),
    createColorSwatch('Dropdown 背景', '--surface-dropdown', theme.semantic.surface.dropdown, '下拉菜单、弹出选择层', source.dropdown),
    createColorSwatch('Hover 背景', '--surface-hover', theme.semantic.surface.hover, '鼠标悬停反馈', source.hover),
    createColorSwatch('Active 背景', '--surface-active', theme.semantic.surface.active, '按下、当前激活反馈', source.active),
    createColorSwatch('选中底色', '--interactive-accent-soft', theme.semantic.interactive.accentSoft, '选中项、弱强调背景', source.accentSoft),
  ]
  host.appendChild(createColorTable(rows))
  return host
}

function createTextBorderColorSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  const theme = buildTheme({
    brand: { accent: context.accent },
    surface: { base: context.surface },
    density: context.density,
    radiusScale: context.radiusScale,
    motion: context.motion,
  })
  const rows = [
    createTokenColorRow('主要文字', '--text-primary', theme.semantic.text.primary, '最高优先级文字、标题、关键内容', '由 foreground.base 按当前对比度较高透明度生成。'),
    createTokenColorRow('次要文字', '--text-secondary', theme.semantic.text.secondary, '说明文字、次级信息、辅助描述', '由 foreground.base 按当前对比度中等透明度生成。'),
    createTokenColorRow('辅助文字', '--text-tertiary', theme.semantic.text.tertiary, '更弱的信息层级、辅助标签', '由 foreground.base 按当前对比度更低透明度生成。'),
    createTokenColorRow('淡文字', '--text-faint', theme.semantic.text.faint, '占位、弱提示、低存在感信息', '由 foreground.base 按当前对比度低透明度生成。'),
    createTokenColorRow('默认边框', '--border-default', theme.semantic.border.default, '面板、模块、普通分割线', '由 foreground.base 按边框默认透明度生成。'),
    createTokenColorRow('悬停边框', '--border-hover', theme.semantic.border.hover, 'hover 态边框、可交互轮廓增强', '由 foreground.base 按边框 hover 透明度生成。'),
    createTokenColorRow('输入边框', '--border-input', theme.semantic.border.input, '输入框、字段、表单控件轮廓', '由 foreground.base 按输入边框透明度生成。'),
  ]
  host.appendChild(createColorTable(rows))
  return host
}

function createFeedbackColorSample(context: SampleRenderContext): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  const theme = buildTheme({
    brand: { accent: context.accent },
    surface: { base: context.surface },
    density: context.density,
    radiusScale: context.radiusScale,
    motion: context.motion,
  })
  const rows = [
    createTokenColorRow('成功背景', '--success-bg', theme.semantic.feedback.successBg, '成功提示、成功状态底色', '固定 success 语义色按 18% 透明度生成。'),
    createTokenColorRow('危险背景', '--danger-bg', theme.semantic.feedback.dangerBg, '危险提示、删除、错误状态底色', '固定 danger 语义色按 18% 透明度生成。'),
    createTokenColorRow('焦点环', '--interactive-focus-ring', theme.semantic.interactive.focusRing, '键盘焦点、当前高亮轮廓', '直接使用品牌强调色 accent 作为 focus ring。'),
    createTokenColorRow('参考线', '--overlay-guide', theme.semantic.overlay.guide, '对齐参考线、辅助定位', '独立参考线颜色，不跟随品牌强调色 accent。'),
    createTokenColorRow('外边距覆盖层', '--overlay-margin', theme.semantic.overlay.margin, '盒模型外边距覆盖层', '固定语义 margin 色，用于测量外边距。'),
    createTokenColorRow('内边距覆盖层', '--overlay-padding', theme.semantic.overlay.padding, '盒模型内边距覆盖层', '固定语义 success 色，用于测量内边距。'),
  ]
  host.appendChild(createColorTable(rows))
  return host
}

function createTokenReferenceSample(context: SampleRenderContext): HTMLElement {
  return createColorPaletteSample(context)
}

function createCheckboxSample(): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  host.innerHTML = `
    <div class="wb-section-head"><div><h3>交互演示</h3><p>这里展示 checkbox 标准组件本体的真实使用方式；后面的文本或内容区都可以按场景自由组合。</p></div></div>
    <div class="wb-state-list">
      <div class="wb-state-row"><span class="wb-kv-label">unchecked</span><div class="ei-ann-info-row"><label class="ei-checkbox"><input type="checkbox" aria-label="unchecked"><span class="ei-checkbox-mark"></span></label><div class="ei-ann-info-content"><span class="ei-ann-info-property">display:</span><span class="ei-ann-info-value-wrap"><span class="ei-ann-info-value">block</span></span></div></div></div>
      <div class="wb-state-row"><span class="wb-kv-label">checked</span><div class="ei-ann-info-row"><label class="ei-checkbox"><input type="checkbox" checked aria-label="checked"><span class="ei-checkbox-mark"></span></label><div class="ei-ann-info-content"><span class="ei-ann-info-property">color:</span><span class="ei-ann-info-value-wrap"><span class="ei-ann-info-swatch" style="background:#6fff2c"></span><span class="ei-ann-info-value">#6fff2c</span></span></div></div></div>
      <div class="wb-state-row"><span class="wb-kv-label">muted</span><div class="ei-ann-info-row is-muted"><label class="ei-checkbox"><input type="checkbox" aria-label="muted"><span class="ei-checkbox-mark"></span></label><div class="ei-ann-info-content"><span class="ei-ann-info-property">background-image:</span><span class="ei-ann-info-value-wrap"><span class="ei-ann-info-value">none</span></span></div></div></div>
    </div>
  `
  return host
}

function createPendingStylePreview(item: PendingRegistryItem): HTMLElement {
  const host = createSampleHost('wb-gallery-stack')
  const styleBlock = el('div', 'wb-section-head')
  const textWrap = el('div')
  textWrap.append(
    el('h3', undefined, '对应样式'),
    el('p', undefined, '这里展示当前登记的类名，以及它们在运行时样式表里的真实规则，方便直接核对。'),
  )
  styleBlock.appendChild(textWrap)

  const runtimeCss = createRuntimeStyles(buildTheme(loadState().theme))
  const selectors = item.classNames.filter((name) => name.startsWith('.ei-') || name.startsWith('.ei-dp-'))
  const cssRules = selectors.flatMap((selector) => {
    const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const singleLine = runtimeCss.match(new RegExp(`${escaped}\\s*\\{[^}]*\\}`, 'g')) ?? []
    return singleLine
  })

  const code = document.createElement('pre')
  code.className = 'wb-code-block'
  code.textContent = [
    '/* classNames */',
    ...item.classNames,
    '',
    '/* runtime styles */',
    ...(cssRules.length ? cssRules : ['(未匹配到对应运行时规则)']),
  ].join('\n')
  host.append(styleBlock, code)
  return host
}

function createPendingCard(item: PendingRegistryItem): HTMLElement {
  const card = createCard(item.title)
  const tags = el('div', 'wb-class-tags')
  item.classNames.forEach((name) => tags.appendChild(createClassTag(name)))
  tags.appendChild(createBadge(REVIEW_STATUS_LABELS[item.reviewStatus]))
  card.append(el('p', 'wb-sample-desc', item.description), tags, createPendingMetaRows(item), createPendingStylePreview(item))
  return card
}

const componentSamples: WorkbenchComponentSample[] = [
  {
    id: 'color-palette',
    title: '颜色总表',
    tab: 'colors',
    status: 'stable',
    componentKind: 'project',
    description: '把当前主题真正使用到的核心颜色整理出来，便于你检查品牌色、表面色和交互色是否还统一。',
    classNames: ['brand.accent', 'surface.base', '--surface-panel', '--surface-hover'],
    render: createColorPaletteSample,
  },
  {
    id: 'text-border-colors',
    title: '文字与边框规范',
    tab: 'colors',
    status: 'stable',
    componentKind: 'project',
    description: '集中查看文字层级和边框颜色，确认可读性和控件轮廓是否一致。',
    classNames: ['--text-primary', '--text-secondary', '--border-default', '--border-input'],
    render: createTextBorderColorSample,
  },
  {
    id: 'feedback-colors',
    title: '反馈与覆盖层颜色',
    tab: 'colors',
    status: 'stable',
    componentKind: 'project',
    description: '整理成功、危险、焦点和测量覆盖层用色，避免后续功能新增时出现野生反馈色。',
    classNames: ['--success', '--danger', '--interactive-focus-ring', '--overlay-guide'],
    render: createFeedbackColorSample,
  },
  {
    id: 'toolbar-buttons',
    title: '图标按钮',
    tab: 'buttons',
    status: 'stable',
    componentKind: 'standard',
    description: '基础图标按钮模式，用于检查、设计、移动、变更等高频操作入口。',
    classNames: ['.ei-toolbar-btn'],
    render: createToolbarButtonsSample,
  },
  {
    id: 'segmented-switch',
    title: '分段切换',
    tab: 'buttons',
    status: 'stable',
    componentKind: 'standard',
    description: '互斥分段切换模式，用于列表过滤、内容分组切换和同级状态选择。',
    classNames: ['.ei-ann-filter'],
    render: () => createFilterButtonsSample(),
  },
  {
    id: 'text-buttons',
    title: '文本按钮',
    tab: 'buttons',
    status: 'stable',
    componentKind: 'standard',
    description: '基础文本按钮模式，用于面板内的添加、更新、取消等文字操作，支持 primary 与 ghost 变体。',
    classNames: ['.ei-button', '.ei-button-primary', '.ei-button-ghost'],
    render: () => createTextButtonsSample(),
  },
  {
    id: 'dp-field',
    title: '字段输入框',
    tab: 'inputs',
    status: 'stable',
    componentKind: 'standard',
    description: '基础字段输入模式，用于数值、尺寸等可编辑属性。',
    classNames: ['.ei-dp-field', '.ei-dp-field-input', '.ei-dp-field-suffix'],
    render: createInputFieldsSample,
  },
  {
    id: 'annotate-input',
    title: '多行输入框',
    tab: 'inputs',
    status: 'stable',
    componentKind: 'standard',
    description: '基础多行输入模式，用于注释、备注等文本输入场景。',
    classNames: ['.ei-annotate-input'],
    render: createTextareaSample,
  },
  {
    id: 'checkbox',
    title: '复选框',
    tab: 'inputs',
    status: 'stable',
    componentKind: 'standard',
    description: '标准 checkbox 本体，只负责勾选状态、焦点、hover、disabled 等交互表现。可单独使用，也可和任意文本、字段、卡片内容组合。',
    classNames: ['.ei-checkbox', '.ei-checkbox-mark'],
    render: createCheckboxSample,
  },
  {
    id: 'fill-trigger',
    title: '颜色选择器',
    tab: 'inputs',
    status: 'stable',
    componentKind: 'standard',
    description: '基础颜色选择模式，包含小色块、色值和不透明度入口。',
    classNames: ['.ei-dp-fill-row', '.ei-dp-swatch', '.ei-dp-hex', '.ei-dp-fill-opacity'],
    render: createDropdownTriggerSample,
  },
  {
    id: 'font-select',
    title: '下拉选择器',
    tab: 'inputs',
    status: 'stable',
    componentKind: 'standard',
    description: '基础 dropdown select 模式，用于从一组选项中选择一个值。',
    classNames: ['.ei-dp-font-select', '.ei-dp-font-dropdown', '.ei-dp-font-option'],
    render: createFontSelectSample,
  },
  {
    id: 'tabs-breadcrumbs',
    title: '导航选择控件',
    tab: 'navigation',
    status: 'stable',
    componentKind: 'standard',
    description: '基础导航选择模式，覆盖 tab 与 breadcrumb 这类同源选择控件。',
    classNames: ['.ei-tab', '.ei-crumb'],
    render: createNavigationSample,
  },
  {
    id: 'capture-menu',
    title: '菜单项',
    tab: 'navigation',
    status: 'stable',
    componentKind: 'standard',
    description: '基础菜单项模式，用于下拉菜单和操作列表。',
    classNames: ['.ei-capture-menu-item'],
    render: createMenuSample,
  },
  {
    id: 'panel-shell',
    title: '面板容器',
    tab: 'panels',
    status: 'stable',
    componentKind: 'standard',
    description: '基础面板容器模式，用于承载属性、信息和操作内容。',
    classNames: ['.ei-panel', '.ei-panel-header', '.ei-panel-title'],
    render: createPanelSample,
  },
  {
    id: 'annotation-item',
    title: '注释卡片',
    tab: 'panels',
    status: 'stable',
    componentKind: 'project',
    description: '项目里的信息卡片组合，用于承载注释、差异和操作入口。',
    classNames: ['.ei-ann-item', '.ei-ann-title', '.ei-ann-diff'],
    render: createAnnotationSample,
  },
  {
    id: 'tooltip',
    title: '提示浮层',
    tab: 'panels',
    status: 'stable',
    componentKind: 'standard',
    description: '真实 tooltip 结构，可用来查看提示信息与输入焦点的配合。',
    classNames: ['.ei-tooltip', '.ei-tt-head', '.ei-tt-row'],
    render: createTooltipSample,
  },
  {
    id: 'state-reference',
    title: '状态参考',
    tab: 'states',
    status: 'stable',
    componentKind: 'project',
    description: '项目级状态参考，用于集中查看 default / hover / active / selected / focus / disabled 的视觉差异。',
    classNames: ['.wb-state-chip', '--surface-hover', '--interactive-focus-ring'],
    render: createStateReferenceSample,
  },
  {
    id: 'token-reference',
    title: '组件颜色 token',
    tab: 'states',
    status: 'stable',
    componentKind: 'project',
    description: '集中查看真实组件消费的 surface / interactive token，确认左侧主题输入能全局联动。',
    classNames: ['--surface-panel', '--surface-field', '--interactive-accent'],
    render: createTokenReferenceSample,
  },
]

function getVisibleSamples(tab: WorkbenchLibraryTab): WorkbenchComponentSample[] {
  if (tab === 'all') return componentSamples
  if (tab === 'pending') return []
  return componentSamples.filter((sample) => sample.tab === tab)
}

function groupSamplesByTab(samples: WorkbenchComponentSample[]): Record<Exclude<WorkbenchLibraryTab, 'all'>, WorkbenchComponentSample[]> {
  return {
    colors: samples.filter((sample) => sample.tab === 'colors'),
    buttons: samples.filter((sample) => sample.tab === 'buttons'),
    inputs: samples.filter((sample) => sample.tab === 'inputs'),
    navigation: samples.filter((sample) => sample.tab === 'navigation'),
    panels: samples.filter((sample) => sample.tab === 'panels'),
    states: samples.filter((sample) => sample.tab === 'states'),
    pending: [],
  }
}

function renderLibrarySection(title: string, description: string, cards: HTMLElement[], layout: 'grid' | 'stack' = 'grid'): HTMLElement {
  const section = el('section', 'wb-section')
  section.innerHTML = `
    <div class="wb-section-head">
      <div>
        <h3>${title}</h3>
        <p>${description}</p>
      </div>
    </div>
  `
  const container = el('div', layout === 'stack' ? 'wb-gallery-stack' : 'wb-gallery-grid')
  cards.forEach((card) => container.appendChild(card))
  section.appendChild(container)
  return section
}

function getLibrarySectionLayout(tab: Exclude<WorkbenchLibraryTab, 'all' | 'pending'>): 'grid' | 'stack' {
  return tab === 'colors' ? 'stack' : 'grid'
}

function renderPendingSection(): HTMLElement {
  const pending = getPendingRegistry()
  const standardCards = pending.filter((item) => item.componentKind === 'standard').map((item) => createPendingCard(item))
  const projectCards = pending.filter((item) => item.componentKind === 'project').map((item) => createPendingCard(item))

  const wrap = el('div', 'wb-gallery-stack')
  if (standardCards.length) {
    wrap.appendChild(renderLibrarySection('待确认标准组件', '这里放还未正式收录、但目标是沉淀为跨模块复用基础能力的组件。', standardCards))
  }
  if (projectCards.length) {
    wrap.appendChild(renderLibrarySection('待确认项目组件', '这里放依赖具体业务语义或组合关系的项目组件，通常由标准组件组合而成。', projectCards))
  }
  return wrap
}

function createContext(state: WorkbenchState): SampleRenderContext {
  const theme = buildTheme(state.theme)
  return {
    previewClass: `wb-preview-${state.previewState}`,
    previewState: state.previewState,
    accent: theme.config.brand.accent,
    surface: theme.config.surface.base,
    contrast: theme.config.contrast,
    density: theme.config.density,
    radiusScale: theme.config.radiusScale,
    motion: theme.config.motion,
    panelWidth: theme.components.panel.width,
    panelRadius: theme.components.panel.radius,
    fieldHeight: theme.components.field.height,
    fieldRadius: theme.components.field.radius,
    dropdownOptionHeight: theme.components.dropdown.optionHeight,
    toolbarGap: theme.components.toolbar.buttonGap,
  }
}

function renderComponentLibrary(main: HTMLElement, state: WorkbenchState, onTabChange: (tab: WorkbenchLibraryTab) => void): void {
  const context = createContext(state)
  const tabSection = el('section', 'wb-section')
  const head = el('div', 'wb-section-head')
  const body = el('div')
  body.append(el('h3', undefined, '组件资产盘点'), el('p', undefined, libraryTabDescriptions[state.libraryTab]))
  head.appendChild(body)
  tabSection.append(head, createLibraryTabBar(state.libraryTab, onTabChange), createDesignSystemRuleCard())
  main.appendChild(tabSection)

  if (state.libraryTab === 'all') {
    const grouped = groupSamplesByTab(componentSamples)
    for (const tab of ['colors', 'buttons', 'inputs', 'navigation', 'panels', 'states'] as const) {
      const samples = grouped[tab]
      if (!samples.length) continue
      const standardCards = samples.filter((sample) => sample.componentKind === 'standard').map((sample) => createSampleCard(sample, context))
      const projectCards = samples.filter((sample) => sample.componentKind === 'project').map((sample) => createSampleCard(sample, context))
      if (standardCards.length) {
        main.appendChild(renderLibrarySection(`${stableTabLabel[tab]} / 标准组件`, libraryTabDescriptions[tab], standardCards, getLibrarySectionLayout(tab)))
      }
      if (projectCards.length) {
        main.appendChild(renderLibrarySection(`${stableTabLabel[tab]} / 项目组件`, libraryTabDescriptions[tab], projectCards, getLibrarySectionLayout(tab)))
      }
    }
    main.appendChild(renderPendingSection())
    return
  }

  if (state.libraryTab === 'pending') {
    main.appendChild(renderPendingSection())
    return
  }

  const visible = getVisibleSamples(state.libraryTab)
  const standardCards = visible.filter((sample) => sample.componentKind === 'standard').map((sample) => createSampleCard(sample, context))
  const projectCards = visible.filter((sample) => sample.componentKind === 'project').map((sample) => createSampleCard(sample, context))
  if (standardCards.length) {
    main.appendChild(renderLibrarySection(`${stableTabLabel[state.libraryTab]} / 标准组件`, libraryTabDescriptions[state.libraryTab], standardCards, getLibrarySectionLayout(state.libraryTab)))
  }
  if (projectCards.length) {
    main.appendChild(renderLibrarySection(`${stableTabLabel[state.libraryTab]} / 项目组件`, libraryTabDescriptions[state.libraryTab], projectCards, getLibrarySectionLayout(state.libraryTab)))
  }
}

function createDesignSystemRuleCard(): HTMLElement {
  const card = createCard('执行规则')
  const intro = el('p', 'wb-rule-intro', '后续新增 UI 或修改已有功能时，默认必须先对照 Elens Design System，再决定是复用、扩展还是新增组件。')
  const list = el('ol', 'wb-rule-list')

  const items = [
    '先检查 Workbench 里是否已有可复用组件，不要直接新造样式。',
    '颜色选择必须复用统一颜色选择器；dropdown、field、panel、tab 也必须优先复用现有模式。',
    '如果不能直接复用，先说明最接近的现有组件，以及为什么不能扩展它。',
    '新增可复用模式时，先进入待确认组件区，再决定是否正式收录。',
    '完成 UI 改动前，至少运行 npm run check:design-system、npx tsc --noEmit、npx vite build --outDir demo-dist。',
  ]

  for (const text of items) {
    list.appendChild(el('li', undefined, text))
  }

  const note = el('div', 'wb-rule-note')
  note.append(
    el('span', 'wb-sample-badge', 'AI 开发默认规则'),
    el('p', undefined, '目标不是“做得像就行”，而是“以后所有新功能都长在同一套系统里”。如果发现新样式和现有组件接近，优先视为复用或合并问题，而不是新品类。'),
  )

  card.append(intro, list, note)
  return card
}

function renderControls(root: HTMLElement, state: WorkbenchState, onUpdate: () => void, onReset: () => void): void {
  const panel = el('aside', 'wb-controls')
  const head = el('div', 'wb-controls-head')
  head.appendChild(createHeadingWithHelp('span', '', ['Workbench']))
  head.firstElementChild?.classList.add('wb-eyebrow')
  head.appendChild(createHeadingWithHelp('h1', 'Elens', ['Design System']))
  head.appendChild(el('p', undefined, '这里是 Elens 的设计系统工作台。你可以改颜色、圆角、组件尺寸，并立即看到真实组件变化。'))
  panel.appendChild(head)

  const basic = el('section', 'wb-control-section')
  basic.appendChild(el('h2', undefined, '基础'))
  const foregroundValue = getForegroundValue(createContext(state))
  basic.append(
    createField('强调色', createTextInput(state.theme.brand?.accent ?? '#008AFF', (value) => {
      state.theme.brand = { ...state.theme.brand, accent: value }
      onUpdate()
    }, 'color'), ['accent']),
    createField('强调色代码', createTextInput(state.theme.brand?.accent ?? '#008AFF', (value) => {
      state.theme.brand = { ...state.theme.brand, accent: value }
      onUpdate()
    }), ['accent']),
    createField('界面底色', createTextInput(state.theme.surface?.base ?? '#111113', (value) => {
      state.theme.surface = { ...state.theme.surface, base: value }
      onUpdate()
    }, 'color'), ['surface']),
    createField('底色代码', createTextInput(state.theme.surface?.base ?? '#111113', (value) => {
      state.theme.surface = { ...state.theme.surface, base: value }
      onUpdate()
    }), ['surface']),
    createReadonlyField('Foreground', foregroundValue, '根据界面底色自动推导，不需要单独设置。'),
    createField('对比度', createSelect<ThemeContrast>(state.theme.contrast ?? 'normal', contrastOptions, (value) => {
      state.theme.contrast = value
      onUpdate()
    }), ['contrast']),
  )

  const feel = el('section', 'wb-control-section')
  feel.appendChild(el('h2', undefined, '整体感觉'))
  feel.append(
    createField('密度', createSelect<ThemeDensity>(state.theme.density ?? 'compact', densityOptions, (value) => {
      state.theme.density = value
      onUpdate()
    }), ['density']),
    createField('圆角风格', createSelect<ThemeRadiusScale>(state.theme.radiusScale ?? 'normal', radiusOptions, (value) => {
      state.theme.radiusScale = value
      onUpdate()
    }), ['radius']),
    createField('动效', createSelect<ThemeMotion>(state.theme.motion ?? 'normal', motionOptions, (value) => {
      state.theme.motion = value
      onUpdate()
    }), ['motion']),
    createField('基础字号', createTextInput(String(state.theme.typography?.baseFontSize ?? 11), (value) => {
      const size = Number.parseInt(value, 10)
      if (!Number.isNaN(size)) {
        state.theme.typography = { ...state.theme.typography, baseFontSize: size }
        onUpdate()
      }
    }, 'number')),
    createField('字体族', createTextInput(state.theme.typography?.fontFamily ?? DEFAULT_STATE.theme.typography?.fontFamily ?? '', (value) => {
      state.theme.typography = { ...state.theme.typography, fontFamily: value }
      onUpdate()
    })),
  )

  const components = el('section', 'wb-control-section')
  components.appendChild(el('h2', undefined, '组件规格'))
  components.append(
    createField('面板宽度', createTextInput(state.theme.component?.panel?.width ?? DEFAULT_STATE.theme.component?.panel?.width ?? '', (value) => {
      state.theme.component = {
        ...state.theme.component,
        panel: { ...state.theme.component?.panel, width: value },
      }
      onUpdate()
    }), ['panel']),
    createField('面板圆角', createTextInput(state.theme.component?.panel?.radius ?? DEFAULT_STATE.theme.component?.panel?.radius ?? '', (value) => {
      state.theme.component = {
        ...state.theme.component,
        panel: { ...state.theme.component?.panel, radius: value },
      }
      onUpdate()
    }), ['panel', 'radius']),
    createField('字段高度', createTextInput(state.theme.component?.field?.height ?? DEFAULT_STATE.theme.component?.field?.height ?? '', (value) => {
      state.theme.component = {
        ...state.theme.component,
        field: { ...state.theme.component?.field, height: value },
      }
      onUpdate()
    }), ['field']),
    createField('字段圆角', createTextInput(state.theme.component?.field?.radius ?? DEFAULT_STATE.theme.component?.field?.radius ?? '', (value) => {
      state.theme.component = {
        ...state.theme.component,
        field: { ...state.theme.component?.field, radius: value },
      }
      onUpdate()
    }), ['field', 'radius']),
    createField('下拉项高度', createTextInput(state.theme.component?.dropdown?.optionHeight ?? DEFAULT_STATE.theme.component?.dropdown?.optionHeight ?? '', (value) => {
      state.theme.component = {
        ...state.theme.component,
        dropdown: { ...state.theme.component?.dropdown, optionHeight: value },
      }
      onUpdate()
    }), ['dropdown']),
    createField('工具栏间距', createTextInput(state.theme.component?.toolbar?.buttonGap ?? DEFAULT_STATE.theme.component?.toolbar?.buttonGap ?? '', (value) => {
      state.theme.component = {
        ...state.theme.component,
        toolbar: { ...state.theme.component?.toolbar, buttonGap: value },
      }
      onUpdate()
    }), ['toolbar']),
  )

  const preview = el('section', 'wb-control-section')
  preview.appendChild(el('h2', undefined, '预览状态'))
  preview.append(
    createField('交互状态', createSelect<PreviewInteractionState>(state.previewState, previewOptions, (value) => {
      state.previewState = value
      saveState(state)
      onUpdate()
    })),
  )

  const actions = el('section', 'wb-control-section')
  actions.appendChild(createHeadingWithHelp('h2', '导出', ['ThemeConfig', 'JSON']))
  const output = el('textarea', 'wb-output')
  output.readOnly = true
  const refreshOutput = (): void => {
    output.value = JSON.stringify(state.theme, null, 2)
  }
  refreshOutput()
  root.addEventListener('elens:theme-change', refreshOutput)
  const resetButton = el('button', 'wb-button', '恢复默认草稿')
  resetButton.type = 'button'
  resetButton.addEventListener('click', () => {
    Object.assign(state, structuredClone(DEFAULT_STATE))
    saveState(state)
    onReset()
  })
  actions.append(output, resetButton)

  panel.append(basic, feel, components, preview, actions)
  root.appendChild(panel)
}

function renderSamples(root: HTMLElement, state: WorkbenchState, onTabChange: (tab: WorkbenchLibraryTab) => void): void {
  const main = el('main', 'wb-main')
  const hero = el('section', 'wb-hero')
  const eyebrow = createHeadingWithHelp('span', '', ['Runtime Style Builder'])
  eyebrow.classList.add('wb-eyebrow')
  hero.append(
    eyebrow,
    el('h2', undefined, '真实组件库'),
    el('p', undefined, '右侧现在按组件类型收录真实运行时样本。每张卡片都保留真实类名，方便你定期检查重复组件、失控变体和待整理样式。'),
  )
  main.appendChild(hero)
  renderComponentLibrary(main, state, onTabChange)
  root.appendChild(main)
}

function renderWorkbench(root: HTMLElement, state: WorkbenchState): void {
  root.textContent = ''
  const styleEl = document.querySelector<HTMLStyleElement>('style[data-elens-runtime]') ?? document.createElement('style')
  const inspector = getInspectorInstance()
  styleEl.dataset.elensRuntime = 'true'
  styleEl.textContent = createRuntimeStyles(buildTheme(state.theme))
  document.head.appendChild(styleEl)

  const shell = el('div', 'wb-shell')
  const rerender = (): void => renderWorkbench(root, state)
  const notifyUpdate = (): void => {
    state.theme = mergeThemeConfig(DEFAULT_STATE.theme, state.theme)
    saveState(state)
    persistTheme(state.theme)
    inspector?.updateTheme(state.theme)
    styleEl.textContent = createRuntimeStyles(buildTheme(state.theme))
    rerender()
  }
  const resetWorkbench = (): void => {
    clearPersistedTheme()
    inspector?.resetTheme()
    Object.assign(state, structuredClone(DEFAULT_STATE))
    saveState(state)
    styleEl.textContent = createRuntimeStyles(buildTheme(state.theme))
    rerender()
  }
  const changeTab = (tab: WorkbenchLibraryTab): void => {
    state.libraryTab = tab
    saveState(state)
    rerender()
  }

  renderControls(shell, state, notifyUpdate, resetWorkbench)
  renderSamples(shell, state, changeTab)
  root.appendChild(shell)
  bindHelpTooltips(shell)
}

const root = document.querySelector<HTMLElement>('#elens-workbench')
if (root) {
  renderWorkbench(root, loadState())
}
