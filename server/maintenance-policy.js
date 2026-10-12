// Code preparation only: deploying these options or changing cloud settings
// still requires the owner's cost review and separate deployment approval.
export const MAINTENANCE_POLICY=Object.freeze({
  timeZone:'Asia/Seoul',
  deletionSchedule:'0 0,6,12,18 * * *',
  expirySchedule:'0 3 * * *',
  deletionLimit:100,moderationCleanupLimit:100,pageSize:100,expiryConcurrency:10,
  expiryLimits:Object.freeze({deletions:1000,rateLimits:12000,reportDaily:12000,nicknameReports:1000,moderationActions:1000}),
  workerBudgetMs:240_000,leaseMs:360_000,
  cursorRetentionMs:90*24*60*60*1000,maxInvocationAttempts:3,
});

export const MAINTENANCE_FUNCTION_OPTIONS=Object.freeze({
  region:'asia-northeast3',timeZone:MAINTENANCE_POLICY.timeZone,
  memory:'256MiB',cpu:1,minInstances:0,maxInstances:1,concurrency:1,
  timeoutSeconds:300,ingressSettings:'ALLOW_INTERNAL_ONLY',
  // Positive retry duration can override the count; zero keeps two retries.
  retryCount:2,maxRetrySeconds:0,minBackoffSeconds:360,maxBackoffSeconds:720,maxDoublings:1,
});
