import { execSync } from 'child_process';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: root, ...opts });
}

console.log('=== Installing all dependencies ===\n');

// 1. Node / frontend
console.log('--- Node.js (frontend + root) ---');
run('npm install');

// 2. .NET
console.log('\n--- .NET (backend) ---');
run('dotnet restore backend/dotnet-backend.slnx');
run('dotnet tool restore', { cwd: resolve(root, 'backend') });

// 3. Rust / Tauri
console.log('\n--- Rust / Tauri ---');
run('cargo fetch', { cwd: resolve(root, 'tauri') });

console.log('\n=== All dependencies installed ===');
