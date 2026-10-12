import {parseSave} from './game/save.js';
import {serializeSave} from './game/money.js';
import {armyPower} from './game/units.js';
import {ServiceError} from './profile-service.js';
export function validateCloudSave(raw,now) {
  if(typeof raw!=='string'||Buffer.byteLength(raw,'utf8')>200_000)throw new ServiceError('invalid-save');
  const state=parseSave(raw,now);
  if(!state||state.lastAccrual>now+60_000)throw new ServiceError('invalid-save');
  // Structural validation and recalculation are not proof of legitimate play.
  return {raw:serializeSave(state),power:String(armyPower(state))};
}
