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

export type InspectorMode = 'off' | 'inspector' | 'design' | 'move' | 'changes'

export type Change = {
  id: string
  type: 'annotation' | 'design' | 'move'
  element: HTMLElement
  info: InspectorInfo
  comment: string
  diffs?: StyleDiff[]
  timestamp: number
}

/** @deprecated Use Change instead */
export type Annotation = Change

export type InspectorTheme = {
  accentColor?: string
  zIndex?: number
}

export type ElementInspectorOptions = {
  enabled?: boolean
  defaultMode?: 'inspector' | 'design'
  theme?: InspectorTheme
  onInspect?: (info: InspectorInfo) => void
  onChangeAdd?: (change: Change) => void
  onChangeRemove?: (id: string) => void
}

export type ElementInspectorInstance = {
  setMode: (mode: InspectorMode) => void
  getMode: () => InspectorMode
  destroy: () => void
  getCurrentInfo: () => InspectorInfo | null
  getChanges: () => Change[]
  clearChanges: () => void
  exportMarkdown: () => string
  exportJSON: () => string
}
