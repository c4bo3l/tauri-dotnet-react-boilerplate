import { execSync } from 'child_process';
import { existsSync, rmSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}

console.log('=== Cleaning all build artifacts ===\n');

// 1. .NET
console.log('--- .NET (backend) ---');
run('dotnet clean backend/dotnet-backend.slnx --nologo');

// 2. Frontend dist
console.log('\n--- Frontend dist ---');
const distDir = resolve(root, 'frontend/dist');
if (existsSync(distDir)) {
  rmSync(distDir, { recursive: true, force: true });
  console.log('  Removed frontend/dist/');
} else {
  console.log('  Nothing to clean (frontend/dist/ does not exist)');
}

// 3. Rust / Tauri target
console.log('\n--- Rust / Tauri ---');
const targetDir = resolve(root, 'tauri/target');
if (existsSync(targetDir)) {
  run('cargo clean', { cwd: resolve(root, 'tauri') });
} else {
  console.log('  Nothing to clean (tauri/target/ does not exist)');
}

console.log('\n=== All build artifacts cleaned ===');
