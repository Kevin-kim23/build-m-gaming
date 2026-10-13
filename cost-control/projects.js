// Public, reviewed policy only. Billing identifiers belong in ignored local env files.
const definition = (project, enforceAllowed) => Object.freeze({
  project, limitKrw: 100_000, topic: 'budae-budget-events',
  runtimeAccount: `budget-cost-guard@${project}.iam.gserviceaccount.com`, enforceAllowed,
});
export const PROJECTS = Object.freeze({
  'budae-kiugi-dev': definition('budae-kiugi-dev', true),
  // A future, separately approved code review + deployed-resource rehearsal is required.
  // No environment variable or remote message can override this production gate.
  'budae-kiugi-prod': definition('budae-kiugi-prod', false),
});
export function projectPolicy(project) {
  if (!Object.hasOwn(PROJECTS, project)) throw Error('cost-config-project');
  return PROJECTS[project];
}
export function validateConfigPolicy(config) {
  const policy = projectPolicy(config.project);
  if (config.limitKrw !== policy.limitKrw || config.topic !== policy.topic ||
      config.runtimeAccount !== policy.runtimeAccount) throw Error('cost-config-policy');
  if (typeof config.enforce !== 'boolean') throw Error('cost-config-mode');
  if (config.enforce && !policy.enforceAllowed) throw Error('cost-production-enforce-disabled');
  return policy;
}
