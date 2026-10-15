import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { partitionTests } from './test-groups.mjs';

const [group, ...extra] = process.argv.slice(2);
if (!['fast', 'slow'].includes(group) || extra.length) {
  console.error('Usage: node tools/run-tests.mjs fast|slow');
  process.exitCode = 1;
} else {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const testFiles = readdirSync(new URL('../tests/', import.meta.url), { withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.endsWith('.test.js'))
    .map(entry => entry.name);
  const selected = partitionTests(testFiles)[group];
  console.log(`[test:${group}] ${selected.length} files; run npm test before release.`);
  const result = spawnSync(process.execPath, ['--test', ...selected.map(name => `tests/${name}`)], {
    cwd: root,
    stdio: 'inherit',
  });
  if (result.error) console.error('Could not run test group:', result.error.message);
  process.exitCode = result.status ?? 1;
}
