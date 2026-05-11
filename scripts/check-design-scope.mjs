import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const outDir = resolve(root, '.tmp/design-scope-check')
mkdirSync(outDir, { recursive: true })
execFileSync('npx', [
  'tsc',
  'src/design-scope.ts',
  '--target', 'ES2022',
  '--module', 'ES2022',
  '--lib', 'ES2022,DOM,DOM.Iterable',
  '--skipLibCheck',
  '--outDir', outDir,
  '--declaration', 'false',
  '--noEmit', 'false',
], { cwd: root, stdio: 'inherit' })

class MiniClassList {
  constructor(owner) {
    this.owner = owner
  }

  [Symbol.iterator]() {
    return this.values()[Symbol.iterator]()
  }

  values() {
    return (this.owner.attributes.class || '').split(/\s+/).filter(Boolean)
  }

  contains(name) {
    return this.values().includes(name)
  }
}

class MiniElement {
  constructor(tagName, attrs = {}, options = {}) {
    this.tagName = tagName.toUpperCase()
    this.attributes = { ...attrs }
    this.id = attrs.id || ''
    this.children = []
    this.parentElement = null
    this.classList = new MiniClassList(this)
    this.textContent = options.text || ''
    this.innerText = options.text || ''
    this.rect = options.rect || { left: 0, top: 0, width: 100, height: 32 }
    this.style = {
      display: options.display || 'block',
      visibility: 'visible',
      opacity: '1',
      borderRadius: options.borderRadius || '0px',
      overflow: options.overflow || 'visible',
      backgroundColor: options.backgroundColor || 'rgba(0, 0, 0, 0)',
      columnCount: options.columnCount || 'auto',
    }
    this.isConnected = true
  }

  append(...nodes) {
    for (const node of nodes) {
      node.parentElement = this
      this.children.push(node)
    }
    return this
  }

  getAttribute(name) {
    return this.attributes[name] ?? null
  }

  setAttribute(name, value) {
    this.attributes[name] = value
    if (name === 'id') this.id = value
  }

  getBoundingClientRect() {
    return this.rect
  }

  querySelectorAll(selector) {
    const selectors = selector.split(',').map(item => item.trim()).filter(Boolean)
    const result = []
    const walk = (node) => {
      for (const child of node.children) {
        if (selectors.some(part => matchesSelector(child, part))) result.push(child)
        walk(child)
      }
    }
    walk(this)
    return result
  }

  closest(selector) {
    let current = this
    while (current) {
      if (matchesSelector(current, selector)) return current
      current = current.parentElement
    }
    return null
  }
}

function matchesSelector(element, selector) {
  if (!selector) return false
  if (selector.includes(' ')) {
    const parts = selector.split(/\s+/).filter(Boolean)
    let current = element
    for (let index = parts.length - 1; index >= 0; index -= 1) {
      while (current && !matchesSelector(current, parts[index])) current = current.parentElement
      if (!current) return false
      current = current.parentElement
    }
    return true
  }
  if (selector.includes(',')) return selector.split(',').some(part => matchesSelector(element, part.trim()))
  if (selector.startsWith('#')) return element.id === selector.slice(1)
  if (selector.startsWith('.')) return element.classList.contains(selector.slice(1))
  const attrMatch = selector.match(/^\[([^=\]]+)="?([^"\]]+)"?\]$/)
  if (attrMatch) return element.getAttribute(attrMatch[1]) === attrMatch[2]
  const tagClassMatch = selector.match(/^([a-z0-9]+)\.([A-Za-z0-9_-]+)$/i)
  if (tagClassMatch) return element.tagName.toLowerCase() === tagClassMatch[1].toLowerCase() && element.classList.contains(tagClassMatch[2])
  return element.tagName.toLowerCase() === selector.toLowerCase()
}

function el(tagName, attrs = {}, options = {}, children = []) {
  return new MiniElement(tagName, attrs, options).append(...children)
}

