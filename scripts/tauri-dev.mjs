import { spawn, execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const BACKEND_DIR = resolve(ROOT, 'backend')
const FRONTEND_DIR = resolve(ROOT, 'frontend')
const TAURI_DIR = resolve(ROOT, 'tauri')
const TAURI_CLI = resolve(ROOT, 'frontend', 'node_modules', '@tauri-apps', 'cli', 'tauri.js')
const VERSION = readFileSync(resolve(__dirname, 'version.txt'), 'utf-8').trim()

async function waitForServer(url, timeoutMs = 60000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(url)
      if (resp.ok) return
    } catch { /* not ready yet */ }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Server did not start within ${timeoutMs}ms`)
}

async function main() {
  // Sync version to tauri.conf.json
  const configPath = resolve(TAURI_DIR, 'tauri.conf.json')
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))
  config.version = VERSION
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  console.log(`Version: ${VERSION}`)

  // Build .NET backend
  console.log('Building .NET backend...')
  execSync('dotnet build dotnet-backend.csproj --nologo', { stdio: 'inherit', cwd: BACKEND_DIR })

  // Start .NET backend
  console.log('Starting .NET backend...')
  const backend = spawn('dotnet', ['bin/Debug/net10.0/osx-x64/dotnet-backend.dll'], {
    stdio: 'inherit',
    cwd: BACKEND_DIR,
    env: { ...process.env, ASPNETCORE_ENVIRONMENT: 'Development', ASPNETCORE_URLS: 'http://127.0.0.1:5199' },
  })

  // Start Vite dev server
  console.log('Starting Vite dev server...')
  const vite = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    cwd: FRONTEND_DIR,
  })

  let backendExited = false
  backend.on('exit', (code) => { backendExited = true })

  try {
    await Promise.all([
      waitForServer('http://127.0.0.1:5199/api/hello'),
      waitForServer('http://localhost:5173'),
    ])
    console.log('\nBackend and Vite are ready. Starting Tauri dev...\n')
  } catch (err) {
    console.error(err.message)
    backend.kill()
    vite.kill()
    process.exit(1)
  }

  const tauri = spawn('node', [TAURI_CLI, 'dev'], {
    stdio: 'inherit',
    cwd: TAURI_DIR,
  })

  tauri.on('exit', () => {
    if (!backendExited) backend.kill()
    vite.kill()
    process.exit()
  })

  process.on('SIGINT', () => {
    if (!backendExited) backend.kill()
    vite.kill()
    process.exit()
  })
}

main()
