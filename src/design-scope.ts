export type DesignScopeMode = 'single' | 'same-component' | 'same-slot' | 'same-group-type'

export type DesignScopeCandidate = {
  mode: DesignScopeMode
  label: string
  reason: string
  elements: HTMLElement[]
  boundary: HTMLElement | null
  confidence: 'high' | 'medium' | 'low'
  enabled: boolean
}

export type DesignScopeAnalysis = {
  recommendedMode: DesignScopeMode
  candidates: Record<DesignScopeMode, DesignScopeCandidate>
}

const MODE_LABELS: Record<DesignScopeMode, string> = {
  single: '当前元素',
  'same-component': '同组件实例',
  'same-slot': '同槽位',
  'same-group-type': '同组同类型',
}

const SEMANTIC_GROUP_CLASS_RE = /(?:^|[-_\s])(nav|navbar|navigation|footer|menu|menubar|tabs?|tablist|toolbar|pagination|pager|tags?|pills?|links?|actions?)(?:$|[-_\s])/i
const REPEAT_CLASS_RE = /(?:^|[-_\s])(item|row|card|entry|feed|post|note|tile|cell|option|result|article|product|bar)(?:$|[-_\s])/i
const GRID_CLASS_RE = /(?:^|[-_\s])(grid|grid-cols|cards?|masonry|waterfall|columns?|chart-container)(?:$|[-_\s])/i
const SLOT_CLASS_RE = /(?:^|[-_\s])(title|name|label|text|desc|description|subtitle|summary|caption|meta|time|date|author|footer|count|price|status)(?:$|[-_\s])/i
const CARD_CONTAINER_CLASS_RE = /(?:^|[-_\s])(feeds?|notes?|explore|masonry|waterfall|cards?|columns?|grid)(?:$|[-_\s])/i
const MEDIA_TAGS = new Set(['img', 'video', 'picture'])

function classText(element: HTMLElement): string {
  return Array.from(element.classList).join(' ')
}

function idClassText(element: HTMLElement): string {
  return `${element.id || ''} ${classText(element)}`
}

function visible(element: HTMLElement): boolean {
  if (!element.isConnected) return false
  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
  const rect = element.getBoundingClientRect()
  return rect.width > 0 && rect.height > 0
}

function children(element: HTMLElement): HTMLElement[] {
  return Array.from(element.children).filter((child): child is HTMLElement => child instanceof HTMLElement && visible(child))
}

function unique(elements: HTMLElement[]): HTMLElement[] {
  const seen = new Set<HTMLElement>()
  const result: HTMLElement[] = []
  for (const element of elements) {
    if (seen.has(element)) continue
    seen.add(element)
    result.push(element)
  }
  return result
}

function signature(element: HTMLElement): string {
  const stableClasses = Array.from(element.classList)
    .filter(name => !name.startsWith('ei-'))
    .filter(name => !/^hover:|^focus:|^active:|^data-\[|^aria-/.test(name))
    .sort()
    .slice(0, 8)
    .join('.')
  const role = element.getAttribute('role') || ''
  const slot = element.getAttribute('data-slot') || element.getAttribute('data-sidebar') || ''
  return [element.tagName.toLowerCase(), role, slot, stableClasses].join('|')
}

function similarRect(a: HTMLElement, b: HTMLElement, options: { allowHeightVariance?: boolean } = {}): boolean {
  const ar = a.getBoundingClientRect()
  const br = b.getBoundingClientRect()
  if (ar.width <= 0 || br.width <= 0 || ar.height <= 0 || br.height <= 0) return false
  const widthRatio = Math.min(ar.width, br.width) / Math.max(ar.width, br.width)
  const heightRatio = Math.min(ar.height, br.height) / Math.max(ar.height, br.height)
  return widthRatio >= 0.62 && (options.allowHeightVariance || heightRatio >= 0.48)
}

function isGridContainer(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element)
  const text = idClassText(element)
  return style.display === 'grid' || GRID_CLASS_RE.test(text)
}