function installDom(body) {
  globalThis.HTMLElement = MiniElement
  globalThis.document = { body }
  globalThis.window = {
    innerWidth: 1440,
    getComputedStyle: (node) => node.style,
  }
  globalThis.CSS = { escape: (value) => String(value).replace(/"/g, '\\"') }
}

function setConnected(node, value = true) {
  node.isConnected = value
  for (const child of node.children) setConnected(child, value)
}

function expectCase(name, rootNode, target, expectedMode, expectedCount, expectedEnabled = true) {
  installDom(rootNode)
  setConnected(rootNode)
  const analysis = globalThis.__analyzeDesignScope(target)
  const candidate = analysis.candidates[expectedMode]
  const count = candidate.elements.length
  if (analysis.recommendedMode !== expectedMode || candidate.enabled !== expectedEnabled || count !== expectedCount) {
    throw new Error(`${name}: expected ${expectedMode}/${expectedCount}, got ${analysis.recommendedMode}/${count} enabled=${candidate.enabled}`)
  }
  console.log(`✓ ${name}`)
}

const compiledModuleUrl = new URL(`file://${resolve(outDir, 'design-scope.js')}`)
const module = await import(compiledModuleUrl.href)
globalThis.__analyzeDesignScope = module.analyzeDesignScope

function gridCardsFixture() {
  const cards = Array.from({ length: 4 }, (_, index) => el('div', { class: 'overflow-hidden rounded-xl border bg-card' }, { rect: { left: 20 + index * 240, top: 20, width: 220, height: 180 }, borderRadius: '12px', backgroundColor: 'rgb(17, 17, 19)' }, [
    el('div', { class: 'p-4' }, { rect: { left: 20 + index * 240, top: 20, width: 220, height: 180 } }, [
      el('h3', { class: 'text-sm font-medium' }, { text: `Card ${index + 1}`, rect: { left: 32 + index * 240, top: 36, width: 120, height: 20 } }),
      el('p', { class: 'text-muted-foreground' }, { text: 'Description', rect: { left: 32 + index * 240, top: 64, width: 160, height: 20 } }),
    ]),
  ]))
  const grid = el('div', { class: 'grid gap-3 md:grid-cols-2 xl:grid-cols-4' }, { display: 'grid', rect: { left: 20, top: 20, width: 960, height: 180 } }, cards)
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 900 } }, [grid]), target: cards[0], title: cards[0].children[0].children[0] }
}

function radiusGridFixture() {
  const items = Array.from({ length: 4 }, (_, index) => el('div', { class: 'border bg-muted/40 p-4 scope-token-card' }, { rect: { left: 20 + index * 190, top: 260, width: 170, height: 112 }, borderRadius: `${index * 6}px`, backgroundColor: 'rgb(30, 30, 32)' }, [
    el('div', { class: 'text-sm font-medium scope-token-name' }, { text: `Radius ${index}`, rect: { left: 32 + index * 190, top: 276, width: 80, height: 20 } }),
    el('div', { class: 'text-xs text-muted-foreground scope-token-value' }, { text: 'Token sample', rect: { left: 32 + index * 190, top: 304, width: 120, height: 18 } }),
  ]))
  const section = el('section', { class: 'space-y-4' }, { rect: { left: 12, top: 200, width: 900, height: 240 } }, [
    el('h2', { class: 'text-lg font-semibold' }, { text: 'Radius', rect: { left: 20, top: 210, width: 80, height: 24 } }),
    el('p', { class: 'text-muted-foreground' }, { text: 'Radius tokens control the shape of surfaces.', rect: { left: 20, top: 238, width: 300, height: 20 } }),
    el('div', { class: 'grid gap-3 sm:grid-cols-2 lg:grid-cols-4 scope-token-grid' }, { display: 'grid', rect: { left: 20, top: 260, width: 760, height: 112 } }, items),
  ])
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 900 } }, [section]), target: items[0], itemTitle: items[0].children[0], itemValue: items[0].children[1], title: section.children[0] }
}

