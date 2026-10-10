import { artSurface } from './pixel-detail.js';

// Separate original overhead plans; never render or resize the front-facing home art.
// Floor plans, roof equipment, access roads and subordinate blocks identify each HQ.
const IDS=Object.freeze(['soldier','squad','platoon','company','battalion','regiment',
  'division','corps','fieldArmy','armyGroup','alliedArmy','grandAlliedArmy','supremeCommand',
  'galacticCommand','galacticGroupCommand','galacticCorps','galacticFieldArmy',
  'galacticArmyGroup','galacticAlliedArmy','galacticGrandAlliedArmy']);
const TEAM=Object.freeze({
  player:{dark:'#273f36',body:'#688768',light:'#a6bea0',mark:'#e2ead3',flag:'#8dbbbb'},
  enemy:{dark:'#694947',body:'#bc8480',light:'#e4b8ad',mark:'#f9d7ca',flag:'#cd7c79'},
});
const cache=new Map();

export function battleHeadquartersSize(id){
  const tier=IDS.indexOf(id);
  if(tier<0)throw new RangeError(`Unknown headquarters: ${id}`);
  return {width:72+tier*8,height:50+tier*4};
}

export function drawBattleHeadquarters(c,id,side='player'){
  const tier=IDS.indexOf(id),size=battleHeadquartersSize(id),team=TEAM[side];
  if(!team)throw new RangeError(`Unknown headquarters side: ${side}`);
  const space=tier>=13,sx=size.width/144,sy=size.height/100;
  const p=space?{edge:'#202338',shadow:'#343750',roof:'#686b87',light:'#a4b2cc',
    metal:'#c9d9e8',glass:'#398d9f',glow:'#9ceff1',accent:'#a395d7'}:
    {edge:team.dark,shadow:'#3e5054',roof:team.body,light:team.light,
      metal:team.mark,glass:'#356976',glow:'#91c4cc',accent:team.flag};
  const r=(x,y,w,h,color)=>{
    c.fillStyle=color;
    c.fillRect(x*sx,(side==='player'?100-y-h:y)*sy,w*sx,h*sy);
  };
  const roof=(x,y,w,h,{solar=false,crest=false}={})=>{
    r(x+2,y+2,w,h,'#15273866');r(x,y,w,h,p.edge);r(x+1,y+1,w-2,h-2,p.roof);
    r(x+1,y+1,w-3,1,p.metal);r(x+1,y+1,1,h-3,p.light);
    r(x+w-3,y+3,2,h-3,p.shadow);r(x+3,y+h-3,w-3,2,p.shadow);
    // Flat roof panels, raised rim, skylights and HVAC read clearly from overhead.
    if(w>=14&&h>=12){
      r(x+3,y+3,w-7,h-7,p.light);r(x+4,y+4,w-9,h-9,p.roof);
      for(let xx=x+6;xx<x+w-6;xx+=7){r(xx,y+5,.6,h-11,p.shadow);r(xx+.7,y+5,.3,h-11,p.light);}
      r(x+4,y+h-7,Math.min(9,w-9),3,p.edge);r(x+5,y+h-6,Math.min(7,w-11),1,p.metal);
      if(solar){
        const sw=Math.min(15,w-10);r(x+5,y+5,sw,5,p.edge);
        for(let xx=x+6;xx<x+4+sw;xx+=3){r(xx,y+6,2,3,p.glass);r(xx,y+6,2,.7,p.glow);}
      }
      else {r(x+w-9,y+4,4,4,p.edge);r(x+w-8,y+5,2,2,p.light);}
      if(crest){r(x+w/2-4,y+h/2-3,8,6,team.body);r(x+w/2-1,y+h/2-2,2,4,team.mark);r(x+w/2-3,y+h/2-.5,6,1,team.mark);}
    }
  };
  const tent=(x,y,w,h)=>{
    r(x+2,y+2,w,h,'#15273866');r(x,y,w,h,team.dark);r(x+1,y+1,w-2,h-2,team.body);
    r(x+2,y+2,w/2-2,h-4,team.light);r(x+w/2,y+1,1,h-2,team.mark);
    r(x+w/2-3,y+h-4,6,4,team.dark);
    for(const yy of [y+3,y+h-4])for(const xx of [x-2,x+w]){r(xx,yy,2,1,team.mark);}
  };
  const road=(x,y,w,h)=>{
    r(x,y,w,h,space?'#425267':'#727971');
    if(w>h)for(let xx=x+3;xx<x+w-4;xx+=9)r(xx,y+h/2-.4,4,.8,'#cfcead');
    else for(let yy=y+3;yy<y+h-4;yy+=9)r(x+w/2-.4,yy,.8,4,'#cfcead');
  };
  const pad=(x,y,w=17)=>{
    r(x,y,w,w,p.edge);r(x+1,y+1,w-2,w-2,p.roof);r(x+3,y+3,w-6,1,p.metal);r(x+3,y+w-4,w-6,1,p.metal);
    r(x+4,y+5,2,w-10,p.metal);r(x+w-6,y+5,2,w-10,p.metal);r(x+5,y+w/2-1,w-10,2,p.metal);
  };
  const dish=(x,y,large=false)=>{
    const rad=large?6:4;
    r(x-rad-1,y-rad-1,rad*2+2,rad*2+2,p.edge);
    for(let yy=-rad;yy<=rad;yy++){
      const half=Math.floor(Math.sqrt(rad*rad-yy*yy));
      if(half)r(x-half,y+yy,half*2,1,yy<0?p.metal:p.light);
    }
    r(x-.6,y-rad,1.2,rad*2,p.shadow);r(x-rad,y-.6,rad*2,1.2,p.shadow);
    r(x-1,y-1,2,2,p.glow);
  };
  const ring=(cx,cy,rx,ry,lit=true)=>{
    for(let n=0;n<80;n++){
      const angle=n*Math.PI/40,x=cx+rx*Math.cos(angle),y=cy+ry*Math.sin(angle);
      r(x-1.5,y-1,3,2,n<40?p.shadow:p.metal);
      if(lit&&n%10===0)r(x-.6,y-.7,1.2,1.4,p.glow);
    }
  };
  const core=(x,y,w,h,steps=2)=>{
    roof(x,y,w,h,{solar:false});
    for(let n=0;n<steps;n++){
      const inset=3+n*3;
      if(w-inset*2>=12&&h-inset*2>=12)roof(x+inset,y+inset,w-inset*2,h-inset*2,{solar:false,crest:n===steps-1});
    }
    r(x+w/2-5,y+h/2-4,10,8,p.glass);r(x+w/2-4,y+h/2-3,8,1,p.glow);
    for(let n=0;n<Math.min(5,tier-11);n++)r(x+w/2-5+n*2,y+h/2,1,2,p.metal);
  };
  // Small formations are actual field camps with pitched tents and supply sheds.
  if(tier<3){
    r(15,17,114,69,'#182d2544');r(17,19,110,65,'#65775e88');road(67,53,10,33);
    if(tier===0){tent(53,31,36,26);roof(95,42,16,17);}
    if(tier===1){tent(29,28,33,27);tent(83,28,33,27);roof(30,62,25,14);}
    if(tier===2){tent(26,25,30,22);tent(89,25,30,22);roof(51,54,42,23,{solar:true,crest:true});roof(103,62,16,16);}
    r(22,70,8,5,team.body);r(22,70,8,1,team.mark);
    return true;
  }
  // Shared paved boundary contains all sub-buildings; team stripes remain visible.
  r(4,6,136,88,'#182d2555');r(5,5,132,87,space?'#344457':'#657065');
  r(7,7,128,83,space?'#42526a':'#85897b');r(8,8,126,1,p.light);
  road(67,9,10,82);road(10,43,123,10);
  if(tier>=5){
    for(const [x,y,w,h] of [[8,8,128,3],[8,9,3,72],[133,9,3,72],[8,81,49,3],[88,81,48,3]]){
      r(x,y,w,h,p.edge);r(x,y,w,1,p.metal);
    }
    for(const [x,y] of [[9,9],[122,9],[9,73],[122,73]]){r(x,y,10,9,p.edge);r(x+1,y+1,8,6,team.body);r(x+3,y+3,4,2,team.mark);}
  }
  switch(id){
    case 'company':
      roof(19,20,43,22,{solar:true});roof(82,20,43,22);roof(29,59,30,18);roof(86,60,31,17,{crest:true});break;
    case 'battalion':
      roof(37,16,69,25,{crest:true});roof(20,57,37,23,{solar:true});roof(87,57,37,23);dish(120,26);break;
    case 'regiment':
      roof(29,18,34,24,{solar:true});roof(82,18,34,24);roof(30,58,28,18);roof(84,57,32,21,{crest:true});pad(62,61,16);break;
    case 'division':
      roof(27,18,29,61);roof(88,18,29,61,{solar:true});roof(49,35,47,21,{crest:true});pad(63,61,17);dish(71,24);break;
    case 'corps':
      roof(24,19,96,20,{solar:true,crest:true});roof(24,34,23,44);roof(97,34,23,44);pad(62,49,21);dish(111,28);break;
    case 'fieldArmy':
      roof(58,17,28,61,{crest:true});roof(28,32,90,24,{solar:true});pad(28,62);pad(100,62);dish(39,22);dish(109,22);break;
    case 'armyGroup':
      roof(26,20,39,30,{solar:true});roof(79,20,39,30,{solar:true});roof(49,36,46,27,{crest:true});roof(25,61,28,18);roof(91,61,28,18);dish(72,22);break;
    case 'alliedArmy':
      roof(25,21,93,21,{solar:true});roof(24,41,27,34);roof(93,41,27,34);core(52,30,40,39);pad(61,73,14);dish(35,29);dish(108,29);break;
    case 'grandAlliedArmy':
      roof(25,19,25,52,{solar:true});roof(94,19,25,52,{solar:true});roof(45,18,54,18,{crest:true});roof(45,62,54,17);core(52,31,40,37,3);dish(35,28,true);dish(108,28,true);break;
    case 'supremeCommand':
      roof(27,18,89,18,{solar:true});roof(24,38,28,40);roof(92,38,28,40);roof(44,46,57,18);core(53,24,38,49,3);pad(30,47,15);pad(100,47,15);dish(40,26,true);dish(105,26,true);break;
    default:{
      const galactic=tier-13;
      // Four support commands surround the central roof, with each succeeding
      // plan adding a different corridor/halo/reactor arrangement.
      for(const [x,y] of [[23,19],[100,19],[23,60],[100,60]])roof(x,y,21,19,{solar:true});
      if(galactic===0){
        roof(45,39,55,17);roof(62,22,20,54);ring(72,48,35,26);core(53,30,38,37,3);
      }else if(galactic===1){
        roof(36,39,72,17);roof(61,17,22,64);ring(72,48,43,29);core(51,27,42,42,3);dish(35,29);dish(110,29);
      }else if(galactic===2){
        roof(43,21,18,57);roof(84,21,18,57);roof(37,38,70,15);ring(72,48,23,31);core(53,28,38,42,3);pad(63,71,17);dish(34,28,true);dish(111,28,true);
      }else if(galactic===3){
        roof(42,22,60,16);roof(42,62,60,16);roof(31,38,83,20);ring(72,48,43,19);core(51,27,42,43,3);dish(34,68,true);dish(111,68,true);
      }else if(galactic===4){
        roof(35,23,21,50);roof(88,23,21,50);roof(45,30,55,37);ring(72,49,37,31);core(56,22,32,53,3);dish(34,27,true);dish(111,27,true);pad(25,61);pad(103,61);
      }else if(galactic===5){
        roof(39,17,66,17);roof(28,36,89,16);roof(38,65,68,15);ring(72,48,47,28);core(51,24,42,48,4);dish(34,67,true);dish(110,67,true);roof(29,22,13,14);roof(103,22,13,14);
      }else {
        roof(39,18,66,15);roof(22,39,100,18);roof(38,65,68,15);ring(72,48,51,32);ring(72,48,38,23);core(49,23,46,51,4);
        for(const [x,y] of [[34,27],[110,27],[34,69],[110,69]])dish(x,y,true);
      }
      // Energy conduits are visible at roof edges without obscuring the plan.
      for(const y of [16,83])for(let x=29;x<116;x+=12){r(x,y,6,1,p.accent);r(x,y,2,1,p.glow);}
    }
  }
  // Accessible gate and roof emblem use the team's own color at all levels.
  r(59,79,26,5,p.edge);r(61,80,22,3,team.body);
  for(const x of [57,84]){r(x,78,3,8,p.metal);r(x,78,3,2,team.flag);}
  for(let x=63;x<83;x+=4)r(x,85,2,4,p.metal);
  return true;
}

export function battleHeadquartersSprite(id,side='player'){
  const key=`${side}:${id}`;
  if(cache.has(key))return cache.get(key);
  const {width,height}=battleHeadquartersSize(id),canvas=artSurface(width,height);
  drawBattleHeadquarters(canvas.getContext('2d'),id,side);
  cache.set(key,canvas);
  return canvas;
}
