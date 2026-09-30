// Three source pixels per original grid cell: retain silhouettes, add real subpixel detail.
export const ART_SCALE = 3;
export function artSurface(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width * ART_SCALE; canvas.height = height * ART_SCALE;
  canvas.getContext('2d').setTransform(ART_SCALE,0,0,ART_SCALE,0,0);
  return canvas;
}
export const brush = c => (x,y,w,h,color) => {c.fillStyle=color;c.fillRect(x,y,w,h);};
export function uniformDetails(c,id) {
  const r=brush(c), nco=id!=='soldier', offset=nco?1:0;
  // Helmet/beret seam, visor, eyes, webbing, pouch buckles and boot highlights.
  r(4,3,7,.35,'#c5caae');r(5,7.5,1,.5,'#483d34');r(9,7.5,1,.5,'#483d34');
  r(6.5,9,2,.35,'#9b7357');
  r(4+offset,11,1,7,'#23392f');r(5+offset,11,.35,7,'#afba85');
  r(11+offset,11,.7,6,'#182e28');
  for(const x of [6,10]){r(x,14+offset,2.3,2.8,'#233f34');r(x,14+offset,2.3,.5,'#829579');r(x+.9,15+offset,.5,.5,'#d3c695');}
  r(7.7+offset,11,.4,6,'#94a88a');
  for(let y=12;y<17;y+=1.5)r(8+offset,y,.35,.35,'#e0cd94');
  r(3+offset,21+offset,3,.5,'#697b65');r(10+offset,21+offset,3,.5,'#697b65');
}
export function vehicleDetails(c,id,level) {
  const r=brush(c), light='#c0c9a8', dark='#263f37';
  if(id==='artillery') {
    for(const x of [42,71]){r(x,44,.6,9,light);r(x+2,47,7,.5,'#a5b696');r(x+4,44,.5,9,'#8f9f87');}
    for(const x of [49,53,59,64])r(x,24,.65,.65,'#d5d6b0');
    r(49,38,14,.5,light);r(66,28,20,.35,'#e0d7b5');r(52,30,3,4,dark);
  } else if(id==='helicopter') {
    r(20,30,7,.5,'#e2eee0');r(32,28,7,.5,'#d9e9d4');r(28.5,29,.5,7,dark);
    for(let x=32;x<54;x+=3)r(x,19,1,2,'#223a37');
    for(let x=23;x<51;x+=4)r(x,41,.6,.6,light);
    r(71,27,18,.5,light);r(13,53,55,.4,'#a4b29c');
    if(level>=2)for(let x=51;x<64;x+=3)r(x,42,1,2,'#0e2626');
  } else {
    const spg=id==='selfPropelled',top=spg?11:20;
    for(let x=18;x<89;x+=13){r(x,42,8,.5,light);r(x+3,44,1,6,dark);r(x+1,50,6,.5,'#9baf93');}
    for(let x=17;x<83;x+=9){r(x,32,.7,.7,light);r(x,38,4,.5,dark);}
    r(29,top+3,18,.5,light);r(32,top+5,11,4,dark);r(33,top+5,9,1,'#8fa796');
    for(let x=65;x<83;x+=3)r(x,33,1,4,'#3a5047');
  }
}
export function overheadDetails(c,id,level,p) {
  const r=brush(c);
  if(id==='helicopter') {
    r(25,14,5,.5,'#d0e9d9');r(28,14,.4,8,p.dark);
    for(let y=33;y<42;y+=2){r(8,y,2,.6,p.light);r(45,y,2,.6,p.light);}
  } else {
    for(let y=26;y<52;y+=4){r(11,y,3,.5,p.light);r(42,y,3,.5,p.light);}
    r(21,39,13,.5,p.dark);r(27,8,.5,17,'#d0d6b4');
    for(let x=20;x<38;x+=4)r(x,26,.6,.6,p.light);
  }
  if(level>=5){r(22,43,11,1,p.dark);r(23,43,2,.5,p.light);}
}