function navLinksFixture() {
  const columns = Array.from({ length: 3 }, (_, columnIndex) => {
    const links = Array.from({ length: 3 }, (_, rowIndex) => el('a', { href: '#', class: 'footer-link' }, { text: `Link ${columnIndex + 1}-${rowIndex + 1}`, rect: { left: 20 + columnIndex * 160, top: 530 + rowIndex * 28, width: 110, height: 20 } }))
    return el('div', { class: 'footer-column' }, { rect: { left: 20 + columnIndex * 160, top: 500, width: 140, height: 120 } }, [
      el('div', { class: 'footer-title' }, { text: `Column ${columnIndex + 1}`, rect: { left: 20 + columnIndex * 160, top: 500, width: 110, height: 20 } }),
      el('div', { class: 'footer-links' }, { rect: { left: 20 + columnIndex * 160, top: 530, width: 120, height: 90 } }, links),
    ])
  })
  const footer = el('footer', { class: 'footer links' }, { rect: { left: 0, top: 480, width: 520, height: 180 } }, columns)
  const firstLink = columns[0].children[1].children[0]
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 900 } }, [footer]), target: firstLink, footer }
}

function statsFixture() {
  const cards = Array.from({ length: 4 }, (_, index) => el('div', { class: 'stat-card' }, { rect: { left: 20 + index * 180, top: 40, width: 160, height: 120 }, borderRadius: '16px', backgroundColor: 'rgb(255, 255, 255)' }, [
    el('div', { class: 'stat-value' }, { text: ['3', '1', '4', 'Phase 1'][index], rect: { left: 36 + index * 180, top: 56, width: 100, height: 32 } }),
    el('div', { class: 'stat-label' }, { text: ['官方入口', '共享 Core', '公开导出', '当前阶段'][index], rect: { left: 36 + index * 180, top: 96, width: 110, height: 20 } }),
    el('div', { class: `stat-change ${index === 2 ? 'down' : 'up'}` }, { text: ['Web / Extension / Desktop', 'mountElementInspector', '. / web / extension / desktop', '宿主能力已收口'][index], rect: { left: 36 + index * 180, top: 124, width: 130, height: 20 } }),
  ]))
  const stats = el('div', { class: 'stats-bar' }, { display: 'grid', rect: { left: 20, top: 40, width: 720, height: 120 } }, cards)
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 900 } }, [stats]), container: stats, card: cards[0], value: cards[0].children[0] }
}

