import { drawGalacticCommand } from './galactic-command-art.js';
import { drawGalacticGroup } from './galactic-group-art.js';

// Original high-command architecture, rendered once into art.js's cached sprite.
export function drawHighCommand(c, id, width, height) {
  if (id === 'galacticGroupCommand') return drawGalacticGroup(c, width, height);
  if (id === 'galacticCommand') return drawGalacticCommand(c, width, height);
  const tier = ['alliedArmy','grandAlliedArmy','supremeCommand'].indexOf(id);
  if (tier < 0) return false;
  const cx=width/2, ground=height-12, top=24-tier*3;
  const metal=tier===2?'#c6d8e1':'#d5ba78', shine=tier===2?'#f1fcff':'#ffedb8';
  const rect=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
  const facade=(x,y,w,h)=>{
    rect(x+3,y+4,w,h,'#1b303950');
    rect(x,y,w,h,'#263f4e');rect(x+2,y+2,w-4,h-4,'#69818a');
    rect(x+2,y+2,w-6,3,'#a4b7b7');rect(x+w-4,y+3,3,h-3,'#354d5b');
    for(let yy=y+7;yy<y+h-5;yy+=9){
      rect(x+3,yy+5,w-7,1,'#394f58');
      for(let xx=x+5;xx<x+w-6;xx+=9){
        rect(xx-1,yy-1,7,6,'#273c46');rect(xx,yy,5,4,'#5fadb9');
        rect(xx,yy,5,.8,'#d1f5ea');rect(xx+.6,yy+.8,1.2,2.2,'#98cfcc');
      }
    }
    rect(x-2,y-4,w+4,4,'#293c49');rect(x-2,y-4,w+4,1,metal);
    rect(x+1,y+h-4,w-2,3,'#324a53');
  };
  const mast=(x,y)=>{
    rect(x,y,1.5,19,'#d5e5e1');rect(x-5,y+5,11,1.5,metal);
    rect(x-2,y+2,5,1,'#b7d9db');rect(x,y,2,2,'#e8a685');
  };
  const flag=(x,y)=>{
    rect(x,y,1.3,17,shine);rect(x+1.3,y,9,6,'#233f59');
    rect(x+1.3,y,9,1,metal);rect(x+4,y+2,3,2,shine);
  };
  // Broad stone podium and avenues under the stepped citadel.
  rect(4,ground-8,width-8,16,'#293f4860');
  rect(4,ground-10,width-12,15,'#718088');rect(6,ground-10,width-16,2,'#b9c6c7');
  for(let x=9;x<width-9;x+=10)rect(x,ground-5,.5,10,'#52666d');
  facade(9,ground-49,width-18,41);
  const wingW=28+tier*3, wingY=ground-79-tier*5;
  for(const x of [14,width-14-wingW]){
    facade(x,wingY,wingW,ground-wingY-10);
    rect(x+4,wingY-7,wingW-8,3,metal);mast(x+wingW/2,wingY-26);
  }
  const towerW=58+tier*8, tx=cx-towerW/2;
  facade(tx,top+18,towerW,ground-top-29);
  facade(tx+7,top+6,towerW-14,20);
  rect(tx+5,top+3,towerW-10,3,metal);rect(tx+9,top+3,towerW-18,.8,shine);
  rect(tx+12,top+10,towerW-24,9,'#213d50');
  for(let x=tx+14;x<tx+towerW-14;x+=5){rect(x,top+11,3,6,'#8ed0da');rect(x,top+11,3,1,'#e2faf5');}
  rect(cx-10,top-1,20,4,'#314c5b');rect(cx-7,top-4,14,3,metal);
  flag(cx,Math.max(1,top-19));
  // Colonnades, lit entrance and a ceremonial stair.
  for(const side of [-1,1])for(let n=0;n<3;n++){
    const x=cx+side*(towerW/2+6+n*7);
    rect(x,ground-30,3,21,'#bdc9c5');rect(x-1,ground-31,5,2,metal);
    rect(x+2,ground-28,1,17,'#71888a');
  }
  rect(cx-16,ground-33,32,24,'#223843');rect(cx-17,ground-35,34,3,metal);
  for(let n=0;n<4;n++){rect(cx-13+n*7,ground-30,5,20,'#59888e');rect(cx-13+n*7,ground-30,5,1,shine);}
  rect(cx-4,ground-29,8,20,'#142f3b');rect(cx-.5,ground-29,1,20,metal);
  for(let n=0;n<4;n++){rect(cx-19-n*3,ground-9+n*3,38+n*6,3,'#869799');rect(cx-19-n*3,ground-9+n*3,38+n*6,.8,shine);}
  for(const side of [-1,1]){flag(cx+side*(towerW/2+8),ground-27);rect(cx+side*(width/2-12),ground-6,3,3,'#bdebd5');}
  if(tier>=1){
    // Strategy bridge and roof radar distinguish grand allied command.
    rect(tx-12,top+40,towerW+24,8,'#304a5a');rect(tx-12,top+40,towerW+24,1,metal);
    for(let x=tx-10;x<tx+towerW+10;x+=6)rect(x,top+42,4,3,'#93cad2');
    const x=width-30,y=wingY-17;
    rect(x,y,14,2,'#d5e7e5');rect(x+2,y+2,10,2,'#98b2b9');rect(x+5,y+4,4,7,'#607f8a');
  }
  if(tier===2){
    // Platinum crown, auxiliary command towers and three heraldic lights.
    for(const side of [-1,1]){
      const x=cx+side*39-6;facade(x,top+6,12,27);
      rect(x+2,top-1,8,6,metal);rect(x+4,top-4,4,3,shine);
    }
    rect(cx-16,top+29,32,6,'#243d50');
    for(const x of [cx-10,cx,cx+10]){rect(x-2,top+30,4,4,shine);rect(x-1,top+29,2,6,shine);}
    rect(cx-29,ground-40,58,2,metal);
  }
  return true;
}
