import {readdirSync,mkdirSync,copyFileSync} from 'node:fs';
const target=new URL('../server/game/',import.meta.url);
mkdirSync(target,{recursive:true});
for(const name of readdirSync(new URL('../src/',import.meta.url)).filter(name=>name.endsWith('.js')))
  copyFileSync(new URL('../src/'+name,import.meta.url),new URL(name,target));
console.log('Prepared server game rules from the app source (no private assets).');
