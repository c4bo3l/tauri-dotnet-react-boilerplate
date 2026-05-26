# Tauri + .NET + Vite App

A desktop application built with **Tauri** (Rust shell), **.NET 10** (ASP.NET Core backend as sidecar), and **React + Vite** (frontend). The .NET backend is structured using CQRS via Mediator, with SQLite + SQLCipher for storage.

## Project Structure

```
├── backend/                    # .NET 10 ASP.NET Core backend
│   ├── dotnet-backend.csproj   # Web API entry point
│   ├── dotnet-backend.slnx     # Solution file
│   ├── Program.cs              # App startup, middleware, DI, APIs
│   ├── appsettings.json        # Configuration (DB password, etc.)
│   ├── appsettings.Development.json
│   ├── obfuscar.xml            # Obfuscation config (reference)
│   ├── Properties/
│   │   └── launchSettings.json
│   ├── src/
│   │   ├── Infrastructure.Models/     # Entity models (TodoItem)
│   │   ├── Infrastructure.Database/   # EF Core DbContext, migrations
│   │   ├── Infrastructure.Dtos/       # Request/response DTOs
│   │   ├── Infrastructure.Commons/    # Shared types (Result<T>)
│   │   ├── Infrastructure.Licensing/  # RSA license verification, machine ID
│   │   └── Infrastructure.Services/   # CQRS handlers, pipeline behaviors
│   └── tests/
│       ├── Infrastructure.Services.Tests/  # Handler unit tests (InMemory EF)
│       └── Infrastructure.Commons.Tests/   # Result<T> tests
├── frontend/                   # React + Vite + TypeScript
│   ├── src/                    # Frontend source
│   │   ├── LicenseGate.tsx     # Unlock screen wrapper
│   │   └── ...
│   └── package.json
├── tauri/                      # Tauri Rust shell
│   ├── src/lib.rs              # Rust entry point (sidecar startup)
│   ├── tauri.conf.json         # Tauri configuration
│   └── Cargo.toml              # Rust dependencies, release profile (strip+LTO)
├── tools/                      # Standalone CLI tools
│   └── LicenseGenerator/       # .NET console app: generate RSA keys & license files
│       ├── Program.cs
│       └── LicenseGenerator.csproj
└── scripts/                    # Build & dev automation
    ├── build-dotnet.mjs        # .NET publish + sidecar copy
    ├── tauri-dev.mjs           # Dev launcher: backend + Vite + Tauri
    ├── migration.mjs           # EF Core migration helper
    ├── version.mjs             # Version read/set/bump CLI
    └── version.txt             # Single source of truth for version
```

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [Rust](https://rustup.rs/) (for Tauri)
- Platform-specific dependencies for Tauri (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

## Getting Started

### 1. Install dependencies

```bash
npm install                    # Frontend + root dependencies
dotnet tool restore            # Local .NET tools (dotnet-ef, obfuscar)
```

### 2. Configure the database password

Set `DatabasePassword` in `backend/appsettings.json` (and `backend/appsettings.Development.json` for dev).

### 3. Run in development

```bash
npm run tauri:dev              # Starts backend (port 5199), Vite (port 5173), then Tauri
```

Or run components individually:

```bash
npm run dev:backend            # .NET backend only (http://127.0.0.1:5199)
npm run dev                    # Vite frontend only (http://localhost:5173)
```

## Build

### Release build

```bash
npm run tauri:build            # .app bundle only (fast)
npm run tauri:build:dmg        # .app + .dmg installer
```

Output:

- `.app` at `tauri/target/release/bundle/macos/tauri-dotnet-app.app`
- `.dmg` at `tauri/target/release/bundle/dmg/tauri-dotnet-app_0.1.0_x64.dmg` (only with `tauri:build:dmg`)

### Platform cross-compilation

| Part | Cross-compile from macOS? |
|------|---------------------------|
| .NET backend | ✅ Yes (see platform-specific commands below) |
| Tauri (Rust shell) | ❌ No — requires native SDK per platform |
| Frontend (Vite) | ✅ Yes (pure JavaScript) |

The .NET backend can be published for any platform from macOS, but **the final Tauri bundle must be built on the target OS** (the Tauri CLI needs the platform's native toolchain to compile Rust and package the app).

The recommended approach for multi-platform releases is **CI/CD** (e.g. GitHub Actions matrix build).

### Build individual components

```bash
npm run build:dotnet           # Publish .NET backend (current platform)
npm run build:dotnet:mac       # Publish for macOS (osx-x64)
npm run build:dotnet:win       # Publish for Windows (win-x64)
npm run build:dotnet:linux     # Publish for Linux (linux-x64)
npm run build:dotnet:all       # Publish for all three platforms at once
npm run build                  # Build frontend only
```

## Database & Migrations

The app uses **EF Core** with **SQLite + SQLCipher** (encrypted). Migrations are managed via the helper script:

```bash
npm run migration:create       # Create a new migration (prompts for name)
npm run migration:apply        # Apply pending migrations
npm run migration:remove       # Remove the last migration
```

The database file is created at `app.db` in the same directory as the executable.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/hello` | Health check |
| GET | `/api/weather` | Sample weather forecast |
| GET | `/api/todos` | List all todos |
| GET | `/api/todos/{id}` | Get todo by ID |
| POST | `/api/todos` | Create todo (`{ "title": "..." }`) |
| PUT | `/api/todos/{id}` | Update todo (`{ "title": "...", "isCompleted": true/false }`) |
| DELETE | `/api/todos/{id}` | Delete todo |

## Security & Protection

- **.NET backend**: Obfuscated with Obfuscar (rename-only, skips JSON-exposed types)
- **.NET publishing**: Trimmed, single-file, self-contained
- **Rust binary**: Stripped symbols, LTO, single codegen unit
- **Frontend**: Sourcemaps disabled in production
- **Database**: Encrypted via SQLCipher (password in `appsettings.json`)

## Exception Handling

- **HTTP errors**: Caught by `UseExceptionHandler` middleware → 500 JSON response
- **Unobserved task exceptions**: Logged via `UnobservedTaskException`
- **Fatal crashes**: Logged via `UnhandledException`, app auto-restarts up to 5 times
- **SQLite transient errors** (BUSY/LOCKED): Retried up to 3 times via Polly pipeline behavior

## Versioning

All version numbers are single-sourced from `scripts/version.txt`. Build scripts automatically inject it into the .NET assembly version and `tauri.conf.json`.

```bash
npm run version                # Read current version
npm run version:set 1.2.3      # Set explicitly
npm run version:bump patch     # 0.1.0 → 0.1.1
npm run version:bump minor     # 0.1.0 → 0.2.0
npm run version:bump major     # 0.1.0 → 1.0.0
```

## Licensing & Unlock System

The app includes a device-locked license system (RSA-signed). The app will not show its content until a valid license is activated.

### How it works

1. On first launch, the app generates a **Machine ID** (SHA-256 of machine name + OS version)
2. The user sends this Machine ID to you (the developer)
3. You generate a signed license file using your private key
4. The user pastes the license code into the unlock screen
5. The app verifies the RSA signature and binds it to the machine ID

### Generating licenses

```bash
# Generate a new key pair (one-time setup)
npm run license:keygen -- private-key.pem public-key.pem

# Generate a license for a specific machine ID (no expiration)
npm run license:sign -- private-key.pem <machine-id> license.lic

# With expiration — relative duration ("30d", "6m", "1y")
npm run license:sign -- private-key.pem <machine-id> license.lic "30d"

# With expiration — absolute date
npm run license:sign -- private-key.pem <machine-id> license.lic "2027-06-01"
```

The public key is embedded in the app at `backend/src/Infrastructure.Licensing/EmbeddedPublicKey.cs`.
Keep the **private key** secret and never commit it to the repository.

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/license/status` | Returns `{ isLicensed, machineId, reason? }` |
| POST | `/api/license/activate` | Accepts a raw license JSON body, saves and validates it |

### Frontend unlock screen

The `LicenseGate` component (`frontend/src/LicenseGate.tsx`) wraps the entire app. It shows the machine ID and a text area for pasting the license code. The app content is only rendered once `isLicensed === true`.

## Auto-Update

The app uses Tauri's built-in updater plugin (not yet configured — see steps below to enable it).

### 1. Install the plugin

```bash
cd frontend && npm add @tauri-apps/plugin-updater
```

Add to `tauri/Cargo.toml`:
```toml
tauri-plugin-updater = "2"
```

### 2. Generate signing keys

```bash
cd tauri && npx tauri signer generate -w ~/.tauri/tauri-dotnet-app.key
```

Keep the private key secret (used in CI). The public key goes in the config.

### 3. Configure in `tauri/tauri.conf.json`

```json
"plugins": {
  "updater": {
    "pubkey": "<your-public-key>",
    "endpoints": ["https://github.com/c4bo3l/tauri-dotnet-react-boilerplate/releases/latest/download/update.json"],
    "windows": {
      "installMode": "passive"
    }
  }
}
```

### 4. Check for updates from the frontend

```typescript
import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

const update = await check()
if (update?.available) {
  await update.downloadAndInstall()
  await relaunch()
}
```

The updater replaces the entire `.app` bundle, so the .NET sidecar inside it is updated automatically.

## Testing

```bash
dotnet test backend/dotnet-backend.slnx
```
