# AGENTS.md

## Architecture

- **Three top-level dirs**: `frontend/` (React+Vite+TS), `backend/` (.NET 10 ASP.NET Core), `tauri/` (Rust shell)
- .NET backend runs as a **Tauri sidecar**. In release, `tauri/src/lib.rs` spawns it via `shell().sidecar("dotnet-backend")`. In dev, `scripts/tauri-dev.mjs` starts it directly + Vite, then launches Tauri CLI.
- The frontend **lazy-loads `App.tsx`** via `React.lazy()` + `Suspense` — only renders after `LicenseGate` confirms activation. Vendor code (React/ReactDOM) is split via Vite `manualChunks` into a separate `vendor-*.js` chunk.
- Backend split into 6 library projects + 2 test projects, wired via `dotnet-backend.slnx`.

## Key Commands

| Command | What it does |
|---------|-------------|
| `npm run tauri:dev` | Builds .NET, starts backend (port 5199) + Vite (port 5173), waits for both, then launches Tauri CLI from `tauri/` |
| `npm run tauri:build` | `build-dotnet.mjs` → `../frontend/node_modules/.bin/tauri build` (must run from `tauri/` dir, not with `--config`) |
| `npm run setup` | `scripts/install-deps.mjs`: runs `npm install`, `dotnet restore`, `dotnet tool restore` (from `backend/`), `cargo fetch` |
| `npm run clean` | `scripts/clean-all.mjs`: `dotnet clean` + delete `frontend/dist/` + `cargo clean` |
| `npm run db:reset` | Deletes `app.db` files from disk (`scripts/db-reset.mjs`) |
| `npm run lint` | ESLint (flat config, `recommendedTypeChecked`, enforced semicolons) |
| `dotnet test backend/dotnet-backend.slnx` | Run all .NET unit tests |

## Framework Quirks

- **Mediator** (not MediatR): messages must be `partial`, handlers return `ValueTask<T>`, lifetime **must** be `Scoped` (default Singleton clashes with scoped `IAppDbContext`).
- **EF Core migrations** use local tool `dotnet dotnet-ef` (not `dotnet ef`), must run from `backend/src/Infrastructure.Database/` with `--startup-project ../../dotnet-backend.csproj`. The `scripts/migration.mjs` helper handles this.
- **Vite uses SWC** (`@vitejs/plugin-react-swc`), not Babel.
- **Tauri build**: `tauri/tauri.conf.json` has `beforeBuildCommand: "cd frontend && npm run build"` and `build.frontendDist: "../frontend/dist"`.
- **Tauri CLI path**: `../frontend/node_modules/.bin/tauri` (not global). Run from `tauri/` directory.
- **Rust release profile** in `tauri/Cargo.toml`: `strip = true`, `lto = true`, `codegen-units = 1`.

## Build & Obfuscation

- **Obfuscar** runs as MSBuild target in `Release` config only. It generates inline XML with absolute paths (`$(TargetDir)`, `$(TargetPath)`). Skips JSON-exposed types: `*WeatherForecast`, `*CreateTodoRequest`, `*UpdateTodoRequest`, `Infrastructure.Models.TodoItem`, `Infrastructure.Licensing.LicenseInfo`, `Infrastructure.Licensing.LicenseData`.
- **`build-dotnet.mjs`** publishes single-file self-contained .NET binary, copies to `tauri/binaries/` as `dotnet-backend-<rust-triple>`, and syncs version from `scripts/version.txt` to `tauri/tauri.conf.json`.
- **Tauri build cannot cross-compile** — must run on the target OS. .NET backend can be cross-published (use `build:dotnet:mac/win/linux`).

## State & Data

- **DB** at `AppContext.BaseDirectory/app.db` (next to the .NET executable). **License** at `AppContext.BaseDirectory/license.lic`.
- **DatabasePassword** required in `appsettings.json`.
- **Version** single-sourced from `scripts/version.txt`. Synced automatically to `tauri.conf.json` during build/dev.
- **Private key** for licensing at `~/.tauri-dotnet-app/private-key.pem` (outside repo). Public key in `appsettings.json` (`LicensePublicKey`).

## Licensing System

- RSA-2048 + SHA-256, device-locked (Machine ID = SHA-256 of MachineName + OSVersion).
- `tools/LicenseGenerator/` is a standalone .NET console app (not part of the main solution). Commands: `npm run license:keygen -- <priv> <pub>`, `npm run license:sign -- <priv> <machine-id> <out> [expiration]`.
- Strip it entirely with `node scripts/remove-license.mjs`.

## Renaming

- `node scripts/rename.mjs <new-name>` updates `package.json`, `frontend/package.json`, `frontend/index.html`, `tauri/tauri.conf.json`, `README.md`.

## Sidecar Behavior

- Rust only spawns the sidecar in release builds (`#[cfg(not(debug_assertions))]`). In dev, `scripts/tauri-dev.mjs` handles startup, so `beforeDevCommand` is `echo 'ready'` (no-op).

## Dev URLs

| URL | What |
|-----|------|
| `http://127.0.0.1:5199` | .NET backend |
| `http://localhost:5173` | Vite frontend |
| `http://localhost:5199/scalar/v1` | Scalar API reference (dev only) |
| `http://localhost:5199/openapi/v1.json` | OpenAPI spec (dev only) |

## .NET Toolchain

- Local tools (`dotnet-ef`, `obfuscar.globaltool`) in `backend/.config/dotnet-tools.json`. Run `dotnet tool restore` from `backend/` directory.
- Dotnet-ef is `dotnet dotnet-ef` (not `dotnet ef`).
