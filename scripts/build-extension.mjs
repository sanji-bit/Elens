import { cp, mkdir, rm, access } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')
const extensionDir = resolve(rootDir, 'extension')
const distDir = resolve(rootDir, 'dist/chrome-extension')

async function run(command, args) {
  await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })

    child.on('exit', code => {
      if (code === 0) resolvePromise()
      else rejectPromise(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}`))
    })
    child.on('error', rejectPromise)
  })
}

await rm(resolve(extensionDir, 'inspector.js'), { force: true })
await rm(resolve(extensionDir, 'assets'), { recursive: true, force: true })
await rm(distDir, { recursive: true, force: true })
await mkdir(extensionDir, { recursive: true })
await mkdir(distDir, { recursive: true })
await run('npx', ['vite', 'build', '--config', 'vite.extension.config.ts'])
await mkdir(resolve(extensionDir, 'assets'), { recursive: true })
await cp(resolve(rootDir, 'src/assets/capture.js'), resolve(extensionDir, 'assets/capture.js'))
await cp(resolve(extensionDir, 'manifest.json'), resolve(distDir, 'manifest.json'))
await cp(resolve(extensionDir, 'content.js'), resolve(distDir, 'content.js'))
await cp(resolve(extensionDir, 'background.js'), resolve(distDir, 'background.js'))
await cp(resolve(extensionDir, 'inspector.js'), resolve(distDir, 'inspector.js'))
await cp(resolve(extensionDir, 'offscreen.html'), resolve(distDir, 'offscreen.html'))
await cp(resolve(extensionDir, 'offscreen.js'), resolve(distDir, 'offscreen.js'))
await cp(resolve(extensionDir, 'assets'), resolve(distDir, 'assets'), { recursive: true })

try {
  await access(resolve(extensionDir, 'assets'))
} catch {
  // No emitted assets for this build.
}