function tableFixture() {
  const rows = Array.from({ length: 4 }, (_, index) => el('tr', {}, { rect: { left: 20, top: 100 + index * 64, width: 720, height: 64 } }, [
    el('td', {}, { rect: { left: 20, top: 100 + index * 64, width: 260, height: 64 } }, [
      el('div', { class: 'user-cell' }, { rect: { left: 36, top: 112 + index * 64, width: 220, height: 40 } }, [
        el('div', { class: 'avatar' }, { text: ['JD', 'SM', 'TC', 'EJ'][index], rect: { left: 36, top: 114 + index * 64, width: 36, height: 36 }, borderRadius: '999px', backgroundColor: 'rgb(40, 120, 255)' }),
        el('div', { class: 'user-info' }, { rect: { left: 84, top: 110 + index * 64, width: 140, height: 44 } }, [
          el('span', { class: 'user-name' }, { text: ['John Doe', 'Sarah Miller', 'Tom Chen', 'Emily Jones'][index], rect: { left: 84, top: 110 + index * 64, width: 120, height: 20 } }),
          el('span', { class: 'user-email' }, { text: ['john@example.com', 'sarah@example.com', 'tom@example.com', 'emily@example.com'][index], rect: { left: 84, top: 134 + index * 64, width: 150, height: 20 } }),
        ]),
      ]),
    ]),
    el('td', {}, { rect: { left: 280, top: 100 + index * 64, width: 150, height: 64 } }, [
      el('span', { class: 'badge info' }, { text: ['管理员', '编辑者', '查看者', '开发者'][index], rect: { left: 300, top: 120 + index * 64, width: 64, height: 24 }, borderRadius: '999px', backgroundColor: 'rgb(219, 234, 254)' }),
    ]),
    el('td', {}, { rect: { left: 430, top: 100 + index * 64, width: 150, height: 64 } }, [
      el('span', { class: `badge ${index === 2 ? 'warning' : index === 3 ? 'error' : 'success'}` }, { text: ['在线', '在线', '离开', '离线'][index], rect: { left: 450, top: 120 + index * 64, width: 56, height: 24 }, borderRadius: '999px', backgroundColor: 'rgb(209, 250, 229)' }),
    ]),
    el('td', {}, { text: ['2 分钟前', '1 小时前', '3 小时前', '2 天前'][index], rect: { left: 580, top: 100 + index * 64, width: 140, height: 64 } }),
  ]))
  const headerRow = el('tr', {}, { rect: { left: 20, top: 60, width: 720, height: 40 } }, [
    el('th', {}, { text: '用户', rect: { left: 20, top: 60, width: 260, height: 40 } }),
    el('th', {}, { text: '角色', rect: { left: 280, top: 60, width: 150, height: 40 } }),
    el('th', {}, { text: '状态', rect: { left: 430, top: 60, width: 150, height: 40 } }),
    el('th', {}, { text: '最近活跃', rect: { left: 580, top: 60, width: 140, height: 40 } }),
  ])
  const thead = el('thead', {}, { rect: { left: 20, top: 60, width: 720, height: 40 } }, [headerRow])
  const tbody = el('tbody', {}, { rect: { left: 20, top: 100, width: 720, height: 256 } }, rows)
  const table = el('table', {}, { rect: { left: 20, top: 60, width: 720, height: 320 } }, [thead, tbody])
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 900 } }, [table]), header: headerRow.children[0], row: rows[0], name: rows[0].children[0].children[0].children[1].children[0], email: rows[0].children[0].children[0].children[1].children[1], status: rows[0].children[2].children[0] }
}

function activityFixture() {
  const rows = Array.from({ length: 3 }, (_, index) => el('button', { class: 'group relative flex w-full items-start gap-3 rounded-lg' }, { rect: { left: 20, top: 40 + index * 72, width: 520, height: 60 }, borderRadius: '8px' }, [
    el('span', { class: 'avatar' }, { text: '', rect: { left: 32, top: 50 + index * 72, width: 32, height: 32 }, borderRadius: '999px', backgroundColor: 'rgb(60,60,60)' }),
    el('span', { class: 'min-w-0 flex-1' }, { rect: { left: 76, top: 48 + index * 72, width: 340, height: 44 } }, [
      el('span', { class: 'font-medium title' }, { text: `Activity title ${index + 1}`, rect: { left: 76, top: 48 + index * 72, width: 140, height: 20 } }),
      el('span', { class: 'text-muted-foreground subtitle' }, { text: 'Updated settings', rect: { left: 76, top: 72 + index * 72, width: 140, height: 18 } }),
    ]),
    el('time', { class: 'text-xs time' }, { text: `${index + 1}h`, rect: { left: 460, top: 50 + index * 72, width: 32, height: 18 } }),
  ]))
  const feed = el('div', { class: 'feed space-y-2' }, { rect: { left: 20, top: 40, width: 520, height: 220 } }, rows)
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 900 } }, [feed]), row: rows[0], title: rows[0].children[1].children[0], time: rows[0].children[2] }
}

