import { brush } from './pixel-detail.js';

// Battle silhouettes face north; the caller rotates enemies and supplies their red palette.
function jet(r,x,y,p) {
  r(x+2,y,2,8,p.light);r(x,y+3,6,2,p.light);r(x+1,y+6,4,1,p.body);r(x+2,y+1,1,2,p.flag);
}
function carrier(r,p) {
  r(12,13,32,44,p.dark);r(16,7,24,7,p.dark);r(20,3,16,5,p.dark);r(23,1,10,4,p.light);
  r(14,14,27,44,p.body);r(17,8,23,47,p.body);r(21,5,16,4,p.body);
  r(12,20,4,35,p.light);r(14,55,25,6,p.dark);r(17,60,18,2,p.body);
  r(17,10,1,45,p.light);r(32,8,1,46,p.light);r(18,55,17,1,p.light);
  for(let y=10;y<55;y+=7)r(25,y,1,4,p.mark);
  for(const y of [44,47,50])r(19,y,12,.7,p.mark);
  r(35,24,10,18,p.dark);r(35,24,8,15,p.light);r(36,25,6,12,p.body);r(36,26,6,2,p.flag);
  r(38,19,1,10,p.light);r(35,21,7,1,p.flag);r(40,34,2,4,p.dark);
  jet(r,18,18,p);jet(r,18,31,p);jet(r,27,39,p);
  r(34,11,5,7,p.dark);r(35,12,3,5,p.light);r(37,46,5,8,p.dark);r(38,47,3,6,p.light);
  for(let y=17;y<56;y+=6){r(12,y,1,2,p.dark);r(41,y,2,1,p.light);}
}
function engine(r,x,y,p){r(x,y,7,18,p.dark);r(x+1,y,5,15,p.body);r(x+1,y,2,13,p.light);r(x+2,y+15,3,5,p.flag);r(x+3,y+19,1,3,p.mark);}
function fortress(r,p) {
  r(18,9,20,43,p.dark);r(21,5,14,47,p.body);r(25,2,6,4,p.light);
  r(5,25,46,19,p.dark);r(8,23,40,17,p.body);r(8,23,40,2,p.light);
  for(let n=0;n<5;n++){r(10+n*2,19-n*2,36-n*4,3,p.body);r(15+n,40+n*2,26-n*2,3,p.body);}
  engine(r,4,31,p);engine(r,14,43,p);engine(r,35,43,p);engine(r,45,31,p);
  r(22,12,12,18,p.dark);r(24,13,8,13,p.body);r(24,13,8,2,p.flag);r(25,19,6,3,p.light);
  r(22,30,12,17,p.dark);r(24,31,8,12,p.light);r(26,33,4,8,p.flag);
  for(const x of [12,39]){r(x,21,5,10,p.dark);r(x+1,23,3,6,p.light);r(x+2,14,1,10,p.light);}
  for(let y=32;y<43;y+=4){r(12,y,7,1,p.light);r(37,y,7,1,p.light);}
  r(22,51,12,5,p.light);r(25,53,6,6,p.flag);
}
function orbital(r,p) {
  for(let n=0;n<8;n++){r(9+n*2,47-n*4,38-n*4,5,p.dark);r(11+n*2,46-n*4,34-n*4,3,p.body);}
  r(22,8,12,49,p.dark);r(24,4,8,52,p.body);r(26,1,4,57,p.light);r(27,3,2,55,p.flag);
  r(19,26,18,16,p.dark);r(21,27,14,12,p.body);r(23,28,10,2,p.light);
  r(24,17,8,7,p.dark);r(25,17,6,2,p.flag);r(25,20,6,2,p.body);
  engine(r,6,41,p);engine(r,43,41,p);
  r(21,51,14,10,p.dark);r(24,54,8,7,p.body);r(25,60,6,4,p.flag);r(27,64,2,2,p.mark);
  for(const x of [17,36]){r(x,29,3,15,p.dark);r(x,30,1,13,p.light);r(x+1,23,1,10,p.flag);}
  for(let y=34;y<50;y+=4){r(12+(50-y)/4,y,5,1,p.light);r(39-(50-y)/4,y,5,1,p.light);}
  r(24,34,8,6,p.dark);r(26,34,4,6,p.flag);
}
const PAINTERS=Object.freeze({carrier,flyingFortress:fortress,orbitalAssault:orbital});
export function drawOverheadLateEquipment(c,level,p,id) {
  const draw=PAINTERS[id];
  if(!draw)throw new RangeError('Unknown late equipment: '+id);
  const r=brush(c);draw(r,p);
  for(let y=15;y<51;y+=6){r(21,y,.6,.6,p.mark);r(34,y,.6,.6,p.dark);r(30,y+2,2,.5,p.light);}
  for(let i=0;i<Math.min(level,10);i++){
    const x=i%2?34:19,y=14+Math.floor(i/2)*8;
    r(x,y,3,2,level>=8?'#e7cd89':p.light);r(x,y,1,.7,p.mark);
  }
  if(level>=7){r(39,5,1,12,p.light);r(36,6,7,1,p.flag);}
}
