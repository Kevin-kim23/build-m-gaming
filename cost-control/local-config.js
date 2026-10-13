import {projectPolicy} from './projects.js';
import {readConfig} from './policy.js';

// Strict offline parser shared by deployment and read-only inspection.
export function parseLocalConfig(project, source) {
  projectPolicy(project);
  const env = {GCLOUD_PROJECT: project};
  const allowed = new Set(['PROJECT_ID', 'LIMIT_KRW', 'TOPIC', 'PROJECT_NUMBER',
    'BILLING_ACCOUNT', 'BUDGET_ID', 'RUNTIME_ACCOUNT', 'MODE'].map(k => `COST_GUARD_${k}`));
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const m = line.match(/^(COST_GUARD_[A-Z_]+)=([^\s#]+)$/);
    if (!m || !allowed.has(m[1]) || Object.hasOwn(env, m[1])) throw Error('cost-config-invalid-env');
    env[m[1]] = m[2];
  }
  return readConfig(env);
}
export function localConfigUrl(project) {
  projectPolicy(project); // Validate before constructing a filesystem path.
  return new URL(`.env.${project}`, import.meta.url);
}
