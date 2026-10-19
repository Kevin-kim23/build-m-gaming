// Enemy decisions use only visible units, shared mana and actual cooldowns.
export function chooseEnemyDeployment(b,pool,traits){
 const available=[...new Set(pool)].filter(id=>b.enemy.mana>=traits[id].cost&&b.elapsedMs>=(b.enemy.ready[id]??0));
 if(!available.length)return null;
 const threats=Array.from({length:3},()=>0),enemyForce=[0,0,0];
 for(const u of b.player.units)threats[u.lane]+=(u.damage*1000/u.intervalMs+u.hp*.02)*(1+u.x/350);
 for(const u of b.enemy.units)enemyForce[u.lane]+=u.damage*1000/u.intervalMs+u.hp*.02;
 let lane=0,best=-Infinity;
 for(let i=0;i<3;i++){const score=threats[i]-enemyForce[i]*.7;if(score>best){best=score;lane=i;}}
 if(!threats.some(Boolean))lane=(b.enemy.spawned+b.stageId)%3;
 const id=available.sort((a,c)=>traits[a].cost-traits[c].cost)[0];
 return {id,lane};
}
export function enemyTargetScore(unit,target,distance){
 // Immediate danger and a finishing blow take priority without abandoning the lane.
 return (1000-distance)+(target.x>750?400:0)+(target.hp<=unit.damage?250:0);
}
