export type BoxEdges = {
  top: string
  right: string
  bottom: string
  left: string
}

export type InspectorInfo = {
  element: HTMLElement
  tagName: string
  id: string
  className: string
  text: string
  domPath: string
  rect: {
    left: number
    top: number
    width: number
    height: number
  }
  typography: {
    fontFamily: string
    fontSize: string
    fontWeight: string
    fontStyle: string
    lineHeight: string
    letterSpacing: string
    color: string
    textAlign: string
    textTransform: string
    textDecoration: string
  }
  boxModel: {
    width: string
    height: string
    margin: BoxEdges
    padding: BoxEdges
    borderWidth: BoxEdges
    borderRadius: string
    boxSizing: string
  }
  layout: {
    display: string
    position: string
    gap: string
    flexDirection: string
    justifyContent: string
    alignItems: string
    flexWrap: string
    gridTemplateColumns: string
    gridTemplateRows: string
  }
  visual: {
    backgroundColor: string
    backgroundOpacity: string
    borderColor: string
    borderStyle: string
    boxShadow: string
    opacity: string
    overflow: string
  }
  accessibility: {
    name: string
    role: string
    keyboardFocusable: boolean
  }
}

export type StyleDiff = {
  property: string
  original: string
  modified: string
}

export type ChangeSelector = {
  primary: string
  fallbacks: string[]
  testing: string[]
  semantic: string[]
  stable: string[]
  structural: string[]
  unstable: string[]
}

export type ChangeLocatorHints = {
  bestCodeSearchTerms: string[]
  textAnchors: string[]
  attributeAnchors: string[]
  componentHints: string[]
  confidence: 'high' | 'medium' | 'low'
}

export type ChangeSourceContext = {
  framework: 'react' | 'vue' | 'svelte' | 'angular' | 'unknown'
  componentNames: string[]
  componentTree: string[]
  sourceFilePaths: string[]
}

export type ChangeIdentity = {
  id: string
  className: string
  role: string
  accessibleName: string
  dataAttributes: Record<string, string>
}

export type ChangeContext = {
  parentTag: string
  previousSiblingText: string
  nextSiblingText: string
}

export type ChangeTarget = {
  tagName: string
  text: string
  domPath: string
  selector: ChangeSelector
  identity: ChangeIdentity
  context: ChangeContext
  locatorHints: ChangeLocatorHints
  sourceContext: ChangeSourceContext
  box: {
    x: number
    y: number
    width: number
    height: number
  }
}

export type TextDiff = {
  from: string
  to: string
}

export type MoveDiff = {
  fromIndex: number
  toIndex: number
}

export type ChangePatch = {
  styleDiffs: StyleDiff[]
  textDiff?: TextDiff
  moveDiff?: MoveDiff
}

export type ChangeSnapshot = {
  text: string
  box: {
    width: string
    height: string
    margin: string
    padding: string
    borderRadius: string
  }
  typography: {
    fontFamily: string
    fontSize: string
    fontWeight: string
    lineHeight: string
    letterSpacing: string
    color: string
  }
  layout: {
    display: string
    gap: string
    justifyContent: string
    alignItems: string
  }
  visual: {
    backgroundColor: string
    opacity: string
    borderColor: string
    boxShadow: string
  }
}

export type ChangeMeta = {
  sourceMode: 'inspector' | 'design' | 'move'
  status: 'confirmed'
  createdAt: string
  updatedAt: string
  route?: string
  note?: string
}

export type InspectorMode = 'off' | 'inspector' | 'design' | 'move' | 'guides' | 'changes'

export type OutputDetail = 'compact' | 'standard' | 'detailed' | 'forensic'

export type Change = {
  id: string
  type: 'annotation' | 'design' | 'move'
  element: HTMLElement
  info: InspectorInfo
  comment: string
  diffs?: StyleDiff[]
  timestamp: number
  target: ChangeTarget
  patch: ChangePatch
  beforeSnapshot: ChangeSnapshot
  afterSnapshot: ChangeSnapshot
  meta: ChangeMeta
}

/** @deprecated Use Change instead */
export type Annotation = Change

export type ThemeContrast = 'soft' | 'normal' | 'strong'

export type ThemeDensity = 'compact' | 'comfortable'

