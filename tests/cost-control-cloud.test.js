import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {cloudGateway} from '../cost-control/cloud.js';
import {PROJECT, REGION, TARGETS, RUNTIME_ACCOUNT} from '../cost-control/policy.js';

const config = {project: PROJECT, projectNumber: '123456789012', billingAccount: 'AAAAAA-BBBBBB-CCCCCC', budgetId: 'synthetic-budget'};
const prefix = `projects/${PROJECT}/locations/${REGION}`;
function fixture() {
  let service = {name: `${prefix}/services/readprofile`, uid: 'synthetic-uid', etag: 'e1', latestReadyRevision: 'revision-1',
    scaling: {scalingMode: 'AUTOMATIC', minInstanceCount: 0, maxInstanceCount: 2}};
  const job = {name: `${prefix}/jobs/synthetic-job`, schedule: '0 */6 * * *', state: 'ENABLED',
    httpTarget: {uri: 'https://synthetic.a.run.app'}};
  const calls = [];
  const request = async input => {
    calls.push(input); const {url, method, data} = input;
    if (url.includes('cloudfunctions.googleapis')) return {data: {
      name: url.split('/v2/')[1], environment: 'GEN_2', state: 'ACTIVE',
      serviceConfig: {service: service.name, uri: job.httpTarget.uri}}};
    if (url.includes('cloudscheduler.googleapis')) {
      if (method === 'POST') {job.state = url.endsWith(':pause') ? 'PAUSED' : 'ENABLED'; return {data: job};}
      return {data: {jobs: [job]}};
    }
    if (method === 'PATCH') {
      service.scaling = {...service.scaling, ...data.scaling}; service.etag = 'e2';
      return {data: {name: `${prefix}/operations/op-1`, done: true}};
    }
    return {data: service};
  };
  return {calls, job, get service() {return service;}, setService(s) {service = s;}, request,
    cloud: cloudGateway(config, request)};
}
test('cloud adapter finds approved Function service and patches only scaling, retaining max instances and etag', async () => {
  const f = fixture(), before = await f.cloud.inspect('service:readProfile');
  await f.cloud.apply(before, f.cloud.stopped(before));
  const patch = f.calls.find(c => c.method === 'PATCH');
  assert.match(patch.url, /updateMask=scaling.scalingMode,scaling.manualInstanceCount$/);
  assert.deepEqual(patch.data, {name: before.name, etag: 'e1', scaling: {scalingMode: 'MANUAL', manualInstanceCount: 0}});
  assert.equal(f.service.scaling.maxInstanceCount, 2);
  assert.equal((await f.cloud.inspect('service:readProfile')).setting.count, 0);
  await f.cloud.apply(await f.cloud.inspect('service:readProfile'), before.setting);
  assert.deepEqual(f.calls.at(-1).data.scaling, {scalingMode: 'AUTOMATIC', manualInstanceCount: null});
  assert.ok(f.calls.every(c => c.retry === false && c.timeout === 10_000));
});
test('only allowlisted resources are inspected and tagged/reconciling services are rejected', async () => {
  const f = fixture();
  await assert.rejects(f.cloud.inspect('service:budgetCostGuard'), /cost-target-denied/);
  assert.equal(f.calls.length, 0);
  for (const edit of [{traffic: [{tag: 'test'}]}, {trafficStatuses: [{tag: 'tag-only'}]}, {reconciling: true}]) {
    const original = structuredClone(f.service); f.setService({...original, ...edit});
    await assert.rejects(f.cloud.inspect('service:readProfile'), /cost-service/);
    f.setService(original);
  }
});

test('canonical numeric project names are allowed only for the configured project', async () => {
  const f = fixture();
  f.setService({...f.service, name: `projects/${config.projectNumber}/locations/${REGION}/services/readprofile`});
  assert.equal((await f.cloud.inspect('service:readProfile')).name, f.service.name);
  f.setService({...f.service, name: `projects/987654321000/locations/${REGION}/services/readprofile`});
  await assert.rejects(f.cloud.inspect('service:readProfile'), /cost-function-not-ready/);
});
test('scheduler pause/resume targets actual function URI; already-paused is represented exactly', async () => {
  const f = fixture(), j = await f.cloud.inspect(TARGETS[0]);
  assert.equal(j.name, f.job.name);
  await f.cloud.apply(j, 'PAUSED');
  assert.match(f.calls.at(-1).url, /synthetic-job:pause$/);
  assert.equal((await f.cloud.inspect(TARGETS[0])).setting, 'PAUSED');
  await f.cloud.apply(j, 'ENABLED');
  assert.match(f.calls.at(-1).url, /synthetic-job:resume$/);
});

