// Original high-density pixel geometry. The reference informs colors/materials only.
const icons = new Map();
export function personalIcon(kind, level = 1) {
  const key = `${kind}:${level}`;
  if (icons.has(key)) return icons.get(key);
  const pixels = [], rect = (x,y,w,h,c) => pixels.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`);
  const gold = ['#584021','#96713c','#caa359','#edd18b','#fff0b7'];
  const band = (x,y,w,h) => {
    rect(x,y,w,h,gold[0]);rect(x+1,y,w-2,h-1,gold[1]);
    rect(x+2,y+1,w-5,h-3,gold[2]);rect(x+2,y+1,w-5,2,gold[4]);
    rect(x+3,y+h-3,w-6,1,gold[3]);
    for(let i=3;i<w-5;i+=5){rect(x+i,y+4,2,Math.max(1,h-8),gold[0]);rect(x+i+1,y+4,1,Math.max(1,h-9),gold[3]);}
  };
  const jewel = (x,y) => {
    rect(x+3,y,6,2,gold[2]);rect(x+1,y+2,10,8,gold[3]);rect(x+3,y+10,6,2,gold[1]);
    rect(x+3,y+3,6,6,'#356962');rect(x+4,y+3,2,2,'#b8e6cd');rect(x+6,y+6,3,3,'#163f3d');
  };
  const flourish=(x,y)=>{
    rect(x+4,y,5,2,gold[4]);rect(x+2,y+2,3,4,gold[2]);rect(x+9,y+2,3,4,gold[2]);
    rect(x,y+6,4,3,gold[1]);rect(x+11,y+6,4,3,gold[1]);
    rect(x+4,y+7,7,2,gold[3]);rect(x+6,y+3,3,11,gold[2]);rect(x+5,y+12,5,2,gold[4]);
  };
  // Dark plinth anchors both ceremonial objects without a copied photograph.
  rect(42,239,108,5,'#10221b');rect(50,235,92,5,'#273c30');rect(57,234,77,2,'#647057');
  if(kind==='sword') {
    // Lacquered scabbard, inset reflections and chased gold mounts.
    rect(77,88,29,141,'#0e141b');rect(79,88,23,142,'#252735');
    rect(80,90,3,132,'#55515b');rect(84,92,2,129,'#393440');rect(99,91,5,136,'#121921');
    rect(85,96,12,120,'#20202d');rect(79,222,22,8,gold[1]);
    band(75,86,31,22);band(76,145,29,17);band(76,207,29,23);
    flourish(83,91);flourish(83,146);flourish(82,211);
    for(let y=112;y<139;y+=9){rect(81,y,2,5,'#767064');rect(82,y,1,2,'#a2987b');}
    // Wrapped black grip with gold pommel and asymmetric guard.
    rect(78,28,28,49,'#101923');rect(80,30,22,45,'#2e2930');rect(81,32,3,39,'#5b4940');
    for(let y=34;y<70;y+=5){rect(83,y,18,2,'#45372f');rect(86,y,12,1,'#77604a');}
    band(76,24,31,12);band(76,68,31,11);
    rect(64,77,52,7,gold[0]);rect(60,75,59,5,gold[2]);rect(64,73,51,3,gold[4]);
    rect(62,80,8,7,gold[1]);rect(109,79,9,7,gold[1]);jewel(86,75);
    rect(82,14,20,12,gold[1]);rect(85,10,13,5,gold[2]);rect(87,8,9,3,gold[4]);flourish(85,13);
    // Crimson cord and fine separate strands, deliberately no insignia/logo.
    rect(106,26,2,49,'#af2e2a');rect(110,30,2,45,'#eb7154');
    rect(106,26,7,2,gold[3]);rect(105,73,11,7,gold[1]);rect(106,74,9,3,gold[4]);
    rect(103,80,15,9,'#a12426');rect(102,87,18,7,'#ba3031');
    for(let i=0;i<9;i++){
      const x=102+i*2, h=80-(i%3)*5;
      rect(x,93,2,h,['#731c25','#c33232','#eb5b43'][i%3]);
      rect(x,93,1,23,'#e95a43');rect(x,93+h,1,5+(i%4),'#922128');
    }
    // Short gold knot on the other side of the guard.
    rect(69,89,2,52,gold[1]);rect(72,93,2,43,gold[3]);
    for(let i=0;i<5;i++)rect(66+i*2,137,1,23-i%2*4,gold[(i%3)+1]);
    rect(66,133,11,6,gold[2]);rect(67,134,8,2,gold[4]);
    if(level>=2){band(77,178,29,11);jewel(84,177);}
    if(level>=3){flourish(83,116);rect(76,109,2,95,gold[2]);}
    if(level>=4){band(74,17,35,10);jewel(85,16);rect(104,109,2,95,gold[3]);}
  } else {
    // Ebony baton: fluted highlights, engraved caps, level-two gold collars.
    rect(79,48,36,170,'#10191a');rect(81,48,30,170,'#1c2c2a');
    rect(83,50,5,166,'#577065');rect(88,50,3,165,'#354c43');rect(106,50,4,166,'#101e1d');
    for(let y=63;y<201;y+=5){rect(92,y,11,1,'#31483c');rect(85,y,2,1,'#779180');}
    band(74,40,45,24);band(75,196,43,27);
    band(78,105,37,13);jewel(91,125);
    rect(80,28,33,13,gold[1]);rect(85,20,22,10,gold[2]);rect(89,16,14,5,gold[4]);
    flourish(87,32);flourish(100,42);flourish(79,43);
    flourish(80,202);flourish(98,202);
    if(level>=2){band(77,151,39,12);band(77,177,39,10);jewel(91,76);
      rect(71,45,3,16,gold[3]);rect(119,45,3,16,gold[2]);}
    // Successive command ranks add engraved leaves, mounts and a crest.
    if(level>=3){flourish(88,167);rect(76,66,2,82,gold[2]);}
    if(level>=4){flourish(88,91);rect(115,66,2,82,gold[3]);}
    if(level>=5){band(77,118,39,6);band(77,140,39,6);jewel(91,52);}
    if(level>=6){band(78,26,37,12);jewel(91,26);rect(73,198,2,22,gold[4]);rect(119,198,2,22,gold[2]);}
    rect(79,224,33,3,gold[0]);rect(84,227,23,2,gold[2]);
  }
  const name=kind==='sword'?'장군검':'지휘봉';
  const svg=`<svg class="command-baton-art ${kind==='sword'?'general-sword-art':''}" viewBox="0 0 192 256" role="img" aria-label="${name} 정밀 픽셀 그림" shape-rendering="crispEdges">${pixels.join('')}</svg>`;
  icons.set(key,svg);return svg;
}
