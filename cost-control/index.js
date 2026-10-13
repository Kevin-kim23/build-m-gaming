import {initializeApp} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {onMessagePublished} from 'firebase-functions/v2/pubsub';
import {GoogleAuth} from 'google-auth-library';
import {handleBudget} from './controller.js';
import {cloudGateway} from './cloud.js';
import {leaseStore} from './store.js';
import {readConfig, REGION, TOPIC, RUNTIME_ACCOUNT} from './policy.js';

initializeApp();
const auth = new GoogleAuth({scopes: ['https://www.googleapis.com/auth/cloud-platform']});
export const budgetCostGuard = onMessagePublished({
  topic: TOPIC, region: REGION, serviceAccount: RUNTIME_ACCOUNT,
  minInstances: 0, maxInstances: 1, concurrency: 1, cpu: 1, memory: '256MiB', timeoutSeconds: 300,
  // Billing republishes repeatedly. Don't generate a retry storm on invalid IAM/config.
  retry: false,
}, async event => {
  const log = (area, fields) => console.error(JSON.stringify({severity: 'ERROR', area, ...fields}));
  try {
    const config = readConfig(process.env);
    const client = await auth.getClient();
    const result = await handleBudget({message: event.data.message, config,
      store: leaseStore(getFirestore()), cloud: cloudGateway(config, options => client.request(options)), log});
    console.log(JSON.stringify({severity: 'INFO', area: 'cost-control.result', ...result}));
  } catch (error) {
    const code = /^cost-[a-z-]+$/.test(error?.message) ? error.message : 'cost-control-failed';
    log('cost-control.notification', {code});
    // No raw message, OAuth token, billing ID or error payload goes to logs.
    throw Error(code);
  }
});
