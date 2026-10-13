import {readFileSync} from 'node:fs';
import {parseLocalConfig, localConfigUrl} from '../cost-control/local-config.js';

// Offline gate only: does not read credentials, contact APIs or deploy anything.
try {
  const project = process.env.GCLOUD_PROJECT;
  parseLocalConfig(project, readFileSync(localConfigUrl(project), 'utf8'));
  console.log('Cost guard local configuration validated. Live coverage/IAM checks are still required.');
} catch {
  console.error('Cost guard deployment blocked: approved project, mode and valid local configuration required. See docs/SERVER_COST_CONTROL.md.');
  process.exitCode = 1;
}
