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
  // A visible gun assembly: wide muzzle, stepped barrel, recoil rails and a
  // luminous circular breech on an orbital support frame, rather than a blade.
  r(12,34,32,24,p.dark);r(8,40,40,13,p.dark);r(14,35,28,20,p.body);
  r(10,41,36,8,p.body);r(14,35,28,2,p.light);
  for(const x of [8,42]){r(x,28,6,29,p.dark);r(x+1,29,4,25,p.body);r(x+1,30,1,22,p.light);r(x+1,55,4,4,p.flag);}
  for(const x of [16,34]){r(x,25,6,26,p.dark);r(x+1,26,4,21,p.light);for(let y=30;y<47;y+=4)r(x+1,y,4,1,p.body);}
  // Muzzle aperture and thick barrel separate the laser cannon from the ICBM.
  r(18,2,20,8,p.dark);r(20,3,16,6,p.light);r(23,3,10,4,p.dark);r(24,4,8,2,p.flag);r(26,4,4,1,p.mark);
  r(21,9,14,24,p.dark);r(23,9,10,23,p.body);r(23,9,2,22,p.light);r(29,10,3,21,p.flag);
  for(const y of [12,19,26]){r(19,y,18,3,p.dark);r(20,y,16,1,p.light);r(27,y+1,5,1,p.flag);}
  // Octagonal breech and capacitors under the gun, with a glowing circular lens.
  r(19,32,18,22,p.dark);r(16,36,24,13,p.dark);r(20,33,16,20,p.light);r(18,37,20,11,p.body);
  r(23,35,10,16,p.body);r(21,38,14,10,p.dark);r(24,36,8,14,p.dark);
  r(24,38,8,10,p.flag);r(22,40,12,6,p.flag);r(25,39,6,8,p.mark);r(23,41,10,3,p.mark);
  for(const x of [13,39]){r(x,39,3,12,p.light);r(x,40,3,2,p.flag);r(x,47,3,2,p.flag);}
  r(21,54,14,7,p.dark);r(23,55,10,5,p.body);r(24,56,8,1,p.light);
  engine(r,5,42,p);engine(r,44,42,p);
  for(const x of [15,35]){r(x,56,6,6,p.dark);r(x+1,57,4,3,p.light);}
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
