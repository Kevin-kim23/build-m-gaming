import { artSurface, brush } from './pixel-detail.js';
const P={dark:'#19263d',body:'#536579',light:'#c8dae6',glow:'#73ece8',gold:'#d2a368',purple:'#8064a4'};
const IDS=['plasmaTank','droneCarrier','siegeMech','stellarBomber','novaCannon'];
export function galacticEquipmentSprite(level,id){
  if(!IDS.includes(id))throw new RangeError('Unknown galactic equipment: '+id);
  const canvas=artSurface(110,62),r=brush(canvas.getContext('2d')),p=P;
  r(5,54,100,4,'#17253b55');
  if(id==='plasmaTank'){
    r(9,39,90,17,p.dark);r(11,41,85,13,p.body);r(12,40,82,1,p.light);
    for(let x=13;x<93;x+=9){r(x,43,7,9,p.light);r(x+1,44,5,7,p.dark);r(x+2,46,3,3,p.body);r(x,54,7,1,p.light);}
    r(15,31,76,13,p.dark);r(18,30,70,11,p.body);r(21,30,64,2,p.light);
    r(32,18,37,17,p.dark);r(35,16,29,17,p.purple);r(37,17,25,2,p.light);
    r(58,22,45,6,p.dark);r(62,22,38,2,p.light);r(71,24,27,2,p.glow);r(100,21,7,8,p.body);r(105,23,2,4,p.glow);
    r(40,22,16,8,p.dark);r(42,23,12,5,p.glow);r(44,23,5,1,'#e5ffff');
    for(let x=18;x<87;x+=12){r(x,33,9,5,p.dark);r(x+1,33,7,1,p.light);r(x+1,35,5,1,p.purple);}
    for(const x of [68,79,90]){r(x,20,3,10,p.body);r(x+1,20,1,2,p.light);r(x+1,28,1,2,p.gold);}
    r(26,24,9,5,p.dark);for(let x=28;x<34;x+=2)r(x,24,1,4,p.light);
    r(48,11,9,5,p.dark);r(49,11,7,1,p.light);r(51,13,4,2,p.glow);
    r(19,15,1,16,p.light);r(17,17,5,1,p.glow);r(90,34,5,2,p.gold);
  }else if(id==='siegeMech'){
    // Articulated four-leg carriage and raised twin breech distinguish the siege gun.
    for(const [x,front] of [[12,false],[30,true],[68,false],[87,true]]){
      r(x,32,8,13,p.dark);r(x+1,33,5,10,p.purple);r(x+1,33,1,8,p.light);
      r(x-3,42,14,6,p.dark);r(x-2,42,11,4,p.body);r(x,43,5,2,p.gold);
      r(x+(front?2:-1),46,5,9,p.light);r(x+(front?3:0),47,3,7,p.body);
      r(x-5,54,18,4,p.dark);r(x-4,54,16,1,p.light);
    }
    r(16,29,79,11,p.dark);r(19,28,73,8,p.body);r(20,28,68,1,p.light);
    r(31,17,38,17,p.dark);r(35,13,27,22,p.purple);r(36,13,23,2,p.light);
    r(37,19,22,9,p.dark);r(40,20,15,6,p.glow);r(41,20,10,1,'#e5ffff');
    for(const y of [15,28]){
      r(56,y,48,9,p.dark);r(60,y+1,40,2,p.light);r(64,y+4,36,2,p.body);
      r(101,y-1,7,11,p.purple);r(106,y+2,2,5,p.dark);r(106,y+3,1,3,p.glow);
      for(const x of [67,78,89]){r(x,y-1,3,10,p.body);r(x,y-1,3,1,p.light);}
    }
    r(21,22,12,9,p.dark);for(let x=23;x<32;x+=3){r(x,23,2,5,p.light);r(x,23,2,1,p.gold);}
    r(40,7,15,6,p.dark);r(42,7,11,2,p.light);r(44,9,6,2,p.glow);
  }else if(id==='droneCarrier'){
    r(11,35,88,16,p.dark);r(7,32,98,11,p.body);r(11,29,88,5,p.light);r(15,31,76,2,p.purple);
    r(79,20,14,12,p.dark);r(81,18,10,12,p.light);r(82,22,8,3,p.glow);r(86,9,1,11,p.light);r(80,12,13,2,p.gold);
    for(const x of [20,42,64]){r(x,34,15,8,p.dark);r(x+2,34,11,2,p.glow);r(x+1,38,13,2,p.light);r(x+5,26,4,8,p.body);r(x,25,14,3,p.light);r(x+5,23,4,3,p.glow);}
    for(const x of [14,84]){r(x,47,14,5,p.purple);r(x+2,48,10,2,p.glow);}
    for(let x=13;x<76;x+=8){r(x,44,6,1,p.light);r(x+1,46,4,1,p.purple);r(x+3,50,1,1,p.gold);}
    r(14,28,60,1,p.dark);for(let x=17;x<73;x+=8)r(x,27,4,1,p.gold);
    for(const [x,y] of [[19,15],[45,9]]){
      r(x+4,y,9,6,p.dark);r(x+5,y,7,4,p.body);r(x+7,y+1,3,2,p.glow);
      r(x,y+1,19,1,p.light);r(x+1,y,3,3,p.purple);r(x+15,y,3,3,p.purple);
      r(x+3,y-2,1,7,p.light);r(x+15,y-2,1,7,p.light);
      r(x+8,y+5,1,4,p.dark);r(x+5,y+8,7,1,p.glow);
    }
    for(let y=35;y<44;y+=3){r(81,y,11,1,p.light);r(82,y+1,9,1,p.dark);}
  }else if(id==='stellarBomber'){
    r(8,35,94,5,p.dark);r(17,28,78,13,p.body);r(37,12,20,39,p.dark);r(40,10,14,39,p.body);
    for(let i=0;i<6;i++){r(18+i*11,24+i*2,10,5,p.light);r(18+i*11,30+i,10,3,p.purple);}
    r(46,25,57,8,p.light);r(101,27,7,4,p.body);r(65,25,12,4,p.glow);
    for(const x of [24,51,77]){r(x,39,12,9,p.dark);r(x+2,39,9,3,p.light);r(x-3,42,5,3,p.glow);r(x+4,43,8,2,p.gold);}
    r(41,47,12,7,p.dark);r(42,48,10,2,p.glow);
    r(71,22,17,3,p.dark);r(73,22,12,2,p.glow);r(74,22,5,.6,'#e5ffff');
    for(let x=48;x<92;x+=7){r(x,33,4,.7,p.dark);r(x+1,34,2,.7,p.light);}
    for(const x of [36,59,80]){r(x,43,13,4,p.dark);r(x+1,43,10,2,p.light);r(x+11,44,3,1,p.gold);r(x,41,2,7,p.purple);}
    r(17,23,18,1,p.gold);r(11,33,4,2,p.glow);r(95,34,4,2,p.gold);
    for(let x=28;x<43;x+=3){r(x,18,1,6,p.dark);r(x+1,18,.6,5,p.light);}
  }else{
    r(11,43,85,11,p.dark);r(16,40,75,11,p.body);r(18,40,71,2,p.light);
    for(const x of [18,34,66,82]){r(x,50,9,7,p.dark);r(x+2,51,5,3,p.light);}
    r(26,23,36,20,p.dark);r(29,21,30,19,p.purple);r(32,22,24,2,p.light);
    r(48,13,50,23,p.dark);r(49,15,49,4,p.light);r(49,29,49,4,p.light);r(57,20,44,8,p.body);r(61,22,44,4,p.glow);
    for(const x of [55,66,77,88]){r(x,12,4,23,p.gold);r(x+1,13,2,21,p.light);}
    r(98,17,9,16,p.dark);r(100,18,5,14,p.glow);r(102,20,2,10,'#f0ffff');r(35,27,11,8,p.glow);
    for(const x of [20,76]){r(x,38,10,12,p.dark);r(x+1,39,8,9,p.purple);for(let y=41;y<48;y+=3){r(x+2,y,6,1,p.light);r(x+3,y+1,4,1,p.glow);}}
    r(29,18,27,3,p.body);r(31,18,23,1,p.light);r(37,12,11,6,p.dark);r(39,13,7,2,p.glow);
    for(let x=27;x<86;x+=9){r(x,46,6,2,p.dark);r(x+1,46,4,.6,p.light);}
  }
  for(let x=20;x<90;x+=7){r(x,37,4,1,p.light);r(x,39,2,1,p.dark);r(x,51,2,1,p.gold);}
  for(let i=0;i<Math.min(level,10);i++){r(11+i*8,56,5,2,i>=7?p.gold:p.glow);r(13+i*7,34,2,2,p.light);}
  return canvas;
}