function isSemanticGroupContainer(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase()
  const role = element.getAttribute('role') || ''
  const text = idClassText(element)
  if (tag === 'nav' || tag === 'footer' || tag === 'menu' || tag === 'ul' || tag === 'ol') return true
  if (tag === 'aside' && /(?:^|[-_\s])sidebar(?:$|[-_\s])/i.test(text)) return true
  if (/^(navigation|menu|menubar|tablist|toolbar|list)$/.test(role)) return true
  return SEMANTIC_GROUP_CLASS_RE.test(text)
}

function isGroupTypeTarget(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase()
  const role = element.getAttribute('role') || ''
  if (tag === 'a' || tag === 'button') return true
  return /^(button|link|menuitem|tab|option|treeitem)$/.test(role)
}

function findSemanticGroup(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement
  let group: HTMLElement | null = null
  while (current && current !== document.body) {
    if (isSemanticGroupContainer(current)) group = current
    current = current.parentElement
  }
  return group
}

function closestGroupTypeTarget(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element
  while (current && current !== document.body) {
    if (isGroupTypeTarget(current)) return current
    if (current.parentElement && isSemanticGroupContainer(current.parentElement)) return null
    current = current.parentElement
  }
  return null
}

function sameTableHeaderElements(element: HTMLElement): DesignScopeCandidate | null {
  const header = element.closest<HTMLElement>('th')
  if (!header) return null
  const row = header.parentElement
  if (!row || row.tagName.toLowerCase() !== 'tr') return null
  const headers = children(row).filter(child => child.tagName.toLowerCase() === 'th')
  if (headers.length <= 1) return null
  return candidate('same-group-type', `同组表头 ${headers.length} 个`, 'table-header-row', headers, row, 'high')
}

function dominantGroupTypeCandidate(group: HTMLElement): DesignScopeCandidate | null {
  const links = Array.from(group.querySelectorAll<HTMLElement>('a')).filter(candidate => candidate !== group && visible(candidate))
  if (links.length > 1) return candidate('same-group-type', `同组链接 ${links.length} 个`, 'semantic-container-links', links, group, 'high')

  const buttons = Array.from(group.querySelectorAll<HTMLElement>('button, [role="button"], [role="menuitem"], [role="tab"], [role="option"], [role="treeitem"]')).filter(candidate => candidate !== group && visible(candidate))
  if (buttons.length > 1) return candidate('same-group-type', `同组按钮 ${buttons.length} 个`, 'semantic-container-controls', buttons, group, 'high')

  return null
}

function isNestedInsideSemanticGroupControl(element: HTMLElement): boolean {
  const target = closestGroupTypeTarget(element)
  return Boolean(target && target !== element && findSemanticGroup(target))
}

function isDirectSemanticGroupControl(element: HTMLElement): boolean {
  return isGroupTypeTarget(element) && Boolean(findSemanticGroup(element))
}

function sameGroupTypeElements(element: HTMLElement): DesignScopeCandidate | null {
  const tableHeader = sameTableHeaderElements(element)
  if (tableHeader) return tableHeader

  if (isSemanticGroupContainer(element)) {
    const containerCandidate = dominantGroupTypeCandidate(element)
    if (containerCandidate) return containerCandidate
  }

  const target = closestGroupTypeTarget(element)
  if (!target || target !== element) return null
  const group = findSemanticGroup(target)
  if (!group) return null
  const role = target.getAttribute('role') || ''
  const tag = target.tagName.toLowerCase()
  const selector = role ? `[role="${CSS.escape(role)}"]` : tag
  const matches = Array.from(group.querySelectorAll<HTMLElement>(selector)).filter(candidate => (
    candidate !== group && visible(candidate) && candidate.tagName.toLowerCase() === tag
  ))
  const items = unique(matches)
  if (items.length <= 1) return null
  const name = tag === 'a' ? '链接' : tag === 'button' ? '按钮' : '控件'
  return candidate('same-group-type', `同组${name} ${items.length} 个`, 'semantic-control-group', items, group, 'high')
}

function elementHasMedia(element: HTMLElement): boolean {
  return Array.from(element.querySelectorAll<HTMLElement>('img, video, picture, canvas, svg')).some(node => {
    if (!visible(node)) return false
    const rect = node.getBoundingClientRect()
    return rect.width >= 24 && rect.height >= 24
  })
}

function textLength(element: HTMLElement): number {
  return (element.innerText || element.textContent || '').replace(/\s+/g, '').length
}

