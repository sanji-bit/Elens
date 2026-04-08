# element-inspector-sdk

Standalone DOM element inspector SDK for **Web, Electron, and Tauri** apps.

## Features

- Toggle inspect mode on/off
- Block page interaction while active
- Hover to inspect current element
- Click to lock current element
- `Esc` to unlock / exit
- Floating panel with:
  - typography
  - colors
  - box model
  - layout info
- Copy current style summary

## Usage

```ts
import { mountElementInspector } from 'element-inspector-sdk'

const inspector = mountElementInspector({
  enabled: false,
  theme: {
    accentColor: '#6366f1',
    zIndex: 999999,
  },
  onInspect(info) {
    console.log(info)
  },
})

// later
inspector.enable()
inspector.disable()
inspector.toggle()
inspector.destroy()
```

## API

### `mountElementInspector(options?)`
Creates and mounts the inspector UI into `document.body`.

Returns an instance with:
- `enable()`
- `disable()`
- `toggle()`
- `destroy()`
- `isEnabled()`
- `getCurrentInfo()`

## Local demo

```bash
cd /Users/sanji/coding/tools/element-inspector
bun install
bun run dev
```

Then open `http://127.0.0.1:4317`.
