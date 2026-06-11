/**
 * deploy.mjs — stamps sw.js with a unique cache version then deploys.
 * Run with: node deploy.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const SW_PATH = './public/sw.js';
const version = Date.now().toString();

// Inject version into sw.js
const sw = readFileSync(SW_PATH, 'utf8');
const stamped = sw.replace('__CACHE_VERSION__', version);
writeFileSync(SW_PATH, stamped, 'utf8');

console.log(`[deploy] Cache version: ${version}`);

try {
  execSync('npm run build', { stdio: 'inherit' });
  execSync('npx gh-pages -d dist', { stdio: 'inherit' });
  console.log('[deploy] Done ✓');
} finally {
  // Restore placeholder so git doesn't track the stamped version
  writeFileSync(SW_PATH, sw, 'utf8');
}
