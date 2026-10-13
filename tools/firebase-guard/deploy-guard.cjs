'use strict';
// Reusable authorization engine for the separately approved deployment stage.
// There is deliberately no CLI deploy/login launcher before that stage's review.
const {createPolicy}=require('./request-policy.cjs');
const {FUNCTIONS,PROJECT}=require('./constants.cjs');
function validateDeployArguments(args) {
  const expected=['deploy','--project',PROJECT,'--config','firebase.json','--only',
    FUNCTIONS.map(id=>'functions:game:'+id).join(','),'--non-interactive'];
  if(!Array.isArray(args)||args.length!==expected.length||args.some((value,index)=>value!==expected[index]))throw new Error('GUARD_ARGUMENTS_DENIED');
  return true;
}
function createDeployGuard(plan) {
  if(!plan||plan.project!==PROJECT)throw new Error('GUARD_PLAN_REQUIRED');
  return createPolicy({mode:'deploy',plan});
}
module.exports={createDeployGuard,validateDeployArguments};
