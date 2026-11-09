#!/usr/bin/env node
/**
 * Scan frontend production build output for accidental secret-like strings.
 * Reports match categories and file names only — never prints matched values.
 *
 * Usage: node scripts/check-bundle-secrets.mjs [distDir]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist'));

const PATTERNS = [
  { id: 'mysql_url', re: /mysql:\/\/[^\s"'`]+/gi },
  { id: 'postgres_url', re: /postgres(?:ql)?:\/\/[^\s"'`]+/gi },
  { id: 'jwt_env_assign', re: /JWT_SECRET\s*[:=]/gi },
  { id: 'db_password_assign', re: /DATABASE_PASSWORD\s*[:=]/gi },
  { id: 'smtp_pass_assign', re: /SMTP_PASS\s*[:=]/gi },
  { id: 's3_secret_assign', re: /S3_SECRET_ACCESS_KEY\s*[:=]/gi },
  { id: 'aws_access_key_id', re: /AKIA[0-9A-Z]{16}/g },
  { id: 'pem_private_key', re: /-----BEGIN (?:RSA )?PRIVATE KEY-----/g },
];

/** Strings that may appear in DEV-only source; must not ship in production bundles. */
const FORBIDDEN_LITERALS = [
  { id: 'dev_default_password', value: 'Admin123456!' },
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(js|mjs|cjs|css|html|map|json|txt)$/i.test(entry.name)) out.push(full);
  }
  return out;
}

if (!fs.existsSync(distDir)) {
  console.error(`FAIL: dist directory not found: ${distDir}`);
  console.error('Run `npm run build` first.');
  process.exit(1);
}

const files = walk(distDir);
const findings = [];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  const rel = path.relative(distDir, file);

  for (const pattern of PATTERNS) {
    const matches = content.match(pattern.re);
    if (matches && matches.length > 0) {
      findings.push({ file: rel, id: pattern.id, count: matches.length });
    }
  }

  for (const lit of FORBIDDEN_LITERALS) {
    if (content.includes(lit.value)) {
      findings.push({ file: rel, id: lit.id, count: 1 });
    }
  }
}

if (findings.length > 0) {
  console.error('FAIL: potential secret or sensitive material detected in frontend build (values redacted).');
  for (const f of findings) {
    console.error(` - ${f.id} x${f.count} in ${f.file}`);
  }
  process.exit(1);
}

console.log(`OK: scanned ${files.length} build file(s); no secret-pattern matches.`);
process.exit(0);
