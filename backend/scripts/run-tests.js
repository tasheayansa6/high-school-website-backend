/**
 * Run each backend test file in an isolated Node process.
 * Shared in-process module cache would otherwise let rate-limit / media env
 * overrides from one file poison later suites (e.g. 429 instead of 422).
 */
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const testsDir = path.join(__dirname, '..', 'tests');
const files = fs
  .readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => path.join(testsDir, name));

if (files.length === 0) {
  console.error('No backend test files found.');
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const relative = path.relative(path.join(__dirname, '..'), file);
  console.log(`\n=== ${relative} ===`);
  const result = spawnSync(process.execPath, ['--test', file], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} test file(s) failed.`);
  process.exit(1);
}

console.log(`\nAll ${files.length} backend test files passed.`);
