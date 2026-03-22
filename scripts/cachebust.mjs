/**
 * Post-build cache busting script.
 * Reads dist/_worker.js, replaces static asset references with ?v=<hash> query strings.
 * The hash is derived from the file content so it changes only when the file changes.
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

const DIST = 'dist';
const WORKER = join(DIST, '_worker.js');

// Files to cache-bust
const ASSETS = [
  'static/app.js',
  'static/style.css',
  'static/admin.js',
  'static/admin.css',
  'static/fontawesome.css',
];

if (!existsSync(WORKER)) {
  console.error('dist/_worker.js not found, skipping cache bust');
  process.exit(0);
}

let worker = readFileSync(WORKER, 'utf-8');
let changed = 0;

for (const asset of ASSETS) {
  const filePath = join(DIST, asset);
  if (!existsSync(filePath)) continue;

  const content = readFileSync(filePath);
  const hash = createHash('md5').update(content).digest('hex').slice(0, 8);
  const ref = `/static/${asset.replace('static/', '')}`;

  // Replace all occurrences of the reference in _worker.js
  // Match: /static/app.js or /static/app.js?v=xxxx (update existing)
  const regex = new RegExp(ref.replace('.', '\\.') + '(\\?v=[a-f0-9]+)?', 'g');
  const newRef = `${ref}?v=${hash}`;
  const before = worker;
  worker = worker.replace(regex, newRef);
  if (worker !== before) {
    changed++;
    console.log(`  ${ref} → ${newRef}`);
  }
}

if (changed > 0) {
  writeFileSync(WORKER, worker);
  console.log(`✅ Cache busted ${changed} asset references`);
} else {
  console.log('⚠️  No asset references found to update');
}
