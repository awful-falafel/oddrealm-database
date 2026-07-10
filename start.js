import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('\x1b[35m[Odd Realm Modding Studio]\x1b[0m Starting backend and frontend servers...');

// Spawn backend server
const backend = spawn('node', ['server.js'], { cwd: __dirname, shell: true });

backend.stdout.on('data', (data) => {
  console.log(`\x1b[36m[Backend]\x1b[0m ${data.toString().trim()}`);
});

backend.stderr.on('data', (data) => {
  console.error(`\x1b[31m[Backend Error]\x1b[0m ${data.toString().trim()}`);
});

// Spawn Vite frontend
const frontend = spawn('npx', ['vite'], { cwd: __dirname, shell: true });

frontend.stdout.on('data', (data) => {
  const output = data.toString().trim();
  // Filter out some Vite noise if desired
  console.log(`\x1b[32m[Vite Frontend]\x1b[0m ${output}`);
});

frontend.stderr.on('data', (data) => {
  console.error(`\x1b[31m[Vite Error]\x1b[0m ${data.toString().trim()}`);
});

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});
