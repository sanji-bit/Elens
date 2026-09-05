import { beforeAll, describe, expect, test } from 'bun:test'
import { getInspectableElementFromEvent, getInspectableElementFromPoint } from '../src/utils'

const HTML_NAMESPACE = 'http://www.w3.org/1999/xhtml'
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

class FakeElement {
  namespaceURI: string
  tagName: string
  parentElement: FakeElement | null = null
  children: FakeElement[] = []
  shadowRoot: FakeHitTestRoot | null = null
  contentDocument: FakeDocument | null = null
  ownerSVGElement: FakeSVGSVGElement | null = null
  pointerEvents = 'auto'
  display = 'block'
  visibility = 'visible'
  opacity = '1'
  private ignored = false
  private rect = { left: 0, top: 0, width: 100, height: 100 }

  constructor(tagName: string, namespaceURI = HTML_NAMESPACE) {
    this.tagName = tagName.toUpperCase()
    this.namespaceURI = namespaceURI
  }

  setIgnored(): this {
    this.ignored = true
    return this
  }

  setRect(left: number, top: number, width: number, height: number): this {
    this.rect = { left, top, width, height }
    return this
  }

  append(...children: FakeElement[]): this {
    children.forEach((child) => {
      child.parentElement = this
      this.children.push(child)
    })
    return this
  }

  querySelectorAll(): FakeElement[] {
    return this.children.flatMap(child => [child, ...child.querySelectorAll()])
  }

  contains(element: FakeElement): boolean {
    return element === this || this.children.some(child => child.contains(element))
  }

  closest(selector: string): FakeElement | null {
    if (selector === 'svg') return this.ownerSVGElement
    let current: FakeElement | null = this
    while (current) {
      if (current.ignored && selector === '[data-elens-ignore="true"]') return current
      current = current.parentElement
    }
    return null
  }

  getBoundingClientRect() {
    return this.rect
  }
}

class FakeMouseEvent {
  target: FakeElement
  clientX = 10
  clientY = 20

  constructor(target: FakeElement) {
    this.target = target
  }

  composedPath(): FakeElement[] {
    return [this.target]
  }
}

class FakeHTMLElement extends FakeElement {}
class FakeSVGElement extends FakeElement {
  constructor(tagName: string) {
    super(tagName, SVG_NAMESPACE)
  }
}
class FakeSVGSVGElement extends FakeSVGElement {
  constructor() {
    super('svg')
  }
}

class FakeHitTestRoot {
  lastPoint: [number, number] | null = null

  constructor(private readonly hits: FakeElement[]) {}

  elementsFromPoint(x: number, y: number): FakeElement[] {
    this.lastPoint = [x, y]
    return this.hits
  }
}

class FakeDocument extends FakeHitTestRoot {
  documentElement: FakeHTMLElement
  body: FakeHTMLElement

  constructor(hits: FakeElement[]) {
    super(hits)
    this.documentElement = new FakeHTMLElement('html')
    this.body = new FakeHTMLElement('body')
  }
}

function useDocument(document: FakeDocument): void {
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: document,
  })
}

beforeAll(() => {
  Object.defineProperties(globalThis, {
    HTMLElement: { configurable: true, value: FakeHTMLElement },
    SVGElement: { configurable: true, value: FakeSVGElement },
    SVGSVGElement: { configurable: true, value: FakeSVGSVGElement },
    window: {
      configurable: true,
      value: {
        getComputedStyle: (element: FakeElement) => ({
          display: element.display,
          visibility: element.visibility,
          opacity: element.opacity,
          pointerEvents: element.pointerEvents,
        }),
      },
    },
  })
})

describe('getInspectableElementFromPoint', () => {
  test('uses the browser event target before coordinate guessing', () => {
    const button = new FakeHTMLElement('button')
    useDocument(new FakeDocument([new FakeHTMLElement('div')]))

    expect(getInspectableElementFromEvent(new FakeMouseEvent(button) as unknown as Event, 'data-elens-ignore')).toBe(button)
  })

  test('keeps form controls selectable', () => {
    const input = new FakeHTMLElement('input')
    useDocument(new FakeDocument([input]))

    expect(getInspectableElementFromPoint(10, 20, 'data-elens-ignore')).toBe(input)
  })

  test('returns the exact SVG child instead of the root SVG', () => {
    const svg = new FakeSVGSVGElement()
    const path = new FakeSVGElement('path')
    path.ownerSVGElement = svg
    useDocument(new FakeDocument([path, svg]))

    expect(getInspectableElementFromPoint(10, 20, 'data-elens-ignore')).toBe(path)
  })

  test('finds a visible SVG icon even when pointer-events makes clicks pass through it', () => {
    const container = new FakeHTMLElement('div').setRect(0, 0, 300, 40)
    const svg = new FakeSVGSVGElement().setRect(8, 8, 16, 16)
    const path = new FakeSVGElement('path').setRect(10, 10, 12, 12)
    const input = new FakeHTMLElement('input').setRect(32, 0, 260, 40)
    svg.pointerEvents = 'none'
    path.pointerEvents = 'none'
    svg.append(path)
    container.append(svg, input)
    useDocument(new FakeDocument([container]))

    expect(getInspectableElementFromPoint(15, 15, 'data-elens-ignore')).toBe(path)
  })

  test('descends into an open shadow root', () => {
    const shadowButton = new FakeHTMLElement('button')
    const host = new FakeHTMLElement('user-card')
    host.shadowRoot = new FakeHitTestRoot([shadowButton])
    useDocument(new FakeDocument([host]))

    expect(getInspectableElementFromPoint(10, 20, 'data-elens-ignore')).toBe(shadowButton)
  })

  test('descends into an accessible iframe with translated coordinates', () => {
    const iframeButton = new FakeHTMLElement('button')
    const iframeDocument = new FakeDocument([iframeButton])
    const iframe = new FakeHTMLElement('iframe').setRect(80, 35, 300, 200)
    iframe.contentDocument = iframeDocument
    useDocument(new FakeDocument([iframe]))

    expect(getInspectableElementFromPoint(100, 50, 'data-elens-ignore')).toBe(iframeButton)
    expect(iframeDocument.lastPoint).toEqual([20, 15])
  })

  test('skips Elens-owned elements', () => {
    const overlay = new FakeHTMLElement('div').setIgnored()
    const pageElement = new FakeHTMLElement('main')
    useDocument(new FakeDocument([overlay, pageElement]))

    expect(getInspectableElementFromPoint(10, 20, 'data-elens-ignore')).toBe(pageElement)
  })
})
