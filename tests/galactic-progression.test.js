import { LEGACY_MAX_GOLD } from '../src/money.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {freshState,MAX_SOLDIERS,SAVE_VERSION,SAVE_KEY} from '../src/state.js';
import {RANKS,RANK_DEFINITIONS,rankForArmy,promotionProgress} from '../src/ranks.js';
import {GALACTIC_COMMAND_SIZE,GALACTIC_GRAND_ALLIED_ARMY_SIZE,SUPREME_COMMAND_SIZE,groupArmy} from '../src/formations.js';
import {ACHIEVEMENTS,reconcileAchievements} from '../src/achievements.js';
import {recruit,recruitOffer,perSecond,perTap,tapGold,accrue} from '../src/game.js';
import {MAX_GOLD,serializeSave,exact} from '../src/money.js';
import {inspectSave,parseSave} from '../src/save.js';
import {createBattle} from '../src/battle.js';
import {promotionProfile} from '../src/promotion.js';
import {generalPromotionMarkup} from '../src/general-promotion.js';
const T=1800000000000;
const army=power=>({...freshState(T),gold:MAX_GOLD,soldiers:power-3000,sergeants:300,ncoSchoolLevel:5});

test('four supreme commands form one galactic command at the special marshal threshold',()=>{
 assert.equal(GALACTIC_COMMAND_SIZE,SUPREME_COMMAND_SIZE*4);
 assert.equal(GALACTIC_COMMAND_SIZE,335544320);
 const s=army(GALACTIC_COMMAND_SIZE-1),rank=RANKS.indexOf('특전원수');
 assert.equal(RANKS[rankForArmy(s)],'대원수');
 assert.equal(RANK_DEFINITIONS[rank].marks,9); // four white stars after the three-star marshal
 assert.equal(RANK_DEFINITIONS[rank].required,GALACTIC_COMMAND_SIZE);
 assert.match(promotionProgress(s).text,/335,544,320/);
 const result=recruit(s,T);
 assert.equal(result.ok,true);assert.equal(result.promoted,true);assert.equal(result.rank,rank);
 assert.deepEqual(groupArmy(s).map(g=>[g.id,g.count]),[['galacticCommand',1]]);
 assert.equal(promotionProgress(s).ratio,.25);
 assert.equal(ACHIEVEMENTS.find(a=>a.id==='galacticCommand').title,'은하 연대장');
 assert.ok(result.achievements.includes('galacticCommand'));
 assert.deepEqual(reconcileAchievements(s),[]);
 s.sergeants=299;assert.equal(RANKS[rankForArmy(s)],'대령');
});

test('new highest power limit rejects one extra recruit without spending and restores exact money',()=>{
 assert.equal(MAX_SOLDIERS,GALACTIC_GRAND_ALLIED_ARMY_SIZE*4);
 const s=army(MAX_SOLDIERS-1);s.gold=MAX_GOLD;
 const cost=recruitOffer(s).cost,before=s.gold;
 assert.equal(recruit(s,T).ok,true);assert.equal(exact(s.gold),before-exact(cost));
 assert.equal(recruitOffer(s).reason,'limit');
 const after=s.gold;assert.equal(recruit(s,T).reason,'limit');assert.equal(s.gold,after);
 assert.deepEqual(parseSave(serializeSave(s),T),s);
 s.soldiers++;assert.equal(inspectSave(serializeSave(s),T).issue.field,'armyPower');
});

test('version27 preserves assets, stars, paid upgrades, active skills and pending reward at the old cap',()=>{
 const s=army(GALACTIC_COMMAND_SIZE);s.version=27;s.gold=LEGACY_MAX_GOLD-1n;
 s.equipment.carrier={level:17,count:1,deployed:false};s.personalLevels.admiralsCompass=7;
 s.facilities=['futsal'];s.facilityLevels={futsal:14};s.campaignCleared=21;s.campaignStars=Array(80).fill(0);s.campaignStars[19]=3;
 s.swordActivatedAt=T-500;s.swordDurationMs=30000;s.autoTouchActivatedAt=T-300;s.autoTouchTicks=1;
 s.offlineReward={id:T,durationMs:3600000,amount:9007199254740993n};
 reconcileAchievements(s);s.earnedAchievements=s.earnedAchievements.filter(id=>id!=='galacticCommand');
 const loaded=parseSave(serializeSave(s),T);
 assert.equal(SAVE_KEY,'budae-kiugi-recruits-v3');assert.equal(loaded.version,SAVE_VERSION);
 for(const field of Object.keys(s).filter(k=>!['version','earnedAchievements','campaignStars'].includes(k)))assert.deepEqual(loaded[field],s[field],field);
 assert.deepEqual(loaded.campaignStars.slice(0,80),s.campaignStars);
 assert.ok(loaded.campaignStars.slice(80).every(stars=>stars===0));
 assert.deepEqual(loaded.earnedAchievements,[...s.earnedAchievements,'galacticCommand']);
 assert.equal(RANKS[rankForArmy(loaded)],'특전원수');
 assert.deepEqual(parseSave(serializeSave(loaded),T),loaded);
 const lower=army(SUPREME_COMMAND_SIZE);lower.version=27;lower.gold=LEGACY_MAX_GOLD;lower.campaignStars=Array(80).fill(0);
 assert.equal(RANKS[rankForArmy(parseSave(serializeSave(lower),T))],'대원수');
});

test('galactic headquarters and complete special marshal ceremony work through shared battle and promotion rules',()=>{
 const s=army(GALACTIC_COMMAND_SIZE);s.equipment.carrier={level:20,count:1,deployed:true};
 const battle=createBattle(s,1,{equipment:['carrier']});
 assert.equal(battle.player.hq.id,'galacticCommand');assert.ok(Number.isFinite(battle.player.hq.maxHp));
 const rank=rankForArmy(s),p=promotionProfile(rank),html=generalPromotionMarkup(rank,p);
 assert.equal(p.generalTier,9);assert.match(html,/특전원수/);assert.match(html,/은하연대/);
 assert.doesNotMatch(html,/undefined|NaN/);
});

test('highest new army keeps exact income settlement and one-gold cap behavior',()=>{
 const s=army(MAX_SOLDIERS);s.gold=0;
 const passive=exact(perSecond(s)),tap=exact(perTap(s,T));
 assert.ok(passive>0n&&tap>0n);accrue(s,T+1000);assert.equal(exact(s.gold),passive);
 tapGold(s,T+1000);assert.equal(exact(s.gold),passive+tap);
 s.gold=MAX_GOLD-1n;assert.equal(tapGold(s,T+1000),1);assert.equal(s.gold,MAX_GOLD);
 assert.equal(parseSave(serializeSave(s),T+1000).gold,MAX_GOLD);
});
