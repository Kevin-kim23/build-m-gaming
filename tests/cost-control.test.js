import test from 'node:test';
import assert from 'node:assert/strict';
import {readConfig, validateBudget, parseNotice, budgetName, nextState, PROJECT, RUNTIME_ACCOUNT, TOPIC, TARGETS} from '../cost-control/policy.js';
import {handleBudget} from '../cost-control/controller.js';
import {leaseStore} from '../cost-control/store.js';

const env = {GCLOUD_PROJECT: PROJECT, COST_GUARD_PROJECT_ID: PROJECT,
  COST_GUARD_LIMIT_KRW: '100000', COST_GUARD_TOPIC: TOPIC, COST_GUARD_RUNTIME_ACCOUNT: RUNTIME_ACCOUNT,
  COST_GUARD_PROJECT_NUMBER: '123456789012', COST_GUARD_BILLING_ACCOUNT: 'AAAAAA-BBBBBB-CCCCCC',
  COST_GUARD_BUDGET_ID: 'synthetic-budget', COST_GUARD_MODE: 'enforce'};
const config = readConfig(env);
const oct = Date.parse('2026-10-13T10:00:00Z'), nov = Date.parse('2026-11-02T10:00:00Z');
function budget() {return {name: budgetName(config), amount: {specifiedAmount: {currencyCode: 'KRW', units: '100000'}},
  budgetFilter: {projects: [`projects/${config.projectNumber}`], calendarPeriod: 'MONTH'},
  notificationsRule: {pubsubTopic: `projects/${PROJECT}/topics/${TOPIC}`, schemaVersion: '1.0'}};}
function message(cost = 100_000, month = '10', now = oct) {
  return {attributes: {schemaVersion: '1.0', billingAccountId: config.billingAccount, budgetId: config.budgetId},
    publishTime: new Date(now).toISOString(), data: Buffer.from(JSON.stringify({
      costAmount: cost, costIntervalStart: `2026-${month}-01T07:00:00Z`, budgetAmount: 100_000,
      budgetAmountType: 'SPECIFIED_AMOUNT', currencyCode: 'KRW', forecastThresholdExceeded: 2,
    })).toString('base64')};
}
function fixture() {
  let state = {}, time = oct;
  const calls = [], errors = [], actual = Object.fromEntries(TARGETS.map(target => [target,
    {name: target, identity: 'original', kind: target.split(':')[0],
      setting: target.startsWith('job:') ? 'ENABLED' : {mode: 'AUTOMATIC', count: null}}]));
  const cloud = {
    budget: async () => budget(), inspect: async target => structuredClone(actual[target]),
    stopped: current => current.kind === 'job' ? 'PAUSED' : {mode: 'MANUAL', count: 0},
    apply: async (current, desired) => {calls.push(current.name); actual[current.name].setting = structuredClone(desired);},
  };
  const store = {exclusive: run => run(structuredClone(state), async s => {state = structuredClone(s);})};
  return {actual, calls, errors, cloud, get state() {return state;}, setState(s) {state = s;}, setTime(t) {time = t;},
    run: (m = message(), c = config) => handleBudget({message: m, config: c, cloud, store,
      now: () => time, log: (area, fields) => errors.push({area, ...fields})})};
}

