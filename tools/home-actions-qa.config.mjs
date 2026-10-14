// Isolated, repeatable UI checks. Test data never touches the player's 4196 origin.
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const {version}=JSON.parse(readFileSync(new URL('../package.json',import.meta.url),'utf8'));
const seed=`
import {UNITS} from '/src/units.js';
import {SCHOOLS} from '/src/schools.js';
import {EQUIPMENT} from '/src/equipment.js';
import {freshState,SAVE_KEY} from '/src/state.js';
import {serializeSave} from '/src/money.js';
import {ACCESS_KEY,ACCESS_SCHEMA,TERMS_REVISION,ACCESS_POLICY_REVISION} from '/src/access-rules.js';
if(location.host!=='127.0.0.1:4207')throw Error('Wrong QA origin');
const kind=new URLSearchParams(location.search).get('case')??'first';
if(sessionStorage.getItem('home-actions-seeded')!==kind){
  const now=Date.now(),s=freshState(now);
  s.sound=false;s.musicVolume=0;s.sfxVolume=0;s.gold=1000000000000;
  if(kind!=='first'){
    s.soldiers=81920;s.ncoSchoolLevel=5;s.officerSchoolLevel=3;s.personalLevels.commandBaton=5;
    if(kind==='max'){s[Object.values(UNITS).at(-1).field]=64;for(const d of Object.values(SCHOOLS))s[d.field]=d.maxLevel;s.equipment=Object.fromEntries(Object.keys(EQUIPMENT).map(id=>[id,{level:10,count:1,deployed:true}]));}
    if(kind==='owned'){
      s.potions.red.count=2;s.potions.blue.count=2;s.homeAutoTap={owned:true,enabled:false,source:'test'};
    }
  }
  localStorage.setItem(SAVE_KEY,serializeSave(s));localStorage.setItem(SAVE_KEY+'-backup',serializeSave(s));
  localStorage.setItem('budae-kiugi-ui-guide-off','1');
  // Synthetic local test consent only; ads remain disabled and no network identity exists.
  localStorage.setItem(ACCESS_KEY,JSON.stringify({schema:ACCESS_SCHEMA,ageBand:'adult',ageCheckedAt:now,
    termsRevision:TERMS_REVISION,policyRevision:ACCESS_POLICY_REVISION,acceptedAt:now,adsConsent:false,adNoticeRevision:0}));
  sessionStorage.setItem('home-actions-seeded',kind);
}
await import('/src/main.js');
`;
export default {root,define:{__APP_VERSION__:JSON.stringify(version)},
  server:{host:'127.0.0.1',port:4207,strictPort:true},
  plugins:[{name:'home-actions-qa',apply:'serve',
    transformIndexHtml(html){return html.replace('<script type="module" src="/src/main.js"></script>','<script type="module" src="/__home-fixture.js"></script>');},
    configureServer(server){server.middlewares.use((req,res,next)=>{
      if(req.url!=='/__home-fixture.js')return next();
      res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(seed);
    });},
  }],
};
