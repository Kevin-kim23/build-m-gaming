import { artSurface } from './pixel-detail.js';

// Original eight-wheel launch truck: twin pod banks, hydraulic cradle and armored cab.
export function rocketSprite(level) {
  const canvas = artSurface(110, 62), c = canvas.getContext('2d');
  const r = (x,y,w,h,color) => { c.fillStyle=color; c.fillRect(x,y,w,h); };
  const dark='#304443', body=level>=8?'#637d76':'#687d58', light='#aab99a';
  r(6,53,99,4,'#16251c55'); r(10,40,89,10,dark); r(12,39,85,3,light);
  for(const x of [17,37,70,88]) {
    r(x-6,44,13,12,'#19272c'); r(x-4,42,9,16,'#26383c');
    r(x-3,46,7,8,'#758382'); r(x-1,48,3,4,'#b1bbb0');
    r(x-5,43,11,2,'#394b4e'); r(x-5,54,11,2,'#394b4e');
  }
  r(69,23,24,21,dark); r(71,21,18,22,body); r(89,28,9,15,body);
  r(72,22,16,2,light); r(74,25,13,9,'#243e49'); r(75,26,11,2,'#a9cbd0');
  r(76,28,3,5,'#5c8894'); r(86,25,2,9,'#b2bca3');
  r(92,31,5,5,'#31505a'); r(71,35,17,1,dark); r(74,37,4,1,light);
  r(96,39,4,3,'#f5dda0'); r(10,42,4,3,'#d18b61'); r(98,44,4,3,'#37484c');
  r(39,32,22,7,dark); r(42,30,16,3,light); r(32,34,5,7,'#9baea4');
  // Elevated launch modules point right and remain distinct from a tank barrel.
  r(12,17,45,17,dark); r(15,14,42,17,body); r(15,14,42,2,light);
  r(17,17,34,2,'#879b78'); r(17,22,34,2,'#465f4e'); r(17,27,34,2,'#879b78');
  r(53,12,13,19,'#a6b39d'); r(54,13,11,17,dark);
  for(let row=0;row<3;row++)for(let col=0;col<2;col++) {
    r(55+col*5,14+row*5,4,4,'#c1c8af'); r(56+col*5,15+row*5,2,2,'#182b31');
  }
  for(let x=20;x<50;x+=9){r(x,16,2,15,dark);r(x+1,17,1,12,'#a0ad88');}
  if(level>=1){r(71,35,17,7,'#889880');r(73,36,13,1,'#c3cbb4');}
  if(level>=2){r(52,11,15,2,'#b8c6ab');r(52,30,15,2,'#7c937d');}
  if(level>=3){r(29,40,3,14,'#94a69c');r(25,53,12,2,dark);}
  if(level>=4){r(12,36,47,4,body);r(14,36,43,1,light);}
  if(level>=5){r(58,34,10,8,'#405b4f');r(59,34,8,2,light);}
  if(level>=6){r(72,18,10,4,dark);r(73,18,8,2,'#b3c6bc');}
  if(level>=7){r(84,13,2,8,dark);r(80,11,10,4,light);r(86,12,3,2,'#75b0bd');}
  if(level>=8){r(16,18,9,3,'#344f48');r(36,24,11,4,'#bcc6ae');r(80,36,7,3,'#405c55');}
  if(level>=9){r(69,3,1,23,'#c2d1c6');r(67,5,5,1,'#779e9c');}
  if(level>=10){r(15,14,37,2,'#d8c48a');r(78,35,3,7,'#e4ce8c');r(76,37,7,2,'#e4ce8c');}
  for(let i=0;i<level;i++)r(7+i*4,59,3,2,'#d6c68c');
  return canvas;
}

export function drawOverheadRocket(c, level, p) {
  const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  for(const y of [17,29,44,55]){r(7,y,7,8,'#26383c');r(42,y,7,8,'#26383c');r(8,y,2,7,'#637775');r(46,y,2,7,'#637775');}
  r(13,13,30,49,p.dark);r(15,15,26,45,p.body);r(15,15,2,44,p.light);
  r(14,9,28,15,p.body);r(16,10,24,2,p.light);r(17,14,22,6,'#2f5260');r(18,14,20,2,'#9abbc2');r(27,14,2,6,p.dark);
  r(16,29,24,29,p.dark);
  for(const x of [17,30]) {
    r(x,27,10,28,p.light);r(x+1,28,8,26,p.body);
    for(let n=0;n<3;n++){r(x+1+n*3,26,2,3,'#1b3037');r(x+1+n*3,31,1,21,p.light);}
    r(x,38,10,2,p.dark);r(x,49,10,2,p.dark);
  }
  if(level>=3){r(9,52,5,3,p.light);r(42,52,5,3,p.light);}
  if(level>=5){r(20,58,16,3,p.light);}
  if(level>=7){r(37,22,4,4,'#9ebcc2');}
  if(level>=9){r(11,2,1,24,p.light);}
}
