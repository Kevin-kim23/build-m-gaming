// Enemy decisions use only visible units, shared mana and actual cooldowns.
export function chooseEnemyDeployment(b,pool,traits,beats){
 const available=[...new Set(pool)].filter(id=>b.enemy.mana>=traits[id].cost&&b.elapsedMs>=(b.enemy.ready[id]??0));
 if(!available.length)return null;
 const threats=Array.from({length:3},()=>0),enemyForce=[0,0,0];
 for(const u of b.player.units)threats[u.lane]+=(u.damage*1000/u.intervalMs+u.hp*.02)*(1+u.x/350);
 for(const u of b.enemy.units)enemyForce[u.lane]+=u.damage*1000/u.intervalMs+u.hp*.02;
 let lane=0,best=-Infinity;
 for(let i=0;i<3;i++){const score=threats[i]-enemyForce[i]*.7;if(score>best){best=score;lane=i;}}
 if(!threats.some(Boolean))lane=(b.enemy.spawned+b.stageId)%3;
 const targets=b.player.units.filter(u=>u.lane===lane).sort((a,c)=>c.x-a.x);
 const target=targets[0];
 const id=available.sort((a,c)=>{
  const score=id=>(target?(beats[traits[id].cls]===target.cls?3:beats[target.cls]===traits[id].cls ? .5 : 1):1)/Math.sqrt(traits[id].cost);
  return score(c)-score(a);
 })[0];
 return {id,lane};
}
export function enemyTargetScore(unit,target,distance,beats){
 // Immediate danger and a finishing blow take priority without abandoning the lane.
 return (1000-distance)+(target.x>750?400:0)+(target.hp<=unit.damage?250:0)+(beats[unit.cls]===target.cls?100:0);
}
