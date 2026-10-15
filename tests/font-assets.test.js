import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const read = path => readFileSync(new URL('../' + path, import.meta.url));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

test('the shipped font is the fully verified WOFF2 and the original stays out of public', () => {
  const record = JSON.parse(read('docs/font-conversion.json'));
  const source = read(record.source), webfont = read(record.output);
  assert.equal(webfont.subarray(0, 4).toString(), 'wOF2');
  assert.equal(sha256(source), record.sourceSha256);
  assert.equal(sha256(webfont), record.outputSha256);
  assert.equal(source.length, record.sourceBytes);
  assert.equal(webfont.length, record.outputBytes);
  assert.equal(webfont.readUInt16BE(12), source.readUInt16BE(4) - 1, 'Only the empty DSIG table is omitted');
  assert.equal(record.fullGlyphSet, true);
  assert.equal(record.glyphCount, 2734);
  assert.equal(record.unicodeCodepointCount, 2733);
  assert.equal(existsSync(new URL('../public/fonts/black-han-sans/BlackHanSans-Regular.ttf', import.meta.url)), false);
  assert.match(read('src/store.css').toString(), /BlackHanSans-Regular\.woff2'\) format\('woff2'\)/);
});

test('runtime inventory hashes the shipped webfont and retains the original OFL', () => {
  const inventory = JSON.parse(read('docs/licenses/runtime-inventory.json'));
  const record = JSON.parse(read('docs/font-conversion.json'));
  assert.equal(inventory.find(row => row.coordinate === 'Black Han Sans Regular').sha256, record.outputSha256);
  assert.deepEqual(read('public/fonts/black-han-sans/OFL.txt'), read('assets/source-fonts/black-han-sans/OFL.txt'));
});
