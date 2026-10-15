import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// The home stylesheet overrides the HUD. Reproduce the inherited badge background.
test('personal skill timers explicitly clear the old HUD badge background',()=>{
 const css=['hud.css','home-actions.css'].map(p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8')).join('\n');
 for(const name of ['data-sword-time','data-revolver-time']){
  let background;
  for(const [,selector,body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
   if(!selector.includes('['+name+']'))continue;
   const value=body.match(/(?:^|;)\s*background\s*:\s*([^;]+)/);
   if(value)background=value[1].trim();
  }
  assert.equal(background,'transparent',name+' must not inherit the dark badge');
 }
});
