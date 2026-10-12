import {artSurface,brush} from './pixel-detail.js';

// Original fictional game vehicles. Shapes describe appearance, not real-world specifications.
export function strategicSprite(level,id) {
  const canvas=artSurface(110,62),r=brush(canvas.getContext('2d'));
  const dark='#283f46',body=level>=8?'#678b87':'#55716e',light='#b1c8bd',glow='#9be9e1',gold='#e6c981';
  r(5,54,99,3,'#18312b55');
  if(id==='railgunTank'){
    r(7,38,87,17,'#172a32');r(10,36,82,21,'#30454b');r(12,37,78,2,'#74868a');
    for(let x=13;x<91;x+=10){r(x,41,8,12,'#6c817c');r(x+1,42,6,10,'#34534f');r(x+3,45,2,4,light);r(x,54,8,2,'#85928a');}
    r(7,32,88,9,dark);r(12,29,78,11,body);r(17,29,68,2,light);
    for(let x=16;x<86;x+=12){r(x,32,10,6,'#3b5b60');r(x+1,32,8,1,'#9fbbb3');r(x+2,36,5,1,'#547774');}
    r(29,18,37,13,dark);r(34,14,27,17,body);r(36,14,22,2,light);r(27,21,44,8,'#48666c');
    r(62,17,43,4,'#2d4756');r(62,25,43,4,'#2d4756');r(63,17,38,1,light);r(63,26,39,1,light);
    r(66,21,38,3,'#205767');r(68,21,31,1,glow);r(101,16,5,14,body);r(103,19,2,8,glow);
    for(let x=65;x<100;x+=6){r(x,16,2,5,body);r(x,25,2,5,body);r(x,17,1,3,light);}
    r(40,20,14,7,dark);r(42,21,9,4,'#5dbaa9');r(44,21,5,1,'#d9fae8');
    for(let x=18;x<30;x+=3){r(x,25,2,4,'#223f47');r(x,25,2,1,'#91ada9');}
    r(85,34,7,3,'#f8db92');r(9,35,4,2,'#c57350');
    if(level>=1){r(72,16,19,2,light);r(72,27,19,2,light);}
    if(level>=2){r(53,20,6,5,glow);r(54,20,3,2,'#e4fff0');}
    if(level>=3)r(9,39,84,2,'#8eb1a2');
    if(level>=4){r(18,33,57,5,'#769994');r(18,33,57,1,light);}
    if(level>=5){r(32,16,3,13,light);r(61,18,3,10,light);}
    if(level>=6){r(18,25,11,4,glow);r(20,26,7,2,'#338684');}
    if(level>=7){r(41,8,12,6,dark);r(43,8,8,2,light);r(49,10,3,2,glow);}
    if(level>=8){r(72,30,10,4,light);r(34,17,4,8,'#c4d5bd');}
    if(level>=9){r(25,4,1,25,light);r(23,6,5,1,glow);}
    if(level>=10){r(34,14,26,2,gold);r(50,18,3,10,gold);r(47,21,9,2,gold);}
  }else{
    // Slender missile silhouette references public Minuteman imagery.
    // Its wheeled launcher is an invented display model, not the actual system.
    r(5,40,98,9,dark);r(8,39,91,2,light);
    for(const x of [13,28,43,69,84,98]){r(x-5,45,10,12,'#192d35');r(x-3,43,6,16,'#263e44');r(x-3,47,6,8,'#657d7d');r(x-1,49,2,4,light);}
    r(74,27,20,15,dark);r(76,25,16,15,body);r(91,30,11,12,body);r(77,26,14,2,light);
    r(80,28,11,8,'#223f52');r(80,28,10,2,'#adcbd0');r(83,30,4,4,'#608e9e');r(98,35,5,3,'#e7d69f');
    r(13,34,50,6,'#314d4a');r(16,32,43,3,light);r(22,25,4,10,dark);r(56,24,4,11,dark);
    r(9,15,73,12,'#5b7478');r(12,13,69,12,'#bed0c9');r(14,13,64,2,'#eff0d7');r(13,23,67,2,'#829b99');
    r(8,16,5,8,'#394d54');r(6,18,3,4,'#25363e');
    r(80,15,8,8,'#6c8388');r(88,17,7,5,'#354e5a');r(95,18,7,3,'#273f4b');
    for(const x of [25,46,67]){r(x,14,2,10,'#536f74');r(x+2,14,1,10,'#e1e8ce');}
    r(30,15,9,2,'#d7debe');r(54,18,5,3,'#568177');
    for(let x=16;x<67;x+=8){r(x,28,4,2,'#364d47');r(x,29,2,1,light);r(x+1,35,3,.7,'#ccbc83');}
    if(level>=1)r(14,13,59,1,'#fcf5d4');
    if(level>=2){r(18,30,4,9,body);r(62,29,4,10,body);}
    if(level>=3){r(7,39,62,3,body);r(8,39,61,1,light);}
    if(level>=4){r(47,40,3,14,light);r(44,54,9,2,dark);}
    if(level>=5)r(82,16,5,6,'#aac6c5');
    if(level>=6){r(78,21,11,4,dark);r(79,21,8,2,glow);}
    if(level>=7){r(50,34,15,5,'#49666b');r(52,34,11,1,light);}
    if(level>=8){r(77,38,9,3,'#37534b');r(15,36,11,3,'#9bb79e');}
    if(level>=9){r(72,5,1,29,light);r(70,7,5,1,glow);}
    if(level>=10){r(14,14,62,1,gold);r(79,37,10,1,gold);r(87,30,2,7,gold);}
  }
  for(let x=15;x<90;x+=9){r(x,40,.7,1.4,light);r(x+2,40,.5,1,dark);}
  for(let i=0;i<level;i++){r(11+i*7,38,4,.7,i>=7?gold:light);r(7+i*4,59,3,2,gold);}
  return canvas;
}

