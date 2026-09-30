import { artSurface, brush } from './pixel-detail.js';

// Original right-facing aircraft. Engraved panels, engines and mission gear
// distinguish every upgrade; the field and equipment catalog share the sprite.
export function aircraftSprite(level,id) {
  const canvas=artSurface(110,62),r=brush(canvas.getContext('2d'));
  const transport=id==='transport',dark='#263d40',body=transport?'#83958c':'#718e98',light='#c4d5cf',gold='#e6cc86';
  r(10,54,91,3,'#132c2544');
  if(transport){
    r(12,28,72,16,dark);r(20,25,66,18,body);r(30,24,52,3,light);r(81,28,14,13,body);r(95,32,8,7,body);r(99,34,7,3,light);
    r(14,13,6,23,dark);r(16,11,8,22,body);r(17,11,6,2,light);r(23,17,5,17,body);
    r(6,29,26,4,light);r(9,32,27,3,body);
    for(let i=0;i<7;i++){r(42+i*4,22-i,22-i*2,3,body);r(36+i*3,36+i*2,25-i,3,i%2?body:light);}
    for(const x of [40,58]){r(x,35,11,10,dark);r(x+1,35,9,6,light);r(x+8,36,3,8,body);r(x+10,31,1,18,dark);r(x+9,31,3,3,light);r(x+9,47,3,2,light);}
    r(81,27,9,5,'#426b80');r(89,30,6,4,'#82b1bb');r(82,27,7,1,'#def0de');
    r(29,42,5,9,dark);r(30,49,8,4,'#192b2e');r(78,41,3,9,dark);r(77,48,6,4,'#192b2e');
    r(28,30,9,12,dark);r(29,31,7,10,body);r(30,32,5,1,light);r(33,36,2,1,dark);
    for(let x=41;x<77;x+=7){r(x,29,4,3,'#425b61');r(x,29,4,1,light);}
    r(20,40,63,2,'#5b7269');r(17,17,7,2,'#b9cabc');
  } else {
    for(let i=0;i<9;i++){r(25+i*4,35-i*2,30-i*2,3,body);r(22+i*4,35+i*2,34-i*2,3,i%2?body:light);}
    r(14,29,69,11,dark);r(18,28,67,8,body);r(34,27,41,3,light);r(80,30,14,7,body);r(93,32,13,3,light);
    r(17,12,5,20,dark);r(20,12,7,20,body);r(22,11,6,2,light);r(27,20,8,12,body);
    r(7,28,22,5,body);r(5,34,27,3,light);r(11,31,9,7,'#1b3038');r(13,32,6,2,'#c29563');
    r(60,22,13,7,dark);r(63,21,9,6,'#74a9bf');r(64,21,6,2,'#d1e7e4');r(73,25,4,4,light);
    r(45,38,18,5,dark);r(47,38,13,2,light);r(57,30,28,1,'#a6c5c3');
    r(31,41,3,9,dark);r(28,48,8,3,'#1b3038');r(78,38,2,10,dark);r(76,47,6,3,'#1b3038');
    for(let x=33;x<59;x+=5)r(x,30,2,.7,'#c4d4d1');
  }
  for(let x=24;x<82;x+=5){r(x,38,1,.7,light);r(x,26,1,.6,dark);}
  if(level>=1)r(79,35,12,2,light);
  if(level>=2){r(32,37,13,4,dark);r(33,37,11,1,light);}
  if(level>=3){r(16,24,15,2,light);r(40,46,9,2,light);}
  if(level>=4){r(51,45,21,3,dark);r(54,44,14,2,light);r(68,44,5,2,'#c7d0c4');}
  if(level>=5){r(25,28,15,3,light);r(26,31,13,1,dark);}
  if(level>=6){r(43,21,11,3,body);r(45,20,7,1,light);}
  if(level>=7){r(76,24,5,3,'#add9db');r(74,25,2,3,dark);}
  if(level>=8){r(39,33,7,3,'#4c6966');r(61,36,9,2,'#4c6966');r(26,18,3,3,light);}
  if(level>=9){r(37,18,1,8,light);r(35,19,5,1,body);r(55,42,10,1,gold);}
  if(level>=10){r(20,16,7,2,gold);r(69,35,14,1,gold);r(42,31,3,4,gold);}
  for(let i=0;i<level;i++)r(7+i*4,59,3,2,gold);
  return canvas;
}
export function drawOverheadAircraft(c,level,p,id){
  const r=brush(c),transport=id==='transport';
  for(let n=0;n<8;n++){const w=transport?48-n*4:48-n*5;r(28-w/2,30-n*2,w,3,p.body);}
  r(23,12,10,43,p.dark);r(25,9,6,43,p.body);r(27,6,2,44,p.light);
  r(24,14,8,7,'#83b7c0');r(25,14,6,2,'#c8dfda');
  r(17,51,22,4,p.body);r(19,51,18,1,p.light);r(27,49,2,13,p.dark);
  if(transport){for(const x of [9,17,36,44]){r(x,24,4,14,p.dark);r(x+1,24,2,11,p.light);r(x-3,23,10,1,p.light);}r(24,37,8,10,p.light);r(26,38,4,8,p.body);}
  else{r(20,46,5,9,p.dark);r(31,46,5,9,p.dark);for(const x of [14,39]){r(x,31,3,16,p.light);r(x+1,29,1,3,p.dark);}}
  for(let n=0;n<Math.min(10,level);n++)r(n%2?30:24,25+Math.floor(n/2)*4,2,2,n>=8?'#e4cc85':p.light);
}