function isCardLikeElement(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect()
  if (rect.width < 120 || rect.height < 80) return false
  if (rect.width > Math.min(window.innerWidth * 0.55, 720)) return false
  const hasMedia = elementHasMedia(element)
  const hasText = textLength(element) >= 4
  if (!hasMedia || !hasText) return false
  const style = window.getComputedStyle(element)
  const hasCardSurface = style.borderRadius !== '0px' || style.overflow === 'hidden' || style.backgroundColor !== 'rgba(0, 0, 0, 0)'
  return hasCardSurface || children(element).length >= 2
}

function isCardCollectionContainer(element: HTMLElement): boolean {
  if (isGridContainer(element)) return true
  if (CARD_CONTAINER_CLASS_RE.test(idClassText(element))) return true
  const style = window.getComputedStyle(element)
  return style.columnCount !== 'auto' && Number(style.columnCount) > 1
}

function findCardCollectionAncestor(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element.parentElement
  while (current && current !== document.body) {
    const visibleChildren = children(current)
    const cardChildren = visibleChildren.filter(isCardLikeElement)
    if (cardChildren.length >= 3) {
      const widths = cardChildren.map(child => child.getBoundingClientRect().width).filter(width => width > 0)
      const minWidth = Math.min(...widths)
      const maxWidth = Math.max(...widths)
      const widthRatio = minWidth / maxWidth
      const distinctLefts = new Set(cardChildren.map(child => Math.round(child.getBoundingClientRect().left / 24) * 24))
      if (widthRatio >= 0.58 && (distinctLefts.size >= 2 || isCardCollectionContainer(current))) return current
    }
    current = current.parentElement
  }
  return null
}

function isXhsNoteItem(element: HTMLElement): boolean {
  return element.tagName.toLowerCase() === 'section' && element.classList.contains('note-item')
}

function findXhsNoteItem(element: HTMLElement): HTMLElement | null {
  return element.closest<HTMLElement>('section.note-item')
}

function findXhsFeedsContainer(element: HTMLElement): HTMLElement | null {
  return element.closest<HTMLElement>('#exploreFeeds.feeds-container, .feeds-container')
}

function xhsRepeatUnit(element: HTMLElement): { unit: HTMLElement; items: HTMLElement[]; boundary: HTMLElement } | null {
  const unit = findXhsNoteItem(element)
  if (!unit) return null
  const boundary = findXhsFeedsContainer(unit)
  if (!boundary) return null
  const items = Array.from(boundary.querySelectorAll<HTMLElement>('section.note-item')).filter(visible)
  if (items.length <= 1 || !items.includes(unit)) return null
  return { unit, items, boundary }
}

function hasLinkRowSiblings(element: HTMLElement): boolean {
  const parent = element.parentElement
  if (!parent) return false
  const role = element.getAttribute('role') || ''
  if (role !== 'link') return false
  const sign = element.getAttribute('sign') || ''
  const siblings = children(parent).filter(sibling => {
    if (sibling.getAttribute('role') !== role) return false
    if (sign && sibling.getAttribute('sign') !== sign) return false
    return similarRect(element, sibling, { allowHeightVariance: true })
  })
  return siblings.length > 1
}

function hasRepeatedControlRowSiblings(element: HTMLElement): boolean {
  const parent = element.parentElement
  if (!parent || isSemanticGroupContainer(parent)) return false
  const tag = element.tagName.toLowerCase()
  const role = element.getAttribute('role') || ''
  if (tag !== 'button' && role !== 'button' && role !== 'link') return false
  const siblings = children(parent).filter(sibling => (
    sibling.tagName === element.tagName &&
    (sibling.getAttribute('role') || '') === role &&
    similarRect(element, sibling, { allowHeightVariance: true }) &&
    sameChildStructure(element, sibling)
  ))
  return siblings.length > 1
}

function hasRepeatSemantics(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase()
  const role = element.getAttribute('role') || ''
  if (isXhsNoteItem(element)) return true
  if (tag === 'tr') return children(element).some(child => child.tagName.toLowerCase() === 'td')
  if (tag === 'li' || /^(listitem|row|article|option|treeitem)$/.test(role)) return true
  if (hasLinkRowSiblings(element)) return true
  if (hasRepeatedControlRowSiblings(element)) return true
  if (REPEAT_CLASS_RE.test(idClassText(element))) return true
  if (element.parentElement && isGridContainer(element.parentElement) && children(element).length > 0) return true
  if (element.parentElement && isCardCollectionContainer(element.parentElement) && isCardLikeElement(element)) return true
  return false
}

