import {onSchedule} from 'firebase-functions/v2/scheduler';
import * as logger from 'firebase-functions/logger';
import {createHash} from 'node:crypto';
import {createMaintenanceRuntime} from './maintenance-runtime.js';
import {MAINTENANCE_POLICY,MAINTENANCE_FUNCTION_OPTIONS} from './maintenance-policy.js';

// onSchedule provisions a Scheduler-authenticated endpoint, not a callable.
// ALLOW_INTERNAL_ONLY also restricts ingress. Actual IAM must be checked after
// the owner's separate deployment approval; there is no public fallback.
export function createScheduledMaintenance({schedule=onSchedule,runtime,log=logger}={}) {
  const handler=kind=>async event=>{
    try {
      if(typeof event?.scheduleTime!=='string'||!Number.isFinite(Date.parse(event.scheduleTime)))throw Error('maintenance-invalid-event');
      const invocationId=createHash('sha256').update(`${kind}:${event.scheduleTime}`).digest('hex');
      const result=await (runtime??createMaintenanceRuntime())({kind,invocationId});
      const summary={job:kind,visited:result.visited??0,failed:result.failed??0,
        budgetReached:result.budgetReached===true,limitReached:result.limitReached===true,skipped:result.skipped??null};
      if(summary.failed||summary.budgetReached||summary.limitReached||summary.skipped==='retry-limit')log.warn('maintenance.result',summary);
      else log.info('maintenance.result',summary);
      return result;
    } catch {
      // The SDK logs thrown messages: replace raw SDK errors before rethrowing.
      log.error('maintenance.failed',{job:kind});
      throw Error('maintenance-failed');
    }
  };
  return {
    retryAccountDeletions:schedule({...MAINTENANCE_FUNCTION_OPTIONS,schedule:MAINTENANCE_POLICY.deletionSchedule},handler('deletion')),
    purgeExpiredServerRecords:schedule({...MAINTENANCE_FUNCTION_OPTIONS,schedule:MAINTENANCE_POLICY.expirySchedule},handler('expiry')),
  };
}
