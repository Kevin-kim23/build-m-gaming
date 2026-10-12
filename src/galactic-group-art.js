import { drawGalacticCommand } from './galactic-command-art.js';

// A broader command complex: four satellite towers surrounding a five-light central citadel.
export function drawGalacticGroup(c,w,h) {
  const r=(x,y,width,height,color)=>{c.fillStyle=color;c.fillRect(x,y,width,height);};
  r(3,h-24,w-6,19,'#283e5466');r(4,h-24,w-8,16,'#7695a7');r(6,h-24,w-12,2,'#d5e5e8');
  for(const [x,y] of [[8,39],[w-29,39],[6,h-96],[w-27,h-96]]){
    r(x+3,y+4,20,65,'#213f55');r(x,y,20,62,'#6e94a9');r(x+1,y+1,17,2,'#e1eff2');
    for(let row=0;row<6;row++){
      r(x+3,y+7+row*8,13,5,'#244f69');r(x+4,y+7+row*8,11,1,'#9aeeef');r(x+9,y+8+row*8,1,4,'#88b6c7');
    }
    r(x+3,y-6,14,6,'#a7c7d9');r(x+5,y-7,10,2,'#f5e9bc');r(x+9,y-18,2,11,'#bcdae1');
    r(x+6,y-16,8,2,'#86e2ea');
  }
  const inset={fillStyle:'',fillRect(x,y,width,height){r(x+(w-240)/2,y+16,width,height,this.fillStyle);}};
  drawGalacticCommand(inset,240,190);
  r(w/2-30,5,60,12,'#244963');r(w/2-32,3,64,3,'#ddce9b');
  r(w/2-2,17,4,9,'#b9d6de');
  for(let i=0;i<5;i++){const x=w/2-24+i*12;r(x,7,2,8,'#fff0be');r(x-3,10,8,2,'#fff0be');r(x,7,2,2,'#ffffff');}
  for(let i=0;i<4;i++){r(w/2-48-i*4,h-13+i*2,96+i*8,2,'#91b0bd');r(w/2-48-i*4,h-13+i*2,96+i*8,.6,'#e3f1ec');}
  return true;
}
