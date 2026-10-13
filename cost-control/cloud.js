import {createHash} from 'node:crypto';
import {budgetName, REGION, TARGETS} from './policy.js';

const canonical = value => Array.isArray(value) ? value.map(canonical) :
  value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const signature = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const stoppedService = {mode: 'MANUAL', count: 0};
const allowedApis = new Set(['billingbudgets', 'cloudfunctions', 'run', 'cloudscheduler']);

// request is a GoogleAuth client request function, injectable for protocol tests.
export function cloudGateway(config, request, {now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms))} = {}) {
  const prefix = `projects/${config.project}/locations/${REGION}`;
  const prefixes = [prefix, ...(config.projectNumber ? [`projects/${config.projectNumber}/locations/${REGION}`] : [])];
  const owned = (name, collection, pattern) => typeof name === 'string' && prefixes.some(base =>
    name.startsWith(`${base}/${collection}/`) && pattern.test(name.slice(`${base}/${collection}/`.length)));
  const deadline = now() + 240_000;
  async function call(api, path, method = 'GET', data) {
    if (now() >= deadline - 10_000) throw Error('cost-runtime-limit');
    if (!allowedApis.has(api) || path.includes('..') || path.includes('://')) throw Error('cost-api-path');
    const version = ['run', 'cloudfunctions'].includes(api) ? 'v2' : 'v1';
    try {
      const response = await request({url: `https://${api}.googleapis.com/${version}/${path}`,
        method, ...(data === undefined ? {} : {data}), timeout: 10_000, retry: false});
      return response.data;
    } catch (error) {
      const status = error?.response?.status;
      throw Error(status === 401 || status === 403 ? 'cost-api-permission-denied' :
        status === 404 ? 'cost-api-resource-missing' : status === 409 || status === 412 ? 'cost-api-conflict' :
        status === 429 ? 'cost-api-rate-limited' : 'cost-api-unavailable');
    }
  }
  async function fn(name) {
    const f = await call('cloudfunctions', `${prefix}/functions/${name}`);
    const service = f.serviceConfig?.service;
    if (!prefixes.some(base => f.name === `${base}/functions/${name}`) || f.environment !== 'GEN_2' ||
        f.state !== 'ACTIVE' || !owned(service, 'services', /^[a-z][a-z0-9-]*$/))
      throw Error('cost-function-not-ready');
    return f;
  }
  async function jobs() {
    const all = [];
    let token;
    do {
      const page = await call('cloudscheduler', `${prefix}/jobs?pageSize=100${token ? `&pageToken=${encodeURIComponent(token)}` : ''}`);
      all.push(...page.jobs ?? []);
      token = page.nextPageToken;
      if (all.length > 500 || (token && !page.jobs?.length)) throw Error('cost-job-list-too-large');
    } while (token);
    return all;
  }
  async function inspect(target) {
    if (!TARGETS.includes(target)) throw Error('cost-target-denied');
    const [kind, name] = target.split(':'), f = await fn(name);
    if (kind === 'service') {
      const s = await call('run', f.serviceConfig.service);
      if (!owned(s.name, 'services', /^[a-z][a-z0-9-]*$/) ||
          s.name.split('/').at(-1) !== f.serviceConfig.service.split('/').at(-1) ||
          !s.uid || !s.etag || !s.latestReadyRevision || s.reconciling)
        throw Error('cost-service-not-ready');
      // Tag-only revisions are not stopped by manual zero scaling. Never claim coverage.
      if ([...(s.traffic ?? []), ...(s.trafficStatuses ?? [])].some(t => t.tag)) throw Error('cost-service-traffic-tags');
      const mode = s.scaling?.scalingMode || 'AUTOMATIC';
      if (!['AUTOMATIC', 'MANUAL'].includes(mode)) throw Error('cost-scaling-mode');
      const count = mode === 'MANUAL' ? s.scaling?.manualInstanceCount ?? 0 : null;
      if (count !== null && (!Number.isInteger(count) || count < 0)) throw Error('cost-scaling-count');
      return {kind, name: s.name, identity: signature([s.uid, s.latestReadyRevision]),
        setting: {mode, count}, etag: s.etag};
    }
    const matches = (await jobs()).filter(j => j.httpTarget?.uri === f.serviceConfig.uri);
    if (matches.length !== 1) throw Error('cost-job-target-mismatch');
    const j = matches[0];
    if (!owned(j.name, 'jobs', /^[a-zA-Z0-9_-]+$/) ||
        !['ENABLED', 'PAUSED'].includes(j.state)) throw Error('cost-job-not-ready');
    return {kind, name: j.name, identity: signature([j.name, j.schedule, j.timeZone, j.httpTarget, j.retryConfig]),
      setting: j.state};
  }
  async function apply(current, desired) {
    if (current.kind === 'job') {
      await call('cloudscheduler', `${current.name}:${desired === 'PAUSED' ? 'pause' : 'resume'}`, 'POST', {});
      return;
    }
    // Explicit field mask preserves max/min instances, IAM, ingress, image and env.
    let operation = await call('run', `${current.name}?updateMask=scaling.scalingMode,scaling.manualInstanceCount`,
      'PATCH', {name: current.name, etag: current.etag,
        scaling: {scalingMode: desired.mode, manualInstanceCount: desired.count}});
    const deadline = now() + 12_000;
    while (!operation.done) {
      if (!owned(operation.name, 'operations', /^[a-zA-Z0-9_-]+$/)) throw Error('cost-operation-path');
      if (now() >= deadline) throw Error('cost-operation-pending');
      await sleep(1_000);
      operation = await call('run', operation.name);
    }
    if (operation.error) throw Error('cost-operation-failed');
  }
  return {budget: () => call('billingbudgets', budgetName(config)), inspect, apply,
    stopped: current => current.kind === 'job' ? 'PAUSED' : stoppedService};
}