export function drawOverheadGalacticEquipment(c,level,side,id){
  if(!IDS.includes(id))throw new RangeError('Unknown galactic equipment: '+id);
  const r=brush(c),p={...P,...side,glow:side.flag};
  if(id==='plasmaTank'){
    for(const x of [6,42]){r(x,23,8,39,p.dark);for(let y=25;y<61;y+=5)r(x+1,y,6,2,p.light);}
    r(14,25,28,34,p.dark);r(16,26,24,30,p.body);r(18,28,20,18,p.purple);r(19,28,18,2,p.light);
    for(const x of [24]){r(x,3,7,29,p.dark);r(x+1,4,2,26,p.light);r(x+4,4,2,24,p.glow);r(x-1,2,9,4,p.body);}
    r(23,34,10,8,p.glow);r(25,35,5,2,p.light);
    for(const x of [17,36]){r(x,26,3,20,p.dark);r(x,27,1,17,p.light);for(let y=30;y<43;y+=4)r(x,y,3,1,p.purple);}
    for(const y of [10,18,26]){r(22,y,11,2,p.body);r(23,y,9,.7,p.light);}
    r(20,47,16,8,p.dark);for(let y=49;y<55;y+=2)r(22,y,12,.7,p.light);
    r(19,23,5,3,p.light);r(32,23,5,3,p.light);r(27,28,2,3,p.gold);
  }else if(id==='siegeMech'){
    // Four separated outriggers, large joint hubs and two unmistakable barrels.
    for(const [x,y] of [[5,29],[41,29],[5,50],[41,50]]){
      r(x,y,10,12,p.dark);r(x+1,y+1,8,9,p.body);r(x+2,y+1,6,2,p.light);
      r(x+3,y+4,4,4,p.purple);r(x+4,y+4,2,2,p.gold);
    }
    r(11,34,34,9,p.dark);r(13,36,30,4,p.light);r(12,54,32,5,p.dark);r(14,54,28,2,p.light);
    r(15,24,26,33,p.dark);r(17,26,22,28,p.body);r(18,26,20,2,p.light);
    r(19,29,18,20,p.purple);r(20,30,16,2,p.light);r(24,35,8,10,p.dark);r(25,36,6,8,p.glow);
    for(const x of [16,32]){
      r(x,4,8,27,p.dark);r(x+1,5,5,24,p.body);r(x+1,5,1,22,p.light);
      r(x-1,2,10,6,p.purple);r(x,3,8,3,p.dark);r(x+2,3,4,2,p.glow);
      for(const y of [13,21]){r(x-1,y,10,2,p.light);r(x+1,y+1,6,1,p.body);}
    }
    r(21,50,14,5,p.dark);for(let x=23;x<35;x+=3)r(x,51,1,3,p.light);
  }else if(id==='droneCarrier'){
    r(10,9,36,51,p.dark);r(12,8,32,48,p.body);r(14,10,28,2,p.light);r(26,4,4,51,p.light);
    for(const x of [15,33])for(const y of [19,33,47]){r(x-2,y,10,7,p.dark);r(x+1,y-3,4,12,p.light);r(x-3,y+1,12,3,p.body);r(x+2,y,2,3,p.glow);}
    r(17,58,7,5,p.glow);r(32,58,7,5,p.glow);
    r(11,12,2,42,p.light);r(43,12,2,42,p.light);r(21,9,3,7,p.purple);r(33,9,7,5,p.dark);r(34,10,5,2,p.glow);
    for(let y=15;y<55;y+=8){r(27,y,2,4,p.gold);r(13,y,1,2,p.dark);r(43,y,1,2,p.dark);}
    for(const y of [17,31,45]){r(14,y,10,.7,p.glow);r(32,y,10,.7,p.glow);}
  }else if(id==='stellarBomber'){
    for(let i=0;i<5;i++){r(4+i*5,35-i*4,7,10,p.light);r(45-i*5,35-i*4,7,10,p.light);}
    r(23,6,10,49,p.dark);r(25,4,6,47,p.body);r(26,8,3,13,p.glow);
    for(const x of [9,18,34,43]){r(x,35,5,19,p.dark);r(x+1,37,2,15,p.light);r(x+1,53,3,6,p.glow);}
    r(18,53,20,7,p.purple);r(22,60,12,3,p.glow);
    for(let n=0;n<5;n++){r(6+n*4,37-n*3,4,1,p.body);r(46-n*4,37-n*3,4,1,p.body);r(8+n*4,40-n*3,2,.6,p.gold);r(44-n*4,40-n*3,2,.6,p.gold);}
    r(24,24,8,18,p.dark);r(25,25,6,15,p.body);for(let y=27;y<39;y+=3){r(26,y,4,1,p.gold);r(27,y-1,2,3,p.light);}
    r(26,5,4,1,p.light);r(27,9,1,7,p.mark);r(5,36,2,2,p.glow);r(49,36,2,2,p.gold);
    for(const x of [10,19,35,44])for(let y=40;y<52;y+=4){r(x,y,2,1,p.body);r(x,y+1,.6,2,p.light);}
  }else{
    r(8,35,40,25,p.dark);r(10,36,36,21,p.body);r(12,37,32,2,p.light);
    r(17,8,22,39,p.dark);r(18,9,5,35,p.light);r(33,9,5,35,p.light);r(25,6,6,39,p.glow);
    for(const y of [13,23,33]){r(15,y,26,4,p.purple);r(16,y,24,1,p.gold);}
    r(15,3,26,7,p.dark);r(19,4,18,4,p.glow);r(25,4,6,3,'#e8ffff');
    for(const x of [7,43]){r(x,43,6,19,p.dark);r(x+1,44,3,15,p.light);}
    for(const x of [10,39]){r(x,27,7,15,p.dark);r(x+1,28,5,12,p.purple);for(let y=30;y<39;y+=3){r(x+2,y,3,1,p.glow);r(x+2,y+1,3,.6,p.light);}}
    for(const y of [16,26,36]){r(23,y,2,4,p.gold);r(31,y,2,4,p.gold);r(26,y,4,1,p.mark);}
    r(20,48,16,8,p.dark);r(21,49,14,6,p.purple);r(24,50,8,3,p.glow);r(26,50,4,1,p.light);
  }
  for(let y=43;y<55;y+=3){r(22,y,12,1,p.dark);r(22,y+1,2,1,p.gold);}
  for(let i=0;i<Math.min(10,level);i++)r(i%2?39:14,24+Math.floor(i/2)*6,3,2,i>6?p.gold:p.light);
}
