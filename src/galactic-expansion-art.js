// Original architecture, drawn once by the home sprite cache. Silver concrete,
// cyan glass and violet relays continue the existing galactic command materials.
export const GALACTIC_BUILDINGS=Object.freeze([
  'galacticCorps','galacticFieldArmy','galacticArmyGroup','galacticAlliedArmy','galacticGrandAlliedArmy',
]);
const P={edge:'#202338',shadow:'#343750',body:'#686b87',light:'#a4b2cc',
  metal:'#c9d9e8',shine:'#effbff',glass:'#398d9f',glow:'#9ceff1',violet:'#a395d7',gold:'#c6aa75'};

export function drawGalacticExpansion(c,id,width,height){
  const tier=GALACTIC_BUILDINGS.indexOf(id);
  if(tier<0)return false;
  // The composition is deliberately rebuilt for each tier, not an enlarged sprite.
  const sx=width/320,sy=height/248;
  const r=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x*sx,y*sy,w*sx,h*sy);};
  const block=(x,y,w,h,{glass=false,crown=false}={})=>{
    r(x+3,y+4,w,h,'#15273855');r(x,y,w,h,P.edge);
    r(x+2,y+2,w-4,h-4,P.body);r(x+2,y+2,w-7,2,P.light);
    r(x+w-5,y+3,3,h-5,P.shadow);r(x-1,y-3,w+2,3,P.edge);r(x,y-3,w,1,P.metal);
    for(let yy=y+7;yy<y+h-8;yy+=9){
      if(glass){r(x+3,yy,w-9,5,P.glass);r(x+3,yy,w-9,.8,P.glow);}
      for(let xx=x+5;xx<x+w-8;xx+=8){
        if(!glass){r(xx-1,yy-1,6,6,P.edge);r(xx,yy,4,4,P.glass);r(xx,yy,4,1,P.glow);}
        else {r(xx,yy,1,5,P.light);r(xx+1,yy+1,2,1,P.glow);}
      }
      r(x+2,yy+6,w-7,1,P.shadow);
    }
    r(x+3,y+h-6,w-8,1,P.violet);
    if(crown){r(x+4,y-7,w-8,4,P.metal);r(x+6,y-9,w-12,2,P.violet);r(x+w/2-2,y-17,4,8,P.light);r(x+w/2-1,y-20,2,4,P.glow);}
  };
  const bridge=(x,y,w)=>{
    r(x,y,w,12,P.edge);r(x,y-2,w,2,P.metal);r(x+2,y+3,w-4,5,P.glass);
    for(let xx=x+4;xx<x+w-3;xx+=8){r(xx,y+3,1,5,P.light);r(xx+1,y+3,4,1,P.glow);}
    r(x+1,y+10,w-2,2,P.violet);
  };
  const relay=(x,y)=>{
    r(x-4,y+15,9,8,P.shadow);r(x-2,y,4,17,P.metal);
    r(x-9,y+5,18,3,P.shadow);r(x-8,y+5,16,1,P.shine);r(x-4,y+8,8,3,P.violet);
    r(x-1,y-2,2,5,P.glow);r(x-2,y+11,4,2,P.shine);
  };
  const halo=(cx,cy,rx,ry,inner=false)=>{
    for(let n=0;n<96;n++){
      const a=n*Math.PI/48,x=cx+rx*Math.cos(a),y=cy+ry*Math.sin(a);
      r(x-1.5,y-1.1,3,2.2,n<48?P.shadow:P.metal);
      if(n%8===0)r(x-1,y-1.8,2,2,P.glow);
      if(inner&&n%2===0)r(cx+(rx-6)*Math.cos(a)-.5,cy+(ry-4)*Math.sin(a)-.5,1,1,P.violet);
    }
  };
  // Tier silhouettes: twin bridge keep / four spires / broad terraced citadel /
  // five-tower crown / monumental central mast with two orbital coronas.
  r(3,224,314,18,'#25374a55');r(5,222,310,16,P.shadow);r(7,222,306,2,P.metal);
  for(let x=11;x<310;x+=10){r(x,227,1,8,P.body);r(x,227,2,1,P.light);}
  block(14,183,292,37);block(28,165,264,20);
  if(tier>=2){block(20,139,280,25);block(43,123,234,17);}
  for(const side of [-1,1]){
    const near=side<0?61:229,far=side<0?24:272;
    const nearTop=88-tier*8;
    block(near,nearTop,30,213-nearTop,{glass:true,crown:true});
    block(far,120-tier*8,24,94+8*tier,{crown:true});
    relay(far+12,88-tier*8);
    bridge(side<0?86:194,127-tier*7,40);
    if(tier>=1){
      const x=side<0?100:198,top=70-tier*6;
      block(x,top,22,153-top,{glass:true,crown:true});
    }
    if(tier>=3){
      const x=side<0?7:298;
      block(x,156,14,56,{glass:true});relay(x+7,126);
      bridge(side<0?31:253,171,36);
    }
  }
  if(tier===0){halo(160,85,54,25);bridge(92,106,136);}
  if(tier===1){halo(160,70,63,25,true);bridge(86,92,148);}
  if(tier===2){halo(160,60,69,27,true);halo(160,108,85,19);}
  if(tier===3){halo(160,55,73,26,true);bridge(55,118,210);}
  if(tier===4){halo(160,49,88,27,true);halo(160,90,108,22,true);bridge(52,112,216);}
  const top=55-tier*8,coreW=64+tier*6;
  block(160-coreW/2,top,coreW,199-top,{glass:true});
  block(160-coreW/2+7,top-11,coreW-14,13,{glass:true});
  r(160-coreW/2+11,top-15,coreW-22,4,P.metal);r(160-coreW/2+14,top-15,coreW-28,1,P.shine);
  r(149,top-20,22,5,P.violet);r(153,top-23,14,3,P.metal);
  if(tier===4){r(158,1,4,10,P.metal);r(159,1,2,4,P.glow);}
  else {r(159,top-29,2,8,P.light);r(157,top-27,6,2,P.glow);}
  // The observation deck uses a different span on every tier.
  bridge(111-tier*2,151-tier*5,98+tier*4);
  r(142-tier*3,174,36+tier*6,12,P.edge);r(143-tier*3,174,34+tier*6,1,P.metal);
  for(let n=0;n<=tier;n++){
    const x=160-tier*6+n*12;r(x-1,178,2,6,P.shine);r(x-3,180,6,2,P.glow);
  }
  // Deep entrance, silver pylons and broad steps keep the huge footprint grounded.
  r(112,192,96,29,P.edge);r(108,190,104,3,P.metal);r(115,196,90,22,P.glass);
  for(let x=121;x<203;x+=10){r(x,196,2,23,P.light);r(x+2,197,6,1,P.glow);}
  r(151,199,18,22,P.shadow);r(153,201,14,20,P.glass);r(159,201,2,20,P.metal);
  for(const x of [108,209]){r(x,194,3,28,P.light);r(x,194,1,25,P.shine);}
  for(let n=0;n<6;n++){r(113-n*5,219+n*3,94+n*10,3,P.body);r(113-n*5,219+n*3,94+n*10,.8,P.metal);}
  for(const x of [12,300]){r(x,213,7,8,P.edge);r(x+1,213,5,2,P.glow);}
  return true;
}
