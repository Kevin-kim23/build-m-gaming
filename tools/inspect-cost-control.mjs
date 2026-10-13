import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {PROJECT, readConfig, validateBudget, TARGETS} from '../cost-control/policy.js';
import {cloudGateway} from '../cost-control/cloud.js';

// Read-only deployed-resource preflight, with owner's Application Default Credentials.
// No budget edits, service scaling, scheduler state changes or record uploads.
try {
  const env = parseEnv(readFileSync(new URL(`../cost-control/.env.${PROJECT}`, import.meta.url), 'utf8'));
  const config = readConfig({...env, GCLOUD_PROJECT: PROJECT});
  const {GoogleAuth} = await import('../cost-control/node_modules/google-auth-library/build/src/index.js');
  const client = await new GoogleAuth({scopes: ['https://www.googleapis.com/auth/cloud-platform']}).getClient();
  const cloud = cloudGateway(config, options => client.request(options));
  validateBudget(await cloud.budget(), config);
  for (const target of TARGETS) {
    const resource = await cloud.inspect(target);
    console.log(`${target}: ${resource.kind === 'job' ? resource.setting : resource.setting.mode} verified`);
  }
  console.log('Read-only coverage passed. Does not prove guard IAM, delivery or actual pause/resume.');
} catch {
  console.error('Read-only cost-control validation failed. No settings changed. Check local config, deployed functions, budget scope and credentials.');
  process.exitCode = 1;
}