function xhsFixture() {
  const notes = Array.from({ length: 3 }, (_, index) => el('section', { class: 'note-item' }, { rect: { left: 20 + index * 220, top: 660, width: 194, height: 280 }, borderRadius: '12px', backgroundColor: 'rgb(255,255,255)' }, [
    el('a', { class: 'cover' }, { rect: { left: 20 + index * 220, top: 660, width: 194, height: 190 }, borderRadius: '12px' }, [
      el('img', { class: 'cover-img' }, { rect: { left: 20 + index * 220, top: 660, width: 194, height: 190 } }),
    ]),
    el('div', { class: 'footer' }, { rect: { left: 20 + index * 220, top: 858, width: 194, height: 72 } }, [
      el('a', { class: 'title' }, { rect: { left: 32 + index * 220, top: 864, width: 170, height: 20 } }, [
        el('span', {}, { text: `小红书标题 ${index + 1}`, rect: { left: 32 + index * 220, top: 864, width: 150, height: 20 } }),
      ]),
      el('div', { class: 'author' }, { rect: { left: 32 + index * 220, top: 896, width: 120, height: 20 } }, [
        el('span', { class: 'name' }, { text: `作者 ${index + 1}`, rect: { left: 56 + index * 220, top: 896, width: 72, height: 20 } }),
      ]),
      el('div', { class: 'like-wrapper' }, { rect: { left: 168 + index * 220, top: 896, width: 44, height: 20 } }, [
        el('span', { class: 'count' }, { text: `${80 + index}`, rect: { left: 190 + index * 220, top: 896, width: 24, height: 20 } }),
      ]),
    ]),
  ]))
  const feeds = el('div', { id: 'exploreFeeds', class: 'feeds-container' }, { rect: { left: 20, top: 660, width: 680, height: 280 } }, notes)
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 1200 } }, [feeds]), note: notes[0], title: notes[0].children[1].children[0].children[0], author: notes[0].children[1].children[1].children[0], count: notes[0].children[1].children[2].children[0] }
}

function chartFixture() {
  const rows = [
    ['Web', 'Ready'],
    ['Extension', 'Build'],
    ['Desktop', 'Stub'],
    ['Install', 'Next'],
  ].map(([label, value], index) => el('div', { class: 'chart-bar' }, { rect: { left: 20, top: 40 + index * 42, width: 720, height: 26 } }, [
    el('span', { class: 'chart-label' }, { text: label, rect: { left: 20, top: 40 + index * 42, width: 90, height: 24 } }),
    el('div', { class: 'chart-track' }, { rect: { left: 130, top: 48 + index * 42, width: 480, height: 10 } }, [
      el('div', { class: 'chart-fill' }, { rect: { left: 130, top: 48 + index * 42, width: 360 - index * 40, height: 10 }, borderRadius: '999px', backgroundColor: 'rgb(0, 141, 255)' }),
    ]),
    el('span', { class: 'chart-value' }, { text: value, rect: { left: 630, top: 40 + index * 42, width: 80, height: 24 } }),
  ]))
  const container = el('div', { class: 'chart-container' }, { rect: { left: 20, top: 40, width: 720, height: 170 } }, rows)
  const body = el('div', { class: 'card-body' }, { rect: { left: 0, top: 20, width: 760, height: 220 } }, [container])
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 900 } }, [body]), cardBody: body, container, row: rows[0], label: rows[0].children[0], value: rows[0].children[2] }
}

function sidebarFixture() {
  const items = ['Overview', 'Machines', 'Agents', 'Settings', 'Billing'].map((name, index) => el('button', { class: 'scope-sidebar-item', type: 'button' }, { rect: { left: 20, top: 420 + index * 36, width: 180, height: 32 }, borderRadius: '8px' }, [
    el('span', { class: 'scope-sidebar-dot' }, { rect: { left: 32, top: 430 + index * 36, width: 8, height: 8 }, borderRadius: '999px', backgroundColor: 'rgb(100,100,100)' }),
    el('span', { class: 'scope-sidebar-label' }, { text: name, rect: { left: 52, top: 424 + index * 36, width: 88, height: 20 } }),
  ]))
  const group = el('div', { class: 'scope-sidebar-group', role: 'list' }, { rect: { left: 20, top: 420, width: 180, height: 180 } }, items)
  const sidebar = el('aside', { class: 'scope-sidebar', 'aria-label': 'Scope sidebar sample' }, { rect: { left: 12, top: 400, width: 204, height: 220 } }, [group])
  return { body: el('body', {}, { rect: { left: 0, top: 0, width: 1440, height: 900 } }, [sidebar]), sidebar, item: items[0], label: items[0].children[1] }
}

