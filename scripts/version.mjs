import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VERSION_FILE = resolve(__dirname, 'version.txt')

export function readVersion() {
  return readFileSync(VERSION_FILE, 'utf-8').trim()
}

function writeVersion(version) {
  writeFileSync(VERSION_FILE, version + '\n')
  console.log(`Version set to ${version}`)
}

function bump(part) {
  const current = readVersion().split('.').map(Number)
  if (part === 'major') {
    current[0]++
    current[1] = 0
    current[2] = 0
  } else if (part === 'minor') {
    current[1]++
    current[2] = 0
  } else if (part === 'patch') {
    current[2]++
  } else {
    console.error('Usage: node scripts/version.mjs bump <major|minor|patch>')
    process.exit(1)
  }
  writeVersion(current.join('.'))
}

const args = process.argv.slice(2)
const command = args[0]

if (!command || command === 'read') {
  console.log(readVersion())
} else if (command === 'set') {
  if (!args[1]) {
    console.error('Usage: node scripts/version.mjs set <version>')
    process.exit(1)
  }
  writeVersion(args[1])
} else if (command === 'bump') {
  bump(args[1])
} else {
  console.log(`
Usage: node scripts/version.mjs <command> [args]

Commands:
  read                  Print current version
  set <version>         Set version (e.g. "1.2.3")
  bump <major|minor|patch>  Bump version part
`)
}
