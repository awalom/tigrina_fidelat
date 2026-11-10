// Writes auth-config.json (salted PBKDF2 hash only, never the plaintext) from
// SITE_USERNAME and SITE_PASSWORD. Run by the deploy workflow.
// Usage: node tools/generate-auth-config.mjs [output-path]  (default: ./auth-config.json)
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { writeFileSync } from 'node:fs';

const { SITE_USERNAME: username, SITE_PASSWORD: password } = process.env;
if (!username || !password) {
  console.error('SITE_USERNAME and SITE_PASSWORD must be set.');
  process.exit(1);
}

const iterations = 200000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(`${username.trim().toLowerCase()}\n${password}`, salt, iterations, 32, 'sha256');
const output = process.argv[2] || new URL('../auth-config.json', import.meta.url);
writeFileSync(output, JSON.stringify({ salt: salt.toString('hex'), iterations, hash: hash.toString('hex') }) + '\n');
console.log(`Login config written to ${output}.`);
