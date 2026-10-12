import {readFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {MODERATION_RUNTIME_ACCOUNT_PARAM,requireModerationRuntimeAccount} from '../server/moderation-runtime-account.js';

// Offline predeploy gate. Require the exact project file, never a shell-only
// value or interactive fallback that the deployment manifest might not use.
try {
  const project=process.env.GCLOUD_PROJECT;
  if(!['budae-kiugi-dev','budae-kiugi-prod'].includes(project))throw Error('invalid-project');
  const file=new URL('../server/.env.'+project,import.meta.url);
  const value=parseEnv(readFileSync(file,'utf8'))[MODERATION_RUNTIME_ACCOUNT_PARAM];
  const account=requireModerationRuntimeAccount(value);
  if(!account.endsWith('@'+project+'.iam.gserviceaccount.com'))throw Error('project-mismatch');
  console.log('Moderation runtime account configuration passed offline validation; IAM is not verified.');
} catch {
  // Never print config values, file content, identities or raw filesystem errors.
  console.error('Deployment blocked: set a valid MODERATION_RUNTIME_SERVICE_ACCOUNT in server/.env.<project-id> for the explicit target project.');
  process.exitCode=1;
}
