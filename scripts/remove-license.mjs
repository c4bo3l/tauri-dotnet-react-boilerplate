import { existsSync, rmSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');

// ── helpers ──────────────────────────────────────────────────────────────

function read(path) {
  return readFileSync(path, 'utf-8');
}

function write(path, content) {
  writeFileSync(path, content, 'utf-8');
  console.log(`  Updated: ${relative(path)}`);
}

function relative(p) {
  return '/' + resolve(p).replace(resolve(root) + '/', '');
}

function removeLines(file, ...patterns) {
  const original = read(file);
  const lines = original.split('\n');
  const filtered = lines.filter(line => !patterns.some(p => line.includes(p)));
  if (filtered.length !== lines.length) {
    write(file, filtered.join('\n'));
  }
}

function removeBlock(file, startMarker, endMarker) {
  const original = read(file);
  const startIdx = original.indexOf(startMarker);
  if (startIdx === -1) {
    console.log(`  Skipped (marker not found): ${relative(file)} (${startMarker.slice(0, 40)}...)`);
    return;
  }
  const endIdx = original.indexOf(endMarker, startIdx + startMarker.length);
  const before = original.slice(0, startIdx);
  const after = endIdx !== -1 ? original.slice(endIdx + endMarker.length) : '';
  write(file, before + after);
}

function removeLineContaining(file, pattern) {
  const original = read(file);
  const lines = original.split('\n');
  const filtered = lines.filter(line => !line.includes(pattern));
  if (filtered.length !== lines.length) {
    write(file, filtered.join('\n'));
  }
}

// ── track if anything was actually done ──────────────────────────────────
let anyChange = false;

function check(p) {
  if (existsSync(p)) { anyChange = true; return true; }
  return false;
}

// ═══════════════════════════════════════════════════════════════════════════
//  1. Delete Infrastructure.Licensing project directory
// ═══════════════════════════════════════════════════════════════════════════

const licensingDir = resolve(root, 'backend/src/Infrastructure.Licensing');
if (check(licensingDir)) {
  rmSync(licensingDir, { recursive: true, force: true });
  console.log(`  Deleted: ${relative(licensingDir)}/`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  2. Delete LicenseGenerator tool directory
// ═══════════════════════════════════════════════════════════════════════════

const licenseGenDir = resolve(root, 'tools/LicenseGenerator');
if (check(licenseGenDir)) {
  rmSync(licenseGenDir, { recursive: true, force: true });
  console.log(`  Deleted: ${relative(licenseGenDir)}/`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  3. Delete LicenseGate.tsx
// ═══════════════════════════════════════════════════════════════════════════

const licenseGate = resolve(root, 'frontend/src/LicenseGate.tsx');
if (check(licenseGate)) {
  rmSync(licenseGate);
  console.log(`  Deleted: ${relative(licenseGate)}`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  4. Update dotnet-backend.slnx — remove Licensing project line
// ═══════════════════════════════════════════════════════════════════════════

const slnx = resolve(root, 'backend/dotnet-backend.slnx');
removeLineContaining(slnx, 'Infrastructure.Licensing');

// ═══════════════════════════════════════════════════════════════════════════
//  5. Update dotnet-backend.csproj
// ═══════════════════════════════════════════════════════════════════════════

const csproj = resolve(root, 'backend/dotnet-backend.csproj');
removeLineContaining(csproj, 'Infrastructure.Licensing');
removeLineContaining(csproj, 'LicenseInfo');
removeLineContaining(csproj, 'LicenseData');

// ═══════════════════════════════════════════════════════════════════════════
//  6. Update Program.cs — remove licensing import + license endpoint block
// ═══════════════════════════════════════════════════════════════════════════

const program = resolve(root, 'backend/Program.cs');
removeLineContaining(program, 'using Infrastructure.Licensing;');
removeBlock(program,
  '\n// ── License / unlock ──────────────────────────────────────────────────\n',
  '\n// ── Global exception handlers ──────────────────────────────────────────\n'
);

// ═══════════════════════════════════════════════════════════════════════════
//  7. Update main.tsx — strip LicenseGate import + wrapper
// ═══════════════════════════════════════════════════════════════════════════

const main = resolve(root, 'frontend/src/main.tsx');
let mainContent = read(main);
mainContent = mainContent.replace("import LicenseGate from './LicenseGate.tsx'\n", '');
mainContent = mainContent.replace(/\s*<LicenseGate>\s*/g, '\n');
mainContent = mainContent.replace(/\s*<\/LicenseGate>\s*/g, '\n');
write(main, mainContent);

// ═══════════════════════════════════════════════════════════════════════════
//  8. Update package.json — remove license scripts
// ═══════════════════════════════════════════════════════════════════════════

const pkgPath = resolve(root, 'package.json');
let pkg = JSON.parse(read(pkgPath));
delete pkg.scripts['license:keygen'];
delete pkg.scripts['license:sign'];
write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

// ═══════════════════════════════════════════════════════════════════════════
//  9. Update .gitignore — remove license/keys section + trailing blank line
// ═══════════════════════════════════════════════════════════════════════════

const gitignore = resolve(root, '.gitignore');
let gi = read(gitignore);
gi = gi.replace(/\n# ── license \/ keys ────────────────────────────────────\n\*\.lic\nprivate-key\.pem\npublic-key\.pem\n\*\.key/, '');
gi = gi.replace(/\n{3,}/g, '\n\n');
gi = gi.trimEnd() + '\n';
write(gitignore, gi);

// ═══════════════════════════════════════════════════════════════════════════
//  10. Update README.md
// ═══════════════════════════════════════════════════════════════════════════

const readme = resolve(root, 'README.md');
let md = read(readme);

// (a) Remove Infrastructure.Licensing line from project tree
md = md.replace(/│   │   ├── Infrastructure\.Licensing\/  # RSA license verification, machine ID\n/, '');

// (b) Remove LicenseGate line from project tree
md = md.replace(/│   │   ├── LicenseGate\.tsx     # Unlock screen wrapper \(eager\)\n/, '');

// (c) Remove LicenseGenerator from tools section
md = md.replace(/│   └── LicenseGenerator\/       # .NET console app: generate RSA keys & license files\n│       ├── Program\.cs\n│       └── LicenseGenerator\.csproj\n/, '');

// (d) Remove LicenseGate reference from code splitting
md = md.replace(/, so its code is fetched only after `LicenseGate` confirms the device is licensed/, '');

// (e) Remove LicenseGate from chunk table
md = md.replace(/`index-\*\.js` .* LicenseGate \(eager\)\n/, '`index-*.js` | ~4.5 kB | Entry point\n');

// (f) Remove Licensing & Unlock System section (from heading to before Auto-Update)
md = md.replace(/\n## Licensing & Unlock System\n\nThe app includes a device-locked license system \(RSA-signed\)\. The app will not show its content until a valid license is activated\.\n\n### How it works\n\n1. On first launch, the app generates a \*\*Machine ID\*\* \(SHA-256 of machine name \+ OS version\)\n2. The user sends this Machine ID to you \(the developer\)\n3. You generate a signed license file using your private key\n4. The user pastes the license code into the unlock screen\n5. The app verifies the RSA signature and binds it to the machine ID\n\n### Generating licenses\n\n```bash\n# Generate a new key pair \(one-time setup\)\nnpm run license:keygen -- private-key\.pem public-key\.pem\n\n# Generate a license for a specific machine ID \(no expiration\)\nnpm run license:sign -- private-key\.pem <machine-id> license\.lic\n\n# With expiration — relative duration \(`30d`, `6m`, `1y`\)\nnpm run license:sign -- private-key\.pem <machine-id> license\.lic "30d"\n\n# With expiration — absolute date\nnpm run license:sign -- private-key\.pem <machine-id> license\.lic "2027-06-01"\n```\n\nThe public key is embedded in the app at `backend\/src\/Infrastructure\.Licensing\/EmbeddedPublicKey\.cs`\.\nKeep the \*\*private key\*\* secret and never commit it to the repository\.\n\n### API endpoints\n\n\| Method \| Path \| Description \|\n\|--------\|------\|-------------\|\n\| GET \| `\/api\/license\/status` \| Returns `\{ isLicensed, machineId, reason\? \}` \|\n\| POST \| `\/api\/license\/activate` \| Accepts a raw license JSON body, saves and validates it \|\n\n### Frontend unlock screen\n\nThe `LicenseGate` component \(`frontend\/src\/LicenseGate\.tsx`\) wraps the entire app\. It shows the machine ID and a text area for pasting the license code\. The app content is only rendered once `isLicensed === true`\.\n\n/, '\n');

// (g) Remove license endpoints from API table
md = md.replace(/\| GET \| `\/api\/license\/status` .*\n/, '');
md = md.replace(/\| POST \| `\/api\/license\/activate` .*\n/, '');

// Clean up extra blank lines left behind
md = md.replace(/\n{3,}/g, '\n\n');

write(readme, md);

// ═══════════════════════════════════════════════════════════════════════════

if (!anyChange) {
  console.log('\nNo licensing files found — project is already clean.');
} else {
  console.log('\nDone. License dependency has been removed from the project.');
  console.log('Run `dotnet build backend/dotnet-backend.csproj` to verify everything compiles.');
}
