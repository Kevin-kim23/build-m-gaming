// Original concrete, curtain-wall glass and roof systems. Cached by art.js.
export function drawModernCommand(c,id,w,h) {
  const tier=['division','corps','fieldArmy','armyGroup'].indexOf(id);
  if(tier<0)return false;
  const r=(x,y,width,height,color)=>{c.fillStyle=color;c.fillRect(x,y,width,height);};
  const ground=h-9,cx=w/2;
  const block=(x,y,width,height,glass=false)=>{
    r(x+3,y+4,width,height,'#22364150');r(x,y,width,height,'#405866');
    r(x,y,width-3,height-3,'#b5bfc0');r(x+2,y+2,width-7,2,'#e4e9df');
    r(x+width-4,y+3,3,height-3,'#6c838d');
    for(let yy=y+6;yy<y+height-7;yy+=8){
      r(x+3,yy,width-9,5,glass?'#346779':'#4e8493');
      r(x+3,yy,width-9,.8,'#cae9e6');
      for(let xx=x+5;xx<x+width-9;xx+=6){r(xx,yy,1,5,'#aac7c9');r(xx+1,yy+1,2,2,'#84b8c8');}
      r(x+2,yy+5,width-7,1,glass?'#637e89':'#d1d7d0');
    }
    r(x-1,y-3,width+2,3,'#5e747f');r(x,y-3,width,1,'#dce3d9');
  };
  r(3,ground-3,w-6,9,'#566e7655');r(4,ground-4,w-10,8,'#8e9fa0');
  for(let x=8;x<w-8;x+=8)r(x,ground,1,5,'#c7d1c9');
  // Side wings widen with rank; the center grows into a modern glazed command tower.
  block(7,ground-33,w-16,29);
  if(tier>=1){block(10,ground-50,23,43);block(w-34,ground-50,23,43);}
  const towerW=36+tier*7,top=18;
  block(cx-towerW/2,top,towerW,ground-top-5,true);
  if(tier>=2){
    block(13,ground-64,18,57,true);block(w-32,ground-64,18,57,true);
    r(26,top+24,w-53,5,'#394f61');r(27,top+25,w-55,2,'#a8dce1');
  }
  if(tier===3){
    block(cx-24,9,48,14,true);r(cx-22,6,44,3,'#d7c38d');
    for(const x of [17,w-24]){r(x,21,2,30,'#9eb7bc');r(x-5,24,12,2,'#e1ece2');r(x-2,19,6,3,'#657f90');}
  }
  r(cx-14,ground-21,28,3,'#d0d7ca');r(cx-11,ground-18,22,15,'#274c60');
  for(let x=cx-9;x<cx+10;x+=5){r(x,ground-16,3,11,'#7db6c3');r(x,ground-16,3,1,'#e3f2e4');}
  for(let n=0;n<3;n++){r(cx-17-n*3,ground-3+n*2,34+n*6,2,'#c6d1c9');r(cx-17-n*3,ground-3+n*2,34+n*6,.5,'#f1e8cc');}
  // Solar roof, ventilation, and a distinct increasing command crest.
  r(12,ground-39,18,5,'#2c4d6b');for(let n=0;n<5;n++)r(13+n*3,ground-38,1,3,'#81b5cd');
  r(w-29,ground-39,15,5,'#b5c3c1');for(let n=0;n<4;n++)r(w-27+n*3,ground-38,1,3,'#4c697a');
  r(cx-7,top+4,14,4,'#244a62');for(let n=0;n<=tier;n++)r(cx-5+n*3,top+5,2,2,'#f6e4ac');
  r(cx+8,tier===3?0:3,1,12,'#d8ddcd');r(cx+9,tier===3?1:4,9,5,'#4a7998');r(cx+11,tier===3?2:5,4,1,'#e6d498');
  for(const x of [7,w-12]){r(x,ground-10,4,5,'#3f6d5b');r(x+1,ground-11,2,4,'#7a9f75');}
  return true;
}
