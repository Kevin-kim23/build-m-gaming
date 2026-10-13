import {readFileSync} from 'node:fs';
import {PROJECT, readConfig} from '../cost-control/policy.js';

// Offline gate only: does not read credentials, contact APIs or deploy anything.
try {
  if (process.env.GCLOUD_PROJECT !== PROJECT) throw Error('cost-config-project-or-account');
  const source = readFileSync(new URL(`../cost-control/.env.${PROJECT}`, import.meta.url), 'utf8');
  const env = {GCLOUD_PROJECT: process.env.GCLOUD_PROJECT};
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^(COST_GUARD_[A-Z_]+)=([^\s#]+)$/);
    if (!m || Object.hasOwn(env, m[1])) throw Error('cost-config-invalid-env');
    env[m[1]] = m[2];
  }
  readConfig(env);
  console.log('Cost guard local configuration validated. Live coverage/IAM checks are still required.');
} catch {
  console.error('Cost guard deployment blocked: approved development project and valid local configuration required. See docs/SERVER_COST_CONTROL.md.');
  process.exitCode = 1;
}
