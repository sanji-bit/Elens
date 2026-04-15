import { readdirSync, readFileSync, statSync } from 'node:fs'
import { extname, join, relative } from 'node:path'

const root = process.cwd()
const sourceDirs = ['src']
const allowedExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.html', '.css'])
const ignoredDirs = new Set(['node_modules', '.git', 'demo-dist', 'dist', 'coverage', '.claude', 'assets'])

const allowedHardcodedColorFiles = new Set([
  'src/design.ts',
  'src/design-tokens.ts',
  'src/theme.ts',
  'src/theme-store.ts',
  'src/tokens.ts',
  'src/utils.ts',
  'src/runtime-styles.ts',
  'src/workbench.ts',
  'design-system-preview.html',
  'demo/design-system-preview.html',
])

const allowedNativeColorFiles = new Set([
  'src/design.ts',
  'src/workbench.ts',
])

const utilityFiles = new Set([
  'src/i18n.ts',
  'src/types.ts',
  'src/utils.ts',
  'src/design-tokens.ts',
  'src/mount.ts',
  'src/theme-store.ts',
  'src/theme.ts',
  'src/index.ts',
  'src/extension-bridge.ts',
  'src/chrome-extension-entry.ts',
])

const designSystemFiles = new Set([
  'src/design.ts',
  'src/runtime-styles.ts',
  'src/workbench.ts',
])

const findings = []
const registeredComponentClasses = loadRegisteredComponentClasses()

function loadRegisteredComponentClasses() {
  const workbenchPath = join(root, 'src/workbench.ts')
  try {
    const text = readFileSync(workbenchPath, 'utf8')
    const classNames = new Set()
    const matches = text.matchAll(/classNames:\s*\[([^\]]*)\]/g)
    for (const match of matches) {
      const rawItems = match[1].matchAll(/['"](\.ei-[^'"]+|\.ei-dp-[^'"]+)['"]/g)
      for (const item of rawItems) {
        classNames.add(item[1])
      }
    }
    return classNames
  } catch {
    return new Set()
  }
}

function extractComponentClasses(line) {
  const classNames = []
  const matches = line.matchAll(/\b(ei-[a-z0-9_-]+|ei-dp-[a-z0-9_-]+)\b/gi)
  for (const match of matches) {
    classNames.push(`.${match[1]}`)
  }
  return [...new Set(classNames)]
}

function isRegisteredOrCoveredByParent(className) {
  if (registeredComponentClasses.has(className)) return true
  for (const registered of registeredComponentClasses) {
    if (className.startsWith(`${registered}-`) || className.startsWith(`${registered}__`)) return true
  }
  return false
}

function walk(dir) {
  const fullDir = join(root, dir)
  let entries = []

  for (const name of readdirSync(fullDir)) {
    if (ignoredDirs.has(name)) continue
    const fullPath = join(fullDir, name)
    const stat = statSync(fullPath)
    if (stat.isDirectory()) {
      entries = entries.concat(walk(relative(root, fullPath)))
    } else if (allowedExtensions.has(extname(name))) {
      entries.push(fullPath)
    }
  }

  return entries
}

function addFinding(level, file, line, rule, message, sample) {
  findings.push({ level, file, line, rule, message, sample: sample.trim() })
}

function isAllowedHardcodedColorFile(file) {
  return allowedHardcodedColorFiles.has(file)
}

function isAllowedNativeColorFile(file) {
  return allowedNativeColorFiles.has(file)
}

function isUtilityFile(file) {
  return utilityFiles.has(file) || file.startsWith('src/assets/')
}

function isDesignSystemFile(file) {
  return designSystemFiles.has(file)
}

function hasSuspiciousNewComponentClass(line) {
  return /class(Name)?\s*[:=].*['"`][^'"`]*(ei-(?!tt-|ann-|capture-|toolbar-|dp-|panel|menu|tab|field|picker|swatch)[a-z0-9_-]+|ei-dp-(?!fill|font|color|stroke|effects|text|size|gap|align|btn|field|picker|popover|panel|tab|menu)[a-z0-9_-]+)[^'"`]*['"`]/i.test(line)
}

function checkFile(fullPath) {
  const file = relative(root, fullPath)
  const text = readFileSync(fullPath, 'utf8')
  const lines = text.split('\n')
  const utilityFile = isUtilityFile(file)
  const designSystemFile = isDesignSystemFile(file)

  lines.forEach((line, index) => {
    const lineNo = index + 1

    if (!isAllowedNativeColorFile(file) && /type\s*=\s*['"]color['"]|input\[type=['"]?color['"]?\]/.test(line)) {
      addFinding(
        'error',
        file,
        lineNo,
        'native-color-input',
        '颜色选择必须复用统一颜色选择器，不要新增原生 input[type=color]。',
        line,
      )
    }

    if (!utilityFile && !isAllowedHardcodedColorFile(file) && /#[0-9A-Fa-f]{3,8}\b|rgba?\(|hsla?\(/.test(line)) {
      addFinding(
        'warning',
        file,
        lineNo,
        'hardcoded-color',
        '发现硬编码颜色。请确认是否应使用 token、CSS variable 或现有组件。',
        line,
      )
    }

    if (!utilityFile && !designSystemFile && hasSuspiciousNewComponentClass(line)) {
      addFinding(
        'warning',
        file,
        lineNo,
        'suspicious-component-class',
        '发现可疑的新组件类名。请确认这是复用扩展，而不是绕过设计系统重新造组件。',
        line,
      )
    }

    if (!utilityFile && !designSystemFile) {
      const unknownClasses = extractComponentClasses(line).filter((className) => !isRegisteredOrCoveredByParent(className))
      if (unknownClasses.length > 0) {
        addFinding(
          'warning',
          file,
          lineNo,
          'unregistered-component-class',
          `发现未登记组件类名：${unknownClasses.join(', ')}。如果这是新组件，请先登记到 Workbench 待确认组件区。`,
          line,
        )
      }
    }

    if (!utilityFile && !designSystemFile && /--[a-z0-9-]+\s*:/.test(line)) {
      addFinding(
        'warning',
        file,
        lineNo,
        'custom-css-variable',
        '发现新 CSS 变量定义。请确认这是否应进入设计系统 token，而不是功能内局部变量。',
        line,
      )
    }

    if (!utilityFile && !designSystemFile && /\b(border-radius|box-shadow|background|border|padding|height|gap)\s*:/.test(line)) {
      addFinding(
        'warning',
        file,
        lineNo,
        'visual-style-property',
        '发现视觉样式属性。请确认是否复用了 Elens Design System 的既有模式。',
        line,
      )
    }
  })
}

for (const dir of sourceDirs) {
  try {
    for (const file of walk(dir)) checkFile(file)
  } catch {
    // Directory does not exist in every checkout.
  }
}

const errors = findings.filter(finding => finding.level === 'error')
const warnings = findings.filter(finding => finding.level === 'warning')

if (findings.length === 0) {
  console.log('Design system check passed. No findings.')
} else {
  console.log(`Design system check found ${errors.length} error(s) and ${warnings.length} warning(s).`)
  console.log('')

  for (const finding of findings) {
    const prefix = finding.level === 'error' ? 'ERROR' : 'WARN'
    console.log(`[${prefix}] ${finding.rule}`)
    console.log(`  ${finding.file}:${finding.line}`)
    console.log(`  ${finding.message}`)
    console.log(`  ${finding.sample}`)
    console.log('')
  }
}

if (errors.length > 0) {
  process.exit(1)
}