test('cost guard rejects mixed project settings, wrong runtime account and missing configuration', () => {
  for (const edit of [{GCLOUD_PROJECT: 'budae-kiugi-prod'}, {COST_GUARD_RUNTIME_ACCOUNT: 'default'},
    {COST_GUARD_PROJECT_NUMBER: ''}, {COST_GUARD_BILLING_ACCOUNT: 'bad'}, {COST_GUARD_MODE: 'true'}])
    assert.throws(() => readConfig({...env, ...edit}), /cost-config/);
});
test('budget must cover the whole approved project in KRW, monthly, with exact delivery and amount', () => {
  validateBudget(budget(), config);
  for (const change of [b => b.budgetFilter.projects.push('projects/987654321'),
    b => b.budgetFilter.projects = [], b => b.budgetFilter.services = ['services/run'],
    b => b.budgetFilter.labels = {foo: ['bar']}, b => b.budgetFilter.calendarPeriod = 'YEAR',
    b => b.budgetFilter.creditTypesTreatment = 'EXCLUDE_ALL_CREDITS',
    b => b.amount.specifiedAmount.currencyCode = 'USD', b => b.amount.specifiedAmount.units = '200000',
    b => b.notificationsRule.pubsubTopic = 'wrong', b => b.spendCap = {}]) {
    const b = budget(); change(b); assert.throws(() => validateBudget(b, config), /cost-budget-scope/);
  }
});
test('invalid notices never reach resource mutations and forecasts cannot stop the server', async () => {
  const f = fixture();
  for (const change of [m => m.attributes.budgetId = 'other', m => m.attributes.schemaVersion = '2',
    m => m.data = 'bm90IGpzb24=', m => m.publishTime = 'bad']) {
    const m = message(); change(m); await assert.rejects(f.run(m), /cost-notice/);
  }
  assert.equal((await f.run(message(99_999.99))).status, 'running');
  assert.equal(f.calls.length, 0);
});
test('100000 inclusive pauses all jobs/services; duplicate and lower corrected cost cannot restart this month', async () => {
  const f = fixture();
  assert.equal((await f.run()).status, 'paused');
  assert.deepEqual(f.calls, TARGETS);
  assert.ok(f.calls.slice(0, 2).every(x => x.startsWith('job:')));
  await f.run(); await f.run(message(50_000));
  assert.equal(f.calls.length, TARGETS.length);
  assert.equal(f.state.highCost, 100_000);
});
test('observe mode never checkpoints or mutates; a manual hold blocks resumption', async () => {
  const f = fixture();
  assert.equal((await f.run(message(), {...config, enforce: false})).status, 'observe');
  assert.deepEqual(f.state, {}); assert.equal(f.calls.length, 0);
  await f.run(); f.setState({...f.state, hold: true}); f.setTime(nov);
  assert.equal((await f.run(message(0, '11', nov))).status, 'operator-hold');
  assert.equal(f.calls.length, TARGETS.length);
});