export function drawOverheadStrategic(c,level,p,id) {
  const r=brush(c),glow=p.flag;
  if(id==='railgunTank'){
    r(6,23,9,38,p.dark);r(41,23,9,38,p.dark);
    for(let y=24;y<60;y+=4){r(7,y,7,1,p.light);r(42,y,7,1,p.light);}
    r(14,23,28,36,p.dark);r(16,25,24,31,p.body);r(17,25,2,29,p.light);
    r(19,27,18,19,p.dark);r(21,27,14,16,p.body);r(22,28,11,2,p.light);
    r(22,3,4,28,p.dark);r(30,3,4,28,p.dark);r(23,3,1,26,p.light);r(31,3,1,26,p.light);
    r(27,5,2,24,glow);r(21,2,14,4,p.body);r(25,34,7,5,glow);
    for(let y=8;y<27;y+=6){r(21,y,5,2,p.body);r(30,y,5,2,p.body);}
    for(let y=48;y<55;y+=2)r(21,y,15,.7,p.dark);
  }else{
    // A broad pointed warhead, exposed stage bands, swept tail fins and a
    // recessed rocket nozzle read as a missile even at a small battle scale.
    // The narrower transport chassis stays behind the missile silhouette.
    for(let y=26;y<59;y+=10){r(7,y,6,7,p.dark);r(43,y,6,7,p.dark);r(8,y+1,1,5,p.light);r(47,y+1,1,5,p.light);}
    r(13,24,30,36,p.dark);r(15,26,26,31,p.body);r(16,27,1,27,p.light);
    for(const x of [15,36]){r(x,31,5,16,p.dark);r(x+1,32,3,5,p.body);r(x+1,32,3,1,p.light);}
    r(26,1,4,3,p.dark);r(24,4,8,3,p.dark);r(22,7,12,4,p.dark);r(20,11,16,41,p.dark);
    r(27,2,2,3,p.mark);r(25,5,6,3,p.light);r(23,8,10,4,p.light);
    r(22,12,12,39,p.light);r(23,12,4,39,p.mark);r(32,12,2,39,p.body);
    r(22,14,12,4,'#ac654a');r(23,14,4,4,'#e6b48b');
    for(const y of [25,39]){r(21,y,14,2,p.dark);r(22,y,12,.8,p.light);r(23,y+1,4,.5,p.mark);}
    // Separate left/right fins widen only at the tail, unlike a pill or vehicle hood.
    for(let n=0;n<4;n++){
      r(20-n*2,44+n*3,3+n*2,3,p.dark);r(33,44+n*3,3+n*2,3,p.dark);
      r(21-n*2,44+n*3,2+n*2,1,p.light);r(33,44+n*3,2+n*2,1,p.light);
    }
    r(22,50,12,8,p.dark);r(24,50,8,7,p.body);r(25,51,3,5,p.light);
    r(23,57,10,4,p.dark);r(24,57,8,1,p.light);r(25,59,6,3,'#7a544b');
    r(26,59,4,2,'#dc9563');r(27,59,2,1,'#ffe0a0');
    for(const x of [17,37]){r(x,56,2,5,p.light);r(x,56,2,1,p.mark);}
  }
  for(let i=0;i<Math.min(level,10);i++){const x=i%2?37:16,y=26+Math.floor(i/2)*6;r(x,y,3,2,level>=8?'#e7cd89':p.light);r(x,y,1,1,p.mark);}
  if(level>=7){r(43,5,1,16,p.light);r(41,6,5,2,glow);}
}