export type ThemeRadiusScale = 'sharp' | 'normal' | 'soft'

export type ThemeMotion = 'normal' | 'reduced'

export type ThemeComponentConfig = {
  panel?: {
    width?: string
    radius?: string
  }
  field?: {
    height?: string
    radius?: string
  }
  dropdown?: {
    optionHeight?: string
  }
  toolbar?: {
    buttonGap?: string
  }
}

export type ResolvedThemeComponentConfig = {
  panel: {
    width: string
    radius: string
  }
  field: {
    height: string
    radius: string
  }
  dropdown: {
    optionHeight: string
  }
  toolbar: {
    buttonGap: string
  }
}


export type ThemeConfig = {
  /** @deprecated Use brand.accent. Kept as a legacy alias only. */
  accentColor?: string
  brand?: {
    accent?: string
  }
  surface?: {
    base?: string
  }
  contrast?: ThemeContrast
  density?: ThemeDensity
  radiusScale?: ThemeRadiusScale
  motion?: ThemeMotion
  typography?: {
    fontFamily?: string
    baseFontSize?: number
  }
  component?: ThemeComponentConfig
  zIndex?: number
}

export type ResolvedThemeConfig = {
  brand: {
    accent: string
  }
  surface: {
    base: string
  }
  contrast: ThemeContrast
  density: ThemeDensity
  radiusScale: ThemeRadiusScale
  motion: ThemeMotion
  typography: {
    fontFamily: string
    baseFontSize: number
  }
  component: ResolvedThemeComponentConfig
  zIndex: number
}

export type DerivedSemanticTokens = {
  surface: {
    canvas: string
    panel: string
    dropdown: string
    field: string
    hover: string
    hoverStrong: string
    active: string
    toolbar: string
  }
  text: {
    primary: string
    secondary: string
    tertiary: string
    muted: string
    faint: string
    inverse: string
  }
  border: {
    default: string
    subtle: string
    input: string
    hover: string
    accent: string
  }
  interactive: {
    accent: string
    accentSoft: string
    accentStrong: string
    focusRing: string
    selection: string
    controlHandle: string
    controlHandleBorder: string
    controlHandleShadow: string
  }
  feedback: {
    success: string
    successBg: string
    danger: string
    dangerBg: string
    purple: string
    purpleBg: string
  }
  overlay: {
    margin: string
    marginBg: string
    padding: string
    paddingStripe: string
    content: string
    move: string
    moveBg: string
    guide: string
    ruler: string
    labelText: string
    labelBg: string
  }
}

export type ComponentTokens = {
  panel: {
    width: string
    radius: string
    shadow: string
  }
  field: {
    height: string
    radius: string
  }
  button: {
    iconSize: string
    iconSizeSm: string
    textHeight: string
    textHeightMd: string
    textHeightLg: string
  }
  dropdown: {
    minWidth: string
    optionHeight: string
    optionHeightLg: string
  }
  toolbar: {
    buttonGap: string
    padding: string
  }
  tooltip: {
    maxWidth: string
  }
}

export type ThemeBuildResult = {
  config: ResolvedThemeConfig
  semantic: DerivedSemanticTokens
  components: ComponentTokens
}

export type InspectorTheme = ThemeConfig

export type ElementInspectorOptions = {
  enabled?: boolean
  defaultMode?: 'inspector' | 'design'
  theme?: InspectorTheme
  persistTheme?: boolean
  onInspect?: (info: InspectorInfo) => void
  onChangeAdd?: (change: Change) => void
  onChangeRemove?: (id: string) => void
}

export type ElementInspectorInstance = {
  setMode: (mode: InspectorMode) => void
  getMode: () => InspectorMode
  updateTheme: (theme: InspectorTheme, options?: { persist?: boolean }) => void
  getTheme: () => ResolvedThemeConfig
  resetTheme: (options?: { persist?: boolean }) => void
  destroy: () => void
  getCurrentInfo: () => InspectorInfo | null
  getChanges: () => Change[]
  clearChanges: () => void
  exportMarkdown: (detail?: OutputDetail) => string
  exportJSON: (detail?: OutputDetail) => string
}

// Figma capture global
declare global {
  interface Window {
    figma?: {
      captureForDesign: (options: { selector: string }) => Promise<unknown>
    }
  }
}
