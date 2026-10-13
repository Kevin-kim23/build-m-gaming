import test from 'node:test';
import assert from 'node:assert/strict';
import {readConfig, validateBudget, budgetName} from '../cost-control/policy.js';
import {handleBudget} from '../cost-control/controller.js';
import {PROJECTS} from '../cost-control/projects.js';
import {parseLocalConfig, localConfigUrl} from '../cost-control/local-config.js';
import {cloudGateway} from '../cost-control/cloud.js';
import {spawnSync} from 'node:child_process';

// All identifiers below are synthetic fixtures, never real account/budget identifiers.
const dev = 'budae-kiugi-dev', prod = 'budae-kiugi-prod';
function env(project) {return {GCLOUD_PROJECT: project, COST_GUARD_PROJECT_ID: project,
  COST_GUARD_LIMIT_KRW: '100000', COST_GUARD_TOPIC: 'budae-budget-events',
  COST_GUARD_RUNTIME_ACCOUNT: PROJECTS[project].runtimeAccount,
  COST_GUARD_PROJECT_NUMBER: project === dev ? '111111111111' : '222222222222',
  COST_GUARD_BILLING_ACCOUNT: 'AAAAAA-BBBBBB-CCCCCC',
  COST_GUARD_BUDGET_ID: `${project}-synthetic-budget`, COST_GUARD_MODE: 'observe'};}
const now = Date.parse('2026-10-13T10:00:00Z');
function notice(c) {return {attributes: {billingAccountId: c.billingAccount, budgetId: c.budgetId, schemaVersion: '1.0'},
  publishTime: new Date(now).toISOString(), data: Buffer.from(JSON.stringify({costAmount: 100000,
    costIntervalStart: '2026-10-01T07:00:00Z', budgetAmount: 100000,
    budgetAmountType: 'SPECIFIED_AMOUNT', currencyCode: 'KRW'})).toString('base64')};}
function budget(c) {return {name: budgetName(c), amount: {specifiedAmount: {currencyCode: 'KRW', units: '100000'}},
  budgetFilter: {projects: [`projects/${c.projectNumber}`], calendarPeriod: 'MONTH'},
  notificationsRule: {pubsubTopic: `projects/${c.project}/topics/${c.topic}`, schemaVersion: '1.0'}};}

test('each project has a separate approved 100000 KRW policy and production is observe only', () => {
  for (const project of [dev, prod]) {
    const c = readConfig(env(project));
    assert.equal(c.project, project); assert.equal(c.limitKrw, 100000); assert.equal(c.enforce, false);
    validateBudget(budget(c), c);
    const b = budget(c); b.amount.specifiedAmount.units = '200000';
    assert.throws(() => validateBudget(b, c), /cost-budget/);
  }
  assert.throws(() => readConfig({...env(prod), COST_GUARD_MODE: 'enforce', COST_GUARD_APPROVED: 'true'}), /cost-production-enforce-disabled/);
});

test('copied settings, unknown projects, wrong amounts and other project topics/accounts fail closed', () => {
  for (const edit of [{GCLOUD_PROJECT: prod}, {GCLOUD_PROJECT: 'other-project'},
    {COST_GUARD_PROJECT_ID: prod}, {COST_GUARD_LIMIT_KRW: '200000'}, {COST_GUARD_LIMIT_KRW: undefined},
    {COST_GUARD_TOPIC: `projects/${prod}/topics/budae-budget-events`},
    {COST_GUARD_RUNTIME_ACCOUNT: PROJECTS[prod].runtimeAccount}])
    assert.throws(() => readConfig({...env(dev), ...edit}), /cost-config/);
});

test('development notices cannot even read or pause production; forged enforce config is rejected', async () => {
  const d = readConfig(env(dev)), p = readConfig(env(prod)); let effects = 0;
  const cloud = {budget: async () => {effects++; return budget(p);}, inspect: async () => {effects++;}};
  const store = {exclusive: () => {effects++; assert.fail('no production writes');}};
  const run = (message, config) => handleBudget({message, config, cloud, store, now: () => now, log: () => {}});
  await assert.rejects(run(notice(d), p), /cost-notice-source/);
  await assert.rejects(run(notice(p), {...p, enforce: true}), /cost-production-enforce-disabled/);
  assert.equal(effects, 0);
  assert.equal((await run(notice(p), p)).status, 'observe');
  assert.equal(effects, 12); // budget + 9 services + 2 jobs, no writes
});

