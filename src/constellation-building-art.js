import { CONSTELLATION_FORMATIONS } from './constellation-formations.js';

// Original cached pixel fortresses: black armor, silver ribs, ruby energy cores.
export function drawConstellationBuilding(c,id,width,height) {
  const tier=CONSTELLATION_FORMATIONS.findIndex(f=>f.id===id);
  if(tier<0)return false;
  const p={edge:'#090d15',shadow:'#171e2b',body:'#343e50',light:'#778399',metal:'#c5ceda',glass:'#481629',glow:'#ff647c',ruby:'#a72443'};
  const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x*width/340,y*height/258,w*width/340,h*height/258);};
  const block=(x,y,w,h,crown=false)=>{
    r(x+4,y+5,w,h,'#11182755');r(x,y,w,h,p.edge);r(x+2,y+2,w-4,h-4,p.body);
    r(x+2,y+2,w-5,3,p.light);r(x+w-7,y+4,5,h-6,p.shadow);
    for(let yy=y+11;yy<y+h-9;yy+=13){
      r(x+4,yy,w-10,1,p.shadow);
      for(let xx=x+8;xx<x+w-7;xx+=12){r(xx-1,yy-1,5,6,p.edge);r(xx,yy,3,4,p.glass);r(xx,yy,3,1,p.glow);}
    }
    for(const xx of [x+3,x+w-10]){r(xx,y+5,5,h-9,p.shadow);r(xx,y+5,2,h-10,p.metal);}
    r(x-2,y-6,w+4,6,p.edge);r(x,y-6,w,2,p.metal);r(x+2,y-3,w-4,2,p.light);
    if(crown)for(let xx=x+2;xx<x+w-4;xx+=10){r(xx,y-13,6,8,p.edge);r(xx+1,y-13,4,2,p.metal);r(xx+1,y-10,4,3,p.body);}
  };
  const banner=(x,y,h)=>{r(x-1,y-2,11,2,p.metal);r(x,y,9,h,p.ruby);r(x+1,y,2,h-2,'#de4862');r(x+4,y+5,1,h-12,p.metal);};
  const reactor=(x,y,w,h)=>{
    r(x-3,y-3,w+6,h+6,p.edge);r(x-2,y-2,w+4,2,p.metal);r(x,y,w,h,p.ruby);
    r(x+2,y+2,w-4,h-4,'#de3653');r(x+4,y+3,w-8,3,'#ff9aa7');r(x+w/2-1,y+5,2,h-8,p.glow);
    for(let yy=y+9;yy<y+h-3;yy+=7)r(x,yy,w,2,p.shadow);
  };
  const wing=(x,y,w,h)=>{block(x,y,w,h,true);banner(x+w/2-4,y+10,Math.min(31,h-16));};
  // Broad foundations and terraced retaining walls anchor every fortress.
  r(5,242,330,12,'#11182766');block(10,217,320,26);block(20,193,300,26);
  if(tier===0){ // Regiment: single gatehouse flanked by two broad bastions.
    wing(27,124,72,69);wing(241,124,72,69);block(98,94,144,100,true);block(121,70,98,27,true);reactor(154,108,32,36);
  }else if(tier===1){ // Division: linked twin keeps and lower command hall.
    wing(31,73,89,121);wing(220,73,89,121);block(112,133,116,62,true);block(121,103,98,27,true);reactor(155,145,30,32);
  }else if(tier===2){ // Corps: four corner bastions around a raised central citadel.
    wing(35,101,59,92);wing(246,101,59,92);block(88,99,164,95,true);wing(57,53,58,84);wing(225,53,58,84);block(121,57,98,137,true);reactor(153,75,34,52);
  }else if(tier===3){ // Field army: wide command wings and a commanding central keep.
    wing(21,135,70,58);wing(249,135,70,58);wing(67,93,68,101);wing(205,93,68,101);block(115,51,110,143,true);block(130,32,80,22,true);reactor(153,66,34,57);
  }else { // Army group: nested defensive rings, four keeps and a monumental throne fortress.
    block(26,158,288,37,true);wing(24,95,54,100);wing(262,95,54,100);block(71,113,198,81,true);
    wing(77,65,49,111);wing(214,65,49,111);block(121,38,98,156,true);block(133,23,74,19,true);reactor(151,57,38,67);
    for(const x of [145,190]){r(x,11,5,14,p.metal);r(x+1,8,3,5,p.glow);}
  }
  // A thick outer wall, machicolations, gun slits and ruby guard lights.
  for(const x of [17,284])wing(x,174,39,45);
  for(let x=61;x<282;x+=14){r(x,194,8,11,p.edge);r(x+1,194,6,2,p.metal);r(x+2,199,4,3,p.light);}
  for(const x of [64,106,224,266]){r(x,207,10,4,p.edge);r(x+2,208,6,1,p.glow);}
  block(138,181,64,54,true);r(152,205,36,30,p.edge);r(155,207,30,28,p.glass);r(169,207,2,28,p.metal);
  for(let i=0;i<5;i++){r(143-i*4,235+i*3,54+i*8,2,p.light);r(143-i*4,237+i*3,54+i*8,1,p.shadow);}
  for(let i=0;i<=tier;i++){r(168-tier*5+i*10,190,5,5,p.ruby);r(169-tier*5+i*10,190,3,2,p.glow);}
  for(const x of [128,207]){r(x,207,4,29,p.metal);r(x-1,208,6,5,p.glow);}
  return true;
}