function sameTextDensity(a: HTMLElement, b: HTMLElement): boolean {
  const aText = textLength(a)
  const bText = textLength(b)
  if (aText === 0 && bText === 0) return true
  if (aText === 0 || bText === 0) return false
  return Math.min(aText, bText) / Math.max(aText, bText) >= 0.18
}

function sameChildStructure(a: HTMLElement, b: HTMLElement): boolean {
  const aChildren = children(a)
  const bChildren = children(b)
  if (aChildren.length === 0 && bChildren.length === 0) return sameTextDensity(a, b)
  if (aChildren.length === 0 || bChildren.length === 0) return false
  const ratio = Math.min(aChildren.length, bChildren.length) / Math.max(aChildren.length, bChildren.length)
  if (ratio < 0.5) return false
  const compareCount = Math.min(aChildren.length, bChildren.length, 4)
  let matched = 0
  for (let index = 0; index < compareCount; index += 1) {
    const aChild = aChildren[index]
    const bChild = bChildren[index]
    if (!aChild || !bChild) continue
    if (aChild.tagName === bChild.tagName) matched += 1
  }
  return matched / compareCount >= 0.5
}

function siblingRepeatItems(element: HTMLElement): HTMLElement[] {
  const parent = element.parentElement
  if (!parent) return []
  const siblings = children(parent)
  if (!siblings.includes(element)) return []
  const baseSignature = signature(element)
  const grid = isGridContainer(parent)
  const collectionParent = isCardLikeElement(element) ? findCardCollectionAncestor(element) : null
  const collectionSiblings = collectionParent ? children(collectionParent) : siblings
  const cardCollection = Boolean(collectionParent) || (isCardCollectionContainer(parent) && isCardLikeElement(element))
  const allowHeightVariance = grid || cardCollection || /masonry|waterfall|columns?/i.test(idClassText(parent))
  const matches = collectionSiblings.filter(sibling => {
    if (sibling === element) return true
    if (signature(sibling) === baseSignature && similarRect(element, sibling, { allowHeightVariance }) && sameChildStructure(element, sibling)) return true
    if (element.getAttribute('role') === 'link' && sibling.getAttribute('role') === 'link' && element.getAttribute('sign') === sibling.getAttribute('sign') && similarRect(element, sibling, { allowHeightVariance: true })) return true
    if (grid && sibling.parentElement === parent && sibling.tagName === element.tagName && similarRect(element, sibling, { allowHeightVariance }) && children(sibling).length > 0 && sameChildStructure(element, sibling)) return true
    if (cardCollection && sibling.tagName === element.tagName && isCardLikeElement(sibling) && similarRect(element, sibling, { allowHeightVariance: true }) && sameChildStructure(element, sibling)) return true
    return false
  })
  return matches.length > 1 ? matches : []
}

function findRepeatUnit(element: HTMLElement): { unit: HTMLElement; items: HTMLElement[]; boundary: HTMLElement } | null {
  const xhsRepeat = xhsRepeatUnit(element)
  if (xhsRepeat) return xhsRepeat

  let current: HTMLElement | null = element
  while (current && current !== document.body) {
    if (hasRepeatSemantics(current)) {
      const items = siblingRepeatItems(current)
      if (items.length > 1 && current.parentElement) return { unit: current, items, boundary: current.parentElement }
      if (current.parentElement && current.parentElement.tagName.toLowerCase() === 'ul') return null
    }
    current = current.parentElement
  }
  return null
}

function indexPath(root: HTMLElement, target: HTMLElement): number[] | null {
  const path: number[] = []
  let current: HTMLElement | null = target
  while (current && current !== root) {
    const parent: HTMLElement | null = current.parentElement
    if (!parent) return null
    const visibleChildren = children(parent)
    const index = visibleChildren.indexOf(current)
    if (index < 0) return null
    path.unshift(index)
    current = parent
  }
  return current === root ? path : null
}

