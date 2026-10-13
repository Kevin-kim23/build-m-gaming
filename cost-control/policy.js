// Deliberately scoped to the approved development project. Production needs a new review.
export const PROJECT = 'budae-kiugi-dev';
export const REGION = 'asia-northeast3';
export const LIMIT_KRW = 100_000;
export const TOPIC = 'budae-budget-events';
export const RUNTIME_ACCOUNT = `budget-cost-guard@${PROJECT}.iam.gserviceaccount.com`;
export const FUNCTION_NAMES = Object.freeze([
  'readProfile', 'createProfile', 'readCloudSave', 'saveCloudProgress',
  'reportNickname', 'deleteGameAccount', 'moderateNicknames',
  'retryAccountDeletions', 'purgeExpiredServerRecords',
]);
export const SCHEDULED_NAMES = Object.freeze(['retryAccountDeletions', 'purgeExpiredServerRecords']);
export const TARGETS = Object.freeze([
  ...SCHEDULED_NAMES.map(name => `job:${name}`),
  ...FUNCTION_NAMES.map(name => `service:${name}`),
]);

export function readConfig(env) {
  if (env.GCLOUD_PROJECT !== PROJECT || env.COST_GUARD_RUNTIME_ACCOUNT !== RUNTIME_ACCOUNT)
    throw Error('cost-config-project-or-account');
  if (!/^\d{6,20}$/.test(env.COST_GUARD_PROJECT_NUMBER ?? '') ||
      !/^[A-Z0-9]{6}-[A-Z0-9]{6}-[A-Z0-9]{6}$/.test(env.COST_GUARD_BILLING_ACCOUNT ?? '') ||
      !/^[a-zA-Z0-9-]{6,100}$/.test(env.COST_GUARD_BUDGET_ID ?? '')) throw Error('cost-config-identifiers');
  if (!['observe', 'enforce'].includes(env.COST_GUARD_MODE)) throw Error('cost-config-mode');
  return Object.freeze({project: PROJECT, projectNumber: env.COST_GUARD_PROJECT_NUMBER,
    billingAccount: env.COST_GUARD_BILLING_ACCOUNT, budgetId: env.COST_GUARD_BUDGET_ID,
    enforce: env.COST_GUARD_MODE === 'enforce'});
}

export const budgetName = c => `billingAccounts/${c.billingAccount}/budgets/${c.budgetId}`;
export function validateBudget(b, c) {
  const f = b?.budgetFilter ?? {}, m = b?.amount?.specifiedAmount;
  if (b?.name !== budgetName(c) || m?.currencyCode !== 'KRW' || String(m.units) !== String(LIMIT_KRW) ||
      (m.nanos ?? 0) !== 0 || b.spendCap || f.calendarPeriod !== 'MONTH' || f.customPeriod ||
      f.projects?.length !== 1 || ![`projects/${c.project}`, `projects/${c.projectNumber}`].includes(f.projects[0]) ||
      ['services', 'resourceAncestors', 'subaccounts', 'creditTypes'].some(key => f[key]?.length) ||
      Object.keys(f.labels ?? {}).length || ![undefined, 'INCLUDE_ALL_CREDITS'].includes(f.creditTypesTreatment) ||
      b.notificationsRule?.pubsubTopic !== `projects/${c.project}/topics/${TOPIC}` ||
      b.notificationsRule?.schemaVersion !== '1.0') throw Error('cost-budget-scope-mismatch');
}

function pacificMonth(time) {
  const parts = new Intl.DateTimeFormat('en-US', {timeZone: 'America/Los_Angeles', year: 'numeric', month: '2-digit'})
    .formatToParts(time);
  return `${parts.find(p => p.type === 'year').value}-${parts.find(p => p.type === 'month').value}`;
}

// Pub/Sub supplies publishTime; never trust a caller-provided forecast or threshold ratio.
export function parseNotice(message, config, now) {
  const a = message?.attributes;
  if (a?.billingAccountId !== config.billingAccount || a?.budgetId !== config.budgetId || a?.schemaVersion !== '1.0')
    throw Error('cost-notice-source');
  if (typeof message.data !== 'string' || message.data.length > 16_384) throw Error('cost-notice-size');
  let p;
  try { p = JSON.parse(Buffer.from(message.data, 'base64').toString('utf8')); }
  catch { throw Error('cost-notice-json'); }
  const published = Date.parse(message.publishTime), start = Date.parse(p.costIntervalStart);
  if (!Number.isFinite(published) || published > now + 60_000 || !Number.isFinite(start) ||
      p.currencyCode !== 'KRW' || p.budgetAmountType !== 'SPECIFIED_AMOUNT' || p.budgetAmount !== LIMIT_KRW ||
      typeof p.costAmount !== 'number' || !Number.isFinite(p.costAmount) || Math.abs(p.costAmount) > 1e15)
    throw Error('cost-notice-values');
  // Billing calendar starts at Pacific midnight (07:00 or 08:00 UTC).
  if (!/^\d{4}-\d{2}-01T0[78]:00:00(?:\.000)?Z$/.test(p.costIntervalStart) || start > published)
    throw Error('cost-notice-period');
  const period = p.costIntervalStart.slice(0, 7);
  return {period, cost: p.costAmount, current: period === pacificMonth(now),
    fresh: now - published <= 24 * 60 * 60_000};
}

export function nextState(previous, notice) {
  if (!notice.current || (previous.period && notice.period < previous.period)) return null;
  const same = previous.period === notice.period;
  // A stale under-budget notice must never restart a stopped service.
  if (!same && !notice.fresh && notice.cost < LIMIT_KRW) return null;
  const highCost = same ? Math.max(previous.highCost ?? 0, notice.cost) : Math.max(0, notice.cost);
  return {...previous, period: notice.period, highCost,
    desired: highCost >= LIMIT_KRW ? 'paused' : 'running', resources: previous.resources ?? {}};
}
