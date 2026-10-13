'use strict';
const PROJECT = 'budae-kiugi-dev';
const REGION = 'asia-northeast3';
const USER_FUNCTIONS = Object.freeze(['readProfile','createProfile','readCloudSave','saveCloudProgress','reportNickname','deleteGameAccount']);
const SCHEDULES = Object.freeze({retryAccountDeletions:'0 0,6,12,18 * * *',purgeExpiredServerRecords:'0 3 * * *'});
const FUNCTIONS = Object.freeze([...USER_FUNCTIONS,'moderateNicknames',...Object.keys(SCHEDULES)]);
module.exports = {PROJECT,REGION,USER_FUNCTIONS,SCHEDULES,FUNCTIONS,CLI_VERSION:'15.33.0'};