test('observe mode never acquires a Firestore write lease', async () => {
  const f = fixture();
  const result = await handleBudget({message: message(), config: {...config, enforce: false}, cloud: f.cloud,
    store: {exclusive: () => assert.fail('observation must not acquire a lease')}, now: () => oct, log: () => {}});
  assert.equal(result.status, 'observe'); assert.equal(f.calls.length, 0);
});
test('next billing month restores original settings, retaining operator-paused jobs and manual scaling', async () => {
  const f = fixture(), job = TARGETS[0], svc = TARGETS[2];
  f.actual[job].setting = 'PAUSED'; f.actual[svc].setting = {mode: 'MANUAL', count: 2};
  await f.run(); const before = f.calls.length; f.setTime(nov);
  assert.equal((await f.run(message(0, '11', nov))).status, 'running');
  assert.equal(f.actual[job].setting, 'PAUSED');
  assert.deepEqual(f.actual[svc].setting, {mode: 'MANUAL', count: 2});
  assert.ok(f.calls.slice(before, before + 9).every(x => x.startsWith('service:')));
  assert.deepEqual(f.state.resources, {});
  await f.run(message(150_000, '10', nov)); // Late last-month report is harmless.
  assert.equal(f.state.desired, 'running');
});
test('next month still over budget stays paused and a stale new-month low notice cannot resume', async () => {
  const f = fixture(); await f.run(); f.setTime(nov);
  const stale = message(0, '11', Date.parse('2026-11-01T07:00:00Z'));
  assert.equal((await f.run(stale)).status, 'ignored-stale-notice');
  await f.run(message(100_001, '11', nov)); await f.run(message(0, '11', nov));
  assert.equal(f.state.desired, 'paused'); assert.equal(f.calls.length, TARGETS.length);
});
test('Pacific billing boundary does not reset at Korean midnight', () => {
  const at = Date.parse('2026-10-31T15:01:00Z'); // Nov 1 in Korea, still October in billing.
  const m = message(100_000, '10', at);
  assert.equal(parseNotice(m, config, at).current, true);
  const malformed = message();
  const p = JSON.parse(Buffer.from(malformed.data, 'base64')); p.costIntervalStart = '2026-10-02T07:00:00Z';
  malformed.data = Buffer.from(JSON.stringify(p)).toString('base64');
  assert.throws(() => parseNotice(malformed, config, oct), /cost-notice-period/);
  assert.equal(nextState({period: '2026-11'}, {current: true, period: '2026-10'}), null);
});
test('partial failure stops other resources and retries safely after an unknown successful remote write', async () => {
  const f = fixture(), target = TARGETS[3], apply = f.cloud.apply;
  f.cloud.apply = async (current, setting) => {
    await apply(current, setting);
    if (current.name === target) throw Error('secret API payload must not be logged');
  };
  assert.equal((await f.run()).status, 'partial');
  assert.equal(f.calls.length, TARGETS.length);
  assert.equal(f.errors[0].code, 'cost-cloud-operation-failed');
  assert.equal(JSON.stringify(f.errors).includes('secret'), false);
  f.cloud.apply = apply;
  assert.equal((await f.run()).status, 'paused');
  assert.equal(f.calls.length, TARGETS.length);
  f.setTime(nov); await f.run(message(0, '11', nov));
  assert.equal(f.actual[target].setting.mode, 'AUTOMATIC');
});
test('redeployed service or operator scaling change prevents resume and keeps scheduled jobs paused', async () => {
  for (const change of [s => s.identity = 'new-revision', s => s.setting = {mode: 'MANUAL', count: 5}]) {
    const f = fixture(); await f.run(); change(f.actual[TARGETS[3]]); f.setTime(nov);
    assert.equal((await f.run(message(0, '11', nov))).status, 'partial');
    assert.equal(f.actual[TARGETS[0]].setting, 'PAUSED');
    assert.ok(f.errors.length);
  }
});
test('lease store excludes overlap, recovers crashed leases, and refuses writes after an operator hold', async () => {
  let data = {}, now = 1000;
  const db = {doc: () => ({}), runTransaction: async run => run({get: async () => ({data: () => structuredClone(data)}),
    set: (_, value) => {data = {...data, ...structuredClone(value)};},
    update: (_, value) => {data = {...data, ...structuredClone(value)};}})};
  const store = leaseStore(db, () => now);
  await store.exclusive(async (_, checkpoint) => {
    await checkpoint({period: '2026-10'});
    assert.equal((await store.exclusive(() => assert.fail('overlapping execution'))).status, 'busy');
    data.state.hold = true;
    await assert.rejects(checkpoint({period: '2026-11'}), /cost-operator-hold/);
  });
  assert.equal(data.lease.until, 0);
  data = {lease: {owner: 'dead', until: 5000}}; now = 5001;
  await store.exclusive(async (_, checkpoint) => {
    now += 360_001;
    await assert.rejects(checkpoint({}), /cost-lease-lost/);
  });
});

test('budget drift or API failure cannot mutate or resume stopped resources', async () => {
  const f = fixture(); await f.run(); const before = f.calls.length; f.setTime(nov);
  f.cloud.budget = async () => {const b = budget(); b.budgetFilter.services = ['partial-only']; return b;};
  await assert.rejects(f.run(message(0, '11', nov)), /cost-budget-scope/);
  f.cloud.budget = async () => {throw Error('API down');};
  await assert.rejects(f.run(message(0, '11', nov)), /API down/);
  assert.equal(f.calls.length, before); assert.equal(f.state.desired, 'paused');
});

test('time budget checkpoints partial results and retries remaining resources later', async () => {
  const f = fixture(); let time = oct, state = {};
  const store = {exclusive: run => run(state, async s => {state = structuredClone(s);})};
  const inspect = f.cloud.inspect;
  f.cloud.inspect = async target => {time += 220_000; return inspect(target);};
  const result = await handleBudget({message: message(), config, cloud: f.cloud, store,
    now: () => time, log: () => {}});
  assert.equal(result.status, 'partial'); assert.equal(state.errors[0].code, 'cost-runtime-limit');
  assert.equal(f.calls.length, 1);
});
