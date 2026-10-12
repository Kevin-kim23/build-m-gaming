// User decisions, 2026-10-12. These are code settings; no cloud configuration was changed.
export const SECURITY_POLICY = Object.freeze({
  windowMs: 60_000,
  readLimit: 30,
  writeLimit: 10,
  deletionRetentionMs: 90 * 24 * 60 * 60 * 1000,
});
export const TRUSTED_APP_IDS = Object.freeze({
  'budae-kiugi-prod': ['1:745998969505:android:01f3707464738582a71ee0'],
  'budae-kiugi-dev': ['1:96394423737:android:854aaaf4efc2920b71da68'],
});