function elementAtPath(root: HTMLElement, path: number[]): HTMLElement | null {
  let current: HTMLElement = root
  for (const index of path) {
    const next = children(current)[index]
    if (!next) return null
    current = next
  }
  return current
}

function slotScore(source: HTMLElement, candidate: HTMLElement): number {
  let score = 0
  if (source.tagName === candidate.tagName) score += 5
  if (source.getAttribute('role') && source.getAttribute('role') === candidate.getAttribute('role')) score += 3
  if (source.getAttribute('data-slot') && source.getAttribute('data-slot') === candidate.getAttribute('data-slot')) score += 5
  const sourceClassText = classText(source)
  const candidateClassText = classText(candidate)
  if (sourceClassText && sourceClassText === candidateClassText) score += 5
  const sourceClasses = new Set(Array.from(source.classList))
  const candidateClasses = new Set(Array.from(candidate.classList))
  const sharedClasses = Array.from(sourceClasses).filter(cls => candidateClasses.has(cls)).length
  score += Math.min(sharedClasses, 8)
  if (SLOT_CLASS_RE.test(idClassText(source)) && SLOT_CLASS_RE.test(idClassText(candidate))) score += 4
  const sr = source.getBoundingClientRect()
  const cr = candidate.getBoundingClientRect()
  const sameSide = Math.abs((sr.left + sr.width / 2) - (cr.left + cr.width / 2)) <= Math.max(sr.width, cr.width, 120)
  if (sameSide) score += 2
  return score
}

function isNumericLikeText(text: string): boolean {
  const compact = text.replace(/\s+/g, '')
  return compact.length > 0 && /^[\d,.万千kK+]+$/.test(compact)
}

function isMixedMetricValue(element: HTMLElement): boolean {
  return /(?:^|[-_\s])(stat|metric|kpi|value|number)(?:$|[-_\s])/i.test(idClassText(element))
}

function knownSlotSelector(element: HTMLElement): string | null {
  const text = (element.innerText || element.textContent || '').trim()
  if (findXhsNoteItem(element)) {
    if (element.closest('.title')) return '.title span, .title'
    if (element.closest('.author')) return '.author .name, .author span, .author'
    if (element.closest('.like-wrapper') || element.classList.contains('count') || isNumericLikeText(text)) return '.like-wrapper .count, .count'
    if (element.classList.contains('footer')) return '.footer'
    if (element.closest('.cover')) return '.cover'
    return null
  }

  const mailRow = element.closest<HTMLElement>('[role="link"][sign="letter"]')
  if (mailRow) {
    if (element.closest('[sign="start-from"]') || element.classList.contains('nui-user')) return '[sign="start-from"] .nui-user, .nui-user'
    if (element.closest('.il0')) {
      if (element.classList.contains('da0') || element.closest('.da0')) return '.il0 .da0'
      if (element.classList.contains('dd0') || element.closest('.dd0')) return '.il0 .dd0'
      if (element.classList.contains('bL0') || element.closest('.bL0')) return '.il0 .bL0'
    }
    if (element.closest('[sign="checkbox"]')) return '[sign="checkbox"]'
    if (element.closest('[sign="flag"]')) return '[sign="flag"]'
    if (element.closest('[sign="logo"]')) return '[sign="logo"]'
    if (element.closest('[sign="trash"]')) return '[sign="trash"]'
    if (element.closest('[sign="defermanage"]')) return '[sign="defermanage"]'
    if (element.closest('[sign="tagmanage"]')) return '[sign="tagmanage"]'
    if (element.closest('[sign="aimanage"]')) return '[sign="aimanage"]'
    if (element.classList.contains('eO0') || element.closest('.eO0')) return '.eO0'
    if (element.classList.contains('hV0') || element.closest('.hV0')) return '.hV0'
    if (element.classList.contains('nl0') || element.closest('.nl0')) return '.nl0'
  }

  return null
}

function bestKnownSlotMatch(source: HTMLElement, root: HTMLElement): HTMLElement | null {
  const selector = knownSlotSelector(source)
  if (!selector) return null
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(selector)).filter(visible)
  return candidates[0] ?? null
}

