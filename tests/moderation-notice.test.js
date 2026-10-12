import test from 'node:test';
import assert from 'node:assert/strict';
import {cloudMarkup} from '../src/cloud-ui.js';
test('player sees only a fixed warning or rename notice and the existing appeal contact',()=>{
  for(const kind of ['warning','renamed']) {
    const body=cloudMarkup({phase:'ready',profile:{nickname:'유저테스트',moderationNotice:{kind,actorHash:'private-actor',reason:'private-report'}},cloud:null}).body;
    assert.match(body,/검토·복원을 요청/);
    assert.doesNotMatch(body,/private-actor|private-report|moderateNicknames|data-detail-action="moderation/);
  }
});