test('matching notice IDs cannot bypass live budget project and topic checks', () => {
  const d = readConfig(env(dev)), p = readConfig(env(prod));
  for (const change of [b => b.budgetFilter.projects = [`projects/${dev}`],
    b => b.budgetFilter.projects = [`projects/${d.projectNumber}`],
    b => b.notificationsRule.pubsubTopic = `projects/${dev}/topics/${d.topic}`]) {
    const b = budget(p); change(b); assert.throws(() => validateBudget(b, p), /cost-budget/);
  }
});

test('a foreign project state is rejected before a checkpoint or remote update', async () => {
  const c = readConfig({...env(dev), COST_GUARD_MODE: 'enforce'}); let writes = 0;
  await assert.rejects(handleBudget({config: c, message: notice(c), now: () => now, log: () => {},
    cloud: {budget: async () => budget(c)},
    store: {exclusive: run => run({project: prod}, async () => {writes++;})}}), /cost-state-project/);
  assert.equal(writes, 0);
});

test('local files are explicit, separate, allowlisted and reject duplicate or unknown settings', () => {
  const source = project => Object.entries(env(project)).filter(([key]) => key !== 'GCLOUD_PROJECT')
    .map(([key, value]) => `${key}=${value}`).join('\n');
  for (const project of [dev, prod]) {
    assert.equal(parseLocalConfig(project, source(project)).project, project);
    assert.ok(localConfigUrl(project).pathname.endsWith(`/.env.${project}`));
    assert.throws(() => parseLocalConfig(project, `${source(project)}\nCOST_GUARD_MODE=observe`), /cost-config/);
    assert.throws(() => parseLocalConfig(project, `${source(project)}\nCOST_GUARD_APPROVED=true`), /cost-config/);
  }
  assert.throws(() => parseLocalConfig(prod, source(dev)), /cost-config/);
  assert.throws(() => localConfigUrl('../other'), /cost-config/);
});

test('SDK trigger selects the matching runtime and topic, and rejects unknown discovery projects', () => {
  const entry = new URL('../cost-control/index.js', import.meta.url).href;
  for (const project of [dev, prod, 'unapproved-project']) {
    const result = spawnSync(process.execPath, ['--input-type=module', '-e',
      `const m=await import(${JSON.stringify(entry)});console.log(JSON.stringify({endpoint:m.budgetCostGuard.__endpoint,trigger:m.budgetCostGuard.__trigger}));`],
    {encoding: 'utf8', env: {...process.env, GCLOUD_PROJECT: project}});
    if (project === 'unapproved-project') {assert.notEqual(result.status, 0); continue;}
    assert.equal(result.status, 0, result.stderr);
    const {endpoint, trigger} = JSON.parse(result.stdout.trim());
    assert.equal(endpoint.serviceAccountEmail, PROJECTS[project].runtimeAccount);
    assert.equal(endpoint.eventTrigger.eventFilters.topic, 'budae-budget-events');
    assert.equal(trigger.eventTrigger.resource, `projects/${project}/topics/budae-budget-events`);
  }
});

test('production cloud adapter refuses writes even if a caller skips the controller', async () => {
  let calls = 0;
  const cloud = cloudGateway(readConfig(env(prod)), async () => {calls++;});
  await assert.rejects(cloud.apply({kind: 'job', name: `projects/${prod}/locations/asia-northeast3/jobs/test`}, 'PAUSED'),
    /cost-production-enforce-disabled/);
  assert.equal(calls, 0);
});

test('development adapter rejects a production resource before making an API request', async () => {
  let calls = 0;
  const cloud = cloudGateway(readConfig(env(dev)), async () => {calls++;});
  await assert.rejects(cloud.apply({kind: 'service', name: `projects/${prod}/locations/asia-northeast3/services/test`},
    {mode: 'MANUAL', count: 0}), /cost-target-denied/);
  assert.equal(calls, 0);
});
