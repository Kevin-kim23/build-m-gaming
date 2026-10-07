import { artSurface, brush } from './pixel-detail.js';

// Original fictional capital ships. Shared by the equipment card and parade ground.
const C = Object.freeze({ dark:'#243b4b', body:'#64828d', light:'#b9d1d4', shade:'#3c5969', deck:'#526c78', glow:'#94e6e4', gold:'#e4cc89' });
function smallJet(r,x,y) {
  r(x,y+2,9,2,C.light);r(x+2,y,2,6,C.light);r(x+6,y+1,3,1,C.body);
  r(x+3,y+2,2,1,C.glow);r(x,y+3,2,1,C.dark);
}
function carrier(r,level) {
  // Right-facing bow, raised island, angled landing strip and tiny deck aircraft.
  r(6,53,95,4,'#24485144');r(12,55,76,2,'#72adbc66');
  r(10,37,88,13,C.dark);r(16,45,74,8,C.dark);r(20,50,65,4,C.shade);
  r(8,35,95,9,C.body);r(12,43,85,4,C.shade);r(98,37,8,5,C.body);r(103,36,5,3,C.light);
  r(12,31,87,5,C.light);r(6,34,99,3,C.light);r(9,36,91,2,C.dark);
  r(10,32,90,3,C.deck);r(15,29,73,3,C.deck);r(8,35,92,1,C.body);
  for(let x=18;x<82;x+=7){r(x,32,4,.7,'#e1ded0');r(x+1,41,2,1,C.light);}
  r(17,34,55,.7,'#d5cbb0');r(27,30,37,.7,'#d5cbb0');
  r(25,31,1,5,C.dark);r(29,31,1,5,C.dark);r(33,31,1,5,C.dark);
  r(67,18,21,14,C.dark);r(69,16,16,14,C.body);r(70,16,14,2,C.light);
  r(63,21,23,5,C.shade);r(65,20,22,2,C.light);r(66,22,19,2,'#294756');
  for(let x=67;x<85;x+=4)r(x,22,2,1,C.glow);
  r(73,9,2,10,C.light);r(67,10,14,2,C.shade);r(69,9,10,1,C.light);
  r(80,12,2,6,C.dark);r(77,12,8,2,C.body);
  smallJet(r,19,26);smallJet(r,43,26);
  r(12,39,8,4,C.dark);r(14,39,4,1,C.light);r(31,43,34,1,C.light);
  for(let x=24;x<81;x+=8){r(x,46,4,.7,C.body);r(x+2,44,.6,.6,C.light);}
  for(let x=20;x<85;x+=6){r(x,38,1,.6,C.light);r(x,48,3,.6,C.dark);}
  for(const x of [21,41,61,81]){r(x,39,2,2,'#d7c59a');r(x+.6,39.6,.8,.8,C.dark);}
  if(level>=1){r(8,35,90,1,'#dde8de');r(18,38,65,.6,C.light);}
  if(level>=2){r(88,30,10,4,C.dark);r(89,30,8,2,C.light);}
  if(level>=3)smallJet(r,33,24);
  if(level>=4){r(25,39,13,4,C.dark);r(26,39,11,2,C.body);r(26,39,11,.6,C.light);}
  if(level>=5){r(11,28,7,4,C.shade);r(12,27,6,2,C.light);r(17,27,7,1,C.light);}
  if(level>=6){r(53,24,6,6,C.body);r(54,24,4,1,C.light);r(57,25,6,1,C.light);}
  if(level>=7){r(69,12,4,5,C.light);r(69,12,5,1,C.glow);r(71,5,1,8,C.light);}
  if(level>=8){r(20,40,64,2,C.light);r(23,41,57,1,C.body);}
  if(level>=9){r(61,7,1,21,C.light);r(57,8,9,2,C.glow);r(76,13,7,1,C.glow);}
  if(level>=10){r(67,18,19,1,C.gold);r(14,35,83,.7,C.gold);r(49,42,10,2,C.gold);}
}
function thruster(r,x,y,level) {
  r(x,y,17,7,C.dark);r(x+2,y,14,2,C.light);r(x+1,y+2,15,4,C.body);
  r(x,y+1,3,5,'#1a394c');r(x-3,y+2,3,3,C.glow);r(x-5,y+3,2,1,'#d3fbeb');
  if(level>=4)r(x+6,y+4,8,1,C.glow);
}
function fortress(r,level) {
  // Broad airborne platform: four engine pods, command bridge and two turret decks.
  r(12,55,85,2,'#223c4244');
  r(22,19,62,7,C.dark);r(28,16,50,7,C.body);r(32,16,42,1,C.light);
  r(13,29,85,12,C.dark);r(18,25,78,13,C.body);r(24,23,65,3,C.light);
  r(26,37,62,9,C.shade);r(32,44,47,3,C.dark);
  r(91,28,11,9,C.body);r(100,31,7,3,C.light);r(98,31,3,5,C.shade);
  r(8,22,39,4,C.body);r(13,20,34,2,C.light);r(8,36,48,5,C.body);r(13,40,48,2,C.light);
  for(const [x,y] of [[19,19],[37,14],[19,44],[40,49]])thruster(r,x,y,level);
  r(57,14,23,12,C.dark);r(61,12,16,13,C.body);r(62,12,13,2,C.light);
  r(62,17,20,5,'#294a5f');r(63,17,18,1,C.glow);
  for(let x=64;x<80;x+=4)r(x,19,2,1,C.glow);
  r(43,26,35,10,C.dark);r(45,26,31,2,C.light);r(47,29,25,4,C.body);
  for(let x=51;x<74;x+=6){r(x,29,3,2,C.glow);r(x+1,33,2,.6,C.light);}
  for(const y of [23,38]){r(81,y,10,5,C.dark);r(82,y-1,8,3,C.light);r(88,y,15,2,C.body);r(92,y,11,.7,C.light);}
  for(let x=23;x<88;x+=8){r(x,34,4,.6,C.light);r(x+1,27,.6,.6,C.dark);}
  for(let x=27;x<77;x+=5){r(x,36,3,.6,C.dark);r(x+1,27,.6,1,C.light);}
  for(const x of [20,38])for(let n=0;n<4;n++){r(x+6+n*2,x===20?22:17,.7,3,C.dark);r(x+6+n*2,x===20?47:52,.7,2,C.dark);}
  if(level>=1){r(88,29,11,2,C.light);r(76,36,12,1,C.light);}
  if(level>=2){r(32,27,9,7,C.dark);r(34,27,5,5,C.glow);}
  if(level>=3){r(44,40,25,3,C.body);r(46,40,21,1,C.light);}
  if(level>=5){r(65,8,2,7,C.light);r(60,8,11,2,C.glow);}
  if(level>=6){r(80,23,4,5,C.glow);r(80,39,4,4,C.glow);}
  if(level>=7){r(47,20,7,5,C.dark);r(48,19,5,3,C.light);r(49,16,1,4,C.glow);}
  if(level>=8){r(30,24,8,2,C.light);r(54,45,17,2,C.light);r(25,40,12,2,C.light);}
  if(level>=9){r(57,5,1,16,C.light);r(53,6,9,1,C.glow);}
  if(level>=10){r(44,26,33,1,C.gold);r(61,12,15,1,C.gold);r(56,29,3,6,C.gold);}
}
function orbital(r,level) {
  // Swept cruiser hull with a luminous spine, armored prow and paired drive nacelles.
  r(13,55,85,2,'#223c4244');
  for(let n=0;n<6;n++){r(17+n*5,13+n*2,38-n*3,4,C.dark);r(17+n*5,40-n*2,38-n*3,4,C.body);}
  r(13,25,75,15,C.dark);r(21,23,64,14,C.body);r(30,21,48,3,C.light);
  r(82,25,14,12,C.body);r(94,27,8,8,C.light);r(101,30,6,2,C.light);
  r(87,34,10,3,C.shade);r(24,37,57,4,C.shade);
  r(22,28,60,6,'#213d52');r(28,29,60,2,C.glow);r(42,29,38,1,'#dbfff3');
  thruster(r,14,10,level);thruster(r,14,44,level);
  r(11,27,9,11,C.shade);r(9,29,5,6,C.glow);r(5,31,5,2,'#d3fff4');
  r(50,13,22,9,C.dark);r(54,11,13,10,C.body);r(55,11,10,2,C.light);
  r(60,16,14,3,'#2e526c');r(61,16,12,1,C.glow);
  for(const y of [20,39]){r(63,y,21,3,C.dark);r(65,y,17,1,C.light);r(80,y,17,1,C.glow);}
  for(let x=31;x<80;x+=8){r(x,25,5,.7,C.light);r(x+2,35,4,.7,C.light);r(x,31,2,3,C.body);}
  r(38,17,8,4,C.body);r(39,17,6,1,C.light);r(32,40,14,3,C.light);
  for(let x=31;x<78;x+=5){r(x,24,.7,2,C.dark);r(x,36,.7,.7,C.light);r(x+1,38,3,.6,C.dark);}
  for(const y of [12,46])for(let x=21;x<29;x+=2)r(x,y,.7,3,C.dark);
  if(level>=1){r(86,26,7,2,C.glow);r(93,29,7,2,C.glow);}
  if(level>=2){r(26,14,12,2,C.light);r(26,43,12,2,C.light);}
  if(level>=3){r(34,26,6,9,C.dark);r(35,27,4,6,C.glow);}
  if(level>=5){r(45,17,7,4,C.light);r(46,18,5,1,C.glow);r(46,39,9,2,C.light);}
  if(level>=6){r(75,24,7,2,C.light);r(75,35,7,2,C.light);}
  if(level>=7){r(56,6,1,8,C.light);r(52,7,9,2,C.glow);}
  if(level>=8){r(19,21,17,2,C.body);r(20,21,14,1,C.light);r(59,41,17,2,C.light);}
  if(level>=9){r(44,5,1,14,C.light);r(40,6,9,1,C.glow);r(39,48,25,1,C.glow);}
  if(level>=10){r(30,21,48,1,C.gold);r(54,11,13,1,C.gold);r(54,28,3,6,C.gold);r(91,28,2,6,C.gold);}
}
const PAINTERS=Object.freeze({carrier,flyingFortress:fortress,orbitalAssault:orbital});
export function lateEquipmentSprite(level,id) {
  const draw=PAINTERS[id];
  if(!draw)throw new RangeError('Unknown late equipment: '+id);
  const canvas=artSurface(110,62),r=brush(canvas.getContext('2d'));
  draw(r,level);
  for(let n=0;n<level;n++)r(7+n*4,59,3,2,C.gold);
  return canvas;
}
