import test from 'node:test';
import assert from 'node:assert/strict';
import {createOpeningSystemBars} from '../src/opening-system-bars.js';

test('a pending native hide cannot hide bars after the player starts the game',async()=>{
  const calls=[];let release;
  const c=createOpeningSystemBars({native:true,bars:{hide(){calls.push('hide');return new Promise(r=>release=r);},show(){calls.push('show');}},onError:assert.fail});
  const first=c.sync();await Promise.resolve();
  const done=c.finish();release();await first;await done;
  assert.deepEqual(calls,['hide','show']);
  await c.sync();assert.deepEqual(calls,['hide','show','show']);
});
test('native failures are reported and do not block restoration or browser play',async()=>{
  const calls=[],errors=[];
  const bars={hide(){throw Error('unavailable');},show(){calls.push('show');}};
  const c=createOpeningSystemBars({native:true,bars,onError:(area)=>errors.push(area)});
  await c.sync();await c.finish();assert.deepEqual(errors,['opening.systemBars']);assert.deepEqual(calls,['show']);
  const web=createOpeningSystemBars({native:false,bars,onError:assert.fail});await web.sync();await web.finish();assert.deepEqual(calls,['show']);
});
