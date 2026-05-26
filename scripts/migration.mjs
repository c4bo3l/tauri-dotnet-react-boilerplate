import { execSync } from 'child_process'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const DB_PROJ = resolve(ROOT, 'backend', 'src', 'Infrastructure.Database')
const STARTUP_PROJ = resolve(ROOT, 'backend', 'dotnet-backend.csproj')

const args = process.argv.slice(2)
const command = args[0]

function run(args) {
  execSync(args.join(' '), { stdio: 'inherit', cwd: DB_PROJ })
}

switch (command) {
  case 'create': {
    const name = args[1]
    if (!name) {
      console.error('Usage: node scripts/migration.mjs create <MigrationName>')
      process.exit(1)
    }
    run([`dotnet dotnet-ef migrations add ${name} --startup-project "${STARTUP_PROJ}"`])
    break
  }
  case 'remove': {
    run([`dotnet dotnet-ef migrations remove --startup-project "${STARTUP_PROJ}"`])
    break
  }
  case 'apply': {
    const target = args[1] ?? ''
    run([`dotnet dotnet-ef database update ${target} --startup-project "${STARTUP_PROJ}"`])
    break
  }
  default:
    console.log(`
Usage: node scripts/migration.mjs <command> [name]

Commands:
  create <name>  Create a new migration
  remove         Remove the last migration
  apply [name]   Apply all pending migrations, or roll back to a specific migration
`)
    process.exit(1)
}
