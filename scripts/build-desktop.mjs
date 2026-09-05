import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

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

await run('npx', ['vite', 'build', '--config', 'vite.desktop.config.ts'])