function slotRole(element: HTMLElement): 'media' | 'title' | 'footer' | 'author' | 'meta' | 'text' | 'unknown' {
  const tag = element.tagName.toLowerCase()
  if (MEDIA_TAGS.has(tag)) return 'media'
  const rect = element.getBoundingClientRect()
  const text = (element.innerText || element.textContent || '').trim()
  const cls = idClassText(element)
  if (isMixedMetricValue(element)) return 'title'
  if (element.closest('.like-wrapper') || /like|collect|comment|interact|meta|time|date|count|stats/i.test(cls) || isNumericLikeText(text)) return 'meta'
  if (/footer|action/i.test(cls)) return 'footer'
  if (/author|user|avatar|nickname|name/i.test(cls)) return 'author'
  if (/title|headline|subject|desc|content/i.test(cls)) return /desc|content/i.test(cls) ? 'text' : 'title'
  if (text.length > 0) {
    const parent = element.parentElement
    const card = parent ? findRepeatUnit(element)?.unit : null
    const cardRect = card?.getBoundingClientRect()
    if (cardRect) {
      const y = rect.top - cardRect.top
      if (y > cardRect.height * 0.55) return 'footer'
      if (rect.height >= 18 || text.length >= 8) return 'title'
    }
    return 'text'
  }
  return 'unknown'
}

function bestRoleMatch(source: HTMLElement, root: HTMLElement): HTMLElement | null {
  const role = slotRole(source)
  if (role === 'unknown') return null
  const candidates = Array.from(root.querySelectorAll<HTMLElement>(source.tagName.toLowerCase())).filter(candidate => visible(candidate) && slotRole(candidate) === role)
  if (!candidates.length) return null
  return candidates.sort((a, b) => slotScore(source, b) - slotScore(source, a))[0] ?? null
}

function sameSlotElements(element: HTMLElement, repeat: { unit: HTMLElement; items: HTMLElement[]; boundary: HTMLElement }): DesignScopeCandidate | null {
  if (element === repeat.unit) return null
  const knownSelector = knownSlotSelector(element)
  const path = indexPath(repeat.unit, element)
  if (!knownSelector && !path) return null
  const matches: HTMLElement[] = []
  for (const item of repeat.items) {
    const knownMatch = bestKnownSlotMatch(element, item)
    if (knownMatch) {
      matches.push(knownMatch)
      continue
    }
    const direct = path ? elementAtPath(item, path) : null
    if (direct && slotRole(element) === slotRole(direct) && slotScore(element, direct) >= 5) {
      matches.push(direct)
      continue
    }
    const roleMatch = bestRoleMatch(element, item)
    if (roleMatch && slotRole(element) === slotRole(roleMatch) && slotScore(element, roleMatch) >= 7) {
      matches.push(roleMatch)
      continue
    }
    const candidates = Array.from(item.querySelectorAll<HTMLElement>(element.tagName.toLowerCase())).filter(visible)
    const best = candidates.filter(candidate => slotRole(element) === slotRole(candidate)).sort((a, b) => slotScore(element, b) - slotScore(element, a))[0]
    if (best && slotScore(element, best) >= 10) matches.push(best)
  }
  const items = unique(matches)
  if (items.length <= 1) return null
  return candidate('same-slot', `同槽位 ${items.length} 个`, 'repeat-unit-slot', items, repeat.boundary, 'medium')
}

function sameComponentElements(element: HTMLElement, repeat: { unit: HTMLElement; items: HTMLElement[]; boundary: HTMLElement }): DesignScopeCandidate | null {
  if (element !== repeat.unit) return null
  if (repeat.items.length <= 1) return null
  return candidate('same-component', `同组件实例 ${repeat.items.length} 个`, 'repeat-unit-component', repeat.items, repeat.boundary, 'medium')
}

function ancestorRepeatedContainerSlotCandidate(element: HTMLElement): DesignScopeCandidate | null {
  let current: HTMLElement | null = element.parentElement
  while (current && current !== document.body) {
    const parent = current.parentElement
    if (parent) {
      const repeated = repeatedChildrenCandidate(parent)
      if (repeated?.elements.includes(current)) {
        return sameSlotElements(element, { unit: current, items: repeated.elements, boundary: repeated.boundary ?? parent })
      }
    }
    current = current.parentElement
  }
  return null
}

