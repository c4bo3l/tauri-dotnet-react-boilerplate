import { existsSync, unlinkSync } from 'fs';
import { resolve } from 'path';

const dbFiles = ['app.db', 'app.db-shm', 'app.db-wal'];

const candidates = [
  // Debug build output (dev)
  resolve('backend/bin/Debug/net10.0/osx-x64'),
  // Release build output (build-dotnet.mjs output)
  resolve('backend/bin/Release/net10.0/osx-x64/publish'),
  // Old src-tauri location
  resolve('src-tauri'),
];

let deleted = false;

for (const dir of candidates) {
  for (const file of dbFiles) {
    const path = resolve(dir, file);
    if (existsSync(path)) {
      unlinkSync(path);
      console.log(`Deleted: ${path}`);
      deleted = true;
    }
  }
}

if (!deleted) {
  console.log('No database files found.');
}
