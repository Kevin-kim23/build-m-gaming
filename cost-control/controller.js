import {parseNotice, validateBudget, nextState, TARGETS} from './policy.js';

import {validateConfigPolicy} from './projects.js';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// All cloud effects are injected: tests cannot accidentally pause a real server.
// Lease store checkpoints intent BEFORE a remote mutation, for crash-safe recovery.
export async function handleBudget({message, config, store, cloud, now = Date.now, log}) {
  validateConfigPolicy(config);
  const deadline = now() + 210_000;
  const notice = parseNotice(message, config, now());
  if (!notice.current) return {status: 'ignored-old-period'};
  validateBudget(await cloud.budget(), config);
  if (!config.enforce) {
    // No lease or state write in observe mode; only resource read permissions.
    for (const target of TARGETS) await cloud.inspect(target);
    return {status: 'observe', desired: notice.cost >= config.limitKrw ? 'paused' : 'running'};
  }
  return store.exclusive(async (previous, checkpoint) => {
    if (previous.project && previous.project !== config.project) throw Error('cost-state-project');
    if (!previous.project && Object.keys(previous).length && config.project !== 'budae-kiugi-dev')
      throw Error('cost-state-project');
    let state = nextState(previous, notice, config.limitKrw);
    if (!state) return {status: 'ignored-stale-notice'};
    state.project = config.project;
    if (previous.hold === true) return {status: 'operator-hold'};
    await checkpoint(state);
    // Jobs first when stopping; restore services before enabling scheduled work.
    const targets = state.desired === 'paused' ? TARGETS : [...TARGETS].reverse();
    const errors = [];
    for (const target of targets) {
      if (now() >= deadline) {
        errors.push({target, code: 'cost-runtime-limit'});
        log('cost-control.resource', {target, code: 'cost-runtime-limit'});
        break;
      }
      let record = state.resources[target];
      if (state.desired === 'running' && !record) continue;
      // Don't resume jobs until every service has been restored successfully.
      if (state.desired === 'running' && target.startsWith('job:') && errors.length) continue;
      try {
        const current = await cloud.inspect(target);
        if (!record) {
          record = {name: current.name, identity: current.identity, original: current.setting, restored: false};
          state.resources[target] = record;
          await checkpoint(state);
        }
        if (record.name !== current.name || record.identity !== current.identity)
          throw Error('cost-resource-replaced');
        const stopped = cloud.stopped(current);
        const desired = state.desired === 'paused' ? stopped : record.original;
        // Never overwrite an operator's different settings or restore a new revision.
        if (!same(current.setting, desired) && !same(current.setting, record.original) && !same(current.setting, stopped))
          throw Error('cost-resource-drift');
        if (state.desired === 'paused') {
          record.restored = false;
          await checkpoint(state);
        }
        if (!same(current.setting, desired)) {
          // Recheck the lease/manual hold immediately before the external write.
          await checkpoint(state);
          await cloud.apply(current, desired);
          const after = await cloud.inspect(target);
          if (after.name !== record.name || after.identity !== record.identity || !same(after.setting, desired))
            throw Error('cost-resource-not-settled');
        }
        record.restored = state.desired === 'running';
        await checkpoint(state);
      } catch (error) {
        if (error?.message === 'cost-lease-lost' || error?.message === 'cost-operator-hold') throw error;
        // Only known diagnostic codes, never SDK error payloads or billing/account IDs.
        const code = /^cost-[a-z-]+$/.test(error?.message) ? error.message : 'cost-cloud-operation-failed';
        errors.push({target, code});
        log('cost-control.resource', {target, code});
      }
    }
    if (state.desired === 'running' && !errors.length) state.resources = {};
    state.status = errors.length ? 'partial' : state.desired;
    state.errors = errors;
    await checkpoint(state);
    return {status: state.status, failed: errors.length};
  });
}
