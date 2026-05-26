import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');
const oldName = 'tauri-dotnet-app';

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: node scripts/rename.mjs <new-name>');
  console.error('  Renames the project from "tauri-dotnet-app" to <new-name>');
  process.exit(1);
}

const newName = args[0];
const newIdentifier = `com.${newName.replace(/[^a-zA-Z0-9-]/g, '-')}.dev`;

const files = [
  resolve(root, 'package.json'),
  resolve(root, 'frontend/package.json'),
  resolve(root, 'frontend/index.html'),
  resolve(root, 'tauri/tauri.conf.json'),
  resolve(root, 'README.md'),
];

let updated = 0;

for (const file of files) {
  let content = readFileSync(file, 'utf-8');
  const original = content;

  if (file.endsWith('tauri.conf.json')) {
    content = content.replace(
      `"identifier": "com.${oldName}.dev"`,
      `"identifier": "${newIdentifier}"`,
    );
  }

  // Replace all occurrences of the old name
  content = content.replaceAll(oldName, newName);

  if (content !== original) {
    writeFileSync(file, content, 'utf-8');
    updated++;
    const path = file.replace(resolve(root) + '/', '');
    console.log(`  Updated: ${path}`);
  }
}

if (updated > 0) {
  console.log(`\nDone. Renamed "${oldName}" to "${newName}" across ${updated} files.`);
  console.log(`Identifier set to "${newIdentifier}".`);
} else {
  console.log('No changes made (already renamed?).');
}