function repeatedChildrenCandidate(element: HTMLElement): DesignScopeCandidate | null {
  if (isSemanticGroupContainer(element)) return null
  const text = idClassText(element)
  const isExplicitRepeatedContainer = isGridContainer(element) || /(?:^|[-_\s])(stats-bar|chart-container|scope-token-grid|scope-card-grid|features-grid|install-grid)(?:$|[-_\s])/i.test(text)
  if (!isExplicitRepeatedContainer) return null
  const directChildren = children(element)
  if (directChildren.length <= 1) return null
  const firstChild = directChildren[0]
  if (!firstChild) return null
  const repeated = directChildren.filter(child => hasRepeatSemantics(child) || sameChildStructure(firstChild, child))
  if (repeated.length <= 1) return null
  const first = repeated[0]
  if (!first) return null
  const items = repeated.filter(child => child.tagName === first.tagName && similarRect(first, child, { allowHeightVariance: isGridContainer(element) }) && sameChildStructure(first, child))
  if (items.length <= 1) return null
  return candidate('same-component', `同组件实例 ${items.length} 个`, 'repeated-container-children', items, element, 'medium')
}

function nestedRepeatedChildrenCandidate(element: HTMLElement): DesignScopeCandidate | null {
  if (isSemanticGroupContainer(element)) return null
  const directChildren = children(element)
  if (directChildren.length !== 1) return null
  const child = directChildren[0]
  if (!child) return null
  const nested = repeatedChildrenCandidate(child)
  if (!nested) return null
  return candidate('same-component', `同组件实例 ${nested.elements.length} 个`, 'nested-repeated-container-children', nested.elements, child, 'medium')
}

function candidate(mode: DesignScopeMode, label: string, reason: string, elements: HTMLElement[], boundary: HTMLElement | null, confidence: DesignScopeCandidate['confidence']): DesignScopeCandidate {
  const normalized = unique(elements.filter(visible))
  return {
    mode,
    label,
    reason,
    elements: normalized,
    boundary,
    confidence,
    enabled: normalized.length > 1 || mode === 'single',
  }
}

function disabledCandidate(mode: DesignScopeMode, element: HTMLElement): DesignScopeCandidate {
  return {
    mode,
    label: MODE_LABELS[mode],
    reason: 'unavailable',
    elements: [element],
    boundary: null,
    confidence: 'low',
    enabled: mode === 'single',
  }
}

export function analyzeDesignScope(element: HTMLElement): DesignScopeAnalysis {
  const single = candidate('single', '当前元素', 'single-element', [element], element.parentElement, 'high')
  const candidates: Record<DesignScopeMode, DesignScopeCandidate> = {
    single,
    'same-component': disabledCandidate('same-component', element),
    'same-slot': disabledCandidate('same-slot', element),
    'same-group-type': disabledCandidate('same-group-type', element),
  }

  const repeat = findRepeatUnit(element)
  if (repeat) {
    const sameComponent = sameComponentElements(element, repeat)
    if (sameComponent) candidates['same-component'] = sameComponent
    const sameSlot = sameSlotElements(element, repeat)
    if (sameSlot) candidates['same-slot'] = sameSlot
  }

  const groupType = sameGroupTypeElements(element)
  if (groupType) candidates['same-group-type'] = groupType

  if (!candidates['same-slot'].enabled) {
    const containerSlot = ancestorRepeatedContainerSlotCandidate(element)
    if (containerSlot) candidates['same-slot'] = containerSlot
  }

  if (!candidates['same-component'].enabled) {
    const childComponents = repeatedChildrenCandidate(element) ?? nestedRepeatedChildrenCandidate(element)
    if (childComponents) candidates['same-component'] = childComponents
  }

  let recommendedMode: DesignScopeMode = 'single'
  if (isDirectSemanticGroupControl(element) && candidates['same-group-type'].enabled && candidates['same-group-type'].confidence === 'high') recommendedMode = 'same-group-type'
  else if (candidates['same-component'].enabled) recommendedMode = 'same-component'
  else if (isNestedInsideSemanticGroupControl(element) && !findXhsNoteItem(element)) recommendedMode = 'single'
  else if (candidates['same-slot'].enabled) recommendedMode = 'same-slot'
  else if (candidates['same-group-type'].enabled && candidates['same-group-type'].confidence === 'high') recommendedMode = 'same-group-type'

  return { recommendedMode, candidates }
}
