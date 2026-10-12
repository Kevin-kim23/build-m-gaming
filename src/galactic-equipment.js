import { MILITARY_MAX_LEVEL } from './equipment-limits.js';
import { compactMoney } from './money.js';

const rows = [
  ['plasmaTank','플라스마 전차','은하 준장','플라스마 포격 · 전선을 지키는 중장갑 전차'],
  ['droneCarrier','무인기 모함','은하 소장','무인기 편대 발진 · 긴 사거리 공중 지원'],
  ['siegeMech','타이탄 공성포','은하 중장','쌍열 중포 사격 · 느리고 강력한 공성 병기'],
  ['stellarBomber','성운 폭격기','은하 대장','폭탄 연속 투하 · 빠른 공중 공격'],
  ['novaCannon','노바 캐논','은하 원수','축전 후 일제 타격 · 적 본부를 관통하는 광선포'],
];
export const GALACTIC_EQUIPMENT = Object.freeze(Object.fromEntries(rows.map(([id,name,unlockRank,role],i)=>[id,Object.freeze({
  id,name,unlockRank,role,introducedVersion:34,maxLevel:MILITARY_MAX_LEVEL,
  cost:compactMoney(1_000_000_000_000_000n*4n**BigInt(i)),
  passive:50_000_000_000*4**i,tap:300_000_000_000*4**i,
  passiveStep:10_000_000_000*4**i,tapStep:60_000_000_000*4**i,
})])));
