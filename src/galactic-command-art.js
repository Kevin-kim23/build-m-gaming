// Original pixel architecture: a terrestrial command citadel with orbital relays.
// art.js owns the sprite cache; no per-frame drawing or external image is needed.
export function drawGalacticCommand(c, width, height) {
  const cx=width/2, ground=height-13;
  const p={edge:'#202338',shadow:'#343750',body:'#686b87',light:'#a4b2cc',
    metal:'#c9d9e8',shine:'#effbff',glass:'#398d9f',glow:'#9ceff1',violet:'#a395d7'};
  const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const block=(x,y,w,h)=>{
    r(x+3,y+4,w,h,'#15273855');
    r(x,y,w,h,p.edge);r(x+2,y+2,w-4,h-4,p.body);
    r(x+2,y+2,w-6,2,p.light);r(x+w-5,y+3,3,h-6,p.shadow);
    r(x-2,y-4,w+4,4,p.edge);r(x-1,y-4,w+2,1,p.metal);
    for(let yy=y+7;yy<y+h-7;yy+=10){
      r(x+3,yy+6,w-8,1,p.shadow);
      for(let xx=x+6;xx<x+w-7;xx+=9){
        r(xx-1,yy-1,7,6,p.edge);r(xx,yy,5,4,p.glass);
        r(xx,yy,5,1,p.glow);r(xx,yy+1,1,2,p.light);
      }
    }
    r(x+2,y+h-5,w-4,2,p.shadow);r(x+3,y+h-5,w-7,.7,p.violet);
  };
  const spire=(x,y)=>{
    r(x-2,y+10,5,13,p.edge);r(x-1,y+11,2,12,p.light);
    r(x-5,y+8,11,3,p.metal);r(x-4,y+8,9,1,p.shine);
    r(x,y,1,10,p.light);r(x-1,y,3,2,p.glow);
  };
  // The broad podium and stepped wings keep the army's largest building legible.
  r(3,ground-5,width-6,15,'#25374a50');
  r(5,ground-10,width-12,17,p.shadow);r(7,ground-10,width-16,2,p.metal);
  r(7,ground+4,width-16,2,p.edge);
  for(let x=11;x<width-12;x+=11){r(x,ground-5,1,8,p.body);r(x,ground-5,2,1,p.light);}
  block(12,ground-48,width-27,37);
  block(24,ground-64,width-51,23);
  for(const x of [17,width-51]){
    block(x,ground-97,31,82);block(x+5,ground-107,21,16);
    r(x+9,ground-114,13,5,p.metal);r(x+10,ground-114,10,1,p.shine);
    spire(x+15,ground-138);
    // Side-mounted relay dishes and illuminated equipment bays.
    r(x+7,ground-92,17,3,p.violet);r(x+8,ground-92,14,1,p.shine);
    r(x+6,ground-32,19,12,p.edge);r(x+8,ground-30,15,3,p.glow);
    for(let n=0;n<3;n++)r(x+9+n*5,ground-25,2,3,p.body);
  }
  for(const side of [-1,1]){
    const x=cx+side*50-10;
    block(x,ground-111,20,76);r(x+3,ground-116,14,5,p.metal);
    r(x+5,ground-120,10,4,p.violet);r(x+7,ground-123,6,3,p.glow);
  }
  // Orbital command halo behind the central tower, made of stepped metal pixels.
  for(let n=0;n<72;n++){
    const a=n*Math.PI*2/72,x=Math.round(cx+37*Math.cos(a)),y=Math.round(43+22*Math.sin(a));
    r(x-2,y-1,4,3,n<36?p.shadow:p.metal);
    if(n%6===0)r(x-1,y-2,2,2,p.glow);
  }
  block(cx-36,51,72,ground-68);block(cx-25,37,50,24);
  r(cx-22,33,44,4,p.metal);r(cx-20,33,40,1,p.shine);
  r(cx-18,29,36,4,p.shadow);r(cx-15,26,30,3,p.violet);
  r(cx-10,22,20,4,p.metal);r(cx-7,18,14,4,p.shine);
  r(cx-3,5,6,13,p.edge);r(cx-2,5,3,14,p.metal);
  r(cx-1,1,2,5,p.glow);r(cx-5,10,10,2,p.violet);
  // Deep blue observation bridge with continuous glass and silver mullions.
  r(cx-42,70,84,12,p.edge);r(cx-41,69,82,2,p.metal);
  r(cx-39,73,78,5,p.glass);
  for(let x=cx-37;x<cx+38;x+=8){r(x,73,5,1,p.glow);r(x+5,73,1,5,p.light);}
  r(cx-40,81,80,2,p.violet);
  // Four lights identify the new four-star command; avoid real-world insignia.
  r(cx-18,89,36,12,p.edge);r(cx-17,89,34,1,p.metal);
  for(const x of [cx-12,cx-4,cx+4,cx+12]){
    r(x-1,93,3,5,p.shine);r(x-2,94,5,2,p.glow);
  }
  // Central operations gate, flanking columns and a ceremonial stair.
  r(cx-27,ground-42,54,32,p.edge);r(cx-28,ground-45,56,3,p.metal);
  r(cx-24,ground-39,48,24,p.glass);r(cx-23,ground-39,46,2,p.glow);
  for(let x=cx-19;x<cx+23;x+=10){r(x,ground-39,2,25,p.light);r(x+1,ground-37,1,22,p.edge);}
  r(cx-6,ground-35,12,23,p.edge);r(cx-4,ground-34,8,22,'#57799a');
  r(cx,ground-34,1,22,p.metal);
  for(const x of [cx-32,cx+29]){r(x,ground-40,3,30,p.light);r(x,ground-40,1,28,p.shine);}
  for(let n=0;n<4;n++){
    r(cx-25-n*4,ground-10+n*3,50+n*8,3,p.body);
    r(cx-25-n*4,ground-10+n*3,50+n*8,1,p.metal);
  }
  for(const x of [12,width-19]){r(x,ground-12,6,8,p.edge);r(x+1,ground-12,4,2,p.glow);}
  return true;
}

// Battle version preserves the friendly/enemy palette and adds orbital relays.
export function overheadGalacticDetails(r, w, h, p) {
  const cx=w/2,cy=h/2;
  for(const x of [8,w-29])for(const y of [11,h-29]){
    r(x,y,20,17,p.dark);r(x+2,y+2,16,12,p.light);
    r(x+4,y+4,12,7,p.body);r(x+8,y+5,4,5,p.mark);
    r(x+9,y+1,2,13,p.flag);r(x+4,y+7,12,2,p.flag);
  }
  r(cx-24,cy-18,48,34,p.dark);r(cx-22,cy-16,44,30,p.light);
  r(cx-19,cy-13,38,24,p.body);r(cx-16,cy-10,32,18,p.dark);
  for(const x of [cx-12,cx-4,cx+4,cx+12]){
    r(x-1,cy-4,3,7,p.mark);r(x-3,cy-2,7,3,p.mark);
  }
  for(const x of [cx-27,cx+25]){r(x,cy-12,2,23,p.mark);r(x,cy-12,2,4,p.flag);}
}
