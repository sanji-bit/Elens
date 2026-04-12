/**
 * 同步设计 Tokens 脚本
 *
 * 从 src/design-tokens.ts 读取 tokens，生成：
 * 1. design-system-preview.html 的 CSS 变量部分
 * 2. DESIGN_SYSTEM.md 文档（可选）
 *
 * 运行方式: npx tsx scripts/sync-tokens.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { buildTheme, generateCSSVariables } from '../src/design-tokens.ts'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function buildPreviewRoot(): string {
  const theme = buildTheme()
  const css = generateCSSVariables(theme)
  return `    ${css}`
}

function updatePreviewFile(): void {
  const previewPath = path.join(__dirname, '../design-system-preview.html')
  let content = fs.readFileSync(previewPath, 'utf-8')

  // 找到 :root 块并替换
  const rootRegex = /:root\s*\{[^}]+\}/s
  const newRoot = buildPreviewRoot()

  if (rootRegex.test(content)) {
    content = content.replace(rootRegex, newRoot)
    fs.writeFileSync(previewPath, content)
    console.log('✅ Updated design-system-preview.html')
  } else {
    console.log('❌ Could not find :root block in preview file')
  }
}

function main(): void {
  console.log('🔄 Syncing design tokens...')
  updatePreviewFile()
  console.log('✨ Done!')
}

main()