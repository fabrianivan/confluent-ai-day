#!/usr/bin/env node
const { spawn } = require('child_process');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[35m%s\x1b[0m', '🌋 Starting Krakatau Sentinel (Backend + Frontend)...');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

// 1. Start Go Backend
console.log('\x1b[36m%s\x1b[0m', '🚀 [BACKEND] Starting Go API server on :8080...');
const backend = spawn('go', ['run', 'cmd/server/main.go'], {
  cwd: path.join(rootDir, 'backend'),
  stdio: 'inherit',
  env: { ...process.env },
});

backend.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `❌ [BACKEND ERROR] ${err.message}`);
});

// 2. Start Next.js Dashboard
console.log('\x1b[32m%s\x1b[0m', '🌐 [FRONTEND] Starting Next.js dashboard on :3000...');
const frontend = spawn('npm', ['run', 'dev'], {
  cwd: path.join(rootDir, 'dashboard'),
  stdio: 'inherit',
  env: { ...process.env },
});

frontend.on('error', (err) => {
  console.error('\x1b[31m%s\x1b[0m', `❌ [FRONTEND ERROR] ${err.message}`);
});

// Handle termination
function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', '🛑 Shutting down Krakatau Sentinel...');
  try { backend.kill('SIGINT'); } catch (_) {}
  try { frontend.kill('SIGINT'); } catch (_) {}
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