const grid = gridCardsFixture()
expectCase('grid card container defaults to same-component', grid.body, grid.target, 'same-component', 4)
expectCase('grid card title defaults to same-slot', grid.body, grid.title, 'same-slot', 4)

const stats = statsFixture()
expectCase('stats grid container defaults to child same-components', stats.body, stats.container, 'same-component', 4)
expectCase('stat card defaults to same-component', stats.body, stats.card, 'same-component', 4)
expectCase('stat value defaults to same-slot', stats.body, stats.value, 'same-slot', 4)

const radius = radiusGridFixture()
expectCase('plain radius grid item defaults to same-component', radius.body, radius.target, 'same-component', 4)
expectCase('radius grid item title defaults to same-slot', radius.body, radius.itemTitle, 'same-slot', 4)
expectCase('radius grid item description defaults to same-slot', radius.body, radius.itemValue, 'same-slot', 4)
expectCase('section title does not leak into grid slots', radius.body, radius.title, 'single', 1)

const nav = navLinksFixture()
expectCase('nested footer link defaults to whole-footer same-group-type', nav.body, nav.target, 'same-group-type', 9)
expectCase('footer container defaults to internal same-group links', nav.body, nav.footer, 'same-group-type', 9)

const table = tableFixture()
expectCase('table header defaults to same-group-type', table.body, table.header, 'same-group-type', 4)
expectCase('table row defaults to same-component', table.body, table.row, 'same-component', 4)
expectCase('table user name defaults to same-slot', table.body, table.name, 'same-slot', 4)
expectCase('table user email defaults to same-slot', table.body, table.email, 'same-slot', 4)
expectCase('table status badge defaults to same-slot', table.body, table.status, 'same-slot', 4)

const activity = activityFixture()
expectCase('activity row container defaults to same-component', activity.body, activity.row, 'same-component', 3)
expectCase('activity title defaults to same-slot', activity.body, activity.title, 'same-slot', 3)
expectCase('activity time defaults to same-slot', activity.body, activity.time, 'same-slot', 3)

const xhs = xhsFixture()
expectCase('xhs note container defaults to same-component', xhs.body, xhs.note, 'same-component', 3)
expectCase('xhs title defaults to same-slot over link group', xhs.body, xhs.title, 'same-slot', 3)
expectCase('xhs author defaults to same-slot', xhs.body, xhs.author, 'same-slot', 3)
expectCase('xhs count defaults to same-slot', xhs.body, xhs.count, 'same-slot', 3)

const chart = chartFixture()
expectCase('chart body defaults to child chart rows', chart.body, chart.cardBody, 'same-component', 4)
expectCase('chart container defaults to child chart rows', chart.body, chart.container, 'same-component', 4)
expectCase('chart row defaults to same-component', chart.body, chart.row, 'same-component', 4)
expectCase('chart label defaults to same-slot', chart.body, chart.label, 'same-slot', 4)
expectCase('chart value defaults to same-slot', chart.body, chart.value, 'same-slot', 4)

const sidebar = sidebarFixture()
expectCase('sidebar container defaults to same-group controls', sidebar.body, sidebar.sidebar, 'same-group-type', 5)
expectCase('sidebar item defaults to same-group controls', sidebar.body, sidebar.item, 'same-group-type', 5)
expectCase('sidebar label leaf remains directly selectable', sidebar.body, sidebar.label, 'single', 1)