test('metadata key order does not impersonate a scheduler configuration change', async () => {
  const f = fixture(); f.job.httpTarget.headers = {a: '1', b: '2'};
  const first = await f.cloud.inspect(TARGETS[0]);
  f.job.httpTarget.headers = {b: '2', a: '1'};
  assert.equal((await f.cloud.inspect(TARGETS[0])).identity, first.identity);
});

test('cloud errors keep a useful status category without SDK response contents', async () => {
  const expected = {403: 'permission-denied', 404: 'resource-missing', 409: 'conflict', 429: 'rate-limited', 500: 'unavailable'};
  for (const [status, code] of Object.entries(expected)) {
    const cloud = cloudGateway(config, async () => {throw {response: {status: Number(status), data: 'private token'}};});
    await assert.rejects(cloud.budget(), {message: `cost-api-${code}`});
  }
});
test('remote operation paths and failures cannot become arbitrary API requests', async () => {
  const f = fixture(), current = await f.cloud.inspect('service:readProfile');
  for (const response of [{name: 'projects/other/locations/us/operations/bad'},
    {name: `${prefix}/operations/bad`, done: true, error: {code: 7}}]) {
    const calls = [], cloud = cloudGateway(config, async input => {calls.push(input); return {data: response};});
    await assert.rejects(cloud.apply(current, {mode: 'MANUAL', count: 0}), /cost-operation/);
    assert.equal(calls.length, 1);
  }
});
test('private Pub/Sub function has separate runtime, no callable endpoint and bounded execution', () => {
  const entry = new URL('../cost-control/index.js', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `const m=await import(${JSON.stringify(entry)});console.log(JSON.stringify(m.budgetCostGuard.__endpoint));`],
  {encoding: 'utf8', env: {...process.env, GCLOUD_PROJECT: PROJECT}});
  assert.equal(result.status, 0, result.stderr);
  const endpoint = JSON.parse(result.stdout.trim());
  assert.equal(endpoint.serviceAccountEmail, RUNTIME_ACCOUNT);
  assert.equal(endpoint.maxInstances, 1); assert.equal(endpoint.concurrency, 1);
  assert.equal(endpoint.timeoutSeconds, 300);
  assert.equal(endpoint.callableTrigger, undefined); assert.equal(endpoint.httpsTrigger, undefined);
  assert.equal(endpoint.eventTrigger.retry, false);
});
test('guard deployment is separate and offline predeploy refuses missing local settings or unknown projects', () => {
  const read = p => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url), 'utf8'));
  assert.deepEqual(read('firebase.json').functions.map(f => f.codebase), ['game']);
  assert.equal(read('firebase.cost-control.json').functions[0].codebase, 'cost-control');
  const script = new URL('../tools/check-cost-control.mjs', import.meta.url);
  for (const project of [PROJECT, 'production-denied']) {
    const result = spawnSync(process.execPath, [script.pathname.replace(/^\/(\w:)/, '$1')],
      {encoding: 'utf8', env: {...process.env, GCLOUD_PROJECT: project}});
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /deployment blocked/);
  }
});

test('guard coverage matches every current game function export', () => {
  const entry = new URL('../server/index.js', import.meta.url).href;
  const result = spawnSync(process.execPath, ['--input-type=module', '-e',
    `const m=await import(${JSON.stringify(entry)});console.log(JSON.stringify(Object.keys(m).filter(k=>m[k]?.__endpoint)));`],
    {encoding: 'utf8', env: {...process.env, GCLOUD_PROJECT: 'demo-cost-control'}});
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout.trim()).sort(),
    TARGETS.filter(t => t.startsWith('service:')).map(t => t.split(':')[1]).sort());
});
