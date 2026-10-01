import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// One app version, one place: package.json. Everything else reads it or documents it.
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const pkg = JSON.parse(read('package.json'));
const [major, minor, patch] = pkg.version.split('-')[0].split('.').map(Number);
const short = patch === 0 ? `${major}\\.${minor}(?:\\.0)?` : `${major}\\.${minor}\\.${patch}`;

test('package.json holds a plain x.y.z version and the lockfile agrees with it', () => {
  assert.match(pkg.version, /^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
  const lock = JSON.parse(read('package-lock.json'));
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[''].version, pkg.version);
});

test('the Android app reads its version from package.json instead of keeping its own number', () => {
  const gradle = read('android/app/build.gradle');
  assert.match(gradle, /JsonSlurper\(\)\.parse\(file\('\.\.\/\.\.\/package\.json'\)\)\.version/);
  assert.match(gradle, /versionName appVersion/);
  assert.match(gradle, /versionCode appVersionCode/);
  assert.match(gradle, /appVersionParts\[0\] \* 1000000 \+ appVersionParts\[1\] \* 1000 \+ appVersionParts\[2\]/);
  // No hand-written number may come back.
  assert.doesNotMatch(gradle, /versionName\s+["']/);
  assert.doesNotMatch(gradle, /versionCode\s+\d/);
});

test('the Android version code grows with every version and matches the formula in build.gradle', () => {
  const code = (v) => { const [a, b, c] = v.split('.').map(Number); return a * 1000000 + b * 1000 + c; };
  assert.equal(code(pkg.version.split('-')[0]), major * 1000000 + minor * 1000 + patch);
  const order = ['0.19.1', '0.27.2', '0.28.0', '0.32.0', '0.32.1', '0.33.0', '1.0.0'];
  for (let i = 1; i < order.length; i++) assert.ok(code(order[i]) > code(order[i - 1]), order[i]);
  assert.equal(code('0.32.0'), 32000);
});

test('the in-game version comes from package.json at build time', () => {
  assert.match(read('vite.config.js'), /readFileSync\(new URL\('\.\/package\.json'/);
  assert.match(read('vite.config.js'), /__APP_VERSION__: JSON\.stringify\(version\)/);
  assert.match(read('src/version.js'), /__APP_VERSION__/);
  assert.match(read('src/home-view.js'), /APP_VERSION/);
});

test('every version is documented: README section, verification entry and the continue notes', () => {
  assert.match(read('README.md'), new RegExp(`^## ${short}(?![\\d.])`, 'm'), 'README.md needs a "## <version> title" section');
  assert.match(read('검증결과.md'), new RegExp(`^# 검증 결과 · .*\\b${short}\\s*$`, 'm'), '검증결과.md needs a "# 검증 결과 · title <version>" entry');
  assert.match(read('CONTINUE.md'), new RegExp(`\\b${major}\\.${minor}\\b`), 'CONTINUE.md must mention the current version');
});
