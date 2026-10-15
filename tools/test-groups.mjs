// Long campaign sweeps and the multiweek growth model belong in the slow group.
// New test files default to fast; no test is omitted from the two groups.
export const SLOW_TEST_FILES = Object.freeze([
  'campaign-progression.test.js',
  'campaign-space.test.js',
  'campaign.test.js',
  'erebus-update.test.js',
  'growth-balance.test.js',
]);

export function partitionTests(testFiles) {
  if (new Set(testFiles).size !== testFiles.length) {
    throw new Error('Duplicate test file in test groups.');
  }
  const all = [...testFiles].sort();
  if (all.some(name => !/^[^/\\]+\.test\.js$/.test(name))) {
    throw new Error('Test groups accept only top-level .test.js filenames.');
  }
  const missing = SLOW_TEST_FILES.filter(name => !all.includes(name));
  if (missing.length) {
    throw new Error(`Update the slow test list: ${missing.join(', ')}`);
  }
  const slowSet = new Set(SLOW_TEST_FILES);
  return {
    fast: all.filter(name => !slowSet.has(name)),
    slow: all.filter(name => slowSet.has(name)),
  };
}
