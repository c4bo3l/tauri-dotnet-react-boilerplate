import { execSync } from 'child_process'
import { existsSync, cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DOTNET_PROJ = resolve(ROOT, 'backend')
const BINARIES = resolve(ROOT, 'tauri', 'binaries')

const VERSION = readFileSync(resolve(__dirname, 'version.txt'), 'utf-8').trim()

const PLATFORMS = {
  win32: {
    dotnetRid: 'win-x64',
    rustTriple: 'x86_64-pc-windows-msvc',
    binaryExt: '.exe',
  },
  darwin: {
    dotnetRid: process.arch === 'arm64' ? 'osx-arm64' : 'osx-x64',
    rustTriple: process.arch === 'arm64' ? 'aarch64-apple-darwin' : 'x86_64-apple-darwin',
    binaryExt: '',
  },
  linux: {
    dotnetRid: 'linux-x64',
    rustTriple: 'x86_64-unknown-linux-gnu',
    binaryExt: '',
  },
}

function publish(rustTriple, dotnetRid) {
  mkdirSync(BINARIES, { recursive: true })
  const outDir = resolve(BINARIES, 'publish-tmp')
  mkdirSync(outDir, { recursive: true })

  console.log(`Publishing .NET backend v${VERSION} for ${rustTriple} (rid: ${dotnetRid})...`)
  execSync(
    `dotnet publish "${DOTNET_PROJ}/dotnet-backend.csproj" -c Release -r ${dotnetRid} --self-contained true -p:PublishSingleFile=true -p:Version=${VERSION} -o "${outDir}"`,
    { stdio: 'inherit', cwd: DOTNET_PROJ }
  )

  const ext = rustTriple.includes('windows') ? '.exe' : ''
  const binaryName = `dotnet-backend${ext}`
  const targetName = `dotnet-backend-${rustTriple}${ext}`

  cpSync(resolve(outDir, binaryName), resolve(BINARIES, targetName))
  rmSync(outDir, { recursive: true, force: true })

  console.log(`Copied sidecar binary → ${targetName}`)
}

function updateTauriConfig() {
  const configPath = resolve(ROOT, 'tauri', 'tauri.conf.json')
  const config = JSON.parse(readFileSync(configPath, 'utf-8'))
  config.version = VERSION
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n')
  console.log(`Updated tauri/tauri.conf.json version → ${VERSION}`)
}

function publishAll() {
  for (const [platform, { dotnetRid, rustTriple, binaryExt }] of Object.entries(PLATFORMS)) {
    const targetName = `dotnet-backend-${rustTriple}${binaryExt}`
    if (existsSync(resolve(BINARIES, targetName))) {
      console.log(`${targetName} already exists, skipping. Use --force to rebuild.`)
      continue
    }
    publish(rustTriple, dotnetRid)
  }
}

const args = process.argv.slice(2)

updateTauriConfig()

if (args.includes('--all')) {
  publishAll()
} else if (args.includes('--platform')) {
  const idx = args.indexOf('--platform')
  const platform = args[idx + 1]
  const cfg = PLATFORMS[platform]
  if (!cfg) {
    console.error(`Unknown platform: ${platform}. Valid: ${Object.keys(PLATFORMS).join(', ')}`)
    process.exit(1)
  }
  publish(cfg.rustTriple, cfg.dotnetRid)
} else {
  // detect current platform
  const platform = process.platform
  const cfg = PLATFORMS[platform]
  if (!cfg) {
    console.error(`Unsupported platform: ${platform}`)
    process.exit(1)
  }
  publish(cfg.rustTriple, cfg.dotnetRid)
}
